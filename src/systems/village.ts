import {
  ChatInputCommandInteraction, EmbedBuilder,
  ActionRowBuilder, ButtonBuilder, ButtonStyle,
  StringSelectMenuBuilder, StringSelectMenuOptionBuilder,
  ComponentType
} from 'discord.js';
import { getPlayer, addItem, getItemQty, getInventory, removeItem, grantSoulShards } from './player';
import { getBookTier, pickDifferentBook } from '../commands/reroll';
import { onlyUser } from '../utils/collectors';
import { getWornEquipment, UPGRADE_MAX } from './equipment';
import { COLORS } from '../utils/embeds';
import { getItem, ITEMS } from '../data/items';
import { getEquipment, EQUIPMENT, RARITY_LABELS, SLOT_LABELS } from '../data/equipment';
import { ZONES } from '../data/zones';
import db from '../database/index';

// ── Helpers ───────────────────────────────────────────────────────────────

function simpleEmbed(color: number, desc: string) {
  return new EmbedBuilder().setColor(color).setDescription(desc);
}

function backRow(userId: string) {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`vill_back_${userId}`)
      .setLabel('◀ Quay lại')
      .setStyle(ButtonStyle.Secondary)
  );
}

// ── SHOP ──────────────────────────────────────────────────────────────────

export async function showVillageShop(
  interaction: ChatInputCommandInteraction,
  userId: string, guildId: string
): Promise<void> {
  const player = getPlayer(userId, guildId)!;
  const zone = ZONES[player.zone_id];
  const shopItemIds: string[] = zone?.shopItems ?? [];

  // Also include common equipment with buyPrice
  const equipForSale = Object.values(EQUIPMENT).filter(e =>
    e.buyPrice && e.rarity === 'common' && (e.minZone === 'village' || !e.minZone)
  );

  const consumableOptions = shopItemIds
    .map(id => getItem(id))
    .filter((it): it is NonNullable<typeof it> => !!it && !!it.buyPrice)
    .map(it => new StringSelectMenuOptionBuilder()
      .setLabel(`${it.icon} ${it.name}`)
      .setDescription(`${it.buyPrice} 🪙 — ${it.description.replace(/\*\*/g, '')}`.slice(0, 100))
      .setValue(`buy_item_${it.id}`)
    );

  const equipOptions = equipForSale.map(eq =>
    new StringSelectMenuOptionBuilder()
      .setLabel(`${eq.icon} ${eq.name}`)
      .setDescription(`${eq.buyPrice} 🪙 — ${SLOT_LABELS[eq.slot]}`)
      .setValue(`buy_equip_${eq.id}`)
  );

  const allOptions = [...consumableOptions, ...equipOptions];
  if (allOptions.length === 0) {
    await interaction.editReply({ embeds: [simpleEmbed(COLORS.warning, 'Cửa hàng trống.')], components: [backRow(userId)] });
    return;
  }

  const shopEmbed = new EmbedBuilder()
    .setColor(COLORS.gold)
    .setTitle('🏪 Cửa Hàng Làng')
    .setDescription(`🪙 Bạn có **${player.gold} Gold**\n\nChọn vật phẩm muốn mua:`)
    .setFooter({ text: 'Chọn từ menu bên dưới' });

  const selectRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`vill_shop_sel_${userId}`)
      .setPlaceholder('Chọn vật phẩm...')
      .addOptions(allOptions.slice(0, 25))
  );

  const msg = await interaction.editReply({ embeds: [shopEmbed], components: [selectRow, backRow(userId)] });

  const sel = await msg.awaitMessageComponent({
    filter: onlyUser(userId),
    componentType: ComponentType.StringSelect,
    time: 45_000
  }).catch(() => null);

  if (!sel) { await interaction.editReply({ components: [] }); return; }
  await sel.deferUpdate();

  const value = sel.values[0]; // buy_item_xxx or buy_equip_xxx
  const isEquip = value.startsWith('buy_equip_');
  const itemId  = value.replace('buy_item_', '').replace('buy_equip_', '');

  const def = isEquip ? getEquipment(itemId) : getItem(itemId);
  if (!def || !def.buyPrice) {
    await interaction.editReply({ embeds: [simpleEmbed(COLORS.danger, '❌ Không tìm thấy vật phẩm.')], components: [backRow(userId)] });
    return;
  }

  const freshPlayer = getPlayer(userId, guildId)!;
  const confirmEmbed = new EmbedBuilder()
    .setColor(COLORS.gold)
    .setTitle(`🏪 Xác nhận mua`)
    .setDescription(
      `**${def.icon ?? ''} ${def.name}**\n${def.description}\n\n` +
      `Giá: **${def.buyPrice} 🪙**\nBạn có: **${freshPlayer.gold} 🪙**`
    );

  const confirmRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`vill_buy_confirm_${userId}`).setLabel('Mua').setEmoji('🪙').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`vill_back_${userId}`).setLabel('Hủy').setStyle(ButtonStyle.Secondary)
  );

  const msg2 = await interaction.editReply({ embeds: [confirmEmbed], components: [confirmRow] });

  const btn = await msg2.awaitMessageComponent({
    filter: onlyUser(userId),
    componentType: ComponentType.Button,
    time: 30_000
  }).catch(() => null);

  if (!btn || btn.customId !== `vill_buy_confirm_${userId}`) {
    if (btn) await btn.deferUpdate();
    await showVillageShop(interaction, userId, guildId);
    return;
  }

  await btn.deferUpdate();
  const p2 = getPlayer(userId, guildId)!;
  if (p2.gold < def.buyPrice) {
    await interaction.editReply({ embeds: [simpleEmbed(COLORS.danger, `❌ Không đủ Gold! Cần **${def.buyPrice}**, có **${p2.gold}**.`)], components: [backRow(userId)] });
    return;
  }

  db.prepare('UPDATE players SET gold=gold-? WHERE user_id=? AND guild_id=?').run(def.buyPrice, userId, guildId);
  addItem(userId, guildId, itemId, 1);

  await interaction.editReply({
    embeds: [simpleEmbed(COLORS.success, `✅ Đã mua **${def.icon ?? ''} ${def.name}**!\n🪙 Còn lại: **${p2.gold - def.buyPrice} Gold**`)],
    components: [backRow(userId)]
  });
}

// ── BLACKSMITH ────────────────────────────────────────────────────────────

const UPGRADE_COSTS: Record<number, { iron: number; crystal: number; gold: number }> = {
  1: { iron: 2, crystal: 0, gold: 40  },
  2: { iron: 3, crystal: 1, gold: 80  },
  3: { iron: 4, crystal: 2, gold: 150 },
  4: { iron: 5, crystal: 3, gold: 250 },
  5: { iron: 8, crystal: 4, gold: 400 },
};

const REROLL_COST = 2; // Soul Shards

function getUpgradeLevel(userId: string, guildId: string, slot: string): number {
  const row = db.prepare('SELECT upgrade_level FROM equipment_upgrades WHERE user_id=? AND guild_id=? AND slot=?')
    .get(userId, guildId, slot) as any;
  return row?.upgrade_level ?? 0;
}

export async function showVillageBlacksmith(
  interaction: ChatInputCommandInteraction,
  userId: string, guildId: string
): Promise<void> {
  const player = getPlayer(userId, guildId)!;
  const worn   = getWornEquipment(userId, guildId);

  if (worn.length === 0) {
    await interaction.editReply({
      embeds: [simpleEmbed(COLORS.warning, '⚒️ Bạn chưa equip trang bị nào!\nDùng `/inventory` để trang bị đồ.')],
      components: [backRow(userId)]
    });
    return;
  }

  const options = worn.map(w => {
    const eq   = getEquipment(w.equipment_id);
    const upLv = getUpgradeLevel(userId, guildId, w.slot);
    const nextLv = upLv + 1;
    const cost = UPGRADE_COSTS[nextLv];
    const maxed = upLv >= UPGRADE_MAX;
    const label = `${eq?.icon ?? ''} ${eq?.name ?? w.equipment_id} [+${upLv}]`;
    const desc = maxed
      ? `MAX (+${UPGRADE_MAX}) — không thể nâng thêm`
      : cost ? `Lv.${nextLv}: ${cost.iron} Iron + ${cost.crystal > 0 ? cost.crystal + ' Crystal + ' : ''}${cost.gold} 🪙` : '';
    return new StringSelectMenuOptionBuilder()
      .setLabel(label.slice(0, 100))
      .setDescription(desc.slice(0, 100))
      .setValue(`upgrade_${w.slot}`);
  });

  const ironQty  = getItemQty(userId, guildId, 'iron_ore');
  const crystQty = getItemQty(userId, guildId, 'mana_crystal');

  const bsEmbed = new EmbedBuilder()
    .setColor(0xE67E22)
    .setTitle('⚒️ Lò Rèn Làng')
    .setDescription(
      `Vật liệu của bạn:\n> 🪨 **${ironQty} Iron Ore**  ·  💠 **${crystQty} Mana Crystal**  ·  🪙 **${player.gold} Gold**\n\n` +
      `Mỗi nâng cấp: **Weapon** +2 ATK · **Armor** +2 DEF · **Accessory** +1 ATK`
    )
    .setFooter({ text: 'Tối đa +5 mỗi trang bị  ·  🎲 Reroll đổi Skill Book (2 💀)' });

  const selectRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`vill_bs_sel_${userId}`)
      .setPlaceholder('Chọn trang bị cần nâng...')
      .addOptions(options.slice(0, 25))
  );

  const bsBottomRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`vill_bs_reroll_${userId}`)
      .setLabel('Reroll Skill Book')
      .setEmoji('🎲')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`vill_back_${userId}`)
      .setLabel('Quay lại')
      .setStyle(ButtonStyle.Secondary)
  );

  const msg = await interaction.editReply({ embeds: [bsEmbed], components: [selectRow, bsBottomRow] });

  const sel = await msg.awaitMessageComponent({
    filter: onlyUser(userId),
    time: 45_000
  }).catch(() => null);

  if (!sel) { await interaction.editReply({ components: [] }); return; }
  await sel.deferUpdate();

  if (sel.customId === `vill_back_${userId}`) {
    await interaction.editReply({ components: [] });
    return;
  }

  if (sel.customId === `vill_bs_reroll_${userId}`) {
    await showBlacksmithReroll(interaction, userId, guildId);
    return;
  }

  if (!sel.isStringSelectMenu()) { await interaction.editReply({ components: [] }); return; }

  const slot  = sel.values[0].replace('upgrade_', '') as any;
  const upLv  = getUpgradeLevel(userId, guildId, slot);

  if (upLv >= UPGRADE_MAX) {
    await interaction.editReply({
      embeds: [simpleEmbed(COLORS.warning, `⚒️ Trang bị này đã đạt **+${UPGRADE_MAX}** tối đa!`)],
      components: [backRow(userId)]
    });
    return;
  }

  const nextLv    = upLv + 1;
  const cost      = UPGRADE_COSTS[nextLv]!;
  const wornEntry = worn.find(w => w.slot === slot)!;
  const eq        = getEquipment(wornEntry.equipment_id);

  const confirmEmbed = new EmbedBuilder()
    .setColor(0xE67E22)
    .setTitle(`⚒️ Nâng cấp ${eq?.icon ?? ''} ${eq?.name ?? slot}`)
    .setDescription(
      `**[+${upLv}] → [+${nextLv}]**\n\n` +
      `Chi phí:\n> 🪨 **${cost.iron} Iron Ore**${cost.crystal > 0 ? `\n> 💠 **${cost.crystal} Mana Crystal**` : ''}\n> 🪙 **${cost.gold} Gold**\n\n` +
      `Bạn có: 🪨 **${ironQty}** · 💠 **${crystQty}** · 🪙 **${getPlayer(userId, guildId)!.gold}**`
    );

  const confirmRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`vill_bs_confirm_${userId}`).setLabel('Nâng cấp').setEmoji('⚒️').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`vill_back_${userId}`).setLabel('Hủy').setStyle(ButtonStyle.Secondary)
  );

  const msg2 = await interaction.editReply({ embeds: [confirmEmbed], components: [confirmRow] });

  const btn = await msg2.awaitMessageComponent({
    filter: onlyUser(userId),
    componentType: ComponentType.Button,
    time: 30_000
  }).catch(() => null);

  if (!btn || btn.customId !== `vill_bs_confirm_${userId}`) {
    if (btn) await btn.deferUpdate();
    await showVillageBlacksmith(interaction, userId, guildId);
    return;
  }

  await btn.deferUpdate();

  const pNow    = getPlayer(userId, guildId)!;
  const ironNow = getItemQty(userId, guildId, 'iron_ore');
  const crysNow = getItemQty(userId, guildId, 'mana_crystal');

  if (pNow.gold < cost.gold || ironNow < cost.iron || crysNow < cost.crystal) {
    await interaction.editReply({
      embeds: [simpleEmbed(COLORS.danger, '❌ Không đủ nguyên liệu!')],
      components: [backRow(userId)]
    });
    return;
  }

  db.prepare('UPDATE players SET gold=gold-? WHERE user_id=? AND guild_id=?').run(cost.gold, userId, guildId);
  db.prepare(`DELETE FROM inventory WHERE user_id=? AND guild_id=? AND item_id='iron_ore' AND quantity<=?`).run(userId, guildId, cost.iron);
  db.prepare(`UPDATE inventory SET quantity=quantity-? WHERE user_id=? AND guild_id=? AND item_id='iron_ore'`).run(cost.iron, userId, guildId);
  if (cost.crystal > 0) {
    db.prepare(`DELETE FROM inventory WHERE user_id=? AND guild_id=? AND item_id='mana_crystal' AND quantity<=?`).run(userId, guildId, cost.crystal);
    db.prepare(`UPDATE inventory SET quantity=quantity-? WHERE user_id=? AND guild_id=? AND item_id='mana_crystal'`).run(cost.crystal, userId, guildId);
  }
  db.prepare(`
    INSERT INTO equipment_upgrades (user_id, guild_id, slot, upgrade_level)
    VALUES (?, ?, ?, 1)
    ON CONFLICT(user_id, guild_id, slot) DO UPDATE SET upgrade_level=upgrade_level+1
  `).run(userId, guildId, slot);

  const bonusDesc = slot === 'weapon' ? '+2 ATK' : slot === 'armor' ? '+2 DEF' : '+1 ATK';
  await interaction.editReply({
    embeds: [new EmbedBuilder()
      .setColor(0xE67E22)
      .setTitle('⚒️ Nâng cấp thành công!')
      .setDescription(`**${eq?.icon ?? ''} ${eq?.name ?? slot}** → **[+${nextLv}]**\n\n✦ ${bonusDesc} được thêm vào trang bị!`)],
    components: [backRow(userId)]
  });
}

async function showBlacksmithReroll(
  interaction: ChatInputCommandInteraction,
  userId: string, guildId: string
): Promise<void> {
  const player = getPlayer(userId, guildId)!;

  if (player.soul_shards < REROLL_COST) {
    await interaction.editReply({
      embeds: [new EmbedBuilder()
        .setColor(COLORS.warning)
        .setTitle('❌ Không đủ Soul Shards')
        .setDescription(
          `Reroll tốn **${REROLL_COST} 💀 Soul Shards**.\n` +
          `Bạn hiện có: **${player.soul_shards}** 💀`
        )],
      components: [backRow(userId)]
    });
    return;
  }

  const inventory = getInventory(userId, guildId);
  const books = inventory
    .filter(e => getItem(e.item_id)?.type === 'skill_book')
    .map(e => ({ entry: e, item: getItem(e.item_id)!, tier: getBookTier(e.item_id) }))
    .filter((b): b is typeof b & { tier: string } => b.tier !== null);

  if (!books.length) {
    await interaction.editReply({
      embeds: [new EmbedBuilder().setColor(COLORS.info).setDescription('📚 Không có Skill Book nào trong túi có thể reroll!')],
      components: [backRow(userId)]
    });
    return;
  }

  const options = books.map(({ entry, item, tier }) =>
    new StringSelectMenuOptionBuilder()
      .setLabel(`${item.name} [${tier}]`)
      .setDescription(`Reroll thành book ${tier} khác`)
      .setValue(entry.item_id)
      .setEmoji(item.icon)
  );

  const rerollEmbed = new EmbedBuilder()
    .setColor(COLORS.magic)
    .setTitle('🎲 Reroll Skill Book')
    .setDescription(
      `Chọn Skill Book muốn đổi thành book **ngẫu nhiên cùng tier**.\n\n` +
      `💀 Soul Shards: **${player.soul_shards}**  ·  Chi phí: **${REROLL_COST} 💀**\n\n` +
      `*Tier giữ nguyên (active/passive/reaction/world/soul). Book mới có thể ra book đã có.*`
    );

  const rrSelectRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`vill_bs_rr_sel_${userId}`)
      .setPlaceholder('Chọn Skill Book muốn reroll...')
      .addOptions(options.slice(0, 25))
  );

  const msg = await interaction.editReply({ embeds: [rerollEmbed], components: [rrSelectRow, backRow(userId)] });

  const sel = await msg.awaitMessageComponent({
    filter: onlyUser(userId),
    time: 30_000
  }).catch(() => null);

  if (!sel) { await interaction.editReply({ components: [] }); return; }
  await sel.deferUpdate();

  if (sel.customId === `vill_back_${userId}`) {
    await showVillageBlacksmith(interaction, userId, guildId);
    return;
  }

  if (!sel.isStringSelectMenu()) { await showVillageBlacksmith(interaction, userId, guildId); return; }

  const bookId  = sel.values[0];
  const bookDef = getItem(bookId)!;
  const tier    = getBookTier(bookId)!;

  const freshPlayer = getPlayer(userId, guildId)!;
  if (freshPlayer.soul_shards < REROLL_COST) {
    await interaction.editReply({
      embeds: [new EmbedBuilder().setColor(COLORS.warning).setDescription('❌ Không đủ Soul Shards!')],
      components: []
    });
    return;
  }

  removeItem(userId, guildId, bookId, 1);
  grantSoulShards(userId, guildId, -REROLL_COST);

  const newBookId  = pickDifferentBook(tier, bookId);
  addItem(userId, guildId, newBookId, 1);
  const newBookDef = getItem(newBookId)!;

  await interaction.editReply({
    embeds: [new EmbedBuilder()
      .setColor(COLORS.magic)
      .setTitle('🎲 Reroll Thành Công!')
      .setDescription(
        `**Trước:** ${bookDef.icon} ${bookDef.name}\n` +
        `**Sau:**   ${newBookDef.icon} **${newBookDef.name}**\n\n` +
        `💀 Soul Shards còn lại: **${freshPlayer.soul_shards - REROLL_COST}**`
      )],
    components: [backRow(userId)]
  });
}

// ── TAVERN ────────────────────────────────────────────────────────────────

export async function showVillageTavern(
  interaction: ChatInputCommandInteraction,
  userId: string, guildId: string
): Promise<void> {
  const player = getPlayer(userId, guildId)!;
  const missingHp = player.max_hp - player.hp;
  const missingMp = player.max_mp - player.mp;
  const healCost  = Math.max(20, Math.ceil(missingHp * 0.4 + missingMp * 0.2));

  const fullHp = player.hp >= player.max_hp;
  const fullMp = player.mp >= player.max_mp;

  const embed = new EmbedBuilder()
    .setColor(0x8B4513)
    .setTitle('🍺 Quán Trọ — Nghỉ Ngơi')
    .setDescription(
      `> *Ngọn lửa bập bùng trong lò sưởi. Mùi thức ăn nóng hổi bay đến từ nhà bếp...*\n\n` +
      `❤️ HP: **${player.hp}/${player.max_hp}**\n` +
      `💧 MP: **${player.mp}/${player.max_mp}**\n\n` +
      (fullHp && fullMp
        ? `✅ Bạn đang **đầy HP và MP** — không cần nghỉ.`
        : `Chi phí nghỉ ngơi (hồi full): **${healCost} 🪙**\nBạn có: **${player.gold} 🪙**`)
    );

  if (fullHp && fullMp) {
    await interaction.editReply({ embeds: [embed], components: [backRow(userId)] });
    return;
  }

  const restRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`vill_rest_confirm_${userId}`).setLabel(`Nghỉ — ${healCost} 🪙`).setEmoji('💤').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`vill_back_${userId}`).setLabel('Rời đi').setStyle(ButtonStyle.Secondary)
  );

  const msg = await interaction.editReply({ embeds: [embed], components: [restRow] });

  const btn = await msg.awaitMessageComponent({
    filter: onlyUser(userId),
    componentType: ComponentType.Button,
    time: 30_000
  }).catch(() => null);

  if (!btn || btn.customId !== `vill_rest_confirm_${userId}`) {
    if (btn) await btn.deferUpdate();
    await interaction.editReply({ components: [] });
    return;
  }

  await btn.deferUpdate();
  const pNow = getPlayer(userId, guildId)!;
  if (pNow.gold < healCost) {
    await interaction.editReply({
      embeds: [simpleEmbed(COLORS.danger, `❌ Không đủ Gold! Cần **${healCost}**, có **${pNow.gold}**.`)],
      components: [backRow(userId)]
    });
    return;
  }

  db.prepare('UPDATE players SET gold=gold-?, hp=max_hp, mp=max_mp WHERE user_id=? AND guild_id=?')
    .run(healCost, userId, guildId);

  await interaction.editReply({
    embeds: [new EmbedBuilder()
      .setColor(COLORS.success)
      .setTitle('💤 Nghỉ ngơi tại quán trọ')
      .setDescription(
        `> *Một đêm ngon giấc. Sáng dậy, cơ thể như mới...*\n\n` +
        `❤️ HP đã hồi đầy: **${pNow.max_hp}/${pNow.max_hp}**\n` +
        `💧 MP đã hồi đầy: **${pNow.max_mp}/${pNow.max_mp}**\n\n` +
        `🪙 Còn lại: **${pNow.gold - healCost} Gold**`
      )],
    components: [backRow(userId)]
  });
}

// ── NOTICE BOARD ──────────────────────────────────────────────────────────

interface Bounty {
  id: string;
  title: string;
  desc: string;
  check: (userId: string, guildId: string) => boolean;
  reward: { gold: number; item?: string };
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function seededRandIndex(seed: number, len: number): number {
  return ((seed * 1664525 + 1013904223) >>> 0) % len;
}

const BOUNTY_POOL: Bounty[] = [
  {
    id: 'kill_5', title: '🗡️ Giết 5 quái', desc: 'Hoàn thành 5 lần chiến đấu hôm nay',
    check: (u, g) => {
      const row = db.prepare(`SELECT kill_count FROM daily_quests WHERE user_id=? AND guild_id=? AND date=?`)
        .get(u, g, todayStr()) as any;
      return (row?.kill_count ?? 0) >= 5;
    },
    reward: { gold: 80, item: 'health_potion' }
  },
  {
    id: 'kill_10', title: '⚔️ Giết 10 quái', desc: 'Hoàn thành 10 lần chiến đấu hôm nay',
    check: (u, g) => {
      const row = db.prepare(`SELECT kill_count FROM daily_quests WHERE user_id=? AND guild_id=? AND date=?`)
        .get(u, g, todayStr()) as any;
      return (row?.kill_count ?? 0) >= 10;
    },
    reward: { gold: 180, item: 'elixir' }
  },
  {
    id: 'explore_3', title: '🗺️ Khám phá 3 lần', desc: 'Dùng lệnh khám phá 3 lần hôm nay',
    check: (u, g) => {
      const row = db.prepare(`SELECT explore_count FROM daily_quests WHERE user_id=? AND guild_id=? AND date=?`)
        .get(u, g, todayStr()) as any;
      return (row?.explore_count ?? 0) >= 3;
    },
    reward: { gold: 60 }
  },
  {
    id: 'explore_6', title: '🗺️ Khám phá 6 lần', desc: 'Dùng lệnh khám phá 6 lần hôm nay',
    check: (u, g) => {
      const row = db.prepare(`SELECT explore_count FROM daily_quests WHERE user_id=? AND guild_id=? AND date=?`)
        .get(u, g, todayStr()) as any;
      return (row?.explore_count ?? 0) >= 6;
    },
    reward: { gold: 130, item: 'mana_potion' }
  },
  {
    id: 'gold_200', title: '🪙 Tích 200 Gold', desc: 'Sở hữu ít nhất 200 Gold',
    check: (u, g) => (getPlayer(u, g)?.gold ?? 0) >= 200,
    reward: { gold: 50, item: 'iron_ore' }
  },
  {
    id: 'survive_boss', title: '👑 Sống sót qua Boss', desc: 'Đang ở mức HP ≥ 50% sau khi thắng',
    check: (u, g) => {
      const p = getPlayer(u, g);
      return !!p && p.hp >= p.max_hp * 0.5 && p.kills > 0;
    },
    reward: { gold: 120, item: 'healing_potion' }
  },
];

function getDailyBounties(date: string): Bounty[] {
  const seed = date.split('-').reduce((s, n) => s * 100 + parseInt(n), 0);
  const used = new Set<number>();
  const result: Bounty[] = [];
  for (let i = 0; i < 3; i++) {
    let idx = seededRandIndex(seed + i * 7, BOUNTY_POOL.length);
    let tries = 0;
    while (used.has(idx) && tries < 20) { idx = (idx + 1) % BOUNTY_POOL.length; tries++; }
    used.add(idx);
    result.push(BOUNTY_POOL[idx]);
  }
  return result;
}

function isClaimed(userId: string, guildId: string, date: string, slot: number): boolean {
  return !!db.prepare('SELECT 1 FROM village_bounty_claims WHERE user_id=? AND guild_id=? AND date=? AND slot=?')
    .get(userId, guildId, date, slot);
}

export async function showVillageBoard(
  interaction: ChatInputCommandInteraction,
  userId: string, guildId: string
): Promise<void> {
  const player  = getPlayer(userId, guildId)!;
  const date    = todayStr();
  const bounties = getDailyBounties(date);

  const lines = bounties.map((b, i) => {
    const claimed = isClaimed(userId, guildId, date, i);
    const done    = b.check(userId, guildId);
    const status  = claimed ? '✅ Đã nhận' : done ? '🟡 Sẵn sàng nhận' : '⬜ Chưa hoàn thành';
    const reward  = `🪙 **${b.reward.gold}**${b.reward.item ? ` + ${getItem(b.reward.item)?.icon ?? ''} ${getItem(b.reward.item)?.name ?? b.reward.item}` : ''}`;
    return `**${i + 1}. ${b.title}**\n> ${b.desc}\n> ${status}  ·  ${reward}`;
  }).join('\n\n');

  const boardEmbed = new EmbedBuilder()
    .setColor(0x3498DB)
    .setTitle('📋 Bảng Nhiệm Vụ')
    .setDescription(`*Hôm nay ${date}*\n\n${lines}`)
    .setFooter({ text: 'Nhiệm vụ reset lúc 0:00 UTC mỗi ngày' });

  const claimableIdx = bounties.findIndex((b, i) =>
    !isClaimed(userId, guildId, date, i) && b.check(userId, guildId)
  );

  const btnRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`vill_board_claim_${userId}`)
      .setLabel('Nhận thưởng')
      .setEmoji('🎁')
      .setStyle(ButtonStyle.Success)
      .setDisabled(claimableIdx === -1),
    new ButtonBuilder().setCustomId(`vill_back_${userId}`).setLabel('◀ Quay lại').setStyle(ButtonStyle.Secondary)
  );

  const msg = await interaction.editReply({ embeds: [boardEmbed], components: [btnRow] });

  if (claimableIdx === -1) return;

  const btn = await msg.awaitMessageComponent({
    filter: (i) => {
      if (i.user.id !== userId) { i.reply({ content: '❌ Đây không phải tương tác của bạn.', flags: 64 }).catch(() => {}); return false; }
      if (i.customId !== `vill_board_claim_${userId}`) { i.deferUpdate().catch(() => {}); return false; }
      return true;
    },
    componentType: ComponentType.Button,
    time: 60_000
  }).catch(() => null);

  if (!btn) { await interaction.editReply({ components: [] }); return; }
  await btn.deferUpdate();

  // Claim all ready bounties
  let totalGold = 0;
  const itemsClaimed: string[] = [];
  for (let i = 0; i < bounties.length; i++) {
    if (isClaimed(userId, guildId, date, i)) continue;
    if (!bounties[i].check(userId, guildId)) continue;
    db.prepare('INSERT OR IGNORE INTO village_bounty_claims (user_id, guild_id, date, slot) VALUES (?, ?, ?, ?)')
      .run(userId, guildId, date, i);
    totalGold += bounties[i].reward.gold;
    if (bounties[i].reward.item) {
      addItem(userId, guildId, bounties[i].reward.item!, 1);
      itemsClaimed.push(bounties[i].reward.item!);
    }
  }

  db.prepare('UPDATE players SET gold=gold+? WHERE user_id=? AND guild_id=?').run(totalGold, userId, guildId);

  await interaction.editReply({
    embeds: [new EmbedBuilder()
      .setColor(COLORS.success)
      .setTitle('🎁 Nhận thưởng nhiệm vụ!')
      .setDescription(
        `🪙 **+${totalGold} Gold**` +
        (itemsClaimed.length > 0
          ? '\n' + itemsClaimed.map(id => `${getItem(id)?.icon ?? ''} ${getItem(id)?.name ?? id}`).join(', ')
          : '')
      )],
    components: [backRow(userId)]
  });
}
