export interface DropEntry {
  itemId: string;
  chance: number; // 0-100
}

export interface BossPhase {
  threshold: number;       // HP% at which this phase triggers (e.g. 0.60 = 60%)
  phaseIndex: number;      // phase number (2, 3, ...)
  name: string;            // display name in combat embed
  icon: string;            // emoji icon to replace enemy icon
  atkMult: number;         // multiplier on base enemy.atk
  specialAttacks: string[]; // pool of attacks available in this phase
  transitionMsg: string;   // dramatic message shown on transition
  healOnTransition?: number; // fraction of max HP to restore (e.g. 0.06 = 6%)
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
  miniboss?: boolean;
  deathWorldFlag?: string;
  lore: string;
  phases?: BossPhase[];         // multi-phase boss behaviour
  guaranteedDrops?: string[];   // item IDs always given on kill
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

  ember_bloom: {
    id: 'ember_bloom', name: 'Ember Bloom', icon: '🌺', level: 2,
    hp: 58, atk: 15, def: 4, expReward: 42, goldMin: 9, goldMax: 22,
    drops: [{ itemId: 'healing_herb', chance: 35 }, { itemId: 'burning_core', chance: 8 }, { itemId: 'wood', chance: 25 }],
    specialAttacks: ['heat_burst', 'petal_storm'],
    zones: ['forest'],
    lore: 'Đóa hoa đỏ rực mọc trên đất nguyền, cánh hoa nóng như than hồng.'
  },
  hollow_stag: {
    id: 'hollow_stag', name: 'Hollow Stag', icon: '🦌', level: 3,
    hp: 78, atk: 18, def: 7, expReward: 60, goldMin: 14, goldMax: 30,
    drops: [{ itemId: 'leather', chance: 45 }, { itemId: 'ancient_bark', chance: 22 }, { itemId: 'wolf_fang', chance: 18 }],
    specialAttacks: ['soul_flicker', 'savage_bite'],
    zones: ['forest'],
    lore: 'Con hươu rỗng ruột, bên trong chỉ còn tiếng gió và ánh mắt xanh lạnh.'
  },
  spore_kin: {
    id: 'spore_kin', name: 'Spore Kin', icon: '🍄', level: 3,
    hp: 72, atk: 16, def: 8, expReward: 58, goldMin: 12, goldMax: 28,
    drops: [{ itemId: 'glowing_mushroom', chance: 35 }, { itemId: 'healing_herb', chance: 35 }, { itemId: 'slime_core', chance: 20 }],
    specialAttacks: ['toxic_spores', 'bewitch'],
    zones: ['forest'],
    lore: 'Sinh vật nấm biết đi, gieo bào tử khiến kẻ lạc đường nghe thấy tiếng gọi giả.'
  },
  briar_witch: {
    id: 'briar_witch', name: 'Briar Witch', icon: '🧙‍♀️', level: 4,
    hp: 86, atk: 21, def: 8, expReward: 82, goldMin: 20, goldMax: 42,
    drops: [{ itemId: 'rare_herb', chance: 25 }, { itemId: 'rune_ink', chance: 15 }, { itemId: 'book_mend_wounds', chance: 7 }],
    specialAttacks: ['entangle', 'death_curse'],
    zones: ['forest'],
    lore: 'Phù thủy gai sống trong bụi mâm xôi đen, đổi máu lấy lời nguyền.'
  },
  alpha_thornmaw: {
    id: 'alpha_thornmaw', name: 'Alpha Thornmaw', icon: '🐺', level: 5,
    hp: 168, atk: 29, def: 14, expReward: 130, goldMin: 45, goldMax: 85,
    drops: [{ itemId: 'wolf_fang', chance: 75 }, { itemId: 'leather', chance: 60 }, { itemId: 'hunter_mark', chance: 8 }, { itemId: 'book_berserker', chance: 12 }],
    specialAttacks: ['howl', 'double_bite', 'frenzy'],
    zones: ['forest'], miniboss: true,
    lore: 'Con đầu đàn của bầy sói gai. Tiếng hú của nó làm cả rừng im bặt.'
  },
  moss_crowned_stag: {
    id: 'moss_crowned_stag', name: 'Moss-Crowned Stag', icon: '🦌', level: 5,
    hp: 180, atk: 25, def: 18, expReward: 140, goldMin: 42, goldMax: 90,
    drops: [{ itemId: 'ancient_bark', chance: 70 }, { itemId: 'rare_herb', chance: 28 }, { itemId: 'crown_fragment', chance: 10 }, { itemId: 'book_iron_skin', chance: 12 }],
    specialAttacks: ['root_slam', 'nature_regeneration', 'entangle'],
    zones: ['forest'], miniboss: true,
    lore: 'Linh thú già đội vương miện rêu. Nó không ác, nhưng không tha thứ cho kẻ xâm phạm.'
  },
  ancient_oak: {
    id: 'ancient_oak', name: 'Ancient Oak', icon: '🌳', level: 6,
    hp: 550, atk: 44, def: 35, expReward: 450, goldMin: 130, goldMax: 200,
    drops: [
      { itemId: 'book_tough_body', chance: 45 },
      { itemId: 'book_mend_wounds', chance: 35 },
      { itemId: 'elixir', chance: 25 },
      { itemId: 'ancient_relic', chance: 20 },
      { itemId: 'wood', chance: 100 },
    ],
    guaranteedDrops: ['ancient_bark'],
    // Phase 1 (>65% HP): guardian form — heavy root slams, earth regeneration, bark armor
    specialAttacks: ['oak_root_slam', 'oak_regen', 'oak_bark_armor'],
    phases: [
      {
        threshold: 0.65,
        phaseIndex: 2,
        name: 'Ancient Oak (Awakened)',
        icon: '🌿',
        atkMult: 1.40,   // boss balance: stronger awakened phase
        specialAttacks: ['splinter_rain', 'vine_whip', 'oak_regen_deep', 'oak_bark_armor'],
        transitionMsg: '🌿 **Thân cây nứt toác — sức mạnh rừng nguyên thủy bùng phát từ bên trong!**',
        healOnTransition: 0.07,
      },
      {
        threshold: 0.30,
        phaseIndex: 3,
        name: 'Ancient Oak (Dying Fury)',
        icon: '☠️',
        atkMult: 1.95,   // boss balance: stronger execute phase
        specialAttacks: ['oak_ancient_rage', 'thorn_burst', 'bark_rend'],
        transitionMsg: '☠️ **Rễ cây xé toạc mặt đất — Cổ Mộc quyết kéo tất cả xuống cùng!**',
      },
    ],
    zones: ['forest'], boss: true,
    deathWorldFlag: 'ancient_oak_slain',
    lore: 'Linh hồn thủ hộ của rừng già. Nếu hắn ngã xuống, rừng sẽ không bao giờ như xưa.',
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

  ash_acolyte: {
    id: 'ash_acolyte', name: 'Ash Acolyte', icon: '🕯️', level: 4,
    hp: 82, atk: 21, def: 7, expReward: 78, goldMin: 18, goldMax: 40,
    drops: [{ itemId: 'ectoplasm', chance: 35 }, { itemId: 'bone_shard', chance: 40 }, { itemId: 'purifying_salt', chance: 18 }],
    specialAttacks: ['hex_bolt', 'drain_mp'],
    zones: ['shrine'],
    lore: 'Tín đồ hóa tro vẫn quỳ trước bàn thờ, miệng lẩm nhẩm lời cầu đã mục nát.'
  },
  grave_hound: {
    id: 'grave_hound', name: 'Grave Hound', icon: '🐕‍🦺', level: 4,
    hp: 96, atk: 23, def: 9, expReward: 88, goldMin: 20, goldMax: 45,
    drops: [{ itemId: 'ancient_bone', chance: 35 }, { itemId: 'bone_shard', chance: 55 }, { itemId: 'leather', chance: 25 }],
    specialAttacks: ['savage_bite', 'banish'],
    zones: ['shrine'],
    lore: 'Chó canh mộ cắn vào bóng người sống, kéo linh hồn họ về dưới đất.'
  },
  bell_specter: {
    id: 'bell_specter', name: 'Bell Specter', icon: '🔔', level: 5,
    hp: 88, atk: 25, def: 7, expReward: 100, goldMin: 25, goldMax: 52,
    drops: [{ itemId: 'ectoplasm', chance: 50 }, { itemId: 'mana_crystal', chance: 28 }, { itemId: 'bell_of_silence', chance: 4 }],
    specialAttacks: ['screech', 'mind_crush'],
    zones: ['shrine'],
    lore: 'Bóng ma bị trói trong tiếng chuông, mỗi hồi ngân là một ký ức bị cắt mất.'
  },
  scripture_mimic: {
    id: 'scripture_mimic', name: 'Scripture Mimic', icon: '📖', level: 5,
    hp: 105, atk: 22, def: 13, expReward: 104, goldMin: 22, goldMax: 55,
    drops: [{ itemId: 'rune_ink', chance: 28 }, { itemId: 'mana_crystal', chance: 32 }, { itemId: 'book_counter', chance: 7 }],
    specialAttacks: ['idol_curse', 'hex_bolt'],
    zones: ['shrine'],
    lore: 'Cuốn kinh biết nuốt người đọc. Chữ trên trang bò như kiến đen.'
  },
  pale_confessor: {
    id: 'pale_confessor', name: 'Pale Confessor', icon: '🙏', level: 7,
    hp: 212, atk: 35, def: 19, expReward: 190, goldMin: 70, goldMax: 130,
    drops: [{ itemId: 'ancient_bone', chance: 60 }, { itemId: 'purification_stone', chance: 18 }, { itemId: 'shrine_relic', chance: 6 }, { itemId: 'book_last_stand', chance: 10 }],
    specialAttacks: ['divine_judgment', 'death_curse', 'banish'],
    zones: ['shrine'], miniboss: true,
    lore: 'Kẻ giải tội không còn mặt. Hắn bắt người sống thú nhận những tội chưa từng phạm.'
  },
  bell_wraith: {
    id: 'bell_wraith', name: 'Bell Wraith', icon: '🔔', level: 7,
    hp: 195, atk: 39, def: 15, expReward: 200, goldMin: 65, goldMax: 125,
    drops: [{ itemId: 'ectoplasm', chance: 70 }, { itemId: 'frost_shard', chance: 30 }, { itemId: 'bell_of_silence', chance: 6 }, { itemId: 'book_thunder_clap', chance: 10 }],
    specialAttacks: ['screech', 'drain_mp', 'shatter_guard'],
    zones: ['shrine'], miniboss: true,
    lore: 'Oan hồn của người kéo chuông cuối cùng, tiếng ngân của nó làm giáp nứt vỡ.'
  },
  shrine_guardian: {
    id: 'shrine_guardian', name: 'Shrine Guardian', icon: '⛩️', level: 6,
    hp: 345, atk: 32, def: 23, expReward: 350, goldMin: 120, goldMax: 200,
    drops: [
      { itemId: 'book_thunder_clap', chance: 35 },
      { itemId: 'book_last_stand', chance: 25 },
      { itemId: 'shrine_relic', chance: 15 }
    ],
    specialAttacks: ['divine_judgment', 'shatter_guard', 'enrage'],
    phases: [
      {
        threshold: 0.55,
        phaseIndex: 2,
        name: 'Shrine Guardian (Desecrated)',
        icon: '🩸',
        atkMult: 1.28,
        specialAttacks: ['divine_judgment', 'shatter_guard', 'banish', 'screech'],
        transitionMsg: '🩸 **Máu đen chảy từ các phù văn — Hộ Vệ Đền Cổ chuyển sang nghi thức trừng phạt!**',
        healOnTransition: 0.05,
      },
      {
        threshold: 0.22,
        phaseIndex: 3,
        name: 'Shrine Guardian (Final Verdict)',
        icon: '⚖️',
        atkMult: 1.58,
        specialAttacks: ['enrage', 'divine_judgment', 'death_curse', 'shatter_guard'],
        transitionMsg: '⚖️ **Tiếng chuông phán quyết vang lên — đòn đánh tiếp theo sẽ nặng hơn rất nhiều!**',
      },
    ],
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

  coal_imp: {
    id: 'coal_imp', name: 'Coal Imp', icon: '👺', level: 5,
    hp: 92, atk: 25, def: 8, expReward: 105, goldMin: 24, goldMax: 50,
    drops: [{ itemId: 'burning_core', chance: 20 }, { itemId: 'stone', chance: 40 }, { itemId: 'iron_ore', chance: 32 }],
    specialAttacks: ['heat_burst', 'rock_throw'],
    zones: ['mines'],
    lore: 'Tiểu quỷ than chuyên phá đuốc của thợ mỏ, cười khanh khách trong bóng tối.'
  },
  ore_devourer: {
    id: 'ore_devourer', name: 'Ore Devourer', icon: '🪱', level: 6,
    hp: 135, atk: 27, def: 15, expReward: 135, goldMin: 32, goldMax: 68,
    drops: [{ itemId: 'iron_ore', chance: 65 }, { itemId: 'silver_ore', chance: 25 }, { itemId: 'black_iron', chance: 12 }],
    specialAttacks: ['ground_slam', 'crystal_web'],
    zones: ['mines'],
    lore: 'Sâu mỏ ăn quặng để lớn lên, để lại đường hầm trống rỗng sau lưng.'
  },
  soot_harpy: {
    id: 'soot_harpy', name: 'Soot Harpy', icon: '🪽', level: 7,
    hp: 110, atk: 33, def: 8, expReward: 150, goldMin: 36, goldMax: 76,
    drops: [{ itemId: 'dark_wing', chance: 45 }, { itemId: 'shadow_essence', chance: 28 }, { itemId: 'black_iron', chance: 10 }],
    specialAttacks: ['screech', 'phantom_shot'],
    zones: ['mines'],
    lore: 'Điểu nữ phủ bồ hóng bay trong giếng thông gió, lao xuống như mũi tên đen.'
  },
  molten_jailer: {
    id: 'molten_jailer', name: 'Molten Jailer', icon: '⛓️', level: 8,
    hp: 150, atk: 32, def: 18, expReward: 180, goldMin: 42, goldMax: 88,
    drops: [{ itemId: 'black_iron', chance: 42 }, { itemId: 'burning_core', chance: 35 }, { itemId: 'cursed_blood', chance: 8 }],
    specialAttacks: ['magma_claw', 'entangle', 'iron_crush'],
    zones: ['mines'],
    lore: 'Cai ngục dung nham kéo theo xiềng xích đỏ rực, giam giữ cả tiếng hét trong đá.'
  },
  slag_brute: {
    id: 'slag_brute', name: 'Slag Brute', icon: '🧱', level: 9,
    hp: 285, atk: 49, def: 25, expReward: 260, goldMin: 90, goldMax: 170,
    drops: [{ itemId: 'black_iron', chance: 70 }, { itemId: 'troll_hide', chance: 42 }, { itemId: 'colossus_core', chance: 8 }, { itemId: 'book_tough_body', chance: 10 }],
    specialAttacks: ['ground_slam', 'iron_crush', 'fortress_stance'],
    zones: ['mines'], miniboss: true,
    lore: 'Khối xỉ thép mang hình người, mỗi cú đấm nện xuống như búa máy.'
  },
  rustbound_foreman: {
    id: 'rustbound_foreman', name: 'Rustbound Foreman', icon: '👷', level: 9,
    hp: 258, atk: 45, def: 27, expReward: 275, goldMin: 95, goldMax: 180,
    drops: [{ itemId: 'rusty_gear', chance: 80 }, { itemId: 'black_iron', chance: 55 }, { itemId: 'guard_emblem', chance: 8 }, { itemId: 'book_shield_bash', chance: 12 }],
    specialAttacks: ['rock_throw', 'fortress_stance', 'seismic_slam'],
    zones: ['mines'], miniboss: true,
    lore: 'Quản đốc mỏ đã chết nhưng vẫn thổi còi bắt mọi linh hồn quay lại làm việc.'
  },
  mine_colossus: {
    id: 'mine_colossus', name: 'Mine Colossus', icon: '🪨', level: 9,
    hp: 565, atk: 44, def: 29, expReward: 600, goldMin: 200, goldMax: 350,
    drops: [
      { itemId: 'book_ice_lance', chance: 30 },
      { itemId: 'book_mana_flow', chance: 25 },
      { itemId: 'colossus_core', chance: 25 },
      { itemId: 'dragon_scale', chance: 15 },
      { itemId: 'burning_core', chance: 30 },
      { itemId: 'iron_ore', chance: 60 }
    ],
    specialAttacks: ['cave_in', 'seismic_slam', 'magma_core'],
    phases: [
      {
        threshold: 0.55,
        phaseIndex: 2,
        name: 'Mine Colossus (Core Exposed)',
        icon: '🔥',
        atkMult: 1.25,
        specialAttacks: ['seismic_slam', 'iron_crush', 'fortress_stance', 'cave_in'],
        transitionMsg: '🔥 **Lõi dung nham trong ngực Colossus lộ ra — cả hầm mỏ bắt đầu rung chuyển!**',
        healOnTransition: 0.04,
      },
      {
        threshold: 0.25,
        phaseIndex: 3,
        name: 'Mine Colossus (Meltdown)',
        icon: '🌋',
        atkMult: 1.55,
        specialAttacks: ['magma_core', 'seismic_slam', 'iron_crush', 'cave_in'],
        transitionMsg: '🌋 **Colossus quá tải — đá nóng chảy rơi xuống như mưa!**',
      },
    ],
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

  glass_serpent: {
    id: 'glass_serpent', name: 'Glass Serpent', icon: '🐍', level: 9,
    hp: 150, atk: 39, def: 11, expReward: 220, goldMin: 55, goldMax: 110,
    drops: [{ itemId: 'void_essence', chance: 35 }, { itemId: 'frost_shard', chance: 25 }, { itemId: 'void_fragment', chance: 8 }],
    specialAttacks: ['venom_inject', 'mirror_split'],
    zones: ['wastes'],
    lore: 'Rắn thủy tinh phản chiếu tương lai sai lệch, mỗi vết cắn làm ký ức rạn nứt.'
  },
  memory_moth: {
    id: 'memory_moth', name: 'Memory Moth', icon: '🦋', level: 9,
    hp: 135, atk: 37, def: 12, expReward: 215, goldMin: 52, goldMax: 105,
    drops: [{ itemId: 'lost_memory', chance: 22 }, { itemId: 'broken_soul', chance: 24 }, { itemId: 'void_essence', chance: 40 }],
    specialAttacks: ['psychic_drain', 'bewitch'],
    zones: ['wastes'],
    lore: 'Bướm đêm ăn ký ức, để lại cảm giác thiếu mất một điều rất quan trọng.'
  },
  void_hound: {
    id: 'void_hound', name: 'Void Hound', icon: '🐺', level: 10,
    hp: 185, atk: 43, def: 15, expReward: 280, goldMin: 65, goldMax: 125,
    drops: [{ itemId: 'abyss_core', chance: 18 }, { itemId: 'void_essence', chance: 48 }, { itemId: 'demon_fang', chance: 20 }],
    specialAttacks: ['void_drain', 'double_bite', 'doom_call'],
    zones: ['wastes'],
    lore: 'Chó săn hư không đánh hơi bằng nỗi sợ, xuất hiện sau lưng trước khi bạn kịp quay lại.'
  },
  dust_prophet: {
    id: 'dust_prophet', name: 'Dust Prophet', icon: '🧿', level: 11,
    hp: 170, atk: 45, def: 16, expReward: 310, goldMin: 70, goldMax: 135,
    drops: [{ itemId: 'demon_seal', chance: 26 }, { itemId: 'rune_ink', chance: 25 }, { itemId: 'book_mark_zone', chance: 8 }],
    specialAttacks: ['mind_crush', 'skill_echo'],
    zones: ['wastes'],
    lore: 'Nhà tiên tri bụi nói bằng giọng của người đã chết, gọi đúng tên nỗi hối tiếc của bạn.'
  },
  eclipse_reaver: {
    id: 'eclipse_reaver', name: 'Eclipse Reaver', icon: '🌘', level: 13,
    hp: 388, atk: 65, def: 27, expReward: 520, goldMin: 160, goldMax: 280,
    drops: [{ itemId: 'abyss_core', chance: 55 }, { itemId: 'void_fragment', chance: 25 }, { itemId: 'eclipse_blade', chance: 4 }, { itemId: 'book_soul_strike', chance: 10 }],
    specialAttacks: ['abyss_strike', 'reality_tear', 'doom_call'],
    zones: ['wastes'], miniboss: true,
    lore: 'Kẻ gặt nhật thực khoác bóng tối quanh lưỡi hái, cắt cả ánh sáng khỏi vết thương.'
  },
  mirror_knight: {
    id: 'mirror_knight', name: 'Mirror Knight', icon: '🪞', level: 13,
    hp: 410, atk: 61, def: 31, expReward: 540, goldMin: 170, goldMax: 300,
    drops: [{ itemId: 'lost_memory', chance: 35 }, { itemId: 'broken_crown_fragment', chance: 12 }, { itemId: 'void_core', chance: 12 }, { itemId: 'book_counter', chance: 12 }],
    specialAttacks: ['mirror_split', 'skill_echo', 'forgotten_rage'],
    zones: ['wastes'], miniboss: true,
    lore: 'Kỵ sĩ gương phản chiếu lối đánh của bạn, nhưng không phản chiếu lòng thương xót.'
  },
  the_forgotten: {
    id: 'the_forgotten', name: 'The Forgotten', icon: '❓', level: 14,
    hp: 860, atk: 61, def: 35, expReward: 1200, goldMin: 400, goldMax: 700,
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
    phases: [
      {
        threshold: 0.60,
        phaseIndex: 2,
        name: 'The Forgotten (Remembered Pain)',
        icon: '🦋',
        atkMult: 1.22,
        specialAttacks: ['butterfly_curse', 'skill_echo', 'mind_crush', 'forgotten_rage'],
        transitionMsg: '🦋 **Những ký ức bị xoá quay lại thành đàn bướm đen — The Forgotten nhớ ra cách làm bạn đau.**',
        healOnTransition: 0.04,
      },
      {
        threshold: 0.30,
        phaseIndex: 3,
        name: 'The Forgotten (Erasure)',
        icon: '❌',
        atkMult: 1.55,
        specialAttacks: ['erase', 'reality_tear', 'forgotten_rage', 'doom_call'],
        transitionMsg: '❌ **Tên của bạn bắt đầu mờ đi trong đầu chính bạn — trận chiến bước vào pha xoá bỏ.**',
      },
    ],
    zones: ['wastes'], boss: true,
    deathWorldFlag: 'the_forgotten_slain',
    lore: 'Không ai còn nhớ hắn là ai. Mỗi khi bị giết, ký ức về cuộc chiến đó biến mất khỏi thế giới.'
  }
};

export function getEnemiesForZone(zoneId: string): EnemyDef[] {
  return Object.values(ENEMIES).filter(e => Array.isArray(e.zones) && e.zones.includes(zoneId) && !e.boss);
}

export function getBossForZone(zoneId: string): EnemyDef | undefined {
  return Object.values(ENEMIES).find(e => Array.isArray(e.zones) && e.zones.includes(zoneId) && e.boss);
}

export function getEnemy(id: string): EnemyDef | undefined {
  return ENEMIES[id];
}
