import db from '../database/index';
import { getEquipment, getSetBonuses, SLOT_ICONS, SLOT_LABELS, RARITY_LABELS, type EquipmentDef, type EquipSlot, type EquipStats, type EquipEffect, type Rarity } from '../data/equipment';

export const UPGRADE_MAX = 5;

export interface WornEntry {
  user_id: string; guild_id: string;
  slot: EquipSlot; equipment_id: string;
}

export interface FullEquipStats extends EquipStats {
  effects: EquipEffect[];
  activeSetNames: string[];
}

// ── CRUD ──────────────────────────────────────────────────────────────────
export function getWornEquipment(userId: string, guildId: string): WornEntry[] {
  return db.prepare('SELECT * FROM equipment_worn WHERE user_id=? AND guild_id=?')
    .all(userId, guildId) as unknown as WornEntry[];
}

export function getWornInSlot(userId: string, guildId: string, slot: EquipSlot): WornEntry | undefined {
  return db.prepare('SELECT * FROM equipment_worn WHERE user_id=? AND guild_id=? AND slot=?')
    .get(userId, guildId, slot) as unknown as WornEntry | undefined;
}

export function wearEquipment(userId: string, guildId: string, equipId: string): void {
  const def = getEquipment(equipId);
  if (!def) return;

  // Accessories share two slots. Data may define all accessories as accessory1,
  // so auto-fill accessory2 before replacing accessory1.
  let targetSlot: EquipSlot = def.slot;
  if (def.slot === 'accessory1' || def.slot === 'accessory2') {
    const acc1 = getWornInSlot(userId, guildId, 'accessory1');
    const acc2 = getWornInSlot(userId, guildId, 'accessory2');
    const alreadyWorn = getWornEquipment(userId, guildId).find(w => w.equipment_id === equipId);

    if (alreadyWorn) targetSlot = alreadyWorn.slot;
    else if (!acc1) targetSlot = 'accessory1';
    else if (!acc2) targetSlot = 'accessory2';
    else targetSlot = 'accessory1';
  }

  db.prepare(`
    INSERT OR REPLACE INTO equipment_worn (user_id, guild_id, slot, equipment_id)
    VALUES (?, ?, ?, ?)
  `).run(userId, guildId, targetSlot, equipId);
}

export function removeEquipment(userId: string, guildId: string, slot: EquipSlot): void {
  db.prepare('DELETE FROM equipment_worn WHERE user_id=? AND guild_id=? AND slot=?')
    .run(userId, guildId, slot);
}


export function describeUpgradeBonus(slot: EquipSlot, def?: EquipmentDef): string {
  if (slot === 'weapon') return '+2 ATK';
  if (slot === 'armor') return '+2 DEF, +6 HP';
  if (!def) return '+1 chỉ số phụ';
  if ((def.stats.goldBonus ?? 0) > 0) return '+1% Gold';
  if ((def.stats.expBonus ?? 0) > 0) return '+1% EXP';
  if ((def.stats.dropBonus ?? 0) > 0) return '+1% Drop';
  if ((def.stats.maxMp ?? 0) >= Math.max(def.stats.maxHp ?? 0, 0)) return '+5 MP';
  if ((def.stats.maxHp ?? 0) > 0 || (def.stats.def ?? 0) > 0) return '+5 HP';
  if ((def.stats.critChance ?? 0) > 0) return '+0.5% Crit';
  if ((def.stats.dodgeChance ?? 0) > 0) return '+0.5% Dodge';
  return '+1 ATK';
}

function applyUpgradeStatBonus(stats: FullEquipStats, slot: EquipSlot, def: EquipmentDef, level: number): void {
  if (slot === 'weapon') {
    stats.atk! += level * 2;
    return;
  }
  if (slot === 'armor') {
    stats.def! += level * 2;
    stats.maxHp! += level * 6;
    return;
  }

  // Accessory upgrades now follow the accessory identity instead of always adding ATK.
  if ((def.stats.goldBonus ?? 0) > 0) stats.goldBonus! += level;
  else if ((def.stats.expBonus ?? 0) > 0) stats.expBonus! += level;
  else if ((def.stats.dropBonus ?? 0) > 0) stats.dropBonus! += level;
  else if ((def.stats.maxMp ?? 0) >= Math.max(def.stats.maxHp ?? 0, 0)) stats.maxMp! += level * 5;
  else if ((def.stats.maxHp ?? 0) > 0 || (def.stats.def ?? 0) > 0) stats.maxHp! += level * 5;
  else if ((def.stats.critChance ?? 0) > 0) stats.critChance! += level * 0.5;
  else if ((def.stats.dodgeChance ?? 0) > 0) stats.dodgeChance! += level * 0.5;
  else stats.atk! += level;
}



export type AffixType = 'prefix' | 'suffix';
export type ForgeAffixStat = keyof Pick<EquipStats,
  'atk' | 'def' | 'maxHp' | 'maxMp' | 'critChance' | 'dodgeChance' | 'lifesteal' | 'expBonus' | 'goldBonus' | 'dropBonus'
>;
export type ForgeAffixKey = string;

export interface AffixTier {
  tierLevel: number; // Tier 1 mạnh nhất
  minILvl: number;
  range: [number, number];
}

export interface AffixDef {
  id: string;
  label: string;
  type: AffixType;
  stat: ForgeAffixStat;
  isPercent: boolean;
  tiers: AffixTier[];
}

export interface RolledForgeAffix {
  id: string;
  type: AffixType;
  stat: ForgeAffixStat;
  isPercent: boolean;
  value: number;
  tier: number;
}

export interface EquipmentForgeMeta {
  user_id: string;
  guild_id: string;
  slot: EquipSlot;
  awakened: number;
  affix1: RolledForgeAffix | null;
  affix2: RolledForgeAffix | null;
  locked_affix: number;
  instance_uuid: string | null;
  base_id: string | null;
  rarity: Rarity | null;
  item_level: number;
  affixes: RolledForgeAffix[];
  locked_affixes: number[];
  pending_affixes: RolledForgeAffix[] | null;
  updated_at?: number;
}

export const PREFIX_POOL: AffixDef[] = [
  { id: 'flat_atk', label: 'Sát thương vật lý', type: 'prefix', stat: 'atk', isPercent: false, tiers: [
    { tierLevel: 5, minILvl: 1, range: [2, 5] },
    { tierLevel: 4, minILvl: 10, range: [6, 12] },
    { tierLevel: 3, minILvl: 20, range: [13, 24] },
    { tierLevel: 2, minILvl: 35, range: [28, 55] },
    { tierLevel: 1, minILvl: 50, range: [70, 120] },
  ]},
  { id: 'flat_def', label: 'Giáp cứng', type: 'prefix', stat: 'def', isPercent: false, tiers: [
    { tierLevel: 5, minILvl: 1, range: [1, 4] },
    { tierLevel: 4, minILvl: 10, range: [5, 10] },
    { tierLevel: 3, minILvl: 20, range: [11, 20] },
    { tierLevel: 2, minILvl: 35, range: [22, 38] },
    { tierLevel: 1, minILvl: 50, range: [45, 80] },
  ]},
  { id: 'flat_hp', label: 'Máu tối đa', type: 'prefix', stat: 'maxHp', isPercent: false, tiers: [
    { tierLevel: 5, minILvl: 1, range: [12, 28] },
    { tierLevel: 4, minILvl: 10, range: [30, 65] },
    { tierLevel: 3, minILvl: 20, range: [70, 140] },
    { tierLevel: 2, minILvl: 35, range: [160, 300] },
    { tierLevel: 1, minILvl: 50, range: [350, 520] },
  ]},
  { id: 'flat_mp', label: 'Mana tối đa', type: 'prefix', stat: 'maxMp', isPercent: false, tiers: [
    { tierLevel: 5, minILvl: 1, range: [8, 18] },
    { tierLevel: 4, minILvl: 10, range: [20, 42] },
    { tierLevel: 3, minILvl: 20, range: [45, 90] },
    { tierLevel: 2, minILvl: 35, range: [100, 180] },
    { tierLevel: 1, minILvl: 50, range: [220, 360] },
  ]},
  { id: 'drop_sense', label: 'Cảm nhận chiến lợi phẩm', type: 'prefix', stat: 'dropBonus', isPercent: true, tiers: [
    { tierLevel: 5, minILvl: 8, range: [1, 2] },
    { tierLevel: 4, minILvl: 18, range: [2, 4] },
    { tierLevel: 3, minILvl: 30, range: [4, 6] },
    { tierLevel: 2, minILvl: 42, range: [6, 8] },
    { tierLevel: 1, minILvl: 55, range: [8, 10] },
  ]},
];

export const SUFFIX_POOL: AffixDef[] = [
  { id: 'crit_chance', label: 'Chí mạng', type: 'suffix', stat: 'critChance', isPercent: true, tiers: [
    { tierLevel: 5, minILvl: 1, range: [1, 2] },
    { tierLevel: 4, minILvl: 12, range: [2, 4] },
    { tierLevel: 3, minILvl: 24, range: [4, 6] },
    { tierLevel: 2, minILvl: 38, range: [6, 8] },
    { tierLevel: 1, minILvl: 52, range: [9, 12] },
  ]},
  { id: 'dodge_chance', label: 'Né tránh', type: 'suffix', stat: 'dodgeChance', isPercent: true, tiers: [
    { tierLevel: 5, minILvl: 1, range: [1, 2] },
    { tierLevel: 4, minILvl: 12, range: [2, 3] },
    { tierLevel: 3, minILvl: 24, range: [3, 5] },
    { tierLevel: 2, minILvl: 38, range: [5, 7] },
    { tierLevel: 1, minILvl: 52, range: [7, 10] },
  ]},
  { id: 'lifesteal', label: 'Hút máu', type: 'suffix', stat: 'lifesteal', isPercent: true, tiers: [
    { tierLevel: 3, minILvl: 20, range: [1, 2] },
    { tierLevel: 2, minILvl: 35, range: [2, 4] },
    { tierLevel: 1, minILvl: 48, range: [4, 7] },
  ]},
  { id: 'gold_find', label: 'Nhặt vàng', type: 'suffix', stat: 'goldBonus', isPercent: true, tiers: [
    { tierLevel: 5, minILvl: 1, range: [2, 4] },
    { tierLevel: 4, minILvl: 12, range: [4, 7] },
    { tierLevel: 3, minILvl: 24, range: [7, 10] },
    { tierLevel: 2, minILvl: 38, range: [10, 14] },
    { tierLevel: 1, minILvl: 52, range: [14, 20] },
  ]},
  { id: 'exp_focus', label: 'Kinh nghiệm chiến đấu', type: 'suffix', stat: 'expBonus', isPercent: true, tiers: [
    { tierLevel: 5, minILvl: 1, range: [2, 4] },
    { tierLevel: 4, minILvl: 12, range: [4, 7] },
    { tierLevel: 3, minILvl: 24, range: [7, 10] },
    { tierLevel: 2, minILvl: 38, range: [10, 14] },
    { tierLevel: 1, minILvl: 52, range: [14, 20] },
  ]},
];

const AFFIX_POOLS: Record<AffixType, AffixDef[]> = { prefix: PREFIX_POOL, suffix: SUFFIX_POOL };

function safeJson<T>(raw: unknown, fallback: T): T {
  if (typeof raw !== 'string' || !raw.trim()) return fallback;
  try { return JSON.parse(raw) as T; } catch { return fallback; }
}

function localRandInt(min: number, max: number): number {
  const lo = Math.ceil(min); const hi = Math.floor(max);
  return Math.floor(Math.random() * (hi - lo + 1)) + lo;
}

function weightedPick<T>(items: T[], weight: (item: T) => number): T | undefined {
  const total = items.reduce((s, it) => s + Math.max(0, weight(it)), 0);
  if (total <= 0) return items[0];
  let roll = Math.random() * total;
  for (const it of items) {
    roll -= Math.max(0, weight(it));
    if (roll <= 0) return it;
  }
  return items[items.length - 1];
}

function normalizeRolledAffix(value: any): RolledForgeAffix | null {
  if (!value || typeof value !== 'object') return null;
  if (value.type !== 'prefix' && value.type !== 'suffix') return null;
  if (typeof value.stat !== 'string' || typeof value.value !== 'number') return null;
  return {
    id: String(value.id ?? `${value.type}_${value.stat}`),
    type: value.type,
    stat: value.stat as ForgeAffixStat,
    isPercent: !!value.isPercent,
    value: Number(value.value),
    tier: Number(value.tier ?? 5),
  };
}

function normalizeAffixList(raw: unknown): RolledForgeAffix[] {
  const arr = Array.isArray(raw) ? raw : safeJson<any[]>(raw, []);
  return arr.map(normalizeRolledAffix).filter(Boolean) as RolledForgeAffix[];
}

function rarityAffixLimits(rarity: Rarity | string | null | undefined): { prefix: number; suffix: number } {
  if (rarity === 'rare') return { prefix: 1, suffix: 1 };
  if (rarity === 'epic') return { prefix: 2, suffix: 2 };
  if (rarity === 'legendary' || rarity === 'mythic' || rarity === 'cursed') return { prefix: 3, suffix: 3 };
  return { prefix: 1, suffix: 1 };
}

function rollCountForRarity(rarity: Rarity | string | null | undefined, max: number): number {
  if (max <= 0) return 0;
  if (rarity === 'rare') return max;
  if (rarity === 'epic') return localRandInt(Math.max(1, max - 1), max);
  if (rarity === 'legendary' || rarity === 'mythic' || rarity === 'cursed') return localRandInt(Math.max(1, max - 1), max);
  return Math.min(1, max);
}

function pickTier(def: AffixDef, itemLevel: number): AffixTier | null {
  const valid = def.tiers.filter(t => t.minILvl <= itemLevel);
  if (!valid.length) return null;
  // Tier yếu hơn dễ ra hơn; tier 1 vẫn có chance nhưng hiếm.
  return weightedPick(valid, t => Math.max(1, t.tierLevel * t.tierLevel)) ?? valid[0];
}

function rollOneAffix(def: AffixDef, itemLevel: number): RolledForgeAffix | null {
  const tier = pickTier(def, itemLevel);
  if (!tier) return null;
  return {
    id: def.id,
    type: def.type,
    stat: def.stat,
    isPercent: def.isPercent,
    value: localRandInt(tier.range[0], tier.range[1]),
    tier: tier.tierLevel,
  };
}

export function rollEquipmentAffixes(baseId: string, rarity: Rarity | string, itemLevel: number, locked: RolledForgeAffix[] = []): RolledForgeAffix[] {
  const limits = rarityAffixLimits(rarity);
  const target: Record<AffixType, number> = {
    prefix: Math.max(locked.filter(a => a.type === 'prefix').length, rollCountForRarity(rarity, limits.prefix)),
    suffix: Math.max(locked.filter(a => a.type === 'suffix').length, rollCountForRarity(rarity, limits.suffix)),
  };
  const final: RolledForgeAffix[] = [...locked];
  const usedStats = new Set(final.map(a => a.stat));

  for (const type of ['prefix', 'suffix'] as AffixType[]) {
    let guard = 0;
    while (final.filter(a => a.type === type).length < target[type] && guard++ < 50) {
      const pool = [...AFFIX_POOLS[type]].filter(def => !usedStats.has(def.stat) && def.tiers.some(t => t.minILvl <= itemLevel));
      if (!pool.length) break;
      const def = pool.sort(() => Math.random() - 0.5)[0];
      const rolled = rollOneAffix(def, itemLevel);
      if (!rolled) continue;
      final.push(rolled);
      usedStats.add(rolled.stat);
    }
  }
  return final.slice(0, limits.prefix + limits.suffix);
}

function inferForgeItemLevel(userId: string, guildId: string, def?: EquipmentDef): number {
  const row = db.prepare('SELECT level, zone_id FROM players WHERE user_id=? AND guild_id=?').get(userId, guildId) as any;
  const level = Number(row?.level ?? 1);
  let zoneBonus = 0;
  try {
    const { ZONES } = require('../data/zones');
    zoneBonus = Number(ZONES?.[row?.zone_id]?.minLevel ?? 0) * 3;
  } catch { zoneBonus = 0; }
  const rarityBonus: Record<string, number> = { common: 0, rare: 4, epic: 10, legendary: 18, mythic: 26, cursed: 18 };
  return Math.max(1, Math.floor(level * 5 + zoneBonus + (rarityBonus[def?.rarity ?? 'common'] ?? 0)));
}

function ensureForgeColumns(): void {
  try { db.exec(`ALTER TABLE equipment_forge ADD COLUMN instance_uuid TEXT`); } catch {}
  try { db.exec(`ALTER TABLE equipment_forge ADD COLUMN base_id TEXT`); } catch {}
  try { db.exec(`ALTER TABLE equipment_forge ADD COLUMN rarity TEXT`); } catch {}
  try { db.exec(`ALTER TABLE equipment_forge ADD COLUMN item_level INTEGER DEFAULT 1`); } catch {}
  try { db.exec(`ALTER TABLE equipment_forge ADD COLUMN affixes_json TEXT`); } catch {}
  try { db.exec(`ALTER TABLE equipment_forge ADD COLUMN locked_affixes_json TEXT DEFAULT '[]'`); } catch {}
  try { db.exec(`ALTER TABLE equipment_forge ADD COLUMN pending_affixes_json TEXT`); } catch {}
}

function makeInstanceUuid(): string {
  try { return crypto.randomUUID(); } catch { return `eq_${Date.now()}_${Math.random().toString(16).slice(2)}`; }
}

function rowToForgeMeta(row: any): EquipmentForgeMeta | undefined {
  if (!row) return undefined;
  const affixes = normalizeAffixList(row.affixes_json);
  const legacyAffixes = affixes.length ? affixes : [legacyKeyToAffix(row.affix1), legacyKeyToAffix(row.affix2)].filter(Boolean) as RolledForgeAffix[];
  const pending = normalizeAffixList(row.pending_affixes_json);
  const locked = safeJson<number[]>(row.locked_affixes_json, [])
    .map(n => Number(n)).filter(n => Number.isInteger(n) && n >= 0 && n < legacyAffixes.length);
  return {
    ...row,
    slot: row.slot as EquipSlot,
    awakened: Number(row.awakened ?? 0),
    locked_affix: locked[0] != null ? locked[0] + 1 : Number(row.locked_affix ?? 0),
    instance_uuid: row.instance_uuid ?? null,
    base_id: row.base_id ?? null,
    rarity: (row.rarity ?? null) as Rarity | null,
    item_level: Number(row.item_level ?? 1),
    affixes: legacyAffixes,
    affix1: legacyAffixes[0] ?? null,
    affix2: legacyAffixes[1] ?? null,
    locked_affixes: locked,
    pending_affixes: pending.length ? pending : null,
  };
}

function legacyKeyToAffix(key: unknown): RolledForgeAffix | null {
  if (typeof key !== 'string' || !key) return null;
  const map: Record<string, RolledForgeAffix> = {
    atk_3: { id: 'flat_atk', type: 'prefix', stat: 'atk', isPercent: false, value: 3, tier: 5 },
    atk_5: { id: 'flat_atk', type: 'prefix', stat: 'atk', isPercent: false, value: 5, tier: 4 },
    def_3: { id: 'flat_def', type: 'prefix', stat: 'def', isPercent: false, value: 3, tier: 5 },
    def_5: { id: 'flat_def', type: 'prefix', stat: 'def', isPercent: false, value: 5, tier: 4 },
    hp_15: { id: 'flat_hp', type: 'prefix', stat: 'maxHp', isPercent: false, value: 15, tier: 5 },
    hp_25: { id: 'flat_hp', type: 'prefix', stat: 'maxHp', isPercent: false, value: 25, tier: 4 },
    mp_12: { id: 'flat_mp', type: 'prefix', stat: 'maxMp', isPercent: false, value: 12, tier: 5 },
    mp_20: { id: 'flat_mp', type: 'prefix', stat: 'maxMp', isPercent: false, value: 20, tier: 4 },
    crit_1: { id: 'crit_chance', type: 'suffix', stat: 'critChance', isPercent: true, value: 1, tier: 5 },
    dodge_1: { id: 'dodge_chance', type: 'suffix', stat: 'dodgeChance', isPercent: true, value: 1, tier: 5 },
    lifesteal_1: { id: 'lifesteal', type: 'suffix', stat: 'lifesteal', isPercent: true, value: 1, tier: 3 },
    exp_3: { id: 'exp_focus', type: 'suffix', stat: 'expBonus', isPercent: true, value: 3, tier: 5 },
    gold_3: { id: 'gold_find', type: 'suffix', stat: 'goldBonus', isPercent: true, value: 3, tier: 5 },
    drop_2: { id: 'drop_sense', type: 'prefix', stat: 'dropBonus', isPercent: true, value: 2, tier: 5 },
  };
  return map[key] ?? null;
}

export function formatForgeAffix(affix: RolledForgeAffix | ForgeAffixKey | null | undefined): string {
  if (!affix) return '*Chưa có dòng*';
  if (typeof affix === 'string') affix = legacyKeyToAffix(affix);
  if (!affix) return '*Dòng lạ*';
  const sign = affix.value >= 0 ? '+' : '';
  const suffix = affix.isPercent ? '%' : '';
  const kind = affix.type === 'prefix' ? 'Tiền tố' : 'Hậu tố';
  const label = [...PREFIX_POOL, ...SUFFIX_POOL].find(a => a.id === affix!.id)?.label ?? affix.stat;
  return `T${affix.tier} ${kind} · ${label}: ${sign}${affix.value}${suffix}`;
}

export function formatForgeAffixList(meta: EquipmentForgeMeta | undefined, list: RolledForgeAffix[] | null | undefined = meta?.affixes): string {
  if (!meta || !list?.length) return '*Chưa có Affix*';
  return list.map((a, idx) => {
    const locked = meta.locked_affixes.includes(idx) ? ' 🔒' : '';
    return `Dòng ${idx + 1}: ${formatForgeAffix(a)}${locked}`;
  }).join('\n');
}

export function getEquipmentForgeMeta(userId: string, guildId: string, slot: EquipSlot): EquipmentForgeMeta | undefined {
  ensureForgeColumns();
  const row = db.prepare('SELECT * FROM equipment_forge WHERE user_id=? AND guild_id=? AND slot=?')
    .get(userId, guildId, slot) as any;
  return rowToForgeMeta(row);
}

export function ensureEquipmentForgeMeta(userId: string, guildId: string, slot: EquipSlot): EquipmentForgeMeta {
  ensureForgeColumns();
  const worn = getWornInSlot(userId, guildId, slot);
  const def = worn ? getEquipment(worn.equipment_id) : undefined;
  const current = getEquipmentForgeMeta(userId, guildId, slot);
  const itemLevel = current?.item_level && current.item_level > 0 ? current.item_level : inferForgeItemLevel(userId, guildId, def);
  const rarity = (def?.rarity ?? current?.rarity ?? 'common') as Rarity;

  // Nếu đổi món đang mặc ở cùng slot, reset Forge meta để Affix không bám nhầm theo slot.
  if (current && def && current.base_id && current.base_id !== def.id) {
    db.prepare(`
      UPDATE equipment_forge
      SET awakened=0, affix1=NULL, affix2=NULL, locked_affix=0,
          instance_uuid=?, base_id=?, rarity=?, item_level=?, affixes_json=NULL, locked_affixes_json='[]', pending_affixes_json=NULL, updated_at=unixepoch()
      WHERE user_id=? AND guild_id=? AND slot=?
    `).run(makeInstanceUuid(), def.id, rarity, inferForgeItemLevel(userId, guildId, def), userId, guildId, slot);
    return getEquipmentForgeMeta(userId, guildId, slot)!;
  }

  if (current) return current;
  db.prepare(`
    INSERT INTO equipment_forge (user_id, guild_id, slot, awakened, locked_affix, instance_uuid, base_id, rarity, item_level, locked_affixes_json)
    VALUES (?, ?, ?, 0, 0, ?, ?, ?, ?, '[]')
  `).run(userId, guildId, slot, makeInstanceUuid(), def?.id ?? null, rarity, itemLevel);
  return getEquipmentForgeMeta(userId, guildId, slot)!;
}

function saveForgeAffixes(userId: string, guildId: string, slot: EquipSlot, affixes: RolledForgeAffix[], locked: number[] = [], pending: RolledForgeAffix[] | null = null): void {
  const a1 = affixes[0]?.id ?? null;
  const a2 = affixes[1]?.id ?? null;
  db.prepare(`
    UPDATE equipment_forge
    SET awakened=1,
        affix1=?, affix2=?, locked_affix=?,
        affixes_json=?, locked_affixes_json=?, pending_affixes_json=?, updated_at=unixepoch()
    WHERE user_id=? AND guild_id=? AND slot=?
  `).run(
    a1, a2, locked[0] != null ? locked[0] + 1 : 0,
    JSON.stringify(affixes), JSON.stringify(locked), pending ? JSON.stringify(pending) : null,
    userId, guildId, slot
  );
}

export function awakenEquipmentForge(userId: string, guildId: string, slot: EquipSlot): EquipmentForgeMeta {
  const current = ensureEquipmentForgeMeta(userId, guildId, slot);
  if (current.awakened && current.affixes.length) return current;
  const worn = getWornInSlot(userId, guildId, slot);
  const def = worn ? getEquipment(worn.equipment_id) : undefined;
  const rarity = (def?.rarity ?? current.rarity ?? 'common') as Rarity;
  const itemLevel = current.item_level || inferForgeItemLevel(userId, guildId, def);
  const affixes = rollEquipmentAffixes(def?.id ?? current.base_id ?? slot, rarity, itemLevel);
  db.prepare(`
    UPDATE equipment_forge
    SET awakened=1, base_id=COALESCE(?, base_id), rarity=?, item_level=?, affixes_json=?, affix1=?, affix2=?, locked_affixes_json='[]', locked_affix=0, pending_affixes_json=NULL, updated_at=unixepoch()
    WHERE user_id=? AND guild_id=? AND slot=?
  `).run(def?.id ?? null, rarity, itemLevel, JSON.stringify(affixes), affixes[0]?.id ?? null, affixes[1]?.id ?? null, userId, guildId, slot);
  return getEquipmentForgeMeta(userId, guildId, slot)!;
}

export function previewRerollEquipmentForgeAffixes(userId: string, guildId: string, slot: EquipSlot): EquipmentForgeMeta {
  const current = ensureEquipmentForgeMeta(userId, guildId, slot);
  const awakened = current.awakened && current.affixes.length ? current : awakenEquipmentForge(userId, guildId, slot);
  const locked = awakened.locked_affixes.map(i => awakened.affixes[i]).filter(Boolean) as RolledForgeAffix[];
  const pending = rollEquipmentAffixes(awakened.base_id ?? slot, awakened.rarity ?? 'common', awakened.item_level, locked);
  saveForgeAffixes(userId, guildId, slot, awakened.affixes, awakened.locked_affixes, pending);
  return getEquipmentForgeMeta(userId, guildId, slot)!;
}

export function commitPendingForgeAffixes(userId: string, guildId: string, slot: EquipSlot): EquipmentForgeMeta {
  const meta = ensureEquipmentForgeMeta(userId, guildId, slot);
  if (meta.pending_affixes?.length) saveForgeAffixes(userId, guildId, slot, meta.pending_affixes, meta.locked_affixes, null);
  else saveForgeAffixes(userId, guildId, slot, meta.affixes, meta.locked_affixes, null);
  return getEquipmentForgeMeta(userId, guildId, slot)!;
}

export function discardPendingForgeAffixes(userId: string, guildId: string, slot: EquipSlot): EquipmentForgeMeta {
  const meta = ensureEquipmentForgeMeta(userId, guildId, slot);
  saveForgeAffixes(userId, guildId, slot, meta.affixes, meta.locked_affixes, null);
  return getEquipmentForgeMeta(userId, guildId, slot)!;
}

// Backward-compatible immediate reroll for old callers.
export function rerollEquipmentForgeAffixes(userId: string, guildId: string, slot: EquipSlot): EquipmentForgeMeta {
  previewRerollEquipmentForgeAffixes(userId, guildId, slot);
  return commitPendingForgeAffixes(userId, guildId, slot);
}

export function setEquipmentForgeLock(userId: string, guildId: string, slot: EquipSlot, lockedAffix: 0 | 1 | 2): EquipmentForgeMeta {
  const meta = ensureEquipmentForgeMeta(userId, guildId, slot);
  const locked = lockedAffix > 0 ? [lockedAffix - 1] : [];
  saveForgeAffixes(userId, guildId, slot, meta.affixes, locked, null);
  return getEquipmentForgeMeta(userId, guildId, slot)!;
}

export function toggleEquipmentForgeLock(userId: string, guildId: string, slot: EquipSlot, index: number): EquipmentForgeMeta {
  const meta = ensureEquipmentForgeMeta(userId, guildId, slot);
  const maxLocks = Math.min(Math.max(1, Math.floor(meta.affixes.length - 1)), 5);
  const set = new Set(meta.locked_affixes);
  if (set.has(index)) set.delete(index);
  else if (set.size < maxLocks) set.add(index);
  const locked = [...set].filter(i => i >= 0 && i < meta.affixes.length).sort((a, b) => a - b);
  saveForgeAffixes(userId, guildId, slot, meta.affixes, locked, null);
  return getEquipmentForgeMeta(userId, guildId, slot)!;
}

export function clearEquipmentForgeLocks(userId: string, guildId: string, slot: EquipSlot): EquipmentForgeMeta {
  const meta = ensureEquipmentForgeMeta(userId, guildId, slot);
  saveForgeAffixes(userId, guildId, slot, meta.affixes, [], null);
  return getEquipmentForgeMeta(userId, guildId, slot)!;
}

function applyForgeAffix(stats: FullEquipStats, affix: RolledForgeAffix | ForgeAffixKey | null | undefined): void {
  if (!affix) return;
  if (typeof affix === 'string') affix = legacyKeyToAffix(affix);
  if (!affix) return;
  (stats[affix.stat] as number) = ((stats[affix.stat] as number | undefined) ?? 0) + affix.value;
}

function applyAwakenedBonus(stats: FullEquipStats, slot: EquipSlot): void {
  if (slot === 'weapon') {
    stats.atk! += 5;
    stats.critChance! += 1;
    return;
  }
  if (slot === 'armor') {
    stats.def! += 4;
    stats.maxHp! += 20;
    return;
  }
  stats.maxHp! += 10;
  stats.maxMp! += 10;
  stats.dropBonus! += 1;
}

function applyForgeMetaStatBonus(stats: FullEquipStats, slot: EquipSlot, meta?: EquipmentForgeMeta): void {
  if (!meta) return;
  if (meta.awakened) applyAwakenedBonus(stats, slot);
  for (const affix of meta.affixes) applyForgeAffix(stats, affix);
}

export function formatForgeState(userId: string, guildId: string, slot: EquipSlot): string {
  const meta = getEquipmentForgeMeta(userId, guildId, slot);
  if (!meta || !meta.awakened) return 'Legacy: *Chưa thức tỉnh*';
  const prefixCount = meta.affixes.filter(a => a.type === 'prefix').length;
  const suffixCount = meta.affixes.filter(a => a.type === 'suffix').length;
  return `Legacy: **Đã thức tỉnh** · iLvl **${meta.item_level}** · Prefix/Suffix **${prefixCount}/${suffixCount}**\n${formatForgeAffixList(meta)}`;
}

function applyEquipmentStatCaps(stats: FullEquipStats): FullEquipStats {
  stats.critChance = Math.min(25, stats.critChance ?? 0);
  stats.dodgeChance = Math.min(15, stats.dodgeChance ?? 0);
  stats.lifesteal = Math.min(12, stats.lifesteal ?? 0);
  stats.expBonus = Math.min(35, stats.expBonus ?? 0);
  stats.goldBonus = Math.min(35, stats.goldBonus ?? 0);
  stats.dropBonus = Math.min(20, stats.dropBonus ?? 0);
  return stats;
}

// ── Full stat computation with set bonuses ────────────────────────────────
export function getEquipmentStats(userId: string, guildId: string): FullEquipStats {
  const worn     = getWornEquipment(userId, guildId);
  const wornIds  = worn.map(w => w.equipment_id);
  const stats: FullEquipStats = {
    atk: 0, def: 0, maxHp: 0, maxMp: 0,
    critChance: 0, dodgeChance: 0, lifesteal: 0,
    expBonus: 0, goldBonus: 0, dropBonus: 0,
    effects: [], activeSetNames: []
  };

  // Individual item stats + blacksmith upgrade bonuses
  for (const entry of worn) {
    const def = getEquipment(entry.equipment_id);
    if (!def) continue;
    stats.atk!        += def.stats.atk        ?? 0;
    stats.def!        += def.stats.def        ?? 0;
    stats.maxHp!      += def.stats.maxHp      ?? 0;
    stats.maxMp!      += def.stats.maxMp      ?? 0;
    stats.critChance! += def.stats.critChance  ?? 0;
    stats.dodgeChance!+= def.stats.dodgeChance ?? 0;
    stats.lifesteal!  += def.stats.lifesteal   ?? 0;
    stats.expBonus!   += def.stats.expBonus    ?? 0;
    stats.goldBonus!  += def.stats.goldBonus   ?? 0;
    stats.dropBonus!  += def.stats.dropBonus   ?? 0;
    if (def.effects) def.effects.forEach(e => {
      if (!stats.effects.includes(e)) stats.effects.push(e);
    });
    // Blacksmith upgrade bonuses
    const upRow = db.prepare('SELECT upgrade_level FROM equipment_upgrades WHERE user_id=? AND guild_id=? AND slot=?')
      .get(userId, guildId, entry.slot) as any;
    const upLv = upRow?.upgrade_level ?? 0;
    if (upLv > 0) {
      applyUpgradeStatBonus(stats, entry.slot, def, upLv);
    }

    // Legacy forge bonuses: awakened gear + rerolled affixes.
    applyForgeMetaStatBonus(stats, entry.slot, ensureEquipmentForgeMeta(userId, guildId, entry.slot));
  }

  // Set bonuses
  const { stats: setBonuses, effects: setEffects } = getSetBonuses(wornIds);
  stats.atk!        += setBonuses.atk        ?? 0;
  stats.def!        += setBonuses.def        ?? 0;
  stats.maxHp!      += setBonuses.maxHp      ?? 0;
  stats.maxMp!      += setBonuses.maxMp      ?? 0;
  stats.critChance! += setBonuses.critChance  ?? 0;
  stats.dodgeChance!+= setBonuses.dodgeChance ?? 0;
  stats.lifesteal!  += setBonuses.lifesteal   ?? 0;
  stats.expBonus!   += setBonuses.expBonus    ?? 0;
  stats.goldBonus!  += setBonuses.goldBonus   ?? 0;
  stats.dropBonus!  += setBonuses.dropBonus   ?? 0;
  setEffects.forEach(e => { if (!stats.effects.includes(e)) stats.effects.push(e); });

  return applyEquipmentStatCaps(stats);
}

// ── Inventory helpers ─────────────────────────────────────────────────────
export function getOwnedEquipment(userId: string, guildId: string): EquipmentDef[] {
  const rows = db.prepare(`
    SELECT item_id FROM inventory WHERE user_id=? AND guild_id=?
  `).all(userId, guildId) as unknown as Array<{ item_id: string }>;
  return rows.map(r => getEquipment(r.item_id)).filter(Boolean) as EquipmentDef[];
}

// ── Format gear display ───────────────────────────────────────────────────
export function formatWornGear(userId: string, guildId: string): string {
  const worn    = getWornEquipment(userId, guildId);
  const slots   = ['weapon', 'armor', 'accessory1', 'accessory2'] as EquipSlot[];
  return slots.map(slot => {
    const entry = worn.find(w => w.slot === slot);
    const label = `${SLOT_ICONS[slot]} ${SLOT_LABELS[slot]}`;
    if (!entry) return `${label} — *Trống*`;
    const def = getEquipment(entry.equipment_id);
    if (!def) return `${label} — ???`;
    const statsStr = [
      def.stats.atk        ? `+${def.stats.atk} ATK`     : '',
      def.stats.def        ? `+${def.stats.def} DEF`     : '',
      def.stats.maxHp      ? `+${def.stats.maxHp} HP`    : '',
      def.stats.maxMp      ? `+${def.stats.maxMp} MP`    : '',
      def.stats.critChance ? `+${def.stats.critChance}% Crit` : '',
      def.stats.dodgeChance? `+${def.stats.dodgeChance}% Dodge`: '',
      def.stats.lifesteal  ? `+${def.stats.lifesteal}% LS`    : '',
      def.stats.expBonus   ? `+${def.stats.expBonus}% EXP`     : '',
      def.stats.goldBonus  ? `+${def.stats.goldBonus}% Gold`   : '',
      def.stats.dropBonus  ? `+${def.stats.dropBonus}% Drop`   : '',
    ].filter(Boolean).join(', ');
    return `${def.icon} **${def.name}** [${RARITY_LABELS[def.rarity]}]\n  └ ${statsStr || '*no stats*'}`;
  }).join('\n');
}
