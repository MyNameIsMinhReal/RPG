import {
  SlashCommandBuilder, ChatInputCommandInteraction,
  EmbedBuilder, PermissionFlagsBits
} from 'discord.js';
import type { PrefixSpec } from './prefixOptions';
import { getPlayer, updatePlayerHpMp, killPlayer, applyPassiveStats } from '../systems/player';
import { COLORS } from '../utils/embeds';
import db from '../database/index';

const ATTACK_COOLDOWN_MS = 5 * 60_000;

interface BossState {
  guild_id: string; boss_id: string; boss_name: string; boss_icon: string;
  current_hp: number; max_hp: number; spawned_at: number; expires_at: number; is_alive: number;
}

interface DamageRow { guild_id: string; user_id: string; damage: number; attacks: number; last_attack: number; }

const WORLD_BOSSES = [
  { id: 'ancient_dragon',  name: 'Rồng Cổ Đại',      icon: '🐉', maxHp: 50000, atk: 80,  def: 20 },
  { id: 'chaos_titan',     name: 'Titan Hỗn Độn',     icon: '👹', maxHp: 40000, atk: 70,  def: 15 },
  { id: 'void_reaper',     name: 'Thần Chết Hư Không', icon: '💀', maxHp: 35000, atk: 90,  def: 10 },
];

function getBoss(guildId: string): BossState | undefined {
  const boss = db.prepare('SELECT * FROM world_boss_state WHERE guild_id=? AND is_alive=1').get(guildId) as BossState | undefined;
  if (boss && boss.expires_at < Math.floor(Date.now() / 1000)) {
    db.prepare('UPDATE world_boss_state SET is_alive=0 WHERE guild_id=?').run(guildId);
    return undefined;
  }
  return boss;
}

function getDamageRow(guildId: string, userId: string): DamageRow | undefined {
  return db.prepare('SELECT * FROM world_boss_damage WHERE guild_id=? AND user_id=?').get(guildId, userId) as any;
}

function upsertDamage(guildId: string, userId: string, dmg: number): void {
  db.prepare(`
    INSERT INTO world_boss_damage (guild_id, user_id, damage, attacks, last_attack)
    VALUES (?, ?, ?, 1, ?)
    ON CONFLICT(guild_id, user_id) DO UPDATE SET
      damage = damage + excluded.damage,
      attacks = attacks + 1,
      last_attack = excluded.last_attack
  `).run(guildId, userId, dmg, Date.now());
}

function buildHpBar(current: number, max: number, len = 20): string {
  if (!Number.isFinite(max) || max <= 0) max = 1;
  const ratio  = Math.max(0, Math.min(1, current / max));
  const filled = Math.max(0, Math.min(len, Math.round(ratio * len)));
  return '█'.repeat(filled) + '░'.repeat(len - filled);
}

export const data = new SlashCommandBuilder()
  .setName('worldboss')
  .setDescription('World Boss — cùng nhau tiêu diệt!')
  .addSubcommand(s => s.setName('status').setDescription('Xem HP và bảng sát thương'))
  .addSubcommand(s => s.setName('attack').setDescription('Tấn công World Boss (cooldown 5 phút)'))
  .addSubcommand(s => s
    .setName('spawn')
    .setDescription('[Admin] Triệu hồi World Boss mới')
    .addStringOption(o => o.setName('boss').setDescription('Boss ID').setRequired(false)
      .addChoices(
        { name: '🐉 Rồng Cổ Đại', value: 'ancient_dragon' },
        { name: '👹 Titan Hỗn Độn', value: 'chaos_titan' },
        { name: '💀 Thần Chết Hư Không', value: 'void_reaper' }
      ))
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();
  const sub = interaction.options.getSubcommand();
  const { id: userId } = interaction.user;
  const guildId = interaction.guildId!;

  // ── spawn ────────────────────────────────────────────────────────
  if (sub === 'spawn') {
    const member = await interaction.guild?.members.fetch(userId).catch(() => null);
    if (!member?.permissions.has(PermissionFlagsBits.ManageGuild)) {
      await interaction.editReply({ embeds: [new EmbedBuilder().setColor(COLORS.danger).setDescription('❌ Cần quyền **Manage Server** để spawn boss.')] });
      return;
    }

    const existing = getBoss(guildId);
    if (existing) {
      await interaction.editReply({ embeds: [new EmbedBuilder().setColor(COLORS.warning).setDescription(`⚠️ World Boss **${existing.boss_icon} ${existing.boss_name}** đang còn sống!`)] });
      return;
    }

    const bossId = interaction.options.getString('boss') ?? WORLD_BOSSES[Math.floor(Math.random() * WORLD_BOSSES.length)].id;
    const bossData = WORLD_BOSSES.find(b => b.id === bossId) ?? WORLD_BOSSES[0];
    const expiresAt = Date.now() + 24 * 3600_000;

    db.prepare(`
      INSERT OR REPLACE INTO world_boss_state (guild_id, boss_id, boss_name, boss_icon, current_hp, max_hp, spawned_at, expires_at, is_alive)
      VALUES (?, ?, ?, ?, ?, ?, unixepoch(), ?, 1)
    `).run(guildId, bossData.id, bossData.name, bossData.icon, bossData.maxHp, bossData.maxHp, Math.floor(expiresAt / 1000));

    db.prepare('DELETE FROM world_boss_damage WHERE guild_id=?').run(guildId);

    await interaction.editReply({
      embeds: [new EmbedBuilder()
        .setColor(COLORS.danger)
        .setTitle(`${bossData.icon} World Boss Xuất Hiện!`)
        .setDescription(
          `> **${bossData.name}** đã giáng xuống!\n\n` +
          `❤️ **${bossData.maxHp.toLocaleString()} HP**\n` +
          `\`${buildHpBar(bossData.maxHp, bossData.maxHp)}\`\n\n` +
          `Dùng \`/worldboss attack\` để tấn công!\n*Boss tự biến mất sau 24 giờ.*`
        )]
    });
    return;
  }

  const boss = getBoss(guildId);

  // ── status ───────────────────────────────────────────────────────
  if (sub === 'status') {
    if (!boss) {
      await interaction.editReply({ embeds: [new EmbedBuilder().setColor(COLORS.dark).setDescription('💤 Không có World Boss nào đang hoạt động.\n\n*Admin dùng `/worldboss spawn` để triệu hồi.*')] });
      return;
    }

    const topRows = db.prepare(`
      SELECT user_id, damage FROM world_boss_damage WHERE guild_id=? ORDER BY damage DESC LIMIT 5
    `).all(guildId) as any[];

    let leaderboard = '';
    for (let i = 0; i < topRows.length; i++) {
      const member = interaction.guild?.members.cache.get(topRows[i].user_id);
      const name = member?.displayName ?? `<@${topRows[i].user_id}>`;
      const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
      leaderboard += `${medals[i]} **${name}** — ${topRows[i].damage.toLocaleString()} DMG\n`;
    }

    const pct = Math.round((boss.current_hp / boss.max_hp) * 100);

    await interaction.editReply({
      embeds: [new EmbedBuilder()
        .setColor(pct < 25 ? COLORS.danger : pct < 60 ? COLORS.warning : COLORS.success)
        .setTitle(`${boss.boss_icon} ${boss.boss_name}`)
        .setDescription(
          `❤️ **${boss.current_hp.toLocaleString()} / ${boss.max_hp.toLocaleString()} HP** (${pct}%)\n` +
          `\`${buildHpBar(boss.current_hp, boss.max_hp)}\``
        )
        .addFields({ name: '🏆 Top Damage', value: leaderboard || '*Chưa ai tấn công*', inline: false })
        .setFooter({ text: '/worldboss attack để tham chiến · cooldown 5 phút' })]
    });
    return;
  }

  // ── attack ───────────────────────────────────────────────────────
  if (!boss) {
    await interaction.editReply({ embeds: [new EmbedBuilder().setColor(COLORS.dark).setDescription('💤 Không có World Boss nào đang hoạt động.')] });
    return;
  }

  const player = getPlayer(userId, guildId);
  if (!player?.alive) {
    await interaction.editReply({ embeds: [new EmbedBuilder().setColor(COLORS.danger).setDescription('❌ Bạn đã chết. Dùng `/start` để hồi sinh.')] });
    return;
  }

  const dmgRow = getDamageRow(guildId, userId);
  const lastAttack = dmgRow?.last_attack ?? 0;
  const remaining = ATTACK_COOLDOWN_MS - (Date.now() - lastAttack);

  if (remaining > 0) {
    const secs = Math.ceil(remaining / 1000);
    const mins = Math.floor(secs / 60), rem = secs % 60;
    await interaction.editReply({
      embeds: [new EmbedBuilder().setColor(COLORS.warning)
        .setDescription(`⏳ Cần thêm **${mins}m ${rem}s** để tấn công lại.`)]
    });
    return;
  }

  const enhanced = applyPassiveStats(player);
  const bossData = WORLD_BOSSES.find(b => b.id === boss.boss_id);
  const bossAtk = bossData?.atk ?? 60;
  const bossDef = bossData?.def ?? 10;

  // Player attacks boss
  const rawPlayerDmg = Math.max(1, enhanced.atk - bossDef + Math.floor(Math.random() * 10) - 4);
  const playerDmg = rawPlayerDmg + Math.floor(rawPlayerDmg * 0.1 * Math.random()); // small variance

  // Boss retaliates
  const rawBossDmg = Math.max(1, bossAtk - enhanced.def + Math.floor(Math.random() * 15) - 7);
  const bossDmgDealt = rawBossDmg;

  const newBossHp = Math.max(0, boss.current_hp - playerDmg);
  db.prepare('UPDATE world_boss_state SET current_hp=? WHERE guild_id=?').run(newBossHp, guildId);
  upsertDamage(guildId, userId, playerDmg);

  const newPlayerHp = Math.max(0, player.hp - bossDmgDealt);
  updatePlayerHpMp(userId, guildId, newPlayerHp, player.mp);

  const killed = newBossHp <= 0;
  if (killed) {
    db.prepare('UPDATE world_boss_state SET is_alive=0 WHERE guild_id=?').run(guildId);
  }

  const pct = Math.round((newBossHp / boss.max_hp) * 100);

  const embed = new EmbedBuilder()
    .setColor(killed ? COLORS.gold : COLORS.danger)
    .setTitle(killed ? `${boss.boss_icon} World Boss Bị Tiêu Diệt!` : `${boss.boss_icon} Tấn Công World Boss`)
    .setDescription(
      `⚔️ **${player.name}** gây **${playerDmg} DMG**!\n` +
      `💥 Boss phản đòn: **${bossDmgDealt} DMG**\n\n` +
      (killed
        ? `✨ **${boss.boss_name}** đã bị hạ gục!\n> Phần thưởng sẽ được trao cho top damage!`
        : `❤️ Boss: **${newBossHp.toLocaleString()} / ${boss.max_hp.toLocaleString()} HP** (${pct}%)\n` +
          `\`${buildHpBar(newBossHp, boss.max_hp)}\``) +
      `\n\n👤 HP của bạn: **${newPlayerHp} / ${player.max_hp}**`
    )
    .setFooter({ text: 'cooldown 5 phút · /worldboss status để xem bảng xếp hạng' });

  await interaction.editReply({ embeds: [embed] });

  // Rewards on kill
  if (killed) {
    const topWinners = db.prepare(`
      SELECT user_id, damage FROM world_boss_damage WHERE guild_id=? ORDER BY damage DESC LIMIT 3
    `).all(guildId) as any[];

    const rewards = [
      { gold: 500, items: ['void_shard', 'void_shard', 'mana_crystal'] },
      { gold: 300, items: ['void_shard', 'mana_crystal'] },
      { gold: 150, items: ['mana_crystal'] },
    ];

    for (let i = 0; i < topWinners.length; i++) {
      const w = topWinners[i];
      const r = rewards[i] ?? { gold: 80, items: [] };
      db.prepare('UPDATE players SET gold=gold+? WHERE user_id=? AND guild_id=?').run(r.gold, w.user_id, guildId);
      for (const item of r.items) {
        db.prepare(`
          INSERT INTO inventory (user_id, guild_id, item_id, quantity) VALUES (?, ?, ?, 1)
          ON CONFLICT(user_id, guild_id, item_id) DO UPDATE SET quantity=quantity+1
        `).run(w.user_id, guildId, item);
      }
    }
  }

  if (newPlayerHp <= 0) {
    killPlayer(userId, guildId);
  }
}

// Text-prefix aliases (auto-loaded by registry.ts)
export const aliases = ['wb','boss'];

export const prefixSpec: PrefixSpec = { defaultSub: 'status' };
