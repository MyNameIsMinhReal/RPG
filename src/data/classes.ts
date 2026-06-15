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

  knight: {
    id: 'knight', name: 'Kỵ Sĩ', icon: '🛡️',
    description: 'Awaken từ Warrior. Chuyên đỡ đòn, ổn định trong party boss.',
    hpBonus: 85, mpBonus: 10, atkBonus: 5, defBonus: 8,
    dodgeBonus: 0, skillDmgMult: 1.05,
    passiveLine: '+85 HP  ·  +5 ATK  ·  +8 DEF  ·  Skill +5% DMG',
  },
  arcanist: {
    id: 'arcanist', name: 'Đại Pháp Sư', icon: '🧙',
    description: 'Awaken từ Mage. MP dồi dào, skill gây sát thương mạnh hơn.',
    hpBonus: 20, mpBonus: 95, atkBonus: 8, defBonus: 2,
    dodgeBonus: 0, skillDmgMult: 1.38,
    passiveLine: '+20 HP  ·  +95 MP  ·  +8 ATK  ·  Skill +38% DMG',
  },
  shadowblade: {
    id: 'shadowblade', name: 'Ảnh Nhận', icon: '🌑',
    description: 'Awaken từ Rogue/Assassin. Né cao, dồn sát thương tốt.',
    hpBonus: 35, mpBonus: 35, atkBonus: 10, defBonus: 2,
    dodgeBonus: 16, skillDmgMult: 1.18,
    passiveLine: '+35 HP  ·  +35 MP  ·  +10 ATK  ·  +16% Dodge  ·  Skill +18% DMG',
  },
  warden: {
    id: 'warden', name: 'Hộ Vệ Rừng', icon: '🌲',
    description: 'Awaken từ Ranger. Cân bằng sát thương, né và sinh tồn.',
    hpBonus: 55, mpBonus: 35, atkBonus: 7, defBonus: 4,
    dodgeBonus: 10, skillDmgMult: 1.12,
    passiveLine: '+55 HP  ·  +35 MP  ·  +7 ATK  ·  +4 DEF  ·  +10% Dodge',
  },
  oracle: {
    id: 'oracle', name: 'Tiên Tri', icon: '🕯️',
    description: 'Awaken từ Cleric. Hỗ trợ bền bỉ, nhiều MP và skill mạnh hơn.',
    hpBonus: 60, mpBonus: 90, atkBonus: 4, defBonus: 5,
    dodgeBonus: 0, skillDmgMult: 1.28,
    passiveLine: '+60 HP  ·  +90 MP  ·  +4 ATK  ·  +5 DEF  ·  Skill +28% DMG',
  },
  crusader: {
    id: 'crusader', name: 'Thập Tự Kỵ Sĩ', icon: '☀️',
    description: 'Awaken từ Paladin. Tuyến đầu cực an toàn cho raid boss.',
    hpBonus: 95, mpBonus: 35, atkBonus: 6, defBonus: 10,
    dodgeBonus: 0, skillDmgMult: 1.10,
    passiveLine: '+95 HP  ·  +35 MP  ·  +6 ATK  ·  +10 DEF  ·  Skill +10% DMG',
  },
  bloodreaver: {
    id: 'bloodreaver', name: 'Huyết Cuồng', icon: '🩸',
    description: 'Awaken từ Berserker. Sát thương cao, sinh tồn bằng áp lực tấn công.',
    hpBonus: 70, mpBonus: 10, atkBonus: 13, defBonus: 3,
    dodgeBonus: 0, skillDmgMult: 1.08,
    passiveLine: '+70 HP  ·  +10 MP  ·  +13 ATK  ·  +3 DEF  ·  Skill +8% DMG',
  },
};

export function getPassiveLine(cls: ClassDef): string {
  const parts: string[] = [];
  if (cls.hpBonus) parts.push(`+${cls.hpBonus} HP`);
  if (cls.mpBonus) parts.push(`+${cls.mpBonus} MP`);
  if (cls.atkBonus) parts.push(`+${cls.atkBonus} ATK`);
  if (cls.defBonus) parts.push(`+${cls.defBonus} DEF`);
  if (cls.dodgeBonus) parts.push(`+${cls.dodgeBonus}% Dodge`);
  if (cls.skillDmgMult && cls.skillDmgMult !== 1.0) parts.push(`Skill +${Math.round((cls.skillDmgMult - 1) * 100)}% DMG`);
  return parts.join('  ·  ');
}

export function getClass(id: string): ClassDef | undefined {
  return CLASSES[id];
}
