export interface ClassDef {
  id: string;
  name: string;
  icon: string;
  description: string;
  hpBonus: number;
  mpBonus: number;
  atkBonus: number;
  defBonus: number;
  dodgeBonus: number;   // added to passive dodge chance %
  skillDmgMult: number; // multiplier for skill damage (1.0 = no bonus)
  passiveLine: string;
}

export const CLASSES: Record<string, ClassDef> = {
  warrior: {
    id: 'warrior', name: 'Chiến Binh', icon: '⚔️',
    description: 'Bền bỉ và kiên cố. Hấp thụ sát thương tốt hơn ai hết.',
    hpBonus: 50, mpBonus: 0, atkBonus: 2, defBonus: 4,
    dodgeBonus: 0, skillDmgMult: 1.0,
    passiveLine: '+50 HP  ·  +2 ATK  ·  +4 DEF',
  },
  mage: {
    id: 'mage', name: 'Pháp Sư', icon: '🔮',
    description: 'Kỹ năng gây thêm 25% sát thương. Kho MP dồi dào.',
    hpBonus: 0, mpBonus: 60, atkBonus: 4, defBonus: 0,
    dodgeBonus: 0, skillDmgMult: 1.25,
    passiveLine: '+60 MP  ·  +4 ATK  ·  Skill +25% DMG',
  },
  rogue: {
    id: 'rogue', name: 'Thích Khách', icon: '🗡️',
    description: 'Né tránh và phản đòn. Linh hoạt — khó bị đánh trúng.',
    hpBonus: 20, mpBonus: 10, atkBonus: 3, defBonus: 2,
    dodgeBonus: 8, skillDmgMult: 1.0,
    passiveLine: '+20 HP  ·  +3 ATK  ·  +2 DEF  ·  +8% Dodge',
  },
};

export function getClass(id: string): ClassDef | undefined {
  return CLASSES[id];
}
