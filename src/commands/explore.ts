import {
  SlashCommandBuilder, ChatInputCommandInteraction,
  EmbedBuilder, ButtonBuilder, ButtonStyle,
  ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder,
  ComponentType, ButtonInteraction, StringSelectMenuInteraction, Message
} from 'discord.js';
import {
  getPlayer, getLoadout, applyPassiveStats, incrementKills,
  grantGold, spendGold, killPlayer, grantExp, grantSoulShards,
  addItem, getInventory, getItemQty, removeItem, updatePlayerHpMp, setZone, adjustReputation,
  adjustWanted, getWantedLevel, getWantedTitle, adjustFaction,
  addPermanentStat, addKeepItemCharge, addExtraSkillSlot, improveDeathPenaltyReduction, addRebirthBlessing, addMerchantMercy
} from '../systems/player';
import { getCombatByUser, saveCombat, deleteCombat } from '../systems/combat';
import { startCombatFlow, startCombatFlowWithEnemy, startGroupCombatFlow } from '../systems/combatFlow';
import { startPartyCombatFlow } from '../systems/partyCombatFlow';
import { getPartyOf } from '../systems/party';
import { canExplore, exploreCooldownRemaining, setExploreCooldown } from '../systems/economy';
import { processVictoryRewards, processDeathPenalty } from '../systems/rewards';
import {
  logEvent, onBossKilled, isBossSlain, getDropBonus, getEnemyAtkBonus,
  getShopMarkup, getEffectiveShopMarkup, increaseShopMarkup, getShopkeeperThreatMultiplier, getShopkeeperRobberyCount, recordShopkeeperRobbery,
  increaseMerchantFear, adjustWorldDanger
} from '../systems/world';
import { awardAchievements } from '../systems/achievements';
import { createLegacy, pickLegacySkill, getLegaciesInZone, claimLegacy, getLegacy } from '../systems/legacy';
import {
  COLORS, buildCombatEmbed, buildCombatButtons, buildSkillSelectMenu,
  buildVictoryEmbed, buildDeathEmbed
} from '../utils/embeds';
import { getZone, ZONES, ZONE_ORDER } from '../data/zones';
import { ENEMIES, getEnemiesForZone, getBossForZone, getEnemy } from '../data/enemies';
import { getItem, ITEMS } from '../data/items';
import { getMaterial } from '../data/materials';
import { getEquipment, getZoneEquipment } from '../data/equipment';
import { incrementDaily } from './daily';
import { wearEquipment } from '../systems/equipment';
import { getSkill } from '../data/skills';
import { pick, randInt } from '../utils/format';
import { withImage } from '../utils/eventImages';
import { pickExploreEvent, runExploreEvent } from './exploreEvents';
import { updatePityCounters } from '../systems/pity';
import { consumeBuff } from '../systems/consumables';
import { showVillageShop, showVillageBlacksmith, showVillageTavern, showVillageBoard } from '../systems/village';
import { doGather } from './gather';
import { onlyUser } from '../utils/collectors';
import { incrementChapterObjective } from '../systems/chapter';

export const data = new SlashCommandBuilder()
  .setName('explore')
  .setDescription('Khám phá khu vực hiện tại');

// ─────────────────────────────────────────────────────────────────────────────
export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const deferred = await interaction.deferReply().then(() => true).catch((err) => {
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

async function ensurePlayerAlive(
  interaction: ChatInputCommandInteraction,
  userId: string,
  guildId: string
): Promise<boolean> {
  const player = getPlayer(userId, guildId);
  if (player?.alive) return true;

  await interaction.editReply({
    embeds: [simpleEmbed(
      COLORS.danger,
      `☠️ **${player?.name ?? 'Nhân vật'}** đã chết. Linh hồn đang chờ vòng chuyển sinh mới.\n\nDùng \`/start\` để tái sinh rồi mới có thể khám phá tiếp.`
    )],
    components: []
  }).catch(() => {});

  return false;
}

async function attachContinueExploreHandler(
  message: Message<boolean>,
  interaction: ChatInputCommandInteraction,
  userId: string,
  guildId: string
): Promise<void> {
  let processing = false;

  const collector = message.createMessageComponentCollector({
    filter: onlyUser(userId),
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

    if (!(await ensurePlayerAlive(interaction, userId, guildId))) {
      return;
    }

    if (i.customId === `continue_explore_${userId}`) {
      const p = getPlayer(userId, guildId)!;
      const z = getZone(p.zone_id)!;
      if (z.safe) {
        await showExploreMenu(interaction, userId, guildId);
      } else {
        await handleSearch(interaction, userId, guildId);
      }
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
export async function showExploreMenu(
  interaction: ChatInputCommandInteraction,
  userId: string, guildId: string
): Promise<void> {
  if (!(await ensurePlayerAlive(interaction, userId, guildId))) return;

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
    filter: onlyUser(userId),
    time: 90_000
  });

  collector.on('collect', async (i) => {
    const deferred = await i.deferUpdate().then(() => true).catch(() => false);
    if (!deferred) return;

    if (processing) return;
    processing = true;

    if (!(await ensurePlayerAlive(interaction, userId, guildId))) {
      await reply.edit({ components: [] }).catch(() => {});
      collector.stop('dead');
      return;
    }

    await reply.edit({ components: [] }).catch(() => {});
    collector.stop('action');

    const cid = (i as any).customId as string;

    if (cid === `ex_search_${userId}`) await handleSearch(interaction, userId, guildId);
    else if (cid === `ex_boss_${userId}`) await handleBoss(interaction, userId, guildId);
    else if (cid === `ex_zone_${userId}`) await handleZonePicker(interaction, userId, guildId);
    else if (cid.startsWith(`ex_travel_${userId}_`)) {
      const zoneId = cid.replace(`ex_travel_${userId}_`, '');
      await handleTravel(interaction, userId, guildId, zoneId);
    }
    // Village services
    else if (cid === `ex_gather_${userId}`)   await handleGather(interaction, userId, guildId);
    else if (cid === `vill_shop_${userId}`)   await handleVillageService(interaction, userId, guildId, 'shop');
    else if (cid === `vill_smith_${userId}`)  await handleVillageService(interaction, userId, guildId, 'smith');
    else if (cid === `vill_tavern_${userId}`) await handleVillageService(interaction, userId, guildId, 'tavern');
    else if (cid === `vill_board_${userId}`)  await handleVillageService(interaction, userId, guildId, 'board');
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
    new ButtonBuilder().setCustomId(`ex_zone_${userId}`)
      .setLabel('Zone').setEmoji('🗺️').setStyle(ButtonStyle.Secondary)
  );
  if (!isSafe) {
    // Non-village zones get a gather button
    row1.addComponents(
      new ButtonBuilder().setCustomId(`ex_gather_${userId}`)
        .setLabel('Thu thập').setEmoji('🌿').setStyle(ButtonStyle.Success)
    );
    return [row1];
  }

  const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`vill_shop_${userId}`)
      .setLabel('Cửa hàng').setEmoji('🏪').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`vill_smith_${userId}`)
      .setLabel('Lò rèn').setEmoji('⚒️').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`vill_tavern_${userId}`)
      .setLabel('Quán trọ').setEmoji('🍺').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`vill_board_${userId}`)
      .setLabel('Nhiệm vụ').setEmoji('📋').setStyle(ButtonStyle.Secondary)
  );
  return [row1, row2];
}

// ── Zone picker ───────────────────────────────────────────────────────────────
async function handleZonePicker(
  interaction: ChatInputCommandInteraction, userId: string, guildId: string
): Promise<void> {
  if (!(await ensurePlayerAlive(interaction, userId, guildId))) return;

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
      .addOptions(options.slice(0, 25))
  );

  const reply = await interaction.editReply({
    embeds: [new EmbedBuilder().setColor(COLORS.info).setTitle('🗺️ Di chuyển đến đâu?')],
    components: [row]
  });

  const sel = await reply.awaitMessageComponent({
    componentType: ComponentType.StringSelect,
    filter: onlyUser(userId),
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
  if (!(await ensurePlayerAlive(interaction, userId, guildId))) return;

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
  await showExploreMenu(interaction, userId, guildId);
}

// ── Village services hub ──────────────────────────────────────────────────────
async function handleVillageService(
  interaction: ChatInputCommandInteraction,
  userId: string, guildId: string,
  service: 'shop' | 'smith' | 'tavern' | 'board'
): Promise<void> {
  if (!(await ensurePlayerAlive(interaction, userId, guildId))) return;

  let backHandled = false;

  const runService = async () => {
    if (service === 'shop')   await showVillageShop(interaction, userId, guildId);
    else if (service === 'smith')  await showVillageBlacksmith(interaction, userId, guildId);
    else if (service === 'tavern') await showVillageTavern(interaction, userId, guildId);
    else if (service === 'board')  await showVillageBoard(interaction, userId, guildId);
  };

  await runService();

  // If the service cleared all components (e.g. user clicked back inside the service),
  // navigate immediately without waiting for a button that no longer exists.
  const msg = await interaction.fetchReply();
  const hasBackBtn = msg.components.some(row => {
    const comps = (row as any).components;
    return Array.isArray(comps) && comps.some((c: any) => c.customId === `vill_back_${userId}`);
  });

  if (!hasBackBtn) {
    if (!backHandled) await showExploreMenu(interaction, userId, guildId);
    return;
  }

  const back = await msg.awaitMessageComponent({
    filter: (i) => {
      if (i.user.id !== userId) { i.reply({ content: '❌ Đây không phải tương tác của bạn.', flags: 64 }).catch(() => {}); return false; }
      if (i.customId !== `vill_back_${userId}`) { i.deferUpdate().catch(() => {}); return false; }
      return true;
    },
    componentType: ComponentType.Button,
    time: 60_000
  }).catch(() => null);

  if (back && !backHandled) {
    backHandled = true;
    await back.deferUpdate();
    await showExploreMenu(interaction, userId, guildId);
  }
}

// ── Rest ──────────────────────────────────────────────────────────────────────
async function handleRest(
  interaction: ChatInputCommandInteraction, userId: string, guildId: string
): Promise<void> {
  if (!(await ensurePlayerAlive(interaction, userId, guildId))) return;

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

// ── Gather ────────────────────────────────────────────────────────────────────
async function handleGather(
  interaction: ChatInputCommandInteraction, userId: string, guildId: string
): Promise<void> {
  if (!(await ensurePlayerAlive(interaction, userId, guildId))) return;
  const player = getPlayer(userId, guildId)!;
  const { embed } = doGather(userId, guildId, player.name);
  const reply = await interaction.editReply({ embeds: [embed], components: buildContinueExploreRow(userId) });
  attachContinueExploreHandler(reply, interaction, userId, guildId);
}

// ── Search: random event ───────────────────────────────────────────────────────
async function handleSearch(
  interaction: ChatInputCommandInteraction, userId: string, guildId: string
): Promise<void> {
  if (!(await ensurePlayerAlive(interaction, userId, guildId))) return;

  const player = getPlayer(userId, guildId)!;
  const currentZone = getZone(player.zone_id)!;
  if (currentZone.safe) {
    await showExploreMenu(interaction, userId, guildId);
    return;
  }

  if (!canExplore(player)) {
    const remaining = exploreCooldownRemaining(player);
    const reply = await interaction.editReply({
      embeds: [simpleEmbed(COLORS.warning, `⏳ Hãy chờ **${remaining} giây** trước khi khám phá tiếp.`)],
      components: buildContinueExploreRow(userId)
    });
    attachContinueExploreHandler(reply, interaction, userId, guildId);
    return;
  }

  const zone     = getZone(player.zone_id)!;
  const enemies  = getEnemiesForZone(player.zone_id);
  const legacies = getLegaciesInZone(guildId, player.zone_id, 5);

  // Detect party trước khi cộng daily để leader khám phá cũng tính cho cả party.
  const party = getPartyOf(guildId, userId);
  const isPartyLeader = party?.leaderId === userId && (party?.memberIds.length ?? 0) > 1;
  const partyMemberIds = isPartyLeader ? party!.memberIds : undefined;

  if (partyMemberIds?.length) {
    for (const memberId of partyMemberIds) {
      incrementDaily(memberId, guildId, 'explore_count');
      incrementChapterObjective(memberId, guildId, 'explore_zone', { zoneId: player.zone_id });
    }
  } else {
    incrementDaily(userId, guildId, 'explore_count');
    incrementChapterObjective(userId, guildId, 'explore_zone', { zoneId: player.zone_id });
  }

  const startPartyCombat = async (enemyId: string) => {
    await startPartyCombatFlow(
      interaction, userId, guildId, partyMemberIds!, enemyId,
      async () => {
        const reply = await interaction.fetchReply() as Message<boolean>;
        await reply.edit({ components: buildContinueExploreRow(userId) }).catch(() => {});
        attachContinueExploreHandler(reply, interaction, userId, guildId);
      }
    );
  };

  // 25% chance of group encounter when zone has ≥2 non-boss enemies
  if (enemies.length >= 2 && Math.random() < 0.25) {
    setExploreCooldown(userId, guildId);
    if (isPartyLeader) {
      await startPartyCombat(pick(enemies).id);
    } else {
      const shuffled = [...enemies].sort(() => Math.random() - 0.5);
      const count = (enemies.length >= 3 && Math.random() < 0.4) ? 3 : 2;
      const groupIds = shuffled.slice(0, count).map(e => e.id);
      await startGroupCombatFlow(interaction, userId, guildId, groupIds, handleVictory, handleDeath, handleFlee);
    }
    return;
  }

  const hasCombat = enemies.length > 0;
  const hasLegacy = legacies.length > 0;

  const event = pickExploreEvent({ player, guildId, hasCombat, hasLegacy });
  updatePityCounters(userId, guildId, event);

  setExploreCooldown(userId, guildId);

  return runExploreEvent({
    event,
    interaction,
    userId,
    guildId,
    player,
    enemies,
    legacies,
    partyMemberIds,
    callbacks: {
      startCombat: isPartyLeader
        ? startPartyCombat
        : (enemyId: string) => startCombatFlow(interaction, userId, guildId, enemyId, handleVictory, handleDeath, handleFlee),
      handleFlee,
      showAmbush: () => showAmbush(interaction, userId, guildId, pick(enemies).id),
      showLegacyFind: () => showLegacyFind(interaction, userId, guildId, legacies),
      showMerchant: () => showMerchant(interaction, userId, guildId),
      showHealingSpring: () => showHealingSpring(interaction, userId, guildId),
      showTrap: () => showTrap(interaction, userId, guildId),
      showAncientAltar: () => showAncientAltar(interaction, userId, guildId),
      showMysteriousFigure: () => showMysteriousFigure(interaction, userId, guildId),
      showVillagerRescue: () => showVillagerRescue(interaction, userId, guildId, enemies),
      showCaravanRobbery: () => showCaravanRobbery(interaction, userId, guildId, enemies),
      showLootFind: () => showLootFind(interaction, userId, guildId),
      showSoulShop: () => showSoulShop(interaction, userId, guildId),
      showAbandonedCamp: () => showAbandonedCamp(interaction, userId, guildId),
      showLostPouch: () => showLostPouch(interaction, userId, guildId),
      showRuneStone: () => showRuneStone(interaction, userId, guildId),
      showTreasureChest: () => showTreasureChest(interaction, userId, guildId),
      showWanderingHealer: () => showWanderingHealer(interaction, userId, guildId),
      showSpiritTrial: () => showSpiritTrial(interaction, userId, guildId, enemies),
      buildContinueExploreRow,
      attachContinueExploreHandler,
      handleVictory,
      handleDeath
      
    }
  });
}

// ── Boss ───────────────────────────────────────────────────────────────────────
async function handleBoss(
  interaction: ChatInputCommandInteraction, userId: string, guildId: string
): Promise<void> {
  if (!(await ensurePlayerAlive(interaction, userId, guildId))) return;

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
    filter: onlyUser(userId),
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
  const player    = getPlayer(userId, guildId)!;
  const zoneMats: Record<string, string[]> = {
    village: ['healing_herb', 'wood', 'slime_core'],
    forest:  ['wood', 'leather', 'wolf_fang', 'healing_herb', 'slime_core'],
    shrine:  ['bone_shard', 'ancient_bone', 'mana_crystal', 'ectoplasm'],
    mines:   ['iron_ore', 'stone', 'troll_hide', 'burning_core', 'dark_wing'],
    wastes:  ['void_essence', 'shadow_essence', 'abyss_core', 'demon_seal'],
  };
  const lootPool  = [
    'health_potion', 'mana_potion', 'antidote',
    ...(zoneMats[player.zone_id] ?? ['healing_herb', 'wood']),
    ...(zoneMats[player.zone_id] ?? ['healing_herb', 'wood']),
  ];
  const itemId    = pick(lootPool);
  const item      = getItem(itemId) ?? getMaterial(itemId) ?? { icon: '⚙️', name: itemId, description: '' } as any;
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

async function showAbandonedCamp(
  interaction: ChatInputCommandInteraction, userId: string, guildId: string
): Promise<void> {
  const player = getPlayer(userId, guildId)!;
  const roll = randInt(1, 100);
  let title = '🏕️ Trại Bỏ Hoang';
  let desc = '*Bạn tìm thấy một đống lửa đã tắt và vài chiếc túi rách nằm quanh đó...*\n\n';

  if (roll <= 35) {
    const gold = randInt(12, 35);
    grantGold(userId, guildId, gold);
    desc += `🪙 Bạn lục được **${gold} Gold** dưới lớp tro.`;
  } else if (roll <= 70) {
    const itemId = pick(['health_potion', 'mana_potion', 'herb', 'antidote']);
    const item = getItem(itemId) ?? getMaterial(itemId);
    addItem(userId, guildId, itemId, 1);
    desc += `${item?.icon ?? '⚙️'} Bạn tìm thấy **${item?.name ?? itemId}** trong một túi đồ cũ.`;
  } else {
    const heal = Math.floor(player.max_hp * 0.18);
    const newHp = Math.min(player.max_hp, player.hp + heal);
    updatePlayerHpMp(userId, guildId, newHp, player.mp);
    desc += `🔥 Bạn nhóm lại đống lửa và nghỉ một lát. ❤️ +**${heal} HP** → ${newHp}/${player.max_hp}`;
  }

  const { embed, files } = withImage(new EmbedBuilder().setColor(COLORS.info).setTitle(title).setDescription(desc), 'loot');
  const reply = await interaction.editReply({ embeds: [embed], files, components: buildContinueExploreRow(userId) });
  attachContinueExploreHandler(reply, interaction, userId, guildId);
}

async function showLostPouch(
  interaction: ChatInputCommandInteraction, userId: string, guildId: string
): Promise<void> {
  const gold = randInt(25, 60);
  const embed = new EmbedBuilder().setColor(COLORS.gold)
    .setTitle('👝 Túi Tiền Bị Rơi')
    .setDescription(
      `Bạn thấy một túi tiền nhỏ mắc trên bụi cây. Bên trong có khoảng **${gold} Gold**.\n\n` +
      `Trên miệng túi có khắc ký hiệu của một đoàn buôn gần đây...`
    );

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`pouch_return_${userId}`).setLabel('Trả lại').setEmoji('🤝').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`pouch_keep_${userId}`).setLabel('Giữ lấy').setEmoji('🪙').setStyle(ButtonStyle.Danger)
  );

  const reply = await interaction.editReply({ embeds: [embed], components: [row] });
  const btn = await reply.awaitMessageComponent({ componentType: ComponentType.Button, filter: onlyUser(userId), time: 30_000 }).catch(() => null);
  const deferred = await btn?.deferUpdate().then(() => true).catch(() => false);

  if (!btn || !deferred || btn.customId === `pouch_return_${userId}`) {
    grantGold(userId, guildId, Math.floor(gold * 0.35));
    const rep = adjustReputation(userId, guildId, 8);
    const res = await interaction.editReply({
      embeds: [simpleEmbed(COLORS.success, `🤝 Bạn trả lại túi tiền. Chủ nhân cảm kích và tặng **${Math.floor(gold * 0.35)} Gold**.\nReputation: **${rep}**`)],
      components: buildContinueExploreRow(userId)
    });
    attachContinueExploreHandler(res, interaction, userId, guildId);
    return;
  }

  grantGold(userId, guildId, gold);
  const rep = adjustReputation(userId, guildId, -6);
  const res = await interaction.editReply({
    embeds: [simpleEmbed(COLORS.warning, `🪙 Bạn giữ lại túi tiền và nhận **${gold} Gold**.\nNhưng có người đã nhìn thấy... Reputation: **${rep}**`)],
    components: buildContinueExploreRow(userId)
  });
  attachContinueExploreHandler(res, interaction, userId, guildId);
}

async function showRuneStone(
  interaction: ChatInputCommandInteraction, userId: string, guildId: string
): Promise<void> {
  const player = getPlayer(userId, guildId)!;
  const embed = new EmbedBuilder().setColor(COLORS.purple)
    .setTitle('🔮 Phiến Đá Rune')
    .setDescription('*Một phiến đá cổ phát sáng yếu ớt. Những chữ khắc thay đổi theo nhịp thở của bạn.*\n\nBạn có muốn đọc nó không?');
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`rune_read_${userId}`).setLabel('Đọc rune').setEmoji('🔮').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`rune_skip_${userId}`).setLabel('Bỏ qua').setEmoji('🚶').setStyle(ButtonStyle.Secondary)
  );
  const { embed: imgEmbed, files } = withImage(embed, 'altar');
  const reply = await interaction.editReply({ embeds: [imgEmbed], files, components: [row] });
  const btn = await reply.awaitMessageComponent({ componentType: ComponentType.Button, filter: onlyUser(userId), time: 30_000 }).catch(() => null);
  const deferred = await btn?.deferUpdate().then(() => true).catch(() => false);

  if (!btn || !deferred || btn.customId === `rune_skip_${userId}`) {
    const res = await interaction.editReply({ embeds: [simpleEmbed(COLORS.info, '🚶 Bạn rời khỏi phiến đá trước khi nó kịp thì thầm tên bạn.')], components: buildContinueExploreRow(userId) });
    attachContinueExploreHandler(res, interaction, userId, guildId);
    return;
  }

  const roll = randInt(1, 100);
  if (roll <= 55) {
    const exp = Math.max(15, Math.floor(player.exp_next * 0.18));
    grantExp(userId, guildId, exp);
    const res = await interaction.editReply({ embeds: [simpleEmbed(COLORS.magic, `✨ Ký ức cổ xưa tràn vào tâm trí. +**${exp} EXP**.`)], components: buildContinueExploreRow(userId) });
    attachContinueExploreHandler(res, interaction, userId, guildId);
  } else {
    const dmg = Math.max(1, Math.floor(player.max_hp * 0.18));
    const newHp = Math.max(1, player.hp - dmg);
    updatePlayerHpMp(userId, guildId, newHp, player.mp);
    const res = await interaction.editReply({ embeds: [simpleEmbed(COLORS.danger, `💥 Rune phản phệ! Bạn mất **${dmg} HP** (${newHp}/${player.max_hp}).`)], components: buildContinueExploreRow(userId) });
    attachContinueExploreHandler(res, interaction, userId, guildId);
  }
}

async function showTreasureChest(
  interaction: ChatInputCommandInteraction, userId: string, guildId: string
): Promise<void> {
  const player = getPlayer(userId, guildId)!;
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`chest_open_${userId}`).setLabel('Mở rương').setEmoji('🗝️').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`chest_leave_${userId}`).setLabel('Bỏ qua').setEmoji('🚶').setStyle(ButtonStyle.Secondary)
  );
  const { embed, files } = withImage(new EmbedBuilder().setColor(COLORS.gold).setTitle('🧰 Rương Cũ').setDescription('*Một chiếc rương gỗ bị dây leo phủ kín. Khóa đã rỉ sét...*'), 'loot');
  const reply = await interaction.editReply({ embeds: [embed], files, components: [row] });
  const btn = await reply.awaitMessageComponent({ componentType: ComponentType.Button, filter: onlyUser(userId), time: 25_000 }).catch(() => null);
  const deferred = await btn?.deferUpdate().then(() => true).catch(() => false);

  if (!btn || !deferred || btn.customId === `chest_leave_${userId}`) {
    const res = await interaction.editReply({ embeds: [simpleEmbed(COLORS.info, '🚶 Bạn bỏ qua chiếc rương. Đôi khi tham lam không phải lựa chọn tốt.')], components: buildContinueExploreRow(userId) });
    attachContinueExploreHandler(res, interaction, userId, guildId);
    return;
  }

  const roll = randInt(1, 100);
  if (roll <= 25) {
    const dmg = Math.max(1, Math.floor(player.max_hp * 0.22));
    const newHp = Math.max(1, player.hp - dmg);
    updatePlayerHpMp(userId, guildId, newHp, player.mp);
    const res = await interaction.editReply({ embeds: [simpleEmbed(COLORS.danger, `💣 Rương có bẫy! Bạn mất **${dmg} HP** (${newHp}/${player.max_hp}).`)], components: buildContinueExploreRow(userId) });
    attachContinueExploreHandler(res, interaction, userId, guildId);
  } else if (roll <= 70) {
    const gold = randInt(20, 55);
    grantGold(userId, guildId, gold);
    const res = await interaction.editReply({ embeds: [simpleEmbed(COLORS.gold, `🪙 Trong rương có **${gold} Gold**.`)], components: buildContinueExploreRow(userId) });
    attachContinueExploreHandler(res, interaction, userId, guildId);
  } else {
    const itemId = pick(['elixir', 'health_potion', 'mana_potion', 'herb']);
    const item = getItem(itemId)!;
    addItem(userId, guildId, itemId, 1);
    const res = await interaction.editReply({ embeds: [simpleEmbed(COLORS.success, `${item.icon} Bạn tìm thấy **${item.name}** trong rương.`)], components: buildContinueExploreRow(userId) });
    attachContinueExploreHandler(res, interaction, userId, guildId);
  }
}

async function showWanderingHealer(
  interaction: ChatInputCommandInteraction, userId: string, guildId: string
): Promise<void> {
  const player = getPlayer(userId, guildId)!;
  const price = Math.max(10, Math.floor(18 + player.level * 4));
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`healer_pay_${userId}`).setLabel(`Trả ${price} Gold`).setEmoji('💚').setStyle(ButtonStyle.Success).setDisabled(player.gold < price),
    new ButtonBuilder().setCustomId(`healer_leave_${userId}`).setLabel('Rời đi').setEmoji('🚶').setStyle(ButtonStyle.Secondary)
  );
  const { embed, files } = withImage(new EmbedBuilder().setColor(COLORS.success).setTitle('💚 Tu Sĩ Lang Thang').setDescription(`Một tu sĩ đề nghị chữa trị cho bạn với giá **${price} Gold**.`), 'mysterious');
  const reply = await interaction.editReply({ embeds: [embed], files, components: [row] });
  const btn = await reply.awaitMessageComponent({ componentType: ComponentType.Button, filter: onlyUser(userId), time: 25_000 }).catch(() => null);
  const deferred = await btn?.deferUpdate().then(() => true).catch(() => false);

  if (!btn || !deferred || btn.customId !== `healer_pay_${userId}`) {
    const res = await interaction.editReply({ embeds: [simpleEmbed(COLORS.info, '🚶 Bạn cảm ơn tu sĩ rồi tiếp tục lên đường.')], components: buildContinueExploreRow(userId) });
    attachContinueExploreHandler(res, interaction, userId, guildId);
    return;
  }

  if (!spendGold(userId, guildId, price)) return;
  const hpGain = Math.floor(player.max_hp * 0.45);
  const mpGain = Math.floor(player.max_mp * 0.25);
  const newHp = Math.min(player.max_hp, player.hp + hpGain);
  const newMp = Math.min(player.max_mp, player.mp + mpGain);
  updatePlayerHpMp(userId, guildId, newHp, newMp);
  const res = await interaction.editReply({ embeds: [simpleEmbed(COLORS.success, `💚 Ánh sáng dịu bao phủ bạn.\n❤️ +**${hpGain} HP** → ${newHp}/${player.max_hp}\n💧 +**${mpGain} MP** → ${newMp}/${player.max_mp}`)], components: buildContinueExploreRow(userId) });
  attachContinueExploreHandler(res, interaction, userId, guildId);
}

async function showSpiritTrial(
  interaction: ChatInputCommandInteraction, userId: string, guildId: string, enemies: any[]
): Promise<void> {
  const player = getPlayer(userId, guildId)!;
  const enemyBase = pick(enemies);
  const trialEnemy = {
    ...enemyBase,
    id: `spirit_trial_${enemyBase.id}_${userId}_${Date.now()}`,
    name: `Ảo Ảnh ${enemyBase.name}`,
    icon: '👤',
    hp: Math.max(10, Math.floor(enemyBase.hp * 0.75)),
    atk: Math.max(1, Math.floor(enemyBase.atk * 0.75)),
    def: Math.max(0, Math.floor(enemyBase.def * 0.75)),
    boss: false,
    lore: 'Một thử thách linh hồn xuất hiện từ màn sương.'
  };

  const embed = new EmbedBuilder().setColor(COLORS.purple)
    .setTitle('👤 Thử Thách Linh Hồn')
    .setDescription(`Một ảo ảnh mang hình dạng **${enemyBase.name}** chắn đường. Nếu thắng, bạn nhận EXP và một ít Soul Shard.`);
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`trial_accept_${userId}`).setLabel('Chấp nhận').setEmoji('⚔️').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`trial_leave_${userId}`).setLabel('Rời đi').setEmoji('🚶').setStyle(ButtonStyle.Secondary)
  );
  const reply = await interaction.editReply({ embeds: [embed], components: [row] });
  const btn = await reply.awaitMessageComponent({ componentType: ComponentType.Button, filter: onlyUser(userId), time: 25_000 }).catch(() => null);
  const deferred = await btn?.deferUpdate().then(() => true).catch(() => false);
  if (!btn || !deferred || btn.customId !== `trial_accept_${userId}`) {
    const res = await interaction.editReply({ embeds: [simpleEmbed(COLORS.info, '🚶 Bạn không đáp lại lời thách đấu của linh hồn.')], components: buildContinueExploreRow(userId) });
    attachContinueExploreHandler(res, interaction, userId, guildId);
    return;
  }

  await startCombatFlowWithEnemy(
    interaction, userId, guildId, trialEnemy,
    { bonusGold: 0, bonusDesc: `\n💀 Linh hồn tan biến, để lại **1 Soul Shard** và một mảnh ký ức.`, bonusItem: undefined },
    async (int, btnInt, uid, gid, p, enemy, state) => {
      updatePlayerHpMp(uid, gid, state.player_hp, state.player_mp);
      const exp = Math.max(15, Math.floor(p.exp_next * 0.12));
      grantExp(uid, gid, exp);
      grantSoulShards(uid, gid, 1);
      const res = await btnInt.editReply({
        embeds: [new EmbedBuilder().setColor(COLORS.success).setTitle('👤 Vượt Qua Thử Thách').setDescription(`Bạn đánh bại **${enemy.name}**.\n⭐ +**${exp} EXP**\n💀 +**1 Soul Shard**`)],
        components: buildContinueExploreRow(uid)
      });
      attachContinueExploreHandler(btnInt.message, int, uid, gid);
    },
    handleDeath
  );
}


type MerchantStock = {
  itemIds: string[];
  equipmentIds: string[];
};

type MerchantItem = NonNullable<ReturnType<typeof getItem>>;
type MerchantEquipment = ReturnType<typeof getZoneEquipment>[number];

function shuffleStock<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function takeRandomStock<T>(items: T[], count: number): T[] {
  return shuffleStock(items).slice(0, Math.max(0, count));
}

function takeWeightedUnique<T>(
  items: T[],
  count: number,
  weightFn: (item: T) => number
): T[] {
  const pool = items
    .map(item => ({ item, weight: Math.max(0, weightFn(item)) }))
    .filter(x => x.weight > 0);

  const picked: T[] = [];
  while (picked.length < count && pool.length > 0) {
    const total = pool.reduce((sum, x) => sum + x.weight, 0);
    let roll = Math.random() * total;
    let index = 0;

    for (; index < pool.length; index++) {
      roll -= pool[index].weight;
      if (roll <= 0) break;
    }

    const [chosen] = pool.splice(Math.min(index, pool.length - 1), 1);
    picked.push(chosen.item);
  }

  return picked;
}

function uniqueIds(ids: string[]): string[] {
  return [...new Set(ids)];
}

function merchantPrice(basePrice: number, discount: number, markup: number): number {
  return Math.max(1, Math.floor(basePrice * Math.max(20, 100 - discount + markup) / 100));
}

function buildRandomMerchantStock(zoneId: string): MerchantStock {
  const zone = getZone(zoneId)!;
  const zoneIdx = Math.max(0, ZONE_ORDER.indexOf(zoneId));

  const commonConsumableIds = [
    'minor_healing_potion','healing_potion','emergency_potion','mana_flask','antidote','cooling_salve',
    'weapon_oil','armor_polish','hunter_meal','quickstep_tea','scroll_escape','scroll_detection',
    'strange_mushroom','suspicious_fish','fate_dice','bribe_coin'
  ];
  const buyableItems = uniqueIds([...zone.shopItems, ...commonConsumableIds])
    .map(id => getItem(id))
    .filter((item): item is MerchantItem => Boolean(item?.buyPrice));

  const consumables = buyableItems.filter(item => item.type === 'consumable');
  const skillBooks  = buyableItems.filter(item => item.type === 'skill_book');

  const itemStock: MerchantItem[] = [];

  // Luôn có ít nhất 1 đồ hồi phục/tiện ích, nhưng không bày toàn bộ shop.
  const consumableCount = Math.min(consumables.length, zoneIdx >= 3 ? randInt(2, 4) : randInt(1, 3));
  itemStock.push(...takeRandomStock(consumables, consumableCount));

  // Skill book mạnh nên chỉ xuất hiện đôi khi, tối đa 1 cuốn/lần gặp.
  const bookChance = zoneIdx === 0 ? 0.30 : zoneIdx <= 2 ? 0.40 : 0.50;
  if (skillBooks.length > 0 && Math.random() < bookChance) {
    itemStock.push(pick(skillBooks));
  }

  // Fallback để tránh shop trống nếu zone không có consumable buyPrice.
  if (itemStock.length === 0 && buyableItems.length > 0) {
    itemStock.push(pick(buyableItems));
  }

  const equipmentPool = getZoneEquipment(zoneId)
    .filter(eq => Boolean(eq.buyPrice))
    .filter(eq => {
      if (eq.rarity === 'common' || eq.rarity === 'rare') return true;
      if (eq.rarity === 'epic' && zoneIdx >= 3) return true;
      if (eq.rarity === 'legendary' && zoneIdx >= 4) return true;
      return false;
    });

  const equipmentCount = Math.min(
    equipmentPool.length,
    zoneIdx === 0 ? 1 : Math.random() < 0.75 ? 1 : 2
  );

  const equipmentStock = takeWeightedUnique<MerchantEquipment>(
    equipmentPool,
    equipmentCount,
    eq => {
      if (eq.rarity === 'common') return 100;
      if (eq.rarity === 'rare') return zoneIdx <= 0 ? 0 : 30;
      return 0;
    }
  );

  return {
    itemIds: uniqueIds(itemStock.map(item => item.id)),
    equipmentIds: uniqueIds(equipmentStock.map(eq => eq.id))
  };
}

// ── Merchant encounter ────────────────────────────────────────────────────────
async function showMerchant(
  interaction: ChatInputCommandInteraction, userId: string, guildId: string
): Promise<void> {
  const player = getPlayer(userId, guildId)!;
  const zone   = getZone(player.zone_id)!;

  const { getShopDiscount } = await import('../systems/world');
  const fakeId = consumeBuff(userId, guildId, 'fake_identity');
  const discount = getShopDiscount(guildId) + (fakeId ? 10 : 0);
  const markup = getEffectiveShopMarkup(guildId);

  const stock = buildRandomMerchantStock(zone.id);
  await renderMerchantBuy(interaction, userId, guildId, zone.id, discount, markup, player.gold, stock);
}

async function renderMerchantBuy(
  interaction: ChatInputCommandInteraction,
  userId: string, guildId: string, zoneId: string,
  discount: number, markup: number, playerGold: number, stock: MerchantStock
): Promise<void> {
  const zone  = getZone(zoneId)!;

  const shopItems = stock.itemIds
    .map(id => getItem(id))
    .filter((item): item is MerchantItem => Boolean(item?.buyPrice));

  // Random equipment stock for this merchant encounter.
  const eqItems = stock.equipmentIds
    .map(id => getEquipment(id))
    .filter((eq): eq is MerchantEquipment => Boolean(eq?.buyPrice));

  const itemLines = [
    ...shopItems.map(item => {
      if (!item.buyPrice) return '';
      const price = merchantPrice(item.buyPrice, discount, markup);
      return `${item.icon} **${item.name}** — **${price}** 🪙`;
    }),
    eqItems.length ? '\n⚔️ **Trang bị:**' : '',
    ...eqItems.map(eq => {
      const price = merchantPrice(eq.buyPrice!, discount, markup);
      const statsStr = Object.entries(eq.stats).map(([k,v]) => `+${v} ${k}`).join(', ');
      return `${eq.icon} **${eq.name}** (${statsStr}) — **${price}** 🪙`;
    })
  ].filter(Boolean).join('\n');

  const discountNote = [
    discount > 0 ? `🛒 Giảm giá **${discount}%** đang có!` : '',
    markup > 0 ? `⚠️ Giá shop đang bị tăng **${markup}%** vì thương nhân bị cướp.` : ''
  ].filter(Boolean).join('\n> ');
  const priceNote = discountNote ? `\n> ${discountNote}\n` : '';

  const embed = new EmbedBuilder()
    .setColor(COLORS.gold)
    .setTitle('🛒 Lái Buôn Lữ Hành!')
    .setDescription(
      `*Một lái buôn xuất hiện từ sau cây...*\n` +
      `📦 Kho hàng hôm nay là **ngẫu nhiên**. Hàng hiếm xuất hiện ít, không phải lúc nào cũng có.\n` +
      priceNote + '\n' + (itemLines || '*Hôm nay lái buôn không có gì đáng mua.*') + `\n\n🪙 Gold của bạn: **${playerGold}**`
    );

  const allBuyOptions = [
    ...shopItems.filter(i => i.buyPrice).map(i => {
      const price = merchantPrice(i.buyPrice!, discount, markup);
      return new StringSelectMenuOptionBuilder()
        .setLabel(`${i.name} — ${price} 🪙`)
        .setDescription(i.description.replace(/\*\*/g, '').slice(0, 50))
        .setValue(`buy_${i.id}`)
        .setEmoji(i.icon);
    }),
    ...eqItems.map(eq => {
      const price = merchantPrice(eq.buyPrice!, discount, markup);
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
    new ButtonBuilder().setCustomId(`merch_rob_${userId}`).setLabel('Cướp shopkeeper').setEmoji('🗡️').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`merch_leave_${userId}`).setLabel('Rời đi').setEmoji('🚶').setStyle(ButtonStyle.Secondary)
  ));

  const { embed: merchEmbed, files: merchFiles } = withImage(embed, 'merchant');
  const reply = await interaction.editReply({ embeds: [merchEmbed], files: merchFiles, components: rows });

  const collector = reply.createMessageComponentCollector({
    filter: onlyUser(userId),
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
      await renderMerchantSell(interaction, userId, guildId, zoneId, discount, markup, stock);

    } else if (cid === `merch_rob_${userId}`) {
      collector.stop();
      await renderShopkeeperRobPrompt(interaction, userId, guildId, zoneId, stock);

    } else if (cid === `merch_buy_${userId}`) {
      const sel = compInt as StringSelectMenuInteraction;
      const rawVal  = sel.values[0];
      const isBuyEq = rawVal.startsWith('buyeq_');
      const itemId  = rawVal.replace('buyeq_', '').replace('buy_', '');
      const fresh   = getPlayer(userId, guildId)!;

      let price = 0;
      let displayName = '';

      if (isBuyEq) {
        if (!stock.equipmentIds.includes(itemId)) return;
        const eq = getEquipment(itemId);
        if (!eq?.buyPrice) return;
        price = merchantPrice(eq.buyPrice, discount, markup);
        displayName = `${eq.icon} ${eq.name}`;
      } else {
        if (!stock.itemIds.includes(itemId)) return;
        const item = getItem(itemId);
        if (!item?.buyPrice) return;
        price = merchantPrice(item.buyPrice, discount, markup);
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
      if (isBuyEq) stock.equipmentIds = stock.equipmentIds.filter(id => id !== itemId);
      else stock.itemIds = stock.itemIds.filter(id => id !== itemId);

      const updatedPlayer = getPlayer(userId, guildId)!;
      await interaction.editReply({
        embeds: [
          new EmbedBuilder().setColor(COLORS.gold)
            .setTitle('🛒 Lái Buôn Lữ Hành!')
            .setDescription(
              `✅ Đã mua **${displayName}** — −${price} 🪙\n` +
              priceNote + '\n' + itemLines + `\n\n🪙 Gold còn lại: **${updatedPlayer.gold}**`
            )
        ]
      });
    }
  });

  collector.on('end', (_c, reason) => {
    if (reason === 'time') {
      interaction.editReply({
        embeds: [simpleEmbed(COLORS.info, '🚶 Lái buôn đã rời đi.')],
        components: buildContinueExploreRow(userId)
      }).then(r => attachContinueExploreHandler(r, interaction, userId, guildId)).catch(() => {});
    }
  });
}

async function renderMerchantSell(
  interaction: ChatInputCommandInteraction,
  userId: string, guildId: string, zoneId: string, discount: number, markup: number, stock: MerchantStock
): Promise<void> {
  const player    = getPlayer(userId, guildId)!;
  const inventory = getInventory(userId, guildId);
  const sellable  = inventory
    .map(e => ({ entry: e, item: getItem(e.item_id) ?? getMaterial(e.item_id) }))
    .filter(({ item }) => item?.sellPrice && (item as any).type !== 'key_item');

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
      componentType: ComponentType.Button, filter: onlyUser(userId), time: 20_000
    }).catch(() => null);
    if (btn) {
      const deferred = await btn.deferUpdate().then(() => true).catch(() => false);
      if (deferred) {
        const fresh = getPlayer(userId, guildId)!;
        await renderMerchantBuy(interaction, userId, guildId, zoneId, discount, markup, fresh.gold, stock);
      }
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
        .addOptions(options.slice(0, 25))
    ),
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId(`merch_sellback_${userId}`).setLabel('Quay lại shop').setEmoji('↩️').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`merch_sellleave_${userId}`).setLabel('Rời đi').setEmoji('🚶').setStyle(ButtonStyle.Secondary)
    )
  ];

  const { embed: sellEmbed, files: sellFiles } = withImage(embed, 'merchant');
  const reply = await interaction.editReply({ embeds: [sellEmbed], files: sellFiles, components: rows });

  const collector = reply.createMessageComponentCollector({
    filter: onlyUser(userId), time: 60_000
  });

  collector.on('collect', async (compInt) => {
    const deferred = await compInt.deferUpdate().then(() => true).catch(() => false);
    if (!deferred) return;

    const cid = (compInt as any).customId as string;

    if (cid === `merch_sellback_${userId}`) {
      collector.stop();
      const fresh = getPlayer(userId, guildId)!;
      await renderMerchantBuy(interaction, userId, guildId, zoneId, discount, markup, fresh.gold, stock);
    } else if (cid === `merch_sellleave_${userId}`) {
      collector.stop();
      const leaveReply = await interaction.editReply({ embeds: [simpleEmbed(COLORS.info, '🚶 Bạn vẫy tay chào lái buôn và bước đi.')], components: buildContinueExploreRow(userId) });
      attachContinueExploreHandler(leaveReply, interaction, userId, guildId);
    } else if (cid === `merch_sellitem_${userId}`) {
      const sel    = compInt as StringSelectMenuInteraction;
      const itemId = sel.values[0].replace('sell_', '');
      const item   = getItem(itemId) ?? getMaterial(itemId);
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
                .filter(Boolean).slice(0, 25) as any[]
            )
        ]
      });
    }
  });

  collector.on('end', (_c, reason) => {
    if (reason === 'time') {
      interaction.editReply({
        embeds: [simpleEmbed(COLORS.info, '🚶 Lái buôn đã rời đi.')],
        components: buildContinueExploreRow(userId)
      }).then(r => attachContinueExploreHandler(r, interaction, userId, guildId)).catch(() => {});
    }
  });
}

function formatMerchantStock(stock: MerchantStock): string {
  const itemLines = stock.itemIds
    .map(id => getItem(id))
    .filter(Boolean)
    .map(item => `${item!.icon} ${item!.name}`);
  const gearLines = stock.equipmentIds
    .map(id => getEquipment(id))
    .filter(Boolean)
    .map(eq => `${eq!.icon} ${eq!.name}`);
  const lines = [...itemLines, ...gearLines];
  return lines.length ? lines.join('\n') : '*Không còn hàng để cướp.*';
}

function buildShopkeeperEnemy(player: any, zoneId: string, stock: MerchantStock, multiplier: number, wantedLevel = 0, merchantFear = 0) {
  const zoneIdx = Math.max(0, ZONE_ORDER.indexOf(zoneId));
  const stockCount = stock.itemIds.length + stock.equipmentIds.length;
  const pressure = 1 + wantedLevel * 0.12 + merchantFear / 250;
  const hp = Math.floor((Math.max(120, player.max_hp * 1.25) + zoneIdx * 45 + stockCount * 10) * multiplier * pressure);
  const atk = Math.floor((Math.max(12, player.atk + 7) + zoneIdx * 4 + stockCount) * multiplier * pressure);
  const def = Math.floor((Math.max(5, player.def + 3) + zoneIdx * 2 + Math.floor(stockCount / 2)) * multiplier * pressure);

  return {
    id: `shopkeeper_${player.user_id}_${Date.now()}`,
    name: wantedLevel >= 4 ? 'Merchant Guardian' : multiplier > 1 ? 'Veteran Shopkeeper' : 'Shopkeeper',
    icon: wantedLevel >= 4 ? '🛡️' : multiplier > 1 ? '🛡️' : '🧔',
    level: Math.max(1, player.level + zoneIdx + wantedLevel + (multiplier > 1 ? 3 : 1)),
    hp, atk, def,
    boss: false,
    lore: 'Một lái buôn không hề yếu như vẻ ngoài.',
    isShopkeeper: true,
    shopStock: { itemIds: [...stock.itemIds], equipmentIds: [...stock.equipmentIds] },
    shopStockUsed: false
  };
}

async function renderShopkeeperRobPrompt(
  interaction: ChatInputCommandInteraction, userId: string, guildId: string, zoneId: string, stock: MerchantStock
): Promise<void> {
  const multiplier = getShopkeeperThreatMultiplier(guildId, userId);
  const wanted = getWantedLevel(userId, guildId);
  const wantedText = getWantedTitle(wanted);
  const robberyCount = getShopkeeperRobberyCount(guildId, userId);
  const memoryLine = robberyCount > 0
    ? `\n\n🧠 *"Lại là ngươi...? Ta đã chuẩn bị rồi."*`
    : '';
  const embed = new EmbedBuilder()
    .setColor(COLORS.danger)
    .setTitle('🗡️ Cướp Shopkeeper?')
    .setDescription(
      `Bạn đặt tay lên vũ khí. Lái buôn lùi lại, nhưng ánh mắt hắn không hề sợ hãi.\n\n` +
      `Nếu giết được hắn, bạn sẽ cướp được **hàng còn lại trong shop hiện tại**:\n${formatMerchantStock(stock)}\n\n` +
      `⚠️ Hậu quả:\n` +
      `• Reputation của bạn giảm mạnh.\n` +
      `• Giá shop toàn thế giới tăng thêm **10%**.\n` +
      `• Sau khi từng giết shopkeeper, lần cướp sau shopkeeper sẽ có **x2 stats**.\n` +
      `• Khi còn **50% HP**, shopkeeper sẽ dùng sạch hàng đang bán để hồi máu/tăng stats.\n\n` +
      `📜 Wanted hiện tại: **${wanted}/5 — ${wantedText}**` + memoryLine + `\n` +
      (multiplier > 1 ? `🛡️ **Shopkeeper lần này đã cảnh giác: x2 stats.**` : `Bạn chưa từng giết shopkeeper, hắn vẫn chưa gọi vệ sĩ.`)
    );

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`rob_confirm_${userId}`).setLabel('Tấn công').setEmoji('🗡️').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`rob_cancel_${userId}`).setLabel('Thôi').setEmoji('🚶').setStyle(ButtonStyle.Secondary)
  );

  const reply = await interaction.editReply({ embeds: [embed], components: [row] });
  const btn = await reply.awaitMessageComponent({ componentType: ComponentType.Button, filter: onlyUser(userId), time: 30_000 }).catch(() => null);
  const deferred = await btn?.deferUpdate().then(() => true).catch(() => false);

  if (!btn || !deferred || btn.customId !== `rob_confirm_${userId}`) {
    const res = await interaction.editReply({ embeds: [simpleEmbed(COLORS.info, '🚶 Bạn hạ tay khỏi vũ khí. Lái buôn nhìn bạn thêm vài giây rồi tiếp tục dọn hàng.')], components: buildContinueExploreRow(userId) });
    attachContinueExploreHandler(res, interaction, userId, guildId);
    return;
  }

  await startShopkeeperCombat(interaction, userId, guildId, zoneId, stock);
}

async function startShopkeeperCombat(
  interaction: ChatInputCommandInteraction, userId: string, guildId: string, zoneId: string, stock: MerchantStock
): Promise<void> {
  const player = getPlayer(userId, guildId)!;
  const multiplier = getShopkeeperThreatMultiplier(guildId, userId);
  const enemy = buildShopkeeperEnemy(player, zoneId, stock, multiplier, getWantedLevel(userId, guildId), (await import('../systems/world')).getMerchantFear(guildId));
  (enemy as any).onMercy = handleShopkeeperMercyChoice;

  await startCombatFlowWithEnemy(
    interaction, userId, guildId, enemy,
    undefined,
    handleShopkeeperVictory,
    handleDeath
  );
}


async function handleShopkeeperMercyChoice(
  interaction: ChatInputCommandInteraction, btnInt: ButtonInteraction,
  userId: string, guildId: string, player: any, enemy: any, state: any, cid: string
): Promise<void> {
  updatePlayerHpMp(userId, guildId, state.player_hp, state.player_mp);
  const stock: MerchantStock = enemy.shopStock ?? { itemIds: [], equipmentIds: [] };
  const drops = [...(stock.itemIds ?? []), ...(stock.equipmentIds ?? [])];

  if (cid === `shopmercy_spare_${userId}`) {
    const rep = adjustReputation(userId, guildId, 12);
    const wanted = adjustWanted(userId, guildId, -1);
    const merchantFaction = adjustFaction(userId, guildId, 'merchants', 10);
    logEvent(guildId, userId, player.name, 'shopkeeper_mercy', `${player.name} đã tha mạng shopkeeper.`, player.zone_id);
    const embed = new EmbedBuilder().setColor(COLORS.success)
      .setTitle('🙏 Tha Mạng Shopkeeper')
      .setDescription(
        `Bạn hạ vũ khí xuống. Shopkeeper ôm lấy vết thương rồi biến mất vào màn sương.

` +
        `🤝 Reputation: **${rep}** (+12)
` +
        `📜 Wanted: **${wanted}/5** (-1)
` +
        `🏛️ Hội Thương Nhân: **${merchantFaction}** (+10)
` +
        `*Hắn sẽ nhớ lòng thương xót này.*`
      );
    await btnInt.editReply({ embeds: [embed], components: buildContinueExploreRow(userId) });
    attachContinueExploreHandler(btnInt.message, interaction, userId, guildId);
    return;
  }

  if (cid === `shopmercy_take_${userId}`) {
    const takeCount = Math.min(drops.length, randInt(1, 2));
    const taken = drops.slice(0, takeCount);
    for (const id of taken) addItem(userId, guildId, id, 1);
    const rep = adjustReputation(userId, guildId, -12);
    const wanted = adjustWanted(userId, guildId, 1);
    const merchantFaction = adjustFaction(userId, guildId, 'merchants', -12);
    logEvent(guildId, userId, player.name, 'shopkeeper_extortion', `${player.name} ép shopkeeper giao nộp hàng.`, player.zone_id);
    const dropText = taken.length ? taken.map(id => {
      const item = getItem(id); const eq = getEquipment(id);
      return `${item?.icon ?? eq?.icon ?? '🎁'} **${item?.name ?? eq?.name ?? id}**`;
    }).join('\n') : '*Shopkeeper không còn gì để giao nộp.*';
    const embed = new EmbedBuilder().setColor(COLORS.warning)
      .setTitle('💰 Ép Giao Nộp Hàng')
      .setDescription(
        `Bạn ép shopkeeper nộp hàng rồi để hắn sống.\n\n` +
        `📦 **Nhận được:**\n${dropText}\n\n` +
        `🤝 Reputation: **${rep}** (-12)\n` +
        `📜 Wanted: **${wanted}/5** (+1)\n` +
        `🏛️ Hội Thương Nhân: **${merchantFaction}** (-12)`
      );
    await btnInt.editReply({ embeds: [embed], components: buildContinueExploreRow(userId) });
    attachContinueExploreHandler(btnInt.message, interaction, userId, guildId);
    return;
  }

  // Kết liễu khi shopkeeper đã van xin: nhận toàn bộ hàng còn lại nhưng phạt nặng hơn.
  enemy.shopStock = stock;
  await handleShopkeeperVictory(interaction, btnInt, userId, guildId, player, enemy, state);
}

async function handleShopkeeperVictory(
  interaction: ChatInputCommandInteraction, btnInt: ButtonInteraction,
  userId: string, guildId: string, player: any, enemy: any,
  state: any
): Promise<void> {
  updatePlayerHpMp(userId, guildId, state.player_hp, state.player_mp);
  incrementKills(userId, guildId);

  const stock: MerchantStock = enemy.shopStock ?? { itemIds: [], equipmentIds: [] };
  const drops = [...(stock.itemIds ?? []), ...(stock.equipmentIds ?? [])];
  for (const id of drops) addItem(userId, guildId, id, 1);

  const rep = adjustReputation(userId, guildId, -30);
  const wanted = adjustWanted(userId, guildId, 1);
  const merchantFaction = adjustFaction(userId, guildId, 'merchants', -25);
  adjustFaction(userId, guildId, 'shadow_court', 8);
  const markup = increaseShopMarkup(guildId, 10, 75);
  const fear = increaseMerchantFear(guildId, 12);
  const danger = adjustWorldDanger(guildId, 5);
  const robberyCount = recordShopkeeperRobbery(guildId, userId);
  logEvent(guildId, userId, player.name, 'shopkeeper_robbery', `${player.name} đã giết một shopkeeper. Wanted ${wanted}/5, giá shop +${markup}%, reputation ${rep}.`, player.zone_id);

  const dropText = drops.length
    ? drops.map(id => {
        const item = getItem(id);
        const eq = getEquipment(id);
        return `${item?.icon ?? eq?.icon ?? '🎁'} **${item?.name ?? eq?.name ?? id}**`;
      }).join('\n')
    : '*Shopkeeper đã dùng sạch hàng khi còn 50% HP, không còn gì để cướp.*';

  const embed = new EmbedBuilder()
    .setColor(COLORS.danger)
    .setTitle('🗡️ Shopkeeper đã ngã xuống')
    .setDescription(
      `Bạn lục soát quầy hàng đổ nát.\n\n` +
      `📦 **Đồ cướp được:**\n${dropText}\n\n` +
      `🤝 Reputation: **${rep}** (**−30**)\n` +
      `📜 Wanted: **${wanted}/5 — ${getWantedTitle(wanted)}** (**+1**)\n` +
      `🏛️ Hội Thương Nhân: **${merchantFaction}** (**−25**)\n` +
      `🛒 Giá shop toàn thế giới: **+${markup}%** · 🏦 Fear **${fear}%** · ⚠️ Danger **${danger}%**\n` +
      `🛡️ Lần cướp shopkeeper sau: **x2 stats**${robberyCount > 1 ? ` *(đây là lần ${robberyCount})*` : ''}`
    );

  await btnInt.editReply({ embeds: [embed], components: buildContinueExploreRow(userId) });
  attachContinueExploreHandler(btnInt.message, interaction, userId, guildId);
}

async function handleVictory(
  interaction: ChatInputCommandInteraction, btnInt: ButtonInteraction,
  userId: string, guildId: string, player: any, enemy: any,
  state: any
): Promise<void> {
  updatePlayerHpMp(userId, guildId, state.player_hp, state.player_mp);

  // Group combat: reward for each enemy in the group
  const groupEnemies: any[] | undefined = enemy._groupEnemies;
  let rewards;
  if (groupEnemies && groupEnemies.length > 0) {
    const freshPlayer = { ...player };
    const first = processVictoryRewards(userId, guildId, freshPlayer, groupEnemies[0]);
    const combined = { ...first };
    for (let i = 1; i < groupEnemies.length; i++) {
      const r = processVictoryRewards(userId, guildId, freshPlayer, groupEnemies[i]);
      combined.gold += r.gold;
      combined.exp += r.exp;
      combined.drops = [...combined.drops, ...r.drops];
      if (r.leveledUp) { combined.leveledUp = true; combined.newLevel = r.newLevel; }
    }
    rewards = combined;
  } else {
    rewards = processVictoryRewards(userId, guildId, player, enemy);
  }

  const bonus = (enemy as any).combatBonus;
  if (bonus) {
    grantGold(userId, guildId, bonus.bonusGold);
    if (bonus.bonusItem) addItem(userId, guildId, bonus.bonusItem, 1);
    rewards.bonusDescription += '\n\n' + bonus.bonusDesc.replace('{gold}', String(bonus.bonusGold));
  }

  if ((enemy as any).chapterRescue) {
    incrementChapterObjective(userId, guildId, 'rescue_villager', { zoneId: player.zone_id, enemyId: enemy.id });
  }

  const displayName = groupEnemies
    ? groupEnemies.map((e: any) => `${e.icon} ${e.name}`).join(', ')
    : enemy.name;
  const displayIcon = groupEnemies ? '⚔️' : enemy.icon;

  const embed = buildVictoryEmbed(
    player.name, displayName, displayIcon,
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

async function handleFlee(
  interaction: ChatInputCommandInteraction,
  btnInt: ButtonInteraction,
  userId: string,
  guildId: string,
  player: any,
  enemy: any,
  state: any,
  logLines: string[] = []
): Promise<void> {
  updatePlayerHpMp(userId, guildId, state.player_hp, state.player_mp);

  const summary = logLines.slice(-3).join('\n') || '✅ Bạn đã thoát khỏi trận chiến.';

  await btnInt.editReply({
    embeds: [
      simpleEmbed(
        COLORS.warning,
        `${summary}\n\n🚶 Bạn rút lui để giữ mạng. Có thể tiếp tục khám phá khi đã sẵn sàng.`
      )
    ],
    files: [],
    components: buildContinueExploreRow(userId)
  }).catch(() => {});

  attachContinueExploreHandler(btnInt.message as any, interaction, userId, guildId);
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
    components: []
  });
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
      componentType: ComponentType.Button, filter: onlyUser(userId), time: 25_000
    }).catch(() => null);

    await (btn?.deferUpdate() ?? Promise.resolve());

    if (!btn || btn.customId === `trap_avoid_${userId}`) {
      const avoidReply = await interaction.editReply({
        embeds: [new EmbedBuilder().setColor(COLORS.success).setDescription('✅ Bạn cẩn thận bước qua bẫy an toàn.')],
        components: buildContinueExploreRow(userId)
      });
      attachContinueExploreHandler(avoidReply, interaction, userId, guildId);
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
    componentType: ComponentType.Button, filter: onlyUser(userId), time: 30_000
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
    componentType: ComponentType.Button, filter: onlyUser(userId), time: 30_000
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
      const skBook = pick(['book_fireball','book_iron_skin','book_shadow_step','book_arcane_bolt','book_cleave','book_purify']); addItem(userId, guildId, skBook);
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
    componentType: ComponentType.Button, filter: onlyUser(userId), time: 25_000
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
    lore: 'Tên cướp đường thường đánh vào kẻ yếu thế.',
    chapterRescue: true
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
    componentType: ComponentType.Button, filter: onlyUser(userId), time: 25_000
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
    componentType: ComponentType.Button, filter: onlyUser(userId), time: 30_000
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
  { id: 'stat_atk',     name: '+1 ATK vĩnh viễn',            icon: '⚔️', cost: 6, desc: 'Tăng ATK cơ bản, giữ qua chuyển sinh' },
  { id: 'stat_def',     name: '+1 DEF vĩnh viễn',            icon: '🛡️', cost: 6, desc: 'Tăng DEF cơ bản, giữ qua chuyển sinh' },
  { id: 'stat_hp',      name: '+10 HP vĩnh viễn',            icon: '❤️', cost: 7, desc: 'Tăng Max HP cơ bản, giữ qua chuyển sinh' },
  { id: 'keep_item',    name: 'Giữ 1 item khi chết',         icon: '🔒', cost: 9, desc: 'Tích 1 charge bảo hiểm di vật' },
  { id: 'skill_slot',   name: 'Mở thêm slot kỹ năng',        icon: '📌', cost: 18, desc: 'Mở tối đa +2 slot loadout' },
  { id: 'death_reduce', name: 'Giảm penalty khi chết',       icon: '🕯️', cost: 10, desc: 'Giảm penalty tử vong thêm 10%, cap 50%' },
  { id: 'next_bless',   name: 'Blessing cho kiếp sau',       icon: '🧬', cost: 7, desc: 'Lần /start sau chết mạnh hơn một chút' },
  { id: 'mercy_mark',   name: 'Ấn chuộc lỗi thương nhân',    icon: '🧾', cost: 6, desc: 'Dùng trong event chuộc tội/giảm wanted' },
];

const COMMON_BOOKS = [
  'book_fireball','book_ice_lance','book_shield_bash','book_shadow_step','book_mend_wounds','book_thunder_clap',
  'book_arcane_bolt','book_poison_dart','book_cleave','book_battle_cry','book_guardian_wall','book_purify',
  'book_blood_siphon','book_mana_surge','book_frost_nova','book_whirlwind','book_radiant_smite','book_venom_cloud','book_execute','book_meteor_shower',
  'book_iron_skin','book_berserker','book_mana_flow','book_vampiric','book_tough_body',
  'book_blade_mastery','book_arcane_mind','book_survival_instinct','book_blood_hunger'
];
const SOUL_BOOKS   = ['book_soul_strike','book_soul_guard','book_soul_drain','book_void_rift'];

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
    .setTitle('💀 Người Giữ Linh Hồn')
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
        .addOptions(options.slice(0, 25))
    ));
  }

  rows.push(new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`soul_leave_${userId}`).setLabel('Rời đi').setEmoji('🚶').setStyle(ButtonStyle.Secondary)
  ));

  const reply = await interaction.editReply({ embeds: [embed], components: rows });

  const collector = reply.createMessageComponentCollector({
    filter: onlyUser(userId), time: 60_000
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
        const mats = ['herb','wolf_fang','ancient_bark','bone_shard','ectoplasm','troll_hide','ancient_wood','broken_rune','merchant_seal','soul_dust','rusty_gear','cursed_cloth'];
        const qty = randInt(2, 4);
        const picked: string[] = [];
        for (let i = 0; i < qty; i++) { const m = pick(mats); addItem(userId, guildId, m, 1); picked.push(m); }
        const distinct = [...new Set(picked)].map(m => getItem(m)?.name ?? m).join(', ');
        result = `📦 ${distinct}`;
      } else if (itemKey === 'stat_atk') {
        addPermanentStat(userId, guildId, 'atk', 1);
        result = '⚔️ **ATK vĩnh viễn +1**';
      } else if (itemKey === 'stat_def') {
        addPermanentStat(userId, guildId, 'def', 1);
        result = '🛡️ **DEF vĩnh viễn +1**';
      } else if (itemKey === 'stat_hp') {
        addPermanentStat(userId, guildId, 'max_hp', 10);
        result = '❤️ **Max HP vĩnh viễn +10**';
      } else if (itemKey === 'keep_item') {
        const charges = addKeepItemCharge(userId, guildId, 1);
        result = `🔒 **Keep Item Charge +1** *(đang có ${charges})*`;
      } else if (itemKey === 'skill_slot') {
        const slots = addExtraSkillSlot(userId, guildId, 1);
        result = `📌 **Mở thêm slot kỹ năng** *(+${slots}/2)*`;
      } else if (itemKey === 'death_reduce') {
        const reduction = improveDeathPenaltyReduction(userId, guildId, 10);
        result = `🕯️ **Death penalty reduction ${reduction}%**`;
      } else if (itemKey === 'next_bless') {
        const blessings = addRebirthBlessing(userId, guildId, 1);
        result = `🧬 **Blessing cho kiếp sau +1** *(đang có ${blessings})*`;
      } else if (itemKey === 'mercy_mark') {
        const marks = addMerchantMercy(userId, guildId, 1);
        result = `🧾 **Ấn chuộc lỗi thương nhân +1** *(đang có ${marks})*`;
      } else if (shopItem.giveItem) {
        addItem(userId, guildId, shopItem.giveItem, shopItem.qty ?? 1);
        const it = getItem(shopItem.giveItem);
        result = `${it?.icon ?? '✨'} **${it?.name ?? shopItem.giveItem}**`;
      }

      const afterP = getPlayer(userId, guildId)!;
      const resReply = await interaction.editReply({
        embeds: [
          new EmbedBuilder().setColor(COLORS.purple)
            .setTitle('💀 Người Giữ Linh Hồn — Khế Ước Hoàn Tất')
            .setDescription(`−**${shopItem.cost} 💀** Soul Shard\nNhận được: ${result}\n\n💀 Còn lại: **${afterP.soul_shards}** Soul Shards`)
        ],
        components: buildContinueExploreRow(userId)
      });
      attachContinueExploreHandler(resReply, interaction, userId, guildId);
    }
  });

  collector.on('end', (_c, reason) => {
    if (reason === 'time') {
      interaction.editReply({
        embeds: [simpleEmbed(COLORS.info, '💀 Cửa hàng linh hồn đã đóng cửa.')],
        components: buildContinueExploreRow(userId)
      }).then(r => attachContinueExploreHandler(r, interaction, userId, guildId)).catch(() => {});
    }
  });
}
