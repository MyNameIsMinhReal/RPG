import db from './connection';

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
    stat_str    INTEGER DEFAULT 0,
    stat_vit    INTEGER DEFAULT 0,
    stat_end    INTEGER DEFAULT 0,
    stat_agi    INTEGER DEFAULT 0,
    stat_luk    INTEGER DEFAULT 0,
    free_stat_reset INTEGER DEFAULT 1,
    corruption  INTEGER DEFAULT 0,
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
    player_def      INTEGER DEFAULT 0,
    turn            INTEGER DEFAULT 1,
    is_defending    INTEGER DEFAULT 0,
    active_effects  TEXT DEFAULT '[]',
    combat_log      TEXT DEFAULT '[]',
    created_at      INTEGER DEFAULT (unixepoch())
  );
`);

// ── Equipment & Title tables ──────────────────────────────────────────────
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

db.exec(`
  CREATE TABLE IF NOT EXISTS explore_pity (
    user_id  TEXT NOT NULL,
    guild_id TEXT NOT NULL,
    event_id TEXT NOT NULL,
    counter  INTEGER DEFAULT 0,
    PRIMARY KEY (user_id, guild_id, event_id)
  );
`);



// ── Explore node/noise state ─────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS player_explore_state (
    user_id TEXT NOT NULL,
    guild_id TEXT NOT NULL,
    noise INTEGER DEFAULT 0,
    updated_at INTEGER DEFAULT (unixepoch()),
    PRIMARY KEY (user_id, guild_id)
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
    exp           INTEGER DEFAULT 0,
    acquired_at   INTEGER DEFAULT (unixepoch()),
    PRIMARY KEY (user_id, guild_id, pet_id)
  );
`);

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


  CREATE TABLE IF NOT EXISTS equipment_forge (
    user_id       TEXT NOT NULL,
    guild_id      TEXT NOT NULL,
    slot          TEXT NOT NULL,
    awakened      INTEGER DEFAULT 0,
    affix1        TEXT,
    affix2        TEXT,
    locked_affix  INTEGER DEFAULT 0,
    instance_uuid TEXT,
    base_id       TEXT,
    rarity        TEXT,
    item_level    INTEGER DEFAULT 1,
    affixes_json  TEXT,
    locked_affixes_json TEXT DEFAULT '[]',
    pending_affixes_json TEXT,
    updated_at    INTEGER DEFAULT (unixepoch()),
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

// ── Clan (in-game guild) system ──────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS clans (
    clan_id      TEXT PRIMARY KEY,
    discord_gid  TEXT NOT NULL,
    name         TEXT NOT NULL,
    tag          TEXT NOT NULL,
    owner_id     TEXT NOT NULL,
    description  TEXT DEFAULT '',
    level        INTEGER DEFAULT 1,
    exp          INTEGER DEFAULT 0,
    treasury     INTEGER DEFAULT 0,
    created_at   INTEGER DEFAULT (unixepoch()),
    UNIQUE(discord_gid, name),
    UNIQUE(discord_gid, tag)
  );

  CREATE TABLE IF NOT EXISTS clan_members (
    clan_id      TEXT NOT NULL,
    user_id      TEXT NOT NULL,
    discord_gid  TEXT NOT NULL,
    rank         TEXT DEFAULT 'member',
    contribution INTEGER DEFAULT 0,
    joined_at    INTEGER DEFAULT (unixepoch()),
    PRIMARY KEY (clan_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS clan_buffs (
    clan_id      TEXT NOT NULL,
    buff_type    TEXT NOT NULL,
    value        INTEGER DEFAULT 0,
    expires_at   INTEGER NOT NULL,
    PRIMARY KEY (clan_id, buff_type)
  );

  CREATE TABLE IF NOT EXISTS clan_wars (
    war_id           TEXT PRIMARY KEY,
    discord_gid      TEXT NOT NULL,
    attacker_clan_id TEXT NOT NULL,
    defender_clan_id TEXT NOT NULL,
    attacker_score   INTEGER DEFAULT 0,
    defender_score   INTEGER DEFAULT 0,
    status           TEXT DEFAULT 'active',
    winner_clan_id   TEXT,
    started_at       INTEGER DEFAULT (unixepoch()),
    ends_at          INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS clan_stocks (
    clan_id         TEXT PRIMARY KEY,
    total_shares    INTEGER DEFAULT 1000,
    available_shares INTEGER DEFAULT 800,
    price           INTEGER DEFAULT 10,
    last_updated    INTEGER DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS stock_holdings (
    user_id      TEXT NOT NULL,
    discord_gid  TEXT NOT NULL,
    clan_id      TEXT NOT NULL,
    shares       INTEGER DEFAULT 0,
    avg_cost     INTEGER DEFAULT 0,
    PRIMARY KEY (user_id, discord_gid, clan_id)
  );

  CREATE TABLE IF NOT EXISTS stock_history (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    clan_id     TEXT NOT NULL,
    price       INTEGER NOT NULL,
    recorded_at INTEGER DEFAULT (unixepoch())
  );
`);

// ── Chapter progress system ───────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS chapter_state (
    user_id         TEXT NOT NULL,
    guild_id        TEXT NOT NULL,
    current_chapter INTEGER DEFAULT 1,
    updated_at      INTEGER DEFAULT (unixepoch()),
    PRIMARY KEY (user_id, guild_id)
  );

  CREATE TABLE IF NOT EXISTS chapter_progress (
    user_id    TEXT NOT NULL,
    guild_id   TEXT NOT NULL,
    chapter_id INTEGER NOT NULL,
    obj_id     TEXT NOT NULL,
    progress   INTEGER DEFAULT 0,
    updated_at INTEGER DEFAULT (unixepoch()),
    PRIMARY KEY (user_id, guild_id, chapter_id, obj_id)
  );
`);

// ── Chapter explore gate events ───────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS chapter_event_state (
    user_id      TEXT NOT NULL,
    guild_id     TEXT NOT NULL,
    chapter_id   INTEGER NOT NULL,
    event_id     TEXT NOT NULL,
    status       TEXT DEFAULT 'pending',
    created_at   INTEGER DEFAULT (unixepoch()),
    completed_at INTEGER,
    PRIMARY KEY (user_id, guild_id, chapter_id)
  );
`);

// ── Redeem codes ──────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS redeem_codes (
    code        TEXT PRIMARY KEY,
    rewards_json TEXT NOT NULL,
    max_uses    INTEGER DEFAULT 0,
    uses        INTEGER DEFAULT 0,
    active      INTEGER DEFAULT 1,
    expires_at  INTEGER DEFAULT NULL,
    created_at  INTEGER DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS used_codes (
    code        TEXT NOT NULL,
    user_id     TEXT NOT NULL,
    guild_id    TEXT NOT NULL,
    used_at     INTEGER NOT NULL,
    PRIMARY KEY (code, user_id, guild_id)
  );
`);

// ── Ancient Oak event ─────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS oak_event (
    guild_id         TEXT PRIMARY KEY,
    phase            TEXT DEFAULT 'summoning',
    summoner_id      TEXT NOT NULL,
    spawned_at       INTEGER DEFAULT (unixepoch()),
    expires_at       INTEGER NOT NULL,
    boss_hp          INTEGER NOT NULL,
    boss_max_hp      INTEGER NOT NULL,
    current_fighter  TEXT DEFAULT NULL
  );
  CREATE TABLE IF NOT EXISTS oak_participants (
    guild_id  TEXT NOT NULL,
    user_id   TEXT NOT NULL,
    damage    INTEGER DEFAULT 0,
    joined_at INTEGER DEFAULT (unixepoch()),
    PRIMARY KEY (guild_id, user_id)
  );
`);

// ── Update log system ─────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS update_logs (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    version    TEXT NOT NULL,
    content    TEXT NOT NULL,
    created_at INTEGER DEFAULT (unixepoch())
  );
  CREATE TABLE IF NOT EXISTS update_logs_seen (
    user_id TEXT NOT NULL,
    guild_id TEXT NOT NULL,
    log_id  INTEGER NOT NULL,
    PRIMARY KEY (user_id, guild_id, log_id)
  );
`);

// ── Party system ──────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS parties (
    guild_id   TEXT NOT NULL,
    leader_id  TEXT NOT NULL,
    created_at INTEGER DEFAULT (unixepoch()),
    PRIMARY KEY (guild_id, leader_id)
  );

  CREATE TABLE IF NOT EXISTS party_members (
    guild_id   TEXT NOT NULL,
    user_id    TEXT NOT NULL,
    leader_id  TEXT NOT NULL,
    joined_at  INTEGER DEFAULT (unixepoch()),
    PRIMARY KEY (guild_id, user_id)
  );
`);


// ── Event chains ─────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS event_chain_progress (
    user_id      TEXT NOT NULL,
    guild_id     TEXT NOT NULL,
    chain_id     TEXT NOT NULL,
    step         INTEGER DEFAULT 0,
    completed_at INTEGER,
    updated_at   INTEGER DEFAULT (unixepoch()),
    PRIMARY KEY (user_id, guild_id, chain_id)
  );
`);


// ── Village district systems ───────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS guild_projects (
    guild_id TEXT NOT NULL,
    project_id TEXT NOT NULL,
    target_item TEXT NOT NULL,
    current_amount INTEGER DEFAULT 0,
    target_amount INTEGER NOT NULL,
    is_completed INTEGER DEFAULT 0,
    completed_at INTEGER,
    PRIMARY KEY (guild_id, project_id)
  );

  CREATE TABLE IF NOT EXISTS village_funds (
    guild_id TEXT NOT NULL,
    fund_id TEXT NOT NULL,
    current_amount INTEGER DEFAULT 0,
    target_amount INTEGER NOT NULL,
    updated_at INTEGER DEFAULT (unixepoch()),
    PRIMARY KEY (guild_id, fund_id)
  );

  CREATE TABLE IF NOT EXISTS player_intel (
    user_id TEXT NOT NULL,
    guild_id TEXT NOT NULL,
    zone_id TEXT NOT NULL,
    target_item TEXT,
    bonus_type TEXT NOT NULL,
    bonus_value INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    created_at INTEGER DEFAULT (unixepoch()),
    PRIMARY KEY (user_id, guild_id)
  );

  CREATE TABLE IF NOT EXISTS shadow_sacrifices (
    user_id TEXT NOT NULL,
    guild_id TEXT NOT NULL,
    sacrifice_key TEXT NOT NULL,
    count INTEGER DEFAULT 0,
    updated_at INTEGER DEFAULT (unixepoch()),
    PRIMARY KEY (user_id, guild_id, sacrifice_key)
  );

  CREATE TABLE IF NOT EXISTS village_raid_participants (
    guild_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    power INTEGER DEFAULT 0,
    joined_at INTEGER DEFAULT (unixepoch()),
    PRIMARY KEY (guild_id, user_id)
  );


  CREATE TABLE IF NOT EXISTS village_cooldowns (
    scope TEXT NOT NULL,
    owner_id TEXT NOT NULL,
    guild_id TEXT NOT NULL,
    cd_key TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    updated_at INTEGER DEFAULT (unixepoch()),
    PRIMARY KEY (scope, owner_id, guild_id, cd_key)
  );
`);

