import { grantGold, incrementKills, grantExp, grantSoulShards, addItem, killPlayer } from './player';
import { createLegacy, pickLegacySkill } from './legacy';
import { logEvent, onBossKilled, getDropBonus } from './world';
import { getItem } from '../data/items';
import { randInt } from '../utils/format';
import type { PlayerRow } from '../utils/embeds';
import type { EnemyDef } from '../data/enemies';

export interface VictoryRewardResult {
  gold: number;
  exp: number;
  drops: string[];
  leveledUp: boolean;
  newLevel: number;
  bonusDescription: string;
}

export function processVictoryRewards(
  userId: string,
  guildId: string,
  player: PlayerRow,
  enemy: EnemyDef
): VictoryRewardResult {
  const dropBonus = getDropBonus(guildId, player.zone_id);
  const gold      = randInt(enemy.goldMin, enemy.goldMax);
  const exp       = enemy.expReward;
  const drops: string[] = [];

  grantGold(userId, guildId, gold);
  incrementKills(userId, guildId);
  const lvRes = grantExp(userId, guildId, exp);

  for (const drop of enemy.drops) {
    if (Math.random() * 100 <= drop.chance + Math.floor(drop.chance * dropBonus / 100)) {
      addItem(userId, guildId, drop.itemId, 1);
      const it = getItem(drop.itemId);
      if (it) drops.push(`${it.icon} ${it.name}`);
    }
  }

  let bonusLine = '';
  if (enemy.boss && enemy.deathWorldFlag) {
    bonusLine = '\n\n' + onBossKilled(guildId, enemy.id, player.name, player.zone_id);
    logEvent(guildId, userId, player.name, 'boss_kill', `tiêu diệt Boss **${enemy.icon} ${enemy.name}**!`, player.zone_id);
  } else {
    logEvent(guildId, userId, player.name, 'kill', `tiêu diệt **${enemy.icon} ${enemy.name}**.`, player.zone_id);
  }

  return {
    gold,
    exp,
    drops,
    leveledUp: lvRes.leveledUp,
    newLevel: lvRes.newLevel,
    bonusDescription: bonusLine
  };
}

export function processDeathPenalty(
  userId: string,
  guildId: string,
  player: PlayerRow,
  enemy: EnemyDef
) {
  const goldLeft    = player.gold;
  const legacySkill = pickLegacySkill(userId, guildId);
  createLegacy(guildId, userId, player.name, player.zone_id, goldLeft, player.deaths + 1, legacySkill);
  logEvent(guildId, userId, player.name, 'death', `bị **${enemy.icon} ${enemy.name}** tiêu diệt. Di sản tại ${player.zone_id}.`, player.zone_id);
  killPlayer(userId, guildId);

  const shards = Math.max(1, Math.floor(player.level / 2));
  grantSoulShards(userId, guildId, shards);

  return { shards, goldLeft };
}
