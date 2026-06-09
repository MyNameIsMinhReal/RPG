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
    player_def      INTEGER DEFAULT 0,
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

db.exec(`
  CREATE TABLE IF NOT EXISTS explore_pity (
    user_id  TEXT NOT NULL,
    guild_id TEXT NOT NULL,
    event_id TEXT NOT NULL,
    counter  INTEGER DEFAULT 0,
    PRIMARY KEY (user_id, guild_id, event_id)
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
try { db.exec(`ALTER TABLE active_combats ADD COLUMN player_def INTEGER DEFAULT 0`); } catch {}
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

try { db.exec(`ALTER TABLE players ADD COLUMN active_pet TEXT DEFAULT NULL`); } catch {}


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

// ── Seed: early access welcome code ──────────────────────────────────────────
{
  const EARLY_CODE = 'EARLYBIRD';
  const exists = db.prepare('SELECT 1 FROM redeem_codes WHERE code = ?').get(EARLY_CODE);
  if (!exists) {
    db.prepare(
      'INSERT INTO redeem_codes (code, rewards_json, max_uses) VALUES (?, ?, ?)'
    ).run(
      EARLY_CODE,
      JSON.stringify({
        gold: 200,
        soul_shards: 5,
        items: [
          { id: 'gear_box',           qty: 1 },
          { id: 'early_access_ring',  qty: 1 },
        ],
      }),
      0
    );
  }
}


// ── Seed: apology bug-fix code ───────────────────────────────────────────────
{
  const BUG_CODE = 'SORRYFORBUG';
  const rewards = JSON.stringify({ gold: 1 });
  const exists = db.prepare('SELECT 1 FROM redeem_codes WHERE code = ?').get(BUG_CODE);
  if (!exists) {
    db.prepare(
      'INSERT INTO redeem_codes (code, rewards_json, max_uses) VALUES (?, ?, ?)'
    ).run(BUG_CODE, rewards, 0);
  } else {
    db.prepare(
      'UPDATE redeem_codes SET rewards_json = ?, active = 1 WHERE code = ?'
    ).run(rewards, BUG_CODE);
  }
}

try { db.exec(`ALTER TABLE skill_pool ADD COLUMN attune_count INTEGER DEFAULT 0`); } catch {}
try { db.exec(`ALTER TABLE redeem_codes ADD COLUMN allowed_user_id TEXT DEFAULT NULL`); } catch {}

// ── Seed: IMSORRYVUBU — personal apology code ─────────────────────────────────
{
  const CODE = 'IMSORRYVUBU';
  const SKILL_BOOKS = [
    'book_fireball','book_ice_lance','book_shield_bash','book_shadow_step','book_mend_wounds',
    'book_thunder_clap','book_iron_skin','book_berserker','book_mana_flow','book_vampiric',
    'book_tough_body','book_counter','book_last_stand','book_mark_zone','book_soul_strike',
    'book_soul_guard','book_soul_drain','book_arcane_bolt','book_poison_dart','book_cleave',
    'book_battle_cry','book_guardian_wall','book_purify','book_blood_siphon','book_mana_surge',
    'book_frost_nova','book_whirlwind','book_radiant_smite','book_venom_cloud','book_execute',
    'book_meteor_shower','book_blade_mastery','book_arcane_mind','book_survival_instinct',
    'book_blood_hunger','book_void_rift','book_soul_offering','book_stone_toss','book_quick_mend',
    'book_static_shock','book_spectral_blade','book_ice_barrier','book_chain_lightning',
    'book_dark_pact','book_inferno','book_void_step','book_iron_will','book_elemental_focus',
    'book_swift_strike',
  ];
  const randomBook = SKILL_BOOKS[Math.floor(Math.random() * SKILL_BOOKS.length)];
  const exists = db.prepare('SELECT 1 FROM redeem_codes WHERE code = ?').get(CODE);
  if (!exists) {
    db.prepare(
      'INSERT INTO redeem_codes (code, rewards_json, max_uses, allowed_user_id) VALUES (?, ?, ?, ?)'
    ).run(
      CODE,
      JSON.stringify({
        gold: 100,
        items: [
          { id: 'world_guardian_plate', qty: 1 },
          { id: randomBook,             qty: 1 },
        ],
      }),
      1,
      '1062728898166669382'
    );
  }
}

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
