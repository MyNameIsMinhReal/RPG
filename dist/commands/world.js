"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.data = void 0;
exports.execute = execute;
const discord_js_1 = require("discord.js");
const world_1 = require("../systems/world");
const embeds_1 = require("../utils/embeds");
exports.data = new discord_js_1.SlashCommandBuilder()
    .setName('world')
    .setDescription('Xem trạng thái thế giới và sự kiện server');
async function execute(interaction) {
    await interaction.deferReply();
    const guildId = interaction.guildId;
    const summary = (0, world_1.getWorldSummary)(guildId);
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
    const embed = new discord_js_1.EmbedBuilder()
        .setColor(embeds_1.COLORS.info)
        .setTitle('🌍 Thế giới RPG')
        .setDescription('Theo dõi bonus, debuff và sự kiện server.')
        .addFields({ name: '🟢 Bonus hiện tại', value: bonuses, inline: false }, { name: '🔴 Debuff hiện tại', value: debuffs, inline: false }, { name: '🌐 Sự kiện thế giới', value: activeEvents, inline: false }, { name: '👑 Boss đã bị tiêu diệt', value: bosses, inline: false }, { name: '📰 Sự kiện gần đây', value: events, inline: false });
    await interaction.editReply({ embeds: [embed] });
}
