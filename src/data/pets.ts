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
    maxLevel: 10, feedGold: 80,
    releaseItem: 'wolf_fang',
    obtainHint: 'Rơi từ quái vật Forest và Wasteland',
  },
  shadow_cat: {
    id: 'shadow_cat', name: 'Shadow Cat', icon: '🐱',
    rarity: 'common',
    description: 'Mèo bóng tối nhẹ bước, tăng phòng thủ.',
    passiveType: 'def_pct', passiveBase: 5, passivePerLv: 1,
    maxLevel: 10, feedGold: 80,
    releaseItem: 'shadow_shard',
    obtainHint: 'Rơi từ quái vật Cave và Crypt',
  },
  fire_lizard: {
    id: 'fire_lizard', name: 'Fire Lizard', icon: '🦎',
    rarity: 'rare',
    description: 'Thằn lằn lửa hiếm, tăng ATK đáng kể.',
    passiveType: 'atk_pct', passiveBase: 10, passivePerLv: 1.5,
    maxLevel: 15, feedGold: 150,
    releaseItem: 'fire_essence',
    obtainHint: 'Rơi hiếm từ boss khu vực Volcano',
  },
  storm_eagle: {
    id: 'storm_eagle', name: 'Storm Eagle', icon: '🦅',
    rarity: 'rare',
    description: 'Đại bàng bão, tăng EXP nhận được.',
    passiveType: 'exp_pct', passiveBase: 15, passivePerLv: 2,
    maxLevel: 15, feedGold: 150,
    releaseItem: 'thunder_feather',
    obtainHint: 'Cơ hội nhỏ khi fishing hoặc gathering cấp cao',
  },
  gold_fox: {
    id: 'gold_fox', name: 'Gold Fox', icon: '🦊',
    rarity: 'rare',
    description: 'Cáo vàng may mắn, tăng gold nhận được.',
    passiveType: 'gold_pct', passiveBase: 10, passivePerLv: 1.5,
    maxLevel: 15, feedGold: 150,
    releaseItem: 'lucky_coin',
    obtainHint: 'Rơi hiếm từ rương vàng và quái thương nhân',
  },
  mini_dragon: {
    id: 'mini_dragon', name: 'Mini Dragon', icon: '🐉',
    rarity: 'epic',
    description: 'Rồng nhỏ hùng mạnh, tăng Max HP đáng kể.',
    passiveType: 'hp_pct', passiveBase: 15, passivePerLv: 2,
    maxLevel: 20, feedGold: 300,
    releaseItem: 'dragon_scale',
    obtainHint: 'Chỉ rơi từ World Boss',
  },
  celestial_sprite: {
    id: 'celestial_sprite', name: 'Celestial Sprite', icon: '✨',
    rarity: 'legendary',
    description: 'Linh hồn thiên giới, tăng Max MP và sức mạnh phép thuật.',
    passiveType: 'mp_pct', passiveBase: 20, passivePerLv: 2.5,
    maxLevel: 25, feedGold: 500,
    releaseItem: 'stardust',
    obtainHint: 'Phần thưởng Prestige lần 3 trở lên',
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
