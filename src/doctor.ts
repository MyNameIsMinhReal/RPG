import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import { ENEMIES } from './data/enemies';
import { ZONES } from './data/zones';
import { ITEMS } from './data/items';
import { MATERIALS } from './data/materials';
import { SKILLS } from './data/skills';
import { PETS } from './data/pets';
import { CRAFT_RECIPES } from './data/recipes';
import { EQUIPMENT } from './data/equipment';
import { loadCommands, buildAliasMap } from './commands/registry';

export type Severity = 'error' | 'warn' | 'info';
export interface Issue { severity: Severity; context: string; message: string; }
export interface CheckGroup { name: string; issues: Issue[]; }

function itemExists(id: string): boolean {
  return !!(ITEMS[id] || MATERIALS[id] || EQUIPMENT[id]);
}

// ─────────────────────────────────────────────────────────────────────────────
// Group 1 — Game data integrity (also used by the startup fail-fast check)
// ─────────────────────────────────────────────────────────────────────────────
export function checkGameData(): Issue[] {
  const issues: Issue[] = [];
  const err  = (ctx: string, msg: string) => issues.push({ severity: 'error', context: ctx, message: msg });
  const warn = (ctx: string, msg: string) => issues.push({ severity: 'warn',  context: ctx, message: msg });

  // Enemies
  for (const [id, enemy] of Object.entries(ENEMIES)) {
    if (!Array.isArray(enemy.zones) || enemy.zones.length === 0) {
      warn(`Enemy "${id}"`, 'thiếu zones hoặc zones rỗng');
    } else {
      for (const zoneId of enemy.zones) {
        if (!ZONES[zoneId]) err(`Enemy "${id}" zones`, `zone "${zoneId}" không tồn tại trong ZONES`);
      }
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

  // Zones
  for (const [id, zone] of Object.entries(ZONES)) {
    if (!Array.isArray(zone.enemyIds)) {
      err(`Zone "${id}"`, 'enemyIds không phải array');
    } else {
      for (const enemyId of zone.enemyIds) {
        if (!ENEMIES[enemyId]) err(`Zone "${id}" enemyIds`, `enemy "${enemyId}" không tồn tại`);
      }
    }
    if (zone.bossId && !ENEMIES[zone.bossId]) {
      err(`Zone "${id}" bossId`, `enemy "${zone.bossId}" không tồn tại`);
    }
    if (!Array.isArray(zone.shopItems)) {
      err(`Zone "${id}"`, 'shopItems không phải array');
    } else {
      for (const itemId of zone.shopItems) {
        if (!ITEMS[itemId]) err(`Zone "${id}" shopItems`, `item "${itemId}" không tồn tại trong ITEMS`);
      }
    }
  }

  // Items: skill books
  for (const [id, item] of Object.entries(ITEMS)) {
    if (item.type === 'skill_book' && item.teachesSkill) {
      const skill = item.teachesSkill;
      if (!skill.startsWith('random_') && !SKILLS[skill]) {
        err(`Item "${id}" teachesSkill`, `skill "${skill}" không tồn tại trong SKILLS`);
      }
    }
  }

  // Pets: releaseItem
  for (const [id, pet] of Object.entries(PETS)) {
    if (pet.releaseItem && !itemExists(pet.releaseItem)) {
      err(`Pet "${id}" releaseItem`, `item "${pet.releaseItem}" không tồn tại`);
    }
  }

  // Craft recipes
  for (const recipe of CRAFT_RECIPES) {
    if (!itemExists(recipe.resultItemId)) {
      err(`Recipe "${recipe.id}" resultItemId`, `item "${recipe.resultItemId}" không tồn tại`);
    }
    if (!Array.isArray(recipe.ingredients)) {
      err(`Recipe "${recipe.id}"`, 'ingredients không phải array');
    } else {
      for (const ing of recipe.ingredients) {
        if (!itemExists(ing.itemId)) err(`Recipe "${recipe.id}" ingredient`, `item "${ing.itemId}" không tồn tại`);
      }
    }
  }

  return issues;
}

// ─────────────────────────────────────────────────────────────────────────────
// Group 2 — Database & schema
// ─────────────────────────────────────────────────────────────────────────────
const EXPECTED_TABLES = [
  'players', 'skill_pool', 'skill_loadout', 'inventory', 'world_state', 'event_log',
  'player_achievements', 'legacies', 'active_combats', 'equipment_worn', 'player_titles',
  'daily_quests', 'explore_pity', 'unlocked_recipes', 'player_factions', 'player_pets',
  'world_boss_state', 'world_boss_damage', 'active_duels', 'equipment_upgrades',
  'village_bounty_claims', 'player_buffs', 'clans', 'clan_members', 'clan_buffs',
  'clan_wars', 'clan_stocks', 'stock_holdings', 'stock_history', 'chapter_state',
  'chapter_progress', 'chapter_event_state', 'redeem_codes', 'used_codes', 'oak_event',
  'oak_participants', 'update_logs', 'update_logs_seen', 'parties', 'party_members',
  'event_chain_progress',
];

function checkDatabase(): Issue[] {
  const issues: Issue[] = [];
  const dbPath = process.env.RPG_DB_PATH || path.join(process.cwd(), 'rpg.db');

  if (dbPath !== ':memory:' && !fs.existsSync(dbPath)) {
    issues.push({ severity: 'info', context: 'Database', message: `"${dbPath}" chưa tồn tại — bot chưa chạy lần nào, bỏ qua kiểm tra DB.` });
    return issues;
  }

  let db: DatabaseSync;
  try {
    db = new DatabaseSync(dbPath);
  } catch (e) {
    issues.push({ severity: 'error', context: 'Database', message: `Không mở được DB: ${(e as Error).message}` });
    return issues;
  }

  try {
    // PRAGMA integrity_check
    const integrity = db.prepare('PRAGMA integrity_check').get() as { integrity_check?: string } | undefined;
    const integrityVal = integrity?.integrity_check ?? 'unknown';
    if (integrityVal !== 'ok') {
      issues.push({ severity: 'error', context: 'integrity_check', message: `DB báo lỗi: ${integrityVal}` });
    }

    // PRAGMA foreign_key_check
    const fkViolations = db.prepare('PRAGMA foreign_key_check').all() as unknown[];
    if (fkViolations.length > 0) {
      issues.push({ severity: 'error', context: 'foreign_key_check', message: `${fkViolations.length} vi phạm khóa ngoại` });
    }

    // Table presence
    const rows = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as { name: string }[];
    const present = new Set(rows.map(r => r.name));
    const missing = EXPECTED_TABLES.filter(t => !present.has(t));
    if (missing.length > 0) {
      issues.push({ severity: 'error', context: 'Schema', message: `Thiếu ${missing.length} bảng: ${missing.join(', ')}` });
    }

    // Orphan rows: inventory.item_id not in any data table
    if (present.has('inventory')) {
      const invIds = db.prepare('SELECT DISTINCT item_id FROM inventory').all() as { item_id: string }[];
      const orphans = invIds.map(r => r.item_id).filter(id => !itemExists(id));
      if (orphans.length > 0) {
        issues.push({ severity: 'warn', context: 'inventory', message: `${orphans.length} item_id mồ côi (không có trong data): ${orphans.slice(0, 10).join(', ')}${orphans.length > 10 ? '…' : ''}` });
      }
    }

    // Orphan rows: players.zone_id not in ZONES
    if (present.has('players')) {
      const zoneIds = db.prepare('SELECT DISTINCT zone_id FROM players').all() as { zone_id: string }[];
      const badZones = zoneIds.map(r => r.zone_id).filter(z => z && !ZONES[z]);
      if (badZones.length > 0) {
        issues.push({ severity: 'warn', context: 'players', message: `player ở zone không tồn tại: ${badZones.join(', ')}` });
      }
    }

    if (issues.length === 0) {
      issues.push({ severity: 'info', context: 'Database', message: `OK — integrity ok, ${present.size} bảng, không có hàng mồ côi.` });
    }
  } finally {
    db.close();
  }

  return issues;
}

// ─────────────────────────────────────────────────────────────────────────────
// Group 3 — Config / environment
// ─────────────────────────────────────────────────────────────────────────────
function checkConfig(): Issue[] {
  const issues: Issue[] = [];
  for (const key of ['DISCORD_TOKEN', 'CLIENT_ID']) {
    if (!process.env[key]) issues.push({ severity: 'error', context: 'env', message: `Thiếu biến bắt buộc ${key}` });
  }
  if (!process.env.GUILD_ID) {
    issues.push({ severity: 'info', context: 'env', message: 'GUILD_ID trống — lệnh sẽ deploy global (chậm cập nhật ~1h).' });
  }
  if (!process.env.BOT_ADMIN_IDS) {
    issues.push({ severity: 'warn', context: 'env', message: 'BOT_ADMIN_IDS trống — không ai dùng được lệnh /admin.' });
  }
  if (!fs.existsSync(path.join(process.cwd(), '.env.example'))) {
    issues.push({ severity: 'info', context: 'config', message: 'Chưa có .env.example — nên thêm để người khác biết cần biến gì.' });
  }
  if (issues.every(i => i.severity !== 'error')) {
    issues.unshift({ severity: 'info', context: 'env', message: 'Biến bắt buộc đầy đủ.' });
  }
  return issues;
}

// ─────────────────────────────────────────────────────────────────────────────
// Group 4 — Command registry consistency
// ─────────────────────────────────────────────────────────────────────────────
function checkRegistry(): Issue[] {
  const issues: Issue[] = [];
  const commands = loadCommands();
  issues.push({ severity: 'info', context: 'registry', message: `${commands.length} lệnh được nạp: ${commands.map(c => c.name).join(', ')}` });

  // Duplicate alias detection (buildAliasMap warns; here we surface as issues).
  const seen = new Map<string, string>();
  for (const cmd of commands) {
    for (const alias of cmd.aliases ?? []) {
      const key = alias.toLowerCase();
      if (seen.has(key) && seen.get(key) !== cmd.name) {
        issues.push({ severity: 'warn', context: 'alias', message: `Alias "${key}" trùng giữa "${seen.get(key)}" và "${cmd.name}"` });
      } else {
        seen.set(key, cmd.name);
      }
    }
    const desc = (cmd.data as { description?: string }).description;
    if (!desc) issues.push({ severity: 'warn', context: `Command "${cmd.name}"`, message: 'thiếu description' });
  }
  // Ensure buildAliasMap runs without throwing (catches structural problems).
  buildAliasMap(commands);
  return issues;
}

// ─────────────────────────────────────────────────────────────────────────────
// Reporting
// ─────────────────────────────────────────────────────────────────────────────
const ICON: Record<Severity, string> = { error: '❌', warn: '⚠️', info: 'ℹ️' };

function printReport(groups: CheckGroup[]): { errors: number; warns: number } {
  let errors = 0, warns = 0;
  for (const group of groups) {
    console.log(`\n=== ${group.name} ===`);
    if (group.issues.length === 0) {
      console.log('  ℹ️ (không có gì để báo)');
      continue;
    }
    for (const i of group.issues) {
      if (i.severity === 'error') errors++;
      if (i.severity === 'warn') warns++;
      console.log(`  ${ICON[i.severity]} [${i.context}] ${i.message}`);
    }
  }
  console.log(`\n──────────── Tổng: ${errors} lỗi, ${warns} cảnh báo ────────────`);
  return { errors, warns };
}

/** Light data-only check for bot startup. Logs a summary and exits the process
 *  with code 1 if any data ERROR is found (fail-fast — don't run on broken data). */
export function runStartupDataCheck(): void {
  const issues = checkGameData();
  const errors = issues.filter(i => i.severity === 'error');
  const warns  = issues.filter(i => i.severity === 'warn');
  if (errors.length === 0) {
    console.log(`[doctor] ✅ Data hợp lệ${warns.length ? ` (${warns.length} cảnh báo)` : ''}.`);
    for (const w of warns) console.warn(`  ⚠️ [${w.context}] ${w.message}`);
    return;
  }
  console.error(`[doctor] ❌ ${errors.length} lỗi data — dừng bot (fail-fast):`);
  for (const e of errors) console.error(`  ❌ [${e.context}] ${e.message}`);
  console.error('[doctor] Sửa data rồi chạy lại. Chạy `npm run doctor` để xem báo cáo đầy đủ.');
  process.exit(1);
}

/** Full diagnostic entrypoint for `npm run doctor`. */
function main(): void {
  const json = process.argv.includes('--json');
  const groups: CheckGroup[] = [
    { name: 'Data integrity', issues: checkGameData() },
    { name: 'Database & schema', issues: checkDatabase() },
    { name: 'Config / env', issues: checkConfig() },
    { name: 'Command registry', issues: checkRegistry() },
  ];

  const errors = groups.reduce((n, g) => n + g.issues.filter(i => i.severity === 'error').length, 0);
  const warns  = groups.reduce((n, g) => n + g.issues.filter(i => i.severity === 'warn').length, 0);

  if (json) {
    console.log(JSON.stringify({ groups, summary: { errors, warns } }, null, 2));
  } else {
    printReport(groups);
  }
  process.exit(errors > 0 ? 1 : 0);
}

// Run main() only when invoked directly (not when imported for startup check).
if (require.main === module) {
  main();
}
