import { describe, it, expect, beforeEach } from 'vitest';
import db from '../src/database/connection';
import { onBossKilled, isBossSlain, getFlag, BOSS_RESPAWN_TTL } from '../src/systems/world';

// Importing ../src/systems/world pulls in ../database/index, which creates the
// schema (incl. world_state) in the in-memory test DB. Clean it before each test.
beforeEach(() => {
  db.exec("CREATE TABLE IF NOT EXISTS world_state (guild_id TEXT, flag_key TEXT, flag_value TEXT, expires_at INTEGER, created_at INTEGER DEFAULT (unixepoch()), PRIMARY KEY (guild_id, flag_key))");
  db.exec("DELETE FROM world_state");
});

function expiryOf(guildId: string, bossId: string): number | null {
  const row = db.prepare("SELECT expires_at FROM world_state WHERE guild_id=? AND flag_key=?")
    .get(guildId, `boss_${bossId}_slain`) as { expires_at: number | null } | undefined;
  return row ? row.expires_at : null;
}

describe('boss respawn cooldown (onBossKilled TTL)', () => {
  it('the default cooldown matches Ancient Oak (48h)', () => {
    expect(BOSS_RESPAWN_TTL).toBe(48 * 3600);
  });

  it('marks the boss slain right after the kill', () => {
    onBossKilled('g1', 'echo_demon', 'Tester', 'shrine');
    expect(isBossSlain('g1', 'echo_demon')).toBe(true);
  });

  it('sets a FINITE expiry (not the old permanent NULL)', () => {
    onBossKilled('g1', 'echo_demon', 'Tester', 'shrine');
    const exp = expiryOf('g1', 'echo_demon');
    const now = Math.floor(Date.now() / 1000);
    expect(exp).not.toBeNull();
    expect(exp!).toBeGreaterThan(now);
    expect(exp!).toBeLessThanOrEqual(now + BOSS_RESPAWN_TTL + 5);
  });

  it('applies to all three generic zone bosses', () => {
    for (const boss of ['echo_demon', 'mine_colossus', 'the_forgotten']) {
      onBossKilled('g1', boss, 'Tester', 'z');
      expect(isBossSlain('g1', boss)).toBe(true);
      expect(expiryOf('g1', boss)).not.toBeNull();
    }
  });

  it('once the cooldown has elapsed, the boss is summonable again', () => {
    // Negative TTL => expiry already in the past => treated as expired.
    onBossKilled('g1', 'mine_colossus', 'Tester', 'mines', -10);
    expect(isBossSlain('g1', 'mine_colossus')).toBe(false);
  });
});

describe('Echo Demon world event (Phase 5)', () => {
  it('killing Echo Demon sets the Tiếng Vọng Im Lặng 24h flags', () => {
    onBossKilled('g_echo', 'echo_demon', 'Tester', 'shrine');
    expect(getFlag('g_echo', 'shop_discount')).toBe('10');
    expect(getFlag('g_echo', 'shrine_corruption_slow')).not.toBeNull();
    expect(getFlag('g_echo', 'shrine_purify_boost')).not.toBeNull();
  });

  it('non-shrine bosses do not set the shrine flags', () => {
    onBossKilled('g_oak2', 'mine_colossus', 'Tester', 'mines');
    expect(getFlag('g_oak2', 'shrine_corruption_slow')).toBeNull();
  });
});
