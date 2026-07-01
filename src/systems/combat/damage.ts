import { randInt } from '../../utils/format';

export interface DamageRollOptions {
  /** Random variance around the reduced base damage. Example: 0.15 = ±15%. */
  variance?: number;
  /** Defensive pierce multiplier. 1 = full DEF, 0.5 = target effectively has half DEF. */
  defPierce?: number;
  /** Final scalar applied after mitigation, before variance. */
  multiplier?: number;
}

/**
 * Core mitigation curve shared by basic attacks and skills.
 * DEF reduces damage by def / (effectiveDef + 50), while damage is always at least 1.
 */
export function calcMitigatedDamage(rawDamage: number, def: number, options: Omit<DamageRollOptions, 'variance'> = {}): number {
  const effectiveDef = Math.max(0, def * (options.defPierce ?? 1));
  const multiplier = options.multiplier ?? 1;
  return Math.max(1, Math.round(rawDamage * 50 / (effectiveDef + 50) * multiplier));
}

/** Percentage mitigation with optional variance. Exported for unit tests and legacy imports. */
export function calcDamage(atk: number, def: number, variance = 0.15): number {
  const base = calcMitigatedDamage(atk, def);
  const v = base * variance;
  return Math.max(1, Math.round(base + randInt(-v, v)));
}

/** Skill damage uses the same mitigation curve, but can pierce DEF and apply skill multipliers. */
export function calcSkillDamage(rawDamage: number, def: number, options: DamageRollOptions = {}): number {
  const base = calcMitigatedDamage(rawDamage, def, {
    defPierce: options.defPierce ?? 0.5,
    multiplier: options.multiplier ?? 1,
  });

  const variance = options.variance ?? 0;
  if (variance <= 0) return base;

  const v = base * variance;
  return Math.max(1, Math.round(base + randInt(-v, v)));
}
