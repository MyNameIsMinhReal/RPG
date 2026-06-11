import { Client, EmbedBuilder } from 'discord.js';
import db from '../database/index';

export interface UpdateLog {
  id: number;
  version: string;
  content: string;
  created_at: number;
}

const EMBED_DESCRIPTION_LIMIT = 4096;
const EMBEDS_PER_MESSAGE_LIMIT = 10;

function splitText(text: string, limit = EMBED_DESCRIPTION_LIMIT): string[] {
  if (!text) return ['Không có nội dung.'];

  const chunks: string[] = [];
  let rest = text.trim();

  while (rest.length > limit) {
    let cut = rest.lastIndexOf('\n', limit);
    if (cut < Math.floor(limit * 0.6)) cut = rest.lastIndexOf(' ', limit);
    if (cut < Math.floor(limit * 0.6)) cut = limit;

    chunks.push(rest.slice(0, cut).trimEnd());
    rest = rest.slice(cut).trimStart();
  }

  if (rest) chunks.push(rest);
  return chunks;
}

export function addUpdateLog(version: string, content: string): UpdateLog {
  const info = db.prepare(
    'INSERT INTO update_logs (version, content) VALUES (?, ?)'
  ).run(version, content);
  return db.prepare('SELECT * FROM update_logs WHERE id = ?')
    .get(info.lastInsertRowid) as unknown as UpdateLog;
}

export function getAllUpdateLogs(): UpdateLog[] {
  return db.prepare('SELECT * FROM update_logs ORDER BY id DESC')
    .all() as unknown as UpdateLog[];
}

export function getUnseenLogs(userId: string, guildId: string): UpdateLog[] {
  return db.prepare(`
    SELECT ul.* FROM update_logs ul
    WHERE NOT EXISTS (
      SELECT 1 FROM update_logs_seen uls
      WHERE uls.user_id = ? AND uls.guild_id = ? AND uls.log_id = ul.id
    )
    ORDER BY ul.id ASC
  `).all(userId, guildId) as unknown as UpdateLog[];
}

export function markLogsSeen(userId: string, guildId: string, logIds: number[]): void {
  const insert = db.prepare(
    'INSERT OR IGNORE INTO update_logs_seen (user_id, guild_id, log_id) VALUES (?, ?, ?)'
  );
  for (const id of logIds) insert.run(userId, guildId, id);
}

function buildUpdateLogEmbeds(log: UpdateLog): EmbedBuilder[] {
  const chunks = splitText(log.content);
  return chunks.map((chunk, index) => {
    const title = chunks.length > 1
      ? `📋 Update — ${log.version} (${index + 1}/${chunks.length})`
      : `📋 Update — ${log.version}`;

    return new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle(title.slice(0, 256))
      .setDescription(chunk)
      .setFooter({ text: 'Dùng /help để xem hướng dẫn.' })
      .setTimestamp(log.created_at * 1000);
  });
}

export async function sendUnseenLogsDM(client: Client, userId: string, guildId: string): Promise<void> {
  const unseen = getUnseenLogs(userId, guildId);
  if (!unseen.length) return;

  // Mark seen ngay lập tức để tránh spam nếu DM thất bại
  markLogsSeen(userId, guildId, unseen.map(l => l.id));

  try {
    const user = await client.users.fetch(userId);
    for (const log of unseen) {
      const embeds = buildUpdateLogEmbeds(log);
      for (let i = 0; i < embeds.length; i += EMBEDS_PER_MESSAGE_LIMIT) {
        await user.send({ embeds: embeds.slice(i, i + EMBEDS_PER_MESSAGE_LIMIT) });
      }
    }
  } catch {
    // DM bị tắt hoặc lỗi — đã mark seen rồi nên không cần làm gì thêm
  }
}
