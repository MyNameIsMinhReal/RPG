import db from '../database/index';
import { getPlayer } from './player';
import { grantGold } from './player';
import { getTitleByAchievement, unlockTitle } from './titles';
import type { PlayerRow } from '../utils/embeds';

export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  badge: string;
  rewardGold: number;
}

export interface AchievementStatus {
  definition: AchievementDef;
  acquired_at: number | null;
  unlocked: boolean;
}

const ACHIEVEMENTS: AchievementDef[] = [
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
  },
  {
    id: 'no_turning_back',
    name: 'Không Còn Đường Lui',
    description: 'Giết shopkeeper lần đầu',
    badge: '🗡️',
    rewardGold: 150
  },
  {
    id: 'merchant_nightmare',
    name: 'Ác Mộng Của Thương Nhân',
    description: 'Cướp 3 shopkeeper',
    badge: '🏦',
    rewardGold: 300
  },
  {
    id: 'friend_of_villagers',
    name: 'Người Hùng Của Dân Làng',
    description: 'Đạt Reputation +100',
    badge: '🌿',
    rewardGold: 300
  },
  {
    id: 'walking_disaster',
    name: 'Tai Họa Biết Đi',
    description: 'Đạt Reputation -100',
    badge: '🌑',
    rewardGold: 100
  },
  {
    id: 'first_awakening',
    name: 'Awakened Path',
    description: 'Awaken class lần đầu',
    badge: '✨',
    rewardGold: 300
  },
  {
    id: 'oakbreaker',
    name: 'Oakbreaker',
    description: 'Hạ Ancient Oak lần đầu',
    badge: '🌳',
    rewardGold: 400
  },
  {
    id: 'party_raider',
    name: 'Party Raider',
    description: 'Hạ boss cùng party lần đầu',
    badge: '⚔️',
    rewardGold: 350
  },
  {
    id: 'trusted_by_village',
    name: 'Trusted by Ashveil',
    description: 'Đạt Villagers reputation +50',
    badge: '🏘️',
    rewardGold: 250
  },
  {
    id: 'familiar_with_death',
    name: 'Kẻ Quen Mặt Với Tử Thần',
    description: 'Chết 10 lần',
    badge: '💀',
    rewardGold: 100
  },

  {
    id: 'shrine_echo_silence',
    name: 'Không Trả Lời Tiếng Vọng',
    description: 'Hoàn thành Lọc Tiếng Vọng 3 lần hoàn hảo',
    badge: '👁️',
    rewardGold: 180
  },
  {
    id: 'shrine_salt_warder',
    name: 'Kẻ Vá Phong Ấn',
    description: 'Hoàn thành Vòng Muối Đứt Đoạn 5 lần',
    badge: '🧂',
    rewardGold: 220
  },
  {
    id: 'shrine_no_shadow',
    name: 'Người Không Có Bóng',
    description: 'Đánh bại Mirror Shade sau khi chạm tới nghi lễ gương',
    badge: '🪞',
    rewardGold: 260
  },
  {
    id: 'shrine_gate_opener',
    name: 'Kẻ Mở Cổng',
    description: 'Hoàn thành nghi lễ mở Cổng Phong Ấn Echo Demon lần đầu',
    badge: '⛩️',
    rewardGold: 320
  },
];

function ensureAchievementTables(): void {
  db.exec(`
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

export function getAchievementsForPlayer(userId: string, guildId: string): AchievementStatus[] {
  const rows = db.prepare(`
    SELECT achievement_id, acquired_at FROM player_achievements
    WHERE user_id = ? AND guild_id = ?
  `).all(userId, guildId) as Array<{ achievement_id: string; acquired_at: number }>;

  return ACHIEVEMENTS.map(def => {
    const row = rows.find(r => r.achievement_id === def.id);
    return {
      definition: def,
      acquired_at: row?.acquired_at ?? null,
      unlocked: !!row
    };
  });
}

export function hasAchievement(userId: string, guildId: string, achievementId: string): boolean {
  const row = db.prepare(`
    SELECT 1 FROM player_achievements
    WHERE user_id = ? AND guild_id = ? AND achievement_id = ?
  `).get(userId, guildId, achievementId) as unknown as { '1': number } | undefined;
  return !!row;
}

export function unlockAchievement(userId: string, guildId: string, achievementId: string): AchievementDef | null {
  const def = ACHIEVEMENTS.find(a => a.id === achievementId);
  if (!def || hasAchievement(userId, guildId, achievementId)) return null;
  db.prepare(`
    INSERT INTO player_achievements (user_id, guild_id, achievement_id) VALUES (?, ?, ?)
  `).run(userId, guildId, achievementId);
  if (def.rewardGold > 0) grantGold(userId, guildId, def.rewardGold);
  // Unlock associated title
  const title = getTitleByAchievement(achievementId);
  if (title) unlockTitle(userId, guildId, title.id);
  return def;
}

function getSkillBookCount(userId: string, guildId: string): number {
  const row = db.prepare(`
    SELECT COUNT(*) AS count FROM skill_pool WHERE user_id = ? AND guild_id = ?
  `).get(userId, guildId) as { count: number };
  return row.count ?? 0;
}

function getEventTypeCount(userId: string, guildId: string, eventType: string): number {
  const row = db.prepare(`
    SELECT COUNT(*) AS count FROM event_log WHERE user_id = ? AND guild_id = ? AND event_type = ?
  `).get(userId, guildId, eventType) as { count: number };
  return row.count ?? 0;
}

export function awardAchievements(userId: string, guildId: string): string[] {
  const player = getPlayer(userId, guildId);
  if (!player) return [];

  const unlockedMessages: string[] = [];
  const bossKills = getEventTypeCount(userId, guildId, 'boss_kill');
  const tradeCount = getEventTypeCount(userId, guildId, 'trade');
  const shopkeeperKills = getEventTypeCount(userId, guildId, 'shopkeeper_robbery');
  const skillCount = getSkillBookCount(userId, guildId);
  const oakKills = db.prepare(`SELECT COUNT(*) AS count FROM event_log WHERE user_id=? AND guild_id=? AND (description LIKE '%Ancient Oak%' OR description LIKE '%Cổ Mộc%')`).get(userId, guildId) as { count: number };
  const partyBossKills = db.prepare(`SELECT COUNT(*) AS count FROM event_log WHERE user_id=? AND guild_id=? AND event_type='boss_kill' AND description LIKE '%party%'`).get(userId, guildId) as { count: number };
  const villagerFaction = db.prepare(`SELECT reputation FROM player_factions WHERE user_id=? AND guild_id=? AND faction_id='villagers'`).get(userId, guildId) as { reputation: number } | undefined;

  const checks: Array<[string, boolean]> = [
    ['first_blood', player.kills >= 1],
    ['rich_rookie', player.gold >= 10000],
    ['unlucky_soul', player.deaths >= 5],
    ['book_collector', skillCount >= 10],
    ['boss_hunter', bossKills >= 10],
    ['trader', tradeCount >= 20],
    ['no_turning_back', shopkeeperKills >= 1],
    ['merchant_nightmare', shopkeeperKills >= 3],
    ['friend_of_villagers', (player.reputation ?? 0) >= 100],
    ['walking_disaster', (player.reputation ?? 0) <= -100],
    ['familiar_with_death', player.deaths >= 10],
    ['first_awakening', !!(player.class && ['knight','arcanist','shadowblade','warden','oracle','crusader','bloodreaver'].includes(player.class))],
    ['oakbreaker', (oakKills?.count ?? 0) >= 1],
    ['party_raider', (partyBossKills?.count ?? 0) >= 1],
    ['trusted_by_village', (villagerFaction?.reputation ?? 0) >= 50]
  ];

  for (const [id, condition] of checks) {
    if (!condition) continue;
    const def = unlockAchievement(userId, guildId, id);
    if (def) {
      unlockedMessages.push(`${def.badge} **${def.name}** — ${def.description} (+${def.rewardGold} 🪙)`);
    }
  }

  return unlockedMessages;
}

export function getAchievementSummary(userId: string, guildId: string): { unlocked: number; total: number } {
  const status = getAchievementsForPlayer(userId, guildId);
  const unlocked = status.filter(s => s.unlocked).length;
  return { unlocked, total: status.length };
}
