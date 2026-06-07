import db from '../database/index';
import { randInt, pick } from '../utils/format';
import { getSkill } from '../data/skills';
import { getEnemy, type EnemyDef } from '../data/enemies';
import { getLoadout, applyPassiveStats, getPlayer, getClassPassives } from './player';
import { getEquipmentStats } from './equipment';
import { getBuff, consumeBuff } from './consumables';
import type { CombatState, CombatEnemy } from '../utils/embeds';
import type { PlayerRow } from '../utils/embeds';

export interface Effect {
  name: string;
  duration: number;
  value?: number;
  target?: 'player' | 'enemy';
}

// ── Combat CRUD ───────────────────────────────────────────────────────────
export function getCombat(messageId: string): CombatState | undefined {
  return db.prepare('SELECT * FROM active_combats WHERE message_id = ?')
    .get(messageId) as unknown as CombatState | undefined;
}

export function getCombatByUser(userId: string, guildId: string): CombatState | undefined {
  return db.prepare('SELECT * FROM active_combats WHERE user_id = ? AND guild_id = ?')
    .get(userId, guildId) as unknown as CombatState | undefined;
}

export function deleteCombat(messageId: string): void {
  db.prepare('DELETE FROM active_combats WHERE message_id = ?').run(messageId);
}

export function saveCombat(state: CombatState): void {
  db.prepare(`
    INSERT OR REPLACE INTO active_combats
    (message_id, channel_id, user_id, guild_id, enemy_id, enemy_name,
     enemy_hp, enemy_max_hp, enemy_atk, enemy_def,
     player_hp, player_max_hp, player_mp, player_max_mp,
     player_def, turn, is_defending, active_effects, combat_log,
     player_stamina, player_max_stamina, enemies_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    state.message_id ?? '',    state.channel_id ?? '',  state.user_id ?? '',  state.guild_id ?? '',
    state.enemy_id ?? '',      state.enemy_name ?? '',
    state.enemy_hp ?? 0,       state.enemy_max_hp ?? 0, state.enemy_atk ?? 0, state.enemy_def ?? 0,
    state.player_hp ?? 0,      state.player_max_hp ?? 0, state.player_mp ?? 0, state.player_max_mp ?? 0,
    (state as any).player_def ?? 0, state.turn ?? 1,           state.is_defending ?? 0,
    state.active_effects ?? '[]', state.combat_log ?? '[]',
    state.player_stamina ?? 100, state.player_max_stamina ?? 100,
    state.enemies_json ?? null
  );
}

// ── Group combat helpers ──────────────────────────────────────────────────
export function getGroupEnemies(state: CombatState): CombatEnemy[] | null {
  if (!state.enemies_json) return null;
  try { return JSON.parse(state.enemies_json); } catch { return null; }
}

export function areAllEnemiesDead(state: CombatState): boolean {
  const enemies = getGroupEnemies(state);
  if (!enemies) return state.enemy_hp <= 0;
  return enemies.every(e => e.hp <= 0);
}

export function getFirstAliveEnemy(enemies: CombatEnemy[]): { enemy: CombatEnemy; idx: number } | null {
  const idx = enemies.findIndex(e => e.hp > 0);
  return idx >= 0 ? { enemy: enemies[idx], idx } : null;
}

export function buildGroupCombatState(
  base: Omit<CombatState, 'enemies_json'>,
  enemies: CombatEnemy[]
): CombatState {
  const primary = enemies[0];
  return {
    ...base,
    enemy_id: primary.id,
    enemy_name: primary.name,
    enemy_hp: primary.hp,
    enemy_max_hp: primary.max_hp,
    enemy_atk: primary.atk,
    enemy_def: primary.def,
    enemies_json: JSON.stringify(enemies)
  };
}

export function startCombat(
  messageId: string, channelId: string,
  player: PlayerRow, guildId: string, enemy: EnemyDef
): CombatState {
  const boosted = applyPassiveStats(player);
  const state: CombatState = {
    message_id: messageId, channel_id: channelId,
    user_id: player.user_id, guild_id: guildId,
    enemy_id: enemy.id, enemy_name: enemy.name,
    enemy_hp: enemy.hp, enemy_max_hp: enemy.hp,
    enemy_atk: enemy.atk, enemy_def: enemy.def,
    player_hp: boosted.hp, player_max_hp: boosted.max_hp,
    player_mp: boosted.mp, player_max_mp: boosted.max_mp,
    player_def: boosted.def,
    turn: 1, is_defending: 0,
    active_effects: '[]', combat_log: '[]',
    player_stamina: 100, player_max_stamina: 100
  };
  saveCombat(state);
  return state;
}

// ── Passive snapshot ──────────────────────────────────────────────────────
interface Passives {
  hasBerserker: boolean;
  hasVampiric: boolean;
  hasCounter: boolean;
  hasLastStand: boolean;
  hpRegenPerTurn: number;
  mpRegenPerTurn: number;
  lifestealBonus: number;
}

function getPassives(userId: string, guildId: string): Passives {
  const loadout = getLoadout(userId, guildId);
  const p: Passives = {
    hasBerserker: false, hasVampiric: false,
    hasCounter: false, hasLastStand: false,
    hpRegenPerTurn: 0, mpRegenPerTurn: 0, lifestealBonus: 0
  };
  for (const entry of loadout) {
    const sk = getSkill(entry.skill_id);
    if (!sk) continue;
    switch (sk.id) {
      case 'berserker':  p.hasBerserker  = true; break;
      case 'vampiric':   p.hasVampiric   = true; break;
      case 'counter':    p.hasCounter    = true; break;
      case 'last_stand': p.hasLastStand  = true; break;
    }
    if (sk.type === 'passive' && sk.passiveBonus) {
      p.hpRegenPerTurn += sk.passiveBonus.hpRegen ?? 0;
      p.mpRegenPerTurn += sk.passiveBonus.mpRegen ?? 0;
      p.lifestealBonus += sk.passiveBonus.lifesteal ?? 0;
      p.hasVampiric = p.hasVampiric || ((sk.passiveBonus.lifesteal ?? 0) > 0);
    }
  }
  return p;
}

// ── Effect helpers ────────────────────────────────────────────────────────
export function parseEffects(raw: string): Effect[] {
  try { return JSON.parse(raw); } catch { return []; }
}

export function hasEffect(effects: Effect[], name: string): boolean {
  return effects.some(e => e.name === name && e.duration > 0);
}

export function tickEffects(effects: Effect[]): { effects: Effect[]; playerBurnDmg: number; enemyBurnDmg: number } {
  let playerBurnDmg = 0;
  let enemyBurnDmg = 0;
  const next = effects
    .map(e => {
      if (e.name === 'burn' || e.name === 'poison') {
        const val = e.value ?? (e.name === 'burn' ? 5 : 4);
        if (e.target === 'enemy') enemyBurnDmg += val;
        else playerBurnDmg += val;
      }
      return { ...e, duration: e.duration - 1 };
    })
    .filter(e => e.duration > 0);
  return { effects: next, playerBurnDmg, enemyBurnDmg };
}

export function addEffect(effects: Effect[], name: string, duration: number, value?: number, target?: 'player' | 'enemy'): Effect[] {
  const idx = effects.findIndex(e => e.name === name && (e.target ?? null) === (target ?? null));
  if (idx >= 0) {
    effects[idx].duration = Math.max(effects[idx].duration, duration);
    if (value !== undefined) effects[idx].value = value;
    if (target !== undefined) effects[idx].target = target;
  } else {
    effects.push({ name, duration, value, target });
  }
  return effects;
}

// ── Damage calc ───────────────────────────────────────────────────────────
function calcDamage(atk: number, def: number, variance = 0.15): number {
  const base = Math.max(1, atk - def);
  const v = base * variance;
  return Math.max(1, Math.round(base + randInt(-v, v)));
}

function targetIsBoss(enemyId: string): boolean {
  return !!getEnemy(enemyId)?.boss;
}

function applyOutgoingDamageModifiers(
  userId: string,
  guildId: string,
  dmg: number,
  isBossTarget: boolean,
  logs: string[]
): number {
  const eqStats = getEquipmentStats(userId, guildId);
  let finalDmg = dmg;
  if (isBossTarget && eqStats.effects.includes('boss_damage')) {
    finalDmg = Math.max(1, Math.floor(finalDmg * 1.15));
    logs.push('🐉 Boss Damage: sát thương lên boss +15%.');
  }
  return finalDmg;
}

function applyIncomingDamageModifiers(
  current: CombatState,
  effects: Effect[],
  logs: string[],
  dmg: number,
  opts: { isBossAttacker?: boolean; isSpecial?: boolean } = {}
): number {
  const eqStats = getEquipmentStats(current.user_id, current.guild_id);
  let finalDmg = dmg;
  if (opts.isBossAttacker && eqStats.effects.includes('boss_dmg_redux')) {
    finalDmg = Math.max(1, Math.floor(finalDmg * 0.85));
    logs.push('🛡️ Boss Damage Redux: giảm 15% sát thương từ boss.');
  }
  const armorReduce = (effects.find(e => e.name === 'armor_polish')?.value ?? 0) + (effects.find(e => e.name === 'stone_skin')?.value ?? 0);
  const rageTaken = effects.find(e => e.name === 'incoming_damage_up')?.value ?? 0;
  if (armorReduce > 0) finalDmg = Math.max(1, Math.floor(finalDmg * (1 - armorReduce / 100)));
  if (rageTaken > 0) finalDmg = Math.max(1, Math.floor(finalDmg * (1 + rageTaken / 100)));

  const canBlock = eqStats.effects.includes('block_one_crit') && !hasEffect(effects, 'block_one_crit_used');
  const heavyHit = finalDmg >= current.player_max_hp * 0.35;
  if (canBlock && (opts.isSpecial || heavyHit)) {
    addEffect(effects, 'block_one_crit_used', 999);
    logs.push('🛡️ Block One Crit: chặn hoàn toàn một đòn nguy hiểm!');
    return 0;
  }
  return finalDmg;
}

function applyKillEquipmentEffects(current: CombatState, playerHp: number, playerMp: number, logs: string[]): { hp: number; mp: number } {
  const eqStats = getEquipmentStats(current.user_id, current.guild_id);
  let hp = playerHp;
  let mp = playerMp;
  if (eqStats.effects.includes('kill_hp_regen') || eqStats.effects.includes('blood_kill_regen')) {
    const pct = eqStats.effects.includes('blood_kill_regen') ? 0.20 : 0.15;
    const heal = Math.max(1, Math.floor(current.player_max_hp * pct));
    hp = Math.min(current.player_max_hp, hp + heal);
    logs.push(`🩸 Kill Regen: hồi **${heal} HP** sau khi hạ địch.`);
  }
  if (eqStats.effects.includes('kill_mp_regen')) {
    const gain = 10;
    mp = Math.min(current.player_max_mp, mp + gain);
    logs.push(`💧 Kill MP Regen: hồi **${gain} MP** sau khi hạ địch.`);
  }
  return { hp, mp };
}

// ── Action result ─────────────────────────────────────────────────────────
export interface ActionResult {
  newState:    CombatState;
  logLines:    string[];
  playerDied:  boolean;
  enemyDied:   boolean;
  fled:        boolean;
  itemConsumed?: boolean;
}

// ── processAttack ─────────────────────────────────────────────────────────
export function processAttack(state: CombatState, playerAtk: number, targetIdx = 0): ActionResult {
  const effects  = parseEffects(state.active_effects);
  const logs: string[] = JSON.parse(state.combat_log || '[]');
  const passives = getPassives(state.user_id, state.guild_id);
  let { player_hp, player_mp, enemy_hp } = state;
  let player_stamina = state.player_stamina ?? 100;
  const player_max_stamina = state.player_max_stamina ?? 100;

  // ── Group enemy targeting ──────────────────────────────────────────────
  const groupEnemies = getGroupEnemies(state);
  let actualTargetIdx = 0;
  if (groupEnemies) {
    let idx = targetIdx;
    if (idx < 0 || idx >= groupEnemies.length || groupEnemies[idx].hp <= 0) {
      idx = groupEnemies.findIndex(e => e.hp > 0);
    }
    if (idx < 0) {
      logs.push('✅ Tất cả kẻ thù đã bị tiêu diệt!');
      return makeResult(state, state, player_hp, player_mp, effects, logs, false, true, false);
    }
    actualTargetIdx = idx;
  }
  const targetDef = groupEnemies ? groupEnemies[actualTargetIdx].def : state.enemy_def;
  const targetMaxHp = groupEnemies ? groupEnemies[actualTargetIdx].max_hp : state.enemy_max_hp;
  const targetName = groupEnemies ? groupEnemies[actualTargetIdx].name : state.enemy_name;
  const targetIcon = groupEnemies ? groupEnemies[actualTargetIdx].icon : '⚔️';

  // Stamina cost for attacking
  const staminaCost = 15;
  player_stamina = Math.max(0, player_stamina - staminaCost);

  // MP regen on normal attack
  const mpRegen = 4;
  player_mp = Math.min(state.player_max_mp, player_mp + mpRegen);

  // Defend bonus
  const defendBonus = state.is_defending === 1 ? Math.floor(state.enemy_atk * 0.4) : 0;
  if (state.is_defending === 1) logs.push(`🛡️ Phòng thủ: +${defendBonus} DEF tạm thời.`);

  // Berserker passive (also checks 'berserk' effect from Last Stand)
  let effectiveAtk = playerAtk;
  if (passives.hasBerserker && player_hp / state.player_max_hp < 0.3) {
    effectiveAtk = Math.floor(effectiveAtk * 1.2);
    logs.push('😤 **Berserker!** ATK +20% vì HP thấp.');
  }
  if (hasEffect(effects, 'berserk')) {
    const bonus = effects.find(e => e.name === 'berserk')?.value ?? 50;
    effectiveAtk = Math.floor(effectiveAtk * (1 + bonus / 100));
    logs.push(`🔱 **Last Stand** còn hiệu lực — ATK +${bonus}%.`);
  }

  const oilBoost = (effects.find(e => e.name === 'weapon_oil')?.value ?? 0) +
    (effects.find(e => e.name === 'rage_elixir')?.value ?? 0) +
    (effects.find(e => e.name === 'blood_vial')?.value ?? 0) +
    (effects.find(e => e.name === 'battle_cry')?.value ?? 0);
  if (oilBoost > 0) {
    effectiveAtk = Math.floor(effectiveAtk * (1 + oilBoost / 100));
    logs.push(`🧪 Consumable buff: ATK +${oilBoost}%.`);
  }

  // Equipment stats
  const eqStats = getEquipmentStats(state.user_id, state.guild_id);
  const totalCrit    = (eqStats.critChance   ?? 0);
  const totalLifesteal = (eqStats.lifesteal  ?? 0) + passives.lifestealBonus;
  if (eqStats.effects.includes('low_hp_atk') && player_hp / state.player_max_hp < 0.30) {
    effectiveAtk = Math.floor(effectiveAtk * 1.15);
    logs.push('🔥 Low HP ATK: HP thấp, ATK +15%.');
  }

  // Crit check — use target's def for group combat
  const isCrit = totalCrit > 0 && randInt(1, 100) <= totalCrit;
  let dmg = calcDamage(effectiveAtk, targetDef);
  if (isCrit) { dmg = Math.floor(dmg * 1.75); }
  const targetId = groupEnemies ? groupEnemies[actualTargetIdx].id : state.enemy_id;
  dmg = applyOutgoingDamageModifiers(state.user_id, state.guild_id, dmg, targetIsBoss(targetId), logs);

  // Apply damage
  if (groupEnemies) {
    groupEnemies[actualTargetIdx] = { ...groupEnemies[actualTargetIdx], hp: Math.max(0, groupEnemies[actualTargetIdx].hp - dmg) };
    enemy_hp = groupEnemies[actualTargetIdx].hp;
  } else {
    enemy_hp = Math.max(0, enemy_hp - dmg);
  }

  const critTag = isCrit ? ' ✨ **CRIT!**' : '';
  logs.push(`⚔️ Bạn tấn công ${targetIcon} **${targetName}** gây **${dmg}** sát thương.${critTag} (${enemy_hp}/${targetMaxHp} HP còn lại)`);

  // Lifesteal (vampiric passive + equipment)
  if (totalLifesteal > 0 && dmg > 0) {
    const stolen = Math.max(1, Math.floor(dmg * totalLifesteal / 100));
    player_hp = Math.min(state.player_max_hp, player_hp + stolen);
    logs.push(`🩸 Hút **${stolen} HP** (${totalLifesteal}% lifesteal).`);
  }

  // Equipment effects on hit
  if (eqStats.effects.includes('burn_on_hit') && randInt(1, 100) <= 20) {
    addEffect(effects, 'burn', 2, 5, 'enemy');
    logs.push(`🔥 Flameblade — Đốt cháy 2 lượt!`);
  }
  if (eqStats.effects.includes('stun_on_hit') && randInt(1, 100) <= 15) {
    addEffect(effects, 'stun', 1);
    logs.push(`💫 Hammer — Choáng 1 lượt!`);
  }
  if (eqStats.effects.includes('extra_hit') && randInt(1, 100) <= 10) {
    const bonusDmg = Math.max(1, Math.floor(effectiveAtk * 0.3));
    if (groupEnemies) {
      groupEnemies[actualTargetIdx] = { ...groupEnemies[actualTargetIdx], hp: Math.max(0, groupEnemies[actualTargetIdx].hp - bonusDmg) };
      enemy_hp = groupEnemies[actualTargetIdx].hp;
    } else {
      enemy_hp = Math.max(0, enemy_hp - bonusDmg);
    }
    logs.push(`⚡ Đòn phụ! +**${bonusDmg}** sát thương.`);
  }
  if (eqStats.effects.includes('star_damage') && randInt(1, 100) <= 20) {
    const starDmg = Math.max(1, Math.floor(effectiveAtk * 0.4));
    if (groupEnemies) {
      groupEnemies[actualTargetIdx] = { ...groupEnemies[actualTargetIdx], hp: Math.max(0, groupEnemies[actualTargetIdx].hp - starDmg) };
      enemy_hp = groupEnemies[actualTargetIdx].hp;
    } else {
      enemy_hp = Math.max(0, enemy_hp - starDmg);
    }
    logs.push(`⭐ Star Damage! +**${starDmg}** sát thương!`);
  }
  if (isCrit && eqStats.effects.includes('dodge_on_crit') && randInt(1, 100) <= 20) {
    addEffect(effects, 'dodge', 1);
    logs.push(`🌑 Crit → Dodge kích hoạt!`);
  }

  // Build updated state — include player_stamina so the cost is not lost
  const updatedState = groupEnemies
    ? { ...state, enemy_hp, player_stamina, enemies_json: JSON.stringify(groupEnemies) }
    : { ...state, enemy_hp, player_stamina };

  // Check victory
  const allDead = groupEnemies ? groupEnemies.every(e => e.hp <= 0) : enemy_hp <= 0;
  if (allDead) {
    return makeResult(state, updatedState, player_hp, player_mp, effects, logs, false, true, false);
  }

  // Enemy turn
  if (groupEnemies) {
    return groupEnemyTurn(state, updatedState, player_hp, player_mp, effects, logs, defendBonus, passives, groupEnemies);
  }
  return enemyTurn(state, updatedState, player_hp, player_mp, effects, logs, defendBonus, passives);
}

// ── processSkill ──────────────────────────────────────────────────────────
export function processSkill(
  state: CombatState, skillId: string, playerAtk: number,
  _hpRegen: number, _mpRegen: number, targetIdx = 0
): ActionResult {
  const skill = getSkill(skillId);
  if (!skill) {
    const logs: string[] = JSON.parse(state.combat_log || '[]');
    logs.push('❌ Kỹ năng này không hợp lệ hoặc không dùng được trong combat.');
    return { newState: { ...state, combat_log: JSON.stringify(logs.slice(-6)) }, logLines: logs, playerDied: false, enemyDied: false, fled: false };
  }

  const effects = parseEffects(state.active_effects);
  const logs: string[] = JSON.parse(state.combat_log || '[]');
  const passives = getPassives(state.user_id, state.guild_id);
  let { player_hp, player_mp, enemy_hp } = state;
  let player_stamina = Math.max(0, (state.player_stamina ?? 100) - 10);

  // Chỉ active skill được dùng trong combat. Passive/reaction/world không được bấm để tránh mất lượt/exploit.
  if (skill.type !== 'active') {
    logs.push(`❌ **${skill.name}** không phải kỹ năng active, không dùng được trong combat!`);
    return { newState: { ...state, combat_log: JSON.stringify(logs.slice(-6)) }, logLines: logs, playerDied: false, enemyDied: false, fled: false };
  }

  if ((skill as any).soulCost) {
    const { grantSoulShards, getPlayer: gp } = require('./player');
    const fresh = gp(state.user_id, state.guild_id);
    const cost = (skill as any).soulCost as number;
    if (!fresh || fresh.soul_shards < cost) {
      logs.push(`❌ Không đủ 💀 Soul Shard để dùng **${skill.name}**! (cần ${cost}, có ${fresh?.soul_shards ?? 0})`);
      return { newState: { ...state, combat_log: JSON.stringify(logs.slice(-6)) }, logLines: logs, playerDied: false, enemyDied: false, fled: false };
    }
    grantSoulShards(state.user_id, state.guild_id, -cost);
    logs.push(`💀 −**${cost} Soul Shard** → **${skill.name}**!`);
  }

  // MP check
  const focusDiscount = hasEffect(effects, 'focus_tonic') ? 20 : 0;
  const realMpCost = Math.max(0, Math.ceil((skill.mpCost ?? 0) * (1 - focusDiscount / 100)));
  if (realMpCost && player_mp < realMpCost) {
    logs.push(`❌ Không đủ MP để dùng **${skill.name}**! (cần ${realMpCost}, có ${player_mp})`);
    return { newState: { ...state, combat_log: JSON.stringify(logs.slice(-6)) }, logLines: logs, playerDied: false, enemyDied: false, fled: false };
  }

  player_mp -= realMpCost;
  if (focusDiscount > 0 && (skill.mpCost ?? 0) > 0) logs.push(`💠 Focus Tonic: MP cost giảm còn **${realMpCost}**.`);

  let skipGenericDamage = false;
  let skipGenericEffect = false;

  const calcSkillDamage = (rawDamage: number, targetDef: number, targetId: string): number => {
    const defPierce = (skill as any).soulCost ? 0.3 : 0.5;
    const clsSkill = getClassPassives(state.user_id, state.guild_id);
    const eqStatsSkill = getEquipmentStats(state.user_id, state.guild_id);
    let skillMult = clsSkill.skillDmgMult;
    if (eqStatsSkill.effects.includes('low_hp_atk') && player_hp / state.player_max_hp < 0.30) {
      skillMult *= 1.15;
      logs.push('🔥 Low HP ATK: HP thấp, sát thương skill +15%.');
    }
    let out = Math.max(1, Math.round((rawDamage - targetDef * defPierce) * skillMult));
    return applyOutgoingDamageModifiers(state.user_id, state.guild_id, out, targetIsBoss(targetId), logs);
  };

  // ── New special active skills ───────────────────────────────────────────
  if (skill.id === 'battle_cry') {
    addEffect(effects, 'battle_cry', 3, 15, 'player');
    logs.push(`${skill.icon} **${skill.name}**! ATK +15% trong **3 lượt**.`);
    skipGenericEffect = true;
  }

  if (skill.id === 'guardian_wall') {
    addEffect(effects, 'stone_skin', 2, 20, 'player');
    addEffect(effects, 'shield', 1, undefined, 'player');
    logs.push(`${skill.icon} **${skill.name}**! Giảm sát thương nhận **20%** trong 2 lượt và dựng 1 lớp chắn.`);
    skipGenericEffect = true;
  }

  if (skill.id === 'mana_surge') {
    const mpGain = Math.min(35, state.player_max_mp - player_mp);
    player_mp = Math.min(state.player_max_mp, player_mp + 35);
    logs.push(`${skill.icon} **${skill.name}**! Hồi **${mpGain} MP**. (${player_mp}/${state.player_max_mp})`);
  }

  if (skill.id === 'purify') {
    const before = effects.length;
    const removable = new Set(['burn', 'poison', 'curse', 'incoming_damage_up']);
    const kept = effects.filter(e => e.target === 'enemy' || !removable.has(e.name));
    effects.splice(0, effects.length, ...kept);
    if (effects.length < before) logs.push(`${skill.icon} **${skill.name}** — đã xóa hiệu ứng bất lợi khỏi bạn.`);
  }

  if (skill.targetType === 'all' && skill.damage) {
    const group = getGroupEnemies(state);
    if (group) {
      let total = 0;
      const names: string[] = [];
      for (let i = 0; i < group.length; i++) {
        if (group[i].hp <= 0) continue;
        const dmg = calcSkillDamage(skill.damage, group[i].def, group[i].id);
        group[i] = { ...group[i], hp: Math.max(0, group[i].hp - dmg) };
        total += dmg;
        names.push(`${group[i].icon ?? '👹'} ${group[i].name} −${dmg}`);
      }
      enemy_hp = group.find(e => e.hp > 0)?.hp ?? 0;
      state = { ...state, enemy_hp, enemies_json: JSON.stringify(group) };
      logs.push(`${skill.icon} **${skill.name}** đánh diện rộng: ${names.join(', ')}. Tổng **${total}** sát thương.`);
    } else {
      const dmg = calcSkillDamage(skill.damage, state.enemy_def, state.enemy_id);
      enemy_hp = Math.max(0, enemy_hp - dmg);
      logs.push(`${skill.icon} **${skill.name}** gây **${dmg}** sát thương lên **${state.enemy_name}**. (${enemy_hp}/${state.enemy_max_hp} HP còn lại)`);
    }
    skipGenericDamage = true;
  }

  if (skill.id === 'execute' && skill.damage && !skipGenericDamage) {
    const group = getGroupEnemies(state);
    let idx = 0;
    if (group) {
      idx = Number.isFinite(targetIdx) ? Math.floor(targetIdx) : 0;
      if (idx < 0 || idx >= group.length || group[idx].hp <= 0) idx = group.findIndex(e => e.hp > 0);
    }
    const target = group ? group[idx] : null;
    const hpRatio = target ? target.hp / target.max_hp : enemy_hp / state.enemy_max_hp;
    const rawDamage = hpRatio <= 0.35 ? Math.floor(skill.damage * 1.85) : skill.damage;
    const dmg = calcSkillDamage(rawDamage, target ? target.def : state.enemy_def, target ? target.id : state.enemy_id);
    if (group && target && idx >= 0) {
      group[idx] = { ...group[idx], hp: Math.max(0, group[idx].hp - dmg) };
      enemy_hp = group[idx].hp;
      state = { ...state, enemy_hp, enemies_json: JSON.stringify(group) };
      logs.push(`${skill.icon} **${skill.name}** chém ${target.icon ?? '👹'} **${target.name}** gây **${dmg}** sát thương${hpRatio <= 0.35 ? ' — KẾT LIỄU!' : ''}. (${enemy_hp}/${target.max_hp} HP còn lại)`);
    } else {
      enemy_hp = Math.max(0, enemy_hp - dmg);
      logs.push(`${skill.icon} **${skill.name}** gây **${dmg}** sát thương${hpRatio <= 0.35 ? ' — KẾT LIỄU!' : ''}. (${enemy_hp}/${state.enemy_max_hp} HP còn lại)`);
    }
    skipGenericDamage = true;
  }

  // ── Damage skills ────────────────────────────────────────────────────────
  if (skill.damage && !skipGenericDamage) {
    const skillGroupEnemies = getGroupEnemies(state);
    let actualTargetIdx = 0;
    if (skillGroupEnemies) {
      let idx = Number.isFinite(targetIdx) ? Math.floor(targetIdx) : 0;
      if (idx < 0 || idx >= skillGroupEnemies.length || skillGroupEnemies[idx].hp <= 0) {
        idx = skillGroupEnemies.findIndex(e => e.hp > 0);
      }
      if (idx < 0) {
        logs.push('✅ Tất cả kẻ thù đã bị tiêu diệt!');
        return makeResult(state, state, player_hp, player_mp, effects, logs, false, true, false);
      }
      actualTargetIdx = idx;
    }

    const targetEnemy = skillGroupEnemies ? skillGroupEnemies[actualTargetIdx] : null;
    const skillTargetDef = targetEnemy ? targetEnemy.def : state.enemy_def;
    const targetId = targetEnemy ? targetEnemy.id : state.enemy_id;
    const targetName = targetEnemy ? targetEnemy.name : state.enemy_name;
    const targetIcon = targetEnemy ? targetEnemy.icon : '⚔️';
    const targetMaxHp = targetEnemy ? targetEnemy.max_hp : state.enemy_max_hp;

    const defPierce = (skill as any).soulCost ? 0.3 : 0.5;
    const clsSkill  = getClassPassives(state.user_id, state.guild_id);
    const eqStatsSkill = getEquipmentStats(state.user_id, state.guild_id);
    let skillMult = clsSkill.skillDmgMult;
    if (eqStatsSkill.effects.includes('low_hp_atk') && player_hp / state.player_max_hp < 0.30) {
      skillMult *= 1.15;
      logs.push('🔥 Low HP ATK: HP thấp, sát thương skill +15%.');
    }
    let finalDmg  = Math.max(1, Math.round((skill.damage - skillTargetDef * defPierce) * skillMult));
    finalDmg = applyOutgoingDamageModifiers(state.user_id, state.guild_id, finalDmg, targetIsBoss(targetId), logs);
    if (skillGroupEnemies) {
      skillGroupEnemies[actualTargetIdx] = {
        ...skillGroupEnemies[actualTargetIdx],
        hp: Math.max(0, skillGroupEnemies[actualTargetIdx].hp - finalDmg)
      };
      enemy_hp = skillGroupEnemies[actualTargetIdx].hp;
      state = { ...state, enemies_json: JSON.stringify(skillGroupEnemies) };
    } else {
      enemy_hp = Math.max(0, enemy_hp - finalDmg);
    }
    logs.push(`${skill.icon} **${skill.name}** đánh ${targetIcon} **${targetName}** gây **${finalDmg}** sát thương. (${enemy_hp}/${targetMaxHp} HP còn lại)`);
  }

  // ── Heal skills ──────────────────────────────────────────────────────────
  if (skill.heal) {
    const healed = Math.min(skill.heal, state.player_max_hp - player_hp);
    player_hp = Math.min(state.player_max_hp, player_hp + skill.heal);
    // Soul Drain also restores 15 MP
    if (skill.id === 'soul_drain') {
      player_mp = Math.min(state.player_max_mp, player_mp + 15);
      logs.push(`${skill.icon} **${skill.name}**! Hồi **${healed} HP** + **15 MP**.`);
    } else {
      logs.push(`${skill.icon} **${skill.name}**! Hồi **${healed} HP**. (${player_hp}/${state.player_max_hp})`);
    }
  }

  // ── Effects — applied REGARDLESS of damage (fixes Shadow Step!) ──────────
  if (skill.effect && skill.effectDuration && !skipGenericEffect) {
    const val = skill.effect === 'burn' ? 5
      : skill.effect === 'poison' ? 4
      : skill.effect === 'battle_cry' ? 15
      : skill.effect === 'stone_skin' ? 20
      : undefined;
    const effectTarget = (skill.effect === 'burn' || skill.effect === 'poison' || skill.effect === 'slow' || skill.effect === 'stun')
      ? 'enemy' as const
      : 'player' as const;
    addEffect(effects, skill.effect, skill.effectDuration, val, effectTarget);
    const effectLabels: Record<string, string> = {
      burn: '🔥 Đốt cháy', poison: '☠️ Trúng độc', slow: '🧊 Làm chậm', stun: '💫 Choáng',
      dodge: '🌑 Shadow Step — sẽ né đòn tấn công tiếp theo',
      battle_cry: '📣 ATK tăng', stone_skin: '🛡️ Giảm sát thương', shield: '🛡️ Chắn đòn'
    };
    if (!skill.damage && !skill.heal) {
      // Pure-effect skills get their own log line
      logs.push(`${skill.icon} **${skill.name}**! ${effectLabels[skill.effect] ?? skill.effect} ×${skill.effectDuration} lượt.`);
    } else {
      logs.push(`  └ ${effectLabels[skill.effect] ?? skill.effect} ×${skill.effectDuration} lượt.`);
    }
  }

  const eqStatsAfterSkill = getEquipmentStats(state.user_id, state.guild_id);
  if (eqStatsAfterSkill.effects.includes('slow_on_skill') && randInt(1, 100) <= 15) {
    addEffect(effects, 'slow', 1, undefined, 'enemy');
    logs.push('🧊 Slow on Skill: địch bị làm chậm 1 lượt.');
  }

  const skillGroupEnemies2 = getGroupEnemies(state);
  const skillAllDead = skillGroupEnemies2 ? skillGroupEnemies2.every(e => e.hp <= 0) : enemy_hp <= 0;
  const skillUpdatedState = { ...state, enemy_hp, player_stamina };

  if (skillAllDead) {
    return makeResult(state, skillUpdatedState, player_hp, player_mp, effects, logs, false, true, false);
  }

  if (skillGroupEnemies2) {
    return groupEnemyTurn(state, skillUpdatedState, player_hp, player_mp, effects, logs, 0, passives, skillGroupEnemies2);
  }
  return enemyTurn(state, skillUpdatedState, player_hp, player_mp, effects, logs, 0, passives);
}

// ── processDefend ─────────────────────────────────────────────────────────
export function processDefend(state: CombatState, playerAtk: number, _h: number, _m: number): ActionResult {
  const effects  = parseEffects(state.active_effects);
  const passives = getPassives(state.user_id, state.guild_id);
  const logs: string[] = JSON.parse(state.combat_log || '[]');
  const staminaGain = 25;
  const maxStamina  = state.player_max_stamina ?? 100;
  const newStamina  = Math.min(maxStamina, (state.player_stamina ?? 100) + staminaGain);
  logs.push(`🛡️ Bạn **Phòng thủ** — giảm 40% sát thương và hồi **${staminaGain} ⚡ Stamina**.`);
  const defendedState = { ...state, is_defending: 1, player_stamina: newStamina };
  const defGroupEnemies = getGroupEnemies(state);
  if (defGroupEnemies) {
    return groupEnemyTurn(state, defendedState, state.player_hp, state.player_mp, effects, logs, Math.floor(state.enemy_atk * 0.4), passives, defGroupEnemies);
  }
  return enemyTurn(state, defendedState, state.player_hp, state.player_mp, effects, logs, Math.floor(state.enemy_atk * 0.4), passives);
}

// ── processFlee ───────────────────────────────────────────────────────────
export function processFlee(state: CombatState): ActionResult {
  const passives = getPassives(state.user_id, state.guild_id);
  const logs: string[] = JSON.parse(state.combat_log || '[]');
  const effects = parseEffects(state.active_effects);

  const attempts = effects.find(e => e.name === 'flee_attempts')?.value ?? 0;
  const fleeChance = Math.min(90, 45 + attempts * 15);
  const nextChance = Math.min(90, fleeChance + 15);
  const roll = randInt(1, 100);

  logs.push(`🏃 **Bỏ chạy** — lần ${attempts + 1}, tỉ lệ thành công **${fleeChance}%**.`);

  if (roll <= fleeChance) {
    logs.push(`✅ Bạn **bỏ chạy thành công** trước khi bị kết liễu!`);
    return {
      newState: {
        ...state,
        combat_log: JSON.stringify(logs.slice(-4)),
        active_effects: JSON.stringify(effects.filter(e => e.name !== 'flee_attempts'))
      },
      logLines: logs,
      playerDied: false,
      enemyDied: false,
      fled: true
    };
  }

  logs.push(`❌ Bỏ chạy thất bại! Lần sau tỉ lệ tăng lên **${nextChance}%**.`);
  const nextEffects = effects.filter(e => e.name !== 'flee_attempts');
  addEffect(nextEffects, 'flee_attempts', 999, attempts + 1);

  const fleeGroupEnemies = getGroupEnemies(state);
  if (fleeGroupEnemies) {
    return groupEnemyTurn(state, state, state.player_hp, state.player_mp, nextEffects, logs, 0, passives, fleeGroupEnemies);
  }
  return enemyTurn(state, state, state.player_hp, state.player_mp, nextEffects, logs, 0, passives);
}

// ── enemyTurn ─────────────────────────────────────────────────────────────
function enemyTurn(
  original: CombatState, current: CombatState,
  playerHp: number, playerMp: number,
  effects: Effect[], logs: string[],
  defenseBonus: number, passives: Passives
): ActionResult {
  const enemy = getEnemy(current.enemy_id);
  if (!enemy) return makeResult(original, current, playerHp, playerMp, effects, logs, false, false, false);

  // ── Stun: enemy skips turn ─────────────────────────────────────────────
  if (hasEffect(effects, 'stun')) {
    logs.push(`💫 **${enemy.name}** bị choáng — bỏ qua lượt!`);
    const nextEffects = effects.map(e => e.name === 'stun' ? { ...e, duration: e.duration - 1 } : e).filter(e => e.duration > 0);
    const { effects: ticked, playerBurnDmg, enemyBurnDmg } = tickEffects(nextEffects);
    if (playerBurnDmg > 0) { playerHp = Math.max(0, playerHp - playerBurnDmg); logs.push(`🔥 Đốt cháy −**${playerBurnDmg} HP**.`); }
    if (enemyBurnDmg > 0) { current = { ...current, enemy_hp: Math.max(0, current.enemy_hp - enemyBurnDmg) }; }
    playerHp = Math.min(current.player_max_hp, playerHp + passives.hpRegenPerTurn);
    playerMp = Math.min(current.player_max_mp, playerMp + passives.mpRegenPerTurn);
    if (passives.mpRegenPerTurn > 0) logs.push(`💫 Hồi **${passives.mpRegenPerTurn} MP** (Mana Flow).`);
    return makeResult(original, current, playerHp, playerMp, ticked, logs, playerHp <= 0, false, false);
  }

  // ── Shield (Soul Guard): block one massive/lethal hit ──────────────────
  if (hasEffect(effects, 'shield')) {
    // Pre-calc if this would be a fatal/heavy hit
    const preDmg = Math.max(1, enemy.atk - ((current as any).player_def ?? 0) - defenseBonus);
    const wouldBeHeavy = preDmg >= playerHp || preDmg > current.player_max_hp * 0.5;
    if (wouldBeHeavy) {
      const idx = effects.findIndex(e => e.name === 'shield');
      effects.splice(idx, 1);
      logs.push(`🛡️💀 **Soul Guard** bloqueou o golpe! O ataque foi absorvido!`);
      const { effects: ticked, playerBurnDmg, enemyBurnDmg } = tickEffects(effects);
      if (playerBurnDmg > 0) { playerHp = Math.max(0, playerHp - playerBurnDmg); }
      if (enemyBurnDmg > 0) { current = { ...current, enemy_hp: Math.max(0, current.enemy_hp - enemyBurnDmg) }; }
      playerHp = Math.min(current.player_max_hp, playerHp + passives.hpRegenPerTurn);
      playerMp = Math.min(current.player_max_mp, playerMp + passives.mpRegenPerTurn);
      return makeResult(original, current, playerHp, playerMp, ticked, logs, false, false, false);
    }
  }

  // ── Passive dodge chance (equipment + class) ────────────────────────
  const eqStatsET = getEquipmentStats(current.user_id, current.guild_id);
  const clsPassET  = getClassPassives(current.user_id, current.guild_id);
  const passiveDodge = (eqStatsET.dodgeChance ?? 0) + clsPassET.dodgeBonus;
  if (passiveDodge > 0 && !hasEffect(effects, 'dodge') && randInt(1, 100) <= passiveDodge) {
    logs.push(`💨 **Dodge pasif (${passiveDodge}%)** — Tránh đòn!`);
    const { effects: ticked, playerBurnDmg, enemyBurnDmg } = tickEffects(effects);
    if (playerBurnDmg > 0) { playerHp = Math.max(0, playerHp - playerBurnDmg); }
    if (enemyBurnDmg > 0) { current = { ...current, enemy_hp: Math.max(0, current.enemy_hp - enemyBurnDmg) }; }
    playerHp = Math.min(current.player_max_hp, playerHp + passives.hpRegenPerTurn);
    playerMp = Math.min(current.player_max_mp, playerMp + passives.mpRegenPerTurn);
    return makeResult(original, current, playerHp, playerMp, ticked, logs, false, false, false);
  }

  // ── Dodge: player avoids attack completely ─────────────────────────────
  if (hasEffect(effects, 'dodge')) {
    const idx = effects.findIndex(e => e.name === 'dodge');
    effects.splice(idx, 1);
    logs.push(`🌑 **Shadow Step!** Bạn né hoàn toàn đòn tấn công của **${enemy.name}**!`);
    // Tick remaining effects
    const { effects: ticked, playerBurnDmg, enemyBurnDmg } = tickEffects(effects);
    if (playerBurnDmg > 0) { playerHp = Math.max(0, playerHp - playerBurnDmg); logs.push(`🔥 Đốt cháy −**${playerBurnDmg} HP**.`); }
    if (enemyBurnDmg > 0) { current = { ...current, enemy_hp: Math.max(0, current.enemy_hp - enemyBurnDmg) }; }
    playerHp = Math.min(current.player_max_hp, playerHp + passives.hpRegenPerTurn);
    playerMp = Math.min(current.player_max_mp, playerMp + passives.mpRegenPerTurn);
    return makeResult(original, current, playerHp, playerMp, ticked, logs, playerHp <= 0, false, false);
  }

  // ── Slow: reduce enemy ATK ─────────────────────────────────────────────
  let enemyAtk = current.enemy_atk;
  if (hasEffect(effects, 'slow')) {
    enemyAtk = Math.max(1, enemyAtk - 5);
    logs.push(`🧊 Địch bị làm chậm (−5 ATK).`);
  }

  // ── Enemy attacks ──────────────────────────────────────────────────────
  const hpPct      = current.enemy_hp / current.enemy_max_hp;
  const silenced   = hasEffect(effects, 'silence');
  if (silenced) logs.push(`📜 **${enemy.name}** bị Silence — không thể dùng kỹ năng đặc biệt.`);
  const useSpecial = !silenced && ((hpPct < 0.3 && randInt(1, 100) <= 60) || randInt(1, 100) <= 30);
  const special    = useSpecial && enemy.specialAttacks.length > 0 ? pick(enemy.specialAttacks) : null;
  let dealDmg      = 0;

  if (special) {
    const res = applySpecialAttack(special, enemyAtk, enemy, playerHp, playerMp, logs, (current as any).player_def ?? 0);
    playerHp = res.playerHp;
    playerMp = res.playerMp;
    dealDmg  = res.dmg;
    if (dealDmg > 0) {
      const adjusted = applyIncomingDamageModifiers(current, effects, logs, dealDmg, { isBossAttacker: !!enemy.boss, isSpecial: true });
      playerHp = Math.min(current.player_max_hp, playerHp + (dealDmg - adjusted));
      dealDmg = adjusted;
    }
    if (res.enemyHeal > 0) {
      current = { ...current, enemy_hp: Math.min(current.enemy_max_hp, current.enemy_hp + res.enemyHeal) };
    }
  } else {
    dealDmg  = Math.max(1, calcDamage(enemyAtk, ((current as any).player_def ?? 0) + defenseBonus));
    dealDmg = applyIncomingDamageModifiers(current, effects, logs, dealDmg, { isBossAttacker: !!enemy.boss });
    playerHp = Math.max(0, playerHp - dealDmg);
    logs.push(`${enemy.icon} **${enemy.name}** tấn công gây **${dealDmg}** sát thương. (${playerHp}/${current.player_max_hp} HP còn lại)`);
  }

  // ── Counter reaction (on hit) ──────────────────────────────────────────
  if (passives.hasCounter && dealDmg > 0 && randInt(1, 100) <= 40) {
    const loadout    = getLoadout(current.user_id, current.guild_id);
    const counterEntry = loadout.find(l => l.skill_id === 'counter');
    if (counterEntry) {
      const player    = getPlayer(current.user_id, current.guild_id);
      const baseAtk   = player?.atk ?? 10;
      const counterDmg = Math.max(1, Math.floor(baseAtk * 0.6));
      const newEnemyHp = Math.max(0, current.enemy_hp - counterDmg);
      // Note: enemy_hp in current is already pre-set, update via state mutation
      logs.push(`🔄 **Counter!** Phản đòn gây **${counterDmg}** sát thương! (${newEnemyHp}/${current.enemy_max_hp})`);
      // Reflect in return state
      current = { ...current, enemy_hp: newEnemyHp };
      if (newEnemyHp <= 0) {
        const { effects: ticked } = tickEffects(effects);
        return makeResult(original, current, playerHp, playerMp, ticked, logs, false, true, false);
      }
    }
  }

  // ── Tick end-of-turn effects ───────────────────────────────────────────
  const { effects: ticked, playerBurnDmg, enemyBurnDmg } = tickEffects(effects);
  if (playerBurnDmg > 0) {
    playerHp = Math.max(0, playerHp - playerBurnDmg);
    logs.push(`🔥 Đốt cháy gây **${playerBurnDmg}** sát thương theo thời gian.`);
  }
  if (enemyBurnDmg > 0) {
    const newEH = Math.max(0, current.enemy_hp - enemyBurnDmg);
    logs.push(`🔥 Địch bị đốt cháy gây **${enemyBurnDmg}** sát thương!`);
    current = { ...current, enemy_hp: newEH };
    if (newEH <= 0) {
      playerHp = Math.min(current.player_max_hp, playerHp + passives.hpRegenPerTurn);
      playerMp = Math.min(current.player_max_mp, playerMp + passives.mpRegenPerTurn);
      return makeResult(original, current, playerHp, playerMp, ticked, logs, false, true, false);
    }
  }

  // ── Passive regen ──────────────────────────────────────────────────────
  if (passives.hpRegenPerTurn > 0 && playerHp > 0) {
    playerHp = Math.min(current.player_max_hp, playerHp + passives.hpRegenPerTurn);
    logs.push(`💪 **Tough Body:** Hồi **${passives.hpRegenPerTurn} HP**.`);
  }
  if (passives.mpRegenPerTurn > 0) {
    playerMp = Math.min(current.player_max_mp, playerMp + passives.mpRegenPerTurn);
    logs.push(`💫 **Mana Flow:** Hồi **${passives.mpRegenPerTurn} MP**.`);
  }

  // ── Last Stand reaction (on drop below 10% HP) ─────────────────────────
  const hpThreshold = current.player_max_hp * 0.1;
  if (passives.hasLastStand && playerHp > 0 && playerHp <= hpThreshold
    && !hasEffect(ticked, 'berserk') && !hasEffect(ticked, 'last_stand_used')) {
    addEffect(ticked, 'berserk', 3, 50);
    addEffect(ticked, 'last_stand_used', 999);
    logs.push(`🔱 **Last Stand!** HP cực thấp — ATK +50% trong **3 lượt**!`);
  }

  return makeResult(original, current, playerHp, playerMp, ticked, logs, playerHp <= 0, false, false);
}

// ── processItemUse ────────────────────────────────────────────────────────
export function processItemUse(state: CombatState, itemId: string): ActionResult {
  const { getItemQty, removeItem } = require('./player');
  const { getItem } = require('../data/items');
  const effects = parseEffects(state.active_effects);
  const passives = getPassives(state.user_id, state.guild_id);
  const logs: string[] = JSON.parse(state.combat_log || '[]');
  let { player_hp, player_mp, enemy_hp } = state;

  const qty = getItemQty(state.user_id, state.guild_id, itemId);
  const item = getItem(itemId);
  const enemy = getEnemy(state.enemy_id);

  if (!item || qty <= 0 || item.type !== 'consumable') {
    logs.push(`❌ Không thể dùng item này!`);
    return { newState: { ...state, combat_log: JSON.stringify(logs.slice(-4)) }, logLines: logs, playerDied: false, enemyDied: false, fled: false };
  }

  const effect: any = item.effect ?? {};
  const eqStatsItem = getEquipmentStats(state.user_id, state.guild_id);
  const isHealthPotion = !!(effect.hp || effect.hpPercent);
  if (isHealthPotion && eqStatsItem.effects.includes('no_healing')) {
    logs.push(`🚫 **${item.name}** không thể dùng vì trang bị hiện tại chặn hồi máu.`);
    return { newState: { ...state, combat_log: JSON.stringify(logs.slice(-4)) }, logLines: logs, playerDied: false, enemyDied: false, fled: false };
  }
  const potionMult = isHealthPotion
    ? Math.max(0, 1 + (eqStatsItem.effects.includes('potion_bonus') ? 0.20 : 0) - (eqStatsItem.effects.includes('blood_kill_regen') ? 0.50 : 0))
    : 1;

  if (effect.passiveOnly) {
    logs.push(`💀 **${item.name}** là vật phẩm tự kích hoạt khi bạn sắp chết.`);
    return { newState: { ...state, combat_log: JSON.stringify(logs.slice(-4)) }, logLines: logs, playerDied: false, enemyDied: false, fled: false };
  }
  if (effect.hpBelowPct && player_hp / state.player_max_hp > effect.hpBelowPct) {
    logs.push(`❌ **${item.name}** chỉ dùng được khi HP dưới ${Math.floor(effect.hpBelowPct * 100)}%.`);
    return { newState: { ...state, combat_log: JSON.stringify(logs.slice(-4)) }, logLines: logs, playerDied: false, enemyDied: false, fled: false };
  }

  const blockedByBoss = !!enemy?.boss || String(state.enemy_id).includes('shopkeeper') || String(state.enemy_id).includes('bounty');
  if (itemId === 'scroll_escape') {
    if (blockedByBoss) {
      logs.push('📜 Scroll of Escape bị xé vụn — trận này không thể chạy trốn bằng scroll!');
      return { newState: { ...state, combat_log: JSON.stringify(logs.slice(-4)) }, logLines: logs, playerDied: false, enemyDied: false, fled: false };
    }
    removeItem(state.user_id, state.guild_id, itemId, 1);
    logs.push('📜 **Scroll of Escape** mở ra một khe nứt. Bạn thoát khỏi trận chiến!');
    return { newState: state, logLines: logs, playerDied: false, enemyDied: false, fled: true, itemConsumed: true };
  }

  removeItem(state.user_id, state.guild_id, itemId, 1);

  if (effect.hpPercent) {
    const amount = Math.max(1, Math.floor(state.player_max_hp * effect.hpPercent * potionMult));
    const gain = Math.min(amount, state.player_max_hp - player_hp);
    player_hp = Math.min(state.player_max_hp, player_hp + amount);
    logs.push(`🎒 **${item.icon} ${item.name}** — hồi **${gain} HP**! (${player_hp}/${state.player_max_hp})`);
  }
  if (effect.hp) {
    const rawHp = Math.max(1, Math.floor(effect.hp * potionMult));
    const gain = Math.min(rawHp, state.player_max_hp - player_hp);
    player_hp = Math.min(state.player_max_hp, player_hp + rawHp);
    logs.push(`🎒 **${item.icon} ${item.name}** — hồi **${gain} HP**! (${player_hp}/${state.player_max_hp})`);
  }
  if (effect.mpPercent) {
    const amount = Math.max(1, Math.floor(state.player_max_mp * effect.mpPercent));
    const gain = Math.min(amount, state.player_max_mp - player_mp);
    player_mp = Math.min(state.player_max_mp, player_mp + amount);
    logs.push(`🎒 **${item.icon} ${item.name}** — hồi **${gain} MP**!`);
  }
  if (effect.mp) {
    const gain = Math.min(effect.mp, state.player_max_mp - player_mp);
    player_mp = Math.min(state.player_max_mp, player_mp + effect.mp);
    logs.push(`🎒 **${item.icon} ${item.name}** — hồi **${gain} MP**!`);
  }

  const removeEffects: string[] = [];
  if (effect.removeEffect) removeEffects.push(effect.removeEffect);
  if (Array.isArray(effect.removeEffects)) removeEffects.push(...effect.removeEffects);
  for (const removeName of removeEffects) {
    const before = effects.length;
    const isPlayerDebuff = (e: Effect) => e.target !== 'enemy';
    if (removeName === 'all') {
      const removable = new Set(['burn', 'poison', 'curse', 'incoming_damage_up', 'slow', 'silence']);
      const filtered = effects.filter(e => !(isPlayerDebuff(e) && removable.has(e.name)));
      effects.splice(0, effects.length, ...filtered);
      if (effects.length < before) logs.push(`🎒 **${item.name}** — giải trừ toàn bộ hiệu ứng bất lợi!`);
      continue;
    }
    const filtered = effects.filter((e: Effect) => !(e.name === removeName && isPlayerDebuff(e)));
    if (filtered.length < before) logs.push(`🎒 **${item.name}** — giải trừ **${removeName}**!`);
    effects.splice(0, effects.length, ...filtered);
  }

  // Combat-only special consumables.
  if (itemId === 'weapon_oil') { addEffect(effects, 'weapon_oil', 999, 10); logs.push('🔩 Weapon Oil: ATK +10% trong trận này.'); }
  if (itemId === 'armor_polish') { addEffect(effects, 'armor_polish', 999, 10); logs.push('🧼 Armor Polish: sát thương nhận từ đòn thường giảm 10%.'); }
  if (itemId === 'focus_tonic') { addEffect(effects, 'focus_tonic', 999, 20); addEffect(effects, 'incoming_damage_up', 999, 10); logs.push('💠 Focus Tonic: MP cost -20%, nhưng nhận thêm 10% sát thương thường.'); }
  if (itemId === 'stone_skin_draught') { addEffect(effects, 'stone_skin', 999, 15); logs.push('🛡️ Stone Skin: sát thương đòn thường giảm 15%.'); }
  if (itemId === 'quickstep_tea') { addEffect(effects, 'dodge', 1); logs.push('⚡ Quickstep Tea: né đòn tiếp theo.'); }
  if (itemId === 'rage_elixir') { addEffect(effects, 'rage_elixir', 999, 25); addEffect(effects, 'incoming_damage_up', 999, 15); logs.push('🔥 Rage Elixir: ATK +25%, nhưng nhận thêm 15% sát thương thường.'); }
  if (itemId === 'blood_vial') { addEffect(effects, 'blood_vial', 999, 10); logs.push('🩸 Blood Vial: ATK +10% trong trận này.'); }
  if (itemId === 'scroll_silence') {
    if (enemy?.boss) logs.push('📜 Boss chính kháng Silence! Scroll tan thành bụi.');
    else { addEffect(effects, 'silence', 2); logs.push('📜 Scroll of Silence: enemy không dùng skill trong 2 lượt.'); }
  }
  if (itemId === 'warding_charm' || itemId === 'rune_charm') { addEffect(effects, 'ward', 1); logs.push(`🧿 ${item.name}: bùa hộ mệnh chờ chặn debuff tiếp theo.`); }
  if (itemId === 'arson_bottle') {
    if (enemy?.boss) logs.push('🔥 Boss chính dập tắt Arson Bottle trước khi lửa lan ra.');
    else {
      const dmg = Math.max(8, Math.floor(state.player_max_hp * 0.08));
      const arsonGroup = getGroupEnemies(state);
      if (arsonGroup) {
        let hit = 0;
        for (let i = 0; i < arsonGroup.length; i++) {
          if (arsonGroup[i].hp > 0) { arsonGroup[i] = { ...arsonGroup[i], hp: Math.max(0, arsonGroup[i].hp - dmg) }; hit++; }
        }
        enemy_hp = arsonGroup.find(e => e.hp > 0)?.hp ?? 0;
        state = { ...state, enemies_json: JSON.stringify(arsonGroup) };
        logs.push(`🔥 Arson Bottle thiêu cháy **${hit}** địch, mỗi con mất **${dmg}** HP!`);
      } else {
        enemy_hp = Math.max(0, enemy_hp - dmg);
        logs.push(`🔥 Arson Bottle phát nổ, gây **${dmg}** sát thương trực tiếp!`);
      }
    }
  }

  const itemGroupEnemies = getGroupEnemies(state);
  const itemAllDead = itemGroupEnemies ? itemGroupEnemies.every(e => e.hp <= 0) : enemy_hp <= 0;
  const itemUpdatedState = { ...state, enemy_hp };

  const baseResult = itemAllDead
    ? makeResult(state, itemUpdatedState, player_hp, player_mp, effects, logs, false, true, false)
    : itemGroupEnemies
      ? groupEnemyTurn(state, itemUpdatedState, player_hp, player_mp, effects, logs, 0, passives, itemGroupEnemies)
      : enemyTurn(state, itemUpdatedState, player_hp, player_mp, effects, logs, 0, passives);
  return { ...baseResult, itemConsumed: true };
}

// ── groupEnemyTurn ────────────────────────────────────────────────────────
function groupEnemyTurn(
  original: CombatState, current: CombatState,
  playerHp: number, playerMp: number,
  effects: Effect[], logs: string[],
  defenseBonus: number, passives: Passives,
  enemies: CombatEnemy[]
): ActionResult {
  // Stun: all enemies skip their turn
  if (hasEffect(effects, 'stun')) {
    logs.push(`💫 Tất cả kẻ thù bị choáng — bỏ qua lượt!`);
    const nextEffects = effects.map(e => e.name === 'stun' ? { ...e, duration: e.duration - 1 } : e).filter(e => e.duration > 0);
    const { effects: ticked, playerBurnDmg, enemyBurnDmg } = tickEffects(nextEffects);
    if (playerBurnDmg > 0) { playerHp = Math.max(0, playerHp - playerBurnDmg); logs.push(`🔥 Đốt cháy −**${playerBurnDmg} HP**.`); }
    if (enemyBurnDmg > 0) { const fa = enemies.findIndex(e => e.hp > 0); if (fa >= 0) enemies[fa] = { ...enemies[fa], hp: Math.max(0, enemies[fa].hp - enemyBurnDmg) }; }
    playerHp = Math.min(current.player_max_hp, playerHp + passives.hpRegenPerTurn);
    playerMp = Math.min(current.player_max_mp, playerMp + passives.mpRegenPerTurn);
    const updatedState = { ...current, enemies_json: JSON.stringify(enemies) };
    return makeResult(original, updatedState, playerHp, playerMp, ticked, logs, playerHp <= 0, false, false);
  }

  const eqStatsGroup  = getEquipmentStats(current.user_id, current.guild_id);
  const clsPassGroup  = getClassPassives(current.user_id, current.guild_id);
  const passiveDodge  = (eqStatsGroup.dodgeChance ?? 0) + clsPassGroup.dodgeBonus;
  let dodgeConsumed = false;

  const aliveEnemies = enemies.filter(e => e.hp > 0);
  const silenced = hasEffect(effects, 'silence');
  if (silenced) logs.push(`📜 Kẻ thù bị Silence — không thể dùng kỹ năng đặc biệt.`);
  let enemyAtkMod = hasEffect(effects, 'slow') ? -5 : 0;

  for (const combatEnemy of aliveEnemies) {
    if (playerHp <= 0) break;

    // Shield check (first heavy hit)
    if (hasEffect(effects, 'shield')) {
      const preDmg = Math.max(1, combatEnemy.atk + enemyAtkMod - (((current as any).player_def ?? 0) + defenseBonus));
      if (preDmg >= playerHp || preDmg > current.player_max_hp * 0.5) {
        const idx = effects.findIndex(e => e.name === 'shield');
        effects.splice(idx, 1);
        logs.push(`🛡️💀 **Soul Guard** hấp thụ đòn tấn công của **${combatEnemy.name}**!`);
        continue;
      }
    }

    // Passive dodge
    if (!dodgeConsumed && passiveDodge > 0 && !hasEffect(effects, 'dodge') && randInt(1, 100) <= passiveDodge) {
      logs.push(`💨 **Dodge pasif** — Né đòn của **${combatEnemy.name}**!`);
      continue;
    }

    // Shadow Step dodge — consumed on first use
    if (!dodgeConsumed && hasEffect(effects, 'dodge')) {
      dodgeConsumed = true;
      const idx = effects.findIndex(e => e.name === 'dodge');
      effects.splice(idx, 1);
      logs.push(`🌑 **Shadow Step!** Né đòn của **${combatEnemy.name}**!`);
      continue;
    }

    const enemyAtk = Math.max(1, combatEnemy.atk + enemyAtkMod);
    const hpPct = combatEnemy.hp / combatEnemy.max_hp;
    const useSpecial = !silenced && ((hpPct < 0.3 && randInt(1, 100) <= 60) || randInt(1, 100) <= 30);
    const special = useSpecial && combatEnemy.specialAttacks.length > 0 ? pick(combatEnemy.specialAttacks) : null;

    let dealDmg = 0;
    if (special) {
      const fullDef = getEnemy(combatEnemy.id);
      const fakeDef: EnemyDef = fullDef ?? {
        id: combatEnemy.id, name: combatEnemy.name, icon: combatEnemy.icon,
        level: 1, hp: combatEnemy.max_hp, atk: combatEnemy.atk, def: combatEnemy.def,
        expReward: 0, goldMin: 0, goldMax: 0, drops: [],
        specialAttacks: combatEnemy.specialAttacks, zones: [], lore: ''
      };
      const res = applySpecialAttack(special, enemyAtk, fakeDef, playerHp, playerMp, logs, (current as any).player_def ?? 0);
      playerHp = res.playerHp; playerMp = res.playerMp; dealDmg = res.dmg;
      if (dealDmg > 0) {
        const adjusted = applyIncomingDamageModifiers(current, effects, logs, dealDmg, { isBossAttacker: !!fakeDef.boss, isSpecial: true });
        playerHp = Math.min(current.player_max_hp, playerHp + (dealDmg - adjusted));
        dealDmg = adjusted;
      }
      if (res.enemyHeal > 0) {
        const healIdx = enemies.findIndex(e => e === combatEnemy);
        if (healIdx >= 0) enemies[healIdx] = { ...combatEnemy, hp: Math.min(combatEnemy.max_hp, combatEnemy.hp + res.enemyHeal) };
      }
    } else {
      dealDmg = Math.max(1, calcDamage(enemyAtk, ((current as any).player_def ?? 0) + defenseBonus));
      dealDmg = applyIncomingDamageModifiers(current, effects, logs, dealDmg, { isBossAttacker: !!getEnemy(combatEnemy.id)?.boss });
      playerHp = Math.max(0, playerHp - dealDmg);
      logs.push(`${combatEnemy.icon} **${combatEnemy.name}** tấn công gây **${dealDmg}** sát thương. (${playerHp}/${current.player_max_hp} HP)`);
    }

    // Counter reaction
    if (passives.hasCounter && dealDmg > 0 && randInt(1, 100) <= 40) {
      const player = getPlayer(current.user_id, current.guild_id);
      const counterDmg = Math.max(1, Math.floor((player?.atk ?? 10) * 0.6));
      const eIdx = enemies.findIndex(e => e.id === combatEnemy.id && e.hp > 0);
      if (eIdx >= 0) {
        enemies[eIdx] = { ...enemies[eIdx], hp: Math.max(0, enemies[eIdx].hp - counterDmg) };
        logs.push(`🔄 **Counter!** Phản đòn **${combatEnemy.name}** gây **${counterDmg}** sát thương!`);
        if (enemies.every(e => e.hp <= 0)) {
          const { effects: ticked } = tickEffects(effects);
          const finalState = { ...current, enemies_json: JSON.stringify(enemies) };
          return makeResult(original, finalState, playerHp, playerMp, ticked, logs, false, true, false);
        }
      }
    }
  }

  const { effects: ticked, playerBurnDmg, enemyBurnDmg } = tickEffects(effects);
  if (playerBurnDmg > 0) { playerHp = Math.max(0, playerHp - playerBurnDmg); logs.push(`🔥 Đốt cháy gây **${playerBurnDmg}** sát thương theo thời gian.`); }
  if (enemyBurnDmg > 0) {
    const fa = enemies.findIndex(e => e.hp > 0);
    if (fa >= 0) {
      enemies[fa] = { ...enemies[fa], hp: Math.max(0, enemies[fa].hp - enemyBurnDmg) };
      logs.push(`🔥 Địch bị đốt cháy gây **${enemyBurnDmg}** sát thương!`);
      if (enemies.every(e => e.hp <= 0)) {
        const burnKillState = { ...current, enemies_json: JSON.stringify(enemies) };
        return makeResult(original, burnKillState, playerHp, playerMp, ticked, logs, false, true, false);
      }
    }
  }
  if (passives.hpRegenPerTurn > 0 && playerHp > 0) { playerHp = Math.min(current.player_max_hp, playerHp + passives.hpRegenPerTurn); logs.push(`💪 **Tough Body:** Hồi **${passives.hpRegenPerTurn} HP**.`); }
  if (passives.mpRegenPerTurn > 0) { playerMp = Math.min(current.player_max_mp, playerMp + passives.mpRegenPerTurn); logs.push(`💫 **Mana Flow:** Hồi **${passives.mpRegenPerTurn} MP**.`); }

  const hpThreshold = current.player_max_hp * 0.1;
  if (passives.hasLastStand && playerHp > 0 && playerHp <= hpThreshold && !hasEffect(ticked, 'berserk') && !hasEffect(ticked, 'last_stand_used')) {
    addEffect(ticked, 'berserk', 3, 50);
    addEffect(ticked, 'last_stand_used', 999);
    logs.push(`🔱 **Last Stand!** HP cực thấp — ATK +50% trong **3 lượt**!`);
  }

  const updatedStateGroup = { ...current, enemies_json: JSON.stringify(enemies) };
  return makeResult(original, updatedStateGroup, playerHp, playerMp, ticked, logs, playerHp <= 0, false, false);
}

// ── Special attack dispatch ───────────────────────────────────────────────
function applySpecialAttack(
  special: string, baseAtk: number, enemy: EnemyDef,
  playerHp: number, playerMp: number, logs: string[],
  playerDef = 0
): { playerHp: number; playerMp: number; dmg: number; enemyHeal: number } {
  // Armor-piercing attacks intentionally ignore DEF; all others use full DEF
  const PIERCE_DEF = new Set([
    'piercing_arrow', 'bone_shards', 'backstab', 'ambush', 'phase_through',
    'phantom_shot', 'spectral_slash', 'banish', 'abyss_strike', 'erase',
  ]);
  const def = (n: string) => PIERCE_DEF.has(n) ? 0 : playerDef;
  let dmg = 0;
  let enemyHeal = 0;
  const n = enemy.name, ic = enemy.icon;
  switch (special) {
    case 'double_bite':
      dmg = Math.max(1, calcDamage(baseAtk * 0.6, def(special))) * 2;
      playerHp = Math.max(0, playerHp - dmg);
      logs.push(`🐺 **${n}** cắn **hai lần**! Tổng **${dmg}** sát thương!`); break;
    case 'drain_mp': {
      const d = Math.min(playerMp, 15); playerMp -= d;
      logs.push(`${ic} **${n}** hút **${d} MP**!`); break;
    }
    case 'petal_storm':
      dmg = Math.max(1, calcDamage(baseAtk * 0.8, def(special)));
      playerHp = Math.max(0, playerHp - dmg);
      logs.push(`${ic} **${n}** tung **Petal Storm**! **${dmg}** sát thương!`); break;
    case 'root_slam':
      dmg = Math.max(1, calcDamage(baseAtk * 1.5, def(special)));
      playerHp = Math.max(0, playerHp - dmg);
      logs.push(`${ic} **${n}** đập rễ cây! **${dmg}** sát thương!`); break;
    case 'nature_regeneration':
      enemyHeal = Math.max(1, Math.floor(enemy.hp * 0.15));
      logs.push(`${ic} **${n}** hồi phục sinh lực từ đất! +**${enemyHeal} HP**`); break;
    case 'divine_judgment':
      dmg = Math.max(1, calcDamage(baseAtk * 1.4, def(special)));
      playerHp = Math.max(0, playerHp - dmg);
      logs.push(`${ic} **${n}** tung **Divine Judgment**! **${dmg}** sát thương!`); break;
    case 'shatter_guard':
      dmg = Math.max(1, calcDamage(baseAtk * 1.1, def(special)));
      playerHp = Math.max(0, playerHp - dmg);
      logs.push(`${ic} **${n}** phá vỡ phòng thủ! **${dmg}** sát thương!`); break;
    case 'enrage':
      dmg = Math.max(1, calcDamage(baseAtk * 0.7, def(special)));
      playerHp = Math.max(0, playerHp - dmg);
      logs.push(`${ic} **${n}** nổi điên và tung đòn điên cuồng! **${dmg}** sát thương!`); break;
    case 'cave_in':
      dmg = Math.max(1, calcDamage(baseAtk * 1.2, def(special)));
      playerHp = Math.max(0, playerHp - dmg);
      logs.push(`${ic} **${n}** gây sạt lở! **${dmg}** sát thương!`); break;
    case 'rock_throw':
      dmg = Math.max(1, calcDamage(baseAtk * 0.9, def(special)));
      playerHp = Math.max(0, playerHp - dmg);
      logs.push(`${ic} **${n}** ném đá! **${dmg}** sát thương!`); break;
    case 'blood_drain':
      dmg = Math.max(1, calcDamage(baseAtk * 0.9, def(special)));
      playerHp = Math.max(0, playerHp - dmg);
      logs.push(`${ic} **${n}** hút máu! **${dmg}** sát thương!`); break;
    case 'screech':
      dmg = Math.max(1, calcDamage(baseAtk * 0.5, def(special)));
      playerHp = Math.max(0, playerHp - dmg);
      logs.push(`${ic} **${n}** hét vang! **${dmg}** sát thương + hoa mắt!`); break;
    case 'howl':
      dmg = Math.max(1, calcDamage(baseAtk * 0.6, def(special)));
      playerHp = Math.max(0, playerHp - dmg);
      logs.push(`${ic} **${n}** hú vang và lao vào tấn công! **${dmg}** sát thương!`); break;
    case 'piercing_arrow':
      dmg = Math.max(1, calcDamage(baseAtk * 1.2, def(special)));
      playerHp = Math.max(0, playerHp - dmg);
      logs.push(`${ic} **${n}** bắn **Mũi Tên Xuyên Giáp**! **${dmg}** sát thương!`); break;
    case 'phase_through':
      dmg = Math.max(1, calcDamage(baseAtk * 0.8, def(special)));
      playerHp = Math.max(0, playerHp - dmg);
      logs.push(`${ic} **${n}** xuyên qua hàng phòng thủ! **${dmg}** sát thương!`); break;
    case 'ground_slam':
      dmg = Math.max(1, calcDamage(baseAtk * 1.3, def(special)));
      playerHp = Math.max(0, playerHp - dmg);
      logs.push(`${ic} **${n}** đập đất! **${dmg}** sát thương!`); break;
    case 'seismic_slam':
      dmg = Math.max(1, calcDamage(baseAtk * 1.6, def(special)));
      playerHp = Math.max(0, playerHp - dmg);
      logs.push(`${ic} **${n}** tung **Seismic Slam**! **${dmg}** sát thương khổng lồ!`); break;
    case 'magma_core':
      dmg = Math.max(1, calcDamage(baseAtk * 1.4, def(special)));
      playerHp = Math.max(0, playerHp - dmg);
      logs.push(`${ic} **${n}** bùng phát lõi magma! **${dmg}** sát thương lửa!`); break;
    case 'void_drain': {
      dmg = Math.max(1, calcDamage(baseAtk * 0.7, def(special)));
      const mpD = Math.min(playerMp, 20); playerHp = Math.max(0, playerHp - dmg); playerMp -= mpD;
      logs.push(`${ic} **${n}** dùng **Void Drain**! −${dmg} HP, −${mpD} MP!`); break;
    }
    case 'reality_tear':
      dmg = Math.max(1, calcDamage(baseAtk * 1.1, def(special)));
      playerHp = Math.max(0, playerHp - dmg);
      logs.push(`${ic} **${n}** xé toạc thực tại! **${dmg}** sát thương!`); break;
    case 'skill_echo':
      dmg = Math.max(1, calcDamage(baseAtk * 1.0, def(special)));
      playerHp = Math.max(0, playerHp - dmg);
      logs.push(`${ic} **${n}** sao chép kỹ năng của bạn! **${dmg}** sát thương!`); break;
    case 'mind_crush':
      dmg = Math.max(1, calcDamage(baseAtk * 1.2, def(special)));
      playerHp = Math.max(0, playerHp - dmg);
      logs.push(`${ic} **${n}** đè nát tâm trí! **${dmg}** sát thương!`); break;
    case 'erase':
      dmg = Math.max(1, calcDamage(baseAtk * 2.0, def(special)));
      playerHp = Math.max(0, playerHp - dmg);
      logs.push(`${ic} **${n}** cố **XÓA SỔ** bạn! **${dmg}** sát thương khổng lồ!`); break;
    case 'butterfly_curse':
      dmg = Math.max(1, calcDamage(baseAtk * 0.8, def(special)));
      playerHp = Math.max(0, playerHp - dmg);
      logs.push(`${ic} **${n}** tung **Butterfly Curse!** **${dmg}** sát thương!`); break;
    case 'forgotten_rage':
      dmg = Math.max(1, calcDamage(baseAtk * 1.8, def(special)));
      playerHp = Math.max(0, playerHp - dmg);
      logs.push(`${ic} **${n}** bùng phát cơn thịnh nộ! **${dmg}** sát thương!`); break;
    case 'backstab':
      dmg = Math.max(1, calcDamage(baseAtk * 1.3, def(special)));
      playerHp = Math.max(0, playerHp - dmg);
      logs.push(`${ic} **${n}** đâm lén! **${dmg}** sát thương!`); break;
    case 'shield_bash':
      dmg = Math.max(1, calcDamage(baseAtk * 0.9, def(special)));
      playerHp = Math.max(0, playerHp - dmg);
      logs.push(`${ic} **${n}** húc khiên! **${dmg}** sát thương!`); break;
    // ── Quái mới ──────────────────────────────────────────────────────────
    case 'toxic_spores':
      dmg = Math.max(1, calcDamage(baseAtk * 0.5, def(special)));
      playerHp = Math.max(0, playerHp - dmg);
      logs.push(`${ic} **${n}** phun **bào tử độc**! **${dmg}** sát thương + ngộ độc!`); break;
    case 'ambush':
      dmg = Math.max(1, calcDamage(baseAtk * 1.6, def(special)));
      playerHp = Math.max(0, playerHp - dmg);
      logs.push(`${ic} **${n}** tấn công bất ngờ từ bóng tối! **${dmg}** sát thương!`); break;
    case 'savage_bite':
      dmg = Math.max(1, calcDamage(baseAtk * 1.0, def(special)));
      playerHp = Math.max(0, playerHp - dmg);
      logs.push(`${ic} **${n}** cắn dữ dội! **${dmg}** sát thương!`); break;
    case 'frenzy': {
      const h1 = Math.max(1, calcDamage(baseAtk * 0.5, def(special)));
      const h2 = Math.max(1, calcDamage(baseAtk * 0.5, def(special)));
      const h3 = Math.max(1, calcDamage(baseAtk * 0.5, def(special)));
      dmg = h1 + h2 + h3;
      playerHp = Math.max(0, playerHp - dmg);
      logs.push(`${ic} **${n}** phát điên — **3 đòn** liên tiếp! Tổng **${dmg}** sát thương!`); break;
    }
    case 'thorn_lash':
      dmg = Math.max(1, calcDamage(baseAtk * 1.1, def(special)));
      playerHp = Math.max(0, playerHp - dmg);
      logs.push(`${ic} **${n}** quật **gai cây**! **${dmg}** sát thương!`); break;
    case 'bark_regen':
      enemyHeal = Math.max(1, Math.floor(enemy.hp * 0.10));
      logs.push(`${ic} **${n}** bao phủ mình trong vỏ cây dày, hồi **${enemyHeal} HP**!`); break;
    case 'soul_flicker': {
      dmg = Math.max(1, calcDamage(baseAtk * 0.6, def(special)));
      const mpD2 = Math.min(playerMp, 20);
      playerHp = Math.max(0, playerHp - dmg);
      playerMp -= mpD2;
      logs.push(`${ic} **${n}** hút linh hồn! −**${dmg} HP**, −**${mpD2} MP**!`); break;
    }
    case 'bewitch':
      dmg = Math.max(1, calcDamage(baseAtk * 0.8, def(special)));
      playerHp = Math.max(0, playerHp - dmg);
      logs.push(`${ic} **${n}** bùa mê! Bạn bị mê hoặc, hứng **${dmg}** sát thương!`); break;
    case 'bone_shards':
      dmg = Math.max(1, calcDamage(baseAtk * 1.2, def(special)));
      playerHp = Math.max(0, playerHp - dmg);
      logs.push(`${ic} **${n}** bắn ra mảnh xương! **${dmg}** sát thương xuyên giáp!`); break;
    case 'death_curse':
      dmg = Math.max(1, calcDamage(baseAtk * 1.5, def(special)));
      playerHp = Math.max(0, playerHp - dmg);
      logs.push(`${ic} **${n}** tung **Lời Nguyền Tử Thần**! **${dmg}** sát thương!`); break;
    case 'spectral_slash':
      dmg = Math.max(1, calcDamage(baseAtk * 1.1, def(special)));
      playerHp = Math.max(0, playerHp - dmg);
      logs.push(`${ic} **${n}** chém bằng lưỡi kiếm linh hồn! **${dmg}** sát thương!`); break;
    case 'banish':
      dmg = Math.max(1, calcDamage(baseAtk * 0.9, def(special)));
      playerHp = Math.max(0, playerHp - dmg);
      logs.push(`${ic} **${n}** trục xuất linh hồn của bạn! **${dmg}** sát thương!`); break;
    case 'idol_curse':
      dmg = Math.max(1, calcDamage(baseAtk * 1.0, def(special)));
      playerHp = Math.max(0, playerHp - dmg);
      logs.push(`${ic} **${n}** phóng ra lời nguyền! **${dmg}** sát thương hắc ám!`); break;
    case 'hex_bolt':
      dmg = Math.max(1, calcDamage(baseAtk * 1.3, def(special)));
      playerHp = Math.max(0, playerHp - dmg);
      logs.push(`${ic} **${n}** bắn **tia tà phép**! **${dmg}** sát thương!`); break;
    case 'magma_claw':
      dmg = Math.max(1, calcDamage(baseAtk * 1.1, def(special)));
      playerHp = Math.max(0, playerHp - dmg);
      logs.push(`${ic} **${n}** càng dung nham! **${dmg}** sát thương lửa!`); break;
    case 'heat_burst':
      dmg = Math.max(1, calcDamage(baseAtk * 1.4, def(special)));
      playerHp = Math.max(0, playerHp - dmg);
      logs.push(`${ic} **${n}** nổ tung nhiệt! **${dmg}** sát thương bùng cháy!`); break;
    case 'crystal_web':
      dmg = Math.max(1, calcDamage(baseAtk * 0.7, def(special)));
      playerHp = Math.max(0, playerHp - dmg);
      logs.push(`${ic} **${n}** bẫy tơ pha lê! **${dmg}** sát thương + bẫy di chuyển!`); break;
    case 'venom_inject':
      dmg = Math.max(1, calcDamage(baseAtk * 0.8, def(special)));
      playerHp = Math.max(0, playerHp - dmg);
      logs.push(`${ic} **${n}** tiêm nọc độc mạnh! **${dmg}** sát thương + độc nặng!`); break;
    case 'iron_crush':
      dmg = Math.max(1, calcDamage(baseAtk * 1.4, def(special)));
      playerHp = Math.max(0, playerHp - dmg);
      logs.push(`${ic} **${n}** nghiền nát bằng sức mạnh sắt thép! **${dmg}** sát thương!`); break;
    case 'fortress_stance':
      enemyHeal = Math.max(1, Math.floor(enemy.hp * 0.08));
      logs.push(`${ic} **${n}** vào tư thế pháo đài, hồi phục **${enemyHeal} HP**!`); break;
    case 'phantom_shot':
      dmg = Math.max(1, calcDamage(baseAtk * 1.2, def(special)));
      playerHp = Math.max(0, playerHp - dmg);
      logs.push(`${ic} **${n}** bắn tên ảo ảnh chính xác! **${dmg}** sát thương!`); break;
    case 'mirror_split': {
      const m1 = Math.max(1, calcDamage(baseAtk * 0.7, def(special)));
      const m2 = Math.max(1, calcDamage(baseAtk * 0.7, def(special)));
      dmg = m1 + m2;
      playerHp = Math.max(0, playerHp - dmg);
      logs.push(`${ic} **${n}** phân thân tấn công **2 lần**! Tổng **${dmg}** sát thương!`); break;
    }
    case 'psychic_drain': {
      dmg = Math.max(1, calcDamage(baseAtk * 0.9, def(special)));
      const mpD3 = Math.min(playerMp, 25);
      playerHp = Math.max(0, playerHp - dmg);
      playerMp -= mpD3;
      logs.push(`${ic} **${n}** hút ký ức! −**${dmg} HP**, −**${mpD3} MP**!`); break;
    }
    case 'thought_devour':
      dmg = Math.max(1, calcDamage(baseAtk * 1.7, def(special)));
      playerHp = Math.max(0, playerHp - dmg);
      logs.push(`${ic} **${n}** nuốt chửng tư duy! **${dmg}** sát thương tâm trí!`); break;
    case 'abyss_strike':
      dmg = Math.max(1, calcDamage(baseAtk * 1.5, def(special)));
      playerHp = Math.max(0, playerHp - dmg);
      logs.push(`${ic} **${n}** đánh từ vực thẳm! **${dmg}** sát thương hư vô!`); break;
    case 'doom_call':
      dmg = Math.max(1, calcDamage(baseAtk * 2.0, def(special)));
      playerHp = Math.max(0, playerHp - dmg);
      logs.push(`${ic} **${n}** triệu hồi **Lời Tiên Tri Diệt Vong**! **${dmg}** sát thương kinh hoàng!`); break;
    case 'entangle':
      dmg = Math.max(1, calcDamage(baseAtk * 1.0, def(special)));
      playerHp = Math.max(0, playerHp - dmg);
      logs.push(`${ic} **${n}** trói chặt bằng rễ cây! **${dmg}** sát thương!`); break;
    default:
      dmg = Math.max(1, calcDamage(baseAtk * 1.1, def(special)));
      playerHp = Math.max(0, playerHp - dmg);
      logs.push(`${ic} **${n}** tung đòn đặc biệt! **${dmg}** sát thương!`);
  }
  return { playerHp, playerMp, dmg, enemyHeal };
}

// ── makeResult ────────────────────────────────────────────────────────────
function makeResult(
  _orig: CombatState, current: CombatState,
  playerHp: number, playerMp: number,
  effects: Effect[], logs: string[],
  playerDied: boolean, enemyDied: boolean, fled: boolean,
  playerStamina?: number
): ActionResult {
  const maxStamina = current.player_max_stamina ?? 100;
  if (enemyDied) {
    const killRegen = applyKillEquipmentEffects(current, playerHp, playerMp, logs);
    playerHp = killRegen.hp;
    playerMp = killRegen.mp;
  }
  const eqStatsEnd = getEquipmentStats(current.user_id, current.guild_id);
  if (!fled && !enemyDied && !playerDied && playerHp > 0) {
    if (eqStatsEnd.effects.includes('mp_regen_3t') && current.turn % 3 === 0) {
      playerMp = Math.min(current.player_max_mp, playerMp + 5);
      logs.push('💧 MP Regen 3T: hồi **5 MP**.');
    }
    if (eqStatsEnd.effects.includes('curse_hp_drain')) {
      const drain = Math.max(1, Math.floor(current.player_max_hp * 0.02));
      playerHp = Math.max(1, playerHp - drain);
      logs.push(`🩸 Curse HP Drain: mất **${drain} HP**.`);
    }
  }
  // Natural stamina regen each turn end
  const rawStamina = playerStamina ?? (current.player_stamina ?? 100);
  const regenStamina = Math.min(maxStamina, rawStamina + 6);
  return {
    newState: {
      ...current,
      player_hp: playerHp, player_mp: playerMp,
      turn: current.turn + 1, is_defending: 0,
      active_effects: JSON.stringify(effects),
      combat_log: JSON.stringify(logs.slice(-4)),
      player_stamina: regenStamina,
      player_max_stamina: maxStamina
    },
    logLines: logs, playerDied, enemyDied, fled
  };
}
