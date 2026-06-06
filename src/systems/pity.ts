import db from '../database/index';
import type { ExploreEventType } from '../commands/exploreEvents';

// Events eligible for pity: always have weight > 0, regardless of player state.
// Conditional events (combat, ambush, bounty_hunter, etc.) are excluded.
export const PITY_EVENTS = new Set<ExploreEventType>([
  'merchant', 'spring', 'trap', 'altar', 'mysterious', 'villager', 'caravan',
  'loot', 'soul_shop', 'abandoned_camp', 'lost_pouch', 'rune_stone', 'treasure_chest',
  'wandering_healer', 'nameless_grave', 'memory_seller', 'stranger_campfire',
  'cracked_shrine', 'wanted_merchant', 'rebirth_rift', 'talking_corpse', 'fate_coin',
  'black_cat', 'dice_gambler', 'glowing_mushroom', 'chained_prisoner', 'magic_fountain',
  'laughing_bones', 'missing_child_chain', 'black_eclipse', 'injured_traveler',
]);

// After PITY_THRESHOLD explores without seeing event X, weight increases by 1 per explore.
const PITY_THRESHOLD = 20;
// Maximum bonus weight from pity (caps the boost so one rare event doesn't dominate).
const PITY_CAP = 10;

export function getPityBonus(counter: number): number {
  return Math.min(PITY_CAP, Math.max(0, counter - PITY_THRESHOLD));
}

export function getPityCounters(userId: string, guildId: string): Map<ExploreEventType, number> {
  const rows = db.prepare(
    'SELECT event_id, counter FROM explore_pity WHERE user_id=? AND guild_id=?'
  ).all(userId, guildId) as { event_id: string; counter: number }[];
  return new Map(rows.map(r => [r.event_id as ExploreEventType, r.counter]));
}

export function updatePityCounters(userId: string, guildId: string, pickedEvent: ExploreEventType): void {
  const incr = db.prepare(`
    INSERT INTO explore_pity (user_id, guild_id, event_id, counter)
    VALUES (?, ?, ?, 1)
    ON CONFLICT(user_id, guild_id, event_id) DO UPDATE SET counter = counter + 1
  `);
  const reset = db.prepare(`
    INSERT INTO explore_pity (user_id, guild_id, event_id, counter)
    VALUES (?, ?, ?, 0)
    ON CONFLICT(user_id, guild_id, event_id) DO UPDATE SET counter = 0
  `);

  db.exec('BEGIN');
  try {
    for (const eventId of PITY_EVENTS) {
      if (eventId === pickedEvent) {
        reset.run(userId, guildId, eventId);
      } else {
        incr.run(userId, guildId, eventId);
      }
    }
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}
