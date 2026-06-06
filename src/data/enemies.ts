export interface DropEntry {
  itemId: string;
  chance: number; // 0-100
}

export interface EnemyDef {
  id: string;
  name: string;
  icon: string;
  level: number;
  hp: number;
  atk: number;
  def: number;
  expReward: number;
  goldMin: number;
  goldMax: number;
  drops: DropEntry[];
  specialAttacks: string[];
  zones: string[];
  boss?: boolean;
  deathWorldFlag?: string;
  lore: string;
}

export const ENEMIES: Record<string, EnemyDef> = {
  // ── FOREST ──────────────────────────────────────────────────────
  forest_sprite: {
    id: 'forest_sprite', name: 'Forest Sprite', icon: '🧚', level: 1,
    hp: 40, atk: 8, def: 3, expReward: 20, goldMin: 5, goldMax: 15,
    drops: [{ itemId: 'healing_herb', chance: 45 }, { itemId: 'slime_core', chance: 30 }, { itemId: 'wood', chance: 40 }, { itemId: 'book_fireball', chance: 5 }],
    specialAttacks: ['petal_storm'],
    zones: ['forest'],
    lore: 'Một tinh linh rừng nhỏ bị nhiễm độc bởi bóng tối.'
  },
  cursed_wolf: {
    id: 'cursed_wolf', name: 'Cursed Wolf', icon: '🐺', level: 2,
    hp: 65, atk: 14, def: 5, expReward: 40, goldMin: 10, goldMax: 25,
    drops: [{ itemId: 'wolf_fang', chance: 55 }, { itemId: 'leather', chance: 45 }, { itemId: 'book_berserker', chance: 8 }],
    specialAttacks: ['double_bite', 'howl'],
    zones: ['forest'],
    lore: 'Bị lời nguyền biến thành quái vật, đôi mắt đỏ rực bùng cháy.'
  },
  vine_golem: {
    id: 'vine_golem', name: 'Vine Golem', icon: '🌿', level: 3,
    hp: 90, atk: 16, def: 12, expReward: 65, goldMin: 20, goldMax: 40,
    drops: [{ itemId: 'ancient_bark', chance: 45 }, { itemId: 'wood', chance: 50 }, { itemId: 'stone', chance: 30 }, { itemId: 'book_iron_skin', chance: 10 }],
    specialAttacks: ['entangle'],
    zones: ['forest'],
    lore: 'Cây cổ thụ ngàn năm bị hồn ma chiếm đóng, rễ cây trở thành nanh vuốt.'
  },
  moss_lurker: {
    id: 'moss_lurker', name: 'Moss Lurker', icon: '🌱', level: 2,
    hp: 55, atk: 12, def: 4, expReward: 35, goldMin: 8, goldMax: 20,
    drops: [{ itemId: 'healing_herb', chance: 50 }, { itemId: 'slime_core', chance: 35 }, { itemId: 'wood', chance: 30 }],
    specialAttacks: ['toxic_spores', 'ambush'],
    zones: ['forest'],
    lore: 'Sinh vật rêu ẩn nấp trong bóng tối, chờ đợi để tấn công bất ngờ.'
  },
  thornhound: {
    id: 'thornhound', name: 'Thornhound', icon: '🐾', level: 3,
    hp: 70, atk: 17, def: 6, expReward: 55, goldMin: 12, goldMax: 28,
    drops: [{ itemId: 'leather', chance: 50 }, { itemId: 'wolf_fang', chance: 35 }, { itemId: 'healing_herb', chance: 25 }],
    specialAttacks: ['savage_bite', 'frenzy'],
    zones: ['forest'],
    lore: 'Chó rừng mọc gai từ da thịt, mỗi cú cắn để lại vết thương sâu.'
  },
  cursed_treant: {
    id: 'cursed_treant', name: 'Cursed Treant', icon: '🌲', level: 4,
    hp: 100, atk: 15, def: 14, expReward: 75, goldMin: 18, goldMax: 38,
    drops: [{ itemId: 'ancient_bark', chance: 50 }, { itemId: 'wood', chance: 60 }, { itemId: 'healing_herb', chance: 20 }],
    specialAttacks: ['thorn_lash', 'bark_regen'],
    zones: ['forest'],
    lore: 'Cây cổ thụ bị nguyền rủa, không thể chết nhưng cũng không thể sống.'
  },
  will_o_wisp: {
    id: 'will_o_wisp', name: "Will-o'-Wisp", icon: '🔵', level: 2,
    hp: 45, atk: 14, def: 3, expReward: 38, goldMin: 6, goldMax: 18,
    drops: [{ itemId: 'mana_crystal', chance: 40 }, { itemId: 'ectoplasm', chance: 30 }],
    specialAttacks: ['soul_flicker', 'bewitch'],
    zones: ['forest'],
    lore: 'Đốm lửa ma quái dẫn đường lạc, hút cạn linh hồn kẻ theo đuổi.'
  },
  ancient_oak: {
    id: 'ancient_oak', name: 'Ancient Oak', icon: '🌳', level: 5,
    hp: 200, atk: 22, def: 15, expReward: 200, goldMin: 80, goldMax: 120,
    drops: [
      { itemId: 'book_tough_body', chance: 40 },
      { itemId: 'book_mend_wounds', chance: 30 },
      { itemId: 'elixir', chance: 20 },
      { itemId: 'ancient_relic', chance: 15 },
      { itemId: 'wood', chance: 80 }
    ],
    specialAttacks: ['root_slam', 'nature_regeneration'],
    zones: ['forest'], boss: true,
    deathWorldFlag: 'ancient_oak_slain',
    lore: 'Linh hồn thủ hộ của rừng già. Nếu hắn ngã xuống, rừng sẽ không bao giờ như xưa.'
  },

  // ── SHRINE ──────────────────────────────────────────────────────
  skeleton_archer: {
    id: 'skeleton_archer', name: 'Skeleton Archer', icon: '💀', level: 3,
    hp: 70, atk: 18, def: 6, expReward: 60, goldMin: 15, goldMax: 35,
    drops: [{ itemId: 'bone_shard', chance: 55 }, { itemId: 'ancient_bone', chance: 20 }, { itemId: 'silver_ore', chance: 15 }, { itemId: 'book_shadow_step', chance: 8 }],
    specialAttacks: ['piercing_arrow'],
    zones: ['shrine'],
    lore: 'Linh hồn lính canh cổ đền bị giam cầm, vẫn bảo vệ nơi thiêng liêng.'
  },
  phantom: {
    id: 'phantom', name: 'Phantom', icon: '👻', level: 4,
    hp: 80, atk: 20, def: 8, expReward: 85, goldMin: 25, goldMax: 50,
    drops: [{ itemId: 'ectoplasm', chance: 60 }, { itemId: 'mana_crystal', chance: 25 }, { itemId: 'frost_shard', chance: 15 }, { itemId: 'book_counter', chance: 10 }],
    specialAttacks: ['drain_mp', 'phase_through'],
    zones: ['shrine'],
    lore: 'Bóng ma không đầu lang thang, tìm kiếm linh hồn để hoàn chỉnh bản thân.'
  },
  bone_mage: {
    id: 'bone_mage', name: 'Bone Mage', icon: '🧙', level: 5,
    hp: 85, atk: 22, def: 7, expReward: 95, goldMin: 22, goldMax: 48,
    drops: [{ itemId: 'bone_shard', chance: 55 }, { itemId: 'ancient_bone', chance: 30 }, { itemId: 'mana_crystal', chance: 20 }],
    specialAttacks: ['bone_shards', 'death_curse'],
    zones: ['shrine'],
    lore: 'Pháp sư xương chỉ còn lại bộ cốt, điều khiển xương tấn công từ xa.'
  },
  spirit_knight: {
    id: 'spirit_knight', name: 'Spirit Knight', icon: '⚔️', level: 5,
    hp: 110, atk: 20, def: 15, expReward: 100, goldMin: 25, goldMax: 55,
    drops: [{ itemId: 'ancient_bone', chance: 35 }, { itemId: 'silver_ore', chance: 25 }, { itemId: 'bone_shard', chance: 40 }],
    specialAttacks: ['spectral_slash', 'banish'],
    zones: ['shrine'],
    lore: 'Chiến binh linh hồn còn mang vũ khí, trung thành bảo vệ đền ngay cả sau khi chết.'
  },
  cursed_idol: {
    id: 'cursed_idol', name: 'Cursed Idol', icon: '🗿', level: 4,
    hp: 95, atk: 19, def: 10, expReward: 80, goldMin: 18, goldMax: 42,
    drops: [{ itemId: 'ectoplasm', chance: 45 }, { itemId: 'mana_crystal', chance: 30 }, { itemId: 'frost_shard', chance: 20 }],
    specialAttacks: ['idol_curse', 'hex_bolt'],
    zones: ['shrine'],
    lore: 'Tượng thờ bị nhiễm tà khí, phóng ra các tia nguyền rủa vào kẻ xâm phạm.'
  },
  shrine_guardian: {
    id: 'shrine_guardian', name: 'Shrine Guardian', icon: '⛩️', level: 6,
    hp: 280, atk: 28, def: 20, expReward: 350, goldMin: 120, goldMax: 200,
    drops: [
      { itemId: 'book_thunder_clap', chance: 35 },
      { itemId: 'book_last_stand', chance: 25 },
      { itemId: 'shrine_relic', chance: 15 }
    ],
    specialAttacks: ['divine_judgment', 'shatter_guard', 'enrage'],
    zones: ['shrine'], boss: true,
    deathWorldFlag: 'shrine_guardian_slain',
    lore: 'Thần hộ vệ bị tha hoá. Khi hắn ngã xuống, lời nguyền của đền cổ sẽ lan rộng.'
  },

  // ── MINES ────────────────────────────────────────────────────────
  cave_troll: {
    id: 'cave_troll', name: 'Cave Troll', icon: '👹', level: 5,
    hp: 130, atk: 26, def: 10, expReward: 120, goldMin: 30, goldMax: 60,
    drops: [{ itemId: 'troll_hide', chance: 55 }, { itemId: 'iron_ore', chance: 40 }, { itemId: 'burning_core', chance: 15 }, { itemId: 'book_shield_bash', chance: 12 }],
    specialAttacks: ['ground_slam', 'rock_throw'],
    zones: ['mines'],
    lore: 'Hung thần hang động, mỗi bước chân làm rung chuyển hầm mỏ.'
  },
  shadow_bat: {
    id: 'shadow_bat', name: 'Shadow Bat', icon: '🦇', level: 6,
    hp: 100, atk: 30, def: 7, expReward: 140, goldMin: 35, goldMax: 70,
    drops: [{ itemId: 'dark_wing', chance: 55 }, { itemId: 'shadow_essence', chance: 30 }, { itemId: 'black_iron', chance: 10 }, { itemId: 'book_vampiric', chance: 12 }],
    specialAttacks: ['blood_drain', 'screech'],
    zones: ['mines'],
    lore: 'Sống trong bóng tối tuyệt đối, hút máu để duy trì sự bất tử.'
  },
  lava_crab: {
    id: 'lava_crab', name: 'Lava Crab', icon: '🦀', level: 6,
    hp: 120, atk: 24, def: 12, expReward: 130, goldMin: 28, goldMax: 55,
    drops: [{ itemId: 'burning_core', chance: 45 }, { itemId: 'iron_ore', chance: 40 }, { itemId: 'stone', chance: 35 }],
    specialAttacks: ['magma_claw', 'heat_burst'],
    zones: ['mines'],
    lore: 'Cua dung nham sống trong lõi núi lửa, mai giáp nóng đỏ rực như than hồng.'
  },
  crystal_spider: {
    id: 'crystal_spider', name: 'Crystal Spider', icon: '🕷️', level: 7,
    hp: 105, atk: 28, def: 8, expReward: 145, goldMin: 32, goldMax: 65,
    drops: [{ itemId: 'shadow_essence', chance: 40 }, { itemId: 'iron_ore', chance: 30 }, { itemId: 'black_iron', chance: 15 }],
    specialAttacks: ['crystal_web', 'venom_inject'],
    zones: ['mines'],
    lore: 'Nhện pha lê dệt tơ cứng như thép, nọc độc làm tê liệt toàn thân.'
  },
  iron_sentinel: {
    id: 'iron_sentinel', name: 'Iron Sentinel', icon: '🤖', level: 8,
    hp: 150, atk: 32, def: 20, expReward: 170, goldMin: 40, goldMax: 75,
    drops: [{ itemId: 'black_iron', chance: 50 }, { itemId: 'iron_ore', chance: 60 }, { itemId: 'troll_hide', chance: 20 }],
    specialAttacks: ['iron_crush', 'fortress_stance'],
    zones: ['mines'],
    lore: 'Bộ giáp sắt được pháp thuật ban linh hồn, bảo vệ hầm mỏ vĩnh cửu.'
  },
  mine_colossus: {
    id: 'mine_colossus', name: 'Mine Colossus', icon: '🪨', level: 9,
    hp: 450, atk: 38, def: 25, expReward: 600, goldMin: 200, goldMax: 350,
    drops: [
      { itemId: 'book_ice_lance', chance: 30 },
      { itemId: 'book_mana_flow', chance: 25 },
      { itemId: 'colossus_core', chance: 25 },
      { itemId: 'dragon_scale', chance: 15 },
      { itemId: 'burning_core', chance: 30 },
      { itemId: 'iron_ore', chance: 60 }
    ],
    specialAttacks: ['cave_in', 'seismic_slam', 'magma_core'],
    zones: ['mines'], boss: true,
    deathWorldFlag: 'mine_colossus_slain',
    lore: 'Được tạo nên từ đá và kim loại, hắn là vị thần canh gác mạch quặng cuối cùng.'
  },

  // ── ECHO WASTES ──────────────────────────────────────────────────
  void_wraith: {
    id: 'void_wraith', name: 'Void Wraith', icon: '🌀', level: 8,
    hp: 160, atk: 35, def: 12, expReward: 200, goldMin: 50, goldMax: 100,
    drops: [{ itemId: 'void_essence', chance: 50 }, { itemId: 'broken_soul', chance: 15 }, { itemId: 'abyss_core', chance: 10 }, { itemId: 'book_mark_zone', chance: 15 }],
    specialAttacks: ['void_drain', 'reality_tear'],
    zones: ['wastes'],
    lore: 'Được sinh ra từ sự hư không, thứ còn lại sau khi linh hồn hoàn toàn tan biến.'
  },
  echo_demon: {
    id: 'echo_demon', name: 'Echo Demon', icon: '👁️', level: 11,
    hp: 220, atk: 42, def: 18, expReward: 320, goldMin: 70, goldMax: 130,
    drops: [{ itemId: 'demon_seal', chance: 45 }, { itemId: 'demon_horn', chance: 20 }, { itemId: 'cursed_blood', chance: 12 }, { itemId: 'book_soul_offering', chance: 15 }],
    specialAttacks: ['skill_echo', 'mind_crush'],
    zones: ['wastes'],
    lore: 'Phản chiếu nỗi sợ hãi của người đối diện, bắt chước từng động tác một cách hoàn hảo.'
  },
  mirage_hunter: {
    id: 'mirage_hunter', name: 'Mirage Hunter', icon: '👤', level: 9,
    hp: 170, atk: 36, def: 13, expReward: 210, goldMin: 52, goldMax: 105,
    drops: [{ itemId: 'void_essence', chance: 45 }, { itemId: 'shadow_essence', chance: 35 }, { itemId: 'abyss_core', chance: 12 }],
    specialAttacks: ['phantom_shot', 'mirror_split'],
    zones: ['wastes'],
    lore: 'Thợ săn ảo ảnh, phân thân để tấn công từ mọi hướng cùng lúc.'
  },
  mind_leech: {
    id: 'mind_leech', name: 'Mind Leech', icon: '🧠', level: 10,
    hp: 190, atk: 38, def: 15, expReward: 260, goldMin: 60, goldMax: 115,
    drops: [{ itemId: 'broken_soul', chance: 30 }, { itemId: 'void_essence', chance: 40 }, { itemId: 'demon_seal', chance: 15 }],
    specialAttacks: ['psychic_drain', 'thought_devour'],
    zones: ['wastes'],
    lore: 'Ký sinh trùng tâm trí, bám vào não bộ và hút cạn ký ức cùng linh lực.'
  },
  abyss_fiend: {
    id: 'abyss_fiend', name: 'Abyss Fiend', icon: '😈', level: 12,
    hp: 240, atk: 44, def: 17, expReward: 360, goldMin: 75, goldMax: 140,
    drops: [{ itemId: 'abyss_core', chance: 45 }, { itemId: 'demon_horn', chance: 25 }, { itemId: 'cursed_blood', chance: 18 }],
    specialAttacks: ['abyss_strike', 'doom_call'],
    zones: ['wastes'],
    lore: 'Quỷ vực sâu tràn ra từ các khe nứt của thực tại, mang theo hơi thở huỷ diệt.'
  },
  the_forgotten: {
    id: 'the_forgotten', name: 'The Forgotten', icon: '❓', level: 14,
    hp: 700, atk: 52, def: 30, expReward: 1200, goldMin: 400, goldMax: 700,
    drops: [
      { itemId: 'forgotten_crown', chance: 100 },
      { itemId: 'book_last_stand', chance: 50 },
      { itemId: 'book_counter', chance: 50 },
      { itemId: 'fallen_star_fragment', chance: 30 },
      { itemId: 'broken_soul', chance: 25 },
      { itemId: 'void_fragment', chance: 20 },
      { itemId: 'lost_memory', chance: 15 },
      { itemId: 'abyss_core', chance: 20 }
    ],
    specialAttacks: ['erase', 'butterfly_curse', 'forgotten_rage'],
    zones: ['wastes'], boss: true,
    deathWorldFlag: 'the_forgotten_slain',
    lore: 'Không ai còn nhớ hắn là ai. Mỗi khi bị giết, ký ức về cuộc chiến đó biến mất khỏi thế giới.'
  }
};

export function getEnemiesForZone(zoneId: string): EnemyDef[] {
  return Object.values(ENEMIES).filter(e => e.zones.includes(zoneId) && !e.boss);
}

export function getBossForZone(zoneId: string): EnemyDef | undefined {
  return Object.values(ENEMIES).find(e => e.zones.includes(zoneId) && e.boss);
}

export function getEnemy(id: string): EnemyDef | undefined {
  return ENEMIES[id];
}
