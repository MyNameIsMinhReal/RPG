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
  const SKILL_BOOKS = [
    'book_fireball','book_ice_lance','book_shield_bash','book_shadow_step','book_mend_wounds',
    'book_thunder_clap','book_iron_skin','book_berserker','book_mana_flow','book_vampiric',
    'book_tough_body','book_counter','book_last_stand','book_mark_zone','book_soul_strike',
    'book_soul_guard','book_soul_drain','book_arcane_bolt','book_poison_dart','book_cleave',
    'book_battle_cry','book_guardian_wall','book_purify','book_blood_siphon','book_mana_surge',
    'book_frost_nova','book_whirlwind','book_radiant_smite','book_venom_cloud','book_execute',
    'book_meteor_shower','book_blade_mastery','book_arcane_mind','book_survival_instinct',
    'book_blood_hunger','book_void_rift','book_soul_offering','book_stone_toss','book_quick_mend',
    'book_static_shock','book_spectral_blade','book_ice_barrier','book_chain_lightning',
    'book_dark_pact','book_inferno','book_void_step','book_iron_will','book_elemental_focus',
    'book_swift_strike',
  ];
  const randomBook = SKILL_BOOKS[Math.floor(Math.random() * SKILL_BOOKS.length)];
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
          { id: randomBook,             qty: 1 },
        ],
      }),
      1,
      '1062728898166669382'
    );
  }
}
