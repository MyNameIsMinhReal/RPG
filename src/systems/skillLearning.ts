import { EmbedBuilder } from 'discord.js';
import db from '../database/index';
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
export const SOUL_DUST_ITEM_ID = 'soul_dust';
export const BROKEN_RUNE_ITEM_ID = 'broken_rune';

export const BLIND_ANCIENT_BOOK_COST = {
  ancientBooks: 1,
  gold: 300,
  soulDust: 3,
  brokenRunes: 1,
} as const;

export function getBlindAncientBookCostLine(): string {
  return `📖 ${BLIND_ANCIENT_BOOK_COST.ancientBooks} Ancient Book · 🪙 ${BLIND_ANCIENT_BOOK_COST.gold} Gold · 💨 ${BLIND_ANCIENT_BOOK_COST.soulDust} Soul Dust · 🔹 ${BLIND_ANCIENT_BOOK_COST.brokenRunes} Broken Rune`;
}

export function getBlindAncientBookMissing(userId: string, guildId: string): string[] {
  const p = getPlayer(userId, guildId) as any;
  const missing: string[] = [];
  if (!p?.alive) missing.push('bạn chưa có nhân vật còn sống');
  const books = getItemQty(userId, guildId, ANCIENT_BOOK_ITEM_ID);
  if (books < BLIND_ANCIENT_BOOK_COST.ancientBooks) missing.push(`thiếu ${BLIND_ANCIENT_BOOK_COST.ancientBooks - books} Ancient Book`);
  const gold = Number(p?.gold ?? 0);
  if (gold < BLIND_ANCIENT_BOOK_COST.gold) missing.push(`thiếu ${BLIND_ANCIENT_BOOK_COST.gold - gold} Gold`);
  const soulDust = getItemQty(userId, guildId, SOUL_DUST_ITEM_ID);
  if (soulDust < BLIND_ANCIENT_BOOK_COST.soulDust) missing.push(`thiếu ${BLIND_ANCIENT_BOOK_COST.soulDust - soulDust} Soul Dust`);
  const brokenRunes = getItemQty(userId, guildId, BROKEN_RUNE_ITEM_ID);
  if (brokenRunes < BLIND_ANCIENT_BOOK_COST.brokenRunes) missing.push(`thiếu ${BLIND_ANCIENT_BOOK_COST.brokenRunes - brokenRunes} Broken Rune`);
  return missing;
}


function ensureAncientKnowledgeTable(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS player_ancient_knowledge (
      user_id TEXT NOT NULL,
      guild_id TEXT NOT NULL,
      points INTEGER DEFAULT 0,
      updated_at INTEGER DEFAULT (unixepoch()),
      PRIMARY KEY (user_id, guild_id)
    );
  `);
}

export function getAncientKnowledge(userId: string, guildId: string): number {
  ensureAncientKnowledgeTable();
  const row = db.prepare('SELECT points FROM player_ancient_knowledge WHERE user_id=? AND guild_id=?').get(userId, guildId) as { points: number } | undefined;
  return row?.points ?? 0;
}

export function addAncientKnowledge(userId: string, guildId: string, amount = 1): number {
  ensureAncientKnowledgeTable();
  db.prepare(`
    INSERT INTO player_ancient_knowledge (user_id, guild_id, points, updated_at)
    VALUES (?, ?, ?, unixepoch())
    ON CONFLICT(user_id, guild_id)
    DO UPDATE SET points = points + excluded.points, updated_at = unixepoch()
  `).run(userId, guildId, amount);
  return getAncientKnowledge(userId, guildId);
}

export function getBlindAncientBookPool(userId: string, guildId: string): string[] {
  const p = getPlayer(userId, guildId) as any;
  const level = Number(p?.level ?? 1);
  const weighted: string[] = [];
  const addTier = (tier: AncientBookTier, copies: number) => {
    const ids = getUnlearnedSkillsByTier(userId, guildId, tier);
    for (const id of ids) for (let i = 0; i < copies; i++) weighted.push(id);
  };
  addTier('t1', level >= 1 ? 60 : 0);
  addTier('t2', level >= 4 ? 25 : 0);
  addTier('t3', level >= 8 ? 8 : 0);
  return weighted;
}

export function openBlindAncientBook(userId: string, guildId: string): {
  ok: boolean;
  reason?: string;
  skillId?: string;
  skillName?: string;
  skillIcon?: string;
  skillDescription?: string;
  knowledge?: number;
  refundLine?: string;
} {
  const p = getPlayer(userId, guildId) as any;
  if (!p?.alive) return { ok: false, reason: 'Bạn chưa có nhân vật còn sống.' };
  const missing = getBlindAncientBookMissing(userId, guildId);
  if (missing.length) return { ok: false, reason: missing.join('\n') };

  const pool = getBlindAncientBookPool(userId, guildId);
  if (!spendGold(userId, guildId, BLIND_ANCIENT_BOOK_COST.gold)) return { ok: false, reason: 'Gold vừa thay đổi, hãy thử lại.' };
  if (!removeItem(userId, guildId, ANCIENT_BOOK_ITEM_ID, BLIND_ANCIENT_BOOK_COST.ancientBooks)) return { ok: false, reason: 'Ancient Book vừa thay đổi, hãy thử lại.' };
  if (!removeItem(userId, guildId, SOUL_DUST_ITEM_ID, BLIND_ANCIENT_BOOK_COST.soulDust)) return { ok: false, reason: 'Soul Dust vừa thay đổi, hãy thử lại.' };
  if (!removeItem(userId, guildId, BROKEN_RUNE_ITEM_ID, BLIND_ANCIENT_BOOK_COST.brokenRunes)) return { ok: false, reason: 'Broken Rune vừa thay đổi, hãy thử lại.' };

  const knowledge = addAncientKnowledge(userId, guildId, 1);
  if (!pool.length) {
    return {
      ok: false,
      reason: 'Bạn đã học hết kỹ năng có thể khai mở ở cấp hiện tại.',
      knowledge,
      refundLine: `Nghi thức vẫn tiêu hao nguyên liệu. +1 Ancient Knowledge. Ancient Book đã được hấp thụ thành tri thức cổ.`
    };
  }

  const skillId = pool[Math.floor(Math.random() * pool.length)];
  const skill = getSkill(skillId);
  if (!skill) return { ok: false, reason: 'Skill trong cổ thư bị lỗi data.', knowledge };
  addSkillToPool(userId, guildId, skillId);
  return {
    ok: true,
    skillId,
    skillName: skill.name,
    skillIcon: skill.icon,
    skillDescription: skill.description,
    knowledge,
  };
}

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
