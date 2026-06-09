import { grantGold, incrementKills, grantExp, grantSoulShards, addItem, killPlayer } from './player';
import { createLegacy, pickLegacySkill } from './legacy';
import { logEvent, onBossKilled, getDropBonus } from './world';
import { getItem } from '../data/items';
import { getMaterial } from '../data/materials';
import { unlockRecipesBySource } from './crafting';
import { EQUIPMENT, getEquipment } from '../data/equipment';
import { addItem as addItemFn } from './player';
import { randInt } from '../utils/format';
import { getGreedGoldBonusPercent } from './consumables';
import { incrementDaily } from '../commands/daily';
import { incrementChapterObjective } from './chapter';
import type { PlayerRow } from '../utils/embeds';
import type { EnemyDef } from '../data/enemies';


function combatRewardMultipliers(enemy: EnemyDef): { exp: number; gold: number } {
  if (enemy.boss) return { exp: 0.85, gold: 0.80 };
  if (enemy.miniboss) return { exp: 0.78, gold: 0.72 };
  return { exp: 0.62, gold: 0.45 };
}

function scaleReward(value: number, mult: number, min = 1): number {
  return Math.max(min, Math.floor(value * mult));
}

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
  const rewardMult = combatRewardMultipliers(enemy);
  const rolledGold = randInt(enemy.goldMin, enemy.goldMax);
  const baseGold  = scaleReward(rolledGold, rewardMult.gold, 0);
  const greedGoldBonus = getGreedGoldBonusPercent(userId, guildId);
  const gold      = Math.max(0, Math.floor(baseGold * (1 + greedGoldBonus / 100)));
  const exp       = scaleReward(enemy.expReward, rewardMult.exp, 1);
  const drops: string[] = [];

  grantGold(userId, guildId, gold);
  incrementKills(userId, guildId);
  incrementDaily(userId, guildId, 'kill_count');
  incrementChapterObjective(userId, guildId, 'kill_in_zone', { zoneId: player.zone_id, enemyId: enemy.id });
  if (enemy.boss) incrementChapterObjective(userId, guildId, 'kill_boss', { zoneId: player.zone_id, enemyId: enemy.id });
  const lvRes = grantExp(userId, guildId, exp);

  for (const drop of (Array.isArray(enemy.drops) ? enemy.drops : [])) {
    if (Math.random() * 100 <= drop.chance + Math.floor(drop.chance * dropBonus / 100)) {
      addItem(userId, guildId, drop.itemId, 1);
      const it = getItem(drop.itemId) ?? getMaterial(drop.itemId);
      if (it) drops.push(`${it.icon} ${it.name}`);
    }
  }

  // Equipment drops — rare, tied to specific enemies
  const eqDrops = Object.values(EQUIPMENT).filter(e =>
    e.dropFrom?.includes(enemy.id) && e.dropChance
  );
  for (const eq of eqDrops) {
    const roll = Math.random() * 100;
    const adjustedChance = (eq.dropChance ?? 0) + Math.floor((eq.dropChance ?? 0) * dropBonus / 100);
    if (roll <= adjustedChance) {
      addItem(userId, guildId, eq.id, 1);
      drops.push(`${eq.icon} **${eq.name}** *(${['common','rare','epic','legendary'][['common','rare','epic','legendary'].indexOf(eq.rarity)]})*`);
    }
  }

  let bonusLine = greedGoldBonus > 0 ? `
📜 Scroll of Greed: gold +${greedGoldBonus}% (**${baseGold} → ${gold}**)` : '';
  if (enemy.boss && enemy.deathWorldFlag) {
    bonusLine = '\n\n' + onBossKilled(guildId, enemy.id, player.name, player.zone_id);
    logEvent(guildId, userId, player.name, 'boss_kill', `tiêu diệt Boss **${enemy.icon} ${enemy.name}**!`, player.zone_id);
    unlockRecipesBySource(userId, guildId, enemy.id);
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
