import { getSkill } from '../../data/skills';
import { getLoadout } from '../player';

export interface CombatPassives {
  hasBerserker: boolean;
  hasVampiric: boolean;
  hasCounter: boolean;
  hasLastStand: boolean;
  hpRegenPerTurn: number;
  mpRegenPerTurn: number;
  lifestealBonus: number;
}

export function emptyCombatPassives(): CombatPassives {
  return {
    hasBerserker: false,
    hasVampiric: false,
    hasCounter: false,
    hasLastStand: false,
    hpRegenPerTurn: 0,
    mpRegenPerTurn: 0,
    lifestealBonus: 0,
  };
}

/** Builds a combat-passive snapshot from skill ids. Pure helper for tests and orchestration. */
export function buildCombatPassives(skillIds: readonly string[]): CombatPassives {
  const passives = emptyCombatPassives();

  for (const skillId of skillIds) {
    const sk = getSkill(skillId);
    if (!sk) continue;

    switch (sk.id) {
      case 'berserker':
        passives.hasBerserker = true;
        break;
      case 'vampiric':
        passives.hasVampiric = true;
        break;
      case 'counter':
        passives.hasCounter = true;
        break;
      case 'last_stand':
        passives.hasLastStand = true;
        break;
    }

    if (sk.type === 'passive' && sk.passiveBonus) {
      passives.hpRegenPerTurn += sk.passiveBonus.hpRegen ?? 0;
      passives.mpRegenPerTurn += sk.passiveBonus.mpRegen ?? 0;
      passives.lifestealBonus += sk.passiveBonus.lifesteal ?? 0;
      passives.hasVampiric = passives.hasVampiric || ((sk.passiveBonus.lifesteal ?? 0) > 0);
    }
  }

  return passives;
}

export function getCombatPassives(userId: string, guildId: string): CombatPassives {
  return buildCombatPassives(getLoadout(userId, guildId).map(entry => entry.skill_id));
}

export function applyPassiveRegen(
  hp: number,
  mp: number,
  maxHp: number,
  maxMp: number,
  passives: CombatPassives,
): { hp: number; mp: number } {
  return {
    hp: Math.min(maxHp, hp + passives.hpRegenPerTurn),
    mp: Math.min(maxMp, mp + passives.mpRegenPerTurn),
  };
}
