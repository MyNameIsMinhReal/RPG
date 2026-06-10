import db from '../../database/index';
import { applyPassiveStats } from '../player';
import type { EnemyDef } from '../../data/enemies';
import type { CombatState, CombatEnemy, PlayerRow } from '../../utils/embeds';

// ── Combat CRUD ───────────────────────────────────────────────────────────
export function getCombat(messageId: string): CombatState | undefined {
  return db.prepare('SELECT * FROM active_combats WHERE message_id = ?')
    .get(messageId) as unknown as CombatState | undefined;
}

export function getCombatByUser(userId: string, guildId: string): CombatState | undefined {
  return db.prepare('SELECT * FROM active_combats WHERE user_id = ? AND guild_id = ?')
    .get(userId, guildId) as unknown as CombatState | undefined;
}

export function deleteCombat(messageId: string): void {
  db.prepare('DELETE FROM active_combats WHERE message_id = ?').run(messageId);
}

export function saveCombat(state: CombatState): void {
  db.prepare(`
    INSERT OR REPLACE INTO active_combats
    (message_id, channel_id, user_id, guild_id, enemy_id, enemy_name,
     enemy_hp, enemy_max_hp, enemy_atk, enemy_def,
     player_hp, player_max_hp, player_mp, player_max_mp,
     player_def, turn, is_defending, active_effects, combat_log,
     player_stamina, player_max_stamina, enemies_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    state.message_id ?? '',    state.channel_id ?? '',  state.user_id ?? '',  state.guild_id ?? '',
    state.enemy_id ?? '',      state.enemy_name ?? '',
    state.enemy_hp ?? 0,       state.enemy_max_hp ?? 0, state.enemy_atk ?? 0, state.enemy_def ?? 0,
    state.player_hp ?? 0,      state.player_max_hp ?? 0, state.player_mp ?? 0, state.player_max_mp ?? 0,
    (state as any).player_def ?? 0, state.turn ?? 1,           state.is_defending ?? 0,
    state.active_effects ?? '[]', state.combat_log ?? '[]',
    state.player_stamina ?? 100, state.player_max_stamina ?? 100,
    state.enemies_json ?? null
  );
}

// ── Group combat helpers ──────────────────────────────────────────────────
export function getGroupEnemies(state: CombatState): CombatEnemy[] | null {
  if (!state.enemies_json) return null;
  try { return JSON.parse(state.enemies_json); } catch { return null; }
}

export function areAllEnemiesDead(state: CombatState): boolean {
  const enemies = getGroupEnemies(state);
  if (!enemies) return state.enemy_hp <= 0;
  return enemies.every(e => e.hp <= 0);
}

export function getFirstAliveEnemy(enemies: CombatEnemy[]): { enemy: CombatEnemy; idx: number } | null {
  const idx = enemies.findIndex(e => e.hp > 0);
  return idx >= 0 ? { enemy: enemies[idx], idx } : null;
}

export function buildGroupCombatState(
  base: Omit<CombatState, 'enemies_json'>,
  enemies: CombatEnemy[]
): CombatState {
  const primary = enemies[0];
  return {
    ...base,
    enemy_id: primary.id,
    enemy_name: primary.name,
    enemy_hp: primary.hp,
    enemy_max_hp: primary.max_hp,
    enemy_atk: primary.atk,
    enemy_def: primary.def,
    enemies_json: JSON.stringify(enemies)
  };
}

export function startCombat(
  messageId: string, channelId: string,
  player: PlayerRow, guildId: string, enemy: EnemyDef
): CombatState {
  const boosted = applyPassiveStats(player);
  const state: CombatState = {
    message_id: messageId, channel_id: channelId,
    user_id: player.user_id, guild_id: guildId,
    enemy_id: enemy.id, enemy_name: enemy.name,
    enemy_hp: enemy.hp, enemy_max_hp: enemy.hp,
    enemy_atk: enemy.atk, enemy_def: enemy.def,
    player_hp: boosted.hp, player_max_hp: boosted.max_hp,
    player_mp: boosted.mp, player_max_mp: boosted.max_mp,
    player_def: boosted.def,
    turn: 1, is_defending: 0,
    active_effects: '[]', combat_log: '[]',
    player_stamina: 100, player_max_stamina: 100
  };
  saveCombat(state);
  return state;
}
