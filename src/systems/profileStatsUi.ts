import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  type ChatInputCommandInteraction,
  type User,
} from 'discord.js';
import {
  getPlayer,
  getLoadout,
  applyPassiveStats,
  spendStatPoint,
  spendStatPointsBulk,
  resetAllocatedStats,
} from './player';
import { getAchievementSummary } from './achievements';
import { buildProfileEmbed, simpleEmbed, COLORS } from '../utils/embeds';
import { getStatSummary, STAT_DEFS, type StatKey } from './statSystem';

const STAT_KEYS: StatKey[] = ['str', 'vit', 'end', 'agi', 'luk'];

function statButton(userId: string, key: StatKey, disabled: boolean): ButtonBuilder {
  const def = STAT_DEFS[key];
  return new ButtonBuilder()
    .setCustomId(`profile_stat_add_${userId}_${key}`)
    .setLabel(`+${def.label}`)
    .setEmoji(def.icon)
    .setStyle(ButtonStyle.Primary)
    .setDisabled(disabled);
}

export function buildStatControlRows(userId: string, guildId: string) {
  const player = getPlayer(userId, guildId);
  if (!player) return [];
  const summary = getStatSummary(player);
  const noPoints = summary.availablePoints <= 0;
  const noSpent = summary.spentPoints <= 0;

  return [
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      ...STAT_KEYS.map(key => statButton(userId, key, noPoints))
    ),
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`profile_stat_bulk_${userId}`)
        .setLabel('Nhập điểm')
        .setEmoji('🔢')
        .setStyle(ButtonStyle.Success)
        .setDisabled(noPoints),
      new ButtonBuilder()
        .setCustomId(`profile_stat_reset_${userId}`)
        .setLabel(summary.freeResetAvailable ? 'Reset stats miễn phí' : 'Đã dùng reset miễn phí')
        .setEmoji('♻️')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(!summary.freeResetAvailable || noSpent),
    ),
  ];
}

function buildResetConfirmRows(userId: string) {
  return [new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`profile_stat_reset_yes_${userId}`)
      .setLabel('Xác nhận reset')
      .setEmoji('✅')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(`profile_stat_reset_no_${userId}`)
      .setLabel('Hủy')
      .setEmoji('↩️')
      .setStyle(ButtonStyle.Secondary),
  )];
}

function buildBulkStatModal(userId: string, availablePoints: number): ModalBuilder {
  return new ModalBuilder()
    .setCustomId(`profile_stat_bulk_modal_${userId}`)
    .setTitle(`Cộng Stat Points (${availablePoints} điểm)`)
    .addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId('stat_allocation')
          .setLabel('Nhập điểm muốn cộng')
          .setStyle(TextInputStyle.Paragraph)
          .setPlaceholder('Ví dụ: STR 3, VIT 2, LUK 1\nHoặc: 3/2/0/0/1 = STR/VIT/END/AGI/LUK')
          .setRequired(true)
          .setMaxLength(120)
      )
    );
}

function parseBulkStatInput(raw: string): Partial<Record<StatKey, number>> | null {
  const text = raw.trim().toLowerCase();
  if (!text) return null;

  const numericOnly = text.replace(/[，,;|]+/g, ' ').replace(/\s*\/\s*/g, ' ');
  if (/^\d+(\s+\d+){4}$/.test(numericOnly)) {
    const nums = numericOnly.split(/\s+/).map(n => Number.parseInt(n, 10));
    return { str: nums[0], vit: nums[1], end: nums[2], agi: nums[3], luk: nums[4] };
  }

  const allocation: Partial<Record<StatKey, number>> = {};
  const regex = /\b(str|vit|end|agi|luk)\b\s*[:=+\-]?\s*(\d+)/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    const key = match[1] as StatKey;
    const value = Number.parseInt(match[2], 10);
    allocation[key] = (allocation[key] ?? 0) + value;
  }

  return Object.keys(allocation).length ? allocation : null;
}

function formatAllocation(allocation: Partial<Record<StatKey, number>>): string {
  return STAT_KEYS
    .map(key => {
      const value = allocation[key] ?? 0;
      return value > 0 ? `${STAT_DEFS[key].icon} +${value} ${STAT_DEFS[key].label}` : '';
    })
    .filter(Boolean)
    .join(' · ');
}

async function renderProfile(interaction: ChatInputCommandInteraction, user: User, guildId: string, notice?: string): Promise<void> {
  const player = getPlayer(user.id, guildId);
  if (!player) return;
  const shown = applyPassiveStats(player);
  const loadout = getLoadout(user.id, guildId);
  const achievementSummary = getAchievementSummary(user.id, guildId);
  const embed = buildProfileEmbed(shown, loadout, user.displayAvatarURL({ size: 128 }), achievementSummary);
  if (notice) embed.setFooter({ text: notice });
  await interaction.editReply({ embeds: [embed], components: buildStatControlRows(user.id, guildId) });
}

export async function attachProfileStatCollector(interaction: ChatInputCommandInteraction, user: User, guildId: string): Promise<void> {
  const reply = await interaction.fetchReply();
  const collector = reply.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 120_000,
    filter: i => i.user.id === user.id && (
      i.customId.startsWith(`profile_stat_add_${user.id}_`) ||
      i.customId === `profile_stat_bulk_${user.id}` ||
      i.customId === `profile_stat_reset_${user.id}` ||
      i.customId === `profile_stat_reset_yes_${user.id}` ||
      i.customId === `profile_stat_reset_no_${user.id}`
    ),
  });

  collector.on('collect', async (btn) => {
    if (btn.customId === `profile_stat_bulk_${user.id}`) {
      const player = getPlayer(user.id, guildId);
      if (!player) return;
      const summary = getStatSummary(player);
      if (summary.availablePoints <= 0) {
        await btn.reply({ content: 'Bạn không còn Stat Point để cộng.', ephemeral: true }).catch(() => {});
        return;
      }

      await btn.showModal(buildBulkStatModal(user.id, summary.availablePoints)).catch(() => null);
      const modal = await btn.awaitModalSubmit({
        time: 45_000,
        filter: i => i.user.id === user.id && i.customId === `profile_stat_bulk_modal_${user.id}`,
      }).catch(() => null);
      if (!modal) return;

      await modal.deferUpdate().catch(() => null);
      const allocation = parseBulkStatInput(modal.fields.getTextInputValue('stat_allocation'));
      if (!allocation) {
        await renderProfile(interaction, user, guildId, 'Nhập không hợp lệ. Ví dụ: STR 3, VIT 2, LUK 1 hoặc 3/2/0/0/1.');
        return;
      }

      const res = spendStatPointsBulk(user.id, guildId, allocation);
      const msg = res.ok
        ? `Đã cộng ${formatAllocation(allocation)}.`
        : res.reason === 'no_points'
          ? 'Không đủ Stat Point cho số điểm vừa nhập.'
          : 'Không thể cộng stats từ form vừa nhập.';
      await renderProfile(interaction, user, guildId, msg);
      return;
    }

    const deferred = await btn.deferUpdate().then(() => true).catch(() => false);
    if (!deferred) return;

    if (btn.customId.startsWith(`profile_stat_add_${user.id}_`)) {
      const key = btn.customId.split('_').pop() as StatKey;
      const def = STAT_DEFS[key];
      const res = spendStatPoint(user.id, guildId, key);
      const msg = res.ok
        ? `${def.icon} Đã cộng +1 ${def.label}.`
        : res.reason === 'no_points'
          ? 'Bạn không còn Stat Point để cộng.'
          : 'Không thể cộng stat này.';
      await renderProfile(interaction, user, guildId, msg);
      return;
    }

    if (btn.customId === `profile_stat_reset_${user.id}`) {
      await interaction.editReply({
        embeds: [simpleEmbed(COLORS.warning, '♻️ Bạn chắc muốn reset toàn bộ STR/VIT/END/AGI/LUK? Lượt reset miễn phí sẽ bị dùng.')],
        components: buildResetConfirmRows(user.id),
      });
      return;
    }

    if (btn.customId === `profile_stat_reset_yes_${user.id}`) {
      const res = resetAllocatedStats(user.id, guildId, true);
      const msg = res.ok
        ? '♻️ Đã reset stats. Bạn có thể cộng lại điểm theo build mới.'
        : res.reason === 'no_free_reset'
          ? 'Bạn đã dùng lượt reset stats miễn phí rồi.'
          : 'Không thể reset stats.';
      await renderProfile(interaction, user, guildId, msg);
      return;
    }

    if (btn.customId === `profile_stat_reset_no_${user.id}`) {
      await renderProfile(interaction, user, guildId, 'Đã hủy reset stats.');
    }
  });

  collector.on('end', async () => {
    await interaction.editReply({ components: [] }).catch(() => {});
  });
}
