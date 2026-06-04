"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.data = void 0;
exports.execute = execute;
const discord_js_1 = require("discord.js");
const player_1 = require("../systems/player");
const embeds_1 = require("../utils/embeds");
const items_1 = require("../data/items");
const format_1 = require("../utils/format");
exports.data = new discord_js_1.SlashCommandBuilder()
    .setName('use')
    .setDescription('Sử dụng vật phẩm trong túi đồ')
    .addStringOption(opt => opt.setName('item')
    .setDescription('ID vật phẩm (xem /inventory)')
    .setRequired(true));
async function execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const { id: userId } = interaction.user;
    const guildId = interaction.guildId;
    const itemId = interaction.options.getString('item', true).toLowerCase().trim();
    const player = (0, player_1.getPlayer)(userId, guildId);
    if (!player || !player.alive) {
        await interaction.editReply('Nhân vật không tồn tại hoặc đã chết!');
        return;
    }
    const item = (0, items_1.getItem)(itemId);
    if (!item) {
        await interaction.editReply(`Không tìm thấy vật phẩm **${itemId}**.`);
        return;
    }
    if (item.type !== 'consumable') {
        await interaction.editReply(`**${item.icon} ${item.name}** không thể sử dụng trực tiếp.\n${item.type === 'skill_book' ? 'Dùng `/learnskill` để học kỹ năng từ sách!' : ''}`);
        return;
    }
    const qty = (0, player_1.getItemQty)(userId, guildId, itemId);
    if (qty <= 0) {
        await interaction.editReply(`Bạn không có **${item.icon} ${item.name}** trong túi!`);
        return;
    }
    if (!item.effect) {
        await interaction.editReply(`**${item.icon} ${item.name}** không có hiệu ứng!`);
        return;
    }
    let newHp = player.hp;
    let newMp = player.mp;
    const resultLines = [];
    if (item.effect.hp) {
        const gain = Math.min(item.effect.hp, player.max_hp - player.hp);
        newHp = Math.min(player.max_hp, player.hp + item.effect.hp);
        resultLines.push(`❤️ +**${gain} HP**  ${(0, format_1.bar)(newHp, player.max_hp, 8)} ${newHp}/${player.max_hp}`);
    }
    if (item.effect.mp) {
        const gain = Math.min(item.effect.mp, player.max_mp - player.mp);
        newMp = Math.min(player.max_mp, player.mp + item.effect.mp);
        resultLines.push(`💧 +**${gain} MP**  ${(0, format_1.bar)(newMp, player.max_mp, 8)} ${newMp}/${player.max_mp}`);
    }
    if (item.effect.removeEffect) {
        // Effect removal handled during combat; outside combat just confirm
        resultLines.push(`✨ Giải trừ hiệu ứng **${item.effect.removeEffect}**.`);
    }
    (0, player_1.removeItem)(userId, guildId, itemId, 1);
    (0, player_1.updatePlayerHpMp)(userId, guildId, newHp, newMp);
    await interaction.editReply({
        embeds: [
            new discord_js_1.EmbedBuilder()
                .setColor(embeds_1.COLORS.success)
                .setTitle(`${item.icon} Đã sử dụng ${item.name}`)
                .addFields({
                name: '✨ Hiệu ứng',
                value: resultLines.join('\n') || '*Không có hiệu ứng*'
            })
                .setFooter({ text: `Còn lại: ${qty - 1}x ${item.name}` })
        ]
    });
}
