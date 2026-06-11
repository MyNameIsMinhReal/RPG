import { getFlag, setFlag, deleteFlag } from './world';
import db from '../database/index';

export type ShrineBlessingId = 'candle_blessing' | 'mirror_blessing' | 'echo_mark' | 'salt_ward';

export interface ShrineBlessingDef {
  id: ShrineBlessingId;
  icon: string;
  name: string;
  description: string;
  defaultCharges: number;
  ttlSeconds: number;
}

export const SHRINE_BLESSINGS: Record<ShrineBlessingId, ShrineBlessingDef> = {
  candle_blessing: {
    id: 'candle_blessing', icon: '🕯️', name: 'Candle Blessing',
    description: 'Trận tiếp theo trong Đền Cổ: lời nguyền/đòn từ spirit yếu hơn nhẹ.',
    defaultCharges: 1, ttlSeconds: 60 * 60 * 6,
  },
  mirror_blessing: {
    id: 'mirror_blessing', icon: '🪞', name: 'Mirror Blessing',
    description: 'Trận tiếp theo trong Đền Cổ: ảo ảnh/gương của địch yếu hơn nhẹ.',
    defaultCharges: 1, ttlSeconds: 60 * 60 * 6,
  },
  echo_mark: {
    id: 'echo_mark', icon: '🌘', name: 'Echo Mark',
    description: 'Dấu tiếng vọng nguy hiểm. Trận tiếp theo trong Đền Cổ khiến địch hung hãn hơn.',
    defaultCharges: 1, ttlSeconds: 60 * 60 * 3,
  },
  salt_ward: {
    id: 'salt_ward', icon: '🧂', name: 'Salt Ward',
    description: 'Giảm Corruption nhận vào trong 3 lần sau.',
    defaultCharges: 3, ttlSeconds: 60 * 60 * 6,
  },
};

function blessingKey(userId: string, blessingId: ShrineBlessingId): string {
  return `shrine_blessing_${userId}_${blessingId}`;
}

function parseCharges(raw: string | null): number {
  if (!raw) return 0;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

export function getShrineBlessingCharges(userId: string, guildId: string, blessingId: ShrineBlessingId): number {
  return parseCharges(getFlag(guildId, blessingKey(userId, blessingId)));
}

export function hasShrineBlessing(userId: string, guildId: string, blessingId: ShrineBlessingId): boolean {
  return getShrineBlessingCharges(userId, guildId, blessingId) > 0;
}

export function grantShrineBlessing(userId: string, guildId: string, blessingId: ShrineBlessingId, charges?: number): string {
  const def = SHRINE_BLESSINGS[blessingId];
  const amount = Math.max(1, charges ?? def.defaultCharges);
  const current = getShrineBlessingCharges(userId, guildId, blessingId);
  const next = Math.min(9, current + amount);
  setFlag(guildId, blessingKey(userId, blessingId), String(next), def.ttlSeconds);
  return `${def.icon} Nhận **${def.name}** (${next} lượt).`;
}

export function consumeShrineBlessing(userId: string, guildId: string, blessingId: ShrineBlessingId, amount = 1): boolean {
  const current = getShrineBlessingCharges(userId, guildId, blessingId);
  if (current <= 0) return false;
  const next = Math.max(0, current - Math.max(1, amount));
  if (next <= 0) deleteFlag(guildId, blessingKey(userId, blessingId));
  else setFlag(guildId, blessingKey(userId, blessingId), String(next), SHRINE_BLESSINGS[blessingId].ttlSeconds);
  return true;
}

export function listActiveShrineBlessings(userId: string, guildId: string): string[] {
  return (Object.keys(SHRINE_BLESSINGS) as ShrineBlessingId[])
    .map(id => ({ id, charges: getShrineBlessingCharges(userId, guildId, id) }))
    .filter(x => x.charges > 0)
    .map(x => `${SHRINE_BLESSINGS[x.id].icon} **${SHRINE_BLESSINGS[x.id].name}** ×${x.charges}`);
}

export function mitigateCorruptionGain(userId: string, guildId: string, amount: number): number {
  if (amount <= 0) return amount;
  const player = db.prepare('SELECT zone_id FROM players WHERE user_id=? AND guild_id=?')
    .get(userId, guildId) as { zone_id?: string } | undefined;
  if (player?.zone_id !== 'shrine') return amount;
  if (!consumeShrineBlessing(userId, guildId, 'salt_ward')) return amount;
  return Math.max(0, amount - Math.max(1, Math.ceil(amount * 0.55)));
}

export function applyShrineCombatBlessingModifiers<T extends any>(enemy: T, userId: string, guildId: string): { enemy: T; lines: string[] } {
  if (!enemy || !Array.isArray((enemy as any).zones) || !(enemy as any).zones.includes('shrine')) return { enemy, lines: [] };
  const next: any = { ...enemy };
  const lines: string[] = [];

  if (consumeShrineBlessing(userId, guildId, 'candle_blessing')) {
    next.atk = Math.max(1, Math.floor(next.atk * 0.94));
    lines.push('🕯️ Candle Blessing: lời nguyền trong đền dịu xuống, ATK địch -6%.');
  }
  if (consumeShrineBlessing(userId, guildId, 'mirror_blessing')) {
    next.def = Math.max(0, Math.floor(next.def * 0.90));
    lines.push('🪞 Mirror Blessing: lớp ảo ảnh của địch nứt ra, DEF địch -10%.');
  }
  if (consumeShrineBlessing(userId, guildId, 'echo_mark')) {
    next.atk = Math.max(1, Math.floor(next.atk * 1.08));
    next.specialAttacks = Array.from(new Set([...(next.specialAttacks ?? []), 'drain_mp']));
    lines.push('🌘 Echo Mark: tiếng vọng bám hồn, địch +8% ATK và có thể hút MP.');
  }

  return { enemy: next as T, lines };
}
