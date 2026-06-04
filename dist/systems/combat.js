"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCombat = getCombat;
exports.getCombatByUser = getCombatByUser;
exports.deleteCombat = deleteCombat;
exports.saveCombat = saveCombat;
exports.startCombat = startCombat;
exports.parseEffects = parseEffects;
exports.hasEffect = hasEffect;
exports.tickEffects = tickEffects;
exports.addEffect = addEffect;
exports.processAttack = processAttack;
exports.processSkill = processSkill;
exports.processDefend = processDefend;
exports.processFlee = processFlee;
const index_1 = __importDefault(require("../database/index"));
const format_1 = require("../utils/format");
const skills_1 = require("../data/skills");
const enemies_1 = require("../data/enemies");
const player_1 = require("./player");
// ── Combat CRUD ───────────────────────────────────────────────────────────
function getCombat(messageId) {
    return index_1.default.prepare('SELECT * FROM active_combats WHERE message_id = ?')
        .get(messageId);
}
function getCombatByUser(userId, guildId) {
    return index_1.default.prepare('SELECT * FROM active_combats WHERE user_id = ? AND guild_id = ?')
        .get(userId, guildId);
}
function deleteCombat(messageId) {
    index_1.default.prepare('DELETE FROM active_combats WHERE message_id = ?').run(messageId);
}
function saveCombat(state) {
    index_1.default.prepare(`
    INSERT OR REPLACE INTO active_combats
    (message_id, channel_id, user_id, guild_id, enemy_id, enemy_name,
     enemy_hp, enemy_max_hp, enemy_atk, enemy_def,
     player_hp, player_max_hp, player_mp, player_max_mp,
     turn, is_defending, active_effects, combat_log)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(state.message_id, state.channel_id, state.user_id, state.guild_id, state.enemy_id, state.enemy_name, state.enemy_hp, state.enemy_max_hp, state.enemy_atk, state.enemy_def, state.player_hp, state.player_max_hp, state.player_mp, state.player_max_mp, state.turn, state.is_defending, state.active_effects, state.combat_log);
}
function startCombat(messageId, channelId, player, guildId, enemy) {
    const boosted = (0, player_1.applyPassiveStats)(player);
    const state = {
        message_id: messageId, channel_id: channelId,
        user_id: player.user_id, guild_id: guildId,
        enemy_id: enemy.id, enemy_name: enemy.name,
        enemy_hp: enemy.hp, enemy_max_hp: enemy.hp,
        enemy_atk: enemy.atk, enemy_def: enemy.def,
        player_hp: boosted.hp, player_max_hp: boosted.max_hp,
        player_mp: boosted.mp, player_max_mp: boosted.max_mp,
        turn: 1, is_defending: 0,
        active_effects: '[]', combat_log: '[]'
    };
    saveCombat(state);
    return state;
}
// ── Effect helpers ────────────────────────────────────────────────────────
function parseEffects(raw) {
    try {
        return JSON.parse(raw);
    }
    catch {
        return [];
    }
}
function hasEffect(effects, name) {
    return effects.some(e => e.name === name && e.duration > 0);
}
function tickEffects(effects) {
    let burnDmg = 0, hpRegen = 0, mpRegen = 0;
    const next = effects
        .map(e => {
        if (e.name === 'burn')
            burnDmg += e.value ?? 5;
        if (e.name === 'hp_regen')
            hpRegen += e.value ?? 3;
        if (e.name === 'mp_regen')
            mpRegen += e.value ?? 2;
        return { ...e, duration: e.duration - 1 };
    })
        .filter(e => e.duration > 0);
    return { effects: next, burnDmg, hpRegen, mpRegen };
}
function addEffect(effects, name, duration, value) {
    const existing = effects.findIndex(e => e.name === name);
    if (existing >= 0) {
        effects[existing].duration = Math.max(effects[existing].duration, duration);
    }
    else {
        effects.push({ name, duration, value });
    }
    return effects;
}
// ── Damage calculation ─────────────────────────────────────────────────────
function calcDamage(atk, def, variance = 0.15) {
    const base = Math.max(1, atk - def);
    const v = base * variance;
    return Math.max(1, Math.round(base + (0, format_1.randInt)(-v, v)));
}
function processAttack(state, playerAtk) {
    const effects = parseEffects(state.active_effects);
    const logs = JSON.parse(state.combat_log || '[]');
    let { player_hp, player_mp, enemy_hp } = state;
    let playerDied = false, enemyDied = false, fled = false;
    const isDefending = state.is_defending === 1;
    let defendBonus = 0;
    if (isDefending) {
        defendBonus = Math.floor(state.enemy_atk * 0.4);
        logs.push(`🛡️ Bạn đang phòng thủ (+${defendBonus} DEF tạm thời).`);
    }
    // Berserker passive only applies if the player has the skill equipped
    const loadout = (0, player_1.getLoadout)(state.user_id, state.guild_id);
    const hasBerserker = loadout.some(l => l.skill_id === 'berserker');
    let effectiveAtk = playerAtk;
    if (hasBerserker && player_hp / state.player_max_hp < 0.3) {
        effectiveAtk = Math.floor(effectiveAtk * 1.2);
        logs.push('😤 **Berserker** kích hoạt! ATK tăng 20% vì HP thấp.');
    }
    // Dodge check
    if (hasEffect(effects, 'dodge')) {
        const idx = effects.findIndex(e => e.name === 'dodge');
        effects.splice(idx, 1);
        logs.push(`🌑 Shadow Step! Bạn né đòn tấn công của địch.`);
    }
    // Vampire lifesteal
    const dmg = calcDamage(effectiveAtk, state.enemy_def);
    enemy_hp = Math.max(0, enemy_hp - dmg);
    logs.push(`⚔️ Bạn tấn công gây **${dmg}** sát thương. (${enemy_hp}/${state.enemy_max_hp} HP còn lại)`);
    if (enemy_hp <= 0) {
        enemyDied = true;
        return {
            newState: { ...state, enemy_hp, active_effects: JSON.stringify(effects), combat_log: JSON.stringify(logs.slice(-6)) },
            logLines: logs, playerDied: false, enemyDied: true, fled: false
        };
    }
    // Enemy turn
    const result = enemyTurn(state, { ...state, enemy_hp, active_effects: JSON.stringify(effects) }, player_hp, player_mp, effects, logs, defendBonus);
    return result;
}
function processSkill(state, skillId, playerAtk, hpRegenPerTurn, mpRegenPerTurn) {
    const skill = (0, skills_1.getSkill)(skillId);
    if (!skill)
        return processAttack(state, playerAtk);
    const effects = parseEffects(state.active_effects);
    const logs = JSON.parse(state.combat_log || '[]');
    let { player_hp, player_mp, enemy_hp } = state;
    if (skill.mpCost && player_mp < skill.mpCost) {
        logs.push(`❌ Không đủ MP để dùng **${skill.name}**!`);
        return {
            newState: { ...state, combat_log: JSON.stringify(logs.slice(-6)) },
            logLines: logs, playerDied: false, enemyDied: false, fled: false
        };
    }
    player_mp -= skill.mpCost ?? 0;
    if (skill.damage) {
        let dmg = skill.damage;
        const finalDmg = Math.max(1, Math.round(dmg - state.enemy_def * 0.5)); // skills pierce some DEF
        enemy_hp = Math.max(0, enemy_hp - finalDmg);
        logs.push(`${skill.icon} **${skill.name}**! Gây **${finalDmg}** sát thương.`);
        if (skill.effect && skill.effectDuration) {
            addEffect(effects, skill.effect, skill.effectDuration, skill.effect === 'burn' ? 5 : undefined);
            const effectNames = {
                burn: '🔥 Đốt cháy', slow: '🧊 Làm chậm', stun: '💫 Choáng', dodge: '🌑 Dodge'
            };
            logs.push(`  └ ${effectNames[skill.effect] ?? skill.effect} x${skill.effectDuration} lượt.`);
        }
    }
    if (skill.heal) {
        const healed = Math.min(skill.heal, state.player_max_hp - player_hp);
        player_hp = Math.min(state.player_max_hp, player_hp + skill.heal);
        logs.push(`${skill.icon} **${skill.name}**! Hồi **${healed} HP**. (${player_hp}/${state.player_max_hp})`);
    }
    if (enemy_hp <= 0) {
        return {
            newState: { ...state, player_hp, player_mp, enemy_hp, active_effects: JSON.stringify(effects), combat_log: JSON.stringify(logs.slice(-6)) },
            logLines: logs, playerDied: false, enemyDied: true, fled: false
        };
    }
    // Enemy turn
    const midState = { ...state, player_hp, player_mp, enemy_hp, active_effects: JSON.stringify(effects) };
    return enemyTurn(state, midState, player_hp, player_mp, effects, logs, 0);
}
function processDefend(state, playerAtk, hpRegen, mpRegen) {
    const effects = parseEffects(state.active_effects);
    const logs = JSON.parse(state.combat_log || '[]');
    logs.push(`🛡️ Bạn chọn **Phòng thủ** — giảm 40% sát thương nhận vào lượt này.`);
    const defended = { ...state, is_defending: 1 };
    return enemyTurn(state, defended, state.player_hp, state.player_mp, effects, logs, Math.floor(state.enemy_atk * 0.4));
}
function processFlee(state) {
    const logs = JSON.parse(state.combat_log || '[]');
    const chance = 60;
    if ((0, format_1.randInt)(1, 100) <= chance) {
        logs.push(`🏃 Bạn **bỏ chạy** thành công!`);
        return { newState: state, logLines: logs, playerDied: false, enemyDied: false, fled: true };
    }
    logs.push(`🏃 Cố bỏ chạy nhưng thất bại!`);
    const effects = parseEffects(state.active_effects);
    return enemyTurn(state, state, state.player_hp, state.player_mp, effects, logs, 0);
}
// ── Enemy AI ──────────────────────────────────────────────────────────────
function enemyTurn(original, current, playerHp, playerMp, effects, logs, defenseBonus) {
    const enemy = (0, enemies_1.getEnemy)(current.enemy_id);
    // Check stun
    if (hasEffect(effects, 'stun')) {
        logs.push(`💫 **${enemy.name}** bị choáng — bỏ qua lượt!`);
        const nextEffects = effects.map(e => e.name === 'stun' ? { ...e, duration: e.duration - 1 } : e).filter(e => e.duration > 0);
        const ticked = tickEffects(nextEffects);
        playerHp = Math.min(current.player_max_hp, playerHp - ticked.burnDmg + ticked.hpRegen);
        playerMp = Math.min(current.player_max_mp, playerMp + ticked.mpRegen);
        return makeResult(original, current, playerHp, playerMp, ticked.effects, logs, false, false, false);
    }
    // Check slow (-5 ATK)
    const slowActive = hasEffect(effects, 'slow');
    let enemyAtk = current.enemy_atk;
    if (slowActive)
        enemyAtk = Math.max(1, enemyAtk - 5);
    // AI: 30% chance to use special if available, more aggressive if low HP
    const hpPct = current.enemy_hp / current.enemy_max_hp;
    const useSpecial = (hpPct < 0.3 && (0, format_1.randInt)(1, 100) <= 60) || (0, format_1.randInt)(1, 100) <= 30;
    const special = useSpecial && enemy.specialAttacks.length > 0 ? (0, format_1.pick)(enemy.specialAttacks) : null;
    let dmg = 0;
    if (special) {
        const result = applySpecialAttack(special, enemyAtk, enemy.name, playerHp, playerMp, logs);
        playerHp = result.playerHp;
        playerMp = result.playerMp;
        dmg = result.dmg;
    }
    else {
        dmg = Math.max(1, calcDamage(enemyAtk, defenseBonus));
        // Counter reaction
        // (handled passively — counter skill fires on hit, 40% chance)
        playerHp = Math.max(0, playerHp - dmg);
        logs.push(`${enemy.icon} **${enemy.name}** tấn công gây **${dmg}** sát thương. (${playerHp}/${current.player_max_hp} HP còn lại)`);
    }
    // Tick end-of-turn effects
    const ticked = tickEffects(effects);
    if (ticked.burnDmg > 0) {
        playerHp = Math.max(0, playerHp - ticked.burnDmg);
        logs.push(`🔥 Đốt cháy gây **${ticked.burnDmg}** sát thương theo thời gian.`);
    }
    if (ticked.hpRegen > 0) {
        playerHp = Math.min(current.player_max_hp, playerHp + ticked.hpRegen);
        logs.push(`💚 Hồi phục **${ticked.hpRegen} HP** từ tái sinh.`);
    }
    if (ticked.mpRegen > 0) {
        playerMp = Math.min(current.player_max_mp, playerMp + ticked.mpRegen);
    }
    const playerDied = playerHp <= 0;
    return makeResult(original, current, playerHp, playerMp, ticked.effects, logs, playerDied, false, false);
}
function applySpecialAttack(special, baseAtk, enemyName, playerHp, playerMp, logs) {
    let dmg = 0;
    switch (special) {
        case 'double_bite':
            dmg = Math.max(1, calcDamage(baseAtk * 0.6, 0)) * 2;
            playerHp = Math.max(0, playerHp - dmg);
            logs.push(`🐺 **${enemyName}** cắn **hai lần**! Tổng **${dmg}** sát thương!`);
            break;
        case 'drain_mp':
            const mpDrain = Math.min(playerMp, 15);
            playerMp -= mpDrain;
            logs.push(`👻 **${enemyName}** hút **${mpDrain} MP** của bạn!`);
            break;
        case 'petal_storm':
            dmg = Math.max(1, calcDamage(baseAtk * 0.8, 0));
            playerHp = Math.max(0, playerHp - dmg);
            logs.push(`🧚 **${enemyName}** tung **Petal Storm**! ${dmg} sát thương!`);
            break;
        case 'root_slam':
            dmg = Math.max(1, calcDamage(baseAtk * 1.5, 0));
            playerHp = Math.max(0, playerHp - dmg);
            logs.push(`🌳 **${enemyName}** đập rễ cây cực mạnh! **${dmg}** sát thương!`);
            break;
        case 'nature_regeneration':
            logs.push(`🌳 **${enemyName}** hồi phục sinh lực từ đất!`);
            // Handled in enemy HP update in combat
            break;
        case 'divine_judgment':
            dmg = Math.max(1, calcDamage(baseAtk * 1.4, 0));
            playerHp = Math.max(0, playerHp - dmg);
            logs.push(`⛩️ **${enemyName}** tung **Divine Judgment**! **${dmg}** sát thương!`);
            break;
        case 'cave_in':
            dmg = Math.max(1, calcDamage(baseAtk * 1.2, 0));
            playerHp = Math.max(0, playerHp - dmg);
            logs.push(`👹 **${enemyName}** gây sạt lở hang động! **${dmg}** sát thương!`);
            break;
        case 'blood_drain':
            dmg = Math.max(1, calcDamage(baseAtk * 0.9, 0));
            playerHp = Math.max(0, playerHp - dmg);
            logs.push(`🦇 **${enemyName}** hút máu! **${dmg}** sát thương và hồi phục HP!`);
            break;
        case 'void_drain':
            dmg = Math.max(1, calcDamage(baseAtk * 0.7, 0));
            const mpD = Math.min(playerMp, 20);
            playerHp = Math.max(0, playerHp - dmg);
            playerMp -= mpD;
            logs.push(`🌀 **${enemyName}** dùng **Void Drain**! −${dmg} HP, −${mpD} MP!`);
            break;
        case 'erase':
            dmg = Math.max(1, calcDamage(baseAtk * 2.0, 0));
            playerHp = Math.max(0, playerHp - dmg);
            logs.push(`❓ **${enemyName}** cố xóa sổ bạn khỏi sự tồn tại! **${dmg}** sát thương khổng lồ!`);
            break;
        case 'butterfly_curse':
            dmg = Math.max(1, calcDamage(baseAtk * 0.8, 0));
            playerHp = Math.max(0, playerHp - dmg);
            logs.push(`🦋 **${enemyName}** tung **Butterfly Curse** — mỗi đòn đánh có hệ quả!`);
            break;
        default:
            dmg = Math.max(1, calcDamage(baseAtk * 1.1, 0));
            playerHp = Math.max(0, playerHp - dmg);
            logs.push(`✨ **${enemyName}** dùng đòn đặc biệt! **${dmg}** sát thương!`);
    }
    return { playerHp, playerMp, dmg };
}
function makeResult(_original, current, playerHp, playerMp, effects, logs, playerDied, enemyDied, fled) {
    const newState = {
        ...current,
        player_hp: playerHp, player_mp: playerMp,
        turn: current.turn + 1, is_defending: 0,
        active_effects: JSON.stringify(effects),
        combat_log: JSON.stringify(logs.slice(-6))
    };
    return { newState, logLines: logs, playerDied, enemyDied, fled };
}
