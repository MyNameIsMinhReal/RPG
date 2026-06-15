export interface MonsterLevelScalingResult {
  baseLevel: number;
  avgLevel: number;
  levelDelta: number;
  effectiveLevel: number;
  hpMult: number;
  atkMult: number;
  defMult: number;
  rewardMult: number;
  tier: 'even' | 'tempered' | 'veteran' | 'elite' | 'apex' | 'mercy';
  desc: string | null;
}

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

function getBaseMonsterLevel(enemy: any): number {
  const raw = Number(enemy?.recommendedLevel ?? enemy?.recommended_level ?? enemy?.level ?? 1);
  return Number.isFinite(raw) && raw > 0 ? Math.max(1, Math.round(raw)) : 1;
}

function getMonsterTier(delta: number): MonsterLevelScalingResult['tier'] {
  if (delta < -1) return 'mercy';
  if (delta >= 14) return 'apex';
  if (delta >= 9) return 'elite';
  if (delta >= 5) return 'veteran';
  if (delta >= 2) return 'tempered';
  return 'even';
}

function tierLabel(tier: MonsterLevelScalingResult['tier']): string {
  switch (tier) {
    case 'tempered': return 'Tôi luyện';
    case 'veteran': return 'Lão luyện';
    case 'elite': return 'Tinh anh';
    case 'apex': return 'Đỉnh cấp';
    case 'mercy': return 'Giảm áp lực';
    default: return 'Cân bằng';
  }
}

export function getMonsterLevelScaling(enemy: any, participantLevels: number[]): MonsterLevelScalingResult {
  const baseLevel = getBaseMonsterLevel(enemy);
  const average = avgLevel(participantLevels);
  const levelDelta = average - baseLevel;
  const isMiniboss = !!enemy?.miniboss;

  let hpMult = 1;
  let atkMult = 1;
  let defMult = 1;
  let rewardMult = 1;

  if (levelDelta > 0) {
    // Normal enemies should follow player progression, but with caps so old zones do not become impossible.
    // Minibosses scale harder because they are meant to feel like boss-lite encounters.
    const hpPerLevel = isMiniboss ? 0.055 : 0.040;
    const atkPerLevel = isMiniboss ? 0.040 : 0.030;
    const defPerLevel = isMiniboss ? 0.025 : 0.018;
    const rewardPerLevel = isMiniboss ? 0.025 : 0.018;

    hpMult = 1 + Math.min(isMiniboss ? 1.50 : 1.00, levelDelta * hpPerLevel);
    atkMult = 1 + Math.min(isMiniboss ? 1.00 : 0.75, levelDelta * atkPerLevel);
    defMult = 1 + Math.min(isMiniboss ? 0.60 : 0.45, levelDelta * defPerLevel);
    rewardMult = 1 + Math.min(isMiniboss ? 0.50 : 0.35, levelDelta * rewardPerLevel);
  } else if (levelDelta < -1) {
    // If a player enters a zone underlevel, reduce pressure only slightly.
    // The zone should still feel dangerous, not free.
    hpMult = Math.max(0.90, 1 + levelDelta * 0.018);
    atkMult = Math.max(0.88, 1 + levelDelta * 0.020);
    defMult = Math.max(0.92, 1 + levelDelta * 0.012);
  }

  const tier = getMonsterTier(levelDelta);
  const effectiveLevel = Math.max(baseLevel, average > baseLevel ? average : baseLevel);
  const desc = levelDelta <= 1 && levelDelta >= -1
    ? null
    : levelDelta > 1
      ? `📈 Quái scale theo level: **${tierLabel(tier)}** — Lv TB ${average} vs quái gốc ${baseLevel} → HP x${hpMult.toFixed(2)}, ATK x${atkMult.toFixed(2)}`
      : `📉 Quái giảm áp lực nhẹ: Lv TB ${average} dưới quái gốc ${baseLevel} → HP x${hpMult.toFixed(2)}, ATK x${atkMult.toFixed(2)}`;

  return { baseLevel, avgLevel: average, levelDelta, effectiveLevel, hpMult, atkMult, defMult, rewardMult, tier, desc };
}

export function applyMonsterLevelScaling<T extends any>(enemy: T, participantLevels: number[]): T {
  if (!enemy) return enemy;
  if ((enemy as any).boss || (enemy as any).isShopkeeper) return { ...(enemy as any) };

  const s = getMonsterLevelScaling(enemy, participantLevels);
  return {
    ...(enemy as any),
    level: s.effectiveLevel,
    hp: Math.max(1, Math.round(((enemy as any).hp ?? 1) * s.hpMult)),
    atk: Math.max(1, Math.round(((enemy as any).atk ?? 1) * s.atkMult)),
    def: Math.max(0, Math.round(((enemy as any).def ?? 0) * s.defMult)),
    expReward: Math.max(1, Math.round(((enemy as any).expReward ?? 1) * s.rewardMult)),
    goldMin: Math.max(0, Math.round(((enemy as any).goldMin ?? 0) * s.rewardMult)),
    goldMax: Math.max(0, Math.round(((enemy as any).goldMax ?? 0) * s.rewardMult)),
    _monsterLevelScaling: s,
  };
}
