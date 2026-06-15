import {
  ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder,
  ChatInputCommandInteraction, Message,
} from 'discord.js';
import { COLORS, simpleEmbed } from '../../utils/embeds';
import { onlyUser } from '../../utils/collectors';
import {
  ensurePlayerAlive, buildContinueExploreRow, attachContinueExploreHandler,
} from './shared';
import {
  getEchoRitualSnapshot, clearEchoRitualProgress, ECHO_SEALS, computeRitualBossHp,
  getEchoRoleCombatSetup, getEchoRolePartyModifier, getRitualHpMultiplier,
  ECHO_ROLES, echoRoleLabel, type EchoSealId, type EchoRoleId,
} from '../echoDemonRitual';
import { getEnemy } from '../../data/enemies';
import { removeItem, getPlayer } from '../player';
import { adjustCorruption, cleanseCorruption } from '../corruption';
import { isBossSlain } from '../world';
import { setExploreCooldown } from '../economy';
import { startCombatFlow } from '../combatFlow';
import { startPartyCombatFlow } from '../partyCombatFlow';
import { handleVictory, handleDeath, handleFlee } from './callbacks';

const yn = (ok: boolean) => (ok ? 'Đã phá' : 'Chưa phá');
const has = (ok: boolean) => (ok ? '✅' : '❌');

// Thứ tự giữ ấn "đúng": Đá giữ nền → Nến giữ hồn → Gương giữ hình.
const CANONICAL_ORDER: EchoSealId[] = ['stone', 'candle', 'mirror'];


function buildGateEmbed(snapshot: ReturnType<typeof getEchoRitualSnapshot>): EmbedBuilder {
  const keyItems =
    `${has(snapshot.hasEchoTrace)} 👁️ Echo Trace · ` +
    `${has(snapshot.hasSoulCandle)} 🕯️ Soul Candle · ` +
    `${has(snapshot.hasMirrorSigil)} 🪞 Mirror Sigil`;
  const seals =
    `${ECHO_SEALS.stone.icon} ${ECHO_SEALS.stone.name}: **${yn(snapshot.seals.stone)}**\n` +
    `${ECHO_SEALS.candle.icon} ${ECHO_SEALS.candle.name}: **${yn(snapshot.seals.candle)}**\n` +
    `${ECHO_SEALS.mirror.icon} ${ECHO_SEALS.mirror.name}: **${yn(snapshot.seals.mirror)}**`;
  const status = snapshot.canStartRitual
    ? '🕯️ *Ba biểu tượng trên cửa đá cùng sáng lên. Cánh cửa đã sẵn sàng mở.*'
    : `🔒 *Cánh cửa vẫn chưa mở. Một tiếng cười vọng ra từ phía sau phong ấn...*\n\n**Còn thiếu:** ${snapshot.missing.join(' · ')}`;
  return new EmbedBuilder()
    .setColor(snapshot.canStartRitual ? COLORS.gold : 0x6B4C9A)
    .setTitle('⛩️ Cổng Phong Ấn Echo Demon')
    .setDescription(
      `**Vật phẩm nghi lễ**\n${keyItems}\n\n` +
      `**Phong ấn quanh Đền Cổ** (phá càng nhiều, boss càng yếu — cần tối thiểu 1)\n${seals}\n\n` +
      `🧂 Purifying Salt: **${snapshot.hasPurifyingSalt ? '1/1' : '0/1'}**\n` +
      `🌘 Ô Nhiễm Linh Hồn: **${snapshot.corruption}/70** ${snapshot.corruption >= 70 ? '⚠️ (quá cao)' : ''}\n\n` +
      status
    );
}

/** Phase 2: Cổng Phong Ấn — checklist tiến trình. Nút "Bắt Đầu Nghi Lễ" khi đủ. */
export async function handleEchoGate(
  interaction: ChatInputCommandInteraction, userId: string, guildId: string
): Promise<void> {
  if (!(await ensurePlayerAlive(interaction, userId, guildId))) return;

  const snapshot = getEchoRitualSnapshot(guildId, userId);
  const embed = buildGateEmbed(snapshot);

  const rows: ActionRowBuilder<ButtonBuilder>[] = [];
  if (snapshot.canStartRitual) {
    rows.push(new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId(`ex_echo_ritual_start_${userId}`)
        .setLabel('Bắt Đầu Nghi Lễ').setEmoji('🕯️').setStyle(ButtonStyle.Success)
    ));
  }
  rows.push(...buildContinueExploreRow(userId));

  const reply = await interaction.editReply({ embeds: [embed], components: rows });
  attachContinueExploreHandler(reply as Message<boolean>, interaction, userId, guildId);

  if (!snapshot.canStartRitual) return;

  const collector = reply.createMessageComponentCollector({ filter: onlyUser(userId), time: 120_000 });
  collector.on('collect', async (i) => {
    if (i.customId !== `ex_echo_ritual_start_${userId}`) return;
    const ok = await i.deferUpdate().then(() => true).catch(() => false);
    if (!ok) return;
    collector.stop('ritual');
    await handleEchoRitualStart(interaction, userId, guildId);
  });
}

/**
 * Phase 3: nghi lễ giữ ấn (puzzle thứ tự) → triệu hồi Echo Demon.
 * Số ấn đã phá + kết quả puzzle quyết định HP boss vào trận. Combat đi qua
 * handleVictory chung nên thưởng + world event + cooldown hồi sinh 48h hoạt động.
 */
async function handleEchoRitualStart(
  interaction: ChatInputCommandInteraction, userId: string, guildId: string
): Promise<void> {
  if (!(await ensurePlayerAlive(interaction, userId, guildId))) return;

  // Defensive re-checks (trạng thái có thể đổi giữa lúc bấm).
  if (isBossSlain(guildId, 'echo_demon')) {
    const m = await interaction.editReply({ embeds: [simpleEmbed(COLORS.warning, '👁️ Echo Demon vừa bị phong ấn lại — chưa thể mở nghi lễ. Hãy quay lại sau.')], components: buildContinueExploreRow(userId) });
    return attachContinueExploreHandler(m as Message<boolean>, interaction, userId, guildId);
  }
  const snap = getEchoRitualSnapshot(guildId, userId);
  if (!snap.canStartRitual) {
    const m = await interaction.editReply({ embeds: [simpleEmbed(COLORS.warning, `🔒 Chưa đủ điều kiện mở nghi lễ.\n**Còn thiếu:** ${snap.missing.join(' · ')}`)], components: buildContinueExploreRow(userId) });
    return attachContinueExploreHandler(m as Message<boolean>, interaction, userId, guildId);
  }
  const sealsBroken = snap.sealsBroken;

  // ── Lobby: tập hợp party + mỗi người tự chọn vai trò ─────────────────────
  const roleMap = await runRitualLobby(interaction, userId, guildId);
  const memberIds = [userId, ...[...roleMap.keys()].filter((id) => id !== userId)].slice(0, 4);

  // ── Puzzle giữ ấn (người gọi thực hiện) ──────────────────────────────────
  const puzzleCorrect = await runSealPuzzle(interaction, userId);

  // Thanh tẩy Ô Nhiễm cho mọi Người Thắp Nến trong nhóm.
  for (const [uid, r] of roleMap) {
    if (r === 'candle_lighter') cleanseCorruption(uid, guildId, getEchoRoleCombatSetup(r).cleanse);
  }

  // Tiêu vật phẩm nghi lễ + reset phong ấn (người gọi).
  removeItem(userId, guildId, 'echo_trace', 1);
  removeItem(userId, guildId, 'soul_candle', 1);
  removeItem(userId, guildId, 'mirror_sigil', 1);
  removeItem(userId, guildId, 'purifying_salt', 1);
  clearEchoRitualProgress(guildId, userId);

  const hpMult = getRitualHpMultiplier(sealsBroken, puzzleCorrect);
  let puzzleLine: string;
  if (puzzleCorrect) {
    puzzleLine = '🕯️ *Giữ ấn đúng thứ tự. Tiếng vọng nghẹn lại — Echo Demon suy yếu khi bước vào.*';
  } else {
    const corr = adjustCorruption(userId, guildId, 8);
    puzzleLine = `🪞 *Giữ sai thứ tự. Gương đen cười khẽ — Ô Nhiễm Linh Hồn dâng lên (**${corr}**, +8).*`;
  }

  const memberLine = memberIds
    .map((id) => `• <@${id}> — ${echoRoleLabel(roleMap.get(id) ?? 'seal_keeper')}`)
    .join('\n');

  // ── Intro riêng ──────────────────────────────────────────────────────────
  const intro = new EmbedBuilder()
    .setColor(0x1A1A2E)
    .setTitle('👁️ Phong Ấn Rạn Nứt')
    .setDescription(
      'Cánh cửa đá mở ra không một tiếng động.\n' +
      'Bên trong không có ngai vàng, không có xác chết — chỉ có một chiếc gương đen đang nhìn lại bạn.\n\n' +
      'Một giọng nói vang lên từ mọi phía:\n' +
      '> *"Cuối cùng... ngươi cũng nghe thấy ta."*\n\n' +
      `${puzzleLine}\n` +
      `🩸 Phong ấn đã phá: **${sealsBroken}/3**\n\n` +
      `**Đoàn nghi lễ:**\n${memberLine}`
    );
  await interaction.editReply({ embeds: [intro], components: [] });
  await new Promise((r) => setTimeout(r, 1400));

  setExploreCooldown(userId, guildId);

  if (memberIds.length === 1) {
    // Solo: dùng effect cá nhân (stone_skin / battle_cry / ward...).
    const role = roleMap.get(userId) ?? 'seal_keeper';
    const roleSetup = getEchoRoleCombatSetup(role);
    const scaledHp = computeRitualBossHp(getEnemy('echo_demon')?.hp ?? 760, sealsBroken, puzzleCorrect);
    await startCombatFlow(
      interaction, userId, guildId, 'echo_demon',
      handleVictory, handleDeath, handleFlee,
      { startHp: scaledHp, maxHp: scaledHp },
      roleSetup.effects
    );
    return;
  }

  // Party: vai trò áp qua atk/def modifier; seal/puzzle áp qua bossHpMult.
  const roleModifiers: Record<string, { atkMult: number; defMult: number }> = {};
  for (const id of memberIds) roleModifiers[id] = getEchoRolePartyModifier(roleMap.get(id) ?? 'seal_keeper');
  await startPartyCombatFlow(
    interaction, userId, guildId, memberIds, 'echo_demon',
    undefined, undefined,
    { roleModifiers, bossHpMult: hpMult }
  );
}

/**
 * Lobby nghi lễ (in-memory): người chơi trong Đền Cổ bấm 1 vai để tham gia
 * (tối đa 4). Người gọi bấm "Bắt Đầu" hoặc hết 60s thì đóng. Trả về map vai trò.
 */
async function runRitualLobby(
  interaction: ChatInputCommandInteraction, leaderId: string, guildId: string
): Promise<Map<string, EchoRoleId>> {
  const roles = new Map<string, EchoRoleId>();
  const roleKeys = Object.keys(ECHO_ROLES) as EchoRoleId[];

  const renderEmbed = () => {
    const joined = roles.size
      ? [...roles.entries()].map(([uid, r]) => `• <@${uid}> — ${ECHO_ROLES[r].icon} ${ECHO_ROLES[r].short}`).join('\n')
      : '*Chưa có ai chọn vai. Bấm một vai để tham gia.*';
    return new EmbedBuilder()
      .setColor(0x6B4C9A)
      .setTitle('⛩️ Nghi Lễ Phong Ấn — Tập Hợp')
      .setDescription(
        'Người chơi trong Đền Cổ chọn vai trò để cùng giữ ấn (tối đa 4 người).\n\n' +
        roleKeys.map((r) => `${ECHO_ROLES[r].icon} **${ECHO_ROLES[r].name}** — ${ECHO_ROLES[r].desc}`).join('\n') +
        `\n\n**Đã tham gia:**\n${joined}\n\n*Người gọi bấm "Bắt Đầu Nghi Lễ" khi sẵn sàng (tự đóng sau 60s).*`
      );
  };
  const rolesRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    ...roleKeys.map((r) =>
      new ButtonBuilder().setCustomId(`ex_echo_join_${r}_${leaderId}`)
        .setLabel(ECHO_ROLES[r].short).setEmoji(ECHO_ROLES[r].icon).setStyle(ButtonStyle.Secondary)
    )
  );
  const startRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`ex_echo_begin_${leaderId}`)
      .setLabel('Bắt Đầu Nghi Lễ').setEmoji('🕯️').setStyle(ButtonStyle.Success)
  );

  const reply = await interaction.editReply({ embeds: [renderEmbed()], components: [rolesRow, startRow] });

  await new Promise<void>((resolve) => {
    const collector = reply.createMessageComponentCollector({ time: 60_000 });
    collector.on('collect', async (i) => {
      const rk = roleKeys.find((r) => i.customId === `ex_echo_join_${r}_${leaderId}`);
      if (rk) {
        const pl = getPlayer(i.user.id, guildId);
        if (!pl?.alive || pl.zone_id !== 'shrine') {
          await i.reply({ content: '❌ Bạn phải là nhân vật còn sống đang ở Đền Cổ để tham gia.', ephemeral: true }).catch(() => {});
          return;
        }
        if (roles.size >= 4 && !roles.has(i.user.id)) {
          await i.reply({ content: '⚠️ Nghi lễ đã đủ 4 người.', ephemeral: true }).catch(() => {});
          return;
        }
        roles.set(i.user.id, rk);
        await i.deferUpdate().catch(() => {});
        await reply.edit({ embeds: [renderEmbed()], components: [rolesRow, startRow] }).catch(() => {});
        return;
      }
      if (i.customId === `ex_echo_begin_${leaderId}`) {
        if (i.user.id !== leaderId) {
          await i.reply({ content: '⚠️ Chỉ người gọi nghi lễ mới bắt đầu được.', ephemeral: true }).catch(() => {});
          return;
        }
        await i.deferUpdate().catch(() => {});
        collector.stop('begin');
      }
    });
    collector.on('end', () => resolve());
  });

  if (!roles.has(leaderId)) roles.set(leaderId, 'seal_keeper');
  return roles;
}

/**
 * Mini-game giữ ấn: hiện 3 biểu tượng, người chơi bấm theo thứ tự. Gợi ý in-fiction
 * cho biết thứ tự đúng (Đá → Nến → Gương). Trả về true nếu đúng cả 3.
 */
async function runSealPuzzle(
  interaction: ChatInputCommandInteraction, userId: string
): Promise<boolean> {
  const picked: EchoSealId[] = [];
  const order: EchoSealId[] = ['stone', 'candle', 'mirror'];

  const render = async (disabled: Set<EchoSealId>) => {
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      ...order.map((seal) =>
        new ButtonBuilder()
          .setCustomId(`ex_seal_pick_${seal}_${userId}`)
          .setLabel(ECHO_SEALS[seal].name)
          .setEmoji(ECHO_SEALS[seal].icon)
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(disabled.has(seal))
      )
    );
    const embed = new EmbedBuilder()
      .setColor(0x6B4C9A)
      .setTitle('🔮 Giữ Phong Ấn')
      .setDescription(
        'Ba biểu tượng sáng lên trên cửa đá. Tiếng vọng thì thầm:\n' +
        '> *"Đá giữ nền, Nến giữ hồn, Gương giữ hình — theo thứ tự đó."*\n\n' +
        `Đã chọn: ${picked.length ? picked.map((s) => ECHO_SEALS[s].icon).join(' → ') : '—'}`
      );
    return { embeds: [embed], components: [row] };
  };

  const reply = await interaction.editReply(await render(new Set()));

  for (let step = 0; step < 3; step++) {
    const btn = await reply.awaitMessageComponent({ filter: onlyUser(userId), time: 30_000 }).catch(() => null);
    if (!btn || !btn.isButton()) break; // hết giờ → coi như sai
    await btn.deferUpdate().catch(() => {});
    const seal = order.find((s) => btn.customId === `ex_seal_pick_${s}_${userId}`);
    if (!seal || picked.includes(seal)) continue;
    picked.push(seal);
    if (step < 2) await interaction.editReply(await render(new Set(picked))).catch(() => {});
  }

  return picked.length === 3 && picked.every((s, idx) => s === CANONICAL_ORDER[idx]);
}


