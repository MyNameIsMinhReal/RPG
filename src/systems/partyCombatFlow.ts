/**
 * Turn-based party combat.
 * Each turn, alive members choose actions sequentially (one at a time).
 * After all members choose, actions resolve, then the enemy attacks one random alive member.
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
import { getPlayer, grantExp, grantGold, updatePlayerHpMp, applyPassiveStats, removeItem, addItem } from './player';
import { getEnemy } from '../data/enemies';
import { getItem } from '../data/items';
import { getMaterial } from '../data/materials';
import { EQUIPMENT, getEquipment } from '../data/equipment';
import { incrementKills } from './player';
import { COLORS } from '../utils/embeds';
import { randInt, pick, bar } from '../utils/format';
import { incrementDaily, countsAsPotion } from '../commands/daily';
import { incrementChapterObjective } from './chapter';
import { logEvent, onBossKilled } from './world';
import { unlockRecipesBySource } from './crafting';

// ── Types ────────────────────────────────────────────────────────────────────

export interface PartyMember {
  user_id: string;
  name: string;
  hp: number;
  max_hp: number;
  mp: number;
  max_mp: number;
  stamina: number;
  max_stamina: number;
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
const PARTY_MAX_STAMINA = 100;
const ATTACK_STAMINA_COST = 15;
const DEFEND_STAMINA_GAIN = 25;
const TURN_STAMINA_REGEN = 6;

function hpBar(hp: number, max: number): string {
  const pct = Math.max(0, Math.min(1, hp / max));
  const filled = Math.round(pct * 8);
  return '█'.repeat(filled) + '░'.repeat(8 - filled);
}

const ACTION_LABEL: Record<PartyAction, string> = {
  attack: '⚔️ Tấn công',
  defend: '🛡️ Phòng thủ',
  potion: '🧪 Potion',
  flee: '🏃 Bỏ chạy',
};

function buildCombatEmbed(
  members: PartyMember[],
  enemy: PartyCombatEnemy,
  turn: number,
  log: string[],
  currentMemberId: string | null,
  decidedActions: Map<string, PartyAction>
): EmbedBuilder {
  const memberLines = members.map(m => {
    if (!m.alive) return `💀 ~~**${m.name}**~~ — KO'd`;
    const staWarn = m.stamina <= 10 ? '  ⚠️ *kiệt sức!*' : '';

    let statusTag: string;
    if (decidedActions.has(m.user_id)) {
      statusTag = `✅ ${ACTION_LABEL[decidedActions.get(m.user_id)!]}`;
    } else if (m.user_id === currentMemberId) {
      statusTag = `🎯 **Đến lượt bạn!**`;
    } else {
      statusTag = `⏳ Chờ đến lượt...`;
    }

    return [
      `**${m.name}** — ${statusTag}`,
      `❤️ \`${bar(m.hp, m.max_hp, 8)}\` **${m.hp}**/${m.max_hp} HP`,
      `💧 \`${bar(m.mp, m.max_mp, 8)}\` **${m.mp}**/${m.max_mp} MP`,
      `⚡ \`${bar(m.stamina, m.max_stamina, 8)}\` **${m.stamina}**/${m.max_stamina} Stamina${staWarn}`
    ].join('\n');
  }).join('\n\n');

  const eBar = hpBar(enemy.hp, enemy.max_hp);
  const currentName = currentMemberId
    ? members.find(m => m.user_id === currentMemberId)?.name ?? null
    : null;

  return new EmbedBuilder()
    .setColor(COLORS.danger)
    .setTitle(`⚔️ Party Combat — Lượt ${turn}`)
    .setDescription(
      `${enemy.icon} **${enemy.name}**\n${eBar} ${enemy.hp}/${enemy.max_hp} HP\n\n` +
      `**Party:**\n${memberLines}`
    )
    .addFields({ name: '📜 Log', value: log.slice(-4).join('\n') || '*Bắt đầu chiến đấu...*', inline: false })
    .setFooter({ text: currentName ? `🎯 Đến lượt: ${currentName} · Timeout 60s = Phòng thủ` : 'Đang xử lý...' });
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

function applyPotion(member: PartyMember, userId: string, guildId: string): { member: PartyMember; log: string; consumed: boolean; itemId?: string } {
  const pid = findBestPotion(userId, guildId);
  if (!pid) return { member, log: `🧪 **${member.name}** không có potion nào!`, consumed: false };

  const item = getItem(pid);
  const effect: any = item?.effect ?? {};
  if (!item || item.type !== 'consumable') {
    return { member, log: `🧪 **${member.name}** không dùng được vật phẩm này!`, consumed: false };
  }

  const beforeHp = member.hp;
  const beforeMp = member.mp;
  let hp = member.hp;
  let mp = member.mp;

  if (effect.hpPercent) hp = Math.min(member.max_hp, hp + Math.max(1, Math.floor(member.max_hp * effect.hpPercent)));
  if (effect.hp) hp = Math.min(member.max_hp, hp + effect.hp);
  if (effect.mpPercent) mp = Math.min(member.max_mp, mp + Math.max(1, Math.floor(member.max_mp * effect.mpPercent)));
  if (effect.mp) mp = Math.min(member.max_mp, mp + effect.mp);

  const consumed = removeItem(userId, guildId, pid, 1);
  if (!consumed) return { member, log: `🧪 **${member.name}** không có ${item.name}!`, consumed: false };

  const hpGain = hp - beforeHp;
  const mpGain = mp - beforeMp;
  const parts = [hpGain > 0 ? `+${hpGain} HP` : '', mpGain > 0 ? `+${mpGain} MP` : ''].filter(Boolean).join(', ') || 'không hồi thêm vì đã đầy';
  return {
    member: { ...member, hp, mp },
    log: `🧪 **${member.name}** dùng **${item.icon} ${item.name}** — ${parts}.`,
    consumed: true,
    itemId: pid
  };
}

function rollPartyDrops(userId: string, guildId: string, enemyDef: any): string[] {
  const drops: string[] = [];
  for (const drop of enemyDef.drops ?? []) {
    if (Math.random() * 100 <= drop.chance) {
      addItem(userId, guildId, drop.itemId, 1);
      const it = getItem(drop.itemId) ?? getMaterial(drop.itemId);
      drops.push(it ? `${it.icon} ${it.name}` : drop.itemId);
    }
  }

  const eqDrops = Object.values(EQUIPMENT).filter(e => e.dropFrom?.includes(enemyDef.id) && e.dropChance);
  for (const eq of eqDrops) {
    if (Math.random() * 100 <= (eq.dropChance ?? 0)) {
      addItem(userId, guildId, eq.id, 1);
      const def = getEquipment(eq.id);
      drops.push(def ? `${def.icon} ${def.name}` : eq.id);
    }
  }
  return drops;
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
  const members: PartyMember[] = [];
  for (const uid of memberIds) {
    const base = getPlayer(uid, guildId);
    if (!base?.alive) continue;
    const p = applyPassiveStats(base);
    members.push({
      user_id: uid,
      name: p.name,
      hp: p.hp,
      max_hp: p.max_hp,
      mp: p.mp,
      max_mp: p.max_mp,
      stamina: PARTY_MAX_STAMINA,
      max_stamina: PARTY_MAX_STAMINA,
      atk: p.atk,
      def: p.def,
      alive: true
    });
  }

  if (members.length === 0) {
    await interaction.editReply({
      embeds: [new EmbedBuilder().setColor(COLORS.warning).setDescription('⚠️ Không có thành viên party nào còn sống để bắt đầu combat.')],
      components: []
    });
    return;
  }
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

    // Collect actions sequentially — one member at a time
    const actions = new Map<string, PartyAction>();
    const row = buildActionRow(sessionId);

    let reply: Message<boolean>;

    for (let idx = 0; idx < aliveMembers.length; idx++) {
      const currentMember = aliveMembers[idx];
      const embed = buildCombatEmbed(members, enemy, turn, log, currentMember.user_id, actions);
      reply = await interaction.editReply({ embeds: [embed], components: [row] }) as Message<boolean>;

      const action = await new Promise<PartyAction>(resolve => {
        const collector = reply!.createMessageComponentCollector({
          filter: i => i.user.id === currentMember.user_id && i.customId.endsWith(`_${sessionId}`),
          time: SESSION_TIMEOUT_MS,
          max: 1
        });
        collector.on('collect', async i => {
          await i.deferUpdate().catch(() => {});
          const a: PartyAction =
            i.customId.startsWith('pca_atk') ? 'attack' :
            i.customId.startsWith('pca_def') ? 'defend' :
            i.customId.startsWith('pca_pot') ? 'potion' : 'flee';
          resolve(a);
        });
        collector.on('end', (collected) => {
          if (collected.size === 0) resolve('defend');
        });
      });

      actions.set(currentMember.user_id, action);
    }

    // ── Check flee ─────────────────────────────────────────────────────────────
    const fleeCount = [...actions.values()].filter(a => a === 'flee').length;
    if (fleeCount > 0 && randInt(1, 100) <= 50) {
      for (const m of members) updatePlayerHpMp(m.user_id, guildId, m.alive ? m.hp : 1, m.mp);
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
        if ((members[mIdx].stamina ?? PARTY_MAX_STAMINA) <= 10) {
          defenders.add(uid);
          members[mIdx] = {
            ...members[mIdx],
            stamina: Math.min(members[mIdx].max_stamina, members[mIdx].stamina + DEFEND_STAMINA_GAIN)
          };
          log.push(`⚡ **${members[mIdx].name}** quá kiệt sức để tấn công nên chuyển sang phòng thủ.`);
          continue;
        }

        members[mIdx] = {
          ...members[mIdx],
          stamina: Math.max(0, members[mIdx].stamina - ATTACK_STAMINA_COST)
        };
        const dmg = calcDmg(members[mIdx].atk, enemy.def);
        enemy.hp = Math.max(0, enemy.hp - dmg);
        log.push(`⚔️ **${members[mIdx].name}** gây **${dmg}** sát thương! (${enemy.hp}/${enemy.max_hp})`);
        if (enemy.hp <= 0) break;
      } else if (action === 'defend') {
        defenders.add(uid);
        members[mIdx] = {
          ...members[mIdx],
          stamina: Math.min(members[mIdx].max_stamina, members[mIdx].stamina + DEFEND_STAMINA_GAIN)
        };
        log.push(`🛡️ **${members[mIdx].name}** phòng thủ và hồi **${DEFEND_STAMINA_GAIN} ⚡ Stamina**.`);
      } else if (action === 'potion') {
        const { member: updated, log: pLog, consumed, itemId } = applyPotion(members[mIdx], uid, guildId);
        members[mIdx] = updated;
        if (consumed && itemId && countsAsPotion(itemId)) incrementDaily(uid, guildId, 'potion_used');
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
      if (!enemy.boss && Array.isArray(enemy.specialAttacks) && enemy.specialAttacks.length > 0 && randInt(1, 100) <= 25) {
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

    // Natural stamina regen each turn end
    for (let i = 0; i < members.length; i++) {
      if (!members[i].alive) continue;
      members[i] = {
        ...members[i],
        stamina: Math.min(members[i].max_stamina, members[i].stamina + TURN_STAMINA_REGEN)
      };
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
  const bossLines: string[] = [];
  for (const m of survivors) {
    grantExp(m.user_id, guildId, expReward);
    grantGold(m.user_id, guildId, goldReward);
    incrementKills(m.user_id, guildId);
    incrementDaily(m.user_id, guildId, 'kill_count');
    const fresh = getPlayer(m.user_id, guildId);
    if (fresh) {
      incrementChapterObjective(m.user_id, guildId, 'kill_in_zone', { zoneId: fresh.zone_id, enemyId: baseDef.id });
      if (baseDef.boss) incrementChapterObjective(m.user_id, guildId, 'kill_boss', { zoneId: fresh.zone_id, enemyId: baseDef.id });
      logEvent(guildId, m.user_id, fresh.name, baseDef.boss ? 'boss_kill' : 'kill', `cùng party tiêu diệt **${baseDef.icon} ${baseDef.name}**.`, fresh.zone_id);
      if (baseDef.boss && baseDef.deathWorldFlag) unlockRecipesBySource(m.user_id, guildId, baseDef.id);
    }
    const drops = rollPartyDrops(m.user_id, guildId, baseDef);
    rewardLines.push(`⚔️ **${m.name}** — +**${expReward} EXP**, +**${goldReward} Gold**${drops.length ? `\n  📦 ${drops.join(', ')}` : ''}`);
  }
  if (baseDef.boss && baseDef.deathWorldFlag && survivors[0]) {
    const first = getPlayer(survivors[0].user_id, guildId);
    if (first) bossLines.push(onBossKilled(guildId, baseDef.id, first.name, first.zone_id));
  }
  for (const m of members.filter(m => !m.alive)) {
    rewardLines.push(`💀 ~~**${m.name}**~~ — KO'd, không nhận thưởng`);
  }

  await interaction.editReply({
    embeds: [new EmbedBuilder().setColor(COLORS.success)
      .setTitle(`🏆 Chiến Thắng! ${enemy.icon} ${enemy.name} Bị Hạ!`)
      .setDescription(
        `Party đã chiến thắng sau **${turn - 1} lượt**!\n\n` +
        `**Phần thưởng (chia đều):**\n${rewardLines.join('\n')}\n${bossLines.length ? `\n${bossLines.join('\n')}` : ''}`
      )
    ],
    components: []
  });

  if (onVictory) await onVictory(members, enemy);
}
