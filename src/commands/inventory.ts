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
import { bar } from '../utils/format';

export const data = new SlashCommandBuilder()
  .setName('inventory')
  .setDescription('Quản lý đồ vật, kỹ năng và loadout');

type Tab = 'consumable' | 'skillbook' | 'equipment' | 'material' | 'special' | 'skills' | 'loadout';

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();
  const { id: userId } = interaction.user;
  const guildId = interaction.guildId!;
  const player  = getPlayer(userId, guildId);

  if (!player) {
    await interaction.editReply({ embeds: [new EmbedBuilder().setColor(COLORS.warning).setDescription('Bạn chưa có nhân vật! Dùng `/start`.')]});
    return;
  }

  await renderTab(interaction, userId, guildId, 'consumable');
}

// ── Render tab ────────────────────────────────────────────────────────────────
async function renderTab(
  interaction: ChatInputCommandInteraction,
  userId: string, guildId: string, currentTab: Tab, currentRarity = 'all'
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
        new StringSelectMenuOptionBuilder().setLabel('🎒 Consumable').setDescription('Vật phẩm hồi phục và consumables').setValue('consumable').setDefault(currentTab === 'consumable'),
        new StringSelectMenuOptionBuilder().setLabel('📜 Skill Book').setDescription('Sách học kỹ năng').setValue('skillbook').setDefault(currentTab === 'skillbook'),
        new StringSelectMenuOptionBuilder().setLabel('⚔️ Equipment').setDescription('Trang bị và vật phẩm đặc biệt').setValue('equipment').setDefault(currentTab === 'equipment'),
        new StringSelectMenuOptionBuilder().setLabel('🪨 Material').setDescription('Vật liệu chế tạo').setValue('material').setDefault(currentTab === 'material'),
        new StringSelectMenuOptionBuilder().setLabel('✨ Special').setDescription('Đồ đặc biệt / key items').setValue('special').setDefault(currentTab === 'special'),
      ])
  );

  // Rarity filter (applies to item-like tabs)
  const raritySelect = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`inv_rarity_${userId}`)
      .setPlaceholder('Lọc rarity...')
      .addOptions([
        new StringSelectMenuOptionBuilder().setLabel('All').setValue('all').setDefault(currentRarity === 'all'),
        new StringSelectMenuOptionBuilder().setLabel('Common').setValue('Common').setDefault(currentRarity === 'Common'),
        new StringSelectMenuOptionBuilder().setLabel('Rare').setValue('Rare').setDefault(currentRarity === 'Rare'),
        new StringSelectMenuOptionBuilder().setLabel('Epic').setValue('Epic').setDefault(currentRarity === 'Epic'),
        new StringSelectMenuOptionBuilder().setLabel('Legendary').setValue('Legendary').setDefault(currentRarity === 'Legendary'),
      ])
  );

  let embed: EmbedBuilder;
  let actionRows: ActionRowBuilder<any>[] = [];

  switch (currentTab) {
    case 'consumable': [embed, actionRows] = buildItemsTab(player, inventory, userId, 'consumable', currentRarity); break;
    case 'material':   [embed, actionRows] = buildItemsTab(player, inventory, userId, 'material', currentRarity); break;
    case 'equipment':  [embed, actionRows] = buildItemsTab(player, inventory, userId, 'equipment', currentRarity); break;
    case 'special':    [embed, actionRows] = buildItemsTab(player, inventory, userId, 'special', currentRarity); break;
    case 'skillbook':  [embed, actionRows] = buildBooksTab(player, inventory, userId); break;
    case 'skills':     [embed, actionRows] = buildSkillsTab(player, pool, loadout); break;
    case 'loadout':    [embed, actionRows] = buildLoadoutTab(player, pool, loadout, userId); break;
  }

  const allRows = [tabSelect, raritySelect, ...actionRows].slice(0, 5);
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
      await renderTab(interaction, userId, guildId, tab, currentRarity);
      return;
    }

    // Rarity switch
    if (cid === `inv_rarity_${userId}`) {
      const rarity = (compInt as StringSelectMenuInteraction).values[0];
      await renderTab(interaction, userId, guildId, currentTab, rarity);
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
  player: any, inventory: any[], userId: string, category: 'consumable' | 'material' | 'equipment' | 'special', rarity = 'all'
): [EmbedBuilder, ActionRowBuilder<any>[]] {
  // filter by category
  const byCategory = inventory.filter(e => {
    const it = getItem(e.item_id);
    if (!it) return false;
    if (category === 'consumable') return it.type === 'consumable';
    if (category === 'material') return it.type === 'material';
    if (category === 'special') return it.type === 'key_item';
    // equipment currently not modeled; fallback to key_item
    if (category === 'equipment') return it.type === 'key_item';
    return false;
  }).filter(e => {
    const it = getItem(e.item_id)!;
    const r = (it as any).rarity ?? 'Common';
    return rarity === 'all' ? true : r === rarity;
  });

  const embed = new EmbedBuilder()
    .setColor(COLORS.info)
    .setTitle(category === 'consumable' ? '🎒 Consumables' : category === 'material' ? '🪨 Materials' : category === 'equipment' ? '⚔️ Equipment' : '✨ Special')
    .setDescription(`🪙 Gold: **${player.gold}**  ·  💀 Soul Shards: **${player.soul_shards}**`);

  if (byCategory.length) {
    // group display
    embed.addFields({
      name: 'Items',
      value: byCategory.map(e => {
        const it = getItem(e.item_id)!;
        const rarityTag = (it as any).rarity ? ` • ${ (it as any).rarity }` : '';
        return `${it.icon} **${it.name}** ×${e.quantity}${rarityTag} — ${it.description.replace(/\*\*/g,'').slice(0,60)}`;
      }).join('\n'),
      inline: false
    });
  } else {
    embed.setDescription(`🪙 Gold: **${player.gold}**\n\n*Không có vật phẩm trong mục này.*`);
  }

  const rows: ActionRowBuilder<any>[] = [];

  // Use item select for consumables only
  if (category === 'consumable' && byCategory.length) {
    const options = byCategory.map(e => {
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
  if (!item?.effect) { await renderTab(interaction, userId, guildId, 'consumable'); return; }

  const qty = getItemQty(userId, guildId, itemId);
  if (qty <= 0) { await renderTab(interaction, userId, guildId, 'consumable'); return; }

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
  const [embed, actionRows] = buildItemsTab(fresh, inv, userId, 'consumable', 'all');

  embed.spliceFields(0, embed.data.fields?.length ?? 0);
  embed.setDescription(
    `✅ Dùng **${item.icon} ${item.name}**\n${lines.join('\n')}\n\n` +
    `🪙 Gold: **${fresh.gold}**`
  );

  const tabSelect = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    new StringSelectMenuBuilder().setCustomId(`inv_tab_${userId}`).setPlaceholder('Chọn mục...').addOptions([
      new StringSelectMenuOptionBuilder().setLabel('🎒 Consumable').setValue('consumable').setDefault(true),
      new StringSelectMenuOptionBuilder().setLabel('📜 Skill Book').setValue('skillbook'),
      new StringSelectMenuOptionBuilder().setLabel('📌 Loadout').setValue('loadout'),
      new StringSelectMenuOptionBuilder().setLabel('🔮 Skill Pool').setValue('skills'),
    ])
  );

  await interaction.editReply({ embeds: [embed], components: [tabSelect, ...actionRows].slice(0,5) });
  // Re-attach collector via renderTab
  setTimeout(() => renderTab(interaction, userId, guildId, 'consumable'), 200);
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
  if (!item?.teachesSkill) { await renderTab(interaction, userId, guildId, 'skillbook'); return; }

  const qty = getItemQty(userId, guildId, bookId);
  if (qty <= 0) { await renderTab(interaction, userId, guildId, 'skillbook'); return; }

  const skill = getSkill(item.teachesSkill)!;

  if (hasSkillInPool(userId, guildId, skill.id)) {
    // Already known — just show updated tab
    await renderTab(interaction, userId, guildId, 'skillbook');
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
  setTimeout(() => renderTab(interaction, userId, guildId, 'skillbook'), 2500);
}
