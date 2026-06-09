import {
  ChatInputCommandInteraction, ButtonInteraction,
  ActionRowBuilder, ButtonBuilder, ButtonStyle,
  StringSelectMenuInteraction,
  StringSelectMenuBuilder, StringSelectMenuOptionBuilder
} from 'discord.js';
import { registerCombat, unregisterCombat, getCombatEntry } from './combatRegistry';
import { getPlayer, getLoadout, applyPassiveStats, getItemQty, removeItem } from './player';
import {
  getCombatByUser, saveCombat, deleteCombat,
  processAttack, processSkill, processDefend, processFlee, processItemUse,
  buildGroupCombatState
} from './combat';
import { getEnemy, getEnemiesForZone } from '../data/enemies';
import { getInventory } from './player';
import { getItem } from '../data/items';
import { getSkill } from '../data/skills';
import { buildCombatEmbed, buildCombatButtons, buildSkillSelectMenu, simpleEmbed, COLORS } from '../utils/embeds';
import type { CombatEnemy } from '../utils/embeds';
import { withImage } from '../utils/eventImages';
import { getEnemyAtkBonus } from './world';
import { applyConsumableCombatBonuses, getBuff, consumeBuff } from './consumables';
import { incrementDaily, countsAsPotion } from '../commands/daily';


function normalMobPressure(enemy: any): { hp: number; atk: number; def: number } {
  // Boss/miniboss/shopkeeper keep their handcrafted stats. Normal mobs become scarier mainly by resource pressure.
  if (!enemy || enemy.boss || enemy.miniboss || enemy.isShopkeeper || !Array.isArray(enemy.zones)) {
    return { hp: 1, atk: 1, def: 1 };
  }
  const zone = enemy.zones[0] ?? 'forest';
  const base: Record<string, { hp: number; atk: number; def: number }> = {
    village: { hp: 1.03, atk: 1.15, def: 1.00 },
    forest:  { hp: 1.06, atk: 1.22, def: 1.04 },
    shrine:  { hp: 1.08, atk: 1.24, def: 1.06 },
    mines:   { hp: 1.10, atk: 1.26, def: 1.07 },
    wastes:  { hp: 1.12, atk: 1.28, def: 1.08 },
  };
  const m = base[zone] ?? { hp: 1.08, atk: 1.24, def: 1.05 };
  const levelBump = Math.min(0.08, Math.floor((enemy.level ?? 1) / 5) * 0.02);
  return { hp: m.hp + levelBump, atk: m.atk + levelBump, def: m.def };
}

function tuneNormalMobForCombat<T extends any>(enemy: T): T {
  const m = normalMobPressure(enemy);
  if (m.hp === 1 && m.atk === 1 && m.def === 1) return { ...(enemy as any) };
  return {
    ...(enemy as any),
    hp: Math.max(1, Math.floor((enemy as any).hp * m.hp)),
    atk: Math.max(1, Math.floor((enemy as any).atk * m.atk)),
    def: Math.max(0, Math.floor((enemy as any).def * m.def)),
    _normalMobTuned: true,
  };
}

function safeJsonParse<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try { return JSON.parse(raw) as T; } catch { return fallback; }
}

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

export function isCombatUsableItem(itemId: string): boolean {
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

function getAliveGroupTargets(state: any): Array<any & { _idx: number }> | null {
  if (!state?.enemies_json) return null;
  try {
    const enemies = JSON.parse(state.enemies_json);
    if (!Array.isArray(enemies)) return null;
    return enemies
      .map((e: any, i: number) => ({ ...e, _idx: i }))
      .filter((e: any) => e.hp > 0);
  } catch {
    return null;
  }
}

function skillNeedsTarget(state: any, skillId: string): boolean {
  const skill = getSkill(skillId);
  const aliveTargets = getAliveGroupTargets(state);
  return !!(skill?.type === 'active' && skill.damage && skill.targetType !== 'all' && skill.targetType !== 'self' && aliveTargets && aliveTargets.length > 1);
}

function buildSkillTargetRows(userId: string, state: any, skillId: string): any[] {
  const aliveTargets = getAliveGroupTargets(state) ?? [];
  const skill = getSkill(skillId);
  const { StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ActionRowBuilder: ARB } = require('discord.js');
  const opts = aliveTargets.map((e: any) => new StringSelectMenuOptionBuilder()
    .setLabel(`[${e._idx + 1}] ${e.name} — HP: ${e.hp}/${e.max_hp}`)
    .setValue(`skilltarget_${e._idx}`)
    .setEmoji(e.icon ?? '👹')
  );
  return [
    new ARB().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`rpg_skilltarget_${userId}_${skillId}`)
        .setPlaceholder(`🎯 Chọn mục tiêu cho ${skill?.name ?? 'skill'}...`)
        .addOptions(opts.slice(0, 25))
    ),
    makeBackRow(userId)
  ];
}

function parseTargetIndexFromSelect(compInt: StringSelectMenuInteraction): number {
  const raw = compInt.values[0] ?? '';
  const idx = parseInt(raw.replace('skilltarget_', '').replace(/^.*_/, ''), 10);
  return Number.isFinite(idx) ? idx : 0;
}

export function hasUsableItems(userId: string, guildId: string): boolean {
  return getInventory(userId, guildId).some((e: any) => {
    const it = getItem(e.item_id);
    return it?.type === 'consumable' && isCombatUsableItem(e.item_id);
  });
}

export function hasActiveCombatSkills(userId: string, guildId: string): boolean {
  return getLoadout(userId, guildId).some(entry => getSkill(entry.skill_id)?.type === 'active');
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

// ── Global combat interaction dispatcher ─────────────────────────────────────
// Called from the global interactionCreate handler for any rpg_* or shopmercy_* button.
// Returns true if the interaction was handled (even on error), false if no active registry entry.
export async function dispatchCombatInteraction(
  compInt: ButtonInteraction | StringSelectMenuInteraction,
  userId: string,
  guildId: string
): Promise<boolean> {
  const entry = getCombatEntry(userId, guildId);
  if (!entry) return false;
  if (entry.processing) return true;
  entry.processing = true;

  const cid = compInt.customId;

  try {
    const current = getCombatByUser(userId, guildId);
    if (!current) { unregisterCombat(userId, guildId); return false; }

    const fresh        = getPlayer(userId, guildId)!;
    const freshPassive = applyPassiveStats(fresh);
    const { enemy } = entry;
    // Derive current phase icon if boss has phases (phase transitions update active_effects)
    let icon = entry.icon;
    if (enemy?.phases?.length && current) {
      const rawFx: any[] = (() => { try { return JSON.parse(current.active_effects || '[]'); } catch { return []; } })();
      const phaseNum = rawFx.find((e: any) => e.name === 'boss_phase')?.value;
      const phaseData = phaseNum ? enemy.phases.find((p: any) => p.phaseIndex === phaseNum) : null;
      if (phaseData) icon = phaseData.icon;
    }

    // Shopkeeper mercy (startCombatFlowWithEnemy only)
    if (enemy?.isShopkeeper && cid.startsWith('shopmercy_') && typeof enemy.onMercy === 'function') {
      deleteCombat(current.message_id);
      unregisterCombat(userId, guildId);
      await enemy.onMercy(compInt, compInt, userId, guildId, fresh, enemy, current, cid);
      return true;
    }

    let result;

    if (cid === `rpg_attack_${userId}`) {
      const sg: any[] | null = current.enemies_json ? safeJsonParse<any[]>(current.enemies_json, []) : null;
      const alive = sg?.filter((e: any) => e.hp > 0) ?? null;
      if (alive && alive.length > 1) {
        const opts = sg!
          .map((e: any, i: number) => ({ ...e, _idx: i }))
          .filter((e: any) => e.hp > 0)
          .map((e: any) => new StringSelectMenuOptionBuilder()
            .setLabel(`[${e._idx + 1}] ${e.name} — HP: ${e.hp}/${e.max_hp}`)
            .setValue(`rpg_attackidx_${userId}_${e._idx}`)
          );
        await compInt.editReply({ components: [
          new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
            new StringSelectMenuBuilder().setCustomId(`rpg_atktarget_${userId}`).setPlaceholder('🎯 Chọn mục tiêu tấn công...').addOptions(opts.slice(0, 25))
          ),
          makeBackRow(userId)
        ]});
        return true;
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
      const inv  = getInventory(userId, guildId);
      const cons = inv.filter((e: any) => { const it = getItem(e.item_id); return it?.type === 'consumable' && e.quantity > 0 && isCombatUsableItem(e.item_id); });
      if (!cons.length) { await compInt.editReply({ content: '🎒 Không có đồ dùng được!' }); return true; }
      const opts = cons.map((e: any) => {
        const it = getItem(e.item_id)!;
        return new StringSelectMenuOptionBuilder()
          .setLabel(`${it.name} ×${e.quantity}`)
          .setDescription((it.description ?? '').replace(/\*\*/g, '').slice(0, 50))
          .setValue(`useitem_${e.item_id}`)
          .setEmoji(it.icon);
      });
      await compInt.editReply({ components: [
        new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(new StringSelectMenuBuilder().setCustomId(`rpg_itemsel_${userId}`).setPlaceholder('🎒 Chọn vật phẩm...').addOptions(opts.slice(0, 25))),
        makeBackRow(userId)
      ]});
      return true;
    }
    else if (cid === `rpg_itemsel_${userId}`) {
      const itemId = (compInt as any).values?.[0]?.replace('useitem_', '');
      if (!itemId) return true;
      result = processItemUse(current, itemId);
      if (result.itemConsumed && countsAsPotion(itemId)) incrementDaily(userId, guildId, 'potion_used');
    }
    else if (cid === `rpg_skill_${userId}`) {
      const updatedLoadout = getLoadout(userId, guildId);
      if (!updatedLoadout.length) return true;
      await compInt.editReply({ components: [buildSkillSelectMenu(userId, updatedLoadout, current.player_mp), makeBackRow(userId)] }).catch(() => {});
      return true;
    }
    else if (cid === `rpg_skillmenu_${userId}` && compInt.isStringSelectMenu()) {
      const skillId = (compInt as StringSelectMenuInteraction).values[0].replace(`rpg_useskill_${userId}_`, '');
      if (skillNeedsTarget(current, skillId)) {
        await compInt.editReply({ components: buildSkillTargetRows(userId, current, skillId) }).catch(() => {});
        return true;
      }
      result = processSkill(current, skillId, freshPassive.atk, 0, 0);
    }
    else if (cid.startsWith(`rpg_skilltarget_${userId}_`) && compInt.isStringSelectMenu()) {
      const skillId = cid.replace(`rpg_skilltarget_${userId}_`, '');
      const targetIdx = parseTargetIndexFromSelect(compInt as StringSelectMenuInteraction);
      result = processSkill(current, skillId, freshPassive.atk, 0, 0, targetIdx);
    }
    else if (cid === `rpg_back_${userId}`) {
      await compInt.editReply({
        embeds: [buildCombatEmbed(current, fresh.name, icon, safeJsonParse<string[]>(current.combat_log, []))],
        components: buildCombatButtons(userId, hasActiveCombatSkills(userId, guildId), current.player_stamina ?? 100, hasUsableItems(userId, guildId), current.active_effects)
      }).catch(() => {});
      return true;
    }
    else return true;

    if (!result) return true;

    if (result.fled) {
      deleteCombat(current.message_id);
      unregisterCombat(userId, guildId);
      if (entry.onFlee) {
        await entry.onFlee(compInt as any, compInt as any, userId, guildId, fresh, enemy, result.newState, result.logLines);
      } else {
        await compInt.editReply({ embeds: [simpleEmbed(COLORS.warning, '🏃 Bạn thoát khỏi trận chiến!')], components: [] }).catch(() => {});
      }
      return true;
    }

    applyShopkeeperStockUse(enemy, result);

    if (enemy?.isShopkeeper && !enemy.shopkeeperMercyOffered && !result.enemyDied && !result.playerDied && result.newState?.enemy_hp <= Math.floor(result.newState.enemy_max_hp * 0.2)) {
      enemy.shopkeeperMercyOffered = true;
      saveCombat(result.newState);
      const mercyRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId(`shopmercy_spare_${userId}`).setLabel('Tha mạng').setEmoji('🙏').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`shopmercy_kill_${userId}`).setLabel('Kết liễu').setEmoji('🗡️').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId(`shopmercy_take_${userId}`).setLabel('Ép giao nộp hàng').setEmoji('💰').setStyle(ButtonStyle.Primary)
      );
      await compInt.editReply({
        embeds: [buildCombatEmbed(result.newState, fresh.name, icon, [...(result.logLines ?? []), '🧎 **Shopkeeper quỳ xuống van xin.** "Tha cho ta... ta sẽ nhớ ân này."'])],
        components: [mercyRow]
      }).catch(() => {});
      return true;
    }

    if (result.enemyDied) {
      deleteCombat(current.message_id);
      unregisterCombat(userId, guildId);
      await entry.onVictory(compInt as any, compInt as any, userId, guildId, fresh, enemy, result.newState);
      return true;
    }

    if (result.playerDied) {
      if (tryCrackedSoulCharm(userId, guildId, result)) {
        saveCombat(result.newState);
        await compInt.editReply({
          embeds: [buildCombatEmbed(result.newState, fresh.name, icon, result.logLines)],
          components: buildCombatButtons(userId, hasActiveCombatSkills(userId, guildId), result.newState.player_stamina ?? 100, hasUsableItems(userId, guildId), result.newState.active_effects)
        }).catch(() => {});
        return true;
      }
      deleteCombat(current.message_id);
      unregisterCombat(userId, guildId);
      await entry.onDeath(compInt as any, compInt as any, userId, guildId, fresh, enemy);
      return true;
    }

    saveCombat(result.newState);
    await compInt.editReply({
      embeds: [buildCombatEmbed(result.newState, fresh.name, icon, result.logLines)],
      components: buildCombatButtons(userId, hasActiveCombatSkills(userId, guildId), result.newState.player_stamina ?? 100, hasUsableItems(userId, guildId), result.newState.active_effects)
    }).catch(() => {});

    return true;
  } catch (err) {
    console.error('[COMBAT] dispatchCombatInteraction error:', err);
    return true;
  } finally {
    entry.processing = false;
  }
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
  let enemy: any    = getEnemy(enemyId);
  if (!enemy) {
    await interaction.editReply({ embeds: [simpleEmbed(COLORS.danger, `❌ Enemy data lỗi: \`${enemyId}\` không tồn tại.`)], components: [] });
    return;
  }
  enemy = tuneNormalMobForCombat(enemy);
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
      ...(buffedStart.logs.some(l => l.includes('Rage Elixir')) ? [{ name: 'incoming_damage_up', duration: 999, value: 15 }] : []),
      ...(enemy.boss ? [{ name: 'flee_penalty', duration: 999, value: 25 }] : enemy.miniboss ? [{ name: 'flee_penalty', duration: 999, value: 15 }] : [])
    ]),
    combat_log: JSON.stringify(openingLogs),
    player_stamina: 100, player_max_stamina: 100
  };

  const combatEmbed = buildCombatEmbed(initState, player.name, enemy.icon, openingLogs);
  const inventory0  = getInventory(userId, guildId);
  const hasItems0   = inventory0.some(e => { const it = getItem(e.item_id); return it?.type === "consumable" && isCombatUsableItem(e.item_id); });
  const buttons     = buildCombatButtons(userId, loadout.some(entry => getSkill(entry.skill_id)?.type === 'active'), 100, hasItems0, initState.active_effects);
  const imgKey      = enemy.boss ? 'boss' : 'combat';
  const { files: combatFiles, embed: combatEmbedWithImg } = withImage(combatEmbed, imgKey);
  const reply       = await interaction.editReply({ embeds: [combatEmbedWithImg], files: combatFiles, components: buttons });

  const state = { ...initState, message_id: reply.id };
  saveCombat(state);

  registerCombat(userId, guildId, { onVictory, onDeath, onFlee, enemy, icon: enemy.icon });
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
  // Clone enemy trước khi gắn bonus/buff để không sửa object gốc trong data runtime.
  enemy = {
    ...enemy,
    drops: Array.isArray(enemy?.drops) ? [...enemy.drops] : enemy?.drops,
    specialAttacks: Array.isArray(enemy?.specialAttacks) ? [...enemy.specialAttacks] : enemy?.specialAttacks,
  };
  enemy = tuneNormalMobForCombat(enemy);
  if (bonus) enemy.combatBonus = bonus;
  if (enemy.id && !getEnemy(enemy.id)) {
    // register inline definition into the map for the duration of combat
    const { ENEMIES } = await import('../data/enemies');
    if (enemy.id && !ENEMIES[enemy.id]) ENEMIES[enemy.id] = enemy;
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
      ...(buffedStart.logs.some(l => l.includes('Rage Elixir')) ? [{ name: 'incoming_damage_up', duration: 999, value: 15 }] : []),
      ...(enemy.boss ? [{ name: 'flee_penalty', duration: 999, value: 25 }] : enemy.miniboss ? [{ name: 'flee_penalty', duration: 999, value: 15 }] : [])
    ]), combat_log: JSON.stringify(openingLogs),
    player_stamina: 100, player_max_stamina: 100
  };
  const combatEmbed2 = buildCombatEmbed(initState, player.name, enemy.icon, openingLogs);
  const inventory0   = getInventory(userId, guildId);
  const hasItems0    = inventory0.some((e: any) => { const it = getItem(e.item_id); return it?.type === 'consumable' && isCombatUsableItem(e.item_id); });
  const buttons      = buildCombatButtons(userId, loadout.some(entry => getSkill(entry.skill_id)?.type === 'active'), 100, hasItems0, initState.active_effects);
  const reply        = await interaction.editReply({ embeds: [combatEmbed2], components: buttons });

  const state = { ...initState, message_id: reply.id };
  saveCombat(state);

  registerCombat(userId, guildId, { onVictory: onVictory!, onDeath: onDeath!, onFlee, enemy, icon: enemy.icon });
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
  const tunedEnemies = rawEnemies.map(e => tuneNormalMobForCombat(e));
  const combatEnemies: CombatEnemy[] = tunedEnemies.map(e => ({
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
  const buttons     = buildCombatButtons(userId, loadout.some(entry => getSkill(entry.skill_id)?.type === 'active'), 100, hasItems0, initState.active_effects);
  const { files: combatFiles, embed: combatEmbedWithImg } = withImage(combatEmbed, 'combat');
  const reply       = await interaction.editReply({ embeds: [combatEmbedWithImg], files: combatFiles, components: buttons });

  const state = { ...initState, message_id: reply.id };
  saveCombat(state);

  registerCombat(userId, guildId, { onVictory, onDeath, onFlee, enemy: groupEnemy, icon: '⚔️' });
}
