import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ComponentType,
} from 'discord.js';
import db from '../database/index';
import { COLORS } from '../utils/embeds';
import { bar } from '../utils/format';
import {
  getPlayer, applyPassiveStats, getInventory, getItemQty, addItem, removeItem,
  grantGold, spendGold, adjustFaction, getFactionReputation, getWantedLevel, updatePlayerHpMp,
} from './player';
import { getItem } from '../data/items';
import { getMaterial } from '../data/materials';
import { EQUIPMENT, getEquipment } from '../data/equipment';
import { ZONES } from '../data/zones';
import { setFlag, getFlag, increaseShopMarkup, logEvent } from './world';
import { showVillageShop, showVillageBlacksmith, showVillageBoard, showVillageHall } from './village';

const HOUR = 3600;
const DAY = 24 * HOUR;

function nowSec(): number { return Math.floor(Date.now() / 1000); }

function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function simpleEmbed(color: number, desc: string) {
  return new EmbedBuilder().setColor(color).setDescription(desc);
}

function backRow(userId: string) {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`vill_back_${userId}`).setLabel('◀ Quay lại').setStyle(ButtonStyle.Secondary)
  );
}

async function safeDefer(i: any): Promise<void> {
  if (i?.deferred || i?.replied) return;
  await i.deferUpdate().catch(() => {});
}

function progressBar(current: number, max: number, len = 12): string {
  const pct = max > 0 ? Math.max(0, Math.min(1, current / max)) : 0;
  const filled = Math.round(len * pct);
  return '🟩'.repeat(filled) + '⬛'.repeat(Math.max(0, len - filled)) + ` ${Math.floor(pct * 100)}%`;
}

function formatDuration(seconds: number): string {
  const s = Math.max(0, seconds);
  if (s >= HOUR) return `${Math.floor(s / HOUR)}h ${Math.floor((s % HOUR) / 60)}m`;
  if (s >= 60) return `${Math.floor(s / 60)}m`;
  return `${s}s`;
}

type VillageCooldownScope = 'user' | 'guild';

const VILLAGE_COOLDOWNS = {
  randomEvent: 30 * 60,
  pickpocket: 45 * 60,
  relief: 2 * HOUR,
  tavernIntel: 2 * HOUR,
  mysteryBox: 15,
  casino: 3 * 60,
  sacrifice: DAY,
  serverDefend: 8 * HOUR,
} as const;

function cleanupVillageCooldowns(): void {
  db.prepare('DELETE FROM village_cooldowns WHERE expires_at <= ?').run(nowSec());
}

function getVillageCooldown(scope: VillageCooldownScope, ownerId: string, guildId: string, key: string): number {
  ensureVillageTables();
  cleanupVillageCooldowns();
  const row = db.prepare(`
    SELECT expires_at FROM village_cooldowns
    WHERE scope=? AND owner_id=? AND guild_id=? AND cd_key=?
  `).get(scope, ownerId, guildId, key) as { expires_at: number } | undefined;
  return row ? Math.max(0, row.expires_at - nowSec()) : 0;
}

function setVillageCooldown(scope: VillageCooldownScope, ownerId: string, guildId: string, key: string, seconds: number): void {
  ensureVillageTables();
  const expiresAt = nowSec() + Math.max(1, seconds);
  db.prepare(`
    INSERT INTO village_cooldowns (scope, owner_id, guild_id, cd_key, expires_at, updated_at)
    VALUES (?, ?, ?, ?, ?, unixepoch())
    ON CONFLICT(scope, owner_id, guild_id, cd_key)
    DO UPDATE SET expires_at=excluded.expires_at, updated_at=unixepoch()
  `).run(scope, ownerId, guildId, key, expiresAt);
}

function userCooldown(userId: string, guildId: string, key: string): number {
  return getVillageCooldown('user', userId, guildId, key);
}

function setUserCooldown(userId: string, guildId: string, key: string, seconds: number): void {
  setVillageCooldown('user', userId, guildId, key, seconds);
}

function guildCooldown(guildId: string, key: string): number {
  return getVillageCooldown('guild', guildId, guildId, key);
}

function setGuildCooldown(guildId: string, key: string, seconds: number): void {
  setVillageCooldown('guild', guildId, guildId, key, seconds);
}

function cooldownLine(label: string, remaining: number): string {
  return remaining > 0 ? `${label}: còn **${formatDuration(remaining)}**` : `${label}: **sẵn sàng**`;
}

function displayThing(id: string): { name: string; icon: string; sellPrice?: number } {
  const def = getItem(id) ?? getMaterial(id) ?? getEquipment(id);
  return { name: def?.name ?? id, icon: def?.icon ?? '❔', sellPrice: (def as any)?.sellPrice };
}

function sellPriceOf(id: string): number {
  return Math.max(0, Math.floor(displayThing(id).sellPrice ?? 0));
}

function ensureVillageTables(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS guild_projects (
      guild_id TEXT NOT NULL,
      project_id TEXT NOT NULL,
      target_item TEXT NOT NULL,
      current_amount INTEGER DEFAULT 0,
      target_amount INTEGER NOT NULL,
      is_completed INTEGER DEFAULT 0,
      completed_at INTEGER,
      PRIMARY KEY (guild_id, project_id)
    );

    CREATE TABLE IF NOT EXISTS village_funds (
      guild_id TEXT NOT NULL,
      fund_id TEXT NOT NULL,
      current_amount INTEGER DEFAULT 0,
      target_amount INTEGER NOT NULL,
      updated_at INTEGER DEFAULT (unixepoch()),
      PRIMARY KEY (guild_id, fund_id)
    );

    CREATE TABLE IF NOT EXISTS player_intel (
      user_id TEXT NOT NULL,
      guild_id TEXT NOT NULL,
      zone_id TEXT NOT NULL,
      target_item TEXT,
      bonus_type TEXT NOT NULL,
      bonus_value INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      created_at INTEGER DEFAULT (unixepoch()),
      PRIMARY KEY (user_id, guild_id)
    );

    CREATE TABLE IF NOT EXISTS shadow_sacrifices (
      user_id TEXT NOT NULL,
      guild_id TEXT NOT NULL,
      sacrifice_key TEXT NOT NULL,
      count INTEGER DEFAULT 0,
      updated_at INTEGER DEFAULT (unixepoch()),
      PRIMARY KEY (user_id, guild_id, sacrifice_key)
    );

    CREATE TABLE IF NOT EXISTS village_raid_participants (
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      power INTEGER DEFAULT 0,
      joined_at INTEGER DEFAULT (unixepoch()),
      PRIMARY KEY (guild_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS village_cooldowns (
      scope TEXT NOT NULL,
      owner_id TEXT NOT NULL,
      guild_id TEXT NOT NULL,
      cd_key TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      updated_at INTEGER DEFAULT (unixepoch()),
      PRIMARY KEY (scope, owner_id, guild_id, cd_key)
    );
  `);
}

ensureVillageTables();

interface ProjectDef {
  id: string;
  name: string;
  icon: string;
  targetItem: string;
  targetAmount: number;
  rewardFlag: string;
  rewardText: string;
}

const PROJECTS: ProjectDef[] = [
  {
    id: 'blacksmith_level_2', name: 'Mở khóa Thợ Rèn Cấp 2', icon: '⚒️',
    targetItem: 'wood', targetAmount: 10_000, rewardFlag: 'blacksmith_level_2',
    rewardText: 'Thợ rèn cấp 2 đã mở. Các bản nâng cấp nâng cao có thể được thêm vào menu rèn.',
  },
  {
    id: 'village_wall_1', name: 'Gia cố Tường Thành', icon: '🧱',
    targetItem: 'stone', targetAmount: 50_000, rewardFlag: 'village_wall_1',
    rewardText: 'Tường thành cấp 1 hoàn thành: quái vật bị giảm 10% ATK trong combat thường.',
  },
  {
    id: 'market_expansion', name: 'Mở Rộng Chợ Ashveil', icon: '🏦',
    targetItem: 'iron_ore', targetAmount: 12_000, rewardFlag: 'market_expansion',
    rewardText: 'Chợ được mở rộng: Thương Hội dễ xuất hiện hàng hiếm hơn trong các patch sau.',
  },
];

function ensureProjects(guildId: string): void {
  ensureVillageTables();
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO guild_projects (guild_id, project_id, target_item, current_amount, target_amount, is_completed)
    VALUES (?, ?, ?, 0, ?, 0)
  `);
  for (const p of PROJECTS) stmt.run(guildId, p.id, p.targetItem, p.targetAmount);
  db.prepare(`INSERT OR IGNORE INTO village_funds (guild_id, fund_id, current_amount, target_amount) VALUES (?, 'prayer', 0, 10000)`).run(guildId);
}

function getProjectRow(guildId: string, projectId: string): any {
  ensureProjects(guildId);
  return db.prepare('SELECT * FROM guild_projects WHERE guild_id=? AND project_id=?').get(guildId, projectId) as any;
}

export function getVillageDefenseReduction(guildId: string): number {
  return getFlag(guildId, 'village_wall_1') ? 10 : 0;
}

function activeRaid(guildId: string): { hp: number; expiresAt: number } | null {
  const raw = getFlag(guildId, 'village_raid');
  if (!raw) return null;
  try {
    const data = JSON.parse(raw);
    if (!data || typeof data.hp !== 'number' || typeof data.expiresAt !== 'number') return null;
    if (data.expiresAt <= nowSec()) return null;
    return { hp: data.hp, expiresAt: data.expiresAt };
  } catch { return null; }
}

function startRaid(guildId: string): void {
  const data = { hp: 100, expiresAt: nowSec() + 15 * 60 };
  setFlag(guildId, 'village_raid', JSON.stringify(data), 15 * 60);
  setGuildCooldown(guildId, 'server_defend_event', VILLAGE_COOLDOWNS.serverDefend);
  db.prepare('DELETE FROM village_raid_participants WHERE guild_id=?').run(guildId);
}

function updateRaid(guildId: string, hp: number, ttl = 15 * 60): void {
  const data = { hp: Math.max(0, hp), expiresAt: nowSec() + ttl };
  setFlag(guildId, 'village_raid', JSON.stringify(data), ttl);
}

export interface ActiveIntel {
  zoneId: string;
  targetItem: string | null;
  bonusType: 'gold' | 'drop' | 'exp' | 'corruption';
  bonusValue: number;
  expiresAt: number;
}

export function getActiveIntel(userId: string, guildId: string): ActiveIntel | null {
  ensureVillageTables();
  const row = db.prepare('SELECT * FROM player_intel WHERE user_id=? AND guild_id=?').get(userId, guildId) as any;
  if (!row) return null;
  if (row.expires_at <= nowSec()) {
    db.prepare('DELETE FROM player_intel WHERE user_id=? AND guild_id=?').run(userId, guildId);
    return null;
  }
  return {
    zoneId: row.zone_id,
    targetItem: row.target_item ?? null,
    bonusType: row.bonus_type,
    bonusValue: Number(row.bonus_value ?? 0),
    expiresAt: row.expires_at,
  } as ActiveIntel;
}

export function getIntelRewardMods(userId: string, guildId: string, zoneId: string): { goldPct: number; expPct: number; dropPct: number; line?: string; targetItem?: string | null } {
  const intel = getActiveIntel(userId, guildId);
  if (!intel || intel.zoneId !== zoneId) return { goldPct: 0, expPct: 0, dropPct: 0 };
  const zone = ZONES[intel.zoneId];
  if (intel.bonusType === 'gold') return { goldPct: intel.bonusValue, expPct: 0, dropPct: 0, line: `🍻 Tin tình báo: Gold +${intel.bonusValue}% tại ${zone?.name ?? intel.zoneId}` };
  if (intel.bonusType === 'exp') return { goldPct: 0, expPct: intel.bonusValue, dropPct: 0, line: `🍻 Tin tình báo: EXP +${intel.bonusValue}% tại ${zone?.name ?? intel.zoneId}` };
  if (intel.bonusType === 'drop') return { goldPct: 0, expPct: 0, dropPct: intel.bonusValue, line: `🍻 Tin tình báo: Drop +${intel.bonusValue}% tại ${zone?.name ?? intel.zoneId}`, targetItem: intel.targetItem };
  return { goldPct: 0, expPct: 0, dropPct: 0, line: `🍻 Tin tình báo đang giúp bạn đọc dấu vết tại ${zone?.name ?? intel.zoneId}` };
}

export function applyIntelExtraDrop(userId: string, guildId: string, zoneId: string, itemId: string): string | null {
  const intel = getActiveIntel(userId, guildId);
  if (!intel || intel.zoneId !== zoneId || intel.bonusType !== 'drop') return null;
  if (intel.targetItem && intel.targetItem !== itemId) return null;
  addItem(userId, guildId, itemId, 1);
  const it = displayThing(itemId);
  return `${it.icon} ${it.name} x1 🍻`;
}

interface IntelOffer {
  zoneId: string;
  targetItem: string | null;
  bonusType: 'gold' | 'drop' | 'exp';
  bonusValue: number;
  rumor: string;
}

const INTEL_OFFERS: IntelOffer[] = [
  { zoneId: 'mines', targetItem: null, bonusType: 'gold', bonusValue: 50, rumor: 'Nghe nói lũ quái ở Hầm Mỏ đang ôm rất nhiều vàng.' },
  { zoneId: 'mines', targetItem: 'iron_ore', bonusType: 'drop', bonusValue: 50, rumor: 'Một đội đào mỏ bỏ chạy, để lại dấu quặng sắt khắp Hầm Mỏ.' },
  { zoneId: 'forest', targetItem: 'wood', bonusType: 'drop', bonusValue: 50, rumor: 'Cây cổ trong rừng vừa rụng gỗ tốt sau một cơn bão lạ.' },
  { zoneId: 'forest', targetItem: null, bonusType: 'exp', bonusValue: 25, rumor: 'Thợ săn nói quái rừng đang hung hăng hơn, nhưng học được nhiều hơn khi sống sót.' },
  { zoneId: 'shrine', targetItem: 'broken_rune', bonusType: 'drop', bonusValue: 40, rumor: 'Trong Đền Cổ, các phù văn nứt đang bong ra khỏi tường đá.' },
  { zoneId: 'wastes', targetItem: 'void_shard', bonusType: 'drop', bonusValue: 30, rumor: 'Hoang Nguyên đang mở vết nứt nhỏ — void shard có thể rơi nhiều hơn.' },
];

function currentIntelOffer(guildId: string): { offer: IntelOffer; remaining: number } {
  const period = Math.floor(nowSec() / (12 * HOUR));
  const idx = hashString(`${guildId}:intel:${period}`) % INTEL_OFFERS.length;
  const periodEnd = (period + 1) * 12 * HOUR;
  return { offer: INTEL_OFFERS[idx], remaining: Math.max(0, periodEnd - nowSec()) };
}

function currentBlackMarket(guildId: string): { active: boolean; itemId: string; price: number; remaining: number; nextIn: number } {
  const periodLen = 6 * HOUR;
  const period = Math.floor(nowSec() / periodLen);
  const periodStart = period * periodLen;
  const roll = hashString(`${guildId}:black:${period}`) % 100;
  const active = roll < 45 && nowSec() - periodStart <= 15 * 60;
  const stock = [
    { itemId: 'legacy_spark', price: 1500 },
    { itemId: 'exam_score_ten', price: 3000 },
    { itemId: 'void_shard', price: 850 },
    { itemId: 'ancient_relic', price: 1200 },
    { itemId: 'demon_horn', price: 1100 },
    { itemId: 'blood_vial', price: 380 },
    { itemId: 'purifying_salt', price: 180 },
  ];
  const pick = stock[hashString(`${guildId}:black:item:${period}`) % stock.length];
  return {
    active,
    itemId: pick.itemId,
    price: pick.price,
    remaining: Math.max(0, periodStart + 15 * 60 - nowSec()),
    nextIn: Math.max(0, (period + 1) * periodLen - nowSec()),
  };
}

export async function showVillageDistrictMenu(interaction: ChatInputCommandInteraction, userId: string, guildId: string): Promise<void> {
  ensureProjects(guildId);
  const p = getPlayer(userId, guildId)!;
  const raid = activeRaid(guildId);
  if (raid) {
    await showVillageRaid(interaction, userId, guildId);
    return;
  }

  const embed = new EmbedBuilder()
    .setColor(COLORS.purple)
    .setTitle('🏛️ Làng Ashveil — 5 Phân Khu')
    .setDescription(
      `**${p.name}** đang đứng giữa quảng trường. Chọn khu muốn đến:\n\n` +
      `⚖️ **Thương Hội** — shop, chợ đồ cũ, hộp gỗ, chợ đen.\n` +
      `⚔️ **Quán Trọ Thợ Săn** — bounty, quầy rượu tình báo.\n` +
      `⛪ **Thánh Đường Bỏ Hoang** — hồi phục, tẩy ô nhiễm, quỹ cầu nguyện.\n` +
      `🌑 **Hẻm Tối** — sòng bạc, hiến tế, giao dịch nguyền.\n` +
      `🪵 **Quảng Trường** — công trình công cộng toàn server.`
    );
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`vill_dist_merchant_${userId}`).setLabel('Thương Hội').setEmoji('⚖️').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`vill_dist_hunter_${userId}`).setLabel('Thợ Săn').setEmoji('⚔️').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`vill_dist_church_${userId}`).setLabel('Thánh Đường').setEmoji('⛪').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`vill_dist_shadow_${userId}`).setLabel('Hẻm Tối').setEmoji('🌑').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`vill_dist_square_${userId}`).setLabel('Quảng Trường').setEmoji('🪵').setStyle(ButtonStyle.Secondary),
  );
  await interaction.editReply({ embeds: [embed], components: [row] });
}

export async function maybeShowVillageEncounter(interaction: ChatInputCommandInteraction, userId: string, guildId: string): Promise<boolean> {
  ensureProjects(guildId);
  if (activeRaid(guildId)) {
    await showVillageRaid(interaction, userId, guildId);
    return true;
  }

  // Người chơi đã gặp event làng gần đây thì chỉ mở menu bình thường.
  if (userCooldown(userId, guildId, 'village_random_event') > 0) return false;

  const eligible: Array<'pickpocket' | 'relief' | 'raid'> = [];
  if (userCooldown(userId, guildId, 'village_pickpocket') <= 0) eligible.push('pickpocket');
  if (userCooldown(userId, guildId, 'village_relief_donation') <= 0) eligible.push('relief');
  if (guildCooldown(guildId, 'server_defend_event') <= 0) eligible.push('raid');
  if (eligible.length === 0) return false;

  if (Math.random() >= 0.15) return false;
  const pick = eligible[Math.floor(Math.random() * eligible.length)];

  setUserCooldown(userId, guildId, 'village_random_event', VILLAGE_COOLDOWNS.randomEvent);

  if (pick === 'pickpocket') {
    setUserCooldown(userId, guildId, 'village_pickpocket', VILLAGE_COOLDOWNS.pickpocket);
    await showPickpocketEncounter(interaction, userId, guildId);
    return true;
  }
  if (pick === 'relief') {
    setUserCooldown(userId, guildId, 'village_relief_donation', VILLAGE_COOLDOWNS.relief);
    await showReliefEncounter(interaction, userId, guildId);
    return true;
  }

  startRaid(guildId);
  await showVillageRaid(interaction, userId, guildId, true);
  return true;
}

async function showPickpocketEncounter(interaction: ChatInputCommandInteraction, userId: string, guildId: string): Promise<void> {
  const p = getPlayer(userId, guildId)!;
  const loss = Math.min(50, Math.max(0, p.gold));
  if (loss > 0) spendGold(userId, guildId, loss);
  const embed = new EmbedBuilder().setColor(COLORS.warning).setTitle('🎭 Sự kiện Làng — Bị Móc Túi')
    .setDescription(`Một đứa trẻ nghèo đâm sầm vào bạn. Túi tiền nhẹ đi **${loss} Gold**.\n\nBạn sẽ làm gì?`);
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`vill_evt_forgive_${userId}`).setLabel('Bỏ qua').setEmoji('🕊️').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`vill_evt_chase_${userId}`).setLabel('Đuổi theo').setEmoji('🏃').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`vill_back_${userId}`).setLabel('Rời đi').setStyle(ButtonStyle.Secondary),
  );
  const msg = await interaction.editReply({ embeds: [embed], components: [row] });
  const btn = await msg.awaitMessageComponent({ componentType: ComponentType.Button, filter: i => i.user.id === userId, time: 30_000 }).catch(() => null);
  if (!btn) return;
  await safeDefer(btn);
  if (btn.customId === `vill_evt_forgive_${userId}`) {
    const rep = adjustFaction(userId, guildId, 'old_church', 3);
    logEvent(guildId, userId, p.name, 'village', 'tha cho đứa trẻ móc túi trong làng.', 'village');
    await interaction.editReply({ embeds: [simpleEmbed(COLORS.success, `🕊️ Bạn bỏ qua.\n⛪ Old Church Rep: **${rep >= 0 ? '+' : ''}${rep}**`)], components: [backRow(userId)] });
  } else if (btn.customId === `vill_evt_chase_${userId}`) {
    grantGold(userId, guildId, loss + 10);
    addItem(userId, guildId, 'bread', 1);
    const rep = adjustFaction(userId, guildId, 'old_church', -4);
    logEvent(guildId, userId, p.name, 'village', 'đuổi theo đứa trẻ móc túi và lấy lại tiền.', 'village');
    await interaction.editReply({ embeds: [simpleEmbed(COLORS.danger, `🏃 Bạn lấy lại tiền và cướp thêm một ổ bánh mì.\n🪙 +${loss + 10} Gold · 🍞 Bread x1\n⛪ Old Church Rep: **${rep >= 0 ? '+' : ''}${rep}**`)], components: [backRow(userId)] });
  }
}

async function showReliefEncounter(interaction: ChatInputCommandInteraction, userId: string, guildId: string): Promise<void> {
  const qty = getItemQty(userId, guildId, 'meat');
  const embed = new EmbedBuilder().setColor(COLORS.info).setTitle('🎭 Sự kiện Làng — Đoàn Cứu Trợ')
    .setDescription(`Thương Hội đang kêu gọi quyên góp **10x Raw Meat** cho vùng tị nạn.\nBạn có: **${qty}x**.`);
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`vill_evt_meat_${userId}`).setLabel('Quyên góp 10 meat').setEmoji('🥩').setStyle(ButtonStyle.Success).setDisabled(qty < 10),
    new ButtonBuilder().setCustomId(`vill_back_${userId}`).setLabel('Bỏ qua').setStyle(ButtonStyle.Secondary),
  );
  const msg = await interaction.editReply({ embeds: [embed], components: [row] });
  const btn = await msg.awaitMessageComponent({ componentType: ComponentType.Button, filter: i => i.user.id === userId, time: 30_000 }).catch(() => null);
  if (!btn) return;
  await safeDefer(btn);
  if (btn.customId === `vill_evt_meat_${userId}`) {
    if (!removeItem(userId, guildId, 'meat', 10)) {
      await interaction.editReply({ embeds: [simpleEmbed(COLORS.warning, '❌ Không đủ meat.')], components: [backRow(userId)] });
      return;
    }
    const mRep = adjustFaction(userId, guildId, 'merchants', 5);
    const vRep = adjustFaction(userId, guildId, 'villagers', 5);
    logEvent(guildId, userId, getPlayer(userId, guildId)?.name ?? 'Unknown', 'village', 'quyên góp thịt cho đoàn cứu trợ.', 'village');
    await interaction.editReply({ embeds: [simpleEmbed(COLORS.success, `🥩 Bạn đã quyên góp **10x Raw Meat**.\n⚖️ Merchant Rep: **${mRep >= 0 ? '+' : ''}${mRep}** · 🏘️ Villagers Rep: **${vRep >= 0 ? '+' : ''}${vRep}**`)], components: [backRow(userId)] });
  }
}

async function showVillageRaid(interaction: ChatInputCommandInteraction, userId: string, guildId: string, justStarted = false): Promise<void> {
  let raid = activeRaid(guildId);
  if (!raid) { startRaid(guildId); raid = activeRaid(guildId)!; }
  const rows = db.prepare('SELECT user_id, power FROM village_raid_participants WHERE guild_id=?').all(guildId) as Array<{ user_id: string; power: number }>;
  const totalPower = rows.reduce((s, r) => s + r.power, 0);
  const embed = new EmbedBuilder().setColor(COLORS.danger).setTitle('🚨 Báo Động Đỏ — Quái Vật Tấn Công Cổng Làng')
    .setDescription(
      `${justStarted ? '**Chuông báo động vang lên!**\n\n' : ''}` +
      `Menu làng đang bị khóa cho đến khi đợt tấn công kết thúc.\n\n` +
      `🏰 Cổng làng: ${bar(raid.hp, 100)} **${raid.hp}/100**\n` +
      `🛡️ Tổng lực phòng thủ: **${totalPower}**\n` +
      `⏳ Còn: **${formatDuration(raid.expiresAt - nowSec())}**\n\n` +
      `Bấm **Tham gia Defend** để góp lực. Nếu phòng thủ thất bại, giá shop tăng **20%** trong 1 ngày.`
    );
  const already = rows.some(r => r.user_id === userId);
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`vill_raid_defend_${userId}`).setLabel(already ? 'Đã tham gia' : 'Tham gia Defend').setEmoji('🛡️').setStyle(ButtonStyle.Danger).setDisabled(already),
    new ButtonBuilder().setCustomId(`vill_back_${userId}`).setLabel('Đứng chờ').setStyle(ButtonStyle.Secondary),
  );
  const msg = await interaction.editReply({ embeds: [embed], components: [row] });
  const btn = await msg.awaitMessageComponent({ componentType: ComponentType.Button, filter: i => i.user.id === userId, time: 30_000 }).catch(() => null);
  if (!btn) return;
  await safeDefer(btn);
  if (btn.customId !== `vill_raid_defend_${userId}`) return;
  const p = applyPassiveStats(getPlayer(userId, guildId)!);
  const power = Math.max(10, p.level * 8 + p.atk + p.def + Math.floor(p.max_hp / 20));
  db.prepare('INSERT OR REPLACE INTO village_raid_participants (guild_id, user_id, power, joined_at) VALUES (?, ?, ?, unixepoch())').run(guildId, userId, power);
  const newRows = db.prepare('SELECT power FROM village_raid_participants WHERE guild_id=?').all(guildId) as Array<{ power: number }>;
  const newPower = newRows.reduce((s, r) => s + r.power, 0);
  const damage = Math.max(5, Math.floor(newPower / 18));
  const nextHp = Math.max(0, raid.hp - damage);
  if (nextHp <= 0 || newPower >= 250) {
    setFlag(guildId, 'village_raid', '', 1);
    db.prepare('DELETE FROM village_raid_participants WHERE guild_id=?').run(guildId);
    grantGold(userId, guildId, 80);
    adjustFaction(userId, guildId, 'villagers', 4);
    logEvent(guildId, userId, p.name, 'village_raid', 'cùng làng đẩy lùi đợt tấn công cổng làng.', 'village');
    await interaction.editReply({ embeds: [simpleEmbed(COLORS.success, `🏆 **Phòng thủ thành công!**\nBạn nhận **80 Gold** và +4 Villagers Rep.`)], components: [backRow(userId)] });
    return;
  }
  updateRaid(guildId, nextHp);
  if (raid.expiresAt - nowSec() <= 0) {
    increaseShopMarkup(guildId, 20, 100);
  }
  await interaction.editReply({ embeds: [simpleEmbed(COLORS.info, `🛡️ Bạn đã tham gia phòng thủ!\nGây áp lực lên bầy quái: **-${damage} HP cổng bị vây**.\nCổng còn: **${nextHp}/100**.`)], components: [backRow(userId)] });
}

export async function showMerchantGuildDistrict(interaction: ChatInputCommandInteraction, userId: string, guildId: string): Promise<void> {
  const p = getPlayer(userId, guildId)!;
  const rep = getFactionReputation(userId, guildId, 'merchants');
  const bm = currentBlackMarket(guildId);
  const boxCd = userCooldown(userId, guildId, 'merchant_mystery_box');
  const embed = new EmbedBuilder().setColor(COLORS.gold).setTitle('⚖️ Khu A — Thương Hội')
    .setDescription(
      `Dòng tiền của Ashveil chảy qua đây.\n\n` +
      `👤 **${p.name}** · 🪙 **${p.gold} Gold** · Merchant Rep: **${rep >= 0 ? '+' : ''}${rep}**\n` +
      `🏪 Cửa hàng cơ bản: bình máu, lương khô, đuốc/vật phẩm tiêu hao.\n` +
      `🧺 Chợ đồ cũ: thanh lý item/material/trang bị thừa.\n` +
      `🎁 Hộp Gỗ Kỳ Bí: 500 Gold, yêu cầu Merchant Rep +20 · ${boxCd > 0 ? `CD **${formatDuration(boxCd)}**` : 'sẵn sàng'}.\n` +
      `🌑 Chợ Đen: ${bm.active ? `đang mở **${formatDuration(bm.remaining)}**` : `chưa thấy NPC lạ, thử lại sau **${formatDuration(bm.nextIn)}**`}`
    );
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`vill_mer_shop_${userId}`).setLabel('Cửa hàng').setEmoji('🏪').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`vill_mer_sell_${userId}`).setLabel('Chợ đồ cũ').setEmoji('🧺').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`vill_mer_box_${userId}`).setLabel('Hộp Gỗ').setEmoji('🎁').setStyle(ButtonStyle.Primary).setDisabled(rep < 20 || boxCd > 0),
    new ButtonBuilder().setCustomId(`vill_mer_black_${userId}`).setLabel('Chợ Đen').setEmoji('🌑').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`vill_back_${userId}`).setLabel('Quay lại').setStyle(ButtonStyle.Secondary),
  );
  const msg = await interaction.editReply({ embeds: [embed], components: [row] });
  const btn = await msg.awaitMessageComponent({ componentType: ComponentType.Button, filter: i => i.user.id === userId, time: 45_000 }).catch(() => null);
  if (!btn) return;
  await safeDefer(btn);
  if (btn.customId === `vill_mer_shop_${userId}`) return showVillageShop(interaction, userId, guildId);
  if (btn.customId === `vill_mer_sell_${userId}`) return showJunkMarket(interaction, userId, guildId);
  if (btn.customId === `vill_mer_box_${userId}`) return openMysteryWoodenBox(interaction, userId, guildId);
  if (btn.customId === `vill_mer_black_${userId}`) return showTimedBlackMarket(interaction, userId, guildId);
  await interaction.editReply({ components: [] }).catch(() => {});
}

async function showJunkMarket(interaction: ChatInputCommandInteraction, userId: string, guildId: string): Promise<void> {
  const inv = getInventory(userId, guildId)
    .map(e => ({ ...e, def: displayThing(e.item_id), price: sellPriceOf(e.item_id) }))
    .filter(e => e.quantity > 0 && e.price > 0)
    .sort((a, b) => (a.price - b.price) || a.item_id.localeCompare(b.item_id));
  if (inv.length === 0) {
    await interaction.editReply({ embeds: [simpleEmbed(COLORS.warning, '🧺 Không có món nào bán được.')], components: [backRow(userId)] });
    return;
  }
  const options = inv.slice(0, 25).map(e => new StringSelectMenuOptionBuilder()
    .setLabel(`${e.def.icon} ${e.def.name} x${e.quantity}`.slice(0, 100))
    .setDescription(`Giá bán: ${e.price} Gold / cái`.slice(0, 100))
    .setValue(e.item_id));
  const embed = new EmbedBuilder().setColor(COLORS.gold).setTitle('🧺 Chợ Đồ Cũ — Thanh lý')
    .setDescription('Chọn món muốn bán. Chợ chỉ mua item/material/trang bị có `sellPrice`.');
  const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(new StringSelectMenuBuilder().setCustomId(`vill_sell_sel_${userId}`).setPlaceholder('Chọn món muốn bán...').addOptions(options));
  const msg = await interaction.editReply({ embeds: [embed], components: [row, backRow(userId)] });
  const sel = await msg.awaitMessageComponent({ filter: i => i.user.id === userId, time: 45_000 }).catch(() => null);
  if (!sel) return;
  await safeDefer(sel);
  if (!sel.isStringSelectMenu()) return;
  const itemId = sel.values[0];
  const entry = inv.find(e => e.item_id === itemId);
  if (!entry) return showJunkMarket(interaction, userId, guildId);
  const sellRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`vill_sell_1_${userId}_${itemId}`).setLabel('Bán x1').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`vill_sell_10_${userId}_${itemId}`).setLabel('Bán x10').setStyle(ButtonStyle.Primary).setDisabled(entry.quantity < 10),
    new ButtonBuilder().setCustomId(`vill_sell_all_${userId}_${itemId}`).setLabel(`Bán tất cả x${entry.quantity}`).setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`vill_back_${userId}`).setLabel('Quay lại').setStyle(ButtonStyle.Secondary),
  );
  const embed2 = new EmbedBuilder().setColor(COLORS.gold).setTitle(`🧺 Bán ${entry.def.icon} ${entry.def.name}`)
    .setDescription(`Bạn có: **${entry.quantity}**\nĐơn giá: **${entry.price} Gold**`);
  const msg2 = await interaction.editReply({ embeds: [embed2], components: [sellRow] });
  const btn = await msg2.awaitMessageComponent({ componentType: ComponentType.Button, filter: i => i.user.id === userId, time: 30_000 }).catch(() => null);
  if (!btn) return;
  await safeDefer(btn);
  if (btn.customId === `vill_back_${userId}`) return showMerchantGuildDistrict(interaction, userId, guildId);
  const qty = btn.customId.includes('_all_') ? entry.quantity : btn.customId.includes('_10_') ? 10 : 1;
  if (!removeItem(userId, guildId, itemId, qty)) {
    await interaction.editReply({ embeds: [simpleEmbed(COLORS.warning, '❌ Số lượng đã thay đổi, không bán được.')], components: [backRow(userId)] });
    return;
  }
  const gold = qty * entry.price;
  grantGold(userId, guildId, gold);
  adjustFaction(userId, guildId, 'merchants', Math.min(3, Math.ceil(gold / 500)));
  await interaction.editReply({ embeds: [simpleEmbed(COLORS.success, `✅ Đã bán **${entry.def.icon} ${entry.def.name} x${qty}** lấy **${gold} Gold**.`)], components: [backRow(userId)] });
}

async function openMysteryWoodenBox(interaction: ChatInputCommandInteraction, userId: string, guildId: string): Promise<void> {
  const cd = userCooldown(userId, guildId, 'merchant_mystery_box');
  if (cd > 0) {
    await interaction.editReply({ embeds: [simpleEmbed(COLORS.warning, `🎁 Hộp Gỗ Kỳ Bí đang hồi lại hàng. Thử lại sau **${formatDuration(cd)}**.`)], components: [backRow(userId)] });
    return;
  }
  const p = getPlayer(userId, guildId)!;
  const rep = getFactionReputation(userId, guildId, 'merchants');
  if (rep < 20) {
    await interaction.editReply({ embeds: [simpleEmbed(COLORS.warning, '🎁 Cần **Merchant Rep +20** để mua Hộp Gỗ Kỳ Bí.')], components: [backRow(userId)] });
    return;
  }
  if (!spendGold(userId, guildId, 500)) {
    await interaction.editReply({ embeds: [simpleEmbed(COLORS.warning, `❌ Không đủ Gold. Cần **500**, bạn có **${p.gold}**.`)], components: [backRow(userId)] });
    return;
  }
  const roll = Math.random() * 100;
  let itemId = 'wood'; let qty = 10; let tier = 'rác';
  if (roll >= 99.5) { itemId = 'exam_score_ten'; qty = 1; tier = 'huyền thoại'; }
  else if (roll >= 98) { itemId = 'legacy_spark'; qty = 1; tier = 'legacy'; }
  else if (roll >= 95) { itemId = 'ancient_relic'; qty = 1; tier = 'cực hiếm'; }
  else if (roll >= 86) { itemId = 'void_shard'; qty = 1; tier = 'epic'; }
  else if (roll >= 70) { itemId = 'mana_crystal'; qty = 2; tier = 'rare'; }
  else if (roll >= 45) { itemId = 'iron_ore'; qty = 5; tier = 'thường'; }
  setUserCooldown(userId, guildId, 'merchant_mystery_box', VILLAGE_COOLDOWNS.mysteryBox);
  addItem(userId, guildId, itemId, qty);
  const it = displayThing(itemId);
  logEvent(guildId, userId, p.name, 'merchant_gacha', `mở Hộp Gỗ Kỳ Bí và nhận ${it.name} x${qty}.`, 'village');
  await interaction.editReply({ embeds: [simpleEmbed(COLORS.gold, `🎁 Bạn mở **Hộp Gỗ Kỳ Bí**...\nKết quả **${tier}**: ${it.icon} **${it.name} x${qty}**\n💸 -500 Gold`)], components: [backRow(userId)] });
}

async function showTimedBlackMarket(interaction: ChatInputCommandInteraction, userId: string, guildId: string): Promise<void> {
  const bm = currentBlackMarket(guildId);
  const def = displayThing(bm.itemId);
  if (!bm.active) {
    await interaction.editReply({ embeds: [simpleEmbed(COLORS.dark, `🌑 Hẻm sau chợ trống rỗng.\nNPC chợ đen có thể xuất hiện ở đầu mỗi chu kỳ 6 giờ và chỉ ở lại 15 phút.\nThử lại sau: **${formatDuration(bm.nextIn)}**.`)], components: [backRow(userId)] });
    return;
  }
  const p = getPlayer(userId, guildId)!;
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`vill_bm_buy_${userId}`).setLabel(`Mua ${bm.price} Gold`).setEmoji('💸').setStyle(ButtonStyle.Danger).setDisabled(p.gold < bm.price),
    new ButtonBuilder().setCustomId(`vill_back_${userId}`).setLabel('Rời đi').setStyle(ButtonStyle.Secondary),
  );
  const embed = new EmbedBuilder().setColor(COLORS.dark).setTitle('🌑 Thương nhân Chợ Đen')
    .setDescription(`Một NPC bịt mặt mở áo choàng.\n\nHàng hiếm: ${def.icon} **${def.name}**\nGiá: **${bm.price} Gold**\nCòn lại: **${formatDuration(bm.remaining)}**\nBạn có: **${p.gold} Gold**`);
  const msg = await interaction.editReply({ embeds: [embed], components: [row] });
  const btn = await msg.awaitMessageComponent({ componentType: ComponentType.Button, filter: i => i.user.id === userId, time: 30_000 }).catch(() => null);
  if (!btn) return;
  await safeDefer(btn);
  if (btn.customId !== `vill_bm_buy_${userId}`) return;
  if (!spendGold(userId, guildId, bm.price)) {
    await interaction.editReply({ embeds: [simpleEmbed(COLORS.warning, '❌ Không đủ Gold.')], components: [backRow(userId)] });
    return;
  }
  addItem(userId, guildId, bm.itemId, 1);
  adjustFaction(userId, guildId, 'shadow_court', 2);
  await interaction.editReply({ embeds: [simpleEmbed(COLORS.success, `🌑 Giao dịch xong. Bạn nhận ${def.icon} **${def.name} x1**.`)], components: [backRow(userId)] });
}

export async function showHuntersGuildDistrict(interaction: ChatInputCommandInteraction, userId: string, guildId: string): Promise<void> {
  const p = getPlayer(userId, guildId)!;
  const intel = getActiveIntel(userId, guildId);
  const intelCd = userCooldown(userId, guildId, 'tavern_intel');
  const embed = new EmbedBuilder().setColor(0x8B4513).setTitle('⚔️ Khu B — Quán Trọ Thợ Săn')
    .setDescription(
      `Bàn gỗ đầy vết dao. Bảng truy nã treo cạnh quầy rượu.\n\n` +
      `👤 **${p.name}** · 🪙 **${p.gold} Gold**\n` +
      `📋 **Bounty Board:** 3 nhiệm vụ mỗi ngày, thưởng EXP/Gold/vật phẩm.\n` +
      `🍻 **Quầy rượu:** trả 50 Gold để mua tin đồn hotzone trong 2 giờ · ${intelCd > 0 ? `CD **${formatDuration(intelCd)}**` : 'sẵn sàng'}.\n` +
      (intel ? `\nTin hiện tại: **${ZONES[intel.zoneId]?.name ?? intel.zoneId}** · hết hạn sau **${formatDuration(intel.expiresAt - nowSec())}**` : '')
    );
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`vill_hunt_board_${userId}`).setLabel('Bảng Truy Nã').setEmoji('📋').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`vill_hunt_intel_${userId}`).setLabel('Mua Tin Đồn').setEmoji('🍻').setStyle(ButtonStyle.Success).setDisabled(intelCd > 0),
    new ButtonBuilder().setCustomId(`vill_hunt_hall_${userId}`).setLabel('Hội Quán').setEmoji('🏛️').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`vill_back_${userId}`).setLabel('Quay lại').setStyle(ButtonStyle.Secondary),
  );
  const msg = await interaction.editReply({ embeds: [embed], components: [row] });
  const btn = await msg.awaitMessageComponent({ componentType: ComponentType.Button, filter: i => i.user.id === userId, time: 45_000 }).catch(() => null);
  if (!btn) return;
  await safeDefer(btn);
  if (btn.customId === `vill_hunt_board_${userId}`) return showVillageBoard(interaction, userId, guildId);
  if (btn.customId === `vill_hunt_intel_${userId}`) return showTavernIntel(interaction, userId, guildId);
  if (btn.customId === `vill_hunt_hall_${userId}`) return showVillageHall(interaction, userId, guildId);
  await interaction.editReply({ components: [] }).catch(() => {});
}

async function showTavernIntel(interaction: ChatInputCommandInteraction, userId: string, guildId: string): Promise<void> {
  const cd = userCooldown(userId, guildId, 'tavern_intel');
  if (cd > 0) {
    await interaction.editReply({ embeds: [simpleEmbed(COLORS.warning, `🍻 Bạn vừa mua tin gần đây. Quay lại sau **${formatDuration(cd)}**.`)], components: [backRow(userId)] });
    return;
  }
  const { offer, remaining } = currentIntelOffer(guildId);
  const p = getPlayer(userId, guildId)!;
  const active = getActiveIntel(userId, guildId);
  const item = offer.targetItem ? displayThing(offer.targetItem) : null;
  const zone = ZONES[offer.zoneId];
  const embed = new EmbedBuilder().setColor(0x8B4513).setTitle('🍻 Quầy Rượu — Tình Báo')
    .setDescription(
      `Bạn mua cho gã thợ săn một ly bia. Hắn nghiêng người thì thầm:\n\n` +
      `> “${offer.rumor}”\n\n` +
      `Hiệu ứng: **${zone?.name ?? offer.zoneId}** · ${offer.bonusType === 'gold' ? `Gold +${offer.bonusValue}%` : offer.bonusType === 'exp' ? `EXP +${offer.bonusValue}%` : `${item?.icon ?? ''} ${item?.name ?? 'drop'} dễ rơi hơn + thêm x1 khi rơi`}\n` +
      `Thời hạn sau khi mua: **2 giờ** · Tin đổi sau **${formatDuration(remaining)}**\n` +
      `Giá: **50 Gold** · Bạn có: **${p.gold} Gold**` +
      (active ? `\n\n⚠️ Bạn đang có một tin cũ. Mua tin mới sẽ ghi đè.` : '')
    );
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`vill_intel_buy_${userId}`).setLabel('Mua tin 50 Gold').setEmoji('🍻').setStyle(ButtonStyle.Success).setDisabled(p.gold < 50),
    new ButtonBuilder().setCustomId(`vill_back_${userId}`).setLabel('Quay lại').setStyle(ButtonStyle.Secondary),
  );
  const msg = await interaction.editReply({ embeds: [embed], components: [row] });
  const btn = await msg.awaitMessageComponent({ componentType: ComponentType.Button, filter: i => i.user.id === userId, time: 30_000 }).catch(() => null);
  if (!btn) return;
  await safeDefer(btn);
  if (btn.customId !== `vill_intel_buy_${userId}`) return;
  if (!spendGold(userId, guildId, 50)) {
    await interaction.editReply({ embeds: [simpleEmbed(COLORS.warning, '❌ Không đủ Gold.')], components: [backRow(userId)] });
    return;
  }
  db.prepare(`
    INSERT OR REPLACE INTO player_intel (user_id, guild_id, zone_id, target_item, bonus_type, bonus_value, expires_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, unixepoch())
  `).run(userId, guildId, offer.zoneId, offer.targetItem, offer.bonusType, offer.bonusValue, nowSec() + 2 * HOUR);
  setUserCooldown(userId, guildId, 'tavern_intel', VILLAGE_COOLDOWNS.tavernIntel);
  adjustFaction(userId, guildId, 'hunters', 2);
  await interaction.editReply({ embeds: [simpleEmbed(COLORS.success, `🍻 Đã nhận tin tình báo!\nTrong **2 giờ**, farm tại **${zone?.name ?? offer.zoneId}** sẽ được bonus.\n🪙 -50 Gold · 🏹 Hunters Rep +2`)], components: [backRow(userId)] });
}

export async function showOldChurchDistrict(interaction: ChatInputCommandInteraction, userId: string, guildId: string): Promise<void> {
  ensureProjects(guildId);
  const p = applyPassiveStats(getPlayer(userId, guildId)!);
  const rep = getFactionReputation(userId, guildId, 'old_church');
  const fund = db.prepare(`SELECT current_amount, target_amount FROM village_funds WHERE guild_id=? AND fund_id='prayer'`).get(guildId) as any;
  const embed = new EmbedBuilder().setColor(0xB0C4DE).setTitle('⛪ Khu C — Thánh Đường Bỏ Hoang')
    .setDescription(
      `Nến cũ cháy xanh giữa nền đá nứt.\n\n` +
      `❤️ HP ${p.hp}/${p.max_hp} · 💧 MP ${p.mp}/${p.max_mp} · 🪙 Gold ${p.gold ?? 0} · 🌘 Corruption ${p.corruption ?? 0}\n` +
      `Old Church Rep: **${rep >= 0 ? '+' : ''}${rep}**\n\n` +
      `🙏 Quỹ Cầu Nguyện: **${fund?.current_amount ?? 0}/${fund?.target_amount ?? 10000} Gold**\n` +
      progressBar(fund?.current_amount ?? 0, fund?.target_amount ?? 10000)
    );
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`vill_ch_heal_${userId}`).setLabel('Rửa Tội / Hồi Phục').setEmoji('💧').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`vill_ch_cleanse_${userId}`).setLabel('Tẩy Ô Nhiễm').setEmoji('🧂').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`vill_ch_pray_${userId}`).setLabel('Quyên góp 100 Gold').setEmoji('🙏').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`vill_back_${userId}`).setLabel('Quay lại').setStyle(ButtonStyle.Secondary),
  );
  const msg = await interaction.editReply({ embeds: [embed], components: [row] });
  const btn = await msg.awaitMessageComponent({ componentType: ComponentType.Button, filter: i => i.user.id === userId, time: 45_000 }).catch(() => null);
  if (!btn) return;
  await safeDefer(btn);
  if (btn.customId === `vill_ch_heal_${userId}`) return churchHeal(interaction, userId, guildId);
  if (btn.customId === `vill_ch_cleanse_${userId}`) return churchCleanse(interaction, userId, guildId);
  if (btn.customId === `vill_ch_pray_${userId}`) return churchPray(interaction, userId, guildId);
  await interaction.editReply({ components: [] }).catch(() => {});
}

async function churchHeal(interaction: ChatInputCommandInteraction, userId: string, guildId: string): Promise<void> {
  const p = applyPassiveStats(getPlayer(userId, guildId)!);
  const rep = getFactionReputation(userId, guildId, 'old_church');
  const missingHp = Math.max(0, p.max_hp - p.hp);
  const missingMp = Math.max(0, p.max_mp - p.mp);
  const base = Math.max(5, Math.ceil(missingHp * 0.18 + missingMp * 0.10));
  // Thánh Đường là dịch vụ hồi phục rẻ, không phải miễn phí.
  // Rep cao vẫn được giảm giá mạnh, nhưng luôn có phí tối thiểu để tránh spam hồi phục.
  const discountRate = rep >= 50 ? 0.25 : rep >= 20 ? 0.5 : 1;
  const cost = Math.max(3, Math.ceil(base * discountRate));
  if (missingHp === 0 && missingMp === 0) {
    await interaction.editReply({ embeds: [simpleEmbed(COLORS.info, '✅ Bạn đang đầy HP/MP rồi.')], components: [backRow(userId)] });
    return;
  }
  if (!spendGold(userId, guildId, cost)) {
    await interaction.editReply({ embeds: [simpleEmbed(COLORS.warning, `❌ Cần **${cost} Gold** để hồi phục.`)], components: [backRow(userId)] });
    return;
  }
  const beforeGold = p.gold ?? 0;
  updatePlayerHpMp(userId, guildId, p.max_hp, p.max_mp);
  const afterGold = Math.max(0, beforeGold - cost);
  await interaction.editReply({ embeds: [simpleEmbed(COLORS.success, `💧 Bạn đã hồi đầy HP/MP tại Thánh Đường.\n🪙 Chi phí: **${cost} Gold** (${beforeGold} → ${afterGold})`)], components: [backRow(userId)] });
}

async function churchCleanse(interaction: ChatInputCommandInteraction, userId: string, guildId: string): Promise<void> {
  const p = getPlayer(userId, guildId)!;
  const rep = getFactionReputation(userId, guildId, 'old_church');
  const corr = p.corruption ?? 0;
  if (corr <= 0) {
    await interaction.editReply({ embeds: [simpleEmbed(COLORS.info, '⛪ Linh hồn bạn chưa bị ô nhiễm.')], components: [backRow(userId)] });
    return;
  }
  const cost = Math.max(20, Math.ceil(corr * (rep >= 30 ? 2 : 4)));
  if (!spendGold(userId, guildId, cost)) {
    await interaction.editReply({ embeds: [simpleEmbed(COLORS.warning, `❌ Cần **${cost} Gold** để tẩy ô nhiễm.`)], components: [backRow(userId)] });
    return;
  }
  db.prepare('UPDATE players SET corruption=0 WHERE user_id=? AND guild_id=?').run(userId, guildId);
  adjustFaction(userId, guildId, 'old_church', 2);
  await interaction.editReply({ embeds: [simpleEmbed(COLORS.success, `🧂 Ô Nhiễm Linh Hồn đã được tẩy sạch.\n🪙 -${cost} Gold · ⛪ Old Church Rep +2`)], components: [backRow(userId)] });
}

async function churchPray(interaction: ChatInputCommandInteraction, userId: string, guildId: string): Promise<void> {
  ensureProjects(guildId);
  if (!spendGold(userId, guildId, 100)) {
    await interaction.editReply({ embeds: [simpleEmbed(COLORS.warning, '❌ Cần **100 Gold** để quyên góp.')], components: [backRow(userId)] });
    return;
  }
  const row = db.prepare(`SELECT current_amount, target_amount FROM village_funds WHERE guild_id=? AND fund_id='prayer'`).get(guildId) as any;
  const target = row?.target_amount ?? 10000;
  const next = (row?.current_amount ?? 0) + 100;
  if (next >= target) {
    db.prepare(`UPDATE village_funds SET current_amount=0, updated_at=unixepoch() WHERE guild_id=? AND fund_id='prayer'`).run(guildId);
    setFlag(guildId, 'global_exp_bonus', '10', DAY);
    adjustFaction(userId, guildId, 'old_church', 5);
    await interaction.editReply({ embeds: [simpleEmbed(COLORS.success, `🙏 Quỹ Cầu Nguyện đã đạt **${target} Gold**!\nToàn server nhận buff **Ánh Sáng Thánh: +10% EXP trong 24 giờ**.\n⛪ Old Church Rep +5`)], components: [backRow(userId)] });
    return;
  }
  db.prepare(`UPDATE village_funds SET current_amount=?, updated_at=unixepoch() WHERE guild_id=? AND fund_id='prayer'`).run(next, guildId);
  adjustFaction(userId, guildId, 'old_church', 1);
  await interaction.editReply({ embeds: [simpleEmbed(COLORS.success, `🙏 Bạn đã quyên góp **100 Gold**.\nTiến độ quỹ: **${next}/${target}**\n${progressBar(next, target)}`)], components: [backRow(userId)] });
}

export async function showShadowCourtDistrict(interaction: ChatInputCommandInteraction, userId: string, guildId: string): Promise<void> {
  const p = getPlayer(userId, guildId)!;
  const churchRep = getFactionReputation(userId, guildId, 'old_church');
  const shadowRep = getFactionReputation(userId, guildId, 'shadow_court');
  const hasToken = getItemQty(userId, guildId, 'shadow_token') > 0;
  const unlocked = hasToken || churchRep < 0 || shadowRep >= 10;
  if (!unlocked) {
    await interaction.editReply({ embeds: [simpleEmbed(COLORS.dark, '🌑 Bạn đi ngang qua một con hẻm tối, nhưng không thấy lối vào.\nCần **shadow_token**, **Shadow Court Rep +10**, hoặc **Old Church Rep âm** để mở khu này.')], components: [backRow(userId)] });
    return;
  }
  const sacrifices = db.prepare(`SELECT COALESCE(SUM(count),0) AS n FROM shadow_sacrifices WHERE user_id=? AND guild_id=?`).get(userId, guildId) as any;
  const casinoCd = userCooldown(userId, guildId, 'shadow_casino');
  const sacrificeCd = userCooldown(userId, guildId, 'shadow_sacrifice');
  const embed = new EmbedBuilder().setColor(COLORS.dark).setTitle('🌑 Khu D — Hẻm Tối / Shadow Court')
    .setDescription(
      `Không ai ở làng thừa nhận nơi này tồn tại.\n\n` +
      `👤 **${p.name}** · 🪙 **${p.gold} Gold** · Shadow Rep: **${shadowRep >= 0 ? '+' : ''}${shadowRep}**\n` +
      `🎲 Sòng bạc: cược Gold · ${cooldownLine('CD', casinoCd)}.\n` +
      `🩸 Hiến tế: đổi Max HP vĩnh viễn lấy vật phẩm nguyền · ${cooldownLine('CD', sacrificeCd)}.\n` +
      `Số lần hiến tế đã ghi nhận: **${sacrifices?.n ?? 0}/3**`
    );
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`vill_sh_casino_${userId}`).setLabel('Sòng Bạc 100G').setEmoji('🎲').setStyle(ButtonStyle.Primary).setDisabled(casinoCd > 0),
    new ButtonBuilder().setCustomId(`vill_sh_sac_${userId}`).setLabel('Hiến Tế Max HP').setEmoji('🩸').setStyle(ButtonStyle.Danger).setDisabled(sacrificeCd > 0),
    new ButtonBuilder().setCustomId(`vill_back_${userId}`).setLabel('Quay lại').setStyle(ButtonStyle.Secondary),
  );
  const msg = await interaction.editReply({ embeds: [embed], components: [row] });
  const btn = await msg.awaitMessageComponent({ componentType: ComponentType.Button, filter: i => i.user.id === userId, time: 45_000 }).catch(() => null);
  if (!btn) return;
  await safeDefer(btn);
  if (btn.customId === `vill_sh_casino_${userId}`) return shadowCasino(interaction, userId, guildId);
  if (btn.customId === `vill_sh_sac_${userId}`) return shadowSacrifice(interaction, userId, guildId);
  await interaction.editReply({ components: [] }).catch(() => {});
}

async function shadowCasino(interaction: ChatInputCommandInteraction, userId: string, guildId: string): Promise<void> {
  const cd = userCooldown(userId, guildId, 'shadow_casino');
  if (cd > 0) {
    await interaction.editReply({ embeds: [simpleEmbed(COLORS.warning, `🎲 Sòng bạc đang cooldown. Thử lại sau **${formatDuration(cd)}**.`)], components: [backRow(userId)] });
    return;
  }
  const p = getPlayer(userId, guildId)!;
  const bet = Math.min(100, p.gold);
  if (bet < 100 || !spendGold(userId, guildId, 100)) {
    await interaction.editReply({ embeds: [simpleEmbed(COLORS.warning, '🎲 Cần **100 Gold** để cược.')], components: [backRow(userId)] });
    return;
  }
  setUserCooldown(userId, guildId, 'shadow_casino', VILLAGE_COOLDOWNS.casino);
  const playerRoll = 1 + Math.floor(Math.random() * 6);
  const houseRoll = 1 + Math.floor(Math.random() * 6);
  if (playerRoll > houseRoll) {
    grantGold(userId, guildId, 220);
    adjustFaction(userId, guildId, 'shadow_court', 2);
    await interaction.editReply({ embeds: [simpleEmbed(COLORS.success, `🎲 Bạn lắc **${playerRoll}**, nhà cái **${houseRoll}**.\nBạn thắng **+120 Gold lãi**!`)], components: [backRow(userId)] });
  } else if (playerRoll === houseRoll) {
    grantGold(userId, guildId, 100);
    await interaction.editReply({ embeds: [simpleEmbed(COLORS.info, `🎲 Bạn lắc **${playerRoll}**, nhà cái **${houseRoll}**.\nHòa, nhận lại tiền cược.`)], components: [backRow(userId)] });
  } else {
    adjustFaction(userId, guildId, 'shadow_court', 1);
    await interaction.editReply({ embeds: [simpleEmbed(COLORS.danger, `🎲 Bạn lắc **${playerRoll}**, nhà cái **${houseRoll}**.\nThua mất **100 Gold**.`)], components: [backRow(userId)] });
  }
}

async function shadowSacrifice(interaction: ChatInputCommandInteraction, userId: string, guildId: string): Promise<void> {
  const cd = userCooldown(userId, guildId, 'shadow_sacrifice');
  if (cd > 0) {
    await interaction.editReply({ embeds: [simpleEmbed(COLORS.warning, `🩸 Nghi lễ hiến tế chưa nguội. Thử lại sau **${formatDuration(cd)}**.`)], components: [backRow(userId)] });
    return;
  }
  const p = applyPassiveStats(getPlayer(userId, guildId)!);
  const row = db.prepare(`SELECT COALESCE(SUM(count),0) AS n FROM shadow_sacrifices WHERE user_id=? AND guild_id=?`).get(userId, guildId) as any;
  const count = Number(row?.n ?? 0);
  if (count >= 3) {
    await interaction.editReply({ embeds: [simpleEmbed(COLORS.warning, '🩸 Bạn đã đạt giới hạn **3 lần hiến tế**.')], components: [backRow(userId)] });
    return;
  }
  if (p.max_hp <= 80) {
    await interaction.editReply({ embeds: [simpleEmbed(COLORS.warning, '🩸 Max HP quá thấp, không thể hiến tế thêm.')], components: [backRow(userId)] });
    return;
  }
  const confirm = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`vill_sac_confirm_${userId}`).setLabel('Xác nhận mất 50 Max HP').setEmoji('🩸').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`vill_back_${userId}`).setLabel('Hủy').setStyle(ButtonStyle.Secondary),
  );
  const embed = new EmbedBuilder().setColor(COLORS.dark).setTitle('🩸 Hiến Tế Hắc Ám')
    .setDescription(`Bạn sẽ mất **50 Max HP vĩnh viễn** để nhận **Ancient Blood Blade**.\n\nHP hiện tại: **${p.max_hp} Max HP**\nSố lần còn lại: **${3 - count}**\n\nBấm xác nhận nếu chắc chắn.`);
  const msg = await interaction.editReply({ embeds: [embed], components: [confirm] });
  const btn = await msg.awaitMessageComponent({ componentType: ComponentType.Button, filter: i => i.user.id === userId, time: 30_000 }).catch(() => null);
  if (!btn) return;
  await safeDefer(btn);
  if (btn.customId !== `vill_sac_confirm_${userId}`) return;
  db.prepare(`UPDATE players SET permanent_max_hp_bonus = COALESCE(permanent_max_hp_bonus,0) - 50, hp = MIN(hp, max_hp - 50) WHERE user_id=? AND guild_id=?`).run(userId, guildId);
  db.prepare(`INSERT INTO shadow_sacrifices (user_id, guild_id, sacrifice_key, count, updated_at) VALUES (?, ?, 'ancient_blood_blade', 1, unixepoch()) ON CONFLICT(user_id, guild_id, sacrifice_key) DO UPDATE SET count=count+1, updated_at=unixepoch()`).run(userId, guildId);
  setUserCooldown(userId, guildId, 'shadow_sacrifice', VILLAGE_COOLDOWNS.sacrifice);
  addItem(userId, guildId, 'ancient_blood_blade', 1);
  adjustFaction(userId, guildId, 'shadow_court', 8);
  await interaction.editReply({ embeds: [simpleEmbed(COLORS.dark, `🩸 Giao kèo hoàn tất.\nBạn mất **50 Max HP vĩnh viễn** và nhận **🩸 Ancient Blood Blade**.\n🌑 Shadow Court Rep +8`)], components: [backRow(userId)] });
}

export async function showTownSquareDistrict(interaction: ChatInputCommandInteraction, userId: string, guildId: string): Promise<void> {
  ensureProjects(guildId);
  const p = getPlayer(userId, guildId)!;
  const active = db.prepare('SELECT COUNT(*) AS n FROM guild_projects WHERE guild_id=? AND is_completed=0').get(guildId) as any;
  const done = db.prepare('SELECT COUNT(*) AS n FROM guild_projects WHERE guild_id=? AND is_completed=1').get(guildId) as any;

  const embed = new EmbedBuilder()
    .setColor(0x2ECC71)
    .setTitle('🪵 Khu E — Quảng Trường Chính')
    .setDescription(
      `Giữa quảng trường, tiếng búa rèn vang lên cạnh bảng công trình của làng.\n\n` +
      `👤 **${p.name}** · 🪙 **${p.gold} Gold**\n` +
      `⚒️ **Lò Rèn**: nâng trang bị, thức tỉnh đồ cũ, khóa dòng và tẩy luyện Affix.\n` +
      `🏗️ **Công trình công cộng**: đóng góp nguyên liệu để mở nâng cấp toàn server.\n\n` +
      `Công trình đang mở: **${active?.n ?? 0}** · Đã hoàn thành: **${done?.n ?? 0}**`
    );

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`vill_sq_smith_${userId}`).setLabel('Lò Rèn').setEmoji('⚒️').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`vill_sq_projects_${userId}`).setLabel('Công trình').setEmoji('🏗️').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`vill_back_${userId}`).setLabel('Quay lại').setStyle(ButtonStyle.Secondary),
  );

  const msg = await interaction.editReply({ embeds: [embed], components: [row] });
  const btn = await msg.awaitMessageComponent({ componentType: ComponentType.Button, filter: i => i.user.id === userId, time: 45_000 }).catch(() => null);
  if (!btn) return;
  await safeDefer(btn);
  if (btn.customId === `vill_sq_smith_${userId}`) return showVillageBlacksmith(interaction, userId, guildId);
  if (btn.customId === `vill_sq_projects_${userId}`) return showTownSquareProjects(interaction, userId, guildId);
  await interaction.editReply({ components: [] }).catch(() => {});
}

async function showTownSquareProjects(interaction: ChatInputCommandInteraction, userId: string, guildId: string): Promise<void> {
  ensureProjects(guildId);
  const rows = db.prepare('SELECT * FROM guild_projects WHERE guild_id=? ORDER BY is_completed ASC, project_id ASC').all(guildId) as any[];
  const desc = rows.map(r => {
    const def = PROJECTS.find(p => p.id === r.project_id)!;
    const item = displayThing(def.targetItem);
    return `${def.icon} **${def.name}** ${r.is_completed ? '✅' : ''}\n> Cần ${item.icon} **${item.name}** · **${r.current_amount}/${r.target_amount}**\n> ${progressBar(r.current_amount, r.target_amount)}`;
  }).join('\n\n');
  const embed = new EmbedBuilder().setColor(0x2ECC71).setTitle('🏗️ Công Trình Công Cộng')
    .setDescription(`${desc}\n\nChọn công trình để đóng góp nguyên liệu toàn server.`);
  const options = rows.filter(r => !r.is_completed).slice(0, 25).map(r => {
    const def = PROJECTS.find(p => p.id === r.project_id)!;
    const item = displayThing(def.targetItem);
    return new StringSelectMenuOptionBuilder().setLabel(`${def.icon} ${def.name}`.slice(0, 100)).setDescription(`Đóng góp ${item.name} · ${r.current_amount}/${r.target_amount}`.slice(0, 100)).setValue(def.id);
  });
  if (options.length === 0) {
    await interaction.editReply({ embeds: [embed], components: [backRow(userId)] });
    return;
  }
  const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(new StringSelectMenuBuilder().setCustomId(`vill_proj_sel_${userId}`).setPlaceholder('Chọn công trình...').addOptions(options));
  const msg = await interaction.editReply({ embeds: [embed], components: [row, backRow(userId)] });
  const sel = await msg.awaitMessageComponent({ filter: i => i.user.id === userId, time: 45_000 }).catch(() => null);
  if (!sel) return;
  await safeDefer(sel);
  if (!sel.isStringSelectMenu()) return;
  const projectId = sel.values[0];
  await showProjectDonation(interaction, userId, guildId, projectId);
}

async function showProjectDonation(interaction: ChatInputCommandInteraction, userId: string, guildId: string, projectId: string): Promise<void> {
  const def = PROJECTS.find(p => p.id === projectId);
  if (!def) return showTownSquareProjects(interaction, userId, guildId);
  const row = getProjectRow(guildId, projectId);
  const qty = getItemQty(userId, guildId, def.targetItem);
  const item = displayThing(def.targetItem);
  const remaining = Math.max(0, def.targetAmount - row.current_amount);
  const embed = new EmbedBuilder().setColor(0x2ECC71).setTitle(`${def.icon} ${def.name}`)
    .setDescription(`Nguyên liệu cần: ${item.icon} **${item.name}**\nTiến độ: **${row.current_amount}/${def.targetAmount}**\n${progressBar(row.current_amount, def.targetAmount)}\n\nBạn có: **${qty}**\nPhần thưởng server: ${def.rewardText}`);
  const btnRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`vill_proj_d10_${userId}_${projectId}`).setLabel('Góp x10').setStyle(ButtonStyle.Secondary).setDisabled(qty < 10),
    new ButtonBuilder().setCustomId(`vill_proj_d100_${userId}_${projectId}`).setLabel('Góp x100').setStyle(ButtonStyle.Primary).setDisabled(qty < 100),
    new ButtonBuilder().setCustomId(`vill_proj_dall_${userId}_${projectId}`).setLabel(`Góp tối đa`).setStyle(ButtonStyle.Success).setDisabled(qty <= 0),
    new ButtonBuilder().setCustomId(`vill_back_${userId}`).setLabel('Quay lại').setStyle(ButtonStyle.Secondary),
  );
  const msg = await interaction.editReply({ embeds: [embed], components: [btnRow] });
  const btn = await msg.awaitMessageComponent({ componentType: ComponentType.Button, filter: i => i.user.id === userId, time: 30_000 }).catch(() => null);
  if (!btn) return;
  await safeDefer(btn);
  if (btn.customId === `vill_back_${userId}`) return showTownSquareProjects(interaction, userId, guildId);
  const donate = btn.customId.includes('_dall_') ? Math.min(qty, remaining) : btn.customId.includes('_d100_') ? 100 : 10;
  if (donate <= 0 || !removeItem(userId, guildId, def.targetItem, donate)) {
    await interaction.editReply({ embeds: [simpleEmbed(COLORS.warning, '❌ Không đủ nguyên liệu để đóng góp.')], components: [backRow(userId)] });
    return;
  }
  const next = Math.min(def.targetAmount, row.current_amount + donate);
  const completed = next >= def.targetAmount;
  db.prepare('UPDATE guild_projects SET current_amount=?, is_completed=?, completed_at=? WHERE guild_id=? AND project_id=?')
    .run(next, completed ? 1 : 0, completed ? nowSec() : row.completed_at, guildId, projectId);
  adjustFaction(userId, guildId, 'villagers', Math.max(1, Math.floor(donate / 100)));
  if (completed) setFlag(guildId, def.rewardFlag, '1');
  await interaction.editReply({ embeds: [simpleEmbed(completed ? COLORS.success : COLORS.info, `🪵 Bạn đã đóng góp ${item.icon} **${item.name} x${donate}**.\nTiến độ mới: **${next}/${def.targetAmount}**\n${progressBar(next, def.targetAmount)}${completed ? `\n\n🎉 **DỰ ÁN HOÀN THÀNH!** ${def.rewardText}` : ''}`)], components: [backRow(userId)] });
}
