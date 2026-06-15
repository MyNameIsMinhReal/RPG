import type { EmbedBuilder, Message, ActionRowBuilder, ButtonBuilder } from 'discord.js';
import { onlyUser } from '../utils/collectors';
import type { RunExploreEventInput } from './exploreEvents';

/**
 * Shared tail for every biome explore-event file: show the result embed and
 * offer the "Continue exploring" row. Previously copy-pasted identically into
 * exploreEvents.forest/mines/wastes/world/reputation/shrine/time/guild.ts.
 */
export async function finishExploreEvent(ctx: RunExploreEventInput, embed: EmbedBuilder): Promise<void> {
  const msg = await ctx.interaction.editReply({
    embeds: [embed],
    components: ctx.callbacks.buildContinueExploreRow(ctx.userId)
  });
  await ctx.callbacks.attachContinueExploreHandler(msg as Message<boolean>, ctx.interaction, ctx.userId, ctx.guildId);
}

/**
 * Shared button-await for biome explore events: render embed+row, wait for the
 * actor's click, defer it, return the customId (or null on timeout/failure).
 * Previously copy-pasted into world/reputation/time/guild event files.
 */
export async function awaitExploreBtn(
  ctx: RunExploreEventInput,
  embed: EmbedBuilder,
  row: ActionRowBuilder<ButtonBuilder>,
  time = 30_000
): Promise<string | null> {
  const reply = await ctx.interaction.editReply({ embeds: [embed], components: [row] });
  const btn = await reply.awaitMessageComponent({ filter: onlyUser(ctx.userId), time }).catch(() => null);
  if (!btn || !btn.isButton()) return null;
  const ok = await btn.deferUpdate().then(() => true).catch(() => false);
  return ok ? btn.customId : null;
}
