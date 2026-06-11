import type { Rarity } from './equipment';

export interface CraftIngredient {
  itemId: string;
  amount: number;
}

export interface CraftRecipe {
  id:              string;
  resultItemId:    string;
  resultAmount:    number;
  category:        'weapon' | 'armor' | 'accessory' | 'potion' | 'material';
  resultRarity:    Rarity;
  goldCost:        number;
  levelRequired?:  number;
  successRate:     number;    // 0-100
  craftingExp:     number;
  ingredients:     CraftIngredient[];
  recipeRequired?: boolean;   // needs recipe scroll to unlock
  unlockedBy?:     string;    // 'default' | boss id | achievement id
}

// ── Success rates by rarity ───────────────────────────────────────────────
export const BASE_SUCCESS_RATE: Record<Rarity, number> = {
  common:    100,
  rare:      100,
  epic:      90,
  legendary: 75,
  mythic:    60,
  cursed:    55,
};

export const CRAFT_EXP: Record<Rarity, number> = {
  common:    5,
  rare:      15,
  epic:      40,
  legendary: 100,
  mythic:    200,
  cursed:    150,
};

export const CRAFTING_LEVEL_THRESHOLDS = [0, 100, 300, 700, 1500, 3000, 6000, 12000, 20000];

export function getCraftingLevel(exp: number): number {
  for (let i = CRAFTING_LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (exp >= CRAFTING_LEVEL_THRESHOLDS[i]) return i + 1;
  }
  return 1;
}

/** Crafting level bonus to success rate (+2% per level above 1) */
export function getLevelSuccessBonus(craftingLevel: number): number {
  return Math.max(0, (craftingLevel - 1) * 2);
}

// ── Recipes ───────────────────────────────────────────────────────────────
export const CRAFT_RECIPES: CraftRecipe[] = [

  // ════════════ WEAPONS ════════════════════════════════════════════════════

  // Common
  {
    id: 'craft_rusty_sword', resultItemId: 'rusty_sword', resultAmount: 1,
    category: 'weapon', resultRarity: 'common', goldCost: 20, levelRequired: 1,
    successRate: 100, craftingExp: 5,
    ingredients: [{ itemId: 'iron_ore', amount: 3 }, { itemId: 'wood', amount: 2 }],
    unlockedBy: 'default'
  },
  {
    id: 'craft_wooden_staff', resultItemId: 'wooden_staff', resultAmount: 1,
    category: 'weapon', resultRarity: 'common', goldCost: 15, levelRequired: 1,
    successRate: 100, craftingExp: 5,
    ingredients: [{ itemId: 'wood', amount: 5 }, { itemId: 'healing_herb', amount: 2 }],
    unlockedBy: 'default'
  },
  {
    id: 'craft_hunter_dagger', resultItemId: 'hunter_dagger', resultAmount: 1,
    category: 'weapon', resultRarity: 'common', goldCost: 25, levelRequired: 1,
    successRate: 100, craftingExp: 5,
    ingredients: [{ itemId: 'iron_ore', amount: 2 }, { itemId: 'leather', amount: 3 }],
    unlockedBy: 'default'
  },
  {
    id: 'craft_old_bow', resultItemId: 'old_bow', resultAmount: 1,
    category: 'weapon', resultRarity: 'common', goldCost: 20, levelRequired: 1,
    successRate: 100, craftingExp: 5,
    ingredients: [{ itemId: 'wood', amount: 6 }, { itemId: 'leather', amount: 2 }],
    unlockedBy: 'default'
  },

  // Rare
  {
    id: 'craft_iron_sword', resultItemId: 'iron_sword', resultAmount: 1,
    category: 'weapon', resultRarity: 'rare', goldCost: 150, levelRequired: 3,
    successRate: 100, craftingExp: 15,
    ingredients: [{ itemId: 'iron_ore', amount: 8 }, { itemId: 'wood', amount: 3 }],
    unlockedBy: 'default'
  },
  {
    id: 'craft_arcane_wand', resultItemId: 'arcane_wand', resultAmount: 1,
    category: 'weapon', resultRarity: 'rare', goldCost: 140, levelRequired: 3,
    successRate: 100, craftingExp: 15,
    ingredients: [{ itemId: 'mana_crystal', amount: 3 }, { itemId: 'wood', amount: 4 }, { itemId: 'silver_ore', amount: 2 }],
    unlockedBy: 'default'
  },
  {
    id: 'craft_assassin_dagger', resultItemId: 'assassin_dagger', resultAmount: 1,
    category: 'weapon', resultRarity: 'rare', goldCost: 160, levelRequired: 4,
    successRate: 100, craftingExp: 15,
    ingredients: [{ itemId: 'iron_ore', amount: 5 }, { itemId: 'shadow_essence', amount: 2 }, { itemId: 'leather', amount: 3 }],
    unlockedBy: 'default'
  },
  {
    id: 'craft_recurve_bow', resultItemId: 'recurve_bow', resultAmount: 1,
    category: 'weapon', resultRarity: 'rare', goldCost: 150, levelRequired: 3,
    successRate: 100, craftingExp: 15,
    ingredients: [{ itemId: 'wood', amount: 8 }, { itemId: 'leather', amount: 4 }, { itemId: 'wolf_fang', amount: 2 }],
    unlockedBy: 'default'
  },

  // Epic
  {
    id: 'craft_flameblade', resultItemId: 'flameblade', resultAmount: 1,
    category: 'weapon', resultRarity: 'epic', goldCost: 400, levelRequired: 6,
    successRate: 90, craftingExp: 40,
    ingredients: [{ itemId: 'iron_ore', amount: 10 }, { itemId: 'burning_core', amount: 3 }, { itemId: 'mana_crystal', amount: 2 }],
    recipeRequired: true, unlockedBy: 'mine_colossus'
  },
  {
    id: 'craft_shadow_dagger', resultItemId: 'shadow_dagger', resultAmount: 1,
    category: 'weapon', resultRarity: 'epic', goldCost: 380, levelRequired: 6,
    successRate: 90, craftingExp: 40,
    ingredients: [{ itemId: 'black_iron', amount: 3 }, { itemId: 'shadow_essence', amount: 5 }, { itemId: 'dark_wing', amount: 2 }],
    recipeRequired: true, unlockedBy: 'shrine_guardian'
  },
  {
    id: 'craft_frost_spear', resultItemId: 'frost_spear', resultAmount: 1,
    category: 'weapon', resultRarity: 'epic', goldCost: 370, levelRequired: 6,
    successRate: 90, craftingExp: 40,
    ingredients: [{ itemId: 'iron_ore', amount: 8 }, { itemId: 'frost_shard', amount: 4 }, { itemId: 'ancient_bone', amount: 3 }],
    recipeRequired: true, unlockedBy: 'shrine_guardian'
  },

  // Legendary
  {
    id: 'craft_dragon_slayer', resultItemId: 'dragon_slayer', resultAmount: 1,
    category: 'weapon', resultRarity: 'legendary', goldCost: 1200, levelRequired: 10,
    successRate: 75, craftingExp: 100,
    ingredients: [{ itemId: 'dragon_scale', amount: 5 }, { itemId: 'ancient_relic', amount: 3 }, { itemId: 'colossus_core', amount: 1 }],
    recipeRequired: true, unlockedBy: 'mine_colossus'
  },
  {
    id: 'craft_bloodfang_dagger', resultItemId: 'bloodfang_dagger', resultAmount: 1,
    category: 'weapon', resultRarity: 'legendary', goldCost: 1100, levelRequired: 9,
    successRate: 75, craftingExp: 100,
    ingredients: [{ itemId: 'abyss_core', amount: 2 }, { itemId: 'void_essence', amount: 4 }, { itemId: 'demon_seal', amount: 2 }],
    recipeRequired: true, unlockedBy: 'the_forgotten'
  },
  {
    id: 'craft_moonlight_katana', resultItemId: 'moonlight_katana', resultAmount: 1,
    category: 'weapon', resultRarity: 'legendary', goldCost: 1000, levelRequired: 9,
    successRate: 75, craftingExp: 100,
    ingredients: [{ itemId: 'fallen_star_fragment', amount: 2 }, { itemId: 'silver_ore', amount: 8 }, { itemId: 'mana_crystal', amount: 5 }],
    recipeRequired: true, unlockedBy: 'the_forgotten'
  },

  // Mythic
  {
    id: 'craft_eclipse_blade', resultItemId: 'eclipse_blade', resultAmount: 1,
    category: 'weapon', resultRarity: 'mythic', goldCost: 3000, levelRequired: 14,
    successRate: 60, craftingExp: 200,
    ingredients: [
      { itemId: 'dragon_scale', amount: 8 }, { itemId: 'fallen_star_fragment', amount: 4 },
      { itemId: 'abyss_core', amount: 3 }, { itemId: 'ancient_relic', amount: 2 }
    ],
    recipeRequired: true, unlockedBy: 'the_forgotten'
  },
  {
    id: 'craft_celestial_staff', resultItemId: 'celestial_staff', resultAmount: 1,
    category: 'weapon', resultRarity: 'mythic', goldCost: 2800, levelRequired: 13,
    successRate: 60, craftingExp: 200,
    ingredients: [
      { itemId: 'mana_crystal', amount: 10 }, { itemId: 'ancient_relic', amount: 4 },
      { itemId: 'fallen_star_fragment', amount: 3 }, { itemId: 'demon_seal', amount: 3 }
    ],
    recipeRequired: true, unlockedBy: 'the_forgotten'
  },

  // Cursed
  {
    id: 'craft_cursed_blade', resultItemId: 'cursed_blade', resultAmount: 1,
    category: 'weapon', resultRarity: 'cursed', goldCost: 800, levelRequired: 8,
    successRate: 55, craftingExp: 150,
    ingredients: [{ itemId: 'black_iron', amount: 6 }, { itemId: 'cursed_blood', amount: 4 }, { itemId: 'broken_soul', amount: 2 }],
    recipeRequired: true, unlockedBy: 'deaths_5'
  },
  {
    id: 'craft_demon_fang', resultItemId: 'demon_fang', resultAmount: 1,
    category: 'weapon', resultRarity: 'cursed', goldCost: 850, levelRequired: 9,
    successRate: 60, craftingExp: 150,
    ingredients: [
      { itemId: 'demon_horn', amount: 2 },
      { itemId: 'demon_seal', amount: 2 },
      { itemId: 'echo_core', amount: 1 },
      { itemId: 'curse_shard', amount: 3 }
    ],
    recipeRequired: true, unlockedBy: 'echo_demon'
  },
  {
    id: 'craft_soul_eater', resultItemId: 'soul_eater', resultAmount: 1,
    category: 'weapon', resultRarity: 'cursed', goldCost: 700, levelRequired: 8,
    successRate: 55, craftingExp: 150,
    ingredients: [{ itemId: 'broken_soul', amount: 4 }, { itemId: 'void_fragment', amount: 2 }, { itemId: 'void_essence', amount: 3 }],
    recipeRequired: true, unlockedBy: 'deaths_5'
  },


  // Forest Guardian recipes — mở sau khi hạ Ancient Oak
  {
    id: 'craft_alpha_fang_dagger', resultItemId: 'alpha_fang_dagger', resultAmount: 1,
    category: 'weapon', resultRarity: 'epic', goldCost: 520, levelRequired: 6,
    successRate: 88, craftingExp: 55,
    ingredients: [{ itemId: 'thornfang_fang', amount: 1 }, { itemId: 'ancient_bark', amount: 4 }, { itemId: 'leather', amount: 6 }, { itemId: 'curse_shard', amount: 1 }],
    recipeRequired: true, unlockedBy: 'ancient_oak'
  },

  // ════════════ ARMOR ════════════════════════════════════════════════════
  {
    id: 'craft_cloth_armor', resultItemId: 'cloth_armor', resultAmount: 1,
    category: 'armor', resultRarity: 'common', goldCost: 15, levelRequired: 1,
    successRate: 100, craftingExp: 5,
    ingredients: [{ itemId: 'leather', amount: 4 }, { itemId: 'healing_herb', amount: 2 }],
    unlockedBy: 'default'
  },
  {
    id: 'craft_leather_armor', resultItemId: 'leather_armor', resultAmount: 1,
    category: 'armor', resultRarity: 'common', goldCost: 25, levelRequired: 1,
    successRate: 100, craftingExp: 5,
    ingredients: [{ itemId: 'leather', amount: 6 }, { itemId: 'iron_ore', amount: 2 }],
    unlockedBy: 'default'
  },
  {
    id: 'craft_iron_armor', resultItemId: 'iron_armor', resultAmount: 1,
    category: 'armor', resultRarity: 'rare', goldCost: 160, levelRequired: 3,
    successRate: 100, craftingExp: 15,
    ingredients: [{ itemId: 'iron_ore', amount: 10 }, { itemId: 'leather', amount: 3 }],
    unlockedBy: 'default'
  },
  {
    id: 'craft_mage_robe', resultItemId: 'mage_robe', resultAmount: 1,
    category: 'armor', resultRarity: 'rare', goldCost: 150, levelRequired: 3,
    successRate: 100, craftingExp: 15,
    ingredients: [{ itemId: 'mana_crystal', amount: 4 }, { itemId: 'leather', amount: 3 }, { itemId: 'silver_ore', amount: 2 }],
    unlockedBy: 'default'
  },
  {
    id: 'craft_shadow_cloak', resultItemId: 'shadow_cloak', resultAmount: 1,
    category: 'armor', resultRarity: 'epic', goldCost: 400, levelRequired: 7,
    successRate: 90, craftingExp: 40,
    ingredients: [{ itemId: 'shadow_essence', amount: 6 }, { itemId: 'dark_wing', amount: 4 }, { itemId: 'leather', amount: 5 }],
    recipeRequired: true, unlockedBy: 'shrine_guardian'
  },
  {
    id: 'craft_flameguard_armor', resultItemId: 'flameguard_armor', resultAmount: 1,
    category: 'armor', resultRarity: 'epic', goldCost: 420, levelRequired: 7,
    successRate: 90, craftingExp: 40,
    ingredients: [{ itemId: 'iron_ore', amount: 12 }, { itemId: 'burning_core', amount: 4 }, { itemId: 'troll_hide', amount: 3 }],
    recipeRequired: true, unlockedBy: 'mine_colossus'
  },
  {
    id: 'craft_dragon_scale_armor', resultItemId: 'dragon_scale_armor', resultAmount: 1,
    category: 'armor', resultRarity: 'legendary', goldCost: 1300, levelRequired: 11,
    successRate: 75, craftingExp: 100,
    ingredients: [{ itemId: 'dragon_scale', amount: 6 }, { itemId: 'ancient_relic', amount: 2 }, { itemId: 'colossus_core', amount: 1 }],
    recipeRequired: true, unlockedBy: 'mine_colossus'
  },
  {
    id: 'craft_cursed_knight_armor', resultItemId: 'cursed_knight_armor', resultAmount: 1,
    category: 'armor', resultRarity: 'cursed', goldCost: 900, levelRequired: 9,
    successRate: 55, craftingExp: 150,
    ingredients: [{ itemId: 'black_iron', amount: 8 }, { itemId: 'cursed_blood', amount: 4 }, { itemId: 'void_fragment', amount: 3 }],
    recipeRequired: true, unlockedBy: 'deaths_5'
  },

  // ════════════ ACCESSORIES ═════════════════════════════════════════════
  {
    id: 'craft_copper_ring', resultItemId: 'copper_ring', resultAmount: 1,
    category: 'accessory', resultRarity: 'common', goldCost: 10, levelRequired: 1,
    successRate: 100, craftingExp: 5,
    ingredients: [{ itemId: 'iron_ore', amount: 2 }, { itemId: 'stone', amount: 2 }],
    unlockedBy: 'default'
  },
  {
    id: 'craft_mana_ring', resultItemId: 'mana_ring', resultAmount: 1,
    category: 'accessory', resultRarity: 'common', goldCost: 15, levelRequired: 1,
    successRate: 100, craftingExp: 5,
    ingredients: [{ itemId: 'mana_crystal', amount: 2 }, { itemId: 'silver_ore', amount: 1 }],
    unlockedBy: 'default'
  },
  {
    id: 'craft_lucky_charm', resultItemId: 'lucky_charm', resultAmount: 1,
    category: 'accessory', resultRarity: 'common', goldCost: 20, levelRequired: 1,
    successRate: 100, craftingExp: 5,
    ingredients: [{ itemId: 'healing_herb', amount: 3 }, { itemId: 'slime_core', amount: 2 }, { itemId: 'wolf_fang', amount: 1 }],
    unlockedBy: 'default'
  },

  {
    id: 'craft_bramble_antler_charm', resultItemId: 'bramble_antler_charm', resultAmount: 1,
    category: 'accessory', resultRarity: 'epic', goldCost: 500, levelRequired: 6,
    successRate: 88, craftingExp: 55,
    ingredients: [{ itemId: 'grove_crown_fragment', amount: 1 }, { itemId: 'ancient_bark', amount: 4 }, { itemId: 'rare_herb', amount: 4 }, { itemId: 'curse_shard', amount: 1 }],
    recipeRequired: true, unlockedBy: 'ancient_oak'
  },
  {
    id: 'craft_ring_of_focus', resultItemId: 'ring_of_focus', resultAmount: 1,
    category: 'accessory', resultRarity: 'epic', goldCost: 350, levelRequired: 6,
    successRate: 90, craftingExp: 40,
    ingredients: [{ itemId: 'mana_crystal', amount: 6 }, { itemId: 'silver_ore', amount: 4 }, { itemId: 'ectoplasm', amount: 3 }],
    recipeRequired: true, unlockedBy: 'shrine_guardian'
  },
  {
    id: 'craft_phoenix_feather', resultItemId: 'phoenix_feather', resultAmount: 1,
    category: 'accessory', resultRarity: 'legendary', goldCost: 1000, levelRequired: 10,
    successRate: 75, craftingExp: 100,
    ingredients: [{ itemId: 'fallen_star_fragment', amount: 2 }, { itemId: 'burning_core', amount: 4 }, { itemId: 'ancient_relic', amount: 2 }],
    recipeRequired: true, unlockedBy: 'the_forgotten'
  },
  {
    id: 'craft_dragon_heart_acc', resultItemId: 'dragon_heart', resultAmount: 1,
    category: 'accessory', resultRarity: 'legendary', goldCost: 1200, levelRequired: 11,
    successRate: 75, craftingExp: 100,
    ingredients: [{ itemId: 'dragon_heart_fragment', amount: 3 }, { itemId: 'dragon_scale', amount: 3 }, { itemId: 'colossus_core', amount: 1 }],
    recipeRequired: true, unlockedBy: 'mine_colossus'
  },
  {
    id: 'craft_void_core', resultItemId: 'void_core', resultAmount: 1,
    category: 'accessory', resultRarity: 'mythic', goldCost: 2500, levelRequired: 13,
    successRate: 60, craftingExp: 200,
    ingredients: [{ itemId: 'abyss_core', amount: 4 }, { itemId: 'void_fragment', amount: 4 }, { itemId: 'fallen_star_fragment', amount: 3 }],
    recipeRequired: true, unlockedBy: 'the_forgotten'
  },

  // ════════════ POTIONS ═════════════════════════════════════════════════
  {
    id: 'craft_health_potion', resultItemId: 'health_potion', resultAmount: 2,
    category: 'potion', resultRarity: 'common', goldCost: 10, levelRequired: 1,
    successRate: 100, craftingExp: 3,
    ingredients: [{ itemId: 'healing_herb', amount: 3 }, { itemId: 'slime_core', amount: 1 }],
    unlockedBy: 'default'
  },
  {
    id: 'craft_mana_potion', resultItemId: 'mana_potion', resultAmount: 2,
    category: 'potion', resultRarity: 'common', goldCost: 10, levelRequired: 1,
    successRate: 100, craftingExp: 3,
    ingredients: [{ itemId: 'mana_crystal', amount: 1 }, { itemId: 'healing_herb', amount: 2 }],
    unlockedBy: 'default'
  },
  {
    id: 'craft_elixir', resultItemId: 'elixir', resultAmount: 1,
    category: 'potion', resultRarity: 'rare', goldCost: 60, levelRequired: 4,
    successRate: 100, craftingExp: 12,
    ingredients: [{ itemId: 'healing_herb', amount: 5 }, { itemId: 'mana_crystal', amount: 2 }, { itemId: 'silver_ore', amount: 1 }],
    unlockedBy: 'default'
  },
  {
    id: 'craft_antidote', resultItemId: 'antidote', resultAmount: 2,
    category: 'potion', resultRarity: 'common', goldCost: 8, levelRequired: 1,
    successRate: 100, craftingExp: 3,
    ingredients: [{ itemId: 'healing_herb', amount: 2 }, { itemId: 'slime_core', amount: 2 }],
    unlockedBy: 'default'
  },

  // ════════════ MATERIAL PROCESSING ════════════════════════════════════
  {
    id: 'refine_iron', resultItemId: 'silver_ore', resultAmount: 1,
    category: 'material', resultRarity: 'rare', goldCost: 30, levelRequired: 2,
    successRate: 100, craftingExp: 8,
    ingredients: [{ itemId: 'iron_ore', amount: 5 }, { itemId: 'stone', amount: 3 }],
    unlockedBy: 'default'
  },

  // ════════════ EVENT MATERIAL RECIPES ══════════════════════════════════
  {
    id: 'craft_event_hunter_dagger', resultItemId: 'hunter_dagger', resultAmount: 1,
    category: 'weapon', resultRarity: 'common', goldCost: 35, levelRequired: 1,
    successRate: 100, craftingExp: 8,
    ingredients: [{ itemId: 'wolf_fang', amount: 2 }, { itemId: 'ancient_wood', amount: 2 }, { itemId: 'rusty_gear', amount: 1 }],
    unlockedBy: 'default'
  },
  {
    id: 'craft_rune_charm', resultItemId: 'rune_charm', resultAmount: 1,
    category: 'potion', resultRarity: 'rare', goldCost: 80, levelRequired: 3,
    successRate: 100, craftingExp: 15,
    ingredients: [{ itemId: 'broken_rune', amount: 2 }, { itemId: 'soul_dust', amount: 1 }, { itemId: 'mana_crystal', amount: 1 }],
    unlockedBy: 'default'
  },
  {
    id: 'craft_discount_token', resultItemId: 'discount_token', resultAmount: 1,
    category: 'material', resultRarity: 'rare', goldCost: 100, levelRequired: 2,
    successRate: 100, craftingExp: 14,
    ingredients: [{ itemId: 'merchant_seal', amount: 2 }, { itemId: 'rusty_gear', amount: 2 }],
    unlockedBy: 'default'
  },
  {
    id: 'craft_soul_dust', resultItemId: 'soul_dust', resultAmount: 1,
    category: 'material', resultRarity: 'rare', goldCost: 40, levelRequired: 2,
    successRate: 100, craftingExp: 10,
    ingredients: [{ itemId: 'ectoplasm', amount: 2 }, { itemId: 'broken_rune', amount: 1 }],
    unlockedBy: 'default'
  },
  {
    id: 'craft_black_market_token', resultItemId: 'black_market_token', resultAmount: 1,
    category: 'material', resultRarity: 'rare', goldCost: 120, levelRequired: 3,
    successRate: 100, craftingExp: 18,
    ingredients: [{ itemId: 'merchant_seal', amount: 1 }, { itemId: 'cursed_cloth', amount: 2 }, { itemId: 'soul_dust', amount: 1 }],
    unlockedBy: 'default'
  },

  {
    id: 'craft_weapon_oil', resultItemId: 'weapon_oil', resultAmount: 1,
    category: 'potion', resultRarity: 'common', goldCost: 35, levelRequired: 1,
    successRate: 100, craftingExp: 6,
    ingredients: [{ itemId: 'rusty_gear', amount: 1 }, { itemId: 'herb', amount: 2 }],
    unlockedBy: 'default'
  },
  {
    id: 'craft_armor_polish', resultItemId: 'armor_polish', resultAmount: 1,
    category: 'potion', resultRarity: 'common', goldCost: 35, levelRequired: 1,
    successRate: 100, craftingExp: 6,
    ingredients: [{ itemId: 'rusty_gear', amount: 1 }, { itemId: 'bone_glue', amount: 1 }],
    unlockedBy: 'default'
  },
  {
    id: 'craft_scroll_detection', resultItemId: 'scroll_detection', resultAmount: 1,
    category: 'potion', resultRarity: 'rare', goldCost: 90, levelRequired: 2,
    successRate: 100, craftingExp: 14,
    ingredients: [{ itemId: 'rune_ink', amount: 1 }, { itemId: 'broken_rune', amount: 1 }],
    unlockedBy: 'default'
  },
  {
    id: 'craft_scroll_silence', resultItemId: 'scroll_silence', resultAmount: 1,
    category: 'potion', resultRarity: 'rare', goldCost: 130, levelRequired: 3,
    successRate: 95, craftingExp: 18,
    ingredients: [{ itemId: 'rune_ink', amount: 2 }, { itemId: 'cursed_cloth', amount: 1 }, { itemId: 'broken_rune', amount: 1 }],
    unlockedBy: 'default'
  },
  {
    id: 'craft_bone_glue', resultItemId: 'bone_glue', resultAmount: 1,
    category: 'material', resultRarity: 'common', goldCost: 15, levelRequired: 1,
    successRate: 100, craftingExp: 4,
    ingredients: [{ itemId: 'bone_shard', amount: 2 }, { itemId: 'herb', amount: 1 }],
    unlockedBy: 'default'
  },
  {
    id: 'craft_rune_ink', resultItemId: 'rune_ink', resultAmount: 1,
    category: 'material', resultRarity: 'rare', goldCost: 45, levelRequired: 2,
    successRate: 100, craftingExp: 10,
    ingredients: [{ itemId: 'broken_rune', amount: 1 }, { itemId: 'mana_crystal', amount: 1 }],
    unlockedBy: 'default'
  },

  // ════════════ SPELL FRAGMENTS ════════════════════════════════════════════

  {
    id: 'craft_spell_fragment',
    resultItemId: 'spell_fragment', resultAmount: 1,
    category: 'material', resultRarity: 'common',
    goldCost: 10, levelRequired: 1, successRate: 100, craftingExp: 6,
    ingredients: [
      { itemId: 'healing_herb', amount: 5 },
      { itemId: 'beeswax', amount: 2 },
    ],
    unlockedBy: 'default'
  },
  {
    id: 'craft_rare_spell_fragment',
    resultItemId: 'rare_spell_fragment', resultAmount: 1,
    category: 'material', resultRarity: 'rare',
    goldCost: 40, levelRequired: 3, successRate: 85, craftingExp: 20,
    ingredients: [
      { itemId: 'dream_petal', amount: 2 },
      { itemId: 'spirit_essence', amount: 1 },
      { itemId: 'rare_herb', amount: 2 },
    ],
    unlockedBy: 'default'
  },

  // ════════════ ANCIENT BOOKS (fragment combining) ════════════════════════

  {
    id: 'craft_ancient_book_t1',
    resultItemId: 'ancient_book', resultAmount: 1,
    category: 'potion', resultRarity: 'common',
    goldCost: 30, levelRequired: 1, successRate: 100, craftingExp: 15,
    ingredients: [
      { itemId: 'spell_fragment', amount: 5 },
    ],
    unlockedBy: 'default'
  },
  {
    id: 'craft_ancient_book_t2',
    resultItemId: 'ancient_book', resultAmount: 1,
    category: 'potion', resultRarity: 'rare',
    goldCost: 80, levelRequired: 3, successRate: 100, craftingExp: 35,
    ingredients: [
      { itemId: 'rare_spell_fragment', amount: 3 },
    ],
    unlockedBy: 'default'
  },
  {
    id: 'craft_ancient_book_t3',
    resultItemId: 'ancient_book', resultAmount: 2,
    category: 'potion', resultRarity: 'epic',
    goldCost: 150, levelRequired: 5, successRate: 100, craftingExp: 80,
    ingredients: [
      { itemId: 'legendary_spell_fragment', amount: 1 },
    ],
    unlockedBy: 'default'
  },


  // Echo Demon upgrade recipes — mở sau khi phong ấn Echo Demon
  {
    id: 'craft_mirror_ring_plus', resultItemId: 'mirror_ring_plus', resultAmount: 1,
    category: 'accessory', resultRarity: 'legendary', goldCost: 1150, levelRequired: 9,
    successRate: 78, craftingExp: 105,
    ingredients: [
      { itemId: 'mirror_shard', amount: 6 }, { itemId: 'mirror_ring_fragment', amount: 1 },
      { itemId: 'echo_core', amount: 1 }, { itemId: 'shrine_relic', amount: 2 }
    ],
    recipeRequired: true, unlockedBy: 'echo_demon'
  },
  {
    id: 'craft_warding_charm_plus', resultItemId: 'warding_charm_plus', resultAmount: 1,
    category: 'accessory', resultRarity: 'epic', goldCost: 620, levelRequired: 8,
    successRate: 88, craftingExp: 60,
    ingredients: [
      { itemId: 'holy_ash', amount: 5 }, { itemId: 'purifying_salt', amount: 2 },
      { itemId: 'ancient_seal', amount: 1 }, { itemId: 'warding_charm', amount: 1 }
    ],
    recipeRequired: true, unlockedBy: 'echo_demon'
  },
  {
    id: 'craft_demon_fang_plus', resultItemId: 'demon_fang_plus', resultAmount: 1,
    category: 'weapon', resultRarity: 'cursed', goldCost: 1250, levelRequired: 10,
    successRate: 58, craftingExp: 160,
    ingredients: [
      { itemId: 'demon_fang', amount: 1 }, { itemId: 'demon_horn', amount: 2 },
      { itemId: 'demon_seal', amount: 2 }, { itemId: 'lost_memory', amount: 3 }, { itemId: 'echo_core', amount: 1 }
    ],
    recipeRequired: true, unlockedBy: 'echo_demon'
  },
  {
    id: 'craft_shrine_cloak', resultItemId: 'shrine_cloak', resultAmount: 1,
    category: 'armor', resultRarity: 'epic', goldCost: 720, levelRequired: 8,
    successRate: 86, craftingExp: 65,
    ingredients: [
      { itemId: 'cursed_cloth', amount: 4 }, { itemId: 'holy_ash', amount: 4 },
      { itemId: 'mirror_shard', amount: 2 }, { itemId: 'soul_candle', amount: 1 }
    ],
    recipeRequired: true, unlockedBy: 'echo_demon'
  },
  {
    id: 'craft_echo_staff', resultItemId: 'echo_staff', resultAmount: 1,
    category: 'weapon', resultRarity: 'legendary', goldCost: 1180, levelRequired: 9,
    successRate: 76, craftingExp: 110,
    ingredients: [
      { itemId: 'echo_core', amount: 2 }, { itemId: 'mana_crystal', amount: 8 },
      { itemId: 'ancient_seal', amount: 1 }, { itemId: 'lost_memory', amount: 2 }, { itemId: 'ancient_book', amount: 1 }
    ],
    recipeRequired: true, unlockedBy: 'echo_demon'
  },


  // Mage equipment recipes — pháp sư Đền Cổ
  {
    id: 'craft_moonwater_wand', resultItemId: 'moonwater_wand', resultAmount: 1,
    category: 'weapon', resultRarity: 'rare', goldCost: 260, levelRequired: 5,
    successRate: 100, craftingExp: 24,
    ingredients: [
      { itemId: 'mana_crystal', amount: 4 }, { itemId: 'silver_ore', amount: 3 },
      { itemId: 'moonwater', amount: 1 }, { itemId: 'wood', amount: 4 }
    ],
    unlockedBy: 'default'
  },
  {
    id: 'craft_sealbinder_circlet', resultItemId: 'sealbinder_circlet', resultAmount: 1,
    category: 'accessory', resultRarity: 'rare', goldCost: 300, levelRequired: 5,
    successRate: 100, craftingExp: 26,
    ingredients: [
      { itemId: 'silver_ore', amount: 4 }, { itemId: 'purifying_salt', amount: 1 },
      { itemId: 'holy_ash', amount: 2 }, { itemId: 'mana_crystal', amount: 2 }
    ],
    unlockedBy: 'default'
  },
  {
    id: 'craft_candle_sage_staff', resultItemId: 'candle_sage_staff', resultAmount: 1,
    category: 'weapon', resultRarity: 'epic', goldCost: 780, levelRequired: 8,
    successRate: 86, craftingExp: 70,
    ingredients: [
      { itemId: 'soul_candle', amount: 1 }, { itemId: 'holy_ash', amount: 5 },
      { itemId: 'mana_crystal', amount: 6 }, { itemId: 'silver_ore', amount: 4 }
    ],
    recipeRequired: true, unlockedBy: 'wraith_priest'
  },
  {
    id: 'craft_soul_candle_robe', resultItemId: 'soul_candle_robe', resultAmount: 1,
    category: 'armor', resultRarity: 'epic', goldCost: 760, levelRequired: 8,
    successRate: 86, craftingExp: 68,
    ingredients: [
      { itemId: 'soul_candle', amount: 1 }, { itemId: 'cursed_cloth', amount: 3 },
      { itemId: 'holy_ash', amount: 5 }, { itemId: 'moonwater', amount: 1 }
    ],
    recipeRequired: true, unlockedBy: 'wraith_priest'
  },
  {
    id: 'craft_mirror_focus_orb', resultItemId: 'mirror_focus_orb', resultAmount: 1,
    category: 'accessory', resultRarity: 'epic', goldCost: 820, levelRequired: 8,
    successRate: 84, craftingExp: 72,
    ingredients: [
      { itemId: 'mirror_sigil', amount: 1 }, { itemId: 'mirror_shard', amount: 5 },
      { itemId: 'mana_crystal', amount: 5 }, { itemId: 'mirror_ring_fragment', amount: 1 }
    ],
    recipeRequired: true, unlockedBy: 'mirror_shade'
  },
  {
    id: 'craft_echo_grimoire', resultItemId: 'echo_grimoire', resultAmount: 1,
    category: 'weapon', resultRarity: 'legendary', goldCost: 1400, levelRequired: 10,
    successRate: 74, craftingExp: 125,
    ingredients: [
      { itemId: 'echo_core', amount: 2 }, { itemId: 'lost_memory', amount: 3 },
      { itemId: 'ancient_book', amount: 1 }, { itemId: 'mana_crystal', amount: 10 }
    ],
    recipeRequired: true, unlockedBy: 'echo_demon'
  },
  {
    id: 'craft_voicebound_mantle', resultItemId: 'voicebound_mantle', resultAmount: 1,
    category: 'armor', resultRarity: 'legendary', goldCost: 1360, levelRequired: 10,
    successRate: 74, craftingExp: 120,
    ingredients: [
      { itemId: 'ancient_seal', amount: 1 }, { itemId: 'cursed_cloth', amount: 5 },
      { itemId: 'holy_ash', amount: 5 }, { itemId: 'echo_core', amount: 1 }
    ],
    recipeRequired: true, unlockedBy: 'echo_demon'
  },
  {
    id: 'craft_oracle_moon_ring', resultItemId: 'oracle_moon_ring', resultAmount: 1,
    category: 'accessory', resultRarity: 'legendary', goldCost: 1280, levelRequired: 10,
    successRate: 76, craftingExp: 118,
    ingredients: [
      { itemId: 'mirror_shard', amount: 6 }, { itemId: 'lost_memory', amount: 2 },
      { itemId: 'moonwater', amount: 2 }, { itemId: 'echo_core', amount: 1 }
    ],
    recipeRequired: true, unlockedBy: 'echo_demon'
  },
  {
    id: 'craft_abyss_mage_codex', resultItemId: 'abyss_mage_codex', resultAmount: 1,
    category: 'weapon', resultRarity: 'cursed', goldCost: 1160, levelRequired: 10,
    successRate: 58, craftingExp: 155,
    ingredients: [
      { itemId: 'echo_core', amount: 1 }, { itemId: 'curse_shard', amount: 5 },
      { itemId: 'cursed_blood', amount: 3 }, { itemId: 'lost_memory', amount: 3 }
    ],
    recipeRequired: true, unlockedBy: 'echo_demon'
  },

];

export function getRecipe(id: string): CraftRecipe | undefined {
  return CRAFT_RECIPES.find(r => r.id === id);
}

export function getRecipeByResult(resultItemId: string): CraftRecipe | undefined {
  return CRAFT_RECIPES.find(r => r.resultItemId === resultItemId);
}

export function getRecipesByCategory(category: CraftRecipe['category']): CraftRecipe[] {
  return CRAFT_RECIPES.filter(r => r.category === category);
}
