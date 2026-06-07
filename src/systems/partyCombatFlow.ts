/**
 * Turn-based party combat.
 * All party members choose actions simultaneously; after 60 s (or all voted) the
 * turn resolves, then the enemy attacks one random alive member.
 *
 * Enemy HP is scaled: base × (1 + 0.4 × extraMembers).
 * Enemy ATK is unchanged so individual hits stay dangerous.
 */

import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Message
} from 'discord.js';
import { getPlayer, grantExp, grantGold, updatePlayerHpMp } from './player';
import { getEnemy } from '../data/enemies';
import { incrementKills } from './player';
import { COLORS } from '../utils/embeds';
import { randInt, pick } from '../utils/format';

// ── Types ────────────────────────────────────────────────────────────────────

export interface PartyMember {
  user_id: string;
  name: string;
  hp: number;
  max_hp: number;
  mp: number;
  max_mp: number;
  atk: number;
  def: number;
  alive: boolean;
}

export interface PartyCombatEnemy {
  id: string;
  name: string;
  icon: string;
  hp: number;
  max_hp: number;
  atk: number;
  def: number;
  boss: boolean;
  specialAttacks: string[];
}

type PartyAction = 'attack' | 'defend' | 'potion' | 'flee';

// ── Helpers ──────────────────────────────────────────────────────────────────

const SESSION_TIMEOUT_MS = 60_000;

function hpBar(hp: number, max: number): string {
  const pct = Math.max(0, Math.min(1, hp / max));
  const filled = Math.round(pct * 8);
  return '█'.repeat(filled) + '░'.repeat(8 - filled);
}

function buildCombatEmbed(
  members: PartyMember[],
  enemy: PartyCombatEnemy,
  turn: number,
  log: string[],
  pendingVoters: string[]
): EmbedBuilder {
  const memberLines = members.map(m => {
    if (!m.alive) return `💀 ~~**${m.name}**~~ — KO'd`;
    const bar = hpBar(m.hp, m.max_hp);
    return `❤️ **${m.name}** — ${bar} ${m.hp}/${m.max_hp} HP`;
  }).join('\n');

  const eBar = hpBar(enemy.hp, enemy.max_hp);
  const waitingStr = pendingVoters.length
    ? `\n⏳ Đang chờ: ${pendingVoters.join(', ')}`
    : '';

  return new EmbedBuilder()
    .setColor(COLORS.danger)
    .setTitle(`⚔️ Party Combat — Lượt ${turn}`)
    .setDescription(
      `${enemy.icon} **${enemy.name}**\n${eBar} ${enemy.hp}/${enemy.max_hp} HP\n\n` +
      `**Party:**\n${memberLines}` +
      waitingStr
    )
    .addFields({ name: '📜 Log', value: log.slice(-4).join('\n') || '*Bắt đầu chiến đấu...*', inline: false })
    .setFooter({ text: 'Mỗi người chọn hành động · Timeout 60s = Phòng thủ' });
}

function buildActionRow(sessionId: string): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`pca_atk_${sessionId}`).setLabel('⚔️ Tấn công').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`pca_def_${sessionId}`).setLabel('🛡️ Phòng thủ').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`pca_pot_${sessionId}`).setLabel('🧪 Dùng Potion').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`pca_fle_${sessionId}`).setLabel('🏃 Bỏ chạy').setStyle(ButtonStyle.Secondary),
  );
}

function calcDmg(atk: number, def: number): number {
  return Math.max(1, Math.floor(atk - def * 0.5 + randInt(-3, 3)));
}

function findBestPotion(userId: string, guildId: string): string | null {
  const { getInventory } = require('./player');
  const { getItem } = require('../data/items');
  const inv = getInventory(userId, guildId) as { item_id: string; quantity: number }[];
  const potions = ['elixir', 'emergency_potion', 'healing_potion', 'health_potion', 'minor_healing_potion'];
  for (const pid of potions) {
    const entry = inv.find(e => e.item_id === pid && e.quantity > 0);
    if (entry) return pid;
  }
  return null;
}

function applyPotion(member: PartyMember, userId: string, guildId: string): { member: PartyMember; log: string } {
  const { useItemOutsideCombat } = require('./consumables');
  const pid = findBestPotion(userId, guildId);
  if (!pid) return { member, log: `🧪 **${member.name}** không có potion nào!` };

  const result = useItemOutsideCombat(userId, guildId, pid);
  // Re-read HP/MP from DB since useItemOutsideCombat saves to DB
  const fresh = getPlayer(userId, guildId)!;
  return {
    member: { ...member, hp: fresh.hp, mp: fresh.mp },
    log: `🧪 **${member.name}** dùng potion: ${result.lines[0] ?? `+HP`}`
  };
}

// ── Main flow ─────────────────────────────────────────────────────────────────

export async function startPartyCombatFlow(
  interaction: ChatInputCommandInteraction,
  leaderId: string,
  guildId: string,
  memberIds: string[],
  enemyId: string,
  onVictory?: (members: PartyMember[], enemy: PartyCombatEnemy) => Promise<void>,
  onWipe?: (members: PartyMember[], enemy: PartyCombatEnemy) => Promise<void>
): Promise<void> {
  // ── Load members ────────────────────────────────────────────────────────────
  const members: PartyMember[] = memberIds.map(uid => {
    const p = getPlayer(uid, guildId)!;
    return {
      user_id: uid,
      name: p.name,
      hp: p.hp,
      max_hp: p.max_hp,
      mp: p.mp,
      max_mp: p.max_mp,
      atk: p.atk,
      def: p.def,
      alive: true
    };
  });

  // ── Load & scale enemy ──────────────────────────────────────────────────────
  const baseDef = getEnemy(enemyId)!;
  const extraMembers = Math.max(0, members.length - 1);
  const scaledHp = Math.round(baseDef.hp * (1 + 0.4 * extraMembers));
  const enemy: PartyCombatEnemy = {
    id: baseDef.id,
    name: baseDef.name,
    icon: baseDef.icon,
    hp: scaledHp,
    max_hp: scaledHp,
    atk: baseDef.atk,
    def: baseDef.def,
    boss: baseDef.boss ?? false,
    specialAttacks: baseDef.specialAttacks ?? []
  };

  const sessionId = `${leaderId}_${Date.now()}`;
  const log: string[] = [];
  let turn = 1;

  // ── Turn loop ────────────────────────────────────────────────────────────────
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const aliveMembers = members.filter(m => m.alive);
    if (aliveMembers.length === 0) break;
    if (enemy.hp <= 0) break;

    // Collect actions
    const actions = new Map<string, PartyAction>();
    const pendingNames = () => aliveMembers.filter(m => !actions.has(m.user_id)).map(m => m.name);

    const embed = buildCombatEmbed(members, enemy, turn, log, pendingNames());
    const row   = buildActionRow(sessionId);

    let reply: Message<boolean>;
    if (turn === 1) {
      reply = await interaction.editReply({ embeds: [embed], components: [row] }) as Message<boolean>;
    } else {
      reply = await interaction.editReply({ embeds: [embed], components: [row] }) as Message<boolean>;
    }

    await new Promise<void>(resolve => {
      const collector = reply.createMessageComponentCollector({
        filter: i => memberIds.includes(i.user.id) && i.customId.endsWith(`_${sessionId}`),
        time: SESSION_TIMEOUT_MS
      });

      collector.on('collect', async i => {
        await i.deferUpdate().catch(() => {});
        const action: PartyAction =
          i.customId.startsWith('pca_atk') ? 'attack' :
          i.customId.startsWith('pca_def') ? 'defend' :
          i.customId.startsWith('pca_pot') ? 'potion' : 'flee';
        actions.set(i.user.id, action);

        const updatedEmbed = buildCombatEmbed(members, enemy, turn, log, pendingNames());
        await interaction.editReply({ embeds: [updatedEmbed], components: [row] }).catch(() => {});

        if (actions.size >= aliveMembers.length) collector.stop('all_voted');
      });

      collector.on('end', () => {
        // Default: missing voters defend
        for (const m of aliveMembers) {
          if (!actions.has(m.user_id)) actions.set(m.user_id, 'defend');
        }
        resolve();
      });
    });

    // ── Check flee ─────────────────────────────────────────────────────────────
    const fleeCount = [...actions.values()].filter(a => a === 'flee').length;
    if (fleeCount > 0 && randInt(1, 100) <= 50) {
      await interaction.editReply({
        embeds: [new EmbedBuilder().setColor(COLORS.info)
          .setTitle('🏃 Party Tháo Chạy!')
          .setDescription('Party bỏ chạy thành công! Không có phần thưởng.')],
        components: []
      });
      return;
    } else if (fleeCount > 0) {
      log.push('🏃 Cố tháo chạy nhưng thất bại!');
    }

    // ── Process member actions ─────────────────────────────────────────────────
    const defenders = new Set<string>();
    for (const [uid, action] of actions) {
      const mIdx = members.findIndex(m => m.user_id === uid && m.alive);
      if (mIdx < 0) continue;

      if (action === 'attack') {
        const dmg = calcDmg(members[mIdx].atk, enemy.def);
        enemy.hp = Math.max(0, enemy.hp - dmg);
        log.push(`⚔️ **${members[mIdx].name}** gây **${dmg}** sát thương! (${enemy.hp}/${enemy.max_hp})`);
        if (enemy.hp <= 0) break;
      } else if (action === 'defend') {
        defenders.add(uid);
        log.push(`🛡️ **${members[mIdx].name}** phòng thủ.`);
      } else if (action === 'potion') {
        const { member: updated, log: pLog } = applyPotion(members[mIdx], uid, guildId);
        members[mIdx] = updated;
        log.push(pLog);
      }
    }

    // ── Check enemy dead ───────────────────────────────────────────────────────
    if (enemy.hp <= 0) break;

    // ── Enemy attacks random alive member ──────────────────────────────────────
    const targets = members.filter(m => m.alive);
    if (targets.length > 0) {
      const target = pick(targets);
      const tIdx = members.findIndex(m => m.user_id === target.user_id);
      const isDefending = defenders.has(target.user_id);
      const effectiveDef = target.def + (isDefending ? Math.floor(target.def * 0.5) : 0);
      let dmg = calcDmg(enemy.atk, effectiveDef);

      // Special attack chance
      if (!enemy.boss && enemy.specialAttacks.length > 0 && randInt(1, 100) <= 25) {
        dmg = Math.floor(dmg * 1.5);
        log.push(`${enemy.icon} **${enemy.name}** dùng kỹ năng đặc biệt vào **${target.name}**! **${dmg}** sát thương!`);
      } else {
        log.push(`${enemy.icon} **${enemy.name}** tấn công **${target.name}** gây **${dmg}** sát thương.`);
      }

      members[tIdx] = { ...members[tIdx], hp: Math.max(0, members[tIdx].hp - dmg) };
      if (members[tIdx].hp <= 0) {
        members[tIdx] = { ...members[tIdx], alive: false };
        log.push(`💀 **${target.name}** đã ngã xuống!`);
      }
    }

    turn++;

    // ── Check party wipe ───────────────────────────────────────────────────────
    if (members.every(m => !m.alive)) break;
  }

  const allDead = members.every(m => !m.alive);

  // ── Save HP/MP back to DB for all members ──────────────────────────────────
  for (const m of members) {
    updatePlayerHpMp(m.user_id, guildId, m.alive ? m.hp : 1, m.mp);
  }

  if (allDead) {
    // Party wipe
    await interaction.editReply({
      embeds: [new EmbedBuilder().setColor(COLORS.death)
        .setTitle('💀 Party Toàn Diệt!')
        .setDescription(`${enemy.icon} **${enemy.name}** đã hạ gục toàn bộ party.\n\nMỗi người còn 1 HP.`)],
      components: []
    });
    if (onWipe) await onWipe(members, enemy);
    return;
  }

  // ── Victory ────────────────────────────────────────────────────────────────
  const survivors = members.filter(m => m.alive);
  const expReward  = Math.round(baseDef.expReward / survivors.length);
  const goldReward = Math.round(
    randInt(baseDef.goldMin ?? 5, baseDef.goldMax ?? 20) / survivors.length
  );

  const rewardLines: string[] = [];
  for (const m of survivors) {
    grantExp(m.user_id, guildId, expReward);
    grantGold(m.user_id, guildId, goldReward);
    incrementKills(m.user_id, guildId);
    rewardLines.push(`⚔️ **${m.name}** — +**${expReward} EXP**, +**${goldReward} Gold**`);
  }
  for (const m of members.filter(m => !m.alive)) {
    rewardLines.push(`💀 ~~**${m.name}**~~ — KO'd, không nhận thưởng`);
  }

  await interaction.editReply({
    embeds: [new EmbedBuilder().setColor(COLORS.success)
      .setTitle(`🏆 Chiến Thắng! ${enemy.icon} ${enemy.name} Bị Hạ!`)
      .setDescription(
        `Party đã chiến thắng sau **${turn - 1} lượt**!\n\n` +
        `**Phần thưởng (chia đều):**\n${rewardLines.join('\n')}`
      )
    ],
    components: []
  });

  if (onVictory) await onVictory(members, enemy);
}
