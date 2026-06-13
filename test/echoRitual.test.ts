import { describe, it, expect, beforeEach } from 'vitest';
import db from '../src/database/connection';
import {
  markEchoSealByEnemy, hasEchoSeal, clearEchoRitualProgress,
  getEchoRitualSnapshot, ECHO_SEALS, computeRitualBossHp,
  getEchoRoleCombatSetup, getEchoRolePartyModifier, getRitualHpMultiplier, ECHO_ROLES,
} from '../src/systems/echoDemonRitual';
import { addItem } from '../src/systems/player';

const G = 'g_test';
const U = 'u_test';

beforeEach(() => {
  // world.ts import already created world_state; clear seal flags between tests.
  db.exec("CREATE TABLE IF NOT EXISTS world_state (guild_id TEXT, flag_key TEXT, flag_value TEXT, expires_at INTEGER, created_at INTEGER DEFAULT (unixepoch()), PRIMARY KEY (guild_id, flag_key))");
  db.exec("DELETE FROM world_state");
  db.exec("DELETE FROM inventory WHERE guild_id='g_test'");
});

describe('Echo Demon seals (Phase 1 wiring)', () => {
  it('maps each shrine miniboss to its seal', () => {
    expect(markEchoSealByEnemy(G, U, 'shrine_guardian')).toBe('stone');
    expect(markEchoSealByEnemy(G, U, 'wraith_priest')).toBe('candle');
    expect(markEchoSealByEnemy(G, U, 'mirror_shade')).toBe('mirror');
  });

  it('the seal config points back at those enemies', () => {
    expect(ECHO_SEALS.stone.enemyId).toBe('shrine_guardian');
    expect(ECHO_SEALS.candle.enemyId).toBe('wraith_priest');
    expect(ECHO_SEALS.mirror.enemyId).toBe('mirror_shade');
  });

  it('breaking a seal is recorded and reflected by hasEchoSeal', () => {
    expect(hasEchoSeal(G, U, 'stone')).toBe(false);
    markEchoSealByEnemy(G, U, 'shrine_guardian');
    expect(hasEchoSeal(G, U, 'stone')).toBe(true);
  });

  it('a non-seal enemy breaks nothing (hook is a safe no-op)', () => {
    expect(markEchoSealByEnemy(G, U, 'curse_bat')).toBeNull();
    expect(getEchoRitualSnapshot(G, U).sealsBroken).toBe(0);
  });

  it('canStartRitual becomes true only with 3 key items + salt + >=1 seal + low corruption', () => {
    // start: nothing -> cannot
    expect(getEchoRitualSnapshot(G, U).canStartRitual).toBe(false);
    // give the 3 ritual key items + purifying salt
    for (const it of ['echo_trace', 'soul_candle', 'mirror_sigil', 'purifying_salt']) {
      addItem(U, G, it, 1);
    }
    // still missing a broken seal
    expect(getEchoRitualSnapshot(G, U).canStartRitual).toBe(false);
    // break one seal -> now eligible (corruption defaults to 0 < 70)
    markEchoSealByEnemy(G, U, 'shrine_guardian');
    const snap = getEchoRitualSnapshot(G, U);
    expect(snap.canStartRitual).toBe(true);
    expect(snap.missing).toHaveLength(0);
  });

  it('snapshot counts seals as they break, and clear resets them', () => {
    markEchoSealByEnemy(G, U, 'shrine_guardian');
    markEchoSealByEnemy(G, U, 'mirror_shade');
    expect(getEchoRitualSnapshot(G, U).sealsBroken).toBe(2);
    clearEchoRitualProgress(G, U);
    expect(getEchoRitualSnapshot(G, U).sealsBroken).toBe(0);
  });
});

describe('Echo Demon ritual boss HP scaling (Phase 3)', () => {
  const BASE = 760;
  it('more seals broken => weaker boss (lower HP)', () => {
    const one = computeRitualBossHp(BASE, 1, false);
    const two = computeRitualBossHp(BASE, 2, false);
    const three = computeRitualBossHp(BASE, 3, false);
    expect(one).toBeGreaterThan(two);
    expect(two).toBeGreaterThan(three);
  });

  it('solving the puzzle lowers HP vs failing it (same seals)', () => {
    expect(computeRitualBossHp(BASE, 2, true)).toBeLessThan(computeRitualBossHp(BASE, 2, false));
  });

  it('3 seals + puzzle solved is the easiest fight', () => {
    const best = computeRitualBossHp(BASE, 3, true);
    for (const seals of [0, 1, 2, 3]) {
      for (const ok of [true, false]) {
        if (seals === 3 && ok) continue;
        expect(best).toBeLessThanOrEqual(computeRitualBossHp(BASE, seals, ok));
      }
    }
  });

  it('never returns less than 1', () => {
    expect(computeRitualBossHp(0, 3, true)).toBeGreaterThanOrEqual(1);
  });
});

describe('Echo Demon ritual roles (Phase 4)', () => {
  it('every role maps to a valid combat setup', () => {
    for (const role of Object.keys(ECHO_ROLES) as (keyof typeof ECHO_ROLES)[]) {
      const setup = getEchoRoleCombatSetup(role);
      expect(Array.isArray(setup.effects)).toBe(true);
      expect(setup.cleanse).toBeGreaterThanOrEqual(0);
    }
  });

  it('seal_keeper reduces incoming damage (stone_skin)', () => {
    const s = getEchoRoleCombatSetup('seal_keeper');
    expect(s.effects.some(e => e.name === 'stone_skin')).toBe(true);
  });

  it('seal_breaker trades extra damage taken for more attack', () => {
    const s = getEchoRoleCombatSetup('seal_breaker');
    expect(s.effects.some(e => e.name === 'battle_cry')).toBe(true);
    expect(s.effects.some(e => e.name === 'incoming_damage_up')).toBe(true);
  });

  it('candle_lighter cleanses corruption instead of seeding effects', () => {
    const s = getEchoRoleCombatSetup('candle_lighter');
    expect(s.effects).toHaveLength(0);
    expect(s.cleanse).toBeGreaterThan(0);
  });

  it('mirror_warden seeds a debuff ward', () => {
    const s = getEchoRoleCombatSetup('mirror_warden');
    expect(s.effects.some(e => e.name === 'ward')).toBe(true);
  });
});

describe('Echo Demon ritual party scaling (Phase 4 party)', () => {
  it('seal_keeper tanks (high def), seal_breaker is glassy (high atk, low def)', () => {
    const keeper = getEchoRolePartyModifier('seal_keeper');
    const breaker = getEchoRolePartyModifier('seal_breaker');
    expect(keeper.defMult).toBeGreaterThan(1);
    expect(breaker.atkMult).toBeGreaterThan(1);
    expect(breaker.defMult).toBeLessThan(1);
  });

  it('HP multiplier matches the solo formula direction', () => {
    // more seals => smaller multiplier; puzzle solved => smaller still
    expect(getRitualHpMultiplier(1, false)).toBeGreaterThan(getRitualHpMultiplier(3, false));
    expect(getRitualHpMultiplier(2, true)).toBeLessThan(getRitualHpMultiplier(2, false));
  });

  it('every role has a finite party modifier', () => {
    for (const role of Object.keys(ECHO_ROLES) as (keyof typeof ECHO_ROLES)[]) {
      const m = getEchoRolePartyModifier(role);
      expect(m.atkMult).toBeGreaterThan(0);
      expect(m.defMult).toBeGreaterThan(0);
    }
  });
});
