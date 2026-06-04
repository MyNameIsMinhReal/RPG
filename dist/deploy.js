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
const commands = [start_1.data, profile_1.data, explore_1.data, inventory_1.data, use_1.data, trade_1.data, achievements_1.data, world_1.data].map(c => c.toJSON());
const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;
if (!token || !clientId) {
    console.error('❌ Thiếu DISCORD_TOKEN hoặc CLIENT_ID');
    process.exit(1);
}
const rest = new discord_js_1.REST().setToken(token);
(async () => {
    try {
        const data = await rest.put(discord_js_1.Routes.applicationCommands(clientId), { body: commands });
        console.log(`✅ Deployed ${data.length} commands:`);
        commands.forEach(c => console.log(`   /${c.name}`));
    }
    catch (err) {
        console.error('❌ Deploy failed:', err);
        process.exit(1);
    }
})();
