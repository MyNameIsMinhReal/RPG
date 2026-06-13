import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { getPlayer, getItemQty } from '../systems/player';
import { incrementDaily, countsAsPotion } from './daily';
import { COLORS } from '../utils/embeds';
import { getItem } from '../data/items';
import { useItemOutsideCombat } from '../systems/consumables';

export const data = new SlashCommandBuilder()
  .setName('use')
  .setDescription('Sử dụng vật phẩm trong túi đồ')
  .addStringOption(opt =>
    opt.setName('item')
       .setDescription('ID vật phẩm (xem /inventory)')
       .setRequired(true)
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ flags: 64 });

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

  const beforeQty = getItemQty(userId, guildId, itemId);
  const result = useItemOutsideCombat(userId, guildId, itemId);
  const afterQty = getItemQty(userId, guildId, itemId);

  if (result.consumed && countsAsPotion(itemId)) incrementDaily(userId, guildId, 'potion_used');

  await interaction.editReply({
    embeds: [new EmbedBuilder()
      .setColor(result.ok ? COLORS.success : COLORS.warning)
      .setTitle(result.title)
      .setDescription(result.lines.join('\n') || '*Không có hiệu ứng.*')
      .setFooter({ text: result.consumed ? `Còn lại: ${afterQty}x ${item.name}` : `Đang có: ${beforeQty}x ${item.name}` })]
  });
}

// Text-prefix aliases (auto-loaded by registry.ts)
export const aliases = ['u','useitem'];
