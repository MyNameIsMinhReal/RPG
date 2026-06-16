import db from '../connection';

try { db.exec(`
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
`); } catch {}

try { db.exec(`
  CREATE TABLE IF NOT EXISTS village_funds (
    guild_id TEXT NOT NULL,
    fund_id TEXT NOT NULL,
    current_amount INTEGER DEFAULT 0,
    target_amount INTEGER NOT NULL,
    updated_at INTEGER DEFAULT (unixepoch()),
    PRIMARY KEY (guild_id, fund_id)
  );
`); } catch {}

try { db.exec(`
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
`); } catch {}

try { db.exec(`
  CREATE TABLE IF NOT EXISTS shadow_sacrifices (
    user_id TEXT NOT NULL,
    guild_id TEXT NOT NULL,
    sacrifice_key TEXT NOT NULL,
    count INTEGER DEFAULT 0,
    updated_at INTEGER DEFAULT (unixepoch()),
    PRIMARY KEY (user_id, guild_id, sacrifice_key)
  );
`); } catch {}

try { db.exec(`
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
`); } catch {}


try { db.exec(`
  CREATE TABLE IF NOT EXISTS equipment_forge (
    user_id TEXT NOT NULL,
    guild_id TEXT NOT NULL,
    slot TEXT NOT NULL,
    awakened INTEGER DEFAULT 0,
    affix1 TEXT,
    affix2 TEXT,
    locked_affix INTEGER DEFAULT 0,
    instance_uuid TEXT,
    base_id TEXT,
    rarity TEXT,
    item_level INTEGER DEFAULT 1,
    affixes_json TEXT,
    locked_affixes_json TEXT DEFAULT '[]',
    pending_affixes_json TEXT,
    updated_at INTEGER DEFAULT (unixepoch()),
    PRIMARY KEY (user_id, guild_id, slot)
  );
`); } catch {}


// Forge Affix v2: Prefix/Suffix, item level, preview reroll and multi-lock support.
try { db.exec(`ALTER TABLE equipment_forge ADD COLUMN instance_uuid TEXT`); } catch {}
try { db.exec(`ALTER TABLE equipment_forge ADD COLUMN base_id TEXT`); } catch {}
try { db.exec(`ALTER TABLE equipment_forge ADD COLUMN rarity TEXT`); } catch {}
try { db.exec(`ALTER TABLE equipment_forge ADD COLUMN item_level INTEGER DEFAULT 1`); } catch {}
try { db.exec(`ALTER TABLE equipment_forge ADD COLUMN affixes_json TEXT`); } catch {}
try { db.exec(`ALTER TABLE equipment_forge ADD COLUMN locked_affixes_json TEXT DEFAULT '[]'`); } catch {}
try { db.exec(`ALTER TABLE equipment_forge ADD COLUMN pending_affixes_json TEXT`); } catch {}

// Explore node/noise state.
try { db.exec(`
  CREATE TABLE IF NOT EXISTS player_explore_state (
    user_id TEXT NOT NULL,
    guild_id TEXT NOT NULL,
    noise INTEGER DEFAULT 0,
    updated_at INTEGER DEFAULT (unixepoch()),
    PRIMARY KEY (user_id, guild_id)
  );
`); } catch {}
