import type { EquipStats, Rarity, EquipmentDef } from './equipment';
import { randInt } from '../utils/format';

export type AffixType = 'prefix' | 'suffix';
export type AffixStat = keyof Pick<EquipStats,
  'atk' | 'def' | 'maxHp' | 'maxMp' | 'critChance' | 'dodgeChance' | 'lifesteal' | 'expBonus' | 'goldBonus' | 'dropBonus'
>;

export interface AffixTier {
  tierLevel: number; // 1 = mạnh nhất
  minILvl: number;
  range: [number, number];
  weight?: number;
}

export interface AffixDef {
  id: string;
  name: string;
  type: AffixType;
  stat: AffixStat;
  isPercent: boolean;
  tiers: AffixTier[];
  slots?: EquipmentDef['slot'][];
}

export interface RolledAffix {
  id: string;
  name: string;
  type: AffixType;
  stat: AffixStat;
  isPercent: boolean;
  value: number;
  tier: number;
}

export const PREFIX_POOL: AffixDef[] = [
  {
    id: 'flat_atk', name: 'Tàn Bạo', type: 'prefix', stat: 'atk', isPercent: false, slots: ['weapon', 'accessory1', 'accessory2'],
    tiers: [
      { tierLevel: 5, minILvl: 1, range: [1, 3], weight: 55 },
      { tierLevel: 4, minILvl: 8, range: [3, 6], weight: 34 },
      { tierLevel: 3, minILvl: 16, range: [6, 10], weight: 18 },
      { tierLevel: 2, minILvl: 30, range: [10, 16], weight: 8 },
      { tierLevel: 1, minILvl: 45, range: [16, 24], weight: 3 },
    ]
  },
  {
    id: 'flat_def', name: 'Kiên Cố', type: 'prefix', stat: 'def', isPercent: false, slots: ['armor', 'accessory1', 'accessory2'],
    tiers: [
      { tierLevel: 5, minILvl: 1, range: [1, 2], weight: 55 },
      { tierLevel: 4, minILvl: 8, range: [2, 4], weight: 34 },
      { tierLevel: 3, minILvl: 16, range: [4, 7], weight: 18 },
      { tierLevel: 2, minILvl: 30, range: [7, 11], weight: 8 },
      { tierLevel: 1, minILvl: 45, range: [11, 16], weight: 3 },
    ]
  },
  {
    id: 'flat_hp', name: 'Sinh Lực', type: 'prefix', stat: 'maxHp', isPercent: false,
    tiers: [
      { tierLevel: 5, minILvl: 1, range: [8, 18], weight: 55 },
      { tierLevel: 4, minILvl: 8, range: [18, 35], weight: 34 },
      { tierLevel: 3, minILvl: 16, range: [35, 60], weight: 18 },
      { tierLevel: 2, minILvl: 30, range: [60, 95], weight: 8 },
      { tierLevel: 1, minILvl: 45, range: [95, 140], weight: 3 },
    ]
  },
  {
    id: 'flat_mp', name: 'Dòng Chảy Mana', type: 'prefix', stat: 'maxMp', isPercent: false,
    tiers: [
      { tierLevel: 5, minILvl: 1, range: [5, 12], weight: 55 },
      { tierLevel: 4, minILvl: 8, range: [12, 24], weight: 34 },
      { tierLevel: 3, minILvl: 16, range: [24, 42], weight: 18 },
      { tierLevel: 2, minILvl: 30, range: [42, 68], weight: 8 },
      { tierLevel: 1, minILvl: 45, range: [68, 100], weight: 3 },
    ]
  },
];

export const SUFFIX_POOL: AffixDef[] = [
  {
    id: 'crit_chance', name: 'Mắt Ưng', type: 'suffix', stat: 'critChance', isPercent: true, slots: ['weapon', 'accessory1', 'accessory2'],
    tiers: [
      { tierLevel: 5, minILvl: 1, range: [1, 2], weight: 55 },
      { tierLevel: 4, minILvl: 10, range: [2, 4], weight: 30 },
      { tierLevel: 3, minILvl: 20, range: [4, 6], weight: 16 },
      { tierLevel: 2, minILvl: 35, range: [6, 8], weight: 7 },
      { tierLevel: 1, minILvl: 50, range: [8, 10], weight: 2 },
    ]
  },
  {
    id: 'dodge_chance', name: 'Bóng Lướt', type: 'suffix', stat: 'dodgeChance', isPercent: true, slots: ['armor', 'accessory1', 'accessory2'],
    tiers: [
      { tierLevel: 5, minILvl: 1, range: [1, 2], weight: 55 },
      { tierLevel: 4, minILvl: 10, range: [2, 3], weight: 30 },
      { tierLevel: 3, minILvl: 20, range: [3, 5], weight: 16 },
      { tierLevel: 2, minILvl: 35, range: [5, 7], weight: 7 },
      { tierLevel: 1, minILvl: 50, range: [7, 9], weight: 2 },
    ]
  },
  {
    id: 'lifesteal', name: 'Khát Máu', type: 'suffix', stat: 'lifesteal', isPercent: true, slots: ['weapon', 'accessory1', 'accessory2'],
    tiers: [
      { tierLevel: 4, minILvl: 12, range: [1, 2], weight: 38 },
      { tierLevel: 3, minILvl: 22, range: [2, 3], weight: 18 },
      { tierLevel: 2, minILvl: 38, range: [3, 5], weight: 7 },
      { tierLevel: 1, minILvl: 52, range: [5, 7], weight: 2 },
    ]
  },
  {
    id: 'gold_bonus', name: 'Tham Vọng', type: 'suffix', stat: 'goldBonus', isPercent: true, slots: ['accessory1', 'accessory2'],
    tiers: [
      { tierLevel: 5, minILvl: 1, range: [2, 4], weight: 52 },
      { tierLevel: 4, minILvl: 10, range: [4, 7], weight: 32 },
      { tierLevel: 3, minILvl: 20, range: [7, 10], weight: 16 },
      { tierLevel: 2, minILvl: 35, range: [10, 14], weight: 7 },
      { tierLevel: 1, minILvl: 50, range: [14, 18], weight: 2 },
    ]
  },
  {
    id: 'exp_bonus', name: 'Khai Sáng', type: 'suffix', stat: 'expBonus', isPercent: true, slots: ['accessory1', 'accessory2', 'armor'],
    tiers: [
      { tierLevel: 5, minILvl: 1, range: [2, 4], weight: 52 },
      { tierLevel: 4, minILvl: 10, range: [4, 7], weight: 32 },
      { tierLevel: 3, minILvl: 20, range: [7, 10], weight: 16 },
      { tierLevel: 2, minILvl: 35, range: [10, 14], weight: 7 },
      { tierLevel: 1, minILvl: 50, range: [14, 18], weight: 2 },
    ]
  },
  {
    id: 'drop_bonus', name: 'Kẻ Săn Kho Báu', type: 'suffix', stat: 'dropBonus', isPercent: true, slots: ['accessory1', 'accessory2'],
    tiers: [
      { tierLevel: 5, minILvl: 6, range: [1, 2], weight: 50 },
      { tierLevel: 4, minILvl: 16, range: [2, 4], weight: 28 },
      { tierLevel: 3, minILvl: 28, range: [4, 6], weight: 14 },
      { tierLevel: 2, minILvl: 42, range: [6, 8], weight: 6 },
      { tierLevel: 1, minILvl: 55, range: [8, 10], weight: 2 },
    ]
  },
];

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function weightedPick<T extends { weight?: number }>(items: T[]): T | undefined {
  const total = items.reduce((s, x) => s + (x.weight ?? 1), 0);
  if (total <= 0) return items[0];
  let roll = Math.random() * total;
  for (const item of items) {
    roll -= item.weight ?? 1;
    if (roll <= 0) return item;
  }
  return items[items.length - 1];
}

export function affixCounts(rarity: Rarity, legacy = false): { prefix: number; suffix: number } {
  if (legacy) {
    if (rarity === 'legendary' || rarity === 'mythic' || rarity === 'cursed') return { prefix: 2, suffix: 2 };
    if (rarity === 'epic') return { prefix: 2, suffix: 1 };
    if (rarity === 'rare') return { prefix: 1, suffix: 1 };
    return { prefix: 0, suffix: 1 };
  }
  if (rarity === 'legendary' || rarity === 'mythic' || rarity === 'cursed') return { prefix: randInt(2, 3), suffix: randInt(2, 3) };
  if (rarity === 'epic') return { prefix: 2, suffix: 2 };
  if (rarity === 'rare') return { prefix: 1, suffix: 1 };
  return Math.random() < 0.55 ? { prefix: 1, suffix: 0 } : { prefix: 0, suffix: 1 };
}

export function rollAffixesForEquipment(base: EquipmentDef, itemLevel: number, legacy = false): RolledAffix[] {
  const counts = affixCounts(base.rarity, legacy);
  const final: RolledAffix[] = [];
  const usedStats = new Set<AffixStat>();

  const rollFromPool = (pool: AffixDef[], count: number) => {
    let rolled = 0;
    for (const affix of shuffle(pool)) {
      if (rolled >= count) break;
      if (usedStats.has(affix.stat)) continue;
      if (affix.slots && !affix.slots.includes(base.slot)) continue;
      const validTiers = affix.tiers.filter(t => t.minILvl <= itemLevel);
      if (!validTiers.length) continue;
      const selectedTier = weightedPick(validTiers);
      if (!selectedTier) continue;
      final.push({
        id: affix.id,
        name: affix.name,
        type: affix.type,
        stat: affix.stat,
        isPercent: affix.isPercent,
        value: randInt(selectedTier.range[0], selectedTier.range[1]),
        tier: selectedTier.tierLevel,
      });
      usedStats.add(affix.stat);
      rolled++;
    }
  };

  rollFromPool(PREFIX_POOL, counts.prefix);
  rollFromPool(SUFFIX_POOL, counts.suffix);
  return final;
}

export function affixesToStats(affixes: RolledAffix[]): EquipStats {
  const stats: EquipStats = {};
  for (const affix of affixes) {
    (stats as any)[affix.stat] = ((stats as any)[affix.stat] ?? 0) + affix.value;
  }
  return stats;
}

export function formatAffixLine(affix: RolledAffix): string {
  const label: Record<AffixStat, string> = {
    atk: 'ATK', def: 'DEF', maxHp: 'Max HP', maxMp: 'Max MP',
    critChance: 'Crit', dodgeChance: 'Dodge', lifesteal: 'Lifesteal',
    expBonus: 'EXP', goldBonus: 'Gold', dropBonus: 'Drop',
  };
  return `${affix.type === 'prefix' ? '🔷' : '🔶'} T${affix.tier} **${affix.name}**: +${affix.value}${affix.isPercent ? '%' : ''} ${label[affix.stat]}`;
}
