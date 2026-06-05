import 'dotenv/config';
import { Client, GatewayIntentBits, Collection, ChatInputCommandInteraction, Interaction } from 'discord.js';

import { data as startData,     execute as execStart     } from './commands/start';
import { data as profileData,   execute as execProfile   } from './commands/profile';
import { data as exploreData,   execute as execExplore   } from './commands/explore';
import { data as inventoryData, execute as execInventory } from './commands/inventory';
import { data as useData,       execute as execUse       } from './commands/use';
import { data as tradeData,     execute as execTrade     } from './commands/trade';
import { data as craftData,     execute as execCraft     } from './commands/craft';
import { data as dailyData,     execute as execDaily     } from './commands/daily';
import { data as rerollData,    execute as execReroll    } from './commands/reroll';
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
commands.set('craft',     execCraft);
commands.set('daily',     execDaily);
commands.set('reroll',    execReroll);
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

  let timeout: NodeJS.Timeout | null = null;

  try {
    timeout = setTimeout(() => {
      if (interaction.deferred && !interaction.replied) {
        interaction.editReply({
          content: '⚠️ Bot xử lý hơi lâu hoặc bị kẹt. Thử lại sau vài giây nhé.',
          embeds: [],
          components: [],
          files: []
        }).catch(() => {});
      }
    }, 15_000);

    await handler(interaction);
  } catch (err: any) {
    if (err?.code === 10062) {
      console.warn(`[CMD] ${interaction.commandName}: interaction expired/unknown`);
      return;
    }

    console.error(`[CMD] ${interaction.commandName}:`, err);

    if (!interaction.isRepliable()) return;

    if (interaction.deferred) {
      await interaction.editReply({
        content: '❌ Có lỗi xảy ra khi xử lý lệnh. Thử lại sau nhé.',
        embeds: [],
        components: [],
        files: []
      }).catch(() => {});
    } else if (interaction.replied) {
      await interaction.followUp({
        content: '❌ Có lỗi xảy ra khi xử lý lệnh. Thử lại sau nhé.',
        flags: 64
      }).catch(() => {});
    } else {
      await interaction.reply({
        content: '❌ Có lỗi xảy ra khi xử lý lệnh. Thử lại sau nhé.',
        flags: 64
      }).catch(() => {});
    }
  } finally {
    if (timeout) clearTimeout(timeout);
  }
});

const token = process.env.DISCORD_TOKEN;
if (!token) { console.error('❌ Thiếu DISCORD_TOKEN'); process.exit(1); }
client.login(token).catch(err => { console.error('❌ Login failed:', err); process.exit(1); });
