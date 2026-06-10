import {
  ChatInputCommandInteraction, ButtonInteraction
} from 'discord.js';
import {
  updatePlayerHpMp, grantGold, addItem
} from '../player';
import { processVictoryRewards, processDeathPenalty } from '../rewards';
import { setFlag, markPlayerClearedBoss } from '../world';
import { markOakPrereq } from '../oakEvent';
import { awardAchievements } from '../achievements';
import { incrementChapterObjective } from '../chapter';
import {
  COLORS, buildVictoryEmbed, buildDeathEmbed
} from '../../utils/embeds';
import { getItem } from '../../data/items';
import { getMaterial } from '../../data/materials';
import { withImage } from '../../utils/eventImages';
import { simpleEmbed, buildContinueExploreRow, attachContinueExploreHandler } from './shared';

export async function handleVictory(
  interaction: ChatInputCommandInteraction, btnInt: ButtonInteraction,
  userId: string, guildId: string, player: any, enemy: any,
  state: any
): Promise<void> {
  updatePlayerHpMp(userId, guildId, state.player_hp, state.player_mp);

  // Group combat: reward for each enemy in the group
  const groupEnemies: any[] | undefined = enemy._groupEnemies;
  let rewards;
  if (groupEnemies && groupEnemies.length > 0) {
    const freshPlayer = { ...player };
    const first = processVictoryRewards(userId, guildId, freshPlayer, groupEnemies[0]);
    const combined = { ...first };
    for (let i = 1; i < groupEnemies.length; i++) {
      const r = processVictoryRewards(userId, guildId, freshPlayer, groupEnemies[i]);
      combined.gold += r.gold;
      combined.exp += r.exp;
      combined.drops = [...combined.drops, ...r.drops];
      if (r.leveledUp) { combined.leveledUp = true; combined.newLevel = r.newLevel; }
    }
    rewards = combined;
  } else {
    rewards = processVictoryRewards(userId, guildId, player, enemy);
  }

  // Guaranteed drops (boss-specific items always given on kill)
  if (Array.isArray((enemy as any).guaranteedDrops)) {
    for (const itemId of (enemy as any).guaranteedDrops as string[]) {
      addItem(userId, guildId, itemId, 1);
      const it = getItem(itemId) ?? getMaterial(itemId);
      if (it) rewards.drops.push(`${it.icon} **${it.name}** *(guaranteed)*`);
    }
  }

  const bonus = (enemy as any).combatBonus;
  if (bonus) {
    grantGold(userId, guildId, bonus.bonusGold);
    if (bonus.bonusItem) addItem(userId, guildId, bonus.bonusItem, 1);
    rewards.bonusDescription += '\n\n' + bonus.bonusDesc.replace('{gold}', String(bonus.bonusGold));
  }

  if ((enemy as any).chapterRescue) {
    incrementChapterObjective(userId, guildId, 'rescue_villager', { zoneId: player.zone_id, enemyId: enemy.id });
  }

  const displayName = groupEnemies
    ? groupEnemies.map((e: any) => `${e.icon} ${e.name}`).join(', ')
    : enemy.name;
  const displayIcon = groupEnemies ? '⚔️' : enemy.icon;

  const embed = buildVictoryEmbed(
    player.name, displayName, displayIcon,
    rewards.exp, rewards.gold, rewards.drops,
    rewards.leveledUp, rewards.newLevel
  );
  if (rewards.bonusDescription) {
    embed.setDescription((embed.data.description ?? '') + rewards.bonusDescription);
  }

  const achievementMessages = awardAchievements(userId, guildId);
  if (achievementMessages.length) {
    embed.addFields({ name: '🏆 Thành tựu mới', value: achievementMessages.join('\n'), inline: false });
  }

  if (enemy.miniboss && enemy.zones?.includes('forest')) {
    markOakPrereq(guildId, userId);
    setFlag(guildId, `oak_lore_miniboss_${userId}`, '1');
  }

  if (enemy.boss) {
    markPlayerClearedBoss(guildId, userId, enemy.id);
  }

  const { embed: victoryImg, files: victoryFiles } = withImage(embed, 'victory');
  await btnInt.editReply({ embeds: [victoryImg], files: victoryFiles, components: buildContinueExploreRow(userId) });
  attachContinueExploreHandler(btnInt.message, interaction, userId, guildId);
}

export async function handleFlee(
  interaction: ChatInputCommandInteraction,
  btnInt: ButtonInteraction,
  userId: string,
  guildId: string,
  player: any,
  enemy: any,
  state: any,
  logLines: string[] = []
): Promise<void> {
  updatePlayerHpMp(userId, guildId, state.player_hp, state.player_mp);

  const summary = logLines.slice(-3).join('\n') || '✅ Bạn đã thoát khỏi trận chiến.';

  await btnInt.editReply({
    embeds: [
      simpleEmbed(
        COLORS.warning,
        `${summary}\n\n🚶 Bạn rút lui để giữ mạng. Có thể tiếp tục khám phá khi đã sẵn sàng.`
      )
    ],
    files: [],
    components: buildContinueExploreRow(userId)
  }).catch(() => {});

  attachContinueExploreHandler(btnInt.message as any, interaction, userId, guildId);
}

export async function handleDeath(
  interaction: ChatInputCommandInteraction, btnInt: ButtonInteraction,
  userId: string, guildId: string, player: any, enemy: any
): Promise<void> {
  const penalty = processDeathPenalty(userId, guildId, player, enemy);

  const embed = buildDeathEmbed(player.name, enemy.name, penalty.goldLeft)
    .addFields({ name: '💀 Soul Shards', value: `+**${penalty.shards}** 💀`, inline: true });

  const achievementMessages = awardAchievements(userId, guildId);
  if (achievementMessages.length) {
    embed.addFields({ name: '🏆 Thành tựu mới', value: achievementMessages.join('\n'), inline: false });
  }

  const { embed: deathImg, files: deathFiles } = withImage(embed, 'death');
  await btnInt.editReply({
    embeds: [deathImg],
    files: deathFiles,
    components: []
  });
}
