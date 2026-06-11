export interface PetDef {
  id: string;
  name: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  description: string;
  passiveType: 'atk_pct' | 'def_pct' | 'hp_pct' | 'gold_pct' | 'exp_pct' | 'mp_pct';
  passiveBase: number;    // % bonus at level 1
  passivePerLv: number;   // additional % per level above 1
  maxLevel: number;
  feedGold: number;       // gold cost = level * feedGold
  releaseItem: string;    // item_id granted on release
  obtainHint: string;
}

export const PETS: Record<string, PetDef> = {
  wolf_pup: {
    id: 'wolf_pup', name: 'Wolf Pup', icon: '🐺',
    rarity: 'common',
    description: 'Sói con hiếu chiến, tăng sức tấn công.',
    passiveType: 'atk_pct', passiveBase: 5, passivePerLv: 1,
    maxLevel: 10, feedGold: 120,
    releaseItem: 'wolf_fang',
    obtainHint: 'Rơi từ quái vật Forest và Wasteland',
  },
  shadow_cat: {
    id: 'shadow_cat', name: 'Shadow Cat', icon: '🐱',
    rarity: 'common',
    description: 'Mèo bóng tối nhẹ bước, tăng phòng thủ.',
    passiveType: 'def_pct', passiveBase: 5, passivePerLv: 1,
    maxLevel: 10, feedGold: 120,
    releaseItem: 'shadow_shard',
    obtainHint: 'Rơi từ quái vật Cave và Crypt',
  },
  fire_lizard: {
    id: 'fire_lizard', name: 'Fire Lizard', icon: '🦎',
    rarity: 'rare',
    description: 'Thằn lằn lửa hiếm, tăng ATK đáng kể.',
    passiveType: 'atk_pct', passiveBase: 10, passivePerLv: 1.5,
    maxLevel: 15, feedGold: 300,
    releaseItem: 'fire_essence',
    obtainHint: 'Rơi hiếm từ boss khu vực Volcano',
  },
  storm_eagle: {
    id: 'storm_eagle', name: 'Storm Eagle', icon: '🦅',
    rarity: 'rare',
    description: 'Đại bàng bão, tăng EXP nhận được.',
    passiveType: 'exp_pct', passiveBase: 15, passivePerLv: 2,
    maxLevel: 15, feedGold: 300,
    releaseItem: 'thunder_feather',
    obtainHint: 'Cơ hội nhỏ khi fishing hoặc gathering cấp cao',
  },
  gold_fox: {
    id: 'gold_fox', name: 'Gold Fox', icon: '🦊',
    rarity: 'rare',
    description: 'Cáo vàng may mắn, tăng gold nhận được.',
    passiveType: 'gold_pct', passiveBase: 10, passivePerLv: 1.5,
    maxLevel: 15, feedGold: 300,
    releaseItem: 'lucky_coin',
    obtainHint: 'Rơi hiếm từ rương vàng và quái thương nhân',
  },
  mini_dragon: {
    id: 'mini_dragon', name: 'Mini Dragon', icon: '🐉',
    rarity: 'epic',
    description: 'Rồng nhỏ hùng mạnh, tăng Max HP đáng kể.',
    passiveType: 'hp_pct', passiveBase: 15, passivePerLv: 2,
    maxLevel: 20, feedGold: 700,
    releaseItem: 'dragon_scale',
    obtainHint: 'Chỉ rơi từ World Boss',
  },
  river_otter: {
    id: 'river_otter', name: 'River Otter', icon: '🦦',
    rarity: 'rare',
    description: 'Rái cá tinh nghịch câu được từ Fishing Spot. Tăng EXP nhận được.',
    passiveType: 'exp_pct', passiveBase: 9, passivePerLv: 1.4,
    maxLevel: 15, feedGold: 260,
    releaseItem: 'silver_fish',
    obtainHint: 'Chỉ có thể nở từ pet egg khi thắng mini game câu cá hiếm',
  },
  pearl_turtle: {
    id: 'pearl_turtle', name: 'Pearl Turtle', icon: '🐢',
    rarity: 'rare',
    description: 'Rùa ngọc trai sống ở những hồ sâu. Tăng phòng thủ.',
    passiveType: 'def_pct', passiveBase: 10, passivePerLv: 1.3,
    maxLevel: 15, feedGold: 320,
    releaseItem: 'mystery_shell',
    obtainHint: 'Chỉ có thể nở từ pet egg khi thắng mini game câu cá epic/cổ đại',
  },
  abyss_koi: {
    id: 'abyss_koi', name: 'Abyss Koi', icon: '🐟',
    rarity: 'epic',
    description: 'Cá koi hư không cực hiếm. Tăng Max MP.',
    passiveType: 'mp_pct', passiveBase: 14, passivePerLv: 2,
    maxLevel: 20, feedGold: 650,
    releaseItem: 'void_shard',
    obtainHint: 'Chỉ có thể nở từ pet egg khi câu được cá cổ đại',
  },

  celestial_sprite: {
    id: 'celestial_sprite', name: 'Celestial Sprite', icon: '✨',
    rarity: 'legendary',
    description: 'Linh hồn thiên giới, tăng Max MP và sức mạnh phép thuật.',
    passiveType: 'mp_pct', passiveBase: 20, passivePerLv: 2.5,
    maxLevel: 25, feedGold: 1200,
    releaseItem: 'stardust',
    obtainHint: 'Phần thưởng Prestige lần 3 trở lên',
  },

  candle_wisp: {
    id: 'candle_wisp', name: 'Candle Wisp', icon: '🕯️',
    rarity: 'epic',
    description: 'Đốm lửa linh hồn từ Đền Cổ. Tăng Max MP và giúp hành trình trong Shrine bền bỉ hơn.',
    passiveType: 'mp_pct', passiveBase: 12, passivePerLv: 1.6,
    maxLevel: 20, feedGold: 560,
    releaseItem: 'holy_ash',
    obtainHint: 'Rơi cực hiếm từ mini game hoàn hảo hoặc Echo Demon tại Đền Cổ',
  },
  mirror_imp: {
    id: 'mirror_imp', name: 'Mirror Imp', icon: '🪞',
    rarity: 'epic',
    description: 'Tiểu quỷ sống trong mặt gương nứt. Tăng ATK và đôi khi tìm thêm Mirror Shard.',
    passiveType: 'atk_pct', passiveBase: 8, passivePerLv: 1.3,
    maxLevel: 20, feedGold: 620,
    releaseItem: 'mirror_shard',
    obtainHint: 'Rơi cực hiếm từ mini game gương hoàn hảo hoặc Echo Demon',
  },
  echo_sprite: {
    id: 'echo_sprite', name: 'Echo Sprite', icon: '👁️',
    rarity: 'legendary',
    description: 'Một mảnh tiếng vọng đã được thuần hóa. Tăng EXP và đôi khi kéo material Shrine từ kẽ đá.',
    passiveType: 'exp_pct', passiveBase: 16, passivePerLv: 2.1,
    maxLevel: 25, feedGold: 1100,
    releaseItem: 'echo_core',
    obtainHint: 'Rơi cực hiếm từ Echo Demon hoặc nghi lễ tiếng vọng hoàn hảo',
  },

};

export function getPet(id: string): PetDef | undefined {
  return PETS[id];
}

export function petPassiveValue(def: PetDef, level: number): number {
  return def.passiveBase + (level - 1) * def.passivePerLv;
}

export const RARITY_COLOR: Record<string, number> = {
  common:    0x888888,
  rare:      0x3399ff,
  epic:      0x9933ff,
  legendary: 0xffaa00,
};

export const RARITY_LABEL: Record<string, string> = {
  common:    'Phổ Thông',
  rare:      'Hiếm',
  epic:      'Sử Thi',
  legendary: 'Huyền Thoại',


};
