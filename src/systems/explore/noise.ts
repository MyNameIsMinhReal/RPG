import db from '../../database/index';
import { getPlayer, getItemQty, removeItem } from '../player';

export interface ExploreNoiseState {
  noise: number;
  updated_at?: number;
}

function ensureExploreStateTable(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS player_explore_state (
      user_id TEXT NOT NULL,
      guild_id TEXT NOT NULL,
      noise INTEGER DEFAULT 0,
      updated_at INTEGER DEFAULT (unixepoch()),
      PRIMARY KEY (user_id, guild_id)
    );
  `);
}

export function getExploreNoise(userId: string, guildId: string): number {
  ensureExploreStateTable();
  const row = db.prepare('SELECT noise FROM player_explore_state WHERE user_id=? AND guild_id=?')
    .get(userId, guildId) as { noise: number } | undefined;
  return Math.max(0, Math.min(100, Number(row?.noise ?? 0)));
}

export function setExploreNoise(userId: string, guildId: string, noise: number): number {
  ensureExploreStateTable();
  const next = Math.max(0, Math.min(100, Math.floor(noise)));
  db.prepare(`
    INSERT INTO player_explore_state (user_id, guild_id, noise, updated_at)
    VALUES (?, ?, ?, unixepoch())
    ON CONFLICT(user_id, guild_id) DO UPDATE SET noise=excluded.noise, updated_at=unixepoch()
  `).run(userId, guildId, next);
  return next;
}

export function resetExploreNoise(userId: string, guildId: string): void {
  setExploreNoise(userId, guildId, 0);
}

function stealthMultiplier(userId: string, guildId: string): number {
  const cls = String((getPlayer(userId, guildId) as any)?.class ?? '').toLowerCase();
  if (cls === 'assassin' || cls === 'rogue' || cls === 'shadowblade') return 0.5;
  if (cls === 'ranger' || cls === 'warden') return 0.75;
  return 1;
}

export function addExploreNoise(
  userId: string,
  guildId: string,
  baseDelta: number
): { before: number; after: number; delta: number; triggered: boolean; stealth: boolean } {
  const before = getExploreNoise(userId, guildId);
  const mult = stealthMultiplier(userId, guildId);
  const delta = Math.max(1, Math.floor(baseDelta * mult));
  const after = setExploreNoise(userId, guildId, before + delta);
  return { before, after, delta, triggered: after >= 100, stealth: mult < 1 };
}

export function reduceExploreNoise(userId: string, guildId: string, amount: number): { before: number; after: number } {
  const before = getExploreNoise(userId, guildId);
  const after = setExploreNoise(userId, guildId, before - Math.max(0, amount));
  return { before, after };
}

export function consumeSmokeBomb(userId: string, guildId: string): boolean {
  if (getItemQty(userId, guildId, 'smoke_bomb') <= 0) return false;
  return removeItem(userId, guildId, 'smoke_bomb', 1);
}

export function noiseBar(noise: number, len = 10): string {
  const pct = Math.max(0, Math.min(100, noise));
  const filled = Math.round((pct / 100) * len);
  return `${'🟥'.repeat(filled)}${'⬛'.repeat(Math.max(0, len - filled))} ${pct}%`;
}
