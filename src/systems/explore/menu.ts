import {
  ChatInputCommandInteraction,
  EmbedBuilder, ButtonBuilder, ButtonStyle,
  ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder,
  ComponentType
} from 'discord.js';
import {
  getPlayer, applyPassiveStats, getItemQty, spendGold, setZone
} from '../player';
import { getZone, ZONES, ZONE_ORDER } from '../../data/zones';
import { getEnemy } from '../../data/enemies';
import { getLegaciesInZone } from '../legacy';
import { isBossSlain, hasPlayerClearedBoss } from '../world';
import {
  getOakEvent, isOakParticipant, getOakParticipants,
  hasOakPrereq, isOakHuntActive, getOakHuntRemaining
} from '../oakEvent';
import { COLORS } from '../../utils/embeds';
import { pick } from '../../utils/format';
import { withImage } from '../../utils/eventImages';
import { onlyUser } from '../../utils/collectors';
import {
  showVillageShop, showVillageBlacksmith, showVillageTavern,
  showVillageBoard, showVillageHall
} from '../village';
import {
  maybeShowVillageEncounter,
  showMerchantGuildDistrict,
  showHuntersGuildDistrict,
  showOldChurchDistrict,
  showShadowCourtDistrict,
  showTownSquareDistrict,
} from '../villageDistricts';
import { doGather } from '../../commands/gather';
import {
  simpleEmbed, ensurePlayerAlive, buildContinueExploreRow,
  blockIfPartyMember, attachContinueExploreHandler
} from './shared';
import { handleSearch } from './search';
import { handleOakHuntStart, handleOakSummon, handleOakJoin, handleOakFight, handleBossSummon, handleBossJoin, handleBossLeave, handleBossStart } from './boss';
import { handleEchoGate } from './echoGate';
import { describeCorruption, getCorruptionAdvice } from '../corruption';
import { getBossEncounter, getBossEncounterRemaining, isBossEncounterParticipant } from '../bossEncounter';

interface OakButtonInfo {
  canSummon: boolean;
  canJoin: boolean;
  canFight: boolean;
  canStartHunt: boolean;
  huntRemaining: number;
  eventPhase: string | null;
  bossHp: number;
  bossMaxHp: number;
  participantCount: number;
  currentFighter: string | null;
  blockedReason?: string;
}

export async function showExploreMenu(
  interaction: ChatInputCommandInteraction,
  userId: string, guildId: string
): Promise<void> {
  if (!(await ensurePlayerAlive(interaction, userId, guildId))) return;

  const player  = applyPassiveStats(getPlayer(userId, guildId)!);
  const zone    = getZone(player.zone_id)!;
  const bossId  = zone.bossId;
  const bossSlain = bossId ? isBossSlain(guildId, bossId) : true;
  const legacyCount = getLegaciesInZone(guildId, player.zone_id).length;

  const oakEvForLock = player.zone_id === 'forest' ? getOakEvent(guildId) : null;
  if (oakEvForLock) {
    await showOakLockedLobby(interaction, userId, guildId);
    return;
  }

  const bossEncounter = getBossEncounter(guildId, player.zone_id);
  if (bossEncounter) {
    await showBossLockedLobby(interaction, userId, guildId);
    return;
  }

  const embed = new EmbedBuilder()
    .setColor(zone.color)
    .setTitle(`${zone.icon} ${zone.name}`)
    .setDescription(`> *${pick(zone.ambiance)}*\n\n🎯 **Chọn hành động cho chuyến đi tiếp theo.**`)
    .addFields(
      { name: '👤 Mạo hiểm giả', value: `**${player.name}** · Lv.${player.level}`, inline: true },
      { name: '❤️ HP', value: `${player.hp}/${player.max_hp}`, inline: true },
      { name: '💧 MP', value: `${player.mp}/${player.max_mp}`, inline: true },
      { name: '👻 Di sản', value: legacyCount > 0 ? `**${legacyCount}** đang chờ` : '*Chưa phát hiện*', inline: true },
      { name: '👑 Boss', value: bossSlain ? '✅ Đã hạ' : '⚠️ Vẫn rình rập', inline: true },
      { name: '🪙 Vàng', value: `${player.gold}`, inline: true },
      ...(player.zone_id === 'shrine' ? [{ name: '🌘 Ô Nhiễm Linh Hồn', value: `${describeCorruption(player.corruption ?? 0)}\n*${getCorruptionAdvice(player.corruption ?? 0)}*`, inline: false }] : [])
    );

  let oakInfo: OakButtonInfo | null = null;
  if (player.zone_id === 'forest') {
    const oakEv = getOakEvent(guildId);
    if (oakEv) {
      const isParticipant = isOakParticipant(guildId, userId);
      oakInfo = {
        canSummon: false, canStartHunt: false, huntRemaining: 0,
        canJoin: !isParticipant && oakEv.phase === 'summoning',
        canFight: isParticipant && oakEv.current_fighter === null,
        eventPhase: oakEv.phase,
        bossHp: oakEv.boss_hp,
        bossMaxHp: oakEv.boss_max_hp,
        participantCount: getOakParticipants(guildId).length,
        currentFighter: oakEv.current_fighter,
      };
    } else if (!bossSlain) {
      const hasPrereq = hasOakPrereq(guildId, userId);
      const relicCount = getItemQty(userId, guildId, 'ancient_relic');
      const huntRemaining = getOakHuntRemaining(guildId, userId);
      oakInfo = {
        canSummon: hasPrereq && relicCount >= 3,
        canStartHunt: !hasPrereq && !isOakHuntActive(guildId, userId),
        huntRemaining,
        canJoin: false, canFight: false, eventPhase: null,
        bossHp: 0, bossMaxHp: 0, participantCount: 0, currentFighter: null,
      };
    } else {
      oakInfo = {
        canSummon: false, canStartHunt: false, huntRemaining: 0,
        canJoin: false, canFight: false, eventPhase: null,
        bossHp: 0, bossMaxHp: 0, participantCount: 0, currentFighter: null,
        blockedReason: 'Ancient Oak đang hồi sinh',
      };
    }
  }

  const rows = buildExploreRows(userId, zone.safe, oakInfo, !!bossId && !bossSlain && player.zone_id !== 'forest' && player.zone_id !== 'shrine', player.zone_id === 'shrine' && !bossSlain);
  const { embed: zoneEmbed, files: zoneFiles } = withImage(embed, `zone_${player.zone_id}`);
  const reply = await interaction.editReply({ embeds: [zoneEmbed], files: zoneFiles, components: rows });

  let processing = false;
  const collector = reply.createMessageComponentCollector({ filter: onlyUser(userId), time: 90_000 });

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

    const cid = i.customId;

    if (cid === `ex_search_${userId}`) await handleSearch(interaction, userId, guildId);
    else if (cid === `ex_zone_${userId}`) await handleZonePicker(interaction, userId, guildId);
    else if (cid.startsWith(`ex_travel_${userId}_`)) {
      const zoneId = cid.replace(`ex_travel_${userId}_`, '');
      await handleTravel(interaction, userId, guildId, zoneId);
    }
    else if (cid === `ex_oak_hunt_${userId}`)   await handleOakHuntStart(interaction, userId, guildId);
    else if (cid === `ex_oak_summon_${userId}`) await handleOakSummon(interaction, userId, guildId);
    else if (cid === `ex_oak_join_${userId}`)   await handleOakJoin(interaction, userId, guildId);
    else if (cid === `ex_oak_fight_${userId}`)  await handleOakFight(interaction, userId, guildId);
    else if (cid === `ex_boss_summon_${userId}`) await handleBossSummon(interaction, userId, guildId);
    else if (cid === `ex_boss_join_${userId}`)   await handleBossJoin(interaction, userId, guildId);
    else if (cid === `ex_boss_leave_${userId}`)  await handleBossLeave(interaction, userId, guildId);
    else if (cid === `ex_boss_start_${userId}`)  await handleBossStart(interaction, userId, guildId);
    else if (cid === `ex_echo_gate_${userId}`)   await handleEchoGate(interaction, userId, guildId);
    else if (cid === `ex_gather_${userId}`)     await handleGather(interaction, userId, guildId);
    else if (cid === `vill_dist_merchant_${userId}`) await handleVillageService(interaction, userId, guildId, 'merchant');
    else if (cid === `vill_dist_hunter_${userId}`)   await handleVillageService(interaction, userId, guildId, 'hunter');
    else if (cid === `vill_dist_church_${userId}`)   await handleVillageService(interaction, userId, guildId, 'church');
    else if (cid === `vill_dist_shadow_${userId}`)   await handleVillageService(interaction, userId, guildId, 'shadow');
    else if (cid === `vill_dist_square_${userId}`)   await handleVillageService(interaction, userId, guildId, 'square');
    // Backward-compatible old village buttons, in case an older message is still live.
    else if (cid === `vill_shop_${userId}`)     await handleVillageService(interaction, userId, guildId, 'shop');
    else if (cid === `vill_smith_${userId}`)    await handleVillageService(interaction, userId, guildId, 'smith');
    else if (cid === `vill_tavern_${userId}`)   await handleVillageService(interaction, userId, guildId, 'tavern');
    else if (cid === `vill_board_${userId}`)    await handleVillageService(interaction, userId, guildId, 'board');
    else if (cid === `vill_hall_${userId}`)     await handleVillageService(interaction, userId, guildId, 'hall');
  });

  collector.on('end', (_c, reason) => {
    if (reason === 'time') reply.edit({ components: [] }).catch(() => {});
  });
}


async function showOakLockedLobby(
  interaction: ChatInputCommandInteraction,
  userId: string,
  guildId: string
): Promise<void> {
  const oakEv = getOakEvent(guildId);
  if (!oakEv) return showExploreMenu(interaction, userId, guildId);

  const participant = isOakParticipant(guildId, userId);
  const participants = getOakParticipants(guildId);
  const remaining = Math.max(0, oakEv.expires_at - Math.floor(Date.now() / 1000));
  const hpPct = oakEv.boss_max_hp > 0 ? Math.round((oakEv.boss_hp / oakEv.boss_max_hp) * 100) : 100;

  const embed = new EmbedBuilder()
    .setColor(0x2D7D46)
    .setTitle('🌳 Ancient Oak Đang Chặn Lối Rừng')
    .setDescription(
      'Cổ Mộc đã thức tỉnh. Rễ cây khổng lồ khóa chặt đường mòn — **không thể khám phá Forest cho đến khi sự kiện kết thúc.**\n\n' +
      (participant ? 'Bạn đã nằm trong đội săn. Hãy công kích khi đến lượt.' : 'Bấm **Tham Gia** để vào đội săn boss.')
    )
    .addFields(
      { name: '👤 Người triệu hồi', value: `<@${oakEv.summoner_id}>`, inline: true },
      { name: '🤝 Người tham gia', value: `${participants.length} người`, inline: true },
      { name: '⏳ Thời gian', value: oakEv.phase === 'summoning' ? `${Math.ceil(remaining / 60)} phút` : 'Đang giao chiến', inline: true },
      { name: '❤️ HP Boss', value: `${oakEv.boss_hp}/${oakEv.boss_max_hp} · ${hpPct}%`, inline: false },
      ...(oakEv.current_fighter ? [{ name: '⚔️ Đang giao chiến', value: `<@${oakEv.current_fighter}> đang giữ lượt đánh.`, inline: false }] : [])
    );

  const row = new ActionRowBuilder<ButtonBuilder>();
  if (!participant && oakEv.phase === 'summoning') {
    row.addComponents(new ButtonBuilder().setCustomId(`ex_oak_join_${userId}`).setLabel('Tham Gia Đánh Boss').setEmoji('🤝').setStyle(ButtonStyle.Primary));
  }
  if (participant) {
    row.addComponents(new ButtonBuilder().setCustomId(`ex_oak_fight_${userId}`).setLabel('Công Kích Ancient Oak').setEmoji('⚔️').setStyle(ButtonStyle.Danger).setDisabled(oakEv.current_fighter !== null));
  }
  if (row.components.length === 0) {
    row.addComponents(new ButtonBuilder().setCustomId(`ex_oak_wait_${userId}`).setLabel('Boss đang hoạt động').setEmoji('🌳').setStyle(ButtonStyle.Secondary).setDisabled(true));
  }

  const reply = await interaction.editReply({ embeds: [embed], components: [row] });
  const collector = reply.createMessageComponentCollector({ filter: onlyUser(userId), time: 90_000 });
  collector.on('collect', async (i) => {
    const ok = await i.deferUpdate().then(() => true).catch(() => false);
    if (!ok) return;
    await reply.edit({ components: [] }).catch(() => {});
    collector.stop('action');
    if (i.customId === `ex_oak_join_${userId}`) await handleOakJoin(interaction, userId, guildId);
    else if (i.customId === `ex_oak_fight_${userId}`) await handleOakFight(interaction, userId, guildId);
  });
  collector.on('end', (_c, reason) => { if (reason === 'time') reply.edit({ components: [] }).catch(() => {}); });
}

async function showBossLockedLobby(
  interaction: ChatInputCommandInteraction,
  userId: string,
  guildId: string
): Promise<void> {
  const player = applyPassiveStats(getPlayer(userId, guildId)!);
  const zone = getZone(player.zone_id)!;
  const encounter = getBossEncounter(guildId, player.zone_id);
  if (!encounter) return showExploreMenu(interaction, userId, guildId);
  const boss = getEnemy(encounter.bossId);
  if (!boss) return showExploreMenu(interaction, userId, guildId);

  const joined = isBossEncounterParticipant(encounter, userId);
  const isSummoner = encounter.summonerId === userId;
  const remaining = getBossEncounterRemaining(encounter);
  const names = encounter.participantIds.map(id => `<@${id}>`).join('\n') || '*Chưa có ai*';

  const embed = new EmbedBuilder()
    .setColor(zone.color)
    .setTitle(`${boss.icon ?? '👑'} ${boss.name} Đã Xuất Hiện`)
    .setDescription(
      `Không khí trong **${zone.name}** bị ép xuống như trước một cơn bão. **Khám phá tạm khóa** cho đến khi boss bị hạ hoặc biến mất.\n\n` +
      (joined ? 'Bạn đã tham gia đội hình. Người gọi boss có thể bắt đầu trận.' : 'Bấm **Tham Gia** để vào đội hình đánh boss.')
    )
    .addFields(
      { name: '👤 Người gọi boss', value: `<@${encounter.summonerId}>`, inline: true },
      { name: '🤝 Đội hình', value: `${encounter.participantIds.length}/4`, inline: true },
      { name: '⏳ Còn lại', value: `${Math.ceil(remaining / 60)} phút`, inline: true },
      { name: '📜 Thành viên', value: names, inline: false }
    );

  const row = new ActionRowBuilder<ButtonBuilder>();
  if (!joined) {
    row.addComponents(new ButtonBuilder().setCustomId(`ex_boss_join_${userId}`).setLabel('Tham Gia Đánh Boss').setEmoji('🤝').setStyle(ButtonStyle.Primary));
  } else {
    row.addComponents(new ButtonBuilder().setCustomId(`ex_boss_leave_${userId}`).setLabel('Rời Đội').setEmoji('🚪').setStyle(ButtonStyle.Secondary));
  }
  row.addComponents(new ButtonBuilder().setCustomId(`ex_boss_start_${userId}`).setLabel(isSummoner ? 'Bắt Đầu Boss Fight' : 'Chờ Người Gọi Boss').setEmoji('⚔️').setStyle(ButtonStyle.Danger).setDisabled(!isSummoner));

  const reply = await interaction.editReply({ embeds: [embed], components: [row] });
  const collector = reply.createMessageComponentCollector({ filter: onlyUser(userId), time: 90_000 });
  collector.on('collect', async (i) => {
    const ok = await i.deferUpdate().then(() => true).catch(() => false);
    if (!ok) return;
    await reply.edit({ components: [] }).catch(() => {});
    collector.stop('action');
    if (i.customId === `ex_boss_join_${userId}`) await handleBossJoin(interaction, userId, guildId);
    else if (i.customId === `ex_boss_leave_${userId}`) await handleBossLeave(interaction, userId, guildId);
    else if (i.customId === `ex_boss_start_${userId}`) await handleBossStart(interaction, userId, guildId);
  });
  collector.on('end', (_c, reason) => { if (reason === 'time') reply.edit({ components: [] }).catch(() => {}); });
}

function buildExploreRows(
  userId: string, isSafe: boolean,
  oakInfo?: OakButtonInfo | null,
  canSummonZoneBoss = false,
  showEchoGate = false
) {
  const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`ex_search_${userId}`)
      .setLabel('Khám phá').setEmoji('🗺️').setStyle(ButtonStyle.Primary).setDisabled(isSafe),
    new ButtonBuilder().setCustomId(`ex_zone_${userId}`)
      .setLabel('Zone').setEmoji('🗺️').setStyle(ButtonStyle.Secondary)
  );

  if (!isSafe) {
    row1.addComponents(
      new ButtonBuilder().setCustomId(`ex_gather_${userId}`)
        .setLabel('Thu thập').setEmoji('🌿').setStyle(ButtonStyle.Success)
    );

    const rows: ActionRowBuilder<ButtonBuilder>[] = [row1];
    if (canSummonZoneBoss) {
      rows.push(new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId(`ex_boss_summon_${userId}`)
          .setLabel('Gọi Boss Khu Vực').setEmoji('👑').setStyle(ButtonStyle.Danger)
      ));
    }

    if (showEchoGate) {
      rows.push(new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId(`ex_echo_gate_${userId}`)
          .setLabel('Cổng Phong Ấn').setEmoji('👁️').setStyle(ButtonStyle.Secondary)
      ));
    }

    if (oakInfo) {
      const oakRow = new ActionRowBuilder<ButtonBuilder>();
      if (oakInfo.blockedReason) {
        oakRow.addComponents(
          new ButtonBuilder().setCustomId(`ex_oak_blocked_${userId}`)
            .setLabel(oakInfo.blockedReason).setEmoji('🌳').setStyle(ButtonStyle.Secondary).setDisabled(true)
        );
      }
      if (oakInfo.huntRemaining > 0) {
        oakRow.addComponents(
          new ButtonBuilder().setCustomId(`ex_oak_hunt_${userId}`)
            .setLabel(`Đang Truy Tìm (còn ${oakInfo.huntRemaining})`).setEmoji('🐾').setStyle(ButtonStyle.Secondary).setDisabled(true)
        );
      }
      if (oakInfo.canSummon) {
        oakRow.addComponents(
          new ButtonBuilder().setCustomId(`ex_oak_summon_${userId}`)
            .setLabel('Thức Tỉnh Cổ Mộc').setEmoji('🌳').setStyle(ButtonStyle.Success)
        );
      }
      if (oakInfo.canJoin) {
        oakRow.addComponents(
          new ButtonBuilder().setCustomId(`ex_oak_join_${userId}`)
            .setLabel(`Tham Gia (${oakInfo.participantCount} người)`).setEmoji('🤝').setStyle(ButtonStyle.Primary)
        );
      }
      if (oakInfo.canFight) {
        const hpPct = oakInfo.bossMaxHp > 0 ? Math.round(oakInfo.bossHp / oakInfo.bossMaxHp * 100) : 100;
        oakRow.addComponents(
          new ButtonBuilder().setCustomId(`ex_oak_fight_${userId}`)
            .setLabel(`Công Kích (${oakInfo.bossHp}/${oakInfo.bossMaxHp} HP · ${hpPct}%)`).setEmoji('⚔️').setStyle(ButtonStyle.Danger)
        );
      }
      if (oakRow.components.length > 0) rows.push(oakRow);
    }
    return rows;
  }

  const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`vill_dist_merchant_${userId}`)
      .setLabel('Thương Hội').setEmoji('⚖️').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`vill_dist_hunter_${userId}`)
      .setLabel('Thợ Săn').setEmoji('⚔️').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`vill_dist_church_${userId}`)
      .setLabel('Thánh Đường').setEmoji('⛪').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`vill_dist_shadow_${userId}`)
      .setLabel('Hẻm Tối').setEmoji('🌑').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`vill_dist_square_${userId}`)
      .setLabel('Quảng Trường').setEmoji('🪵').setStyle(ButtonStyle.Secondary)
  );
  return [row1, row2];
}

async function handleZonePicker(
  interaction: ChatInputCommandInteraction, userId: string, guildId: string
): Promise<void> {
  if (!(await ensurePlayerAlive(interaction, userId, guildId))) return;
  if (await blockIfPartyMember(interaction, userId, guildId)) return;

  const player = getPlayer(userId, guildId)!;
  const currentIdx = ZONE_ORDER.indexOf(player.zone_id);
  const options = Object.values(ZONES).map(z => {
    const current = z.id === player.zone_id;
    const targetIdx = ZONE_ORDER.indexOf(z.id);

    let desc: string;
    if (current) {
      desc = '📍 Đang ở đây';
    } else if (player.level < z.minLevel) {
      desc = `🔒 Cần Lv.${z.minLevel}`;
    } else if (targetIdx > currentIdx) {
      let blockingBoss: string | null = null;
      for (let i = currentIdx; i < targetIdx; i++) {
        const gz = ZONES[ZONE_ORDER[i]];
        if (gz?.bossId && !hasPlayerClearedBoss(guildId, userId, gz.bossId)) {
          const b = getEnemy(gz.bossId);
          blockingBoss = `${b?.icon ?? '🔒'} ${b?.name ?? gz.bossId}`;
          break;
        }
      }
      desc = blockingBoss ? `🔒 Hạ ${blockingBoss}` : z.travelCost > 0 ? `Chi phí: ${z.travelCost} 🪙` : 'Miễn phí';
    } else {
      desc = z.travelCost > 0 ? `Chi phí: ${z.travelCost} 🪙` : 'Miễn phí';
    }

    return new StringSelectMenuOptionBuilder()
      .setLabel(`${z.icon} ${z.name}`)
      .setDescription(desc)
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

async function showTravelBlocked(
  interaction: ChatInputCommandInteraction, userId: string, guildId: string, embed: EmbedBuilder
): Promise<void> {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`ex_zoneback_${userId}`)
      .setLabel('◀ Chọn lại khu vực')
      .setStyle(ButtonStyle.Secondary)
  );

  const reply = await interaction.editReply({ embeds: [embed], components: [row] });

  const btn = await reply.awaitMessageComponent({
    componentType: ComponentType.Button,
    filter: onlyUser(userId),
    time: 30_000
  }).catch(() => null);

  if (!btn) { await interaction.editReply({ components: [] }).catch(() => {}); return; }
  const deferred = await btn.deferUpdate().then(() => true).catch(() => false);
  if (!deferred) return;
  await handleZonePicker(interaction, userId, guildId);
}

async function handleTravel(
  interaction: ChatInputCommandInteraction, userId: string, guildId: string, targetId: string
): Promise<void> {
  if (!(await ensurePlayerAlive(interaction, userId, guildId))) return;
  if (await blockIfPartyMember(interaction, userId, guildId)) return;

  const player = getPlayer(userId, guildId)!;
  const target = ZONES[targetId];
  if (!target) return;

  if (targetId === player.zone_id) {
    await interaction.editReply({ embeds: [simpleEmbed(COLORS.info, `Bạn đang ở **${target.icon} ${target.name}** rồi!`)], components: [] });
    return;
  }

  const targetIdx = ZONE_ORDER.indexOf(targetId);
  const currentIdx = ZONE_ORDER.indexOf(player.zone_id);
  if (targetIdx > currentIdx) {
    for (let i = currentIdx; i < targetIdx; i++) {
      const gateZone = ZONES[ZONE_ORDER[i]];
      if (gateZone?.bossId && !hasPlayerClearedBoss(guildId, userId, gateZone.bossId)) {
        await showTravelBlocked(interaction, userId, guildId, simpleEmbed(COLORS.danger,
          `🔒 **${target.icon} ${target.name}** bị khóa.\n\nBạn cần hạ gục boss **${gateZone.icon} ${gateZone.name}** trước.`
        ));
        return;
      }
    }
  }

  if (player.level < target.minLevel) {
    await showTravelBlocked(interaction, userId, guildId, simpleEmbed(COLORS.warning, `Cần **Lv.${target.minLevel}** để vào **${target.name}**! (Bạn: Lv.${player.level})`));
    return;
  }
  if (target.travelCost > 0 && player.gold < target.travelCost) {
    await showTravelBlocked(interaction, userId, guildId, simpleEmbed(COLORS.warning, `Cần **${target.travelCost} 🪙** để đến **${target.name}**! (Bạn có: ${player.gold} 🪙)`));
    return;
  }

  if (target.travelCost > 0) spendGold(userId, guildId, target.travelCost);
  setZone(userId, guildId, targetId);
  await showExploreMenu(interaction, userId, guildId);
}

async function handleVillageService(
  interaction: ChatInputCommandInteraction,
  userId: string, guildId: string,
  service: 'shop' | 'smith' | 'tavern' | 'board' | 'hall' | 'merchant' | 'hunter' | 'church' | 'shadow' | 'square'
): Promise<void> {
  if (!(await ensurePlayerAlive(interaction, userId, guildId))) return;

  let backHandled = false;

  const runService = async () => {
    if (service === 'shop') await showVillageShop(interaction, userId, guildId);
    else if (service === 'smith') await showVillageBlacksmith(interaction, userId, guildId);
    else if (service === 'tavern') await showVillageTavern(interaction, userId, guildId);
    else if (service === 'board') await showVillageBoard(interaction, userId, guildId);
    else if (service === 'hall') await showVillageHall(interaction, userId, guildId);
    else if (service === 'merchant') await showMerchantGuildDistrict(interaction, userId, guildId);
    else if (service === 'hunter') await showHuntersGuildDistrict(interaction, userId, guildId);
    else if (service === 'church') await showOldChurchDistrict(interaction, userId, guildId);
    else if (service === 'shadow') await showShadowCourtDistrict(interaction, userId, guildId);
    else if (service === 'square') await showTownSquareDistrict(interaction, userId, guildId);
  };

  if (['merchant', 'hunter', 'church', 'shadow', 'square'].includes(service)) {
    const intercepted = await maybeShowVillageEncounter(interaction, userId, guildId);
    if (intercepted) {
      // Random village encounters own the current reply. The usual back handler below
      // will still return the user to the explore/village screen when possible.
    } else {
      await runService();
    }
  } else {
    await runService();
  }

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
    await back.deferUpdate().catch(() => {});
    await showExploreMenu(interaction, userId, guildId);
  }
}

async function handleGather(
  interaction: ChatInputCommandInteraction, userId: string, guildId: string
): Promise<void> {
  if (!(await ensurePlayerAlive(interaction, userId, guildId))) return;
  const player = getPlayer(userId, guildId)!;
  const { embed } = doGather(userId, guildId, player.name);
  const reply = await interaction.editReply({ embeds: [embed], components: buildContinueExploreRow(userId) });
  attachContinueExploreHandler(reply, interaction, userId, guildId);
}
