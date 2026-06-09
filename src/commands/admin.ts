import {
  SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder
} from 'discord.js';
import { clearPlayerBossProgress, hasPlayerClearedBoss, setFlag } from '../systems/world';
import {
  getPlayer, revivePlayer, applyPassiveStats,
  grantGold, grantExp, addItem, updatePlayerHpMp
} from '../systems/player';
import { getItem } from '../data/items';
import { getMaterial } from '../data/materials';
import { getEquipment } from '../data/equipment';
import { expNext } from '../utils/format';
import { ZONES } from '../data/zones';
import db from '../database/index';

const BOSS_IDS = Object.values(ZONES)
  .filter(z => z.bossId)
  .map(z => ({ id: z.bossId!, zone: z.name }));

const ALLOWED_IDS = new Set(
  (process.env.BOT_ADMIN_IDS ?? '').split(',').map(s => s.trim()).filter(Boolean)
);

function isAllowed(userId: string): boolean {
  return ALLOWED_IDS.has(userId);
}

export const data = new SlashCommandBuilder()
  .setName('admin')
  .setDescription('Công cụ quản trị bot')
  .addSubcommand(sub => sub
    .setName('resetboss')
    .setDescription('Xoá tiến trình boss của người chơi (cho phép đánh lại boss gate)')
    .addUserOption(opt => opt.setName('user').setDescription('Người chơi cần reset').setRequired(true))
    .addStringOption(opt => opt
      .setName('boss')
      .setDescription('Boss cụ thể cần xoá (bỏ trống = xoá tất cả)')
      .setRequired(false)
      .addChoices(...BOSS_IDS.map(b => ({ name: `${b.zone} — ${b.id}`, value: b.id })))
    )
  )
  .addSubcommand(sub => sub
    .setName('revive')
    .setDescription('Hồi sinh người chơi đã chết (hồi 50% HP/MP, giữ nguyên stats)')
    .addUserOption(opt => opt.setName('user').setDescription('Người chơi cần hồi sinh').setRequired(true))
    .addStringOption(opt => opt.setName('guild_id').setDescription('Guild ID khác (cross-server)').setRequired(false))
  )
  .addSubcommand(sub => sub
    .setName('give')
    .setDescription('Cho gold / EXP / item cho người chơi')
    .addUserOption(opt => opt.setName('user').setDescription('Người chơi').setRequired(true))
    .addStringOption(opt => opt
      .setName('type')
      .setDescription('Loại phần thưởng')
      .setRequired(true)
      .addChoices(
        { name: '🪙 Gold', value: 'gold' },
        { name: '⭐ EXP',  value: 'exp'  },
        { name: '🎒 Item', value: 'item' },
      )
    )
    .addIntegerOption(opt => opt.setName('amount').setDescription('Số lượng').setRequired(true).setMinValue(1))
    .addStringOption(opt => opt.setName('item_id').setDescription('ID item (chỉ dùng khi type = item)').setRequired(false))
    .addStringOption(opt => opt.setName('guild_id').setDescription('Guild ID khác (cross-server)').setRequired(false))
  )
  .addSubcommand(sub => sub
    .setName('set')
    .setDescription('Đặt trực tiếp chỉ số của người chơi')
    .addUserOption(opt => opt.setName('user').setDescription('Người chơi').setRequired(true))
    .addStringOption(opt => opt
      .setName('stat')
      .setDescription('Chỉ số cần thay đổi')
      .setRequired(true)
      .addChoices(
        { name: '🏅 Level',        value: 'level'  },
        { name: '🪙 Gold',         value: 'gold'   },
        { name: '❤️ HP hiện tại',  value: 'hp'     },
        { name: '❤️ Max HP (base)',value: 'max_hp' },
        { name: '💧 MP hiện tại',  value: 'mp'     },
        { name: '💧 Max MP (base)',value: 'max_mp' },
        { name: '⚔️ ATK (base)',   value: 'atk'    },
        { name: '🛡️ DEF (base)',   value: 'def'    },
      )
    )
    .addIntegerOption(opt => opt.setName('value').setDescription('Giá trị mới').setRequired(true).setMinValue(0))
    .addStringOption(opt => opt.setName('guild_id').setDescription('Guild ID khác (cross-server)').setRequired(false))
  )
  .addSubcommand(sub => sub
    .setName('forceevent')
    .setDescription('Ép event tiếp theo của người chơi khi /explore')
    .addUserOption(opt => opt.setName('user').setDescription('Người chơi').setRequired(true))
    .addStringOption(opt => opt.setName('event_id').setDescription('ID event (vd: forest_lost_relic, loot, treasure_chest...)').setRequired(true))
    .addStringOption(opt => opt.setName('guild_id').setDescription('Guild ID khác (cross-server)').setRequired(false))
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  if (!isAllowed(interaction.user.id)) {
    await interaction.editReply({ content: '❌ Bạn không có quyền dùng lệnh này.' });
    return;
  }

  const sub = interaction.options.getSubcommand();
  const guildIdOverride = interaction.options.getString('guild_id');
  const guildId = guildIdOverride?.trim() || interaction.guildId!;

  // ── revive ────────────────────────────────────────────────────────────────
  if (sub === 'revive') {
    const target = interaction.options.getUser('user', true);
    const player = getPlayer(target.id, guildId);

    if (!player) {
      await interaction.editReply({ content: `❌ <@${target.id}> chưa có nhân vật.` });
      return;
    }
    if (player.alive) {
      await interaction.editReply({ content: `ℹ️ <@${target.id}> vẫn đang sống, không cần hồi sinh.` });
      return;
    }

    revivePlayer(target.id, guildId);
    const fresh = applyPassiveStats(getPlayer(target.id, guildId)!);

    await interaction.editReply({
      embeds: [new EmbedBuilder()
        .setColor(0x57F287)
        .setTitle('✨ Hồi Sinh Thành Công')
        .addFields(
          { name: 'Người chơi', value: `<@${target.id}> (${player.name})`, inline: true },
          { name: '❤️ HP', value: `${fresh.hp}/${fresh.max_hp}`, inline: true },
          { name: '💧 MP', value: `${fresh.mp}/${fresh.max_mp}`, inline: true },
        )]
    });
    return;
  }

  // ── give ──────────────────────────────────────────────────────────────────
  if (sub === 'give') {
    const target = interaction.options.getUser('user', true);
    const type   = interaction.options.getString('type', true);
    const amount = interaction.options.getInteger('amount', true);
    const itemId = interaction.options.getString('item_id') ?? '';
    const player = getPlayer(target.id, guildId);

    if (!player) {
      await interaction.editReply({ content: `❌ <@${target.id}> chưa có nhân vật.` });
      return;
    }

    let resultLine = '';

    if (type === 'gold') {
      grantGold(target.id, guildId, amount);
      resultLine = `🪙 +**${amount.toLocaleString()} Gold**`;
    } else if (type === 'exp') {
      const lvResult = grantExp(target.id, guildId, amount);
      resultLine = `⭐ +**${amount} EXP**${lvResult.leveledUp ? ` → **Level ${lvResult.newLevel}!**` : ''}`;
    } else if (type === 'item') {
      if (!itemId) {
        await interaction.editReply({ content: '❌ Cần nhập `item_id` khi type = item.' });
        return;
      }
      const meta = getItem(itemId) ?? getMaterial(itemId) ?? getEquipment(itemId);
      if (!meta) {
        await interaction.editReply({ content: `❌ Không tìm thấy item \`${itemId}\`.` });
        return;
      }
      addItem(target.id, guildId, itemId, amount);
      resultLine = `${meta.icon} **${meta.name}** ×${amount}`;
    }

    const fresh = getPlayer(target.id, guildId)!;
    await interaction.editReply({
      embeds: [new EmbedBuilder()
        .setColor(0xF1C40F)
        .setTitle('🎁 Đã Trao Phần Thưởng')
        .addFields(
          { name: 'Người chơi', value: `<@${target.id}> (${player.name})`, inline: true },
          { name: 'Phần thưởng', value: resultLine, inline: true },
          { name: '🪙 Gold hiện tại', value: fresh.gold.toLocaleString(), inline: true },
        )]
    });
    return;
  }

  // ── set ───────────────────────────────────────────────────────────────────
  if (sub === 'set') {
    const target = interaction.options.getUser('user', true);
    const stat   = interaction.options.getString('stat', true);
    const value  = interaction.options.getInteger('value', true);
    const player = getPlayer(target.id, guildId);

    if (!player) {
      await interaction.editReply({ content: `❌ <@${target.id}> chưa có nhân vật.` });
      return;
    }

    const SAFE_COLS = new Set(['gold', 'hp', 'max_hp', 'mp', 'max_mp', 'atk', 'def']);

    if (stat === 'level') {
      const newExpNext = expNext(value);
      db.prepare('UPDATE players SET level=?, exp=0, exp_next=? WHERE user_id=? AND guild_id=?')
        .run(value, newExpNext, target.id, guildId);
    } else if (stat === 'hp') {
      const withPassive = applyPassiveStats(player);
      const clamped = Math.min(value, withPassive.max_hp);
      updatePlayerHpMp(target.id, guildId, clamped, player.mp);
    } else if (stat === 'mp') {
      const withPassive = applyPassiveStats(player);
      const clamped = Math.min(value, withPassive.max_mp);
      updatePlayerHpMp(target.id, guildId, player.hp, clamped);
    } else if (SAFE_COLS.has(stat)) {
      db.prepare(`UPDATE players SET ${stat}=? WHERE user_id=? AND guild_id=?`)
        .run(value, target.id, guildId);
    }

    const fresh = applyPassiveStats(getPlayer(target.id, guildId)!);
    const statLabels: Record<string, string> = {
      level: '🏅 Level', gold: '🪙 Gold', hp: '❤️ HP',
      max_hp: '❤️ Max HP', mp: '💧 MP', max_mp: '💧 Max MP',
      atk: '⚔️ ATK', def: '🛡️ DEF',
    };
    const displayVal = stat === 'hp'
      ? `${fresh.hp}/${fresh.max_hp}`
      : stat === 'mp'
      ? `${fresh.mp}/${fresh.max_mp}`
      : String((fresh as any)[stat] ?? value);

    await interaction.editReply({
      embeds: [new EmbedBuilder()
        .setColor(0x3498DB)
        .setTitle('✏️ Đã Cập Nhật Chỉ Số')
        .addFields(
          { name: 'Người chơi', value: `<@${target.id}> (${player.name})`, inline: true },
          { name: statLabels[stat] ?? stat, value: displayVal, inline: true },
        )]
    });
    return;
  }

  // ── resetboss ─────────────────────────────────────────────────────────────
  if (sub === 'resetboss') {
    const target = interaction.options.getUser('user', true);
    const bossId = interaction.options.getString('boss') ?? undefined;

    const cleared = clearPlayerBossProgress(guildId, target.id, bossId);
    const bossLabel = bossId ?? 'tất cả boss';
    const statusLines = bossId
      ? [`**${bossId}**: ${hasPlayerClearedBoss(guildId, target.id, bossId) ? '✅ đã clear' : '❌ chưa clear'}`]
      : BOSS_IDS.map(b => `**${b.id}**: ${hasPlayerClearedBoss(guildId, target.id, b.id) ? '✅' : '❌'}`);

    await interaction.editReply({
      embeds: [new EmbedBuilder()
        .setColor(cleared > 0 ? 0xED4245 : 0x95A5A6)
        .setTitle(cleared > 0 ? '🗑️ Đã xoá tiến trình boss' : 'ℹ️ Không có gì để xoá')
        .addFields(
          { name: 'Người chơi', value: `<@${target.id}>`, inline: true },
          { name: 'Boss', value: bossLabel, inline: true },
          { name: 'Đã xoá', value: `${cleared} bản ghi`, inline: true },
          { name: 'Trạng thái hiện tại', value: statusLines.join('\n') || '—' }
        )]
    });
  }

  // ── forceevent ────────────────────────────────────────────────────────────
  if (sub === 'forceevent') {
    const target  = interaction.options.getUser('user', true);
    const eventId = interaction.options.getString('event_id', true).trim();
    const player  = getPlayer(target.id, guildId);

    if (!player) {
      await interaction.editReply({ content: `❌ <@${target.id}> chưa có nhân vật.` });
      return;
    }

    setFlag(guildId, `forced_event_${target.id}`, eventId, 600); // hết hạn sau 10 phút
    await interaction.editReply({
      embeds: [new EmbedBuilder()
        .setColor(0x9B59B6)
        .setTitle('🎲 Đã Đặt Event Cưỡng Bức')
        .addFields(
          { name: 'Người chơi', value: `<@${target.id}> (${player.name})`, inline: true },
          { name: 'Event tiếp theo', value: `\`${eventId}\``, inline: true },
          { name: '⏳ Hết hạn', value: 'Sau 10 phút nếu chưa /explore', inline: true },
        )]
    });
  }
}
