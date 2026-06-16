export interface ZoneDef {
  id: string;
  name: string;
  icon: string;
  description: string;
  minLevel: number;
  safe: boolean;
  travelCost: number;      // gold cost to travel here from previous zone
  enemyIds: string[];
  bossId?: string;
  shopItems: string[];     // items available in zone shop
  color: number;           // embed color (hex)
  ambiance: string[];      // random flavor text for explore
}

export const ZONES: Record<string, ZoneDef> = {
  village: {
    id: 'village', name: 'Làng Ashveil', icon: '🏘️',
    description: 'Ngôi làng nhỏ yên bình, nơi mọi hành trình bắt đầu. Người ta nói rừng phía đông đang thay đổi...',
    minLevel: 0, safe: true, travelCost: 0,
    enemyIds: [], shopItems: ['bread', 'torch', 'minor_healing_potion', 'health_potion', 'mana_potion', 'quick_salve', 'weapon_oil', 'armor_polish', 'scroll_detection', 'smoke_bomb', 'ancient_book'],
    color: 0x57F287,
    ambiance: [
      'Gió thổi nhẹ qua những mái nhà tranh.',
      'Tiếng búa đập sắt vang lên từ lò rèn.',
      'Những đứa trẻ chạy đùa trong sân làng.',
      'Mùi bánh mì nướng bay từ nhà hàng xóm.'
    ]
  },
  forest: {
    id: 'forest', name: 'Rừng Bóng Tối', icon: '🌲',
    description: 'Khu rừng cổ kính bị bóng tối bao phủ. Những sinh vật kỳ lạ ẩn nấp trong bụi cây.',
    minLevel: 1, safe: false, travelCost: 0,
    enemyIds: ['forest_sprite', 'cursed_wolf', 'vine_golem', 'moss_lurker', 'thornhound', 'cursed_treant', 'will_o_wisp', 'ember_bloom', 'hollow_stag', 'spore_kin', 'briar_witch', 'alpha_thornmaw', 'moss_crowned_stag'],
    bossId: 'ancient_oak',
    shopItems: ['forest_fruit', 'honey', 'health_potion', 'mana_potion', 'antidote', 'cooling_salve', 'forest_tonic', 'bone_broth', 'quickstep_tea', 'scroll_escape', 'smoke_bomb', 'ancient_book'],
    color: 0x2ECC71,
    ambiance: [
      'Những cành cây xào xạc trong bóng tối.',
      'Tiếng hú xa xa vọng lại — là sói hay thứ khác?',
      'Mắt đỏ lóe sáng trong bụi rậm rồi biến mất.',
      'Vết chân kỳ lạ in trên mặt đất ẩm.',
      'Không khí nặng nề, ngột ngạt không thể giải thích.'
    ]
  },
  shrine: {
    id: 'shrine', name: 'Đền Cổ Bị Lãng Quên', icon: '⛩️',
    description: 'Tàn tích ngàn năm nằm sau Rừng Bóng Tối. Bẫy cổ, linh hồn canh đền và Ô Nhiễm Linh Hồn khiến mỗi bước đi đều có giá.',
    minLevel: 3, safe: false, travelCost: 20,
    enemyIds: ['wandering_spirit', 'stone_guardian', 'curse_bat', 'candle_wraith', 'shrine_watcher', 'possessed_relic', 'shrine_guardian', 'wraith_priest', 'mirror_shade'],
    bossId: 'echo_demon',
    shopItems: ['health_potion', 'mana_flask', 'holy_water', 'purifying_salt', 'moonwater', 'warding_charm', 'scroll_silence', 'scroll_mirror', 'purification_stone', 'ancient_book'],
    color: 0x8A2BE2,
    ambiance: [
      'Hàng nến xanh cháy không cần bấc, ánh lửa nghiêng về phía người sống.',
      'Tiếng chuông không âm vang lên trong xương, như gọi tên một tội lỗi cũ.',
      'Bóng bạn kéo dài ngược hướng ánh sáng rồi chậm rãi đứng thẳng.',
      'Những phù văn trên nền đá sáng lên khi bạn bước qua.',
      'Mùi hương trầm lạnh lẽo bám vào phổi, kéo theo lời thì thầm của người đã khuất.'
    ]
  },
  mines: {
    id: 'mines', name: 'Hầm Mỏ Bị Nguyền', icon: '⛏️',
    description: 'Hầm mỏ bị phong tỏa hàng thế kỷ. Ánh sáng không chạm đến đây.',
    minLevel: 5, safe: false, travelCost: 50,
    enemyIds: ['cave_troll', 'shadow_bat', 'lava_crab', 'crystal_spider', 'iron_sentinel', 'coal_imp', 'ore_devourer', 'soot_harpy', 'molten_jailer', 'slag_brute', 'rustbound_foreman'],
    bossId: 'mine_colossus',
    shopItems: ['health_potion', 'mana_flask', 'vitality_brew', 'elixir', 'greater_health_potion', 'iron_will_tonic', 'blood_sacrifice_vial', 'arson_bottle', 'ancient_book'],
    color: 0x95A5A6,
    ambiance: [
      'Tiếng nước nhỏ giọt vọng khắp hang.',
      'Bóng tối hoàn toàn — đuốc không đủ sáng.',
      'Rung động nhẹ từ sâu bên dưới.',
      'Tiếng gào thét xa xa, không biết của gì.',
      'Không khí lạnh giá như trong hầm mộ.'
    ]
  },
  wastes: {
    id: 'wastes', name: 'Hoang Nguyên Tiếng Vọng', icon: '🌌',
    description: 'Nơi thực tại bị bóng tối ăn mòn. Chỉ những kẻ mạnh nhất mới đến được đây.',
    minLevel: 8, safe: false, travelCost: 100,
    enemyIds: ['void_wraith', 'abyss_watcher', 'mirage_hunter', 'mind_leech', 'abyss_fiend', 'glass_serpent', 'memory_moth', 'void_hound', 'dust_prophet', 'eclipse_reaver', 'mirror_knight'],
    bossId: 'the_forgotten',
    shopItems: ['elixir', 'grand_restoration', 'supreme_elixir', 'void_mana_flask', 'purification_potion', 'crystallized_faith', 'berserker_draught', 'life_crystal_shard', 'rage_elixir', 'ancient_book'],
    color: 0x9B59B6,
    ambiance: [
      'Tiếng vọng của chính mình từ tương lai.',
      'Thực tại méo mó — trái, phải không còn nghĩa.',
      'Hình bóng mờ ảo — là kẻ thù hay ảo giác?',
      'Cảm giác đã từng ở đây dù chưa bao giờ đặt chân.',
      'Tiếng thì thầm không có nguồn gốc, mọi hướng.'
    ]
  }
};

export const ZONE_ORDER = ['village', 'forest', 'shrine', 'mines', 'wastes'];

export function getZone(id: string): ZoneDef | undefined {
  return ZONES[id];
}

export function getNextZone(currentId: string): ZoneDef | undefined {
  const idx = ZONE_ORDER.indexOf(currentId);
  if (idx < 0 || idx >= ZONE_ORDER.length - 1) return undefined;
  return ZONES[ZONE_ORDER[idx + 1]];
}
