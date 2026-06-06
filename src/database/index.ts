import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';

const db = new DatabaseSync(path.join(process.cwd(), 'rpg.db'));

db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS players (
    user_id     TEXT NOT NULL,
    guild_id    TEXT NOT NULL,
    name        TEXT NOT NULL,
    alive       INTEGER DEFAULT 1,
    level       INTEGER DEFAULT 1,
    exp         INTEGER DEFAULT 0,
    exp_next    INTEGER DEFAULT 100,
    hp          INTEGER DEFAULT 100,
    max_hp      INTEGER DEFAULT 100,
    mp          INTEGER DEFAULT 50,
    max_mp      INTEGER DEFAULT 50,
    atk         INTEGER DEFAULT 10,
    def         INTEGER DEFAULT 5,
    gold        INTEGER DEFAULT 0,
    soul_shards INTEGER DEFAULT 0,
    zone_id     TEXT DEFAULT 'village',
    deaths      INTEGER DEFAULT 0,
    kills       INTEGER DEFAULT 0,
    created_at  INTEGER DEFAULT (unixepoch()),
    PRIMARY KEY (user_id, guild_id)
  );

  CREATE TABLE IF NOT EXISTS skill_pool (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     TEXT NOT NULL,
    guild_id    TEXT NOT NULL,
    skill_id    TEXT NOT NULL,
    learned_at  INTEGER DEFAULT (unixepoch()),
    UNIQUE(user_id, guild_id, skill_id)
  );

  CREATE TABLE IF NOT EXISTS skill_loadout (
    user_id     TEXT NOT NULL,
    guild_id    TEXT NOT NULL,
    slot        INTEGER NOT NULL,
    skill_id    TEXT NOT NULL,
    PRIMARY KEY (user_id, guild_id, slot)
  );

  CREATE TABLE IF NOT EXISTS inventory (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     TEXT NOT NULL,
    guild_id    TEXT NOT NULL,
    item_id     TEXT NOT NULL,
    quantity    INTEGER DEFAULT 1,
    UNIQUE(user_id, guild_id, item_id)
  );

  CREATE TABLE IF NOT EXISTS world_state (
    guild_id    TEXT NOT NULL,
    flag_key    TEXT NOT NULL,
    flag_value  TEXT NOT NULL,
    expires_at  INTEGER,
    created_at  INTEGER DEFAULT (unixepoch()),
    PRIMARY KEY (guild_id, flag_key)
  );

  CREATE TABLE IF NOT EXISTS event_log (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id    TEXT NOT NULL,
    user_id     TEXT NOT NULL,
    player_name TEXT NOT NULL,
    event_type  TEXT NOT NULL,
    description TEXT NOT NULL,
    zone_id     TEXT,
    created_at  INTEGER DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS player_achievements (
    user_id        TEXT NOT NULL,
    guild_id       TEXT NOT NULL,
    achievement_id TEXT NOT NULL,
    acquired_at    INTEGER DEFAULT (unixepoch()),
    PRIMARY KEY (user_id, guild_id, achievement_id)
  );

  CREATE TABLE IF NOT EXISTS legacies (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id        TEXT NOT NULL,
    user_id         TEXT NOT NULL,
    player_name     TEXT NOT NULL,
    zone_id         TEXT NOT NULL,
    legacy_skill_id TEXT,
    gold_left       INTEGER DEFAULT 0,
    deaths          INTEGER DEFAULT 1,
    claimed_by      TEXT,
    created_at      INTEGER DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS active_combats (
    message_id      TEXT PRIMARY KEY,
    channel_id      TEXT NOT NULL,
    user_id         TEXT NOT NULL,
    guild_id        TEXT NOT NULL,
    enemy_id        TEXT NOT NULL,
    enemy_name      TEXT NOT NULL,
    enemy_hp        INTEGER NOT NULL,
    enemy_max_hp    INTEGER NOT NULL,
    enemy_atk       INTEGER NOT NULL,
    enemy_def       INTEGER NOT NULL,
    player_hp       INTEGER NOT NULL,
    player_max_hp   INTEGER NOT NULL,
    player_mp       INTEGER NOT NULL,
    player_max_mp   INTEGER NOT NULL,
    turn            INTEGER DEFAULT 1,
    is_defending    INTEGER DEFAULT 0,
    active_effects  TEXT DEFAULT '[]',
    combat_log      TEXT DEFAULT '[]',
    created_at      INTEGER DEFAULT (unixepoch())
  );
`);

const playerColumns = db.prepare('PRAGMA table_info(players)').all();
if (!playerColumns.some((col: any) => col.name === 'last_explore')) {
  db.exec('ALTER TABLE players ADD COLUMN last_explore INTEGER DEFAULT 0');
}

if (!playerColumns.some((col: any) => col.name === 'reputation')) {
  db.exec('ALTER TABLE players ADD COLUMN reputation INTEGER DEFAULT 0');
}

export default db;

// ── Equipment & Title tables (added) ─────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS equipment_worn (
    user_id      TEXT NOT NULL,
    guild_id     TEXT NOT NULL,
    slot         TEXT NOT NULL,
    equipment_id TEXT NOT NULL,
    PRIMARY KEY (user_id, guild_id, slot)
  );

  CREATE TABLE IF NOT EXISTS player_titles (
    user_id    TEXT NOT NULL,
    guild_id   TEXT NOT NULL,
    title_id   TEXT NOT NULL,
    unlocked_at INTEGER DEFAULT (unixepoch()),
    PRIMARY KEY (user_id, guild_id, title_id)
  );
`);

// Add selected_title column if not exists (safe migration)
try {
  db.exec(`ALTER TABLE players ADD COLUMN selected_title TEXT DEFAULT NULL`);
} catch { /* column already exists */ }

db.exec(`
  CREATE TABLE IF NOT EXISTS daily_quests (
    user_id       TEXT NOT NULL,
    guild_id      TEXT NOT NULL,
    date          TEXT NOT NULL,
    explore_count INTEGER DEFAULT 0,
    explore_goal  INTEGER DEFAULT 5,
    kill_count    INTEGER DEFAULT 0,
    kill_goal     INTEGER DEFAULT 3,
    potion_used   INTEGER DEFAULT 0,
    potion_goal   INTEGER DEFAULT 1,
    claimed       INTEGER DEFAULT 0,
    PRIMARY KEY (user_id, guild_id, date)
  );
`);

// ── Crafting tables ───────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS unlocked_recipes (
    user_id     TEXT NOT NULL,
    guild_id    TEXT NOT NULL,
    recipe_id   TEXT NOT NULL,
    unlocked_at INTEGER DEFAULT (unixepoch()),
    PRIMARY KEY (user_id, guild_id, recipe_id)
  );
`);

try { db.exec(`ALTER TABLE players ADD COLUMN crafting_exp   INTEGER DEFAULT 0`); } catch {}
try { db.exec(`ALTER TABLE players ADD COLUMN crafting_level INTEGER DEFAULT 1`); } catch {}

// ── Stamina columns for active_combats ───────────────────────────────────
try { db.exec(`ALTER TABLE active_combats ADD COLUMN player_stamina     INTEGER DEFAULT 100`); } catch {}
try { db.exec(`ALTER TABLE active_combats ADD COLUMN player_max_stamina INTEGER DEFAULT 100`); } catch {}
// ── Group combat column ───────────────────────────────────────────────────
try { db.exec(`ALTER TABLE active_combats ADD COLUMN enemies_json TEXT DEFAULT NULL`); } catch {}

// ── Wanted / factions / soul perks / pets ────────────────────────────────
try { db.exec(`ALTER TABLE players ADD COLUMN wanted_level INTEGER DEFAULT 0`); } catch {}
try { db.exec(`ALTER TABLE players ADD COLUMN bonus_stat_points INTEGER DEFAULT 0`); } catch {}
try { db.exec(`ALTER TABLE players ADD COLUMN keep_item_charges INTEGER DEFAULT 0`); } catch {}
try { db.exec(`ALTER TABLE players ADD COLUMN extra_skill_slots INTEGER DEFAULT 0`); } catch {}
try { db.exec(`ALTER TABLE players ADD COLUMN death_penalty_reduction INTEGER DEFAULT 0`); } catch {}
try { db.exec(`ALTER TABLE players ADD COLUMN rebirth_blessing INTEGER DEFAULT 0`); } catch {}
try { db.exec(`ALTER TABLE players ADD COLUMN merchant_mercy INTEGER DEFAULT 0`); } catch {}

// World values are stored as flags, but these tables keep player-specific relationships.
db.exec(`
  CREATE TABLE IF NOT EXISTS player_factions (
    user_id       TEXT NOT NULL,
    guild_id      TEXT NOT NULL,
    faction_id    TEXT NOT NULL,
    reputation    INTEGER DEFAULT 0,
    updated_at    INTEGER DEFAULT (unixepoch()),
    PRIMARY KEY (user_id, guild_id, faction_id)
  );

  CREATE TABLE IF NOT EXISTS player_pets (
    user_id       TEXT NOT NULL,
    guild_id      TEXT NOT NULL,
    pet_id        TEXT NOT NULL,
    level         INTEGER DEFAULT 1,
    acquired_at   INTEGER DEFAULT (unixepoch()),
    PRIMARY KEY (user_id, guild_id, pet_id)
  );
`);
try { db.exec(`ALTER TABLE players ADD COLUMN permanent_atk_bonus INTEGER DEFAULT 0`); } catch {}
try { db.exec(`ALTER TABLE players ADD COLUMN permanent_def_bonus INTEGER DEFAULT 0`); } catch {}
try { db.exec(`ALTER TABLE players ADD COLUMN permanent_max_hp_bonus INTEGER DEFAULT 0`); } catch {}
try { db.exec(`ALTER TABLE players ADD COLUMN permanent_max_mp_bonus INTEGER DEFAULT 0`); } catch {}

// ── Class system ──────────────────────────────────────────────────────────
try { db.exec(`ALTER TABLE players ADD COLUMN class TEXT DEFAULT 'warrior'`); } catch {}

// ── Fishing / Gathering cooldowns ─────────────────────────────────────────
try { db.exec(`ALTER TABLE players ADD COLUMN last_fish    INTEGER DEFAULT 0`); } catch {}
try { db.exec(`ALTER TABLE players ADD COLUMN last_gather  INTEGER DEFAULT 0`); } catch {}

// ── World boss ────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS world_boss_state (
    guild_id    TEXT PRIMARY KEY,
    boss_id     TEXT NOT NULL,
    boss_name   TEXT NOT NULL,
    boss_icon   TEXT NOT NULL,
    current_hp  INTEGER NOT NULL,
    max_hp      INTEGER NOT NULL,
    spawned_at  INTEGER DEFAULT (unixepoch()),
    expires_at  INTEGER NOT NULL,
    is_alive    INTEGER DEFAULT 1
  );
  CREATE TABLE IF NOT EXISTS world_boss_damage (
    guild_id    TEXT NOT NULL,
    user_id     TEXT NOT NULL,
    damage      INTEGER DEFAULT 0,
    attacks     INTEGER DEFAULT 0,
    last_attack INTEGER DEFAULT 0,
    PRIMARY KEY (guild_id, user_id)
  );
`);

// ── Duel ──────────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS active_duels (
    duel_id         TEXT PRIMARY KEY,
    guild_id        TEXT NOT NULL,
    challenger_id   TEXT NOT NULL,
    target_id       TEXT NOT NULL,
    challenger_hp   INTEGER NOT NULL,
    target_hp       INTEGER NOT NULL,
    challenger_max  INTEGER NOT NULL,
    target_max      INTEGER NOT NULL,
    turn_user       TEXT NOT NULL,
    status          TEXT DEFAULT 'pending',
    message_id      TEXT,
    channel_id      TEXT,
    created_at      INTEGER DEFAULT (unixepoch())
  );
`);


// ── Equipment upgrades (blacksmith) ──────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS equipment_upgrades (
    user_id       TEXT NOT NULL,
    guild_id      TEXT NOT NULL,
    slot          TEXT NOT NULL,
    upgrade_level INTEGER DEFAULT 0,
    PRIMARY KEY (user_id, guild_id, slot)
  );
`);

// ── Village bounty claims ─────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS village_bounty_claims (
    user_id  TEXT NOT NULL,
    guild_id TEXT NOT NULL,
    date     TEXT NOT NULL,
    slot     INTEGER NOT NULL,
    PRIMARY KEY (user_id, guild_id, date, slot)
  );
`);

// ── Temporary player buffs from consumables ─────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS player_buffs (
    user_id     TEXT NOT NULL,
    guild_id    TEXT NOT NULL,
    buff_key    TEXT NOT NULL,
    value       INTEGER DEFAULT 0,
    charges     INTEGER DEFAULT 1,
    expires_at  INTEGER,
    created_at  INTEGER DEFAULT (unixepoch()),
    PRIMARY KEY (user_id, guild_id, buff_key)
  );
`);
