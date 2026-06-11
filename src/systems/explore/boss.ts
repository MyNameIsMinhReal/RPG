import {
  ChatInputCommandInteraction, EmbedBuilder, ButtonInteraction, Message,
  ActionRowBuilder, ButtonBuilder, ButtonStyle
} from 'discord.js';
import {
  getPlayer, getItemQty, removeItem, updatePlayerHpMp,
  grantGold, grantExp, grantSoulShards, addItem
} from '../player';
import { getZone } from '../../data/zones';
import { getEnemy } from '../../data/enemies';
import { setExploreCooldown } from '../economy';
import {
  startCombatFlow, startCombatFlowWithEnemy, type CombatVictoryHandler, type CombatDeathHandler, type CombatFleeHandler
} from '../combatFlow';
import { startPartyCombatFlow, startPartyCombatFlowWithEnemy } from '../partyCombatFlow';
import { processDeathPenalty } from '../rewards';
import {
  logEvent, setFlag, deleteFlag, markPlayerClearedBoss, isBossSlain
} from '../world';
import {
  getOakEvent, createOakEvent, joinOakEvent, isOakParticipant, getOakParticipants,
  addOakDamage, updateOakBossHp, setOakCurrentFighter, activateOakEvent,
  closeOakEvent, clearOakParticipants, hasOakPrereq,
  OAK_RESPAWN_TTL,
  startOakHunt, isOakHuntActive, getOakHuntRemaining, OAK_HUNT_EXPLORES
} from '../oakEvent';
import { COLORS, buildDeathEmbed } from '../../utils/embeds';
import { onlyUser } from '../../utils/collectors';
import { withImage } from '../../utils/eventImages';
import { handleVictory, handleDeath, handleFlee } from './callbacks';
import {
  ensurePlayerAlive, buildContinueExploreRow, buildOakSummonedRow, attachContinueExploreHandler, simpleEmbed
} from './shared';
import { getReadyPartyMemberIds } from './partyHelpers';
import { awardAchievements } from '../achievements';
import { recordEchoGateOpened, recordMirrorShadeAfterMirrorSigil, maybeRewardEchoDemonPet } from '../shrineAchievements';
import { getCombatByUser } from '../combat';
import {
  BOSS_MAX_PARTICIPANTS, allBossEncounterParticipantsHaveRoles, clearBossEncounter, createBossEncounter, getBossEncounter,
  getBossEncounterRemaining, isBossEncounterParticipant, joinBossEncounter, leaveBossEncounter,
  setBossEncounterActive, setBossEncounterRole, type BossEncounter
} from '../bossEncounter';
import { unlockRecipesBySource } from '../crafting';
import { adjustCorruption, getCorruptionLevel } from '../corruption';
import {
  ECHO_KEY_ITEMS, ECHO_ROLES, ECHO_SEALS, type EchoRoleId, type EchoSealId,
  echoRoleLabel, getEchoRitualSnapshot, markEchoSealBroken
} from '../echoDemonRitual';

export async function handleBoss(
  interaction: ChatInputCommandInteraction, userId: string, guildId: string
): Promise<void> {
  // Backward-compatible entry point. Old callers that used to start a boss
  // directly now open the shared boss lobby first, so zone exploration is locked
  // and other players can join.
  await handleBossSummon(interaction, userId, guildId);
}

function buildBossLobbyRow(userId: string, encounter: BossEncounter) {
  const joined = isBossEncounterParticipant(encounter, userId);
  const isSummoner = encounter.summonerId === userId;
  const rows: ActionRowBuilder<ButtonBuilder>[] = [];
  const main = new ActionRowBuilder<ButtonBuilder>();

  if (!joined) {
    main.addComponents(
      new ButtonBuilder().setCustomId(`ex_boss_join_${userId}`)
        .setLabel('Tham Gia Đánh Boss').setEmoji('🤝').setStyle(ButtonStyle.Primary)
    );
  } else {
    main.addComponents(
      new ButtonBuilder().setCustomId(`ex_boss_leave_${userId}`)
        .setLabel('Rời Đội').setEmoji('🚪').setStyle(ButtonStyle.Secondary)
    );
  }

  const rolesReady = allBossEncounterParticipantsHaveRoles(encounter);
  main.addComponents(
    new ButtonBuilder().setCustomId(`ex_boss_start_${userId}`)
      .setLabel(isSummoner ? (rolesReady ? 'Bắt Đầu Boss Fight' : 'Chờ Chọn Vai Trò') : 'Chờ Người Gọi Boss')
      .setEmoji('⚔️').setStyle(ButtonStyle.Danger).setDisabled(!isSummoner || !rolesReady)
  );
  rows.push(main);

  if (encounter.bossId === 'echo_demon' && joined) {
    const roleRow = new ActionRowBuilder<ButtonBuilder>();
    (Object.keys(ECHO_ROLES) as EchoRoleId[]).forEach(role => {
      const info = ECHO_ROLES[role];
      const picked = encounter.participantRoles?.[userId] === role;
      roleRow.addComponents(
        new ButtonBuilder()
          .setCustomId(`ex_boss_role_${userId}_${role}`)
          .setLabel(picked ? `✓ ${info.short}` : info.short)
          .setEmoji(info.icon)
          .setStyle(picked ? ButtonStyle.Success : ButtonStyle.Secondary)
      );
    });
    rows.push(roleRow);
  }

  return rows;
}

export async function showBossLobbyPrompt(
  interaction: ChatInputCommandInteraction,
  userId: string,
  guildId: string,
  encounter: BossEncounter,
  note?: string
): Promise<void> {
  const boss = getEnemy(encounter.bossId);
  const zone = getZone(encounter.zoneId);
  if (!boss || !zone) {
    clearBossEncounter(guildId, encounter.zoneId);
    await interaction.editReply({ embeds: [simpleEmbed(COLORS.warning, 'Boss lobby bị lỗi dữ liệu và đã được đóng.')], components: [] });
    return;
  }

  const remaining = getBossEncounterRemaining(encounter);
  const members = encounter.participantIds.map(id => encounter.bossId === 'echo_demon' ? `<@${id}> — ${echoRoleLabel(encounter.participantRoles?.[id])}` : `<@${id}>`).join('\n') || '*Chưa có ai*';
  const joined = isBossEncounterParticipant(encounter, userId);
  const embed = new EmbedBuilder()
    .setColor(zone.color)
    .setTitle(`${boss.icon ?? '👑'} ${boss.name} Đã Được Gọi Ra`)
    .setDescription(
      `${note ? `${note}\n\n` : ''}` +
      `Boss đang hiện diện tại **${zone.name}**. Trong lúc lobby còn mở, người chơi ở khu vực này **không thể explore** — chỉ có thể tham gia hoặc chờ boss biến mất.\n\n` +
      (joined ? 'Bạn đã nằm trong đội hình boss.' : 'Bấm **Tham Gia Đánh Boss** để vào đội hình.')
    )
    .addFields(
      { name: '👤 Người gọi boss', value: `<@${encounter.summonerId}>`, inline: true },
      { name: '🤝 Đội hình', value: `${encounter.participantIds.length}/${BOSS_MAX_PARTICIPANTS}`, inline: true },
      { name: '⏳ Còn lại', value: `${Math.ceil(remaining / 60)} phút`, inline: true },
      { name: encounter.bossId === 'echo_demon' ? '📜 Thành viên & Vai Trò' : '📜 Thành viên', value: members, inline: false },
      ...(encounter.bossId === 'echo_demon' && encounter.echoRitual ? [{ name: '⛩️ Nghi Lễ', value: `Phong ấn phá: **${encounter.echoRitual.sealsBroken}/3** · Độ ổn định: **${encounter.echoRitual.ritualScore}/4** · Corruption: **${encounter.echoRitual.corruption}**`, inline: false }] : [])
    );

  const reply = await interaction.editReply({ embeds: [embed], components: buildBossLobbyRow(userId, encounter) });
  const collector = reply.createMessageComponentCollector({ filter: onlyUser(userId), time: 90_000 });
  collector.on('collect', async (i) => {
    const ok = await i.deferUpdate().then(() => true).catch(() => false);
    if (!ok) return;
    await reply.edit({ components: [] }).catch(() => {});
    collector.stop('action');
    if (i.customId === `ex_boss_join_${userId}`) await handleBossJoin(interaction, userId, guildId);
    else if (i.customId === `ex_boss_leave_${userId}`) await handleBossLeave(interaction, userId, guildId);
    else if (i.customId === `ex_boss_start_${userId}`) await handleBossStart(interaction, userId, guildId);
    else if (i.customId.startsWith(`ex_boss_role_${userId}_`)) {
      const role = i.customId.replace(`ex_boss_role_${userId}_`, '') as EchoRoleId;
      await handleBossRole(interaction, userId, guildId, role);
    }
  });
  collector.on('end', (_c, reason) => { if (reason === 'time') reply.edit({ components: [] }).catch(() => {}); });
}

export async function handleBossSummon(
  interaction: ChatInputCommandInteraction,
  userId: string,
  guildId: string
): Promise<void> {
  if (!(await ensurePlayerAlive(interaction, userId, guildId))) return;
  const player = getPlayer(userId, guildId)!;
  const zone = getZone(player.zone_id)!;

  if (player.zone_id === 'forest') {
    const reply = await interaction.editReply({ embeds: [simpleEmbed(COLORS.warning, '🌳 Boss rừng dùng nghi thức riêng: hãy mở route **Ancient Oak** trong Forest.')], components: buildContinueExploreRow(userId) });
    attachContinueExploreHandler(reply, interaction, userId, guildId);
    return;
  }
  if (!zone.bossId) {
    const reply = await interaction.editReply({ embeds: [simpleEmbed(COLORS.warning, 'Khu vực này chưa có boss khu vực.')], components: buildContinueExploreRow(userId) });
    attachContinueExploreHandler(reply, interaction, userId, guildId);
    return;
  }
  if (isBossSlain(guildId, zone.bossId)) {
    const boss = getEnemy(zone.bossId);
    const reply = await interaction.editReply({ embeds: [simpleEmbed(COLORS.warning, `${boss?.icon ?? '👑'} **${boss?.name ?? zone.bossId}** đang trong thời gian hồi phục/phong ấn.`)], components: buildContinueExploreRow(userId) });
    attachContinueExploreHandler(reply, interaction, userId, guildId);
    return;
  }
  if (getCombatByUser(userId, guildId)) {
    const reply = await interaction.editReply({ embeds: [simpleEmbed(COLORS.warning, 'Bạn đang có combat chưa kết thúc, không thể gọi boss mới.')], components: buildContinueExploreRow(userId) });
    attachContinueExploreHandler(reply, interaction, userId, guildId);
    return;
  }

  if (player.zone_id === 'shrine' && zone.bossId === 'echo_demon') {
    await showEchoSealGate(interaction, userId, guildId);
    return;
  }

  const existing = getBossEncounter(guildId, player.zone_id);
  const encounter = existing ?? createBossEncounter(guildId, player.zone_id, zone.bossId, userId);
  setExploreCooldown(userId, guildId);
  await showBossLobbyPrompt(interaction, userId, guildId, encounter, existing ? '⚠️ Boss lobby đã tồn tại, bạn được đưa về sảnh boss.' : '👑 Một luồng khí nặng nề tràn qua khu vực...');
}

export async function handleBossJoin(
  interaction: ChatInputCommandInteraction,
  userId: string,
  guildId: string
): Promise<void> {
  if (!(await ensurePlayerAlive(interaction, userId, guildId))) return;
  const player = getPlayer(userId, guildId)!;
  const encounter = getBossEncounter(guildId, player.zone_id);
  if (!encounter) {
    const reply = await interaction.editReply({ embeds: [simpleEmbed(COLORS.warning, 'Boss lobby đã biến mất. Khu vực đã mở lại.')], components: buildContinueExploreRow(userId) });
    attachContinueExploreHandler(reply, interaction, userId, guildId);
    return;
  }
  if (getCombatByUser(userId, guildId)) {
    await showBossLobbyPrompt(interaction, userId, guildId, encounter, '⚠️ Bạn đang có combat khác nên chưa thể tham gia boss.');
    return;
  }
  if (encounter.participantIds.length >= BOSS_MAX_PARTICIPANTS && !encounter.participantIds.includes(userId)) {
    await showBossLobbyPrompt(interaction, userId, guildId, encounter, '⚠️ Đội hình boss đã đầy.');
    return;
  }
  const joined = joinBossEncounter(guildId, player.zone_id, userId) ?? encounter;
  await showBossLobbyPrompt(interaction, userId, guildId, joined, '🤝 Bạn đã gia nhập đội hình boss.');
}

export async function handleBossLeave(
  interaction: ChatInputCommandInteraction,
  userId: string,
  guildId: string
): Promise<void> {
  if (!(await ensurePlayerAlive(interaction, userId, guildId))) return;
  const player = getPlayer(userId, guildId)!;
  const before = getBossEncounter(guildId, player.zone_id);
  if (!before) {
    const reply = await interaction.editReply({ embeds: [simpleEmbed(COLORS.info, 'Boss lobby không còn hoạt động.')], components: buildContinueExploreRow(userId) });
    attachContinueExploreHandler(reply, interaction, userId, guildId);
    return;
  }
  const after = leaveBossEncounter(guildId, player.zone_id, userId);
  if (!after) {
    const reply = await interaction.editReply({ embeds: [simpleEmbed(COLORS.warning, before.summonerId === userId ? '🚪 Người gọi boss đã rời đội. Boss lobby bị hủy, khu vực mở lại.' : '🚪 Bạn đã rời đội boss. Boss lobby đã đóng.')], components: buildContinueExploreRow(userId) });
    attachContinueExploreHandler(reply, interaction, userId, guildId);
    return;
  }
  await showBossLobbyPrompt(interaction, userId, guildId, after, '🚪 Bạn đã rời đội boss.');
}


export async function handleBossRole(
  interaction: ChatInputCommandInteraction,
  userId: string,
  guildId: string,
  role: EchoRoleId
): Promise<void> {
  if (!(await ensurePlayerAlive(interaction, userId, guildId))) return;
  const player = getPlayer(userId, guildId)!;
  const encounter = getBossEncounter(guildId, player.zone_id);
  if (!encounter || encounter.bossId !== 'echo_demon') {
    const reply = await interaction.editReply({ embeds: [simpleEmbed(COLORS.warning, 'Không có nghi lễ Echo Demon nào đang mở.')], components: buildContinueExploreRow(userId) });
    attachContinueExploreHandler(reply, interaction, userId, guildId);
    return;
  }
  if (!ECHO_ROLES[role] || !encounter.participantIds.includes(userId)) {
    await showBossLobbyPrompt(interaction, userId, guildId, encounter, '⚠️ Bạn cần tham gia lobby trước khi chọn vai trò.');
    return;
  }
  const updated = setBossEncounterRole(guildId, encounter.zoneId, userId, role) ?? encounter;
  await showBossLobbyPrompt(interaction, userId, guildId, updated, `${ECHO_ROLES[role].icon} Bạn đã chọn **${ECHO_ROLES[role].name}**.`);
}

export async function handleBossStart(
  interaction: ChatInputCommandInteraction,
  userId: string,
  guildId: string
): Promise<void> {
  if (!(await ensurePlayerAlive(interaction, userId, guildId))) return;
  const player = getPlayer(userId, guildId)!;
  const encounter = getBossEncounter(guildId, player.zone_id);
  if (!encounter) {
    const reply = await interaction.editReply({ embeds: [simpleEmbed(COLORS.warning, 'Boss lobby đã hết hạn hoặc bị hủy.')], components: buildContinueExploreRow(userId) });
    attachContinueExploreHandler(reply, interaction, userId, guildId);
    return;
  }
  if (encounter.summonerId !== userId) {
    await showBossLobbyPrompt(interaction, userId, guildId, encounter, '⚠️ Chỉ người gọi boss mới có thể bắt đầu trận.');
    return;
  }

  const memberIds = encounter.participantIds.filter(uid => {
    const p = getPlayer(uid, guildId);
    return !!p?.alive && p.zone_id === encounter.zoneId && !getCombatByUser(uid, guildId);
  });
  if (!memberIds.includes(userId)) memberIds.unshift(userId);
  const cleanMemberIds = [...new Set(memberIds)].slice(0, BOSS_MAX_PARTICIPANTS);
  if (cleanMemberIds.length === 0) {
    clearBossEncounter(guildId, encounter.zoneId);
    const reply = await interaction.editReply({ embeds: [simpleEmbed(COLORS.warning, 'Không còn ai đủ điều kiện đánh boss. Lobby đã bị hủy.')], components: buildContinueExploreRow(userId) });
    attachContinueExploreHandler(reply, interaction, userId, guildId);
    return;
  }

  if (encounter.bossId === 'echo_demon' && !allBossEncounterParticipantsHaveRoles(encounter)) {
    await showBossLobbyPrompt(interaction, userId, guildId, encounter, '⚠️ Echo Demon cần mỗi người chọn **1 vai trò nghi lễ** trước khi bắt đầu.');
    return;
  }

  setBossEncounterActive(guildId, encounter.zoneId);
  setExploreCooldown(userId, guildId);

  const echoEnemy = encounter.bossId === 'echo_demon' ? buildEchoDemonEnemyForEncounter(encounter) : null;

  if (cleanMemberIds.length > 1) {
    if (echoEnemy) {
      await startPartyCombatFlowWithEnemy(
        interaction,
        userId,
        guildId,
        cleanMemberIds,
        echoEnemy,
        async (members) => {
          // Rare Shrine pets can drop from Echo Demon for surviving party members too.
          for (const member of members) {
            if (member.alive) maybeRewardEchoDemonPet(member.user_id, guildId);
          }
          clearBossEncounter(guildId, encounter.zoneId);
        },
        async () => { clearBossEncounter(guildId, encounter.zoneId); },
        { grantDefaultRewards: true }
      );
      return;
    }
    await startPartyCombatFlow(
      interaction,
      userId,
      guildId,
      cleanMemberIds,
      encounter.bossId,
      async () => { clearBossEncounter(guildId, encounter.zoneId); },
      async () => { clearBossEncounter(guildId, encounter.zoneId); }
    );
    return;
  }

  const clearAndVictory: CombatVictoryHandler = async (itr, btnInt, uid, gid, p, enemy, state) => {
    try {
      if (enemy?.id === 'echo_demon') {
        const extra = maybeRewardEchoDemonPet(uid, gid);
        if (extra.length) {
          try {
            const logs = JSON.parse(state.combat_log ?? '[]');
            state.combat_log = JSON.stringify([...logs, ...extra]);
          } catch {}
        }
      }
      await handleVictory(itr, btnInt, uid, gid, p, enemy, state);
    }
    finally { clearBossEncounter(gid, encounter.zoneId); }
  };
  const clearAndDeath: CombatDeathHandler = async (itr, btnInt, uid, gid, p, enemy, remainingEnemyHp) => {
    try { await handleDeath(itr, btnInt, uid, gid, p, enemy); }
    finally { clearBossEncounter(gid, encounter.zoneId); }
  };
  const clearAndFlee: CombatFleeHandler = async (itr, btnInt, uid, gid, p, enemy, state, logLines) => {
    try { await handleFlee(itr, btnInt, uid, gid, p, enemy, state, logLines); }
    finally { clearBossEncounter(gid, encounter.zoneId); }
  };

  if (echoEnemy) {
    await startCombatFlowWithEnemy(interaction, userId, guildId, echoEnemy, undefined, clearAndVictory, clearAndDeath, clearAndFlee);
  } else {
    await startCombatFlow(interaction, userId, guildId, encounter.bossId, clearAndVictory, clearAndDeath, clearAndFlee);
  }
}

function buildEchoGateChecklist(userId: string, guildId: string): string {
  const p = getEchoRitualSnapshot(guildId, userId);
  const yesNo = (ok: boolean) => ok ? '✅' : '❌';
  return [
    '🔑 **Chìa Khóa Nghi Lễ**',
    `${yesNo(p.hasEchoTrace)} 👁️ Echo Trace`,
    `${yesNo(p.hasSoulCandle)} 🕯️ Soul Candle`,
    `${yesNo(p.hasMirrorSigil)} 🪞 Mirror Sigil`,
    '',
    '🔒 **Phong Ấn Phụ**',
    `${p.seals.stone ? '✅' : '❌'} 🗿 Ấn Đá — Broken Guardian`,
    `${p.seals.candle ? '✅' : '❌'} 🕯️ Ấn Nến — Wraith Priest`,
    `${p.seals.mirror ? '✅' : '❌'} 🪞 Ấn Gương — Mirror Shade`,
    '',
    `${p.hasPurifyingSalt ? '✅' : '❌'} 🧂 Purifying Salt x1`,
    `${p.corruption < 70 ? '✅' : '❌'} 🌘 Corruption: ${p.corruption}/70`,
    '',
    p.canStartRitual
      ? '🕯️ **Cổng đã phản ứng. Có thể bắt đầu Nghi Lễ Giữ Phong Ấn.**'
      : `Còn thiếu: ${p.missing.map(x => `**${x}**`).join(', ')}`,
    p.sealsBroken > 0 ? `\n⚠️ Đã phá **${p.sealsBroken}/3** phong ấn. Càng phá nhiều, Echo Demon càng ít được buff.` : '\n⚠️ Bạn cần phá ít nhất **1/3** phong ấn để mở cổng.',
  ].join('\n');
}

function buildEchoGateRows(userId: string, guildId: string): ActionRowBuilder<ButtonBuilder>[] {
  const p = getEchoRitualSnapshot(guildId, userId);
  const rows: ActionRowBuilder<ButtonBuilder>[] = [];
  rows.push(new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`echo_ritual_${userId}`).setLabel('Bắt Đầu Nghi Lễ').setEmoji('🕯️').setStyle(ButtonStyle.Success).setDisabled(!p.canStartRitual),
    new ButtonBuilder().setCustomId(`echo_back_${userId}`).setLabel('Quay lại').setEmoji('↩️').setStyle(ButtonStyle.Secondary),
  ));
  const sealRow = new ActionRowBuilder<ButtonBuilder>();
  (Object.keys(ECHO_SEALS) as EchoSealId[]).forEach(seal => {
    const info = ECHO_SEALS[seal];
    sealRow.addComponents(
      new ButtonBuilder().setCustomId(`echo_seal_${userId}_${seal}`)
        .setLabel(p.seals[seal] ? `${info.name} đã phá` : `Thách Đấu ${info.name}`)
        .setEmoji(info.icon).setStyle(p.seals[seal] ? ButtonStyle.Secondary : ButtonStyle.Danger).setDisabled(p.seals[seal])
    );
  });
  rows.push(sealRow);
  return rows;
}

export async function showEchoSealGate(
  interaction: ChatInputCommandInteraction,
  userId: string,
  guildId: string,
  note?: string
): Promise<void> {
  if (!(await ensurePlayerAlive(interaction, userId, guildId))) return;
  const player = getPlayer(userId, guildId)!;
  if (player.zone_id !== 'shrine') {
    const reply = await interaction.editReply({ embeds: [simpleEmbed(COLORS.warning, '⛩️ Bạn phải đứng trong **Đền Cổ** mới chạm được Cổng Phong Ấn.')], components: buildContinueExploreRow(userId) });
    attachContinueExploreHandler(reply, interaction, userId, guildId);
    return;
  }
  if (isBossSlain(guildId, 'echo_demon')) {
    const reply = await interaction.editReply({ embeds: [simpleEmbed(COLORS.warning, '👁️ Echo Demon đang bị phong ấn lại. Cổng không đáp lời lúc này.')], components: buildContinueExploreRow(userId) });
    attachContinueExploreHandler(reply, interaction, userId, guildId);
    return;
  }

  const embed = new EmbedBuilder()
    .setColor(0x7c3aed)
    .setTitle('⛩️ Cổng Phong Ấn Echo Demon')
    .setDescription(`${note ? `${note}\n\n` : ''}${buildEchoGateChecklist(userId, guildId)}\n\n*Cánh cửa vẫn im lặng. Một tiếng cười vọng ra từ sau lớp đá...*`)
    .setFooter({ text: '3 key item lấy từ 3 event riêng trong Đền Cổ. Mini boss phá phong ấn có thể đánh ngay tại đây.' });

  const reply = await interaction.editReply({ embeds: [embed], components: buildEchoGateRows(userId, guildId) });
  const collector = reply.createMessageComponentCollector({ filter: onlyUser(userId), time: 90_000 });
  collector.on('collect', async (i) => {
    const ok = await i.deferUpdate().then(() => true).catch(() => false);
    if (!ok) return;
    await reply.edit({ components: [] }).catch(() => {});
    collector.stop('action');
    if (i.customId === `echo_back_${userId}`) {
      const r = await interaction.editReply({ embeds: [simpleEmbed(COLORS.info, '↩️ Bạn rời Cổng Phong Ấn. Tiếng vọng vẫn chờ trong đá.')], components: buildContinueExploreRow(userId) });
      attachContinueExploreHandler(r, interaction, userId, guildId);
      return;
    }
    if (i.customId === `echo_ritual_${userId}`) return runEchoStabilizationRitual(interaction, userId, guildId);
    if (i.customId.startsWith(`echo_seal_${userId}_`)) {
      const seal = i.customId.replace(`echo_seal_${userId}_`, '') as EchoSealId;
      return startEchoSealMiniboss(interaction, userId, guildId, seal);
    }
  });
  collector.on('end', (_c, reason) => { if (reason === 'time') reply.edit({ components: [] }).catch(() => {}); });
}

async function startEchoSealMiniboss(
  interaction: ChatInputCommandInteraction,
  userId: string,
  guildId: string,
  seal: EchoSealId
): Promise<void> {
  const info = ECHO_SEALS[seal];
  if (!info) return showEchoSealGate(interaction, userId, guildId, '⚠️ Phong ấn này không tồn tại.');
  if (getEchoRitualSnapshot(guildId, userId).seals[seal]) return showEchoSealGate(interaction, userId, guildId, `✅ **${info.name}** đã bị phá từ trước.`);
  if (getCombatByUser(userId, guildId)) return showEchoSealGate(interaction, userId, guildId, '⚠️ Bạn đang có combat khác, chưa thể thách đấu phong ấn.');

  const enemy = getEnemy(info.enemyId);
  if (!enemy) return showEchoSealGate(interaction, userId, guildId, '⚠️ Dữ liệu mini boss phong ấn bị thiếu.');
  const embed = new EmbedBuilder()
    .setColor(COLORS.danger)
    .setTitle(`${info.icon} ${info.name} Rung Chuyển`)
    .setDescription(`Bạn đặt tay lên biểu tượng ${info.name.toLowerCase()}. Một hộ vệ bước ra khỏi vết nứt phong ấn.\n\n**${enemy.icon} ${enemy.name}**\n*${enemy.lore ?? 'Hộ vệ cũ của Đền Cổ đã thức tỉnh.'}*`);
  await interaction.editReply({ embeds: [embed], components: [] });
  await new Promise(r => setTimeout(r, 700));

  const onVictory: CombatVictoryHandler = async (itr, btnInt, uid, gid, p, e, state) => {
    markEchoSealBroken(gid, uid, seal);
    const extra = seal === 'mirror' ? recordMirrorShadeAfterMirrorSigil(uid, gid) : [];
    if (extra.length) {
      try {
        const logs = JSON.parse(state.combat_log ?? '[]');
        state.combat_log = JSON.stringify([...logs, ...extra]);
      } catch {}
    }
    await handleVictory(itr, btnInt, uid, gid, p, e, state);
  };
  await startCombatFlow(interaction, userId, guildId, info.enemyId, onVictory, handleDeath, handleFlee);
}

async function runEchoStabilizationRitual(
  interaction: ChatInputCommandInteraction,
  userId: string,
  guildId: string
): Promise<void> {
  const snapshot = getEchoRitualSnapshot(guildId, userId);
  if (!snapshot.canStartRitual) return showEchoSealGate(interaction, userId, guildId, '⚠️ Cổng chưa nhận đủ điều kiện để bắt đầu nghi lễ.');
  removeItem(userId, guildId, 'purifying_salt', 1);

  const rounds = [
    { prompt: 'Ngọn nến xanh rung mạnh, như sắp tắt.', correct: 'candle', hint: 'Ổn định lửa nghi lễ.' },
    { prompt: 'Mặt gương đen tối lại, không còn phản chiếu bạn.', correct: 'mirror', hint: 'Đưa ánh nhìn trở lại đúng hướng.' },
    { prompt: 'Muối dưới chân chuyển sang màu đen.', correct: 'salt', hint: 'Rắc lại vòng bảo hộ.' },
    { prompt: 'Tiếng vọng gọi tên bạn ba lần liên tiếp.', correct: 'silence', hint: 'Đừng trả lời thứ biết tên bạn.' },
  ].sort(() => Math.random() - 0.5).slice(0, 4);
  const labels: Record<string, { label: string; emoji: string }> = {
    salt: { label: 'Rắc Muối', emoji: '🧂' }, candle: { label: 'Thắp Nến', emoji: '🕯️' }, mirror: { label: 'Chỉnh Gương', emoji: '🪞' }, chant: { label: 'Đọc Chú Văn', emoji: '📜' }, silence: { label: 'Im Lặng', emoji: '🤫' },
  };
  let score = 0;
  const log: string[] = ['🕯️ **Nghi Lễ Giữ Phong Ấn bắt đầu.**'];

  for (let idx = 0; idx < rounds.length; idx++) {
    const round = rounds[idx];
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      ...(['salt', 'candle', 'mirror', 'chant', 'silence'] as const).map(id => new ButtonBuilder()
        .setCustomId(`echo_mini_${userId}_${id}`)
        .setLabel(labels[id].label)
        .setEmoji(labels[id].emoji)
        .setStyle(ButtonStyle.Secondary))
    );
    const embed = new EmbedBuilder()
      .setColor(0x7c3aed)
      .setTitle(`🕯️ Nghi Lễ Giữ Phong Ấn — Lượt ${idx + 1}/${rounds.length}`)
      .setDescription(`${log.slice(-4).join('\n')}\n\n**Dấu hiệu:** ${round.prompt}\n*${round.hint}*`)
      .addFields({ name: 'Ổn định', value: `${score}/${idx} lựa chọn đúng`, inline: true });
    const reply = await interaction.editReply({ embeds: [embed], components: [row] });
    const btn = await reply.awaitMessageComponent({ filter: onlyUser(userId), time: 25_000 }).catch(() => null);
    if (!btn || !btn.isButton()) { log.push('⏳ Bạn chậm một nhịp. Tiếng vọng lấn vào vòng nghi lễ.'); adjustCorruption(userId, guildId, 8); continue; }
    await btn.deferUpdate().catch(() => {});
    const choice = btn.customId.replace(`echo_mini_${userId}_`, '');
    if (choice === round.correct) { score++; log.push(`✅ ${labels[choice].emoji} **${labels[choice].label}** — phong ấn ổn định.`); }
    else { log.push(`❌ ${labels[choice]?.emoji ?? '❔'} **${labels[choice]?.label ?? choice}** — lựa chọn sai, vết nứt lan rộng.`); adjustCorruption(userId, guildId, 6); }
  }

  const corruption = getCorruptionLevel(userId, guildId);
  const quality = score >= 4 ? 'perfect' : score >= 2 ? 'stable' : 'unstable';
  const echoRitual = { sealsBroken: snapshot.sealsBroken, ritualScore: score, corruption, quality } as const;
  const encounter = createBossEncounter(guildId, 'shrine', 'echo_demon', userId, { echoRitual, participantRoles: {} });
  setExploreCooldown(userId, guildId);
  const qualityLine = quality === 'perfect' ? '✨ Nghi lễ hoàn hảo. Echo Demon bị kéo ra khỏi phong ấn trong trạng thái yếu nhất.' : quality === 'stable' ? '🕯️ Nghi lễ ổn định. Echo Demon không được buff thêm từ cổng.' : '🌘 Nghi lễ chao đảo. Echo Demon mang theo một phần Corruption vào trận.';
  await showBossLobbyPrompt(interaction, userId, guildId, encounter, `${qualityLine}\n\nHãy chọn **vai trò nghi lễ** trước khi bắt đầu boss fight.`);
}

function buildEchoDemonEnemyForEncounter(encounter: BossEncounter): any {
  const base = getEnemy('echo_demon');
  if (!base) return null;
  const enemy: any = { ...base, drops: Array.isArray((base as any).drops) ? [...(base as any).drops] : (base as any).drops, guaranteedDrops: Array.isArray((base as any).guaranteedDrops) ? [...(base as any).guaranteedDrops] : (base as any).guaranteedDrops, specialAttacks: Array.isArray((base as any).specialAttacks) ? [...(base as any).specialAttacks] : (base as any).specialAttacks, phases: Array.isArray((base as any).phases) ? JSON.parse(JSON.stringify((base as any).phases)) : (base as any).phases };
  const ritual = encounter.echoRitual;
  const roles = Object.values(encounter.participantRoles ?? {}) as EchoRoleId[];
  const lines: string[] = [];
  const seals = ritual?.sealsBroken ?? 1;
  if (seals <= 1) { enemy.hp = Math.floor(enemy.hp * 1.25); enemy.atk = Math.floor(enemy.atk * 1.28); lines.push('🔒 Chỉ 1/3 phong ấn bị phá: Echo Demon bước ra trong trạng thái **rất mạnh**.'); }
  else if (seals === 2) { enemy.hp = Math.floor(enemy.hp * 1.12); enemy.atk = Math.floor(enemy.atk * 1.14); lines.push('🔒 2/3 phong ấn bị phá: Echo Demon vẫn được tăng sức mạnh nhẹ.'); }
  else lines.push('🔓 3/3 phong ấn bị phá: Echo Demon không còn lớp bảo hộ phụ.');
  const score = ritual?.ritualScore ?? 0;
  if (score >= 4) { enemy.hp = Math.floor(enemy.hp * 0.92); enemy.atk = Math.floor(enemy.atk * 0.95); lines.push('✨ Nghi lễ hoàn hảo: Boss mất một phần HP/ATK đầu trận.'); }
  else if (score < 2) { enemy.atk = Math.floor(enemy.atk * 1.12); enemy.specialAttacks = Array.from(new Set([...(enemy.specialAttacks ?? []), 'drain_mp'])); lines.push('🌘 Nghi lễ bất ổn: Boss được +ATK và có thêm MP drain.'); }
  const corruption = ritual?.corruption ?? 0;
  if (corruption >= 60) {
    enemy.hp = Math.floor(enemy.hp * 1.18);
    enemy.atk = Math.floor(enemy.atk * 1.22);
    enemy.specialAttacks = Array.from(new Set([...(enemy.specialAttacks ?? []), 'drain_mp', 'death_curse', 'mind_crush']));
    if (Array.isArray(enemy.phases)) {
      enemy.phases = enemy.phases.map((phase: any) => phase.phaseIndex === 3
        ? { ...phase, atkMult: Math.round((Number(phase.atkMult ?? 1) * 1.10) * 100) / 100, specialAttacks: Array.from(new Set([...(phase.specialAttacks ?? []), 'mind_crush'])) }
        : phase);
    }
    lines.push('🌘 Corruption cao: Echo Demon +HP/+ATK mạnh hơn, Phase cuối nguy hiểm hơn.');
  }
  else if (corruption >= 30) {
    enemy.atk = Math.floor(enemy.atk * 1.12);
    enemy.specialAttacks = Array.from(new Set([...(enemy.specialAttacks ?? []), 'drain_mp']));
    if (Array.isArray(enemy.phases)) {
      enemy.phases = enemy.phases.map((phase: any) => phase.phaseIndex === 2
        ? { ...phase, atkMult: Math.round((Number(phase.atkMult ?? 1) * 1.06) * 100) / 100 }
        : phase);
    }
    lines.push('🌗 Corruption trung bình: Boss +ATK rõ hơn và có thêm MP drain.');
  }
  else lines.push('🌕 Corruption thấp: Boss không nhận buff từ ô nhiễm.');
  const countRole = (role: EchoRoleId) => roles.filter(r => r === role).length;
  const sealKeepers = countRole('seal_keeper'), candleLighters = countRole('candle_lighter'), mirrorWardens = countRole('mirror_warden'), breakers = countRole('seal_breaker');
  if (sealKeepers) { enemy.atk = Math.floor(enemy.atk * (1 - Math.min(0.18, sealKeepers * 0.06))); lines.push(`🛡️ Người Giữ Ấn: ATK boss giảm ${Math.min(18, sealKeepers * 6)}%.`); }
  if (candleLighters) { enemy.specialAttacks = (enemy.specialAttacks ?? []).filter((s: string) => !(candleLighters >= 1 && s === 'drain_mp')); lines.push('🕯️ Người Thắp Nến: làm dịu tiếng vọng hút MP.'); }
  if (mirrorWardens) { enemy.def = Math.max(0, Math.floor(enemy.def * (1 - Math.min(0.20, mirrorWardens * 0.08)))); lines.push('🪞 Người Giữ Gương: DEF/ảo ảnh boss suy yếu.'); }
  if (breakers) { enemy.hp = Math.floor(enemy.hp * (1 - Math.min(0.15, breakers * 0.05))); enemy.atk = Math.floor(enemy.atk * (1 + Math.min(0.10, breakers * 0.04))); lines.push('⚔️ Người Phá Ấn: boss mất HP đầu trận nhưng phản kích dữ hơn.'); }
  enemy.lore = `${enemy.lore}\n\n${lines.join('\n')}`;
  return enemy;
}


// ── Oak event ─────────────────────────────────────────────────────────────────
export async function handleOakHuntStart(
  interaction: ChatInputCommandInteraction, userId: string, guildId: string
): Promise<void> {
  if (!(await ensurePlayerAlive(interaction, userId, guildId))) return;
  if (hasOakPrereq(guildId, userId)) {
    const reply = await interaction.editReply({ embeds: [simpleEmbed(COLORS.info, '✅ Bạn đã hạ Linh Thú rừng rồi.')], components: buildContinueExploreRow(userId) });
    attachContinueExploreHandler(reply, interaction, userId, guildId);
    return;
  }
  if (isOakHuntActive(guildId, userId)) {
    const rem = getOakHuntRemaining(guildId, userId);
    const reply = await interaction.editReply({ embeds: [simpleEmbed(COLORS.warning, `🐾 Đang truy tìm — còn **${rem}** lần khám phá nữa.`)], components: buildContinueExploreRow(userId) });
    attachContinueExploreHandler(reply, interaction, userId, guildId);
    return;
  }
  startOakHunt(guildId, userId);
  const embed = new EmbedBuilder()
    .setColor(0x2D7D46)
    .setTitle('🔍 Bắt Đầu Truy Tìm Linh Thú')
    .setDescription(
      '*Bạn tìm thấy dấu móng khổng lồ in sâu vào bùn đất ẩm...*\n\n' +
      `Sau **${OAK_HUNT_EXPLORES} lần khám phá** tiếp theo trong rừng, bạn sẽ đối mặt với Linh Thú.\n\n` +
      '*Hãy chuẩn bị kỹ trước khi tiếp tục.*'
    );
  const reply = await interaction.editReply({ embeds: [embed], components: buildContinueExploreRow(userId) });
  attachContinueExploreHandler(reply, interaction, userId, guildId);
}

export async function handleOakSummon(
  interaction: ChatInputCommandInteraction, userId: string, guildId: string
): Promise<void> {
  if (!(await ensurePlayerAlive(interaction, userId, guildId))) return;
  const player = getPlayer(userId, guildId)!;

  if (player.zone_id !== 'forest') {
    const reply = await interaction.editReply({ embeds: [simpleEmbed(COLORS.warning, '🌲 Bạn phải đứng trong **Forest** mới triệu hồi được Ancient Oak.')], components: buildContinueExploreRow(userId) });
    attachContinueExploreHandler(reply, interaction, userId, guildId);
    return;
  }

  if (isBossSlain(guildId, 'ancient_oak')) {
    const reply = await interaction.editReply({ embeds: [simpleEmbed(COLORS.warning, '🌳 Ancient Oak đang trong thời gian hồi sinh, chưa thể triệu hồi lại.')], components: buildContinueExploreRow(userId) });
    attachContinueExploreHandler(reply, interaction, userId, guildId);
    return;
  }

  if (!hasOakPrereq(guildId, userId)) {
    const reply = await interaction.editReply({ embeds: [simpleEmbed(COLORS.warning, '🌳 Bạn chưa đánh bại Miniboss trong rừng — chưa đủ điều kiện triệu hồi.')], components: buildContinueExploreRow(userId) });
    attachContinueExploreHandler(reply, interaction, userId, guildId);
    return;
  }
  const relicCount = getItemQty(userId, guildId, 'ancient_relic');
  if (relicCount < 3) {
    const reply = await interaction.editReply({ embeds: [simpleEmbed(COLORS.warning, `⚱️ Cần **3 Ancient Relic** để thức tỉnh (bạn có: ${relicCount}).`)], components: buildContinueExploreRow(userId) });
    attachContinueExploreHandler(reply, interaction, userId, guildId);
    return;
  }
  const existing = getOakEvent(guildId);
  if (existing) {
    const reply = await interaction.editReply({ embeds: [simpleEmbed(COLORS.warning, '🌳 Server đã có sự kiện Thức Tỉnh đang diễn ra!')], components: buildContinueExploreRow(userId) });
    attachContinueExploreHandler(reply, interaction, userId, guildId);
    return;
  }

  const spent = removeItem(userId, guildId, 'ancient_relic', 3);
  if (!spent) {
    const reply = await interaction.editReply({ embeds: [simpleEmbed(COLORS.warning, '⚱️ Ancient Relic không đủ hoặc inventory vừa thay đổi. Hãy mở lại `/explore`.')], components: buildContinueExploreRow(userId) });
    attachContinueExploreHandler(reply, interaction, userId, guildId);
    return;
  }

  try {
    deleteFlag(guildId, `oak_lore_relic_${userId}`);
    createOakEvent(guildId, userId);
  } catch (err) {
    // Do not eat the summoning materials if DB/event creation fails.
    addItem(userId, guildId, 'ancient_relic', 3);
    console.error('[OAK] createOakEvent failed:', err);
    const reply = await interaction.editReply({ embeds: [simpleEmbed(COLORS.danger, '🌳 Triệu hồi Ancient Oak thất bại do lỗi dữ liệu. Relic đã được hoàn lại.')], components: buildContinueExploreRow(userId) });
    attachContinueExploreHandler(reply, interaction, userId, guildId);
    return;
  }

  const embed = new EmbedBuilder()
    .setColor(0x2D7D46)
    .setTitle('🌳 Thức Tỉnh Cổ Mộc!')
    .setDescription(
      `**${player.name}** đã cúng tế 3 Ancient Relic...\n` +
      `*Cổ thụ ngàn năm rùng mình tỉnh giấc!*\n\n` +
      `⏳ Cửa sổ tham gia: **5 phút**\n` +
      `Bạn có thể bấm **Công Kích Ngay**, hoặc để người khác trong rừng bấm **Tham Gia** trên \`/explore\`.`
    );

  const reply = await interaction.editReply({ embeds: [embed], components: buildOakSummonedRow(userId) });
  attachContinueExploreHandler(reply, interaction, userId, guildId);
}

export async function handleOakJoin(
  interaction: ChatInputCommandInteraction, userId: string, guildId: string
): Promise<void> {
  if (!(await ensurePlayerAlive(interaction, userId, guildId))) return;
  const player = getPlayer(userId, guildId)!;

  const oakEv = getOakEvent(guildId);
  if (!oakEv || oakEv.phase !== 'summoning') {
    const reply = await interaction.editReply({ embeds: [simpleEmbed(COLORS.warning, '🌳 Không có sự kiện Thức Tỉnh đang mở cửa tham gia.')], components: buildContinueExploreRow(userId) });
    attachContinueExploreHandler(reply, interaction, userId, guildId);
    return;
  }
  if (isOakParticipant(guildId, userId)) {
    const reply = await interaction.editReply({ embeds: [simpleEmbed(COLORS.info, '✅ Bạn đã tham gia sự kiện này rồi.')], components: buildContinueExploreRow(userId) });
    attachContinueExploreHandler(reply, interaction, userId, guildId);
    return;
  }

  joinOakEvent(guildId, userId);
  const count = getOakParticipants(guildId).length;
  const reply = await interaction.editReply({
    embeds: [simpleEmbed(0x2D7D46, `🤝 **${player.name}** đã gia nhập Thức Tỉnh Cổ Mộc! (${count} người tham gia)`)],
    components: buildContinueExploreRow(userId)
  });
  attachContinueExploreHandler(reply, interaction, userId, guildId);
}

export async function handleOakFight(
  interaction: ChatInputCommandInteraction, userId: string, guildId: string
): Promise<void> {
  if (!(await ensurePlayerAlive(interaction, userId, guildId))) return;

  const oakEv = getOakEvent(guildId);
  if (!oakEv || (oakEv.phase !== 'summoning' && oakEv.phase !== 'active')) {
    const reply = await interaction.editReply({ embeds: [simpleEmbed(COLORS.warning, '🌳 Không có sự kiện Cổ Mộc nào đang hoạt động.')], components: buildContinueExploreRow(userId) });
    attachContinueExploreHandler(reply, interaction, userId, guildId);
    return;
  }
  if (!isOakParticipant(guildId, userId)) {
    const reply = await interaction.editReply({ embeds: [simpleEmbed(COLORS.warning, '❌ Bạn chưa tham gia sự kiện này.')], components: buildContinueExploreRow(userId) });
    attachContinueExploreHandler(reply, interaction, userId, guildId);
    return;
  }
  if (oakEv.current_fighter !== null) {
    const reply = await interaction.editReply({ embeds: [simpleEmbed(COLORS.warning, `⚔️ Đang có người chiến đấu. Chờ lượt của bạn!`)], components: buildContinueExploreRow(userId) });
    attachContinueExploreHandler(reply, interaction, userId, guildId);
    return;
  }

  // Activate (scale HP) on first fight if still in summoning phase
  let startHp = oakEv.boss_hp;
  let maxHp   = oakEv.boss_max_hp;
  if (oakEv.phase === 'summoning') {
    const scaled = activateOakEvent(guildId);
    startHp = scaled.hp;
    maxHp   = scaled.maxHp;
  }

  setOakCurrentFighter(guildId, userId);
  setExploreCooldown(userId, guildId);

  const onVictory: CombatVictoryHandler = async (itr, btnInt, uid, gid, _player, _enemy, state) => {
    const dmgDealt = maxHp - (state.enemy_hp ?? 0);
    addOakDamage(gid, uid, Math.max(0, dmgDealt));
    updateOakBossHp(gid, 0);
    setOakCurrentFighter(gid, null);
    closeOakEvent(gid);
    setFlag(gid, `boss_ancient_oak_slain`, uid, OAK_RESPAWN_TTL);
    updatePlayerHpMp(uid, gid, state.player_hp, state.player_mp);
    await distributeOakRewards(itr, btnInt, uid, gid);
  };

  const onDeath: CombatDeathHandler = async (itr, btnInt, uid, gid, player, enemy, remainingEnemyHp) => {
    const remaining = remainingEnemyHp ?? startHp;
    const dmgDealt  = startHp - remaining;
    addOakDamage(gid, uid, Math.max(0, dmgDealt));
    updateOakBossHp(gid, remaining);
    setOakCurrentFighter(gid, null);
    const penalty = processDeathPenalty(uid, gid, player, enemy);
    const embed = buildDeathEmbed(player.name, enemy.name, penalty.goldLeft)
      .addFields(
        { name: '💀 Soul Shards', value: `+**${penalty.shards}** 💀`, inline: true },
        { name: '🌳 Cổ Mộc', value: `HP còn: **${remaining}/${maxHp}** — chiến binh tiếp theo tiếp quản!`, inline: false }
      );
    const { embed: deathImg, files: deathFiles } = withImage(embed, 'death');
    await btnInt.editReply({ embeds: [deathImg], files: deathFiles, components: [] });
  };

  const onFlee: CombatFleeHandler = async (_itr, btnInt, uid, gid, _player, _enemy, state) => {
    const remaining = state.enemy_hp ?? startHp;
    const dmgDealt  = startHp - remaining;
    addOakDamage(gid, uid, Math.max(0, dmgDealt));
    updateOakBossHp(gid, remaining);
    setOakCurrentFighter(gid, null);
    updatePlayerHpMp(uid, gid, state.player_hp, state.player_mp);
    await btnInt.editReply({
      embeds: [simpleEmbed(COLORS.warning, `🚶 Bạn rút lui — Cổ Mộc còn **${remaining}/${maxHp} HP**. Đồng đội tiếp tục!`)],
      files: [], components: buildContinueExploreRow(uid)
    }).catch(() => {});
    attachContinueExploreHandler(btnInt.message as any, interaction, uid, gid);
  };

  await startCombatFlow(
    interaction, userId, guildId, 'ancient_oak',
    onVictory, onDeath, onFlee,
    { startHp, maxHp }
  );
}


function pPlayerName(userId: string, guildId: string): string {
  return getPlayer(userId, guildId)?.name ?? userId;
}

export async function distributeOakRewards(
  interaction: ChatInputCommandInteraction,
  btnInt: ButtonInteraction,
  winnerId: string,
  guildId: string
): Promise<void> {
  const participants = getOakParticipants(guildId);
  const totalDmg = participants.reduce((s, p) => s + p.damage, 0) || 1;

  const BASE_GOLD = 400;
  const BASE_EXP  = 500;
  const BASE_SOUL = 3;

  const lines: string[] = ['## 🌳 Cổ Mộc Đã Ngã! Phần thưởng:\n'];
  for (const p of participants) {
    const share  = p.damage / totalDmg;
    const gold   = Math.max(50, Math.round(BASE_GOLD * share));
    const exp    = Math.max(50, Math.round(BASE_EXP  * share));
    const shards = p.damage > 0 ? BASE_SOUL : 1;
    grantGold(p.user_id, guildId, gold);
    grantExp(p.user_id, guildId, exp);
    grantSoulShards(p.user_id, guildId, shards);
    const pPlayer = getPlayer(p.user_id, guildId);
    if (pPlayer) {
      logEvent(guildId, p.user_id, pPlayer.name, 'boss_kill', 'cùng party hạ gục **Ancient Oak Guardian** trong sự kiện Thức Tỉnh.', 'forest');
    }
    const achievementLines = awardAchievements(p.user_id, guildId);
    lines.push(`**${pPlayer?.name ?? p.user_id}** — ${p.damage} dmg (${Math.round(share * 100)}%) → +${gold}🪙 +${exp}EXP +${shards}💀${achievementLines.length ? `\n🏆 ${achievementLines.join(' · ')}` : ''}`);
  }

  // Winner gets a guaranteed relic drop
  addItem(winnerId, guildId, 'ancient_relic', 1);
  lines.push(`\n⚱️ **+1 Ancient Relic** dành cho người kết thúc trận!`);

  for (const p of participants) {
    markPlayerClearedBoss(guildId, p.user_id, 'ancient_oak');
    const unlocked = unlockRecipesBySource(p.user_id, guildId, 'ancient_oak');
    if (unlocked.length) lines.push(`📜 **${pPlayerName(p.user_id, guildId)}** mở khóa **${unlocked.length} công thức rừng cổ**.`);
  }
  setFlag(guildId, 'forest_drop_bonus', '20', 86400);
  setFlag(guildId, 'event_ancient_oak_fall', '🌳 Ancient Oak Guardian đã ngã xuống — rừng bị bóng tối lấn chiếm, drop rate tăng 20% trong rừng.', 86400);
  clearOakParticipants(guildId);

  const description = lines.join('\n');
  const safeDescription = description.length <= 3900
    ? description
    : description.slice(0, 3820).trimEnd() + '\n\n… *(log thưởng quá dài, đã rút gọn để tránh lỗi Discord)*';

  const embed = new EmbedBuilder()
    .setColor(0x2D7D46)
    .setTitle('🌳 Thức Tỉnh Cổ Mộc — Kết Thúc!')
    .setDescription(safeDescription);

  const { embed: victoryImg, files: victoryFiles } = withImage(embed, 'victory');
  const player = getPlayer(winnerId, guildId)!;
  await btnInt.editReply({ embeds: [victoryImg], files: victoryFiles, components: buildContinueExploreRow(winnerId) }).catch(async (err: any) => {
    if (err?.code === 50035) {
      await btnInt.editReply({
        embeds: [new EmbedBuilder().setColor(0x2D7D46).setTitle('🌳 Thức Tỉnh Cổ Mộc — Kết Thúc!').setDescription('Ancient Oak Guardian đã bị hạ. Phần thưởng đã được cộng, nhưng log quá dài nên bot đã rút gọn.')],
        files: [],
        components: buildContinueExploreRow(winnerId)
      }).catch(() => {});
    } else {
      throw err;
    }
  });
  attachContinueExploreHandler(btnInt.message, interaction, winnerId, guildId);
  logEvent(guildId, winnerId, player.name, 'boss', '🌳 đã hạ gục **Ancient Oak Guardian** trong sự kiện Thức Tỉnh!', 'forest');
}

// ── Legacy find ───────────────────────────────────────────────────────────────
