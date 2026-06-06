import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { getPlayer, addItem } from '../systems/player';
import { COLORS } from '../utils/embeds';
import db from '../database/index';

const COOLDOWN_MS = 60_000;

const FISH_TABLE = [
  { id: 'common_fish',   weight: 55, name: 'Common Fish 🐟'   },
  { id: 'silver_fish',   weight: 25, name: 'Silver Fish 🐠'   },
  { id: 'mystery_shell', weight: 12, name: 'Mystery Shell 🐚' },
  { id: 'golden_fish',   weight: 5,  name: 'Golden Fish 🐡'   },
  { id: 'glowing_bait',  weight: 3,  name: 'Glowing Bait ✨'  },
];

function weightedPick() {
  const total = FISH_TABLE.reduce((s, f) => s + f.weight, 0);
  let r = Math.random() * total;
  for (const f of FISH_TABLE) {
    r -= f.weight;
    if (r <= 0) return f;
  }
  return FISH_TABLE[0];
}

function getLastFish(userId: string, guildId: string): number {
  const row = db.prepare('SELECT last_fish FROM players WHERE user_id=? AND guild_id=?')
    .get(userId, guildId) as any;
  return row?.last_fish ?? 0;
}

function setLastFish(userId: string, guildId: string, ts: number): void {
  db.prepare('UPDATE players SET last_fish=? WHERE user_id=? AND guild_id=?')
    .run(ts, userId, guildId);
}

export const data = new SlashCommandBuilder()
  .setName('fish')
  .setDescription('Câu cá tại suối — cooldown 60 giây');

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
  const lastFish = getLastFish(userId, guildId);
  const remaining = COOLDOWN_MS - (now - lastFish);

  if (remaining > 0) {
    const secs = Math.ceil(remaining / 1000);
    await interaction.editReply({
      embeds: [new EmbedBuilder().setColor(COLORS.warning)
        .setDescription(`🎣 Cần chờ thêm **${secs}s** để câu tiếp.`)]
    });
    return;
  }

  setLastFish(userId, guildId, now);

  // 20% chance of catching nothing
  if (Math.random() < 0.20) {
    await interaction.editReply({
      embeds: [new EmbedBuilder().setColor(COLORS.dark)
        .setTitle('🎣 Câu cá')
        .setDescription('> *Sợi dây rung nhẹ... rồi thôi. Hôm nay cá không hợp tác.*')
        .setFooter({ text: `${player.name} · cooldown 60s` })]
    });
    return;
  }

  const caught = weightedPick();
  const qty = caught.id === 'common_fish' && Math.random() < 0.3 ? 2 : 1;
  addItem(userId, guildId, caught.id, qty);

  const isRare = caught.id === 'golden_fish' || caught.id === 'void_shard';

  await interaction.editReply({
    embeds: [new EmbedBuilder()
      .setColor(isRare ? COLORS.gold : COLORS.info)
      .setTitle('🎣 Câu cá')
      .setDescription(
        `> *Sợi dây giật mạnh...*\n\n` +
        `**${player.name}** câu được: **${caught.name}**${qty > 1 ? ` x${qty}` : ''}!` +
        (isRare ? '\n\n✨ *Vật phẩm hiếm!*' : '')
      )
      .setFooter({ text: 'cooldown 60s · /inventory để xem đồ' })]
  });
}
