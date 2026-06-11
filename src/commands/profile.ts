import {
  SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder
} from 'discord.js';
import { getPlayer, getLoadout, applyPassiveStats } from '../systems/player';
import { buildProfileEmbed, COLORS } from '../utils/embeds';
import { getAchievementSummary } from '../systems/achievements';
import { buildStatControlRows, attachProfileStatCollector } from '../systems/profileStatsUi';

export const data = new SlashCommandBuilder()
  .setName('profile')
  .setDescription('Xem thông tin nhân vật')
  .addUserOption(opt =>
    opt.setName('player')
       .setDescription('Xem profile của người chơi khác')
       .setRequired(false)
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  const target     = interaction.options.getUser('player') ?? interaction.user;
  const guildId    = interaction.guildId!;
  const player     = getPlayer(target.id, guildId);

  if (!player) {
    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(COLORS.warning)
          .setDescription(`**${target.username}** chưa có nhân vật. Dùng \`/start\` để bắt đầu!`)
      ]
    });
    return;
  }

  const loadout    = getLoadout(target.id, guildId);
  const withPassive = applyPassiveStats(player);
  const avatar     = target.displayAvatarURL({ size: 128 });
  const achievementSummary = getAchievementSummary(target.id, guildId);
  const canEditStats = target.id === interaction.user.id;

  await interaction.editReply({
    embeds: [buildProfileEmbed(withPassive, loadout, avatar, achievementSummary)],
    components: canEditStats ? buildStatControlRows(target.id, guildId) : []
  });

  if (canEditStats) {
    await attachProfileStatCollector(interaction, target, guildId);
  }
}
