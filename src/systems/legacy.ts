import db from '../database/index';
import { randInt } from '../utils/format';

export interface LegacyRow {
  id: number; guild_id: string; user_id: string; player_name: string;
  zone_id: string; legacy_skill_id: string | null; gold_left: number;
  deaths: number; claimed_by: string | null; created_at: number;
}

// ── Create legacy on death ────────────────────────────────────────────────
export function createLegacy(
  guildId: string, userId: string, playerName: string,
  zoneId: string, goldLeft: number, deaths: number,
  legacySkillId?: string
): void {
  db.prepare(`
    INSERT INTO legacies (guild_id, user_id, player_name, zone_id, legacy_skill_id, gold_left, deaths)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(guildId, userId, playerName, zoneId, legacySkillId ?? null, goldLeft, deaths);
}

// ── Query legacies ────────────────────────────────────────────────────────
export function getLegaciesInZone(guildId: string, zoneId: string, limit = 5): LegacyRow[] {
  return db.prepare(`
    SELECT * FROM legacies
    WHERE guild_id=? AND zone_id=? AND claimed_by IS NULL
    ORDER BY created_at DESC LIMIT ?
  `).all(guildId, zoneId, limit) as unknown as LegacyRow[];
}

export function getLegacy(id: number): LegacyRow | undefined {
  return db.prepare('SELECT * FROM legacies WHERE id=?').get(id) as unknown as LegacyRow | undefined;
}

export function claimLegacy(legacyId: number, claimerUserId: string): void {
  db.prepare('UPDATE legacies SET claimed_by=? WHERE id=?').run(claimerUserId, legacyId);
}

// ── Determine legacy skill (random from loadout) ──────────────────────────
export function pickLegacySkill(
  userId: string, guildId: string
): string | undefined {
  const loadout = db.prepare(
    'SELECT skill_id FROM skill_loadout WHERE user_id=? AND guild_id=?'
  ).all(userId, guildId) as Array<{ skill_id: string }>;

  if (!loadout.length) return undefined;
  return loadout[randInt(0, loadout.length - 1)].skill_id;
}

// ── Get player's own past legacies ────────────────────────────────────────
export function getPlayerLegacies(userId: string, guildId: string): LegacyRow[] {
  return db.prepare(`
    SELECT * FROM legacies WHERE user_id=? AND guild_id=? ORDER BY created_at DESC LIMIT 10
  `).all(userId, guildId) as unknown as LegacyRow[];
}
