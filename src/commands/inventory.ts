import {
  SlashCommandBuilder, ChatInputCommandInteraction,
  EmbedBuilder, ActionRowBuilder,
  StringSelectMenuBuilder, StringSelectMenuOptionBuilder,
  ButtonBuilder, ButtonStyle, ComponentType, StringSelectMenuInteraction
} from 'discord.js';
import {
  getPlayer, getInventory, getSkillPool, getLoadout,
  equipSkill, unequipSkill, addSkillToPool, hasSkillInPool,
  removeItem, getItemQty, updatePlayerHpMp
} from '../systems/player';
import { awardAchievements } from '../systems/achievements';
import { COLORS } from '../utils/embeds';
import { getItem } from '../data/items';
import { getSkill, SKILLS, type SkillType } from '../data/skills';
import { getEquipment, EQUIPMENT, RARITY_COLORS, RARITY_LABELS, SLOT_ICONS, getZoneEquipment } from '../data/equipment';
import { getWornEquipment, wearEquipment, removeEquipment, getOwnedEquipment, formatWornGear } from '../systems/equipment';
import { getUnlockedTitles, getSelectedTitle, selectTitle } from '../systems/titles';
import { bar } from '../utils/format';

export const data = new SlashCommandBuilder()
  .setName('inventory')
  .setDescription('Quản lý đồ vật, kỹ năng và loadout');

type Tab = 'items' | 'skills' | 'loadout' | 'books' | 'equip' | 'titles';

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

  const tabSelect = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`inv_tab_${userId}`)
      .setPlaceholder('Chọn mục...')
      .addOptions([
        new StringSelectMenuOptionBuilder().setLabel('📦 Vật phẩm').setDescription('Đồ consumable và materials').setValue('items').setDefault(currentTab === 'items'),
        new StringSelectMenuOptionBuilder().setLabel('🔮 Skill Pool').setDescription('Kỹ năng đã học').setValue('skills').setDefault(currentTab === 'skills'),
        new StringSelectMenuOptionBuilder().setLabel('📌 Loadout').setDescription('Trang bị 4 slots chiến đấu').setValue('loadout').setDefault(currentTab === 'loadout'),
        new StringSelectMenuOptionBuilder().setLabel('📚 Skill Books').setDescription('Học kỹ năng mới').setValue('books').setDefault(currentTab === 'books'),
        new StringSelectMenuOptionBuilder().setLabel('⚔️ Trang Bị').setDescription('Weapon · Armor · 2x Accessory').setValue('equip').setDefault(currentTab === 'equip'),
        new StringSelectMenuOptionBuilder().setLabel('🏅 Danh Hiệu').setDescription('Title đã mở khoá').setValue('titles').setDefault(currentTab === 'titles'),
      ])
  );

  let embed: EmbedBuilder;
  let actionRows: ActionRowBuilder<any>[] = [];

  switch (currentTab) {
    case 'items':   [embed, actionRows] = buildItemsTab(player, inventory, userId);   break;
    case 'skills':  [embed, actionRows] = buildSkillsTab(player, pool, loadout);       break;
    case 'loadout': [embed, actionRows] = buildLoadoutTab(player, pool, loadout, userId); break;
    case 'books':   [embed, actionRows] = buildBooksTab(player, inventory, userId);   break;
    case 'equip':   [embed, actionRows] = buildEquipTab(player, userId, guildId);      break;
    case 'titles':  [embed, actionRows] = buildTitlesTab(player, userId, guildId);     break;
  }

  const allRows = [tabSelect, ...actionRows].slice(0, 5);
  const reply   = await interaction.editReply({ embeds: [embed!], components: allRows });

  // ── Collector ────────────────────────────────────────────────────
  const collector = reply.createMessageComponentCollector({
    filter: i => i.user.id === userId,
    time: 120_000
  });

  collector.on('collect', async (compInt) => {
    await compInt.deferUpdate();
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
      // Set slot for skill
      const parts   = cid.split('_');
      const slot    = parseInt(parts[parts.length - 1]);
      const skillId = (compInt as StringSelectMenuInteraction).values[0].replace('skill_', '');
      equipSkill(userId, guildId, slot, skillId);
      await renderTab(interaction, userId, guildId, 'loadout');
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
        wearEquipment(userId, guildId, equipId);
        await renderTab(interaction, userId, guildId, 'equip');
      }
      return;
    }

    if (cid.startsWith(`inv_unequip_gear_${userId}_`)) {
      const slot = cid.replace(`inv_unequip_gear_${userId}_`, '') as import('../data/equipment').EquipSlot;
      removeEquipment(userId, guildId, slot);
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

    // ── Books tab actions ──────────────────────────────────────────
    if (cid === `inv_learn_${userId}`) {
      const sel    = compInt as StringSelectMenuInteraction;
      const bookId = sel.values[0].replace('learn_', '');
      await handleLearnSkill(interaction, userId, guildId, bookId);
      return;
    }
  });

  collector.on('end', (_c, reason) => {
    if (reason === 'time') interaction.editReply({ components: [] }).catch(() => {});
  });
}

// ── Tab: Items ────────────────────────────────────────────────────────────────
function buildItemsTab(
  player: any, inventory: any[], userId: string
): [EmbedBuilder, ActionRowBuilder<any>[]] {
  const consumables = inventory.filter(e => getItem(e.item_id)?.type === 'consumable');
  const materials   = inventory.filter(e => getItem(e.item_id)?.type === 'material');
  const keyItems    = inventory.filter(e => getItem(e.item_id)?.type === 'key_item');

  const embed = new EmbedBuilder()
    .setColor(COLORS.info)
    .setTitle('📦 Vật Phẩm')
    .setDescription(`🪙 Gold: **${player.gold}**  ·  💀 Soul Shards: **${player.soul_shards}**`);

  if (consumables.length) {
    embed.addFields({
      name: '🧪 Consumables',
      value: consumables.map(e => {
        const it = getItem(e.item_id)!;
        return `${it.icon} **${it.name}** ×${e.quantity}  — *${it.description.replace(/\*\*/g,'').slice(0,40)}*`;
      }).join('\n'),
      inline: false
    });
  }
  if (materials.length) {
    embed.addFields({
      name: '⚗️ Materials',
      value: materials.map(e => {
        const it = getItem(e.item_id)!;
        return `${it.icon} **${it.name}** ×${e.quantity}`;
      }).join('  ·  '),
      inline: false
    });
  }
  if (keyItems.length) {
    embed.addFields({
      name: '🔑 Key Items',
      value: keyItems.map(e => { const it = getItem(e.item_id)!; return `${it.icon} **${it.name}**`; }).join('  ·  '),
      inline: false
    });
  }
  if (!consumables.length && !materials.length && !keyItems.length) {
    embed.setDescription(`🪙 Gold: **${player.gold}**\n\n*Túi đồ trống. Khám phá để tìm đồ hoặc gặp lái buôn!*`);
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
        .addOptions(options)
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
    .setDescription(`**${player.name}** đã học **${pool.length}** / 15 kỹ năng.\n*Kỹ năng trong pool không mất khi chết.*`);

  if (!pool.length) {
    embed.setDescription('Chưa học kỹ năng nào!\nGặp lái buôn hoặc tìm Skill Books khi khám phá.');
    return [embed, []];
  }

  for (const type of typeOrder) {
    const skills = pool.map(p => getSkill(p.skill_id)).filter(sk => sk?.type === type);
    if (!skills.length) continue;

    embed.addFields({
      name: typeLabels[type],
      value: skills.map(sk => {
        if (!sk) return '';
        const equipped = loadout.find(l => l.skill_id === sk.id);
        const equippedTag = equipped ? ` *(Slot ${equipped.slot})*` : '';
        const mpTag = sk.mpCost ? ` · ${sk.mpCost}MP` : '';
        return `${sk.icon} **${sk.name}**${equippedTag}${mpTag}\n> ${sk.description}`;
      }).join('\n'),
      inline: false
    });
  }

  return [embed, []];
}

// ── Tab: Loadout ───────────────────────────────────────────────────────────────
function buildLoadoutTab(
  player: any, pool: any[], loadout: any[], userId: string
): [EmbedBuilder, ActionRowBuilder<any>[]] {
  const slotLines = [1,2,3,4].map(slot => {
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
      '*Tối đa 4 slots. Loadout mất khi chết — pool giữ lại.*\n\n' +
      slotLines.join('\n')
    );

  const rows: ActionRowBuilder<any>[] = [];

  // Equip: pick skill from pool
  const equippedIds = new Set(loadout.map(l => l.skill_id));
  const equipable   = pool.filter(p => {
    const sk = getSkill(p.skill_id);
    return sk && !equippedIds.has(p.skill_id);
  });

  if (equipable.length && loadout.length < 4) {
    const opts = equipable.map(p => {
      const sk = getSkill(p.skill_id)!;
      return new StringSelectMenuOptionBuilder()
        .setLabel(sk.name)
        .setDescription(sk.description.replace(/\*\*/g,'').slice(0,50))
        .setValue(`equip_${sk.id}`)
        .setEmoji(sk.icon);
    });
    rows.push(new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`inv_equip_pick_${userId}`)
        .setPlaceholder('📎 Equip kỹ năng...')
        .addOptions(opts)
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
    rows.push(new ActionRowBuilder<ButtonBuilder>().addComponents(...unequipBtns));
  }

  return [embed, rows];
}

// ── Tab: Skill Books ───────────────────────────────────────────────────────────
function buildBooksTab(
  player: any, inventory: any[], userId: string
): [EmbedBuilder, ActionRowBuilder<any>[]] {
  const books = inventory.filter(e => getItem(e.item_id)?.type === 'skill_book');

  const embed = new EmbedBuilder()
    .setColor(COLORS.magic)
    .setTitle('📚 Skill Books');

  if (!books.length) {
    embed.setDescription('Không có Skill Book nào trong túi.\nTìm thấy khi chiến đấu hoặc gặp lái buôn!');
    return [embed, []];
  }

  embed.setDescription('Chọn sách để học kỹ năng ngay lập tức.');
  embed.addFields(books.map(e => {
    const it = getItem(e.item_id)!;
    const sk = it.teachesSkill ? getSkill(it.teachesSkill) : null;
    return {
      name: `${it.icon} ${it.name}`,
      value: sk ? `${sk.icon} ${sk.name}\n> ${sk.description}` : it.description,
      inline: false
    };
  }));

  const opts = books.map(e => {
    const it = getItem(e.item_id)!;
    const sk = it.teachesSkill ? getSkill(it.teachesSkill) : null;
    return new StringSelectMenuOptionBuilder()
      .setLabel(it.name)
      .setDescription(sk ? `Học: ${sk.name}` : 'Skill Book')
      .setValue(`learn_${e.item_id}`)
      .setEmoji(it.icon);
  });

  return [embed, [
    new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`inv_learn_${userId}`)
        .setPlaceholder('📖 Chọn sách để học...')
        .addOptions(opts)
    )
  ]];
}

// ── Action: Use item ──────────────────────────────────────────────────────────
async function handleUseItem(
  interaction: ChatInputCommandInteraction,
  userId: string, guildId: string, itemId: string
): Promise<void> {
  const player = getPlayer(userId, guildId)!;
  const item   = getItem(itemId);
  if (!item?.effect) { await renderTab(interaction, userId, guildId, 'items'); return; }

  const qty = getItemQty(userId, guildId, itemId);
  if (qty <= 0) { await renderTab(interaction, userId, guildId, 'items'); return; }

  let newHp = player.hp, newMp = player.mp;
  const lines: string[] = [];

  if (item.effect.hp) {
    const gain = Math.min(item.effect.hp, player.max_hp - player.hp);
    newHp = Math.min(player.max_hp, player.hp + item.effect.hp);
    lines.push(`❤️ +**${gain} HP**  \`${bar(newHp, player.max_hp, 8)}\` ${newHp}/${player.max_hp}`);
  }
  if (item.effect.mp) {
    const gain = Math.min(item.effect.mp, player.max_mp - player.mp);
    newMp = Math.min(player.max_mp, player.mp + item.effect.mp);
    lines.push(`💧 +**${gain} MP**  \`${bar(newMp, player.max_mp, 8)}\` ${newMp}/${player.max_mp}`);
  }

  removeItem(userId, guildId, itemId, 1);
  updatePlayerHpMp(userId, guildId, newHp, newMp);

  const inv     = getInventory(userId, guildId);
  const fresh   = getPlayer(userId, guildId)!;
  const [embed, actionRows] = buildItemsTab(fresh, inv, userId);

  embed.spliceFields(0, embed.data.fields?.length ?? 0);
  embed.setDescription(
    `✅ Dùng **${item.icon} ${item.name}**\n${lines.join('\n')}\n\n` +
    `🪙 Gold: **${fresh.gold}**`
  );

  const tabSelect = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    new StringSelectMenuBuilder().setCustomId(`inv_tab_${userId}`).setPlaceholder('Chọn mục...').addOptions([
      new StringSelectMenuOptionBuilder().setLabel('📦 Vật phẩm').setValue('items').setDefault(true),
      new StringSelectMenuOptionBuilder().setLabel('🔮 Skill Pool').setValue('skills'),
      new StringSelectMenuOptionBuilder().setLabel('📌 Loadout').setValue('loadout'),
      new StringSelectMenuOptionBuilder().setLabel('📚 Skill Books').setValue('books'),
    ])
  );

  await interaction.editReply({ embeds: [embed], components: [tabSelect, ...actionRows].slice(0,5) });
  // Re-attach collector via renderTab
  setTimeout(() => renderTab(interaction, userId, guildId, 'items'), 200);
}

// ── Action: Pick slot for equip ────────────────────────────────────────────────
async function pickSlotForSkill(
  interaction: ChatInputCommandInteraction,
  userId: string, guildId: string, skillId: string, loadout: any[]
): Promise<void> {
  const sk    = getSkill(skillId)!;
  const freeSlots = [1,2,3,4].filter(s => !loadout.find(l => l.slot === s));

  if (!freeSlots.length) {
    await renderTab(interaction, userId, guildId, 'loadout');
    return;
  }

  if (freeSlots.length === 1) {
    equipSkill(userId, guildId, freeSlots[0], skillId);
    await renderTab(interaction, userId, guildId, 'loadout');
    return;
  }

  const opts = freeSlots.map(slot =>
    new StringSelectMenuOptionBuilder().setLabel(`Slot ${slot}`).setValue(`slot_${slot}`)
  );

  const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`inv_setslot_${userId}_${skillId}`)
      .setPlaceholder(`Chọn slot cho ${sk.name}...`)
      .addOptions(opts)
  );

  const reply = await interaction.editReply({
    embeds: [new EmbedBuilder().setColor(COLORS.magic).setDescription(`${sk.icon} **${sk.name}** → chọn slot:`)],
    components: [row]
  });

  const sel = await reply.awaitMessageComponent({
    componentType: ComponentType.StringSelect,
    filter: i => i.user.id === userId,
    time: 20_000
  }).catch(() => null);

  if (!sel) { await renderTab(interaction, userId, guildId, 'loadout'); return; }
  await sel.deferUpdate();

  const slot = Number(sel.values[0].replace('slot_', ''));
  equipSkill(userId, guildId, slot, skillId);
  await renderTab(interaction, userId, guildId, 'loadout');
}

// ── Action: Learn skill book ───────────────────────────────────────────────────
async function handleLearnSkill(
  interaction: ChatInputCommandInteraction,
  userId: string, guildId: string, bookId: string
): Promise<void> {
  const item = getItem(bookId);
  if (!item?.teachesSkill) { await renderTab(interaction, userId, guildId, 'books'); return; }

  const qty = getItemQty(userId, guildId, bookId);
  if (qty <= 0) { await renderTab(interaction, userId, guildId, 'books'); return; }

  const skill = getSkill(item.teachesSkill)!;

  if (hasSkillInPool(userId, guildId, skill.id)) {
    // Already known — just show updated tab
    await renderTab(interaction, userId, guildId, 'books');
    return;
  }

  removeItem(userId, guildId, bookId, 1);
  addSkillToPool(userId, guildId, skill.id);
  const achievementMessages = awardAchievements(userId, guildId);

  // Show success then re-render books tab
  const embed = new EmbedBuilder().setColor(COLORS.magic)
    .setTitle('📖 Học Kỹ Năng Mới!')
    .setDescription(
      `**${item.icon} ${item.name}** tan biến thành ánh sáng...\n\n` +
      `${skill.icon} **${skill.name}** thêm vào Skill Pool!\n\n` + skill.description
    )
    .addFields({ name: 'Loại', value: {active:'⚔️ Active', passive:'✨ Passive', reaction:'⚡ Reaction', world:'🌍 World'}[skill.type], inline: true })
    .setFooter({ text: 'Chuyển sang tab 📌 Loadout để trang bị.' });

  if (achievementMessages.length) {
    embed.addFields({ name: '🏆 Thành tựu mới', value: achievementMessages.join('\n'), inline: false });
  }

  await interaction.editReply({ embeds: [embed], components: [] });

  // Auto switch to books tab after 3s
  setTimeout(() => renderTab(interaction, userId, guildId, 'books'), 2500);
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
        .addOptions(opts)
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
    rows.push(new ActionRowBuilder<ButtonBuilder>().addComponents(...btns));
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
      value: unlocked.map(t => `${t.icon} **${t.name}** — *${t.description}*`).join('\n'),
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
        .addOptions(opts)
    ));
  }

  return [embed, rows];
}
