import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  Message,
  Client,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ButtonInteraction,
  Interaction
} from 'discord.js';
import {
  addUpdateLog,
  getAllUpdateLogs,
  clampLogText,
  deriveUpdateVersion,
  splitDiscordMessage,
  broadcastUpdateLogDM
} from '../systems/updateLog';
import type { PrefixSpec } from './prefixOptions';

const ALLOWED_IDS = new Set(
  (process.env.BOT_ADMIN_IDS ?? '').split(',').map(s => s.trim()).filter(Boolean)
);

type ComposeSession = {
  userId: string;
  createdAt: number;
};

type PendingDraft = {
  userId: string;
  content: string;
  version: string;
  createdAt: number;
};

const composeSessions = new Map<string, ComposeSession>();
const pendingDrafts = new Map<string, PendingDraft>();
const SESSION_TTL_MS = 10 * 60 * 1000;

export const data = new SlashCommandBuilder()
  .setName('updatelog')
  .setDescription('Quản lý update log')
  .addSubcommand(sub => sub
    .setName('compose')
    .setDescription('Soạn update log qua DM rồi gửi cho toàn bộ người chơi')
  )
  .addSubcommand(sub => sub
    .setName('add')
    .setDescription('Thêm update log mới bằng nội dung nhập trực tiếp')
    .addStringOption(opt => opt.setName('version').setDescription('Tên version, vd: v1.2 hoặc 2026-06-09').setRequired(true))
    .addStringOption(opt => opt.setName('content').setDescription('Nội dung update (hỗ trợ markdown Discord)').setRequired(true))
  )
  .addSubcommand(sub => sub
    .setName('list')
    .setDescription('Xem các update log đã tạo')
  );

export const prefixSpec: PrefixSpec = {
  defaultSub: 'compose',
  parseString(name, ctx) {
    if (ctx.sub === 'add') {
      if (name === 'version') return ctx.payload[0] ?? null;
      if (name === 'content') return ctx.payload.slice(1).join(' ') || null;
    }
    return undefined;
  }
};

function isAdmin(userId: string): boolean {
  return ALLOWED_IDS.has(userId);
}

function cleanupExpiredSessions(): void {
  const now = Date.now();
  for (const [userId, session] of composeSessions.entries()) {
    if (now - session.createdAt > SESSION_TTL_MS) composeSessions.delete(userId);
  }
  for (const [token, draft] of pendingDrafts.entries()) {
    if (now - draft.createdAt > SESSION_TTL_MS) pendingDrafts.delete(token);
  }
}

function randomToken(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-6);
}

function buildPreviewText(version: string, content: string): string {
  const chunks = splitDiscordMessage(content, 1500);
  const preview = chunks[0] ?? content.slice(0, 1500);
  const extra = content.length > preview.length ? '\n\n…Preview đã rút gọn. Khi gửi thật, bot sẽ tự chia thành nhiều DM nếu quá dài.' : '';

  return [
    '📋 **Preview Update Log**',
    `Version tự nhận: **${version}**`,
    '',
    preview,
    extra,
    '',
    'Bấm **Gửi cho người chơi** để broadcast DM, hoặc **Huỷ**.'
  ].join('\n');
}

function buildPreviewButtons(token: string): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`updatelog_send_${token}`)
      .setLabel('Gửi cho người chơi')
      .setEmoji('📨')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`updatelog_cancel_${token}`)
      .setLabel('Huỷ')
      .setEmoji('✖️')
      .setStyle(ButtonStyle.Secondary)
  );
}

async function startDMComposer(client: Client, userId: string): Promise<void> {
  cleanupExpiredSessions();
  composeSessions.set(userId, { userId, createdAt: Date.now() });

  const user = await client.users.fetch(userId);
  await user.send({
    content: [
      '📝 **Soạn Update Log**',
      'Hãy gửi nội dung update log bạn muốn bot DM cho toàn bộ người chơi có profile.',
      '',
      '• Bot sẽ copy gần như nguyên văn nội dung bạn gửi.',
      '• Nếu quá 2000 ký tự, bot sẽ tự chia thành nhiều DM.',
      '• Gửi `huỷ` để hủy phiên soạn.'
    ].join('\n'),
    allowedMentions: { parse: [] }
  });
}

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  if (!isAdmin(interaction.user.id)) {
    await interaction.editReply({ content: '❌ Bạn không có quyền dùng lệnh này.' });
    return;
  }

  const sub = interaction.options.getSubcommand(false) || 'compose';

  if (sub === 'compose') {
    try {
      await startDMComposer(interaction.client, interaction.user.id);
      await interaction.editReply({ content: '✅ Mình đã nhắn riêng cho bạn. Hãy mở DM với bot và gửi nội dung update log.' });
    } catch {
      await interaction.editReply({ content: '❌ Không DM được cho bạn. Hãy mở DM với bot rồi thử lại.' });
    }
    return;
  }

  if (sub === 'add') {
    const version = interaction.options.getString('version', true);
    const content = interaction.options.getString('content', true);
    const log = addUpdateLog(version, content);
    const result = await broadcastUpdateLogDM(interaction.client, log);

    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x57F287)
          .setTitle('✅ Update log đã được tạo và gửi DM')
          .addFields(
            { name: 'ID', value: `#${log.id}`, inline: true },
            { name: 'Version', value: log.version, inline: true },
            { name: 'Đã gửi', value: `${result.success}/${result.targets} người`, inline: true },
            { name: 'Thất bại', value: `${result.failed} người`, inline: true },
            { name: 'Nội dung', value: clampLogText(log.content, 1000) }
          )
          .setFooter({ text: 'Người thất bại thường là do tắt DM hoặc chặn bot.' })
      ]
    });
    return;
  }

  if (sub === 'list') {
    const logs = getAllUpdateLogs().slice(0, 10);
    if (!logs.length) {
      await interaction.editReply({ content: 'Chưa có update log nào.' });
      return;
    }
    const desc = logs.map(l =>
      `**#${l.id} — ${l.version}**\n${l.content.slice(0, 100)}${l.content.length > 100 ? '...' : ''}`
    ).join('\n\n');

    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x5865F2)
          .setTitle('📋 Update Logs (10 gần nhất)')
          .setDescription(clampLogText(desc, 3900))
      ]
    });
  }
}

export async function handleUpdateLogDMMessage(message: Message): Promise<boolean> {
  if (message.author.bot) return false;
  if (message.guildId) return false;
  if (!isAdmin(message.author.id)) return false;

  cleanupExpiredSessions();

  const session = composeSessions.get(message.author.id);
  if (!session) return false;

  const content = message.content.trim();
  if (!content) {
    await message.reply('❌ Nội dung rỗng. Hãy gửi update log dạng text.').catch(() => {});
    return true;
  }

  if (/^(huỷ|huy|cancel|stop)$/i.test(content)) {
    composeSessions.delete(message.author.id);
    await message.reply('✅ Đã huỷ phiên soạn update log.').catch(() => {});
    return true;
  }

  const version = deriveUpdateVersion(content);
  const token = randomToken();
  composeSessions.delete(message.author.id);
  pendingDrafts.set(token, {
    userId: message.author.id,
    content,
    version,
    createdAt: Date.now()
  });

  await message.reply({
    content: buildPreviewText(version, content),
    components: [buildPreviewButtons(token)],
    allowedMentions: { parse: [] }
  }).catch(() => {});

  return true;
}

export function isUpdateLogButtonInteraction(interaction: Interaction): interaction is ButtonInteraction {
  return interaction.isButton() && interaction.customId.startsWith('updatelog_');
}

export async function handleUpdateLogButton(interaction: ButtonInteraction): Promise<boolean> {
  if (!interaction.customId.startsWith('updatelog_')) return false;

  cleanupExpiredSessions();

  if (!isAdmin(interaction.user.id)) {
    await interaction.reply({ content: '❌ Bạn không có quyền dùng nút này.', ephemeral: true }).catch(() => {});
    return true;
  }

  const match = interaction.customId.match(/^updatelog_(send|cancel)_(.+)$/);
  if (!match) return true;

  const action = match[1];
  const token = match[2];
  const draft = pendingDrafts.get(token);

  if (!draft || draft.userId !== interaction.user.id) {
    await interaction.reply({ content: '❌ Phiên update log đã hết hạn hoặc không thuộc về bạn.', ephemeral: true }).catch(() => {});
    return true;
  }

  if (action === 'cancel') {
    pendingDrafts.delete(token);
    await interaction.update({ content: '✅ Đã huỷ update log.', components: [] }).catch(() => {});
    return true;
  }

  await interaction.deferUpdate().catch(() => {});

  const log = addUpdateLog(draft.version, draft.content);
  pendingDrafts.delete(token);

  const result = await broadcastUpdateLogDM(interaction.client, log);

  await interaction.editReply({
    content: [
      '✅ **Đã gửi update log cho người chơi.**',
      `ID: #${log.id}`,
      `Version: ${log.version}`,
      `Thành công: ${result.success}/${result.targets}`,
      `Thất bại: ${result.failed}`,
      '',
      'Người thất bại thường là do tắt DM hoặc chặn bot.'
    ].join('\n'),
    components: []
  }).catch(() => {});

  return true;
}
