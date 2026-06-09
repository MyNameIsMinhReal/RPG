import 'dotenv/config';
import { REST, Routes } from 'discord.js';
import { data as startData        } from './commands/start';
import { data as profileData      } from './commands/profile';
import { data as exploreData      } from './commands/explore';
import { data as inventoryData    } from './commands/inventory';
import { data as useData          } from './commands/use';
import { data as tradeData        } from './commands/trade';
import { data as craftData        } from './commands/craft';
import { data as dailyData        } from './commands/daily';
import { data as achievementsData } from './commands/achievements';
import { data as worldData        } from './commands/world';
import { data as prestigeData     } from './commands/prestige';
import { data as duelData         } from './commands/duel';
import { data as worldbossData    } from './commands/worldboss';
import { data as guildData        } from './commands/guild';
import { data as petData          } from './commands/pet';
import { data as partyData        } from './commands/party';
import { data as chapterData      } from './commands/chapter';
import { data as codeData         } from './commands/code';

// Slash commands public cho người chơi.
// Fishing là event trong explore, không có lệnh riêng.
const commands = [
  startData,
  profileData,
  exploreData,
  inventoryData,
  useData,
  tradeData,
  craftData,
  dailyData,
  achievementsData,
  worldData,
  prestigeData,
  duelData,
  worldbossData,
  guildData,
  petData,
  partyData,
  chapterData,
  codeData,
].map(c => c.toJSON());

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

    commands.forEach(c => console.log(`   /${c.name}`));
  } catch (err) {
    console.error('❌ Deploy failed:', err);
    process.exit(1);
  }
})();
