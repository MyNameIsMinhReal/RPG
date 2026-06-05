import {
  ChatInputCommandInteraction, ButtonInteraction,
  ActionRowBuilder, ButtonBuilder, ButtonStyle,
  ComponentType, StringSelectMenuInteraction
} from 'discord.js';
import { getPlayer, getLoadout, applyPassiveStats } from './player';
import {
  getCombatByUser, saveCombat, deleteCombat,
  processAttack, processSkill, processDefend, processFlee, processItemUse
} from './combat';
import { getEnemy } from '../data/enemies';
import { getInventory } from './player';
import { getItem } from '../data/items';
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


function applyShopkeeperStockUse(enemy: any, result: any): void {
  if (!enemy?.isShopkeeper || enemy.shopStockUsed || !enemy.shopStock) return;
  if (!result?.newState || result.enemyDied || result.playerDied || result.fled) return;

  const state = result.newState;
  if (state.enemy_hp > Math.floor(state.enemy_max_hp * 0.5)) return;

  const itemCount = Array.isArray(enemy.shopStock.itemIds) ? enemy.shopStock.itemIds.length : 0;
  const gearCount = Array.isArray(enemy.shopStock.equipmentIds) ? enemy.shopStock.equipmentIds.length : 0;
  const stockCount = itemCount + gearCount;
  if (stockCount <= 0) {
    enemy.shopStockUsed = true;
    return;
  }

  enemy.shopStockUsed = true;
  enemy.shopStock.itemIds = [];
  enemy.shopStock.equipmentIds = [];

  const heal = Math.max(10, Math.floor(state.enemy_max_hp * Math.min(0.35, 0.12 + stockCount * 0.04)));
  const atkBoost = Math.max(2, Math.ceil(stockCount * 1.5));
  const defBoost = Math.max(1, Math.ceil(stockCount * 0.8));

  state.enemy_hp = Math.min(state.enemy_max_hp, state.enemy_hp + heal);
  state.enemy_atk += atkBoost;
  state.enemy_def += defBoost;

  const logs: string[] = result.logLines ?? [];
  logs.push(
    `🛒 **Shopkeeper nổi giận!** Hắn uống sạch potion, phá seal sách phép và mặc vội trang bị đang bán.\n` +
    `❤️ +${heal} HP · ⚔️ +${atkBoost} ATK · 🛡️ +${defBoost} DEF\n` +
    `📦 Hàng trong shop đã bị dùng hết — nếu thắng sẽ không còn gì để cướp.`
  );
  state.combat_log = JSON.stringify(logs.slice(-6));
}

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
    combat_log: JSON.stringify([log0]),
    player_stamina: 100, player_max_stamina: 100
  };

  const combatEmbed = buildCombatEmbed(initState, player.name, enemy.icon, [log0]);
  const inventory0  = getInventory(userId, guildId);
  const hasItems0   = inventory0.some(e => { const it = getItem(e.item_id); return it?.type === "consumable" && !!it.effect; });
  const buttons     = buildCombatButtons(userId, loadout.length > 0, 100, hasItems0);
  const imgKey      = enemy.boss ? 'boss' : 'combat';
  const { files: combatFiles, embed: combatEmbedWithImg } = withImage(combatEmbed, imgKey);
  const reply       = await interaction.editReply({ embeds: [combatEmbedWithImg], files: combatFiles, components: buttons });

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
      else if (cid === `rpg_item_${userId}`) {
        // Show consumable select menu
        const inv = getInventory(userId, guildId);
        const consumables = inv.filter((e: any) => { const it = getItem(e.item_id); return it?.type === 'consumable' && !!it.effect && e.quantity > 0; });
        if (!consumables.length) { await compInt.editReply({ content: '🎒 Không có đồ dùng được!' }); return; }
        const { StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ActionRowBuilder: ARB2 } = require('discord.js');
        const opts = consumables.map((e: any) => {
          const it = getItem(e.item_id)!;
          return new StringSelectMenuOptionBuilder()
            .setLabel(`${it.name} ×${e.quantity}`)
            .setDescription((it.description ?? '').replace(/\*\*/g,'').slice(0,50))
            .setValue(`useitem_${e.item_id}`)
            .setEmoji(it.icon);
        });
        const menuRow = new ARB2().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId(`rpg_itemsel_${userId}`)
            .setPlaceholder('🎒 Chọn vật phẩm...')
            .addOptions(opts.slice(0,25))
        );
        await compInt.editReply({ components: [menuRow] });
        return;
      }
      else if (cid === `rpg_itemsel_${userId}`) {
        const itemId = (compInt as any).values?.[0]?.replace('useitem_', '');
        if (!itemId) return;
        result = processItemUse(current, itemId);
      }
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

      applyShopkeeperStockUse(enemy, result);

      if ((enemy as any)?.isShopkeeper && !(enemy as any).shopkeeperMercyOffered && !result.enemyDied && !result.playerDied && result.newState?.enemy_hp <= Math.floor(result.newState.enemy_max_hp * 0.2)) {
        (enemy as any).shopkeeperMercyOffered = true;
        saveCombat(result.newState);
        const mercyRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder().setCustomId(`shopmercy_spare_${userId}`).setLabel('Tha mạng').setEmoji('🙏').setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId(`shopmercy_kill_${userId}`).setLabel('Kết liễu').setEmoji('🗡️').setStyle(ButtonStyle.Danger),
          new ButtonBuilder().setCustomId(`shopmercy_take_${userId}`).setLabel('Ép giao nộp hàng').setEmoji('💰').setStyle(ButtonStyle.Primary)
        );
        await compInt.editReply({
          embeds: [buildCombatEmbed(result.newState, fresh.name, enemy.icon, [
            ...(result.logLines ?? []),
            '🧎 **Shopkeeper quỳ xuống van xin.** "Tha cho ta... ta sẽ nhớ ân này."'
          ])],
          components: [mercyRow]
        }).catch(() => {});
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
        components: buildCombatButtons(userId, updatedLoadout.length > 0, result.newState.player_stamina ?? 100, getInventory(userId, guildId).some(e => { const it = getItem(e.item_id); return it?.type === "consumable" && !!it.effect; }))
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
    active_effects: '[]', combat_log: JSON.stringify([log0]),
    player_stamina: 100, player_max_stamina: 100
  };
  const combatEmbed2 = buildCombatEmbed(initState, player.name, enemy.icon, [log0]);
  const inventory0   = getInventory(userId, guildId);
  const hasItems0    = inventory0.some((e: any) => { const it = getItem(e.item_id); return it?.type === 'consumable' && !!it.effect; });
  const buttons      = buildCombatButtons(userId, loadout.length > 0, 100, hasItems0);
  const reply        = await interaction.editReply({ embeds: [combatEmbed2], components: buttons });

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

      if ((enemy as any)?.isShopkeeper && cid.startsWith(`shopmercy_`) && typeof (enemy as any).onMercy === 'function') {
        deleteCombat(current.message_id);
        collector.stop('mercy');
        await (enemy as any).onMercy(interaction, compInt, userId, guildId, fresh, enemy, current, cid);
        return;
      }

      let result;
      if      (cid === `rpg_attack_${userId}`)  result = processAttack(current, freshPassive.atk);
      else if (cid === `rpg_defend_${userId}`)  result = processDefend(current, freshPassive.atk, 0, 0);
      else if (cid === `rpg_flee_${userId}`)    result = processFlee(current);
      else if (cid === `rpg_item_${userId}`) {
        const inv = getInventory(userId, guildId);
        const cons = inv.filter((e: any) => { const it = getItem(e.item_id); return it?.type === 'consumable' && !!it.effect && e.quantity > 0; });
        if (!cons.length) return;
        const { StringSelectMenuBuilder: SMB2, StringSelectMenuOptionBuilder: SMOB2, ActionRowBuilder: ARB3 } = require('discord.js');
        const opts2 = cons.map((e: any) => { const it = getItem(e.item_id)!; return new SMOB2().setLabel(`${it.name} ×${e.quantity}`).setValue(`useitem_${e.item_id}`).setEmoji(it.icon); });
        await compInt.editReply({ components: [new ARB3().addComponents(new SMB2().setCustomId(`rpg_itemsel_${userId}`).setPlaceholder('🎒 Chọn...').addOptions(opts2.slice(0,25)))] });
        return;
      }
      else if (cid === `rpg_itemsel_${userId}`) {
        const itemId = (compInt as any).values?.[0]?.replace('useitem_', '');
        if (!itemId) return;
        result = processItemUse(current, itemId);
      }
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

      applyShopkeeperStockUse(enemy, result);

      if ((enemy as any)?.isShopkeeper && !(enemy as any).shopkeeperMercyOffered && !result.enemyDied && !result.playerDied && result.newState?.enemy_hp <= Math.floor(result.newState.enemy_max_hp * 0.2)) {
        (enemy as any).shopkeeperMercyOffered = true;
        saveCombat(result.newState);
        const mercyRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder().setCustomId(`shopmercy_spare_${userId}`).setLabel('Tha mạng').setEmoji('🙏').setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId(`shopmercy_kill_${userId}`).setLabel('Kết liễu').setEmoji('🗡️').setStyle(ButtonStyle.Danger),
          new ButtonBuilder().setCustomId(`shopmercy_take_${userId}`).setLabel('Ép giao nộp hàng').setEmoji('💰').setStyle(ButtonStyle.Primary)
        );
        await compInt.editReply({
          embeds: [buildCombatEmbed(result.newState, fresh.name, enemy.icon, [
            ...(result.logLines ?? []),
            '🧎 **Shopkeeper quỳ xuống van xin.** "Tha cho ta... ta sẽ nhớ ân này."'
          ])],
          components: [mercyRow]
        }).catch(() => {});
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
        components: buildCombatButtons(userId, getLoadout(userId, guildId).length > 0)
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
