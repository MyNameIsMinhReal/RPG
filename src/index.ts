import 'dotenv/config';
import './utils/installEmbedTextPolish';
import {
  Client,
  GatewayIntentBits,
  Collection,
  ChatInputCommandInteraction,
  Interaction,
  Message,
  User
} from 'discord.js';

import { loadCommands, buildAliasMap } from './commands/registry';
import { sendUnseenLogsDM } from './systems/updateLog';
import { buildHelpGuideEmbeds } from './commands/help';
import { runStartupDataCheck } from './doctor';
import { dispatchCombatInteraction } from './systems/combatFlow';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

type CommandHandler = (i: ChatInputCommandInteraction) => Promise<void>;

// Commands are auto-discovered from ./commands (see registry.ts). Adding a new
// command is just dropping a file there that exports `data` + `execute`
// (and optionally `aliases`) — no edits needed here or in deploy.ts.
const loadedCommands = loadCommands();
const commands = new Collection<string, CommandHandler>();
for (const cmd of loadedCommands) {
  commands.set(cmd.name, cmd.execute);
}
console.log(`📦 Loaded ${commands.size} commands: ${loadedCommands.map(c => c.name).join(', ')}`);

// alias → command-name, derived from each command's own `aliases` export.
const prefixAliases = buildAliasMap(loadedCommands);

// Prefix help uses the same embed guide as /help.


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

  private groupNames(): string[] {
    return this.commandName === 'guild' ? ['war', 'stock'] : [];
  }

  private subIndex(): number {
    return this.getSubcommandGroup(false) ? 1 : 0;
  }

  private payloadTokens(): string[] {
    const start = this.subIndex() + (this.tokens.length ? 1 : 0);
    return this.tokens.slice(start);
  }

  getString(name: string, required = false): string | null {
    let value: string | null = null;
    const sub = this.getSubcommand(false);
    const group = this.getSubcommandGroup(false);
    const payload = this.payloadTokens();

    if (name === 'item' || (this.commandName === 'code' && name === 'code')) {
      value = this.argsText.trim() || null;
    } else if (this.commandName === 'pet' && name === 'pet_id') {
      value = payload[0] ?? null;
    } else if (this.commandName === 'guild' && sub === 'create') {
      if (name === 'tag') value = payload[payload.length - 1] ?? null;
      if (name === 'name') value = payload.slice(0, -1).join(' ') || null;
    } else if (this.commandName === 'guild' && name === 'type' && sub === 'buff') {
      value = payload[0] ?? null;
    } else if (this.commandName === 'guild' && (name === 'name' || name === 'target')) {
      const noNumbers = payload.filter(t => !/^-?\d+$/.test(t));
      value = noNumbers.join(' ') || null;
    } else {
      value = payload.join(' ') || null;
    }

    if (!value && required) throw new Error(`Missing required string option: ${name}`);
    return value;
  }

  getInteger(name: string, required = false): number | null {
    const payload = this.payloadTokens();
    const numericToken = [...payload, ...this.tokens].reverse().find(t => /^-?\d+$/.test(t));
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

  getSubcommand(required = true): string {
    const group = this.getSubcommandGroup(false);
    const idx = group ? 1 : 0;
    if (this.tokens.length > idx) return this.tokens[idx].toLowerCase();
    // Default subcommand per command
    const defaults: Record<string, string> = {
      worldboss: 'status',
      pet:       'list',
      guild:     'info',
      party:     'info',
    };
    const def = defaults[this.commandName];
    if (def) return def;
    if (required) throw new Error(`Missing subcommand for ${this.commandName}`);
    return '';
  }

  getSubcommandGroup(required = true): string | null {
    const first = this.tokens[0]?.toLowerCase();
    if (first && this.groupNames().includes(first)) return first;
    if (required) throw new Error(`Missing subcommand group for ${this.commandName}`);
    return null;
  }
}

class PrefixInteractionAdapter {
  public deferred = false;
  public replied = false;
  public readonly commandName: string;
  public readonly user;
  public readonly guildId;
  public readonly channelId: string;
  public readonly guild;
  public readonly client;
  public readonly channel;
  public readonly options: PrefixCommandOptions;

  private replyMessage: Message | null = null;

  constructor(private readonly sourceMessage: Message, commandName: string, argsText: string) {
    this.commandName = commandName;
    this.user = sourceMessage.author;
    this.guildId = sourceMessage.guildId;
    this.channelId = sourceMessage.channelId;
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
    case 'duel':
      return 'Cách dùng: `rpg duel @user`\nVí dụ: `rpg duel @Minh`';
    case 'party':
      return 'Party:\n`rpg pt` — xem party\n`rpg pt create` — tạo party\n`rpg pt invite @user` — mời người\n`rpg pt kick @user` — đuổi người\n`rpg pt leave` — rời party\n`rpg pt disband` — giải tán party';
    default:
      return null;
  }
}

function validatePrefixCommand(parsed: ParsedPrefixCommand, message: Message): string | null {
  const args = parsed.argsText.trim();

  if (parsed.commandName === 'use' && !args) {
    return getPrefixUsage('use');
  }

  if (parsed.commandName === 'code' && !args) {
    return 'Cách dùng: `rpg code <mã_code>`';
  }

  if (parsed.commandName === 'trade') {
    const hasUser = message.mentions.users.size > 0 || args.split(/\s+/).some(t => Boolean(stripUserMentionToken(t)));
    const hasAmount = /(?:^|\s)\d+(?:\s|$)/.test(args);
    if (!hasUser || !hasAmount) return getPrefixUsage('trade');
  }

  if (parsed.commandName === 'duel') {
    const hasUser = message.mentions.users.size > 0 || args.split(/\s+/).some(t => Boolean(stripUserMentionToken(t)));
    if (!hasUser) return getPrefixUsage('duel');
  }

  if (parsed.commandName === 'party') {
    const sub = args.split(/\s+/).filter(Boolean)[0]?.toLowerCase();
    const valid = new Set(['create', 'invite', 'leave', 'kick', 'disband', 'info']);
    if (sub && !valid.has(sub)) return getPrefixUsage('party');
    if (sub === 'invite' || sub === 'kick') {
      const hasUser = message.mentions.users.size > 0 || args.split(/\s+/).some(t => Boolean(stripUserMentionToken(t)));
      if (!hasUser) return getPrefixUsage('party');
    }
  }

  return null;
}

client.once('ready', (c) => {
  console.log(`✅ Bot ready: ${c.user.tag}`);
  c.user.setActivity('⚔️ Butterfly Effect RPG');
  runStartupDataCheck(); // fail-fast: exits the process if game data has errors
});

client.on('interactionCreate', async (interaction: Interaction) => {
  if (!interaction.isButton() && !interaction.isStringSelectMenu()) return;
  const cid = interaction.customId;
  const isCombat = cid.startsWith('rpg_') || cid.startsWith('shopmercy_');
  if (!isCombat) return;

  const userId  = interaction.user.id;
  const guildId = interaction.guildId;
  if (!guildId) return;

  const deferred = await interaction.deferUpdate().then(() => true).catch(() => false);
  if (!deferred) return;

  await dispatchCombatInteraction(interaction as any, userId, guildId);
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
    if (interaction.guildId) {
      sendUnseenLogsDM(client, interaction.user.id, interaction.guildId).catch(() => {});
    }
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
    await message.reply({ embeds: buildHelpGuideEmbeds(), allowedMentions: { repliedUser: false } }).catch(() => {});
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
    if (message.guildId) {
      sendUnseenLogsDM(client, message.author.id, message.guildId).catch(() => {});
    }
  }
});

function formatDiscordApiError(err: any): string {
  const code = err?.code ?? err?.rawError?.code;
  const message = err?.rawError?.message ?? err?.message ?? String(err);
  const details = err?.rawError?.errors ? `\n${JSON.stringify(err.rawError.errors, null, 2)}` : '';
  return `${message}${code ? ` (code ${code})` : ''}${details}`;
}

process.on('unhandledRejection', (reason: any) => {
  const code = reason?.code ?? reason?.rawError?.code;
  if (code === 10062) {
    console.warn('[PROCESS] Bỏ qua interaction đã hết hạn:', formatDiscordApiError(reason));
    return;
  }
  if (code === 50035) {
    console.warn('[PROCESS] Discord từ chối payload:', formatDiscordApiError(reason));
    return;
  }
  if (reason?.code === 'UND_ERR_CONNECT_TIMEOUT') {
    console.warn('[PROCESS] Discord connection timeout:', reason?.message ?? reason);
    return;
  }
  console.error('[PROCESS] Unhandled rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[PROCESS] Uncaught exception:', err);
});

const token = process.env.DISCORD_TOKEN;
if (!token) { console.error('❌ Thiếu DISCORD_TOKEN'); process.exit(1); }
client.login(token).catch(err => { console.error('❌ Login failed:', err); process.exit(1); });
