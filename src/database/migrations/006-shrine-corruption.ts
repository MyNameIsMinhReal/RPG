import db from '../connection';

// ── Shrine Zone 2: player-specific corruption meter ─────────────────────
// Safe for old databases: CREATE TABLE IF NOT EXISTS does not add new columns.
try { db.exec(`ALTER TABLE players ADD COLUMN corruption INTEGER DEFAULT 0`); } catch {}
