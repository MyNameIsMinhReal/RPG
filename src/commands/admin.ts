import {
  SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder
} from 'discord.js';
import { clearPlayerBossProgress, hasPlayerClearedBoss } from '../systems/world';
import { getPlayer, revivePlayer, applyPassiveStats } from '../systems/player';
import { ZONES } from '../data/zones';

const BOSS_IDS = Object.values(ZONES)
  .filter(z => z.bossId)
  .map(z => ({ id: z.bossId!, zone: z.name }));

const ALLOWED_IDS = new Set(
  (process.env.BOT_ADMIN_IDS ?? '').split(',').map(s => s.trim()).filter(Boolean)
);

function isAllowed(userId: string): boolean {
  return ALLOWED_IDS.has(userId);
}

export const data = new SlashCommandBuilder()
  .setName('admin')
  .setDescription('Công cụ quản trị bot')
  .addSubcommand(sub => sub
    .setName('resetboss')
    .setDescription('Xoá tiến trình boss của người chơi (cho phép đánh lại boss gate)')
    .addUserOption(opt => opt.setName('user').setDescription('Người chơi cần reset').setRequired(true))
    .addStringOption(opt => opt
      .setName('boss')
      .setDescription('Boss cụ thể cần xoá (bỏ trống = xoá tất cả)')
      .setRequired(false)
      .addChoices(...BOSS_IDS.map(b => ({ name: `${b.zone} — ${b.id}`, value: b.id })))
    )
  )
  .addSubcommand(sub => sub
    .setName('revive')
    .setDescription('Hồi sinh người chơi đã chết (hồi 50% HP/MP, giữ nguyên stats)')
    .addUserOption(opt => opt.setName('user').setDescription('Người chơi cần hồi sinh').setRequired(true))
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  if (!isAllowed(interaction.user.id)) {
    await interaction.editReply({ content: '❌ Bạn không có quyền dùng lệnh này.' });
    return;
  }

  const sub = interaction.options.getSubcommand();

  if (sub === 'revive') {
    const target = interaction.options.getUser('user', true);
    const guildId = interaction.guildId!;
    const player = getPlayer(target.id, guildId);

    if (!player) {
      await interaction.editReply({ content: `❌ <@${target.id}> chưa có nhân vật.` });
      return;
    }
    if (player.alive) {
      await interaction.editReply({ content: `ℹ️ <@${target.id}> vẫn đang sống, không cần hồi sinh.` });
      return;
    }

    revivePlayer(target.id, guildId);
    const fresh = applyPassiveStats(getPlayer(target.id, guildId)!);

    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x57F287)
          .setTitle('✨ Hồi Sinh Thành Công')
          .addFields(
            { name: 'Người chơi', value: `<@${target.id}> (${player.name})`, inline: true },
            { name: '❤️ HP', value: `${fresh.hp}/${fresh.max_hp}`, inline: true },
            { name: '💧 MP', value: `${fresh.mp}/${fresh.max_mp}`, inline: true },
          )
      ]
    });
    return;
  }

  if (sub === 'resetboss') {
    const target = interaction.options.getUser('user', true);
    const bossId = interaction.options.getString('boss') ?? undefined;
    const guildId = interaction.guildId!;

    const cleared = clearPlayerBossProgress(guildId, target.id, bossId);

    const bossLabel = bossId ?? 'tất cả boss';
    const statusLines = bossId
      ? [`**${bossId}**: ${hasPlayerClearedBoss(guildId, target.id, bossId) ? '✅ đã clear' : '❌ chưa clear'}`]
      : BOSS_IDS.map(b => `**${b.id}**: ${hasPlayerClearedBoss(guildId, target.id, b.id) ? '✅' : '❌'}`);

    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(cleared > 0 ? 0xED4245 : 0x95A5A6)
          .setTitle(cleared > 0 ? '🗑️ Đã xoá tiến trình boss' : 'ℹ️ Không có gì để xoá')
          .addFields(
            { name: 'Người chơi', value: `<@${target.id}>`, inline: true },
            { name: 'Boss', value: bossLabel, inline: true },
            { name: 'Đã xoá', value: `${cleared} bản ghi`, inline: true },
            { name: 'Trạng thái hiện tại', value: statusLines.join('\n') || '—' }
          )
      ]
    });
  }
}
