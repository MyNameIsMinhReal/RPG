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
import { getFactionRewardMods } from './factions';
import { getPetRewardMods, applyActivePetAfterVictory, grantPetDropAfterVictory } from './petRoles';
import type { PlayerRow } from '../utils/embeds';
import type { EnemyDef } from '../data/enemies';
import { getSecondaryStatBonuses } from './statSystem';
import { getEquipmentStats } from './equipment';
import { getCorruptionDropBonus } from './corruption';
import { markEchoSealByEnemy, ECHO_SEALS } from './echoDemonRitual';


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
  const corruptionDropBonus = getCorruptionDropBonus(player);
  const rewardMult = combatRewardMultipliers(enemy);
  const rolledGold = randInt(enemy.goldMin, enemy.goldMax);
  const baseGold  = scaleReward(rolledGold, rewardMult.gold, 0);
  const baseExp   = scaleReward(enemy.expReward, rewardMult.exp, 1);
  const greedGoldBonus = getGreedGoldBonusPercent(userId, guildId);
  const factionMods = getFactionRewardMods(userId, guildId);
  const petMods = getPetRewardMods(userId, guildId);
  const statMods = getSecondaryStatBonuses(player);
  const eqStats = getEquipmentStats(userId, guildId);
  const gearGoldBonus = eqStats.goldBonus ?? 0;
  const gearExpBonus = eqStats.expBonus ?? 0;
  const gearDropBonus = eqStats.dropBonus ?? 0;
  const goldBonusPct = greedGoldBonus + factionMods.goldPct + petMods.goldPct + statMods.goldBonusPct + gearGoldBonus;
  const expBonusPct = factionMods.expPct + petMods.expPct + gearExpBonus;
  const totalDropBonusPct = dropBonus + corruptionDropBonus + factionMods.dropPct + statMods.dropBonusPct + gearDropBonus;
  const gold      = Math.max(0, Math.floor(baseGold * (1 + goldBonusPct / 100)));
  const exp       = Math.max(1, Math.floor(baseExp * (1 + expBonusPct / 100)));
  const drops: string[] = [];

  grantGold(userId, guildId, gold);
  incrementKills(userId, guildId);
  incrementDaily(userId, guildId, 'kill_count');
  incrementChapterObjective(userId, guildId, 'kill_in_zone', { zoneId: player.zone_id, enemyId: enemy.id });
  if (enemy.boss) incrementChapterObjective(userId, guildId, 'kill_boss', { zoneId: player.zone_id, enemyId: enemy.id });
  const lvRes = grantExp(userId, guildId, exp);

  for (const drop of (Array.isArray(enemy.drops) ? enemy.drops : [])) {
    if (Math.random() * 100 <= drop.chance + Math.floor(drop.chance * totalDropBonusPct / 100)) {
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
    const adjustedChance = (eq.dropChance ?? 0) + Math.floor((eq.dropChance ?? 0) * totalDropBonusPct / 100);
    if (roll <= adjustedChance) {
      addItem(userId, guildId, eq.id, 1);
      drops.push(`${eq.icon} **${eq.name}** *(${['common','rare','epic','legendary'][['common','rare','epic','legendary'].indexOf(eq.rarity)]})*`);
    }
  }

  const petLines = [...applyActivePetAfterVictory(userId, guildId, player, enemy), ...grantPetDropAfterVictory(userId, guildId, enemy)];
  const unlockedRecipes = unlockRecipesBySource(userId, guildId, enemy.id);
  const bonusParts = [
    greedGoldBonus > 0 ? `📜 Scroll of Greed: gold +${greedGoldBonus}% (**${baseGold} → ${gold}**)` : null,
    ...factionMods.lines,
    statMods.goldBonusPct > 0 || statMods.dropBonusPct > 0 ? `🍀 LUK: gold +${statMods.goldBonusPct}% · drop +${statMods.dropBonusPct}%` : null,
    corruptionDropBonus > 0 ? `🌘 Ô Nhiễm Linh Hồn: drop +${corruptionDropBonus}%` : null,
    gearGoldBonus > 0 || gearExpBonus > 0 || gearDropBonus > 0 ? `🎒 Gear: gold +${gearGoldBonus}% · exp +${gearExpBonus}% · drop +${gearDropBonus}%` : null,
    ...petMods.lines,
    ...petLines,
    ...(unlockedRecipes.length ? [`📜 Mở khóa công thức craft: **${unlockedRecipes.length} recipe**`] : []),
  ].filter(Boolean) as string[];
  let bonusLine = bonusParts.length ? `\n${bonusParts.join('\n')}` : '';
  if (enemy.boss && enemy.deathWorldFlag) {
    const worldLine = onBossKilled(guildId, enemy.id, player.name, player.zone_id);
    bonusLine = `${bonusLine}\n\n${worldLine}`;
    logEvent(guildId, userId, player.name, 'boss_kill', `tiêu diệt Boss **${enemy.icon} ${enemy.name}**!`, player.zone_id);
  } else {
    logEvent(guildId, userId, player.name, 'kill', `tiêu diệt **${enemy.icon} ${enemy.name}**.`, player.zone_id);
  }

  // Echo Demon ritual: hạ một trong 3 miniboss shrine sẽ phá phong ấn tương ứng.
  // markEchoSealByEnemy là no-op nếu enemy không phải quái phong ấn.
  const brokenSeal = markEchoSealByEnemy(guildId, userId, enemy.id);
  if (brokenSeal) {
    const sealInfo = ECHO_SEALS[brokenSeal];
    bonusLine = `${bonusLine}\n\n${sealInfo.icon} **Phong ấn ${sealInfo.name} đã vỡ!** Echo Demon sẽ yếu đi khi bạn mở nghi lễ ở Đền Cổ.`;
    logEvent(guildId, userId, player.name, 'kill', `phá **Phong ấn ${sealInfo.name}** quanh Đền Cổ.`, player.zone_id);
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

  if ((player.deaths + 1) >= 5) {
    const unlocked = unlockRecipesBySource(userId, guildId, 'deaths_5');
    if (unlocked.length) {
      logEvent(guildId, userId, player.name, 'recipe_unlock', `mở khóa **${unlocked.length} công thức cursed** sau 5 lần chết.`, player.zone_id);
    }
  }

  const shards = Math.max(1, Math.floor(player.level / 2));
  grantSoulShards(userId, guildId, shards);

  return { shards, goldLeft };
}
