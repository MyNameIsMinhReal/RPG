"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.data = void 0;
exports.execute = execute;
const discord_js_1 = require("discord.js");
const player_1 = require("../systems/player");
const embeds_1 = require("../utils/embeds");
exports.data = new discord_js_1.SlashCommandBuilder()
    .setName('start')
    .setDescription('Tạo nhân vật mới — hoặc hồi sinh nếu đã chết');
async function execute(interaction) {
    await interaction.deferReply();
    const { id: userId, username } = interaction.user;
    const guildId = interaction.guildId;
    const player = (0, player_1.getPlayer)(userId, guildId);
    // ── First time ────────────────────────────────────────────────────
    if (!player) {
        (0, player_1.createPlayer)(userId, guildId, username);
        await interaction.editReply({
            embeds: [
                new discord_js_1.EmbedBuilder()
                    .setColor(embeds_1.COLORS.success)
                    .setTitle('🌟 Chào mừng đến thế giới này!')
                    .setDescription(`**${username}** đã được triệu hồi!\n\n` +
                    `Bạn bắt đầu tại 🏘️ **Làng Ashveil** với:\n` +
                    `> ❤️ **100 HP**  ·  💧 **50 MP**\n` +
                    `> ⚔️ **10 ATK**  ·  🛡️ **5 DEF**\n` +
                    `> 🪙 **50 Gold** để bắt đầu\n\n` +
                    `Dùng \`/explore\` để phiêu lưu, \`/inventory\` để quản lý đồ và kỹ năng.`)
                    .setFooter({ text: '⚠️ Permadeath — khi chết bạn mất tất cả trừ Skill Pool và Soul Shards.' })
            ]
        });
        return;
    }
    // ── Already alive ────────────────────────────────────────────────
    if (player.alive) {
        await interaction.editReply({
            embeds: [
                new discord_js_1.EmbedBuilder()
                    .setColor(embeds_1.COLORS.warning)
                    .setTitle('⚠️ Nhân vật đang tồn tại')
                    .setDescription(`**${player.name}** (Lv.${player.level}) của bạn vẫn đang sống!\n` +
                    `Dùng \`/profile\` để xem trạng thái.`)
            ]
        });
        return;
    }
    // ── Dead — auto revive ───────────────────────────────────────────
    (0, player_1.resetPlayer)(userId, guildId);
    await interaction.editReply({
        embeds: [
            new discord_js_1.EmbedBuilder()
                .setColor(embeds_1.COLORS.success)
                .setTitle('🌅 Hồi Sinh!')
                .setDescription(`**${username}** tỉnh dậy tại 🏘️ **Làng Ashveil**...\n` +
                `Ký ức mờ nhạt, nhưng những kỹ năng vẫn còn đó.\n\n` +
                `💀 Số lần đã chết: **${player.deaths}**\n` +
                `💀 Soul Shards giữ lại: **${player.soul_shards}**\n\n` +
                `*Thế giới vẫn mang dấu ấn những quyết định trước đây...*`)
                .setFooter({ text: 'Skill pool giữ nguyên. Dùng /inventory để kiểm tra.' })
        ]
    });
}
