import db from '../database/index';
import { grantGold, grantExp, grantSoulShards } from './player';
import { unlockTitle } from './titles';
import { getChapter, CHAPTERS, MAX_CHAPTER, type ObjType } from '../data/chapters';

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
  return { chapterId, chapter, objectives, allDone, finished };
}

// Grant chapter reward and advance to next chapter. Returns true if claimed.
export function claimChapterReward(userId: string, guildId: string): boolean {
  const chapterId = getCurrentChapterId(userId, guildId);
  const chapter = getChapter(chapterId);
  if (!chapter) return false;

  const allDone = chapter.objectives.every(obj =>
    getObjectiveProgress(userId, guildId, chapterId, obj.id) >= obj.target
  );
  if (!allDone) return false;

  // Grant rewards
  const r = chapter.reward;
  grantGold(userId, guildId, r.gold);
  grantExp(userId, guildId, r.exp);
  if (r.shards) grantSoulShards(userId, guildId, r.shards);
  if (r.titleId) unlockTitle(userId, guildId, r.titleId);

  // Advance
  db.prepare('UPDATE chapter_state SET current_chapter=? WHERE user_id=? AND guild_id=?')
    .run(chapterId + 1, userId, guildId);

  return true;
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
  }
}
