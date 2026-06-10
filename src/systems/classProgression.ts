import db from '../database/index';
import { getPlayer, getItemQty, removeItem, spendGold, changePlayerClass, grantGold } from './player';
import { getAwakeningForClass, isAwakenedClass, type ClassAwakeningDef } from '../data/classProgression';
import { CLASSES } from '../data/classes';
import { getItem } from '../data/items';
import { getMaterial } from '../data/materials';
import { logEvent } from './world';
import { unlockAchievement } from './achievements';

export interface AwakeningStatus {
  def?: ClassAwakeningDef;
  currentClassId: string;
  currentClassName: string;
  alreadyAwakened: boolean;
  canAwaken: boolean;
  missing: string[];
}

function itemName(itemId: string): string {
  const def = getItem(itemId) ?? getMaterial(itemId);
  return def ? `${def.icon} ${def.name}` : itemId;
}

export function getAwakeningStatus(userId: string, guildId: string): AwakeningStatus | null {
  const player = getPlayer(userId, guildId) as any;
  if (!player) return null;

  const currentClassId = player.class ?? 'warrior';
  const currentClass = CLASSES[currentClassId] ?? CLASSES.warrior;
  const alreadyAwakened = isAwakenedClass(currentClassId);
  const def = getAwakeningForClass(currentClassId);
  const missing: string[] = [];

  if (alreadyAwakened) {
    return { currentClassId, currentClassName: currentClass.name, alreadyAwakened, canAwaken: false, missing: ['Class này đã Awaken rồi.'] };
  }

  if (!def) {
    return { currentClassId, currentClassName: currentClass.name, alreadyAwakened, canAwaken: false, missing: ['Class này chưa có nhánh Awaken.'] };
  }

  if (player.level < def.requirement.level) missing.push(`Lv.${def.requirement.level} trở lên`);
  if (player.gold < def.requirement.gold) missing.push(`${def.requirement.gold.toLocaleString()} Gold`);
  if ((player.soul_shards ?? 0) < (def.requirement.soulShards ?? 0)) missing.push(`${def.requirement.soulShards} Soul Shard`);
  for (const req of def.requirement.items ?? []) {
    const have = getItemQty(userId, guildId, req.itemId);
    if (have < req.qty) missing.push(`${itemName(req.itemId)} x${req.qty} (đang có ${have})`);
  }

  return {
    def,
    currentClassId,
    currentClassName: currentClass.name,
    alreadyAwakened,
    canAwaken: missing.length === 0,
    missing,
  };
}

export function awakenClass(userId: string, guildId: string): { ok: boolean; status?: AwakeningStatus; reason?: string; toClassId?: string } {
  const status = getAwakeningStatus(userId, guildId);
  if (!status) return { ok: false, reason: 'not_found' };
  if (!status.def) return { ok: false, status, reason: 'no_path' };
  if (!status.canAwaken) return { ok: false, status, reason: 'missing_requirements' };

  const player = getPlayer(userId, guildId) as any;
  if (!player) return { ok: false, reason: 'not_found' };

  if (!spendGold(userId, guildId, status.def.requirement.gold)) return { ok: false, status, reason: 'gold_changed' };
  const soulCost = status.def.requirement.soulShards ?? 0;
  if (soulCost > 0) {
    db.prepare('UPDATE players SET soul_shards = soul_shards - ? WHERE user_id=? AND guild_id=?')
      .run(soulCost, userId, guildId);
  }
  for (const req of status.def.requirement.items ?? []) removeItem(userId, guildId, req.itemId, req.qty);

  const changed = changePlayerClass(userId, guildId, status.def.to);
  if (!changed.ok) {
    // Best-effort rollback only for gold; item rollback is intentionally avoided to prevent dupes if data changed mid-command.
    grantGold(userId, guildId, status.def.requirement.gold);
    return { ok: false, status, reason: changed.reason ?? 'change_failed' };
  }

  logEvent(guildId, userId, player.name, 'class_awaken', `đã Awaken thành ${status.def.icon} ${status.def.name}.`, player.zone_id);
  unlockAchievement(userId, guildId, 'first_awakening');
  return { ok: true, status, toClassId: status.def.to };
}
