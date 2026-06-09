import db from '../database/index';

export type OakPhase = 'summoning' | 'active' | 'dead';

export interface OakEvent {
  guild_id: string;
  phase: OakPhase;
  summoner_id: string;
  spawned_at: number;
  expires_at: number;
  boss_hp: number;
  boss_max_hp: number;
  current_fighter: string | null;
}

export interface OakParticipant {
  guild_id: string;
  user_id: string;
  damage: number;
  joined_at: number;
}

export const OAK_BASE_HP      = 550;
export const OAK_SUMMON_WINDOW = 5 * 60;   // 5 phút
export const OAK_RESPAWN_TTL   = 48 * 3600; // 48 giờ

export function getOakEvent(guildId: string): OakEvent | undefined {
  const now = Math.floor(Date.now() / 1000);
  return db.prepare(`
    SELECT * FROM oak_event
    WHERE guild_id = ? AND phase != 'dead'
      AND (phase = 'active' OR expires_at > ?)
  `).get(guildId, now) as OakEvent | undefined;
}

export function createOakEvent(guildId: string, summonerId: string): void {
  const now = Math.floor(Date.now() / 1000);
  db.prepare(`
    INSERT OR REPLACE INTO oak_event
      (guild_id, phase, summoner_id, spawned_at, expires_at, boss_hp, boss_max_hp, current_fighter)
    VALUES (?, 'summoning', ?, ?, ?, ?, ?, NULL)
  `).run(guildId, summonerId, now, now + OAK_SUMMON_WINDOW, OAK_BASE_HP, OAK_BASE_HP);
  joinOakEvent(guildId, summonerId);
}

export function joinOakEvent(guildId: string, userId: string): boolean {
  const changes = db.prepare(`
    INSERT OR IGNORE INTO oak_participants (guild_id, user_id) VALUES (?, ?)
  `).run(guildId, userId).changes;
  return changes > 0;
}

export function isOakParticipant(guildId: string, userId: string): boolean {
  const row = db.prepare('SELECT 1 FROM oak_participants WHERE guild_id = ? AND user_id = ?')
    .get(guildId, userId);
  return !!row;
}

export function getOakParticipants(guildId: string): OakParticipant[] {
  return db.prepare('SELECT * FROM oak_participants WHERE guild_id = ? ORDER BY damage DESC')
    .all(guildId) as OakParticipant[];
}

export function addOakDamage(guildId: string, userId: string, damage: number): void {
  db.prepare(`
    UPDATE oak_participants SET damage = damage + ? WHERE guild_id = ? AND user_id = ?
  `).run(Math.max(0, damage), guildId, userId);
}

export function updateOakBossHp(guildId: string, hp: number): void {
  db.prepare('UPDATE oak_event SET boss_hp = ? WHERE guild_id = ?')
    .run(Math.max(0, hp), guildId);
}

export function setOakCurrentFighter(guildId: string, userId: string | null): void {
  db.prepare('UPDATE oak_event SET current_fighter = ? WHERE guild_id = ?')
    .run(userId, guildId);
}

export function activateOakEvent(guildId: string): { hp: number; maxHp: number } {
  const count = Math.max(1, getOakParticipants(guildId).length);
  const scaledHp = Math.floor(OAK_BASE_HP * (0.6 + 0.4 * count));
  db.prepare(`
    UPDATE oak_event SET phase = 'active', boss_hp = ?, boss_max_hp = ? WHERE guild_id = ?
  `).run(scaledHp, scaledHp, guildId);
  return { hp: scaledHp, maxHp: scaledHp };
}

export function closeOakEvent(guildId: string): void {
  db.prepare(`UPDATE oak_event SET phase = 'dead', current_fighter = NULL WHERE guild_id = ?`)
    .run(guildId);
}

export function clearOakParticipants(guildId: string): void {
  db.prepare('DELETE FROM oak_participants WHERE guild_id = ?').run(guildId);
}

export function hasOakPrereq(guildId: string, userId: string): boolean {
  const now = Math.floor(Date.now() / 1000);
  const row = db.prepare(`
    SELECT 1 FROM world_state
    WHERE guild_id = ? AND flag_key = ? AND (expires_at IS NULL OR expires_at > ?)
  `).get(guildId, `oak_prep_${userId}`, now);
  return !!row;
}

export function markOakPrereq(guildId: string, userId: string): void {
  db.prepare(`
    INSERT OR REPLACE INTO world_state (guild_id, flag_key, flag_value, expires_at)
    VALUES (?, ?, '1', NULL)
  `).run(guildId, `oak_prep_${userId}`);
}

export function calcScaledHp(participantCount: number): number {
  return Math.floor(OAK_BASE_HP * (0.6 + 0.4 * Math.max(1, participantCount)));
}

// ── Miniboss Hunt ─────────────────────────────────────────────────────────────
export const OAK_HUNT_EXPLORES = 5;

export function startOakHunt(guildId: string, userId: string): void {
  db.prepare(`INSERT OR REPLACE INTO world_state (guild_id, flag_key, flag_value, expires_at) VALUES (?, ?, ?, NULL)`)
    .run(guildId, `oak_hunt_${userId}`, String(OAK_HUNT_EXPLORES));
}

export function isOakHuntActive(guildId: string, userId: string): boolean {
  return !!db.prepare('SELECT 1 FROM world_state WHERE guild_id=? AND flag_key=?')
    .get(guildId, `oak_hunt_${userId}`);
}

export function getOakHuntRemaining(guildId: string, userId: string): number {
  const row = db.prepare('SELECT flag_value FROM world_state WHERE guild_id=? AND flag_key=?')
    .get(guildId, `oak_hunt_${userId}`) as { flag_value: string } | undefined;
  return row ? parseInt(row.flag_value) : 0;
}

// Trả về số lượt còn lại sau khi tick (0 = đã đến lúc encounter)
export function tickOakHunt(guildId: string, userId: string): number {
  const remaining = getOakHuntRemaining(guildId, userId);
  if (remaining <= 0) return -1;
  const next = remaining - 1;
  if (next === 0) {
    db.prepare('DELETE FROM world_state WHERE guild_id=? AND flag_key=?').run(guildId, `oak_hunt_${userId}`);
  } else {
    db.prepare('UPDATE world_state SET flag_value=? WHERE guild_id=? AND flag_key=?')
      .run(String(next), guildId, `oak_hunt_${userId}`);
  }
  return next;
}
