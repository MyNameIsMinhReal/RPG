import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  EmbedBuilder,
  type ChatInputCommandInteraction,
  type Message,
} from 'discord.js';
import { getChapterExploreEvent, describeChapterReward, type ChapterButtonStyle, type ChapterEventEffect, type TrackDirection } from '../data/chapterExploreEvents';
import { completePendingChapterExploreEvent, getPendingChapterExploreEvent } from './chapter';
import { addItem, adjustReputation, getPlayer, getEffectivePlayer, grantExp, grantGold, grantSoulShards, updatePlayerHpMp } from './player';
import { COLORS, simpleEmbed } from '../utils/embeds';
import { onlyUser } from '../utils/collectors';
import { randInt } from '../utils/format';

export interface RunChapterExploreEventInput {
  interaction: ChatInputCommandInteraction;
  userId: string;
  guildId: string;
  buildContinueExploreRow: (userId: string) => ActionRowBuilder<ButtonBuilder>[];
  attachContinueExploreHandler: (
    message: Message<boolean>,
    interaction: ChatInputCommandInteraction,
    userId: string,
    guildId: string
  ) => Promise<void> | void;
}

function toButtonStyle(style?: ChapterButtonStyle): ButtonStyle {
  switch (style) {
    case 'success': return ButtonStyle.Success;
    case 'danger': return ButtonStyle.Danger;
    case 'secondary': return ButtonStyle.Secondary;
    case 'primary':
    default: return ButtonStyle.Primary;
  }
}

function directionLabel(dir: TrackDirection): string {
  if (dir === 'left') return 'Trái';
  if (dir === 'right') return 'Phải';
  return 'Giữa';
}

function directionEmoji(dir: TrackDirection): string {
  if (dir === 'left') return '⬅️';
  if (dir === 'right') return '➡️';
  return '⬆️';
}

async function waitButton(input: RunChapterExploreEventInput, row: ActionRowBuilder<ButtonBuilder>, embeds: EmbedBuilder[], time = 60_000) {
  const reply = await input.interaction.editReply({ embeds, components: [row] });
  const btn = await reply.awaitMessageComponent({
    filter: onlyUser(input.userId),
    componentType: ComponentType.Button,
    time,
  }).catch(() => null);

  if (!btn || !btn.isButton()) return null;
  await btn.deferUpdate().catch(() => {});
  return btn;
}

function applyEffects(userId: string, guildId: string, effects: ChapterEventEffect[] = []): string[] {
  const lines: string[] = [];

  for (const effect of effects) {
    const player = getEffectivePlayer(userId, guildId);
    if (!player) continue;

    if (effect.type === 'gold') {
      const amount = randInt(effect.min, effect.max);
      grantGold(userId, guildId, amount);
      lines.push(`🪙 +**${amount} Gold**`);
      continue;
    }

    if (effect.type === 'exp') {
      const amount = randInt(effect.min, effect.max);
      grantExp(userId, guildId, amount);
      lines.push(`⭐ +**${amount} EXP**`);
      continue;
    }

    if (effect.type === 'soul_shards') {
      grantSoulShards(userId, guildId, effect.amount);
      lines.push(`💀 ${effect.amount >= 0 ? '+' : ''}**${effect.amount} Soul Shard**`);
      continue;
    }

    if (effect.type === 'item') {
      const qty = randInt(effect.min ?? 1, effect.max ?? effect.min ?? 1);
      addItem(userId, guildId, effect.itemId, qty);
      lines.push(`🎁 +**${qty}× ${effect.itemId}**`);
      continue;
    }

    if (effect.type === 'damage_percent') {
      const pct = randInt(effect.min, effect.max);
      const dmg = Math.max(1, Math.floor(player.max_hp * pct / 100));
      const hp = Math.max(1, player.hp - dmg);
      updatePlayerHpMp(userId, guildId, hp, player.mp);
      lines.push(`❤️ HP mất **${dmg}** (${hp}/${player.max_hp})`);
      continue;
    }

    if (effect.type === 'heal_percent') {
      const pct = randInt(effect.min, effect.max);
      const heal = Math.max(1, Math.floor(player.max_hp * pct / 100));
      const hp = Math.min(player.max_hp, player.hp + heal);
      updatePlayerHpMp(userId, guildId, hp, player.mp);
      lines.push(`💚 Hồi **${heal} HP** (${hp}/${player.max_hp})`);
      continue;
    }

    if (effect.type === 'mp_percent') {
      const pct = randInt(effect.min, effect.max);
      const gain = Math.max(1, Math.floor(player.max_mp * pct / 100));
      const mp = Math.min(player.max_mp, player.mp + gain);
      updatePlayerHpMp(userId, guildId, player.hp, mp);
      lines.push(`🔮 Hồi **${gain} MP** (${mp}/${player.max_mp})`);
      continue;
    }

    if (effect.type === 'reputation') {
      const rep = adjustReputation(userId, guildId, effect.amount);
      lines.push(`${effect.amount >= 0 ? '📈' : '📉'} Reputation: **${rep}** (${effect.amount >= 0 ? '+' : ''}${effect.amount})`);
      continue;
    }
  }

  return lines;
}

async function finishChapterEvent(input: RunChapterExploreEventInput, resultText: string, effectLines: string[]): Promise<void> {
  const claim = completePendingChapterExploreEvent(input.userId, input.guildId);

  if (!claim.claimed || !claim.chapter || !claim.reward) {
    const reply = await input.interaction.editReply({
      embeds: [simpleEmbed(COLORS.warning, 'Sự kiện đã kết thúc, nhưng không thể chuyển chương. Hãy thử `/chapter` để kiểm tra tiến độ.')],
      components: input.buildContinueExploreRow(input.userId),
    });
    await input.attachContinueExploreHandler(reply as Message<boolean>, input.interaction, input.userId, input.guildId);
    return;
  }

  const rewardText = describeChapterReward(claim.reward);
  const nextText = claim.finished
    ? '🎉 Bạn đã hoàn thành toàn bộ cốt truyện hiện tại!'
    : `➡️ Mở khóa: **${claim.nextChapter?.title}**`;

  const embed = new EmbedBuilder()
    .setColor(COLORS.success)
    .setTitle(`✅ ${claim.chapter.title} hoàn tất`)
    .setDescription(
      `${resultText}\n\n` +
      (effectLines.length ? `**Kết quả sự kiện:**\n${effectLines.join('\n')}\n\n` : '') +
      `**Thưởng chương:**\n${rewardText}\n\n` +
      nextText
    );

  const reply = await input.interaction.editReply({
    embeds: [embed],
    components: input.buildContinueExploreRow(input.userId),
  });
  await input.attachContinueExploreHandler(reply as Message<boolean>, input.interaction, input.userId, input.guildId);
}

async function runChoiceAction(input: RunChapterExploreEventInput, def: NonNullable<ReturnType<typeof getChapterExploreEvent>>): Promise<void> {
  if (def.action.type !== 'choice') return;

  const row = new ActionRowBuilder<ButtonBuilder>();
  for (const choice of def.action.choices.slice(0, 5)) {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`chev_${input.userId}_${choice.id}`)
        .setLabel(choice.label)
        .setEmoji(choice.emoji ?? '•')
        .setStyle(toButtonStyle(choice.style))
    );
  }

  const embed = new EmbedBuilder()
    .setColor(def.color ?? COLORS.magic)
    .setTitle(def.action.title)
    .setDescription(def.action.description);

  const btn = await waitButton(input, row, [embed]);
  if (!btn) {
    await input.interaction.editReply({ components: [] }).catch(() => {});
    return;
  }

  const id = btn.customId.replace(`chev_${input.userId}_`, '');
  const choice = def.action.choices.find(c => c.id === id) ?? def.action.choices[0];
  const lines = applyEffects(input.userId, input.guildId, choice.effects);
  await finishChapterEvent(input, choice.text, lines);
}

async function runTrackMinigame(input: RunChapterExploreEventInput, def: NonNullable<ReturnType<typeof getChapterExploreEvent>>): Promise<void> {
  if (def.action.type !== 'track_minigame') return;

  let correct = 0;
  const sequence = def.action.sequence;

  for (let i = 0; i < sequence.length; i++) {
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId(`chtrack_${input.userId}_left`).setLabel('Trái').setEmoji('⬅️').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`chtrack_${input.userId}_center`).setLabel('Giữa').setEmoji('⬆️').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`chtrack_${input.userId}_right`).setLabel('Phải').setEmoji('➡️').setStyle(ButtonStyle.Secondary),
    );

    const embed = new EmbedBuilder()
      .setColor(def.color ?? COLORS.info)
      .setTitle(`${def.action.title} — Bước ${i + 1}/${sequence.length}`)
      .setDescription(
        `${def.action.description}\n\n` +
        `✅ Đúng: **${correct}/${def.action.requiredCorrect}**\n` +
        'Chọn hướng tiếp theo:'
      );

    const btn = await waitButton(input, row, [embed], 45_000);
    if (!btn) {
      await input.interaction.editReply({ components: [] }).catch(() => {});
      return;
    }

    const picked = btn.customId.replace(`chtrack_${input.userId}_`, '') as TrackDirection;
    if (picked === sequence[i]) correct++;

    const feedback = new EmbedBuilder()
      .setColor(picked === sequence[i] ? COLORS.success : COLORS.warning)
      .setTitle(picked === sequence[i] ? '✅ Dấu vết đúng' : '⚠️ Dấu vết lệch')
      .setDescription(
        picked === sequence[i]
          ? `${directionEmoji(picked)} Bạn chọn **${directionLabel(picked)}** và thấy dấu vết rõ hơn.`
          : `${directionEmoji(picked)} Bạn chọn **${directionLabel(picked)}**, nhưng dấu vết mờ dần trong bóng tối.`
      );
    await input.interaction.editReply({ embeds: [feedback], components: [] }).catch(() => {});
    await new Promise(r => setTimeout(r, 650));
  }

  const success = correct >= def.action.requiredCorrect;
  const effects = success ? def.action.successEffects : def.action.failureEffects;
  const lines = applyEffects(input.userId, input.guildId, effects);

  if (!success && def.action.completeOnFailure === false) {
    const reply = await input.interaction.editReply({
      embeds: [simpleEmbed(COLORS.warning, `${def.action.failureText}\n\nBạn cần thử lại trong lần khám phá sau.`)],
      components: input.buildContinueExploreRow(input.userId),
    });
    await input.attachContinueExploreHandler(reply as Message<boolean>, input.interaction, input.userId, input.guildId);
    return;
  }

  await finishChapterEvent(input, success ? def.action.successText : def.action.failureText, lines);
}

export async function runPendingChapterExploreEvent(input: RunChapterExploreEventInput): Promise<boolean> {
  const pending = getPendingChapterExploreEvent(input.userId, input.guildId);
  if (!pending) return false;

  const def = getChapterExploreEvent(pending.eventId);
  if (!def) return false;

  const loreEmbed = new EmbedBuilder()
    .setColor(def.color ?? COLORS.magic)
    .setTitle(def.title)
    .setDescription(def.lore);

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`chlore_${input.userId}_${def.id}`)
      .setLabel(def.continueLabel ?? 'Tiếp tục')
      .setEmoji(def.continueEmoji ?? '➡️')
      .setStyle(ButtonStyle.Primary)
  );

  const btn = await waitButton(input, row, [loreEmbed], 90_000);
  if (!btn) {
    await input.interaction.editReply({ components: [] }).catch(() => {});
    return true;
  }

  if (def.action.type === 'lore_only') {
    const lines = applyEffects(input.userId, input.guildId, def.action.effects);
    await finishChapterEvent(input, def.action.text, lines);
    return true;
  }

  if (def.action.type === 'choice') {
    await runChoiceAction(input, def);
    return true;
  }

  if (def.action.type === 'track_minigame') {
    await runTrackMinigame(input, def);
    return true;
  }

  return true;
}
