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
    id: 'forest_sprite', name: 'Gloomleaf Sprite', icon: '🧚', level: 1,
    hp: 40, atk: 8, def: 3, expReward: 20, goldMin: 5, goldMax: 15,
    drops: [{ itemId: 'healing_herb', chance: 45 }, { itemId: 'slime_core', chance: 30 }, { itemId: 'wood', chance: 40 }, { itemId: 'ancient_book', chance: 5 }],
    specialAttacks: ['petal_storm'],
    zones: ['forest'],
    lore: 'Một tinh linh rừng nhỏ bị nhiễm độc bởi bóng tối.'
  },
  cursed_wolf: {
    id: 'cursed_wolf', name: 'Blood-Eyed Wolf', icon: '🐺', level: 2,
    hp: 65, atk: 14, def: 5, expReward: 40, goldMin: 10, goldMax: 25,
    drops: [{ itemId: 'wolf_fang', chance: 55 }, { itemId: 'leather', chance: 45 }, { itemId: 'ancient_book', chance: 8 }],
    specialAttacks: ['double_bite', 'howl'],
    zones: ['forest'],
    lore: 'Bị lời nguyền biến thành quái vật, đôi mắt đỏ rực bùng cháy.'
  },
  vine_golem: {
    id: 'vine_golem', name: 'Rootbound Golem', icon: '🌿', level: 3,
    hp: 90, atk: 16, def: 12, expReward: 65, goldMin: 20, goldMax: 40,
    drops: [{ itemId: 'ancient_bark', chance: 45 }, { itemId: 'wood', chance: 50 }, { itemId: 'stone', chance: 30 }, { itemId: 'ancient_book', chance: 10 }],
    specialAttacks: ['entangle'],
    zones: ['forest'],
    lore: 'Cây cổ thụ ngàn năm bị hồn ma chiếm đóng, rễ cây trở thành nanh vuốt.'
  },
  moss_lurker: {
    id: 'moss_lurker', name: 'Mosslurker', icon: '🌱', level: 2,
    hp: 55, atk: 12, def: 4, expReward: 35, goldMin: 8, goldMax: 20,
    drops: [{ itemId: 'healing_herb', chance: 50 }, { itemId: 'slime_core', chance: 35 }, { itemId: 'wood', chance: 30 }],
    specialAttacks: ['toxic_spores', 'ambush'],
    zones: ['forest'],
    lore: 'Sinh vật rêu ẩn nấp trong bóng tối, chờ đợi để tấn công bất ngờ.'
  },
  thornhound: {
    id: 'thornhound', name: 'Briar Hound', icon: '🐾', level: 3,
    hp: 70, atk: 17, def: 6, expReward: 55, goldMin: 12, goldMax: 28,
    drops: [{ itemId: 'leather', chance: 50 }, { itemId: 'wolf_fang', chance: 35 }, { itemId: 'healing_herb', chance: 25 }],
    specialAttacks: ['savage_bite', 'frenzy'],
    zones: ['forest'],
    lore: 'Chó rừng mọc gai từ da thịt, mỗi cú cắn để lại vết thương sâu.'
  },
  cursed_treant: {
    id: 'cursed_treant', name: 'Hollowbark Treant', icon: '🌲', level: 4,
    hp: 100, atk: 15, def: 14, expReward: 75, goldMin: 18, goldMax: 38,
    drops: [{ itemId: 'ancient_bark', chance: 50 }, { itemId: 'wood', chance: 60 }, { itemId: 'healing_herb', chance: 20 }],
    specialAttacks: ['thorn_lash', 'bark_regen'],
    zones: ['forest'],
    lore: 'Cây cổ thụ bị nguyền rủa, không thể chết nhưng cũng không thể sống.'
  },
  will_o_wisp: {
    id: 'will_o_wisp', name: "Graveglow Wisp", icon: '🔵', level: 2,
    hp: 45, atk: 14, def: 3, expReward: 38, goldMin: 6, goldMax: 18,
    drops: [{ itemId: 'mana_crystal', chance: 40 }, { itemId: 'ectoplasm', chance: 30 }],
    specialAttacks: ['soul_flicker', 'bewitch'],
    zones: ['forest'],
    lore: 'Đốm lửa ma quái dẫn đường lạc, hút cạn linh hồn kẻ theo đuổi.'
  },

  ember_bloom: {
    id: 'ember_bloom', name: 'Cinderbloom', icon: '🌺', level: 2,
    hp: 58, atk: 15, def: 4, expReward: 42, goldMin: 9, goldMax: 22,
    drops: [{ itemId: 'healing_herb', chance: 35 }, { itemId: 'burning_core', chance: 8 }, { itemId: 'wood', chance: 25 }],
    specialAttacks: ['heat_burst', 'petal_storm'],
    zones: ['forest'],
    lore: 'Đóa hoa đỏ rực mọc trên đất nguyền, cánh hoa nóng như than hồng.'
  },
  hollow_stag: {
    id: 'hollow_stag', name: 'Hollowhorn Stag', icon: '🦌', level: 3,
    hp: 78, atk: 18, def: 7, expReward: 60, goldMin: 14, goldMax: 30,
    drops: [{ itemId: 'leather', chance: 45 }, { itemId: 'ancient_bark', chance: 22 }, { itemId: 'wolf_fang', chance: 18 }],
    specialAttacks: ['soul_flicker', 'savage_bite'],
    zones: ['forest'],
    lore: 'Con hươu rỗng ruột, bên trong chỉ còn tiếng gió và ánh mắt xanh lạnh.'
  },
  spore_kin: {
    id: 'spore_kin', name: 'Sporebound Kin', icon: '🍄', level: 3,
    hp: 72, atk: 16, def: 8, expReward: 58, goldMin: 12, goldMax: 28,
    drops: [{ itemId: 'glowing_mushroom', chance: 35 }, { itemId: 'healing_herb', chance: 35 }, { itemId: 'slime_core', chance: 20 }],
    specialAttacks: ['toxic_spores', 'bewitch'],
    zones: ['forest'],
    lore: 'Sinh vật nấm biết đi, gieo bào tử khiến kẻ lạc đường nghe thấy tiếng gọi giả.'
  },
  briar_witch: {
    id: 'briar_witch', name: 'Briar Hag', icon: '🧙‍♀️', level: 4,
    hp: 86, atk: 21, def: 8, expReward: 82, goldMin: 20, goldMax: 42,
    drops: [{ itemId: 'rare_herb', chance: 25 }, { itemId: 'rune_ink', chance: 15 }, { itemId: 'ancient_book', chance: 7 }],
    specialAttacks: ['entangle', 'death_curse'],
    zones: ['forest'],
    lore: 'Phù thủy gai sống trong bụi mâm xôi đen, đổi máu lấy lời nguyền.'
  },
  alpha_thornmaw: {
    id: 'alpha_thornmaw', name: 'Thornfang, Alpha of the Wilds', icon: '🐺', level: 5,
    hp: 168, atk: 29, def: 14, expReward: 130, goldMin: 45, goldMax: 85,
    drops: [{ itemId: 'wolf_fang', chance: 75 }, { itemId: 'leather', chance: 60 }, { itemId: 'hunter_mark', chance: 8 }, { itemId: 'ancient_book', chance: 12 }],
    guaranteedDrops: ['thornfang_fang'],
    specialAttacks: ['howl', 'double_bite', 'frenzy'],
    zones: ['forest'], miniboss: true,
    lore: 'Con đầu đàn của bầy sói gai. Tiếng hú của nó làm cả rừng im bặt.'
  },
  moss_crowned_stag: {
    id: 'moss_crowned_stag', name: 'Elarok, Warden of the Root-Crown', icon: '🦌', level: 5,
    hp: 180, atk: 25, def: 18, expReward: 140, goldMin: 42, goldMax: 90,
    drops: [{ itemId: 'ancient_bark', chance: 70 }, { itemId: 'rare_herb', chance: 28 }, { itemId: 'grove_crown_fragment', chance: 10 }, { itemId: 'ancient_book', chance: 12 }],
    guaranteedDrops: ['grove_crown_fragment'],
    specialAttacks: ['root_slam', 'nature_regeneration', 'entangle'],
    zones: ['forest'], miniboss: true,
    lore: 'Linh thú già đội vương miện rêu. Nó không ác, nhưng không tha thứ cho kẻ xâm phạm.'
  },
  ancient_oak: {
    id: 'ancient_oak', name: 'Ancient Oak Guardian', icon: '🌳', level: 7,
    hp: 820, atk: 58, def: 42, expReward: 650, goldMin: 190, goldMax: 300,
    drops: [
      { itemId: 'ancient_book', chance: 45 },
      { itemId: 'ancient_book', chance: 35 },
      { itemId: 'elixir', chance: 25 },
      { itemId: 'ancient_relic', chance: 20 },
      { itemId: 'wood', chance: 100 },
    ],
    guaranteedDrops: ['ancient_bark'],
    // Phase 1 (>65% HP): guardian form — heavy root slams, earth regeneration, bark armor
    specialAttacks: ['oak_root_slam', 'oak_regen', 'oak_bark_armor'],
    phases: [
      {
        threshold: 0.70,
        phaseIndex: 2,
        name: 'Ancient Oak (Awakened)',
        icon: '🌿',
        atkMult: 1.55,   // raid balance: stronger awakened phase
        specialAttacks: ['splinter_rain', 'vine_whip', 'oak_regen_deep', 'oak_bark_armor'],
        transitionMsg: '🌿 **Thân cây nứt toác — sức mạnh rừng nguyên thủy bùng phát từ bên trong!**',
        healOnTransition: 0.10,
      },
      {
        threshold: 0.35,
        phaseIndex: 3,
        name: 'Ancient Oak (Dying Fury)',
        icon: '☠️',
        atkMult: 2.20,   // raid balance: dangerous execute phase
        specialAttacks: ['oak_ancient_rage', 'thorn_burst', 'bark_rend'],
        transitionMsg: '☠️ **Rễ cây xé toạc mặt đất — Cổ Mộc quyết kéo tất cả xuống cùng!**',
      },
    ],
    zones: ['forest'], boss: true,
    deathWorldFlag: 'ancient_oak_slain',
    lore: 'Linh hồn thủ hộ của rừng già. Nếu hắn ngã xuống, rừng sẽ không bao giờ như xưa.',
  },

  // ── ANCIENT SHRINE / ZONE 2 ─────────────────────────────────
  wandering_spirit: {
    id: 'wandering_spirit', name: 'Wandering Spirit', icon: '👻', level: 4,
    hp: 78, atk: 20, def: 6, expReward: 88, goldMin: 20, goldMax: 42,
    drops: [{ itemId: 'ectoplasm', chance: 55 }, { itemId: 'mana_crystal', chance: 22 }, { itemId: 'holy_ash', chance: 15 }, { itemId: 'ancient_book', chance: 8 }],
    specialAttacks: ['phase_through', 'drain_mp'],
    zones: ['shrine'],
    lore: 'Một linh hồn lạc lối trong hành lang đền. Nó né tránh lưỡi kiếm như làn khói, nhưng tan rất nhanh khi bị chạm tới.'
  },
  stone_guardian: {
    id: 'stone_guardian', name: 'Stone Guardian', icon: '🗿', level: 5,
    hp: 128, atk: 21, def: 18, expReward: 112, goldMin: 24, goldMax: 52,
    drops: [{ itemId: 'shrine_stone', chance: 60 }, { itemId: 'ancient_rune', chance: 8 }, { itemId: 'stone', chance: 45 }, { itemId: 'ancient_book', chance: 7 }],
    specialAttacks: ['shatter_guard', 'fortress_stance'],
    zones: ['shrine'],
    lore: 'Tượng đá hộ đền đã nứt, nhưng lời thề canh gác vẫn còn nguyên. Nó chậm, cứng và rất khó hạ bằng đòn thường.'
  },
  curse_bat: {
    id: 'curse_bat', name: 'Curse Bat', icon: '🦇', level: 4,
    hp: 72, atk: 24, def: 5, expReward: 92, goldMin: 18, goldMax: 45,
    drops: [{ itemId: 'cursed_cloth', chance: 22 }, { itemId: 'curse_shard', chance: 9 }, { itemId: 'ectoplasm', chance: 30 }, { itemId: 'dark_wing', chance: 18 }],
    specialAttacks: ['screech', 'death_curse'],
    zones: ['shrine'],
    lore: 'Dơi nhỏ sống nhờ tiếng chuông chết. Vết cắn của nó để lại lời nguyền âm ỉ trong máu.'
  },
  candle_wraith: {
    id: 'candle_wraith', name: 'Candle Wraith', icon: '🕯️', level: 5,
    hp: 92, atk: 26, def: 8, expReward: 118, goldMin: 25, goldMax: 58,
    drops: [{ itemId: 'holy_ash', chance: 45 }, { itemId: 'beeswax', chance: 28 }, { itemId: 'moonwater', chance: 8 }, { itemId: 'ancient_book', chance: 8 }],
    specialAttacks: ['drain_mp', 'hex_bolt'],
    zones: ['shrine'],
    lore: 'Bóng ma trú trong ngọn nến xanh, đốt cạn mana của kẻ dám thắp sáng hành lang cấm.'
  },
  shrine_watcher: {
    id: 'shrine_watcher', name: 'Shrine Watcher', icon: '🧿', level: 6,
    hp: 108, atk: 31, def: 10, expReward: 145, goldMin: 32, goldMax: 70,
    drops: [{ itemId: 'rune_stone', chance: 25 }, { itemId: 'mana_crystal', chance: 28 }, { itemId: 'ancient_rune', chance: 5 }, { itemId: 'ancient_book', chance: 9 }],
    specialAttacks: ['mind_crush', 'hex_bolt'],
    zones: ['shrine'],
    lore: 'Con mắt đá treo trên cổng đền. Nó không chớp mắt, nhưng mọi lỗi lầm của bạn đều bị nhìn thấy.'
  },
  possessed_relic: {
    id: 'possessed_relic', name: 'Possessed Relic', icon: '⚱️', level: 6,
    hp: 118, atk: 27, def: 14, expReward: 150, goldMin: 34, goldMax: 74,
    drops: [{ itemId: 'shrine_relic', chance: 7 }, { itemId: 'ancient_relic', chance: 8 }, { itemId: 'mirror_shard', chance: 12 }, { itemId: 'ancient_book', chance: 10 }],
    specialAttacks: ['idol_curse', 'shatter_guard'],
    zones: ['shrine'],
    lore: 'Một cổ vật bị linh hồn bám vào. Mỗi vết nứt trên thân bình phản chiếu một khuôn mặt khác nhau.'
  },
  shrine_guardian: {
    id: 'shrine_guardian', name: 'Broken Guardian', icon: '🗿', level: 7,
    hp: 260, atk: 36, def: 25, expReward: 230, goldMin: 80, goldMax: 145,
    drops: [{ itemId: 'shrine_stone', chance: 75 }, { itemId: 'ancient_bone', chance: 45 }, { itemId: 'purification_stone', chance: 22 }, { itemId: 'shrine_relic', chance: 10 }, { itemId: 'ancient_book', chance: 12 }],
    guaranteedDrops: ['shrine_stone'],
    specialAttacks: ['divine_judgment', 'shatter_guard', 'fortress_stance'],
    zones: ['shrine'], miniboss: true,
    lore: 'Hộ vệ đá đã vỡ một nửa, nhưng cánh tay còn lại vẫn đủ sức nghiền nát kẻ xâm phạm.'
  },
  wraith_priest: {
    id: 'wraith_priest', name: 'Wraith Priest', icon: '🙏', level: 7,
    hp: 225, atk: 40, def: 16, expReward: 240, goldMin: 85, goldMax: 155,
    drops: [{ itemId: 'holy_ash', chance: 70 }, { itemId: 'cursed_cloth', chance: 35 }, { itemId: 'curse_shard', chance: 16 }, { itemId: 'ancient_book', chance: 12 }],
    guaranteedDrops: ['holy_ash'],
    specialAttacks: ['death_curse', 'drain_mp', 'banish'],
    zones: ['shrine'], miniboss: true,
    lore: 'Linh mục đã chết nhưng lời cầu chưa dứt. Mỗi câu kinh kéo máu và mana khỏi cơ thể người sống.'
  },
  mirror_shade: {
    id: 'mirror_shade', name: 'Mirror Shade', icon: '🪞', level: 8,
    hp: 238, atk: 43, def: 14, expReward: 255, goldMin: 90, goldMax: 165,
    drops: [{ itemId: 'mirror_shard', chance: 80 }, { itemId: 'mysterious_shard', chance: 28 }, { itemId: 'curse_shard', chance: 14 }, { itemId: 'ancient_book', chance: 12 }],
    guaranteedDrops: ['mirror_shard'],
    specialAttacks: ['mirror_split', 'skill_echo', 'phase_through'],
    zones: ['shrine'], miniboss: true,
    lore: 'Cái bóng trong gương bước ra trước khi bạn kịp nhìn rõ. Nó dùng chính nỗi sợ của bạn làm vũ khí.'
  },
  echo_demon: {
    id: 'echo_demon', name: 'Echo Demon, Voice Behind the Seal', icon: '👁️', level: 9,
    hp: 760, atk: 56, def: 32, expReward: 760, goldMin: 240, goldMax: 390,
    drops: [
      { itemId: 'demon_seal', chance: 60 },
      { itemId: 'demon_horn', chance: 22 },
      { itemId: 'demon_fang', chance: 18 },
      { itemId: 'echo_core', chance: 28 },
      { itemId: 'ancient_seal', chance: 22 },
      { itemId: 'cursed_cloth', chance: 35 },
      { itemId: 'ancient_book', chance: 35 }
    ],
    guaranteedDrops: ['echo_core', 'ancient_seal'],
    specialAttacks: ['skill_echo', 'mind_crush', 'death_curse'],
    phases: [
      {
        threshold: 0.62,
        phaseIndex: 2,
        name: 'Echo Demon (Unsealed Voice)',
        icon: '🔔',
        atkMult: 1.42,
        specialAttacks: ['skill_echo', 'drain_mp', 'screech', 'mind_crush'],
        transitionMsg: '🔔 **Phong ấn nứt ra — tiếng nói trong đền không còn thì thầm, mà hét thẳng vào linh hồn bạn!**',
        healOnTransition: 0.05,
      },
      {
        threshold: 0.28,
        phaseIndex: 3,
        name: 'Echo Demon (True Echo)',
        icon: '👁️',
        atkMult: 1.95,
        specialAttacks: ['skill_echo', 'mirror_split', 'death_curse', 'divine_judgment'],
        transitionMsg: '👁️ **Tất cả tiếng vọng nhập làm một — Echo Demon bắt chước nhịp tim của bạn.**',
      },
    ],
    zones: ['shrine'], boss: true,
    deathWorldFlag: 'echo_demon_slain',
    lore: 'Thứ nằm sau phong ấn không có hình thật. Nó chỉ mượn tiếng nói, ký ức và nỗi sợ của người bước vào đền.'
  },

  // ── MINES ────────────────────────────────────────────────────────
  cave_troll: {
    id: 'cave_troll', name: 'Grotto Breaker', icon: '👹', level: 5,
    hp: 130, atk: 26, def: 10, expReward: 120, goldMin: 30, goldMax: 60,
    drops: [{ itemId: 'troll_hide', chance: 55 }, { itemId: 'iron_ore', chance: 40 }, { itemId: 'burning_core', chance: 15 }, { itemId: 'ancient_book', chance: 12 }],
    specialAttacks: ['ground_slam', 'rock_throw'],
    zones: ['mines'],
    lore: 'Hung thần hang động, mỗi bước chân làm rung chuyển hầm mỏ.'
  },
  shadow_bat: {
    id: 'shadow_bat', name: 'Blackwing Leech', icon: '🦇', level: 6,
    hp: 100, atk: 30, def: 7, expReward: 140, goldMin: 35, goldMax: 70,
    drops: [{ itemId: 'dark_wing', chance: 55 }, { itemId: 'shadow_essence', chance: 30 }, { itemId: 'black_iron', chance: 10 }, { itemId: 'ancient_book', chance: 12 }],
    specialAttacks: ['blood_drain', 'screech'],
    zones: ['mines'],
    lore: 'Sống trong bóng tối tuyệt đối, hút máu để duy trì sự bất tử.'
  },
  lava_crab: {
    id: 'lava_crab', name: 'Emberclaw Crab', icon: '🦀', level: 6,
    hp: 120, atk: 24, def: 12, expReward: 130, goldMin: 28, goldMax: 55,
    drops: [{ itemId: 'burning_core', chance: 45 }, { itemId: 'iron_ore', chance: 40 }, { itemId: 'stone', chance: 35 }],
    specialAttacks: ['magma_claw', 'heat_burst'],
    zones: ['mines'],
    lore: 'Cua dung nham sống trong lõi núi lửa, mai giáp nóng đỏ rực như than hồng.'
  },
  crystal_spider: {
    id: 'crystal_spider', name: 'Glassweb Spider', icon: '🕷️', level: 7,
    hp: 105, atk: 28, def: 8, expReward: 145, goldMin: 32, goldMax: 65,
    drops: [{ itemId: 'shadow_essence', chance: 40 }, { itemId: 'iron_ore', chance: 30 }, { itemId: 'black_iron', chance: 15 }],
    specialAttacks: ['crystal_web', 'venom_inject'],
    zones: ['mines'],
    lore: 'Nhện pha lê dệt tơ cứng như thép, nọc độc làm tê liệt toàn thân.'
  },
  iron_sentinel: {
    id: 'iron_sentinel', name: 'Rust-Iron Sentinel', icon: '🤖', level: 8,
    hp: 150, atk: 32, def: 20, expReward: 170, goldMin: 40, goldMax: 75,
    drops: [{ itemId: 'black_iron', chance: 50 }, { itemId: 'iron_ore', chance: 60 }, { itemId: 'troll_hide', chance: 20 }],
    specialAttacks: ['iron_crush', 'fortress_stance'],
    zones: ['mines'],
    lore: 'Bộ giáp sắt được pháp thuật ban linh hồn, bảo vệ hầm mỏ vĩnh cửu.'
  },

  coal_imp: {
    id: 'coal_imp', name: 'Cinder Imp', icon: '👺', level: 5,
    hp: 92, atk: 25, def: 8, expReward: 105, goldMin: 24, goldMax: 50,
    drops: [{ itemId: 'burning_core', chance: 20 }, { itemId: 'stone', chance: 40 }, { itemId: 'iron_ore', chance: 32 }],
    specialAttacks: ['heat_burst', 'rock_throw'],
    zones: ['mines'],
    lore: 'Tiểu quỷ than chuyên phá đuốc của thợ mỏ, cười khanh khách trong bóng tối.'
  },
  ore_devourer: {
    id: 'ore_devourer', name: 'Oremaw Devourer', icon: '🪱', level: 6,
    hp: 135, atk: 27, def: 15, expReward: 135, goldMin: 32, goldMax: 68,
    drops: [{ itemId: 'iron_ore', chance: 65 }, { itemId: 'silver_ore', chance: 25 }, { itemId: 'black_iron', chance: 12 }],
    specialAttacks: ['ground_slam', 'crystal_web'],
    zones: ['mines'],
    lore: 'Sâu mỏ ăn quặng để lớn lên, để lại đường hầm trống rỗng sau lưng.'
  },
  soot_harpy: {
    id: 'soot_harpy', name: 'Ashwing Harpy', icon: '🪽', level: 7,
    hp: 110, atk: 33, def: 8, expReward: 150, goldMin: 36, goldMax: 76,
    drops: [{ itemId: 'dark_wing', chance: 45 }, { itemId: 'shadow_essence', chance: 28 }, { itemId: 'black_iron', chance: 10 }],
    specialAttacks: ['screech', 'phantom_shot'],
    zones: ['mines'],
    lore: 'Điểu nữ phủ bồ hóng bay trong giếng thông gió, lao xuống như mũi tên đen.'
  },
  molten_jailer: {
    id: 'molten_jailer', name: 'Chain-Molten Jailer', icon: '⛓️', level: 8,
    hp: 150, atk: 32, def: 18, expReward: 180, goldMin: 42, goldMax: 88,
    drops: [{ itemId: 'black_iron', chance: 42 }, { itemId: 'burning_core', chance: 35 }, { itemId: 'cursed_blood', chance: 8 }],
    specialAttacks: ['magma_claw', 'entangle', 'iron_crush'],
    zones: ['mines'],
    lore: 'Cai ngục dung nham kéo theo xiềng xích đỏ rực, giam giữ cả tiếng hét trong đá.'
  },
  slag_brute: {
    id: 'slag_brute', name: 'Slagbound Brute', icon: '🧱', level: 9,
    hp: 285, atk: 49, def: 25, expReward: 260, goldMin: 90, goldMax: 170,
    drops: [{ itemId: 'black_iron', chance: 70 }, { itemId: 'troll_hide', chance: 42 }, { itemId: 'colossus_core', chance: 8 }, { itemId: 'ancient_book', chance: 10 }],
    specialAttacks: ['ground_slam', 'iron_crush', 'fortress_stance'],
    zones: ['mines'], miniboss: true,
    lore: 'Khối xỉ thép mang hình người, mỗi cú đấm nện xuống như búa máy.'
  },
  rustbound_foreman: {
    id: 'rustbound_foreman', name: 'Rustbound Taskmaster', icon: '👷', level: 9,
    hp: 258, atk: 45, def: 27, expReward: 275, goldMin: 95, goldMax: 180,
    drops: [{ itemId: 'rusty_gear', chance: 80 }, { itemId: 'black_iron', chance: 55 }, { itemId: 'guard_emblem', chance: 8 }, { itemId: 'ancient_book', chance: 12 }],
    specialAttacks: ['rock_throw', 'fortress_stance', 'seismic_slam'],
    zones: ['mines'], miniboss: true,
    lore: 'Quản đốc mỏ đã chết nhưng vẫn thổi còi bắt mọi linh hồn quay lại làm việc.'
  },
  mine_colossus: {
    id: 'mine_colossus', name: 'Mine Colossus, Heart of the Deep', icon: '🪨', level: 11,
    hp: 900, atk: 62, def: 39, expReward: 850, goldMin: 300, goldMax: 480,
    drops: [
      { itemId: 'ancient_book', chance: 30 },
      { itemId: 'ancient_book', chance: 25 },
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
        atkMult: 1.40,
        specialAttacks: ['seismic_slam', 'iron_crush', 'fortress_stance', 'cave_in'],
        transitionMsg: '🔥 **Lõi dung nham trong ngực Colossus lộ ra — cả hầm mỏ bắt đầu rung chuyển!**',
        healOnTransition: 0.04,
      },
      {
        threshold: 0.25,
        phaseIndex: 3,
        name: 'Mine Colossus (Meltdown)',
        icon: '🌋',
        atkMult: 1.85,
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
    id: 'void_wraith', name: 'Nullveil Wraith', icon: '🌀', level: 8,
    hp: 160, atk: 35, def: 12, expReward: 200, goldMin: 50, goldMax: 100,
    drops: [{ itemId: 'void_essence', chance: 50 }, { itemId: 'broken_soul', chance: 15 }, { itemId: 'abyss_core', chance: 10 }, { itemId: 'ancient_book', chance: 15 }],
    specialAttacks: ['void_drain', 'reality_tear'],
    zones: ['wastes'],
    lore: 'Được sinh ra từ sự hư không, thứ còn lại sau khi linh hồn hoàn toàn tan biến.'
  },
  abyss_watcher: {
    id: 'abyss_watcher', name: 'Abyss Watcher', icon: '👁️', level: 11,
    hp: 225, atk: 43, def: 18, expReward: 320, goldMin: 70, goldMax: 130,
    drops: [{ itemId: 'void_essence', chance: 42 }, { itemId: 'demon_seal', chance: 22 }, { itemId: 'curse_shard', chance: 18 }, { itemId: 'ancient_book', chance: 12 }],
    specialAttacks: ['skill_echo', 'mind_crush'],
    zones: ['wastes'],
    lore: 'Con mắt vực sâu còn sót lại sau khi Echo Demon bị phong ấn. Nó quan sát người sống như đọc một cuốn sách mở.'
  },
  mirage_hunter: {
    id: 'mirage_hunter', name: 'Mirage Stalker', icon: '👤', level: 9,
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
    drops: [{ itemId: 'demon_seal', chance: 26 }, { itemId: 'rune_ink', chance: 25 }, { itemId: 'ancient_book', chance: 8 }],
    specialAttacks: ['mind_crush', 'skill_echo'],
    zones: ['wastes'],
    lore: 'Nhà tiên tri bụi nói bằng giọng của người đã chết, gọi đúng tên nỗi hối tiếc của bạn.'
  },
  eclipse_reaver: {
    id: 'eclipse_reaver', name: 'Eclipse Reaver', icon: '🌘', level: 13,
    hp: 388, atk: 65, def: 27, expReward: 520, goldMin: 160, goldMax: 280,
    drops: [{ itemId: 'abyss_core', chance: 55 }, { itemId: 'void_fragment', chance: 25 }, { itemId: 'eclipse_blade', chance: 4 }, { itemId: 'ancient_book', chance: 10 }],
    specialAttacks: ['abyss_strike', 'reality_tear', 'doom_call'],
    zones: ['wastes'], miniboss: true,
    lore: 'Kẻ gặt nhật thực khoác bóng tối quanh lưỡi hái, cắt cả ánh sáng khỏi vết thương.'
  },
  mirror_knight: {
    id: 'mirror_knight', name: 'Mirror Knight', icon: '🪞', level: 13,
    hp: 410, atk: 61, def: 31, expReward: 540, goldMin: 170, goldMax: 300,
    drops: [{ itemId: 'lost_memory', chance: 35 }, { itemId: 'broken_crown_fragment', chance: 12 }, { itemId: 'void_core', chance: 12 }, { itemId: 'ancient_book', chance: 12 }],
    specialAttacks: ['mirror_split', 'skill_echo', 'forgotten_rage'],
    zones: ['wastes'], miniboss: true,
    lore: 'Kỵ sĩ gương phản chiếu lối đánh của bạn, nhưng không phản chiếu lòng thương xót.'
  },
  the_forgotten: {
    id: 'the_forgotten', name: 'The Forgotten', icon: '❓', level: 16,
    hp: 1250, atk: 78, def: 46, expReward: 1600, goldMin: 550, goldMax: 900,
    drops: [
      { itemId: 'forgotten_crown', chance: 100 },
      { itemId: 'ancient_book', chance: 50 },
      { itemId: 'ancient_book', chance: 50 },
      { itemId: 'broken_soul', chance: 25 },
      { itemId: 'void_fragment', chance: 20 },
      { itemId: 'lost_memory', chance: 35 },
      { itemId: 'abyss_core', chance: 20 }
    ],
    guaranteedDrops: ['fallen_star_fragment'],
    specialAttacks: ['erase', 'butterfly_curse', 'forgotten_rage'],
    phases: [
      {
        threshold: 0.50,
        phaseIndex: 2,
        name: 'The Forgotten (Amnesia Overdrive)',
        icon: '🫥',
        atkMult: 1.80,
        specialAttacks: ['erase', 'reality_tear', 'skill_echo', 'forgotten_rage', 'doom_call'],
        transitionMsg: '🧠 **Ký Ức Sụp Đổ!** Không gian vỡ vụn — các nút kỹ năng bắt đầu méo mó, và lối chạy trốn bị xóa khỏi tâm trí bạn.',
      },
    ],
    zones: ['wastes'], boss: true,
    deathWorldFlag: 'the_forgotten_slain',
    lore: 'Không ai còn nhớ hắn là ai. Hắn tồn tại giữa những mảnh sao rơi — nơi thời gian và tên gọi đã bị xóa khỏi thế giới.'
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
