import type { RunExploreEventInput } from './exploreEvents';
import { awaitVote } from './exploreEvents';
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
  const btn = await awaitVote(ctx, reply, 30_000);
  if (!btn || !btn.isButton()) return finish(ctx, simpleEmbed(COLORS.info, '🌳 *Cây cổ thụ đứng yên lặng. Bạn tiếp tục hành trình.*'));
  await btn.deferUpdate().catch(() => {});

  const id = btn.customId;

  if (id === `ft_leave_${ctx.userId}`) {
    return finish(ctx, simpleEmbed(COLORS.info, '🌳 *Bạn bước đi, tiếng thì thầm dần tắt phía sau.*'));
  }

  if (id === `ft_listen_${ctx.userId}`) {
    const outcomes = [
      () => {
        const exp = randInt(10, 25);
        grantExp(ctx.userId, ctx.guildId, exp);
        return simpleEmbed(COLORS.success,
          '🌳 **Giọng cây cổ thụ:**\n*"Kẻ lang thang... hãy nhớ lấy con đường mình đi."*\n\n' +
          `⭐ Bạn cảm thấy sáng suốt hơn. +**${exp} EXP**`
        );
      },
      () => {
        const gold = randInt(6, 18);
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
  const btn = await awaitVote(ctx, reply, 30_000);
  if (!btn || !btn.isButton()) return finish(ctx, simpleEmbed(COLORS.info, '🐺 *Bạn lùi khỏi hang trước khi sói mẹ quay lại.*'));
  await btn.deferUpdate().catch(() => {});

  if (btn.customId === `fw_rescue_${ctx.userId}`) {
    const exp = randInt(14, 32);
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
      const gold = randInt(15, 37);
      grantGold(ctx.userId, ctx.guildId, gold);
      addItem(ctx.userId, ctx.guildId, 'leather', 1);
      return finish(ctx, simpleEmbed(COLORS.gold, `🎒 Bạn lục được một túi cũ trong hang.\n🪙 +**${gold} Gold**\n🟫 +**1× Leather**`));
    }
    await ctx.interaction.editReply({ embeds: [simpleEmbed(COLORS.danger, '🐺 Tiếng động làm sói mẹ lao về hang!\n\n*Chiến đấu bắt đầu...*')], components: [] });
    await new Promise(r => setTimeout(r, 600));
    return ctx.callbacks.startCombat('cursed_wolf');
  }

  await ctx.interaction.editReply({ embeds: [simpleEmbed(COLORS.danger, '⚔️ Bạn đứng chắn trước cửa hang. Sói mẹ gầm lên và lao tới!')], components: [] });
  await new Promise(r => setTimeout(r, 600));
  return ctx.callbacks.startCombat('cursed_wolf');
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
  const btn = await awaitVote(ctx, reply, 30_000);
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
  const btn = await awaitVote(ctx, reply, 30_000);
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
  const exp = randInt(18, 39);
  grantExp(ctx.userId, ctx.guildId, exp);
  if (randInt(1, 100) <= 35) addItem(ctx.userId, ctx.guildId, 'mysterious_shard', 1);
  return finish(ctx, simpleEmbed(COLORS.magic, `✨ Bạn lần theo vệt sáng tới một dấu tích cổ bị rêu phủ.\n⭐ +**${exp} EXP**\n💎 Có thể nhận thêm **Mysterious Shard**.`));
}

// ════════════════════════════════════════════════════════════════
//  FOREST — COMBAT / DANGER  (10 events)
// ════════════════════════════════════════════════════════════════

export async function showForestBanditAmbush(ctx: RunExploreEventInput): Promise<void> {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`fba_fight_${ctx.userId}`).setLabel('Chiến đấu').setEmoji('⚔️').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`fba_talk_${ctx.userId}`).setLabel('Đàm phán').setEmoji('🗣️').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`fba_run_${ctx.userId}`).setLabel('Bỏ chạy').setEmoji('💨').setStyle(ButtonStyle.Secondary),
  );
  const embed = new EmbedBuilder().setColor(0x8B0000).setTitle('🗡️ Phục Kích Giữa Rừng')
    .setDescription('Ba tên cướp nhảy ra từ bụi rậm, chặn đường bạn.\n*"Nộp đồ nếu muốn sống!"* — tên cầm đầu hét lên.');
  const reply = await ctx.interaction.editReply({ embeds: [embed], components: [row] });
  const btn = await awaitVote(ctx, reply, 30_000);
  if (!btn || !btn.isButton()) return finish(ctx, simpleEmbed(COLORS.info, '🗡️ *Bọn cướp mất kiên nhẫn và bỏ đi.*'));
  await btn.deferUpdate().catch(() => {});
  const id = btn.customId;
  if (id === `fba_fight_${ctx.userId}`) {
    await ctx.interaction.editReply({ embeds: [simpleEmbed(COLORS.danger, '⚔️ Bạn rút vũ khí — chiến đấu bắt đầu!')], components: [] });
    await new Promise(r => setTimeout(r, 600));
    return ctx.callbacks.startCombat(pick(ctx.enemies).id);
  }
  if (id === `fba_talk_${ctx.userId}`) {
    const roll = randInt(1, 100);
    if (roll <= 50) {
      const gold = randInt(6, 15);
      grantGold(ctx.userId, ctx.guildId, gold);
      return finish(ctx, simpleEmbed(COLORS.success, `🗣️ Bạn thuyết phục được chúng — họ để bạn đi và chia sẻ một ít chiến lợi phẩm.\n🪙 +**${gold} Gold**`));
    }
    await ctx.interaction.editReply({ embeds: [simpleEmbed(COLORS.danger, '🗣️ Chúng không nghe — chúng lao vào tấn công!')], components: [] });
    await new Promise(r => setTimeout(r, 600));
    return ctx.callbacks.startCombat(pick(ctx.enemies).id);
  }
  const player = getPlayer(ctx.userId, ctx.guildId)!;
  const dmg = Math.max(1, Math.floor(player.max_hp * 0.1));
  updatePlayerHpMp(ctx.userId, ctx.guildId, Math.max(1, player.hp - dmg), player.mp);
  return finish(ctx, simpleEmbed(COLORS.warning, `💨 Bạn chạy thoát nhưng bị một mũi tên sượt qua.\n❤️ HP mất **${dmg}**`));
}

export async function showForestGiantSpider(ctx: RunExploreEventInput): Promise<void> {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`fgs_fight_${ctx.userId}`).setLabel('Chiến đấu').setEmoji('⚔️').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`fgs_fire_${ctx.userId}`).setLabel('Dùng lửa').setEmoji('🔥').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`fgs_run_${ctx.userId}`).setLabel('Bỏ chạy').setEmoji('💨').setStyle(ButtonStyle.Secondary),
  );
  const embed = new EmbedBuilder().setColor(0x4B0082).setTitle('🕷️ Nhện Rừng Khổng Lồ')
    .setDescription('Giữa mạng nhện chằng chịt, một con nhện to bằng con chó đang nhìn bạn bằng tám cặp mắt.\n*Nó bắt đầu tiến về phía bạn.*');
  const reply = await ctx.interaction.editReply({ embeds: [embed], components: [row] });
  const btn = await awaitVote(ctx, reply, 30_000);
  if (!btn || !btn.isButton()) return finish(ctx, simpleEmbed(COLORS.info, '🕷️ *Con nhện bò vào bóng tối.*'));
  await btn.deferUpdate().catch(() => {});
  const id = btn.customId;
  if (id === `fgs_fight_${ctx.userId}`) {
    await ctx.interaction.editReply({ embeds: [simpleEmbed(COLORS.danger, '⚔️ Bạn lao vào tiêu diệt con nhện!')], components: [] });
    await new Promise(r => setTimeout(r, 600));
    return ctx.callbacks.startCombat('spore_kin');
  }
  if (id === `fgs_fire_${ctx.userId}`) {
    const player = getPlayer(ctx.userId, ctx.guildId)!;
    const dmg = Math.max(1, Math.floor(player.max_hp * 0.06));
    updatePlayerHpMp(ctx.userId, ctx.guildId, Math.max(1, player.hp - dmg), player.mp);
    addItem(ctx.userId, ctx.guildId, 'spider_silk', 1);
    const exp = randInt(14, 28);
    grantExp(ctx.userId, ctx.guildId, exp);
    return finish(ctx, new EmbedBuilder().setColor(COLORS.success).setTitle('🔥 Lửa Đẩy Lùi Nhện')
      .setDescription(`Bạn đốt mạng nhện — con nhện tháo lui. Tuy nhiên lửa bắn vào tay bạn.\n🕸️ +**1× Spider Silk**\n⭐ +**${exp} EXP**\n❤️ HP mất **${dmg}**`));
  }
  const player = getPlayer(ctx.userId, ctx.guildId)!;
  const dmg = Math.max(1, Math.floor(player.max_hp * 0.08));
  updatePlayerHpMp(ctx.userId, ctx.guildId, Math.max(1, player.hp - dmg), player.mp);
  return finish(ctx, simpleEmbed(COLORS.warning, `💨 Bạn chạy nhưng bị vướng mạng nhện.\n❤️ HP mất **${dmg}**`));
}

export async function showForestCursedScarecrow(ctx: RunExploreEventInput): Promise<void> {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`fcs_destroy_${ctx.userId}`).setLabel('Phá bỏ').setEmoji('🔨').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`fcs_examine_${ctx.userId}`).setLabel('Nghiên cứu').setEmoji('🔍').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`fcs_pass_${ctx.userId}`).setLabel('Bỏ qua').setStyle(ButtonStyle.Secondary),
  );
  const embed = new EmbedBuilder().setColor(0x556B2F).setTitle('🎃 Bù Nhìn Nguyền Rủa')
    .setDescription('Một bù nhìn rơm mặc áo rách đứng giữa rừng. Không có ruộng nào gần đây cả.\n*Hai mắt nó — được làm bằng đá đen — đang nhìn theo bạn.*');
  const reply = await ctx.interaction.editReply({ embeds: [embed], components: [row] });
  const btn = await awaitVote(ctx, reply, 30_000);
  if (!btn || !btn.isButton()) return finish(ctx, simpleEmbed(COLORS.info, '🎃 *Bù nhìn đứng im. Bạn bước tiếp.*'));
  await btn.deferUpdate().catch(() => {});
  const id = btn.customId;
  if (id === `fcs_destroy_${ctx.userId}`) {
    const player = getPlayer(ctx.userId, ctx.guildId)!;
    const roll = randInt(1, 100);
    if (roll <= 40) {
      const dmg = Math.max(1, Math.floor(player.max_hp * 0.15));
      updatePlayerHpMp(ctx.userId, ctx.guildId, Math.max(1, player.hp - dmg), player.mp);
      return finish(ctx, simpleEmbed(COLORS.danger, `🎃 Khi bạn phá nó ra, một luồng năng lượng đen bùng phát!\n❤️ HP mất **${dmg}**`));
    }
    addItem(ctx.userId, ctx.guildId, 'broken_rune', 1);
    return finish(ctx, simpleEmbed(COLORS.success, '🎃 Bù nhìn vỡ ra thành tro. Trong lớp rơm có một mảnh rune cũ.\n🔷 +**1× Broken Rune**'));
  }
  if (id === `fcs_examine_${ctx.userId}`) {
    const exp = randInt(10, 21);
    grantExp(ctx.userId, ctx.guildId, exp);
    return finish(ctx, simpleEmbed(COLORS.info, `🔍 Bạn tìm thấy ký hiệu khắc trên người nó — thuật trừ tà cổ đại.\n⭐ +**${exp} EXP**`));
  }
  return finish(ctx, simpleEmbed(COLORS.info, '🎃 *Bạn tránh xa ánh mắt đá đen và đi tiếp.*'));
}

export async function showForestSnakePit(ctx: RunExploreEventInput): Promise<void> {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`fsp_jump_${ctx.userId}`).setLabel('Nhảy qua').setEmoji('🦘').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`fsp_around_${ctx.userId}`).setLabel('Vòng quanh').setEmoji('🔄').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`fsp_poke_${ctx.userId}`).setLabel('Chọc que vào').setEmoji('🌿').setStyle(ButtonStyle.Secondary),
  );
  const embed = new EmbedBuilder().setColor(0x2D5016).setTitle('🐍 Hố Rắn')
    .setDescription('Con đường hẹp dẫn qua một hố sâu nổi đầy rắn cuộn lại.\n*Tiếng xì xì và mùi tanh nồng nặc.*');
  const reply = await ctx.interaction.editReply({ embeds: [embed], components: [row] });
  const btn = await awaitVote(ctx, reply, 30_000);
  if (!btn || !btn.isButton()) return finish(ctx, simpleEmbed(COLORS.info, '🐍 *Bạn đứng quan sát rồi bỏ đi.*'));
  await btn.deferUpdate().catch(() => {});
  const id = btn.customId;
  const player = getPlayer(ctx.userId, ctx.guildId)!;
  if (id === `fsp_jump_${ctx.userId}`) {
    if (randInt(1, 100) <= 60) {
      const exp = randInt(7, 18); grantExp(ctx.userId, ctx.guildId, exp);
      return finish(ctx, simpleEmbed(COLORS.success, `🦘 Bạn nhảy qua gọn lẹ!\n⭐ +**${exp} EXP**`));
    }
    const dmg = Math.max(1, Math.floor(player.max_hp * 0.12));
    updatePlayerHpMp(ctx.userId, ctx.guildId, Math.max(1, player.hp - dmg), player.mp);
    return finish(ctx, simpleEmbed(COLORS.danger, `🐍 Bạn bị cắn khi hạ cánh!\n❤️ HP mất **${dmg}**`));
  }
  if (id === `fsp_around_${ctx.userId}`) {
    return finish(ctx, simpleEmbed(COLORS.info, '🔄 Bạn đi vòng quanh mất thêm một lúc nhưng an toàn.'));
  }
  addItem(ctx.userId, ctx.guildId, 'poison_venom', 1);
  const dmg = Math.max(1, Math.floor(player.max_hp * 0.06));
  updatePlayerHpMp(ctx.userId, ctx.guildId, Math.max(1, player.hp - dmg), player.mp);
  return finish(ctx, simpleEmbed(COLORS.warning, `🌿 Bạn kích động một con rắn nhưng thu được nọc độc.\n☠️ +**1× Poison Venom**\n❤️ HP mất **${dmg}**`));
}

export async function showForestPoacherCamp(ctx: RunExploreEventInput): Promise<void> {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`fpc_report_${ctx.userId}`).setLabel('Báo cáo / Phá trại').setEmoji('🏕️').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`fpc_steal_${ctx.userId}`).setLabel('Lấy trộm').setEmoji('🥷').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`fpc_ignore_${ctx.userId}`).setLabel('Bỏ qua').setStyle(ButtonStyle.Secondary),
  );
  const embed = new EmbedBuilder().setColor(0x8B4513).setTitle('🏕️ Trại Săn Trộm')
    .setDescription('Một trại nhỏ bị bỏ lại — bẫy thú và da thú khắp nơi. Những kẻ săn trộm đang vắng mặt nhưng có thể quay lại bất cứ lúc nào.');
  const reply = await ctx.interaction.editReply({ embeds: [embed], components: [row] });
  const btn = await awaitVote(ctx, reply, 30_000);
  if (!btn || !btn.isButton()) return finish(ctx, simpleEmbed(COLORS.info, '🏕️ *Bạn rời khỏi trại.*'));
  await btn.deferUpdate().catch(() => {});
  const id = btn.customId;
  if (id === `fpc_report_${ctx.userId}`) {
    const rep = adjustReputation(ctx.userId, ctx.guildId, 4);
    const exp = randInt(14, 28); grantExp(ctx.userId, ctx.guildId, exp);
    addItem(ctx.userId, ctx.guildId, 'leather', 2);
    return finish(ctx, new EmbedBuilder().setColor(COLORS.success).setTitle('🏕️ Trại Bị Phá')
      .setDescription(`Bạn phá hủy bẫy và giải phóng thú bị giam.\n🟫 +**2× Leather**\n⭐ +**${exp} EXP**\n🤝 Reputation: **${rep}** (+4)`));
  }
  if (id === `fpc_steal_${ctx.userId}`) {
    const roll = randInt(1, 100);
    if (roll <= 55) {
      const gold = randInt(12, 31); grantGold(ctx.userId, ctx.guildId, gold);
      addItem(ctx.userId, ctx.guildId, 'leather', 1);
      return finish(ctx, simpleEmbed(COLORS.gold, `🥷 Bạn lấy đồ và biến mất trước khi chúng quay lại.\n🪙 +**${gold} Gold**\n🟫 +**1× Leather**`));
    }
    await ctx.interaction.editReply({ embeds: [simpleEmbed(COLORS.danger, '🥷 Thợ săn trở về và phát hiện bạn — chiến đấu!')], components: [] });
    await new Promise(r => setTimeout(r, 600));
    return ctx.callbacks.startCombat(pick(ctx.enemies).id);
  }
  return finish(ctx, simpleEmbed(COLORS.info, '🏕️ *Bạn bỏ qua và tiếp tục đường.*'));
}

export async function showForestCorruptedTreant(ctx: RunExploreEventInput): Promise<void> {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`fct_fight_${ctx.userId}`).setLabel('Chiến đấu').setEmoji('⚔️').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`fct_purify_${ctx.userId}`).setLabel('Thanh tẩy').setEmoji('✨').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`fct_flee_${ctx.userId}`).setLabel('Bỏ chạy').setEmoji('💨').setStyle(ButtonStyle.Secondary),
  );
  const embed = new EmbedBuilder().setColor(0x1a0a00).setTitle('🌑 Cây Thần Bị Hủy Hoại')
    .setDescription('Một cây cổ thụ khổng lồ đứng trước mặt — nhựa đen chảy từ vỏ cây, cành khô quắt vươn ra như bàn tay.\n*Nó đang di chuyển.*');
  const reply = await ctx.interaction.editReply({ embeds: [embed], components: [row] });
  const btn = await awaitVote(ctx, reply, 30_000);
  if (!btn || !btn.isButton()) return finish(ctx, simpleEmbed(COLORS.info, '🌑 *Cây thần từ từ khép cành lại. Bạn rút lui.*'));
  await btn.deferUpdate().catch(() => {});
  const id = btn.customId;
  if (id === `fct_fight_${ctx.userId}`) {
    await ctx.interaction.editReply({ embeds: [simpleEmbed(COLORS.danger, '⚔️ Bạn xông vào tiêu diệt cây thần tà ác!')], components: [] });
    await new Promise(r => setTimeout(r, 600));
    return ctx.callbacks.startCombat('cursed_treant');
  }
  if (id === `fct_purify_${ctx.userId}`) {
    const player = getPlayer(ctx.userId, ctx.guildId)!;
    const mpCost = Math.floor(player.max_mp * 0.3);
    if (player.mp < mpCost) {
      return finish(ctx, simpleEmbed(COLORS.warning, `✨ Bạn không đủ MP để thanh tẩy. (Cần **${mpCost} MP**)`));
    }
    updatePlayerHpMp(ctx.userId, ctx.guildId, player.hp, player.mp - mpCost);
    const exp = randInt(28, 50); grantExp(ctx.userId, ctx.guildId, exp);
    addItem(ctx.userId, ctx.guildId, 'mysterious_shard', 1);
    const rep = adjustReputation(ctx.userId, ctx.guildId, 6);
    return finish(ctx, new EmbedBuilder().setColor(COLORS.magic).setTitle('✨ Cây Thần Được Giải Thoát')
      .setDescription(`Ánh sáng từ tay bạn xua tan bóng tối. Cây già rùng mình rồi đứng yên.\n🔵 MP -**${mpCost}**\n⭐ +**${exp} EXP**\n💎 +**1× Mysterious Shard**\n🤝 Reputation: **${rep}** (+6)`));
  }
  const player = getPlayer(ctx.userId, ctx.guildId)!;
  const dmg = Math.max(1, Math.floor(player.max_hp * 0.08));
  updatePlayerHpMp(ctx.userId, ctx.guildId, Math.max(1, player.hp - dmg), player.mp);
  return finish(ctx, simpleEmbed(COLORS.warning, `💨 Bạn chạy nhưng bị một cành cây quật vào lưng.\n❤️ HP mất **${dmg}**`));
}

export async function showForestWildBoar(ctx: RunExploreEventInput): Promise<void> {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`fwb_dodge_${ctx.userId}`).setLabel('Né tránh').setEmoji('🤸').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`fwb_fight_${ctx.userId}`).setLabel('Chiến đấu').setEmoji('⚔️').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`fwb_distract_${ctx.userId}`).setLabel('Đánh lạc hướng').setEmoji('🍎').setStyle(ButtonStyle.Secondary),
  );
  const embed = new EmbedBuilder().setColor(0x8B4513).setTitle('🐗 Lợn Rừng Hung Hăng')
    .setDescription('Một con lợn rừng to lớn đang cúi đầu nhìn bạn. Nanh nhọn, mắt đỏ — nó đang chuẩn bị lao vào.');
  const reply = await ctx.interaction.editReply({ embeds: [embed], components: [row] });
  const btn = await awaitVote(ctx, reply, 30_000);
  if (!btn || !btn.isButton()) return finish(ctx, simpleEmbed(COLORS.info, '🐗 *Con lợn hừng hừng rồi bỏ đi.*'));
  await btn.deferUpdate().catch(() => {});
  const player = getPlayer(ctx.userId, ctx.guildId)!;
  const id = btn.customId;
  if (id === `fwb_dodge_${ctx.userId}`) {
    if (randInt(1, 100) <= 65) {
      const exp = randInt(7, 14); grantExp(ctx.userId, ctx.guildId, exp);
      return finish(ctx, simpleEmbed(COLORS.success, `🤸 Bạn bước sang một bên đúng lúc — con lợn lao vào gốc cây.\n⭐ +**${exp} EXP**`));
    }
    const dmg = Math.max(1, Math.floor(player.max_hp * 0.12));
    updatePlayerHpMp(ctx.userId, ctx.guildId, Math.max(1, player.hp - dmg), player.mp);
    return finish(ctx, simpleEmbed(COLORS.danger, `🐗 Bạn né không kịp và bị húc!\n❤️ HP mất **${dmg}**`));
  }
  if (id === `fwb_fight_${ctx.userId}`) {
    await ctx.interaction.editReply({ embeds: [simpleEmbed(COLORS.danger, '⚔️ Bạn đón đầu con lợn — chiến đấu bắt đầu!')], components: [] });
    await new Promise(r => setTimeout(r, 600));
    return ctx.callbacks.startCombat('thornhound');
  }
  addItem(ctx.userId, ctx.guildId, 'meat', 2);
  const dmg = Math.max(1, Math.floor(player.max_hp * 0.05));
  updatePlayerHpMp(ctx.userId, ctx.guildId, Math.max(1, player.hp - dmg), player.mp);
  return finish(ctx, simpleEmbed(COLORS.warning, `🍎 Bạn ném thức ăn — con lợn ăn no và đi. Nhưng nó đã vồ được một ít đồ.\n🥩 +**2× Meat**\n❤️ HP mất **${dmg}**`));
}

export async function showForestPoisonSpores(ctx: RunExploreEventInput): Promise<void> {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`fps_hold_${ctx.userId}`).setLabel('Nín thở đi nhanh').setEmoji('🫁').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`fps_run_${ctx.userId}`).setLabel('Chạy thẳng').setEmoji('💨').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`fps_collect_${ctx.userId}`).setLabel('Thu thập bào tử').setEmoji('🍄').setStyle(ButtonStyle.Secondary),
  );
  const embed = new EmbedBuilder().setColor(0x6B8E23).setTitle('🍄 Bào Tử Độc')
    .setDescription('Một đám nấm lớn nổ tung khi bạn đến gần — bào tử màu vàng xanh bay khắp nơi.\n*Ngửi vào thì đầu óc quay cuồng ngay lập tức.*');
  const reply = await ctx.interaction.editReply({ embeds: [embed], components: [row] });
  const btn = await awaitVote(ctx, reply, 30_000);
  if (!btn || !btn.isButton()) {
    const player = getPlayer(ctx.userId, ctx.guildId)!;
    const dmg = Math.max(1, Math.floor(player.max_hp * 0.15));
    updatePlayerHpMp(ctx.userId, ctx.guildId, Math.max(1, player.hp - dmg), player.mp);
    return finish(ctx, simpleEmbed(COLORS.danger, `🍄 Bạn đứng quá lâu trong đám bào tử!\n❤️ HP mất **${dmg}**`));
  }
  await btn.deferUpdate().catch(() => {});
  const player = getPlayer(ctx.userId, ctx.guildId)!;
  const id = btn.customId;
  if (id === `fps_hold_${ctx.userId}`) {
    if (randInt(1, 100) <= 70) return finish(ctx, simpleEmbed(COLORS.success, '🫁 Bạn nín thở và bước qua nhanh chóng. An toàn!'));
    const dmg = Math.max(1, Math.floor(player.max_hp * 0.08));
    updatePlayerHpMp(ctx.userId, ctx.guildId, Math.max(1, player.hp - dmg), player.mp);
    return finish(ctx, simpleEmbed(COLORS.warning, `🫁 Không đủ hơi — bạn hít phải một ít.\n❤️ HP mất **${dmg}**`));
  }
  if (id === `fps_run_${ctx.userId}`) {
    const dmg = Math.max(1, Math.floor(player.max_hp * 0.1));
    updatePlayerHpMp(ctx.userId, ctx.guildId, Math.max(1, player.hp - dmg), player.mp);
    return finish(ctx, simpleEmbed(COLORS.warning, `💨 Bạn chạy qua nhưng hít phải nhiều bào tử.\n❤️ HP mất **${dmg}**`));
  }
  addItem(ctx.userId, ctx.guildId, 'poison_venom', 1);
  const dmg = Math.max(1, Math.floor(player.max_hp * 0.12));
  updatePlayerHpMp(ctx.userId, ctx.guildId, Math.max(1, player.hp - dmg), player.mp);
  return finish(ctx, simpleEmbed(COLORS.warning, `🍄 Bạn thu thập được bào tử nhưng hít phải một lượng lớn.\n☠️ +**1× Poison Venom**\n❤️ HP mất **${dmg}**`));
}

export async function showForestRabidFox(ctx: RunExploreEventInput): Promise<void> {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`frf_fight_${ctx.userId}`).setLabel('Chiến đấu').setEmoji('⚔️').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`frf_scare_${ctx.userId}`).setLabel('Hù dọa').setEmoji('😤').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`frf_run_${ctx.userId}`).setLabel('Bỏ chạy').setEmoji('💨').setStyle(ButtonStyle.Secondary),
  );
  const embed = new EmbedBuilder().setColor(0xD2691E).setTitle('🦊 Cáo Điên')
    .setDescription('Một con cáo lông xù bờm chạy về phía bạn — mắt đục và mồm sùi bọt. Rõ ràng nó đã mắc bệnh.');
  const reply = await ctx.interaction.editReply({ embeds: [embed], components: [row] });
  const btn = await awaitVote(ctx, reply, 30_000);
  if (!btn || !btn.isButton()) {
    const player = getPlayer(ctx.userId, ctx.guildId)!;
    const dmg = Math.max(1, Math.floor(player.max_hp * 0.1));
    updatePlayerHpMp(ctx.userId, ctx.guildId, Math.max(1, player.hp - dmg), player.mp);
    return finish(ctx, simpleEmbed(COLORS.danger, `🦊 Con cáo cắn vào bắp chân bạn trước khi bạn kịp phản ứng!\n❤️ HP mất **${dmg}**`));
  }
  await btn.deferUpdate().catch(() => {});
  const player = getPlayer(ctx.userId, ctx.guildId)!;
  const id = btn.customId;
  if (id === `frf_fight_${ctx.userId}`) {
    const dmg = Math.max(1, Math.floor(player.max_hp * 0.08));
    updatePlayerHpMp(ctx.userId, ctx.guildId, Math.max(1, player.hp - dmg), player.mp);
    addItem(ctx.userId, ctx.guildId, 'leather', 1);
    const exp = randInt(10, 21); grantExp(ctx.userId, ctx.guildId, exp);
    return finish(ctx, simpleEmbed(COLORS.success, `⚔️ Bạn hạ gục con cáo nhưng bị cắn một phát.\n🟫 +**1× Leather**\n⭐ +**${exp} EXP**\n❤️ HP mất **${dmg}**`));
  }
  if (id === `frf_scare_${ctx.userId}`) {
    if (randInt(1, 100) <= 55) return finish(ctx, simpleEmbed(COLORS.success, '😤 Bạn hét lớn và vung tay — con cáo hoảng sợ bỏ chạy.'));
    const dmg = Math.max(1, Math.floor(player.max_hp * 0.1));
    updatePlayerHpMp(ctx.userId, ctx.guildId, Math.max(1, player.hp - dmg), player.mp);
    return finish(ctx, simpleEmbed(COLORS.danger, `😤 Không ăn thua — nó lao vào cắn!\n❤️ HP mất **${dmg}**`));
  }
  if (randInt(1, 100) <= 70) return finish(ctx, simpleEmbed(COLORS.success, '💨 Bạn chạy thoát an toàn.'));
  const dmg = Math.max(1, Math.floor(player.max_hp * 0.07));
  updatePlayerHpMp(ctx.userId, ctx.guildId, Math.max(1, player.hp - dmg), player.mp);
  return finish(ctx, simpleEmbed(COLORS.warning, `💨 Nó đuổi theo và cắn vào gót chân!\n❤️ HP mất **${dmg}**`));
}

export async function showForestBanditWatchtower(ctx: RunExploreEventInput): Promise<void> {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`fbw_sneak_${ctx.userId}`).setLabel('Lén qua').setEmoji('🥷').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`fbw_assault_${ctx.userId}`).setLabel('Đột kích').setEmoji('⚔️').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`fbw_bribe_${ctx.userId}`).setLabel('Hối lộ').setEmoji('🪙').setStyle(ButtonStyle.Secondary),
  );
  const embed = new EmbedBuilder().setColor(0x5C3317).setTitle('🗼 Tháp Canh Tên Cướp')
    .setDescription('Một tháp canh bằng gỗ ọp ẹp giữa rừng — hai tên cướp đang ngủ gật trên đó.\n*Phía dưới có một chiếc rương khóa.*');
  const reply = await ctx.interaction.editReply({ embeds: [embed], components: [row] });
  const btn = await awaitVote(ctx, reply, 30_000);
  if (!btn || !btn.isButton()) return finish(ctx, simpleEmbed(COLORS.info, '🗼 *Bạn đi vòng tránh tháp canh.*'));
  await btn.deferUpdate().catch(() => {});
  const id = btn.customId;
  if (id === `fbw_sneak_${ctx.userId}`) {
    if (randInt(1, 100) <= 60) {
      const gold = randInt(18, 43); grantGold(ctx.userId, ctx.guildId, gold);
      addItem(ctx.userId, ctx.guildId, 'leather', 1);
      return finish(ctx, simpleEmbed(COLORS.success, `🥷 Bạn lén mở rương và thoát ra trước khi chúng tỉnh giấc!\n🪙 +**${gold} Gold**\n🟫 +**1× Leather**`));
    }
    await ctx.interaction.editReply({ embeds: [simpleEmbed(COLORS.danger, '🥷 Bạn lỡ tay — chúng thức dậy!')], components: [] });
    await new Promise(r => setTimeout(r, 600));
    return ctx.callbacks.startCombat(pick(ctx.enemies).id);
  }
  if (id === `fbw_assault_${ctx.userId}`) {
    await ctx.interaction.editReply({ embeds: [simpleEmbed(COLORS.danger, '⚔️ Bạn xông vào trong tiếng hô chiến đấu!')], components: [] });
    await new Promise(r => setTimeout(r, 600));
    return ctx.callbacks.startCombat(pick(ctx.enemies).id);
  }
  const player = getPlayer(ctx.userId, ctx.guildId)!;
  const cost = 30;
  if (player.gold < cost) return finish(ctx, simpleEmbed(COLORS.warning, `🪙 Bạn không đủ **${cost} Gold** để hối lộ.`));
  grantGold(ctx.userId, ctx.guildId, -cost);
  const gold = randInt(12, 37); grantGold(ctx.userId, ctx.guildId, gold);
  return finish(ctx, simpleEmbed(COLORS.gold, `🪙 Bạn trả **${cost} Gold** — chúng đưa cho bạn chìa khóa rương.\n🪙 +**${gold} Gold** (từ rương)`));
}

// ════════════════════════════════════════════════════════════════
//  FOREST — LOOT / TREASURE  (10 events)
// ════════════════════════════════════════════════════════════════

export async function showForestHollowLog(ctx: RunExploreEventInput): Promise<void> {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`fhl_reach_${ctx.userId}`).setLabel('Thò tay vào').setEmoji('🤚').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`fhl_peek_${ctx.userId}`).setLabel('Nhìn vào trước').setEmoji('👀').setStyle(ButtonStyle.Secondary),
  );
  const embed = new EmbedBuilder().setColor(0x8B5E3C).setTitle('🪵 Thân Cây Mục Rỗng')
    .setDescription('Một thân cây mục nằm ngang đường, bên trong rỗng hoàn toàn. Có gì đó lấp lánh bên trong bóng tối.');
  const reply = await ctx.interaction.editReply({ embeds: [embed], components: [row] });
  const btn = await awaitVote(ctx, reply, 30_000);
  if (!btn || !btn.isButton()) return finish(ctx, simpleEmbed(COLORS.info, '🪵 *Bạn bước qua mà không dừng lại.*'));
  await btn.deferUpdate().catch(() => {});
  const id = btn.customId;
  if (id === `fhl_peek_${ctx.userId}`) {
    const exp = randInt(3, 10); grantExp(ctx.userId, ctx.guildId, exp);
    return finish(ctx, simpleEmbed(COLORS.info, `👀 Bạn nhìn kỹ — chỉ là một đống nấm và mảnh xương nhỏ. Không có gì giá trị.\n⭐ +**${exp} EXP** (kinh nghiệm nhận biết)`));
  }
  const roll = randInt(1, 100);
  if (roll <= 15) {
    const player = getPlayer(ctx.userId, ctx.guildId)!;
    const dmg = Math.max(1, Math.floor(player.max_hp * 0.08));
    updatePlayerHpMp(ctx.userId, ctx.guildId, Math.max(1, player.hp - dmg), player.mp);
    return finish(ctx, simpleEmbed(COLORS.danger, `🐍 Một con rắn đang ẩn trong đó cắn vào tay bạn!\n❤️ HP mất **${dmg}**`));
  }
  if (roll <= 50) {
    const gold = randInt(9, 24); grantGold(ctx.userId, ctx.guildId, gold);
    return finish(ctx, simpleEmbed(COLORS.gold, `🤚 Một chiếc túi tiền cũ kỹ nằm sâu bên trong.\n🪙 +**${gold} Gold**`));
  }
  addItem(ctx.userId, ctx.guildId, 'herb', randInt(2, 4));
  if (randInt(1, 100) <= 30) addItem(ctx.userId, ctx.guildId, 'rare_herb', 1);
  return finish(ctx, simpleEmbed(COLORS.success, '🤚 Đầy thảo dược khô đặt ngay ngắn bên trong.\n🌿 +**2–4× Herb**\n🌺 Có thể thêm **Rare Herb**'));
}

export async function showForestBuriedChest(ctx: RunExploreEventInput): Promise<void> {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`fbc_dig_${ctx.userId}`).setLabel('Đào lên').setEmoji('⛏️').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`fbc_careful_${ctx.userId}`).setLabel('Đào cẩn thận').setEmoji('🔍').setStyle(ButtonStyle.Secondary),
  );
  const embed = new EmbedBuilder().setColor(0xA0522D).setTitle('📦 Rương Chôn Dưới Đất')
    .setDescription('Dưới lớp lá mục, một góc rương gỗ bọc sắt lộ ra. Ai đó đã chôn nó ở đây và không quay lại.');
  const reply = await ctx.interaction.editReply({ embeds: [embed], components: [row] });
  const btn = await awaitVote(ctx, reply, 30_000);
  if (!btn || !btn.isButton()) return finish(ctx, simpleEmbed(COLORS.info, '📦 *Bạn để yên nó và tiếp tục đường.*'));
  await btn.deferUpdate().catch(() => {});
  const id = btn.customId;
  if (id === `fbc_dig_${ctx.userId}`) {
    const player = getPlayer(ctx.userId, ctx.guildId)!;
    const roll = randInt(1, 100);
    if (roll <= 20) {
      const dmg = Math.max(1, Math.floor(player.max_hp * 0.1));
      updatePlayerHpMp(ctx.userId, ctx.guildId, Math.max(1, player.hp - dmg), player.mp);
      addItem(ctx.userId, ctx.guildId, 'broken_rune', 1);
      return finish(ctx, simpleEmbed(COLORS.warning, `⛏️ Bẫy kích hoạt! Một mũi tên bắn từ bên trong rương.\n🔷 +**1× Broken Rune** (rơi ra từ bẫy)\n❤️ HP mất **${dmg}**`));
    }
    const gold = randInt(24, 62); grantGold(ctx.userId, ctx.guildId, gold);
    if (randInt(1, 100) <= 40) addItem(ctx.userId, ctx.guildId, 'rune_stone', 1);
    return finish(ctx, simpleEmbed(COLORS.gold, `⛏️ Rương đầy vàng và đá rune!\n🪙 +**${gold} Gold**\n🔮 Có thể thêm **Rune Stone**`));
  }
  const gold = randInt(15, 43); grantGold(ctx.userId, ctx.guildId, gold);
  addItem(ctx.userId, ctx.guildId, 'herb', 2);
  return finish(ctx, simpleEmbed(COLORS.success, `🔍 Đào cẩn thận, không kích bẫy. Nội dung an toàn hơn nhưng ít hơn.\n🪙 +**${gold} Gold**\n🌿 +**2× Herb**`));
}

export async function showForestEagleNest(ctx: RunExploreEventInput): Promise<void> {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`fen_climb_${ctx.userId}`).setLabel('Leo lên').setEmoji('🧗').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`fen_throw_${ctx.userId}`).setLabel('Ném đá lên').setEmoji('🪨').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`fen_leave_${ctx.userId}`).setLabel('Để yên').setStyle(ButtonStyle.Secondary),
  );
  const embed = new EmbedBuilder().setColor(0xDAA520).setTitle('🦅 Tổ Đại Bàng')
    .setDescription('Trên cành cao nhất của cây cổ thụ là một tổ đại bàng khổng lồ. Có gì đó lấp lánh bên trong — đại bàng đang vắng mặt.');
  const reply = await ctx.interaction.editReply({ embeds: [embed], components: [row] });
  const btn = await awaitVote(ctx, reply, 30_000);
  if (!btn || !btn.isButton()) return finish(ctx, simpleEmbed(COLORS.info, '🦅 *Bạn nhìn lên tổ rồi bỏ đi.*'));
  await btn.deferUpdate().catch(() => {});
  const player = getPlayer(ctx.userId, ctx.guildId)!;
  const id = btn.customId;
  if (id === `fen_climb_${ctx.userId}`) {
    const roll = randInt(1, 100);
    if (roll <= 30) {
      const dmg = Math.max(1, Math.floor(player.max_hp * 0.15));
      updatePlayerHpMp(ctx.userId, ctx.guildId, Math.max(1, player.hp - dmg), player.mp);
      return finish(ctx, simpleEmbed(COLORS.danger, `🦅 Đại bàng quay về và tấn công bạn khi đang leo!\n❤️ HP mất **${dmg}**`));
    }
    const gold = randInt(12, 31); grantGold(ctx.userId, ctx.guildId, gold);
    addItem(ctx.userId, ctx.guildId, 'eagle_feather', 1);
    return finish(ctx, new EmbedBuilder().setColor(COLORS.success).setTitle('🦅 Báu Vật Trong Tổ')
      .setDescription(`Trong tổ có mảnh vàng và một chiếc lông đại bàng hiếm.\n🪙 +**${gold} Gold**\n🪶 +**1× Eagle Feather**`));
  }
  if (id === `fen_throw_${ctx.userId}`) {
    if (randInt(1, 100) <= 50) {
      addItem(ctx.userId, ctx.guildId, 'eagle_feather', 1);
      return finish(ctx, simpleEmbed(COLORS.success, '🪨 Đá làm rơi một chiếc lông đại bàng từ tổ xuống!\n🪶 +**1× Eagle Feather**'));
    }
    const dmg = Math.max(1, Math.floor(player.max_hp * 0.05));
    updatePlayerHpMp(ctx.userId, ctx.guildId, Math.max(1, player.hp - dmg), player.mp);
    return finish(ctx, simpleEmbed(COLORS.warning, `🪨 Đá dội ngược lại và trúng đầu bạn.\n❤️ HP mất **${dmg}**`));
  }
  return finish(ctx, simpleEmbed(COLORS.info, '🦅 *Bạn nhìn tổ từ xa với ánh mắt tôn trọng.*'));
}

export async function showForestMushroomRing(ctx: RunExploreEventInput): Promise<void> {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`fmr_step_${ctx.userId}`).setLabel('Bước vào vòng').setEmoji('✨').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`fmr_harvest_${ctx.userId}`).setLabel('Hái nấm').setEmoji('🍄').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`fmr_observe_${ctx.userId}`).setLabel('Quan sát').setEmoji('👁️').setStyle(ButtonStyle.Secondary),
  );
  const embed = new EmbedBuilder().setColor(0x9370DB).setTitle('🍄 Vòng Nấm Huyền Bí')
    .setDescription('Một vòng tròn nấm hoàn hảo mọc giữa bãi cỏ — không một cây nào bên trong, không dấu chân nào. Dân gian gọi đây là "Vòng Tiên".');
  const reply = await ctx.interaction.editReply({ embeds: [embed], components: [row] });
  const btn = await awaitVote(ctx, reply, 30_000);
  if (!btn || !btn.isButton()) return finish(ctx, simpleEmbed(COLORS.info, '🍄 *Bạn nhìn vòng nấm rồi rời đi.*'));
  await btn.deferUpdate().catch(() => {});
  const player = getPlayer(ctx.userId, ctx.guildId)!;
  const id = btn.customId;
  if (id === `fmr_step_${ctx.userId}`) {
    const outcomes = [
      () => { const hp = Math.min(player.max_hp, player.hp + Math.floor(player.max_hp * 0.5)); updatePlayerHpMp(ctx.userId, ctx.guildId, hp, player.mp); return simpleEmbed(COLORS.success, `✨ Cơ thể bạn tràn ngập ánh sáng dịu — vết thương lành lại.\n❤️ HP: **${hp}/${player.max_hp}**`); },
      () => { const exp = randInt(28, 57); grantExp(ctx.userId, ctx.guildId, exp); return simpleEmbed(COLORS.magic, `✨ Bạn cảm thấy một luồng tri thức cổ đại chảy qua tâm trí.\n⭐ +**${exp} EXP**`); },
      () => { addItem(ctx.userId, ctx.guildId, 'mysterious_shard', 1); return simpleEmbed(COLORS.magic, '✨ Một mảnh tinh thể rơi xuống từ không khí khi bạn bước vào.\n💎 +**1× Mysterious Shard**'); },
      () => { const dmg = Math.max(1, Math.floor(player.max_hp * 0.2)); updatePlayerHpMp(ctx.userId, ctx.guildId, Math.max(1, player.hp - dmg), player.mp); return simpleEmbed(COLORS.danger, `✨ Không phải tiên — bạn bị cuốn vào một vòng xoáy ma thuật tối!\n❤️ HP mất **${dmg}**`); },
    ];
    return finish(ctx, pick(outcomes)());
  }
  if (id === `fmr_harvest_${ctx.userId}`) {
    addItem(ctx.userId, ctx.guildId, 'glowing_mushroom', randInt(2, 4));
    return finish(ctx, simpleEmbed(COLORS.success, '🍄 Bạn hái nấm từ vòng — chúng phát sáng trong bóng tối.\n🍄 +**2–4× Glowing Mushroom**'));
  }
  const exp = randInt(10, 21); grantExp(ctx.userId, ctx.guildId, exp);
  return finish(ctx, simpleEmbed(COLORS.info, `👁️ Bạn nghiên cứu vòng nấm từ xa — ghi chép lại hình dạng và màu sắc.\n⭐ +**${exp} EXP**`));
}

export async function showForestAmberSap(ctx: RunExploreEventInput): Promise<void> {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`fas_collect_${ctx.userId}`).setLabel('Thu thập nhựa').setEmoji('🟡').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`fas_study_${ctx.userId}`).setLabel('Nghiên cứu').setEmoji('🔬').setStyle(ButtonStyle.Secondary),
  );
  const embed = new EmbedBuilder().setColor(0xFFAA00).setTitle('🌳 Nhựa Hổ Phách')
    .setDescription('Một cây cổ thụ tiết ra nhựa vàng óng ánh đặc quánh. Bên trong một giọt nhựa lớn, có thứ gì đó bị kẹt lại từ lâu.');
  const reply = await ctx.interaction.editReply({ embeds: [embed], components: [row] });
  const btn = await awaitVote(ctx, reply, 30_000);
  if (!btn || !btn.isButton()) return finish(ctx, simpleEmbed(COLORS.info, '🌳 *Bạn để cây yên lặng tiết nhựa.*'));
  await btn.deferUpdate().catch(() => {});
  if (btn.customId === `fas_collect_${ctx.userId}`) {
    addItem(ctx.userId, ctx.guildId, 'amber_sap', randInt(1, 3));
    return finish(ctx, simpleEmbed(COLORS.gold, '🟡 Bạn cẩn thận cạo nhựa vào lọ.\n🟡 +**1–3× Amber Sap**'));
  }
  const exp = randInt(14, 28); grantExp(ctx.userId, ctx.guildId, exp);
  addItem(ctx.userId, ctx.guildId, 'amber_sap', 1);
  return finish(ctx, simpleEmbed(COLORS.success, `🔬 Nghiên cứu thú vị — thứ bị kẹt trong nhựa là một côn trùng từ thời cổ đại.\n⭐ +**${exp} EXP**\n🟡 +**1× Amber Sap**`));
}

export async function showForestForgottenPack(ctx: RunExploreEventInput): Promise<void> {
  const player = getPlayer(ctx.userId, ctx.guildId)!;
  const roll = randInt(1, 100);
  const outcomes = [
    () => { const g = randInt(12, 37); grantGold(ctx.userId, ctx.guildId, g); return `🪙 +**${g} Gold** (trong túi tiền cũ)`; },
    () => { addItem(ctx.userId, ctx.guildId, 'health_potion', 1); return '🧪 +**1× Health Potion**'; },
    () => { addItem(ctx.userId, ctx.guildId, 'herb', 3); addItem(ctx.userId, ctx.guildId, 'leather', 1); return '🌿 +**3× Herb**\n🟫 +**1× Leather**'; },
    () => { addItem(ctx.userId, ctx.guildId, 'rune_stone', 1); return '🔮 +**1× Rune Stone** (gói kỹ trong vải)'; },
    () => { const dmg = Math.max(1, Math.floor(player.max_hp * 0.08)); updatePlayerHpMp(ctx.userId, ctx.guildId, Math.max(1, player.hp - dmg), player.mp); return `💥 Bẫy nhỏ kích hoạt khi mở túi!\n❤️ HP mất **${dmg}**`; },
  ];
  const result = roll <= 20 ? outcomes[4]() : pick(outcomes.slice(0, 4))();
  return finish(ctx, simpleEmbed(roll <= 20 ? COLORS.warning : COLORS.success,
    `🎒 Bạn tìm thấy một ba lô cũ treo trên cành cây.\n\n${result}`));
}

export async function showForestBeehive(ctx: RunExploreEventInput): Promise<void> {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`fbh_steal_${ctx.userId}`).setLabel('Lấy mật').setEmoji('🍯').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`fbh_smoke_${ctx.userId}`).setLabel('Dùng khói').setEmoji('💨').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`fbh_leave_${ctx.userId}`).setLabel('Để yên').setStyle(ButtonStyle.Secondary),
  );
  const embed = new EmbedBuilder().setColor(0xFFD700).setTitle('🐝 Tổ Ong Khổng Lồ')
    .setDescription('Một tổ ong to bằng chiếc thùng treo lủng lẳng trên cành. Mật rỉ ra vàng óng. Tiếng vo ve êm đềm... đang chờ bị khuấy động.');
  const reply = await ctx.interaction.editReply({ embeds: [embed], components: [row] });
  const btn = await awaitVote(ctx, reply, 30_000);
  if (!btn || !btn.isButton()) return finish(ctx, simpleEmbed(COLORS.info, '🐝 *Bạn nghe tiếng vo ve và đi tiếp.*'));
  await btn.deferUpdate().catch(() => {});
  const player = getPlayer(ctx.userId, ctx.guildId)!;
  const id = btn.customId;
  if (id === `fbh_steal_${ctx.userId}`) {
    if (randInt(1, 100) <= 35) {
      addItem(ctx.userId, ctx.guildId, 'honey', 2);
      return finish(ctx, simpleEmbed(COLORS.success, '🍯 Bạn may mắn lấy được mật trước khi đàn ong phản ứng.\n🍯 +**2× Honey**'));
    }
    const dmg = Math.max(1, Math.floor(player.max_hp * 0.14));
    updatePlayerHpMp(ctx.userId, ctx.guildId, Math.max(1, player.hp - dmg), player.mp);
    addItem(ctx.userId, ctx.guildId, 'honey', 1);
    return finish(ctx, simpleEmbed(COLORS.warning, `🐝 Cả đàn ong đổ ra đốt bạn!\n🍯 +**1× Honey** (lấy vội)\n❤️ HP mất **${dmg}**`));
  }
  if (id === `fbh_smoke_${ctx.userId}`) {
    addItem(ctx.userId, ctx.guildId, 'honey', 2);
    addItem(ctx.userId, ctx.guildId, 'beeswax', 1);
    return finish(ctx, simpleEmbed(COLORS.success, '💨 Khói làm đàn ong ngủ. Bạn thu hoạch thoải mái.\n🍯 +**2× Honey**\n🕯️ +**1× Beeswax**'));
  }
  return finish(ctx, simpleEmbed(COLORS.info, '🐝 *Bạn nhìn tổ ong rồi bước đi nhẹ nhàng.*'));
}

export async function showForestFruitGrove(ctx: RunExploreEventInput): Promise<void> {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`ffg_eat_${ctx.userId}`).setLabel('Ăn ngay').setEmoji('😋').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`ffg_collect_${ctx.userId}`).setLabel('Thu thập mang theo').setEmoji('🎒').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`ffg_identify_${ctx.userId}`).setLabel('Nhận dạng trước').setEmoji('🔍').setStyle(ButtonStyle.Secondary),
  );
  const embed = new EmbedBuilder().setColor(0x228B22).setTitle('🍒 Vườn Trái Cây Rừng')
    .setDescription('Bạn lạc vào một khoảng cây ăn quả hoang dã — trái chín mọng đỏ, vàng, tím. Không biết loại nào ăn được và loại nào độc.');
  const reply = await ctx.interaction.editReply({ embeds: [embed], components: [row] });
  const btn = await awaitVote(ctx, reply, 30_000);
  if (!btn || !btn.isButton()) return finish(ctx, simpleEmbed(COLORS.info, '🍒 *Bạn ngắm vườn cây rồi tiếp tục đường.*'));
  await btn.deferUpdate().catch(() => {});
  const player = getPlayer(ctx.userId, ctx.guildId)!;
  const id = btn.customId;
  if (id === `ffg_eat_${ctx.userId}`) {
    const roll = randInt(1, 100);
    if (roll <= 65) {
      const hp = Math.min(player.max_hp, player.hp + Math.floor(player.max_hp * 0.3));
      updatePlayerHpMp(ctx.userId, ctx.guildId, hp, player.mp);
      return finish(ctx, simpleEmbed(COLORS.success, `😋 Ngọt và mát — trái cây lành!\n❤️ HP: **${hp}/${player.max_hp}**`));
    }
    const dmg = Math.max(1, Math.floor(player.max_hp * 0.18));
    updatePlayerHpMp(ctx.userId, ctx.guildId, Math.max(1, player.hp - dmg), player.mp);
    return finish(ctx, simpleEmbed(COLORS.danger, `😋 Đắng và tê lưỡi — bạn nhổ ra nhưng đã hít phải độc.\n❤️ HP mất **${dmg}**`));
  }
  if (id === `ffg_collect_${ctx.userId}`) {
    addItem(ctx.userId, ctx.guildId, 'forest_fruit', randInt(3, 6));
    return finish(ctx, simpleEmbed(COLORS.success, '🎒 Bạn hái chọn lọc những trái trông lành nhất.\n🍒 +**3–6× Forest Fruit**'));
  }
  const exp = randInt(7, 18); grantExp(ctx.userId, ctx.guildId, exp);
  addItem(ctx.userId, ctx.guildId, 'forest_fruit', 2);
  return finish(ctx, simpleEmbed(COLORS.success, `🔍 Bạn nhận dạng được một số loại an toàn.\n⭐ +**${exp} EXP**\n🍒 +**2× Forest Fruit**`));
}

export async function showForestSilkCocoon(ctx: RunExploreEventInput): Promise<void> {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`fsc_harvest_${ctx.userId}`).setLabel('Thu tơ').setEmoji('🧵').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`fsc_wait_${ctx.userId}`).setLabel('Chờ nó nở').setEmoji('🦋').setStyle(ButtonStyle.Secondary),
  );
  const embed = new EmbedBuilder().setColor(0xE8E8E8).setTitle('🪱 Kén Tơ Khổng Lồ')
    .setDescription('Một kén tơ to như quả dưa treo trên cành thấp, ánh bạc lấp lánh trong nắng. Bên trong có thứ gì đó đang di chuyển nhẹ nhàng.');
  const reply = await ctx.interaction.editReply({ embeds: [embed], components: [row] });
  const btn = await awaitVote(ctx, reply, 30_000);
  if (!btn || !btn.isButton()) return finish(ctx, simpleEmbed(COLORS.info, '🪱 *Bạn nhìn kén rồi để nó yên.*'));
  await btn.deferUpdate().catch(() => {});
  if (btn.customId === `fsc_harvest_${ctx.userId}`) {
    addItem(ctx.userId, ctx.guildId, 'spider_silk', randInt(2, 4));
    return finish(ctx, simpleEmbed(COLORS.success, '🧵 Bạn cẩn thận tháo tơ khỏi kén.\n🕸️ +**2–4× Spider Silk**'));
  }
  const roll = randInt(1, 100);
  if (roll <= 40) {
    addItem(ctx.userId, ctx.guildId, 'mysterious_shard', 1);
    const exp = randInt(18, 36); grantExp(ctx.userId, ctx.guildId, exp);
    return finish(ctx, new EmbedBuilder().setColor(COLORS.magic).setTitle('🦋 Điều Kỳ Diệu')
      .setDescription(`Kén vỡ ra — không phải côn trùng, mà là một mảnh tinh thể phát sáng rơi xuống tay bạn.\n💎 +**1× Mysterious Shard**\n⭐ +**${exp} EXP**`));
  }
  const rep = adjustReputation(ctx.userId, ctx.guildId, 2);
  addItem(ctx.userId, ctx.guildId, 'rare_herb', 1);
  return finish(ctx, simpleEmbed(COLORS.success, `🦋 Một con bướm khổng lồ bay ra — trước khi đi nó để lại bụi phấn lấp lánh trên một bông hoa.\n🌺 +**1× Rare Herb**\n🤝 Reputation: **${rep}** (+2)`));
}

export async function showForestBogPearl(ctx: RunExploreEventInput): Promise<void> {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`fbp_wade_${ctx.userId}`).setLabel('Lội vào lấy').setEmoji('🚶').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`fbp_stick_${ctx.userId}`).setLabel('Dùng que móc').setEmoji('🌿').setStyle(ButtonStyle.Secondary),
  );
  const embed = new EmbedBuilder().setColor(0x4A7C59).setTitle('💧 Viên Ngọc Đầm Lầy')
    .setDescription('Giữa một vũng nước tối, một viên ngọc trắng sáng nổi lên từ bùn đen.\n*Nước ngang đầu gối — sình lầy bên dưới.*');
  const reply = await ctx.interaction.editReply({ embeds: [embed], components: [row] });
  const btn = await awaitVote(ctx, reply, 30_000);
  if (!btn || !btn.isButton()) return finish(ctx, simpleEmbed(COLORS.info, '💧 *Bạn nhìn viên ngọc chìm xuống bùn và bỏ đi.*'));
  await btn.deferUpdate().catch(() => {});
  const player = getPlayer(ctx.userId, ctx.guildId)!;
  if (btn.customId === `fbp_wade_${ctx.userId}`) {
    if (randInt(1, 100) <= 70) {
      addItem(ctx.userId, ctx.guildId, 'bog_pearl', 1);
      const hp = Math.min(player.max_hp, player.hp + Math.floor(player.max_hp * 0.1));
      updatePlayerHpMp(ctx.userId, ctx.guildId, hp, player.mp);
      return finish(ctx, simpleEmbed(COLORS.success, '🚶 Bùn lạnh ngắt nhưng bạn lấy được viên ngọc. Nước mát làm dịu đi vết thương cũ.\n🔮 +**1× Bog Pearl**\n❤️ HP hồi thêm chút ít'));
    }
    const dmg = Math.max(1, Math.floor(player.max_hp * 0.1));
    updatePlayerHpMp(ctx.userId, ctx.guildId, Math.max(1, player.hp - dmg), player.mp);
    return finish(ctx, simpleEmbed(COLORS.danger, '🚶 Bạn bị hút vào sình và phải vật lộn thoát ra, mệt mỏi và bầm dập.\n❤️ HP mất **${dmg}**'));
  }
  if (randInt(1, 100) <= 50) {
    addItem(ctx.userId, ctx.guildId, 'bog_pearl', 1);
    return finish(ctx, simpleEmbed(COLORS.success, '🌿 Que dài vừa đủ để móc viên ngọc vào bờ!\n🔮 +**1× Bog Pearl**'));
  }
  return finish(ctx, simpleEmbed(COLORS.info, '🌿 Viên ngọc trượt khỏi que và chìm sâu hơn vào bùn.'));
}

// ════════════════════════════════════════════════════════════════
//  FOREST — NPC / SOCIAL  (10 events)
// ════════════════════════════════════════════════════════════════

export async function showForestLostMerchant(ctx: RunExploreEventInput): Promise<void> {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`flm_guide_${ctx.userId}`).setLabel('Dẫn đường').setEmoji('🗺️').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`flm_trade_${ctx.userId}`).setLabel('Trao đổi hàng').setEmoji('💼').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`flm_rob_${ctx.userId}`).setLabel('Cướp đồ').setEmoji('🥷').setStyle(ButtonStyle.Danger),
  );
  const embed = new EmbedBuilder().setColor(0xDAA520).setTitle('🛒 Thương Nhân Lạc Đường')
    .setDescription('Một thương nhân béo tốt đang ngồi ôm đầu cạnh xe hàng bị sa lầy, la bàn vỡ trên tay.\n*"Trời ơi, tôi lạc rồi! Ai giúp tôi với!"*');
  const reply = await ctx.interaction.editReply({ embeds: [embed], components: [row] });
  const btn = await awaitVote(ctx, reply, 30_000);
  if (!btn || !btn.isButton()) return finish(ctx, simpleEmbed(COLORS.info, '🛒 *Bạn bỏ mặc ông ta và đi tiếp.*'));
  await btn.deferUpdate().catch(() => {});
  const id = btn.customId;
  if (id === `flm_guide_${ctx.userId}`) {
    const gold = randInt(24, 49); grantGold(ctx.userId, ctx.guildId, gold);
    const rep = adjustReputation(ctx.userId, ctx.guildId, 5);
    addItem(ctx.userId, ctx.guildId, 'health_potion', 1);
    return finish(ctx, new EmbedBuilder().setColor(COLORS.success).setTitle('🗺️ Ân Nhân Của Thương Nhân')
      .setDescription(`Bạn dẫn ông ta ra đường chính. Ông ta tặng bạn tiền và một lọ thuốc hảo hạng.\n🪙 +**${gold} Gold**\n🧪 +**1× Health Potion**\n🤝 Reputation: **${rep}** (+5)`));
  }
  if (id === `flm_trade_${ctx.userId}`) {
    const gold = randInt(9, 21); grantGold(ctx.userId, ctx.guildId, gold);
    addItem(ctx.userId, ctx.guildId, 'herb', 2);
    return finish(ctx, simpleEmbed(COLORS.success, `💼 Ông ta bán rẻ hàng để nhẹ gánh.\n🪙 +**${gold} Gold**\n🌿 +**2× Herb**`));
  }
  const rep = adjustReputation(ctx.userId, ctx.guildId, -8);
  const gold = randInt(24, 55); grantGold(ctx.userId, ctx.guildId, gold);
  return finish(ctx, new EmbedBuilder().setColor(COLORS.warning).setTitle('🥷 Cướp Người Lạc Đường')
    .setDescription(`Bạn lấy đồ rồi bỏ ông ta trong rừng.\n🪙 +**${gold} Gold**\n🤝 Reputation: **${rep}** (-8)`));
}

export async function showForestHermitCave(ctx: RunExploreEventInput): Promise<void> {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`fhc_talk_${ctx.userId}`).setLabel('Trò chuyện').setEmoji('💬').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`fhc_food_${ctx.userId}`).setLabel('Biếu thức ăn').setEmoji('🍞').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`fhc_knowledge_${ctx.userId}`).setLabel('Hỏi kiến thức').setEmoji('📚').setStyle(ButtonStyle.Secondary),
  );
  const embed = new EmbedBuilder().setColor(0x696969).setTitle('🏔️ Hang Ẩn Sĩ')
    .setDescription('Một hang nhỏ ẩn sau thác nước mini — bên trong có người già ngồi thiền, mắt nhắm, bên cạnh là đống sách cũ.');
  const reply = await ctx.interaction.editReply({ embeds: [embed], components: [row] });
  const btn = await awaitVote(ctx, reply, 30_000);
  if (!btn || !btn.isButton()) return finish(ctx, simpleEmbed(COLORS.info, '🏔️ *Bạn rời đi mà không làm phiền vị ẩn sĩ.*'));
  await btn.deferUpdate().catch(() => {});
  const player = getPlayer(ctx.userId, ctx.guildId)!;
  const id = btn.customId;
  if (id === `fhc_talk_${ctx.userId}`) {
    const exp = randInt(21, 43); grantExp(ctx.userId, ctx.guildId, exp);
    const hp = Math.min(player.max_hp, player.hp + Math.floor(player.max_hp * 0.2));
    const mp = Math.min(player.max_mp, player.mp + Math.floor(player.max_mp * 0.2));
    updatePlayerHpMp(ctx.userId, ctx.guildId, hp, mp);
    return finish(ctx, new EmbedBuilder().setColor(COLORS.success).setTitle('💬 Trò Chuyện Với Ẩn Sĩ')
      .setDescription(`Ông kể về những gì ông đã thấy trong rừng này. Lời nói bình thản làm tâm trí bạn nhẹ nhõm.\n⭐ +**${exp} EXP**\n❤️ HP hồi phục +20%\n🔵 MP hồi phục +20%`));
  }
  if (id === `fhc_food_${ctx.userId}`) {
    addItem(ctx.userId, ctx.guildId, 'rare_herb', 2);
    const rep = adjustReputation(ctx.userId, ctx.guildId, 3);
    return finish(ctx, simpleEmbed(COLORS.success, `🍞 Ẩn sĩ cảm ơn và đưa cho bạn vài bó thảo dược quý hiếm ông tự trồng.\n🌺 +**2× Rare Herb**\n🤝 Reputation: **${rep}** (+3)`));
  }
  const exp = randInt(36, 64); grantExp(ctx.userId, ctx.guildId, exp);
  addItem(ctx.userId, ctx.guildId, 'rune_stone', 1);
  return finish(ctx, new EmbedBuilder().setColor(COLORS.magic).setTitle('📚 Tri Thức Ẩn Sĩ')
    .setDescription(`Ông dạy bạn một điều gì đó về thế giới — một sự thật ít ai biết.\n⭐ +**${exp} EXP**\n🔮 +**1× Rune Stone**`));
}

export async function showForestWoundedKnight(ctx: RunExploreEventInput): Promise<void> {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`fwk_heal_${ctx.userId}`).setLabel('Chữa trị').setEmoji('💊').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`fwk_quest_${ctx.userId}`).setLabel('Hỏi chuyện xảy ra').setEmoji('❓').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`fwk_loot_${ctx.userId}`).setLabel('Lấy đồ của họ').setEmoji('🥷').setStyle(ButtonStyle.Danger),
  );
  const embed = new EmbedBuilder().setColor(0xC0C0C0).setTitle('🛡️ Hiệp Sĩ Bị Thương')
    .setDescription('Một hiệp sĩ trong bộ giáp bạc mang vết thương nặng đang tựa vào cây, thở dốc.\n*"Tôi bị phục kích... cần giúp đỡ..."*');
  const reply = await ctx.interaction.editReply({ embeds: [embed], components: [row] });
  const btn = await awaitVote(ctx, reply, 30_000);
  if (!btn || !btn.isButton()) return finish(ctx, simpleEmbed(COLORS.info, '🛡️ *Bạn bỏ đi — hiệp sĩ nhìn theo với ánh mắt thất vọng.*'));
  await btn.deferUpdate().catch(() => {});
  const id = btn.customId;
  if (id === `fwk_heal_${ctx.userId}`) {
    const rep = adjustReputation(ctx.userId, ctx.guildId, 7);
    const exp = randInt(21, 43); grantExp(ctx.userId, ctx.guildId, exp);
    addItem(ctx.userId, ctx.guildId, 'knight_emblem', 1);
    return finish(ctx, new EmbedBuilder().setColor(COLORS.success).setTitle('💊 Ân Nghĩa Hiệp Sĩ')
      .setDescription(`Bạn băng bó vết thương cho anh ta. Trước khi đi, anh ta tặng huy hiệu của mình.\n🏅 +**1× Knight Emblem**\n⭐ +**${exp} EXP**\n🤝 Reputation: **${rep}** (+7)`));
  }
  if (id === `fwk_quest_${ctx.userId}`) {
    const exp = randInt(14, 32); grantExp(ctx.userId, ctx.guildId, exp);
    return finish(ctx, simpleEmbed(COLORS.info, `❓ Anh ta kể về một hang quái vật sâu trong rừng và cảnh báo bạn tránh xa.\n⭐ +**${exp} EXP** (thông tin hữu ích)`));
  }
  const rep = adjustReputation(ctx.userId, ctx.guildId, -10);
  const gold = randInt(18, 43); grantGold(ctx.userId, ctx.guildId, gold);
  addItem(ctx.userId, ctx.guildId, 'leather', 1);
  return finish(ctx, new EmbedBuilder().setColor(COLORS.warning).setTitle('🥷 Cướp Đồ Hiệp Sĩ')
    .setDescription(`Bạn lấy đồ của người đang cần giúp đỡ.\n🪙 +**${gold} Gold**\n🟫 +**1× Leather**\n🤝 Reputation: **${rep}** (-10)`));
}

export async function showForestFairyCircle(ctx: RunExploreEventInput): Promise<void> {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`ffc_join_${ctx.userId}`).setLabel('Tham gia vũ điệu').setEmoji('💃').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`ffc_observe_${ctx.userId}`).setLabel('Đứng ngoài quan sát').setEmoji('👁️').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`ffc_break_${ctx.userId}`).setLabel('Phá vỡ vòng tròn').setEmoji('⚡').setStyle(ButtonStyle.Danger),
  );
  const embed = new EmbedBuilder().setColor(0xFF69B4).setTitle('✨ Vòng Tròn Tiên Nữ')
    .setDescription('Trong ánh hoàng hôn, những sinh linh nhỏ xinh phát sáng đang nhảy múa thành vòng tròn giữa khoảng trống.\n*Tiếng nhạc trong trẻo như pha lê vang lên.*');
  const reply = await ctx.interaction.editReply({ embeds: [embed], components: [row] });
  const btn = await awaitVote(ctx, reply, 30_000);
  if (!btn || !btn.isButton()) return finish(ctx, simpleEmbed(COLORS.info, '✨ *Tiếng nhạc phai dần khi bạn rời đi.*'));
  await btn.deferUpdate().catch(() => {});
  const player = getPlayer(ctx.userId, ctx.guildId)!;
  const id = btn.customId;
  if (id === `ffc_join_${ctx.userId}`) {
    const roll = randInt(1, 100);
    if (roll <= 60) {
      const hp = Math.min(player.max_hp, player.hp + Math.floor(player.max_hp * 0.6));
      const mp = Math.min(player.max_mp, player.mp + Math.floor(player.max_mp * 0.6));
      updatePlayerHpMp(ctx.userId, ctx.guildId, hp, mp);
      const exp = randInt(28, 57); grantExp(ctx.userId, ctx.guildId, exp);
      return finish(ctx, new EmbedBuilder().setColor(COLORS.magic).setTitle('💃 Được Tiên Chào Đón')
        .setDescription(`Bạn nhảy cùng họ đến khi màn đêm buông xuống. Tỉnh dậy thấy người thấy khỏe khoắn lạ thường.\n❤️ HP hồi 60%\n🔵 MP hồi 60%\n⭐ +**${exp} EXP**`));
    }
    const dmg = Math.max(1, Math.floor(player.max_hp * 0.25));
    updatePlayerHpMp(ctx.userId, ctx.guildId, Math.max(1, player.hp - dmg), player.mp);
    return finish(ctx, simpleEmbed(COLORS.danger, `💃 Bạn nhảy không dừng được... họ không thả bạn ra cho đến tận nửa đêm, kiệt sức!\n❤️ HP mất **${dmg}**`));
  }
  if (id === `ffc_observe_${ctx.userId}`) {
    const exp = randInt(18, 36); grantExp(ctx.userId, ctx.guildId, exp);
    addItem(ctx.userId, ctx.guildId, 'mysterious_shard', 1);
    return finish(ctx, simpleEmbed(COLORS.success, `👁️ Bạn ngồi xem và học được điều gì đó kỳ bí.\n⭐ +**${exp} EXP**\n💎 +**1× Mysterious Shard** (rơi ra từ vũ điệu)`));
  }
  const dmg = Math.max(1, Math.floor(player.max_hp * 0.2));
  updatePlayerHpMp(ctx.userId, ctx.guildId, Math.max(1, player.hp - dmg), player.mp);
  const rep = adjustReputation(ctx.userId, ctx.guildId, -4);
  return finish(ctx, new EmbedBuilder().setColor(COLORS.warning).setTitle('⚡ Cơn Giận Của Tiên')
    .setDescription(`Bạn bước vào và phá vỡ vũ điệu — họ biến mất nhưng để lại một lời nguyền rủa nhẹ.\n❤️ HP mất **${dmg}**\n🤝 Reputation: **${rep}** (-4)`));
}

export async function showForestPilgrimGroup(ctx: RunExploreEventInput): Promise<void> {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`fpg_join_${ctx.userId}`).setLabel('Cùng đi một đoạn').setEmoji('🚶').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`fpg_donate_${ctx.userId}`).setLabel('Quyên tiền').setEmoji('💰').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`fpg_bless_${ctx.userId}`).setLabel('Xin ban phúc').setEmoji('🙏').setStyle(ButtonStyle.Secondary),
  );
  const embed = new EmbedBuilder().setColor(0xF5DEB3).setTitle('🙏 Nhóm Hành Hương')
    .setDescription('Một nhóm người già trẻ lớn bé mang đèn lồng và cờ hiệu đi qua rừng theo con đường hẹp, hát vang bài thánh ca.');
  const reply = await ctx.interaction.editReply({ embeds: [embed], components: [row] });
  const btn = await awaitVote(ctx, reply, 30_000);
  if (!btn || !btn.isButton()) return finish(ctx, simpleEmbed(COLORS.info, '🙏 *Nhóm hành hương đi qua, tiếng hát vang xa.*'));
  await btn.deferUpdate().catch(() => {});
  const player = getPlayer(ctx.userId, ctx.guildId)!;
  const id = btn.customId;
  if (id === `fpg_join_${ctx.userId}`) {
    const exp = randInt(14, 32); grantExp(ctx.userId, ctx.guildId, exp);
    const rep = adjustReputation(ctx.userId, ctx.guildId, 3);
    addItem(ctx.userId, ctx.guildId, 'bread', 2);
    return finish(ctx, simpleEmbed(COLORS.success, `🚶 Bạn đi cùng một đoạn. Họ chia sẻ bánh mì và chuyện phiếm vui vẻ.\n🍞 +**2× Bread**\n⭐ +**${exp} EXP**\n🤝 Reputation: **${rep}** (+3)`));
  }
  if (id === `fpg_donate_${ctx.userId}`) {
    const cost = 20;
    if (player.gold < cost) return finish(ctx, simpleEmbed(COLORS.warning, `💰 Bạn không đủ **${cost} Gold**.`));
    grantGold(ctx.userId, ctx.guildId, -cost);
    const rep = adjustReputation(ctx.userId, ctx.guildId, 5);
    const hp = Math.min(player.max_hp, player.hp + Math.floor(player.max_hp * 0.25));
    updatePlayerHpMp(ctx.userId, ctx.guildId, hp, player.mp);
    return finish(ctx, simpleEmbed(COLORS.success, `💰 Người dẫn đầu cảm ơn và ban phúc lành cho bạn.\n🪙 -**${cost} Gold**\n❤️ HP hồi 25%\n🤝 Reputation: **${rep}** (+5)`));
  }
  const hp = Math.min(player.max_hp, player.hp + Math.floor(player.max_hp * 0.15));
  const mp = Math.min(player.max_mp, player.mp + Math.floor(player.max_mp * 0.15));
  updatePlayerHpMp(ctx.userId, ctx.guildId, hp, mp);
  return finish(ctx, simpleEmbed(COLORS.success, `🙏 Người lãnh đạo nhóm đặt tay lên đầu bạn và đọc lời chúc lành.\n❤️ HP hồi 15%\n🔵 MP hồi 15%`));
}

export async function showForestMadTrapper(ctx: RunExploreEventInput): Promise<void> {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`fmt_calm_${ctx.userId}`).setLabel('Trấn an').setEmoji('🤝').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`fmt_run_${ctx.userId}`).setLabel('Bỏ chạy').setEmoji('💨').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`fmt_spring_${ctx.userId}`).setLabel('Kích bẫy của hắn').setEmoji('💥').setStyle(ButtonStyle.Danger),
  );
  const embed = new EmbedBuilder().setColor(0x8B4513).setTitle('😱 Thợ Bẫy Điên')
    .setDescription('Một người đàn ông mặt mũi xơ xác, áo đầy bùn và máu, nhảy ra từ bụi cây với bẫy sắt trên tay.\n*"ĐỪNG ĐỘNG VÀO BẪY CỦA TÔI!"*');
  const reply = await ctx.interaction.editReply({ embeds: [embed], components: [row] });
  const btn = await awaitVote(ctx, reply, 30_000);
  if (!btn || !btn.isButton()) {
    const player = getPlayer(ctx.userId, ctx.guildId)!;
    const dmg = Math.max(1, Math.floor(player.max_hp * 0.1));
    updatePlayerHpMp(ctx.userId, ctx.guildId, Math.max(1, player.hp - dmg), player.mp);
    return finish(ctx, simpleEmbed(COLORS.danger, `😱 Bạn đứng quá lâu — hắn ném bẫy vào chân bạn!\n❤️ HP mất **${dmg}**`));
  }
  await btn.deferUpdate().catch(() => {});
  const player = getPlayer(ctx.userId, ctx.guildId)!;
  const id = btn.customId;
  if (id === `fmt_calm_${ctx.userId}`) {
    if (randInt(1, 100) <= 60) {
      addItem(ctx.userId, ctx.guildId, 'leather', 2);
      addItem(ctx.userId, ctx.guildId, 'meat', 1);
      return finish(ctx, simpleEmbed(COLORS.success, '🤝 Bạn nói chuyện nhẹ nhàng — hắn dần bình tĩnh và chia sẻ chiến lợi phẩm.\n🟫 +**2× Leather**\n🥩 +**1× Meat**'));
    }
    await ctx.interaction.editReply({ embeds: [simpleEmbed(COLORS.danger, '😱 Hắn điên quá không nghe — tấn công!')], components: [] });
    await new Promise(r => setTimeout(r, 600));
    return ctx.callbacks.startCombat(pick(ctx.enemies).id);
  }
  if (id === `fmt_run_${ctx.userId}`) {
    if (randInt(1, 100) <= 65) return finish(ctx, simpleEmbed(COLORS.success, '💨 Bạn chạy thoát — hắn gào thét đằng sau nhưng không đuổi kịp.'));
    const dmg = Math.max(1, Math.floor(player.max_hp * 0.08));
    updatePlayerHpMp(ctx.userId, ctx.guildId, Math.max(1, player.hp - dmg), player.mp);
    return finish(ctx, simpleEmbed(COLORS.warning, `💨 Bạn giẫm phải bẫy của hắn khi chạy!\n❤️ HP mất **${dmg}**`));
  }
  const dmg = Math.max(1, Math.floor(player.max_hp * 0.05));
  updatePlayerHpMp(ctx.userId, ctx.guildId, Math.max(1, player.hp - dmg), player.mp);
  addItem(ctx.userId, ctx.guildId, 'leather', 3);
  return finish(ctx, simpleEmbed(COLORS.warning, `💥 Bẫy nổ — hắn hoảng loạn bỏ chạy, để lại đống đồ.\n🟫 +**3× Leather**\n❤️ HP mất **${dmg}**`));
}

export async function showForestChildRunaway(ctx: RunExploreEventInput): Promise<void> {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`fcr_return_${ctx.userId}`).setLabel('Đưa trẻ về nhà').setEmoji('🏠').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`fcr_protect_${ctx.userId}`).setLabel('Để trẻ ở lại một lúc').setEmoji('🛡️').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`fcr_food_${ctx.userId}`).setLabel('Cho trẻ ăn').setEmoji('🍞').setStyle(ButtonStyle.Secondary),
  );
  const embed = new EmbedBuilder().setColor(0xFFD700).setTitle('👦 Đứa Trẻ Bỏ Nhà')
    .setDescription('Một đứa trẻ chừng 10 tuổi ngồi dưới gốc cây, ôm gối khóc nức nở.\n*"Con không muốn về nhà... ba con đánh con."*');
  const reply = await ctx.interaction.editReply({ embeds: [embed], components: [row] });
  const btn = await awaitVote(ctx, reply, 30_000);
  if (!btn || !btn.isButton()) return finish(ctx, simpleEmbed(COLORS.info, '👦 *Bạn để đứa trẻ yên và đi tiếp.*'));
  await btn.deferUpdate().catch(() => {});
  const id = btn.customId;
  if (id === `fcr_return_${ctx.userId}`) {
    const rep = adjustReputation(ctx.userId, ctx.guildId, 8);
    const exp = randInt(14, 28); grantExp(ctx.userId, ctx.guildId, exp);
    addItem(ctx.userId, ctx.guildId, 'health_potion', 1);
    return finish(ctx, new EmbedBuilder().setColor(COLORS.success).setTitle('🏠 Đưa Trẻ Về')
      .setDescription(`Bạn dỗ dành rồi đưa trẻ về làng. Dân làng cảm ơn bạn và tặng quà.\n🧪 +**1× Health Potion**\n⭐ +**${exp} EXP**\n🤝 Reputation: **${rep}** (+8)`));
  }
  if (id === `fcr_protect_${ctx.userId}`) {
    const exp = randInt(10, 21); grantExp(ctx.userId, ctx.guildId, exp);
    return finish(ctx, simpleEmbed(COLORS.info, `🛡️ Bạn ngồi cạnh trẻ một lúc, kể chuyện. Sau đó trẻ tự nguyện quay về.\n⭐ +**${exp} EXP**`));
  }
  addItem(ctx.userId, ctx.guildId, 'bread', 1);
  const rep = adjustReputation(ctx.userId, ctx.guildId, 2);
  return finish(ctx, simpleEmbed(COLORS.success, `🍞 Trẻ ăn xong nhoẻn miệng cười lần đầu. Rồi trẻ tự đứng dậy đi về.\n🍞 -**1× Bread** (đã cho)\n🤝 Reputation: **${rep}** (+2)`));
}

export async function showForestDryadBlessing(ctx: RunExploreEventInput): Promise<void> {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`fdb_accept_${ctx.userId}`).setLabel('Nhận phúc lành').setEmoji('🌿').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`fdb_offer_${ctx.userId}`).setLabel('Dâng lễ vật').setEmoji('🌺').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`fdb_reject_${ctx.userId}`).setLabel('Từ chối').setEmoji('🚫').setStyle(ButtonStyle.Secondary),
  );
  const embed = new EmbedBuilder().setColor(0x00FF7F).setTitle('🌿 Tiên Cây Xuất Hiện')
    .setDescription('Từ thân cây cổ thụ, một hình bóng xanh trong suốt bước ra — tiên cây, người bảo vệ khu rừng này.\n*"Kẻ lữ hành... ngươi đã đi qua lãnh địa của ta. Ta muốn ban thưởng."*');
  const reply = await ctx.interaction.editReply({ embeds: [embed], components: [row] });
  const btn = await awaitVote(ctx, reply, 30_000);
  if (!btn || !btn.isButton()) return finish(ctx, simpleEmbed(COLORS.info, '🌿 *Bóng hình xanh tan biến vào không khí.*'));
  await btn.deferUpdate().catch(() => {});
  const player = getPlayer(ctx.userId, ctx.guildId)!;
  const id = btn.customId;
  if (id === `fdb_accept_${ctx.userId}`) {
    const hp = Math.min(player.max_hp, player.hp + Math.floor(player.max_hp * 0.4));
    const mp = Math.min(player.max_mp, player.mp + Math.floor(player.max_mp * 0.4));
    updatePlayerHpMp(ctx.userId, ctx.guildId, hp, mp);
    addItem(ctx.userId, ctx.guildId, 'rare_herb', 1);
    const rep = adjustReputation(ctx.userId, ctx.guildId, 4);
    return finish(ctx, new EmbedBuilder().setColor(COLORS.success).setTitle('🌿 Phúc Lành Tiên Cây')
      .setDescription(`Ánh sáng xanh bao phủ toàn thân — vết thương tan biến, tâm trí minh mẫn.\n❤️ HP hồi 40%\n🔵 MP hồi 40%\n🌺 +**1× Rare Herb**\n🤝 Reputation: **${rep}** (+4)`));
  }
  if (id === `fdb_offer_${ctx.userId}`) {
    addItem(ctx.userId, ctx.guildId, 'mysterious_shard', 1);
    addItem(ctx.userId, ctx.guildId, 'rare_herb', 2);
    const exp = randInt(25, 46); grantExp(ctx.userId, ctx.guildId, exp);
    const rep = adjustReputation(ctx.userId, ctx.guildId, 6);
    return finish(ctx, new EmbedBuilder().setColor(COLORS.magic).setTitle('🌺 Lễ Vật Được Đón Nhận')
      .setDescription(`Tiên cây hài lòng với tấm lòng thành của bạn và ban nhiều hơn.\n💎 +**1× Mysterious Shard**\n🌺 +**2× Rare Herb**\n⭐ +**${exp} EXP**\n🤝 Reputation: **${rep}** (+6)`));
  }
  return finish(ctx, simpleEmbed(COLORS.info, '🚫 *Tiên cây gật đầu tôn trọng rồi biến vào cây.*'));
}

export async function showForestTravelingBard(ctx: RunExploreEventInput): Promise<void> {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`ftb_listen_${ctx.userId}`).setLabel('Nghe hát').setEmoji('🎵').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`ftb_perform_${ctx.userId}`).setLabel('Biểu diễn cùng').setEmoji('🎭').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`ftb_buy_${ctx.userId}`).setLabel('Mua bài hát').setEmoji('💰').setStyle(ButtonStyle.Secondary),
  );
  const embed = new EmbedBuilder().setColor(0xFF6347).setTitle('🎸 Nhạc Sĩ Lữ Hành')
    .setDescription('Một nhạc sĩ trẻ mặc áo choàng đỏ đang ngồi trên tảng đá, gảy đàn lute và ca hát một mình giữa rừng.');
  const reply = await ctx.interaction.editReply({ embeds: [embed], components: [row] });
  const btn = await awaitVote(ctx, reply, 30_000);
  if (!btn || !btn.isButton()) return finish(ctx, simpleEmbed(COLORS.info, '🎵 *Tiếng đàn vọng theo bạn một lúc rồi tắt.*'));
  await btn.deferUpdate().catch(() => {});
  const player = getPlayer(ctx.userId, ctx.guildId)!;
  const id = btn.customId;
  if (id === `ftb_listen_${ctx.userId}`) {
    const mp = Math.min(player.max_mp, player.mp + Math.floor(player.max_mp * 0.35));
    updatePlayerHpMp(ctx.userId, ctx.guildId, player.hp, mp);
    const exp = randInt(10, 25); grantExp(ctx.userId, ctx.guildId, exp);
    return finish(ctx, simpleEmbed(COLORS.success, `🎵 Bài hát về những chuyến phiêu lưu khơi dậy tinh thần chiến đấu trong bạn.\n🔵 MP hồi 35%\n⭐ +**${exp} EXP**`));
  }
  if (id === `ftb_perform_${ctx.userId}`) {
    const gold = randInt(9, 24); grantGold(ctx.userId, ctx.guildId, gold);
    const exp = randInt(18, 36); grantExp(ctx.userId, ctx.guildId, exp);
    return finish(ctx, simpleEmbed(COLORS.success, `🎭 Hai người biểu diễn cùng nhau — thú vị và bất ngờ kiếm được tiền thưởng từ người qua đường!\n🪙 +**${gold} Gold**\n⭐ +**${exp} EXP**`));
  }
  const cost = 25;
  if (player.gold < cost) return finish(ctx, simpleEmbed(COLORS.warning, `💰 Không đủ **${cost} Gold** để mua bài hát.`));
  grantGold(ctx.userId, ctx.guildId, -cost);
  addItem(ctx.userId, ctx.guildId, 'bard_song', 1);
  return finish(ctx, simpleEmbed(COLORS.success, `💰 Bạn trả **${cost} Gold** để mua bài hát ghi trên cuộn giấy.\n📜 +**1× Bard Song**`));
}

export async function showForestBeastTamer(ctx: RunExploreEventInput): Promise<void> {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`fbt_trade_${ctx.userId}`).setLabel('Trao đổi vật phẩm').setEmoji('💼').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`fbt_learn_${ctx.userId}`).setLabel('Học thuật thuần thú').setEmoji('📖').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`fbt_help_${ctx.userId}`).setLabel('Giúp bắt thú hoang').setEmoji('🦁').setStyle(ButtonStyle.Secondary),
  );
  const embed = new EmbedBuilder().setColor(0x228B22).setTitle('🦁 Người Thuần Hóa Thú')
    .setDescription('Một người phụ nữ khỏe mạnh đang ngồi giữa đám thú nhỏ — cáo, thỏ, và một con linh miêu. Tất cả đều thuần tính lạ thường.');
  const reply = await ctx.interaction.editReply({ embeds: [embed], components: [row] });
  const btn = await awaitVote(ctx, reply, 30_000);
  if (!btn || !btn.isButton()) return finish(ctx, simpleEmbed(COLORS.info, '🦁 *Bạn gật đầu chào bà ta rồi đi tiếp.*'));
  await btn.deferUpdate().catch(() => {});
  const id = btn.customId;
  if (id === `fbt_trade_${ctx.userId}`) {
    addItem(ctx.userId, ctx.guildId, 'leather', 2);
    addItem(ctx.userId, ctx.guildId, 'wolf_fang', 1);
    const gold = randInt(9, 21); grantGold(ctx.userId, ctx.guildId, gold);
    return finish(ctx, simpleEmbed(COLORS.success, `💼 Bà đổi nguyên liệu thú với giá phải chăng.\n🟫 +**2× Leather**\n🦷 +**1× Wolf Fang**\n🪙 +**${gold} Gold**`));
  }
  if (id === `fbt_learn_${ctx.userId}`) {
    const exp = randInt(28, 57); grantExp(ctx.userId, ctx.guildId, exp);
    return finish(ctx, simpleEmbed(COLORS.success, `📖 Bà dạy bạn cách đọc ngôn ngữ cơ thể của thú rừng.\n⭐ +**${exp} EXP**`));
  }
  const roll = randInt(1, 100);
  if (roll <= 60) {
    addItem(ctx.userId, ctx.guildId, 'leather', 3);
    addItem(ctx.userId, ctx.guildId, 'meat', 2);
    const exp = randInt(18, 36); grantExp(ctx.userId, ctx.guildId, exp);
    return finish(ctx, simpleEmbed(COLORS.success, `🦁 Cùng nhau bắt được một con thú hoang!\n🟫 +**3× Leather**\n🥩 +**2× Meat**\n⭐ +**${exp} EXP**`));
  }
  const player = getPlayer(ctx.userId, ctx.guildId)!;
  const dmg = Math.max(1, Math.floor(player.max_hp * 0.1));
  updatePlayerHpMp(ctx.userId, ctx.guildId, Math.max(1, player.hp - dmg), player.mp);
  return finish(ctx, simpleEmbed(COLORS.warning, `🦁 Con thú cào bạn trước khi bị bắt.\n❤️ HP mất **${dmg}**`));
}

// ════════════════════════════════════════════════════════════════
//  FOREST — LORE / MYSTERY  (10 events)
// ════════════════════════════════════════════════════════════════

export async function showForestAncientRuins(ctx: RunExploreEventInput): Promise<void> {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`far_explore_${ctx.userId}`).setLabel('Khám phá').setEmoji('🏛️').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`far_rune_${ctx.userId}`).setLabel('Lấy đá rune').setEmoji('🔮').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`far_blood_${ctx.userId}`).setLabel('Hiến máu lên đàn').setEmoji('🩸').setStyle(ButtonStyle.Danger),
  );
  const embed = new EmbedBuilder().setColor(0x8B7355).setTitle('🏛️ Tàn Tích Cổ Đại')
    .setDescription('Giữa tán rừng dày đặc, những cột đá phủ rêu nhô lên từ đất. Chữ khắc cổ đại vẫn còn sắc nét — ngôn ngữ không ai biết nữa.');
  const reply = await ctx.interaction.editReply({ embeds: [embed], components: [row] });
  const btn = await awaitVote(ctx, reply, 30_000);
  if (!btn || !btn.isButton()) return finish(ctx, simpleEmbed(COLORS.info, '🏛️ *Bạn nhìn những cột đá im lặng rồi rời đi.*'));
  await btn.deferUpdate().catch(() => {});
  const player = getPlayer(ctx.userId, ctx.guildId)!;
  const id = btn.customId;
  if (id === `far_explore_${ctx.userId}`) {
    const exp = randInt(25, 46); grantExp(ctx.userId, ctx.guildId, exp);
    const roll = randInt(1, 100);
    if (roll <= 40) { addItem(ctx.userId, ctx.guildId, 'broken_rune', 1); return finish(ctx, simpleEmbed(COLORS.success, `🏛️ Bạn tìm thấy một mảnh rune còn nguyên vẹn trong kẽ đá.\n🔷 +**1× Broken Rune**\n⭐ +**${exp} EXP**`)); }
    const gold = randInt(12, 31); grantGold(ctx.userId, ctx.guildId, gold);
    return finish(ctx, simpleEmbed(COLORS.success, `🏛️ Khám phá tàn tích, bạn thấy đồng xu cổ rải rác.\n🪙 +**${gold} Gold**\n⭐ +**${exp} EXP**`));
  }
  if (id === `far_rune_${ctx.userId}`) {
    if (randInt(1, 100) <= 55) {
      addItem(ctx.userId, ctx.guildId, 'rune_stone', 1);
      return finish(ctx, simpleEmbed(COLORS.success, '🔮 Bạn cẩn thận tách đá rune khỏi cột.\n🔮 +**1× Rune Stone**'));
    }
    const dmg = Math.max(1, Math.floor(player.max_hp * 0.12));
    updatePlayerHpMp(ctx.userId, ctx.guildId, Math.max(1, player.hp - dmg), player.mp);
    addItem(ctx.userId, ctx.guildId, 'broken_rune', 1);
    return finish(ctx, simpleEmbed(COLORS.warning, `🔮 Bùa phòng thủ kích hoạt khi bạn cố lấy!\n🔷 +**1× Broken Rune** (vỡ)\n❤️ HP mất **${dmg}**`));
  }
  const dmg = Math.max(1, Math.floor(player.max_hp * 0.08));
  updatePlayerHpMp(ctx.userId, ctx.guildId, Math.max(1, player.hp - dmg), player.mp);
  const exp = randInt(36, 64); grantExp(ctx.userId, ctx.guildId, exp);
  addItem(ctx.userId, ctx.guildId, 'mysterious_shard', 1);
  return finish(ctx, new EmbedBuilder().setColor(COLORS.magic).setTitle('🩸 Máu Thức Tỉnh Cổ Vật')
    .setDescription(`Đàn đá rung lên và sáng lên một lúc. Một vật gì đó vật chất hóa trong tay bạn.\n💎 +**1× Mysterious Shard**\n⭐ +**${exp} EXP**\n❤️ HP mất **${dmg}**`));
}

export async function showForestMagicSpring(ctx: RunExploreEventInput): Promise<void> {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`fms_drink_${ctx.userId}`).setLabel('Uống nước suối').setEmoji('💧').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`fms_bathe_${ctx.userId}`).setLabel('Ngâm mình').setEmoji('🛁').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`fms_collect_${ctx.userId}`).setLabel('Thu thập vào bình').setEmoji('🧪').setStyle(ButtonStyle.Secondary),
  );
  const embed = new EmbedBuilder().setColor(0x00BFFF).setTitle('💧 Suối Phép Thuật')
    .setDescription('Một con suối nhỏ chảy qua đá rêu — nước trong xanh và phát ra ánh sáng dịu nhẹ. Hoa rừng xung quanh nở rộ bất thường.');
  const reply = await ctx.interaction.editReply({ embeds: [embed], components: [row] });
  const btn = await awaitVote(ctx, reply, 30_000);
  if (!btn || !btn.isButton()) return finish(ctx, simpleEmbed(COLORS.info, '💧 *Bạn lắng nghe tiếng suối rồi tiếp tục đường.*'));
  await btn.deferUpdate().catch(() => {});
  const player = getPlayer(ctx.userId, ctx.guildId)!;
  const id = btn.customId;
  if (id === `fms_drink_${ctx.userId}`) {
    const roll = randInt(1, 100);
    if (roll <= 70) {
      const hp = Math.min(player.max_hp, player.hp + Math.floor(player.max_hp * 0.5));
      const mp = Math.min(player.max_mp, player.mp + Math.floor(player.max_mp * 0.5));
      updatePlayerHpMp(ctx.userId, ctx.guildId, hp, mp);
      return finish(ctx, simpleEmbed(COLORS.success, `💧 Ngọt mát và ấm áp — cơ thể hồi phục nhanh chóng.\n❤️ HP hồi 50%\n🔵 MP hồi 50%`));
    }
    const dmg = Math.max(1, Math.floor(player.max_hp * 0.1));
    updatePlayerHpMp(ctx.userId, ctx.guildId, Math.max(1, player.hp - dmg), player.mp);
    return finish(ctx, simpleEmbed(COLORS.danger, `💧 Phản ứng kỳ lạ — người nóng ran và đau đầu!\n❤️ HP mất **${dmg}**`));
  }
  if (id === `fms_bathe_${ctx.userId}`) {
    const hp = Math.min(player.max_hp, player.hp + Math.floor(player.max_hp * 0.8));
    updatePlayerHpMp(ctx.userId, ctx.guildId, hp, player.mp);
    const exp = randInt(14, 28); grantExp(ctx.userId, ctx.guildId, exp);
    return finish(ctx, simpleEmbed(COLORS.success, `🛁 Bạn ngâm mình trong suối. Vết thương lành như chưa từng có.\n❤️ HP hồi 80%\n⭐ +**${exp} EXP**`));
  }
  addItem(ctx.userId, ctx.guildId, 'moonwater', 2);
  return finish(ctx, simpleEmbed(COLORS.success, '🧪 Bạn cẩn thận múc nước vào bình.\n💧 +**2× Moonwater**'));
}

export async function showForestStoneCircle(ctx: RunExploreEventInput): Promise<void> {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`fsc2_center_${ctx.userId}`).setLabel('Đứng vào trung tâm').setEmoji('⚡').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`fsc2_offer_${ctx.userId}`).setLabel('Đặt vật phẩm').setEmoji('🎁').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`fsc2_map_${ctx.userId}`).setLabel('Phác họa bản đồ').setEmoji('🗺️').setStyle(ButtonStyle.Secondary),
  );
  const embed = new EmbedBuilder().setColor(0x708090).setTitle('🗿 Vòng Đá Bí Ẩn')
    .setDescription('Mười hai tảng đá đứng thành vòng tròn hoàn hảo — không tảng nào giống tảng nào, nhưng chúng đứng đều nhau đến từng centimet.');
  const reply = await ctx.interaction.editReply({ embeds: [embed], components: [row] });
  const btn = await awaitVote(ctx, reply, 30_000);
  if (!btn || !btn.isButton()) return finish(ctx, simpleEmbed(COLORS.info, '🗿 *Bạn đi quanh vòng đá rồi tiếp tục.*'));
  await btn.deferUpdate().catch(() => {});
  const player = getPlayer(ctx.userId, ctx.guildId)!;
  const id = btn.customId;
  if (id === `fsc2_center_${ctx.userId}`) {
    const roll = randInt(1, 100);
    if (roll <= 50) {
      const exp = randInt(36, 72); grantExp(ctx.userId, ctx.guildId, exp);
      addItem(ctx.userId, ctx.guildId, 'rune_stone', 1);
      return finish(ctx, simpleEmbed(COLORS.magic, `⚡ Một luồng năng lượng cổ đại chạy qua người bạn!\n⭐ +**${exp} EXP**\n🔮 +**1× Rune Stone**`));
    }
    const dmg = Math.max(1, Math.floor(player.max_hp * 0.2));
    updatePlayerHpMp(ctx.userId, ctx.guildId, Math.max(1, player.hp - dmg), player.mp);
    return finish(ctx, simpleEmbed(COLORS.danger, `⚡ Sét đánh thẳng xuống trung tâm!\n❤️ HP mất **${dmg}**`));
  }
  if (id === `fsc2_offer_${ctx.userId}`) {
    const exp = randInt(21, 43); grantExp(ctx.userId, ctx.guildId, exp);
    const hp = Math.min(player.max_hp, player.hp + Math.floor(player.max_hp * 0.3));
    updatePlayerHpMp(ctx.userId, ctx.guildId, hp, player.mp);
    return finish(ctx, simpleEmbed(COLORS.success, `🎁 Bạn đặt thứ gì đó lên tảng đá chính. Vòng đá sáng lên xanh lịm.\n❤️ HP hồi 30%\n⭐ +**${exp} EXP**`));
  }
  const exp = randInt(14, 32); grantExp(ctx.userId, ctx.guildId, exp);
  addItem(ctx.userId, ctx.guildId, 'mysterious_shard', 1);
  return finish(ctx, simpleEmbed(COLORS.success, `🗺️ Bạn vẽ lại hình dạng vòng đá — có lẽ sẽ hữu ích sau này.\n⭐ +**${exp} EXP**\n💎 +**1× Mysterious Shard**`));
}

export async function showForestSpiritLantern(ctx: RunExploreEventInput): Promise<void> {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`fsl_follow_${ctx.userId}`).setLabel('Đi theo').setEmoji('🔦').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`fsl_grab_${ctx.userId}`).setLabel('Chụp lấy đèn').setEmoji('✋').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`fsl_ignore_${ctx.userId}`).setLabel('Phớt lờ').setEmoji('🚫').setStyle(ButtonStyle.Secondary),
  );
  const embed = new EmbedBuilder().setColor(0x90EE90).setTitle('🪔 Đèn Lồng Ma Trơi')
    .setDescription('Một đốm sáng vàng xanh lơ lửng trong không khí, nhấp nhô như đang vẫy gọi bạn đi vào sâu trong rừng.');
  const reply = await ctx.interaction.editReply({ embeds: [embed], components: [row] });
  const btn = await awaitVote(ctx, reply, 30_000);
  if (!btn || !btn.isButton()) return finish(ctx, simpleEmbed(COLORS.info, '🪔 *Đèn lồng tắt dần khi bạn không tiếp cận.*'));
  await btn.deferUpdate().catch(() => {});
  const player = getPlayer(ctx.userId, ctx.guildId)!;
  const id = btn.customId;
  if (id === `fsl_follow_${ctx.userId}`) {
    const roll = randInt(1, 100);
    if (roll <= 60) {
      const gold = randInt(24, 55); grantGold(ctx.userId, ctx.guildId, gold);
      addItem(ctx.userId, ctx.guildId, 'mysterious_shard', 1);
      return finish(ctx, new EmbedBuilder().setColor(COLORS.magic).setTitle('🪔 Kho Báu Bí Ẩn')
        .setDescription(`Đèn dẫn bạn đến một gốc cây rỗng với kho báu bên trong!\n🪙 +**${gold} Gold**\n💎 +**1× Mysterious Shard**`));
    }
    const dmg = Math.max(1, Math.floor(player.max_hp * 0.18));
    updatePlayerHpMp(ctx.userId, ctx.guildId, Math.max(1, player.hp - dmg), player.mp);
    return finish(ctx, simpleEmbed(COLORS.danger, `🪔 Đèn dẫn bạn vào đầm lầy — bạn lội ra với khó khăn.\n❤️ HP mất **${dmg}**`));
  }
  if (id === `fsl_grab_${ctx.userId}`) {
    const roll = randInt(1, 100);
    if (roll <= 40) {
      addItem(ctx.userId, ctx.guildId, 'spirit_essence', 1);
      return finish(ctx, simpleEmbed(COLORS.magic, '✋ Ánh sáng tan vào tay bạn — một cảm giác ấm áp lan khắp người.\n✨ +**1× Spirit Essence**'));
    }
    const dmg = Math.max(1, Math.floor(player.max_hp * 0.15));
    updatePlayerHpMp(ctx.userId, ctx.guildId, Math.max(1, player.hp - dmg), player.mp);
    return finish(ctx, simpleEmbed(COLORS.danger, `✋ Đèn phát nổ khi bị chạm vào — ánh sáng chói mắt và đốt tay!\n❤️ HP mất **${dmg}**`));
  }
  return finish(ctx, simpleEmbed(COLORS.info, '🚫 *Bạn đứng quan sát đèn trôi đi rồi tắt dần vào màn đêm.*'));
}

export async function showForestCursedStatue(ctx: RunExploreEventInput): Promise<void> {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`fcs2_smash_${ctx.userId}`).setLabel('Đập vỡ').setEmoji('🔨').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`fcs2_pray_${ctx.userId}`).setLabel('Cầu nguyện trước tượng').setEmoji('🙏').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`fcs2_study_${ctx.userId}`).setLabel('Nghiên cứu nguyền rủa').setEmoji('📖').setStyle(ButtonStyle.Secondary),
  );
  const embed = new EmbedBuilder().setColor(0x2F4F4F).setTitle('🗿 Tượng Đá Nguyền Rủa')
    .setDescription('Một bức tượng nhỏ mắt đỏ ngồi trên tảng đá phủ rêu. Xung quanh là xương chim và hoa khô héo — không thứ gì sống được gần nó.');
  const reply = await ctx.interaction.editReply({ embeds: [embed], components: [row] });
  const btn = await awaitVote(ctx, reply, 30_000);
  if (!btn || !btn.isButton()) return finish(ctx, simpleEmbed(COLORS.info, '🗿 *Bạn tránh xa bức tượng và đi tiếp.*'));
  await btn.deferUpdate().catch(() => {});
  const player = getPlayer(ctx.userId, ctx.guildId)!;
  const id = btn.customId;
  if (id === `fcs2_smash_${ctx.userId}`) {
    const roll = randInt(1, 100);
    if (roll <= 45) {
      addItem(ctx.userId, ctx.guildId, 'soul_dust', 2);
      const rep = adjustReputation(ctx.userId, ctx.guildId, 3);
      return finish(ctx, simpleEmbed(COLORS.success, `🔨 Tượng vỡ ra — bụi linh hồn thoát ra và rải xuống tay bạn.\n✨ +**2× Soul Dust**\n🤝 Reputation: **${rep}** (+3)`));
    }
    const dmg = Math.max(1, Math.floor(player.max_hp * 0.2));
    updatePlayerHpMp(ctx.userId, ctx.guildId, Math.max(1, player.hp - dmg), player.mp);
    return finish(ctx, simpleEmbed(COLORS.danger, `🔨 Nguyền rủa phản lại người phá tượng!\n❤️ HP mất **${dmg}**`));
  }
  if (id === `fcs2_pray_${ctx.userId}`) {
    const roll = randInt(1, 100);
    if (roll <= 55) {
      const hp = Math.min(player.max_hp, player.hp + Math.floor(player.max_hp * 0.3));
      updatePlayerHpMp(ctx.userId, ctx.guildId, hp, player.mp);
      return finish(ctx, simpleEmbed(COLORS.success, `🙏 Nguyền rủa nguội lạnh khi bạn cúi đầu thành kính.\n❤️ HP hồi 30%`));
    }
    const dmg = Math.max(1, Math.floor(player.max_hp * 0.1));
    updatePlayerHpMp(ctx.userId, ctx.guildId, Math.max(1, player.hp - dmg), player.mp);
    return finish(ctx, simpleEmbed(COLORS.warning, `🙏 Tượng không chấp nhận lời cầu nguyện của bạn.\n❤️ HP mất **${dmg}**`));
  }
  const exp = randInt(28, 54); grantExp(ctx.userId, ctx.guildId, exp);
  addItem(ctx.userId, ctx.guildId, 'broken_rune', 1);
  return finish(ctx, simpleEmbed(COLORS.success, `📖 Bạn giải mã được một phần nguyền rủa — kiến thức quý giá.\n⭐ +**${exp} EXP**\n🔷 +**1× Broken Rune**`));
}

export async function showForestMemoryTree(ctx: RunExploreEventInput): Promise<void> {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`fmt2_touch_${ctx.userId}`).setLabel('Chạm tay vào').setEmoji('✋').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`fmt2_carve_${ctx.userId}`).setLabel('Khắc ký ức').setEmoji('🗡️').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`fmt2_listen_${ctx.userId}`).setLabel('Nghe ký ức cây').setEmoji('👂').setStyle(ButtonStyle.Secondary),
  );
  const embed = new EmbedBuilder().setColor(0x556B2F).setTitle('🌳 Cây Ký Ức')
    .setDescription('Vỏ cây này không phải vỏ cây — đó là hàng ngàn hàng ngàn hình ảnh nhỏ xíu khắc vào nhau. Mặt người, nơi chốn, thời khắc... kéo dài vô tận.');
  const reply = await ctx.interaction.editReply({ embeds: [embed], components: [row] });
  const btn = await awaitVote(ctx, reply, 30_000);
  if (!btn || !btn.isButton()) return finish(ctx, simpleEmbed(COLORS.info, '🌳 *Bạn rời đi, mang theo cảm giác kỳ lạ khó tả.*'));
  await btn.deferUpdate().catch(() => {});
  const player = getPlayer(ctx.userId, ctx.guildId)!;
  const id = btn.customId;
  if (id === `fmt2_touch_${ctx.userId}`) {
    const outcomes = [
      () => { const exp = randInt(36, 72); grantExp(ctx.userId, ctx.guildId, exp); return simpleEmbed(COLORS.magic, `✋ Một dòng ký ức của ai đó chảy vào tâm trí bạn — trí thức cổ đại.\n⭐ +**${exp} EXP**`); },
      () => { const hp = Math.min(player.max_hp, player.hp + Math.floor(player.max_hp * 0.4)); updatePlayerHpMp(ctx.userId, ctx.guildId, hp, player.mp); return simpleEmbed(COLORS.success, `✋ Cây nhận ra nỗi đau của bạn và chữa lành.\n❤️ HP hồi 40%`); },
      () => { const dmg = Math.max(1, Math.floor(player.max_hp * 0.15)); updatePlayerHpMp(ctx.userId, ctx.guildId, Math.max(1, player.hp - dmg), player.mp); return simpleEmbed(COLORS.danger, `✋ Quá nhiều ký ức ùa vào cùng lúc — đầu bạn nhói đau!\n❤️ HP mất **${dmg}**`); },
      () => { addItem(ctx.userId, ctx.guildId, 'ancient_rune', 1); return simpleEmbed(COLORS.magic, '✋ Cây trao cho bạn một mảnh rune cổ đại tự động hiện ra trên lòng bàn tay.\n📜 +**1× Ancient Rune**'); },
    ];
    return finish(ctx, pick(outcomes)());
  }
  if (id === `fmt2_carve_${ctx.userId}`) {
    const dmg = Math.max(1, Math.floor(player.max_hp * 0.05));
    updatePlayerHpMp(ctx.userId, ctx.guildId, Math.max(1, player.hp - dmg), player.mp);
    const rep = adjustReputation(ctx.userId, ctx.guildId, 2);
    const exp = randInt(14, 28); grantExp(ctx.userId, ctx.guildId, exp);
    return finish(ctx, simpleEmbed(COLORS.success, `🗡️ Bạn khắc một ký ức của mình vào cây — cây rung nhẹ như cảm ơn.\n❤️ HP mất **${dmg}** (máu dính lên vỏ cây)\n⭐ +**${exp} EXP**\n🤝 Reputation: **${rep}** (+2)`));
  }
  const exp = randInt(43, 79); grantExp(ctx.userId, ctx.guildId, exp);
  return finish(ctx, simpleEmbed(COLORS.magic, `👂 Bạn ngồi lắng nghe hàng giờ — những câu chuyện về rừng này từ ngàn năm trước.\n⭐ +**${exp} EXP**`));
}

export async function showForestDreamFlower(ctx: RunExploreEventInput): Promise<void> {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`fdf_inhale_${ctx.userId}`).setLabel('Hít hương thơm').setEmoji('🌸').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`fdf_pick_${ctx.userId}`).setLabel('Hái hoa').setEmoji('✂️').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`fdf_leave_${ctx.userId}`).setLabel('Để yên').setStyle(ButtonStyle.Secondary),
  );
  const embed = new EmbedBuilder().setColor(0xDA70D6).setTitle('🌸 Hoa Giấc Mộng')
    .setDescription('Một bông hoa tím đậm to như chiếc đĩa nở giữa đêm, tỏa mùi hương ngọt ngào đến kỳ lạ. Bướm đêm bay quanh nó như bị thôi miên.');
  const reply = await ctx.interaction.editReply({ embeds: [embed], components: [row] });
  const btn = await awaitVote(ctx, reply, 30_000);
  if (!btn || !btn.isButton()) return finish(ctx, simpleEmbed(COLORS.info, '🌸 *Hương hoa vẫn còn trong ký ức bạn suốt một lúc.*'));
  await btn.deferUpdate().catch(() => {});
  const player = getPlayer(ctx.userId, ctx.guildId)!;
  const id = btn.customId;
  if (id === `fdf_inhale_${ctx.userId}`) {
    const roll = randInt(1, 100);
    if (roll <= 65) {
      const hp = Math.min(player.max_hp, player.hp + Math.floor(player.max_hp * 0.45));
      const mp = Math.min(player.max_mp, player.mp + Math.floor(player.max_mp * 0.6));
      updatePlayerHpMp(ctx.userId, ctx.guildId, hp, mp);
      return finish(ctx, simpleEmbed(COLORS.magic, `🌸 Bạn chìm vào một giấc mơ ngắn — tỉnh dậy thấy người như mới.\n❤️ HP hồi 45%\n🔵 MP hồi 60%`));
    }
    const dmg = Math.max(1, Math.floor(player.max_hp * 0.15));
    updatePlayerHpMp(ctx.userId, ctx.guildId, Math.max(1, player.hp - dmg), player.mp);
    return finish(ctx, simpleEmbed(COLORS.danger, `🌸 Ác mộng! Bạn co giật và tỉnh dậy trong sợ hãi.\n❤️ HP mất **${dmg}**`));
  }
  if (id === `fdf_pick_${ctx.userId}`) {
    addItem(ctx.userId, ctx.guildId, 'dream_petal', 2);
    return finish(ctx, simpleEmbed(COLORS.success, '✂️ Bạn hái cẩn thận vài cánh hoa về.\n🌸 +**2× Dream Petal**'));
  }
  return finish(ctx, simpleEmbed(COLORS.info, '🌸 *Bạn nhìn bông hoa từ xa và bước đi, mang theo sự bình yên kỳ lạ.*'));
}

export async function showForestEchoGrove(ctx: RunExploreEventInput): Promise<void> {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`feg_shout_${ctx.userId}`).setLabel('Hét to').setEmoji('📣').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`feg_listen_${ctx.userId}`).setLabel('Lắng nghe tiếng vang').setEmoji('👂').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`feg_silence_${ctx.userId}`).setLabel('Ngồi trong im lặng').setEmoji('🤫').setStyle(ButtonStyle.Secondary),
  );
  const embed = new EmbedBuilder().setColor(0x008080).setTitle('🌿 Khu Rừng Tiếng Vang')
    .setDescription('Khu rừng này bao phủ bởi im lặng kỳ lạ — rồi đột nhiên bạn nghe tiếng bước chân của chính mình vang lại từ mọi hướng, nhưng chậm hơn và... khác đi.');
  const reply = await ctx.interaction.editReply({ embeds: [embed], components: [row] });
  const btn = await awaitVote(ctx, reply, 30_000);
  if (!btn || !btn.isButton()) return finish(ctx, simpleEmbed(COLORS.info, '🌿 *Tiếng bước chân của bạn vang đi không dứt.*'));
  await btn.deferUpdate().catch(() => {});
  const player = getPlayer(ctx.userId, ctx.guildId)!;
  const id = btn.customId;
  if (id === `feg_shout_${ctx.userId}`) {
    const roll = randInt(1, 100);
    if (roll <= 55) {
      const exp = randInt(10, 21); grantExp(ctx.userId, ctx.guildId, exp);
      const gold = randInt(6, 15); grantGold(ctx.userId, ctx.guildId, gold);
      return finish(ctx, simpleEmbed(COLORS.success, `📣 Tiếng hét của bạn vang vọng rồi đổi thành tiếng nhạc lạ. Đá bên dưới chân rung nhẹ, phun ra vàng.\n🪙 +**${gold} Gold**\n⭐ +**${exp} EXP**`));
    }
    const dmg = Math.max(1, Math.floor(player.max_hp * 0.07));
    updatePlayerHpMp(ctx.userId, ctx.guildId, Math.max(1, player.hp - dmg), player.mp);
    return finish(ctx, simpleEmbed(COLORS.warning, `📣 Tiếng vang quá lớn làm ù tai và choáng váng!\n❤️ HP mất **${dmg}**`));
  }
  if (id === `feg_listen_${ctx.userId}`) {
    const exp = randInt(25, 50); grantExp(ctx.userId, ctx.guildId, exp);
    return finish(ctx, simpleEmbed(COLORS.magic, `👂 Bạn nghe được tiếng nói từ quá khứ — bí ẩn về khu rừng này đang dần hé lộ.\n⭐ +**${exp} EXP**`));
  }
  const mp = Math.min(player.max_mp, player.mp + Math.floor(player.max_mp * 0.5));
  updatePlayerHpMp(ctx.userId, ctx.guildId, player.hp, mp);
  const exp = randInt(14, 32); grantExp(ctx.userId, ctx.guildId, exp);
  return finish(ctx, simpleEmbed(COLORS.success, `🤫 Sự im lặng của bạn được rừng đón nhận — tâm trí thanh thản lạ thường.\n🔵 MP hồi 50%\n⭐ +**${exp} EXP**`));
}

export async function showForestTimeAnomaly(ctx: RunExploreEventInput): Promise<void> {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`fta_step_${ctx.userId}`).setLabel('Bước qua').setEmoji('🌀').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`fta_observe_${ctx.userId}`).setLabel('Quan sát từ xa').setEmoji('👁️').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`fta_flee_${ctx.userId}`).setLabel('Bỏ chạy').setEmoji('💨').setStyle(ButtonStyle.Secondary),
  );
  const embed = new EmbedBuilder().setColor(0x7B68EE).setTitle('🌀 Dị Thường Thời Gian')
    .setDescription('Một vùng không gian trước mặt bạn nhấp nháy — lá rơi ngược, ánh sáng xoáy theo chiều kim đồng hồ, và bạn có thể nghe tiếng bước chân của chính mình... từ phía trước.');
  const reply = await ctx.interaction.editReply({ embeds: [embed], components: [row] });
  const btn = await awaitVote(ctx, reply, 30_000);
  if (!btn || !btn.isButton()) return finish(ctx, simpleEmbed(COLORS.info, '🌀 *Vùng dị thường từ từ tan biến.*'));
  await btn.deferUpdate().catch(() => {});
  const player = getPlayer(ctx.userId, ctx.guildId)!;
  const id = btn.customId;
  if (id === `fta_step_${ctx.userId}`) {
    const roll = randInt(1, 100);
    if (roll <= 30) {
      const exp = randInt(57, 108); grantExp(ctx.userId, ctx.guildId, exp);
      addItem(ctx.userId, ctx.guildId, 'time_fragment', 1);
      return finish(ctx, new EmbedBuilder().setColor(COLORS.magic).setTitle('🌀 Du Hành Thời Gian')
        .setDescription(`Bạn tỉnh dậy một chỗ khác trong rừng — nhưng trí nhớ rõ hơn và mạnh hơn bao giờ hết.\n⭐ +**${exp} EXP**\n⌛ +**1× Time Fragment**`));
    }
    if (roll <= 70) {
      const hp = player.max_hp; const mp = player.max_mp;
      updatePlayerHpMp(ctx.userId, ctx.guildId, hp, mp);
      return finish(ctx, simpleEmbed(COLORS.success, `🌀 Bạn bước ra ở một thời điểm sớm hơn — cơ thể hoàn toàn hồi phục.\n❤️ HP đầy\n🔵 MP đầy`));
    }
    const dmg = Math.max(1, Math.floor(player.max_hp * 0.25));
    updatePlayerHpMp(ctx.userId, ctx.guildId, Math.max(1, player.hp - dmg), player.mp);
    return finish(ctx, simpleEmbed(COLORS.danger, `🌀 Thời gian xé toạc một phần cơ thể khi bạn đi qua!\n❤️ HP mất **${dmg}**`));
  }
  if (id === `fta_observe_${ctx.userId}`) {
    const exp = randInt(36, 64); grantExp(ctx.userId, ctx.guildId, exp);
    return finish(ctx, simpleEmbed(COLORS.info, `👁️ Bạn quan sát vùng dị thường cẩn thận — học được nhiều điều về bản chất của thời gian.\n⭐ +**${exp} EXP**`));
  }
  return finish(ctx, simpleEmbed(COLORS.info, '💨 *Bạn chạy khỏi vùng dị thường trước khi nó mở rộng hơn.*'));
}

export async function showForestLostRelic(ctx: RunExploreEventInput): Promise<void> {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`flr_take_${ctx.userId}`).setLabel('Lấy di vật').setEmoji('💎').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`flr_examine_${ctx.userId}`).setLabel('Nghiên cứu tại chỗ').setEmoji('🔬').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`flr_rebury_${ctx.userId}`).setLabel('Chôn lại').setEmoji('⛏️').setStyle(ButtonStyle.Secondary),
  );
  const embed = new EmbedBuilder().setColor(0xFFD700).setTitle('🏺 Di Vật Bị Lãng Quên')
    .setDescription('Dưới lớp lá mục, bạn vô tình đạp vào một vật cứng — một bình đồng khắc hoa văn tinh xảo, vẫn còn nguyên vẹn sau bao nhiêu năm tháng.');
  const reply = await ctx.interaction.editReply({ embeds: [embed], components: [row] });
  const btn = await awaitVote(ctx, reply, 30_000);
  if (!btn || !btn.isButton()) return finish(ctx, simpleEmbed(COLORS.info, '🏺 *Bạn đẩy lá mục lại che bình và tiếp tục.*'));
  await btn.deferUpdate().catch(() => {});
  const id = btn.customId;
  if (id === `flr_take_${ctx.userId}`) {
    addItem(ctx.userId, ctx.guildId, 'ancient_relic', 1);
    const gold = randInt(6, 18); grantGold(ctx.userId, ctx.guildId, gold);
    return finish(ctx, simpleEmbed(COLORS.gold, `💎 Bạn lấy bình đồng — có lẽ ai đó sẽ trả giá cao cho nó.\n🏺 +**1× Ancient Relic**\n🪙 +**${gold} Gold** (đồng xu rơi từ trong bình)`));
  }
  if (id === `flr_examine_${ctx.userId}`) {
    const exp = randInt(36, 64); grantExp(ctx.userId, ctx.guildId, exp);
    addItem(ctx.userId, ctx.guildId, 'ancient_relic', 1);
    return finish(ctx, new EmbedBuilder().setColor(COLORS.success).setTitle('🔬 Di Vật Được Giải Mã')
      .setDescription(`Bạn đọc được hoa văn — câu chuyện về một vương quốc đã biến mất.\n⭐ +**${exp} EXP**\n🏺 +**1× Ancient Relic**`));
  }
  const rep = adjustReputation(ctx.userId, ctx.guildId, 4);
  const exp = randInt(14, 28); grantExp(ctx.userId, ctx.guildId, exp);
  return finish(ctx, simpleEmbed(COLORS.success, `⛏️ Bạn chôn lại cẩn thận — đây không phải của mình.\n⭐ +**${exp} EXP**\n🤝 Reputation: **${rep}** (+4)`));
}

// ════════════════════════════════════════════════════════════════
//  FOREST — INTERACTIVE / MINI-GAME  (10 events)
// ════════════════════════════════════════════════════════════════

export async function showForestHerbForaging(ctx: RunExploreEventInput): Promise<void> {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`fhf_careful_${ctx.userId}`).setLabel('Hái cẩn thận').setEmoji('🌿').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`fhf_quick_${ctx.userId}`).setLabel('Hái nhanh').setEmoji('💨').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`fhf_bird_${ctx.userId}`).setLabel('Hỏi chim rừng').setEmoji('🐦').setStyle(ButtonStyle.Secondary),
  );
  const embed = new EmbedBuilder().setColor(0x228B22).setTitle('🌿 Vùng Thảo Dược')
    .setDescription('Bạn bước vào một khoảng rừng đầy thảo dược — lá xanh, lá tía, lá có hoa, lá không có hoa. Một số là thuốc quý, một số là độc.');
  const reply = await ctx.interaction.editReply({ embeds: [embed], components: [row] });
  const btn = await awaitVote(ctx, reply, 30_000);
  if (!btn || !btn.isButton()) return finish(ctx, simpleEmbed(COLORS.info, '🌿 *Bạn rời vùng thảo dược tay trắng.*'));
  await btn.deferUpdate().catch(() => {});
  const player = getPlayer(ctx.userId, ctx.guildId)!;
  const id = btn.customId;
  if (id === `fhf_careful_${ctx.userId}`) {
    addItem(ctx.userId, ctx.guildId, 'herb', randInt(3, 6));
    if (randInt(1, 100) <= 45) addItem(ctx.userId, ctx.guildId, 'rare_herb', 1);
    return finish(ctx, simpleEmbed(COLORS.success, '🌿 Hái tỉ mỉ — chỉ lấy những loại chắc chắn an toàn.\n🌿 +**3–6× Herb**\n🌺 45% nhận **Rare Herb**'));
  }
  if (id === `fhf_quick_${ctx.userId}`) {
    addItem(ctx.userId, ctx.guildId, 'herb', randInt(5, 9));
    if (randInt(1, 100) <= 35) {
      const dmg = Math.max(1, Math.floor(player.max_hp * 0.1));
      updatePlayerHpMp(ctx.userId, ctx.guildId, Math.max(1, player.hp - dmg), player.mp);
      return finish(ctx, simpleEmbed(COLORS.warning, `💨 Hái nhiều nhưng dính vào cây độc!\n🌿 +**5–9× Herb**\n❤️ HP mất **${dmg}**`));
    }
    return finish(ctx, simpleEmbed(COLORS.success, '💨 May mắn — hái nhiều không bị gì!\n🌿 +**5–9× Herb**'));
  }
  const exp = randInt(10, 21); grantExp(ctx.userId, ctx.guildId, exp);
  addItem(ctx.userId, ctx.guildId, 'herb', randInt(2, 4));
  addItem(ctx.userId, ctx.guildId, 'rare_herb', 1);
  return finish(ctx, simpleEmbed(COLORS.success, `🐦 Chim rừng dẫn bạn đến đúng chỗ thảo dược tốt nhất.\n🌿 +**2–4× Herb**\n🌺 +**1× Rare Herb**\n⭐ +**${exp} EXP**`));
}

export async function showForestAnimalTracks(ctx: RunExploreEventInput): Promise<void> {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`fat_follow_${ctx.userId}`).setLabel('Đi theo dấu vết').setEmoji('🐾').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`fat_trap_${ctx.userId}`).setLabel('Đặt bẫy').setEmoji('🪤').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`fat_mark_${ctx.userId}`).setLabel('Đánh dấu bản đồ').setEmoji('🗺️').setStyle(ButtonStyle.Secondary),
  );
  const embed = new EmbedBuilder().setColor(0x8B4513).setTitle('🐾 Dấu Vết Thú Rừng')
    .setDescription('Trên nền đất ẩm là những dấu chân rõ nét — thú lớn, mới đi qua, còn tươi. Hướng về sâu trong rừng.');
  const reply = await ctx.interaction.editReply({ embeds: [embed], components: [row] });
  const btn = await awaitVote(ctx, reply, 30_000);
  if (!btn || !btn.isButton()) return finish(ctx, simpleEmbed(COLORS.info, '🐾 *Bạn nhìn dấu chân rồi bước tiếp.*'));
  await btn.deferUpdate().catch(() => {});
  const id = btn.customId;
  if (id === `fat_follow_${ctx.userId}`) {
    const roll = randInt(1, 100);
    if (roll <= 30) {
      await ctx.interaction.editReply({ embeds: [simpleEmbed(COLORS.danger, '🐾 Bạn theo dấu và tìm thấy... con thú đang quay lại nhìn bạn.')], components: [] });
      await new Promise(r => setTimeout(r, 600));
      return ctx.callbacks.startCombat(pick(ctx.enemies).id);
    }
    if (roll <= 70) {
      const gold = randInt(9, 24); grantGold(ctx.userId, ctx.guildId, gold);
      addItem(ctx.userId, ctx.guildId, 'leather', 1);
      return finish(ctx, simpleEmbed(COLORS.success, `🐾 Dấu dẫn đến hang thú bỏ trống với đồ tích lũy bên trong.\n🪙 +**${gold} Gold**\n🟫 +**1× Leather**`));
    }
    addItem(ctx.userId, ctx.guildId, 'meat', 2);
    addItem(ctx.userId, ctx.guildId, 'leather', 2);
    const exp = randInt(14, 28); grantExp(ctx.userId, ctx.guildId, exp);
    return finish(ctx, simpleEmbed(COLORS.success, `🐾 Bạn tìm thấy con thú đã chết tự nhiên — tận dụng được.\n🥩 +**2× Meat**\n🟫 +**2× Leather**\n⭐ +**${exp} EXP**`));
  }
  if (id === `fat_trap_${ctx.userId}`) {
    addItem(ctx.userId, ctx.guildId, 'meat', randInt(1, 3));
    addItem(ctx.userId, ctx.guildId, 'leather', 1);
    return finish(ctx, simpleEmbed(COLORS.success, '🪤 Bạn đặt bẫy và chờ — bẫy sập, thu hoạch được.\n🥩 +**1–3× Meat**\n🟫 +**1× Leather**'));
  }
  const exp = randInt(14, 32); grantExp(ctx.userId, ctx.guildId, exp);
  return finish(ctx, simpleEmbed(COLORS.info, `🗺️ Bạn ghi lại dấu vết và vị trí — kiến thức về địa hình rừng.\n⭐ +**${exp} EXP**`));
}

export async function showForestRiverCrossing(ctx: RunExploreEventInput): Promise<void> {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`frc_wade_${ctx.userId}`).setLabel('Lội qua').setEmoji('🌊').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`frc_vine_${ctx.userId}`).setLabel('Đu dây leo').setEmoji('🌿').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`frc_bridge_${ctx.userId}`).setLabel('Tìm cầu').setEmoji('🌉').setStyle(ButtonStyle.Secondary),
  );
  const embed = new EmbedBuilder().setColor(0x4169E1).setTitle('🌊 Vượt Sông Rừng')
    .setDescription('Con đường chặn bởi con suối chảy xiết — nước trong nhưng nhanh, đá trơn dưới đáy. Bờ bên kia có gì đó lấp lánh.');
  const reply = await ctx.interaction.editReply({ embeds: [embed], components: [row] });
  const btn = await awaitVote(ctx, reply, 30_000);
  if (!btn || !btn.isButton()) return finish(ctx, simpleEmbed(COLORS.info, '🌊 *Bạn dừng lại trước sông rồi quay đầu.*'));
  await btn.deferUpdate().catch(() => {});
  const player = getPlayer(ctx.userId, ctx.guildId)!;
  const id = btn.customId;
  if (id === `frc_wade_${ctx.userId}`) {
    if (randInt(1, 100) <= 60) {
      const gold = randInt(9, 21); grantGold(ctx.userId, ctx.guildId, gold);
      addItem(ctx.userId, ctx.guildId, 'bog_pearl', 1);
      return finish(ctx, simpleEmbed(COLORS.success, `🌊 Bạn lội qua an toàn — và nhặt được thứ lấp lánh dưới đáy suối.\n🪙 +**${gold} Gold**\n🔮 +**1× Bog Pearl**`));
    }
    const dmg = Math.max(1, Math.floor(player.max_hp * 0.12));
    updatePlayerHpMp(ctx.userId, ctx.guildId, Math.max(1, player.hp - dmg), player.mp);
    return finish(ctx, simpleEmbed(COLORS.warning, `🌊 Bạn trượt té giữa dòng và bị đá cứa.\n❤️ HP mất **${dmg}**`));
  }
  if (id === `frc_vine_${ctx.userId}`) {
    if (randInt(1, 100) <= 70) {
      const exp = randInt(10, 21); grantExp(ctx.userId, ctx.guildId, exp);
      return finish(ctx, simpleEmbed(COLORS.success, `🌿 Đu một cái, qua rồi! Cảm giác phiêu lưu thú vị.\n⭐ +**${exp} EXP**`));
    }
    const dmg = Math.max(1, Math.floor(player.max_hp * 0.1));
    updatePlayerHpMp(ctx.userId, ctx.guildId, Math.max(1, player.hp - dmg), player.mp);
    return finish(ctx, simpleEmbed(COLORS.danger, `🌿 Dây leo đứt phựt — bạn rơi xuống nước!\n❤️ HP mất **${dmg}**`));
  }
  const exp = randInt(7, 18); grantExp(ctx.userId, ctx.guildId, exp);
  addItem(ctx.userId, ctx.guildId, 'herb', 2);
  return finish(ctx, simpleEmbed(COLORS.success, `🌉 Bạn tìm được một cây gỗ mục bắc qua suối — chậm nhưng an toàn.\nDọc đường nhặt thêm thảo dược.\n🌿 +**2× Herb**\n⭐ +**${exp} EXP**`));
}

export async function showForestTreeClimbing(ctx: RunExploreEventInput): Promise<void> {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`ftc_high_${ctx.userId}`).setLabel('Leo lên tận ngọn').setEmoji('🧗').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`ftc_mid_${ctx.userId}`).setLabel('Leo vừa phải').setEmoji('🌲').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`ftc_stay_${ctx.userId}`).setLabel('Thôi không leo').setStyle(ButtonStyle.Secondary),
  );
  const embed = new EmbedBuilder().setColor(0x228B22).setTitle('🌲 Cây Cổ Thụ Cao Vút')
    .setDescription('Một cây to thẳng tắp với cành thấp vừa tầm với. Từ ngọn chắc có thể nhìn thấy cả khu rừng — hoặc tìm được thứ gì đó trên cao.');
  const reply = await ctx.interaction.editReply({ embeds: [embed], components: [row] });
  const btn = await awaitVote(ctx, reply, 30_000);
  if (!btn || !btn.isButton()) return finish(ctx, simpleEmbed(COLORS.info, '🌲 *Bạn nhìn lên cây rồi đi tiếp.*'));
  await btn.deferUpdate().catch(() => {});
  const player = getPlayer(ctx.userId, ctx.guildId)!;
  const id = btn.customId;
  if (id === `ftc_high_${ctx.userId}`) {
    if (randInt(1, 100) <= 50) {
      addItem(ctx.userId, ctx.guildId, 'eagle_feather', 1);
      addItem(ctx.userId, ctx.guildId, 'forest_fruit', 3);
      const exp = randInt(18, 36); grantExp(ctx.userId, ctx.guildId, exp);
      return finish(ctx, new EmbedBuilder().setColor(COLORS.success).setTitle('🧗 Đỉnh Cây')
        .setDescription(`Từ trên cao bạn thấy toàn cảnh rừng và nhặt được tổ chim bỏ trống với lông đại bàng.\n🪶 +**1× Eagle Feather**\n🍒 +**3× Forest Fruit**\n⭐ +**${exp} EXP**`));
    }
    const dmg = Math.max(1, Math.floor(player.max_hp * 0.18));
    updatePlayerHpMp(ctx.userId, ctx.guildId, Math.max(1, player.hp - dmg), player.mp);
    return finish(ctx, simpleEmbed(COLORS.danger, `🧗 Cành gãy — bạn rơi và va vào nhiều cành nhỏ!\n❤️ HP mất **${dmg}**`));
  }
  if (id === `ftc_mid_${ctx.userId}`) {
    addItem(ctx.userId, ctx.guildId, 'forest_fruit', 2);
    const exp = randInt(7, 18); grantExp(ctx.userId, ctx.guildId, exp);
    return finish(ctx, simpleEmbed(COLORS.success, `🌲 Leo vừa đủ, hái được hoa quả và nhìn thấy một phần đường đi.\n🍒 +**2× Forest Fruit**\n⭐ +**${exp} EXP**`));
  }
  return finish(ctx, simpleEmbed(COLORS.info, '🌲 *Bạn đứng dưới gốc cây nhìn lên rồi đi tiếp.*'));
}

export async function showForestFogMaze(ctx: RunExploreEventInput): Promise<void> {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`ffm_sound_${ctx.userId}`).setLabel('Theo âm thanh').setEmoji('👂').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`ffm_marks_${ctx.userId}`).setLabel('Đánh dấu cây').setEmoji('🗡️').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`ffm_wait_${ctx.userId}`).setLabel('Chờ sương tan').setEmoji('⏳').setStyle(ButtonStyle.Secondary),
  );
  const embed = new EmbedBuilder().setColor(0xC0C0C0).setTitle('🌫️ Mê Cung Sương Mù')
    .setDescription('Sương dày đặc bao phủ hoàn toàn — tầm nhìn chưa đầy một mét. Bạn không thể thấy hướng đi và nghe thấy tiếng lạ từ nhiều phía.');
  const reply = await ctx.interaction.editReply({ embeds: [embed], components: [row] });
  const btn = await awaitVote(ctx, reply, 30_000);
  if (!btn || !btn.isButton()) {
    const player = getPlayer(ctx.userId, ctx.guildId)!;
    const dmg = Math.max(1, Math.floor(player.max_hp * 0.12));
    updatePlayerHpMp(ctx.userId, ctx.guildId, Math.max(1, player.hp - dmg), player.mp);
    return finish(ctx, simpleEmbed(COLORS.danger, `🌫️ Bạn lạc lối trong sương và vấp ngã nhiều lần!\n❤️ HP mất **${dmg}**`));
  }
  await btn.deferUpdate().catch(() => {});
  const player = getPlayer(ctx.userId, ctx.guildId)!;
  const id = btn.customId;
  if (id === `ffm_sound_${ctx.userId}`) {
    if (randInt(1, 100) <= 55) {
      const exp = randInt(14, 32); grantExp(ctx.userId, ctx.guildId, exp);
      addItem(ctx.userId, ctx.guildId, 'herb', 2);
      return finish(ctx, simpleEmbed(COLORS.success, `👂 Bạn theo tiếng suối và thoát ra ngoài, dọc đường nhặt thảo dược.\n🌿 +**2× Herb**\n⭐ +**${exp} EXP**`));
    }
    await ctx.interaction.editReply({ embeds: [simpleEmbed(COLORS.danger, '👂 Âm thanh là tiếng gọi mồi — thú tấn công!')], components: [] });
    await new Promise(r => setTimeout(r, 600));
    return ctx.callbacks.startCombat('will_o_wisp');
  }
  if (id === `ffm_marks_${ctx.userId}`) {
    const exp = randInt(10, 25); grantExp(ctx.userId, ctx.guildId, exp);
    const gold = randInt(6, 18); grantGold(ctx.userId, ctx.guildId, gold);
    return finish(ctx, simpleEmbed(COLORS.success, `🗡️ Hệ thống đánh dấu giúp bạn tìm được đường ra và khám phá thêm.\n🪙 +**${gold} Gold**\n⭐ +**${exp} EXP**`));
  }
  const hp = Math.min(player.max_hp, player.hp + Math.floor(player.max_hp * 0.2));
  updatePlayerHpMp(ctx.userId, ctx.guildId, hp, player.mp);
  addItem(ctx.userId, ctx.guildId, 'herb', 1);
  return finish(ctx, simpleEmbed(COLORS.info, `⏳ Bạn nghỉ chờ — sương tan sau một giờ. Nhặt thêm ít thảo dược trong lúc chờ.\n❤️ HP hồi 20%\n🌿 +**1× Herb**`));
}

export async function showForestWaterfallCave(ctx: RunExploreEventInput): Promise<void> {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`fwc_enter_${ctx.userId}`).setLabel('Vào hang').setEmoji('🕳️').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`fwc_fish_${ctx.userId}`).setLabel('Câu cá ở hồ').setEmoji('🎣').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`fwc_fill_${ctx.userId}`).setLabel('Lấy nước suối').setEmoji('💧').setStyle(ButtonStyle.Secondary),
  );
  const embed = new EmbedBuilder().setColor(0x00CED1).setTitle('💦 Thác Nước Và Hang Đá')
    .setDescription('Một thác nước nhỏ đổ xuống hồ trong veo — và sau màn nước, bóng tối của một cái hang. Đáy hồ lấp lánh như có gì ở bên dưới.');
  const reply = await ctx.interaction.editReply({ embeds: [embed], components: [row] });
  const btn = await awaitVote(ctx, reply, 30_000);
  if (!btn || !btn.isButton()) return finish(ctx, simpleEmbed(COLORS.info, '💦 *Tiếng thác nước theo bạn suốt quãng đường dài.*'));
  await btn.deferUpdate().catch(() => {});
  const player = getPlayer(ctx.userId, ctx.guildId)!;
  const id = btn.customId;
  if (id === `fwc_enter_${ctx.userId}`) {
    const roll = randInt(1, 100);
    if (roll <= 20) {
      await ctx.interaction.editReply({ embeds: [simpleEmbed(COLORS.danger, '🕳️ Hang không trống — có thú bên trong!')], components: [] });
      await new Promise(r => setTimeout(r, 600));
      return ctx.callbacks.startCombat('vine_golem');
    }
    const gold = randInt(18, 49); grantGold(ctx.userId, ctx.guildId, gold);
    addItem(ctx.userId, ctx.guildId, 'mysterious_shard', 1);
    return finish(ctx, new EmbedBuilder().setColor(COLORS.magic).setTitle('🕳️ Hang Bí Mật')
      .setDescription(`Trong hang có tranh vẽ cổ đại và một túi vàng ai đó giấu từ lâu.\n🪙 +**${gold} Gold**\n💎 +**1× Mysterious Shard**`));
  }
  if (id === `fwc_fish_${ctx.userId}`) {
    addItem(ctx.userId, ctx.guildId, 'fish', randInt(2, 4));
    if (randInt(1, 100) <= 25) addItem(ctx.userId, ctx.guildId, 'bog_pearl', 1);
    return finish(ctx, simpleEmbed(COLORS.success, '🎣 Hồ trong sạch nhiều cá!\n🐟 +**2–4× Fish**\n🔮 25% nhận **Bog Pearl** từ đáy hồ'));
  }
  addItem(ctx.userId, ctx.guildId, 'moonwater', 1);
  const hp = Math.min(player.max_hp, player.hp + Math.floor(player.max_hp * 0.15));
  updatePlayerHpMp(ctx.userId, ctx.guildId, hp, player.mp);
  return finish(ctx, simpleEmbed(COLORS.success, `💧 Nước suối trong mát, uống vào thấy khỏe khoắn.\n💧 +**1× Moonwater**\n❤️ HP hồi 15%`));
}

export async function showForestDeadTreeOracle(ctx: RunExploreEventInput): Promise<void> {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`fdto_ask_${ctx.userId}`).setLabel('Đặt câu hỏi').setEmoji('❓').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`fdto_blood_${ctx.userId}`).setLabel('Hiến máu để hỏi').setEmoji('🩸').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`fdto_pass_${ctx.userId}`).setLabel('Bỏ qua').setStyle(ButtonStyle.Secondary),
  );
  const embed = new EmbedBuilder().setColor(0x1C1C1C).setTitle('💀 Cây Chết Tiên Tri')
    .setDescription('Một cây khô trụi cành đứng trơ trọi giữa rừng xanh — không sâu bọ, không chim chóc. Ai đó đã khắc mắt lên thân cây, và bạn thề chúng đang di chuyển.');
  const reply = await ctx.interaction.editReply({ embeds: [embed], components: [row] });
  const btn = await awaitVote(ctx, reply, 30_000);
  if (!btn || !btn.isButton()) return finish(ctx, simpleEmbed(COLORS.info, '💀 *Đôi mắt khắc trên cây nhìn theo bạn cho đến khi khuất tầm.*'));
  await btn.deferUpdate().catch(() => {});
  const player = getPlayer(ctx.userId, ctx.guildId)!;
  const id = btn.customId;
  if (id === `fdto_ask_${ctx.userId}`) {
    const prophecies = [
      '💀 *"Ngươi sẽ gặp kẻ thù cũ trong tương lai gần."*\n⭐ EXP +bonus (tri thức từ lời tiên tri)',
      '💀 *"Con đường phía trước có nguy hiểm — hãy đi thẳng, đừng rẽ trái."*',
      '💀 *"Một vật gì đó đã mất sẽ quay về tay ngươi."*',
      '💀 *"Ngươi mang theo bóng tối chưa nhận ra."*',
      '💀 *"Cái chết không phải điểm cuối — đây là lời hứa, không phải đe dọa."*',
    ];
    const exp = randInt(18, 39); grantExp(ctx.userId, ctx.guildId, exp);
    return finish(ctx, simpleEmbed(COLORS.magic, `${pick(prophecies)}\n⭐ +**${exp} EXP**`));
  }
  if (id === `fdto_blood_${ctx.userId}`) {
    const dmg = Math.max(1, Math.floor(player.max_hp * 0.08));
    updatePlayerHpMp(ctx.userId, ctx.guildId, Math.max(1, player.hp - dmg), player.mp);
    const exp = randInt(36, 64); grantExp(ctx.userId, ctx.guildId, exp);
    addItem(ctx.userId, ctx.guildId, 'rune_stone', 1);
    return finish(ctx, new EmbedBuilder().setColor(COLORS.magic).setTitle('🩸 Tiên Tri Bằng Máu')
      .setDescription(`Khi máu chạm vào cây, nó rung lên và nói thật. Một viên đá rune tự động hiện ra dưới chân bạn.\n❤️ HP mất **${dmg}**\n🔮 +**1× Rune Stone**\n⭐ +**${exp} EXP**`));
  }
  return finish(ctx, simpleEmbed(COLORS.info, '💀 *Bạn quay lưng lại — đôi mắt trên cây nhắm lại.*'));
}

export async function showForestFlowerField(ctx: RunExploreEventInput): Promise<void> {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`fff_collect_${ctx.userId}`).setLabel('Hái hoa về').setEmoji('💐').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`fff_roll_${ctx.userId}`).setLabel('Lăn ra giữa đồng hoa').setEmoji('😂').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`fff_crown_${ctx.userId}`).setLabel('Kết vòng hoa').setEmoji('👑').setStyle(ButtonStyle.Secondary),
  );
  const embed = new EmbedBuilder().setColor(0xFF69B4).setTitle('🌼 Đồng Hoa Hoang Dã')
    .setDescription('Bỗng nhiên rừng mở ra thành một đồng hoa rực rỡ — vàng, hồng, trắng, tím, đỏ. Gió thổi nhẹ làm hoa rung rinh như sóng.');
  const reply = await ctx.interaction.editReply({ embeds: [embed], components: [row] });
  const btn = await awaitVote(ctx, reply, 30_000);
  if (!btn || !btn.isButton()) return finish(ctx, simpleEmbed(COLORS.info, '🌼 *Bạn đứng ở rìa đồng hoa nhìn ngắm rồi đi tiếp.*'));
  await btn.deferUpdate().catch(() => {});
  const player = getPlayer(ctx.userId, ctx.guildId)!;
  const id = btn.customId;
  if (id === `fff_collect_${ctx.userId}`) {
    addItem(ctx.userId, ctx.guildId, 'rare_herb', randInt(1, 3));
    addItem(ctx.userId, ctx.guildId, 'dream_petal', 1);
    return finish(ctx, simpleEmbed(COLORS.success, '💐 Bạn hái một bó hoa đẹp — trong đó có loại thảo dược quý.\n🌺 +**1–3× Rare Herb**\n🌸 +**1× Dream Petal**'));
  }
  if (id === `fff_roll_${ctx.userId}`) {
    const hp = Math.min(player.max_hp, player.hp + Math.floor(player.max_hp * 0.25));
    const mp = Math.min(player.max_mp, player.mp + Math.floor(player.max_mp * 0.25));
    updatePlayerHpMp(ctx.userId, ctx.guildId, hp, mp);
    const exp = randInt(7, 18); grantExp(ctx.userId, ctx.guildId, exp);
    return finish(ctx, simpleEmbed(COLORS.success, `😂 Bạn lăn ra giữa đồng hoa như đứa trẻ — tất cả căng thẳng tan biến!\n❤️ HP hồi 25%\n🔵 MP hồi 25%\n⭐ +**${exp} EXP**`));
  }
  addItem(ctx.userId, ctx.guildId, 'flower_crown', 1);
  const rep = adjustReputation(ctx.userId, ctx.guildId, 2);
  return finish(ctx, simpleEmbed(COLORS.success, `👑 Bạn kết một vòng hoa xinh đẹp — ai đó sẽ vui khi nhận nó.\n💐 +**1× Flower Crown**\n🤝 Reputation: **${rep}** (+2)`));
}

export async function showForestCrowMessenger(ctx: RunExploreEventInput): Promise<void> {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`fcm_take_${ctx.userId}`).setLabel('Lấy thư').setEmoji('📜').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`fcm_follow_${ctx.userId}`).setLabel('Đi theo con quạ').setEmoji('🐦').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`fcm_reply_${ctx.userId}`).setLabel('Buộc thư trả lời').setEmoji('✉️').setStyle(ButtonStyle.Secondary),
  );
  const embed = new EmbedBuilder().setColor(0x1C1C1C).setTitle('🐦‍⬛ Quạ Đưa Thư Bí Ẩn')
    .setDescription('Một con quạ lớn đậu xuống trước mặt bạn — ở chân nó có buộc một cuộn thư nhỏ và một miếng da với dấu niêm phong lạ. Nó nhìn bạn chằm chằm rồi kêu một tiếng.');
  const reply = await ctx.interaction.editReply({ embeds: [embed], components: [row] });
  const btn = await awaitVote(ctx, reply, 30_000);
  if (!btn || !btn.isButton()) return finish(ctx, simpleEmbed(COLORS.info, '🐦‍⬛ *Con quạ chờ một lúc rồi bay đi.*'));
  await btn.deferUpdate().catch(() => {});
  const id = btn.customId;
  if (id === `fcm_take_${ctx.userId}`) {
    const exp = randInt(14, 32); grantExp(ctx.userId, ctx.guildId, exp);
    const gold = randInt(9, 24); grantGold(ctx.userId, ctx.guildId, gold);
    return finish(ctx, new EmbedBuilder().setColor(COLORS.info).setTitle('📜 Nội Dung Thư')
      .setDescription(`Thư viết về kho báu ẩn ở "nơi hai cây cổ giao nhau" — và một tờ tiền cũ kẹp trong thư.\n🪙 +**${gold} Gold**\n⭐ +**${exp} EXP** (thông tin quý)`));
  }
  if (id === `fcm_follow_${ctx.userId}`) {
    const roll = randInt(1, 100);
    if (roll <= 50) {
      const gold = randInt(31, 62); grantGold(ctx.userId, ctx.guildId, gold);
      addItem(ctx.userId, ctx.guildId, 'mysterious_shard', 1);
      return finish(ctx, new EmbedBuilder().setColor(COLORS.magic).setTitle('🐦‍⬛ Quạ Dẫn Đến Kho Báu')
        .setDescription(`Con quạ dẫn bạn đến một gốc cây rỗng — bên trong đầy vàng và một mảnh tinh thể!\n🪙 +**${gold} Gold**\n💎 +**1× Mysterious Shard**`));
    }
    await ctx.interaction.editReply({ embeds: [simpleEmbed(COLORS.danger, '🐦‍⬛ Con quạ dẫn bạn vào bẫy của ai đó — chiến đấu!')], components: [] });
    await new Promise(r => setTimeout(r, 600));
    return ctx.callbacks.startCombat(pick(ctx.enemies).id);
  }
  const rep = adjustReputation(ctx.userId, ctx.guildId, 4);
  const exp = randInt(18, 36); grantExp(ctx.userId, ctx.guildId, exp);
  return finish(ctx, simpleEmbed(COLORS.success, `✉️ Bạn buộc một thư ngắn vào chân quạ và thả nó đi. Cảm giác kỳ lạ về một mạng lưới ẩn nào đó.\n⭐ +**${exp} EXP**\n🤝 Reputation: **${rep}** (+4)`));
}

export async function showForestCampfireStranger(ctx: RunExploreEventInput): Promise<void> {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`fcs3_sit_${ctx.userId}`).setLabel('Ngồi cạnh lửa').setEmoji('🔥').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`fcs3_food_${ctx.userId}`).setLabel('Chia sẻ lương thực').setEmoji('🍞').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`fcs3_path_${ctx.userId}`).setLabel('Hỏi đường').setEmoji('🗺️').setStyle(ButtonStyle.Secondary),
  );
  const embed = new EmbedBuilder().setColor(0xFF4500).setTitle('🔥 Người Lạ Bên Lửa Trại')
    .setDescription('Giữa rừng tối, ánh lửa lộ ra bóng một người đang ngồi một mình. Họ nhìn bạn khi bạn đến gần — không sợ, không cảnh giác. Chỉ gật đầu mời bạn ngồi.');
  const reply = await ctx.interaction.editReply({ embeds: [embed], components: [row] });
  const btn = await awaitVote(ctx, reply, 30_000);
  if (!btn || !btn.isButton()) return finish(ctx, simpleEmbed(COLORS.info, '🔥 *Bạn đi qua lửa trại. Người lạ vẫn im lặng nhìn theo.*'));
  await btn.deferUpdate().catch(() => {});
  const player = getPlayer(ctx.userId, ctx.guildId)!;
  const id = btn.customId;
  if (id === `fcs3_sit_${ctx.userId}`) {
    const hp = Math.min(player.max_hp, player.hp + Math.floor(player.max_hp * 0.3));
    const mp = Math.min(player.max_mp, player.mp + Math.floor(player.max_mp * 0.3));
    updatePlayerHpMp(ctx.userId, ctx.guildId, hp, mp);
    const exp = randInt(14, 32); grantExp(ctx.userId, ctx.guildId, exp);
    return finish(ctx, new EmbedBuilder().setColor(COLORS.success).setTitle('🔥 Bên Lửa Ấm')
      .setDescription(`Hai người ngồi im lặng bên lửa — không nói gì cũng được. Hơi ấm làm lành vết thương và khơi dậy tinh thần.\n❤️ HP hồi 30%\n🔵 MP hồi 30%\n⭐ +**${exp} EXP**`));
  }
  if (id === `fcs3_food_${ctx.userId}`) {
    const rep = adjustReputation(ctx.userId, ctx.guildId, 4);
    addItem(ctx.userId, ctx.guildId, 'rare_herb', 1);
    addItem(ctx.userId, ctx.guildId, 'mana_potion', 1);
    return finish(ctx, new EmbedBuilder().setColor(COLORS.success).setTitle('🍞 Chia Sẻ Lương Thực')
      .setDescription(`Bạn chia đồ ăn — người lạ gật đầu cảm ơn và đưa cho bạn thứ họ đang dùng.\n🌺 +**1× Rare Herb**\n🔵 +**1× Mana Potion**\n🤝 Reputation: **${rep}** (+4)`));
  }
  const exp = randInt(10, 25); grantExp(ctx.userId, ctx.guildId, exp);
  addItem(ctx.userId, ctx.guildId, 'herb', 2);
  return finish(ctx, simpleEmbed(COLORS.success, `🗺️ Người lạ nói ít nhưng đúng — chỉ bạn đường tắt và cảnh báo nguy hiểm phía trước.\n⭐ +**${exp} EXP**\n🌿 +**2× Herb** (từ túi của họ)`));
}
