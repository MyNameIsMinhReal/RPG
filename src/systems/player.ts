import db from '../database/index';
import { expNext } from '../utils/format';
import { SKILLS, getSkill } from '../data/skills';
import { getEquipmentStats } from './equipment';
import { CLASSES, getClass } from '../data/classes';
import type { PlayerRow } from '../utils/embeds';

export interface SkillPoolEntry { skill_id: string; learned_at: number; }
export interface LoadoutEntry   { slot: number; skill_id: string; }
export interface InventoryEntry { item_id: string; quantity: number; }

// ── Get / create ─────────────────────────────────────────────────────────
export function getPlayer(userId: string, guildId: string): PlayerRow | undefined {
  return db.prepare('SELECT * FROM players WHERE user_id = ? AND guild_id = ?')
    .get(userId, guildId) as unknown as PlayerRow | undefined;
}

export function createPlayer(userId: string, guildId: string, name: string, classId = 'warrior'): PlayerRow {
  const cls = CLASSES[classId] ?? CLASSES.warrior;
  db.prepare(`
    INSERT OR REPLACE INTO players
    (user_id, guild_id, name, alive, level, exp, exp_next, hp, max_hp, mp, max_mp, atk, def, gold, soul_shards, zone_id, deaths, kills, class)
    VALUES (?, ?, ?, 1, 1, 0, 100, ?, ?, ?, ?, ?, ?, 50, 0, 'village', 0, 0, ?)
  `).run(
    userId, guildId, name,
    100 + cls.hpBonus, 100 + cls.hpBonus,
    50  + cls.mpBonus, 50  + cls.mpBonus,
    10  + cls.atkBonus, 5 + cls.defBonus,
    classId
  );
  return getPlayer(userId, guildId)!;
}

export function resetPlayer(userId: string, guildId: string): void {
  // Keep soul_shards, deaths, learned skills and permanent soul upgrades.
  const current = getPlayer(userId, guildId) as any;
  const pAtk = current?.permanent_atk_bonus ?? 0;
  const pDef = current?.permanent_def_bonus ?? 0;
  const pHp  = current?.permanent_max_hp_bonus ?? 0;
  const pMp  = current?.permanent_max_mp_bonus ?? 0;
  const blessing = current?.rebirth_blessing ? 1 : 0;
  const cls = getClass(current?.class ?? 'warrior') ?? CLASSES.warrior;
  const baseHp  = 100 + pHp  + blessing * 20 + cls.hpBonus;
  const baseMp  = 50  + pMp  + blessing * 10 + cls.mpBonus;
  const baseAtk = 10  + pAtk + blessing * 2  + cls.atkBonus;
  const baseDef = 5   + pDef + blessing      + cls.defBonus;
  db.prepare(`
    UPDATE players SET
      alive = 1, level = 1, exp = 0, exp_next = 100,
      hp = ?, max_hp = ?, mp = ?, max_mp = ?,
      atk = ?, def = ?, gold = ?, zone_id = 'village', kills = 0,
      rebirth_blessing = MAX(0, COALESCE(rebirth_blessing,0) - ?)
    WHERE user_id = ? AND guild_id = ?
  `).run(baseHp, baseHp, baseMp, baseMp, baseAtk, baseDef, 50 + blessing * 50, blessing, userId, guildId);
  // Clear loadout (pool is kept)
  db.prepare('DELETE FROM skill_loadout WHERE user_id = ? AND guild_id = ?').run(userId, guildId);
  // Clear inventory but KEEP items currently equipped in equipment_worn
  db.prepare(`
    DELETE FROM inventory WHERE user_id = ? AND guild_id = ?
    AND item_id NOT IN (SELECT equipment_id FROM equipment_worn WHERE user_id = ? AND guild_id = ?)
  `).run(userId, guildId, userId, guildId);
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

  // Pet passive bonus
  const activePetId = (player as any).active_pet as string | null;
  if (activePetId) {
    const petRow = db.prepare('SELECT level FROM player_pets WHERE user_id=? AND guild_id=? AND pet_id=?')
      .get(player.user_id, player.guild_id, activePetId) as { level: number } | undefined;
    if (petRow) {
      const { getPet, petPassiveValue } = require('../data/pets') as typeof import('../data/pets');
      const petDef = getPet(activePetId);
      if (petDef) {
        const pct = petPassiveValue(petDef, petRow.level) / 100;
        switch (petDef.passiveType) {
          case 'atk_pct': bonusAtk   += Math.floor(player.atk    * pct); break;
          case 'def_pct': bonusDef   += Math.floor(player.def    * pct); break;
          case 'hp_pct':  bonusMaxHp += Math.floor(player.max_hp * pct); break;
          case 'mp_pct':  bonusMaxMp += Math.floor(player.max_mp * pct); break;
        }
      }
    }
  }

  // Guild buff bonus (atk / def / hp / mp)
  const membership = db.prepare('SELECT clan_id FROM clan_members WHERE user_id=? AND discord_gid=?')
    .get(player.user_id, player.guild_id) as { clan_id: string } | undefined;
  if (membership) {
    const now   = Math.floor(Date.now() / 1000);
    const buffs = db.prepare('SELECT buff_type, value FROM clan_buffs WHERE clan_id=? AND expires_at>?')
      .all(membership.clan_id, now) as { buff_type: string; value: number }[];
    for (const b of buffs) {
      const pct = b.value / 100;
      switch (b.buff_type) {
        case 'atk':  bonusAtk   += Math.floor(player.atk    * pct); break;
        case 'def':  bonusDef   += Math.floor(player.def    * pct); break;
        case 'hp':   bonusMaxHp += Math.floor(player.max_hp * pct); break;
        case 'mp':   bonusMaxMp += Math.floor(player.max_mp * pct); break;
      }
    }
  }

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

// ── Wanted / Factions / Soul perks / Pets ────────────────────────────────
export type FactionId = 'merchants' | 'hunters' | 'old_church' | 'shadow_court' | 'villagers';

export function getWantedLevel(userId: string, guildId: string): number {
  const row = db.prepare('SELECT COALESCE(wanted_level,0) AS wanted_level FROM players WHERE user_id=? AND guild_id=?')
    .get(userId, guildId) as unknown as { wanted_level: number } | undefined;
  return Math.max(0, Math.min(5, row?.wanted_level ?? 0));
}

export function adjustWanted(userId: string, guildId: string, amount: number): number {
  db.prepare(`
    UPDATE players
    SET wanted_level = MAX(0, MIN(5, COALESCE(wanted_level,0) + ?))
    WHERE user_id=? AND guild_id=?
  `).run(amount, userId, guildId);
  return getWantedLevel(userId, guildId);
}

export function getWantedTitle(level: number): string {
  if (level <= 0) return 'Bình thường';
  if (level === 1) return 'Bị nghi ngờ';
  if (level === 2) return 'Bị truy nã nhẹ';
  if (level === 3) return 'Bị thương hội săn';
  if (level === 4) return 'Bị cấm giao dịch';
  return 'Sát nhân khét tiếng';
}

export function adjustFaction(userId: string, guildId: string, factionId: FactionId, amount: number): number {
  db.prepare(`
    INSERT INTO player_factions (user_id, guild_id, faction_id, reputation, updated_at)
    VALUES (?, ?, ?, ?, unixepoch())
    ON CONFLICT(user_id, guild_id, faction_id)
    DO UPDATE SET reputation = MAX(-100, MIN(100, reputation + excluded.reputation)), updated_at = unixepoch()
  `).run(userId, guildId, factionId, amount);

  const row = db.prepare('SELECT reputation FROM player_factions WHERE user_id=? AND guild_id=? AND faction_id=?')
    .get(userId, guildId, factionId) as unknown as { reputation: number } | undefined;
  return row?.reputation ?? 0;
}

export function getFactionReputation(userId: string, guildId: string, factionId: FactionId): number {
  const row = db.prepare('SELECT reputation FROM player_factions WHERE user_id=? AND guild_id=? AND faction_id=?')
    .get(userId, guildId, factionId) as unknown as { reputation: number } | undefined;
  return row?.reputation ?? 0;
}

export function getFactionSummary(userId: string, guildId: string): Record<FactionId, number> {
  return {
    merchants: getFactionReputation(userId, guildId, 'merchants'),
    hunters: getFactionReputation(userId, guildId, 'hunters'),
    old_church: getFactionReputation(userId, guildId, 'old_church'),
    shadow_court: getFactionReputation(userId, guildId, 'shadow_court'),
    villagers: getFactionReputation(userId, guildId, 'villagers'),
  };
}

export function addPermanentStat(userId: string, guildId: string, stat: 'atk' | 'def' | 'max_hp' | 'max_mp', amount: number): void {
  const safeAmount = Math.max(1, Math.floor(amount));
  const bonusColumn: Record<typeof stat, string> = {
    atk: 'permanent_atk_bonus',
    def: 'permanent_def_bonus',
    max_hp: 'permanent_max_hp_bonus',
    max_mp: 'permanent_max_mp_bonus'
  };
  db.prepare(`UPDATE players SET ${stat} = ${stat} + ?, ${bonusColumn[stat]} = COALESCE(${bonusColumn[stat]},0) + ?, bonus_stat_points = COALESCE(bonus_stat_points,0) + ? WHERE user_id=? AND guild_id=?`)
    .run(safeAmount, safeAmount, safeAmount, userId, guildId);
  if (stat === 'max_hp') db.prepare('UPDATE players SET hp = hp + ? WHERE user_id=? AND guild_id=?').run(safeAmount, userId, guildId);
  if (stat === 'max_mp') db.prepare('UPDATE players SET mp = mp + ? WHERE user_id=? AND guild_id=?').run(safeAmount, userId, guildId);
}

export function addKeepItemCharge(userId: string, guildId: string, amount = 1): number {
  db.prepare('UPDATE players SET keep_item_charges = COALESCE(keep_item_charges,0) + ? WHERE user_id=? AND guild_id=?')
    .run(amount, userId, guildId);
  return (getPlayer(userId, guildId)?.keep_item_charges ?? 0);
}

export function addExtraSkillSlot(userId: string, guildId: string, amount = 1, cap = 2): number {
  db.prepare('UPDATE players SET extra_skill_slots = MIN(?, COALESCE(extra_skill_slots,0) + ?) WHERE user_id=? AND guild_id=?')
    .run(cap, amount, userId, guildId);
  return (getPlayer(userId, guildId)?.extra_skill_slots ?? 0);
}

export function improveDeathPenaltyReduction(userId: string, guildId: string, amount = 10, cap = 50): number {
  db.prepare('UPDATE players SET death_penalty_reduction = MIN(?, COALESCE(death_penalty_reduction,0) + ?) WHERE user_id=? AND guild_id=?')
    .run(cap, amount, userId, guildId);
  return (getPlayer(userId, guildId)?.death_penalty_reduction ?? 0);
}

export function addRebirthBlessing(userId: string, guildId: string, amount = 1): number {
  db.prepare('UPDATE players SET rebirth_blessing = COALESCE(rebirth_blessing,0) + ? WHERE user_id=? AND guild_id=?')
    .run(amount, userId, guildId);
  return (getPlayer(userId, guildId)?.rebirth_blessing ?? 0);
}

export function addMerchantMercy(userId: string, guildId: string, amount = 1): number {
  db.prepare('UPDATE players SET merchant_mercy = COALESCE(merchant_mercy,0) + ? WHERE user_id=? AND guild_id=?')
    .run(amount, userId, guildId);
  return (getPlayer(userId, guildId)?.merchant_mercy ?? 0);
}

export function getClassPassives(userId: string, guildId: string): { dodgeBonus: number; skillDmgMult: number; classId: string } {
  const player = getPlayer(userId, guildId) as any;
  const cls = getClass(player?.class ?? 'warrior') ?? CLASSES.warrior;
  return { dodgeBonus: cls.dodgeBonus, skillDmgMult: cls.skillDmgMult, classId: cls.id };
}

export function addPet(userId: string, guildId: string, petId: string): boolean {
  const before = db.prepare('SELECT 1 FROM player_pets WHERE user_id=? AND guild_id=? AND pet_id=?')
    .get(userId, guildId, petId);
  db.prepare('INSERT OR IGNORE INTO player_pets (user_id, guild_id, pet_id) VALUES (?, ?, ?)')
    .run(userId, guildId, petId);
  return !before;
}

export function hasPet(userId: string, guildId: string, petId: string): boolean {
  const row = db.prepare('SELECT 1 FROM player_pets WHERE user_id=? AND guild_id=? AND pet_id=?')
    .get(userId, guildId, petId);
  return !!row;
}

export function getPets(userId: string, guildId: string): Array<{ pet_id: string; level: number; acquired_at: number }> {
  return db.prepare('SELECT pet_id, level, acquired_at FROM player_pets WHERE user_id=? AND guild_id=? ORDER BY acquired_at DESC')
    .all(userId, guildId) as unknown as Array<{ pet_id: string; level: number; acquired_at: number }>;
}
