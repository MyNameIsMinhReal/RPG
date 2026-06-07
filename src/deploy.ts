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
].map(c => c.toJSON());
const token    = process.env.DISCORD_TOKEN!;
const clientId = process.env.CLIENT_ID!;

if (!token || !clientId) { console.error('❌ Thiếu DISCORD_TOKEN hoặc CLIENT_ID'); process.exit(1); }

const guildId = process.env.GUILD_ID;
const rest = new REST().setToken(token);

function printCommands(prefix: string, data: any): void {
  console.log(`${prefix} ${data.length} commands:`);
  commands.forEach(c => console.log(`   /${c.name}`));
}

(async () => {
  try {
    // Cập nhật global để xóa các slash command cũ như /gather, /fish, /reroll.
    // Global command của Discord có thể mất một lúc mới biến mất hoàn toàn trên client.
    const globalData: any = await rest.put(Routes.applicationCommands(clientId), { body: commands });
    printCommands('✅ Deployed global', globalData);

    // Nếu thêm GUILD_ID vào .env, bot cũng deploy vào server đó để cập nhật gần như ngay lập tức.
    if (guildId) {
      const guildData: any = await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });
      printCommands(`✅ Deployed guild ${guildId}`, guildData);
    } else {
      console.log('ℹ️ Muốn deploy tức thì vào server test, thêm GUILD_ID=<server_id> vào .env rồi chạy npm run deploy.');
    }
  } catch (err) {
    console.error('❌ Deploy failed:', err); process.exit(1);
  }
})();
