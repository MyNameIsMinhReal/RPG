import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { getPlayer, addItem, addPet } from '../systems/player';
// doGather is also imported directly by explore.ts for the in-zone gather button
import { COLORS } from '../utils/embeds';
import db from '../database/index';

const COOLDOWN_MS = 60_000;

export const GATHER_TABLE = [
  { id: 'iron_ore',         weight: 45, name: 'Iron Ore 🪨'        },
  { id: 'herb',             weight: 25, name: 'Forest Herb 🌿'      },
  { id: 'rare_herb',        weight: 12, name: 'Rare Herb 🌺'        },
  { id: 'glowing_mushroom', weight: 10, name: 'Glowing Mushroom 🍄' },
  { id: 'mana_crystal',     weight: 6,  name: 'Mana Crystal 💠'     },
  { id: 'void_shard',       weight: 2,  name: 'Void Shard 🌑'       },
];

function weightedPick() {
  const total = GATHER_TABLE.reduce((s, g) => s + g.weight, 0);
  let r = Math.random() * total;
  for (const g of GATHER_TABLE) { r -= g.weight; if (r <= 0) return g; }
  return GATHER_TABLE[0];
}

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
  const remaining = COOLDOWN_MS - (now - getLastGather(userId, guildId));

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

  const found = weightedPick();
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

export const data = new SlashCommandBuilder()
  .setName('gather')
  .setDescription('Thu thập nguyên liệu — cooldown 60 giây');

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();
  const { id: userId } = interaction.user;
  const guildId = interaction.guildId!;
  const player  = getPlayer(userId, guildId);

  if (!player?.alive) {
    await interaction.editReply({ embeds: [new EmbedBuilder().setColor(COLORS.danger).setDescription('❌ Bạn đã chết. Dùng `/start` để hồi sinh.')] });
    return;
  }

  const { embed } = doGather(userId, guildId, player.name);
  await interaction.editReply({ embeds: [embed] });
}
