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

// ── Local finish helper (mirrors the one in exploreEvents.ts) ────────────
async function finish(ctx: RunExploreEventInput, embed: EmbedBuilder): Promise<void> {
  const msg = await ctx.interaction.editReply({
    embeds: [embed],
    components: ctx.callbacks.buildContinueExploreRow(ctx.userId)
  });
  await ctx.callbacks.attachContinueExploreHandler(msg as Message<boolean>, ctx.interaction, ctx.userId, ctx.guildId);
}

// ════════════════════════════════════════════════════════════════
//  FOREST — Cây Cổ Thì Thầm
// ════════════════════════════════════════════════════════════════
export async function showForestWhisperingTree(ctx: RunExploreEventInput): Promise<void> {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`ft_listen_${ctx.userId}`).setLabel('Lắng nghe').setEmoji('👂').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`ft_carve_${ctx.userId}`).setLabel('Khắc tên lên cây').setEmoji('🗡️').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`ft_leave_${ctx.userId}`).setLabel('Bỏ qua').setStyle(ButtonStyle.Secondary),
  );

  const embed = new EmbedBuilder()
    .setColor(0x228B22)
    .setTitle('🌳 Cây Cổ Thì Thầm')
    .setDescription(
      'Một cây cổ thụ khổng lồ sừng sững giữa rừng, tán lá che kín một vùng trời.\n' +
      'Tiếng lá xào xạc... *không phải do gió.* Hình như cái cây đang nói gì đó với bạn.'
    );

  const reply = await ctx.interaction.editReply({ embeds: [embed], components: [row] });
  const btn = await reply.awaitMessageComponent({ filter: onlyUser(ctx.userId), time: 30_000 }).catch(() => null);
  if (!btn || !btn.isButton()) return finish(ctx, simpleEmbed(COLORS.info, '🌳 *Cây cổ thụ đứng yên lặng. Bạn tiếp tục hành trình.*'));
  await btn.deferUpdate().catch(() => {});

  const id = btn.customId;

  if (id === `ft_leave_${ctx.userId}`) {
    return finish(ctx, simpleEmbed(COLORS.info, '🌳 *Bạn bước đi, tiếng thì thầm dần tắt phía sau.*'));
  }

  if (id === `ft_listen_${ctx.userId}`) {
    const outcomes = [
      () => {
        const exp = randInt(15, 35);
        grantExp(ctx.userId, ctx.guildId, exp);
        return simpleEmbed(COLORS.success,
          '🌳 **Giọng cây cổ thụ:**\n*"Kẻ lang thang... hãy nhớ lấy con đường mình đi."*\n\n' +
          `⭐ Bạn cảm thấy sáng suốt hơn. +**${exp} EXP**`
        );
      },
      () => {
        const gold = randInt(10, 30);
        grantGold(ctx.userId, ctx.guildId, gold);
        return simpleEmbed(COLORS.success,
          '🌳 *Một cành cây khẽ chỉ xuống gốc rễ — có vật gì chôn vùi ở đó.*\n\n' +
          `🪙 Bạn tìm thấy **${gold} Gold** giấu trong hốc cây.`
        );
      },
      () => {
        addItem(ctx.userId, ctx.guildId, 'herb', 2);
        return simpleEmbed(COLORS.success,
          '🌳 *Cây rung nhẹ. Lá thuốc rơi xuống như mưa.*\n\n🌿 +**2× Herb**');
      },
      () => {
        return simpleEmbed(COLORS.info,
          '🌳 *Bạn nghe thấy... ký ức của ai đó. Một người đã đi qua đây từ lâu lắm rồi.*\n\n' +
          '📖 Không có gì thực chất — chỉ là một cảm giác kỳ lạ về sự liên tục.'
        );
      },
    ];
    return finish(ctx, pick(outcomes)());
  }

  // Khắc tên lên cây
  const player = getPlayer(ctx.userId, ctx.guildId)!;
  const dmg = Math.max(1, Math.floor(player.max_hp * 0.05));
  const newHp = Math.max(1, player.hp - dmg);
  updatePlayerHpMp(ctx.userId, ctx.guildId, newHp, player.mp);
  const rep = adjustReputation(ctx.userId, ctx.guildId, 1);
  return finish(ctx, new EmbedBuilder()
    .setColor(COLORS.warning)
    .setTitle('🌳 Khắc Tên Lên Cây')
    .setDescription(
      `Bạn dùng dao khắc tên mình lên vỏ cây. Nhựa cây chảy ra ướt tay.\n\n` +
      `❤️ HP mất **${dmg}** (${newHp}/${player.max_hp})\n` +
      `🤝 Reputation: **${rep}** (+1) — *rừng ghi nhớ kẻ đã để lại dấu vết.*`
    )
  );
}
