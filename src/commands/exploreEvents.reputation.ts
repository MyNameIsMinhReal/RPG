import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  Message
} from 'discord.js';
import type { RunExploreEventInput } from './exploreEvents';
import {
  addItem,
  adjustFaction,
  adjustReputation,
  adjustWanted,
  getItemQty,
  getPlayer,
  grantExp,
  grantGold,
  grantSoulShards,
  removeItem,
  spendGold,
  updatePlayerHpMp
} from '../systems/player';
import { setBuff } from '../systems/consumables';
import { adjustWorldDanger, logEvent, setFlag } from '../systems/world';
import { startCombatFlowWithEnemy } from '../systems/combatFlow';
import { COLORS, simpleEmbed } from '../utils/embeds';
import { onlyUser } from '../utils/collectors';
import { pick, randInt } from '../utils/format';

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
  row: ActionRowBuilder<ButtonBuilder>,
  time = 30_000
): Promise<string | null> {
  const reply = await ctx.interaction.editReply({ embeds: [embed], components: [row] });
  const btn = await reply.awaitMessageComponent({ filter: onlyUser(ctx.userId), time }).catch(() => null);
  if (!btn || !btn.isButton()) return null;
  const ok = await btn.deferUpdate().then(() => true).catch(() => false);
  return ok ? btn.customId : null;
}

function healPercent(ctx: RunExploreEventInput, hpPct: number, mpPct = 0): { hp: number; mp: number } {
  const fresh = getPlayer(ctx.userId, ctx.guildId)!;
  const hp = Math.min(fresh.max_hp, fresh.hp + Math.floor(fresh.max_hp * hpPct));
  const mp = Math.min(fresh.max_mp, fresh.mp + Math.floor(fresh.max_mp * mpPct));
  updatePlayerHpMp(ctx.userId, ctx.guildId, hp, mp);
  return { hp, mp };
}

function repLine(ctx: RunExploreEventInput, amount: number): string {
  const rep = adjustReputation(ctx.userId, ctx.guildId, amount);
  return `🤝 Reputation: **${rep}** (${amount > 0 ? '+' : ''}${amount})`;
}

// ════════════════════════════════════════════════════════════════════════
//  HIGH REPUTATION — global events
// ════════════════════════════════════════════════════════════════════════

export async function showRepHonoredPatrol(ctx: RunExploreEventInput): Promise<void> {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`rhp_report_${ctx.userId}`).setLabel('Báo tin nguy hiểm').setEmoji('📣').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`rhp_escort_${ctx.userId}`).setLabel('Nhận hộ tống').setEmoji('🛡️').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`rhp_decline_${ctx.userId}`).setLabel('Từ chối lịch sự').setStyle(ButtonStyle.Secondary),
  );
  const embed = new EmbedBuilder()
    .setColor(COLORS.success)
    .setTitle('🛡️ Đội Tuần Tra Kính Chào')
    .setDescription(
      'Một đội tuần tra nhận ra bạn từ xa. Người đội trưởng đặt tay lên ngực cúi chào.\n' +
      '*“Danh tiếng của ngài đi trước cả bước chân. Chúng tôi có thể giúp gì?”*'
    );
  const cid = await awaitBtn(ctx, embed, row);

  if (cid === `rhp_report_${ctx.userId}`) {
    const exp = randInt(18, 39);
    grantExp(ctx.userId, ctx.guildId, exp);
    adjustWorldDanger(ctx.guildId, -4);
    const faction = adjustFaction(ctx.userId, ctx.guildId, 'villagers', 5);
    return finish(ctx, simpleEmbed(COLORS.success,
      `📣 Bạn chỉ cho họ những dấu vết nguy hiểm gần đó. Một cuộc phục kích được ngăn chặn trước khi xảy ra.\n⭐ +**${exp} EXP**\n⚠️ World Danger -4\n🏘️ Villagers: **${faction}** (+5)`
    ));
  }

  if (cid === `rhp_escort_${ctx.userId}`) {
    setBuff(ctx.userId, ctx.guildId, 'armor_polish', 0, 1, 3600);
    const newWanted = adjustWanted(ctx.userId, ctx.guildId, -1);
    return finish(ctx, simpleEmbed(COLORS.success,
      `🛡️ Đội tuần tra đi cùng bạn một đoạn. Những kẻ rình rập trong bụi cây đều lùi lại.\n🛡️ Trận kế tiếp: **DEF +10%**\n📜 Wanted: **${newWanted}/5** (-1 nếu có)`
    ));
  }

  const line = repLine(ctx, 2);
  return finish(ctx, simpleEmbed(COLORS.info, `Bạn mỉm cười, từ chối sự hộ tống và tiếp tục đi một mình.\n${line}`));
}

export async function showRepGratefulVillagers(ctx: RunExploreEventInput): Promise<void> {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`rgv_accept_${ctx.userId}`).setLabel('Nhận quà').setEmoji('🎁').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`rgv_refuse_${ctx.userId}`).setLabel('Từ chối nhận vàng').setEmoji('🤲').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`rgv_donate_${ctx.userId}`).setLabel('Tặng lại 50 Gold').setEmoji('🪙').setStyle(ButtonStyle.Secondary),
  );
  const embed = new EmbedBuilder()
    .setColor(0x77dd77)
    .setTitle('🏘️ Gia Đình Biết Ơn')
    .setDescription('Một gia đình dân làng chạy đến gọi tên bạn. Họ từng được bạn cứu trong một chuyến explore trước đó.');
  const cid = await awaitBtn(ctx, embed, row);
  const fresh = getPlayer(ctx.userId, ctx.guildId)!;

  if (cid === `rgv_refuse_${ctx.userId}`) {
    const exp = randInt(14, 32);
    grantExp(ctx.userId, ctx.guildId, exp);
    const faction = adjustFaction(ctx.userId, ctx.guildId, 'villagers', 8);
    const line = repLine(ctx, 5);
    return finish(ctx, simpleEmbed(COLORS.success,
      `🤲 Bạn từ chối túi vàng. Đứa trẻ trong gia đình ôm lấy tay áo bạn.\n⭐ +**${exp} EXP**\n${line}\n🏘️ Villagers: **${faction}** (+8)`
    ));
  }

  if (cid === `rgv_donate_${ctx.userId}`) {
    if (fresh.gold < 50) return finish(ctx, simpleEmbed(COLORS.warning, '❌ Bạn không đủ **50 Gold** để tặng lại.'));
    spendGold(ctx.userId, ctx.guildId, 50);
    addItem(ctx.userId, ctx.guildId, 'health_potion', 1);
    adjustWorldDanger(ctx.guildId, -2);
    const faction = adjustFaction(ctx.userId, ctx.guildId, 'villagers', 12);
    const line = repLine(ctx, 8);
    return finish(ctx, simpleEmbed(COLORS.success,
      `🪙 Bạn để lại 50 Gold để họ sửa lại nhà. Họ nhất quyết dúi vào tay bạn một lọ thuốc.\n🎁 +**1× Health Potion**\n${line}\n🏘️ Villagers: **${faction}** (+12)\n⚠️ World Danger -2`
    ));
  }

  const gold = randInt(18, 46);
  grantGold(ctx.userId, ctx.guildId, gold);
  addItem(ctx.userId, ctx.guildId, pick(['herb', 'minor_healing_potion', 'mana_potion']));
  return finish(ctx, simpleEmbed(COLORS.success, `🎁 Bạn nhận món quà giản dị của họ.\n🪙 +**${gold} Gold**\n🎒 +**1 vật phẩm hỗ trợ**`));
}

export async function showRepSupplyCache(ctx: RunExploreEventInput): Promise<void> {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`rsc_take_${ctx.userId}`).setLabel('Nhận tiếp tế').setEmoji('📦').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`rsc_share_${ctx.userId}`).setLabel('Chia cho người khác').setEmoji('🤝').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`rsc_map_${ctx.userId}`).setLabel('Nhận bản đồ an toàn').setEmoji('🗺️').setStyle(ButtonStyle.Secondary),
  );
  const embed = new EmbedBuilder()
    .setColor(0xdeb887)
    .setTitle('📦 Hòm Tiếp Tế Của Thương Hội')
    .setDescription('Một hòm gỗ có đóng dấu Thương Hội nằm cạnh đường. Trên nắp có dòng chữ: *“Dành cho những người bảo vệ vùng đất này.”*');
  const cid = await awaitBtn(ctx, embed, row);

  if (cid === `rsc_share_${ctx.userId}`) {
    const faction = adjustFaction(ctx.userId, ctx.guildId, 'merchants', 8);
    adjustWorldDanger(ctx.guildId, -3);
    const line = repLine(ctx, 4);
    return finish(ctx, simpleEmbed(COLORS.success, `🤝 Bạn chia hòm tiếp tế cho những người đi đường phía sau.\n${line}\n🏦 Merchants: **${faction}** (+8)\n⚠️ World Danger -3`));
  }
  if (cid === `rsc_map_${ctx.userId}`) {
    setBuff(ctx.userId, ctx.guildId, 'scroll_detection', 0, 1, 3600);
    return finish(ctx, simpleEmbed(COLORS.success, '🗺️ Bạn lấy một bản đồ đánh dấu đường an toàn.\n📜 Lần explore tiếp theo có tỉ lệ event tốt cao hơn.'));
  }

  addItem(ctx.userId, ctx.guildId, 'health_potion', 1);
  addItem(ctx.userId, ctx.guildId, 'mana_potion', 1);
  addItem(ctx.userId, ctx.guildId, 'discount_token', 1);
  return finish(ctx, simpleEmbed(COLORS.success, '📦 Bạn nhận phần tiếp tế.\n🎁 +**Health Potion**\n🎁 +**Mana Potion**\n🎟️ +**Discount Token**'));
}

export async function showRepChurchBlessing(ctx: RunExploreEventInput): Promise<void> {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`rcb_bless_${ctx.userId}`).setLabel('Nhận phước lành').setEmoji('🕯️').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`rcb_pray_${ctx.userId}`).setLabel('Cầu nguyện cho người khác').setEmoji('🙏').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`rcb_cleanse_${ctx.userId}`).setLabel('Xin xóa truy nã').setEmoji('📜').setStyle(ButtonStyle.Secondary),
  );
  const embed = new EmbedBuilder()
    .setColor(0xffffff)
    .setTitle('🕯️ Phước Lành Của Giáo Đoàn')
    .setDescription('Một tu sĩ nhận ra bạn và mở cửa nhà nguyện nhỏ bên đường. Ánh nến bên trong không lay động dù gió thổi mạnh.');
  const cid = await awaitBtn(ctx, embed, row);

  if (cid === `rcb_pray_${ctx.userId}`) {
    const exp = randInt(25, 50);
    grantExp(ctx.userId, ctx.guildId, exp);
    adjustWorldDanger(ctx.guildId, -4);
    const faction = adjustFaction(ctx.userId, ctx.guildId, 'old_church', 10);
    const line = repLine(ctx, 5);
    return finish(ctx, simpleEmbed(COLORS.success, `🙏 Bạn không cầu cho bản thân, mà cầu cho những người còn đang lạc đường.\n⭐ +**${exp} EXP**\n${line}\n🕯️ Old Church: **${faction}** (+10)\n⚠️ World Danger -4`));
  }
  if (cid === `rcb_cleanse_${ctx.userId}`) {
    const wanted = adjustWanted(ctx.userId, ctx.guildId, -1);
    const faction = adjustFaction(ctx.userId, ctx.guildId, 'old_church', 4);
    return finish(ctx, simpleEmbed(COLORS.success, `📜 Tu sĩ viết thư bảo chứng cho bạn.\n📜 Wanted: **${wanted}/5** (-1 nếu có)\n🕯️ Old Church: **${faction}** (+4)`));
  }

  const { hp, mp } = healPercent(ctx, 0.35, 0.35);
  setBuff(ctx.userId, ctx.guildId, 'rune_charm', 0, 1, 3600);
  return finish(ctx, simpleEmbed(COLORS.success, `🕯️ Ánh nến phủ lên vai bạn.\n❤️ HP: **${hp}**\n🔵 MP: **${mp}**\n🧿 Trận kế tiếp: **Rune Charm** chặn nguyền/debuff.`));
}

export async function showRepYoungSquire(ctx: RunExploreEventInput): Promise<void> {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`rys_train_${ctx.userId}`).setLabel('Huấn luyện').setEmoji('⚔️').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`rys_gift_${ctx.userId}`).setLabel('Tặng potion').setEmoji('🧪').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`rys_warn_${ctx.userId}`).setLabel('Khuyên quay về').setStyle(ButtonStyle.Secondary),
  );
  const embed = new EmbedBuilder()
    .setColor(0x99ccff)
    .setTitle('⚔️ Tân Binh Ngưỡng Mộ')
    .setDescription('Một tân binh trẻ chạy theo bạn, thở hổn hển. *“Xin hãy dạy tôi một chiêu! Tôi cũng muốn giúp mọi người như ngài.”*');
  const cid = await awaitBtn(ctx, embed, row);

  if (cid === `rys_gift_${ctx.userId}`) {
    if (getItemQty(ctx.userId, ctx.guildId, 'health_potion') <= 0) return finish(ctx, simpleEmbed(COLORS.warning, '❌ Bạn không có **Health Potion** để tặng.'));
    removeItem(ctx.userId, ctx.guildId, 'health_potion', 1);
    const line = repLine(ctx, 6);
    adjustFaction(ctx.userId, ctx.guildId, 'villagers', 6);
    return finish(ctx, simpleEmbed(COLORS.success, `🧪 Bạn đưa cậu ta một lọ thuốc và dặn: “Sống sót trước đã.”\n${line}\n🏘️ Villagers +6`));
  }
  if (cid === `rys_warn_${ctx.userId}`) {
    const exp = randInt(10, 25);
    grantExp(ctx.userId, ctx.guildId, exp);
    const line = repLine(ctx, 3);
    return finish(ctx, simpleEmbed(COLORS.info, `Bạn kể cho cậu ta nghe những cái giá thật sự của chiến đấu.\n⭐ +**${exp} EXP**\n${line}`));
  }

  const exp = randInt(39, 72);
  grantExp(ctx.userId, ctx.guildId, exp);
  setBuff(ctx.userId, ctx.guildId, 'weapon_oil', 0, 1, 3600);
  return finish(ctx, simpleEmbed(COLORS.success, `⚔️ Bạn hướng dẫn cậu ta vài thế cơ bản, rồi chính bạn cũng làm nóng lại kỹ năng.\n⭐ +**${exp} EXP**\n🔩 Trận kế tiếp: **Weapon Oil**`));
}

export async function showRepHeroStatue(ctx: RunExploreEventInput): Promise<void> {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`rhs_polish_${ctx.userId}`).setLabel('Lau lại tượng').setEmoji('🧽').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`rhs_leavecoin_${ctx.userId}`).setLabel('Đặt 25 Gold').setEmoji('🪙').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`rhs_read_${ctx.userId}`).setLabel('Đọc lời khắc').setEmoji('📖').setStyle(ButtonStyle.Secondary),
  );
  const embed = new EmbedBuilder()
    .setColor(0xffd700)
    .setTitle('🏛️ Bức Tượng Vị Anh Hùng')
    .setDescription('Ở ngã ba đường có một bức tượng nhỏ. Gương mặt chưa giống bạn hoàn toàn, nhưng chiếc bảng đồng bên dưới lại ghi tên bạn.');
  const cid = await awaitBtn(ctx, embed, row);
  const fresh = getPlayer(ctx.userId, ctx.guildId)!;

  if (cid === `rhs_leavecoin_${ctx.userId}`) {
    if (fresh.gold < 25) return finish(ctx, simpleEmbed(COLORS.warning, '❌ Bạn không đủ **25 Gold**.'));
    spendGold(ctx.userId, ctx.guildId, 25);
    grantSoulShards(ctx.userId, ctx.guildId, 1);
    const line = repLine(ctx, 4);
    return finish(ctx, simpleEmbed(COLORS.success, `🪙 Đồng xu rơi xuống bệ đá. Bức tượng sáng nhẹ trong khoảnh khắc.\n💀 +**1 Soul Shard**\n${line}`));
  }
  if (cid === `rhs_polish_${ctx.userId}`) {
    adjustWorldDanger(ctx.guildId, -2);
    const faction = adjustFaction(ctx.userId, ctx.guildId, 'villagers', 6);
    const line = repLine(ctx, 4);
    return finish(ctx, simpleEmbed(COLORS.success, `🧽 Bạn lau sạch bụi bẩn trên tượng. Người qua đường dừng lại nhìn với ánh mắt yên tâm hơn.\n${line}\n🏘️ Villagers: **${faction}** (+6)\n⚠️ World Danger -2`));
  }

  const exp = randInt(25, 57);
  grantExp(ctx.userId, ctx.guildId, exp);
  return finish(ctx, simpleEmbed(COLORS.info, `📖 Dòng chữ kể lại một chiến công của bạn, nhưng được thêu dệt hơi quá mức.\n⭐ +**${exp} EXP** *(nhìn lại hành trình)*`));
}

export async function showRepRoyalMessenger(ctx: RunExploreEventInput): Promise<void> {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`rrm_accept_${ctx.userId}`).setLabel('Nhận thư bảo chứng').setEmoji('📜').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`rrm_refuse_${ctx.userId}`).setLabel('Từ chối đặc quyền').setEmoji('✋').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`rrm_supplies_${ctx.userId}`).setLabel('Xin tiếp tế thay dân').setEmoji('📦').setStyle(ButtonStyle.Secondary),
  );
  const embed = new EmbedBuilder()
    .setColor(0x9966ff)
    .setTitle('📜 Sứ Giả Hoàng Gia')
    .setDescription('Một người mặc áo choàng tím chặn bạn lại. *“Danh tiếng của ngài đã tới tận thủ phủ. Đây là thư bảo chứng cho người có công.”*');
  const cid = await awaitBtn(ctx, embed, row);

  if (cid === `rrm_refuse_${ctx.userId}`) {
    const line = repLine(ctx, 8);
    adjustFaction(ctx.userId, ctx.guildId, 'villagers', 8);
    return finish(ctx, simpleEmbed(COLORS.success, `✋ Bạn từ chối đặc quyền cá nhân. Sứ giả im lặng cúi đầu.\n${line}\n🏘️ Villagers +8`));
  }
  if (cid === `rrm_supplies_${ctx.userId}`) {
    addItem(ctx.userId, ctx.guildId, 'healing_potion', 1);
    addItem(ctx.userId, ctx.guildId, 'mana_flask', 1);
    adjustWorldDanger(ctx.guildId, -5);
    const faction = adjustFaction(ctx.userId, ctx.guildId, 'villagers', 10);
    return finish(ctx, simpleEmbed(COLORS.success, `📦 Sứ giả đồng ý chuyển một phần tiếp tế cho dân làng quanh vùng.\n🎁 +**Healing Potion**\n🎁 +**Mana Flask**\n⚠️ World Danger -5\n🏘️ Villagers: **${faction}** (+10)`));
  }

  addItem(ctx.userId, ctx.guildId, 'merchant_seal', 1);
  addItem(ctx.userId, ctx.guildId, 'discount_token', 1);
  const wanted = adjustWanted(ctx.userId, ctx.guildId, -1);
  return finish(ctx, simpleEmbed(COLORS.success, `📜 Bạn nhận thư bảo chứng. Các trạm gác sẽ bớt làm khó bạn hơn.\n🏷️ +**Merchant Seal**\n🎟️ +**Discount Token**\n📜 Wanted: **${wanted}/5** (-1 nếu có)`));
}

export async function showRepChampionChallenge(ctx: RunExploreEventInput): Promise<void> {
  const fresh = getPlayer(ctx.userId, ctx.guildId)!;
  const base = ctx.enemies.length ? pick(ctx.enemies) : null;
  const enemy = {
    id: `honor_champion_${ctx.userId}_${Date.now()}`,
    name: 'Champion of the Road',
    icon: '🏅',
    level: fresh.level + 2,
    hp: Math.max(90, Math.floor(fresh.max_hp * 1.15)),
    atk: Math.max(12, Math.floor((base?.atk ?? fresh.atk) * 1.15)),
    def: Math.max(4, Math.floor((base?.def ?? fresh.def) * 1.1)),
    expReward: Math.max(60, Math.floor(fresh.exp_next * 0.28)),
    goldMin: 70,
    goldMax: 150,
    drops: [{ itemId: 'rune_ink', chance: 100 }, { itemId: 'merchant_seal', chance: 35 }],
    zones: [ctx.player.zone_id],
    boss: false,
    lore: 'Một chiến binh danh dự muốn thử sức với người đang được dân chúng ca tụng.'
  };

  const embed = new EmbedBuilder()
    .setColor(0xffd700)
    .setTitle('🏅 Lời Thách Đấu Danh Dự')
    .setDescription('Một chiến binh giáp sáng bước ra giữa đường.\n*“Ta không tới để giết. Ta tới để xem danh tiếng của ngươi có xứng đáng không.”*');

  await ctx.interaction.editReply({ embeds: [embed], components: [] });
  await new Promise(r => setTimeout(r, 700));

  return ctx.callbacks.startCombatWithEnemy(enemy,
    async (_int, btn, _uid, _gid, _p, e, state) => {
      updatePlayerHpMp(ctx.userId, ctx.guildId, state.player_hp, state.player_mp);
      const exp = Math.max(60, Math.floor(fresh.exp_next * 0.25));
      const gold = randInt(37, 80);
      grantExp(ctx.userId, ctx.guildId, exp);
      grantGold(ctx.userId, ctx.guildId, gold);
      addItem(ctx.userId, ctx.guildId, 'rune_ink', 1);
      const line = repLine(ctx, 6);
      logEvent(ctx.guildId, ctx.userId, ctx.player.name, 'honor_duel', `đã thắng ${e.name}.`, ctx.player.zone_id);
      const msg = await btn.editReply({
        embeds: [new EmbedBuilder().setColor(0xffd700).setTitle('🏅 Thắng Trận Danh Dự').setDescription(
          `Champion đặt kiếm xuống và cúi đầu.\n⭐ +**${exp} EXP**\n🪙 +**${gold} Gold**\n🪄 +**Rune Ink**\n${line}`
        )],
        components: ctx.callbacks.buildContinueExploreRow(ctx.userId)
      });
      await ctx.callbacks.attachContinueExploreHandler(msg as Message<boolean>, ctx.interaction, ctx.userId, ctx.guildId);
    },
    ctx.callbacks.handleDeath
  );
}

// ════════════════════════════════════════════════════════════════════════
//  HIGH REPUTATION — zone events
// ════════════════════════════════════════════════════════════════════════

export async function showRepForestRangers(ctx: RunExploreEventInput): Promise<void> {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`rfr_track_${ctx.userId}`).setLabel('Đi săn cùng kiểm lâm').setEmoji('🏹').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`rfr_heal_${ctx.userId}`).setLabel('Nhận thảo dược').setEmoji('🌿').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`rfr_warn_${ctx.userId}`).setLabel('Cảnh báo dân làng').setStyle(ButtonStyle.Secondary),
  );
  const embed = new EmbedBuilder().setColor(0x33aa55).setTitle('🏹 Kiểm Lâm Rừng Già').setDescription('Các kiểm lâm nhận ra bạn và hạ cung xuống. Họ nói khu rừng hôm nay có dấu vết quái lạ.');
  const cid = await awaitBtn(ctx, embed, row);
  if (cid === `rfr_heal_${ctx.userId}`) {
    addItem(ctx.userId, ctx.guildId, 'herb', 3);
    const { hp } = healPercent(ctx, 0.2);
    return finish(ctx, simpleEmbed(COLORS.success, `🌿 Kiểm lâm đưa bạn bó thảo dược tươi.\n🌿 +**3 Herb**\n❤️ HP: **${hp}**`));
  }
  if (cid === `rfr_warn_${ctx.userId}`) {
    adjustWorldDanger(ctx.guildId, -3);
    const line = repLine(ctx, 4);
    return finish(ctx, simpleEmbed(COLORS.success, `Bạn giúp họ đánh dấu đường nguy hiểm cho dân làng.\n${line}\n⚠️ World Danger -3`));
  }
  grantExp(ctx.userId, ctx.guildId, randInt(35, 70));
  addItem(ctx.userId, ctx.guildId, 'wolf_fang', 1);
  return finish(ctx, simpleEmbed(COLORS.success, '🏹 Bạn đi săn cùng kiểm lâm một đoạn.\n⭐ +EXP\n🦷 +**Wolf Fang**'));
}

export async function showRepShrinePilgrims(ctx: RunExploreEventInput): Promise<void> {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`rsp_guard_${ctx.userId}`).setLabel('Hộ tống đoàn hành hương').setEmoji('⛩️').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`rsp_pray_${ctx.userId}`).setLabel('Cầu phúc cùng họ').setEmoji('🙏').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`rsp_take_${ctx.userId}`).setLabel('Nhận bùa nhỏ').setEmoji('🧿').setStyle(ButtonStyle.Secondary),
  );
  const embed = new EmbedBuilder().setColor(0xddbbff).setTitle('⛩️ Đoàn Hành Hương Tin Tưởng').setDescription('Một đoàn hành hương dừng lại khi thấy bạn. Họ xin được đi sau lưng bạn qua đoạn đền đổ nát.');
  const cid = await awaitBtn(ctx, embed, row);
  if (cid === `rsp_pray_${ctx.userId}`) {
    const { mp } = healPercent(ctx, 0, 0.45);
    const faction = adjustFaction(ctx.userId, ctx.guildId, 'old_church', 8);
    return finish(ctx, simpleEmbed(COLORS.success, `🙏 Tiếng kinh nhỏ vang lên trong sương.\n🔵 MP: **${mp}**\n🕯️ Old Church: **${faction}** (+8)`));
  }
  if (cid === `rsp_take_${ctx.userId}`) {
    addItem(ctx.userId, ctx.guildId, 'rune_charm', 1);
    return finish(ctx, simpleEmbed(COLORS.success, '🧿 Một cụ già buộc vào tay bạn một lá bùa.\n🧿 +**Rune Charm**'));
  }
  const gold = randInt(24, 55);
  grantGold(ctx.userId, ctx.guildId, gold);
  const line = repLine(ctx, 4);
  return finish(ctx, simpleEmbed(COLORS.success, `⛩️ Bạn hộ tống họ qua khu đền an toàn.\n🪙 +**${gold} Gold**\n${line}`));
}

export async function showRepMineRescueCrew(ctx: RunExploreEventInput): Promise<void> {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`rmr_lift_${ctx.userId}`).setLabel('Giúp kéo người mắc kẹt').setEmoji('⛏️').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`rmr_tools_${ctx.userId}`).setLabel('Nhận dụng cụ').setEmoji('⚙️').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`rmr_order_${ctx.userId}`).setLabel('Chỉ huy cứu hộ').setEmoji('📣').setStyle(ButtonStyle.Secondary),
  );
  const embed = new EmbedBuilder().setColor(0xcc9966).setTitle('⛏️ Đội Cứu Hộ Hầm Mỏ').setDescription('Một nhóm thợ mỏ reo lên khi thấy bạn. Có người còn mắc kẹt sau vách đá nứt.');
  const cid = await awaitBtn(ctx, embed, row);
  if (cid === `rmr_tools_${ctx.userId}`) {
    addItem(ctx.userId, ctx.guildId, 'rusty_gear', 2);
    addItem(ctx.userId, ctx.guildId, 'iron_ore', 2);
    return finish(ctx, simpleEmbed(COLORS.success, '⚙️ Đội cứu hộ chia cho bạn ít dụng cụ và quặng.\n⚙️ +**2 Rusty Gear**\n⛓️ +**2 Iron Ore**'));
  }
  if (cid === `rmr_order_${ctx.userId}`) {
    const exp = randInt(39, 72);
    grantExp(ctx.userId, ctx.guildId, exp);
    adjustWorldDanger(ctx.guildId, -4);
    return finish(ctx, simpleEmbed(COLORS.success, `📣 Bạn giữ mọi người bình tĩnh và chia nhóm đào cứu hộ.\n⭐ +**${exp} EXP**\n⚠️ World Danger -4`));
  }
  const gold = randInt(31, 68);
  grantGold(ctx.userId, ctx.guildId, gold);
  const line = repLine(ctx, 5);
  return finish(ctx, simpleEmbed(COLORS.success, `⛏️ Bạn kéo được người mắc kẹt ra khỏi khe đá.\n🪙 +**${gold} Gold**\n${line}`));
}

export async function showRepWastesRefugees(ctx: RunExploreEventInput): Promise<void> {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`rwr_water_${ctx.userId}`).setLabel('Chia nước và thuốc').setEmoji('🍶').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`rwr_route_${ctx.userId}`).setLabel('Chỉ đường an toàn').setEmoji('🧭').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`rwr_guard_${ctx.userId}`).setLabel('Canh gác một lúc').setEmoji('🛡️').setStyle(ButtonStyle.Secondary),
  );
  const embed = new EmbedBuilder().setColor(0xbb9966).setTitle('🏚️ Người Tị Nạn Trong Hoang Địa').setDescription('Một nhóm người che mặt khỏi bụi tro. Khi nhận ra bạn, họ vội đứng dậy xin chỉ đường thoát khỏi vùng chết.');
  const cid = await awaitBtn(ctx, embed, row);
  if (cid === `rwr_water_${ctx.userId}`) {
    if (getItemQty(ctx.userId, ctx.guildId, 'health_potion') > 0) removeItem(ctx.userId, ctx.guildId, 'health_potion', 1);
    const line = repLine(ctx, 7);
    adjustFaction(ctx.userId, ctx.guildId, 'villagers', 8);
    return finish(ctx, simpleEmbed(COLORS.success, `🍶 Bạn chia bớt thuốc và nước. Họ có thể đi tiếp.\n${line}\n🏘️ Villagers +8`));
  }
  if (cid === `rwr_guard_${ctx.userId}`) {
    setBuff(ctx.userId, ctx.guildId, 'quickstep_tea', 0, 1, 3600);
    grantExp(ctx.userId, ctx.guildId, randInt(35, 75));
    return finish(ctx, simpleEmbed(COLORS.success, '🛡️ Bạn canh gác cho họ nghỉ.\n⭐ +EXP\n⚡ Trận kế tiếp: né đòn đầu tốt hơn.'));
  }
  adjustWorldDanger(ctx.guildId, -5);
  const gold = randInt(18, 43);
  grantGold(ctx.userId, ctx.guildId, gold);
  return finish(ctx, simpleEmbed(COLORS.success, `🧭 Bạn chỉ họ đường tránh bão tro.\n🪙 +**${gold} Gold**\n⚠️ World Danger -5`));
}

// ════════════════════════════════════════════════════════════════════════
//  HIGH REPUTATION — time events
// ════════════════════════════════════════════════════════════════════════

export async function showRepDawnProcession(ctx: RunExploreEventInput): Promise<void> {
  adjustFaction(ctx.userId, ctx.guildId, 'old_church', 6);
  const { hp, mp } = healPercent(ctx, 0.25, 0.25);
  const line = repLine(ctx, 3);
  return finish(ctx, simpleEmbed(COLORS.success, `🌄 Một đoàn người đi lễ bình minh mời bạn đứng ở hàng đầu.\n❤️ HP: **${hp}**\n🔵 MP: **${mp}**\n${line}\n🕯️ Old Church +6`));
}

export async function showRepDayPublicThanks(ctx: RunExploreEventInput): Promise<void> {
  const gold = randInt(27, 74);
  grantGold(ctx.userId, ctx.guildId, gold);
  adjustFaction(ctx.userId, ctx.guildId, 'villagers', 5);
  return finish(ctx, simpleEmbed(COLORS.success, `☀️ Ban ngày, nhiều người nhận ra bạn trên đường và cùng gửi lời cảm ơn.\n🪙 +**${gold} Gold**\n🏘️ Villagers +5`));
}

export async function showRepDuskSafeLodging(ctx: RunExploreEventInput): Promise<void> {
  const { hp, mp } = healPercent(ctx, 0.45, 0.2);
  setFlag(ctx.guildId, `safe_lodging_${ctx.userId}`, '1', 86400);
  return finish(ctx, simpleEmbed(COLORS.success, `🌇 Khi hoàng hôn xuống, một quán trọ nhận ra bạn và cho nghỉ miễn phí.\n❤️ HP: **${hp}**\n🔵 MP: **${mp}**\n🏠 Safe lodging được ghi nhớ trong 24h.`));
}

export async function showRepNightWatchSignal(ctx: RunExploreEventInput): Promise<void> {
  setBuff(ctx.userId, ctx.guildId, 'scroll_detection', 0, 1, 3600);
  adjustWorldDanger(ctx.guildId, -3);
  return finish(ctx, simpleEmbed(COLORS.success, `🌑 Đêm xuống, đội gác bí mật thắp đèn hiệu để chỉ bạn đường an toàn.\n📜 Lần explore tiếp theo dễ gặp event tốt hơn.\n⚠️ World Danger -3`));
}
