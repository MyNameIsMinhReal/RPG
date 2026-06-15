import { randomUUID } from 'crypto';
import db from '../database/index';
import { getEquipment, type EquipmentDef, type EquipStats, type EquipSlot, RARITY_LABELS } from '../data/equipment';
import { rollAffixesForEquipment, affixesToStats, formatAffixLine, type RolledAffix } from '../data/affixes';
import { getItemQty, removeItem, spendGold } from './player';

export interface EquipmentInstanceRow {
  uuid: string;
  user_id: string;
  guild_id: string;
  base_id: string;
  rarity: string;
  item_level: number;
  affixes_json: string;
  locked_affixes_json: string;
  is_legacy: number;
  created_at: number;
}

export interface EquipmentInstanceView extends EquipmentInstanceRow {
  base?: EquipmentDef;
  affixes: RolledAffix[];
  lockedAffixes: number[];
}

export function safeJsonArray<T>(raw: string | null | undefined): T[] {
  try {
    const parsed = JSON.parse(raw || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

export function hydrateEquipmentInstance(row: EquipmentInstanceRow): EquipmentInstanceView {
  return {
    ...row,
    base: getEquipment(row.base_id),
    affixes: safeJsonArray<RolledAffix>(row.affixes_json),
    lockedAffixes: safeJsonArray<number>(row.locked_affixes_json),
  };
}

export function getEquipmentInstance(uuid: string): EquipmentInstanceView | undefined {
  const row = db.prepare('SELECT * FROM equipment_instances WHERE uuid=?').get(uuid) as EquipmentInstanceRow | undefined;
  return row ? hydrateEquipmentInstance(row) : undefined;
}

export function getOwnedEquipmentInstances(userId: string, guildId: string): EquipmentInstanceView[] {
  const rows = db.prepare('SELECT * FROM equipment_instances WHERE user_id=? AND guild_id=? ORDER BY created_at DESC')
    .all(userId, guildId) as unknown as EquipmentInstanceRow[];
  return rows.map(hydrateEquipmentInstance).filter(x => !!x.base);
}

export function getWornInstanceUuids(userId: string, guildId: string): Set<string> {
  const rows = db.prepare('SELECT equipment_uuid FROM equipment_worn WHERE user_id=? AND guild_id=? AND equipment_uuid IS NOT NULL')
    .all(userId, guildId) as { equipment_uuid: string }[];
  return new Set(rows.map(r => r.equipment_uuid).filter(Boolean));
}

const ZONE_ILVL: Record<string, number> = { village: 3, forest: 7, shrine: 15, mines: 25, wastes: 35 };
const RARITY_ILVL: Record<string, number> = { common: 3, rare: 8, epic: 15, legendary: 25, mythic: 35, cursed: 30 };

export function inferItemLevel(base: EquipmentDef, playerLevel = 1, enemyLevel?: number, boss = false, miniboss = false): number {
  if (enemyLevel && enemyLevel > 0) return Math.max(1, enemyLevel + (boss ? 5 : miniboss ? 2 : 0));
  const zoneBase = ZONE_ILVL[base.minZone ?? 'village'] ?? 3;
  const rarityBase = RARITY_ILVL[base.rarity] ?? 3;
  return Math.max(zoneBase, rarityBase, playerLevel || 1);
}

export function createEquipmentInstance(
  userId: string,
  guildId: string,
  baseId: string,
  itemLevel: number,
  opts: { legacy?: boolean; affixes?: RolledAffix[] } = {}
): EquipmentInstanceView | undefined {
  const base = getEquipment(baseId);
  if (!base) return undefined;
  const uuid = randomUUID();
  const affixes = opts.affixes ?? rollAffixesForEquipment(base, Math.max(1, itemLevel), !!opts.legacy);
  db.prepare(`
    INSERT INTO equipment_instances(uuid, user_id, guild_id, base_id, rarity, item_level, affixes_json, locked_affixes_json, is_legacy)
    VALUES (?, ?, ?, ?, ?, ?, ?, '[]', ?)
  `).run(uuid, userId, guildId, baseId, base.rarity, Math.max(1, itemLevel), JSON.stringify(affixes), opts.legacy ? 1 : 0);
  return getEquipmentInstance(uuid);
}

export function createDroppedEquipmentInstance(
  userId: string,
  guildId: string,
  baseId: string,
  playerLevel: number,
  enemy?: { level?: number; boss?: boolean; miniboss?: boolean }
): EquipmentInstanceView | undefined {
  const base = getEquipment(baseId);
  if (!base) return undefined;
  return createEquipmentInstance(userId, guildId, baseId, inferItemLevel(base, playerLevel, enemy?.level, !!enemy?.boss, !!enemy?.miniboss));
}

export function getInstanceAffixStats(uuid: string): EquipStats {
  const inst = getEquipmentInstance(uuid);
  return inst ? affixesToStats(inst.affixes) : {};
}

export function getInstanceUpgradeLevel(uuid: string): number {
  const row = db.prepare('SELECT upgrade_level FROM equipment_instance_upgrades WHERE uuid=?').get(uuid) as { upgrade_level: number } | undefined;
  return row?.upgrade_level ?? 0;
}

export function increaseInstanceUpgrade(uuid: string, userId: string, guildId: string): number {
  db.prepare(`
    INSERT INTO equipment_instance_upgrades(uuid, user_id, guild_id, upgrade_level)
    VALUES (?, ?, ?, 1)
    ON CONFLICT(uuid) DO UPDATE SET upgrade_level = upgrade_level + 1
  `).run(uuid, userId, guildId);
  return getInstanceUpgradeLevel(uuid);
}

export function wearEquipmentInstance(userId: string, guildId: string, uuid: string): { ok: boolean; reason?: string; slot?: EquipSlot } {
  const inst = getEquipmentInstance(uuid);
  if (!inst || inst.user_id !== userId || inst.guild_id !== guildId || !inst.base) return { ok: false, reason: 'not_found' };
  let targetSlot: EquipSlot = inst.base.slot;
  if (inst.base.slot === 'accessory1' || inst.base.slot === 'accessory2') {
    const accRows = db.prepare('SELECT slot, equipment_uuid FROM equipment_worn WHERE user_id=? AND guild_id=? AND slot IN (\'accessory1\',\'accessory2\')')
      .all(userId, guildId) as Array<{ slot: EquipSlot; equipment_uuid?: string }>;
    const already = accRows.find(r => r.equipment_uuid === uuid);
    if (already) targetSlot = already.slot;
    else if (!accRows.some(r => r.slot === 'accessory1')) targetSlot = 'accessory1';
    else if (!accRows.some(r => r.slot === 'accessory2')) targetSlot = 'accessory2';
    else targetSlot = 'accessory1';
  }
  db.prepare(`
    INSERT OR REPLACE INTO equipment_worn(user_id, guild_id, slot, equipment_id, equipment_uuid)
    VALUES (?, ?, ?, ?, ?)
  `).run(userId, guildId, targetSlot, inst.base_id, uuid);
  return { ok: true, slot: targetSlot };
}

export function formatEquipmentInstanceName(inst: EquipmentInstanceView, short = true): string {
  const base = inst.base ?? getEquipment(inst.base_id);
  const code = inst.uuid.slice(0, 4).toUpperCase();
  const legacy = inst.is_legacy ? ' · Legacy' : '';
  const name = `${base?.icon ?? '⚔️'} ${base?.name ?? inst.base_id} #${code}`;
  return short ? name : `${name} [${RARITY_LABELS[(base?.rarity ?? 'common') as keyof typeof RARITY_LABELS]} · iLvl ${inst.item_level}${legacy}]`;
}

export function formatInstanceAffixes(inst: EquipmentInstanceView, includeLocks = true): string {
  if (!inst.affixes.length) return '*Không có affix*';
  const locks = new Set(inst.lockedAffixes);
  return inst.affixes.map((a, idx) => `${includeLocks && locks.has(idx) ? '🔒 ' : ''}${idx + 1}. ${formatAffixLine(a)}`).join('\n');
}

export function formatEquipmentRewardInstance(inst?: EquipmentInstanceView): string {
  if (!inst || !inst.base) return '⚔️ Trang bị không xác định';
  return `${formatEquipmentInstanceName(inst, false)}\n${formatInstanceAffixes(inst, false)}`;
}

export function awakenLegacyEquipment(userId: string, guildId: string, baseId: string, playerLevel: number): { ok: boolean; reason?: string; instance?: EquipmentInstanceView } {
  const base = getEquipment(baseId);
  if (!base) return { ok: false, reason: 'invalid_equipment' };
  if (getItemQty(userId, guildId, 'legacy_spark') < 1) return { ok: false, reason: 'no_spark' };
  if (getItemQty(userId, guildId, baseId) < 1) return { ok: false, reason: 'no_equipment' };
  if (!removeItem(userId, guildId, 'legacy_spark', 1)) return { ok: false, reason: 'no_spark' };
  if (!removeItem(userId, guildId, baseId, 1)) {
    // Trả lại spark nếu có lỗi hiếm.
    db.prepare(`INSERT INTO inventory(user_id,guild_id,item_id,quantity) VALUES(?,?, 'legacy_spark', 1) ON CONFLICT(user_id,guild_id,item_id) DO UPDATE SET quantity=quantity+1`).run(userId, guildId);
    return { ok: false, reason: 'no_equipment' };
  }
  const inst = createEquipmentInstance(userId, guildId, baseId, inferItemLevel(base, playerLevel), { legacy: true });
  return inst ? { ok: true, instance: inst } : { ok: false, reason: 'create_failed' };
}

export function setLockedAffixes(uuid: string, indexes: number[]): void {
  const uniq = [...new Set(indexes.map(Number).filter(n => Number.isInteger(n) && n >= 0))].slice(0, 5);
  db.prepare('UPDATE equipment_instances SET locked_affixes_json=? WHERE uuid=?').run(JSON.stringify(uniq), uuid);
}

export function lockAffix(uuid: string, index: number): { ok: boolean; reason?: string; instance?: EquipmentInstanceView } {
  const inst = getEquipmentInstance(uuid);
  if (!inst) return { ok: false, reason: 'not_found' };
  if (index < 0 || index >= inst.affixes.length) return { ok: false, reason: 'bad_index' };
  if (inst.lockedAffixes.includes(index)) return { ok: false, reason: 'already_locked', instance: inst };
  const next = [...inst.lockedAffixes, index];
  setLockedAffixes(uuid, next);
  return { ok: true, instance: getEquipmentInstance(uuid) };
}

function reforgeCost(inst: EquipmentInstanceView): { gold: number; voidShard: number; lostMemory: number } {
  const rarity = inst.base?.rarity ?? 'common';
  const table: Record<string, { gold: number; voidShard: number; lostMemory: number }> = {
    common: { gold: 150, voidShard: 0, lostMemory: 0 },
    rare: { gold: 300, voidShard: 1, lostMemory: 0 },
    epic: { gold: 800, voidShard: 2, lostMemory: 1 },
    legendary: { gold: 2000, voidShard: 5, lostMemory: 3 },
    mythic: { gold: 5000, voidShard: 8, lostMemory: 5 },
    cursed: { gold: 5000, voidShard: 6, lostMemory: 5 },
  };
  const base = table[rarity] ?? table.common;
  return inst.is_legacy ? { ...base, lostMemory: base.lostMemory + 1 } : base;
}

export function getReforgeCost(inst: EquipmentInstanceView) { return reforgeCost(inst); }

export function canPayReforge(userId: string, guildId: string, cost: { gold: number; voidShard: number; lostMemory: number }): boolean {
  const p = db.prepare('SELECT gold FROM players WHERE user_id=? AND guild_id=?').get(userId, guildId) as { gold: number } | undefined;
  return !!p && p.gold >= cost.gold && getItemQty(userId, guildId, 'void_shard') >= cost.voidShard && getItemQty(userId, guildId, 'lost_memory') >= cost.lostMemory;
}

export function payReforge(userId: string, guildId: string, cost: { gold: number; voidShard: number; lostMemory: number }): boolean {
  if (!canPayReforge(userId, guildId, cost)) return false;
  if (!spendGold(userId, guildId, cost.gold)) return false;
  if (cost.voidShard > 0 && !removeItem(userId, guildId, 'void_shard', cost.voidShard)) return false;
  if (cost.lostMemory > 0 && !removeItem(userId, guildId, 'lost_memory', cost.lostMemory)) return false;
  return true;
}

export function createReforgeOffer(userId: string, guildId: string, uuid: string): { ok: boolean; reason?: string; offerId?: string; oldAffixes?: RolledAffix[]; newAffixes?: RolledAffix[]; cost?: ReturnType<typeof reforgeCost> } {
  const inst = getEquipmentInstance(uuid);
  if (!inst || inst.user_id !== userId || inst.guild_id !== guildId || !inst.base) return { ok: false, reason: 'not_found' };
  const cost = reforgeCost(inst);
  if (!payReforge(userId, guildId, cost)) return { ok: false, reason: 'no_materials', cost };

  const fresh = rollAffixesForEquipment(inst.base, inst.item_level, !!inst.is_legacy);
  const locked = new Set(inst.lockedAffixes);
  const newAffixes = inst.affixes.map((old, idx) => locked.has(idx) ? old : (fresh.shift() ?? old));
  // Nếu số affix mới dài hơn cũ do pool thay đổi, thêm phần dư nhưng không vượt count hiện tại + 1.
  while (newAffixes.length < inst.affixes.length && fresh.length) newAffixes.push(fresh.shift()!);

  const offerId = randomUUID();
  db.prepare(`
    INSERT INTO equipment_reforge_offers(offer_id, user_id, guild_id, equipment_uuid, old_affixes_json, new_affixes_json, expires_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(offerId, userId, guildId, uuid, JSON.stringify(inst.affixes), JSON.stringify(newAffixes), Math.floor(Date.now() / 1000) + 120);
  return { ok: true, offerId, oldAffixes: inst.affixes, newAffixes, cost };
}

export function acceptReforgeOffer(userId: string, guildId: string, offerId: string): { ok: boolean; reason?: string; instance?: EquipmentInstanceView } {
  const now = Math.floor(Date.now() / 1000);
  const offer = db.prepare('SELECT * FROM equipment_reforge_offers WHERE offer_id=? AND user_id=? AND guild_id=?')
    .get(offerId, userId, guildId) as any;
  if (!offer) return { ok: false, reason: 'not_found' };
  db.prepare('DELETE FROM equipment_reforge_offers WHERE offer_id=?').run(offerId);
  if (offer.expires_at <= now) return { ok: false, reason: 'expired' };
  db.prepare('UPDATE equipment_instances SET affixes_json=? WHERE uuid=? AND user_id=? AND guild_id=?')
    .run(offer.new_affixes_json, offer.equipment_uuid, userId, guildId);
  return { ok: true, instance: getEquipmentInstance(offer.equipment_uuid) };
}

export function rejectReforgeOffer(userId: string, guildId: string, offerId: string): void {
  db.prepare('DELETE FROM equipment_reforge_offers WHERE offer_id=? AND user_id=? AND guild_id=?')
    .run(offerId, userId, guildId);
}

export function legacyEquipmentBaseOptions(userId: string, guildId: string): EquipmentDef[] {
  const rows = db.prepare('SELECT item_id FROM inventory WHERE user_id=? AND guild_id=? AND quantity > 0')
    .all(userId, guildId) as { item_id: string }[];
  return rows.map(r => getEquipment(r.item_id)).filter(Boolean) as EquipmentDef[];
}
