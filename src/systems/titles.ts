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
    id: 'merchant_prince',
    name: 'Merchant Prince',
    icon: '🤝',
    description: 'Thương nhân điêu luyện của thế giới ngầm.',
    fromAchievement: 'trader'
  },
  // Chapter titles — granted directly, not via achievement
  { id: 'pathfinder',  name: 'Người Mở Đường', icon: '🌲', description: 'Hoàn thành Chương 1 — đã xua tan bóng tối khỏi rừng.', fromAchievement: '' },
  { id: 'ruin_seeker', name: 'Nhà Khám Cổ Tích', icon: '⛩️', description: 'Hoàn thành Chương 2 — đã giải mã bí mật đền cổ.', fromAchievement: '' },
  { id: 'mine_lord',   name: 'Chúa Hầm Mỏ', icon: '⛏️', description: 'Hoàn thành Chương 3 — đã phá vỡ lời nguyền hầm mỏ.', fromAchievement: '' },
  { id: 'world_ender', name: 'Kẻ Tận Thế', icon: '🌌', description: 'Hoàn thành Chương 4 — đã đánh bại thực thể cuối cùng.', fromAchievement: '' },
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
