import type { ExploreEventType, RunExploreEventInput } from './exploreEvents';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  Message
} from 'discord.js';
import {
  addItem, adjustReputation, adjustWanted,
  getPlayer, getEffectivePlayer, grantExp, grantGold, grantSoulShards, spendGold, updatePlayerHpMp
} from '../systems/player';
import { setBuff } from '../systems/consumables';
import { logEvent } from '../systems/world';
import { COLORS, simpleEmbed } from '../utils/embeds';
import { pick, randInt } from '../utils/format';
import { onlyUser } from '../utils/collectors';

// ── Time of day (UTC+7) ──────────────────────────────────────────────────
export type TimeOfDay = 'dawn' | 'day' | 'dusk' | 'night';

export function getTimeOfDay(): TimeOfDay {
  const hour = (new Date().getUTCHours() + 7) % 24; // UTC+7
  if (hour >= 5  && hour < 8)  return 'dawn';
  if (hour >= 8  && hour < 17) return 'day';
  if (hour >= 17 && hour < 20) return 'dusk';
  return 'night';
}

export function getTimePeriodLabel(time: TimeOfDay): string {
  return { dawn: '🌄 Bình Minh', day: '☀️ Ban Ngày', dusk: '🌇 Hoàng Hôn', night: '🌑 Ban Đêm' }[time];
}

// ── Weight multipliers for existing events ───────────────────────────────
export function getTimeWeightMultipliers(time: TimeOfDay): Partial<Record<ExploreEventType, number>> {
  switch (time) {
    case 'dawn': return {
      spring: 1.6,
      wandering_healer: 1.5,
      merchant: 0.7,
      caravan: 0.6,
      ambush: 0.6,
      blood_trail: 0.7,
      black_eclipse: 0.4,
    };
    case 'day': return {
      merchant: 1.4,
      caravan: 1.4,
      loot: 1.2,
      villager: 1.3,
      ambush: 0.8,
      talking_corpse: 0.5,
      black_eclipse: 0.4,
      black_cat: 0.6,
    };
    case 'dusk': return {
      mysterious: 1.5,
      wanted_merchant: 1.3,
      memory_seller: 1.4,
      blood_trail: 1.3,
      black_cat: 1.3,
      merchant: 0.8,
      villager: 0.7,
    };
    case 'night': return {
      ambush: 1.6,
      blood_trail: 1.5,
      bounty_hunter: 1.4,
      talking_corpse: 1.6,
      black_eclipse: 2.0,
      black_cat: 1.5,
      merchant: 0.4,
      caravan: 0.3,
      spring: 0.7,
      villager: 0.3,
      wandering_healer: 0.5,
    };
  }
}

// ── Local finish helper ──────────────────────────────────────────────────
async function finish(ctx: RunExploreEventInput, embed: EmbedBuilder): Promise<void> {
  const msg = await ctx.interaction.editReply({
    embeds: [embed],
    components: ctx.callbacks.buildContinueExploreRow(ctx.userId)
  });
  await ctx.callbacks.attachContinueExploreHandler(msg as Message<boolean>, ctx.interaction, ctx.userId, ctx.guildId);
}

async function awaitBtn(
  ctx: RunExploreEventInput,
  embed: EmbedBuilder,
  row: ActionRowBuilder<ButtonBuilder>
): Promise<string | null> {
  const reply = await ctx.interaction.editReply({ embeds: [embed], components: [row] });
  const btn = await reply.awaitMessageComponent({ filter: onlyUser(ctx.userId), time: 30_000 }).catch(() => null);
  if (!btn || !btn.isButton()) return null;
  await btn.deferUpdate().catch(() => {});
  return btn.customId;
}

// ════════════════════════════════════════════════════════════════════════
//  DAWN (05:00 – 07:59)
// ════════════════════════════════════════════════════════════════════════

export async function showDawnRitual(ctx: RunExploreEventInput): Promise<void> {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`dr_join_${ctx.userId}`).setLabel('Tham gia nghi lễ').setEmoji('🙏').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`dr_watch_${ctx.userId}`).setLabel('Quan sát từ xa').setEmoji('👁️').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`dr_leave_${ctx.userId}`).setLabel('Tiếp tục đường').setStyle(ButtonStyle.Secondary),
  );
  const embed = new EmbedBuilder()
    .setColor(0xFFAA44)
    .setTitle('🌅 Nghi Lễ Bình Minh')
    .setDescription(
      'Ánh sáng đầu ngày hắt lên những tảng đá cổ xếp thành vòng tròn.\n' +
      'Vài bóng người đang thực hiện một nghi lễ im lặng — lòng bàn tay hướng lên bầu trời.'
    );
  const cid = await awaitBtn(ctx, embed, row);
  const fresh = getEffectivePlayer(ctx.userId, ctx.guildId)!;

  if (!cid || cid === `dr_leave_${ctx.userId}`) {
    return finish(ctx, simpleEmbed(COLORS.info, '🌅 *Bạn để nghi lễ lại phía sau và tiếp tục hành trình.*'));
  }
  if (cid === `dr_watch_${ctx.userId}`) {
    const exp = randInt(7, 18);
    grantExp(ctx.userId, ctx.guildId, exp);
    return finish(ctx, simpleEmbed(COLORS.info,
      `🌅 Bạn ngồi yên quan sát. Nghi lễ kết thúc trong thinh lặng.\n⭐ +**${exp} EXP** *(chiêm nghiệm)*`
    ));
  }
  // Tham gia
  const exp = randInt(18, 39);
  const mpHeal = Math.min(fresh.max_mp, fresh.mp + Math.floor(fresh.max_mp * 0.5));
  grantExp(ctx.userId, ctx.guildId, exp);
  updatePlayerHpMp(ctx.userId, ctx.guildId, fresh.hp, mpHeal);
  logEvent(ctx.guildId, ctx.userId, ctx.player.name, 'event', 'tham gia nghi lễ bình minh.', ctx.player.zone_id);
  return finish(ctx, new EmbedBuilder()
    .setColor(0xFFCC44)
    .setTitle('🌅 Ánh Sáng Đầu Ngày')
    .setDescription(
      'Bạn hòa vào vòng tròn. Hơi ấm tỏa ra từ những tảng đá — không phải nhiệt, mà là thứ gì đó sâu hơn.\n\n' +
      `⭐ +**${exp} EXP**\n🔵 MP: **${mpHeal}/${fresh.max_mp}**`
    )
  );
}

export async function showDawnTraveler(ctx: RunExploreEventInput): Promise<void> {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`dt_together_${ctx.userId}`).setLabel('Đi cùng một đoạn').setEmoji('🚶').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`dt_trade_${ctx.userId}`).setLabel('Trao đổi vật phẩm').setEmoji('🤝').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`dt_pass_${ctx.userId}`).setLabel('Từ chối lịch sự').setStyle(ButtonStyle.Secondary),
  );
  const embed = new EmbedBuilder()
    .setColor(0xFFDD88)
    .setTitle('🌄 Người Lữ Hành Sớm')
    .setDescription(
      'Trời còn mờ sương — một người đang gánh hàng trên vai cũng đang đi về phía bạn.\n' +
      '*"Chào buổi sáng. Ít người dậy sớm như ta thế này..."*'
    );
  const cid = await awaitBtn(ctx, embed, row);
  const fresh = getEffectivePlayer(ctx.userId, ctx.guildId)!;

  if (!cid || cid === `dt_pass_${ctx.userId}`) {
    return finish(ctx, simpleEmbed(COLORS.info, '🌄 *Bạn gật đầu lịch sự và tiếp tục con đường của mình.*'));
  }
  if (cid === `dt_trade_${ctx.userId}`) {
    const items = ['health_potion', 'mana_potion', 'antidote', 'herb'] as const;
    const got = pick([...items]);
    addItem(ctx.userId, ctx.guildId, got, 1);
    return finish(ctx, simpleEmbed(COLORS.success,
      `🤝 Người lữ hành mở túi ra — *"Lấy đi, dùng trên đường còn hơn bán rẻ cuối ngày."*\n\n🎁 +**1× ${got}**`
    ));
  }
  // Đi cùng
  const outcomes = [
    () => {
      const hp = Math.min(fresh.max_hp, fresh.hp + Math.floor(fresh.max_hp * 0.2));
      updatePlayerHpMp(ctx.userId, ctx.guildId, hp, fresh.mp);
      return `❤️ HP: **${hp}/${fresh.max_hp}** *(nghỉ chân cùng nhau)*`;
    },
    () => {
      const gold = randInt(9, 24);
      grantGold(ctx.userId, ctx.guildId, gold);
      return `🪙 +**${gold} Gold** *(người lữ hành trả công giúp đỡ trên đường)*`;
    },
    () => {
      const exp = randInt(10, 25);
      grantExp(ctx.userId, ctx.guildId, exp);
      return `⭐ +**${exp} EXP** *(câu chuyện đường dài)*`;
    },
  ];
  const result = pick(outcomes)();
  return finish(ctx, new EmbedBuilder()
    .setColor(COLORS.success)
    .setTitle('🌄 Đồng Hành Buổi Sớm')
    .setDescription(`Hai người đi song song một đoạn. Câu chuyện ngắn ngủi nhưng dễ chịu.\n\n${result}`)
  );
}

// ════════════════════════════════════════════════════════════════════════
//  DAY (08:00 – 16:59)
// ════════════════════════════════════════════════════════════════════════

export async function showNoonRest(ctx: RunExploreEventInput): Promise<void> {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`nr_fullrest_${ctx.userId}`).setLabel('Nghỉ ngơi đầy đủ').setEmoji('😴').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`nr_quickrest_${ctx.userId}`).setLabel('Nghỉ nhanh').setEmoji('⚡').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`nr_push_${ctx.userId}`).setLabel('Không nghỉ, tiếp tục').setStyle(ButtonStyle.Secondary),
  );
  const embed = new EmbedBuilder()
    .setColor(0xFFD700)
    .setTitle('☀️ Điểm Nghỉ Giữa Ngày')
    .setDescription(
      'Nắng giữa trưa đổ xuống như thiêu. Bạn tìm thấy một bóng cây lớn và dòng suối mát.\n' +
      '*Đây là lúc hiếm hoi để lấy lại sức.*'
    );
  const cid = await awaitBtn(ctx, embed, row);
  const fresh = getEffectivePlayer(ctx.userId, ctx.guildId)!;

  if (!cid || cid === `nr_push_${ctx.userId}`) {
    const gold = randInt(4, 12);
    grantGold(ctx.userId, ctx.guildId, gold);
    return finish(ctx, simpleEmbed(COLORS.info,
      `☀️ *Bạn tiếp tục đi dưới nắng. Đường vắng — bạn tìm thấy thứ gì đó rơi trên đường.*\n🪙 +**${gold} Gold**`
    ));
  }
  if (cid === `nr_quickrest_${ctx.userId}`) {
    const hp = Math.min(fresh.max_hp, fresh.hp + Math.floor(fresh.max_hp * 0.3));
    updatePlayerHpMp(ctx.userId, ctx.guildId, hp, fresh.mp);
    return finish(ctx, new EmbedBuilder()
      .setColor(COLORS.success)
      .setTitle('☀️ Nghỉ Nhanh')
      .setDescription(`Bạn ngồi xuống uống nước và ăn ít thứ trong túi. Mười lăm phút — đủ rồi.\n\n❤️ HP: **${hp}/${fresh.max_hp}**`)
    );
  }
  // Nghỉ đầy đủ
  const hp = fresh.max_hp;
  const mp = Math.min(fresh.max_mp, fresh.mp + Math.floor(fresh.max_mp * 0.5));
  updatePlayerHpMp(ctx.userId, ctx.guildId, hp, mp);
  return finish(ctx, new EmbedBuilder()
    .setColor(COLORS.success)
    .setTitle('☀️ Phục Hồi Hoàn Toàn')
    .setDescription(
      'Bạn nằm xuống bóng cây, mắt nhắm lại. Tiếng suối chảy rì rào.\n' +
      'Khi tỉnh dậy, trời đã nghiêng sang chiều — nhưng người bạn hoàn toàn khỏe lại.\n\n' +
      `❤️ HP: **${hp}/${fresh.max_hp}** *(đầy)*\n🔵 MP: **${mp}/${fresh.max_mp}**`
    )
  );
}

export async function showDayPatrol(ctx: RunExploreEventInput): Promise<void> {
  const fresh = getEffectivePlayer(ctx.userId, ctx.guildId)!;
  const wanted = fresh.reputation !== undefined && fresh.reputation <= -20 ? 1 : 0;
  // Check wanted level via player.wanted_level if it exists, else use rep as proxy
  const isWanted = (fresh as any).wanted_level > 0 || wanted > 0;

  if (!isWanted) {
    // Friendly patrol
    const rep = adjustReputation(ctx.userId, ctx.guildId, 2);
    return finish(ctx, new EmbedBuilder()
      .setColor(COLORS.info)
      .setTitle('🛡️ Đội Tuần Tra Ban Ngày')
      .setDescription(
        'Một đội lính tuần tra đi ngang. Họ nhìn bạn, gật đầu.\n' +
        `*"Hành trình bình an."* Có vẻ hồ sơ của bạn sạch sẽ.\n\n🤝 Reputation: **${rep}** (+2)`
      )
    );
  }

  // Wanted — combat or bribe
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`dp_fight_${ctx.userId}`).setLabel('Kháng cự').setEmoji('⚔️').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`dp_bribe_${ctx.userId}`).setLabel('Hối lộ (80 Gold)').setEmoji('💰').setStyle(ButtonStyle.Primary)
      .setDisabled(fresh.gold < 80),
    new ButtonBuilder().setCustomId(`dp_run_${ctx.userId}`).setLabel('Chạy trốn').setEmoji('🏃').setStyle(ButtonStyle.Secondary),
  );
  const embed = new EmbedBuilder()
    .setColor(COLORS.danger)
    .setTitle('🛡️ Bị Tuần Tra Nhận Ra')
    .setDescription(
      'Một lính tuần tra nhìn chằm chằm vào bạn, tay đặt lên cán kiếm.\n' +
      `*"Đứng lại! Ta nhớ mặt ngươi rồi..."*\n\n` +
      (fresh.gold < 80 ? '*❌ Không đủ 80 Gold để hối lộ.*' : '')
    );
  const cid = await awaitBtn(ctx, embed, row);

  if (!cid || cid === `dp_run_${ctx.userId}`) {
    const dmg = Math.max(1, Math.floor(fresh.max_hp * 0.08));
    const hp = Math.max(1, fresh.hp - dmg);
    updatePlayerHpMp(ctx.userId, ctx.guildId, hp, fresh.mp);
    adjustWanted(ctx.userId, ctx.guildId, 1);
    return finish(ctx, simpleEmbed(COLORS.warning,
      `🏃 Bạn bỏ chạy — tên lính bắn theo một mũi tên.\n❤️ HP mất **${dmg}**\n⚠️ Wanted level tăng thêm 1!`
    ));
  }
  if (cid === `dp_bribe_${ctx.userId}`) {
    spendGold(ctx.userId, ctx.guildId, 80);
    return finish(ctx, simpleEmbed(COLORS.success,
      '💰 Bạn dúi vàng vào tay lính. Hắn nhìn quanh rồi bỏ đi như không thấy gì.\n🪙 -**80 Gold**'
    ));
  }
  // Fight — trigger zone combat
  return ctx.callbacks.startCombat(pick(ctx.enemies).id);
}

// ════════════════════════════════════════════════════════════════════════
//  DUSK (17:00 – 19:59)
// ════════════════════════════════════════════════════════════════════════

export async function showDuskTrader(ctx: RunExploreEventInput): Promise<void> {
  const fresh = getEffectivePlayer(ctx.userId, ctx.guildId)!;
  const offers: Array<{ itemId: string; name: string; icon: string; price: number }> = [
    { itemId: 'health_potion', name: 'Health Potion', icon: '🧪', price: 15 },
    { itemId: 'mana_potion', name: 'Mana Potion', icon: '💧', price: 12 },
    { itemId: 'antidote', name: 'Antidote', icon: '💊', price: 10 },
    { itemId: 'elixir', name: 'Elixir', icon: '⚗️', price: 35 },
    { itemId: 'bread', name: 'Bánh Mỳ', icon: '🍞', price: 5 },
  ];
  const offer = pick(offers);
  const canBuy = fresh.gold >= offer.price;

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`dusk_buy_${ctx.userId}`)
      .setLabel(`Mua ${offer.name} (${offer.price}g)`)
      .setEmoji(offer.icon)
      .setStyle(ButtonStyle.Success)
      .setDisabled(!canBuy),
    new ButtonBuilder().setCustomId(`dusk_free_${ctx.userId}`).setLabel('Nhận thứ họ cho miễn phí').setEmoji('🎁').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`dusk_pass_${ctx.userId}`).setLabel('Đi tiếp').setStyle(ButtonStyle.Secondary),
  );
  const embed = new EmbedBuilder()
    .setColor(0xFF8C00)
    .setTitle('🌇 Thương Nhân Cuối Ngày')
    .setDescription(
      'Một người buôn đang thu dọn hàng hóa — mặt trời gần lặn, họ bán tháo để khỏi phải gánh về.\n\n' +
      `${offer.icon} **${offer.name}** — chỉ **${offer.price} Gold** *(giá gốc gấp đôi)*\n\n` +
      (canBuy ? '' : `*❌ Không đủ ${offer.price} Gold.*`)
    );

  const cid = await awaitBtn(ctx, embed, row);

  if (!cid || cid === `dusk_pass_${ctx.userId}`) {
    return finish(ctx, simpleEmbed(COLORS.info, '🌇 *Bạn để thương nhân dọn hàng và đi tiếp.*'));
  }
  if (cid === `dusk_buy_${ctx.userId}`) {
    spendGold(ctx.userId, ctx.guildId, offer.price);
    addItem(ctx.userId, ctx.guildId, offer.itemId, 1);
    return finish(ctx, simpleEmbed(COLORS.success,
      `🌇 *"Mua đi, giá tốt nhất trong ngày!"*\n\n` +
      `🪙 -**${offer.price} Gold**\n${offer.icon} +**1× ${offer.name}**`
    ));
  }
  // Free item
  const freebies = ['herb', 'bread', 'rope'] as const;
  const freeItem = pick([...freebies]);
  addItem(ctx.userId, ctx.guildId, freeItem, 1);
  return finish(ctx, simpleEmbed(COLORS.info,
    `🌇 Thương nhân nhét một thứ vào tay bạn trước khi bạn kịp từ chối.\n*"Lấy đi, tôi không mang nặng về nhà đâu."*\n\n🎁 +**1× ${freeItem}**`
  ));
}

export async function showDuskOmen(ctx: RunExploreEventInput): Promise<void> {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`do_heed_${ctx.userId}`).setLabel('Để ý đến điềm báo').setEmoji('👁️').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`do_investigate_${ctx.userId}`).setLabel('Điều tra thêm').setEmoji('🔎').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`do_ignore_${ctx.userId}`).setLabel('Bỏ qua').setStyle(ButtonStyle.Secondary),
  );
  const omens = [
    'Một đàn quạ đen bay về hướng bạn vừa đi qua — bất thường.',
    'Mặt trời lặn nhưng bầu trời có màu đỏ đậm như máu.',
    'Cỏ dọc đường bỗng khô héo trong nháy mắt mà không rõ lý do.',
    'Một con cáo trắng chạy ngang — mắt nó nhìn thẳng vào mắt bạn.',
  ];
  const embed = new EmbedBuilder()
    .setColor(0xCC4400)
    .setTitle('🌆 Điềm Lạ Lúc Hoàng Hôn')
    .setDescription(
      `*${pick(omens)}*\n\n` +
      'Không ai biết điều này có nghĩa gì. Có lẽ không có nghĩa gì. Có lẽ có.'
    );
  const cid = await awaitBtn(ctx, embed, row);
  const fresh = getEffectivePlayer(ctx.userId, ctx.guildId)!;

  if (!cid || cid === `do_ignore_${ctx.userId}`) {
    return finish(ctx, simpleEmbed(COLORS.info, '🌆 *Bạn không để tâm và tiếp tục đường mình.*'));
  }
  if (cid === `do_heed_${ctx.userId}`) {
    setBuff(ctx.userId, ctx.guildId, 'scroll_detection', 1, 1, 7200);
    return finish(ctx, new EmbedBuilder()
      .setColor(COLORS.info)
      .setTitle('🌆 Cảnh Giác Vì Điềm Báo')
      .setDescription(
        'Bạn ghi nhớ điều đó trong đầu. Kể từ đây, mọi thứ xung quanh đều trở nên rõ ràng hơn.\n\n' +
        '📜 **Cảnh Giác** *(2 giờ)* — lượt Explore tiếp theo: +event tốt, -ambush.'
      )
    );
  }
  // Điều tra
  const roll = randInt(1, 100);
  if (roll <= 55) {
    const gold = randInt(12, 31);
    grantGold(ctx.userId, ctx.guildId, gold);
    return finish(ctx, simpleEmbed(COLORS.success,
      `🔎 Bạn theo dấu vết kỳ lạ và tìm thấy... một túi vàng bỏ quên.\n🪙 +**${gold} Gold**`
    ));
  }
  const dmg = Math.max(1, Math.floor(fresh.max_hp * 0.1));
  const hp = Math.max(1, fresh.hp - dmg);
  updatePlayerHpMp(ctx.userId, ctx.guildId, hp, fresh.mp);
  return finish(ctx, simpleEmbed(COLORS.danger,
    `🔎 Bạn tiến vào bóng tối — và vấp phải cái bẫy ai đó đặt sẵn.\n❤️ HP mất **${dmg}**`
  ));
}

// ════════════════════════════════════════════════════════════════════════
//  NIGHT (20:00 – 04:59)
// ════════════════════════════════════════════════════════════════════════

export async function showNightPredator(ctx: RunExploreEventInput): Promise<void> {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`np_fight_${ctx.userId}`).setLabel('Nghênh chiến').setEmoji('⚔️').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`np_scare_${ctx.userId}`).setLabel('Dọa đuổi nó đi').setEmoji('🔥').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`np_flee_${ctx.userId}`).setLabel('Lùi lại nhanh').setEmoji('🏃').setStyle(ButtonStyle.Secondary),
  );
  const creatures = [
    { name: 'Linh Thú Đêm', icon: '🐆', desc: 'Một bóng đen lao nhanh qua bóng tối — mắt nó phát sáng đỏ.' },
    { name: 'Sói Đêm', icon: '🐺', desc: 'Tiếng gầm rú từ bụi rậm. Một con sói đen khổng lồ bước ra, lông dựng đứng.' },
    { name: 'Quái Vật Hang', icon: '🦇', desc: 'Một bầy dơi khổng lồ bất ngờ lao xuống từ vách đá phía trên.' },
  ];
  const creature = pick(creatures);
  const embed = new EmbedBuilder()
    .setColor(0x220033)
    .setTitle('🌙 Thú Săn Đêm')
    .setDescription(
      `**${creature.icon} ${creature.name}**\n${creature.desc}\n\n` +
      '*Đêm tối là lãnh địa của chúng.*'
    );
  const cid = await awaitBtn(ctx, embed, row);
  const fresh = getEffectivePlayer(ctx.userId, ctx.guildId)!;

  if (!cid || cid === `np_flee_${ctx.userId}`) {
    const dmg = Math.max(1, Math.floor(fresh.max_hp * 0.08));
    const hp = Math.max(1, fresh.hp - dmg);
    updatePlayerHpMp(ctx.userId, ctx.guildId, hp, fresh.mp);
    return finish(ctx, simpleEmbed(COLORS.warning,
      `🏃 Bạn lùi lại — nhưng không kịp hoàn toàn. Móng vuốt kịp cào qua vai bạn.\n❤️ HP mất **${dmg}**`
    ));
  }
  if (cid === `np_scare_${ctx.userId}`) {
    const roll = randInt(1, 100);
    if (roll <= 55) {
      return finish(ctx, simpleEmbed(COLORS.success,
        `🔥 Bạn la hét và vung vũ khí — **${creature.name}** lùi lại rồi biến vào bóng tối.\n\n*Có khi chúng sợ hơn mình nghĩ.*`
      ));
    }
    // Fail → combat
    const dmg = Math.max(1, Math.floor(fresh.max_hp * 0.05));
    const hp = Math.max(1, fresh.hp - dmg);
    updatePlayerHpMp(ctx.userId, ctx.guildId, hp, fresh.mp);
    // Fall through to combat after intro
    await ctx.interaction.editReply({
      embeds: [simpleEmbed(COLORS.danger,
        `🔥 **${creature.name}** không bị dọa — nó lao thẳng vào bạn!\n❤️ HP mất **${dmg}** khi nó vồ.\n\n*Chiến đấu bắt đầu...*`
      )],
      components: []
    });
    await new Promise(r => setTimeout(r, 700));
    return ctx.callbacks.startCombat(pick(ctx.enemies).id);
  }
  // Chiến đấu
  await ctx.interaction.editReply({
    embeds: [simpleEmbed(COLORS.danger, `⚔️ Bạn rút vũ khí — **${creature.name}** lao tới!\n\n*Chiến đấu bắt đầu...*`)],
    components: []
  });
  await new Promise(r => setTimeout(r, 600));
  return ctx.callbacks.startCombat(pick(ctx.enemies).id);
}

export async function showMidnightWanderer(ctx: RunExploreEventInput): Promise<void> {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`mw_approach_${ctx.userId}`).setLabel('Tiếp cận').setEmoji('🕯️').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`mw_observe_${ctx.userId}`).setLabel('Quan sát yên lặng').setEmoji('👁️').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`mw_avoid_${ctx.userId}`).setLabel('Tránh xa').setStyle(ButtonStyle.Secondary),
  );
  const wanderers = [
    'Một người mặc áo choàng đen đứng bất động giữa đường. Không có bóng đổ.',
    'Một cụ già ngồi bên đống lửa nhỏ — lửa không tỏa hơi nóng.',
    'Một đứa trẻ cầm đèn lồng đứng giữa đêm tối — cách con đường gần nhất nửa dặm.',
  ];
  const embed = new EmbedBuilder()
    .setColor(0x111133)
    .setTitle('🌑 Kẻ Lang Thang Nửa Đêm')
    .setDescription(
      `*${pick(wanderers)}*\n\n` +
      'Bạn không chắc người này là ai. Hay là người thật sự.'
    );
  const cid = await awaitBtn(ctx, embed, row);
  const fresh = getEffectivePlayer(ctx.userId, ctx.guildId)!;

  if (!cid || cid === `mw_avoid_${ctx.userId}`) {
    return finish(ctx, simpleEmbed(COLORS.info, '🌑 *Bạn đi vòng tránh và không nhìn lại. Một số thứ tốt hơn là không biết.*'));
  }
  if (cid === `mw_observe_${ctx.userId}`) {
    const exp = randInt(10, 21);
    grantExp(ctx.userId, ctx.guildId, exp);
    return finish(ctx, simpleEmbed(COLORS.info,
      `👁️ Bạn quan sát từ xa. Kẻ kia không động đậy — rồi biến mất khi bạn nhắm mắt chớp.\n\n⭐ +**${exp} EXP** *(một kỷ niệm không thể giải thích)*`
    ));
  }
  // Tiếp cận — random
  const roll = randInt(1, 100);
  if (roll <= 30) {
    grantSoulShards(ctx.userId, ctx.guildId, 2);
    return finish(ctx, new EmbedBuilder()
      .setColor(COLORS.magic)
      .setTitle('🌑 Quà Từ Bóng Tối')
      .setDescription(
        '*Kẻ kia chìa tay ra. Trong lòng bàn tay là hai mảnh linh hồn rơi ra từ hư không.*\n\n' +
        '💀 +**2 Soul Shard**'
      )
    );
  }
  if (roll <= 65) {
    const items = ['mysterious_shard', 'broken_rune', 'dark_essence'] as const;
    const item = pick([...items]);
    addItem(ctx.userId, ctx.guildId, item, 1);
    return finish(ctx, new EmbedBuilder()
      .setColor(COLORS.info)
      .setTitle('🌑 Trao Đổi Im Lặng')
      .setDescription(
        '*Không một lời nói — chỉ một vật nhỏ được đặt vào tay bạn rồi người kia tan vào bóng đêm.*\n\n' +
        `🎁 +**1× ${item}**`
      )
    );
  }
  // Xui
  const dmg = Math.max(1, Math.floor(fresh.max_hp * 0.15));
  const hp = Math.max(1, fresh.hp - dmg);
  updatePlayerHpMp(ctx.userId, ctx.guildId, hp, fresh.mp);
  return finish(ctx, new EmbedBuilder()
    .setColor(COLORS.danger)
    .setTitle('🌑 Cái Giá Của Sự Tò Mò')
    .setDescription(
      '*Kẻ kia không nói gì. Chỉ đặt tay lên ngực bạn.*\n' +
      '*Và bạn cảm thấy một phần sinh lực rời khỏi cơ thể.*\n\n' +
      `❤️ HP mất **${dmg}** (${hp}/${fresh.max_hp})`
    )
  );
}


// ════════════════════════════════════════════════════════════════════════
//  EXTRA TIME EVENTS
// ════════════════════════════════════════════════════════════════════════

export async function showDawnDewBlessing(ctx: RunExploreEventInput): Promise<void> {
  const fresh = getEffectivePlayer(ctx.userId, ctx.guildId)!;
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`dew_drink_${ctx.userId}`).setLabel('Uống sương mai').setEmoji('💧').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`dew_collect_${ctx.userId}`).setLabel('Thu vào lọ').setEmoji('🫙').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`dew_leave_${ctx.userId}`).setLabel('Để nguyên').setStyle(ButtonStyle.Secondary),
  );
  const embed = new EmbedBuilder()
    .setColor(0x99DDFF)
    .setTitle('💧 Sương Mai Phủ Lá')
    .setDescription('Những giọt sương đầu ngày đọng trên lá, phát sáng nhẹ dưới bình minh. Có vẻ đây không phải nước bình thường.');
  const cid = await awaitBtn(ctx, embed, row);
  if (!cid || cid === `dew_leave_${ctx.userId}`) return finish(ctx, simpleEmbed(COLORS.info, '💧 *Bạn để những giọt sương lại cho khu rừng.*'));

  if (cid === `dew_drink_${ctx.userId}`) {
    const hp = Math.min(fresh.max_hp, fresh.hp + Math.floor(fresh.max_hp * 0.25));
    const mp = Math.min(fresh.max_mp, fresh.mp + Math.floor(fresh.max_mp * 0.35));
    updatePlayerHpMp(ctx.userId, ctx.guildId, hp, mp);
    return finish(ctx, simpleEmbed(COLORS.success, `💧 Sương tan trên đầu lưỡi, lạnh nhưng sạch như ánh sáng.\n❤️ HP: **${hp}/${fresh.max_hp}**\n🔵 MP: **${mp}/${fresh.max_mp}**`));
  }

  addItem(ctx.userId, ctx.guildId, 'mana_potion', 1);
  if (randInt(1, 100) <= 25) addItem(ctx.userId, ctx.guildId, 'moonwater', 1);
  return finish(ctx, simpleEmbed(COLORS.success, '🫙 Bạn hứng được sương vào một lọ nhỏ.\n🔵 +**1× Mana Potion**\n🌙 Có thể nhận thêm **Moonwater** nếu may mắn.'));
}

export async function showDawnHunterTracks(ctx: RunExploreEventInput): Promise<void> {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`ht_follow_${ctx.userId}`).setLabel('Lần theo dấu').setEmoji('👣').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`ht_mark_${ctx.userId}`).setLabel('Đánh dấu đường săn').setEmoji('📍').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`ht_ignore_${ctx.userId}`).setLabel('Bỏ qua').setStyle(ButtonStyle.Secondary),
  );
  const embed = new EmbedBuilder()
    .setColor(0xCCAA66)
    .setTitle('👣 Dấu Chân Sớm')
    .setDescription('Trên nền đất ẩm buổi sớm, bạn thấy một chuỗi dấu chân còn mới. Kẻ để lại chúng đang ở rất gần.');
  const cid = await awaitBtn(ctx, embed, row);
  if (!cid || cid === `ht_ignore_${ctx.userId}`) return finish(ctx, simpleEmbed(COLORS.info, '👣 *Bạn không mạo hiểm và rời khỏi dấu vết.*'));

  if (cid === `ht_mark_${ctx.userId}`) {
    setBuff(ctx.userId, ctx.guildId, 'scroll_detection', 1, 1, 7200);
    return finish(ctx, simpleEmbed(COLORS.info, '📍 Bạn đánh dấu hướng đi của dấu chân.\n📜 Lượt explore tiếp theo: tăng tỉ lệ event tốt, giảm ambush.'));
  }

  if (ctx.enemies.length && randInt(1, 100) <= 60) {
    await ctx.interaction.editReply({ embeds: [simpleEmbed(COLORS.danger, '👣 Dấu chân dẫn bạn tới ổ săn của quái.\n\n*Chiến đấu bắt đầu...*')], components: [] });
    await new Promise(r => setTimeout(r, 600));
    return ctx.callbacks.startCombat(pick(ctx.enemies).id);
  }
  addItem(ctx.userId, ctx.guildId, 'leather', 2);
  grantExp(ctx.userId, ctx.guildId, 18);
  return finish(ctx, simpleEmbed(COLORS.success, '👣 Dấu chân dẫn tới một con mồi đã bỏ lại lớp da khi chạy trốn.\n🟫 +**2× Leather**\n⭐ +**18 EXP**'));
}

export async function showDayTrainingGround(ctx: RunExploreEventInput): Promise<void> {
  const fresh = getEffectivePlayer(ctx.userId, ctx.guildId)!;
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`tg_train_${ctx.userId}`).setLabel('Tập luyện').setEmoji('🏋️').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`tg_spar_${ctx.userId}`).setLabel('Đấu tập').setEmoji('⚔️').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`tg_rest_${ctx.userId}`).setLabel('Chỉ quan sát').setStyle(ButtonStyle.Secondary),
  );
  const embed = new EmbedBuilder()
    .setColor(0xDDCC88)
    .setTitle('🏋️ Bãi Tập Giữa Ngày')
    .setDescription('Dưới nắng cao, vài cọc gỗ và hình nhân cũ đứng giữa bãi đất. Chúng đủ tốt để tập luyện — hoặc đấu thử thật sự.');
  const cid = await awaitBtn(ctx, embed, row);
  if (!cid || cid === `tg_rest_${ctx.userId}`) return finish(ctx, simpleEmbed(COLORS.info, '🏋️ *Bạn quan sát cách đặt chân và nhịp thở của những người từng tập ở đây.*\n⭐ +**7 EXP**'));

  if (cid === `tg_train_${ctx.userId}`) {
    const exp = randInt(21, 43);
    const dmg = Math.max(1, Math.floor(fresh.max_hp * 0.06));
    const hp = Math.max(1, fresh.hp - dmg);
    updatePlayerHpMp(ctx.userId, ctx.guildId, hp, fresh.mp);
    grantExp(ctx.userId, ctx.guildId, exp);
    setBuff(ctx.userId, ctx.guildId, 'weapon_oil', 5, 1, 3600);
    return finish(ctx, simpleEmbed(COLORS.success, `🏋️ Bạn tập đến mỏi cơ. Đau, nhưng đáng.\n⭐ +**${exp} EXP**\n❤️ HP mất **${dmg}**\n⚔️ Trận kế tiếp: **ATK +5%**`));
  }

  if (ctx.enemies.length) {
    await ctx.interaction.editReply({ embeds: [simpleEmbed(COLORS.danger, '⚔️ Bạn chọn đấu tập... nhưng thứ bước ra từ sau cọc gỗ không phải người.\n\n*Chiến đấu bắt đầu...*')], components: [] });
    await new Promise(r => setTimeout(r, 600));
    return ctx.callbacks.startCombat(pick(ctx.enemies).id);
  }
  return finish(ctx, simpleEmbed(COLORS.info, '⚔️ Không có đối thủ nào xuất hiện. Bạn tự tập một mình.'));
}

export async function showDaySupplyCart(ctx: RunExploreEventInput): Promise<void> {
  const fresh = getEffectivePlayer(ctx.userId, ctx.guildId)!;
  const canBuy = fresh.gold >= 70;
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`sc_buy_${ctx.userId}`).setLabel('Mua gói tiếp tế').setEmoji('📦').setStyle(ButtonStyle.Primary).setDisabled(!canBuy),
    new ButtonBuilder().setCustomId(`sc_help_${ctx.userId}`).setLabel('Giúp đẩy xe').setEmoji('🤝').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`sc_pass_${ctx.userId}`).setLabel('Đi tiếp').setStyle(ButtonStyle.Secondary),
  );
  const embed = new EmbedBuilder()
    .setColor(0xFFD36A)
    .setTitle('📦 Xe Tiếp Tế Ban Ngày')
    .setDescription('Một chiếc xe tiếp tế bị kẹt bánh giữa đường. Chủ xe vẫy tay gọi bạn, vừa mệt vừa cảnh giác.');
  const cid = await awaitBtn(ctx, embed, row);
  if (!cid || cid === `sc_pass_${ctx.userId}`) return finish(ctx, simpleEmbed(COLORS.info, '📦 *Bạn gật đầu rồi đi tiếp, để chiếc xe lại sau lưng.*'));

  if (cid === `sc_buy_${ctx.userId}`) {
    spendGold(ctx.userId, ctx.guildId, 70);
    addItem(ctx.userId, ctx.guildId, 'health_potion', 1);
    addItem(ctx.userId, ctx.guildId, 'mana_potion', 1);
    return finish(ctx, simpleEmbed(COLORS.success, '📦 Bạn mua một gói tiếp tế gọn nhẹ.\n💰 -**70 Gold**\n🧪 +**1× Health Potion**\n🔵 +**1× Mana Potion**'));
  }

  const rep = adjustReputation(ctx.userId, ctx.guildId, 4);
  const gold = randInt(15, 34);
  grantGold(ctx.userId, ctx.guildId, gold);
  if (randInt(1, 100) <= 35) addItem(ctx.userId, ctx.guildId, 'bread', 1);
  return finish(ctx, simpleEmbed(COLORS.success, `🤝 Bạn giúp đẩy xe khỏi bùn. Chủ xe dúi cho bạn ít tiền cảm ơn.\n🪙 +**${gold} Gold**\n🤝 Reputation: **${rep}** (+4)`));
}

export async function showDuskCrowOmen(ctx: RunExploreEventInput): Promise<void> {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`co_feed_${ctx.userId}`).setLabel('Cho quạ ăn').setEmoji('🐦‍⬛').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`co_follow_${ctx.userId}`).setLabel('Đi theo đàn quạ').setEmoji('👣').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`co_shoo_${ctx.userId}`).setLabel('Đuổi đi').setEmoji('💢').setStyle(ButtonStyle.Danger),
  );
  const embed = new EmbedBuilder()
    .setColor(0x4B2E2E)
    .setTitle('🐦‍⬛ Đàn Quạ Hoàng Hôn')
    .setDescription('Một đàn quạ đen đậu kín cành cây. Chúng không kêu, chỉ nhìn bạn bằng hàng chục đôi mắt sáng.');
  const cid = await awaitBtn(ctx, embed, row);
  if (!cid) return finish(ctx, simpleEmbed(COLORS.info, '🐦‍⬛ *Đàn quạ bay đi khi mặt trời khuất hẳn.*'));

  if (cid === `co_feed_${ctx.userId}`) {
    const rep = adjustReputation(ctx.userId, ctx.guildId, 3);
    setBuff(ctx.userId, ctx.guildId, 'luck', 1, 1, 3600);
    return finish(ctx, simpleEmbed(COLORS.success, `🐦‍⬛ Bạn thả vài mẩu thức ăn xuống đất. Một con quạ để lại vật sáng nhỏ rồi bay đi.\n🍀 May mắn nhẹ trong 1 giờ\n🤝 Reputation: **${rep}** (+3)`));
  }
  if (cid === `co_follow_${ctx.userId}`) {
    const roll = randInt(1, 100);
    if (roll <= 50) { addItem(ctx.userId, ctx.guildId, 'dark_wing', 1); return finish(ctx, simpleEmbed(COLORS.magic, '👣 Đàn quạ dẫn bạn tới một chiếc lông đen còn ấm.\n🖤 +**1× Dark Wing**')); }
    if (ctx.enemies.length) { await ctx.interaction.editReply({ embeds: [simpleEmbed(COLORS.danger, '👣 Đàn quạ dẫn bạn tới một xác chết... và thứ đang ăn nó.\n\n*Chiến đấu bắt đầu...*')], components: [] }); await new Promise(r => setTimeout(r, 600)); return ctx.callbacks.startCombat(pick(ctx.enemies).id); }
  }
  adjustWanted(ctx.userId, ctx.guildId, 1);
  return finish(ctx, simpleEmbed(COLORS.warning, '💢 Bạn đuổi đàn quạ. Một con quạ cào lên tấm truy nã gần đó rồi bay đi.\n⚠️ Wanted +1'));
}

export async function showDuskCardDealer(ctx: RunExploreEventInput): Promise<void> {
  const fresh = getEffectivePlayer(ctx.userId, ctx.guildId)!;
  const canPlay = fresh.gold >= 40;
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`card_draw_${ctx.userId}`).setLabel('Rút 1 lá - 40 Gold').setEmoji('🃏').setStyle(ButtonStyle.Primary).setDisabled(!canPlay),
    new ButtonBuilder().setCustomId(`card_watch_${ctx.userId}`).setLabel('Xem bói miễn phí').setEmoji('👁️').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`card_leave_${ctx.userId}`).setLabel('Rời bàn').setStyle(ButtonStyle.Secondary),
  );
  const embed = new EmbedBuilder()
    .setColor(0x663399)
    .setTitle('🃏 Người Chia Bài Lúc Chạng Vạng')
    .setDescription('Một người lạ ngồi bên chiếc bàn gỗ giữa đường, bộ bài úp sẵn. “Hoàng hôn là lúc số phận dễ đổi tay nhất.”');
  const cid = await awaitBtn(ctx, embed, row);
  if (!cid || cid === `card_leave_${ctx.userId}`) return finish(ctx, simpleEmbed(COLORS.info, '🃏 *Bạn không ngồi xuống chiếc bàn kỳ lạ đó.*'));

  if (cid === `card_watch_${ctx.userId}`) {
    setBuff(ctx.userId, ctx.guildId, 'scroll_detection', 1, 1, 7200);
    return finish(ctx, simpleEmbed(COLORS.info, '👁️ Người chia bài lật một lá trống. “Đường trước mặt ngươi sẽ rõ hơn một chút.”\n📜 Lượt explore kế tiếp tốt hơn.'));
  }

  spendGold(ctx.userId, ctx.guildId, 40);
  const roll = randInt(1, 100);
  if (roll <= 30) { grantGold(ctx.userId, ctx.guildId, 74); return finish(ctx, simpleEmbed(COLORS.gold, '🃏 Lá **Crown**. Bạn thắng lớn.\n🪙 -40 Gold, +**74 Gold**')); }
  if (roll <= 60) { addItem(ctx.userId, ctx.guildId, 'fate_coin', 1); return finish(ctx, simpleEmbed(COLORS.success, '🃏 Lá **Wheel**. Đồng xu số phận rơi xuống bàn.\n🪙 +**1× Fate Coin**')); }
  if (roll <= 82) { grantExp(ctx.userId, ctx.guildId, 32); return finish(ctx, simpleEmbed(COLORS.info, '🃏 Lá **Mirror**. Bạn thấy một lựa chọn cũ trong đời mình.\n⭐ +**32 EXP**')); }
  const dmg = Math.max(1, Math.floor(fresh.max_hp * 0.12));
  updatePlayerHpMp(ctx.userId, ctx.guildId, Math.max(1, fresh.hp - dmg), fresh.mp);
  return finish(ctx, simpleEmbed(COLORS.warning, `🃏 Lá **Knife**. Mép lá bài cứa vào lòng bàn tay.\n❤️ HP mất **${dmg}**`));
}

export async function showNightGhostLantern(ctx: RunExploreEventInput): Promise<void> {
  const fresh = getEffectivePlayer(ctx.userId, ctx.guildId)!;
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`gl_follow_${ctx.userId}`).setLabel('Đi theo đèn').setEmoji('🕯️').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`gl_pray_${ctx.userId}`).setLabel('Cầu nguyện từ xa').setEmoji('🙏').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`gl_hide_${ctx.userId}`).setLabel('Ẩn nấp').setEmoji('🌑').setStyle(ButtonStyle.Secondary),
  );
  const embed = new EmbedBuilder()
    .setColor(0x112244)
    .setTitle('🕯️ Đèn Ma Trên Đường')
    .setDescription('Một chiếc đèn lồng xanh trôi lơ lửng trên đường mòn. Nó dừng lại mỗi khi bạn dừng lại.');
  const cid = await awaitBtn(ctx, embed, row);
  if (!cid || cid === `gl_hide_${ctx.userId}`) return finish(ctx, simpleEmbed(COLORS.info, '🌑 *Bạn nấp sau thân cây cho tới khi ngọn đèn biến mất.*'));

  if (cid === `gl_pray_${ctx.userId}`) {
    const rep = adjustReputation(ctx.userId, ctx.guildId, 4);
    const mp = Math.min(fresh.max_mp, fresh.mp + Math.floor(fresh.max_mp * 0.3));
    updatePlayerHpMp(ctx.userId, ctx.guildId, fresh.hp, mp);
    return finish(ctx, simpleEmbed(COLORS.success, `🙏 Ngọn đèn khẽ cúi xuống như đáp lễ.\n🔵 MP: **${mp}/${fresh.max_mp}**\n🤝 Reputation: **${rep}** (+4)`));
  }

  const roll = randInt(1, 100);
  if (roll <= 45) { grantSoulShards(ctx.userId, ctx.guildId, 1); return finish(ctx, simpleEmbed(COLORS.magic, '🕯️ Ngọn đèn dẫn bạn tới một bia mộ vô danh.\n💀 +**1 Soul Shard**')); }
  if (roll <= 70 && ctx.enemies.length) { await ctx.interaction.editReply({ embeds: [simpleEmbed(COLORS.danger, '🕯️ Ngọn đèn tắt phụt. Từ bóng tối, có thứ bước ra.\n\n*Chiến đấu bắt đầu...*')], components: [] }); await new Promise(r => setTimeout(r, 600)); return ctx.callbacks.startCombat(pick(ctx.enemies).id); }
  const dmg = Math.max(1, Math.floor(fresh.max_hp * 0.1));
  updatePlayerHpMp(ctx.userId, ctx.guildId, Math.max(1, fresh.hp - dmg), fresh.mp);
  return finish(ctx, simpleEmbed(COLORS.warning, `🕯️ Bạn đi theo quá sâu vào sương lạnh.\n❤️ HP mất **${dmg}**`));
}

export async function showNightGraveRobbers(ctx: RunExploreEventInput): Promise<void> {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`gr_stop_${ctx.userId}`).setLabel('Ngăn lại').setEmoji('🛡️').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`gr_join_${ctx.userId}`).setLabel('Chia phần').setEmoji('💰').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`gr_report_${ctx.userId}`).setLabel('Theo dõi rồi báo tin').setEmoji('👁️').setStyle(ButtonStyle.Secondary),
  );
  const embed = new EmbedBuilder()
    .setColor(0x222222)
    .setTitle('🪦 Kẻ Đào Mộ Ban Đêm')
    .setDescription('Dưới ánh trăng, vài bóng người đang đào bới quanh một ngôi mộ cũ. Họ chưa thấy bạn.');
  const cid = await awaitBtn(ctx, embed, row);
  if (!cid) return finish(ctx, simpleEmbed(COLORS.info, '🪦 *Bạn im lặng rời đi trước khi bị phát hiện.*'));

  if (cid === `gr_stop_${ctx.userId}`) {
    const rep = adjustReputation(ctx.userId, ctx.guildId, 6);
    if (ctx.enemies.length && randInt(1, 100) <= 50) { await ctx.interaction.editReply({ embeds: [simpleEmbed(COLORS.danger, `🛡️ Bạn bước ra ngăn chúng lại. Chúng rút vũ khí.\n🤝 Reputation: **${rep}** (+6)\n\n*Chiến đấu bắt đầu...*`)], components: [] }); await new Promise(r => setTimeout(r, 600)); return ctx.callbacks.startCombat(pick(ctx.enemies).id); }
    grantExp(ctx.userId, ctx.guildId, 28);
    return finish(ctx, simpleEmbed(COLORS.success, `🛡️ Bạn dọa chúng chạy mất.\n🤝 Reputation: **${rep}** (+6)\n⭐ +**28 EXP**`));
  }

  if (cid === `gr_join_${ctx.userId}`) {
    const rep = adjustReputation(ctx.userId, ctx.guildId, -8);
    const gold = randInt(49, 99);
    grantGold(ctx.userId, ctx.guildId, gold);
    addItem(ctx.userId, ctx.guildId, 'ancient_bone', 1);
    return finish(ctx, simpleEmbed(COLORS.warning, `💰 Bạn nhận phần của mình trong im lặng.\n🪙 +**${gold} Gold**\n💀 +**1× Ancient Bone**\n🤝 Reputation: **${rep}** (-8)`));
  }

  setBuff(ctx.userId, ctx.guildId, 'scroll_detection', 1, 1, 7200);
  const rep = adjustReputation(ctx.userId, ctx.guildId, 3);
  return finish(ctx, simpleEmbed(COLORS.info, `👁️ Bạn ghi nhớ mặt chúng và dấu đường.\n📜 Lượt explore sau an toàn hơn\n🤝 Reputation: **${rep}** (+3)`));
}
