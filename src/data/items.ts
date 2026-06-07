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
  // ── CONSUMABLES ─────────────────────────────────────────────────
  health_potion: {
    id: 'health_potion', name: 'Health Potion', icon: '🧪',
    type: 'consumable', stackable: true,
    description: 'Hồi phục **45% HP tối đa**.',
    effect: { hpPercent: 0.45 }, sellPrice: 18, buyPrice: 45
  },
  mana_potion: {
    id: 'mana_potion', name: 'Mana Potion', icon: '🔵',
    type: 'consumable', stackable: true,
    description: 'Hồi phục **30% MP tối đa**.',
    effect: { mpPercent: 0.30 }, sellPrice: 14, buyPrice: 35
  },
  elixir: {
    id: 'elixir', name: 'Elixir', icon: '✨',
    type: 'consumable', stackable: true,
    description: 'Hồi phục **100 HP** và **60 MP**.',
    effect: { hp: 100, mp: 60 }, sellPrice: 60
  },
  antidote: {
    id: 'antidote', name: 'Antidote', icon: '💊',
    type: 'consumable', stackable: true,
    description: 'Giải trừ hiệu ứng **poison**.',
    effect: { removeEffect: 'poison', combatOnly: true }, sellPrice: 10, buyPrice: 20
  },
  fate_coin: {
    id: 'fate_coin', name: 'Fate Coin', icon: '🪙',
    type: 'key_item', stackable: true,
    description: 'Đồng xu kỳ lạ có một mặt sáng và một mặt tối. Dùng cho các event định mệnh sau này.',
    sellPrice: 25
  },
  blood_vial: {
    id: 'blood_vial', name: 'Blood Vial', icon: '🩸',
    type: 'consumable', stackable: true,
    description: 'Hồi **35 HP**. Một món hàng cấm của chợ đen.',
    effect: { hp: 35 }, sellPrice: 35, buyPrice: 90
  },
  assassins_smoke: {
    id: 'assassins_smoke', name: "Assassin's Smoke", icon: '💨',
    type: 'consumable', stackable: true,
    description: 'Khói ám sát dùng trong các cuộc cướp shopkeeper. Có thể mở rộng thành debuff trước combat.',
    sellPrice: 60, buyPrice: 180
  },
  black_market_token: {
    id: 'black_market_token', name: 'Black Market Token', icon: '🌑',
    type: 'consumable', stackable: true,
    description: 'Mở đường vào **Chợ Đen** một lần.',
    sellPrice: 75, buyPrice: 220
  },

  minor_healing_potion: {
    id: 'minor_healing_potion', name: 'Minor Healing Potion', icon: '🧪',
    type: 'consumable', stackable: true,
    description: 'Hồi **25% HP tối đa**. Rẻ và ổn cho early game.',
    effect: { hpPercent: 0.25 }, sellPrice: 8, buyPrice: 20
  },
  healing_potion: {
    id: 'healing_potion', name: 'Healing Potion', icon: '🍶',
    type: 'consumable', stackable: true,
    description: 'Hồi **65% HP tối đa**. Phiên bản mạnh hơn Health Potion.',
    effect: { hpPercent: 0.65 }, sellPrice: 30, buyPrice: 75
  },
  emergency_potion: {
    id: 'emergency_potion', name: 'Emergency Potion', icon: '🚨',
    type: 'consumable', stackable: true,
    description: 'Chỉ dùng khi HP dưới **30%**. Hồi **35% HP tối đa**.',
    effect: { hpPercent: 0.35, hpBelowPct: 0.30 }, sellPrice: 28, buyPrice: 75
  },
  mana_flask: {
    id: 'mana_flask', name: 'Mana Flask', icon: '🫙',
    type: 'consumable', stackable: true,
    description: 'Hồi **50% MP tối đa**. Phiên bản mạnh hơn Mana Potion.',
    effect: { mpPercent: 0.50 }, sellPrice: 22, buyPrice: 55
  },
  focus_tonic: {
    id: 'focus_tonic', name: 'Focus Tonic', icon: '💠',
    type: 'consumable', stackable: true,
    description: 'Trận kế tiếp: dùng skill tập trung hơn, nhưng DEF giảm nhẹ.',
    effect: {}, sellPrice: 35, buyPrice: 90
  },
  moonwater: {
    id: 'moonwater', name: 'Moonwater', icon: '🌙',
    type: 'consumable', stackable: true,
    description: 'Hồi **20% MP** và xóa **poison/burn** trong combat.',
    effect: { mpPercent: 0.20, removeEffects: ['poison','burn'] }, sellPrice: 30, buyPrice: 80
  },
  hunter_meal: {
    id: 'hunter_meal', name: 'Hunter’s Meal', icon: '🥩',
    type: 'consumable', stackable: true,
    description: 'Dùng trước explore. Trận kế tiếp: **ATK +10%**.',
    effect: {}, sellPrice: 22, buyPrice: 60
  },
  stone_skin_draught: {
    id: 'stone_skin_draught', name: 'Stone Skin Draught', icon: '🛡️',
    type: 'consumable', stackable: true,
    description: 'Trận kế tiếp: **DEF +15%**.',
    effect: {}, sellPrice: 32, buyPrice: 85
  },
  quickstep_tea: {
    id: 'quickstep_tea', name: 'Quickstep Tea', icon: '⚡',
    type: 'consumable', stackable: true,
    description: 'Trận kế tiếp: né đòn đầu tốt hơn.',
    effect: {}, sellPrice: 28, buyPrice: 75
  },
  rage_elixir: {
    id: 'rage_elixir', name: 'Rage Elixir', icon: '🔥',
    type: 'consumable', stackable: true,
    description: 'Trận kế tiếp: **ATK +25%**, nhưng nhận thêm sát thương.',
    effect: {}, sellPrice: 50, buyPrice: 140
  },
  weapon_oil: {
    id: 'weapon_oil', name: 'Weapon Oil', icon: '🔩',
    type: 'consumable', stackable: true,
    description: 'Vũ khí đang cầm: **+10% damage** trong trận kế tiếp.',
    effect: {}, sellPrice: 20, buyPrice: 55
  },
  armor_polish: {
    id: 'armor_polish', name: 'Armor Polish', icon: '🧼',
    type: 'consumable', stackable: true,
    description: 'Giáp đang mặc: **+10% DEF** trong trận kế tiếp.',
    effect: {}, sellPrice: 20, buyPrice: 55
  },
  scroll_escape: {
    id: 'scroll_escape', name: 'Scroll of Escape', icon: '📜',
    type: 'consumable', stackable: true,
    description: 'Thoát khỏi combat thường. Không dùng với boss/shopkeeper/bounty đặc biệt.',
    effect: { combatOnly: true }, sellPrice: 45, buyPrice: 130
  },
  scroll_detection: {
    id: 'scroll_detection', name: 'Scroll of Detection', icon: '📜',
    type: 'consumable', stackable: true,
    description: 'Lượt explore kế tiếp: tăng event tốt, giảm ambush.',
    effect: {}, sellPrice: 35, buyPrice: 95
  },
  scroll_greed: {
    id: 'scroll_greed', name: 'Scroll of Greed', icon: '📜',
    type: 'consumable', stackable: true,
    description: 'Trận kế tiếp: **Gold +30%**, nhưng enemy **ATK +15%**.',
    effect: {}, sellPrice: 45, buyPrice: 125
  },
  scroll_silence: {
    id: 'scroll_silence', name: 'Scroll of Silence', icon: '📜',
    type: 'consumable', stackable: true,
    description: 'Trong combat: enemy không dùng skill trong **2 lượt**. Không dùng với boss chính.',
    effect: { combatOnly: true }, sellPrice: 50, buyPrice: 140
  },
  fate_dice: {
    id: 'fate_dice', name: 'Fate Dice', icon: '🎲',
    type: 'consumable', stackable: true,
    description: 'Random 1 trong 6 hiệu ứng: hồi HP/MP, gold, buff hoặc xui xẻo.',
    effect: {}, sellPrice: 30, buyPrice: 90
  },
  strange_mushroom: {
    id: 'strange_mushroom', name: 'Strange Mushroom', icon: '🍄',
    type: 'consumable', stackable: true,
    description: '50% buff, 50% debuff nhẹ.',
    effect: {}, sellPrice: 12, buyPrice: 35
  },
  suspicious_fish: {
    id: 'suspicious_fish', name: 'Suspicious Fish', icon: '🐟',
    type: 'consumable', stackable: true,
    description: 'Hồi nhiều HP, nhưng có 30% tác dụng phụ.',
    effect: { hpPercent: 0.40 }, sellPrice: 16, buyPrice: 50
  },
  cooling_salve: {
    id: 'cooling_salve', name: 'Cooling Salve', icon: '🧊',
    type: 'consumable', stackable: true,
    description: 'Xóa **burn** trong combat.',
    effect: { removeEffect: 'burn', combatOnly: true }, sellPrice: 10, buyPrice: 25
  },
  purifying_salt: {
    id: 'purifying_salt', name: 'Purifying Salt', icon: '✨',
    type: 'consumable', stackable: true,
    description: 'Xóa **curse nhẹ** trong combat.',
    effect: { removeEffect: 'curse', combatOnly: true }, sellPrice: 18, buyPrice: 45
  },
  warding_charm: {
    id: 'warding_charm', name: 'Warding Charm', icon: '🧿',
    type: 'consumable', stackable: true,
    description: 'Chặn 1 debuff tiếp theo trong combat.',
    effect: { combatOnly: true }, sellPrice: 45, buyPrice: 110
  },
  fake_identity: {
    id: 'fake_identity', name: 'Fake Identity', icon: '🎭',
    type: 'consumable', stackable: true,
    description: 'Shop kế tiếp: giảm giá **10%**. Không hiệu quả nếu vừa cướp shopkeeper quá nhiều.',
    effect: {}, sellPrice: 45, buyPrice: 130
  },
  bribe_coin: {
    id: 'bribe_coin', name: 'Bribe Coin', icon: '🪙',
    type: 'consumable', stackable: true,
    description: 'Khi gặp **Bounty Hunter**, dùng để né combat/thay tiền hối lộ.',
    effect: {}, sellPrice: 55, buyPrice: 150
  },
  apology_letter: {
    id: 'apology_letter', name: 'Apology Letter', icon: '📜',
    type: 'consumable', stackable: true,
    description: 'Reputation +10, giá shop thế giới -2%.',
    effect: {}, sellPrice: 50, buyPrice: 160
  },
  arson_bottle: {
    id: 'arson_bottle', name: 'Arson Bottle', icon: '🔥',
    type: 'consumable', stackable: true,
    description: 'Trong combat: ném bom lửa gây **sát thương trực tiếp**. Không dùng với boss lớn.',
    effect: { combatOnly: true }, sellPrice: 42, buyPrice: 120
  },
  cracked_soul_charm: {
    id: 'cracked_soul_charm', name: 'Cracked Soul Charm', icon: '💀',
    type: 'consumable', stackable: true,
    description: 'Tự kích hoạt khi HP về 0: **25%** sống sót với 1 HP. Item vỡ sau khi kích hoạt.',
    effect: { passiveOnly: true }, sellPrice: 120, buyPrice: 420
  },


  bread: {
    id: 'bread', name: 'Bread', icon: '🍞',
    type: 'consumable', stackable: true,
    description: 'Ổ bánh mì đơn giản từ xe tiếp tế. Hồi **15% HP tối đa**.',
    effect: { hpPercent: 0.15 }, sellPrice: 6, buyPrice: 18
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
    description: 'Token thương nhân. Có thể mở rộng để giảm giá shop trong lần mua sau.',
    sellPrice: 80
  },
  rune_charm: {
    id: 'rune_charm', name: 'Rune Charm', icon: '🧿',
    type: 'consumable', stackable: true,
    description: 'Bùa rune dùng một lần, có thể mở rộng để chặn debuff trong combat.',
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
    description: '**Passive:** Khi chết, hồi sinh với **1 HP** thay vì mất nhân vật (1 lần/mang theo).',
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
  }
};

export function getItem(id: string): ItemDef | undefined {
  return ITEMS[id];
}
