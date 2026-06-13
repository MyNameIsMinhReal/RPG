import {
  SlashCommandBuilder, ChatInputCommandInteraction,
  EmbedBuilder, ActionRowBuilder,
  StringSelectMenuBuilder, StringSelectMenuOptionBuilder,
  ButtonBuilder, ButtonStyle, ComponentType, StringSelectMenuInteraction
} from 'discord.js';
import {
  getPlayer, getInventory, getSkillPool, getLoadout,
  equipSkill, unequipSkill,
  getItemQty, updatePlayerHpMp, spendGold, grantSoulShards,
  getSkillAttuneCount, incrementSkillAttuneCount, applyPassiveStats
} from '../systems/player';
import { COLORS } from '../utils/embeds';
import { getItem } from '../data/items';
import { getMaterial } from '../data/materials';
import { getSkill, SKILL_TIER_POOLS, type SkillType } from '../data/skills';
import { getEquipment, EQUIPMENT, RARITY_COLORS, RARITY_LABELS, SLOT_ICONS, getZoneEquipment } from '../data/equipment';
import { getWornEquipment, wearEquipment, removeEquipment, getOwnedEquipment, formatWornGear } from '../systems/equipment';
import { getUnlockedTitles, getSelectedTitle, selectTitle } from '../systems/titles';
import { bar } from '../utils/format';
import { useItemOutsideCombat, getActiveBuffLines } from '../systems/consumables';
import { incrementDaily, countsAsPotion } from './daily';

export const data = new SlashCommandBuilder()
  .setName('inventory')
  .setDescription('Quản lý đồ vật, kỹ năng và loadout');

type Tab = 'items' | 'skills' | 'loadout' | 'equip' | 'titles';

const INVENTORY_COLLECTOR_MS = 120_000;

function buildInventoryTabSelect(userId: string, currentTab?: Tab): ActionRowBuilder<StringSelectMenuBuilder> {
  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`inv_tab_${userId}`)
      .setPlaceholder('Chọn mục...')
      .addOptions([
        new StringSelectMenuOptionBuilder().setLabel('📦 Vật phẩm').setDescription('Đồ consumable và materials').setValue('items').setDefault(currentTab === 'items'),
        new StringSelectMenuOptionBuilder().setLabel('🔮 Skill Pool').setDescription('Kỹ năng đã học').setValue('skills').setDefault(currentTab === 'skills'),
        new StringSelectMenuOptionBuilder().setLabel('📌 Loadout').setDescription('Trang bị skill slots chiến đấu').setValue('loadout').setDefault(currentTab === 'loadout'),
        new StringSelectMenuOptionBuilder().setLabel('⚔️ Trang Bị').setDescription('Weapon · Armor · 2x Accessory').setValue('equip').setDefault(currentTab === 'equip'),
        new StringSelectMenuOptionBuilder().setLabel('🏅 Danh Hiệu').setDescription('Title đã mở khoá').setValue('titles').setDefault(currentTab === 'titles'),
      ])
  );
}

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();
  const { id: userId } = interaction.user;
  const guildId = interaction.guildId!;
  const player  = getPlayer(userId, guildId);

  if (!player) {
    await interaction.editReply({ embeds: [new EmbedBuilder().setColor(COLORS.warning).setDescription('Bạn chưa có nhân vật! Dùng `/start`.')]});
    return;
  }

  await renderTab(interaction, userId, guildId, 'items');
}

// ── Render tab ────────────────────────────────────────────────────────────────
async function renderTab(
  interaction: ChatInputCommandInteraction,
  userId: string, guildId: string, currentTab: Tab
): Promise<void> {
  const player    = getPlayer(userId, guildId)!;
  const inventory = getInventory(userId, guildId);
  const pool      = getSkillPool(userId, guildId);
  const loadout   = getLoadout(userId, guildId);

  const tabSelect = buildInventoryTabSelect(userId, currentTab);

  let embed: EmbedBuilder;
  let actionRows: ActionRowBuilder<any>[] = [];

  switch (currentTab) {
    case 'items':   [embed, actionRows] = buildItemsTab(player, inventory, userId);   break;
    case 'skills':  [embed, actionRows] = buildSkillsTab(player, pool, loadout);       break;
    case 'loadout': [embed, actionRows] = buildLoadoutTab(player, pool, loadout, userId, guildId); break;
    case 'equip':   [embed, actionRows] = buildEquipTab(player, userId, guildId);      break;
    case 'titles':  [embed, actionRows] = buildTitlesTab(player, userId, guildId);     break;
  }

  const allRows = [tabSelect, ...actionRows].slice(0, 5);
  const reply   = await interaction.editReply({ embeds: [embed!], components: allRows });

  // ── Collector ────────────────────────────────────────────────────
  const collector = reply.createMessageComponentCollector({
    filter: i => i.user.id === userId,
    time: INVENTORY_COLLECTOR_MS
  });

  collector.on('collect', async (compInt) => {
    const deferred = await compInt.deferUpdate().then(() => true).catch(err => {
      console.warn('[INVENTORY] deferUpdate failed:', err?.code ?? err);
      return false;
    });
    if (!deferred) return;
    collector.stop('action');
    const cid = (compInt as any).customId as string;

    // Tab switch
    if (cid === `inv_tab_${userId}`) {
      const tab = (compInt as StringSelectMenuInteraction).values[0] as Tab;
      await renderTab(interaction, userId, guildId, tab);
      return;
    }

    // ── Items tab actions ──────────────────────────────────────────
    if (cid === `inv_use_${userId}`) {
      const sel    = compInt as StringSelectMenuInteraction;
      const itemId = sel.values[0].replace('use_', '');
      await handleUseItem(interaction, userId, guildId, itemId);
      return;
    }

    // ── Loadout tab actions ────────────────────────────────────────
    if (cid === `inv_equip_pick_${userId}`) {
      // Pick which skill to equip
      const sel     = compInt as StringSelectMenuInteraction;
      const skillId = sel.values[0].replace('equip_', '');
      await pickSlotForSkill(interaction, userId, guildId, skillId, loadout);
      return;
    }

    if (cid.startsWith(`inv_setslot_${userId}_`)) {
      // Backward-compatible slot picker. New flow uses inv_slot_pick_* below.
      const skillId = cid.replace(`inv_setslot_${userId}_`, '');
      const slot = Number((compInt as StringSelectMenuInteraction).values[0].replace('slot_', ''));
      const equipped = await payAndEquipSkill(interaction, userId, guildId, slot, skillId);
      if (equipped) await renderTab(interaction, userId, guildId, 'loadout');
      return;
    }

    if (cid.startsWith(`inv_unequip_${userId}_`)) {
      const slot = parseInt(cid.replace(`inv_unequip_${userId}_`, ''));
      unequipSkill(userId, guildId, slot);
      await renderTab(interaction, userId, guildId, 'loadout');
      return;
    }

    // ── Equip tab actions ─────────────────────────────────────────
    if (cid === `inv_wear_${userId}`) {
      const sel    = compInt as StringSelectMenuInteraction;
      const equipId = sel.values[0].replace('wear_', '');
      const def    = getEquipment(equipId);
      if (def) {
        const playerBefore = getPlayer(userId, guildId)!;
        const maxBefore = applyPassiveStats(playerBefore).max_hp;
        wearEquipment(userId, guildId, equipId);
        const playerAfter = getPlayer(userId, guildId)!;
        const maxAfter = applyPassiveStats(playerAfter).max_hp;
        if (maxAfter !== maxBefore) {
          const newHp = Math.min(maxAfter, Math.max(1, playerAfter.hp + (maxAfter - maxBefore)));
          updatePlayerHpMp(userId, guildId, newHp, playerAfter.mp);
        }
        await renderTab(interaction, userId, guildId, 'equip');
      }
      return;
    }

    if (cid.startsWith(`inv_unequip_gear_${userId}_`)) {
      const slot = cid.replace(`inv_unequip_gear_${userId}_`, '') as import('../data/equipment').EquipSlot;
      const playerBefore = getPlayer(userId, guildId)!;
      const maxBefore = applyPassiveStats(playerBefore).max_hp;
      removeEquipment(userId, guildId, slot);
      const playerAfter = getPlayer(userId, guildId)!;
      const maxAfter = applyPassiveStats(playerAfter).max_hp;
      if (maxAfter < maxBefore && playerAfter.hp > maxAfter) {
        updatePlayerHpMp(userId, guildId, maxAfter, playerAfter.mp);
      }
      await renderTab(interaction, userId, guildId, 'equip');
      return;
    }

    // ── Titles tab actions ─────────────────────────────────────────
    if (cid === `inv_title_${userId}`) {
      const sel     = compInt as StringSelectMenuInteraction;
      const titleId = sel.values[0];
      if (titleId === 'none') selectTitle(userId, guildId, null);
      else selectTitle(userId, guildId, titleId);
      await renderTab(interaction, userId, guildId, 'titles');
      return;
    }
  });

  collector.on('end', (_c, reason) => {
    if (reason === 'time') interaction.editReply({ components: [] }).catch(() => {});
  });
}


function safeFieldValue(value: string, limit = 1024): string {
  if (!value) return '*Trống*';
  return value.length > limit ? value.slice(0, limit - 20) + '\n… *(còn nữa)*' : value;
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}

function invDef(id: string) {
  return getItem(id) ?? getMaterial(id);
}

function getSkillBaseGoldCost(skillId: string): number {
  if (SKILL_TIER_POOLS.t1.includes(skillId)) return 100;
  if (SKILL_TIER_POOLS.t2.includes(skillId)) return 300;
  if (SKILL_TIER_POOLS.t3.includes(skillId)) return 800;
  return 300;
}

function getSkillAttuneGoldCost(skillId: string, attuneCount: number): number {
  if (attuneCount === 0) return 0;
  return getSkillBaseGoldCost(skillId) * Math.min(attuneCount, 3);
}

function getSkillAttuneSoulCost(attuneCount: number): number {
  return attuneCount === 0 ? 0 : 1;
}

function getSkillAttuneTierLabel(skillId: string): string {
  if (SKILL_TIER_POOLS.t1.includes(skillId)) return 'T1';
  if (SKILL_TIER_POOLS.t2.includes(skillId)) return 'T2';
  if (SKILL_TIER_POOLS.t3.includes(skillId)) return 'T3';
  return 'Special';
}

function getSkillAttuneCostLine(skillId: string, attuneCount: number): string {
  if (attuneCount === 0) return '**FREE** (lần đầu)';
  const gold = getSkillAttuneGoldCost(skillId, attuneCount);
  const mult = Math.min(attuneCount, 3);
  return `${gold} Gold + 1 Soul Shard${mult > 1 ? ` (x${mult})` : ''}`;
}

async function payAndEquipSkill(
  interaction: ChatInputCommandInteraction,
  userId: string,
  guildId: string,
  slot: number,
  skillId: string
): Promise<boolean> {
  const sk = getSkill(skillId);
  const player = getPlayer(userId, guildId);

  if (!sk || !player || !Number.isFinite(slot) || slot <= 0) {
    await renderTab(interaction, userId, guildId, 'loadout');
    return false;
  }

  const attuneCount = getSkillAttuneCount(userId, guildId, skillId);
  const goldCost    = getSkillAttuneGoldCost(skillId, attuneCount);
  const soulCost    = getSkillAttuneSoulCost(attuneCount);

  if (player.gold < goldCost || player.soul_shards < soulCost) {
    const missing: string[] = [];
    if (player.gold < goldCost) missing.push(`thiếu **${goldCost - player.gold} Gold**`);
    if (player.soul_shards < soulCost) missing.push(`thiếu **${soulCost - player.soul_shards} Soul Shard**`);

    await interaction.editReply({
      embeds: [new EmbedBuilder()
        .setColor(COLORS.warning)
        .setTitle('🔒 Không đủ tài nguyên để gắn skill')
        .setDescription(
          `${sk.icon} **${sk.name}** cần **${getSkillAttuneCostLine(skillId, attuneCount)}** để gắn vào loadout.\n` +
          `Hiện tại bạn có: 🪙 **${player.gold} Gold** · 💎 **${player.soul_shards} Soul Shards**\n\n` +
          `Bạn đang ${missing.join(' và ')}.`
        )],
      components: []
    });
    setTimeout(() => {
      renderTab(interaction, userId, guildId, 'loadout').catch(err => {
        console.error('[INVENTORY] delayed render loadout after attune fail failed:', err);
      });
    }, 8000);
    return false;
  }

  if (goldCost > 0 && !spendGold(userId, guildId, goldCost)) {
    await renderTab(interaction, userId, guildId, 'loadout');
    return false;
  }

  if (soulCost > 0) grantSoulShards(userId, guildId, -soulCost);
  incrementSkillAttuneCount(userId, guildId, skillId);
  equipSkill(userId, guildId, slot, skillId);
  return true;
}

// ── Tab: Items ────────────────────────────────────────────────────────────────
function buildItemsTab(
  player: any, inventory: any[], userId: string
): [EmbedBuilder, ActionRowBuilder<any>[]] {
  const consumables = inventory.filter(e => getItem(e.item_id)?.type === 'consumable');
  const materials   = inventory.filter(e => getItem(e.item_id)?.type === 'material' || getMaterial(e.item_id));
  const keyItems    = inventory.filter(e => getItem(e.item_id)?.type === 'key_item');

  const embed = new EmbedBuilder()
    .setColor(COLORS.info)
    .setTitle('📦 Vật Phẩm')
    .setDescription(`🪙 Gold: **${player.gold}**  ·  💀 Soul Shards: **${player.soul_shards}**`);

  if (consumables.length) {
    embed.addFields({
      name: '🧪 Consumables',
      value: safeFieldValue(consumables.map(e => {
        const it = getItem(e.item_id)!;
        return `${it.icon} **${it.name}** ×${e.quantity}  — *${it.description.replace(/\*\*/g,'').slice(0,40)}*`;
      }).join('\n')),
      inline: false
    });
  }
  if (materials.length) {
    embed.addFields({
      name: '⚗️ Materials',
      value: safeFieldValue(materials.map(e => {
        const it = invDef(e.item_id)!;
        return `${it.icon} **${it.name}** ×${e.quantity}`;
      }).join('  ·  ')),
      inline: false
    });
  }
  if (keyItems.length) {
    embed.addFields({
      name: '🔑 Key Items',
      value: safeFieldValue(keyItems.map(e => { const it = getItem(e.item_id)!; return `${it.icon} **${it.name}**`; }).join('  ·  ')),
      inline: false
    });
  }
  if (!consumables.length && !materials.length && !keyItems.length) {
    embed.setDescription(`🪙 Gold: **${player.gold}**\n\n*Túi đồ trống. Khám phá để tìm đồ, cổ thư hoặc gặp lái buôn!*`);
  }

  const rows: ActionRowBuilder<any>[] = [];

  // Use item select
  if (consumables.length) {
    const options = consumables.map(e => {
      const it = getItem(e.item_id)!;
      return new StringSelectMenuOptionBuilder()
        .setLabel(`${it.name} ×${e.quantity}`)
        .setDescription(it.description.replace(/\*\*/g,'').slice(0,50))
        .setValue(`use_${e.item_id}`)
        .setEmoji(it.icon);
    });
    rows.push(new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`inv_use_${userId}`)
        .setPlaceholder('🧪 Dùng vật phẩm...')
        .addOptions(options.slice(0, 25))
    ));
  }

  return [embed, rows];
}

// ── Tab: Skill Pool ───────────────────────────────────────────────────────────
function buildSkillsTab(
  player: any, pool: any[], loadout: any[]
): [EmbedBuilder, ActionRowBuilder<any>[]] {
  const typeOrder: SkillType[] = ['active', 'passive', 'reaction', 'world'];
  const typeLabels: Record<SkillType, string> = {
    active: '⚔️ Active', passive: '✨ Passive', reaction: '⚡ Reaction', world: '🌍 World'
  };

  const embed = new EmbedBuilder()
    .setColor(COLORS.magic)
    .setTitle('🔮 Skill Pool')
    .setDescription(`**${player.name}** đã học **${pool.length}** / 15 kỹ năng.\n*Kỹ năng trong pool không mất khi chết. Gắn lại vào loadout tốn Gold theo tier + 1 Soul Shard.*`);

  if (!pool.length) {
    embed.setDescription('Chưa học kỹ năng nào!\nHãy kiếm 📖 Ancient Book rồi nghiên cứu tại Hội Quán trong làng.');
    return [embed, []];
  }

  for (const type of typeOrder) {
    const skills = pool.map(p => getSkill(p.skill_id)).filter(sk => sk?.type === type);
    if (!skills.length) continue;

    embed.addFields({
      name: typeLabels[type],
      value: safeFieldValue(skills.map(sk => {
        if (!sk) return '';
        const equipped = loadout.find(l => l.skill_id === sk.id);
        const equippedTag = equipped ? ` *(Slot ${equipped.slot})*` : '';
        const mpTag = sk.mpCost ? ` · ${sk.mpCost}MP` : '';
        return `${sk.icon} **${sk.name}**${equippedTag}${mpTag}\n> ${sk.description}`;
      }).join('\n')),
      inline: false
    });
  }

  return [embed, []];
}

// ── Tab: Loadout ───────────────────────────────────────────────────────────────
function buildLoadoutTab(
  player: any, pool: any[], loadout: any[], userId: string, guildId: string
): [EmbedBuilder, ActionRowBuilder<any>[]] {
  const maxSlots = 4 + Math.min(2, player.extra_skill_slots ?? 0);
  const slotLines = Array.from({ length: maxSlots }, (_, i) => i + 1).map(slot => {
    const entry = loadout.find(l => l.slot === slot);
    if (!entry) return `\`Slot ${slot}\` — *Trống*`;
    const sk = getSkill(entry.skill_id);
    const typeTag = sk ? { active:'⚔️', passive:'✨', reaction:'⚡', world:'🌍' }[sk.type] : '';
    const mpTag   = sk?.mpCost ? ` · ${sk.mpCost}MP` : '';
    return `\`Slot ${slot}\` ${sk?.icon ?? '?'} **${sk?.name ?? entry.skill_id}** ${typeTag}${mpTag}`;
  });

  const embed = new EmbedBuilder()
    .setColor(COLORS.magic)
    .setTitle('📌 Loadout')
    .setDescription(
      `*Tối đa ${maxSlots} slots. Loadout mất khi chết — pool giữ lại.*\n` +
      `Gắn skill từ Pool tốn **Gold theo tier + 1 Soul Shard**.\n` +
      `🪙 Gold: **${player.gold}** · 💎 Soul Shards: **${player.soul_shards}**\n\n` +
      slotLines.join('\n')
    );

  const rows: ActionRowBuilder<any>[] = [];

  // Equip: pick skill from pool
  const equippedIds = new Set(loadout.map(l => l.skill_id));
  const equipable   = pool.filter(p => {
    const sk = getSkill(p.skill_id);
    return sk && !equippedIds.has(p.skill_id);
  });

  if (equipable.length && loadout.length < maxSlots) {
    const opts = equipable.map(p => {
      const sk = getSkill(p.skill_id)!;
      const cnt = getSkillAttuneCount(userId, guildId, sk.id);
      const costLabel = cnt === 0 ? 'FREE' : `${getSkillAttuneGoldCost(sk.id, cnt)}G + 1 Soul`;
      return new StringSelectMenuOptionBuilder()
        .setLabel(`${sk.name} [${getSkillAttuneTierLabel(sk.id)}]`)
        .setDescription(`${costLabel} · ${sk.description.replace(/\*\*/g,'').slice(0,60)}`.slice(0, 100))
        .setValue(`equip_${sk.id}`)
        .setEmoji(sk.icon);
    });
    rows.push(new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`inv_equip_pick_${userId}`)
        .setPlaceholder('📎 Equip kỹ năng...')
        .addOptions(opts.slice(0, 25))
    ));
  }

  // Unequip buttons for occupied slots
  if (loadout.length) {
    const unequipBtns = loadout.map(entry => {
      const sk = getSkill(entry.skill_id);
      return new ButtonBuilder()
        .setCustomId(`inv_unequip_${userId}_${entry.slot}`)
        .setLabel(`Gỡ Slot ${entry.slot}`)
        .setEmoji(sk?.icon ?? '❌')
        .setStyle(ButtonStyle.Secondary);
    });
    for (const group of chunkArray(unequipBtns, 5)) {
      rows.push(new ActionRowBuilder<ButtonBuilder>().addComponents(...group));
    }
  }

  return [embed, rows];
}


// ── Action: Use item ──────────────────────────────────────────────────────────
async function handleUseItem(
  interaction: ChatInputCommandInteraction,
  userId: string, guildId: string, itemId: string
): Promise<void> {
  const item = getItem(itemId);
  if (!item) { await renderTab(interaction, userId, guildId, 'items'); return; }

  const beforeQty = getItemQty(userId, guildId, itemId);
  const result = useItemOutsideCombat(userId, guildId, itemId);
  if (result.consumed && countsAsPotion(itemId)) incrementDaily(userId, guildId, 'potion_used');
  const afterQty = getItemQty(userId, guildId, itemId);

  const inv     = getInventory(userId, guildId);
  const fresh   = getPlayer(userId, guildId)!;
  const [embed] = buildItemsTab(fresh, inv, userId);

  embed.spliceFields(0, embed.data.fields?.length ?? 0);
  embed.setColor(result.ok ? COLORS.success : COLORS.warning);
  embed.setTitle(result.title);
  embed.setDescription(
    `${result.lines.join('\n') || '*Không có hiệu ứng*'}\n\n` +
    `🪙 Vàng: **${fresh.gold}** · Còn lại: **${afterQty}**/${beforeQty} ${item.icon} ${item.name}\n` +
    `*Kết quả sẽ ở lại màn hình này. Bấm **Quay lại túi đồ** khi xem xong.*`
  );

  const tabSelect = buildInventoryTabSelect(userId, 'items');
  const backRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`inv_back_items_${userId}`)
      .setLabel('Quay lại túi đồ')
      .setEmoji('↩️')
      .setStyle(ButtonStyle.Secondary)
  );

  const reply = await interaction.editReply({ embeds: [embed], components: [tabSelect, backRow] });

  const collector = reply.createMessageComponentCollector({
    filter: i => i.user.id === userId,
    time: INVENTORY_COLLECTOR_MS
  });

  collector.on('collect', async (compInt) => {
    const deferred = await compInt.deferUpdate().then(() => true).catch(err => {
      console.warn('[INVENTORY] result deferUpdate failed:', err?.code ?? err);
      return false;
    });
    if (!deferred) return;
    collector.stop('action');

    const cid = (compInt as any).customId as string;
    if (cid === `inv_tab_${userId}`) {
      const tab = (compInt as StringSelectMenuInteraction).values[0] as Tab;
      await renderTab(interaction, userId, guildId, tab);
      return;
    }

    if (cid === `inv_back_items_${userId}`) {
      await renderTab(interaction, userId, guildId, 'items');
      return;
    }
  });

  collector.on('end', (_c, reason) => {
    if (reason === 'time') interaction.editReply({ components: [] }).catch(() => {});
  });
}

// ── Action: Pick slot for equip ────────────────────────────────────────────────
async function pickSlotForSkill(
  interaction: ChatInputCommandInteraction,
  userId: string, guildId: string, skillId: string, loadout: any[]
): Promise<void> {
  const sk = getSkill(skillId);
  if (!sk) {
    console.warn(`[INVENTORY] Missing skill: ${skillId}`);
    await renderTab(interaction, userId, guildId, 'loadout');
    return;
  }
  const player = getPlayer(userId, guildId)!;
  const maxSlots = 4 + Math.min(2, player.extra_skill_slots ?? 0);
  const freeSlots = Array.from({ length: maxSlots }, (_, i) => i + 1).filter(s => !loadout.find(l => l.slot === s));

  if (!freeSlots.length) {
    await renderTab(interaction, userId, guildId, 'loadout');
    return;
  }

  if (freeSlots.length === 1) {
    const equipped = await payAndEquipSkill(interaction, userId, guildId, freeSlots[0], skillId);
    if (equipped) await renderTab(interaction, userId, guildId, 'loadout');
    return;
  }

  const opts = freeSlots.map(slot =>
    new StringSelectMenuOptionBuilder().setLabel(`Slot ${slot}`).setValue(`slot_${slot}`)
  );

  const attuneCount = getSkillAttuneCount(userId, guildId, skillId);
  const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`inv_slot_pick_${userId}_${skillId}`)
      .setPlaceholder(`Chọn slot cho ${sk.name} (${getSkillAttuneCostLine(skillId, attuneCount)})...`)
      .addOptions(opts)
  );

  const reply = await interaction.editReply({
    embeds: [new EmbedBuilder().setColor(COLORS.magic).setDescription(`${sk.icon} **${sk.name}** → chọn slot:\n💸 Phí gắn: **${getSkillAttuneCostLine(skillId, attuneCount)}**`)],
    components: [row]
  });

  const sel = await reply.awaitMessageComponent({
    componentType: ComponentType.StringSelect,
    filter: i => i.user.id === userId,
    time: 20_000
  }).catch(() => null);

  if (!sel) { await renderTab(interaction, userId, guildId, 'loadout'); return; }
  const ok = await sel.deferUpdate().then(() => true).catch(() => false);
  if (!ok) return;

  const slot = Number(sel.values[0].replace('slot_', ''));
  const equipped = await payAndEquipSkill(interaction, userId, guildId, slot, skillId);
  if (equipped) await renderTab(interaction, userId, guildId, 'loadout');
}


// ── Tab: Equipment ────────────────────────────────────────────────────────
function buildEquipTab(
  player: any, userId: string, guildId: string
): [EmbedBuilder, ActionRowBuilder<any>[]] {
  const worn  = getWornEquipment(userId, guildId);
  const owned = getOwnedEquipment(userId, guildId);
  const { getEquipmentStats: ges, getEquipmentStats } = require('../systems/equipment');
  const fullStats = getEquipmentStats(userId, guildId);

  const embed = new EmbedBuilder()
    .setColor(0xE67E22)
    .setTitle('⚔️ Trang Bị  (4 Slots)')
    .setDescription('*Weapon · Armor · Accessory 1 · Accessory 2*')
    .addFields({
      name: '🎽 Đang mặc',
      value: formatWornGear(userId, guildId) || '*Chưa trang bị gì*',
      inline: false
    });

  // Full stat summary
  const statLines = [
    fullStats.atk         ? `⚔️ +${fullStats.atk} ATK`            : '',
    fullStats.def         ? `🛡️ +${fullStats.def} DEF`            : '',
    fullStats.maxHp       ? `❤️ +${fullStats.maxHp} HP`           : '',
    fullStats.maxMp       ? `💧 +${fullStats.maxMp} MP`           : '',
    fullStats.critChance  ? `🎯 +${fullStats.critChance}% Crit`   : '',
    fullStats.dodgeChance ? `💨 +${fullStats.dodgeChance}% Dodge` : '',
    fullStats.lifesteal   ? `🩸 +${fullStats.lifesteal}% Lifesteal` : '',
    fullStats.expBonus    ? `⭐ +${fullStats.expBonus}% EXP`      : '',
    fullStats.goldBonus   ? `🪙 +${fullStats.goldBonus}% Gold`    : '',
    fullStats.dropBonus   ? `📦 +${fullStats.dropBonus}% Drop`    : '',
  ].filter(Boolean);

  if (statLines.length) {
    embed.addFields({ name: '📊 Tổng bonus', value: statLines.join('  ·  '), inline: false });
  }

  // Active effects
  if (fullStats.effects?.length) {
    embed.addFields({ name: '✨ Effects đang hoạt động', value: fullStats.effects.join(', '), inline: false });
  }

  const rows: ActionRowBuilder<any>[] = [];

  // Equipment to wear (owned and not currently worn)
  const wornIds = new Set(worn.map(w => w.equipment_id));
  const equipable = owned.filter(e => !wornIds.has(e.id));

  if (equipable.length) {
    const opts = equipable.map(e => {
      const statsStr = Object.entries(e.stats).map(([k, v]) => `+${v} ${k}`).join(', ');
      return new StringSelectMenuOptionBuilder()
        .setLabel(`${e.name} (${RARITY_LABELS[e.rarity]})`)
        .setDescription(`${SLOT_ICONS[e.slot]} ${e.slot} · ${statsStr}`)
        .setValue(`wear_${e.id}`)
        .setEmoji(e.icon);
    });
    rows.push(new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`inv_wear_${userId}`)
        .setPlaceholder('⚔️ Trang bị gear...')
        .addOptions(opts.slice(0, 25))
    ));
  }

  // Unequip buttons per occupied slot
  if (worn.length) {
    const btns = worn.map(w => {
      const def = EQUIPMENT[w.equipment_id];
      return new ButtonBuilder()
        .setCustomId(`inv_unequip_gear_${userId}_${w.slot}`)
        .setLabel(`Gỡ ${w.slot}`)
        .setEmoji(def?.icon ?? '❌')
        .setStyle(ButtonStyle.Secondary);
    });
    for (const group of chunkArray(btns, 5)) {
      rows.push(new ActionRowBuilder<ButtonBuilder>().addComponents(...group));
    }
  }

  if (!owned.length) {
    embed.addFields({ name: '📦 Kho Gear', value: '*Chưa có gear nào. Tìm thấy khi chiến đấu hoặc mua ở shop!*', inline: false });
  }

  return [embed, rows];
}

// ── Tab: Titles ───────────────────────────────────────────────────────────
function buildTitlesTab(
  player: any, userId: string, guildId: string
): [EmbedBuilder, ActionRowBuilder<any>[]] {
  const unlocked = getUnlockedTitles(userId, guildId);
  const current  = getSelectedTitle(userId, guildId);

  const embed = new EmbedBuilder()
    .setColor(COLORS.gold)
    .setTitle('🏅 Danh Hiệu')
    .setDescription(
      `Danh hiệu hiện tại: ${current ? `**${current.icon} ${current.name}**` : '*Không có*'}\n\n` +
      `Đã mở khoá **${unlocked.length}** danh hiệu.`
    );

  if (unlocked.length) {
    embed.addFields({
      name: '✅ Đã mở khoá',
      value: safeFieldValue(unlocked.map(t => `${t.icon} **${t.name}** — *${t.description}*`).join('\n')),
      inline: false
    });
  } else {
    embed.addFields({ name: '🔒 Chưa có', value: '*Hoàn thành Achievement để mở khoá danh hiệu!*', inline: false });
  }

  const rows: ActionRowBuilder<any>[] = [];
  if (unlocked.length) {
    const opts = [
      new StringSelectMenuOptionBuilder().setLabel('Không đeo danh hiệu').setValue('none').setDefault(!current),
      ...unlocked.map(t =>
        new StringSelectMenuOptionBuilder()
          .setLabel(t.name).setDescription(t.description).setValue(t.id)
          .setEmoji(t.icon).setDefault(current?.id === t.id)
      )
    ];
    rows.push(new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`inv_title_${userId}`)
        .setPlaceholder('🏅 Chọn danh hiệu hiển thị...')
        .addOptions(opts.slice(0, 25))
    ));
  }

  return [embed, rows];
}

// Text-prefix aliases (auto-loaded by registry.ts)
export const aliases = ['i','inv','bag','items'];
