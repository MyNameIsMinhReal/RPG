import type { CombatVictoryHandler, CombatDeathHandler, CombatFleeHandler } from './combatFlow';

export interface CombatEntry {
  onVictory: CombatVictoryHandler;
  onDeath: CombatDeathHandler;
  onFlee?: CombatFleeHandler;
  enemy: any;   // full enemy object passed to victory/death callbacks
  icon: string; // icon used when rebuilding embed
  processing: boolean;
}

export interface CombatFallbackHandlers {
  onVictory: CombatVictoryHandler;
  onDeath: CombatDeathHandler;
  onFlee: CombatFleeHandler;
}

const registry = new Map<string, CombatEntry>();
let fallbackHandlers: CombatFallbackHandlers | null = null;

export function registerCombat(userId: string, guildId: string, entry: Omit<CombatEntry, 'processing'>): void {
  registry.set(`${userId}:${guildId}`, { ...entry, processing: false });
}

export function unregisterCombat(userId: string, guildId: string): void {
  registry.delete(`${userId}:${guildId}`);
}

export function getCombatEntry(userId: string, guildId: string): CombatEntry | undefined {
  return registry.get(`${userId}:${guildId}`);
}

// Generic handlers used to rebuild a registry entry from a persisted active_combats
// row when the in-memory registry is empty (e.g. after a bot restart).
export function setCombatFallbackHandlers(handlers: CombatFallbackHandlers): void {
  fallbackHandlers = handlers;
}

export function getCombatFallbackHandlers(): CombatFallbackHandlers | null {
  return fallbackHandlers;
}
