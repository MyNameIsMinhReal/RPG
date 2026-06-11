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
  startCombatFlow, type CombatVictoryHandler, type CombatDeathHandler, type CombatFleeHandler
} from '../combatFlow';
import { startPartyCombatFlow } from '../partyCombatFlow';
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
import { getCombatByUser } from '../combat';
import {
  BOSS_MAX_PARTICIPANTS, clearBossEncounter, createBossEncounter, getBossEncounter,
  getBossEncounterRemaining, isBossEncounterParticipant, joinBossEncounter, leaveBossEncounter,
  setBossEncounterActive, type BossEncounter
} from '../bossEncounter';
import { unlockRecipesBySource } from '../crafting';

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
  const row = new ActionRowBuilder<ButtonBuilder>();

  if (!joined) {
    row.addComponents(
      new ButtonBuilder().setCustomId(`ex_boss_join_${userId}`)
        .setLabel('Tham Gia Đánh Boss').setEmoji('🤝').setStyle(ButtonStyle.Primary)
    );
  } else {
    row.addComponents(
      new ButtonBuilder().setCustomId(`ex_boss_leave_${userId}`)
        .setLabel('Rời Đội').setEmoji('🚪').setStyle(ButtonStyle.Secondary)
    );
  }

  row.addComponents(
    new ButtonBuilder().setCustomId(`ex_boss_start_${userId}`)
      .setLabel(isSummoner ? 'Bắt Đầu Boss Fight' : 'Chờ Người Gọi Boss')
      .setEmoji('⚔️').setStyle(ButtonStyle.Danger).setDisabled(!isSummoner)
  );

  return [row];
}

async function showBossLobbyPrompt(
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
  const members = encounter.participantIds.map(id => `<@${id}>`).join('\n') || '*Chưa có ai*';
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
      { name: '📜 Thành viên', value: members, inline: false }
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

  setBossEncounterActive(guildId, encounter.zoneId);
  setExploreCooldown(userId, guildId);

  if (cleanMemberIds.length > 1) {
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
    try { await handleVictory(itr, btnInt, uid, gid, p, enemy, state); }
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

  await startCombatFlow(interaction, userId, guildId, encounter.bossId, clearAndVictory, clearAndDeath, clearAndFlee);
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
