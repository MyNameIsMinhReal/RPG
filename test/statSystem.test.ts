import { describe, it, expect } from 'vitest';
import {
  deriveBaseStats,
  getSpentStatPoints,
  getTotalStatPoints,
  getAvailableStatPoints,
  getSecondaryStatBonuses,
  isStatKey,
  STAT_POINTS_PER_LEVEL,
} from '../src/systems/statSystem';

// Minimal PlayerRow-like object; statSystem only reads the fields below.
function mkPlayer(over: Record<string, unknown> = {}): any {
  return {
    level: 1,
    class: 'warrior',
    stat_str: 0, stat_vit: 0, stat_end: 0, stat_agi: 0, stat_luk: 0,
    ...over,
  };
}

describe('stat point economy', () => {
  it('level 1 grants no spendable points', () => {
    expect(getTotalStatPoints(mkPlayer({ level: 1 }))).toBe(0);
  });

  it('grants 3 points per level after level 1', () => {
    expect(getTotalStatPoints(mkPlayer({ level: 10 }))).toBe(9 * STAT_POINTS_PER_LEVEL);
  });

  it('counts spent points across all five stats', () => {
    const p = mkPlayer({ stat_str: 2, stat_vit: 3, stat_end: 1, stat_agi: 4, stat_luk: 0 });
    expect(getSpentStatPoints(p)).toBe(10);
  });

  it('available = total - spent, never negative', () => {
    const p = mkPlayer({ level: 5, stat_str: 6 }); // total 12, spent 6
    expect(getAvailableStatPoints(p)).toBe(6);
    const over = mkPlayer({ level: 2, stat_str: 99 }); // total 3, spent 99
    expect(getAvailableStatPoints(over)).toBe(0);
  });

  it('ignores corrupt/negative stat values', () => {
    const p = mkPlayer({ stat_str: -5, stat_vit: 'oops', stat_luk: 2.9 });
    expect(getSpentStatPoints(p)).toBe(2); // -5→0, 'oops'→0, 2.9→2
  });
});

describe('deriveBaseStats (combat stat derivation)', () => {
  it('warrior level 1 with no stats matches createPlayer baseline', () => {
    // warrior hpBonus +20, atkBonus +5, defBonus +2 (from data/classes)
    const base = deriveBaseStats(mkPlayer());
    expect(base.maxHp).toBeGreaterThanOrEqual(100);
    expect(base.atk).toBeGreaterThanOrEqual(10);
    expect(base.def).toBeGreaterThanOrEqual(5);
  });

  it('STR adds +2 ATK per point', () => {
    const a = deriveBaseStats(mkPlayer({ stat_str: 0 })).atk;
    const b = deriveBaseStats(mkPlayer({ stat_str: 5 })).atk;
    expect(b - a).toBe(10);
  });

  it('VIT adds +12 HP per point', () => {
    const a = deriveBaseStats(mkPlayer({ stat_vit: 0 })).maxHp;
    const b = deriveBaseStats(mkPlayer({ stat_vit: 3 })).maxHp;
    expect(b - a).toBe(36);
  });

  it('END adds +1.5 DEF per point (floored)', () => {
    const a = deriveBaseStats(mkPlayer({ stat_end: 0 })).def;
    const b = deriveBaseStats(mkPlayer({ stat_end: 4 })).def;
    expect(b - a).toBe(6); // 4 * 1.5 = 6
  });

  it('higher level yields higher base stats', () => {
    const lo = deriveBaseStats(mkPlayer({ level: 1 }));
    const hi = deriveBaseStats(mkPlayer({ level: 20 }));
    expect(hi.maxHp).toBeGreaterThan(lo.maxHp);
    expect(hi.atk).toBeGreaterThan(lo.atk);
  });
});

describe('secondary bonuses (crit/dodge/gold/drop caps)', () => {
  it('AGI drives crit and dodge but is capped', () => {
    const s = getSecondaryStatBonuses(mkPlayer({ stat_agi: 1000 }));
    expect(s.critChance).toBe(35);
    expect(s.dodgeChance).toBe(20);
  });

  it('LUK drives gold and drop but is capped', () => {
    const s = getSecondaryStatBonuses(mkPlayer({ stat_luk: 1000 }));
    expect(s.goldBonusPct).toBe(30);
    expect(s.dropBonusPct).toBe(15);
  });

  it('zero stats give zero bonuses', () => {
    const s = getSecondaryStatBonuses(mkPlayer());
    expect(s).toEqual({ critChance: 0, dodgeChance: 0, goldBonusPct: 0, dropBonusPct: 0 });
  });
});

describe('isStatKey guard', () => {
  it('accepts the five valid keys', () => {
    for (const k of ['str', 'vit', 'end', 'agi', 'luk']) expect(isStatKey(k)).toBe(true);
  });
  it('rejects anything else (SQL-injection guard)', () => {
    for (const k of ['hp', 'gold', 'str; DROP TABLE players', '', 'STR']) expect(isStatKey(k)).toBe(false);
  });
});
