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
  abyssal_set: {
    id: 'abyssal_set', name: 'Abyssal Set',
    pieces: ['abyssal_scythe', 'abyssal_armor', 'void_core'],
    bonus2: { effects: ['kill_mp_regen'] },
    bonus3: { effects: ['soul_stack'] }
  }
};

// ── Equipment definitions ─────────────────────────────────────────────────────
export const EQUIPMENT: Record<string, EquipmentDef> = {

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

  // ── Legendary weapons ─────────────────────────────
  dragon_slayer: {
    id: 'dragon_slayer', name: 'Dragon Slayer', icon: '🐉', slot: 'weapon', rarity: 'legendary',
    description: 'Gây thêm 20% damage lên boss.',
    stats: { atk: 20 }, effects: ['boss_damage'], setId: 'dragon_set',
    sellPrice: 600, dropFrom: ['mine_colossus', 'shrine_guardian'], dropChance: 5, minZone: 'mines'
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
    sellPrice: 550, dropFrom: ['echo_demon'], dropChance: 6, minZone: 'wastes'
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
    stats: { atk: 26, critChance: 20 }, effects: ['no_healing'],
    sellPrice: 800, dropFrom: ['echo_demon'], dropChance: 5, minZone: 'wastes'
  },
  soul_eater: {
    id: 'soul_eater', name: 'Soul Eater', icon: '💀', slot: 'weapon', rarity: 'cursed',
    description: 'Khi giết enemy, nhận Soul Stack (+1 ATK/stack). Mất khi chết.',
    stats: { atk: 22 }, effects: ['soul_stack'],
    sellPrice: 700, dropFrom: ['void_wraith', 'echo_demon'], dropChance: 5, minZone: 'wastes'
  },
  broken_hero_sword: {
    id: 'broken_hero_sword', name: 'Broken Hero Sword', icon: '⚔️', slot: 'weapon', rarity: 'cursed',
    description: '−30% max HP. Nếu thắng boss, cơ hội tiến hóa thành Legendary.',
    stats: { atk: 40, maxHp: -30 }, effects: ['broken_evolve'],
    sellPrice: 1200, dropFrom: ['the_forgotten'], dropChance: 3, minZone: 'wastes'
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
    stats: { maxHp: 55, def: 8, dodgeChance: 15 }, effects: ['dodge_then_dmg'],
    sellPrice: 650, dropFrom: ['echo_demon'], dropChance: 6, minZone: 'wastes'
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
    stats: { maxHp: -20, maxMp: 150 },
    sellPrice: 800, dropFrom: ['echo_demon'], dropChance: 5, minZone: 'wastes'
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
    stats: { maxMp: 50 }, effects: ['mp_regen_3t'],
    sellPrice: 600, dropFrom: ['echo_demon'], dropChance: 6, minZone: 'wastes'
  },
  ring_of_blood_pact: {
    id: 'ring_of_blood_pact', name: 'Ring of Blood Pact', icon: '🩸', slot: 'accessory1', rarity: 'legendary',
    description: 'Lifesteal +10%. Healing potion hồi ít hơn 20%.',
    stats: { lifesteal: 10 }, effects: ['no_healing'], setId: 'blood_set',
    sellPrice: 650, dropFrom: ['void_wraith'], dropChance: 6, minZone: 'wastes'
  },
  crown_fragment: {
    id: 'crown_fragment', name: 'Crown Fragment', icon: '👑', slot: 'accessory1', rarity: 'legendary',
    description: 'EXP +10%. Tăng cơ hội nhận skill book.',
    stats: { expBonus: 10 },
    sellPrice: 600, dropFrom: ['the_forgotten'], dropChance: 8, minZone: 'wastes'
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
};

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

export function getZoneEquipment(zoneId: string): EquipmentDef[] {
  const order = ['village', 'forest', 'shrine', 'mines', 'wastes'];
  const zoneIdx = order.indexOf(zoneId);
  return Object.values(EQUIPMENT).filter(e => {
    if (!e.buyPrice) return false;
    const minIdx = order.indexOf(e.minZone ?? 'village');
    return minIdx <= zoneIdx && e.rarity !== 'mythic' && e.rarity !== 'cursed';
  });
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
