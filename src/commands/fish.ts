import { EmbedBuilder } from 'discord.js';
import { addItem } from '../systems/player';
import { COLORS } from '../utils/embeds';
import db from '../database/index';

const COOLDOWN_MS = 60_000;


export const FISH_TABLE = [
  { id: 'common_fish',   weight: 55, name: 'Common Fish 🐟'   },
  { id: 'silver_fish',   weight: 25, name: 'Silver Fish 🐠'   },
  { id: 'mystery_shell', weight: 12, name: 'Mystery Shell 🐚' },
  { id: 'golden_fish',   weight: 5,  name: 'Golden Fish 🐡'   },
  { id: 'glowing_bait',  weight: 3,  name: 'Glowing Bait ✨'  },
];

function weightedPick() {
  const total = FISH_TABLE.reduce((s, f) => s + f.weight, 0);
  let r = Math.random() * total;
  for (const f of FISH_TABLE) { r -= f.weight; if (r <= 0) return f; }
  return FISH_TABLE[0];
}

export function getLastFish(userId: string, guildId: string): number {
  return (db.prepare('SELECT last_fish FROM players WHERE user_id=? AND guild_id=?').get(userId, guildId) as any)?.last_fish ?? 0;
}

export function setLastFish(userId: string, guildId: string, ts: number): void {
  db.prepare('UPDATE players SET last_fish=? WHERE user_id=? AND guild_id=?').run(ts, userId, guildId);
}

// Core fish logic — reusable from explore events
export interface FishResult {
  embed: EmbedBuilder;
  onCooldown: boolean;
}

export function doFish(userId: string, guildId: string, playerName: string): FishResult {
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

  if (Math.random() < 0.20) {
    return {
      onCooldown: false,
      embed: new EmbedBuilder().setColor(COLORS.dark)
        .setTitle('🎣 Câu cá')
        .setDescription('> *Sợi dây rung nhẹ... rồi thôi. Hôm nay cá không hợp tác.*')
        .setFooter({ text: `${playerName} · cooldown 60s` }),
    };
  }

  const caught = weightedPick();
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

