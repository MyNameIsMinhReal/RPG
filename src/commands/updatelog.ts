import {
  SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder
} from 'discord.js';
import { addUpdateLog, getAllUpdateLogs } from '../systems/updateLog';

const ALLOWED_IDS = new Set(
  (process.env.BOT_ADMIN_IDS ?? '').split(',').map(s => s.trim()).filter(Boolean)
);

const FIELD_VALUE_LIMIT = 1024;
const EMBED_DESCRIPTION_LIMIT = 4096;

function clampText(text: string, limit: number): string {
  if (text.length <= limit) return text;
  return `${text.slice(0, Math.max(0, limit - 20)).trimEnd()}\n… *(đã rút gọn)*`;
}

function buildLogPreview(content: string): string {
  return clampText(content, FIELD_VALUE_LIMIT);
}

function buildListDescription(logs: ReturnType<typeof getAllUpdateLogs>): string {
  const lines: string[] = [];
  let total = 0;

  for (const log of logs) {
    const block = `**#${log.id} — ${log.version}**\n${clampText(log.content, 180)}`;
    if (total + block.length + 2 > EMBED_DESCRIPTION_LIMIT) break;
    lines.push(block);
    total += block.length + 2;
  }

  return lines.join('\n\n') || 'Không có update log để hiển thị.';
}

export const data = new SlashCommandBuilder()
  .setName('updatelog')
  .setDescription('Quản lý update log')
  .addSubcommand(sub => sub
    .setName('add')
    .setDescription('Thêm update log mới — sẽ DM tất cả người chơi lần sau họ dùng lệnh')
    .addStringOption(opt => opt.setName('version').setDescription('Tên version, vd: v1.2 hoặc 2026-06-09').setRequired(true).setMaxLength(80))
    .addStringOption(opt => opt.setName('content').setDescription('Nội dung update (hỗ trợ markdown Discord)').setRequired(true).setMaxLength(4000))
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
    const version = interaction.options.getString('version', true).trim();
    const content = interaction.options.getString('content', true).trim();

    if (!version || !content) {
      await interaction.editReply({ content: '❌ Version và nội dung không được để trống.' });
      return;
    }

    const log = addUpdateLog(version, content);

    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x57F287)
          .setTitle('✅ Update log đã được tạo')
          .setDescription('Nội dung đã được lưu đầy đủ. Bản xem trước bên dưới được rút gọn để tránh lỗi giới hạn Embed của Discord.')
          .addFields(
            { name: 'ID', value: `#${log.id}`, inline: true },
            { name: 'Version', value: clampText(log.version, 256), inline: true },
            { name: 'Độ dài', value: `${log.content.length}/4000 ký tự`, inline: true },
            { name: 'Xem trước', value: buildLogPreview(log.content) || 'Không có nội dung.' }
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

    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x5865F2)
          .setTitle('📋 Update Logs (10 gần nhất)')
          .setDescription(buildListDescription(logs))
      ]
    });
  }
}
