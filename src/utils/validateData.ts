import { ENEMIES } from '../data/enemies';
import { ZONES } from '../data/zones';
import { ITEMS } from '../data/items';
import { MATERIALS } from '../data/materials';
import { SKILLS } from '../data/skills';
import { PETS } from '../data/pets';
import { CRAFT_RECIPES } from '../data/recipes';
import { EQUIPMENT } from '../data/equipment';

interface Issue {
  severity: 'error' | 'warn';
  context: string;
  message: string;
}

function itemExists(id: string): boolean {
  return !!(ITEMS[id] || MATERIALS[id] || EQUIPMENT[id]);
}

export function validateGameData(): void {
  const issues: Issue[] = [];

  const err  = (ctx: string, msg: string) => issues.push({ severity: 'error', context: ctx, message: msg });
  const warn = (ctx: string, msg: string) => issues.push({ severity: 'warn',  context: ctx, message: msg });

  // ── Enemies ──────────────────────────────────────────────────────────────
  for (const [id, enemy] of Object.entries(ENEMIES)) {
    if (!Array.isArray(enemy.zones) || enemy.zones.length === 0) {
      warn(`Enemy "${id}"`, 'thiếu zones hoặc zones rỗng');
    }
    if (!Array.isArray(enemy.drops)) {
      err(`Enemy "${id}"`, 'drops không phải array');
    } else {
      for (const drop of enemy.drops) {
        if (!itemExists(drop.itemId)) {
          err(`Enemy "${id}" drop`, `itemId "${drop.itemId}" không tồn tại trong ITEMS/MATERIALS/EQUIPMENT`);
        }
      }
    }
    if (!Array.isArray(enemy.specialAttacks)) {
      warn(`Enemy "${id}"`, 'specialAttacks không phải array');
    }
  }

  // ── Zones ────────────────────────────────────────────────────────────────
  for (const [id, zone] of Object.entries(ZONES)) {
    if (!Array.isArray(zone.enemyIds)) {
      err(`Zone "${id}"`, 'enemyIds không phải array');
    } else {
      for (const enemyId of zone.enemyIds) {
        if (!ENEMIES[enemyId]) {
          err(`Zone "${id}" enemyIds`, `enemy "${enemyId}" không tồn tại`);
        }
      }
    }
    if (zone.bossId && !ENEMIES[zone.bossId]) {
      err(`Zone "${id}" bossId`, `enemy "${zone.bossId}" không tồn tại`);
    }
    if (!Array.isArray(zone.shopItems)) {
      err(`Zone "${id}"`, 'shopItems không phải array');
    } else {
      for (const itemId of zone.shopItems) {
        if (!ITEMS[itemId]) {
          err(`Zone "${id}" shopItems`, `item "${itemId}" không tồn tại trong ITEMS`);
        }
      }
    }
  }

  // ── Items: skill books ───────────────────────────────────────────────────
  for (const [id, item] of Object.entries(ITEMS)) {
    if (item.type === 'skill_book' && item.teachesSkill) {
      const skill = item.teachesSkill;
      // random_t1/t2/t3 là special — không cần check
      if (!skill.startsWith('random_') && !SKILLS[skill]) {
        err(`Item "${id}" teachesSkill`, `skill "${skill}" không tồn tại trong SKILLS`);
      }
    }
  }

  // ── Pets: releaseItem ────────────────────────────────────────────────────
  for (const [id, pet] of Object.entries(PETS)) {
    if (pet.releaseItem && !itemExists(pet.releaseItem)) {
      err(`Pet "${id}" releaseItem`, `item "${pet.releaseItem}" không tồn tại`);
    }
  }

  // ── Craft recipes ────────────────────────────────────────────────────────
  for (const recipe of CRAFT_RECIPES) {
    if (!itemExists(recipe.resultItemId)) {
      err(`Recipe "${recipe.id}" resultItemId`, `item "${recipe.resultItemId}" không tồn tại`);
    }
    if (!Array.isArray(recipe.ingredients)) {
      err(`Recipe "${recipe.id}"`, 'ingredients không phải array');
    } else {
      for (const ing of recipe.ingredients) {
        if (!itemExists(ing.itemId)) {
          err(`Recipe "${recipe.id}" ingredient`, `item "${ing.itemId}" không tồn tại`);
        }
      }
    }
  }

  // ── Report ───────────────────────────────────────────────────────────────
  if (issues.length === 0) {
    console.log('[validateData] ✅ Tất cả data hợp lệ.');
    return;
  }

  const errors = issues.filter(i => i.severity === 'error');
  const warns  = issues.filter(i => i.severity === 'warn');
  console.warn(`[validateData] ⚠️ ${errors.length} lỗi, ${warns.length} cảnh báo:`);
  for (const issue of issues) {
    const tag = issue.severity === 'error' ? '❌' : '⚠️';
    console.warn(`  ${tag} [${issue.context}] ${issue.message}`);
  }
}
