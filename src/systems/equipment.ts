import db from '../database/index';
import { getEquipment, getSetBonuses, SLOT_ICONS, SLOT_LABELS, RARITY_LABELS, type EquipmentDef, type EquipSlot, type EquipStats, type EquipEffect } from '../data/equipment';

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


export type ForgeAffixKey =
  | 'atk_3' | 'atk_5'
  | 'def_3' | 'def_5'
  | 'hp_15' | 'hp_25'
  | 'mp_12' | 'mp_20'
  | 'crit_1' | 'dodge_1'
  | 'lifesteal_1'
  | 'exp_3' | 'gold_3' | 'drop_2';

export interface ForgeAffixDef {
  key: ForgeAffixKey;
  label: string;
  stat: keyof EquipStats;
  amount: number;
  weight: number;
}

export interface EquipmentForgeMeta {
  user_id: string;
  guild_id: string;
  slot: EquipSlot;
  awakened: number;
  affix1: ForgeAffixKey | null;
  affix2: ForgeAffixKey | null;
  locked_affix: number;
  updated_at?: number;
}

export const FORGE_AFFIXES: Record<ForgeAffixKey, ForgeAffixDef> = {
  atk_3:       { key: 'atk_3',       label: '+3 ATK',        stat: 'atk',         amount: 3,  weight: 15 },
  atk_5:       { key: 'atk_5',       label: '+5 ATK',        stat: 'atk',         amount: 5,  weight: 6  },
  def_3:       { key: 'def_3',       label: '+3 DEF',        stat: 'def',         amount: 3,  weight: 15 },
  def_5:       { key: 'def_5',       label: '+5 DEF',        stat: 'def',         amount: 5,  weight: 6  },
  hp_15:       { key: 'hp_15',       label: '+15 HP',        stat: 'maxHp',       amount: 15, weight: 14 },
  hp_25:       { key: 'hp_25',       label: '+25 HP',        stat: 'maxHp',       amount: 25, weight: 6  },
  mp_12:       { key: 'mp_12',       label: '+12 MP',        stat: 'maxMp',       amount: 12, weight: 12 },
  mp_20:       { key: 'mp_20',       label: '+20 MP',        stat: 'maxMp',       amount: 20, weight: 5  },
  crit_1:      { key: 'crit_1',      label: '+1% Crit',      stat: 'critChance',  amount: 1,  weight: 8  },
  dodge_1:     { key: 'dodge_1',     label: '+1% Dodge',     stat: 'dodgeChance', amount: 1,  weight: 8  },
  lifesteal_1: { key: 'lifesteal_1', label: '+1% Lifesteal', stat: 'lifesteal',   amount: 1,  weight: 5  },
  exp_3:       { key: 'exp_3',       label: '+3% EXP',       stat: 'expBonus',    amount: 3,  weight: 8  },
  gold_3:      { key: 'gold_3',      label: '+3% Gold',      stat: 'goldBonus',   amount: 3,  weight: 8  },
  drop_2:      { key: 'drop_2',      label: '+2% Drop',      stat: 'dropBonus',   amount: 2,  weight: 7  },
};

const FORGE_AFFIX_KEYS = Object.keys(FORGE_AFFIXES) as ForgeAffixKey[];

function normalizeAffixKey(value: unknown): ForgeAffixKey | null {
  return typeof value === 'string' && value in FORGE_AFFIXES ? value as ForgeAffixKey : null;
}

function pickForgeAffix(exclude: ForgeAffixKey[] = []): ForgeAffixKey {
  const pool = FORGE_AFFIX_KEYS.filter(k => !exclude.includes(k));
  const total = pool.reduce((sum, key) => sum + FORGE_AFFIXES[key].weight, 0);
  let roll = Math.random() * total;
  for (const key of pool) {
    roll -= FORGE_AFFIXES[key].weight;
    if (roll <= 0) return key;
  }
  return pool[0] ?? 'atk_3';
}

export function rollForgeAffixes(locked?: ForgeAffixKey | null): [ForgeAffixKey, ForgeAffixKey] {
  const first = locked ?? pickForgeAffix();
  const second = pickForgeAffix([first]);
  return [first, second];
}

export function formatForgeAffix(key: ForgeAffixKey | null | undefined): string {
  if (!key) return '*Chưa có dòng*';
  return FORGE_AFFIXES[key]?.label ?? '*Dòng lạ*';
}

export function getEquipmentForgeMeta(userId: string, guildId: string, slot: EquipSlot): EquipmentForgeMeta | undefined {
  const row = db.prepare('SELECT * FROM equipment_forge WHERE user_id=? AND guild_id=? AND slot=?')
    .get(userId, guildId, slot) as any;
  if (!row) return undefined;
  return {
    ...row,
    slot: row.slot as EquipSlot,
    affix1: normalizeAffixKey(row.affix1),
    affix2: normalizeAffixKey(row.affix2),
    awakened: Number(row.awakened ?? 0),
    locked_affix: Number(row.locked_affix ?? 0),
  };
}

export function ensureEquipmentForgeMeta(userId: string, guildId: string, slot: EquipSlot): EquipmentForgeMeta {
  const existing = getEquipmentForgeMeta(userId, guildId, slot);
  if (existing) return existing;
  db.prepare(`
    INSERT INTO equipment_forge (user_id, guild_id, slot, awakened, locked_affix)
    VALUES (?, ?, ?, 0, 0)
  `).run(userId, guildId, slot);
  return getEquipmentForgeMeta(userId, guildId, slot)!;
}

export function awakenEquipmentForge(userId: string, guildId: string, slot: EquipSlot): EquipmentForgeMeta {
  const current = ensureEquipmentForgeMeta(userId, guildId, slot);
  const [a1, a2] = current.affix1 && current.affix2
    ? [current.affix1, current.affix2]
    : rollForgeAffixes();
  db.prepare(`
    INSERT INTO equipment_forge (user_id, guild_id, slot, awakened, affix1, affix2, locked_affix, updated_at)
    VALUES (?, ?, ?, 1, ?, ?, COALESCE(?, 0), unixepoch())
    ON CONFLICT(user_id, guild_id, slot) DO UPDATE SET
      awakened=1,
      affix1=COALESCE(equipment_forge.affix1, excluded.affix1),
      affix2=COALESCE(equipment_forge.affix2, excluded.affix2),
      updated_at=unixepoch()
  `).run(userId, guildId, slot, a1, a2, current.locked_affix ?? 0);
  return getEquipmentForgeMeta(userId, guildId, slot)!;
}

export function rerollEquipmentForgeAffixes(userId: string, guildId: string, slot: EquipSlot): EquipmentForgeMeta {
  const current = ensureEquipmentForgeMeta(userId, guildId, slot);
  let affix1: ForgeAffixKey;
  let affix2: ForgeAffixKey;
  if (current.locked_affix === 1 && current.affix1) {
    affix1 = current.affix1;
    affix2 = pickForgeAffix([affix1]);
  } else if (current.locked_affix === 2 && current.affix2) {
    affix2 = current.affix2;
    affix1 = pickForgeAffix([affix2]);
  } else {
    [affix1, affix2] = rollForgeAffixes();
  }
  db.prepare(`
    INSERT INTO equipment_forge (user_id, guild_id, slot, awakened, affix1, affix2, locked_affix, updated_at)
    VALUES (?, ?, ?, 1, ?, ?, COALESCE(?, 0), unixepoch())
    ON CONFLICT(user_id, guild_id, slot) DO UPDATE SET
      awakened=1, affix1=excluded.affix1, affix2=excluded.affix2, updated_at=unixepoch()
  `).run(userId, guildId, slot, affix1, affix2, current.locked_affix ?? 0);
  return getEquipmentForgeMeta(userId, guildId, slot)!;
}

export function setEquipmentForgeLock(userId: string, guildId: string, slot: EquipSlot, lockedAffix: 0 | 1 | 2): EquipmentForgeMeta {
  ensureEquipmentForgeMeta(userId, guildId, slot);
  db.prepare(`
    UPDATE equipment_forge SET locked_affix=?, updated_at=unixepoch()
    WHERE user_id=? AND guild_id=? AND slot=?
  `).run(lockedAffix, userId, guildId, slot);
  return getEquipmentForgeMeta(userId, guildId, slot)!;
}

function applyForgeAffix(stats: FullEquipStats, key: ForgeAffixKey | null | undefined): void {
  if (!key) return;
  const affix = FORGE_AFFIXES[key];
  if (!affix) return;
  (stats[affix.stat] as number) = ((stats[affix.stat] as number | undefined) ?? 0) + affix.amount;
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
  applyForgeAffix(stats, meta.affix1);
  applyForgeAffix(stats, meta.affix2);
}

export function formatForgeState(userId: string, guildId: string, slot: EquipSlot): string {
  const meta = getEquipmentForgeMeta(userId, guildId, slot);
  if (!meta || !meta.awakened) return 'Legacy: *Chưa thức tỉnh*';
  const lock1 = meta.locked_affix === 1 ? ' 🔒' : '';
  const lock2 = meta.locked_affix === 2 ? ' 🔒' : '';
  return `Legacy: **Đã thức tỉnh**
  └ Dòng 1: ${formatForgeAffix(meta.affix1)}${lock1}
  └ Dòng 2: ${formatForgeAffix(meta.affix2)}${lock2}`;
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
    applyForgeMetaStatBonus(stats, entry.slot, getEquipmentForgeMeta(userId, guildId, entry.slot));
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
