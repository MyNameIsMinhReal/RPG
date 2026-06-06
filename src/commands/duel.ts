import {
  SlashCommandBuilder, ChatInputCommandInteraction,
  EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType
} from 'discord.js';
import { getPlayer, updatePlayerHpMp, killPlayer, adjustReputation, applyPassiveStats } from '../systems/player';
import { COLORS } from '../utils/embeds';
import db from '../database/index';
import { randomUUID } from 'node:crypto';

function buildHpBar(current: number, max: number, len = 12): string {
  const filled = Math.max(0, Math.round((current / max) * len));
  return '█'.repeat(filled) + '░'.repeat(len - filled);
}

function buildDuelEmbed(
  chalName: string, chalHp: number, chalMax: number,
  targName: string, targHp: number, targMax: number,
  log: string, footer = ''
): EmbedBuilder {
  const chalPct = chalHp / chalMax;
  const targPct = targHp / targMax;
  const color = chalPct < 0.25 || targPct < 0.25 ? COLORS.danger : 0x9B59B6;
  return new EmbedBuilder()
    .setColor(color)
    .setTitle('⚔️ Duel')
    .setDescription(
      `**${chalName}**\n` +
      `❤️ ${chalHp}/${chalMax}  \`${buildHpBar(chalHp, chalMax)}\`\n\n` +
      `**${targName}**\n` +
      `❤️ ${targHp}/${targMax}  \`${buildHpBar(targHp, targMax)}\`\n\n` +
      `─────────────────\n${log}`
    )
    .setFooter({ text: footer });
}

export const data = new SlashCommandBuilder()
  .setName('duel')
  .setDescription('Thách đấu người chơi khác!')
  .addUserOption(o => o.setName('target').setDescription('Người bị thách đấu').setRequired(true));

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();
  const { id: challengerId, username: chalUsername } = interaction.user;
  const guildId = interaction.guildId!;

  const targetUser = interaction.options.getUser('target', true);
  if (targetUser.id === challengerId) {
    await interaction.editReply({ embeds: [new EmbedBuilder().setColor(COLORS.warning).setDescription('❌ Không thể thách đấu chính mình.')] });
    return;
  }
  if (targetUser.bot) {
    await interaction.editReply({ embeds: [new EmbedBuilder().setColor(COLORS.warning).setDescription('❌ Không thể thách đấu bot.')] });
    return;
  }

  const challenger = getPlayer(challengerId, guildId);
  const target     = getPlayer(targetUser.id, guildId);

  if (!challenger?.alive) {
    await interaction.editReply({ embeds: [new EmbedBuilder().setColor(COLORS.danger).setDescription('❌ Bạn đã chết.')] });
    return;
  }
  if (!target?.alive) {
    await interaction.editReply({ embeds: [new EmbedBuilder().setColor(COLORS.danger).setDescription(`❌ **${targetUser.username}** đã chết hoặc chưa tham gia.`)] });
    return;
  }

  // Check no active duel
  const activeDuel = db.prepare(`
    SELECT 1 FROM active_duels WHERE guild_id=? AND (challenger_id=? OR target_id=? OR challenger_id=? OR target_id=?) AND status NOT IN ('done','declined')
  `).get(guildId, challengerId, challengerId, targetUser.id, targetUser.id);
  if (activeDuel) {
    await interaction.editReply({ embeds: [new EmbedBuilder().setColor(COLORS.warning).setDescription('⚠️ Một trong hai người đang trong duel khác.')] });
    return;
  }

  const chalEnhanced  = applyPassiveStats(challenger);
  const targEnhanced  = applyPassiveStats(target);
  const chalHp = chalEnhanced.hp;
  const targHp = targEnhanced.hp;
  const chalMax = chalEnhanced.max_hp;
  const targMax = targEnhanced.max_hp;

  const duelId = randomUUID();

  // Challenge embed with accept/decline
  const challengeEmbed = new EmbedBuilder()
    .setColor(0x9B59B6)
    .setTitle('⚔️ Thách Đấu!')
    .setDescription(
      `**${chalUsername}** muốn đấu với **${targetUser.username}**!\n\n` +
      `> ❤️ Challenger: **${chalHp}/${chalMax} HP**  ·  ⚔️ **${chalEnhanced.atk} ATK**\n` +
      `> ❤️ Target: **${targHp}/${targMax} HP**  ·  ⚔️ **${targEnhanced.atk} ATK**\n\n` +
      `*Thua: mất **5 Reputation**. Thắng: **+10 Reputation**.*`
    )
    .setFooter({ text: `${targetUser.username} có 30 giây để chấp nhận` });

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId('duel_accept').setLabel('Chấp nhận').setEmoji('⚔️').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('duel_decline').setLabel('Từ chối').setStyle(ButtonStyle.Secondary)
  );

  const msg = await interaction.editReply({ content: `<@${targetUser.id}>`, embeds: [challengeEmbed], components: [row] });

  const response = await msg.awaitMessageComponent({
    filter: i => i.user.id === targetUser.id,
    componentType: ComponentType.Button,
    time: 30_000
  }).catch(() => null);

  if (!response || response.customId === 'duel_decline') {
    await interaction.editReply({
      content: '',
      embeds: [new EmbedBuilder().setColor(COLORS.dark).setDescription(`❌ **${targetUser.username}** từ chối duel.`)],
      components: []
    });
    return;
  }

  await response.deferUpdate();

  // ── Combat loop ──────────────────────────────────────────────────
  let cHp = chalHp, tHp = targHp;
  let turn = 0; // 0 = challenger, 1 = target
  let log = '*Duel bắt đầu!*\n';

  const combatRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId('duel_attack').setLabel('⚔️ Tấn công').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('duel_defend').setLabel('🛡️ Phòng thủ').setStyle(ButtonStyle.Primary)
  );

  let currentTurnUser = challengerId;
  let defending = false;

  async function updateDuelMessage(): Promise<void> {
    const turnName = turn === 0 ? chalUsername : targetUser.username;
    await interaction.editReply({
      content: `<@${currentTurnUser}>`,
      embeds: [buildDuelEmbed(chalUsername, cHp, chalMax, targetUser.username, tHp, targMax, log, `Lượt của: ${turnName}`)],
      components: [combatRow]
    });
  }

  await updateDuelMessage();

  let chalDefending = false;
  let targDefending = false;

  // Combat rounds
  for (let round = 0; round < 20; round++) {
    const turnUserId = turn === 0 ? challengerId : targetUser.id;
    currentTurnUser = turnUserId;

    const btnResponse = await msg.awaitMessageComponent({
      filter: i => i.user.id === turnUserId,
      componentType: ComponentType.Button,
      time: 45_000
    }).catch(() => null);

    if (!btnResponse) {
      // Timeout = forfeit
      const forfeitName = turn === 0 ? chalUsername : targetUser.username;
      log += `\n⏰ *${forfeitName} không hành động — tự thua!*`;
      if (turn === 0) cHp = 0; else tHp = 0;
      break;
    }

    await btnResponse.deferUpdate();
    defending = btnResponse.customId === 'duel_defend';

    if (defending) {
      const turnName = turn === 0 ? chalUsername : targetUser.username;
      log += `\n🛡️ *${turnName} phòng thủ!*`;
      if (turn === 0) chalDefending = true; else targDefending = true;
    } else {
      // Attack — check if the DEFENDER was defending last turn
      const atkAtk  = turn === 0 ? chalEnhanced.atk  : targEnhanced.atk;
      const defDef  = turn === 0 ? targEnhanced.def   : chalEnhanced.def;
      const targetIsDefending = turn === 0 ? targDefending : chalDefending;
      const defenseBonus = targetIsDefending ? Math.floor(defDef * 0.5) : 0;
      const dmg = Math.max(1, atkAtk - defDef - defenseBonus + Math.floor(Math.random() * 8) - 3);
      const atkName  = turn === 0 ? chalUsername    : targetUser.username;
      const defName  = turn === 0 ? targetUser.username : chalUsername;

      if (turn === 0) tHp = Math.max(0, tHp - dmg);
      else            cHp = Math.max(0, cHp - dmg);

      const guardNote = targetIsDefending ? ' 🛡️' : '';
      log += `\n⚔️ *${atkName}* → **${dmg} DMG** → *${defName}*${guardNote}`;
      // Attacker's own defend stance clears when they act
      if (turn === 0) chalDefending = false; else targDefending = false;
    }

    defending = false;
    turn = turn === 0 ? 1 : 0;

    if (cHp <= 0 || tHp <= 0) break;

    const nextName = turn === 0 ? chalUsername : targetUser.username;
    currentTurnUser = turn === 0 ? challengerId : targetUser.id;
    await interaction.editReply({
      content: `<@${currentTurnUser}>`,
      embeds: [buildDuelEmbed(chalUsername, cHp, chalMax, targetUser.username, tHp, targMax, log, `Lượt của: ${nextName}`)],
      components: [combatRow]
    });
  }

  // ── Determine winner ────────────────────────────────────────────
  const chalWon = tHp <= 0 || (cHp > 0 && tHp <= cHp);
  const winnerId = chalWon ? challengerId : targetUser.id;
  const loserId  = chalWon ? targetUser.id : challengerId;
  const winName  = chalWon ? chalUsername : targetUser.username;
  const loseName = chalWon ? targetUser.username : chalUsername;

  adjustReputation(winnerId, guildId, 10);
  adjustReputation(loserId,  guildId, -5);

  // Persist HP changes
  updatePlayerHpMp(challengerId, guildId, Math.max(1, cHp), challenger.mp);
  updatePlayerHpMp(targetUser.id, guildId, Math.max(1, tHp), target.mp);

  log += `\n\n🏆 **${winName}** chiến thắng!`;

  await interaction.editReply({
    content: '',
    embeds: [buildDuelEmbed(chalUsername, cHp, chalMax, targetUser.username, tHp, targMax, log,
      `${winName} +10 Rep · ${loseName} -5 Rep`)],
    components: []
  });
}
