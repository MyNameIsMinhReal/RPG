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

// ── Local finish helper (mirrors the one in exploreEvents.ts) ────────────
async function finish(ctx: RunExploreEventInput, embed: EmbedBuilder): Promise<void> {
  const msg = await ctx.interaction.editReply({
    embeds: [embed],
    components: ctx.callbacks.buildContinueExploreRow(ctx.userId)
  });
  await ctx.callbacks.attachContinueExploreHandler(msg as Message<boolean>, ctx.interaction, ctx.userId, ctx.guildId);
}

// ════════════════════════════════════════════════════════════════
//  FOREST — Cây Cổ Thì Thầm
// ════════════════════════════════════════════════════════════════
export async function showForestWhisperingTree(ctx: RunExploreEventInput): Promise<void> {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`ft_listen_${ctx.userId}`).setLabel('Lắng nghe').setEmoji('👂').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`ft_carve_${ctx.userId}`).setLabel('Khắc tên lên cây').setEmoji('🗡️').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`ft_leave_${ctx.userId}`).setLabel('Bỏ qua').setStyle(ButtonStyle.Secondary),
  );

  const embed = new EmbedBuilder()
    .setColor(0x228B22)
    .setTitle('🌳 Cây Cổ Thì Thầm')
    .setDescription(
      'Một cây cổ thụ khổng lồ sừng sững giữa rừng, tán lá che kín một vùng trời.\n' +
      'Tiếng lá xào xạc... *không phải do gió.* Hình như cái cây đang nói gì đó với bạn.'
    );

  const reply = await ctx.interaction.editReply({ embeds: [embed], components: [row] });
  const btn = await reply.awaitMessageComponent({ filter: onlyUser(ctx.userId), time: 30_000 }).catch(() => null);
  if (!btn || !btn.isButton()) return finish(ctx, simpleEmbed(COLORS.info, '🌳 *Cây cổ thụ đứng yên lặng. Bạn tiếp tục hành trình.*'));
  await btn.deferUpdate().catch(() => {});

  const id = btn.customId;

  if (id === `ft_leave_${ctx.userId}`) {
    return finish(ctx, simpleEmbed(COLORS.info, '🌳 *Bạn bước đi, tiếng thì thầm dần tắt phía sau.*'));
  }

  if (id === `ft_listen_${ctx.userId}`) {
    const outcomes = [
      () => {
        const exp = randInt(15, 35);
        grantExp(ctx.userId, ctx.guildId, exp);
        return simpleEmbed(COLORS.success,
          '🌳 **Giọng cây cổ thụ:**\n*"Kẻ lang thang... hãy nhớ lấy con đường mình đi."*\n\n' +
          `⭐ Bạn cảm thấy sáng suốt hơn. +**${exp} EXP**`
        );
      },
      () => {
        const gold = randInt(10, 30);
        grantGold(ctx.userId, ctx.guildId, gold);
        return simpleEmbed(COLORS.success,
          '🌳 *Một cành cây khẽ chỉ xuống gốc rễ — có vật gì chôn vùi ở đó.*\n\n' +
          `🪙 Bạn tìm thấy **${gold} Gold** giấu trong hốc cây.`
        );
      },
      () => {
        addItem(ctx.userId, ctx.guildId, 'herb', 2);
        return simpleEmbed(COLORS.success,
          '🌳 *Cây rung nhẹ. Lá thuốc rơi xuống như mưa.*\n\n🌿 +**2× Herb**');
      },
      () => {
        return simpleEmbed(COLORS.info,
          '🌳 *Bạn nghe thấy... ký ức của ai đó. Một người đã đi qua đây từ lâu lắm rồi.*\n\n' +
          '📖 Không có gì thực chất — chỉ là một cảm giác kỳ lạ về sự liên tục.'
        );
      },
    ];
    return finish(ctx, pick(outcomes)());
  }

  // Khắc tên lên cây
  const player = getPlayer(ctx.userId, ctx.guildId)!;
  const dmg = Math.max(1, Math.floor(player.max_hp * 0.05));
  const newHp = Math.max(1, player.hp - dmg);
  updatePlayerHpMp(ctx.userId, ctx.guildId, newHp, player.mp);
  const rep = adjustReputation(ctx.userId, ctx.guildId, 1);
  return finish(ctx, new EmbedBuilder()
    .setColor(COLORS.warning)
    .setTitle('🌳 Khắc Tên Lên Cây')
    .setDescription(
      `Bạn dùng dao khắc tên mình lên vỏ cây. Nhựa cây chảy ra ướt tay.\n\n` +
      `❤️ HP mất **${dmg}** (${newHp}/${player.max_hp})\n` +
      `🤝 Reputation: **${rep}** (+1) — *rừng ghi nhớ kẻ đã để lại dấu vết.*`
    )
  );
}

// ════════════════════════════════════════════════════════════════
//  FOREST — Hang Sói, Nhà Thảo Dược, Khoảng Rừng Trăng
// ════════════════════════════════════════════════════════════════
export async function showForestWolfDen(ctx: RunExploreEventInput): Promise<void> {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`fw_rescue_${ctx.userId}`).setLabel('Cứu sói con').setEmoji('🐺').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`fw_take_${ctx.userId}`).setLabel('Lục hang').setEmoji('🎒').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`fw_fight_${ctx.userId}`).setLabel('Đối đầu sói mẹ').setEmoji('⚔️').setStyle(ButtonStyle.Danger),
  );

  const embed = new EmbedBuilder()
    .setColor(0x2E8B57)
    .setTitle('🐺 Hang Sói Bị Bỏ Quên')
    .setDescription(
      'Bạn tìm thấy một hang nhỏ dưới rễ cây mục. Bên trong có tiếng rên yếu ớt của sói con, còn ngoài xa là tiếng gầm cảnh cáo.\n\n' +
      '*Cứu nó, lục hang, hay chuẩn bị chiến đấu?*'
    );

  const reply = await ctx.interaction.editReply({ embeds: [embed], components: [row] });
  const btn = await reply.awaitMessageComponent({ filter: onlyUser(ctx.userId), time: 30_000 }).catch(() => null);
  if (!btn || !btn.isButton()) return finish(ctx, simpleEmbed(COLORS.info, '🐺 *Bạn lùi khỏi hang trước khi sói mẹ quay lại.*'));
  await btn.deferUpdate().catch(() => {});

  if (btn.customId === `fw_rescue_${ctx.userId}`) {
    const exp = randInt(20, 45);
    const rep = adjustReputation(ctx.userId, ctx.guildId, 5);
    grantExp(ctx.userId, ctx.guildId, exp);
    addItem(ctx.userId, ctx.guildId, 'wolf_fang', 1);
    return finish(ctx, new EmbedBuilder()
      .setColor(COLORS.success)
      .setTitle('🐺 Sói Con Được Cứu')
      .setDescription(
        'Bạn tháo bẫy khỏi chân sói con. Nó khập khiễng bỏ đi, nhưng trước khi biến mất, để lại một chiếc nanh nhỏ.\n\n' +
        `🦷 +**1× Wolf Fang**\n⭐ +**${exp} EXP**\n🤝 Reputation: **${rep}** (+5)`
      )
    );
  }

  if (btn.customId === `fw_take_${ctx.userId}`) {
    const roll = randInt(1, 100);
    if (roll <= 55) {
      const gold = randInt(25, 60);
      grantGold(ctx.userId, ctx.guildId, gold);
      addItem(ctx.userId, ctx.guildId, 'leather', 1);
      return finish(ctx, simpleEmbed(COLORS.gold, `🎒 Bạn lục được một túi cũ trong hang.\n🪙 +**${gold} Gold**\n🟫 +**1× Leather**`));
    }
    await ctx.interaction.editReply({ embeds: [simpleEmbed(COLORS.danger, '🐺 Tiếng động làm sói mẹ lao về hang!\n\n*Chiến đấu bắt đầu...*')], components: [] });
    await new Promise(r => setTimeout(r, 600));
    return ctx.callbacks.startCombat(pick(ctx.enemies).id);
  }

  await ctx.interaction.editReply({ embeds: [simpleEmbed(COLORS.danger, '⚔️ Bạn đứng chắn trước cửa hang. Sói mẹ gầm lên và lao tới!')], components: [] });
  await new Promise(r => setTimeout(r, 600));
  return ctx.callbacks.startCombat(pick(ctx.enemies).id);
}

export async function showForestHerbalistHut(ctx: RunExploreEventInput): Promise<void> {
  const player = getPlayer(ctx.userId, ctx.guildId)!;
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`fh_brew_${ctx.userId}`).setLabel('Nhờ pha thuốc').setEmoji('🍵').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`fh_gather_${ctx.userId}`).setLabel('Hái thảo dược').setEmoji('🌿').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`fh_steal_${ctx.userId}`).setLabel('Lấy trộm túi thuốc').setEmoji('🥷').setStyle(ButtonStyle.Danger),
  );
  const embed = new EmbedBuilder()
    .setColor(0x3CB371)
    .setTitle('🌿 Lều Thảo Dược Giữa Rừng')
    .setDescription('Một căn lều phủ đầy dây leo nằm cạnh con suối. Mùi thuốc đắng và lá khô phảng phất trong không khí.');

  const reply = await ctx.interaction.editReply({ embeds: [embed], components: [row] });
  const btn = await reply.awaitMessageComponent({ filter: onlyUser(ctx.userId), time: 30_000 }).catch(() => null);
  if (!btn || !btn.isButton()) return finish(ctx, simpleEmbed(COLORS.info, '🌿 *Bạn đi qua căn lều mà không làm phiền ai.*'));
  await btn.deferUpdate().catch(() => {});

  if (btn.customId === `fh_brew_${ctx.userId}`) {
    const hp = Math.min(player.max_hp, player.hp + Math.floor(player.max_hp * 0.35));
    const mp = Math.min(player.max_mp, player.mp + Math.floor(player.max_mp * 0.25));
    updatePlayerHpMp(ctx.userId, ctx.guildId, hp, mp);
    return finish(ctx, new EmbedBuilder()
      .setColor(COLORS.success)
      .setTitle('🍵 Thuốc Rừng Ấm')
      .setDescription(`Người thảo dược đưa cho bạn một bát thuốc còn bốc khói. Vị đắng, nhưng cơ thể nhẹ đi rõ rệt.\n\n❤️ HP: **${hp}/${player.max_hp}**\n🔵 MP: **${mp}/${player.max_mp}**`)
    );
  }

  if (btn.customId === `fh_gather_${ctx.userId}`) {
    addItem(ctx.userId, ctx.guildId, 'herb', randInt(2, 4));
    if (randInt(1, 100) <= 35) addItem(ctx.userId, ctx.guildId, 'rare_herb', 1);
    return finish(ctx, simpleEmbed(COLORS.success, '🌿 Bạn cẩn thận hái những lá thuốc quanh lều.\n🎁 +**2–4× Forest Herb**\n🌺 Có thể nhận thêm **Rare Herb** nếu may mắn.'));
  }

  const dmg = Math.max(1, Math.floor(player.max_hp * 0.08));
  const hp = Math.max(1, player.hp - dmg);
  updatePlayerHpMp(ctx.userId, ctx.guildId, hp, player.mp);
  const rep = adjustReputation(ctx.userId, ctx.guildId, -6);
  addItem(ctx.userId, ctx.guildId, 'health_potion', 1);
  return finish(ctx, new EmbedBuilder()
    .setColor(COLORS.warning)
    .setTitle('🥷 Túi Thuốc Có Gai')
    .setDescription(`Bạn giật lấy túi thuốc, nhưng gai độc trong quai túi cứa vào tay.\n\n🧪 +**1× Health Potion**\n❤️ HP mất **${dmg}** (${hp}/${player.max_hp})\n🤝 Reputation: **${rep}** (-6)`)
  );
}

export async function showForestMoonlitClearing(ctx: RunExploreEventInput): Promise<void> {
  const player = getPlayer(ctx.userId, ctx.guildId)!;
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`fm_rest_${ctx.userId}`).setLabel('Nghỉ dưới ánh trăng').setEmoji('🌙').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`fm_pick_${ctx.userId}`).setLabel('Hái hoa phát sáng').setEmoji('🌺').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`fm_trace_${ctx.userId}`).setLabel('Lần theo vệt sáng').setEmoji('✨').setStyle(ButtonStyle.Secondary),
  );
  const embed = new EmbedBuilder()
    .setColor(0x66CCAA)
    .setTitle('🌙 Khoảng Rừng Ánh Trăng')
    .setDescription('Giữa tán cây rậm rạp, một khoảng đất trống ngập ánh sáng xanh bạc. Cỏ mềm, không khí yên tĩnh như đang ngủ.');
  const reply = await ctx.interaction.editReply({ embeds: [embed], components: [row] });
  const btn = await reply.awaitMessageComponent({ filter: onlyUser(ctx.userId), time: 30_000 }).catch(() => null);
  if (!btn || !btn.isButton()) return finish(ctx, simpleEmbed(COLORS.info, '🌙 *Ánh trăng khép lại sau lưng khi bạn rời đi.*'));
  await btn.deferUpdate().catch(() => {});

  if (btn.customId === `fm_rest_${ctx.userId}`) {
    const hp = Math.min(player.max_hp, player.hp + Math.floor(player.max_hp * 0.45));
    updatePlayerHpMp(ctx.userId, ctx.guildId, hp, player.mp);
    return finish(ctx, simpleEmbed(COLORS.success, `🌙 Bạn ngồi xuống nghỉ. Vết thương khép lại trong làn sáng dịu.\n❤️ HP: **${hp}/${player.max_hp}**`));
  }
  if (btn.customId === `fm_pick_${ctx.userId}`) {
    const dmg = Math.max(1, Math.floor(player.max_hp * 0.05));
    const hp = Math.max(1, player.hp - dmg);
    updatePlayerHpMp(ctx.userId, ctx.guildId, hp, player.mp);
    addItem(ctx.userId, ctx.guildId, 'rare_herb', 1);
    return finish(ctx, simpleEmbed(COLORS.warning, `🌺 Bông hoa phát sáng cắt vào đầu ngón tay như lưỡi dao mỏng.\n🌺 +**1× Rare Herb**\n❤️ HP mất **${dmg}**`));
  }
  const exp = randInt(25, 55);
  grantExp(ctx.userId, ctx.guildId, exp);
  if (randInt(1, 100) <= 35) addItem(ctx.userId, ctx.guildId, 'mysterious_shard', 1);
  return finish(ctx, simpleEmbed(COLORS.magic, `✨ Bạn lần theo vệt sáng tới một dấu tích cổ bị rêu phủ.\n⭐ +**${exp} EXP**\n💎 Có thể nhận thêm **Mysterious Shard**.`));
}
