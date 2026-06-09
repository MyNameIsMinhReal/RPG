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
}

// ── Simple embeds ───────────────────────────────────────────────────────────
export function simpleEmbed(color: number, desc: string) {
  return new EmbedBuilder().setColor(color).setDescription(desc);
}

// ── Profile embed ─────────────────────────────────────────────────────────
export function buildProfileEmbed(
  player: PlayerRow,
  loadout: Array<{ slot: number; skill_id: string }>,
  avatarURL?: string | null,
  achievementSummary?: { unlocked: number; total: number }
): EmbedBuilder {
  const zone          = getZone(player.zone_id);
  const selectedTitle = getSelectedTitle(player.user_id, player.guild_id);
  const unlockedCount = getUnlockedTitles(player.user_id, player.guild_id).length;

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
    `${zone?.icon ?? '❓'} **${zone?.name ?? player.zone_id}**  ·  ${player.alive ? '🟢 Đang sống' : '💀 Đã chết'}`,
    selectedTitle ? `${selectedTitle.icon} *${selectedTitle.name}*` : '',
  ].filter(Boolean).join('\n');

  return new EmbedBuilder()
    .setColor(player.alive ? COLORS.success : COLORS.death)
    .setTitle(`${player.alive ? '⚔️' : '💀'} ${player.name}${selectedTitle ? `  ${selectedTitle.icon}` : ''}`)
    .setDescription(descLines)
    .setThumbnail(avatarURL ?? null)
    .addFields(
      {
        name: '📊 Chỉ Số',
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
      { name: '🪙 Gold',  value: `**${player.gold.toLocaleString()}**`, inline: true },
      { name: '💀 Soul',  value: `**${player.soul_shards}**`,            inline: true },
      { name: '🤝 Rep',   value: `**${player.reputation ?? 0}**`,        inline: true },
      { name: '📜 Wanted',      value: `**${player.wanted_level ?? 0}/5**`,                             inline: true },
      { name: '✨ Soul Perks',  value: `+${player.bonus_stat_points ?? 0} stat · +${player.extra_skill_slots ?? 0} slot`, inline: true },
      { name: '☠️ Chết / 🗡️ Kill', value: `**${player.deaths}** / **${player.kills}**`,                inline: true },
      {
        name: '🏆 Thành Tựu',
        value: `**${achievementSummary?.unlocked ?? 0}**/**${achievementSummary?.total ?? 0}** đã mở  ·  🏅 **${unlockedCount}** danh hiệu`,
        inline: false,
      },
      { name: '🎽 Trang Bị',     value: gearStr || '*Chưa trang bị gì*',        inline: false },
      { name: '🔮 Skill Loadout', value: skillSlots || '*Chưa equip skill nào*', inline: false }
    )
    .setFooter({ text: `Nhân vật tạo từ <t:${player.created_at}:D>` });
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
    'last_stand_used', 'flee_attempts',
    'boss_phase', 'boss_phase_immune', 'boss_charging',
  ]);
  const effects: Array<{ name: string; duration: number }> = JSON.parse(state.active_effects || '[]')
    .filter((e: any) => !HIDDEN_EFFECTS.has(e.name));

  const effectIcons: Record<string, string> = {
    burn: '🔥', slow: '🧊', stun: '💫', dodge: '🌑',
    berserk: '😤', poison: '☠️', shield: '🛡️', shadow_step: '👤',
    focus_tonic: '🎯', rooted: '🌿',
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
    .setTitle(`⚔️ Trận Chiến · Lượt ${state.turn}`)
    .setDescription(desc);

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
    embed.addFields({ name: `👹 Kẻ Thù (${aliveCount} còn sống)`, value: enemyLines, inline: false });
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
    const effectStr = effects.map((e: any) => `${effectIcons[e.name] ?? '✨'} **${e.name}** ×${e.duration}`).join('  ');
    embed.addFields({ name: '✨ Hiệu ứng', value: effectStr, inline: false });
  }

  // Log
  embed.addFields({ name: '📋 Diễn biến', value: logStr, inline: false });

  // Footer: defending hint
  if (state.is_defending) {
    embed.setFooter({ text: '🛡️ Đang phòng thủ — giảm sát thương nhận vào lượt này' });
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
    return Math.min(90, 45 + attempts * 15);
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
  const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`rpg_attack_${userId}`)
      .setLabel(exhausted ? 'Kiệt sức!' : 'Tấn công')
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
      .setLabel('Dùng đồ')
      .setEmoji('🎒')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(!hasItems),
    new ButtonBuilder()
      .setCustomId(`rpg_flee_${userId}`)
      .setLabel(rooted ? 'Không thể chạy' : `Chạy (${fleeChance}%)`)
      .setEmoji('🏃')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(rooted)
  );
  return [row1];
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
      .setLabel('Không có kỹ năng active')
      .setDescription('Passive / world skill không dùng trong combat')
      .setValue(`rpg_useskill_${userId}__no_active`)
      .setEmoji('⚠️'));
  }

  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`rpg_skillmenu_${userId}`)
      .setPlaceholder('Chọn kỹ năng active để sử dụng...')
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
    .setTitle('🏆 Chiến Thắng!')
    .setDescription(`> ✦ **${playerName}** đã hạ gục **${enemyIcon} ${enemyName}**!`)
    .addFields(
      { name: '⭐ EXP',   value: `+**${expGained}**`,                   inline: true },
      { name: '🪙 Gold',  value: `+**${goldGained.toLocaleString()}**`, inline: true },
      {
        name: '📦 Loot',
        value: drops.length ? drops.join('\n') : '*Không có gì rơi...*',
        inline: false,
      }
    );

  if (leveledUp) {
    embed.addFields({
      name: '🎉 LEVEL UP!',
      value: `Chúc mừng! Bạn đạt **Lv. ${newLevel}** — bạn đã mạnh hơn!`,
      inline: false,
    });
  }

  embed.setFooter({ text: '⚔️ Tiếp tục khám phá để tìm kiếm thêm phần thưởng' });
  return embed;
}

// ── Death embed ───────────────────────────────────────────────────────────
export function buildDeathEmbed(playerName: string, enemyName: string, goldLeft: number): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(COLORS.death)
    .setTitle('☠️ Bạn Đã Ngã Xuống')
    .setDescription(
      `> *"Bóng tối nuốt chửng tất cả..."*\n\n` +
      `**${playerName}** thất bại trước **${enemyName}**.`
    )
    .addFields(
      { name: '🪙 Gold Rơi Lại', value: `**${goldLeft.toLocaleString()}** 🪙`, inline: true }
    )
    .setFooter({ text: 'Dùng /start để hồi sinh  ·  Kỹ năng đã học vẫn còn đó' });
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
    .setDescription(`*${ambiance}*`)
    .addFields(
      {
        name: '👻 Di Sản',
        value: legacyCount > 0 ? `**${legacyCount}** legacy đang chờ` : '*Không có*',
        inline: true,
      },
      {
        name: '👑 Boss',
        value: bossSlain ? '✅ Đã bị tiêu diệt' : '⚠️ Vẫn đang rình rập',
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
      .setLabel('Thách Boss')
      .setEmoji('👑')
      .setStyle(ButtonStyle.Danger)
      .setDisabled(isSafe || !hasBoss),
    new ButtonBuilder()
      .setCustomId(`rpg_exlegacy_${userId}`)
      .setLabel('Di Sản')
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
