"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processVictoryRewards = processVictoryRewards;
exports.processDeathPenalty = processDeathPenalty;
const player_1 = require("./player");
const legacy_1 = require("./legacy");
const world_1 = require("./world");
const items_1 = require("../data/items");
const format_1 = require("../utils/format");
function processVictoryRewards(userId, guildId, player, enemy) {
    const dropBonus = (0, world_1.getDropBonus)(guildId, player.zone_id);
    const gold = (0, format_1.randInt)(enemy.goldMin, enemy.goldMax);
    const exp = enemy.expReward;
    const drops = [];
    (0, player_1.grantGold)(userId, guildId, gold);
    (0, player_1.incrementKills)(userId, guildId);
    const lvRes = (0, player_1.grantExp)(userId, guildId, exp);
    for (const drop of enemy.drops) {
        if (Math.random() * 100 <= drop.chance + Math.floor(drop.chance * dropBonus / 100)) {
            (0, player_1.addItem)(userId, guildId, drop.itemId, 1);
            const it = (0, items_1.getItem)(drop.itemId);
            if (it)
                drops.push(`${it.icon} ${it.name}`);
        }
    }
    let bonusLine = '';
    if (enemy.boss && enemy.deathWorldFlag) {
        bonusLine = '\n\n' + (0, world_1.onBossKilled)(guildId, enemy.id, player.name, player.zone_id);
        (0, world_1.logEvent)(guildId, userId, player.name, 'boss_kill', `tiêu diệt Boss **${enemy.icon} ${enemy.name}**!`, player.zone_id);
    }
    else {
        (0, world_1.logEvent)(guildId, userId, player.name, 'kill', `tiêu diệt **${enemy.icon} ${enemy.name}**.`, player.zone_id);
    }
    return {
        gold,
        exp,
        drops,
        leveledUp: lvRes.leveledUp,
        newLevel: lvRes.newLevel,
        bonusDescription: bonusLine
    };
}
function processDeathPenalty(userId, guildId, player, enemy) {
    const goldLeft = player.gold;
    const legacySkill = (0, legacy_1.pickLegacySkill)(userId, guildId);
    (0, legacy_1.createLegacy)(guildId, userId, player.name, player.zone_id, goldLeft, player.deaths + 1, legacySkill);
    (0, world_1.logEvent)(guildId, userId, player.name, 'death', `bị **${enemy.icon} ${enemy.name}** tiêu diệt. Di sản tại ${player.zone_id}.`, player.zone_id);
    (0, player_1.killPlayer)(userId, guildId);
    const shards = Math.max(1, Math.floor(player.level / 2));
    (0, player_1.grantSoulShards)(userId, guildId, shards);
    return { shards, goldLeft };
}
