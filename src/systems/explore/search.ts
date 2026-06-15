import {
  ChatInputCommandInteraction, ButtonInteraction,
  EmbedBuilder, ButtonBuilder, ButtonStyle,
  ActionRowBuilder, ComponentType, Message
} from 'discord.js';
import {
  getPlayer, applyPassiveStats, grantGold, spendGold, grantExp, grantSoulShards,
  addItem, getItemQty, updatePlayerHpMp, adjustReputation, removeItem
} from '../player';
import {
  startCombatFlow, startCombatFlowWithEnemy, startGroupCombatFlow,
  type CombatVictoryHandler, type CombatDeathHandler, type CombatFleeHandler
} from '../combatFlow';
import { startPartyCombatFlow, startPartyCombatFlowWithEnemy, type PartyMember, type PartyCombatEnemy } from '../partyCombatFlow';
import { canExplore, exploreCooldownRemaining, setExploreCooldown } from '../economy';
import { logEvent, setFlag, getFlag, deleteFlag } from '../world';
import { getOakEvent, hasOakPrereq, isOakHuntActive, tickOakHunt, markOakPrereq } from '../oakEvent';
import { getLegaciesInZone, claimLegacy } from '../legacy';
import { COLORS } from '../../utils/embeds';
import { getZone } from '../../data/zones';
import { getEnemiesForZone, getEnemy } from '../../data/enemies';
import { getItem } from '../../data/items';
import { getMaterial } from '../../data/materials';
import { getEquipment } from '../../data/equipment';
import { getSkill } from '../../data/skills';
import { pick, randInt } from '../../utils/format';
import { withImage } from '../../utils/eventImages';
import { onlyParty, onlyUser } from '../../utils/collectors';
import { updatePityCounters } from '../pity';
import { incrementDaily } from '../../commands/daily';
import { ensurePendingChapterExploreEvent, getPendingChapterExploreEvent, incrementChapterObjective } from '../chapter';
import { runPendingChapterExploreEvent } from '../chapterExploreEventEngine';
import { pickExploreEvent, runExploreEvent } from '../../commands/exploreEvents';
import {
  simpleEmbed, buildContinueExploreRow, attachContinueExploreHandler,
  ensurePlayerAlive, blockIfPartyMember
} from './shared';
import { handleVictory, handleDeath, handleFlee } from './callbacks';
import { showExploreMenu } from './menu';
import { showMerchant, showSoulShop } from './merchant';
import { getReadyPartyMemberIds } from './partyHelpers';
import { maybeGainShrineCorruption, getCorruptionLevel, getCorruptionTier } from '../corruption';
import { setBuff } from '../consumables';
import {
  generateExploreNodes, getExploreNoise, addExploreNoise, reduceExploreNoise, resetExploreNoise,
  formatNoiseBar, canUseSmokeBomb, consumeSmokeForNoise, describeNode, rollResourceResult, getZoneTitle, type ExploreNode
} from './nodes';

async function startEnemyCombatMaybeParty(
  interaction: ChatInputCommandInteraction,
  userId: string,
  guildId: string,
  enemy: any,
  bonus: { bonusGold: number; bonusDesc: string; bonusItem?: string } | undefined,
  onVictory: CombatVictoryHandler,
  onDeath: CombatDeathHandler,
  onFlee?: CombatFleeHandler
): Promise<void> {
  const player = getPlayer(userId, guildId);
  const partyMemberIds = player ? getReadyPartyMemberIds(guildId, userId, player.zone_id) : undefined;

  if (partyMemberIds && !enemy?.isShopkeeper) {
    const partyEnemy = { ...enemy };
    if (bonus?.bonusGold) {
      partyEnemy.goldMin = (partyEnemy.goldMin ?? 5) + Math.floor(bonus.bonusGold * 0.6);
      partyEnemy.goldMax = (partyEnemy.goldMax ?? partyEnemy.goldMin ?? 20) + bonus.bonusGold;
    }
    if (bonus?.bonusItem) {
      partyEnemy.guaranteedDrops = [...(partyEnemy.guaranteedDrops ?? []), bonus.bonusItem];
    }
    await startPartyCombatFlowWithEnemy(interaction, userId, guildId, partyMemberIds, partyEnemy, async () => {
      const reply = await interaction.fetchReply() as Message<boolean>;
      await reply.edit({ components: buildContinueExploreRow(userId) }).catch(() => {});
      attachContinueExploreHandler(reply, interaction, userId, guildId);
    });
    return;
  }

  await startCombatFlowWithEnemy(interaction, userId, guildId, enemy, bonus, onVictory, onDeath, onFlee);
}

// ── Search: random event ───────────────────────────────────────────────────────
export async function handleSearch(
  interaction: ChatInputCommandInteraction, userId: string, guildId: string
): Promise<void> {
  if (!(await ensurePlayerAlive(interaction, userId, guildId))) return;
  if (await blockIfPartyMember(interaction, userId, guildId)) return;

  const player = getPlayer(userId, guildId)!;
  const currentZone = getZone(player.zone_id)!;
  if (currentZone.safe) {
    resetExploreNoise(userId, guildId);
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
  const corruptionTickLine = maybeGainShrineCorruption(player as any);
  if (player.zone_id === 'shrine') (player as any).corruption = getCorruptionLevel(userId, guildId);
  const enemies  = getEnemiesForZone(player.zone_id);
  const legacies = getLegaciesInZone(guildId, player.zone_id, 5);

  // Detect party trước khi cộng daily để leader khám phá cũng tính cho cả party.
  // Chỉ tính các thành viên đang sống, cùng zone và không mắc kẹt trong combat khác.
  const partyMemberIds = getReadyPartyMemberIds(guildId, userId, player.zone_id);
  const isPartyLeader = !!partyMemberIds;
  const partyMemberNames: Record<string, string> | undefined = partyMemberIds
    ? Object.fromEntries(
        partyMemberIds
          .filter(id => id !== userId)
          .map(id => [id, getPlayer(id, guildId)?.name ?? 'Đồng đội'])
      )
    : undefined;

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
      async (members, defeatedEnemy) => {
        const enemyDef = getEnemy(defeatedEnemy.id) ?? getEnemy(enemyId);

        // Forest Ancient Oak route: if the miniboss is killed in party combat,
        // mark the prerequisite for every surviving party member. Previously only
        // solo combat called handleVictory(), so party kills did not unlock the
        // summon step even when the players had beaten the miniboss.
        if (enemyDef?.miniboss && enemyDef.zones?.includes('forest')) {
          for (const m of members.filter(m => m.alive)) {
            markOakPrereq(guildId, m.user_id);
            setFlag(guildId, `oak_lore_miniboss_${m.user_id}`, '1');
          }
        }

        const reply = await interaction.fetchReply() as Message<boolean>;
        await reply.edit({ components: buildContinueExploreRow(userId) }).catch(() => {});
        attachContinueExploreHandler(reply, interaction, userId, guildId);
      }
    );
  };

  const makePartyEventVictory = (
    onVictory?: CombatVictoryHandler,
    onDeath?: CombatDeathHandler,
    onFlee?: CombatFleeHandler
  ) => async (members: PartyMember[], enemy: PartyCombatEnemy) => {
    const reply = await interaction.fetchReply() as Message<boolean>;
    const leaderMember = members.find(m => m.user_id === userId);
    const leader = getPlayer(userId, guildId);

    if (onVictory && leader && leaderMember) {
      const fakeBtn = {
        editReply: (payload: any) => interaction.editReply(payload),
        message: reply
      } as unknown as ButtonInteraction;
      const fakeState = {
        player_hp: leaderMember.hp,
        player_mp: leaderMember.mp,
        enemy_hp: 0,
        enemy_max_hp: enemy.max_hp,
        enemy_id: enemy.id,
        enemy_name: enemy.name
      };
      await onVictory(interaction, fakeBtn, userId, guildId, leader, enemy, fakeState);
      return;
    }

    await reply.edit({ components: buildContinueExploreRow(userId) }).catch(() => {});
    attachContinueExploreHandler(reply, interaction, userId, guildId);
  };

  const makePartyEventWipe = (onDeath?: CombatDeathHandler) => async (_members: PartyMember[], enemy: PartyCombatEnemy) => {
    const reply = await interaction.fetchReply() as Message<boolean>;
    const leader = getPlayer(userId, guildId);
    if (onDeath && leader) {
      const fakeBtn = {
        editReply: (payload: any) => interaction.editReply(payload),
        message: reply
      } as unknown as ButtonInteraction;
      await onDeath(interaction, fakeBtn, userId, guildId, leader, enemy, enemy.hp);
      return;
    }
    await reply.edit({ components: buildContinueExploreRow(userId) }).catch(() => {});
    attachContinueExploreHandler(reply, interaction, userId, guildId);
  };

  const startPartyCombatWithEnemy = async (
    enemy: any,
    onVictory?: CombatVictoryHandler,
    onDeath?: CombatDeathHandler,
    onFlee?: CombatFleeHandler
  ) => {
    await startPartyCombatFlowWithEnemy(
      interaction, userId, guildId, partyMemberIds!, enemy,
      makePartyEventVictory(onVictory, onDeath, onFlee),
      makePartyEventWipe(onDeath),
      { grantDefaultRewards: !!enemy?.useDefaultPartyRewards }
    );
  };

  // Group encounter chance scales with zone danger
  const GROUP_CHANCE: Record<string, number> = {
    village: 0.12,
    forest:  0.12,
    shrine:  0.18,
    mines:   0.24,
    wastes:  0.30,
  };
  const THREE_ENEMY_CHANCE: Record<string, number> = {
    village: 0.12,
    forest:  0.28,
    shrine:  0.35,
    mines:   0.42,
    wastes:  0.50,
  };
  ensurePendingChapterExploreEvent(userId, guildId);
  if (getPendingChapterExploreEvent(userId, guildId)) {
    setExploreCooldown(userId, guildId);
    const ranChapterEvent = await runPendingChapterExploreEvent({
      interaction,
      userId,
      guildId,
      buildContinueExploreRow,
      attachContinueExploreHandler,
    });
    if (ranChapterEvent) return;
  }

  const shrineCorruptionTier = player.zone_id === 'shrine' ? getCorruptionTier((player as any).corruption ?? 0) : 0;
  const hasCombat = enemies.length > 0;
  const hasLegacy = legacies.length > 0;

  // Oak hunt tick — đếm ngược mỗi lần explore trong forest
  if (player.zone_id === 'forest' && isOakHuntActive(guildId, userId)) {
    const remaining = tickOakHunt(guildId, userId);
    if (remaining === 0) {
      setExploreCooldown(userId, guildId);
      const minibossId = Math.random() < 0.5 ? 'alpha_thornmaw' : 'moss_crowned_stag';
      const miniboss = getEnemy(minibossId)!;
      const intro = minibossId === 'alpha_thornmaw'
        ? 'Một tiếng gầm xé toạc màn sương. Những bụi gai rung lên như hàng ngàn lưỡi dao — kẻ săn mồi đầu đàn đã ngửi thấy mùi máu.'
        : 'Mặt đất rung nhẹ. Từ giữa rừng già, một linh thú đội vương miện rễ cây bước ra, đôi mắt như đang phán xét linh hồn bạn.';
      const embed = new EmbedBuilder()
        .setColor(COLORS.danger)
        .setTitle(`⚠️ MINI BOSS ENCOUNTER — ${miniboss.icon} ${miniboss.name}`)
        .setDescription(
          `**${intro}**\n\n` +
          `*${miniboss.lore}*\n\n` +
          '🌳 Đây là hộ vệ của Ancient Oak route. Đánh bại nó để mở bước tiếp theo.\n' +
          '⚠️ Bạn không thể bỏ chạy khỏi cuộc đối đầu này.'
        );
      await interaction.editReply({ embeds: [embed], components: [] });
      await new Promise(r => setTimeout(r, 800));
      if (isPartyLeader) await startPartyCombat(minibossId);
      else await startCombatFlow(interaction, userId, guildId, minibossId, handleVictory, handleDeath, handleFlee);
      return;
    }
  }

  // Oak event lore — mỗi điều kiện thỏa có event riêng
  if (player.zone_id === 'forest' && !getOakEvent(guildId)) {
    // Điều kiện 1: vừa hạ miniboss rừng
    if (getFlag(guildId, `oak_lore_miniboss_${userId}`)) {
      deleteFlag(guildId, `oak_lore_miniboss_${userId}`);
      setExploreCooldown(userId, guildId);
      const embed = new EmbedBuilder()
        .setColor(0x2D7D46)
        .setTitle('🌿 Rừng Im Lặng Bất Thường')
        .setDescription(
          '*Linh thú ngã xuống. Máu thấm vào đất.*\n\n' +
          'Không có tiếng chim. Không có gió. Những cây cổ thụ quanh bạn như đang... lắng nghe.\n\n' +
          '*Một thứ gì đó sâu trong rừng đã nhận ra bạn.*'
        )
        .setFooter({ text: '⚱️ Thu thập đủ 3 Ancient Relic để tiếp tục...' });
      const reply = await interaction.editReply({ embeds: [embed], components: buildContinueExploreRow(userId) });
      attachContinueExploreHandler(reply, interaction, userId, guildId);
      return;
    }
    // Điều kiện 2: vừa đủ 3 relic (và đã có prereq)
    if (
      hasOakPrereq(guildId, userId) &&
      getItemQty(userId, guildId, 'ancient_relic') >= 3 &&
      !getFlag(guildId, `oak_lore_relic_${userId}`)
    ) {
      setFlag(guildId, `oak_lore_relic_${userId}`, '1');
      setExploreCooldown(userId, guildId);
      const embed = new EmbedBuilder()
        .setColor(0x2D7D46)
        .setTitle('⚱️ Relic Rung Lên')
        .setDescription(
          '*Ba mảnh vỡ trong túi bạn bắt đầu ấm lên — rồi rung nhẹ, đồng điệu với nhau.*\n\n' +
          'Ánh sáng xanh lờ mờ rò qua lớp vải. Không phải ma thuật thông thường.\n\n' +
          '*Đây là tiếng gọi. Cổ thụ đang chờ đủ người.*\n\n' +
          '**Mọi điều kiện đã hội tụ** — dùng nút 🌳 trong menu để triệu hồi.'
        );
      const reply = await interaction.editReply({ embeds: [embed], components: buildContinueExploreRow(userId) });
      attachContinueExploreHandler(reply, interaction, userId, guildId);
      return;
    }
  }

  const runRandomExploreEvent = async (): Promise<void> => {
      const event = pickExploreEvent({ player, guildId, hasCombat, hasLegacy });
      const pityTargets = partyMemberIds ?? [userId];
      for (const mid of pityTargets) updatePityCounters(mid, guildId, event);

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
        partyMemberNames,
        callbacks: {
          startCombat: isPartyLeader
            ? startPartyCombat
            : (enemyId: string) => startCombatFlow(interaction, userId, guildId, enemyId, handleVictory, handleDeath, handleFlee),
          startCombatWithEnemy: isPartyLeader
            ? startPartyCombatWithEnemy
            : (enemy: any, onVictory?: CombatVictoryHandler, onDeath?: CombatDeathHandler, onFlee?: CombatFleeHandler) => startCombatFlowWithEnemy(interaction, userId, guildId, enemy, undefined, onVictory, onDeath, onFlee),
          handleFlee,
          showAmbush: () => showAmbush(interaction, userId, guildId, pick(enemies).id),
          showLegacyFind: () => showLegacyFind(interaction, userId, guildId, legacies),
          showMerchant: () => showMerchant(interaction, userId, guildId, partyMemberIds, partyMemberNames),
          showHealingSpring: () => showHealingSpring(interaction, userId, guildId),
          showTrap: () => showTrap(interaction, userId, guildId),
          showAncientAltar: () => showAncientAltar(interaction, userId, guildId),
          showMysteriousFigure: () => showMysteriousFigure(interaction, userId, guildId),
          showVillagerRescue: () => showVillagerRescue(interaction, userId, guildId, enemies),
          showCaravanRobbery: () => showCaravanRobbery(interaction, userId, guildId, enemies),
          showLootFind: () => showLootFind(interaction, userId, guildId),
          showSoulShop: () => showSoulShop(interaction, userId, guildId, partyMemberIds, partyMemberNames),
          showAbandonedCamp: () => showAbandonedCamp(interaction, userId, guildId),
          showLostPouch: () => showLostPouch(interaction, userId, guildId),
          showRuneStone: () => showRuneStone(interaction, userId, guildId),
          showTreasureChest: () => showTreasureChest(interaction, userId, guildId),
          showWanderingHealer: () => showWanderingHealer(interaction, userId, guildId, partyMemberIds, partyMemberNames),
          showSpiritTrial: () => showSpiritTrial(interaction, userId, guildId, enemies),
          buildContinueExploreRow,
          attachContinueExploreHandler,
          handleVictory,
          handleDeath
      
        }
      });
  };

  const startCombatNode = async (): Promise<void> => {
    setExploreCooldown(userId, guildId);
    const combatGroupChance = (GROUP_CHANCE[player.zone_id] ?? 0.15) + shrineCorruptionTier * 0.03;
    if (enemies.length >= 2 && Math.random() < combatGroupChance) {
      if (isPartyLeader) {
        await startPartyCombat(pick(enemies).id);
      } else {
        const shuffled = [...enemies].sort(() => Math.random() - 0.5);
        const threeChance = THREE_ENEMY_CHANCE[player.zone_id] ?? 0.20;
        const count = (enemies.length >= 3 && Math.random() < threeChance) ? 3 : 2;
        const groupIds = shuffled.slice(0, count).map(e => e.id);
        await startGroupCombatFlow(interaction, userId, guildId, groupIds, handleVictory, handleDeath, handleFlee);
      }
      return;
    }

    if (isPartyLeader) await startPartyCombat(pick(enemies).id);
    else await startCombatFlow(interaction, userId, guildId, pick(enemies).id, handleVictory, handleDeath, handleFlee);
  };

  const maybeTriggerNoiseAmbush = async (noise: { triggered: boolean; after: number }): Promise<boolean> => {
    if (!noise.triggered || !enemies.length) return false;
    resetExploreNoise(userId, guildId);
    setExploreCooldown(userId, guildId);
    const enemy = pick(enemies);
    const embed = new EmbedBuilder()
      .setColor(COLORS.danger)
      .setTitle('🔊 Tiếng Động Đạt 100%')
      .setDescription(
        `Bạn gây quá nhiều tiếng động trong **${getZoneTitle(player.zone_id)}**.
` +
        `Bóng tối lập tức đáp lại...

` +
        `💥 **AMBUSH!** Quái vật sẽ được đánh trước.
` +
        `🔇 Noise đã reset về **0%** sau khi bị phát hiện.`
      );
    await interaction.editReply({ embeds: [embed], components: [] });
    await new Promise(r => setTimeout(r, 900));
    await showAmbush(interaction, userId, guildId, enemy.id);
    return true;
  };

  const showResourceNode = async (): Promise<void> => {
    setExploreCooldown(userId, guildId);
    const result = rollResourceResult(player.zone_id, userId, guildId);
    addItem(userId, guildId, result.itemId, result.amount);
    const toolLine = result.hasTool
      ? `🧰 Công cụ: **${result.toolLabel}** — sản lượng tốt hơn.`
      : '👐 Không có rìu/cuốc phù hợp: vẫn khai thác được, nhưng sản lượng thấp hơn.';
    const reply = await interaction.editReply({
      embeds: [new EmbedBuilder()
        .setColor(COLORS.success)
        .setTitle('⛏️ Dấu Vết Tài Nguyên')
        .setDescription(
          `${toolLine}

` +
          `Thu được: ${result.icon} **${result.name} ×${result.amount}**
` +
          `🔊 Noise hiện tại: ${formatNoiseBar(getExploreNoise(userId, guildId))}`
        )],
      components: buildContinueExploreRow(userId)
    });
    attachContinueExploreHandler(reply, interaction, userId, guildId);
  };

  const showCampNode = async (): Promise<void> => {
    const fresh = applyPassiveStats(getPlayer(userId, guildId)!);
    const price = Math.max(12, Math.floor(16 + fresh.level * 5));
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId(`node_camp_rest_${userId}`).setLabel(`Nghỉ ngơi ${price} Gold`).setEmoji('🔥').setStyle(ButtonStyle.Success).setDisabled(fresh.gold < price),
      new ButtonBuilder().setCustomId(`node_camp_leave_${userId}`).setLabel('Bỏ đi').setEmoji('🚶').setStyle(ButtonStyle.Secondary)
    );
    const reply = await interaction.editReply({
      embeds: [new EmbedBuilder()
        .setColor(COLORS.info)
        .setTitle('🏕️ Trại Tàn Tạ')
        .setDescription(
          `Một trại cũ đủ kín để nghỉ tạm.

` +
          `🪙 Giá nghỉ: **${price} Gold**
` +
          `❤️ Hồi khoảng **30% HP** · 💧 **15% MP**
` +
          `🔇 Giảm Noise khoảng **25%**`
        )],
      components: [row]
    });
    const btn = await reply.awaitMessageComponent({ componentType: ComponentType.Button, filter: onlyUser(userId), time: 25_000 }).catch(() => null);
    const deferred = await btn?.deferUpdate().then(() => true).catch(() => false);
    if (!btn || !deferred || btn.customId !== `node_camp_rest_${userId}`) {
      const res = await interaction.editReply({ embeds: [simpleEmbed(COLORS.info, '🚶 Bạn rời khỏi trại trước khi khói lửa thu hút thứ khác.')], components: buildContinueExploreRow(userId) });
      attachContinueExploreHandler(res, interaction, userId, guildId);
      return;
    }
    if (!spendGold(userId, guildId, price)) {
      const res = await interaction.editReply({ embeds: [simpleEmbed(COLORS.warning, `❌ Không đủ **${price} Gold** để nghỉ.`)], components: buildContinueExploreRow(userId) });
      attachContinueExploreHandler(res, interaction, userId, guildId);
      return;
    }
    const cur = applyPassiveStats(getPlayer(userId, guildId)!);
    const hpGain = Math.max(1, Math.floor(cur.max_hp * 0.30));
    const mpGain = Math.max(0, Math.floor(cur.max_mp * 0.15));
    const nextHp = Math.min(cur.max_hp, cur.hp + hpGain);
    const nextMp = Math.min(cur.max_mp, cur.mp + mpGain);
    updatePlayerHpMp(userId, guildId, nextHp, nextMp);
    const noiseNow = reduceExploreNoise(userId, guildId, 25, 'camp');
    setExploreCooldown(userId, guildId);
    const res = await interaction.editReply({
      embeds: [simpleEmbed(COLORS.success, `🔥 Bạn nghỉ một lát ở trại.
🪙 -**${price} Gold**
❤️ ${nextHp}/${cur.max_hp} HP · 💧 ${nextMp}/${cur.max_mp} MP
🔇 Noise: ${formatNoiseBar(noiseNow)}`)],
      components: buildContinueExploreRow(userId)
    });
    attachContinueExploreHandler(res, interaction, userId, guildId);
  };

  const showBrokenGoddessStatue = async (): Promise<void> => {
    const embed = new EmbedBuilder()
      .setColor(0x8b5cf6)
      .setTitle('🗿 Bức Tượng Nữ Thần Vỡ')
      .setDescription('Bạn thấy một bức tượng Nữ Thần bị đập nát. Một con quạ đậu trên vai tượng, nhìn bạn chằm chằm.');
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId(`statue_pray_${userId}`).setLabel('Chắp tay cầu nguyện').setEmoji('🙏').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`statue_search_${userId}`).setLabel('Lục soát bệ đá').setEmoji('🔎').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`statue_leave_${userId}`).setLabel('Bỏ đi').setEmoji('🚶').setStyle(ButtonStyle.Secondary)
    );
    const reply = await interaction.editReply({ embeds: [embed], components: [row] });
    const btn = await reply.awaitMessageComponent({ componentType: ComponentType.Button, filter: onlyUser(userId), time: 30_000 }).catch(() => null);
    const deferred = await btn?.deferUpdate().then(() => true).catch(() => false);
    if (!btn || !deferred || btn.customId === `statue_leave_${userId}`) {
      const res = await interaction.editReply({ embeds: [simpleEmbed(COLORS.info, '🚶 Bạn cúi đầu rời đi. Con quạ vẫn nhìn theo, nhưng không kêu một tiếng.')], components: buildContinueExploreRow(userId) });
      attachContinueExploreHandler(res, interaction, userId, guildId);
      return;
    }
    if (btn.customId === `statue_pray_${userId}`) {
      const p = applyPassiveStats(getPlayer(userId, guildId)!);
      if (randInt(1, 100) <= 70) {
        setBuff(userId, guildId, 'goddess_luck' as any, 12, 3, 3600);
        const res = await interaction.editReply({ embeds: [simpleEmbed(COLORS.success, '✨ Lời cầu nguyện được đáp lại. **May Mắn Nữ Thần**: +12% Crit trong 3 lượt đánh của combat kế tiếp.')], components: buildContinueExploreRow(userId) });
        attachContinueExploreHandler(res, interaction, userId, guildId);
      } else {
        const dmg = Math.min(10, Math.max(1, p.hp - 1));
        updatePlayerHpMp(userId, guildId, p.hp - dmg, p.mp);
        const res = await interaction.editReply({ embeds: [simpleEmbed(COLORS.warning, `🐦 Con quạ mổ mạnh vào tay bạn. -**${dmg} HP** (${p.hp - dmg}/${p.max_hp}).`) ], components: buildContinueExploreRow(userId) });
        attachContinueExploreHandler(res, interaction, userId, guildId);
      }
      return;
    }

    const noise = addExploreNoise(userId, guildId, 20, player.class, 'statue_search');
    if (await maybeTriggerNoiseAmbush(noise)) return;
    grantGold(userId, guildId, 20);
    addItem(userId, guildId, 'holy_water', 1);
    setBuff(userId, guildId, 'goddess_curse' as any, 20, 5, 7200);
    const res = await interaction.editReply({
      embeds: [simpleEmbed(COLORS.warning, `🔎 Bạn lục soát bệ đá và lấy được **20 Gold** + 💧 **Holy Water ×1**.

⚠️ **Lời Nguyền Của Thần**: nhận thêm 20% sát thương trong 5 lượt của combat kế tiếp.
🔊 Noise: ${formatNoiseBar(getExploreNoise(userId, guildId))}`)],
      components: buildContinueExploreRow(userId)
    });
    attachContinueExploreHandler(res, interaction, userId, guildId);
  };

  const showMysteryNode = async (): Promise<void> => {
    setExploreCooldown(userId, guildId);
    const roll = randInt(1, 100);
    if (roll <= 38) return showBrokenGoddessStatue();
    if (roll <= 58) return showTreasureChest(interaction, userId, guildId);
    if (roll <= 74) return showRuneStone(interaction, userId, guildId);
    if (roll <= 88) return showLostPouch(interaction, userId, guildId);
    return runRandomExploreEvent();
  };

  const resolveExploreNode = async (node: ExploreNode): Promise<void> => {
    const baseNoise = node.type === 'camp' ? 0 : node.noise;
    const noise = baseNoise > 0 ? addExploreNoise(userId, guildId, baseNoise, player.class, node.type) : { before: getExploreNoise(userId, guildId), after: getExploreNoise(userId, guildId), added: 0, triggered: false };
    if (await maybeTriggerNoiseAmbush(noise)) return;

    if (node.type === 'combat') return startCombatNode();
    if (node.type === 'resource') return showResourceNode();
    if (node.type === 'camp') return showCampNode();
    return showMysteryNode();
  };

  const showExploreNodeChoices = async (): Promise<void> => {
    const nodes = generateExploreNodes(player, hasCombat, hasLegacy);
    const noise = getExploreNoise(userId, guildId);
    const embed = new EmbedBuilder()
      .setColor(COLORS.info)
      .setTitle(`🗺️ Ngã Rẽ Định Mệnh — ${getZoneTitle(player.zone_id)}`)
      .setDescription(
        `Bạn dừng lại trước vài lối rẽ. Không phải bước nào cũng nên đánh đổi bằng máu.

` +
        nodes.map(describeNode).join('\n\n') +
        `

🔊 **Tiếng Động hiện tại**
${formatNoiseBar(noise)}
` +
        `*Noise đạt 100% sẽ kích hoạt Ambush, quái được đánh trước.*`
      )
      .setFooter({ text: 'Assassin/Rogue/Shadowblade gây ít Noise hơn. Không có rìu/cuốc vẫn khai thác được nhưng sản lượng thấp.' });
    const nodeRow = new ActionRowBuilder<ButtonBuilder>();
    nodes.forEach((n, idx) => {
      nodeRow.addComponents(new ButtonBuilder()
        .setCustomId(`exnode_${idx}_${userId}`)
        .setLabel(n.title.slice(0, 72))
        .setEmoji(n.emoji)
        .setStyle(n.type === 'combat' ? ButtonStyle.Danger : n.type === 'resource' ? ButtonStyle.Success : n.type === 'camp' ? ButtonStyle.Secondary : ButtonStyle.Primary));
    });
    const rows: ActionRowBuilder<ButtonBuilder>[] = [nodeRow];
    if (noise > 0 && canUseSmokeBomb(userId, guildId)) {
      rows.push(new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId(`exnode_smoke_${userId}`).setLabel('Dùng Smoke reset Noise').setEmoji('💨').setStyle(ButtonStyle.Secondary)
      ));
    }

    const reply = await interaction.editReply({ embeds: [embed], components: rows });
    const collector = reply.createMessageComponentCollector({ componentType: ComponentType.Button, filter: onlyUser(userId), time: 60_000 });
    collector.on('collect', async (btn) => {
      const ok = await btn.deferUpdate().then(() => true).catch(() => false);
      if (!ok) return;
      collector.stop('picked');
      await reply.edit({ components: [] }).catch(() => {});
      if (btn.customId === `exnode_smoke_${userId}`) {
        const used = consumeSmokeForNoise(userId, guildId);
        const item = used ? (getItem(used) ?? { icon: '💨', name: used } as any) : null;
        const res = await interaction.editReply({
          embeds: [simpleEmbed(used ? COLORS.success : COLORS.warning, used ? `${item!.icon} Bạn dùng **${item!.name}**. Khói phủ kín dấu vết — Noise về **0%**.` : '❌ Không còn Smoke để dùng.')],
          components: buildContinueExploreRow(userId)
        });
        attachContinueExploreHandler(res, interaction, userId, guildId);
        return;
      }
      const idx = Number(btn.customId.split('_')[1]);
      const node = nodes[idx] ?? nodes[0];
      await resolveExploreNode(node);
    });
    collector.on('end', (_c, reason) => {
      if (reason === 'time') reply.edit({ components: [] }).catch(() => {});
    });
  };

  return showExploreNodeChoices();
}


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
    if (btn) await btn.deferUpdate().catch(() => {});
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
    const { hasSkillInPool, addSkillToPool } = await import('../player');
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
  const player = applyPassiveStats(getPlayer(userId, guildId)!);
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
  const player = applyPassiveStats(getPlayer(userId, guildId)!);
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
  const player = applyPassiveStats(getPlayer(userId, guildId)!);
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`chest_open_${userId}`).setLabel('Mở rương').setEmoji('🗝️').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`chest_leave_${userId}`).setLabel('Bỏ qua').setEmoji('🚶').setStyle(ButtonStyle.Secondary)
  );
  const { embed, files } = withImage(new EmbedBuilder().setColor(COLORS.gold).setTitle('🧰 Rương Cũ').setDescription('*Một chiếc rương gỗ bị dây leo phủ kín. Khóa đã rỉ sét...*'), 'chest');
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
  interaction: ChatInputCommandInteraction, userId: string, guildId: string,
  partyMemberIds?: string[], partyMemberNames?: Record<string, string>
): Promise<void> {
  const player = applyPassiveStats(getPlayer(userId, guildId)!);
  const price = Math.max(10, Math.floor(18 + player.level * 4));
  const isPartyShop = !!(partyMemberIds && partyMemberIds.length > 1);
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`healer_pay_${userId}`).setLabel(`Trả ${price} Gold`).setEmoji('💚').setStyle(ButtonStyle.Success).setDisabled(!isPartyShop && player.gold < price),
    new ButtonBuilder().setCustomId(`healer_leave_${userId}`).setLabel('Rời đi').setEmoji('🚶').setStyle(ButtonStyle.Secondary)
  );
  const { embed, files } = withImage(new EmbedBuilder().setColor(COLORS.success).setTitle('💚 Tu Sĩ Lang Thang').setDescription(`Một tu sĩ đề nghị chữa trị với giá khoảng **${price} Gold**.${isPartyShop ? '\n\n👥 Thành viên nào bấm trả tiền thì người đó được hồi máu/mana.' : ''}`), 'healer');
  const reply = await interaction.editReply({ embeds: [embed], files, components: [row] });
  const btn = await reply.awaitMessageComponent({ componentType: ComponentType.Button, filter: isPartyShop ? onlyParty(userId, partyMemberIds!) : onlyUser(userId), time: 25_000 }).catch(() => null);
  const deferred = await btn?.deferUpdate().then(() => true).catch(() => false);

  if (!btn || !deferred || btn.customId !== `healer_pay_${userId}`) {
    const res = await interaction.editReply({ embeds: [simpleEmbed(COLORS.info, '🚶 Bạn cảm ơn tu sĩ rồi tiếp tục lên đường.')], components: buildContinueExploreRow(userId) });
    attachContinueExploreHandler(res, interaction, userId, guildId);
    return;
  }

  const targetId = btn.user.id;
  const target = applyPassiveStats(getPlayer(targetId, guildId)!);
  const targetPrice = Math.max(10, Math.floor(18 + target.level * 4));
  if (!spendGold(targetId, guildId, targetPrice)) {
    const res = await interaction.editReply({ embeds: [simpleEmbed(COLORS.warning, `❌ **${target.name}** không đủ **${targetPrice} Gold** để chữa trị.`)], components: buildContinueExploreRow(userId) });
    attachContinueExploreHandler(res, interaction, userId, guildId);
    return;
  }
  const hpGain = Math.floor(target.max_hp * 0.45);
  const mpGain = Math.floor(target.max_mp * 0.25);
  const newHp = Math.min(target.max_hp, target.hp + hpGain);
  const newMp = Math.min(target.max_mp, target.mp + mpGain);
  updatePlayerHpMp(targetId, guildId, newHp, newMp);
  const res = await interaction.editReply({ embeds: [simpleEmbed(COLORS.success, `💚 Ánh sáng dịu bao phủ **${target.name}**.\n🪙 -**${targetPrice} Gold**\n❤️ +**${hpGain} HP** → ${newHp}/${target.max_hp}\n💧 +**${mpGain} MP** → ${newMp}/${target.max_mp}`)], components: buildContinueExploreRow(userId) });
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

  await startEnemyCombatMaybeParty(
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
    handleDeath,
    handleFlee
  );
}



async function showHealingSpring(
  interaction: ChatInputCommandInteraction, userId: string, guildId: string
): Promise<void> {
  const player = applyPassiveStats(getPlayer(userId, guildId)!);
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

    if (btn) await btn.deferUpdate().catch(() => {});

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
  const player = applyPassiveStats(getPlayer(userId, guildId)!);
  let newHp = player.hp, newGold = player.gold;
  let resultDesc = '';
  const mult = reduced ? 0.5 : 1.0;

  if (trapType === 'gold') {
    const loss = Math.floor(Math.min(player.gold, randInt(15, 40)) * mult);
    newGold = player.gold - loss;
    if (loss > 0) {
      const { spendGold: sg } = await import('../player');
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
  const player = applyPassiveStats(getPlayer(userId, guildId)!);
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

  if (btn) await btn.deferUpdate().catch(() => {});
  const cid = btn?.customId ?? `altar_skip_${userId}`;

  if (cid === `altar_skip_${userId}` || !btn) {
    const skipReply = await interaction.editReply({ embeds: [simpleEmbed(COLORS.info, '🚶 Bạn rời bàn thờ cổ mà không chạm vào...')], components: buildContinueExploreRow(userId) });
    attachContinueExploreHandler(skipReply, interaction, userId, guildId);
    return;
  }

  const freshPlayer = applyPassiveStats(getPlayer(userId, guildId)!);
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

  if (btn) await btn.deferUpdate().catch(() => {});
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
      const skBook = pick(['ancient_book','ancient_book','ancient_book','ancient_book','ancient_book','ancient_book']); addItem(userId, guildId, skBook);
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
  const player = applyPassiveStats(getPlayer(userId, guildId)!);
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

  if (btn) await btn.deferUpdate().catch(() => {});

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
    await startCombatFlow(interaction, userId, guildId, enemyId, handleVictory, handleDeath, handleFlee);
  } else {
    // Try dodge
    const dodged = randInt(1, 100) <= 50;
    if (dodged) {
      await interaction.editReply({ embeds: [simpleEmbed(COLORS.success, `🌑 Bạn né được đòn phục kích! Chiến đấu bình thường bắt đầu!`)], components: [] });
      await new Promise(r => setTimeout(r, 1000));
      await startCombatFlow(interaction, userId, guildId, enemyId, handleVictory, handleDeath, handleFlee);
    } else {
      const dmg   = Math.max(1, Math.floor(firstStrikeDmg * 1.3)); // penalty for failed dodge
      const newHp = Math.max(1, player.hp - dmg);
      updatePlayerHpMp(userId, guildId, newHp, player.mp);
      await interaction.editReply({ embeds: [simpleEmbed(COLORS.danger, `❌ Né thất bại! −**${dmg} HP** (${newHp}/${player.max_hp})\nChiến đấu bắt đầu!`)], components: [] });
      await new Promise(r => setTimeout(r, 1200));
      await startCombatFlow(interaction, userId, guildId, enemyId, handleVictory, handleDeath, handleFlee);
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

  if (btn) await btn.deferUpdate().catch(() => {});

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
  await startEnemyCombatMaybeParty(interaction, userId, guildId, banditEnemy, {
    bonusGold: goldReward,
    bonusDesc: `👨‍👩‍👧 Dân làng cảm ơn bạn và trao **${goldReward} Gold**!`
  }, handleVictory, handleDeath, handleFlee);
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

  if (btn) await btn.deferUpdate().catch(() => {});
  const cid = btn?.customId ?? `cara_watch_${userId}`;

  if (cid === `cara_watch_${userId}` || !btn) {
    // Spectate — random small loot
    const watchLoot = pick(['health_potion','healing_herb','wolf_fang','bone_shard']);
    const watchGold = randInt(5, 20);
    addItem(userId, guildId, watchLoot, 1);
    grantGold(userId, guildId, watchGold);
    const it = getAnyRewardInfo(watchLoot);
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
    await startEnemyCombatMaybeParty(interaction, userId, guildId, banditBossEnemy, {
      bonusGold: randInt(80, 150),
      bonusDesc: `🛒 Thương nhân trả ơn với **{gold} Gold** và hàng hóa!`,
      bonusItem: 'elixir'
    }, handleVictory, handleDeath, handleFlee);
  } else {
    await interaction.editReply({ embeds: [simpleEmbed(COLORS.danger, '😈 Bạn chọn đứng về phía bọn cướp...')], components: [] });
    await new Promise(r => setTimeout(r, 800));
    await startEnemyCombatMaybeParty(interaction, userId, guildId, guardEnemy, {
      bonusGold: randInt(40, 80),
      bonusDesc: `💰 Chia chác chiến lợi phẩm: +**{gold} Gold** + đồ cướp được!`,
      bonusItem: pick(['health_potion','mana_potion','antidote'])
    }, handleVictory, handleDeath, handleFlee);
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getAnyRewardInfo(id: string): { icon: string; name: string } {
  const item = getItem(id);
  if (item) return { icon: item.icon ?? '🎁', name: item.name ?? id };

  const material = getMaterial(id);
  if (material) return { icon: material.icon ?? '🧱', name: material.name ?? id };

  const equipment = getEquipment(id);
  if (equipment) return { icon: equipment.icon ?? '⚔️', name: equipment.name ?? id };

  return { icon: '🎁', name: id };
}

