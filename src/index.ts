import 'dotenv/config';
import {
  Client,
  GatewayIntentBits,
  Collection,
  ChatInputCommandInteraction,
  Interaction,
  Message,
  User
} from 'discord.js';

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
import { data as worldData,     execute as execWorld     } from './commands/world';
import { data as prestigeData,  execute as execPrestige  } from './commands/prestige';
import { data as fishData,      execute as execFish      } from './commands/fish';
import { data as gatherData,    execute as execGather    } from './commands/gather';
import { data as worldbossData, execute as execWorldboss } from './commands/worldboss';
import { data as duelData,      execute as execDuel      } from './commands/duel';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

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
commands.set('world',     execWorld);
commands.set('prestige',  execPrestige);
commands.set('fish',      execFish);
commands.set('gather',    execGather);
commands.set('worldboss', execWorldboss);
commands.set('duel',      execDuel);

const prefixAliases = new Map<string, string>([
  // Start / revive
  ['s', 'start'],
  ['start', 'start'],
  ['begin', 'start'],
  ['new', 'start'],
  ['revive', 'start'],
  ['respawn', 'start'],

  // Profile
  ['p', 'profile'],
  ['pf', 'profile'],
  ['me', 'profile'],
  ['profile', 'profile'],

  // Explore
  ['e', 'explore'],
  ['ex', 'explore'],
  ['explore', 'explore'],
  ['x', 'explore'],

  // Inventory
  ['i', 'inventory'],
  ['inv', 'inventory'],
  ['bag', 'inventory'],
  ['items', 'inventory'],
  ['inventory', 'inventory'],

  // Use item
  ['u', 'use'],
  ['use', 'use'],
  ['useitem', 'use'],

  // Trade gold
  ['t', 'trade'],
  ['trade', 'trade'],
  ['give', 'trade'],
  ['pay', 'trade'],
  ['send', 'trade'],

  // Craft
  ['c', 'craft'],
  ['craft', 'craft'],
  ['make', 'craft'],

  // Daily
  ['d', 'daily'],
  ['daily', 'daily'],
  ['quest', 'daily'],
  ['quests', 'daily'],

  // Reroll
  ['r', 'reroll'],
  ['rr', 'reroll'],
  ['reroll', 'reroll'],

  // Achievements
  ['a', 'achievements'],
  ['ach', 'achievements'],
  ['achievement', 'achievements'],
  ['achievements', 'achievements'],

  // World
  ['w', 'world'],
  ['world', 'world'],
  ['server', 'world'],

  // Prestige
  ['prestige', 'prestige'],
  ['pr', 'prestige'],

  // Fish
  ['fish', 'fish'],
  ['f', 'fish'],

  // Gather
  ['gather', 'gather'],
  ['g', 'gather'],
  ['mine', 'gather'],

  // World Boss
  ['worldboss', 'worldboss'],
  ['wb', 'worldboss'],
  ['boss', 'worldboss'],

  // Duel
  ['duel', 'duel'],
  ['pvp', 'duel'],
]);

const PREFIX_HELP = [
  '**Prefix commands:**',
  '`rpg s` / `rpg start` — tạo nhân vật hoặc hồi sinh',
  '`rpg p` / `rpg profile` — xem profile của bạn',
  '`rpg p @user` — xem profile người khác',
  '`rpg e` / `rpg explore` — khám phá',
  '`rpg i` / `rpg inv` — túi đồ',
  '`rpg u <item_id>` — dùng vật phẩm, ví dụ `rpg u healing_potion`',
  '`rpg t @user <gold>` — chuyển gold, ví dụ `rpg t @Minh 100`',
  '`rpg c` / `rpg craft` — chế tạo',
  '`rpg d` / `rpg daily` — daily quest',
  '`rpg rr` / `rpg reroll` — reroll skill book',
  '`rpg a` / `rpg ach` — thành tựu',
  '`rpg w` / `rpg world` — trạng thái thế giới',
].join('\n');

function stripInteractionOnlyOptions(options: any): any {
  if (typeof options === 'string') {
    return { content: options, allowedMentions: { repliedUser: false } };
  }

  const { flags, ephemeral, ...rest } = options ?? {};
  return {
    ...rest,
    allowedMentions: rest.allowedMentions ?? { repliedUser: false }
  };
}

function stripUserMentionToken(token: string): string | null {
  const match = token.match(/^<@!?(\d+)>$/) ?? token.match(/^(\d{15,25})$/);
  return match?.[1] ?? null;
}

class PrefixCommandOptions {
  private readonly tokens: string[];

  constructor(
    private readonly sourceMessage: Message,
    private readonly commandName: string,
    private readonly argsText: string
  ) {
    this.tokens = argsText.trim().split(/\s+/).filter(Boolean);
  }

  getString(name: string, required = false): string | null {
    let value: string | null = null;

    if (name === 'item') {
      value = this.argsText.trim() || null;
    } else {
      value = this.tokens.join(' ') || null;
    }

    if (!value && required) throw new Error(`Missing required string option: ${name}`);
    return value;
  }

  getInteger(name: string, required = false): number | null {
    const numericToken = [...this.tokens].reverse().find(t => /^-?\d+$/.test(t));
    const value = numericToken ? Number.parseInt(numericToken, 10) : null;

    if (value === null && required) throw new Error(`Missing required integer option: ${name}`);
    return value;
  }

  getUser(name: string, required = false): User | null {
    const mentioned = this.sourceMessage.mentions.users.first();
    if (mentioned) return mentioned;

    for (const token of this.tokens) {
      const id = stripUserMentionToken(token);
      if (!id) continue;

      const cached = this.sourceMessage.client.users.cache.get(id);
      if (cached) return cached;

      const member = this.sourceMessage.guild?.members.cache.get(id);
      if (member?.user) return member.user;
    }

    if (required) throw new Error(`Missing required user option: ${name}`);
    return null;
  }
}

class PrefixInteractionAdapter {
  public deferred = false;
  public replied = false;
  public readonly commandName: string;
  public readonly user;
  public readonly guildId;
  public readonly guild;
  public readonly client;
  public readonly channel;
  public readonly options: PrefixCommandOptions;

  private replyMessage: Message | null = null;

  constructor(private readonly sourceMessage: Message, commandName: string, argsText: string) {
    this.commandName = commandName;
    this.user = sourceMessage.author;
    this.guildId = sourceMessage.guildId;
    this.guild = sourceMessage.guild;
    this.client = sourceMessage.client;
    this.channel = sourceMessage.channel;
    this.options = new PrefixCommandOptions(sourceMessage, commandName, argsText);
  }

  isRepliable(): boolean {
    return true;
  }

  async deferReply(_options?: any): Promise<Message | undefined> {
    if (this.deferred || this.replied) return this.replyMessage ?? undefined;

    this.replyMessage = await this.sourceMessage.reply({
      content: '⏳ Đang xử lý...',
      allowedMentions: { repliedUser: false }
    });

    this.deferred = true;
    return this.replyMessage;
  }

  async reply(options: any): Promise<Message> {
    const messageOptions = stripInteractionOnlyOptions(options);
    this.replyMessage = await this.sourceMessage.reply(messageOptions);
    this.replied = true;
    return this.replyMessage;
  }

  async editReply(options: any): Promise<Message> {
    const messageOptions = stripInteractionOnlyOptions(options);

    if (this.replyMessage) {
      this.replyMessage = await this.replyMessage.edit(messageOptions);
      this.replied = true;
      return this.replyMessage;
    }

    this.replyMessage = await this.sourceMessage.reply(messageOptions);
    this.replied = true;
    return this.replyMessage;
  }

  async followUp(options: any): Promise<Message> {
    const messageOptions = stripInteractionOnlyOptions(options);
    return (this.sourceMessage.channel as any).send(messageOptions) as Promise<Message>;
  }

  async fetchReply(): Promise<Message> {
    if (this.replyMessage) return this.replyMessage;
    return this.deferReply().then((m) => {
      if (!m) throw new Error('Unable to create prefix reply message.');
      return m;
    });
  }
}

type ParsedPrefixCommand = {
  commandName: string;
  alias: string;
  argsText: string;
};

function parsePrefixCommand(content: string): ParsedPrefixCommand | null {
  const trimmed = content.trim();
  const match = trimmed.match(/^rpg(?:\s+(\S+))?(?:\s+([\s\S]*))?$/i);
  if (!match) return null;

  const alias = (match[1] ?? 'help').toLowerCase();
  if (alias === 'help' || alias === 'h' || alias === '?') {
    return { commandName: 'help', alias, argsText: '' };
  }

  const commandName = prefixAliases.get(alias);
  if (!commandName) return { commandName: 'unknown', alias, argsText: match[2] ?? '' };

  return { commandName, alias, argsText: match[2] ?? '' };
}

function getPrefixUsage(commandName: string): string | null {
  switch (commandName) {
    case 'use':
      return 'Cách dùng: `rpg u <item_id>`\nVí dụ: `rpg u healing_potion`';
    case 'trade':
      return 'Cách dùng: `rpg t @user <gold>`\nVí dụ: `rpg t @Minh 100`';
    default:
      return null;
  }
}

function validatePrefixCommand(parsed: ParsedPrefixCommand, message: Message): string | null {
  const args = parsed.argsText.trim();

  if (parsed.commandName === 'use' && !args) {
    return getPrefixUsage('use');
  }

  if (parsed.commandName === 'trade') {
    const hasUser = message.mentions.users.size > 0 || args.split(/\s+/).some(t => Boolean(stripUserMentionToken(t)));
    const hasAmount = /(?:^|\s)\d+(?:\s|$)/.test(args);
    if (!hasUser || !hasAmount) return getPrefixUsage('trade');
  }

  return null;
}

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

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  const parsed = parsePrefixCommand(message.content);
  if (!parsed) return;

  if (!message.guildId) {
    await message.reply('❌ Lệnh RPG chỉ dùng trong server Discord.').catch(() => {});
    return;
  }

  if (parsed.commandName === 'help') {
    await message.reply({ content: PREFIX_HELP, allowedMentions: { repliedUser: false } }).catch(() => {});
    return;
  }

  if (parsed.commandName === 'unknown') {
    await message.reply({
      content: `❌ Không biết lệnh \`rpg ${parsed.alias}\`. Dùng \`rpg help\` để xem danh sách lệnh.`,
      allowedMentions: { repliedUser: false }
    }).catch(() => {});
    return;
  }

  const usageError = validatePrefixCommand(parsed, message);
  if (usageError) {
    await message.reply({ content: usageError, allowedMentions: { repliedUser: false } }).catch(() => {});
    return;
  }

  const handler = commands.get(parsed.commandName);
  if (!handler) return;

  const prefixInteraction = new PrefixInteractionAdapter(message, parsed.commandName, parsed.argsText);
  let timeout: NodeJS.Timeout | null = null;

  try {
    timeout = setTimeout(() => {
      if (prefixInteraction.deferred && !prefixInteraction.replied) {
        prefixInteraction.editReply({
          content: '⚠️ Bot xử lý hơi lâu hoặc bị kẹt. Thử lại sau vài giây nhé.',
          embeds: [],
          components: [],
          files: []
        }).catch(() => {});
      }
    }, 15_000);

    await handler(prefixInteraction as unknown as ChatInputCommandInteraction);
  } catch (err) {
    console.error(`[PREFIX] rpg ${parsed.alias}:`, err);

    if (prefixInteraction.deferred || prefixInteraction.replied) {
      await prefixInteraction.editReply({
        content: '❌ Có lỗi xảy ra khi xử lý lệnh text. Thử lại sau nhé.',
        embeds: [],
        components: [],
        files: []
      }).catch(() => {});
    } else {
      await message.reply({
        content: '❌ Có lỗi xảy ra khi xử lý lệnh text. Thử lại sau nhé.',
        allowedMentions: { repliedUser: false }
      }).catch(() => {});
    }
  } finally {
    if (timeout) clearTimeout(timeout);
  }
});

const token = process.env.DISCORD_TOKEN;
if (!token) { console.error('❌ Thiếu DISCORD_TOKEN'); process.exit(1); }
client.login(token).catch(err => { console.error('❌ Login failed:', err); process.exit(1); });
