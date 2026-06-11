export type ObjType = 'explore_zone' | 'kill_boss' | 'kill_in_zone' | 'rescue_villager';

export interface ChapterObjective {
  id: string;
  desc: string;
  type: ObjType;
  target: number;
  zoneId?: string;
  enemyId?: string;
}

export interface ChapterReward {
  titleId?: string;
  gold: number;
  exp: number;
  shards?: number;
}

export interface Chapter {
  id: number;
  title: string;
  lore: string;
  objectives: ChapterObjective[];
  reward: ChapterReward;
}

export const CHAPTERS: Chapter[] = [
  {
    id: 1,
    title: '🌲 Chương 1: Rừng Đen Thức Giấc',
    lore: 'Những ngọn đèn trong làng đang tắt dần. Người dân xì xào về bóng tối từ rừng phía đông...',
    objectives: [
      { id: 'explore_forest',   desc: 'Khám phá Rừng Bóng Tối 5 lần',          type: 'explore_zone',    target: 5, zoneId: 'forest' },
      { id: 'rescue_villager',  desc: 'Cứu 1 dân làng khỏi tên cướp đường',    type: 'rescue_villager', target: 1 },
      { id: 'kill_ancient_oak', desc: 'Tiêu diệt Ancient Oak',                  type: 'kill_boss',       target: 1, enemyId: 'ancient_oak' },
    ],
    reward: { titleId: 'pathfinder', gold: 500, exp: 300 },
  },
  {
    id: 2,
    title: '⛩️ Chương 2: Tiếng Vọng Trong Đền Cổ',
    lore: 'Sau Rừng Bóng Tối là một tàn tích ngàn năm. Mỗi ngọn nến xanh trong đền đều thì thầm tên người sống...',
    objectives: [
      { id: 'explore_shrine',  desc: 'Khám phá Đền Cổ Bị Lãng Quên 6 lần',  type: 'explore_zone', target: 6, zoneId: 'shrine' },
      { id: 'kill_shrine',     desc: 'Tiêu diệt 8 linh thể/hộ vệ tại Đền Cổ', type: 'kill_in_zone', target: 8, zoneId: 'shrine' },
      { id: 'kill_echo_demon', desc: 'Phong ấn Echo Demon',              type: 'kill_boss',    target: 1, enemyId: 'echo_demon' },
    ],
    reward: { titleId: 'ruin_seeker', gold: 1000, exp: 600 },
  },
  {
    id: 3,
    title: '⛏️ Chương 3: Lời Nguyền Hầm Mỏ',
    lore: 'Bên dưới ngọn núi phía bắc, hầm mỏ đã im lặng một thế kỷ bỗng phát ra tiếng động kỳ lạ...',
    objectives: [
      { id: 'explore_mines',  desc: 'Khám phá Hầm Mỏ Bị Nguyền 5 lần',  type: 'explore_zone', target: 5, zoneId: 'mines' },
      { id: 'kill_mines',     desc: 'Tiêu diệt 10 quái tại Hầm Mỏ',     type: 'kill_in_zone', target: 10, zoneId: 'mines' },
      { id: 'kill_colossus',  desc: 'Tiêu diệt Mine Colossus',            type: 'kill_boss',    target: 1, enemyId: 'mine_colossus' },
    ],
    reward: { titleId: 'mine_lord', gold: 1500, exp: 1000 },
  },
  {
    id: 4,
    title: '🌌 Chương 4: Tiếng Vọng Cuối Cùng',
    lore: 'Nơi thực tại bị bóng tối ăn mòn. Một thực thể cổ đại đang thức giấc từ từ...',
    objectives: [
      { id: 'explore_wastes', desc: 'Khám phá Hoang Nguyên Tiếng Vọng 5 lần', type: 'explore_zone', target: 5, zoneId: 'wastes' },
      { id: 'kill_wastes',    desc: 'Tiêu diệt 15 quái tại Hoang Nguyên',     type: 'kill_in_zone', target: 15, zoneId: 'wastes' },
      { id: 'kill_forgotten', desc: 'Tiêu diệt The Forgotten',                 type: 'kill_boss',    target: 1, enemyId: 'the_forgotten' },
    ],
    reward: { titleId: 'world_ender', gold: 3000, exp: 2000, shards: 5 },
  },
];

export function getChapter(id: number): Chapter | undefined {
  return CHAPTERS.find(c => c.id === id);
}

export const MAX_CHAPTER = CHAPTERS.length;
