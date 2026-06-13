import {
  SlashCommandBuilder, ChatInputCommandInteraction,
  EmbedBuilder, ActionRowBuilder, ButtonBuilder,
  ButtonStyle, ComponentType
} from 'discord.js';
import db from '../database/index';
import { getPlayer, grantGold, grantExp, addItem } from '../systems/player';
import { grantSoulShards } from '../systems/player';
import { COLORS } from '../utils/embeds';
import { pick, randInt } from '../utils/format';

export const data = new SlashCommandBuilder()
  .setName('daily')
  .setDescription('Xem và nhận phần thưởng Daily Quest');

// ── Quest progress helpers ─────────────────────────────────────────────────
function todayStr(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
}

export interface DailyRow {
  user_id: string; guild_id: string; date: string;
  explore_count: number; explore_goal: number;
  kill_count: number;    kill_goal: number;
  potion_used: number;   potion_goal: number;
  claimed: number;
}

export function getOrCreateDaily(userId: string, guildId: string): DailyRow {
  const date  = todayStr();
  const existing = db.prepare('SELECT * FROM daily_quests WHERE user_id=? AND guild_id=? AND date=?')
    .get(userId, guildId, date) as unknown as DailyRow | undefined;

  if (existing) return existing;

  // Randomize goals slightly each day for variety
  const exploreGoal = randInt(4, 6);
  const killGoal    = randInt(2, 5);
  const potionGoal  = randInt(1, 2);

  db.prepare(`
    INSERT INTO daily_quests (user_id, guild_id, date, explore_goal, kill_goal, potion_goal)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(userId, guildId, date, exploreGoal, killGoal, potionGoal);

  return db.prepare('SELECT * FROM daily_quests WHERE user_id=? AND guild_id=? AND date=?')
    .get(userId, guildId, date) as unknown as DailyRow;
}

export function incrementDaily(userId: string, guildId: string, field: 'explore_count' | 'kill_count' | 'potion_used'): void {
  const date = todayStr();
  getOrCreateDaily(userId, guildId);
  // SAFE: `field` is constrained by its TypeScript union type to one of three
  // literal column names; callers cannot pass arbitrary strings.
  db.prepare(`UPDATE daily_quests SET ${field} = ${field} + 1 WHERE user_id=? AND guild_id=? AND date=?`)
    .run(userId, guildId, date);
}

export function countsAsPotion(itemId: string): boolean {
  const { getItem } = require('../data/items');
  const item = getItem(itemId);
  if (!item || item.type !== 'consumable') return false;
  const e: any = item.effect ?? {};
  return !!(e.hp || e.hpPercent || e.mp || e.mpPercent);
}

// ── Rewards ────────────────────────────────────────────────────────────────
const DAILY_REWARDS = {
  gold:   300,
  exp:    150,
  shard:  1,
  items:  ['health_potion', 'mana_potion', 'antidote', 'material_chest'],
};

// ── Command ────────────────────────────────────────────────────────────────
export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  const { id: userId } = interaction.user;
  const guildId = interaction.guildId!;
  const player  = getPlayer(userId, guildId);

  if (!player) {
    await interaction.editReply({ embeds: [new EmbedBuilder().setColor(COLORS.warning).setDescription('Bạn chưa có nhân vật!')] });
    return;
  }

  const daily = getOrCreateDaily(userId, guildId);

  const q1Done = daily.explore_count >= daily.explore_goal;
  const q2Done = daily.kill_count    >= daily.kill_goal;
  const q3Done = daily.potion_used   >= daily.potion_goal;
  const allDone = q1Done && q2Done && q3Done;

  const progress = (done: boolean, cur: number, goal: number) =>
    `${done ? '✅' : '⬜'} ${cur}/${goal}`;

  const embed = new EmbedBuilder()
    .setColor(allDone ? COLORS.gold : COLORS.info)
    .setTitle('📋 Daily Quest')
    .setDescription(
      daily.claimed ? '✅ **Đã claim hôm nay!** Quay lại ngày mai.' :
      allDone       ? '🎉 **Hoàn thành tất cả!** Nhấn Claim để nhận thưởng.' :
                      '*Hoàn thành các nhiệm vụ dưới đây để nhận thưởng hằng ngày.*'
    )
    .addFields(
      {
        name: '📋 Tiến độ hôm nay',
        value: [
          `${progress(q1Done, daily.explore_count, daily.explore_goal)} Khám phá (explore)`,
          `${progress(q2Done, daily.kill_count,    daily.kill_goal)}    Tiêu diệt quái`,
          `${progress(q3Done, daily.potion_used,   daily.potion_goal)}  Dùng potion`,
        ].join('\n'),
        inline: false
      },
      {
        name: '🎁 Phần thưởng',
        value: [
          `🪙 **${DAILY_REWARDS.gold}** Gold`,
          `⭐ **${DAILY_REWARDS.exp}** EXP`,
          `💀 **${DAILY_REWARDS.shard}** Soul Shard`,
          `📦 **1x** item ngẫu nhiên`,
        ].join('  ·  '),
        inline: false
      }
    )
    .setFooter({ text: `Reset lúc 00:00 giờ Việt Nam  ·  Hôm nay: ${daily.date}` });

  const canClaim = allDone && !daily.claimed;

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`daily_claim_${userId}`)
      .setLabel(daily.claimed ? 'Đã nhận rồi' : allDone ? '🎁 Claim!' : '⏳ Chưa xong')
      .setStyle(canClaim ? ButtonStyle.Success : ButtonStyle.Secondary)
      .setDisabled(!canClaim)
  );

  const reply = await interaction.editReply({ embeds: [embed], components: [row] });

  if (!canClaim) return;

  const btn = await reply.awaitMessageComponent({
    componentType: ComponentType.Button,
    filter: i => i.user.id === userId,
    time: 30_000
  }).catch(() => null);

  if (!btn) { await interaction.editReply({ components: [] }); return; }
  await btn.deferUpdate();

  // Mark claimed — atomic check prevents double-claim
  const claimRes = db.prepare(`
    UPDATE daily_quests SET claimed=1
    WHERE user_id=? AND guild_id=? AND date=?
      AND claimed=0
      AND explore_count >= explore_goal
      AND kill_count >= kill_goal
      AND potion_used >= potion_goal
  `).run(userId, guildId, daily.date);

  if ((claimRes as any).changes === 0) {
    await btn.editReply({
      embeds: [new EmbedBuilder().setColor(COLORS.warning).setDescription('⚠️ Daily đã được claim rồi hoặc chưa đủ điều kiện.')],
      components: []
    });
    return;
  }

  // Give rewards
  grantGold(userId, guildId, DAILY_REWARDS.gold);
  grantExp(userId, guildId, DAILY_REWARDS.exp);
  grantSoulShards(userId, guildId, DAILY_REWARDS.shard);
  const bonusItem = pick(DAILY_REWARDS.items);
  addItem(userId, guildId, bonusItem, 1);

  const { getItem } = await import('../data/items');
  const it = getItem(bonusItem);

  await btn.editReply({
    embeds: [
      new EmbedBuilder()
        .setColor(COLORS.gold)
        .setTitle('🎁 Daily Quest — Đã Nhận!')
        .setDescription(
          `🪙 +**${DAILY_REWARDS.gold}** Gold\n` +
          `⭐ +**${DAILY_REWARDS.exp}** EXP\n` +
          `💀 +**${DAILY_REWARDS.shard}** Soul Shard\n` +
          `${it?.icon ?? '📦'} +**${it?.name ?? bonusItem}**\n\n` +
          `*Quay lại ngày mai để nhận tiếp!*`
        )
    ],
    components: []
  });
}

// Text-prefix aliases (auto-loaded by registry.ts)
export const aliases = ['d','quest','quests'];
