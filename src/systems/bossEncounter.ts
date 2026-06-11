import { getEnemy } from '../data/enemies';
import type { EchoRoleId, EchoRitualResult } from './echoDemonRitual';
import { deleteFlag, getFlag, setFlag } from './world';

export type BossEncounterPhase = 'summoning' | 'active';

export interface BossEncounter {
  guildId: string;
  zoneId: string;
  bossId: string;
  summonerId: string;
  participantIds: string[];
  participantRoles?: Record<string, EchoRoleId>;
  echoRitual?: EchoRitualResult;
  phase: BossEncounterPhase;
  createdAt: number;
  expiresAt: number;
}

export const BOSS_ENCOUNTER_TTL = 10 * 60; // 10 phút chờ người chơi tham gia
export const BOSS_MAX_PARTICIPANTS = 4;

function key(zoneId: string): string {
  return `boss_lobby_${zoneId}`;
}

function nowSec(): number {
  return Math.floor(Date.now() / 1000);
}

function normalizeEncounter(raw: any, guildId: string, zoneId: string): BossEncounter | null {
  if (!raw || typeof raw !== 'object') return null;
  const bossId = String(raw.bossId ?? '');
  const boss = getEnemy(bossId);
  if (!boss || !boss.boss) return null;
  const participantIds: string[] = Array.isArray(raw.participantIds)
    ? Array.from(new Set<string>(raw.participantIds.map((id: unknown) => String(id)).filter(Boolean))).slice(0, BOSS_MAX_PARTICIPANTS)
    : [];
  const encounter: BossEncounter = {
    guildId,
    zoneId: String(raw.zoneId ?? zoneId),
    bossId,
    summonerId: String(raw.summonerId ?? participantIds[0] ?? ''),
    participantIds,
    participantRoles: raw.participantRoles && typeof raw.participantRoles === 'object' ? raw.participantRoles : {},
    echoRitual: raw.echoRitual && typeof raw.echoRitual === 'object' ? raw.echoRitual : undefined,
    phase: raw.phase === 'active' ? 'active' : 'summoning',
    createdAt: Number(raw.createdAt ?? nowSec()),
    expiresAt: Number(raw.expiresAt ?? (nowSec() + BOSS_ENCOUNTER_TTL)),
  };
  if (!encounter.summonerId || encounter.zoneId !== zoneId || encounter.expiresAt <= nowSec()) return null;
  return encounter;
}

function saveEncounter(encounter: BossEncounter): void {
  const ttl = Math.max(5, encounter.expiresAt - nowSec());
  setFlag(encounter.guildId, key(encounter.zoneId), JSON.stringify(encounter), ttl);
}

export function getBossEncounter(guildId: string, zoneId: string): BossEncounter | null {
  const raw = getFlag(guildId, key(zoneId));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    const encounter = normalizeEncounter(parsed, guildId, zoneId);
    if (!encounter) {
      clearBossEncounter(guildId, zoneId);
      return null;
    }
    return encounter;
  } catch {
    clearBossEncounter(guildId, zoneId);
    return null;
  }
}

export function createBossEncounter(guildId: string, zoneId: string, bossId: string, summonerId: string, extra?: Partial<Pick<BossEncounter, 'participantRoles' | 'echoRitual'>>): BossEncounter {
  const now = nowSec();
  const encounter: BossEncounter = {
    guildId,
    zoneId,
    bossId,
    summonerId,
    participantIds: [summonerId],
    participantRoles: extra?.participantRoles ?? {},
    echoRitual: extra?.echoRitual,
    phase: 'summoning',
    createdAt: now,
    expiresAt: now + BOSS_ENCOUNTER_TTL,
  };
  saveEncounter(encounter);
  return encounter;
}

export function joinBossEncounter(guildId: string, zoneId: string, userId: string): BossEncounter | null {
  const encounter = getBossEncounter(guildId, zoneId);
  if (!encounter) return null;
  if (!encounter.participantIds.includes(userId)) {
    if (encounter.participantIds.length >= BOSS_MAX_PARTICIPANTS) return encounter;
    encounter.participantIds.push(userId);
    saveEncounter(encounter);
  }
  return encounter;
}

export function leaveBossEncounter(guildId: string, zoneId: string, userId: string): BossEncounter | null {
  const encounter = getBossEncounter(guildId, zoneId);
  if (!encounter) return null;
  encounter.participantIds = encounter.participantIds.filter(id => id !== userId);
  if (encounter.participantRoles) delete encounter.participantRoles[userId];
  if (encounter.participantIds.length === 0 || encounter.summonerId === userId) {
    clearBossEncounter(guildId, zoneId);
    return null;
  }
  saveEncounter(encounter);
  return encounter;
}


export function setBossEncounterRole(guildId: string, zoneId: string, userId: string, role: EchoRoleId): BossEncounter | null {
  const encounter = getBossEncounter(guildId, zoneId);
  if (!encounter || !encounter.participantIds.includes(userId)) return encounter;
  encounter.participantRoles = { ...(encounter.participantRoles ?? {}), [userId]: role };
  saveEncounter(encounter);
  return encounter;
}

export function allBossEncounterParticipantsHaveRoles(encounter: BossEncounter | null): boolean {
  if (!encounter || encounter.bossId !== 'echo_demon') return true;
  const roles = encounter.participantRoles ?? {};
  return encounter.participantIds.length > 0 && encounter.participantIds.every(id => !!roles[id]);
}

export function setBossEncounterActive(guildId: string, zoneId: string): BossEncounter | null {
  const encounter = getBossEncounter(guildId, zoneId);
  if (!encounter) return null;
  encounter.phase = 'active';
  encounter.expiresAt = nowSec() + BOSS_ENCOUNTER_TTL;
  saveEncounter(encounter);
  return encounter;
}

export function clearBossEncounter(guildId: string, zoneId: string): void {
  deleteFlag(guildId, key(zoneId));
}

export function getBossEncounterRemaining(encounter: BossEncounter): number {
  return Math.max(0, encounter.expiresAt - nowSec());
}

export function isBossEncounterParticipant(encounter: BossEncounter | null, userId: string): boolean {
  return !!encounter?.participantIds.includes(userId);
}
