import { CLASSES, getPassiveLine } from '../data/classes';
import { ITEMS } from '../data/items';
import { MATERIALS } from '../data/materials';
import { EQUIPMENT, SETS } from '../data/equipment';
import { SKILLS } from '../data/skills';
import { ENEMIES } from '../data/enemies';
import { ZONES } from '../data/zones';
import { PETS } from '../data/pets';
import { CRAFT_RECIPES } from '../data/recipes';
import { CHAPTER_EXPLORE_EVENTS } from '../data/chapterExploreEvents';
import { DATA_DRIVEN_EXPLORE_EVENTS } from '../data/exploreEventDefs';

export type GameIdCategory =
  | 'all'
  | 'items'
  | 'materials'
  | 'equipment'
  | 'weapons'
  | 'armor'
  | 'accessories'
  | 'skills'
  | 'enemies'
  | 'bosses'
  | 'zones'
  | 'classes'
  | 'pets'
  | 'recipes'
  | 'events'
  | 'chapter_events'
  | 'sets';

export type GameIdRow = {
  category: Exclude<GameIdCategory, 'all'>;
  id: string;
  name: string;
  icon?: string;
  extra?: string;
};

export type GameIdSection = {
  category: Exclude<GameIdCategory, 'all'>;
  label: string;
  rows: GameIdRow[];
};

export const GAME_ID_CATEGORY_LABELS: Record<GameIdCategory, string> = {
  all: 'Tất cả ID',
  items: 'Items',
  materials: 'Materials',
  equipment: 'Equipment',
  weapons: 'Weapons',
  armor: 'Armor',
  accessories: 'Accessories',
  skills: 'Skills',
  enemies: 'Enemies',
  bosses: 'Bosses',
  zones: 'Zones',
  classes: 'Classes',
  pets: 'Pets',
  recipes: 'Craft Recipes',
  events: 'Explore Events',
  chapter_events: 'Chapter Events',
  sets: 'Equipment Sets',
};

export const GAME_ID_CATEGORY_CHOICES: Array<{ name: string; value: GameIdCategory }> = [
  { name: '📦 Tất cả ID', value: 'all' },
  { name: '🎒 Items', value: 'items' },
  { name: '🧱 Materials', value: 'materials' },
  { name: '🛡️ Equipment', value: 'equipment' },
  { name: '⚔️ Weapons', value: 'weapons' },
  { name: '🥼 Armor', value: 'armor' },
  { name: '💍 Accessories', value: 'accessories' },
  { name: '📖 Skills', value: 'skills' },
  { name: '👾 Enemies', value: 'enemies' },
  { name: '👑 Bosses', value: 'bosses' },
  { name: '🗺️ Zones', value: 'zones' },
  { name: '🧙 Classes', value: 'classes' },
  { name: '🐾 Pets', value: 'pets' },
  { name: '🧰 Recipes', value: 'recipes' },
  { name: '🎲 Explore Events', value: 'events' },
  { name: '📜 Chapter Events', value: 'chapter_events' },
  { name: '✨ Equipment Sets', value: 'sets' },
];

// Code-driven explore event IDs. Data-driven events are appended from DATA_DRIVEN_EXPLORE_EVENTS below.
const CODE_DRIVEN_EXPLORE_EVENT_IDS = [
  'combat', 'ambush', 'legacy', 'merchant', 'gear_buyer', 'spring', 'trap',
  'altar', 'mysterious', 'villager', 'caravan', 'loot', 'soul_shop',
  'abandoned_camp', 'lost_pouch', 'rune_stone', 'treasure_chest', 'wandering_healer', 'spirit_trial',
  'blood_trail', 'nameless_grave', 'memory_seller', 'stranger_campfire', 'cracked_shrine', 'injured_monster',
  'wanted_merchant', 'bounty_hunter', 'rebirth_rift', 'failed_legacy', 'mirror_clone', 'talking_corpse',
  'black_eclipse', 'fate_coin', 'shrine_relic_event', 'forgotten_crown_event', 'flower_crown_event', 'knight_emblem_event',
  'bard_song_event', 'merchant_tax', 'merchant_guard', 'wanted_notice', 'shopkeeper_mercy', 'black_cat',
  'dice_gambler', 'glowing_mushroom', 'chained_prisoner', 'magic_fountain', 'laughing_bones', 'missing_child_chain',
  'black_market', 'atonement_monk', 'conditional_miniboss', 'fishing_spot', 'oak_hunt_start', 'mimic_chest',
  'wandering_blacksmith', 'temporary_arena', 'boss_tracks', 'map_seller', 'rep_honored_patrol', 'rep_grateful_villagers',
  'rep_supply_cache', 'rep_church_blessing', 'rep_young_squire', 'rep_hero_statue', 'rep_royal_messenger', 'rep_champion_challenge',
  'rep_forest_rangers', 'rep_shrine_pilgrims', 'rep_mine_rescue_crew', 'rep_wastes_refugees', 'rep_dawn_procession', 'rep_day_public_thanks',
  'rep_dusk_safe_lodging', 'rep_night_watch_signal', 'world_plague_spreads', 'world_bandit_coalition', 'world_convoy_attacked', 'world_magic_surge',
  'world_dark_omen', 'world_price_gouger', 'world_tax_collector', 'world_supply_shortage', 'world_merchant_guild_job', 'world_ancient_inscription',
  'world_spy_letter', 'world_missing_persons', 'world_old_chronicle', 'world_prophetic_vision', 'world_secret_meeting', 'world_faction_standoff',
  'world_church_inquisition', 'world_shadow_offer', 'world_hunters_mission', 'world_villager_dispute', 'forest_tree', 'forest_wolf_den',
  'forest_herbalist_hut', 'forest_moonlit_clearing', 'forest_bandit_ambush', 'forest_giant_spider', 'forest_cursed_scarecrow', 'forest_snake_pit',
  'forest_poacher_camp', 'forest_corrupted_treant', 'forest_wild_boar', 'forest_poison_spores', 'forest_rabid_fox', 'forest_bandit_watchtower',
  'forest_hollow_log', 'forest_buried_chest', 'forest_eagle_nest', 'forest_mushroom_ring', 'forest_amber_sap', 'forest_forgotten_pack',
  'forest_beehive', 'forest_fruit_grove', 'forest_silk_cocoon', 'forest_bog_pearl', 'forest_lost_merchant', 'forest_hermit_cave',
  'forest_wounded_knight', 'forest_fairy_circle', 'forest_pilgrim_group', 'forest_mad_trapper', 'forest_child_runaway', 'forest_dryad_blessing',
  'forest_traveling_bard', 'forest_beast_tamer', 'forest_ancient_ruins', 'forest_magic_spring', 'forest_stone_circle', 'forest_spirit_lantern',
  'forest_cursed_statue', 'forest_memory_tree', 'forest_dream_flower', 'forest_echo_grove', 'forest_time_anomaly', 'forest_lost_relic',
  'forest_herb_foraging', 'forest_animal_tracks', 'forest_river_crossing', 'forest_tree_climbing', 'forest_fog_maze', 'forest_waterfall_cave',
  'forest_dead_tree_oracle', 'forest_flower_field', 'forest_crow_messenger', 'forest_campfire_stranger', 'shrine_bell', 'shrine_prayer_beads',
  'shrine_seal_door', 'shrine_spirit_lamp', 'shrine_weeping_statue', 'shrine_forbidden_offering', 'shrine_sealed_reliquary', 'mine_collapse',
  'mine_ore_vein', 'mine_echo_tunnel', 'mine_rusted_lift', 'mine_runaway_cart', 'mine_living_ore', 'mine_trapped_miner',
  'wastes_storm', 'wastes_bone_caravan', 'wastes_glass_mirage', 'wastes_fallen_banner', 'wastes_mirror_self', 'wastes_memory_rain',
  'wastes_faceless_merchant', 'dawn_ritual', 'dawn_traveler', 'dawn_dew_blessing', 'dawn_hunter_tracks', 'noon_rest',
  'day_patrol', 'day_training_ground', 'day_supply_cart', 'dusk_trader', 'dusk_omen', 'dusk_crow_omen',
  'dusk_card_dealer', 'night_predator', 'midnight_wanderer', 'night_ghost_lantern', 'night_grave_robbers',
] as const;

function row(category: GameIdRow['category'], id: string, name: string, icon?: string, extra?: string): GameIdRow {
  return { category, id, name, icon, extra };
}

function uniqueRows(rows: GameIdRow[]): GameIdRow[] {
  const seen = new Set<string>();
  return rows.filter(r => {
    const key = `${r.category}:${r.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function sortedRows(rows: GameIdRow[]): GameIdRow[] {
  return uniqueRows(rows).sort((a, b) => a.id.localeCompare(b.id));
}

export function getGameIdSections(): GameIdSection[] {
  const equipmentRows = Object.values(EQUIPMENT).map(e =>
    row('equipment', e.id, e.name, e.icon, `${e.rarity} · ${e.slot}`)
  );

  const weaponRows = Object.values(EQUIPMENT)
    .filter(e => e.slot === 'weapon')
    .map(e => row('weapons', e.id, e.name, e.icon, `${e.rarity} · weapon`));

  const armorRows = Object.values(EQUIPMENT)
    .filter(e => e.slot === 'armor')
    .map(e => row('armor', e.id, e.name, e.icon, `${e.rarity} · armor`));

  const accessoryRows = Object.values(EQUIPMENT)
    .filter(e => e.slot === 'accessory1' || e.slot === 'accessory2')
    .map(e => row('accessories', e.id, e.name, e.icon, `${e.rarity} · ${e.slot}`));

  const enemyRows = Object.values(ENEMIES).map(e =>
    row('enemies', e.id, e.name, e.icon, `Lv.${e.level}${e.boss ? ' · boss' : ''}`)
  );

  const bossRows = Object.values(ENEMIES)
    .filter(e => e.boss)
    .map(e => row('bosses', e.id, e.name, e.icon, `Lv.${e.level}`));

  const eventRows = [
    ...CODE_DRIVEN_EXPLORE_EVENT_IDS.map(id => row('events', id, id, '🎲', 'code')),
    ...DATA_DRIVEN_EXPLORE_EVENTS.map(e => row('events', e.id, e.title, '🎲', `data · weight ${e.weight}`)),
  ];

  return [
    {
      category: 'items',
      label: GAME_ID_CATEGORY_LABELS.items,
      rows: sortedRows(Object.values(ITEMS).map(i => row('items', i.id, i.name, i.icon, i.type))),
    },
    {
      category: 'materials',
      label: GAME_ID_CATEGORY_LABELS.materials,
      rows: sortedRows(Object.values(MATERIALS).map(m => row('materials', m.id, m.name, m.icon, m.rarity))),
    },
    { category: 'equipment', label: GAME_ID_CATEGORY_LABELS.equipment, rows: sortedRows(equipmentRows) },
    { category: 'weapons', label: GAME_ID_CATEGORY_LABELS.weapons, rows: sortedRows(weaponRows) },
    { category: 'armor', label: GAME_ID_CATEGORY_LABELS.armor, rows: sortedRows(armorRows) },
    { category: 'accessories', label: GAME_ID_CATEGORY_LABELS.accessories, rows: sortedRows(accessoryRows) },
    {
      category: 'skills',
      label: GAME_ID_CATEGORY_LABELS.skills,
      rows: sortedRows(Object.values(SKILLS).map(s => row('skills', s.id, s.name, s.icon, s.type))),
    },
    { category: 'enemies', label: GAME_ID_CATEGORY_LABELS.enemies, rows: sortedRows(enemyRows) },
    { category: 'bosses', label: GAME_ID_CATEGORY_LABELS.bosses, rows: sortedRows(bossRows) },
    {
      category: 'zones',
      label: GAME_ID_CATEGORY_LABELS.zones,
      rows: sortedRows(Object.values(ZONES).map(z => row('zones', z.id, z.name, z.icon, `minLv ${z.minLevel}${z.safe ? ' · safe' : ''}`))),
    },
    {
      category: 'classes',
      label: GAME_ID_CATEGORY_LABELS.classes,
      rows: sortedRows(Object.values(CLASSES).map(c => row('classes', c.id, c.name, c.icon, getPassiveLine(c)))),
    },
    {
      category: 'pets',
      label: GAME_ID_CATEGORY_LABELS.pets,
      rows: sortedRows(Object.values(PETS).map(p => row('pets', p.id, p.name, p.icon, p.rarity))),
    },
    {
      category: 'recipes',
      label: GAME_ID_CATEGORY_LABELS.recipes,
      rows: sortedRows(CRAFT_RECIPES.map(r => row('recipes', r.id, r.resultItemId, '🧰', `${r.category} · Lv.${r.levelRequired}`))),
    },
    { category: 'events', label: GAME_ID_CATEGORY_LABELS.events, rows: sortedRows(eventRows) },
    {
      category: 'chapter_events',
      label: GAME_ID_CATEGORY_LABELS.chapter_events,
      rows: sortedRows(CHAPTER_EXPLORE_EVENTS.map(e => row('chapter_events', e.id, e.title, '📜', `chapter ${e.chapterId}`))),
    },
    {
      category: 'sets',
      label: GAME_ID_CATEGORY_LABELS.sets,
      rows: sortedRows(Object.values(SETS).map(s => row('sets', s.id, s.name, '✨', `${s.pieces.length} pieces`))),
    },
  ];
}

export function getGameIdSectionsFor(category: GameIdCategory): GameIdSection[] {
  const sections = getGameIdSections();
  if (category === 'all') return sections;
  return sections.filter(s => s.category === category);
}

export function filterGameIdSections(sections: GameIdSection[], search?: string | null): GameIdSection[] {
  const q = search?.trim().toLowerCase();
  if (!q) return sections;

  return sections
    .map(section => ({
      ...section,
      rows: section.rows.filter(r =>
        r.id.toLowerCase().includes(q) ||
        r.name.toLowerCase().includes(q) ||
        (r.extra?.toLowerCase().includes(q) ?? false)
      ),
    }))
    .filter(section => section.rows.length > 0);
}

export function countRows(sections: GameIdSection[]): number {
  return sections.reduce((sum, section) => sum + section.rows.length, 0);
}

export function formatGameIdLine(row: GameIdRow): string {
  const icon = row.icon ? `${row.icon} ` : '';
  const extra = row.extra ? ` — ${row.extra}` : '';
  return `${icon}${row.id} — ${row.name}${extra}`;
}

export function formatGameIdsText(category: GameIdCategory, search?: string | null): string {
  const sections = filterGameIdSections(getGameIdSectionsFor(category), search);
  const total = countRows(sections);
  const header = [
    'Butterfly Effect RPG — Game IDs',
    `Category: ${GAME_ID_CATEGORY_LABELS[category]}`,
    search?.trim() ? `Search: ${search.trim()}` : null,
    `Total: ${total}`,
    `Generated: ${new Date().toISOString()}`,
  ].filter(Boolean).join('\n');

  const body = sections.map(section => [
    '',
    `## ${section.label} (${section.rows.length})`,
    ...section.rows.map(formatGameIdLine),
  ].join('\n')).join('\n');

  return `${header}\n${body}\n`;
}

export function formatGameIdsPreview(category: GameIdCategory, search?: string | null, limitPerSection = 12): string {
  const sections = filterGameIdSections(getGameIdSectionsFor(category), search);
  if (!sections.length) return 'Không tìm thấy ID nào khớp.';

  const parts: string[] = [];
  for (const section of sections.slice(0, category === 'all' ? 6 : 1)) {
    const shown = section.rows.slice(0, limitPerSection);
    const more = section.rows.length > shown.length ? `\n… còn ${section.rows.length - shown.length} ID nữa trong file đính kèm` : '';
    parts.push(`**${section.label} (${section.rows.length})**\n${shown.map(r => `\`${r.id}\` — ${r.icon ?? ''} ${r.name}`).join('\n')}${more}`);
  }

  if (category === 'all' && sections.length > 6) {
    parts.push(`… còn ${sections.length - 6} nhóm nữa trong file đính kèm`);
  }

  return parts.join('\n\n').slice(0, 3800);
}
