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
  assassin: {
    id: 'assassin', name: 'Sát Thủ', icon: '🥷',
    description: 'Dồn sát thương mạnh, né cao. Hợp lối chơi nhanh và mạo hiểm.',
    hpBonus: 10, mpBonus: 20, atkBonus: 6, defBonus: 0,
    dodgeBonus: 12, skillDmgMult: 1.1,
    passiveLine: '+10 HP  ·  +20 MP  ·  +6 ATK  ·  +12% Dodge  ·  Skill +10% DMG',
  },
  ranger: {
    id: 'ranger', name: 'Cung Thủ', icon: '🏹',
    description: 'Ổn định, nhanh nhẹn, dễ sống sót khi đi explore dài hơi.',
    hpBonus: 25, mpBonus: 20, atkBonus: 4, defBonus: 1,
    dodgeBonus: 6, skillDmgMult: 1.05,
    passiveLine: '+25 HP  ·  +20 MP  ·  +4 ATK  ·  +6% Dodge  ·  Skill +5% DMG',
  },
  cleric: {
    id: 'cleric', name: 'Giáo Sĩ', icon: '✨',
    description: 'Nhiều MP, phòng thủ ổn, dùng skill hiệu quả hơn.',
    hpBonus: 35, mpBonus: 50, atkBonus: 1, defBonus: 3,
    dodgeBonus: 0, skillDmgMult: 1.15,
    passiveLine: '+35 HP  ·  +50 MP  ·  +1 ATK  ·  +3 DEF  ·  Skill +15% DMG',
  },
  paladin: {
    id: 'paladin', name: 'Hiệp Sĩ Thánh', icon: '🛡️',
    description: 'Trâu, thủ cao, ít đột biến nhưng rất an toàn cho người mới.',
    hpBonus: 60, mpBonus: 20, atkBonus: 2, defBonus: 5,
    dodgeBonus: 0, skillDmgMult: 1.05,
    passiveLine: '+60 HP  ·  +20 MP  ·  +2 ATK  ·  +5 DEF  ·  Skill +5% DMG',
  },
  berserker: {
    id: 'berserker', name: 'Cuồng Chiến', icon: '🩸',
    description: 'ATK rất cao, HP tốt, hợp người thích đánh nhanh thắng nhanh.',
    hpBonus: 40, mpBonus: 0, atkBonus: 7, defBonus: 1,
    dodgeBonus: 0, skillDmgMult: 1.0,
    passiveLine: '+40 HP  ·  +7 ATK  ·  +1 DEF',
  },
};

export function getClass(id: string): ClassDef | undefined {
  return CLASSES[id];
}
