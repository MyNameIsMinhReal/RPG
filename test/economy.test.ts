import { describe, it, expect } from 'vitest';
import { canExplore, exploreCooldownRemaining } from '../src/systems/economy';
import { expNext } from '../src/utils/format';
import { getPityBonus } from '../src/systems/pity';

const nowSec = () => Math.floor(Date.now() / 1000);

function mkPlayer(over: Record<string, unknown> = {}): any {
  return { last_explore: 0, ...over };
}

describe('explore cooldown economy', () => {
  it('a brand-new player (no last_explore) can explore', () => {
    expect(canExplore(mkPlayer({ last_explore: 0 }))).toBe(true);
  });

  it('cannot explore immediately after exploring', () => {
    expect(canExplore(mkPlayer({ last_explore: nowSec() }))).toBe(false);
  });

  it('can explore again once the 5s cooldown has passed', () => {
    expect(canExplore(mkPlayer({ last_explore: nowSec() - 6 }))).toBe(true);
  });

  it('remaining cooldown counts down and never goes negative', () => {
    expect(exploreCooldownRemaining(mkPlayer({ last_explore: nowSec() }))).toBeGreaterThan(0);
    expect(exploreCooldownRemaining(mkPlayer({ last_explore: nowSec() - 100 }))).toBe(0);
  });
});

describe('EXP curve (leveling economy)', () => {
  it('is strictly increasing with level', () => {
    let prev = -1;
    for (let lvl = 1; lvl <= 60; lvl++) {
      const need = expNext(lvl);
      expect(need).toBeGreaterThan(prev);
      prev = need;
    }
  });

  it('returns whole numbers', () => {
    for (const lvl of [1, 5, 25, 50]) expect(Number.isInteger(expNext(lvl))).toBe(true);
  });
});

describe('pity bonus (gacha economy)', () => {
  it('no bonus below the threshold of 20', () => {
    expect(getPityBonus(0)).toBe(0);
    expect(getPityBonus(20)).toBe(0);
  });

  it('grows by 1 per explore past the threshold', () => {
    expect(getPityBonus(21)).toBe(1);
    expect(getPityBonus(25)).toBe(5);
  });

  it('is capped at 10', () => {
    expect(getPityBonus(30)).toBe(10);
    expect(getPityBonus(9999)).toBe(10);
  });
});
