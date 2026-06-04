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
exports.data = void 0;
exports.execute = execute;
const discord_js_1 = require("discord.js");
const player_1 = require("../systems/player");
const combat_1 = require("../systems/combat");
const combatFlow_1 = require("../systems/combatFlow");
const economy_1 = require("../systems/economy");
const rewards_1 = require("../systems/rewards");
const world_1 = require("../systems/world");
const achievements_1 = require("../systems/achievements");
const legacy_1 = require("../systems/legacy");
const embeds_1 = require("../utils/embeds");
const zones_1 = require("../data/zones");
const enemies_1 = require("../data/enemies");
const items_1 = require("../data/items");
const skills_1 = require("../data/skills");
const format_1 = require("../utils/format");
const eventImages_1 = require("../utils/eventImages");
exports.data = new discord_js_1.SlashCommandBuilder()
    .setName('explore')
    .setDescription('Khám phá khu vực hiện tại');
// ─────────────────────────────────────────────────────────────────────────────
async function execute(interaction) {
    await interaction.deferReply();
    const { id: userId } = interaction.user;
    const guildId = interaction.guildId;
    const player = (0, player_1.getPlayer)(userId, guildId);
    if (!player) {
        await interaction.editReply({ embeds: [simpleEmbed(embeds_1.COLORS.warning, 'Bạn chưa có nhân vật! Dùng `/start`.')] });
        return;
    }
    if (!player.alive) {
        await interaction.editReply({ embeds: [simpleEmbed(embeds_1.COLORS.danger, '☠️ Nhân vật đã chết. Dùng `/start` để hồi sinh!')] });
        return;
    }
    await clearStaleCombat(interaction, userId, guildId);
    const currentCombat = (0, combat_1.getCombatByUser)(userId, guildId);
    if (currentCombat) {
        await resumeCombat(interaction, currentCombat);
        return;
    }
    if (!(0, economy_1.canExplore)(player)) {
        const remaining = (0, economy_1.exploreCooldownRemaining)(player);
        await interaction.editReply({ embeds: [simpleEmbed(embeds_1.COLORS.warning, `⏳ Hãy chờ ${remaining} giây trước khi khám phá lại.`)] });
        return;
    }
    await showExploreMenu(interaction, userId, guildId);
}
async function clearStaleCombat(interaction, userId, guildId) {
    const current = (0, combat_1.getCombatByUser)(userId, guildId);
    if (!current)
        return;
    try {
        const channel = await interaction.client.channels.fetch(current.channel_id);
        if (!channel || !('messages' in channel))
            throw new Error('Invalid combat channel');
        await channel.messages.fetch(current.message_id);
    }
    catch {
        (0, combat_1.deleteCombat)(current.message_id);
    }
}
function buildContinueExploreRow(userId) {
    return [new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder()
            .setCustomId(`continue_explore_${userId}`)
            .setLabel('Tiếp tục khám phá')
            .setStyle(discord_js_1.ButtonStyle.Primary))];
}
async function attachContinueExploreHandler(message, interaction, userId, guildId) {
    const collector = message.createMessageComponentCollector({
        filter: i => i.user.id === userId,
        time: 120_000
    });
    collector.on('collect', async (i) => {
        if (i.customId !== `continue_explore_${userId}`)
            return;
        await i.deferUpdate();
        collector.stop('continue');
        await showExploreMenu(interaction, userId, guildId);
    });
    collector.on('end', (_c, reason) => {
        if (reason === 'time')
            message.edit({ components: [] }).catch(() => { });
    });
}
async function resumeCombat(interaction, current) {
    const link = `https://discord.com/channels/${current.guild_id}/${current.channel_id}/${current.message_id}`;
    const row = new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder()
        .setLabel('Quay lại trận chiến')
        .setStyle(discord_js_1.ButtonStyle.Link)
        .setURL(link));
    await interaction.editReply({
        embeds: [new discord_js_1.EmbedBuilder()
                .setColor(embeds_1.COLORS.info)
                .setTitle('⚔️ Trận chiến đang chờ bạn')
                .setDescription('Bạn đang ở giữa trận đấu. Nhấn nút dưới đây để đi tới màn hình combat hiện tại.')
        ],
        components: [row]
    });
}
// ── Main explore menu ─────────────────────────────────────────────────────────
async function showExploreMenu(interaction, userId, guildId) {
    const player = (0, player_1.getPlayer)(userId, guildId);
    const zone = (0, zones_1.getZone)(player.zone_id);
    const bossId = zone.bossId;
    const bossSlain = bossId ? (0, world_1.isBossSlain)(guildId, bossId) : true;
    const legacyCount = (0, legacy_1.getLegaciesInZone)(guildId, player.zone_id).length;
    const embed = new discord_js_1.EmbedBuilder()
        .setColor(zone.color)
        .setTitle(`${zone.icon} ${zone.name}`)
        .setDescription(`*${(0, format_1.pick)(zone.ambiance)}*`)
        .addFields({ name: '👤', value: `**${player.name}** Lv.${player.level}`, inline: true }, { name: '❤️ HP', value: `${player.hp}/${player.max_hp}`, inline: true }, { name: '💧 MP', value: `${player.mp}/${player.max_mp}`, inline: true }, { name: '👻 Di sản', value: `${legacyCount} tại đây`, inline: true }, { name: '👑 Boss', value: bossSlain ? '✅ Đã hạ' : '⚠️ Còn sống', inline: true }, { name: '🪙 Gold', value: `${player.gold}`, inline: true });
    const rows = buildExploreRows(userId, zone.safe, !bossSlain, bossId, player.level, zone.minLevel);
    const { embed: zoneEmbed, files: zoneFiles } = (0, eventImages_1.withImage)(embed, `zone_${player.zone_id}`);
    const reply = await interaction.editReply({ embeds: [zoneEmbed], files: zoneFiles, components: rows });
    const collector = reply.createMessageComponentCollector({
        filter: i => i.user.id === userId,
        time: 90_000
    });
    collector.on('collect', async (i) => {
        await i.deferUpdate();
        collector.stop('action');
        const cid = i.customId;
        if (cid === `ex_search_${userId}`)
            await handleSearch(interaction, userId, guildId);
        else if (cid === `ex_boss_${userId}`)
            await handleBoss(interaction, userId, guildId);
        else if (cid === `ex_rest_${userId}`)
            await handleRest(interaction, userId, guildId);
        else if (cid === `ex_zone_${userId}`)
            await handleZonePicker(interaction, userId, guildId);
        else if (cid.startsWith(`ex_travel_${userId}_`)) {
            const zoneId = cid.replace(`ex_travel_${userId}_`, '');
            await handleTravel(interaction, userId, guildId, zoneId);
        }
    });
    collector.on('end', (_c, reason) => {
        if (reason === 'time')
            interaction.editReply({ components: [] }).catch(() => { });
    });
}
function buildExploreRows(userId, isSafe, hasBoss, bossId, playerLevel, zoneMinLevel) {
    const row1 = new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder().setCustomId(`ex_search_${userId}`)
        .setLabel('Khám phá').setEmoji('🗺️').setStyle(discord_js_1.ButtonStyle.Primary).setDisabled(isSafe), new discord_js_1.ButtonBuilder().setCustomId(`ex_boss_${userId}`)
        .setLabel('Thách Boss').setEmoji('👑').setStyle(discord_js_1.ButtonStyle.Danger)
        .setDisabled(isSafe || !hasBoss || playerLevel < zoneMinLevel + 2), new discord_js_1.ButtonBuilder().setCustomId(`ex_rest_${userId}`)
        .setLabel('Nghỉ ngơi').setEmoji('💤').setStyle(discord_js_1.ButtonStyle.Secondary), new discord_js_1.ButtonBuilder().setCustomId(`ex_zone_${userId}`)
        .setLabel('Zone').setEmoji('🗺️').setStyle(discord_js_1.ButtonStyle.Secondary));
    return [row1];
}
// ── Zone picker ───────────────────────────────────────────────────────────────
async function handleZonePicker(interaction, userId, guildId) {
    const player = (0, player_1.getPlayer)(userId, guildId);
    const options = Object.values(zones_1.ZONES).map(z => {
        const locked = player.level < z.minLevel;
        const current = z.id === player.zone_id;
        return new discord_js_1.StringSelectMenuOptionBuilder()
            .setLabel(`${z.icon} ${z.name}`)
            .setDescription(locked ? `🔒 Cần Lv.${z.minLevel}` : current ? '📍 Đang ở đây' : z.travelCost > 0 ? `Chi phí: ${z.travelCost} 🪙` : 'Miễn phí')
            .setValue(`ex_travel_${userId}_${z.id}`)
            .setDefault(current);
    });
    const row = new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.StringSelectMenuBuilder()
        .setCustomId(`ex_zonemenu_${userId}`)
        .setPlaceholder('Chọn khu vực muốn đến...')
        .addOptions(options));
    const reply = await interaction.editReply({
        embeds: [new discord_js_1.EmbedBuilder().setColor(embeds_1.COLORS.info).setTitle('🗺️ Di chuyển đến đâu?')],
        components: [row]
    });
    const sel = await reply.awaitMessageComponent({
        componentType: discord_js_1.ComponentType.StringSelect,
        filter: i => i.user.id === userId,
        time: 30_000
    }).catch(() => null);
    if (!sel) {
        await interaction.editReply({ components: [] });
        return;
    }
    await sel.deferUpdate();
    const zoneId = sel.values[0].replace(`ex_travel_${userId}_`, '');
    await handleTravel(interaction, userId, guildId, zoneId);
}
async function handleTravel(interaction, userId, guildId, targetId) {
    const player = (0, player_1.getPlayer)(userId, guildId);
    const target = zones_1.ZONES[targetId];
    if (!target)
        return;
    if (targetId === player.zone_id) {
        await interaction.editReply({ embeds: [simpleEmbed(embeds_1.COLORS.info, `Bạn đang ở **${target.icon} ${target.name}** rồi!`)], components: [] });
        return;
    }
    if (player.level < target.minLevel) {
        await interaction.editReply({ embeds: [simpleEmbed(embeds_1.COLORS.warning, `Cần **Lv.${target.minLevel}** để vào **${target.name}**! (Bạn: Lv.${player.level})`)], components: [] });
        return;
    }
    if (target.travelCost > 0 && player.gold < target.travelCost) {
        await interaction.editReply({ embeds: [simpleEmbed(embeds_1.COLORS.warning, `Cần **${target.travelCost} 🪙** để đến **${target.name}**! (Bạn có: ${player.gold} 🪙)`)], components: [] });
        return;
    }
    if (target.travelCost > 0)
        (0, player_1.spendGold)(userId, guildId, target.travelCost);
    (0, player_1.setZone)(userId, guildId, targetId);
    await interaction.editReply({
        embeds: [
            new discord_js_1.EmbedBuilder().setColor(target.color)
                .setTitle(`${target.icon} Đã đến ${target.name}`)
                .setDescription(`*${target.description}*`)
                .addFields(target.travelCost > 0 ? [{ name: '💸 Chi phí', value: `−${target.travelCost} 🪙`, inline: true }] : [])
        ],
        components: []
    });
}
// ── Rest ──────────────────────────────────────────────────────────────────────
async function handleRest(interaction, userId, guildId) {
    const player = (0, player_1.getPlayer)(userId, guildId);
    const cost = player.zone_id === 'village' ? 0 : 15;
    if (cost > 0 && player.gold < cost) {
        await interaction.editReply({ embeds: [simpleEmbed(embeds_1.COLORS.warning, `💤 Cần **${cost} 🪙** để nghỉ ngơi. Không đủ tiền!`)], components: [] });
        return;
    }
    if (cost > 0)
        (0, player_1.spendGold)(userId, guildId, cost);
    const hpGain = Math.floor(player.max_hp * 0.3);
    const mpGain = Math.floor(player.max_mp * 0.3);
    const newHp = Math.min(player.max_hp, player.hp + hpGain);
    const newMp = Math.min(player.max_mp, player.mp + mpGain);
    (0, player_1.updatePlayerHpMp)(userId, guildId, newHp, newMp);
    const { embed: restEmbed, files: restFiles } = (0, eventImages_1.withImage)(new discord_js_1.EmbedBuilder().setColor(embeds_1.COLORS.success).setTitle('💤 Nghỉ ngơi')
        .setDescription(`Bạn nghỉ ngơi${cost > 0 ? ` (−${cost} 🪙)` : ''} và phục hồi:\n` +
        `❤️ +**${hpGain} HP** → ${newHp}/${player.max_hp}\n` +
        `💧 +**${mpGain} MP** → ${newMp}/${player.max_mp}`), 'rest');
    await interaction.editReply({ embeds: [restEmbed], files: restFiles, components: [] });
}
// ── Search: random event ───────────────────────────────────────────────────────
async function handleSearch(interaction, userId, guildId) {
    const player = (0, player_1.getPlayer)(userId, guildId);
    const zone = (0, zones_1.getZone)(player.zone_id);
    const enemies = (0, enemies_1.getEnemiesForZone)(player.zone_id);
    const legacies = (0, legacy_1.getLegaciesInZone)(guildId, player.zone_id, 5);
    const hasCombat = enemies.length > 0;
    const hasLegacy = legacies.length > 0;
    const table = [
        ['combat', hasCombat ? 25 : 0],
        ['ambush', hasCombat ? 10 : 0],
        ['legacy', hasLegacy ? 10 : 0],
        ['merchant', 8],
        ['spring', 8],
        ['trap', 8],
        ['altar', 8],
        ['mysterious', 7],
        ['villager', 7],
        ['caravan', 5],
        ['loot', 4],
    ];
    const extra = [
        ['wounded_traveler', 4],
        ['cursed_chest', 4],
        ['lake', 4],
        ['wounded_monster', 3],
        ['elite', 3],
        ['rival', 3],
        ['village_attack', 3],
        ['blood_altar', 2],
        ['spirit', 3],
        ['wheel', 2],
        ['library', 2],
        ['dream', 2],
        ['slime', 2],
        ['stumble', 2],
        ['bard', 2]
    ];
    // Weighted random pick (include extra events)
    const combined = [...table].concat(extra);
    const total = combined.reduce((s, [, w]) => s + w, 0);
    let roll = (0, format_1.randInt)(1, total || 1);
    let eventName = 'nothing';
    for (const [name, weight] of combined) {
        if (weight <= 0)
            continue;
        roll -= weight;
        if (roll <= 0) {
            eventName = name;
            break;
        }
    }
    (0, economy_1.setExploreCooldown)(userId, guildId);
    switch (eventName) {
        case 'combat': return (0, combatFlow_1.startCombatFlow)(interaction, userId, guildId, (0, format_1.pick)(enemies).id, handleVictory, handleDeath);
        case 'ambush': return showAmbush(interaction, userId, guildId, (0, format_1.pick)(enemies).id);
        case 'legacy': return showLegacyFind(interaction, userId, guildId, legacies);
        case 'merchant': return showMerchant(interaction, userId, guildId);
        case 'spring': return showHealingSpring(interaction, userId, guildId);
        case 'trap': return showTrap(interaction, userId, guildId);
        case 'altar': return showAncientAltar(interaction, userId, guildId);
        case 'mysterious': return showMysteriousFigure(interaction, userId, guildId);
        case 'villager': return showVillagerRescue(interaction, userId, guildId, enemies);
        case 'caravan': return showCaravanRobbery(interaction, userId, guildId, enemies);
        case 'loot': return showLootFind(interaction, userId, guildId);
        // Extra events
        case 'wounded_traveler': return showWoundedTraveler(interaction, userId, guildId);
        case 'cursed_chest': return showCursedChest(interaction, userId, guildId);
        case 'lake': return showReflectiveLake(interaction, userId, guildId);
        case 'wounded_monster': return showWoundedMonster(interaction, userId, guildId);
        case 'elite': return showEliteEncounter(interaction, userId, guildId);
        case 'rival': return showRivalAdventurer(interaction, userId, guildId);
        case 'village_attack': return showVillageUnderAttack(interaction, userId, guildId);
        case 'blood_altar': return showBloodAltar(interaction, userId, guildId);
        case 'spirit': return showPlayerSpirit(interaction, userId, guildId);
        case 'wheel': return showWheelOfFate(interaction, userId, guildId);
        case 'library': return showAncientLibrary(interaction, userId, guildId);
        case 'dream': return showDreamEvent(interaction, userId, guildId);
        case 'slime': return showSlimeFollower(interaction, userId, guildId);
        case 'stumble': return showStumbleRock(interaction, userId, guildId);
        case 'bard': return showBardSinger(interaction, userId, guildId);
        default:
            await interaction.editReply({
                embeds: [new discord_js_1.EmbedBuilder().setColor(zone.color).setDescription(`*${(0, format_1.pick)(zone.ambiance)}*\n\nKhông có gì bất thường...`)],
                components: []
            });
    }
}
// ── Boss ───────────────────────────────────────────────────────────────────────
async function handleBoss(interaction, userId, guildId) {
    const player = (0, player_1.getPlayer)(userId, guildId);
    const zone = (0, zones_1.getZone)(player.zone_id);
    if (!zone.bossId)
        return;
    (0, economy_1.setExploreCooldown)(userId, guildId);
    await (0, combatFlow_1.startCombatFlow)(interaction, userId, guildId, zone.bossId, handleVictory, handleDeath);
}
// ── Legacy find ───────────────────────────────────────────────────────────────
async function showLegacyFind(interaction, userId, guildId, legacies) {
    const legacy = (0, format_1.pick)(legacies);
    const skill = legacy.legacy_skill_id ? (0, skills_1.getSkill)(legacy.legacy_skill_id) : null;
    const zone = (0, zones_1.getZone)(legacy.zone_id);
    const desc = [
        `Bạn phát hiện dấu vết của **${legacy.player_name}**...`,
        `*(Đây là lần chết thứ ${legacy.deaths} của họ)*\n`,
        skill ? `🔮 Kỹ năng để lại: **${skill.icon} ${skill.name}**` : '',
        legacy.gold_left > 0 ? `🪙 Gold để lại: **${legacy.gold_left}**` : '',
    ].filter(Boolean).join('\n');
    const embed = new discord_js_1.EmbedBuilder()
        .setColor(embeds_1.COLORS.purple)
        .setTitle('👻 Phát Hiện Di Sản!')
        .setDescription(desc);
    const row = new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder().setCustomId(`leg_take_${userId}`).setLabel('Nhặt lên').setEmoji('👻').setStyle(discord_js_1.ButtonStyle.Primary), new discord_js_1.ButtonBuilder().setCustomId(`leg_skip_${userId}`).setLabel('Bỏ qua').setEmoji('🚶').setStyle(discord_js_1.ButtonStyle.Secondary));
    const { embed: legacyEmbed, files: legacyFiles } = (0, eventImages_1.withImage)(embed, 'legacy');
    const reply = await interaction.editReply({ embeds: [legacyEmbed], files: legacyFiles, components: [row] });
    const btn = await reply.awaitMessageComponent({
        componentType: discord_js_1.ComponentType.Button,
        filter: i => i.user.id === userId,
        time: 30_000
    }).catch(() => null);
    if (!btn || btn.customId === `leg_skip_${userId}`) {
        await (btn?.deferUpdate() ?? Promise.resolve());
        await interaction.editReply({
            embeds: [new discord_js_1.EmbedBuilder().setColor(embeds_1.COLORS.info).setDescription('🚶 Bạn bước qua, để lại di sản cho người khác...')],
            components: []
        });
        return;
    }
    await btn.deferUpdate();
    const player = (0, player_1.getPlayer)(userId, guildId);
    const results = [];
    // Grant skill
    if (skill) {
        const { hasSkillInPool, addSkillToPool } = await Promise.resolve().then(() => __importStar(require('../systems/player')));
        if (hasSkillInPool(userId, guildId, legacy.legacy_skill_id)) {
            results.push(`🔮 **${skill.icon} ${skill.name}** — Bạn đã biết kỹ năng này rồi.`);
        }
        else {
            addSkillToPool(userId, guildId, legacy.legacy_skill_id);
            results.push(`🔮 **${skill.icon} ${skill.name}** thêm vào Skill Pool!`);
        }
    }
    // Grant gold
    if (legacy.gold_left > 0) {
        (0, player_1.grantGold)(userId, guildId, legacy.gold_left);
        results.push(`🪙 +**${legacy.gold_left}** Gold từ di sản.`);
    }
    (0, legacy_1.claimLegacy)(legacy.id, userId);
    (0, world_1.logEvent)(guildId, userId, player.name, 'legacy', `đã nhận Di Sản của **${legacy.player_name}**.`, player.zone_id);
    await interaction.editReply({
        embeds: [
            new discord_js_1.EmbedBuilder().setColor(embeds_1.COLORS.purple)
                .setTitle('✨ Đã Nhận Di Sản')
                .setDescription(`Linh hồn **${legacy.player_name}** trao lại ký ức...\n\n` +
                (results.join('\n') || '*Không có gì...*'))
        ],
        components: []
    });
}
// ── Loot find ─────────────────────────────────────────────────────────────────
async function showLootFind(interaction, userId, guildId) {
    const lootTable = ['health_potion', 'mana_potion', 'herb', 'antidote'];
    const itemId = (0, format_1.pick)(lootTable);
    const item = (0, items_1.getItem)(itemId);
    (0, player_1.addItem)(userId, guildId, itemId, 1);
    await interaction.editReply({
        embeds: [
            new discord_js_1.EmbedBuilder().setColor(embeds_1.COLORS.gold)
                .setTitle('📦 Tìm thấy vật phẩm!')
                .setDescription(`Bạn nhặt được **${item.icon} ${item.name}** ẩn trong bụi rậm!`)
        ],
        components: []
    });
}
// ── Merchant encounter ────────────────────────────────────────────────────────
async function showMerchant(interaction, userId, guildId) {
    const player = (0, player_1.getPlayer)(userId, guildId);
    const zone = (0, zones_1.getZone)(player.zone_id);
    const { getShopDiscount } = await Promise.resolve().then(() => __importStar(require('../systems/world')));
    const discount = getShopDiscount(guildId);
    await renderMerchantBuy(interaction, userId, guildId, zone.id, discount, player.gold);
}
async function renderMerchantBuy(interaction, userId, guildId, zoneId, discount, playerGold) {
    const zone = (0, zones_1.getZone)(zoneId);
    const { getShopDiscount } = await Promise.resolve().then(() => __importStar(require('../systems/world')));
    const shopItems = zone.shopItems
        .map(id => (0, items_1.getItem)(id))
        .filter(Boolean);
    const itemLines = shopItems.map(item => {
        if (!item.buyPrice)
            return '';
        const price = Math.floor(item.buyPrice * (1 - discount / 100));
        return `${item.icon} **${item.name}** — **${price}** 🪙  \`${item.id}\``;
    }).filter(Boolean).join('\n');
    const discountNote = discount > 0 ? `\n> 🛒 Giảm giá **${discount}%** đang có!\n` : '';
    const embed = new discord_js_1.EmbedBuilder()
        .setColor(embeds_1.COLORS.gold)
        .setTitle('🛒 Lái Buôn Lữ Hành!')
        .setDescription(`*Một lái buôn xuất hiện từ sau cây...*\n` +
        discountNote + '\n' + itemLines + `\n\n🪙 Gold của bạn: **${playerGold}**`);
    const buyOptions = shopItems
        .filter(i => i.buyPrice)
        .map(i => {
        const price = Math.floor(i.buyPrice * (1 - discount / 100));
        return new discord_js_1.StringSelectMenuOptionBuilder()
            .setLabel(`${i.name} — ${price} 🪙`)
            .setDescription(i.description.replace(/\*\*/g, '').slice(0, 50))
            .setValue(`buy_${i.id}`)
            .setEmoji(i.icon);
    });
    const rows = [];
    if (buyOptions.length) {
        rows.push(new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.StringSelectMenuBuilder()
            .setCustomId(`merch_buy_${userId}`)
            .setPlaceholder('Mua vật phẩm...')
            .addOptions(buyOptions)));
    }
    rows.push(new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder().setCustomId(`merch_sell_${userId}`).setLabel('Bán đồ').setEmoji('💰').setStyle(discord_js_1.ButtonStyle.Secondary), new discord_js_1.ButtonBuilder().setCustomId(`merch_leave_${userId}`).setLabel('Rời đi').setEmoji('🚶').setStyle(discord_js_1.ButtonStyle.Secondary)));
    const { embed: merchEmbed, files: merchFiles } = (0, eventImages_1.withImage)(embed, 'merchant');
    const reply = await interaction.editReply({ embeds: [merchEmbed], files: merchFiles, components: rows });
    const collector = reply.createMessageComponentCollector({
        filter: i => i.user.id === userId,
        time: 60_000
    });
    collector.on('collect', async (compInt) => {
        await compInt.deferUpdate();
        const cid = compInt.customId;
        if (cid === `merch_leave_${userId}`) {
            collector.stop();
            await interaction.editReply({ embeds: [simpleEmbed(embeds_1.COLORS.info, '🚶 Bạn vẫy tay chào lái buôn và bước đi.')], components: [] });
        }
        else if (cid === `merch_sell_${userId}`) {
            collector.stop();
            await renderMerchantSell(interaction, userId, guildId, zoneId, discount);
        }
        else if (cid === `merch_buy_${userId}`) {
            const sel = compInt;
            const itemId = sel.values[0].replace('buy_', '');
            const item = (0, items_1.getItem)(itemId);
            const fresh = (0, player_1.getPlayer)(userId, guildId);
            if (!item?.buyPrice)
                return;
            const price = Math.floor(item.buyPrice * (1 - discount / 100));
            if (fresh.gold < price) {
                await interaction.editReply({
                    embeds: [
                        embed.setFooter({ text: `❌ Không đủ Gold! Cần ${price} 🪙, bạn có ${fresh.gold} 🪙` })
                    ]
                });
                return;
            }
            (0, player_1.spendGold)(userId, guildId, price);
            (0, player_1.addItem)(userId, guildId, itemId, 1);
            const updatedPlayer = (0, player_1.getPlayer)(userId, guildId);
            await interaction.editReply({
                embeds: [
                    new discord_js_1.EmbedBuilder().setColor(embeds_1.COLORS.gold)
                        .setTitle('🛒 Lái Buôn Lữ Hành!')
                        .setDescription(`✅ Đã mua **${item.icon} ${item.name}** — −${price} 🪙\n` +
                        discountNote + '\n' + itemLines + `\n\n🪙 Gold còn lại: **${updatedPlayer.gold}**`)
                ]
            });
        }
    });
    collector.on('end', (_c, reason) => {
        if (reason === 'time')
            interaction.editReply({ components: [] }).catch(() => { });
    });
}
async function renderMerchantSell(interaction, userId, guildId, zoneId, discount) {
    const player = (0, player_1.getPlayer)(userId, guildId);
    const inventory = (0, player_1.getInventory)(userId, guildId);
    const sellable = inventory
        .map(e => ({ entry: e, item: (0, items_1.getItem)(e.item_id) }))
        .filter(({ item }) => item?.sellPrice && item.type !== 'key_item');
    if (!sellable.length) {
        await interaction.editReply({
            embeds: [simpleEmbed(embeds_1.COLORS.info, '🎒 Không có gì để bán cả.')],
            components: [
                new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder().setCustomId(`sell_back_${userId}`).setLabel('Quay lại').setEmoji('↩️').setStyle(discord_js_1.ButtonStyle.Secondary))
            ]
        });
        const reply = await interaction.fetchReply();
        const btn = await reply.awaitMessageComponent({
            componentType: discord_js_1.ComponentType.Button, filter: i => i.user.id === userId, time: 20_000
        }).catch(() => null);
        if (btn) {
            await btn.deferUpdate();
            await showMerchant(interaction, userId, guildId);
        }
        return;
    }
    const options = sellable.map(({ entry, item }) => new discord_js_1.StringSelectMenuOptionBuilder()
        .setLabel(`${item.name} ×${entry.quantity}`)
        .setDescription(`Bán: ${item.sellPrice} 🪙 mỗi cái`)
        .setValue(`sell_${entry.item_id}`)
        .setEmoji(item.icon));
    const embed = new discord_js_1.EmbedBuilder().setColor(embeds_1.COLORS.gold)
        .setTitle('💰 Bán Đồ')
        .setDescription(`🪙 Gold hiện tại: **${player.gold}**\nChọn vật phẩm muốn bán:`)
        .addFields(sellable.map(({ entry, item }) => ({
        name: `${item.icon} ${item.name} ×${entry.quantity}`,
        value: `${item.sellPrice} 🪙/cái`,
        inline: true
    })));
    const rows = [
        new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.StringSelectMenuBuilder()
            .setCustomId(`merch_sellitem_${userId}`)
            .setPlaceholder('Chọn vật phẩm để bán...')
            .addOptions(options)),
        new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder().setCustomId(`merch_sellback_${userId}`).setLabel('Quay lại shop').setEmoji('↩️').setStyle(discord_js_1.ButtonStyle.Secondary), new discord_js_1.ButtonBuilder().setCustomId(`merch_sellleave_${userId}`).setLabel('Rời đi').setEmoji('🚶').setStyle(discord_js_1.ButtonStyle.Secondary))
    ];
    const { embed: sellEmbed, files: sellFiles } = (0, eventImages_1.withImage)(embed, 'merchant');
    const reply = await interaction.editReply({ embeds: [sellEmbed], files: sellFiles, components: rows });
    const collector = reply.createMessageComponentCollector({
        filter: i => i.user.id === userId, time: 60_000
    });
    collector.on('collect', async (compInt) => {
        await compInt.deferUpdate();
        const cid = compInt.customId;
        if (cid === `merch_sellback_${userId}`) {
            collector.stop();
            await showMerchant(interaction, userId, guildId);
        }
        else if (cid === `merch_sellleave_${userId}`) {
            collector.stop();
            await interaction.editReply({ embeds: [simpleEmbed(embeds_1.COLORS.info, '🚶 Bạn vẫy tay chào lái buôn và bước đi.')], components: [] });
        }
        else if (cid === `merch_sellitem_${userId}`) {
            const sel = compInt;
            const itemId = sel.values[0].replace('sell_', '');
            const item = (0, items_1.getItem)(itemId);
            if (!item?.sellPrice)
                return;
            const qty = (0, player_1.getItemQty)(userId, guildId, itemId);
            if (qty <= 0)
                return;
            (0, player_1.removeItem)(userId, guildId, itemId, 1);
            (0, player_1.grantGold)(userId, guildId, item.sellPrice);
            const fresh = (0, player_1.getPlayer)(userId, guildId);
            await interaction.editReply({
                embeds: [
                    new discord_js_1.EmbedBuilder().setColor(embeds_1.COLORS.gold)
                        .setTitle('💰 Bán Đồ')
                        .setDescription(`✅ Bán **${item.icon} ${item.name}** → +**${item.sellPrice}** 🪙\n🪙 Gold: **${fresh.gold}**`)
                        .addFields(sellable
                        .map(({ entry, item: it }) => {
                        const currentQty = entry.item_id === itemId ? qty - 1 : entry.quantity;
                        return currentQty > 0 ? { name: `${it.icon} ${it.name} ×${currentQty}`, value: `${it.sellPrice} 🪙/cái`, inline: true } : null;
                    })
                        .filter(Boolean))
                ]
            });
        }
    });
    collector.on('end', (_c, reason) => {
        if (reason === 'time')
            interaction.editReply({ components: [] }).catch(() => { });
    });
}
async function handleVictory(interaction, btnInt, userId, guildId, player, enemy, state) {
    const rewards = (0, rewards_1.processVictoryRewards)(userId, guildId, player, enemy);
    const bonus = enemy.combatBonus;
    if (bonus) {
        (0, player_1.grantGold)(userId, guildId, bonus.bonusGold);
        if (bonus.bonusItem)
            (0, player_1.addItem)(userId, guildId, bonus.bonusItem, 1);
        rewards.bonusDescription += '\n\n' + bonus.bonusDesc.replace('{gold}', String(bonus.bonusGold));
    }
    (0, player_1.updatePlayerHpMp)(userId, guildId, state.player_hp, state.player_mp);
    const embed = (0, embeds_1.buildVictoryEmbed)(player.name, enemy.name, enemy.icon, rewards.exp, rewards.gold, rewards.drops, rewards.leveledUp, rewards.newLevel);
    if (rewards.bonusDescription) {
        embed.setDescription((embed.data.description ?? '') + rewards.bonusDescription);
    }
    const achievementMessages = (0, achievements_1.awardAchievements)(userId, guildId);
    if (achievementMessages.length) {
        embed.addFields({ name: '🏆 Thành tựu mới', value: achievementMessages.join('\n'), inline: false });
    }
    const { embed: victoryImg, files: victoryFiles } = (0, eventImages_1.withImage)(embed, 'victory');
    await btnInt.editReply({ embeds: [victoryImg], files: victoryFiles, components: buildContinueExploreRow(userId) });
    attachContinueExploreHandler(btnInt.message, interaction, userId, guildId);
}
async function handleDeath(interaction, btnInt, userId, guildId, player, enemy) {
    const penalty = (0, rewards_1.processDeathPenalty)(userId, guildId, player, enemy);
    const embed = (0, embeds_1.buildDeathEmbed)(player.name, enemy.name, penalty.goldLeft)
        .addFields({ name: '💀 Soul Shards', value: `+**${penalty.shards}** 💀`, inline: true });
    const achievementMessages = (0, achievements_1.awardAchievements)(userId, guildId);
    if (achievementMessages.length) {
        embed.addFields({ name: '🏆 Thành tựu mới', value: achievementMessages.join('\n'), inline: false });
    }
    const { embed: deathImg, files: deathFiles } = (0, eventImages_1.withImage)(embed, 'death');
    await btnInt.editReply({
        embeds: [deathImg],
        files: deathFiles,
        components: buildContinueExploreRow(userId)
    });
    attachContinueExploreHandler(btnInt.message, interaction, userId, guildId);
}
// ── Event: Healing Spring ─────────────────────────────────────────────────────
async function showHealingSpring(interaction, userId, guildId) {
    const player = (0, player_1.getPlayer)(userId, guildId);
    const isFullHeal = (0, format_1.randInt)(1, 100) <= 15; // 15% chance of full restore
    const hpGain = isFullHeal ? player.max_hp - player.hp : Math.floor(player.max_hp * 0.5);
    const mpGain = isFullHeal ? player.max_mp - player.mp : Math.floor(player.max_mp * 0.5);
    const newHp = Math.min(player.max_hp, player.hp + hpGain);
    const newMp = Math.min(player.max_mp, player.mp + mpGain);
    (0, player_1.updatePlayerHpMp)(userId, guildId, newHp, newMp);
    const flavors = [
        'Một dòng suối trong vắt chảy ra từ kẽ đá...',
        'Ánh sáng bạc phản chiếu từ mặt hồ nhỏ giữa rừng...',
        'Tiếng nước chảy róc rách dẫn bạn đến một suối nhỏ...',
    ];
    const { embed: springEmbed, files: springFiles } = (0, eventImages_1.withImage)(new discord_js_1.EmbedBuilder().setColor(0x3498DB)
        .setTitle(`🌊 ${isFullHeal ? 'Suối Hồi Sinh Huyền Bí' : 'Suối Hồi Phục'}`)
        .setDescription(`*${(0, format_1.pick)(flavors)}*\n\n` +
        (isFullHeal ? '✨ **Nguồn nước kỳ diệu hồi phục hoàn toàn!**\n\n' : '') +
        `❤️ +**${hpGain} HP** → ${newHp}/${player.max_hp}\n` +
        `💧 +**${mpGain} MP** → ${newMp}/${player.max_mp}`), 'spring');
    await interaction.editReply({ embeds: [springEmbed], files: springFiles, components: [] });
}
// ── Event: Trap ────────────────────────────────────────────────────────────────
async function showTrap(interaction, userId, guildId) {
    const player = (0, player_1.getPlayer)(userId, guildId);
    const noticed = (0, format_1.randInt)(1, 100) <= 50; // 50% notice it
    const trapType = (0, format_1.pick)(['pit', 'snare', 'poison', 'gold']);
    const trapInfo = {
        pit: { name: 'Hố Bẫy', icon: '🕳️', desc: 'Một hố sâu ngụy trang bằng cành lá.' },
        snare: { name: 'Bẫy Thòng Lọng', icon: '🔗', desc: 'Một cái bẫy thòng lọng bằng dây thừng.' },
        poison: { name: 'Bẫy Độc', icon: '🧨', desc: 'Kim độc bắn ra từ cơ chế ẩn.' },
        gold: { name: 'Bẫy Vàng Giả', icon: '💛', desc: 'Vàng giả làm mồi nhử — có ai đó đã đặt bẫy ở đây.' },
    };
    const info = trapInfo[trapType];
    if (noticed) {
        // Player spotted it — give choice
        const embed = new discord_js_1.EmbedBuilder().setColor(embeds_1.COLORS.warning)
            .setTitle(`⚠️ Phát Hiện ${info.icon} ${info.name}!`)
            .setDescription(`*${info.desc}*\n\nBạn nhận ra dấu hiệu bất thường trước khi bước vào...`);
        const row = new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder().setCustomId(`trap_avoid_${userId}`).setLabel('Cẩn thận tránh qua').setEmoji('🚶').setStyle(discord_js_1.ButtonStyle.Success), new discord_js_1.ButtonBuilder().setCustomId(`trap_brave_${userId}`).setLabel('Liều mạng vượt qua').setEmoji('💪').setStyle(discord_js_1.ButtonStyle.Danger));
        const { embed: trapNoticeEmbed, files: trapNoticeFiles } = (0, eventImages_1.withImage)(embed, 'trap');
        const reply = await interaction.editReply({ embeds: [trapNoticeEmbed], files: trapNoticeFiles, components: [row] });
        const btn = await reply.awaitMessageComponent({
            componentType: discord_js_1.ComponentType.Button, filter: i => i.user.id === userId, time: 25_000
        }).catch(() => null);
        await (btn?.deferUpdate() ?? Promise.resolve());
        if (!btn || btn.customId === `trap_avoid_${userId}`) {
            await interaction.editReply({
                embeds: [new discord_js_1.EmbedBuilder().setColor(embeds_1.COLORS.success).setDescription('✅ Bạn cẩn thận bước qua bẫy an toàn.')],
                components: []
            });
            return;
        }
        // Brave: take reduced damage
        await triggerTrap(interaction, userId, guildId, trapType, true);
    }
    else {
        // Didn't notice — full effect
        await triggerTrap(interaction, userId, guildId, trapType, false);
    }
}
async function triggerTrap(interaction, userId, guildId, trapType, reduced) {
    const player = (0, player_1.getPlayer)(userId, guildId);
    let newHp = player.hp, newGold = player.gold;
    let resultDesc = '';
    const mult = reduced ? 0.5 : 1.0;
    if (trapType === 'gold') {
        const loss = Math.floor(Math.min(player.gold, (0, format_1.randInt)(15, 40)) * mult);
        newGold = player.gold - loss;
        if (loss > 0) {
            const { spendGold: sg } = await Promise.resolve().then(() => __importStar(require('../systems/player')));
            sg(userId, guildId, loss);
        }
        resultDesc = `💸 Mất **${loss} Gold** vì vàng giả.`;
    }
    else {
        const dmg = Math.floor(Math.max(1, player.max_hp * (0, format_1.randInt)(15, 30) / 100) * mult);
        newHp = Math.max(1, player.hp - dmg); // can't kill via trap
        (0, player_1.updatePlayerHpMp)(userId, guildId, newHp, player.mp);
        resultDesc = `❤️ Mất **${dmg} HP** (${newHp}/${player.max_hp})`;
        if (trapType === 'poison')
            resultDesc += '\n*Vết thương rát bỏng từ nọc độc...*';
    }
    const prefix = reduced ? '⚡ Bạn cố vượt qua nhưng vẫn dính bẫy!\n\n' : '💥 Bạn dẫm phải bẫy!\n\n';
    const { embed: trapResEmbed, files: trapResFiles } = (0, eventImages_1.withImage)(new discord_js_1.EmbedBuilder().setColor(embeds_1.COLORS.danger).setTitle('💣 Dính Bẫy!').setDescription(prefix + resultDesc), 'trap');
    await interaction.editReply({ embeds: [trapResEmbed], files: trapResFiles, components: [] });
}
// ── Event: Ancient Altar ────────────────────────────────────────────────────
async function showAncientAltar(interaction, userId, guildId) {
    const player = (0, player_1.getPlayer)(userId, guildId);
    const altarFlavors = [
        'Một bàn thờ đá cổ xưa nằm giữa vòng tròn nến đang cháy tự nhiên...',
        'Những ký tự rune khắc trên đá phát sáng yếu ớt khi bạn đến gần...',
        'Khói nhang mờ ảo cuộn quanh bệ thờ không rõ nguồn gốc...',
    ];
    const embed = new discord_js_1.EmbedBuilder().setColor(0xF39C12)
        .setTitle('🏺 Bàn Thờ Cổ')
        .setDescription(`*${(0, format_1.pick)(altarFlavors)}*\n\n` +
        `Dâng vật tế để nhận phước lành... hoặc lời nguyền.\n\n` +
        `> 💰 **Dâng 50 Gold** — thần linh ban thưởng ngẫu nhiên\n` +
        `> ❤️ **Dâng 20% HP** — tế máu đổi lấy sức mạnh linh hồn\n` +
        `> 🚶 **Rời đi** — không can thiệp vào thứ này`);
    const canAffordGold = player.gold >= 50;
    const canAffordHp = player.hp > Math.floor(player.max_hp * 0.25); // need > 25% HP
    const row = new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder().setCustomId(`altar_gold_${userId}`).setLabel('Dâng 50 Gold').setEmoji('💰').setStyle(discord_js_1.ButtonStyle.Primary).setDisabled(!canAffordGold), new discord_js_1.ButtonBuilder().setCustomId(`altar_hp_${userId}`).setLabel('Dâng 20% HP').setEmoji('❤️').setStyle(discord_js_1.ButtonStyle.Danger).setDisabled(!canAffordHp), new discord_js_1.ButtonBuilder().setCustomId(`altar_skip_${userId}`).setLabel('Rời đi').setEmoji('🚶').setStyle(discord_js_1.ButtonStyle.Secondary));
    const { embed: altarEmbed, files: altarFiles } = (0, eventImages_1.withImage)(embed, 'altar');
    const reply = await interaction.editReply({ embeds: [altarEmbed], files: altarFiles, components: [row] });
    const btn = await reply.awaitMessageComponent({
        componentType: discord_js_1.ComponentType.Button, filter: i => i.user.id === userId, time: 30_000
    }).catch(() => null);
    await (btn?.deferUpdate() ?? Promise.resolve());
    const cid = btn?.customId ?? `altar_skip_${userId}`;
    if (cid === `altar_skip_${userId}` || !btn) {
        await interaction.editReply({ embeds: [simpleEmbed(embeds_1.COLORS.info, '🚶 Bạn rời bàn thờ cổ mà không chạm vào...')], components: [] });
        return;
    }
    const freshPlayer = (0, player_1.getPlayer)(userId, guildId);
    let title = '', resultDesc = '';
    if (cid === `altar_gold_${userId}`) {
        (0, player_1.spendGold)(userId, guildId, 50);
        const roll = (0, format_1.randInt)(1, 100);
        if (roll <= 35) {
            (0, player_1.grantSoulShards)(userId, guildId, 3);
            title = '✨ Thần Linh Chấp Nhận!';
            resultDesc = '💀 +**3 Soul Shards** — thần linh ban phước lành cho linh hồn bạn.';
        }
        else if (roll <= 65) {
            const gifts = ['health_potion', 'mana_potion', 'elixir', 'antidote'];
            const item = (0, format_1.pick)(gifts);
            (0, player_1.addItem)(userId, guildId, item, 1);
            const it = (0, items_1.getItem)(item);
            title = '🎁 Thần Linh Ban Quà!';
            resultDesc = `${it.icon} **${it.name}** xuất hiện trên bàn thờ.`;
        }
        else if (roll <= 85) {
            const bonus = Math.floor(freshPlayer.exp_next * 0.2);
            (0, player_1.grantExp)(userId, guildId, bonus);
            title = '⭐ Ánh Sáng Trí Tuệ!';
            resultDesc = `+**${bonus} EXP** — tri thức cổ xưa truyền vào tâm trí bạn.`;
        }
        else {
            // Cursed — lose extra 20g
            const extraLoss = Math.min(freshPlayer.gold, 20);
            if (extraLoss > 0)
                (0, player_1.spendGold)(userId, guildId, extraLoss);
            title = '💀 Lời Nguyền!';
            resultDesc = `Thần linh nổi giận — mất thêm **${extraLoss} Gold**!\n*Tổng mất: ${50 + extraLoss} 🪙*`;
        }
    }
    else { // altar_hp
        const sacrifice = Math.floor(freshPlayer.max_hp * 0.2);
        const newHp = Math.max(1, freshPlayer.hp - sacrifice);
        (0, player_1.updatePlayerHpMp)(userId, guildId, newHp, freshPlayer.mp);
        const roll = (0, format_1.randInt)(1, 100);
        if (roll <= 45) {
            (0, player_1.grantSoulShards)(userId, guildId, 5);
            title = '🩸 Tế Máu Được Chấp Nhận!';
            resultDesc = `❤️ −**${sacrifice} HP** (${newHp}/${freshPlayer.max_hp})\n💀 +**5 Soul Shards** — máu bạn tưới đẫm bàn thờ.`;
        }
        else if (roll <= 75) {
            (0, player_1.grantGold)(userId, guildId, 80);
            title = '🩸 Đổi Máu Lấy Vàng!';
            resultDesc = `❤️ −**${sacrifice} HP** (${newHp}/${freshPlayer.max_hp})\n🪙 +**80 Gold** rơi xuống từ hư không.`;
        }
        else {
            (0, player_1.grantSoulShards)(userId, guildId, 2);
            (0, player_1.grantGold)(userId, guildId, 30);
            title = '🩸 Phần Thưởng Khiêm Tốn';
            resultDesc = `❤️ −**${sacrifice} HP** (${newHp}/${freshPlayer.max_hp})\n💀 +**2 Soul Shards**  ·  🪙 +**30 Gold**`;
        }
    }
    await interaction.editReply({
        embeds: [new discord_js_1.EmbedBuilder().setColor(0xF39C12).setTitle(title).setDescription(resultDesc)],
        components: []
    });
}
// ── Event: Mysterious Figure ──────────────────────────────────────────────────
async function showMysteriousFigure(interaction, userId, guildId) {
    const player = (0, player_1.getPlayer)(userId, guildId);
    const flavors = [
        'Một bóng người choàng áo đen ngồi trên tảng đá, không rõ mặt...',
        'Tiếng cười khẽ vọng ra từ bóng tối — và một người lạ xuất hiện...',
        '"Đặt cược đi... số phận thú vị hơn bạn nghĩ đấy."',
    ];
    const embed = new discord_js_1.EmbedBuilder().setColor(0x2C3E50)
        .setTitle('👤 Nhân Vật Bí Ẩn')
        .setDescription(`*${(0, format_1.pick)(flavors)}*\n\n` +
        `> 🎲 **Cá cược 50 Gold** — rủi ro thấp, thắng nhỏ\n` +
        `> 🎰 **Cá cược 150 Gold** — rủi ro cao, thưởng lớn\n` +
        `> 🚶 **Bước đi** — không phải lúc này\n\n` +
        `🪙 Gold hiện tại: **${player.gold}**`);
    const row = new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder().setCustomId(`myst_50_${userId}`).setLabel('Cá cược 50 Gold').setEmoji('🎲').setStyle(discord_js_1.ButtonStyle.Primary).setDisabled(player.gold < 50), new discord_js_1.ButtonBuilder().setCustomId(`myst_150_${userId}`).setLabel('Cá cược 150 Gold').setEmoji('🎰').setStyle(discord_js_1.ButtonStyle.Danger).setDisabled(player.gold < 150), new discord_js_1.ButtonBuilder().setCustomId(`myst_skip_${userId}`).setLabel('Bước đi').setEmoji('🚶').setStyle(discord_js_1.ButtonStyle.Secondary));
    const { embed: mystEmbed, files: mystFiles } = (0, eventImages_1.withImage)(embed, 'mysterious');
    const reply = await interaction.editReply({ embeds: [mystEmbed], files: mystFiles, components: [row] });
    const btn = await reply.awaitMessageComponent({
        componentType: discord_js_1.ComponentType.Button, filter: i => i.user.id === userId, time: 30_000
    }).catch(() => null);
    await (btn?.deferUpdate() ?? Promise.resolve());
    const cid = btn?.customId ?? `myst_skip_${userId}`;
    if (cid === `myst_skip_${userId}` || !btn) {
        await interaction.editReply({ embeds: [simpleEmbed(embeds_1.COLORS.info, '🚶 "Có lẽ lần khác vậy..." Bóng người biến mất vào bóng tối.')], components: [] });
        return;
    }
    const bet = cid === `myst_150_${userId}` ? 150 : 50;
    const roll = (0, format_1.randInt)(1, 100);
    (0, player_1.spendGold)(userId, guildId, bet);
    let title = '', desc = '';
    if (bet === 50) {
        if (roll <= 40) { // Win: +100g
            (0, player_1.grantGold)(userId, guildId, 100);
            title = '🎉 Thắng!';
            desc = `🪙 +**100 Gold** — "Khá đấy, người trẻ."`;
        }
        else if (roll <= 65) { // Item
            const item = (0, format_1.pick)(['health_potion', 'mana_potion', 'antidote']);
            (0, player_1.addItem)(userId, guildId, item);
            title = '🎁 Vật Phẩm!';
            desc = `${(0, items_1.getItem)(item)?.icon} **${(0, items_1.getItem)(item)?.name}** — "Quà nhỏ cho kẻ liều lĩnh."`;
        }
        else if (roll <= 85) { // Break even
            (0, player_1.grantGold)(userId, guildId, 50);
            title = '🤝 Hòa';
            desc = `Lấy lại **50 Gold** — "Lần này hòa, lần sau thì biết."`;
        }
        else { // Cursed
            const dmg = Math.floor((0, player_1.getPlayer)(userId, guildId).max_hp * 0.1);
            const hp = Math.max(1, (0, player_1.getPlayer)(userId, guildId).hp - dmg);
            (0, player_1.updatePlayerHpMp)(userId, guildId, hp, (0, player_1.getPlayer)(userId, guildId).mp);
            title = '💀 Nguyền Rủa!';
            desc = `Mất **50 Gold** + −**${dmg} HP** — "Ký kèo với quỷ thì phải trả giá~"`;
        }
    }
    else { // 150g bet
        if (roll <= 25) { // Big win
            (0, player_1.grantGold)(userId, guildId, 400);
            const skBook = (0, format_1.pick)(['book_fireball', 'book_iron_skin', 'book_shadow_step']);
            (0, player_1.addItem)(userId, guildId, skBook);
            title = '🌟 ĐẠI THẮNG!';
            desc = `🪙 +**400 Gold** + ${(0, items_1.getItem)(skBook)?.icon} **${(0, items_1.getItem)(skBook)?.name}** — "Tuyệt vời! Bạn xứng đáng."`;
        }
        else if (roll <= 50) { // Good win
            (0, player_1.grantGold)(userId, guildId, 300);
            title = '🎉 Thắng Lớn!';
            desc = `🪙 +**300 Gold** — "Vận may đang theo bạn hôm nay."`;
        }
        else if (roll <= 70) { // Small return
            (0, player_1.grantGold)(userId, guildId, 80);
            title = '😐 Thua Nhẹ';
            desc = `Nhận lại **80 Gold** (mất 70) — "Tốt hơn không có gì."`;
        }
        else if (roll <= 88) { // Lose all
            title = '💸 Thua Trắng';
            desc = `Mất **150 Gold** — "Ha! Cảm giác thế nào?"`;
        }
        else { // Catastrophe
            const dmg = Math.floor((0, player_1.getPlayer)(userId, guildId).max_hp * 0.3);
            const hp = Math.max(1, (0, player_1.getPlayer)(userId, guildId).hp - dmg);
            (0, player_1.updatePlayerHpMp)(userId, guildId, hp, (0, player_1.getPlayer)(userId, guildId).mp);
            title = '☠️ Thảm Họa!';
            desc = `Mất **150 Gold** + −**${dmg} HP** — "*Cười điên* Đây mới là kết cục thú vị!"`;
        }
    }
    await interaction.editReply({
        embeds: [new discord_js_1.EmbedBuilder().setColor(0x2C3E50).setTitle(title).setDescription(desc)],
        components: []
    });
}
// ── Event: Ambush ─────────────────────────────────────────────────────────────
async function showAmbush(interaction, userId, guildId, enemyId) {
    const player = (0, player_1.getPlayer)(userId, guildId);
    const enemy = (0, enemies_1.getEnemy)(enemyId);
    const firstStrikeDmg = Math.max(1, Math.floor(enemy.atk * 0.7) - player.def);
    const embed = new discord_js_1.EmbedBuilder().setColor(embeds_1.COLORS.danger)
        .setTitle('⚡ PHỤC KÍCH!')
        .setDescription(`**${enemy.icon} ${enemy.name}** nhảy ra từ bóng tối — bạn không kịp phản ứng!\n\n` +
        `💥 Đòn tấn công đầu tiên sẽ gây khoảng **${firstStrikeDmg}** sát thương\n\n` +
        `> ⚔️ **Phản công ngay** — chiến đấu bình thường, nhưng bị đánh trước\n` +
        `> 🌑 **Cố né tránh (50%)** — nếu thành công, thoát đòn đầu`);
    const row = new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder().setCustomId(`amb_fight_${userId}`).setLabel('Phản công ngay').setEmoji('⚔️').setStyle(discord_js_1.ButtonStyle.Danger), new discord_js_1.ButtonBuilder().setCustomId(`amb_dodge_${userId}`).setLabel('Cố né tránh (50%)').setEmoji('🌑').setStyle(discord_js_1.ButtonStyle.Primary));
    const { embed: ambushEmbed, files: ambushFiles } = (0, eventImages_1.withImage)(embed, 'ambush');
    const reply = await interaction.editReply({ embeds: [ambushEmbed], files: ambushFiles, components: [row] });
    const btn = await reply.awaitMessageComponent({
        componentType: discord_js_1.ComponentType.Button, filter: i => i.user.id === userId, time: 25_000
    }).catch(() => null);
    await (btn?.deferUpdate() ?? Promise.resolve());
    if (!btn || btn.customId === `amb_fight_${userId}`) {
        // Take first hit, then combat
        const dmg = Math.max(1, firstStrikeDmg);
        const newHp = Math.max(1, player.hp - dmg);
        (0, player_1.updatePlayerHpMp)(userId, guildId, newHp, player.mp);
        const fresh = (0, player_1.getPlayer)(userId, guildId);
        if (fresh.hp <= 0) {
            await interaction.editReply({ embeds: [simpleEmbed(embeds_1.COLORS.danger, `💥 Đòn phục kích quá mạnh! −${dmg} HP`)], components: [] });
            return;
        }
        await interaction.editReply({ embeds: [simpleEmbed(embeds_1.COLORS.warning, `💥 Dính đòn phục kích −**${dmg} HP**! (${newHp}/${player.max_hp})\nChiến đấu bắt đầu!`)], components: [] });
        await new Promise(r => setTimeout(r, 1200));
        await (0, combatFlow_1.startCombatFlow)(interaction, userId, guildId, enemyId, handleVictory, handleDeath);
    }
    else {
        // Try dodge
        const dodged = (0, format_1.randInt)(1, 100) <= 50;
        if (dodged) {
            await interaction.editReply({ embeds: [simpleEmbed(embeds_1.COLORS.success, `🌑 Bạn né được đòn phục kích! Chiến đấu bình thường bắt đầu!`)], components: [] });
            await new Promise(r => setTimeout(r, 1000));
            await (0, combatFlow_1.startCombatFlow)(interaction, userId, guildId, enemyId, handleVictory, handleDeath);
        }
        else {
            const dmg = Math.max(1, Math.floor(firstStrikeDmg * 1.3)); // penalty for failed dodge
            const newHp = Math.max(1, player.hp - dmg);
            (0, player_1.updatePlayerHpMp)(userId, guildId, newHp, player.mp);
            await interaction.editReply({ embeds: [simpleEmbed(embeds_1.COLORS.danger, `❌ Né thất bại! −**${dmg} HP** (${newHp}/${player.max_hp})\nChiến đấu bắt đầu!`)], components: [] });
            await new Promise(r => setTimeout(r, 1200));
            await (0, combatFlow_1.startCombatFlow)(interaction, userId, guildId, enemyId, handleVictory, handleDeath);
        }
    }
}
// ── Event: Villager Rescue ────────────────────────────────────────────────────
async function showVillagerRescue(interaction, userId, guildId, zoneEnemies) {
    const player = (0, player_1.getPlayer)(userId, guildId);
    const villagerFlavors = [
        'Tiếng kêu cứu vang lên từ sau bụi cây...',
        'Một người đàn ông đang bị dồn vào góc tường đá...',
        '"Ai đó cứu tôi với!" — giọng phụ nữ run rẩy vọng ra...',
    ];
    const banditEnemy = {
        id: 'bandit', name: 'Tên Cướp Đường', icon: '🗡️', level: Math.max(1, player.level - 1),
        hp: Math.floor(50 + player.level * 8), atk: Math.floor(8 + player.level * 1.5),
        def: Math.floor(3 + player.level * 0.5), expReward: Math.floor(30 + player.level * 5),
        goldMin: 15, goldMax: 35,
        drops: [{ itemId: 'health_potion', chance: 25 }],
        specialAttacks: ['backstab'], zones: [], boss: false,
        deathWorldFlag: undefined,
        lore: 'Tên cướp đường thường đánh vào kẻ yếu thế.'
    };
    const goldReward = (0, format_1.randInt)(30, 70);
    const embed = new discord_js_1.EmbedBuilder().setColor(0xE67E22)
        .setTitle('👨‍👩‍👧 Dân Làng Gặp Nạn!')
        .setDescription(`*${(0, format_1.pick)(villagerFlavors)}*\n\n` +
        `Một **🗡️ Tên Cướp Đường** (Lv.${banditEnemy.level}) đang tấn công dân thường!\n\n` +
        `> ⚔️ **Cứu họ** — đánh tên cướp, nhận phần thưởng từ nạn nhân\n` +
        `> 🚶 **Bước qua** — không phải việc của mình`);
    const row = new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder().setCustomId(`vil_save_${userId}`).setLabel('Cứu họ').setEmoji('⚔️').setStyle(discord_js_1.ButtonStyle.Success), new discord_js_1.ButtonBuilder().setCustomId(`vil_skip_${userId}`).setLabel('Bước qua').setEmoji('🚶').setStyle(discord_js_1.ButtonStyle.Secondary));
    const { embed: vilEmbed, files: vilFiles } = (0, eventImages_1.withImage)(embed, 'villager');
    const reply = await interaction.editReply({ embeds: [vilEmbed], files: vilFiles, components: [row] });
    const btn = await reply.awaitMessageComponent({
        componentType: discord_js_1.ComponentType.Button, filter: i => i.user.id === userId, time: 25_000
    }).catch(() => null);
    await (btn?.deferUpdate() ?? Promise.resolve());
    if (!btn || btn.customId === `vil_skip_${userId}`) {
        await interaction.editReply({
            embeds: [new discord_js_1.EmbedBuilder().setColor(embeds_1.COLORS.info).setDescription('🚶 Bạn bước qua... tiếng kêu cứu dần tắt phía sau lưng.')],
            components: []
        });
        return;
    }
    // Fight the bandit — with reward if win
    await interaction.editReply({ embeds: [simpleEmbed(0xE67E22, '⚔️ Bạn xông vào cứu dân làng!')], components: [] });
    await new Promise(r => setTimeout(r, 800));
    // Mark that this combat gives bonus reward (we'll hook into victory flow via world flag hack)
    // Simpler: just do combat with inline enemy
    await (0, combatFlow_1.startCombatFlowWithEnemy)(interaction, userId, guildId, banditEnemy, {
        bonusGold: goldReward,
        bonusDesc: `👨‍👩‍👧 Dân làng cảm ơn bạn và trao **${goldReward} Gold**!`
    }, handleVictory, handleDeath);
}
// ── Event: Caravan Robbery ────────────────────────────────────────────────────
async function showCaravanRobbery(interaction, userId, guildId, zoneEnemies) {
    const player = (0, player_1.getPlayer)(userId, guildId);
    const guardEnemy = {
        id: 'caravan_guard', name: 'Vệ Sĩ Đoàn Thương', icon: '🛡️',
        level: player.level, hp: Math.floor(60 + player.level * 10),
        atk: Math.floor(10 + player.level * 2), def: Math.floor(8 + player.level),
        expReward: Math.floor(40 + player.level * 6), goldMin: 10, goldMax: 25,
        drops: [{ itemId: 'health_potion', chance: 30 }],
        specialAttacks: ['shield_bash'], zones: [], boss: false, deathWorldFlag: undefined,
        lore: 'Vệ sĩ bảo vệ đoàn thương nhân.'
    };
    const banditBossEnemy = {
        id: 'bandit_boss', name: 'Trùm Cướp', icon: '💀',
        level: player.level + 1, hp: Math.floor(80 + player.level * 12),
        atk: Math.floor(14 + player.level * 2.5), def: Math.floor(5 + player.level),
        expReward: Math.floor(60 + player.level * 8), goldMin: 30, goldMax: 60,
        drops: [{ itemId: 'health_potion', chance: 25 }, { itemId: 'mana_potion', chance: 20 }],
        specialAttacks: ['backstab', 'double_bite'], zones: [], boss: false, deathWorldFlag: undefined,
        lore: 'Trùm cướp có giá trên đầu từ lâu.'
    };
    const embed = new discord_js_1.EmbedBuilder().setColor(0x8E44AD)
        .setTitle('🛒 Xe Chở Đồ Bị Cướp!')
        .setDescription(`Đoàn thương nhân đang bị bọn cướp tấn công giữa đường!\n\n` +
        `> ⚔️ **Giúp chủ xe** — đánh Trùm Cướp (Lv.${banditBossEnemy.level}), nhận thưởng lớn từ thương nhân\n` +
        `> 😈 **Giúp bọn cướp** — đánh Vệ Sĩ (Lv.${guardEnemy.level}), chia chác đồ cướp được\n` +
        `> 👁️ **Quan sát** — đứng xem, nhặt đồ rơi sau khi mọi chuyện xong`);
    const row = new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder().setCustomId(`cara_help_${userId}`).setLabel('Giúp chủ xe').setEmoji('⚔️').setStyle(discord_js_1.ButtonStyle.Success), new discord_js_1.ButtonBuilder().setCustomId(`cara_bandit_${userId}`).setLabel('Giúp bọn cướp').setEmoji('😈').setStyle(discord_js_1.ButtonStyle.Danger), new discord_js_1.ButtonBuilder().setCustomId(`cara_watch_${userId}`).setLabel('Quan sát').setEmoji('👁️').setStyle(discord_js_1.ButtonStyle.Secondary));
    const { embed: caraEmbed, files: caraFiles } = (0, eventImages_1.withImage)(embed, 'caravan');
    const reply = await interaction.editReply({ embeds: [caraEmbed], files: caraFiles, components: [row] });
    const btn = await reply.awaitMessageComponent({
        componentType: discord_js_1.ComponentType.Button, filter: i => i.user.id === userId, time: 30_000
    }).catch(() => null);
    await (btn?.deferUpdate() ?? Promise.resolve());
    const cid = btn?.customId ?? `cara_watch_${userId}`;
    if (cid === `cara_watch_${userId}` || !btn) {
        // Spectate — random small loot
        const watchLoot = (0, format_1.pick)(['health_potion', 'herb', 'wolf_fang', 'bone_shard']);
        const watchGold = (0, format_1.randInt)(5, 20);
        (0, player_1.addItem)(userId, guildId, watchLoot, 1);
        (0, player_1.grantGold)(userId, guildId, watchGold);
        const it = (0, items_1.getItem)(watchLoot);
        await interaction.editReply({
            embeds: [
                new discord_js_1.EmbedBuilder().setColor(embeds_1.COLORS.info)
                    .setTitle('👁️ Quan Sát Từ Xa')
                    .setDescription(`Cả hai bên hỗn chiến... rồi tản ra. Bạn nhặt được những thứ rơi lại:\n\n` +
                    `${it.icon} **${it.name}** × 1  ·  🪙 +**${watchGold} Gold**`)
            ],
            components: []
        });
        return;
    }
    if (cid === `cara_help_${userId}`) {
        await interaction.editReply({ embeds: [simpleEmbed(embeds_1.COLORS.success, '⚔️ Bạn xông vào giúp thương nhân!')], components: [] });
        await new Promise(r => setTimeout(r, 800));
        await (0, combatFlow_1.startCombatFlowWithEnemy)(interaction, userId, guildId, banditBossEnemy, {
            bonusGold: (0, format_1.randInt)(80, 150),
            bonusDesc: `🛒 Thương nhân trả ơn với **{gold} Gold** và hàng hóa!`,
            bonusItem: 'elixir'
        }, handleVictory, handleDeath);
    }
    else {
        await interaction.editReply({ embeds: [simpleEmbed(embeds_1.COLORS.danger, '😈 Bạn chọn đứng về phía bọn cướp...')], components: [] });
        await new Promise(r => setTimeout(r, 800));
        await (0, combatFlow_1.startCombatFlowWithEnemy)(interaction, userId, guildId, guardEnemy, {
            bonusGold: (0, format_1.randInt)(40, 80),
            bonusDesc: `💰 Chia chác chiến lợi phẩm: +**{gold} Gold** + đồ cướp được!`,
            bonusItem: (0, format_1.pick)(['health_potion', 'mana_potion', 'antidote'])
        }, handleVictory, handleDeath);
    }
}
// ── Helpers ───────────────────────────────────────────────────────────────────
function simpleEmbed(color, desc) {
    return new discord_js_1.EmbedBuilder().setColor(color).setDescription(desc);
}
// ── New Events: Wounded Traveler, Cursed Chest, Reflective Lake, etc. ─────────
async function showWoundedTraveler(interaction, userId, guildId) {
    const player = (0, player_1.getPlayer)(userId, guildId);
    const embed = new discord_js_1.EmbedBuilder().setColor(embeds_1.COLORS.info).setTitle('🩺 Người Lữ Hành Bị Thương')
        .setDescription(`*Bạn gặp một người bị thương bên đường...*

> ⚕️ Cứu người đó — tốn potion hoặc gold, nhận lòng biết ơn

> 💼 Lục đồ rồi bỏ đi — lấy vàng/vật phẩm

> ❓ Hỏi thông tin — có thể biết vị trí dungeon/shop/boss`);
    const row = new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder().setCustomId(`trav_save_${userId}`).setLabel('Cứu người đó').setStyle(discord_js_1.ButtonStyle.Primary).setEmoji('🤝'), new discord_js_1.ButtonBuilder().setCustomId(`trav_rob_${userId}`).setLabel('Lục đồ rồi bỏ đi').setStyle(discord_js_1.ButtonStyle.Danger).setEmoji('💰'), new discord_js_1.ButtonBuilder().setCustomId(`trav_ask_${userId}`).setLabel('Hỏi thông tin').setStyle(discord_js_1.ButtonStyle.Secondary).setEmoji('❓'));
    const { embed: eImg, files } = (0, eventImages_1.withImage)(embed, 'villager');
    const reply = await interaction.editReply({ embeds: [eImg], files, components: [row] });
    const btn = await reply.awaitMessageComponent({ componentType: discord_js_1.ComponentType.Button, filter: i => i.user.id === userId, time: 25000 }).catch(() => null);
    await (btn?.deferUpdate() ?? Promise.resolve());
    if (!btn || btn.customId === `trav_ask_${userId}`) {
        // Ask: reveal hint
        const hints = ['Một hầm ngầm cũ ở phía đông.', 'Nghe nói ở chợ có mặt hàng hiếm hôm nay.', 'Có một con boss nhỏ trú tại hang động.'];
        await interaction.editReply({ embeds: [simpleEmbed(embeds_1.COLORS.info, `❓ Người lữ hành thì thầm: "${(0, format_1.pick)(hints)}"`)], components: [] });
        return;
    }
    if (btn.customId === `trav_rob_${userId}`) {
        // Loot: take some gold or item
        const gold = (0, format_1.randInt)(10, 60);
        (0, player_1.grantGold)(userId, guildId, gold);
        (0, world_1.logEvent)(guildId, userId, player.name, 'wounded_loot', `lục đồ người lữ hành và lấy ${gold} Gold.`, player.zone_id);
        await interaction.editReply({ embeds: [simpleEmbed(embeds_1.COLORS.danger, `💰 Bạn lục lọi và lấy **${gold} Gold**.`)], components: [] });
        return;
    }
    // Save
    // Try to consume a health_potion, otherwise spend gold
    const hasPotion = (0, player_1.getItemQty)(userId, guildId, 'health_potion') > 0;
    if (hasPotion) {
        (0, player_1.removeItem)(userId, guildId, 'health_potion', 1);
        (0, player_1.grantSoulShards)(userId, guildId, 1);
        (0, world_1.logEvent)(guildId, userId, player.name, 'wounded_save', 'cứu người lữ hành bằng potion.', player.zone_id);
        await interaction.editReply({ embeds: [simpleEmbed(embeds_1.COLORS.success, '🩹 Bạn cứu người đó bằng 1 Potion — họ gửi lời biết ơn (+1 Soul Shard).')], components: [] });
    }
    else if (player.gold >= 20) {
        (0, player_1.spendGold)(userId, guildId, 20);
        (0, player_1.grantSoulShards)(userId, guildId, 1);
        (0, world_1.logEvent)(guildId, userId, player.name, 'wounded_save', 'cứu người lữ hành bằng vàng.', player.zone_id);
        await interaction.editReply({ embeds: [simpleEmbed(embeds_1.COLORS.success, '🩹 Bạn trả 20 Gold để băng bó cho họ — họ gửi lời biết ơn (+1 Soul Shard).')], components: [] });
    }
    else {
        await interaction.editReply({ embeds: [simpleEmbed(embeds_1.COLORS.info, '⚠️ Bạn không có potion hoặc vàng để giúp. Người lữ hành rên rỉ rồi rời đi.')], components: [] });
    }
}
async function showCursedChest(interaction, userId, guildId) {
    const player = (0, player_1.getPlayer)(userId, guildId);
    const embed = new discord_js_1.EmbedBuilder().setColor(embeds_1.COLORS.purple).setTitle('📦 Rương Cổ Bị Nguyền')
        .setDescription(`*Một cái rương cổ nằm giữa rễ cây...*

> 🔓 Mở rương — có thể nhận item hiếm hoặc dính curse

> 🕵️ Kiểm tra bẫy — giảm nguy cơ bị bẫy

> 🔨 Phá rương — ít reward hơn nhưng an toàn hơn

> 🚶 Bỏ qua`);
    const row = new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder().setCustomId(`chest_open_${userId}`).setLabel('Mở rương').setStyle(discord_js_1.ButtonStyle.Primary), new discord_js_1.ButtonBuilder().setCustomId(`chest_check_${userId}`).setLabel('Kiểm tra bẫy').setStyle(discord_js_1.ButtonStyle.Success), new discord_js_1.ButtonBuilder().setCustomId(`chest_smash_${userId}`).setLabel('Phá rương').setStyle(discord_js_1.ButtonStyle.Danger), new discord_js_1.ButtonBuilder().setCustomId(`chest_skip_${userId}`).setLabel('Bỏ qua').setStyle(discord_js_1.ButtonStyle.Secondary));
    const { embed: eImg, files } = (0, eventImages_1.withImage)(embed, 'loot');
    const reply = await interaction.editReply({ embeds: [eImg], files, components: [row] });
    const btn = await reply.awaitMessageComponent({ componentType: discord_js_1.ComponentType.Button, filter: i => i.user.id === userId, time: 30000 }).catch(() => null);
    await (btn?.deferUpdate() ?? Promise.resolve());
    if (!btn || btn.customId === `chest_skip_${userId}`) {
        await interaction.editReply({ embeds: [simpleEmbed(embeds_1.COLORS.info, '🚶 Bạn rời rương cổ lại cho rừng...')], components: [] });
        return;
    }
    const trapChecked = btn.customId === `chest_check_${userId}`;
    if (btn.customId === `chest_smash_${userId}`) {
        // Smash: smaller reward
        const gold = (0, format_1.randInt)(10, 30);
        (0, player_1.grantGold)(userId, guildId, gold);
        await interaction.editReply({ embeds: [simpleEmbed(embeds_1.COLORS.warning, `🔨 Bạn phá rương và thu được **${gold} Gold**, nhưng có vẻ rương đã vỡ mất một số đồ.`)], components: [] });
        return;
    }
    // Open or checked
    const curseRoll = (0, format_1.randInt)(1, 100);
    const effectiveRoll = trapChecked ? Math.max(1, curseRoll - 25) : curseRoll; // reduced chance if checked
    if (effectiveRoll <= 65) {
        // Good reward
        const possible = ['health_potion', 'mana_potion', 'antidote', 'elixir', 'book_fireball'];
        const item = (0, format_1.pick)(possible);
        (0, player_1.addItem)(userId, guildId, item, 1);
        await interaction.editReply({ embeds: [simpleEmbed(embeds_1.COLORS.gold, `🎁 Bạn mở rương và nhận **${(0, items_1.getItem)(item)?.icon} ${(0, items_1.getItem)(item)?.name}**!`)], components: [] });
        (0, world_1.logEvent)(guildId, userId, player.name, 'cursed_chest_open', `mở rương và nhận ${item}.`, player.zone_id);
        return;
    }
    // Curse inflicted
    const curseTypes = ['maxhp_down', 'stronger_enemies', 'no_potion_next_combat'];
    const curse = (0, format_1.pick)(curseTypes);
    // store as flag per player (simple): value = curse|3
    (0, world_1.setFlag)(guildId, `curse_${userId}`, `${curse}|3`, 86400);
    await interaction.editReply({ embeds: [simpleEmbed(embeds_1.COLORS.danger, `💀 Lời nguyền! Bạn bị **${curse}** trong vài lần khám phá tiếp theo...`)], components: [] });
    (0, world_1.logEvent)(guildId, userId, player.name, 'cursed_chest_curse', `bị lời nguyền ${curse} từ rương.`, player.zone_id);
}
async function showReflectiveLake(interaction, userId, guildId) {
    const player = (0, player_1.getPlayer)(userId, guildId);
    const embed = new discord_js_1.EmbedBuilder().setColor(0x1ABC9C).setTitle('🔮 Hồ Phản Chiếu')
        .setDescription('*Mặt hồ phản chiếu một tương lai mơ hồ...*\n\n' +
        `> 👀 Nhìn vào hồ — biết trước event tiếp theo\n> 💰 Ném gold xuống hồ — nhận buff may mắn\n> 🥤 Uống nước — hồi HP/MP hoặc ảo giác\n> 🚶 Rời đi`);
    const row = new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder().setCustomId(`lake_look_${userId}`).setLabel('Nhìn vào hồ').setStyle(discord_js_1.ButtonStyle.Primary), new discord_js_1.ButtonBuilder().setCustomId(`lake_toss_${userId}`).setLabel('Ném gold xuống hồ').setStyle(discord_js_1.ButtonStyle.Success), new discord_js_1.ButtonBuilder().setCustomId(`lake_drink_${userId}`).setLabel('Uống nước').setStyle(discord_js_1.ButtonStyle.Danger), new discord_js_1.ButtonBuilder().setCustomId(`lake_skip_${userId}`).setLabel('Rời đi').setStyle(discord_js_1.ButtonStyle.Secondary));
    const { embed: eImg, files } = (0, eventImages_1.withImage)(embed, 'spring');
    const reply = await interaction.editReply({ embeds: [eImg], files, components: [row] });
    const btn = await reply.awaitMessageComponent({ componentType: discord_js_1.ComponentType.Button, filter: i => i.user.id === userId, time: 25000 }).catch(() => null);
    await (btn?.deferUpdate() ?? Promise.resolve());
    if (!btn || btn.customId === `lake_skip_${userId}`) {
        await interaction.editReply({ embeds: [simpleEmbed(embeds_1.COLORS.info, '🚶 Bạn rời hồ tĩnh lặng...')], components: [] });
        return;
    }
    if (btn.customId === `lake_look_${userId}`) {
        // Show a peek: random event name
        const previews = ['Một cuộc phục kích!', 'Có một thương nhân lạ.', 'Một kho báu ẩn...'];
        await interaction.editReply({ embeds: [simpleEmbed(embeds_1.COLORS.purple, `🔮 Bạn thấy: "${(0, format_1.pick)(previews)}"`)], components: [] });
        return;
    }
    if (btn.customId === `lake_toss_${userId}`) {
        const cost = Math.min(20, player.gold);
        if (cost <= 0) {
            await interaction.editReply({ embeds: [simpleEmbed(embeds_1.COLORS.info, 'Bạn không có vàng để ném...')], components: [] });
            return;
        }
        (0, player_1.spendGold)(userId, guildId, cost);
        (0, world_1.setFlag)(guildId, `luck_${userId}`, '1', 3600);
        await interaction.editReply({ embeds: [simpleEmbed(embeds_1.COLORS.success, `🍀 Bạn ném **${cost} Gold** xuống hồ — cảm thấy may mắn trong 1 giờ.`)], components: [] });
        return;
    }
    // drink
    const roll = (0, format_1.randInt)(1, 100);
    if (roll <= 60) {
        const hpGain = Math.min(player.max_hp - player.hp, Math.floor(player.max_hp * 0.25));
        const mpGain = Math.min(player.max_mp - player.mp, Math.floor(player.max_mp * 0.25));
        (0, player_1.updatePlayerHpMp)(userId, guildId, player.hp + hpGain, player.mp + mpGain);
        await interaction.editReply({ embeds: [simpleEmbed(embeds_1.COLORS.success, `💧 Bạn uống và hồi **${hpGain} HP** và **${mpGain} MP**.`)], components: [] });
    }
    else {
        // hallucination: small MP loss
        const newMp = Math.max(0, player.mp - Math.floor(player.max_mp * 0.2));
        (0, player_1.updatePlayerHpMp)(userId, guildId, player.hp, newMp);
        await interaction.editReply({ embeds: [simpleEmbed(embeds_1.COLORS.warning, '🌫️ Ảo giác! Bạn cảm thấy choáng và mất MP ít nhiều...')], components: [] });
    }
}
async function showWoundedMonster(interaction, userId, guildId) {
    const player = (0, player_1.getPlayer)(userId, guildId);
    const enemy = { id: 'wounded_beast', name: 'Quái Vật Thương Tích', icon: '🦴', level: Math.max(1, player.level - 1), hp: 10 + player.level * 5, atk: 5 + player.level, def: 2, expReward: 20 + player.level * 3, goldMin: 5, goldMax: 25, drops: [], specialAttacks: [], zones: [], boss: false, deathWorldFlag: undefined, lore: 'Một con quái bị thương đang rên rỉ.' };
    const embed = new discord_js_1.EmbedBuilder().setColor(embeds_1.COLORS.warning).setTitle('🦴 Quái Vật Bị Thương')
        .setDescription(`*Một con quái vật đang kiệt sức trước mặt bạn...*\n\n> ⚔️ Kết liễu — nhận EXP/Gold dễ dàng\n> 🙏 Tha mạng — tăng lòng tốt (flavor)\n> 🐾 Bắt làm thú theo dấu — có cơ hội nhận pet tạm thời`);
    const row = new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder().setCustomId(`wmon_kill_${userId}`).setLabel('Kết liễu').setStyle(discord_js_1.ButtonStyle.Danger), new discord_js_1.ButtonBuilder().setCustomId(`wmon_spare_${userId}`).setLabel('Tha mạng').setStyle(discord_js_1.ButtonStyle.Success), new discord_js_1.ButtonBuilder().setCustomId(`wmon_tame_${userId}`).setLabel('Bắt làm thú').setStyle(discord_js_1.ButtonStyle.Primary));
    const { embed: eImg, files } = (0, eventImages_1.withImage)(embed, 'combat');
    const reply = await interaction.editReply({ embeds: [eImg], files, components: [row] });
    const btn = await reply.awaitMessageComponent({ componentType: discord_js_1.ComponentType.Button, filter: i => i.user.id === userId, time: 25000 }).catch(() => null);
    await (btn?.deferUpdate() ?? Promise.resolve());
    if (!btn) {
        await interaction.editReply({ embeds: [simpleEmbed(embeds_1.COLORS.info, 'Bạn rời đi, con quái lết vào rừng...')], components: [] });
        return;
    }
    if (btn.customId === `wmon_kill_${userId}`) {
        await (0, combatFlow_1.startCombatFlowWithEnemy)(interaction, userId, guildId, enemy, { bonusGold: (0, format_1.randInt)(15, 35), bonusDesc: '🎁 Bạn nhận thưởng vì hạ gục quái vật bị thương.' }, handleVictory, handleDeath);
    }
    else if (btn.customId === `wmon_spare_${userId}`) {
        (0, player_1.grantSoulShards)(userId, guildId, 1);
        await interaction.editReply({ embeds: [simpleEmbed(embeds_1.COLORS.success, '🙏 Bạn tha mạng — nhận sự biết ơn (flavor).')], components: [] });
    }
    else {
        // tame attempt
        const success = (0, format_1.randInt)(1, 100) <= 35;
        if (success) {
            (0, player_1.addItem)(userId, guildId, 'slime_core', 1);
            await interaction.editReply({ embeds: [simpleEmbed(embeds_1.COLORS.success, '🐾 Bạn thuần hóa được quái và nhận một pet token (slime_core).')], components: [] });
        }
        else {
            await interaction.editReply({ embeds: [simpleEmbed(embeds_1.COLORS.warning, '❌ Thuần hóa thất bại — quái bỏ chạy.')], components: [] });
        }
    }
}
async function showEliteEncounter(interaction, userId, guildId) {
    const player = (0, player_1.getPlayer)(userId, guildId);
    const enemies = (0, enemies_1.getEnemiesForZone)(player.zone_id);
    if (!enemies.length) {
        await interaction.editReply({ embeds: [simpleEmbed(embeds_1.COLORS.info, 'Không có quái phù hợp ở đây.')], components: [] });
        return;
    }
    const base = (0, format_1.pick)(enemies);
    const modifier = (0, format_1.pick)(['Burning', 'Armored', 'Bloodthirsty', 'Cursed', 'Swift']);
    const elite = { ...base, id: base.id + '_elite', name: `${modifier} ${base.name}`, combatBonus: { bonusGold: (0, format_1.randInt)(20, 80), bonusDesc: '💠 Elite bonus' } };
    await interaction.editReply({ embeds: [new discord_js_1.EmbedBuilder().setColor(embeds_1.COLORS.danger).setTitle(`👑 Elite: ${elite.name}`).setDescription(`Một quái cấp cao xuất hiện — ${modifier}.`)], components: [] });
    await new Promise(r => setTimeout(r, 800));
    await (0, combatFlow_1.startCombatFlow)(interaction, userId, guildId, elite.id, handleVictory, handleDeath);
}
async function showRivalAdventurer(interaction, userId, guildId) {
    const player = (0, player_1.getPlayer)(userId, guildId);
    const embed = new discord_js_1.EmbedBuilder().setColor(0x9B59B6).setTitle('⚔️ Rival Adventurer')
        .setDescription('*Bạn gặp một mạo hiểm giả khác trên đường.*\n\n> 🥊 Đấu tay đôi — combat PvE với NPC\n> 🤝 Hợp tác — tăng reward explore tiếp theo\n> 🔁 Trao đổi item — đổi đồ\n> 🗡️ Cướp đồ — nhận item nhưng giảm danh tiếng');
    const row = new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder().setCustomId(`rival_duel_${userId}`).setLabel('Đấu tay đôi').setStyle(discord_js_1.ButtonStyle.Danger), new discord_js_1.ButtonBuilder().setCustomId(`rival_coop_${userId}`).setLabel('Hợp tác').setStyle(discord_js_1.ButtonStyle.Primary), new discord_js_1.ButtonBuilder().setCustomId(`rival_trade_${userId}`).setLabel('Trao đổi').setStyle(discord_js_1.ButtonStyle.Secondary), new discord_js_1.ButtonBuilder().setCustomId(`rival_rob_${userId}`).setLabel('Cướp đồ').setStyle(discord_js_1.ButtonStyle.Danger));
    const { embed: eImg, files } = (0, eventImages_1.withImage)(embed, 'combat');
    const reply = await interaction.editReply({ embeds: [eImg], files, components: [row] });
    const btn = await reply.awaitMessageComponent({ componentType: discord_js_1.ComponentType.Button, filter: i => i.user.id === userId, time: 25000 }).catch(() => null);
    await (btn?.deferUpdate() ?? Promise.resolve());
    if (!btn) {
        await interaction.editReply({ embeds: [simpleEmbed(embeds_1.COLORS.info, 'Người lữ hành kia đi mất...')], components: [] });
        return;
    }
    if (btn.customId === `rival_duel_${userId}`) {
        const npc = { id: 'rival_npc', name: 'Rival Adventurer', icon: '🗡️', level: player.level, hp: Math.floor(60 + player.level * 10), atk: Math.floor(10 + player.level * 2), def: Math.floor(5 + player.level), expReward: 50, goldMin: 20, goldMax: 60, drops: [], specialAttacks: [], zones: [], boss: false, deathWorldFlag: undefined };
        await (0, combatFlow_1.startCombatFlowWithEnemy)(interaction, userId, guildId, npc, { bonusGold: (0, format_1.randInt)(20, 60), bonusDesc: '🥊 Rival thua, bạn thu được một khoản thưởng nhỏ.' }, handleVictory, handleDeath);
    }
    else if (btn.customId === `rival_coop_${userId}`) {
        // set a small bonus flag for next explore
        (0, world_1.setFlag)(guildId, `coop_bonus_${userId}`, '1', 3600);
        await interaction.editReply({ embeds: [simpleEmbed(embeds_1.COLORS.success, '🤝 Bạn hợp tác với rival — khám phá tiếp theo có bonus!')], components: [] });
    }
    else if (btn.customId === `rival_trade_${userId}`) {
        // give a small item
        (0, player_1.addItem)(userId, guildId, 'health_potion', 1);
        await interaction.editReply({ embeds: [simpleEmbed(embeds_1.COLORS.info, '🔁 Bạn trao đổi và nhận 1 Health Potion.')], components: [] });
    }
    else {
        const gold = (0, format_1.randInt)(20, 80);
        (0, player_1.grantGold)(userId, guildId, gold);
        await interaction.editReply({ embeds: [simpleEmbed(embeds_1.COLORS.danger, `🗡️ Bạn cướp đồ và nhận **${gold} Gold**, nhưng lòng tin của bạn giảm (flavor).`)], components: [] });
    }
}
async function showVillageUnderAttack(interaction, userId, guildId) {
    const player = (0, player_1.getPlayer)(userId, guildId);
    const embed = new discord_js_1.EmbedBuilder().setColor(embeds_1.COLORS.danger).setTitle('🏘️ Ngôi Làng Bị Tấn Công')
        .setDescription('*Bạn đến và thấy dân làng đang bị tấn công!*\n\n> 🛡️ Bảo vệ dân làng — khó, reward lớn\n> 🚑 Cứu merchant trước — unlock discount\n> 🧰 Lợi dụng hỗn loạn để loot — nhiều gold nhưng xấu danh tiếng\n> 🚶 Bỏ đi');
    const row = new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder().setCustomId(`village_defend_${userId}`).setLabel('Bảo vệ dân làng').setStyle(discord_js_1.ButtonStyle.Success), new discord_js_1.ButtonBuilder().setCustomId(`village_save_${userId}`).setLabel('Cứu merchant trước').setStyle(discord_js_1.ButtonStyle.Primary), new discord_js_1.ButtonBuilder().setCustomId(`village_loot_${userId}`).setLabel('Loot').setStyle(discord_js_1.ButtonStyle.Danger), new discord_js_1.ButtonBuilder().setCustomId(`village_ignore_${userId}`).setLabel('Bỏ đi').setStyle(discord_js_1.ButtonStyle.Secondary));
    const { embed: eImg, files } = (0, eventImages_1.withImage)(embed, 'villager');
    const reply = await interaction.editReply({ embeds: [eImg], files, components: [row] });
    const btn = await reply.awaitMessageComponent({ componentType: discord_js_1.ComponentType.Button, filter: i => i.user.id === userId, time: 30000 }).catch(() => null);
    await (btn?.deferUpdate() ?? Promise.resolve());
    if (!btn || btn.customId === `village_ignore_${userId}`) {
        await interaction.editReply({ embeds: [simpleEmbed(embeds_1.COLORS.info, '🚶 Bạn bỏ đi... Làng bị tổn thất.')], components: [] });
        // simple world flag for village harmed
        (0, world_1.setWorldEvent)(guildId, 'village_harmed', `${player.name} đã rời làng khi nó bị tấn công.`, 86400);
        return;
    }
    if (btn.customId === `village_loot_${userId}`) {
        const gold = (0, format_1.randInt)(80, 200);
        (0, player_1.grantGold)(userId, guildId, gold);
        await interaction.editReply({ embeds: [simpleEmbed(embeds_1.COLORS.danger, `💰 Bạn lợi dụng hỗn loạn và lấy **${gold} Gold**.`)], components: [] });
        (0, world_1.setWorldEvent)(guildId, 'village_looted', `${player.name} đã loot một làng.`, 86400);
        return;
    }
    if (btn.customId === `village_save_${userId}`) {
        // unlock discount
        (0, world_1.setFlag)(guildId, 'shop_discount', '10', 86400);
        await interaction.editReply({ embeds: [simpleEmbed(embeds_1.COLORS.success, '🛒 Bạn cứu merchant — shop giảm giá 10% trong 24h!')], components: [] });
        return;
    }
    // defend
    const boss = { id: 'village_assailant', name: 'Chỉ Huy Bầy Quái', icon: '👹', level: player.level + 1, hp: Math.floor(80 + player.level * 12), atk: 12 + player.level, def: 5 + player.level, expReward: 80, goldMin: 40, goldMax: 120, drops: [], specialAttacks: [], zones: [], boss: false, deathWorldFlag: undefined };
    await (0, combatFlow_1.startCombatFlowWithEnemy)(interaction, userId, guildId, boss, { bonusGold: (0, format_1.randInt)(100, 220), bonusDesc: '🏅 Dân làng cảm ơn bạn với phần thưởng!' }, handleVictory, handleDeath);
}
async function showBloodAltar(interaction, userId, guildId) {
    const player = (0, player_1.getPlayer)(userId, guildId);
    const embed = new discord_js_1.EmbedBuilder().setColor(0x8E44AD).setTitle('🩸 Tế Đàn Máu')
        .setDescription('*Một tế đàn cổ yêu cầu vật hiến tế.*\n\n> 🩸 Hiến máu — damage buff nhưng mất max HP tạm thời\n> 💰 Hiến gold — luck buff\n> 📚 Hiến item — skill book/cursed item\n> 🔥 Phá tế đàn — spawn boss hoặc xóa curse toàn server');
    const row = new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder().setCustomId(`altar_blood_${userId}`).setLabel('Hiến máu').setStyle(discord_js_1.ButtonStyle.Danger), new discord_js_1.ButtonBuilder().setCustomId(`altar_gold2_${userId}`).setLabel('Hiến gold').setStyle(discord_js_1.ButtonStyle.Primary), new discord_js_1.ButtonBuilder().setCustomId(`altar_item_${userId}`).setLabel('Hiến item').setStyle(discord_js_1.ButtonStyle.Secondary), new discord_js_1.ButtonBuilder().setCustomId(`altar_smash_${userId}`).setLabel('Phá tế đàn').setStyle(discord_js_1.ButtonStyle.Danger));
    const { embed: eImg, files } = (0, eventImages_1.withImage)(embed, 'altar');
    const reply = await interaction.editReply({ embeds: [eImg], files, components: [row] });
    const btn = await reply.awaitMessageComponent({ componentType: discord_js_1.ComponentType.Button, filter: i => i.user.id === userId, time: 30000 }).catch(() => null);
    await (btn?.deferUpdate() ?? Promise.resolve());
    if (!btn) {
        await interaction.editReply({ embeds: [simpleEmbed(embeds_1.COLORS.info, 'Bạn rời tế đàn...')], components: [] });
        return;
    }
    if (btn.customId === `altar_blood_${userId}`) {
        const sacrifice = Math.floor(player.max_hp * 0.15);
        const newHp = Math.max(1, player.hp - sacrifice);
        (0, player_1.updatePlayerHpMp)(userId, guildId, newHp, player.mp);
        (0, player_1.grantSoulShards)(userId, guildId, 3);
        await interaction.editReply({ embeds: [simpleEmbed(embeds_1.COLORS.success, `🩸 Bạn hiến máu −${sacrifice} HP, nhận buff và +3 Soul Shards.`)], components: [] });
    }
    else if (btn.customId === `altar_gold2_${userId}`) {
        if (player.gold < 50) {
            await interaction.editReply({ embeds: [simpleEmbed(embeds_1.COLORS.warning, 'Không đủ gold để hiến.')], components: [] });
            return;
        }
        (0, player_1.spendGold)(userId, guildId, 50);
        (0, world_1.setFlag)(guildId, `luck_${userId}`, '1', 3600);
        await interaction.editReply({ embeds: [simpleEmbed(embeds_1.COLORS.success, '💰 Bạn hiến gold — nhận buff may mắn.')], components: [] });
    }
    else if (btn.customId === `altar_item_${userId}`) {
        // give a skill book or cursed item
        const sk = (0, format_1.pick)(['book_fireball', 'book_iron_skin', 'book_shadow_step']);
        (0, player_1.addItem)(userId, guildId, sk, 1);
        await interaction.editReply({ embeds: [simpleEmbed(embeds_1.COLORS.gold, `📚 Bạn hiến vật phẩm — nhận **${(0, items_1.getItem)(sk)?.name}** (có thể là nguyền).`)], components: [] });
    }
    else {
        // smash: spawn boss or clear curses
        const roll = (0, format_1.randInt)(1, 100);
        if (roll <= 50) {
            const boss = { id: 'altar_keeper', name: 'Guardian of the Altar', icon: '👺', level: player.level + 2, hp: Math.floor(120 + player.level * 18), atk: 18 + player.level * 2, def: 8 + player.level, expReward: 150, goldMin: 120, goldMax: 300, drops: [], specialAttacks: [], zones: [], boss: false, deathWorldFlag: undefined };
            await (0, combatFlow_1.startCombatFlowWithEnemy)(interaction, userId, guildId, boss, { bonusGold: (0, format_1.randInt)(150, 300), bonusDesc: '🧨 Bạn xâm phạm tế đàn và phải chiến đấu với kẻ bảo vệ!' }, handleVictory, handleDeath);
        }
        else {
            // clear global curses
            (0, world_1.setWorldEvent)(guildId, 'altar_cleansed', `${player.name} phá tế đàn và xóa một số lời nguyền.`, 86400);
            await interaction.editReply({ embeds: [simpleEmbed(embeds_1.COLORS.success, '✨ Bạn phá tế đàn — một lời nguyền được xóa (flavor).')], components: [] });
        }
    }
}
async function showPlayerSpirit(interaction, userId, guildId) {
    const player = (0, player_1.getPlayer)(userId, guildId);
    const embed = new discord_js_1.EmbedBuilder().setColor(embeds_1.COLORS.purple).setTitle('👻 Linh Hồn Người Chơi Đã Chết')
        .setDescription(`*Linh hồn lững lờ hiện ra trước bạn...*

> 🗣️ Lắng nghe lời cảnh báo — biết trước event
> ⚱️ Nhận di vật — item nhưng có curse
> ⚔️ Chiến đấu với linh hồn — boss mini
> 🕯️ Cầu siêu — tăng reputation (flavor)`);
    const row = new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder().setCustomId(`sp_listen_${userId}`).setLabel('Lắng nghe').setStyle(discord_js_1.ButtonStyle.Primary), new discord_js_1.ButtonBuilder().setCustomId(`sp_take_${userId}`).setLabel('Nhận di vật').setStyle(discord_js_1.ButtonStyle.Danger), new discord_js_1.ButtonBuilder().setCustomId(`sp_fight_${userId}`).setLabel('Chiến đấu').setStyle(discord_js_1.ButtonStyle.Danger), new discord_js_1.ButtonBuilder().setCustomId(`sp_pray_${userId}`).setLabel('Cầu siêu').setStyle(discord_js_1.ButtonStyle.Success));
    const { embed: eImg, files } = (0, eventImages_1.withImage)(embed, 'legacy');
    const reply = await interaction.editReply({ embeds: [eImg], files, components: [row] });
    const btn = await reply.awaitMessageComponent({ componentType: discord_js_1.ComponentType.Button, filter: i => i.user.id === userId, time: 30000 }).catch(() => null);
    await (btn?.deferUpdate() ?? Promise.resolve());
    if (!btn) {
        await interaction.editReply({ embeds: [simpleEmbed(embeds_1.COLORS.info, 'Linh hồn lẩn vào màn sương...')], components: [] });
        return;
    }
    if (btn.customId === `sp_listen_${userId}`) {
        const hints = ['Sẽ có boss ở hang phía bắc.', 'Chợ sắp có giảm giá.', 'Một rương nguyền gần đây.'];
        await interaction.editReply({ embeds: [simpleEmbed(embeds_1.COLORS.info, `🔮 Linh hồn nói: "${(0, format_1.pick)(hints)}"`)], components: [] });
    }
    else if (btn.customId === `sp_take_${userId}`) {
        const it = (0, format_1.pick)(['ancient_relic', 'cursed_blood', 'book_shadow_step']);
        (0, player_1.addItem)(userId, guildId, it, 1);
        if (it === 'cursed_blood')
            (0, world_1.setFlag)(guildId, `curse_${userId}`, `weaker_potions|2`, 86400);
        await interaction.editReply({ embeds: [simpleEmbed(embeds_1.COLORS.gold, `⚱️ Bạn nhận **${(0, items_1.getItem)(it)?.name}** — may mắn/đáng sợ.`)], components: [] });
    }
    else if (btn.customId === `sp_fight_${userId}`) {
        const boss = { id: 'spirit_boss', name: 'Vengeful Spirit', icon: '👹', level: player.level + 2, hp: Math.floor(100 + player.level * 15), atk: 16 + player.level, def: 6 + player.level, expReward: 120, goldMin: 80, goldMax: 200, drops: [], specialAttacks: [], zones: [], boss: false, deathWorldFlag: undefined };
        await (0, combatFlow_1.startCombatFlowWithEnemy)(interaction, userId, guildId, boss, { bonusGold: (0, format_1.randInt)(80, 200), bonusDesc: '👻 Tinh linh kêu gọi phần thưởng nếu bạn thắng.' }, handleVictory, handleDeath);
    }
    else {
        (0, player_1.grantSoulShards)(userId, guildId, 2);
        await interaction.editReply({ embeds: [simpleEmbed(embeds_1.COLORS.success, '🕯️ Bạn cầu siêu — linh hồn an nghỉ, bạn được ban phước nhẹ.')], components: [] });
    }
}
async function showWheelOfFate(interaction, userId, guildId) {
    const player = (0, player_1.getPlayer)(userId, guildId);
    const cost = 50;
    if (player.gold < cost) {
        await interaction.editReply({ embeds: [simpleEmbed(embeds_1.COLORS.warning, `Cần ${cost} 🪙 để quay.`)], components: [] });
        return;
    }
    (0, player_1.spendGold)(userId, guildId, cost);
    const roll = (0, format_1.randInt)(1, 100);
    if (roll <= 25) {
        (0, player_1.grantGold)(userId, guildId, 200);
        await interaction.editReply({ embeds: [simpleEmbed(embeds_1.COLORS.success, '🎉 Thắng! +200 Gold')], components: [] });
    }
    else if (roll <= 45) {
        (0, player_1.addItem)(userId, guildId, 'elixir', 1);
        await interaction.editReply({ embeds: [simpleEmbed(embeds_1.COLORS.gold, '🎁 Nhận 1 Elixir')], components: [] });
    }
    else if (roll <= 60) {
        (0, world_1.setFlag)(guildId, `luck_${userId}`, '1', 3600);
        await interaction.editReply({ embeds: [simpleEmbed(embeds_1.COLORS.success, '🍀 Nhận buff may mắn 1 giờ')], components: [] });
    }
    else if (roll <= 75) { // boss
        const boss = { id: 'wheel_wrath', name: 'Wrath of Fate', icon: '⚡', level: player.level + 2, hp: Math.floor(110 + player.level * 16), atk: 18 + player.level, def: 8 + player.level, expReward: 140, goldMin: 80, goldMax: 220, drops: [], specialAttacks: [], zones: [], boss: false, deathWorldFlag: undefined };
        await (0, combatFlow_1.startCombatFlowWithEnemy)(interaction, userId, guildId, boss, { bonusGold: (0, format_1.randInt)(80, 220), bonusDesc: '⚡ Sứ mệnh Nghĩa Bài bắt bạn chiến đấu cùng số phận.' }, handleVictory, handleDeath);
    }
    else if (roll <= 90) {
        (0, world_1.setFlag)(guildId, `curse_${userId}`, `random_misfortune|2`, 86400);
        await interaction.editReply({ embeds: [simpleEmbed(embeds_1.COLORS.danger, '💀 Bị curse!')], components: [] });
    }
    else {
        (0, player_1.addItem)(userId, guildId, 'book_fireball', 1);
        await interaction.editReply({ embeds: [simpleEmbed(embeds_1.COLORS.gold, '📚 Nhận skill book hiếm!')], components: [] });
    }
}
async function showAncientLibrary(interaction, userId, guildId) {
    const player = (0, player_1.getPlayer)(userId, guildId);
    const embed = new discord_js_1.EmbedBuilder().setColor(0xF1C40F).setTitle('📚 Thư Viện Cổ')
        .setDescription('*Bạn bước vào thư viện cổ...*\n\n> 📖 Đọc sách chiến đấu — nhận warrior skill book\n> 🔮 Đọc sách ma thuật — nhận mage skill book\n> ☠️ Đọc sách cấm — nhận skill mạnh nhưng bị curse\n> 🔥 Đốt thư viện — nhận gold/material nhưng giảm reputation');
    const row = new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder().setCustomId(`lib_fight_${userId}`).setLabel('Chiến đấu').setStyle(discord_js_1.ButtonStyle.Primary), new discord_js_1.ButtonBuilder().setCustomId(`lib_magic_${userId}`).setLabel('Ma thuật').setStyle(discord_js_1.ButtonStyle.Primary), new discord_js_1.ButtonBuilder().setCustomId(`lib_banned_${userId}`).setLabel('Sách cấm').setStyle(discord_js_1.ButtonStyle.Danger), new discord_js_1.ButtonBuilder().setCustomId(`lib_burn_${userId}`).setLabel('Đốt thư viện').setStyle(discord_js_1.ButtonStyle.Danger));
    const { embed: eImg, files } = (0, eventImages_1.withImage)(embed, 'loot');
    const reply = await interaction.editReply({ embeds: [eImg], files, components: [row] });
    const btn = await reply.awaitMessageComponent({ componentType: discord_js_1.ComponentType.Button, filter: i => i.user.id === userId, time: 30000 }).catch(() => null);
    await (btn?.deferUpdate() ?? Promise.resolve());
    if (!btn) {
        await interaction.editReply({ embeds: [simpleEmbed(embeds_1.COLORS.info, 'Bạn rời thư viện...')], components: [] });
        return;
    }
    if (btn.customId === `lib_fight_${userId}`) {
        (0, player_1.addItem)(userId, guildId, 'book_iron_skin', 1);
        await interaction.editReply({ embeds: [simpleEmbed(embeds_1.COLORS.success, '📖 Nhận Warrior skill book')], components: [] });
    }
    else if (btn.customId === `lib_magic_${userId}`) {
        (0, player_1.addItem)(userId, guildId, 'book_fireball', 1);
        await interaction.editReply({ embeds: [simpleEmbed(embeds_1.COLORS.success, '🔮 Nhận Mage skill book')], components: [] });
    }
    else if (btn.customId === `lib_banned_${userId}`) {
        (0, player_1.addItem)(userId, guildId, 'book_shadow_step', 1);
        (0, world_1.setFlag)(guildId, `curse_${userId}`, `forbidden_tome|3`, 86400);
        await interaction.editReply({ embeds: [simpleEmbed(embeds_1.COLORS.danger, '⚠️ Nhận skill mạnh nhưng bị curse')], components: [] });
    }
    else {
        const gold = (0, format_1.randInt)(30, 120);
        (0, player_1.grantGold)(userId, guildId, gold);
        await interaction.editReply({ embeds: [simpleEmbed(embeds_1.COLORS.warning, `🔥 Bạn đốt thư viện và thu được ${gold} Gold — danh tiếng giảm (flavor).`)], components: [] });
    }
}
async function showDreamEvent(interaction, userId, guildId) {
    const player = (0, player_1.getPlayer)(userId, guildId);
    const roll = (0, format_1.randInt)(1, 100);
    if (roll <= 25) {
        await interaction.editReply({ embeds: [simpleEmbed(embeds_1.COLORS.danger, '🌀 Nightmare! Bạn gặp nightmare enemy trong mơ và mất MP.')], components: [] });
        const newMp = Math.max(0, player.mp - 10);
        (0, player_1.updatePlayerHpMp)(userId, guildId, player.hp, newMp);
    }
    else if (roll <= 60) {
        (0, world_1.setFlag)(guildId, `luck_${userId}`, '1', 3600);
        await interaction.editReply({ embeds: [simpleEmbed(embeds_1.COLORS.success, '💫 Bạn mơ thấy điều tốt — nhận temporary buff.')], components: [] });
    }
    else {
        await interaction.editReply({ embeds: [simpleEmbed(embeds_1.COLORS.info, '💤 Một giấc mơ yên bình — bạn cảm thấy nhẹ nhàng.')], components: [] });
    }
}
async function showSlimeFollower(interaction, userId, guildId) {
    (0, player_1.addItem)(userId, guildId, 'slime_core', 1);
    await interaction.editReply({ embeds: [simpleEmbed(embeds_1.COLORS.success, '🐾 Một con slime bám theo bạn — nhận 1 Slime Core (pet token).')], components: [] });
}
async function showStumbleRock(interaction, userId, guildId) {
    const player = (0, player_1.getPlayer)(userId, guildId);
    const roll = (0, format_1.randInt)(1, 4);
    if (roll === 1) {
        (0, player_1.updatePlayerHpMp)(userId, guildId, Math.max(1, player.hp - 1), player.mp);
        await interaction.editReply({ embeds: [simpleEmbed(embeds_1.COLORS.warning, '🤕 Bạn vấp đá — mất 1 HP.')], components: [] });
    }
    else if (roll === 2) {
        (0, player_1.grantGold)(userId, guildId, 5);
        await interaction.editReply({ embeds: [simpleEmbed(embeds_1.COLORS.gold, '🪙 Bạn nhặt được 5 Gold.')], components: [] });
    }
    else if (roll === 3) {
        (0, player_1.addItem)(userId, guildId, 'herb', 1);
        await interaction.editReply({ embeds: [simpleEmbed(embeds_1.COLORS.info, '🌿 Bạn tìm thấy 1 Herb — con đường bí ẩn được hé lộ.')], components: [] });
    }
    else {
        await interaction.editReply({ embeds: [simpleEmbed(embeds_1.COLORS.info, '😌 Không có gì xảy ra.')], components: [] });
    }
}
async function showBardSinger(interaction, userId, guildId) {
    const player = (0, player_1.getPlayer)(userId, guildId);
    const embed = new discord_js_1.EmbedBuilder().setColor(embeds_1.COLORS.info).setTitle('🎶 Người Hát Rong')
        .setDescription('*Một bard hát trong quán rượu...*\n\n> 🎧 Nghe hát — hồi MP\n> 💸 Tip gold — tăng reputation (flavor)\n> 🎤 Yêu cầu bài hát về mình — unlock title');
    const row = new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder().setCustomId(`bard_listen_${userId}`).setLabel('Nghe hát').setStyle(discord_js_1.ButtonStyle.Primary), new discord_js_1.ButtonBuilder().setCustomId(`bard_tip_${userId}`).setLabel('Tip gold').setStyle(discord_js_1.ButtonStyle.Secondary), new discord_js_1.ButtonBuilder().setCustomId(`bard_req_${userId}`).setLabel('Yêu cầu bài hát').setStyle(discord_js_1.ButtonStyle.Success));
    const { embed: eImg, files } = (0, eventImages_1.withImage)(embed, 'villager');
    const reply = await interaction.editReply({ embeds: [eImg], files, components: [row] });
    const btn = await reply.awaitMessageComponent({ componentType: discord_js_1.ComponentType.Button, filter: i => i.user.id === userId, time: 25000 }).catch(() => null);
    await (btn?.deferUpdate() ?? Promise.resolve());
    if (!btn) {
        await interaction.editReply({ embeds: [simpleEmbed(embeds_1.COLORS.info, 'Bard rời đi...')], components: [] });
        return;
    }
    if (btn.customId === `bard_listen_${userId}`) {
        const mpGain = Math.min(player.max_mp - player.mp, 5);
        (0, player_1.updatePlayerHpMp)(userId, guildId, player.hp, player.mp + mpGain);
        await interaction.editReply({ embeds: [simpleEmbed(embeds_1.COLORS.success, `💧 Nghe hát — hồi ${mpGain} MP.`)], components: [] });
    }
    else if (btn.customId === `bard_tip_${userId}`) {
        if (player.gold < 5) {
            await interaction.editReply({ embeds: [simpleEmbed(embeds_1.COLORS.warning, 'Không đủ gold để tip.')], components: [] });
        }
        else {
            (0, player_1.spendGold)(userId, guildId, 5);
            (0, player_1.grantSoulShards)(userId, guildId, 1);
            await interaction.editReply({ embeds: [simpleEmbed(embeds_1.COLORS.success, '💸 Bạn tip 5 Gold — bard cảm kích (flavor).')], components: [] });
        }
    }
    else {
        (0, player_1.addItem)(userId, guildId, 'title_token', 1);
        await interaction.editReply({ embeds: [simpleEmbed(embeds_1.COLORS.success, '🎤 Bard hát bài ca về bạn — unlock title token.')], components: [] });
    }
}
