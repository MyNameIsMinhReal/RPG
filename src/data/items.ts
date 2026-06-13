export type ItemType = 'consumable' | 'material' | 'skill_book' | 'key_item';

export interface ItemDef {
  id: string;
  name: string;
  icon: string;
  type: ItemType;
  description: string;
  sellPrice?: number;
  buyPrice?: number;
  effect?: {
    hp?: number;
    mp?: number;
    hpPercent?: number;
    mpPercent?: number;
    removeEffect?: string;
    removeEffects?: string[];
    hpBelowPct?: number;
    combatOnly?: boolean;
    passiveOnly?: boolean;
  };
  teachesSkill?: string;
  stackable: boolean;
}

export const ITEMS: Record<string, ItemDef> = {

  // ══════════════════════════════════════════════════════════════════════
  //  KNOWLEDGE TOKENS — dùng để học skill, không còn dùng book lẻ
  // ══════════════════════════════════════════════════════════════════════
  ancient_book: {
    id: 'ancient_book', name: 'Ancient Book', icon: '📖',
    type: 'key_item', stackable: true,
    description: 'Cổ thư kỹ năng. Mang về Hội Quán ở làng để nghiên cứu, hoặc gặp event học trực tiếp ngoài đường.',
    sellPrice: 80, buyPrice: 240
  },

  // Echo Demon ritual key items — thu thập từ event "Tiếng Vọng" ở Đền Cổ (shrine).
  // Dùng để mở Cổng Phong Ấn / Nghi Lễ triệu hồi Echo Demon.
  echo_trace: {
    id: 'echo_trace', name: 'Echo Trace', icon: '👁️',
    type: 'key_item', stackable: true,
    description: 'Dấu Tiếng Vọng. Mảnh ký ức rò rỉ từ sau phong ấn Đền Cổ — một trong các vật phẩm để mở Nghi Lễ Echo Demon.',
    sellPrice: 40
  },
  soul_candle: {
    id: 'soul_candle', name: 'Soul Candle', icon: '🕯️',
    type: 'key_item', stackable: true,
    description: 'Nến Linh Hồn. Ngọn lửa không bao giờ tắt trong Đền Cổ — một trong các vật phẩm để mở Nghi Lễ Echo Demon.',
    sellPrice: 40
  },
  mirror_sigil: {
    id: 'mirror_sigil', name: 'Mirror Sigil', icon: '🪞',
    type: 'key_item', stackable: true,
    description: 'Ấn Gương. Phản chiếu thứ không có thật — một trong các vật phẩm để mở Nghi Lễ Echo Demon.',
    sellPrice: 40
  },

  // ══════════════════════════════════════════════════════════════════════
  //  CONSUMABLES — Tier 1: Early game, rẻ, dễ kiếm
  // ══════════════════════════════════════════════════════════════════════
  bread: {
    id: 'bread', name: 'Bread', icon: '🍞',
    type: 'consumable', stackable: true,
    description: 'Ổ bánh mì đơn giản. Hồi **15% HP tối đa**.',
    effect: { hpPercent: 0.15 }, sellPrice: 6, buyPrice: 18
  },
  minor_healing_potion: {
    id: 'minor_healing_potion', name: 'Minor Healing Potion', icon: '🩺',
    type: 'consumable', stackable: true,
    description: 'Thuốc hồi máu nhỏ. Hồi **25% HP tối đa**.',
    effect: { hpPercent: 0.25 }, sellPrice: 8, buyPrice: 20
  },
  mana_potion: {
    id: 'mana_potion', name: 'Mana Potion', icon: '🔵',
    type: 'consumable', stackable: true,
    description: 'Bình mana cơ bản. Hồi **30% MP tối đa**.',
    effect: { mpPercent: 0.30 }, sellPrice: 14, buyPrice: 35
  },
  antidote: {
    id: 'antidote', name: 'Antidote', icon: '💊',
    type: 'consumable', stackable: true,
    description: 'Giải trừ **poison** ngay lập tức trong combat.',
    effect: { removeEffect: 'poison', combatOnly: true }, sellPrice: 10, buyPrice: 20
  },
  cooling_salve: {
    id: 'cooling_salve', name: 'Cooling Salve', icon: '🧊',
    type: 'consumable', stackable: true,
    description: 'Thuốc bôi lạnh. Xóa **burn** trong combat.',
    effect: { removeEffect: 'burn', combatOnly: true }, sellPrice: 10, buyPrice: 25
  },
  quick_salve: {
    id: 'quick_salve', name: 'Quick Salve', icon: '🩹',
    type: 'consumable', stackable: true,
    description: 'Băng cấp tốc — dùng giữa combat. Hồi **20% HP tối đa** ngay lập tức.',
    effect: { hpPercent: 0.20, combatOnly: true }, sellPrice: 15, buyPrice: 38
  },
  shadow_mana_vial: {
    id: 'shadow_mana_vial', name: 'Shadow Mana Vial', icon: '🫧',
    type: 'consumable', stackable: true,
    description: 'Lọ mana đen. Hồi **15% MP tối đa** ngay trong combat.',
    effect: { mpPercent: 0.15, combatOnly: true }, sellPrice: 12, buyPrice: 30
  },

  // ══════════════════════════════════════════════════════════════════════
  //  CONSUMABLES — Tier 2: Mid game, cân bằng
  // ══════════════════════════════════════════════════════════════════════
  health_potion: {
    id: 'health_potion', name: 'Health Potion', icon: '🧪',
    type: 'consumable', stackable: true,
    description: 'Thuốc hồi máu tiêu chuẩn. Hồi **45% HP tối đa**.',
    effect: { hpPercent: 0.45 }, sellPrice: 18, buyPrice: 45
  },
  mana_flask: {
    id: 'mana_flask', name: 'Mana Flask', icon: '🫙',
    type: 'consumable', stackable: true,
    description: 'Bình mana phổ thông. Hồi **50% MP tối đa**.',
    effect: { mpPercent: 0.50 }, sellPrice: 22, buyPrice: 55
  },
  emergency_potion: {
    id: 'emergency_potion', name: 'Emergency Potion', icon: '🚨',
    type: 'consumable', stackable: true,
    description: 'Chỉ dùng được khi HP dưới **30%**. Hồi **40% HP tối đa**.',
    effect: { hpPercent: 0.40, hpBelowPct: 0.30 }, sellPrice: 28, buyPrice: 75
  },
  moonwater: {
    id: 'moonwater', name: 'Moonwater', icon: '🌙',
    type: 'consumable', stackable: true,
    description: 'Nước ánh trăng. Hồi **20% MP**, xóa **poison/burn** và giảm nhẹ **Ô Nhiễm Linh Hồn**.',
    effect: { mpPercent: 0.20, removeEffects: ['poison', 'burn'] }, sellPrice: 30, buyPrice: 80
  },
  purifying_salt: {
    id: 'purifying_salt', name: 'Purifying Salt', icon: '🧂',
    type: 'consumable', stackable: true,
    description: 'Muối thanh tẩy. Xóa **curse** trong combat, hoặc dùng ngoài combat để giảm **Ô Nhiễm Linh Hồn**.',
    effect: { removeEffect: 'curse' }, sellPrice: 18, buyPrice: 45
  },
  blood_vial: {
    id: 'blood_vial', name: 'Blood Vial', icon: '🩸',
    type: 'consumable', stackable: true,
    description: 'Lọ máu nguyền từ chợ đen. Hồi **30% HP tối đa** — tác dụng phụ chưa rõ.',
    effect: { hpPercent: 0.30 }, sellPrice: 25, buyPrice: 65
  },
  vitality_brew: {
    id: 'vitality_brew', name: 'Vitality Brew', icon: '🍵',
    type: 'consumable', stackable: true,
    description: 'Trà thảo mộc cân bằng. Hồi **25% HP** và **25% MP** cùng lúc.',
    effect: { hpPercent: 0.25, mpPercent: 0.25 }, sellPrice: 30, buyPrice: 80
  },
  forest_tonic: {
    id: 'forest_tonic', name: 'Forest Tonic', icon: '🌿',
    type: 'consumable', stackable: true,
    description: 'Tonic rừng thảo mộc. Hồi **30% HP** + xóa **poison**.',
    effect: { hpPercent: 0.30, removeEffect: 'poison' }, sellPrice: 25, buyPrice: 65
  },
  holy_water: {
    id: 'holy_water', name: 'Holy Water', icon: '💧',
    type: 'consumable', stackable: true,
    description: 'Nước thánh từ đền thờ. Hồi **20% HP**, xóa **curse** và giảm **Ô Nhiễm Linh Hồn**.',
    effect: { hpPercent: 0.20, removeEffect: 'curse' }, sellPrice: 22, buyPrice: 55
  },
  strange_mushroom: {
    id: 'strange_mushroom', name: 'Strange Mushroom', icon: '🍄',
    type: 'consumable', stackable: true,
    description: 'Nấm lạ hái trong rừng. **50% cơ hội** hồi 35% HP — **50%** gây debuff ngẫu nhiên.',
    effect: { hpPercent: 0.35 }, sellPrice: 12, buyPrice: 35
  },
  suspicious_fish: {
    id: 'suspicious_fish', name: 'Suspicious Fish', icon: '🐡',
    type: 'consumable', stackable: true,
    description: 'Cá trông ngon nhưng khó tin. Hồi **40% HP** — **30%** gây đau bụng (debuff nhẹ).',
    effect: { hpPercent: 0.40 }, sellPrice: 16, buyPrice: 50
  },
  warding_charm: {
    id: 'warding_charm', name: 'Warding Charm', icon: '🧿',
    type: 'consumable', stackable: true,
    description: 'Bùa hộ mệnh. Chặn **1 debuff** tiếp theo trong combat.',
    effect: { combatOnly: true }, sellPrice: 45, buyPrice: 110
  },

  // ══════════════════════════════════════════════════════════════════════
  //  CONSUMABLES — Tier 3: Late game, mạnh, đắt
  // ══════════════════════════════════════════════════════════════════════
  healing_potion: {
    id: 'healing_potion', name: 'Healing Potion', icon: '🍶',
    type: 'consumable', stackable: true,
    description: 'Thuốc hồi máu cấp cao. Hồi **65% HP tối đa**.',
    effect: { hpPercent: 0.65 }, sellPrice: 30, buyPrice: 75
  },
  greater_health_potion: {
    id: 'greater_health_potion', name: 'Greater Health Potion', icon: '⚗️',
    type: 'consumable', stackable: true,
    description: 'Thuốc hồi máu tối thượng. Hồi **80% HP tối đa**.',
    effect: { hpPercent: 0.80 }, sellPrice: 60, buyPrice: 150
  },
  mana_vial: {
    id: 'mana_vial', name: 'Mana Vial', icon: '💜',
    type: 'consumable', stackable: true,
    description: 'Lọ tinh chất mana. Hồi **70% MP tối đa**.',
    effect: { mpPercent: 0.70 }, sellPrice: 35, buyPrice: 88
  },
  elixir: {
    id: 'elixir', name: 'Elixir', icon: '✨',
    type: 'consumable', stackable: true,
    description: 'Tinh chất hai nguồn. Hồi **60% HP tối đa** và **40% MP tối đa**.',
    effect: { hpPercent: 0.60, mpPercent: 0.40 }, sellPrice: 60, buyPrice: 150
  },
  grand_restoration: {
    id: 'grand_restoration', name: 'Grand Restoration', icon: '🔮',
    type: 'consumable', stackable: true,
    description: 'Tinh chất phục hồi hoàn toàn. Hồi **50% HP** và **50% MP**.',
    effect: { hpPercent: 0.50, mpPercent: 0.50 }, sellPrice: 80, buyPrice: 200
  },
  supreme_elixir: {
    id: 'supreme_elixir', name: 'Supreme Elixir', icon: '🌟',
    type: 'consumable', stackable: true,
    description: 'Đỉnh cao của thuật bào chế. Hồi **100% HP tối đa** và **80% MP tối đa**.',
    effect: { hpPercent: 1.0, mpPercent: 0.80 }, sellPrice: 150, buyPrice: 420
  },
  berserker_draught: {
    id: 'berserker_draught', name: 'Berserker Draught', icon: '😤',
    type: 'consumable', stackable: true,
    description: 'Chỉ uống được khi HP dưới **20%**. Hồi **50% HP tối đa** — dành cho lúc tuyệt vọng.',
    effect: { hpPercent: 0.50, hpBelowPct: 0.20 }, sellPrice: 45, buyPrice: 120
  },
  crystallized_faith: {
    id: 'crystallized_faith', name: 'Crystallized Faith', icon: '💠',
    type: 'consumable', stackable: true,
    description: 'Tinh thể niềm tin. Hồi **30% HP** + xóa **poison, burn, curse** cùng lúc.',
    effect: { hpPercent: 0.30, removeEffects: ['poison', 'burn', 'curse'] }, sellPrice: 65, buyPrice: 170
  },
  purification_potion: {
    id: 'purification_potion', name: 'Purification Potion', icon: '🌸',
    type: 'consumable', stackable: true,
    description: 'Xóa **tất cả debuff** đang hiện diện trong combat.',
    effect: { removeEffect: 'all', combatOnly: true }, sellPrice: 55, buyPrice: 150
  },
  iron_will_tonic: {
    id: 'iron_will_tonic', name: 'Iron Will Tonic', icon: '💪',
    type: 'consumable', stackable: true,
    description: 'Xóa **stun** và **freeze** trong combat. Hồi **10% HP** sau đó.',
    effect: { removeEffects: ['stun', 'freeze'], hpPercent: 0.10, combatOnly: true }, sellPrice: 30, buyPrice: 75
  },
  void_mana_flask: {
    id: 'void_mana_flask', name: 'Void Mana Flask', icon: '🌀',
    type: 'consumable', stackable: true,
    description: 'Bình mana từ hư không. Hồi **80% MP tối đa** trong combat.',
    effect: { mpPercent: 0.80, combatOnly: true }, sellPrice: 50, buyPrice: 130
  },
  life_crystal_shard: {
    id: 'life_crystal_shard', name: 'Life Crystal Shard', icon: '💎',
    type: 'consumable', stackable: true,
    description: 'Mảnh tinh thể sự sống. Hồi **35% HP** — chỉ dùng được khi HP dưới **50%**.',
    effect: { hpPercent: 0.35, hpBelowPct: 0.50 }, sellPrice: 35, buyPrice: 90
  },

  // ══════════════════════════════════════════════════════════════════════
  //  CONSUMABLES — Combat buffs (hiệu ứng chiến đấu)
  // ══════════════════════════════════════════════════════════════════════
  hunter_meal: {
    id: 'hunter_meal', name: "Hunter's Meal", icon: '🥩',
    type: 'consumable', stackable: true,
    description: 'Bữa thịt thú rừng. Trận kế tiếp: **ATK +10%**.',
    effect: {}, sellPrice: 22, buyPrice: 60
  },
  bone_broth: {
    id: 'bone_broth', name: 'Bone Broth', icon: '🦴',
    type: 'consumable', stackable: true,
    description: 'Canh xương hầm lâu. Hồi **15% HP** và chuẩn bị **DEF +10%** cho trận kế tiếp.',
    effect: { hpPercent: 0.15 }, sellPrice: 20, buyPrice: 50
  },
  stone_skin_draught: {
    id: 'stone_skin_draught', name: 'Stone Skin Draught', icon: '🛡️',
    type: 'consumable', stackable: true,
    description: 'Da đá. Trận kế tiếp: **DEF +15%**.',
    effect: {}, sellPrice: 32, buyPrice: 85
  },
  quickstep_tea: {
    id: 'quickstep_tea', name: 'Quickstep Tea', icon: '🍃',
    type: 'consumable', stackable: true,
    description: 'Trà lá gió. Trận kế tiếp: **tốc độ né tăng**, đòn đầu khó trúng hơn.',
    effect: {}, sellPrice: 28, buyPrice: 75
  },
  focus_tonic: {
    id: 'focus_tonic', name: 'Focus Tonic', icon: '🔹',
    type: 'consumable', stackable: true,
    description: 'Tonic tập trung. Trận kế tiếp: **độ chính xác skill tăng**, nhưng DEF giảm nhẹ.',
    effect: { mpPercent: 0.15 }, sellPrice: 35, buyPrice: 90
  },
  rage_elixir: {
    id: 'rage_elixir', name: 'Rage Elixir', icon: '🔥',
    type: 'consumable', stackable: true,
    description: 'Elixir thịnh nộ. Trận kế tiếp: **ATK +25%** nhưng nhận thêm **15% sát thương**.',
    effect: {}, sellPrice: 50, buyPrice: 140
  },
  weapon_oil: {
    id: 'weapon_oil', name: 'Weapon Oil', icon: '🔩',
    type: 'consumable', stackable: true,
    description: 'Dầu tra vũ khí. Trận kế tiếp: **damage +10%**.',
    effect: {}, sellPrice: 20, buyPrice: 55
  },
  armor_polish: {
    id: 'armor_polish', name: 'Armor Polish', icon: '🧼',
    type: 'consumable', stackable: true,
    description: 'Sáp đánh bóng giáp. Trận kế tiếp: **DEF +10%**.',
    effect: {}, sellPrice: 20, buyPrice: 55
  },
  arson_bottle: {
    id: 'arson_bottle', name: 'Arson Bottle', icon: '💥',
    type: 'consumable', stackable: true,
    description: 'Bom lửa ném tay. Gây **sát thương trực tiếp** trong combat. Không dùng với boss lớn.',
    effect: { combatOnly: true }, sellPrice: 42, buyPrice: 120
  },
  blood_sacrifice_vial: {
    id: 'blood_sacrifice_vial', name: 'Blood Sacrifice Vial', icon: '⚗️',
    type: 'consumable', stackable: true,
    description: 'Tế máu đổi mana. Trong combat: mất **10% HP hiện tại** để hồi **40% MP tối đa**.',
    effect: { combatOnly: true }, sellPrice: 35, buyPrice: 90
  },

  // ══════════════════════════════════════════════════════════════════════
  //  CONSUMABLES — Scrolls & special use
  // ══════════════════════════════════════════════════════════════════════
  scroll_escape: {
    id: 'scroll_escape', name: 'Scroll of Escape', icon: '📜',
    type: 'consumable', stackable: true,
    description: 'Cuộn thoát thân. Thoát khỏi combat thường — không dùng với boss/shopkeeper/bounty.',
    effect: { combatOnly: true }, sellPrice: 45, buyPrice: 130
  },
  scroll_detection: {
    id: 'scroll_detection', name: 'Scroll of Detection', icon: '🔎',
    type: 'consumable', stackable: true,
    description: 'Cuộn trinh sát. Lượt explore kế tiếp: tăng event có lợi, giảm cơ hội bị phục kích.',
    effect: {}, sellPrice: 35, buyPrice: 95
  },
  scroll_greed: {
    id: 'scroll_greed', name: 'Scroll of Greed', icon: '💰',
    type: 'consumable', stackable: true,
    description: 'Cuộn tham lam. Trận kế tiếp: **Gold thu được +30%** nhưng enemy **ATK +15%**.',
    effect: {}, sellPrice: 45, buyPrice: 125
  },
  scroll_silence: {
    id: 'scroll_silence', name: 'Scroll of Silence', icon: '🔇',
    type: 'consumable', stackable: true,
    description: 'Cuộn câm lặng. Enemy không dùng được skill trong **2 lượt**. Không dùng với boss chính.',
    effect: { combatOnly: true }, sellPrice: 50, buyPrice: 140
  },
  scroll_mirror: {
    id: 'scroll_mirror', name: 'Scroll of Mirror', icon: '🪞',
    type: 'consumable', stackable: true,
    description: 'Cuộn phản chiếu. Trong combat: phản lại **50% sát thương** từ đòn kế tiếp của enemy.',
    effect: { combatOnly: true }, sellPrice: 55, buyPrice: 145
  },
  scroll_fortune: {
    id: 'scroll_fortune', name: 'Scroll of Fortune', icon: '🍀',
    type: 'consumable', stackable: true,
    description: 'Cuộn may mắn. Lượt explore kế tiếp: tăng cơ hội event/phần thưởng tốt.',
    effect: {}, sellPrice: 40, buyPrice: 110
  },

  // ══════════════════════════════════════════════════════════════════════
  //  CONSUMABLES — Gamble & random
  // ══════════════════════════════════════════════════════════════════════
  fate_dice: {
    id: 'fate_dice', name: 'Fate Dice', icon: '🎲',
    type: 'consumable', stackable: true,
    description: 'Xúc xắc số phận. Random **1 trong 6 hiệu ứng**: hồi HP/MP lớn, nhận gold, buff, hoặc xui xẻo.',
    effect: {}, sellPrice: 30, buyPrice: 90
  },
  chaos_flask: {
    id: 'chaos_flask', name: 'Chaos Flask', icon: '🌪️',
    type: 'consumable', stackable: true,
    description: 'Bình hỗn loạn. Random hiệu ứng mạnh: hồi phục, buff lớn, nhận gold — hoặc tự chuốc rủi ro.',
    effect: {}, sellPrice: 50, buyPrice: 130
  },

  // ══════════════════════════════════════════════════════════════════════
  //  CONSUMABLES — Passive / auto-trigger
  // ══════════════════════════════════════════════════════════════════════
  cracked_soul_charm: {
    id: 'cracked_soul_charm', name: 'Cracked Soul Charm', icon: '💀',
    type: 'consumable', stackable: true,
    description: '**Passive:** Khi HP về 0, **25% cơ hội** sống sót với 1 HP. Item vỡ sau khi kích hoạt.',
    effect: { passiveOnly: true }, sellPrice: 120, buyPrice: 420
  },
  phoenix_ash_vial: {
    id: 'phoenix_ash_vial', name: 'Phoenix Ash Vial', icon: '🔥',
    type: 'consumable', stackable: true,
    description: '**Passive:** Khi HP về 0, **45% cơ hội** tự hồi **30% HP** và tiếp tục chiến đấu.',
    effect: { hpPercent: 0.30, passiveOnly: true }, sellPrice: 150, buyPrice: 380
  },

  // ══════════════════════════════════════════════════════════════════════
  //  CONSUMABLES — Social / utility
  // ══════════════════════════════════════════════════════════════════════
  fake_identity: {
    id: 'fake_identity', name: 'Fake Identity', icon: '🎭',
    type: 'consumable', stackable: true,
    description: 'Giấy tờ giả. Shop kế tiếp: giảm giá **10%** — không hiệu quả nếu vừa cướp shopkeeper.',
    effect: {}, sellPrice: 45, buyPrice: 130
  },
  bribe_coin: {
    id: 'bribe_coin', name: 'Bribe Coin', icon: '🪙',
    type: 'consumable', stackable: true,
    description: 'Đồng tiền hối lộ đặc biệt. Khi gặp **Bounty Hunter**: né combat hoặc thay thế tiền phạt.',
    effect: {}, sellPrice: 55, buyPrice: 150
  },
  apology_letter: {
    id: 'apology_letter', name: 'Apology Letter', icon: '✉️',
    type: 'consumable', stackable: true,
    description: 'Thư xin lỗi thành tâm. **Reputation +10**, giá shop thế giới giảm **2%**.',
    effect: {}, sellPrice: 50, buyPrice: 160
  },
  assassins_smoke: {
    id: 'assassins_smoke', name: "Assassin's Smoke", icon: '💨',
    type: 'consumable', stackable: true,
    description: 'Khói ám sát. Dùng trước khi cướp shopkeeper: shopkeeper bị giảm DEF lúc mở combat.',
    effect: {}, sellPrice: 60, buyPrice: 180
  },
  black_market_token: {
    id: 'black_market_token', name: 'Black Market Token', icon: '🌑',
    type: 'consumable', stackable: true,
    description: 'Thẻ thông hành chợ đen. Mở đường vào **Chợ Đen** một lần.',
    sellPrice: 75, buyPrice: 220
  },

  // ── Fate Coin (key_item, dùng cho events) ────────────────────────────
  fate_coin: {
    id: 'fate_coin', name: 'Fate Coin', icon: '🪙',
    type: 'key_item', stackable: true,
    description: 'Đồng xu kỳ lạ, một mặt sáng một mặt tối. Dùng cho các event định mệnh đặc biệt.',
    sellPrice: 25
  },

  // ── FISHING MATERIALS ───────────────────────────────────────────
  common_fish: {
    id: 'common_fish', name: 'Common Fish', icon: '🐟',
    type: 'material', stackable: true,
    description: 'Cá bình thường câu được từ suối.',
    sellPrice: 8
  },
  silver_fish: {
    id: 'silver_fish', name: 'Silver Fish', icon: '🐠',
    type: 'material', stackable: true,
    description: 'Cá bạc hiếm, vảy sáng lấp lánh.',
    sellPrice: 22
  },
  golden_fish: {
    id: 'golden_fish', name: 'Golden Fish', icon: '🐡',
    type: 'material', stackable: true,
    description: 'Cá vàng cực hiếm. May mắn mới câu được.',
    sellPrice: 60
  },
  glowing_bait: {
    id: 'glowing_bait', name: 'Glowing Bait', icon: '✨',
    type: 'material', stackable: true,
    description: 'Mồi câu phát sáng — tăng cơ hội cá hiếm.',
    sellPrice: 15
  },
  mystery_shell: {
    id: 'mystery_shell', name: 'Mystery Shell', icon: '🐚',
    type: 'material', stackable: true,
    description: 'Vỏ sò bí ẩn chứa năng lượng biển.',
    sellPrice: 30
  },

  // ── GATHERING MATERIALS ──────────────────────────────────────────
  rare_herb: {
    id: 'rare_herb', name: 'Rare Herb', icon: '🌺',
    type: 'material', stackable: true,
    description: 'Thảo dược quý hiếm chỉ mọc ở vùng đất linh.',
    sellPrice: 20
  },
  glowing_mushroom: {
    id: 'glowing_mushroom', name: 'Glowing Mushroom', icon: '🍄',
    type: 'material', stackable: true,
    description: 'Nấm phát sáng dùng cho các công thức ma pháp.',
    sellPrice: 18
  },
  void_shard: {
    id: 'void_shard', name: 'Void Shard', icon: '🌑',
    type: 'material', stackable: true,
    description: 'Mảnh hư không. Cực hiếm, tỏa ra khí lạnh.',
    sellPrice: 75
  },

  // ── MATERIALS ───────────────────────────────────────────────────
  rune_ink: {
    id: 'rune_ink', name: 'Rune Ink', icon: '🪄',
    type: 'material', stackable: true,
    description: 'Mực rune dùng để craft scroll/rune charm.',
    sellPrice: 24
  },
  bone_glue: {
    id: 'bone_glue', name: 'Bone Glue', icon: '🦴',
    type: 'material', stackable: true,
    description: 'Keo xương dùng để craft đồ undead/cursed.',
    sellPrice: 18
  },
  herb: {
    id: 'herb', name: 'Forest Herb', icon: '🌿',
    type: 'material', stackable: true,
    description: 'Thảo dược rừng, dùng để chế tạo.',
    sellPrice: 5
  },
  ancient_wood: {
    id: 'ancient_wood', name: 'Ancient Wood', icon: '🪵',
    type: 'material', stackable: true,
    description: 'Gỗ cổ thụ thấm mana, dùng để craft trang bị rừng.',
    sellPrice: 18
  },
  broken_rune: {
    id: 'broken_rune', name: 'Broken Rune', icon: '🔹',
    type: 'material', stackable: true,
    description: 'Mảnh rune vỡ lấy từ đền thờ và vết nứt linh hồn.',
    sellPrice: 35
  },
  merchant_seal: {
    id: 'merchant_seal', name: 'Merchant Seal', icon: '🏷️',
    type: 'material', stackable: true,
    description: 'Dấu niêm phong của Hội Thương Nhân, dùng để craft token giao dịch.',
    sellPrice: 45
  },
  soul_dust: {
    id: 'soul_dust', name: 'Soul Dust', icon: '💨',
    type: 'material', stackable: true,
    description: 'Bụi linh hồn còn sót lại sau chuyển sinh.',
    sellPrice: 55
  },
  rusty_gear: {
    id: 'rusty_gear', name: 'Rusty Gear', icon: '⚙️',
    type: 'material', stackable: true,
    description: 'Bánh răng cũ từ bẫy, xe hàng và thợ săn tiền thưởng.',
    sellPrice: 22
  },
  cursed_cloth: {
    id: 'cursed_cloth', name: 'Cursed Cloth', icon: '🧣',
    type: 'material', stackable: true,
    description: 'Mảnh vải nguyền rủa thường xuất hiện ở chợ đen.',
    sellPrice: 40
  },
  discount_token: {
    id: 'discount_token', name: 'Discount Token', icon: '🎟️',
    type: 'consumable', stackable: true,
    description: 'Token thương nhân. Lần gặp shop kế tiếp: giảm giá **15%**.',
    sellPrice: 80
  },
  rune_charm: {
    id: 'rune_charm', name: 'Rune Charm', icon: '🧿',
    type: 'consumable', stackable: true,
    description: 'Bùa rune dùng một lần. Trận combat kế tiếp: tự động chặn **1 debuff**.',
    sellPrice: 75
  },
  ancient_bark: {
    id: 'ancient_bark', name: 'Ancient Bark', icon: '🪵',
    type: 'material', stackable: true,
    description: 'Vỏ cây cổ thụ ngàn tuổi, rắn như thép.',
    sellPrice: 25
  },
  shrine_relic: {
    id: 'shrine_relic', name: 'Shrine Relic', icon: '⚱️',
    type: 'key_item', stackable: false,
    description: 'Tàn tích thiêng liêng của đền cổ, tỏa ra hào quang yếu ớt.',
    sellPrice: 200
  },
  forgotten_crown: {
    id: 'forgotten_crown', name: 'Forgotten Crown', icon: '👑',
    type: 'key_item', stackable: false,
    description: 'Vương miện của kẻ bị lãng quên. Ai đội nó cũng sẽ bị quên lãng.',
    sellPrice: 1000
  },

  // ── SKILL BOOKS ─────────────────────────────────────────────────
  book_fireball: {
    id: 'book_fireball', name: 'Tome: Fireball', icon: '📕',
    type: 'skill_book', stackable: false,
    description: 'Học kỹ năng **Fireball 🔥**.',
    teachesSkill: 'fireball', sellPrice: 50, buyPrice: 120
  },
  book_ice_lance: {
    id: 'book_ice_lance', name: 'Tome: Ice Lance', icon: '📘',
    type: 'skill_book', stackable: false,
    description: 'Học kỹ năng **Ice Lance 🧊**.',
    teachesSkill: 'ice_lance', sellPrice: 45, buyPrice: 100
  },
  book_shield_bash: {
    id: 'book_shield_bash', name: 'Tome: Shield Bash', icon: '📗',
    type: 'skill_book', stackable: false,
    description: 'Học kỹ năng **Shield Bash 🛡️**.',
    teachesSkill: 'shield_bash', sellPrice: 40, buyPrice: 90
  },
  book_shadow_step: {
    id: 'book_shadow_step', name: 'Tome: Shadow Step', icon: '📓',
    type: 'skill_book', stackable: false,
    description: 'Học kỹ năng **Shadow Step 🌑**.',
    teachesSkill: 'shadow_step', sellPrice: 40, buyPrice: 90
  },
  book_mend_wounds: {
    id: 'book_mend_wounds', name: 'Tome: Mend Wounds', icon: '📒',
    type: 'skill_book', stackable: false,
    description: 'Học kỹ năng **Mend Wounds 💚**.',
    teachesSkill: 'mend_wounds', sellPrice: 50, buyPrice: 110
  },
  book_thunder_clap: {
    id: 'book_thunder_clap', name: 'Tome: Thunder Clap', icon: '📙',
    type: 'skill_book', stackable: false,
    description: 'Học kỹ năng **Thunder Clap ⚡**.',
    teachesSkill: 'thunder_clap', sellPrice: 55, buyPrice: 130
  },
  book_iron_skin: {
    id: 'book_iron_skin', name: 'Tome: Iron Skin', icon: '📔',
    type: 'skill_book', stackable: false,
    description: 'Học kỹ năng **Iron Skin 🦾**.',
    teachesSkill: 'iron_skin', sellPrice: 60, buyPrice: 140
  },
  book_berserker: {
    id: 'book_berserker', name: 'Tome: Berserker', icon: '📕',
    type: 'skill_book', stackable: false,
    description: 'Học kỹ năng **Berserker 😤**.',
    teachesSkill: 'berserker', sellPrice: 55, buyPrice: 130
  },
  book_mana_flow: {
    id: 'book_mana_flow', name: 'Tome: Mana Flow', icon: '📘',
    type: 'skill_book', stackable: false,
    description: 'Học kỹ năng **Mana Flow 💫**.',
    teachesSkill: 'mana_flow', sellPrice: 50, buyPrice: 110
  },
  book_vampiric: {
    id: 'book_vampiric', name: 'Tome: Vampiric Strike', icon: '📗',
    type: 'skill_book', stackable: false,
    description: 'Học kỹ năng **Vampiric Strike 🧛**.',
    teachesSkill: 'vampiric', sellPrice: 60, buyPrice: 150
  },
  book_tough_body: {
    id: 'book_tough_body', name: 'Tome: Tough Body', icon: '📓',
    type: 'skill_book', stackable: false,
    description: 'Học kỹ năng **Tough Body 💪**.',
    teachesSkill: 'tough_body', sellPrice: 55, buyPrice: 120
  },
  book_counter: {
    id: 'book_counter', name: 'Tome: Counter', icon: '📒',
    type: 'skill_book', stackable: false,
    description: 'Học kỹ năng **Counter 🔄**.',
    teachesSkill: 'counter', sellPrice: 70, buyPrice: 160
  },
  book_last_stand: {
    id: 'book_last_stand', name: 'Tome: Last Stand', icon: '📙',
    type: 'skill_book', stackable: false,
    description: 'Học kỹ năng **Last Stand 🔱**.',
    teachesSkill: 'last_stand', sellPrice: 80, buyPrice: 200
  },
  book_mark_zone: {
    id: 'book_mark_zone', name: 'Tome: Mark Zone', icon: '📔',
    type: 'skill_book', stackable: false,
    description: 'Học kỹ năng **Mark Zone 📍**.',
    teachesSkill: 'mark_zone', sellPrice: 90, buyPrice: 220
  },

  // ── Soul Skill Books (rare, from Soul Shop) ──────────────────────────────
  book_soul_strike: {
    id: 'book_soul_strike', name: 'Tome: Soul Strike', icon: '📕',
    type: 'skill_book', stackable: false,
    description: 'Học kỹ năng **Soul Strike 💀**.',
    teachesSkill: 'soul_strike', sellPrice: 150
  },
  book_soul_guard: {
    id: 'book_soul_guard', name: 'Tome: Soul Guard', icon: '📘',
    type: 'skill_book', stackable: false,
    description: 'Học kỹ năng **Soul Guard 🛡️**.',
    teachesSkill: 'soul_guard', sellPrice: 150
  },
  book_soul_drain: {
    id: 'book_soul_drain', name: 'Tome: Soul Drain', icon: '📗',
    type: 'skill_book', stackable: false,
    description: 'Học kỹ năng **Soul Drain 🌀**.',
    teachesSkill: 'soul_drain', sellPrice: 150
  },

  // ── Soul Items (special, from Soul Shop) ─────────────────────────────────
  soul_anchor: {
    id: 'soul_anchor', name: 'Soul Anchor', icon: '⚓',
    type: 'consumable', stackable: false,
    description: '**Passive:** Khi chết, tự vỡ để hồi sinh với **1 HP** và tránh mất tiến trình nặng.',
    sellPrice: 300
  },
  purification_stone: {
    id: 'purification_stone', name: 'Purification Stone', icon: '💎',
    type: 'consumable', stackable: true,
    description: 'Xóa toàn bộ **debuff** và **cursed effect** khỏi nhân vật.',
    effect: { removeEffect: 'all' },
    sellPrice: 80
  },
  material_chest: {
    id: 'material_chest', name: 'Material Chest', icon: '📦',
    type: 'consumable', stackable: true,
    description: 'Mở để nhận **2–4 material ngẫu nhiên**.',
    sellPrice: 30
  },
  gear_box: {
    id: 'gear_box', name: 'Gear Box', icon: '🎰',
    type: 'consumable', stackable: true,
    description: 'Mở để nhận **1 trang bị ngẫu nhiên** (Thường→Huyền thoại). Tỉ lệ: Thường 45% · Hiếm 35% · Sử Thi 15% · Huyền Thoại 4% · Thần Thánh 1%. Không bao gồm trang bị Cursed.',
    sellPrice: 80
  },
  cursed_equipment_box: {
    id: 'cursed_equipment_box', name: 'Cursed Equipment Box', icon: '🎁',
    type: 'consumable', stackable: false,
    description: 'Mở ra **1 trang bị Cursed** ngẫu nhiên. Rarity từ Rare trở lên.',
    sellPrice: 200
  },
  soulbound_scroll: {
    id: 'soulbound_scroll', name: 'Soulbound Scroll', icon: '📜',
    type: 'consumable', stackable: false,
    description: 'Khóa **1 item** — item đó không mất khi chết.',
    sellPrice: 250
  },

  // ── Extra Skill Books ─────────────────────────────────────────────────
  book_arcane_bolt: {
    id: 'book_arcane_bolt', name: 'Tome: Arcane Bolt', icon: '📘',
    type: 'skill_book', stackable: false,
    description: 'Học kỹ năng **Arcane Bolt 🔮**.',
    teachesSkill: 'arcane_bolt', sellPrice: 35, buyPrice: 85
  },
  book_poison_dart: {
    id: 'book_poison_dart', name: 'Tome: Poison Dart', icon: '📗',
    type: 'skill_book', stackable: false,
    description: 'Học kỹ năng **Poison Dart ☠️**.',
    teachesSkill: 'poison_dart', sellPrice: 45, buyPrice: 110
  },
  book_cleave: {
    id: 'book_cleave', name: 'Tome: Cleave', icon: '📕',
    type: 'skill_book', stackable: false,
    description: 'Học kỹ năng **Cleave 🪓**.',
    teachesSkill: 'cleave', sellPrice: 50, buyPrice: 125
  },
  book_battle_cry: {
    id: 'book_battle_cry', name: 'Tome: Battle Cry', icon: '📕',
    type: 'skill_book', stackable: false,
    description: 'Học kỹ năng **Battle Cry 📣**.',
    teachesSkill: 'battle_cry', sellPrice: 55, buyPrice: 135
  },
  book_guardian_wall: {
    id: 'book_guardian_wall', name: 'Tome: Guardian Wall', icon: '📗',
    type: 'skill_book', stackable: false,
    description: 'Học kỹ năng **Guardian Wall 🧱**.',
    teachesSkill: 'guardian_wall', sellPrice: 60, buyPrice: 150
  },
  book_purify: {
    id: 'book_purify', name: 'Tome: Purify', icon: '📒',
    type: 'skill_book', stackable: false,
    description: 'Học kỹ năng **Purify ✨**.',
    teachesSkill: 'purify', sellPrice: 55, buyPrice: 140
  },
  book_blood_siphon: {
    id: 'book_blood_siphon', name: 'Tome: Blood Siphon', icon: '📕',
    type: 'skill_book', stackable: false,
    description: 'Học kỹ năng **Blood Siphon 🩸**.',
    teachesSkill: 'blood_siphon', sellPrice: 70, buyPrice: 180
  },
  book_mana_surge: {
    id: 'book_mana_surge', name: 'Tome: Mana Surge', icon: '📘',
    type: 'skill_book', stackable: false,
    description: 'Học kỹ năng **Mana Surge 🌊**.',
    teachesSkill: 'mana_surge', sellPrice: 65, buyPrice: 165
  },
  book_frost_nova: {
    id: 'book_frost_nova', name: 'Tome: Frost Nova', icon: '📘',
    type: 'skill_book', stackable: false,
    description: 'Học kỹ năng **Frost Nova ❄️**.',
    teachesSkill: 'frost_nova', sellPrice: 75, buyPrice: 190
  },
  book_whirlwind: {
    id: 'book_whirlwind', name: 'Tome: Whirlwind', icon: '📕',
    type: 'skill_book', stackable: false,
    description: 'Học kỹ năng **Whirlwind 🌪️**.',
    teachesSkill: 'whirlwind', sellPrice: 80, buyPrice: 210
  },
  book_radiant_smite: {
    id: 'book_radiant_smite', name: 'Tome: Radiant Smite', icon: '📒',
    type: 'skill_book', stackable: false,
    description: 'Học kỹ năng **Radiant Smite 🌟**.',
    teachesSkill: 'radiant_smite', sellPrice: 80, buyPrice: 220
  },
  book_venom_cloud: {
    id: 'book_venom_cloud', name: 'Tome: Venom Cloud', icon: '📗',
    type: 'skill_book', stackable: false,
    description: 'Học kỹ năng **Venom Cloud 🟢**.',
    teachesSkill: 'venom_cloud', sellPrice: 85, buyPrice: 230
  },
  book_execute: {
    id: 'book_execute', name: 'Tome: Execute', icon: '📕',
    type: 'skill_book', stackable: false,
    description: 'Học kỹ năng **Execute 🗡️**.',
    teachesSkill: 'execute', sellPrice: 90, buyPrice: 250
  },
  book_meteor_shower: {
    id: 'book_meteor_shower', name: 'Tome: Meteor Shower', icon: '📙',
    type: 'skill_book', stackable: false,
    description: 'Học kỹ năng **Meteor Shower ☄️**.',
    teachesSkill: 'meteor_shower', sellPrice: 120, buyPrice: 360
  },
  book_blade_mastery: {
    id: 'book_blade_mastery', name: 'Tome: Blade Mastery', icon: '📕',
    type: 'skill_book', stackable: false,
    description: 'Học passive **Blade Mastery ⚔️**.',
    teachesSkill: 'blade_mastery', sellPrice: 70, buyPrice: 180
  },
  book_arcane_mind: {
    id: 'book_arcane_mind', name: 'Tome: Arcane Mind', icon: '📘',
    type: 'skill_book', stackable: false,
    description: 'Học passive **Arcane Mind 🧠**.',
    teachesSkill: 'arcane_mind', sellPrice: 75, buyPrice: 190
  },
  book_survival_instinct: {
    id: 'book_survival_instinct', name: 'Tome: Survival Instinct', icon: '📓',
    type: 'skill_book', stackable: false,
    description: 'Học passive **Survival Instinct 🦊**.',
    teachesSkill: 'survival_instinct', sellPrice: 70, buyPrice: 180
  },
  book_blood_hunger: {
    id: 'book_blood_hunger', name: 'Tome: Blood Hunger', icon: '📗',
    type: 'skill_book', stackable: false,
    description: 'Học passive **Blood Hunger 🩸**.',
    teachesSkill: 'blood_hunger', sellPrice: 85, buyPrice: 230
  },
  book_void_rift: {
    id: 'book_void_rift', name: 'Tome: Void Rift', icon: '📓',
    type: 'skill_book', stackable: false,
    description: 'Học soul skill **Void Rift 🕳️**.',
    teachesSkill: 'void_rift', sellPrice: 220
  },

  book_soul_offering: {
    id: 'book_soul_offering', name: 'Tome: Soul Offering', icon: '📕',
    type: 'skill_book', stackable: false,
    description: 'Học kỹ năng **Soul Offering 💀**.',
    teachesSkill: 'soul_offering', sellPrice: 100, buyPrice: 250
  },

  // ── New skill books (12 new skills) ──────────────────────────────────────
  book_stone_toss: {
    id: 'book_stone_toss', name: 'Tome: Stone Toss', icon: '📗',
    type: 'skill_book', stackable: false,
    description: 'Học kỹ năng **Stone Toss 🪨** — đánh vật lý rẻ.',
    teachesSkill: 'stone_toss', sellPrice: 20, buyPrice: 50
  },
  book_quick_mend: {
    id: 'book_quick_mend', name: 'Tome: Quick Mend', icon: '📗',
    type: 'skill_book', stackable: false,
    description: 'Học kỹ năng **Quick Mend 💉** — hồi máu nhỏ, chi phí thấp.',
    teachesSkill: 'quick_mend', sellPrice: 20, buyPrice: 50
  },
  book_static_shock: {
    id: 'book_static_shock', name: 'Tome: Static Shock', icon: '📗',
    type: 'skill_book', stackable: false,
    description: 'Học kỹ năng **Static Shock 🌩️** — điện nhẹ + làm chậm.',
    teachesSkill: 'static_shock', sellPrice: 22, buyPrice: 55
  },
  book_spectral_blade: {
    id: 'book_spectral_blade', name: 'Tome: Spectral Blade', icon: '📘',
    type: 'skill_book', stackable: false,
    description: 'Học kỹ năng **Spectral Blade 👻** — sát thương đơn mục tiêu cao.',
    teachesSkill: 'spectral_blade', sellPrice: 55, buyPrice: 140
  },
  book_ice_barrier: {
    id: 'book_ice_barrier', name: 'Tome: Ice Barrier', icon: '📘',
    type: 'skill_book', stackable: false,
    description: 'Học kỹ năng **Ice Barrier 🧊** — phòng thủ 3 lượt.',
    teachesSkill: 'ice_barrier', sellPrice: 55, buyPrice: 140
  },
  book_chain_lightning: {
    id: 'book_chain_lightning', name: 'Tome: Chain Lightning', icon: '📘',
    type: 'skill_book', stackable: false,
    description: 'Học kỹ năng **Chain Lightning ⚡** — sét diện rộng + slow.',
    teachesSkill: 'chain_lightning', sellPrice: 60, buyPrice: 150
  },
  book_dark_pact: {
    id: 'book_dark_pact', name: 'Tome: Dark Pact', icon: '📘',
    type: 'skill_book', stackable: false,
    description: 'Học kỹ năng **Dark Pact 🌑** — sát thương đơn mục tiêu rất cao.',
    teachesSkill: 'dark_pact', sellPrice: 65, buyPrice: 165
  },
  book_inferno: {
    id: 'book_inferno', name: 'Tome: Inferno', icon: '📙',
    type: 'skill_book', stackable: false,
    description: 'Học kỹ năng **Inferno 🌋** — lửa diện rộng + burn 3 lượt.',
    teachesSkill: 'inferno', sellPrice: 90, buyPrice: 220
  },
  book_void_step: {
    id: 'book_void_step', name: 'Tome: Void Step', icon: '📙',
    type: 'skill_book', stackable: false,
    description: 'Học kỹ năng **Void Step 🌀** — né 2 lượt + hồi máu.',
    teachesSkill: 'void_step', sellPrice: 90, buyPrice: 220
  },
  book_iron_will: {
    id: 'book_iron_will', name: 'Tome: Iron Will', icon: '📘',
    type: 'skill_book', stackable: false,
    description: 'Học passive **Iron Will 🦺** — DEF +5, max HP +25.',
    teachesSkill: 'iron_will', sellPrice: 55, buyPrice: 140
  },
  book_elemental_focus: {
    id: 'book_elemental_focus', name: 'Tome: Elemental Focus', icon: '📘',
    type: 'skill_book', stackable: false,
    description: 'Học passive **Elemental Focus 🎯** — max MP +20, hồi 4 MP/lượt.',
    teachesSkill: 'elemental_focus', sellPrice: 55, buyPrice: 140
  },
  book_swift_strike: {
    id: 'book_swift_strike', name: 'Tome: Swift Strike', icon: '📙',
    type: 'skill_book', stackable: false,
    description: 'Học passive **Swift Strike 💨** — ATK +8 vĩnh viễn.',
    teachesSkill: 'swift_strike', sellPrice: 70, buyPrice: 180
  },

  // ── Spell Fragments (crafting materials → sealed tomes) ───────────────────
  spell_fragment: {
    id: 'spell_fragment', name: 'Spell Fragment', icon: '🔮',
    type: 'material', stackable: true,
    description: 'Mảnh ma thuật vỡ vụn. Chế tạo **5 mảnh** → **Ancient Book**.',
    sellPrice: 8
  },
  rare_spell_fragment: {
    id: 'rare_spell_fragment', name: 'Rare Spell Fragment', icon: '💜',
    type: 'material', stackable: true,
    description: 'Mảnh ma thuật hiếm. Chế tạo **3 mảnh** → **Ancient Book**.',
    sellPrice: 28
  },
  legendary_spell_fragment: {
    id: 'legendary_spell_fragment', name: 'Legendary Spell Fragment', icon: '⭐',
    type: 'material', stackable: true,
    description: 'Mảnh ma thuật từ boss cổ đại. Chế tạo **1 mảnh** → **2 Ancient Book**.',
    sellPrice: 85
  },

  // ── Sealed Tomes (random skill books from fragment combining) ─────────────
  sealed_tome_t1: {
    id: 'sealed_tome_t1', name: 'Sealed Tome: Common', icon: '📗',
    type: 'skill_book', stackable: true,
    description: 'Tome phong ấn. Dùng để học **1 skill ngẫu nhiên Tier 1** mà bạn chưa biết.',
    teachesSkill: 'random_t1', sellPrice: 40
  },
  sealed_tome_t2: {
    id: 'sealed_tome_t2', name: 'Sealed Tome: Rare', icon: '📘',
    type: 'skill_book', stackable: true,
    description: 'Tome phong ấn hiếm. Dùng để học **1 skill ngẫu nhiên Tier 2** mà bạn chưa biết.',
    teachesSkill: 'random_t2', sellPrice: 95
  },
  sealed_tome_t3: {
    id: 'sealed_tome_t3', name: 'Sealed Tome: Legendary', icon: '📙',
    type: 'skill_book', stackable: true,
    description: 'Tome phong ấn huyền thoại. Dùng để học **1 skill ngẫu nhiên Tier 3** mà bạn chưa biết.',
    teachesSkill: 'random_t3', sellPrice: 190
  },

  // ── Forest food & consumables ────────────────────────────────────────────
  honey: {
    id: 'honey', name: 'Forest Honey', icon: '🍯',
    type: 'consumable', stackable: true,
    description: 'Mật ong rừng nguyên chất. Hồi phục **20% HP tối đa**.',
    effect: { hpPercent: 0.2 }, sellPrice: 12, buyPrice: 30
  },
  forest_fruit: {
    id: 'forest_fruit', name: 'Forest Fruit', icon: '🍒',
    type: 'consumable', stackable: true,
    description: 'Trái cây hoang dã từ rừng sâu. Hồi phục **15% HP tối đa**.',
    effect: { hpPercent: 0.15 }, sellPrice: 6, buyPrice: 15
  },
  meat: {
    id: 'meat', name: 'Raw Meat', icon: '🥩',
    type: 'material', stackable: true,
    description: 'Thịt tươi từ thú rừng. Dùng để chế biến thức ăn hoặc bán.',
    sellPrice: 8
  },
  fish: {
    id: 'fish', name: 'Fresh Fish', icon: '🐟',
    type: 'material', stackable: true,
    description: 'Cá tươi từ suối rừng trong sạch.',
    sellPrice: 6
  },

  // ── Forest key items ─────────────────────────────────────────────────────
  flower_crown: {
    id: 'flower_crown', name: 'Flower Crown', icon: '💐',
    type: 'key_item', stackable: false,
    description: 'Vòng hoa kết từ những bông hoa hoang dã. Mang lại sự bình yên lạ thường.',
    sellPrice: 15
  },
  knight_emblem: {
    id: 'knight_emblem', name: 'Knight Emblem', icon: '🏅',
    type: 'key_item', stackable: false,
    description: 'Huy hiệu của một hiệp sĩ. Bằng chứng về ân nghĩa đã để lại.',
    sellPrice: 80
  },
  bard_song: {
    id: 'bard_song', name: "Bard's Song", icon: '🎵',
    type: 'key_item', stackable: false,
    description: 'Cuộn giấy ghi bài hát từ nhạc sĩ lữ hành. Nhạc điệu nghe lại vẫn còn sống.',
    sellPrice: 40
  },
};

export function getItem(id: string): ItemDef | undefined {
  return ITEMS[id];
}
