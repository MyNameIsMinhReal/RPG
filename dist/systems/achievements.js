"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAchievementsForPlayer = getAchievementsForPlayer;
exports.hasAchievement = hasAchievement;
exports.unlockAchievement = unlockAchievement;
exports.awardAchievements = awardAchievements;
exports.getAchievementSummary = getAchievementSummary;
const index_1 = __importDefault(require("../database/index"));
const player_1 = require("./player");
const player_2 = require("./player");
const ACHIEVEMENTS = [
    {
        id: 'first_blood',
        name: 'First Blood',
        description: 'Giết quái đầu tiên',
        badge: '🩸',
        rewardGold: 100
    },
    {
        id: 'rich_rookie',
        name: 'Rich Rookie',
        description: 'Có 10,000 gold',
        badge: '💰',
        rewardGold: 250
    },
    {
        id: 'unlucky_soul',
        name: 'Unlucky Soul',
        description: 'Chết 5 lần',
        badge: '☠️',
        rewardGold: 50
    },
    {
        id: 'book_collector',
        name: 'Book Collector',
        description: 'Học 10 skill',
        badge: '📚',
        rewardGold: 150
    },
    {
        id: 'boss_hunter',
        name: 'Boss Hunter',
        description: 'Giết 10 boss',
        badge: '👑',
        rewardGold: 500
    },
    {
        id: 'trader',
        name: 'Trader',
        description: 'Trade 20 lần',
        badge: '🤝',
        rewardGold: 200
    }
];
function ensureAchievementTables() {
    index_1.default.exec(`
    CREATE TABLE IF NOT EXISTS player_achievements (
      user_id TEXT NOT NULL,
      guild_id TEXT NOT NULL,
      achievement_id TEXT NOT NULL,
      acquired_at INTEGER DEFAULT (unixepoch()),
      PRIMARY KEY (user_id, guild_id, achievement_id)
    );
  `);
}
ensureAchievementTables();
function getAchievementsForPlayer(userId, guildId) {
    const rows = index_1.default.prepare(`
    SELECT achievement_id, acquired_at FROM player_achievements
    WHERE user_id = ? AND guild_id = ?
  `).all(userId, guildId);
    return ACHIEVEMENTS.map(def => {
        const row = rows.find(r => r.achievement_id === def.id);
        return {
            definition: def,
            acquired_at: row?.acquired_at ?? null,
            unlocked: !!row
        };
    });
}
function hasAchievement(userId, guildId, achievementId) {
    const row = index_1.default.prepare(`
    SELECT 1 FROM player_achievements
    WHERE user_id = ? AND guild_id = ? AND achievement_id = ?
  `).get(userId, guildId, achievementId);
    return !!row;
}
function unlockAchievement(userId, guildId, achievementId) {
    const def = ACHIEVEMENTS.find(a => a.id === achievementId);
    if (!def || hasAchievement(userId, guildId, achievementId))
        return null;
    index_1.default.prepare(`
    INSERT INTO player_achievements (user_id, guild_id, achievement_id) VALUES (?, ?, ?)
  `).run(userId, guildId, achievementId);
    if (def.rewardGold > 0)
        (0, player_2.grantGold)(userId, guildId, def.rewardGold);
    return def;
}
function getSkillBookCount(userId, guildId) {
    const row = index_1.default.prepare(`
    SELECT COUNT(*) AS count FROM skill_pool WHERE user_id = ? AND guild_id = ?
  `).get(userId, guildId);
    return row.count ?? 0;
}
function getEventTypeCount(userId, guildId, eventType) {
    const row = index_1.default.prepare(`
    SELECT COUNT(*) AS count FROM event_log WHERE user_id = ? AND guild_id = ? AND event_type = ?
  `).get(userId, guildId, eventType);
    return row.count ?? 0;
}
function awardAchievements(userId, guildId) {
    const player = (0, player_1.getPlayer)(userId, guildId);
    if (!player)
        return [];
    const unlockedMessages = [];
    const bossKills = getEventTypeCount(userId, guildId, 'boss_kill');
    const tradeCount = getEventTypeCount(userId, guildId, 'trade');
    const skillCount = getSkillBookCount(userId, guildId);
    const checks = [
        ['first_blood', player.kills >= 1],
        ['rich_rookie', player.gold >= 10000],
        ['unlucky_soul', player.deaths >= 5],
        ['book_collector', skillCount >= 10],
        ['boss_hunter', bossKills >= 10],
        ['trader', tradeCount >= 20]
    ];
    for (const [id, condition] of checks) {
        if (!condition)
            continue;
        const def = unlockAchievement(userId, guildId, id);
        if (def) {
            unlockedMessages.push(`${def.badge} **${def.name}** — ${def.description} (+${def.rewardGold} 🪙)`);
        }
    }
    return unlockedMessages;
}
function getAchievementSummary(userId, guildId) {
    const status = getAchievementsForPlayer(userId, guildId);
    const unlocked = status.filter(s => s.unlocked).length;
    return { unlocked, total: status.length };
}
