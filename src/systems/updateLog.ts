import { Client, EmbedBuilder } from 'discord.js';
import db from '../database/index';

export interface UpdateLog {
  id: number;
  version: string;
  content: string;
  created_at: number;
}

/**
 * Discord embed limits: description <= 4096 chars, field value <= 1024 chars.
 * Long update content used to throw "Invalid Form Body", so always clamp before render.
 */
export function clampLogText(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, Math.max(0, max - 20)).trimEnd() + '\n…đã rút gọn';
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

function buildUpdateLogEmbed(log: UpdateLog): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle(`📋 Update — ${log.version}`)
    .setDescription(clampLogText(log.content, 3900))
    .setFooter({ text: 'Dùng /help để xem hướng dẫn.' })
    .setTimestamp(log.created_at * 1000);
}

export async function sendUnseenLogsDM(client: Client, userId: string, guildId: string): Promise<void> {
  const unseen = getUnseenLogs(userId, guildId);
  if (!unseen.length) return;

  // Mark seen ngay lập tức để tránh spam nếu DM thất bại
  markLogsSeen(userId, guildId, unseen.map(l => l.id));

  try {
    const user = await client.users.fetch(userId);
    for (const log of unseen) {
      await user.send({ embeds: [buildUpdateLogEmbed(log)] });
    }
  } catch {
    // DM bị tắt hoặc lỗi — đã mark seen rồi nên không cần làm gì thêm
  }
}
