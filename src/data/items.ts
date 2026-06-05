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
    removeEffect?: string;
  };
  teachesSkill?: string;
  stackable: boolean;
}

export const ITEMS: Record<string, ItemDef> = {
  // ── CONSUMABLES ─────────────────────────────────────────────────
  health_potion: {
    id: 'health_potion', name: 'Health Potion', icon: '🧪',
    type: 'consumable', stackable: true,
    description: 'Hồi phục **50 HP**.',
    effect: { hp: 50 }, sellPrice: 15, buyPrice: 30
  },
  mana_potion: {
    id: 'mana_potion', name: 'Mana Potion', icon: '🔵',
    type: 'consumable', stackable: true,
    description: 'Hồi phục **30 MP**.',
    effect: { mp: 30 }, sellPrice: 12, buyPrice: 25
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
    description: 'Giải trừ hiệu ứng **burn**.',
    effect: { removeEffect: 'burn' }, sellPrice: 10, buyPrice: 20
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
    type: 'key_item', stackable: true,
    description: 'Dấu hiệu của chợ đen. Người có danh tiếng thấp sẽ được nhận ra.',
    sellPrice: 75
  },

  // ── MATERIALS ───────────────────────────────────────────────────
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
  wolf_fang: {
    id: 'wolf_fang', name: 'Wolf Fang', icon: '🦷',
    type: 'material', stackable: true,
    description: 'Nanh sói nguyền rủa, phát ra khí lạnh.',
    sellPrice: 20
  },
  ancient_bark: {
    id: 'ancient_bark', name: 'Ancient Bark', icon: '🪵',
    type: 'material', stackable: true,
    description: 'Vỏ cây cổ thụ ngàn tuổi, rắn như thép.',
    sellPrice: 25
  },
  bone_shard: {
    id: 'bone_shard', name: 'Bone Shard', icon: '🦴',
    type: 'material', stackable: true,
    description: 'Mảnh xương của chiến binh đã khuất.',
    sellPrice: 15
  },
  ectoplasm: {
    id: 'ectoplasm', name: 'Ectoplasm', icon: '🫧',
    type: 'material', stackable: true,
    description: 'Tinh chất linh hồn, dùng để làm vật phẩm phép thuật.',
    sellPrice: 30
  },
  troll_hide: {
    id: 'troll_hide', name: 'Troll Hide', icon: '🧱',
    type: 'material', stackable: true,
    description: 'Da troll cứng như đá, tái sinh chậm sau khi tách ra.',
    sellPrice: 40
  },
  dark_wing: {
    id: 'dark_wing', name: 'Dark Wing', icon: '🖤',
    type: 'material', stackable: true,
    description: 'Cánh dơi bóng tối, hấp thụ ánh sáng hoàn toàn.',
    sellPrice: 45
  },
  void_essence: {
    id: 'void_essence', name: 'Void Essence', icon: '🌑',
    type: 'material', stackable: true,
    description: 'Tinh chất hư không, không có hình dạng cố định.',
    sellPrice: 80
  },
  demon_seal: {
    id: 'demon_seal', name: 'Demon Seal', icon: '🔮',
    type: 'material', stackable: true,
    description: 'Con dấu của quỷ Echo, ghi khắc ký ức kẻ khác.',
    sellPrice: 100
  },
  shrine_relic: {
    id: 'shrine_relic', name: 'Shrine Relic', icon: '⚱️',
    type: 'key_item', stackable: false,
    description: 'Tàn tích thiêng liêng của đền cổ, tỏa ra hào quang yếu ớt.',
    sellPrice: 200
  },
  colossus_core: {
    id: 'colossus_core', name: 'Colossus Core', icon: '💎',
    type: 'key_item', stackable: false,
    description: 'Lõi năng lượng của Colossus, vẫn còn nóng đỏ.',
    sellPrice: 350
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
  legacy_pendant: {
    id: 'legacy_pendant', name: 'Legacy Pendant', icon: '📿',
    type: 'consumable', stackable: false,
    description: '**Passive:** Khi tìm thấy Legacy, nhận thêm **50% gold** và chance nhận skill cao hơn.',
    sellPrice: 150
  },
  soulbound_scroll: {
    id: 'soulbound_scroll', name: 'Soulbound Scroll', icon: '📜',
    type: 'consumable', stackable: false,
    description: 'Khóa **1 item** — item đó không mất khi chết.',
    sellPrice: 250
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
