import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  Message
} from 'discord.js';
import type { RunExploreEventInput } from './exploreEvents';
import { finishExploreEvent as finish, awaitExploreBtn as awaitBtn } from './exploreEventShared';
import {
  addItem,
  adjustFaction,
  adjustReputation,
  adjustWanted,
  getItemQty,
  getPlayer, getEffectivePlayer,
  grantExp,
  grantGold,
  grantSoulShards,
  removeItem,
  spendGold,
  updatePlayerHpMp
} from '../systems/player';
import {
  adjustWorldDanger,
  getFlag,
  getWorldDanger,
  increaseShopMarkup,
  increaseMerchantFear,
  logEvent,
  setFlag,
  setWorldEvent
} from '../systems/world';
import { COLORS, simpleEmbed } from '../utils/embeds';
import { onlyUser } from '../utils/collectors';
import { pick, randInt } from '../utils/format';


function repLine(ctx: RunExploreEventInput, amount: number): string {
  const rep = adjustReputation(ctx.userId, ctx.guildId, amount);
  return `🤝 Danh tiếng: **${rep}** (${amount >= 0 ? '+' : ''}${amount})`;
}

function factionLine(ctx: RunExploreEventInput, factionId: Parameters<typeof adjustFaction>[2], amount: number): string {
  const icons: Record<string, string> = {
    merchants: '🏪', hunters: '🏹', old_church: '⛪', shadow_court: '🌑', villagers: '🏘️'
  };
  const names: Record<string, string> = {
    merchants: 'Merchants', hunters: 'Hunters', old_church: 'Old Church',
    shadow_court: 'Shadow Court', villagers: 'Villagers'
  };
  const val = adjustFaction(ctx.userId, ctx.guildId, factionId, amount);
  return `${icons[factionId]} ${names[factionId]}: **${val}** (${amount >= 0 ? '+' : ''}${amount})`;
}

// ══════════════════════════════════════════════════════════════════════
//  WORLD STATE / NEWS EVENTS
// ══════════════════════════════════════════════════════════════════════

export async function showWorldPlaguesSpreads(ctx: RunExploreEventInput): Promise<void> {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`wps_help_${ctx.userId}`).setLabel('Giúp đỡ người bệnh').setEmoji('🤲').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`wps_report_${ctx.userId}`).setLabel('Báo với Old Church').setEmoji('⛪').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`wps_leave_${ctx.userId}`).setLabel('Tránh xa nhanh chóng').setStyle(ButtonStyle.Secondary),
  );
  const embed = new EmbedBuilder()
    .setColor(COLORS.warning)
    .setTitle('🤒 Người Lữ Hành Bệnh Nặng')
    .setDescription(
      'Một người lữ hành đang nằm co quắp bên vệ đường, mặt đỏ bừng, thở không đều.\n' +
      'Có những vết đốm kỳ lạ trên cánh tay — dấu hiệu của bệnh dịch đang lan rộng ở phía bắc.\n\n' +
      '*Bạn muốn xử lý thế nào?*'
    );
  const cid = await awaitBtn(ctx, embed, row);

  if (cid === `wps_help_${ctx.userId}`) {
    const roll = randInt(1, 100);
    if (roll <= 40) {
      // Lây bệnh nhẹ - mất HP
      const fresh = getEffectivePlayer(ctx.userId, ctx.guildId)!;
      const newHp = Math.max(1, fresh.hp - Math.floor(fresh.max_hp * 0.15));
      updatePlayerHpMp(ctx.userId, ctx.guildId, newHp, fresh.mp);
      setFlag(ctx.guildId, 'world_plague_active', '1', 43200);
      logEvent(ctx.guildId, ctx.userId, ctx.player.name ?? 'Unknown', 'world_plague', 'Đã tiếp xúc với người bệnh — dịch có thể lan rộng.', ctx.player.zone_id ?? null);
      return finish(ctx, simpleEmbed(COLORS.danger,
        '🤒 Bạn cố hết sức chăm sóc họ, nhưng bệnh có vẻ đã lây sang bạn.\n' +
        '💔 **-15% HP** vì nhiễm bệnh nhẹ.\n' +
        '⚠️ Tin tức về **dịch bệnh** bắt đầu lan ra trong vùng.'
      ));
    }
    const exp = randInt(14, 28);
    grantExp(ctx.userId, ctx.guildId, exp);
    return finish(ctx, simpleEmbed(COLORS.success,
      '🤲 May mắn, bệnh chưa lây. Bạn cho người lữ hành nước và thức ăn, họ dần hồi tỉnh.\n' +
      `⭐ +**${exp} EXP**\n${repLine(ctx, 3)}\n${factionLine(ctx, 'villagers', 5)}`
    ));
  }

  if (cid === `wps_report_${ctx.userId}`) {
    adjustWorldDanger(ctx.guildId, -5);
    setWorldEvent(ctx.guildId, 'plague_contained', 'Dịch bệnh được Old Church kiểm soát', 28800);
    return finish(ctx, simpleEmbed(COLORS.info,
      '⛪ Bạn nhanh chóng tìm đến tu sĩ Old Church gần nhất. Họ cách ly người bệnh và phong tỏa khu vực.\n' +
      '⚠️ World Danger **-5**\n' +
      `${factionLine(ctx, 'old_church', 10)}`
    ));
  }

  return finish(ctx, simpleEmbed(COLORS.info,
    '💨 Bạn giữ khoảng cách an toàn và đi nhanh qua. Không biết người đó sẽ ra sao...'
  ));
}

export async function showWorldBanditCoalition(ctx: RunExploreEventInput): Promise<void> {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`wbc_report_${ctx.userId}`).setLabel('Báo với Hunters Guild').setEmoji('🏹').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`wbc_shadow_${ctx.userId}`).setLabel('Bán thông tin cho Shadow Court').setEmoji('🌑').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`wbc_burn_${ctx.userId}`).setLabel('Đốt tài liệu').setEmoji('🔥').setStyle(ButtonStyle.Secondary),
  );
  const embed = new EmbedBuilder()
    .setColor(COLORS.danger)
    .setTitle('📋 Bằng Chứng Liên Minh Cướp')
    .setDescription(
      'Trong một trại bỏ hoang, bạn tìm thấy một tập tài liệu — danh sách các thủ lĩnh băng cướp đang liên kết với nhau.\n' +
      'Có bản đồ phân chia lãnh thổ, kế hoạch tấn công đoàn thương buôn, và chữ ký của ít nhất **7 nhóm** khác nhau.\n\n' +
      '*Đây là thông tin quý giá. Bạn sẽ làm gì?*'
    );
  const cid = await awaitBtn(ctx, embed, row);

  if (cid === `wbc_report_${ctx.userId}`) {
    const gold = randInt(37, 74);
    grantGold(ctx.userId, ctx.guildId, gold);
    adjustWorldDanger(ctx.guildId, -10);
    setWorldEvent(ctx.guildId, 'bandit_coalition_exposed', 'Liên minh cướp bị vạch trần nhờ thám tử ẩn danh', 86400);
    logEvent(ctx.guildId, ctx.userId, ctx.player.name ?? 'Unknown', 'world_news', 'Liên minh cướp rừng bị phá vỡ.', ctx.player.zone_id ?? null);
    return finish(ctx, simpleEmbed(COLORS.success,
      `🏹 Hunters Guild trả tiền thưởng cho thông tin đắt giá này.\n` +
      `🪙 +**${gold} Gold**\n⚠️ World Danger **-10**\n` +
      `${factionLine(ctx, 'hunters', 15)}\n` +
      `📰 *Tin tức lan ra: Liên minh cướp đang bị triệt phá.*`
    ));
  }

  if (cid === `wbc_shadow_${ctx.userId}`) {
    const gold = randInt(49, 93);
    grantGold(ctx.userId, ctx.guildId, gold);
    adjustWorldDanger(ctx.guildId, 5);
    return finish(ctx, simpleEmbed(COLORS.warning,
      `🌑 Shadow Court trả hậu hĩnh — họ muốn biết ai đứng sau liên minh này.\n` +
      `🪙 +**${gold} Gold**\n⚠️ World Danger **+5** (bọn cướp vẫn hoạt động)\n` +
      `${factionLine(ctx, 'shadow_court', 12)}\n${factionLine(ctx, 'hunters', -8)}`
    ));
  }

  const exp = randInt(7, 18);
  grantExp(ctx.userId, ctx.guildId, exp);
  return finish(ctx, simpleEmbed(COLORS.info,
    `🔥 Bạn đốt tài liệu. Không ai biết bạn từng ở đây.\n⭐ +**${exp} EXP** (mặc dù không chắc đó là quyết định đúng...)`
  ));
}

export async function showWorldConvoyAttacked(ctx: RunExploreEventInput): Promise<void> {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`wca_help_${ctx.userId}`).setLabel('Cứu người sống sót').setEmoji('🤝').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`wca_loot_${ctx.userId}`).setLabel('Lục túi người chết').setEmoji('💀').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`wca_pass_${ctx.userId}`).setLabel('Đi qua').setStyle(ButtonStyle.Secondary),
  );
  const embed = new EmbedBuilder()
    .setColor(COLORS.danger)
    .setTitle('🩸 Tàn Tích Đoàn Thương Buôn')
    .setDescription(
      'Đoàn xe thương buôn bị tấn công — hàng hóa vương vãi khắp đường, mấy tên lính hộ tống nằm bất động.\n' +
      'Một vài người sống sót đang co ro sau chiếc xe đổ, vẫn đang sợ hãi.\n\n' +
      '*Dấu vết tấn công còn rất tươi.*'
    );
  const cid = await awaitBtn(ctx, embed, row);

  if (cid === `wca_help_${ctx.userId}`) {
    const exp = randInt(21, 43);
    grantExp(ctx.userId, ctx.guildId, exp);
    addItem(ctx.userId, ctx.guildId, 'health_potion', 1);
    increaseMerchantFear(ctx.guildId, -10);
    logEvent(ctx.guildId, ctx.userId, ctx.player.name ?? 'Unknown', 'world_news', 'Đoàn thương buôn được giải cứu.', ctx.player.zone_id ?? null);
    return finish(ctx, simpleEmbed(COLORS.success,
      `🤝 Bạn giúp người sống sót sơ cứu và dẫn họ về làng an toàn. Họ dúi vào tay bạn lọ thuốc làm ơn.\n` +
      `⭐ +**${exp} EXP**\n🧪 +**1× Health Potion**\n` +
      `${factionLine(ctx, 'merchants', 12)}\n😨 Merchant Fear **-10**`
    ));
  }

  if (cid === `wca_loot_${ctx.userId}`) {
    const gold = randInt(24, 55);
    grantGold(ctx.userId, ctx.guildId, gold);
    adjustWanted(ctx.userId, ctx.guildId, 1);
    increaseMerchantFear(ctx.guildId, 8);
    return finish(ctx, simpleEmbed(COLORS.danger,
      `💀 Bạn lục lọc nhanh những túi xách còn lại. Có người sống sót nhìn thấy khuôn mặt bạn...\n` +
      `🪙 +**${gold} Gold**\n📜 Wanted **+1**\n` +
      `${factionLine(ctx, 'shadow_court', 6)}\n${factionLine(ctx, 'merchants', -20)}\n😨 Merchant Fear **+8**`
    ));
  }

  return finish(ctx, simpleEmbed(COLORS.info,
    '🚶 Bạn đi qua nhanh chóng, không muốn dính líu. Tiếng kêu cứu vẫn còn vang vọng mãi sau lưng...'
  ));
}

export async function showWorldMagicSurge(ctx: RunExploreEventInput): Promise<void> {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`wms_seal_${ctx.userId}`).setLabel('Phong ấn vết nứt').setEmoji('✨').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`wms_harvest_${ctx.userId}`).setLabel('Hút năng lượng').setEmoji('💜').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`wms_study_${ctx.userId}`).setLabel('Quan sát từ xa').setStyle(ButtonStyle.Secondary),
  );
  const embed = new EmbedBuilder()
    .setColor(0x9b59b6)
    .setTitle('🌀 Đợt Bùng Phát Ma Lực')
    .setDescription(
      'Không khí rung chuyển khi một **vết nứt không gian** nhỏ xuất hiện trước mặt bạn.\n' +
      'Năng lượng ma thuật tỏa ra xung quanh, làm cỏ cây xung quanh héo úa. Có mùi ozone và điều gì đó... cổ đại hơn.\n\n' +
      '*Hiện tượng này không thể bỏ qua.*'
    );
  const cid = await awaitBtn(ctx, embed, row);

  if (cid === `wms_seal_${ctx.userId}`) {
    const exp = randInt(25, 50);
    grantExp(ctx.userId, ctx.guildId, exp);
    setFlag(ctx.guildId, 'world_magic_surge_sealed', '1', 21600);
    logEvent(ctx.guildId, ctx.userId, ctx.player.name ?? 'Unknown', 'world_news', 'Vết nứt ma thuật bị phong ấn thành công.', ctx.player.zone_id ?? null);
    return finish(ctx, simpleEmbed(COLORS.success,
      `✨ Bạn đọc bùa phong ấn. Vết nứt co lại và biến mất — năng lượng hỗn loạn tiêu tan.\n` +
      `⭐ +**${exp} EXP**\n${factionLine(ctx, 'old_church', 12)}\n` +
      `📰 *Tin tức: Vết nứt ma thuật trong vùng đã bị phong ấn.*`
    ));
  }

  if (cid === `wms_harvest_${ctx.userId}`) {
    const shards = randInt(2, 4);
    grantSoulShards(ctx.userId, ctx.guildId, shards);
    const corr = parseInt(getFlag(ctx.guildId, 'world_corruption') ?? '0') + 8;
    setFlag(ctx.guildId, 'world_corruption', String(Math.min(100, corr)));
    adjustWorldDanger(ctx.guildId, 6);
    return finish(ctx, simpleEmbed(COLORS.warning,
      `💜 Bạn đưa tay vào vết nứt và hút lấy năng lượng thô. Nó bỏng rát nhưng mãn nguyện...\n` +
      `💠 +**${shards} Soul Shards**\n⚠️ World Danger **+6**\n🌑 World Corruption tăng lên.`
    ));
  }

  const exp = randInt(10, 21);
  grantExp(ctx.userId, ctx.guildId, exp);
  return finish(ctx, simpleEmbed(COLORS.info,
    `🔭 Bạn quan sát cẩn thận từ xa, ghi chú mọi chi tiết. Vết nứt tự đóng lại sau vài phút.\n⭐ +**${exp} EXP**`
  ));
}

export async function showWorldDarkOmen(ctx: RunExploreEventInput): Promise<void> {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`wdo_warn_${ctx.userId}`).setLabel('Cảnh báo làng gần nhất').setEmoji('⚠️').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`wdo_investigate_${ctx.userId}`).setLabel('Điều tra kỹ hơn').setEmoji('🔍').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`wdo_ignore_${ctx.userId}`).setLabel('Đó chỉ là mê tín').setStyle(ButtonStyle.Secondary),
  );
  const embed = new EmbedBuilder()
    .setColor(0x2c2c2c)
    .setTitle('🌑 Điềm Báo Đen Tối')
    .setDescription(
      'Đàn quạ bay tán loạn trên trời, mây đen vần vũ theo hướng lạ. Bạn tìm thấy xác một con nai trắng — ' +
      'động vật thiêng liêng của vùng này — nằm chết không vết thương.\n\n' +
      'Những người dân cổ sẽ gọi đây là **điềm chết** trước khi có tai họa lớn.'
    );
  const cid = await awaitBtn(ctx, embed, row);

  if (cid === `wdo_warn_${ctx.userId}`) {
    adjustWorldDanger(ctx.guildId, 8);
    setWorldEvent(ctx.guildId, 'dark_omen_warned', 'Điềm báo tối xuất hiện — làng xóm chuẩn bị phòng thủ', 43200);
    logEvent(ctx.guildId, ctx.userId, ctx.player.name ?? 'Unknown', 'world_news', 'Điềm báo tối được báo cáo — dân làng lo sợ.', ctx.player.zone_id ?? null);
    return finish(ctx, simpleEmbed(COLORS.warning,
      `⚠️ Bạn chạy về làng và báo cho trưởng làng. Dân làng hoảng loạn nhưng bắt đầu chuẩn bị.\n` +
      `${factionLine(ctx, 'villagers', 8)}\n⚠️ World Danger **+8** (ảnh hưởng tâm lý)\n` +
      `📰 *Tin tức: Điềm báo tối xuất hiện — cả vùng lo lắng.*`
    ));
  }

  if (cid === `wdo_investigate_${ctx.userId}`) {
    const exp = randInt(18, 36);
    grantExp(ctx.userId, ctx.guildId, exp);
    addItem(ctx.userId, ctx.guildId, 'ancient_rune', 1);
      return finish(ctx, simpleEmbed(COLORS.info,
      `🔍 Bạn điều tra kỹ. Xung quanh xác nai có những ký hiệu cổ đại khắc trên đất...\n` +
      `⭐ +**${exp} EXP**\n📜 +**1× Ancient Rune** (sao chép lại ký hiệu)\n` +
      `*(Thêm manh mối cho chương truyện...)*`
    ));
  }

  return finish(ctx, simpleEmbed(COLORS.info,
    '🙄 Bạn lắc đầu — đó chỉ là sự trùng hợp ngẫu nhiên. Hoặc vậy...'
  ));
}

// ══════════════════════════════════════════════════════════════════════
//  ECONOMY / TRADER EVENTS
// ══════════════════════════════════════════════════════════════════════

export async function showWorldPriceGouger(ctx: RunExploreEventInput): Promise<void> {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`wpg_report_${ctx.userId}`).setLabel('Tố cáo lên Merchants Guild').setEmoji('📣').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`wpg_rob_${ctx.userId}`).setLabel('Cướp hàng của hắn').setEmoji('⚔️').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`wpg_buy_${ctx.userId}`).setLabel('Mua với giá đắt (80g)').setEmoji('💰').setStyle(ButtonStyle.Secondary),
  );
  const embed = new EmbedBuilder()
    .setColor(COLORS.warning)
    .setTitle('💸 Thương Nhân Chặt Chém')
    .setDescription(
      'Một tên thương nhân đang rao bán **Health Potion** với giá **80 Gold** — gần gấp đôi giá bình thường.\n' +
      '*"Cung có hạn, cầu tăng cao — đó là quy luật thị trường!"* hắn cười nhếch mép.\n\n' +
      'Xung quanh có vài người mua đang lắc đầu bỏ đi.'
    );
  const cid = await awaitBtn(ctx, embed, row);

  if (cid === `wpg_report_${ctx.userId}`) {
    const markupBefore = getFlag(ctx.guildId, 'shop_markup');
    increaseShopMarkup(ctx.guildId, -8);
    return finish(ctx, simpleEmbed(COLORS.success,
      `📣 Merchants Guild ghi nhận và triệu hồi tên hắn về để điều tra.\n` +
      `📉 Shop markup giảm **8%** — giá chung ổn định hơn một chút.\n` +
      `${factionLine(ctx, 'merchants', 8)}\n${factionLine(ctx, 'villagers', 4)}`
    ));
  }

  if (cid === `wpg_rob_${ctx.userId}`) {
    const gold = randInt(18, 37);
    grantGold(ctx.userId, ctx.guildId, gold);
    adjustWanted(ctx.userId, ctx.guildId, 1);
    return finish(ctx, simpleEmbed(COLORS.danger,
      `⚔️ Bạn khống chế hắn và lấy đi một phần hàng hóa. Hắn gào toáng lên đằng sau.\n` +
      `🪙 +**${gold} Gold**\n📜 Wanted **+1**\n${factionLine(ctx, 'shadow_court', 8)}\n${factionLine(ctx, 'merchants', -15)}`
    ));
  }

  if (cid === `wpg_buy_${ctx.userId}`) {
    const fresh = getEffectivePlayer(ctx.userId, ctx.guildId)!;
    if (fresh.gold < 80) {
      return finish(ctx, simpleEmbed(COLORS.warning, '❌ Không đủ **80 Gold** để mua.'));
    }
    spendGold(ctx.userId, ctx.guildId, 80);
    addItem(ctx.userId, ctx.guildId, 'health_potion', 1);
    return finish(ctx, simpleEmbed(COLORS.info,
      `💰 Bạn trả 80 Gold và nhận lọ thuốc. Đắt nhưng hữu dụng.\n🧪 +**1× Health Potion** (-80g)`
    ));
  }

  return finish(ctx, simpleEmbed(COLORS.info, '🚶 Bạn không mua gì và bỏ đi. Tên thương nhân nhếch mép nhìn theo.'));
}

export async function showWorldTaxCollector(ctx: RunExploreEventInput): Promise<void> {
  const hasBribe = getItemQty(ctx.userId, ctx.guildId, 'bribe_coin') > 0;
  const buttons = [
    new ButtonBuilder().setCustomId(`wtc_pay_${ctx.userId}`).setLabel('Nộp thuế (50g)').setEmoji('🪙').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`wtc_evade_${ctx.userId}`).setLabel('Lách qua mà không nộp').setEmoji('🏃').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`wtc_help_${ctx.userId}`).setLabel('Giúp thu thuế').setEmoji('📋').setStyle(ButtonStyle.Success),
  ];
  if (hasBribe) {
    buttons.splice(1, 0,
      new ButtonBuilder().setCustomId(`wtc_bribe_${ctx.userId}`).setLabel('Hối lộ (Bribe Coin)').setEmoji('😏').setStyle(ButtonStyle.Danger)
    );
  }
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(buttons.slice(0, 4));
  const embed = new EmbedBuilder()
    .setColor(COLORS.warning)
    .setTitle('📋 Quan Thu Thuế Trên Đường')
    .setDescription(
      'Một viên quan thu thuế chặn bạn lại, phù hiệu hoàng gia trên ngực.\n' +
      '*"Mỗi người đi qua con đường này phải nộp **50 Gold** thuế đường."*\n\n' +
      (hasBribe ? '*(Bạn có **Bribe Coin** trong túi...)*' : '')
    );
  const cid = await awaitBtn(ctx, embed, row);

  if (cid === `wtc_pay_${ctx.userId}`) {
    const fresh = getEffectivePlayer(ctx.userId, ctx.guildId)!;
    if (fresh.gold < 50) {
      return finish(ctx, simpleEmbed(COLORS.warning, '❌ Không đủ **50 Gold** để nộp thuế.'));
    }
    spendGold(ctx.userId, ctx.guildId, 50);
    return finish(ctx, simpleEmbed(COLORS.info,
      `🪙 Bạn nộp đủ 50 Gold. Viên quan cúi đầu và để bạn đi.\n-**50 Gold**\n${factionLine(ctx, 'villagers', 2)}`
    ));
  }

  if (cid === `wtc_bribe_${ctx.userId}`) {
    removeItem(ctx.userId, ctx.guildId, 'bribe_coin', 1);
    return finish(ctx, simpleEmbed(COLORS.success,
      `😏 Bạn nhét đồng xu vào tay viên quan. Hắn liếc quanh rồi bước tránh sang một bên.\n🪙 **-1× Bribe Coin** (tiết kiệm 50g)`
    ));
  }

  if (cid === `wtc_evade_${ctx.userId}`) {
    const roll = randInt(1, 100);
    if (roll <= 45) {
      adjustWanted(ctx.userId, ctx.guildId, 1);
      return finish(ctx, simpleEmbed(COLORS.danger,
        `🏃 Bạn cố lách qua nhưng bị viên quan hét gọi lính. Cái tên bạn bị ghi vào danh sách truy nã!\n📜 Wanted **+1**`
      ));
    }
    return finish(ctx, simpleEmbed(COLORS.success,
      `🏃 Bạn trà trộn vào dòng người và lách qua được. Viên quan không kịp nhìn rõ mặt.`
    ));
  }

  if (cid === `wtc_help_${ctx.userId}`) {
    const gold = randInt(12, 27);
    grantGold(ctx.userId, ctx.guildId, gold);
    return finish(ctx, simpleEmbed(COLORS.success,
      `📋 Bạn giúp viên quan thu thuế cả ngày — làm chứng nhân và ghi chép. Hắn cảm ơn bằng tiền hoa hồng.\n` +
      `🪙 +**${gold} Gold**\n${factionLine(ctx, 'villagers', 6)}`
    ));
  }

  return finish(ctx, simpleEmbed(COLORS.info, '❓ Bạn đứng ngẩn ra và viên quan cũng bỏ đi với người khác.'));
}

export async function showWorldSupplyShortage(ctx: RunExploreEventInput): Promise<void> {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`wss_donate_${ctx.userId}`).setLabel('Quyên góp thuốc + thức ăn').setEmoji('🎁').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`wss_profit_${ctx.userId}`).setLabel('Bán hàng giá cao').setEmoji('💰').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`wss_pass_${ctx.userId}`).setLabel('Không liên quan').setStyle(ButtonStyle.Secondary),
  );
  const embed = new EmbedBuilder()
    .setColor(COLORS.warning)
    .setTitle('🏚️ Thiếu Hụt Nguồn Cung')
    .setDescription(
      'Dân làng tụ tập trước cổng kho lương thực trống rỗng. Trẻ em gầy guộc, người già mệt mỏi.\n' +
      '*"Con đường thương mại bị cắt đứt suốt 2 tuần — chúng tôi gần hết thức ăn và thuốc."*\n\n' +
      'Bạn có **bread, forest_fruit, honey** trong túi có thể quyên góp.'
    );
  const cid = await awaitBtn(ctx, embed, row);

  if (cid === `wss_donate_${ctx.userId}`) {
    const items = ['bread', 'forest_fruit', 'honey', 'health_potion', 'minor_healing_potion'];
    let donated = 0;
    for (const it of items) {
      const qty = getItemQty(ctx.userId, ctx.guildId, it);
      if (qty > 0) {
        const give = Math.min(qty, 2);
        removeItem(ctx.userId, ctx.guildId, it, give);
        donated += give;
      }
    }
    if (donated === 0) {
      return finish(ctx, simpleEmbed(COLORS.warning, '❌ Bạn không có đủ vật phẩm nào để quyên góp.'));
    }
    const exp = 15 * donated;
    grantExp(ctx.userId, ctx.guildId, exp);
    increaseMerchantFear(ctx.guildId, -6);
    setWorldEvent(ctx.guildId, 'supply_relief', 'Làng nhận được hàng cứu trợ', 21600);
    return finish(ctx, simpleEmbed(COLORS.success,
      `🎁 Bạn trao **${donated}** vật phẩm cho dân làng. Ánh mắt biết ơn nhìn theo lưng bạn.\n` +
      `⭐ +**${exp} EXP**\n${repLine(ctx, 6)}\n${factionLine(ctx, 'villagers', 14)}\n😨 Merchant Fear **-6**`
    ));
  }

  if (cid === `wss_profit_${ctx.userId}`) {
    const hasTradeable = ['bread', 'health_potion', 'honey'].some(
      it => getItemQty(ctx.userId, ctx.guildId, it) > 0
    );
    if (!hasTradeable) {
      return finish(ctx, simpleEmbed(COLORS.warning, '❌ Không có gì để bán.'));
    }
    const gold = randInt(31, 62);
    grantGold(ctx.userId, ctx.guildId, gold);
    removeItem(ctx.userId, ctx.guildId, 'health_potion', 1);
    return finish(ctx, simpleEmbed(COLORS.warning,
      `💰 Bạn bán với giá gấp đôi. Dân làng miễn cưỡng trả tiền.\n🪙 +**${gold} Gold**\n` +
      `${factionLine(ctx, 'merchants', 5)}\n${factionLine(ctx, 'villagers', -12)}`
    ));
  }

  return finish(ctx, simpleEmbed(COLORS.info, '🚶 Bạn đi qua mà không nói gì. Tiếng trẻ con khóc vang vọng đằng sau.'));
}

export async function showWorldMerchantGuildJob(ctx: RunExploreEventInput): Promise<void> {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`wmgj_accept_${ctx.userId}`).setLabel('Nhận hợp đồng hộ tống').setEmoji('🛡️').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`wmgj_info_${ctx.userId}`).setLabel('Chỉ lấy thông tin lộ trình').setEmoji('📜').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`wmgj_decline_${ctx.userId}`).setLabel('Không quan tâm').setStyle(ButtonStyle.Secondary),
  );
  const embed = new EmbedBuilder()
    .setColor(COLORS.success)
    .setTitle('🏪 Thông Báo Merchants Guild')
    .setDescription(
      '**[TUYỂN DỤNG — KHẨN]**\n' +
      'Merchants Guild cần người hộ tống đoàn hàng từ làng trung tâm đến bến cảng phía đông.\n' +
      'Thù lao: **80–150 Gold**. Yêu cầu: Không có tiền án với Guild.\n\n' +
      '*Đại diện Guild đang chờ tại quán trọ gần đây.*'
    );
  const cid = await awaitBtn(ctx, embed, row);

  if (cid === `wmgj_accept_${ctx.userId}`) {
    const gold = randInt(49, 93);
    grantGold(ctx.userId, ctx.guildId, gold);
    const exp = randInt(28, 57);
    grantExp(ctx.userId, ctx.guildId, exp);
    logEvent(ctx.guildId, ctx.userId, ctx.player.name ?? 'Unknown', 'world_news', 'Đoàn hàng Merchants Guild được hộ tống thành công.', ctx.player.zone_id ?? null);
    return finish(ctx, simpleEmbed(COLORS.success,
      `🛡️ Chuyến đi diễn ra suôn sẻ. Guild trả thù lao đầy đủ và thêm một ít tiền thưởng.\n` +
      `🪙 +**${gold} Gold**\n⭐ +**${exp} EXP**\n${factionLine(ctx, 'merchants', 12)}`
    ));
  }

  if (cid === `wmgj_info_${ctx.userId}`) {
    addItem(ctx.userId, ctx.guildId, 'scroll_detection', 1);
    return finish(ctx, simpleEmbed(COLORS.info,
      `📜 Đại diện Guild chia sẻ bản đồ lộ trình và các điểm nguy hiểm. Hữu ích cho explore.\n` +
      `🔎 +**1× Scroll of Detection**\n${factionLine(ctx, 'merchants', 3)}`
    ));
  }

  return finish(ctx, simpleEmbed(COLORS.info, '🚶 Bạn đi qua bảng thông báo mà không dừng lại.'));
}

// ══════════════════════════════════════════════════════════════════════
//  STORY / LORE EVENTS
// ══════════════════════════════════════════════════════════════════════

export async function showWorldAncientInscription(ctx: RunExploreEventInput): Promise<void> {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`wai_decipher_${ctx.userId}`).setLabel('Giải mã chữ khắc').setEmoji('📖').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`wai_rubbing_${ctx.userId}`).setLabel('Rập lại lên giấy').setEmoji('📄').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`wai_ignore_${ctx.userId}`).setLabel('Không quan tâm').setStyle(ButtonStyle.Secondary),
  );
  const embed = new EmbedBuilder()
    .setColor(0x8e44ad)
    .setTitle('📜 Chữ Khắc Cổ Đại')
    .setDescription(
      'Một tảng đá lớn bên vệ đường phủ đầy rêu xanh. Phủi rêu ra, bạn thấy **những ký tự cổ đại** khắc sâu vào đá.\n' +
      'Chữ viết này thuộc ngôn ngữ của **Nền Văn Minh Tiền Đại** — trước khi thế giới này có vương quốc đầu tiên.\n\n' +
      '*Ít người còn đọc được loại chữ này.*'
    );
  const cid = await awaitBtn(ctx, embed, row);

  if (cid === `wai_decipher_${ctx.userId}`) {
    const exp = randInt(28, 57);
    grantExp(ctx.userId, ctx.guildId, exp);
    setFlag(ctx.guildId, `lore_ancient_inscription_${ctx.player.zone_id ?? 'unknown'}`, '1');
      return finish(ctx, simpleEmbed(0x8e44ad,
      `📖 Bạn mất hơn nửa tiếng để dịch... *"Kẻ nào phá vỡ Hồi Ức Thứ Bảy sẽ mang theo cái giá của sự quên lãng..."*\n` +
      `⭐ +**${exp} EXP**\n📚 Lore flag ghi nhận: **Ancient Inscription**\n` +
      `*(Manh mối mới được thêm vào nhật ký hành trình...)*`
    ));
  }

  if (cid === `wai_rubbing_${ctx.userId}`) {
    addItem(ctx.userId, ctx.guildId, 'ancient_rune', 1);
    const exp = randInt(10, 21);
    grantExp(ctx.userId, ctx.guildId, exp);
    return finish(ctx, simpleEmbed(COLORS.info,
      `📄 Bạn rập lại hoa văn lên tờ giấy. Có thể mang đến cho học giả nào đó sau.\n⭐ +**${exp} EXP**\n📜 +**1× Ancient Rune**`
    ));
  }

  return finish(ctx, simpleEmbed(COLORS.info, '🪨 Chỉ là đá khắc cũ kỹ. Bạn tiếp tục đường mình.'));
}

export async function showWorldSpyLetter(ctx: RunExploreEventInput): Promise<void> {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`wsl_church_${ctx.userId}`).setLabel('Giao cho Old Church').setEmoji('⛪').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`wsl_shadow_${ctx.userId}`).setLabel('Giao cho Shadow Court').setEmoji('🌑').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`wsl_hunters_${ctx.userId}`).setLabel('Giao cho Hunters Guild').setEmoji('🏹').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`wsl_burn_${ctx.userId}`).setLabel('Đốt thư').setEmoji('🔥').setStyle(ButtonStyle.Secondary),
  );
  const embed = new EmbedBuilder()
    .setColor(0x2c3e50)
    .setTitle('📨 Bức Thư Mật Bị Đánh Rơi')
    .setDescription(
      'Bạn tìm thấy một phong bì có dấu sáp kín dưới bụi cỏ. Mở ra, bên trong là **mật thư mã hóa** — ' +
      'nhưng một đoạn bị ướt và mực loang ra, để lộ: *"...kế hoạch tấn công đêm rằm... chờ lệnh..."*\n\n' +
      'Đây là thông tin tình báo quan trọng — nhưng trao cho ai?'
    );
  const cid = await awaitBtn(ctx, embed, row);

  if (cid === `wsl_church_${ctx.userId}`) {
    const exp = randInt(21, 43);
    grantExp(ctx.userId, ctx.guildId, exp);
    adjustWorldDanger(ctx.guildId, -6);
    logEvent(ctx.guildId, ctx.userId, ctx.player.name ?? 'Unknown', 'world_news', 'Âm mưu bị vạch trần bởi Old Church.', ctx.player.zone_id ?? null);
    return finish(ctx, simpleEmbed(COLORS.success,
      `⛪ Old Church giải mã thư, vô hiệu hóa kế hoạch tấn công kịp thời.\n` +
      `⭐ +**${exp} EXP**\n⚠️ World Danger **-6**\n` +
      `${factionLine(ctx, 'old_church', 15)}\n${factionLine(ctx, 'shadow_court', -8)}`
    ));
  }

  if (cid === `wsl_shadow_${ctx.userId}`) {
    const gold = randInt(43, 80);
    grantGold(ctx.userId, ctx.guildId, gold);
    adjustWorldDanger(ctx.guildId, 4);
    return finish(ctx, simpleEmbed(COLORS.warning,
      `🌑 Shadow Court trả tiền rất hào phóng cho tin tình báo kiểu này.\n` +
      `🪙 +**${gold} Gold**\n⚠️ World Danger **+4**\n` +
      `${factionLine(ctx, 'shadow_court', 16)}\n${factionLine(ctx, 'old_church', -10)}`
    ));
  }

  if (cid === `wsl_hunters_${ctx.userId}`) {
    const exp = randInt(14, 32);
    grantExp(ctx.userId, ctx.guildId, exp);
    addItem(ctx.userId, ctx.guildId, 'scroll_detection', 1);
    return finish(ctx, simpleEmbed(COLORS.info,
      `🏹 Hunters Guild ghi nhận thông tin. Họ tặng bạn một Scroll Detection để tri ân.\n` +
      `⭐ +**${exp} EXP**\n🔎 +**1× Scroll of Detection**\n${factionLine(ctx, 'hunters', 10)}`
    ));
  }

  const exp = randInt(7, 14);
  grantExp(ctx.userId, ctx.guildId, exp);
  return finish(ctx, simpleEmbed(COLORS.info,
    `🔥 Bạn đốt thư. Dù sao cũng không muốn dính vào chuyện chính trị.\n⭐ +**${exp} EXP**`
  ));
}

export async function showWorldMissingPersons(ctx: RunExploreEventInput): Promise<void> {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`wmp_investigate_${ctx.userId}`).setLabel('Điều tra khu vực').setEmoji('🔍').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`wmp_hunters_${ctx.userId}`).setLabel('Báo Hunters Guild').setEmoji('🏹').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`wmp_ignore_${ctx.userId}`).setLabel('Không liên quan đến mình').setStyle(ButtonStyle.Secondary),
  );
  const embed = new EmbedBuilder()
    .setColor(COLORS.warning)
    .setTitle('🪧 Tờ Thông Báo Mất Tích')
    .setDescription(
      'Dán trên thân cây: **"TÌM NGƯỜI MẤT TÍCH"** — bức ảnh phác họa một cô bé và hai người đàn ông.\n' +
      'Phần dưới ghi: *"Mất tích gần khu rừng phía bắc, đã 6 ngày. Gia đình cầu xin mọi người giúp đỡ."*\n\n' +
      'Bạn nhớ ra mình đã thấy dấu chân lạ trong vùng này...'
    );
  const cid = await awaitBtn(ctx, embed, row);

  if (cid === `wmp_investigate_${ctx.userId}`) {
    const roll = randInt(1, 100);
    const exp = randInt(21, 43);
    grantExp(ctx.userId, ctx.guildId, exp);
    setFlag(ctx.guildId, 'missing_persons_investigated', '1', 86400);
      if (roll <= 35) {
      addItem(ctx.userId, ctx.guildId, 'mysterious_shard', 1);
      return finish(ctx, simpleEmbed(COLORS.warning,
        `🔍 Bạn tìm thấy dấu hiệu cuộc đấu tranh và... một mảnh áo rách. Người mất tích có thể đã bị dẫn đi.\n` +
        `⭐ +**${exp} EXP**\n💎 +**1× Mysterious Shard** (manh mối)\n${factionLine(ctx, 'hunters', 5)}\n` +
        `*(World flag ghi nhận: tìm kiếm đang tiến hành...)*`
      ));
    }
    return finish(ctx, simpleEmbed(COLORS.info,
      `🔍 Bạn tìm kiếm cả tiếng nhưng không ra manh mối mới. Ít ra bạn đã cố gắng.\n` +
      `⭐ +**${exp} EXP**\n${factionLine(ctx, 'villagers', 4)}`
    ));
  }

  if (cid === `wmp_hunters_${ctx.userId}`) {
    const exp = randInt(10, 21);
    grantExp(ctx.userId, ctx.guildId, exp);
    return finish(ctx, simpleEmbed(COLORS.success,
      `🏹 Bạn sao chép thông tin và gửi đến Hunters Guild. Họ sẽ điều tra chính thức.\n` +
      `⭐ +**${exp} EXP**\n${factionLine(ctx, 'hunters', 7)}\n${factionLine(ctx, 'villagers', 5)}`
    ));
  }

  return finish(ctx, simpleEmbed(COLORS.info, '🪧 Bạn đọc qua rồi tiếp tục đi. Hy vọng ai đó sẽ giúp họ.'));
}

export async function showWorldOldChronicle(ctx: RunExploreEventInput): Promise<void> {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`woc_read_${ctx.userId}`).setLabel('Đọc kỹ lưỡng').setEmoji('📖').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`woc_sell_${ctx.userId}`).setLabel('Bán cho thương nhân').setEmoji('🪙').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`woc_church_${ctx.userId}`).setLabel('Hiến cho Old Church').setEmoji('⛪').setStyle(ButtonStyle.Success),
  );
  const embed = new EmbedBuilder()
    .setColor(0xd4a047)
    .setTitle('📚 Biên Niên Sử Cổ')
    .setDescription(
      'Dưới đáy một rương bỏ quên, bạn tìm thấy một cuốn sách dày, bìa da đã nứt vỡ.\n' +
      'Tiêu đề: ***"Biên Niên Sử Đất Phía Đông — Quyển III"*** — ghi chép lịch sử vùng này trước khi chiến tranh lớn.\n\n' +
      'Chữ viết vẫn còn rõ, mực đỏ đánh dấu những đoạn quan trọng.'
    );
  const cid = await awaitBtn(ctx, embed, row);

  if (cid === `woc_read_${ctx.userId}`) {
    const exp = randInt(36, 64);
    grantExp(ctx.userId, ctx.guildId, exp);
    setFlag(ctx.guildId, 'lore_chronicles_read', '1');
      return finish(ctx, simpleEmbed(0xd4a047,
      `📖 Bạn ngồi đọc hết quyển sách. Lịch sử vùng này phức tạp hơn bạn tưởng — có đề cập đến **Thành Phố Bị Nguyền** và **Hội Đồng Bảy Ngọn Nến**.\n` +
      `⭐ +**${exp} EXP**\n📚 Lore được mở khóa\n*(Manh mối mới xuất hiện trong nhật ký...)*`
    ));
  }

  if (cid === `woc_sell_${ctx.userId}`) {
    const gold = randInt(21, 40);
    grantGold(ctx.userId, ctx.guildId, gold);
    return finish(ctx, simpleEmbed(COLORS.info,
      `🪙 Một thương nhân mua sách cũ trả **${gold} Gold** không hỏi thêm.\n🪙 +**${gold} Gold**`
    ));
  }

  if (cid === `woc_church_${ctx.userId}`) {
    const exp = randInt(21, 39);
    grantExp(ctx.userId, ctx.guildId, exp);
    return finish(ctx, simpleEmbed(COLORS.success,
      `⛪ Tu sĩ Old Church nhận cuốn sách với ánh mắt hài lòng. *"Chúng ta đã tìm kiếm quyển này từ lâu."*\n` +
      `⭐ +**${exp} EXP**\n${factionLine(ctx, 'old_church', 12)}`
    ));
  }

  return finish(ctx, simpleEmbed(COLORS.info, '📚 Bạn để cuốn sách lại. Nó quá nặng để mang theo.'));
}

export async function showWorldPropheticVision(ctx: RunExploreEventInput): Promise<void> {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`wpv_remember_${ctx.userId}`).setLabel('Cố ghi nhớ giấc mộng').setEmoji('💭').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`wpv_shake_${ctx.userId}`).setLabel('Lắc đầu bỏ qua').setStyle(ButtonStyle.Secondary),
  );
  const visions = [
    'một thành phố chìm dưới biển sóng lửa, và tiếng nói: *"Ba hồi chuông..."*',
    'một người phụ nữ cầm kiếm đứng một mình trước đoàn quân — khuôn mặt quen thuộc nhưng không nhớ được',
    'một cánh đồng trắng xóa và một cây đen duy nhất — từ cây đó rơi xuống không phải lá, mà là ký ức',
    'bảy ngọn nến xếp thành vòng tròn, từng cái tắt dần — cái cuối cùng tắt, bóng tối hoàn toàn',
  ];
  const vision = pick(visions);
  const embed = new EmbedBuilder()
    .setColor(0x6c3483)
    .setTitle('💭 Giấc Mộng Trong Chớp Mắt')
    .setDescription(
      'Bạn chợp mắt nghỉ ngơi bên gốc cây — chỉ vài phút, nhưng đủ để thấy rõ:\n\n' +
      `*Bạn thấy ${vision}*\n\n` +
      'Tỉnh dậy, tim vẫn còn đập mạnh.'
    );
  const cid = await awaitBtn(ctx, embed, row);

  if (cid === `wpv_remember_${ctx.userId}`) {
    const exp = randInt(14, 28);
    grantExp(ctx.userId, ctx.guildId, exp);
    setFlag(ctx.guildId, `lore_vision_${ctx.userId}`, vision.slice(0, 50), 604800);
      return finish(ctx, simpleEmbed(0x6c3483,
      `💭 Bạn viết lại giấc mộng trong nhật ký. Một ngày nào đó có thể sẽ có ý nghĩa...\n` +
      `⭐ +**${exp} EXP**\n*(Lore flag được ghi nhận)*`
    ));
  }

  return finish(ctx, simpleEmbed(COLORS.info,
    '😴 Chỉ là một giấc mơ kỳ lạ. Bạn đứng dậy và tiếp tục.'
  ));
}

export async function showWorldSecretMeeting(ctx: RunExploreEventInput): Promise<void> {
  const factions = [
    { name: 'Old Church và Shadow Court', f1: 'old_church' as const, f2: 'shadow_court' as const },
    { name: 'Merchants Guild và Hunters Guild', f1: 'merchants' as const, f2: 'hunters' as const },
    { name: 'Shadow Court và một nhóm không rõ danh tính', f1: 'shadow_court' as const, f2: 'villagers' as const },
  ];
  const mtg = pick(factions);
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`wsm_observe_${ctx.userId}`).setLabel('Quan sát từ bụi cây').setEmoji('👁️').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`wsm_interrupt_${ctx.userId}`).setLabel('Xông vào gây náo loạn').setEmoji('💥').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`wsm_flee_${ctx.userId}`).setLabel('Rút lui yên lặng').setStyle(ButtonStyle.Secondary),
  );
  const embed = new EmbedBuilder()
    .setColor(0x1a1a2e)
    .setTitle('🤫 Cuộc Gặp Mặt Bí Mật')
    .setDescription(
      `Đằng sau một ngôi nhà bỏ hoang, bạn tình cờ nghe thấy tiếng thì thầm.\n` +
      `Nhìn qua khe hở: **${mtg.name}** đang bàn bạc điều gì đó với vẻ mặt căng thẳng.\n\n` +
      `*Bạn không nghe rõ nội dung, nhưng đây rõ ràng là cuộc gặp không muốn ai biết.*`
    );
  const cid = await awaitBtn(ctx, embed, row);

  if (cid === `wsm_observe_${ctx.userId}`) {
    const exp = randInt(21, 43);
    grantExp(ctx.userId, ctx.guildId, exp);
    setFlag(ctx.guildId, `lore_secret_meeting_${mtg.f1}`, '1', 172800);
      return finish(ctx, simpleEmbed(0x1a1a2e,
      `👁️ Bạn lắng nghe cẩn thận. Tuy không nghe hết, nhưng bạn bắt kịp vài từ khóa quan trọng...\n` +
      `⭐ +**${exp} EXP**\n📚 Lore flag ghi nhận: **Cuộc gặp bí mật**\n*(Manh mối mới về âm mưu phe phái...)*`
    ));
  }

  if (cid === `wsm_interrupt_${ctx.userId}`) {
    adjustWorldDanger(ctx.guildId, 5);
    adjustWanted(ctx.userId, ctx.guildId, 1);
    const fresh = getEffectivePlayer(ctx.userId, ctx.guildId)!;
    const dmg = Math.floor(fresh.max_hp * 0.20);
    updatePlayerHpMp(ctx.userId, ctx.guildId, Math.max(1, fresh.hp - dmg), fresh.mp);
    return finish(ctx, simpleEmbed(COLORS.danger,
      `💥 Bạn xông vào gây náo loạn! Cả hai phía tấn công bạn để bịt miệng nhân chứng.\n` +
      `💔 **-20% HP**\n📜 Wanted **+1**\n⚠️ World Danger **+5**`
    ));
  }

  return finish(ctx, simpleEmbed(COLORS.info,
    '🤫 Bạn rút lui nhẹ nhàng trước khi bị phát hiện. Đôi khi không biết là điều tốt hơn.'
  ));
}

// ══════════════════════════════════════════════════════════════════════
//  FACTION EVENTS
// ══════════════════════════════════════════════════════════════════════

export async function showWorldFactionStandoff(ctx: RunExploreEventInput): Promise<void> {
  const scenarios = [
    {
      title: '⚔️ Đối Đầu Merchants vs Shadow Court',
      desc: 'Một đại lý Merchants Guild và một điệp viên Shadow Court đang chỉ mặt nhau giữa đường, ' +
        'tranh cãi về một lô hàng "biến mất". Căng thẳng leo thang.',
      f1: 'merchants' as const, f1name: 'Merchants Guild',
      f2: 'shadow_court' as const, f2name: 'Shadow Court',
    },
    {
      title: '🏹 Đối Đầu Hunters vs Old Church',
      desc: 'Một thợ săn Hunters Guild và một tu sĩ Old Church tranh cãi dữ dội về việc ai có quyền xử lý ' +
        'một "sinh vật nguyền rủa" bị bắt gần đây.',
      f1: 'hunters' as const, f1name: 'Hunters Guild',
      f2: 'old_church' as const, f2name: 'Old Church',
    },
  ];
  const s = pick(scenarios);
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`wfs_side1_${ctx.userId}`).setLabel(`Đứng về ${s.f1name}`).setEmoji('👈').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`wfs_side2_${ctx.userId}`).setLabel(`Đứng về ${s.f2name}`).setEmoji('👉').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`wfs_mediate_${ctx.userId}`).setLabel('Hòa giải cả hai').setEmoji('🤝').setStyle(ButtonStyle.Success),
  );
  const embed = new EmbedBuilder()
    .setColor(COLORS.warning)
    .setTitle(s.title)
    .setDescription(s.desc + '\n\n*Cả hai nhìn sang bạn — có vẻ muốn nhân chứng.*');
  const cid = await awaitBtn(ctx, embed, row);

  if (cid === `wfs_side1_${ctx.userId}`) {
    const exp = randInt(18, 36);
    grantExp(ctx.userId, ctx.guildId, exp);
    return finish(ctx, simpleEmbed(COLORS.info,
      `👈 Bạn lên tiếng ủng hộ ${s.f1name}. Họ cảm ơn, phía kia bỏ đi hậm hực.\n` +
      `⭐ +**${exp} EXP**\n${factionLine(ctx, s.f1, 18)}\n${factionLine(ctx, s.f2, -12)}`
    ));
  }

  if (cid === `wfs_side2_${ctx.userId}`) {
    const exp = randInt(18, 36);
    grantExp(ctx.userId, ctx.guildId, exp);
    return finish(ctx, simpleEmbed(COLORS.info,
      `👉 Bạn lên tiếng ủng hộ ${s.f2name}. Họ gật đầu hài lòng, phía kia ném cái nhìn lạnh lẽo.\n` +
      `⭐ +**${exp} EXP**\n${factionLine(ctx, s.f2, 18)}\n${factionLine(ctx, s.f1, -12)}`
    ));
  }

  const exp = randInt(14, 28);
  grantExp(ctx.userId, ctx.guildId, exp);
  return finish(ctx, simpleEmbed(COLORS.success,
    `🤝 Bạn đứng ra trung gian, thuyết phục cả hai bên hạ vũ khí và nói chuyện bình tĩnh.\n` +
    `⭐ +**${exp} EXP**\n${repLine(ctx, 5)}\n${factionLine(ctx, s.f1, 6)}\n${factionLine(ctx, s.f2, 6)}`
  ));
}

export async function showWorldChurchInquisition(ctx: RunExploreEventInput): Promise<void> {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`wci_cooperate_${ctx.userId}`).setLabel('Hợp tác đầy đủ').setEmoji('⛪').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`wci_deflect_${ctx.userId}`).setLabel('Trả lời mơ hồ, tránh né').setEmoji('🤔').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`wci_resist_${ctx.userId}`).setLabel('Từ chối trả lời').setEmoji('🚫').setStyle(ButtonStyle.Danger),
  );
  const embed = new EmbedBuilder()
    .setColor(0xf0e6c8)
    .setTitle('⛪ Thẩm Vấn Dị Giáo')
    .setDescription(
      'Một thẩm phán mặc áo choàng trắng của Old Church chặn đường bạn.\n' +
      '*"Chúng ta nghe nói người này thường xuyên đi qua các khu vực bị nguyền rủa. Xin cho biết: ' +
      'ngươi có liên hệ với Shadow Court hay không?"*\n\n' +
      'Giọng ông ta nhẹ nhàng nhưng ánh mắt sắc bén như dao.'
    );
  const cid = await awaitBtn(ctx, embed, row);

  if (cid === `wci_cooperate_${ctx.userId}`) {
    const exp = randInt(14, 28);
    grantExp(ctx.userId, ctx.guildId, exp);
    return finish(ctx, simpleEmbed(COLORS.success,
      `⛪ Bạn trả lời thành thật và hợp tác hoàn toàn. Vị thẩm phán gật đầu hài lòng.\n` +
      `⭐ +**${exp} EXP**\n${factionLine(ctx, 'old_church', 15)}\n${factionLine(ctx, 'shadow_court', -8)}`
    ));
  }

  if (cid === `wci_deflect_${ctx.userId}`) {
    const roll = randInt(1, 100);
    if (roll <= 40) {
      return finish(ctx, simpleEmbed(COLORS.warning,
        `🤔 Bạn trả lời vòng vo. Vị thẩm phán không hài lòng nhưng không có bằng chứng gì.\n` +
        `${factionLine(ctx, 'old_church', -3)}`
      ));
    }
    return finish(ctx, simpleEmbed(COLORS.info,
      `🤔 Bạn trả lời khéo léo. Ông ta dường như tin và cho bạn đi.`
    ));
  }

  adjustWanted(ctx.userId, ctx.guildId, 1);
  return finish(ctx, simpleEmbed(COLORS.danger,
    `🚫 Bạn từ chối trả lời. Vị thẩm phán ghi tên bạn vào danh sách điều tra.\n` +
    `📜 Wanted **+1**\n${factionLine(ctx, 'old_church', -12)}\n${factionLine(ctx, 'shadow_court', 6)}`
  ));
}

export async function showWorldShadowOffer(ctx: RunExploreEventInput): Promise<void> {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`wso_accept_${ctx.userId}`).setLabel('Nhận nhiệm vụ').setEmoji('🌑').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`wso_refuse_${ctx.userId}`).setLabel('Từ chối lịch sự').setEmoji('🤐').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`wso_report_${ctx.userId}`).setLabel('Tố cáo với Old Church').setEmoji('⛪').setStyle(ButtonStyle.Primary),
  );
  const embed = new EmbedBuilder()
    .setColor(0x0d0d0d)
    .setTitle('🌑 Đề Nghị Từ Shadow Court')
    .setDescription(
      'Một người đàn ông mặc đen tiếp cận bạn khi trời sẫm tối, nói nhỏ vừa đủ nghe:\n' +
      '*"Shadow Court cần người không hỏi nhiều và có thể đến nơi người khác không dám đến. ' +
      'Thù lao rất hấp dẫn — và chúng tôi không quên ân nhân."*\n\n' +
      'Hắn đưa ra một phong bì dày.'
    );
  const cid = await awaitBtn(ctx, embed, row);

  if (cid === `wso_accept_${ctx.userId}`) {
    const gold = randInt(62, 124);
    grantGold(ctx.userId, ctx.guildId, gold);
    adjustWorldDanger(ctx.guildId, 4);
    return finish(ctx, simpleEmbed(COLORS.warning,
      `🌑 Bạn nhận nhiệm vụ. Tiền trong phong bì nhiều hơn bạn tưởng.\n` +
      `🪙 +**${gold} Gold**\n⚠️ World Danger **+4**\n` +
      `${factionLine(ctx, 'shadow_court', 22)}\n${factionLine(ctx, 'old_church', -15)}`
    ));
  }

  if (cid === `wso_refuse_${ctx.userId}`) {
    return finish(ctx, simpleEmbed(COLORS.info,
      `🤐 Bạn từ chối khéo léo. Người đàn ông gật đầu và biến mất vào bóng tối.\n${factionLine(ctx, 'shadow_court', -4)}`
    ));
  }

  const exp = randInt(14, 32);
  grantExp(ctx.userId, ctx.guildId, exp);
  adjustWorldDanger(ctx.guildId, -4);
  return finish(ctx, simpleEmbed(COLORS.success,
    `⛪ Bạn báo cáo cuộc tiếp cận này cho Old Church. Họ bố trí theo dõi và bắt được một tên điệp viên.\n` +
    `⭐ +**${exp} EXP**\n⚠️ World Danger **-4**\n` +
    `${factionLine(ctx, 'old_church', 12)}\n${factionLine(ctx, 'shadow_court', -22)}`
  ));
}

export async function showWorldHuntersMission(ctx: RunExploreEventInput): Promise<void> {
  const missions = [
    { name: 'săn 3 con sói nguyền rủa ở rừng phía đông', zone: 'forest', gold: randInt(80, 140) },
    { name: 'điều tra hang động bị bỏ hoang ở vùng mỏ', zone: 'mines', gold: randInt(90, 160) },
    { name: 'tìm kiếm di tích mất tích ở hoang nguyên', zone: 'wastes', gold: randInt(100, 180) },
  ];
  const mission = pick(missions);
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`whm_accept_${ctx.userId}`).setLabel('Nhận nhiệm vụ').setEmoji('🏹').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`whm_negotiate_${ctx.userId}`).setLabel('Mặc cả thêm tiền').setEmoji('💰').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`whm_decline_${ctx.userId}`).setLabel('Từ chối').setStyle(ButtonStyle.Secondary),
  );
  const embed = new EmbedBuilder()
    .setColor(0x8b4513)
    .setTitle('🏹 Nhiệm Vụ Hunters Guild')
    .setDescription(
      `Người tuyển dụng của Hunters Guild tìm đến bạn:\n` +
      `*"Chúng tôi cần người ${mission.name}. Thù lao ${mission.gold} Gold nếu thành công."*\n\n` +
      `Cờ hiệu Guild trên ngực hắn còn mới tinh — người này có địa vị cao.`
    );
  const cid = await awaitBtn(ctx, embed, row);

  if (cid === `whm_accept_${ctx.userId}`) {
    grantGold(ctx.userId, ctx.guildId, mission.gold);
    const exp = randInt(36, 64);
    grantExp(ctx.userId, ctx.guildId, exp);
    logEvent(ctx.guildId, ctx.userId, ctx.player.name ?? 'Unknown', 'world_news', `Hunters Guild mission hoàn thành: ${mission.name}.`, mission.zone);
    return finish(ctx, simpleEmbed(0x8b4513,
      `🏹 Nhiệm vụ hoàn thành! Guild rất ấn tượng với tốc độ xử lý của bạn.\n` +
      `🪙 +**${mission.gold} Gold**\n⭐ +**${exp} EXP**\n${factionLine(ctx, 'hunters', 15)}`
    ));
  }

  if (cid === `whm_negotiate_${ctx.userId}`) {
    const roll = randInt(1, 100);
    if (roll <= 55) {
      const bonus = randInt(20, 50);
      const total = mission.gold + bonus;
      grantGold(ctx.userId, ctx.guildId, total);
      const exp = randInt(28, 50);
      grantExp(ctx.userId, ctx.guildId, exp);
      return finish(ctx, simpleEmbed(COLORS.success,
        `💰 Bạn mặc cả giỏi! Được thêm **${bonus} Gold** ngoài thù lao cơ bản.\n` +
        `🪙 +**${total} Gold**\n⭐ +**${exp} EXP**\n${factionLine(ctx, 'hunters', 10)}`
      ));
    }
    return finish(ctx, simpleEmbed(COLORS.warning,
      `💰 Người tuyển dụng lắc đầu — đây là giá cuối cùng. Nhiệm vụ vẫn hoàn thành với giá gốc.\n` +
      `🪙 +**${mission.gold} Gold**\n${factionLine(ctx, 'hunters', 8)}`
    ));
  }

  return finish(ctx, simpleEmbed(COLORS.info,
    `🚶 Bạn từ chối. Người tuyển dụng gật đầu — họ sẽ tìm người khác.`
  ));
}

export async function showWorldVillagerDispute(ctx: RunExploreEventInput): Promise<void> {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`wvd_mediate_${ctx.userId}`).setLabel('Hòa giải công bằng').setEmoji('⚖️').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`wvd_side_${ctx.userId}`).setLabel('Đứng về nhóm mạnh hơn').setEmoji('💪').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`wvd_profit_${ctx.userId}`).setLabel('Kiếm tiền từ cả hai').setEmoji('💰').setStyle(ButtonStyle.Secondary),
  );
  const embed = new EmbedBuilder()
    .setColor(COLORS.warning)
    .setTitle('🏘️ Tranh Chấp Làng Xã')
    .setDescription(
      'Hai nhóm dân làng đang cãi nhau kịch liệt tại ngã tư đường về **quyền sử dụng giếng chung**.\n' +
      'Nhóm A: gia đình nông dân cũ, đã dùng giếng 30 năm.\n' +
      'Nhóm B: thương nhân mới đến, có tiền và luật sư riêng.\n\n' +
      'Họ nhìn bạn — một người ngoài trung lập.'
    );
  const cid = await awaitBtn(ctx, embed, row);

  if (cid === `wvd_mediate_${ctx.userId}`) {
    const exp = randInt(21, 43);
    grantExp(ctx.userId, ctx.guildId, exp);
    setWorldEvent(ctx.guildId, 'village_dispute_resolved', 'Tranh chấp làng được giải quyết công bằng', 43200);
    return finish(ctx, simpleEmbed(COLORS.success,
      `⚖️ Bạn đề xuất giải pháp chia sẻ giếng theo lịch — cả hai bên miễn cưỡng nhưng đồng ý.\n` +
      `⭐ +**${exp} EXP**\n${repLine(ctx, 4)}\n${factionLine(ctx, 'villagers', 12)}\n${factionLine(ctx, 'merchants', 4)}`
    ));
  }

  if (cid === `wvd_side_${ctx.userId}`) {
    const gold = randInt(18, 43);
    grantGold(ctx.userId, ctx.guildId, gold);
    adjustWorldDanger(ctx.guildId, 3);
    return finish(ctx, simpleEmbed(COLORS.warning,
      `💪 Nhóm mạnh hơn thắng và tặng bạn tiền ơn. Nhóm thua bỏ đi tức giận...\n` +
      `🪙 +**${gold} Gold**\n${factionLine(ctx, 'merchants', 10)}\n${factionLine(ctx, 'villagers', -10)}\n⚠️ World Danger **+3** (oán hận tích tụ)`
    ));
  }

  const fresh = getEffectivePlayer(ctx.userId, ctx.guildId)!;
  const fee = 20;
  if (fresh.gold < fee) {
    return finish(ctx, simpleEmbed(COLORS.warning, '❌ Không đủ tiền để "làm trung gian" theo cách này.'));
  }
  spendGold(ctx.userId, ctx.guildId, fee);
  const earned = randInt(40, 90);
  grantGold(ctx.userId, ctx.guildId, earned);
  return finish(ctx, simpleEmbed(COLORS.info,
    `💰 Bạn đứng ra "hòa giải" và tính phí cả hai bên, thu về nhiều hơn mức bỏ ra.\n` +
    `🪙 Net: +**${earned - fee} Gold**\n${factionLine(ctx, 'villagers', -6)}`
  ));
}
