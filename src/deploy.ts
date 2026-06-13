import 'dotenv/config';
import { REST, Routes } from 'discord.js';
import { loadCommands } from './commands/registry';

// Slash commands are auto-discovered from ./commands (single source of truth,
// shared with index.ts). Fishing là event trong explore, không có lệnh riêng.
const commands = loadCommands().map(c => c.data.toJSON());

const token    = process.env.DISCORD_TOKEN!;
const clientId = process.env.CLIENT_ID!;
const guildId  = process.env.GUILD_ID;

if (!token || !clientId) {
  console.error('❌ Thiếu DISCORD_TOKEN hoặc CLIENT_ID');
  process.exit(1);
}

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
  try {
    let data: any;

    if (guildId) {
      // Tránh bị x2 lệnh khi chuyển từ global command sang guild command.
      await rest.put(Routes.applicationCommands(clientId), { body: [] });
      data = await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });
      console.log(`✅ Deployed ${data.length} GUILD commands to ${guildId}:`);
    } else {
      data = await rest.put(Routes.applicationCommands(clientId), { body: commands });
      console.log(`✅ Deployed ${data.length} GLOBAL commands:`);
    }

    commands.forEach((c: any) => console.log(`   /${c.name}`));
  } catch (err) {
    console.error('❌ Deploy failed:', err);
    process.exit(1);
  }
})();
