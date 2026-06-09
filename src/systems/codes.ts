import db from '../database/index';
import { addItem, grantExp, grantGold, grantSoulShards } from './player';
import { getItem } from '../data/items';
import { getMaterial } from '../data/materials';

export interface CodeRewards {
  gold?: number;
  exp?: number;
  soul_shards?: number;
  items?: Array<{ id: string; qty: number }>;
}

export interface CodeDef {
  code: string;
  rewards: CodeRewards;
  max_uses: number;
  uses: number;
  active: number;
  expires_at: number | null;
  created_at: number;
}

export type RedeemResult =
  | { ok: true;  rewards: CodeRewards; rewardLines: string[] }
  | { ok: false; reason: 'not_found' | 'inactive' | 'expired' | 'used' | 'max_uses' };

export function createCode(
  code: string,
  rewards: CodeRewards,
  maxUses = 0,
  expiresAt: number | null = null
): boolean {
  try {
    db.prepare(`
      INSERT INTO redeem_codes (code, rewards_json, max_uses, expires_at)
      VALUES (?, ?, ?, ?)
    `).run(code.toUpperCase(), JSON.stringify(rewards), maxUses, expiresAt);
    return true;
  } catch {
    return false;
  }
}

export function deleteCode(code: string): boolean {
  const res = db.prepare('DELETE FROM redeem_codes WHERE code = ?').run(code.toUpperCase()) as any;
  return res.changes > 0;
}

export function listCodes(): CodeDef[] {
  const rows = db.prepare('SELECT * FROM redeem_codes ORDER BY created_at DESC').all() as any[];
  return rows.map(r => ({ ...r, rewards: JSON.parse(r.rewards_json) }));
}

export function redeemCode(code: string, userId: string, guildId: string): RedeemResult {
  const row = db.prepare('SELECT * FROM redeem_codes WHERE code = ?').get(code.toUpperCase()) as any;

  if (!row) return { ok: false, reason: 'not_found' };
  if (!row.active) return { ok: false, reason: 'inactive' };
  if (row.expires_at && Date.now() / 1000 > row.expires_at) return { ok: false, reason: 'expired' };
  if (row.max_uses > 0 && row.uses >= row.max_uses) return { ok: false, reason: 'max_uses' };

  const alreadyUsed = db.prepare(
    'SELECT 1 FROM used_codes WHERE code = ? AND user_id = ? AND guild_id = ?'
  ).get(row.code, userId, guildId);
  if (alreadyUsed) return { ok: false, reason: 'used' };

  const rewards: CodeRewards = JSON.parse(row.rewards_json);

  db.prepare('UPDATE redeem_codes SET uses = uses + 1 WHERE code = ?').run(row.code);
  db.prepare(
    'INSERT INTO used_codes (code, user_id, guild_id, used_at) VALUES (?, ?, ?, ?)'
  ).run(row.code, userId, guildId, Math.floor(Date.now() / 1000));

  const rewardLines: string[] = [];

  if (rewards.gold) {
    grantGold(userId, guildId, rewards.gold);
    rewardLines.push(`🪙 **${rewards.gold.toLocaleString()} Gold**`);
  }
  if (rewards.exp) {
    grantExp(userId, guildId, rewards.exp);
    rewardLines.push(`⭐ **${rewards.exp} EXP**`);
  }
  if (rewards.soul_shards) {
    grantSoulShards(userId, guildId, rewards.soul_shards);
    rewardLines.push(`💀 **${rewards.soul_shards} Soul Shard**`);
  }
  if (Array.isArray(rewards.items)) {
    for (const { id, qty } of rewards.items) {
      addItem(userId, guildId, id, qty);
      const meta = getItem(id) ?? getMaterial(id);
      const icon = meta?.icon ?? '🎁';
      const name = meta?.name ?? id;
      rewardLines.push(`${icon} **${name}**${qty > 1 ? ` ×${qty}` : ''}`);
    }
  }

  return { ok: true, rewards, rewardLines };
}
