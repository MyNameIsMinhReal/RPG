import {
  SlashCommandBuilder, ChatInputCommandInteraction,
  EmbedBuilder
} from 'discord.js';
import { getPlayer, spendGold, grantGold } from '../systems/player';
import { logEvent } from '../systems/world';
import { awardAchievements } from '../systems/achievements';
import { COLORS } from '../utils/embeds';

const TAX_RATE = 0.08; // 8% tax on gold transfers → gold sink

export const data = new SlashCommandBuilder()
  .setName('trade')
  .setDescription('Chuyển Gold cho người chơi khác (thuế 8%)')
  .addUserOption(opt =>
    opt.setName('target')
       .setDescription('Người nhận')
       .setRequired(true)
  )
  .addIntegerOption(opt =>
    opt.setName('amount')
       .setDescription('Số Gold muốn gửi')
       .setRequired(true)
       .setMinValue(1)
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  const { id: userId } = interaction.user;
  const guildId  = interaction.guildId!;
  const target   = interaction.options.getUser('target', true);
  const amount   = interaction.options.getInteger('amount', true);

  // Self-trade check
  if (target.id === userId) {
    await interaction.editReply({
      embeds: [new EmbedBuilder().setColor(COLORS.warning).setDescription('Không thể tự gửi tiền cho bản thân!')]
    });
    return;
  }

  // Bot check
  if (target.bot) {
    await interaction.editReply({
      embeds: [new EmbedBuilder().setColor(COLORS.warning).setDescription('Không thể giao dịch với bot!')]
    });
    return;
  }

  const sender   = getPlayer(userId, guildId);
  const receiver = getPlayer(target.id, guildId);

  if (!sender || !sender.alive) {
    await interaction.editReply({ embeds: [new EmbedBuilder().setColor(COLORS.warning).setDescription('Nhân vật của bạn không hợp lệ hoặc đã chết!')] });
    return;
  }
  if (!receiver || !receiver.alive) {
    await interaction.editReply({ embeds: [new EmbedBuilder().setColor(COLORS.warning).setDescription(`**${target.username}** chưa có nhân vật hoặc đã chết!`)] });
    return;
  }

  if (sender.gold < amount) {
    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(COLORS.warning)
          .setDescription(`Không đủ Gold!\nCần **${amount} 🪙** nhưng bạn chỉ có **${sender.gold} 🪙**.`)
      ]
    });
    return;
  }

  const tax        = Math.max(1, Math.floor(amount * TAX_RATE));
  const received   = amount - tax;

  spendGold(userId, guildId, amount);
  grantGold(target.id, guildId, received);

  logEvent(guildId, userId, sender.name, 'trade',
    `đã chuyển **${received}** Gold cho **${receiver.name}** (thuế ${tax} Gold).`);
  const achievementMessages = awardAchievements(userId, guildId);

  const embed = new EmbedBuilder()
    .setColor(COLORS.gold)
    .setTitle('💸 Giao Dịch Thành Công')
    .setDescription(`**${sender.name}** → **${receiver.name}**`)
    .addFields(
      { name: '📤 Gửi',    value: `**${amount}** 🪙`,   inline: true },
      { name: '💰 Thuế',   value: `−**${tax}** 🪙`,     inline: true },
      { name: '📥 Nhận',   value: `**${received}** 🪙`, inline: true },
      { name: `🪙 Gold còn lại (${sender.name})`, value: `**${sender.gold - amount}**`, inline: true },
      { name: `🪙 Gold mới (${receiver.name})`,   value: `**${receiver.gold + received}**`, inline: true }
    )
    .setFooter({ text: `Thuế ${TAX_RATE * 100}% được thu vào quỹ quốc gia (gold sink)` });

  if (achievementMessages.length) {
    embed.addFields({ name: '🏆 Thành tựu mới', value: achievementMessages.join('\n'), inline: false });
  }

  await interaction.editReply({
    embeds: [embed]
  });
}

// Text-prefix aliases (auto-loaded by registry.ts)
export const aliases = ['t','give','pay','send'];
