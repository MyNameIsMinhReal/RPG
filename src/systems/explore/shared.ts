import {
  ChatInputCommandInteraction,
  EmbedBuilder, ButtonBuilder, ButtonStyle,
  ActionRowBuilder, Message
} from 'discord.js';
import { getPlayer } from '../player';
import { getCombatByUser, saveCombat, deleteCombat } from '../combat';
import { hasActiveCombatSkills, hasUsableItems } from '../combatFlow';
import { registerCombat } from '../combatRegistry';
import { getPartyOf } from '../party';
import {
  COLORS, buildCombatEmbed, buildCombatButtons
} from '../../utils/embeds';
import { getZone } from '../../data/zones';
import { getEnemy } from '../../data/enemies';
import { onlyUser } from '../../utils/collectors';
import { showExploreMenu } from './menu';
import { handleSearch } from './search';
import { handleVictory, handleDeath, handleFlee } from './callbacks';

// ── Helpers ───────────────────────────────────────────────────────────────────
export function simpleEmbed(color: number, desc: string) {
  return new EmbedBuilder().setColor(color).setDescription(desc);
}

export async function clearStaleCombat(
  interaction: ChatInputCommandInteraction,
  userId: string, guildId: string
): Promise<void> {
  const current = getCombatByUser(userId, guildId);
  if (!current) return;

  try {
    const channel = await interaction.client.channels.fetch(current.channel_id);
    if (!channel || !('messages' in channel)) {
      // Channel gone — safe to delete
      deleteCombat(current.message_id);
      return;
    }
    await (channel as any).messages.fetch(current.message_id);
  } catch (e: any) {
    // Only delete if message is actually gone (404 Unknown Message / Unknown Channel).
    // Don't delete on rate limits, network errors, or other transient failures.
    const code = e?.code ?? e?.status;
    if (code === 10008 || code === 10003 || code === 404) {
      deleteCombat(current.message_id);
    }
  }
}

export function buildContinueExploreRow(userId: string) {
  return [new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`continue_explore_${userId}`)
      .setLabel('🔎 Khám phá tiếp')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`continue_menu_${userId}`)
      .setLabel('📍 Menu chính')
      .setStyle(ButtonStyle.Secondary)
  )];
}

export async function ensurePlayerAlive(
  interaction: ChatInputCommandInteraction,
  userId: string,
  guildId: string
): Promise<boolean> {
  const player = getPlayer(userId, guildId);
  if (player?.alive) return true;

  await interaction.editReply({
    embeds: [simpleEmbed(
      COLORS.danger,
      `☠️ **${player?.name ?? 'Nhân vật'}** đã chết. Linh hồn đang chờ vòng chuyển sinh mới.\n\nDùng \`/start\` để tái sinh rồi mới có thể khám phá tiếp.`
    )],
    components: []
  }).catch(() => {});

  return false;
}

export async function attachContinueExploreHandler(
  message: Message<boolean>,
  interaction: ChatInputCommandInteraction,
  userId: string,
  guildId: string
): Promise<void> {
  let processing = false;

  const collector = message.createMessageComponentCollector({
    filter: onlyUser(userId),
    time: 120_000
  });

  collector.on('collect', async (i) => {
    if (
      i.customId !== `continue_explore_${userId}` &&
      i.customId !== `continue_menu_${userId}`
    ) {
      return;
    }

    const deferred = await i.deferUpdate().then(() => true).catch(() => false);
    if (!deferred) return;

    if (processing) return;
    processing = true;

    await message.edit({ components: [] }).catch(() => {});
    collector.stop('continue');

    if (!(await ensurePlayerAlive(interaction, userId, guildId))) {
      return;
    }

    if (i.customId === `continue_explore_${userId}`) {
      const p = getPlayer(userId, guildId)!;
      const z = getZone(p.zone_id)!;
      if (z.safe) {
        await showExploreMenu(interaction, userId, guildId);
      } else {
        await handleSearch(interaction, userId, guildId);
      }
    } else {
      await showExploreMenu(interaction, userId, guildId);
    }
  });

  collector.on('end', (_c, reason) => {
    if (reason === 'time') {
      message.edit({ components: [] }).catch(() => {});
    }
  });
}

export async function resumeCombat(
  interaction: ChatInputCommandInteraction,
  current: NonNullable<ReturnType<typeof getCombatByUser>>
): Promise<void> {
  const userId  = current.user_id;
  const guildId = current.guild_id;

  const enemy = getEnemy(current.enemy_id);
  if (!enemy && !current.enemies_json) {
    deleteCombat(current.message_id);
    await interaction.editReply({ content: '⚠️ Trận combat cũ bị lỗi data và đã được xoá. Hãy explore lại.', embeds: [], components: [] });
    return;
  }

  const player = getPlayer(userId, guildId)!;
  const icon   = enemy?.icon ?? '⚔️';
  let combatLog: string[] = [];
  try { combatLog = JSON.parse(current.combat_log ?? '[]'); } catch { combatLog = []; }

  const embed   = buildCombatEmbed(current, player.name, icon, combatLog);
  const buttons = buildCombatButtons(userId, hasActiveCombatSkills(userId, guildId), current.player_stamina ?? 100, hasUsableItems(userId, guildId), current.active_effects);
  const reply   = await interaction.editReply({ embeds: [embed], components: buttons });

  deleteCombat(current.message_id);
  const newState = { ...current, message_id: reply.id };
  saveCombat(newState);

  const enemyForCallbacks = enemy ?? { id: current.enemy_id, name: current.enemy_name, icon };
  registerCombat(userId, guildId, {
    onVictory: handleVictory,
    onDeath:   handleDeath,
    onFlee:    handleFlee,
    enemy:     enemyForCallbacks,
    icon,
  });
}

// Returns true if the player is a non-leader party member (should be blocked from solo actions).
export async function blockIfPartyMember(
  interaction: ChatInputCommandInteraction, userId: string, guildId: string
): Promise<boolean> {
  const party = getPartyOf(guildId, userId);
  if (party && party.leaderId !== userId && (party.memberIds.length ?? 0) > 1) {
    const leaderName = getPlayer(party.leaderId, guildId)?.name ?? 'Leader';
    await interaction.editReply({
      embeds: [simpleEmbed(COLORS.warning, `👥 Bạn đang trong party. Chỉ **${leaderName}** (leader) mới có thể khám phá và di chuyển cho cả nhóm.`)],
      components: []
    });
    return true;
  }
  return false;
}
