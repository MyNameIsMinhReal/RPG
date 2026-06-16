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
    updated_at INTEGER DEFAULT (unixepoch()),
    PRIMARY KEY (user_id, guild_id, slot)
  );
`); } catch {}
