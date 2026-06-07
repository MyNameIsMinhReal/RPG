import type { RunExploreEventInput } from './exploreEvents';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  Message
} from 'discord.js';
import { addItem, getPlayer, grantGold, updatePlayerHpMp } from '../systems/player';
import { setBuff } from '../systems/consumables';
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
//  WASTES — Bão Tro Lửa
// ════════════════════════════════════════════════════════════════
export async function showWastesAshStorm(ctx: RunExploreEventInput): Promise<void> {
  const player = getPlayer(ctx.userId, ctx.guildId)!;

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`ws_charge_${ctx.userId}`).setLabel('Lao thẳng vào').setEmoji('⚡').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`ws_shelter_${ctx.userId}`).setLabel('Tìm nơi ẩn náu').setEmoji('🪨').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`ws_endure_${ctx.userId}`).setLabel('Chống chịu bằng ý chí').setEmoji('💪').setStyle(ButtonStyle.Secondary),
  );

  const embed = new EmbedBuilder()
    .setColor(0x8B0000)
    .setTitle('🌪️ Bão Tro Lửa')
    .setDescription(
      'Một cơn bão tro đỏ lựng ập đến từ phía chân trời — nhanh hơn bạn tưởng.\n' +
      'Không khí đặc quánh, mắt rát như lửa đốt, mỗi nhịp thở đều bỏng rát lồng ngực.\n\n' +
      '**Bạn cần quyết định ngay:**\n' +
      '⚡ Lao vào để tìm thứ gì đó ẩn trong bão\n' +
      '🪨 Tìm nơi trú ẩn chờ bão qua\n' +
      '💪 Đứng im chịu đựng — rèn luyện ý chí'
    );

  const reply = await ctx.interaction.editReply({ embeds: [embed], components: [row] });
  const btn = await reply.awaitMessageComponent({ filter: onlyUser(ctx.userId), time: 30_000 }).catch(() => null);
  if (!btn || !btn.isButton()) {
    // Timeout — mặc định bị bão quét
    const dmg = Math.max(1, Math.floor(player.max_hp * 0.10));
    const newHp = Math.max(1, player.hp - dmg);
    updatePlayerHpMp(ctx.userId, ctx.guildId, newHp, player.mp);
    return finish(ctx, simpleEmbed(COLORS.danger,
      `🌪️ *Bạn đứng ngẩn nhìn bão ập đến.*\n\nBị bão cuốn: ❤️ mất **${dmg}** HP.`
    ));
  }
  await btn.deferUpdate().catch(() => {});

  const id = btn.customId;

  if (id === `ws_shelter_${ctx.userId}`) {
    // An toàn — tìm loot nhỏ trong hang đá
    const shelterLoot = [
      { fn: () => { const g = randInt(25, 55); grantGold(ctx.userId, ctx.guildId, g); return `🪙 +**${g} Gold** (từ xương của kẻ không qua được bão trước)`; } },
      { fn: () => { addItem(ctx.userId, ctx.guildId, 'mysterious_shard', 1); return `💎 +**1× Mysterious Shard** (tìm thấy trong vách đá)` } },
      { fn: () => { addItem(ctx.userId, ctx.guildId, 'herb', 2); return `🌿 +**2× Herb** (mọc trong hốc đá)` } },
    ];
    const loot = pick(shelterLoot);
    const desc = loot.fn();
    return finish(ctx, new EmbedBuilder()
      .setColor(COLORS.info)
      .setTitle('🪨 Ẩn Náu Trong Hang Đá')
      .setDescription(
        'Bạn tìm được một hốc đá nhỏ và nép vào đó. Bão tro gào thét bên ngoài.\n' +
        'Sau vài phút, cơn bão đi qua. Bạn thở phào... và nhìn thấy:\n\n' + desc
      )
    );
  }

  if (id === `ws_endure_${ctx.userId}`) {
    // Chống chịu — nhận ATK buff cho combat tiếp theo
    const dmg = Math.max(1, Math.floor(player.max_hp * 0.06));
    const newHp = Math.max(1, player.hp - dmg);
    updatePlayerHpMp(ctx.userId, ctx.guildId, newHp, player.mp);
    setBuff(ctx.userId, ctx.guildId, 'weapon_oil', 10, 1, 3600);
    return finish(ctx, new EmbedBuilder()
      .setColor(COLORS.warning)
      .setTitle('💪 Ý Chí Sắt Đá')
      .setDescription(
        'Bạn nhắm mắt, cúi thấp người, để bão cuốn qua mà không nhúc nhích.\n' +
        'Khi bão tan, bạn vẫn đứng nguyên — thân thể đau nhức nhưng tinh thần rực lửa.\n\n' +
        `❤️ HP mất **${dmg}** (${newHp}/${player.max_hp})\n` +
        `⚔️ **ATK +10%** trận combat kế tiếp *(ý chí sau bão)*`
      )
    );
  }

  // Lao thẳng vào bão — HP damage cao nhưng loot tốt
  const dmgPct = randInt(18, 28);
  const dmg = Math.max(1, Math.floor(player.max_hp * dmgPct / 100));
  const newHp = Math.max(1, player.hp - dmg);
  updatePlayerHpMp(ctx.userId, ctx.guildId, newHp, player.mp);

  const chargeLoot = [
    { fn: () => { const g = randInt(80, 160); grantGold(ctx.userId, ctx.guildId, g); return `🪙 +**${g} Gold** (từ đống tàn tích bị bão vùi lấp)`; } },
    { fn: () => { addItem(ctx.userId, ctx.guildId, 'mysterious_shard', 2); return `💎 +**2× Mysterious Shard**`; } },
    { fn: () => { const g = randInt(40, 80); grantGold(ctx.userId, ctx.guildId, g); addItem(ctx.userId, ctx.guildId, 'ash_crystal', 1); return `🪙 +**${g} Gold**\n🔴 +**1× Ash Crystal** *(vật liệu hiếm từ bão)*`; } },
  ];
  const loot = pick(chargeLoot);
  const desc = loot.fn();

  return finish(ctx, new EmbedBuilder()
    .setColor(COLORS.danger)
    .setTitle('⚡ Lao Vào Lửa Và Tro')
    .setDescription(
      'Bạn lao thẳng vào tâm bão. Tro nóng xé da thịt, gió quật ngã bạn vài lần.\n' +
      'Nhưng giữa tro tàn, bạn tìm thấy thứ bão đã mang đến:\n\n' +
      `❤️ HP mất **${dmg}** (${newHp}/${player.max_hp})\n` +
      desc
    )
  );
}
