import type { RunExploreEventInput } from './exploreEvents';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  Message
} from 'discord.js';
import { adjustReputation, getPlayer, grantExp, spendGold, updatePlayerHpMp } from '../systems/player';
import { COLORS, simpleEmbed } from '../utils/embeds';
import { randInt } from '../utils/format';
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
