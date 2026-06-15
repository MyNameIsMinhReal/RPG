import db from '../connection';

function tryExec(sql: string): void {
  try { db.exec(sql); } catch (err: any) {
    if (!String(err?.message ?? '').includes('duplicate column')) throw err;
  }
}

db.exec(`
  CREATE TABLE IF NOT EXISTS equipment_instances (
    uuid TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    guild_id TEXT NOT NULL,
    base_id TEXT NOT NULL,
    rarity TEXT NOT NULL,
    item_level INTEGER NOT NULL,
    affixes_json TEXT DEFAULT '[]',
    locked_affixes_json TEXT DEFAULT '[]',
    is_legacy INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (unixepoch())
  );

  CREATE INDEX IF NOT EXISTS idx_equipment_instances_owner
    ON equipment_instances(user_id, guild_id);

  CREATE TABLE IF NOT EXISTS equipment_instance_upgrades (
    uuid TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    guild_id TEXT NOT NULL,
    upgrade_level INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS legacy_spark_claims (
    user_id TEXT NOT NULL,
    guild_id TEXT NOT NULL,
    claimed_at INTEGER DEFAULT (unixepoch()),
    PRIMARY KEY (user_id, guild_id)
  );

  CREATE TABLE IF NOT EXISTS equipment_reforge_offers (
    offer_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    guild_id TEXT NOT NULL,
    equipment_uuid TEXT NOT NULL,
    old_affixes_json TEXT NOT NULL,
    new_affixes_json TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    created_at INTEGER DEFAULT (unixepoch())
  );
`);

tryExec(`ALTER TABLE equipment_worn ADD COLUMN equipment_uuid TEXT`);

// Tặng 2 Legacy Spark cho các player đã tồn tại tại thời điểm migration.
// Dùng bảng tạm để tránh cộng lại mỗi lần bot khởi động lại.
db.exec(`
  DROP TABLE IF EXISTS temp_legacy_spark_to_grant;
  CREATE TEMP TABLE temp_legacy_spark_to_grant AS
  SELECT p.user_id, p.guild_id
  FROM players p
  LEFT JOIN legacy_spark_claims c
    ON c.user_id = p.user_id AND c.guild_id = p.guild_id
  WHERE c.user_id IS NULL;

  INSERT OR IGNORE INTO legacy_spark_claims(user_id, guild_id)
  SELECT user_id, guild_id FROM temp_legacy_spark_to_grant;

  INSERT OR IGNORE INTO inventory(user_id, guild_id, item_id, quantity)
  SELECT user_id, guild_id, 'legacy_spark', 0 FROM temp_legacy_spark_to_grant;

  UPDATE inventory
  SET quantity = quantity + 2
  WHERE item_id = 'legacy_spark'
    AND EXISTS (
      SELECT 1 FROM temp_legacy_spark_to_grant t
      WHERE t.user_id = inventory.user_id AND t.guild_id = inventory.guild_id
    );

  DROP TABLE IF EXISTS temp_legacy_spark_to_grant;
`);
