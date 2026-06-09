import {
  SlashCommandBuilder, ChatInputCommandInteraction,
  EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType
} from 'discord.js';
import { getPlayer, createPlayer, resetPlayer, getLoadout, applyPassiveStats } from '../systems/player';
import { getCombatByUser } from '../systems/combat';
import { CLASSES } from '../data/classes';
import { COLORS, buildProfileEmbed } from '../utils/embeds';
import { showExploreMenu } from './explore';
import { getAchievementSummary } from '../systems/achievements';

export const data = new SlashCommandBuilder()
  .setName('start')
  .setDescription('Tạo nhân vật mới — hoặc hồi sinh nếu đã chết');

// ── Shared explore button row ─────────────────────────────────────────────────
function exploreRow(userId: string) {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`start_explore_${userId}`)
      .setLabel('Khám phá ngay!')
      .setEmoji('🗺️')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`start_profile_${userId}`)
      .setLabel('Xem profile')
      .setEmoji('📊')
      .setStyle(ButtonStyle.Secondary)
  );
}

async function waitAndRoute(
  interaction: ChatInputCommandInteraction,
  userId: string, guildId: string
): Promise<void> {
  const msg = await interaction.fetchReply();
  const btn = await msg.awaitMessageComponent({
    filter: i => i.user.id === userId && (
      i.customId === `start_explore_${userId}` ||
      i.customId === `start_profile_${userId}`
    ),
    componentType: ComponentType.Button,
    time: 120_000
  }).catch(() => null);

  if (!btn) {
    await interaction.editReply({ components: [] }).catch(() => {});
    return;
  }

  await btn.deferUpdate();

  if (btn.customId === `start_explore_${userId}`) {
    await showExploreMenu(interaction, userId, guildId);
  } else {
    const player = getPlayer(userId, guildId);
    if (!player) {
      await interaction.editReply({ embeds: [new EmbedBuilder().setColor(COLORS.warning).setDescription('Bạn chưa có nhân vật! Dùng `/start`.')], components: [] });
      return;
    }
    const loadout = getLoadout(userId, guildId);
    const withPassive = applyPassiveStats(player);
    const achievementSummary = getAchievementSummary(userId, guildId);
    await interaction.editReply({
      embeds: [buildProfileEmbed(withPassive, loadout, interaction.user.displayAvatarURL({ size: 128 }), achievementSummary)],
      components: [exploreRow(userId)]
    });
    await waitAndRoute(interaction, userId, guildId);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();
  const { id: userId, username } = interaction.user;
  const guildId = interaction.guildId!;

  if (getCombatByUser(userId, guildId)) {
    await interaction.editReply({ embeds: [new EmbedBuilder().setColor(COLORS.warning).setDescription('⚔️ Bạn đang trong trận chiến! Dùng `/explore` để quay lại.')] });
    return;
  }

  const player  = getPlayer(userId, guildId);

  // ── Already alive ─────────────────────────────────────────────────────────
  if (player?.alive) {
    const cls = CLASSES[(player as any).class ?? 'warrior'] ?? CLASSES.warrior;
    const blessing = (player as any).rebirth_blessing ?? 0;

    await interaction.editReply({
      embeds: [new EmbedBuilder()
        .setColor(cls.id === 'mage' ? COLORS.magic : cls.id === 'rogue' ? COLORS.dark : COLORS.info)
        .setTitle(`${cls.icon} ${player.name}`)
        .setDescription(
          `Lv.**${player.level}** ${cls.name}` +
          (blessing > 0 ? `  ✦ Rebirth ×${blessing}` : '') + '\n\n' +
          `> ❤️ **${player.hp}/${player.max_hp}**  💧 **${player.mp}/${player.max_mp}**\n` +
          `> ⚔️ **${player.atk}**  🛡️ **${player.def}**  🪙 **${player.gold}**\n` +
          `> 🏆 Kills: **${player.kills}**  💀 Deaths: **${player.deaths}**`
        )
        .setFooter({ text: 'Nhân vật đang sống — dùng /explore để phiêu lưu' })],
      components: [exploreRow(userId)]
    });

    await waitAndRoute(interaction, userId, guildId);
    return;
  }

  // ── Dead — revive ─────────────────────────────────────────────────────────
  if (player && !player.alive) {
    resetPlayer(userId, guildId);
    const fresh = getPlayer(userId, guildId)!;
    const cls = CLASSES[(player as any).class ?? 'warrior'] ?? CLASSES.warrior;
    const blessing = (player as any).rebirth_blessing ?? 0;

    await interaction.editReply({
      embeds: [new EmbedBuilder()
        .setColor(COLORS.success)
        .setTitle('🌅 Hồi Sinh!')
        .setDescription(
          `**${username}** tỉnh dậy tại 🏘️ **Làng Ashveil**...\n\n` +
          `${cls.icon} **${cls.name}**` +
          (blessing > 0 ? `  ✦ Rebirth ×${blessing}` : '') + '\n\n' +
          `> ❤️ **${fresh.max_hp} HP**  💧 **${fresh.max_mp} MP**\n` +
          `> ⚔️ **${fresh.atk} ATK**  🛡️ **${fresh.def} DEF**  🪙 **${fresh.gold} Gold**\n\n` +
          `💀 Đã chết: **${player.deaths}** lần  ·  💎 Soul Shards: **${player.soul_shards}**\n` +
          `*Kỹ năng đã học còn đó. Trang bị không mất.*`
        )
        .setFooter({ text: player.deaths >= 3 ? '/prestige khi Lv.20 để nhận Rebirth Blessing!' : 'Cẩn thận hơn lần này nhé!' })],
      components: [exploreRow(userId)]
    });

    await waitAndRoute(interaction, userId, guildId);
    return;
  }

  // ── New player — class selection ──────────────────────────────────────────
  const classEntries = Object.values(CLASSES);
  const classRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    ...classEntries.map(cls =>
      new ButtonBuilder()
        .setCustomId(`class_${cls.id}`)
        .setLabel(cls.name)
        .setEmoji(cls.icon)
        .setStyle(ButtonStyle.Secondary)
    )
  );

  const selectEmbed = new EmbedBuilder()
    .setColor(COLORS.purple)
    .setTitle('🌟 Chào mừng đến thế giới này!')
    .setDescription(
      `Hỡi **${username}**, hãy chọn con đường của mình:\n\n` +
      classEntries.map(cls =>
        `${cls.icon} **${cls.name}**\n> ${cls.description}\n> ✦ *${cls.passiveLine}*`
      ).join('\n\n')
    )
    .setFooter({ text: 'Class có thể đổi khi Prestige (Lv.20)' });

  const msg = await interaction.editReply({ embeds: [selectEmbed], components: [classRow] });

  const sel = await msg.awaitMessageComponent({
    filter: i => i.user.id === userId && i.customId.startsWith('class_'),
    componentType: ComponentType.Button,
    time: 120_000
  }).catch(() => null);

  if (!sel) {
    await interaction.editReply({
      embeds: [new EmbedBuilder().setColor(COLORS.warning).setDescription('⏰ Hết thời gian. Dùng `/start` lại để chọn class.')],
      components: []
    });
    return;
  }

  await sel.deferUpdate();
  const chosenId  = sel.customId.replace('class_', '');
  const chosenCls = CLASSES[chosenId] ?? CLASSES.warrior;

  createPlayer(userId, guildId, username, chosenId);

  await interaction.editReply({
    embeds: [new EmbedBuilder()
      .setColor(chosenCls.id === 'mage' ? COLORS.magic : chosenCls.id === 'rogue' ? COLORS.dark : COLORS.info)
      .setTitle(`${chosenCls.icon} ${username} — Nhân Vật Mới!`)
      .setDescription(
        `Chào mừng đến **🏘️ Làng Ashveil**!\n\n` +
        `**Class:** ${chosenCls.icon} ${chosenCls.name}\n` +
        `✦ *${chosenCls.passiveLine}*\n\n` +
        `> ❤️ **${100 + chosenCls.hpBonus} HP**  💧 **${50 + chosenCls.mpBonus} MP**\n` +
        `> ⚔️ **${10 + chosenCls.atkBonus} ATK**  🛡️ **${5 + chosenCls.defBonus} DEF**  🪙 **50 Gold**\n\n` +
        `Dùng \`/explore\` để khám phá, \`/inventory\` để quản lý đồ.\n` +
        `⚠️ *Khi chết sẽ mất inventory — nhưng trang bị đang equip được giữ lại.*`
      )
      .setFooter({ text: 'Chúc may mắn, mạo hiểm giả!' })],
    components: [exploreRow(userId)]
  });

  await waitAndRoute(interaction, userId, guildId);
}
