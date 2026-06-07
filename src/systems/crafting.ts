import db from '../database/index';
import { randInt } from '../utils/format';
import { getItemQty, removeItem, addItem } from './player';
import {
  CRAFT_RECIPES, getCraftingLevel, getLevelSuccessBonus,
  CRAFTING_LEVEL_THRESHOLDS, BASE_SUCCESS_RATE, CRAFT_EXP,
  type CraftRecipe
} from '../data/recipes';

// ── Recipe unlock ──────────────────────────────────────────────────────────
export function isRecipeUnlocked(userId: string, guildId: string, recipeId: string): boolean {
  const recipe = CRAFT_RECIPES.find(r => r.id === recipeId);
  if (!recipe) return false;
  if (!recipe.recipeRequired) return true; // default unlocked

  const row = db.prepare('SELECT 1 FROM unlocked_recipes WHERE user_id=? AND guild_id=? AND recipe_id=?')
    .get(userId, guildId, recipeId);
  return !!row;
}

export function unlockRecipe(userId: string, guildId: string, recipeId: string): boolean {
  if (isRecipeUnlocked(userId, guildId, recipeId)) return false;
  db.prepare('INSERT OR IGNORE INTO unlocked_recipes (user_id, guild_id, recipe_id) VALUES (?,?,?)')
    .run(userId, guildId, recipeId);
  return true;
}

export function getUnlockedRecipes(userId: string, guildId: string): string[] {
  const rows = db.prepare('SELECT recipe_id FROM unlocked_recipes WHERE user_id=? AND guild_id=?')
    .all(userId, guildId) as unknown as Array<{ recipe_id: string }>;
  return rows.map(r => r.recipe_id);
}

/** Unlock all default recipes for new player */
export function initDefaultRecipes(userId: string, guildId: string): void {
  const defaults = CRAFT_RECIPES.filter(r => !r.recipeRequired);
  for (const r of defaults) {
    db.prepare('INSERT OR IGNORE INTO unlocked_recipes (user_id, guild_id, recipe_id) VALUES (?,?,?)')
      .run(userId, guildId, r.id);
  }
}

/** Unlock all recipes tied to a specific source (boss, achievement) */
export function unlockRecipesBySource(userId: string, guildId: string, source: string): string[] {
  const toUnlock = CRAFT_RECIPES.filter(r => r.unlockedBy === source && r.recipeRequired);
  const unlocked: string[] = [];
  for (const r of toUnlock) {
    if (unlockRecipe(userId, guildId, r.id)) unlocked.push(r.id);
  }
  return unlocked;
}

// ── Ingredient check ────────────────────────────────────────────────────────
export interface IngredientStatus {
  itemId:   string;
  needed:   number;
  have:     number;
  enough:   boolean;
}

export function checkIngredients(
  userId: string, guildId: string, recipe: CraftRecipe, playerGold: number
): { canCraft: boolean; missing: IngredientStatus[]; goldOk: boolean } {
  const missing: IngredientStatus[] = [];
  let canCraft = true;

  for (const ing of recipe.ingredients) {
    const have    = getItemQty(userId, guildId, ing.itemId);
    const enough  = have >= ing.amount;
    if (!enough) canCraft = false;
    missing.push({ itemId: ing.itemId, needed: ing.amount, have, enough });
  }

  const goldOk = playerGold >= recipe.goldCost;
  if (!goldOk) canCraft = false;

  return { canCraft, missing, goldOk };
}

// ── Crafting level helpers ────────────────────────────────────────────────
export function getCraftingStats(userId: string, guildId: string): { exp: number; level: number } {
  const row = db.prepare('SELECT crafting_exp, crafting_level FROM players WHERE user_id=? AND guild_id=?')
    .get(userId, guildId) as unknown as { crafting_exp: number; crafting_level: number } | undefined;
  return { exp: row?.crafting_exp ?? 0, level: row?.crafting_level ?? 1 };
}

function addCraftingExp(userId: string, guildId: string, amount: number): { newExp: number; newLevel: number; leveledUp: boolean } {
  const { exp, level } = getCraftingStats(userId, guildId);
  const newExp   = exp + amount;
  const newLevel = getCraftingLevel(newExp);
  const leveledUp = newLevel > level;
  db.prepare('UPDATE players SET crafting_exp=?, crafting_level=? WHERE user_id=? AND guild_id=?')
    .run(newExp, newLevel, userId, guildId);
  return { newExp, newLevel, leveledUp };
}

// ── Craft attempt ──────────────────────────────────────────────────────────
export interface CraftResult {
  success:      boolean;
  leveledUp:    boolean;
  newCraftLevel:number;
  itemName:     string;
  lostMaterials:Array<{ itemId: string; lost: number }>;
  lostGold:     number;
}

export function attemptCraft(
  userId: string, guildId: string,
  recipe: CraftRecipe, playerGold: number
): CraftResult | null {
  const { canCraft } = checkIngredients(userId, guildId, recipe, playerGold);
  if (!canCraft) return null;

  const { level } = getCraftingStats(userId, guildId);
  const successBonus = getLevelSuccessBonus(level);
  const finalRate    = Math.min(100, recipe.successRate + successBonus);
  const roll         = randInt(1, 100);
  const success      = roll <= finalRate;

  const lostMaterials: Array<{ itemId: string; lost: number }> = [];

  if (success) {
    // Consume all materials
    for (const ing of recipe.ingredients) {
      removeItem(userId, guildId, ing.itemId, ing.amount);
      lostMaterials.push({ itemId: ing.itemId, lost: ing.amount });
    }
    // Consume gold
    db.prepare('UPDATE players SET gold = gold - ? WHERE user_id=? AND guild_id=?')
      .run(recipe.goldCost, userId, guildId);
    // Give result
    addItem(userId, guildId, recipe.resultItemId, recipe.resultAmount);
  } else {
    // Fail: consume all gold, 40% of each material
    db.prepare('UPDATE players SET gold = gold - ? WHERE user_id=? AND guild_id=?')
      .run(recipe.goldCost, userId, guildId);
    for (const ing of recipe.ingredients) {
      const lostAmt = Math.ceil(ing.amount * 0.4);
      removeItem(userId, guildId, ing.itemId, lostAmt);
      lostMaterials.push({ itemId: ing.itemId, lost: lostAmt });
    }
  }

  const { newLevel, leveledUp } = addCraftingExp(userId, guildId, recipe.craftingExp);
  return { success, leveledUp, newCraftLevel: newLevel, itemName: recipe.resultItemId, lostMaterials, lostGold: recipe.goldCost };
}
