import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { getWorldSummary } from '../systems/world';
import { COLORS } from '../utils/embeds';

export const data = new SlashCommandBuilder()
  .setName('world')
  .setDescription('Xem trạng thái thế giới và sự kiện server');

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  const guildId = interaction.guildId!;
  const summary = getWorldSummary(guildId);

  const bonuses = summary.activeBonuses.length
    ? summary.activeBonuses.join('\n')
    : '*Không có bonus nào đang diễn ra.*';

  const debuffs = summary.activeDebuffs.length
    ? summary.activeDebuffs.join('\n')
    : '*Không có debuff nào đang hoạt động.*';

  const bosses = summary.bossesSlain.length
    ? summary.bossesSlain.join('\n')
    : '*Chưa có boss nào bị tiêu diệt.*';

  const events = summary.events.length
    ? summary.events.slice(0, 5).map(event => `• [${new Date(event.created_at * 1000).toLocaleTimeString('vi-VN')}] ${event.description}`).join('\n')
    : '*Chưa có sự kiện nào.*';

  const activeEvents = summary.activeEvents.length
    ? summary.activeEvents.join('\n')
    : '*Không có sự kiện thế giới đang diễn ra.*';

  const embed = new EmbedBuilder()
    .setColor(COLORS.info)
    .setTitle('🌍 Thế giới RPG')
    .setDescription('Theo dõi bonus, debuff và sự kiện server.')
    .addFields(
      { name: '🟢 Bonus hiện tại', value: bonuses, inline: false },
      { name: '🔴 Debuff hiện tại', value: debuffs, inline: false },
      { name: '🌐 Sự kiện thế giới', value: activeEvents, inline: false },
      { name: '👑 Boss đã bị tiêu diệt', value: bosses, inline: false },
      { name: '📰 Sự kiện gần đây', value: events, inline: false }
    );

  await interaction.editReply({ embeds: [embed] });
}

// Text-prefix aliases (auto-loaded by registry.ts)
export const aliases = ['w','server'];
