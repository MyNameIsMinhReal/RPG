import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
} from 'discord.js';
import type { PrefixSpec } from './prefixOptions';
import { COLORS } from '../utils/embeds';
import { withImage } from '../utils/eventImages';
import { redeemCode } from '../systems/codes';
import { getPlayer } from '../systems/player';

export const data = new SlashCommandBuilder()
  .setName('code')
  .setDescription('Nhập code để nhận phần thưởng')
  .addStringOption(o =>
    o.setName('code').setDescription('Mã code').setRequired(true)
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const userId  = interaction.user.id;
  const guildId = interaction.guildId!;

  await interaction.deferReply({ ephemeral: true });

  const player = getPlayer(userId, guildId);
  if (!player) {
    await interaction.editReply({ embeds: [new EmbedBuilder().setColor(COLORS.warning).setDescription('❌ Bạn chưa có nhân vật. Dùng `/start` để bắt đầu.')] });
    return;
  }

  const input = interaction.options.getString('code', true).trim().toUpperCase();
  const result = redeemCode(input, userId, guildId);

  if (!result.ok) {
    const msgs: Record<string, string> = {
      not_found: '❌ Code không tồn tại.',
      inactive:  '❌ Code này đã bị vô hiệu hóa.',
      expired:   '⏰ Code đã hết hạn.',
      used:      '⚠️ Bạn đã sử dụng code này rồi.',
      max_uses:  '⚠️ Code đã hết lượt sử dụng.',
    };
    await interaction.editReply({ embeds: [new EmbedBuilder().setColor(COLORS.danger).setDescription(msgs[result.reason])] });
    return;
  }

  const embed = new EmbedBuilder()
    .setColor(COLORS.gold)
    .setTitle('🎁 Nhập Code Thành Công!')
    .setDescription([
      `**${player.name}** đã đổi code **\`${input}\`** thành công!`,
      '',
      '**Phần thưởng:**',
      ...result.rewardLines.map(l => `- ${l}`),
    ].join('\n'))
    .setFooter({ text: 'Phần thưởng đã được cộng vào tài khoản của bạn' });

  const { embed: imgEmbed, files } = withImage(embed, 'code_redeem');
  await interaction.editReply({ embeds: [imgEmbed], files });
}

export const prefixSpec: PrefixSpec = {
  parseString: (name, ctx) => (name === 'code' ? (ctx.argsText.trim() || null) : undefined),
};
