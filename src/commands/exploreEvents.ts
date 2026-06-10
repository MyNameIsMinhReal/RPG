import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  ChatInputCommandInteraction,
  EmbedBuilder,
  Message
} from 'discord.js';
import {
  addItem,
  adjustReputation,
  adjustWanted,
  getWantedLevel,
  getWantedTitle,
  adjustFaction,
  addPet,
  getItemQty,
  getPlayer, getEffectivePlayer,
  grantExp,
  grantGold,
  grantSoulShards,
  incrementKills,
  removeItem,
  setZone,
  spendGold,
  updatePlayerHpMp,
  applyPassiveStats
} from '../systems/player';
import { startCombatFlowWithEnemy, type CombatDeathHandler, type CombatVictoryHandler, type CombatFleeHandler } from '../systems/combatFlow';
import { getEquipment } from '../data/equipment';
import { getItem } from '../data/items';
import { getZone, ZONES } from '../data/zones';
import { getFlag, deleteFlag, getShopMarkup, getShopkeeperRobberyCount, increaseShopMarkup, logEvent, setFlag, setWorldEvent, getMerchantFear, increaseMerchantFear, adjustWorldDanger } from '../systems/world';
import { COLORS, simpleEmbed, type PlayerRow } from '../utils/embeds';
import { pick, randInt } from '../utils/format';
import { withImage } from '../utils/eventImages';
import { getBuff, consumeBuff, setBuff } from '../systems/consumables';
import { startFishingMiniGame } from './fish';
import { onlyUser } from '../utils/collectors';
import { incrementChapterObjective } from '../systems/chapter';
import { getPityCounters, getPityBonus, PITY_EVENTS } from '../systems/pity';
import { startOakHunt, isOakHuntActive, hasOakPrereq, OAK_HUNT_EXPLORES } from '../systems/oakEvent';
import type { DataDrivenExploreEventId } from '../data/exploreEventDefs';
import { getDataDrivenEventWeights, isDataDrivenExploreEvent, runDataDrivenExploreEvent } from '../systems/eventEngine';
import {
  showForestWhisperingTree, showForestWolfDen, showForestHerbalistHut, showForestMoonlitClearing,
  showForestBanditAmbush, showForestGiantSpider, showForestCursedScarecrow, showForestSnakePit, showForestPoacherCamp,
  showForestCorruptedTreant, showForestWildBoar, showForestPoisonSpores, showForestRabidFox, showForestBanditWatchtower,
  showForestHollowLog, showForestBuriedChest, showForestEagleNest, showForestMushroomRing, showForestAmberSap,
  showForestForgottenPack, showForestBeehive, showForestFruitGrove, showForestSilkCocoon, showForestBogPearl,
  showForestLostMerchant, showForestHermitCave, showForestWoundedKnight, showForestFairyCircle, showForestPilgrimGroup,
  showForestMadTrapper, showForestChildRunaway, showForestDryadBlessing, showForestTravelingBard, showForestBeastTamer,
  showForestAncientRuins, showForestMagicSpring, showForestStoneCircle, showForestSpiritLantern, showForestCursedStatue,
  showForestMemoryTree, showForestDreamFlower, showForestEchoGrove, showForestTimeAnomaly, showForestLostRelic,
  showForestHerbForaging, showForestAnimalTracks, showForestRiverCrossing, showForestTreeClimbing, showForestFogMaze,
  showForestWaterfallCave, showForestDeadTreeOracle, showForestFlowerField, showForestCrowMessenger, showForestCampfireStranger,
} from './exploreEvents.forest';
import { showShrineSilentBell, showShrinePrayerBeads, showShrineSealDoor, showShrineSpiritLamp, showShrineWeepingStatue, showShrineForbiddenOffering, showShrineSealedReliquary } from './exploreEvents.shrine';
import { showMineCollapse, showMineRichOreVein, showMineEchoTunnel, showMineRustedLift, showMineRunawayCart, showMineLivingOre, showMineTrappedMiner } from './exploreEvents.mines';
import { showWastesAshStorm, showWastesBoneCaravan, showWastesGlassMirage, showWastesFallenBanner, showWastesMirrorSelf, showWastesMemoryRain, showWastesFacelessMerchant } from './exploreEvents.wastes';
import {
  getTimeOfDay, getTimeWeightMultipliers,
  showDawnRitual, showDawnTraveler, showDawnDewBlessing, showDawnHunterTracks,
  showNoonRest, showDayPatrol, showDayTrainingGround, showDaySupplyCart,
  showDuskTrader, showDuskOmen, showDuskCrowOmen, showDuskCardDealer,
  showNightPredator, showMidnightWanderer, showNightGhostLantern, showNightGraveRobbers
} from './exploreEvents.time';
import {
  showRepHonoredPatrol, showRepGratefulVillagers, showRepSupplyCache, showRepChurchBlessing,
  showRepYoungSquire, showRepHeroStatue, showRepRoyalMessenger, showRepChampionChallenge,
  showRepForestRangers, showRepShrinePilgrims, showRepMineRescueCrew, showRepWastesRefugees,
  showRepDawnProcession, showRepDayPublicThanks, showRepDuskSafeLodging, showRepNightWatchSignal
} from './exploreEvents.reputation';
import {
  showWorldPlaguesSpreads, showWorldBanditCoalition, showWorldConvoyAttacked, showWorldMagicSurge, showWorldDarkOmen,
  showWorldPriceGouger, showWorldTaxCollector, showWorldSupplyShortage, showWorldMerchantGuildJob,
  showWorldAncientInscription, showWorldSpyLetter, showWorldMissingPersons, showWorldOldChronicle,
  showWorldPropheticVision, showWorldSecretMeeting,
  showWorldFactionStandoff, showWorldChurchInquisition, showWorldShadowOffer, showWorldHuntersMission, showWorldVillagerDispute,
} from './exploreEvents.world';

export type ExploreEventType = DataDrivenExploreEventId | 'mimic_chest' | 'wandering_blacksmith' | 'temporary_arena' | 'boss_tracks' | 'map_seller' | 'shrine_weeping_statue' | 'shrine_forbidden_offering' | 'shrine_sealed_reliquary' | 'mine_runaway_cart' | 'mine_living_ore' | 'mine_trapped_miner' | 'wastes_mirror_self' | 'wastes_memory_rain' | 'wastes_faceless_merchant' 
  | 'combat' | 'ambush' | 'legacy' | 'merchant' | 'spring' | 'trap' | 'altar' | 'mysterious' | 'villager' | 'caravan' | 'loot'
  | 'soul_shop' | 'abandoned_camp' | 'lost_pouch' | 'rune_stone' | 'treasure_chest' | 'wandering_healer' | 'spirit_trial'
  | 'blood_trail' | 'nameless_grave' | 'memory_seller' | 'stranger_campfire' | 'cracked_shrine' | 'injured_monster'
  | 'wanted_merchant' | 'bounty_hunter' | 'rebirth_rift' | 'failed_legacy' | 'mirror_clone' | 'talking_corpse'
  | 'black_eclipse' | 'fate_coin' | 'merchant_tax' | 'merchant_guard' | 'wanted_notice' | 'shopkeeper_mercy'
  | 'shrine_relic_event' | 'forgotten_crown_event' | 'flower_crown_event' | 'knight_emblem_event' | 'bard_song_event'
  | 'black_cat' | 'dice_gambler' | 'glowing_mushroom' | 'chained_prisoner' | 'magic_fountain' | 'laughing_bones'
  | 'missing_child_chain' | 'black_market' | 'atonement_monk' | 'conditional_miniboss' | 'fishing_spot' | 'oak_hunt_start' | 'nothing'
  // Zone-specific events (separate files)
  | 'forest_tree' | 'forest_wolf_den' | 'forest_herbalist_hut' | 'forest_moonlit_clearing'
  | 'forest_bandit_ambush' | 'forest_giant_spider' | 'forest_cursed_scarecrow' | 'forest_snake_pit' | 'forest_poacher_camp'
  | 'forest_corrupted_treant' | 'forest_wild_boar' | 'forest_poison_spores' | 'forest_rabid_fox' | 'forest_bandit_watchtower'
  | 'forest_hollow_log' | 'forest_buried_chest' | 'forest_eagle_nest' | 'forest_mushroom_ring' | 'forest_amber_sap'
  | 'forest_forgotten_pack' | 'forest_beehive' | 'forest_fruit_grove' | 'forest_silk_cocoon' | 'forest_bog_pearl'
  | 'forest_lost_merchant' | 'forest_hermit_cave' | 'forest_wounded_knight' | 'forest_fairy_circle' | 'forest_pilgrim_group'
  | 'forest_mad_trapper' | 'forest_child_runaway' | 'forest_dryad_blessing' | 'forest_traveling_bard' | 'forest_beast_tamer'
  | 'forest_ancient_ruins' | 'forest_magic_spring' | 'forest_stone_circle' | 'forest_spirit_lantern' | 'forest_cursed_statue'
  | 'forest_memory_tree' | 'forest_dream_flower' | 'forest_echo_grove' | 'forest_time_anomaly' | 'forest_lost_relic'
  | 'forest_herb_foraging' | 'forest_animal_tracks' | 'forest_river_crossing' | 'forest_tree_climbing' | 'forest_fog_maze'
  | 'forest_waterfall_cave' | 'forest_dead_tree_oracle' | 'forest_flower_field' | 'forest_crow_messenger' | 'forest_campfire_stranger'
  | 'shrine_bell' | 'shrine_prayer_beads' | 'shrine_seal_door' | 'shrine_spirit_lamp'
  | 'mine_collapse' | 'mine_ore_vein' | 'mine_echo_tunnel' | 'mine_rusted_lift'
  | 'wastes_storm' | 'wastes_bone_caravan' | 'wastes_glass_mirage' | 'wastes_fallen_banner'
  // Time-of-day events (separate file)
  | 'dawn_ritual' | 'dawn_traveler' | 'dawn_dew_blessing' | 'dawn_hunter_tracks'
  | 'noon_rest' | 'day_patrol' | 'day_training_ground' | 'day_supply_cart'
  | 'dusk_trader' | 'dusk_omen' | 'dusk_crow_omen' | 'dusk_card_dealer'
  | 'night_predator' | 'midnight_wanderer' | 'night_ghost_lantern' | 'night_grave_robbers'
  // High reputation events (separate file)
  | 'rep_honored_patrol' | 'rep_grateful_villagers' | 'rep_supply_cache' | 'rep_church_blessing'
  | 'rep_young_squire' | 'rep_hero_statue' | 'rep_royal_messenger' | 'rep_champion_challenge'
  | 'rep_forest_rangers' | 'rep_shrine_pilgrims' | 'rep_mine_rescue_crew' | 'rep_wastes_refugees'
  | 'rep_dawn_procession' | 'rep_day_public_thanks' | 'rep_dusk_safe_lodging' | 'rep_night_watch_signal'
  // World-affecting events (all zones)
  | 'world_plague_spreads' | 'world_bandit_coalition' | 'world_convoy_attacked' | 'world_magic_surge' | 'world_dark_omen'
  | 'world_price_gouger' | 'world_tax_collector' | 'world_supply_shortage' | 'world_merchant_guild_job'
  | 'world_ancient_inscription' | 'world_spy_letter' | 'world_missing_persons' | 'world_old_chronicle' | 'world_prophetic_vision' | 'world_secret_meeting'
  | 'world_faction_standoff' | 'world_church_inquisition' | 'world_shadow_offer' | 'world_hunters_mission' | 'world_villager_dispute';

export interface PickExploreEventInput {
  player: PlayerRow;
  guildId: string;
  hasCombat: boolean;
  hasLegacy: boolean;
}

export interface ExploreEventCallbacks {
  startCombat: (enemyId: string) => Promise<void>;
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

export function pickExploreEvent(input: PickExploreEventInput): ExploreEventType {
  const { player, guildId, hasCombat, hasLegacy } = input;

  // Admin-forced event takes priority — consumed immediately
  const forcedKey = `forced_event_${player.user_id}`;
  const forcedEvent = getFlag(guildId, forcedKey) as ExploreEventType | null;
  if (forcedEvent) {
    deleteFlag(guildId, forcedKey);
    return forcedEvent;
  }

  const rep = player.reputation ?? 0;
  const wanted = getWantedLevel(player.user_id, guildId);
  const deaths = player.deaths ?? 0;
  const robberyCount = getShopkeeperRobberyCount(guildId, player.user_id);
  const markup = getShopMarkup(guildId);
  const missingChildStage = Number(getFlag(guildId, `missing_child_${player.user_id}`) ?? '0') || 0;
  const detection = !!consumeBuff(player.user_id, guildId, 'scroll_detection');
  const lucky = !!consumeBuff(player.user_id, guildId, 'luck');
  const blackMarketAccess = !!getBuff(player.user_id, guildId, 'black_market_access');
  const goodBoost = detection ? 2 : lucky ? 1 : 0;
  const badPenalty = detection ? 0.45 : 1;
  const highRepBonus = rep >= 20 ? Math.min(5, Math.floor((rep - 20) / 15) + 1) : 0;

  const pity = getPityCounters(player.user_id, guildId);
  const time = getTimeOfDay();
  const timeMult = getTimeWeightMultipliers(time);
  const tm = (event: ExploreEventType, base: number) =>
    base <= 0 ? base : Math.max(1, Math.round(base * (timeMult[event] ?? 1)));

  const base: Array<[ExploreEventType, number]> = [
    ...getDataDrivenEventWeights(input),
    ['combat', hasCombat ? 15 : 0],
    ['ambush', hasCombat ? Math.floor(tm('ambush', 7) * badPenalty) : 0],
    ['legacy', hasLegacy ? 6 : 0],
    ['merchant', tm('merchant', 7 + goodBoost)],
    ['spring', tm('spring', 5 + goodBoost)],
    ['trap', Math.floor(5 * badPenalty)],
    ['altar', 4],
    ['mysterious', tm('mysterious', 4)],
    ['villager', tm('villager', 4)],
    ['caravan', tm('caravan', 3)],
    ['loot', tm('loot', 4 + goodBoost)],
    ['soul_shop', (player.soul_shards >= 1 ? 4 : 1) + goodBoost],
    ['abandoned_camp', 4],
    ['lost_pouch', 3],
    ['rune_stone', 3],
    ['treasure_chest', 3],
    ['wandering_healer', 3],
    ['spirit_trial', hasCombat ? 2 : 0],

    // New story events.
    ['blood_trail', hasCombat ? tm('blood_trail', 4) : 0],
    ['nameless_grave', 4],
    ['memory_seller', tm('memory_seller', 3)],
    ['stranger_campfire', 4],
    ['cracked_shrine', 4],
    ['injured_monster', hasCombat ? 3 : 0],
    ['wanted_merchant', tm('wanted_merchant', 3)],
    ['bounty_hunter', (rep <= -20 || wanted >= 2) && hasCombat ? tm('bounty_hunter', 5 + wanted * 2) : 0],
    ['rebirth_rift', 3],
    ['failed_legacy', deaths > 0 ? 4 : 0],
    ['mirror_clone', hasCombat ? 3 : 0],
    ['talking_corpse', tm('talking_corpse', 3)],
    ['black_eclipse', tm('black_eclipse', 1)],
    ['fate_coin', 3],
    // Key item events — only appear when player has the item
    ['shrine_relic_event',    getItemQty(player.user_id, guildId, 'shrine_relic')    > 0 ? 5 : 0],
    ['forgotten_crown_event', getItemQty(player.user_id, guildId, 'forgotten_crown') > 0 ? 4 : 0],
    ['flower_crown_event',    getItemQty(player.user_id, guildId, 'flower_crown')    > 0 && player.zone_id === 'forest' ? 5 : 0],
    ['knight_emblem_event',   getItemQty(player.user_id, guildId, 'knight_emblem')   > 0 ? 5 : 0],
    ['bard_song_event',       getItemQty(player.user_id, guildId, 'bard_song')       > 0 ? 5 : 0],
    ['merchant_tax', robberyCount > 0 || markup > 0 ? 3 : 0],
    ['merchant_guard', (rep <= -35 || wanted >= 3) && hasCombat ? 3 + wanted : 0],
    ['wanted_notice', robberyCount > 0 || rep <= -25 || wanted > 0 ? 3 + wanted : 0],
    ['shopkeeper_mercy', robberyCount > 0 ? 2 : 0],
    ['black_cat', tm('black_cat', 3)],
    ['dice_gambler', 3],
    ['glowing_mushroom', 3],
    ['chained_prisoner', 3],
    ['magic_fountain', 3],
    ['laughing_bones', 3],
    ['missing_child_chain', missingChildStage > 0 ? 4 : 2],
    ['black_market', blackMarketAccess ? 10 : ((rep <= -30 || wanted >= 3) ? 5 : 0)],
    ['atonement_monk', (wanted > 0 || rep < -15) ? 4 : 0],
    ['conditional_miniboss', hasCombat && (wanted >= 3 || rep <= -60 || deaths >= 3 || robberyCount >= 2) ? 4 : 0],
    ['fishing_spot', player.zone_id ? 5 : 0],
    ['oak_hunt_start', player.zone_id === 'forest' && !hasOakPrereq(guildId, player.user_id) && !isOakHuntActive(guildId, player.user_id) ? 4 : 0],

    // High reputation events — appear more often as reputation climbs.
    ['mimic_chest', player.zone_id ? 4 + goodBoost : 0], ['wandering_blacksmith', tm('wandering_blacksmith', 3 + goodBoost)], ['temporary_arena', hasCombat ? 3 : 0], ['boss_tracks', hasCombat && player.zone_id !== 'village' ? 3 : 0], ['map_seller', player.zone_id ? 3 : 0], ['rep_honored_patrol',      rep >= 25 ? tm('rep_honored_patrol', 3 + highRepBonus) : 0],
    ['rep_grateful_villagers',  rep >= 30 ? tm('rep_grateful_villagers', 3 + highRepBonus) : 0],
    ['rep_supply_cache',        rep >= 40 ? tm('rep_supply_cache', 3 + highRepBonus) : 0],
    ['rep_church_blessing',     rep >= 45 ? tm('rep_church_blessing', 2 + highRepBonus) : 0],
    ['rep_young_squire',        rep >= 55 ? tm('rep_young_squire', 2 + highRepBonus) : 0],
    ['rep_hero_statue',         rep >= 65 ? tm('rep_hero_statue', 2 + highRepBonus) : 0],
    ['rep_royal_messenger',     rep >= 80 ? tm('rep_royal_messenger', 2 + highRepBonus) : 0],
    ['rep_champion_challenge',  rep >= 90 && hasCombat ? tm('rep_champion_challenge', 2 + highRepBonus) : 0],

    // High reputation zone-specific events.
    ['rep_forest_rangers',      rep >= 40 && player.zone_id === 'forest' ? 3 + highRepBonus : 0],
    ['rep_shrine_pilgrims',     rep >= 40 && player.zone_id === 'shrine' ? 3 + highRepBonus : 0],
    ['rep_mine_rescue_crew',    rep >= 40 && player.zone_id === 'mines'  ? 3 + highRepBonus : 0],
    ['rep_wastes_refugees',     rep >= 40 && player.zone_id === 'wastes' ? 3 + highRepBonus : 0],

    // High reputation time-specific events.
    ['rep_dawn_procession',     rep >= 50 && time === 'dawn'  ? 3 + highRepBonus : 0],
    ['rep_day_public_thanks',   rep >= 50 && time === 'day'   ? 3 + highRepBonus : 0],
    ['rep_dusk_safe_lodging',   rep >= 50 && time === 'dusk'  ? 3 + highRepBonus : 0],
    ['rep_night_watch_signal',  rep >= 50 && time === 'night' ? 3 + highRepBonus : 0],

    // Zone-specific events
    ['forest_tree',              player.zone_id === 'forest' ? 4 : 0],
    ['forest_wolf_den',          player.zone_id === 'forest' ? 3 : 0],
    ['forest_herbalist_hut',     player.zone_id === 'forest' ? 3 : 0],
    ['forest_moonlit_clearing',  player.zone_id === 'forest' ? (time === 'night' || time === 'dusk' ? 4 : 2) : 0],
    // New forest events
    ['forest_bandit_ambush',     player.zone_id === 'forest' && hasCombat ? 3 : 0],
    ['forest_giant_spider',      player.zone_id === 'forest' && hasCombat ? 3 : 0],
    ['forest_cursed_scarecrow',  player.zone_id === 'forest' ? 2 : 0],
    ['forest_snake_pit',         player.zone_id === 'forest' ? 3 : 0],
    ['forest_poacher_camp',      player.zone_id === 'forest' ? 3 : 0],
    ['forest_corrupted_treant',  player.zone_id === 'forest' && hasCombat ? 2 : 0],
    ['forest_wild_boar',         player.zone_id === 'forest' ? 3 : 0],
    ['forest_poison_spores',     player.zone_id === 'forest' ? 3 : 0],
    ['forest_rabid_fox',         player.zone_id === 'forest' ? 2 : 0],
    ['forest_bandit_watchtower', player.zone_id === 'forest' ? 2 : 0],
    ['forest_hollow_log',        player.zone_id === 'forest' ? 4 : 0],
    ['forest_buried_chest',      player.zone_id === 'forest' ? 3 : 0],
    ['forest_eagle_nest',        player.zone_id === 'forest' ? 2 : 0],
    ['forest_mushroom_ring',     player.zone_id === 'forest' ? 3 : 0],
    ['forest_amber_sap',         player.zone_id === 'forest' ? 2 : 0],
    ['forest_forgotten_pack',    player.zone_id === 'forest' ? 4 : 0],
    ['forest_beehive',           player.zone_id === 'forest' ? 3 : 0],
    ['forest_fruit_grove',       player.zone_id === 'forest' ? 4 : 0],
    ['forest_silk_cocoon',       player.zone_id === 'forest' ? 2 : 0],
    ['forest_bog_pearl',         player.zone_id === 'forest' ? 2 : 0],
    ['forest_lost_merchant',     player.zone_id === 'forest' ? 3 : 0],
    ['forest_hermit_cave',       player.zone_id === 'forest' ? 3 : 0],
    ['forest_wounded_knight',    player.zone_id === 'forest' ? 3 : 0],
    ['forest_fairy_circle',      player.zone_id === 'forest' ? (time === 'night' || time === 'dusk' ? 4 : 2) : 0],
    ['forest_pilgrim_group',     player.zone_id === 'forest' ? 3 : 0],
    ['forest_mad_trapper',       player.zone_id === 'forest' ? 3 : 0],
    ['forest_child_runaway',     player.zone_id === 'forest' ? 2 : 0],
    ['forest_dryad_blessing',    player.zone_id === 'forest' ? 2 : 0],
    ['forest_traveling_bard',    player.zone_id === 'forest' ? 3 : 0],
    ['forest_beast_tamer',       player.zone_id === 'forest' ? 2 : 0],
    ['forest_ancient_ruins',     player.zone_id === 'forest' ? 3 : 0],
    ['forest_magic_spring',      player.zone_id === 'forest' ? 3 : 0],
    ['forest_stone_circle',      player.zone_id === 'forest' ? 3 : 0],
    ['forest_spirit_lantern',    player.zone_id === 'forest' ? (time === 'night' ? 4 : 1) : 0],
    ['forest_cursed_statue',     player.zone_id === 'forest' ? 2 : 0],
    ['forest_memory_tree',       player.zone_id === 'forest' ? 2 : 0],
    ['forest_dream_flower',      player.zone_id === 'forest' ? (time === 'night' || time === 'dusk' ? 3 : 1) : 0],
    ['forest_echo_grove',        player.zone_id === 'forest' ? 3 : 0],
    ['forest_time_anomaly',      player.zone_id === 'forest' ? 1 : 0],
    ['forest_lost_relic',        player.zone_id === 'forest' ? 5 : 0],
    ['forest_herb_foraging',     player.zone_id === 'forest' ? 4 : 0],
    ['forest_animal_tracks',     player.zone_id === 'forest' ? 4 : 0],
    ['forest_river_crossing',    player.zone_id === 'forest' ? 3 : 0],
    ['forest_tree_climbing',     player.zone_id === 'forest' ? 3 : 0],
    ['forest_fog_maze',          player.zone_id === 'forest' ? (time === 'dawn' || time === 'dusk' ? 4 : 2) : 0],
    ['forest_waterfall_cave',    player.zone_id === 'forest' ? 2 : 0],
    ['forest_dead_tree_oracle',  player.zone_id === 'forest' ? 2 : 0],
    ['forest_flower_field',      player.zone_id === 'forest' ? 3 : 0],
    ['forest_crow_messenger',    player.zone_id === 'forest' ? 3 : 0],
    ['forest_campfire_stranger', player.zone_id === 'forest' ? 3 : 0],
    ['shrine_bell',              player.zone_id === 'shrine' ? 4 : 0],
    ['shrine_prayer_beads',      player.zone_id === 'shrine' ? 3 : 0],
    ['shrine_seal_door',         player.zone_id === 'shrine' ? 3 : 0],
    ['shrine_spirit_lamp',       player.zone_id === 'shrine' ? (time === 'night' ? 4 : 2) : 0],
    ['shrine_weeping_statue', player.zone_id === 'shrine' ? 3 : 0], ['shrine_forbidden_offering', player.zone_id === 'shrine' ? 2 : 0], ['shrine_sealed_reliquary', player.zone_id === 'shrine' ? 3 : 0], ['mine_collapse',            player.zone_id === 'mines'  ? 4 : 0],
    ['mine_ore_vein',            player.zone_id === 'mines'  ? 4 : 0],
    ['mine_echo_tunnel',         player.zone_id === 'mines'  ? 3 : 0],
    ['mine_rusted_lift',         player.zone_id === 'mines'  ? 3 : 0],
    ['mine_runaway_cart', player.zone_id === 'mines' ? 3 : 0], ['mine_living_ore', player.zone_id === 'mines' ? 3 : 0], ['mine_trapped_miner', player.zone_id === 'mines' ? 3 : 0], ['wastes_storm',             player.zone_id === 'wastes' ? 4 : 0],
    ['wastes_bone_caravan',      player.zone_id === 'wastes' ? 3 : 0],
    ['wastes_glass_mirage',      player.zone_id === 'wastes' ? 3 : 0],
    ['wastes_fallen_banner',     player.zone_id === 'wastes' ? 3 : 0],

    // Time-of-day events
    ['wastes_mirror_self', player.zone_id === 'wastes' && hasCombat ? 3 : 0], ['wastes_memory_rain', player.zone_id === 'wastes' ? 3 : 0], ['wastes_faceless_merchant', player.zone_id === 'wastes' ? 3 : 0], ['dawn_ritual',        time === 'dawn'  ? 4 : 0],
    ['dawn_traveler',      time === 'dawn'  ? 3 : 0],
    ['dawn_dew_blessing',  time === 'dawn'  ? 3 : 0],
    ['dawn_hunter_tracks', time === 'dawn'  ? 3 : 0],
    ['noon_rest',          time === 'day'   ? 3 : 0],
    ['day_patrol',         time === 'day'   ? 3 : 0],
    ['day_training_ground',time === 'day'   ? 3 : 0],
    ['day_supply_cart',    time === 'day'   ? 3 : 0],
    ['dusk_trader',        time === 'dusk'  ? 4 : 0],
    ['dusk_omen',          time === 'dusk'  ? 3 : 0],
    ['dusk_crow_omen',     time === 'dusk'  ? 3 : 0],
    ['dusk_card_dealer',   time === 'dusk'  ? 3 : 0],
    ['night_predator',     time === 'night' && hasCombat ? 4 : 0],
    ['midnight_wanderer',  time === 'night' ? 3 : 0],
    ['night_ghost_lantern',time === 'night' ? 3 : 0],
    ['night_grave_robbers',time === 'night' ? 3 : 0],

    // World-affecting events (universal — all zones, all times)
    ['world_plague_spreads',      2],
    ['world_bandit_coalition',    2],
    ['world_convoy_attacked',     2],
    ['world_magic_surge',         2],
    ['world_dark_omen',           2],
    ['world_price_gouger',        3],
    ['world_tax_collector',       3],
    ['world_supply_shortage',     2],
    ['world_merchant_guild_job',  2],
    ['world_ancient_inscription', 2],
    ['world_spy_letter',          1],
    ['world_missing_persons',     2],
    ['world_old_chronicle',       2],
    ['world_prophetic_vision',    1],
    ['world_secret_meeting',      1],
    ['world_faction_standoff',    2],
    ['world_church_inquisition',  2],
    ['world_shadow_offer',        2],
    ['world_hunters_mission',     2],
    ['world_villager_dispute',    2],
  ];

  // Apply pity bonus to unconditional events that haven't appeared in a while.
  const table = base.map(([event, w]): [ExploreEventType, number] => {
    if (w > 0 && PITY_EVENTS.has(event)) {
      return [event, w + getPityBonus(pity.get(event) ?? 0)];
    }
    return [event, w];
  });

  const total = table.reduce((sum, [, weight]) => sum + Math.max(0, weight), 0);
  let roll = randInt(1, total || 1);
  for (const [event, weight] of table) {
    if (weight <= 0) continue;
    roll -= weight;
    if (roll <= 0) return event;
  }
  return 'nothing';
}

export async function runExploreEvent(input: RunExploreEventInput): Promise<void> {
  const ctx = input;
  const cb = ctx.callbacks;

  if (isDataDrivenExploreEvent(ctx.event)) return runDataDrivenExploreEvent(ctx);

  switch (ctx.event) {
    case 'combat': return cb.startCombat(pick(ctx.enemies).id);
    case 'ambush': return cb.showAmbush();
    case 'legacy': return cb.showLegacyFind();
    case 'merchant': return cb.showMerchant();
    case 'spring': return cb.showHealingSpring();
    case 'trap': return cb.showTrap();
    case 'altar': return cb.showAncientAltar();
    case 'mysterious': return cb.showMysteriousFigure();
    case 'villager': return cb.showVillagerRescue();
    case 'caravan': return cb.showCaravanRobbery();
    case 'loot': return cb.showLootFind();
    case 'soul_shop': return cb.showSoulShop();
    case 'abandoned_camp': return cb.showAbandonedCamp();
    case 'lost_pouch': return cb.showLostPouch();
    case 'rune_stone': return cb.showRuneStone();
    case 'treasure_chest': return cb.showTreasureChest();
    case 'wandering_healer': return cb.showWanderingHealer();
    case 'spirit_trial': return cb.showSpiritTrial();

    case 'blood_trail': return showBloodTrail(ctx);
    case 'nameless_grave': return showNamelessGrave(ctx);
    case 'memory_seller': return showMemorySeller(ctx);
    case 'stranger_campfire': return showStrangerCampfire(ctx);
    case 'cracked_shrine': return showCrackedShrine(ctx);
    case 'injured_monster': return showInjuredMonster(ctx);
    case 'wanted_merchant': return showWantedMerchant(ctx);
    case 'bounty_hunter': return showBountyHunter(ctx);
    case 'rebirth_rift': return showRebirthRift(ctx);
    case 'failed_legacy': return showFailedLegacy(ctx);
    case 'mirror_clone': return showMirrorClone(ctx);
    case 'talking_corpse': return showTalkingCorpse(ctx);
    case 'black_eclipse': return showBlackEclipse(ctx);
    case 'fate_coin': return showFateCoin(ctx);
    case 'shrine_relic_event':    return showShrineRelicEvent(ctx);
    case 'forgotten_crown_event': return showForgottenCrownEvent(ctx);
    case 'flower_crown_event':    return showFlowerCrownEvent(ctx);
    case 'knight_emblem_event':   return showKnightEmblemEvent(ctx);
    case 'bard_song_event':       return showBardSongEvent(ctx);
    case 'merchant_tax': return showMerchantTax(ctx);
    case 'merchant_guard': return showMerchantGuard(ctx);
    case 'wanted_notice': return showWantedNotice(ctx);
    case 'shopkeeper_mercy': return showShopkeeperMercy(ctx);
    case 'black_cat': return showBlackCat(ctx);
    case 'dice_gambler': return showDiceGambler(ctx);
    case 'glowing_mushroom': return showGlowingMushroom(ctx);
    case 'chained_prisoner': return showChainedPrisoner(ctx);
    case 'magic_fountain': return showMagicFountain(ctx);
    case 'laughing_bones': return showLaughingBones(ctx);
    case 'missing_child_chain': return showMissingChildChain(ctx);
    case 'black_market': return showBlackMarket(ctx);
    case 'atonement_monk': return showAtonementMonk(ctx);
    case 'conditional_miniboss': return showConditionalMiniboss(ctx);
    case 'fishing_spot': return showFishingSpot(ctx);
    case 'oak_hunt_start': return showOakHuntStart(ctx);
     case 'mimic_chest': return showMimicChest(ctx); case 'wandering_blacksmith': return showWanderingBlacksmith(ctx); case 'temporary_arena': return showTemporaryArena(ctx); case 'boss_tracks': return showBossTracks(ctx); case 'map_seller': return showMapSeller(ctx); case 'rep_honored_patrol':       return showRepHonoredPatrol(ctx);
    case 'rep_grateful_villagers':   return showRepGratefulVillagers(ctx);
    case 'rep_supply_cache':         return showRepSupplyCache(ctx);
    case 'rep_church_blessing':      return showRepChurchBlessing(ctx);
    case 'rep_young_squire':         return showRepYoungSquire(ctx);
    case 'rep_hero_statue':          return showRepHeroStatue(ctx);
    case 'rep_royal_messenger':      return showRepRoyalMessenger(ctx);
    case 'rep_champion_challenge':   return showRepChampionChallenge(ctx);
    case 'rep_forest_rangers':       return showRepForestRangers(ctx);
    case 'rep_shrine_pilgrims':      return showRepShrinePilgrims(ctx);
    case 'rep_mine_rescue_crew':     return showRepMineRescueCrew(ctx);
    case 'rep_wastes_refugees':      return showRepWastesRefugees(ctx);
    case 'rep_dawn_procession':      return showRepDawnProcession(ctx);
    case 'rep_day_public_thanks':    return showRepDayPublicThanks(ctx);
    case 'rep_dusk_safe_lodging':    return showRepDuskSafeLodging(ctx);
    case 'rep_night_watch_signal':   return showRepNightWatchSignal(ctx);
    case 'world_plague_spreads':       return showWorldPlaguesSpreads(ctx);
    case 'world_bandit_coalition':     return showWorldBanditCoalition(ctx);
    case 'world_convoy_attacked':      return showWorldConvoyAttacked(ctx);
    case 'world_magic_surge':          return showWorldMagicSurge(ctx);
    case 'world_dark_omen':            return showWorldDarkOmen(ctx);
    case 'world_price_gouger':         return showWorldPriceGouger(ctx);
    case 'world_tax_collector':        return showWorldTaxCollector(ctx);
    case 'world_supply_shortage':      return showWorldSupplyShortage(ctx);
    case 'world_merchant_guild_job':   return showWorldMerchantGuildJob(ctx);
    case 'world_ancient_inscription':  return showWorldAncientInscription(ctx);
    case 'world_spy_letter':           return showWorldSpyLetter(ctx);
    case 'world_missing_persons':      return showWorldMissingPersons(ctx);
    case 'world_old_chronicle':        return showWorldOldChronicle(ctx);
    case 'world_prophetic_vision':     return showWorldPropheticVision(ctx);
    case 'world_secret_meeting':       return showWorldSecretMeeting(ctx);
    case 'world_faction_standoff':     return showWorldFactionStandoff(ctx);
    case 'world_church_inquisition':   return showWorldChurchInquisition(ctx);
    case 'world_shadow_offer':         return showWorldShadowOffer(ctx);
    case 'world_hunters_mission':      return showWorldHuntersMission(ctx);
    case 'world_villager_dispute':     return showWorldVillagerDispute(ctx);
    case 'forest_tree':              return showForestWhisperingTree(ctx);
    case 'forest_wolf_den':          return showForestWolfDen(ctx);
    case 'forest_herbalist_hut':     return showForestHerbalistHut(ctx);
    case 'forest_moonlit_clearing':  return showForestMoonlitClearing(ctx);
    case 'forest_bandit_ambush':     return showForestBanditAmbush(ctx);
    case 'forest_giant_spider':      return showForestGiantSpider(ctx);
    case 'forest_cursed_scarecrow':  return showForestCursedScarecrow(ctx);
    case 'forest_snake_pit':         return showForestSnakePit(ctx);
    case 'forest_poacher_camp':      return showForestPoacherCamp(ctx);
    case 'forest_corrupted_treant':  return showForestCorruptedTreant(ctx);
    case 'forest_wild_boar':         return showForestWildBoar(ctx);
    case 'forest_poison_spores':     return showForestPoisonSpores(ctx);
    case 'forest_rabid_fox':         return showForestRabidFox(ctx);
    case 'forest_bandit_watchtower': return showForestBanditWatchtower(ctx);
    case 'forest_hollow_log':        return showForestHollowLog(ctx);
    case 'forest_buried_chest':      return showForestBuriedChest(ctx);
    case 'forest_eagle_nest':        return showForestEagleNest(ctx);
    case 'forest_mushroom_ring':     return showForestMushroomRing(ctx);
    case 'forest_amber_sap':         return showForestAmberSap(ctx);
    case 'forest_forgotten_pack':    return showForestForgottenPack(ctx);
    case 'forest_beehive':           return showForestBeehive(ctx);
    case 'forest_fruit_grove':       return showForestFruitGrove(ctx);
    case 'forest_silk_cocoon':       return showForestSilkCocoon(ctx);
    case 'forest_bog_pearl':         return showForestBogPearl(ctx);
    case 'forest_lost_merchant':     return showForestLostMerchant(ctx);
    case 'forest_hermit_cave':       return showForestHermitCave(ctx);
    case 'forest_wounded_knight':    return showForestWoundedKnight(ctx);
    case 'forest_fairy_circle':      return showForestFairyCircle(ctx);
    case 'forest_pilgrim_group':     return showForestPilgrimGroup(ctx);
    case 'forest_mad_trapper':       return showForestMadTrapper(ctx);
    case 'forest_child_runaway':     return showForestChildRunaway(ctx);
    case 'forest_dryad_blessing':    return showForestDryadBlessing(ctx);
    case 'forest_traveling_bard':    return showForestTravelingBard(ctx);
    case 'forest_beast_tamer':       return showForestBeastTamer(ctx);
    case 'forest_ancient_ruins':     return showForestAncientRuins(ctx);
    case 'forest_magic_spring':      return showForestMagicSpring(ctx);
    case 'forest_stone_circle':      return showForestStoneCircle(ctx);
    case 'forest_spirit_lantern':    return showForestSpiritLantern(ctx);
    case 'forest_cursed_statue':     return showForestCursedStatue(ctx);
    case 'forest_memory_tree':       return showForestMemoryTree(ctx);
    case 'forest_dream_flower':      return showForestDreamFlower(ctx);
    case 'forest_echo_grove':        return showForestEchoGrove(ctx);
    case 'forest_time_anomaly':      return showForestTimeAnomaly(ctx);
    case 'forest_lost_relic':        return showForestLostRelic(ctx);
    case 'forest_herb_foraging':     return showForestHerbForaging(ctx);
    case 'forest_animal_tracks':     return showForestAnimalTracks(ctx);
    case 'forest_river_crossing':    return showForestRiverCrossing(ctx);
    case 'forest_tree_climbing':     return showForestTreeClimbing(ctx);
    case 'forest_fog_maze':          return showForestFogMaze(ctx);
    case 'forest_waterfall_cave':    return showForestWaterfallCave(ctx);
    case 'forest_dead_tree_oracle':  return showForestDeadTreeOracle(ctx);
    case 'forest_flower_field':      return showForestFlowerField(ctx);
    case 'forest_crow_messenger':    return showForestCrowMessenger(ctx);
    case 'forest_campfire_stranger': return showForestCampfireStranger(ctx);
    case 'shrine_bell':              return showShrineSilentBell(ctx);
    case 'shrine_prayer_beads':      return showShrinePrayerBeads(ctx);
    case 'shrine_seal_door':         return showShrineSealDoor(ctx);
    case 'shrine_spirit_lamp':       return showShrineSpiritLamp(ctx);
     case 'shrine_weeping_statue': return showShrineWeepingStatue(ctx); case 'shrine_forbidden_offering': return showShrineForbiddenOffering(ctx); case 'shrine_sealed_reliquary': return showShrineSealedReliquary(ctx); case 'mine_collapse':            return showMineCollapse(ctx);
    case 'mine_ore_vein':            return showMineRichOreVein(ctx);
    case 'mine_echo_tunnel':         return showMineEchoTunnel(ctx);
    case 'mine_rusted_lift':         return showMineRustedLift(ctx);
     case 'mine_runaway_cart': return showMineRunawayCart(ctx); case 'mine_living_ore': return showMineLivingOre(ctx); case 'mine_trapped_miner': return showMineTrappedMiner(ctx); case 'wastes_storm':             return showWastesAshStorm(ctx);
    case 'wastes_bone_caravan':      return showWastesBoneCaravan(ctx);
    case 'wastes_glass_mirage':      return showWastesGlassMirage(ctx);
    case 'wastes_fallen_banner':     return showWastesFallenBanner(ctx);
     case 'wastes_mirror_self': return showWastesMirrorSelf(ctx); case 'wastes_memory_rain': return showWastesMemoryRain(ctx); case 'wastes_faceless_merchant': return showWastesFacelessMerchant(ctx); case 'dawn_ritual':          return showDawnRitual(ctx);
    case 'dawn_traveler':        return showDawnTraveler(ctx);
    case 'dawn_dew_blessing':    return showDawnDewBlessing(ctx);
    case 'dawn_hunter_tracks':   return showDawnHunterTracks(ctx);
    case 'noon_rest':            return showNoonRest(ctx);
    case 'day_patrol':           return showDayPatrol(ctx);
    case 'day_training_ground':  return showDayTrainingGround(ctx);
    case 'day_supply_cart':      return showDaySupplyCart(ctx);
    case 'dusk_trader':          return showDuskTrader(ctx);
    case 'dusk_omen':            return showDuskOmen(ctx);
    case 'dusk_crow_omen':       return showDuskCrowOmen(ctx);
    case 'dusk_card_dealer':     return showDuskCardDealer(ctx);
    case 'night_predator':       return showNightPredator(ctx);
    case 'midnight_wanderer':    return showMidnightWanderer(ctx);
    case 'night_ghost_lantern':  return showNightGhostLantern(ctx);
    case 'night_grave_robbers':  return showNightGraveRobbers(ctx);
    default: return finish(ctx, simpleEmbed(COLORS.info, `*${pick(getZone(ctx.player.zone_id)?.ambiance ?? ['Không có gì bất thường...'])}*\n\nKhông có gì bất thường...`));
  }
}

function displayItem(id: string): string {
  const item = getItem(id);
  const eq = getEquipment(id);
  return `${item?.icon ?? eq?.icon ?? '🎁'} **${item?.name ?? eq?.name ?? id}**`;
}

function safeHpLoss(player: PlayerRow, percent: number, minHp = 1): { dmg: number; hp: number } {
  const dmg = Math.max(1, Math.floor(player.max_hp * percent));
  return { dmg, hp: Math.max(minHp, player.hp - dmg) };
}

async function finish(ctx: RunExploreEventInput, embed: EmbedBuilder, imageKey?: string): Promise<void> {
  const payload = imageKey ? withImage(embed, imageKey) : { embed, files: [] as any[] };
  const msg = await ctx.interaction.editReply({
    embeds: [payload.embed],
    files: payload.files,
    components: ctx.callbacks.buildContinueExploreRow(ctx.userId)
  });
  await ctx.callbacks.attachContinueExploreHandler(msg as Message<boolean>, ctx.interaction, ctx.userId, ctx.guildId);
}

async function finishNoContinue(ctx: RunExploreEventInput, embed: EmbedBuilder, imageKey?: string): Promise<void> {
  const payload = imageKey ? withImage(embed, imageKey) : { embed, files: [] as any[] };
  await ctx.interaction.editReply({ embeds: [payload.embed], files: payload.files, components: [] });
}

async function showFishingSpot(ctx: RunExploreEventInput): Promise<void> {
  const FISHING_SPOTS: Record<string, string> = {
    village: '🏘️ Một ao nhỏ sau quán trọ Ashveil. Trông yên bình nhưng đôi lúc có bóng cá rất lớn.',
    forest: '🏞️ Một con suối trong vắt chảy qua kẽ đá — nước lạnh và đầy cá.',
    shrine: '⛩️ Hồ nước linh thiêng bên đền cổ, cá ở đây khác lạ...',
    mines:  '⛏️ Dòng suối ngầm đổ ra từ khe đá — bóng cá lấp lánh trong bóng tối.',
    wastes: '🌌 Một hồ nước đen phản chiếu bầu trời méo mó. Thứ bên dưới có lẽ không chỉ là cá.',
  };
  const flavor = FISHING_SPOTS[ctx.player.zone_id] ?? '🎣 Bạn tìm thấy một điểm câu cá.';
  const baitQty = getItemQty(ctx.userId, ctx.guildId, 'glowing_bait');

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`ev_fish_cast_${ctx.userId}`).setLabel('Thả câu').setEmoji('🎣').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`ev_fish_bait_${ctx.userId}`).setLabel(`Dùng Glowing Bait${baitQty > 0 ? ` x${baitQty}` : ''}`).setEmoji('✨').setStyle(ButtonStyle.Success).setDisabled(baitQty <= 0),
    new ButtonBuilder().setCustomId(`ev_skip_${ctx.userId}`).setLabel('Bỏ qua').setStyle(ButtonStyle.Secondary),
  );
  const embed = new EmbedBuilder()
    .setColor(0x3399ff)
    .setTitle('🎣 Fishing Spot')
    .setDescription([
      flavor,
      '',
      'Mini game gồm 2 pha:',
      '1. Canh đúng lúc cá cắn câu.',
      '2. Chọn hướng kéo để hạ HP cá, giữ tension dưới 100% và không để cạn stamina.',
      '',
      'Một số **pet egg mới** chỉ có thể kiếm được từ câu cá hiếm.',
    ].join('\n'))
    .setFooter({ text: 'Fishing Spot có thể xuất hiện ở mọi zone · cooldown 60s' });

  const reply = await ctx.interaction.editReply({ embeds: [embed], components: [row] });
  const btn = await reply.awaitMessageComponent({
    filter: onlyUser(ctx.userId),
    time: 30_000,
  }).catch(() => null);

  const deferred = btn ? await btn.deferUpdate().then(() => true).catch(() => false) : false;
  if (!deferred || !btn || btn.customId === `ev_skip_${ctx.userId}`) {
    return finish(ctx, simpleEmbed(COLORS.info, '🎣 *Bạn bỏ qua điểm câu cá và tiếp tục hành trình.*'));
  }

  const useBait = btn.customId === `ev_fish_bait_${ctx.userId}`;
  await startFishingMiniGame({
    interaction: ctx.interaction,
    userId: ctx.userId,
    guildId: ctx.guildId,
    playerName: ctx.player.name,
    zoneId: ctx.player.zone_id,
    useBait,
    partyMemberIds: ctx.partyMemberIds,
    partyMemberNames: ctx.partyMemberNames,
    buildContinueExploreRow: ctx.callbacks.buildContinueExploreRow,
    attachContinueExploreHandler: ctx.callbacks.attachContinueExploreHandler,
  });
}

export type VoteResult = { customId: string; deferUpdate(): Promise<void>; isButton(): boolean };

export async function awaitVote(
  ctx: RunExploreEventInput,
  reply: Awaited<ReturnType<typeof ctx.interaction.editReply>>,
  time = 30_000
): Promise<VoteResult | null> {
  const memberIds = ctx.partyMemberIds;

  // Solo path
  if (!memberIds || memberIds.length <= 1) {
    const btn = await reply.awaitMessageComponent({ filter: onlyUser(ctx.userId), time }).catch(() => null);
    if (!btn || !btn.isButton()) return null;
    await btn.deferUpdate().catch(() => {});
    return btn as unknown as VoteResult;
  }

  // Party voting path
  return new Promise<VoteResult | null>(resolve => {
    const votes = new Map<string, string>();
    const collector = reply.createMessageComponentCollector({
      filter: (i) => memberIds.includes(i.user.id) && i.isButton(),
      time
    });
    const updateDisplay = async () => {
      const total = memberIds.length;
      const voted = votes.size;
      const statusLine = `🗳️ Đã vote: **${voted}/${total}**` + (voted < total ? ' — đang chờ...' : '');
      const cur = reply.embeds[0];
      if (cur) {
        await ctx.interaction.editReply({
          embeds: [new EmbedBuilder(cur.toJSON()).setFooter({ text: statusLine })]
        }).catch(() => {});
      }
    };
    collector.on('collect', async (i) => {
      votes.set(i.user.id, i.customId);
      await i.deferUpdate().catch(() => {});
      await updateDisplay();
      if (votes.size >= memberIds.length) collector.stop('all_voted');
    });
    collector.on('end', () => {
      ctx.interaction.editReply({ components: [] }).catch(() => {});
      if (!votes.size) { resolve(null); return; }
      const tally = new Map<string, number>();
      for (const cid of votes.values()) tally.set(cid, (tally.get(cid) ?? 0) + 1);
      let winner = '', maxV = 0;
      for (const [cid, count] of tally) { if (count > maxV) { maxV = count; winner = cid; } }
      resolve(winner ? { customId: winner, deferUpdate: async () => {}, isButton: () => true } : null);
    });
  });
}

async function awaitButton(ctx: RunExploreEventInput, row: ActionRowBuilder<ButtonBuilder>, embed: EmbedBuilder, imageKey?: string, time = 30_000): Promise<string | null> {
  const payload = imageKey ? withImage(embed, imageKey) : { embed, files: [] as any[] };
  const reply = await ctx.interaction.editReply({ embeds: [payload.embed], files: payload.files, components: [row] });

  // Solo path
  const memberIds = ctx.partyMemberIds;
  if (!memberIds || memberIds.length <= 1) {
    const btn = await reply.awaitMessageComponent({ filter: onlyUser(ctx.userId), time }).catch(() => null);
    if (!btn || !btn.isButton()) return null;
    const ok = await btn.deferUpdate().then(() => true).catch(() => false);
    return ok ? btn.customId : null;
  }

  // Party voting path — collect votes for `time` ms or until all have voted
  return new Promise<string | null>(resolve => {
    const votes = new Map<string, string>(); // userId → customId

    const collector = reply.createMessageComponentCollector({
      filter: (i) => memberIds.includes(i.user.id) && i.isButton(),
      time
    });

    const updateDisplay = async () => {
      const total = memberIds.length;
      const voted = votes.size;
      const statusLine = `🗳️ Đã vote: **${voted}/${total}**` + (voted < total ? ' — đang chờ...' : '');
      await ctx.interaction.editReply({
        embeds: [new EmbedBuilder(payload.embed.toJSON()).setFooter({ text: statusLine })]
      }).catch(() => {});
    };

    collector.on('collect', async (i) => {
      votes.set(i.user.id, i.customId);
      await i.deferUpdate().catch(() => {});
      await updateDisplay();
      if (votes.size >= memberIds.length) collector.stop('all_voted');
    });

    collector.on('end', () => {
      ctx.interaction.editReply({ components: [] }).catch(() => {});
      if (votes.size === 0) { resolve(null); return; }
      // Tally votes, pick winner (ties broken by first vote cast)
      const tally = new Map<string, number>();
      for (const cid of votes.values()) tally.set(cid, (tally.get(cid) ?? 0) + 1);
      let winner = '', maxV = 0;
      for (const [cid, count] of tally) { if (count > maxV) { maxV = count; winner = cid; } }
      resolve(winner || null);
    });
  });
}

function scaleEventExp(value: number): number { return Math.max(1, Math.floor(value * 0.72)); }
function scaleEventGold(value: number): number { return Math.max(0, Math.floor(value * 0.62)); }

function eventEnemy(ctx: RunExploreEventInput, base: any, overrides: Partial<any>) {
  const player = getEffectivePlayer(ctx.userId, ctx.guildId)!;
  return {
    id: `${overrides.id ?? 'event_enemy'}_${ctx.userId}_${Date.now()}`,
    name: overrides.name ?? base?.name ?? 'Unknown Enemy',
    icon: overrides.icon ?? base?.icon ?? '⚔️',
    level: overrides.level ?? Math.max(1, player.level),
    hp: overrides.hp ?? Math.max(40, Math.floor((base?.hp ?? 60) * 0.9)),
    atk: overrides.atk ?? Math.max(8, Math.floor((base?.atk ?? player.atk) * 0.9)),
    def: overrides.def ?? Math.max(2, Math.floor((base?.def ?? player.def) * 0.8)),
    expReward: overrides.expReward ?? Math.max(20, Math.floor((base?.expReward ?? player.exp_next * 0.15))),
    goldMin: overrides.goldMin ?? 10,
    goldMax: overrides.goldMax ?? 35,
    drops: overrides.drops ?? [],
    specialAttacks: overrides.specialAttacks ?? [],
    zones: [player.zone_id],
    boss: overrides.boss ?? false,
    lore: overrides.lore ?? 'Một mối nguy hiện ra từ màn sương.'
  };
}

async function grantCombatReward(ctx: RunExploreEventInput, btnInt: ButtonInteraction, enemy: any, state: any, options: {
  title: string;
  description: string;
  exp?: number;
  gold?: number;
  soulShards?: number;
  items?: string[];
  rep?: number;
  color?: number;
}) {
  updatePlayerHpMp(ctx.userId, ctx.guildId, state.player_hp, state.player_mp);
  incrementKills(ctx.userId, ctx.guildId);
  const lines: string[] = [options.description];

  if (options.exp) { const exp = scaleEventExp(options.exp); grantExp(ctx.userId, ctx.guildId, exp); lines.push(`⭐ +**${exp} EXP**`); }
  if (options.gold) { const gold = scaleEventGold(options.gold); grantGold(ctx.userId, ctx.guildId, gold); lines.push(`🪙 +**${gold} Gold**`); }
  if (options.soulShards) { grantSoulShards(ctx.userId, ctx.guildId, options.soulShards); lines.push(`💀 +**${options.soulShards} Soul Shard**`); }
  if (options.items?.length) {
    for (const id of options.items) addItem(ctx.userId, ctx.guildId, id, 1);
    lines.push(`🎁 ${options.items.map(displayItem).join('\n🎁 ')}`);
  }
  if (typeof options.rep === 'number' && options.rep !== 0) {
    const rep = adjustReputation(ctx.userId, ctx.guildId, options.rep);
    lines.push(`🤝 Reputation: **${rep}** (${options.rep > 0 ? '+' : ''}${options.rep})`);
  }

  logEvent(ctx.guildId, ctx.userId, ctx.player.name, 'event_combat', `đã thắng ${enemy.name}.`, ctx.player.zone_id);
  await btnInt.editReply({
    embeds: [new EmbedBuilder().setColor(options.color ?? COLORS.success).setTitle(options.title).setDescription(lines.join('\n'))],
    components: ctx.callbacks.buildContinueExploreRow(ctx.userId)
  });
  await ctx.callbacks.attachContinueExploreHandler(btnInt.message as Message<boolean>, ctx.interaction, ctx.userId, ctx.guildId);
}

async function nonLethalLoss(ctx: RunExploreEventInput, btnInt: ButtonInteraction, player: any, enemy: any): Promise<void> {
  const loss = Math.min(player.gold, randInt(15, Math.max(20, 35 + player.level * 5)));
  if (loss > 0) spendGold(ctx.userId, ctx.guildId, loss);
  updatePlayerHpMp(ctx.userId, ctx.guildId, 1, Math.max(0, Math.floor(player.mp * 0.5)));
  await btnInt.editReply({
    embeds: [new EmbedBuilder()
      .setColor(COLORS.warning)
      .setTitle('🩸 Bạn thoát chết trong gang tấc')
      .setDescription(`**${enemy.name}** đánh bạn ngã gục, nhưng bỏ đi trước khi kết liễu.\n\n❤️ HP còn **1**\n🪙 Mất **${loss} Gold** trong lúc chạy trốn.`)],
    components: ctx.callbacks.buildContinueExploreRow(ctx.userId)
  });
  await ctx.callbacks.attachContinueExploreHandler(btnInt.message as Message<boolean>, ctx.interaction, ctx.userId, ctx.guildId);
}

function increaseCorruption(guildId: string, amount: number): number {
  const current = Number(getFlag(guildId, 'world_corruption') ?? '0') || 0;
  const next = Math.max(0, Math.min(100, current + amount));
  setFlag(guildId, 'world_corruption', String(next));
  setWorldEvent(guildId, 'corruption', `🕯️ Corruption của thế giới tăng lên **${next}%**. Quái vật trở nên hung hãn hơn, nhưng di vật bóng tối cũng dễ xuất hiện hơn.`, 86400);
  return next;
}

async function showBloodTrail(ctx: RunExploreEventInput): Promise<void> {
  const embed = new EmbedBuilder().setColor(COLORS.danger)
    .setTitle('🩸 Dấu Máu Trên Đường')
    .setDescription('Một vệt máu đậm kéo dài vào sâu trong rừng. Không khí có mùi sắt và tiếng thở gấp vọng lại từ xa.');
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`blood_follow_${ctx.userId}`).setLabel('Lần theo dấu máu').setEmoji('🩸').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`blood_check_${ctx.userId}`).setLabel('Kiểm tra cẩn thận').setEmoji('🔎').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`blood_leave_${ctx.userId}`).setLabel('Rời đi').setEmoji('🚶').setStyle(ButtonStyle.Secondary)
  );
  const cid = await awaitButton(ctx, row, embed, 'ambush');
  if (cid === `blood_follow_${ctx.userId}`) {
    const base = pick(ctx.enemies);
    const enemy = eventEnemy(ctx, base, {
      id: 'bloodtrail_stalker', name: `Kẻ Săn Máu ${base.name}`, icon: '🩸', boss: false,
      hp: Math.floor(base.hp * 1.15), atk: Math.floor(base.atk * 1.12), def: base.def,
      lore: 'Một kẻ săn mồi bị mùi máu đánh thức.'
    });
    return startCombatFlowWithEnemy(ctx.interaction, ctx.userId, ctx.guildId, enemy, undefined,
      async (_int, btn, _uid, _gid, _p, e, state) => grantCombatReward(ctx, btn, e, state, {
        title: '🩸 Dấu Máu Đã Khép Lại', description: `Bạn hạ **${e.name}** và tìm thấy chiến lợi phẩm cạnh xác nạn nhân.`, exp: Math.floor(ctx.player.exp_next * 0.18), gold: randInt(25, 65), soulShards: randInt(1, 100) <= 35 ? 1 : 0, items: [pick(['elixir','book_berserker','book_counter','book_mend_wounds'])]
      }),
      nonLethalLoss as any,
      ctx.callbacks.handleFlee
    );
  }
  if (cid === `blood_check_${ctx.userId}`) {
    if (randInt(1, 100) <= 65) {
      const gold = randInt(9, 31);
      grantGold(ctx.userId, ctx.guildId, gold);
      return finish(ctx, simpleEmbed(COLORS.gold, `🔎 Bạn tìm thấy một túi đồ rơi cạnh vệt máu.\n🪙 +**${gold} Gold**`));
    }
    const itemId = pick(['health_potion','mana_potion','antidote']);
    addItem(ctx.userId, ctx.guildId, itemId, 1);
    return finish(ctx, simpleEmbed(COLORS.success, `🔎 Bạn tìm thấy ${displayItem(itemId)} bị giấu dưới lớp lá.`));
  }
  return finish(ctx, simpleEmbed(COLORS.info, '🚶 Bạn quyết định không dính vào chuyện này. Dấu máu biến mất sau màn sương.'));
}

async function showNamelessGrave(ctx: RunExploreEventInput): Promise<void> {
  const rep = ctx.player.reputation ?? 0;
  const embed = new EmbedBuilder().setColor(COLORS.death)
    .setTitle('🪦 Ngôi Mộ Không Tên')
    .setDescription('Một ngôi mộ cũ phát sáng yếu ớt. Trên bia đá không có tên, chỉ có vết cào như ai đó từng cố thoát ra.');
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`grave_pray_${ctx.userId}`).setLabel('Cầu nguyện').setEmoji('🙏').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`grave_dig_${ctx.userId}`).setLabel('Đào mộ').setEmoji('⛏️').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`grave_offer_${ctx.userId}`).setLabel('Để lại 25 Gold').setEmoji('🪙').setStyle(ButtonStyle.Secondary)
  );
  const cid = await awaitButton(ctx, row, embed, 'legacy');
  const fresh = getEffectivePlayer(ctx.userId, ctx.guildId)!;

  if (cid === `grave_pray_${ctx.userId}`) {
    if (rep < -30 && randInt(1, 100) <= 65 && ctx.enemies.length) {
      const base = pick(ctx.enemies);
      const ghost = eventEnemy(ctx, base, { id: 'grave_spirit', name: 'Linh Hồn Phẫn Nộ', icon: '👻', hp: Math.floor(base.hp * 0.9), atk: Math.floor(base.atk * 1.05), def: base.def });
      return startCombatFlowWithEnemy(ctx.interaction, ctx.userId, ctx.guildId, ghost, undefined,
        async (_int, btn, _uid, _gid, _p, e, state) => grantCombatReward(ctx, btn, e, state, { title: '👻 Linh Hồn Được Giải Thoát', description: 'Lời nguyền trong mộ tan biến.', exp: Math.floor(ctx.player.exp_next * 0.12), soulShards: 1 }),
        ctx.callbacks.handleDeath,
        ctx.callbacks.handleFlee
      );
    }
    const hp = Math.min(fresh.max_hp, fresh.hp + Math.floor(fresh.max_hp * (rep >= 30 ? 0.35 : 0.2)));
    const mp = Math.min(fresh.max_mp, fresh.mp + Math.floor(fresh.max_mp * 0.2));
    updatePlayerHpMp(ctx.userId, ctx.guildId, hp, mp);
    return finish(ctx, simpleEmbed(COLORS.success, `🙏 Một bàn tay vô hình đặt lên vai bạn.\n❤️ HP: **${hp}/${fresh.max_hp}**\n💧 MP: **${mp}/${fresh.max_mp}**${rep >= 30 ? '\n✨ Reputation cao khiến lời chúc phúc mạnh hơn.' : ''}`));
  }

  if (cid === `grave_dig_${ctx.userId}`) {
    const repAfter = adjustReputation(ctx.userId, ctx.guildId, -10);
    const itemId = pick(['bone_shard','ectoplasm','mana_potion','book_shadow_step']);
    addItem(ctx.userId, ctx.guildId, itemId, 1);
    return finish(ctx, simpleEmbed(COLORS.warning, `⛏️ Bạn đào mộ và lấy được ${displayItem(itemId)}.\n🤝 Reputation: **${repAfter}** (-10)`));
  }

  if (fresh.gold >= 25) {
    spendGold(ctx.userId, ctx.guildId, 25);
    const repAfter = adjustReputation(ctx.userId, ctx.guildId, 8);
    return finish(ctx, simpleEmbed(COLORS.success, `🪙 Bạn để lại 25 Gold trước bia mộ.\nMột tiếng thở nhẹ vang lên từ lòng đất.\n🤝 Reputation: **${repAfter}** (+8)`));
  }
  return finish(ctx, simpleEmbed(COLORS.warning, '🪙 Bạn định để lại tiền, nhưng túi quá nhẹ. Ngôi mộ im lặng.'));
}

async function showMemorySeller(ctx: RunExploreEventInput): Promise<void> {
  const cooldownKey = `memory_seller_${ctx.userId}`;
  const soldSoulToday = Boolean(getFlag(ctx.guildId, cooldownKey));
  const combatCost = Math.max(40, 30 + ctx.player.level * 20);
  const painCostHp = Math.max(1, Math.floor(ctx.player.max_hp * 0.3));
  const embed = new EmbedBuilder().setColor(COLORS.purple)
    .setTitle('🧙 Người Bán Ký Ức')
    .setDescription(`Một NPC che mặt mở chiếc hộp đầy những mảnh ký ức.\n\n📘 Ký ức chiến đấu: **${combatCost} Gold** → EXP\n🩸 Ký ức đau thương: mất **${painCostHp} HP** → Soul Shard${soldSoulToday ? '\n\n⚠️ Hôm nay hắn đã bán ký ức đau thương cho bạn rồi.' : ''}`);
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`mem_combat_${ctx.userId}`).setLabel('Mua ký ức chiến đấu').setEmoji('📘').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`mem_pain_${ctx.userId}`).setLabel('Mua ký ức đau thương').setEmoji('🩸').setStyle(ButtonStyle.Danger).setDisabled(soldSoulToday),
    new ButtonBuilder().setCustomId(`mem_leave_${ctx.userId}`).setLabel('Từ chối').setEmoji('🚶').setStyle(ButtonStyle.Secondary)
  );
  const cid = await awaitButton(ctx, row, embed, 'mysterious');
  const fresh = getEffectivePlayer(ctx.userId, ctx.guildId)!;
  if (cid === `mem_combat_${ctx.userId}`) {
    if (fresh.gold < combatCost) return finish(ctx, simpleEmbed(COLORS.warning, `❌ Cần **${combatCost} Gold**, bạn chỉ có **${fresh.gold}**.`));
    spendGold(ctx.userId, ctx.guildId, combatCost);
    const exp = Math.max(35, Math.floor(fresh.exp_next * 0.28));
    grantExp(ctx.userId, ctx.guildId, exp);
    return finish(ctx, simpleEmbed(COLORS.magic, `📘 Bạn nuốt một ký ức không thuộc về mình.\n🪙 -**${combatCost} Gold**\n⭐ +**${exp} EXP**`));
  }
  if (cid === `mem_pain_${ctx.userId}` && !soldSoulToday) {
    const newHp = Math.max(1, fresh.hp - painCostHp);
    updatePlayerHpMp(ctx.userId, ctx.guildId, newHp, fresh.mp);
    grantSoulShards(ctx.userId, ctx.guildId, 1);
    setFlag(ctx.guildId, cooldownKey, '1', 86400);
    return finish(ctx, simpleEmbed(COLORS.death, `🩸 Bạn nhớ lại một cái chết chưa từng sống qua.\n❤️ -**${painCostHp} HP** → ${newHp}/${fresh.max_hp}\n💀 +**1 Soul Shard**`));
  }
  return finish(ctx, simpleEmbed(COLORS.info, '🚶 Người bán ký ức cười khẽ rồi gập chiếc hộp lại.'));
}

async function showStrangerCampfire(ctx: RunExploreEventInput): Promise<void> {
  const embed = new EmbedBuilder().setColor(0xE67E22)
    .setTitle('🔥 Lửa Trại Của Kẻ Lạ')
    .setDescription('Một nhóm người lạ ngồi quanh đống lửa. Họ không hỏi tên bạn, chỉ chừa một chỗ trống.');
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`camp_rest_${ctx.userId}`).setLabel('Ngồi nghỉ').setEmoji('🔥').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`camp_news_${ctx.userId}`).setLabel('Trao đổi tin tức').setEmoji('🗣️').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`camp_eat_${ctx.userId}`).setLabel('Ăn thức ăn lạ').setEmoji('🍲').setStyle(ButtonStyle.Danger)
  );
  const cid = await awaitButton(ctx, row, embed, 'spring');
  const fresh = getEffectivePlayer(ctx.userId, ctx.guildId)!;
  if (cid === `camp_rest_${ctx.userId}`) {
    const hp = Math.min(fresh.max_hp, fresh.hp + Math.floor(fresh.max_hp * 0.28));
    updatePlayerHpMp(ctx.userId, ctx.guildId, hp, fresh.mp);
    return finish(ctx, simpleEmbed(COLORS.success, `🔥 Bạn nghỉ cạnh lửa trại.\n❤️ HP: **${hp}/${fresh.max_hp}**`));
  }
  if (cid === `camp_news_${ctx.userId}`) {
    setFlag(ctx.guildId, `zone_marked_${fresh.zone_id}`, '15', 3600);
    return finish(ctx, simpleEmbed(COLORS.info, `🗣️ Bạn nghe được lối đi an toàn và vị trí quái vật quanh vùng.\n📍 Zone hiện tại được đánh dấu: **drop +15% trong 1 giờ**.`));
  }
  const roll = randInt(1, 100);
  if (roll <= 45) {
    const exp = Math.max(15, Math.floor(fresh.exp_next * 0.12));
    grantExp(ctx.userId, ctx.guildId, exp);
    return finish(ctx, simpleEmbed(COLORS.success, `🍲 Món ăn lạ làm máu nóng lên.\n⭐ +**${exp} EXP**`));
  }
  const { dmg, hp } = safeHpLoss(fresh, 0.18);
  updatePlayerHpMp(ctx.userId, ctx.guildId, hp, fresh.mp);
  return finish(ctx, simpleEmbed(COLORS.warning, `🍲 Thức ăn có vị kỳ lạ...\n🤢 Bạn mất **${dmg} HP** và thấy người hơi choáng.`));
}

async function showCrackedShrine(ctx: RunExploreEventInput): Promise<void> {
  const embed = new EmbedBuilder().setColor(COLORS.purple)
    .setTitle('🕯️ Đền Thờ Nứt Vỡ')
    .setDescription('Một bàn thờ cổ bị nứt. Ánh sáng tím rò ra như máu của một vị thần đã chết.');
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`shrine_gold_${ctx.userId}`).setLabel('Hiến 50 Gold').setEmoji('🪙').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`shrine_blood_${ctx.userId}`).setLabel('Hiến máu').setEmoji('🩸').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`shrine_break_${ctx.userId}`).setLabel('Phá bàn thờ').setEmoji('🔨').setStyle(ButtonStyle.Secondary)
  );
  const cid = await awaitButton(ctx, row, embed, 'altar');
  const fresh = getEffectivePlayer(ctx.userId, ctx.guildId)!;
  if (cid === `shrine_gold_${ctx.userId}`) {
    if (fresh.gold < 50) return finish(ctx, simpleEmbed(COLORS.warning, '❌ Bạn không đủ **50 Gold** để hiến.'));
    spendGold(ctx.userId, ctx.guildId, 50);
    setFlag(ctx.guildId, `blessing_${ctx.userId}`, 'atk_def_small', 1800);
    return finish(ctx, simpleEmbed(COLORS.magic, '🪙 Bàn thờ nuốt lấy vàng.\n✨ Bạn nhận **Blessing nhỏ** trong 30 phút *(lưu dấu vào world state, dùng để mở rộng buff sau).*'));
  }
  if (cid === `shrine_blood_${ctx.userId}`) {
    const { dmg, hp } = safeHpLoss(fresh, 0.25);
    updatePlayerHpMp(ctx.userId, ctx.guildId, hp, fresh.mp);
    grantExp(ctx.userId, ctx.guildId, Math.floor(fresh.exp_next * 0.2));
    return finish(ctx, simpleEmbed(COLORS.danger, `🩸 Máu chảy vào khe nứt.\n❤️ -**${dmg} HP**\n⭐ +**${Math.floor(fresh.exp_next * 0.2)} EXP**`));
  }
  const corruption = increaseCorruption(ctx.guildId, 8);
  const itemId = pick(['mana_crystal','ectoplasm','book_soul_offering','elixir']);
  addItem(ctx.userId, ctx.guildId, itemId, 1);
  return finish(ctx, simpleEmbed(COLORS.warning, `🔨 Bàn thờ vỡ tan, rơi ra ${displayItem(itemId)}.\n🌑 World Corruption: **${corruption}%** (+8)`));
}

async function showInjuredMonster(ctx: RunExploreEventInput): Promise<void> {
  const base = pick(ctx.enemies);
  const embed = new EmbedBuilder().setColor(COLORS.warning)
    .setTitle('🐺 Quái Vật Bị Thương')
    .setDescription(`Một **${base.icon} ${base.name}** nằm thở dốc bên đường. Nó vẫn còn nguy hiểm, nhưng không thể đứng vững.`);
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`inj_kill_${ctx.userId}`).setLabel('Giết nó').setEmoji('⚔️').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`inj_spare_${ctx.userId}`).setLabel('Tha nó').setEmoji('🕊️').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`inj_heal_${ctx.userId}`).setLabel('Chữa cho nó').setEmoji('🧪').setStyle(ButtonStyle.Primary)
  );
  const cid = await awaitButton(ctx, row, embed, 'combat');
  if (cid === `inj_kill_${ctx.userId}`) {
    const exp = Math.floor((base.expReward ?? 40) * 0.45);
    const gold = randInt(4, 18);
    grantExp(ctx.userId, ctx.guildId, exp);
    grantGold(ctx.userId, ctx.guildId, gold);
    return finish(ctx, simpleEmbed(COLORS.gold, `⚔️ Bạn kết liễu con quái không còn sức phản kháng.\n⭐ +**${exp} EXP**\n🪙 +**${gold} Gold**`));
  }
  if (cid === `inj_spare_${ctx.userId}`) {
    const rep = adjustReputation(ctx.userId, ctx.guildId, 8);
    setFlag(ctx.guildId, `spared_monster_${ctx.userId}`, base.id, 86400);
    return finish(ctx, simpleEmbed(COLORS.success, `🕊️ Bạn tha cho nó. Trước khi biến mất, nó cúi đầu như hiểu được lòng thương xót.\n🤝 Reputation: **${rep}** (+8)`));
  }
  if (getItemQty(ctx.userId, ctx.guildId, 'health_potion') <= 0) return finish(ctx, simpleEmbed(COLORS.warning, '🧪 Bạn không có **Health Potion** để chữa cho nó.'));
  removeItem(ctx.userId, ctx.guildId, 'health_potion', 1);
  const rep = adjustReputation(ctx.userId, ctx.guildId, 15);
  setFlag(ctx.guildId, `monster_ally_${ctx.userId}`, base.id, 172800);
  return finish(ctx, simpleEmbed(COLORS.success, `🧪 Bạn dùng **Health Potion** chữa cho nó.\n🐺 Một mối duyên kỳ lạ được tạo ra. Lần sau, có thể nó sẽ cứu bạn khỏi phục kích.\n🤝 Reputation: **${rep}** (+15)`));
}

async function showWantedMerchant(ctx: RunExploreEventInput): Promise<void> {
  const embed = new EmbedBuilder().setColor(COLORS.gold)
    .setTitle('🛒 Lái Buôn Bị Truy Nã')
    .setDescription('Một shopkeeper khác kéo bạn sang một bên: “Tên lái buôn gần đây từng lừa khách. Đừng tin hắn.”');
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`wm_trust_${ctx.userId}`).setLabel('Tin lời cảnh báo').setEmoji('🤝').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`wm_ignore_${ctx.userId}`).setLabel('Bỏ qua').setEmoji('🚶').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`wm_investigate_${ctx.userId}`).setLabel('Đi điều tra').setEmoji('🔎').setStyle(ButtonStyle.Primary)
  );
  const cid = await awaitButton(ctx, row, embed, 'merchant');
  if (cid === `wm_trust_${ctx.userId}`) {
    setFlag(ctx.guildId, 'shop_discount', '5', 3600);
    return finish(ctx, simpleEmbed(COLORS.success, '🤝 Bạn nghe theo lời cảnh báo. Hội thương nhân nợ bạn một ân tình.\n🛒 Shop discount **5% trong 1 giờ**.'));
  }
  if (cid === `wm_investigate_${ctx.userId}`) {
    if ((ctx.player.reputation ?? 0) < -25 && ctx.enemies.length && randInt(1, 100) <= 45) return showBountyHunter(ctx);
    const gold = randInt(12, 43);
    grantGold(ctx.userId, ctx.guildId, gold);
    const rep = adjustReputation(ctx.userId, ctx.guildId, 5);
    return finish(ctx, simpleEmbed(COLORS.gold, `🔎 Bạn phát hiện chứng cứ lừa đảo và được thưởng.\n🪙 +**${gold} Gold**\n🤝 Reputation: **${rep}** (+5)`));
  }
  return finish(ctx, simpleEmbed(COLORS.info, '🚶 Bạn bỏ qua lời cảnh báo. Trong thế giới này, tin ai cũng là một canh bạc.'));
}

async function showBountyHunter(ctx: RunExploreEventInput): Promise<void> {
  const rep = ctx.player.reputation ?? 0;
  const wanted = getWantedLevel(ctx.userId, ctx.guildId);
  const bribe = Math.max(60, Math.abs(rep) * 3 + ctx.player.level * 15 + wanted * 80);
  const embed = new EmbedBuilder().setColor(COLORS.danger)
    .setTitle('⚔️ Thợ Săn Tiền Thưởng')
    .setDescription(`Một kẻ mặc áo choàng chặn đường bạn.\n“Danh tiếng của ngươi đáng giá khá nhiều đấy.”\n\n💰 Hối lộ: **${bribe} Gold**`);
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`bh_fight_${ctx.userId}`).setLabel('Chiến đấu').setEmoji('⚔️').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`bh_bribe_${ctx.userId}`).setLabel('Hối lộ').setEmoji('💰').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`bh_surrender_${ctx.userId}`).setLabel('Đầu hàng').setEmoji('🙌').setStyle(ButtonStyle.Secondary)
  );
  const cid = await awaitButton(ctx, row, embed, 'ambush');
  const fresh = getEffectivePlayer(ctx.userId, ctx.guildId)!;
  if (cid === `bh_fight_${ctx.userId}`) {
    const scale = 1 + Math.min(0.8, Math.abs(rep) / 100);
    const enemy = eventEnemy(ctx, pick(ctx.enemies), {
      id: 'bounty_hunter', name: 'Thợ Săn Tiền Thưởng', icon: '⚔️', level: fresh.level + 1,
      hp: Math.floor((fresh.max_hp * 0.9 + 60) * scale), atk: Math.floor((fresh.atk + 8) * scale), def: Math.floor((fresh.def + 4) * scale),
      lore: 'Kẻ sống bằng tiền thưởng trên đầu tội phạm.'
    });
    return startCombatFlowWithEnemy(ctx.interaction, ctx.userId, ctx.guildId, enemy, undefined,
      async (_int, btn, _uid, _gid, _p, e, state) => grantCombatReward(ctx, btn, e, state, { title: '⚔️ Thợ Săn Gục Ngã', description: 'Bạn sống sót qua cuộc truy sát.', exp: Math.floor(fresh.exp_next * 0.22), gold: randInt(40, 100), items: [pick(['elixir','book_counter','book_shadow_step'])] }),
      ctx.callbacks.handleDeath,
      ctx.callbacks.handleFlee
    );
  }
  if (cid === `bh_bribe_${ctx.userId}`) {
    if (getItemQty(ctx.userId, ctx.guildId, 'bribe_coin') > 0) {
      removeItem(ctx.userId, ctx.guildId, 'bribe_coin', 1);
      return finish(ctx, simpleEmbed(COLORS.info, `🪙 Bạn búng **Bribe Coin**. Thợ săn bắt lấy đồng xu, kiểm tra dấu niêm phong rồi lặng lẽ biến mất.`));
    }
    if (fresh.gold < bribe) return finish(ctx, simpleEmbed(COLORS.warning, `💰 Bạn không đủ tiền hối lộ. Cần **${bribe} Gold** hoặc **Bribe Coin**.`));
    spendGold(ctx.userId, ctx.guildId, bribe);
    return finish(ctx, simpleEmbed(COLORS.info, `💰 Bạn trả **${bribe} Gold**. Thợ săn biến mất không nói thêm lời nào.`));
  }
  const loss = Math.min(fresh.gold, Math.floor(bribe * 0.45));
  if (loss > 0) spendGold(ctx.userId, ctx.guildId, loss);
  const repAfter = adjustReputation(ctx.userId, ctx.guildId, 5);
  return finish(ctx, simpleEmbed(COLORS.warning, `🙌 Bạn đầu hàng và nộp phạt.\n🪙 -**${loss} Gold**\n🤝 Reputation: **${repAfter}** (+5)`));
}

async function showRebirthRift(ctx: RunExploreEventInput): Promise<void> {
  const embed = new EmbedBuilder().setColor(COLORS.purple)
    .setTitle('🧬 Vết Nứt Chuyển Sinh')
    .setDescription('Một khe nứt mở ra giữa không khí. Bên trong, bạn thấy bóng dáng của những kiếp sống đã chết.');
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`rift_touch_${ctx.userId}`).setLabel('Chạm vào').setEmoji('💀').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`rift_step_${ctx.userId}`).setLabel('Bước qua').setEmoji('🌀').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`rift_seal_${ctx.userId}`).setLabel('Phong ấn').setEmoji('🕯️').setStyle(ButtonStyle.Success)
  );
  const cid = await awaitButton(ctx, row, embed, 'legacy');
  const fresh = getEffectivePlayer(ctx.userId, ctx.guildId)!;
  if (cid === `rift_touch_${ctx.userId}`) {
    const { dmg, hp } = safeHpLoss(fresh, 0.22);
    updatePlayerHpMp(ctx.userId, ctx.guildId, hp, fresh.mp);
    grantSoulShards(ctx.userId, ctx.guildId, 1);
    return finish(ctx, simpleEmbed(COLORS.death, `💀 Bạn chạm vào kiếp trước.\n❤️ -**${dmg} HP**\n💀 +**1 Soul Shard**`));
  }
  if (cid === `rift_step_${ctx.userId}`) {
    const available = Object.values(ZONES).filter(z => fresh.level >= z.minLevel && z.id !== fresh.zone_id);
    const target = available.length ? pick(available) : getZone(fresh.zone_id)!;
    setZone(ctx.userId, ctx.guildId, target.id);
    return finish(ctx, new EmbedBuilder().setColor(target.color).setTitle('🌀 Bước Qua Vết Nứt').setDescription(`Bạn rơi khỏi khe nứt và tỉnh dậy tại **${target.icon} ${target.name}**.`));
  }
  const exp = Math.max(25, Math.floor(fresh.exp_next * 0.18));
  grantExp(ctx.userId, ctx.guildId, exp);
  const rep = adjustReputation(ctx.userId, ctx.guildId, 6);
  return finish(ctx, simpleEmbed(COLORS.success, `🕯️ Bạn phong ấn vết nứt trước khi nó nuốt thêm linh hồn.\n⭐ +**${exp} EXP**\n🤝 Reputation: **${rep}** (+6)`));
}

async function showFailedLegacy(ctx: RunExploreEventInput): Promise<void> {
  const embed = new EmbedBuilder().setColor(COLORS.death)
    .setTitle('👑 Di Sản Của Kẻ Thất Bại')
    .setDescription('Bạn tìm thấy một tàn tích quen thuộc đến rợn người. Dường như nó từng thuộc về một kiếp trước của chính bạn.');
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`fl_claim_${ctx.userId}`).setLabel('Nhận lại di sản').setEmoji('👑').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`fl_face_${ctx.userId}`).setLabel('Đối mặt bóng ma').setEmoji('🪞').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`fl_leave_${ctx.userId}`).setLabel('Rời đi').setEmoji('🚶').setStyle(ButtonStyle.Secondary)
  );
  const cid = await awaitButton(ctx, row, embed, 'legacy');
  if (cid === `fl_claim_${ctx.userId}`) {
    const gold = randInt(12, 37) + ctx.player.deaths * 5;
    grantGold(ctx.userId, ctx.guildId, gold);
    grantExp(ctx.userId, ctx.guildId, Math.floor(ctx.player.exp_next * 0.12));
    return finish(ctx, simpleEmbed(COLORS.gold, `👑 Bạn gom lại những mảnh vụn ký ức.\n🪙 +**${gold} Gold**\n⭐ Một phần ký ức cũ trở về.`));
  }
  if (cid === `fl_face_${ctx.userId}` && ctx.enemies.length) {
    const enemy = eventEnemy(ctx, pick(ctx.enemies), { id: 'fallen_self', name: `Bóng Ma ${ctx.player.name}`, icon: '🪞', hp: Math.floor(ctx.player.max_hp * 0.9), atk: ctx.player.atk + 5, def: ctx.player.def + 2 });
    return startCombatFlowWithEnemy(ctx.interaction, ctx.userId, ctx.guildId, enemy, undefined,
      async (_int, btn, _uid, _gid, _p, e, state) => grantCombatReward(ctx, btn, e, state, { title: '🪞 Bạn Vượt Qua Chính Mình', description: 'Bóng ma tan thành những mảnh sáng nhỏ.', exp: Math.floor(ctx.player.exp_next * 0.25), soulShards: 1 }),
      ctx.callbacks.handleDeath,
      ctx.callbacks.handleFlee
    );
  }
  return finish(ctx, simpleEmbed(COLORS.info, '🚶 Bạn rời khỏi di sản cũ. Có những ký ức nên để chúng ngủ yên.'));
}

async function showMirrorClone(ctx: RunExploreEventInput): Promise<void> {
  const embed = new EmbedBuilder().setColor(COLORS.purple)
    .setTitle('🪞 Bản Sao Trong Gương')
    .setDescription('Một chiếc gương đứng giữa đường. Trong gương là bạn, nhưng đôi mắt lạnh hơn và nụ cười sắc hơn.');
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`mirror_break_${ctx.userId}`).setLabel('Đập gương').setEmoji('🔨').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`mirror_fight_${ctx.userId}`).setLabel('Đối mặt bản sao').setEmoji('⚔️').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`mirror_stare_${ctx.userId}`).setLabel('Nhìn lâu hơn').setEmoji('👁️').setStyle(ButtonStyle.Primary)
  );
  const cid = await awaitButton(ctx, row, embed, 'mysterious');
  if (cid === `mirror_fight_${ctx.userId}`) {
    const enemy = eventEnemy(ctx, pick(ctx.enemies), { id: 'mirror_clone', name: `Bản Sao ${ctx.player.name}`, icon: '🪞', hp: Math.floor(ctx.player.max_hp * 1.05), atk: ctx.player.atk + 4, def: ctx.player.def + 2 });
    return startCombatFlowWithEnemy(ctx.interaction, ctx.userId, ctx.guildId, enemy, undefined,
      async (_int, btn, _uid, _gid, _p, e, state) => grantCombatReward(ctx, btn, e, state, { title: '🪞 Gương Vỡ', description: 'Bạn đánh bại phản chiếu méo mó của mình.', exp: Math.floor(ctx.player.exp_next * 0.3), soulShards: randInt(1,100) <= 50 ? 1 : 0 }),
      ctx.callbacks.handleDeath,
      ctx.callbacks.handleFlee
    );
  }
  if (cid === `mirror_break_${ctx.userId}`) {
    const itemId = pick(['mana_crystal','ectoplasm','health_potion']);
    addItem(ctx.userId, ctx.guildId, itemId, 1);
    return finish(ctx, simpleEmbed(COLORS.info, `🔨 Chiếc gương vỡ tan. Trong mảnh kính còn sót lại ${displayItem(itemId)}.`));
  }
  if (randInt(1, 100) <= 55) {
    const exp = Math.floor(ctx.player.exp_next * 0.16);
    grantExp(ctx.userId, ctx.guildId, exp);
    return finish(ctx, simpleEmbed(COLORS.magic, `👁️ Bạn nhìn thấy một nước đi chưa từng nghĩ tới.\n⭐ +**${exp} EXP**`));
  }
  const fresh = getEffectivePlayer(ctx.userId, ctx.guildId)!;
  const { dmg, hp } = safeHpLoss(fresh, 0.2);
  updatePlayerHpMp(ctx.userId, ctx.guildId, hp, fresh.mp);
  return finish(ctx, simpleEmbed(COLORS.warning, `👁️ Bản sao nhìn ngược lại bạn.\n❤️ -**${dmg} HP**`));
}

async function showTalkingCorpse(ctx: RunExploreEventInput): Promise<void> {
  const embed = new EmbedBuilder().setColor(COLORS.death)
    .setTitle('🧟 Xác Chết Biết Nói')
    .setDescription('Một cái xác dựa vào gốc cây bỗng mở miệng: “Đừng đi theo tiếng chuông...”');
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`corpse_listen_${ctx.userId}`).setLabel('Nghe lời').setEmoji('👂').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`corpse_loot_${ctx.userId}`).setLabel('Lục xác').setEmoji('🪙').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`corpse_bury_${ctx.userId}`).setLabel('Chôn cất').setEmoji('🪦').setStyle(ButtonStyle.Primary)
  );
  const cid = await awaitButton(ctx, row, embed, 'mysterious');
  if (cid === `corpse_listen_${ctx.userId}`) {
    setFlag(ctx.guildId, `warned_${ctx.userId}`, '1', 1800);
    return finish(ctx, simpleEmbed(COLORS.info, '👂 Bạn ghi nhớ lời cảnh báo. Trong 30 phút tới, bạn sẽ cẩn thận hơn trước phục kích *(flag đã lưu để mở rộng sau).*'));
  }
  if (cid === `corpse_loot_${ctx.userId}`) {
    const gold = randInt(9, 34);
    grantGold(ctx.userId, ctx.guildId, gold);
    const rep = adjustReputation(ctx.userId, ctx.guildId, -8);
    return finish(ctx, simpleEmbed(COLORS.warning, `🪙 Bạn lục được **${gold} Gold** từ cái xác.\n🤝 Reputation: **${rep}** (-8)`));
  }
  const rep = adjustReputation(ctx.userId, ctx.guildId, 10);
  return finish(ctx, simpleEmbed(COLORS.success, `🪦 Bạn chôn cất người đã khuất.\n🤝 Reputation: **${rep}** (+10)`));
}

async function showBlackEclipse(ctx: RunExploreEventInput): Promise<void> {
  setFlag(ctx.guildId, 'global_enemy_atk_up', '20', 1800);
  setFlag(ctx.guildId, 'global_exp_bonus', '15', 1800);
  increaseShopMarkup(ctx.guildId, 3, 75);
  setWorldEvent(ctx.guildId, 'black_eclipse', '🌑 Nhật Thực Đen che phủ bầu trời trong 30 phút: quái mạnh hơn, EXP tăng, shop hơi tăng giá.', 1800);
  return finish(ctx, new EmbedBuilder().setColor(COLORS.death).setTitle('🌑 Nhật Thực Đen').setDescription('Mặt trời bị nuốt bởi một vòng tròn đen.\n\n💀 Enemy ATK **+20%** trong 30 phút\n⭐ EXP **+15%** trong 30 phút\n🛒 Shop tăng giá nhẹ'));
}

async function showFateCoin(ctx: RunExploreEventInput): Promise<void> {
  const embed = new EmbedBuilder().setColor(COLORS.gold)
    .setTitle('🪙 Đồng Xu Của Số Phận')
    .setDescription('Một đồng xu nằm giữa đường. Một mặt sáng như bình minh, mặt còn lại đen như đáy giếng.');
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`coin_flip_${ctx.userId}`).setLabel('Tung đồng xu').setEmoji('🪙').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`coin_keep_${ctx.userId}`).setLabel('Giữ đồng xu').setEmoji('🤲').setStyle(ButtonStyle.Secondary)
  );
  const cid = await awaitButton(ctx, row, embed, 'loot');
  if (cid === `coin_keep_${ctx.userId}`) {
    addItem(ctx.userId, ctx.guildId, 'fate_coin', 1);
    return finish(ctx, simpleEmbed(COLORS.gold, `🤲 Bạn giữ lại ${displayItem('fate_coin')}.`));
  }
  if (randInt(1, 2) === 1) {
    const gold = randInt(15, 55);
    grantGold(ctx.userId, ctx.guildId, gold);
    return finish(ctx, simpleEmbed(COLORS.success, `🪙 Mặt sáng!\n🪙 +**${gold} Gold**`));
  }
  if (ctx.enemies.length && randInt(1,100) <= 50) return ctx.callbacks.showAmbush();
  const fresh = getEffectivePlayer(ctx.userId, ctx.guildId)!;
  const { dmg, hp } = safeHpLoss(fresh, 0.16);
  updatePlayerHpMp(ctx.userId, ctx.guildId, hp, fresh.mp);
  return finish(ctx, simpleEmbed(COLORS.warning, `🪙 Mặt tối...\n❤️ -**${dmg} HP**`));
}

async function showMerchantTax(ctx: RunExploreEventInput): Promise<void> {
  const currentMarkup = getShopMarkup(ctx.guildId);
  const cost = Math.max(80, currentMarkup * 12);
  const embed = new EmbedBuilder().setColor(COLORS.gold)
    .setTitle('🏦 Thuế Của Hội Thương Nhân')
    .setDescription(`Hội thương nhân đã ghi tên bạn vào sổ thuế.\n\n🛒 Giá shop hiện tại: **+${currentMarkup}%**\n💰 Trả tiền chuộc lỗi: **${cost} Gold**`);
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`tax_pay_${ctx.userId}`).setLabel('Trả tiền chuộc lỗi').setEmoji('💰').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`tax_ignore_${ctx.userId}`).setLabel('Mặc kệ').setEmoji('🚶').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`tax_threat_${ctx.userId}`).setLabel('Đe dọa lại').setEmoji('🗡️').setStyle(ButtonStyle.Danger)
  );
  const cid = await awaitButton(ctx, row, embed, 'merchant');
  const fresh = getEffectivePlayer(ctx.userId, ctx.guildId)!;
  if (cid === `tax_pay_${ctx.userId}`) {
    if (fresh.gold < cost) return finish(ctx, simpleEmbed(COLORS.warning, `❌ Không đủ **${cost} Gold** để chuộc lỗi.`));
    spendGold(ctx.userId, ctx.guildId, cost);
    const nextMarkup = Math.max(0, currentMarkup - 8);
    setFlag(ctx.guildId, 'shop_markup', String(nextMarkup));
    const rep = adjustReputation(ctx.userId, ctx.guildId, 12);
    return finish(ctx, simpleEmbed(COLORS.success, `💰 Bạn trả tiền chuộc lỗi.\n🛒 Giá shop giảm còn **+${nextMarkup}%**\n🤝 Reputation: **${rep}** (+12)`));
  }
  if (cid === `tax_threat_${ctx.userId}`) {
    const markup = increaseShopMarkup(ctx.guildId, 5, 75);
    const rep = adjustReputation(ctx.userId, ctx.guildId, -8);
    return finish(ctx, simpleEmbed(COLORS.danger, `🗡️ Hội thương nhân không quên lời đe dọa.\n🛒 Giá shop: **+${markup}%**\n🤝 Reputation: **${rep}** (-8)`));
  }
  return finish(ctx, simpleEmbed(COLORS.info, '🚶 Bạn bỏ qua thư thuế. Có lẽ họ sẽ quay lại sau.'));
}

async function showMerchantGuard(ctx: RunExploreEventInput): Promise<void> {
  const embed = new EmbedBuilder().setColor(COLORS.danger)
    .setTitle('🛡️ Vệ Sĩ Của Lái Buôn')
    .setDescription('Một vệ sĩ mặc giáp chặn đường bạn. “Các thương nhân đã trả tiền để ta nhớ mặt ngươi.”');
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`guard_fight_${ctx.userId}`).setLabel('Chiến đấu').setEmoji('⚔️').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`guard_leave_${ctx.userId}`).setLabel('Rút lui').setEmoji('🚶').setStyle(ButtonStyle.Secondary)
  );
  const cid = await awaitButton(ctx, row, embed, 'ambush');
  if (cid !== `guard_fight_${ctx.userId}`) return finish(ctx, simpleEmbed(COLORS.info, '🚶 Bạn rút lui trước khi sự việc xấu hơn.'));
  const enemy = eventEnemy(ctx, pick(ctx.enemies), { id: 'merchant_guard', name: 'Vệ Sĩ Thương Nhân', icon: '🛡️', hp: Math.floor(ctx.player.max_hp * 1.1), atk: ctx.player.atk + 6, def: ctx.player.def + 8 });
  return startCombatFlowWithEnemy(ctx.interaction, ctx.userId, ctx.guildId, enemy, undefined,
    async (_int, btn, _uid, _gid, _p, e, state) => grantCombatReward(ctx, btn, e, state, { title: '🛡️ Vệ Sĩ Bị Hạ', description: 'Bạn thắng, nhưng tin này sẽ lan rất nhanh.', exp: Math.floor(ctx.player.exp_next * 0.18), gold: randInt(25, 70), rep: -5 }),
    ctx.callbacks.handleDeath,
    ctx.callbacks.handleFlee
  );
}

async function showWantedNotice(ctx: RunExploreEventInput): Promise<void> {
  const fine = Math.max(50, Math.abs(ctx.player.reputation ?? 0) * 2 + getShopkeeperRobberyCount(ctx.guildId, ctx.userId) * 60);
  const embed = new EmbedBuilder().setColor(COLORS.warning)
    .setTitle('📜 Lệnh Truy Nã')
    .setDescription(`Một tờ truy nã có khuôn mặt của bạn dán trên thân cây.\n\n💰 Tiền phạt để gỡ bớt truy nã: **${fine} Gold**`);
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`notice_pay_${ctx.userId}`).setLabel('Nộp phạt').setEmoji('💰').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`notice_tear_${ctx.userId}`).setLabel('Xé lệnh').setEmoji('📜').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`notice_hide_${ctx.userId}`).setLabel('Ẩn mặt rời đi').setEmoji('🥷').setStyle(ButtonStyle.Secondary)
  );
  const cid = await awaitButton(ctx, row, embed, 'mysterious');
  const fresh = getEffectivePlayer(ctx.userId, ctx.guildId)!;
  if (cid === `notice_pay_${ctx.userId}`) {
    if (fresh.gold < fine) return finish(ctx, simpleEmbed(COLORS.warning, `❌ Bạn không đủ **${fine} Gold**.`));
    spendGold(ctx.userId, ctx.guildId, fine);
    const rep = adjustReputation(ctx.userId, ctx.guildId, 10);
    return finish(ctx, simpleEmbed(COLORS.success, `💰 Bạn nộp phạt và tờ truy nã được gỡ xuống.\n🤝 Reputation: **${rep}** (+10)`));
  }
  if (cid === `notice_tear_${ctx.userId}`) {
    const rep = adjustReputation(ctx.userId, ctx.guildId, -6);
    if (ctx.enemies.length && randInt(1, 100) <= 40) return showBountyHunter(ctx);
    return finish(ctx, simpleEmbed(COLORS.danger, `📜 Bạn xé lệnh truy nã. Người đi đường nhìn bạn bằng ánh mắt sợ hãi.\n🤝 Reputation: **${rep}** (-6)`));
  }
  return finish(ctx, simpleEmbed(COLORS.info, '🥷 Bạn kéo mũ trùm xuống và rời đi trước khi có ai nhận ra.'));
}

async function showShopkeeperMercy(ctx: RunExploreEventInput): Promise<void> {
  const embed = new EmbedBuilder().setColor(COLORS.gold)
    .setTitle('🧎 Tin Đồn Về Shopkeeper Van Xin')
    .setDescription('Bạn nghe rằng vài shopkeeper đã bắt đầu mang bùa đầu hàng. Nếu bị dồn đến đường cùng, họ có thể nộp hàng để đổi mạng.');
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`mercy_accept_${ctx.userId}`).setLabel('Ghi nhớ lời đồn').setEmoji('🧠').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`mercy_mock_${ctx.userId}`).setLabel('Cười nhạo').setEmoji('🗡️').setStyle(ButtonStyle.Danger)
  );
  const cid = await awaitButton(ctx, row, embed, 'merchant');
  if (cid === `mercy_mock_${ctx.userId}`) {
    const rep = adjustReputation(ctx.userId, ctx.guildId, -4);
    return finish(ctx, simpleEmbed(COLORS.warning, `🗡️ Bạn cười nhạo lòng thương hại.\n🤝 Reputation: **${rep}** (-4)`));
  }
  setFlag(ctx.guildId, `shopkeeper_mercy_hint_${ctx.userId}`, '1', 86400);
  return finish(ctx, simpleEmbed(COLORS.info, '🧠 Bạn ghi nhớ: đôi khi tha mạng có thể lời hơn giết chóc.'));
}

async function showBlackCat(ctx: RunExploreEventInput): Promise<void> {
  const embed = new EmbedBuilder().setColor(COLORS.dark)
    .setTitle('🐈 Mèo Đen Đi Ngang')
    .setDescription('Một con mèo đen bước qua đường rồi dừng lại nhìn bạn, như đang chờ một quyết định rất quan trọng.');
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`cat_pet_${ctx.userId}`).setLabel('Vuốt ve').setEmoji('🐈').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`cat_shoo_${ctx.userId}`).setLabel('Đuổi đi').setEmoji('💢').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`cat_feed_${ctx.userId}`).setLabel('Cho ăn').setEmoji('🍖').setStyle(ButtonStyle.Primary)
  );
  const cid = await awaitButton(ctx, row, embed, 'mysterious');
  if (cid === `cat_pet_${ctx.userId}`) {
    setFlag(ctx.guildId, `lucky_cat_${ctx.userId}`, 'drop', 1800);
    return finish(ctx, simpleEmbed(COLORS.success, '🐈 Con mèo cọ vào chân bạn.\n🍀 May mắn tăng trong 30 phút *(flag để mở rộng drop bonus sau).*'));
  }
  if (cid === `cat_shoo_${ctx.userId}`) {
    if (ctx.enemies.length && randInt(1, 100) <= 55) return ctx.callbacks.showAmbush();
    return finish(ctx, simpleEmbed(COLORS.warning, '💢 Con mèo biến mất. Gió lạnh thổi qua gáy bạn.'));
  }
  if (getItemQty(ctx.userId, ctx.guildId, 'herb') > 0) removeItem(ctx.userId, ctx.guildId, 'herb', 1);
  const rep = adjustReputation(ctx.userId, ctx.guildId, 4);
  setFlag(ctx.guildId, `cat_friend_${ctx.userId}`, '1', 86400);
  return finish(ctx, simpleEmbed(COLORS.success, `🍖 Bạn cho mèo ăn. Nó để lại một dấu chân nhỏ phát sáng.\n🤝 Reputation: **${rep}** (+4)`));
}

async function showDiceGambler(ctx: RunExploreEventInput): Promise<void> {
  const bets = [20, 60, 120];
  const embed = new EmbedBuilder().setColor(COLORS.gold)
    .setTitle('🎲 Người Chơi Xúc Xắc')
    .setDescription('Một người lạ xoay viên xúc xắc giữa các ngón tay. “Cược không? Số phận thích người liều.”');
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`dice_20_${ctx.userId}`).setLabel('Cược 20').setEmoji('🎲').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`dice_60_${ctx.userId}`).setLabel('Cược 60').setEmoji('🎲').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`dice_120_${ctx.userId}`).setLabel('Cược 120').setEmoji('🎲').setStyle(ButtonStyle.Danger)
  );
  const cid = await awaitButton(ctx, row, embed, 'merchant');
  const amount = bets.find(b => cid === `dice_${b}_${ctx.userId}`) ?? 0;
  if (!amount) return finish(ctx, simpleEmbed(COLORS.info, '🎲 Bạn bỏ qua canh bạc.'));
  const fresh = getEffectivePlayer(ctx.userId, ctx.guildId)!;
  if (fresh.gold < amount) return finish(ctx, simpleEmbed(COLORS.warning, `❌ Không đủ **${amount} Gold** để cược.`));
  spendGold(ctx.userId, ctx.guildId, amount);
  const win = randInt(1, 100) <= (amount >= 120 ? 42 : 48);
  if (win) {
    const prize = Math.floor(amount * (amount >= 120 ? 2.4 : amount >= 60 ? 2.0 : 1.8));
    grantGold(ctx.userId, ctx.guildId, prize);
    return finish(ctx, simpleEmbed(COLORS.gold, `🎲 Bạn thắng!\n🪙 -${amount} Gold, +**${prize} Gold**`));
  }
  return finish(ctx, simpleEmbed(COLORS.warning, `🎲 Bạn thua.\n🪙 -**${amount} Gold**`));
}

async function showGlowingMushroom(ctx: RunExploreEventInput): Promise<void> {
  const embed = new EmbedBuilder().setColor(COLORS.magic)
    .setTitle('🍄 Nấm Phát Sáng')
    .setDescription('Một cụm nấm phát sáng xanh tím mọc dưới thân cây mục. Mùi của nó vừa ngọt vừa nguy hiểm.');
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`mush_eat_${ctx.userId}`).setLabel('Ăn thử').setEmoji('🍄').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`mush_pick_${ctx.userId}`).setLabel('Thu thập').setEmoji('🧺').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`mush_leave_${ctx.userId}`).setLabel('Bỏ qua').setEmoji('🚶').setStyle(ButtonStyle.Secondary)
  );
  const cid = await awaitButton(ctx, row, embed, 'loot');
  if (cid === `mush_pick_${ctx.userId}`) {
    const qty = randInt(1, 3);
    addItem(ctx.userId, ctx.guildId, 'healing_herb', qty);
    return finish(ctx, simpleEmbed(COLORS.success, `🧺 Bạn thu thập được **${qty} Healing Herb**.`));
  }
  if (cid === `mush_eat_${ctx.userId}`) {
    const fresh = getEffectivePlayer(ctx.userId, ctx.guildId)!;
    if (randInt(1, 100) <= 50) {
      const exp = Math.floor(fresh.exp_next * 0.18);
      grantExp(ctx.userId, ctx.guildId, exp);
      return finish(ctx, simpleEmbed(COLORS.magic, `🍄 Nấm làm đầu óc bạn mở rộng.\n⭐ +**${exp} EXP**`));
    }
    const { dmg, hp } = safeHpLoss(fresh, 0.2);
    updatePlayerHpMp(ctx.userId, ctx.guildId, hp, fresh.mp);
    return finish(ctx, simpleEmbed(COLORS.warning, `🍄 Nấm độc!\n❤️ -**${dmg} HP**`));
  }
  return finish(ctx, simpleEmbed(COLORS.info, '🚶 Bạn bỏ qua cụm nấm. Một lựa chọn khá khôn ngoan.'));
}

async function showChainedPrisoner(ctx: RunExploreEventInput): Promise<void> {
  const embed = new EmbedBuilder().setColor(COLORS.warning)
    .setTitle('⛓️ Tù Nhân Bị Xích')
    .setDescription('Một người bị xích vào gốc cây van xin bạn giúp đỡ. Nhưng chiếc khóa có dấu hiệu bị cạy nhiều lần.');
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`pris_save_${ctx.userId}`).setLabel('Cứu').setEmoji('🗝️').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`pris_loot_${ctx.userId}`).setLabel('Lục túi rồi bỏ đi').setEmoji('🪙').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`pris_ask_${ctx.userId}`).setLabel('Hỏi chuyện').setEmoji('❔').setStyle(ButtonStyle.Primary)
  );
  const cid = await awaitButton(ctx, row, embed, 'villager');
  if (cid === `pris_save_${ctx.userId}`) {
    if (randInt(1, 100) <= 25 && ctx.enemies.length) return ctx.callbacks.showAmbush();
    const rep = adjustReputation(ctx.userId, ctx.guildId, 12);
    setFlag(ctx.guildId, `prisoner_saved_${ctx.userId}`, '1', 86400);
    return finish(ctx, simpleEmbed(COLORS.success, `🗝️ Bạn cứu tù nhân. Người đó hứa sẽ trả ơn vào một ngày khác.\n🤝 Reputation: **${rep}** (+12)`));
  }
  if (cid === `pris_loot_${ctx.userId}`) {
    const gold = randInt(15, 49);
    grantGold(ctx.userId, ctx.guildId, gold);
    const rep = adjustReputation(ctx.userId, ctx.guildId, -12);
    return finish(ctx, simpleEmbed(COLORS.warning, `🪙 Bạn lấy túi tiền của tù nhân rồi rời đi.\n🪙 +**${gold} Gold**\n🤝 Reputation: **${rep}** (-12)`));
  }
  setFlag(ctx.guildId, `zone_marked_${ctx.player.zone_id}`, '15', 1800);
  return finish(ctx, simpleEmbed(COLORS.info, '❔ Tù nhân kể về một lối đi ít quái vật qua khu vực này.\n📍 Zone hiện tại được đánh dấu trong 30 phút.'));
}

async function showMagicFountain(ctx: RunExploreEventInput): Promise<void> {
  const embed = new EmbedBuilder().setColor(0x3498DB)
    .setTitle('🧃 Suối Ma Thuật')
    .setDescription('Một dòng suối màu xanh bạc chảy ra từ vết nứt đá. Nước trong đến mức bạn thấy cả những vì sao bên dưới.');
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`fountain_drink_${ctx.userId}`).setLabel('Uống nước').setEmoji('🧃').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`fountain_bottle_${ctx.userId}`).setLabel('Đổ vào bình').setEmoji('🧪').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`fountain_bathe_${ctx.userId}`).setLabel('Tắm trong suối').setEmoji('✨').setStyle(ButtonStyle.Secondary)
  );
  const cid = await awaitButton(ctx, row, embed, 'spring');
  const fresh = getEffectivePlayer(ctx.userId, ctx.guildId)!;
  if (cid === `fountain_drink_${ctx.userId}`) {
    const hp = Math.min(fresh.max_hp, fresh.hp + Math.floor(fresh.max_hp * 0.32));
    const mp = Math.min(fresh.max_mp, fresh.mp + Math.floor(fresh.max_mp * 0.32));
    updatePlayerHpMp(ctx.userId, ctx.guildId, hp, mp);
    return finish(ctx, simpleEmbed(COLORS.success, `🧃 Dòng nước làm linh hồn dịu lại.\n❤️ ${hp}/${fresh.max_hp}\n💧 ${mp}/${fresh.max_mp}`));
  }
  if (cid === `fountain_bottle_${ctx.userId}`) {
    const itemId = randInt(1, 100) <= 55 ? 'health_potion' : 'mana_potion';
    addItem(ctx.userId, ctx.guildId, itemId, 1);
    return finish(ctx, simpleEmbed(COLORS.success, `🧪 Bạn hứng được ${displayItem(itemId)}.`));
  }
  updatePlayerHpMp(ctx.userId, ctx.guildId, fresh.hp, fresh.max_mp);
  return finish(ctx, simpleEmbed(COLORS.magic, `✨ Bạn tắm trong suối, cảm giác lời nguyền nhẹ đi.\n💧 MP hồi đầy: **${fresh.max_mp}/${fresh.max_mp}**`));
}

async function showLaughingBones(ctx: RunExploreEventInput): Promise<void> {
  const embed = new EmbedBuilder().setColor(COLORS.death)
    .setTitle('🦴 Đống Xương Biết Cười')
    .setDescription('Một đống xương khô bỗng lạch cạch cười. “Ghép ta lại đi, ta chỉ thiếu... gần hết thôi.”');
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`bones_talk_${ctx.userId}`).setLabel('Nói chuyện').setEmoji('💬').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`bones_kick_${ctx.userId}`).setLabel('Đá đống xương').setEmoji('🦶').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`bones_build_${ctx.userId}`).setLabel('Ghép lại').setEmoji('🦴').setStyle(ButtonStyle.Success)
  );
  const cid = await awaitButton(ctx, row, embed, 'mysterious');
  if (cid === `bones_talk_${ctx.userId}`) {
    const exp = randInt(7, 25);
    grantExp(ctx.userId, ctx.guildId, exp);
    return finish(ctx, simpleEmbed(COLORS.info, `💬 Bộ xương kể một câu chuyện tệ đến mức bạn học được điều gì đó.\n⭐ +**${exp} EXP**`));
  }
  if (cid === `bones_kick_${ctx.userId}`) {
    const fresh = getEffectivePlayer(ctx.userId, ctx.guildId)!;
    const { dmg, hp } = safeHpLoss(fresh, 0.14);
    updatePlayerHpMp(ctx.userId, ctx.guildId, hp, fresh.mp);
    return finish(ctx, simpleEmbed(COLORS.warning, `🦶 Bạn đá đống xương. Một cái xương bay ngược vào mặt bạn.\n❤️ -**${dmg} HP**`));
  }
  setFlag(ctx.guildId, `bone_friend_${ctx.userId}`, '1', 3600);
  return finish(ctx, simpleEmbed(COLORS.success, '🦴 Bạn ghép lại bộ xương. Nó đứng dậy, cúi chào rồi đi theo bạn một đoạn.\n💀 Skeleton ally flag trong 1 giờ.'));
}

async function showMissingChildChain(ctx: RunExploreEventInput): Promise<void> {
  const key = `missing_child_${ctx.userId}`;
  const stage = Number(getFlag(ctx.guildId, key) ?? '0') || 0;

  if (stage <= 0) {
    const embed = new EmbedBuilder().setColor(COLORS.info)
      .setTitle('👧 Đứa Trẻ Mất Tích — Khởi Đầu')
      .setDescription('Một dân làng chạy tới, tay cầm chiếc khăn nhỏ dính bùn. “Xin hãy tìm con tôi...”');
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId(`child_accept_${ctx.userId}`).setLabel('Nhận lời').setEmoji('🤝').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`child_refuse_${ctx.userId}`).setLabel('Từ chối').setEmoji('🚶').setStyle(ButtonStyle.Secondary)
    );
    const cid = await awaitButton(ctx, row, embed, 'villager');
    if (cid === `child_accept_${ctx.userId}`) {
      setFlag(ctx.guildId, key, '1', 172800);
      return finish(ctx, simpleEmbed(COLORS.success, '🤝 Bạn nhận lời tìm đứa trẻ.\n📌 Quest chain đã bắt đầu. Hãy tiếp tục explore để tiến triển.'));
    }
    return finish(ctx, simpleEmbed(COLORS.info, '🚶 Bạn từ chối. Tiếng khóc của dân làng xa dần sau lưng.'));
  }

  if (stage === 1) {
    setFlag(ctx.guildId, key, '2', 172800);
    return finish(ctx, simpleEmbed(COLORS.info, '👣 Bạn tìm thấy dấu chân nhỏ cạnh bìa rừng, xen lẫn vết kéo của thứ gì đó lớn hơn.\n📌 Quest chain tiến triển: **2/4**.'));
  }

  if (stage === 2 && ctx.enemies.length) {
    setFlag(ctx.guildId, key, '3', 172800);
    const base = pick(ctx.enemies);
    const enemy = eventEnemy(ctx, base, { id: 'child_cave_guard', name: `Kẻ Canh Hang ${base.name}`, icon: base.icon, hp: Math.floor(base.hp * 1.2), atk: Math.floor(base.atk * 1.1), def: base.def });
    return startCombatFlowWithEnemy(ctx.interaction, ctx.userId, ctx.guildId, enemy, undefined,
      async (_int, btn, _uid, _gid, _p, e, state) => grantCombatReward(ctx, btn, e, state, { title: '👣 Dấu Chân Dẫn Tới Hang', description: 'Bạn đánh bại kẻ canh hang. Từ bên trong vọng ra tiếng khóc trẻ con.', exp: Math.floor(ctx.player.exp_next * 0.2), gold: randInt(25, 80) }),
      ctx.callbacks.handleDeath,
      ctx.callbacks.handleFlee
    );
  }

  const rep = adjustReputation(ctx.userId, ctx.guildId, 25);
  const gold = randInt(49, 99);
  grantGold(ctx.userId, ctx.guildId, gold);
  grantSoulShards(ctx.userId, ctx.guildId, 1);
  incrementChapterObjective(ctx.userId, ctx.guildId, 'rescue_villager', { zoneId: ctx.player.zone_id });
  setFlag(ctx.guildId, key, 'done', 604800);
  setFlag(ctx.guildId, 'shop_discount', '10', 86400);
  return finish(ctx, simpleEmbed(COLORS.success, `👧 Bạn cứu được đứa trẻ khỏi hang tối. Dân làng vây quanh bạn trong nước mắt.\n🪙 +**${gold} Gold**\n💀 +**1 Soul Shard**\n🤝 Reputation: **${rep}** (+25)\n🛒 Shop discount **10% trong 24h**.`));
}

async function showBlackMarket(ctx: RunExploreEventInput): Promise<void> {
  consumeBuff(ctx.userId, ctx.guildId, 'black_market_access');

  const wanted = getWantedLevel(ctx.userId, ctx.guildId);
  const embed = new EmbedBuilder().setColor(COLORS.dark)
    .setTitle('🌑 Chợ Đen Trong Hẻm')
    .setDescription(
      `Một cánh cửa đen mở ra sau bức tường ẩm. Bên trong, hàng hóa bị cấm được đặt dưới ánh nến tím.\n\n` +
      `📜 Wanted của bạn: **${wanted}/5 — ${getWantedTitle(wanted)}**\n` +
      `*Route ác không chỉ bị phạt — nó cũng mở ra những món không ai dám bán công khai.*`
    );

  const fullStock = [
    { id: 'black_market_token', label: 'Black Market Token', price: 600, desc: 'Mở đường vào chợ đen lần sau', emoji: '🌑' },
    { id: 'fate_coin', label: 'Fate Coin', price: 1500, desc: 'Đồng xu dùng cho event định mệnh', emoji: '🪙' },
    { id: 'soul_shard_pack', label: 'Soul Shard', price: 1200, desc: '+1 Soul Shard', emoji: '💀', special: 'soul_shard' },
    { id: 'material_chest', label: 'Material Chest', price: 1800, desc: 'Rương nguyên liệu ngẫu nhiên', emoji: '📦' },
    { id: 'cursed_equipment_box', label: 'Cursed Equipment Box', price: 2500, desc: 'Rương trang bị nguyền rủa', emoji: '🎁' },
    { id: 'book_execute', label: 'Rare Skill Book', price: 3000, desc: 'Execute — skill book hiếm', emoji: '📕' },
    { id: 'book_meteor_shower', label: 'Epic Skill Book', price: 10000, desc: 'Meteor Shower — skill book rất hiếm', emoji: '📙' },
    { id: 'soul_anchor', label: 'Soul Anchor', price: 2500, desc: 'Bảo hộ khi chết', emoji: '⚓' },
    { id: 'blood_vial', label: 'Blood Vial', price: 400, desc: 'Hồi máu + ATK, giảm reputation', emoji: '🩸' },
    { id: 'assassins_smoke', label: "Assassin's Smoke", price: 650, desc: 'Hỗ trợ cướp shopkeeper', emoji: '💨' },
    { id: 'arson_bottle', label: 'Arson Bottle', price: 500, desc: 'Gây sát thương lửa trong combat', emoji: '🔥' },
    { id: 'rage_elixir', label: 'Rage Elixir', price: 700, desc: 'ATK mạnh nhưng nguy hiểm', emoji: '💢' },
    { id: 'cracked_soul_charm', label: 'Cracked Soul Charm', price: 1000, desc: '25% sống sót với 1 HP khi chết', emoji: '💔' },
  ];

  // Random daily-feeling stock per encounter: enough choice, not the whole catalogue.
  const stock = fullStock
    .sort(() => Math.random() - 0.5)
    .slice(0, wanted >= 3 ? 8 : 6);

  const options = stock
    .map(x => ({ ...x, item: getItem(x.id) }))
    .filter(x => x.special || x.item)
    .map(x =>
      new (require('discord.js').StringSelectMenuOptionBuilder)()
        .setLabel(`${x.label} — ${x.price} Gold`)
        .setDescription(x.desc)
        .setValue(x.id)
        .setEmoji(x.item?.icon ?? x.emoji)
    );

  const rows: ActionRowBuilder<any>[] = [];
  if (options.length) {
    const { StringSelectMenuBuilder } = require('discord.js');
    rows.push(new ActionRowBuilder<any>().addComponents(
      new StringSelectMenuBuilder().setCustomId(`black_buy_${ctx.userId}`).setPlaceholder('Mua hàng cấm...').addOptions(options.slice(0, 25))
    ));
  }
  rows.push(new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`black_leave_${ctx.userId}`).setLabel('Rời đi').setEmoji('🚶').setStyle(ButtonStyle.Secondary)
  ));

  const reply = await ctx.interaction.editReply({ embeds: [embed], components: rows });
  const comp = await reply.awaitMessageComponent({ filter: onlyUser(ctx.userId), time: 45_000 }).catch(() => null);
  if (!comp) return finish(ctx, simpleEmbed(COLORS.info, '🌑 Cánh cửa chợ đen khép lại.'));
  const ok = await comp.deferUpdate().then(() => true).catch(() => false);
  if (!ok) return finish(ctx, simpleEmbed(COLORS.info, '🌑 Cánh cửa chợ đen khép lại.'));
  if ((comp as any).customId === `black_leave_${ctx.userId}`) return finish(ctx, simpleEmbed(COLORS.info, '🚶 Bạn rời chợ đen trước khi bị kéo sâu hơn.'));

  const itemId = (comp as any).values?.[0];
  const row = stock.find(x => x.id === itemId);
  if (!row) return finish(ctx, simpleEmbed(COLORS.info, '🌑 Cánh cửa chợ đen khép lại.'));
  const fresh = getEffectivePlayer(ctx.userId, ctx.guildId)!;
  if (fresh.gold < row.price) return finish(ctx, simpleEmbed(COLORS.warning, '❌ Không đủ Gold.'));
  spendGold(ctx.userId, ctx.guildId, row.price);
  const rep = adjustReputation(ctx.userId, ctx.guildId, -3);
  adjustFaction(ctx.userId, ctx.guildId, 'shadow_court', 5);
  adjustFaction(ctx.userId, ctx.guildId, 'merchants', -3);

  if ((row as any).special === 'soul_shard') {
    grantSoulShards(ctx.userId, ctx.guildId, 1);
    return finish(ctx, simpleEmbed(COLORS.dark, `🌑 Bạn mua 💀 **Soul Shard** với giá **${row.price} Gold**.
🤝 Reputation: **${rep}** (-3)
🌑 Hội Bóng Tối: +5`));
  }

  addItem(ctx.userId, ctx.guildId, row.id, 1);
  const item = getItem(row.id)!;
  return finish(ctx, simpleEmbed(COLORS.dark, `🌑 Bạn mua ${item.icon} **${item.name}** với giá **${row.price} Gold**.
🤝 Reputation: **${rep}** (-3)
🌑 Hội Bóng Tối: +5`));
}

async function showAtonementMonk(ctx: RunExploreEventInput): Promise<void> {
  const wanted = getWantedLevel(ctx.userId, ctx.guildId);
  const fine = Math.max(120, 180 + wanted * 120 + Math.abs(ctx.player.reputation ?? 0) * 2);
  const embed = new EmbedBuilder().setColor(COLORS.success)
    .setTitle('🕊️ Tu Sĩ Chuộc Tội')
    .setDescription(
      `Một tu sĩ đứng giữa đường, tay cầm chuông bạc.\n“Không ai sạch tội. Nhưng ai cũng có thể trả giá.”\n\n` +
      `📜 Wanted: **${wanted}/5 — ${getWantedTitle(wanted)}**\n` +
      `💰 Phí chuộc tội: **${fine} Gold**\n` +
      `💀 Hoặc hiến **2 Soul Shard** để hồi reputation.`
    );
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`atone_gold_${ctx.userId}`).setLabel(`Trả ${fine} Gold`).setEmoji('💰').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`atone_soul_${ctx.userId}`).setLabel('Hiến 2 Soul Shard').setEmoji('💀').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`atone_mark_${ctx.userId}`).setLabel('Dùng Ấn Chuộc Lỗi').setEmoji('🧾').setStyle(ButtonStyle.Secondary)
  );
  const cid = await awaitButton(ctx, row, embed, 'mysterious');
  const fresh = getEffectivePlayer(ctx.userId, ctx.guildId)!;

  if (cid === `atone_gold_${ctx.userId}`) {
    if (fresh.gold < fine) return finish(ctx, simpleEmbed(COLORS.warning, `❌ Không đủ **${fine} Gold**.`));
    spendGold(ctx.userId, ctx.guildId, fine);
    const newWanted = adjustWanted(ctx.userId, ctx.guildId, -1);
    const rep = adjustReputation(ctx.userId, ctx.guildId, 8);
    increaseMerchantFear(ctx.guildId, -5);
    adjustWorldDanger(ctx.guildId, -3);
    adjustFaction(ctx.userId, ctx.guildId, 'old_church', 8);
    return finish(ctx, simpleEmbed(COLORS.success, `🕊️ Chuông bạc ngân lên.\n📜 Wanted: **${newWanted}/5** (-1)\n🤝 Reputation: **${rep}** (+8)\n🏦 Merchant Fear -5 · ⚠️ Danger -3`));
  }

  if (cid === `atone_soul_${ctx.userId}`) {
    if (fresh.soul_shards < 2) return finish(ctx, simpleEmbed(COLORS.warning, '❌ Không đủ **2 Soul Shard**.'));
    grantSoulShards(ctx.userId, ctx.guildId, -2);
    const rep = adjustReputation(ctx.userId, ctx.guildId, 20);
    adjustFaction(ctx.userId, ctx.guildId, 'old_church', 12);
    return finish(ctx, simpleEmbed(COLORS.success, `💀 Hai mảnh linh hồn tan thành tro trắng.\n🤝 Reputation: **${rep}** (+20)\n🕯️ Giáo Đoàn Cổ: +12`));
  }

  if ((fresh as any).merchant_mercy > 0) {
    // Consume one charge through a direct update to avoid adding another exported helper just for one flag.
    const db = (await import('../database/index')).default;
    db.prepare('UPDATE players SET merchant_mercy = MAX(0, COALESCE(merchant_mercy,0) - 1) WHERE user_id=? AND guild_id=?')
      .run(ctx.userId, ctx.guildId);
    const wantedAfter = adjustWanted(ctx.userId, ctx.guildId, -1);
    const rep = adjustReputation(ctx.userId, ctx.guildId, 12);
    increaseMerchantFear(ctx.guildId, -8);
    return finish(ctx, simpleEmbed(COLORS.success, `🧾 Ấn chuộc lỗi cháy thành ánh bạc.\n📜 Wanted: **${wantedAfter}/5** (-1)\n🤝 Reputation: **${rep}** (+12)\n🏦 Merchant Fear -8`));
  }
  return finish(ctx, simpleEmbed(COLORS.warning, '🧾 Bạn không có **Ấn Chuộc Lỗi Thương Nhân**.'));
}

async function showConditionalMiniboss(ctx: RunExploreEventInput): Promise<void> {
  const wanted = getWantedLevel(ctx.userId, ctx.guildId);
  const rep = ctx.player.reputation ?? 0;
  const robberies = getShopkeeperRobberyCount(ctx.guildId, ctx.userId);
  const base = ctx.enemies.length ? pick(ctx.enemies) : null;
  const fresh = getEffectivePlayer(ctx.userId, ctx.guildId)!;

  let spec = {
    id: 'fallen_self', name: 'Bản Ngã Sa Ngã', icon: '🪞', title: '🪞 Bản Ngã Sa Ngã',
    desc: 'Một bóng hình giống bạn bước ra từ mặt gương vỡ. Nó mang ký ức của những lần chết cũ.',
    hpMul: 1.0, atkMul: 1.0, defMul: 1.0, rewardItem: 'soul_dust', rep: 0
  };

  if (robberies >= 2 || wanted >= 4) {
    spec = { id: 'merchant_guardian', name: 'Merchant Guardian', icon: '🛡️', title: '🛡️ Hộ Vệ Hội Thương Nhân', desc: 'Một hộ vệ mặc giáp thương hội chặn đường: “Nợ máu phải trả bằng máu.”', hpMul: 1.25, atkMul: 1.2, defMul: 1.2, rewardItem: 'merchant_seal', rep: -5 };
  } else if (rep <= -70) {
    spec = { id: 'judge_of_souls', name: 'Judge of Souls', icon: '⚖️', title: '⚖️ Thẩm Phán Linh Hồn', desc: 'Một chiếc cân đen treo trên không trung. Tội lỗi của bạn có trọng lượng.', hpMul: 1.2, atkMul: 1.15, defMul: 1.05, rewardItem: 'broken_rune', rep: 4 };
  } else if (wanted >= 3) {
    spec = { id: 'debt_collector', name: 'Debt Collector', icon: '🩸', title: '🩸 Kẻ Đòi Nợ', desc: 'Một kẻ đòi nợ của chợ đen xuất hiện. “Ngươi làm loạn thị trường đủ rồi.”', hpMul: 1.1, atkMul: 1.25, defMul: 0.95, rewardItem: 'rusty_gear', rep: 0 };
  }

  const enemy = eventEnemy(ctx, base, {
    id: spec.id, name: spec.name, icon: spec.icon,
    level: fresh.level + 2,
    hp: Math.floor((fresh.max_hp + 80) * spec.hpMul),
    atk: Math.floor((fresh.atk + 10) * spec.atkMul),
    def: Math.floor((fresh.def + 5) * spec.defMul),
    expReward: Math.floor(fresh.exp_next * 0.35),
    goldMin: 60, goldMax: 140,
    drops: [{ itemId: spec.rewardItem, chance: 100 }],
    lore: spec.desc
  });

  const embed = new EmbedBuilder().setColor(COLORS.danger).setTitle(spec.title).setDescription(`${spec.desc}\n\n⚔️ Bạn không thể né cuộc đối đầu này.`);
  await finishNoContinue(ctx, embed, 'ambush');
  await new Promise(r => setTimeout(r, 700));

  return startCombatFlowWithEnemy(ctx.interaction, ctx.userId, ctx.guildId, enemy, undefined,
    async (_int, btn, _uid, _gid, _p, e, state) => {
      if (spec.id === 'merchant_guardian') adjustWanted(ctx.userId, ctx.guildId, -1);
      await grantCombatReward(ctx, btn, e, state, {
        title: spec.title + ' Đã Bị Hạ',
        description: 'Bạn sống sót qua hậu quả do chính mình tạo ra.',
        exp: Math.floor(fresh.exp_next * 0.28),
        gold: randInt(50, 130),
        items: [spec.rewardItem],
        rep: spec.rep,
        color: COLORS.danger
      });
    },
    ctx.callbacks.handleDeath,
    ctx.callbacks.handleFlee
  );
}

// EXTRA_EVENTS_COMMON_START
async function showMimicChest(ctx: RunExploreEventInput): Promise<void> {
  const embed = new EmbedBuilder()
    .setColor(COLORS.gold)
    .setTitle('🎁 Rương Cũ Run Nhẹ')
    .setDescription('Một chiếc rương gỗ nằm giữa đường. Nắp rương khẽ hé ra như đang... thở.');

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`mimic_open_${ctx.userId}`).setLabel('Mở ngay').setEmoji('🗝️').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`mimic_check_${ctx.userId}`).setLabel('Kiểm tra bẫy').setEmoji('🔎').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`mimic_leave_${ctx.userId}`).setLabel('Bỏ qua').setStyle(ButtonStyle.Secondary),
  );

  const cid = await awaitButton(ctx, row, embed, 'chest');
  if (cid === `mimic_leave_${ctx.userId}` || !cid) return finish(ctx, simpleEmbed(COLORS.info, '🚶 Bạn bỏ qua chiếc rương khả nghi. Có lẽ đó là lựa chọn khôn ngoan.'), 'chest');

  const careful = cid === `mimic_check_${ctx.userId}`;
  const mimicChance = careful ? 18 : 42;
  if (randInt(1, 100) <= mimicChance && ctx.enemies.length) {
    const base = pick(ctx.enemies);
    const enemy = eventEnemy(ctx, base, {
      id: 'mimic_chest', name: 'Mimic Rương Cũ', icon: '🎁',
      hp: Math.floor((base.hp ?? 60) * 1.25),
      atk: Math.floor((base.atk ?? ctx.player.atk) * 1.1),
      def: Math.floor((base.def ?? ctx.player.def) * 1.05),
      expReward: Math.floor(ctx.player.exp_next * 0.18), goldMin: 30, goldMax: 90,
      drops: [{ itemId: pick(['mysterious_shard', 'mana_crystal', 'iron_ore']), chance: 45 }],
      lore: 'Một chiếc rương sống chuyên nuốt những kẻ tham lam.',
    });
    return startCombatFlowWithEnemy(
      ctx.interaction, ctx.userId, ctx.guildId, enemy, undefined,
      async (_int, btn, _uid, _gid, _p, e, state) => grantCombatReward(ctx, btn, e, state, {
        title: '🎁 Mimic Bị Hạ',
        description: 'Bạn phá vỡ lớp gỗ sống của Mimic và gom được phần lõi bên trong.',
        exp: Math.floor(ctx.player.exp_next * 0.2), gold: randInt(45, 120),
        items: [pick(['mysterious_shard', 'mana_crystal', 'iron_ore'])],
      }),
      nonLethalLoss as any,
      ctx.callbacks.handleFlee,
    );
  }

  if (careful) grantExp(ctx.userId, ctx.guildId, randInt(12, 24));
  const gold = careful ? randInt(25, 70) : randInt(40, 110);
  grantGold(ctx.userId, ctx.guildId, gold);
  if (randInt(1, 100) <= (careful ? 45 : 25)) addItem(ctx.userId, ctx.guildId, pick(['health_potion', 'mana_potion', 'antidote']), 1);
  return finish(ctx, simpleEmbed(COLORS.gold, `🎁 Chiếc rương là thật!
💰 +**${gold} Gold**${careful ? '\n⭐ +EXP nhỏ từ việc kiểm tra bẫy' : ''}`), 'chest');
}

async function showWanderingBlacksmith(ctx: RunExploreEventInput): Promise<void> {
  const player = getEffectivePlayer(ctx.userId, ctx.guildId)!;
  const embed = new EmbedBuilder().setColor(0x9b7653).setTitle('🔥 Thợ Rèn Lang Thang').setDescription('Một lò rèn nhỏ cháy đỏ bên vệ đường. Người thợ rèn già nhìn vũ khí của bạn rồi gật đầu.');
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`smith_weapon_${ctx.userId}`).setLabel('Mua Weapon Oil - 60G').setEmoji('⚔️').setStyle(ButtonStyle.Primary).setDisabled(player.gold < 60),
    new ButtonBuilder().setCustomId(`smith_armor_${ctx.userId}`).setLabel('Mua Armor Polish - 55G').setEmoji('🛡️').setStyle(ButtonStyle.Primary).setDisabled(player.gold < 55),
    new ButtonBuilder().setCustomId(`smith_rare_${ctx.userId}`).setLabel('Đặt hàng hiếm - 120G').setEmoji('⚒️').setStyle(ButtonStyle.Success).setDisabled(player.gold < 120),
    new ButtonBuilder().setCustomId(`smith_leave_${ctx.userId}`).setLabel('Rời đi').setStyle(ButtonStyle.Secondary),
  );
  const cid = await awaitButton(ctx, row, embed, 'merchant');
  if (!cid || cid === `smith_leave_${ctx.userId}`) return finish(ctx, simpleEmbed(COLORS.info, '🔥 Thợ rèn gật đầu chào bạn rồi tiếp tục nhóm lửa.'), 'merchant');
  if (cid === `smith_weapon_${ctx.userId}`) { spendGold(ctx.userId, ctx.guildId, 60); addItem(ctx.userId, ctx.guildId, 'weapon_oil', 1); return finish(ctx, simpleEmbed(COLORS.success, '⚔️ Bạn mua **Weapon Oil**.\n💰 -**60 Gold**'), 'merchant'); }
  if (cid === `smith_armor_${ctx.userId}`) { spendGold(ctx.userId, ctx.guildId, 55); addItem(ctx.userId, ctx.guildId, 'armor_polish', 1); return finish(ctx, simpleEmbed(COLORS.success, '🛡️ Bạn mua **Armor Polish**.\n💰 -**55 Gold**'), 'merchant'); }
  spendGold(ctx.userId, ctx.guildId, 120);
  const rare = pick(['black_iron', 'mana_crystal', 'mysterious_shard', 'silver_ore']);
  addItem(ctx.userId, ctx.guildId, rare, 1);
  grantExp(ctx.userId, ctx.guildId, 18);
  return finish(ctx, simpleEmbed(COLORS.gold, `⚒️ Thợ rèn mở hộp hàng dưới gầm xe.
💰 -**120 Gold**
📦 +**1× ${rare}**
⭐ +**18 EXP**`), 'merchant');
}

async function showTemporaryArena(ctx: RunExploreEventInput): Promise<void> {
  const player = getEffectivePlayer(ctx.userId, ctx.guildId)!;
  const bet = Math.min(player.gold, Math.max(30, 30 + player.level * 10));
  const embed = new EmbedBuilder().setColor(0xb35c00).setTitle('⚔️ Đấu Trường Tạm Thời').setDescription('Một vòng tròn đá được dựng vội. Khán giả hò reo khi thấy bạn bước đến.');
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`arena_fight_${ctx.userId}`).setLabel('Đấu thường').setEmoji('⚔️').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`arena_bet_${ctx.userId}`).setLabel(`Đấu cược ${bet}G`).setEmoji('💰').setStyle(ButtonStyle.Danger).setDisabled(bet <= 0),
    new ButtonBuilder().setCustomId(`arena_leave_${ctx.userId}`).setLabel('Rời đi').setStyle(ButtonStyle.Secondary),
  );
  const cid = await awaitButton(ctx, row, embed, 'combat');
  if (!cid || cid === `arena_leave_${ctx.userId}`) return finish(ctx, simpleEmbed(COLORS.info, '🚶 Bạn rời khỏi đấu trường trước khi bị kéo vào trận.'), 'combat');
  if (!ctx.enemies.length) return finish(ctx, simpleEmbed(COLORS.info, '⚔️ Đấu trường trống. Không có đối thủ phù hợp.'), 'combat');
  const base = pick(ctx.enemies);
  const enemy = eventEnemy(ctx, base, { id: 'arena_challenger', name: `Đấu Sĩ ${base.name}`, icon: '⚔️', hp: Math.floor((base.hp ?? 60) * 1.1), atk: Math.floor((base.atk ?? ctx.player.atk) * 1.05), def: base.def ?? ctx.player.def, lore: 'Một đấu sĩ nhận kèo từ đấu trường tạm thời.' });
  const isBet = cid === `arena_bet_${ctx.userId}`;
  if (isBet) spendGold(ctx.userId, ctx.guildId, bet);
  return startCombatFlowWithEnemy(
    ctx.interaction, ctx.userId, ctx.guildId, enemy, undefined,
    async (_int, btn, _uid, _gid, _p, e, state) => grantCombatReward(ctx, btn, e, state, {
      title: isBet ? '💰 Bạn Thắng Kèo Đấu!' : '🏆 Chiến Thắng Đấu Trường',
      description: isBet ? 'Khán giả ném tiền vào vòng đấu khi bạn hạ đối thủ.' : 'Bạn thắng trận và được đám đông công nhận.',
      exp: Math.floor(ctx.player.exp_next * (isBet ? 0.2 : 0.14)), gold: isBet ? bet * 2 + randInt(20, 60) : randInt(25, 70), rep: isBet ? 1 : 2,
    }),
    nonLethalLoss as any,
    ctx.callbacks.handleFlee,
  );
}

async function showBossTracks(ctx: RunExploreEventInput): Promise<void> {
  const embed = new EmbedBuilder().setColor(COLORS.danger).setTitle('🐾 Dấu Vết Boss').setDescription('Mặt đất bị cày nát bởi dấu chân khổng lồ. Không khí nặng như trước một trận chiến lớn.');
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`bt_follow_${ctx.userId}`).setLabel('Lần theo dấu vết').setEmoji('🐾').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`bt_collect_${ctx.userId}`).setLabel('Thu thập mẫu vật').setEmoji('🧪').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`bt_destroy_${ctx.userId}`).setLabel('Xóa dấu vết').setEmoji('🛡️').setStyle(ButtonStyle.Secondary),
  );
  const cid = await awaitButton(ctx, row, embed, 'boss');
  if (cid === `bt_collect_${ctx.userId}`) { const item = pick(['mysterious_shard', 'ancient_bone', 'cursed_blood', 'mana_crystal']); addItem(ctx.userId, ctx.guildId, item, 1); grantExp(ctx.userId, ctx.guildId, randInt(25, 55)); return finish(ctx, simpleEmbed(COLORS.success, `🧪 Bạn thu được mẫu vật từ dấu vết.
📦 +**1× ${item}**
⭐ +EXP thăm dò`), 'boss'); }
  if (cid === `bt_destroy_${ctx.userId}`) { adjustWorldDanger(ctx.guildId, -2); return finish(ctx, simpleEmbed(COLORS.info, '🛡️ Bạn xóa dấu vết để quái vật khó lần về khu dân cư.\n⚠️ World Danger **-2**'), 'boss'); }
  if (!cid || !ctx.enemies.length) return finish(ctx, simpleEmbed(COLORS.info, '🐾 Dấu vết mất hút trong sương mù.'), 'boss');
  const base = pick(ctx.enemies);
  const enemy = eventEnemy(ctx, base, { id: 'boss_track_guardian', name: `Hộ Vệ Dấu Vết ${base.name}`, icon: '🐾', hp: Math.floor((base.hp ?? 70) * 1.35), atk: Math.floor((base.atk ?? ctx.player.atk) * 1.18), def: Math.floor((base.def ?? ctx.player.def) * 1.1), expReward: Math.floor(ctx.player.exp_next * 0.25), goldMin: 60, goldMax: 140, lore: 'Kẻ canh giữ lãnh địa boss.' });
  return startCombatFlowWithEnemy(ctx.interaction, ctx.userId, ctx.guildId, enemy, undefined, async (_int, btn, _uid, _gid, _p, e, state) => grantCombatReward(ctx, btn, e, state, { title: '🐾 Dấu Vết Được Mở Đường', description: 'Bạn hạ hộ vệ và hiểu rõ hơn về con boss đang ẩn trong khu vực.', exp: Math.floor(ctx.player.exp_next * 0.24), gold: randInt(70, 160), soulShards: randInt(1, 100) <= 45 ? 1 : 0 }), nonLethalLoss as any, ctx.callbacks.handleFlee);
}

async function showMapSeller(ctx: RunExploreEventInput): Promise<void> {
  const player = getEffectivePlayer(ctx.userId, ctx.guildId)!;
  const embed = new EmbedBuilder().setColor(0x6b4f2a).setTitle('🗺️ Người Bán Bản Đồ').setDescription('Một người bán bản đồ trải giấy da trên thùng gỗ. Một số tuyến đường được đánh dấu bằng mực đỏ.');
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`map_safe_${ctx.userId}`).setLabel('Mua bản đồ an toàn - 45G').setEmoji('🛡️').setStyle(ButtonStyle.Primary).setDisabled(player.gold < 45),
    new ButtonBuilder().setCustomId(`map_ancient_${ctx.userId}`).setLabel('Mua bản đồ cổ - 120G').setEmoji('🗺️').setStyle(ButtonStyle.Success).setDisabled(player.gold < 120),
    new ButtonBuilder().setCustomId(`map_rob_${ctx.userId}`).setLabel('Cướp bản đồ').setEmoji('🗡️').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`map_leave_${ctx.userId}`).setLabel('Bỏ qua').setStyle(ButtonStyle.Secondary),
  );
  const cid = await awaitButton(ctx, row, embed, 'merchant');
  if (!cid || cid === `map_leave_${ctx.userId}`) return finish(ctx, simpleEmbed(COLORS.info, '🗺️ Bạn không mua gì và rời đi.'), 'merchant');
  if (cid === `map_safe_${ctx.userId}`) { spendGold(ctx.userId, ctx.guildId, 45); setFlag(ctx.guildId, `zone_marked_${ctx.player.zone_id}`, '20', 1800); return finish(ctx, simpleEmbed(COLORS.success, '🗺️ Bạn mua bản đồ tuyến an toàn.\n💰 -**45 Gold**\n📍 Zone hiện tại được đánh dấu trong **30 phút**.'), 'merchant'); }
  if (cid === `map_ancient_${ctx.userId}`) { spendGold(ctx.userId, ctx.guildId, 120); setFlag(ctx.guildId, `treasure_hint_${ctx.userId}`, ctx.player.zone_id ?? 'unknown', 3600); addItem(ctx.userId, ctx.guildId, 'mysterious_shard', 1); return finish(ctx, simpleEmbed(COLORS.gold, '🗺️ Bạn mua một bản đồ cổ.\n💰 -**120 Gold**\n📦 +**1× Mysterious Shard**'), 'merchant'); }
  const rep = adjustReputation(ctx.userId, ctx.guildId, -8); adjustWanted(ctx.userId, ctx.guildId, 1); setFlag(ctx.guildId, `zone_marked_${ctx.player.zone_id}`, '10', 1200);
  return finish(ctx, simpleEmbed(COLORS.warning, `🗡️ Bạn cướp được bản đồ rồi lẩn vào đám đông.
📉 Reputation: **${rep}** (-8)
🚨 Wanted **+1**`), 'merchant');
}
async function showOakHuntStart(ctx: RunExploreEventInput): Promise<void> {
  startOakHunt(ctx.guildId, ctx.userId);
  const embed = new EmbedBuilder()
    .setColor(0x2D7D46)
    .setTitle('🔍 Dấu Vết Linh Thú')
    .setDescription(
      '*Bạn phát hiện dấu móng khổng lồ in sâu vào bùn đất ẩm, cùng những cành cây gãy vụn theo hướng sâu hơn trong rừng...*\n\n' +
      `Bản năng mách bảo — **Linh Thú đang ở đâu đó gần đây**.\n\n` +
      `Sau **${OAK_HUNT_EXPLORES} lần khám phá** tiếp theo, bạn sẽ đối mặt với nó.\n\n` +
      '*Hãy chuẩn bị kỹ trước khi tiếp tục.*'
    );
  return finish(ctx, embed, 'forest');
}

// EXTRA_EVENTS_COMMON_END

// ── Key item events ──────────────────────────────────────────────────────────

async function showShrineRelicEvent(ctx: RunExploreEventInput): Promise<void> {
  const embed = new EmbedBuilder()
    .setColor(0xF1C40F)
    .setTitle('✨ Hào Quang Cổ Vật')
    .setDescription(
      '*Ánh hào quang vàng nhẹ phát ra từ trong túi bạn — Shrine Relic đang cộng hưởng với vùng đất này.*\n\n' +
      'Dâng cổ vật lên có thể triệu gọi phép màu... hoặc tai họa.'
    );
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`shrine_offer_${ctx.userId}`).setLabel('Dâng lên').setEmoji('🙏').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`shrine_keep_${ctx.userId}`).setLabel('Giữ lại').setEmoji('🤲').setStyle(ButtonStyle.Secondary)
  );
  const cid = await awaitButton(ctx, row, embed, 'altar');

  if (!cid || cid === `shrine_keep_${ctx.userId}`) {
    const lvResult = grantExp(ctx.userId, ctx.guildId, 40);
    return finish(ctx, simpleEmbed(COLORS.info,
      `🤲 Bạn giữ lại cổ vật và tiếp tục.\n⭐ +**40 EXP**${lvResult.leveledUp ? ` → **Level ${lvResult.newLevel}!**` : ''}`
    ), 'altar');
  }

  // Dâng lên — consume và random outcome
  removeItem(ctx.userId, ctx.guildId, 'shrine_relic', 1);
  const roll = randInt(1, 100);
  const fresh = getEffectivePlayer(ctx.userId, ctx.guildId)!;

  if (roll <= 35) {
    // Hồi HP + MP
    const healHp = Math.floor(fresh.max_hp * 0.40);
    const healMp = Math.floor(fresh.max_mp * 0.40);
    const newHp = Math.min(fresh.max_hp, fresh.hp + healHp);
    const newMp = Math.min(fresh.max_mp, fresh.mp + healMp);
    updatePlayerHpMp(ctx.userId, ctx.guildId, newHp, newMp);
    return finish(ctx, simpleEmbed(COLORS.success,
      `✨ Linh khí thánh địa chữa lành thân thể!\n❤️ +**${healHp} HP** (→ ${newHp}/${fresh.max_hp})\n💧 +**${healMp} MP** (→ ${newMp}/${fresh.max_mp})\n🗑️ Shrine Relic đã sử dụng.`
    ), 'altar');
  } else if (roll <= 65) {
    // EXP lớn
    const exp = Math.floor(fresh.exp_next * 0.35);
    const lvResult = grantExp(ctx.userId, ctx.guildId, exp);
    return finish(ctx, simpleEmbed(COLORS.gold,
      `✨ Hào quang cổ vật thấm vào tâm trí bạn!\n⭐ +**${exp} EXP**${lvResult.leveledUp ? ` → **Level ${lvResult.newLevel}!**` : ''}\n🗑️ Shrine Relic đã sử dụng.`
    ), 'altar');
  } else if (roll <= 85) {
    // Soul Shards
    grantSoulShards(ctx.userId, ctx.guildId, 3);
    return finish(ctx, simpleEmbed(COLORS.gold,
      `✨ Linh hồn cổ vật tan ra thành mảnh linh hồn!\n💠 +**3 Soul Shards**\n🗑️ Shrine Relic đã sử dụng.`
    ), 'altar');
  } else {
    // Nguyền — -20% HP
    const { dmg, hp } = safeHpLoss(fresh, 0.20);
    updatePlayerHpMp(ctx.userId, ctx.guildId, hp, fresh.mp);
    return finish(ctx, simpleEmbed(COLORS.danger,
      `💀 Cổ vật phát nổ với năng lượng tối tăm!\n❤️ -**${dmg} HP** (→ ${hp}/${fresh.max_hp})\n🗑️ Shrine Relic đã sử dụng.`
    ), 'altar');
  }
}

async function showForgottenCrownEvent(ctx: RunExploreEventInput): Promise<void> {
  const embed = new EmbedBuilder()
    .setColor(0x9B59B6)
    .setTitle('👑 Tiếng Gọi Của Kẻ Bị Lãng Quên')
    .setDescription(
      '*Vương miện cũ rỉ sét trong túi bạn bắt đầu rung động nhẹ, như thể ai đó từ xa đang gọi tên chủ cũ...*\n\n' +
      '**Đội vương miện lên** có thể triệu gọi điều gì đó hùng mạnh — hoặc cực kỳ nguy hiểm.\n' +
      '**Ném đi** để đổi lấy vàng từ tay buôn phế liệu đang đi qua.'
    );
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`crown_wear_${ctx.userId}`).setLabel('Đội lên').setEmoji('👑').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`crown_toss_${ctx.userId}`).setLabel('Ném đi').setEmoji('💰').setStyle(ButtonStyle.Secondary)
  );
  const cid = await awaitButton(ctx, row, embed, 'altar');

  // Ném đi — consume, gold 200-400
  if (!cid || cid === `crown_toss_${ctx.userId}`) {
    removeItem(ctx.userId, ctx.guildId, 'forgotten_crown', 1);
    const gold = randInt(200, 400);
    grantGold(ctx.userId, ctx.guildId, gold);
    return finish(ctx, simpleEmbed(COLORS.gold,
      `💰 Một gã buôn phế liệu trả **${gold} Gold** cho chiếc vương miện cũ.\n🗑️ Forgotten Crown đã bán.`
    ), 'merchant');
  }

  // Đội lên — consume và random
  removeItem(ctx.userId, ctx.guildId, 'forgotten_crown', 1);
  const roll = randInt(1, 100);

  if (roll <= 40) {
    // Legendary equipment drop
    const legendaryWeapons = ['dragon_slayer', 'moonlight_katana', 'bloodfang_dagger', 'sunforged_hammer'];
    const legendaryArmors  = ['dragon_scale_armor', 'paladin_armor', 'nightwalker_cloak'];
    const pool = [...legendaryWeapons, ...legendaryArmors];
    const reward = pick(pool);
    addItem(ctx.userId, ctx.guildId, reward, 1);
    return finish(ctx, simpleEmbed(COLORS.gold,
      `👑 Vương miện sáng lên và biến thành một báu vật!\n${displayItem(reward)} đã thêm vào túi đồ.\n🗑️ Forgotten Crown đã sử dụng.`
    ), 'altar');
  } else if (roll <= 70) {
    // Nguyền nặng — -30% HP
    const fresh = getEffectivePlayer(ctx.userId, ctx.guildId)!;
    const { dmg, hp } = safeHpLoss(fresh, 0.30);
    updatePlayerHpMp(ctx.userId, ctx.guildId, hp, fresh.mp);
    return finish(ctx, simpleEmbed(COLORS.danger,
      `💀 Vương miện trút toàn bộ oán hận của chủ cũ vào đầu bạn!\n❤️ -**${dmg} HP** (→ ${hp}/${fresh.max_hp})\n🗑️ Forgotten Crown đã sử dụng.`
    ), 'altar');
  } else {
    // Ghost knight fight
    if (!ctx.enemies.length) {
      // Nếu không có combat — đổi sang drop gold
      const gold = randInt(100, 200);
      grantGold(ctx.userId, ctx.guildId, gold);
      return finish(ctx, simpleEmbed(COLORS.gold,
        `👻 Bóng ma hiệp sĩ xuất hiện rồi biến mất, để lại **${gold} Gold**.\n🗑️ Forgotten Crown đã sử dụng.`
      ), 'altar');
    }
    const base = pick(ctx.enemies);
    const ghost = eventEnemy(ctx, base, {
      id: 'ghost_knight', name: 'Hồn Ma Hiệp Sĩ', icon: '👻',
      hp: Math.floor((base.hp ?? 80) * 1.4),
      atk: Math.floor((base.atk ?? ctx.player.atk) * 1.2),
      def: Math.floor((base.def ?? ctx.player.def) * 1.1),
      expReward: Math.floor(ctx.player.exp_next * 0.25), goldMin: 80, goldMax: 180,
      drops: [{ itemId: 'mysterious_shard', chance: 40 }, { itemId: 'iron_ore', chance: 30 }],
      lore: 'Người giữ vương miện một thời, nay chỉ còn là bóng tối.',
    });
    await ctx.interaction.editReply({
      embeds: [new EmbedBuilder().setColor(0x9B59B6).setTitle('👻 Hồn Ma Hiệp Sĩ Xuất Hiện!')
        .setDescription('Vương miện tan chảy — một bóng ma hiệp sĩ hiện ra với ánh mắt rực lửa xanh!\n🗑️ Forgotten Crown đã sử dụng.')],
      components: []
    });
    return startCombatFlowWithEnemy(
      ctx.interaction, ctx.userId, ctx.guildId, ghost, undefined,
      async (_int, btn, _uid, _gid, _p, e, state) => grantCombatReward(ctx, btn, e, state, {
        title: '👻 Hồn Ma Bị Giải Thoát',
        description: 'Hồn ma hiệp sĩ tan biến với nụ cười nhẹ nhõm.',
        exp: Math.floor(ctx.player.exp_next * 0.28), gold: randInt(100, 220),
        items: [pick(['mysterious_shard', 'iron_ore'])],
      }),
      ctx.callbacks.handleDeath,
      ctx.callbacks.handleFlee
    );
  }
}

async function showFlowerCrownEvent(ctx: RunExploreEventInput): Promise<void> {
  const embed = new EmbedBuilder()
    .setColor(0x2ECC71)
    .setTitle('🌸 Hương Rừng Quen Thuộc')
    .setDescription(
      '*Mùi hoa rừng từ chiếc vương miện lan ra, hòa vào không khí cây cối quanh bạn. Khu rừng dường như... nhận ra bạn.*\n\n' +
      '**Đặt xuống** để cảm ơn khu rừng và nhận ân huệ tự nhiên.\n' +
      '**Mang về** làm kỷ niệm nhỏ.'
    );
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`flower_place_${ctx.userId}`).setLabel('Đặt xuống').setEmoji('🌸').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`flower_keep_${ctx.userId}`).setLabel('Mang về').setEmoji('🤲').setStyle(ButtonStyle.Secondary)
  );
  const cid = await awaitButton(ctx, row, embed, 'forest');

  if (!cid || cid === `flower_keep_${ctx.userId}`) {
    const lvResult = grantExp(ctx.userId, ctx.guildId, 30);
    return finish(ctx, simpleEmbed(COLORS.info,
      `🌸 Bạn giữ lại vương miện hoa và tiếp tục.\n⭐ +**30 EXP**${lvResult.leveledUp ? ` → **Level ${lvResult.newLevel}!**` : ''}`
    ), 'forest');
  }

  // Đặt xuống — consume, heal 35% HP + luck buff 5 lần
  removeItem(ctx.userId, ctx.guildId, 'flower_crown', 1);
  const fresh = getEffectivePlayer(ctx.userId, ctx.guildId)!;
  const healHp = Math.floor(fresh.max_hp * 0.35);
  const newHp = Math.min(fresh.max_hp, fresh.hp + healHp);
  updatePlayerHpMp(ctx.userId, ctx.guildId, newHp, fresh.mp);
  setBuff(ctx.userId, ctx.guildId, 'luck', 1, 5, 7200);
  return finish(ctx, simpleEmbed(COLORS.success,
    `🌸 Vương miện hoa tan ra thành ánh sáng xanh nhạt.\n❤️ +**${healHp} HP** (→ ${newHp}/${fresh.max_hp})\n🍀 **May mắn** +5 lần khám phá tiếp theo\n🗑️ Flower Crown đã sử dụng.`
  ), 'forest');
}

async function showKnightEmblemEvent(ctx: RunExploreEventInput): Promise<void> {
  const embed = new EmbedBuilder()
    .setColor(0x3498DB)
    .setTitle('🏅 Lời Thề Cũ')
    .setDescription(
      '*Huy hiệu hiệp sĩ trong tay bạn vẫn còn chút ấm của người đã mang nó. Phía xa bạn thấy trạm canh của đội tuần tra hoàng gia...*\n\n' +
      '**Trả lại** cho tuần tra — họ có thể thưởng bạn.\n' +
      '**Giữ làm kỷ niệm** — ít nhất bạn có một vật nhắc nhở.'
    );
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`emblem_return_${ctx.userId}`).setLabel('Trả lại').setEmoji('🏅').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`emblem_keep_${ctx.userId}`).setLabel('Giữ kỷ niệm').setEmoji('🤲').setStyle(ButtonStyle.Secondary)
  );
  const cid = await awaitButton(ctx, row, embed, 'merchant');

  if (!cid || cid === `emblem_keep_${ctx.userId}`) {
    const lvResult = grantExp(ctx.userId, ctx.guildId, 35);
    return finish(ctx, simpleEmbed(COLORS.info,
      `🤲 Bạn giữ lại huy hiệu. Một ngày nào đó nó có thể hữu ích.\n⭐ +**35 EXP**${lvResult.leveledUp ? ` → **Level ${lvResult.newLevel}!**` : ''}`
    ), 'merchant');
  }

  // Trả lại — consume, rare equipment hoặc reputation
  removeItem(ctx.userId, ctx.guildId, 'knight_emblem', 1);
  const roll = randInt(1, 100);

  if (roll <= 55) {
    // Rare equipment
    const rarePool = ['iron_sword', 'knight_spear', 'arcane_wand', 'assassin_dagger', 'recurve_bow'];
    const reward = pick(rarePool);
    addItem(ctx.userId, ctx.guildId, reward, 1);
    const rep = adjustReputation(ctx.userId, ctx.guildId, 5);
    return finish(ctx, simpleEmbed(COLORS.success,
      `🏅 Sĩ quan tuần tra cúi đầu cảm ơn và trao cho bạn một vũ khí cũ của đội.\n${displayItem(reward)} đã thêm vào túi đồ.\n🤝 Reputation: **${rep}** (+5)\n🗑️ Knight Emblem đã trao trả.`
    ), 'merchant');
  } else {
    // Reputation +2
    const rep = adjustReputation(ctx.userId, ctx.guildId, 8);
    const gold = randInt(60, 120);
    grantGold(ctx.userId, ctx.guildId, gold);
    return finish(ctx, simpleEmbed(COLORS.success,
      `🏅 Đội trưởng tuần tra bắt tay bạn thật chặt và thưởng tiền.\n🪙 +**${gold} Gold**\n🤝 Reputation: **${rep}** (+8)\n🗑️ Knight Emblem đã trao trả.`
    ), 'merchant');
  }
}

async function showBardSongEvent(ctx: RunExploreEventInput): Promise<void> {
  const embed = new EmbedBuilder()
    .setColor(0xE67E22)
    .setTitle('🎵 Giai Điệu Vang Lên')
    .setDescription(
      '*Tờ ghi chép bài hát trong túi bạn — một giai điệu cũ của người bán hàng rong từng đi qua vùng này. Bạn đột nhiên cảm thấy muốn hát...*\n\n' +
      '**Hát theo** để cảm nhận sức mạnh bài hát — vũ khí bạn sẽ sáng lên!\n' +
      '**Ghi lại lời bài hát** và đổi tờ nhạc lấy vàng.'
    );
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`bard_sing_${ctx.userId}`).setLabel('Hát theo').setEmoji('🎵').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`bard_sell_${ctx.userId}`).setLabel('Ghi lại & bán').setEmoji('💰').setStyle(ButtonStyle.Secondary)
  );
  const cid = await awaitButton(ctx, row, embed, 'merchant');

  if (!cid || cid === `bard_sell_${ctx.userId}`) {
    // Consume, gold 50-150 + EXP
    removeItem(ctx.userId, ctx.guildId, 'bard_song', 1);
    const gold = randInt(50, 150);
    grantGold(ctx.userId, ctx.guildId, gold);
    const exp = 45;
    const lvResult = grantExp(ctx.userId, ctx.guildId, exp);
    return finish(ctx, simpleEmbed(COLORS.gold,
      `🎵 Bạn ghi lại lời bài hát và bán tờ nhạc cho quán trọ gần đây.\n🪙 +**${gold} Gold**\n⭐ +**${exp} EXP**${lvResult.leveledUp ? ` → **Level ${lvResult.newLevel}!**` : ''}\n🗑️ Bard Song đã sử dụng.`
    ), 'merchant');
  }

  // Hát theo — consume, weapon_oil buff charges=3 value=15
  removeItem(ctx.userId, ctx.guildId, 'bard_song', 1);
  setBuff(ctx.userId, ctx.guildId, 'weapon_oil', 15, 3, 7200);
  return finish(ctx, simpleEmbed(COLORS.success,
    `🎵 Bạn cất giọng hát — ánh sáng vàng nhẹ bao quanh vũ khí bạn!\n⚔️ **Weapon Oil** x3 lượt: +15% ATK trong 3 combat tiếp theo\n🗑️ Bard Song đã sử dụng.`
  ), 'merchant');
}
