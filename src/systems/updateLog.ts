import { Client, EmbedBuilder } from 'discord.js';
import db from '../database/index';

export interface UpdateLog {
  id: number;
  version: string;
  content: string;
  created_at: number;
}

export interface UpdateLogTarget {
  user_id: string;
  guild_id: string;
}

export interface BroadcastResult {
  success: number;
  failed: number;
  targets: number;
}

/**
 * Discord embed limits: description <= 4096 chars, field value <= 1024 chars.
 * Long update content used to throw "Invalid Form Body", so always clamp before render.
 */
export function clampLogText(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, Math.max(0, max - 20)).trimEnd() + '\n…đã rút gọn';
}

export function splitDiscordMessage(text: string, maxLength = 1900): string[] {
  const chunks: string[] = [];
  let current = '';

  for (const line of text.split('\n')) {
    const next = current ? `${current}\n${line}` : line;
    if (next.length > maxLength) {
      if (current.trim()) chunks.push(current);

      if (line.length > maxLength) {
        for (let i = 0; i < line.length; i += maxLength) {
          chunks.push(line.slice(i, i + maxLength));
        }
        current = '';
      } else {
        current = line;
      }
    } else {
      current = next;
    }
  }

  if (current.trim()) chunks.push(current);
  return chunks.length ? chunks : [''];
}

export function deriveUpdateVersion(content: string): string {
  const firstLine = content.split('\n').map(l => l.trim()).find(Boolean) ?? '';
  const cleaned = firstLine
    .replace(/^#+\s*/g, '')
    .replace(/[*_`~|]/g, '')
    .replace(/:[a-z0-9_+-]+:/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (cleaned) return cleaned.slice(0, 80);

  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `Update ${yyyy}-${mm}-${dd}`;
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

export function getAllPlayerUpdateTargets(): UpdateLogTarget[] {
  return db.prepare(`
    SELECT DISTINCT user_id, guild_id
    FROM players
    WHERE user_id IS NOT NULL AND guild_id IS NOT NULL
  `).all() as unknown as UpdateLogTarget[];
}

function buildUpdateLogText(log: UpdateLog): string {
  return log.content.trim();
}

function buildUpdateLogEmbed(log: UpdateLog): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle(`📋 Update — ${log.version}`)
    .setDescription(clampLogText(log.content, 3900))
    .setFooter({ text: 'Dùng /help để xem hướng dẫn.' })
    .setTimestamp(log.created_at * 1000);
}

export async function sendLogToUserDM(client: Client, userId: string, log: UpdateLog): Promise<void> {
  const user = await client.users.fetch(userId);
  const chunks = splitDiscordMessage(buildUpdateLogText(log), 1900);

  for (const chunk of chunks) {
    await user.send({ content: chunk, allowedMentions: { parse: [] } });
  }
}

export async function broadcastUpdateLogDM(client: Client, log: UpdateLog): Promise<BroadcastResult> {
  const targets = getAllPlayerUpdateTargets();
  const guildsByUser = new Map<string, Set<string>>();

  for (const target of targets) {
    if (!guildsByUser.has(target.user_id)) guildsByUser.set(target.user_id, new Set());
    guildsByUser.get(target.user_id)!.add(target.guild_id);
  }

  let success = 0;
  let failed = 0;

  for (const [userId, guildIds] of guildsByUser.entries()) {
    // Mark seen trước để người tắt DM không bị spam lại mỗi lần dùng lệnh.
    for (const guildId of guildIds) markLogsSeen(userId, guildId, [log.id]);

    try {
      await sendLogToUserDM(client, userId, log);
      success++;
    } catch {
      failed++;
    }
  }

  return { success, failed, targets: guildsByUser.size };
}

export async function sendUnseenLogsDM(client: Client, userId: string, guildId: string): Promise<void> {
  const unseen = getUnseenLogs(userId, guildId);
  if (!unseen.length) return;

  // Mark seen ngay lập tức để tránh spam nếu DM thất bại
  markLogsSeen(userId, guildId, unseen.map(l => l.id));

  try {
    for (const log of unseen) {
      try {
        await sendLogToUserDM(client, userId, log);
      } catch {
        // Fallback embed nếu Discord từ chối raw content vì markdown quá lạ.
        const user = await client.users.fetch(userId);
        await user.send({ embeds: [buildUpdateLogEmbed(log)] });
      }
    }
  } catch {
    // DM bị tắt hoặc lỗi — đã mark seen rồi nên không cần làm gì thêm
  }
}
