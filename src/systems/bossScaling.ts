export interface BossLevelScalingResult {
  recommendedLevel: number;
  avgLevel: number;
  levelDelta: number;
  hpMult: number;
  atkMult: number;
  defMult: number;
  defBonus: number;
  specialBonus: number;
  rewardMult: number;
  desc: string | null;
}

const BOSS_RECOMMENDED_LEVELS: Record<string, number> = {
  ancient_oak: 6,
};

function avgLevel(levels: number[]): number {
  const clean = levels.map(n => Number(n)).filter(n => Number.isFinite(n) && n > 0);
  if (clean.length === 0) return 1;
  const avg = clean.reduce((a, b) => a + b, 0) / clean.length;
  const max = Math.max(...clean);
  // Weighted toward the strongest member (anti power-leveling): a single high
  // level carry can't drag scaling down to a low-level alt's level. Solo and
  // equal-level parties are unchanged (avg === max).
  return Math.max(1, Math.round(avg * 0.25 + max * 0.75));
}

export function getBossRecommendedLevel(enemy: any): number {
  const mapped = BOSS_RECOMMENDED_LEVELS[String(enemy?.id ?? '')];
  if (Number.isFinite(mapped) && mapped > 0) return mapped;
  const fromEnemy = Number(enemy?.recommendedLevel ?? enemy?.recommended_level ?? enemy?.level);
  return Number.isFinite(fromEnemy) && fromEnemy > 0 ? Math.round(fromEnemy) : 1;
}

export function getBossLevelScaling(enemy: any, participantLevels: number[]): BossLevelScalingResult {
  const recommendedLevel = getBossRecommendedLevel(enemy);
  const average = avgLevel(participantLevels);
  const levelDelta = average - recommendedLevel;
  // Per-boss scaling profile. Define `scaling` on an enemy in data/enemies.ts to
  // override any of these; otherwise fall back to the tuned Ancient Oak / default
  // profiles so behavior is unchanged and no hardcoded id checks are needed for
  // future bosses.
  const isAncientOak = String(enemy?.id ?? '') === 'ancient_oak';
  const defaultProfile = { hpStep: 0.04, atkStep: 0.03, defStep: 0.030, hpCap: 0.70, atkCap: 0.45, defCap: 0.55, defBonusCap: 24, defBonusStep: 1.10 };
  const oakProfile     = { hpStep: 0.05, atkStep: 0.035, defStep: 0.035, hpCap: 0.85, atkCap: 0.55, defCap: 0.65, defBonusCap: 28, defBonusStep: 1.35 };
  const prof = { ...defaultProfile, ...(isAncientOak ? oakProfile : {}), ...((enemy?.scaling as Partial<typeof defaultProfile>) ?? {}) };

  let hpMult = 1;
  let atkMult = 1;
  let defMult = 1;
  let defBonus = 0;
  let specialBonus = 0;
  let rewardMult = 1;

  if (levelDelta > 0) {
    hpMult = 1 + Math.min(prof.hpCap, levelDelta * prof.hpStep);
    atkMult = 1 + Math.min(prof.atkCap, levelDelta * prof.atkStep);
    // DEF uses both multiplier and flat bonus.
    // Multiplier alone is too weak for early bosses with low base DEF.
    defMult = 1 + Math.min(prof.defCap, levelDelta * prof.defStep);
    defBonus = Math.min(prof.defBonusCap, Math.floor(levelDelta * prof.defBonusStep));
    specialBonus = Math.min(14, Math.floor(levelDelta * 1.5));
    rewardMult = 1 + Math.min(0.35, levelDelta * 0.025);
  } else if (levelDelta < 0) {
    // Underlevel parties get only a tiny mercy. Bosses should still feel dangerous.
    hpMult = Math.max(0.92, 1 + levelDelta * 0.015);
    atkMult = Math.max(0.92, 1 + levelDelta * 0.012);
    defMult = Math.max(0.96, 1 + levelDelta * 0.006);
    defBonus = 0;
  }

  const desc = levelDelta === 0
    ? null
    : levelDelta > 0
      ? `📈 Boss scale: Lv TB ${average} vs đề xuất ${recommendedLevel} → HP x${hpMult.toFixed(2)}, ATK x${atkMult.toFixed(2)}, DEF x${defMult.toFixed(2)}${defBonus > 0 ? ` +${defBonus}` : ''}`
      : `📉 Boss mercy nhẹ: Lv TB ${average} dưới đề xuất ${recommendedLevel} → HP x${hpMult.toFixed(2)}, ATK x${atkMult.toFixed(2)}, DEF x${defMult.toFixed(2)}`;

  return { recommendedLevel, avgLevel: average, levelDelta, hpMult, atkMult, defMult, defBonus, specialBonus, rewardMult, desc };
}

export function applyBossLevelScaling<T extends any>(enemy: T, participantLevels: number[]): T {
  if (!(enemy as any)?.boss) return { ...(enemy as any) };
  const s = getBossLevelScaling(enemy, participantLevels);
  return {
    ...(enemy as any),
    hp: Math.max(1, Math.round((enemy as any).hp * s.hpMult)),
    atk: Math.max(1, Math.round((enemy as any).atk * s.atkMult)),
    def: Math.max(0, Math.round(((enemy as any).def ?? 0) * s.defMult + s.defBonus)),
    expReward: Math.max(1, Math.round(((enemy as any).expReward ?? 0) * s.rewardMult)),
    goldMin: Math.max(0, Math.round(((enemy as any).goldMin ?? 0) * s.rewardMult)),
    goldMax: Math.max(0, Math.round(((enemy as any).goldMax ?? 0) * s.rewardMult)),
    recommendedLevel: s.recommendedLevel,
    _bossLevelScaling: s,
  };
}
