import type { RunExploreEventInput } from './exploreEvents';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  Message
} from 'discord.js';
import { addItem, adjustReputation, getPlayer, grantExp, grantGold, updatePlayerHpMp } from '../systems/player';
import { COLORS, simpleEmbed } from '../utils/embeds';
import { pick, randInt } from '../utils/format';
import { onlyUser } from '../utils/collectors';

async function finish(ctx: RunExploreEventInput, embed: EmbedBuilder): Promise<void> {
  const msg = await ctx.interaction.editReply({
    embeds: [embed],
    components: ctx.callbacks.buildContinueExploreRow(ctx.userId)
  });
  await ctx.callbacks.attachContinueExploreHandler(msg as Message<boolean>, ctx.interaction, ctx.userId, ctx.guildId);
}

// ════════════════════════════════════════════════════════════════
//  MINES — Sập Hầm Mỏ
// ════════════════════════════════════════════════════════════════
export async function showMineCollapse(ctx: RunExploreEventInput): Promise<void> {
  const player = getPlayer(ctx.userId, ctx.guildId)!;
  const hpSafe = player.hp > Math.floor(player.max_hp * 0.25);

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`mc_rush_${ctx.userId}`)
      .setLabel('Lao vào lấy đồ')
      .setEmoji('💨')
      .setStyle(ButtonStyle.Danger)
      .setDisabled(!hpSafe),
    new ButtonBuilder().setCustomId(`mc_rescue_${ctx.userId}`).setLabel('Cứu thợ mỏ').setEmoji('🤝').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`mc_retreat_${ctx.userId}`).setLabel('Rút lui an toàn').setStyle(ButtonStyle.Secondary),
  );

  const embed = new EmbedBuilder()
    .setColor(0x8B4513)
    .setTitle('⛏️ Sập Hầm Mỏ')
    .setDescription(
      'Tiếng *RẦM* vang lên từ hầm phía trước — cột đỡ gãy, đất đá đổ ầm ầm.\n' +
      'Bụi mù bay trắng xóa. Giữa đống đổ nát, bạn nghe tiếng ai đó la hét kẹt bên trong.\n' +
      'Và... phía góc khuất, một hòm đồ cũ đang bị vùi lấp dần.\n\n' +
      (hpSafe ? '' : '*⚠️ HP quá thấp để lao vào!*')
    );

  const reply = await ctx.interaction.editReply({ embeds: [embed], components: [row] });
  const btn = await reply.awaitMessageComponent({ filter: onlyUser(ctx.userId), time: 30_000 }).catch(() => null);
  if (!btn || !btn.isButton()) return finish(ctx, simpleEmbed(COLORS.info, '⛏️ *Bạn do dự quá lâu — hầm sập hoàn toàn. Bạn rút lui.*'));
  await btn.deferUpdate().catch(() => {});

  const id = btn.customId;

  if (id === `mc_retreat_${ctx.userId}`) {
    return finish(ctx, simpleEmbed(COLORS.info,
      '⛏️ *Bạn lùi lại trước khi đất đá lấp hết lối vào.*\n\nKhông có gì — nhưng bạn còn sống.'
    ));
  }

  if (id === `mc_rescue_${ctx.userId}`) {
    const minerRewards = [
      { item: 'iron_ore', qty: 3, desc: '🪨 +**3× Iron Ore** (thợ mỏ cảm ơn)' },
      { item: 'copper_ore', qty: 2, desc: '🟤 +**2× Copper Ore** (thợ mỏ cảm ơn)' },
      { item: 'health_potion', qty: 1, desc: '🧪 +**1× Health Potion** (thợ mỏ chia sẻ)' },
    ];
    const reward = pick(minerRewards);
    addItem(ctx.userId, ctx.guildId, reward.item, reward.qty);
    const exp = randInt(20, 45);
    grantExp(ctx.userId, ctx.guildId, exp);
    const rep = adjustReputation(ctx.userId, ctx.guildId, 5);
    return finish(ctx, new EmbedBuilder()
      .setColor(COLORS.success)
      .setTitle('⛏️ Thợ Mỏ Được Cứu')
      .setDescription(
        'Bạn kéo người thợ mỏ ra khỏi đống đổ nát. Anh ta thở dốc, tay run rẩy.\n' +
        '*"Cảm ơn... tôi tưởng chết rồi..."*\n\n' +
        `${reward.desc}\n⭐ +**${exp} EXP**\n🤝 Reputation: **${rep}** (+5)`
      )
    );
  }

  // Lao vào lấy đồ
  const dmg = Math.max(1, Math.floor(player.max_hp * randInt(15, 25) / 100));
  const newHp = Math.max(1, player.hp - dmg);
  updatePlayerHpMp(ctx.userId, ctx.guildId, newHp, player.mp);

  const lootTable = [
    { type: 'gold', amount: randInt(60, 130) },
    { type: 'item', itemId: 'iron_ore', qty: randInt(2, 4) },
    { type: 'item', itemId: 'mysterious_shard', qty: 1 },
    { type: 'gold_and_item', amount: randInt(30, 60), itemId: 'copper_ore', qty: 2 },
  ];
  const loot = pick(lootTable);

  let lootDesc = '';
  if (loot.type === 'gold') {
    grantGold(ctx.userId, ctx.guildId, loot.amount!);
    lootDesc = `🪙 +**${loot.amount} Gold**`;
  } else if (loot.type === 'item') {
    addItem(ctx.userId, ctx.guildId, loot.itemId!, loot.qty!);
    lootDesc = `🎁 +**${loot.qty}× ${loot.itemId}**`;
  } else {
    grantGold(ctx.userId, ctx.guildId, loot.amount!);
    addItem(ctx.userId, ctx.guildId, loot.itemId!, loot.qty!);
    lootDesc = `🪙 +**${loot.amount} Gold**\n🎁 +**${loot.qty}× ${loot.itemId}**`;
  }

  return finish(ctx, new EmbedBuilder()
    .setColor(COLORS.warning)
    .setTitle('⛏️ Lao Vào Giữa Bụi Đá')
    .setDescription(
      'Bạn nhào vào trước khi đất đá lấp hết. Đá rơi trúng vai, bụi lấp vào mắt.\n' +
      'Nhưng hòm đồ đã nằm trong tay bạn.\n\n' +
      `❤️ HP mất **${dmg}** (${newHp}/${player.max_hp})\n${lootDesc}`
    )
  );
}

// ════════════════════════════════════════════════════════════════
//  MINES — Vỉa Quặng, Đường Hầm Vọng Âm, Thang Máy Gỉ
// ════════════════════════════════════════════════════════════════
export async function showMineRichOreVein(ctx: RunExploreEventInput): Promise<void> {
  const player = getPlayer(ctx.userId, ctx.guildId)!;
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`ov_mine_${ctx.userId}`).setLabel('Đào quặng').setEmoji('⛏️').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`ov_careful_${ctx.userId}`).setLabel('Đào cẩn thận').setEmoji('🧤').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`ov_mark_${ctx.userId}`).setLabel('Đánh dấu rồi đi').setEmoji('📍').setStyle(ButtonStyle.Secondary),
  );
  const embed = new EmbedBuilder()
    .setColor(0x777777)
    .setTitle('⛏️ Vỉa Quặng Lấp Lánh')
    .setDescription('Ánh đuốc phản chiếu lên một vỉa quặng mới lộ ra sau vách đá nứt. Có cả quặng thường lẫn tinh thể xanh nhạt.');
  const reply = await ctx.interaction.editReply({ embeds: [embed], components: [row] });
  const btn = await reply.awaitMessageComponent({ filter: onlyUser(ctx.userId), time: 30_000 }).catch(() => null);
  if (!btn || !btn.isButton()) return finish(ctx, simpleEmbed(COLORS.info, '⛏️ *Bạn đánh dấu vị trí trong đầu rồi đi tiếp.*'));
  await btn.deferUpdate().catch(() => {});

  if (btn.customId === `ov_mine_${ctx.userId}`) {
    addItem(ctx.userId, ctx.guildId, 'iron_ore', randInt(3, 6));
    if (randInt(1, 100) <= 30) addItem(ctx.userId, ctx.guildId, 'mana_crystal', 1);
    const dmg = Math.max(1, Math.floor(player.max_hp * 0.08));
    const hp = Math.max(1, player.hp - dmg);
    updatePlayerHpMp(ctx.userId, ctx.guildId, hp, player.mp);
    return finish(ctx, simpleEmbed(COLORS.warning, `⛏️ Bạn đào mạnh tay. Đá vụn rơi xuống vai, nhưng túi quặng đầy lên.\n🪨 +**3–6× Iron Ore**\n💠 Có thể nhận **Mana Crystal**\n❤️ HP mất **${dmg}**`));
  }

  if (btn.customId === `ov_careful_${ctx.userId}`) {
    addItem(ctx.userId, ctx.guildId, 'iron_ore', randInt(2, 4));
    const exp = randInt(20, 35);
    grantExp(ctx.userId, ctx.guildId, exp);
    return finish(ctx, simpleEmbed(COLORS.success, `🧤 Bạn tách quặng từng lớp, không làm hỏng tinh thể.\n🪨 +**2–4× Iron Ore**\n⭐ +**${exp} EXP**`));
  }

  grantExp(ctx.userId, ctx.guildId, 15);
  return finish(ctx, simpleEmbed(COLORS.info, '📍 Bạn đánh dấu vỉa quặng để tránh làm hầm sập.\n⭐ +**15 EXP** *(kinh nghiệm thăm dò)*'));
}

export async function showMineEchoTunnel(ctx: RunExploreEventInput): Promise<void> {
  const player = getPlayer(ctx.userId, ctx.guildId)!;
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`et_call_${ctx.userId}`).setLabel('Gọi vào bóng tối').setEmoji('📣').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`et_listen_${ctx.userId}`).setLabel('Lắng nghe vọng âm').setEmoji('👂').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`et_leave_${ctx.userId}`).setLabel('Đi đường khác').setStyle(ButtonStyle.Secondary),
  );
  const embed = new EmbedBuilder()
    .setColor(0x666688)
    .setTitle('📣 Đường Hầm Vọng Âm')
    .setDescription('Bạn bước tới một đường hầm dài hun hút. Mỗi tiếng thở của bạn vang lại thành nhiều giọng khác nhau.');
  const reply = await ctx.interaction.editReply({ embeds: [embed], components: [row] });
  const btn = await reply.awaitMessageComponent({ filter: onlyUser(ctx.userId), time: 30_000 }).catch(() => null);
  if (!btn || !btn.isButton() || btn.customId === `et_leave_${ctx.userId}`) return finish(ctx, simpleEmbed(COLORS.info, '📣 *Bạn chọn đường khác, ít tiếng vọng hơn.*'));
  await btn.deferUpdate().catch(() => {});

  if (btn.customId === `et_listen_${ctx.userId}`) {
    const exp = randInt(25, 50);
    grantExp(ctx.userId, ctx.guildId, exp);
    if (randInt(1, 100) <= 30) addItem(ctx.userId, ctx.guildId, 'silver_ore', 1);
    return finish(ctx, simpleEmbed(COLORS.info, `👂 Bạn nghe tiếng vọng và đoán ra một lối rẽ an toàn.\n⭐ +**${exp} EXP**\n🪙 Có thể tìm thấy **Silver Ore**.`));
  }

  const roll = randInt(1, 100);
  if (roll <= 45) {
    const gold = randInt(40, 90);
    grantGold(ctx.userId, ctx.guildId, gold);
    return finish(ctx, simpleEmbed(COLORS.gold, `📣 Tiếng gọi làm rơi một túi đồ từ khe đá phía trên.\n🪙 +**${gold} Gold**`));
  }
  if (ctx.enemies.length) {
    await ctx.interaction.editReply({ embeds: [simpleEmbed(COLORS.danger, '📣 Có thứ trả lời tiếng gọi của bạn — bằng tiếng móng vuốt trên đá.\n\n*Chiến đấu bắt đầu...*')], components: [] });
    await new Promise(r => setTimeout(r, 600));
    return ctx.callbacks.startCombat(pick(ctx.enemies).id);
  }
  const dmg = Math.max(1, Math.floor(player.max_hp * 0.1));
  const hp = Math.max(1, player.hp - dmg);
  updatePlayerHpMp(ctx.userId, ctx.guildId, hp, player.mp);
  return finish(ctx, simpleEmbed(COLORS.warning, `📣 Tiếng vọng làm trần hầm rung chuyển.\n❤️ HP mất **${dmg}**`));
}

export async function showMineRustedLift(ctx: RunExploreEventInput): Promise<void> {
  const player = getPlayer(ctx.userId, ctx.guildId)!;
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`rl_ride_${ctx.userId}`).setLabel('Đi xuống bằng thang').setEmoji('🛗').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`rl_repair_${ctx.userId}`).setLabel('Sửa tạm dây kéo').setEmoji('🔧').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`rl_salvage_${ctx.userId}`).setLabel('Gỡ phụ tùng').setEmoji('⚙️').setStyle(ButtonStyle.Secondary),
  );
  const embed = new EmbedBuilder()
    .setColor(0x8B6F47)
    .setTitle('🛗 Thang Máy Gỉ Sét')
    .setDescription('Một thang nâng cũ treo trên miệng hố sâu. Dây xích kêu ken két, nhưng bên dưới có ánh kim loại lấp lánh.');
  const reply = await ctx.interaction.editReply({ embeds: [embed], components: [row] });
  const btn = await reply.awaitMessageComponent({ filter: onlyUser(ctx.userId), time: 30_000 }).catch(() => null);
  if (!btn || !btn.isButton()) return finish(ctx, simpleEmbed(COLORS.info, '🛗 *Bạn không tin cái thang này và rời đi.*'));
  await btn.deferUpdate().catch(() => {});

  if (btn.customId === `rl_repair_${ctx.userId}`) {
    const exp = randInt(25, 45);
    grantExp(ctx.userId, ctx.guildId, exp);
    addItem(ctx.userId, ctx.guildId, 'rusty_gear', 2);
    return finish(ctx, simpleEmbed(COLORS.success, `🔧 Bạn sửa tạm bộ kéo rồi hạ thang xuống một đoạn an toàn.\n⚙️ +**2× Rusty Gear**\n⭐ +**${exp} EXP**`));
  }
  if (btn.customId === `rl_salvage_${ctx.userId}`) {
    addItem(ctx.userId, ctx.guildId, 'rusty_gear', randInt(2, 4));
    return finish(ctx, simpleEmbed(COLORS.info, '⚙️ Bạn gỡ được vài bánh răng còn dùng được.\n⚙️ +**2–4× Rusty Gear**'));
  }

  const dmg = Math.max(1, Math.floor(player.max_hp * randInt(8, 18) / 100));
  const hp = Math.max(1, player.hp - dmg);
  updatePlayerHpMp(ctx.userId, ctx.guildId, hp, player.mp);
  const rewards = [
    () => { grantGold(ctx.userId, ctx.guildId, randInt(90, 180)); return '🪙 Bạn tìm được một rương vàng cũ dưới đáy hố.'; },
    () => { addItem(ctx.userId, ctx.guildId, 'black_iron', 1); return '⬛ Bạn tìm được **1× Black Iron** trong lớp đá sâu.'; },
    () => { addItem(ctx.userId, ctx.guildId, 'mana_crystal', 2); return '💠 Bạn tìm được **2× Mana Crystal** mọc trên vách đá.'; },
  ];
  return finish(ctx, simpleEmbed(COLORS.warning, `🛗 Thang rơi nửa chừng rồi kẹt lại. Bạn sống sót, nhưng không nguyên vẹn.\n❤️ HP mất **${dmg}**\n${pick(rewards)()}`));
}

// EXTRA_EVENTS_MINES_START
export async function showMineRunawayCart(ctx: RunExploreEventInput): Promise<void> {
  const player = getPlayer(ctx.userId, ctx.guildId)!;
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`mrc_dodge_${ctx.userId}`).setLabel('Né sang bên').setEmoji('🏃').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`mrc_jump_${ctx.userId}`).setLabel('Nhảy lên xe').setEmoji('🛒').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`mrc_break_${ctx.userId}`).setLabel('Phá bánh xe').setEmoji('⚒️').setStyle(ButtonStyle.Secondary),
  );
  const embed = new EmbedBuilder().setColor(0x8b6f47).setTitle('🛒 Xe Mỏ Mất Kiểm Soát').setDescription('Một xe mỏ đầy đá lao xuống đường ray, tia lửa bắn tung tóe trong bóng tối.');
  const reply = await ctx.interaction.editReply({ embeds: [embed], components: [row] });
  const btn = await reply.awaitMessageComponent({ filter: onlyUser(ctx.userId), time: 30_000 }).catch(() => null);
  if (!btn || !btn.isButton()) { const dmg = Math.max(1, Math.floor(player.max_hp * 0.1)); updatePlayerHpMp(ctx.userId, ctx.guildId, Math.max(1, player.hp - dmg), player.mp); return finish(ctx, simpleEmbed(COLORS.warning, `💥 Bạn phản ứng quá chậm và bị xe quệt trúng.
❤️ HP mất **${dmg}**`)); }
  await btn.deferUpdate().catch(() => {});
  if (btn.customId === `mrc_dodge_${ctx.userId}`) { grantExp(ctx.userId, ctx.guildId, 20); return finish(ctx, simpleEmbed(COLORS.info, `🏃 Bạn né sát vách đá. Xe mỏ lao qua trong gang tấc.\n⭐ +**20 EXP**`)); }
  if (btn.customId === `mrc_break_${ctx.userId}`) { addItem(ctx.userId, ctx.guildId, 'rusty_gear', randInt(2, 4)); grantExp(ctx.userId, ctx.guildId, 30); return finish(ctx, simpleEmbed(COLORS.success, '⚒️ Bạn phá bánh xe và gom được phụ tùng.\n⚙️ +**2–4× Rusty Gear**\n⭐ +**30 EXP**')); }
  const dmg = Math.max(1, Math.floor(player.max_hp * randInt(8, 18) / 100)); updatePlayerHpMp(ctx.userId, ctx.guildId, Math.max(1, player.hp - dmg), player.mp); const gold = randInt(80, 170); grantGold(ctx.userId, ctx.guildId, gold); if (randInt(1, 100) <= 35) addItem(ctx.userId, ctx.guildId, 'silver_ore', 1);
  return finish(ctx, simpleEmbed(COLORS.gold, `🛒 Bạn nhảy lên xe và bị kéo tới một khoang mỏ bí mật.
❤️ HP mất **${dmg}**
💰 +**${gold} Gold**
⛏️ Có thể tìm thấy **Silver Ore**.`));
}

export async function showMineLivingOre(ctx: RunExploreEventInput): Promise<void> {
  const player = getPlayer(ctx.userId, ctx.guildId)!;
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`mlo_light_${ctx.userId}`).setLabel('Khai thác nhẹ').setEmoji('⛏️').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`mlo_deep_${ctx.userId}`).setLabel('Đào sâu').setEmoji('💎').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`mlo_listen_${ctx.userId}`).setLabel('Lắng nghe nhịp quặng').setEmoji('👂').setStyle(ButtonStyle.Secondary),
  );
  const embed = new EmbedBuilder().setColor(0x49796b).setTitle('💎 Vỉa Quặng Sống').setDescription('Một vỉa quặng xanh nhạt phập phồng như đang thở. Mỗi nhát cuốc làm cả vách đá run lên.');
  const reply = await ctx.interaction.editReply({ embeds: [embed], components: [row] });
  const btn = await reply.awaitMessageComponent({ filter: onlyUser(ctx.userId), time: 30_000 }).catch(() => null);
  if (!btn || !btn.isButton()) return finish(ctx, simpleEmbed(COLORS.info, '🚶 Bạn không chạm vào vỉa quặng sống.'));
  await btn.deferUpdate().catch(() => {});
  if (btn.customId === `mlo_light_${ctx.userId}`) { addItem(ctx.userId, ctx.guildId, 'iron_ore', randInt(2, 5)); if (randInt(1, 100) <= 30) addItem(ctx.userId, ctx.guildId, 'mana_crystal', 1); return finish(ctx, simpleEmbed(COLORS.success, '⛏️ Bạn khai thác vừa đủ trước khi vỉa quặng khép lại.\n📦 +**2–5× Iron Ore**\n🔮 Có thể nhận **Mana Crystal**.')); }
  if (btn.customId === `mlo_listen_${ctx.userId}`) { const exp = randInt(35, 75); grantExp(ctx.userId, ctx.guildId, exp); addItem(ctx.userId, ctx.guildId, 'mana_crystal', 1); return finish(ctx, simpleEmbed(COLORS.magic, `👂 Bạn nghe được nhịp của vỉa quặng và tách đúng tinh thể sống.
🔮 +**1× Mana Crystal**
⭐ +**${exp} EXP**`)); }
  const dmg = Math.max(1, Math.floor(player.max_hp * 0.14)); updatePlayerHpMp(ctx.userId, ctx.guildId, Math.max(1, player.hp - dmg), player.mp); addItem(ctx.userId, ctx.guildId, 'black_iron', 1); addItem(ctx.userId, ctx.guildId, 'mana_crystal', 1);
  return finish(ctx, simpleEmbed(COLORS.warning, `💎 Bạn đào quá sâu. Vỉa quặng co giật, đá sắc cắt vào tay.
❤️ HP mất **${dmg}**
⬛ +**1× Black Iron**
🔮 +**1× Mana Crystal**`));
}

export async function showMineTrappedMiner(ctx: RunExploreEventInput): Promise<void> {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`mtm_rescue_${ctx.userId}`).setLabel('Cứu thợ mỏ').setEmoji('🧑‍🏭').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`mtm_take_${ctx.userId}`).setLabel('Lấy túi đồ trước').setEmoji('🎒').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`mtm_call_${ctx.userId}`).setLabel('Gọi đội cứu hộ').setEmoji('📣').setStyle(ButtonStyle.Primary),
  );
  const embed = new EmbedBuilder().setColor(0x8b4513).setTitle('🧑‍🏭 Thợ Mỏ Bị Kẹt').setDescription('Một cánh tay thò ra dưới đống đá. Bên cạnh là túi dụng cụ còn nguyên vẹn.');
  const reply = await ctx.interaction.editReply({ embeds: [embed], components: [row] });
  const btn = await reply.awaitMessageComponent({ filter: onlyUser(ctx.userId), time: 30_000 }).catch(() => null);
  if (!btn || !btn.isButton()) return finish(ctx, simpleEmbed(COLORS.info, '🚶 Tiếng gọi yếu dần phía sau khi bạn rời đi.'));
  await btn.deferUpdate().catch(() => {});
  if (btn.customId === `mtm_rescue_${ctx.userId}`) { const rep = adjustReputation(ctx.userId, ctx.guildId, 9); const exp = randInt(35, 70); grantExp(ctx.userId, ctx.guildId, exp); addItem(ctx.userId, ctx.guildId, pick(['iron_ore', 'copper_ore', 'rusty_gear']), 2); return finish(ctx, simpleEmbed(COLORS.success, `🧑‍🏭 Bạn kéo thợ mỏ ra khỏi đống đá.
⭐ +**${exp} EXP**
📦 +**2 vật liệu mỏ**
📈 Reputation: **${rep}** (+9)`)); }
  if (btn.customId === `mtm_call_${ctx.userId}`) { const rep = adjustReputation(ctx.userId, ctx.guildId, 4); grantExp(ctx.userId, ctx.guildId, 25); return finish(ctx, simpleEmbed(COLORS.info, `📣 Bạn đánh dấu vị trí và gọi đội cứu hộ.
⭐ +**25 EXP**
📈 Reputation: **${rep}** (+4)`)); }
  const gold = randInt(60, 130); grantGold(ctx.userId, ctx.guildId, gold); const rep = adjustReputation(ctx.userId, ctx.guildId, -10); return finish(ctx, simpleEmbed(COLORS.warning, `🎒 Bạn lấy túi đồ rồi rời đi trước khi hầm sập tiếp.
💰 +**${gold} Gold**
📉 Reputation: **${rep}** (-10)`));
}
// EXTRA_EVENTS_MINES_END
