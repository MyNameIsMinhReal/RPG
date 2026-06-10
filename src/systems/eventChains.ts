import db from '../database/index';
import { EVENT_CHAINS, type EventChainDef } from '../data/eventChains';
import { grantGold, grantExp, addItem } from './player';
import { unlockTitle } from './titles';

export interface EventChainStatus {
  def: EventChainDef;
  step: number;
  completed: boolean;
}

export function getEventChainStatuses(userId: string, guildId: string): EventChainStatus[] {
  return EVENT_CHAINS.map(def => {
    const row = db.prepare('SELECT step, completed_at FROM event_chain_progress WHERE user_id=? AND guild_id=? AND chain_id=?')
      .get(userId, guildId, def.id) as { step: number; completed_at: number | null } | undefined;
    return { def, step: row?.step ?? 0, completed: !!row?.completed_at };
  });
}

function chainMatches(def: EventChainDef, stepIndex: number, type: string, description: string, zoneId?: string | null): boolean {
  const step = def.steps[stepIndex];
  if (!step) return false;
  if (step.match.type && step.match.type !== type) return false;
  if (step.match.zoneId && step.match.zoneId !== zoneId) return false;
  if (step.match.includes && !description.toLowerCase().includes(step.match.includes.toLowerCase())) return false;
  return true;
}

export function progressEventChainsFromLog(
  guildId: string,
  userId: string,
  type: string,
  description: string,
  zoneId?: string | null
): string[] {
  const messages: string[] = [];
  for (const def of EVENT_CHAINS) {
    const row = db.prepare('SELECT step, completed_at FROM event_chain_progress WHERE user_id=? AND guild_id=? AND chain_id=?')
      .get(userId, guildId, def.id) as { step: number; completed_at: number | null } | undefined;
    if (row?.completed_at) continue;
    const currentStep = row?.step ?? 0;
    if (!chainMatches(def, currentStep, type, description, zoneId)) continue;

    const nextStep = currentStep + 1;
    const completed = nextStep >= def.steps.length;
    db.prepare(`
      INSERT INTO event_chain_progress (user_id, guild_id, chain_id, step, completed_at, updated_at)
      VALUES (?, ?, ?, ?, ?, unixepoch())
      ON CONFLICT(user_id, guild_id, chain_id)
      DO UPDATE SET step=excluded.step, completed_at=excluded.completed_at, updated_at=unixepoch()
    `).run(userId, guildId, def.id, nextStep, completed ? Math.floor(Date.now()/1000) : null);

    if (completed) {
      if (def.reward.gold) grantGold(userId, guildId, def.reward.gold);
      if (def.reward.exp) grantExp(userId, guildId, def.reward.exp);
      if (def.reward.itemId) addItem(userId, guildId, def.reward.itemId, def.reward.itemQty ?? 1);
      if (def.reward.titleId) unlockTitle(userId, guildId, def.reward.titleId);
      messages.push(`${def.icon} Hoàn thành chain **${def.name}**!`);
    } else {
      messages.push(`${def.icon} Chain **${def.name}**: ${nextStep}/${def.steps.length}`);
    }
  }
  return messages;
}
