"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const discord_js_1 = require("discord.js");
const start_1 = require("./commands/start");
const profile_1 = require("./commands/profile");
const explore_1 = require("./commands/explore");
const inventory_1 = require("./commands/inventory");
const use_1 = require("./commands/use");
const trade_1 = require("./commands/trade");
const achievements_1 = require("./commands/achievements");
const world_1 = require("./commands/world");
const client = new discord_js_1.Client({ intents: [discord_js_1.GatewayIntentBits.Guilds] });
const commands = new discord_js_1.Collection();
commands.set('start', start_1.execute);
commands.set('profile', profile_1.execute);
commands.set('explore', explore_1.execute);
commands.set('inventory', inventory_1.execute);
commands.set('use', use_1.execute);
commands.set('trade', trade_1.execute);
commands.set('achievements', achievements_1.execute);
commands.set('world', world_1.execute);
client.once('ready', (c) => {
    console.log(`✅ Bot ready: ${c.user.tag}`);
    c.user.setActivity('⚔️ Butterfly Effect RPG');
});
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand())
        return;
    const handler = commands.get(interaction.commandName);
    if (!handler)
        return;
    try {
        await handler(interaction);
    }
    catch (err) {
        console.error(`[CMD] ${interaction.commandName}:`, err);
        const msg = { content: '❌ Có lỗi xảy ra!', ephemeral: true };
        if (interaction.replied || interaction.deferred)
            await interaction.followUp(msg).catch(() => { });
        else
            await interaction.reply(msg).catch(() => { });
    }
});
const token = process.env.DISCORD_TOKEN;
if (!token) {
    console.error('❌ Thiếu DISCORD_TOKEN');
    process.exit(1);
}
client.login(token).catch(err => { console.error('❌ Login failed:', err); process.exit(1); });
