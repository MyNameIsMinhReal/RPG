import { describe, it, expect } from 'vitest';
import '../src/database/index';
import { createPlayer, getPlayer, grantExp } from '../src/systems/player';

const GUILD = 'grant-exp-test-guild';

describe('grantExp', () => {
  it('adds exp without leveling when below threshold', () => {
    const user = 'grant-exp-no-level';
    createPlayer(user, GUILD, 'TestHero');
    const result = grantExp(user, GUILD, 40);
    expect(result.leveledUp).toBe(false);
    expect(result.newLevel).toBe(1);
    const player = getPlayer(user, GUILD)!;
    expect(player.exp).toBe(40);
  });

  it('levels up and carries overflow exp', () => {
    const user = 'grant-exp-level-up';
    createPlayer(user, GUILD, 'TestHero');
    const before = getPlayer(user, GUILD)!;
    const overflow = 25;
    const result = grantExp(user, GUILD, before.exp_next + overflow);
    expect(result.leveledUp).toBe(true);
    expect(result.newLevel).toBe(2);
    expect(result.statPointsGain).toBe(3);
    const player = getPlayer(user, GUILD)!;
    expect(player.level).toBe(2);
    expect(player.exp).toBe(overflow);
  });

  it('reports stat gains on level up', () => {
    const user = 'grant-exp-stat-gain';
    createPlayer(user, GUILD, 'TestHero');
    const before = getPlayer(user, GUILD)!;
    const result = grantExp(user, GUILD, before.exp_next);
    expect(result.leveledUp).toBe(true);
    expect(result.hpGain).toBeGreaterThanOrEqual(0);
    expect(result.atkGain).toBeGreaterThanOrEqual(0);
  });
});
