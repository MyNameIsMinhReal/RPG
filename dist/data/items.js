"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ITEMS = void 0;
exports.getItem = getItem;
exports.ITEMS = {
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
    // ── MATERIALS ───────────────────────────────────────────────────
    herb: {
        id: 'herb', name: 'Forest Herb', icon: '🌿',
        type: 'material', stackable: true,
        description: 'Thảo dược rừng, dùng để chế tạo.',
        sellPrice: 5
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
    stone: {
        id: 'stone', name: 'Stone', icon: '🪨',
        type: 'material', stackable: true,
        description: 'Đá thô, có thể dùng làm nền tảng cho vật phẩm thiết yếu.',
        sellPrice: 5
    },
    silver_ore: {
        id: 'silver_ore', name: 'Silver Ore', icon: '🥈',
        type: 'material', stackable: true,
        description: 'Quặng bạc lấp lánh, thích hợp cho trang sức và phép thuật.',
        sellPrice: 25
    },
    slime_core: {
        id: 'slime_core', name: 'Slime Core', icon: '🟢',
        type: 'material', stackable: true,
        description: 'Lõi slime dẻo dai, dùng trong chế tạo và nuôi pet tạm thời.',
        sellPrice: 35
    },
    mana_crystal: {
        id: 'mana_crystal', name: 'Mana Crystal', icon: '🔷',
        type: 'material', stackable: true,
        description: 'Tinh thể mana thuần khiết, dùng để tiếp năng lượng phép thuật.',
        sellPrice: 70
    },
    cursed_blood: {
        id: 'cursed_blood', name: 'Cursed Blood', icon: '🩸',
        type: 'material', stackable: true,
        description: 'Máu bị nguyền, chứa sức mạnh đen tối và rủi ro.',
        sellPrice: 45
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
    lost_memory: {
        id: 'lost_memory', name: 'Lost Memory', icon: '💭',
        type: 'key_item', stackable: false,
        description: 'Ký ức bị mất, chứa nội dung của quá khứ lạ lùng.',
        sellPrice: 120
    },
    title_trinket: {
        id: 'title_trinket', name: 'Title Trinket', icon: '🎖️',
        type: 'key_item', stackable: false,
        description: 'Vật phẩm trang trí hiếm, dùng để mở khóa danh xưng đặc biệt.',
        sellPrice: 150
    },
    title_token: {
        id: 'title_token', name: 'Title Token', icon: '🏅',
        type: 'key_item', stackable: false,
        description: 'Token danh xưng, biểu tượng của danh tiếng trên hành trình.',
        sellPrice: 100
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
    book_dark_ritual: {
        id: 'book_dark_ritual', name: 'Tome: Dark Ritual', icon: '📕',
        type: 'skill_book', stackable: false,
        description: 'Học kỹ năng **Dark Ritual 🕯️** với sức mạnh nguyền rủa.',
        teachesSkill: 'dark_ritual', sellPrice: 110, buyPrice: 260
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
    book_soul_offering: {
        id: 'book_soul_offering', name: 'Tome: Soul Offering', icon: '📕',
        type: 'skill_book', stackable: false,
        description: 'Học kỹ năng **Soul Offering 💀**.',
        teachesSkill: 'soul_offering', sellPrice: 100, buyPrice: 250
    }
};
function getItem(id) {
    return exports.ITEMS[id];
}
