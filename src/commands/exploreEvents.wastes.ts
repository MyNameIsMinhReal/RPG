import type { RunExploreEventInput } from './exploreEvents';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  Message
} from 'discord.js';
import { addItem, adjustReputation, getPlayer, getEffectivePlayer, grantExp, grantGold, grantSoulShards, spendGold, updatePlayerHpMp } from '../systems/player';
import { setBuff } from '../systems/consumables';
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
//  WASTES — Bão Tro Lửa
// ════════════════════════════════════════════════════════════════
export async function showWastesAshStorm(ctx: RunExploreEventInput): Promise<void> {
  const player = getEffectivePlayer(ctx.userId, ctx.guildId)!;

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`ws_charge_${ctx.userId}`).setLabel('Lao thẳng vào').setEmoji('⚡').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`ws_shelter_${ctx.userId}`).setLabel('Tìm nơi ẩn náu').setEmoji('🪨').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`ws_endure_${ctx.userId}`).setLabel('Chống chịu bằng ý chí').setEmoji('💪').setStyle(ButtonStyle.Secondary),
  );

  const embed = new EmbedBuilder()
    .setColor(0x8B0000)
    .setTitle('🌪️ Bão Tro Lửa')
    .setDescription(
      'Một cơn bão tro đỏ lựng ập đến từ phía chân trời — nhanh hơn bạn tưởng.\n' +
      'Không khí đặc quánh, mắt rát như lửa đốt, mỗi nhịp thở đều bỏng rát lồng ngực.\n\n' +
      '**Bạn cần quyết định ngay:**\n' +
      '⚡ Lao vào để tìm thứ gì đó ẩn trong bão\n' +
      '🪨 Tìm nơi trú ẩn chờ bão qua\n' +
      '💪 Đứng im chịu đựng — rèn luyện ý chí'
    );

  const reply = await ctx.interaction.editReply({ embeds: [embed], components: [row] });
  const btn = await reply.awaitMessageComponent({ filter: onlyUser(ctx.userId), time: 30_000 }).catch(() => null);
  if (!btn || !btn.isButton()) {
    // Timeout — mặc định bị bão quét
    const dmg = Math.max(1, Math.floor(player.max_hp * 0.10));
    const newHp = Math.max(1, player.hp - dmg);
    updatePlayerHpMp(ctx.userId, ctx.guildId, newHp, player.mp);
    return finish(ctx, simpleEmbed(COLORS.danger,
      `🌪️ *Bạn đứng ngẩn nhìn bão ập đến.*\n\nBị bão cuốn: ❤️ mất **${dmg}** HP.`
    ));
  }
  await btn.deferUpdate().catch(() => {});

  const id = btn.customId;

  if (id === `ws_shelter_${ctx.userId}`) {
    // An toàn — tìm loot nhỏ trong hang đá
    const shelterLoot = [
      { fn: () => { const g = randInt(25, 55); grantGold(ctx.userId, ctx.guildId, g); return `🪙 +**${g} Gold** (từ xương của kẻ không qua được bão trước)`; } },
      { fn: () => { addItem(ctx.userId, ctx.guildId, 'mysterious_shard', 1); return `💎 +**1× Mysterious Shard** (tìm thấy trong vách đá)` } },
      { fn: () => { addItem(ctx.userId, ctx.guildId, 'herb', 2); return `🌿 +**2× Herb** (mọc trong hốc đá)` } },
    ];
    const loot = pick(shelterLoot);
    const desc = loot.fn();
    return finish(ctx, new EmbedBuilder()
      .setColor(COLORS.info)
      .setTitle('🪨 Ẩn Náu Trong Hang Đá')
      .setDescription(
        'Bạn tìm được một hốc đá nhỏ và nép vào đó. Bão tro gào thét bên ngoài.\n' +
        'Sau vài phút, cơn bão đi qua. Bạn thở phào... và nhìn thấy:\n\n' + desc
      )
    );
  }

  if (id === `ws_endure_${ctx.userId}`) {
    // Chống chịu — nhận ATK buff cho combat tiếp theo
    const dmg = Math.max(1, Math.floor(player.max_hp * 0.06));
    const newHp = Math.max(1, player.hp - dmg);
    updatePlayerHpMp(ctx.userId, ctx.guildId, newHp, player.mp);
    setBuff(ctx.userId, ctx.guildId, 'weapon_oil', 10, 1, 3600);
    return finish(ctx, new EmbedBuilder()
      .setColor(COLORS.warning)
      .setTitle('💪 Ý Chí Sắt Đá')
      .setDescription(
        'Bạn nhắm mắt, cúi thấp người, để bão cuốn qua mà không nhúc nhích.\n' +
        'Khi bão tan, bạn vẫn đứng nguyên — thân thể đau nhức nhưng tinh thần rực lửa.\n\n' +
        `❤️ HP mất **${dmg}** (${newHp}/${player.max_hp})\n` +
        `⚔️ **ATK +10%** trận combat kế tiếp *(ý chí sau bão)*`
      )
    );
  }

  // Lao thẳng vào bão — HP damage cao nhưng loot tốt
  const dmgPct = randInt(18, 28);
  const dmg = Math.max(1, Math.floor(player.max_hp * dmgPct / 100));
  const newHp = Math.max(1, player.hp - dmg);
  updatePlayerHpMp(ctx.userId, ctx.guildId, newHp, player.mp);

  const chargeLoot = [
    { fn: () => { const g = randInt(80, 160); grantGold(ctx.userId, ctx.guildId, g); return `🪙 +**${g} Gold** (từ đống tàn tích bị bão vùi lấp)`; } },
    { fn: () => { addItem(ctx.userId, ctx.guildId, 'mysterious_shard', 2); return `💎 +**2× Mysterious Shard**`; } },
    { fn: () => { const g = randInt(40, 80); grantGold(ctx.userId, ctx.guildId, g); addItem(ctx.userId, ctx.guildId, 'ash_crystal', 1); return `🪙 +**${g} Gold**\n🔴 +**1× Ash Crystal** *(vật liệu hiếm từ bão)*`; } },
  ];
  const loot = pick(chargeLoot);
  const desc = loot.fn();

  return finish(ctx, new EmbedBuilder()
    .setColor(COLORS.danger)
    .setTitle('⚡ Lao Vào Lửa Và Tro')
    .setDescription(
      'Bạn lao thẳng vào tâm bão. Tro nóng xé da thịt, gió quật ngã bạn vài lần.\n' +
      'Nhưng giữa tro tàn, bạn tìm thấy thứ bão đã mang đến:\n\n' +
      `❤️ HP mất **${dmg}** (${newHp}/${player.max_hp})\n` +
      desc
    )
  );
}

// ════════════════════════════════════════════════════════════════
//  WASTES — Đoàn Xương, Ảo Ảnh Kính, Cờ Gãy
// ════════════════════════════════════════════════════════════════
export async function showWastesBoneCaravan(ctx: RunExploreEventInput): Promise<void> {
  const player = getEffectivePlayer(ctx.userId, ctx.guildId)!;
  const canBuy = player.gold >= 120;
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`bc_buy_${ctx.userId}`).setLabel('Mua hàng xương').setEmoji('🦴').setStyle(ButtonStyle.Primary).setDisabled(!canBuy),
    new ButtonBuilder().setCustomId(`bc_barter_${ctx.userId}`).setLabel('Mặc cả').setEmoji('🤝').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`bc_rob_${ctx.userId}`).setLabel('Cướp đoàn xe').setEmoji('🗡️').setStyle(ButtonStyle.Danger),
  );
  const embed = new EmbedBuilder()
    .setColor(0x8A6A4A)
    .setTitle('🦴 Đoàn Xe Xương Trắng')
    .setDescription('Một đoàn xe kéo bởi những bộ xương không đầu đi ngang qua bãi hoang. Người bán hàng đội mũ rộng vành, giọng khô như cát.\n\n**Giá đặc biệt:** 120 Gold cho một món hàng lạ.');
  const reply = await ctx.interaction.editReply({ embeds: [embed], components: [row] });
  const btn = await reply.awaitMessageComponent({ filter: onlyUser(ctx.userId), time: 30_000 }).catch(() => null);
  if (!btn || !btn.isButton()) return finish(ctx, simpleEmbed(COLORS.info, '🦴 *Đoàn xe lặng lẽ đi qua, để lại vệt bánh xe trên tro bụi.*'));
  await btn.deferUpdate().catch(() => {});

  if (btn.customId === `bc_buy_${ctx.userId}`) {
    spendGold(ctx.userId, ctx.guildId, 120);
    const table = ['bone_glue', 'ancient_bone', 'cursed_blood', 'broken_soul'] as const;
    const item = pick([...table]);
    addItem(ctx.userId, ctx.guildId, item, 1);
    return finish(ctx, simpleEmbed(COLORS.gold, `🦴 Người bán hàng đưa ra một gói bọc vải đen.\n💰 -**120 Gold**\n🎁 +**1× ${item}**`));
  }

  if (btn.customId === `bc_barter_${ctx.userId}`) {
    const roll = randInt(1, 100);
    if (roll <= 60) {
      const gold = randInt(30, 70);
      grantGold(ctx.userId, ctx.guildId, gold);
      addItem(ctx.userId, ctx.guildId, 'bone_shard', 2);
      return finish(ctx, simpleEmbed(COLORS.success, `🤝 Bạn mặc cả bằng những câu chuyện đường xa. Người bán bật cười khô khốc.\n🪙 +**${gold} Gold**\n🦴 +**2× Bone Shard**`));
    }
    const dmg = Math.max(1, Math.floor(player.max_hp * 0.08));
    const hp = Math.max(1, player.hp - dmg);
    updatePlayerHpMp(ctx.userId, ctx.guildId, hp, player.mp);
    return finish(ctx, simpleEmbed(COLORS.warning, `🤝 Bạn mặc cả sai lời. Một bộ xương đập cán giáo vào vai bạn.\n❤️ HP mất **${dmg}**`));
  }

  const rep = adjustReputation(ctx.userId, ctx.guildId, -10);
  if (ctx.enemies.length && randInt(1, 100) <= 65) {
    await ctx.interaction.editReply({ embeds: [simpleEmbed(COLORS.danger, `🗡️ Bạn rút vũ khí. Những bộ xương quay đầu cùng lúc.\n🤝 Reputation: **${rep}** (-10)\n\n*Chiến đấu bắt đầu...*`)], components: [] });
    await new Promise(r => setTimeout(r, 600));
    return ctx.callbacks.startCombat(pick(ctx.enemies).id);
  }
  grantGold(ctx.userId, ctx.guildId, randInt(100, 180));
  return finish(ctx, simpleEmbed(COLORS.warning, `🗡️ Bạn cướp được một túi tiền trước khi đoàn xe tan thành bụi.\n🤝 Reputation: **${rep}** (-10)\n🪙 +**100–180 Gold**`));
}

export async function showWastesGlassMirage(ctx: RunExploreEventInput): Promise<void> {
  const player = getEffectivePlayer(ctx.userId, ctx.guildId)!;
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`gm_enter_${ctx.userId}`).setLabel('Bước vào ảo ảnh').setEmoji('🏜️').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`gm_break_${ctx.userId}`).setLabel('Đập mặt kính').setEmoji('🪞').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`gm_leave_${ctx.userId}`).setLabel('Đi vòng qua').setStyle(ButtonStyle.Secondary),
  );
  const embed = new EmbedBuilder()
    .setColor(0xE0C080)
    .setTitle('🏜️ Ảo Ảnh Kính')
    .setDescription('Giữa bãi hoang xuất hiện một thành phố bằng kính, phản chiếu bầu trời không có thật. Mỗi tòa tháp cho bạn thấy một phiên bản khác của chính mình.');
  const reply = await ctx.interaction.editReply({ embeds: [embed], components: [row] });
  const btn = await reply.awaitMessageComponent({ filter: onlyUser(ctx.userId), time: 30_000 }).catch(() => null);
  if (!btn || !btn.isButton() || btn.customId === `gm_leave_${ctx.userId}`) return finish(ctx, simpleEmbed(COLORS.info, '🏜️ *Bạn đi vòng qua. Khi nhìn lại, thành phố kính đã biến mất.*'));
  await btn.deferUpdate().catch(() => {});

  if (btn.customId === `gm_enter_${ctx.userId}`) {
    const outcomes = [
      () => { const exp = randInt(40, 80); grantExp(ctx.userId, ctx.guildId, exp); return `⭐ +**${exp} EXP** *(ký ức của một đời khác)*`; },
      () => { addItem(ctx.userId, ctx.guildId, 'fallen_star_fragment', 1); return '⭐ +**1× Fallen Star Fragment**'; },
      () => { const mp = Math.min(player.max_mp, player.mp + Math.floor(player.max_mp * 0.7)); updatePlayerHpMp(ctx.userId, ctx.guildId, player.hp, mp); return `🔵 MP: **${mp}/${player.max_mp}**`; },
    ];
    return finish(ctx, simpleEmbed(COLORS.magic, `🏜️ Bạn bước vào ảo ảnh. Một khoảnh khắc kéo dài như nhiều năm.\n${pick(outcomes)()}`));
  }

  const dmg = Math.max(1, Math.floor(player.max_hp * 0.16));
  const hp = Math.max(1, player.hp - dmg);
  updatePlayerHpMp(ctx.userId, ctx.guildId, hp, player.mp);
  addItem(ctx.userId, ctx.guildId, 'void_fragment', 1);
  return finish(ctx, simpleEmbed(COLORS.warning, `🪞 Bạn đập vỡ một mặt kính. Các mảnh vỡ rơi lên da như mưa lạnh.\n🌑 +**1× Void Fragment**\n❤️ HP mất **${dmg}**`));
}

export async function showWastesFallenBanner(ctx: RunExploreEventInput): Promise<void> {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`fb_raise_${ctx.userId}`).setLabel('Dựng lại lá cờ').setEmoji('🚩').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`fb_search_${ctx.userId}`).setLabel('Lục doanh trại').setEmoji('🎒').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`fb_burn_${ctx.userId}`).setLabel('Đốt cờ').setEmoji('🔥').setStyle(ButtonStyle.Danger),
  );
  const embed = new EmbedBuilder()
    .setColor(0xAA3333)
    .setTitle('🚩 Lá Cờ Gãy Trong Tro')
    .setDescription('Một lá cờ rách cắm nghiêng giữa đống tàn tích doanh trại. Biểu tượng trên vải đã phai, nhưng vẫn khiến bạn thấy nặng ngực.');
  const reply = await ctx.interaction.editReply({ embeds: [embed], components: [row] });
  const btn = await reply.awaitMessageComponent({ filter: onlyUser(ctx.userId), time: 30_000 }).catch(() => null);
  if (!btn || !btn.isButton()) return finish(ctx, simpleEmbed(COLORS.info, '🚩 *Bạn để lá cờ nằm lại cùng tro bụi.*'));
  await btn.deferUpdate().catch(() => {});

  if (btn.customId === `fb_raise_${ctx.userId}`) {
    const exp = randInt(30, 65);
    const rep = adjustReputation(ctx.userId, ctx.guildId, 4);
    grantExp(ctx.userId, ctx.guildId, exp);
    return finish(ctx, simpleEmbed(COLORS.success, `🚩 Bạn dựng lại lá cờ. Gió thổi qua như một tiếng thở dài nhẹ nhõm.\n⭐ +**${exp} EXP**\n🤝 Reputation: **${rep}** (+4)`));
  }
  if (btn.customId === `fb_search_${ctx.userId}`) {
    grantGold(ctx.userId, ctx.guildId, randInt(60, 120));
    addItem(ctx.userId, ctx.guildId, 'black_iron', 1);
    return finish(ctx, simpleEmbed(COLORS.gold, '🎒 Bạn lục trong doanh trại cũ và tìm thấy đồ còn dùng được.\n🪙 +**60–120 Gold**\n⬛ +**1× Black Iron**'));
  }
  grantSoulShards(ctx.userId, ctx.guildId, 1);
  setBuff(ctx.userId, ctx.guildId, 'rage_elixir', 10, 1, 3600);
  return finish(ctx, simpleEmbed(COLORS.warning, '🔥 Lá cờ cháy lên ngọn lửa xanh đen. Có thứ gì đó trong bạn cũng bùng cháy theo.\n💀 +**1 Soul Shard**\n🔥 Trận kế tiếp: **ATK +10%**, nhưng nguy hiểm hơn.'));
}

// EXTRA_EVENTS_WASTES_START
export async function showWastesMirrorSelf(ctx: RunExploreEventInput): Promise<void> {
  const player = getEffectivePlayer(ctx.userId, ctx.guildId)!;
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`wms_talk_${ctx.userId}`).setLabel('Nói chuyện').setEmoji('💬').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`wms_fight_${ctx.userId}`).setLabel('Chiến đấu').setEmoji('⚔️').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`wms_touch_${ctx.userId}`).setLabel('Chạm vào ảo ảnh').setEmoji('🪞').setStyle(ButtonStyle.Secondary),
  );
  const embed = new EmbedBuilder().setColor(0x9b59b6).setTitle('🪞 Ảo Ảnh Của Chính Mình').setDescription('Một phiên bản khác của bạn đứng giữa hoang nguyên. Nó cười như đã biết trước mọi lựa chọn.');
  const reply = await ctx.interaction.editReply({ embeds: [embed], components: [row] });
  const btn = await reply.awaitMessageComponent({ filter: onlyUser(ctx.userId), time: 30_000 }).catch(() => null);
  if (!btn || !btn.isButton()) return finish(ctx, simpleEmbed(COLORS.info, '🪞 Ảo ảnh tan vào gió nóng.'));
  await btn.deferUpdate().catch(() => {});
  if (btn.customId === `wms_talk_${ctx.userId}`) { const exp = randInt(45, 90); grantExp(ctx.userId, ctx.guildId, exp); setBuff(ctx.userId, ctx.guildId, 'luck', 10, 1, 1800); return finish(ctx, simpleEmbed(COLORS.magic, `💬 Ảo ảnh thì thầm về một sai lầm bạn chưa phạm phải.
⭐ +**${exp} EXP**
✨ Nhận **Luck** cho lần khám phá sau.`)); }
  if (btn.customId === `wms_touch_${ctx.userId}`) { if (randInt(1, 100) <= 45) { const mp = Math.min(player.max_mp, player.mp + Math.floor(player.max_mp * 0.5)); updatePlayerHpMp(ctx.userId, ctx.guildId, player.hp, mp); grantSoulShards(ctx.userId, ctx.guildId, 1); return finish(ctx, simpleEmbed(COLORS.success, `🪞 Bạn chạm vào chính mình ở một tương lai khác.
🔮 MP: **${mp}/${player.max_mp}**
💠 +**1 Soul Shard**`)); } const dmg = Math.max(1, Math.floor(player.max_hp * 0.14)); updatePlayerHpMp(ctx.userId, ctx.guildId, Math.max(1, player.hp - dmg), player.mp); return finish(ctx, simpleEmbed(COLORS.warning, `🪞 Ký ức không thuộc về bạn tràn vào đầu.
❤️ HP mất **${dmg}**`)); }
  if (!ctx.enemies.length) return finish(ctx, simpleEmbed(COLORS.info, '🪞 Ảo ảnh biến mất trước khi trận đấu bắt đầu.'));
  await ctx.interaction.editReply({ embeds: [simpleEmbed(COLORS.danger, '⚔️ Bạn rút vũ khí. Ảo ảnh cũng làm y hệt.\n\n*Chiến đấu bắt đầu...*')], components: [] });
  await new Promise(r => setTimeout(r, 600));
  return ctx.callbacks.startCombat(pick(ctx.enemies).id);
}

export async function showWastesMemoryRain(ctx: RunExploreEventInput): Promise<void> {
  const player = getEffectivePlayer(ctx.userId, ctx.guildId)!;
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`wmr_stand_${ctx.userId}`).setLabel('Đứng dưới mưa').setEmoji('🌧️').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`wmr_collect_${ctx.userId}`).setLabel('Hứng nước mưa').setEmoji('🧪').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`wmr_run_${ctx.userId}`).setLabel('Chạy khỏi mưa').setStyle(ButtonStyle.Secondary),
  );
  const embed = new EmbedBuilder().setColor(0x708090).setTitle('🌧️ Cơn Mưa Ký Ức').setDescription('Những giọt mưa rơi xuống tro bụi, mỗi giọt phản chiếu một ký ức không rõ là của ai.');
  const reply = await ctx.interaction.editReply({ embeds: [embed], components: [row] });
  const btn = await reply.awaitMessageComponent({ filter: onlyUser(ctx.userId), time: 30_000 }).catch(() => null);
  if (!btn || !btn.isButton() || btn.customId === `wmr_run_${ctx.userId}`) return finish(ctx, simpleEmbed(COLORS.info, '🏃 Bạn chạy khỏi cơn mưa trước khi ký ức bám vào da.'));
  await btn.deferUpdate().catch(() => {});
  if (btn.customId === `wmr_collect_${ctx.userId}`) { addItem(ctx.userId, ctx.guildId, 'void_fragment', 1); if (randInt(1, 100) <= 40) addItem(ctx.userId, ctx.guildId, 'fallen_star_fragment', 1); return finish(ctx, simpleEmbed(COLORS.success, '🧪 Bạn hứng được nước mưa trong một mảnh kính vỡ.\n📦 +**1× Void Fragment**\n⭐ Có thể nhận **Fallen Star Fragment**.')); }
  const exp = randInt(70, 130); grantExp(ctx.userId, ctx.guildId, exp); const dmg = Math.max(1, Math.floor(player.max_hp * 0.08)); updatePlayerHpMp(ctx.userId, ctx.guildId, Math.max(1, player.hp - dmg), player.mp); return finish(ctx, simpleEmbed(COLORS.magic, `🌧️ Bạn để ký ức ngấm vào mình. Có đau, nhưng cũng có hiểu biết.
⭐ +**${exp} EXP**
❤️ HP mất **${dmg}**`));
}

export async function showWastesFacelessMerchant(ctx: RunExploreEventInput): Promise<void> {
  const player = getEffectivePlayer(ctx.userId, ctx.guildId)!;
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`wfm_gold_${ctx.userId}`).setLabel('Mua bằng 180G').setEmoji('💰').setStyle(ButtonStyle.Primary).setDisabled(player.gold < 180),
    new ButtonBuilder().setCustomId(`wfm_soul_${ctx.userId}`).setLabel('Trả 1 Soul Shard').setEmoji('💠').setStyle(ButtonStyle.Danger).setDisabled((player.soul_shards ?? 0) < 1),
    new ButtonBuilder().setCustomId(`wfm_name_${ctx.userId}`).setLabel('Hỏi tên hắn').setEmoji('❔').setStyle(ButtonStyle.Secondary),
  );
  const embed = new EmbedBuilder().setColor(0x111111).setTitle('🕳️ Người Buôn Không Có Mặt').setDescription('Một thương nhân trùm khăn đen đứng cạnh xe hàng. Dưới mũ không có mắt, mũi hay miệng.');
  const reply = await ctx.interaction.editReply({ embeds: [embed], components: [row] });
  const btn = await reply.awaitMessageComponent({ filter: onlyUser(ctx.userId), time: 30_000 }).catch(() => null);
  if (!btn || !btn.isButton()) return finish(ctx, simpleEmbed(COLORS.info, '🕳️ Người buôn không mặt biến mất khi bạn chớp mắt.'));
  await btn.deferUpdate().catch(() => {});
  if (btn.customId === `wfm_gold_${ctx.userId}`) { spendGold(ctx.userId, ctx.guildId, 180); const item = pick(['black_iron', 'void_fragment', 'fallen_star_fragment', 'cursed_blood']); addItem(ctx.userId, ctx.guildId, item, 1); return finish(ctx, simpleEmbed(COLORS.gold, `💰 Bạn mua một món hàng được bọc bằng vải không đổ bóng.
💰 -**180 Gold**
📦 +**1× ${item}**`)); }
  if (btn.customId === `wfm_soul_${ctx.userId}`) { grantSoulShards(ctx.userId, ctx.guildId, -1); const item = pick(['fallen_star_fragment', 'void_fragment', 'black_iron']); addItem(ctx.userId, ctx.guildId, item, 2); return finish(ctx, simpleEmbed(COLORS.warning, `💠 Bạn đặt Soul Shard lên bàn. Người buôn gật đầu dù không có mặt.
💠 -**1 Soul Shard**
📦 +**2× ${item}**`)); }
  if (randInt(1, 100) <= 50) { setBuff(ctx.userId, ctx.guildId, 'black_market_access', 1, 1, 3600); return finish(ctx, simpleEmbed(COLORS.magic, '❔ Khi bạn hỏi tên, hắn viết một ký hiệu lên tay bạn.\n🕳️ Mở quyền vào **Black Market** trong 1 giờ.')); }
  const dmg = Math.max(1, Math.floor(player.max_hp * 0.12)); updatePlayerHpMp(ctx.userId, ctx.guildId, Math.max(1, player.hp - dmg), player.mp); return finish(ctx, simpleEmbed(COLORS.danger, `❔ Bạn hỏi tên hắn. Trong đầu bạn vang lên một tiếng không nên được nghe.
❤️ HP mất **${dmg}**`));
}
// EXTRA_EVENTS_WASTES_END
