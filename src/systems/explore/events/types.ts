import type {
  ActionRowBuilder,
  ButtonBuilder,
  ChatInputCommandInteraction,
  Message,
} from 'discord.js';
import type { DataDrivenExploreEventId } from '../../../data/exploreEventDefs';
import type {
  CombatDeathHandler,
  CombatFleeHandler,
  CombatVictoryHandler,
} from '../../combatFlow';
import type { PlayerRow } from '../../../utils/embeds';

export type GuildExploreEventId =
  | 'guild_caravan_ambush'
  | 'guild_recruiter'
  | 'guild_vault_cipher'
  | 'guild_bulletin_board'
  | 'guild_watchtower_drill'
  | 'guild_rival_scout'
  | 'guild_smuggler_chase'
  | 'guild_stock_whisper'
  | 'guild_sparring_ring'
  | 'guild_festival_donation'
  | 'guild_festival_ring_toss'
  | 'guild_lost_courier'
  | 'guild_cipher_scroll'
  | 'guild_war_messenger'
  | 'guild_mock_duel'
  | 'guild_anniversary'
  | 'guild_alarm_bell'
  | 'guild_bounty_board'
  | 'guild_relic_puzzle'
  | 'guild_treasury_audit';

export type ExploreEventType = DataDrivenExploreEventId
  | 'mimic_chest' | 'wandering_blacksmith' | 'temporary_arena' | 'boss_tracks' | 'map_seller'
  | 'shrine_weeping_statue' | 'shrine_forbidden_offering' | 'shrine_sealed_reliquary'
  | 'mine_runaway_cart' | 'mine_living_ore' | 'mine_trapped_miner'
  | 'wastes_mirror_self' | 'wastes_memory_rain' | 'wastes_faceless_merchant'
  | 'echo_whisper_trace' | 'echo_whisper_candle' | 'echo_whisper_mirror'
  | 'combat' | 'ambush' | 'legacy' | 'merchant' | 'gear_buyer' | 'spring' | 'trap' | 'altar'
  | 'mysterious' | 'villager' | 'caravan' | 'loot'
  | 'soul_shop' | 'abandoned_camp' | 'lost_pouch' | 'rune_stone' | 'treasure_chest'
  | 'wandering_healer' | 'spirit_trial'
  | 'blood_trail' | 'nameless_grave' | 'memory_seller' | 'stranger_campfire' | 'cracked_shrine'
  | 'injured_monster'
  | 'wanted_merchant' | 'bounty_hunter' | 'rebirth_rift' | 'failed_legacy' | 'mirror_clone'
  | 'talking_corpse'
  | 'black_eclipse' | 'fate_coin' | 'merchant_tax' | 'merchant_guard' | 'wanted_notice'
  | 'shopkeeper_mercy'
  | 'shrine_relic_event' | 'forgotten_crown_event' | 'flower_crown_event' | 'knight_emblem_event'
  | 'bard_song_event'
  | 'black_cat' | 'dice_gambler' | 'glowing_mushroom' | 'chained_prisoner' | 'magic_fountain'
  | 'laughing_bones'
  | 'missing_child_chain' | 'black_market' | 'atonement_monk' | 'conditional_miniboss'
  | 'fishing_spot' | 'oak_hunt_start' | 'nothing'
  | 'forest_tree' | 'forest_wolf_den' | 'forest_herbalist_hut' | 'forest_moonlit_clearing'
  | 'forest_bandit_ambush' | 'forest_giant_spider' | 'forest_cursed_scarecrow' | 'forest_snake_pit'
  | 'forest_poacher_camp'
  | 'forest_corrupted_treant' | 'forest_wild_boar' | 'forest_poison_spores' | 'forest_rabid_fox'
  | 'forest_bandit_watchtower'
  | 'forest_hollow_log' | 'forest_buried_chest' | 'forest_eagle_nest' | 'forest_mushroom_ring'
  | 'forest_amber_sap'
  | 'forest_forgotten_pack' | 'forest_beehive' | 'forest_fruit_grove' | 'forest_silk_cocoon'
  | 'forest_bog_pearl'
  | 'forest_lost_merchant' | 'forest_hermit_cave' | 'forest_wounded_knight' | 'forest_fairy_circle'
  | 'forest_pilgrim_group'
  | 'forest_mad_trapper' | 'forest_child_runaway' | 'forest_dryad_blessing' | 'forest_traveling_bard'
  | 'forest_beast_tamer'
  | 'forest_ancient_ruins' | 'forest_magic_spring' | 'forest_stone_circle' | 'forest_spirit_lantern'
  | 'forest_cursed_statue'
  | 'forest_memory_tree' | 'forest_dream_flower' | 'forest_echo_grove' | 'forest_time_anomaly'
  | 'forest_lost_relic'
  | 'forest_herb_foraging' | 'forest_animal_tracks' | 'forest_river_crossing' | 'forest_tree_climbing'
  | 'forest_fog_maze'
  | 'forest_waterfall_cave' | 'forest_dead_tree_oracle' | 'forest_flower_field' | 'forest_crow_messenger'
  | 'forest_campfire_stranger'
  | 'shrine_bell' | 'shrine_prayer_beads' | 'shrine_seal_door' | 'shrine_spirit_lamp'
  | 'mine_collapse' | 'mine_ore_vein' | 'mine_echo_tunnel' | 'mine_rusted_lift'
  | 'wastes_storm' | 'wastes_bone_caravan' | 'wastes_glass_mirage' | 'wastes_fallen_banner'
  | 'dawn_ritual' | 'dawn_traveler' | 'dawn_dew_blessing' | 'dawn_hunter_tracks'
  | 'noon_rest' | 'day_patrol' | 'day_training_ground' | 'day_supply_cart'
  | 'dusk_trader' | 'dusk_omen' | 'dusk_crow_omen' | 'dusk_card_dealer'
  | 'night_predator' | 'midnight_wanderer' | 'night_ghost_lantern' | 'night_grave_robbers'
  | 'rep_honored_patrol' | 'rep_grateful_villagers' | 'rep_supply_cache' | 'rep_church_blessing'
  | 'rep_young_squire' | 'rep_hero_statue' | 'rep_royal_messenger' | 'rep_champion_challenge'
  | 'rep_forest_rangers' | 'rep_shrine_pilgrims' | 'rep_mine_rescue_crew' | 'rep_wastes_refugees'
  | 'rep_dawn_procession' | 'rep_day_public_thanks' | 'rep_dusk_safe_lodging' | 'rep_night_watch_signal'
  | 'world_plague_spreads' | 'world_bandit_coalition' | 'world_convoy_attacked' | 'world_magic_surge'
  | 'world_dark_omen'
  | 'world_price_gouger' | 'world_tax_collector' | 'world_supply_shortage' | 'world_merchant_guild_job'
  | 'world_ancient_inscription' | 'world_spy_letter' | 'world_missing_persons' | 'world_old_chronicle'
  | 'world_prophetic_vision' | 'world_secret_meeting'
  | 'world_faction_standoff' | 'world_church_inquisition' | 'world_shadow_offer' | 'world_hunters_mission'
  | 'world_villager_dispute'
  | GuildExploreEventId;

export interface PickExploreEventInput {
  player: PlayerRow;
  guildId: string;
  hasCombat: boolean;
  hasLegacy: boolean;
}

export interface ExploreEventCallbacks {
  startCombat: (enemyId: string) => Promise<void>;
  startCombatWithEnemy: (
    enemy: any,
    onVictory?: CombatVictoryHandler,
    onDeath?: CombatDeathHandler,
    onFlee?: CombatFleeHandler
  ) => Promise<void>;
  showAmbush: () => Promise<void>;
  showLegacyFind: () => Promise<void>;
  showMerchant: () => Promise<void>;
  showHealingSpring: () => Promise<void>;
  showTrap: () => Promise<void>;
  showAncientAltar: () => Promise<void>;
  showMysteriousFigure: () => Promise<void>;
  showVillagerRescue: () => Promise<void>;
  showCaravanRobbery: () => Promise<void>;
  showLootFind: () => Promise<void>;
  showSoulShop: () => Promise<void>;
  showAbandonedCamp: () => Promise<void>;
  showLostPouch: () => Promise<void>;
  showRuneStone: () => Promise<void>;
  showTreasureChest: () => Promise<void>;
  showWanderingHealer: () => Promise<void>;
  showSpiritTrial: () => Promise<void>;
  buildContinueExploreRow: (userId: string) => ActionRowBuilder<ButtonBuilder>[];
  attachContinueExploreHandler: (
    message: Message<boolean>,
    interaction: ChatInputCommandInteraction,
    userId: string,
    guildId: string
  ) => Promise<void> | void;
  handleVictory: CombatVictoryHandler;
  handleDeath: CombatDeathHandler;
  handleFlee: CombatFleeHandler;
}

export interface RunExploreEventInput {
  event: ExploreEventType;
  interaction: ChatInputCommandInteraction;
  userId: string;
  guildId: string;
  player: PlayerRow;
  enemies: any[];
  legacies: any[];
  callbacks: ExploreEventCallbacks;
  /** When set, explore events use majority voting among all party members */
  partyMemberIds?: string[];
  /** Display names for party members, keyed by userId — used for fishing minigame logs */
  partyMemberNames?: Record<string, string>;
}
