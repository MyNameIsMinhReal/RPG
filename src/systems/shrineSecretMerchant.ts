import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChatInputCommandInteraction, EmbedBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ComponentType } from 'discord.js';
import { addItem, getPlayer, spendGold } from './player';
import { getFlag, deleteFlag } from './world';
import { getItem } from '../data/items';
import { COLORS } from '../utils/embeds';
import { onlyUser } from '../utils/collectors';
import { getCorruptionLevel } from './corruption';
import { buildContinueExploreRow, attachContinueExploreHandler } from './explore/shared';

const STOCK = ['scroll_mirror', 'moonwater', 'purifying_salt', 'warding_charm', 'ancient_book', 'mirror_ring_fragment'];
const CURSED_STOCK = ['chaos_flask', 'blood_sacrifice_vial', 'rage_elixir'];

export function canSeeShrineSecretMerchant(userId: string, guildId: string): boolean {
  return getFlag(guildId, `shrine_secret_merchant_${userId}`) !== null || getCorruptionLevel(userId, guildId) <= 12;
}

function priceFor(base: number, corruption: number): number {
  const mod = corruption <= 12 ? 0.82 : corruption >= 50 ? 1.30 : 1.0;
  return Math.max(1, Math.floor(base * mod));
}

export async function showShrineSecretMerchant(interaction: ChatInputCommandInteraction, userId: string, guildId: string): Promise<void> {
  const player = getPlayer(userId, guildId)!;
  const corruption = getCorruptionLevel(userId, guildId);
  if (player.zone_id !== 'shrine' || !canSeeShrineSecretMerchant(userId, guildId)) {
    const reply = await interaction.editReply({ embeds: [new EmbedBuilder().setColor(COLORS.warning).setDescription('🕯️ Không thấy dấu nến thương nhân nào trong Đền Cổ lúc này.')], components: buildContinueExploreRow(userId) });
    attachContinueExploreHandler(reply as any, interaction, userId, guildId);
    return;
  }

  const stock = [...STOCK, ...(corruption >= 45 ? CURSED_STOCK : [])]
    .map(id => getItem(id))
    .filter((it): it is NonNullable<ReturnType<typeof getItem>> => !!it?.buyPrice);
  const lines = stock.map(it => `${it.icon} **${it.name}** — **${priceFor(it.buyPrice!, corruption)}** 🪙`).join('\n');
  const embed = new EmbedBuilder()
    .setColor(0xF59E0B)
    .setTitle('🕯️ Người Bán Hàng Dưới Ánh Nến')
    .setDescription(
      '*Một chiếc bóng đội mũ rộng vành ngồi sau quầy nến. Hắn không hỏi tên bạn — chỉ đẩy khay hàng ra trước.*\n\n' +
      (corruption <= 12 ? '🧂 Corruption thấp: giá được giảm nhẹ.\n' : corruption >= 45 ? '🌘 Corruption cao: có thêm hàng cursed, nhưng giá đắt hơn.\n' : '') +
      `\n${lines}\n\n🪙 Vàng: **${player.gold}**`
    );
  const menu = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    new StringSelectMenuBuilder().setCustomId(`shrine_secret_buy_${userId}`).setPlaceholder('Chọn món muốn mua...')
      .addOptions(stock.slice(0, 25).map(it => new StringSelectMenuOptionBuilder()
        .setLabel(`${it.name} — ${priceFor(it.buyPrice!, corruption)} 🪙`)
        .setValue(it.id)
        .setEmoji(it.icon)
        .setDescription(it.description.replace(/\*\*/g, '').slice(0, 90))))
  );
  const back = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`shrine_secret_leave_${userId}`).setLabel('Rời quầy nến').setEmoji('🚶').setStyle(ButtonStyle.Secondary)
  );
  const reply = await interaction.editReply({ embeds: [embed], components: [menu, back] });
  const picked = await reply.awaitMessageComponent({ filter: onlyUser(userId), time: 60_000 }).catch(() => null);
  if (!picked) { await interaction.editReply({ components: [] }).catch(() => {}); return; }
  await picked.deferUpdate().catch(() => {});
  if (picked.customId === `shrine_secret_leave_${userId}`) {
    deleteFlag(guildId, `shrine_secret_merchant_${userId}`);
    const r = await interaction.editReply({ embeds: [new EmbedBuilder().setColor(COLORS.info).setDescription('🕯️ Quầy nến khép lại sau lưng bạn.')], components: buildContinueExploreRow(userId) });
    attachContinueExploreHandler(r as any, interaction, userId, guildId);
    return;
  }
  if (picked.isStringSelectMenu() && picked.customId === `shrine_secret_buy_${userId}`) {
    const itemId = picked.values[0];
    const item = getItem(itemId);
    const price = item?.buyPrice ? priceFor(item.buyPrice, corruption) : 0;
    const fresh = getPlayer(userId, guildId)!;
    if (!item || fresh.gold < price) {
      const r = await interaction.editReply({ embeds: [new EmbedBuilder().setColor(COLORS.warning).setDescription(`🕯️ Bạn không đủ vàng để mua món này.`)], components: buildContinueExploreRow(userId) });
      attachContinueExploreHandler(r as any, interaction, userId, guildId);
      return;
    }
    spendGold(userId, guildId, price);
    addItem(userId, guildId, item.id, 1);
    const r = await interaction.editReply({ embeds: [new EmbedBuilder().setColor(COLORS.success).setDescription(`🕯️ Bạn mua **${item.icon} ${item.name}** với **${price} 🪙**. Người bán hàng biến mất vào khói nến.`)], components: buildContinueExploreRow(userId) });
    attachContinueExploreHandler(r as any, interaction, userId, guildId);
  }
}
