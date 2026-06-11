import db from '../database/index';

export interface TitleDef {
  id: string;
  name: string;
  icon: string;
  description: string;
  fromAchievement: string; // achievement id that unlocks this
}

export const TITLES: TitleDef[] = [
  {
    id: 'first_hunter',
    name: 'The First Hunter',
    icon: '🩸',
    description: 'Thợ săn đầu tiên bước ra từ làng.',
    fromAchievement: 'first_blood'
  },
  {
    id: 'gold_hoarder',
    name: 'Gold Hoarder',
    icon: '💰',
    description: 'Kẻ tích trữ vàng không biết mệt mỏi.',
    fromAchievement: 'rich_rookie'
  },
  {
    id: 'the_cursed',
    name: 'The Cursed One',
    icon: '☠️',
    description: 'Vận may chưa bao giờ đứng về phía họ.',
    fromAchievement: 'unlucky_soul'
  },
  {
    id: 'scholar',
    name: 'Scholar of Secrets',
    icon: '📚',
    description: 'Đã khám phá bí ẩn của nhiều kỹ thuật cổ xưa.',
    fromAchievement: 'book_collector'
  },
  {
    id: 'boss_slayer',
    name: 'Boss Slayer',
    icon: '👑',
    description: 'Khiến nhiều kẻ mạnh phải quỳ gối.',
    fromAchievement: 'boss_hunter'
  },
  {
    id: 'pathfinder', name: 'Pathfinder', icon: '🧭',
    description: 'Người mở đường qua Rừng Đen.', fromAchievement: 'chapter_1'
  },
  {
    id: 'ruin_seeker', name: 'Ruin Seeker', icon: '⛩️',
    description: 'Kẻ tìm kiếm bí mật trong đền cổ.', fromAchievement: 'chapter_2'
  },
  {
    id: 'mine_lord', name: 'Mine Lord', icon: '⛏️',
    description: 'Người sống sót trước lời nguyền hầm mỏ.', fromAchievement: 'chapter_3'
  },
  {
    id: 'world_ender', name: 'World Ender', icon: '🌌',
    description: 'Người đã bước qua tiếng vọng cuối cùng.', fromAchievement: 'chapter_4'
  },
  {
    id: 'awakened_one', name: 'Awakened One', icon: '✨',
    description: 'Đã đánh thức con đường class đầu tiên.', fromAchievement: 'first_awakening'
  },
  {
    id: 'oakbreaker', name: 'Oakbreaker', icon: '🌳',
    description: 'Đã hạ Ancient Oak.', fromAchievement: 'oakbreaker'
  },
  {
    id: 'party_raider', name: 'Party Raider', icon: '⚔️',
    description: 'Đã hạ boss cùng party.', fromAchievement: 'party_raider'
  },
  {
    id: 'village_trusted', name: 'Trusted of Ashveil', icon: '🏘️',
    description: 'Được dân làng Ashveil tin tưởng.', fromAchievement: 'trusted_by_village'
  },
  {
    id: 'road_broker', name: 'Road Broker', icon: '🚚',
    description: 'Đã nối lại một tuyến hàng nguy hiểm.', fromAchievement: 'chain_merchant_road'
  },
  {
    id: 'oak_sworn', name: 'Oak-Sworn', icon: '🌲',
    description: 'Đã lập lời thề với khu rừng.', fromAchievement: 'chain_forest_oath'
  },
  {
    id: 'shadow_debtor', name: 'Shadow Debtor', icon: '🌑',
    description: 'Mang một món nợ không thể gọi tên.', fromAchievement: 'chain_shadow_debt'
  },
  {
    id: 'merchant_prince',
    name: 'Merchant Prince',
    icon: '🤝',
    description: 'Thương nhân điêu luyện của thế giới ngầm.',
    fromAchievement: 'trader'
  }
  ,
  { id: 'echo_silent', name: 'Echo-Silent', icon: '👁️', description: 'Không trả lời tiếng vọng gọi tên mình.', fromAchievement: 'shrine_echo_silence' },
  { id: 'salt_warder', name: 'Salt Warder', icon: '🧂', description: 'Người biết vá lại vòng phong ấn.', fromAchievement: 'shrine_salt_warder' },
  { id: 'no_shadow', name: 'No Shadow', icon: '🪞', description: 'Kẻ không để gương giữ bóng của mình.', fromAchievement: 'shrine_no_shadow' },
  { id: 'gate_opener', name: 'Gate Opener', icon: '⛩️', description: 'Người đã mở Cổng Phong Ấn Echo Demon.', fromAchievement: 'shrine_gate_opener' }
];

export function getTitleByAchievement(achievementId: string): TitleDef | undefined {
  return TITLES.find(t => t.fromAchievement === achievementId);
}

export function getUnlockedTitles(userId: string, guildId: string): TitleDef[] {
  const rows = db.prepare('SELECT title_id FROM player_titles WHERE user_id=? AND guild_id=?')
    .all(userId, guildId) as unknown as Array<{ title_id: string }>;
  const ids = new Set(rows.map(r => r.title_id));
  return TITLES.filter(t => ids.has(t.id));
}

export function unlockTitle(userId: string, guildId: string, titleId: string): boolean {
  const exists = db.prepare('SELECT 1 FROM player_titles WHERE user_id=? AND guild_id=? AND title_id=?')
    .get(userId, guildId, titleId);
  if (exists) return false;
  db.prepare('INSERT INTO player_titles (user_id, guild_id, title_id) VALUES (?, ?, ?)')
    .run(userId, guildId, titleId);
  return true;
}

export function getSelectedTitle(userId: string, guildId: string): TitleDef | null {
  const row = db.prepare('SELECT selected_title FROM players WHERE user_id=? AND guild_id=?')
    .get(userId, guildId) as unknown as { selected_title: string | null } | undefined;
  if (!row?.selected_title) return null;
  return TITLES.find(t => t.id === row.selected_title) ?? null;
}

export function selectTitle(userId: string, guildId: string, titleId: string | null): void {
  db.prepare('UPDATE players SET selected_title=? WHERE user_id=? AND guild_id=?')
    .run(titleId, userId, guildId);
}
