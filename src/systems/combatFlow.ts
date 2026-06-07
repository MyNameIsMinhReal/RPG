import {
  ChatInputCommandInteraction, ButtonInteraction,
  ActionRowBuilder, ButtonBuilder, ButtonStyle,
  ComponentType, StringSelectMenuInteraction
} from 'discord.js';
import { getPlayer, getLoadout, applyPassiveStats, getItemQty, removeItem } from './player';
import {
  getCombatByUser, saveCombat, deleteCombat,
  processAttack, processSkill, processDefend, processFlee, processItemUse,
  buildGroupCombatState
} from './combat';
import { getEnemy, getEnemiesForZone } from '../data/enemies';
import { getInventory } from './player';
import { getItem } from '../data/items';
import { buildCombatEmbed, buildCombatButtons, buildSkillSelectMenu, simpleEmbed, COLORS } from '../utils/embeds';
import type { CombatEnemy } from '../utils/embeds';
import { withImage } from '../utils/eventImages';
import { getEnemyAtkBonus } from './world';
import { applyConsumableCombatBonuses, getBuff, consumeBuff } from './consumables';
import { incrementDaily } from '../commands/daily';

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

export type CombatFleeHandler = (
  interaction: ChatInputCommandInteraction,
  btnInt: ButtonInteraction,
  userId: string,
  guildId: string,
  player: any,
  enemy: any,
  state: any,
  logLines: string[]
) => Promise<void>;


const COMBAT_USABLE_ITEM_IDS = new Set([
  'health_potion','minor_healing_potion','healing_potion','emergency_potion','mana_potion','mana_flask','elixir','moonwater',
  'antidote','cooling_salve','purifying_salt','purification_stone','scroll_escape','scroll_silence','warding_charm','rune_charm','arson_bottle',
  'weapon_oil','armor_polish','focus_tonic','stone_skin_draught','quickstep_tea','rage_elixir','blood_vial'
]);

function isCombatUsableItem(itemId: string): boolean {
  return COMBAT_USABLE_ITEM_IDS.has(itemId);
}

function makeBackRow(userId: string) {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`rpg_back_${userId}`)
      .setLabel('◀ Quay lại')
      .setStyle(ButtonStyle.Secondary)
  );
}

function hasUsableItems(userId: string, guildId: string): boolean {
  return getInventory(userId, guildId).some((e: any) => {
    const it = getItem(e.item_id);
    return it?.type === 'consumable' && isCombatUsableItem(e.item_id);
  });
}

function tryCrackedSoulCharm(userId: string, guildId: string, result: any): boolean {
  if (!result?.playerDied) return false;

  if (getItemQty(userId, guildId, 'soul_anchor') > 0) {
    removeItem(userId, guildId, 'soul_anchor', 1);
    result.playerDied = false;
    result.newState.player_hp = 1;
    result.logLines = [
      ...(result.logLines ?? []),
      '⚓ **Soul Anchor kích hoạt!** Linh hồn bị kéo lại, bạn sống sót với **1 HP**.'
    ];
    result.newState.combat_log = JSON.stringify(result.logLines.slice(-6));
    return true;
  }

  if (getItemQty(userId, guildId, 'cracked_soul_charm') <= 0) return false;
  removeItem(userId, guildId, 'cracked_soul_charm', 1);
  if (Math.random() > 0.25) return false;
  result.playerDied = false;
  result.newState.player_hp = 1;
  result.logLines = [
    ...(result.logLines ?? []),
    '💀 **Cracked Soul Charm vỡ tan!** Linh hồn kéo bạn trở lại với **1 HP**.'
  ];
  result.newState.combat_log = JSON.stringify(result.logLines.slice(-6));
  return true;
}

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
  onDeath: CombatDeathHandler,
  onFlee?: CombatFleeHandler
): Promise<void> {
  const player      = getPlayer(userId, guildId)!;
  const enemy       = getEnemy(enemyId)!;
  const loadout     = getLoadout(userId, guildId);
  const withPassiveRaw = applyPassiveStats(player);
  const buffedStart    = applyConsumableCombatBonuses(withPassiveRaw);
  const withPassive    = buffedStart.player;

  const atkBonus     = getEnemyAtkBonus(guildId);
  const greedBuff    = getBuff(userId, guildId, 'scroll_greed');
  const greedAtk     = greedBuff ? 15 : 0;
  const adjustedAtk  = enemy.atk + Math.floor(enemy.atk * (atkBonus + greedAtk) / 100);

  const log0 = enemy.boss
    ? `👑 **BOSS** — **${enemy.icon} ${enemy.name}** xuất hiện!
*"${enemy.lore}"*`
    : `⚠️ **${enemy.icon} ${enemy.name}** (Lv.${enemy.level}) tấn công!`;
  const openingLogs = [log0, ...buffedStart.logs, ...(greedBuff ? ['📜 Scroll of Greed: enemy ATK +15%, gold thưởng sẽ tăng nếu thắng.'] : [])];

  const initState = {
    message_id: 'temp', channel_id: interaction.channelId,
    user_id: userId, guild_id: guildId,
    enemy_id: enemy.id, enemy_name: enemy.name,
    enemy_hp: enemy.hp, enemy_max_hp: enemy.hp,
    enemy_atk: adjustedAtk, enemy_def: enemy.def,
    player_hp: withPassive.hp, player_max_hp: withPassive.max_hp,
    player_mp: withPassive.mp, player_max_mp: withPassive.max_mp,
    player_def: withPassive.def,
    turn: 1, is_defending: 0,
    active_effects: JSON.stringify([
      ...(buffedStart.logs.some(l => l.includes('Quickstep')) ? [{ name: 'dodge', duration: 1 }] : []),
      ...(consumeBuff(userId, guildId, 'rune_charm') ? [{ name: 'ward', duration: 1 }] : []),
      ...(buffedStart.logs.some(l => l.includes('Focus Tonic')) ? [{ name: 'focus_tonic', duration: 999, value: 20 }, { name: 'incoming_damage_up', duration: 999, value: 10 }] : []),
      ...(buffedStart.logs.some(l => l.includes('Rage Elixir')) ? [{ name: 'incoming_damage_up', duration: 999, value: 15 }] : [])
    ]),
    combat_log: JSON.stringify(openingLogs),
    player_stamina: 100, player_max_stamina: 100
  };

  const combatEmbed = buildCombatEmbed(initState, player.name, enemy.icon, openingLogs);
  const inventory0  = getInventory(userId, guildId);
  const hasItems0   = inventory0.some(e => { const it = getItem(e.item_id); return it?.type === "consumable" && isCombatUsableItem(e.item_id); });
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
      if (cid === `rpg_attack_${userId}`) {
        // Group combat: show target selector if multiple enemies alive
        const stateGroup: any[] | null = current.enemies_json ? JSON.parse(current.enemies_json) : null;
        const aliveGroup = stateGroup?.filter((e: any) => e.hp > 0) ?? null;
        if (aliveGroup && aliveGroup.length > 1) {
          const { StringSelectMenuBuilder: SMB, StringSelectMenuOptionBuilder: SMOB, ActionRowBuilder: ARB } = require('discord.js');
          const opts = aliveGroup.map((e: any) => {
            const origIdx = stateGroup!.findIndex((g: any) => g.id === e.id && g.hp === e.hp);
            return new SMOB()
              .setLabel(`[${origIdx + 1}] ${e.name} — HP: ${e.hp}/${e.max_hp}`)
              .setValue(`rpg_attackidx_${userId}_${origIdx}`);
          });
          await compInt.editReply({ components: [new ARB().addComponents(
            new SMB().setCustomId(`rpg_atktarget_${userId}`).setPlaceholder('🎯 Chọn mục tiêu tấn công...').addOptions(opts.slice(0, 25))
          ), makeBackRow(userId)]});
          return;
        }
        result = processAttack(current, freshPassive.atk);
      }
      else if (cid === `rpg_atktarget_${userId}` && compInt.isStringSelectMenu()) {
        const val = (compInt as StringSelectMenuInteraction).values[0];
        const idx = parseInt(val.replace(`rpg_attackidx_${userId}_`, ''));
        result = processAttack(current, freshPassive.atk, isNaN(idx) ? 0 : idx);
      }
      else if (cid === `rpg_defend_${userId}`)   result = processDefend(current, freshPassive.atk, 0, 0);
      else if (cid === `rpg_flee_${userId}`)     result = processFlee(current);
      else if (cid === `rpg_item_${userId}`) {
        const inv = getInventory(userId, guildId);
        const consumables = inv.filter((e: any) => { const it = getItem(e.item_id); return it?.type === 'consumable' && e.quantity > 0 && isCombatUsableItem(e.item_id); });
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
        await compInt.editReply({ components: [menuRow, makeBackRow(userId)] });
        return;
      }
      else if (cid === `rpg_itemsel_${userId}`) {
        const itemId = (compInt as any).values?.[0]?.replace('useitem_', '');
        if (!itemId) return;
        result = processItemUse(current, itemId);
        if (result.itemConsumed) incrementDaily(userId, guildId, 'potion_used');
      }
      else if (cid === `rpg_skill_${userId}`) {
        const updatedLoadout = getLoadout(userId, guildId);
        if (!updatedLoadout.length) return;
        await compInt.editReply({ components: [buildSkillSelectMenu(userId, updatedLoadout, current.player_mp), makeBackRow(userId)] }).catch(() => {});
        return;
      } else if (cid === `rpg_skillmenu_${userId}` && compInt.isStringSelectMenu()) {
        const skillId = (compInt as StringSelectMenuInteraction).values[0].replace(`rpg_useskill_${userId}_`, '');
        result = processSkill(current, skillId, freshPassive.atk, 0, 0);
      } else if (cid === `rpg_back_${userId}`) {
        await compInt.editReply({
          embeds: [buildCombatEmbed(current, fresh.name, enemy.icon, JSON.parse(current.combat_log ?? '[]'))],
          components: buildCombatButtons(userId, getLoadout(userId, guildId).length > 0, current.player_stamina ?? 100, hasUsableItems(userId, guildId))
        }).catch(() => {});
        return;
      } else return;

      if (!result) return;

      if (result.fled) {
        deleteCombat(current.message_id);
        collector.stop('fled');
        if (onFlee) {
          await onFlee(interaction, compInt as any, userId, guildId, fresh, enemy, result.newState, result.logLines);
        } else {
          await compInt.editReply({ embeds: [simpleEmbed(COLORS.warning, '🏃 Bạn thoát khỏi trận chiến!')], components: [] }).catch(() => {});
        }
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
        if (tryCrackedSoulCharm(userId, guildId, result)) {
          saveCombat(result.newState);
          await compInt.editReply({
            embeds: [buildCombatEmbed(result.newState, fresh.name, enemy.icon, result.logLines)],
            components: buildCombatButtons(userId, getLoadout(userId, guildId).length > 0, result.newState.player_stamina ?? 100, getInventory(userId, guildId).some(e => { const it = getItem(e.item_id); return it?.type === 'consumable' && isCombatUsableItem(e.item_id); }))
          }).catch(() => {});
          return;
        }
        deleteCombat(current.message_id);
        collector.stop();
        if (onDeath) await onDeath(interaction, compInt as any, userId, guildId, fresh, enemy);
        return;
      }

      saveCombat(result.newState);
      const updatedLoadout = getLoadout(userId, guildId);
      await compInt.editReply({
        embeds: [buildCombatEmbed(result.newState, fresh.name, enemy.icon, result.logLines)],
        components: buildCombatButtons(userId, updatedLoadout.length > 0, result.newState.player_stamina ?? 100, getInventory(userId, guildId).some(e => { const it = getItem(e.item_id); return it?.type === "consumable" && isCombatUsableItem(e.item_id); }))
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
  onDeath?: CombatDeathHandler,
  onFlee?: CombatFleeHandler
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
  const withPassiveRaw = applyPassiveStats(player);
  const buffedStart    = applyConsumableCombatBonuses(withPassiveRaw);
  const withPassive    = buffedStart.player;

  const greedBuff = getBuff(userId, guildId, 'scroll_greed');
  if (greedBuff) enemy.atk = Math.floor(enemy.atk * 1.15);
  const smokeBuff = enemy?.isShopkeeper ? consumeBuff(userId, guildId, 'assassins_smoke') : undefined;
  if (smokeBuff) enemy.def = Math.max(0, Math.floor(enemy.def * 0.8));

  const log0 = `⚠️ **${enemy.icon} ${enemy.name}** (Lv.${enemy.level}) xuất hiện!`;
  const openingLogs = [
    log0,
    ...buffedStart.logs,
    ...(greedBuff ? ['📜 Scroll of Greed: enemy ATK +15%, gold thưởng sẽ tăng nếu thắng.'] : []),
    ...(smokeBuff ? ['🗡️ Assassin’s Smoke: shopkeeper DEF -20% khi mở combat.'] : [])
  ];
  const initState = {
    message_id: 'temp', channel_id: interaction.channelId,
    user_id: userId, guild_id: guildId,
    enemy_id: enemy.id, enemy_name: enemy.name,
    enemy_hp: enemy.hp, enemy_max_hp: enemy.hp,
    enemy_atk: enemy.atk, enemy_def: enemy.def,
    player_hp: withPassive.hp, player_max_hp: withPassive.max_hp,
    player_mp: withPassive.mp, player_max_mp: withPassive.max_mp,
    player_def: withPassive.def,
    turn: 1, is_defending: 0,
    active_effects: JSON.stringify([
      ...(buffedStart.logs.some(l => l.includes('Quickstep')) ? [{ name: 'dodge', duration: 1 }] : []),
      ...(consumeBuff(userId, guildId, 'rune_charm') ? [{ name: 'ward', duration: 1 }] : []),
      ...(buffedStart.logs.some(l => l.includes('Focus Tonic')) ? [{ name: 'focus_tonic', duration: 999, value: 20 }, { name: 'incoming_damage_up', duration: 999, value: 10 }] : []),
      ...(buffedStart.logs.some(l => l.includes('Rage Elixir')) ? [{ name: 'incoming_damage_up', duration: 999, value: 15 }] : [])
    ]), combat_log: JSON.stringify(openingLogs),
    player_stamina: 100, player_max_stamina: 100
  };
  const combatEmbed2 = buildCombatEmbed(initState, player.name, enemy.icon, openingLogs);
  const inventory0   = getInventory(userId, guildId);
  const hasItems0    = inventory0.some((e: any) => { const it = getItem(e.item_id); return it?.type === 'consumable' && isCombatUsableItem(e.item_id); });
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
      if (cid === `rpg_attack_${userId}`) {
        const stateGroup: any[] | null = current.enemies_json ? JSON.parse(current.enemies_json) : null;
        const aliveGroup = stateGroup?.filter((e: any) => e.hp > 0) ?? null;
        if (aliveGroup && aliveGroup.length > 1) {
          const { StringSelectMenuBuilder: SMBa, StringSelectMenuOptionBuilder: SMOBa, ActionRowBuilder: ARBa } = require('discord.js');
          const optsa = aliveGroup.map((e: any) => {
            const origIdx = stateGroup!.findIndex((g: any) => g.id === e.id && g.hp === e.hp);
            return new SMOBa().setLabel(`[${origIdx + 1}] ${e.name} — HP: ${e.hp}/${e.max_hp}`).setValue(`rpg_attackidx_${userId}_${origIdx}`);
          });
          await compInt.editReply({ components: [new ARBa().addComponents(new SMBa().setCustomId(`rpg_atktarget_${userId}`).setPlaceholder('🎯 Chọn mục tiêu...').addOptions(optsa.slice(0, 25))), makeBackRow(userId)] });
          return;
        }
        result = processAttack(current, freshPassive.atk);
      }
      else if (cid === `rpg_atktarget_${userId}` && compInt.isStringSelectMenu()) {
        const val = (compInt as StringSelectMenuInteraction).values[0];
        const idx = parseInt(val.replace(`rpg_attackidx_${userId}_`, ''));
        result = processAttack(current, freshPassive.atk, isNaN(idx) ? 0 : idx);
      }
      else if (cid === `rpg_defend_${userId}`)  result = processDefend(current, freshPassive.atk, 0, 0);
      else if (cid === `rpg_flee_${userId}`)    result = processFlee(current);
      else if (cid === `rpg_item_${userId}`) {
        const inv = getInventory(userId, guildId);
        const cons = inv.filter((e: any) => { const it = getItem(e.item_id); return it?.type === 'consumable' && e.quantity > 0 && isCombatUsableItem(e.item_id); });
        if (!cons.length) return;
        const { StringSelectMenuBuilder: SMB2, StringSelectMenuOptionBuilder: SMOB2, ActionRowBuilder: ARB3 } = require('discord.js');
        const opts2 = cons.map((e: any) => { const it = getItem(e.item_id)!; return new SMOB2().setLabel(`${it.name} ×${e.quantity}`).setValue(`useitem_${e.item_id}`).setEmoji(it.icon); });
        await compInt.editReply({ components: [new ARB3().addComponents(new SMB2().setCustomId(`rpg_itemsel_${userId}`).setPlaceholder('🎒 Chọn...').addOptions(opts2.slice(0,25))), makeBackRow(userId)] });
        return;
      }
      else if (cid === `rpg_itemsel_${userId}`) {
        const itemId = (compInt as any).values?.[0]?.replace('useitem_', '');
        if (!itemId) return;
        result = processItemUse(current, itemId);
        if (result.itemConsumed) incrementDaily(userId, guildId, 'potion_used');
      }
      else if (cid === `rpg_skill_${userId}`) {
        const updatedLoadout = getLoadout(userId, guildId);
        if (!updatedLoadout.length) return;
        await compInt.editReply({ components: [buildSkillSelectMenu(userId, updatedLoadout, current.player_mp), makeBackRow(userId)] }).catch(() => {});
        return;
      } else if (cid === `rpg_skillmenu_${userId}` && compInt.isStringSelectMenu()) {
        const skillId = (compInt as StringSelectMenuInteraction).values[0].replace(`rpg_useskill_${userId}_`, '');
        result = processSkill(current, skillId, freshPassive.atk, 0, 0);
      } else if (cid === `rpg_back_${userId}`) {
        await compInt.editReply({
          embeds: [buildCombatEmbed(current, fresh.name, enemy.icon, JSON.parse(current.combat_log ?? '[]'))],
          components: buildCombatButtons(userId, getLoadout(userId, guildId).length > 0, current.player_stamina ?? 100, hasUsableItems(userId, guildId))
        }).catch(() => {});
        return;
      } else return;

      if (!result) return;

      if (result.fled) {
        deleteCombat(current.message_id);
        collector.stop('fled');
        if (onFlee) {
          await onFlee(interaction, compInt as any, userId, guildId, fresh, enemy, result.newState, result.logLines);
        } else {
          await compInt.editReply({ embeds: [simpleEmbed(COLORS.warning, '🏃 Bạn thoát khỏi trận chiến!')], components: [] }).catch(() => {});
        }
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
        if (tryCrackedSoulCharm(userId, guildId, result)) {
          saveCombat(result.newState);
          await compInt.editReply({
            embeds: [buildCombatEmbed(result.newState, fresh.name, enemy.icon, result.logLines)],
            components: buildCombatButtons(userId, getLoadout(userId, guildId).length > 0, result.newState.player_stamina ?? 100, getInventory(userId, guildId).some(e => { const it = getItem(e.item_id); return it?.type === 'consumable' && isCombatUsableItem(e.item_id); }))
          }).catch(() => {});
          return;
        }
        deleteCombat(current.message_id);
        collector.stop();
        if (onDeath) await onDeath(interaction, compInt as any, userId, guildId, fresh, enemy);
        return;
      }

      saveCombat(result.newState);
      await compInt.editReply({
        embeds: [buildCombatEmbed(result.newState, fresh.name, enemy.icon, result.logLines)],
        components: buildCombatButtons(userId, getLoadout(userId, guildId).length > 0, result.newState.player_stamina ?? 100, getInventory(userId, guildId).some(e => { const it = getItem(e.item_id); return it?.type === 'consumable' && isCombatUsableItem(e.item_id); }))
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

// ── Group Combat Flow ─────────────────────────────────────────────────────
export async function startGroupCombatFlow(
  interaction: ChatInputCommandInteraction,
  userId: string,
  guildId: string,
  enemyIds: string[],
  onVictory: CombatVictoryHandler,
  onDeath: CombatDeathHandler,
  onFlee?: CombatFleeHandler
): Promise<void> {
  const player      = getPlayer(userId, guildId)!;
  const loadout     = getLoadout(userId, guildId);
  const withPassiveRaw = applyPassiveStats(player);
  const buffedStart    = applyConsumableCombatBonuses(withPassiveRaw);
  const withPassive    = buffedStart.player;
  const atkBonus       = getEnemyAtkBonus(guildId);

  const rawEnemies = enemyIds.map(id => getEnemy(id)!).filter(Boolean);
  const combatEnemies: CombatEnemy[] = rawEnemies.map(e => ({
    id: e.id, name: e.name, icon: e.icon,
    hp: e.hp, max_hp: e.hp,
    atk: e.atk + Math.floor(e.atk * atkBonus / 100),
    def: e.def,
    specialAttacks: (e.specialAttacks ?? []) as string[],
  }));

  const primary    = combatEnemies[0];
  const groupLabel = combatEnemies.map(e => `${e.icon} ${e.name}`).join(', ');
  const openingLogs = [`⚠️ **Nhóm kẻ thù xuất hiện!** ${groupLabel}`, ...buffedStart.logs];

  const baseState = {
    message_id: 'temp', channel_id: interaction.channelId,
    user_id: userId, guild_id: guildId,
    enemy_id: primary.id, enemy_name: primary.name,
    enemy_hp: primary.hp, enemy_max_hp: primary.max_hp,
    enemy_atk: primary.atk, enemy_def: primary.def,
    player_hp: withPassive.hp, player_max_hp: withPassive.max_hp,
    player_mp: withPassive.mp, player_max_mp: withPassive.max_mp,
    player_def: withPassive.def,
    turn: 1, is_defending: 0,
    active_effects: JSON.stringify([
      ...(buffedStart.logs.some(l => l.includes('Quickstep')) ? [{ name: 'dodge', duration: 1 }] : []),
      ...(consumeBuff(userId, guildId, 'rune_charm') ? [{ name: 'ward', duration: 1 }] : []),
      ...(buffedStart.logs.some(l => l.includes('Focus Tonic')) ? [{ name: 'focus_tonic', duration: 999, value: 20 }, { name: 'incoming_damage_up', duration: 999, value: 10 }] : []),
      ...(buffedStart.logs.some(l => l.includes('Rage Elixir')) ? [{ name: 'incoming_damage_up', duration: 999, value: 15 }] : [])
    ]),
    combat_log: JSON.stringify(openingLogs),
    player_stamina: 100, player_max_stamina: 100,
  };
  const initState = buildGroupCombatState(baseState, combatEnemies);

  const groupEnemy = {
    id: primary.id,
    name: combatEnemies.map(e => e.name).join(' & '),
    icon: '⚔️',
    level: Math.max(...rawEnemies.map(e => e.level)),
    _groupEnemies: rawEnemies,
  };

  const combatEmbed = buildCombatEmbed(initState, player.name, '⚔️', openingLogs);
  const inventory0  = getInventory(userId, guildId);
  const hasItems0   = inventory0.some(e => { const it = getItem(e.item_id); return it?.type === 'consumable' && isCombatUsableItem(e.item_id); });
  const buttons     = buildCombatButtons(userId, loadout.length > 0, 100, hasItems0);
  const { files: combatFiles, embed: combatEmbedWithImg } = withImage(combatEmbed, 'combat');
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
      if (!current) { collector.stop(); return; }

      const fresh        = getPlayer(userId, guildId)!;
      const freshPassive = applyPassiveStats(fresh);
      const cid          = (compInt as any).customId as string;

      let result;
      if (cid === `rpg_attack_${userId}`) {
        const sg: any[] | null = current.enemies_json ? JSON.parse(current.enemies_json) : null;
        const alive = sg?.filter((e: any) => e.hp > 0) ?? null;
        if (alive && alive.length > 1) {
          const { StringSelectMenuBuilder: SMB, StringSelectMenuOptionBuilder: SMOB, ActionRowBuilder: ARB } = require('discord.js');
          const opts = alive.map((e: any) => {
            const origIdx = sg!.findIndex((g: any) => g.id === e.id && g.hp === e.hp);
            return new SMOB().setLabel(`[${origIdx + 1}] ${e.name} — HP: ${e.hp}/${e.max_hp}`).setValue(`rpg_attackidx_${userId}_${origIdx}`);
          });
          await compInt.editReply({ components: [new ARB().addComponents(new SMB().setCustomId(`rpg_atktarget_${userId}`).setPlaceholder('🎯 Chọn mục tiêu...').addOptions(opts.slice(0, 25))), makeBackRow(userId)] });
          return;
        }
        result = processAttack(current, freshPassive.atk);
      }
      else if (cid === `rpg_atktarget_${userId}` && (compInt as any).isStringSelectMenu()) {
        const val = (compInt as StringSelectMenuInteraction).values[0];
        const idx = parseInt(val.replace(`rpg_attackidx_${userId}_`, ''));
        result = processAttack(current, freshPassive.atk, isNaN(idx) ? 0 : idx);
      }
      else if (cid === `rpg_defend_${userId}`)   result = processDefend(current, freshPassive.atk, 0, 0);
      else if (cid === `rpg_flee_${userId}`)     result = processFlee(current);
      else if (cid === `rpg_item_${userId}`) {
        const inv = getInventory(userId, guildId);
        const consumables = inv.filter((e: any) => { const it = getItem(e.item_id); return it?.type === 'consumable' && e.quantity > 0 && isCombatUsableItem(e.item_id); });
        if (!consumables.length) return;
        const { StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ActionRowBuilder: ARB2 } = require('discord.js');
        const opts = consumables.map((e: any) => {
          const it = getItem(e.item_id)!;
          return new StringSelectMenuOptionBuilder()
            .setLabel(`${it.name} ×${e.quantity}`)
            .setDescription((it.description ?? '').replace(/\*\*/g, '').slice(0, 50))
            .setValue(`useitem_${e.item_id}`)
            .setEmoji(it.icon);
        });
        await compInt.editReply({ components: [new ARB2().addComponents(new StringSelectMenuBuilder().setCustomId(`rpg_itemsel_${userId}`).setPlaceholder('🎒 Chọn vật phẩm...').addOptions(opts.slice(0, 25))), makeBackRow(userId)] });
        return;
      }
      else if (cid === `rpg_itemsel_${userId}`) {
        const itemId = (compInt as any).values?.[0]?.replace('useitem_', '');
        if (!itemId) return;
        result = processItemUse(current, itemId);
        if (result.itemConsumed) incrementDaily(userId, guildId, 'potion_used');
      }
      else if (cid === `rpg_skill_${userId}`) {
        const updatedLoadout = getLoadout(userId, guildId);
        if (!updatedLoadout.length) return;
        await compInt.editReply({ components: [buildSkillSelectMenu(userId, updatedLoadout, current.player_mp), makeBackRow(userId)] }).catch(() => {});
        return;
      } else if (cid === `rpg_skillmenu_${userId}` && (compInt as any).isStringSelectMenu()) {
        const skillId = (compInt as StringSelectMenuInteraction).values[0].replace(`rpg_useskill_${userId}_`, '');
        result = processSkill(current, skillId, freshPassive.atk, 0, 0);
      } else if (cid === `rpg_back_${userId}`) {
        await compInt.editReply({
          embeds: [buildCombatEmbed(current, fresh.name, '⚔️', JSON.parse(current.combat_log ?? '[]'))],
          components: buildCombatButtons(userId, getLoadout(userId, guildId).length > 0, current.player_stamina ?? 100, hasUsableItems(userId, guildId))
        }).catch(() => {});
        return;
      } else return;

      if (!result) return;

      if (result.fled) {
        deleteCombat(current.message_id);
        collector.stop('fled');
        if (onFlee) await onFlee(interaction, compInt as any, userId, guildId, fresh, groupEnemy, result.newState, result.logLines);
        else await compInt.editReply({ embeds: [simpleEmbed(COLORS.warning, '🏃 Bạn thoát khỏi trận chiến!')], components: [] }).catch(() => {});
        return;
      }

      if (result.enemyDied) {
        deleteCombat(current.message_id);
        collector.stop();
        if (onVictory) await onVictory(interaction, compInt as any, userId, guildId, fresh, groupEnemy, result.newState);
        return;
      }

      if (result.playerDied) {
        if (tryCrackedSoulCharm(userId, guildId, result)) {
          saveCombat(result.newState);
          await compInt.editReply({
            embeds: [buildCombatEmbed(result.newState, fresh.name, '⚔️', result.logLines)],
            components: buildCombatButtons(userId, getLoadout(userId, guildId).length > 0, result.newState.player_stamina ?? 100, getInventory(userId, guildId).some(e => { const it = getItem(e.item_id); return it?.type === 'consumable' && isCombatUsableItem(e.item_id); }))
          }).catch(() => {});
          return;
        }
        deleteCombat(current.message_id);
        collector.stop();
        if (onDeath) await onDeath(interaction, compInt as any, userId, guildId, fresh, groupEnemy);
        return;
      }

      saveCombat(result.newState);
      await compInt.editReply({
        embeds: [buildCombatEmbed(result.newState, fresh.name, '⚔️', result.logLines)],
        components: buildCombatButtons(userId, getLoadout(userId, guildId).length > 0, result.newState.player_stamina ?? 100, getInventory(userId, guildId).some(e => { const it = getItem(e.item_id); return it?.type === 'consumable' && isCombatUsableItem(e.item_id); }))
      }).catch(() => {});
    } catch (err) {
      console.error('Group combat interaction error:', err);
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
