"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.startCombatFlow = startCombatFlow;
exports.startCombatFlowWithEnemy = startCombatFlowWithEnemy;
const player_1 = require("./player");
const combat_1 = require("./combat");
const enemies_1 = require("../data/enemies");
const embeds_1 = require("../utils/embeds");
const eventImages_1 = require("../utils/eventImages");
const world_1 = require("./world");
async function startCombatFlow(interaction, userId, guildId, enemyId, onVictory, onDeath) {
    const player = (0, player_1.getPlayer)(userId, guildId);
    const enemy = (0, enemies_1.getEnemy)(enemyId);
    const loadout = (0, player_1.getLoadout)(userId, guildId);
    const withPassive = (0, player_1.applyPassiveStats)(player);
    const atkBonus = (0, world_1.getEnemyAtkBonus)(guildId);
    const adjustedAtk = enemy.atk + Math.floor(enemy.atk * atkBonus / 100);
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
    const combatEmbed = (0, embeds_1.buildCombatEmbed)(initState, player.name, enemy.icon, [log0]);
    const buttons = (0, embeds_1.buildCombatButtons)(userId, loadout.length > 0);
    const imgKey = enemy.boss ? 'boss' : 'combat';
    const { files: combatFiles, embed: combatEmbedWithImg } = (0, eventImages_1.withImage)(combatEmbed, imgKey);
    const reply = await interaction.editReply({ embeds: [combatEmbedWithImg], files: combatFiles, components: [buttons] });
    const state = { ...initState, message_id: reply.id };
    (0, combat_1.saveCombat)(state);
    const collector = reply.createMessageComponentCollector({
        filter: i => i.user.id === userId,
        time: 300_000
    });
    collector.on('collect', async (compInt) => {
        await compInt.deferUpdate();
        const current = (0, combat_1.getCombatByUser)(userId, guildId);
        if (!current) {
            collector.stop();
            return;
        }
        const fresh = (0, player_1.getPlayer)(userId, guildId);
        const freshPassive = (0, player_1.applyPassiveStats)(fresh);
        const cid = compInt.customId;
        let result;
        if (cid === `rpg_attack_${userId}`)
            result = (0, combat_1.processAttack)(current, freshPassive.atk);
        else if (cid === `rpg_defend_${userId}`)
            result = (0, combat_1.processDefend)(current, freshPassive.atk, 0, 0);
        else if (cid === `rpg_flee_${userId}`)
            result = (0, combat_1.processFlee)(current);
        else if (cid === `rpg_skill_${userId}`) {
            if (!loadout.length)
                return;
            await compInt.editReply({ components: [(0, embeds_1.buildSkillSelectMenu)(userId, loadout, current.player_mp)] });
            return;
        }
        else if (cid.startsWith(`rpg_useskill_${userId}_`)) {
            const skillId = cid.replace(`rpg_useskill_${userId}_`, '');
            result = (0, combat_1.processSkill)(current, skillId, freshPassive.atk, 0, 0);
        }
        else
            return;
        if (!result)
            return;
        if (result.fled) {
            (0, combat_1.deleteCombat)(current.message_id);
            collector.stop();
            await compInt.editReply({ embeds: [(0, embeds_1.simpleEmbed)(embeds_1.COLORS.warning, '🏃 Bạn thoát khỏi trận chiến!')], components: [] });
            return;
        }
        if (result.enemyDied) {
            (0, combat_1.deleteCombat)(current.message_id);
            collector.stop();
            if (onVictory)
                await onVictory(interaction, compInt, userId, guildId, fresh, enemy, result.newState);
            return;
        }
        if (result.playerDied) {
            (0, combat_1.deleteCombat)(current.message_id);
            collector.stop();
            if (onDeath)
                await onDeath(interaction, compInt, userId, guildId, fresh, enemy);
            return;
        }
        (0, combat_1.saveCombat)(result.newState);
        const updatedLoadout = (0, player_1.getLoadout)(userId, guildId);
        await compInt.editReply({
            embeds: [(0, embeds_1.buildCombatEmbed)(result.newState, fresh.name, enemy.icon, result.logLines)],
            components: [(0, embeds_1.buildCombatButtons)(userId, updatedLoadout.length > 0)]
        });
    });
    collector.on('end', (_c, reason) => {
        const cur = (0, combat_1.getCombatByUser)(userId, guildId);
        if (cur)
            (0, combat_1.deleteCombat)(cur.message_id);
        if (reason === 'time') {
            interaction.editReply({ embeds: [(0, embeds_1.simpleEmbed)(embeds_1.COLORS.warning, '⏰ Trận chiến timeout.')], components: [] }).catch(() => { });
        }
    });
}
async function startCombatFlowWithEnemy(interaction, userId, guildId, enemy, bonus, onVictory, onDeath) {
    if (enemy.id && !(0, enemies_1.getEnemy)(enemy.id)) {
        // register inline definition into the map for the duration of combat
        const { ENEMIES } = await Promise.resolve().then(() => __importStar(require('../data/enemies')));
        if (enemy.id && !ENEMIES[enemy.id])
            ENEMIES[enemy.id] = enemy;
    }
    if (bonus) {
        enemy.combatBonus = bonus;
    }
    const player = (0, player_1.getPlayer)(userId, guildId);
    const loadout = (0, player_1.getLoadout)(userId, guildId);
    const withPassive = (0, player_1.applyPassiveStats)(player);
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
    const combatEmbed = (0, embeds_1.buildCombatEmbed)(initState, player.name, enemy.icon, [log0]);
    const buttons = (0, embeds_1.buildCombatButtons)(userId, loadout.length > 0);
    const reply = await interaction.editReply({ embeds: [combatEmbed], components: [buttons] });
    const state = { ...initState, message_id: reply.id };
    (0, combat_1.saveCombat)(state);
    const collector = reply.createMessageComponentCollector({ filter: i => i.user.id === userId, time: 300_000 });
    collector.on('collect', async (compInt) => {
        await compInt.deferUpdate();
        const current = (0, combat_1.getCombatByUser)(userId, guildId);
        if (!current) {
            collector.stop();
            return;
        }
        const fresh = (0, player_1.getPlayer)(userId, guildId);
        const freshPassive = (0, player_1.applyPassiveStats)(fresh);
        const cid = compInt.customId;
        let result;
        if (cid === `rpg_attack_${userId}`)
            result = (0, combat_1.processAttack)(current, freshPassive.atk);
        else if (cid === `rpg_defend_${userId}`)
            result = (0, combat_1.processDefend)(current, freshPassive.atk, 0, 0);
        else if (cid === `rpg_flee_${userId}`)
            result = (0, combat_1.processFlee)(current);
        else if (cid === `rpg_skill_${userId}`) {
            if (!loadout.length)
                return;
            await compInt.editReply({ components: [(0, embeds_1.buildSkillSelectMenu)(userId, loadout, current.player_mp)] });
            return;
        }
        else if (cid.startsWith(`rpg_useskill_${userId}_`)) {
            result = (0, combat_1.processSkill)(current, cid.replace(`rpg_useskill_${userId}_`, ''), freshPassive.atk, 0, 0);
        }
        else
            return;
        if (!result)
            return;
        if (result.fled) {
            (0, combat_1.deleteCombat)(current.message_id);
            collector.stop();
            await compInt.editReply({ embeds: [(0, embeds_1.simpleEmbed)(embeds_1.COLORS.warning, '🏃 Bạn thoát khỏi trận chiến!')], components: [] });
            return;
        }
        if (result.enemyDied) {
            (0, combat_1.deleteCombat)(current.message_id);
            collector.stop();
            if (onVictory)
                await onVictory(interaction, compInt, userId, guildId, fresh, enemy, result.newState);
            return;
        }
        if (result.playerDied) {
            (0, combat_1.deleteCombat)(current.message_id);
            collector.stop();
            if (onDeath)
                await onDeath(interaction, compInt, userId, guildId, fresh, enemy);
            return;
        }
        (0, combat_1.saveCombat)(result.newState);
        await compInt.editReply({
            embeds: [(0, embeds_1.buildCombatEmbed)(result.newState, fresh.name, enemy.icon, result.logLines)],
            components: [(0, embeds_1.buildCombatButtons)(userId, (0, player_1.getLoadout)(userId, guildId).length > 0)]
        });
    });
    collector.on('end', (_c, reason) => {
        const cur = (0, combat_1.getCombatByUser)(userId, guildId);
        if (cur)
            (0, combat_1.deleteCombat)(cur.message_id);
        if (reason === 'time') {
            interaction.editReply({ embeds: [(0, embeds_1.simpleEmbed)(embeds_1.COLORS.warning, '⏰ Trận chiến timeout.')], components: [] }).catch(() => { });
        }
    });
}
