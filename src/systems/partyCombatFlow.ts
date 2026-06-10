/**
 * Turn-based party combat.
 * Each turn, alive members choose actions sequentially (one at a time).
 * After all members choose, actions resolve, then the enemy attacks one random alive member.
 *
 * Enemy HP is scaled: base × (1 + 0.65 × extraMembers).
 * Bosses use stronger raid scaling, phase transitions, and special attacks.
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
import { ENEMIES, getEnemy } from '../data/enemies';
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
import { getBossLevelScaling } from './bossScaling';

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
  level: number;
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
  base_atk?: number;
  phaseIndex?: number;
  guard_turns?: number;
  level_special_bonus?: number;
}

type PartyAction = 'attack' | 'defend' | 'potion' | 'flee';

// ── Helpers ──────────────────────────────────────────────────────────────────

const SESSION_TIMEOUT_MS = 60_000;
const PARTY_MAX_STAMINA = 100;
const ATTACK_STAMINA_COST = 15;
const DEFEND_STAMINA_GAIN = 25;
const TURN_STAMINA_REGEN = 6;


function isDiscordInvalidComponentsError(err: any): boolean {
  return err?.code === 50035 && String(err?.rawError?.message ?? '').includes('Invalid Form Body');
}

function logDiscordComponentError(context: string, err: any): void {
  const details = err?.rawError?.errors ? JSON.stringify(err.rawError.errors, null, 2) : '';
  console.warn(`[PARTY_COMBAT] Discord rejected components at ${context}.${details ? `
${details}` : ''}`);
}

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

function currentEnemyDef(enemy: PartyCombatEnemy): number {
  if ((enemy.guard_turns ?? 0) <= 0) return enemy.def;
  return enemy.def + Math.max(6, Math.floor(enemy.def * 0.35));
}

function pickMany<T>(arr: T[], count: number): T[] {
  const pool = [...arr];
  const out: T[] = [];
  while (pool.length > 0 && out.length < count) {
    const idx = randInt(0, pool.length - 1);
    out.push(pool.splice(idx, 1)[0]);
  }
  return out;
}

function getSpecialLabel(special: string): string {
  const labels: Record<string, string> = {
    oak_bark_armor: 'Bark Armor', oak_root_slam: 'Oak Root Slam', oak_regen: 'Oak Regen', oak_regen_deep: 'Deep Oak Regen',
    splinter_rain: 'Splinter Rain', vine_whip: 'Vine Whip', oak_ancient_rage: 'Ancient Rage', thorn_burst: 'Thorn Burst', bark_rend: 'Bark Rend',
    divine_judgment: 'Divine Judgment', shatter_guard: 'Shatter Guard', enrage: 'Enrage', death_curse: 'Death Curse', banish: 'Banish', screech: 'Screech',
    cave_in: 'Cave In', seismic_slam: 'Seismic Slam', magma_core: 'Magma Core', iron_crush: 'Iron Crush', fortress_stance: 'Fortress Stance',
    erase: 'Erase', butterfly_curse: 'Butterfly Curse', forgotten_rage: 'Forgotten Rage', doom_call: 'Doom Call', reality_tear: 'Reality Tear', skill_echo: 'Skill Echo', mind_crush: 'Mind Crush',
  };
  return labels[special] ?? special.replace(/_/g, ' ');
}

function getPartySpecialProfile(special: string, enemy: PartyCombatEnemy, aliveCount: number): { mult: number; targets: number; pierce?: boolean; healPct?: number; guard?: number } {
  const phase = enemy.phaseIndex ?? 1;
  const aoe2 = new Set(['splinter_rain', 'thorn_burst', 'divine_judgment', 'cave_in', 'seismic_slam', 'magma_core', 'butterfly_curse', 'reality_tear', 'doom_call']);
  const aoe3 = new Set(['oak_ancient_rage', 'erase', 'forgotten_rage', 'thorn_burst', 'splinter_rain']);
  const pierce = new Set(['oak_ancient_rage', 'erase', 'banish', 'abyss_strike', 'reality_tear']);

  const multMap: Record<string, number> = {
    oak_root_slam: 1.65, splinter_rain: 1.25, vine_whip: 1.50, oak_ancient_rage: 2.45, thorn_burst: 1.55, bark_rend: 1.70,
    divine_judgment: 1.70, shatter_guard: 1.45, enrage: 1.60, death_curse: 1.85, banish: 1.35, screech: 1.15,
    cave_in: 1.55, seismic_slam: 1.85, magma_core: 1.75, iron_crush: 1.60,
    erase: 2.35, butterfly_curse: 1.45, forgotten_rage: 2.05, doom_call: 2.10, reality_tear: 1.65, skill_echo: 1.35, mind_crush: 1.55,
  };

  if (special === 'oak_regen') return { mult: 0, targets: 0, healPct: 0.10 };
  if (special === 'oak_regen_deep') return { mult: 0, targets: 0, healPct: 0.075 };
  if (special === 'nature_regeneration') return { mult: 0, targets: 0, healPct: 0.10 };
  if (special === 'fortress_stance') return { mult: 0, targets: 0, healPct: 0.055, guard: 2 };
  if (special === 'oak_bark_armor') return { mult: 0, targets: 0, healPct: 0.045, guard: 2 };

  const targets = aoe3.has(special) && phase >= 3
    ? Math.min(aliveCount, 3)
    : aoe2.has(special)
      ? Math.min(aliveCount, phase >= 3 ? 3 : 2)
      : 1;

  return {
    mult: multMap[special] ?? (enemy.boss ? (phase >= 3 ? 1.75 : 1.45) : 1.35),
    targets,
    pierce: pierce.has(special),
  };
}

function maybeTriggerBossPhase(enemy: PartyCombatEnemy, baseDef: any, log: string[]): void {
  if (!enemy.boss || !Array.isArray(baseDef.phases) || baseDef.phases.length === 0) return;

  const phases = [...baseDef.phases].sort((a, b) => a.phaseIndex - b.phaseIndex);
  let changed = true;
  while (changed) {
    changed = false;
    const hpPct = enemy.hp / Math.max(1, enemy.max_hp);
    const next = phases.find(p => p.phaseIndex > (enemy.phaseIndex ?? 1) && hpPct <= p.threshold);
    if (!next) break;

    enemy.phaseIndex = next.phaseIndex;
    enemy.name = next.name ?? enemy.name;
    enemy.icon = next.icon ?? enemy.icon;
    enemy.atk = Math.round((enemy.base_atk ?? enemy.atk) * (next.atkMult ?? 1));

    const heal = next.healOnTransition ? Math.max(1, Math.floor(enemy.max_hp * next.healOnTransition)) : 0;
    if (heal > 0) enemy.hp = Math.min(enemy.max_hp, enemy.hp + heal);
    log.push(`${next.transitionMsg ?? `⚠️ **${enemy.name}** chuyển phase!`}${heal > 0 ? ` (+${heal} HP)` : ''}`);
    changed = true;
  }
}

function getPartyAttackPool(enemy: PartyCombatEnemy, baseDef: any): string[] {
  const phase = enemy.boss && Array.isArray(baseDef.phases)
    ? baseDef.phases.find((p: any) => p.phaseIndex === (enemy.phaseIndex ?? 1))
    : null;
  const pool = phase?.specialAttacks?.length ? phase.specialAttacks : enemy.specialAttacks;
  return Array.isArray(pool) ? pool : [];
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

function displayDrop(itemId: string): string {
  const it = getItem(itemId) ?? getMaterial(itemId) ?? getEquipment(itemId);
  return it ? `${it.icon} ${it.name}` : itemId;
}

function rollPartyDrops(userId: string, guildId: string, enemyDef: any): string[] {
  const drops: string[] = [];

  // Guaranteed drops must work in party combat too, otherwise miniboss route items can be missed.
  for (const itemId of enemyDef.guaranteedDrops ?? []) {
    addItem(userId, guildId, itemId, 1);
    drops.push(displayDrop(itemId));
  }

  for (const drop of enemyDef.drops ?? []) {
    if (Math.random() * 100 <= drop.chance) {
      addItem(userId, guildId, drop.itemId, 1);
      drops.push(displayDrop(drop.itemId));
    }
  }

  const eqDrops = Object.values(EQUIPMENT).filter(e => e.dropFrom?.includes(enemyDef.id) && e.dropChance);
  for (const eq of eqDrops) {
    if (Math.random() * 100 <= (eq.dropChance ?? 0)) {
      addItem(userId, guildId, eq.id, 1);
      drops.push(displayDrop(eq.id));
    }
  }
  return drops;
}

// ── Main flow ─────────────────────────────────────────────────────────────────

export interface PartyCombatOptions {
  /** Set false for event combats that handle their own rewards/message in onVictory. */
  grantDefaultRewards?: boolean;
}

export async function startPartyCombatFlow(
  interaction: ChatInputCommandInteraction,
  leaderId: string,
  guildId: string,
  memberIds: string[],
  enemyId: string,
  onVictory?: (members: PartyMember[], enemy: PartyCombatEnemy) => Promise<void>,
  onWipe?: (members: PartyMember[], enemy: PartyCombatEnemy) => Promise<void>,
  options: PartyCombatOptions = {}
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
      level: p.level ?? base.level ?? 1,
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
  const baseDef = getEnemy(enemyId);
  if (!baseDef) {
    await interaction.editReply({
      embeds: [new EmbedBuilder().setColor(COLORS.warning).setDescription(`⚠️ Không tìm thấy enemy ID: ${enemyId}`)],
      components: []
    });
    return;
  }
  const extraMembers = Math.max(0, members.length - 1);
  const isBoss = !!baseDef.boss;
  const levelScaling = isBoss ? getBossLevelScaling(baseDef, members.map(m => m.level)) : null;
  const hpScale = (isBoss ? (1.20 + 1.05 * extraMembers) : (1 + 0.65 * extraMembers)) * (levelScaling?.hpMult ?? 1);
  const atkScale = (isBoss ? (1.10 + 0.18 * extraMembers) : (1 + 0.10 * extraMembers)) * (levelScaling?.atkMult ?? 1);
  const defScale = levelScaling?.defMult ?? 1;
  const scaledHp = Math.round(baseDef.hp * hpScale);
  const scaledAtk = Math.round(baseDef.atk * atkScale);
  const scaledDef = Math.round(baseDef.def * defScale);
  const enemy: PartyCombatEnemy = {
    id: baseDef.id,
    name: baseDef.name,
    icon: baseDef.icon,
    hp: scaledHp,
    max_hp: scaledHp,
    atk: scaledAtk,
    base_atk: scaledAtk,
    def: scaledDef,
    boss: baseDef.boss ?? false,
    specialAttacks: baseDef.specialAttacks ?? [],
    phaseIndex: 1,
    guard_turns: 0,
    level_special_bonus: levelScaling?.specialBonus ?? 0
  };

  const sessionId = `${leaderId.slice(-6)}_${Date.now().toString(36)}`;
  const log: string[] = levelScaling?.desc ? [levelScaling.desc] : [];
  let turn = 1;

  // ── Turn loop ────────────────────────────────────────────────────────────────
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const aliveMembers = members.filter(m => m.alive);
    if (aliveMembers.length === 0) break;
    if (enemy.hp <= 0) break;

    // Collect actions sequentially — one member at a time
    const actions = new Map<string, PartyAction>();
    let reply: Message<boolean>;

    for (let idx = 0; idx < aliveMembers.length; idx++) {
      const currentMember = aliveMembers[idx];
      const embed = buildCombatEmbed(members, enemy, turn, log, currentMember.user_id, actions);
      try {
        // Build a fresh row for each edit; reusing builder instances across many edits can make debugging Discord component errors harder.
        reply = await interaction.editReply({ embeds: [embed], components: [buildActionRow(sessionId)] }) as Message<boolean>;
      } catch (err: any) {
        if (isDiscordInvalidComponentsError(err)) {
          logDiscordComponentError('turn action row', err);
          await interaction.editReply({
            embeds: [new EmbedBuilder(embed.toJSON()).setFooter({ text: '⚠️ Discord từ chối nút combat. Trận này đã được dừng an toàn, hãy thử lại.' })],
            components: []
          }).catch(() => {});
          return;
        }
        throw err;
      }

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
    const fleeChance = enemy.boss ? 18 : 50;
    if (fleeCount > 0 && randInt(1, 100) <= fleeChance) {
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
        const enemyDefNow = currentEnemyDef(enemy);
        const dmg = calcDmg(members[mIdx].atk, enemyDefNow);
        enemy.hp = Math.max(0, enemy.hp - dmg);
        log.push(`⚔️ **${members[mIdx].name}** gây **${dmg}** sát thương! (${enemy.hp}/${enemy.max_hp})${enemy.guard_turns ? ' 🛡️' : ''}`);
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

    // Boss phase transition happens after party damage resolves, before the boss turn.
    maybeTriggerBossPhase(enemy, baseDef, log);

    // ── Enemy attacks party members ────────────────────────────────────────────
    const targets = members.filter(m => m.alive);
    if (targets.length > 0) {
      const phase = enemy.phaseIndex ?? 1;
      const attackPool = getPartyAttackPool(enemy, baseDef);
      const baseSpecialChance = enemy.boss ? (phase >= 3 ? 72 : phase >= 2 ? 58 : 45) : 25;
      const specialChance = Math.min(88, baseSpecialChance + (enemy.level_special_bonus ?? 0));
      const special = attackPool.length > 0 && randInt(1, 100) <= specialChance ? pick(attackPool) : null;

      if (special) {
        const profile = getPartySpecialProfile(special, enemy, targets.length);
        const label = getSpecialLabel(special);

        if ((profile.healPct ?? 0) > 0) {
          const heal = Math.max(1, Math.floor(enemy.max_hp * (profile.healPct ?? 0)));
          enemy.hp = Math.min(enemy.max_hp, enemy.hp + heal);
          if (profile.guard) enemy.guard_turns = Math.max(enemy.guard_turns ?? 0, profile.guard);
          log.push(`${enemy.icon} **${enemy.name}** dùng **${label}** — hồi **${heal} HP**${profile.guard ? ` và nhận giáp trong ${profile.guard} lượt` : ''}!`);
        } else {
          const selectedTargets = pickMany(targets, Math.max(1, profile.targets));
          const hitLines: string[] = [];
          for (const target of selectedTargets) {
            const tIdx = members.findIndex(m => m.user_id === target.user_id);
            if (tIdx < 0 || !members[tIdx].alive) continue;

            const isDefending = defenders.has(target.user_id);
            const defendBonus = isDefending ? Math.floor(target.def * 0.75) : 0;
            const effectiveDef = profile.pierce ? 0 : target.def + defendBonus;
            const baseDmg = calcDmg(enemy.atk, effectiveDef);
            const dmg = Math.max(1, Math.floor(baseDmg * profile.mult));

            members[tIdx] = { ...members[tIdx], hp: Math.max(0, members[tIdx].hp - dmg) };
            hitLines.push(`**${target.name}** −${dmg} HP${isDefending ? ' 🛡️' : ''}`);
            if (members[tIdx].hp <= 0) {
              members[tIdx] = { ...members[tIdx], alive: false };
              hitLines.push(`💀 **${target.name}** đã ngã xuống!`);
            }
          }
          log.push(`${enemy.icon} **${enemy.name}** dùng **${label}**! ${hitLines.join(' · ')}`);
        }
      } else {
        const target = pick(targets);
        const tIdx = members.findIndex(m => m.user_id === target.user_id);
        const isDefending = defenders.has(target.user_id);
        const effectiveDef = target.def + (isDefending ? Math.floor(target.def * 0.5) : 0);
        const dmg = calcDmg(enemy.atk, effectiveDef);

        log.push(`${enemy.icon} **${enemy.name}** tấn công **${target.name}** gây **${dmg}** sát thương.`);
        members[tIdx] = { ...members[tIdx], hp: Math.max(0, members[tIdx].hp - dmg) };
        if (members[tIdx].hp <= 0) {
          members[tIdx] = { ...members[tIdx], alive: false };
          log.push(`💀 **${target.name}** đã ngã xuống!`);
        }
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

    if ((enemy.guard_turns ?? 0) > 0) enemy.guard_turns = Math.max(0, (enemy.guard_turns ?? 0) - 1);

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

  if (options.grantDefaultRewards === false) {
    await interaction.editReply({
      embeds: [new EmbedBuilder().setColor(COLORS.success)
        .setTitle(`🏆 Party Chiến Thắng! ${enemy.icon} ${enemy.name} Bị Hạ!`)
        .setDescription(`Party đã chiến thắng sau **${turn - 1} lượt**.`)],
      components: []
    });
    if (onVictory) await onVictory(survivors, enemy);
    return;
  }

  const rewardScale = levelScaling?.rewardMult ?? 1;
  const expReward  = Math.round((baseDef.expReward * rewardScale) / survivors.length);
  const goldReward = Math.round(
    randInt(Math.round((baseDef.goldMin ?? 5) * rewardScale), Math.round((baseDef.goldMax ?? 20) * rewardScale)) / survivors.length
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


/**
 * Party combat for event-generated enemies that are not static entries in data/enemies.ts.
 * It temporarily registers the enemy by ID, then reuses normal party combat.
 */
export async function startPartyCombatFlowWithEnemy(
  interaction: ChatInputCommandInteraction,
  leaderId: string,
  guildId: string,
  memberIds: string[],
  enemy: any,
  onVictory?: (members: PartyMember[], enemy: PartyCombatEnemy) => Promise<void>,
  onWipe?: (members: PartyMember[], enemy: PartyCombatEnemy) => Promise<void>,
  options: PartyCombatOptions = {}
): Promise<void> {
  if (!enemy?.id) {
    await interaction.editReply({
      embeds: [new EmbedBuilder().setColor(COLORS.warning).setDescription('⚠️ Event enemy không có ID hợp lệ.')],
      components: []
    });
    return;
  }

  if (!ENEMIES[enemy.id]) ENEMIES[enemy.id] = enemy;
  await startPartyCombatFlow(interaction, leaderId, guildId, memberIds, enemy.id, onVictory, onWipe, options);
}
