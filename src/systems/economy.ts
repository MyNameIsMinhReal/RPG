import { getPlayer, updatePlayerLastExplore } from './player';
import type { PlayerRow } from '../utils/embeds';

const EXPLORE_COOLDOWN_SECONDS = 45;

export function canExplore(player: PlayerRow): boolean {
  const now = Math.floor(Date.now() / 1000);
  return !(player.last_explore && now - player.last_explore < EXPLORE_COOLDOWN_SECONDS);
}

export function exploreCooldownRemaining(player: PlayerRow): number {
  const now = Math.floor(Date.now() / 1000);
  return Math.max(0, EXPLORE_COOLDOWN_SECONDS - (now - (player.last_explore ?? 0)));
}

export function setExploreCooldown(userId: string, guildId: string): void {
  const now = Math.floor(Date.now() / 1000);
  updatePlayerLastExplore(userId, guildId, now);
}

export function getPlayerExploreCooldown(userId: string, guildId: string): number {
  const player = getPlayer(userId, guildId);
  return player ? exploreCooldownRemaining(player) : 0;
}
