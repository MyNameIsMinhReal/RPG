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
