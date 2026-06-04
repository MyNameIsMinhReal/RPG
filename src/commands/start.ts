import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { getPlayer, createPlayer, resetPlayer } from '../systems/player';
import { COLORS } from '../utils/embeds';

export const data = new SlashCommandBuilder()
  .setName('start')
  .setDescription('Tạo nhân vật mới — hoặc hồi sinh nếu đã chết');

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();
  const { id: userId, username } = interaction.user;
  const guildId = interaction.guildId!;
  const player  = getPlayer(userId, guildId);

  // ── First time ────────────────────────────────────────────────────
  if (!player) {
    createPlayer(userId, guildId, username);
    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(COLORS.success)
          .setTitle('🌟 Chào mừng đến thế giới này!')
          .setDescription(
            `**${username}** đã được triệu hồi!\n\n` +
            `Bạn bắt đầu tại 🏘️ **Làng Ashveil** với:\n` +
            `> ❤️ **100 HP**  ·  💧 **50 MP**\n` +
            `> ⚔️ **10 ATK**  ·  🛡️ **5 DEF**\n` +
            `> 🪙 **50 Gold** để bắt đầu\n\n` +
            `Dùng \`/explore\` để phiêu lưu, \`/inventory\` để quản lý đồ và kỹ năng.`
          )
          .setFooter({ text: '⚠️ Permadeath — khi chết bạn mất tất cả trừ Skill Pool và Soul Shards.' })
      ]
    });
    return;
  }

  // ── Already alive ────────────────────────────────────────────────
  if (player.alive) {
    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(COLORS.warning)
          .setTitle('⚠️ Nhân vật đang tồn tại')
          .setDescription(
            `**${player.name}** (Lv.${player.level}) của bạn vẫn đang sống!\n` +
            `Dùng \`/profile\` để xem trạng thái.`
          )
      ]
    });
    return;
  }

  // ── Dead — auto revive ───────────────────────────────────────────
  resetPlayer(userId, guildId);
  await interaction.editReply({
    embeds: [
      new EmbedBuilder()
        .setColor(COLORS.success)
        .setTitle('🌅 Hồi Sinh!')
        .setDescription(
          `**${username}** tỉnh dậy tại 🏘️ **Làng Ashveil**...\n` +
          `Ký ức mờ nhạt, nhưng những kỹ năng vẫn còn đó.\n\n` +
          `💀 Số lần đã chết: **${player.deaths}**\n` +
          `💀 Soul Shards giữ lại: **${player.soul_shards}**\n\n` +
          `*Thế giới vẫn mang dấu ấn những quyết định trước đây...*`
        )
        .setFooter({ text: 'Skill pool giữ nguyên. Dùng /inventory để kiểm tra.' })
    ]
  });
}
