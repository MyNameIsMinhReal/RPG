import {
  ChatInputCommandInteraction, EmbedBuilder,
  ActionRowBuilder, ButtonBuilder, ButtonStyle,
  StringSelectMenuBuilder, StringSelectMenuOptionBuilder,
  ComponentType
} from 'discord.js';
import { getPlayer, addItem, getItemQty, getInventory, removeItem, grantSoulShards, applyPassiveStats, getFactionSummary } from './player';
import { getPartyOf } from './party';
import { getBookTier, pickDifferentBook } from '../commands/reroll';
import { onlyUser } from '../utils/collectors';
import { getWornEquipment, UPGRADE_MAX } from './equipment';
import { COLORS } from '../utils/embeds';
import { getItem, ITEMS } from '../data/items';
import { getEquipment, EQUIPMENT, RARITY_LABELS, SLOT_LABELS } from '../data/equipment';
import { ZONES } from '../data/zones';
import db from '../database/index';
import { getAwakeningStatus, awakenClass } from './classProgression';
import { FACTIONS, factionTier } from '../data/factions';
import { getFactionRewardMods } from './factions';
import { getActivePetInfo, describePetRole } from './petRoles';
import { CLASSES } from '../data/classes';
import { ANCIENT_BOOK_STUDY_COST, ancientBookCostLine, buildAncientBookResultEmbed, canStudyAncientBook, studyAncientBook, type AncientBookTier, ANCIENT_BOOK_ITEM_ID, CURSE_SHARD_ITEM_ID } from './skillLearning';

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

async function safeDeferUpdate(component: { deferUpdate: () => Promise<unknown>; deferred?: boolean; replied?: boolean; customId?: string }): Promise<boolean> {
  try {
    if (component.deferred || component.replied) return true;
    await component.deferUpdate();
    return true;
  } catch (err: any) {
    const code = err?.code ?? err?.rawError?.code;
    const message = String(err?.message ?? '');

    // Discord component interactions expire quickly. If the bot/network is slow,
    // Discord returns 10062. This is safe to ignore because the UI can still be
    // refreshed through the original command reply.
    if (code === 10062 || code === 40060 || message.includes('Unknown interaction') || message.includes('already acknowledged')) {
      console.warn(`[VILLAGE] Bỏ qua interaction hết hạn${component.customId ? `: ${component.customId}` : ''}.`);
      return false;
    }

    console.warn('[VILLAGE] deferUpdate lỗi:', code ?? message);
    return false;
  }
}


function getVillageActorIds(leaderId: string, guildId: string): string[] {
  const leader = getPlayer(leaderId, guildId);
  if (!leader) return [leaderId];

  const party = getPartyOf(guildId, leaderId);
  const ids = party?.leaderId === leaderId ? party.memberIds : [leaderId];
  const sameZoneAlive = ids.filter(id => {
    const p = getPlayer(id, guildId);
    return !!p && !!p.alive && p.zone_id === leader.zone_id;
  });

  return sameZoneAlive.length > 0 ? sameZoneAlive : [leaderId];
}

function isVillageActor(userId: string, leaderId: string, guildId: string): boolean {
  return getVillageActorIds(leaderId, guildId).includes(userId);
}

function actorDisplayName(userId: string, guildId: string): string {
  return getPlayer(userId, guildId)?.name ?? `<@${userId}>`;
}

function partyVillageHint(leaderId: string, guildId: string): string {
  const actors = getVillageActorIds(leaderId, guildId);
  if (actors.length <= 1) return '';
  return `\n\n👥 **Party mode:** thành viên cùng làng có thể tự mua/nâng/nghỉ/nhận thưởng bằng tài nguyên của chính mình. Chỉ leader điều khiển nút quay lại/rời menu.`;
}

async function rejectVillageInteraction(i: any, content = '❌ Bạn không ở cùng party/khu vực với leader nên không dùng được menu này.') {
  await i.reply({ content, flags: 64 }).catch(() => {});
}

function villageActorFilter(leaderId: string, guildId: string, opts?: { leaderOnlyBack?: boolean }) {
  return (i: any) => {
    const isBack = i.customId === `vill_back_${leaderId}`;
    if (isBack && opts?.leaderOnlyBack !== false) {
      if (i.user.id !== leaderId) {
        rejectVillageInteraction(i, '❌ Chỉ leader mới có thể quay lại/rời menu làng.');
        return false;
      }
      return true;
    }

    if (!isVillageActor(i.user.id, leaderId, guildId)) {
      rejectVillageInteraction(i);
      return false;
    }
    return true;
  };
}



function fmtBool(ok: boolean): string {
  return ok ? '✅' : '❌';
}

function getClassIconName(classId: string): string {
  const cls = CLASSES[classId] ?? CLASSES.warrior;
  return `${cls.icon} ${cls.name}`;
}

async function showVillageAwakening(
  interaction: ChatInputCommandInteraction,
  leaderId: string,
  guildId: string,
  actorId: string
): Promise<void> {
  const actor = getPlayer(actorId, guildId);
  if (!actor) {
    await interaction.editReply({ embeds: [simpleEmbed(COLORS.warning, '❌ Không tìm thấy nhân vật.')], components: [backRow(leaderId)] });
    return;
  }

  const status = getAwakeningStatus(actorId, guildId);
  if (!status) {
    await interaction.editReply({ embeds: [simpleEmbed(COLORS.warning, '❌ Không tìm thấy tiến trình class.')], components: [backRow(leaderId)] });
    return;
  }

  const title = `🌟 Tiến Hoá Class — ${actor.name}`;
  if (!status.def) {
    await interaction.editReply({
      embeds: [new EmbedBuilder()
        .setColor(COLORS.warning)
        .setTitle(title)
        .setDescription(`Class hiện tại: **${getClassIconName(status.currentClassId)}**\n\n${status.missing.join('\n')}`)],
      components: [backRow(leaderId)]
    });
    return;
  }

  const req = status.def.requirement;
  const reqLines = [
    `${fmtBool(actor.level >= req.level)} Lv.${req.level} trở lên`,
    `${fmtBool(actor.gold >= req.gold)} ${req.gold.toLocaleString()} Gold`,
    req.soulShards ? `${fmtBool((actor as any).soul_shards >= req.soulShards)} ${req.soulShards} Soul Shard` : null,
    ...(req.items ?? []).map(it => `${fmtBool(getItemQty(actorId, guildId, it.itemId) >= it.qty)} ${it.itemId} x${it.qty} · đang có ${getItemQty(actorId, guildId, it.itemId)}`),
  ].filter(Boolean).join('\n');

  const embed = new EmbedBuilder()
    .setColor(status.canAwaken ? COLORS.gold : COLORS.info)
    .setTitle(title)
    .setDescription(
      `Hiện tại: **${getClassIconName(status.currentClassId)}**\n` +
      `Tiến hoá: **${status.def.icon} ${status.def.name}**\n\n` +
      `*${status.def.lore}*\n\n` +
      `**Điều kiện:**\n${reqLines}\n\n` +
      (status.canAwaken ? '✅ Đủ điều kiện. Bấm **Tiến hoá** để xác nhận.' : `Còn thiếu:\n${status.missing.map(m => `• ${m}`).join('\n')}`)
    );

  if (!status.canAwaken) {
    await interaction.editReply({ embeds: [embed], components: [backRow(leaderId)] });
    return;
  }

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`vill_awaken_confirm_${leaderId}_${actorId}`).setLabel('Tiến hoá').setEmoji('🌟').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`vill_back_${leaderId}`).setLabel('Quay lại').setStyle(ButtonStyle.Secondary)
  );
  const msg = await interaction.editReply({ embeds: [embed], components: [row] });
  const btn = await msg.awaitMessageComponent({
    filter: (i) => {
      if (i.customId === `vill_back_${leaderId}`) return i.user.id === leaderId;
      if (i.user.id !== actorId) { rejectVillageInteraction(i, '❌ Chỉ người đang tiến hoá class mới xác nhận được.'); return false; }
      return true;
    },
    componentType: ComponentType.Button,
    time: 30_000
  }).catch(() => null);

  if (!btn) return;
  await safeDeferUpdate(btn);
  if (btn.customId === `vill_back_${leaderId}`) {
    await showVillageHall(interaction, leaderId, guildId);
    return;
  }

  const result = awakenClass(actorId, guildId);
  if (!result.ok || !result.toClassId) {
    const reason = result.reason === 'missing_requirements' ? 'Điều kiện đã thay đổi, hãy kiểm tra lại.' : `Không thể tiến hoá (${result.reason ?? 'unknown'}).`;
    await interaction.editReply({ embeds: [simpleEmbed(COLORS.warning, `❌ ${reason}`)], components: [backRow(leaderId)] });
    return;
  }

  await interaction.editReply({
    embeds: [new EmbedBuilder()
      .setColor(COLORS.gold)
      .setTitle('🌟 Class Awakened!')
      .setDescription(`**${actor.name}** đã tiến hoá thành **${getClassIconName(result.toClassId)}**!`)],
    components: [backRow(leaderId)]
  });
}

async function showVillageFactions(
  interaction: ChatInputCommandInteraction,
  leaderId: string,
  guildId: string,
  actorId: string
): Promise<void> {
  const actor = getPlayer(actorId, guildId);
  if (!actor) { await interaction.editReply({ embeds: [simpleEmbed(COLORS.warning, '❌ Không tìm thấy nhân vật.')], components: [backRow(leaderId)] }); return; }
  const values = getFactionSummary(actorId, guildId);
  const mods = getFactionRewardMods(actorId, guildId);
  const lines = Object.values(FACTIONS).map(f => {
    const rep = values[f.id] ?? 0;
    const sign = rep > 0 ? '+' : '';
    return `${f.icon} **${f.name}** — **${sign}${rep}** (${factionTier(rep)})\n> ${rep >= 0 ? f.positiveBenefit : f.negativeWarning}`;
  }).join('\n\n');
  await interaction.editReply({
    embeds: [new EmbedBuilder()
      .setColor(COLORS.info)
      .setTitle(`🏛️ Danh vọng phe — ${actor.name}`)
      .setDescription(lines + '\n\n' + (mods.lines.length ? `**Bonus đang có:**\n${mods.lines.join('\n')}` : '**Bonus đang có:** Chưa có bonus faction.'))],
    components: [backRow(leaderId)]
  });
}

async function showVillagePetRole(
  interaction: ChatInputCommandInteraction,
  leaderId: string,
  guildId: string,
  actorId: string
): Promise<void> {
  const actor = getPlayer(actorId, guildId);
  const pet = getActivePetInfo(actorId, guildId);
  if (!actor) { await interaction.editReply({ embeds: [simpleEmbed(COLORS.warning, '❌ Không tìm thấy nhân vật.')], components: [backRow(leaderId)] }); return; }
  if (!pet) {
    await interaction.editReply({
      embeds: [new EmbedBuilder()
        .setColor(COLORS.info)
        .setTitle(`🐾 Đồng hành — ${actor.name}`)
        .setDescription('Bạn chưa trang bị pet nào. Dùng menu `/pet list` hiện có để xem pet, rồi `/pet equip` để trang bị.')],
      components: [backRow(leaderId)]
    });
    return;
  }
  await interaction.editReply({
    embeds: [new EmbedBuilder()
      .setColor(COLORS.success)
      .setTitle(`🐾 Đồng hành — ${actor.name}`)
      .setDescription(
        `${pet.icon} **${pet.name}** · Lv.**${pet.level}**/${pet.maxLevel}\n` +
        `📊 Passive: **+${pet.passivePct.toFixed(1)}%** ${pet.passiveType}\n\n` +
        `${describePetRole(pet.petId)}`
      )],
    components: [backRow(leaderId)]
  });
}


async function showVillageAncientBookStudy(
  interaction: ChatInputCommandInteraction,
  leaderId: string,
  guildId: string,
  actorId: string
): Promise<void> {
  const actor = getPlayer(actorId, guildId);
  if (!actor) {
    await interaction.editReply({ embeds: [simpleEmbed(COLORS.warning, '❌ Không tìm thấy nhân vật.')], components: [backRow(leaderId)] });
    return;
  }

  const bookQty = getItemQty(actorId, guildId, ANCIENT_BOOK_ITEM_ID);
  const shardQty = getItemQty(actorId, guildId, CURSE_SHARD_ITEM_ID);
  const tierRows = (['t1','t2','t3'] as AncientBookTier[]).map(tier => {
    const cost = ANCIENT_BOOK_STUDY_COST[tier];
    const check = canStudyAncientBook(actorId, guildId, tier);
    return `${check.ok ? '✅' : '❌'} **${cost.label}** — ${ancientBookCostLine(tier)}` + (check.ok ? '' : `\n> ${check.missing.join(' · ')}`);
  }).join('\n');

  const embed = new EmbedBuilder()
    .setColor(COLORS.magic)
    .setTitle(`📖 Cổ Thư Kỹ Năng — ${actor.name}`)
    .setDescription(
      `Ancient Book thay cho toàn bộ Skill Book lẻ. Học skill bằng cách gặp event cổ thư ngoài đường, hoặc nghiên cứu tại Hội Quán.\n\n` +
      `Đang có: 📖 **${bookQty} Ancient Book** · 🔻 **${shardQty} Curse Shard** · 🪙 **${actor.gold} Gold**\n\n` +
      tierRows
    );

  const options = (['t1','t2','t3'] as AncientBookTier[]).map(tier => {
    const cost = ANCIENT_BOOK_STUDY_COST[tier];
    const check = canStudyAncientBook(actorId, guildId, tier);
    return new StringSelectMenuOptionBuilder()
      .setLabel(`Nghiên cứu ${cost.label}`)
      .setDescription(ancientBookCostLine(tier).slice(0, 100))
      .setValue(tier)
      .setEmoji(check.ok ? '📖' : '🔒');
  });

  const rows: ActionRowBuilder<any>[] = [
    new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`vill_book_study_${leaderId}_${actorId}`)
        .setPlaceholder('Chọn tier cổ thư để nghiên cứu...')
        .addOptions(options)
    ),
    backRow(leaderId)
  ];

  const msg = await interaction.editReply({ embeds: [embed], components: rows });
  const sel = await msg.awaitMessageComponent({
    filter: (i) => {
      if (i.customId === `vill_back_${leaderId}`) return i.user.id === leaderId;
      if (i.user.id !== actorId) { rejectVillageInteraction(i, '❌ Chỉ người đang nghiên cứu cổ thư mới chọn được.'); return false; }
      return true;
    },
    time: 45_000
  }).catch(() => null);

  if (!sel) { await interaction.editReply({ components: [] }).catch(() => {}); return; }
  await safeDeferUpdate(sel);
  if (sel.customId === `vill_back_${leaderId}`) { await showVillageHall(interaction, leaderId, guildId); return; }
  if (!sel.isStringSelectMenu()) return;

  const tier = sel.values[0] as AncientBookTier;
  const result = studyAncientBook(actorId, guildId, tier);
  await interaction.editReply({
    embeds: [buildAncientBookResultEmbed(actor.name, tier, result)],
    components: [backRow(leaderId)]
  });
}

export async function showVillageHall(
  interaction: ChatInputCommandInteraction,
  userId: string, guildId: string
): Promise<void> {
  const leader = getPlayer(userId, guildId)!;
  const embed = new EmbedBuilder()
    .setColor(COLORS.purple)
    .setTitle('🏛️ Hội Quán Ashveil')
    .setDescription(
      `Leader: **${leader.name}**\n\n` +
      `Nơi xem các hệ thống dài hạn mà không cần thêm lệnh mới:\n` +
      `🌟 **Tiến hoá Class** — kiểm tra/tiến hoá khi đủ điều kiện\n` +
      `🏛️ **Danh vọng phe** — xem reputation và bonus hiện có\n` +
      `📜 **Chuỗi sự kiện** — xem chain lore/event đang theo\n` +
      `🐾 **Đồng hành** — xem vai trò pet đang trang bị` +
      partyVillageHint(userId, guildId)
    );

  const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`vill_hall_awaken_${userId}`).setLabel('Tiến hoá Class').setEmoji('🌟').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`vill_hall_faction_${userId}`).setLabel('Danh vọng phe').setEmoji('🏛️').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`vill_hall_books_${userId}`).setLabel('Cổ thư').setEmoji('📖').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`vill_hall_pet_${userId}`).setLabel('Đồng hành').setEmoji('🐾').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`vill_back_${userId}`).setLabel('Rời đi').setStyle(ButtonStyle.Secondary)
  );

  const msg = await interaction.editReply({ embeds: [embed], components: [row1] });
  const btn = await msg.awaitMessageComponent({
    filter: villageActorFilter(userId, guildId),
    componentType: ComponentType.Button,
    time: 60_000
  }).catch(() => null);

  if (!btn) { await interaction.editReply({ components: [] }).catch(() => {}); return; }
  await safeDeferUpdate(btn);
  if (btn.customId === `vill_back_${userId}`) {
    await interaction.editReply({ components: [] }).catch(() => {});
    return;
  }

  const actorId = btn.user.id;
  if (btn.customId === `vill_hall_awaken_${userId}`) await showVillageAwakening(interaction, userId, guildId, actorId);
  else if (btn.customId === `vill_hall_faction_${userId}`) await showVillageFactions(interaction, userId, guildId, actorId);
  else if (btn.customId === `vill_hall_books_${userId}`) await showVillageAncientBookStudy(interaction, userId, guildId, actorId);
  else if (btn.customId === `vill_hall_pet_${userId}`) await showVillagePetRole(interaction, userId, guildId, actorId);
}

// ── SHOP ──────────────────────────────────────────────────────────────────

export async function showVillageShop(
  interaction: ChatInputCommandInteraction,
  userId: string, guildId: string
): Promise<void> {
  const leader = getPlayer(userId, guildId)!;
  const zone = ZONES[leader.zone_id];
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

  if (consumableOptions.length === 0 && equipOptions.length === 0) {
    await interaction.editReply({ embeds: [simpleEmbed(COLORS.warning, 'Cửa hàng trống.')], components: [backRow(userId)] });
    return;
  }

  const shopEmbed = new EmbedBuilder()
    .setColor(COLORS.gold)
    .setTitle('🏪 Cửa Hàng Làng')
    .setDescription(
      `🪙 Leader có **${leader.gold} Gold**\n` +
      `Chọn vật phẩm hoặc trang bị muốn mua.${partyVillageHint(userId, guildId)}`
    )
    .setFooter({ text: 'Mỗi menu hiển thị tối đa 25 món theo giới hạn của Discord' });

  const componentRows: ActionRowBuilder<StringSelectMenuBuilder>[] = [];

  if (consumableOptions.length > 0) {
    componentRows.push(
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(`vill_shop_item_sel_${userId}`)
          .setPlaceholder('Mua vật phẩm / cổ thư...')
          .addOptions(consumableOptions.slice(0, 25))
      )
    );
  }

  if (equipOptions.length > 0) {
    componentRows.push(
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(`vill_shop_equip_sel_${userId}`)
          .setPlaceholder('Mua trang bị starter / phổ thông...')
          .addOptions(equipOptions.slice(0, 25))
      )
    );
  }

  const msg = await interaction.editReply({ embeds: [shopEmbed], components: [...componentRows, backRow(userId)] });

  const sel = await msg.awaitMessageComponent({
    filter: villageActorFilter(userId, guildId),
    componentType: ComponentType.StringSelect,
    time: 45_000
  }).catch(() => null);

  if (!sel) { await interaction.editReply({ components: [] }); return; }
  await safeDeferUpdate(sel);

  const actorId = sel.user.id;
  const value = sel.values[0]; // buy_item_xxx or buy_equip_xxx
  const isEquip = value.startsWith('buy_equip_');
  const itemId  = value.replace('buy_item_', '').replace('buy_equip_', '');

  const def = isEquip ? getEquipment(itemId) : getItem(itemId);
  if (!def || !def.buyPrice) {
    await interaction.editReply({ embeds: [simpleEmbed(COLORS.danger, '❌ Không tìm thấy vật phẩm.')], components: [backRow(userId)] });
    return;
  }

  const freshPlayer = getPlayer(actorId, guildId)!;
  const confirmEmbed = new EmbedBuilder()
    .setColor(COLORS.gold)
    .setTitle(`🏪 Xác nhận mua`)
    .setDescription(
      `Người mua: **${freshPlayer.name}**\n\n` +
      `**${def.icon ?? ''} ${def.name}**\n${def.description}\n\n` +
      `Giá: **${def.buyPrice} 🪙**\nBạn có: **${freshPlayer.gold} 🪙**`
    );

  const confirmRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`vill_buy_confirm_${userId}_${actorId}`).setLabel('Mua').setEmoji('🪙').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`vill_shop_cancel_${userId}_${actorId}`).setLabel('Hủy').setStyle(ButtonStyle.Secondary)
  );

  const msg2 = await interaction.editReply({ embeds: [confirmEmbed], components: [confirmRow] });

  const btn = await msg2.awaitMessageComponent({
    filter: (i) => {
      if (i.user.id !== actorId) { rejectVillageInteraction(i, '❌ Chỉ người vừa chọn món mới xác nhận giao dịch này.'); return false; }
      return true;
    },
    componentType: ComponentType.Button,
    time: 30_000
  }).catch(() => null);

  if (!btn || btn.customId !== `vill_buy_confirm_${userId}_${actorId}`) {
    if (btn) await safeDeferUpdate(btn);
    await showVillageShop(interaction, userId, guildId);
    return;
  }

  await safeDeferUpdate(btn);
  const p2 = getPlayer(actorId, guildId)!;
  if (p2.gold < def.buyPrice) {
    await interaction.editReply({ embeds: [simpleEmbed(COLORS.danger, `❌ **${p2.name}** không đủ Gold! Cần **${def.buyPrice}**, có **${p2.gold}**.`)], components: [backRow(userId)] });
    return;
  }

  db.prepare('UPDATE players SET gold=gold-? WHERE user_id=? AND guild_id=?').run(def.buyPrice, actorId, guildId);
  addItem(actorId, guildId, itemId, 1);

  await interaction.editReply({
    embeds: [simpleEmbed(COLORS.success, `✅ **${p2.name}** đã mua **${def.icon ?? ''} ${def.name}**!\n🪙 Còn lại: **${p2.gold - def.buyPrice} Gold**`)],
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
  const leader = getPlayer(userId, guildId)!;
  const ironQty  = getItemQty(userId, guildId, 'iron_ore');
  const crystQty = getItemQty(userId, guildId, 'mana_crystal');

  const bsEmbed = new EmbedBuilder()
    .setColor(0xE67E22)
    .setTitle('⚒️ Lò Rèn Làng')
    .setDescription(
      `Leader: **${leader.name}**\n` +
      `Vật liệu leader: 🪨 **${ironQty} Iron Ore** · 💠 **${crystQty} Mana Crystal** · 🪙 **${leader.gold} Gold**\n\n` +
      `Chọn thao tác bên dưới. Vật liệu/Gold sẽ lấy từ **người bấm nút**.${partyVillageHint(userId, guildId)}\n\n` +
      `Mỗi nâng cấp: **Weapon** +2 ATK · **Armor** +2 DEF · **Accessory** +1 ATK`
    )
    .setFooter({ text: 'Tối đa +5 mỗi trang bị · Học skill đã chuyển sang 🏛️ Hội Quán → 📖 Cổ thư' });

  const bsRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`vill_bs_upgrade_${userId}`).setLabel('Nâng trang bị của tôi').setEmoji('⚒️').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`vill_back_${userId}`).setLabel('Quay lại').setStyle(ButtonStyle.Secondary)
  );

  const msg = await interaction.editReply({ embeds: [bsEmbed], components: [bsRow] });

  const btn = await msg.awaitMessageComponent({
    filter: villageActorFilter(userId, guildId),
    componentType: ComponentType.Button,
    time: 45_000
  }).catch(() => null);

  if (!btn) { await interaction.editReply({ components: [] }); return; }
  await safeDeferUpdate(btn);

  if (btn.customId === `vill_back_${userId}`) {
    await interaction.editReply({ components: [] });
    return;
  }

  const actorId = btn.user.id;
  await showBlacksmithUpgradeList(interaction, actorId, guildId, userId);
}

async function showBlacksmithUpgradeList(
  interaction: ChatInputCommandInteraction,
  actorId: string, guildId: string, leaderId: string
): Promise<void> {
  const actor = getPlayer(actorId, guildId)!;
  const worn = getWornEquipment(actorId, guildId);

  if (worn.length === 0) {
    await interaction.editReply({
      embeds: [simpleEmbed(COLORS.warning, `⚒️ **${actor.name}** chưa equip trang bị nào!\nDùng \`/inventory\` để trang bị đồ.`)],
      components: [backRow(leaderId)]
    });
    return;
  }

  const options = worn.map(w => {
    const eq   = getEquipment(w.equipment_id);
    const upLv = getUpgradeLevel(actorId, guildId, w.slot);
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

  const ironQty  = getItemQty(actorId, guildId, 'iron_ore');
  const crystQty = getItemQty(actorId, guildId, 'mana_crystal');

  const bsEmbed = new EmbedBuilder()
    .setColor(0xE67E22)
    .setTitle(`⚒️ Lò Rèn — ${actor.name}`)
    .setDescription(
      `Vật liệu của bạn:\n> 🪨 **${ironQty} Iron Ore** · 💠 **${crystQty} Mana Crystal** · 🪙 **${actor.gold} Gold**\n\n` +
      `Chọn trang bị cần nâng cấp.`
    );

  const selectRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`vill_bs_sel_${leaderId}_${actorId}`)
      .setPlaceholder('Chọn trang bị cần nâng...')
      .addOptions(options.slice(0, 25))
  );

  const msg = await interaction.editReply({ embeds: [bsEmbed], components: [selectRow, backRow(leaderId)] });

  const sel = await msg.awaitMessageComponent({
    filter: (i) => {
      if (i.customId === `vill_back_${leaderId}`) {
        if (i.user.id !== leaderId) { rejectVillageInteraction(i, '❌ Chỉ leader mới có thể quay lại/rời menu làng.'); return false; }
        return true;
      }
      if (i.user.id !== actorId) { rejectVillageInteraction(i, '❌ Chỉ người đang mở lò rèn mới chọn trang bị này.'); return false; }
      return true;
    },
    time: 45_000
  }).catch(() => null);

  if (!sel) { await interaction.editReply({ components: [] }); return; }
  await safeDeferUpdate(sel);

  if (sel.customId === `vill_back_${leaderId}`) {
    await showVillageBlacksmith(interaction, leaderId, guildId);
    return;
  }

  if (!sel.isStringSelectMenu()) { await showVillageBlacksmith(interaction, leaderId, guildId); return; }

  const slot  = sel.values[0].replace('upgrade_', '') as any;
  const upLv  = getUpgradeLevel(actorId, guildId, slot);

  if (upLv >= UPGRADE_MAX) {
    await interaction.editReply({
      embeds: [simpleEmbed(COLORS.warning, `⚒️ Trang bị này đã đạt **+${UPGRADE_MAX}** tối đa!`)],
      components: [backRow(leaderId)]
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
      `Người nâng: **${actor.name}**\n\n` +
      `**[+${upLv}] → [+${nextLv}]**\n\n` +
      `Chi phí:\n> 🪨 **${cost.iron} Iron Ore**${cost.crystal > 0 ? `\n> 💠 **${cost.crystal} Mana Crystal**` : ''}\n> 🪙 **${cost.gold} Gold**\n\n` +
      `Bạn có: 🪨 **${ironQty}** · 💠 **${crystQty}** · 🪙 **${getPlayer(actorId, guildId)!.gold}**`
    );

  const confirmRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`vill_bs_confirm_${leaderId}_${actorId}`).setLabel('Nâng cấp').setEmoji('⚒️').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`vill_bs_cancel_${leaderId}_${actorId}`).setLabel('Hủy').setStyle(ButtonStyle.Secondary)
  );

  const msg2 = await interaction.editReply({ embeds: [confirmEmbed], components: [confirmRow] });

  const btn = await msg2.awaitMessageComponent({
    filter: (i) => {
      if (i.user.id !== actorId) { rejectVillageInteraction(i, '❌ Chỉ người đang nâng trang bị mới xác nhận được.'); return false; }
      return true;
    },
    componentType: ComponentType.Button,
    time: 30_000
  }).catch(() => null);

  if (!btn || btn.customId !== `vill_bs_confirm_${leaderId}_${actorId}`) {
    if (btn) await safeDeferUpdate(btn);
    await showVillageBlacksmith(interaction, leaderId, guildId);
    return;
  }

  await safeDeferUpdate(btn);

  const pNow    = getPlayer(actorId, guildId)!;
  const ironNow = getItemQty(actorId, guildId, 'iron_ore');
  const crysNow = getItemQty(actorId, guildId, 'mana_crystal');

  if (pNow.gold < cost.gold || ironNow < cost.iron || crysNow < cost.crystal) {
    await interaction.editReply({
      embeds: [simpleEmbed(COLORS.danger, `❌ **${pNow.name}** không đủ nguyên liệu!`)],
      components: [backRow(leaderId)]
    });
    return;
  }

  db.prepare('UPDATE players SET gold=gold-? WHERE user_id=? AND guild_id=?').run(cost.gold, actorId, guildId);
  db.prepare(`DELETE FROM inventory WHERE user_id=? AND guild_id=? AND item_id='iron_ore' AND quantity<=?`).run(actorId, guildId, cost.iron);
  db.prepare(`UPDATE inventory SET quantity=quantity-? WHERE user_id=? AND guild_id=? AND item_id='iron_ore'`).run(cost.iron, actorId, guildId);
  if (cost.crystal > 0) {
    db.prepare(`DELETE FROM inventory WHERE user_id=? AND guild_id=? AND item_id='mana_crystal' AND quantity<=?`).run(actorId, guildId, cost.crystal);
    db.prepare(`UPDATE inventory SET quantity=quantity-? WHERE user_id=? AND guild_id=? AND item_id='mana_crystal'`).run(cost.crystal, actorId, guildId);
  }
  db.prepare(`
    INSERT INTO equipment_upgrades (user_id, guild_id, slot, upgrade_level)
    VALUES (?, ?, ?, 1)
    ON CONFLICT(user_id, guild_id, slot) DO UPDATE SET upgrade_level=upgrade_level+1
  `).run(actorId, guildId, slot);

  const bonusDesc = slot === 'weapon' ? '+2 ATK' : slot === 'armor' ? '+2 DEF' : '+1 ATK';
  await interaction.editReply({
    embeds: [new EmbedBuilder()
      .setColor(0xE67E22)
      .setTitle('⚒️ Nâng cấp thành công!')
      .setDescription(`**${pNow.name}** đã nâng **${eq?.icon ?? ''} ${eq?.name ?? slot}** → **[+${nextLv}]**\n\n✦ ${bonusDesc} được thêm vào trang bị!`)],
    components: [backRow(leaderId)]
  });
}

async function showBlacksmithReroll(
  interaction: ChatInputCommandInteraction,
  userId: string, guildId: string, leaderId = userId
): Promise<void> {
  const player = getPlayer(userId, guildId)!;

  if (player.soul_shards < REROLL_COST) {
    await interaction.editReply({
      embeds: [new EmbedBuilder()
        .setColor(COLORS.warning)
        .setTitle('❌ Không đủ Soul Shards')
        .setDescription(
          `**${player.name}** cần **${REROLL_COST} 💀 Soul Shards** để reroll.\n` +
          `Hiện có: **${player.soul_shards}** 💀`
        )],
      components: [backRow(leaderId)]
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
      embeds: [new EmbedBuilder().setColor(COLORS.info).setDescription(`📚 **${player.name}** không có Skill Book nào trong túi có thể reroll!`)],
      components: [backRow(leaderId)]
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
    .setTitle(`🎲 Reroll Skill Book — ${player.name}`)
    .setDescription(
      `Chọn Skill Book muốn đổi thành book **ngẫu nhiên cùng tier**.\n\n` +
      `💀 Soul Shards: **${player.soul_shards}** · Chi phí: **${REROLL_COST} 💀**\n\n` +
      `*Tier giữ nguyên (active/passive/reaction/world/soul). Book mới có thể ra book đã có.*`
    );

  const rrSelectRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`vill_bs_rr_sel_${leaderId}_${userId}`)
      .setPlaceholder('Chọn Skill Book muốn reroll...')
      .addOptions(options.slice(0, 25))
  );

  const msg = await interaction.editReply({ embeds: [rerollEmbed], components: [rrSelectRow, backRow(leaderId)] });

  const sel = await msg.awaitMessageComponent({
    filter: (i) => {
      if (i.customId === `vill_back_${leaderId}`) {
        if (i.user.id !== leaderId) { rejectVillageInteraction(i, '❌ Chỉ leader mới có thể quay lại/rời menu làng.'); return false; }
        return true;
      }
      if (i.user.id !== userId) { rejectVillageInteraction(i, '❌ Chỉ người đang reroll mới chọn được book này.'); return false; }
      return true;
    },
    time: 30_000
  }).catch(() => null);

  if (!sel) { await interaction.editReply({ components: [] }); return; }
  await safeDeferUpdate(sel);

  if (sel.customId === `vill_back_${leaderId}`) {
    await showVillageBlacksmith(interaction, leaderId, guildId);
    return;
  }

  if (!sel.isStringSelectMenu()) { await showVillageBlacksmith(interaction, leaderId, guildId); return; }

  const bookId  = sel.values[0];
  const bookDef = getItem(bookId)!;
  const tier    = getBookTier(bookId)!;

  const freshPlayer = getPlayer(userId, guildId)!;
  if (freshPlayer.soul_shards < REROLL_COST) {
    await interaction.editReply({
      embeds: [new EmbedBuilder().setColor(COLORS.warning).setDescription('❌ Không đủ Soul Shards!')],
      components: [backRow(leaderId)]
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
        `Người reroll: **${freshPlayer.name}**\n\n` +
        `**Trước:** ${bookDef.icon} ${bookDef.name}\n` +
        `**Sau:**   ${newBookDef.icon} **${newBookDef.name}**\n\n` +
        `💀 Soul Shards còn lại: **${freshPlayer.soul_shards - REROLL_COST}**`
      )],
    components: [backRow(leaderId)]
  });
}


// ── TAVERN ────────────────────────────────────────────────────────────────

export async function showVillageTavern(
  interaction: ChatInputCommandInteraction,
  userId: string, guildId: string
): Promise<void> {
  const leader = applyPassiveStats(getPlayer(userId, guildId)!);
  const actors = getVillageActorIds(userId, guildId);
  const lines = actors.map(id => {
    const p = applyPassiveStats(getPlayer(id, guildId)!);
    const tag = id === userId ? '👑' : '⚔️';
    return `${tag} **${p.name}** — ❤️ ${p.hp}/${p.max_hp} · 💧 ${p.mp}/${p.max_mp} · 🪙 ${p.gold}`;
  }).join('\n');

  const embed = new EmbedBuilder()
    .setColor(0x8B4513)
    .setTitle('🍺 Quán Trọ — Nghỉ Ngơi')
    .setDescription(
      `> *Ngọn lửa bập bùng trong lò sưởi. Mùi thức ăn nóng hổi bay đến từ nhà bếp...*\n\n` +
      `${lines}\n\n` +
      `Bấm **Nghỉ ngơi cho tôi** để hồi đầy HP/MP bằng Gold của chính người bấm.${partyVillageHint(userId, guildId)}`
    );

  const restRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`vill_rest_confirm_${userId}`).setLabel('Nghỉ ngơi cho tôi').setEmoji('💤').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`vill_back_${userId}`).setLabel('Rời đi').setStyle(ButtonStyle.Secondary)
  );

  const msg = await interaction.editReply({ embeds: [embed], components: [restRow] });

  const btn = await msg.awaitMessageComponent({
    filter: villageActorFilter(userId, guildId),
    componentType: ComponentType.Button,
    time: 30_000
  }).catch(() => null);

  if (!btn) { await interaction.editReply({ components: [] }); return; }
  await safeDeferUpdate(btn);

  if (btn.customId === `vill_back_${userId}`) {
    await interaction.editReply({ components: [] });
    return;
  }

  const actorId = btn.user.id;
  const pNow = applyPassiveStats(getPlayer(actorId, guildId)!);
  const missingHp = pNow.max_hp - pNow.hp;
  const missingMp = pNow.max_mp - pNow.mp;
  const healCost  = Math.max(20, Math.ceil(missingHp * 0.4 + missingMp * 0.2));
  const fullHp = pNow.hp >= pNow.max_hp;
  const fullMp = pNow.mp >= pNow.max_mp;

  if (fullHp && fullMp) {
    await interaction.editReply({
      embeds: [simpleEmbed(COLORS.info, `✅ **${pNow.name}** đang đầy HP/MP rồi.`)],
      components: [backRow(userId)]
    });
    return;
  }

  if (pNow.gold < healCost) {
    await interaction.editReply({
      embeds: [simpleEmbed(COLORS.danger, `❌ **${pNow.name}** không đủ Gold! Cần **${healCost}**, có **${pNow.gold}**.`)],
      components: [backRow(userId)]
    });
    return;
  }

  db.prepare('UPDATE players SET gold=gold-?, hp=?, mp=? WHERE user_id=? AND guild_id=?')
    .run(healCost, pNow.max_hp, pNow.max_mp, actorId, guildId);

  await interaction.editReply({
    embeds: [new EmbedBuilder()
      .setColor(COLORS.success)
      .setTitle('💤 Nghỉ ngơi tại quán trọ')
      .setDescription(
        `**${pNow.name}** đã nghỉ ngơi đầy đủ.\n\n` +
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
  const leader  = getPlayer(userId, guildId)!;
  const date    = todayStr();
  const bounties = getDailyBounties(date);

  const lines = bounties.map((b, i) => {
    const claimed = isClaimed(userId, guildId, date, i);
    const done    = b.check(userId, guildId);
    const status  = claimed ? '✅ Leader đã nhận' : done ? '🟡 Leader sẵn sàng nhận' : '⬜ Leader chưa hoàn thành';
    const reward  = `🪙 **${b.reward.gold}**${b.reward.item ? ` + ${getItem(b.reward.item)?.icon ?? ''} ${getItem(b.reward.item)?.name ?? b.reward.item}` : ''}`;
    return `**${i + 1}. ${b.title}**\n> ${b.desc}\n> ${status} · ${reward}`;
  }).join('\n\n');

  const actors = getVillageActorIds(userId, guildId);
  const readyNames = actors.filter(id => bounties.some((b, i) => !isClaimed(id, guildId, date, i) && b.check(id, guildId)))
    .map(id => actorDisplayName(id, guildId));

  const boardEmbed = new EmbedBuilder()
    .setColor(0x3498DB)
    .setTitle('📋 Bảng Nhiệm Vụ')
    .setDescription(
      `*Hôm nay ${date}*\nLeader: **${leader.name}**\n\n${lines}\n\n` +
      (actors.length > 1
        ? `👥 Party: nút **Nhận thưởng của tôi** sẽ kiểm tra nhiệm vụ theo người bấm.\n` +
          `Sẵn sàng nhận: ${readyNames.length ? readyNames.map(n => `**${n}**`).join(', ') : '*chưa ai*'}`
        : '')
    )
    .setFooter({ text: 'Nhiệm vụ reset lúc 0:00 UTC mỗi ngày' });

  const leaderClaimableIdx = bounties.findIndex((b, i) =>
    !isClaimed(userId, guildId, date, i) && b.check(userId, guildId)
  );
  const anyClaimable = actors.some(id => bounties.some((b, i) => !isClaimed(id, guildId, date, i) && b.check(id, guildId)));

  const btnRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`vill_board_claim_${userId}`)
      .setLabel(actors.length > 1 ? 'Nhận thưởng của tôi' : 'Nhận thưởng')
      .setEmoji('🎁')
      .setStyle(ButtonStyle.Success)
      .setDisabled(actors.length > 1 ? !anyClaimable : leaderClaimableIdx === -1),
    new ButtonBuilder().setCustomId(`vill_back_${userId}`).setLabel('◀ Quay lại').setStyle(ButtonStyle.Secondary)
  );

  const msg = await interaction.editReply({ embeds: [boardEmbed], components: [btnRow] });

  if (actors.length <= 1 && leaderClaimableIdx === -1) return;
  if (actors.length > 1 && !anyClaimable) return;

  const btn = await msg.awaitMessageComponent({
    filter: villageActorFilter(userId, guildId),
    componentType: ComponentType.Button,
    time: 60_000
  }).catch(() => null);

  if (!btn) { await interaction.editReply({ components: [] }); return; }
  await safeDeferUpdate(btn);

  if (btn.customId === `vill_back_${userId}`) {
    await interaction.editReply({ components: [] });
    return;
  }

  const actorId = btn.user.id;
  const actor = getPlayer(actorId, guildId)!;

  // Claim all ready bounties for the member who clicked.
  let totalGold = 0;
  const itemsClaimed: string[] = [];
  for (let i = 0; i < bounties.length; i++) {
    if (isClaimed(actorId, guildId, date, i)) continue;
    if (!bounties[i].check(actorId, guildId)) continue;
    db.prepare('INSERT OR IGNORE INTO village_bounty_claims (user_id, guild_id, date, slot) VALUES (?, ?, ?, ?)')
      .run(actorId, guildId, date, i);
    totalGold += bounties[i].reward.gold;
    if (bounties[i].reward.item) {
      addItem(actorId, guildId, bounties[i].reward.item!, 1);
      itemsClaimed.push(bounties[i].reward.item!);
    }
  }

  if (totalGold <= 0 && itemsClaimed.length === 0) {
    await interaction.editReply({
      embeds: [simpleEmbed(COLORS.info, `📋 **${actor.name}** chưa có nhiệm vụ nào sẵn sàng nhận.`)],
      components: [backRow(userId)]
    });
    return;
  }

  db.prepare('UPDATE players SET gold=gold+? WHERE user_id=? AND guild_id=?').run(totalGold, actorId, guildId);

  await interaction.editReply({
    embeds: [new EmbedBuilder()
      .setColor(COLORS.success)
      .setTitle('🎁 Nhận thưởng nhiệm vụ!')
      .setDescription(
        `Người nhận: **${actor.name}**\n\n` +
        `🪙 **+${totalGold} Gold**` +
        (itemsClaimed.length > 0
          ? '\n' + itemsClaimed.map(id => `${getItem(id)?.icon ?? ''} ${getItem(id)?.name ?? id}`).join(', ')
          : '')
      )],
    components: [backRow(userId)]
  });
}

