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
import { PrefixCommandOptions, stripUserMentionToken, type PrefixSpec } from './commands/prefixOptions';
import { isTransientNetworkError } from './utils/netErrors';
import { sendUnseenLogsDM } from './systems/updateLog';
import { buildHelpGuideEmbeds } from './commands/help';
import { runStartupDataCheck } from './doctor';
import { dispatchCombatInteraction } from './systems/combatFlow';
import db from './database/index';

// One-time GC on boot: expired world_state rows are skipped on read but never
// deleted, so they pile up over months. Sweep them once at startup.
try {
  db.prepare('DELETE FROM world_state WHERE expires_at IS NOT NULL AND expires_at <= ?').run(Math.floor(Date.now() / 1000));
} catch { /* table may not exist on very first run */ }

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  // Global default: never ping the replied-to user; still allow explicit @user/@role.
  allowedMentions: { parse: ['users', 'roles'], repliedUser: false }
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

// Per-command prefix parsing rules, declared by each command's optional
// `prefixSpec` export (keeps command-specific arg parsing out of this file).
const prefixSpecs = new Map<string, PrefixSpec | undefined>(
  loadedCommands.map(c => [c.name, (c as { prefixSpec?: PrefixSpec }).prefixSpec])
);

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
    this.options = new PrefixCommandOptions(sourceMessage, commandName, argsText, prefixSpecs.get(commandName));
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

    if (isTransientNetworkError(err)) {
      console.warn(`[CMD] ${interaction.commandName}: nhiễu mạng Discord (${err?.code ?? err?.message ?? err})`);
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
  } catch (err: any) {
    if (isTransientNetworkError(err)) {
      console.warn(`[PREFIX] rpg ${parsed.alias}: nhiễu mạng Discord (${err?.code ?? err?.message ?? err})`);
      return;
    }

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
  if (isTransientNetworkError(reason)) {
    console.warn('[PROCESS] Nhiễu mạng Discord (bỏ qua, sẽ tự kết nối lại):', reason?.code ?? reason?.message ?? reason);
    return;
  }
  console.error('[PROCESS] Unhandled rejection:', reason);
});

process.on('uncaughtException', (err: any) => {
  if (isTransientNetworkError(err)) {
    console.warn('[PROCESS] Nhiễu mạng Discord (bỏ qua, sẽ tự kết nối lại):', err?.code ?? err?.message ?? err);
    return;
  }
  console.error('[PROCESS] Uncaught exception:', err);
});

// Gateway resilience: log gọn các sự kiện shard/kết nối thay vì để chúng nổ
// thành unhandled error. discord.js tự reconnect — ta chỉ cần không sập.
client.on('error', (err) => console.warn('[GATEWAY] Client error (tự kết nối lại):', err?.message ?? err));
client.on('shardError', (err, id) => console.warn(`[GATEWAY] Shard ${id} lỗi (tự kết nối lại):`, err?.message ?? err));
client.on('shardDisconnect', (event, id) => console.warn(`[GATEWAY] Shard ${id} ngắt kết nối (code ${(event as any)?.code ?? '?'}) — đang chờ kết nối lại...`));
client.on('shardReconnecting', (id) => console.warn(`[GATEWAY] Shard ${id} đang kết nối lại...`));
client.on('shardResume', (id) => console.log(`[GATEWAY] Shard ${id} đã kết nối lại ✅`));

const token = process.env.DISCORD_TOKEN;
if (!token) { console.error('❌ Thiếu DISCORD_TOKEN'); process.exit(1); }
client.login(token).catch(err => { console.error('❌ Login failed:', err); process.exit(1); });
