import { getClass } from '../data/classes';
import type { PlayerRow } from '../utils/embeds';

export const STAT_POINTS_PER_LEVEL = 3;

export type StatKey = 'str' | 'vit' | 'end' | 'agi' | 'luk';

export const STAT_DEFS: Record<StatKey, { label: string; icon: string; desc: string }> = {
  str: { label: 'STR', icon: '💪', desc: '+2 ATK mỗi điểm' },
  vit: { label: 'VIT', icon: '❤️', desc: '+12 HP mỗi điểm' },
  end: { label: 'END', icon: '🛡️', desc: '+1.5 DEF mỗi điểm' },
  agi: { label: 'AGI', icon: '💨', desc: '+Crit và Dodge nhẹ' },
  luk: { label: 'LUK', icon: '🍀', desc: '+Gold và drop nhẹ' },
};

export interface PlayerStatBuild {
  str: number;
  vit: number;
  end: number;
  agi: number;
  luk: number;
}

export interface DerivedBaseStats {
  maxHp: number;
  maxMp: number;
  atk: number;
  def: number;
}

export interface SecondaryStatBonuses {
  critChance: number;
  dodgeChance: number;
  goldBonusPct: number;
  dropBonusPct: number;
}

export interface StatSummary {
  build: PlayerStatBuild;
  totalPoints: number;
  spentPoints: number;
  availablePoints: number;
  base: DerivedBaseStats;
  secondary: SecondaryStatBonuses;
  freeResetAvailable: boolean;
}

function toNonNegativeInt(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
}

function toSignedInt(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? Math.floor(n) : 0;
}

export function getPlayerStatBuild(player: PlayerRow): PlayerStatBuild {
  return {
    str: toNonNegativeInt(player.stat_str),
    vit: toNonNegativeInt(player.stat_vit),
    end: toNonNegativeInt(player.stat_end),
    agi: toNonNegativeInt(player.stat_agi),
    luk: toNonNegativeInt(player.stat_luk),
  };
}

export function getSpentStatPoints(player: PlayerRow): number {
  const s = getPlayerStatBuild(player);
  return s.str + s.vit + s.end + s.agi + s.luk;
}

export function getTotalStatPoints(player: PlayerRow): number {
  // Level 1 starts with 0 spendable points. Each level after that gives 3.
  return Math.max(0, (toNonNegativeInt(player.level) - 1) * STAT_POINTS_PER_LEVEL);
}

export function getAvailableStatPoints(player: PlayerRow): number {
  return Math.max(0, getTotalStatPoints(player) - getSpentStatPoints(player));
}

export function deriveBaseStats(player: PlayerRow): DerivedBaseStats {
  const s = getPlayerStatBuild(player);
  const level = Math.max(1, toNonNegativeInt(player.level) || 1);
  const levelIndex = level - 1;
  const cls = getClass(player.class ?? 'warrior') ?? getClass('warrior')!;
  const blessing = toNonNegativeInt(player.rebirth_blessing);

  // Admin/debug tooling may intentionally set these bonuses negative to
  // force a player's base ATK/DEF below the natural class+level value.
  // Normal upgrades still add positive values, so existing progression is unchanged.
  const permanentAtk = toSignedInt(player.permanent_atk_bonus);
  const permanentDef = toSignedInt(player.permanent_def_bonus);
  // HP/MP permanent bonuses may be negative because Shadow Court sacrifices
  // intentionally trade max HP for cursed equipment.
  const permanentHp  = toSignedInt(player.permanent_max_hp_bonus);
  const permanentMp  = toSignedInt(player.permanent_max_mp_bonus);

  return {
    maxHp: Math.max(10, 100 + cls.hpBonus + permanentHp + blessing * 20 + levelIndex * 6 + s.vit * 12),
    maxMp: Math.max(5, 50 + cls.mpBonus + permanentMp + blessing * 10 + levelIndex * 3 + s.luk * 2),
    atk: Math.max(1, 10 + cls.atkBonus + permanentAtk + blessing * 2 + levelIndex + s.str * 2),
    def: Math.max(0, Math.floor(5 + cls.defBonus + permanentDef + blessing + levelIndex * 0.5 + s.end * 1.5)),
  };
}

export function getSecondaryStatBonuses(player: PlayerRow): SecondaryStatBonuses {
  const s = getPlayerStatBuild(player);
  return {
    critChance: Math.min(35, Number((s.agi * 0.15).toFixed(2))),
    dodgeChance: Math.min(20, Number((s.agi * 0.10).toFixed(2))),
    dropBonusPct: Math.min(15, Number((s.luk * 0.08).toFixed(2))),
    goldBonusPct: Math.min(30, Number((s.luk * 0.15).toFixed(2))),
  };
}

export function getStatSummary(player: PlayerRow): StatSummary {
  return {
    build: getPlayerStatBuild(player),
    totalPoints: getTotalStatPoints(player),
    spentPoints: getSpentStatPoints(player),
    availablePoints: getAvailableStatPoints(player),
    base: deriveBaseStats(player),
    secondary: getSecondaryStatBonuses(player),
    freeResetAvailable: (player.free_stat_reset ?? 1) === 1,
  };
}

export function isStatKey(value: string): value is StatKey {
  return value === 'str' || value === 'vit' || value === 'end' || value === 'agi' || value === 'luk';
}
