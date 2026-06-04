"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFlag = getFlag;
exports.setFlag = setFlag;
exports.setWorldEvent = setWorldEvent;
exports.deleteFlag = deleteFlag;
exports.getAllFlags = getAllFlags;
exports.onBossKilled = onBossKilled;
exports.isBossSlain = isBossSlain;
exports.getDropBonus = getDropBonus;
exports.getShopDiscount = getShopDiscount;
exports.getExpBonus = getExpBonus;
exports.getEnemyAtkBonus = getEnemyAtkBonus;
exports.logEvent = logEvent;
exports.getRecentEvents = getRecentEvents;
exports.getWorldSummary = getWorldSummary;
const index_1 = __importDefault(require("../database/index"));
// ── World flags ───────────────────────────────────────────────────────────
function getFlag(guildId, key) {
    const now = Math.floor(Date.now() / 1000);
    const row = index_1.default.prepare(`
    SELECT flag_value FROM world_state
    WHERE guild_id=? AND flag_key=? AND (expires_at IS NULL OR expires_at > ?)
  `).get(guildId, key, now);
    return row?.flag_value ?? null;
}
function setFlag(guildId, key, value, ttlSeconds) {
    const expiresAt = ttlSeconds ? Math.floor(Date.now() / 1000) + ttlSeconds : null;
    index_1.default.prepare(`
    INSERT OR REPLACE INTO world_state (guild_id, flag_key, flag_value, expires_at)
    VALUES (?, ?, ?, ?)
  `).run(guildId, key, value, expiresAt);
}
function setWorldEvent(guildId, eventKey, description, ttlSeconds) {
    setFlag(guildId, `event_${eventKey}`, description, ttlSeconds);
}
function deleteFlag(guildId, key) {
    index_1.default.prepare('DELETE FROM world_state WHERE guild_id=? AND flag_key=?').run(guildId, key);
}
function getAllFlags(guildId) {
    const now = Math.floor(Date.now() / 1000);
    return index_1.default.prepare(`
    SELECT * FROM world_state
    WHERE guild_id=? AND (expires_at IS NULL OR expires_at > ?)
    ORDER BY created_at DESC
  `).all(guildId, now);
}
// ── Butterfly effect triggers ─────────────────────────────────────────────
function onBossKilled(guildId, bossId, playerName, zoneId) {
    const flagKey = `boss_${bossId}_slain`;
    setFlag(guildId, flagKey, playerName);
    // Each boss death has cascading world consequences
    const consequences = {
        ancient_oak_slain: '🌳 Ancient Oak đã ngã xuống — rừng bị bóng tối lấn chiếm, drop rate tăng 20% trong rừng.',
        shrine_guardian_slain: '⛩️ Shrine Guardian đã bị tiêu diệt — lời nguyền của đền cổ lan ra, enemy ATK +10% toàn server.',
        mine_colossus_slain: '⛏️ Mine Colossus đã sụp đổ — mạch quặng mở ra, giá shop giảm 15% trong 24h.',
        the_forgotten_slain: '❓ The Forgotten đã bị lãng quên — thực tại ổn định, toàn bộ player được +10% EXP trong 48h.'
    };
    // Set mechanic flags
    if (bossId === 'ancient_oak') {
        setFlag(guildId, 'forest_drop_bonus', '20', 86400);
        setWorldEvent(guildId, 'ancient_oak_fall', consequences['ancient_oak_slain'] ?? 'Ancient Oak đã bị tiêu diệt.', 86400);
    }
    if (bossId === 'shrine_guardian') {
        setFlag(guildId, 'global_enemy_atk_up', '10', 86400);
        setWorldEvent(guildId, 'shrine_guardian_curse', consequences['shrine_guardian_slain'] ?? 'Shrine Guardian đã bị tiêu diệt.', 86400);
    }
    if (bossId === 'mine_colossus') {
        setFlag(guildId, 'shop_discount', '15', 86400);
        setWorldEvent(guildId, 'mine_colossus_fall', consequences['mine_colossus_slain'] ?? 'Mine Colossus đã sụp đổ.', 86400);
    }
    if (bossId === 'the_forgotten') {
        setFlag(guildId, 'global_exp_bonus', '10', 172800);
        setWorldEvent(guildId, 'the_forgotten_fall', consequences['the_forgotten_slain'] ?? 'The Forgotten đã bị tiêu diệt.', 172800);
    }
    return consequences[`${bossId}_slain`] ?? `Boss ${bossId} đã bị tiêu diệt.`;
}
function isBossSlain(guildId, bossId) {
    return getFlag(guildId, `boss_${bossId}_slain`) !== null;
}
function getDropBonus(guildId, zoneId) {
    if (zoneId === 'forest' && getFlag(guildId, 'forest_drop_bonus')) {
        return parseInt(getFlag(guildId, 'forest_drop_bonus')) || 0;
    }
    if (getFlag(guildId, 'zone_marked_' + zoneId))
        return 15;
    return 0;
}
function getShopDiscount(guildId) {
    const raw = getFlag(guildId, 'shop_discount');
    return raw ? parseInt(raw) : 0;
}
function getExpBonus(guildId) {
    const raw = getFlag(guildId, 'global_exp_bonus');
    return raw ? parseInt(raw) : 0;
}
function getEnemyAtkBonus(guildId) {
    const raw = getFlag(guildId, 'global_enemy_atk_up');
    return raw ? parseInt(raw) : 0;
}
// ── Event log ─────────────────────────────────────────────────────────────
function logEvent(guildId, userId, playerName, type, description, zoneId) {
    index_1.default.prepare(`
    INSERT INTO event_log (guild_id, user_id, player_name, event_type, description, zone_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(guildId, userId, playerName, type, description, zoneId ?? null);
}
function getRecentEvents(guildId, limit = 10) {
    return index_1.default.prepare(`
    SELECT * FROM event_log WHERE guild_id=? ORDER BY created_at DESC LIMIT ?
  `).all(guildId, limit);
}
function getWorldSummary(guildId) {
    const flags = getAllFlags(guildId);
    const events = getRecentEvents(guildId, 8);
    const bossesSlain = flags
        .filter(f => f.flag_key.endsWith('_slain'))
        .map(f => `${f.flag_key.replace('boss_', '').replace('_slain', '')} — dibunuh oleh **${f.flag_value}**`);
    const activeDebuffs = [];
    const activeBonuses = [];
    if (getFlag(guildId, 'global_enemy_atk_up'))
        activeDebuffs.push('💀 ATK địch +10% toàn server (Shrine Guardian đã ngã)');
    if (getFlag(guildId, 'shop_discount'))
        activeBonuses.push(`🛒 Giảm giá shop ${getShopDiscount(guildId)}% (Mine Colossus đã ngã)`);
    if (getFlag(guildId, 'forest_drop_bonus'))
        activeBonuses.push('🌲 Drop rate +20% tại Rừng Bóng Tối');
    if (getFlag(guildId, 'global_exp_bonus'))
        activeBonuses.push(`⭐ EXP +${getExpBonus(guildId)}% toàn server (The Forgotten đã ngã)`);
    // Check zone marks
    ['forest', 'shrine', 'mines', 'wastes'].forEach(z => {
        if (getFlag(guildId, `zone_marked_${z}`))
            activeBonuses.push(`📍 Drop rate +15% tại zone **${z}**`);
    });
    const activeEvents = flags
        .filter(f => f.flag_key.startsWith('event_'))
        .map(f => `• ${f.flag_value}`);
    return { flags, events, bossesSlain, activeDebuffs, activeBonuses, activeEvents };
}
