import {
  SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, AttachmentBuilder
} from 'discord.js';
import { clearPlayerBossProgress, hasPlayerClearedBoss, setFlag, getFlag } from '../systems/world';
import {
  getPlayer, revivePlayer, applyPassiveStats,
  grantGold, grantExp, addItem, updatePlayerHpMp, getItemQty
} from '../systems/player';
import { getItem } from '../data/items';
import { getMaterial } from '../data/materials';
import { getEquipment } from '../data/equipment';
import { ENEMIES } from '../data/enemies';
import { expNext } from '../utils/format';
import { deriveBaseStats } from '../systems/statSystem';
import { ZONES } from '../data/zones';
import db from '../database/index';
import {
  GAME_ID_CATEGORY_CHOICES,
  GAME_ID_CATEGORY_LABELS,
  countRows,
  filterGameIdSections,
  formatGameIdsPreview,
  formatGameIdsText,
  getGameIdSectionsFor,
  type GameIdCategory,
} from '../utils/gameIds';
import {
  getOakEvent, getOakParticipants, hasOakPrereq,
  isOakHuntActive, getOakHuntRemaining
} from '../systems/oakEvent';
import { getBossRecommendedLevel, getBossLevelScaling } from '../systems/bossScaling';
import { getCombatByUser } from '../systems/combat';

const BOSS_IDS = Object.values(ZONES)
  .filter(z => z.bossId)
  .map(z => ({ id: z.bossId!, zone: z.name }));

type AdminBaseStat = 'atk' | 'def' | 'max_hp' | 'max_mp';

const ADMIN_BASE_STAT_META: Record<AdminBaseStat, { bonusColumn: string; legacyColumn: string; derivedKey: 'atk' | 'def' | 'maxHp' | 'maxMp'; min: number }> = {
  atk:    { bonusColumn: 'permanent_atk_bonus',    legacyColumn: 'atk',    derivedKey: 'atk',   min: 1 },
  def:    { bonusColumn: 'permanent_def_bonus',    legacyColumn: 'def',    derivedKey: 'def',   min: 0 },
  max_hp: { bonusColumn: 'permanent_max_hp_bonus', legacyColumn: 'max_hp', derivedKey: 'maxHp', min: 10 },
  max_mp: { bonusColumn: 'permanent_max_mp_bonus', legacyColumn: 'max_mp', derivedKey: 'maxMp', min: 5 },
};

function naturalBaseWithoutPermanent(player: ReturnType<typeof getPlayer>) {
  if (!player) throw new Error('missing player');
  return deriveBaseStats({
    ...player,
    permanent_atk_bonus: 0,
    permanent_def_bonus: 0,
    permanent_max_hp_bonus: 0,
    permanent_max_mp_bonus: 0,
  });
}

function setAdminBaseStat(userId: string, guildId: string, stat: AdminBaseStat, desiredValue: number): number {
  const player = getPlayer(userId, guildId);
  if (!player) return desiredValue;

  const meta = ADMIN_BASE_STAT_META[stat];
  const safeDesired = Math.max(meta.min, Math.floor(desiredValue));
  const natural = naturalBaseWithoutPermanent(player);
  const naturalValue = natural[meta.derivedKey];
  const requiredPermanentBonus = safeDesired - naturalValue;

  // SAFE: both column names come from ADMIN_BASE_STAT_META, a fixed allow-list.
  let sql = `UPDATE players SET ${meta.bonusColumn} = ?, ${meta.legacyColumn} = ?`;
  const args: Array<number | string> = [requiredPermanentBonus, safeDesired];

  if (stat === 'max_hp') {
    sql += ', hp = MIN(hp, ?)';
    args.push(safeDesired);
  } else if (stat === 'max_mp') {
    sql += ', mp = MIN(mp, ?)';
    args.push(safeDesired);
  }

  sql += ' WHERE user_id = ? AND guild_id = ?';
  args.push(userId, guildId);
  db.prepare(sql).run(...args);
  return safeDesired;
}

function formatAdminSetValue(stat: string, player: ReturnType<typeof getPlayer>, fallback: number): string {
  if (!player) return String(fallback);
  const base = deriveBaseStats(player);
  const effective = applyPassiveStats(player);
  switch (stat) {
    case 'atk': return `Base **${base.atk}** / Hiện tại **${effective.atk}**`;
    case 'def': return `Base **${base.def}** / Hiện tại **${effective.def}**`;
    case 'max_hp': return `Base **${base.maxHp}** / Hiện tại **${effective.max_hp}**`;
    case 'max_mp': return `Base **${base.maxMp}** / Hiện tại **${effective.max_mp}**`;
    case 'hp': return `**${effective.hp}/${effective.max_hp}**`;
    case 'mp': return `**${effective.mp}/${effective.max_mp}**`;
    default: return String((effective as any)[stat] ?? (player as any)[stat] ?? fallback);
  }
}

const ALLOWED_IDS = new Set(
  (process.env.BOT_ADMIN_IDS ?? '').split(',').map(s => s.trim()).filter(Boolean)
);

function isAllowed(userId: string): boolean {
  return ALLOWED_IDS.has(userId);
}

function deleteWorldFlagKeys(guildId: string, keys: string[]): number {
  if (keys.length === 0) return 0;
  const stmt = db.prepare('DELETE FROM world_state WHERE guild_id=? AND flag_key=?');
  let total = 0;
  for (const key of keys) total += stmt.run(guildId, key).changes as number;
  return total;
}

function resetActiveOakEvent(guildId: string): { events: number; participants: number } {
  const now = Math.floor(Date.now() / 1000);
  const events = db.prepare(`
    UPDATE oak_event
    SET phase='dead', current_fighter=NULL, expires_at=?
    WHERE guild_id=? AND phase!='dead'
  `).run(now, guildId).changes as number;
  const participants = db.prepare('DELETE FROM oak_participants WHERE guild_id=?')
    .run(guildId).changes as number;
  return { events, participants };
}

function resetAncientOakCooldown(guildId: string): number {
  return deleteWorldFlagKeys(guildId, [
    'boss_ancient_oak_slain',
  ]);
}

function resetAncientOakAftermath(guildId: string): number {
  return deleteWorldFlagKeys(guildId, [
    'event_ancient_oak_fall',
    'forest_drop_bonus',
  ]);
}


function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

function getWorldFlagRow(guildId: string, key: string): { flag_value: string; expires_at: number | null; created_at: number } | undefined {
  const now = Math.floor(Date.now() / 1000);
  return db.prepare(`
    SELECT flag_value, expires_at, created_at FROM world_state
    WHERE guild_id=? AND flag_key=? AND (expires_at IS NULL OR expires_at > ?)
  `).get(guildId, key, now) as { flag_value: string; expires_at: number | null; created_at: number } | undefined;
}

function okLine(ok: boolean, label: string, detail: string): string {
  return `${ok ? '✅' : '❌'} **${label}** — ${detail}`;
}

function warnLine(label: string, detail: string): string {
  return `⚠️ **${label}** — ${detail}`;
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
    .setName('ids')
    .setDescription('Xuất danh sách ID game theo nhóm để dùng cho admin/debug')
    .addStringOption(opt => opt
      .setName('category')
      .setDescription('Nhóm ID cần xem')
      .setRequired(false)
      .addChoices(...GAME_ID_CATEGORY_CHOICES)
    )
    .addStringOption(opt => opt
      .setName('search')
      .setDescription('Lọc theo ID/tên/ghi chú, ví dụ: relic, forest, dagger')
      .setRequired(false)
    )
  )
  .addSubcommand(sub => sub
    .setName('resettime')
    .setDescription('Reset cooldown/time của boss hoặc event đang mở')
    .addStringOption(opt => opt
      .setName('target')
      .setDescription('Loại time cần reset')
      .setRequired(true)
      .addChoices(
        { name: '🌳 Ancient Oak cooldown', value: 'oak_cooldown' },
        { name: '🌳 Ancient Oak event đang mở', value: 'oak_event' },
        { name: '🌳 Ancient Oak tất cả', value: 'oak_all' },
      )
    )
    .addStringOption(opt => opt.setName('guild_id').setDescription('Guild ID khác (cross-server)').setRequired(false))
  )
  .addSubcommand(sub => sub
    .setName('check')
    .setDescription('Kiểm tra điều kiện/debug boss theo ID, dùng được cho boss mới')
    .addUserOption(opt => opt.setName('user').setDescription('Người chơi cần kiểm tra').setRequired(true))
    .addStringOption(opt => opt.setName('boss_id').setDescription('ID boss cần check, ví dụ: ancient_oak').setRequired(true))
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

  // ── ids ───────────────────────────────────────────────────────────────────
  if (sub === 'ids') {
    const category = (interaction.options.getString('category') ?? 'all') as GameIdCategory;
    const search = interaction.options.getString('search');
    const sections = filterGameIdSections(getGameIdSectionsFor(category), search);
    const total = countRows(sections);
    const text = formatGameIdsText(category, search);
    const fileName = `game-ids-${category}${search?.trim() ? '-search' : ''}.txt`;
    const attachment = new AttachmentBuilder(Buffer.from(text, 'utf8'), { name: fileName });

    await interaction.editReply({
      embeds: [new EmbedBuilder()
        .setColor(total > 0 ? 0x5865F2 : 0x95A5A6)
        .setTitle('🧾 Game ID Index')
        .setDescription(formatGameIdsPreview(category, search))
        .addFields(
          { name: 'Nhóm', value: GAME_ID_CATEGORY_LABELS[category], inline: true },
          { name: 'Số ID', value: `${total}`, inline: true },
          { name: 'File đầy đủ', value: `Đã đính kèm \`${fileName}\``, inline: false },
        )
        .setFooter({ text: 'Dùng search để lọc nhanh: relic, forest, dagger, boss...' })
      ],
      files: [attachment],
    });
    return;
  }

  // ── resettime ─────────────────────────────────────────────────────────────
  if (sub === 'resettime') {
    const target = interaction.options.getString('target', true);

    let cooldownDeleted = 0;
    let aftermathDeleted = 0;
    let oakEvents = 0;
    let oakParticipants = 0;
    let title = '⏱️ Đã Reset Time';
    let description = '';

    if (target === 'oak_cooldown' || target === 'oak_all') {
      cooldownDeleted = resetAncientOakCooldown(guildId);
      description += '🌳 Đã mở lại cooldown triệu hồi **Ancient Oak**.\n';
    }

    if (target === 'oak_event' || target === 'oak_all') {
      const result = resetActiveOakEvent(guildId);
      oakEvents = result.events;
      oakParticipants = result.participants;
      description += '⚔️ Đã đóng event Ancient Oak đang mở và xoá danh sách tham gia cũ.\n';
    }

    if (target === 'oak_all') {
      aftermathDeleted = resetAncientOakAftermath(guildId);
      description += '🌲 Đã xoá hiệu ứng hậu quả Ancient Oak cũ nếu còn tồn tại.\n';
    }

    if (!description) {
      title = 'ℹ️ Không có gì để reset';
      description = 'Target không hợp lệ hoặc không có dữ liệu cần reset.';
    }

    await interaction.editReply({
      embeds: [new EmbedBuilder()
        .setColor(0x57F287)
        .setTitle(title)
        .setDescription(description.trim())
        .addFields(
          { name: 'Server', value: `\`${guildId}\``, inline: false },
          { name: 'Cooldown flag xoá', value: `${cooldownDeleted}`, inline: true },
          { name: 'Oak event đóng', value: `${oakEvents}`, inline: true },
          { name: 'Participant xoá', value: `${oakParticipants}`, inline: true },
          { name: 'Aftermath flag xoá', value: `${aftermathDeleted}`, inline: true },
        )]
    });
    return;
  }

  // ── check ─────────────────────────────────────────────────────────────────
  if (sub === 'check') {
    const target = interaction.options.getUser('user', true);
    const bossId = interaction.options.getString('boss_id', true).trim();
    const player = getPlayer(target.id, guildId);
    const now = Math.floor(Date.now() / 1000);

    if (!player) {
      await interaction.editReply({ content: `❌ <@${target.id}> chưa có nhân vật.` });
      return;
    }

    const enemy = ENEMIES[bossId];
    const enemyAny = enemy as any;
    const zoneByBoss = Object.values(ZONES).find(z => z.bossId === bossId);
    const enemyZones = Array.isArray(enemyAny?.zones) ? enemyAny.zones as string[] : [];
    const allowedZones = Array.from(new Set([
      zoneByBoss?.id,
      ...enemyZones,
    ].filter(Boolean) as string[]));
    const allowedZoneText = allowedZones.length > 0
      ? allowedZones.map(z => `\`${z}\``).join(', ')
      : 'chưa khai báo zone';

    const cooldownKey = String(enemyAny?.cooldownFlag ?? `boss_${bossId}_slain`);
    const cooldownFlag = getWorldFlagRow(guildId, cooldownKey);
    const rawCooldownValue = getFlag(guildId, cooldownKey);
    const combat = getCombatByUser(target.id, guildId);
    const alreadyCleared = hasPlayerClearedBoss(guildId, target.id, bossId);
    const level = Number(player.level ?? 1);
    const recommendedLevel = enemy ? getBossRecommendedLevel(enemyAny) : 1;
    const levelScaling = enemy ? getBossLevelScaling(enemyAny, [level]) : null;

    const checks: string[] = [];
    checks.push(okLine(Boolean(enemy), 'Boss ID tồn tại', enemy ? `${enemy.icon} **${enemy.name}**` : `không tìm thấy \`${bossId}\` trong ENEMIES`));
    checks.push(okLine(Boolean(enemyAny?.boss), 'Được đánh dấu boss', enemyAny?.boss ? '`boss: true`' : 'thiếu `boss: true` hoặc đây không phải boss'));
    checks.push(okLine(Boolean(zoneByBoss), 'Có zone boss gate', zoneByBoss ? `${zoneByBoss.icon} ${zoneByBoss.name} → \`${zoneByBoss.id}\`` : 'chưa có `bossId` trong ZONES'));
    checks.push(okLine(allowedZones.length === 0 || allowedZones.includes(player.zone_id), 'Người chơi ở đúng zone', `hiện tại: \`${player.zone_id}\`, yêu cầu: ${allowedZoneText}`));
    checks.push(okLine(Boolean(player.alive), 'Còn sống', player.alive ? `${player.hp}/${player.max_hp} HP` : 'người chơi đang chết'));
    checks.push(okLine(level >= recommendedLevel, 'Level khuyến nghị', `Lv ${level}/${recommendedLevel}`));
    checks.push(okLine(!cooldownFlag, 'Không bị cooldown world boss', cooldownFlag?.expires_at ? `key \`${cooldownKey}\`, còn ${formatDuration(cooldownFlag.expires_at - now)}` : rawCooldownValue ? `key \`${cooldownKey}\` đang tồn tại: ${rawCooldownValue}` : `không có key \`${cooldownKey}\``));
    checks.push(okLine(!combat, 'Không đang combat khác', combat ? `đang combat với \`${combat.enemy_id}\`` : 'không có active combat'));
    checks.push(okLine(!alreadyCleared, 'Chưa clear boss gate cá nhân', alreadyCleared ? `đã có \`boss_cleared_${target.id}_${bossId}\`` : 'chưa clear'));

    const requiredFlag = enemyAny?.requiredFlag ?? enemyAny?.required_flag;
    if (typeof requiredFlag === 'string' && requiredFlag.trim()) {
      const flagValue = getFlag(guildId, requiredFlag.trim());
      checks.push(okLine(Boolean(flagValue), 'Required flag custom', flagValue ? `\`${requiredFlag}\` = ${flagValue}` : `thiếu \`${requiredFlag}\``));
    }

    const requiredFlags = Array.isArray(enemyAny?.requiredFlags) ? enemyAny.requiredFlags as string[] : [];
    for (const flag of requiredFlags) {
      const flagValue = getFlag(guildId, flag);
      checks.push(okLine(Boolean(flagValue), `Required flag: ${flag}`, flagValue ? String(flagValue) : 'thiếu'));
    }

    const requiredItems = Array.isArray(enemyAny?.requiredItems)
      ? enemyAny.requiredItems as Array<{ itemId?: string; id?: string; amount?: number; qty?: number }>
      : [];
    for (const req of requiredItems) {
      const itemId = String(req.itemId ?? req.id ?? '').trim();
      if (!itemId) continue;
      const need = Math.max(1, Number(req.amount ?? req.qty ?? 1) || 1);
      const have = getItemQty(target.id, guildId, itemId);
      checks.push(okLine(have >= need, `Required item: ${itemId}`, `${have}/${need}`));
    }

    // Ancient Oak vẫn có route đặc biệt, nên check thêm các điều kiện riêng của nó.
    if (bossId === 'ancient_oak') {
      const relicCount = getItemQty(target.id, guildId, 'ancient_relic');
      const hasPrep = hasOakPrereq(guildId, target.id);
      const activeOak = getOakEvent(guildId);
      const participants = getOakParticipants(guildId);
      const huntActive = isOakHuntActive(guildId, target.id);
      const huntRemaining = getOakHuntRemaining(guildId, target.id);

      checks.push(okLine(hasPrep, 'Oak route: đã hạ mini boss rừng', hasPrep ? '`oak_prep` đã có' : 'thiếu flag `oak_prep_<userId>`'));
      checks.push(okLine(relicCount >= 3, 'Oak route: Ancient Relic', `${relicCount}/3`));
      checks.push(okLine(!activeOak, 'Oak route: không có event đang mở', activeOak ? `phase: \`${activeOak.phase}\`, HP: ${activeOak.boss_hp}/${activeOak.boss_max_hp}, participants: ${participants.length}` : 'không có event đang mở'));

      if (!hasPrep && huntActive) {
        checks.push(warnLine('Oak route: đang hunt mini boss', `còn ${huntRemaining} lần explore nữa`));
      } else if (!hasPrep && !huntActive) {
        checks.push(warnLine('Oak route: chưa bắt đầu hunt', 'vào Forest rồi bấm `🐾 Bắt Đầu Truy Tìm Linh Thú`'));
      }
    }

    const hardFails = checks.filter(line => line.startsWith('❌')).length;
    const canTry = Boolean(enemy) && Boolean(enemyAny?.boss) && Boolean(player.alive) && !combat && (allowedZones.length === 0 || allowedZones.includes(player.zone_id)) && !cooldownFlag;

    const suggestions: string[] = [];
    if (!enemy) suggestions.push(`Thêm boss \`${bossId}\` vào \`src/data/enemies.ts\`.`);
    if (enemy && !enemyAny?.boss) suggestions.push(`Thêm \`boss: true\` cho \`${bossId}\`.`);
    if (enemy && !zoneByBoss) suggestions.push(`Nếu boss có nút/gate riêng trong zone, thêm \`bossId: '${bossId}'\` vào zone tương ứng trong \`src/data/zones.ts\`.`);
    if (allowedZones.length > 0 && !allowedZones.includes(player.zone_id)) suggestions.push(`Đưa người chơi về đúng zone: ${allowedZoneText}.`);
    if (!player.alive) suggestions.push('Hồi sinh người chơi trước khi test boss.');
    if (level < recommendedLevel) suggestions.push(`Người chơi dưới level khuyến nghị. Boss vẫn có thể test, nhưng nên set Lv >= ${recommendedLevel}.`);
    if (cooldownFlag) suggestions.push(`Cooldown đang chặn: dùng /admin resettime nếu boss này có target reset, hoặc xoá world flag \`${cooldownKey}\`.`);
    if (combat) suggestions.push('Người chơi đang có active combat; kết thúc combat trước khi test boss.');
    if (alreadyCleared) suggestions.push(`Người chơi đã clear gate cá nhân. Có thể dùng /admin resetboss boss:${bossId}.`);
    if (bossId === 'ancient_oak') suggestions.push('Ancient Oak có điều kiện riêng: cần `oak_prep_<userId>` + 3 ancient_relic + không có Oak event đang mở.');
    if (suggestions.length === 0) suggestions.push('Không thấy lỗi điều kiện cơ bản. Nếu nút vẫn không hiện, khả năng nằm ở handler/menu riêng của boss route hoặc dist cũ.');

    await interaction.editReply({
      embeds: [new EmbedBuilder()
        .setColor(canTry && hardFails === 0 ? 0x57F287 : 0xFEE75C)
        .setTitle(canTry && hardFails === 0 ? '✅ Boss Check: Có Thể Test' : '🔎 Boss Check')
        .setDescription([
          `Boss ID: \`${bossId}\``,
          `Người chơi: <@${target.id}> (${player.name})`,
          '',
          checks.join('\n'),
        ].join('\n'))
        .addFields(
          { name: 'Scale level', value: levelScaling ? `Lv người chơi: **${level}**\nLv đề xuất: **${levelScaling.recommendedLevel}**\nHP x${levelScaling.hpMult.toFixed(2)} · ATK x${levelScaling.atkMult.toFixed(2)} · Reward x${levelScaling.rewardMult.toFixed(2)}` : 'Không tính được vì boss ID chưa tồn tại.', inline: true },
          { name: 'Debug keys thường dùng', value: `\`boss_${bossId}_slain\`\n\`boss_cleared_${target.id}_${bossId}\`\n\`forced_event_${target.id}\``, inline: true },
          { name: 'Gợi ý', value: suggestions.map(s => `• ${s}`).join('\n').slice(0, 1024), inline: false },
        )]
    });
    return;
  }

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

    const baseStat = stat as AdminBaseStat;

    if (stat === 'level') {
      const newExpNext = expNext(value);
      db.prepare('UPDATE players SET level=?, exp=0, exp_next=? WHERE user_id=? AND guild_id=?')
        .run(value, newExpNext, target.id, guildId);
    } else if (stat === 'gold') {
      db.prepare('UPDATE players SET gold=? WHERE user_id=? AND guild_id=?')
        .run(Math.max(0, Math.floor(value)), target.id, guildId);
    } else if (stat === 'hp') {
      const before = applyPassiveStats(player);
      if (value > before.max_hp) {
        // Admin set HP should be able to heal above the old cap; raise base Max HP first.
        setAdminBaseStat(target.id, guildId, 'max_hp', value);
      }
      const afterRaw = getPlayer(target.id, guildId)!;
      updatePlayerHpMp(target.id, guildId, value, afterRaw.mp);
    } else if (stat === 'mp') {
      const before = applyPassiveStats(player);
      if (value > before.max_mp) {
        // Same behavior for MP: grow Max MP first when the requested current MP exceeds the cap.
        setAdminBaseStat(target.id, guildId, 'max_mp', value);
      }
      const afterRaw = getPlayer(target.id, guildId)!;
      updatePlayerHpMp(target.id, guildId, afterRaw.hp, value);
    } else if (baseStat in ADMIN_BASE_STAT_META) {
      setAdminBaseStat(target.id, guildId, baseStat, value);
    }

    const freshRaw = getPlayer(target.id, guildId)!;
    const fresh = applyPassiveStats(freshRaw);
    const statLabels: Record<string, string> = {
      level: '🏅 Level', gold: '🪙 Gold', hp: '❤️ HP',
      max_hp: '❤️ Max HP', mp: '💧 MP', max_mp: '💧 Max MP',
      atk: '⚔️ ATK', def: '🛡️ DEF',
    };
    const displayVal = formatAdminSetValue(stat, freshRaw, value);

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
