import { getItemQty } from './player';
import { getFlag, setFlag, deleteFlag } from './world';
import { getCorruptionLevel } from './corruption';

export type EchoSealId = 'stone' | 'candle' | 'mirror';
export type EchoRoleId = 'seal_keeper' | 'candle_lighter' | 'mirror_warden' | 'seal_breaker';

export interface EchoRitualSnapshot {
  hasEchoTrace: boolean;
  hasSoulCandle: boolean;
  hasMirrorSigil: boolean;
  hasPurifyingSalt: boolean;
  corruption: number;
  seals: Record<EchoSealId, boolean>;
  sealsBroken: number;
  canStartRitual: boolean;
  missing: string[];
}

export interface EchoRitualResult {
  sealsBroken: number;
  ritualScore: number;
  corruption: number;
  quality: 'unstable' | 'stable' | 'perfect';
}

export const ECHO_KEY_ITEMS = [
  { id: 'echo_trace', icon: '👁️', name: 'Echo Trace' },
  { id: 'soul_candle', icon: '🕯️', name: 'Soul Candle' },
  { id: 'mirror_sigil', icon: '🪞', name: 'Mirror Sigil' },
] as const;

export const ECHO_SEALS: Record<EchoSealId, { icon: string; name: string; enemyId: string }> = {
  stone: { icon: '🗿', name: 'Ấn Đá', enemyId: 'shrine_guardian' },
  candle: { icon: '🕯️', name: 'Ấn Nến', enemyId: 'wraith_priest' },
  mirror: { icon: '🪞', name: 'Ấn Gương', enemyId: 'mirror_shade' },
};

export const ECHO_ROLES: Record<EchoRoleId, { icon: string; name: string; short: string; desc: string }> = {
  seal_keeper: {
    icon: '🛡️', name: 'Người Giữ Ấn', short: 'Giữ Ấn',
    desc: 'Giảm sức đánh của Echo Demon, đổi lại bạn là người đứng mũi chịu sào của nghi lễ.',
  },
  candle_lighter: {
    icon: '🕯️', name: 'Người Thắp Nến', short: 'Thắp Nến',
    desc: 'Làm dịu Corruption, giảm hiệu ứng MP drain/lời nguyền khi mở trận.',
  },
  mirror_warden: {
    icon: '🪞', name: 'Người Giữ Gương', short: 'Giữ Gương',
    desc: 'Làm yếu ảo ảnh Gương Vỡ, giảm DEF/ảo ảnh của boss.',
  },
  seal_breaker: {
    icon: '⚔️', name: 'Người Phá Ấn', short: 'Phá Ấn',
    desc: 'Ép phong ấn nứt nhanh hơn: boss mất HP đầu trận, nhưng đòn phản kích đau hơn.',
  },
};

function sealKey(userId: string, seal: EchoSealId): string {
  return `echo_seal_${seal}_${userId}`;
}

export function hasEchoSeal(guildId: string, userId: string, seal: EchoSealId): boolean {
  return getFlag(guildId, sealKey(userId, seal)) !== null;
}

export function markEchoSealBroken(guildId: string, userId: string, seal: EchoSealId): void {
  setFlag(guildId, sealKey(userId, seal), '1');
}

export function markEchoSealByEnemy(guildId: string, userId: string, enemyId: string): EchoSealId | null {
  const seal = (Object.entries(ECHO_SEALS) as Array<[EchoSealId, typeof ECHO_SEALS[EchoSealId]]>)
    .find(([, info]) => info.enemyId === enemyId)?.[0] ?? null;
  if (seal) markEchoSealBroken(guildId, userId, seal);
  return seal;
}

export function clearEchoRitualProgress(guildId: string, userId: string): void {
  for (const seal of Object.keys(ECHO_SEALS) as EchoSealId[]) deleteFlag(guildId, sealKey(userId, seal));
}

export function getEchoRitualSnapshot(guildId: string, userId: string): EchoRitualSnapshot {
  const hasEchoTrace = getItemQty(userId, guildId, 'echo_trace') > 0;
  const hasSoulCandle = getItemQty(userId, guildId, 'soul_candle') > 0;
  const hasMirrorSigil = getItemQty(userId, guildId, 'mirror_sigil') > 0;
  const hasPurifyingSalt = getItemQty(userId, guildId, 'purifying_salt') > 0;
  const corruption = getCorruptionLevel(userId, guildId);
  const seals = {
    stone: hasEchoSeal(guildId, userId, 'stone'),
    candle: hasEchoSeal(guildId, userId, 'candle'),
    mirror: hasEchoSeal(guildId, userId, 'mirror'),
  };
  const sealsBroken = Object.values(seals).filter(Boolean).length;
  const missing: string[] = [];
  if (!hasEchoTrace) missing.push('Echo Trace');
  if (!hasSoulCandle) missing.push('Soul Candle');
  if (!hasMirrorSigil) missing.push('Mirror Sigil');
  if (!hasPurifyingSalt) missing.push('Purifying Salt x1');
  if (sealsBroken < 1) missing.push('phá ít nhất 1 phong ấn phụ');
  if (corruption >= 70) missing.push('Corruption phải dưới 70');
  return {
    hasEchoTrace, hasSoulCandle, hasMirrorSigil, hasPurifyingSalt,
    corruption, seals, sealsBroken,
    canStartRitual: missing.length === 0,
    missing,
  };
}

export function echoRoleLabel(role?: EchoRoleId | null): string {
  if (!role) return 'Chưa chọn vai trò';
  const r = ECHO_ROLES[role];
  return r ? `${r.icon} ${r.name}` : 'Chưa chọn vai trò';
}
