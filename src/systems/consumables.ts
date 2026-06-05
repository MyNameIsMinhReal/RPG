import db from '../database/index';
import { getItem } from '../data/items';
import {
  getPlayer, getItemQty, removeItem, updatePlayerHpMp,
  adjustReputation, grantGold, grantSoulShards
} from './player';
import { getFlag, setFlag } from './world';
import { randInt, pick } from '../utils/format';
import type { PlayerRow } from '../utils/embeds';

export type BuffKey =
  | 'weapon_oil'
  | 'armor_polish'
  | 'hunter_meal'
  | 'stone_skin'
  | 'quickstep_tea'
  | 'rage_elixir'
  | 'focus_tonic'
  | 'blood_vial'
  | 'scroll_detection'
  | 'scroll_greed'
  | 'fake_identity'
  | 'black_market_access'
  | 'assassins_smoke'
  | 'warding_charm'
  | 'luck';

export interface PlayerBuff {
  user_id: string;
  guild_id: string;
  buff_key: BuffKey;
  value: number;
  charges: number;
  expires_at: number | null;
  created_at: number;
}

function now(): number { return Math.floor(Date.now() / 1000); }

export function cleanupExpiredBuffs(userId: string, guildId: string): void {
  db.prepare('DELETE FROM player_buffs WHERE user_id=? AND guild_id=? AND expires_at IS NOT NULL AND expires_at <= ?')
    .run(userId, guildId, now());
}

export function setBuff(userId: string, guildId: string, key: BuffKey, value = 0, charges = 1, ttlSeconds = 3600): void {
  const expiresAt = ttlSeconds > 0 ? now() + ttlSeconds : null;
  db.prepare(`
    INSERT INTO player_buffs (user_id, guild_id, buff_key, value, charges, expires_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id, guild_id, buff_key)
    DO UPDATE SET value=excluded.value, charges=excluded.charges, expires_at=excluded.expires_at, created_at=unixepoch()
  `).run(userId, guildId, key, value, charges, expiresAt);
}

export function getBuff(userId: string, guildId: string, key: BuffKey): PlayerBuff | undefined {
  cleanupExpiredBuffs(userId, guildId);
  const row = db.prepare('SELECT * FROM player_buffs WHERE user_id=? AND guild_id=? AND buff_key=? AND charges > 0')
    .get(userId, guildId, key) as unknown as PlayerBuff | undefined;
  return row;
}

export function hasBuff(userId: string, guildId: string, key: BuffKey): boolean {
  return !!getBuff(userId, guildId, key);
}

export function consumeBuff(userId: string, guildId: string, key: BuffKey, amount = 1): PlayerBuff | undefined {
  const buff = getBuff(userId, guildId, key);
  if (!buff) return undefined;
  const next = buff.charges - amount;
  if (next <= 0) {
    db.prepare('DELETE FROM player_buffs WHERE user_id=? AND guild_id=? AND buff_key=?')
      .run(userId, guildId, key);
  } else {
    db.prepare('UPDATE player_buffs SET charges=? WHERE user_id=? AND guild_id=? AND buff_key=?')
      .run(next, userId, guildId, key);
  }
  return buff;
}

export function clearBuff(userId: string, guildId: string, key: BuffKey): void {
  db.prepare('DELETE FROM player_buffs WHERE user_id=? AND guild_id=? AND buff_key=?')
    .run(userId, guildId, key);
}

export function getActiveBuffLines(userId: string, guildId: string): string[] {
  cleanupExpiredBuffs(userId, guildId);
  const rows = db.prepare('SELECT buff_key, value, charges FROM player_buffs WHERE user_id=? AND guild_id=? AND charges > 0 ORDER BY created_at DESC')
    .all(userId, guildId) as unknown as Array<{ buff_key: BuffKey; value: number; charges: number }>;

  const names: Partial<Record<BuffKey, string>> = {
    weapon_oil: '🔩 Weapon Oil: ATK +10% trận kế tiếp',
    armor_polish: '🧼 Armor Polish: DEF +10% trận kế tiếp',
    hunter_meal: '🥩 Hunter’s Meal: ATK +10% trận kế tiếp',
    stone_skin: '🛡️ Stone Skin: DEF +15% trận kế tiếp',
    quickstep_tea: '⚡ Quickstep Tea: né đòn đầu trận kế tiếp',
    rage_elixir: '🔥 Rage Elixir: ATK +25%, nhận thêm damage',
    focus_tonic: '💠 Focus Tonic: dùng skill tiết kiệm MP',
    blood_vial: '🩸 Blood Vial: ATK +10% trận kế tiếp',
    scroll_detection: '📜 Detection: explore tốt hơn lượt sau',
    scroll_greed: '📜 Greed: gold +30%, địch mạnh hơn',
    fake_identity: '🎭 Fake Identity: shop giảm 10%',
    black_market_access: '🌑 Vé vào chợ đen',
    assassins_smoke: '🗡️ Assassin Smoke: shopkeeper giảm DEF',
    warding_charm: '🧿 Warding Charm: chặn 1 debuff',
    luck: '🍀 May mắn: tăng chút tỉ lệ event tốt'
  };
  return rows.map(r => `${names[r.buff_key] ?? r.buff_key}${r.charges > 1 ? ` ×${r.charges}` : ''}`);
}

export interface CombatBuffResult<T extends PlayerRow> {
  player: T;
  logs: string[];
}

/** Applies one-battle consumable buffs to the player snapshot at combat start. */
export function applyConsumableCombatBonuses<T extends PlayerRow>(player: T): CombatBuffResult<T> {
  const userId = player.user_id;
  const guildId = player.guild_id;
  const logs: string[] = [];
  const next: any = { ...player };

  const atkPct =
    (consumeBuff(userId, guildId, 'weapon_oil')?.value ?? 0) +
    (consumeBuff(userId, guildId, 'hunter_meal')?.value ?? 0) +
    (consumeBuff(userId, guildId, 'blood_vial')?.value ?? 0) +
    (consumeBuff(userId, guildId, 'rage_elixir')?.value ?? 0);
  if (atkPct > 0) {
    next.atk = Math.max(1, Math.floor(next.atk * (1 + atkPct / 100)));
    logs.push(`⚔️ Consumable buff: ATK +${atkPct}% trong trận này.`);
  }

  const defPct =
    (consumeBuff(userId, guildId, 'armor_polish')?.value ?? 0) +
    (consumeBuff(userId, guildId, 'stone_skin')?.value ?? 0);
  if (defPct > 0) {
    next.def = Math.max(0, Math.floor(next.def * (1 + defPct / 100)));
    logs.push(`🛡️ Consumable buff: DEF +${defPct}% trong trận này.`);
  }

  if (consumeBuff(userId, guildId, 'quickstep_tea')) {
    logs.push('⚡ Quickstep Tea: bạn sẵn sàng né đòn đầu tiên.');
  }
  if (consumeBuff(userId, guildId, 'focus_tonic')) {
    logs.push('💠 Focus Tonic: kỹ năng tập trung hơn, nhưng phòng thủ yếu đi.');
    next.def = Math.max(0, Math.floor(next.def * 0.9));
  }

  return { player: next as T, logs };
}

export function getGreedGoldBonusPercent(userId: string, guildId: string): number {
  const buff = consumeBuff(userId, guildId, 'scroll_greed');
  return buff?.value ?? 0;
}

export function useItemOutsideCombat(userId: string, guildId: string, itemId: string): { ok: boolean; consumed?: boolean; title: string; lines: string[] } {
  const player = getPlayer(userId, guildId);
  const item = getItem(itemId);
  const qty = getItemQty(userId, guildId, itemId);
  if (!player) return { ok: false, title: '❌ Không có nhân vật', lines: ['Dùng `/start` trước.'] };
  if (!item || qty <= 0) return { ok: false, title: '❌ Không có vật phẩm', lines: ['Bạn không có vật phẩm này trong túi.'] };
  if (item.type !== 'consumable') return { ok: false, title: '❌ Không dùng được', lines: ['Vật phẩm này không phải consumable.'] };

  const lines: string[] = [];
  let newHp = player.hp;
  let newMp = player.mp;
  let shouldConsume = true;

  const effect: any = item.effect ?? {};
  if (effect.combatOnly) {
    return { ok: false, title: '⚔️ Chỉ dùng trong combat', lines: ['Vật phẩm này chỉ có tác dụng khi đang chiến đấu.'] };
  }
  if (effect.passiveOnly) {
    return { ok: false, title: '🧿 Nội tại', lines: ['Vật phẩm này tự kích hoạt khi đủ điều kiện, không cần dùng thủ công.'] };
  }
  if (effect.hpBelowPct && player.hp / player.max_hp > effect.hpBelowPct) {
    return { ok: false, title: '❌ Chưa thể dùng', lines: [`Chỉ dùng được khi HP dưới **${Math.floor(effect.hpBelowPct * 100)}%**.`] };
  }

  if (effect.hpPercent) {
    const amount = Math.max(1, Math.floor(player.max_hp * effect.hpPercent));
    const gain = Math.min(amount, player.max_hp - newHp);
    newHp = Math.min(player.max_hp, newHp + amount);
    lines.push(`❤️ +**${gain} HP** (${newHp}/${player.max_hp})`);
  }
  if (effect.hp) {
    const gain = Math.min(effect.hp, player.max_hp - newHp);
    newHp = Math.min(player.max_hp, newHp + effect.hp);
    lines.push(`❤️ +**${gain} HP** (${newHp}/${player.max_hp})`);
  }
  if (effect.mpPercent) {
    const amount = Math.max(1, Math.floor(player.max_mp * effect.mpPercent));
    const gain = Math.min(amount, player.max_mp - newMp);
    newMp = Math.min(player.max_mp, newMp + amount);
    lines.push(`💧 +**${gain} MP** (${newMp}/${player.max_mp})`);
  }
  if (effect.mp) {
    const gain = Math.min(effect.mp, player.max_mp - newMp);
    newMp = Math.min(player.max_mp, newMp + effect.mp);
    lines.push(`💧 +**${gain} MP** (${newMp}/${player.max_mp})`);
  }

  switch (itemId) {
    case 'weapon_oil': setBuff(userId, guildId, 'weapon_oil', 10, 1, 7200); lines.push('🔩 Trận combat kế tiếp: **ATK +10%**.'); break;
    case 'armor_polish': setBuff(userId, guildId, 'armor_polish', 10, 1, 7200); lines.push('🧼 Trận combat kế tiếp: **DEF +10%**.'); break;
    case 'hunter_meal': setBuff(userId, guildId, 'hunter_meal', 10, 1, 7200); lines.push('🥩 Trận combat kế tiếp: **ATK +10%**.'); break;
    case 'stone_skin_draught': setBuff(userId, guildId, 'stone_skin', 15, 1, 7200); lines.push('🛡️ Trận combat kế tiếp: **DEF +15%**.'); break;
    case 'quickstep_tea': setBuff(userId, guildId, 'quickstep_tea', 15, 1, 7200); lines.push('⚡ Trận combat kế tiếp: né đòn đầu tiên tốt hơn.'); break;
    case 'rage_elixir': setBuff(userId, guildId, 'rage_elixir', 25, 1, 7200); lines.push('🔥 Trận combat kế tiếp: **ATK +25%**, nhưng nhận thêm sát thương.'); break;
    case 'focus_tonic': setBuff(userId, guildId, 'focus_tonic', 20, 1, 7200); lines.push('💠 Trận combat kế tiếp: tiết kiệm MP, nhưng DEF giảm nhẹ.'); break;
    case 'scroll_detection': setBuff(userId, guildId, 'scroll_detection', 1, 1, 7200); lines.push('📜 Lượt explore kế tiếp: tăng tỉ lệ event tốt, giảm ambush.'); break;
    case 'scroll_greed': setBuff(userId, guildId, 'scroll_greed', 30, 1, 7200); lines.push('📜 Trận combat kế tiếp: **Gold +30%**, nhưng địch **ATK +15%**.'); break;
    case 'fake_identity': setBuff(userId, guildId, 'fake_identity', 10, 1, 7200); lines.push('🎭 Shop kế tiếp: **giảm giá 10%**.'); break;
    case 'black_market_token': setBuff(userId, guildId, 'black_market_access', 1, 1, 7200); lines.push('🌑 Chợ Đen sẽ dễ xuất hiện trong lần khám phá tới.'); break;
    case 'assassins_smoke': setBuff(userId, guildId, 'assassins_smoke', 20, 1, 7200); lines.push('🗡️ Lần cướp shopkeeper kế tiếp: shopkeeper **DEF -20%** lúc mở combat.'); break;
    case 'blood_vial':
      setBuff(userId, guildId, 'blood_vial', 10, 1, 7200);
      adjustReputation(userId, guildId, -3);
      lines.push('🩸 Trận combat kế tiếp: **ATK +10%**. Reputation **-3**.');
      break;
    case 'fate_dice': {
      const roll = randInt(1, 6);
      lines.push(`🎲 Xúc xắc định mệnh rơi vào mặt **${roll}**.`);
      if (roll === 1) { const h = Math.floor(player.max_hp * 0.25); newHp = Math.min(player.max_hp, newHp + h); lines.push(`❤️ +**${h} HP**`); }
      if (roll === 2) { const m = Math.floor(player.max_mp * 0.25); newMp = Math.min(player.max_mp, newMp + m); lines.push(`💧 +**${m} MP**`); }
      if (roll === 3) { const g = randInt(20, 90); grantGold(userId, guildId, g); lines.push(`🪙 +**${g} Gold**`); }
      if (roll === 4) { setBuff(userId, guildId, 'scroll_greed', 20, 1, 3600); lines.push('⚠️ Lần combat tới nguy hiểm hơn, nhưng phần thưởng tốt hơn.'); }
      if (roll === 5) { const loss = Math.min(player.gold, randInt(15, 60)); if (loss > 0) grantGold(userId, guildId, -loss); lines.push(`💸 Mất **${loss} Gold**.`); }
      if (roll === 6) { setBuff(userId, guildId, 'luck', 1, 1, 3600); lines.push('🍀 May mắn tăng trong lượt explore kế tiếp.'); }
      break;
    }
    case 'strange_mushroom':
      if (randInt(1, 100) <= 50) { setBuff(userId, guildId, pick(['weapon_oil','armor_polish','quickstep_tea'] as BuffKey[]), 10, 1, 3600); lines.push('🍄 Cơ thể nhẹ bẫng. Nhận **buff ngẫu nhiên** cho trận kế tiếp.'); }
      else { const dmg = Math.max(1, Math.floor(player.max_hp * 0.15)); newHp = Math.max(1, newHp - dmg); lines.push(`🤢 Nấm có độc nhẹ. -**${dmg} HP**.`); }
      break;
    case 'suspicious_fish':
      lines.push('🐟 Món cá hồi phục tốt, nhưng có mùi hơi sai sai...');
      if (randInt(1, 100) <= 30) { setBuff(userId, guildId, 'scroll_greed', 10, 1, 1800); lines.push('🤢 Bạn cảm thấy bất ổn. Trận kế tiếp hơi nguy hiểm hơn.'); }
      break;
    case 'apology_letter': {
      const rep = adjustReputation(userId, guildId, 10);
      const markup = Number(getFlag(guildId, 'shop_markup') ?? '0') || 0;
      setFlag(guildId, 'shop_markup', String(Math.max(0, markup - 2)));
      lines.push(`📜 Reputation: **${rep}** (+10)`);
      lines.push('🛒 Giá shop toàn thế giới giảm nhẹ **-2%**.');
      break;
    }
    case 'bribe_coin':
      return { ok: false, title: '⚔️ Dùng khi gặp thợ săn', lines: ['Bribe Coin tự dùng trong event **Thợ Săn Tiền Thưởng**, không cần dùng trước.'] };
    default:
      if (!lines.length) shouldConsume = false;
  }

  if (!shouldConsume) return { ok: false, title: '❌ Chưa có tác dụng', lines: ['Item này chưa có hiệu ứng dùng ngoài combat.'] };

  removeItem(userId, guildId, itemId, 1);
  updatePlayerHpMp(userId, guildId, newHp, newMp);
  return { ok: true, consumed: true, title: `${item.icon} Đã dùng ${item.name}`, lines };
}
