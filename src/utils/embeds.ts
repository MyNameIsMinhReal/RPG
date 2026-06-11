import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder
} from 'discord.js';
import { bar } from './format';
import { getSkill } from '../data/skills';
import { getZone } from '../data/zones';
import { getSelectedTitle, getUnlockedTitles } from '../systems/titles';
import { formatWornGear } from '../systems/equipment';
import { CLASSES } from '../data/classes';
import { getStatSummary } from '../systems/statSystem';
import { polishGameText } from './textPolish';
import { describeCorruption } from '../systems/corruption';

// ── Color palette ───────────────────────────────────────────────────────────
export const COLORS = {
  success:  0x57F287,  // green
  danger:   0xED4245,  // red
  warning:  0xFEE75C,  // yellow
  magic:    0xEB459E,  // pink
  gold:     0xF1C40F,  // gold
  info:     0x5865F2,  // blurple
  dark:     0x23272A,  // dark
  purple:   0x9B59B6,  // purple
  death:    0x2C2F33,  // near black
};

// ── Player type (matches DB row) ────────────────────────────────────────────
export interface PlayerRow {
  user_id: string; guild_id: string; name: string; alive: number;
  level: number; exp: number; exp_next: number;
  hp: number; max_hp: number; mp: number; max_mp: number;
  atk: number; def: number; gold: number; soul_shards: number;
  zone_id: string; deaths: number; kills: number; created_at: number;
  last_explore?: number;
  class?: string;
  reputation?: number;
  wanted_level?: number;
  bonus_stat_points?: number;
  keep_item_charges?: number;
  extra_skill_slots?: number;
  death_penalty_reduction?: number;
  rebirth_blessing?: number;
  merchant_mercy?: number;
  permanent_atk_bonus?: number; permanent_def_bonus?: number;
  permanent_max_hp_bonus?: number; permanent_max_mp_bonus?: number;
  stat_str?: number; stat_vit?: number; stat_end?: number; stat_agi?: number; stat_luk?: number;
  free_stat_reset?: number;
  corruption?: number;
}

// ── Simple embeds ───────────────────────────────────────────────────────────
export function simpleEmbed(color: number, desc: string) {
  return new EmbedBuilder().setColor(color).setDescription(polishGameText(desc));
}

// ── Profile embed ─────────────────────────────────────────────────────────
export function buildProfileEmbed(
  player: PlayerRow,
  loadout: Array<{ slot: number; skill_id: string }>,
  avatarURL?: string | null,
  achievementSummary?: { unlocked: number; total: number }
): EmbedBuilder {
  const zone          = getZone(player.zone_id);
  const cls           = CLASSES[player.class ?? 'warrior'] ?? CLASSES.warrior;
  const selectedTitle = getSelectedTitle(player.user_id, player.guild_id);
  const unlockedCount = getUnlockedTitles(player.user_id, player.guild_id).length;
  const statSummary = getStatSummary(player);
  const b = statSummary.build;
  const sec = statSummary.secondary;

  const maxSkillSlots = 4 + Math.min(2, player.extra_skill_slots ?? 0);
  const skillSlots = Array.from({ length: maxSkillSlots }, (_, i) => i + 1).map(slot => {
    const entry = loadout.find(l => l.slot === slot);
    if (!entry) return `\`${slot}\` —`;
    const sk = getSkill(entry.skill_id);
    return `\`${slot}\` ${sk?.icon ?? '❓'} ${sk?.name ?? entry.skill_id}`;
  }).join('  ');

  const gearStr = formatWornGear(player.user_id, player.guild_id);

  const hpPct = player.hp / player.max_hp;
  const hpDot = hpPct > 0.6 ? '🟢' : hpPct > 0.3 ? '🟡' : '🔴';

  const descLines = [
    `${zone?.icon ?? '❓'} **${zone?.name ?? player.zone_id}**  ·  ${cls.icon} **${cls.name}**  ·  ${player.alive ? '🟢 Đang sống' : '💀 Đã chết'}`,
    selectedTitle ? `${selectedTitle.icon} *${selectedTitle.name}*` : '',
  ].filter(Boolean).join('\n');

  return new EmbedBuilder()
    .setColor(player.alive ? COLORS.success : COLORS.death)
    .setTitle(`${player.alive ? '🧭' : '💀'} Hồ Sơ Mạo Hiểm · ${player.name}${selectedTitle ? `  ${selectedTitle.icon}` : ''}`)
    .setDescription(descLines)
    .setThumbnail(avatarURL ?? null)
    .addFields(
      {
        name: '📊 Sinh Lực & Năng Lượng',
        value: [
          `${hpDot} HP  \`${bar(player.hp, player.max_hp)}\` **${player.hp}**/${player.max_hp}`,
          `💧 MP  \`${bar(player.mp, player.max_mp)}\` **${player.mp}**/${player.max_mp}`,
          `⭐ EXP \`${bar(player.exp, player.exp_next)}\` **${player.exp}**/${player.exp_next}`,
        ].join('\n'),
        inline: false,
      },
      { name: '⚔️ ATK',   value: `**${player.atk}**`,                  inline: true },
      { name: '🛡️ DEF',   value: `**${player.def}**`,                  inline: true },
      { name: '🏅 Level', value: `**${player.level}**`,                  inline: true },
      { name: '🧬 Điểm Tiềm Năng', value: `**${statSummary.availablePoints}** còn / **${statSummary.totalPoints}** tổng`, inline: true },
      { name: '🪙 Gold',  value: `**${player.gold.toLocaleString()}**`, inline: true },
      { name: '💀 Soul',  value: `**${player.soul_shards}**`,            inline: true },
      { name: '🤝 Rep',   value: `**${player.reputation ?? 0}**`,        inline: true },
      { name: '📜 Truy Nã',      value: `**${player.wanted_level ?? 0}/5**`,                             inline: true },
      ...(player.zone_id === 'shrine' || (player.corruption ?? 0) > 0 ? [{ name: '🌘 Ô Nhiễm', value: describeCorruption(player.corruption ?? 0), inline: true }] : []),
      { name: '✨ Dấu Ấn Linh Hồn',  value: `+${player.bonus_stat_points ?? 0} stat · +${player.extra_skill_slots ?? 0} slot`, inline: true },
      { name: '☠️ Chết / 🗡️ Kill', value: `**${player.deaths}** / **${player.kills}**`,                inline: true },
      {
        name: '🏆 Thành Tựu',
        value: `**${achievementSummary?.unlocked ?? 0}**/**${achievementSummary?.total ?? 0}** đã mở  ·  🏅 **${unlockedCount}** danh hiệu`,
        inline: false,
      },
      { name: '🎽 Trang Bị Đang Mặc',     value: gearStr || '*Chưa trang bị gì*',        inline: false },
      { name: '🔮 Kỹ Năng Đang Mang', value: skillSlots || '*Chưa gắn kỹ năng nào*', inline: false }
    )
    .setFooter({ text: `Chọn nút bên dưới để xem túi đồ, trang bị, pet hoặc cộng điểm · Tạo từ <t:${player.created_at}:D>` });
}

// ── Combat embed ──────────────────────────────────────────────────────────
export interface CombatEnemy {
  id: string;
  name: string;
  icon: string;
  hp: number;
  max_hp: number;
  atk: number;
  def: number;
  specialAttacks: string[];
  boss?: boolean;
}

export interface CombatState {
  message_id: string; channel_id: string;
  user_id: string; guild_id: string;
  enemy_id: string; enemy_name: string;
  enemy_hp: number; enemy_max_hp: number;
  enemy_atk: number; enemy_def: number;
  player_hp: number; player_max_hp: number;
  player_mp: number; player_max_mp: number;
  player_def?: number;
  turn: number; is_defending: number;
  active_effects: string; combat_log: string;
  player_stamina: number; player_max_stamina: number;
  enemies_json?: string; // JSON CombatEnemy[] for group fights
}

export function buildCombatEmbed(
  state: CombatState,
  playerName: string,
  enemyIcon: string,
  logLines: string[]
): EmbedBuilder {
  const HIDDEN_EFFECTS = new Set([
    'last_stand_used', 'flee_attempts', 'flee_penalty',
    'boss_phase', 'boss_phase_immune', 'boss_charging',
  ]);
  const effects: Array<{ name: string; duration: number; value?: number; target?: string }> = JSON.parse(state.active_effects || '[]')
    .filter((e: any) => !HIDDEN_EFFECTS.has(e.name));

  const effectIcons: Record<string, string> = {
    burn: '🔥', slow: '🧊', stun: '💫', dodge: '🌑',
    berserk: '😤', poison: '☠️', shield: '🛡️', shadow_step: '👤',
    focus_tonic: '🎯', rooted: '🌿', stun_immune: '🛡️',
    battle_cry: '📣', stone_skin: '🪨', weapon_oil: '🔩', rage_elixir: '🔥',
    blood_vial: '🩸', armor_polish: '🧼', silence: '📜', ward: '🧿',
  };

  // Parse group enemies
  const groupEnemies: CombatEnemy[] | null = state.enemies_json
    ? (() => { try { return JSON.parse(state.enemies_json); } catch { return null; } })()
    : null;
  const isGroup = !!(groupEnemies && groupEnemies.length > 1);
  const aliveCount = isGroup ? groupEnemies!.filter(e => e.hp > 0).length : 0;

  // Dynamic embed color based on player HP
  const hpPct = state.player_hp / state.player_max_hp;
  const embedColor = hpPct < 0.2 ? 0xED4245     // critical — red
    : hpPct < 0.5 ? 0xE67E22                    // damaged  — orange
    : state.is_defending ? 0x5865F2              // defending — blue
    : 0x2C2F33;                                  // normal    — dark

  const pStatus = hpPct < 0.2 ? '🔴' : hpPct < 0.5 ? '🟡' : '🟢';

  // Player stats block
  const sta = state.player_stamina ?? 100;
  const maxSta = state.player_max_stamina ?? 100;
  const playerStats = [
    `❤️ \`${bar(state.player_hp, state.player_max_hp, 10)}\` **${state.player_hp}**/${state.player_max_hp}`,
    `💧 \`${bar(state.player_mp, state.player_max_mp, 10)}\` **${state.player_mp}**/${state.player_max_mp}`,
    `⚡ \`${bar(sta, maxSta, 10)}\` **${sta}**/${maxSta}${sta <= 10 ? '  ⚠️ *kiệt sức!*' : ''}`,
  ].join('\n');

  // Log: last 3 lines as Discord blockquotes
  const logStr = logLines.length
    ? logLines.slice(-3).map(l => `> ${l}`).join('\n')
    : '> *...*';

  // Description
  const desc = isGroup
    ? `**${playerName}** ⚔️ **Nhóm kẻ thù** — ${aliveCount}/${groupEnemies!.length} còn sống`
    : `**${playerName}** ⚔️ **${enemyIcon} ${state.enemy_name}**`;

  const embed = new EmbedBuilder()
    .setColor(embedColor)
    .setTitle(`⚔️ Chiến Trường · Lượt ${state.turn}`)
    .setDescription(`${desc}\n\n🎯 **Mục tiêu:** hạ gục kẻ địch hoặc sống sót để rút lui.`);

  // Player field
  embed.addFields({
    name: `${pStatus} ${playerName}`,
    value: playerStats,
    inline: !isGroup,
  });

  // Enemy field(s)
  if (isGroup) {
    const enemyLines = groupEnemies!.map((e, i) => {
      if (e.hp <= 0) return `☠️ ~~**[${i + 1}] ${e.icon} ${e.name}**~~ — đã chết`;
      const pct = e.hp / e.max_hp;
      const col = pct > 0.6 ? '🟢' : pct > 0.3 ? '🟡' : '🔴';
      return `${col} **[${i + 1}] ${e.icon} ${e.name}**\n❤️ \`${bar(e.hp, e.max_hp, 8)}\` **${e.hp}**/${e.max_hp}`;
    }).join('\n');
    embed.addFields({ name: `👹 Kẻ Địch (${aliveCount} còn sống)`, value: enemyLines, inline: false });
  } else {
    const ePct = state.enemy_hp / state.enemy_max_hp;
    const eStatus = ePct > 0.6 ? '🟢' : ePct > 0.3 ? '🟡' : '🔴';
    embed.addFields({
      name: `${eStatus} ${enemyIcon} ${state.enemy_name}`,
      value: `❤️ \`${bar(state.enemy_hp, state.enemy_max_hp, 10)}\` **${state.enemy_hp}**/${state.enemy_max_hp}`,
      inline: true,
    });
  }

  // Effects — only shown when non-empty
  if (effects.length) {
    const effectNames: Record<string, string> = {
      burn: 'Đốt', poison: 'Độc', slow: 'Chậm', stun: 'Choáng', dodge: 'Né',
      berserk: 'Berserk', shield: 'Chắn', rooted: 'Trói', stun_immune: 'Kháng choáng',
      battle_cry: 'ATK↑', stone_skin: 'Giáp↑', silence: 'Silence', ward: 'Bùa',
      weapon_oil: 'ATK↑', rage_elixir: 'Bạo loạn', blood_vial: 'ATK↑', armor_polish: 'DEF↑',
      focus_tonic: 'Focus', bark_armor: 'Vỏ cây', oak_vulnerable: 'Yếu điểm', boss_charging: 'Đang tích',
    };
    const targetTag = (e: any) => e.target === 'enemy' ? ' 👹' : e.target === 'player' ? ' 🧑' : '';
    const valTag = (e: any) => (e.value && (e.name === 'burn' || e.name === 'poison')) ? `(${e.value}/t)` : '';
    const effectStr = effects.map((e: any) =>
      `${effectIcons[e.name] ?? '✨'} **${effectNames[e.name] ?? e.name}**${valTag(e)} ×${e.duration}${targetTag(e)}`
    ).join('  ');
    embed.addFields({ name: '✨ Hiệu Ứng Đang Tác Động', value: effectStr, inline: false });
  }

  // Log
  embed.addFields({ name: '📜 Diễn Biến Gần Nhất', value: logStr, inline: false });

  // Footer: defending hint
  if (state.is_defending) {
    embed.setFooter({ text: '🛡️ Đang phòng thủ — sát thương nhận vào sẽ giảm trong lượt này' });
  }

  return embed;
}


function getFleeChanceFromActiveEffects(activeEffectsRaw?: string | null): number {
  if (!activeEffectsRaw) return 45;
  try {
    const effects = JSON.parse(activeEffectsRaw || '[]');
    if (!Array.isArray(effects)) return 45;
    if (effects.some((e: any) => e?.name === 'rooted')) return 0;
    const attempts = Number(effects.find((e: any) => e?.name === 'flee_attempts')?.value ?? 0) || 0;
    const fleePenalty = Number(effects.find((e: any) => e?.name === 'flee_penalty')?.value ?? 0) || 0;
    return Math.max(5, Math.min(90, 45 + attempts * 15 - fleePenalty));
  } catch {
    return 45;
  }
}

// ── Combat action buttons ─────────────────────────────────────────────────
export function buildCombatButtons(
  userId: string, hasSkills: boolean,
  stamina: number = 100, hasItems: boolean = false,
  activeEffectsRaw?: string | null
): ActionRowBuilder<ButtonBuilder>[] {
  const exhausted = stamina <= 10;
  const fleeChance = getFleeChanceFromActiveEffects(activeEffectsRaw);
  const rooted = fleeChance <= 0;

  let hasBarkArmor = false;
  if (activeEffectsRaw) {
    try {
      const fx: any[] = JSON.parse(activeEffectsRaw);
      hasBarkArmor = fx.some((e: any) => e.name === 'bark_armor' && e.duration > 0);
    } catch {}
  }

  const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`rpg_attack_${userId}`)
      .setLabel(exhausted ? 'Kiệt sức' : 'Tấn công')
      .setEmoji('⚔️')
      .setStyle(ButtonStyle.Danger)
      .setDisabled(exhausted),
    new ButtonBuilder()
      .setCustomId(`rpg_skill_${userId}`)
      .setLabel('Kỹ năng')
      .setEmoji('🔮')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(!hasSkills),
    new ButtonBuilder()
      .setCustomId(`rpg_defend_${userId}`)
      .setLabel(`Phòng thủ${exhausted ? ' ✅' : ''}`)
      .setEmoji('🛡️')
      .setStyle(exhausted ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`rpg_item_${userId}`)
      .setLabel('Vật phẩm')
      .setEmoji('🎒')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(!hasItems),
    new ButtonBuilder()
      .setCustomId(`rpg_flee_${userId}`)
      .setLabel(rooted ? 'Bị trói' : `Rút lui (${fleeChance}%)`)
      .setEmoji('🏃')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(rooted)
  );

  const rows: ActionRowBuilder<ButtonBuilder>[] = [row1];

  if (hasBarkArmor) {
    rows.push(new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`rpg_ignite_${userId}`)
        .setLabel('Đốt Vỏ Cây (25 MP)')
        .setEmoji('🔥')
        .setStyle(ButtonStyle.Primary)
    ));
  }

  return rows;
}

// ── Skill select menu ─────────────────────────────────────────────────────
export function buildSkillSelectMenu(
  userId: string,
  loadout: Array<{ slot: number; skill_id: string }>,
  playerMp: number
): ActionRowBuilder<StringSelectMenuBuilder> {
  const activeLoadout = loadout
    .map(entry => ({ entry, skill: getSkill(entry.skill_id) }))
    .filter(x => x.skill?.type === 'active');

  const options = activeLoadout.map(({ entry, skill }) => {
    const sk = skill!;
    const canAfford = !sk.mpCost || playerMp >= sk.mpCost;
    const label = `[${entry.slot}] ${sk.name}`;
    const desc = sk.mpCost ? `${sk.mpCost} MP${canAfford ? '' : ' (không đủ MP)'}` : 'Không tốn MP';
    return new StringSelectMenuOptionBuilder()
      .setLabel(label)
      .setDescription(desc)
      .setValue(`rpg_useskill_${userId}_${sk.id}`)
      .setEmoji(sk.icon);
  });

  // Fallback bảo vệ nếu UI gọi nhầm khi người chơi không có active skill.
  if (!options.length) {
    options.push(new StringSelectMenuOptionBuilder()
      .setLabel('Không có kỹ năng chủ động')
      .setDescription('Kỹ năng bị động / thế giới không dùng trong combat')
      .setValue(`rpg_useskill_${userId}__no_active`)
      .setEmoji('⚠️'));
  }

  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`rpg_skillmenu_${userId}`)
      .setPlaceholder('Chọn kỹ năng để tung đòn...')
      .addOptions(options.slice(0, 25))
  );
}

// ── Victory embed ─────────────────────────────────────────────────────────
export function buildVictoryEmbed(
  playerName: string,
  enemyName: string, enemyIcon: string,
  expGained: number, goldGained: number,
  drops: string[],
  leveledUp: boolean, newLevel?: number
): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(COLORS.gold)
    .setTitle('🏆 Chiến Thắng')
    .setDescription(`> ✦ **${playerName}** đã hạ gục **${enemyIcon} ${enemyName}**. Màn sương tạm lùi lại.`)
    .addFields(
      { name: '⭐ EXP',   value: `+**${expGained}**`,                   inline: true },
      { name: '🪙 Gold',  value: `+**${goldGained.toLocaleString()}**`, inline: true },
      {
        name: '📦 Chiến Lợi Phẩm',
        value: drops.length ? drops.join('\n') : '*Không có chiến lợi phẩm.*',
        inline: false,
      }
    );

  if (leveledUp) {
    embed.addFields({
      name: '🎉 Lên Cấp',
      value: `Bạn đạt **Lv.${newLevel}** và nhận **+3 Điểm Tiềm Năng**. Mở /profile để cộng STR/VIT/END/AGI/LUK.`,
      inline: false,
    });
  }

  embed.setFooter({ text: 'Chọn Tiếp tục khám phá để rời chiến trường và tìm dấu vết mới' });
  return embed;
}

// ── Death embed ───────────────────────────────────────────────────────────
export function buildDeathEmbed(playerName: string, enemyName: string, goldLeft: number): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(COLORS.death)
    .setTitle('☠️ Mạo Hiểm Giả Đã Ngã Xuống')
    .setDescription(
      `> *Ngọn lửa sinh mệnh lụi tàn giữa màn đêm.*\n\n` +
      `**${playerName}** đã thất bại trước **${enemyName}**.`
    )
    .addFields(
      { name: '🪙 Vàng Còn Lại', value: `**${goldLeft.toLocaleString()}** 🪙`, inline: true }
    )
    .setFooter({ text: 'Dùng /start để hồi sinh · Kỹ năng đã học vẫn được giữ lại' });
}

// ── Explore embed ─────────────────────────────────────────────────────────
export function buildExploreEmbed(
  playerName: string,
  zoneId: string,
  ambiance: string,
  legacyCount: number,
  bossSlain: boolean
): EmbedBuilder {
  const zone = getZone(zoneId)!;
  return new EmbedBuilder()
    .setColor(zone.color)
    .setTitle(`${zone.icon} ${zone.name}`)
    .setDescription(`> *${ambiance}*\n\n🎯 **Chọn hướng đi tiếp theo.**`)
    .addFields(
      {
        name: '👻 Di Sản',
        value: legacyCount > 0 ? `**${legacyCount}** di sản đang chờ` : '*Chưa phát hiện*',
        inline: true,
      },
      {
        name: '👑 Boss',
        value: bossSlain ? '✅ Đã bị đánh bại' : '⚠️ Vẫn đang rình rập',
        inline: true,
      }
    )
    .setFooter({ text: `👤 ${playerName}  ·  Chọn hành động bên dưới` });
}

export function buildExploreButtons(userId: string, isSafe: boolean, hasBoss: boolean): ActionRowBuilder<ButtonBuilder> {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`rpg_exsearch_${userId}`)
      .setLabel('Khám phá')
      .setEmoji('🗺️')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(isSafe),
    new ButtonBuilder()
      .setCustomId(`rpg_exboss_${userId}`)
      .setLabel('Thách đấu Boss')
      .setEmoji('👑')
      .setStyle(ButtonStyle.Danger)
      .setDisabled(isSafe || !hasBoss),
    new ButtonBuilder()
      .setCustomId(`rpg_exlegacy_${userId}`)
      .setLabel('Di sản')
      .setEmoji('👻')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`rpg_exrest_${userId}`)
      .setLabel('Nghỉ ngơi')
      .setEmoji('💤')
      .setStyle(ButtonStyle.Secondary)
  );
  return row;
}
