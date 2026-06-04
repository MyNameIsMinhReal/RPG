"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.data = void 0;
exports.execute = execute;
const discord_js_1 = require("discord.js");
const player_1 = require("../systems/player");
const embeds_1 = require("../utils/embeds");
const achievements_1 = require("../systems/achievements");
const discord_js_2 = require("discord.js");
const embeds_2 = require("../utils/embeds");
exports.data = new discord_js_1.SlashCommandBuilder()
    .setName('profile')
    .setDescription('Xem thông tin nhân vật')
    .addUserOption(opt => opt.setName('player')
    .setDescription('Xem profile của người chơi khác')
    .setRequired(false));
async function execute(interaction) {
    await interaction.deferReply();
    const target = interaction.options.getUser('player') ?? interaction.user;
    const guildId = interaction.guildId;
    const player = (0, player_1.getPlayer)(target.id, guildId);
    if (!player) {
        await interaction.editReply({
            embeds: [
                new discord_js_2.EmbedBuilder()
                    .setColor(embeds_2.COLORS.warning)
                    .setDescription(`**${target.username}** chưa có nhân vật. Dùng \`/start\` để bắt đầu!`)
            ]
        });
        return;
    }
    const loadout = (0, player_1.getLoadout)(target.id, guildId);
    const withPassive = (0, player_1.applyPassiveStats)(player);
    const avatar = target.displayAvatarURL({ size: 128 });
    const achievementSummary = (0, achievements_1.getAchievementSummary)(target.id, guildId);
    await interaction.editReply({
        embeds: [(0, embeds_1.buildProfileEmbed)(withPassive, loadout, avatar, achievementSummary)]
    });
}
