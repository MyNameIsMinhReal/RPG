import {
  SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder
} from 'discord.js';
import { addUpdateLog, getAllUpdateLogs } from '../systems/updateLog';

const ALLOWED_IDS = new Set(
  (process.env.BOT_ADMIN_IDS ?? '').split(',').map(s => s.trim()).filter(Boolean)
);

export const data = new SlashCommandBuilder()
  .setName('updatelog')
  .setDescription('Quản lý update log')
  .addSubcommand(sub => sub
    .setName('add')
    .setDescription('Thêm update log mới — sẽ DM tất cả người chơi lần sau họ dùng lệnh')
    .addStringOption(opt => opt.setName('version').setDescription('Tên version, vd: v1.2 hoặc 2026-06-09').setRequired(true))
    .addStringOption(opt => opt.setName('content').setDescription('Nội dung update (hỗ trợ markdown Discord)').setRequired(true))
  )
  .addSubcommand(sub => sub
    .setName('list')
    .setDescription('Xem các update log đã tạo')
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  if (!ALLOWED_IDS.has(interaction.user.id)) {
    await interaction.editReply({ content: '❌ Bạn không có quyền dùng lệnh này.' });
    return;
  }

  const sub = interaction.options.getSubcommand();

  if (sub === 'add') {
    const version = interaction.options.getString('version', true);
    const content = interaction.options.getString('content', true);
    const log = addUpdateLog(version, content);

    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x57F287)
          .setTitle('✅ Update log đã được tạo')
          .addFields(
            { name: 'ID', value: `#${log.id}`, inline: true },
            { name: 'Version', value: log.version, inline: true },
            { name: 'Nội dung', value: log.content }
          )
          .setFooter({ text: 'Người chơi sẽ nhận DM vào lần tiếp theo họ dùng lệnh.' })
      ]
    });
    return;
  }

  if (sub === 'list') {
    const logs = getAllUpdateLogs().slice(0, 10);
    if (!logs.length) {
      await interaction.editReply({ content: 'Chưa có update log nào.' });
      return;
    }
    const desc = logs.map(l =>
      `**#${l.id} — ${l.version}**\n${l.content.slice(0, 100)}${l.content.length > 100 ? '...' : ''}`
    ).join('\n\n');

    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x5865F2)
          .setTitle('📋 Update Logs (10 gần nhất)')
          .setDescription(desc)
      ]
    });
  }
}
