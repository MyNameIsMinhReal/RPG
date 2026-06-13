import db from '../database/index';
import { withTransaction } from '../database/transaction';
import type { ExploreEventType } from '../commands/exploreEvents';

// Events eligible for pity: always have weight > 0, regardless of player state.
// Conditional events (combat, ambush, bounty_hunter, etc.) are excluded.
// Only events with weight > 0 regardless of zone/state belong here.
// Zone-specific events (forest_*, shrine_*, mine_*, wastes_*) are excluded — their
// counters would accumulate while the player is in other zones, causing inflated pity
// when they eventually enter that zone.
export const PITY_EVENTS = new Set<ExploreEventType>([
  // General events — always available
  'merchant', 'spring', 'trap', 'altar', 'mysterious', 'villager', 'caravan',
  'loot', 'soul_shop', 'abandoned_camp', 'lost_pouch', 'rune_stone', 'treasure_chest',
  'wandering_healer', 'nameless_grave', 'memory_seller', 'stranger_campfire',
  'cracked_shrine', 'wanted_merchant', 'rebirth_rift', 'talking_corpse', 'fate_coin',
  'black_cat', 'dice_gambler', 'glowing_mushroom', 'chained_prisoner', 'magic_fountain',
  'laughing_bones', 'missing_child_chain', 'black_eclipse',
  'fishing_spot',
  // Available in any non-village zone
  'mimic_chest', 'map_seller', 'wandering_blacksmith',
  // World events — always available
  'world_plague_spreads', 'world_bandit_coalition', 'world_convoy_attacked', 'world_magic_surge', 'world_dark_omen',
  'world_price_gouger', 'world_tax_collector', 'world_supply_shortage', 'world_merchant_guild_job',
  'world_ancient_inscription', 'world_spy_letter', 'world_missing_persons', 'world_old_chronicle',
  'world_prophetic_vision', 'world_secret_meeting',
  'world_faction_standoff', 'world_church_inquisition', 'world_shadow_offer', 'world_hunters_mission', 'world_villager_dispute',
  // Time-of-day events — fire based on time, not zone
  'dawn_ritual', 'dawn_traveler', 'dawn_dew_blessing', 'dawn_hunter_tracks',
  'noon_rest', 'day_patrol', 'day_training_ground', 'day_supply_cart',
  'dusk_trader', 'dusk_omen', 'dusk_crow_omen', 'dusk_card_dealer',
  'midnight_wanderer', 'night_ghost_lantern', 'night_grave_robbers',
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

  // All pity counters update atomically: either every event in this pass moves
  // or none does. SAVEPOINT-based so it's safe even if a caller is already in a
  // transaction.
  withTransaction(() => {
    for (const eventId of PITY_EVENTS) {
      if (eventId === pickedEvent) {
        reset.run(userId, guildId, eventId);
      } else {
        incr.run(userId, guildId, eventId);
      }
    }
  });
}
