import db from '../database/index';
import { expNext } from '../utils/format';
import { SKILLS, getSkill } from '../data/skills';
import { getEquipmentStats } from './equipment';
import type { PlayerRow } from '../utils/embeds';

export interface SkillPoolEntry { skill_id: string; learned_at: number; }
export interface LoadoutEntry   { slot: number; skill_id: string; }
export interface InventoryEntry { item_id: string; quantity: number; }

// ── Get / create ─────────────────────────────────────────────────────────
export function getPlayer(userId: string, guildId: string): PlayerRow | undefined {
  return db.prepare('SELECT * FROM players WHERE user_id = ? AND guild_id = ?')
    .get(userId, guildId) as unknown as PlayerRow | undefined;
}

export function createPlayer(userId: string, guildId: string, name: string): PlayerRow {
  db.prepare(`
    INSERT OR REPLACE INTO players
    (user_id, guild_id, name, alive, level, exp, exp_next, hp, max_hp, mp, max_mp, atk, def, gold, soul_shards, zone_id, deaths, kills)
    VALUES (?, ?, ?, 1, 1, 0, 100, 100, 100, 50, 50, 10, 5, 50, 0, 'village', 0, 0)
  `).run(userId, guildId, name);
  return getPlayer(userId, guildId)!;
}

export function resetPlayer(userId: string, guildId: string): void {
  // Keep soul_shards and deaths count; reset everything else
  db.prepare(`
    UPDATE players SET
      alive = 1, level = 1, exp = 0, exp_next = 100,
      hp = 100, max_hp = 100, mp = 50, max_mp = 50,
      atk = 10, def = 5, gold = 50, zone_id = 'village', kills = 0
    WHERE user_id = ? AND guild_id = ?
  `).run(userId, guildId);
  // Clear loadout (pool is kept)
  db.prepare('DELETE FROM skill_loadout WHERE user_id = ? AND guild_id = ?').run(userId, guildId);
  // Clear inventory
  db.prepare('DELETE FROM inventory WHERE user_id = ? AND guild_id = ?').run(userId, guildId);
}

// ── Stat helpers ──────────────────────────────────────────────────────────
export function applyPassiveStats(player: PlayerRow): PlayerRow {
  const loadout = getLoadout(player.user_id, player.guild_id);
  let bonusDef = 0, bonusAtk = 0, bonusMaxHp = 0, bonusMaxMp = 0;

  for (const entry of loadout) {
    const sk = getSkill(entry.skill_id);
    if (!sk || sk.type !== 'passive' || !sk.passiveBonus) continue;
    bonusDef   += sk.passiveBonus.def    ?? 0;
    bonusMaxHp += sk.passiveBonus.maxHp  ?? 0;
    bonusMaxMp += sk.passiveBonus.maxMp  ?? 0;
  }

  // Full equipment stat bonuses (includes set bonuses, crit, dodge, etc.)
  const eq = getEquipmentStats(player.user_id, player.guild_id);
  bonusAtk   += eq.atk   ?? 0;
  bonusDef   += eq.def   ?? 0;
  bonusMaxHp += eq.maxHp ?? 0;
  bonusMaxMp += eq.maxMp ?? 0;

  return {
    ...player,
    atk:    player.atk    + bonusAtk,
    def:    Math.max(0, player.def + bonusDef),
    max_hp: Math.max(10, player.max_hp + bonusMaxHp),
    max_mp: Math.max(5,  player.max_mp + bonusMaxMp),
  };
}

export function updatePlayerHpMp(userId: string, guildId: string, hp: number, mp: number): void {
  db.prepare('UPDATE players SET hp = ?, mp = ? WHERE user_id = ? AND guild_id = ?')
    .run(hp, mp, userId, guildId);
}

export function updatePlayerLastExplore(userId: string, guildId: string, lastExplore: number): void {
  db.prepare('UPDATE players SET last_explore = ? WHERE user_id = ? AND guild_id = ?')
    .run(lastExplore, userId, guildId);
}

export function incrementKills(userId: string, guildId: string): void {
  db.prepare('UPDATE players SET kills = kills + 1 WHERE user_id = ? AND guild_id = ?')
    .run(userId, guildId);
}

// ── EXP / Level up ────────────────────────────────────────────────────────
export interface LevelUpResult {
  leveledUp: boolean;
  newLevel: number;
  hpGain: number;
  mpGain: number;
  atkGain: number;
  defGain: number;
}

export function grantExp(userId: string, guildId: string, amount: number): LevelUpResult {
  const player = getPlayer(userId, guildId)!;
  let { level, exp, exp_next, hp, max_hp, mp, max_mp, atk, def } = player;
  exp += amount;

  let leveledUp = false;
  let hpGain = 0, mpGain = 0, atkGain = 0, defGain = 0;

  while (exp >= exp_next) {
    exp -= exp_next;
    level++;
    exp_next = expNext(level);
    // Stat gains on level up
    const hg = Math.floor(10 + level * 2);
    const mg = Math.floor(5 + level);
    const ag = Math.floor(2 + level * 0.5);
    const dg = Math.floor(1 + level * 0.3);
    max_hp += hg; hp = Math.min(max_hp, hp + hg);
    max_mp += mg; mp = Math.min(max_mp, mp + mg);
    atk    += ag;
    def    += dg;
    hpGain += hg; mpGain += mg; atkGain += ag; defGain += dg;
    leveledUp = true;
  }

  db.prepare(`
    UPDATE players SET level=?, exp=?, exp_next=?, hp=?, max_hp=?, mp=?, max_mp=?, atk=?, def=?
    WHERE user_id=? AND guild_id=?
  `).run(level, exp, exp_next, hp, max_hp, mp, max_mp, atk, def, userId, guildId);

  return { leveledUp, newLevel: level, hpGain, mpGain, atkGain, defGain };
}

// ── Gold ──────────────────────────────────────────────────────────────────
export function grantGold(userId: string, guildId: string, amount: number): void {
  db.prepare('UPDATE players SET gold = gold + ? WHERE user_id = ? AND guild_id = ?')
    .run(amount, userId, guildId);
}

export function spendGold(userId: string, guildId: string, amount: number): boolean {
  const player = getPlayer(userId, guildId);
  if (!player || player.gold < amount) return false;
  db.prepare('UPDATE players SET gold = gold - ? WHERE user_id = ? AND guild_id = ?')
    .run(amount, userId, guildId);
  return true;
}

export function grantSoulShards(userId: string, guildId: string, amount: number): void {
  db.prepare('UPDATE players SET soul_shards = soul_shards + ? WHERE user_id = ? AND guild_id = ?')
    .run(amount, userId, guildId);
}

// ── Zone ──────────────────────────────────────────────────────────────────
export function setZone(userId: string, guildId: string, zoneId: string): void {
  db.prepare('UPDATE players SET zone_id = ? WHERE user_id = ? AND guild_id = ?')
    .run(zoneId, userId, guildId);
}

// ── Reputation ────────────────────────────────────────────────────────────
export function adjustReputation(userId: string, guildId: string, amount: number): number {
  db.prepare(`
    UPDATE players
    SET reputation = MAX(-100, MIN(100, COALESCE(reputation, 0) + ?))
    WHERE user_id = ? AND guild_id = ?
  `).run(amount, userId, guildId);

  const row = db.prepare('SELECT reputation FROM players WHERE user_id=? AND guild_id=?')
    .get(userId, guildId) as unknown as { reputation: number } | undefined;
  return row?.reputation ?? 0;
}

// ── Skill Pool ────────────────────────────────────────────────────────────
export function getSkillPool(userId: string, guildId: string): SkillPoolEntry[] {
  return db.prepare('SELECT skill_id, learned_at FROM skill_pool WHERE user_id=? AND guild_id=?')
    .all(userId, guildId) as unknown as SkillPoolEntry[];
}

export function hasSkillInPool(userId: string, guildId: string, skillId: string): boolean {
  const row = db.prepare('SELECT 1 FROM skill_pool WHERE user_id=? AND guild_id=? AND skill_id=?')
    .get(userId, guildId, skillId);
  return !!row;
}

export function addSkillToPool(userId: string, guildId: string, skillId: string): boolean {
  if (hasSkillInPool(userId, guildId, skillId)) return false;
  db.prepare('INSERT INTO skill_pool (user_id, guild_id, skill_id) VALUES (?, ?, ?)')
    .run(userId, guildId, skillId);
  return true;
}

// ── Skill Loadout ─────────────────────────────────────────────────────────
export function getLoadout(userId: string, guildId: string): LoadoutEntry[] {
  return db.prepare('SELECT slot, skill_id FROM skill_loadout WHERE user_id=? AND guild_id=? ORDER BY slot')
    .all(userId, guildId) as unknown as LoadoutEntry[];
}

export function equipSkill(userId: string, guildId: string, slot: number, skillId: string): void {
  db.prepare(`
    INSERT OR REPLACE INTO skill_loadout (user_id, guild_id, slot, skill_id) VALUES (?, ?, ?, ?)
  `).run(userId, guildId, slot, skillId);
}

export function unequipSkill(userId: string, guildId: string, slot: number): void {
  db.prepare('DELETE FROM skill_loadout WHERE user_id=? AND guild_id=? AND slot=?')
    .run(userId, guildId, slot);
}

// ── Inventory ─────────────────────────────────────────────────────────────
export function getInventory(userId: string, guildId: string): InventoryEntry[] {
  return db.prepare('SELECT item_id, quantity FROM inventory WHERE user_id=? AND guild_id=? ORDER BY item_id')
    .all(userId, guildId) as unknown as InventoryEntry[];
}

export function getItemQty(userId: string, guildId: string, itemId: string): number {
  const row = db.prepare('SELECT quantity FROM inventory WHERE user_id=? AND guild_id=? AND item_id=?')
    .get(userId, guildId, itemId) as unknown as { quantity: number } | undefined;
  return row?.quantity ?? 0;
}

export function addItem(userId: string, guildId: string, itemId: string, qty = 1): void {
  db.prepare(`
    INSERT INTO inventory (user_id, guild_id, item_id, quantity) VALUES (?, ?, ?, ?)
    ON CONFLICT(user_id, guild_id, item_id) DO UPDATE SET quantity = quantity + excluded.quantity
  `).run(userId, guildId, itemId, qty);
}

export function removeItem(userId: string, guildId: string, itemId: string, qty = 1): boolean {
  const current = getItemQty(userId, guildId, itemId);
  if (current < qty) return false;
  if (current === qty) {
    db.prepare('DELETE FROM inventory WHERE user_id=? AND guild_id=? AND item_id=?')
      .run(userId, guildId, itemId);
  } else {
    db.prepare('UPDATE inventory SET quantity=quantity-? WHERE user_id=? AND guild_id=? AND item_id=?')
      .run(qty, userId, guildId, itemId);
  }
  return true;
}

// ── Death handling ────────────────────────────────────────────────────────
export function killPlayer(userId: string, guildId: string): void {
  db.prepare(`
    UPDATE players SET alive=0, hp=0, mp=0, deaths=deaths+1
    WHERE user_id=? AND guild_id=?
  `).run(userId, guildId);
}
