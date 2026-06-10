import {
  ChatInputCommandInteraction, EmbedBuilder, ButtonInteraction
} from 'discord.js';
import {
  getPlayer, getItemQty, removeItem, updatePlayerHpMp,
  grantGold, grantExp, grantSoulShards, addItem
} from '../player';
import { getZone } from '../../data/zones';
import { setExploreCooldown } from '../economy';
import {
  startCombatFlow, type CombatVictoryHandler, type CombatDeathHandler, type CombatFleeHandler
} from '../combatFlow';
import { processDeathPenalty } from '../rewards';
import {
  logEvent, setFlag, deleteFlag, markPlayerClearedBoss
} from '../world';
import {
  getOakEvent, createOakEvent, joinOakEvent, isOakParticipant, getOakParticipants,
  addOakDamage, updateOakBossHp, setOakCurrentFighter, activateOakEvent,
  closeOakEvent, clearOakParticipants, hasOakPrereq,
  OAK_RESPAWN_TTL,
  startOakHunt, isOakHuntActive, getOakHuntRemaining, OAK_HUNT_EXPLORES
} from '../oakEvent';
import { COLORS, buildDeathEmbed } from '../../utils/embeds';
import { withImage } from '../../utils/eventImages';
import { handleVictory, handleDeath, handleFlee } from './callbacks';
import {
  ensurePlayerAlive, buildContinueExploreRow, attachContinueExploreHandler, simpleEmbed
} from './shared';

// ── Boss ───────────────────────────────────────────────────────────────────────
export async function handleBoss(
  interaction: ChatInputCommandInteraction, userId: string, guildId: string
): Promise<void> {
  if (!(await ensurePlayerAlive(interaction, userId, guildId))) return;

  const player = getPlayer(userId, guildId)!;
  const zone   = getZone(player.zone_id)!;
  if (!zone.bossId) return;
  setExploreCooldown(userId, guildId);
  await startCombatFlow(interaction, userId, guildId, zone.bossId, handleVictory, handleDeath, handleFlee);
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

  removeItem(userId, guildId, 'ancient_relic', 3);
  deleteFlag(guildId, `oak_lore_relic_${userId}`);
  createOakEvent(guildId, userId);

  const embed = new EmbedBuilder()
    .setColor(0x2D7D46)
    .setTitle('🌳 Thức Tỉnh Cổ Mộc!')
    .setDescription(
      `**${player.name}** đã cúng tế 3 Ancient Relic...\n` +
      `*Cổ thụ ngàn năm rùng mình tỉnh giấc!*\n\n` +
      `⏳ Cửa sổ tham gia: **5 phút**\n` +
      `Những người khác trong rừng có thể bấm **Tham Gia** trên \`/explore\` để vào trận!`
    );

  const reply = await interaction.editReply({ embeds: [embed], components: buildContinueExploreRow(userId) });
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

  const lines: string[] = ['## 🌳 Cổ Mộc Đã倒! Phần thưởng:\n'];
  for (const p of participants) {
    const share  = p.damage / totalDmg;
    const gold   = Math.max(50, Math.round(BASE_GOLD * share));
    const exp    = Math.max(50, Math.round(BASE_EXP  * share));
    const shards = p.damage > 0 ? BASE_SOUL : 1;
    grantGold(p.user_id, guildId, gold);
    grantExp(p.user_id, guildId, exp);
    grantSoulShards(p.user_id, guildId, shards);
    const pPlayer = getPlayer(p.user_id, guildId);
    lines.push(`**${pPlayer?.name ?? p.user_id}** — ${p.damage} dmg (${Math.round(share * 100)}%) → +${gold}🪙 +${exp}EXP +${shards}💀`);
  }

  // Winner gets a guaranteed relic drop
  addItem(winnerId, guildId, 'ancient_relic', 1);
  lines.push(`\n⚱️ **+1 Ancient Relic** dành cho người kết thúc trận!`);

  for (const p of participants) {
    markPlayerClearedBoss(guildId, p.user_id, 'ancient_oak');
  }
  clearOakParticipants(guildId);

  const embed = new EmbedBuilder()
    .setColor(0x2D7D46)
    .setTitle('🌳 Thức Tỉnh Cổ Mộc — Kết Thúc!')
    .setDescription(lines.join('\n'));

  const { embed: victoryImg, files: victoryFiles } = withImage(embed, 'victory');
  const player = getPlayer(winnerId, guildId)!;
  await btnInt.editReply({ embeds: [victoryImg], files: victoryFiles, components: buildContinueExploreRow(winnerId) });
  attachContinueExploreHandler(btnInt.message, interaction, winnerId, guildId);
  logEvent(guildId, winnerId, player.name, 'boss', '🌳 đã hạ gục **Cổ Mộc Cổ Đại** trong sự kiện Thức Tỉnh!', 'forest');
}
