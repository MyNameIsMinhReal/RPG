import { CLASSES } from './classes';

export interface AwakeningRequirement {
  level: number;
  gold: number;
  soulShards?: number;
  items?: Array<{ itemId: string; qty: number }>;
}

export interface ClassAwakeningDef {
  from: string[];
  to: string;
  name: string;
  icon: string;
  lore: string;
  requirement: AwakeningRequirement;
}

export const CLASS_AWAKENINGS: ClassAwakeningDef[] = [
  {
    from: ['warrior'], to: 'knight', name: 'Knight', icon: '🛡️',
    lore: 'Từ một chiến binh đơn độc, bạn học cách đứng chắn trước đồng đội.',
    requirement: { level: 10, gold: 500, soulShards: 1, items: [{ itemId: 'iron_ore', qty: 3 }] },
  },
  {
    from: ['mage'], to: 'arcanist', name: 'Arcanist', icon: '🧙',
    lore: 'Ma lực thô được khắc thành trận pháp. Mỗi kỹ năng giờ có trọng lượng hơn.',
    requirement: { level: 10, gold: 500, soulShards: 1, items: [{ itemId: 'mana_crystal', qty: 2 }] },
  },
  {
    from: ['rogue', 'assassin'], to: 'shadowblade', name: 'Shadowblade', icon: '🌑',
    lore: 'Bạn không còn bước trong bóng tối nữa. Bóng tối bước theo bạn.',
    requirement: { level: 10, gold: 550, soulShards: 1, items: [{ itemId: 'shadow_shard', qty: 2 }, { itemId: 'wolf_fang', qty: 1 }] },
  },
  {
    from: ['ranger'], to: 'warden', name: 'Warden', icon: '🌲',
    lore: 'Khu rừng ghi nhớ bước chân bạn và đáp lại bằng những mũi tên im lặng.',
    requirement: { level: 10, gold: 500, items: [{ itemId: 'wolf_fang', qty: 2 }, { itemId: 'healing_herb', qty: 3 }] },
  },
  {
    from: ['cleric'], to: 'oracle', name: 'Oracle', icon: '🕯️',
    lore: 'Lời cầu nguyện trở thành lời tiên tri. Bạn đọc được vết nứt trong số mệnh.',
    requirement: { level: 10, gold: 550, soulShards: 1, items: [{ itemId: 'ancient_rune', qty: 1 }, { itemId: 'mana_crystal', qty: 1 }] },
  },
  {
    from: ['paladin'], to: 'crusader', name: 'Crusader', icon: '☀️',
    lore: 'Ánh sáng không còn chỉ bảo vệ. Nó bắt đầu phán quyết.',
    requirement: { level: 10, gold: 650, soulShards: 1, items: [{ itemId: 'iron_ore', qty: 4 }, { itemId: 'ancient_rune', qty: 1 }] },
  },
  {
    from: ['berserker'], to: 'bloodreaver', name: 'Bloodreaver', icon: '🩸',
    lore: 'Cơn thịnh nộ được mài thành lưỡi dao. Máu càng đổ, bạn càng tỉnh táo.',
    requirement: { level: 10, gold: 600, soulShards: 1, items: [{ itemId: 'wolf_fang', qty: 3 }, { itemId: 'shadow_shard', qty: 1 }] },
  },
];

export function getAwakeningForClass(classId: string): ClassAwakeningDef | undefined {
  return CLASS_AWAKENINGS.find(a => a.from.includes(classId));
}

export function isAwakenedClass(classId: string): boolean {
  return CLASS_AWAKENINGS.some(a => a.to === classId) && !!CLASSES[classId];
}

export function getAwakenedClassIds(): string[] {
  return CLASS_AWAKENINGS.map(a => a.to).filter(id => !!CLASSES[id]);
}
