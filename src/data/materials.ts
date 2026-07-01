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
  copper_ore: {
    id: 'copper_ore', name: 'Copper Ore', icon: '🟤', rarity: 'common',
    description: 'Quặng đồng mềm hơn sắt, dùng để rèn đồ cơ bản và linh kiện máy móc cũ.',
    sellPrice: 4, dropZones: ['mines'], dropChance: 28
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
    dropFrom: ['shrine_guardian', 'possessed_relic'], dropChance: 35
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
    dropFrom: ['shrine_watcher', 'candle_wraith'], dropChance: 15
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
    dropFrom: ['shrine_guardian', 'stone_guardian'], dropChance: 18
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
    dropFrom: ['wandering_spirit', 'candle_wraith'], dropChance: 45
  },
  holy_ash: {
    id: 'holy_ash', name: 'Holy Ash', icon: '⚱️', rarity: 'rare',
    description: 'Tro hương còn sót từ nghi lễ thanh tẩy trong Đền Cổ. Dùng để craft bùa và trang bị chống nguyền.',
    sellPrice: 34, dropZones: ['shrine'],
    dropFrom: ['candle_wraith', 'wraith_priest'], dropChance: 22
  },
  shrine_stone: {
    id: 'shrine_stone', name: 'Shrine Stone', icon: '🗿', rarity: 'rare',
    description: 'Mảnh đá khắc phù văn từ tượng hộ vệ cổ. Rất hợp để rèn giáp và giáo hộ vệ.',
    sellPrice: 38, dropZones: ['shrine'],
    dropFrom: ['stone_guardian', 'shrine_guardian'], dropChance: 25
  },
  mirror_shard: {
    id: 'mirror_shard', name: 'Mirror Shard', icon: '🪞', rarity: 'rare',
    description: 'Mảnh gương linh hồn phản chiếu một khuôn mặt không hoàn toàn giống bạn.',
    sellPrice: 42, dropZones: ['shrine'],
    dropFrom: ['mirror_shade', 'possessed_relic'], dropChance: 18
  },
  ancient_seal: {
    id: 'ancient_seal', name: 'Ancient Seal', icon: '🔏', rarity: 'epic',
    description: 'Mảnh phong ấn giữ Echo Demon trong đền. Dùng cho craft trang bị đền cổ cấp cao.',
    sellPrice: 125, dropZones: ['shrine'],
    dropFrom: ['echo_demon'], dropChance: 18
  },
  echo_core: {
    id: 'echo_core', name: 'Echo Core', icon: '🔮', rarity: 'epic',
    description: 'Lõi tiếng vọng lạnh buốt, vẫn lặp lại âm thanh cuối cùng trước khi boss gục xuống.',
    sellPrice: 135, dropZones: ['shrine'],
    dropFrom: ['echo_demon'], dropChance: 20
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
    description: 'Sừng quỷ vỡ ra từ Echo Demon. Đây là vật liệu chủ chốt của trang bị nguyền Zone 2.',
    sellPrice: 110, dropZones: ['shrine'],
    dropFrom: ['echo_demon'], dropChance: 22
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
  curse_shard: {
    id: 'curse_shard', name: 'Curse Shard', icon: '🔻', rarity: 'cursed',
    description: 'Mảnh nguyền lực dùng để nghiên cứu Ancient Book và mở khóa kỹ năng cổ.',
    sellPrice: 65, dropZones: ['shrine', 'wastes'],
    dropFrom: ['curse_bat', 'wraith_priest', 'echo_demon', 'the_forgotten'], dropChance: 10
  },


  cursed_blood: {
    id: 'cursed_blood', name: 'Cursed Blood', icon: '🩸', rarity: 'cursed',
    description: 'Máu nguyền rủa không thể rửa sạch. Có thể xuất hiện từ Echo Demon hoặc những thực thể hư không về sau.',
    sellPrice: 80, dropZones: ['shrine', 'wastes'],
    dropFrom: ['echo_demon', 'wraith_priest', 'the_forgotten'], dropChance: 10
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
    description: 'Con dấu nứt vỡ của Echo Demon. Dùng để craft và mở nhánh trang bị Đền Cổ.',
    sellPrice: 100, dropZones: ['shrine'],
    dropFrom: ['echo_demon'], dropChance: 60
  },

  dark_essence: {
    id: 'dark_essence', name: 'Dark Essence', icon: '🖤', rarity: 'rare',
    description: 'Tinh chất bóng tối cô đặc, thường còn sót lại trong các vết nứt thời gian và nghi lễ hư không.',
    sellPrice: 70, dropZones: ['shrine', 'wastes'], dropChance: 6
  },
  legacy_spark: {
    id: 'legacy_spark', name: 'Legacy Spark', icon: '✨', rarity: 'epic',
    description: 'Tia lửa di sản dùng ở Lò Rèn Ashveil để thức tỉnh hoặc khóa sức mạnh của trang bị.',
    sellPrice: 160, dropZones: ['shrine', 'wastes'], dropChance: 3
  },
  mysterious_shard: {
    id: 'mysterious_shard', name: 'Mysterious Shard', icon: '💎', rarity: 'rare',
    description: 'Mảnh tinh thể lạ phản chiếu ký ức và ánh trăng. Dùng cho event/craft đặc biệt.',
    sellPrice: 45, dropZones: ['forest', 'wastes'], dropChance: 8
  },
  ash_crystal: {
    id: 'ash_crystal', name: 'Ash Crystal', icon: '🔴', rarity: 'rare',
    description: 'Tinh thể đỏ kết lại trong bão tro nóng. Vật liệu hiếm của Hoang Nguyên.',
    sellPrice: 55, dropZones: ['wastes'], dropChance: 7
  },

  // ── Forest zone materials ───────────────────────────────────────────────
  spider_silk: {
    id: 'spider_silk', name: 'Spider Silk', icon: '🕸️', rarity: 'common',
    description: 'Tơ nhện rừng, dẻo và dai. Dùng để craft đồ may mặc và bẫy.',
    sellPrice: 8, dropZones: ['forest'], dropChance: 20
  },
  eagle_feather: {
    id: 'eagle_feather', name: 'Eagle Feather', icon: '🪶', rarity: 'rare',
    description: 'Lông đại bàng lấy từ tổ trên cây cao. Nhẹ và sắc bén.',
    sellPrice: 30, dropZones: ['forest'], dropChance: 10
  },
  beeswax: {
    id: 'beeswax', name: 'Beeswax', icon: '🕯️', rarity: 'common',
    description: 'Sáp ong rừng. Dùng để craft nến, thuốc bôi và đồ thủ công.',
    sellPrice: 7, dropZones: ['forest'], dropChance: 15
  },
  dream_petal: {
    id: 'dream_petal', name: 'Dream Petal', icon: '🌸', rarity: 'rare',
    description: 'Cánh hoa giấc mộng chỉ nở vào ban đêm, tỏa hương thôi miên nhẹ.',
    sellPrice: 35, dropZones: ['forest'], dropChance: 8
  },
  poison_venom: {
    id: 'poison_venom', name: 'Poison Venom', icon: '☠️', rarity: 'rare',
    description: 'Nọc độc thu thập từ rắn rừng và cáo điên. Nguyên liệu craft độc tố.',
    sellPrice: 25, dropZones: ['forest'], dropChance: 12
  },
  amber_sap: {
    id: 'amber_sap', name: 'Amber Sap', icon: '🟡', rarity: 'rare',
    description: 'Nhựa hổ phách từ cây cổ thụ, cứng lại theo thời gian. Đôi khi chứa vật cổ đại bên trong.',
    sellPrice: 40, dropZones: ['forest'], dropChance: 7
  },
  bog_pearl: {
    id: 'bog_pearl', name: 'Bog Pearl', icon: '🔮', rarity: 'rare',
    description: 'Viên ngọc hình thành trong đầm lầy rừng sâu, mang năng lượng tối của nước đen.',
    sellPrice: 50, dropZones: ['forest'], dropChance: 6
  },
  spirit_essence: {
    id: 'spirit_essence', name: 'Spirit Essence', icon: '✨', rarity: 'epic',
    description: 'Tinh chất thu từ đèn ma trơi và linh hồn rừng. Rực sáng khi đêm về.',
    sellPrice: 90, dropZones: ['forest'], dropChance: 4
  },
  time_fragment: {
    id: 'time_fragment', name: 'Time Fragment', icon: '⌛', rarity: 'epic',
    description: 'Mảnh vỡ của thời gian thu được từ dị thường không gian. Không rõ nguồn gốc.',
    sellPrice: 150, dropZones: ['forest'], dropChance: 2
  },
  rune_stone: {
    id: 'rune_stone', name: 'Rune Stone', icon: '🔮', rarity: 'rare',
    description: 'Viên đá khắc ký tự ma thuật mờ nhạt. Thường xuất hiện trong các sự kiện kỳ bí của rừng.',
    sellPrice: 35, dropZones: ['forest', 'shrine'], dropChance: 6
  },
  ancient_rune: {
    id: 'ancient_rune', name: 'Ancient Rune', icon: '📜', rarity: 'epic',
    description: 'Rune cổ đại từ thời trước khi chữ viết tồn tại. Ký hiệu khắc trên đây vẫn còn hiệu lực.',
    sellPrice: 120, dropZones: ['forest', 'shrine'], dropChance: 3
  },

  thornfang_fang: {
    id: 'thornfang_fang', name: 'Thornfang Fang', icon: '🦷', rarity: 'epic',
    description: 'Nanh của Thornfang, Alpha of the Wilds. Còn vương mùi máu và nhựa gai đen.',
    sellPrice: 110, dropZones: ['forest'],
    dropFrom: ['alpha_thornmaw'], dropChance: 100
  },
  grove_crown_fragment: {
    id: 'grove_crown_fragment', name: 'Grove Crown Fragment', icon: '🌿', rarity: 'epic',
    description: 'Mảnh vương miện rễ cây của Elarok. Nó rung nhẹ khi ở gần Ancient Oak.',
    sellPrice: 115, dropZones: ['forest'],
    dropFrom: ['moss_crowned_stag'], dropChance: 100
  },

  // ── Pet release items ────────────────────────────────────────────────────
  shadow_shard: {
    id: 'shadow_shard', name: 'Shadow Shard', icon: '🌑', rarity: 'rare',
    description: 'Mảnh bóng tối còn lại khi Shadow Cat được thả tự do.',
    sellPrice: 55, dropZones: [], dropChance: 0
  },
  fire_essence: {
    id: 'fire_essence', name: 'Fire Essence', icon: '🔥', rarity: 'epic',
    description: 'Tinh chất lửa thoát ra khi Fire Lizard rời đi.',
    sellPrice: 90, dropZones: [], dropChance: 0
  },
  thunder_feather: {
    id: 'thunder_feather', name: 'Thunder Feather', icon: '⚡', rarity: 'epic',
    description: 'Lông vũ tích điện rơi lại khi Storm Eagle được giải phóng.',
    sellPrice: 85, dropZones: [], dropChance: 0
  },
  lucky_coin: {
    id: 'lucky_coin', name: 'Lucky Coin', icon: '🪙', rarity: 'epic',
    description: 'Đồng xu mang vận may của Gold Fox. Bán được giá cao.',
    sellPrice: 100, dropZones: [], dropChance: 0
  },
  stardust: {
    id: 'stardust', name: 'Stardust', icon: '✨', rarity: 'legendary',
    description: 'Bụi tinh tú còn lại khi Celestial Sprite trở về bầu trời.',
    sellPrice: 200, dropZones: [], dropChance: 0
  },

};

export function getMaterial(id: string): MaterialDef | undefined {
  return MATERIALS[id];
}

/** Materials available in a specific zone */
export function getMaterialsForZone(zoneId: string): MaterialDef[] {
  return Object.values(MATERIALS).filter(m => m.dropZones.includes(zoneId));
}
