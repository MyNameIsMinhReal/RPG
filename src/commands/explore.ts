import {
  SlashCommandBuilder, ChatInputCommandInteraction,
  EmbedBuilder, ButtonBuilder, ButtonStyle,
  ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder,
  ComponentType, ButtonInteraction, StringSelectMenuInteraction, Message
} from 'discord.js';
import {
  getPlayer, getLoadout, applyPassiveStats, incrementKills,
  grantGold, spendGold, killPlayer, grantExp, grantSoulShards,
  addItem, getInventory, getItemQty, removeItem, updatePlayerHpMp, setZone
} from '../systems/player';
import { getCombatByUser, saveCombat, deleteCombat } from '../systems/combat';
import { startCombatFlow, startCombatFlowWithEnemy } from '../systems/combatFlow';
import { canExplore, exploreCooldownRemaining, setExploreCooldown } from '../systems/economy';
import { processVictoryRewards, processDeathPenalty } from '../systems/rewards';
import { logEvent, onBossKilled, isBossSlain, getDropBonus, getEnemyAtkBonus } from '../systems/world';
import { awardAchievements } from '../systems/achievements';
import { createLegacy, pickLegacySkill, getLegaciesInZone, claimLegacy, getLegacy } from '../systems/legacy';
import {
  COLORS, buildCombatEmbed, buildCombatButtons, buildSkillSelectMenu,
  buildVictoryEmbed, buildDeathEmbed
} from '../utils/embeds';
import { getZone, ZONES, ZONE_ORDER } from '../data/zones';
import { ENEMIES, getEnemiesForZone, getBossForZone, getEnemy } from '../data/enemies';
import { getItem, ITEMS } from '../data/items';
import { getZoneEquipment } from '../data/equipment';
import { incrementDaily } from './daily';
import { wearEquipment } from '../systems/equipment';
import { getSkill } from '../data/skills';
import { pick, randInt } from '../utils/format';
import { withImage } from '../utils/eventImages';

export const data = new SlashCommandBuilder()
  .setName('explore')
  .setDescription('Khám phá khu vực hiện tại');

// ─────────────────────────────────────────────────────────────────────────────
export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const deferred = await interaction.deferReply({ flags: 64 }).then(() => true).catch((err) => {
  if (err?.code === 10062) return false;
  console.error('[EXPLORE] deferReply failed:', err);
  return false;
});

if (!deferred) return;
  const { id: userId } = interaction.user;
  const guildId = interaction.guildId!;
  const player  = getPlayer(userId, guildId);

  if (!player) {
    await interaction.editReply({ embeds: [simpleEmbed(COLORS.warning, 'Bạn chưa có nhân vật! Dùng `/start`.')] });
    return;
  }
  if (!player.alive) {
    await interaction.editReply({ embeds: [simpleEmbed(COLORS.danger, '☠️ Nhân vật đã chết. Dùng `/start` để hồi sinh!')] });
    return;
  }

  await clearStaleCombat(interaction, userId, guildId);
  const currentCombat = getCombatByUser(userId, guildId);
  if (currentCombat) {
    await resumeCombat(interaction, currentCombat);
    return;
  }

  if (!canExplore(player)) {
    const remaining = exploreCooldownRemaining(player);
    await interaction.editReply({ embeds: [simpleEmbed(COLORS.warning, `⏳ Hãy chờ ${remaining} giây trước khi khám phá lại.`)] });
    return;
  }

  await showExploreMenu(interaction, userId, guildId);
}

async function clearStaleCombat(
  interaction: ChatInputCommandInteraction,
  userId: string, guildId: string
): Promise<void> {
  const current = getCombatByUser(userId, guildId);
  if (!current) return;

  try {
    const channel = await interaction.client.channels.fetch(current.channel_id);
    if (!channel || !('messages' in channel)) throw new Error('Invalid combat channel');
    await (channel as any).messages.fetch(current.message_id);
  } catch {
    deleteCombat(current.message_id);
  }
}

function buildContinueExploreRow(userId: string) {
  return [new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`continue_explore_${userId}`)
      .setLabel('🔎 Khám phá tiếp')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`continue_menu_${userId}`)
      .setLabel('📍 Menu chính')
      .setStyle(ButtonStyle.Secondary)
  )];
}

async function attachContinueExploreHandler(
  message: Message<boolean>,
  interaction: ChatInputCommandInteraction,
  userId: string,
  guildId: string
): Promise<void> {
  let processing = false;

  const collector = message.createMessageComponentCollector({
    filter: i => i.user.id === userId,
    time: 120_000
  });

  collector.on('collect', async (i) => {
    if (
      i.customId !== `continue_explore_${userId}` &&
      i.customId !== `continue_menu_${userId}`
    ) {
      return;
    }

    const deferred = await i.deferUpdate().then(() => true).catch(() => false);
    if (!deferred) return;

    if (processing) return;
    processing = true;

    await message.edit({ components: [] }).catch(() => {});
    collector.stop('continue');

    if (i.customId === `continue_explore_${userId}`) {
      await handleSearch(interaction, userId, guildId);
    } else {
      await showExploreMenu(interaction, userId, guildId);
    }
  });

  collector.on('end', (_c, reason) => {
    if (reason === 'time') {
      message.edit({ components: [] }).catch(() => {});
    }
  });
}

async function resumeCombat(
  interaction: ChatInputCommandInteraction,
  current: NonNullable<ReturnType<typeof getCombatByUser>>
): Promise<void> {
  const link = `https://discord.com/channels/${current.guild_id}/${current.channel_id}/${current.message_id}`;
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setLabel('Quay lại trận chiến')
      .setStyle(ButtonStyle.Link)
      .setURL(link)
  );

  await interaction.editReply({
    embeds: [new EmbedBuilder()
      .setColor(COLORS.info)
      .setTitle('⚔️ Trận chiến đang chờ bạn')
      .setDescription('Bạn đang ở giữa trận đấu. Nhấn nút dưới đây để đi tới màn hình combat hiện tại.')
    ],
    components: [row]
  });
}

// ── Main explore menu ─────────────────────────────────────────────────────────
async function showExploreMenu(
  interaction: ChatInputCommandInteraction,
  userId: string, guildId: string
): Promise<void> {
  const player  = getPlayer(userId, guildId)!;
  const zone    = getZone(player.zone_id)!;
  const bossId  = zone.bossId;
  const bossSlain = bossId ? isBossSlain(guildId, bossId) : true;
  const legacyCount = getLegaciesInZone(guildId, player.zone_id).length;

  const embed = new EmbedBuilder()
    .setColor(zone.color)
    .setTitle(`${zone.icon} ${zone.name}`)
    .setDescription(`*${pick(zone.ambiance)}*`)
    .addFields(
      { name: '👤', value: `**${player.name}** Lv.${player.level}`, inline: true },
      { name: '❤️ HP', value: `${player.hp}/${player.max_hp}`, inline: true },
      { name: '💧 MP', value: `${player.mp}/${player.max_mp}`, inline: true },
      { name: '👻 Di sản', value: `${legacyCount} tại đây`, inline: true },
      { name: '👑 Boss', value: bossSlain ? '✅ Đã hạ' : '⚠️ Còn sống', inline: true },
      { name: '🪙 Gold', value: `${player.gold}`, inline: true }
    );

  const rows = buildExploreRows(userId, zone.safe, !bossSlain, bossId, player.level, zone.minLevel);
  const { embed: zoneEmbed, files: zoneFiles } = withImage(embed, `zone_${player.zone_id}`);
  const reply = await interaction.editReply({ embeds: [zoneEmbed], files: zoneFiles, components: rows });

  let processing = false;

  const collector = reply.createMessageComponentCollector({
    filter: i => i.user.id === userId,
    time: 90_000
  });

  collector.on('collect', async (i) => {
    const deferred = await i.deferUpdate().then(() => true).catch(() => false);
    if (!deferred) return;

    if (processing) return;
    processing = true;

    await reply.edit({ components: [] }).catch(() => {});
    collector.stop('action');

    const cid = (i as any).customId as string;

    if (cid === `ex_search_${userId}`) await handleSearch(interaction, userId, guildId);
    else if (cid === `ex_boss_${userId}`) await handleBoss(interaction, userId, guildId);
    else if (cid === `ex_rest_${userId}`) await handleRest(interaction, userId, guildId);
    else if (cid === `ex_zone_${userId}`) await handleZonePicker(interaction, userId, guildId);
    else if (cid.startsWith(`ex_travel_${userId}_`)) {
      const zoneId = cid.replace(`ex_travel_${userId}_`, '');
      await handleTravel(interaction, userId, guildId, zoneId);
    }
  });

  collector.on('end', (_c, reason) => {
    if (reason === 'time') {
      reply.edit({ components: [] }).catch(() => {});
    }
  });
}

function buildExploreRows(
  userId: string, isSafe: boolean, hasBoss: boolean,
  bossId: string | undefined, playerLevel: number, zoneMinLevel: number
) {
  const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`ex_search_${userId}`)
      .setLabel('Khám phá').setEmoji('🗺️').setStyle(ButtonStyle.Primary).setDisabled(isSafe),
    new ButtonBuilder().setCustomId(`ex_boss_${userId}`)
      .setLabel('Thách Boss').setEmoji('👑').setStyle(ButtonStyle.Danger)
      .setDisabled(isSafe || !hasBoss || playerLevel < zoneMinLevel + 2),
    new ButtonBuilder().setCustomId(`ex_rest_${userId}`)
      .setLabel('Nghỉ ngơi').setEmoji('💤').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`ex_zone_${userId}`)
      .setLabel('Zone').setEmoji('🗺️').setStyle(ButtonStyle.Secondary)
  );
  return [row1];
}

// ── Zone picker ───────────────────────────────────────────────────────────────
async function handleZonePicker(
  interaction: ChatInputCommandInteraction, userId: string, guildId: string
): Promise<void> {
  const player = getPlayer(userId, guildId)!;
  const options = Object.values(ZONES).map(z => {
    const locked = player.level < z.minLevel;
    const current = z.id === player.zone_id;
    return new StringSelectMenuOptionBuilder()
      .setLabel(`${z.icon} ${z.name}`)
      .setDescription(locked ? `🔒 Cần Lv.${z.minLevel}` : current ? '📍 Đang ở đây' : z.travelCost > 0 ? `Chi phí: ${z.travelCost} 🪙` : 'Miễn phí')
      .setValue(`ex_travel_${userId}_${z.id}`)
      .setDefault(current);
  });

  const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`ex_zonemenu_${userId}`)
      .setPlaceholder('Chọn khu vực muốn đến...')
      .addOptions(options)
  );

  const reply = await interaction.editReply({
    embeds: [new EmbedBuilder().setColor(COLORS.info).setTitle('🗺️ Di chuyển đến đâu?')],
    components: [row]
  });

  const sel = await reply.awaitMessageComponent({
    componentType: ComponentType.StringSelect,
    filter: i => i.user.id === userId,
    time: 30_000
  }).catch(() => null);

  if (!sel) { await interaction.editReply({ components: [] }); return; }
  const deferred = await sel.deferUpdate().then(() => true).catch(() => false);
  if (!deferred) return;
  const zoneId = sel.values[0].replace(`ex_travel_${userId}_`, '');
  await handleTravel(interaction, userId, guildId, zoneId);
}

async function handleTravel(
  interaction: ChatInputCommandInteraction, userId: string, guildId: string, targetId: string
): Promise<void> {
  const player = getPlayer(userId, guildId)!;
  const target = ZONES[targetId];
  if (!target) return;

  if (targetId === player.zone_id) {
    await interaction.editReply({ embeds: [simpleEmbed(COLORS.info, `Bạn đang ở **${target.icon} ${target.name}** rồi!`)], components: [] });
    return;
  }
  if (player.level < target.minLevel) {
    await interaction.editReply({ embeds: [simpleEmbed(COLORS.warning, `Cần **Lv.${target.minLevel}** để vào **${target.name}**! (Bạn: Lv.${player.level})`)], components: [] });
    return;
  }
  if (target.travelCost > 0 && player.gold < target.travelCost) {
    await interaction.editReply({ embeds: [simpleEmbed(COLORS.warning, `Cần **${target.travelCost} 🪙** để đến **${target.name}**! (Bạn có: ${player.gold} 🪙)`)], components: [] });
    return;
  }
  if (target.travelCost > 0) spendGold(userId, guildId, target.travelCost);
  setZone(userId, guildId, targetId);

  await interaction.editReply({
    embeds: [
      new EmbedBuilder().setColor(target.color)
        .setTitle(`${target.icon} Đã đến ${target.name}`)
        .setDescription(`*${target.description}*`)
        .addFields(
          target.travelCost > 0 ? [{ name: '💸 Chi phí', value: `−${target.travelCost} 🪙`, inline: true }] : []
        )
    ],
    components: []
  });
}

// ── Rest ──────────────────────────────────────────────────────────────────────
async function handleRest(
  interaction: ChatInputCommandInteraction, userId: string, guildId: string
): Promise<void> {
  const player = getPlayer(userId, guildId)!;
  const cost   = player.zone_id === 'village' ? 0 : 15;

  if (cost > 0 && player.gold < cost) {
    await interaction.editReply({ embeds: [simpleEmbed(COLORS.warning, `💤 Cần **${cost} 🪙** để nghỉ ngơi. Không đủ tiền!`)], components: [] });
    return;
  }
  if (cost > 0) spendGold(userId, guildId, cost);

  const hpGain = Math.floor(player.max_hp * 0.3);
  const mpGain = Math.floor(player.max_mp * 0.3);
  const newHp  = Math.min(player.max_hp, player.hp + hpGain);
  const newMp  = Math.min(player.max_mp, player.mp + mpGain);
  updatePlayerHpMp(userId, guildId, newHp, newMp);

  const { embed: restEmbed, files: restFiles } = withImage(
    new EmbedBuilder().setColor(COLORS.success).setTitle('💤 Nghỉ ngơi')
      .setDescription(
        `Bạn nghỉ ngơi${cost > 0 ? ` (−${cost} 🪙)` : ''} và phục hồi:\n` +
        `❤️ +**${hpGain} HP** → ${newHp}/${player.max_hp}\n` +
        `💧 +**${mpGain} MP** → ${newMp}/${player.max_mp}`
      ),
    'rest'
  );
  const restReply = await interaction.editReply({ embeds: [restEmbed], files: restFiles, components: buildContinueExploreRow(userId) });
  attachContinueExploreHandler(restReply, interaction, userId, guildId);
}

// ── Search: random event ───────────────────────────────────────────────────────
async function handleSearch(
  interaction: ChatInputCommandInteraction, userId: string, guildId: string
): Promise<void> {
  const player = getPlayer(userId, guildId)!;

  if (!canExplore(player)) {
    const remaining = exploreCooldownRemaining(player);
    const reply = await interaction.editReply({
      embeds: [simpleEmbed(COLORS.warning, `⏳ Hãy chờ **${remaining} giây** trước khi khám phá tiếp.`)],
      components: buildContinueExploreRow(userId)
    });
    attachContinueExploreHandler(reply, interaction, userId, guildId);
    return;
  }

  incrementDaily(userId, guildId, 'explore_count');
  const zone     = getZone(player.zone_id)!;
  const enemies  = getEnemiesForZone(player.zone_id);
  const legacies = getLegaciesInZone(guildId, player.zone_id, 5);

  const hasCombat = enemies.length > 0;
  const hasLegacy = legacies.length > 0;

  // Weighted table (100 total)
  // 25% combat | 10% ambush | 10% legacy | 8% merchant | 8% spring
  // 8% trap | 8% altar | 7% mysterious | 7% villager | 5% caravan | 4% loot | 0% nothing
  type EventType = 'combat'|'ambush'|'legacy'|'merchant'|'spring'|'trap'|'altar'|'mysterious'|'villager'|'caravan'|'loot'|'soul_shop'|'nothing';

  const table: Array<[EventType, number]> = [
    ['combat',     hasCombat ? 24 : 0],
    ['ambush',     hasCombat ? 9 : 0],
    ['legacy',     hasLegacy ? 9 : 0],
    ['merchant',   8],
    ['spring',     7],
    ['trap',       7],
    ['altar',      7],
    ['mysterious', 6],
    ['villager',   6],
    ['caravan',    5],
    ['loot',       4],
    ['soul_shop',  player.soul_shards >= 1 ? 6 : 2], // rare unless has shards
  ];

  // Weighted random pick
  const total = table.reduce((s, [, w]) => s + w, 0);
  let roll    = randInt(1, total || 1);
  let event: EventType = 'nothing';
  for (const [name, weight] of table) {
    if (weight <= 0) continue;
    roll -= weight;
    if (roll <= 0) { event = name; break; }
  }

  setExploreCooldown(userId, guildId);

  switch (event) {
    case 'combat':     return startCombatFlow(interaction, userId, guildId, pick(enemies).id, handleVictory, handleDeath);
    case 'ambush':     return showAmbush(interaction, userId, guildId, pick(enemies).id);
    case 'legacy':     return showLegacyFind(interaction, userId, guildId, legacies);
    case 'merchant':   return showMerchant(interaction, userId, guildId);
    case 'spring':     return showHealingSpring(interaction, userId, guildId);
    case 'trap':       return showTrap(interaction, userId, guildId);
    case 'altar':      return showAncientAltar(interaction, userId, guildId);
    case 'mysterious': return showMysteriousFigure(interaction, userId, guildId);
    case 'villager':   return showVillagerRescue(interaction, userId, guildId, enemies);
    case 'caravan':    return showCaravanRobbery(interaction, userId, guildId, enemies);
    case 'loot':       return showLootFind(interaction, userId, guildId);
    case 'soul_shop':  return showSoulShop(interaction, userId, guildId);
    default:
      await interaction.editReply({
        embeds: [new EmbedBuilder().setColor(zone.color).setDescription(`*${pick(zone.ambiance)}*\n\nKhông có gì bất thường...`)],
        components: []
      });
  }
}

// ── Boss ───────────────────────────────────────────────────────────────────────
async function handleBoss(
  interaction: ChatInputCommandInteraction, userId: string, guildId: string
): Promise<void> {
  const player = getPlayer(userId, guildId)!;
  const zone   = getZone(player.zone_id)!;
  if (!zone.bossId) return;
  setExploreCooldown(userId, guildId);
  await startCombatFlow(interaction, userId, guildId, zone.bossId, handleVictory, handleDeath);
}

// ── Legacy find ───────────────────────────────────────────────────────────────
async function showLegacyFind(
  interaction: ChatInputCommandInteraction, userId: string, guildId: string,
  legacies: any[]
): Promise<void> {
  const legacy = pick(legacies);
  const skill  = legacy.legacy_skill_id ? getSkill(legacy.legacy_skill_id) : null;
  const zone   = getZone(legacy.zone_id)!;

  const desc = [
    `Bạn phát hiện dấu vết của **${legacy.player_name}**...`,
    `*(Đây là lần chết thứ ${legacy.deaths} của họ)*\n`,
    skill ? `🔮 Kỹ năng để lại: **${skill.icon} ${skill.name}**` : '',
    legacy.gold_left > 0 ? `🪙 Gold để lại: **${legacy.gold_left}**` : '',
  ].filter(Boolean).join('\n');

  const embed = new EmbedBuilder()
    .setColor(COLORS.purple)
    .setTitle('👻 Phát Hiện Di Sản!')
    .setDescription(desc);

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`leg_take_${userId}`).setLabel('Nhặt lên').setEmoji('👻').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`leg_skip_${userId}`).setLabel('Bỏ qua').setEmoji('🚶').setStyle(ButtonStyle.Secondary)
  );

  const { embed: legacyEmbed, files: legacyFiles } = withImage(embed, 'legacy');
  const reply = await interaction.editReply({ embeds: [legacyEmbed], files: legacyFiles, components: [row] });

  const btn = await reply.awaitMessageComponent({
    componentType: ComponentType.Button,
    filter: i => i.user.id === userId,
    time: 30_000
  }).catch(() => null);

  if (!btn || btn.customId === `leg_skip_${userId}`) {
    await (btn?.deferUpdate() ?? Promise.resolve());
    await interaction.editReply({
      embeds: [new EmbedBuilder().setColor(COLORS.info).setDescription('🚶 Bạn bước qua, để lại di sản cho người khác...')],
      components: []
    });
    return;
  }

  const deferredBtn = await btn.deferUpdate().then(() => true).catch(() => false);
  if (!deferredBtn) return;

  const player = getPlayer(userId, guildId)!;
  const results: string[] = [];

  // Grant skill
  if (skill) {
    const { hasSkillInPool, addSkillToPool } = await import('../systems/player');
    if (hasSkillInPool(userId, guildId, legacy.legacy_skill_id)) {
      results.push(`🔮 **${skill.icon} ${skill.name}** — Bạn đã biết kỹ năng này rồi.`);
    } else {
      addSkillToPool(userId, guildId, legacy.legacy_skill_id);
      results.push(`🔮 **${skill.icon} ${skill.name}** thêm vào Skill Pool!`);
    }
  }

  // Grant gold
  if (legacy.gold_left > 0) {
    grantGold(userId, guildId, legacy.gold_left);
    results.push(`🪙 +**${legacy.gold_left}** Gold từ di sản.`);
  }

  claimLegacy(legacy.id, userId);
  logEvent(guildId, userId, player.name, 'legacy', `đã nhận Di Sản của **${legacy.player_name}**.`, player.zone_id);

  const legResReply = await interaction.editReply({
    embeds: [
      new EmbedBuilder().setColor(COLORS.purple)
        .setTitle('✨ Đã Nhận Di Sản')
        .setDescription(
          `Linh hồn **${legacy.player_name}** trao lại ký ức...\n\n` +
          (results.join('\n') || '*Không có gì...*')
        )
    ],
    components: buildContinueExploreRow(userId)
  });
  attachContinueExploreHandler(legResReply, interaction, userId, guildId);
}

// ── Loot find ─────────────────────────────────────────────────────────────────
async function showLootFind(
  interaction: ChatInputCommandInteraction, userId: string, guildId: string
): Promise<void> {
  const lootTable = ['health_potion', 'mana_potion', 'herb', 'antidote'];
  const itemId    = pick(lootTable);
  const item      = getItem(itemId)!;
  addItem(userId, guildId, itemId, 1);

  const lootReply = await interaction.editReply({
    embeds: [
      new EmbedBuilder().setColor(COLORS.gold)
        .setTitle('📦 Tìm thấy vật phẩm!')
        .setDescription(`Bạn nhặt được **${item.icon} ${item.name}** ẩn trong bụi rậm!`)
    ],
    components: buildContinueExploreRow(userId)
  });
  attachContinueExploreHandler(lootReply, interaction, userId, guildId);
}

// ── Merchant encounter ────────────────────────────────────────────────────────
async function showMerchant(
  interaction: ChatInputCommandInteraction, userId: string, guildId: string
): Promise<void> {
  const player = getPlayer(userId, guildId)!;
  const zone   = getZone(player.zone_id)!;

  const { getShopDiscount } = await import('../systems/world');
  const discount = getShopDiscount(guildId);

  await renderMerchantBuy(interaction, userId, guildId, zone.id, discount, player.gold);
}

async function renderMerchantBuy(
  interaction: ChatInputCommandInteraction,
  userId: string, guildId: string, zoneId: string,
  discount: number, playerGold: number
): Promise<void> {
  const zone  = getZone(zoneId)!;
  const { getShopDiscount } = await import('../systems/world');

  const shopItems = zone.shopItems
    .map(id => getItem(id))
    .filter(Boolean) as NonNullable<ReturnType<typeof getItem>>[];

  // Equipment for sale in this zone
  const eqItems = getZoneEquipment(zoneId);

  const itemLines = [
    ...shopItems.map(item => {
      if (!item.buyPrice) return '';
      const price = Math.floor(item.buyPrice * (1 - discount / 100));
      return `${item.icon} **${item.name}** — **${price}** 🪙`;
    }),
    eqItems.length ? '\n⚔️ **Trang bị:**' : '',
    ...eqItems.map(eq => {
      const price = Math.floor(eq.buyPrice! * (1 - discount / 100));
      const statsStr = Object.entries(eq.stats).map(([k,v]) => `+${v} ${k}`).join(', ');
      return `${eq.icon} **${eq.name}** (${statsStr}) — **${price}** 🪙`;
    })
  ].filter(Boolean).join('\n');

  const discountNote = discount > 0 ? `\n> 🛒 Giảm giá **${discount}%** đang có!\n` : '';

  const embed = new EmbedBuilder()
    .setColor(COLORS.gold)
    .setTitle('🛒 Lái Buôn Lữ Hành!')
    .setDescription(
      `*Một lái buôn xuất hiện từ sau cây...*\n` +
      discountNote + '\n' + itemLines + `\n\n🪙 Gold của bạn: **${playerGold}**`
    );

  const allBuyOptions = [
    ...shopItems.filter(i => i.buyPrice).map(i => {
      const price = Math.floor(i.buyPrice! * (1 - discount / 100));
      return new StringSelectMenuOptionBuilder()
        .setLabel(`${i.name} — ${price} 🪙`)
        .setDescription(i.description.replace(/\*\*/g, '').slice(0, 50))
        .setValue(`buy_${i.id}`)
        .setEmoji(i.icon);
    }),
    ...eqItems.map(eq => {
      const price = Math.floor(eq.buyPrice! * (1 - discount / 100));
      const statsStr = Object.entries(eq.stats).map(([k,v]) => `+${v} ${k}`).join(', ');
      return new StringSelectMenuOptionBuilder()
        .setLabel(`${eq.name} — ${price} 🪙`)
        .setDescription(`⚔️ ${eq.slot} · ${statsStr}`.slice(0, 50))
        .setValue(`buyeq_${eq.id}`)
        .setEmoji(eq.icon);
    })
  ].slice(0, 25); // Discord limit

  const buyOptions = allBuyOptions;

  const rows: ActionRowBuilder<any>[] = [];

  if (buyOptions.length) {
    rows.push(new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`merch_buy_${userId}`)
        .setPlaceholder('Mua vật phẩm...')
        .addOptions(buyOptions)
    ));
  }

  rows.push(new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`merch_sell_${userId}`).setLabel('Bán đồ').setEmoji('💰').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`merch_leave_${userId}`).setLabel('Rời đi').setEmoji('🚶').setStyle(ButtonStyle.Secondary)
  ));

  const { embed: merchEmbed, files: merchFiles } = withImage(embed, 'merchant');
  const reply = await interaction.editReply({ embeds: [merchEmbed], files: merchFiles, components: rows });

  const collector = reply.createMessageComponentCollector({
    filter: i => i.user.id === userId,
    time: 60_000
  });

  collector.on('collect', async (compInt) => {
    const deferred = await compInt.deferUpdate().then(() => true).catch(() => false);
    if (!deferred) return;

    const cid = (compInt as any).customId as string;

    if (cid === `merch_leave_${userId}`) {
      collector.stop();
      const leaveReply = await interaction.editReply({ embeds: [simpleEmbed(COLORS.info, '🚶 Bạn vẫy tay chào lái buôn và bước đi.')], components: buildContinueExploreRow(userId) });
      attachContinueExploreHandler(leaveReply, interaction, userId, guildId);

    } else if (cid === `merch_sell_${userId}`) {
      collector.stop();
      await renderMerchantSell(interaction, userId, guildId, zoneId, discount);

    } else if (cid === `merch_buy_${userId}`) {
      const sel = compInt as StringSelectMenuInteraction;
      const rawVal  = sel.values[0];
      const isBuyEq = rawVal.startsWith('buyeq_');
      const itemId  = rawVal.replace('buyeq_', '').replace('buy_', '');
      const fresh   = getPlayer(userId, guildId)!;

      let price = 0;
      let displayName = '';

      if (isBuyEq) {
        const { getEquipment: getEq } = await import('../data/equipment');
        const eq = getEq(itemId);
        if (!eq?.buyPrice) return;
        price = Math.floor(eq.buyPrice * (1 - discount / 100));
        displayName = `${eq.icon} ${eq.name}`;
      } else {
        const item = getItem(itemId);
        if (!item?.buyPrice) return;
        price = Math.floor(item.buyPrice * (1 - discount / 100));
        displayName = `${item.icon} ${item.name}`;
      }

      if (fresh.gold < price) {
        await interaction.editReply({
          embeds: [embed.setFooter({ text: `❌ Không đủ Gold! Cần ${price} 🪙, bạn có ${fresh.gold} 🪙` })]
        });
        return;
      }

      spendGold(userId, guildId, price);
      addItem(userId, guildId, itemId, 1);

      const updatedPlayer = getPlayer(userId, guildId)!;
      await interaction.editReply({
        embeds: [
          new EmbedBuilder().setColor(COLORS.gold)
            .setTitle('🛒 Lái Buôn Lữ Hành!')
            .setDescription(
              `✅ Đã mua **${displayName}** — −${price} 🪙\n` +
              discountNote + '\n' + itemLines + `\n\n🪙 Gold còn lại: **${updatedPlayer.gold}**`
            )
        ]
      });
    }
  });

  collector.on('end', (_c, reason) => {
    if (reason === 'time') interaction.editReply({ components: [] }).catch(() => {});
  });
}

async function renderMerchantSell(
  interaction: ChatInputCommandInteraction,
  userId: string, guildId: string, zoneId: string, discount: number
): Promise<void> {
  const player    = getPlayer(userId, guildId)!;
  const inventory = getInventory(userId, guildId);
  const sellable  = inventory
    .map(e => ({ entry: e, item: getItem(e.item_id) }))
    .filter(({ item }) => item?.sellPrice && item.type !== 'key_item');

  if (!sellable.length) {
    await interaction.editReply({
      embeds: [simpleEmbed(COLORS.info, '🎒 Không có gì để bán cả.')],
      components: [
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder().setCustomId(`sell_back_${userId}`).setLabel('Quay lại').setEmoji('↩️').setStyle(ButtonStyle.Secondary)
        )
      ]
    });

    const reply = await interaction.fetchReply();
    const btn = await reply.awaitMessageComponent({
      componentType: ComponentType.Button, filter: i => i.user.id === userId, time: 20_000
    }).catch(() => null);
    if (btn) {
      const deferred = await btn.deferUpdate().then(() => true).catch(() => false);
      if (deferred) await showMerchant(interaction, userId, guildId);
    }
    return;
  }

  const options = sellable.map(({ entry, item }) =>
    new StringSelectMenuOptionBuilder()
      .setLabel(`${item!.name} ×${entry.quantity}`)
      .setDescription(`Bán: ${item!.sellPrice} 🪙 mỗi cái`)
      .setValue(`sell_${entry.item_id}`)
      .setEmoji(item!.icon)
  );

  const embed = new EmbedBuilder().setColor(COLORS.gold)
    .setTitle('💰 Bán Đồ')
    .setDescription(`🪙 Gold hiện tại: **${player.gold}**\nChọn vật phẩm muốn bán:`)
    .addFields(
      sellable.map(({ entry, item }) => ({
        name: `${item!.icon} ${item!.name} ×${entry.quantity}`,
        value: `${item!.sellPrice} 🪙/cái`,
        inline: true
      }))
    );

  const rows: ActionRowBuilder<any>[] = [
    new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`merch_sellitem_${userId}`)
        .setPlaceholder('Chọn vật phẩm để bán...')
        .addOptions(options)
    ),
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId(`merch_sellback_${userId}`).setLabel('Quay lại shop').setEmoji('↩️').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`merch_sellleave_${userId}`).setLabel('Rời đi').setEmoji('🚶').setStyle(ButtonStyle.Secondary)
    )
  ];

  const { embed: sellEmbed, files: sellFiles } = withImage(embed, 'merchant');
  const reply = await interaction.editReply({ embeds: [sellEmbed], files: sellFiles, components: rows });

  const collector = reply.createMessageComponentCollector({
    filter: i => i.user.id === userId, time: 60_000
  });

  collector.on('collect', async (compInt) => {
    const deferred = await compInt.deferUpdate().then(() => true).catch(() => false);
    if (!deferred) return;

    const cid = (compInt as any).customId as string;

    if (cid === `merch_sellback_${userId}`) {
      collector.stop();
      await showMerchant(interaction, userId, guildId);
    } else if (cid === `merch_sellleave_${userId}`) {
      collector.stop();
      const leaveReply = await interaction.editReply({ embeds: [simpleEmbed(COLORS.info, '🚶 Bạn vẫy tay chào lái buôn và bước đi.')], components: buildContinueExploreRow(userId) });
      attachContinueExploreHandler(leaveReply, interaction, userId, guildId);
    } else if (cid === `merch_sellitem_${userId}`) {
      const sel    = compInt as StringSelectMenuInteraction;
      const itemId = sel.values[0].replace('sell_', '');
      const item   = getItem(itemId);
      if (!item?.sellPrice) return;

      const qty = getItemQty(userId, guildId, itemId);
      if (qty <= 0) return;

      removeItem(userId, guildId, itemId, 1);
      grantGold(userId, guildId, item.sellPrice);

      const fresh = getPlayer(userId, guildId)!;
      await interaction.editReply({
        embeds: [
          new EmbedBuilder().setColor(COLORS.gold)
            .setTitle('💰 Bán Đồ')
            .setDescription(`✅ Bán **${item.icon} ${item.name}** → +**${item.sellPrice}** 🪙\n🪙 Gold: **${fresh.gold}**`)
            .addFields(
              sellable
                .map(({ entry, item: it }) => {
                  const currentQty = entry.item_id === itemId ? qty - 1 : entry.quantity;
                  return currentQty > 0 ? { name: `${it!.icon} ${it!.name} ×${currentQty}`, value: `${it!.sellPrice} 🪙/cái`, inline: true } : null;
                })
                .filter(Boolean) as any[]
            )
        ]
      });
    }
  });

  collector.on('end', (_c, reason) => {
    if (reason === 'time') interaction.editReply({ components: [] }).catch(() => {});
  });
}

async function handleVictory(
  interaction: ChatInputCommandInteraction, btnInt: ButtonInteraction,
  userId: string, guildId: string, player: any, enemy: any,
  state: any
): Promise<void> {
  const rewards = processVictoryRewards(userId, guildId, player, enemy);
  const bonus   = (enemy as any).combatBonus;

  if (bonus) {
    grantGold(userId, guildId, bonus.bonusGold);
    if (bonus.bonusItem) addItem(userId, guildId, bonus.bonusItem, 1);
    rewards.bonusDescription += '\n\n' + bonus.bonusDesc.replace('{gold}', String(bonus.bonusGold));
  }

  updatePlayerHpMp(userId, guildId, state.player_hp, state.player_mp);

  const embed = buildVictoryEmbed(
    player.name, enemy.name, enemy.icon,
    rewards.exp, rewards.gold, rewards.drops,
    rewards.leveledUp, rewards.newLevel
  );
  if (rewards.bonusDescription) {
    embed.setDescription((embed.data.description ?? '') + rewards.bonusDescription);
  }

  const achievementMessages = awardAchievements(userId, guildId);
  if (achievementMessages.length) {
    embed.addFields({ name: '🏆 Thành tựu mới', value: achievementMessages.join('\n'), inline: false });
  }

  const { embed: victoryImg, files: victoryFiles } = withImage(embed, 'victory');
  await btnInt.editReply({ embeds: [victoryImg], files: victoryFiles, components: buildContinueExploreRow(userId) });
  attachContinueExploreHandler(btnInt.message, interaction, userId, guildId);
}

async function handleDeath(
  interaction: ChatInputCommandInteraction, btnInt: ButtonInteraction,
  userId: string, guildId: string, player: any, enemy: any
): Promise<void> {
  const penalty = processDeathPenalty(userId, guildId, player, enemy);

  const embed = buildDeathEmbed(player.name, enemy.name, penalty.goldLeft)
    .addFields({ name: '💀 Soul Shards', value: `+**${penalty.shards}** 💀`, inline: true });

  const achievementMessages = awardAchievements(userId, guildId);
  if (achievementMessages.length) {
    embed.addFields({ name: '🏆 Thành tựu mới', value: achievementMessages.join('\n'), inline: false });
  }

  const { embed: deathImg, files: deathFiles } = withImage(embed, 'death');
  await btnInt.editReply({
    embeds: [deathImg],
    files: deathFiles,
    components: buildContinueExploreRow(userId)
  });
  attachContinueExploreHandler(btnInt.message, interaction, userId, guildId);
}

// ── Event: Healing Spring ─────────────────────────────────────────────────────
async function showHealingSpring(
  interaction: ChatInputCommandInteraction, userId: string, guildId: string
): Promise<void> {
  const player = getPlayer(userId, guildId)!;
  const isFullHeal = randInt(1, 100) <= 15; // 15% chance of full restore

  const hpGain = isFullHeal ? player.max_hp - player.hp : Math.floor(player.max_hp * 0.5);
  const mpGain = isFullHeal ? player.max_mp - player.mp : Math.floor(player.max_mp * 0.5);
  const newHp  = Math.min(player.max_hp, player.hp + hpGain);
  const newMp  = Math.min(player.max_mp, player.mp + mpGain);
  updatePlayerHpMp(userId, guildId, newHp, newMp);

  const flavors = [
    'Một dòng suối trong vắt chảy ra từ kẽ đá...',
    'Ánh sáng bạc phản chiếu từ mặt hồ nhỏ giữa rừng...',
    'Tiếng nước chảy róc rách dẫn bạn đến một suối nhỏ...',
  ];

  const { embed: springEmbed, files: springFiles } = withImage(
    new EmbedBuilder().setColor(0x3498DB)
      .setTitle(`🌊 ${isFullHeal ? 'Suối Hồi Sinh Huyền Bí' : 'Suối Hồi Phục'}`)
      .setDescription(
        `*${pick(flavors)}*\n\n` +
        (isFullHeal ? '✨ **Nguồn nước kỳ diệu hồi phục hoàn toàn!**\n\n' : '') +
        `❤️ +**${hpGain} HP** → ${newHp}/${player.max_hp}\n` +
        `💧 +**${mpGain} MP** → ${newMp}/${player.max_mp}`
      ),
    'spring'
  );
  const reply = await interaction.editReply({ embeds: [springEmbed], files: springFiles, components: buildContinueExploreRow(userId) });
  attachContinueExploreHandler(reply, interaction, userId, guildId);
}

// ── Event: Trap ────────────────────────────────────────────────────────────────
async function showTrap(
  interaction: ChatInputCommandInteraction, userId: string, guildId: string
): Promise<void> {
  const player  = getPlayer(userId, guildId)!;
  const noticed = randInt(1, 100) <= 50; // 50% notice it

  type TrapKind = 'pit' | 'snare' | 'poison' | 'gold';
  const trapType: TrapKind = pick(['pit','snare','poison','gold'] as TrapKind[]);
  const trapInfo: Record<TrapKind, { name: string; icon: string; desc: string }> = {
    pit:    { name: 'Hố Bẫy', icon: '🕳️', desc: 'Một hố sâu ngụy trang bằng cành lá.' },
    snare:  { name: 'Bẫy Thòng Lọng', icon: '🔗', desc: 'Một cái bẫy thòng lọng bằng dây thừng.' },
    poison: { name: 'Bẫy Độc', icon: '🧨', desc: 'Kim độc bắn ra từ cơ chế ẩn.' },
    gold:   { name: 'Bẫy Vàng Giả', icon: '💛', desc: 'Vàng giả làm mồi nhử — có ai đó đã đặt bẫy ở đây.' },
  };
  const info = trapInfo[trapType];

  if (noticed) {
    // Player spotted it — give choice
    const embed = new EmbedBuilder().setColor(COLORS.warning)
      .setTitle(`⚠️ Phát Hiện ${info.icon} ${info.name}!`)
      .setDescription(`*${info.desc}*\n\nBạn nhận ra dấu hiệu bất thường trước khi bước vào...`);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId(`trap_avoid_${userId}`).setLabel('Cẩn thận tránh qua').setEmoji('🚶').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`trap_brave_${userId}`).setLabel('Liều mạng vượt qua').setEmoji('💪').setStyle(ButtonStyle.Danger)
    );

    const { embed: trapNoticeEmbed, files: trapNoticeFiles } = withImage(embed, 'trap');
    const reply = await interaction.editReply({ embeds: [trapNoticeEmbed], files: trapNoticeFiles, components: [row] });
    const btn   = await reply.awaitMessageComponent({
      componentType: ComponentType.Button, filter: i => i.user.id === userId, time: 25_000
    }).catch(() => null);

    await (btn?.deferUpdate() ?? Promise.resolve());

    if (!btn || btn.customId === `trap_avoid_${userId}`) {
      await interaction.editReply({
        embeds: [new EmbedBuilder().setColor(COLORS.success).setDescription('✅ Bạn cẩn thận bước qua bẫy an toàn.')],
        components: []
      });
      return;
    }
    // Brave: take reduced damage
    await triggerTrap(interaction, userId, guildId, trapType, true);
  } else {
    // Didn't notice — full effect
    await triggerTrap(interaction, userId, guildId, trapType, false);
  }
}

async function triggerTrap(
  interaction: ChatInputCommandInteraction, userId: string, guildId: string,
  trapType: string, reduced: boolean
): Promise<void> {
  const player = getPlayer(userId, guildId)!;
  let newHp = player.hp, newGold = player.gold;
  let resultDesc = '';
  const mult = reduced ? 0.5 : 1.0;

  if (trapType === 'gold') {
    const loss = Math.floor(Math.min(player.gold, randInt(15, 40)) * mult);
    newGold = player.gold - loss;
    if (loss > 0) {
      const { spendGold: sg } = await import('../systems/player');
      sg(userId, guildId, loss);
    }
    resultDesc = `💸 Mất **${loss} Gold** vì vàng giả.`;
  } else {
    const dmg = Math.floor(Math.max(1, player.max_hp * randInt(15, 30) / 100) * mult);
    newHp = Math.max(1, player.hp - dmg); // can't kill via trap
    updatePlayerHpMp(userId, guildId, newHp, player.mp);
    resultDesc = `❤️ Mất **${dmg} HP** (${newHp}/${player.max_hp})`;
    if (trapType === 'poison') resultDesc += '\n*Vết thương rát bỏng từ nọc độc...*';
  }

  const prefix = reduced ? '⚡ Bạn cố vượt qua nhưng vẫn dính bẫy!\n\n' : '💥 Bạn dẫm phải bẫy!\n\n';
  const { embed: trapResEmbed, files: trapResFiles } = withImage(
    new EmbedBuilder().setColor(COLORS.danger).setTitle('💣 Dính Bẫy!').setDescription(prefix + resultDesc),
    'trap'
  );
  const trapResReply = await interaction.editReply({ embeds: [trapResEmbed], files: trapResFiles, components: buildContinueExploreRow(userId) });
  attachContinueExploreHandler(trapResReply, interaction, userId, guildId);
}

// ── Event: Ancient Altar ────────────────────────────────────────────────────
async function showAncientAltar(
  interaction: ChatInputCommandInteraction, userId: string, guildId: string
): Promise<void> {
  const player = getPlayer(userId, guildId)!;
  const altarFlavors = [
    'Một bàn thờ đá cổ xưa nằm giữa vòng tròn nến đang cháy tự nhiên...',
    'Những ký tự rune khắc trên đá phát sáng yếu ớt khi bạn đến gần...',
    'Khói nhang mờ ảo cuộn quanh bệ thờ không rõ nguồn gốc...',
  ];

  const embed = new EmbedBuilder().setColor(0xF39C12)
    .setTitle('🏺 Bàn Thờ Cổ')
    .setDescription(
      `*${pick(altarFlavors)}*\n\n` +
      `Dâng vật tế để nhận phước lành... hoặc lời nguyền.\n\n` +
      `> 💰 **Dâng 50 Gold** — thần linh ban thưởng ngẫu nhiên\n` +
      `> ❤️ **Dâng 20% HP** — tế máu đổi lấy sức mạnh linh hồn\n` +
      `> 🚶 **Rời đi** — không can thiệp vào thứ này`
    );

  const canAffordGold = player.gold >= 50;
  const canAffordHp   = player.hp > Math.floor(player.max_hp * 0.25); // need > 25% HP

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`altar_gold_${userId}`).setLabel('Dâng 50 Gold').setEmoji('💰').setStyle(ButtonStyle.Primary).setDisabled(!canAffordGold),
    new ButtonBuilder().setCustomId(`altar_hp_${userId}`).setLabel('Dâng 20% HP').setEmoji('❤️').setStyle(ButtonStyle.Danger).setDisabled(!canAffordHp),
    new ButtonBuilder().setCustomId(`altar_skip_${userId}`).setLabel('Rời đi').setEmoji('🚶').setStyle(ButtonStyle.Secondary)
  );

  const { embed: altarEmbed, files: altarFiles } = withImage(embed, 'altar');
  const reply = await interaction.editReply({ embeds: [altarEmbed], files: altarFiles, components: [row] });
  const btn   = await reply.awaitMessageComponent({
    componentType: ComponentType.Button, filter: i => i.user.id === userId, time: 30_000
  }).catch(() => null);

  await (btn?.deferUpdate() ?? Promise.resolve());
  const cid = btn?.customId ?? `altar_skip_${userId}`;

  if (cid === `altar_skip_${userId}` || !btn) {
    const skipReply = await interaction.editReply({ embeds: [simpleEmbed(COLORS.info, '🚶 Bạn rời bàn thờ cổ mà không chạm vào...')], components: buildContinueExploreRow(userId) });
    attachContinueExploreHandler(skipReply, interaction, userId, guildId);
    return;
  }

  const freshPlayer = getPlayer(userId, guildId)!;
  let title = '', resultDesc = '';

  if (cid === `altar_gold_${userId}`) {
    spendGold(userId, guildId, 50);
    const roll = randInt(1, 100);

    if (roll <= 35) {
      grantSoulShards(userId, guildId, 3);
      title = '✨ Thần Linh Chấp Nhận!';
      resultDesc = '💀 +**3 Soul Shards** — thần linh ban phước lành cho linh hồn bạn.';
    } else if (roll <= 65) {
      const gifts = ['health_potion','mana_potion','elixir','antidote'];
      const item = pick(gifts); addItem(userId, guildId, item, 1);
      const it = getItem(item)!;
      title = '🎁 Thần Linh Ban Quà!';
      resultDesc = `${it.icon} **${it.name}** xuất hiện trên bàn thờ.`;
    } else if (roll <= 85) {
      const bonus = Math.floor(freshPlayer.exp_next * 0.2);
      grantExp(userId, guildId, bonus);
      title = '⭐ Ánh Sáng Trí Tuệ!';
      resultDesc = `+**${bonus} EXP** — tri thức cổ xưa truyền vào tâm trí bạn.`;
    } else {
      // Cursed — lose extra 20g
      const extraLoss = Math.min(freshPlayer.gold, 20);
      if (extraLoss > 0) spendGold(userId, guildId, extraLoss);
      title = '💀 Lời Nguyền!';
      resultDesc = `Thần linh nổi giận — mất thêm **${extraLoss} Gold**!\n*Tổng mất: ${50 + extraLoss} 🪙*`;
    }
  } else { // altar_hp
    const sacrifice = Math.floor(freshPlayer.max_hp * 0.2);
    const newHp     = Math.max(1, freshPlayer.hp - sacrifice);
    updatePlayerHpMp(userId, guildId, newHp, freshPlayer.mp);

    const roll = randInt(1, 100);
    if (roll <= 45) {
      grantSoulShards(userId, guildId, 5);
      title = '🩸 Tế Máu Được Chấp Nhận!';
      resultDesc = `❤️ −**${sacrifice} HP** (${newHp}/${freshPlayer.max_hp})\n💀 +**5 Soul Shards** — máu bạn tưới đẫm bàn thờ.`;
    } else if (roll <= 75) {
      grantGold(userId, guildId, 80);
      title = '🩸 Đổi Máu Lấy Vàng!';
      resultDesc = `❤️ −**${sacrifice} HP** (${newHp}/${freshPlayer.max_hp})\n🪙 +**80 Gold** rơi xuống từ hư không.`;
    } else {
      grantSoulShards(userId, guildId, 2);
      grantGold(userId, guildId, 30);
      title = '🩸 Phần Thưởng Khiêm Tốn';
      resultDesc = `❤️ −**${sacrifice} HP** (${newHp}/${freshPlayer.max_hp})\n💀 +**2 Soul Shards**  ·  🪙 +**30 Gold**`;
    }
  }

  const altarResReply = await interaction.editReply({
    embeds: [new EmbedBuilder().setColor(0xF39C12).setTitle(title).setDescription(resultDesc)],
    components: buildContinueExploreRow(userId)
  });
  attachContinueExploreHandler(altarResReply, interaction, userId, guildId);
}

// ── Event: Mysterious Figure ──────────────────────────────────────────────────
async function showMysteriousFigure(
  interaction: ChatInputCommandInteraction, userId: string, guildId: string
): Promise<void> {
  const player  = getPlayer(userId, guildId)!;
  const flavors = [
    'Một bóng người choàng áo đen ngồi trên tảng đá, không rõ mặt...',
    'Tiếng cười khẽ vọng ra từ bóng tối — và một người lạ xuất hiện...',
    '"Đặt cược đi... số phận thú vị hơn bạn nghĩ đấy."',
  ];

  const embed = new EmbedBuilder().setColor(0x2C3E50)
    .setTitle('👤 Nhân Vật Bí Ẩn')
    .setDescription(
      `*${pick(flavors)}*\n\n` +
      `> 🎲 **Cá cược 50 Gold** — rủi ro thấp, thắng nhỏ\n` +
      `> 🎰 **Cá cược 150 Gold** — rủi ro cao, thưởng lớn\n` +
      `> 🚶 **Bước đi** — không phải lúc này\n\n` +
      `🪙 Gold hiện tại: **${player.gold}**`
    );

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`myst_50_${userId}`).setLabel('Cá cược 50 Gold').setEmoji('🎲').setStyle(ButtonStyle.Primary).setDisabled(player.gold < 50),
    new ButtonBuilder().setCustomId(`myst_150_${userId}`).setLabel('Cá cược 150 Gold').setEmoji('🎰').setStyle(ButtonStyle.Danger).setDisabled(player.gold < 150),
    new ButtonBuilder().setCustomId(`myst_skip_${userId}`).setLabel('Bước đi').setEmoji('🚶').setStyle(ButtonStyle.Secondary)
  );

  const { embed: mystEmbed, files: mystFiles } = withImage(embed, 'mysterious');
  const reply = await interaction.editReply({ embeds: [mystEmbed], files: mystFiles, components: [row] });
  const btn   = await reply.awaitMessageComponent({
    componentType: ComponentType.Button, filter: i => i.user.id === userId, time: 30_000
  }).catch(() => null);

  await (btn?.deferUpdate() ?? Promise.resolve());
  const cid = btn?.customId ?? `myst_skip_${userId}`;

  if (cid === `myst_skip_${userId}` || !btn) {
    const skipReply = await interaction.editReply({ embeds: [simpleEmbed(COLORS.info, '🚶 "Có lẽ lần khác vậy..." Bóng người biến mất vào bóng tối.')], components: buildContinueExploreRow(userId) });
    attachContinueExploreHandler(skipReply, interaction, userId, guildId);
    return;
  }

  const bet  = cid === `myst_150_${userId}` ? 150 : 50;
  const roll = randInt(1, 100);
  spendGold(userId, guildId, bet);

  let title = '', desc = '';
  if (bet === 50) {
    if (roll <= 40) {       // Win: +100g
      grantGold(userId, guildId, 100);
      title = '🎉 Thắng!'; desc = `🪙 +**100 Gold** — "Khá đấy, người trẻ."`;
    } else if (roll <= 65) { // Item
      const item = pick(['health_potion','mana_potion','antidote']); addItem(userId, guildId, item);
      title = '🎁 Vật Phẩm!'; desc = `${getItem(item)?.icon} **${getItem(item)?.name}** — "Quà nhỏ cho kẻ liều lĩnh."`;
    } else if (roll <= 85) { // Break even
      grantGold(userId, guildId, 50);
      title = '🤝 Hòa'; desc = `Lấy lại **50 Gold** — "Lần này hòa, lần sau thì biết."`;
    } else {                  // Cursed
      const dmg = Math.floor(getPlayer(userId, guildId)!.max_hp * 0.1);
      const hp  = Math.max(1, getPlayer(userId, guildId)!.hp - dmg);
      updatePlayerHpMp(userId, guildId, hp, getPlayer(userId, guildId)!.mp);
      title = '💀 Nguyền Rủa!'; desc = `Mất **50 Gold** + −**${dmg} HP** — "Ký kèo với quỷ thì phải trả giá~"`;
    }
  } else { // 150g bet
    if (roll <= 25) {        // Big win
      grantGold(userId, guildId, 400);
      const skBook = pick(['book_fireball','book_iron_skin','book_shadow_step']); addItem(userId, guildId, skBook);
      title = '🌟 ĐẠI THẮNG!'; desc = `🪙 +**400 Gold** + ${getItem(skBook)?.icon} **${getItem(skBook)?.name}** — "Tuyệt vời! Bạn xứng đáng."`;
    } else if (roll <= 50) { // Good win
      grantGold(userId, guildId, 300);
      title = '🎉 Thắng Lớn!'; desc = `🪙 +**300 Gold** — "Vận may đang theo bạn hôm nay."`;
    } else if (roll <= 70) { // Small return
      grantGold(userId, guildId, 80);
      title = '😐 Thua Nhẹ'; desc = `Nhận lại **80 Gold** (mất 70) — "Tốt hơn không có gì."`;
    } else if (roll <= 88) { // Lose all
      title = '💸 Thua Trắng'; desc = `Mất **150 Gold** — "Ha! Cảm giác thế nào?"`;
    } else {                  // Catastrophe
      const dmg = Math.floor(getPlayer(userId, guildId)!.max_hp * 0.3);
      const hp  = Math.max(1, getPlayer(userId, guildId)!.hp - dmg);
      updatePlayerHpMp(userId, guildId, hp, getPlayer(userId, guildId)!.mp);
      title = '☠️ Thảm Họa!'; desc = `Mất **150 Gold** + −**${dmg} HP** — "*Cười điên* Đây mới là kết cục thú vị!"`;
    }
  }

  const mystResReply = await interaction.editReply({
    embeds: [new EmbedBuilder().setColor(0x2C3E50).setTitle(title).setDescription(desc)],
    components: buildContinueExploreRow(userId)
  });
  attachContinueExploreHandler(mystResReply, interaction, userId, guildId);
}

// ── Event: Ambush ─────────────────────────────────────────────────────────────
async function showAmbush(
  interaction: ChatInputCommandInteraction, userId: string, guildId: string, enemyId: string
): Promise<void> {
  const player = getPlayer(userId, guildId)!;
  const enemy  = getEnemy(enemyId)!;

  const firstStrikeDmg = Math.max(1, Math.floor(enemy.atk * 0.7) - player.def);

  const embed = new EmbedBuilder().setColor(COLORS.danger)
    .setTitle('⚡ PHỤC KÍCH!')
    .setDescription(
      `**${enemy.icon} ${enemy.name}** nhảy ra từ bóng tối — bạn không kịp phản ứng!\n\n` +
      `💥 Đòn tấn công đầu tiên sẽ gây khoảng **${firstStrikeDmg}** sát thương\n\n` +
      `> ⚔️ **Phản công ngay** — chiến đấu bình thường, nhưng bị đánh trước\n` +
      `> 🌑 **Cố né tránh (50%)** — nếu thành công, thoát đòn đầu`
    );

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`amb_fight_${userId}`).setLabel('Phản công ngay').setEmoji('⚔️').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`amb_dodge_${userId}`).setLabel('Cố né tránh (50%)').setEmoji('🌑').setStyle(ButtonStyle.Primary)
  );

  const { embed: ambushEmbed, files: ambushFiles } = withImage(embed, 'ambush');
  const reply = await interaction.editReply({ embeds: [ambushEmbed], files: ambushFiles, components: [row] });
  const btn   = await reply.awaitMessageComponent({
    componentType: ComponentType.Button, filter: i => i.user.id === userId, time: 25_000
  }).catch(() => null);

  await (btn?.deferUpdate() ?? Promise.resolve());

  if (!btn || btn.customId === `amb_fight_${userId}`) {
    // Take first hit, then combat
    const dmg   = Math.max(1, firstStrikeDmg);
    const newHp = Math.max(1, player.hp - dmg);
    updatePlayerHpMp(userId, guildId, newHp, player.mp);
    const fresh = getPlayer(userId, guildId)!;
    if (fresh.hp <= 0) {
      await interaction.editReply({ embeds: [simpleEmbed(COLORS.danger, `💥 Đòn phục kích quá mạnh! −${dmg} HP`)], components: [] });
      return;
    }
    await interaction.editReply({ embeds: [simpleEmbed(COLORS.warning, `💥 Dính đòn phục kích −**${dmg} HP**! (${newHp}/${player.max_hp})\nChiến đấu bắt đầu!`)], components: [] });
    await new Promise(r => setTimeout(r, 1200));
    await startCombatFlow(interaction, userId, guildId, enemyId, handleVictory, handleDeath);
  } else {
    // Try dodge
    const dodged = randInt(1, 100) <= 50;
    if (dodged) {
      await interaction.editReply({ embeds: [simpleEmbed(COLORS.success, `🌑 Bạn né được đòn phục kích! Chiến đấu bình thường bắt đầu!`)], components: [] });
      await new Promise(r => setTimeout(r, 1000));
      await startCombatFlow(interaction, userId, guildId, enemyId, handleVictory, handleDeath);
    } else {
      const dmg   = Math.max(1, Math.floor(firstStrikeDmg * 1.3)); // penalty for failed dodge
      const newHp = Math.max(1, player.hp - dmg);
      updatePlayerHpMp(userId, guildId, newHp, player.mp);
      await interaction.editReply({ embeds: [simpleEmbed(COLORS.danger, `❌ Né thất bại! −**${dmg} HP** (${newHp}/${player.max_hp})\nChiến đấu bắt đầu!`)], components: [] });
      await new Promise(r => setTimeout(r, 1200));
      await startCombatFlow(interaction, userId, guildId, enemyId, handleVictory, handleDeath);
    }
  }
}

// ── Event: Villager Rescue ────────────────────────────────────────────────────
async function showVillagerRescue(
  interaction: ChatInputCommandInteraction, userId: string, guildId: string,
  zoneEnemies: any[]
): Promise<void> {
  const player  = getPlayer(userId, guildId)!;
  const villagerFlavors = [
    'Tiếng kêu cứu vang lên từ sau bụi cây...',
    'Một người đàn ông đang bị dồn vào góc tường đá...',
    '"Ai đó cứu tôi với!" — giọng phụ nữ run rẩy vọng ra...',
  ];

  const banditEnemy = {
    id: 'bandit', name: 'Tên Cướp Đường', icon: '🗡️', level: Math.max(1, player.level - 1),
    hp: Math.floor(50 + player.level * 8), atk: Math.floor(8 + player.level * 1.5),
    def: Math.floor(3 + player.level * 0.5), expReward: Math.floor(30 + player.level * 5),
    goldMin: 15, goldMax: 35,
    drops: [{ itemId: 'health_potion', chance: 25 }],
    specialAttacks: ['backstab'], zones: [], boss: false,
    deathWorldFlag: undefined,
    lore: 'Tên cướp đường thường đánh vào kẻ yếu thế.'
  };

  const goldReward = randInt(30, 70);
  const embed = new EmbedBuilder().setColor(0xE67E22)
    .setTitle('👨‍👩‍👧 Dân Làng Gặp Nạn!')
    .setDescription(
      `*${pick(villagerFlavors)}*\n\n` +
      `Một **🗡️ Tên Cướp Đường** (Lv.${banditEnemy.level}) đang tấn công dân thường!\n\n` +
      `> ⚔️ **Cứu họ** — đánh tên cướp, nhận phần thưởng từ nạn nhân\n` +
      `> 🚶 **Bước qua** — không phải việc của mình`
    );

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`vil_save_${userId}`).setLabel('Cứu họ').setEmoji('⚔️').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`vil_skip_${userId}`).setLabel('Bước qua').setEmoji('🚶').setStyle(ButtonStyle.Secondary)
  );

  const { embed: vilEmbed, files: vilFiles } = withImage(embed, 'villager');
  const reply = await interaction.editReply({ embeds: [vilEmbed], files: vilFiles, components: [row] });
  const btn   = await reply.awaitMessageComponent({
    componentType: ComponentType.Button, filter: i => i.user.id === userId, time: 25_000
  }).catch(() => null);

  await (btn?.deferUpdate() ?? Promise.resolve());

  if (!btn || btn.customId === `vil_skip_${userId}`) {
    await interaction.editReply({
      embeds: [new EmbedBuilder().setColor(COLORS.info).setDescription('🚶 Bạn bước qua... tiếng kêu cứu dần tắt phía sau lưng.')],
      components: []
    });
    return;
  }

  // Fight the bandit — with reward if win
  await interaction.editReply({ embeds: [simpleEmbed(0xE67E22, '⚔️ Bạn xông vào cứu dân làng!')], components: [] });
  await new Promise(r => setTimeout(r, 800));
  // Mark that this combat gives bonus reward (we'll hook into victory flow via world flag hack)
  // Simpler: just do combat with inline enemy
  await startCombatFlowWithEnemy(interaction, userId, guildId, banditEnemy, {
    bonusGold: goldReward,
    bonusDesc: `👨‍👩‍👧 Dân làng cảm ơn bạn và trao **${goldReward} Gold**!`
  }, handleVictory, handleDeath);
}

// ── Event: Caravan Robbery ────────────────────────────────────────────────────
async function showCaravanRobbery(
  interaction: ChatInputCommandInteraction, userId: string, guildId: string,
  zoneEnemies: any[]
): Promise<void> {
  const player = getPlayer(userId, guildId)!;

  const guardEnemy = {
    id: 'caravan_guard', name: 'Vệ Sĩ Đoàn Thương', icon: '🛡️',
    level: player.level, hp: Math.floor(60 + player.level * 10),
    atk: Math.floor(10 + player.level * 2), def: Math.floor(8 + player.level),
    expReward: Math.floor(40 + player.level * 6), goldMin: 10, goldMax: 25,
    drops: [{ itemId: 'health_potion', chance: 30 }],
    specialAttacks: ['shield_bash'], zones: [], boss: false, deathWorldFlag: undefined,
    lore: 'Vệ sĩ bảo vệ đoàn thương nhân.'
  };
  const banditBossEnemy = {
    id: 'bandit_boss', name: 'Trùm Cướp', icon: '💀',
    level: player.level + 1, hp: Math.floor(80 + player.level * 12),
    atk: Math.floor(14 + player.level * 2.5), def: Math.floor(5 + player.level),
    expReward: Math.floor(60 + player.level * 8), goldMin: 30, goldMax: 60,
    drops: [{ itemId: 'health_potion', chance: 25 }, { itemId: 'mana_potion', chance: 20 }],
    specialAttacks: ['backstab','double_bite'], zones: [], boss: false, deathWorldFlag: undefined,
    lore: 'Trùm cướp có giá trên đầu từ lâu.'
  };

  const embed = new EmbedBuilder().setColor(0x8E44AD)
    .setTitle('🛒 Xe Chở Đồ Bị Cướp!')
    .setDescription(
      `Đoàn thương nhân đang bị bọn cướp tấn công giữa đường!\n\n` +
      `> ⚔️ **Giúp chủ xe** — đánh Trùm Cướp (Lv.${banditBossEnemy.level}), nhận thưởng lớn từ thương nhân\n` +
      `> 😈 **Giúp bọn cướp** — đánh Vệ Sĩ (Lv.${guardEnemy.level}), chia chác đồ cướp được\n` +
      `> 👁️ **Quan sát** — đứng xem, nhặt đồ rơi sau khi mọi chuyện xong`
    );

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`cara_help_${userId}`).setLabel('Giúp chủ xe').setEmoji('⚔️').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`cara_bandit_${userId}`).setLabel('Giúp bọn cướp').setEmoji('😈').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`cara_watch_${userId}`).setLabel('Quan sát').setEmoji('👁️').setStyle(ButtonStyle.Secondary)
  );

  const { embed: caraEmbed, files: caraFiles } = withImage(embed, 'caravan');
  const reply = await interaction.editReply({ embeds: [caraEmbed], files: caraFiles, components: [row] });
  const btn   = await reply.awaitMessageComponent({
    componentType: ComponentType.Button, filter: i => i.user.id === userId, time: 30_000
  }).catch(() => null);

  await (btn?.deferUpdate() ?? Promise.resolve());
  const cid = btn?.customId ?? `cara_watch_${userId}`;

  if (cid === `cara_watch_${userId}` || !btn) {
    // Spectate — random small loot
    const watchLoot = pick(['health_potion','herb','wolf_fang','bone_shard']);
    const watchGold = randInt(5, 20);
    addItem(userId, guildId, watchLoot, 1);
    grantGold(userId, guildId, watchGold);
    const it = getItem(watchLoot)!;
    const watchReply = await interaction.editReply({
      embeds: [
        new EmbedBuilder().setColor(COLORS.info)
          .setTitle('👁️ Quan Sát Từ Xa')
          .setDescription(
            `Cả hai bên hỗn chiến... rồi tản ra. Bạn nhặt được những thứ rơi lại:\n\n` +
            `${it.icon} **${it.name}** × 1  ·  🪙 +**${watchGold} Gold**`
          )
      ],
      components: buildContinueExploreRow(userId)
    });
    attachContinueExploreHandler(watchReply, interaction, userId, guildId);
    return;
  }

  if (cid === `cara_help_${userId}`) {
    await interaction.editReply({ embeds: [simpleEmbed(COLORS.success, '⚔️ Bạn xông vào giúp thương nhân!')], components: [] });
    await new Promise(r => setTimeout(r, 800));
    await startCombatFlowWithEnemy(interaction, userId, guildId, banditBossEnemy, {
      bonusGold: randInt(80, 150),
      bonusDesc: `🛒 Thương nhân trả ơn với **{gold} Gold** và hàng hóa!`,
      bonusItem: 'elixir'
    }, handleVictory, handleDeath);
  } else {
    await interaction.editReply({ embeds: [simpleEmbed(COLORS.danger, '😈 Bạn chọn đứng về phía bọn cướp...')], components: [] });
    await new Promise(r => setTimeout(r, 800));
    await startCombatFlowWithEnemy(interaction, userId, guildId, guardEnemy, {
      bonusGold: randInt(40, 80),
      bonusDesc: `💰 Chia chác chiến lợi phẩm: +**{gold} Gold** + đồ cướp được!`,
      bonusItem: pick(['health_potion','mana_potion','antidote'])
    }, handleVictory, handleDeath);
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function simpleEmbed(color: number, desc: string) {
  return new EmbedBuilder().setColor(color).setDescription(desc);
}

// ── Event: Soul Shop ──────────────────────────────────────────────────────
const SOUL_SHOP_ITEMS: Array<{
  id: string; name: string; icon: string; cost: number; desc: string;
  giveItem?: string; qty?: number;
}> = [
  { id: 'mat_chest',    name: 'Material Chest ngẫu nhiên', icon: '📦', cost: 1, desc: '2–4 material ngẫu nhiên', giveItem: 'material_chest', qty: 1 },
  { id: 'rand_book',    name: 'Skill Book ngẫu nhiên',      icon: '📚', cost: 3, desc: 'Skill book random (thường)', giveItem: '', qty: 1 },
  { id: 'soul_book',    name: 'Soul Skill Book',            icon: '💀', cost: 5, desc: 'Một trong 3 Soul Skill Book', giveItem: '', qty: 1 },
  { id: 'puri_stone',   name: 'Purification Stone',         icon: '💎', cost: 5, desc: 'Xóa toàn bộ debuff', giveItem: 'purification_stone', qty: 1 },
  { id: 'eq_box',       name: 'Cursed Equipment Box',       icon: '🎁', cost: 8, desc: 'Trang bị Rare+ ngẫu nhiên', giveItem: 'cursed_equipment_box', qty: 1 },
  { id: 'soul_anchor',  name: 'Soul Anchor',                icon: '⚓', cost: 10, desc: 'Sống sót 1 lần khi chết', giveItem: 'soul_anchor', qty: 1 },
  { id: 'leg_pendant',  name: 'Legacy Pendant',             icon: '📿', cost: 12, desc: '+50% gold từ Legacy', giveItem: 'legacy_pendant', qty: 1 },
];

const COMMON_BOOKS = ['book_fireball','book_ice_lance','book_shield_bash','book_shadow_step','book_mend_wounds','book_thunder_clap',
                      'book_iron_skin','book_berserker','book_mana_flow','book_vampiric','book_tough_body'];
const SOUL_BOOKS   = ['book_soul_strike','book_soul_guard','book_soul_drain'];

async function showSoulShop(
  interaction: ChatInputCommandInteraction, userId: string, guildId: string
): Promise<void> {
  const player = getPlayer(userId, guildId)!;
  const flavors = [
    '☁️ Một bóng hình mờ ảo xuất hiện, không nói một lời...',
    '💀 "Linh hồn có giá của nó... Muốn mua gì không?"',
    '🌑 Cửa hàng bóng tối, chỉ mở khi thế giới đang ngủ.',
  ];

  const itemLines = SOUL_SHOP_ITEMS.map(i =>
    `${i.icon} **${i.name}** — **${i.cost} 💀** Soul Shard\n> *${i.desc}*`
  ).join('\n');

  const embed = new EmbedBuilder()
    .setColor(COLORS.purple)
    .setTitle('💀 Soul Shop — Cửa Hàng Bóng Tối')
    .setDescription(`*${pick(flavors)}*\n\n${itemLines}\n\n💀 Soul Shards của bạn: **${player.soul_shards}**`);

  const options = SOUL_SHOP_ITEMS
    .filter(i => player.soul_shards >= i.cost)
    .map(i =>
      new StringSelectMenuOptionBuilder()
        .setLabel(`${i.name} — ${i.cost} 💀`)
        .setDescription(i.desc)
        .setValue(i.id)
        .setEmoji(i.icon)
    );

  const rows: ActionRowBuilder<any>[] = [];

  if (options.length) {
    rows.push(new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`soul_buy_${userId}`)
        .setPlaceholder('Mua với Soul Shard...')
        .addOptions(options)
    ));
  }

  rows.push(new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`soul_leave_${userId}`).setLabel('Rời đi').setEmoji('🚶').setStyle(ButtonStyle.Secondary)
  ));

  const reply = await interaction.editReply({ embeds: [embed], components: rows });

  const collector = reply.createMessageComponentCollector({
    filter: i => i.user.id === userId, time: 60_000
  });

  collector.on('collect', async (compInt) => {
    const deferred = await compInt.deferUpdate().then(() => true).catch(() => false);
    if (!deferred) return;

    const cid = (compInt as any).customId as string;
    collector.stop();

    if (cid === `soul_leave_${userId}`) {
      const leaveReply = await interaction.editReply({ embeds: [simpleEmbed(COLORS.info, '💀 *"Đến lần sau..."* Bóng hình tan biến.')], components: buildContinueExploreRow(userId) });
      attachContinueExploreHandler(leaveReply, interaction, userId, guildId);
      return;
    }

    if (cid === `soul_buy_${userId}`) {
      const sel     = compInt as StringSelectMenuInteraction;
      const itemKey = sel.values[0];
      const shopItem = SOUL_SHOP_ITEMS.find(i => i.id === itemKey);
      if (!shopItem) return;

      const freshP = getPlayer(userId, guildId)!;
      if (freshP.soul_shards < shopItem.cost) {
        await interaction.editReply({ embeds: [simpleEmbed(COLORS.warning, `❌ Không đủ Soul Shard (cần ${shopItem.cost}, có ${freshP.soul_shards})`)], components: [] });
        return;
      }

      // Deduct soul shards
      const { grantSoulShards: gss } = await import('../systems/player');
      gss(userId, guildId, -shopItem.cost);

      let result = '';
      if (itemKey === 'rand_book') {
        const book = pick(COMMON_BOOKS);
        addItem(userId, guildId, book, 1);
        const it = getItem(book)!;
        result = `${it.icon} **${it.name}**`;
      } else if (itemKey === 'soul_book') {
        const book = pick(SOUL_BOOKS);
        addItem(userId, guildId, book, 1);
        const it = getItem(book)!;
        result = `${it?.icon ?? '💀'} **${it?.name ?? book}** (Soul Skill!)`;
      } else if (itemKey === 'eq_box') {
        // Give a random rare+ equipment
        const { EQUIPMENT: EQ } = await import('../data/equipment');
        const rareEq = Object.values(EQ).filter(e => e.rarity === 'rare' || e.rarity === 'epic');
        const chosen = pick(rareEq);
        addItem(userId, guildId, chosen.id, 1);
        result = `${chosen.icon} **${chosen.name}** (${chosen.rarity})`;
      } else if (itemKey === 'mat_chest') {
        const mats = ['herb','wolf_fang','ancient_bark','bone_shard','ectoplasm','troll_hide'];
        const qty = randInt(2, 4);
        const picked: string[] = [];
        for (let i = 0; i < qty; i++) { const m = pick(mats); addItem(userId, guildId, m, 1); picked.push(m); }
        const distinct = [...new Set(picked)].map(m => getItem(m)?.name ?? m).join(', ');
        result = `📦 ${distinct}`;
      } else if (shopItem.giveItem) {
        addItem(userId, guildId, shopItem.giveItem, shopItem.qty ?? 1);
        const it = getItem(shopItem.giveItem);
        result = `${it?.icon ?? '✨'} **${it?.name ?? shopItem.giveItem}**`;
      }

      const afterP = getPlayer(userId, guildId)!;
      const resReply = await interaction.editReply({
        embeds: [
          new EmbedBuilder().setColor(COLORS.purple)
            .setTitle('💀 Soul Shop — Mua Thành Công')
            .setDescription(`−**${shopItem.cost} 💀** Soul Shard\nNhận được: ${result}\n\n💀 Còn lại: **${afterP.soul_shards}** Soul Shards`)
        ],
        components: buildContinueExploreRow(userId)
      });
      attachContinueExploreHandler(resReply, interaction, userId, guildId);
    }
  });

  collector.on('end', (_c, reason) => {
    if (reason === 'time') interaction.editReply({ components: [] }).catch(() => {});
  });
}
