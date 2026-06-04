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
    drops: [{ itemId: 'herb', chance: 40 }, { itemId: 'book_fireball', chance: 5 }],
    specialAttacks: ['petal_storm'],
    zones: ['forest'],
    lore: 'Một tinh linh rừng nhỏ bị nhiễm độc bởi bóng tối.'
  },
  cursed_wolf: {
    id: 'cursed_wolf', name: 'Cursed Wolf', icon: '🐺', level: 2,
    hp: 65, atk: 14, def: 5, expReward: 40, goldMin: 10, goldMax: 25,
    drops: [{ itemId: 'wolf_fang', chance: 50 }, { itemId: 'book_berserker', chance: 8 }],
    specialAttacks: ['double_bite', 'howl'],
    zones: ['forest'],
    lore: 'Bị lời nguyền biến thành quái vật, đôi mắt đỏ rực bùng cháy.'
  },
  vine_golem: {
    id: 'vine_golem', name: 'Vine Golem', icon: '🌿', level: 3,
    hp: 90, atk: 16, def: 12, expReward: 65, goldMin: 20, goldMax: 40,
    drops: [{ itemId: 'ancient_bark', chance: 45 }, { itemId: 'book_iron_skin', chance: 10 }],
    specialAttacks: ['entangle'],
    zones: ['forest'],
    lore: 'Cây cổ thụ ngàn năm bị hồn ma chiếm đóng, rễ cây trở thành nanh vuốt.'
  },
  ancient_oak: {
    id: 'ancient_oak', name: 'Ancient Oak', icon: '🌳', level: 5,
    hp: 200, atk: 22, def: 15, expReward: 200, goldMin: 80, goldMax: 120,
    drops: [
      { itemId: 'book_tough_body', chance: 40 },
      { itemId: 'book_mend_wounds', chance: 30 },
      { itemId: 'elixir', chance: 20 }
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
    drops: [{ itemId: 'bone_shard', chance: 55 }, { itemId: 'book_shadow_step', chance: 8 }],
    specialAttacks: ['piercing_arrow'],
    zones: ['shrine'],
    lore: 'Linh hồn lính canh cổ đền bị giam cầm, vẫn bảo vệ nơi thiêng liêng.'
  },
  phantom: {
    id: 'phantom', name: 'Phantom', icon: '👻', level: 4,
    hp: 80, atk: 20, def: 8, expReward: 85, goldMin: 25, goldMax: 50,
    drops: [{ itemId: 'ectoplasm', chance: 60 }, { itemId: 'book_counter', chance: 10 }],
    specialAttacks: ['drain_mp', 'phase_through'],
    zones: ['shrine'],
    lore: 'Bóng ma không đầu lang thang, tìm kiếm linh hồn để hoàn chỉnh bản thân.'
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
    drops: [{ itemId: 'troll_hide', chance: 50 }, { itemId: 'book_shield_bash', chance: 12 }],
    specialAttacks: ['ground_slam', 'rock_throw'],
    zones: ['mines'],
    lore: 'Hung thần hang động, mỗi bước chân làm rung chuyển hầm mỏ.'
  },
  shadow_bat: {
    id: 'shadow_bat', name: 'Shadow Bat', icon: '🦇', level: 6,
    hp: 100, atk: 30, def: 7, expReward: 140, goldMin: 35, goldMax: 70,
    drops: [{ itemId: 'dark_wing', chance: 55 }, { itemId: 'book_vampiric', chance: 12 }],
    specialAttacks: ['blood_drain', 'screech'],
    zones: ['mines'],
    lore: 'Sống trong bóng tối tuyệt đối, hút máu để duy trì sự bất tử.'
  },
  mine_colossus: {
    id: 'mine_colossus', name: 'Mine Colossus', icon: '🪨', level: 9,
    hp: 450, atk: 38, def: 25, expReward: 600, goldMin: 200, goldMax: 350,
    drops: [
      { itemId: 'book_ice_lance', chance: 30 },
      { itemId: 'book_mana_flow', chance: 25 },
      { itemId: 'colossus_core', chance: 20 }
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
    drops: [{ itemId: 'void_essence', chance: 50 }, { itemId: 'book_mark_zone', chance: 15 }],
    specialAttacks: ['void_drain', 'reality_tear'],
    zones: ['wastes'],
    lore: 'Được sinh ra từ sự hư không, thứ còn lại sau khi linh hồn hoàn toàn tan biến.'
  },
  echo_demon: {
    id: 'echo_demon', name: 'Echo Demon', icon: '👁️', level: 11,
    hp: 220, atk: 42, def: 18, expReward: 320, goldMin: 70, goldMax: 130,
    drops: [{ itemId: 'demon_seal', chance: 45 }, { itemId: 'book_soul_offering', chance: 15 }],
    specialAttacks: ['skill_echo', 'mind_crush'],
    zones: ['wastes'],
    lore: 'Phản chiếu nỗi sợ hãi của người đối diện, bắt chước từng động tác một cách hoàn hảo.'
  },
  the_forgotten: {
    id: 'the_forgotten', name: 'The Forgotten', icon: '❓', level: 14,
    hp: 700, atk: 52, def: 30, expReward: 1200, goldMin: 400, goldMax: 700,
    drops: [
      { itemId: 'forgotten_crown', chance: 100 },
      { itemId: 'book_last_stand', chance: 50 },
      { itemId: 'book_counter', chance: 50 }
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
