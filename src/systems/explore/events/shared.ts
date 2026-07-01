import {
  ActionRowBuilder,
  ButtonBuilder,
  EmbedBuilder,
  Message,
} from 'discord.js';
import { onlyUser } from '../../../utils/collectors';
import type { RunExploreEventInput } from './types';

/**
 * Shared tail for every biome explore-event file: show the result embed and
 * offer the "Continue exploring" row.
 */
export async function finishExploreEvent(ctx: RunExploreEventInput, embed: EmbedBuilder): Promise<void> {
  const msg = await ctx.interaction.editReply({
    embeds: [embed],
    components: ctx.callbacks.buildContinueExploreRow(ctx.userId),
  });
  await ctx.callbacks.attachContinueExploreHandler(
    msg as Message<boolean>,
    ctx.interaction,
    ctx.userId,
    ctx.guildId,
  );
}

/**
 * Shared button-await for biome explore events: render embed+row, wait for the
 * actor's click, defer it, return the customId (or null on timeout/failure).
 */
export async function awaitExploreBtn(
  ctx: RunExploreEventInput,
  embed: EmbedBuilder,
  row: ActionRowBuilder<ButtonBuilder>,
  time = 30_000,
): Promise<string | null> {
  const reply = await ctx.interaction.editReply({ embeds: [embed], components: [row] });
  const btn = await reply.awaitMessageComponent({ filter: onlyUser(ctx.userId), time }).catch(() => null);
  if (!btn || !btn.isButton()) return null;
  const ok = await btn.deferUpdate().then(() => true).catch(() => false);
  return ok ? btn.customId : null;
}

export type VoteResult = { customId: string; deferUpdate(): Promise<void>; isButton(): boolean };

export async function awaitVote(
  ctx: RunExploreEventInput,
  reply: Awaited<ReturnType<typeof ctx.interaction.editReply>>,
  time = 30_000,
): Promise<VoteResult | null> {
  const memberIds = ctx.partyMemberIds;

  if (!memberIds || memberIds.length <= 1) {
    const btn = await reply.awaitMessageComponent({ filter: onlyUser(ctx.userId), time }).catch(() => null);
    if (!btn || !btn.isButton()) return null;
    await btn.deferUpdate().catch(() => {});
    return btn as unknown as VoteResult;
  }

  return new Promise<VoteResult | null>((resolve) => {
    const votes = new Map<string, string>();
    const collector = reply.createMessageComponentCollector({
      filter: (i) => memberIds.includes(i.user.id) && i.isButton(),
      time,
    });
    const updateDisplay = async () => {
      const total = memberIds.length;
      const voted = votes.size;
      const statusLine = `🗳️ Đã vote: **${voted}/${total}**` + (voted < total ? ' — đang chờ...' : '');
      const cur = reply.embeds[0];
      if (cur) {
        await ctx.interaction.editReply({
          embeds: [new EmbedBuilder(cur.toJSON()).setFooter({ text: statusLine })],
        }).catch(() => {});
      }
    };
    collector.on('collect', async (i) => {
      votes.set(i.user.id, i.customId);
      await i.deferUpdate().catch(() => {});
      await updateDisplay();
      if (votes.size >= memberIds.length) collector.stop('all_voted');
    });
    collector.on('end', () => {
      ctx.interaction.editReply({ components: [] }).catch(() => {});
      if (!votes.size) {
        resolve(null);
        return;
      }
      const tally = new Map<string, number>();
      for (const cid of votes.values()) tally.set(cid, (tally.get(cid) ?? 0) + 1);
      let winner = '';
      let maxV = 0;
      for (const [cid, count] of tally) {
        if (count > maxV) {
          maxV = count;
          winner = cid;
        }
      }
      resolve(winner ? { customId: winner, deferUpdate: async () => {}, isButton: () => true } : null);
    });
  });
}
