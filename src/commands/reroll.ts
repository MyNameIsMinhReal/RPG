import {
  SlashCommandBuilder, ChatInputCommandInteraction,
  EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder, ComponentType, StringSelectMenuInteraction
} from 'discord.js';
import { getPlayer, getInventory, removeItem, addItem } from '../systems/player';
import { grantSoulShards } from '../systems/player';
import { COLORS } from '../utils/embeds';
import { getItem, ITEMS } from '../data/items';
import { pick } from '../utils/format';

const REROLL_COST = 2; // Soul Shards

// ── Tiered book pools ──────────────────────────────────────────────────────
export const BOOK_TIERS: Record<string, string[]> = {
  active: [
    'book_fireball','book_ice_lance','book_shield_bash',
    'book_shadow_step','book_mend_wounds','book_thunder_clap'
  ],
  passive: [
    'book_iron_skin','book_berserker','book_mana_flow',
    'book_vampiric','book_tough_body'
  ],
  reaction: ['book_counter','book_last_stand'],
  world:    ['book_mark_zone','book_soul_offering'],
  soul:     ['book_soul_strike','book_soul_guard','book_soul_drain'],
};

export function getBookTier(bookId: string): string | null {
  for (const [tier, books] of Object.entries(BOOK_TIERS)) {
    if (books.includes(bookId)) return tier;
  }
  return null;
}

export function pickDifferentBook(tier: string, current: string): string {
  const pool = BOOK_TIERS[tier].filter(b => b !== current);
  if (!pool.length) return current;
  return pick(pool);
}

// ── Command ────────────────────────────────────────────────────────────────
export const data = new SlashCommandBuilder()
  .setName('reroll')
  .setDescription(`Đổi 1 Skill Book thành book ngẫu nhiên cùng tier (tốn ${REROLL_COST} 💀 Soul Shard)`);

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const { id: userId } = interaction.user;
  const guildId = interaction.guildId!;
  const player = getPlayer(userId, guildId);
  if (!player || !player.alive) {
    await interaction.editReply('Nhân vật không tồn tại hoặc đã chết!');
    return;
  }

  if (player.soul_shards < REROLL_COST) {
    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(COLORS.warning)
          .setTitle('❌ Không đủ Soul Shards')
          .setDescription(
            `Reroll tốn **${REROLL_COST} 💀 Soul Shards**.\n` +
            `Bạn hiện có: **${player.soul_shards}** 💀`
          )
      ]
    });
    return;
  }

  // Find skill books in inventory
  const inventory = getInventory(userId, guildId);
  const books = inventory
    .filter(e => {
      const item = getItem(e.item_id);
      return item?.type === 'skill_book';
    })
    .map(e => {
      const item = getItem(e.item_id)!;
      const tier = getBookTier(e.item_id);
      return { entry: e, item, tier };
    })
    .filter(b => b.tier !== null);

  if (!books.length) {
    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(COLORS.info)
          .setDescription('Không có Skill Book nào trong túi có thể reroll!')
      ]
    });
    return;
  }

  // Build select menu
  const options = books.map(({ entry, item, tier }) =>
    new StringSelectMenuOptionBuilder()
      .setLabel(`${item.name} [${tier}]`)
      .setDescription(`Reroll thành book ${tier} khác`)
      .setValue(entry.item_id)
      .setEmoji(item.icon)
  );

  const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`reroll_select_${userId}`)
      .setPlaceholder('Chọn Skill Book muốn reroll...')
      .addOptions(options.slice(0, 25))
  );

  const embed = new EmbedBuilder()
    .setColor(COLORS.magic)
    .setTitle('🎲 Reroll Skill Book')
    .setDescription(
      `Chọn 1 Skill Book để reroll thành book **ngẫu nhiên cùng tier**.\n\n` +
      `💀 Soul Shards hiện có: **${player.soul_shards}**\n` +
      `💸 Chi phí: **${REROLL_COST} 💀 Soul Shards**\n\n` +
      `*Tier active/passive/reaction/world/soul giữ nguyên. Book mới hoàn toàn ngẫu nhiên (có thể ra book đã biết).*`
    );

  const reply = await interaction.editReply({ embeds: [embed], components: [row] });

  const sel = await reply.awaitMessageComponent({
    componentType: ComponentType.StringSelect,
    filter: i => i.user.id === userId,
    time: 30_000
  }).catch(() => null);

  if (!sel) { await interaction.editReply({ components: [] }); return; }
  await sel.deferUpdate();

  const bookId  = sel.values[0];
  const bookDef = getItem(bookId)!;
  const tier    = getBookTier(bookId)!;

  // Final confirm with Soul Shard check
  const freshPlayer = getPlayer(userId, guildId)!;
  if (freshPlayer.soul_shards < REROLL_COST) {
    await interaction.editReply({ embeds: [new EmbedBuilder().setColor(COLORS.warning).setDescription('Không đủ Soul Shards!')], components: [] });
    return;
  }

  // Execute reroll
  removeItem(userId, guildId, bookId, 1);
  grantSoulShards(userId, guildId, -REROLL_COST);

  const newBookId  = pickDifferentBook(tier, bookId);
  addItem(userId, guildId, newBookId, 1);
  const newBookDef = getItem(newBookId)!;

  await interaction.editReply({
    embeds: [
      new EmbedBuilder()
        .setColor(COLORS.magic)
        .setTitle('🎲 Reroll Thành Công!')
        .setDescription(
          `**Trước:** ${bookDef.icon} ${bookDef.name}\n` +
          `**Sau:**   ${newBookDef.icon} **${newBookDef.name}**\n\n` +
          `💀 Soul Shards còn lại: **${freshPlayer.soul_shards - REROLL_COST}**`
        )
    ],
    components: []
  });
}
