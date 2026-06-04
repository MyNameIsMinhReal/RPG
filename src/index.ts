import 'dotenv/config';
import { Client, GatewayIntentBits, Collection, ChatInputCommandInteraction, Interaction } from 'discord.js';

import { data as startData,     execute as execStart     } from './commands/start';
import { data as profileData,   execute as execProfile   } from './commands/profile';
import { data as exploreData,   execute as execExplore   } from './commands/explore';
import { data as inventoryData, execute as execInventory } from './commands/inventory';
import { data as useData,       execute as execUse       } from './commands/use';
import { data as tradeData,     execute as execTrade     } from './commands/trade';
import { data as achievementsData, execute as execAchievements } from './commands/achievements';
import { data as worldData, execute as execWorld } from './commands/world';

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

type CommandHandler = (i: ChatInputCommandInteraction) => Promise<void>;
const commands = new Collection<string, CommandHandler>();
commands.set('start',     execStart);
commands.set('profile',   execProfile);
commands.set('explore',   execExplore);
commands.set('inventory', execInventory);
commands.set('use',       execUse);
commands.set('trade',     execTrade);
commands.set('achievements', execAchievements);
commands.set('world', execWorld);

client.once('ready', (c) => {
  console.log(`✅ Bot ready: ${c.user.tag}`);
  c.user.setActivity('⚔️ Butterfly Effect RPG');
});

client.on('interactionCreate', async (interaction: Interaction) => {
  if (!interaction.isChatInputCommand()) return;
  const handler = commands.get(interaction.commandName);
  if (!handler) return;
  try {
    await handler(interaction);
  } catch (err) {
    console.error(`[CMD] ${interaction.commandName}:`, err);
    const msg = { content: '❌ Có lỗi xảy ra!', ephemeral: true };
    if (interaction.replied || interaction.deferred) await interaction.followUp(msg).catch(() => {});
    else await interaction.reply(msg).catch(() => {});
  }
});

const token = process.env.DISCORD_TOKEN;
if (!token) { console.error('❌ Thiếu DISCORD_TOKEN'); process.exit(1); }
client.login(token).catch(err => { console.error('❌ Login failed:', err); process.exit(1); });
