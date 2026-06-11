import db from '../connection';

try { db.exec(`ALTER TABLE players ADD COLUMN last_explore INTEGER DEFAULT 0`); } catch {}
try { db.exec(`ALTER TABLE players ADD COLUMN reputation INTEGER DEFAULT 0`); } catch {}

// Add selected_title column if not exists (safe migration)
try { db.exec(`ALTER TABLE players ADD COLUMN selected_title TEXT DEFAULT NULL`); } catch {}

try { db.exec(`ALTER TABLE players ADD COLUMN crafting_exp   INTEGER DEFAULT 0`); } catch {}
try { db.exec(`ALTER TABLE players ADD COLUMN crafting_level INTEGER DEFAULT 1`); } catch {}

// ── Wanted / factions / soul perks / pets ────────────────────────────────
try { db.exec(`ALTER TABLE players ADD COLUMN wanted_level INTEGER DEFAULT 0`); } catch {}
try { db.exec(`ALTER TABLE players ADD COLUMN bonus_stat_points INTEGER DEFAULT 0`); } catch {}
try { db.exec(`ALTER TABLE players ADD COLUMN keep_item_charges INTEGER DEFAULT 0`); } catch {}
try { db.exec(`ALTER TABLE players ADD COLUMN extra_skill_slots INTEGER DEFAULT 0`); } catch {}
try { db.exec(`ALTER TABLE players ADD COLUMN death_penalty_reduction INTEGER DEFAULT 0`); } catch {}
try { db.exec(`ALTER TABLE players ADD COLUMN rebirth_blessing INTEGER DEFAULT 0`); } catch {}
try { db.exec(`ALTER TABLE players ADD COLUMN merchant_mercy INTEGER DEFAULT 0`); } catch {}

try { db.exec(`ALTER TABLE players ADD COLUMN permanent_atk_bonus INTEGER DEFAULT 0`); } catch {}
try { db.exec(`ALTER TABLE players ADD COLUMN permanent_def_bonus INTEGER DEFAULT 0`); } catch {}
try { db.exec(`ALTER TABLE players ADD COLUMN permanent_max_hp_bonus INTEGER DEFAULT 0`); } catch {}
try { db.exec(`ALTER TABLE players ADD COLUMN permanent_max_mp_bonus INTEGER DEFAULT 0`); } catch {}

// ── Class system ──────────────────────────────────────────────────────────
try { db.exec(`ALTER TABLE players ADD COLUMN class TEXT DEFAULT 'warrior'`); } catch {}

// ── Fishing / Gathering cooldowns ─────────────────────────────────────────
try { db.exec(`ALTER TABLE players ADD COLUMN last_fish    INTEGER DEFAULT 0`); } catch {}
try { db.exec(`ALTER TABLE players ADD COLUMN last_gather  INTEGER DEFAULT 0`); } catch {}

try { db.exec(`ALTER TABLE players ADD COLUMN active_pet TEXT DEFAULT NULL`); } catch {}

// Pet EXP for companion progression
try { db.exec(`ALTER TABLE player_pets ADD COLUMN exp INTEGER DEFAULT 0`); } catch {}


// ── Manual level/stat allocation ─────────────────────────────────────────
try { db.exec(`ALTER TABLE players ADD COLUMN stat_str INTEGER DEFAULT 0`); } catch {}
try { db.exec(`ALTER TABLE players ADD COLUMN stat_vit INTEGER DEFAULT 0`); } catch {}
try { db.exec(`ALTER TABLE players ADD COLUMN stat_end INTEGER DEFAULT 0`); } catch {}
try { db.exec(`ALTER TABLE players ADD COLUMN stat_agi INTEGER DEFAULT 0`); } catch {}
try { db.exec(`ALTER TABLE players ADD COLUMN stat_luk INTEGER DEFAULT 0`); } catch {}
try { db.exec(`ALTER TABLE players ADD COLUMN free_stat_reset INTEGER DEFAULT 1`); } catch {}
try { db.exec(`ALTER TABLE players ADD COLUMN corruption INTEGER DEFAULT 0`); } catch {}
