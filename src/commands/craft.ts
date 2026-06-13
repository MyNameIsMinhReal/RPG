import {
  SlashCommandBuilder, ChatInputCommandInteraction,
  EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder, ButtonBuilder, ButtonStyle,
  ComponentType, StringSelectMenuInteraction
} from 'discord.js';
import { getPlayer, getItemQty, spendGold } from '../systems/player';
import { isRecipeUnlocked, checkIngredients, attemptCraft, getCraftingStats, initDefaultRecipes, getRecipeUnlockHint } from '../systems/crafting';
import { COLORS } from '../utils/embeds';
import { CRAFT_RECIPES, getRecipesByCategory, BASE_SUCCESS_RATE, getLevelSuccessBonus, getCraftingLevel, CRAFTING_LEVEL_THRESHOLDS, type CraftRecipe } from '../data/recipes';
import { getItem } from '../data/items';
import { getMaterial } from '../data/materials';
import { getEquipment } from '../data/equipment';
import { RARITY_LABELS } from '../data/equipment';
import { randInt } from '../utils/format';

export const data = new SlashCommandBuilder()
  .setName('craft')
  .setDescription('Chế tạo vũ khí, giáp, potion và nguyên liệu');

type Category = 'weapon' | 'armor' | 'accessory' | 'potion' | 'material';

const CAT_LABELS: Record<Category, string> = {
  weapon:    '⚔️ Vũ Khí',
  armor:     '🛡️ Giáp',
  accessory: '💍 Phụ Kiện',
  potion:    '🧪 Potion',
  material:  '⚗️ Nguyên Liệu',
};

// ── Helpers ─────────────────────────────────────────────────────────────
function getItemName(id: string): string {
  return getEquipment(id)?.name ?? getItem(id)?.name ?? getMaterial(id)?.name ?? id;
}
function getItemIcon(id: string): string {
  return getEquipment(id)?.icon ?? getItem(id)?.icon ?? getMaterial(id)?.icon ?? '📦';
}

function buildIngredientList(
  userId: string, guildId: string, recipe: CraftRecipe, gold: number
): string {
  const lines = recipe.ingredients.map(ing => {
    const have   = getItemQty(userId, guildId, ing.itemId);
    const ok     = have >= ing.amount;
    const icon   = getItemIcon(ing.itemId);
    const name   = getItemName(ing.itemId);
    return `${ok ? '✅' : '❌'} ${icon} **${name}**: cần **${ing.amount}**, có **${have}**`;
  });
  const goldOk = gold >= recipe.goldCost;
  lines.push(`${goldOk ? '✅' : '❌'} 🪙 **Gold**: cần **${recipe.goldCost}**, có **${gold}**`);
  return lines.join('\n');
}

// ── Command ──────────────────────────────────────────────────────────────
export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  const { id: userId } = interaction.user;
  const guildId = interaction.guildId!;
  const player  = getPlayer(userId, guildId);

  if (!player || !player.alive) {
    await interaction.editReply({ embeds: [new EmbedBuilder().setColor(COLORS.warning).setDescription('Nhân vật không tồn tại hoặc đã chết!')] });
    return;
  }

  // Ensure default recipes unlocked
  initDefaultRecipes(userId, guildId);

  await showCategoryPicker(interaction, userId, guildId);
}

// ── Category picker ──────────────────────────────────────────────────────
async function showCategoryPicker(
  interaction: ChatInputCommandInteraction, userId: string, guildId: string
): Promise<void> {
  const { exp, level } = getCraftingStats(userId, guildId);
  const nextThreshold  = CRAFTING_LEVEL_THRESHOLDS[level] ?? 99999;
  const bonus          = getLevelSuccessBonus(level);

  const embed = new EmbedBuilder()
    .setColor(0xE67E22)
    .setTitle('⚒️ Crafting')
    .setDescription(
      `**Crafting Level ${level}** — ${exp} / ${nextThreshold} EXP\n` +
      `✨ Bonus tỉ lệ thành công: **+${bonus}%**\n\n` +
      `*Chọn danh mục bên dưới để bắt đầu chế tạo.*`
    )
    .addFields({
      name: '📋 Tỉ lệ thành công theo độ hiếm',
      value: [
        `⚪ Common/Rare: **100%**`,
        `💜 Epic: **${90 + bonus}%**`,
        `🟠 Legendary: **${75 + bonus}%**`,
        `🔴 Mythic: **${60 + bonus}%**`,
        `⚫ Cursed: **${55 + bonus}%**`,
      ].join('  ·  '),
      inline: false
    });

  const opts = (['weapon','armor','accessory','potion','material'] as Category[]).map(c =>
    new StringSelectMenuOptionBuilder().setLabel(CAT_LABELS[c]).setValue(c)
  );

  const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`craft_cat_${userId}`)
      .setPlaceholder('Chọn danh mục...')
      .addOptions(opts.slice(0, 25))
  );

  const reply = await interaction.editReply({ embeds: [embed], components: [row] });

  const sel = await reply.awaitMessageComponent({
    componentType: ComponentType.StringSelect,
    filter: i => i.user.id === userId,
    time: 60_000
  }).catch(() => null);

  if (!sel) { await interaction.editReply({ components: [] }); return; }
  await sel.deferUpdate();
  await showRecipePicker(interaction, userId, guildId, sel.values[0] as Category);
}

// ── Recipe picker ─────────────────────────────────────────────────────────
async function showRecipePicker(
  interaction: ChatInputCommandInteraction,
  userId: string, guildId: string, category: Category
): Promise<void> {
  const player  = getPlayer(userId, guildId)!;
  const recipes = getRecipesByCategory(category);
  const { level } = getCraftingStats(userId, guildId);
  const bonus   = getLevelSuccessBonus(level);

  // Split unlocked / locked
  const unlocked: CraftRecipe[] = [];
  const locked:   CraftRecipe[] = [];

  for (const r of recipes) {
    if (r.levelRequired && player.level < r.levelRequired) { locked.push(r); continue; }
    if (isRecipeUnlocked(userId, guildId, r.id)) unlocked.push(r);
    else locked.push(r);
  }

  if (!unlocked.length && !locked.length) {
    await interaction.editReply({
      embeds: [new EmbedBuilder().setColor(COLORS.info).setDescription(`Không có recipe nào trong **${CAT_LABELS[category]}**.`)],
      components: []
    });
    return;
  }

  // Build embed with recipe list
  const unlockedLines = unlocked.map(r => {
    const resultIcon = getItemIcon(r.resultItemId);
    const resultName = getItemName(r.resultItemId);
    const rarity     = RARITY_LABELS[r.resultRarity] ?? r.resultRarity;
    const rate       = Math.min(100, r.successRate + bonus);
    const { canCraft } = checkIngredients(userId, guildId, r, player.gold);
    const craftTag   = canCraft ? '✅' : '⚠️';
    return `${craftTag} ${resultIcon} **${resultName}** [${rarity}] — ${rate}% · ${r.goldCost}🪙`;
  }).join('\n');

  const lockedLines = locked.slice(0, 5).map(r => {
    const resultName = getItemName(r.resultItemId);
    const rarity     = RARITY_LABELS[r.resultRarity] ?? r.resultRarity;
    const reason     = r.levelRequired && player.level < r.levelRequired
      ? `Lv.${r.levelRequired} required`
      : r.recipeRequired ? getRecipeUnlockHint(r) : 'Chưa mở';
    return `🔒 **${resultName}** [${rarity}] — *${reason}*`;
  }).join('\n');

  const embed = new EmbedBuilder()
    .setColor(0xE67E22)
    .setTitle(`⚒️ Craft — ${CAT_LABELS[category]}`)
    .setDescription(
      `✅ = đủ nguyên liệu  ·  ⚠️ = thiếu nguyên liệu\n\n` +
      (unlockedLines || '*Chưa có recipe nào được mở khóa.*')
    );

  if (lockedLines) {
    embed.addFields({ name: '🔒 Chưa mở khóa', value: lockedLines, inline: false });
  }

  // Build select options (only unlocked)
  if (!unlocked.length) {
    await interaction.editReply({ embeds: [embed], components: [] });
    return;
  }

  const opts = unlocked.slice(0, 25).map(r => {
    const icon = getItemIcon(r.resultItemId);
    const name = getItemName(r.resultItemId);
    const rate = Math.min(100, r.successRate + bonus);
    const { canCraft } = checkIngredients(userId, guildId, r, player.gold);
    return new StringSelectMenuOptionBuilder()
      .setLabel(`${name} — ${rate}% (${r.goldCost}🪙)`)
      .setDescription(canCraft ? 'Đủ nguyên liệu ✅' : 'Thiếu nguyên liệu ⚠️')
      .setValue(r.id)
      .setEmoji(icon);
  });

  const rows: ActionRowBuilder<any>[] = [
    new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`craft_recipe_${userId}`)
        .setPlaceholder('Chọn recipe...')
        .addOptions(opts.slice(0, 25))
    ),
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId(`craft_back_${userId}`).setLabel('← Quay lại').setStyle(ButtonStyle.Secondary)
    )
  ];

  const reply = await interaction.editReply({ embeds: [embed], components: rows });

  const comp = await reply.awaitMessageComponent({
    filter: i => i.user.id === userId, time: 60_000
  }).catch(() => null);

  if (!comp) { await interaction.editReply({ components: [] }); return; }
  await comp.deferUpdate();

  if ((comp as any).customId === `craft_back_${userId}`) {
    await showCategoryPicker(interaction, userId, guildId);
    return;
  }

  const recipeId = (comp as StringSelectMenuInteraction).values[0];
  const recipe   = unlocked.find(r => r.id === recipeId);
  if (!recipe) return;

  await showRecipeDetail(interaction, userId, guildId, recipe, category);
}

// ── Recipe detail + confirm ───────────────────────────────────────────────
async function showRecipeDetail(
  interaction: ChatInputCommandInteraction,
  userId: string, guildId: string,
  recipe: CraftRecipe, category: Category
): Promise<void> {
  const player   = getPlayer(userId, guildId)!;
  const { level } = getCraftingStats(userId, guildId);
  const bonus    = getLevelSuccessBonus(level);
  const finalRate = Math.min(100, recipe.successRate + bonus);
  const { canCraft, missing } = checkIngredients(userId, guildId, recipe, player.gold);

  const resultIcon = getItemIcon(recipe.resultItemId);
  const resultName = getItemName(recipe.resultItemId);
  const rarity     = RARITY_LABELS[recipe.resultRarity] ?? recipe.resultRarity;

  const ingList = buildIngredientList(userId, guildId, recipe, player.gold);

  const failNote = recipe.resultRarity !== 'common' && recipe.resultRarity !== 'rare'
    ? `\n⚠️ **Khi thất bại:** Mất ${recipe.goldCost}🪙 và 40% nguyên liệu. Recipe được giữ lại.`
    : '';

  const embed = new EmbedBuilder()
    .setColor(canCraft ? 0xE67E22 : COLORS.warning)
    .setTitle(`⚒️ Craft — ${resultIcon} ${resultName}`)
    .addFields(
      { name: 'Độ hiếm', value: rarity, inline: true },
      { name: 'Tỉ lệ thành công', value: `**${finalRate}%**`, inline: true },
      { name: 'EXP crafting', value: `+${recipe.craftingExp}`, inline: true },
      { name: '📦 Nguyên liệu cần', value: ingList, inline: false }
    )
    .setDescription(canCraft ? '✅ Đủ nguyên liệu! Nhấn Craft để bắt đầu.' : '❌ **Không đủ nguyên liệu.**' + failNote);

  if (!canCraft) {
    // Show missing items clearly
    const missingLines = missing
      .filter(m => !m.enough)
      .map(m => `${getItemIcon(m.itemId)} **${getItemName(m.itemId)}**: cần ${m.needed}, thiếu **${m.needed - m.have}**`);
    if (missingLines.length) {
      embed.addFields({ name: '❌ Còn thiếu', value: missingLines.join('\n'), inline: false });
    }
  }

  const rows: ActionRowBuilder<any>[] = [
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId(`craft_confirm_${userId}`).setLabel('⚒️ Craft!').setStyle(ButtonStyle.Success).setDisabled(!canCraft),
      new ButtonBuilder().setCustomId(`craft_back2_${userId}`).setLabel('← Quay lại').setStyle(ButtonStyle.Secondary)
    )
  ];

  const reply = await interaction.editReply({ embeds: [embed], components: rows });

  const btn = await reply.awaitMessageComponent({
    componentType: ComponentType.Button,
    filter: i => i.user.id === userId,
    time: 30_000
  }).catch(() => null);

  if (!btn) { await interaction.editReply({ components: [] }); return; }
  await btn.deferUpdate();

  if (btn.customId === `craft_back2_${userId}`) {
    await showRecipePicker(interaction, userId, guildId, category);
    return;
  }

  // Execute craft
  const freshPlayer = getPlayer(userId, guildId)!;
  const craftResult = attemptCraft(userId, guildId, recipe, freshPlayer.gold);

  if (!craftResult) {
    await interaction.editReply({ embeds: [new EmbedBuilder().setColor(COLORS.danger).setDescription('❌ Craft thất bại — nguyên liệu không đủ!')], components: [] });
    return;
  }

  if (craftResult.success) {
    let desc = `${resultIcon} **${resultName}** ×${recipe.resultAmount} đã được tạo ra!\n\n` +
      `🪙 −**${craftResult.lostGold}** Gold  ·  ⚒️ +**${recipe.craftingExp}** Crafting EXP`;
    if (craftResult.leveledUp) desc += `\n\n🎉 **Crafting Level Up!** → Lv.**${craftResult.newCraftLevel}**`;

    await interaction.editReply({
      embeds: [
        new EmbedBuilder().setColor(COLORS.gold)
          .setTitle('✅ Craft Thành Công!')
          .setDescription(desc)
      ],
      components: []
    });
  } else {
    const lostMatLines = craftResult.lostMaterials
      .filter(m => m.lost > 0)
      .map(m => `${getItemIcon(m.itemId)} ${getItemName(m.itemId)} ×${m.lost}`)
      .join(', ');

    await interaction.editReply({
      embeds: [
        new EmbedBuilder().setColor(COLORS.danger)
          .setTitle('❌ Craft Thất Bại...')
          .setDescription(
            `**${finalRate}%** nhưng bạn không may mắn lần này.\n\n` +
            `💸 Mất **${craftResult.lostGold}** Gold\n` +
            `📦 Mất 40% nguyên liệu: ${lostMatLines}\n` +
            `📜 Recipe được **giữ lại**.\n\n` +
            `⚒️ +**${recipe.craftingExp}** Crafting EXP`
          )
      ],
      components: []
    });
  }
}

// Text-prefix aliases (auto-loaded by registry.ts)
export const aliases = ['c','make'];
