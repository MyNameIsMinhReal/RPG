export type EquipSlot    = 'weapon' | 'armor' | 'accessory1' | 'accessory2';
export type Rarity       = 'common' | 'rare' | 'epic' | 'legendary' | 'mythic' | 'cursed';
export type EquipEffect  =
  | 'burn_on_hit'       // 20% burn 2t on normal attack
  | 'stun_on_hit'       // 15% stun 1t on normal attack
  | 'slow_on_skill'     // 15% slow 1t on skill use
  | 'extra_hit'         // 10% extra small hit on attack
  | 'dodge_on_crit'     // 20% gain dodge after crit
  | 'low_hp_atk'        // +10~20% ATK when HP < 30-35%
  | 'boss_damage'       // +10~20% damage to bosses
  | 'boss_dmg_redux'    // -15% damage from bosses
  | 'kill_hp_regen'     // restore 15% HP on kill
  | 'kill_mp_regen'     // restore 10 MP on kill
  | 'mp_regen_3t'       // +5 MP every 3 turns
  | 'block_one_crit'    // block one crit per combat
  | 'revive_once'       // survive death once per combat (mythic)
  | 'dodge_then_dmg'    // after dodge, next hit +20%
  | 'potion_bonus'      // potions heal +10~30% more
  | 'fear_on_hit'       // 10% fear (enemy skips turn)
  | 'star_damage'       // 20% extra Star Damage on attack
  | 'curse_hp_drain'    // -2% max HP per turn
  | 'no_healing'        // cannot use health potions
  | 'soul_stack'        // +1 ATK per kill (resets on death)
  | 'broken_evolve'     // on boss kill: chance to evolve rarity
  | 'armor_of_regret'   // can't flee; legacy stronger on death
  | 'celestial_revive'  // revive once per combat with 20% HP
  | 'blood_kill_regen'  // restore 20% HP on kill but potions -50%
  | 'worldbreaker'      // -10 DEF (high risk)
  | 'debt_on_death'     // lose extra gold penalty on death
  | 'set_bonus_2'       // set bonus 2-piece active
  | 'set_bonus_3';      // set bonus 3-piece active

export interface EquipStats {
  atk?:        number;
  def?:        number;
  maxHp?:      number;
  maxMp?:      number;
  critChance?: number;   // %
  dodgeChance?:number;   // %
  lifesteal?:  number;   // %
  expBonus?:   number;   // %
  goldBonus?:  number;   // %
  dropBonus?:  number;   // % bonus drop chance
}

export interface EquipmentDef {
  id:          string;
  name:        string;
  icon:        string;
  slot:        EquipSlot;
  rarity:      Rarity;
  description: string;
  stats:       EquipStats;
  effects?:    EquipEffect[];
  setId?:      string;
  sellPrice:   number;
  buyPrice?:   number;
  dropFrom?:   string[];
  dropChance?: number;
  minZone?:    string;
}

// ── Set definitions ──────────────────────────────────────────────────────────
export interface SetDef {
  id:      string;
  name:    string;
  pieces:  string[];   // equipment IDs
  bonus2:  EquipStats & { effects?: EquipEffect[] };
  bonus3?: EquipStats & { effects?: EquipEffect[] };
}

export const SETS: Record<string, SetDef> = {
  iron_set: {
    id: 'iron_set', name: 'Iron Set',
    pieces: ['iron_sword', 'iron_armor', 'guard_shield'],
    bonus2: { def: 5 },
    bonus3: { maxHp: 20 }
  },
  shadow_set: {
    id: 'shadow_set', name: 'Shadow Set',
    pieces: ['shadow_dagger', 'shadow_cloak', 'cursed_eye'],
    bonus2: { critChance: 8 },
    bonus3: { effects: ['dodge_then_dmg'] }
  },
  dragon_set: {
    id: 'dragon_set', name: 'Dragon Set',
    pieces: ['dragon_slayer', 'dragon_scale_armor', 'dragon_heart'],
    bonus2: { effects: ['boss_damage'] },
    bonus3: { effects: ['boss_dmg_redux'] }
  },
  blood_set: {
    id: 'blood_set', name: 'Blood Set',
    pieces: ['bloodfang_dagger', 'blood_armor', 'ring_of_blood_pact'],
    bonus2: { lifesteal: 5 },
    bonus3: { effects: ['low_hp_atk'] }
  },
  celestial_set: {
    id: 'celestial_set', name: 'Celestial Set',
    pieces: ['celestial_staff', 'celestial_robe', 'gods_tear'],
    bonus2: { effects: ['mp_regen_3t'] },
    bonus3: { effects: ['celestial_revive'] }
  },
  shrine_mage_set: {
    id: 'shrine_mage_set', name: 'Shrine Mage Set',
    pieces: ['candle_sage_staff', 'soul_candle_robe', 'mirror_focus_orb'],
    bonus2: { maxMp: 18 },
    bonus3: { effects: ['mp_regen_3t'] }
  },
  echo_mage_set: {
    id: 'echo_mage_set', name: 'Echo Mage Set',
    pieces: ['echo_grimoire', 'voicebound_mantle', 'oracle_moon_ring'],
    bonus2: { maxMp: 28, expBonus: 4 },
    bonus3: { effects: ['kill_mp_regen'] }
  },
  abyssal_set: {
    id: 'abyssal_set', name: 'Abyssal Set',
    pieces: ['abyssal_scythe', 'abyssal_armor', 'void_core'],
    bonus2: { effects: ['kill_mp_regen'] },
    bonus3: { effects: ['soul_stack'] }
  }
};

// ── Equipment definitions ─────────────────────────────────────────────────────
const EQUIPMENT_RAW: Record<string, EquipmentDef> = {

  // ════════════════════════════════════════════════════
  //  WEAPONS
  // ════════════════════════════════════════════════════

  // ── Common weapons ────────────────────────────────
  rusty_sword: {
    id: 'rusty_sword', name: 'Rusty Sword', icon: '🗡️', slot: 'weapon', rarity: 'common',
    description: 'Một thanh kiếm cũ, nhưng vẫn đủ để sống sót.',
    stats: { atk: 3 }, sellPrice: 15, buyPrice: 40, minZone: 'village'
  },
  wooden_staff: {
    id: 'wooden_staff', name: 'Wooden Staff', icon: '🪄', slot: 'weapon', rarity: 'common',
    description: 'Gậy gỗ đơn giản cho người mới học phép.',
    stats: { atk: 2, maxMp: 5 }, sellPrice: 15, buyPrice: 40, minZone: 'village'
  },
  training_dagger: {
    id: 'training_dagger', name: 'Training Dagger', icon: '🔪', slot: 'weapon', rarity: 'common',
    description: 'Dao găm tập luyện cho Thích Khách/Assassin. Nhẹ, dễ ra chí mạng.',
    stats: { atk: 3, critChance: 4 }, sellPrice: 20, buyPrice: 60, minZone: 'village'
  },
  hunter_dagger: {
    id: 'hunter_dagger', name: 'Hunter Dagger', icon: '🔪', slot: 'weapon', rarity: 'common',
    description: 'Dao săn nhỏ, nhẹ và nhanh. +3% Crit.',
    stats: { atk: 2, critChance: 3 }, sellPrice: 15, buyPrice: 40,
    dropFrom: ['forest_sprite', 'cursed_wolf'], dropChance: 8, minZone: 'forest'
  },
  old_bow: {
    id: 'old_bow', name: 'Old Bow', icon: '🏹', slot: 'weapon', rarity: 'common',
    description: 'Có 10% né đòn đầu tiên từ quái yếu.',
    stats: { atk: 3 }, effects: ['dodge_on_crit'],
    sellPrice: 15, buyPrice: 40, minZone: 'forest'
  },
  training_sword: {
    id: 'training_sword', name: 'Training Sword', icon: '⚔️', slot: 'weapon', rarity: 'common',
    description: 'Kiếm tập luyện. Mạnh hơn kiếm cũ, dễ cầm tay.',
    stats: { atk: 4 }, sellPrice: 20, buyPrice: 60, minZone: 'village'
  },
  woodcutter_axe: {
    id: 'woodcutter_axe', name: 'Woodcutter Axe', icon: '🪓', slot: 'weapon', rarity: 'common',
    description: 'Rìu đốn củi nặng. Sát thương cao đầu game nhưng khó phòng thủ.',
    stats: { atk: 5, def: -1 }, sellPrice: 20, buyPrice: 75, minZone: 'village'
  },
  apprentice_wand: {
    id: 'apprentice_wand', name: 'Apprentice Wand', icon: '🪄', slot: 'weapon', rarity: 'common',
    description: 'Gậy phép cho mage mới bắt đầu. ATK và MP.',
    stats: { atk: 3, maxMp: 10 }, sellPrice: 20, buyPrice: 70, minZone: 'village'
  },
  short_bow: {
    id: 'short_bow', name: 'Short Bow', icon: '🏹', slot: 'weapon', rarity: 'common',
    description: 'Cung ngắn linh hoạt. ATK và crit cho ranger/rogue.',
    stats: { atk: 4, critChance: 3 }, sellPrice: 20, buyPrice: 75, minZone: 'forest'
  },
  guard_spear: {
    id: 'guard_spear', name: 'Guard Spear', icon: '🔱', slot: 'weapon', rarity: 'common',
    description: 'Giáo phòng vệ. Cân bằng tấn công và phòng thủ.',
    stats: { atk: 4, def: 2 }, sellPrice: 25, buyPrice: 90, minZone: 'village'
  },

  // ── Rare weapons ──────────────────────────────────
  iron_sword: {
    id: 'iron_sword', name: 'Iron Sword', icon: '⚔️', slot: 'weapon', rarity: 'rare',
    description: 'Vũ khí cơ bản của mạo hiểm giả.',
    stats: { atk: 7 }, setId: 'iron_set',
    sellPrice: 70, buyPrice: 180, minZone: 'forest'
  },
  knight_spear: {
    id: 'knight_spear', name: 'Knight Spear', icon: '🔱', slot: 'weapon', rarity: 'rare',
    description: 'Khi bắt đầu combat, nhận +5% giảm sát thương trong 1 lượt.',
    stats: { atk: 6, def: 2 }, effects: ['block_one_crit'],
    sellPrice: 80, dropFrom: ['skeleton_archer'], dropChance: 12, minZone: 'shrine'
  },
  arcane_wand: {
    id: 'arcane_wand', name: 'Arcane Wand', icon: '🪄', slot: 'weapon', rarity: 'rare',
    description: 'Skill phép gây thêm +5% damage.',
    stats: { atk: 4, maxMp: 15 },
    sellPrice: 75, buyPrice: 170, minZone: 'shrine'
  },
  assassin_dagger: {
    id: 'assassin_dagger', name: 'Assassin Dagger', icon: '🔪', slot: 'weapon', rarity: 'rare',
    description: 'Đòn chí mạng gây thêm 15% damage.',
    stats: { atk: 5, critChance: 8 },
    sellPrice: 80, dropFrom: ['phantom'], dropChance: 10, minZone: 'shrine'
  },
  recurve_bow: {
    id: 'recurve_bow', name: 'Recurve Bow', icon: '🏹', slot: 'weapon', rarity: 'rare',
    description: '10% đánh thêm 1 hit nhỏ.',
    stats: { atk: 6, critChance: 5 }, effects: ['extra_hit'],
    sellPrice: 80, dropFrom: ['skeleton_archer'], dropChance: 10, minZone: 'shrine'
  },
  steel_longsword: {
    id: 'steel_longsword', name: 'Steel Longsword', icon: '⚔️', slot: 'weapon', rarity: 'rare',
    description: 'Kiếm dài thép. Ổn định và đáng tin cậy, không có tác dụng phụ.',
    stats: { atk: 9 }, sellPrice: 90, buyPrice: 260, minZone: 'forest'
  },
  battle_axe: {
    id: 'battle_axe', name: 'Battle Axe', icon: '🪓', slot: 'weapon', rarity: 'rare',
    description: 'Rìu chiến mạnh mẽ. Sát thương cao, nhưng khó phòng thủ.',
    stats: { atk: 11, def: -2 }, sellPrice: 100, buyPrice: 320, minZone: 'mines'
  },
  runic_wand: {
    id: 'runic_wand', name: 'Runic Wand', icon: '🔮', slot: 'weapon', rarity: 'rare',
    description: 'Gậy khắc rune cổ đại. ATK, MP cao và tự hồi mana.',
    stats: { atk: 6, maxMp: 25 }, effects: ['mp_regen_3t'],
    sellPrice: 100, buyPrice: 300, minZone: 'shrine'
  },
  twin_daggers: {
    id: 'twin_daggers', name: 'Twin Daggers', icon: '🔪', slot: 'weapon', rarity: 'rare',
    description: 'Hai dao song song — tối ưu cho build crit.',
    stats: { atk: 7, critChance: 10 }, sellPrice: 100, buyPrice: 310, minZone: 'shrine'
  },
  guardian_spear: {
    id: 'guardian_spear', name: 'Guardian Spear', icon: '🔱', slot: 'weapon', rarity: 'rare',
    description: 'Giáo hộ vệ — chặn 1 đòn chí mạng mỗi combat.',
    stats: { atk: 7, def: 5 }, effects: ['block_one_crit'],
    sellPrice: 110, buyPrice: 340, minZone: 'mines'
  },
  hunter_crossbow: {
    id: 'hunter_crossbow', name: 'Hunter Crossbow', icon: '🏹', slot: 'weapon', rarity: 'rare',
    description: 'Nỏ thợ săn. 10% bắn thêm 1 mũi tên nhỏ.',
    stats: { atk: 8, critChance: 5 }, effects: ['extra_hit'],
    sellPrice: 100, buyPrice: 330, minZone: 'forest'
  },

  // ── Epic weapons ──────────────────────────────────
  flameblade: {
    id: 'flameblade', name: 'Flameblade', icon: '🔥', slot: 'weapon', rarity: 'epic',
    description: 'Đòn đánh có 20% gây Burn trong 2 lượt.',
    stats: { atk: 12 }, effects: ['burn_on_hit'],
    sellPrice: 200, dropFrom: ['cave_troll', 'mine_colossus'], dropChance: 8, minZone: 'mines'
  },
  frost_spear: {
    id: 'frost_spear', name: 'Frost Spear', icon: '🧊', slot: 'weapon', rarity: 'epic',
    description: 'Skill có 15% làm chậm enemy, giảm ATK enemy 10%.',
    stats: { atk: 10, maxMp: 5 }, effects: ['slow_on_skill'],
    sellPrice: 180, dropFrom: ['cave_troll'], dropChance: 8, minZone: 'mines'
  },
  shadow_dagger: {
    id: 'shadow_dagger', name: 'Shadow Dagger', icon: '🌑', slot: 'weapon', rarity: 'epic',
    description: 'Sau khi crit, có 20% nhận Dodge 1 lần.',
    stats: { atk: 9, critChance: 12 }, effects: ['dodge_on_crit'], setId: 'shadow_set',
    sellPrice: 200, dropFrom: ['shadow_bat', 'phantom'], dropChance: 8, minZone: 'mines'
  },
  storm_bow: {
    id: 'storm_bow', name: 'Storm Bow', icon: '⚡', slot: 'weapon', rarity: 'epic',
    description: '15% đánh lan sét, gây thêm damage nhỏ.',
    stats: { atk: 11 }, effects: ['extra_hit'],
    sellPrice: 190, dropFrom: ['shadow_bat'], dropChance: 8, minZone: 'mines'
  },
  priest_mace: {
    id: 'priest_mace', name: 'Priest Mace', icon: '🔨', slot: 'weapon', rarity: 'epic',
    description: 'Khi dùng potion, hồi thêm 10%.',
    stats: { atk: 8, maxHp: 10 }, effects: ['potion_bonus'],
    sellPrice: 180, dropFrom: ['shrine_guardian'], dropChance: 12, minZone: 'shrine'
  },
  ember_sabre: {
    id: 'ember_sabre', name: 'Ember Sabre', icon: '🔥', slot: 'weapon', rarity: 'epic',
    description: '20% gây Burn 2 lượt khi đánh thường.',
    stats: { atk: 13 }, effects: ['burn_on_hit'],
    sellPrice: 300, buyPrice: 900, minZone: 'mines'
  },
  frost_pike: {
    id: 'frost_pike', name: 'Frost Pike', icon: '🧊', slot: 'weapon', rarity: 'epic',
    description: 'Skill có 15% làm chậm enemy. ATK và MP.',
    stats: { atk: 11, maxMp: 10 }, effects: ['slow_on_skill'],
    sellPrice: 300, buyPrice: 950, minZone: 'mines'
  },
  executioner_axe: {
    id: 'executioner_axe', name: 'Executioner Axe', icon: '🪓', slot: 'weapon', rarity: 'epic',
    description: 'Búa xử tử. ATK rất cao, DEF giảm. Khi HP < 35%, ATK +10%.',
    stats: { atk: 18, def: -5 }, effects: ['low_hp_atk'],
    sellPrice: 380, buyPrice: 1100, minZone: 'wastes'
  },
  moonlit_bow: {
    id: 'moonlit_bow', name: 'Moonlit Bow', icon: '🌙', slot: 'weapon', rarity: 'epic',
    description: 'Cung ánh trăng. Crit cao và 10% bắn thêm phát.',
    stats: { atk: 12, critChance: 10 }, effects: ['extra_hit'],
    sellPrice: 350, buyPrice: 1000, minZone: 'wastes'
  },
  priest_bell_mace: {
    id: 'priest_bell_mace', name: 'Priest Bell Mace', icon: '🔔', slot: 'weapon', rarity: 'epic',
    description: 'Chùy chuông linh mục. Potion hồi thêm 10~30%.',
    stats: { atk: 9, maxHp: 20 }, effects: ['potion_bonus'],
    sellPrice: 280, buyPrice: 850, minZone: 'shrine'
  },
  shadow_kris: {
    id: 'shadow_kris', name: 'Shadow Kris', icon: '🌑', slot: 'weapon', rarity: 'epic',
    description: 'Dao cong bóng tối. Crit cao, khi crit 20% né đòn tiếp theo.',
    stats: { atk: 10, critChance: 15 }, effects: ['dodge_on_crit'],
    sellPrice: 320, buyPrice: 1050, minZone: 'mines'
  },

  // ── Legendary weapons ─────────────────────────────
  dragon_slayer: {
    id: 'dragon_slayer', name: 'Dragon Slayer', icon: '🐉', slot: 'weapon', rarity: 'legendary',
    description: 'Gây thêm 20% damage lên boss.',
    stats: { atk: 20 }, effects: ['boss_damage'], setId: 'dragon_set',
    sellPrice: 600, dropFrom: ['mine_colossus'], dropChance: 5, minZone: 'mines'
  },
  moonlight_katana: {
    id: 'moonlight_katana', name: 'Moonlight Katana', icon: '🌙', slot: 'weapon', rarity: 'legendary',
    description: 'Khi HP dưới 35%, tăng thêm 10% ATK.',
    stats: { atk: 16, critChance: 15 }, effects: ['low_hp_atk'],
    sellPrice: 600, dropFrom: ['void_wraith'], dropChance: 6, minZone: 'wastes'
  },
  staff_of_ancient_mana: {
    id: 'staff_of_ancient_mana', name: 'Staff of Ancient Mana', icon: '✨', slot: 'weapon', rarity: 'legendary',
    description: 'Mỗi 3 lượt hồi 5 MP.',
    stats: { atk: 12, maxMp: 35 }, effects: ['mp_regen_3t'],
    sellPrice: 550, dropFrom: ['echo_demon'], dropChance: 6, minZone: 'shrine'
  },
  bloodfang_dagger: {
    id: 'bloodfang_dagger', name: 'Bloodfang Dagger', icon: '🩸', slot: 'weapon', rarity: 'legendary',
    description: 'Hút máu 8% damage gây ra.',
    stats: { atk: 14, critChance: 10, lifesteal: 8 }, setId: 'blood_set',
    sellPrice: 600, dropFrom: ['void_wraith'], dropChance: 6, minZone: 'wastes'
  },
  sunforged_hammer: {
    id: 'sunforged_hammer', name: 'Sunforged Hammer', icon: '☀️', slot: 'weapon', rarity: 'legendary',
    description: 'Đòn đánh có 15% làm choáng enemy 1 lượt.',
    stats: { atk: 18, def: 8 }, effects: ['stun_on_hit'],
    sellPrice: 620, dropFrom: ['the_forgotten'], dropChance: 15, minZone: 'wastes'
  },

  // ── Mythic weapons ────────────────────────────────
  eclipse_blade: {
    id: 'eclipse_blade', name: 'Eclipse Blade', icon: '🌑', slot: 'weapon', rarity: 'mythic',
    description: 'Khi giết enemy, hồi 15% HP và 10 MP.',
    stats: { atk: 28, critChance: 10 }, effects: ['kill_hp_regen', 'kill_mp_regen'],
    sellPrice: 1500, dropFrom: ['the_forgotten'], dropChance: 5, minZone: 'wastes'
  },
  worldbreaker_axe: {
    id: 'worldbreaker_axe', name: 'Worldbreaker Axe', icon: '🪓', slot: 'weapon', rarity: 'mythic',
    description: 'Damage cực cao nhưng nhận thêm sát thương (−10 DEF).',
    stats: { atk: 35, def: -10 }, effects: ['worldbreaker'],
    sellPrice: 1800, dropFrom: ['the_forgotten'], dropChance: 4, minZone: 'wastes'
  },
  celestial_staff: {
    id: 'celestial_staff', name: 'Celestial Staff', icon: '🌟', slot: 'weapon', rarity: 'mythic',
    description: 'Skill tốn MP ít hơn 15%.',
    stats: { atk: 20, maxMp: 60 }, setId: 'celestial_set',
    sellPrice: 1600, dropFrom: ['the_forgotten'], dropChance: 5, minZone: 'wastes'
  },
  abyssal_scythe: {
    id: 'abyssal_scythe', name: 'Abyssal Scythe', icon: '☠️', slot: 'weapon', rarity: 'mythic',
    description: 'Hút máu 12%. Mỗi combat có 1 lần sống sót với 1 HP.',
    stats: { atk: 24, lifesteal: 12 }, effects: ['revive_once'], setId: 'abyssal_set',
    sellPrice: 2000, dropFrom: ['the_forgotten'], dropChance: 4, minZone: 'wastes'
  },
  bow_of_falling_stars: {
    id: 'bow_of_falling_stars', name: 'Bow of Falling Stars', icon: '⭐', slot: 'weapon', rarity: 'mythic',
    description: '20% đòn đánh gây thêm Star Damage. Boss nhận thêm 10% damage.',
    stats: { atk: 25 }, effects: ['star_damage', 'boss_damage'],
    sellPrice: 1800, dropFrom: ['the_forgotten'], dropChance: 4, minZone: 'wastes'
  },

  // ── Cursed weapons ────────────────────────────────
  cursed_blade: {
    id: 'cursed_blade', name: 'Cursed Blade', icon: '🔴', slot: 'weapon', rarity: 'cursed',
    description: 'Mỗi combat mất 5% max HP/lượt. Khi HP < 30%, damage +20%.',
    stats: { atk: 32 }, effects: ['curse_hp_drain', 'low_hp_atk'],
    sellPrice: 800, dropFrom: ['the_forgotten'], dropChance: 3, minZone: 'wastes'
  },
  demon_fang: {
    id: 'demon_fang', name: 'Demon Fang', icon: '😈', slot: 'weapon', rarity: 'cursed',
    description: 'Không thể dùng healing potion trong combat.',
    stats: { atk: 21, critChance: 14 }, effects: ['no_healing'],
    sellPrice: 800, dropFrom: ['echo_demon'], dropChance: 5, minZone: 'shrine'
  },
  soul_eater: {
    id: 'soul_eater', name: 'Soul Eater', icon: '💀', slot: 'weapon', rarity: 'cursed',
    description: 'Khi giết enemy, nhận Soul Stack (+1 ATK/stack). Mất khi chết.',
    stats: { atk: 18 }, effects: ['soul_stack'],
    sellPrice: 700, dropFrom: ['echo_demon', 'void_wraith'], dropChance: 5, minZone: 'shrine'
  },
  broken_hero_sword: {
    id: 'broken_hero_sword', name: 'Broken Hero Sword', icon: '⚔️', slot: 'weapon', rarity: 'cursed',
    description: '−30% max HP. Nếu thắng boss, cơ hội tiến hóa thành Legendary.',
    stats: { atk: 40, maxHp: -30 }, effects: ['broken_evolve'],
    sellPrice: 1200, dropFrom: ['the_forgotten'], dropChance: 3, minZone: 'wastes'
  },
  debt_blade: {
    id: 'debt_blade', name: 'Debt Blade', icon: '💸', slot: 'weapon', rarity: 'cursed',
    description: 'ATK rất cao. Mỗi lần chết mất thêm gold phạt.',
    stats: { atk: 22 }, effects: ['debt_on_death'],
    sellPrice: 600, dropFrom: ['the_forgotten'], dropChance: 4, minZone: 'wastes'
  },
  bloodletter_knife: {
    id: 'bloodletter_knife', name: 'Bloodletter Knife', icon: '🩸', slot: 'weapon', rarity: 'cursed',
    description: 'Lifesteal cao. Hồi máu khi giết, nhưng potion hồi ít hơn 50%.',
    stats: { atk: 15, lifesteal: 8 }, effects: ['blood_kill_regen'],
    sellPrice: 600, dropFrom: ['void_wraith'], dropChance: 4, minZone: 'wastes'
  },
  cursed_cleaver: {
    id: 'cursed_cleaver', name: 'Cursed Cleaver', icon: '🔴', slot: 'weapon', rarity: 'cursed',
    description: 'ATK khổng lồ. Mỗi lượt trong combat mất 2% max HP.',
    stats: { atk: 28 }, effects: ['curse_hp_drain'],
    sellPrice: 700, dropFrom: ['the_forgotten'], dropChance: 3, minZone: 'wastes'
  },
  greed_spear: {
    id: 'greed_spear', name: 'Greed Spear', icon: '💰', slot: 'weapon', rarity: 'cursed',
    description: '+15% Gold nhận được. Nhưng -10% EXP.',
    stats: { atk: 15, goldBonus: 10, expBonus: -8 },
    sellPrice: 650, dropFrom: ['echo_demon'], dropChance: 4, minZone: 'shrine'
  },
  hollow_staff: {
    id: 'hollow_staff', name: 'Hollow Staff', icon: '👻', slot: 'weapon', rarity: 'cursed',
    description: 'MP rất cao, không thể dùng Health Potion.',
    stats: { atk: 12, maxMp: 65 }, effects: ['no_healing'],
    sellPrice: 650, dropFrom: ['echo_demon', 'void_wraith'], dropChance: 4, minZone: 'shrine'
  },

  // ── Extra weapon expansion ─────────────────────────
  chipped_dagger: {
    id: 'chipped_dagger', name: 'Chipped Dagger', icon: '🔪', slot: 'weapon', rarity: 'common',
    description: 'Dao găm mẻ lưỡi. Rẻ, nhẹ, hợp cho rogue/assassin mới chơi.',
    stats: { atk: 2, critChance: 5 }, sellPrice: 12, buyPrice: 35, minZone: 'village'
  },
  militia_hammer: {
    id: 'militia_hammer', name: 'Militia Hammer', icon: '🔨', slot: 'weapon', rarity: 'common',
    description: 'Búa dân binh thô sơ. Ít sát thương hơn rìu nhưng chắc tay hơn.',
    stats: { atk: 4, def: 1 }, sellPrice: 18, buyPrice: 65, minZone: 'village'
  },
  cracked_orb: {
    id: 'cracked_orb', name: 'Cracked Orb', icon: '🔮', slot: 'weapon', rarity: 'common',
    description: 'Quả cầu phép bị nứt. Cho thêm MP đầu game.',
    stats: { atk: 2, maxMp: 12 }, sellPrice: 16, buyPrice: 55, minZone: 'village'
  },
  farmer_pitchfork: {
    id: 'farmer_pitchfork', name: 'Farmer Pitchfork', icon: '🔱', slot: 'weapon', rarity: 'common',
    description: 'Cây chĩa của nông dân. Dài hơn kiếm ngắn, dùng tạm khá ổn.',
    stats: { atk: 4, maxHp: 5 }, sellPrice: 18, buyPrice: 70, minZone: 'village'
  },
  novice_crossbow: {
    id: 'novice_crossbow', name: 'Novice Crossbow', icon: '🏹', slot: 'weapon', rarity: 'common',
    description: 'Nỏ tập bắn. Sát thương ổn nhưng không có hiệu ứng đặc biệt.',
    stats: { atk: 5 }, sellPrice: 20, buyPrice: 80, minZone: 'forest'
  },
  bone_club: {
    id: 'bone_club', name: 'Bone Club', icon: '🦴', slot: 'weapon', rarity: 'common',
    description: 'Chùy xương thô sơ lấy từ quái rừng.',
    stats: { atk: 5, critChance: -2 }, sellPrice: 18,
    dropFrom: ['cursed_wolf', 'moss_lurker'], dropChance: 9, minZone: 'forest'
  },

  poison_dagger: {
    id: 'poison_dagger', name: 'Poison Dagger', icon: '🧪', slot: 'weapon', rarity: 'rare',
    description: 'Dao tẩm độc nhẹ. Crit cao, phù hợp lối đánh nhanh.',
    stats: { atk: 6, critChance: 12 }, sellPrice: 90, buyPrice: 280,
    dropFrom: ['briar_witch', 'spore_kin'], dropChance: 8, minZone: 'forest'
  },
  oakwood_bow: {
    id: 'oakwood_bow', name: 'Oakwood Bow', icon: '🏹', slot: 'weapon', rarity: 'rare',
    description: 'Cung gỗ sồi bền chắc. Có tỉ lệ bắn thêm một phát nhỏ.',
    stats: { atk: 7, critChance: 4 }, effects: ['extra_hit'],
    sellPrice: 90, buyPrice: 290, dropFrom: ['thornhound', 'moss_crowned_stag'], dropChance: 8, minZone: 'forest'
  },
  silver_rapier: {
    id: 'silver_rapier', name: 'Silver Rapier', icon: '🗡️', slot: 'weapon', rarity: 'rare',
    description: 'Kiếm đâm bạc, nhẹ và sắc. Tăng crit nhưng không quá nhiều ATK.',
    stats: { atk: 7, critChance: 9 }, sellPrice: 95, buyPrice: 300, minZone: 'shrine'
  },
  war_pick: {
    id: 'war_pick', name: 'War Pick', icon: '⛏️', slot: 'weapon', rarity: 'rare',
    description: 'Cuốc chiến trong hầm mỏ. Mạnh, hơi giảm khả năng phòng thủ.',
    stats: { atk: 10, def: -1 }, sellPrice: 95, buyPrice: 310,
    dropFrom: ['coal_imp', 'ore_devourer'], dropChance: 8, minZone: 'mines'
  },
  ember_wand: {
    id: 'ember_wand', name: 'Ember Wand', icon: '🔥', slot: 'weapon', rarity: 'rare',
    description: 'Đũa phép than hồng. Tăng MP và có chút sát thương phép.',
    stats: { atk: 5, maxMp: 28 }, sellPrice: 95, buyPrice: 300,
    dropFrom: ['ember_bloom', 'ash_acolyte'], dropChance: 8, minZone: 'shrine'
  },
  bone_halberd: {
    id: 'bone_halberd', name: 'Bone Halberd', icon: '☠️', slot: 'weapon', rarity: 'rare',
    description: 'Kích xương dài. Cân bằng giữa ATK và DEF.',
    stats: { atk: 8, def: 4 }, sellPrice: 100, buyPrice: 330,
    dropFrom: ['skeleton_archer', 'spirit_knight'], dropChance: 9, minZone: 'shrine'
  },
  crystal_knife: {
    id: 'crystal_knife', name: 'Crystal Knife', icon: '💎', slot: 'weapon', rarity: 'rare',
    description: 'Dao pha lê nhỏ. Sát thương vừa phải, crit cao.',
    stats: { atk: 6, critChance: 14 }, sellPrice: 105, buyPrice: 340,
    dropFrom: ['crystal_spider'], dropChance: 10, minZone: 'mines'
  },
  ash_mace: {
    id: 'ash_mace', name: 'Ash Mace', icon: '🔨', slot: 'weapon', rarity: 'rare',
    description: 'Chùy tro tàn. Cho thêm HP, hợp cleric/paladin đầu mid game.',
    stats: { atk: 7, maxHp: 25 }, sellPrice: 95, buyPrice: 320,
    dropFrom: ['ash_acolyte', 'pale_confessor'], dropChance: 8, minZone: 'shrine'
  },

  venom_kris: {
    id: 'venom_kris', name: 'Venom Kris', icon: '🟢', slot: 'weapon', rarity: 'epic',
    description: 'Dao cong tẩm nọc. Crit cao, sau khi crit có cơ hội né đòn.',
    stats: { atk: 11, critChance: 18 }, effects: ['dodge_on_crit'],
    sellPrice: 330, buyPrice: 1050, dropFrom: ['briar_witch', 'glass_serpent'], dropChance: 6, minZone: 'mines'
  },
  thunder_rapier: {
    id: 'thunder_rapier', name: 'Thunder Rapier', icon: '⚡', slot: 'weapon', rarity: 'epic',
    description: 'Kiếm đâm sấm sét. Có tỉ lệ đánh thêm một hit nhỏ.',
    stats: { atk: 13, critChance: 9 }, effects: ['extra_hit'],
    sellPrice: 340, buyPrice: 1100, dropFrom: ['bell_specter', 'bell_wraith'], dropChance: 7, minZone: 'shrine'
  },
  crystal_greatsword: {
    id: 'crystal_greatsword', name: 'Crystal Greatsword', icon: '💎', slot: 'weapon', rarity: 'epic',
    description: 'Đại kiếm pha lê. Sát thương cao, chậm và khó thủ.',
    stats: { atk: 17, def: -3 }, sellPrice: 360, buyPrice: 1150,
    dropFrom: ['crystal_spider', 'iron_sentinel'], dropChance: 7, minZone: 'mines'
  },
  witchwood_staff: {
    id: 'witchwood_staff', name: 'Witchwood Staff', icon: '🪄', slot: 'weapon', rarity: 'epic',
    description: 'Gậy gỗ phù thủy. Hồi MP định kỳ, phù hợp mage sustain.',
    stats: { atk: 10, maxMp: 45 }, effects: ['mp_regen_3t'],
    sellPrice: 330, buyPrice: 1050, dropFrom: ['briar_witch', 'scripture_mimic'], dropChance: 7, minZone: 'shrine'
  },
  molten_pickaxe: {
    id: 'molten_pickaxe', name: 'Molten Pickaxe', icon: '⛏️', slot: 'weapon', rarity: 'epic',
    description: 'Cuốc nung đỏ. Có cơ hội gây Burn khi đánh thường.',
    stats: { atk: 14, def: -2 }, effects: ['burn_on_hit'],
    sellPrice: 350, buyPrice: 1120, dropFrom: ['molten_jailer', 'slag_brute'], dropChance: 7, minZone: 'mines'
  },
  phantom_lance: {
    id: 'phantom_lance', name: 'Phantom Lance', icon: '👻', slot: 'weapon', rarity: 'epic',
    description: 'Thương bóng ma. ATK/DEF ổn và có cơ hội làm chậm khi dùng skill.',
    stats: { atk: 12, def: 5, maxMp: 10 }, effects: ['slow_on_skill'],
    sellPrice: 340, buyPrice: 1080, dropFrom: ['phantom', 'spirit_knight'], dropChance: 7, minZone: 'shrine'
  },
  briar_bow: {
    id: 'briar_bow', name: 'Briar Bow', icon: '🌿', slot: 'weapon', rarity: 'epic',
    description: 'Cung gai rừng sâu. Crit cao và có tỉ lệ bắn thêm.',
    stats: { atk: 12, critChance: 12 }, effects: ['extra_hit'],
    sellPrice: 340, buyPrice: 1060, dropFrom: ['thornhound', 'cursed_treant'], dropChance: 7, minZone: 'forest'
  },
  alpha_fang_dagger: {
    id: 'alpha_fang_dagger', name: 'Alpha Fang Dagger', icon: '🗡️', slot: 'weapon', rarity: 'epic',
    description: 'Dao găm khắc từ nanh Thornfang. Crit cao, hợp Rogue/Assassin sau khi vượt thử thách rừng.',
    stats: { atk: 13, critChance: 16 }, effects: ['dodge_on_crit'],
    sellPrice: 380, dropFrom: ['alpha_thornmaw'], dropChance: 12, minZone: 'forest'
  },
  bellbreaker_mace: {
    id: 'bellbreaker_mace', name: 'Bellbreaker Mace', icon: '🔔', slot: 'weapon', rarity: 'epic',
    description: 'Chùy phá chuông. Có tỉ lệ làm choáng enemy 1 lượt.',
    stats: { atk: 12, def: 4 }, effects: ['stun_on_hit'],
    sellPrice: 360, buyPrice: 1180, dropFrom: ['bell_wraith', 'shrine_guardian'], dropChance: 6, minZone: 'shrine'
  },

  serpentbite_daggers: {
    id: 'serpentbite_daggers', name: 'Serpentbite Daggers', icon: '🐍', slot: 'weapon', rarity: 'legendary',
    description: 'Song dao rắn độc. Crit cao và hút máu nhẹ.',
    stats: { atk: 16, critChance: 18, lifesteal: 5 },
    sellPrice: 650, dropFrom: ['glass_serpent', 'void_wraith'], dropChance: 5, minZone: 'wastes'
  },
  oathkeeper_blade: {
    id: 'oathkeeper_blade', name: 'Oathkeeper Blade', icon: '⚔️', slot: 'weapon', rarity: 'legendary',
    description: 'Kiếm thệ ước. Cân bằng ATK/DEF, đáng tin khi đánh boss.',
    stats: { atk: 16, def: 5 }, effects: ['boss_damage'],
    sellPrice: 680, dropFrom: ['mirror_knight', 'shrine_guardian'], dropChance: 5, minZone: 'shrine'
  },
  volcanic_greataxe: {
    id: 'volcanic_greataxe', name: 'Volcanic Greataxe', icon: '🌋', slot: 'weapon', rarity: 'legendary',
    description: 'Đại phủ núi lửa. ATK rất cao, có Burn, nhưng giảm DEF.',
    stats: { atk: 23, def: -5 }, effects: ['burn_on_hit'],
    sellPrice: 700, dropFrom: ['molten_jailer', 'mine_colossus'], dropChance: 5, minZone: 'mines'
  },
  oracle_staff: {
    id: 'oracle_staff', name: 'Oracle Staff', icon: '✨', slot: 'weapon', rarity: 'legendary',
    description: 'Gậy tiên tri. MP cao và hồi mana đều đặn.',
    stats: { atk: 14, maxMp: 70 }, effects: ['mp_regen_3t'],
    sellPrice: 660, dropFrom: ['pale_confessor', 'dust_prophet'], dropChance: 5, minZone: 'wastes'
  },
  mirror_edge: {
    id: 'mirror_edge', name: 'Mirror Edge', icon: '🪞', slot: 'weapon', rarity: 'legendary',
    description: 'Lưỡi kiếm phản chiếu. Sau khi né, đòn kế tiếp mạnh hơn.',
    stats: { atk: 17, dodgeChance: 8, critChance: 10 }, effects: ['dodge_then_dmg'],
    sellPrice: 680, dropFrom: ['mirror_knight', 'memory_moth'], dropChance: 5, minZone: 'wastes'
  },
  saint_lance: {
    id: 'saint_lance', name: 'Saint Lance', icon: '🌟', slot: 'weapon', rarity: 'legendary',
    description: 'Thánh thương. Tăng HP/DEF, hợp paladin/cleric đánh lâu.',
    stats: { atk: 14, def: 8, maxHp: 30 }, effects: ['potion_bonus'],
    sellPrice: 680, dropFrom: ['pale_confessor', 'shrine_guardian'], dropChance: 5, minZone: 'shrine'
  },

  nightfall_katana: {
    id: 'nightfall_katana', name: 'Nightfall Katana', icon: '🌘', slot: 'weapon', rarity: 'mythic',
    description: 'Katana màn đêm. Crit cực cao, khi HP thấp sẽ bùng sát thương.',
    stats: { atk: 27, critChance: 22 }, effects: ['low_hp_atk'],
    sellPrice: 1700, dropFrom: ['eclipse_reaver', 'the_forgotten'], dropChance: 4, minZone: 'wastes'
  },
  aurora_bow: {
    id: 'aurora_bow', name: 'Aurora Bow', icon: '🌈', slot: 'weapon', rarity: 'mythic',
    description: 'Cung cực quang. Star Damage và đánh boss tốt.',
    stats: { atk: 24, critChance: 12 }, effects: ['star_damage', 'boss_damage'],
    sellPrice: 1700, dropFrom: ['memory_moth', 'the_forgotten'], dropChance: 4, minZone: 'wastes'
  },
  chronicle_staff: {
    id: 'chronicle_staff', name: 'Chronicle Staff', icon: '📖', slot: 'weapon', rarity: 'mythic',
    description: 'Gậy biên niên. MP cực cao, hồi MP mỗi 3 lượt và hồi MP khi hạ gục.',
    stats: { atk: 19, maxMp: 95 }, effects: ['mp_regen_3t', 'kill_mp_regen'],
    sellPrice: 1750, dropFrom: ['dust_prophet', 'the_forgotten'], dropChance: 4, minZone: 'wastes'
  },
  titanbreaker_maul: {
    id: 'titanbreaker_maul', name: 'Titanbreaker Maul', icon: '🔨', slot: 'weapon', rarity: 'mythic',
    description: 'Đại chùy phá titan. ATK cao, có stun, thêm sát thương lên boss.',
    stats: { atk: 30, def: 8 }, effects: ['stun_on_hit', 'boss_damage'],
    sellPrice: 1900, dropFrom: ['mine_colossus', 'the_forgotten'], dropChance: 4, minZone: 'wastes'
  },

  parasite_dagger: {
    id: 'parasite_dagger', name: 'Parasite Dagger', icon: '🪱', slot: 'weapon', rarity: 'cursed',
    description: 'Dao ký sinh. Crit và lifesteal cao, nhưng mỗi lượt bị rút HP.',
    stats: { atk: 20, critChance: 20, lifesteal: 10 }, effects: ['curse_hp_drain'],
    sellPrice: 760, dropFrom: ['mind_leech', 'void_wraith'], dropChance: 4, minZone: 'wastes'
  },
  glass_rapier: {
    id: 'glass_rapier', name: 'Glass Rapier', icon: '🪞', slot: 'weapon', rarity: 'cursed',
    description: 'Kiếm thủy tinh. Crit rất cao nhưng mỏng manh, giảm HP tối đa.',
    stats: { atk: 24, critChance: 25, maxHp: -35 }, effects: ['dodge_then_dmg'],
    sellPrice: 780, dropFrom: ['glass_serpent', 'mirror_knight'], dropChance: 4, minZone: 'wastes'
  },
  famine_scythe: {
    id: 'famine_scythe', name: 'Famine Scythe', icon: '☠️', slot: 'weapon', rarity: 'cursed',
    description: 'Lưỡi hái đói khát. Giết enemy hồi HP, nhưng không thể dùng potion hồi máu.',
    stats: { atk: 27, lifesteal: 6 }, effects: ['kill_hp_regen', 'no_healing'],
    sellPrice: 820, dropFrom: ['abyss_fiend', 'the_forgotten'], dropChance: 3, minZone: 'wastes'
  },
  oathbreaker_blade: {
    id: 'oathbreaker_blade', name: 'Oathbreaker Blade', icon: '💔', slot: 'weapon', rarity: 'cursed',
    description: 'Kiếm phá thệ. Sát thương lớn, nhưng chết sẽ bị phạt gold nặng hơn.',
    stats: { atk: 31, def: -6 }, effects: ['debt_on_death'],
    sellPrice: 820, dropFrom: ['mirror_knight', 'the_forgotten'], dropChance: 3, minZone: 'wastes'
  },


  // ════════════════════════════════════════════════════
  //  ARMOR
  // ════════════════════════════════════════════════════

  cloth_armor: {
    id: 'cloth_armor', name: 'Cloth Armor', icon: '👕', slot: 'armor', rarity: 'common',
    description: 'Áo vải đơn giản.',
    stats: { maxHp: 10 }, sellPrice: 10, buyPrice: 30, minZone: 'village'
  },
  leather_armor: {
    id: 'leather_armor', name: 'Leather Armor', icon: '🥋', slot: 'armor', rarity: 'common',
    description: 'Giáp da nhẹ.',
    stats: { maxHp: 15, def: 1 }, sellPrice: 15, buyPrice: 40, minZone: 'village'
  },
  old_shield: {
    id: 'old_shield', name: 'Old Shield', icon: '🛡️', slot: 'armor', rarity: 'common',
    description: '5% giảm một nửa sát thương nhận vào.',
    stats: { def: 2 }, effects: ['block_one_crit'],
    sellPrice: 15, buyPrice: 40, minZone: 'village'
  },
  padded_vest: {
    id: 'padded_vest', name: 'Padded Vest', icon: '🥼', slot: 'armor', rarity: 'common',
    description: 'Áo đệm lót. HP cơ bản cho người mới.',
    stats: { maxHp: 20 }, sellPrice: 15, buyPrice: 55, minZone: 'village'
  },
  traveler_coat: {
    id: 'traveler_coat', name: 'Traveler Coat', icon: '🧥', slot: 'armor', rarity: 'common',
    description: 'Áo choàng lữ hành. HP và chút né đòn.',
    stats: { maxHp: 15, dodgeChance: 2 }, sellPrice: 18, buyPrice: 70, minZone: 'village'
  },
  scout_cloak: {
    id: 'scout_cloak', name: 'Scout Cloak', icon: '🥷', slot: 'armor', rarity: 'common',
    description: 'Áo choàng trinh sát cho Assassin đầu game. Tập trung né và crit.',
    stats: { maxHp: 10, dodgeChance: 3, critChance: 2 }, sellPrice: 20, buyPrice: 85, minZone: 'village'
  },
  wooden_buckler: {
    id: 'wooden_buckler', name: 'Wooden Buckler', icon: '🛡️', slot: 'armor', rarity: 'common',
    description: 'Khiên gỗ thô sơ nhưng đáng tin cậy.',
    stats: { def: 3 }, sellPrice: 18, buyPrice: 80, minZone: 'village'
  },
  apprentice_robe: {
    id: 'apprentice_robe', name: 'Apprentice Robe', icon: '👘', slot: 'armor', rarity: 'common',
    description: 'Áo choàng học viên. HP và MP đầu game.',
    stats: { maxHp: 10, maxMp: 15 }, sellPrice: 18, buyPrice: 75, minZone: 'village'
  },
  hunter_jacket: {
    id: 'hunter_jacket', name: 'Hunter Jacket', icon: '🥋', slot: 'armor', rarity: 'common',
    description: 'Áo khoác thợ săn. HP, DEF và chút crit.',
    stats: { maxHp: 15, def: 1, critChance: 3 }, sellPrice: 22, buyPrice: 90, minZone: 'forest'
  },
  iron_armor: {
    id: 'iron_armor', name: 'Iron Armor', icon: '🪖', slot: 'armor', rarity: 'rare',
    description: 'Giáp sắt cơ bản.',
    stats: { maxHp: 30, def: 4 }, setId: 'iron_set',
    sellPrice: 70, buyPrice: 170, minZone: 'forest'
  },
  hunter_cloak: {
    id: 'hunter_cloak', name: 'Hunter Cloak', icon: '🧥', slot: 'armor', rarity: 'rare',
    description: '+5% Dodge.',
    stats: { maxHp: 20, def: 2, dodgeChance: 5 },
    sellPrice: 80, dropFrom: ['cursed_wolf', 'vine_golem'], dropChance: 10, minZone: 'forest'
  },
  mage_robe: {
    id: 'mage_robe', name: 'Mage Robe', icon: '🧣', slot: 'armor', rarity: 'rare',
    description: 'Skill tốn MP ít hơn 5%.',
    stats: { maxHp: 15, maxMp: 20 },
    sellPrice: 80, buyPrice: 180, minZone: 'shrine'
  },
  guard_shield: {
    id: 'guard_shield', name: 'Guard Shield', icon: '🛡️', slot: 'armor', rarity: 'rare',
    description: 'Khi HP dưới 40%, giảm thêm 5% damage nhận vào.',
    stats: { def: 6 }, effects: ['block_one_crit'], setId: 'iron_set',
    sellPrice: 75, dropFrom: ['vine_golem'], dropChance: 10, minZone: 'forest'
  },
  steel_armor: {
    id: 'steel_armor', name: 'Steel Armor', icon: '🪖', slot: 'armor', rarity: 'rare',
    description: 'Giáp thép cứng cáp, cơ bản cho tank.',
    stats: { maxHp: 45, def: 7 }, sellPrice: 100, buyPrice: 320, minZone: 'mines'
  },
  knight_plate: {
    id: 'knight_plate', name: 'Knight Plate', icon: '⚔️', slot: 'armor', rarity: 'rare',
    description: 'Giáp hiệp sĩ nặng. Trâu nhưng ATK giảm nhẹ.',
    stats: { maxHp: 60, def: 10, atk: -2 }, sellPrice: 120, buyPrice: 420, minZone: 'mines'
  },
  runic_robe: {
    id: 'runic_robe', name: 'Runic Robe', icon: '🔮', slot: 'armor', rarity: 'rare',
    description: 'Áo rune cho mage. HP và MP.',
    stats: { maxHp: 25, maxMp: 45 }, sellPrice: 110, buyPrice: 380, minZone: 'shrine'
  },
  ranger_cloak: {
    id: 'ranger_cloak', name: 'Ranger Cloak', icon: '🧥', slot: 'armor', rarity: 'rare',
    description: 'Áo choàng kiểm lâm. HP, DEF và né đòn.',
    stats: { maxHp: 30, def: 5, dodgeChance: 7 }, sellPrice: 110, buyPrice: 360, minZone: 'forest'
  },
  medic_garb: {
    id: 'medic_garb', name: 'Medic Garb', icon: '➕', slot: 'armor', rarity: 'rare',
    description: 'Áo bào y tá. Potion hồi thêm hiệu quả.',
    stats: { maxHp: 35, def: 3 }, effects: ['potion_bonus'],
    sellPrice: 110, buyPrice: 340, minZone: 'shrine'
  },
  spiked_armor: {
    id: 'spiked_armor', name: 'Spiked Armor', icon: '⚙️', slot: 'armor', rarity: 'rare',
    description: 'Giáp gai — tấn công lẫn phòng thủ đều tốt.',
    stats: { maxHp: 40, def: 5, atk: 4 }, sellPrice: 120, buyPrice: 430, minZone: 'mines'
  },
  flameguard_armor: {
    id: 'flameguard_armor', name: 'Flameguard Armor', icon: '🔥', slot: 'armor', rarity: 'epic',
    description: 'Giảm damage từ Burn/Fire.',
    stats: { maxHp: 45, def: 6 },
    sellPrice: 200, dropFrom: ['cave_troll'], dropChance: 8, minZone: 'mines'
  },
  frostplate: {
    id: 'frostplate', name: 'Frostplate', icon: '🧊', slot: 'armor', rarity: 'epic',
    description: 'Enemy có 10% bị giảm ATK khi đánh bạn.',
    stats: { maxHp: 40, def: 8 },
    sellPrice: 200, dropFrom: ['cave_troll'], dropChance: 8, minZone: 'mines'
  },
  shadow_cloak: {
    id: 'shadow_cloak', name: 'Shadow Cloak', icon: '🌑', slot: 'armor', rarity: 'epic',
    description: '+10% Dodge. Khi né thành công, hồi 3 MP.',
    stats: { maxHp: 30, def: 4, dodgeChance: 10 }, effects: ['dodge_then_dmg'], setId: 'shadow_set',
    sellPrice: 220, dropFrom: ['shadow_bat'], dropChance: 8, minZone: 'mines'
  },
  blessed_robe: {
    id: 'blessed_robe', name: 'Blessed Robe', icon: '✨', slot: 'armor', rarity: 'epic',
    description: 'Healing nhận vào tăng 15%.',
    stats: { maxHp: 25, maxMp: 35 }, effects: ['potion_bonus'],
    sellPrice: 210, dropFrom: ['shrine_guardian'], dropChance: 10, minZone: 'shrine'
  },
  berserker_armor: {
    id: 'berserker_armor', name: 'Berserker Armor', icon: '😤', slot: 'armor', rarity: 'epic',
    description: 'Khi HP dưới 35%, ATK +12%.',
    stats: { maxHp: 50, def: 3 }, effects: ['low_hp_atk'],
    sellPrice: 220, dropFrom: ['mine_colossus'], dropChance: 8, minZone: 'mines'
  },
  emberguard_coat: {
    id: 'emberguard_coat', name: 'Emberguard Coat', icon: '🔥', slot: 'armor', rarity: 'epic',
    description: 'Áo lửa bảo vệ. HP và DEF chắc chắn.',
    stats: { maxHp: 65, def: 9 }, sellPrice: 250, buyPrice: 950, minZone: 'wastes'
  },
  frost_knight_plate: {
    id: 'frost_knight_plate', name: 'Frost Knight Plate', icon: '❄️', slot: 'armor', rarity: 'epic',
    description: 'Giáp hiệp sĩ băng. Giảm damage từ boss.',
    stats: { maxHp: 75, def: 12 }, effects: ['boss_dmg_redux'],
    sellPrice: 280, buyPrice: 1100, minZone: 'wastes'
  },
  shadow_mantle: {
    id: 'shadow_mantle', name: 'Shadow Mantle', icon: '🌑', slot: 'armor', rarity: 'epic',
    description: 'Áo choàng bóng tối. Né đòn cao vượt trội.',
    stats: { maxHp: 50, def: 6, dodgeChance: 12 }, sellPrice: 260, buyPrice: 1050, minZone: 'wastes'
  },
  archon_robe: {
    id: 'archon_robe', name: 'Archon Robe', icon: '🌀', slot: 'armor', rarity: 'epic',
    description: 'Áo pháp sư tối thượng. MP tái sinh theo lượt.',
    stats: { maxHp: 40, maxMp: 80 }, effects: ['mp_regen_3t'],
    sellPrice: 270, buyPrice: 1150, minZone: 'wastes'
  },
  berserker_harness: {
    id: 'berserker_harness', name: 'Berserker Harness', icon: '💢', slot: 'armor', rarity: 'epic',
    description: 'Dây đai berserker. Tấn công mạnh hơn khi gần chết.',
    stats: { maxHp: 55, def: 4 }, effects: ['low_hp_atk'],
    sellPrice: 270, buyPrice: 1200, minZone: 'wastes'
  },
  saint_guard_armor: {
    id: 'saint_guard_armor', name: 'Saint Guard Armor', icon: '✝️', slot: 'armor', rarity: 'epic',
    description: 'Giáp thánh. Chặn được một đòn chí mạng mỗi combat.',
    stats: { maxHp: 60, def: 11 }, effects: ['block_one_crit'],
    sellPrice: 290, buyPrice: 1300, minZone: 'wastes'
  },
  dragon_scale_armor: {
    id: 'dragon_scale_armor', name: 'Dragon Scale Armor', icon: '🐉', slot: 'armor', rarity: 'legendary',
    description: 'Giảm 15% damage từ boss.',
    stats: { maxHp: 80, def: 12 }, effects: ['boss_dmg_redux'], setId: 'dragon_set',
    sellPrice: 600, dropFrom: ['mine_colossus'], dropChance: 5, minZone: 'mines'
  },
  paladin_armor: {
    id: 'paladin_armor', name: 'Paladin Armor', icon: '⚔️', slot: 'armor', rarity: 'legendary',
    description: 'Mỗi combat có 1 lần chặn hoàn toàn đòn chí mạng.',
    stats: { maxHp: 70, def: 15 }, effects: ['block_one_crit'],
    sellPrice: 650, dropFrom: ['shrine_guardian'], dropChance: 5, minZone: 'shrine'
  },
  archmage_robe: {
    id: 'archmage_robe', name: 'Archmage Robe', icon: '🌟', slot: 'armor', rarity: 'legendary',
    description: 'Mỗi 3 lượt hồi 5 MP.',
    stats: { maxHp: 45, maxMp: 70 }, effects: ['mp_regen_3t'],
    sellPrice: 600, dropFrom: ['void_wraith'], dropChance: 6, minZone: 'wastes'
  },
  nightwalker_cloak: {
    id: 'nightwalker_cloak', name: 'Nightwalker Cloak', icon: '🌙', slot: 'armor', rarity: 'legendary',
    description: '+15% Dodge. Sau khi né, đòn tiếp theo +20% damage.',
    stats: { maxHp: 50, def: 7, dodgeChance: 12 }, effects: ['dodge_then_dmg'],
    sellPrice: 650, dropFrom: ['echo_demon'], dropChance: 6, minZone: 'shrine'
  },
  titan_shield: {
    id: 'titan_shield', name: 'Titan Shield', icon: '🛡️', slot: 'armor', rarity: 'legendary',
    description: 'Khi bị đánh, 15% phản lại một phần damage.',
    stats: { def: 20, atk: -5 }, effects: ['fear_on_hit'],
    sellPrice: 620, dropFrom: ['the_forgotten'], dropChance: 8, minZone: 'wastes'
  },
  armor_of_fallen_king: {
    id: 'armor_of_fallen_king', name: 'Armor of the Fallen King', icon: '👑', slot: 'armor', rarity: 'mythic',
    description: 'Khi HP dưới 25%, giảm 25% damage nhận vào.',
    stats: { maxHp: 120, def: 20 }, effects: ['boss_dmg_redux'],
    sellPrice: 2000, dropFrom: ['the_forgotten'], dropChance: 4, minZone: 'wastes'
  },
  celestial_robe: {
    id: 'celestial_robe', name: 'Celestial Robe', icon: '✨', slot: 'armor', rarity: 'mythic',
    description: 'Mỗi combat hồi sinh 1 lần với 20% HP.',
    stats: { maxHp: 70, maxMp: 100 }, effects: ['celestial_revive'], setId: 'celestial_set',
    sellPrice: 2200, dropFrom: ['the_forgotten'], dropChance: 4, minZone: 'wastes'
  },
  void_mantle: {
    id: 'void_mantle', name: 'Void Mantle', icon: '🌀', slot: 'armor', rarity: 'mythic',
    description: '20% vô hiệu hóa debuff.',
    stats: { maxHp: 90, def: 12 },
    sellPrice: 1800, dropFrom: ['the_forgotten'], dropChance: 4, minZone: 'wastes'
  },
  world_guardian_plate: {
    id: 'world_guardian_plate', name: 'World Guardian Plate', icon: '🌍', slot: 'armor', rarity: 'mythic',
    description: 'Nhận ít hơn 10% damage từ mọi nguồn. Nhưng giảm 10% damage gây ra.',
    stats: { maxHp: 150, def: 25, atk: -5 },
    sellPrice: 2500, dropFrom: ['the_forgotten'], dropChance: 3, minZone: 'wastes'
  },
  abyssal_armor: {
    id: 'abyssal_armor', name: 'Abyssal Armor', icon: '⚫', slot: 'armor', rarity: 'mythic',
    description: 'Khi bị đánh, 10% gây Fear khiến enemy mất lượt.',
    stats: { maxHp: 100, def: 18 }, effects: ['fear_on_hit'], setId: 'abyssal_set',
    sellPrice: 2000, dropFrom: ['the_forgotten'], dropChance: 4, minZone: 'wastes'
  },
  cursed_knight_armor: {
    id: 'cursed_knight_armor', name: 'Cursed Knight Armor', icon: '🔴', slot: 'armor', rarity: 'cursed',
    description: 'Mỗi lượt mất 2% HP. Khi HP < 30%, DEF tăng thêm 20%.',
    stats: { maxHp: 160, def: 25 }, effects: ['curse_hp_drain', 'low_hp_atk'],
    sellPrice: 900, dropFrom: ['the_forgotten'], dropChance: 3, minZone: 'wastes'
  },
  hollow_robe: {
    id: 'hollow_robe', name: 'Hollow Robe', icon: '👻', slot: 'armor', rarity: 'cursed',
    description: 'Max HP giảm 20%. Skill damage tăng 15%.',
    stats: { maxHp: -30, maxMp: 85 },
    sellPrice: 800, dropFrom: ['echo_demon'], dropChance: 5, minZone: 'shrine'
  },
  blood_armor: {
    id: 'blood_armor', name: 'Blood Armor', icon: '🩸', slot: 'armor', rarity: 'cursed',
    description: 'Mỗi lần giết enemy hồi 20% HP. Nhưng potion hồi ít hơn 50%.',
    stats: { maxHp: 90, def: 10 }, effects: ['blood_kill_regen'], setId: 'blood_set',
    sellPrice: 800, dropFrom: ['void_wraith'], dropChance: 5, minZone: 'wastes'
  },
  armor_of_regret: {
    id: 'armor_of_regret', name: 'Armor of Regret', icon: '😔', slot: 'armor', rarity: 'cursed',
    description: 'Không thể chạy trốn. Nếu chết, legacy tạo ra mạnh hơn.',
    stats: { maxHp: 200 }, effects: ['armor_of_regret'],
    sellPrice: 1000, dropFrom: ['the_forgotten'], dropChance: 3, minZone: 'wastes'
  },
  armor_of_debt: {
    id: 'armor_of_debt', name: 'Armor of Debt', icon: '💸', slot: 'armor', rarity: 'cursed',
    description: 'DEF khủng khiếp nhưng khi chết mất 20% vàng trong kho.',
    stats: { maxHp: 100, def: 22 }, effects: ['debt_on_death'],
    sellPrice: 550, dropFrom: ['the_forgotten', 'void_wraith'], dropChance: 3, minZone: 'wastes'
  },
  blood_pact_armor: {
    id: 'blood_pact_armor', name: 'Blood Pact Armor', icon: '🩸', slot: 'armor', rarity: 'cursed',
    description: 'Mỗi lần giết hồi nhiều HP, nhưng không dùng được potion.',
    stats: { maxHp: 70, def: 10 }, effects: ['blood_kill_regen', 'no_healing'],
    sellPrice: 650, dropFrom: ['echo_demon', 'void_wraith'], dropChance: 3, minZone: 'shrine'
  },
  hollow_plate: {
    id: 'hollow_plate', name: 'Hollow Plate', icon: '🪨', slot: 'armor', rarity: 'cursed',
    description: 'DEF cực cao nhưng ATK giảm và không thể chạy.',
    stats: { maxHp: 60, def: 30, atk: -8 }, effects: ['armor_of_regret'],
    sellPrice: 700, dropFrom: ['the_forgotten'], dropChance: 3, minZone: 'wastes'
  },
  robe_of_empty_moon: {
    id: 'robe_of_empty_moon', name: 'Robe of Empty Moon', icon: '🌚', slot: 'armor', rarity: 'cursed',
    description: 'MP rất cao nhưng hoàn toàn không thể hồi HP.',
    stats: { maxHp: 25, maxMp: 90 }, effects: ['no_healing'],
    sellPrice: 600, dropFrom: ['echo_demon'], dropChance: 4, minZone: 'shrine'
  },
  thorned_regret_armor: {
    id: 'thorned_regret_armor', name: 'Thorned Regret Armor', icon: '🥀', slot: 'armor', rarity: 'cursed',
    description: 'Mỗi lượt mất 3% HP. Khi HP cạn dần, ATK tăng mạnh.',
    stats: { maxHp: 120, def: 15 }, effects: ['curse_hp_drain', 'low_hp_atk'],
    sellPrice: 800, dropFrom: ['the_forgotten'], dropChance: 3, minZone: 'wastes'
  },

  // ════════════════════════════════════════════════════
  //  ACCESSORIES
  // ════════════════════════════════════════════════════

  copper_ring: {
    id: 'copper_ring', name: 'Copper Ring', icon: '💍', slot: 'accessory1', rarity: 'common',
    description: '+5 HP.',
    stats: { maxHp: 5 }, sellPrice: 8, buyPrice: 20, minZone: 'village'
  },
  mana_ring: {
    id: 'mana_ring', name: 'Mana Ring', icon: '🔵', slot: 'accessory1', rarity: 'common',
    description: '+10 MP.',
    stats: { maxMp: 10 }, sellPrice: 8, buyPrice: 20, minZone: 'village'
  },
  lucky_charm: {
    id: 'lucky_charm', name: 'Lucky Charm', icon: '🍀', slot: 'accessory1', rarity: 'common',
    description: '+3% gold nhận được.',
    stats: { goldBonus: 3 }, sellPrice: 10, buyPrice: 25, minZone: 'village'
  },
  wolf_tooth_necklace: {
    id: 'wolf_tooth_necklace', name: 'Wolf Tooth Necklace', icon: '🦷', slot: 'accessory1', rarity: 'common',
    description: '+3% Crit.',
    stats: { critChance: 3 }, sellPrice: 10,
    dropFrom: ['cursed_wolf'], dropChance: 15, minZone: 'forest'
  },
  small_amulet: {
    id: 'small_amulet', name: 'Small Amulet', icon: '📿', slot: 'accessory1', rarity: 'common',
    description: '+2 DEF.',
    stats: { def: 2 }, sellPrice: 8, buyPrice: 20, minZone: 'village'
  },
  bronze_charm: {
    id: 'bronze_charm', name: 'Bronze Charm', icon: '🟫', slot: 'accessory1', rarity: 'common',
    description: '+3 ATK nhỏ.',
    stats: { atk: 3 }, sellPrice: 12, buyPrice: 45, minZone: 'village'
  },
  tiny_mana_stone: {
    id: 'tiny_mana_stone', name: 'Tiny Mana Stone', icon: '💎', slot: 'accessory1', rarity: 'common',
    description: '+15 MP.',
    stats: { maxMp: 15 }, sellPrice: 13, buyPrice: 50, minZone: 'village'
  },
  rabbit_foot: {
    id: 'rabbit_foot', name: "Rabbit's Foot", icon: '🐾', slot: 'accessory1', rarity: 'common',
    description: '+4% Dodge.',
    stats: { dodgeChance: 4 }, sellPrice: 16, buyPrice: 65, minZone: 'village'
  },
  cracked_fang_ring: {
    id: 'cracked_fang_ring', name: 'Cracked Fang Ring', icon: '🦷', slot: 'accessory1', rarity: 'common',
    description: '+3% Crit, +2 ATK.',
    stats: { critChance: 3, atk: 2 }, sellPrice: 18, buyPrice: 70, minZone: 'village'
  },
  worker_badge: {
    id: 'worker_badge', name: 'Worker Badge', icon: '📛', slot: 'accessory1', rarity: 'common',
    description: '+5% EXP nhận được.',
    stats: { expBonus: 5 }, sellPrice: 20, buyPrice: 80, minZone: 'village'
  },
  adventurer_medal: {
    id: 'adventurer_medal', name: 'Adventurer Medal', icon: '🏅', slot: 'accessory1', rarity: 'rare',
    description: '+5 ATK, +10 HP.',
    stats: { atk: 5, maxHp: 10 }, sellPrice: 60, buyPrice: 220, minZone: 'forest'
  },
  ring_of_sharpness: {
    id: 'ring_of_sharpness', name: 'Ring of Sharpness', icon: '💍', slot: 'accessory1', rarity: 'rare',
    description: '+7 ATK.',
    stats: { atk: 7 }, sellPrice: 70, buyPrice: 260, minZone: 'forest'
  },
  scholar_pendant: {
    id: 'scholar_pendant', name: 'Scholar Pendant', icon: '📖', slot: 'accessory1', rarity: 'rare',
    description: '+40 MP, +5% EXP.',
    stats: { maxMp: 40, expBonus: 5 }, sellPrice: 75, buyPrice: 280, minZone: 'shrine'
  },
  lucky_silver_coin: {
    id: 'lucky_silver_coin', name: 'Lucky Silver Coin', icon: '🪙', slot: 'accessory1', rarity: 'rare',
    description: '+6% Gold, +5% EXP.',
    stats: { goldBonus: 6, expBonus: 5 }, sellPrice: 80, buyPrice: 300, minZone: 'village'
  },
  hunter_mark: {
    id: 'hunter_mark', name: 'Hunter Mark', icon: '🎯', slot: 'accessory1', rarity: 'rare',
    description: '+6% Crit, +3 ATK.',
    stats: { critChance: 6, atk: 3 }, sellPrice: 85, buyPrice: 320, minZone: 'forest'
  },
  evasion_charm: {
    id: 'evasion_charm', name: 'Evasion Charm', icon: '💨', slot: 'accessory1', rarity: 'rare',
    description: '+8% Dodge.',
    stats: { dodgeChance: 8 }, sellPrice: 88, buyPrice: 330, minZone: 'forest'
  },
  potion_belt: {
    id: 'potion_belt', name: 'Potion Belt', icon: '⚗️', slot: 'accessory1', rarity: 'rare',
    description: 'Potion hồi thêm 15%.',
    stats: { maxHp: 15 }, effects: ['potion_bonus'], sellPrice: 90, buyPrice: 350, minZone: 'shrine'
  },
  guard_emblem: {
    id: 'guard_emblem', name: 'Guard Emblem', icon: '🛡️', slot: 'accessory1', rarity: 'rare',
    description: '+4 DEF, +20 HP.',
    stats: { def: 4, maxHp: 20 }, sellPrice: 95, buyPrice: 360, minZone: 'mines'
  },
  bramble_antler_charm: {
    id: 'bramble_antler_charm', name: 'Bramble Antler Charm', icon: '🦌', slot: 'accessory1', rarity: 'epic',
    description: 'Mảnh gạc quấn gai của Elarok. Tăng sống sót khi đánh lâu trong rừng.',
    stats: { def: 6, maxHp: 35 }, effects: ['boss_dmg_redux'],
    sellPrice: 420, dropFrom: ['moss_crowned_stag'], dropChance: 12, minZone: 'forest'
  },
  ring_of_focus: {
    id: 'ring_of_focus', name: 'Ring of Focus', icon: '💫', slot: 'accessory1', rarity: 'epic',
    description: '+20 MP. Skill damage +5%.',
    stats: { maxMp: 20 },
    sellPrice: 200, dropFrom: ['phantom'], dropChance: 8, minZone: 'shrine'
  },
  charm_of_survival: {
    id: 'charm_of_survival', name: 'Charm of Survival', icon: '🛡️', slot: 'accessory1', rarity: 'epic',
    description: 'Khi HP < 20%, potion hồi thêm 20%.',
    stats: { maxHp: 25 }, effects: ['potion_bonus'],
    sellPrice: 200, dropFrom: ['vine_golem'], dropChance: 8, minZone: 'forest'
  },
  hunter_emblem: {
    id: 'hunter_emblem', name: 'Hunter Emblem', icon: '🎯', slot: 'accessory1', rarity: 'epic',
    description: '+8% Crit. Gây thêm damage lên quái thường.',
    stats: { critChance: 8 },
    sellPrice: 200, dropFrom: ['cursed_wolf', 'vine_golem'], dropChance: 8, minZone: 'forest'
  },
  merchant_coin: {
    id: 'merchant_coin', name: 'Merchant Coin', icon: '🪙', slot: 'accessory1', rarity: 'epic',
    description: 'Gold nhận được +10%. Trade tax giảm nhẹ.',
    stats: { goldBonus: 10 },
    sellPrice: 200, dropFrom: ['skeleton_archer'], dropChance: 8, minZone: 'shrine'
  },
  cursed_eye: {
    id: 'cursed_eye', name: 'Cursed Eye', icon: '👁️', slot: 'accessory1', rarity: 'epic',
    description: 'Tăng tỉ lệ gặp event hiếm nhưng cũng tăng tỉ lệ gặp bẫy.',
    stats: {}, setId: 'shadow_set',
    sellPrice: 180, dropFrom: ['phantom', 'shadow_bat'], dropChance: 8, minZone: 'shrine'
  },
  ring_of_second_breath: {
    id: 'ring_of_second_breath', name: 'Ring of Second Breath', icon: '💫', slot: 'accessory1', rarity: 'epic',
    description: 'Mỗi lần giết quái, hồi 5% HP.',
    stats: { maxHp: 30 }, effects: ['kill_hp_regen'],
    sellPrice: 220, buyPrice: 850, minZone: 'mines'
  },
  mana_loop: {
    id: 'mana_loop', name: 'Mana Loop', icon: '🔄', slot: 'accessory1', rarity: 'epic',
    description: '+50 MP. Tái sinh MP mỗi 3 lượt.',
    stats: { maxMp: 50 }, effects: ['mp_regen_3t'],
    sellPrice: 230, buyPrice: 900, minZone: 'shrine'
  },
  golden_scarab: {
    id: 'golden_scarab', name: 'Golden Scarab', icon: '🪲', slot: 'accessory1', rarity: 'epic',
    description: '+15% Gold nhận được.',
    stats: { goldBonus: 15 }, sellPrice: 240, buyPrice: 1000, minZone: 'mines'
  },
  crown_of_practice: {
    id: 'crown_of_practice', name: 'Crown of Practice', icon: '👑', slot: 'accessory1', rarity: 'epic',
    description: '+15% EXP nhận được.',
    stats: { expBonus: 15 }, sellPrice: 240, buyPrice: 1000, minZone: 'mines'
  },
  assassin_earring: {
    id: 'assassin_earring', name: 'Assassin Earring', icon: '💀', slot: 'accessory1', rarity: 'epic',
    description: '+10% Crit, +5 ATK.',
    stats: { critChance: 10, atk: 5 }, sellPrice: 250, buyPrice: 1100, minZone: 'wastes'
  },
  mist_charm: {
    id: 'mist_charm', name: 'Mist Charm', icon: '🌫️', slot: 'accessory1', rarity: 'epic',
    description: '+12% Dodge.',
    stats: { dodgeChance: 12 }, sellPrice: 245, buyPrice: 1050, minZone: 'wastes'
  },
  boss_hunter_badge: {
    id: 'boss_hunter_badge', name: 'Boss Hunter Badge', icon: '🏆', slot: 'accessory1', rarity: 'epic',
    description: 'Tăng damage lên boss.',
    stats: { atk: 6 }, effects: ['boss_damage'],
    sellPrice: 260, buyPrice: 1200, minZone: 'wastes'
  },
  dragonbone_talisman: {
    id: 'dragonbone_talisman', name: 'Dragonbone Talisman', icon: '🦴', slot: 'accessory1', rarity: 'epic',
    description: '+50 HP, +5 DEF.',
    stats: { maxHp: 50, def: 5 }, sellPrice: 270, buyPrice: 1300, minZone: 'wastes'
  },
  phoenix_feather: {
    id: 'phoenix_feather', name: 'Phoenix Feather', icon: '🔥', slot: 'accessory1', rarity: 'legendary',
    description: 'Mỗi ngày có 1 lần sống sót với 1 HP.',
    stats: {}, effects: ['revive_once'],
    sellPrice: 600, dropFrom: ['shrine_guardian'], dropChance: 5, minZone: 'shrine'
  },
  dragon_heart: {
    id: 'dragon_heart', name: 'Dragon Heart', icon: '❤️‍🔥', slot: 'accessory1', rarity: 'legendary',
    description: '+50 HP, +10 ATK. Boss damage +10%.',
    stats: { maxHp: 50, atk: 10 }, effects: ['boss_damage'], setId: 'dragon_set',
    sellPrice: 650, dropFrom: ['mine_colossus'], dropChance: 5, minZone: 'mines'
  },
  archmage_crystal: {
    id: 'archmage_crystal', name: 'Archmage Crystal', icon: '🔮', slot: 'accessory1', rarity: 'legendary',
    description: '+50 MP. MP regen +3 mỗi lượt.',
    stats: { maxMp: 45 }, effects: ['mp_regen_3t'],
    sellPrice: 600, dropFrom: ['echo_demon'], dropChance: 6, minZone: 'shrine'
  },
  ring_of_blood_pact: {
    id: 'ring_of_blood_pact', name: 'Ring of Blood Pact', icon: '🩸', slot: 'accessory1', rarity: 'legendary',
    description: 'Lifesteal +10%. Healing potion hồi ít hơn 20%.',
    stats: { lifesteal: 10 }, effects: ['no_healing'], setId: 'blood_set',
    sellPrice: 650, dropFrom: ['void_wraith'], dropChance: 6, minZone: 'wastes'
  },
  crown_fragment: {
    id: 'crown_fragment', name: 'Crown Fragment', icon: '👑', slot: 'accessory1', rarity: 'legendary',
    description: 'EXP +10%. Tăng cơ hội nhận Ancient Book.',
    stats: { expBonus: 10 },
    sellPrice: 600, dropFrom: ['the_forgotten'], dropChance: 8, minZone: 'wastes'
  },
  phoenix_pin: {
    id: 'phoenix_pin', name: 'Phoenix Pin', icon: '🔥', slot: 'accessory1', rarity: 'legendary',
    description: 'Sống sót một lần mỗi ngày với 1 HP. +20 HP.',
    stats: { maxHp: 20 }, effects: ['revive_once'],
    sellPrice: 800, buyPrice: 3000, minZone: 'wastes'
  },
  royal_tax_seal: {
    id: 'royal_tax_seal', name: 'Royal Tax Seal', icon: '📜', slot: 'accessory1', rarity: 'legendary',
    description: '+20% Gold. Nhưng mọi giao dịch mua bị tính thêm 5% phí.',
    stats: { goldBonus: 20 }, sellPrice: 750, buyPrice: 2800, minZone: 'wastes'
  },
  soul_merchant_coin: {
    id: 'soul_merchant_coin', name: 'Soul Merchant Coin', icon: '💰', slot: 'accessory1', rarity: 'legendary',
    description: '+25% Gold, +10% EXP.',
    stats: { goldBonus: 25, expBonus: 10 }, sellPrice: 900, buyPrice: 3500, minZone: 'wastes'
  },
  bell_of_silence: {
    id: 'bell_of_silence', name: 'Bell of Silence', icon: '🔔', slot: 'accessory1', rarity: 'legendary',
    description: 'Tăng khả năng chặn debuff. +30 MP.',
    stats: { maxMp: 30, maxHp: 30 }, sellPrice: 850, buyPrice: 3200, minZone: 'wastes'
  },
  eye_of_observer: {
    id: 'eye_of_observer', name: 'Eye of Observer', icon: '👁️', slot: 'accessory1', rarity: 'legendary',
    description: '+8% Crit, +8% Dodge. Nhìn thấu kẻ thù.',
    stats: { critChance: 8, dodgeChance: 8 }, sellPrice: 1000, buyPrice: 4000, minZone: 'wastes'
  },
  broken_crown_fragment: {
    id: 'broken_crown_fragment', name: 'Broken Crown Fragment', icon: '👑', slot: 'accessory1', rarity: 'legendary',
    description: '+20% EXP. Hồi HP khi giết quái boss.',
    stats: { expBonus: 20 }, effects: ['kill_hp_regen'],
    sellPrice: 1100, buyPrice: 4500, minZone: 'wastes'
  },
  soul_crown: {
    id: 'soul_crown', name: 'Soul Crown', icon: '💀', slot: 'accessory1', rarity: 'mythic',
    description: 'EXP +20%. Khi chết, giữ lại 20% gold.',
    stats: { expBonus: 20 },
    sellPrice: 2000, dropFrom: ['the_forgotten'], dropChance: 4, minZone: 'wastes'
  },
  timeworn_hourglass: {
    id: 'timeworn_hourglass', name: 'Timeworn Hourglass', icon: '⏳', slot: 'accessory1', rarity: 'mythic',
    description: 'Mỗi combat có 1 lần quay lại lượt trước.',
    stats: {},
    sellPrice: 2500, dropFrom: ['the_forgotten'], dropChance: 3, minZone: 'wastes'
  },
  gods_tear: {
    id: 'gods_tear', name: "God's Tear", icon: '💧', slot: 'accessory1', rarity: 'mythic',
    description: 'Healing +30%. Debuff duration giảm 1 lượt.',
    stats: {}, effects: ['potion_bonus'], setId: 'celestial_set',
    sellPrice: 2200, dropFrom: ['the_forgotten'], dropChance: 4, minZone: 'wastes'
  },
  void_core: {
    id: 'void_core', name: 'Void Core', icon: '🌀', slot: 'accessory1', rarity: 'mythic',
    description: 'Skill tốn MP ít hơn 20%. Nhưng max HP giảm 10%.',
    stats: { maxHp: -15 }, setId: 'abyssal_set',
    sellPrice: 2000, dropFrom: ['the_forgotten'], dropChance: 4, minZone: 'wastes'
  },
  legacy_pendant: {
    id: 'legacy_pendant', name: 'Legacy Pendant', icon: '📿', slot: 'accessory1', rarity: 'mythic',
    description: 'Khi gặp legacy, reward tăng mạnh.',
    stats: {},
    sellPrice: 1500, dropFrom: ['the_forgotten'], dropChance: 5, minZone: 'wastes'
  },

  mirror_ring_plus: {
    id: 'mirror_ring_plus', name: 'Mirror Ring+', icon: '💍', slot: 'accessory1', rarity: 'legendary',
    description: 'Nhẫn gương đã được khắc lại bằng mảnh kính linh hồn. Tăng crit, drop và làm ảo ảnh yếu hơn trong các trận boss.',
    stats: { critChance: 10, dropBonus: 6, maxMp: 30 }, effects: ['block_one_crit'],
    sellPrice: 760, dropFrom: ['echo_demon'], dropChance: 3, minZone: 'shrine'
  },
  warding_charm_plus: {
    id: 'warding_charm_plus', name: 'Warding Charm+', icon: '🧿', slot: 'accessory1', rarity: 'epic',
    description: 'Bùa hộ mệnh được phủ tro thánh. Tăng DEF/MP và giúp sống sót tốt hơn trước lời nguyền.',
    stats: { def: 5, maxMp: 35, dodgeChance: 4 }, effects: ['block_one_crit'],
    sellPrice: 520, minZone: 'shrine'
  },
  demon_fang_plus: {
    id: 'demon_fang_plus', name: 'Demon Fang+', icon: '😈', slot: 'weapon', rarity: 'cursed',
    description: 'Nanh quỷ được rèn lại bằng Echo Core. Sát thương cao, hút máu nhẹ, nhưng vẫn mang cảm giác lạnh của phong ấn.',
    stats: { atk: 27, critChance: 9, lifesteal: 6 }, effects: ['low_hp_atk'],
    sellPrice: 1100, dropFrom: ['echo_demon'], dropChance: 2, minZone: 'shrine'
  },
  shrine_cloak: {
    id: 'shrine_cloak', name: 'Shrine Cloak', icon: '⛩️', slot: 'armor', rarity: 'epic',
    description: 'Áo choàng may bằng vải cúng và bụi gương. Hợp cho build né và farm Đền Cổ.',
    stats: { maxHp: 45, def: 6, dodgeChance: 8, dropBonus: 4 },
    sellPrice: 560, dropFrom: ['wraith_priest', 'mirror_shade'], dropChance: 4, minZone: 'shrine'
  },
  echo_staff: {
    id: 'echo_staff', name: 'Echo Staff', icon: '🔮', slot: 'weapon', rarity: 'legendary',
    description: 'Trượng lặp lại tiếng chú văn cuối cùng. Tăng MP, EXP và sức đánh phép thuật.',
    stats: { atk: 21, maxMp: 70, expBonus: 8 }, effects: ['mp_regen_3t'],
    sellPrice: 820, dropFrom: ['echo_demon'], dropChance: 3, minZone: 'shrine'
  },


  // ── Mage progression expansion ─────────────────────────────────────────
  moonwater_wand: {
    id: 'moonwater_wand', name: 'Moonwater Wand', icon: '🌙', slot: 'weapon', rarity: 'rare',
    description: 'Đũa phép ngâm dưới ánh trăng. Dành cho pháp sư mới vào Đền Cổ: ATK vừa, MP ổn định.',
    stats: { atk: 7, maxMp: 28 }, effects: ['mp_regen_3t'],
    sellPrice: 120, buyPrice: 420, dropFrom: ['candle_wraith', 'shrine_watcher'], dropChance: 6, minZone: 'shrine'
  },
  sealbinder_circlet: {
    id: 'sealbinder_circlet', name: 'Sealbinder Circlet', icon: '👑', slot: 'accessory2', rarity: 'rare',
    description: 'Vòng trán khắc muối bạc. Tăng MP và giúp pháp sư giữ nhịp khi gặp lời nguyền.',
    stats: { maxMp: 26, def: 2, dodgeChance: 3 }, effects: ['block_one_crit'],
    sellPrice: 135, buyPrice: 520, dropFrom: ['shrine_watcher', 'possessed_relic'], dropChance: 5, minZone: 'shrine'
  },
  candle_sage_staff: {
    id: 'candle_sage_staff', name: 'Candle Sage Staff', icon: '🕯️', slot: 'weapon', rarity: 'epic',
    description: 'Trượng của hiền giả nến xanh. Mạnh hơn khi đi đường phép, hồi MP theo nhịp combat.',
    stats: { atk: 15, maxMp: 58, expBonus: 4 }, effects: ['mp_regen_3t'], setId: 'shrine_mage_set',
    sellPrice: 430, buyPrice: 1250, dropFrom: ['wraith_priest', 'candle_wraith'], dropChance: 4, minZone: 'shrine'
  },
  soul_candle_robe: {
    id: 'soul_candle_robe', name: 'Soul Candle Robe', icon: '🧥', slot: 'armor', rarity: 'epic',
    description: 'Áo choàng dệt bằng sợi khói nến. Ít giáp hơn plate, nhưng nhiều MP và né nhẹ.',
    stats: { maxHp: 48, maxMp: 68, def: 5, dodgeChance: 6 }, setId: 'shrine_mage_set',
    sellPrice: 420, buyPrice: 1180, dropFrom: ['wraith_priest', 'candle_wraith'], dropChance: 4, minZone: 'shrine'
  },
  mirror_focus_orb: {
    id: 'mirror_focus_orb', name: 'Mirror Focus Orb', icon: '🪞', slot: 'accessory1', rarity: 'epic',
    description: 'Quả cầu gương dùng để ổn định ma lực. Tăng crit phép, MP và tỉ lệ rơi vật phẩm Shrine.',
    stats: { critChance: 9, maxMp: 46, dropBonus: 5 }, effects: ['block_one_crit'], setId: 'shrine_mage_set',
    sellPrice: 460, buyPrice: 1320, dropFrom: ['mirror_shade', 'possessed_relic'], dropChance: 4, minZone: 'shrine'
  },
  echo_grimoire: {
    id: 'echo_grimoire', name: 'Echo Grimoire', icon: '📖', slot: 'weapon', rarity: 'legendary',
    description: 'Sách phép ghi lại âm cuối của Echo Demon. MP lớn, ATK phép cao và hồi MP sau khi hạ địch.',
    stats: { atk: 22, maxMp: 92, expBonus: 8 }, effects: ['kill_mp_regen'], setId: 'echo_mage_set',
    sellPrice: 920, dropFrom: ['echo_demon'], dropChance: 3, minZone: 'shrine'
  },
  voicebound_mantle: {
    id: 'voicebound_mantle', name: 'Voicebound Mantle', icon: '👘', slot: 'armor', rarity: 'legendary',
    description: 'Áo choàng giữ lại tiếng nói của kẻ bị phong ấn. Tăng MP, HP và giảm rủi ro bị áp đảo bởi boss.',
    stats: { maxHp: 80, maxMp: 88, def: 8 }, effects: ['boss_dmg_redux'], setId: 'echo_mage_set',
    sellPrice: 900, dropFrom: ['echo_demon'], dropChance: 3, minZone: 'shrine'
  },
  oracle_moon_ring: {
    id: 'oracle_moon_ring', name: 'Oracle Moon Ring', icon: '🌘', slot: 'accessory2', rarity: 'legendary',
    description: 'Nhẫn trăng non của pháp sư tiên tri. Tăng EXP, drop và giữ nhịp mana trong các trận dài.',
    stats: { maxMp: 55, expBonus: 10, dropBonus: 7 }, effects: ['mp_regen_3t'], setId: 'echo_mage_set',
    sellPrice: 860, dropFrom: ['echo_demon', 'mirror_shade'], dropChance: 3, minZone: 'shrine'
  },
  abyss_mage_codex: {
    id: 'abyss_mage_codex', name: 'Abyss Mage Codex', icon: '📕', slot: 'weapon', rarity: 'cursed',
    description: 'Cấm thư hút lời cầu nguyện thành mana. ATK/MP rất cao, nhưng không thể dùng potion hồi máu trong combat.',
    stats: { atk: 25, maxMp: 95, critChance: 8 }, effects: ['no_healing'],
    sellPrice: 780, dropFrom: ['echo_demon', 'void_wraith'], dropChance: 3, minZone: 'shrine'
  },

  // ── Special / Promo-only ─────────────────────────────────────────────────
  early_access_ring: {
    id: 'early_access_ring', name: 'Early Access Ring', icon: '💫', slot: 'accessory2', rarity: 'epic',
    description: 'Nhẫn dành cho những người khai sáng thế giới đầu tiên. **ATK +4, DEF +3, Max HP +25, EXP +8%**. Hồi **15% HP** sau mỗi lần hạ gục kẻ thù. Không thể mua hay đổi.',
    stats: { atk: 4, def: 3, maxHp: 25, expBonus: 8 },
    effects: ['kill_hp_regen'],
    sellPrice: 1,
  },

};

// ── Equipment balance v2 ────────────────────────────────────────────────────
export const EQUIPMENT_BALANCE_VERSION = 'equipment-v2';

const RARITY_POWER_ORDER: Record<Rarity, number> = {
  common: 1,
  rare: 2,
  epic: 3,
  legendary: 4,
  mythic: 5,
  cursed: 5,
};

const ZONE_POWER_ORDER: Record<string, number> = {
  village: 1,
  forest: 2,
  shrine: 3,
  mines: 4,
  wastes: 5,
};

const STAT_CAPS: Record<Rarity, Required<Pick<EquipStats,
  'atk' | 'def' | 'maxHp' | 'maxMp' | 'critChance' | 'dodgeChance' | 'lifesteal' | 'expBonus' | 'goldBonus' | 'dropBonus'
>>> = {
  common:    { atk: 6,  def: 4,  maxHp: 25,  maxMp: 20,  critChance: 5,  dodgeChance: 4,  lifesteal: 0,  expBonus: 5,  goldBonus: 5,  dropBonus: 3 },
  rare:      { atk: 11, def: 10, maxHp: 60,  maxMp: 45,  critChance: 12, dodgeChance: 8,  lifesteal: 3,  expBonus: 8,  goldBonus: 8,  dropBonus: 5 },
  epic:      { atk: 17, def: 14, maxHp: 85,  maxMp: 75,  critChance: 16, dodgeChance: 10, lifesteal: 6,  expBonus: 12, goldBonus: 12, dropBonus: 8 },
  legendary: { atk: 23, def: 18, maxHp: 110, maxMp: 95,  critChance: 18, dodgeChance: 12, lifesteal: 8,  expBonus: 15, goldBonus: 15, dropBonus: 10 },
  mythic:    { atk: 30, def: 24, maxHp: 150, maxMp: 110, critChance: 18, dodgeChance: 12, lifesteal: 10, expBonus: 15, goldBonus: 15, dropBonus: 12 },
  cursed:    { atk: 32, def: 26, maxHp: 150, maxMp: 95,  critChance: 20, dodgeChance: 10, lifesteal: 8,  expBonus: 12, goldBonus: 15, dropBonus: 8 },
};

const SLOT_STAT_MULTIPLIER: Record<EquipSlot, Partial<Record<keyof EquipStats, number>>> = {
  weapon:     { atk: 1.00, def: 0.55, maxHp: 0.40, maxMp: 0.70, critChance: 1.00, dodgeChance: 0.80, lifesteal: 1.00, expBonus: 0.75, goldBonus: 0.75, dropBonus: 0.75 },
  armor:      { atk: 0.45, def: 1.00, maxHp: 1.00, maxMp: 0.80, critChance: 0.55, dodgeChance: 0.90, lifesteal: 0.50, expBonus: 0.70, goldBonus: 0.70, dropBonus: 0.70 },
  accessory1: { atk: 0.55, def: 0.55, maxHp: 0.55, maxMp: 0.70, critChance: 0.80, dodgeChance: 0.80, lifesteal: 0.80, expBonus: 1.00, goldBonus: 1.00, dropBonus: 1.00 },
  accessory2: { atk: 0.55, def: 0.55, maxHp: 0.55, maxMp: 0.70, critChance: 0.80, dodgeChance: 0.80, lifesteal: 0.80, expBonus: 1.00, goldBonus: 1.00, dropBonus: 1.00 },
};

const LUCK_DROP_BONUS: Record<string, number> = {
  lucky_charm: 2,
  rabbit_foot: 2,
  lucky_silver_coin: 4,
  hunter_mark: 3,
  hunter_emblem: 5,
  merchant_coin: 4,
  golden_scarab: 6,
  boss_hunter_badge: 4,
  royal_tax_seal: 5,
  soul_merchant_coin: 6,
  crown_fragment: 5,
  broken_crown_fragment: 7,
  soul_crown: 7,
  legacy_pendant: 10,
};

function statCap(def: EquipmentDef, key: keyof EquipStats): number {
  const base = STAT_CAPS[def.rarity][key] ?? Number.POSITIVE_INFINITY;
  const mult = SLOT_STAT_MULTIPLIER[def.slot][key] ?? 1;
  return Math.max(0, Math.round(base * mult));
}

function clampSigned(value: number | undefined, cap: number): number | undefined {
  if (value === undefined || value === 0) return value;
  if (value > 0) return Math.min(value, cap);
  return value;
}

function cleanStats(stats: EquipStats): EquipStats {
  const out: EquipStats = {};
  for (const [key, value] of Object.entries(stats) as Array<[keyof EquipStats, number | undefined]>) {
    if (value === undefined || value === 0) continue;
    const rounded = Number.isInteger(value) ? value : Number(value.toFixed(2));
    if (rounded !== 0) (out as any)[key] = rounded;
  }
  return out;
}

function balanceEquipmentStats(def: EquipmentDef): EquipStats {
  const stats: EquipStats = { ...def.stats };

  if (LUCK_DROP_BONUS[def.id]) {
    stats.dropBonus = Math.max(stats.dropBonus ?? 0, LUCK_DROP_BONUS[def.id]);
  }

  for (const key of ['atk','def','maxHp','maxMp','critChance','dodgeChance','lifesteal','expBonus','goldBonus','dropBonus'] as Array<keyof EquipStats>) {
    const cap = statCap(def, key);
    (stats as any)[key] = clampSigned(stats[key], cap);
  }

  // High-impact effects are intentionally priced through slightly lower raw stats.
  const heavyEffects = new Set<EquipEffect>(['revive_once', 'celestial_revive', 'boss_damage', 'boss_dmg_redux', 'soul_stack']);
  const hasHeavyEffect = (def.effects ?? []).some(e => heavyEffects.has(e));
  if (hasHeavyEffect && def.rarity !== 'common') {
    if ((stats.atk ?? 0) > 0) stats.atk = Math.max(1, Math.floor((stats.atk ?? 0) * 0.92));
    if ((stats.def ?? 0) > 0) stats.def = Math.max(1, Math.floor((stats.def ?? 0) * 0.92));
    if ((stats.maxHp ?? 0) > 0) stats.maxHp = Math.max(5, Math.floor((stats.maxHp ?? 0) * 0.92));
  }

  // Cursed gear should feel powerful, but never become strictly better than mythic.
  if (def.rarity === 'cursed') {
    if ((stats.goldBonus ?? 0) > 0 && (stats.expBonus ?? 0) > 0) {
      stats.goldBonus = Math.min(stats.goldBonus ?? 0, 12);
      stats.expBonus = Math.min(stats.expBonus ?? 0, 8);
    }
  }

  return cleanStats(stats);
}

function normalizeEquipment(raw: Record<string, EquipmentDef>): Record<string, EquipmentDef> {
  const normalized: Record<string, EquipmentDef> = {};
  for (const [id, def] of Object.entries(raw)) {
    normalized[id] = {
      ...def,
      stats: balanceEquipmentStats(def),
    };
  }
  return normalized;
}

export const EQUIPMENT: Record<string, EquipmentDef> = normalizeEquipment(EQUIPMENT_RAW);

// ── Helpers ─────────────────────────────────────────────────────────────────
export const RARITY_COLORS: Record<Rarity, number> = {
  common:    0x9E9E9E,
  rare:      0x1565C0,
  epic:      0x6A1B9A,
  legendary: 0xFF6F00,
  mythic:    0xB71C1C,
  cursed:    0x4A0000,
};

export const RARITY_LABELS: Record<Rarity, string> = {
  common:    'Phổ thông',
  rare:      '🔵 Hiếm',
  epic:      '💜 Sử thi',
  legendary: '🟠 Huyền thoại',
  mythic:    '🔴 Thần thánh',
  cursed:    '⚫ Nguyền rủa',
};

export const SLOT_ICONS: Record<EquipSlot, string> = {
  weapon:     '⚔️',
  armor:      '🛡️',
  accessory1: '💍',
  accessory2: '📿',
};

export const SLOT_LABELS: Record<EquipSlot, string> = {
  weapon:     'Vũ Khí',
  armor:      'Giáp',
  accessory1: 'Phụ Kiện 1',
  accessory2: 'Phụ Kiện 2',


};

export function getEquipment(id: string): EquipmentDef | undefined {
  return EQUIPMENT[id];
}

export function equipmentProgressionScore(e: EquipmentDef): number {
  const zone = ZONE_POWER_ORDER[e.minZone ?? 'village'] ?? 1;
  const rarity = RARITY_POWER_ORDER[e.rarity] ?? 1;
  return zone * 100 + rarity * 10 + (e.buyPrice ?? e.sellPrice ?? 0) / 1000;
}

export function sortEquipmentForProgression(items: EquipmentDef[]): EquipmentDef[] {
  return [...items].sort((a, b) => {
    const zoneDiff = (ZONE_POWER_ORDER[a.minZone ?? 'village'] ?? 1) - (ZONE_POWER_ORDER[b.minZone ?? 'village'] ?? 1);
    if (zoneDiff !== 0) return zoneDiff;
    const rarityDiff = (RARITY_POWER_ORDER[a.rarity] ?? 1) - (RARITY_POWER_ORDER[b.rarity] ?? 1);
    if (rarityDiff !== 0) return rarityDiff;
    return (a.buyPrice ?? a.sellPrice ?? 0) - (b.buyPrice ?? b.sellPrice ?? 0);
  });
}

export function getZoneEquipment(zoneId: string): EquipmentDef[] {
  const zoneIdx = ZONE_POWER_ORDER[zoneId] ?? 1;
  return sortEquipmentForProgression(Object.values(EQUIPMENT).filter(e => {
    if (!e.buyPrice) return false;
    const minIdx = ZONE_POWER_ORDER[e.minZone ?? 'village'] ?? 1;
    return minIdx <= zoneIdx && e.rarity !== 'mythic' && e.rarity !== 'cursed';
  }));
}

export function getShopEquipment(zoneId: string, limit = 25): EquipmentDef[] {
  const zoneIdx = ZONE_POWER_ORDER[zoneId] ?? 1;
  const allowedRarityByZone: Record<number, Rarity[]> = {
    1: ['common'],
    2: ['common', 'rare'],
    3: ['rare', 'epic'],
    4: ['rare', 'epic'],
    5: ['epic', 'legendary'],
  };
  const allowed = new Set(allowedRarityByZone[zoneIdx] ?? ['common']);
  const pool = Object.values(EQUIPMENT).filter(e => {
    if (!e.buyPrice) return false;
    if (e.rarity === 'mythic' || e.rarity === 'cursed') return false;
    if (!allowed.has(e.rarity)) return false;
    const minIdx = ZONE_POWER_ORDER[e.minZone ?? 'village'] ?? 1;
    return minIdx <= zoneIdx;
  });
  return pool.sort((a, b) => {
    const az = ZONE_POWER_ORDER[a.minZone ?? 'village'] ?? 1;
    const bz = ZONE_POWER_ORDER[b.minZone ?? 'village'] ?? 1;
    // Shops prioritize gear from the current/latest unlocked zone, then older backup gear.
    if (az !== bz) return bz - az;
    const ar = RARITY_POWER_ORDER[a.rarity] ?? 1;
    const br = RARITY_POWER_ORDER[b.rarity] ?? 1;
    if (ar !== br) return ar - br;
    const slotOrder: Record<EquipSlot, number> = { weapon: 1, armor: 2, accessory1: 3, accessory2: 4 };
    const slotDiff = slotOrder[a.slot] - slotOrder[b.slot];
    if (slotDiff !== 0) return slotDiff;
    return (a.buyPrice ?? a.sellPrice ?? 0) - (b.buyPrice ?? b.sellPrice ?? 0);
  }).slice(0, limit);
}

/** Get active set bonuses for a list of worn equipment IDs */
export function getSetBonuses(wornIds: string[]): { stats: EquipStats; effects: EquipEffect[] } {
  const result: EquipStats = {};
  const effects: EquipEffect[] = [];

  for (const set of Object.values(SETS)) {
    const count = set.pieces.filter(p => wornIds.includes(p)).length;
    if (count >= 2) {
      Object.entries(set.bonus2).forEach(([k, v]) => {
        if (k === 'effects') { (v as EquipEffect[]).forEach(e => effects.push(e)); return; }
        (result as any)[k] = ((result as any)[k] ?? 0) + v;
      });
    }
    if (count >= 3 && set.bonus3) {
      Object.entries(set.bonus3).forEach(([k, v]) => {
        if (k === 'effects') { (v as EquipEffect[]).forEach(e => effects.push(e)); return; }
        (result as any)[k] = ((result as any)[k] ?? 0) + v;
      });
    }
  }

  return { stats: result, effects };
}
