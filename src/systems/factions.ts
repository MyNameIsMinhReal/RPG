import { getFactionSummary } from './player';
import type { FactionId } from './player';

export interface FactionRewardMods {
  goldPct: number;
  expPct: number;
  dropPct: number;
  lines: string[];
}

function positive(rep: number): number { return Math.max(0, rep); }

export function getFactionRewardMods(userId: string, guildId: string): FactionRewardMods {
  const f = getFactionSummary(userId, guildId);
  const merchants = positive(f.merchants);
  const hunters = positive(f.hunters);
  const church = positive(f.old_church);
  const shadow = positive(f.shadow_court);

  const goldPct = Math.min(12, Math.floor(merchants / 10) + Math.floor(shadow / 20));
  const expPct = Math.min(8, Math.floor(church / 15));
  const dropPct = Math.min(12, Math.floor(hunters / 8));
  const lines: string[] = [];
  if (goldPct > 0) lines.push(`🏦 Faction Gold +${goldPct}%`);
  if (expPct > 0) lines.push(`🕯️ Faction EXP +${expPct}%`);
  if (dropPct > 0) lines.push(`🏹 Faction Drop +${dropPct}%`);
  return { goldPct, expPct, dropPct, lines };
}

export function formatFactionValue(id: FactionId, value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value}`;
}
