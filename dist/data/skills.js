"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SKILLS = void 0;
exports.getSkill = getSkill;
exports.SKILLS = {
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
    soul_offering: {
        id: 'soul_offering', name: 'Soul Offering', icon: '💀', type: 'world',
        worldEffect: 'soul_drop',
        description: 'Hy sinh **20% HP tối đa**, rải Soul Shards tại zone hiện tại.',
        learnFrom: 'book_soul_offering'
    }
};
function getSkill(id) {
    return exports.SKILLS[id];
}
