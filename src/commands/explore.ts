import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { getPlayer } from '../systems/player';
import { getCombatByUser } from '../systems/combat';
import { canExplore, exploreCooldownRemaining } from '../systems/economy';
import { setCombatFallbackHandlers } from '../systems/combatRegistry';
import { COLORS } from '../utils/embeds';
import { simpleEmbed, clearStaleCombat, resumeCombat } from '../systems/explore/shared';
import { showExploreMenu } from '../systems/explore/menu';
import { handleVictory, handleDeath, handleFlee } from '../systems/explore/callbacks';

export const data = new SlashCommandBuilder()
  .setName('explore')
  .setDescription('Khám phá khu vực hiện tại');

// Generic combat outcome handlers, used by dispatchCombatInteraction to rebuild
// the in-memory combat registry after a bot restart wipes it.
setCombatFallbackHandlers({ onVictory: handleVictory, onDeath: handleDeath, onFlee: handleFlee });

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const deferred = await interaction.deferReply().then(() => true).catch((err) => {
    if (err?.code === 10062) return false;
    console.error('[EXPLORE] deferReply failed:', err);
    return false;
  });

  if (!deferred) return;

  const { id: userId } = interaction.user;
  const guildId = interaction.guildId!;
  const player = getPlayer(userId, guildId);

  if (!player) {
    await interaction.editReply({ embeds: [simpleEmbed(COLORS.warning, 'Bạn chưa có nhân vật! Dùng `/start`.')] });
    return;
  }

  if (!player.alive) {
    await interaction.editReply({ embeds: [simpleEmbed(COLORS.danger, '☠️ Nhân vật đã chết. Dùng `/start` để hồi sinh!')] });
    return;
  }

  await clearStaleCombat(interaction, userId, guildId);
  const currentCombat = getCombatByUser(userId, guildId);
  if (currentCombat) {
    await resumeCombat(interaction, currentCombat);
    return;
  }

  if (!canExplore(player)) {
    const remaining = exploreCooldownRemaining(player);
    await interaction.editReply({ embeds: [simpleEmbed(COLORS.warning, `⏳ Hãy chờ ${remaining} giây trước khi khám phá lại.`)] });
    return;
  }

  await showExploreMenu(interaction, userId, guildId);
}

export { showExploreMenu } from '../systems/explore/menu';

// Text-prefix aliases (auto-loaded by registry.ts)
export const aliases = ['e','ex','x'];
