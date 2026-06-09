import type { CombatVictoryHandler, CombatDeathHandler, CombatFleeHandler } from './combatFlow';

export interface CombatEntry {
  onVictory: CombatVictoryHandler;
  onDeath: CombatDeathHandler;
  onFlee?: CombatFleeHandler;
  enemy: any;   // full enemy object passed to victory/death callbacks
  icon: string; // icon used when rebuilding embed
  processing: boolean;
}

const registry = new Map<string, CombatEntry>();

export function registerCombat(userId: string, guildId: string, entry: Omit<CombatEntry, 'processing'>): void {
  registry.set(`${userId}:${guildId}`, { ...entry, processing: false });
}

export function unregisterCombat(userId: string, guildId: string): void {
  registry.delete(`${userId}:${guildId}`);
}

export function getCombatEntry(userId: string, guildId: string): CombatEntry | undefined {
  return registry.get(`${userId}:${guildId}`);
}
