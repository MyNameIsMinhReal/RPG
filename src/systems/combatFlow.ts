import {
  ChatInputCommandInteraction, ButtonInteraction,
  ActionRowBuilder, ButtonBuilder, ButtonStyle,
  ComponentType, StringSelectMenuInteraction
} from 'discord.js';
import { getPlayer, getLoadout, applyPassiveStats } from './player';
import {
  getCombatByUser, saveCombat, deleteCombat,
  processAttack, processSkill, processDefend, processFlee
} from './combat';
import { getEnemy } from '../data/enemies';
import { buildCombatEmbed, buildCombatButtons, buildSkillSelectMenu, simpleEmbed, COLORS } from '../utils/embeds';
import { withImage } from '../utils/eventImages';
import { getEnemyAtkBonus } from './world';

export type CombatVictoryHandler = (
  interaction: ChatInputCommandInteraction,
  btnInt: ButtonInteraction,
  userId: string,
  guildId: string,
  player: any,
  enemy: any,
  state: any
) => Promise<void>;

export type CombatDeathHandler = (
  interaction: ChatInputCommandInteraction,
  btnInt: ButtonInteraction,
  userId: string,
  guildId: string,
  player: any,
  enemy: any
) => Promise<void>;

export async function startCombatFlow(
  interaction: ChatInputCommandInteraction,
  userId: string,
  guildId: string,
  enemyId: string,
  onVictory: CombatVictoryHandler,
  onDeath: CombatDeathHandler
): Promise<void> {
  const player      = getPlayer(userId, guildId)!;
  const enemy       = getEnemy(enemyId)!;
  const loadout     = getLoadout(userId, guildId);
  const withPassive = applyPassiveStats(player);

  const atkBonus     = getEnemyAtkBonus(guildId);
  const adjustedAtk  = enemy.atk + Math.floor(enemy.atk * atkBonus / 100);

  const log0 = enemy.boss
    ? `👑 **BOSS** — **${enemy.icon} ${enemy.name}** xuất hiện!\n*"${enemy.lore}"*`
    : `⚠️ **${enemy.icon} ${enemy.name}** (Lv.${enemy.level}) tấn công!`;

  const initState = {
    message_id: 'temp', channel_id: interaction.channelId,
    user_id: userId, guild_id: guildId,
    enemy_id: enemy.id, enemy_name: enemy.name,
    enemy_hp: enemy.hp, enemy_max_hp: enemy.hp,
    enemy_atk: adjustedAtk, enemy_def: enemy.def,
    player_hp: withPassive.hp, player_max_hp: withPassive.max_hp,
    player_mp: withPassive.mp, player_max_mp: withPassive.max_mp,
    turn: 1, is_defending: 0,
    active_effects: '[]',
    combat_log: JSON.stringify([log0])
  };

  const combatEmbed = buildCombatEmbed(initState, player.name, enemy.icon, [log0]);
  const buttons     = buildCombatButtons(userId, loadout.length > 0);
  const imgKey      = enemy.boss ? 'boss' : 'combat';
  const { files: combatFiles, embed: combatEmbedWithImg } = withImage(combatEmbed, imgKey);
  const reply       = await interaction.editReply({ embeds: [combatEmbedWithImg], files: combatFiles, components: [buttons] });

  const state = { ...initState, message_id: reply.id };
  saveCombat(state);

  const collector = reply.createMessageComponentCollector({
    filter: i => i.user.id === userId,
    time: 300_000
  });

  let processing = false;

  collector.on('collect', async (compInt) => {
    const deferred = await compInt.deferUpdate().then(() => true).catch(() => false);
    if (!deferred) return;

    if (processing) return;
    processing = true;

    try {
      const current = getCombatByUser(userId, guildId);
      if (!current) {
        collector.stop();
        return;
      }

      const fresh        = getPlayer(userId, guildId)!;
      const freshPassive = applyPassiveStats(fresh);
      const cid          = (compInt as any).customId as string;

      let result;
      if      (cid === `rpg_attack_${userId}`)   result = processAttack(current, freshPassive.atk);
      else if (cid === `rpg_defend_${userId}`)   result = processDefend(current, freshPassive.atk, 0, 0);
      else if (cid === `rpg_flee_${userId}`)     result = processFlee(current);
      else if (cid === `rpg_skill_${userId}`) {
        const updatedLoadout = getLoadout(userId, guildId);
        if (!updatedLoadout.length) return;
        await compInt.editReply({ components: [buildSkillSelectMenu(userId, updatedLoadout, current.player_mp)] }).catch(() => {});
        return;
      } else if (cid === `rpg_skillmenu_${userId}` && compInt.isStringSelectMenu()) {
        const skillId = (compInt as StringSelectMenuInteraction).values[0].replace(`rpg_useskill_${userId}_`, '');
        result = processSkill(current, skillId, freshPassive.atk, 0, 0);
      } else return;

      if (!result) return;

      if (result.fled) {
        deleteCombat(current.message_id);
        collector.stop();
        await compInt.editReply({ embeds: [simpleEmbed(COLORS.warning, '🏃 Bạn thoát khỏi trận chiến!')], components: [] }).catch(() => {});
        return;
      }

      if (result.enemyDied) {
        deleteCombat(current.message_id);
        collector.stop();
        if (onVictory) await onVictory(interaction, compInt as any, userId, guildId, fresh, enemy, result.newState);
        return;
      }

      if (result.playerDied) {
        deleteCombat(current.message_id);
        collector.stop();
        if (onDeath) await onDeath(interaction, compInt as any, userId, guildId, fresh, enemy);
        return;
      }

      saveCombat(result.newState);
      const updatedLoadout = getLoadout(userId, guildId);
      await compInt.editReply({
        embeds: [buildCombatEmbed(result.newState, fresh.name, enemy.icon, result.logLines)],
        components: [buildCombatButtons(userId, updatedLoadout.length > 0)]
      }).catch(() => {});
    } catch (err) {
      console.error('Combat interaction error:', err);
    } finally {
      processing = false;
    }
  });

  collector.on('end', (_c, reason) => {
    const cur = getCombatByUser(userId, guildId);
    if (cur) deleteCombat(cur.message_id);
    if (reason === 'time') {
      interaction.editReply({ embeds: [simpleEmbed(COLORS.warning, '⏰ Trận chiến timeout.')], components: [] }).catch(() => {});
    }
  });
}

export async function startCombatFlowWithEnemy(
  interaction: ChatInputCommandInteraction,
  userId: string,
  guildId: string,
  enemy: any,
  bonus?: { bonusGold: number; bonusDesc: string; bonusItem?: string },
  onVictory?: CombatVictoryHandler,
  onDeath?: CombatDeathHandler
): Promise<void> {
  if (enemy.id && !getEnemy(enemy.id)) {
    // register inline definition into the map for the duration of combat
    const { ENEMIES } = await import('../data/enemies');
    if (enemy.id && !ENEMIES[enemy.id]) ENEMIES[enemy.id] = enemy;
  }
  if (bonus) {
    enemy.combatBonus = bonus;
  }
  const player      = getPlayer(userId, guildId)!;
  const loadout     = getLoadout(userId, guildId);
  const withPassive = applyPassiveStats(player);

  const log0 = `⚠️ **${enemy.icon} ${enemy.name}** (Lv.${enemy.level}) xuất hiện!`;
  const initState = {
    message_id: 'temp', channel_id: interaction.channelId,
    user_id: userId, guild_id: guildId,
    enemy_id: enemy.id, enemy_name: enemy.name,
    enemy_hp: enemy.hp, enemy_max_hp: enemy.hp,
    enemy_atk: enemy.atk, enemy_def: enemy.def,
    player_hp: withPassive.hp, player_max_hp: withPassive.max_hp,
    player_mp: withPassive.mp, player_max_mp: withPassive.max_mp,
    turn: 1, is_defending: 0,
    active_effects: '[]', combat_log: JSON.stringify([log0])
  };

  const combatEmbed = buildCombatEmbed(initState, player.name, enemy.icon, [log0]);
  const buttons     = buildCombatButtons(userId, loadout.length > 0);
  const reply       = await interaction.editReply({ embeds: [combatEmbed], components: [buttons] });

  const state = { ...initState, message_id: reply.id };
  saveCombat(state);

  const collector = reply.createMessageComponentCollector({
    filter: i => i.user.id === userId,
    time: 300_000
  });

  let processing = false;

  collector.on('collect', async (compInt) => {
    const deferred = await compInt.deferUpdate().then(() => true).catch(() => false);
    if (!deferred) return;

    if (processing) return;
    processing = true;

    try {
      const current = getCombatByUser(userId, guildId);
      if (!current) {
        collector.stop();
        return;
      }

      const fresh        = getPlayer(userId, guildId)!;
      const freshPassive = applyPassiveStats(fresh);
      const cid          = (compInt as any).customId as string;

      let result;
      if      (cid === `rpg_attack_${userId}`)  result = processAttack(current, freshPassive.atk);
      else if (cid === `rpg_defend_${userId}`)  result = processDefend(current, freshPassive.atk, 0, 0);
      else if (cid === `rpg_flee_${userId}`)    result = processFlee(current);
      else if (cid === `rpg_skill_${userId}`) {
        const updatedLoadout = getLoadout(userId, guildId);
        if (!updatedLoadout.length) return;
        await compInt.editReply({ components: [buildSkillSelectMenu(userId, updatedLoadout, current.player_mp)] }).catch(() => {});
        return;
      } else if (cid === `rpg_skillmenu_${userId}` && compInt.isStringSelectMenu()) {
        const skillId = (compInt as StringSelectMenuInteraction).values[0].replace(`rpg_useskill_${userId}_`, '');
        result = processSkill(current, skillId, freshPassive.atk, 0, 0);
      } else return;

      if (!result) return;

      if (result.fled) {
        deleteCombat(current.message_id);
        collector.stop();
        await compInt.editReply({ embeds: [simpleEmbed(COLORS.warning, '🏃 Bạn thoát khỏi trận chiến!')], components: [] }).catch(() => {});
        return;
      }

      if (result.enemyDied) {
        deleteCombat(current.message_id);
        collector.stop();
        if (onVictory) await onVictory(interaction, compInt as any, userId, guildId, fresh, enemy, result.newState);
        return;
      }

      if (result.playerDied) {
        deleteCombat(current.message_id);
        collector.stop();
        if (onDeath) await onDeath(interaction, compInt as any, userId, guildId, fresh, enemy);
        return;
      }

      saveCombat(result.newState);
      await compInt.editReply({
        embeds: [buildCombatEmbed(result.newState, fresh.name, enemy.icon, result.logLines)],
        components: [buildCombatButtons(userId, getLoadout(userId, guildId).length > 0)]
      }).catch(() => {});
    } catch (err) {
      console.error('Combat interaction error:', err);
    } finally {
      processing = false;
    }
  });

  collector.on('end', (_c, reason) => {
    const cur = getCombatByUser(userId, guildId);
    if (cur) deleteCombat(cur.message_id);
    if (reason === 'time') {
      interaction.editReply({ embeds: [simpleEmbed(COLORS.warning, '⏰ Trận chiến timeout.')], components: [] }).catch(() => {});
    }
  });
}
