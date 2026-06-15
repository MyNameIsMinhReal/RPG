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
