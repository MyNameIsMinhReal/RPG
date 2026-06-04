"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.data = void 0;
exports.execute = execute;
const discord_js_1 = require("discord.js");
const player_1 = require("../systems/player");
const achievements_1 = require("../systems/achievements");
const embeds_1 = require("../utils/embeds");
const items_1 = require("../data/items");
const skills_1 = require("../data/skills");
const format_1 = require("../utils/format");
exports.data = new discord_js_1.SlashCommandBuilder()
    .setName('inventory')
    .setDescription('Quản lý đồ vật, kỹ năng và loadout');
async function execute(interaction) {
    await interaction.deferReply();
    const { id: userId } = interaction.user;
    const guildId = interaction.guildId;
    const player = (0, player_1.getPlayer)(userId, guildId);
    if (!player) {
        await interaction.editReply({ embeds: [new discord_js_1.EmbedBuilder().setColor(embeds_1.COLORS.warning).setDescription('Bạn chưa có nhân vật! Dùng `/start`.')] });
        return;
    }
    await renderTab(interaction, userId, guildId, 'items');
}
// ── Render tab ────────────────────────────────────────────────────────────────
async function renderTab(interaction, userId, guildId, currentTab) {
    const player = (0, player_1.getPlayer)(userId, guildId);
    const inventory = (0, player_1.getInventory)(userId, guildId);
    const pool = (0, player_1.getSkillPool)(userId, guildId);
    const loadout = (0, player_1.getLoadout)(userId, guildId);
    const tabSelect = new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.StringSelectMenuBuilder()
        .setCustomId(`inv_tab_${userId}`)
        .setPlaceholder('Chọn mục...')
        .addOptions([
        new discord_js_1.StringSelectMenuOptionBuilder().setLabel('📦 Vật phẩm').setDescription('Đồ consumable và materials').setValue('items').setDefault(currentTab === 'items'),
        new discord_js_1.StringSelectMenuOptionBuilder().setLabel('🔮 Skill Pool').setDescription('Kỹ năng đã học').setValue('skills').setDefault(currentTab === 'skills'),
        new discord_js_1.StringSelectMenuOptionBuilder().setLabel('📌 Loadout').setDescription('Trang bị 4 slots chiến đấu').setValue('loadout').setDefault(currentTab === 'loadout'),
        new discord_js_1.StringSelectMenuOptionBuilder().setLabel('📚 Skill Books').setDescription('Học kỹ năng mới').setValue('books').setDefault(currentTab === 'books'),
    ]));
    let embed;
    let actionRows = [];
    switch (currentTab) {
        case 'items':
            [embed, actionRows] = buildItemsTab(player, inventory, userId);
            break;
        case 'skills':
            [embed, actionRows] = buildSkillsTab(player, pool, loadout);
            break;
        case 'loadout':
            [embed, actionRows] = buildLoadoutTab(player, pool, loadout, userId);
            break;
        case 'books':
            [embed, actionRows] = buildBooksTab(player, inventory, userId);
            break;
    }
    const allRows = [tabSelect, ...actionRows].slice(0, 5);
    const reply = await interaction.editReply({ embeds: [embed], components: allRows });
    // ── Collector ────────────────────────────────────────────────────
    const collector = reply.createMessageComponentCollector({
        filter: i => i.user.id === userId,
        time: 120_000
    });
    collector.on('collect', async (compInt) => {
        await compInt.deferUpdate();
        collector.stop('action');
        const cid = compInt.customId;
        // Tab switch
        if (cid === `inv_tab_${userId}`) {
            const tab = compInt.values[0];
            await renderTab(interaction, userId, guildId, tab);
            return;
        }
        // ── Items tab actions ──────────────────────────────────────────
        if (cid === `inv_use_${userId}`) {
            const sel = compInt;
            const itemId = sel.values[0].replace('use_', '');
            await handleUseItem(interaction, userId, guildId, itemId);
            return;
        }
        // ── Loadout tab actions ────────────────────────────────────────
        if (cid === `inv_equip_pick_${userId}`) {
            // Pick which skill to equip
            const sel = compInt;
            const skillId = sel.values[0].replace('equip_', '');
            await pickSlotForSkill(interaction, userId, guildId, skillId, loadout);
            return;
        }
        if (cid.startsWith(`inv_setslot_${userId}_`)) {
            // Set slot for skill
            const parts = cid.split('_');
            const slot = parseInt(parts[parts.length - 1]);
            const skillId = compInt.values[0].replace('skill_', '');
            (0, player_1.equipSkill)(userId, guildId, slot, skillId);
            await renderTab(interaction, userId, guildId, 'loadout');
            return;
        }
        if (cid.startsWith(`inv_unequip_${userId}_`)) {
            const slot = parseInt(cid.replace(`inv_unequip_${userId}_`, ''));
            (0, player_1.unequipSkill)(userId, guildId, slot);
            await renderTab(interaction, userId, guildId, 'loadout');
            return;
        }
        // ── Books tab actions ──────────────────────────────────────────
        if (cid === `inv_learn_${userId}`) {
            const sel = compInt;
            const bookId = sel.values[0].replace('learn_', '');
            await handleLearnSkill(interaction, userId, guildId, bookId);
            return;
        }
    });
    collector.on('end', (_c, reason) => {
        if (reason === 'time')
            interaction.editReply({ components: [] }).catch(() => { });
    });
}
// ── Tab: Items ────────────────────────────────────────────────────────────────
function buildItemsTab(player, inventory, userId) {
    const consumables = inventory.filter(e => (0, items_1.getItem)(e.item_id)?.type === 'consumable');
    const materials = inventory.filter(e => (0, items_1.getItem)(e.item_id)?.type === 'material');
    const keyItems = inventory.filter(e => (0, items_1.getItem)(e.item_id)?.type === 'key_item');
    const embed = new discord_js_1.EmbedBuilder()
        .setColor(embeds_1.COLORS.info)
        .setTitle('📦 Vật Phẩm')
        .setDescription(`🪙 Gold: **${player.gold}**  ·  💀 Soul Shards: **${player.soul_shards}**`);
    if (consumables.length) {
        embed.addFields({
            name: '🧪 Consumables',
            value: consumables.map(e => {
                const it = (0, items_1.getItem)(e.item_id);
                return `${it.icon} **${it.name}** ×${e.quantity}  — *${it.description.replace(/\*\*/g, '').slice(0, 40)}*`;
            }).join('\n'),
            inline: false
        });
    }
    if (materials.length) {
        embed.addFields({
            name: '⚗️ Materials',
            value: materials.map(e => {
                const it = (0, items_1.getItem)(e.item_id);
                return `${it.icon} **${it.name}** ×${e.quantity}`;
            }).join('  ·  '),
            inline: false
        });
    }
    if (keyItems.length) {
        embed.addFields({
            name: '🔑 Key Items',
            value: keyItems.map(e => { const it = (0, items_1.getItem)(e.item_id); return `${it.icon} **${it.name}**`; }).join('  ·  '),
            inline: false
        });
    }
    if (!consumables.length && !materials.length && !keyItems.length) {
        embed.setDescription(`🪙 Gold: **${player.gold}**\n\n*Túi đồ trống. Khám phá để tìm đồ hoặc gặp lái buôn!*`);
    }
    const rows = [];
    // Use item select
    if (consumables.length) {
        const options = consumables.map(e => {
            const it = (0, items_1.getItem)(e.item_id);
            return new discord_js_1.StringSelectMenuOptionBuilder()
                .setLabel(`${it.name} ×${e.quantity}`)
                .setDescription(it.description.replace(/\*\*/g, '').slice(0, 50))
                .setValue(`use_${e.item_id}`)
                .setEmoji(it.icon);
        });
        rows.push(new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.StringSelectMenuBuilder()
            .setCustomId(`inv_use_${userId}`)
            .setPlaceholder('🧪 Dùng vật phẩm...')
            .addOptions(options)));
    }
    return [embed, rows];
}
// ── Tab: Skill Pool ───────────────────────────────────────────────────────────
function buildSkillsTab(player, pool, loadout) {
    const typeOrder = ['active', 'passive', 'reaction', 'world'];
    const typeLabels = {
        active: '⚔️ Active', passive: '✨ Passive', reaction: '⚡ Reaction', world: '🌍 World'
    };
    const embed = new discord_js_1.EmbedBuilder()
        .setColor(embeds_1.COLORS.magic)
        .setTitle('🔮 Skill Pool')
        .setDescription(`**${player.name}** đã học **${pool.length}** / 15 kỹ năng.\n*Kỹ năng trong pool không mất khi chết.*`);
    if (!pool.length) {
        embed.setDescription('Chưa học kỹ năng nào!\nGặp lái buôn hoặc tìm Skill Books khi khám phá.');
        return [embed, []];
    }
    for (const type of typeOrder) {
        const skills = pool.map(p => (0, skills_1.getSkill)(p.skill_id)).filter(sk => sk?.type === type);
        if (!skills.length)
            continue;
        embed.addFields({
            name: typeLabels[type],
            value: skills.map(sk => {
                if (!sk)
                    return '';
                const equipped = loadout.find(l => l.skill_id === sk.id);
                const equippedTag = equipped ? ` *(Slot ${equipped.slot})*` : '';
                const mpTag = sk.mpCost ? ` · ${sk.mpCost}MP` : '';
                return `${sk.icon} **${sk.name}**${equippedTag}${mpTag}\n> ${sk.description}`;
            }).join('\n'),
            inline: false
        });
    }
    return [embed, []];
}
// ── Tab: Loadout ───────────────────────────────────────────────────────────────
function buildLoadoutTab(player, pool, loadout, userId) {
    const slotLines = [1, 2, 3, 4].map(slot => {
        const entry = loadout.find(l => l.slot === slot);
        if (!entry)
            return `\`Slot ${slot}\` — *Trống*`;
        const sk = (0, skills_1.getSkill)(entry.skill_id);
        const typeTag = sk ? { active: '⚔️', passive: '✨', reaction: '⚡', world: '🌍' }[sk.type] : '';
        const mpTag = sk?.mpCost ? ` · ${sk.mpCost}MP` : '';
        return `\`Slot ${slot}\` ${sk?.icon ?? '?'} **${sk?.name ?? entry.skill_id}** ${typeTag}${mpTag}`;
    });
    const embed = new discord_js_1.EmbedBuilder()
        .setColor(embeds_1.COLORS.magic)
        .setTitle('📌 Loadout')
        .setDescription('*Tối đa 4 slots. Loadout mất khi chết — pool giữ lại.*\n\n' +
        slotLines.join('\n'));
    const rows = [];
    // Equip: pick skill from pool
    const equippedIds = new Set(loadout.map(l => l.skill_id));
    const equipable = pool.filter(p => {
        const sk = (0, skills_1.getSkill)(p.skill_id);
        return sk && !equippedIds.has(p.skill_id);
    });
    if (equipable.length && loadout.length < 4) {
        const opts = equipable.map(p => {
            const sk = (0, skills_1.getSkill)(p.skill_id);
            return new discord_js_1.StringSelectMenuOptionBuilder()
                .setLabel(sk.name)
                .setDescription(sk.description.replace(/\*\*/g, '').slice(0, 50))
                .setValue(`equip_${sk.id}`)
                .setEmoji(sk.icon);
        });
        rows.push(new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.StringSelectMenuBuilder()
            .setCustomId(`inv_equip_pick_${userId}`)
            .setPlaceholder('📎 Equip kỹ năng...')
            .addOptions(opts)));
    }
    // Unequip buttons for occupied slots
    if (loadout.length) {
        const unequipBtns = loadout.map(entry => {
            const sk = (0, skills_1.getSkill)(entry.skill_id);
            return new discord_js_1.ButtonBuilder()
                .setCustomId(`inv_unequip_${userId}_${entry.slot}`)
                .setLabel(`Gỡ Slot ${entry.slot}`)
                .setEmoji(sk?.icon ?? '❌')
                .setStyle(discord_js_1.ButtonStyle.Secondary);
        });
        rows.push(new discord_js_1.ActionRowBuilder().addComponents(...unequipBtns));
    }
    return [embed, rows];
}
// ── Tab: Skill Books ───────────────────────────────────────────────────────────
function buildBooksTab(player, inventory, userId) {
    const books = inventory.filter(e => (0, items_1.getItem)(e.item_id)?.type === 'skill_book');
    const embed = new discord_js_1.EmbedBuilder()
        .setColor(embeds_1.COLORS.magic)
        .setTitle('📚 Skill Books');
    if (!books.length) {
        embed.setDescription('Không có Skill Book nào trong túi.\nTìm thấy khi chiến đấu hoặc gặp lái buôn!');
        return [embed, []];
    }
    embed.setDescription('Chọn sách để học kỹ năng ngay lập tức.');
    embed.addFields(books.map(e => {
        const it = (0, items_1.getItem)(e.item_id);
        const sk = it.teachesSkill ? (0, skills_1.getSkill)(it.teachesSkill) : null;
        return {
            name: `${it.icon} ${it.name}`,
            value: sk ? `${sk.icon} ${sk.name}\n> ${sk.description}` : it.description,
            inline: false
        };
    }));
    const opts = books.map(e => {
        const it = (0, items_1.getItem)(e.item_id);
        const sk = it.teachesSkill ? (0, skills_1.getSkill)(it.teachesSkill) : null;
        return new discord_js_1.StringSelectMenuOptionBuilder()
            .setLabel(it.name)
            .setDescription(sk ? `Học: ${sk.name}` : 'Skill Book')
            .setValue(`learn_${e.item_id}`)
            .setEmoji(it.icon);
    });
    return [embed, [
            new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.StringSelectMenuBuilder()
                .setCustomId(`inv_learn_${userId}`)
                .setPlaceholder('📖 Chọn sách để học...')
                .addOptions(opts))
        ]];
}
// ── Action: Use item ──────────────────────────────────────────────────────────
async function handleUseItem(interaction, userId, guildId, itemId) {
    const player = (0, player_1.getPlayer)(userId, guildId);
    const item = (0, items_1.getItem)(itemId);
    if (!item?.effect) {
        await renderTab(interaction, userId, guildId, 'items');
        return;
    }
    const qty = (0, player_1.getItemQty)(userId, guildId, itemId);
    if (qty <= 0) {
        await renderTab(interaction, userId, guildId, 'items');
        return;
    }
    let newHp = player.hp, newMp = player.mp;
    const lines = [];
    if (item.effect.hp) {
        const gain = Math.min(item.effect.hp, player.max_hp - player.hp);
        newHp = Math.min(player.max_hp, player.hp + item.effect.hp);
        lines.push(`❤️ +**${gain} HP**  \`${(0, format_1.bar)(newHp, player.max_hp, 8)}\` ${newHp}/${player.max_hp}`);
    }
    if (item.effect.mp) {
        const gain = Math.min(item.effect.mp, player.max_mp - player.mp);
        newMp = Math.min(player.max_mp, player.mp + item.effect.mp);
        lines.push(`💧 +**${gain} MP**  \`${(0, format_1.bar)(newMp, player.max_mp, 8)}\` ${newMp}/${player.max_mp}`);
    }
    (0, player_1.removeItem)(userId, guildId, itemId, 1);
    (0, player_1.updatePlayerHpMp)(userId, guildId, newHp, newMp);
    const inv = (0, player_1.getInventory)(userId, guildId);
    const fresh = (0, player_1.getPlayer)(userId, guildId);
    const [embed, actionRows] = buildItemsTab(fresh, inv, userId);
    embed.spliceFields(0, embed.data.fields?.length ?? 0);
    embed.setDescription(`✅ Dùng **${item.icon} ${item.name}**\n${lines.join('\n')}\n\n` +
        `🪙 Gold: **${fresh.gold}**`);
    const tabSelect = new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.StringSelectMenuBuilder().setCustomId(`inv_tab_${userId}`).setPlaceholder('Chọn mục...').addOptions([
        new discord_js_1.StringSelectMenuOptionBuilder().setLabel('📦 Vật phẩm').setValue('items').setDefault(true),
        new discord_js_1.StringSelectMenuOptionBuilder().setLabel('🔮 Skill Pool').setValue('skills'),
        new discord_js_1.StringSelectMenuOptionBuilder().setLabel('📌 Loadout').setValue('loadout'),
        new discord_js_1.StringSelectMenuOptionBuilder().setLabel('📚 Skill Books').setValue('books'),
    ]));
    await interaction.editReply({ embeds: [embed], components: [tabSelect, ...actionRows].slice(0, 5) });
    // Re-attach collector via renderTab
    setTimeout(() => renderTab(interaction, userId, guildId, 'items'), 200);
}
// ── Action: Pick slot for equip ────────────────────────────────────────────────
async function pickSlotForSkill(interaction, userId, guildId, skillId, loadout) {
    const sk = (0, skills_1.getSkill)(skillId);
    const freeSlots = [1, 2, 3, 4].filter(s => !loadout.find(l => l.slot === s));
    if (!freeSlots.length) {
        await renderTab(interaction, userId, guildId, 'loadout');
        return;
    }
    if (freeSlots.length === 1) {
        (0, player_1.equipSkill)(userId, guildId, freeSlots[0], skillId);
        await renderTab(interaction, userId, guildId, 'loadout');
        return;
    }
    const opts = freeSlots.map(slot => new discord_js_1.StringSelectMenuOptionBuilder().setLabel(`Slot ${slot}`).setValue(`slot_${slot}`));
    const row = new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.StringSelectMenuBuilder()
        .setCustomId(`inv_setslot_${userId}_${skillId}`)
        .setPlaceholder(`Chọn slot cho ${sk.name}...`)
        .addOptions(opts));
    const reply = await interaction.editReply({
        embeds: [new discord_js_1.EmbedBuilder().setColor(embeds_1.COLORS.magic).setDescription(`${sk.icon} **${sk.name}** → chọn slot:`)],
        components: [row]
    });
    const sel = await reply.awaitMessageComponent({
        componentType: discord_js_1.ComponentType.StringSelect,
        filter: i => i.user.id === userId,
        time: 20_000
    }).catch(() => null);
    if (!sel) {
        await renderTab(interaction, userId, guildId, 'loadout');
        return;
    }
    await sel.deferUpdate();
    const slot = Number(sel.values[0].replace('slot_', ''));
    (0, player_1.equipSkill)(userId, guildId, slot, skillId);
    await renderTab(interaction, userId, guildId, 'loadout');
}
// ── Action: Learn skill book ───────────────────────────────────────────────────
async function handleLearnSkill(interaction, userId, guildId, bookId) {
    const item = (0, items_1.getItem)(bookId);
    if (!item?.teachesSkill) {
        await renderTab(interaction, userId, guildId, 'books');
        return;
    }
    const qty = (0, player_1.getItemQty)(userId, guildId, bookId);
    if (qty <= 0) {
        await renderTab(interaction, userId, guildId, 'books');
        return;
    }
    const skill = (0, skills_1.getSkill)(item.teachesSkill);
    if ((0, player_1.hasSkillInPool)(userId, guildId, skill.id)) {
        // Already known — just show updated tab
        await renderTab(interaction, userId, guildId, 'books');
        return;
    }
    (0, player_1.removeItem)(userId, guildId, bookId, 1);
    (0, player_1.addSkillToPool)(userId, guildId, skill.id);
    const achievementMessages = (0, achievements_1.awardAchievements)(userId, guildId);
    // Show success then re-render books tab
    const embed = new discord_js_1.EmbedBuilder().setColor(embeds_1.COLORS.magic)
        .setTitle('📖 Học Kỹ Năng Mới!')
        .setDescription(`**${item.icon} ${item.name}** tan biến thành ánh sáng...\n\n` +
        `${skill.icon} **${skill.name}** thêm vào Skill Pool!\n\n` + skill.description)
        .addFields({ name: 'Loại', value: { active: '⚔️ Active', passive: '✨ Passive', reaction: '⚡ Reaction', world: '🌍 World' }[skill.type], inline: true })
        .setFooter({ text: 'Chuyển sang tab 📌 Loadout để trang bị.' });
    if (achievementMessages.length) {
        embed.addFields({ name: '🏆 Thành tựu mới', value: achievementMessages.join('\n'), inline: false });
    }
    await interaction.editReply({ embeds: [embed], components: [] });
    // Auto switch to books tab after 3s
    setTimeout(() => renderTab(interaction, userId, guildId, 'books'), 2500);
}
