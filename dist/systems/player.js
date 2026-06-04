"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPlayer = getPlayer;
exports.createPlayer = createPlayer;
exports.resetPlayer = resetPlayer;
exports.applyPassiveStats = applyPassiveStats;
exports.updatePlayerHpMp = updatePlayerHpMp;
exports.updatePlayerLastExplore = updatePlayerLastExplore;
exports.incrementKills = incrementKills;
exports.grantExp = grantExp;
exports.grantGold = grantGold;
exports.spendGold = spendGold;
exports.grantSoulShards = grantSoulShards;
exports.setZone = setZone;
exports.getSkillPool = getSkillPool;
exports.hasSkillInPool = hasSkillInPool;
exports.addSkillToPool = addSkillToPool;
exports.getLoadout = getLoadout;
exports.equipSkill = equipSkill;
exports.unequipSkill = unequipSkill;
exports.getInventory = getInventory;
exports.getItemQty = getItemQty;
exports.addItem = addItem;
exports.removeItem = removeItem;
exports.killPlayer = killPlayer;
const index_1 = __importDefault(require("../database/index"));
const format_1 = require("../utils/format");
const skills_1 = require("../data/skills");
// ── Get / create ─────────────────────────────────────────────────────────
function getPlayer(userId, guildId) {
    return index_1.default.prepare('SELECT * FROM players WHERE user_id = ? AND guild_id = ?')
        .get(userId, guildId);
}
function createPlayer(userId, guildId, name) {
    index_1.default.prepare(`
    INSERT OR REPLACE INTO players
    (user_id, guild_id, name, alive, level, exp, exp_next, hp, max_hp, mp, max_mp, atk, def, gold, soul_shards, zone_id, deaths, kills)
    VALUES (?, ?, ?, 1, 1, 0, 100, 100, 100, 50, 50, 10, 5, 50, 0, 'village', 0, 0)
  `).run(userId, guildId, name);
    return getPlayer(userId, guildId);
}
function resetPlayer(userId, guildId) {
    // Keep soul_shards and deaths count; reset everything else
    index_1.default.prepare(`
    UPDATE players SET
      alive = 1, level = 1, exp = 0, exp_next = 100,
      hp = 100, max_hp = 100, mp = 50, max_mp = 50,
      atk = 10, def = 5, gold = 50, zone_id = 'village', kills = 0
    WHERE user_id = ? AND guild_id = ?
  `).run(userId, guildId);
    // Clear loadout (pool is kept)
    index_1.default.prepare('DELETE FROM skill_loadout WHERE user_id = ? AND guild_id = ?').run(userId, guildId);
    // Clear inventory
    index_1.default.prepare('DELETE FROM inventory WHERE user_id = ? AND guild_id = ?').run(userId, guildId);
}
// ── Stat helpers ──────────────────────────────────────────────────────────
function applyPassiveStats(player) {
    const loadout = getLoadout(player.user_id, player.guild_id);
    let bonusDef = 0, bonusMaxHp = 0, bonusMaxMp = 0;
    for (const entry of loadout) {
        const sk = (0, skills_1.getSkill)(entry.skill_id);
        if (!sk || sk.type !== 'passive' || !sk.passiveBonus)
            continue;
        bonusDef += sk.passiveBonus.def ?? 0;
        bonusMaxHp += sk.passiveBonus.maxHp ?? 0;
        bonusMaxMp += sk.passiveBonus.maxMp ?? 0;
    }
    return {
        ...player,
        def: player.def + bonusDef,
        max_hp: player.max_hp + bonusMaxHp,
        max_mp: player.max_mp + bonusMaxMp,
    };
}
function updatePlayerHpMp(userId, guildId, hp, mp) {
    index_1.default.prepare('UPDATE players SET hp = ?, mp = ? WHERE user_id = ? AND guild_id = ?')
        .run(hp, mp, userId, guildId);
}
function updatePlayerLastExplore(userId, guildId, lastExplore) {
    index_1.default.prepare('UPDATE players SET last_explore = ? WHERE user_id = ? AND guild_id = ?')
        .run(lastExplore, userId, guildId);
}
function incrementKills(userId, guildId) {
    index_1.default.prepare('UPDATE players SET kills = kills + 1 WHERE user_id = ? AND guild_id = ?')
        .run(userId, guildId);
}
function grantExp(userId, guildId, amount) {
    const player = getPlayer(userId, guildId);
    let { level, exp, exp_next, hp, max_hp, mp, max_mp, atk, def } = player;
    exp += amount;
    let leveledUp = false;
    let hpGain = 0, mpGain = 0, atkGain = 0, defGain = 0;
    while (exp >= exp_next) {
        exp -= exp_next;
        level++;
        exp_next = (0, format_1.expNext)(level);
        // Stat gains on level up
        const hg = Math.floor(10 + level * 2);
        const mg = Math.floor(5 + level);
        const ag = Math.floor(2 + level * 0.5);
        const dg = Math.floor(1 + level * 0.3);
        max_hp += hg;
        hp = Math.min(max_hp, hp + hg);
        max_mp += mg;
        mp = Math.min(max_mp, mp + mg);
        atk += ag;
        def += dg;
        hpGain += hg;
        mpGain += mg;
        atkGain += ag;
        defGain += dg;
        leveledUp = true;
    }
    index_1.default.prepare(`
    UPDATE players SET level=?, exp=?, exp_next=?, hp=?, max_hp=?, mp=?, max_mp=?, atk=?, def=?
    WHERE user_id=? AND guild_id=?
  `).run(level, exp, exp_next, hp, max_hp, mp, max_mp, atk, def, userId, guildId);
    return { leveledUp, newLevel: level, hpGain, mpGain, atkGain, defGain };
}
// ── Gold ──────────────────────────────────────────────────────────────────
function grantGold(userId, guildId, amount) {
    index_1.default.prepare('UPDATE players SET gold = gold + ? WHERE user_id = ? AND guild_id = ?')
        .run(amount, userId, guildId);
}
function spendGold(userId, guildId, amount) {
    const player = getPlayer(userId, guildId);
    if (!player || player.gold < amount)
        return false;
    index_1.default.prepare('UPDATE players SET gold = gold - ? WHERE user_id = ? AND guild_id = ?')
        .run(amount, userId, guildId);
    return true;
}
function grantSoulShards(userId, guildId, amount) {
    index_1.default.prepare('UPDATE players SET soul_shards = soul_shards + ? WHERE user_id = ? AND guild_id = ?')
        .run(amount, userId, guildId);
}
// ── Zone ──────────────────────────────────────────────────────────────────
function setZone(userId, guildId, zoneId) {
    index_1.default.prepare('UPDATE players SET zone_id = ? WHERE user_id = ? AND guild_id = ?')
        .run(zoneId, userId, guildId);
}
// ── Skill Pool ────────────────────────────────────────────────────────────
function getSkillPool(userId, guildId) {
    return index_1.default.prepare('SELECT skill_id, learned_at FROM skill_pool WHERE user_id=? AND guild_id=?')
        .all(userId, guildId);
}
function hasSkillInPool(userId, guildId, skillId) {
    const row = index_1.default.prepare('SELECT 1 FROM skill_pool WHERE user_id=? AND guild_id=? AND skill_id=?')
        .get(userId, guildId, skillId);
    return !!row;
}
function addSkillToPool(userId, guildId, skillId) {
    if (hasSkillInPool(userId, guildId, skillId))
        return false;
    index_1.default.prepare('INSERT INTO skill_pool (user_id, guild_id, skill_id) VALUES (?, ?, ?)')
        .run(userId, guildId, skillId);
    return true;
}
// ── Skill Loadout ─────────────────────────────────────────────────────────
function getLoadout(userId, guildId) {
    return index_1.default.prepare('SELECT slot, skill_id FROM skill_loadout WHERE user_id=? AND guild_id=? ORDER BY slot')
        .all(userId, guildId);
}
function equipSkill(userId, guildId, slot, skillId) {
    index_1.default.prepare(`
    INSERT OR REPLACE INTO skill_loadout (user_id, guild_id, slot, skill_id) VALUES (?, ?, ?, ?)
  `).run(userId, guildId, slot, skillId);
}
function unequipSkill(userId, guildId, slot) {
    index_1.default.prepare('DELETE FROM skill_loadout WHERE user_id=? AND guild_id=? AND slot=?')
        .run(userId, guildId, slot);
}
// ── Inventory ─────────────────────────────────────────────────────────────
function getInventory(userId, guildId) {
    return index_1.default.prepare('SELECT item_id, quantity FROM inventory WHERE user_id=? AND guild_id=? ORDER BY item_id')
        .all(userId, guildId);
}
function getItemQty(userId, guildId, itemId) {
    const row = index_1.default.prepare('SELECT quantity FROM inventory WHERE user_id=? AND guild_id=? AND item_id=?')
        .get(userId, guildId, itemId);
    return row?.quantity ?? 0;
}
function addItem(userId, guildId, itemId, qty = 1) {
    index_1.default.prepare(`
    INSERT INTO inventory (user_id, guild_id, item_id, quantity) VALUES (?, ?, ?, ?)
    ON CONFLICT(user_id, guild_id, item_id) DO UPDATE SET quantity = quantity + excluded.quantity
  `).run(userId, guildId, itemId, qty);
}
function removeItem(userId, guildId, itemId, qty = 1) {
    const current = getItemQty(userId, guildId, itemId);
    if (current < qty)
        return false;
    if (current === qty) {
        index_1.default.prepare('DELETE FROM inventory WHERE user_id=? AND guild_id=? AND item_id=?')
            .run(userId, guildId, itemId);
    }
    else {
        index_1.default.prepare('UPDATE inventory SET quantity=quantity-? WHERE user_id=? AND guild_id=? AND item_id=?')
            .run(qty, userId, guildId, itemId);
    }
    return true;
}
// ── Death handling ────────────────────────────────────────────────────────
function killPlayer(userId, guildId) {
    index_1.default.prepare(`
    UPDATE players SET alive=0, deaths=deaths+1
    WHERE user_id=? AND guild_id=?
  `).run(userId, guildId);
}
