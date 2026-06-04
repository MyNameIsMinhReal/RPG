"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.data = void 0;
exports.execute = execute;
const discord_js_1 = require("discord.js");
const player_1 = require("../systems/player");
const world_1 = require("../systems/world");
const achievements_1 = require("../systems/achievements");
const embeds_1 = require("../utils/embeds");
const TAX_RATE = 0.08; // 8% tax on gold transfers → gold sink
exports.data = new discord_js_1.SlashCommandBuilder()
    .setName('trade')
    .setDescription('Chuyển Gold cho người chơi khác (thuế 8%)')
    .addUserOption(opt => opt.setName('target')
    .setDescription('Người nhận')
    .setRequired(true))
    .addIntegerOption(opt => opt.setName('amount')
    .setDescription('Số Gold muốn gửi')
    .setRequired(true)
    .setMinValue(1));
async function execute(interaction) {
    await interaction.deferReply();
    const { id: userId } = interaction.user;
    const guildId = interaction.guildId;
    const target = interaction.options.getUser('target', true);
    const amount = interaction.options.getInteger('amount', true);
    // Self-trade check
    if (target.id === userId) {
        await interaction.editReply({
            embeds: [new discord_js_1.EmbedBuilder().setColor(embeds_1.COLORS.warning).setDescription('Không thể tự gửi tiền cho bản thân!')]
        });
        return;
    }
    // Bot check
    if (target.bot) {
        await interaction.editReply({
            embeds: [new discord_js_1.EmbedBuilder().setColor(embeds_1.COLORS.warning).setDescription('Không thể giao dịch với bot!')]
        });
        return;
    }
    const sender = (0, player_1.getPlayer)(userId, guildId);
    const receiver = (0, player_1.getPlayer)(target.id, guildId);
    if (!sender || !sender.alive) {
        await interaction.editReply({ embeds: [new discord_js_1.EmbedBuilder().setColor(embeds_1.COLORS.warning).setDescription('Nhân vật của bạn không hợp lệ hoặc đã chết!')] });
        return;
    }
    if (!receiver || !receiver.alive) {
        await interaction.editReply({ embeds: [new discord_js_1.EmbedBuilder().setColor(embeds_1.COLORS.warning).setDescription(`**${target.username}** chưa có nhân vật hoặc đã chết!`)] });
        return;
    }
    if (sender.gold < amount) {
        await interaction.editReply({
            embeds: [
                new discord_js_1.EmbedBuilder()
                    .setColor(embeds_1.COLORS.warning)
                    .setDescription(`Không đủ Gold!\nCần **${amount} 🪙** nhưng bạn chỉ có **${sender.gold} 🪙**.`)
            ]
        });
        return;
    }
    const tax = Math.max(1, Math.floor(amount * TAX_RATE));
    const received = amount - tax;
    (0, player_1.spendGold)(userId, guildId, amount);
    (0, player_1.grantGold)(target.id, guildId, received);
    const achievementMessages = (0, achievements_1.awardAchievements)(userId, guildId);
    (0, world_1.logEvent)(guildId, userId, sender.name, 'trade', `đã chuyển **${received}** Gold cho **${receiver.name}** (thuế ${tax} Gold).`);
    const embed = new discord_js_1.EmbedBuilder()
        .setColor(embeds_1.COLORS.gold)
        .setTitle('💸 Giao Dịch Thành Công')
        .setDescription(`**${sender.name}** → **${receiver.name}**`)
        .addFields({ name: '📤 Gửi', value: `**${amount}** 🪙`, inline: true }, { name: '💰 Thuế', value: `−**${tax}** 🪙`, inline: true }, { name: '📥 Nhận', value: `**${received}** 🪙`, inline: true }, { name: `🪙 Gold còn lại (${sender.name})`, value: `**${sender.gold - amount}**`, inline: true }, { name: `🪙 Gold mới (${receiver.name})`, value: `**${receiver.gold + received}**`, inline: true })
        .setFooter({ text: `Thuế ${TAX_RATE * 100}% được thu vào quỹ quốc gia (gold sink)` });
    if (achievementMessages.length) {
        embed.addFields({ name: '🏆 Thành tựu mới', value: achievementMessages.join('\n'), inline: false });
    }
    await interaction.editReply({
        embeds: [embed]
    });
}
