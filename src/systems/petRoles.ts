import db from '../database/index';
import { getPlayer, updatePlayerHpMp, addItem, addPet } from './player';
import { getPet, petPassiveValue } from '../data/pets';
import type { EnemyDef } from '../data/enemies';
import type { PlayerRow } from '../utils/embeds';

export interface ActivePetInfo {
  petId: string;
  name: string;
  icon: string;
  level: number;
  exp: number;
  maxLevel: number;
  passiveType: string;
  passivePct: number;
}

export interface PetRewardMods {
  goldPct: number;
  expPct: number;
  lines: string[];
}

export function getActivePetInfo(userId: string, guildId: string): ActivePetInfo | null {
  const player = getPlayer(userId, guildId) as any;
  const petId = player?.active_pet as string | undefined;
  if (!petId) return null;
  const row = db.prepare('SELECT pet_id, level, COALESCE(exp,0) AS exp FROM player_pets WHERE user_id=? AND guild_id=? AND pet_id=?')
    .get(userId, guildId, petId) as { pet_id: string; level: number; exp: number } | undefined;
  if (!row) return null;
  const def = getPet(petId);
  if (!def) return null;
  return {
    petId,
    name: def.name,
    icon: def.icon,
    level: row.level,
    exp: row.exp ?? 0,
    maxLevel: def.maxLevel,
    passiveType: def.passiveType,
    passivePct: petPassiveValue(def, row.level),
  };
}

export function getPetRewardMods(userId: string, guildId: string): PetRewardMods {
  const pet = getActivePetInfo(userId, guildId);
  if (!pet) return { goldPct: 0, expPct: 0, lines: [] };
  const goldPct = pet.passiveType === 'gold_pct' ? pet.passivePct : 0;
  const expPct = pet.passiveType === 'exp_pct' ? pet.passivePct : 0;
  const lines: string[] = [];
  if (goldPct > 0) lines.push(`${pet.icon} ${pet.name}: Gold +${goldPct.toFixed(1)}%`);
  if (expPct > 0) lines.push(`${pet.icon} ${pet.name}: EXP +${expPct.toFixed(1)}%`);
  return { goldPct, expPct, lines };
}

function petExpNeeded(level: number): number {
  return 35 + level * 15;
}

export function grantActivePetExp(userId: string, guildId: string, amount: number): string | null {
  const pet = getActivePetInfo(userId, guildId);
  if (!pet || pet.level >= pet.maxLevel) return null;
  const def = getPet(pet.petId)!;
  let level = pet.level;
  let exp = pet.exp + Math.max(1, Math.floor(amount));
  let leveled = false;
  while (level < def.maxLevel && exp >= petExpNeeded(level)) {
    exp -= petExpNeeded(level);
    level++;
    leveled = true;
  }
  db.prepare('UPDATE player_pets SET level=?, exp=? WHERE user_id=? AND guild_id=? AND pet_id=?')
    .run(level, exp, userId, guildId, pet.petId);
  return leveled ? `${def.icon} **${def.name}** lên Lv.${level}!` : null;
}


function tryGrantPet(userId: string, guildId: string, petId: string, chance: number, reason: string): string | null {
  if (Math.random() >= chance) return null;
  const def = getPet(petId);
  if (!def) return null;
  const added = addPet(userId, guildId, petId);
  if (added) return `🥚 ${def.icon} **${def.name}** gia nhập! (${reason})`;
  addItem(userId, guildId, def.releaseItem, 1);
  return `🥚 Gặp lại ${def.icon} **${def.name}**, chuyển thành **${def.releaseItem} x1**.`;
}

export function grantPetDropAfterVictory(userId: string, guildId: string, enemy: EnemyDef): string[] {
  const lines: string[] = [];
  const zones = enemy.zones ?? [];

  const wolfChance = enemy.miniboss ? 0.045 : zones.includes('forest') || zones.includes('wastes') ? 0.012 : 0;
  const wolf = wolfChance ? tryGrantPet(userId, guildId, 'wolf_pup', wolfChance, 'drop từ quái rừng/hoang nguyên') : null;
  if (wolf) lines.push(wolf);

  const shadowEnemy = ['shadow_bat', 'phantom', 'void_wraith', 'mirror_knight', 'mirage_hunter'].includes(enemy.id);
  const shadow = shadowEnemy ? tryGrantPet(userId, guildId, 'shadow_cat', enemy.miniboss ? 0.05 : 0.018, 'drop từ quái bóng tối') : null;
  if (shadow) lines.push(shadow);

  const fireSource = enemy.id === 'mine_colossus' || enemy.id.includes('lava') || enemy.id.includes('molten') || enemy.id.includes('ember');
  const fire = fireSource ? tryGrantPet(userId, guildId, 'fire_lizard', enemy.boss ? 0.08 : 0.018, 'drop từ nguồn lửa/boss nóng') : null;
  if (fire) lines.push(fire);

  const merchantSource = ['merchant_guardian', 'debt_collector', 'shopkeeper_guard', 'bounty_hunter'].includes(enemy.id) || enemy.id.includes('merchant');
  const fox = merchantSource ? tryGrantPet(userId, guildId, 'gold_fox', enemy.miniboss ? 0.055 : 0.02, 'drop từ thương đoàn/kẻ đòi nợ') : null;
  if (fox) lines.push(fox);

  const dragon = enemy.boss ? tryGrantPet(userId, guildId, 'mini_dragon', enemy.id === 'ancient_oak' || enemy.id === 'mine_colossus' || enemy.id === 'the_forgotten' ? 0.025 : 0.012, 'boss drop') : null;
  if (dragon) lines.push(dragon);

  return lines;
}

export function applyActivePetAfterVictory(userId: string, guildId: string, playerBefore: PlayerRow, enemy: EnemyDef): string[] {
  const pet = getActivePetInfo(userId, guildId);
  if (!pet) return [];
  const lines: string[] = [];
  const expLine = grantActivePetExp(userId, guildId, enemy.boss ? 18 : enemy.miniboss ? 10 : 4);
  if (expLine) lines.push(`🐾 ${expLine}`);

  const def = getPet(pet.petId);
  if (!def) return lines;

  if (pet.petId === 'shadow_cat') {
    const fresh = getPlayer(userId, guildId);
    if (fresh && Math.random() < 0.35) {
      const heal = Math.max(1, Math.floor(fresh.max_hp * 0.06));
      updatePlayerHpMp(userId, guildId, Math.min(fresh.max_hp, fresh.hp + heal), fresh.mp);
      lines.push(`🐱 Shadow Cat lặng lẽ hồi **${heal} HP** sau trận.`);
    }
  }

  if (pet.petId === 'wolf_pup' && Math.random() < 0.15) {
    addItem(userId, guildId, 'wolf_fang', 1);
    lines.push('🐺 Wolf Pup tha về **Wolf Fang x1**.');
  }

  if (pet.petId === 'gold_fox' && Math.random() < 0.10) {
    addItem(userId, guildId, 'lucky_coin', 1);
    lines.push('🦊 Gold Fox tìm thấy **Lucky Coin x1**.');
  }

  if (pet.petId === 'fire_lizard' && (enemy.boss || enemy.miniboss) && Math.random() < 0.18) {
    addItem(userId, guildId, 'fire_essence', 1);
    lines.push('🦎 Fire Lizard rút ra **Fire Essence x1** từ xác địch.');
  }

  if (pet.petId === 'mini_dragon' && enemy.boss && Math.random() < 0.12) {
    addItem(userId, guildId, 'dragon_scale', 1);
    lines.push('🐉 Mini Dragon để lại **Dragon Scale x1** sau trận boss.');
  }

  return lines;
}


export function describePetRole(petId: string): string {
  const roleLines: Record<string, string> = {
    wolf_pup: '🐺 Sau combat có tỉ lệ tha về **Wolf Fang** — hợp build farm vật liệu đầu game.',
    shadow_cat: '🐱 Sau combat có tỉ lệ hồi HP nhẹ — hợp build sinh tồn/đánh boss lâu.',
    gold_fox: '🦊 Tăng Gold nhận và có tỉ lệ tìm **Lucky Coin** — hợp farm tiền.',
    fire_lizard: '🦎 Khi hạ boss/miniboss có tỉ lệ rút **Fire Essence** — hợp săn boss.',
    mini_dragon: '🐉 Khi hạ boss có tỉ lệ rơi **Dragon Scale** — pet late-game để săn vật liệu hiếm.',
    storm_eagle: '🦅 Tăng EXP nhận — hợp rush level.',
    river_otter: '🦦 Tăng EXP nhận — hợp train đều và farm lâu dài.',
  };
  return roleLines[petId] ?? '🐾 Đồng hành chiến đấu: nhận EXP sau combat khi được trang bị và cộng passive theo cấp pet.';
}
