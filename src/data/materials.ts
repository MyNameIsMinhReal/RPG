export type MaterialRarity = 'common' | 'rare' | 'epic' | 'legendary' | 'cursed';

export interface MaterialDef {
  id:          string;
  name:        string;
  icon:        string;
  rarity:      MaterialRarity;
  description: string;
  sellPrice:   number;
  dropZones:   string[];   // zone IDs where this drops
  dropFrom?:   string[];   // specific enemy IDs
  dropChance?: number;
}

export const MATERIALS: Record<string, MaterialDef> = {

  // ── Common ─────────────────────────────────────────────────────────────
  wood: {
    id: 'wood', name: 'Wood', icon: '🪵', rarity: 'common',
    description: 'Gỗ đơn giản từ rừng.',
    sellPrice: 3, dropZones: ['forest'], dropChance: 35
  },
  stone: {
    id: 'stone', name: 'Stone', icon: '🪨', rarity: 'common',
    description: 'Đá thường dùng để rèn.',
    sellPrice: 2, dropZones: ['mines'], dropChance: 35
  },
  iron_ore: {
    id: 'iron_ore', name: 'Iron Ore', icon: '⬛', rarity: 'common',
    description: 'Quặng sắt dùng để rèn vũ khí và giáp.',
    sellPrice: 5, dropZones: ['mines'], dropChance: 30
  },
  leather: {
    id: 'leather', name: 'Leather', icon: '🟫', rarity: 'common',
    description: 'Da thuộc từ quái vật rừng.',
    sellPrice: 4, dropZones: ['forest'],
    dropFrom: ['cursed_wolf', 'vine_golem'], dropChance: 30
  },
  healing_herb: {
    id: 'healing_herb', name: 'Healing Herb', icon: '🌿', rarity: 'common',
    description: 'Thảo dược chữa lành, dùng để chế tạo potion.',
    sellPrice: 4, dropZones: ['village', 'forest'], dropChance: 35
  },
  slime_core: {
    id: 'slime_core', name: 'Slime Core', icon: '💚', rarity: 'common',
    description: 'Nhân của slime, dính và kỳ lạ.',
    sellPrice: 3, dropZones: ['forest'], dropChance: 25
  },
  wolf_fang: {
    id: 'wolf_fang', name: 'Wolf Fang', icon: '🦷', rarity: 'common',
    description: 'Nanh sói nguyền rủa.',
    sellPrice: 6, dropZones: ['forest'],
    dropFrom: ['cursed_wolf'], dropChance: 50
  },
  bone_shard: {
    id: 'bone_shard', name: 'Bone Shard', icon: '🦴', rarity: 'common',
    description: 'Mảnh xương từ chiến binh đã khuất.',
    sellPrice: 5, dropZones: ['shrine'],
    dropFrom: ['skeleton_archer'], dropChance: 55
  },

  // ── Rare ───────────────────────────────────────────────────────────────
  silver_ore: {
    id: 'silver_ore', name: 'Silver Ore', icon: '🪙', rarity: 'rare',
    description: 'Quặng bạc tinh khiết, dùng cho trang bị phép.',
    sellPrice: 20, dropZones: ['mines', 'shrine'],
    dropFrom: ['cave_troll', 'shrine_guardian'], dropChance: 15
  },
  mana_crystal: {
    id: 'mana_crystal', name: 'Mana Crystal', icon: '🔷', rarity: 'rare',
    description: 'Tinh thể chứa ma lực dồi dào.',
    sellPrice: 25, dropZones: ['shrine'],
    dropFrom: ['phantom', 'shrine_guardian'], dropChance: 15
  },
  shadow_essence: {
    id: 'shadow_essence', name: 'Shadow Essence', icon: '🌑', rarity: 'rare',
    description: 'Tinh chất bóng tối từ sinh vật ẩn trong bóng.',
    sellPrice: 30, dropZones: ['mines'],
    dropFrom: ['shadow_bat', 'phantom'], dropChance: 20
  },
  ancient_bone: {
    id: 'ancient_bone', name: 'Ancient Bone', icon: '💀', rarity: 'rare',
    description: 'Xương cổ đại, cứng như kim loại.',
    sellPrice: 25, dropZones: ['shrine'],
    dropFrom: ['skeleton_archer', 'shrine_guardian'], dropChance: 15
  },
  burning_core: {
    id: 'burning_core', name: 'Burning Core', icon: '🔥', rarity: 'rare',
    description: 'Lõi lửa không bao giờ tắt từ hang động núi lửa.',
    sellPrice: 35, dropZones: ['mines'],
    dropFrom: ['cave_troll', 'mine_colossus'], dropChance: 12
  },
  frost_shard: {
    id: 'frost_shard', name: 'Frost Shard', icon: '❄️', rarity: 'rare',
    description: 'Mảnh băng vĩnh cửu, lạnh đến mức bỏng rát.',
    sellPrice: 30, dropZones: ['shrine', 'mines'],
    dropFrom: ['phantom'], dropChance: 12
  },
  ectoplasm: {
    id: 'ectoplasm', name: 'Ectoplasm', icon: '🫧', rarity: 'rare',
    description: 'Tinh chất linh hồn.',
    sellPrice: 30, dropZones: ['shrine'],
    dropFrom: ['phantom'], dropChance: 60
  },
  troll_hide: {
    id: 'troll_hide', name: 'Troll Hide', icon: '🧱', rarity: 'rare',
    description: 'Da troll cứng như đá.',
    sellPrice: 40, dropZones: ['mines'],
    dropFrom: ['cave_troll'], dropChance: 50
  },

  // ── Epic / Boss ────────────────────────────────────────────────────────
  dragon_scale: {
    id: 'dragon_scale', name: 'Dragon Scale', icon: '🐉', rarity: 'epic',
    description: 'Vảy rồng cổ đại, nguyên liệu quý cho trang bị cấp cao.',
    sellPrice: 100, dropZones: ['wastes'],
    dropFrom: ['mine_colossus'], dropChance: 10
  },
  dragon_heart_fragment: {
    id: 'dragon_heart_fragment', name: 'Dragon Heart Fragment', icon: '❤️‍🔥', rarity: 'epic',
    description: 'Mảnh tim rồng, vẫn còn đập.',
    sellPrice: 120, dropZones: ['wastes'],
    dropFrom: ['mine_colossus'], dropChance: 8
  },
  demon_horn: {
    id: 'demon_horn', name: 'Demon Horn', icon: '😈', rarity: 'epic',
    description: 'Sừng quỷ, thấm đẫm năng lượng hắc ám.',
    sellPrice: 110, dropZones: ['wastes'],
    dropFrom: ['echo_demon'], dropChance: 12
  },
  abyss_core: {
    id: 'abyss_core', name: 'Abyss Core', icon: '⚫', rarity: 'epic',
    description: 'Lõi từ vực thẳm hư không.',
    sellPrice: 130, dropZones: ['wastes'],
    dropFrom: ['void_wraith', 'the_forgotten'], dropChance: 8
  },
  fallen_star_fragment: {
    id: 'fallen_star_fragment', name: 'Fallen Star Fragment', icon: '⭐', rarity: 'epic',
    description: 'Mảnh thiên thạch rơi xuống từ cõi trên.',
    sellPrice: 150, dropZones: ['wastes'],
    dropFrom: ['the_forgotten'], dropChance: 6
  },
  ancient_relic: {
    id: 'ancient_relic', name: 'Ancient Relic', icon: '⚱️', rarity: 'epic',
    description: 'Tàn tích từ nền văn minh cổ đại.',
    sellPrice: 140, dropZones: ['shrine', 'wastes'],
    dropFrom: ['shrine_guardian', 'the_forgotten'], dropChance: 8
  },
  void_essence: {
    id: 'void_essence', name: 'Void Essence', icon: '🌀', rarity: 'epic',
    description: 'Tinh chất từ hư không.',
    sellPrice: 80, dropZones: ['wastes'],
    dropFrom: ['void_wraith'], dropChance: 50
  },
  dark_wing: {
    id: 'dark_wing', name: 'Dark Wing', icon: '🖤', rarity: 'rare',
    description: 'Cánh dơi bóng tối.',
    sellPrice: 45, dropZones: ['mines'],
    dropFrom: ['shadow_bat'], dropChance: 55
  },
  colossus_core: {
    id: 'colossus_core', name: 'Colossus Core', icon: '💎', rarity: 'epic',
    description: 'Lõi của Mine Colossus.',
    sellPrice: 350, dropZones: ['mines'],
    dropFrom: ['mine_colossus'], dropChance: 25
  },

  // ── Cursed ─────────────────────────────────────────────────────────────
  cursed_blood: {
    id: 'cursed_blood', name: 'Cursed Blood', icon: '🩸', rarity: 'cursed',
    description: 'Máu nguyền rủa không thể rửa sạch.',
    sellPrice: 80, dropZones: ['wastes'],
    dropFrom: ['echo_demon', 'the_forgotten'], dropChance: 8
  },
  broken_soul: {
    id: 'broken_soul', name: 'Broken Soul', icon: '💔', rarity: 'cursed',
    description: 'Linh hồn vỡ vụn — có thể cảm nhận được sự đau đớn.',
    sellPrice: 90, dropZones: ['wastes'],
    dropFrom: ['void_wraith', 'the_forgotten'], dropChance: 6
  },
  void_fragment: {
    id: 'void_fragment', name: 'Void Fragment', icon: '🌑', rarity: 'cursed',
    description: 'Mảnh vỡ của thực tại bị hư không nghiền nát.',
    sellPrice: 100, dropZones: ['wastes'],
    dropFrom: ['the_forgotten'], dropChance: 5
  },
  black_iron: {
    id: 'black_iron', name: 'Black Iron', icon: '⚫', rarity: 'cursed',
    description: 'Sắt đen hấp thụ ánh sáng và may mắn.',
    sellPrice: 85, dropZones: ['wastes', 'mines'],
    dropFrom: ['shadow_bat', 'void_wraith'], dropChance: 8
  },
  lost_memory: {
    id: 'lost_memory', name: 'Lost Memory', icon: '🫥', rarity: 'cursed',
    description: 'Ký ức của ai đó bị lãng quên hoàn toàn.',
    sellPrice: 120, dropZones: ['wastes'],
    dropFrom: ['the_forgotten'], dropChance: 5
  },
  demon_seal: {
    id: 'demon_seal', name: 'Demon Seal', icon: '🔮', rarity: 'epic',
    description: 'Con dấu của Echo Demon.',
    sellPrice: 100, dropZones: ['wastes'],
    dropFrom: ['echo_demon'], dropChance: 45
  },
};

export function getMaterial(id: string): MaterialDef | undefined {
  return MATERIALS[id];
}

/** Materials available in a specific zone */
export function getMaterialsForZone(zoneId: string): MaterialDef[] {
  return Object.values(MATERIALS).filter(m => m.dropZones.includes(zoneId));
}
