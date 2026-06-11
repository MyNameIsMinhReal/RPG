import type { RunExploreEventInput } from './exploreEvents';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  Message
} from 'discord.js';
import { addItem, adjustReputation, getItemQty, getPlayer, getEffectivePlayer, grantExp, grantGold, grantSoulShards, removeItem, spendGold, updatePlayerHpMp } from '../systems/player';
import { COLORS, simpleEmbed } from '../utils/embeds';
import { pick, randInt } from '../utils/format';
import { onlyUser } from '../utils/collectors';
import { adjustCorruption } from '../systems/corruption';

async function finish(ctx: RunExploreEventInput, embed: EmbedBuilder): Promise<void> {
  const msg = await ctx.interaction.editReply({
    embeds: [embed],
    components: ctx.callbacks.buildContinueExploreRow(ctx.userId)
  });
  await ctx.callbacks.attachContinueExploreHandler(msg as Message<boolean>, ctx.interaction, ctx.userId, ctx.guildId);
}



// ════════════════════════════════════════════════════════════════
//  SHRINE — Echo Demon key-item events
// ════════════════════════════════════════════════════════════════
export async function showShrineEchoDoor(ctx: RunExploreEventInput): Promise<void> {
  if (getItemQty(ctx.userId, ctx.guildId, 'echo_trace') > 0) {
    return finish(ctx, simpleEmbed(COLORS.info, '👁️ Cánh cửa đá vẫn thì thầm, nhưng **Echo Trace** trong túi bạn đã đáp lại. Không cần lấy thêm dấu vết này.'));
  }
  const hasSalt = getItemQty(ctx.userId, ctx.guildId, 'purifying_salt') > 0;
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`ed_listen_${ctx.userId}`).setLabel('Lắng nghe').setEmoji('🕯️').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`ed_salt_${ctx.userId}`).setLabel('Rắc muối thanh tẩy').setEmoji('🧂').setStyle(ButtonStyle.Success).setDisabled(!hasSalt),
    new ButtonBuilder().setCustomId(`ed_leave_${ctx.userId}`).setLabel('Rời đi').setEmoji('🚪').setStyle(ButtonStyle.Secondary),
  );
  const embed = new EmbedBuilder()
    .setColor(0x7c3aed)
    .setTitle('👁️ Tiếng Vọng Sau Cánh Cửa')
    .setDescription('Sau một bức tường đá, có giọng nói gọi đúng tên bạn. Cánh cửa không có tay nắm, chỉ có một khe mắt mở hé trong bóng tối.')
    .setFooter({ text: hasSalt ? 'Muối thanh tẩy có thể ổn định tiếng vọng.' : 'Bạn không có Purifying Salt.' });
  const reply = await ctx.interaction.editReply({ embeds: [embed], components: [row] });
  const btn = await reply.awaitMessageComponent({ filter: onlyUser(ctx.userId), time: 30_000 }).catch(() => null);
  if (!btn || !btn.isButton() || btn.customId === `ed_leave_${ctx.userId}`) return finish(ctx, simpleEmbed(COLORS.info, '🚪 Bạn rời khỏi cánh cửa trước khi tiếng gọi học được thêm điều gì về bạn.'));
  await btn.deferUpdate().catch(() => {});

  if (btn.customId === `ed_salt_${ctx.userId}`) {
    removeItem(ctx.userId, ctx.guildId, 'purifying_salt', 1);
    adjustCorruption(ctx.userId, ctx.guildId, -8);
    addItem(ctx.userId, ctx.guildId, 'echo_trace', 1);
    return finish(ctx, simpleEmbed(COLORS.success, `🧂 Muối trắng cháy thành vòng sáng. Giọng nói im bặt, để lại một dấu khắc trong ký ức.
🔑 +**1× Echo Trace**
🌘 Corruption -8`));
  }

  if (randInt(1, 100) <= 70) {
    addItem(ctx.userId, ctx.guildId, 'echo_trace', 1);
    grantExp(ctx.userId, ctx.guildId, 18);
    return finish(ctx, simpleEmbed(COLORS.success, `🕯️ Bạn lắng nghe đến cuối. Tiếng vọng không còn là âm thanh — nó biến thành một dấu vết lạnh trong lòng bàn tay.
🔑 +**1× Echo Trace**
⭐ +**18 EXP**`));
  }
  const next = adjustCorruption(ctx.userId, ctx.guildId, 10);
  return finish(ctx, simpleEmbed(COLORS.warning, `👁️ Giọng nói bắt chước tiếng thở của bạn. Bạn giật mình lùi lại, nhưng nó đã để lại vết ố trong linh hồn.
🌘 Corruption: **${next}** (+10)`));
}

export async function showShrineSoulCandle(ctx: RunExploreEventInput): Promise<void> {
  if (getItemQty(ctx.userId, ctx.guildId, 'soul_candle') > 0) {
    return finish(ctx, simpleEmbed(COLORS.info, '🕯️ Ngọn nến vẫn cháy, nhưng **Soul Candle** của bạn đã đủ sáng để đáp lại nó.'));
  }
  const hasMoonwater = getItemQty(ctx.userId, ctx.guildId, 'moonwater') > 0;
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`sc_light_${ctx.userId}`).setLabel('Thắp lại nến').setEmoji('🔥').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`sc_moon_${ctx.userId}`).setLabel('Dùng Moonwater').setEmoji('🌙').setStyle(ButtonStyle.Success).setDisabled(!hasMoonwater),
    new ButtonBuilder().setCustomId(`sc_shadow_${ctx.userId}`).setLabel('Chạm vào bóng nến').setEmoji('✋').setStyle(ButtonStyle.Danger),
  );
  const embed = new EmbedBuilder()
    .setColor(0xffd166)
    .setTitle('🕯️ Ngọn Nến Không Tắt')
    .setDescription('Trong căn phòng kín gió, một ngọn nến cháy ngược xuống sàn. Bóng của nó thì đứng thẳng, như một người đang canh cửa.');
  const reply = await ctx.interaction.editReply({ embeds: [embed], components: [row] });
  const btn = await reply.awaitMessageComponent({ filter: onlyUser(ctx.userId), time: 30_000 }).catch(() => null);
  if (!btn || !btn.isButton()) return finish(ctx, simpleEmbed(COLORS.info, '🕯️ Bạn rời phòng. Ngọn nến vẫn cháy sau lưng, không ngắn đi chút nào.'));
  await btn.deferUpdate().catch(() => {});

  if (btn.customId === `sc_moon_${ctx.userId}`) {
    removeItem(ctx.userId, ctx.guildId, 'moonwater', 1);
    addItem(ctx.userId, ctx.guildId, 'soul_candle', 1);
    adjustCorruption(ctx.userId, ctx.guildId, -6);
    return finish(ctx, simpleEmbed(COLORS.success, `🌙 Moonwater chạm vào bấc nến. Ngọn lửa xanh dịu lại và tách ra thành một cây nến nhỏ trong tay bạn.
🔑 +**1× Soul Candle**
🌘 Corruption -6`));
  }
  if (btn.customId === `sc_light_${ctx.userId}`) {
    addItem(ctx.userId, ctx.guildId, 'soul_candle', 1);
    grantExp(ctx.userId, ctx.guildId, 20);
    return finish(ctx, simpleEmbed(COLORS.success, `🔥 Bạn thắp lại nến bằng ngọn lửa thường. Lửa chuyển thành màu lam, rồi để lại một cây nến linh hồn.
🔑 +**1× Soul Candle**
⭐ +**20 EXP**`));
  }
  addItem(ctx.userId, ctx.guildId, 'soul_candle', 1);
  const next = adjustCorruption(ctx.userId, ctx.guildId, 12);
  return finish(ctx, simpleEmbed(COLORS.warning, `✋ Bạn chạm vào bóng nến. Nó lạnh như tay người chết, nhưng chịu đi theo bạn.
🔑 +**1× Soul Candle**
🌘 Corruption: **${next}** (+12)`));
}

export async function showShrineBlackMirror(ctx: RunExploreEventInput): Promise<void> {
  if (getItemQty(ctx.userId, ctx.guildId, 'mirror_sigil') > 0) {
    return finish(ctx, simpleEmbed(COLORS.info, '🪞 Mặt gương chỉ phản chiếu **Mirror Sigil** bạn đã có. Không còn ấn gương nào để lấy thêm.'));
  }
  const hasScroll = getItemQty(ctx.userId, ctx.guildId, 'scroll_mirror') > 0;
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`bm_look_${ctx.userId}`).setLabel('Nhìn vào gương').setEmoji('🪞').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`bm_scroll_${ctx.userId}`).setLabel('Dùng Scroll of Mirror').setEmoji('📜').setStyle(ButtonStyle.Success).setDisabled(!hasScroll),
    new ButtonBuilder().setCustomId(`bm_break_${ctx.userId}`).setLabel('Đập vỡ gương').setEmoji('🗡️').setStyle(ButtonStyle.Danger),
  );
  const embed = new EmbedBuilder()
    .setColor(0x111827)
    .setTitle('🪞 Gương Đen Nứt Vỡ')
    .setDescription('Một chiếc gương đen dựng giữa hành lang. Hình phản chiếu trong đó mỉm cười trước bạn nửa nhịp, như thể nó biết trước lựa chọn của bạn.');
  const reply = await ctx.interaction.editReply({ embeds: [embed], components: [row] });
  const btn = await reply.awaitMessageComponent({ filter: onlyUser(ctx.userId), time: 30_000 }).catch(() => null);
  if (!btn || !btn.isButton()) return finish(ctx, simpleEmbed(COLORS.info, '🪞 Bạn quay lưng trước khi hình phản chiếu kịp bước ra.'));
  await btn.deferUpdate().catch(() => {});

  if (btn.customId === `bm_scroll_${ctx.userId}`) {
    removeItem(ctx.userId, ctx.guildId, 'scroll_mirror', 1);
    addItem(ctx.userId, ctx.guildId, 'mirror_sigil', 1);
    return finish(ctx, simpleEmbed(COLORS.success, `📜 Scroll of Mirror cháy thành tro bạc. Hình phản chiếu cúi đầu, để lại một ấn gương trên mặt kính.
🔑 +**1× Mirror Sigil**`));
  }
  if (btn.customId === `bm_break_${ctx.userId}`) {
    addItem(ctx.userId, ctx.guildId, 'mirror_sigil', 1);
    const next = adjustCorruption(ctx.userId, ctx.guildId, 8);
    return finish(ctx, simpleEmbed(COLORS.warning, `🗡️ Bạn đập vỡ gương. Mảnh kính vỡ bay ngược lên, khắc thành một ký hiệu trong túi bạn.
🔑 +**1× Mirror Sigil**
🌘 Corruption: **${next}** (+8)`));
  }
  if (randInt(1, 100) <= 65) {
    addItem(ctx.userId, ctx.guildId, 'mirror_sigil', 1);
    return finish(ctx, simpleEmbed(COLORS.success, `🪞 Bạn nhìn thẳng vào gương mà không chớp mắt. Hình phản chiếu lùi lại và để rơi một ấn gương đen.
🔑 +**1× Mirror Sigil**`));
  }
  const next = adjustCorruption(ctx.userId, ctx.guildId, 10);
  return finish(ctx, simpleEmbed(COLORS.warning, `🪞 Hình phản chiếu gọi tên bạn bằng giọng của người thân đã mất. Bạn thoát ra được, nhưng tâm trí nặng hơn.
🌘 Corruption: **${next}** (+10)`));
}

// ════════════════════════════════════════════════════════════════
//  SHRINE — Chuông Đền Im Lặng
// ════════════════════════════════════════════════════════════════
export async function showShrineSilentBell(ctx: RunExploreEventInput): Promise<void> {
  const player = getEffectivePlayer(ctx.userId, ctx.guildId)!;
  const canAfford = player.gold >= 50;

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`sb_ring_${ctx.userId}`).setLabel('Gõ chuông').setEmoji('🔔').setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`sb_offer_${ctx.userId}`)
      .setLabel('Dâng 50 Gold')
      .setEmoji('💰')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(!canAfford),
    new ButtonBuilder().setCustomId(`sb_leave_${ctx.userId}`).setLabel('Rời đi').setStyle(ButtonStyle.Secondary),
  );

  const embed = new EmbedBuilder()
    .setColor(0xC0A060)
    .setTitle('🔔 Chuông Đền Im Lặng')
    .setDescription(
      'Một chiếc chuông đồng cổ treo lơ lửng bên mái đền. Không ai gõ nó trong nhiều năm.\n' +
      'Không khí xung quanh im tĩnh một cách bất thường — không tiếng chim, không tiếng gió.\n\n' +
      '*Gõ chuông hay dâng lễ vật — hoặc không làm gì cả?*'
    )
    .setFooter({ text: canAfford ? 'Dâng 50 Gold để đảm bảo kết quả tốt' : 'Không đủ Gold để dâng lễ' });

  const reply = await ctx.interaction.editReply({ embeds: [embed], components: [row] });
  const btn = await reply.awaitMessageComponent({ filter: onlyUser(ctx.userId), time: 30_000 }).catch(() => null);
  if (!btn || !btn.isButton()) return finish(ctx, simpleEmbed(COLORS.info, '🔔 *Chuông đền vẫn im lặng. Bạn rời đi.*'));
  await btn.deferUpdate().catch(() => {});

  const id = btn.customId;

  if (id === `sb_leave_${ctx.userId}`) {
    return finish(ctx, simpleEmbed(COLORS.info, '🔔 *Bạn không chạm vào chuông và tiếp tục đường mình.*'));
  }

  if (id === `sb_offer_${ctx.userId}`) {
    spendGold(ctx.userId, ctx.guildId, 50);
    const mpRestore = Math.min(player.max_mp, player.mp + Math.floor(player.max_mp * 0.6));
    updatePlayerHpMp(ctx.userId, ctx.guildId, player.hp, mpRestore);
    const rep = adjustReputation(ctx.userId, ctx.guildId, 3);
    return finish(ctx, new EmbedBuilder()
      .setColor(COLORS.success)
      .setTitle('🔔 Lễ Vật Được Chấp Nhận')
      .setDescription(
        'Bạn đặt vàng trước chuông và cúi đầu. Chuông rung nhẹ — tự nhiên, không người chạm.\n\n' +
        `💰 -**50 Gold**\n` +
        `🔵 MP hồi phục: **${mpRestore}/${player.max_mp}**\n` +
        `🤝 Reputation: **${rep}** (+3)`
      )
    );
  }

  // Gõ chuông — rủi ro
  const roll = Math.random();
  if (roll < 0.45) {
    // Phước lành
    const expGain = randInt(14, 36);
    const mpRestore = Math.min(player.max_mp, player.mp + Math.floor(player.max_mp * 0.4));
    grantExp(ctx.userId, ctx.guildId, expGain);
    updatePlayerHpMp(ctx.userId, ctx.guildId, player.hp, mpRestore);
    return finish(ctx, new EmbedBuilder()
      .setColor(COLORS.success)
      .setTitle('🔔 Tiếng Chuông May Mắn')
      .setDescription(
        'Tiếng chuông vang lên trong trẻo — âm thanh lan xa theo gió thiêng.\n\n' +
        `⭐ +**${expGain} EXP**\n🔵 MP: **${mpRestore}/${player.max_mp}**`
      )
    );
  } else if (roll < 0.75) {
    // Bình thường
    const exp = randInt(5, 14);
    grantExp(ctx.userId, ctx.guildId, exp);
    return finish(ctx, simpleEmbed(COLORS.info,
      `🔔 Tiếng chuông vang lên trầm đục rồi tắt ngay.\nKhông có gì đặc biệt xảy ra.\n\n⭐ +**${exp} EXP** (kinh nghiệm từ sự kiên nhẫn)`
    ));
  } else {
    // Xui — HP drain
    const dmg = Math.max(1, Math.floor(player.max_hp * 0.12));
    const newHp = Math.max(1, player.hp - dmg);
    updatePlayerHpMp(ctx.userId, ctx.guildId, newHp, player.mp);
    return finish(ctx, new EmbedBuilder()
      .setColor(COLORS.danger)
      .setTitle('🔔 Tiếng Chuông Oan Nghiệt')
      .setDescription(
        'Tiếng chuông vỡ ra — một âm thanh chói tai như xé lòng.\n' +
        'Một làn sóng lạnh toát chạy dọc sống lưng bạn.\n\n' +
        `❤️ HP mất **${dmg}** → **${newHp}/${player.max_hp}**`
      )
    );
  }
}

// ════════════════════════════════════════════════════════════════
//  SHRINE — Chuỗi Hạt, Cửa Bùa, Đèn Linh
// ════════════════════════════════════════════════════════════════
export async function showShrinePrayerBeads(ctx: RunExploreEventInput): Promise<void> {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`pb_repair_${ctx.userId}`).setLabel('Xâu lại chuỗi hạt').setEmoji('📿').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`pb_take_${ctx.userId}`).setLabel('Giữ lại một hạt').setEmoji('✋').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`pb_crush_${ctx.userId}`).setLabel('Nghiền lấy bụi linh').setEmoji('💨').setStyle(ButtonStyle.Danger),
  );
  const embed = new EmbedBuilder()
    .setColor(0xD6C58A)
    .setTitle('📿 Chuỗi Hạt Đứt')
    .setDescription('Một chuỗi hạt cầu nguyện vỡ nằm trước bệ đá. Mỗi hạt còn ấm, như vừa được nắm trong tay ai đó.');
  const reply = await ctx.interaction.editReply({ embeds: [embed], components: [row] });
  const btn = await reply.awaitMessageComponent({ filter: onlyUser(ctx.userId), time: 30_000 }).catch(() => null);
  if (!btn || !btn.isButton()) return finish(ctx, simpleEmbed(COLORS.info, '📿 *Bạn để chuỗi hạt lại nguyên chỗ cũ.*'));
  await btn.deferUpdate().catch(() => {});

  if (btn.customId === `pb_repair_${ctx.userId}`) {
    const exp = randInt(18, 39);
    const rep = adjustReputation(ctx.userId, ctx.guildId, 6);
    grantExp(ctx.userId, ctx.guildId, exp);
    return finish(ctx, simpleEmbed(COLORS.success, `📿 Bạn kiên nhẫn xâu lại từng hạt. Khi hoàn thành, chuỗi hạt tan thành ánh sáng.\n⭐ +**${exp} EXP**\n🤝 Reputation: **${rep}** (+6)`));
  }
  if (btn.customId === `pb_take_${ctx.userId}`) {
    addItem(ctx.userId, ctx.guildId, 'broken_rune', 1);
    return finish(ctx, simpleEmbed(COLORS.info, '✋ Bạn giữ lại một hạt có khắc ký tự lạ.\n🔹 +**1× Broken Rune**'));
  }
  addItem(ctx.userId, ctx.guildId, 'soul_dust', 2);
  const rep = adjustReputation(ctx.userId, ctx.guildId, -5);
  return finish(ctx, simpleEmbed(COLORS.warning, `💨 Bạn nghiền chuỗi hạt thành bụi linh.\n💨 +**2× Soul Dust**\n🤝 Reputation: **${rep}** (-5)`));
}

export async function showShrineSealDoor(ctx: RunExploreEventInput): Promise<void> {
  const player = getEffectivePlayer(ctx.userId, ctx.guildId)!;
  const canOffer = player.gold >= 80;
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`sd_open_${ctx.userId}`).setLabel('Xé bùa mở cửa').setEmoji('🚪').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`sd_offer_${ctx.userId}`).setLabel('Dâng 80 Gold').setEmoji('💰').setStyle(ButtonStyle.Success).setDisabled(!canOffer),
    new ButtonBuilder().setCustomId(`sd_leave_${ctx.userId}`).setLabel('Không chạm vào').setStyle(ButtonStyle.Secondary),
  );
  const embed = new EmbedBuilder()
    .setColor(0xAA8844)
    .setTitle('🚪 Cánh Cửa Dán Bùa')
    .setDescription('Sau đền có một cánh cửa gỗ nhỏ, phủ đầy giấy bùa cũ. Từ khe cửa rỉ ra hơi lạnh và tiếng gõ rất khẽ.');
  const reply = await ctx.interaction.editReply({ embeds: [embed], components: [row] });
  const btn = await reply.awaitMessageComponent({ filter: onlyUser(ctx.userId), time: 30_000 }).catch(() => null);
  if (!btn || !btn.isButton() || btn.customId === `sd_leave_${ctx.userId}`) return finish(ctx, simpleEmbed(COLORS.info, '🚪 *Bạn quyết định không mở thứ bị niêm phong.*'));
  await btn.deferUpdate().catch(() => {});

  if (btn.customId === `sd_offer_${ctx.userId}`) {
    spendGold(ctx.userId, ctx.guildId, 80);
    addItem(ctx.userId, ctx.guildId, 'shrine_relic', 1);
    return finish(ctx, simpleEmbed(COLORS.success, '💰 Bạn đặt lễ vật trước cửa. Các lá bùa tự cháy thành tro, để lại một di vật nhỏ.\n💰 -**80 Gold**\n⚱️ +**1× Shrine Relic**'));
  }

  if (randInt(1, 100) <= 55 && ctx.enemies.length) {
    await ctx.interaction.editReply({ embeds: [simpleEmbed(COLORS.danger, '🚪 Bạn xé bùa. Thứ bên trong không chờ thêm nữa.\n\n*Chiến đấu bắt đầu...*')], components: [] });
    await new Promise(r => setTimeout(r, 600));
    return ctx.callbacks.startCombat(randInt(1, 100) <= 50 ? 'vengeful_spirit' : pick(ctx.enemies).id);
  }
  const gold = randInt(43, 93);
  grantGold(ctx.userId, ctx.guildId, gold);
  return finish(ctx, simpleEmbed(COLORS.gold, `🚪 Sau cánh cửa chỉ còn một hộp gỗ cũ.\n🪙 +**${gold} Gold**`));
}

export async function showShrineSpiritLamp(ctx: RunExploreEventInput): Promise<void> {
  const player = getEffectivePlayer(ctx.userId, ctx.guildId)!;
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`sl_light_${ctx.userId}`).setLabel('Thắp đèn').setEmoji('🕯️').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`sl_pray_${ctx.userId}`).setLabel('Cầu nguyện').setEmoji('🙏').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`sl_take_${ctx.userId}`).setLabel('Lấy tim đèn').setEmoji('🪄').setStyle(ButtonStyle.Secondary),
  );
  const embed = new EmbedBuilder()
    .setColor(0xB0A0FF)
    .setTitle('🕯️ Đèn Linh Hồn Tắt')
    .setDescription('Một chiếc đèn đá nằm dưới tượng cũ. Bên trong không có lửa, nhưng bạn nghe thấy tiếng thì thầm yếu ớt.');
  const reply = await ctx.interaction.editReply({ embeds: [embed], components: [row] });
  const btn = await reply.awaitMessageComponent({ filter: onlyUser(ctx.userId), time: 30_000 }).catch(() => null);
  if (!btn || !btn.isButton()) return finish(ctx, simpleEmbed(COLORS.info, '🕯️ *Chiếc đèn vẫn tắt khi bạn rời đi.*'));
  await btn.deferUpdate().catch(() => {});

  if (btn.customId === `sl_light_${ctx.userId}`) {
    const mp = Math.min(player.max_mp, player.mp + Math.floor(player.max_mp * 0.6));
    updatePlayerHpMp(ctx.userId, ctx.guildId, player.hp, mp);
    grantExp(ctx.userId, ctx.guildId, 14);
    return finish(ctx, simpleEmbed(COLORS.success, `🕯️ Ngọn lửa xanh bừng lên. Những tiếng thì thầm trở nên bình yên.\n🔵 MP: **${mp}/${player.max_mp}**\n⭐ +**14 EXP**`));
  }
  if (btn.customId === `sl_pray_${ctx.userId}`) {
    const hp = Math.min(player.max_hp, player.hp + Math.floor(player.max_hp * 0.25));
    const rep = adjustReputation(ctx.userId, ctx.guildId, 4);
    updatePlayerHpMp(ctx.userId, ctx.guildId, hp, player.mp);
    return finish(ctx, simpleEmbed(COLORS.success, `🙏 Bạn cầu nguyện trước chiếc đèn. Một hơi ấm nhẹ chạm vào vai.\n❤️ HP: **${hp}/${player.max_hp}**\n🤝 Reputation: **${rep}** (+4)`));
  }
  addItem(ctx.userId, ctx.guildId, 'rune_ink', 1);
  const dmg = Math.max(1, Math.floor(player.max_hp * 0.08));
  const hp = Math.max(1, player.hp - dmg);
  updatePlayerHpMp(ctx.userId, ctx.guildId, hp, player.mp);
  return finish(ctx, simpleEmbed(COLORS.warning, `🪄 Bạn lấy tim đèn. Nó hóa thành mực rune trong tay, nhưng hơi lạnh cắn vào máu.\n🪄 +**1× Rune Ink**\n❤️ HP mất **${dmg}**`));
}

// EXTRA_EVENTS_SHRINE_START
export async function showShrineWeepingStatue(ctx: RunExploreEventInput): Promise<void> {
  const player = getEffectivePlayer(ctx.userId, ctx.guildId)!;
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`sws_wipe_${ctx.userId}`).setLabel('Lau vết máu').setEmoji('🩸').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`sws_collect_${ctx.userId}`).setLabel('Hứng máu tượng').setEmoji('🧪').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`sws_pray_${ctx.userId}`).setLabel('Cầu nguyện').setEmoji('🙏').setStyle(ButtonStyle.Primary),
  );
  const embed = new EmbedBuilder().setColor(0x8b0000).setTitle('🩸 Tượng Đá Khóc Máu').setDescription('Một pho tượng cổ rỉ xuống những giọt đỏ sẫm. Cả căn đền lạnh đi khi bạn đến gần.');
  const reply = await ctx.interaction.editReply({ embeds: [embed], components: [row] });
  const btn = await reply.awaitMessageComponent({ filter: onlyUser(ctx.userId), time: 30_000 }).catch(() => null);
  if (!btn || !btn.isButton()) return finish(ctx, simpleEmbed(COLORS.info, '🚶 Bạn lùi khỏi pho tượng trước khi tiếng thì thầm vang rõ hơn.'));
  await btn.deferUpdate().catch(() => {});
  if (btn.customId === `sws_wipe_${ctx.userId}`) { const exp = randInt(21, 46); const rep = adjustReputation(ctx.userId, ctx.guildId, 7); grantExp(ctx.userId, ctx.guildId, exp); return finish(ctx, simpleEmbed(COLORS.success, `🩸 Bạn lau sạch vết máu. Tượng đá khẽ ấm lên.
⭐ +**${exp} EXP**
📈 Reputation: **${rep}** (+7)`)); }
  if (btn.customId === `sws_collect_${ctx.userId}`) { addItem(ctx.userId, ctx.guildId, 'cursed_blood', 1); grantSoulShards(ctx.userId, ctx.guildId, 1); const dmg = Math.max(1, Math.floor(player.max_hp * 0.12)); updatePlayerHpMp(ctx.userId, ctx.guildId, Math.max(1, player.hp - dmg), player.mp); const rep = adjustReputation(ctx.userId, ctx.guildId, -5); return finish(ctx, simpleEmbed(COLORS.warning, `🧪 Bạn hứng lấy thứ máu lạnh như băng.
📦 +**1× Cursed Blood**
💠 +**1 Soul Shard**
❤️ HP mất **${dmg}**
📉 Reputation: **${rep}** (-5)`)); }
  const mp = Math.min(player.max_mp, player.mp + Math.floor(player.max_mp * 0.45));
  updatePlayerHpMp(ctx.userId, ctx.guildId, player.hp, mp); grantExp(ctx.userId, ctx.guildId, 18);
  return finish(ctx, simpleEmbed(COLORS.magic, `🙏 Bạn cầu nguyện trước tượng. Tiếng khóc nhỏ dần.
🔮 MP: **${mp}/${player.max_mp}**
⭐ +**18 EXP**`));
}

export async function showShrineForbiddenOffering(ctx: RunExploreEventInput): Promise<void> {
  const player = getEffectivePlayer(ctx.userId, ctx.guildId)!;
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`sfo_gold_${ctx.userId}`).setLabel('Dâng 80 Gold').setEmoji('💰').setStyle(ButtonStyle.Primary).setDisabled(player.gold < 80),
    new ButtonBuilder().setCustomId(`sfo_hp_${ctx.userId}`).setLabel('Dâng máu').setEmoji('❤️').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`sfo_refuse_${ctx.userId}`).setLabel('Từ chối').setStyle(ButtonStyle.Secondary),
  );
  const embed = new EmbedBuilder().setColor(0x4b0082).setTitle('🕯️ Lễ Vật Cấm').setDescription('Một bàn thờ phụ bị che bởi vải đen. Dòng chữ cổ yêu cầu một lễ vật để đổi lấy sức mạnh.');
  const reply = await ctx.interaction.editReply({ embeds: [embed], components: [row] });
  const btn = await reply.awaitMessageComponent({ filter: onlyUser(ctx.userId), time: 30_000 }).catch(() => null);
  if (!btn || !btn.isButton() || btn.customId === `sfo_refuse_${ctx.userId}`) return finish(ctx, simpleEmbed(COLORS.info, '🚶 Bạn phủ lại tấm vải đen và rời khỏi bàn thờ.'));
  await btn.deferUpdate().catch(() => {});
  if (btn.customId === `sfo_gold_${ctx.userId}`) { spendGold(ctx.userId, ctx.guildId, 80); const exp = randInt(32, 61); grantExp(ctx.userId, ctx.guildId, exp); if (randInt(1, 100) <= 35) addItem(ctx.userId, ctx.guildId, 'mana_crystal', 1); return finish(ctx, simpleEmbed(COLORS.magic, `💰 Vàng tan thành bụi sáng.
💰 -**80 Gold**
⭐ +**${exp} EXP**
🔮 Có thể nhận thêm **Mana Crystal**.`)); }
  const dmg = Math.max(1, Math.floor(player.max_hp * 0.18)); updatePlayerHpMp(ctx.userId, ctx.guildId, Math.max(1, player.hp - dmg), player.mp); grantSoulShards(ctx.userId, ctx.guildId, 1); addItem(ctx.userId, ctx.guildId, 'mysterious_shard', 1);
  return finish(ctx, simpleEmbed(COLORS.warning, `❤️ Bạn nhỏ máu lên bàn thờ. Cái bóng sau lưng bạn dài ra bất thường.
❤️ HP mất **${dmg}**
💠 +**1 Soul Shard**
📦 +**1× Mysterious Shard**`));
}

export async function showShrineSealedReliquary(ctx: RunExploreEventInput): Promise<void> {
  const player = getEffectivePlayer(ctx.userId, ctx.guildId)!;
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`ssr_open_${ctx.userId}`).setLabel('Phá phong ấn').setEmoji('🔓').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`ssr_read_${ctx.userId}`).setLabel('Đọc chú văn').setEmoji('📜').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`ssr_leave_${ctx.userId}`).setLabel('Không chạm vào').setStyle(ButtonStyle.Secondary),
  );
  const embed = new EmbedBuilder().setColor(0xc0a060).setTitle('📦 Hộp Thánh Tích Niêm Phong').setDescription('Một hộp đá nhỏ bị quấn dây bùa. Bên trong phát ra tiếng gõ rất nhẹ.');
  const reply = await ctx.interaction.editReply({ embeds: [embed], components: [row] });
  const btn = await reply.awaitMessageComponent({ filter: onlyUser(ctx.userId), time: 30_000 }).catch(() => null);
  if (!btn || !btn.isButton() || btn.customId === `ssr_leave_${ctx.userId}`) return finish(ctx, simpleEmbed(COLORS.info, '📦 Bạn để hộp thánh tích ngủ yên.'));
  await btn.deferUpdate().catch(() => {});
  if (btn.customId === `ssr_read_${ctx.userId}`) { const exp = randInt(25, 50); grantExp(ctx.userId, ctx.guildId, exp); const mp = Math.min(player.max_mp, player.mp + Math.floor(player.max_mp * 0.35)); updatePlayerHpMp(ctx.userId, ctx.guildId, player.hp, mp); return finish(ctx, simpleEmbed(COLORS.success, `📜 Bạn đọc đúng chú văn. Phong ấn dịu lại.
⭐ +**${exp} EXP**
🔮 MP: **${mp}/${player.max_mp}**`)); }
  if (randInt(1, 100) <= 55) { const gold = randInt(43, 93); grantGold(ctx.userId, ctx.guildId, gold); addItem(ctx.userId, ctx.guildId, pick(['mana_crystal', 'mysterious_shard']), 1); return finish(ctx, simpleEmbed(COLORS.gold, `🔓 Bạn phá phong ấn và lấy được thánh tích bên trong.
💰 +**${gold} Gold**
📦 +**1 vật liệu hiếm**`)); }
  const dmg = Math.max(1, Math.floor(player.max_hp * 0.16)); updatePlayerHpMp(ctx.userId, ctx.guildId, Math.max(1, player.hp - dmg), player.mp);
  return finish(ctx, simpleEmbed(COLORS.danger, `💥 Phong ấn phản phệ!
❤️ HP mất **${dmg}**
Nhưng bạn vẫn kịp đóng hộp lại.`));
}
// EXTRA_EVENTS_SHRINE_END
