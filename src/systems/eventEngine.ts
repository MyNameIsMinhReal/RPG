import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  Message,
} from 'discord.js';
import {
  addItem,
  adjustReputation,
  adjustWanted,
  getItemQty,
  getPlayer,
  grantExp,
  grantGold,
  grantSoulShards,
  spendGold,
  updatePlayerHpMp,
} from './player';
import { adjustWorldDanger } from './world';
import { COLORS, simpleEmbed } from '../utils/embeds';
import { pick, randInt } from '../utils/format';
import { onlyParty, onlyUser } from '../utils/collectors';
import { getItem } from '../data/items';
import { getMaterial } from '../data/materials';
import {
  DATA_DRIVEN_EXPLORE_EVENTS,
  type DataButtonStyle,
  type DataDrivenExploreEventDef,
  type DataDrivenExploreEventId,
  type DataEventAction,
  type DataEventChoice,
  type DataEventOutcome,
  type DataEventMiniGame,
  type DataEventMiniGameOption,
  type DataEventMiniGameRound,
} from '../data/exploreEventDefs';
import type { PickExploreEventInput, RunExploreEventInput } from '../commands/exploreEvents';

const DATA_EVENT_IDS = new Set<string>(DATA_DRIVEN_EXPLORE_EVENTS.map(e => e.id));

const STYLE_MAP: Record<DataButtonStyle, ButtonStyle> = {
  primary: ButtonStyle.Primary,
  secondary: ButtonStyle.Secondary,
  success: ButtonStyle.Success,
  danger: ButtonStyle.Danger,
};

export function isDataDrivenExploreEvent(event: string): event is DataDrivenExploreEventId {
  return DATA_EVENT_IDS.has(event);
}

export function getDataDrivenExploreEvent(event: DataDrivenExploreEventId): DataDrivenExploreEventDef | undefined {
  return DATA_DRIVEN_EXPLORE_EVENTS.find(e => e.id === event);
}

export function getDataDrivenEventWeights(input: PickExploreEventInput): Array<[DataDrivenExploreEventId, number]> {
  const { player, hasCombat } = input;
  const rep = player.reputation ?? 0;
  const wanted = player.wanted_level ?? 0;

  return DATA_DRIVEN_EXPLORE_EVENTS.map((event): [DataDrivenExploreEventId, number] => {
    if (event.zones?.length && !event.zones.includes(player.zone_id ?? '')) return [event.id, 0];
    if (event.requiresCombat && !hasCombat) return [event.id, 0];
    if (event.minRep !== undefined && rep < event.minRep) return [event.id, 0];
    if (event.maxRep !== undefined && rep > event.maxRep) return [event.id, 0];
    if (event.minWanted !== undefined && wanted < event.minWanted) return [event.id, 0];
    if (event.maxWanted !== undefined && wanted > event.maxWanted) return [event.id, 0];
    return [event.id, Math.max(0, event.weight)];
  });
}

function shortHash(input: string): string {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash) ^ input.charCodeAt(i);
  }
  return (hash >>> 0).toString(36);
}

function safeComponentText(text: string, max: number): string {
  const cleaned = String(text ?? '').replace(/\s+/g, ' ').trim();
  if (cleaned.length <= max) return cleaned || '...';
  return cleaned.slice(0, Math.max(1, max - 1)).trimEnd() + '…';
}

function isUsableButtonEmoji(emoji?: string | null): emoji is string {
  const value = String(emoji ?? '').trim();
  if (!value) return false;
  // Custom Discord emoji: <:name:id> or <a:name:id>
  if (/^<a?:[a-zA-Z0-9_]{2,32}:\d{17,20}>$/.test(value)) return true;
  // Unicode emoji/arrows/symbols that Discord accepts as button emoji.
  // This deliberately rejects plain punctuation like '•', '••', '-' or '—',
  // which caused Invalid Form Body on the bird-call mini game.
  if (!(/[\p{Extended_Pictographic}\p{Emoji_Presentation}]/u.test(value))) return false;
  return value.length <= 32;
}

function maybeSetButtonEmoji(button: ButtonBuilder, emoji?: string | null): ButtonBuilder {
  return isUsableButtonEmoji(emoji) ? button.setEmoji(emoji.trim()) : button;
}

function buttonId(ctx: RunExploreEventInput, eventId: string, choiceId: string): string {
  // Discord custom_id limit is 100 chars. Keep IDs compact so long event/choice IDs never break components.
  return `dde_${shortHash(`${eventId}:${choiceId}`)}_${ctx.userId}`;
}

function miniGameStartButtonId(ctx: RunExploreEventInput, eventId: string): string {
  return `ddmg_s_${shortHash(eventId)}_${ctx.userId}`;
}

function miniGameOptionButtonId(ctx: RunExploreEventInput, eventId: string, roundIndex: number, optionId: string): string {
  return `ddmg_${shortHash(`${eventId}:${roundIndex}:${optionId}`)}_${ctx.userId}`;
}

function isChoiceDisabled(ctx: RunExploreEventInput, choice: DataEventChoice): boolean {
  const player = getPlayer(ctx.userId, ctx.guildId) ?? ctx.player;
  const req = choice.requires;
  if (!req) return false;
  if (req.gold !== undefined && player.gold < req.gold) return true;
  if (req.soulShards !== undefined && player.soul_shards < req.soulShards) return true;
  if (req.itemId && getItemQty(ctx.userId, ctx.guildId, req.itemId) <= 0) return true;
  if (req.minHpPercent !== undefined && player.hp < Math.floor(player.max_hp * req.minHpPercent / 100)) return true;
  return false;
}

function buildChoiceRow(ctx: RunExploreEventInput, event: DataDrivenExploreEventDef): ActionRowBuilder<ButtonBuilder> {
  const row = new ActionRowBuilder<ButtonBuilder>();
  for (const choice of (event.choices ?? []).slice(0, 5)) {
    const button = new ButtonBuilder()
      .setCustomId(buttonId(ctx, event.id, choice.id))
      .setLabel(safeComponentText(choice.label, 80))
      .setStyle(STYLE_MAP[choice.style ?? 'secondary'])
      .setDisabled(isChoiceDisabled(ctx, choice));
    maybeSetButtonEmoji(button, choice.emoji);
    row.addComponents(button);
  }
  return row;
}


function eventButtonFilter(ctx: RunExploreEventInput, allowedCustomIds?: Set<string>) {
  const partyIds = ctx.partyMemberIds && ctx.partyMemberIds.length > 1 ? ctx.partyMemberIds : undefined;
  const baseFilter = partyIds ? onlyParty(ctx.userId, partyIds) : onlyUser(ctx.userId);
  return (i: any): boolean => {
    if (!i.isButton?.()) return false;
    if (allowedCustomIds && !allowedCustomIds.has(i.customId)) return false;
    return baseFilter(i);
  };
}

async function awaitEventButton(
  ctx: RunExploreEventInput,
  reply: Message<boolean>,
  allowedCustomIds: Set<string>,
  time = 30_000,
): Promise<string | null> {
  const memberIds = ctx.partyMemberIds && ctx.partyMemberIds.length > 1 ? ctx.partyMemberIds : undefined;

  if (!memberIds) {
    const btn = await reply.awaitMessageComponent({
      filter: eventButtonFilter(ctx, allowedCustomIds),
      time,
    }).catch(() => null);
    if (!btn || !btn.isButton()) return null;
    const ok = await btn.deferUpdate().then(() => true).catch(() => false);
    return ok ? btn.customId : null;
  }

  return new Promise<string | null>(resolve => {
    const votes = new Map<string, string>();
    const collector = reply.createMessageComponentCollector({
      filter: eventButtonFilter(ctx, allowedCustomIds),
      time,
    });

    const updateVoteFooter = async () => {
      const total = memberIds.length;
      const voted = votes.size;
      const cur = reply.embeds[0];
      if (!cur) return;
      await ctx.interaction.editReply({
        embeds: [new EmbedBuilder(cur.toJSON()).setFooter({ text: `🗳️ Party vote: ${voted}/${total}` })]
      }).catch(() => {});
    };

    collector.on('collect', async i => {
      votes.set(i.user.id, i.customId);
      await i.deferUpdate().catch(() => {});
      await updateVoteFooter();
      if (votes.size >= memberIds.length) collector.stop('all_voted');
    });

    collector.on('end', () => {
      ctx.interaction.editReply({ components: [] }).catch(() => {});
      if (!votes.size) { resolve(null); return; }
      const tally = new Map<string, number>();
      for (const cid of votes.values()) tally.set(cid, (tally.get(cid) ?? 0) + 1);
      let winner = '';
      let maxVotes = 0;
      for (const [cid, count] of tally) {
        if (count > maxVotes) { winner = cid; maxVotes = count; }
      }
      resolve(winner || null);
    });
  });
}

function buildMiniGameStartRow(ctx: RunExploreEventInput, event: DataDrivenExploreEventDef, miniGame: DataEventMiniGame): ActionRowBuilder<ButtonBuilder> {
  const button = new ButtonBuilder()
    .setCustomId(miniGameStartButtonId(ctx, event.id))
    .setLabel(safeComponentText(miniGame.startLabel ?? 'Bắt đầu', 80))
    .setStyle(STYLE_MAP[miniGame.startStyle ?? 'primary']);
  maybeSetButtonEmoji(button, miniGame.startEmoji ?? '🎮');
  return new ActionRowBuilder<ButtonBuilder>().addComponents(button);
}

function buildMiniGameOptionRow(
  ctx: RunExploreEventInput,
  event: DataDrivenExploreEventDef,
  miniGame: DataEventMiniGame,
  roundIndex: number,
): ActionRowBuilder<ButtonBuilder> {
  const row = new ActionRowBuilder<ButtonBuilder>();
  for (const option of miniGame.options.slice(0, 5)) {
    const button = new ButtonBuilder()
      .setCustomId(miniGameOptionButtonId(ctx, event.id, roundIndex, option.id))
      .setLabel(safeComponentText(option.label, 80))
      .setStyle(STYLE_MAP[option.style ?? 'secondary']);
    maybeSetButtonEmoji(button, option.emoji);
    row.addComponents(button);
  }
  return row;
}

function rollOutcome(outcomes: readonly DataEventOutcome[]): DataEventOutcome {
  const total = outcomes.reduce((sum, o) => sum + Math.max(0, o.chance), 0);
  let roll = randInt(1, total || 1);
  for (const outcome of outcomes) {
    roll -= Math.max(0, outcome.chance);
    if (roll <= 0) return outcome;
  }
  return outcomes[0];
}

function displayNameForItem(itemId: string): string {
  const item = getItem(itemId) ?? getMaterial(itemId);
  return item ? `${item.icon} **${item.name}**` : `**${itemId}**`;
}

function scaleEventGold(amount: number): number {
  return amount < 0 ? amount : Math.max(0, Math.floor(amount * 0.62));
}

function scaleEventExp(amount: number): number {
  return Math.max(1, Math.floor(amount * 0.72));
}

async function finish(ctx: RunExploreEventInput, embed: EmbedBuilder, image?: string): Promise<void> {
  const msg = await ctx.interaction.editReply({
    embeds: [embed],
    components: ctx.callbacks.buildContinueExploreRow(ctx.userId),
  });
  await ctx.callbacks.attachContinueExploreHandler(msg as Message<boolean>, ctx.interaction, ctx.userId, ctx.guildId);
}

function applyAction(ctx: RunExploreEventInput, action: DataEventAction): { line?: string; startsCombat?: boolean } {
  const player = getPlayer(ctx.userId, ctx.guildId) ?? ctx.player;

  switch (action.type) {
    case 'gold': {
      const rolled = randInt(action.min, action.max);
      const amount = scaleEventGold(rolled);
      if (amount >= 0) {
        grantGold(ctx.userId, ctx.guildId, amount);
        return { line: `💰 +**${amount} Gold**` };
      }
      const cost = Math.abs(amount);
      spendGold(ctx.userId, ctx.guildId, cost);
      return { line: `💰 -**${cost} Gold**` };
    }
    case 'exp': {
      const amount = scaleEventExp(randInt(action.min, action.max));
      const res = grantExp(ctx.userId, ctx.guildId, amount);
      return { line: res.leveledUp ? `⭐ +**${amount} EXP** — lên **Lv.${res.newLevel}**!` : `⭐ +**${amount} EXP**` };
    }
    case 'item': {
      const qty = randInt(action.min ?? 1, action.max ?? action.min ?? 1);
      addItem(ctx.userId, ctx.guildId, action.itemId, qty);
      return { line: `🎁 +**${qty}×** ${displayNameForItem(action.itemId)}` };
    }
    case 'damage_percent': {
      const dmg = Math.max(1, Math.floor(player.max_hp * randInt(action.min, action.max) / 100));
      const hp = Math.max(1, player.hp - dmg);
      updatePlayerHpMp(ctx.userId, ctx.guildId, hp, player.mp);
      return { line: `❤️ HP mất **${dmg}** (${hp}/${player.max_hp})` };
    }
    case 'heal_percent': {
      const heal = Math.max(1, Math.floor(player.max_hp * randInt(action.min, action.max) / 100));
      const hp = Math.min(player.max_hp, player.hp + heal);
      updatePlayerHpMp(ctx.userId, ctx.guildId, hp, player.mp);
      return { line: `❤️ Hồi **${heal} HP** (${hp}/${player.max_hp})` };
    }
    case 'mp_percent': {
      const restore = Math.max(1, Math.floor(player.max_mp * randInt(action.min, action.max) / 100));
      const mp = Math.min(player.max_mp, player.mp + restore);
      updatePlayerHpMp(ctx.userId, ctx.guildId, player.hp, mp);
      return { line: `🔵 Hồi **${restore} MP** (${mp}/${player.max_mp})` };
    }
    case 'reputation': {
      const rep = adjustReputation(ctx.userId, ctx.guildId, action.amount);
      return { line: `${action.amount >= 0 ? '📈' : '📉'} Reputation: **${rep}** (${action.amount >= 0 ? '+' : ''}${action.amount})` };
    }
    case 'wanted': {
      const wanted = adjustWanted(ctx.userId, ctx.guildId, action.amount);
      return { line: `🚨 Wanted: **${wanted}** (${action.amount >= 0 ? '+' : ''}${action.amount})` };
    }
    case 'soul_shard': {
      grantSoulShards(ctx.userId, ctx.guildId, action.amount);
      return { line: `💠 ${action.amount >= 0 ? '+' : ''}${action.amount} Soul Shard` };
    }
    case 'world_danger': {
      adjustWorldDanger(ctx.guildId, action.amount);
      return { line: `⚠️ World Danger ${action.amount >= 0 ? '+' : ''}${action.amount}` };
    }
    case 'combat_random':
      return { startsCombat: true };
  }
}

async function resolveResultActions(
  ctx: RunExploreEventInput,
  event: DataDrivenExploreEventDef,
  title: string,
  bodyLines: string[],
  actions: readonly DataEventAction[] | undefined,
  color: number,
): Promise<void> {
  const rewardLines: string[] = [];
  let shouldStartCombat = false;

  for (const action of actions ?? []) {
    const result = applyAction(ctx, action);
    if (result.line) rewardLines.push(result.line);
    if (result.startsCombat) shouldStartCombat = true;
  }

  const descriptionParts = [...bodyLines];
  if (rewardLines.length) descriptionParts.push('', ...rewardLines);

  const resultEmbed = new EmbedBuilder()
    .setColor(shouldStartCombat ? COLORS.danger : color)
    .setTitle(title)
    .setDescription(descriptionParts.join('\n'));

  if (shouldStartCombat) {
    if (!ctx.enemies.length) {
      return finish(ctx, simpleEmbed(COLORS.info, `${descriptionParts.join('\n')}\n\nNhưng khu vực này hiện không có kẻ địch phù hợp.`), event.image);
    }
    await ctx.interaction.editReply({ embeds: [resultEmbed.setDescription(`${descriptionParts.join('\n')}\n\n*Chiến đấu bắt đầu...*`)], components: [] });
    await new Promise(r => setTimeout(r, 600));
    return ctx.callbacks.startCombat(pick(ctx.enemies).id);
  }

  return finish(ctx, resultEmbed, event.image);
}

async function runMiniGameEvent(ctx: RunExploreEventInput, event: DataDrivenExploreEventDef, miniGame: DataEventMiniGame): Promise<void> {
  const startEmbed = new EmbedBuilder()
    .setColor(event.color ?? COLORS.info)
    .setTitle(miniGame.title ?? event.title)
    .setDescription([event.description, miniGame.introText ? `\n${miniGame.introText}` : ''].join(''));

  const startReply = await ctx.interaction.editReply({ embeds: [startEmbed], components: [buildMiniGameStartRow(ctx, event, miniGame)] }) as Message<boolean>;
  const startCid = await awaitEventButton(ctx, startReply, new Set([miniGameStartButtonId(ctx, event.id)]), 30_000);

  if (!startCid) {
    return finish(ctx, simpleEmbed(COLORS.info, miniGame.timeoutText ?? event.timeoutText ?? 'Bạn chần chừ quá lâu và cơ hội trôi qua.'), event.image);
  }

  let successCount = 0;
  const roundLogs: string[] = [];

  for (let i = 0; i < miniGame.rounds.length; i++) {
    const round = miniGame.rounds[i];
    const roundEmbed = new EmbedBuilder()
      .setColor(event.color ?? COLORS.info)
      .setTitle(miniGame.title ?? event.title)
      .setDescription(`**Lượt ${i + 1}/${miniGame.rounds.length}**\n${round.prompt}`);

    const roundReply = await ctx.interaction.editReply({
      embeds: [roundEmbed],
      components: [buildMiniGameOptionRow(ctx, event, miniGame, i)],
    }) as Message<boolean>;

    const allowedRoundIds = new Set(miniGame.options.map(opt => miniGameOptionButtonId(ctx, event.id, i, opt.id)));
    const selectedCid = await awaitEventButton(ctx, roundReply, allowedRoundIds, 20_000);

    if (!selectedCid) {
      const failLines = [miniGame.failureText, '', `🎯 Kết quả: **${successCount}/${miniGame.rounds.length}** lượt đúng`, miniGame.timeoutText ?? '⏳ Bạn phản ứng quá chậm nên mini game thất bại.'];
      return resolveResultActions(ctx, event, miniGame.title ?? event.title, failLines, miniGame.onFailure, COLORS.warning);
    }

    const selectedOption = miniGame.options.find(opt => miniGameOptionButtonId(ctx, event.id, i, opt.id) === selectedCid);
    const correct = selectedOption?.id === round.correctOptionId;

    if (correct) {
      successCount += 1;
      roundLogs.push(`✅ ${round.successLine ?? 'Lượt này bạn chọn đúng.'}`);
    } else {
      const correctOption = miniGame.options.find(opt => opt.id === round.correctOptionId);
      roundLogs.push(`❌ ${round.failureLine ?? 'Lượt này bạn chọn sai.'}${correctOption ? ` (Đúng là: **${correctOption.label}**)` : ''}`);
    }
  }

  const needed = miniGame.successNeeded ?? miniGame.rounds.length;
  const won = successCount >= needed;
  const summaryLines = [
    won ? miniGame.successText : miniGame.failureText,
    '',
    `🎯 Kết quả: **${successCount}/${miniGame.rounds.length}** lượt đúng${needed !== miniGame.rounds.length ? ` (cần ${needed})` : ''}`,
    ...roundLogs,
  ];

  return resolveResultActions(ctx, event, miniGame.title ?? event.title, summaryLines, won ? miniGame.onSuccess : miniGame.onFailure, won ? COLORS.success : COLORS.warning);
}

export async function runDataDrivenExploreEvent(ctx: RunExploreEventInput): Promise<void> {
  if (!isDataDrivenExploreEvent(ctx.event)) return;
  const event = getDataDrivenExploreEvent(ctx.event);
  if (!event) return;

  if (event.miniGame) {
    return runMiniGameEvent(ctx, event, event.miniGame);
  }

  if (!event.choices?.length) {
    return finish(ctx, simpleEmbed(COLORS.info, 'Sự kiện này hiện chưa được cấu hình hoàn chỉnh.'), event.image);
  }

  const embed = new EmbedBuilder()
    .setColor(event.color ?? COLORS.info)
    .setTitle(event.title)
    .setDescription(event.description);

  const row = buildChoiceRow(ctx, event);
  const reply = await ctx.interaction.editReply({ embeds: [embed], components: [row] }) as Message<boolean>;
  const allowedChoiceIds = new Set(event.choices.map(c => buttonId(ctx, event.id, c.id)));
  const selectedCid = await awaitEventButton(ctx, reply, allowedChoiceIds, 30_000);

  if (!selectedCid) {
    return finish(ctx, simpleEmbed(COLORS.info, event.timeoutText ?? 'Bạn chần chừ quá lâu và sự kiện trôi qua.'), event.image);
  }

  const choice = event.choices.find(c => buttonId(ctx, event.id, c.id) === selectedCid);
  if (!choice) {
    return finish(ctx, simpleEmbed(COLORS.info, 'Sự kiện đã trôi qua.'), event.image);
  }

  const outcome = rollOutcome(choice.outcomes);
  return resolveResultActions(ctx, event, event.title, [outcome.text], outcome.actions, event.color ?? COLORS.info);
}
