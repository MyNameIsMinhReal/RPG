import db from '../connection';

// ── Party combat persistence ──────────────────────────────────────────────
// Solo/group combat already persist to active_combats so they survive a restart.
// Party combat used to run purely in-memory, so a restart silently dropped the
// fight. This table stores enough state to detect & recover an interrupted party
// battle (and is the foundation for a full live-resume later).
db.exec(`
  CREATE TABLE IF NOT EXISTS active_party_combats (
    message_id           TEXT PRIMARY KEY,
    channel_id           TEXT NOT NULL,
    guild_id             TEXT NOT NULL,
    leader_id            TEXT NOT NULL,
    member_ids           TEXT NOT NULL,
    enemy_json           TEXT NOT NULL,
    members_json         TEXT NOT NULL,
    turn                 INTEGER DEFAULT 1,
    log_json             TEXT DEFAULT '[]',
    current_member_id    TEXT,
    decided_actions_json TEXT DEFAULT '[]',
    created_at           INTEGER DEFAULT (unixepoch())
  );
`);
