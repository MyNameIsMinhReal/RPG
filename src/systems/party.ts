import db from '../database/index';

export interface PartyInfo {
  leaderId: string;
  memberIds: string[]; // includes leader
}

// ── Create / disband ──────────────────────────────────────────────────────────

export function createParty(guildId: string, leaderId: string): boolean {
  if (getPartyOf(guildId, leaderId)) return false;
  db.prepare('INSERT INTO parties (guild_id, leader_id) VALUES (?, ?)').run(guildId, leaderId);
  db.prepare('INSERT INTO party_members (guild_id, user_id, leader_id) VALUES (?, ?, ?)').run(guildId, leaderId, leaderId);
  return true;
}

export function disbandParty(guildId: string, leaderId: string): boolean {
  const party = db.prepare('SELECT leader_id FROM parties WHERE guild_id=? AND leader_id=?').get(guildId, leaderId);
  if (!party) return false;
  db.prepare('DELETE FROM party_members WHERE guild_id=? AND leader_id=?').run(guildId, leaderId);
  db.prepare('DELETE FROM parties WHERE guild_id=? AND leader_id=?').run(guildId, leaderId);
  return true;
}

// ── Member management ─────────────────────────────────────────────────────────

export type AddMemberResult = 'ok' | 'already_in_party' | 'party_full' | 'no_party';

export function addMember(guildId: string, leaderId: string, userId: string): AddMemberResult {
  if (!db.prepare('SELECT 1 FROM parties WHERE guild_id=? AND leader_id=?').get(guildId, leaderId)) return 'no_party';
  if (getPartyOf(guildId, userId)) return 'already_in_party';
  const { c } = db.prepare('SELECT COUNT(*) as c FROM party_members WHERE guild_id=? AND leader_id=?').get(guildId, leaderId) as { c: number };
  if (c >= 4) return 'party_full';
  db.prepare('INSERT INTO party_members (guild_id, user_id, leader_id) VALUES (?, ?, ?)').run(guildId, userId, leaderId);
  return 'ok';
}

export function removeMember(guildId: string, userId: string): boolean {
  const result = db.prepare('DELETE FROM party_members WHERE guild_id=? AND user_id=?').run(guildId, userId);
  return (result as any).changes > 0;
}

// ── Queries ───────────────────────────────────────────────────────────────────

export function getPartyOf(guildId: string, userId: string): PartyInfo | null {
  const row = db.prepare('SELECT leader_id FROM party_members WHERE guild_id=? AND user_id=?').get(guildId, userId) as { leader_id: string } | undefined;
  if (!row) return null;
  return {
    leaderId: row.leader_id,
    memberIds: (db.prepare('SELECT user_id FROM party_members WHERE guild_id=? AND leader_id=?').all(guildId, row.leader_id) as { user_id: string }[]).map(r => r.user_id)
  };
}

export function getPartyMembers(guildId: string, leaderId: string): string[] {
  return (db.prepare('SELECT user_id FROM party_members WHERE guild_id=? AND leader_id=?').all(guildId, leaderId) as { user_id: string }[]).map(r => r.user_id);
}

export function isPartyLeader(guildId: string, userId: string): boolean {
  return !!db.prepare('SELECT 1 FROM parties WHERE guild_id=? AND leader_id=?').get(guildId, userId);
}
