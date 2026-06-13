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


// ── Ritual boss scaling ────────────────────────────────────────────────────
// HP của Echo Demon khi vào trận qua nghi lễ: phá càng nhiều ấn → boss càng yếu
// (3/3 = chuẩn). Giữ ấn đúng thứ tự (puzzle) làm boss yếu thêm; sai thì mạnh hơn.
export const RITUAL_SEAL_HP_MULT: Record<number, number> = { 0: 1.7, 1: 1.5, 2: 1.25, 3: 1.0 };

export function getRitualHpMultiplier(sealsBroken: number, puzzleCorrect: boolean): number {
  const sealMult = RITUAL_SEAL_HP_MULT[Math.min(3, Math.max(0, sealsBroken))] ?? 1.5;
  const puzzleMult = puzzleCorrect ? 0.85 : 1.1;
  return sealMult * puzzleMult;
}

export function computeRitualBossHp(baseHp: number, sealsBroken: number, puzzleCorrect: boolean): number {
  return Math.max(1, Math.floor(Math.max(1, baseHp) * getRitualHpMultiplier(sealsBroken, puzzleCorrect)));
}


// ── Role combat setup ──────────────────────────────────────────────────────
// Ánh xạ vai trò nghi lễ sang effect combat CÓ SẴN (không cần sửa engine).
// `effects` được seed vào active_effects lúc mở trận; `cleanse` là lượng Ô Nhiễm
// được thanh tẩy ngay trước trận (Người Thắp Nến).
export interface EchoRoleCombatSetup {
  effects: { name: string; duration: number; value?: number }[];
  cleanse: number;
}

export function getEchoRoleCombatSetup(role: EchoRoleId): EchoRoleCombatSetup {
  switch (role) {
    case 'seal_keeper':    // 🛡️ Giữ Ấn — giảm sát thương đòn thường của boss.
      return { effects: [{ name: 'stone_skin', duration: 999, value: 18 }], cleanse: 0 };
    case 'candle_lighter': // 🕯️ Thắp Nến — thanh tẩy bớt Ô Nhiễm trước trận.
      return { effects: [], cleanse: 25 };
    case 'mirror_warden':  // 🪞 Giữ Gương — chặn debuff kế tiếp + né một đòn.
      return { effects: [{ name: 'ward', duration: 1 }, { name: 'dodge', duration: 1 }], cleanse: 0 };
    case 'seal_breaker':   // ⚔️ Phá Ấn — +ATK lên boss nhưng nhận thêm sát thương.
      return { effects: [{ name: 'battle_cry', duration: 999, value: 20 }, { name: 'incoming_damage_up', duration: 999, value: 15 }], cleanse: 0 };
  }
}


// Party: vì party combat dùng model atk/def đơn giản (không có effect system),
// vai trò được áp bằng cách nhân atk/def lúc load member.
export interface EchoRolePartyModifier { atkMult: number; defMult: number; }

export function getEchoRolePartyModifier(role: EchoRoleId): EchoRolePartyModifier {
  switch (role) {
    case 'seal_keeper':    return { atkMult: 1.0,  defMult: 1.4 };  // tank: chịu đòn
    case 'seal_breaker':   return { atkMult: 1.25, defMult: 0.8 };  // glass cannon
    case 'mirror_warden':  return { atkMult: 1.0,  defMult: 1.15 }; // chống chịu nhẹ
    case 'candle_lighter': return { atkMult: 1.1,  defMult: 1.0 };  // support + thanh tẩy
  }
}
