"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.COLORS = void 0;
exports.simpleEmbed = simpleEmbed;
exports.buildProfileEmbed = buildProfileEmbed;
exports.buildCombatEmbed = buildCombatEmbed;
exports.buildCombatButtons = buildCombatButtons;
exports.buildSkillSelectMenu = buildSkillSelectMenu;
exports.buildVictoryEmbed = buildVictoryEmbed;
exports.buildDeathEmbed = buildDeathEmbed;
exports.buildExploreEmbed = buildExploreEmbed;
exports.buildExploreButtons = buildExploreButtons;
const discord_js_1 = require("discord.js");
const format_1 = require("./format");
const skills_1 = require("../data/skills");
const zones_1 = require("../data/zones");
// ── Color palette ───────────────────────────────────────────────────────────
exports.COLORS = {
    success: 0x57F287, // green
    danger: 0xED4245, // red
    warning: 0xFEE75C, // yellow
    magic: 0xEB459E, // pink
    gold: 0xF1C40F, // gold
    info: 0x5865F2, // blurple
    dark: 0x23272A, // dark
    purple: 0x9B59B6, // purple
    death: 0x2C2F33, // near black
};
// ── Simple embeds ───────────────────────────────────────────────────────────
function simpleEmbed(color, desc) {
    return new discord_js_1.EmbedBuilder().setColor(color).setDescription(desc);
}
// ── Profile embed ─────────────────────────────────────────────────────────
function buildProfileEmbed(player, loadout, avatarURL, achievementSummary) {
    const zone = (0, zones_1.getZone)(player.zone_id);
    const aliveStatus = player.alive ? '🟢 Alive' : '💀 Dead';
    const skillSlots = [1, 2, 3, 4].map(slot => {
        const entry = loadout.find(l => l.slot === slot);
        if (!entry)
            return `\`${slot}\` —`;
        const sk = (0, skills_1.getSkill)(entry.skill_id);
        return `\`${slot}\` ${sk?.icon ?? '❓'} ${sk?.name ?? entry.skill_id}`;
    }).join('  ');
    return new discord_js_1.EmbedBuilder()
        .setColor(player.alive ? exports.COLORS.success : exports.COLORS.death)
        .setTitle(`${player.alive ? '⚔️' : '💀'} ${player.name}`)
        .setDescription(`${zone?.icon ?? '❓'} **${zone?.name ?? player.zone_id}**  ·  ${aliveStatus}`)
        .setThumbnail(avatarURL ?? null)
        .addFields({
        name: '── Stats ──',
        value: [
            `❤️  HP  \`${(0, format_1.bar)(player.hp, player.max_hp)}\` ${(0, format_1.hpLabel)(player.hp, player.max_hp)}`,
            `💧  MP  \`${(0, format_1.bar)(player.mp, player.max_mp)}\` ${player.mp}/${player.max_mp}`,
            `⭐  EXP \`${(0, format_1.bar)(player.exp, player.exp_next)}\` ${player.exp}/${player.exp_next}`,
        ].join('\n'),
        inline: false
    }, {
        name: '⚔️ ATK', value: `**${player.atk}**`, inline: true
    }, {
        name: '🛡️ DEF', value: `**${player.def}**`, inline: true
    }, {
        name: '🏅 Level', value: `**${player.level}**`, inline: true
    }, {
        name: '🪙 Gold', value: `**${player.gold.toLocaleString()}**`, inline: true
    }, {
        name: '💀 Soul Shards', value: `**${player.soul_shards}**`, inline: true
    }, {
        name: '☠️ Deaths / 🗡️ Kills', value: `**${player.deaths}** / **${player.kills}**`, inline: true
    }, {
        name: '🏆 Thành tựu', value: `**${achievementSummary?.unlocked ?? 0}/${achievementSummary?.total ?? 0}** đã mở`, inline: true
    }, {
        name: '🔮 Skill Loadout',
        value: skillSlots || '*(Chưa equip skill nào)*',
        inline: false
    })
        .setFooter({ text: `Lần đầu chơi: <t:${player.created_at}:D>` });
}
function buildCombatEmbed(state, playerName, enemyIcon, logLines) {
    const effects = JSON.parse(state.active_effects || '[]');
    const effectStr = effects.length
        ? effects.map(e => `\`${e.name}\` ×${e.duration}`).join('  ')
        : '*Không có hiệu ứng*';
    const logStr = logLines.slice(-4).join('\n') || '*...*';
    return new discord_js_1.EmbedBuilder()
        .setColor(exports.COLORS.dark)
        .setTitle(`⚔️ COMBAT — Lượt ${state.turn}`)
        .setDescription(`**${playerName}** vs **${enemyIcon} ${state.enemy_name}**`)
        .addFields({
        name: `❤️ ${playerName}`,
        value: `\`${(0, format_1.bar)(state.player_hp, state.player_max_hp)}\` ${(0, format_1.hpLabel)(state.player_hp, state.player_max_hp)}\n💧 MP: ${state.player_mp}/${state.player_max_mp}`,
        inline: true
    }, {
        name: `${enemyIcon} ${state.enemy_name}`,
        value: `\`${(0, format_1.bar)(state.enemy_hp, state.enemy_max_hp)}\` ${(0, format_1.hpLabel)(state.enemy_hp, state.enemy_max_hp)}`,
        inline: true
    }, {
        name: '✨ Hiệu ứng active', value: effectStr, inline: false
    }, {
        name: '📜 Combat Log', value: logStr, inline: false
    });
}
// ── Combat action buttons ─────────────────────────────────────────────────
function buildCombatButtons(userId, hasSkills) {
    return new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder()
        .setCustomId(`rpg_attack_${userId}`)
        .setLabel('Tấn công')
        .setEmoji('⚔️')
        .setStyle(discord_js_1.ButtonStyle.Danger), new discord_js_1.ButtonBuilder()
        .setCustomId(`rpg_skill_${userId}`)
        .setLabel('Kỹ năng')
        .setEmoji('🔮')
        .setStyle(discord_js_1.ButtonStyle.Primary)
        .setDisabled(!hasSkills), new discord_js_1.ButtonBuilder()
        .setCustomId(`rpg_defend_${userId}`)
        .setLabel('Phòng thủ')
        .setEmoji('🛡️')
        .setStyle(discord_js_1.ButtonStyle.Secondary), new discord_js_1.ButtonBuilder()
        .setCustomId(`rpg_flee_${userId}`)
        .setLabel('Bỏ chạy')
        .setEmoji('🏃')
        .setStyle(discord_js_1.ButtonStyle.Secondary));
}
// ── Skill select menu ─────────────────────────────────────────────────────
function buildSkillSelectMenu(userId, loadout, playerMp) {
    const options = loadout.map(entry => {
        const sk = (0, skills_1.getSkill)(entry.skill_id);
        const canAfford = !sk.mpCost || playerMp >= sk.mpCost;
        const label = `[${entry.slot}] ${sk.name}`;
        const desc = sk.mpCost ? `${sk.mpCost} MP${canAfford ? '' : ' (không đủ MP)'}` : 'Passive/World';
        return new discord_js_1.StringSelectMenuOptionBuilder()
            .setLabel(label)
            .setDescription(desc)
            .setValue(`rpg_useskill_${userId}_${sk.id}`)
            .setEmoji(sk.icon);
    });
    return new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.StringSelectMenuBuilder()
        .setCustomId(`rpg_skillmenu_${userId}`)
        .setPlaceholder('Chọn kỹ năng để sử dụng...')
        .addOptions(options));
}
// ── Victory embed ─────────────────────────────────────────────────────────
function buildVictoryEmbed(playerName, enemyName, enemyIcon, expGained, goldGained, drops, leveledUp, newLevel) {
    const dropStr = drops.length ? drops.join(', ') : '*Không có*';
    let desc = `Đã đánh bại **${enemyIcon} ${enemyName}**!\n\n`;
    desc += `+${expGained} ⭐ EXP  ·  +${goldGained} 🪙 Gold\n`;
    desc += `📦 Loot: ${dropStr}`;
    if (leveledUp)
        desc += `\n\n🎉 **LEVEL UP!** → Lv.**${newLevel}**`;
    return new discord_js_1.EmbedBuilder()
        .setColor(exports.COLORS.gold)
        .setTitle('🏆 Chiến thắng!')
        .setDescription(desc);
}
// ── Death embed ───────────────────────────────────────────────────────────
function buildDeathEmbed(playerName, enemyName, goldLeft) {
    return new discord_js_1.EmbedBuilder()
        .setColor(exports.COLORS.death)
        .setTitle('☠️ Bạn đã chết...')
        .setDescription(`**${playerName}** đã ngã xuống trước **${enemyName}**.\n\n` +
        `🪙 **${goldLeft}** gold rơi lại tại nơi bạn tử trận.\n` +
        `💀 Soul Shard nhận được như phần thưởng.\n\n` +
        `*Dùng \`/start\` để hồi sinh và bắt đầu lại...*\n` +
        `*Những kỹ năng đã học vẫn còn đó. Nhưng thế giới đã thay đổi.*`);
}
// ── Explore embed ─────────────────────────────────────────────────────────
function buildExploreEmbed(playerName, zoneId, ambiance, legacyCount, bossSlain) {
    const zone = (0, zones_1.getZone)(zoneId);
    return new discord_js_1.EmbedBuilder()
        .setColor(zone.color)
        .setTitle(`${zone.icon} ${zone.name}`)
        .setDescription(`*${ambiance}*`)
        .addFields({
        name: '👤 Explorer', value: playerName, inline: true
    }, {
        name: '👻 Di Sản', value: `${legacyCount} legacy trong zone này`, inline: true
    }, {
        name: '👑 Boss', value: bossSlain ? '✅ Đã bị tiêu diệt' : '⚠️ Vẫn còn đó', inline: true
    })
        .setFooter({ text: 'Chọn hành động bên dưới' });
}
function buildExploreButtons(userId, isSafe, hasBoss) {
    const row = new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder()
        .setCustomId(`rpg_exsearch_${userId}`)
        .setLabel('Khám phá')
        .setEmoji('🗺️')
        .setStyle(discord_js_1.ButtonStyle.Primary)
        .setDisabled(isSafe), new discord_js_1.ButtonBuilder()
        .setCustomId(`rpg_exboss_${userId}`)
        .setLabel('Thách Boss')
        .setEmoji('👑')
        .setStyle(discord_js_1.ButtonStyle.Danger)
        .setDisabled(isSafe || !hasBoss), new discord_js_1.ButtonBuilder()
        .setCustomId(`rpg_exlegacy_${userId}`)
        .setLabel('Di Sản')
        .setEmoji('👻')
        .setStyle(discord_js_1.ButtonStyle.Secondary), new discord_js_1.ButtonBuilder()
        .setCustomId(`rpg_exrest_${userId}`)
        .setLabel('Nghỉ ngơi')
        .setEmoji('💤')
        .setStyle(discord_js_1.ButtonStyle.Secondary));
    return row;
}
