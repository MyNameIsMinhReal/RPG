import { addItem, grantExp, grantGold, addPet } from './player';
import { getFlag, setFlag } from './world';
import { unlockAchievement } from './achievements';
import { grantShrineBlessing } from './shrineBlessings';
import { getPet } from '../data/pets';

const COUNTER_TTL = 60 * 60 * 24 * 60;

function counterKey(userId: string, id: string): string { return `shrine_counter_${userId}_${id}`; }
function getCounter(guildId: string, userId: string, id: string): number { return Number.parseInt(getFlag(guildId, counterKey(userId, id)) ?? '0', 10) || 0; }
function incCounter(guildId: string, userId: string, id: string, by = 1): number {
  const next = getCounter(guildId, userId, id) + by;
  setFlag(guildId, counterKey(userId, id), String(next), COUNTER_TTL);
  return next;
}

function chanceGrantPet(userId: string, guildId: string, petId: string, chance: number): string | null {
  if (Math.random() >= chance) return null;
  const pet = getPet(petId);
  if (!pet) return null;
  const added = addPet(userId, guildId, petId);
  if (added) return `🥚 ${pet.icon} **${pet.name}** gia nhập sau nghi lễ hoàn hảo!`;
  addItem(userId, guildId, pet.releaseItem, 1);
  return `🥚 Gặp lại ${pet.icon} **${pet.name}**, chuyển thành **${pet.releaseItem} x1**.`;
}

function rewardAchievement(userId: string, guildId: string, id: string): string | null {
  const def = unlockAchievement(userId, guildId, id);
  if (!def) return null;
  if (id === 'shrine_echo_silence') addItem(userId, guildId, 'ancient_book', 1);
  if (id === 'shrine_salt_warder') addItem(userId, guildId, 'purifying_salt', 2);
  if (id === 'shrine_no_shadow') addItem(userId, guildId, 'mirror_shard', 2);
  if (id === 'shrine_gate_opener') addItem(userId, guildId, 'ancient_book', 1);
  return `${def.badge} Mở thành tựu **${def.name}**! (+${def.rewardGold} 🪙)`;
}

export function recordShrineMiniGameResult(userId: string, guildId: string, eventId: string, successCount: number, totalRounds: number, won: boolean): string[] {
  const lines: string[] = [];
  const perfect = won && successCount >= totalRounds;

  if (won) {
    if (eventId === 'dd_z2_special_blue_candle_vigil') lines.push(grantShrineBlessing(userId, guildId, 'candle_blessing'));
    if (eventId === 'dd_z2_special_mirror_memory_sequence') lines.push(grantShrineBlessing(userId, guildId, 'mirror_blessing'));
    if (eventId === 'dd_z2_special_salt_circle_repair') lines.push(grantShrineBlessing(userId, guildId, 'salt_ward', 3));
  } else if (eventId.includes('echo') || eventId.includes('mirror')) {
    lines.push(grantShrineBlessing(userId, guildId, 'echo_mark'));
  }

  if (perfect && eventId === 'dd_z2_special_true_echo_filter') {
    const n = incCounter(guildId, userId, 'true_echo_perfect');
    if (n >= 3) { const msg = rewardAchievement(userId, guildId, 'shrine_echo_silence'); if (msg) lines.push(msg); }
  }
  if (won && eventId === 'dd_z2_special_salt_circle_repair') {
    const n = incCounter(guildId, userId, 'salt_circle_wins');
    if (n >= 5) { const msg = rewardAchievement(userId, guildId, 'shrine_salt_warder'); if (msg) lines.push(msg); }
  }

  if (perfect) {
    if (eventId.includes('candle')) { const petLine = chanceGrantPet(userId, guildId, 'candle_wisp', 0.025); if (petLine) lines.push(petLine); }
    if (eventId.includes('mirror')) { const petLine = chanceGrantPet(userId, guildId, 'mirror_imp', 0.022); if (petLine) lines.push(petLine); }
    if (eventId.includes('echo')) { const petLine = chanceGrantPet(userId, guildId, 'echo_sprite', 0.022); if (petLine) lines.push(petLine); }
    if (Math.random() < 0.22) {
      setFlag(guildId, `shrine_secret_merchant_${userId}`, '1', 60 * 15);
      lines.push('🕯️ Một thương nhân ma đã để lại dấu nến. **Người Bán Hàng Dưới Ánh Nến** sẽ xuất hiện trong menu explore 15 phút.');
    }
  }

  return lines.filter(Boolean);
}

export function recordMirrorShadeAfterMirrorSigil(userId: string, guildId: string): string[] {
  const lines: string[] = [];
  const msg = rewardAchievement(userId, guildId, 'shrine_no_shadow');
  if (msg) lines.push(msg);
  return lines;
}

export function recordEchoGateOpened(userId: string, guildId: string): string[] {
  const lines: string[] = [];
  const msg = rewardAchievement(userId, guildId, 'shrine_gate_opener');
  if (msg) lines.push(msg);
  return lines;
}

export function maybeRewardEchoDemonPet(userId: string, guildId: string): string[] {
  const lines: string[] = [];
  const rolls: Array<[string, number]> = [['echo_sprite', 0.035], ['candle_wisp', 0.018], ['mirror_imp', 0.018]];
  for (const [petId, chance] of rolls) {
    const petLine = chanceGrantPet(userId, guildId, petId, chance);
    if (petLine) lines.push(petLine);
  }
  return lines;
}
