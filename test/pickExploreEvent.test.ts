import { describe, it, expect, beforeAll } from 'vitest';
import '../src/database/index';
import { pickExploreEvent } from '../src/commands/exploreEvents';
import { getFlag, setFlag, deleteFlag } from '../src/systems/world';
import type { PlayerRow } from '../src/utils/embeds';

const USER = 'pick-event-test-user';
const GUILD = 'pick-event-test-guild';

function mkPlayer(over: Partial<PlayerRow> = {}): PlayerRow {
  return {
    user_id: USER,
    guild_id: GUILD,
    name: 'Tester',
    alive: 1,
    level: 1,
    exp: 0,
    exp_next: 100,
    hp: 100,
    max_hp: 100,
    mp: 50,
    max_mp: 50,
    atk: 10,
    def: 5,
    gold: 0,
    soul_shards: 0,
    stat_str: 0,
    stat_vit: 0,
    stat_end: 0,
    stat_agi: 0,
    stat_luk: 0,
    free_stat_reset: 1,
    corruption: 0,
    zone_id: 'forest',
    deaths: 0,
    kills: 0,
    reputation: 0,
    ...over,
  } as PlayerRow;
}

beforeAll(() => {
  deleteFlag(GUILD, `forced_event_${USER}`);
});

describe('pickExploreEvent', () => {
  it('returns admin-forced event and consumes the flag', () => {
    setFlag(GUILD, `forced_event_${USER}`, 'merchant');
    const event = pickExploreEvent({
      player: mkPlayer(),
      guildId: GUILD,
      hasCombat: true,
      hasLegacy: false,
    });
    expect(event).toBe('merchant');
    expect(getFlag(GUILD, `forced_event_${USER}`)).toBeNull();
  });

  it('returns a valid event id for normal roll', () => {
    const event = pickExploreEvent({
      player: mkPlayer({ zone_id: 'forest' }),
      guildId: GUILD,
      hasCombat: true,
      hasLegacy: false,
    });
    expect(typeof event).toBe('string');
    expect(event.length).toBeGreaterThan(0);
  });
});
