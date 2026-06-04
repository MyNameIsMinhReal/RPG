"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.data = void 0;
exports.execute = execute;
const discord_js_1 = require("discord.js");
const player_1 = require("../systems/player");
const achievements_1 = require("../systems/achievements");
const embeds_1 = require("../utils/embeds");
exports.data = new discord_js_1.SlashCommandBuilder()
    .setName('achievements')
    .setDescription('Xem các thành tựu đã mở và mục tiêu sắp tới');
async function execute(interaction) {
    await interaction.deferReply();
    const userId = interaction.user.id;
    const guildId = interaction.guildId;
    const player = (0, player_1.getPlayer)(userId, guildId);
    if (!player) {
        await interaction.editReply({
            embeds: [
                new discord_js_1.EmbedBuilder()
                    .setColor(embeds_1.COLORS.warning)
                    .setDescription('Bạn chưa có nhân vật. Dùng `/start` để bắt đầu.')
            ]
        });
        return;
    }
    const achievements = (0, achievements_1.getAchievementsForPlayer)(userId, guildId);
    const summary = (0, achievements_1.getAchievementSummary)(userId, guildId);
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
            new discord_js_1.EmbedBuilder()
                .setColor(embeds_1.COLORS.gold)
                .setTitle('🏅 Thành tựu')
                .setDescription(`Bạn đã mở **${summary.unlocked}/${summary.total}** thành tựu.`)
                .addFields({ name: '🎖️ Đã mở', value: unlockedText, inline: false }, { name: '✨ Mục tiêu tiếp theo', value: upcomingText, inline: false })
        ]
    });
}
