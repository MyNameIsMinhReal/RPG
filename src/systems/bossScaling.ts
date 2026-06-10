export interface BossLevelScalingResult {
  recommendedLevel: number;
  avgLevel: number;
  levelDelta: number;
  hpMult: number;
  atkMult: number;
  defMult: number;
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
  return Math.max(1, Math.round(clean.reduce((a, b) => a + b, 0) / clean.length));
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
  const isAncientOak = String(enemy?.id ?? '') === 'ancient_oak';

  let hpMult = 1;
  let atkMult = 1;
  let defMult = 1;
  let specialBonus = 0;
  let rewardMult = 1;

  if (levelDelta > 0) {
    const hpPerLevel = isAncientOak ? 0.05 : 0.04;
    const atkPerLevel = isAncientOak ? 0.035 : 0.03;
    hpMult = 1 + Math.min(isAncientOak ? 0.85 : 0.70, levelDelta * hpPerLevel);
    atkMult = 1 + Math.min(isAncientOak ? 0.55 : 0.45, levelDelta * atkPerLevel);
    defMult = 1 + Math.min(0.30, levelDelta * 0.02);
    specialBonus = Math.min(14, Math.floor(levelDelta * 1.5));
    rewardMult = 1 + Math.min(0.35, levelDelta * 0.025);
  } else if (levelDelta < 0) {
    // Underlevel parties get only a tiny mercy. Bosses should still feel dangerous.
    hpMult = Math.max(0.92, 1 + levelDelta * 0.015);
    atkMult = Math.max(0.92, 1 + levelDelta * 0.012);
    defMult = Math.max(0.95, 1 + levelDelta * 0.008);
  }

  const desc = levelDelta === 0
    ? null
    : levelDelta > 0
      ? `📈 Boss scale: Lv TB ${average} vs đề xuất ${recommendedLevel} → HP x${hpMult.toFixed(2)}, ATK x${atkMult.toFixed(2)}`
      : `📉 Boss mercy nhẹ: Lv TB ${average} dưới đề xuất ${recommendedLevel} → HP x${hpMult.toFixed(2)}, ATK x${atkMult.toFixed(2)}`;

  return { recommendedLevel, avgLevel: average, levelDelta, hpMult, atkMult, defMult, specialBonus, rewardMult, desc };
}

export function applyBossLevelScaling<T extends any>(enemy: T, participantLevels: number[]): T {
  if (!(enemy as any)?.boss) return { ...(enemy as any) };
  const s = getBossLevelScaling(enemy, participantLevels);
  return {
    ...(enemy as any),
    hp: Math.max(1, Math.round((enemy as any).hp * s.hpMult)),
    atk: Math.max(1, Math.round((enemy as any).atk * s.atkMult)),
    def: Math.max(0, Math.round((enemy as any).def * s.defMult)),
    expReward: Math.max(1, Math.round(((enemy as any).expReward ?? 0) * s.rewardMult)),
    goldMin: Math.max(0, Math.round(((enemy as any).goldMin ?? 0) * s.rewardMult)),
    goldMax: Math.max(0, Math.round(((enemy as any).goldMax ?? 0) * s.rewardMult)),
    recommendedLevel: s.recommendedLevel,
    _bossLevelScaling: s,
  };
}
