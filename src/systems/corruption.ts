import db from '../database/index';
import type { PlayerRow } from '../utils/embeds';
import { randInt } from '../utils/format';
import { mitigateCorruptionGain } from './shrineBlessings';

export const CORRUPTION_MAX = 100;

export function clampCorruption(value: number): number {
  return Math.max(0, Math.min(CORRUPTION_MAX, Math.floor(Number(value) || 0)));
}

export function getCorruptionLevel(userId: string, guildId: string): number {
  const row = db.prepare('SELECT corruption FROM players WHERE user_id=? AND guild_id=?')
    .get(userId, guildId) as { corruption?: number } | undefined;
  return clampCorruption(row?.corruption ?? 0);
}

export function adjustCorruption(userId: string, guildId: string, amount: number): number {
  const current = getCorruptionLevel(userId, guildId);
  const effectiveAmount = amount > 0 ? mitigateCorruptionGain(userId, guildId, amount) : amount;
  const next = clampCorruption(current + effectiveAmount);
  db.prepare('UPDATE players SET corruption=? WHERE user_id=? AND guild_id=?')
    .run(next, userId, guildId);
  return next;
}

export function cleanseCorruption(userId: string, guildId: string, amount: number): { before: number; after: number; reduced: number } {
  const before = getCorruptionLevel(userId, guildId);
  const after = adjustCorruption(userId, guildId, -Math.abs(amount));
  return { before, after, reduced: Math.max(0, before - after) };
}

export function getCorruptionTier(level: number): 0 | 1 | 2 | 3 {
  const value = clampCorruption(level);
  if (value >= 80) return 3;
  if (value >= 50) return 2;
  if (value >= 20) return 1;
  return 0;
}

export function describeCorruption(level: number): string {
  const value = clampCorruption(level);
  const tier = getCorruptionTier(value);
  if (tier === 0) return `🕊️ Thanh tĩnh **${value}/100**`;
  if (tier === 1) return `🌘 Nhiễm nhẹ **${value}/100**`;
  if (tier === 2) return `🌑 Ô nhiễm nặng **${value}/100**`;
  return `👁️ Vọng Âm bám hồn **${value}/100**`;
}

export function getCorruptionAdvice(level: number): string {
  const tier = getCorruptionTier(level);
  if (tier === 0) return 'Đền còn yên. Tiếp tục khám phá khá an toàn.';
  if (tier === 1) return 'Nên mang Holy Water hoặc Purifying Salt để thanh tẩy dần.';
  if (tier === 2) return 'Quái trong đền hung hãn hơn, nhưng vật phẩm hiếm dễ rơi hơn.';
  return 'Rất nguy hiểm: dễ gặp bẫy/ambush. Hãy thanh tẩy trước khi đánh boss.';
}

export function maybeGainShrineCorruption(player: PlayerRow): string | null {
  if (player.zone_id !== 'shrine') return null;
  const current = clampCorruption(player.corruption ?? getCorruptionLevel(player.user_id, player.guild_id));
  const tier = getCorruptionTier(current);
  const chance = [40, 48, 56, 65][tier] ?? 40;
  if (randInt(1, 100) > chance) return null;
  const gain = tier >= 2 ? randInt(2, 4) : randInt(1, 3);
  const next = adjustCorruption(player.user_id, player.guild_id, gain);
  return `🌘 Ô Nhiễm Linh Hồn +${gain} → **${next}/100**`;
}

export function getCorruptionCombatMods(player: PlayerRow): { atkPct: number; hpPct: number; dropPct: number; lines: string[] } {
  if (player.zone_id !== 'shrine') return { atkPct: 0, hpPct: 0, dropPct: 0, lines: [] };
  const corruption = clampCorruption(player.corruption ?? getCorruptionLevel(player.user_id, player.guild_id));
  const tier = getCorruptionTier(corruption);
  if (tier <= 0) return { atkPct: 0, hpPct: 0, dropPct: 0, lines: [] };
  const atkPct = [0, 5, 10, 16][tier];
  const hpPct = [0, 3, 7, 12][tier];
  const dropPct = [0, 4, 9, 15][tier];
  return {
    atkPct,
    hpPct,
    dropPct,
    lines: [`🌘 Ô Nhiễm Linh Hồn ${corruption}/100: địch trong đền +${atkPct}% ATK, +${hpPct}% HP · drop hiếm +${dropPct}%`]
  };
}

export function getCorruptionDropBonus(player: PlayerRow): number {
  return getCorruptionCombatMods(player).dropPct;
}

export function shouldForceCorruptionAmbush(player: PlayerRow): boolean {
  if (player.zone_id !== 'shrine') return false;
  const tier = getCorruptionTier(player.corruption ?? 0);
  if (tier <= 0) return false;
  return randInt(1, 100) <= [0, 4, 8, 13][tier];
}
