import {
  ChatInputCommandInteraction, ButtonInteraction,
  EmbedBuilder, ButtonBuilder, ButtonStyle,
  ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder,
  ComponentType, StringSelectMenuInteraction, ModalBuilder, TextInputBuilder, TextInputStyle
} from 'discord.js';
import {
  getPlayer, getInventory, getItemQty, removeItem, addItem,
  grantGold, spendGold, grantExp, grantSoulShards, updatePlayerHpMp, incrementKills,
  adjustReputation, adjustWanted, getWantedLevel, getWantedTitle, adjustFaction,
  addPermanentStat, addKeepItemCharge, addExtraSkillSlot, improveDeathPenaltyReduction,
  addRebirthBlessing, addMerchantMercy
} from '../player';
import { getZone, ZONE_ORDER } from '../../data/zones';
import { getItem } from '../../data/items';
import { getMaterial } from '../../data/materials';
import { getEquipment, getZoneEquipment } from '../../data/equipment';
import { withTransaction } from '../../database/transaction';
import {
  logEvent, getEffectiveShopMarkup, increaseShopMarkup,
  getShopkeeperThreatMultiplier, getShopkeeperRobberyCount, recordShopkeeperRobbery,
  increaseMerchantFear, adjustWorldDanger
} from '../world';
import { consumeBuff } from '../consumables';
import { startCombatFlowWithEnemy } from '../combatFlow';
import { COLORS } from '../../utils/embeds';
import { withImage } from '../../utils/eventImages';
import { onlyParty, onlyUser } from '../../utils/collectors';
import { pick, randInt } from '../../utils/format';
import { handleVictory, handleDeath, handleFlee } from './callbacks';
import { simpleEmbed, buildContinueExploreRow, attachContinueExploreHandler } from './shared';
import { buildBatchBuyRow, batchTotal, formatBatchCost, parseBatchBuyId, parsePositiveQuantity } from '../shopBatch';

type MerchantStock = {
  itemIds: string[];
  equipmentIds: string[];
};

type MerchantItem = NonNullable<ReturnType<typeof getItem>>;
type MerchantEquipment = ReturnType<typeof getZoneEquipment>[number];

function shuffleStock<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function takeRandomStock<T>(items: T[], count: number): T[] {
  return shuffleStock(items).slice(0, Math.max(0, count));
}

function takeWeightedUnique<T>(
  items: T[],
  count: number,
  weightFn: (item: T) => number
): T[] {
  const pool = items
    .map(item => ({ item, weight: Math.max(0, weightFn(item)) }))
    .filter(x => x.weight > 0);

  const picked: T[] = [];
  while (picked.length < count && pool.length > 0) {
    const total = pool.reduce((sum, x) => sum + x.weight, 0);
    let roll = Math.random() * total;
    let index = 0;

    for (; index < pool.length; index++) {
      roll -= pool[index].weight;
      if (roll <= 0) break;
    }

    const [chosen] = pool.splice(Math.min(index, pool.length - 1), 1);
    picked.push(chosen.item);
  }

  return picked;
}

function uniqueIds(ids: string[]): string[] {
  return [...new Set(ids)];
}

function merchantPrice(basePrice: number, discount: number, markup: number): number {
  return Math.max(1, Math.floor(basePrice * Math.max(20, 100 - discount + markup) / 100));
}

function buildRandomMerchantStock(zoneId: string): MerchantStock {
  const zone = getZone(zoneId)!;
  const zoneIdx = Math.max(0, ZONE_ORDER.indexOf(zoneId));

  const commonConsumableIds = [
    'minor_healing_potion','health_potion','healing_potion','emergency_potion','mana_potion','mana_flask',
    'quick_salve','shadow_mana_vial','antidote','cooling_salve','purifying_salt','holy_water','moonwater',
    'weapon_oil','armor_polish','hunter_meal','bone_broth','stone_skin_draught','quickstep_tea','rage_elixir',
    'scroll_escape','scroll_detection','scroll_fortune','scroll_silence','scroll_mirror',
    'strange_mushroom','suspicious_fish','fate_dice','chaos_flask','bribe_coin','warding_charm','ancient_book'
  ];
  const buyableItems = uniqueIds([...zone.shopItems, ...commonConsumableIds])
    .map(id => getItem(id))
    .filter((item): item is MerchantItem => Boolean(item?.buyPrice));

  const consumables = buyableItems.filter(item => item.type === 'consumable');

  const itemStock: MerchantItem[] = [];

  // Luôn có ít nhất 1 đồ hồi phục/tiện ích, nhưng không bày toàn bộ shop.
  const consumableCount = Math.min(consumables.length, zoneIdx >= 3 ? randInt(2, 4) : randInt(1, 3));
  itemStock.push(...takeRandomStock(consumables, consumableCount));

  // Skill book lẻ đã được gộp thành Ancient Book. Merchant chỉ bán consumable/token.

  // Fallback để tránh shop trống nếu zone không có consumable buyPrice.
  if (itemStock.length === 0 && buyableItems.length > 0) {
    itemStock.push(pick(buyableItems));
  }

  const equipmentPool = getZoneEquipment(zoneId)
    .filter(eq => Boolean(eq.buyPrice))
    .filter(eq => {
      if (eq.rarity === 'common' || eq.rarity === 'rare') return true;
      if (eq.rarity === 'epic' && zoneIdx >= 3) return true;
      if (eq.rarity === 'legendary' && zoneIdx >= 4) return true;
      return false;
    });

  const equipmentCount = Math.min(
    equipmentPool.length,
    zoneIdx === 0 ? 1 : Math.random() < 0.75 ? 1 : 2
  );

  const equipmentStock = takeWeightedUnique<MerchantEquipment>(
    equipmentPool,
    equipmentCount,
    eq => {
      if (eq.rarity === 'common') return 100;
      if (eq.rarity === 'rare') return zoneIdx <= 0 ? 0 : 30;
      return 0;
    }
  );

  return {
    itemIds: uniqueIds(itemStock.map(item => item.id)),
    equipmentIds: uniqueIds(equipmentStock.map(eq => eq.id))
  };
}

// ── Merchant encounter ────────────────────────────────────────────────────────
export async function showMerchant(
  interaction: ChatInputCommandInteraction, userId: string, guildId: string,
  partyMemberIds?: string[], partyMemberNames?: Record<string, string>
): Promise<void> {
  const player = getPlayer(userId, guildId)!;
  const zone   = getZone(player.zone_id)!;

  const { getShopDiscount } = await import('../world');
  const fakeId = consumeBuff(userId, guildId, 'fake_identity');
  const discount = getShopDiscount(guildId) + (fakeId ? 10 : 0);
  const markup = getEffectiveShopMarkup(guildId);

  const stock = buildRandomMerchantStock(zone.id);
  await renderMerchantBuy(interaction, userId, guildId, zone.id, discount, markup, player.gold, stock, partyMemberIds, partyMemberNames);
}

export async function renderMerchantBuy(
  interaction: ChatInputCommandInteraction,
  userId: string, guildId: string, zoneId: string,
  discount: number, markup: number, playerGold: number, stock: MerchantStock,
  partyMemberIds?: string[], partyMemberNames?: Record<string, string>
): Promise<void> {
  const zone  = getZone(zoneId)!;
  const isPartyShop = !!(partyMemberIds && partyMemberIds.length > 1);
  const partyShopNote = isPartyShop
    ? '\n\n👥 **Party Shop:** Ai bấm mua/bán thì dùng Gold/kho đồ của người đó. Chỉ leader được cướp hoặc rời shop.'
    : '';

  const shopItems = stock.itemIds
    .map(id => getItem(id))
    .filter((item): item is MerchantItem => Boolean(item?.buyPrice));

  // Random equipment stock for this merchant encounter.
  const eqItems = stock.equipmentIds
    .map(id => getEquipment(id))
    .filter((eq): eq is MerchantEquipment => Boolean(eq?.buyPrice));

  const itemLines = [
    ...shopItems.map(item => {
      if (!item.buyPrice) return '';
      const price = merchantPrice(item.buyPrice, discount, markup);
      return `${item.icon} **${item.name}** — **${price}** 🪙`;
    }),
    eqItems.length ? '\n⚔️ **Trang bị:**' : '',
    ...eqItems.map(eq => {
      const price = merchantPrice(eq.buyPrice!, discount, markup);
      const statsStr = Object.entries(eq.stats).map(([k,v]) => `+${v} ${k}`).join(', ');
      return `${eq.icon} **${eq.name}** (${statsStr}) — **${price}** 🪙`;
    })
  ].filter(Boolean).join('\n');

  const discountNote = [
    discount > 0 ? `🛒 Giảm giá **${discount}%** đang có!` : '',
    markup > 0 ? `⚠️ Giá shop đang bị tăng **${markup}%** vì thương nhân bị cướp.` : ''
  ].filter(Boolean).join('\n> ');
  const priceNote = discountNote ? `\n> ${discountNote}\n` : '';

  const embed = new EmbedBuilder()
    .setColor(COLORS.gold)
    .setTitle('🛒 Lái Buôn Lữ Hành!')
    .setDescription(
      `*Một lái buôn xuất hiện từ sau cây...*\n` +
      `📦 Kho hàng hôm nay là **ngẫu nhiên**. Hàng hiếm xuất hiện ít, không phải lúc nào cũng có.\n` +
      priceNote + '\n' + (itemLines || '*Hôm nay lái buôn không có gì đáng mua.*') + `\n\n🪙 Gold leader: **${playerGold}**` + partyShopNote
    );

  const allBuyOptions = [
    ...shopItems.filter(i => i.buyPrice).map(i => {
      const price = merchantPrice(i.buyPrice!, discount, markup);
      return new StringSelectMenuOptionBuilder()
        .setLabel(`${i.name} — ${price} 🪙`)
        .setDescription(i.description.replace(/\*\*/g, '').slice(0, 50))
        .setValue(`buy_${i.id}`)
        .setEmoji(i.icon);
    }),
    ...eqItems.map(eq => {
      const price = merchantPrice(eq.buyPrice!, discount, markup);
      const statsStr = Object.entries(eq.stats).map(([k,v]) => `+${v} ${k}`).join(', ');
      return new StringSelectMenuOptionBuilder()
        .setLabel(`${eq.name} — ${price} 🪙`)
        .setDescription(`⚔️ ${eq.slot} · ${statsStr}`.slice(0, 50))
        .setValue(`buyeq_${eq.id}`)
        .setEmoji(eq.icon);
    })
  ].slice(0, 25); // Discord limit

  const buyOptions = allBuyOptions;

  const rows: ActionRowBuilder<any>[] = [];

  if (buyOptions.length) {
    rows.push(new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`merch_buy_${userId}`)
        .setPlaceholder('Mua vật phẩm...')
        .addOptions(buyOptions)
    ));
  }

  rows.push(new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`merch_sell_${userId}`).setLabel('Bán đồ').setEmoji('💰').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`merch_rob_${userId}`).setLabel('Cướp shopkeeper').setEmoji('🗡️').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`merch_leave_${userId}`).setLabel('Rời đi').setEmoji('🚶').setStyle(ButtonStyle.Secondary)
  ));

  const { embed: merchEmbed, files: merchFiles } = withImage(embed, 'merchant');
  const reply = await interaction.editReply({ embeds: [merchEmbed], files: merchFiles, components: rows });

  const collector = reply.createMessageComponentCollector({
    filter: isPartyShop ? onlyParty(userId, partyMemberIds!) : onlyUser(userId),
    time: 60_000
  });

  async function completeMerchantPurchase(buyerId: string, kind: 'item' | 'eq', itemId: string, requestedQty: number): Promise<void> {
    const isBuyEq = kind === 'eq';
    const qty = isBuyEq ? 1 : Math.max(1, requestedQty);
    const fresh = getPlayer(buyerId, guildId)!;

    let unitPrice = 0;
    let displayName = '';

    if (isBuyEq) {
      if (!stock.equipmentIds.includes(itemId)) return;
      const eq = getEquipment(itemId);
      if (!eq?.buyPrice) return;
      unitPrice = merchantPrice(eq.buyPrice, discount, markup);
      displayName = `${eq.icon} ${eq.name}`;
    } else {
      if (!stock.itemIds.includes(itemId)) return;
      const item = getItem(itemId);
      if (!item?.buyPrice) return;
      unitPrice = merchantPrice(item.buyPrice, discount, markup);
      displayName = `${item.icon} ${item.name}`;
    }

    const total = batchTotal(unitPrice, qty);
    if (fresh.gold < total) {
      await interaction.editReply({
        embeds: [new EmbedBuilder().setColor(COLORS.danger).setDescription(`❌ **${fresh.name}** không đủ Gold! Cần **${total} 🪙**, đang có **${fresh.gold} 🪙**.`)],
        components: buildContinueExploreRow(userId)
      });
      return;
    }

    withTransaction(() => {
      spendGold(buyerId, guildId, total);
      addItem(buyerId, guildId, itemId, qty);
    });
    if (isBuyEq) stock.equipmentIds = stock.equipmentIds.filter(id => id !== itemId);
    else stock.itemIds = stock.itemIds.filter(id => id !== itemId);

    const updatedPlayer = getPlayer(buyerId, guildId)!;
    const boughtEmbed = new EmbedBuilder().setColor(COLORS.gold)
      .setTitle('🛒 Lái Buôn Lữ Hành!')
      .setDescription(
        `✅ **${updatedPlayer.name}** đã mua **${displayName}**${qty > 1 ? ` ×${qty}` : ''}
` +
        `💸 Chi phí: **${formatBatchCost(unitPrice, qty)}**
` +
        `🪙 Gold còn lại: **${updatedPlayer.gold}**

` +
        `Lái buôn cập nhật lại quầy hàng...`
      );
    await interaction.editReply({ embeds: [boughtEmbed], components: [] });
    collector.stop('rerender');
    await renderMerchantBuy(interaction, userId, guildId, zoneId, discount, markup, getPlayer(userId, guildId)?.gold ?? updatedPlayer.gold, stock, partyMemberIds, partyMemberNames);
  }

  collector.on('collect', async (compInt) => {
    const cid = (compInt as any).customId as string;

    if (cid.startsWith('merch_buycustom:')) {
      const [, leaderId, buyerId, kind, itemId] = cid.split(':');
      if (leaderId !== userId || compInt.user.id !== buyerId || (kind !== 'item' && kind !== 'eq')) return;

      const modalId = `merch_buymodal:${leaderId}:${buyerId}:${kind}:${itemId}`;
      const modal = new ModalBuilder()
        .setCustomId(modalId)
        .setTitle('Nhập số lượng muốn mua')
        .addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId('quantity')
            .setLabel('Số lượng')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Ví dụ: 12')
            .setRequired(true)
            .setMaxLength(4)
        ));

      const modalShown = await compInt.showModal(modal).then(() => true).catch((err) => {
        console.warn('[MERCHANT] showModal (mua nhiều) lỗi:', err?.message ?? err);
        return false;
      });
      if (!modalShown) {
        await interaction.editReply({ embeds: [simpleEmbed(COLORS.warning, '⚠️ Không mở được form nhập số lượng (lỗi kết nối). Hãy bấm lại nút mua.')], components: buildContinueExploreRow(userId) });
        return;
      }

      const modalSubmit = await compInt.awaitModalSubmit({
        time: 45_000,
        filter: i => i.user.id === buyerId && i.customId === modalId,
      }).catch((err) => {
        console.warn('[MERCHANT] awaitModalSubmit (mua nhiều) lỗi:', err?.message ?? err);
        return null;
      });
      if (!modalSubmit) return;
      await modalSubmit.deferUpdate().catch((err) => console.warn('[MERCHANT] deferUpdate modal (mua nhiều) lỗi:', err?.message ?? err));

      const qty = parsePositiveQuantity(modalSubmit.fields.getTextInputValue('quantity'), 999);
      if (!qty) {
        await interaction.editReply({ embeds: [simpleEmbed(COLORS.warning, '⚠️ Số lượng không hợp lệ. Hãy nhập số nguyên lớn hơn 0.')], components: buildContinueExploreRow(userId) });
        return;
      }

      await completeMerchantPurchase(buyerId, kind, itemId, qty);
      return;
    }

    const deferred = await compInt.deferUpdate().then(() => true).catch(() => false);
    if (!deferred) return;

    if (cid === `merch_leave_${userId}`) {
      if (compInt.user.id !== userId) {
        await interaction.editReply({ embeds: [new EmbedBuilder(merchEmbed.toJSON()).setFooter({ text: '👥 Chỉ leader party mới được rời shop cho cả nhóm.' })] }).catch(() => {});
        return;
      }
      collector.stop();
      const leaveReply = await interaction.editReply({ embeds: [simpleEmbed(COLORS.info, '🚶 Bạn vẫy tay chào lái buôn và bước đi.')], components: buildContinueExploreRow(userId) });
      attachContinueExploreHandler(leaveReply, interaction, userId, guildId);

    } else if (cid === `merch_sell_${userId}`) {
      collector.stop();
      await renderMerchantSell(interaction, userId, guildId, zoneId, discount, markup, stock, compInt.user.id, partyMemberIds, partyMemberNames);

    } else if (cid === `merch_rob_${userId}`) {
      if (compInt.user.id !== userId) {
        await interaction.editReply({ embeds: [new EmbedBuilder(merchEmbed.toJSON()).setFooter({ text: '👥 Chỉ leader party mới được chọn cướp shopkeeper.' })] }).catch(() => {});
        return;
      }
      collector.stop();
      await renderShopkeeperRobPrompt(interaction, userId, guildId, zoneId, stock);

    } else if (cid.startsWith('merch_buycancel:')) {
      const [, leaderId, buyerId] = cid.split(':');
      if (leaderId !== userId || compInt.user.id !== buyerId) return;
      collector.stop('rerender');
      await renderMerchantBuy(interaction, userId, guildId, zoneId, discount, markup, getPlayer(userId, guildId)?.gold ?? playerGold, stock, partyMemberIds, partyMemberNames);

    } else if (cid.startsWith('merch_buyqty:')) {
      const parsed = parseBatchBuyId(cid, 'merch_buyqty');
      if (!parsed || parsed.leaderId !== userId || compInt.user.id !== parsed.actorId) return;
      await completeMerchantPurchase(parsed.actorId, parsed.kind, parsed.itemId, parsed.qty);

    } else if (cid === `merch_buy_${userId}`) {
      const sel = compInt as StringSelectMenuInteraction;
      const rawVal  = sel.values[0];
      const isBuyEq = rawVal.startsWith('buyeq_');
      const itemId  = rawVal.replace('buyeq_', '').replace('buy_', '');
      const buyerId = compInt.user.id;
      const fresh   = getPlayer(buyerId, guildId)!;

      let unitPrice = 0;
      let displayName = '';
      let detailLine = '';

      if (isBuyEq) {
        if (!stock.equipmentIds.includes(itemId)) return;
        const eq = getEquipment(itemId);
        if (!eq?.buyPrice) return;
        unitPrice = merchantPrice(eq.buyPrice, discount, markup);
        displayName = `${eq.icon} ${eq.name}`;
        const statsStr = Object.entries(eq.stats).map(([k,v]) => `+${v} ${k}`).join(', ');
        detailLine = `${eq.slot} · ${statsStr || 'starter gear'}`;
      } else {
        if (!stock.itemIds.includes(itemId)) return;
        const item = getItem(itemId);
        if (!item?.buyPrice) return;
        unitPrice = merchantPrice(item.buyPrice, discount, markup);
        displayName = `${item.icon} ${item.name}`;
        detailLine = item.description.replace(/\*\*/g, '');
      }

      const confirmEmbed = new EmbedBuilder()
        .setColor(COLORS.gold)
        .setTitle('🛒 Xác nhận mua')
        .setDescription(
          `Người mua: **${fresh.name}**

` +
          `**${displayName}**
${detailLine}

` +
          (isBuyEq
            ? `Giá: **${unitPrice} 🪙**
Gold hiện có: **${fresh.gold} 🪙**`
            : `Đơn giá: **${unitPrice} 🪙**
Mua nhanh: **x1 / x5 / x10**
Gold hiện có: **${fresh.gold} 🪙**`)
        );

      const confirmRow = buildBatchBuyRow({
        prefix: 'merch_buyqty',
        leaderId: userId,
        actorId: buyerId,
        kind: isBuyEq ? 'eq' : 'item',
        itemId,
        unitPrice,
        actorGold: fresh.gold,
        cancelCustomId: `merch_buycancel:${userId}:${buyerId}`,
        customQtyCustomId: `merch_buycustom:${userId}:${buyerId}:${isBuyEq ? 'eq' : 'item'}:${itemId}`,
      });

      await interaction.editReply({ embeds: [confirmEmbed], components: [confirmRow] });

    }
  });

  collector.on('end', (_c, reason) => {
    if (reason === 'time') {
      interaction.editReply({
        embeds: [simpleEmbed(COLORS.info, '🚶 Lái buôn đã rời đi.')],
        components: buildContinueExploreRow(userId)
      }).then(r => attachContinueExploreHandler(r, interaction, userId, guildId)).catch(() => {});
    }
  });
}

export async function renderMerchantSell(
  interaction: ChatInputCommandInteraction,
  userId: string, guildId: string, zoneId: string, discount: number, markup: number, stock: MerchantStock,
  sellerId = userId, partyMemberIds?: string[], partyMemberNames?: Record<string, string>
): Promise<void> {
  const player    = getPlayer(sellerId, guildId)!;
  const inventory = getInventory(sellerId, guildId);
  const sellable  = inventory
    .map(e => ({ entry: e, item: getItem(e.item_id) ?? getMaterial(e.item_id) }))
    .filter(({ item }) => item?.sellPrice && (item as any).type !== 'key_item');

  if (!sellable.length) {
    await interaction.editReply({
      embeds: [simpleEmbed(COLORS.info, '🎒 Không có gì để bán cả.')],
      components: [
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder().setCustomId(`sell_back_${sellerId}`).setLabel('Quay lại').setEmoji('↩️').setStyle(ButtonStyle.Secondary)
        )
      ]
    });

    const reply = await interaction.fetchReply();
    const btn = await reply.awaitMessageComponent({
      componentType: ComponentType.Button, filter: onlyUser(sellerId), time: 20_000
    }).catch(() => null);
    if (btn) {
      const deferred = await btn.deferUpdate().then(() => true).catch(() => false);
      if (deferred) {
        const fresh = getPlayer(userId, guildId)!;
        await renderMerchantBuy(interaction, userId, guildId, zoneId, discount, markup, getPlayer(userId, guildId)?.gold ?? fresh.gold, stock, partyMemberIds, partyMemberNames);
      }
    }
    return;
  }

  const options = sellable.map(({ entry, item }) =>
    new StringSelectMenuOptionBuilder()
      .setLabel(`${item!.name} ×${entry.quantity}`)
      .setDescription(`Bán: ${item!.sellPrice} 🪙 mỗi cái`)
      .setValue(`sell_${entry.item_id}`)
      .setEmoji(item!.icon)
  );

  const embed = new EmbedBuilder().setColor(COLORS.gold)
    .setTitle('💰 Bán Đồ')
    .setDescription(`🪙 Gold hiện tại: **${player.gold}**\nChọn vật phẩm muốn bán:`)
    .addFields(
      sellable.slice(0, 25).map(({ entry, item }) => ({
        name: `${item!.icon} ${item!.name} ×${entry.quantity}`,
        value: `${item!.sellPrice} 🪙/cái`,
        inline: true
      }))
    );

  const rows: ActionRowBuilder<any>[] = [
    new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`merch_sellitem_${sellerId}`)
        .setPlaceholder('Chọn vật phẩm để bán...')
        .addOptions(options.slice(0, 25))
    ),
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId(`merch_sellback_${sellerId}`).setLabel('Quay lại shop').setEmoji('↩️').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`merch_sellleave_${sellerId}`).setLabel('Rời đi').setEmoji('🚶').setStyle(ButtonStyle.Secondary)
    )
  ];

  const { embed: sellEmbed, files: sellFiles } = withImage(embed, 'merchant');
  const reply = await interaction.editReply({ embeds: [sellEmbed], files: sellFiles, components: rows });

  const collector = reply.createMessageComponentCollector({
    filter: onlyUser(sellerId), time: 60_000
  });

  collector.on('collect', async (compInt) => {
    const deferred = await compInt.deferUpdate().then(() => true).catch(() => false);
    if (!deferred) return;

    const cid = (compInt as any).customId as string;

    if (cid === `merch_sellback_${sellerId}`) {
      collector.stop();
      const fresh = getPlayer(userId, guildId)!;
      await renderMerchantBuy(interaction, userId, guildId, zoneId, discount, markup, getPlayer(userId, guildId)?.gold ?? fresh.gold, stock, partyMemberIds, partyMemberNames);
    } else if (cid === `merch_sellleave_${sellerId}`) {
      collector.stop();
      const leaveReply = await interaction.editReply({ embeds: [simpleEmbed(COLORS.info, '🚶 Bạn vẫy tay chào lái buôn và bước đi.')], components: buildContinueExploreRow(userId) });
      attachContinueExploreHandler(leaveReply, interaction, userId, guildId);
    } else if (cid === `merch_sellitem_${sellerId}`) {
      const sel    = compInt as StringSelectMenuInteraction;
      const itemId = sel.values[0].replace('sell_', '');
      const item   = getItem(itemId) ?? getMaterial(itemId);
      if (!item?.sellPrice) return;

      const qty = getItemQty(sellerId, guildId, itemId);
      if (qty <= 0) return;

      const sellPrice = item.sellPrice; // narrowed to number by the guard above
      withTransaction(() => {
        removeItem(sellerId, guildId, itemId, 1);
        grantGold(sellerId, guildId, sellPrice);
      });

      const fresh = getPlayer(sellerId, guildId)!;
      await interaction.editReply({
        embeds: [
          new EmbedBuilder().setColor(COLORS.gold)
            .setTitle('💰 Bán Đồ')
            .setDescription(`✅ **${fresh.name}** bán **${item.icon} ${item.name}** → +**${item.sellPrice}** 🪙\n🪙 Gold: **${fresh.gold}**`)
            .addFields(
              sellable
                .map(({ entry, item: it }) => {
                  const currentQty = entry.item_id === itemId ? qty - 1 : entry.quantity;
                  return currentQty > 0 ? { name: `${it!.icon} ${it!.name} ×${currentQty}`, value: `${it!.sellPrice} 🪙/cái`, inline: true } : null;
                })
                .filter(Boolean).slice(0, 25) as any[]
            )
        ]
      });
    }
  });

  collector.on('end', (_c, reason) => {
    if (reason === 'time') {
      interaction.editReply({
        embeds: [simpleEmbed(COLORS.info, '🚶 Lái buôn đã rời đi.')],
        components: buildContinueExploreRow(userId)
      }).then(r => attachContinueExploreHandler(r, interaction, userId, guildId)).catch(() => {});
    }
  });
}

function formatMerchantStock(stock: MerchantStock): string {
  const itemLines = stock.itemIds
    .map(id => getItem(id))
    .filter(Boolean)
    .map(item => `${item!.icon} ${item!.name}`);
  const gearLines = stock.equipmentIds
    .map(id => getEquipment(id))
    .filter(Boolean)
    .map(eq => `${eq!.icon} ${eq!.name}`);
  const lines = [...itemLines, ...gearLines];
  return lines.length ? lines.join('\n') : '*Không còn hàng để cướp.*';
}

function buildShopkeeperEnemy(player: any, zoneId: string, stock: MerchantStock, multiplier: number, wantedLevel = 0, merchantFear = 0) {
  const zoneIdx = Math.max(0, ZONE_ORDER.indexOf(zoneId));
  const stockCount = stock.itemIds.length + stock.equipmentIds.length;
  const pressure = 1 + wantedLevel * 0.12 + merchantFear / 250;
  const hp = Math.floor((Math.max(120, player.max_hp * 1.25) + zoneIdx * 45 + stockCount * 10) * multiplier * pressure);
  const atk = Math.floor((Math.max(12, player.atk + 7) + zoneIdx * 4 + stockCount) * multiplier * pressure);
  const def = Math.floor((Math.max(5, player.def + 3) + zoneIdx * 2 + Math.floor(stockCount / 2)) * multiplier * pressure);

  return {
    id: `shopkeeper_${player.user_id}_${Date.now()}`,
    name: wantedLevel >= 4 ? 'Merchant Guardian' : multiplier > 1 ? 'Veteran Shopkeeper' : 'Shopkeeper',
    icon: wantedLevel >= 4 ? '🛡️' : multiplier > 1 ? '🛡️' : '🧔',
    level: Math.max(1, player.level + zoneIdx + wantedLevel + (multiplier > 1 ? 3 : 1)),
    hp, atk, def,
    boss: false,
    lore: 'Một lái buôn không hề yếu như vẻ ngoài.',
    isShopkeeper: true,
    shopStock: { itemIds: [...stock.itemIds], equipmentIds: [...stock.equipmentIds] },
    shopStockUsed: false
  };
}

async function renderShopkeeperRobPrompt(
  interaction: ChatInputCommandInteraction, userId: string, guildId: string, zoneId: string, stock: MerchantStock
): Promise<void> {
  const multiplier = getShopkeeperThreatMultiplier(guildId, userId);
  const wanted = getWantedLevel(userId, guildId);
  const wantedText = getWantedTitle(wanted);
  const robberyCount = getShopkeeperRobberyCount(guildId, userId);
  const memoryLine = robberyCount > 0
    ? `\n\n🧠 *"Lại là ngươi...? Ta đã chuẩn bị rồi."*`
    : '';
  const embed = new EmbedBuilder()
    .setColor(COLORS.danger)
    .setTitle('🗡️ Cướp Shopkeeper?')
    .setDescription(
      `Bạn đặt tay lên vũ khí. Lái buôn lùi lại, nhưng ánh mắt hắn không hề sợ hãi.\n\n` +
      `Nếu giết được hắn, bạn sẽ cướp được **hàng còn lại trong shop hiện tại**:\n${formatMerchantStock(stock)}\n\n` +
      `⚠️ Hậu quả:\n` +
      `• Reputation của bạn giảm mạnh.\n` +
      `• Giá shop toàn thế giới tăng thêm **10%**.\n` +
      `• Sau khi từng giết shopkeeper, lần cướp sau shopkeeper sẽ có **x2 stats**.\n` +
      `• Khi còn **50% HP**, shopkeeper sẽ dùng sạch hàng đang bán để hồi máu/tăng stats.\n\n` +
      `📜 Wanted hiện tại: **${wanted}/5 — ${wantedText}**` + memoryLine + `\n` +
      (multiplier > 1 ? `🛡️ **Shopkeeper lần này đã cảnh giác: x2 stats.**` : `Bạn chưa từng giết shopkeeper, hắn vẫn chưa gọi vệ sĩ.`)
    );

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`rob_confirm_${userId}`).setLabel('Tấn công').setEmoji('🗡️').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`rob_cancel_${userId}`).setLabel('Thôi').setEmoji('🚶').setStyle(ButtonStyle.Secondary)
  );

  const reply = await interaction.editReply({ embeds: [embed], components: [row] });
  const btn = await reply.awaitMessageComponent({ componentType: ComponentType.Button, filter: onlyUser(userId), time: 30_000 }).catch(() => null);
  const deferred = await btn?.deferUpdate().then(() => true).catch(() => false);

  if (!btn || !deferred || btn.customId !== `rob_confirm_${userId}`) {
    const res = await interaction.editReply({ embeds: [simpleEmbed(COLORS.info, '🚶 Bạn hạ tay khỏi vũ khí. Lái buôn nhìn bạn thêm vài giây rồi tiếp tục dọn hàng.')], components: buildContinueExploreRow(userId) });
    attachContinueExploreHandler(res, interaction, userId, guildId);
    return;
  }

  await startShopkeeperCombat(interaction, userId, guildId, zoneId, stock);
}

async function startShopkeeperCombat(
  interaction: ChatInputCommandInteraction, userId: string, guildId: string, zoneId: string, stock: MerchantStock
): Promise<void> {
  const player = getPlayer(userId, guildId)!;
  const multiplier = getShopkeeperThreatMultiplier(guildId, userId);
  const enemy = buildShopkeeperEnemy(player, zoneId, stock, multiplier, getWantedLevel(userId, guildId), (await import('../world')).getMerchantFear(guildId));
  (enemy as any).onMercy = handleShopkeeperMercyChoice;

  await startCombatFlowWithEnemy(
    interaction, userId, guildId, enemy,
    undefined,
    handleShopkeeperVictory,
    handleDeath,
    handleFlee
  );
}


async function handleShopkeeperMercyChoice(
  interaction: ChatInputCommandInteraction, btnInt: ButtonInteraction,
  userId: string, guildId: string, player: any, enemy: any, state: any, cid: string
): Promise<void> {
  updatePlayerHpMp(userId, guildId, state.player_hp, state.player_mp);
  const stock: MerchantStock = enemy.shopStock ?? { itemIds: [], equipmentIds: [] };
  const drops = [...(stock.itemIds ?? []), ...(stock.equipmentIds ?? [])];

  if (cid === `shopmercy_spare_${userId}`) {
    const rep = adjustReputation(userId, guildId, 12);
    const wanted = adjustWanted(userId, guildId, -1);
    const merchantFaction = adjustFaction(userId, guildId, 'merchants', 10);
    logEvent(guildId, userId, player.name, 'shopkeeper_mercy', `${player.name} đã tha mạng shopkeeper.`, player.zone_id);
    const embed = new EmbedBuilder().setColor(COLORS.success)
      .setTitle('🙏 Tha Mạng Shopkeeper')
      .setDescription(
        `Bạn hạ vũ khí xuống. Shopkeeper ôm lấy vết thương rồi biến mất vào màn sương.

` +
        `🤝 Reputation: **${rep}** (+12)
` +
        `📜 Wanted: **${wanted}/5** (-1)
` +
        `🏛️ Hội Thương Nhân: **${merchantFaction}** (+10)
` +
        `*Hắn sẽ nhớ lòng thương xót này.*`
      );
    await btnInt.editReply({ embeds: [embed], components: buildContinueExploreRow(userId) });
    attachContinueExploreHandler(btnInt.message, interaction, userId, guildId);
    return;
  }

  if (cid === `shopmercy_take_${userId}`) {
    const takeCount = Math.min(drops.length, randInt(1, 2));
    const taken = drops.slice(0, takeCount);
    for (const id of taken) addItem(userId, guildId, id, 1);
    const rep = adjustReputation(userId, guildId, -12);
    const wanted = adjustWanted(userId, guildId, 1);
    const merchantFaction = adjustFaction(userId, guildId, 'merchants', -12);
    logEvent(guildId, userId, player.name, 'shopkeeper_extortion', `${player.name} ép shopkeeper giao nộp hàng.`, player.zone_id);
    const dropText = taken.length ? taken.map(id => {
      const item = getItem(id); const eq = getEquipment(id);
      return `${item?.icon ?? eq?.icon ?? '🎁'} **${item?.name ?? eq?.name ?? id}**`;
    }).join('\n') : '*Shopkeeper không còn gì để giao nộp.*';
    const embed = new EmbedBuilder().setColor(COLORS.warning)
      .setTitle('💰 Ép Giao Nộp Hàng')
      .setDescription(
        `Bạn ép shopkeeper nộp hàng rồi để hắn sống.\n\n` +
        `📦 **Nhận được:**\n${dropText}\n\n` +
        `🤝 Reputation: **${rep}** (-12)\n` +
        `📜 Wanted: **${wanted}/5** (+1)\n` +
        `🏛️ Hội Thương Nhân: **${merchantFaction}** (-12)`
      );
    await btnInt.editReply({ embeds: [embed], components: buildContinueExploreRow(userId) });
    attachContinueExploreHandler(btnInt.message, interaction, userId, guildId);
    return;
  }

  // Kết liễu khi shopkeeper đã van xin: nhận toàn bộ hàng còn lại nhưng phạt nặng hơn.
  enemy.shopStock = stock;
  await handleShopkeeperVictory(interaction, btnInt, userId, guildId, player, enemy, state);
}

async function handleShopkeeperVictory(
  interaction: ChatInputCommandInteraction, btnInt: ButtonInteraction,
  userId: string, guildId: string, player: any, enemy: any,
  state: any
): Promise<void> {
  updatePlayerHpMp(userId, guildId, state.player_hp, state.player_mp);
  incrementKills(userId, guildId);

  const stock: MerchantStock = enemy.shopStock ?? { itemIds: [], equipmentIds: [] };
  const drops = [...(stock.itemIds ?? []), ...(stock.equipmentIds ?? [])];
  for (const id of drops) addItem(userId, guildId, id, 1);

  const rep = adjustReputation(userId, guildId, -30);
  const wanted = adjustWanted(userId, guildId, 1);
  const merchantFaction = adjustFaction(userId, guildId, 'merchants', -25);
  adjustFaction(userId, guildId, 'shadow_court', 8);
  const markup = increaseShopMarkup(guildId, 10, 75);
  const fear = increaseMerchantFear(guildId, 12);
  const danger = adjustWorldDanger(guildId, 5);
  const robberyCount = recordShopkeeperRobbery(guildId, userId);
  logEvent(guildId, userId, player.name, 'shopkeeper_robbery', `${player.name} đã giết một shopkeeper. Wanted ${wanted}/5, giá shop +${markup}%, reputation ${rep}.`, player.zone_id);

  const dropText = drops.length
    ? drops.map(id => {
        const item = getItem(id);
        const eq = getEquipment(id);
        return `${item?.icon ?? eq?.icon ?? '🎁'} **${item?.name ?? eq?.name ?? id}**`;
      }).join('\n')
    : '*Shopkeeper đã dùng sạch hàng khi còn 50% HP, không còn gì để cướp.*';

  const embed = new EmbedBuilder()
    .setColor(COLORS.danger)
    .setTitle('🗡️ Shopkeeper đã ngã xuống')
    .setDescription(
      `Bạn lục soát quầy hàng đổ nát.\n\n` +
      `📦 **Đồ cướp được:**\n${dropText}\n\n` +
      `🤝 Reputation: **${rep}** (**−30**)\n` +
      `📜 Wanted: **${wanted}/5 — ${getWantedTitle(wanted)}** (**+1**)\n` +
      `🏛️ Hội Thương Nhân: **${merchantFaction}** (**−25**)\n` +
      `🛒 Giá shop toàn thế giới: **+${markup}%** · 🏦 Fear **${fear}%** · ⚠️ Danger **${danger}%**\n` +
      `🛡️ Lần cướp shopkeeper sau: **x2 stats**${robberyCount > 1 ? ` *(đây là lần ${robberyCount})*` : ''}`
    );

  await btnInt.editReply({ embeds: [embed], components: buildContinueExploreRow(userId) });
  attachContinueExploreHandler(btnInt.message, interaction, userId, guildId);
}


const SOUL_SHOP_ITEMS: Array<{
  id: string; name: string; icon: string; cost: number; desc: string;
  giveItem?: string; qty?: number;
}> = [
  { id: 'mat_chest',    name: 'Material Chest ngẫu nhiên', icon: '📦', cost: 1, desc: '2–4 material ngẫu nhiên', giveItem: 'material_chest', qty: 1 },
  { id: 'ancient_book', name: 'Ancient Book', icon: '📖', cost: 3, desc: 'Cổ thư dùng ở Hội Quán để học skill', giveItem: 'ancient_book', qty: 1 },
  { id: 'curse_bundle', name: 'Gói Cổ Thư Nguyền', icon: '🔻', cost: 5, desc: 'Ancient Book + Curse Shard để nghiên cứu skill cao', giveItem: '', qty: 1 },
  { id: 'puri_stone',   name: 'Purification Stone',         icon: '💎', cost: 5, desc: 'Xóa toàn bộ debuff', giveItem: 'purification_stone', qty: 1 },
  { id: 'eq_box',       name: 'Cursed Equipment Box',       icon: '🎁', cost: 8, desc: 'Trang bị Rare+ ngẫu nhiên', giveItem: 'cursed_equipment_box', qty: 1 },
  { id: 'soul_anchor',  name: 'Soul Anchor',                icon: '⚓', cost: 10, desc: 'Sống sót 1 lần khi chết', giveItem: 'soul_anchor', qty: 1 },
  { id: 'leg_pendant',  name: 'Legacy Pendant',             icon: '📿', cost: 12, desc: '+50% gold từ Legacy', giveItem: 'legacy_pendant', qty: 1 },
  { id: 'stat_atk',     name: '+1 ATK vĩnh viễn',            icon: '⚔️', cost: 6, desc: 'Tăng ATK cơ bản, giữ qua chuyển sinh' },
  { id: 'stat_def',     name: '+1 DEF vĩnh viễn',            icon: '🛡️', cost: 6, desc: 'Tăng DEF cơ bản, giữ qua chuyển sinh' },
  { id: 'stat_hp',      name: '+10 HP vĩnh viễn',            icon: '❤️', cost: 7, desc: 'Tăng Max HP cơ bản, giữ qua chuyển sinh' },
  { id: 'keep_item',    name: 'Giữ 1 item khi chết',         icon: '🔒', cost: 9, desc: 'Tích 1 charge bảo hiểm di vật' },
  { id: 'skill_slot',   name: 'Mở thêm slot kỹ năng',        icon: '📌', cost: 18, desc: 'Mở tối đa +2 slot loadout' },
  { id: 'death_reduce', name: 'Giảm penalty khi chết',       icon: '🕯️', cost: 10, desc: 'Giảm penalty tử vong thêm 10%, cap 50%' },
  { id: 'next_bless',   name: 'Blessing cho kiếp sau',       icon: '🧬', cost: 7, desc: 'Lần /start sau chết mạnh hơn một chút' },
  { id: 'mercy_mark',   name: 'Ấn chuộc lỗi thương nhân',    icon: '🧾', cost: 6, desc: 'Dùng trong event chuộc tội/giảm wanted' },
];

const COMMON_BOOKS = [
  'ancient_book','ancient_book','ancient_book','ancient_book','ancient_book','ancient_book',
  'ancient_book','ancient_book','ancient_book','ancient_book','ancient_book','ancient_book',
  'ancient_book','ancient_book','ancient_book','ancient_book','ancient_book','ancient_book','ancient_book','ancient_book',
  'ancient_book','ancient_book','ancient_book','ancient_book','ancient_book',
  'ancient_book','ancient_book','ancient_book','ancient_book'
];
const SOUL_BOOKS   = ['ancient_book','ancient_book','ancient_book','ancient_book'];

export async function showSoulShop(
  interaction: ChatInputCommandInteraction, userId: string, guildId: string,
  partyMemberIds?: string[], partyMemberNames?: Record<string, string>
): Promise<void> {
  const player = getPlayer(userId, guildId)!;
  const flavors = [
    '☁️ Một bóng hình mờ ảo xuất hiện, không nói một lời...',
    '💀 "Linh hồn có giá của nó... Muốn mua gì không?"',
    '🌑 Cửa hàng bóng tối, chỉ mở khi thế giới đang ngủ.',
  ];

  const itemLines = SOUL_SHOP_ITEMS.map(i =>
    `${i.icon} **${i.name}** — **${i.cost} 💀** Soul Shard\n> *${i.desc}*`
  ).join('\n');

  const isPartyShop = !!(partyMemberIds && partyMemberIds.length > 1);
  const partyNote = isPartyShop
    ? '\n\n👥 **Party Soul Shop:** Ai bấm mua thì dùng Soul Shard và nhận vật phẩm/chỉ số của người đó.'
    : '';

  const embed = new EmbedBuilder()
    .setColor(COLORS.purple)
    .setTitle('💀 Người Giữ Linh Hồn')
    .setDescription(`*${pick(flavors)}*\n\n${itemLines}\n\n💀 Soul Shards leader: **${player.soul_shards}**${partyNote}`);

  const options = SOUL_SHOP_ITEMS
    .map(i =>
      new StringSelectMenuOptionBuilder()
        .setLabel(`${i.name} — ${i.cost} 💀`)
        .setDescription(i.desc)
        .setValue(i.id)
        .setEmoji(i.icon)
    );

  const rows: ActionRowBuilder<any>[] = [];

  if (options.length) {
    rows.push(new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`soul_buy_${userId}`)
        .setPlaceholder('Mua với Soul Shard...')
        .addOptions(options.slice(0, 25))
    ));
  }

  rows.push(new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`soul_leave_${userId}`).setLabel('Rời đi').setEmoji('🚶').setStyle(ButtonStyle.Secondary)
  ));

  const reply = await interaction.editReply({ embeds: [embed], components: rows });

  const collector = reply.createMessageComponentCollector({
    filter: isPartyShop ? onlyParty(userId, partyMemberIds!) : onlyUser(userId), time: 60_000
  });

  collector.on('collect', async (compInt) => {
    const deferred = await compInt.deferUpdate().then(() => true).catch(() => false);
    if (!deferred) return;

    const cid = (compInt as any).customId as string;

    if (cid === `soul_leave_${userId}`) {
      if (compInt.user.id !== userId) {
        await interaction.editReply({ embeds: [new EmbedBuilder(embed.toJSON()).setFooter({ text: '👥 Chỉ leader party mới được đóng Soul Shop cho cả nhóm.' })] }).catch(() => {});
        return;
      }
      collector.stop();
      const leaveReply = await interaction.editReply({ embeds: [simpleEmbed(COLORS.info, '💀 *"Đến lần sau..."* Bóng hình tan biến.')], components: buildContinueExploreRow(userId) });
      attachContinueExploreHandler(leaveReply, interaction, userId, guildId);
      return;
    }

    if (cid === `soul_buy_${userId}`) {
      collector.stop();
      const buyerId = compInt.user.id;
      const sel     = compInt as StringSelectMenuInteraction;
      const itemKey = sel.values[0];
      const shopItem = SOUL_SHOP_ITEMS.find(i => i.id === itemKey);
      if (!shopItem) return;

      const freshP = getPlayer(buyerId, guildId)!;
      if (freshP.soul_shards < shopItem.cost) {
        await interaction.editReply({ embeds: [simpleEmbed(COLORS.warning, `❌ **${freshP.name}** không đủ Soul Shard (cần ${shopItem.cost}, có ${freshP.soul_shards})`)], components: [] });
        return;
      }

      // Deduct soul shards
      const { grantSoulShards: gss } = await import('../player');
      gss(buyerId, guildId, -shopItem.cost);

      let result = '';
      if (itemKey === 'rand_book') {
        const book = pick(COMMON_BOOKS);
        addItem(buyerId, guildId, book, 1);
        const it = getItem(book)!;
        result = `${it.icon} **${it.name}**`;
      } else if (itemKey === 'soul_book') {
        const book = pick(SOUL_BOOKS);
        addItem(buyerId, guildId, book, 1);
        const it = getItem(book)!;
        result = `${it?.icon ?? '💀'} **${it?.name ?? book}** (Soul Skill!)`;
      } else if (itemKey === 'eq_box') {
        // Give a random rare+ equipment
        const { EQUIPMENT: EQ } = await import('../../data/equipment');
        const rareEq = Object.values(EQ).filter(e => e.rarity === 'rare' || e.rarity === 'epic');
        const chosen = pick(rareEq);
        addItem(buyerId, guildId, chosen.id, 1);
        result = `${chosen.icon} **${chosen.name}** (${chosen.rarity})`;
      } else if (itemKey === 'mat_chest') {
        const mats = ['herb','wolf_fang','ancient_bark','bone_shard','ectoplasm','troll_hide','ancient_wood','broken_rune','merchant_seal','soul_dust','rusty_gear','cursed_cloth'];
        const qty = randInt(2, 4);
        const picked: string[] = [];
        for (let i = 0; i < qty; i++) { const m = pick(mats); addItem(buyerId, guildId, m, 1); picked.push(m); }
        const distinct = [...new Set(picked)].map(m => getItem(m)?.name ?? m).join(', ');
        result = `📦 ${distinct}`;
      } else if (itemKey === 'stat_atk') {
        addPermanentStat(buyerId, guildId, 'atk', 1);
        result = '⚔️ **ATK vĩnh viễn +1**';
      } else if (itemKey === 'stat_def') {
        addPermanentStat(buyerId, guildId, 'def', 1);
        result = '🛡️ **DEF vĩnh viễn +1**';
      } else if (itemKey === 'stat_hp') {
        addPermanentStat(buyerId, guildId, 'max_hp', 10);
        result = '❤️ **Max HP vĩnh viễn +10**';
      } else if (itemKey === 'keep_item') {
        const charges = addKeepItemCharge(buyerId, guildId, 1);
        result = `🔒 **Keep Item Charge +1** *(đang có ${charges})*`;
      } else if (itemKey === 'skill_slot') {
        const slots = addExtraSkillSlot(buyerId, guildId, 1);
        result = `📌 **Mở thêm slot kỹ năng** *(+${slots}/2)*`;
      } else if (itemKey === 'death_reduce') {
        const reduction = improveDeathPenaltyReduction(buyerId, guildId, 10);
        result = `🕯️ **Death penalty reduction ${reduction}%**`;
      } else if (itemKey === 'next_bless') {
        const blessings = addRebirthBlessing(buyerId, guildId, 1);
        result = `🧬 **Blessing cho kiếp sau +1** *(đang có ${blessings})*`;
      } else if (itemKey === 'mercy_mark') {
        const marks = addMerchantMercy(buyerId, guildId, 1);
        result = `🧾 **Ấn chuộc lỗi thương nhân +1** *(đang có ${marks})*`;
      } else if (shopItem.giveItem) {
        addItem(buyerId, guildId, shopItem.giveItem, shopItem.qty ?? 1);
        const it = getItem(shopItem.giveItem);
        result = `${it?.icon ?? '✨'} **${it?.name ?? shopItem.giveItem}**`;
      }

      const afterP = getPlayer(buyerId, guildId)!;
      const resReply = await interaction.editReply({
        embeds: [
          new EmbedBuilder().setColor(COLORS.purple)
            .setTitle('💀 Người Giữ Linh Hồn — Khế Ước Hoàn Tất')
            .setDescription(`**${afterP.name}** đã giao ước.\n−**${shopItem.cost} 💀** Soul Shard\nNhận được: ${result}\n\n💀 Còn lại: **${afterP.soul_shards}** Soul Shards`)
        ],
        components: buildContinueExploreRow(userId)
      });
      attachContinueExploreHandler(resReply, interaction, userId, guildId);
    }
  });

  collector.on('end', (_c, reason) => {
    if (reason === 'time') {
      interaction.editReply({
        embeds: [simpleEmbed(COLORS.info, '💀 Cửa hàng linh hồn đã đóng cửa.')],
        components: buildContinueExploreRow(userId)
      }).then(r => attachContinueExploreHandler(r, interaction, userId, guildId)).catch(() => {});
    }
  });
}
