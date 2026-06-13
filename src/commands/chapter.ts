import {
  SlashCommandBuilder, ChatInputCommandInteraction,
  EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType
} from 'discord.js';
import { getPlayer } from '../systems/player';
import { ensurePendingChapterExploreEvent, getChapterStatus } from '../systems/chapter';
import { COLORS, simpleEmbed } from '../utils/embeds';
import { onlyUser } from '../utils/collectors';
import { CHAPTERS } from '../data/chapters';

export const data = new SlashCommandBuilder()
  .setName('chapter')
  .setDescription('Xem tiến độ cốt truyện chính');

function progressBar(current: number, target: number, len = 10): string {
  const filled = Math.min(len, Math.round((current / target) * len));
  return `\`[${'█'.repeat(filled)}${'░'.repeat(len - filled)}]\` ${current}/${target}`;
}

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  const { id: userId } = interaction.user;
  const guildId = interaction.guildId!;

  const player = getPlayer(userId, guildId);
  if (!player) {
    await interaction.editReply({ embeds: [simpleEmbed(COLORS.warning, 'Bạn chưa có nhân vật! Dùng `/start` để bắt đầu.')] });
    return;
  }

  const status = getChapterStatus(userId, guildId);

  if (status.finished) {
    const embed = new EmbedBuilder()
      .setColor(COLORS.magic)
      .setTitle('✨ Cốt Truyện Hoàn Thành!')
      .setDescription(
        `*Bạn đã hoàn thành tất cả ${CHAPTERS.length} chương của cốt truyện chính.*\n\n` +
        `Hành trình của **${player.name}** sẽ được ghi vào sử sách của thế giới này.`
      );
    await interaction.editReply({ embeds: [embed] });
    return;
  }

  const chapter = status.chapter!;

  const embed = new EmbedBuilder()
    .setColor(COLORS.info)
    .setTitle(chapter.title)
    .setDescription(`*${chapter.lore}*`)
    .addFields(
      { name: '👤 Nhân vật', value: `**${player.name}** Lv.${player.level}`, inline: true },
      { name: '📖 Chương', value: `${status.chapterId} / ${CHAPTERS.length}`, inline: true },
    );

  const objLines = status.objectives.map(o =>
    `${o.done ? '✅' : '🔲'} **${o.desc}**\n${o.done ? '`[██████████]` Hoàn thành!' : progressBar(o.progress, o.target)}`
  );
  embed.addFields({ name: '📋 Nhiệm vụ', value: objLines.join('\n\n'), inline: false });

  const reward = chapter.reward;
  const rewardLines = [
    `🪙 **${reward.gold} Gold**`,
    `⭐ **${reward.exp} EXP**`,
    reward.shards ? `💀 **${reward.shards} Soul Shards**` : null,
    reward.titleId ? `🏷️ Danh hiệu mới` : null,
  ].filter(Boolean).join(' · ');
  embed.addFields({ name: '🎁 Phần thưởng', value: rewardLines, inline: false });

  if (status.allDone) {
    const pending = ensurePendingChapterExploreEvent(userId, guildId);
    embed.setColor(COLORS.success);
    embed.addFields({
      name: pending ? '✨ Sự kiện cốt truyện đã sẵn sàng!' : '✨ Chương đã hoàn thành!',
      value: pending
        ? 'Dùng **/explore** hoặc `rpg e` để kích hoạt lore/event đặc biệt. Sau khi hoàn thành sự kiện đó, chương tiếp theo mới mở khóa.'
        : 'Chương này đã hoàn thành. Nếu không có sự kiện cốt truyện, hãy báo lại để kiểm tra dữ liệu chapter event.',
      inline: false
    });
  }

  await interaction.editReply({ embeds: [embed], components: [] });
}

// Text-prefix aliases (auto-loaded by registry.ts)
export const aliases = ['ch','story'];
