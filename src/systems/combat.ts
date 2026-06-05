import db from '../database/index';
import { randInt, pick } from '../utils/format';
import { getSkill } from '../data/skills';
import { getEnemy, type EnemyDef } from '../data/enemies';
import { getLoadout, applyPassiveStats, getPlayer } from './player';
import { getEquipmentStats } from './equipment';
import type { CombatState } from '../utils/embeds';
import type { PlayerRow } from '../utils/embeds';

export interface Effect {
  name: string;
  duration: number;
  value?: number;
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
     turn, is_defending, active_effects, combat_log,
     player_stamina, player_max_stamina)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    state.message_id, state.channel_id, state.user_id, state.guild_id,
    state.enemy_id, state.enemy_name,
    state.enemy_hp, state.enemy_max_hp, state.enemy_atk, state.enemy_def,
    state.player_hp, state.player_max_hp, state.player_mp, state.player_max_mp,
    state.turn, state.is_defending, state.active_effects, state.combat_log,
    state.player_stamina ?? 100, state.player_max_stamina ?? 100
  );
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
}

function getPassives(userId: string, guildId: string): Passives {
  const loadout = getLoadout(userId, guildId);
  const p: Passives = {
    hasBerserker: false, hasVampiric: false,
    hasCounter: false, hasLastStand: false,
    hpRegenPerTurn: 0, mpRegenPerTurn: 0
  };
  for (const entry of loadout) {
    const sk = getSkill(entry.skill_id);
    if (!sk) continue;
    switch (sk.id) {
      case 'berserker':  p.hasBerserker  = true; break;
      case 'vampiric':   p.hasVampiric   = true; break;
      case 'counter':    p.hasCounter    = true; break;
      case 'last_stand': p.hasLastStand  = true; break;
      case 'tough_body': p.hpRegenPerTurn += sk.passiveBonus?.hpRegen ?? 0; break;
      case 'mana_flow':  p.mpRegenPerTurn += sk.passiveBonus?.mpRegen ?? 0; break;
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

export function tickEffects(effects: Effect[]): { effects: Effect[]; burnDmg: number } {
  let burnDmg = 0;
  const next = effects
    .map(e => {
      if (e.name === 'burn') burnDmg += e.value ?? 5;
      return { ...e, duration: e.duration - 1 };
    })
    .filter(e => e.duration > 0);
  return { effects: next, burnDmg };
}

export function addEffect(effects: Effect[], name: string, duration: number, value?: number): Effect[] {
  const idx = effects.findIndex(e => e.name === name);
  if (idx >= 0) {
    effects[idx].duration = Math.max(effects[idx].duration, duration);
    if (value !== undefined) effects[idx].value = value;
  } else {
    effects.push({ name, duration, value });
  }
  return effects;
}

// ── Damage calc ───────────────────────────────────────────────────────────
function calcDamage(atk: number, def: number, variance = 0.15): number {
  const base = Math.max(1, atk - def);
  const v = base * variance;
  return Math.max(1, Math.round(base + randInt(-v, v)));
}

// ── Action result ─────────────────────────────────────────────────────────
export interface ActionResult {
  newState:   CombatState;
  logLines:   string[];
  playerDied: boolean;
  enemyDied:  boolean;
  fled:       boolean;
}

// ── processAttack ─────────────────────────────────────────────────────────
export function processAttack(state: CombatState, playerAtk: number): ActionResult {
  const effects  = parseEffects(state.active_effects);
  const logs: string[] = JSON.parse(state.combat_log || '[]');
  const passives = getPassives(state.user_id, state.guild_id);
  let { player_hp, player_mp, enemy_hp } = state;
  let player_stamina = state.player_stamina ?? 100;
  const player_max_stamina = state.player_max_stamina ?? 100;

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

  // Equipment stats
  const eqStats = getEquipmentStats(state.user_id, state.guild_id);
  const totalCrit    = (eqStats.critChance   ?? 0);
  const totalLifesteal = (eqStats.lifesteal  ?? 0) + (passives.hasVampiric ? 15 : 0);

  // Crit check
  const isCrit = totalCrit > 0 && randInt(1, 100) <= totalCrit;
  let dmg = calcDamage(effectiveAtk, state.enemy_def);
  if (isCrit) { dmg = Math.floor(dmg * 1.75); }
  enemy_hp = Math.max(0, enemy_hp - dmg);

  const critTag = isCrit ? ' ✨ **CRIT!**' : '';
  logs.push(`⚔️ Bạn tấn công gây **${dmg}** sát thương.${critTag} (${enemy_hp}/${state.enemy_max_hp} HP còn lại)`);

  // Lifesteal (vampiric passive + equipment)
  if (totalLifesteal > 0 && dmg > 0) {
    const stolen = Math.max(1, Math.floor(dmg * totalLifesteal / 100));
    player_hp = Math.min(state.player_max_hp, player_hp + stolen);
    logs.push(`🩸 Hút **${stolen} HP** (${totalLifesteal}% lifesteal).`);
  }

  // Equipment effects on hit
  if (eqStats.effects.includes('burn_on_hit') && randInt(1, 100) <= 20) {
    addEffect(effects, 'burn', 2, 5);
    logs.push(`🔥 Flameblade — Đốt cháy 2 lượt!`);
  }
  if (eqStats.effects.includes('stun_on_hit') && randInt(1, 100) <= 15) {
    addEffect(effects, 'stun', 1);
    logs.push(`💫 Hammer — Choáng 1 lượt!`);
  }
  if (eqStats.effects.includes('extra_hit') && randInt(1, 100) <= 10) {
    const bonusDmg = Math.max(1, Math.floor(effectiveAtk * 0.3));
    enemy_hp = Math.max(0, enemy_hp - bonusDmg);
    logs.push(`⚡ Đòn phụ! +**${bonusDmg}** sát thương.`);
  }
  if (eqStats.effects.includes('star_damage') && randInt(1, 100) <= 20) {
    const starDmg = Math.max(1, Math.floor(effectiveAtk * 0.4));
    enemy_hp = Math.max(0, enemy_hp - starDmg);
    logs.push(`⭐ Star Damage! +**${starDmg}** sát thương!`);
  }
  // Dodge on crit
  if (isCrit && eqStats.effects.includes('dodge_on_crit') && randInt(1, 100) <= 20) {
    addEffect(effects, 'dodge', 1);
    logs.push(`🌑 Crit → Dodge kích hoạt!`);
  }

  // Boss damage bonus from equipment
  // (already applied via effectiveAtk multiplier in caller if boss)

  if (enemy_hp <= 0) {
    return makeResult(state, { ...state, enemy_hp }, player_hp, player_mp, effects, logs, false, true, false);
  }

  return enemyTurn(state, { ...state, enemy_hp }, player_hp, player_mp, effects, logs, defendBonus, passives);
}

// ── processSkill ──────────────────────────────────────────────────────────
export function processSkill(
  state: CombatState, skillId: string, playerAtk: number,
  _hpRegen: number, _mpRegen: number
): ActionResult {
  const skill = getSkill(skillId);
  if (!skill) return processAttack(state, playerAtk);

  const effects = parseEffects(state.active_effects);
  const logs: string[] = JSON.parse(state.combat_log || '[]');
  const passives = getPassives(state.user_id, state.guild_id);
  let { player_hp, player_mp, enemy_hp } = state;

  // Soul Shard cost check
  // Stamina cost for skill use
  {
    const staminaCost = 10;
    const curStamina = state.player_stamina ?? 100;
    const maxStamina = state.player_max_stamina ?? 100;
    // We'll carry stamina through in the return states
    // Stored as temporary marker - makeResult handles natural regen
    (state as any).__skillStamina = Math.max(0, curStamina - staminaCost);
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
  if (skill.mpCost && player_mp < skill.mpCost) {
    logs.push(`❌ Không đủ MP để dùng **${skill.name}**! (cần ${skill.mpCost}, có ${player_mp})`);
    return { newState: { ...state, combat_log: JSON.stringify(logs.slice(-6)) }, logLines: logs, playerDied: false, enemyDied: false, fled: false };
  }

  player_mp -= skill.mpCost ?? 0;

  // ── World skills ────────────────────────────────────────────────────────
  if (skill.type === 'world') {
    const player = getPlayer(state.user_id, state.guild_id);
    const zoneId = player?.zone_id ?? 'forest';

    if (skill.worldEffect === 'zone_marked') {
      const { setFlag } = require('./world');
      setFlag(state.guild_id, `zone_marked_${zoneId}`, '1', 86400);
      logs.push(`📍 **Mark Zone!** Drop rate +15% tại zone trong 24h!`);
    } else if (skill.worldEffect === 'soul_drop') {
      const sacrifice = Math.floor(state.player_max_hp * 0.2);
      player_hp = Math.max(1, player_hp - sacrifice);
      const { grantSoulShards } = require('./player');
      grantSoulShards(state.user_id, state.guild_id, 2);
      logs.push(`💀 **Soul Offering!** Hy sinh **${sacrifice} HP** → +**2 Soul Shards**!`);
    }

    // World skills skip enemy counter
    return makeResult(state, { ...state }, player_hp, player_mp, effects, logs, false, false, false);
  }

  // ── Damage skills ────────────────────────────────────────────────────────
  if (skill.damage) {
    // Soul Strike pierces more DEF (only 30% DEF reduction)
    const defPierce = (skill as any).soulCost ? 0.3 : 0.5;
    const finalDmg = Math.max(1, Math.round(skill.damage - state.enemy_def * defPierce));
    enemy_hp = Math.max(0, enemy_hp - finalDmg);
    logs.push(`${skill.icon} **${skill.name}**! Gây **${finalDmg}** sát thương.`);
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
  if (skill.effect && skill.effectDuration) {
    const val = skill.effect === 'burn' ? 5 : undefined;
    addEffect(effects, skill.effect, skill.effectDuration, val);
    const effectLabels: Record<string, string> = {
      burn: '🔥 Đốt cháy', slow: '🧊 Làm chậm', stun: '💫 Choáng',
      dodge: '🌑 Shadow Step — sẽ né đòn tấn công tiếp theo'
    };
    if (!skill.damage && !skill.heal) {
      // Pure-effect skills get their own log line
      logs.push(`${skill.icon} **${skill.name}**! ${effectLabels[skill.effect] ?? skill.effect} ×${skill.effectDuration} lượt.`);
    } else {
      logs.push(`  └ ${effectLabels[skill.effect] ?? skill.effect} ×${skill.effectDuration} lượt.`);
    }
  }

  if (enemy_hp <= 0) {
    return makeResult(state, { ...state, enemy_hp }, player_hp, player_mp, effects, logs, false, true, false);
  }

  return enemyTurn(state, { ...state, enemy_hp }, player_hp, player_mp, effects, logs, 0, passives);
}

// ── processDefend ─────────────────────────────────────────────────────────
export function processDefend(state: CombatState, playerAtk: number, _h: number, _m: number): ActionResult {
  const effects  = parseEffects(state.active_effects);
  const passives = getPassives(state.user_id, state.guild_id);
  const logs: string[] = JSON.parse(state.combat_log || '[]');
  // Defend restores stamina
  const staminaGain = 25;
  const maxStamina  = state.player_max_stamina ?? 100;
  const newStamina  = Math.min(maxStamina, (state.player_stamina ?? 100) + staminaGain);
  logs.push(`🛡️ Bạn **Phòng thủ** — giảm 40% sát thương và hồi **${staminaGain} ⚡ Stamina**.`);
  const defendedState = { ...state, is_defending: 1, player_stamina: newStamina };
  return enemyTurn(state, defendedState, state.player_hp, state.player_mp, effects, logs, Math.floor(state.enemy_atk * 0.4), passives);
}

// ── processFlee ───────────────────────────────────────────────────────────
export function processFlee(state: CombatState): ActionResult {
  const passives = getPassives(state.user_id, state.guild_id);
  const logs: string[] = JSON.parse(state.combat_log || '[]');
  if (randInt(1, 100) <= 60) {
    logs.push(`🏃 Bạn **bỏ chạy** thành công!`);
    return { newState: state, logLines: logs, playerDied: false, enemyDied: false, fled: true };
  }
  logs.push(`🏃 Cố bỏ chạy nhưng thất bại!`);
  const effects = parseEffects(state.active_effects);
  return enemyTurn(state, state, state.player_hp, state.player_mp, effects, logs, 0, passives);
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
    const { effects: ticked, burnDmg } = tickEffects(nextEffects);
    if (burnDmg > 0) { playerHp = Math.max(0, playerHp - burnDmg); logs.push(`🔥 Đốt cháy −**${burnDmg} HP**.`); }
    playerHp = Math.min(current.player_max_hp, playerHp + passives.hpRegenPerTurn);
    playerMp = Math.min(current.player_max_mp, playerMp + passives.mpRegenPerTurn);
    if (passives.mpRegenPerTurn > 0) logs.push(`💫 Hồi **${passives.mpRegenPerTurn} MP** (Mana Flow).`);
    return makeResult(original, current, playerHp, playerMp, ticked, logs, playerHp <= 0, false, false);
  }

  // ── Shield (Soul Guard): block one massive/lethal hit ──────────────────
  if (hasEffect(effects, 'shield')) {
    // Pre-calc if this would be a fatal/heavy hit
    const preDmg = Math.max(1, enemy.atk - defenseBonus);
    const wouldBeHeavy = preDmg >= playerHp || preDmg > current.player_max_hp * 0.5;
    if (wouldBeHeavy) {
      const idx = effects.findIndex(e => e.name === 'shield');
      effects.splice(idx, 1);
      logs.push(`🛡️💀 **Soul Guard** bloqueou o golpe! O ataque foi absorvido!`);
      const { effects: ticked, burnDmg } = tickEffects(effects);
      if (burnDmg > 0) { playerHp = Math.max(0, playerHp - burnDmg); }
      playerHp = Math.min(current.player_max_hp, playerHp + passives.hpRegenPerTurn);
      playerMp = Math.min(current.player_max_mp, playerMp + passives.mpRegenPerTurn);
      return makeResult(original, current, playerHp, playerMp, ticked, logs, false, false, false);
    }
  }

  // ── Passive dodge chance (from equipment) ────────────────────────────
  const eqStatsET = getEquipmentStats(current.user_id, current.guild_id);
  const passiveDodge = eqStatsET.dodgeChance ?? 0;
  if (passiveDodge > 0 && !hasEffect(effects, 'dodge') && randInt(1, 100) <= passiveDodge) {
    logs.push(`💨 **Dodge pasif (${passiveDodge}%)** — Tránh đòn!`);
    const { effects: ticked, burnDmg } = tickEffects(effects);
    if (burnDmg > 0) { playerHp = Math.max(0, playerHp - burnDmg); }
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
    const { effects: ticked, burnDmg } = tickEffects(effects);
    if (burnDmg > 0) { playerHp = Math.max(0, playerHp - burnDmg); logs.push(`🔥 Đốt cháy −**${burnDmg} HP**.`); }
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
  const useSpecial = (hpPct < 0.3 && randInt(1, 100) <= 60) || randInt(1, 100) <= 30;
  const special    = useSpecial && enemy.specialAttacks.length > 0 ? pick(enemy.specialAttacks) : null;
  let dealDmg      = 0;

  if (special) {
    const res = applySpecialAttack(special, enemyAtk, enemy, playerHp, playerMp, logs);
    playerHp = res.playerHp;
    playerMp = res.playerMp;
    dealDmg  = res.dmg;
  } else {
    dealDmg  = Math.max(1, calcDamage(enemyAtk, defenseBonus));
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
        const { effects: ticked, burnDmg } = tickEffects(effects);
        return makeResult(original, current, playerHp, playerMp, ticked, logs, false, true, false);
      }
    }
  }

  // ── Tick end-of-turn effects ───────────────────────────────────────────
  const { effects: ticked, burnDmg } = tickEffects(effects);
  if (burnDmg > 0) {
    playerHp = Math.max(0, playerHp - burnDmg);
    logs.push(`🔥 Đốt cháy gây **${burnDmg}** sát thương theo thời gian.`);
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
  const { getItemQty, removeItem, updatePlayerHpMp } = require('./player');
  const { getItem } = require('../data/items');
  const effects = parseEffects(state.active_effects);
  const passives = getPassives(state.user_id, state.guild_id);
  const logs: string[] = JSON.parse(state.combat_log || '[]');
  let { player_hp, player_mp } = state;

  const qty = getItemQty(state.user_id, state.guild_id, itemId);
  const item = getItem(itemId);

  if (!item || qty <= 0 || item.type !== 'consumable' || !item.effect) {
    logs.push(`❌ Không thể dùng item này!`);
    return { newState: { ...state, combat_log: JSON.stringify(logs.slice(-4)) }, logLines: logs, playerDied: false, enemyDied: false, fled: false };
  }

  removeItem(state.user_id, state.guild_id, itemId, 1);

  if (item.effect.hp) {
    const gain = Math.min(item.effect.hp, state.player_max_hp - player_hp);
    player_hp = Math.min(state.player_max_hp, player_hp + item.effect.hp);
    logs.push(`🎒 Dùng **${item.icon} ${item.name}** — hồi **${gain} HP**! (${player_hp}/${state.player_max_hp})`);
  }
  if (item.effect.mp) {
    const gain = Math.min(item.effect.mp, state.player_max_mp - player_mp);
    player_mp = Math.min(state.player_max_mp, player_mp + item.effect.mp);
    logs.push(`🎒 Dùng **${item.icon} ${item.name}** — hồi **${gain} MP**!`);
  }
  if (item.effect.removeEffect) {
    const before = effects.length;
    const filtered = effects.filter((e: any) => e.name !== item.effect!.removeEffect);
    if (filtered.length < before) logs.push(`🎒 **${item.name}** — giải trừ **${item.effect.removeEffect}**!`);
    effects.splice(0, effects.length, ...filtered);
  }

  // Item use triggers enemy turn (costs your action)
  return enemyTurn(state, { ...state }, player_hp, player_mp, effects, logs, 0, passives);
}

// ── Special attack dispatch ───────────────────────────────────────────────
function applySpecialAttack(
  special: string, baseAtk: number, enemy: EnemyDef,
  playerHp: number, playerMp: number, logs: string[]
): { playerHp: number; playerMp: number; dmg: number } {
  let dmg = 0;
  const n = enemy.name, ic = enemy.icon;
  switch (special) {
    case 'double_bite':
      dmg = Math.max(1, calcDamage(baseAtk * 0.6, 0)) * 2;
      playerHp = Math.max(0, playerHp - dmg);
      logs.push(`🐺 **${n}** cắn **hai lần**! Tổng **${dmg}** sát thương!`); break;
    case 'drain_mp': {
      const d = Math.min(playerMp, 15); playerMp -= d;
      logs.push(`${ic} **${n}** hút **${d} MP**!`); break;
    }
    case 'petal_storm':
      dmg = Math.max(1, calcDamage(baseAtk * 0.8, 0));
      playerHp = Math.max(0, playerHp - dmg);
      logs.push(`${ic} **${n}** tung **Petal Storm**! **${dmg}** sát thương!`); break;
    case 'root_slam':
      dmg = Math.max(1, calcDamage(baseAtk * 1.5, 0));
      playerHp = Math.max(0, playerHp - dmg);
      logs.push(`${ic} **${n}** đập rễ cây! **${dmg}** sát thương!`); break;
    case 'nature_regeneration':
      logs.push(`${ic} **${n}** hồi phục sinh lực từ đất!`); break;
    case 'divine_judgment':
      dmg = Math.max(1, calcDamage(baseAtk * 1.4, 0));
      playerHp = Math.max(0, playerHp - dmg);
      logs.push(`${ic} **${n}** tung **Divine Judgment**! **${dmg}** sát thương!`); break;
    case 'shatter_guard':
      dmg = Math.max(1, calcDamage(baseAtk * 1.1, 0));
      playerHp = Math.max(0, playerHp - dmg);
      logs.push(`${ic} **${n}** phá vỡ phòng thủ! **${dmg}** sát thương!`); break;
    case 'enrage':
      logs.push(`${ic} **${n}** nổi điên — ATK tăng mạnh!`); break;
    case 'cave_in':
      dmg = Math.max(1, calcDamage(baseAtk * 1.2, 0));
      playerHp = Math.max(0, playerHp - dmg);
      logs.push(`${ic} **${n}** gây sạt lở! **${dmg}** sát thương!`); break;
    case 'rock_throw':
      dmg = Math.max(1, calcDamage(baseAtk * 0.9, 0));
      playerHp = Math.max(0, playerHp - dmg);
      logs.push(`${ic} **${n}** ném đá! **${dmg}** sát thương!`); break;
    case 'blood_drain':
      dmg = Math.max(1, calcDamage(baseAtk * 0.9, 0));
      playerHp = Math.max(0, playerHp - dmg);
      logs.push(`${ic} **${n}** hút máu! **${dmg}** sát thương!`); break;
    case 'screech':
      dmg = Math.max(1, calcDamage(baseAtk * 0.5, 0));
      playerHp = Math.max(0, playerHp - dmg);
      logs.push(`${ic} **${n}** hét vang! **${dmg}** sát thương + hoa mắt!`); break;
    case 'howl':
      logs.push(`${ic} **${n}** hú vang — đòn tiếp theo mạnh hơn!`); break;
    case 'piercing_arrow':
      dmg = Math.max(1, calcDamage(baseAtk * 1.2, 0));
      playerHp = Math.max(0, playerHp - dmg);
      logs.push(`${ic} **${n}** bắn **Mũi Tên Xuyên Giáp**! **${dmg}** sát thương!`); break;
    case 'phase_through':
      dmg = Math.max(1, calcDamage(baseAtk * 0.8, 0));
      playerHp = Math.max(0, playerHp - dmg);
      logs.push(`${ic} **${n}** xuyên qua hàng phòng thủ! **${dmg}** sát thương!`); break;
    case 'ground_slam':
      dmg = Math.max(1, calcDamage(baseAtk * 1.3, 0));
      playerHp = Math.max(0, playerHp - dmg);
      logs.push(`${ic} **${n}** đập đất! **${dmg}** sát thương!`); break;
    case 'seismic_slam':
      dmg = Math.max(1, calcDamage(baseAtk * 1.6, 0));
      playerHp = Math.max(0, playerHp - dmg);
      logs.push(`${ic} **${n}** tung **Seismic Slam**! **${dmg}** sát thương khổng lồ!`); break;
    case 'magma_core':
      dmg = Math.max(1, calcDamage(baseAtk * 1.4, 0));
      playerHp = Math.max(0, playerHp - dmg);
      logs.push(`${ic} **${n}** bùng phát lõi magma! **${dmg}** sát thương lửa!`); break;
    case 'void_drain': {
      dmg = Math.max(1, calcDamage(baseAtk * 0.7, 0));
      const mpD = Math.min(playerMp, 20); playerHp = Math.max(0, playerHp - dmg); playerMp -= mpD;
      logs.push(`${ic} **${n}** dùng **Void Drain**! −${dmg} HP, −${mpD} MP!`); break;
    }
    case 'reality_tear':
      dmg = Math.max(1, calcDamage(baseAtk * 1.1, 0));
      playerHp = Math.max(0, playerHp - dmg);
      logs.push(`${ic} **${n}** xé toạc thực tại! **${dmg}** sát thương!`); break;
    case 'skill_echo':
      dmg = Math.max(1, calcDamage(baseAtk * 1.0, 0));
      playerHp = Math.max(0, playerHp - dmg);
      logs.push(`${ic} **${n}** sao chép kỹ năng của bạn! **${dmg}** sát thương!`); break;
    case 'mind_crush':
      dmg = Math.max(1, calcDamage(baseAtk * 1.2, 0));
      playerHp = Math.max(0, playerHp - dmg);
      logs.push(`${ic} **${n}** đè nát tâm trí! **${dmg}** sát thương!`); break;
    case 'erase':
      dmg = Math.max(1, calcDamage(baseAtk * 2.0, 0));
      playerHp = Math.max(0, playerHp - dmg);
      logs.push(`${ic} **${n}** cố **XÓA SỔ** bạn! **${dmg}** sát thương khổng lồ!`); break;
    case 'butterfly_curse':
      dmg = Math.max(1, calcDamage(baseAtk * 0.8, 0));
      playerHp = Math.max(0, playerHp - dmg);
      logs.push(`${ic} **${n}** tung **Butterfly Curse!** **${dmg}** sát thương!`); break;
    case 'forgotten_rage':
      dmg = Math.max(1, calcDamage(baseAtk * 1.8, 0));
      playerHp = Math.max(0, playerHp - dmg);
      logs.push(`${ic} **${n}** bùng phát cơn thịnh nộ! **${dmg}** sát thương!`); break;
    case 'backstab':
      dmg = Math.max(1, calcDamage(baseAtk * 1.3, 0));
      playerHp = Math.max(0, playerHp - dmg);
      logs.push(`${ic} **${n}** đâm lén! **${dmg}** sát thương!`); break;
    case 'shield_bash':
      dmg = Math.max(1, calcDamage(baseAtk * 0.9, 0));
      playerHp = Math.max(0, playerHp - dmg);
      logs.push(`${ic} **${n}** húc khiên! **${dmg}** sát thương!`); break;
    default:
      dmg = Math.max(1, calcDamage(baseAtk * 1.1, 0));
      playerHp = Math.max(0, playerHp - dmg);
      logs.push(`${ic} **${n}** tung đòn đặc biệt! **${dmg}** sát thương!`);
  }
  return { playerHp, playerMp, dmg };
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
