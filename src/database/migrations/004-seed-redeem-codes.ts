import db from '../connection';

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

// ── Seed: IMSORRYVUBU — personal apology code ─────────────────────────────────
{
  const CODE = 'IMSORRYVUBU';
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
          { id: 'ancient_book',       qty: 2 },
          { id: 'curse_shard',        qty: 2 },
        ],
      }),
      1,
      '1062728898166669382'
    );
  }
}
