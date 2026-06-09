import db from '../database/index';
import { grantGold, grantExp, grantSoulShards } from './player';
import { unlockTitle } from './titles';
import { getChapter, CHAPTERS, MAX_CHAPTER, type Chapter, type ChapterReward, type ObjType } from '../data/chapters';
import { getChapterExploreEventForChapter } from '../data/chapterExploreEvents';

// ── Helpers ────────────────────────────────────────────────────────────────

function getCurrentChapterId(userId: string, guildId: string): number {
  const row = db.prepare('SELECT current_chapter FROM chapter_state WHERE user_id=? AND guild_id=?')
    .get(userId, guildId) as { current_chapter: number } | undefined;
  if (!row) {
    db.prepare('INSERT INTO chapter_state (user_id, guild_id, current_chapter) VALUES (?, ?, 1)')
      .run(userId, guildId);
    return 1;
  }
  return row.current_chapter;
}

function getObjectiveProgress(userId: string, guildId: string, chapterId: number, objId: string): number {
  const row = db.prepare(
    'SELECT progress FROM chapter_progress WHERE user_id=? AND guild_id=? AND chapter_id=? AND obj_id=?'
  ).get(userId, guildId, chapterId, objId) as { progress: number } | undefined;
  return row?.progress ?? 0;
}

function areChapterObjectivesDone(userId: string, guildId: string, chapterId: number, chapter: Chapter): boolean {
  return chapter.objectives.every(obj => getObjectiveProgress(userId, guildId, chapterId, obj.id) >= obj.target);
}

// ── Public API ─────────────────────────────────────────────────────────────

export interface ObjectiveStatus {
  id: string;
  desc: string;
  progress: number;
  target: number;
  done: boolean;
}

export interface ChapterStatus {
  chapterId: number;
  chapter: ReturnType<typeof getChapter>;
  objectives: ObjectiveStatus[];
  allDone: boolean;
  finished: boolean; // all chapters complete
  pendingExploreEvent?: PendingChapterExploreEvent;
}

export interface PendingChapterExploreEvent {
  userId: string;
  guildId: string;
  chapterId: number;
  eventId: string;
  status: 'pending' | 'completed';
}

export interface ChapterClaimResult {
  claimed: boolean;
  chapterId?: number;
  chapter?: Chapter;
  reward?: ChapterReward;
  nextChapter?: Chapter;
  finished?: boolean;
}

export function getChapterStatus(userId: string, guildId: string): ChapterStatus {
  const chapterId = getCurrentChapterId(userId, guildId);
  const finished = chapterId > MAX_CHAPTER;
  const chapter = getChapter(chapterId);

  if (!chapter) {
    return { chapterId, chapter: undefined, objectives: [], allDone: true, finished: true };
  }

  const objectives: ObjectiveStatus[] = chapter.objectives.map(obj => {
    const progress = getObjectiveProgress(userId, guildId, chapterId, obj.id);
    return { id: obj.id, desc: obj.desc, progress, target: obj.target, done: progress >= obj.target };
  });

  const allDone = objectives.every(o => o.done);
  const pendingExploreEvent = getPendingChapterExploreEvent(userId, guildId) ?? undefined;
  return { chapterId, chapter, objectives, allDone, finished, pendingExploreEvent };
}

export function getPendingChapterExploreEvent(userId: string, guildId: string): PendingChapterExploreEvent | null {
  const row = db.prepare(`
    SELECT user_id, guild_id, chapter_id, event_id, status
    FROM chapter_event_state
    WHERE user_id=? AND guild_id=? AND status='pending'
    ORDER BY chapter_id ASC
    LIMIT 1
  `).get(userId, guildId) as { user_id: string; guild_id: string; chapter_id: number; event_id: string; status: 'pending' | 'completed' } | undefined;

  if (!row) return null;
  return {
    userId: row.user_id,
    guildId: row.guild_id,
    chapterId: row.chapter_id,
    eventId: row.event_id,
    status: row.status,
  };
}

export function ensurePendingChapterExploreEvent(userId: string, guildId: string): PendingChapterExploreEvent | null {
  const existing = getPendingChapterExploreEvent(userId, guildId);
  if (existing) return existing;

  const chapterId = getCurrentChapterId(userId, guildId);
  const chapter = getChapter(chapterId);
  if (!chapter) return null;
  if (!areChapterObjectivesDone(userId, guildId, chapterId, chapter)) return null;

  const eventDef = getChapterExploreEventForChapter(chapterId);
  if (!eventDef) return null;

  db.prepare(`
    INSERT INTO chapter_event_state (user_id, guild_id, chapter_id, event_id, status)
    VALUES (?, ?, ?, ?, 'pending')
    ON CONFLICT(user_id, guild_id, chapter_id)
    DO UPDATE SET event_id=excluded.event_id, status='pending', completed_at=NULL
  `).run(userId, guildId, chapterId, eventDef.id);

  return getPendingChapterExploreEvent(userId, guildId);
}

export function clearPendingChapterExploreEvent(userId: string, guildId: string, chapterId: number): void {
  db.prepare(`
    UPDATE chapter_event_state
    SET status='completed', completed_at=unixepoch()
    WHERE user_id=? AND guild_id=? AND chapter_id=? AND status='pending'
  `).run(userId, guildId, chapterId);
}

export function claimChapterRewardDetailed(userId: string, guildId: string): ChapterClaimResult {
  const chapterId = getCurrentChapterId(userId, guildId);
  const chapter = getChapter(chapterId);
  if (!chapter) return { claimed: false };

  if (!areChapterObjectivesDone(userId, guildId, chapterId, chapter)) return { claimed: false };

  // Grant rewards
  const r = chapter.reward;
  grantGold(userId, guildId, r.gold);
  grantExp(userId, guildId, r.exp);
  if (r.shards) grantSoulShards(userId, guildId, r.shards);
  if (r.titleId) unlockTitle(userId, guildId, r.titleId);

  clearPendingChapterExploreEvent(userId, guildId, chapterId);

  // Advance
  db.prepare('UPDATE chapter_state SET current_chapter=? WHERE user_id=? AND guild_id=?')
    .run(chapterId + 1, userId, guildId);

  const nextChapter = getChapter(chapterId + 1);
  return {
    claimed: true,
    chapterId,
    chapter,
    reward: r,
    nextChapter,
    finished: !nextChapter,
  };
}

// Grant chapter reward and advance to next chapter. Returns true if claimed.
export function claimChapterReward(userId: string, guildId: string): boolean {
  return claimChapterRewardDetailed(userId, guildId).claimed;
}

export function completePendingChapterExploreEvent(userId: string, guildId: string): ChapterClaimResult {
  const pending = getPendingChapterExploreEvent(userId, guildId);
  if (!pending) return { claimed: false };
  return claimChapterRewardDetailed(userId, guildId);
}

// Increment an objective counter if it matches one of the current chapter's objectives.
export function incrementChapterObjective(
  userId: string,
  guildId: string,
  type: ObjType,
  extra: { zoneId?: string; enemyId?: string }
): void {
  const chapterId = getCurrentChapterId(userId, guildId);
  const chapter = getChapter(chapterId);
  if (!chapter) return;

  let changed = false;

  for (const obj of chapter.objectives) {
    if (obj.type !== type) continue;
    if (obj.zoneId && obj.zoneId !== extra.zoneId) continue;
    if (obj.enemyId && obj.enemyId !== extra.enemyId) continue;

    // Don't go over target (no need to store excess)
    const current = getObjectiveProgress(userId, guildId, chapterId, obj.id);
    if (current >= obj.target) continue;

    db.prepare(`
      INSERT INTO chapter_progress (user_id, guild_id, chapter_id, obj_id, progress)
      VALUES (?, ?, ?, ?, 1)
      ON CONFLICT(user_id, guild_id, chapter_id, obj_id) DO UPDATE SET progress = progress + 1
    `).run(userId, guildId, chapterId, obj.id);
    changed = true;
  }

  if (changed) ensurePendingChapterExploreEvent(userId, guildId);
}
