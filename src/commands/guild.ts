import {
  SlashCommandBuilder, ChatInputCommandInteraction,
  EmbedBuilder, ActionRowBuilder, ButtonBuilder,
  ButtonStyle, ComponentType,
} from 'discord.js';
import db from '../database/index';
import { getPlayer } from '../systems/player';
import { COLORS } from '../utils/embeds';
import { onlyUser } from '../utils/collectors';

export const data = new SlashCommandBuilder()
  .setName('guild')
  .setDescription('Hệ thống Guild/Clan')
  // ── Basic ──────────────────────────────────────────────────────────────
  .addSubcommand(s => s.setName('create')
    .setDescription('Tạo guild mới (tốn 1.000 gold)')
    .addStringOption(o => o.setName('name').setDescription('Tên guild (tối đa 24 ký tự)').setRequired(true))
    .addStringOption(o => o.setName('tag').setDescription('Tag ngắn 2-5 ký tự, VD: RPG').setRequired(true)))
  .addSubcommand(s => s.setName('info')
    .setDescription('Xem thông tin guild')
    .addStringOption(o => o.setName('name').setDescription('Tên guild (bỏ trống = guild của bạn)')))
  .addSubcommand(s => s.setName('join')
    .setDescription('Xin gia nhập guild')
    .addStringOption(o => o.setName('name').setDescription('Tên guild muốn gia nhập').setRequired(true)))
  .addSubcommand(s => s.setName('leave')
    .setDescription('Rời khỏi guild hiện tại'))
  .addSubcommand(s => s.setName('invite')
    .setDescription('Mời thành viên vào guild (cần Officer+)')
    .addUserOption(o => o.setName('user').setDescription('Người chơi muốn mời').setRequired(true)))
  .addSubcommand(s => s.setName('kick')
    .setDescription('Đuổi thành viên khỏi guild (cần Officer+)')
    .addUserOption(o => o.setName('user').setDescription('Thành viên muốn đuổi').setRequired(true)))
  .addSubcommand(s => s.setName('promote')
    .setDescription('Thăng chức thành Officer (chỉ Owner)')
    .addUserOption(o => o.setName('user').setDescription('Thành viên muốn thăng').setRequired(true)))
  .addSubcommand(s => s.setName('demote')
    .setDescription('Hạ chức Officer về Member (chỉ Owner)')
    .addUserOption(o => o.setName('user').setDescription('Officer muốn hạ').setRequired(true)))
  .addSubcommand(s => s.setName('members')
    .setDescription('Xem danh sách thành viên guild'))
  .addSubcommand(s => s.setName('deposit')
    .setDescription('Nộp gold vào kho guild')
    .addIntegerOption(o => o.setName('amount').setDescription('Số gold muốn nộp').setRequired(true).setMinValue(1)))
  .addSubcommand(s => s.setName('buff')
    .setDescription('Kích hoạt buff cho cả guild (tốn gold kho)')
    .addStringOption(o => o.setName('type')
      .setDescription('Loại buff')
      .setRequired(true)
      .addChoices(
        { name: '⚔️ ATK +10% (24h) — 500g', value: 'atk' },
        { name: '🛡️ DEF +10% (24h) — 500g', value: 'def' },
        { name: '❤️ HP +15% (24h) — 400g',  value: 'hp'  },
        { name: '⭐ EXP +20% (24h) — 800g', value: 'exp' },
        { name: '💰 Gold +15% (24h) — 600g', value: 'gold' },
      )))
  // ── War ────────────────────────────────────────────────────────────────
  .addSubcommandGroup(g => g.setName('war').setDescription('Chiến tranh Guild')
    .addSubcommand(s => s.setName('declare')
      .setDescription('Tuyên chiến với guild khác (tốn 200g kho)')
      .addStringOption(o => o.setName('target').setDescription('Tên guild mục tiêu').setRequired(true)))
    .addSubcommand(s => s.setName('attack')
      .setDescription('Tấn công trong chiến tranh đang diễn ra (cooldown 1h)'))
    .addSubcommand(s => s.setName('status')
      .setDescription('Xem tình trạng chiến tranh hiện tại')))
  // ── Stock ──────────────────────────────────────────────────────────────
  .addSubcommandGroup(g => g.setName('stock').setDescription('Thị trường chứng khoán Guild')
    .addSubcommand(s => s.setName('market')
      .setDescription('Xem toàn bộ thị trường cổ phiếu guild'))
    .addSubcommand(s => s.setName('buy')
      .setDescription('Mua cổ phiếu của một guild')
      .addStringOption(o => o.setName('name').setDescription('Tên guild muốn đầu tư').setRequired(true))
      .addIntegerOption(o => o.setName('shares').setDescription('Số cổ phiếu muốn mua').setRequired(true).setMinValue(1)))
    .addSubcommand(s => s.setName('sell')
      .setDescription('Bán cổ phiếu đang nắm giữ')
      .addStringOption(o => o.setName('name').setDescription('Tên guild').setRequired(true))
      .addIntegerOption(o => o.setName('shares').setDescription('Số cổ phiếu muốn bán').setRequired(true).setMinValue(1)))
    .addSubcommand(s => s.setName('portfolio')
      .setDescription('Xem danh mục đầu tư của bạn'))
    .addSubcommand(s => s.setName('dividend')
      .setDescription('Trả cổ tức cho cổ đông (chỉ Owner guild)')
      .addIntegerOption(o => o.setName('per_share').setDescription('Gold mỗi cổ phiếu').setRequired(true).setMinValue(1))));

// ── Types ──────────────────────────────────────────────────────────────────
interface ClanRow {
  clan_id: string; discord_gid: string; name: string; tag: string;
  owner_id: string; description: string; level: number; exp: number;
  treasury: number; created_at: number;
}
interface MemberRow {
  clan_id: string; user_id: string; discord_gid: string;
  rank: string; contribution: number; joined_at: number;
}
interface StockRow {
  clan_id: string; total_shares: number; available_shares: number;
  price: number; last_updated: number;
}
interface HoldingRow {
  user_id: string; discord_gid: string; clan_id: string;
  shares: number; avg_cost: number;
}

// ── Helpers ────────────────────────────────────────────────────────────────
function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function getClan(clanId: string): ClanRow | undefined {
  return db.prepare('SELECT * FROM clans WHERE clan_id=?').get(clanId) as unknown as ClanRow | undefined;
}

function getClanByName(discordGid: string, name: string): ClanRow | undefined {
  return db.prepare('SELECT * FROM clans WHERE discord_gid=? AND LOWER(name)=LOWER(?)')
    .get(discordGid, name) as unknown as ClanRow | undefined;
}

function getMembership(userId: string, discordGid: string): MemberRow | undefined {
  return db.prepare('SELECT * FROM clan_members WHERE user_id=? AND discord_gid=?')
    .get(userId, discordGid) as unknown as MemberRow | undefined;
}

function getMemberCount(clanId: string): number {
  return (db.prepare('SELECT COUNT(*) as c FROM clan_members WHERE clan_id=?').get(clanId) as { c: number }).c;
}

// Stock price = treasury backing + level premium + membership premium
function calcPrice(clan: ClanRow): number {
  const memberCount = getMemberCount(clan.clan_id);
  return Math.max(1, Math.floor(10 + clan.treasury / 200 + clan.level * 8 + memberCount * 2));
}

function ensureStock(clan: ClanRow): StockRow {
  const existing = db.prepare('SELECT * FROM clan_stocks WHERE clan_id=?').get(clan.clan_id) as unknown as StockRow | undefined;
  if (existing) return existing;
  const price = calcPrice(clan);
  db.prepare('INSERT INTO clan_stocks (clan_id, total_shares, available_shares, price) VALUES (?,1000,800,?)')
    .run(clan.clan_id, price);
  return db.prepare('SELECT * FROM clan_stocks WHERE clan_id=?').get(clan.clan_id) as unknown as StockRow;
}

function refreshPrice(clan: ClanRow): void {
  const newPrice = calcPrice(clan);
  db.prepare('UPDATE clan_stocks SET price=?, last_updated=unixepoch() WHERE clan_id=?')
    .run(newPrice, clan.clan_id);
  db.prepare('INSERT INTO stock_history (clan_id, price) VALUES (?,?)').run(clan.clan_id, newPrice);
}

const BUFF_CONFIG: Record<string, { label: string; icon: string; cost: number; value: number }> = {
  atk:  { label: 'ATK +10%',   icon: '⚔️',  cost: 500, value: 10 },
  def:  { label: 'DEF +10%',   icon: '🛡️',  cost: 500, value: 10 },
  hp:   { label: 'Max HP +15%', icon: '❤️',  cost: 400, value: 15 },
  exp:  { label: 'EXP +20%',   icon: '⭐',  cost: 800, value: 20 },
  gold: { label: 'Gold +15%',  icon: '💰',  cost: 600, value: 15 },
};

function clanLevelExp(level: number): number {
  return 100 * level * level;
}

function grantClanExp(clan: ClanRow, amount: number): void {
  let { level, exp } = clan;
  exp += amount;
  const needed = clanLevelExp(level);
  if (exp >= needed && level < 10) {
    level++;
    exp -= needed;
  }
  db.prepare('UPDATE clans SET level=?, exp=? WHERE clan_id=?').run(level, exp, clan.clan_id);
}

// ── Command ────────────────────────────────────────────────────────────────
export async function execute(i: ChatInputCommandInteraction): Promise<void> {
  await i.deferReply();
  const userId     = i.user.id;
  const discordGid = i.guildId!;
  const player     = getPlayer(userId, discordGid);

  if (!player) {
    await i.editReply({ embeds: [new EmbedBuilder().setColor(COLORS.warning).setDescription('❌ Bạn chưa có nhân vật! Dùng `/start`.')] });
    return;
  }

  const group = i.options.getSubcommandGroup(false);
  const sub   = i.options.getSubcommand();

  // ══════════════════════════════════════════════════════════════════════
  // STOCK subcommand group
  // ══════════════════════════════════════════════════════════════════════
  if (group === 'stock') {
    if (sub === 'market') {
      const clans = db.prepare('SELECT * FROM clans WHERE discord_gid=? ORDER BY level DESC, treasury DESC')
        .all(discordGid) as unknown as ClanRow[];

      if (clans.length === 0) {
        await i.editReply({ embeds: [new EmbedBuilder().setColor(COLORS.info).setTitle('📈 Thị Trường Cổ Phiếu').setDescription('Chưa có guild nào trên server này.')] });
        return;
      }

      const lines = clans.map(c => {
        const stock = ensureStock(c);
        const memberCount = getMemberCount(c.clan_id);
        const pct = Math.round(((stock.total_shares - stock.available_shares) / stock.total_shares) * 100);
        return (
          `**[${c.tag}] ${c.name}** · Lv.${c.level}\n` +
          `  💵 **${stock.price}g**/cổ · 📊 ${pct}% lưu hành · 👥 ${memberCount} thành viên · 🏦 ${c.treasury.toLocaleString()}g kho`
        );
      }).join('\n\n');

      await i.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x00cc99)
            .setTitle('📈 Thị Trường Cổ Phiếu Guild')
            .setDescription(lines)
            .setFooter({ text: 'Giá phản ánh: kho guild + cấp + thành viên · /guild stock buy <tên> <số>' }),
        ],
      });
      return;
    }

    if (sub === 'portfolio') {
      const holdings = db.prepare(
        'SELECT h.*, c.name, c.tag, c.level, cs.price FROM stock_holdings h ' +
        'JOIN clans c ON c.clan_id=h.clan_id ' +
        'JOIN clan_stocks cs ON cs.clan_id=h.clan_id ' +
        'WHERE h.user_id=? AND h.discord_gid=? AND h.shares > 0'
      ).all(userId, discordGid) as unknown as (HoldingRow & { name: string; tag: string; level: number; price: number })[];

      if (holdings.length === 0) {
        await i.editReply({ embeds: [new EmbedBuilder().setColor(COLORS.info).setTitle('📊 Danh Mục Đầu Tư').setDescription('Bạn chưa sở hữu cổ phiếu nào.\n\nDùng `/guild stock buy` để đầu tư!')] });
        return;
      }

      let totalValue = 0;
      let totalCost  = 0;
      const lines = holdings.map(h => {
        const curValue = h.shares * h.price;
        const cost     = h.shares * h.avg_cost;
        const pnl      = curValue - cost;
        const pnlSign  = pnl >= 0 ? '+' : '';
        totalValue += curValue;
        totalCost  += cost;
        return (
          `**[${h.tag}] ${h.name}** · Lv.${h.level}\n` +
          `  ${h.shares} cổ · Giá: **${h.price}g** · Trị giá: **${curValue.toLocaleString()}g**\n` +
          `  P&L: **${pnlSign}${pnl.toLocaleString()}g** (mua tb: ${h.avg_cost}g/cổ)`
        );
      }).join('\n\n');

      const totalPnl  = totalValue - totalCost;
      const pnlColor  = totalPnl >= 0 ? 0x00cc66 : 0xcc3333;

      await i.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(pnlColor)
            .setTitle('📊 Danh Mục Đầu Tư')
            .setDescription(lines)
            .addFields({
              name: '📋 Tổng Kết',
              value: `Tổng trị giá: **${totalValue.toLocaleString()}g** · P&L: **${totalPnl >= 0 ? '+' : ''}${totalPnl.toLocaleString()}g**`,
            }),
        ],
      });
      return;
    }

    // buy / sell need a target clan
    const targetName = i.options.getString('name', true);
    const targetClan = getClanByName(discordGid, targetName);
    if (!targetClan) {
      await i.editReply({ embeds: [new EmbedBuilder().setColor(COLORS.warning).setDescription(`❌ Không tìm thấy guild **${targetName}**.`)] });
      return;
    }
    const stock  = ensureStock(targetClan);
    const shares = i.options.getInteger('shares', true);

    if (sub === 'buy') {
      if (stock.available_shares < shares) {
        await i.editReply({ embeds: [new EmbedBuilder().setColor(COLORS.warning).setDescription(`❌ Chỉ còn **${stock.available_shares}** cổ phiếu **${targetClan.name}** trên thị trường.`)] });
        return;
      }

      // Max 30% per player
      const existing = db.prepare('SELECT shares, avg_cost FROM stock_holdings WHERE user_id=? AND discord_gid=? AND clan_id=?')
        .get(userId, discordGid, targetClan.clan_id) as { shares: number; avg_cost: number } | undefined;
      const alreadyHeld = existing?.shares ?? 0;
      const maxAllowed  = Math.floor(stock.total_shares * 0.30);
      if (alreadyHeld + shares > maxAllowed) {
        await i.editReply({ embeds: [new EmbedBuilder().setColor(COLORS.warning).setDescription(`❌ Mỗi người chỉ được nắm tối đa **30%** (${maxAllowed} cổ) của một guild. Bạn đang giữ ${alreadyHeld} cổ.`)] });
        return;
      }

      const totalCost = Math.ceil(shares * stock.price * 1.05); // 5% buy spread
      if (player.gold < totalCost) {
        await i.editReply({ embeds: [new EmbedBuilder().setColor(COLORS.warning).setDescription(`❌ Cần **${totalCost.toLocaleString()}g** (bao gồm 5% phí). Bạn có **${player.gold.toLocaleString()}g**.`)] });
        return;
      }

      const newAvgCost = alreadyHeld === 0
        ? stock.price
        : Math.round((alreadyHeld * (existing!.avg_cost) + shares * stock.price) / (alreadyHeld + shares));

      db.prepare('UPDATE players SET gold=gold-? WHERE user_id=? AND guild_id=?').run(totalCost, userId, discordGid);
      db.prepare(`
        INSERT INTO stock_holdings (user_id, discord_gid, clan_id, shares, avg_cost)
        VALUES (?,?,?,?,?)
        ON CONFLICT(user_id, discord_gid, clan_id) DO UPDATE SET
          shares=shares+?, avg_cost=?
      `).run(userId, discordGid, targetClan.clan_id, shares, newAvgCost, shares, newAvgCost);
      db.prepare('UPDATE clan_stocks SET available_shares=available_shares-? WHERE clan_id=?').run(shares, targetClan.clan_id);

      // 5% fee goes to clan treasury
      const fee = totalCost - shares * stock.price;
      db.prepare('UPDATE clans SET treasury=treasury+? WHERE clan_id=?').run(fee, targetClan.clan_id);
      refreshPrice(targetClan);

      await i.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x00cc99)
            .setTitle('📈 Mua Cổ Phiếu Thành Công!')
            .setDescription(
              `**[${targetClan.tag}] ${targetClan.name}**\n` +
              `+${shares} cổ phiếu @ **${stock.price}g**/cổ\n` +
              `💰 Tổng thanh toán: **${totalCost.toLocaleString()}g** (phí 5%: ${fee}g)\n` +
              `📊 Bạn đang giữ: **${alreadyHeld + shares}** / ${stock.total_shares} cổ`
            ),
        ],
      });
      return;
    }

    if (sub === 'sell') {
      const holding = db.prepare('SELECT shares, avg_cost FROM stock_holdings WHERE user_id=? AND discord_gid=? AND clan_id=?')
        .get(userId, discordGid, targetClan.clan_id) as { shares: number; avg_cost: number } | undefined;

      if (!holding || holding.shares < shares) {
        await i.editReply({ embeds: [new EmbedBuilder().setColor(COLORS.warning).setDescription(`❌ Bạn chỉ có **${holding?.shares ?? 0}** cổ phiếu **${targetClan.name}**.`)] });
        return;
      }

      const proceeds = Math.floor(shares * stock.price * 0.95); // 5% sell spread to treasury
      const fee      = shares * stock.price - proceeds;

      db.prepare('UPDATE players SET gold=gold+? WHERE user_id=? AND guild_id=?').run(proceeds, userId, discordGid);
      db.prepare('UPDATE stock_holdings SET shares=shares-? WHERE user_id=? AND discord_gid=? AND clan_id=?')
        .run(shares, userId, discordGid, targetClan.clan_id);
      db.prepare('UPDATE clan_stocks SET available_shares=available_shares+? WHERE clan_id=?').run(shares, targetClan.clan_id);
      db.prepare('UPDATE clans SET treasury=treasury+? WHERE clan_id=?').run(fee, targetClan.clan_id);
      refreshPrice(targetClan);

      const pnl     = proceeds - shares * holding.avg_cost;
      const pnlSign = pnl >= 0 ? '+' : '';

      await i.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(pnl >= 0 ? 0x00cc66 : 0xcc3333)
            .setTitle('📉 Bán Cổ Phiếu')
            .setDescription(
              `**[${targetClan.tag}] ${targetClan.name}**\n` +
              `-${shares} cổ @ **${stock.price}g**/cổ\n` +
              `💰 Nhận: **${proceeds.toLocaleString()}g** (phí 5%: ${fee}g)\n` +
              `📊 P&L lần bán này: **${pnlSign}${pnl.toLocaleString()}g**`
            ),
        ],
      });
      return;
    }

    if (sub === 'dividend') {
      const myMembership = getMembership(userId, discordGid);
      if (!myMembership || myMembership.rank !== 'owner') {
        await i.editReply({ embeds: [new EmbedBuilder().setColor(COLORS.warning).setDescription('❌ Chỉ **Owner** guild mới có thể trả cổ tức.')] });
        return;
      }
      const myClan = getClan(myMembership.clan_id);
      if (!myClan) return;

      const perShare = i.options.getInteger('per_share', true);
      const myStock  = ensureStock(myClan);
      const outstanding = myStock.total_shares - myStock.available_shares;
      const totalPayout  = perShare * outstanding;

      if (myClan.treasury < totalPayout) {
        await i.editReply({ embeds: [new EmbedBuilder().setColor(COLORS.warning).setDescription(`❌ Kho guild cần **${totalPayout.toLocaleString()}g** nhưng chỉ có **${myClan.treasury.toLocaleString()}g**.`)] });
        return;
      }

      const holders = db.prepare('SELECT user_id, shares FROM stock_holdings WHERE discord_gid=? AND clan_id=? AND shares>0')
        .all(discordGid, myClan.clan_id) as { user_id: string; shares: number }[];

      db.prepare('UPDATE clans SET treasury=treasury-? WHERE clan_id=?').run(totalPayout, myClan.clan_id);
      for (const h of holders) {
        const payout = perShare * h.shares;
        db.prepare('UPDATE players SET gold=gold+? WHERE user_id=? AND guild_id=?').run(payout, h.user_id, discordGid);
      }

      await i.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xffaa00)
            .setTitle('💰 Cổ Tức Đã Trả!')
            .setDescription(
              `Guild **${myClan.name}** đã trả cổ tức:\n` +
              `**${perShare}g**/cổ × ${outstanding} cổ lưu hành = **${totalPayout.toLocaleString()}g**\n` +
              `Chia cho **${holders.length}** cổ đông.`
            ),
        ],
      });
      return;
    }
  }

  // ══════════════════════════════════════════════════════════════════════
  // WAR subcommand group
  // ══════════════════════════════════════════════════════════════════════
  if (group === 'war') {
    const myMembership = getMembership(userId, discordGid);
    if (!myMembership) {
      await i.editReply({ embeds: [new EmbedBuilder().setColor(COLORS.warning).setDescription('❌ Bạn chưa ở trong guild nào!')] });
      return;
    }
    const myClan = getClan(myMembership.clan_id)!;

    if (sub === 'status') {
      const now = Math.floor(Date.now() / 1000);
      const war = db.prepare(
        'SELECT * FROM clan_wars WHERE discord_gid=? AND status=\'active\' AND (attacker_clan_id=? OR defender_clan_id=?)'
      ).get(discordGid, myClan.clan_id, myClan.clan_id) as any;

      if (!war) {
        await i.editReply({ embeds: [new EmbedBuilder().setColor(COLORS.info).setDescription(`Guild **${myClan.name}** không có chiến tranh đang diễn ra.`)] });
        return;
      }

      const isAttacker = war.attacker_clan_id === myClan.clan_id;
      const enemyClanId = isAttacker ? war.defender_clan_id : war.attacker_clan_id;
      const enemyClan   = getClan(enemyClanId)!;
      const myScore     = isAttacker ? war.attacker_score : war.defender_score;
      const enemyScore  = isAttacker ? war.defender_score : war.attacker_score;
      const remaining   = Math.max(0, war.ends_at - now);
      const hours       = Math.floor(remaining / 3600);
      const mins        = Math.floor((remaining % 3600) / 60);

      await i.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xff4444)
            .setTitle('⚔️ Chiến Tranh Guild')
            .setDescription(
              `**${myClan.name}** vs **${enemyClan.name}**\n\n` +
              `🏆 ${myClan.name}: **${myScore.toLocaleString()}** điểm\n` +
              `🏆 ${enemyClan.name}: **${enemyScore.toLocaleString()}** điểm\n\n` +
              `⏱️ Còn lại: **${hours}h ${mins}m**\n` +
              `Dùng \`/guild war attack\` để đóng góp điểm (cooldown 1h/người).`
            ),
        ],
      });
      return;
    }

    if (sub === 'declare') {
      if (myMembership.rank === 'member') {
        await i.editReply({ embeds: [new EmbedBuilder().setColor(COLORS.warning).setDescription('❌ Cần rank **Officer** hoặc **Owner** để tuyên chiến.')] });
        return;
      }
      if (myClan.treasury < 200) {
        await i.editReply({ embeds: [new EmbedBuilder().setColor(COLORS.warning).setDescription('❌ Kho guild cần ít nhất **200g** để tuyên chiến.')] });
        return;
      }

      const existing = db.prepare(
        'SELECT war_id FROM clan_wars WHERE discord_gid=? AND status=\'active\' AND (attacker_clan_id=? OR defender_clan_id=?)'
      ).get(discordGid, myClan.clan_id, myClan.clan_id);
      if (existing) {
        await i.editReply({ embeds: [new EmbedBuilder().setColor(COLORS.warning).setDescription('❌ Guild đang có chiến tranh diễn ra rồi!')] });
        return;
      }

      const targetName = i.options.getString('target', true);
      const targetClan = getClanByName(discordGid, targetName);
      if (!targetClan) {
        await i.editReply({ embeds: [new EmbedBuilder().setColor(COLORS.warning).setDescription(`❌ Không tìm thấy guild **${targetName}**.`)] });
        return;
      }
      if (targetClan.clan_id === myClan.clan_id) {
        await i.editReply({ embeds: [new EmbedBuilder().setColor(COLORS.warning).setDescription('❌ Không thể tuyên chiến với chính mình.')] });
        return;
      }

      const now    = Math.floor(Date.now() / 1000);
      const endsAt = now + 86400; // 24h
      db.prepare('UPDATE clans SET treasury=treasury-200 WHERE clan_id=?').run(myClan.clan_id);
      db.prepare(`
        INSERT INTO clan_wars (war_id, discord_gid, attacker_clan_id, defender_clan_id, ends_at)
        VALUES (?,?,?,?,?)
      `).run(uid(), discordGid, myClan.clan_id, targetClan.clan_id, endsAt);

      await i.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xff4444)
            .setTitle('⚔️ Tuyên Chiến!')
            .setDescription(
              `**${myClan.name}** đã tuyên chiến với **${targetClan.name}**!\n\n` +
              `💸 Tốn: **200g** từ kho\n` +
              `⏱️ Chiến tranh kéo dài **24 giờ**\n` +
              `Các thành viên dùng \`/guild war attack\` để đóng góp điểm (1 lần/giờ).`
            ),
        ],
      });
      return;
    }

    if (sub === 'attack') {
      const now = Math.floor(Date.now() / 1000);
      const war = db.prepare(
        'SELECT * FROM clan_wars WHERE discord_gid=? AND status=\'active\' AND (attacker_clan_id=? OR defender_clan_id=?) AND ends_at>?'
      ).get(discordGid, myClan.clan_id, myClan.clan_id, now) as any;

      if (!war) {
        await i.editReply({ embeds: [new EmbedBuilder().setColor(COLORS.warning).setDescription('❌ Không có chiến tranh đang diễn ra!')] });
        return;
      }

      // Check ended
      if (war.ends_at <= now) {
        db.prepare('UPDATE clan_wars SET status=\'ended\' WHERE war_id=?').run(war.war_id);
        await i.editReply({ embeds: [new EmbedBuilder().setColor(COLORS.info).setDescription('⚔️ Chiến tranh đã kết thúc!')] });
        return;
      }

      // Cooldown check via player_buffs table
      const cdKey   = `war_attack_${war.war_id}`;
      const cdEntry = db.prepare('SELECT expires_at FROM player_buffs WHERE user_id=? AND guild_id=? AND buff_key=?')
        .get(userId, discordGid, cdKey) as { expires_at: number } | undefined;
      if (cdEntry && cdEntry.expires_at > now) {
        const wait = Math.ceil((cdEntry.expires_at - now) / 60);
        await i.editReply({ embeds: [new EmbedBuilder().setColor(COLORS.warning).setDescription(`⏳ Bạn cần đợi **${wait} phút** nữa để tấn công lại.`)] });
        return;
      }

      const isAttacker  = war.attacker_clan_id === myClan.clan_id;
      const dmg         = player.atk + Math.floor(Math.random() * player.atk * 0.3);
      // SAFE: `scoreField` is a ternary between two hard-coded column names.
      const scoreField  = isAttacker ? 'attacker_score' : 'defender_score';

      db.prepare(`UPDATE clan_wars SET ${scoreField}=${scoreField}+? WHERE war_id=?`).run(dmg, war.war_id);
      db.prepare(`
        INSERT INTO player_buffs (user_id, guild_id, buff_key, expires_at)
        VALUES (?,?,?,?) ON CONFLICT(user_id, guild_id, buff_key) DO UPDATE SET expires_at=?
      `).run(userId, discordGid, cdKey, now + 3600, now + 3600);

      grantClanExp(myClan, 5);

      const enemyClanId = isAttacker ? war.defender_clan_id : war.attacker_clan_id;
      const enemyClan   = getClan(enemyClanId)!;
      const updatedWar  = db.prepare('SELECT * FROM clan_wars WHERE war_id=?').get(war.war_id) as any;
      const myScore     = isAttacker ? updatedWar.attacker_score : updatedWar.defender_score;
      const enemyScore  = isAttacker ? updatedWar.defender_score : updatedWar.attacker_score;

      await i.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xff8800)
            .setTitle('⚔️ Tấn Công!')
            .setDescription(
              `Bạn gây **${dmg.toLocaleString()}** điểm tổn thương cho **${enemyClan.name}**!\n\n` +
              `🏆 ${myClan.name}: **${myScore.toLocaleString()}** · ${enemyClan.name}: **${enemyScore.toLocaleString()}**\n` +
              `⏱️ Cooldown: **60 phút**`
            ),
        ],
      });

      // Auto-end war if time's up
      if (updatedWar.ends_at <= now + 1) {
        const winnerId = updatedWar.attacker_score >= updatedWar.defender_score
          ? updatedWar.attacker_clan_id : updatedWar.defender_clan_id;
        const loserId  = winnerId === updatedWar.attacker_clan_id ? updatedWar.defender_clan_id : updatedWar.attacker_clan_id;
        const loser    = getClan(loserId)!;
        const prize    = Math.floor(loser.treasury * 0.20);
        db.prepare('UPDATE clans SET treasury=treasury-? WHERE clan_id=?').run(prize, loserId);
        db.prepare('UPDATE clans SET treasury=treasury+? WHERE clan_id=?').run(prize, winnerId);
        db.prepare('UPDATE clan_wars SET status=\'ended\', winner_clan_id=? WHERE war_id=?').run(winnerId, war.war_id);
      }
      return;
    }
  }

  // ══════════════════════════════════════════════════════════════════════
  // BASIC subcommands (no group)
  // ══════════════════════════════════════════════════════════════════════
  if (sub === 'create') {
    if (getMembership(userId, discordGid)) {
      await i.editReply({ embeds: [new EmbedBuilder().setColor(COLORS.warning).setDescription('❌ Bạn đã ở trong một guild rồi! Hãy `/guild leave` trước.')] });
      return;
    }
    if (player.gold < 1000) {
      await i.editReply({ embeds: [new EmbedBuilder().setColor(COLORS.warning).setDescription('❌ Tạo guild cần **1.000 gold**.')] });
      return;
    }

    const name = i.options.getString('name', true).trim().slice(0, 24);
    const tag  = i.options.getString('tag', true).trim().toUpperCase().slice(0, 5);

    if (name.length < 2 || tag.length < 2) {
      await i.editReply({ embeds: [new EmbedBuilder().setColor(COLORS.warning).setDescription('❌ Tên ít nhất 2 ký tự, tag ít nhất 2 ký tự.')] });
      return;
    }

    if (getClanByName(discordGid, name)) {
      await i.editReply({ embeds: [new EmbedBuilder().setColor(COLORS.warning).setDescription(`❌ Đã có guild tên **${name}** trên server này.`)] });
      return;
    }

    const clanId = uid();
    try {
      db.prepare('INSERT INTO clans (clan_id, discord_gid, name, tag, owner_id) VALUES (?,?,?,?,?)')
        .run(clanId, discordGid, name, tag, userId);
    } catch {
      await i.editReply({ embeds: [new EmbedBuilder().setColor(COLORS.warning).setDescription(`❌ Tag **[${tag}]** đã được dùng. Hãy chọn tag khác.`)] });
      return;
    }

    db.prepare('INSERT INTO clan_members (clan_id, user_id, discord_gid, rank) VALUES (?,?,?,\'owner\')')
      .run(clanId, userId, discordGid);
    db.prepare('UPDATE players SET gold=gold-1000 WHERE user_id=? AND guild_id=?').run(userId, discordGid);

    // Init stock market
    const newClan = getClan(clanId)!;
    ensureStock(newClan);

    await i.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(COLORS.gold)
          .setTitle('🏰 Guild Đã Tạo!')
          .setDescription(
            `**[${tag}] ${name}** đã chính thức thành lập!\n\n` +
            `👑 Owner: <@${userId}>\n` +
            `📈 **200 cổ phiếu** dành cho owner · **800 cổ** trên thị trường (giá khởi điểm: **10g**)\n\n` +
            `*Mời thành viên bằng \`/guild invite\` · Tăng giá trị guild bằng cách nộp gold vào kho!*`
          ),
      ],
    });
    return;
  }

  if (sub === 'info') {
    const nameArg    = i.options.getString('name');
    let clan: ClanRow | undefined;

    if (nameArg) {
      clan = getClanByName(discordGid, nameArg);
    } else {
      const m = getMembership(userId, discordGid);
      if (m) clan = getClan(m.clan_id);
    }

    if (!clan) {
      await i.editReply({ embeds: [new EmbedBuilder().setColor(COLORS.warning).setDescription(nameArg ? `❌ Không tìm thấy guild **${nameArg}**.` : '❌ Bạn chưa ở trong guild nào.')] });
      return;
    }

    const memberCount = getMemberCount(clan.clan_id);
    const stock       = ensureStock(clan);
    const outstanding = stock.total_shares - stock.available_shares;
    const mktCap      = outstanding * stock.price;
    const needed      = clanLevelExp(clan.level);

    const now = Math.floor(Date.now() / 1000);
    const activeBuffs = db.prepare('SELECT buff_type, value, expires_at FROM clan_buffs WHERE clan_id=? AND expires_at>?')
      .all(clan.clan_id, now) as { buff_type: string; value: number; expires_at: number }[];

    const buffLines = activeBuffs.length > 0
      ? activeBuffs.map(b => {
          const cfg = BUFF_CONFIG[b.buff_type];
          const rem = Math.ceil((b.expires_at - now) / 3600);
          return `${cfg?.icon ?? '✨'} ${cfg?.label ?? b.buff_type} · còn **${rem}h**`;
        }).join('\n')
      : '*Không có buff đang hoạt động*';

    await i.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(COLORS.gold)
          .setTitle(`🏰 ${clan.name} [${clan.tag}]`)
          .addFields(
            { name: '📊 Thông Tin', value: `Lv.**${clan.level}** · EXP: ${clan.exp}/${needed}\n👥 **${memberCount}** thành viên\n🏦 Kho: **${clan.treasury.toLocaleString()}g**`, inline: true },
            { name: '📈 Chứng Khoán', value: `💵 Giá: **${stock.price}g**/cổ\n📊 Lưu hành: ${outstanding}/${stock.total_shares}\n🏦 Vốn hoá: **${mktCap.toLocaleString()}g**`, inline: true },
            { name: '✨ Buff Đang Hoạt Động', value: buffLines, inline: false },
          )
          .setFooter({ text: `Thành lập: ${new Date(clan.created_at * 1000).toLocaleDateString('vi-VN')}` }),
      ],
    });
    return;
  }

  if (sub === 'join') {
    if (getMembership(userId, discordGid)) {
      await i.editReply({ embeds: [new EmbedBuilder().setColor(COLORS.warning).setDescription('❌ Bạn đã ở trong một guild rồi!')] });
      return;
    }
    const targetName = i.options.getString('name', true);
    const targetClan = getClanByName(discordGid, targetName);
    if (!targetClan) {
      await i.editReply({ embeds: [new EmbedBuilder().setColor(COLORS.warning).setDescription(`❌ Không tìm thấy guild **${targetName}**.`)] });
      return;
    }
    if (getMemberCount(targetClan.clan_id) >= 30) {
      await i.editReply({ embeds: [new EmbedBuilder().setColor(COLORS.warning).setDescription(`❌ Guild **${targetClan.name}** đã đầy (tối đa 30 thành viên).`)] });
      return;
    }

    db.prepare('INSERT INTO clan_members (clan_id, user_id, discord_gid) VALUES (?,?,?)').run(targetClan.clan_id, userId, discordGid);
    grantClanExp(targetClan, 10);
    refreshPrice(targetClan);

    await i.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(COLORS.success ?? 0x00cc66)
          .setDescription(`✅ Bạn đã gia nhập guild **[${targetClan.tag}] ${targetClan.name}**!`),
      ],
    });
    return;
  }

  if (sub === 'leave') {
    const myMembership = getMembership(userId, discordGid);
    if (!myMembership) {
      await i.editReply({ embeds: [new EmbedBuilder().setColor(COLORS.warning).setDescription('❌ Bạn chưa ở trong guild nào!')] });
      return;
    }
    if (myMembership.rank === 'owner') {
      await i.editReply({ embeds: [new EmbedBuilder().setColor(COLORS.warning).setDescription('❌ Owner không thể rời guild. Hãy chuyển quyền Owner trước hoặc giải tán guild.')] });
      return;
    }

    const clan = getClan(myMembership.clan_id)!;
    db.prepare('DELETE FROM clan_members WHERE clan_id=? AND user_id=?').run(myMembership.clan_id, userId);
    refreshPrice(clan);

    await i.editReply({ embeds: [new EmbedBuilder().setColor(COLORS.info).setDescription(`✅ Bạn đã rời khỏi guild **${clan.name}**.`)] });
    return;
  }

  if (sub === 'invite') {
    const myMembership = getMembership(userId, discordGid);
    if (!myMembership || myMembership.rank === 'member') {
      await i.editReply({ embeds: [new EmbedBuilder().setColor(COLORS.warning).setDescription('❌ Cần rank **Officer** hoặc **Owner** để mời thành viên.')] });
      return;
    }
    const myClan      = getClan(myMembership.clan_id)!;
    const targetUser  = i.options.getUser('user', true);
    if (targetUser.id === userId) {
      await i.editReply({ embeds: [new EmbedBuilder().setColor(COLORS.warning).setDescription('❌ Không thể tự mời mình.')] });
      return;
    }
    if (getMembership(targetUser.id, discordGid)) {
      await i.editReply({ embeds: [new EmbedBuilder().setColor(COLORS.warning).setDescription(`❌ <@${targetUser.id}> đã ở trong một guild rồi.`)] });
      return;
    }
    if (!getPlayer(targetUser.id, discordGid)) {
      await i.editReply({ embeds: [new EmbedBuilder().setColor(COLORS.warning).setDescription(`❌ <@${targetUser.id}> chưa có nhân vật.`)] });
      return;
    }
    if (getMemberCount(myClan.clan_id) >= 30) {
      await i.editReply({ embeds: [new EmbedBuilder().setColor(COLORS.warning).setDescription('❌ Guild đã đầy (tối đa 30 thành viên).')] });
      return;
    }

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId(`guild_invite_accept_${userId}_${targetUser.id}`).setLabel('✅ Chấp nhận').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`guild_invite_decline_${userId}_${targetUser.id}`).setLabel('❌ Từ chối').setStyle(ButtonStyle.Secondary),
    );
    const msg = await i.editReply({
      content: `<@${targetUser.id}>`,
      embeds: [
        new EmbedBuilder()
          .setColor(COLORS.gold)
          .setTitle('📨 Lời Mời Gia Nhập Guild')
          .setDescription(`**[${myClan.tag}] ${myClan.name}** mời bạn gia nhập!\n\nLv.**${myClan.level}** · Kho: **${myClan.treasury.toLocaleString()}g** · ${getMemberCount(myClan.clan_id)} thành viên`),
      ],
      components: [row],
    });

    const btn = await msg.awaitMessageComponent({
      componentType: ComponentType.Button,
      filter: onlyUser(targetUser.id),
      time: 60_000,
    }).catch(() => null);

    if (!btn || btn.customId.includes('decline')) {
      await i.editReply({ content: '', components: [] });
      return;
    }

    await btn.deferUpdate();
    if (getMembership(targetUser.id, discordGid)) {
      await btn.editReply({ content: '', embeds: [new EmbedBuilder().setColor(COLORS.warning).setDescription('❌ Người này đã ở trong guild khác rồi.')], components: [] });
      return;
    }
    db.prepare('INSERT INTO clan_members (clan_id, user_id, discord_gid) VALUES (?,?,?)').run(myClan.clan_id, targetUser.id, discordGid);
    grantClanExp(myClan, 10);
    refreshPrice(myClan);

    await btn.editReply({
      content: '',
      embeds: [new EmbedBuilder().setColor(COLORS.success ?? 0x00cc66).setDescription(`✅ <@${targetUser.id}> đã gia nhập **${myClan.name}**!`)],
      components: [],
    });
    return;
  }

  if (sub === 'kick') {
    const myMembership = getMembership(userId, discordGid);
    if (!myMembership || myMembership.rank === 'member') {
      await i.editReply({ embeds: [new EmbedBuilder().setColor(COLORS.warning).setDescription('❌ Cần rank **Officer** hoặc **Owner**.')] });
      return;
    }
    const targetUser   = i.options.getUser('user', true);
    const targetMembership = db.prepare('SELECT * FROM clan_members WHERE clan_id=? AND user_id=?')
      .get(myMembership.clan_id, targetUser.id) as unknown as MemberRow | undefined;

    if (!targetMembership) {
      await i.editReply({ embeds: [new EmbedBuilder().setColor(COLORS.warning).setDescription(`❌ <@${targetUser.id}> không phải thành viên guild của bạn.`)] });
      return;
    }
    if (targetMembership.rank === 'owner') {
      await i.editReply({ embeds: [new EmbedBuilder().setColor(COLORS.warning).setDescription('❌ Không thể đuổi Owner.')] });
      return;
    }
    if (myMembership.rank === 'officer' && targetMembership.rank === 'officer') {
      await i.editReply({ embeds: [new EmbedBuilder().setColor(COLORS.warning).setDescription('❌ Officer không thể đuổi Officer khác.')] });
      return;
    }

    db.prepare('DELETE FROM clan_members WHERE clan_id=? AND user_id=?').run(myMembership.clan_id, targetUser.id);
    const myClan = getClan(myMembership.clan_id)!;
    refreshPrice(myClan);
    await i.editReply({ embeds: [new EmbedBuilder().setColor(COLORS.info).setDescription(`✅ Đã đuổi <@${targetUser.id}> khỏi guild **${myClan.name}**.`)] });
    return;
  }

  if (sub === 'promote' || sub === 'demote') {
    const myMembership = getMembership(userId, discordGid);
    if (!myMembership || myMembership.rank !== 'owner') {
      await i.editReply({ embeds: [new EmbedBuilder().setColor(COLORS.warning).setDescription('❌ Chỉ **Owner** mới có thể thăng/hạ chức.')] });
      return;
    }
    const targetUser  = i.options.getUser('user', true);
    const targetM     = db.prepare('SELECT * FROM clan_members WHERE clan_id=? AND user_id=?')
      .get(myMembership.clan_id, targetUser.id) as unknown as MemberRow | undefined;
    if (!targetM) {
      await i.editReply({ embeds: [new EmbedBuilder().setColor(COLORS.warning).setDescription(`❌ <@${targetUser.id}> không phải thành viên guild.`)] });
      return;
    }
    if (sub === 'promote') {
      if (targetM.rank === 'officer' || targetM.rank === 'owner') {
        await i.editReply({ embeds: [new EmbedBuilder().setColor(COLORS.warning).setDescription('❌ Đã là Officer/Owner rồi.')] });
        return;
      }
      db.prepare('UPDATE clan_members SET rank=\'officer\' WHERE clan_id=? AND user_id=?').run(myMembership.clan_id, targetUser.id);
      await i.editReply({ embeds: [new EmbedBuilder().setColor(COLORS.gold).setDescription(`⬆️ <@${targetUser.id}> đã được thăng lên **Officer**!`)] });
    } else {
      if (targetM.rank !== 'officer') {
        await i.editReply({ embeds: [new EmbedBuilder().setColor(COLORS.warning).setDescription('❌ Không phải Officer.')] });
        return;
      }
      db.prepare('UPDATE clan_members SET rank=\'member\' WHERE clan_id=? AND user_id=?').run(myMembership.clan_id, targetUser.id);
      await i.editReply({ embeds: [new EmbedBuilder().setColor(COLORS.info).setDescription(`⬇️ <@${targetUser.id}> đã bị hạ xuống **Member**.`)] });
    }
    return;
  }

  if (sub === 'members') {
    const myMembership = getMembership(userId, discordGid);
    if (!myMembership) {
      await i.editReply({ embeds: [new EmbedBuilder().setColor(COLORS.warning).setDescription('❌ Bạn chưa ở trong guild nào!')] });
      return;
    }
    const myClan  = getClan(myMembership.clan_id)!;
    const members = db.prepare('SELECT * FROM clan_members WHERE clan_id=? ORDER BY CASE rank WHEN \'owner\' THEN 0 WHEN \'officer\' THEN 1 ELSE 2 END, contribution DESC')
      .all(myClan.clan_id) as unknown as MemberRow[];

    const lines = members.map(m => {
      const badge = m.rank === 'owner' ? '👑' : m.rank === 'officer' ? '⚔️' : '👤';
      return `${badge} <@${m.user_id}> · +${m.contribution.toLocaleString()}g đóng góp`;
    }).join('\n');

    await i.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(COLORS.gold)
          .setTitle(`🏰 ${myClan.name} — Thành Viên (${members.length}/30)`)
          .setDescription(lines || '*Không có thành viên*')
          .setFooter({ text: '👑 Owner · ⚔️ Officer · 👤 Member' }),
      ],
    });
    return;
  }

  if (sub === 'deposit') {
    const myMembership = getMembership(userId, discordGid);
    if (!myMembership) {
      await i.editReply({ embeds: [new EmbedBuilder().setColor(COLORS.warning).setDescription('❌ Bạn chưa ở trong guild nào!')] });
      return;
    }
    const amount = i.options.getInteger('amount', true);
    if (player.gold < amount) {
      await i.editReply({ embeds: [new EmbedBuilder().setColor(COLORS.warning).setDescription(`❌ Bạn chỉ có **${player.gold.toLocaleString()}g**.`)] });
      return;
    }

    db.prepare('UPDATE players SET gold=gold-? WHERE user_id=? AND guild_id=?').run(amount, userId, discordGid);
    db.prepare('UPDATE clans SET treasury=treasury+? WHERE clan_id=?').run(amount, myMembership.clan_id);
    db.prepare('UPDATE clan_members SET contribution=contribution+? WHERE clan_id=? AND user_id=?').run(amount, myMembership.clan_id, userId);
    const myClan = getClan(myMembership.clan_id)!;
    grantClanExp(myClan, Math.floor(amount / 50));
    refreshPrice(myClan);

    await i.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(COLORS.gold)
          .setDescription(`🏦 Đã nộp **${amount.toLocaleString()}g** vào kho guild **${myClan.name}**!\nKho hiện tại: **${(myClan.treasury + amount).toLocaleString()}g**`),
      ],
    });
    return;
  }

  if (sub === 'buff') {
    const myMembership = getMembership(userId, discordGid);
    if (!myMembership || myMembership.rank === 'member') {
      await i.editReply({ embeds: [new EmbedBuilder().setColor(COLORS.warning).setDescription('❌ Cần rank **Officer** hoặc **Owner** để kích hoạt buff.')] });
      return;
    }
    const buffType = i.options.getString('type', true);
    const cfg      = BUFF_CONFIG[buffType];
    const myClan   = getClan(myMembership.clan_id)!;

    if (myClan.treasury < cfg.cost) {
      await i.editReply({ embeds: [new EmbedBuilder().setColor(COLORS.warning).setDescription(`❌ Kho cần **${cfg.cost.toLocaleString()}g** để kích hoạt. Hiện có: **${myClan.treasury.toLocaleString()}g**.`)] });
      return;
    }

    const now = Math.floor(Date.now() / 1000);
    const existing = db.prepare('SELECT expires_at FROM clan_buffs WHERE clan_id=? AND buff_type=? AND expires_at>?')
      .get(myClan.clan_id, buffType, now) as { expires_at: number } | undefined;
    if (existing) {
      const rem = Math.ceil((existing.expires_at - now) / 3600);
      await i.editReply({ embeds: [new EmbedBuilder().setColor(COLORS.warning).setDescription(`❌ Buff **${cfg.label}** đang hoạt động, còn **${rem}h**.`)] });
      return;
    }

    db.prepare('UPDATE clans SET treasury=treasury-? WHERE clan_id=?').run(cfg.cost, myClan.clan_id);
    db.prepare(`
      INSERT INTO clan_buffs (clan_id, buff_type, value, expires_at)
      VALUES (?,?,?,?) ON CONFLICT(clan_id, buff_type) DO UPDATE SET value=?, expires_at=?
    `).run(myClan.clan_id, buffType, cfg.value, now + 86400, cfg.value, now + 86400);

    await i.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x00cc99)
          .setTitle(`${cfg.icon} Buff Đã Kích Hoạt!`)
          .setDescription(
            `**${cfg.label}** cho toàn bộ thành viên **${myClan.name}**!\n` +
            `💸 Tốn: **${cfg.cost.toLocaleString()}g** từ kho\n` +
            `⏱️ Hiệu lực: **24 giờ**`
          ),
      ],
    });
    return;
  }
}

// Text-prefix aliases (auto-loaded by registry.ts)
export const aliases = ['clan','gc'];
