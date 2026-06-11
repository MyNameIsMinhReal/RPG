import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  AttachmentBuilder,
} from 'discord.js';

import db from '../database/index';
import { getItem } from '../data/items';
import { getMaterial } from '../data/materials';
import { ENEMIES, getEnemy } from '../data/enemies';
import { getEquipment } from '../data/equipment';
import { PETS, getPet } from '../data/pets';
import { CRAFT_RECIPES } from '../data/recipes';
import { ZONES, ZONE_ORDER, getZone } from '../data/zones';
import { DATA_DRIVEN_EXPLORE_EVENTS } from '../data/exploreEventDefs';
import { expNext } from '../utils/format';
import {
  GAME_ID_CATEGORY_CHOICES,
  GAME_ID_CATEGORY_LABELS,
  countRows,
  filterGameIdSections,
  formatGameIdsPreview,
  formatGameIdsText,
  getGameIdSectionsFor,
  type GameIdCategory,
} from '../utils/gameIds';
import {
  getPlayer,
  applyPassiveStats,
  resetPlayer,
  revivePlayer,
  updatePlayerHpMp,
  setZone,
  grantGold,
  grantExp,
  addItem,
  removeItem,
  getItemQty,
  getInventory,
  getPets,
  addPet,
  syncDerivedBaseStats,
} from '../systems/player';
import {
  clearPlayerBossProgress,
  hasPlayerClearedBoss,
  markPlayerClearedBoss,
  setFlag,
  getFlag,
  deleteFlag,
  getAllFlags,
} from '../systems/world';
import { unlockRecipe } from '../systems/crafting';
import {
  getOakEvent,
  getOakParticipants,
  hasOakPrereq,
  isOakHuntActive,
  getOakHuntRemaining,
} from '../systems/oakEvent';
import {
  BOSS_MAX_PARTICIPANTS,
  clearBossEncounter,
  createBossEncounter,
  getBossEncounter,
  getBossEncounterRemaining,
} from '../systems/bossEncounter';
import { getBossRecommendedLevel, getBossLevelScaling } from '../systems/bossScaling';
import { getCombatByUser } from '../systems/combat';
import { unregisterCombat } from '../systems/combatRegistry';
import { listActiveShrineBlessings, SHRINE_BLESSINGS } from '../systems/shrineBlessings';

const BOSS_IDS = Object.values(ZONES)
  .filter(z => z.bossId)
  .map(z => ({ id: z.bossId!, zone: z.name }));

const ZONE_CHOICES = Object.values(ZONES).map(z => ({ name: `${z.icon} ${z.name}`, value: z.id }));
const BOSS_CHOICES = BOSS_IDS.map(b => ({ name: `${b.zone} — ${b.id}`, value: b.id }));

const ALLOWED_IDS = new Set(
  (process.env.BOT_ADMIN_IDS ?? '').split(',').map(s => s.trim()).filter(Boolean)
);

function isAllowed(userId: string): boolean {
  return ALLOWED_IDS.has(userId);
}

function nowSec(): number {
  return Math.floor(Date.now() / 1000);
}

function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

function resolveGuildId(interaction: ChatInputCommandInteraction): string {
  return interaction.options.getString('guild_id')?.trim() || interaction.guildId!;
}

function metaFor(id: string): { id: string; name: string; icon: string; kind: string } | null {
  const item = getItem(id);
  if (item) return { id, name: item.name, icon: item.icon, kind: item.type };
  const mat = getMaterial(id);
  if (mat) return { id, name: mat.name, icon: mat.icon, kind: 'material' };
  const eq = getEquipment(id);
  if (eq) return { id, name: eq.name, icon: eq.icon, kind: `equipment:${eq.slot}` };
  const pet = getPet(id);
  if (pet) return { id, name: pet.name, icon: pet.icon, kind: 'pet' };
  return null;
}

function okLine(ok: boolean, label: string, detail: string): string {
  return `${ok ? '✅' : '❌'} **${label}** — ${detail}`;
}

function warnLine(label: string, detail: string): string {
  return `⚠️ **${label}** — ${detail}`;
}

function getWorldFlagRow(guildId: string, key: string): { flag_value: string; expires_at: number | null; created_at: number } | undefined {
  const now = nowSec();
  return db.prepare(`
    SELECT flag_value, expires_at, created_at FROM world_state
    WHERE guild_id=? AND flag_key=? AND (expires_at IS NULL OR expires_at > ?)
  `).get(guildId, key, now) as { flag_value: string; expires_at: number | null; created_at: number } | undefined;
}

function deleteWorldFlagKeys(guildId: string, keys: string[]): number {
  if (keys.length === 0) return 0;
  const stmt = db.prepare('DELETE FROM world_state WHERE guild_id=? AND flag_key=?');
  let total = 0;
  for (const key of keys) total += stmt.run(guildId, key).changes as number;
  return total;
}

function resetActiveOakEvent(guildId: string): { events: number; participants: number } {
  const now = nowSec();
  const events = db.prepare(`
    UPDATE oak_event
    SET phase='dead', current_fighter=NULL, expires_at=?
    WHERE guild_id=? AND phase!='dead'
  `).run(now, guildId).changes as number;
  const participants = db.prepare('DELETE FROM oak_participants WHERE guild_id=?')
    .run(guildId).changes as number;
  return { events, participants };
}

function resetAncientOakCooldown(guildId: string): number {
  return deleteWorldFlagKeys(guildId, ['boss_ancient_oak_slain']);
}

function resetAncientOakAftermath(guildId: string): number {
  return deleteWorldFlagKeys(guildId, ['event_ancient_oak_fall', 'forest_drop_bonus']);
}

function clearCombatForUser(userId: string, guildId: string): number {
  unregisterCombat(userId, guildId);
  return db.prepare('DELETE FROM active_combats WHERE user_id=? AND guild_id=?')
    .run(userId, guildId).changes as number;
}

function formatPlayerSummary(userId: string, guildId: string): string {
  const raw = getPlayer(userId, guildId);
  if (!raw) return 'Không có nhân vật.';
  const p = applyPassiveStats(raw);
  const zone = getZone(p.zone_id);
  return [
    `**${p.name}** · <@${userId}>`,
    `Lv.${p.level} · EXP ${p.exp}/${p.exp_next} · ${p.alive ? '🟢 Sống' : '💀 Đã chết'}`,
    `❤️ HP ${p.hp}/${p.max_hp} · 💧 MP ${p.mp}/${p.max_mp}`,
    `⚔️ ATK ${p.atk} · 🛡️ DEF ${p.def} · 🪙 ${p.gold.toLocaleString()} Gold`,
    `📍 Zone: ${zone ? `${zone.icon} ${zone.name}` : p.zone_id}`,
    `📊 STR ${Number((p as any).stat_str ?? 0)} · VIT ${Number((p as any).stat_vit ?? 0)} · END ${Number((p as any).stat_end ?? 0)} · AGI ${Number((p as any).stat_agi ?? 0)} · LUK ${Number((p as any).stat_luk ?? 0)}`,
    `🌘 Corruption: ${Number((p as any).corruption ?? 0)}`,
  ].join('\n');
}

function inventoryPreview(userId: string, guildId: string, limit = 20): string {
  const inv = getInventory(userId, guildId);
  if (!inv.length) return '*Trống*';
  return inv.slice(0, limit).map(it => {
    const meta = metaFor(it.item_id);
    return `${meta?.icon ?? '•'} **${meta?.name ?? it.item_id}** \`${it.item_id}\` ×${it.quantity}`;
  }).join('\n') + (inv.length > limit ? `\n… và ${inv.length - limit} dòng khác.` : '');
}

function bossLabel(bossId: string): string {
  const boss = getEnemy(bossId);
  return boss ? `${boss.icon} ${boss.name} \`${bossId}\`` : `\`${bossId}\``;
}

export const data = new SlashCommandBuilder()
  .setName('admin')
  .setDescription('Công cụ quản trị bot')
  .addSubcommand(sub => sub
    .setName('player')
    .setDescription('Xem/sửa trạng thái người chơi')
    .addStringOption(opt => opt.setName('action').setDescription('Hành động').setRequired(true).addChoices(
      { name: '👁️ Xem', value: 'view' },
      { name: '♻️ Reset nhân vật', value: 'reset' },
      { name: '✨ Hồi sinh', value: 'revive' },
      { name: '💚 Hồi đầy HP/MP', value: 'heal' },
      { name: '🗺️ Đặt zone', value: 'setzone' },
      { name: '🏅 Đặt level', value: 'setlevel' },
      { name: '⭐ Đặt EXP', value: 'setxp' },
    ))
    .addUserOption(opt => opt.setName('user').setDescription('Người chơi').setRequired(true))
    .addIntegerOption(opt => opt.setName('value').setDescription('Giá trị cho setlevel/setxp').setRequired(false).setMinValue(0))
    .addStringOption(opt => opt.setName('zone_id').setDescription('Zone cho setzone').setRequired(false).addChoices(...ZONE_CHOICES))
    .addStringOption(opt => opt.setName('guild_id').setDescription('Guild ID khác').setRequired(false))
  )
  .addSubcommand(sub => sub
    .setName('give')
    .setDescription('Cho gold/EXP/item/material/equipment/pet')
    .addUserOption(opt => opt.setName('user').setDescription('Người chơi').setRequired(true))
    .addStringOption(opt => opt.setName('type').setDescription('Loại').setRequired(true).addChoices(
      { name: '🪙 Gold', value: 'gold' },
      { name: '⭐ EXP', value: 'exp' },
      { name: '🎒 Item/Consumable/Key', value: 'item' },
      { name: '🧱 Material', value: 'material' },
      { name: '🗡️ Equipment', value: 'equipment' },
      { name: '🐾 Pet', value: 'pet' },
    ))
    .addIntegerOption(opt => opt.setName('amount').setDescription('Số lượng').setRequired(true).setMinValue(1))
    .addStringOption(opt => opt.setName('id').setDescription('ID item/material/equipment/pet').setRequired(false))
    .addStringOption(opt => opt.setName('guild_id').setDescription('Guild ID khác').setRequired(false))
  )
  .addSubcommand(sub => sub
    .setName('remove')
    .setDescription('Gỡ item/material/equipment/pet hoặc trừ gold')
    .addUserOption(opt => opt.setName('user').setDescription('Người chơi').setRequired(true))
    .addStringOption(opt => opt.setName('type').setDescription('Loại').setRequired(true).addChoices(
      { name: '🪙 Gold', value: 'gold' },
      { name: '🎒 Item/Consumable/Key', value: 'item' },
      { name: '🧱 Material', value: 'material' },
      { name: '🗡️ Equipment', value: 'equipment' },
      { name: '🐾 Pet', value: 'pet' },
    ))
    .addIntegerOption(opt => opt.setName('amount').setDescription('Số lượng').setRequired(true).setMinValue(1))
    .addStringOption(opt => opt.setName('id').setDescription('ID cần gỡ').setRequired(false))
    .addStringOption(opt => opt.setName('guild_id').setDescription('Guild ID khác').setRequired(false))
  )
  .addSubcommand(sub => sub
    .setName('economy')
    .setDescription('Quản lý Gold của người chơi')
    .addUserOption(opt => opt.setName('user').setDescription('Người chơi').setRequired(true))
    .addStringOption(opt => opt.setName('action').setDescription('Hành động').setRequired(true).addChoices(
      { name: '➕ Add Gold', value: 'add' },
      { name: '➖ Remove Gold', value: 'remove' },
      { name: '✏️ Set Gold', value: 'set' },
    ))
    .addIntegerOption(opt => opt.setName('amount').setDescription('Số gold').setRequired(true).setMinValue(0))
    .addStringOption(opt => opt.setName('guild_id').setDescription('Guild ID khác').setRequired(false))
  )
  .addSubcommand(sub => sub
    .setName('boss')
    .setDescription('Quản lý boss lobby theo zone')
    .addStringOption(opt => opt.setName('action').setDescription('Hành động').setRequired(true).addChoices(
      { name: '📊 Status', value: 'status' },
      { name: '🧹 Clear', value: 'clear' },
      { name: '👑 Summon', value: 'summon' },
    ))
    .addStringOption(opt => opt.setName('zone_id').setDescription('Zone').setRequired(true).addChoices(...ZONE_CHOICES))
    .addStringOption(opt => opt.setName('boss_id').setDescription('Boss ID khi summon').setRequired(false).addChoices(...BOSS_CHOICES))
    .addStringOption(opt => opt.setName('guild_id').setDescription('Guild ID khác').setRequired(false))
  )
  .addSubcommand(sub => sub
    .setName('combat')
    .setDescription('Kiểm tra hoặc clear active combat của người chơi')
    .addUserOption(opt => opt.setName('user').setDescription('Người chơi').setRequired(true))
    .addStringOption(opt => opt.setName('action').setDescription('Hành động').setRequired(true).addChoices(
      { name: '📊 Status', value: 'status' },
      { name: '🧹 Clear', value: 'clear' },
    ))
    .addStringOption(opt => opt.setName('guild_id').setDescription('Guild ID khác').setRequired(false))
  )
  .addSubcommand(sub => sub
    .setName('progress')
    .setDescription('Recipe, zone, chapter, boss progress')
    .addUserOption(opt => opt.setName('user').setDescription('Người chơi').setRequired(true))
    .addStringOption(opt => opt.setName('action').setDescription('Hành động').setRequired(true).addChoices(
      { name: '🔓 Unlock Recipe', value: 'unlock_recipe' },
      { name: '🔒 Lock Recipe', value: 'lock_recipe' },
      { name: '🗺️ Unlock Zone Gate', value: 'unlock_zone' },
      { name: '📖 Set Chapter', value: 'set_chapter' },
      { name: '👑 Mark Boss Cleared', value: 'mark_boss' },
      { name: '🗑️ Clear Boss Cleared', value: 'clear_boss' },
    ))
    .addStringOption(opt => opt.setName('id').setDescription('Recipe ID / zone_id / boss_id').setRequired(false))
    .addIntegerOption(opt => opt.setName('value').setDescription('Chapter number').setRequired(false).setMinValue(1))
    .addStringOption(opt => opt.setName('guild_id').setDescription('Guild ID khác').setRequired(false))
  )
  .addSubcommand(sub => sub
    .setName('flag')
    .setDescription('Get/set/clear world flag')
    .addStringOption(opt => opt.setName('action').setDescription('Hành động').setRequired(true).addChoices(
      { name: '👁️ Get', value: 'get' },
      { name: '✏️ Set', value: 'set' },
      { name: '🗑️ Clear', value: 'clear' },
    ))
    .addStringOption(opt => opt.setName('key').setDescription('Flag key').setRequired(true))
    .addStringOption(opt => opt.setName('value').setDescription('Flag value').setRequired(false))
    .addIntegerOption(opt => opt.setName('ttl').setDescription('TTL giây, bỏ trống = vĩnh viễn').setRequired(false).setMinValue(1))
    .addStringOption(opt => opt.setName('guild_id').setDescription('Guild ID khác').setRequired(false))
  )
  .addSubcommand(sub => sub
    .setName('event')
    .setDescription('Ép event tiếp theo của người chơi khi /explore')
    .addUserOption(opt => opt.setName('user').setDescription('Người chơi').setRequired(true))
    .addStringOption(opt => opt.setName('event_id').setDescription('Event ID').setRequired(true))
    .addStringOption(opt => opt.setName('guild_id').setDescription('Guild ID khác').setRequired(false))
  )
  .addSubcommand(sub => sub
    .setName('minigame')
    .setDescription('Ép mini game data-driven tiếp theo của người chơi khi /explore')
    .addUserOption(opt => opt.setName('user').setDescription('Người chơi').setRequired(true))
    .addStringOption(opt => opt.setName('event_id').setDescription('Event ID có miniGame').setRequired(true))
    .addStringOption(opt => opt.setName('guild_id').setDescription('Guild ID khác').setRequired(false))
  )
  .addSubcommand(sub => sub
    .setName('debug')
    .setDescription('Debug inventory/stats/cooldown/buffs/db')
    .addUserOption(opt => opt.setName('user').setDescription('Người chơi').setRequired(true))
    .addStringOption(opt => opt.setName('type').setDescription('Loại debug').setRequired(true).addChoices(
      { name: '🎒 Inventory', value: 'inventory' },
      { name: '📊 Stats', value: 'stats' },
      { name: '⏱️ Cooldown/Flags', value: 'cooldown' },
      { name: '✨ Buffs', value: 'buffs' },
      { name: '🧾 DB Summary', value: 'db' },
    ))
    .addStringOption(opt => opt.setName('guild_id').setDescription('Guild ID khác').setRequired(false))
  )
  .addSubcommand(sub => sub
    .setName('ids')
    .setDescription('Xuất danh sách ID game theo nhóm để dùng cho admin/debug')
    .addStringOption(opt => opt.setName('category').setDescription('Nhóm ID cần xem').setRequired(false).addChoices(...GAME_ID_CATEGORY_CHOICES))
    .addStringOption(opt => opt.setName('search').setDescription('Lọc theo ID/tên/ghi chú').setRequired(false))
  )
  .addSubcommand(sub => sub
    .setName('resetboss')
    .setDescription('Xoá tiến trình boss cá nhân của người chơi')
    .addUserOption(opt => opt.setName('user').setDescription('Người chơi cần reset').setRequired(true))
    .addStringOption(opt => opt.setName('boss').setDescription('Boss cụ thể, bỏ trống = tất cả').setRequired(false).addChoices(...BOSS_CHOICES))
    .addStringOption(opt => opt.setName('guild_id').setDescription('Guild ID khác').setRequired(false))
  )
  .addSubcommand(sub => sub
    .setName('resettime')
    .setDescription('Reset cooldown/time Ancient Oak')
    .addStringOption(opt => opt.setName('target').setDescription('Loại time cần reset').setRequired(true).addChoices(
      { name: '🌳 Ancient Oak cooldown', value: 'oak_cooldown' },
      { name: '🌳 Ancient Oak event đang mở', value: 'oak_event' },
      { name: '🌳 Ancient Oak tất cả', value: 'oak_all' },
    ))
    .addStringOption(opt => opt.setName('guild_id').setDescription('Guild ID khác').setRequired(false))
  )
  .addSubcommand(sub => sub
    .setName('check')
    .setDescription('Kiểm tra điều kiện/debug boss theo ID')
    .addUserOption(opt => opt.setName('user').setDescription('Người chơi cần kiểm tra').setRequired(true))
    .addStringOption(opt => opt.setName('boss_id').setDescription('ID boss cần check').setRequired(true))
    .addStringOption(opt => opt.setName('guild_id').setDescription('Guild ID khác').setRequired(false))
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  if (!isAllowed(interaction.user.id)) {
    await interaction.editReply({ content: '❌ Bạn không có quyền dùng lệnh này. Thêm Discord ID của bạn vào `BOT_ADMIN_IDS` trong `.env`.' });
    return;
  }

  const sub = interaction.options.getSubcommand();
  const guildId = resolveGuildId(interaction);

  if (sub === 'ids') {
    const category = (interaction.options.getString('category') ?? 'all') as GameIdCategory;
    const search = interaction.options.getString('search');
    const sections = filterGameIdSections(getGameIdSectionsFor(category), search);
    const total = countRows(sections);
    const text = formatGameIdsText(category, search);
    const fileName = `game-ids-${category}${search?.trim() ? '-search' : ''}.txt`;
    const attachment = new AttachmentBuilder(Buffer.from(text, 'utf8'), { name: fileName });

    await interaction.editReply({
      embeds: [new EmbedBuilder()
        .setColor(total > 0 ? 0x5865F2 : 0x95A5A6)
        .setTitle('🧾 Game ID Index')
        .setDescription(formatGameIdsPreview(category, search))
        .addFields(
          { name: 'Nhóm', value: GAME_ID_CATEGORY_LABELS[category], inline: true },
          { name: 'Số ID', value: `${total}`, inline: true },
          { name: 'File đầy đủ', value: `Đã đính kèm \`${fileName}\``, inline: false },
        )],
      files: [attachment],
    });
    return;
  }

  if (sub === 'player') {
    const action = interaction.options.getString('action', true);
    const target = interaction.options.getUser('user', true);
    const player = getPlayer(target.id, guildId);
    if (!player) {
      await interaction.editReply({ content: `❌ <@${target.id}> chưa có nhân vật.` });
      return;
    }

    if (action === 'view') {
      await interaction.editReply({ embeds: [new EmbedBuilder().setColor(0x5865F2).setTitle('👤 Admin Player View').setDescription(formatPlayerSummary(target.id, guildId))] });
      return;
    }

    if (action === 'reset') {
      resetPlayer(target.id, guildId);
      await interaction.editReply({ embeds: [new EmbedBuilder().setColor(0xED4245).setTitle('♻️ Đã Reset Nhân Vật').setDescription(formatPlayerSummary(target.id, guildId))] });
      return;
    }

    if (action === 'revive') {
      const revived = revivePlayer(target.id, guildId);
      if (!revived && player.alive) updatePlayerHpMp(target.id, guildId, Math.max(1, player.hp), player.mp);
      await interaction.editReply({ embeds: [new EmbedBuilder().setColor(0x57F287).setTitle(revived ? '✨ Đã Hồi Sinh' : 'ℹ️ Người chơi đang sống').setDescription(formatPlayerSummary(target.id, guildId))] });
      return;
    }

    if (action === 'heal') {
      const fresh = applyPassiveStats(getPlayer(target.id, guildId)!);
      db.prepare('UPDATE players SET alive=1, hp=?, mp=? WHERE user_id=? AND guild_id=?')
        .run(fresh.max_hp, fresh.max_mp, target.id, guildId);
      await interaction.editReply({ embeds: [new EmbedBuilder().setColor(0x57F287).setTitle('💚 Đã Hồi Đầy HP/MP').setDescription(formatPlayerSummary(target.id, guildId))] });
      return;
    }

    if (action === 'setzone') {
      const zoneId = interaction.options.getString('zone_id');
      if (!zoneId || !ZONES[zoneId]) {
        await interaction.editReply({ content: '❌ Cần chọn `zone_id` hợp lệ.' });
        return;
      }
      setZone(target.id, guildId, zoneId);
      await interaction.editReply({ embeds: [new EmbedBuilder().setColor(0x3498DB).setTitle('🗺️ Đã Đặt Zone').setDescription(formatPlayerSummary(target.id, guildId))] });
      return;
    }

    if (action === 'setlevel') {
      const value = interaction.options.getInteger('value');
      if (value === null || value < 1) {
        await interaction.editReply({ content: '❌ Cần nhập `value` >= 1.' });
        return;
      }
      db.prepare('UPDATE players SET level=?, exp=0, exp_next=? WHERE user_id=? AND guild_id=?')
        .run(value, expNext(value), target.id, guildId);
      syncDerivedBaseStats(target.id, guildId, true);
      await interaction.editReply({ embeds: [new EmbedBuilder().setColor(0x3498DB).setTitle('🏅 Đã Đặt Level').setDescription(formatPlayerSummary(target.id, guildId))] });
      return;
    }

    if (action === 'setxp') {
      const value = interaction.options.getInteger('value');
      if (value === null) {
        await interaction.editReply({ content: '❌ Cần nhập `value` EXP.' });
        return;
      }
      db.prepare('UPDATE players SET exp=? WHERE user_id=? AND guild_id=?').run(value, target.id, guildId);
      await interaction.editReply({ embeds: [new EmbedBuilder().setColor(0x3498DB).setTitle('⭐ Đã Đặt EXP').setDescription(formatPlayerSummary(target.id, guildId))] });
      return;
    }
  }

  if (sub === 'give') {
    const target = interaction.options.getUser('user', true);
    const type = interaction.options.getString('type', true);
    const amount = interaction.options.getInteger('amount', true);
    const id = interaction.options.getString('id')?.trim() ?? '';
    const player = getPlayer(target.id, guildId);
    if (!player) {
      await interaction.editReply({ content: `❌ <@${target.id}> chưa có nhân vật.` });
      return;
    }

    let line = '';
    if (type === 'gold') {
      grantGold(target.id, guildId, amount);
      line = `🪙 +${amount.toLocaleString()} Gold`;
    } else if (type === 'exp') {
      const result = grantExp(target.id, guildId, amount);
      line = `⭐ +${amount.toLocaleString()} EXP${result.leveledUp ? ` → Lv.${result.newLevel}` : ''}`;
    } else if (type === 'pet') {
      if (!id || !PETS[id]) {
        await interaction.editReply({ content: '❌ Cần nhập pet `id` hợp lệ.' });
        return;
      }
      const pet = PETS[id];
      const first = addPet(target.id, guildId, id);
      line = `${pet.icon} **${pet.name}** ${first ? 'đã được thêm' : 'đã có sẵn'}`;
    } else {
      if (!id) {
        await interaction.editReply({ content: '❌ Cần nhập `id` cho item/material/equipment.' });
        return;
      }
      const valid = type === 'item' ? getItem(id)
        : type === 'material' ? getMaterial(id)
        : type === 'equipment' ? getEquipment(id)
        : null;
      if (!valid) {
        await interaction.editReply({ content: `❌ Không tìm thấy ${type} \`${id}\`.` });
        return;
      }
      addItem(target.id, guildId, id, amount);
      const meta = metaFor(id)!;
      line = `${meta.icon} **${meta.name}** \`${id}\` ×${amount}`;
    }

    await interaction.editReply({ embeds: [new EmbedBuilder().setColor(0xF1C40F).setTitle('🎁 Admin Give').addFields(
      { name: 'Người chơi', value: `<@${target.id}>`, inline: true },
      { name: 'Đã thêm', value: line, inline: true },
      { name: 'Tóm tắt', value: formatPlayerSummary(target.id, guildId), inline: false },
    )] });
    return;
  }

  if (sub === 'remove') {
    const target = interaction.options.getUser('user', true);
    const type = interaction.options.getString('type', true);
    const amount = interaction.options.getInteger('amount', true);
    const id = interaction.options.getString('id')?.trim() ?? '';
    const player = getPlayer(target.id, guildId);
    if (!player) {
      await interaction.editReply({ content: `❌ <@${target.id}> chưa có nhân vật.` });
      return;
    }

    let line = '';
    if (type === 'gold') {
      const removed = Math.min(amount, player.gold);
      grantGold(target.id, guildId, -removed);
      line = `🪙 -${removed.toLocaleString()} Gold`;
    } else if (type === 'pet') {
      if (!id || !PETS[id]) {
        await interaction.editReply({ content: '❌ Cần nhập pet `id` hợp lệ.' });
        return;
      }
      const changes = db.prepare('DELETE FROM player_pets WHERE user_id=? AND guild_id=? AND pet_id=?')
        .run(target.id, guildId, id).changes as number;
      const pet = PETS[id];
      line = changes > 0 ? `${pet.icon} Đã gỡ **${pet.name}**` : `Không có pet \`${id}\``;
    } else {
      if (!id) {
        await interaction.editReply({ content: '❌ Cần nhập `id` cần gỡ.' });
        return;
      }
      const valid = type === 'item' ? getItem(id)
        : type === 'material' ? getMaterial(id)
        : type === 'equipment' ? getEquipment(id)
        : null;
      if (!valid) {
        await interaction.editReply({ content: `❌ Không tìm thấy ${type} \`${id}\`.` });
        return;
      }
      const ok = removeItem(target.id, guildId, id, amount);
      const meta = metaFor(id)!;
      line = ok ? `${meta.icon} **${meta.name}** \`${id}\` -${amount}` : `Không đủ \`${id}\` để gỡ.`;
    }

    await interaction.editReply({ embeds: [new EmbedBuilder().setColor(0xED4245).setTitle('🗑️ Admin Remove').addFields(
      { name: 'Người chơi', value: `<@${target.id}>`, inline: true },
      { name: 'Kết quả', value: line, inline: true },
      { name: 'Tóm tắt', value: formatPlayerSummary(target.id, guildId), inline: false },
    )] });
    return;
  }

  if (sub === 'economy') {
    const target = interaction.options.getUser('user', true);
    const action = interaction.options.getString('action', true);
    const amount = interaction.options.getInteger('amount', true);
    const player = getPlayer(target.id, guildId);
    if (!player) {
      await interaction.editReply({ content: `❌ <@${target.id}> chưa có nhân vật.` });
      return;
    }
    if (action === 'add') grantGold(target.id, guildId, amount);
    else if (action === 'remove') grantGold(target.id, guildId, -Math.min(amount, player.gold));
    else db.prepare('UPDATE players SET gold=? WHERE user_id=? AND guild_id=?').run(amount, target.id, guildId);

    const fresh = getPlayer(target.id, guildId)!;
    await interaction.editReply({ embeds: [new EmbedBuilder().setColor(0xF1C40F).setTitle('🪙 Economy Updated').addFields(
      { name: 'Người chơi', value: `<@${target.id}>`, inline: true },
      { name: 'Gold hiện tại', value: fresh.gold.toLocaleString(), inline: true },
    )] });
    return;
  }

  if (sub === 'boss') {
    const action = interaction.options.getString('action', true);
    const zoneId = interaction.options.getString('zone_id', true);
    const zone = ZONES[zoneId];
    if (!zone) {
      await interaction.editReply({ content: `❌ Zone không hợp lệ: \`${zoneId}\`.` });
      return;
    }
    const encounter = getBossEncounter(guildId, zoneId);
    const oak = zoneId === 'forest' ? getOakEvent(guildId) : null;

    if (action === 'status') {
      const lines: string[] = [];
      if (encounter) {
        lines.push(`👑 Generic lobby: ${bossLabel(encounter.bossId)}`);
        lines.push(`Người gọi: <@${encounter.summonerId}>`);
        lines.push(`Đội: ${encounter.participantIds.map(id => `<@${id}>`).join(', ') || '—'} (${encounter.participantIds.length}/${BOSS_MAX_PARTICIPANTS})`);
        lines.push(`Phase: \`${encounter.phase}\` · còn ${formatDuration(getBossEncounterRemaining(encounter))}`);
      } else lines.push('Không có generic boss lobby.');
      if (oak) {
        const participants = getOakParticipants(guildId);
        lines.push('');
        lines.push(`🌳 Ancient Oak event: phase \`${oak.phase}\`, HP ${oak.boss_hp}/${oak.boss_max_hp}`);
        lines.push(`Oak participants: ${participants.length}`);
      }
      await interaction.editReply({ embeds: [new EmbedBuilder().setColor(0x5865F2).setTitle(`📊 Boss Status — ${zone.icon} ${zone.name}`).setDescription(lines.join('\n'))] });
      return;
    }

    if (action === 'clear') {
      clearBossEncounter(guildId, zoneId);
      let oakEvents = 0, oakParticipants = 0;
      if (zoneId === 'forest') {
        const r = resetActiveOakEvent(guildId);
        oakEvents = r.events;
        oakParticipants = r.participants;
      }
      await interaction.editReply({ embeds: [new EmbedBuilder().setColor(0xED4245).setTitle('🧹 Boss Lobby Cleared').addFields(
        { name: 'Zone', value: `${zone.icon} ${zone.name}`, inline: true },
        { name: 'Generic lobby', value: 'Đã clear', inline: true },
        { name: 'Oak event/participants', value: `${oakEvents}/${oakParticipants}`, inline: true },
      )] });
      return;
    }

    if (action === 'summon') {
      const bossId = interaction.options.getString('boss_id')?.trim() || zone.bossId;
      if (!bossId) {
        await interaction.editReply({ content: '❌ Zone này chưa có bossId. Nhập `boss_id` thủ công.' });
        return;
      }
      const boss = getEnemy(bossId);
      if (!boss || !boss.boss) {
        await interaction.editReply({ content: `❌ \`${bossId}\` không tồn tại hoặc không phải boss.` });
        return;
      }
      if (encounter) clearBossEncounter(guildId, zoneId);
      const created = createBossEncounter(guildId, zoneId, bossId, interaction.user.id);
      await interaction.editReply({ embeds: [new EmbedBuilder().setColor(0xED4245).setTitle('👑 Đã Gọi Boss Lobby').setDescription([
        `Zone: ${zone.icon} **${zone.name}**`,
        `Boss: ${bossLabel(bossId)}`,
        `Người gọi: <@${interaction.user.id}>`,
        `Người chơi trong zone này bấm \`/explore\` để tham gia.`,
        `TTL: ${formatDuration(getBossEncounterRemaining(created))}`,
      ].join('\n'))] });
      return;
    }
  }

  if (sub === 'combat') {
    const target = interaction.options.getUser('user', true);
    const action = interaction.options.getString('action', true);
    const player = getPlayer(target.id, guildId);
    if (!player) {
      await interaction.editReply({ content: `❌ <@${target.id}> chưa có nhân vật.` });
      return;
    }
    const combat = getCombatByUser(target.id, guildId);
    if (action === 'status') {
      await interaction.editReply({ embeds: [new EmbedBuilder().setColor(combat ? 0xFEE75C : 0x95A5A6).setTitle('⚔️ Combat Status').setDescription(combat ? [
        `Người chơi: <@${target.id}>`,
        `Enemy: **${combat.enemy_name}** \`${combat.enemy_id}\``,
        `Enemy HP: ${combat.enemy_hp}/${combat.enemy_max_hp}`,
        `Player HP/MP: ${combat.player_hp}/${combat.player_max_hp} · ${combat.player_mp}/${combat.player_max_mp}`,
        `Turn: ${combat.turn}`,
        `Message: \`${combat.message_id}\``,
      ].join('\n') : `Không có active combat cho <@${target.id}>.`)] });
      return;
    }
    const deleted = clearCombatForUser(target.id, guildId);
    await interaction.editReply({ embeds: [new EmbedBuilder().setColor(0xED4245).setTitle('🧹 Combat Cleared').setDescription(`Đã xóa **${deleted}** active combat cho <@${target.id}>.`)] });
    return;
  }

  if (sub === 'progress') {
    const target = interaction.options.getUser('user', true);
    const action = interaction.options.getString('action', true);
    const id = interaction.options.getString('id')?.trim() ?? '';
    const value = interaction.options.getInteger('value');
    const player = getPlayer(target.id, guildId);
    if (!player) {
      await interaction.editReply({ content: `❌ <@${target.id}> chưa có nhân vật.` });
      return;
    }

    let title = '📌 Progress Updated';
    let desc = '';

    if (action === 'unlock_recipe') {
      if (!id || !CRAFT_RECIPES.some(r => r.id === id)) {
        await interaction.editReply({ content: '❌ Cần recipe ID hợp lệ.' });
        return;
      }
      const changed = unlockRecipe(target.id, guildId, id);
      desc = changed ? `Đã mở recipe \`${id}\`.` : `Recipe \`${id}\` đã mở sẵn.`;
    } else if (action === 'lock_recipe') {
      if (!id) {
        await interaction.editReply({ content: '❌ Cần recipe ID.' });
        return;
      }
      const changes = db.prepare('DELETE FROM unlocked_recipes WHERE user_id=? AND guild_id=? AND recipe_id=?')
        .run(target.id, guildId, id).changes as number;
      desc = changes > 0 ? `Đã khóa recipe \`${id}\`.` : `Không có unlock recipe \`${id}\` để xóa.`;
    } else if (action === 'unlock_zone') {
      if (!id || !ZONES[id]) {
        await interaction.editReply({ content: '❌ Cần zone_id hợp lệ.' });
        return;
      }
      const targetIdx = ZONE_ORDER.indexOf(id);
      const cleared: string[] = [];
      for (let i = 0; i < targetIdx; i++) {
        const z = ZONES[ZONE_ORDER[i]];
        if (z?.bossId) {
          markPlayerClearedBoss(guildId, target.id, z.bossId);
          cleared.push(z.bossId);
        }
      }
      const zone = ZONES[id];
      if (player.level < zone.minLevel) {
        db.prepare('UPDATE players SET level=?, exp=0, exp_next=? WHERE user_id=? AND guild_id=?')
          .run(zone.minLevel, expNext(zone.minLevel), target.id, guildId);
        syncDerivedBaseStats(target.id, guildId, true);
      }
      desc = `Đã mở gate đến ${zone.icon} **${zone.name}** bằng cách mark clear boss trước đó: ${cleared.map(b => `\`${b}\``).join(', ') || 'không có'}.`;
    } else if (action === 'set_chapter') {
      const chapter = value ?? Number(id);
      if (!Number.isFinite(chapter) || chapter < 1) {
        await interaction.editReply({ content: '❌ Cần `value` chapter >= 1.' });
        return;
      }
      db.prepare(`
        INSERT INTO chapter_state (user_id, guild_id, current_chapter, updated_at)
        VALUES (?, ?, ?, unixepoch())
        ON CONFLICT(user_id, guild_id) DO UPDATE SET current_chapter=excluded.current_chapter, updated_at=unixepoch()
      `).run(target.id, guildId, chapter);
      desc = `Đã set chapter hiện tại = **${chapter}**.`;
    } else if (action === 'mark_boss') {
      if (!id || !ENEMIES[id]) {
        await interaction.editReply({ content: '❌ Cần boss_id hợp lệ.' });
        return;
      }
      markPlayerClearedBoss(guildId, target.id, id);
      desc = `Đã mark <@${target.id}> clear boss ${bossLabel(id)}.`;
    } else if (action === 'clear_boss') {
      if (!id) {
        await interaction.editReply({ content: '❌ Cần boss_id.' });
        return;
      }
      const changes = clearPlayerBossProgress(guildId, target.id, id);
      desc = `Đã xóa **${changes}** boss clear flag cho \`${id}\`.`;
    }

    await interaction.editReply({ embeds: [new EmbedBuilder().setColor(0x57F287).setTitle(title).setDescription(desc).addFields({ name: 'Người chơi', value: `<@${target.id}>`, inline: true })] });
    return;
  }

  if (sub === 'flag') {
    const action = interaction.options.getString('action', true);
    const key = interaction.options.getString('key', true).trim();
    const value = interaction.options.getString('value') ?? '1';
    const ttl = interaction.options.getInteger('ttl') ?? undefined;

    if (action === 'get') {
      const row = getWorldFlagRow(guildId, key);
      await interaction.editReply({ embeds: [new EmbedBuilder().setColor(row ? 0x5865F2 : 0x95A5A6).setTitle('🏷️ World Flag').addFields(
        { name: 'Key', value: `\`${key}\``, inline: false },
        { name: 'Value', value: row ? `\`${String(row.flag_value).slice(0, 900)}\`` : '*Không tồn tại / đã hết hạn*', inline: false },
        { name: 'Expires', value: row?.expires_at ? `còn ${formatDuration(row.expires_at - nowSec())}` : 'Không hết hạn', inline: true },
      )] });
      return;
    }
    if (action === 'set') {
      setFlag(guildId, key, value, ttl);
      await interaction.editReply({ embeds: [new EmbedBuilder().setColor(0x57F287).setTitle('🏷️ Đã Set Flag').setDescription(`\`${key}\` = \`${value}\`${ttl ? `\nTTL: ${formatDuration(ttl)}` : ''}`)] });
      return;
    }
    deleteFlag(guildId, key);
    await interaction.editReply({ embeds: [new EmbedBuilder().setColor(0xED4245).setTitle('🗑️ Đã Clear Flag').setDescription(`\`${key}\``)] });
    return;
  }

  if (sub === 'event' || sub === 'minigame') {
    const target = interaction.options.getUser('user', true);
    const eventId = interaction.options.getString('event_id', true).trim();
    const player = getPlayer(target.id, guildId);
    if (!player) {
      await interaction.editReply({ content: `❌ <@${target.id}> chưa có nhân vật.` });
      return;
    }
    const def = DATA_DRIVEN_EXPLORE_EVENTS.find(e => e.id === eventId);
    if (sub === 'minigame' && !def?.miniGame) {
      await interaction.editReply({ content: `❌ \`${eventId}\` không phải data-driven mini game. Dùng \`/admin event\` nếu muốn ép event thường/hardcoded.` });
      return;
    }
    setFlag(guildId, `forced_event_${target.id}`, eventId, 600);
    await interaction.editReply({ embeds: [new EmbedBuilder().setColor(0x9B59B6).setTitle(sub === 'minigame' ? '🎮 Đã Ép Mini Game' : '🎲 Đã Ép Event').addFields(
      { name: 'Người chơi', value: `<@${target.id}> (${player.name})`, inline: true },
      { name: 'Event ID', value: `\`${eventId}\``, inline: true },
      { name: 'Data-driven', value: def ? `✅ ${def.title}${def.miniGame ? '\n🎮 Có mini game' : ''}` : '⚠️ Không thấy trong DATA_DRIVEN_EXPLORE_EVENTS, vẫn set flag để handler hardcoded xử lý nếu có.', inline: false },
      { name: 'Hết hạn', value: '10 phút hoặc lần /explore kế tiếp', inline: true },
    )] });
    return;
  }

  if (sub === 'debug') {
    const target = interaction.options.getUser('user', true);
    const type = interaction.options.getString('type', true);
    const player = getPlayer(target.id, guildId);
    if (!player) {
      await interaction.editReply({ content: `❌ <@${target.id}> chưa có nhân vật.` });
      return;
    }

    if (type === 'inventory') {
      await interaction.editReply({ embeds: [new EmbedBuilder().setColor(0x5865F2).setTitle('🎒 Debug Inventory').setDescription(inventoryPreview(target.id, guildId, 35))] });
      return;
    }

    if (type === 'stats') {
      await interaction.editReply({ embeds: [new EmbedBuilder().setColor(0x5865F2).setTitle('📊 Debug Stats').setDescription(formatPlayerSummary(target.id, guildId))] });
      return;
    }

    if (type === 'cooldown') {
      const flags = getAllFlags(guildId).filter(f => f.flag_key.includes(target.id) || f.flag_key.startsWith('boss_lobby_') || f.flag_key.startsWith('event_') || f.flag_key.startsWith('boss_')).slice(0, 35);
      const text = flags.length ? flags.map(f => `• \`${f.flag_key}\` = \`${String(f.flag_value).slice(0, 80)}\`${f.expires_at ? ` · ${formatDuration(f.expires_at - nowSec())}` : ''}`).join('\n') : '*Không có flag liên quan.*';
      await interaction.editReply({ embeds: [new EmbedBuilder().setColor(0xFEE75C).setTitle('⏱️ Debug Cooldown/Flags').setDescription(text)] });
      return;
    }

    if (type === 'buffs') {
      const rows = db.prepare('SELECT buff_key, value, charges, expires_at FROM player_buffs WHERE user_id=? AND guild_id=? ORDER BY created_at DESC')
        .all(target.id, guildId) as Array<{ buff_key: string; value: number; charges: number; expires_at: number | null }>;
      const normal = rows.length ? rows.map(b => `• \`${b.buff_key}\` value ${b.value}, charges ${b.charges}${b.expires_at ? `, còn ${formatDuration(b.expires_at - nowSec())}` : ''}`).join('\n') : '*Không có player_buffs.*';
      const shrine = listActiveShrineBlessings(target.id, guildId);
      await interaction.editReply({ embeds: [new EmbedBuilder().setColor(0x9B59B6).setTitle('✨ Debug Buffs').setDescription(`${normal}\n\n**Shrine Blessings**\n${shrine.length ? shrine.map(id => { const def = SHRINE_BLESSINGS[id as keyof typeof SHRINE_BLESSINGS]; return `• ${def?.icon ?? '✨'} ${def?.name ?? id}`; }).join('\n') : '*Không có*'}`)] });
      return;
    }

    if (type === 'db') {
      const counts = {
        inventory: db.prepare('SELECT COUNT(*) AS c FROM inventory WHERE user_id=? AND guild_id=?').get(target.id, guildId) as { c: number },
        pets: db.prepare('SELECT COUNT(*) AS c FROM player_pets WHERE user_id=? AND guild_id=?').get(target.id, guildId) as { c: number },
        recipes: db.prepare('SELECT COUNT(*) AS c FROM unlocked_recipes WHERE user_id=? AND guild_id=?').get(target.id, guildId) as { c: number },
        achievements: db.prepare('SELECT COUNT(*) AS c FROM player_achievements WHERE user_id=? AND guild_id=?').get(target.id, guildId) as { c: number },
        combats: db.prepare('SELECT COUNT(*) AS c FROM active_combats WHERE user_id=? AND guild_id=?').get(target.id, guildId) as { c: number },
      };
      const pets = getPets(target.id, guildId).slice(0, 10).map(p => `• \`${p.pet_id}\` Lv.${p.level}`).join('\n') || '*Không có pet.*';
      await interaction.editReply({ embeds: [new EmbedBuilder().setColor(0x5865F2).setTitle('🧾 Debug DB Summary').addFields(
        { name: 'Rows', value: `Inventory: ${counts.inventory.c}\nPets: ${counts.pets.c}\nRecipes: ${counts.recipes.c}\nAchievements: ${counts.achievements.c}\nActive combats: ${counts.combats.c}`, inline: true },
        { name: 'Pets', value: pets, inline: true },
      )] });
      return;
    }
  }

  if (sub === 'resettime') {
    const target = interaction.options.getString('target', true);
    let cooldownDeleted = 0;
    let aftermathDeleted = 0;
    let oakEvents = 0;
    let oakParticipants = 0;
    let description = '';

    if (target === 'oak_cooldown' || target === 'oak_all') {
      cooldownDeleted = resetAncientOakCooldown(guildId);
      description += '🌳 Đã mở lại cooldown triệu hồi **Ancient Oak**.\n';
    }
    if (target === 'oak_event' || target === 'oak_all') {
      const result = resetActiveOakEvent(guildId);
      oakEvents = result.events;
      oakParticipants = result.participants;
      description += '⚔️ Đã đóng event Ancient Oak đang mở và xoá danh sách tham gia cũ.\n';
    }
    if (target === 'oak_all') {
      aftermathDeleted = resetAncientOakAftermath(guildId);
      description += '🌲 Đã xoá hiệu ứng hậu quả Ancient Oak cũ nếu còn tồn tại.\n';
    }

    await interaction.editReply({ embeds: [new EmbedBuilder().setColor(0x57F287).setTitle('⏱️ Đã Reset Time').setDescription(description.trim() || 'Không có gì để reset.').addFields(
      { name: 'Cooldown flag xoá', value: `${cooldownDeleted}`, inline: true },
      { name: 'Oak event đóng', value: `${oakEvents}`, inline: true },
      { name: 'Participant xoá', value: `${oakParticipants}`, inline: true },
      { name: 'Aftermath flag xoá', value: `${aftermathDeleted}`, inline: true },
    )] });
    return;
  }

  if (sub === 'resetboss') {
    const target = interaction.options.getUser('user', true);
    const bossId = interaction.options.getString('boss') ?? undefined;
    const cleared = clearPlayerBossProgress(guildId, target.id, bossId);
    const bossLabelText = bossId ?? 'tất cả boss';
    const statusLines = bossId
      ? [`**${bossId}**: ${hasPlayerClearedBoss(guildId, target.id, bossId) ? '✅ đã clear' : '❌ chưa clear'}`]
      : BOSS_IDS.map(b => `**${b.id}**: ${hasPlayerClearedBoss(guildId, target.id, b.id) ? '✅' : '❌'}`);

    await interaction.editReply({ embeds: [new EmbedBuilder().setColor(cleared > 0 ? 0xED4245 : 0x95A5A6).setTitle(cleared > 0 ? '🗑️ Đã Xoá Tiến Trình Boss' : 'ℹ️ Không Có Gì Để Xoá').addFields(
      { name: 'Người chơi', value: `<@${target.id}>`, inline: true },
      { name: 'Boss', value: bossLabelText, inline: true },
      { name: 'Đã xoá', value: `${cleared} bản ghi`, inline: true },
      { name: 'Trạng thái hiện tại', value: statusLines.join('\n') || '—' },
    )] });
    return;
  }

  if (sub === 'check') {
    const target = interaction.options.getUser('user', true);
    const bossId = interaction.options.getString('boss_id', true).trim();
    const player = getPlayer(target.id, guildId);
    const now = nowSec();

    if (!player) {
      await interaction.editReply({ content: `❌ <@${target.id}> chưa có nhân vật.` });
      return;
    }

    const enemy = ENEMIES[bossId];
    const enemyAny = enemy as any;
    const zoneByBoss = Object.values(ZONES).find(z => z.bossId === bossId);
    const enemyZones = Array.isArray(enemyAny?.zones) ? enemyAny.zones as string[] : [];
    const allowedZones = Array.from(new Set([zoneByBoss?.id, ...enemyZones].filter(Boolean) as string[]));
    const allowedZoneText = allowedZones.length > 0 ? allowedZones.map(z => `\`${z}\``).join(', ') : 'chưa khai báo zone';
    const cooldownKey = String(enemyAny?.cooldownFlag ?? `boss_${bossId}_slain`);
    const cooldownFlag = getWorldFlagRow(guildId, cooldownKey);
    const rawCooldownValue = getFlag(guildId, cooldownKey);
    const combat = getCombatByUser(target.id, guildId);
    const alreadyCleared = hasPlayerClearedBoss(guildId, target.id, bossId);
    const level = Number(player.level ?? 1);
    const recommendedLevel = enemy ? getBossRecommendedLevel(enemyAny) : 1;
    const levelScaling = enemy ? getBossLevelScaling(enemyAny, [level]) : null;

    const checks: string[] = [];
    checks.push(okLine(Boolean(enemy), 'Boss ID tồn tại', enemy ? `${enemy.icon} **${enemy.name}**` : `không tìm thấy \`${bossId}\``));
    checks.push(okLine(Boolean(enemyAny?.boss), 'Được đánh dấu boss', enemyAny?.boss ? '`boss: true`' : 'thiếu `boss: true` hoặc đây không phải boss'));
    checks.push(okLine(Boolean(zoneByBoss), 'Có zone boss gate', zoneByBoss ? `${zoneByBoss.icon} ${zoneByBoss.name} → \`${zoneByBoss.id}\`` : 'chưa có `bossId` trong ZONES'));
    checks.push(okLine(allowedZones.length === 0 || allowedZones.includes(player.zone_id), 'Người chơi ở đúng zone', `hiện tại: \`${player.zone_id}\`, yêu cầu: ${allowedZoneText}`));
    checks.push(okLine(Boolean(player.alive), 'Còn sống', player.alive ? `${player.hp}/${player.max_hp} HP` : 'người chơi đang chết'));
    checks.push(okLine(level >= recommendedLevel, 'Level khuyến nghị', `Lv ${level}/${recommendedLevel}`));
    checks.push(okLine(!cooldownFlag, 'Không bị cooldown world boss', cooldownFlag?.expires_at ? `key \`${cooldownKey}\`, còn ${formatDuration(cooldownFlag.expires_at - now)}` : rawCooldownValue ? `key \`${cooldownKey}\` đang tồn tại: ${rawCooldownValue}` : `không có key \`${cooldownKey}\``));
    checks.push(okLine(!combat, 'Không đang combat khác', combat ? `đang combat với \`${combat.enemy_id}\`` : 'không có active combat'));
    checks.push(okLine(!alreadyCleared, 'Chưa clear boss gate cá nhân', alreadyCleared ? `đã có \`boss_cleared_${target.id}_${bossId}\`` : 'chưa clear'));

    if (bossId === 'ancient_oak') {
      const relicCount = getItemQty(target.id, guildId, 'ancient_relic');
      const hasPrep = hasOakPrereq(guildId, target.id);
      const activeOak = getOakEvent(guildId);
      const participants = getOakParticipants(guildId);
      const huntActive = isOakHuntActive(guildId, target.id);
      const huntRemaining = getOakHuntRemaining(guildId, target.id);
      checks.push(okLine(hasPrep, 'Oak route: đã hạ mini boss rừng', hasPrep ? '`oak_prep` đã có' : 'thiếu flag `oak_prep_<userId>`'));
      checks.push(okLine(relicCount >= 3, 'Oak route: Ancient Relic', `${relicCount}/3`));
      checks.push(okLine(!activeOak, 'Oak route: không có event đang mở', activeOak ? `phase: \`${activeOak.phase}\`, HP: ${activeOak.boss_hp}/${activeOak.boss_max_hp}, participants: ${participants.length}` : 'không có event đang mở'));
      if (!hasPrep && huntActive) checks.push(warnLine('Oak route: đang hunt mini boss', `còn ${huntRemaining} lần explore nữa`));
    }

    const hardFails = checks.filter(line => line.startsWith('❌')).length;
    const canTry = Boolean(enemy) && Boolean(enemyAny?.boss) && Boolean(player.alive) && !combat && (allowedZones.length === 0 || allowedZones.includes(player.zone_id)) && !cooldownFlag;

    await interaction.editReply({ embeds: [new EmbedBuilder()
      .setColor(canTry && hardFails === 0 ? 0x57F287 : 0xFEE75C)
      .setTitle(canTry && hardFails === 0 ? '✅ Boss Check: Có Thể Test' : '🔎 Boss Check')
      .setDescription([`Boss ID: \`${bossId}\``, `Người chơi: <@${target.id}> (${player.name})`, '', checks.join('\n')].join('\n'))
      .addFields(
        { name: 'Scale level', value: levelScaling ? `Lv người chơi: **${level}**\nLv đề xuất: **${levelScaling.recommendedLevel}**\nHP x${levelScaling.hpMult.toFixed(2)} · ATK x${levelScaling.atkMult.toFixed(2)} · Reward x${levelScaling.rewardMult.toFixed(2)}` : 'Không tính được vì boss ID chưa tồn tại.', inline: true },
        { name: 'Debug keys thường dùng', value: `\`boss_${bossId}_slain\`\n\`boss_cleared_${target.id}_${bossId}\`\n\`forced_event_${target.id}\``, inline: true },
      )] });
    return;
  }

  await interaction.editReply({ content: '❌ Admin subcommand chưa được xử lý.' });
}
