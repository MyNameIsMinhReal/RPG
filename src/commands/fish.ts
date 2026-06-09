import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  EmbedBuilder,
  Message,
} from 'discord.js';
import { addItem, addPet, getItemQty, getPlayer, grantExp, grantGold, removeItem } from '../systems/player';
import { getItem } from '../data/items';
import { getMaterial } from '../data/materials';
import { getPet } from '../data/pets';
import { COLORS } from '../utils/embeds';
import { onlyParty, onlyUser } from '../utils/collectors';
import db from '../database/index';

const COOLDOWN_MS = 60_000;
const BITE_WINDOW_MS = 6_000;

export const FISH_TABLE = [
  { id: 'common_fish',   weight: 55, name: 'Common Fish 🐟'   },
  { id: 'silver_fish',   weight: 25, name: 'Silver Fish 🐠'   },
  { id: 'mystery_shell', weight: 12, name: 'Mystery Shell 🐚' },
  { id: 'golden_fish',   weight: 5,  name: 'Golden Fish 🐡'   },
  { id: 'glowing_bait',  weight: 3,  name: 'Glowing Bait ✨'  },
];

type FishRarity = 'common' | 'rare' | 'epic' | 'ancient';
type FishAction = 'left' | 'hold' | 'right' | 'loosen';
type FishMoveId = 'dart_left' | 'dart_right' | 'dive' | 'thrash' | 'tired';

interface FishEncounter {
  id: string;
  name: string;
  icon: string;
  rarity: FishRarity;
  maxHp: number;
  maxTurns: number;
  tensionBase: number;
  staminaBase: number;
  exp: number;
  gold: [number, number];
}

interface FishMove {
  id: FishMoveId;
  text: string;
  expected: FishAction[];
}

export interface FishingMiniGameInput {
  interaction: ChatInputCommandInteraction;
  userId: string;
  guildId: string;
  playerName: string;
  zoneId: string;
  useBait: boolean;
  partyMemberIds?: string[];
  partyMemberNames?: Record<string, string>;
  buildContinueExploreRow: (userId: string) => ActionRowBuilder<ButtonBuilder>[];
  attachContinueExploreHandler: (
    message: Message<boolean>,
    interaction: ChatInputCommandInteraction,
    userId: string,
    guildId: string
  ) => Promise<void> | void;
}

export interface FishResult {
  embed: EmbedBuilder;
  onCooldown: boolean;
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickWeighted<T extends { weight: number }>(entries: T[]): T {
  const total = entries.reduce((sum, entry) => sum + Math.max(0, entry.weight), 0);
  let roll = Math.random() * total;
  for (const entry of entries) {
    roll -= Math.max(0, entry.weight);
    if (roll <= 0) return entry;
  }
  return entries[0];
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function itemLabel(id: string, qty = 1): string {
  const item = getItem(id);
  const mat = getMaterial(id);
  const icon = item?.icon ?? mat?.icon ?? '🎁';
  const name = item?.name ?? mat?.name ?? id;
  return `${icon} **${name}**${qty > 1 ? ` x${qty}` : ''}`;
}

function petLabel(id: string): string {
  const pet = getPet(id);
  return `${pet?.icon ?? '🥚'} **${pet?.name ?? id}**`;
}

function rarityColor(rarity: FishRarity): number {
  switch (rarity) {
    case 'common': return COLORS.info;
    case 'rare': return 0x2ecc71;
    case 'epic': return COLORS.purple;
    case 'ancient': return COLORS.gold;
  }
}

function rarityLabel(rarity: FishRarity): string {
  switch (rarity) {
    case 'common': return 'Thường';
    case 'rare': return 'Hiếm';
    case 'epic': return 'Sử Thi';
    case 'ancient': return 'Cổ Đại';
  }
}

function zoneFishNames(zoneId: string, rarity: FishRarity): Array<{ name: string; icon: string }> {
  const common = {
    village: [{ name: 'Ashveil Pondfish', icon: '🐟' }],
    forest:  [{ name: 'Brook Minnow', icon: '🐟' }, { name: 'Moss Carp', icon: '🐠' }],
    shrine:  [{ name: 'Spirit Guppy', icon: '🐟' }, { name: 'Lantern Carp', icon: '🐠' }],
    mines:   [{ name: 'Pale Cavefish', icon: '🐟' }, { name: 'Coalfin', icon: '🐠' }],
    wastes:  [{ name: 'Ashfin', icon: '🐟' }, { name: 'Dustscale', icon: '🐠' }],
  } as Record<string, Array<{ name: string; icon: string }>>;

  const rare = {
    village: [{ name: 'Silver Pond Koi', icon: '🐠' }],
    forest:  [{ name: 'Silverfin Trout', icon: '🐠' }, { name: 'Emerald Loach', icon: '🐟' }],
    shrine:  [{ name: 'Moon Koi', icon: '🐠' }, { name: 'Prayer Eel', icon: '🐍' }],
    mines:   [{ name: 'Crystal Eel', icon: '🐍' }, { name: 'Oreback Carp', icon: '🐠' }],
    wastes:  [{ name: 'Glass Trout', icon: '🐠' }, { name: 'Mirage Koi', icon: '🐡' }],
  } as Record<string, Array<{ name: string; icon: string }>>;

  const epic = {
    village: [{ name: 'Golden Village Koi', icon: '🐡' }],
    forest:  [{ name: 'Golden Koi', icon: '🐡' }, { name: 'Treasure Crab', icon: '🦀' }],
    shrine:  [{ name: 'Halo Carp', icon: '🐡' }, { name: 'Relic Shellcrab', icon: '🦀' }],
    mines:   [{ name: 'Gemscale Eel', icon: '🐍' }, { name: 'Treasure Crab', icon: '🦀' }],
    wastes:  [{ name: 'Voidfin', icon: '🐡' }, { name: 'Mirror Crab', icon: '🦀' }],
  } as Record<string, Array<{ name: string; icon: string }>>;

  const ancient = {
    village: [{ name: 'Old Pond Monarch', icon: '🐟' }],
    forest:  [{ name: 'Ancient Catfish', icon: '🐋' }],
    shrine:  [{ name: 'Celestial Koi', icon: '🐉' }],
    mines:   [{ name: 'Abyssal Cavefish', icon: '🐋' }],
    wastes:  [{ name: 'Eclipse Leviathan Fry', icon: '🐉' }],
  } as Record<string, Array<{ name: string; icon: string }>>;

  const map = rarity === 'common' ? common : rarity === 'rare' ? rare : rarity === 'epic' ? epic : ancient;
  return map[zoneId] ?? map.forest;
}

function pickFishEncounter(zoneId: string, useBait: boolean): FishEncounter {
  const rarity = pickWeighted([
    { rarity: 'common' as FishRarity, weight: useBait ? 34 : 58 },
    { rarity: 'rare' as FishRarity, weight: useBait ? 37 : 27 },
    { rarity: 'epic' as FishRarity, weight: useBait ? 21 : 11 },
    { rarity: 'ancient' as FishRarity, weight: useBait ? 8 : 4 },
  ]).rarity;

  const names = zoneFishNames(zoneId, rarity);
  const chosen = names[randInt(0, names.length - 1)];
  const difficulty = {
    common:  { hp: randInt(26, 34), turns: 5, tension: 10, stamina: 8,  exp: 18, gold: [4, 12] as [number, number] },
    rare:    { hp: randInt(38, 50), turns: 7, tension: 12, stamina: 10, exp: 35, gold: [12, 28] as [number, number] },
    epic:    { hp: randInt(56, 72), turns: 8, tension: 15, stamina: 12, exp: 65, gold: [25, 55] as [number, number] },
    ancient: { hp: randInt(78, 95), turns: 9, tension: 18, stamina: 14, exp: 110, gold: [55, 120] as [number, number] },
  }[rarity];

  return {
    id: `${zoneId}_${rarity}_${chosen.name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`,
    name: chosen.name,
    icon: chosen.icon,
    rarity,
    maxHp: difficulty.hp,
    maxTurns: difficulty.turns,
    tensionBase: Math.max(6, difficulty.tension - (useBait ? 3 : 0)),
    staminaBase: Math.max(5, difficulty.stamina - (useBait ? 2 : 0)),
    exp: difficulty.exp,
    gold: difficulty.gold,
  };
}

function pickFishMove(rarity: FishRarity): FishMove {
  const moves: Array<FishMove & { weight: number }> = [
    { id: 'dart_left',  text: '🌊 Con cá lao sang **trái**!', expected: ['right'], weight: 25 },
    { id: 'dart_right', text: '🌊 Con cá lao sang **phải**!', expected: ['left'], weight: 25 },
    { id: 'dive',       text: '⬇️ Con cá **lặn sâu** xuống đáy!', expected: ['hold'], weight: 20 },
    { id: 'thrash',     text: '💥 Con cá **vùng vẫy mạnh**, dây rung dữ dội!', expected: ['loosen'], weight: rarity === 'common' ? 12 : 20 },
    { id: 'tired',      text: '😮‍💨 Con cá có vẻ **mệt đi**!', expected: ['left', 'right'], weight: rarity === 'ancient' ? 8 : 18 },
  ];
  return pickWeighted(moves);
}

function fishingActionRow(userId: string, disabled = false): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`fishact_${userId}_left`).setEmoji('⬅️').setLabel('Kéo trái').setStyle(ButtonStyle.Primary).setDisabled(disabled),
    new ButtonBuilder().setCustomId(`fishact_${userId}_hold`).setEmoji('⬆️').setLabel('Giữ cần').setStyle(ButtonStyle.Secondary).setDisabled(disabled),
    new ButtonBuilder().setCustomId(`fishact_${userId}_right`).setEmoji('➡️').setLabel('Kéo phải').setStyle(ButtonStyle.Primary).setDisabled(disabled),
    new ButtonBuilder().setCustomId(`fishact_${userId}_loosen`).setEmoji('🪢').setLabel('Thả lỏng').setStyle(ButtonStyle.Secondary).setDisabled(disabled),
  );
}

function reelRow(userId: string, label = 'Kéo cần!', disabled = false): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`fish_reel_${userId}`).setEmoji('🎣').setLabel(label).setStyle(ButtonStyle.Primary).setDisabled(disabled),
    new ButtonBuilder().setCustomId(`fish_skip_${userId}`).setLabel('Bỏ qua').setStyle(ButtonStyle.Secondary).setDisabled(disabled),
  );
}

function buildFishingEmbed(fish: FishEncounter, hp: number, tension: number, stamina: number, turn: number, move: FishMove, log: string[] = []): EmbedBuilder {
  const hpBar = bar(hp, fish.maxHp, 12);
  const tensionBar = bar(tension, 100, 12);
  const staBar = bar(stamina, 100, 12);
  return new EmbedBuilder()
    .setColor(rarityColor(fish.rarity))
    .setTitle(`🎣 Đấu Cá — ${fish.icon} ${fish.name}`)
    .setDescription([
      `Độ hiếm: **${rarityLabel(fish.rarity)}** · Lượt **${turn}/${fish.maxTurns}**`,
      '',
      `🐟 Cá: ${hpBar} **${hp}/${fish.maxHp} HP**`,
      `🎣 Độ căng dây: ${tensionBar} **${tension}%**`,
      `🧍 Stamina: ${staBar} **${stamina}/100**`,
      '',
      move.text,
      '',
      '**Gợi ý:** Cá lao trái thì kéo phải, cá lao phải thì kéo trái, cá lặn sâu thì giữ cần, cá vùng vẫy thì thả lỏng.',
      log.length ? `\n${log.slice(-3).join('\n')}` : '',
    ].filter(Boolean).join('\n'));
}

function bar(current: number, max: number, size: number): string {
  const safeMax = Math.max(1, max);
  const filled = Math.max(0, Math.min(size, Math.round((current / safeMax) * size)));
  return '█'.repeat(filled) + '░'.repeat(size - filled);
}

function weightedPick(useBait = false) {
  const table = FISH_TABLE.map(f => {
    if (!useBait) return f;
    const rareBoost = ['silver_fish', 'mystery_shell', 'golden_fish'].includes(f.id) ? 2 : 1;
    const commonPenalty = f.id === 'common_fish' ? 0.75 : 1;
    return { ...f, weight: Math.max(1, Math.round(f.weight * rareBoost * commonPenalty)) };
  });
  const total = table.reduce((s, f) => s + f.weight, 0);
  let r = Math.random() * total;
  for (const f of table) { r -= f.weight; if (r <= 0) return f; }
  return table[0];
}

export function getLastFish(userId: string, guildId: string): number {
  return (db.prepare('SELECT last_fish FROM players WHERE user_id=? AND guild_id=?').get(userId, guildId) as any)?.last_fish ?? 0;
}

export function setLastFish(userId: string, guildId: string, ts: number): void {
  db.prepare('UPDATE players SET last_fish=? WHERE user_id=? AND guild_id=?').run(ts, userId, guildId);
}

// Legacy instant fish helper kept for old internal callers. It is no longer registered as a command.
export function doFish(userId: string, guildId: string, playerName: string, useBait = false): FishResult {
  const now       = Date.now();
  const remaining = COOLDOWN_MS - (now - getLastFish(userId, guildId));

  if (remaining > 0) {
    return {
      onCooldown: true,
      embed: new EmbedBuilder().setColor(COLORS.warning)
        .setDescription(`🎣 Cần chờ thêm **${Math.ceil(remaining / 1000)}s** để câu tiếp.`),
    };
  }

  setLastFish(userId, guildId, now);

  if (useBait && getItemQty(userId, guildId, 'glowing_bait') > 0) {
    removeItem(userId, guildId, 'glowing_bait', 1);
  }

  if (Math.random() < (useBait ? 0.10 : 0.20)) {
    return {
      onCooldown: false,
      embed: new EmbedBuilder().setColor(COLORS.dark)
        .setTitle('🎣 Câu cá')
        .setDescription('> *Sợi dây rung nhẹ... rồi thôi. Hôm nay cá không hợp tác.*' + (useBait ? '\n\n✨ Glowing Bait đã được dùng, nhưng cá vẫn trốn mất.' : ''))
        .setFooter({ text: `${playerName} · cooldown 60s` }),
    };
  }

  const caught = weightedPick(useBait);
  const qty    = caught.id === 'common_fish' && Math.random() < 0.3 ? 2 : 1;
  addItem(userId, guildId, caught.id, qty);
  const isRare = caught.id === 'golden_fish' || caught.id === 'glowing_bait';

  return {
    onCooldown: false,
    embed: new EmbedBuilder()
      .setColor(isRare ? COLORS.gold : COLORS.info)
      .setTitle('🎣 Câu cá')
      .setDescription(
        `> *Sợi dây giật mạnh...*\n\n` +
        `**${playerName}** câu được: **${caught.name}**${qty > 1 ? ` x${qty}` : ''}!` +
        (isRare ? '\n\n✨ *Vật phẩm hiếm!*' : '')
      )
      .setFooter({ text: 'cooldown 60s · /inventory để xem đồ' }),
  };
}

async function finishFishing(input: FishingMiniGameInput, embed: EmbedBuilder): Promise<void> {
  const msg = await input.interaction.editReply({
    embeds: [embed],
    components: input.buildContinueExploreRow(input.userId),
  });
  await input.attachContinueExploreHandler(msg as Message<boolean>, input.interaction, input.userId, input.guildId);
}

async function waitForHook(input: FishingMiniGameInput): Promise<'hooked' | 'early' | 'late' | 'skip'> {
  const waitMs = randInt(2200, 4200);
  const partyIds = input.partyMemberIds ?? [];
  const filter = partyIds.length > 0 ? onlyParty(input.userId, partyIds) : onlyUser(input.userId);
  const partyNote = partyIds.length > 0 ? '\n👥 *Thành viên party cũng có thể bấm!*' : '';

  const waitingEmbed = new EmbedBuilder()
    .setColor(COLORS.info)
    .setTitle('🎣 Bạn đã thả câu...')
    .setDescription([
      'Mặt nước yên lặng, cần câu hơi rung nhẹ.',
      '',
      'Đừng kéo quá sớm. Hãy chờ tín hiệu **❗ Cá cắn câu!**',
      partyNote,
    ].filter(Boolean).join('\n'));

  const reply = await input.interaction.editReply({ embeds: [waitingEmbed], components: [reelRow(input.userId, 'Kéo cần!')] });
  const early = await reply.awaitMessageComponent({ filter, time: waitMs }).catch(() => null);

  if (early?.isButton()) {
    await early.deferUpdate().catch(() => null);
    if (early.customId === `fish_skip_${input.userId}`) return 'skip';
    return 'early';
  }

  const biteEmbed = new EmbedBuilder()
    .setColor(COLORS.gold)
    .setTitle('❗ Cá cắn câu!')
    .setDescription(`Dây câu giật mạnh! Bạn có **${Math.round(BITE_WINDOW_MS / 1000)} giây** để kéo cần.${partyNote}`);
  const biteReply = await input.interaction.editReply({ embeds: [biteEmbed], components: [reelRow(input.userId, 'Kéo ngay!')] });
  const bite = await biteReply.awaitMessageComponent({ filter, time: BITE_WINDOW_MS }).catch(() => null);

  if (!bite?.isButton()) return 'late';
  await bite.deferUpdate().catch(() => null);
  if (bite.customId === `fish_skip_${input.userId}`) return 'skip';
  return 'hooked';
}

function grantFishingReward(input: FishingMiniGameInput, fish: FishEncounter, useBait: boolean): string[] {
  const lines: string[] = [];
  const gold = randInt(fish.gold[0], fish.gold[1]);
  grantGold(input.userId, input.guildId, gold);
  const lv = grantExp(input.userId, input.guildId, fish.exp);
  lines.push(`🪙 **${gold} Gold**`);
  lines.push(`✨ **${fish.exp} EXP**${lv.leveledUp ? ` — lên Lv.${lv.newLevel}!` : ''}`);

  const addRewardItem = (id: string, qty = 1) => {
    addItem(input.userId, input.guildId, id, qty);
    lines.push(itemLabel(id, qty));
  };

  if (fish.rarity === 'common') {
    addRewardItem('common_fish', Math.random() < 0.35 ? 2 : 1);
    if (Math.random() < 0.20) addRewardItem('healing_herb', 1);
  } else if (fish.rarity === 'rare') {
    addRewardItem(Math.random() < 0.70 ? 'silver_fish' : 'mystery_shell', 1);
    if (Math.random() < (useBait ? 0.30 : 0.18)) addRewardItem('glowing_bait', 1);
    if (Math.random() < 0.20) addRewardItem(input.zoneId === 'mines' ? 'silver_ore' : 'mana_crystal', 1);
  } else if (fish.rarity === 'epic') {
    addRewardItem('golden_fish', 1);
    addRewardItem(Math.random() < 0.55 ? 'mystery_shell' : 'mysterious_shard', 1);
    if (Math.random() < 0.16) addRewardItem('book_frost_nova', 1);
  } else {
    addRewardItem('golden_fish', 1);
    addRewardItem('void_shard', 1);
    if (Math.random() < 0.25) addRewardItem('book_void_rift', 1);
  }

  const petRoll = Math.random();
  const petBonus = useBait ? 0.04 : 0;
  let petId: string | null = null;
  if (fish.rarity === 'rare' && petRoll < 0.025 + petBonus) {
    petId = 'river_otter';
  } else if (fish.rarity === 'epic' && petRoll < 0.075 + petBonus) {
    petId = Math.random() < 0.55 ? 'river_otter' : 'pearl_turtle';
  } else if (fish.rarity === 'ancient' && petRoll < 0.18 + petBonus) {
    petId = Math.random() < 0.45 ? 'abyss_koi' : 'pearl_turtle';
  }

  if (petId) {
    const added = addPet(input.userId, input.guildId, petId);
    if (added) {
      lines.push(`🥚 Pet Egg nở ra: ${petLabel(petId)}!`);
    } else {
      addRewardItem('mystery_shell', fish.rarity === 'ancient' ? 3 : 1);
      lines.push(`🥚 Bạn đã có ${petLabel(petId)}, trứng hóa thành vỏ sò bí ẩn.`);
    }
  }

  const partyIds = (input.partyMemberIds ?? []).filter(id => id !== input.userId);
  if (partyIds.length > 0) {
    const partyGold = Math.max(2, Math.floor(gold * 0.20));
    const partyExp = Math.max(4, Math.floor(fish.exp * 0.25));
    for (const id of partyIds) {
      const p = getPlayer(id, input.guildId);
      if (!p?.alive) continue;
      grantGold(id, input.guildId, partyGold);
      grantExp(id, input.guildId, partyExp);
    }
    lines.push(`👥 Thành viên party nhận phụ: **${partyExp} EXP**, **${partyGold} Gold**.`);
  }

  return lines;
}

async function runFishFight(input: FishingMiniGameInput, fish: FishEncounter): Promise<void> {
  let hp = fish.maxHp;
  let tension = randInt(18, 32);
  let stamina = 100;
  const logs: string[] = [];
  const partyIds = input.partyMemberIds ?? [];
  const filter = partyIds.length > 0 ? onlyParty(input.userId, partyIds) : onlyUser(input.userId);

  const actorName = (userId: string): string => {
    if (userId === input.userId) return input.playerName;
    return input.partyMemberNames?.[userId] ?? 'Đồng đội';
  };

  for (let turn = 1; turn <= fish.maxTurns; turn++) {
    const move = pickFishMove(fish.rarity);
    const embed = buildFishingEmbed(fish, hp, tension, stamina, turn, move, logs);
    const reply = await input.interaction.editReply({ embeds: [embed], components: [fishingActionRow(input.userId)] });
    const btn = await reply.awaitMessageComponent({ filter, time: 30_000 }).catch(() => null);

    if (!btn?.isButton()) {
      return finishFishing(input, new EmbedBuilder()
        .setColor(COLORS.warning)
        .setTitle('🎣 Cá thoát mất!')
        .setDescription(`${fish.icon} **${fish.name}** vùng mạnh rồi biến mất vì không ai phản ứng kịp.`));
    }
    await btn.deferUpdate().catch(() => null);

    const actor = actorName(btn.user.id);
    const action = btn.customId.replace(`fishact_${input.userId}_`, '') as FishAction;
    const correct = move.expected.includes(action);
    const loosenWrong = action === 'loosen' && !correct;
    const holdWrong = action === 'hold' && !correct;

    if (correct) {
      const damage = randInt(9, 15) + (fish.rarity === 'ancient' ? 2 : 0);
      hp = Math.max(0, hp - damage);
      tension = Math.min(100, tension + randInt(Math.max(3, fish.tensionBase - 5), fish.tensionBase));
      stamina = Math.max(0, stamina - randInt(Math.max(3, fish.staminaBase - 5), fish.staminaBase));
      logs.push(`✅ **${actor}** phản ứng đúng! Cá mất **${damage} HP**.`);
    } else if (loosenWrong) {
      tension = Math.max(0, tension - randInt(8, 15));
      stamina = Math.max(0, stamina - 5);
      hp = Math.min(fish.maxHp, hp + randInt(2, 5));
      logs.push(`🪢 **${actor}** thả lỏng dây. Dây bớt căng, nhưng cá lấy lại sức.`);
    } else if (holdWrong) {
      const damage = randInt(2, 5);
      hp = Math.max(0, hp - damage);
      tension = Math.min(100, tension + randInt(fish.tensionBase + 3, fish.tensionBase + 10));
      stamina = Math.max(0, stamina - randInt(fish.staminaBase + 3, fish.staminaBase + 9));
      logs.push(`⚠️ **${actor}** giữ cần không đúng nhịp. Cá chỉ mất **${damage} HP**, dây căng mạnh.`);
    } else {
      const damage = randInt(1, 4);
      hp = Math.max(0, hp - damage);
      tension = Math.min(100, tension + randInt(fish.tensionBase + 10, fish.tensionBase + 22));
      stamina = Math.max(0, stamina - randInt(fish.staminaBase + 9, fish.staminaBase + 17));
      if (Math.random() < 0.35) hp = Math.min(fish.maxHp, hp + randInt(3, 8));
      logs.push(`❌ **${actor}** phản ứng sai! Cá chỉ mất **${damage} HP**, dây căng dữ dội.`);
    }

    if (hp <= 0) {
      const rewardLines = grantFishingReward(input, fish, input.useBait);
      return finishFishing(input, new EmbedBuilder()
        .setColor(rarityColor(fish.rarity))
        .setTitle(`🎣 Bắt Được ${fish.icon} ${fish.name}!`)
        .setDescription([
          `**${input.playerName}** đã thắng mini game câu cá sau **${turn} lượt**.`,
          input.useBait ? '✨ Glowing Bait giúp con cá hiếm hơn và dễ khống chế hơn.' : '',
          '',
          '**Phần thưởng:**',
          ...rewardLines.map(line => `- ${line}`),
        ].filter(Boolean).join('\n')));
    }

    if (tension >= 100) {
      return finishFishing(input, new EmbedBuilder()
        .setColor(COLORS.danger)
        .setTitle('🎣 Đứt Dây!')
        .setDescription(`Độ căng dây vượt quá giới hạn. ${fish.icon} **${fish.name}** giật mạnh rồi biến mất.`));
    }

    if (stamina <= 0) {
      return finishFishing(input, new EmbedBuilder()
        .setColor(COLORS.warning)
        .setTitle('🎣 Kiệt Sức!')
        .setDescription(`Bạn không còn stamina để giữ cần. ${fish.icon} **${fish.name}** thoát khỏi lưỡi câu.`));
    }
  }

  return finishFishing(input, new EmbedBuilder()
    .setColor(COLORS.warning)
    .setTitle('🎣 Cá Thoát Mất!')
    .setDescription(`${fish.icon} **${fish.name}** kéo dài cuộc đấu quá lâu rồi lặn xuống mất.`));
}

export async function startFishingMiniGame(input: FishingMiniGameInput): Promise<void> {
  const now = Date.now();
  const remaining = COOLDOWN_MS - (now - getLastFish(input.userId, input.guildId));
  if (remaining > 0) {
    return finishFishing(input, new EmbedBuilder()
      .setColor(COLORS.warning)
      .setTitle('🎣 Cần chờ thêm')
      .setDescription(`Bạn vừa câu cá gần đây. Chờ thêm **${Math.ceil(remaining / 1000)}s** rồi thử lại.`));
  }

  if (input.useBait) {
    const baitQty = getItemQty(input.userId, input.guildId, 'glowing_bait');
    if (baitQty <= 0) {
      return finishFishing(input, new EmbedBuilder()
        .setColor(COLORS.warning)
        .setTitle('✨ Không có Glowing Bait')
        .setDescription('Bạn không còn Glowing Bait trong túi.'));
    }
    removeItem(input.userId, input.guildId, 'glowing_bait', 1);
  }

  setLastFish(input.userId, input.guildId, now);
  const hook = await waitForHook(input);

  if (hook === 'skip') {
    return finishFishing(input, new EmbedBuilder()
      .setColor(COLORS.info)
      .setDescription('🎣 *Bạn thu cần lại và bỏ qua điểm câu cá.*'));
  }

  if (hook === 'early') {
    return finishFishing(input, new EmbedBuilder()
      .setColor(COLORS.warning)
      .setTitle('🎣 Kéo quá sớm!')
      .setDescription('Bạn giật cần khi cá chưa cắn. Mặt nước vỡ ra rồi yên lặng trở lại.'));
  }

  if (hook === 'late') {
    return finishFishing(input, new EmbedBuilder()
      .setColor(COLORS.warning)
      .setTitle('🎣 Kéo quá muộn!')
      .setDescription('Cá đã cắn câu nhưng bạn phản ứng chậm. Nó rỉa sạch mồi rồi bơi mất.'));
  }

  const fish = pickFishEncounter(input.zoneId, input.useBait);
  await runFishFight(input, fish);
}
