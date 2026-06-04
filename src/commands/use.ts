import {
  SlashCommandBuilder, ChatInputCommandInteraction,
  EmbedBuilder
} from 'discord.js';
import { getPlayer, getItemQty, removeItem, updatePlayerHpMp } from '../systems/player';
import { COLORS } from '../utils/embeds';
import { getItem } from '../data/items';
import { bar } from '../utils/format';

export const data = new SlashCommandBuilder()
  .setName('use')
  .setDescription('Sử dụng vật phẩm trong túi đồ')
  .addStringOption(opt =>
    opt.setName('item')
       .setDescription('ID vật phẩm (xem /inventory)')
       .setRequired(true)
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const { id: userId } = interaction.user;
  const guildId = interaction.guildId!;
  const itemId  = interaction.options.getString('item', true).toLowerCase().trim();

  const player = getPlayer(userId, guildId);
  if (!player || !player.alive) {
    await interaction.editReply('Nhân vật không tồn tại hoặc đã chết!');
    return;
  }

  const item = getItem(itemId);
  if (!item) {
    await interaction.editReply(`Không tìm thấy vật phẩm **${itemId}**.`);
    return;
  }

  if (item.type !== 'consumable') {
    await interaction.editReply(`**${item.icon} ${item.name}** không thể sử dụng trực tiếp.\n${
      item.type === 'skill_book' ? 'Dùng `/learnskill` để học kỹ năng từ sách!' : ''
    }`);
    return;
  }

  const qty = getItemQty(userId, guildId, itemId);
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
  const resultLines: string[] = [];

  if (item.effect.hp) {
    const gain = Math.min(item.effect.hp, player.max_hp - player.hp);
    newHp = Math.min(player.max_hp, player.hp + item.effect.hp);
    resultLines.push(`❤️ +**${gain} HP**  ${bar(newHp, player.max_hp, 8)} ${newHp}/${player.max_hp}`);
  }

  if (item.effect.mp) {
    const gain = Math.min(item.effect.mp, player.max_mp - player.mp);
    newMp = Math.min(player.max_mp, player.mp + item.effect.mp);
    resultLines.push(`💧 +**${gain} MP**  ${bar(newMp, player.max_mp, 8)} ${newMp}/${player.max_mp}`);
  }

  if (item.effect.removeEffect) {
    // Effect removal handled during combat; outside combat just confirm
    resultLines.push(`✨ Giải trừ hiệu ứng **${item.effect.removeEffect}**.`);
  }

  removeItem(userId, guildId, itemId, 1);
  updatePlayerHpMp(userId, guildId, newHp, newMp);

  await interaction.editReply({
    embeds: [
      new EmbedBuilder()
        .setColor(COLORS.success)
        .setTitle(`${item.icon} Đã sử dụng ${item.name}`)
        .addFields({
          name: '✨ Hiệu ứng',
          value: resultLines.join('\n') || '*Không có hiệu ứng*'
        })
        .setFooter({ text: `Còn lại: ${qty - 1}x ${item.name}` })
    ]
  });
}
