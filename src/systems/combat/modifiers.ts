import type { PlayerRow } from '../../utils/embeds';
import { getCorruptionCombatMods } from '../corruption';
import { applyShrineCombatBlessingModifiers } from '../shrineBlessings';

export interface CombatModifierResult<T> {
  enemy: T;
  lines: string[];
}

export function applyCombatEnemyModifiers<T extends any>(enemy: T, player: PlayerRow): CombatModifierResult<T> {
  if (!enemy || (enemy as any).isShopkeeper || !Array.isArray((enemy as any).zones) || !(enemy as any).zones.includes('shrine')) {
    return { enemy, lines: [] };
  }

  const mods = getCorruptionCombatMods(player);
  let next: any = { ...enemy };
  const lines: string[] = [];

  if (mods.atkPct > 0 || mods.hpPct > 0) {
    next.atk = Math.max(1, Math.floor(next.atk * (1 + mods.atkPct / 100)));
    next.hp = Math.max(1, Math.floor(next.hp * (1 + mods.hpPct / 100)));
    lines.push(...mods.lines);
  }

  const blessing = applyShrineCombatBlessingModifiers(next, player.user_id, player.guild_id);
  next = blessing.enemy;
  lines.push(...blessing.lines);
  return { enemy: next as T, lines };
}
