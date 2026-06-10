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
    enemyIds: [], shopItems: ['bread', 'minor_healing_potion', 'health_potion', 'mana_potion', 'quick_salve', 'focus_tonic', 'ancient_book'],
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
    shopItems: ['health_potion', 'mana_potion', 'antidote', 'cooling_salve', 'forest_tonic', 'quick_salve', 'ancient_book'],
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
    id: 'shrine', name: 'Đền Cổ Hoang Phế', icon: '⛩️',
    description: 'Ngôi đền ngàn năm bị bỏ hoang. Linh hồn của những tín đồ cũ vẫn còn đây.',
    minLevel: 3, safe: false, travelCost: 20,
    enemyIds: ['skeleton_archer', 'phantom', 'bone_mage', 'spirit_knight', 'cursed_idol', 'ash_acolyte', 'grave_hound', 'bell_specter', 'scripture_mimic', 'pale_confessor', 'bell_wraith'],
    bossId: 'shrine_guardian',
    shopItems: ['health_potion', 'mana_potion', 'holy_water', 'purifying_salt', 'moonwater', 'warding_charm', 'ancient_book'],
    color: 0xE67E22,
    ambiance: [
      'Ngọn đèn thắp sáng không ai thắp lên.',
      'Tiếng chuông vọng lại dù không có chuông.',
      'Cảm giác bị theo dõi không dứt.',
      'Những chữ khắc trên đá bỗng dưng phát sáng.',
      'Hương trầm tỏa ra từ đâu đó rất sâu trong đền.'
    ]
  },
  mines: {
    id: 'mines', name: 'Hầm Mỏ Bị Nguyền', icon: '⛏️',
    description: 'Hầm mỏ bị phong tỏa hàng thế kỷ. Ánh sáng không chạm đến đây.',
    minLevel: 5, safe: false, travelCost: 50,
    enemyIds: ['cave_troll', 'shadow_bat', 'lava_crab', 'crystal_spider', 'iron_sentinel', 'coal_imp', 'ore_devourer', 'soot_harpy', 'molten_jailer', 'slag_brute', 'rustbound_foreman'],
    bossId: 'mine_colossus',
    shopItems: ['health_potion', 'mana_flask', 'elixir', 'greater_health_potion', 'iron_will_tonic', 'vitality_brew', 'ancient_book'],
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
    enemyIds: ['void_wraith', 'echo_demon', 'mirage_hunter', 'mind_leech', 'abyss_fiend', 'glass_serpent', 'memory_moth', 'void_hound', 'dust_prophet', 'eclipse_reaver', 'mirror_knight'],
    bossId: 'the_forgotten',
    shopItems: ['elixir', 'grand_restoration', 'supreme_elixir', 'void_mana_flask', 'purification_potion', 'berserker_draught', 'ancient_book'],
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
