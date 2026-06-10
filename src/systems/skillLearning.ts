import { EmbedBuilder } from 'discord.js';
import { SKILL_TIER_POOLS, getSkill } from '../data/skills';
import {
  addSkillToPool,
  getItemQty,
  getPlayer,
  hasSkillInPool,
  removeItem,
  spendGold,
} from './player';
import { COLORS } from '../utils/embeds';

export type AncientBookTier = 't1' | 't2' | 't3';

export const ANCIENT_BOOK_ITEM_ID = 'ancient_book';
export const CURSE_SHARD_ITEM_ID = 'curse_shard';

export const ANCIENT_BOOK_STUDY_COST: Record<AncientBookTier, {
  label: string;
  gold: number;
  curseShards: number;
  ancientBooks: number;
  minLevel: number;
}> = {
  t1: { label: 'Cơ Bản', gold: 120, curseShards: 1, ancientBooks: 1, minLevel: 1 },
  t2: { label: 'Hiếm', gold: 360, curseShards: 2, ancientBooks: 1, minLevel: 4 },
  t3: { label: 'Cổ Đại', gold: 900, curseShards: 4, ancientBooks: 2, minLevel: 8 },
};

export function getUnlearnedSkillsByTier(userId: string, guildId: string, tier: AncientBookTier): string[] {
  return (SKILL_TIER_POOLS[tier] ?? []).filter(skillId => {
    const skill = getSkill(skillId);
    return !!skill && !hasSkillInPool(userId, guildId, skillId);
  });
}

export function canStudyAncientBook(userId: string, guildId: string, tier: AncientBookTier): { ok: boolean; missing: string[] } {
  const player = getPlayer(userId, guildId) as any;
  const cost = ANCIENT_BOOK_STUDY_COST[tier];
  const missing: string[] = [];
  if (!player?.alive) missing.push('nhân vật không tồn tại hoặc đã chết');
  if ((player?.level ?? 0) < cost.minLevel) missing.push(`cần Lv.${cost.minLevel}`);
  if ((player?.gold ?? 0) < cost.gold) missing.push(`thiếu ${cost.gold - (player?.gold ?? 0)} Gold`);
  const books = getItemQty(userId, guildId, ANCIENT_BOOK_ITEM_ID);
  if (books < cost.ancientBooks) missing.push(`thiếu ${cost.ancientBooks - books} Ancient Book`);
  const shards = getItemQty(userId, guildId, CURSE_SHARD_ITEM_ID);
  if (shards < cost.curseShards) missing.push(`thiếu ${cost.curseShards - shards} Curse Shard`);
  const pool = getUnlearnedSkillsByTier(userId, guildId, tier);
  if (pool.length <= 0) missing.push(`đã học hết kỹ năng tier ${cost.label}`);
  return { ok: missing.length === 0, missing };
}

export function studyAncientBook(userId: string, guildId: string, tier: AncientBookTier): { ok: boolean; reason?: string; skillId?: string; skillName?: string; skillIcon?: string; costLine?: string } {
  const check = canStudyAncientBook(userId, guildId, tier);
  if (!check.ok) return { ok: false, reason: check.missing.join('\n') };

  const cost = ANCIENT_BOOK_STUDY_COST[tier];
  const pool = getUnlearnedSkillsByTier(userId, guildId, tier);
  const skillId = pool[Math.floor(Math.random() * pool.length)];
  const skill = getSkill(skillId);
  if (!skill) return { ok: false, reason: 'skill không tồn tại trong data' };

  if (!spendGold(userId, guildId, cost.gold)) return { ok: false, reason: 'không đủ Gold' };
  removeItem(userId, guildId, ANCIENT_BOOK_ITEM_ID, cost.ancientBooks);
  removeItem(userId, guildId, CURSE_SHARD_ITEM_ID, cost.curseShards);
  addSkillToPool(userId, guildId, skillId);

  return {
    ok: true,
    skillId,
    skillName: skill.name,
    skillIcon: skill.icon,
    costLine: `-${cost.gold} Gold · -${cost.ancientBooks} Ancient Book · -${cost.curseShards} Curse Shard`,
  };
}

export function learnRandomSkillFromEvent(userId: string, guildId: string, tier: AncientBookTier): { ok: boolean; reason?: string; skillId?: string; skillName?: string; skillIcon?: string } {
  const pool = getUnlearnedSkillsByTier(userId, guildId, tier);
  if (!pool.length) return { ok: false, reason: 'Bạn đã học hết kỹ năng phù hợp với cổ thư này.' };
  const skillId = pool[Math.floor(Math.random() * pool.length)];
  const skill = getSkill(skillId);
  if (!skill) return { ok: false, reason: 'Skill trong cổ thư bị lỗi data.' };
  addSkillToPool(userId, guildId, skillId);
  return { ok: true, skillId, skillName: skill.name, skillIcon: skill.icon };
}

export function ancientBookCostLine(tier: AncientBookTier): string {
  const c = ANCIENT_BOOK_STUDY_COST[tier];
  return `Lv.${c.minLevel}+ · ${c.gold} Gold · ${c.ancientBooks} Ancient Book · ${c.curseShards} Curse Shard`;
}

export function buildAncientBookResultEmbed(playerName: string, tier: AncientBookTier, result: ReturnType<typeof studyAncientBook>): EmbedBuilder {
  const label = ANCIENT_BOOK_STUDY_COST[tier].label;
  if (!result.ok) {
    return new EmbedBuilder()
      .setColor(COLORS.warning)
      .setTitle('📖 Không Thể Nghiên Cứu Cổ Thư')
      .setDescription(`**${playerName}** chưa đủ điều kiện học tier **${label}**:\n${result.reason ?? 'Không rõ lý do.'}`);
  }
  return new EmbedBuilder()
    .setColor(COLORS.magic)
    .setTitle('📖 Cổ Thư Khai Mở!')
    .setDescription(
      `**${playerName}** giải mã cổ tự và học được:\n\n` +
      `${result.skillIcon} **${result.skillName}**\n\n` +
      `Chi phí: ${result.costLine}\n` +
      `Kỹ năng đã vào **Skill Pool**, vào **📌 Loadout** để trang bị.`
    );
}
