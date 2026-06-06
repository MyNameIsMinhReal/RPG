import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { getPlayer, addItem } from '../systems/player';
import { COLORS } from '../utils/embeds';
import db from '../database/index';

const COOLDOWN_MS = 60_000;

const GATHER_TABLE = [
  { id: 'iron_ore',        weight: 45, name: 'Iron Ore 🪨'         },
  { id: 'herb',            weight: 25, name: 'Forest Herb 🌿'       },
  { id: 'rare_herb',       weight: 12, name: 'Rare Herb 🌺'         },
  { id: 'glowing_mushroom',weight: 10, name: 'Glowing Mushroom 🍄'  },
  { id: 'mana_crystal',    weight: 6,  name: 'Mana Crystal 💠'      },
  { id: 'void_shard',      weight: 2,  name: 'Void Shard 🌑'        },
];

function weightedPick() {
  const total = GATHER_TABLE.reduce((s, g) => s + g.weight, 0);
  let r = Math.random() * total;
  for (const g of GATHER_TABLE) {
    r -= g.weight;
    if (r <= 0) return g;
  }
  return GATHER_TABLE[0];
}

function getLastGather(userId: string, guildId: string): number {
  const row = db.prepare('SELECT last_gather FROM players WHERE user_id=? AND guild_id=?')
    .get(userId, guildId) as any;
  return row?.last_gather ?? 0;
}

function setLastGather(userId: string, guildId: string, ts: number): void {
  db.prepare('UPDATE players SET last_gather=? WHERE user_id=? AND guild_id=?')
    .run(ts, userId, guildId);
}

export const data = new SlashCommandBuilder()
  .setName('gather')
  .setDescription('Thu thập nguyên liệu trong rừng — cooldown 60 giây');

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();
  const { id: userId } = interaction.user;
  const guildId = interaction.guildId!;
  const player = getPlayer(userId, guildId);

  if (!player?.alive) {
    await interaction.editReply({ embeds: [new EmbedBuilder().setColor(COLORS.danger).setDescription('❌ Bạn đã chết. Dùng `/start` để hồi sinh.')] });
    return;
  }

  const now = Date.now();
  const lastGather = getLastGather(userId, guildId);
  const remaining = COOLDOWN_MS - (now - lastGather);

  if (remaining > 0) {
    const secs = Math.ceil(remaining / 1000);
    await interaction.editReply({
      embeds: [new EmbedBuilder().setColor(COLORS.warning)
        .setDescription(`🌿 Cần chờ thêm **${secs}s** để thu thập tiếp.`)]
    });
    return;
  }

  setLastGather(userId, guildId, now);

  // 15% nothing
  if (Math.random() < 0.15) {
    await interaction.editReply({
      embeds: [new EmbedBuilder().setColor(COLORS.dark)
        .setTitle('🌿 Thu thập')
        .setDescription('> *Lục lọ khắp nơi nhưng chẳng thấy gì đáng giá hôm nay...*')
        .setFooter({ text: `${player.name} · cooldown 60s` })]
    });
    return;
  }

  const found = weightedPick();
  const qty = found.id === 'iron_ore' && Math.random() < 0.35 ? 2 : 1;
  addItem(userId, guildId, found.id, qty);

  const isRare = found.id === 'void_shard' || found.id === 'mana_crystal';

  await interaction.editReply({
    embeds: [new EmbedBuilder()
      .setColor(isRare ? COLORS.magic : COLORS.success)
      .setTitle('🌿 Thu thập')
      .setDescription(
        `> *Lướt qua những tán lá...*\n\n` +
        `**${player.name}** tìm được: **${found.name}**${qty > 1 ? ` x${qty}` : ''}!` +
        (isRare ? '\n\n✨ *Nguyên liệu hiếm!*' : '')
      )
      .setFooter({ text: 'cooldown 60s · /inventory để xem đồ' })]
  });
}
