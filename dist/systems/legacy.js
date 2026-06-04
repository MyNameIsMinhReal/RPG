"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLegacy = createLegacy;
exports.getLegaciesInZone = getLegaciesInZone;
exports.getLegacy = getLegacy;
exports.claimLegacy = claimLegacy;
exports.pickLegacySkill = pickLegacySkill;
exports.getPlayerLegacies = getPlayerLegacies;
const index_1 = __importDefault(require("../database/index"));
const format_1 = require("../utils/format");
// ── Create legacy on death ────────────────────────────────────────────────
function createLegacy(guildId, userId, playerName, zoneId, goldLeft, deaths, legacySkillId) {
    index_1.default.prepare(`
    INSERT INTO legacies (guild_id, user_id, player_name, zone_id, legacy_skill_id, gold_left, deaths)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(guildId, userId, playerName, zoneId, legacySkillId ?? null, goldLeft, deaths);
}
// ── Query legacies ────────────────────────────────────────────────────────
function getLegaciesInZone(guildId, zoneId, limit = 5) {
    return index_1.default.prepare(`
    SELECT * FROM legacies
    WHERE guild_id=? AND zone_id=? AND claimed_by IS NULL
    ORDER BY created_at DESC LIMIT ?
  `).all(guildId, zoneId, limit);
}
function getLegacy(id) {
    return index_1.default.prepare('SELECT * FROM legacies WHERE id=?').get(id);
}
function claimLegacy(legacyId, claimerUserId) {
    index_1.default.prepare('UPDATE legacies SET claimed_by=? WHERE id=?').run(claimerUserId, legacyId);
}
// ── Determine legacy skill (random from loadout) ──────────────────────────
function pickLegacySkill(userId, guildId) {
    const loadout = index_1.default.prepare('SELECT skill_id FROM skill_loadout WHERE user_id=? AND guild_id=?').all(userId, guildId);
    if (!loadout.length)
        return undefined;
    return loadout[(0, format_1.randInt)(0, loadout.length - 1)].skill_id;
}
// ── Get player's own past legacies ────────────────────────────────────────
function getPlayerLegacies(userId, guildId) {
    return index_1.default.prepare(`
    SELECT * FROM legacies WHERE user_id=? AND guild_id=? ORDER BY created_at DESC LIMIT 10
  `).all(userId, guildId);
}
