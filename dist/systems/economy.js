"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.canExplore = canExplore;
exports.exploreCooldownRemaining = exploreCooldownRemaining;
exports.setExploreCooldown = setExploreCooldown;
exports.getPlayerExploreCooldown = getPlayerExploreCooldown;
const player_1 = require("./player");
const EXPLORE_COOLDOWN_SECONDS = 45;
function canExplore(player) {
    const now = Math.floor(Date.now() / 1000);
    return !(player.last_explore && now - player.last_explore < EXPLORE_COOLDOWN_SECONDS);
}
function exploreCooldownRemaining(player) {
    const now = Math.floor(Date.now() / 1000);
    return Math.max(0, EXPLORE_COOLDOWN_SECONDS - (now - (player.last_explore ?? 0)));
}
function setExploreCooldown(userId, guildId) {
    const now = Math.floor(Date.now() / 1000);
    (0, player_1.updatePlayerLastExplore)(userId, guildId, now);
}
function getPlayerExploreCooldown(userId, guildId) {
    const player = (0, player_1.getPlayer)(userId, guildId);
    return player ? exploreCooldownRemaining(player) : 0;
}
