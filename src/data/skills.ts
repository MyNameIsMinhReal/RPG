export type SkillType = 'active' | 'passive' | 'reaction' | 'world';
export type EffectType = 'burn' | 'poison' | 'slow' | 'stun' | 'dodge' | 'berserk' | 'shield' | 'stone_skin' | 'battle_cry';

export interface PassiveBonus {
  atk?: number;
  def?: number;
  maxHp?: number;
  maxMp?: number;
  mpRegen?: number;
  hpRegen?: number;
  lifesteal?: number;
}

export interface SkillDef {
  id: string;
  name: string;
  icon: string;
  type: SkillType;
  description: string;
  mpCost?: number;
  soulCost?: number;    // Soul Shards consumed on use
  damage?: number;
  heal?: number;
  baseDamage?: number;  // optional explicit flat base (with atkScale)
  atkScale?: number;    // optional explicit ATK multiplier; falls back to auto-scaling
  baseHeal?: number;    // optional explicit flat heal base (with healScale)
  healScale?: number;   // optional explicit % of max HP healed
  targetType?: 'single' | 'all' | 'self';
  effect?: EffectType;
  effectDuration?: number;
  passiveBonus?: PassiveBonus;
  reactionTrigger?: 'on_hit' | 'on_low_hp';
  reactionChance?: number;
  reactionEffect?: string;
  worldEffect?: string;
  learnFrom: string;
}

export const SKILLS: Record<string, SkillDef> = {
  fireball: {
    id: 'fireball', name: 'Fireball', icon: '🔥', type: 'active',
    mpCost: 15, damage: 35, effect: 'burn', effectDuration: 2,
    description: 'Gây **35** sát thương lửa + đốt cháy **2 lượt** (5 dmg/lượt).',
    learnFrom: 'book_fireball'
  },
  ice_lance: {
    id: 'ice_lance', name: 'Ice Lance', icon: '🧊', type: 'active',
    mpCost: 12, damage: 28, effect: 'slow', effectDuration: 2,
    description: 'Gây **28** sát thương băng + làm chậm địch **2 lượt** (−5 ATK).',
    learnFrom: 'book_ice_lance'
  },
  shield_bash: {
    id: 'shield_bash', name: 'Shield Bash', icon: '🛡️', type: 'active',
    mpCost: 8, damage: 20, effect: 'stun', effectDuration: 1,
    description: 'Gây **20** sát thương + choáng địch **1 lượt**.',
    learnFrom: 'book_shield_bash'
  },
  shadow_step: {
    id: 'shadow_step', name: 'Shadow Step', icon: '🌑', type: 'active',
    mpCost: 10, effect: 'dodge', effectDuration: 1,
    description: 'Bước vào bóng tối, **né hoàn toàn** đòn tấn công tiếp theo.',
    learnFrom: 'book_shadow_step'
  },
  mend_wounds: {
    id: 'mend_wounds', name: 'Mend Wounds', icon: '💚', type: 'active',
    mpCost: 20, heal: 45,
    description: 'Hồi phục **45 HP**.',
    learnFrom: 'book_mend_wounds'
  },
  thunder_clap: {
    id: 'thunder_clap', name: 'Thunder Clap', icon: '⚡', type: 'active',
    mpCost: 18, damage: 42, effect: 'stun', effectDuration: 1,
    description: 'Gây **42** sát thương sét + choáng địch **1 lượt**.',
    learnFrom: 'book_thunder_clap'
  },
  iron_skin: {
    id: 'iron_skin', name: 'Iron Skin', icon: '🦾', type: 'passive',
    passiveBonus: { def: 8 },
    description: 'Tăng **DEF +8** vĩnh viễn.',
    learnFrom: 'book_iron_skin'
  },
  berserker: {
    id: 'berserker', name: 'Berserker', icon: '😤', type: 'passive',
    passiveBonus: {},
    description: 'Khi HP < **30%**, tăng ATK thêm **20%**.',
    learnFrom: 'book_berserker'
  },
  mana_flow: {
    id: 'mana_flow', name: 'Mana Flow', icon: '💫', type: 'passive',
    passiveBonus: { maxMp: 15, mpRegen: 2 },
    description: 'Tăng max MP **+15** và hồi **2 MP** mỗi lượt.',
    learnFrom: 'book_mana_flow'
  },
  vampiric: {
    id: 'vampiric', name: 'Vampiric Strike', icon: '🧛', type: 'passive',
    passiveBonus: { lifesteal: 15 },
    description: 'Hút **15%** sát thương tấn công thường thành HP.',
    learnFrom: 'book_vampiric'
  },
  tough_body: {
    id: 'tough_body', name: 'Tough Body', icon: '💪', type: 'passive',
    passiveBonus: { maxHp: 30, hpRegen: 3 },
    description: 'Tăng max HP **+30** và hồi **3 HP** mỗi lượt.',
    learnFrom: 'book_tough_body'
  },
  counter: {
    id: 'counter', name: 'Counter', icon: '🔄', type: 'reaction',
    reactionTrigger: 'on_hit', reactionChance: 40,
    reactionEffect: 'counter_damage',
    description: 'Khi bị tấn công, **40%** cơ hội phản đòn gây **60% ATK**.',
    learnFrom: 'book_counter'
  },
  last_stand: {
    id: 'last_stand', name: 'Last Stand', icon: '🔱', type: 'reaction',
    reactionTrigger: 'on_low_hp',
    reactionEffect: 'atk_boost',
    description: 'Khi HP giảm xuống **< 10%**, tăng ATK **+50%** trong 3 lượt.',
    learnFrom: 'book_last_stand'
  },
  mark_zone: {
    id: 'mark_zone', name: 'Mark Zone', icon: '📍', type: 'world',
    mpCost: 25, worldEffect: 'zone_marked',
    description: 'Đánh dấu zone hiện tại, tăng **drop rate** cho tất cả player trong **24h**.',
    learnFrom: 'book_mark_zone'
  },

  // ── Soul Skills (cost Soul Shards) ────────────────────────────────────
  soul_strike: {
    id: 'soul_strike', name: 'Soul Strike', icon: '💀', type: 'active',
    soulCost: 1, damage: 65,
    description: 'Dùng **1 💀 Soul Shard**. Gây **65** sát thương linh hồn, xuyên 70% DEF.',
    learnFrom: 'book_soul_strike'
  },
  soul_guard: {
    id: 'soul_guard', name: 'Soul Guard', icon: '🛡️💀', type: 'active',
    soulCost: 1, effect: 'shield' as any, effectDuration: 1,
    description: 'Dùng **1 💀 Soul Shard**. Chặn **1 đòn chí mạng hoặc sát thương > 50% HP** tiếp theo.',
    learnFrom: 'book_soul_guard'
  },
  soul_drain: {
    id: 'soul_drain', name: 'Soul Drain', icon: '🌀', type: 'active',
    soulCost: 1, damage: 25, heal: 20,
    description: 'Dùng **1 💀 Soul Shard**. Hút **25 HP + 15 MP** từ kẻ thù.',
    learnFrom: 'book_soul_drain'
  },

  // ── Extra Active Skills ───────────────────────────────────────────────
  arcane_bolt: {
    id: 'arcane_bolt', name: 'Arcane Bolt', icon: '🔮', type: 'active',
    mpCost: 6, damage: 18,
    description: 'Kỹ năng rẻ để giữ nhịp combat. Gây **18** sát thương phép.',
    learnFrom: 'book_arcane_bolt'
  },
  poison_dart: {
    id: 'poison_dart', name: 'Poison Dart', icon: '☠️', type: 'active',
    mpCost: 10, damage: 16, effect: 'poison', effectDuration: 3,
    description: 'Gây **16** sát thương + độc **3 lượt** (4 dmg/lượt).',
    learnFrom: 'book_poison_dart'
  },
  cleave: {
    id: 'cleave', name: 'Cleave', icon: '🪓', type: 'active',
    mpCost: 14, damage: 22, targetType: 'all',
    description: 'Chém rộng, gây **22** sát thương lên toàn bộ kẻ địch.',
    learnFrom: 'book_cleave'
  },
  battle_cry: {
    id: 'battle_cry', name: 'Battle Cry', icon: '📣', type: 'active',
    mpCost: 12, targetType: 'self', effect: 'battle_cry', effectDuration: 3,
    description: 'Gầm chiến trận: **ATK +15%** trong **3 lượt**.',
    learnFrom: 'book_battle_cry'
  },
  guardian_wall: {
    id: 'guardian_wall', name: 'Guardian Wall', icon: '🧱', type: 'active',
    mpCost: 18, targetType: 'self', effect: 'stone_skin', effectDuration: 2,
    description: 'Dựng tường chắn: giảm sát thương nhận **20%** trong 2 lượt và có 1 lớp chắn nguy hiểm.',
    learnFrom: 'book_guardian_wall'
  },
  purify: {
    id: 'purify', name: 'Purify', icon: '✨', type: 'active',
    mpCost: 16, heal: 25, targetType: 'self',
    description: 'Hồi **25 HP** và xóa burn/poison/curse/incoming damage up khỏi bản thân.',
    learnFrom: 'book_purify'
  },
  blood_siphon: {
    id: 'blood_siphon', name: 'Blood Siphon', icon: '🩸', type: 'active',
    mpCost: 18, damage: 32, heal: 18,
    description: 'Hút máu mục tiêu: gây **32** sát thương và hồi **18 HP**.',
    learnFrom: 'book_blood_siphon'
  },
  mana_surge: {
    id: 'mana_surge', name: 'Mana Surge', icon: '🌊', type: 'active',
    mpCost: 0, targetType: 'self',
    description: 'Tập trung ma lực, hồi **35 MP**. Không tốn MP nhưng vẫn mất lượt.',
    learnFrom: 'book_mana_surge'
  },
  frost_nova: {
    id: 'frost_nova', name: 'Frost Nova', icon: '❄️', type: 'active',
    mpCost: 24, damage: 24, targetType: 'all', effect: 'slow', effectDuration: 2,
    description: 'Băng nổ diện rộng: gây **24** sát thương lên toàn bộ kẻ địch + slow **2 lượt**.',
    learnFrom: 'book_frost_nova'
  },
  whirlwind: {
    id: 'whirlwind', name: 'Whirlwind', icon: '🌪️', type: 'active',
    mpCost: 26, damage: 30, targetType: 'all',
    description: 'Xoay kiếm tấn công diện rộng, gây **30** sát thương lên toàn bộ kẻ địch.',
    learnFrom: 'book_whirlwind'
  },
  radiant_smite: {
    id: 'radiant_smite', name: 'Radiant Smite', icon: '🌟', type: 'active',
    mpCost: 22, damage: 40, heal: 12,
    description: 'Đòn thánh quang: gây **40** sát thương và hồi **12 HP**.',
    learnFrom: 'book_radiant_smite'
  },
  venom_cloud: {
    id: 'venom_cloud', name: 'Venom Cloud', icon: '🟢', type: 'active',
    mpCost: 28, damage: 20, targetType: 'all', effect: 'poison', effectDuration: 3,
    description: 'Mây độc diện rộng: gây **20** sát thương lên toàn bộ địch + độc **3 lượt**.',
    learnFrom: 'book_venom_cloud'
  },
  execute: {
    id: 'execute', name: 'Execute', icon: '🗡️', type: 'active',
    mpCost: 24, damage: 34,
    description: 'Kết liễu mục tiêu. Gây **34** sát thương, tăng mạnh nếu mục tiêu dưới **35% HP**.',
    learnFrom: 'book_execute'
  },
  meteor_shower: {
    id: 'meteor_shower', name: 'Meteor Shower', icon: '☄️', type: 'active',
    mpCost: 40, damage: 42, targetType: 'all', effect: 'burn', effectDuration: 2,
    description: 'Mưa thiên thạch: gây **42** sát thương diện rộng + burn **2 lượt**.',
    learnFrom: 'book_meteor_shower'
  },

  // ── Extra Passive Skills ──────────────────────────────────────────────
  blade_mastery: {
    id: 'blade_mastery', name: 'Blade Mastery', icon: '⚔️', type: 'passive',
    passiveBonus: { atk: 6 },
    description: 'Tăng **ATK +6** vĩnh viễn khi đặt trong loadout.',
    learnFrom: 'book_blade_mastery'
  },
  arcane_mind: {
    id: 'arcane_mind', name: 'Arcane Mind', icon: '🧠', type: 'passive',
    passiveBonus: { maxMp: 25, mpRegen: 3 },
    description: 'Tăng max MP **+25** và hồi **3 MP** mỗi lượt.',
    learnFrom: 'book_arcane_mind'
  },
  survival_instinct: {
    id: 'survival_instinct', name: 'Survival Instinct', icon: '🦊', type: 'passive',
    passiveBonus: { def: 4, maxHp: 20 },
    description: 'Tăng **DEF +4** và max HP **+20**.',
    learnFrom: 'book_survival_instinct'
  },
  blood_hunger: {
    id: 'blood_hunger', name: 'Blood Hunger', icon: '🩸', type: 'passive',
    passiveBonus: { lifesteal: 8 },
    description: 'Hút **8%** sát thương tấn công thường thành HP.',
    learnFrom: 'book_blood_hunger'
  },

  // ── Extra Soul Skill ──────────────────────────────────────────────────
  void_rift: {
    id: 'void_rift', name: 'Void Rift', icon: '🕳️', type: 'active',
    soulCost: 2, damage: 55, targetType: 'all', effect: 'slow', effectDuration: 2,
    description: 'Dùng **2 💀 Soul Shards**. Xé rách hư không, gây **55** sát thương diện rộng + slow **2 lượt**.',
    learnFrom: 'book_void_rift'
  },

  soul_offering: {
    id: 'soul_offering', name: 'Soul Offering', icon: '💀', type: 'world',
    worldEffect: 'soul_drop',
    description: 'Hy sinh **20% HP tối đa**, rải Soul Shards tại zone hiện tại.',
    learnFrom: 'book_soul_offering'
  },

  // ── New Skills — Tier 1 (basic, low cost) ────────────────────────────
  stone_toss: {
    id: 'stone_toss', name: 'Stone Toss', icon: '🪨', type: 'active',
    mpCost: 8, damage: 22,
    description: 'Ném đá vào kẻ thù. Gây **22** sát thương vật lý — rẻ và đáng tin cậy.',
    learnFrom: 'book_stone_toss'
  },
  quick_mend: {
    id: 'quick_mend', name: 'Quick Mend', icon: '💉', type: 'active',
    mpCost: 10, heal: 28, targetType: 'self',
    description: 'Băng bó nhanh trong combat. Hồi **28 HP** với chi phí thấp.',
    learnFrom: 'book_quick_mend'
  },
  static_shock: {
    id: 'static_shock', name: 'Static Shock', icon: '🌩️', type: 'active',
    mpCost: 9, damage: 20, effect: 'slow', effectDuration: 1,
    description: 'Phóng điện nhẹ. Gây **20** sát thương + làm chậm địch **1 lượt**.',
    learnFrom: 'book_static_shock'
  },

  // ── New Skills — Tier 2 (mid-range) ──────────────────────────────────
  spectral_blade: {
    id: 'spectral_blade', name: 'Spectral Blade', icon: '👻', type: 'active',
    mpCost: 20, damage: 48,
    description: 'Lưỡi kiếm ma. Gây **48** sát thương thuần — không bị giảm bởi nhiều buff DEF.',
    learnFrom: 'book_spectral_blade'
  },
  ice_barrier: {
    id: 'ice_barrier', name: 'Ice Barrier', icon: '🧊', type: 'active',
    mpCost: 20, targetType: 'self', effect: 'stone_skin', effectDuration: 3,
    description: 'Tạo vách băng bảo vệ. Giảm **sát thương nhận** trong **3 lượt**. Không gây sát thương.',
    learnFrom: 'book_ice_barrier'
  },
  chain_lightning: {
    id: 'chain_lightning', name: 'Chain Lightning', icon: '⚡', type: 'active',
    mpCost: 24, damage: 26, targetType: 'all', effect: 'slow', effectDuration: 1,
    description: 'Sét dây chuyền. Gây **26** sát thương lên toàn bộ địch + làm chậm **1 lượt**.',
    learnFrom: 'book_chain_lightning'
  },
  dark_pact: {
    id: 'dark_pact', name: 'Dark Pact', icon: '🌑', type: 'active',
    mpCost: 26, damage: 58,
    description: 'Giao kết bóng tối. Gây **58** sát thương mạnh vào một mục tiêu. Không có hiệu ứng phụ.',
    learnFrom: 'book_dark_pact'
  },

  // ── New Skills — Tier 3 (powerful) ───────────────────────────────────
  inferno: {
    id: 'inferno', name: 'Inferno', icon: '🌋', type: 'active',
    mpCost: 35, damage: 28, targetType: 'all', effect: 'burn', effectDuration: 3,
    description: 'Địa ngục lửa. Gây **28** sát thương diện rộng + **burn 3 lượt** (5 dmg/lượt).',
    learnFrom: 'book_inferno'
  },
  void_step: {
    id: 'void_step', name: 'Void Step', icon: '🌀', type: 'active',
    mpCost: 28, heal: 20, targetType: 'self', effect: 'dodge', effectDuration: 2,
    description: 'Bước qua hư không. Né đòn **2 lượt** + hồi **20 HP** khi ẩn.',
    learnFrom: 'book_void_step'
  },

  // ── New Passive Skills ────────────────────────────────────────────────
  iron_will: {
    id: 'iron_will', name: 'Iron Will', icon: '🦺', type: 'passive',
    passiveBonus: { def: 5, maxHp: 25 },
    description: 'Ý chí thép. Tăng **DEF +5** và **max HP +25** vĩnh viễn.',
    learnFrom: 'book_iron_will'
  },
  elemental_focus: {
    id: 'elemental_focus', name: 'Elemental Focus', icon: '🎯', type: 'passive',
    passiveBonus: { maxMp: 20, mpRegen: 4 },
    description: 'Tập trung nguyên tố. Tăng **max MP +20** và hồi **4 MP** mỗi lượt.',
    learnFrom: 'book_elemental_focus'
  },
  swift_strike: {
    id: 'swift_strike', name: 'Swift Strike', icon: '💨', type: 'passive',
    passiveBonus: { atk: 8 },
    description: 'Tấn công nhanh. Tăng **ATK +8** vĩnh viễn.',
    learnFrom: 'book_swift_strike'
  },
};

// ── Tier pools for random sealed tomes ───────────────────────────────────
export const SKILL_TIER_POOLS: Record<'t1' | 't2' | 't3', string[]> = {
  t1: [
    'arcane_bolt', 'mend_wounds', 'ice_lance', 'shield_bash', 'poison_dart',
    'stone_toss', 'quick_mend', 'static_shock', 'battle_cry', 'blood_siphon',
  ],
  t2: [
    'fireball', 'shadow_step', 'thunder_clap', 'cleave', 'mana_surge', 'purify',
    'radiant_smite', 'guardian_wall', 'iron_skin', 'tough_body', 'blade_mastery',
    'blood_hunger', 'iron_will', 'elemental_focus',
    'spectral_blade', 'ice_barrier', 'chain_lightning', 'dark_pact',
  ],
  t3: [
    'frost_nova', 'whirlwind', 'venom_cloud', 'execute', 'meteor_shower',
    'inferno', 'void_step', 'swift_strike',
    'berserker', 'mana_flow', 'vampiric', 'arcane_mind', 'survival_instinct',
    'counter', 'last_stand', 'mark_zone',
    'soul_strike', 'soul_guard', 'soul_drain', 'void_rift', 'soul_offering',
  ],
};

export function getSkill(id: string): SkillDef | undefined {
  return SKILLS[id];
}
