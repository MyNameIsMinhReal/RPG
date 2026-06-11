import db from '../database/index';

export interface WorldFlag {
  guild_id: string; flag_key: string; flag_value: string;
  expires_at: number | null; created_at: number;
}

export interface EventEntry {
  id: number; guild_id: string; user_id: string; player_name: string;
  event_type: string; description: string; zone_id: string | null; created_at: number;
}

// ── World flags ───────────────────────────────────────────────────────────
export function getFlag(guildId: string, key: string): string | null {
  const now = Math.floor(Date.now() / 1000);
  const row = db.prepare(`
    SELECT flag_value FROM world_state
    WHERE guild_id=? AND flag_key=? AND (expires_at IS NULL OR expires_at > ?)
  `).get(guildId, key, now) as unknown as { flag_value: string } | undefined;
  return row?.flag_value ?? null;
}

export function setFlag(guildId: string, key: string, value: string, ttlSeconds?: number): void {
  const expiresAt = ttlSeconds ? Math.floor(Date.now() / 1000) + ttlSeconds : null;
  db.prepare(`
    INSERT OR REPLACE INTO world_state (guild_id, flag_key, flag_value, expires_at)
    VALUES (?, ?, ?, ?)
  `).run(guildId, key, value, expiresAt);
}

export function setWorldEvent(guildId: string, eventKey: string, description: string, ttlSeconds?: number): void {
  setFlag(guildId, `event_${eventKey}`, description, ttlSeconds);
}

export function deleteFlag(guildId: string, key: string): void {
  db.prepare('DELETE FROM world_state WHERE guild_id=? AND flag_key=?').run(guildId, key);
}

export function getAllFlags(guildId: string): WorldFlag[] {
  const now = Math.floor(Date.now() / 1000);
  return db.prepare(`
    SELECT * FROM world_state
    WHERE guild_id=? AND (expires_at IS NULL OR expires_at > ?)
    ORDER BY created_at DESC
  `).all(guildId, now) as unknown as WorldFlag[];
}

// ── Per-player boss progression ───────────────────────────────────────────
export function hasPlayerClearedBoss(guildId: string, userId: string, bossId: string): boolean {
  return getFlag(guildId, `boss_cleared_${userId}_${bossId}`) !== null;
}

export function markPlayerClearedBoss(guildId: string, userId: string, bossId: string): void {
  setFlag(guildId, `boss_cleared_${userId}_${bossId}`, '1');
}

export function clearPlayerBossProgress(guildId: string, userId: string, bossId?: string): number {
  if (bossId) {
    return db.prepare(
      `DELETE FROM world_state WHERE guild_id=? AND flag_key=?`
    ).run(guildId, `boss_cleared_${userId}_${bossId}`).changes as number;
  }
  return db.prepare(
    `DELETE FROM world_state WHERE guild_id=? AND flag_key LIKE ?`
  ).run(guildId, `boss_cleared_${userId}_%`).changes as number;
}

// ── Butterfly effect triggers ─────────────────────────────────────────────
export function onBossKilled(guildId: string, bossId: string, playerName: string, zoneId: string): string {
  const flagKey = `boss_${bossId}_slain`;
  setFlag(guildId, flagKey, playerName);

  // Each boss death has cascading world consequences
  const consequences: Record<string, string> = {
    ancient_oak_slain:      '🌳 Ancient Oak đã ngã xuống — rừng bị bóng tối lấn chiếm, drop rate tăng 20% trong rừng.',
    echo_demon_slain:       '👁️ Echo Demon đã bị phong ấn lại — Ô Nhiễm Linh Hồn trong Đền Cổ dịu xuống, shop giảm 10% trong 24h.',
    mine_colossus_slain:    '⛏️ Mine Colossus đã sụp đổ — mạch quặng mở ra, giá shop giảm 15% trong 24h.',
    the_forgotten_slain:    '❓ The Forgotten đã bị lãng quên — thực tại ổn định, toàn bộ player được +10% EXP trong 48h.'
  };

  // Set mechanic flags
  if (bossId === 'ancient_oak') {
    setFlag(guildId, 'forest_drop_bonus', '20', 86400);
    setWorldEvent(guildId, 'ancient_oak_fall', consequences['ancient_oak_slain'] ?? 'Ancient Oak đã bị tiêu diệt.', 86400);
  }
  if (bossId === 'echo_demon') {
    setFlag(guildId, 'shop_discount', '10', 86400);
    setWorldEvent(guildId, 'echo_demon_sealed', consequences['echo_demon_slain'] ?? 'Echo Demon đã bị phong ấn lại.', 86400);
  }
  if (bossId === 'mine_colossus') {
    setFlag(guildId, 'shop_discount', '15', 86400);
    setWorldEvent(guildId, 'mine_colossus_fall', consequences['mine_colossus_slain'] ?? 'Mine Colossus đã sụp đổ.', 86400);
  }
  if (bossId === 'the_forgotten') {
    setFlag(guildId, 'global_exp_bonus', '10', 172800);
    setWorldEvent(guildId, 'the_forgotten_fall', consequences['the_forgotten_slain'] ?? 'The Forgotten đã bị tiêu diệt.', 172800);
  }

  return consequences[`${bossId}_slain`] ?? `Boss ${bossId} đã bị tiêu diệt.`;
}

export function isBossSlain(guildId: string, bossId: string): boolean {
  return getFlag(guildId, `boss_${bossId}_slain`) !== null;
}

export function getDropBonus(guildId: string, zoneId: string): number {
  if (zoneId === 'forest' && getFlag(guildId, 'forest_drop_bonus')) {
    return parseInt(getFlag(guildId, 'forest_drop_bonus')!) || 0;
  }
  if (getFlag(guildId, 'zone_marked_' + zoneId)) return 15;
  return 0;
}

export function getShopDiscount(guildId: string): number {
  const raw = getFlag(guildId, 'shop_discount');
  return raw ? parseInt(raw) : 0;
}

export function getShopMarkup(guildId: string): number {
  const raw = getFlag(guildId, 'shop_markup');
  return raw ? parseInt(raw) : 0;
}

export function increaseShopMarkup(guildId: string, amount: number, cap = 75): number {
  const next = Math.min(cap, Math.max(0, getShopMarkup(guildId) + amount));
  setFlag(guildId, 'shop_markup', String(next));
  setWorldEvent(guildId, 'merchant_fear', `🛒 Thương nhân bắt đầu thuê vệ sĩ — giá shop toàn thế giới tăng **${next}%**.`, 86400);
  return next;
}

export function getShopkeeperRobberyCount(guildId: string, userId: string): number {
  const raw = getFlag(guildId, `shopkeeper_robbery_${userId}`);
  return raw ? parseInt(raw) || 0 : 0;
}

export function getShopkeeperThreatMultiplier(guildId: string, userId: string): number {
  return getShopkeeperRobberyCount(guildId, userId) > 0 ? 2 : 1;
}

export function recordShopkeeperRobbery(guildId: string, userId: string): number {
  const next = getShopkeeperRobberyCount(guildId, userId) + 1;
  setFlag(guildId, `shopkeeper_robbery_${userId}`, String(next));
  return next;
}

export function getExpBonus(guildId: string): number {
  const raw = getFlag(guildId, 'global_exp_bonus');
  return raw ? parseInt(raw) : 0;
}

export function getEnemyAtkBonus(guildId: string): number {
  const raw = getFlag(guildId, 'global_enemy_atk_up');
  return raw ? parseInt(raw) : 0;
}

// ── Event log ─────────────────────────────────────────────────────────────
export function logEvent(
  guildId: string, userId: string, playerName: string,
  type: string, description: string, zoneId?: string
): void {
  db.prepare(`
    INSERT INTO event_log (guild_id, user_id, player_name, event_type, description, zone_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(guildId, userId, playerName, type, description, zoneId ?? null);

}

export function getRecentEvents(guildId: string, limit = 10): EventEntry[] {
  return db.prepare(`
    SELECT * FROM event_log WHERE guild_id=? ORDER BY created_at DESC LIMIT ?
  `).all(guildId, limit) as unknown as EventEntry[];
}

// ── World state summary for /world command ────────────────────────────────
export interface WorldSummary {
  flags: WorldFlag[];
  events: EventEntry[];
  bossesSlain: string[];
  activeDebuffs: string[];
  activeBonuses: string[];
  activeEvents: string[];
}

export function getWorldSummary(guildId: string): WorldSummary {
  const flags = getAllFlags(guildId);
  const events = getRecentEvents(guildId, 8);

  const bossesSlain = flags
    .filter(f => f.flag_key.endsWith('_slain'))
    .map(f => `${f.flag_key.replace('boss_', '').replace('_slain', '')} — dibunuh oleh **${f.flag_value}**`);

  const activeDebuffs: string[] = [];
  const activeBonuses: string[] = [];

  if (getFlag(guildId, 'global_enemy_atk_up'))
    activeDebuffs.push('💀 ATK địch +10% toàn server (di sản bóng tối cũ vẫn còn hiệu lực)');

  if (getFlag(guildId, 'shop_discount'))
    activeBonuses.push(`🛒 Giảm giá shop ${getShopDiscount(guildId)}% (Mine Colossus đã ngã)`);

  if (getFlag(guildId, 'shop_markup'))
    activeDebuffs.push(`🛒 Giá shop +${getShopMarkup(guildId)}% vì thương nhân bị cướp`);

  const fear = getMerchantFear(guildId);
  if (fear > 0) activeDebuffs.push(`🏦 Thương nhân sợ hãi: ${fear}%`);

  const danger = getWorldDanger(guildId);
  if (danger > 0) activeDebuffs.push(`⚠️ Mức nguy hiểm thế giới: ${danger}%`);

  const corruption = getWorldCorruption(guildId);
  if (corruption > 0) activeDebuffs.push(`🌑 Corruption: ${corruption}% — quái mạnh hơn nhưng drop tối hơn`);

  if (getFlag(guildId, 'forest_drop_bonus'))
    activeBonuses.push('🌲 Drop rate +20% tại Rừng Bóng Tối');

  if (getFlag(guildId, 'global_exp_bonus'))
    activeBonuses.push(`⭐ EXP +${getExpBonus(guildId)}% toàn server (The Forgotten đã ngã)`);

  // Check zone marks
  ['forest','shrine','mines','wastes'].forEach(z => {
    if (getFlag(guildId, `zone_marked_${z}`))
      activeBonuses.push(`📍 Drop rate +15% tại zone **${z}**`);
  });

  const activeEvents = flags
    .filter(f => f.flag_key.startsWith('event_'))
    .map(f => `• ${f.flag_value}`);

  return { flags, events, bossesSlain, activeDebuffs, activeBonuses, activeEvents };
}

// ── Extended world pressure: danger, corruption, merchant fear ───────────
export function getWorldNumber(guildId: string, key: string): number {
  const raw = getFlag(guildId, key);
  return raw ? Number(raw) || 0 : 0;
}

export function adjustWorldNumber(guildId: string, key: string, amount: number, min = 0, max = 100): number {
  const next = Math.max(min, Math.min(max, getWorldNumber(guildId, key) + amount));
  setFlag(guildId, key, String(next));
  return next;
}

export function getMerchantFear(guildId: string): number {
  return getWorldNumber(guildId, 'merchant_fear');
}

export function increaseMerchantFear(guildId: string, amount: number): number {
  const next = adjustWorldNumber(guildId, 'merchant_fear', amount, 0, 100);
  setWorldEvent(guildId, 'merchant_fear_level', `🏦 Thương nhân sợ hãi: **${next}%**. Giá shop và vệ sĩ sẽ tăng theo mức này.`, 86400);
  return next;
}

export function getWorldCorruption(guildId: string): number {
  return getWorldNumber(guildId, 'world_corruption');
}

export function getWorldDanger(guildId: string): number {
  return getWorldNumber(guildId, 'world_danger_level');
}

export function adjustWorldDanger(guildId: string, amount: number): number {
  const next = adjustWorldNumber(guildId, 'world_danger_level', amount, 0, 100);
  setWorldEvent(guildId, 'danger_level', `⚠️ Mức nguy hiểm thế giới: **${next}%**. Thợ săn tiền thưởng và ambush xuất hiện nhiều hơn.`, 86400);
  return next;
}

export function getEffectiveShopMarkup(guildId: string): number {
  return Math.min(150, getShopMarkup(guildId) + Math.floor(getMerchantFear(guildId) / 5) + Math.floor(getWorldDanger(guildId) / 10));
}
