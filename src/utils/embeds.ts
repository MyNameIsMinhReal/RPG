import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder
} from 'discord.js';
import { bar, hpLabel } from './format';
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
  const zone         = getZone(player.zone_id);
  const aliveStatus  = player.alive ? '🟢 Alive' : '💀 Dead';
  const selectedTitle = getSelectedTitle(player.user_id, player.guild_id);
  const titleLine    = selectedTitle ? `${selectedTitle.icon} *${selectedTitle.name}*` : '';
  const unlockedCount = getUnlockedTitles(player.user_id, player.guild_id).length;

  const maxSkillSlots = 4 + Math.min(2, player.extra_skill_slots ?? 0);
  const skillSlots = Array.from({ length: maxSkillSlots }, (_, i) => i + 1).map(slot => {
    const entry = loadout.find(l => l.slot === slot);
    if (!entry) return `\`${slot}\` —`;
    const sk = getSkill(entry.skill_id);
    return `\`${slot}\` ${sk?.icon ?? '❓'} ${sk?.name ?? entry.skill_id}`;
  }).join('  ');

  const gearStr = formatWornGear(player.user_id, player.guild_id);

  const embed = new EmbedBuilder()
    .setColor(player.alive ? COLORS.success : COLORS.death)
    .setTitle(`${player.alive ? '⚔️' : '💀'} ${player.name}${selectedTitle ? ` — ${selectedTitle.icon}` : ''}`)
    .setDescription([
      `${zone?.icon ?? '❓'} **${zone?.name ?? player.zone_id}**  ·  ${aliveStatus}`,
      titleLine
    ].filter(Boolean).join('\n'))
    .setThumbnail(avatarURL ?? null)
    .addFields(
      {
        name: '── Stats ──',
        value: [
          `❤️  HP  \`${bar(player.hp, player.max_hp)}\` ${hpLabel(player.hp, player.max_hp)}`,
          `💧  MP  \`${bar(player.mp, player.max_mp)}\` ${player.mp}/${player.max_mp}`,
          `⭐  EXP \`${bar(player.exp, player.exp_next)}\` ${player.exp}/${player.exp_next}`,
        ].join('\n'),
        inline: false
      },
      { name: '⚔️ ATK',  value: `**${player.atk}**`, inline: true },
      { name: '🛡️ DEF',  value: `**${player.def}**`, inline: true },
      { name: '🏅 Level', value: `**${player.level}**`, inline: true },
      { name: '🪙 Gold',  value: `**${player.gold.toLocaleString()}**`, inline: true },
      { name: '💀 Soul Shards', value: `**${player.soul_shards}**`, inline: true },
      { name: '🤝 Reputation', value: `**${player.reputation ?? 0}**`, inline: true },
      { name: '📜 Wanted', value: `**${player.wanted_level ?? 0}/5**`, inline: true },
      { name: '✨ Soul Perks', value: `Stats +${player.bonus_stat_points ?? 0} · Slots +${player.extra_skill_slots ?? 0}`, inline: true },
      { name: '☠️ Deaths / 🗡️ Kills', value: `**${player.deaths}** / **${player.kills}**`, inline: true },
      {
        name: '🏆 Thành tựu',
        value: `**${achievementSummary?.unlocked ?? 0}/${achievementSummary?.total ?? 0}** đã mở  ·  🏅 **${unlockedCount}** danh hiệu`,
        inline: false
      },
      { name: '🎽 Trang bị', value: gearStr || '*Chưa trang bị gì*', inline: false },
      { name: '🔮 Skill Loadout', value: skillSlots || '*(Chưa equip skill nào)*', inline: false }
    )
    .setFooter({ text: `Lần đầu chơi: <t:${player.created_at}:D>` });

  return embed;
}

// ── Combat embed ──────────────────────────────────────────────────────────
export interface CombatState {
  message_id: string; channel_id: string;
  user_id: string; guild_id: string;
  enemy_id: string; enemy_name: string;
  enemy_hp: number; enemy_max_hp: number;
  enemy_atk: number; enemy_def: number;
  player_hp: number; player_max_hp: number;
  player_mp: number; player_max_mp: number;
  turn: number; is_defending: number;
  active_effects: string; combat_log: string;
  player_stamina: number; player_max_stamina: number;
}

export function buildCombatEmbed(
  state: CombatState,
  playerName: string,
  enemyIcon: string,
  logLines: string[]
): EmbedBuilder {
  const effects: Array<{ name: string; duration: number }> = JSON.parse(state.active_effects || '[]')
    .filter((e: any) => !['last_stand_used'].includes(e.name)); // hide internal flags

  const effectIcons: Record<string, string> = {
    burn: '🔥', slow: '🧊', stun: '💫', dodge: '🌑',
    berserk: '😤', poison: '☠️', shield: '🛡️'
  };
  const effectStr = effects.length
    ? effects.map((e: any) => `${effectIcons[e.name] ?? '✨'} ${e.name} ×${e.duration}`).join('  ')
    : '*—*';

  // HP color indicator
  const hpPct = state.player_hp / state.player_max_hp;
  const hpColor = hpPct > 0.6 ? '🟢' : hpPct > 0.3 ? '🟡' : '🔴';
  const ePct = state.enemy_hp / state.enemy_max_hp;
  const eColor = ePct > 0.6 ? '🟢' : ePct > 0.3 ? '🟡' : '🔴';

  const logStr = logLines.slice(-4).join('\n') || '*...*';

  return new EmbedBuilder()
    .setColor(COLORS.dark)
    .setTitle(`⚔️ COMBAT  ·  Lượt ${state.turn}`)
    .setDescription(`**${playerName}** ⚔️ **${enemyIcon} ${state.enemy_name}**`)
    .addFields(
      {
        name: `${hpColor} ${playerName}`,
        value: [
          `❤️ \`${bar(state.player_hp, state.player_max_hp, 12)}\` **${state.player_hp}**/${state.player_max_hp}`,
          `💧 \`${bar(state.player_mp, state.player_max_mp, 12)}\` **${state.player_mp}**/${state.player_max_mp}`,
          `⚡ \`${bar(state.player_stamina ?? 100, state.player_max_stamina ?? 100, 12)}\` **${state.player_stamina ?? 100}**/${state.player_max_stamina ?? 100}${(state.player_stamina ?? 100) <= 10 ? ' *(kiệt sức!)*' : ''}`,
        ].join('\n'),
        inline: true
      },
      {
        name: `${eColor} ${enemyIcon} ${state.enemy_name}`,
        value: `❤️ \`${bar(state.enemy_hp, state.enemy_max_hp, 12)}\` **${state.enemy_hp}**/${state.enemy_max_hp}`,
        inline: true
      },
      {
        name: '✨ Hiệu ứng',
        value: effectStr,
        inline: false
      },
      {
        name: '📜 Log',
        value: logStr,
        inline: false
      }
    );
}

// ── Combat action buttons ─────────────────────────────────────────────────
export function buildCombatButtons(
  userId: string, hasSkills: boolean,
  stamina: number = 100, hasItems: boolean = false
): ActionRowBuilder<ButtonBuilder>[] {
  const exhausted = stamina <= 10;
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
      .setLabel('Chạy (60%)')
      .setEmoji('🏃')
      .setStyle(ButtonStyle.Secondary)
  );
  return [row1];
}

// ── Skill select menu ─────────────────────────────────────────────────────
export function buildSkillSelectMenu(
  userId: string,
  loadout: Array<{ slot: number; skill_id: string }>,
  playerMp: number
): ActionRowBuilder<StringSelectMenuBuilder> {
  const options = loadout.map(entry => {
    const sk = getSkill(entry.skill_id)!;
    const canAfford = !sk.mpCost || playerMp >= sk.mpCost;
    const label = `[${entry.slot}] ${sk.name}`;
    const desc = sk.mpCost ? `${sk.mpCost} MP${canAfford ? '' : ' (không đủ MP)'}` : 'Passive/World';
    return new StringSelectMenuOptionBuilder()
      .setLabel(label)
      .setDescription(desc)
      .setValue(`rpg_useskill_${userId}_${sk.id}`)
      .setEmoji(sk.icon);
  });

  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`rpg_skillmenu_${userId}`)
      .setPlaceholder('Chọn kỹ năng để sử dụng...')
      .addOptions(options)
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
  const dropStr = drops.length ? drops.join(', ') : '*Không có*';
  let desc = `Đã đánh bại **${enemyIcon} ${enemyName}**!\n\n`;
  desc += `+${expGained} ⭐ EXP  ·  +${goldGained} 🪙 Gold\n`;
  desc += `📦 Loot: ${dropStr}`;
  if (leveledUp) desc += `\n\n🎉 **LEVEL UP!** → Lv.**${newLevel}**`;

  return new EmbedBuilder()
    .setColor(COLORS.gold)
    .setTitle('🏆 Chiến thắng!')
    .setDescription(desc);
}

// ── Death embed ───────────────────────────────────────────────────────────
export function buildDeathEmbed(playerName: string, enemyName: string, goldLeft: number): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(COLORS.death)
    .setTitle('☠️ Bạn đã chết...')
    .setDescription(
      `**${playerName}** đã ngã xuống trước **${enemyName}**.\n\n` +
      `🪙 **${goldLeft}** gold rơi lại tại nơi bạn tử trận.\n` +
      `💀 Soul Shard nhận được như phần thưởng.\n\n` +
      `*Dùng \`/start\` để hồi sinh và bắt đầu lại...*\n` +
      `*Những kỹ năng đã học vẫn còn đó. Nhưng thế giới đã thay đổi.*`
    );
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
        name: '👤 Explorer', value: playerName, inline: true
      },
      {
        name: '👻 Di Sản', value: `${legacyCount} legacy trong zone này`, inline: true
      },
      {
        name: '👑 Boss', value: bossSlain ? '✅ Đã bị tiêu diệt' : '⚠️ Vẫn còn đó', inline: true
      }
    )
    .setFooter({ text: 'Chọn hành động bên dưới' });
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
