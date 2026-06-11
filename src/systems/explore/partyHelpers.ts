import { getPlayer } from '../player';
import { getCombatByUser } from '../combat';
import { getPartyOf } from '../party';

export function getReadyPartyMemberIds(guildId: string, leaderId: string, zoneId: string): string[] | undefined {
  const party = getPartyOf(guildId, leaderId);
  if (!party || party.leaderId !== leaderId || (party.memberIds.length ?? 0) <= 1) return undefined;

  const ready = party.memberIds.filter(id => {
    const p = getPlayer(id, guildId);
    if (!p?.alive) return false;
    if (p.zone_id !== zoneId) return false;
    if (getCombatByUser(id, guildId)) return false;
    return true;
  });

  return ready.includes(leaderId) && ready.length > 1 ? ready : undefined;
}
