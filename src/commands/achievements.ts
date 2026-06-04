import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { getPlayer } from '../systems/player';
import { getAchievementsForPlayer, getAchievementSummary } from '../systems/achievements';
import { COLORS } from '../utils/embeds';

export const data = new SlashCommandBuilder()
  .setName('achievements')
  .setDescription('Xem các thành tựu đã mở và mục tiêu sắp tới');

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  const userId  = interaction.user.id;
  const guildId = interaction.guildId!;
  const player  = getPlayer(userId, guildId);

  if (!player) {
    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(COLORS.warning)
          .setDescription('Bạn chưa có nhân vật. Dùng `/start` để bắt đầu.')
      ]
    });
    return;
  }

  const achievements = getAchievementsForPlayer(userId, guildId);
  const summary = getAchievementSummary(userId, guildId);
  const unlocked = achievements.filter(a => a.unlocked);
  const locked = achievements.filter(a => !a.unlocked);

  const unlockedText = unlocked.length
    ? unlocked.sort((a, b) => (b.acquired_at ?? 0) - (a.acquired_at ?? 0))
        .map(a => `${a.definition.badge} **${a.definition.name}** — ${a.definition.description}`)
        .join('\n')
    : '*Chưa có thành tựu nào.*';

  const upcomingText = locked.length
    ? locked.slice(0, 4).map(a => `${a.definition.badge} **${a.definition.name}** — ${a.definition.description}`).join('\n')
    : '*Bạn đã mở hết thành tựu hiện có.*';

  await interaction.editReply({
    embeds: [
      new EmbedBuilder()
        .setColor(COLORS.gold)
        .setTitle('🏅 Thành tựu')
        .setDescription(`Bạn đã mở **${summary.unlocked}/${summary.total}** thành tựu.`)
        .addFields(
          { name: '🎖️ Đã mở', value: unlockedText, inline: false },
          { name: '✨ Mục tiêu tiếp theo', value: upcomingText, inline: false }
        )
    ]
  });
}
