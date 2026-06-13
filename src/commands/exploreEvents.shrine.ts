import type { RunExploreEventInput } from './exploreEvents';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  Message
} from 'discord.js';
import { addItem, adjustReputation, getPlayer, getEffectivePlayer, grantExp, grantGold, grantSoulShards, spendGold, updatePlayerHpMp, getItemQty, removeItem } from '../systems/player';
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


// ════════════════════════════════════════════════════════════════
//  SHRINE — Tiếng Vọng (thu thập key item cho Nghi Lễ Echo Demon)
//  3 event, mỗi event cho 1 key item khác nhau. "Lắng Nghe" được item
//  nhưng tăng Ô Nhiễm; "Rắc Muối Thanh Tẩy" tiêu 1 Purifying Salt để
//  lấy item mà không nhiễm; "Rời Đi" không được gì.
// ════════════════════════════════════════════════════════════════
interface EchoWhisperOpts {
  itemId: string;
  itemName: string;
  icon: string;
  title: string;
  desc: string;
  listenText: string;
  saltText: string;
}

async function showEchoWhisper(ctx: RunExploreEventInput, opts: EchoWhisperOpts): Promise<void> {
  // Chỉ cần 1 cái mỗi loại — nếu đã có thì không phát thêm (tránh farm).
  if (getItemQty(ctx.userId, ctx.guildId, opts.itemId) > 0) {
    const exp = randInt(15, 30);
    grantExp(ctx.userId, ctx.guildId, exp);
    return finish(ctx, simpleEmbed(COLORS.info, `${opts.icon} *Tiếng vọng lặp lại thứ bạn đã mang theo — bạn đã có ${opts.itemName}.*\n⭐ +**${exp} EXP**`));
  }

  const hasSalt = getItemQty(ctx.userId, ctx.guildId, 'purifying_salt') > 0;
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`ew_listen_${ctx.userId}`).setLabel('Lắng Nghe').setEmoji('🕯️').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`ew_salt_${ctx.userId}`).setLabel('Rắc Muối Thanh Tẩy').setEmoji('🧂').setStyle(ButtonStyle.Success).setDisabled(!hasSalt),
    new ButtonBuilder().setCustomId(`ew_leave_${ctx.userId}`).setLabel('Rời Đi').setEmoji('🏃').setStyle(ButtonStyle.Secondary),
  );
  const embed = new EmbedBuilder()
    .setColor(0x6B4C9A)
    .setTitle(opts.title)
    .setDescription(opts.desc + (hasSalt ? '' : '\n\n*(Bạn không có Purifying Salt để thanh tẩy.)*'));
  const reply = await ctx.interaction.editReply({ embeds: [embed], components: [row] });
  const btn = await reply.awaitMessageComponent({ filter: onlyUser(ctx.userId), time: 30_000 }).catch(() => null);
  if (!btn || !btn.isButton() || btn.customId === `ew_leave_${ctx.userId}`) {
    return finish(ctx, simpleEmbed(COLORS.info, '🏃 *Bạn lùi khỏi bức tường, để tiếng gọi chìm lại vào đá.*'));
  }
  await btn.deferUpdate().catch(() => {});

  if (btn.customId === `ew_salt_${ctx.userId}` && getItemQty(ctx.userId, ctx.guildId, 'purifying_salt') > 0) {
    removeItem(ctx.userId, ctx.guildId, 'purifying_salt', 1);
    addItem(ctx.userId, ctx.guildId, opts.itemId, 1);
    return finish(ctx, simpleEmbed(COLORS.success, `${opts.saltText}\n🧂 -**1 Purifying Salt**\n${opts.icon} +**1× ${opts.itemName}**`));
  }

  // "Lắng Nghe": nhận item nhưng nhiễm thêm Ô Nhiễm Linh Hồn.
  addItem(ctx.userId, ctx.guildId, opts.itemId, 1);
  const corr = adjustCorruption(ctx.userId, ctx.guildId, 6);
  return finish(ctx, simpleEmbed(COLORS.warning, `${opts.listenText}\n${opts.icon} +**1× ${opts.itemName}**\n🌘 Ô Nhiễm Linh Hồn: **${corr}** (+6)`));
}

export async function showEchoWhisperTrace(ctx: RunExploreEventInput): Promise<void> {
  return showEchoWhisper(ctx, {
    itemId: 'echo_trace', itemName: 'Echo Trace', icon: '👁️',
    title: '👁️ Tiếng Vọng Sau Cánh Cửa',
    desc: 'Bạn nghe thấy tiếng gọi phát ra từ bên trong bức tường đá.\nMột giọng nói thì thầm tên bạn, dù bạn chưa từng nói ra.',
    listenText: '🕯️ Bạn áp tai vào đá và lắng nghe. Một mảnh ký ức không phải của bạn rỉ ra ngoài.',
    saltText: '🧂 Bạn rắc muối lên khe tường. Tiếng vọng dịu lại, để rơi một dấu vết mờ.',
  });
}

export async function showEchoWhisperCandle(ctx: RunExploreEventInput): Promise<void> {
  return showEchoWhisper(ctx, {
    itemId: 'soul_candle', itemName: 'Soul Candle', icon: '🕯️',
    title: '🕯️ Ngọn Nến Không Tắt',
    desc: 'Giữa đền tối có một ngọn nến cháy suốt hàng trăm năm không lụi.\nKhi bạn lại gần, ngọn lửa nghiêng về phía bạn như đang lắng nghe.',
    listenText: '🕯️ Bạn ghé sát ngọn lửa. Nó liếm vào tay bạn không nóng, chỉ lạnh — rồi thu lại thành một cây nến nhỏ.',
    saltText: '🧂 Bạn rắc muối quanh chân nến. Ngọn lửa tách ra một phần sáng, ngưng lại thành nến cầm tay.',
  });
}

export async function showEchoWhisperMirror(ctx: RunExploreEventInput): Promise<void> {
  return showEchoWhisper(ctx, {
    itemId: 'mirror_sigil', itemName: 'Mirror Sigil', icon: '🪞',
    title: '🪞 Gương Đen Trong Hốc Tường',
    desc: 'Một mảnh gương đen gắn trong hốc tường. Hình phản chiếu của bạn cử động chậm hơn bạn một nhịp.',
    listenText: '🪞 Bạn chạm vào mặt gương. Hình phản chiếu nắm lấy tay bạn từ phía bên kia, rồi để lại một ấn khắc.',
    saltText: '🧂 Bạn rắc muối lên gương. Lớp đen rạn ra, một mảnh ấn rơi vào lòng bàn tay bạn.',
  });
}
