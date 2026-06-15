import db from '../../database/index';
import { getItemQty, getInventory, removeItem } from '../player';
import { getWornEquipment } from '../equipment';
import { getEquipment } from '../../data/equipment';
import { getZone } from '../../data/zones';
import { getMaterial } from '../../data/materials';
import { getItem } from '../../data/items';
import { pick, randInt } from '../../utils/format';

export type ExploreNodeType = 'combat' | 'resource' | 'mystery' | 'camp';

export interface ExploreNode {
  id: string;
  type: ExploreNodeType;
  emoji: string;
  title: string;
  hint: string;
  noise: number;
}

export interface ExploreNoiseState {
  user_id: string;
  guild_id: string;
  noise: number;
  last_node: string | null;
  updated_at: number;
}

const NODE_LABELS: Record<ExploreNodeType, { emoji: string; title: string; hint: string; noise: number }> = {
  combat:   { emoji: '⚔️', title: 'Giao tranh', hint: 'Chủ động lần theo dấu quái để farm EXP/đồ.', noise: 15 },
  resource: { emoji: '⛏️', title: 'Dấu vết tài nguyên', hint: 'Khai thác nguyên liệu. Không có tool vẫn được, nhưng ít hơn.', noise: 20 },
  mystery:  { emoji: '❓', title: 'Vùng sương mù', hint: 'Event ẩn: rương, NPC, bẫy hoặc lựa chọn rủi ro.', noise: 18 },
  camp:     { emoji: '🏕️', title: 'Trại tàn tạ', hint: 'Nghỉ hồi HP/MP bằng Gold, giảm tiếng động.', noise: -20 },
};

const ZONE_NODE_FLAVOR: Record<string, Partial<Record<ExploreNodeType, string[]>>> = {
  forest: {
    combat: ['Bụi cây rung dữ dội', 'Dấu móng vuốt mới trên bùn', 'Tiếng gầm vọng sau thân cổ thụ'],
    resource: ['Gốc cây bị sét đánh', 'Bụi thảo dược bên khe suối', 'Thân cây đổ chắn lối'],
    mystery: ['Bức tượng phủ rêu', 'Vùng sương trắng không tan', 'Đàn quạ bay vòng trên lối mòn'],
    camp: ['Trại săn bị bỏ lại', 'Đống lửa còn tàn tro', 'Mái lều rách bên bờ suối'],
  },
  shrine: {
    combat: ['Bóng đen sau cột đá', 'Tiếng chuông nứt trong hành lang', 'Dấu chân ướt dẫn vào điện thờ'],
    resource: ['Đống xương cổ dưới bàn thờ', 'Mảnh pha lê mana vỡ', 'Nến linh hồn cháy dở'],
    mystery: ['Tượng nữ thần bị đập nát', 'Cánh cửa phong ấn rạn nứt', 'Tấm gương phủ khăn đen'],
    camp: ['Góc cầu nguyện yên tĩnh', 'Phòng tế lễ bỏ hoang', 'Khoang nghỉ của tu sĩ cũ'],
  },
  mines: {
    combat: ['Tiếng móng vuốt dưới đường ray', 'Bóng lùn sau vách đá', 'Tiếng gầm vang từ mỏ sâu'],
    resource: ['Vỉa quặng lấp lánh', 'Đống đá rơi còn mới', 'Mạch sắt lộ trên vách'],
    mystery: ['Thang máy rỉ sét rung nhẹ', 'Đường ray cụt trong bóng tối', 'Hòm đồ thợ mỏ khóa hờ'],
    camp: ['Chòi nghỉ thợ mỏ cũ', 'Khoang trú ẩn chống sập', 'Xe goòng lật làm chỗ nấp'],
  },
  wastes: {
    combat: ['Bóng vật thể bò qua cát đen', 'Tiếng xương va vào nhau', 'Dấu chân biến mất giữa tro bụi'],
    resource: ['Đống tro chứa tinh thể đen', 'Cột đá nứt rỉ void', 'Xương cổ lộ trên mặt cát'],
    mystery: ['Ảo ảnh thủy tinh giữa hoang mạc', 'Lá cờ rách không gió vẫn bay', 'Vết nứt không đáy phát sáng tím'],
    camp: ['Tàn tích trại hành hương', 'Mái che xương thú cũ', 'Hố trú bão phủ tro'],
  },
};

const RESOURCE_POOLS: Record<string, string[]> = {
  forest: ['wood', 'wood', 'healing_herb', 'leather', 'slime_core'],
  shrine: ['bone_shard', 'ancient_bone', 'mana_crystal', 'ectoplasm', 'holy_ash'],
  mines: ['stone', 'stone', 'iron_ore', 'rusty_gear', 'mana_crystal'],
  wastes: ['void_essence', 'shadow_essence', 'bone_shard', 'demon_seal'],
  village: ['wood', 'stone', 'healing_herb'],
};

export function getExploreNoise(userId: string, guildId: string): number {
  const row = db.prepare('SELECT noise FROM explore_state WHERE user_id=? AND guild_id=?')
    .get(userId, guildId) as { noise: number } | undefined;
  return Math.max(0, Math.min(100, row?.noise ?? 0));
}

export function setExploreNoise(userId: string, guildId: string, noise: number, lastNode?: string | null): number {
  const next = Math.max(0, Math.min(100, Math.floor(noise)));
  db.prepare(`
    INSERT INTO explore_state (user_id, guild_id, noise, last_node, updated_at)
    VALUES (?, ?, ?, ?, unixepoch())
    ON CONFLICT(user_id, guild_id)
    DO UPDATE SET noise=excluded.noise, last_node=excluded.last_node, updated_at=unixepoch()
  `).run(userId, guildId, next, lastNode ?? null);
  return next;
}

export function resetExploreNoise(userId: string, guildId: string): void {
  setExploreNoise(userId, guildId, 0, null);
}

export function classNoiseMultiplier(classId?: string | null): number {
  if (classId === 'assassin' || classId === 'rogue' || classId === 'shadowblade') return 0.5;
  if (classId === 'knight' || classId === 'paladin' || classId === 'crusader') return 1.1;
  return 1;
}

export function addExploreNoise(userId: string, guildId: string, baseAmount: number, classId?: string | null, lastNode?: string | null): { before: number; after: number; added: number; triggered: boolean } {
  const before = getExploreNoise(userId, guildId);
  const added = baseAmount > 0 ? Math.max(1, Math.round(baseAmount * classNoiseMultiplier(classId))) : baseAmount;
  const after = setExploreNoise(userId, guildId, before + added, lastNode ?? null);
  return { before, after, added, triggered: after >= 100 };
}

export function reduceExploreNoise(userId: string, guildId: string, amount: number, lastNode?: string | null): number {
  return setExploreNoise(userId, guildId, getExploreNoise(userId, guildId) - Math.max(0, amount), lastNode ?? null);
}

export function formatNoiseBar(noise: number, length = 10): string {
  const pct = Math.max(0, Math.min(1, noise / 100));
  const filled = Math.round(pct * length);
  return '🟥'.repeat(filled) + '⬛'.repeat(length - filled) + ` ${Math.floor(pct * 100)}%`;
}

export function canUseSmokeBomb(userId: string, guildId: string): boolean {
  return getItemQty(userId, guildId, 'assassins_smoke') > 0 || getItemQty(userId, guildId, 'smoke_bomb') > 0;
}

export function consumeSmokeForNoise(userId: string, guildId: string): string | null {
  if (getItemQty(userId, guildId, 'assassins_smoke') > 0 && removeItem(userId, guildId, 'assassins_smoke', 1)) {
    resetExploreNoise(userId, guildId);
    return 'assassins_smoke';
  }
  if (getItemQty(userId, guildId, 'smoke_bomb') > 0 && removeItem(userId, guildId, 'smoke_bomb', 1)) {
    resetExploreNoise(userId, guildId);
    return 'smoke_bomb';
  }
  return null;
}

function node(type: ExploreNodeType, zoneId: string, index: number): ExploreNode {
  const base = NODE_LABELS[type];
  const flavor = pick(ZONE_NODE_FLAVOR[zoneId]?.[type] ?? [base.title]);
  return {
    id: `${type}_${index}_${Date.now()}_${randInt(100, 999)}`,
    type,
    emoji: base.emoji,
    title: flavor,
    hint: base.hint,
    noise: base.noise,
  };
}

export function generateExploreNodes(player: any, hasCombat: boolean, hasLegacy: boolean): ExploreNode[] {
  const zoneId = player.zone_id ?? 'forest';
  const types: ExploreNodeType[] = [];
  if (hasCombat) types.push('combat');
  types.push('mystery', 'resource', 'camp');
  if (hasLegacy) types.push('mystery');

  const count = randInt(1, 100) <= 35 ? 3 : 2;
  const chosen: ExploreNodeType[] = [];
  const forcedFirst: ExploreNodeType = hasCombat && Math.random() < 0.45 ? 'combat' : pick(types);
  chosen.push(forcedFirst);
  while (chosen.length < count) {
    const t = pick(types);
    if (!chosen.includes(t) || t === 'mystery') chosen.push(t);
  }
  return chosen.slice(0, 3).map((t, i) => node(t, zoneId, i));
}

export function getResourcePoolForZone(zoneId: string): string[] {
  return RESOURCE_POOLS[zoneId] ?? RESOURCE_POOLS.forest;
}

export function getToolQuality(userId: string, guildId: string, resourceId?: string): { hasTool: boolean; label: string; multiplier: number } {
  const wornIds = getWornEquipment(userId, guildId).map(w => w.equipment_id);
  const invIds = getInventory(userId, guildId).filter(x => x.quantity > 0).map(x => x.item_id);
  const ids = new Set([...wornIds, ...invIds]);

  const wantsPickaxe = resourceId ? ['stone', 'iron_ore', 'rusty_gear', 'mana_crystal', 'void_essence', 'shadow_essence'].includes(resourceId) : false;
  const wantsAxe = resourceId ? ['wood', 'leather', 'healing_herb'].includes(resourceId) : false;
  const hasPickaxe = [...ids].some(id => id.includes('pickaxe'));
  const hasAxe = [...ids].some(id => id.includes('axe'));
  const hasAnyUseful = wantsPickaxe ? hasPickaxe : wantsAxe ? hasAxe : (hasPickaxe || hasAxe);

  if (hasAnyUseful) {
    const best = [...ids].find(id => getEquipment(id) && (id.includes('pickaxe') || id.includes('axe')));
    const eq = best ? getEquipment(best) : null;
    return { hasTool: true, label: eq ? `${eq.icon} ${eq.name}` : 'công cụ phù hợp', multiplier: 1.8 };
  }
  return { hasTool: false, label: 'tay không / dụng cụ thô sơ', multiplier: 0.65 };
}

export function rollResourceResult(zoneId: string, userId: string, guildId: string): { itemId: string; amount: number; hasTool: boolean; toolLabel: string; icon: string; name: string } {
  const itemId = pick(getResourcePoolForZone(zoneId));
  const tool = getToolQuality(userId, guildId, itemId);
  const base = randInt(1, 2) + (Math.random() < 0.25 ? 1 : 0);
  const amount = Math.max(1, Math.floor(base * tool.multiplier));
  const def = getMaterial(itemId) ?? getItem(itemId) ?? { icon: '📦', name: itemId } as any;
  return { itemId, amount, hasTool: tool.hasTool, toolLabel: tool.label, icon: def.icon ?? '📦', name: def.name ?? itemId };
}

export function describeNode(node: ExploreNode): string {
  const noiseLine = node.noise >= 0 ? `+${node.noise}% Noise` : `${node.noise}% Noise`;
  return `**${node.emoji} ${node.title}**\n${node.hint}\n\`${noiseLine}\``;
}

export function getZoneTitle(zoneId: string): string {
  const zone = getZone(zoneId);
  return zone ? `${zone.icon} ${zone.name}` : zoneId;
}
