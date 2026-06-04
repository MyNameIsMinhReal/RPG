import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { getPlayer, getItemQty, removeItem, addItem } from '../systems/player';
import { COLORS } from '../utils/embeds';
import { getItem } from '../data/items';

export const data = new SlashCommandBuilder()
  .setName('craft')
  .setDescription('Chế tạo vật phẩm từ tài nguyên')
  .addStringOption(opt => opt.setName('recipe').setDescription('ID công thức').setRequired(true));

// Simple recipes map: output -> { ingredients: { itemId: qty } }
const RECIPES: Record<string, { output: string; qty: number; ingredients: Record<string, number>}> = {
  elixir: { output: 'elixir', qty: 1, ingredients: { herb: 3, mana_crystal: 1 } },
};

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();
  const userId = interaction.user.id;
  const guildId = interaction.guildId!;

  const player = getPlayer(userId, guildId);
  if (!player) {
    await interaction.editReply({ embeds: [new EmbedBuilder().setColor(COLORS.warning).setDescription('Bạn chưa có nhân vật. Dùng `/start`.')] });
    return;
  }

  const recipeId = interaction.options.getString('recipe', true);
  const recipe = RECIPES[recipeId];
  if (!recipe) {
    await interaction.editReply({ embeds: [new EmbedBuilder().setColor(COLORS.warning).setDescription(`Công thức \'${recipeId}\' không tồn tại.`)] });
    return;
  }

  // Check ingredients
  const missing: string[] = [];
  for (const [ing, need] of Object.entries(recipe.ingredients)) {
    const have = getItemQty(userId, guildId, ing);
    if (have < need) {
      const it = getItem(ing);
      const name = it ? it.name : ing;
      missing.push(`- ${name}: cần ${need}, bạn có ${have}`);
    }
  }

  if (missing.length) {
    const embed = new EmbedBuilder().setColor(COLORS.warning)
      .setTitle('Chế tạo thất bại')
      .setDescription('Thiếu nguyên liệu:')
      .addFields({ name: 'Thiếu', value: missing.join('\n') });
    await interaction.editReply({ embeds: [embed] });
    return;
  }

  // Remove ingredients
  for (const [ing, need] of Object.entries(recipe.ingredients)) {
    removeItem(userId, guildId, ing, need);
  }
  // Add output
  addItem(userId, guildId, recipe.output, recipe.qty);

  const outItem = getItem(recipe.output);
  const embed = new EmbedBuilder().setColor(COLORS.success)
    .setTitle('Chế tạo thành công!')
    .setDescription(`Bạn nhận được **${outItem ? outItem.icon + ' ' + outItem.name : recipe.output} ×${recipe.qty}**`);

  await interaction.editReply({ embeds: [embed] });
}

export default { data, execute };
