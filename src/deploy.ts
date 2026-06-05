import 'dotenv/config';
import { REST, Routes } from 'discord.js';
import { data as startData     } from './commands/start';
import { data as profileData   } from './commands/profile';
import { data as exploreData   } from './commands/explore';
import { data as inventoryData } from './commands/inventory';
import { data as useData       } from './commands/use';
import { data as tradeData     } from './commands/trade';
import { data as dailyData     } from './commands/daily';
import { data as rerollData    } from './commands/reroll';
import { data as achievementsData } from './commands/achievements';
import { data as worldData } from './commands/world';

const commands = [
  startData,
  profileData,
  exploreData,
  inventoryData,
  useData,
  tradeData,
  dailyData,
  rerollData,
  achievementsData,
  worldData
].map(c => c.toJSON());
const token    = process.env.DISCORD_TOKEN!;
const clientId = process.env.CLIENT_ID!;

if (!token || !clientId) { console.error('❌ Thiếu DISCORD_TOKEN hoặc CLIENT_ID'); process.exit(1); }

const rest = new REST().setToken(token);
(async () => {
  try {
    const data: any = await rest.put(Routes.applicationCommands(clientId), { body: commands });
    console.log(`✅ Deployed ${data.length} commands:`);
    commands.forEach(c => console.log(`   /${c.name}`));
  } catch (err) {
    console.error('❌ Deploy failed:', err); process.exit(1);
  }
})();
