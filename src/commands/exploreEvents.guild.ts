import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  Message
} from 'discord.js';
import type { RunExploreEventInput } from './exploreEvents';
import { finishExploreEvent as finish, awaitExploreBtn as awaitBtn } from './exploreEventShared';
import db from '../database/index';
import {
  adjustFaction,
  adjustReputation,
  adjustWanted,
  getEffectivePlayer,
  grantExp,
  grantGold,
  grantSoulShards,
  spendGold,
  updatePlayerHpMp
} from '../systems/player';
import { COLORS } from '../utils/embeds';
import { onlyUser } from '../utils/collectors';
import { randInt } from '../utils/format';

// ── Helpers ────────────────────────────────────────────────────────────────


interface ClanInfo { clan_id: string; name: string; tag: string; }

function getPlayerClan(userId: string, guildId: string): ClanInfo | null {
  const row = db.prepare(`
    SELECT c.clan_id as clan_id, c.name as name, c.tag as tag
    FROM clan_members cm
    JOIN clans c ON c.clan_id = cm.clan_id
    WHERE cm.user_id = ? AND cm.discord_gid = ?
  `).get(userId, guildId) as ClanInfo | undefined;
  return row ?? null;
}

function depositTreasury(clanId: string, amount: number): void {
  db.prepare(`UPDATE clans SET treasury = treasury + ? WHERE clan_id = ?`).run(amount, clanId);
}

function addContribution(clanId: string, userId: string, guildId: string, amount: number): void {
  db.prepare(`UPDATE clan_members SET contribution = contribution + ? WHERE clan_id = ? AND user_id = ? AND discord_gid = ?`)
    .run(amount, clanId, userId, guildId);
}

function damagePlayerPercent(ctx: RunExploreEventInput, percent: number): number {
  const p = getEffectivePlayer(ctx.userId, ctx.guildId);
  if (!p) return 0;
  const dmg = Math.max(1, Math.floor(p.max_hp * (percent / 100)));
  const newHp = Math.max(1, p.hp - dmg);
  updatePlayerHpMp(ctx.userId, ctx.guildId, newHp, p.mp);
  return dmg;
}

const DIRECTIONS = [
  { id: 'left', label: 'Trái', emoji: '⬅️' },
  { id: 'mid', label: 'Giữa', emoji: '🛡️' },
  { id: 'right', label: 'Phải', emoji: '➡️' },
];

function repLine(ctx: RunExploreEventInput, amount: number): string {
  const rep = adjustReputation(ctx.userId, ctx.guildId, amount);
  return `🤝 Danh tiếng: **${rep}** (${amount >= 0 ? '+' : ''}${amount})`;
}

function factionLine(ctx: RunExploreEventInput, factionId: Parameters<typeof adjustFaction>[2], amount: number): string {
  const icons: Record<string, string> = {
    merchants: '🏪', hunters: '🏹', old_church: '⛪', shadow_court: '🌑', villagers: '🏘️'
  };
  const names: Record<string, string> = {
    merchants: 'Merchants', hunters: 'Hunters', old_church: 'Old Church',
    shadow_court: 'Shadow Court', villagers: 'Villagers'
  };
  const val = adjustFaction(ctx.userId, ctx.guildId, factionId, amount);
  return `${icons[factionId]} ${names[factionId]}: **${val}** (${amount >= 0 ? '+' : ''}${amount})`;
}

function clanLine(ctx: RunExploreEventInput, clan: ClanInfo | null, treasuryGain: number, contribGain: number): string {
  if (!clan) return '';
  depositTreasury(clan.clan_id, treasuryGain);
  addContribution(clan.clan_id, ctx.userId, ctx.guildId, contribGain);
  return `\n🏛️ Kho guild **[${clan.tag}] ${clan.name}**: **+${treasuryGain} gold**\n⭐ Đóng góp guild: **+${contribGain}**`;
}

function healPlayerPercent(ctx: RunExploreEventInput, percent: number): number {
  const p = getEffectivePlayer(ctx.userId, ctx.guildId);
  if (!p) return 0;
  const heal = Math.max(1, Math.floor(p.max_hp * (percent / 100)));
  const newHp = Math.min(p.max_hp, p.hp + heal);
  const newMp = Math.min(p.max_mp, p.mp + Math.floor(p.max_mp * (percent / 100)));
  updatePlayerHpMp(ctx.userId, ctx.guildId, newHp, newMp);
  return heal;
}

// ── Generic runners ─────────────────────────────────────────────────────────

interface ChoiceOption {
  id: string;
  label: string;
  emoji: string;
  style: ButtonStyle;
  resolve: (ctx: RunExploreEventInput) => EmbedBuilder;
}

async function runChoiceEvent(
  ctx: RunExploreEventInput,
  title: string,
  color: number,
  description: string,
  options: ChoiceOption[]
): Promise<void> {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    ...options.map(o => new ButtonBuilder().setCustomId(`gev_${o.id}_${ctx.userId}`).setLabel(o.label).setEmoji(o.emoji).setStyle(o.style))
  );
  const embed = new EmbedBuilder().setColor(color).setTitle(title).setDescription(description);
  const picked = await awaitBtn(ctx, embed, row);
  const opt = options.find(o => picked === `gev_${o.id}_${ctx.userId}`) ?? options[options.length - 1];
  await finish(ctx, opt.resolve(ctx));
}

interface MinigameOption {
  id: string;
  label: string;
  emoji: string;
}

async function runPickMinigame(
  ctx: RunExploreEventInput,
  title: string,
  rounds: number,
  options: MinigameOption[],
  promptLine: (correctLabel: string) => string,
  onResult: (ctx: RunExploreEventInput, successes: number, rounds: number) => EmbedBuilder
): Promise<void> {
  let successes = 0;
  for (let i = 1; i <= rounds; i++) {
    const correct = options[randInt(0, options.length - 1)];
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      ...options.map(o => new ButtonBuilder().setCustomId(`gmg_${o.id}_${ctx.userId}`).setLabel(o.label).setEmoji(o.emoji).setStyle(ButtonStyle.Primary))
    );
    const embed = new EmbedBuilder()
      .setColor(COLORS.warning)
      .setTitle(`${title} — Lượt ${i}/${rounds}`)
      .setDescription(`${promptLine(correct.label)}\n\n✅ Đúng: **${successes}/${i - 1}**`);
    const picked = await awaitBtn(ctx, embed, row, 15_000);
    if (picked === `gmg_${correct.id}_${ctx.userId}`) successes++;
  }
  await finish(ctx, onResult(ctx, successes, rounds));
}

// ══════════════════════════════════════════════════════════════════════
//  GUILD CARAVAN AMBUSH — random explore event with a defense minigame
// ══════════════════════════════════════════════════════════════════════

export async function showGuildCaravanAmbush(ctx: RunExploreEventInput): Promise<void> {
  const clan = getPlayerClan(ctx.userId, ctx.guildId);

  const introRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`gca_defend_${ctx.userId}`).setLabel('Bảo vệ đoàn hàng').setEmoji('🛡️').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`gca_loot_${ctx.userId}`).setLabel('Cướp lấy hàng hóa').setEmoji('💰').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`gca_leave_${ctx.userId}`).setLabel('Bỏ đi').setEmoji('🚶').setStyle(ButtonStyle.Secondary),
  );

  const ownerLine = clan
    ? `Bạn nhận ra dấu ấn quen thuộc — đây là đoàn hàng tiếp tế của guild **[${clan.tag}] ${clan.name}**, chính guild của bạn!`
    : 'Đoàn hàng mang một lá cờ thêu huy hiệu — dấu hiệu của một guild nào đó đang vận chuyển hàng tiếp tế.';

  const introEmbed = new EmbedBuilder()
    .setColor(COLORS.warning)
    .setTitle('🚚 Đoàn Hàng Tiếp Tế Bị Chặn')
    .setDescription(
      'Giữa con đường mòn, bạn bắt gặp một đoàn xe hàng đang bị một nhóm cướp đường vây hãm. ' +
      'Người áp tải hoảng loạn hô lớn cầu cứu, còn lũ cướp đang cố phá két hàng phía sau xe.\n\n' +
      `${ownerLine}\n\nBạn sẽ làm gì?`
    );

  const choice = await awaitBtn(ctx, introEmbed, introRow);

  if (!choice || choice.startsWith('gca_leave')) {
    const embed = new EmbedBuilder()
      .setColor(COLORS.info)
      .setTitle('🚶 Bỏ Đi')
      .setDescription('Bạn quyết định không dính vào chuyện không phải của mình và tiếp tục lên đường.');
    await finish(ctx, embed);
    return;
  }

  if (choice.startsWith('gca_loot')) {
    const gold = randInt(80, 150);
    grantGold(ctx.userId, ctx.guildId, gold);
    const wanted = adjustWanted(ctx.userId, ctx.guildId, 1);
    const fac = adjustFaction(ctx.userId, ctx.guildId, 'merchants', -8);
    const embed = new EmbedBuilder()
      .setColor(COLORS.danger)
      .setTitle('💰 Hôi Của Giữa Loạn Lạc')
      .setDescription(
        `Trong lúc hỗn loạn, bạn lén lấy một phần hàng hóa rồi rút lui êm thấm.\n\n` +
        `💰 Vàng: **+${gold}**\n` +
        `🏪 Merchants: **${fac}** (-8)\n` +
        `🚨 Mức truy nã: **${wanted}** (+1)`
      );
    await finish(ctx, embed);
    return;
  }

  // ── Defend: 3-round shield direction minigame ──────────────────────────
  let successes = 0;
  const rounds = 3;

  for (let i = 1; i <= rounds; i++) {
    const correct = DIRECTIONS[randInt(0, 2)];
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      ...DIRECTIONS.map(d =>
        new ButtonBuilder().setCustomId(`gca_block_${d.id}_${ctx.userId}`).setLabel(d.label).setEmoji(d.emoji).setStyle(ButtonStyle.Primary)
      )
    );
    const embed = new EmbedBuilder()
      .setColor(COLORS.warning)
      .setTitle(`🛡️ Phòng Thủ — Lượt ${i}/${rounds}`)
      .setDescription(
        `Một tên cướp lao tới tấn công từ phía **${correct.label.toUpperCase()}**!\n` +
        `Chọn đúng hướng để đỡ đòn và phản công!\n\n` +
        `✅ Đỡ thành công: **${successes}/${i - 1}**`
      );
    const pick = await awaitBtn(ctx, embed, row, 15_000);
    if (pick && pick.startsWith(`gca_block_${correct.id}_`)) {
      successes++;
    }
  }

  if (successes >= 2) {
    const gold = randInt(150, 250);
    const exp = randInt(80, 120);
    grantGold(ctx.userId, ctx.guildId, gold);
    grantExp(ctx.userId, ctx.guildId, exp);
    const fac = adjustFaction(ctx.userId, ctx.guildId, 'merchants', 6);

    let extra = '';
    if (clan) {
      const treasuryGain = 200;
      const contribGain = 10;
      depositTreasury(clan.clan_id, treasuryGain);
      addContribution(clan.clan_id, ctx.userId, ctx.guildId, contribGain);
      extra = `\n🏛️ Kho guild **[${clan.tag}] ${clan.name}**: **+${treasuryGain} gold**\n⭐ Đóng góp guild: **+${contribGain}**`;
    }

    const embed = new EmbedBuilder()
      .setColor(COLORS.success)
      .setTitle('🛡️ Đẩy Lùi Bọn Cướp!')
      .setDescription(
        `Bạn đỡ thành công **${successes}/${rounds}** đòn tấn công và đánh bật lũ cướp khỏi đoàn hàng. ` +
        `Người áp tải vội vàng cảm ơn và tặng bạn một phần thưởng nhỏ trước khi đoàn xe tiếp tục lên đường.\n\n` +
        `💰 Vàng: **+${gold}**\n` +
        `✨ EXP: **+${exp}**\n` +
        `🏪 Merchants: **${fac}** (+6)` +
        extra
      );
    await finish(ctx, embed);
  } else {
    const dmg = damagePlayerPercent(ctx, 15);
    const gold = randInt(30, 50);
    grantGold(ctx.userId, ctx.guildId, gold);

    const embed = new EmbedBuilder()
      .setColor(COLORS.danger)
      .setTitle('🩸 Trận Phòng Thủ Thất Bại')
      .setDescription(
        `Bạn chỉ đỡ được **${successes}/${rounds}** đòn — lũ cướp cướp đi phần lớn hàng hóa rồi tháo chạy, ` +
        `để lại bạn với vài vết thương.\n\n` +
        `💢 Sát thương nhận: **-${dmg} HP**\n` +
        `💰 Người áp tải dúi cho bạn chút tiền lộ phí: **+${gold} gold**`
      );
    await finish(ctx, embed);
  }
}

// ══════════════════════════════════════════════════════════════════════
//  GUILD VAULT CIPHER — minigame
// ══════════════════════════════════════════════════════════════════════

const VAULT_SYMBOLS: MinigameOption[] = [
  { id: 'sun', label: 'Mặt Trời', emoji: '☀️' },
  { id: 'moon', label: 'Trăng', emoji: '🌙' },
  { id: 'star', label: 'Sao', emoji: '⭐' },
];

export async function showGuildVaultCipher(ctx: RunExploreEventInput): Promise<void> {
  const clan = getPlayerClan(ctx.userId, ctx.guildId);
  const intro = new EmbedBuilder()
    .setColor(COLORS.magic)
    .setTitle('🔐 Két Sắt Bỏ Quên Của Một Guild')
    .setDescription(
      'Trong một góc đổ nát, bạn tìm thấy một két sắt cũ khắc huy hiệu guild, ổ khóa kiểu vòng xoay ba ký hiệu.\n\n' +
      'Bạn cẩn thận thử dò mật mã...'
    );
  await ctx.interaction.editReply({ embeds: [intro], components: [] });

  await runPickMinigame(
    ctx, '🔐 Phá Khóa Két Sắt', 3, VAULT_SYMBOLS,
    (label) => `Vòng xoay đang dừng gần ký hiệu... hãy xoay tới **${label.toUpperCase()}**!`,
    (ctx, successes, rounds) => {
      if (successes >= 2) {
        const gold = randInt(200, 300);
        const shards = randInt(1, 2);
        grantGold(ctx.userId, ctx.guildId, gold);
        grantSoulShards(ctx.userId, ctx.guildId, shards);
        const extra = clanLine(ctx, clan, 250, 12);
        return new EmbedBuilder()
          .setColor(COLORS.success)
          .setTitle('🔓 Két Sắt Mở Ra!')
          .setDescription(
            `Bạn dò trúng **${successes}/${rounds}** ký hiệu — ổ khóa bật mở với một tiếng "tách"!\n\n` +
            `💰 Vàng: **+${gold}**\n` +
            `💎 Soul Shards: **+${shards}**` + extra
          );
      }
      const gold = randInt(20, 40);
      grantGold(ctx.userId, ctx.guildId, gold);
      return new EmbedBuilder()
        .setColor(COLORS.danger)
        .setTitle('🔒 Két Sắt Vẫn Khóa Chặt')
        .setDescription(
          `Bạn chỉ dò trúng **${successes}/${rounds}** ký hiệu — ổ khóa kẹt cứng và không mở được.\n\n` +
          `Bạn nhặt được vài đồng rơi vãi gần đó: **+${gold} gold**`
        );
    }
  );
}

// ══════════════════════════════════════════════════════════════════════
//  GUILD RECRUITER — normal choice event
// ══════════════════════════════════════════════════════════════════════

export async function showGuildRecruiter(ctx: RunExploreEventInput): Promise<void> {
  const clan = getPlayerClan(ctx.userId, ctx.guildId);
  const desc = clan
    ? `Một người tuyển mộ đeo huy hiệu guild khác tiến đến, nhưng khi thấy huy hiệu **[${clan.tag}] ${clan.name}** trên áo bạn, anh ta nhún vai bỏ đi... rồi quay lại tặng bạn chút tiền "thiện chí" để dò la tin tức.`
    : 'Một người tuyển mộ mặc áo choàng thêu huy hiệu guild tiến đến, mời bạn gia nhập tổ chức của họ.';

  await runChoiceEvent(
    ctx, '🧑‍💼 Người Tuyển Mộ Guild', COLORS.info, desc,
    [
      {
        id: 'listen', label: 'Nghe giới thiệu', emoji: '👂', style: ButtonStyle.Primary,
        resolve: (ctx) => {
          const exp = randInt(20, 40);
          grantExp(ctx.userId, ctx.guildId, exp);
          const hint = getPlayerClan(ctx.userId, ctx.guildId)
            ? 'Bạn đã có guild rồi, nhưng vẫn lắng nghe vì lịch sự.'
            : 'Bạn ghi nhớ vài điều về cách gia nhập guild bằng lệnh `/guild join`.';
          return new EmbedBuilder()
            .setColor(COLORS.info)
            .setTitle('👂 Lắng Nghe')
            .setDescription(`${hint}\n\n✨ EXP: **+${exp}**`);
        }
      },
      {
        id: 'ask', label: 'Hỏi về quyền lợi', emoji: '❓', style: ButtonStyle.Secondary,
        resolve: (ctx) => {
          const gold = randInt(20, 50);
          grantGold(ctx.userId, ctx.guildId, gold);
          return new EmbedBuilder()
            .setColor(COLORS.gold)
            .setTitle('❓ Hỏi Về Quyền Lợi')
            .setDescription(
              `Người tuyển mộ liệt kê hàng loạt quyền lợi: kho chung, buff guild, chiến tranh, cổ phiếu... ` +
              `rồi dúi cho bạn một ít tiền "ra mắt".\n\n💰 Vàng: **+${gold}**`
            );
        }
      },
      {
        id: 'decline', label: 'Từ chối', emoji: '🙅', style: ButtonStyle.Danger,
        resolve: () => new EmbedBuilder()
          .setColor(COLORS.dark)
          .setTitle('🙅 Từ Chối')
          .setDescription('Bạn lắc đầu và tiếp tục lên đường. Người tuyển mộ thở dài rồi tìm con mồi khác.')
      },
    ]
  );
}

// ══════════════════════════════════════════════════════════════════════
//  GUILD WATCHTOWER DRILL — minigame
// ══════════════════════════════════════════════════════════════════════

const SIGNAL_FLAGS: MinigameOption[] = [
  { id: 'red', label: 'Cờ Đỏ', emoji: '🔴' },
  { id: 'yellow', label: 'Cờ Vàng', emoji: '🟡' },
  { id: 'green', label: 'Cờ Xanh', emoji: '🟢' },
];

export async function showGuildWatchtowerDrill(ctx: RunExploreEventInput): Promise<void> {
  const intro = new EmbedBuilder()
    .setColor(COLORS.warning)
    .setTitle('🚩 Diễn Tập Báo Hiệu Tháp Canh')
    .setDescription(
      'Một tháp canh của guild đang tổ chức diễn tập báo hiệu khẩn cấp. Người chỉ huy mời bạn tham gia thử ' +
      'để rèn phản xạ — kéo đúng cờ theo hiệu lệnh trong vài giây!'
    );
  await ctx.interaction.editReply({ embeds: [intro], components: [] });

  await runPickMinigame(
    ctx, '🚩 Diễn Tập Báo Hiệu', 3, SIGNAL_FLAGS,
    (label) => `Người chỉ huy hô lớn: "Kéo **${label.toUpperCase()}** ngay!"`,
    (ctx, successes, rounds) => {
      if (successes >= 2) {
        const gold = randInt(50, 100);
        const exp = randInt(60, 100);
        grantGold(ctx.userId, ctx.guildId, gold);
        grantExp(ctx.userId, ctx.guildId, exp);
        const fac = factionLine(ctx, 'hunters', 5);
        return new EmbedBuilder()
          .setColor(COLORS.success)
          .setTitle('🚩 Phản Xạ Xuất Sắc!')
          .setDescription(
            `Bạn kéo đúng **${successes}/${rounds}** lá cờ — người chỉ huy gật đầu hài lòng.\n\n` +
            `💰 Vàng: **+${gold}**\n✨ EXP: **+${exp}**\n${fac}`
          );
      }
      const dmg = damagePlayerPercent(ctx, 8);
      return new EmbedBuilder()
        .setColor(COLORS.danger)
        .setTitle('🚩 Lúng Túng Trên Tháp Canh')
        .setDescription(
          `Bạn chỉ kéo đúng **${successes}/${rounds}** lá cờ và bị một sợi dây thừng quật vào người khi trượt chân.\n\n` +
          `💢 Sát thương: **-${dmg} HP**`
        );
    }
  );
}

// ══════════════════════════════════════════════════════════════════════
//  GUILD BULLETIN BOARD — normal choice event
// ══════════════════════════════════════════════════════════════════════

export async function showGuildBulletinBoard(ctx: RunExploreEventInput): Promise<void> {
  const clan = getPlayerClan(ctx.userId, ctx.guildId);
  await runChoiceEvent(
    ctx, '📋 Bảng Thông Báo Nhiệm Vụ Guild', COLORS.info,
    'Bạn dừng lại trước một bảng gỗ dán đầy giấy nhận nhiệm vụ của các guild trong vùng. Có vài lựa chọn phù hợp với bạn.',
    [
      {
        id: 'easy', label: 'Nhiệm vụ dễ (an toàn)', emoji: '📄', style: ButtonStyle.Primary,
        resolve: (ctx) => {
          const gold = randInt(40, 80);
          const exp = randInt(30, 50);
          grantGold(ctx.userId, ctx.guildId, gold);
          grantExp(ctx.userId, ctx.guildId, exp);
          return new EmbedBuilder()
            .setColor(COLORS.success)
            .setTitle('📄 Hoàn Thành Nhiệm Vụ Dễ')
            .setDescription(`Một việc lặt vặt nhưng trả công đầy đủ.\n\n💰 Vàng: **+${gold}**\n✨ EXP: **+${exp}**`);
        }
      },
      {
        id: 'hard', label: 'Nhiệm vụ khó (rủi ro)', emoji: '📜', style: ButtonStyle.Danger,
        resolve: (ctx) => {
          const gold = randInt(120, 220);
          const exp = randInt(80, 140);
          grantGold(ctx.userId, ctx.guildId, gold);
          grantExp(ctx.userId, ctx.guildId, exp);
          const dmg = damagePlayerPercent(ctx, 10);
          const extra = clanLine(ctx, clan, 100, 6);
          return new EmbedBuilder()
            .setColor(COLORS.warning)
            .setTitle('📜 Hoàn Thành Nhiệm Vụ Khó')
            .setDescription(
              `Vất vả hơn nhiều nhưng đáng giá.\n\n💰 Vàng: **+${gold}**\n✨ EXP: **+${exp}**\n` +
              `💢 Chấn thương: **-${dmg} HP**` + extra
            );
        }
      },
      {
        id: 'skip', label: 'Bỏ qua', emoji: '🚶', style: ButtonStyle.Secondary,
        resolve: () => new EmbedBuilder()
          .setColor(COLORS.dark)
          .setTitle('🚶 Bỏ Qua')
          .setDescription('Không có gì hấp dẫn, bạn rời đi tiếp tục hành trình.')
      },
    ]
  );
}

// ══════════════════════════════════════════════════════════════════════
//  GUILD SMUGGLER CHASE — minigame
// ══════════════════════════════════════════════════════════════════════

const ALLEYS: MinigameOption[] = [
  { id: 'left', label: 'Hẻm Trái', emoji: '⬅️' },
  { id: 'mid', label: 'Hẻm Giữa', emoji: '⬆️' },
  { id: 'right', label: 'Hẻm Phải', emoji: '➡️' },
];

export async function showGuildSmugglerChase(ctx: RunExploreEventInput): Promise<void> {
  const intro = new EmbedBuilder()
    .setColor(COLORS.dark)
    .setTitle('🏃 Truy Đuổi Tên Buôn Lậu Của Guild')
    .setDescription(
      'Một thám tử mang huy hiệu guild đang đuổi theo một tên buôn lậu mang theo hàng hóa ăn cắp từ kho guild. ' +
      'Anh ta hét lên nhờ bạn chặn đường qua từng ngã hẻm!'
    );
  await ctx.interaction.editReply({ embeds: [intro], components: [] });

  await runPickMinigame(
    ctx, '🏃 Truy Đuổi Trong Hẻm', 3, ALLEYS,
    (label) => `Bóng tên buôn lậu vừa lao vào **${label.toUpperCase()}**!`,
    (ctx, successes, rounds) => {
      if (successes >= 2) {
        const gold = randInt(150, 220);
        grantGold(ctx.userId, ctx.guildId, gold);
        const fac = factionLine(ctx, 'merchants', 5);
        const wanted = adjustWanted(ctx.userId, ctx.guildId, -1);
        return new EmbedBuilder()
          .setColor(COLORS.success)
          .setTitle('🏃 Bắt Được Tên Buôn Lậu!')
          .setDescription(
            `Bạn chặn đúng **${successes}/${rounds}** lần và tóm được hắn, lấy lại hàng bị mất.\n\n` +
            `💰 Vàng: **+${gold}**\n${fac}\n🚨 Mức truy nã: **${wanted}** (-1)`
          );
      }
      const dmg = damagePlayerPercent(ctx, 10);
      const wanted = adjustWanted(ctx.userId, ctx.guildId, 1);
      return new EmbedBuilder()
        .setColor(COLORS.danger)
        .setTitle('🏃 Tên Buôn Lậu Trốn Thoát')
        .setDescription(
          `Bạn chỉ chặn đúng **${successes}/${rounds}** lần — hắn lách qua và đẩy bạn ngã vào tường gạch.\n\n` +
          `💢 Sát thương: **-${dmg} HP**\n🚨 Mức truy nã: **${wanted}** (+1)`
        );
    }
  );
}

// ══════════════════════════════════════════════════════════════════════
//  GUILD RIVAL SCOUT — normal choice event
// ══════════════════════════════════════════════════════════════════════

export async function showGuildRivalScout(ctx: RunExploreEventInput): Promise<void> {
  const clan = getPlayerClan(ctx.userId, ctx.guildId);
  await runChoiceEvent(
    ctx, '🕵️ Trinh Sát Của Guild Đối Thủ', COLORS.dark,
    'Bạn bắt gặp một người lạ mặt đang lén lút ghi chép gần khu vực hoạt động của một guild — có vẻ là gián điệp đang dò la tin tức.',
    [
      {
        id: 'follow', label: 'Theo dõi lặng lẽ', emoji: '🕵️', style: ButtonStyle.Primary,
        resolve: (ctx) => {
          const exp = randInt(40, 70);
          grantExp(ctx.userId, ctx.guildId, exp);
          const extra = clanLine(ctx, clan, 80, 8);
          return new EmbedBuilder()
            .setColor(COLORS.info)
            .setTitle('🕵️ Theo Dõi Thành Công')
            .setDescription(`Bạn lặng lẽ ghi nhớ thân phận của gián điệp để báo lại sau.\n\n✨ EXP: **+${exp}**` + extra);
        }
      },
      {
        id: 'alert', label: 'Hô báo động', emoji: '📢', style: ButtonStyle.Danger,
        resolve: (ctx) => {
          const fac = factionLine(ctx, 'villagers', 4);
          const wanted = adjustWanted(ctx.userId, ctx.guildId, 1);
          return new EmbedBuilder()
            .setColor(COLORS.warning)
            .setTitle('📢 Hô Báo Động')
            .setDescription(
              `Gián điệp hoảng loạn bỏ chạy giữa đám đông, gây náo loạn cả khu phố.\n\n${fac}\n🚨 Mức truy nã: **${wanted}** (+1)`
            );
        }
      },
      {
        id: 'ignore', label: 'Bỏ qua', emoji: '🚶', style: ButtonStyle.Secondary,
        resolve: () => new EmbedBuilder()
          .setColor(COLORS.dark)
          .setTitle('🚶 Bỏ Qua')
          .setDescription('Chuyện của guild khác, không phải việc của bạn.')
      },
    ]
  );
}

// ══════════════════════════════════════════════════════════════════════
//  GUILD SPARRING RING — minigame
// ══════════════════════════════════════════════════════════════════════

const STANCES: MinigameOption[] = [
  { id: 'attack', label: 'Tấn Công', emoji: '⚔️' },
  { id: 'block', label: 'Đỡ Đòn', emoji: '🛡️' },
  { id: 'retreat', label: 'Lùi Bước', emoji: '🏃' },
];

export async function showGuildSparringRing(ctx: RunExploreEventInput): Promise<void> {
  const clan = getPlayerClan(ctx.userId, ctx.guildId);
  const intro = new EmbedBuilder()
    .setColor(COLORS.warning)
    .setTitle('🥋 Võ Đường Của Một Guild')
    .setDescription('Một sư huynh trong võ đường guild mời bạn vào sàn đấu tập để rèn luyện phản xạ chiến đấu.');
  await ctx.interaction.editReply({ embeds: [intro], components: [] });

  await runPickMinigame(
    ctx, '🥋 Đấu Tập', 3, STANCES,
    (label) => `Sư huynh hô: "Phản ứng bằng **${label.toUpperCase()}**!"`,
    (ctx, successes, rounds) => {
      if (successes >= 2) {
        const exp = randInt(100, 150);
        grantExp(ctx.userId, ctx.guildId, exp);
        const extra = clanLine(ctx, clan, 0, 8);
        return new EmbedBuilder()
          .setColor(COLORS.success)
          .setTitle('🥋 Đấu Tập Xuất Sắc')
          .setDescription(
            `Bạn phản ứng đúng **${successes}/${rounds}** lần, khiến sư huynh gật gù khen ngợi.\n\n` +
            `✨ EXP: **+${exp}**` + (extra || '')
          );
      }
      const dmg = damagePlayerPercent(ctx, 12);
      const exp = randInt(20, 40);
      grantExp(ctx.userId, ctx.guildId, exp);
      return new EmbedBuilder()
        .setColor(COLORS.danger)
        .setTitle('🥋 Đấu Tập Bị Hạ')
        .setDescription(
          `Bạn chỉ phản ứng đúng **${successes}/${rounds}** lần và bị quật ngã vài cú.\n\n` +
          `💢 Sát thương: **-${dmg} HP**\n✨ EXP an ủi: **+${exp}**`
        );
    }
  );
}

// ══════════════════════════════════════════════════════════════════════
//  GUILD STOCK WHISPER — normal choice event
// ══════════════════════════════════════════════════════════════════════

export async function showGuildStockWhisper(ctx: RunExploreEventInput): Promise<void> {
  const clan = getPlayerClan(ctx.userId, ctx.guildId);
  await runChoiceEvent(
    ctx, '📈 Tin Đồn Cổ Phiếu Guild', COLORS.gold,
    'Bạn nghe lỏm được hai thương nhân thì thầm về biến động giá cổ phiếu của một guild nào đó trong thời gian tới.',
    [
      {
        id: 'report', label: 'Báo cho guild của bạn', emoji: '📣', style: ButtonStyle.Primary,
        resolve: (ctx) => {
          if (!clan) {
            const gold = randInt(20, 40);
            grantGold(ctx.userId, ctx.guildId, gold);
            return new EmbedBuilder()
              .setColor(COLORS.info)
              .setTitle('📣 Không Có Guild Để Báo')
              .setDescription(`Bạn chưa thuộc guild nào nên chỉ giữ tin này cho riêng mình.\n\n💰 Vàng: **+${gold}**`);
          }
          const extra = clanLine(ctx, clan, 60, 10);
          return new EmbedBuilder()
            .setColor(COLORS.success)
            .setTitle('📣 Báo Tin Cho Guild')
            .setDescription(`Bạn vội báo tin về cho **[${clan.tag}] ${clan.name}**.` + extra);
        }
      },
      {
        id: 'sell', label: 'Bán tin cho kẻ khác', emoji: '🤑', style: ButtonStyle.Danger,
        resolve: (ctx) => {
          const gold = randInt(80, 140);
          grantGold(ctx.userId, ctx.guildId, gold);
          const rep = repLine(ctx, -5);
          return new EmbedBuilder()
            .setColor(COLORS.warning)
            .setTitle('🤑 Bán Tin Lấy Tiền')
            .setDescription(`Bạn bán tin đồn cho một kẻ lạ mặt giấu mặt.\n\n💰 Vàng: **+${gold}**\n${rep}`);
        }
      },
      {
        id: 'ignore', label: 'Bỏ qua', emoji: '🚶', style: ButtonStyle.Secondary,
        resolve: () => new EmbedBuilder()
          .setColor(COLORS.dark)
          .setTitle('🚶 Bỏ Qua')
          .setDescription('Tin đồn chợ búa, chưa chắc đáng tin. Bạn bỏ ngoài tai.')
      },
    ]
  );
}

// ══════════════════════════════════════════════════════════════════════
//  GUILD FESTIVAL RING TOSS — minigame (fun, low stakes)
// ══════════════════════════════════════════════════════════════════════

const PEGS: MinigameOption[] = [
  { id: 'left', label: 'Cọc Trái', emoji: '🔵' },
  { id: 'mid', label: 'Cọc Giữa', emoji: '🟣' },
  { id: 'right', label: 'Cọc Phải', emoji: '🟢' },
];

export async function showGuildFestivalRingToss(ctx: RunExploreEventInput): Promise<void> {
  const intro = new EmbedBuilder()
    .setColor(COLORS.magic)
    .setTitle('🎯 Trò Ném Vòng Tại Hội Chợ Guild')
    .setDescription('Một gian hàng hội chợ do các guild địa phương tổ chức mời bạn chơi trò ném vòng lấy thưởng!');
  await ctx.interaction.editReply({ embeds: [intro], components: [] });

  await runPickMinigame(
    ctx, '🎯 Ném Vòng', 3, PEGS,
    (label) => `Người quản trò hô: "Ném vào **${label.toUpperCase()}**!"`,
    (ctx, successes, rounds) => {
      if (successes >= 2) {
        const gold = randInt(60, 100);
        grantGold(ctx.userId, ctx.guildId, gold);
        return new EmbedBuilder()
          .setColor(COLORS.success)
          .setTitle('🎯 Thắng Giải Hội Chợ!')
          .setDescription(`Bạn ném trúng **${successes}/${rounds}** vòng và giành được phần thưởng!\n\n💰 Vàng: **+${gold}**`);
      }
      const gold = randInt(10, 20);
      grantGold(ctx.userId, ctx.guildId, gold);
      return new EmbedBuilder()
        .setColor(COLORS.info)
        .setTitle('🎯 Chơi Vui Là Chính')
        .setDescription(`Bạn ném trúng **${successes}/${rounds}** vòng — không đủ giải lớn, nhưng vẫn được phần thưởng an ủi.\n\n💰 Vàng: **+${gold}**`);
    }
  );
}

// ══════════════════════════════════════════════════════════════════════
//  GUILD FESTIVAL DONATION — normal choice event
// ══════════════════════════════════════════════════════════════════════

export async function showGuildFestivalDonation(ctx: RunExploreEventInput): Promise<void> {
  const clan = getPlayerClan(ctx.userId, ctx.guildId);
  const player = getEffectivePlayer(ctx.userId, ctx.guildId);
  const gold = player?.gold ?? 0;

  await runChoiceEvent(
    ctx, '🎉 Lễ Hội Tri Ân Của Các Guild', COLORS.gold,
    'Các guild trong vùng tổ chức lễ hội tri ân, kêu gọi quyên góp vào quỹ chung để tổ chức các hoạt động cộng đồng.',
    [
      {
        id: 'big', label: `Quyên góp 100 gold`, emoji: '💰', style: ButtonStyle.Primary,
        resolve: (ctx) => {
          if (gold < 100 || !clan) {
            return new EmbedBuilder()
              .setColor(COLORS.warning)
              .setTitle('💰 Không Thể Quyên Góp')
              .setDescription(clan ? 'Bạn không có đủ 100 gold để quyên góp.' : 'Bạn chưa có guild nên không thể quyên góp vào quỹ guild.');
          }
          spendGold(ctx.userId, ctx.guildId, 100);
          const rep = repLine(ctx, 5);
          const extra = clanLine(ctx, clan, 100, 15);
          return new EmbedBuilder()
            .setColor(COLORS.success)
            .setTitle('🎉 Quyên Góp Hào Phóng')
            .setDescription(`Bạn quyên góp 100 gold vào quỹ lễ hội.\n\n${rep}` + extra);
        }
      },
      {
        id: 'small', label: 'Quyên góp 30 gold', emoji: '🪙', style: ButtonStyle.Secondary,
        resolve: (ctx) => {
          if (gold < 30) {
            return new EmbedBuilder()
              .setColor(COLORS.warning)
              .setTitle('🪙 Không Thể Quyên Góp')
              .setDescription('Bạn không có đủ 30 gold.');
          }
          spendGold(ctx.userId, ctx.guildId, 30);
          const rep = repLine(ctx, 2);
          return new EmbedBuilder()
            .setColor(COLORS.success)
            .setTitle('🪙 Quyên Góp Nhỏ')
            .setDescription(`Bạn góp một chút cho quỹ lễ hội.\n\n${rep}`);
        }
      },
      {
        id: 'skip', label: 'Không tham gia', emoji: '🚶', style: ButtonStyle.Danger,
        resolve: () => new EmbedBuilder()
          .setColor(COLORS.dark)
          .setTitle('🚶 Không Tham Gia')
          .setDescription('Bạn lặng lẽ đi qua, không góp gì cả.')
      },
    ]
  );
}

// ══════════════════════════════════════════════════════════════════════
//  GUILD CIPHER SCROLL — minigame
// ══════════════════════════════════════════════════════════════════════

const RUNES: MinigameOption[] = [
  { id: 'alpha', label: 'Rune Alpha', emoji: '🔺' },
  { id: 'beta', label: 'Rune Beta', emoji: '🔷' },
  { id: 'gamma', label: 'Rune Gamma', emoji: '🔶' },
];

export async function showGuildCipherScroll(ctx: RunExploreEventInput): Promise<void> {
  const clan = getPlayerClan(ctx.userId, ctx.guildId);
  const intro = new EmbedBuilder()
    .setColor(COLORS.purple)
    .setTitle('📜 Cuộn Giấy Mật Mã Của Guild')
    .setDescription('Bạn tìm thấy một cuộn giấy phủ đầy ký hiệu rune kỳ lạ — có vẻ là mật mã liên lạc của một guild.');
  await ctx.interaction.editReply({ embeds: [intro], components: [] });

  await runPickMinigame(
    ctx, '📜 Giải Mã Cuộn Giấy', 3, RUNES,
    (label) => `Dòng chữ mờ tiếp theo có dạng ký hiệu **${label.toUpperCase()}**. Chọn đúng rune!`,
    (ctx, successes, rounds) => {
      if (successes >= 2) {
        const gold = randInt(100, 180);
        const shards = randInt(1, 2);
        grantGold(ctx.userId, ctx.guildId, gold);
        grantSoulShards(ctx.userId, ctx.guildId, shards);
        const extra = clanLine(ctx, clan, 120, 10);
        return new EmbedBuilder()
          .setColor(COLORS.success)
          .setTitle('📜 Giải Mã Thành Công')
          .setDescription(
            `Bạn giải đúng **${successes}/${rounds}** ký hiệu, lần ra được vị trí một kho hàng bí mật.\n\n` +
            `💰 Vàng: **+${gold}**\n💎 Soul Shards: **+${shards}**` + extra
          );
      }
      return new EmbedBuilder()
        .setColor(COLORS.danger)
        .setTitle('📜 Không Giải Được Mã')
        .setDescription(`Bạn chỉ giải đúng **${successes}/${rounds}** ký hiệu — cuộn giấy mờ dần và vỡ thành tro bụi.`);
    }
  );
}

// ══════════════════════════════════════════════════════════════════════
//  GUILD LOST COURIER — normal choice event
// ══════════════════════════════════════════════════════════════════════

export async function showGuildLostCourier(ctx: RunExploreEventInput): Promise<void> {
  const clan = getPlayerClan(ctx.userId, ctx.guildId);
  await runChoiceEvent(
    ctx, '✉️ Người Đưa Tin Lạc Đường', COLORS.info,
    'Một người đưa tin trẻ tuổi đeo huy hiệu guild đang loay hoay tìm đường, tay cầm một lá thư quan trọng.',
    [
      {
        id: 'help', label: 'Giúp tìm đường', emoji: '🗺️', style: ButtonStyle.Primary,
        resolve: (ctx) => {
          const exp = randInt(40, 70);
          grantExp(ctx.userId, ctx.guildId, exp);
          const rep = repLine(ctx, 3);
          const extra = clanLine(ctx, clan, 50, 6);
          return new EmbedBuilder()
            .setColor(COLORS.success)
            .setTitle('🗺️ Chỉ Đường Thành Công')
            .setDescription(`Người đưa tin cảm ơn rối rít rồi vội vã đi tiếp.\n\n✨ EXP: **+${exp}**\n${rep}` + extra);
        }
      },
      {
        id: 'peek', label: 'Đọc trộm lá thư', emoji: '👀', style: ButtonStyle.Secondary,
        resolve: (ctx) => {
          const gold = randInt(15, 35);
          grantGold(ctx.userId, ctx.guildId, gold);
          const rep = repLine(ctx, -2);
          return new EmbedBuilder()
            .setColor(COLORS.warning)
            .setTitle('👀 Đọc Trộm Lá Thư')
            .setDescription(`Bạn lén đọc qua lá thư rồi nhanh tay nhặt vài đồng rơi ra từ túi người đưa tin khi anh ta luống cuống.\n\n💰 Vàng: **+${gold}**\n${rep}`);
        }
      },
      {
        id: 'ignore', label: 'Bỏ qua', emoji: '🚶', style: ButtonStyle.Danger,
        resolve: () => new EmbedBuilder()
          .setColor(COLORS.dark)
          .setTitle('🚶 Bỏ Qua')
          .setDescription('Bạn không có thời gian giúp người lạ và tiếp tục đi.')
      },
    ]
  );
}

// ══════════════════════════════════════════════════════════════════════
//  GUILD MOCK DUEL — minigame
// ══════════════════════════════════════════════════════════════════════

const DUEL_MOVES: MinigameOption[] = [
  { id: 'thrust', label: 'Đâm Thẳng', emoji: '🤺' },
  { id: 'parry', label: 'Gạt Đỡ', emoji: '🛡️' },
  { id: 'feint', label: 'Né Giả', emoji: '💨' },
];

export async function showGuildMockDuel(ctx: RunExploreEventInput): Promise<void> {
  const intro = new EmbedBuilder()
    .setColor(COLORS.warning)
    .setTitle('🤺 Giải Đấu Giao Hữu Giữa Các Guild')
    .setDescription('Một giải đấu giao hữu nhỏ giữa các guild đang diễn ra, và họ thiếu một người để đấu vòng loại. Bạn được mời tham gia!');
  await ctx.interaction.editReply({ embeds: [intro], components: [] });

  await runPickMinigame(
    ctx, '🤺 Đấu Giao Hữu', 3, DUEL_MOVES,
    (label) => `Đối thủ chuẩn bị ra đòn — phản ứng đúng bằng **${label.toUpperCase()}**!`,
    (ctx, successes, rounds) => {
      if (successes >= 2) {
        const gold = randInt(80, 140);
        const exp = randInt(120, 180);
        grantGold(ctx.userId, ctx.guildId, gold);
        grantExp(ctx.userId, ctx.guildId, exp);
        const rep = repLine(ctx, 5);
        return new EmbedBuilder()
          .setColor(COLORS.success)
          .setTitle('🤺 Thắng Vòng Loại!')
          .setDescription(
            `Bạn phản ứng đúng **${successes}/${rounds}** lần và thắng vòng đấu, được khán giả tán dương.\n\n` +
            `💰 Vàng: **+${gold}**\n✨ EXP: **+${exp}**\n${rep}`
          );
      }
      const dmg = damagePlayerPercent(ctx, 15);
      const exp = randInt(15, 30);
      grantExp(ctx.userId, ctx.guildId, exp);
      return new EmbedBuilder()
        .setColor(COLORS.danger)
        .setTitle('🤺 Thua Vòng Loại')
        .setDescription(
          `Bạn chỉ phản ứng đúng **${successes}/${rounds}** lần và bị loại sớm.\n\n` +
          `💢 Sát thương: **-${dmg} HP**\n✨ EXP an ủi: **+${exp}**`
        );
    }
  );
}

// ══════════════════════════════════════════════════════════════════════
//  GUILD WAR MESSENGER — normal choice event
// ══════════════════════════════════════════════════════════════════════

export async function showGuildWarMessenger(ctx: RunExploreEventInput): Promise<void> {
  const clan = getPlayerClan(ctx.userId, ctx.guildId);
  const desc = clan
    ? `Một sứ giả hớt hải tìm đến, báo rằng guild **[${clan.tag}] ${clan.name}** của bạn đang cần chuyển gấp một mật lệnh chiến tranh.`
    : 'Một sứ giả hớt hải chạy ngang, tay ôm một mật lệnh chiến tranh khẩn cấp cần chuyển đi nhanh.';

  await runChoiceEvent(
    ctx, '⚔️ Mật Lệnh Chiến Tranh Guild', COLORS.danger, desc,
    [
      {
        id: 'deliver', label: 'Giúp chuyển lệnh nhanh', emoji: '🏃', style: ButtonStyle.Primary,
        resolve: (ctx) => {
          const gold = randInt(60, 110);
          const exp = randInt(40, 80);
          grantGold(ctx.userId, ctx.guildId, gold);
          grantExp(ctx.userId, ctx.guildId, exp);
          const extra = clanLine(ctx, clan, 80, 8);
          return new EmbedBuilder()
            .setColor(COLORS.success)
            .setTitle('🏃 Chuyển Lệnh Thành Công')
            .setDescription(`Bạn chạy hết tốc lực và kịp chuyển mật lệnh đến nơi.\n\n💰 Vàng: **+${gold}**\n✨ EXP: **+${exp}**` + extra);
        }
      },
      {
        id: 'peek', label: 'Mở trộm xem lệnh', emoji: '🧐', style: ButtonStyle.Secondary,
        resolve: (ctx) => {
          const gold = randInt(20, 50);
          grantGold(ctx.userId, ctx.guildId, gold);
          const rep = repLine(ctx, -3);
          return new EmbedBuilder()
            .setColor(COLORS.warning)
            .setTitle('🧐 Mở Trộm Mật Lệnh')
            .setDescription(`Bạn lén mở xem nội dung rồi dán lại như cũ, kiếm được vài đồng từ thông tin bán lại.\n\n💰 Vàng: **+${gold}**\n${rep}`);
        }
      },
      {
        id: 'refuse', label: 'Từ chối giúp', emoji: '🙅', style: ButtonStyle.Danger,
        resolve: () => new EmbedBuilder()
          .setColor(COLORS.dark)
          .setTitle('🙅 Từ Chối')
          .setDescription('Sứ giả thất vọng nhưng phải tự mình tiếp tục chạy đi.')
      },
    ]
  );
}

// ══════════════════════════════════════════════════════════════════════
//  GUILD ALARM BELL — minigame
// ══════════════════════════════════════════════════════════════════════

const GATES: MinigameOption[] = [
  { id: 'left', label: 'Cổng Trái', emoji: '⬅️' },
  { id: 'mid', label: 'Cổng Giữa', emoji: '⏫' },
  { id: 'right', label: 'Cổng Phải', emoji: '➡️' },
];

export async function showGuildAlarmBell(ctx: RunExploreEventInput): Promise<void> {
  const clan = getPlayerClan(ctx.userId, ctx.guildId);
  const intro = new EmbedBuilder()
    .setColor(COLORS.danger)
    .setTitle('🔔 Chuông Báo Động Doanh Trại Guild')
    .setDescription(
      'Chuông báo động vang lên khắp doanh trại của một guild — quân trộm đang đột kích kho hàng từ nhiều cổng cùng lúc! ' +
      'Bạn xông vào giúp chặn từng đợt tấn công.'
    );
  await ctx.interaction.editReply({ embeds: [intro], components: [] });

  await runPickMinigame(
    ctx, '🔔 Chặn Đột Kích', 3, GATES,
    (label) => `Có tiếng động lớn từ **${label.toUpperCase()}**! Chạy tới chặn ngay!`,
    (ctx, successes, rounds) => {
      if (successes >= 2) {
        const gold = randInt(180, 260);
        grantGold(ctx.userId, ctx.guildId, gold);
        const fac = factionLine(ctx, 'merchants', 4);
        const extra = clanLine(ctx, clan, 180, 10);
        return new EmbedBuilder()
          .setColor(COLORS.success)
          .setTitle('🔔 Đẩy Lùi Đột Kích!')
          .setDescription(
            `Bạn chặn đúng **${successes}/${rounds}** đợt tấn công, bảo vệ thành công kho hàng.\n\n` +
            `💰 Vàng: **+${gold}**\n${fac}` + extra
          );
      }
      const dmg = damagePlayerPercent(ctx, 18);
      const wanted = adjustWanted(ctx.userId, ctx.guildId, 1);
      return new EmbedBuilder()
        .setColor(COLORS.danger)
        .setTitle('🔔 Kho Hàng Bị Cướp Phá')
        .setDescription(
          `Bạn chỉ chặn được **${successes}/${rounds}** đợt — quân trộm cướp được một phần hàng và bỏ chạy trong hỗn loạn.\n\n` +
          `💢 Sát thương: **-${dmg} HP**\n🚨 Mức truy nã: **${wanted}** (+1)`
        );
    }
  );
}

// ══════════════════════════════════════════════════════════════════════
//  GUILD ANNIVERSARY — normal choice event
// ══════════════════════════════════════════════════════════════════════

export async function showGuildAnniversary(ctx: RunExploreEventInput): Promise<void> {
  await runChoiceEvent(
    ctx, '🎂 Lễ Kỷ Niệm Thành Lập Guild', COLORS.magic,
    'Đường phố rộn ràng cờ hoa — một guild địa phương đang tổ chức lễ kỷ niệm thành lập, mở cửa chào đón mọi người.',
    [
      {
        id: 'party', label: 'Tham gia tiệc', emoji: '🎉', style: ButtonStyle.Primary,
        resolve: (ctx) => {
          const heal = healPlayerPercent(ctx, 30);
          const rep = repLine(ctx, 2);
          return new EmbedBuilder()
            .setColor(COLORS.success)
            .setTitle('🎉 Tham Gia Tiệc')
            .setDescription(`Bạn ăn uống no nê và nghỉ ngơi thoải mái.\n\n❤️ Hồi phục: **+${heal} HP/MP**\n${rep}`);
        }
      },
      {
        id: 'perform', label: 'Biểu diễn tài năng', emoji: '🎭', style: ButtonStyle.Success,
        resolve: (ctx) => {
          const gold = randInt(50, 100);
          grantGold(ctx.userId, ctx.guildId, gold);
          const rep = repLine(ctx, 3);
          return new EmbedBuilder()
            .setColor(COLORS.gold)
            .setTitle('🎭 Biểu Diễn Tài Năng')
            .setDescription(`Bạn lên biểu diễn một tiết mục nhỏ và nhận được tiền thưởng từ khán giả.\n\n💰 Vàng: **+${gold}**\n${rep}`);
        }
      },
      {
        id: 'leave', label: 'Rời đi', emoji: '🚶', style: ButtonStyle.Secondary,
        resolve: () => new EmbedBuilder()
          .setColor(COLORS.dark)
          .setTitle('🚶 Rời Đi')
          .setDescription('Bạn không thích đám đông và tiếp tục lên đường.')
      },
    ]
  );
}

// ══════════════════════════════════════════════════════════════════════
//  GUILD RELIC PUZZLE — minigame
// ══════════════════════════════════════════════════════════════════════

const RELIC_RUNES: MinigameOption[] = [
  { id: 'fire', label: 'Khắc Lửa', emoji: '🔥' },
  { id: 'water', label: 'Khắc Nước', emoji: '💧' },
  { id: 'earth', label: 'Khắc Đất', emoji: '🪨' },
];

export async function showGuildRelicPuzzle(ctx: RunExploreEventInput): Promise<void> {
  const clan = getPlayerClan(ctx.userId, ctx.guildId);
  const intro = new EmbedBuilder()
    .setColor(COLORS.purple)
    .setTitle('🗿 Bệ Thờ Cổ Trong Hầm Của Guild')
    .setDescription('Bạn tìm thấy một hầm ngầm với bệ thờ cổ khắc ba loại nguyên tố — có vẻ từng thuộc về một guild đã biến mất.');
  await ctx.interaction.editReply({ embeds: [intro], components: [] });

  await runPickMinigame(
    ctx, '🗿 Giải Đố Bệ Thờ', 3, RELIC_RUNES,
    (label) => `Bệ thờ phát sáng yếu — chạm vào khắc hình **${label.toUpperCase()}**!`,
    (ctx, successes, rounds) => {
      if (successes >= 2) {
        const shards = randInt(1, 3);
        const exp = randInt(80, 130);
        grantSoulShards(ctx.userId, ctx.guildId, shards);
        grantExp(ctx.userId, ctx.guildId, exp);
        const extra = clanLine(ctx, clan, 100, 8);
        return new EmbedBuilder()
          .setColor(COLORS.success)
          .setTitle('🗿 Bệ Thờ Thức Tỉnh')
          .setDescription(
            `Bạn chạm đúng **${successes}/${rounds}** khắc hình — bệ thờ tỏa sáng và ban phước cho bạn.\n\n` +
            `💎 Soul Shards: **+${shards}**\n✨ EXP: **+${exp}**` + extra
          );
      }
      const dmg = damagePlayerPercent(ctx, 6);
      return new EmbedBuilder()
        .setColor(COLORS.danger)
        .setTitle('🗿 Bệ Thờ Im Lặng')
        .setDescription(
          `Bạn chỉ chạm đúng **${successes}/${rounds}** khắc hình — bệ thờ phát ra một luồng khí lạnh khiến bạn hơi choáng.\n\n` +
          `💢 Sát thương: **-${dmg} HP**`
        );
    }
  );
}

// ══════════════════════════════════════════════════════════════════════
//  GUILD BOUNTY BOARD — normal choice event
// ══════════════════════════════════════════════════════════════════════

export async function showGuildBountyBoard(ctx: RunExploreEventInput): Promise<void> {
  await runChoiceEvent(
    ctx, '🎯 Bảng Treo Thưởng Của Guild', COLORS.gold,
    'Một bảng treo thưởng của các guild liệt kê vài mục tiêu cần xử lý, kèm tiền thưởng tương ứng với độ khó.',
    [
      {
        id: 'small', label: 'Treo thưởng nhỏ (an toàn)', emoji: '📃', style: ButtonStyle.Primary,
        resolve: (ctx) => {
          const gold = randInt(50, 90);
          grantGold(ctx.userId, ctx.guildId, gold);
          return new EmbedBuilder()
            .setColor(COLORS.success)
            .setTitle('📃 Hoàn Thành Treo Thưởng Nhỏ')
            .setDescription(`Một mục tiêu nhỏ, dễ xử lý.\n\n💰 Vàng: **+${gold}**`);
        }
      },
      {
        id: 'big', label: 'Treo thưởng lớn (nguy hiểm)', emoji: '📜', style: ButtonStyle.Danger,
        resolve: (ctx) => {
          const gold = randInt(150, 280);
          grantGold(ctx.userId, ctx.guildId, gold);
          const dmg = damagePlayerPercent(ctx, 20);
          const rep = repLine(ctx, 4);
          return new EmbedBuilder()
            .setColor(COLORS.warning)
            .setTitle('📜 Hoàn Thành Treo Thưởng Lớn')
            .setDescription(`Mục tiêu này không hề dễ dàng, nhưng phần thưởng rất hậu hĩnh.\n\n💰 Vàng: **+${gold}**\n💢 Sát thương: **-${dmg} HP**\n${rep}`);
        }
      },
      {
        id: 'skip', label: 'Bỏ qua', emoji: '🚶', style: ButtonStyle.Secondary,
        resolve: () => new EmbedBuilder()
          .setColor(COLORS.dark)
          .setTitle('🚶 Bỏ Qua')
          .setDescription('Không mục tiêu nào phù hợp với bạn lúc này.')
      },
    ]
  );
}

// ══════════════════════════════════════════════════════════════════════
//  GUILD TREASURY AUDIT — normal choice event
// ══════════════════════════════════════════════════════════════════════

export async function showGuildTreasuryAudit(ctx: RunExploreEventInput): Promise<void> {
  const clan = getPlayerClan(ctx.userId, ctx.guildId);
  if (!clan) {
    return runChoiceEvent(
      ctx, '🧮 Kiểm Kê Kho Guild', COLORS.info,
      'Bạn thấy một nhóm người đang kiểm kê kho hàng của một guild, nhưng bạn không thuộc guild nào nên chỉ đứng nhìn.',
      [
        {
          id: 'watch', label: 'Quan sát', emoji: '👀', style: ButtonStyle.Secondary,
          resolve: (ctx) => {
            const exp = randInt(10, 25);
            grantExp(ctx.userId, ctx.guildId, exp);
            return new EmbedBuilder()
              .setColor(COLORS.info)
              .setTitle('👀 Quan Sát')
              .setDescription(`Bạn học được vài điều về cách quản lý kho.\n\n✨ EXP: **+${exp}**`);
          }
        },
        {
          id: 'leave', label: 'Rời đi', emoji: '🚶', style: ButtonStyle.Primary,
          resolve: () => new EmbedBuilder()
            .setColor(COLORS.dark)
            .setTitle('🚶 Rời Đi')
            .setDescription('Bạn tiếp tục hành trình.')
        },
      ]
    );
  }

  await runChoiceEvent(
    ctx, '🧮 Kiểm Kê Kho Guild', COLORS.gold,
    `Quản lý guild **[${clan.tag}] ${clan.name}** đang kiểm kê kho và cần thêm người giúp đối chiếu sổ sách.`,
    [
      {
        id: 'honest', label: 'Giúp kiểm đếm trung thực', emoji: '🧮', style: ButtonStyle.Primary,
        resolve: (ctx) => {
          const gold = randInt(30, 60);
          grantGold(ctx.userId, ctx.guildId, gold);
          const rep = repLine(ctx, 3);
          const extra = clanLine(ctx, clan, 50, 12);
          return new EmbedBuilder()
            .setColor(COLORS.success)
            .setTitle('🧮 Kiểm Đếm Trung Thực')
            .setDescription(`Sổ sách khớp hoàn toàn, quản lý guild rất hài lòng.\n\n💰 Vàng: **+${gold}**\n${rep}` + extra);
        }
      },
      {
        id: 'skim', label: 'Biển lận một ít', emoji: '🤫', style: ButtonStyle.Danger,
        resolve: (ctx) => {
          const gold = randInt(80, 150);
          grantGold(ctx.userId, ctx.guildId, gold);
          const rep = repLine(ctx, -6);
          const wanted = adjustWanted(ctx.userId, ctx.guildId, 1);
          return new EmbedBuilder()
            .setColor(COLORS.danger)
            .setTitle('🤫 Biển Lận Sổ Sách')
            .setDescription(`Bạn lén sửa vài con số và bỏ túi phần chênh lệch.\n\n💰 Vàng: **+${gold}**\n${rep}\n🚨 Mức truy nã: **${wanted}** (+1)`);
        }
      },
      {
        id: 'skip', label: 'Không quan tâm', emoji: '🚶', style: ButtonStyle.Secondary,
        resolve: () => new EmbedBuilder()
          .setColor(COLORS.dark)
          .setTitle('🚶 Không Quan Tâm')
          .setDescription('Bạn để họ tự xử lý công việc của mình.')
      },
    ]
  );
}

// ══════════════════════════════════════════════════════════════════════
//  EVENT REGISTRY
// ══════════════════════════════════════════════════════════════════════

export type GuildExploreEventId =
  | 'guild_caravan_ambush'
  | 'guild_recruiter'
  | 'guild_vault_cipher'
  | 'guild_bulletin_board'
  | 'guild_watchtower_drill'
  | 'guild_rival_scout'
  | 'guild_smuggler_chase'
  | 'guild_stock_whisper'
  | 'guild_sparring_ring'
  | 'guild_festival_donation'
  | 'guild_festival_ring_toss'
  | 'guild_lost_courier'
  | 'guild_cipher_scroll'
  | 'guild_war_messenger'
  | 'guild_mock_duel'
  | 'guild_anniversary'
  | 'guild_alarm_bell'
  | 'guild_bounty_board'
  | 'guild_relic_puzzle'
  | 'guild_treasury_audit';

export const GUILD_EVENT_HANDLERS: Record<GuildExploreEventId, (ctx: RunExploreEventInput) => Promise<void>> = {
  guild_caravan_ambush: showGuildCaravanAmbush,
  guild_recruiter: showGuildRecruiter,
  guild_vault_cipher: showGuildVaultCipher,
  guild_bulletin_board: showGuildBulletinBoard,
  guild_watchtower_drill: showGuildWatchtowerDrill,
  guild_rival_scout: showGuildRivalScout,
  guild_smuggler_chase: showGuildSmugglerChase,
  guild_stock_whisper: showGuildStockWhisper,
  guild_sparring_ring: showGuildSparringRing,
  guild_festival_donation: showGuildFestivalDonation,
  guild_festival_ring_toss: showGuildFestivalRingToss,
  guild_lost_courier: showGuildLostCourier,
  guild_cipher_scroll: showGuildCipherScroll,
  guild_war_messenger: showGuildWarMessenger,
  guild_mock_duel: showGuildMockDuel,
  guild_anniversary: showGuildAnniversary,
  guild_alarm_bell: showGuildAlarmBell,
  guild_bounty_board: showGuildBountyBoard,
  guild_relic_puzzle: showGuildRelicPuzzle,
  guild_treasury_audit: showGuildTreasuryAudit,
};
