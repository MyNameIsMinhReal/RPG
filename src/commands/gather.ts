import { EmbedBuilder } from 'discord.js';
import { addItem, addPet } from '../systems/player';
// Pure helper module (not a slash command): doGather() is imported by the
// explore in-zone gather button. There is no /gather command by design.
import { COLORS } from '../utils/embeds';
import db from '../database/index';
import { pickWeighted } from '../utils/format';
import { GATHER_COOLDOWN_MS } from '../utils/constants';

export const GATHER_TABLE = [
  { id: 'iron_ore',         weight: 45, name: 'Iron Ore 🪨'        },
  { id: 'herb',             weight: 25, name: 'Forest Herb 🌿'      },
  { id: 'rare_herb',        weight: 12, name: 'Rare Herb 🌺'        },
  { id: 'glowing_mushroom', weight: 10, name: 'Glowing Mushroom 🍄' },
  { id: 'mana_crystal',     weight: 6,  name: 'Mana Crystal 💠'     },
  { id: 'void_shard',       weight: 2,  name: 'Void Shard 🌑'       },
];

export function getLastGather(userId: string, guildId: string): number {
  return (db.prepare('SELECT last_gather FROM players WHERE user_id=? AND guild_id=?').get(userId, guildId) as any)?.last_gather ?? 0;
}

export function setLastGather(userId: string, guildId: string, ts: number): void {
  db.prepare('UPDATE players SET last_gather=? WHERE user_id=? AND guild_id=?').run(ts, userId, guildId);
}

// Core gather logic — returns an embed (or null if on cooldown)
export interface GatherResult {
  embed: EmbedBuilder;
  onCooldown: boolean;
}

export function doGather(userId: string, guildId: string, playerName: string): GatherResult {
  const now       = Date.now();
  const remaining = GATHER_COOLDOWN_MS - (now - getLastGather(userId, guildId));

  if (remaining > 0) {
    return {
      onCooldown: true,
      embed: new EmbedBuilder().setColor(COLORS.warning)
        .setDescription(`🌿 Cần chờ thêm **${Math.ceil(remaining / 1000)}s** để thu thập tiếp.`),
    };
  }

  setLastGather(userId, guildId, now);

  if (Math.random() < 0.15) {
    return {
      onCooldown: false,
      embed: new EmbedBuilder().setColor(COLORS.dark)
        .setTitle('🌿 Thu thập')
        .setDescription('> *Lục lọ khắp nơi nhưng chẳng thấy gì đáng giá hôm nay...*')
        .setFooter({ text: `${playerName} · cooldown 60s` }),
    };
  }

  const found = pickWeighted(GATHER_TABLE, 'weight');
  const qty   = found.id === 'iron_ore' && Math.random() < 0.35 ? 2 : 1;
  addItem(userId, guildId, found.id, qty);
  let petLine = '';
  if ((found.id === 'void_shard' || found.id === 'mana_crystal') && Math.random() < (found.id === 'void_shard' ? 0.035 : 0.012)) {
    const added = addPet(userId, guildId, 'storm_eagle');
    petLine = added ? '\n\n🥚 Cơn gió cuốn lên — **Storm Eagle** gia nhập!' : '\n\n🥚 Bạn đã có Storm Eagle, dấu vết bão tan vào nguyên liệu.';
  }
  const isRare = found.id === 'void_shard' || found.id === 'mana_crystal';

  return {
    onCooldown: false,
    embed: new EmbedBuilder()
      .setColor(isRare ? COLORS.magic : COLORS.success)
      .setTitle('🌿 Thu thập')
      .setDescription(
        `> *Lướt qua những tán lá...*\n\n` +
        `**${playerName}** tìm được: **${found.name}**${qty > 1 ? ` x${qty}` : ''}!` +
        (isRare ? '\n\n✨ *Nguyên liệu hiếm!*' : '') + petLine
      )
      .setFooter({ text: 'cooldown 60s · /inventory để xem đồ' }),
  };
}
