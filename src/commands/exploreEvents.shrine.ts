import type { RunExploreEventInput } from './exploreEvents';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  Message
} from 'discord.js';
import { addItem, adjustReputation, getPlayer, grantExp, grantGold, grantSoulShards, spendGold, updatePlayerHpMp } from '../systems/player';
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
//  SHRINE — Chuông Đền Im Lặng
// ════════════════════════════════════════════════════════════════
export async function showShrineSilentBell(ctx: RunExploreEventInput): Promise<void> {
  const player = getPlayer(ctx.userId, ctx.guildId)!;
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
    const expGain = randInt(20, 50);
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
    const exp = randInt(8, 20);
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
    const exp = randInt(25, 55);
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
  const player = getPlayer(ctx.userId, ctx.guildId)!;
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
  const gold = randInt(70, 150);
  grantGold(ctx.userId, ctx.guildId, gold);
  return finish(ctx, simpleEmbed(COLORS.gold, `🚪 Sau cánh cửa chỉ còn một hộp gỗ cũ.\n🪙 +**${gold} Gold**`));
}

export async function showShrineSpiritLamp(ctx: RunExploreEventInput): Promise<void> {
  const player = getPlayer(ctx.userId, ctx.guildId)!;
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
    grantExp(ctx.userId, ctx.guildId, 20);
    return finish(ctx, simpleEmbed(COLORS.success, `🕯️ Ngọn lửa xanh bừng lên. Những tiếng thì thầm trở nên bình yên.\n🔵 MP: **${mp}/${player.max_mp}**\n⭐ +**20 EXP**`));
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
