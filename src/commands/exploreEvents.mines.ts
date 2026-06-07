import type { RunExploreEventInput } from './exploreEvents';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  Message
} from 'discord.js';
import { addItem, adjustReputation, getPlayer, grantExp, grantGold, updatePlayerHpMp } from '../systems/player';
import { COLORS, simpleEmbed } from '../utils/embeds';
import { pick, randInt } from '../utils/format';
import { onlyUser } from '../utils/collectors';

async function finish(ctx: RunExploreEventInput, embed: EmbedBuilder): Promise<void> {
  const msg = await ctx.interaction.editReply({
    embeds: [embed],
    components: ctx.callbacks.buildContinueExploreRow(ctx.userId)
  });
  await ctx.callbacks.attachContinueExploreHandler(msg as Message<boolean>, ctx.interaction, ctx.userId, ctx.guildId);
}

// ════════════════════════════════════════════════════════════════
//  MINES — Sập Hầm Mỏ
// ════════════════════════════════════════════════════════════════
export async function showMineCollapse(ctx: RunExploreEventInput): Promise<void> {
  const player = getPlayer(ctx.userId, ctx.guildId)!;
  const hpSafe = player.hp > Math.floor(player.max_hp * 0.25);

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`mc_rush_${ctx.userId}`)
      .setLabel('Lao vào lấy đồ')
      .setEmoji('💨')
      .setStyle(ButtonStyle.Danger)
      .setDisabled(!hpSafe),
    new ButtonBuilder().setCustomId(`mc_rescue_${ctx.userId}`).setLabel('Cứu thợ mỏ').setEmoji('🤝').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`mc_retreat_${ctx.userId}`).setLabel('Rút lui an toàn').setStyle(ButtonStyle.Secondary),
  );

  const embed = new EmbedBuilder()
    .setColor(0x8B4513)
    .setTitle('⛏️ Sập Hầm Mỏ')
    .setDescription(
      'Tiếng *RẦM* vang lên từ hầm phía trước — cột đỡ gãy, đất đá đổ ầm ầm.\n' +
      'Bụi mù bay trắng xóa. Giữa đống đổ nát, bạn nghe tiếng ai đó la hét kẹt bên trong.\n' +
      'Và... phía góc khuất, một hòm đồ cũ đang bị vùi lấp dần.\n\n' +
      (hpSafe ? '' : '*⚠️ HP quá thấp để lao vào!*')
    );

  const reply = await ctx.interaction.editReply({ embeds: [embed], components: [row] });
  const btn = await reply.awaitMessageComponent({ filter: onlyUser(ctx.userId), time: 30_000 }).catch(() => null);
  if (!btn || !btn.isButton()) return finish(ctx, simpleEmbed(COLORS.info, '⛏️ *Bạn do dự quá lâu — hầm sập hoàn toàn. Bạn rút lui.*'));
  await btn.deferUpdate().catch(() => {});

  const id = btn.customId;

  if (id === `mc_retreat_${ctx.userId}`) {
    return finish(ctx, simpleEmbed(COLORS.info,
      '⛏️ *Bạn lùi lại trước khi đất đá lấp hết lối vào.*\n\nKhông có gì — nhưng bạn còn sống.'
    ));
  }

  if (id === `mc_rescue_${ctx.userId}`) {
    const minerRewards = [
      { item: 'iron_ore', qty: 3, desc: '🪨 +**3× Iron Ore** (thợ mỏ cảm ơn)' },
      { item: 'copper_ore', qty: 2, desc: '🟤 +**2× Copper Ore** (thợ mỏ cảm ơn)' },
      { item: 'health_potion', qty: 1, desc: '🧪 +**1× Health Potion** (thợ mỏ chia sẻ)' },
    ];
    const reward = pick(minerRewards);
    addItem(ctx.userId, ctx.guildId, reward.item, reward.qty);
    const exp = randInt(20, 45);
    grantExp(ctx.userId, ctx.guildId, exp);
    const rep = adjustReputation(ctx.userId, ctx.guildId, 5);
    return finish(ctx, new EmbedBuilder()
      .setColor(COLORS.success)
      .setTitle('⛏️ Thợ Mỏ Được Cứu')
      .setDescription(
        'Bạn kéo người thợ mỏ ra khỏi đống đổ nát. Anh ta thở dốc, tay run rẩy.\n' +
        '*"Cảm ơn... tôi tưởng chết rồi..."*\n\n' +
        `${reward.desc}\n⭐ +**${exp} EXP**\n🤝 Reputation: **${rep}** (+5)`
      )
    );
  }

  // Lao vào lấy đồ
  const dmg = Math.max(1, Math.floor(player.max_hp * randInt(15, 25) / 100));
  const newHp = Math.max(1, player.hp - dmg);
  updatePlayerHpMp(ctx.userId, ctx.guildId, newHp, player.mp);

  const lootTable = [
    { type: 'gold', amount: randInt(60, 130) },
    { type: 'item', itemId: 'iron_ore', qty: randInt(2, 4) },
    { type: 'item', itemId: 'mysterious_shard', qty: 1 },
    { type: 'gold_and_item', amount: randInt(30, 60), itemId: 'copper_ore', qty: 2 },
  ];
  const loot = pick(lootTable);

  let lootDesc = '';
  if (loot.type === 'gold') {
    grantGold(ctx.userId, ctx.guildId, loot.amount!);
    lootDesc = `🪙 +**${loot.amount} Gold**`;
  } else if (loot.type === 'item') {
    addItem(ctx.userId, ctx.guildId, loot.itemId!, loot.qty!);
    lootDesc = `🎁 +**${loot.qty}× ${loot.itemId}**`;
  } else {
    grantGold(ctx.userId, ctx.guildId, loot.amount!);
    addItem(ctx.userId, ctx.guildId, loot.itemId!, loot.qty!);
    lootDesc = `🪙 +**${loot.amount} Gold**\n🎁 +**${loot.qty}× ${loot.itemId}**`;
  }

  return finish(ctx, new EmbedBuilder()
    .setColor(COLORS.warning)
    .setTitle('⛏️ Lao Vào Giữa Bụi Đá')
    .setDescription(
      'Bạn nhào vào trước khi đất đá lấp hết. Đá rơi trúng vai, bụi lấp vào mắt.\n' +
      'Nhưng hòm đồ đã nằm trong tay bạn.\n\n' +
      `❤️ HP mất **${dmg}** (${newHp}/${player.max_hp})\n${lootDesc}`
    )
  );
}
