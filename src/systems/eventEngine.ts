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
  getEffectivePlayer,
  grantExp,
  grantGold,
  grantSoulShards,
  spendGold,
  updatePlayerHpMp,
  removeItem,
} from './player';
import { adjustWorldDanger } from './world';
import { adjustCorruption } from './corruption';
import { COLORS, simpleEmbed } from '../utils/embeds';
import { combatStartLine, eventIntro, eventResult, polishGameText, section } from '../utils/textPolish';
import { learnRandomSkillFromEvent, type AncientBookTier } from './skillLearning';
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
  const player = getEffectivePlayer(ctx.userId, ctx.guildId) ?? ctx.player;
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
        embeds: [new EmbedBuilder(cur.toJSON()).setFooter({ text: `🗳️ Bình chọn tổ đội: ${voted}/${total} đã chọn` })]
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
  const player = getEffectivePlayer(ctx.userId, ctx.guildId) ?? ctx.player;
  // Party explore events are voted on by the whole party, so shared rewards/penalties
  // must hit every member — not just the leader who clicked. Solo falls back to [userId].
  const targetIds = ctx.partyMemberIds && ctx.partyMemberIds.length > 1 ? ctx.partyMemberIds : [ctx.userId];
  const isParty = targetIds.length > 1;
  const partyTag = isParty ? ' · 👥 cả tổ đội' : '';

  switch (action.type) {
    case 'gold': {
      const rolled = randInt(action.min, action.max);
      const amount = scaleEventGold(rolled);
      if (amount >= 0) {
        for (const uid of targetIds) grantGold(uid, ctx.guildId, amount);
        return { line: `🪙 Nhận **${amount} Gold**${partyTag}` };
      }
      const cost = Math.abs(amount);
      for (const uid of targetIds) spendGold(uid, ctx.guildId, cost);
      return { line: `🪙 Trả **${cost} Gold**${partyTag}` };
    }
    case 'exp': {
      const amount = scaleEventExp(randInt(action.min, action.max));
      let callerRes: { leveledUp: boolean; newLevel: number } = { leveledUp: false, newLevel: 0 };
      for (const uid of targetIds) {
        const r = grantExp(uid, ctx.guildId, amount);
        if (uid === ctx.userId) callerRes = r;
      }
      return { line: callerRes.leveledUp ? `⭐ Nhận **${amount} EXP** — lên **Lv.${callerRes.newLevel}**${partyTag}` : `⭐ Nhận **${amount} EXP**${partyTag}` };
    }
    case 'item': {
      const qty = randInt(action.min ?? 1, action.max ?? action.min ?? 1);
      for (const uid of targetIds) addItem(uid, ctx.guildId, action.itemId, qty);
      return { line: `🎁 Nhận **${qty}×** ${displayNameForItem(action.itemId)}${partyTag}` };
    }
    case 'consume_item': {
      // A cost paid from the chooser's own inventory — stays on the caller only.
      const amount = Math.max(1, action.amount ?? 1);
      removeItem(ctx.userId, ctx.guildId, action.itemId, amount);
      return { line: `🎒 Dùng **${amount}×** ${displayNameForItem(action.itemId)}` };
    }
    case 'corruption': {
      let callerNext = 0;
      for (const uid of targetIds) {
        const n = adjustCorruption(uid, ctx.guildId, action.amount);
        if (uid === ctx.userId) callerNext = n;
      }
      return { line: `🌘 Ô Nhiễm Linh Hồn ${action.amount >= 0 ? '+' : ''}${action.amount} → **${callerNext}/100**${partyTag}` };
    }
    case 'damage_percent': {
      let callerLine = '';
      for (const uid of targetIds) {
        const p = getEffectivePlayer(uid, ctx.guildId) ?? (uid === ctx.userId ? player : null);
        if (!p) continue;
        const dmg = Math.max(1, Math.floor(p.max_hp * randInt(action.min, action.max) / 100));
        const hp = Math.max(1, p.hp - dmg);
        updatePlayerHpMp(uid, ctx.guildId, hp, p.mp);
        if (uid === ctx.userId) callerLine = `❤️ Mất **${dmg} HP** (${hp}/${p.max_hp})`;
      }
      return { line: `${callerLine || '❤️ Cả tổ đội trúng đòn'}${partyTag}` };
    }
    case 'heal_percent': {
      let callerLine = '';
      for (const uid of targetIds) {
        const p = getEffectivePlayer(uid, ctx.guildId) ?? (uid === ctx.userId ? player : null);
        if (!p) continue;
        const heal = Math.max(1, Math.floor(p.max_hp * randInt(action.min, action.max) / 100));
        const hp = Math.min(p.max_hp, p.hp + heal);
        updatePlayerHpMp(uid, ctx.guildId, hp, p.mp);
        if (uid === ctx.userId) callerLine = `❤️ Hồi **${heal} HP** (${hp}/${p.max_hp})`;
      }
      return { line: `${callerLine || '❤️ Cả tổ đội được hồi máu'}${partyTag}` };
    }
    case 'mp_percent': {
      let callerLine = '';
      for (const uid of targetIds) {
        const p = getEffectivePlayer(uid, ctx.guildId) ?? (uid === ctx.userId ? player : null);
        if (!p) continue;
        const restore = Math.max(1, Math.floor(p.max_mp * randInt(action.min, action.max) / 100));
        const mp = Math.min(p.max_mp, p.mp + restore);
        updatePlayerHpMp(uid, ctx.guildId, p.hp, mp);
        if (uid === ctx.userId) callerLine = `💧 Hồi **${restore} MP** (${mp}/${p.max_mp})`;
      }
      return { line: `${callerLine || '💧 Cả tổ đội được hồi MP'}${partyTag}` };
    }
    case 'reputation': {
      let callerRep = 0;
      for (const uid of targetIds) {
        const r = adjustReputation(uid, ctx.guildId, action.amount);
        if (uid === ctx.userId) callerRep = r;
      }
      return { line: `${action.amount >= 0 ? '📈' : '📉'} Danh vọng: **${callerRep}** (${action.amount >= 0 ? '+' : ''}${action.amount})${partyTag}` };
    }
    case 'wanted': {
      let callerWanted = 0;
      for (const uid of targetIds) {
        const w = adjustWanted(uid, ctx.guildId, action.amount);
        if (uid === ctx.userId) callerWanted = w;
      }
      return { line: `🚨 Truy nã: **${callerWanted}** (${action.amount >= 0 ? '+' : ''}${action.amount})${partyTag}` };
    }
    case 'soul_shard': {
      for (const uid of targetIds) grantSoulShards(uid, ctx.guildId, action.amount);
      return { line: `💠 ${action.amount >= 0 ? '+' : ''}${action.amount} Soul Shard${partyTag}` };
    }
    case 'learn_random_skill': {
      const result = learnRandomSkillFromEvent(ctx.userId, ctx.guildId, action.tier as AncientBookTier);
      if (!result.ok) return { line: `📖 ${result.reason ?? 'Cổ thư không phản hồi.'}` };
      return { line: `📖 Lĩnh ngộ ${result.skillIcon} **${result.skillName}**` };
    }
    case 'world_danger': {
      adjustWorldDanger(ctx.guildId, action.amount);
      return { line: `⚠️ Nguy cơ thế giới ${action.amount >= 0 ? '+' : ''}${action.amount}` };
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

  const resultDescription = eventResult(bodyLines, rewardLines);

  const resultEmbed = new EmbedBuilder()
    .setColor(shouldStartCombat ? COLORS.danger : color)
    .setTitle(title)
    .setDescription(resultDescription);

  if (shouldStartCombat) {
    if (!ctx.enemies.length) {
      return finish(ctx, simpleEmbed(COLORS.info, `${resultDescription}

🕊️ Khu vực này hiện không có kẻ địch phù hợp.`), event.image);
    }
    await ctx.interaction.editReply({ embeds: [resultEmbed.setDescription(`${resultDescription}

${combatStartLine()}`)], components: [] });
    await new Promise(r => setTimeout(r, 600));
    return ctx.callbacks.startCombat(pick(ctx.enemies).id);
  }

  return finish(ctx, resultEmbed, event.image);
}

async function runMiniGameEvent(ctx: RunExploreEventInput, event: DataDrivenExploreEventDef, miniGame: DataEventMiniGame): Promise<void> {
  const startEmbed = new EmbedBuilder()
    .setColor(event.color ?? COLORS.info)
    .setTitle(miniGame.title ?? event.title)
    .setDescription(eventIntro([event.description, miniGame.introText ?? ''].filter(Boolean).join('\n\n'), 'Bấm bắt đầu để vào thử thách.'));

  const startReply = await ctx.interaction.editReply({ embeds: [startEmbed], components: [buildMiniGameStartRow(ctx, event, miniGame)] }) as Message<boolean>;
  const startCid = await awaitEventButton(ctx, startReply, new Set([miniGameStartButtonId(ctx, event.id)]), 30_000);

  if (!startCid) {
    return finish(ctx, simpleEmbed(COLORS.info, miniGame.timeoutText ?? event.timeoutText ?? 'Bạn do dự quá lâu. Cơ hội tan vào màn sương.'), event.image);
  }

  let successCount = 0;
  const roundLogs: string[] = [];

  for (let i = 0; i < miniGame.rounds.length; i++) {
    const round = miniGame.rounds[i];
    const roundEmbed = new EmbedBuilder()
      .setColor(event.color ?? COLORS.info)
      .setTitle(`🎮 ${miniGame.title ?? event.title}`)
      .setDescription(`**Lượt ${i + 1}/${miniGame.rounds.length}**\n${polishGameText(round.prompt)}\n\n🎯 **Chọn đáp án bên dưới.**`);

    const roundReply = await ctx.interaction.editReply({
      embeds: [roundEmbed],
      components: [buildMiniGameOptionRow(ctx, event, miniGame, i)],
    }) as Message<boolean>;

    const allowedRoundIds = new Set(miniGame.options.map(opt => miniGameOptionButtonId(ctx, event.id, i, opt.id)));
    const selectedCid = await awaitEventButton(ctx, roundReply, allowedRoundIds, 20_000);

    if (!selectedCid) {
      const failLines = [miniGame.failureText, '', `🎯 Kết quả: **${successCount}/${miniGame.rounds.length}** lượt đúng`, miniGame.timeoutText ?? '⏳ Bạn phản ứng quá chậm, thử thách khép lại.'];
      return resolveResultActions(ctx, event, miniGame.title ?? event.title, failLines, miniGame.onFailure, COLORS.warning);
    }

    const selectedOption = miniGame.options.find(opt => miniGameOptionButtonId(ctx, event.id, i, opt.id) === selectedCid);
    const correct = selectedOption?.id === round.correctOptionId;

    if (correct) {
      successCount += 1;
      roundLogs.push(`✅ ${round.successLine ?? 'Bạn chọn đúng nhịp của thử thách.'}`);
    } else {
      const correctOption = miniGame.options.find(opt => opt.id === round.correctOptionId);
      roundLogs.push(`❌ ${round.failureLine ?? 'Bạn chọn sai dấu hiệu.'}${correctOption ? ` Đáp án đúng: **${correctOption.label}**.` : ''}`);
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
    return finish(ctx, simpleEmbed(COLORS.info, 'Sự kiện này chưa ổn định trong thế giới hiện tại.'), event.image);
  }

  const embed = new EmbedBuilder()
    .setColor(event.color ?? COLORS.info)
    .setTitle(event.title)
    .setDescription(eventIntro(event.description));

  const row = buildChoiceRow(ctx, event);
  const reply = await ctx.interaction.editReply({ embeds: [embed], components: [row] }) as Message<boolean>;
  const allowedChoiceIds = new Set(event.choices.map(c => buttonId(ctx, event.id, c.id)));
  const selectedCid = await awaitEventButton(ctx, reply, allowedChoiceIds, 30_000);

  if (!selectedCid) {
    return finish(ctx, simpleEmbed(COLORS.info, event.timeoutText ?? 'Bạn do dự quá lâu. Cơ hội tan vào màn sương.'), event.image);
  }

  const choice = event.choices.find(c => buttonId(ctx, event.id, c.id) === selectedCid);
  if (!choice) {
    return finish(ctx, simpleEmbed(COLORS.info, 'Dấu vết của sự kiện đã biến mất.'), event.image);
  }

  const outcome = rollOutcome(choice.outcomes);
  return resolveResultActions(ctx, event, event.title, [outcome.text], outcome.actions, event.color ?? COLORS.info);
}
