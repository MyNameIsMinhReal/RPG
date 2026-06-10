import db from '../connection';

// ── Stamina columns for active_combats ───────────────────────────────────
try { db.exec(`ALTER TABLE active_combats ADD COLUMN player_stamina     INTEGER DEFAULT 100`); } catch {}
try { db.exec(`ALTER TABLE active_combats ADD COLUMN player_max_stamina INTEGER DEFAULT 100`); } catch {}
try { db.exec(`ALTER TABLE active_combats ADD COLUMN player_def INTEGER DEFAULT 0`); } catch {}

// ── Group combat column ───────────────────────────────────────────────────
try { db.exec(`ALTER TABLE active_combats ADD COLUMN enemies_json TEXT DEFAULT NULL`); } catch {}
