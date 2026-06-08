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
  'laughing_bones', 'missing_child_chain', 'black_eclipse',
  // Zone-specific & rare events
  'fishing_spot',
  'forest_wolf_den', 'forest_herbalist_hut', 'forest_moonlit_clearing',
  'shrine_prayer_beads', 'shrine_seal_door', 'shrine_spirit_lamp',
  'mine_ore_vein', 'mine_echo_tunnel', 'mine_rusted_lift',
  'wastes_bone_caravan', 'wastes_glass_mirage', 'wastes_fallen_banner',
  // World-affecting events
  'world_plague_spreads', 'world_bandit_coalition', 'world_convoy_attacked', 'world_magic_surge', 'world_dark_omen',
  'world_price_gouger', 'world_tax_collector', 'world_supply_shortage', 'world_merchant_guild_job',
  'world_ancient_inscription', 'world_spy_letter', 'world_missing_persons', 'world_old_chronicle',
  'world_prophetic_vision', 'world_secret_meeting',
  'world_faction_standoff', 'world_church_inquisition', 'world_shadow_offer', 'world_hunters_mission', 'world_villager_dispute',
  // New forest events
  'forest_bandit_ambush', 'forest_giant_spider', 'forest_cursed_scarecrow', 'forest_snake_pit', 'forest_poacher_camp',
  'forest_corrupted_treant', 'forest_wild_boar', 'forest_poison_spores', 'forest_rabid_fox', 'forest_bandit_watchtower',
  'forest_hollow_log', 'forest_buried_chest', 'forest_eagle_nest', 'forest_mushroom_ring', 'forest_amber_sap',
  'forest_forgotten_pack', 'forest_beehive', 'forest_fruit_grove', 'forest_silk_cocoon', 'forest_bog_pearl',
  'forest_lost_merchant', 'forest_hermit_cave', 'forest_wounded_knight', 'forest_fairy_circle', 'forest_pilgrim_group',
  'forest_mad_trapper', 'forest_child_runaway', 'forest_dryad_blessing', 'forest_traveling_bard', 'forest_beast_tamer',
  'forest_ancient_ruins', 'forest_magic_spring', 'forest_stone_circle', 'forest_spirit_lantern', 'forest_cursed_statue',
  'forest_memory_tree', 'forest_dream_flower', 'forest_echo_grove', 'forest_time_anomaly', 'forest_lost_relic',
  'forest_herb_foraging', 'forest_animal_tracks', 'forest_river_crossing', 'forest_tree_climbing', 'forest_fog_maze',
  'forest_waterfall_cave', 'forest_dead_tree_oracle', 'forest_flower_field', 'forest_crow_messenger', 'forest_campfire_stranger',
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
