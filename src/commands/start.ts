import {
  SlashCommandBuilder, ChatInputCommandInteraction,
  EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, StringSelectMenuBuilder, StringSelectMenuOptionBuilder
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


function classColor(classId: string): number {
  if (classId === 'mage') return COLORS.magic;
  if (classId === 'rogue' || classId === 'assassin') return COLORS.dark;
  if (classId === 'cleric' || classId === 'paladin') return COLORS.gold;
  if (classId === 'berserker') return COLORS.danger;
  if (classId === 'ranger') return COLORS.success;
  return COLORS.info;
}

function isUnknownInteractionError(err: any): boolean {
  return err?.code === 10062 || err?.rawError?.code === 10062;
}

async function safeDeferComponent(component: { deferUpdate: () => Promise<any>; customId?: string }): Promise<boolean> {
  return component.deferUpdate()
    .then(() => true)
    .catch((err: any) => {
      if (isUnknownInteractionError(err)) {
        console.warn(`[START] Interaction đã hết hạn trước khi bot kịp phản hồi: ${component.customId ?? 'unknown'}`);
        return false;
      }

      console.error('[START] Không thể defer component interaction:', err);
      return false;
    });
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

  const acknowledged = await safeDeferComponent(btn);
  if (!acknowledged) return;

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
    const shown = applyPassiveStats(player);
    const cls = CLASSES[(shown as any).class ?? 'warrior'] ?? CLASSES.warrior;
    const blessing = (shown as any).rebirth_blessing ?? 0;

    await interaction.editReply({
      embeds: [new EmbedBuilder()
        .setColor(classColor(cls.id))
        .setTitle(`${cls.icon} ${shown.name}`)
        .setDescription(
          `Lv.**${shown.level}** ${cls.name}` +
          (blessing > 0 ? `  ✦ Rebirth ×${blessing}` : '') + '\n\n' +
          `> ❤️ **${shown.hp}/${shown.max_hp}**  💧 **${shown.mp}/${shown.max_mp}**\n` +
          `> ⚔️ **${shown.atk}**  🛡️ **${shown.def}**  🪙 **${shown.gold}**\n` +
          `> 🏆 Kills: **${shown.kills}**  💀 Deaths: **${shown.deaths}**`
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
          `*Kỹ năng đã học còn trong Skill Pool. Loadout, inventory và trang bị đang equip đã mất.*`
        )
        .setFooter({ text: player.deaths >= 3 ? '/prestige khi Lv.20 để nhận Rebirth Blessing!' : 'Cẩn thận hơn lần này nhé!' })],
      components: [exploreRow(userId)]
    });

    await waitAndRoute(interaction, userId, guildId);
    return;
  }

  // ── New player — class selection ──────────────────────────────────────────
  const classEntries = Object.values(CLASSES);
  const classRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`class_select_${userId}`)
      .setPlaceholder('Chọn class khởi đầu...')
      .addOptions(
        classEntries.slice(0, 25).map(cls =>
          new StringSelectMenuOptionBuilder()
            .setLabel(cls.name)
            .setValue(cls.id)
            .setDescription(cls.passiveLine.slice(0, 100))
            .setEmoji(cls.icon)
        )
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
    .setFooter({ text: 'Class có thể tiến hoá bằng hệ thống Awakening khi đủ điều kiện.' });

  const msg = await interaction.editReply({ embeds: [selectEmbed], components: [classRow] });

  const sel = await msg.awaitMessageComponent({
    filter: i => i.user.id === userId && i.customId === `class_select_${userId}`,
    componentType: ComponentType.StringSelect,
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
  const chosenId  = sel.values[0];
  const chosenCls = CLASSES[chosenId] ?? CLASSES.warrior;

  createPlayer(userId, guildId, username, chosenId);

  await interaction.editReply({
    embeds: [new EmbedBuilder()
      .setColor(classColor(chosenCls.id))
      .setTitle(`${chosenCls.icon} ${username} — Nhân Vật Mới!`)
      .setDescription(
        `Chào mừng đến **🏘️ Làng Ashveil**!\n\n` +
        `**Class:** ${chosenCls.icon} ${chosenCls.name}\n` +
        `✦ *${chosenCls.passiveLine}*\n\n` +
        `> ❤️ **${100 + chosenCls.hpBonus} HP**  💧 **${50 + chosenCls.mpBonus} MP**\n` +
        `> ⚔️ **${10 + chosenCls.atkBonus} ATK**  🛡️ **${5 + chosenCls.defBonus} DEF**  🪙 **50 Gold**\n\n` +
        `Dùng \`/explore\` để khám phá, \`/inventory\` để quản lý đồ.\n` +
        `⚠️ *Khi chết sẽ mất inventory, loadout và cả trang bị đang equip. Skill Pool được giữ lại.*`
      )
      .setFooter({ text: 'Chúc may mắn, mạo hiểm giả!' })],
    components: [exploreRow(userId)]
  });

  await waitAndRoute(interaction, userId, guildId);
}
