import db from '../../database/index';

// Persisted snapshot of an in-progress party combat. Stored once per turn so an
// interrupted fight (bot restart) can be detected and the players recovered
// instead of the battle silently vanishing.
export interface PartyCombatSnapshot {
  message_id: string;
  channel_id: string;
  guild_id: string;
  leader_id: string;
  member_ids: string;            // JSON string[] of all participant user ids
  enemy_json: string;            // serialized PartyCombatEnemy
  members_json: string;          // serialized PartyMember[]
  turn: number;
  log_json: string;              // serialized string[] (recent log lines)
  current_member_id: string | null;
  decided_actions_json: string;  // serialized [userId, action][]
  created_at?: number;
}

export function savePartyCombat(s: PartyCombatSnapshot): void {
  db.prepare(`
    INSERT OR REPLACE INTO active_party_combats
    (message_id, channel_id, guild_id, leader_id, member_ids, enemy_json,
     members_json, turn, log_json, current_member_id, decided_actions_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    s.message_id, s.channel_id, s.guild_id, s.leader_id, s.member_ids,
    s.enemy_json, s.members_json, s.turn, s.log_json,
    s.current_member_id ?? null, s.decided_actions_json
  );
}

export function deletePartyCombat(messageId: string): void {
  db.prepare('DELETE FROM active_party_combats WHERE message_id = ?').run(messageId);
}

export function deletePartyCombatByLeader(leaderId: string, guildId: string): void {
  db.prepare('DELETE FROM active_party_combats WHERE leader_id = ? AND guild_id = ?')
    .run(leaderId, guildId);
}

/** Returns the active party combat a user is part of (leader or member), if any. */
export function getPartyCombatForMember(userId: string, guildId: string): PartyCombatSnapshot | undefined {
  const rows = db.prepare('SELECT * FROM active_party_combats WHERE guild_id = ?')
    .all(guildId) as unknown as PartyCombatSnapshot[];
  return rows.find(r => {
    if (r.leader_id === userId) return true;
    try { return (JSON.parse(r.member_ids) as string[]).includes(userId); } catch { return false; }
  });
}
