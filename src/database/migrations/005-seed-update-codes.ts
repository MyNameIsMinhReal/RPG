import db from '../connection';

interface SeedCode {
  code: string;
  rewards: unknown;
  maxUses?: number;
}

const UPDATE_CODES: SeedCode[] = [
  {
    code: 'SITU2K8',
    rewards: {
      gold: 100,
      items: [
        { id: 'gear_box', qty: 1 },
        // Ancient Scroll is currently represented by Ancient Book in item data.
        { id: 'ancient_book', qty: 1 },
      ],
    },
    maxUses: 0,
  },
  {
    code: 'ZONE2UPDATE',
    rewards: {
      gold: 300,
      items: [
        { id: 'holy_water', qty: 1 },
        { id: 'purifying_salt', qty: 1 },
        { id: 'scroll_mirror', qty: 1 },
        { id: 'material_chest', qty: 1 },
      ],
    },
    maxUses: 0,
  },
];

for (const seed of UPDATE_CODES) {
  const code = seed.code.toUpperCase();
  const rewardsJson = JSON.stringify(seed.rewards);
  const maxUses = seed.maxUses ?? 0;
  const exists = db.prepare('SELECT 1 FROM redeem_codes WHERE code = ?').get(code);

  if (!exists) {
    db.prepare(
      'INSERT INTO redeem_codes (code, rewards_json, max_uses, active) VALUES (?, ?, ?, 1)'
    ).run(code, rewardsJson, maxUses);
  } else {
    db.prepare(
      'UPDATE redeem_codes SET rewards_json = ?, max_uses = ?, active = 1 WHERE code = ?'
    ).run(rewardsJson, maxUses, code);
  }
}
