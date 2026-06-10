import db from '../connection';

try { db.exec(`ALTER TABLE skill_pool ADD COLUMN attune_count INTEGER DEFAULT 0`); } catch {}
try { db.exec(`ALTER TABLE redeem_codes ADD COLUMN allowed_user_id TEXT DEFAULT NULL`); } catch {}
