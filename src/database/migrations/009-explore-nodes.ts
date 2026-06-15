import db from '../connection';

try { db.exec(`
  CREATE TABLE IF NOT EXISTS explore_state (
    user_id TEXT NOT NULL,
    guild_id TEXT NOT NULL,
    noise INTEGER DEFAULT 0,
    last_node TEXT DEFAULT NULL,
    updated_at INTEGER DEFAULT (unixepoch()),
    PRIMARY KEY (user_id, guild_id)
  );
`); } catch {}
