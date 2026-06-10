import {
  SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder,
  ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType,
} from 'discord.js';
import db from '../database/index';
import { getPlayer, addItem } from '../systems/player';
import { PETS, getPet, petPassiveValue, RARITY_COLOR, RARITY_LABEL } from '../data/pets';
import { COLORS } from '../utils/embeds';
import { onlyUser } from '../utils/collectors';
import { describePetRole } from '../systems/petRoles';

export const data = new SlashCommandBuilder()
  .setName('pet')
  .setDescription('Quản lý thú cưng chiến đấu')
  .addSubcommand(s => s
    .setName('list')
    .setDescription('Xem danh sách thú cưng của bạn'))
  .addSubcommand(s => s
    .setName('equip')
    .setDescription('Trang bị thú cưng làm đồng hành chiến đấu')
    .addStringOption(o => o.setName('pet_id').setDescription('ID của thú cưng (xem trong /pet list)').setRequired(true)))
  .addSubcommand(s => s
    .setName('feed')
    .setDescription('Cho thú cưng ăn để tăng cấp (tốn gold)')
    .addStringOption(o => o.setName('pet_id').setDescription('ID của thú cưng').setRequired(true)))
  .addSubcommand(s => s
    .setName('release')
    .setDescription('Thả thú cưng về tự nhiên để nhận vật phẩm')
    .addStringOption(o => o.setName('pet_id').setDescription('ID của thú cưng').setRequired(true)));

type PetRow = { pet_id: string; level: number; exp?: number };

function petExpNeeded(level: number): number { return 35 + level * 15; }

function passiveLabel(type: string): string {
  const labels: Record<string, string> = {
    atk_pct: 'ATK',
    def_pct: 'DEF',
    hp_pct:  'Max HP',
    gold_pct: 'Gold nhận',
    exp_pct:  'EXP nhận',
    mp_pct:   'Max MP',
  };
  return labels[type] ?? type;
}

export async function execute(i: ChatInputCommandInteraction): Promise<void> {
  await i.deferReply();
  const userId  = i.user.id;
  const guildId = i.guildId!;
  const player  = getPlayer(userId, guildId);

  if (!player) {
    await i.editReply({ embeds: [new EmbedBuilder().setColor(COLORS.warning).setDescription('❌ Bạn chưa có nhân vật! Dùng `/start` để bắt đầu.')] });
    return;
  }

  const sub = i.options.getSubcommand();

  // ── /pet list ──────────────────────────────────────────────────────────
  if (sub === 'list') {
    const pets = db.prepare('SELECT pet_id, level, COALESCE(exp,0) AS exp FROM player_pets WHERE user_id=? AND guild_id=?')
      .all(userId, guildId) as PetRow[];
    const activePetId = (player as any).active_pet as string | null;

    if (pets.length === 0) {
      await i.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.info)
            .setTitle('🐾 Thú Cưng')
            .setDescription(
              'Bạn chưa có thú cưng nào!\n\n' +
              '**Cách nhận thú cưng:**\n' +
              Object.values(PETS).map(p => `${p.icon} **${p.name}** — ${p.obtainHint}`).join('\n')
            ),
        ],
      });
      return;
    }

    const lines = pets.map(row => {
      const def = getPet(row.pet_id);
      if (!def) return `❓ \`${row.pet_id}\` — Lv.${row.level}`;
      const bonusPct = petPassiveValue(def, row.level).toFixed(1);
      const equipped = activePetId === row.pet_id ? ' **【ĐANG TRANG BỊ】**' : '';
      return (
        `${def.icon} **${def.name}**${equipped}\n` +
        `  \`${row.pet_id}\` · Lv.**${row.level}**/${def.maxLevel} · ${RARITY_LABEL[def.rarity]}\n` +
        `  📊 +${bonusPct}% ${passiveLabel(def.passiveType)} · 🐾 EXP ${row.exp ?? 0}/${petExpNeeded(row.level)}\n` +
        `  ${describePetRole(row.pet_id).replace(/\*\*/g, '')}`
      );
    }).join('\n\n');

    await i.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(COLORS.gold)
          .setTitle('🐾 Thú Cưng Của Bạn')
          .setDescription(lines)
          .setFooter({ text: '/pet equip <id> · /pet feed <id> · /pet release <id>' }),
      ],
    });
    return;
  }

  // ── Resolve pet for equip / feed / release ──────────────────────────────
  const petId  = i.options.getString('pet_id', true).toLowerCase();
  const petRow = db.prepare('SELECT pet_id, level, COALESCE(exp,0) AS exp FROM player_pets WHERE user_id=? AND guild_id=? AND pet_id=?')
    .get(userId, guildId, petId) as PetRow | undefined;

  if (!petRow) {
    await i.editReply({ embeds: [new EmbedBuilder().setColor(COLORS.warning).setDescription(`❌ Bạn không có thú cưng \`${petId}\`. Dùng \`/pet list\` để xem.`)] });
    return;
  }

  const def = getPet(petId);
  if (!def) {
    await i.editReply({ embeds: [new EmbedBuilder().setColor(COLORS.warning).setDescription(`❌ Không tìm thấy dữ liệu thú cưng \`${petId}\`.`)] });
    return;
  }

  // ── /pet equip ─────────────────────────────────────────────────────────
  if (sub === 'equip') {
    db.prepare('UPDATE players SET active_pet=? WHERE user_id=? AND guild_id=?').run(petId, userId, guildId);
    await i.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(RARITY_COLOR[def.rarity] ?? COLORS.info)
          .setTitle(`${def.icon} Đã Trang Bị ${def.name}!`)
          .setDescription(
            `${def.description}\n\n` +
            `📊 **Passive:** +${petPassiveValue(def, petRow.level).toFixed(1)}% ${passiveLabel(def.passiveType)}\n` +
            `⭐ Cấp: **${petRow.level}** / ${def.maxLevel} · ${RARITY_LABEL[def.rarity]}\n` +
            `${describePetRole(petId)}`
          ),
      ],
    });
    return;
  }

  // ── /pet feed ──────────────────────────────────────────────────────────
  if (sub === 'feed') {
    if (petRow.level >= def.maxLevel) {
      await i.editReply({ embeds: [new EmbedBuilder().setColor(COLORS.warning).setDescription(`${def.icon} **${def.name}** đã đạt cấp tối đa (Lv.**${def.maxLevel}**)!`)] });
      return;
    }
    const cost = def.feedGold * petRow.level;
    if (player.gold < cost) {
      await i.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.warning)
            .setDescription(`❌ Cần **${cost.toLocaleString()}** gold để cho ${def.icon} **${def.name}** ăn.\nBạn chỉ có **${player.gold.toLocaleString()}** gold.`),
        ],
      });
      return;
    }

    db.prepare('UPDATE players SET gold=gold-? WHERE user_id=? AND guild_id=?').run(cost, userId, guildId);
    db.prepare('UPDATE player_pets SET level=level+1, exp=0 WHERE user_id=? AND guild_id=? AND pet_id=?').run(userId, guildId, petId);
    const newLv = petRow.level + 1;
    await i.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(RARITY_COLOR[def.rarity] ?? COLORS.info)
          .setTitle(`${def.icon} ${def.name} Tăng Cấp!`)
          .setDescription(
            `Lv.**${petRow.level}** → Lv.**${newLv}**\n` +
            `💰 -${cost.toLocaleString()} gold\n\n` +
            `📊 Passive: **+${petPassiveValue(def, newLv).toFixed(1)}%** ${passiveLabel(def.passiveType)}` +
            (newLv < def.maxLevel ? `\n💡 Cấp tiếp theo: ${def.feedGold * newLv} gold` : '\n✨ **Đã đạt cấp tối đa!**')
          ),
      ],
    });
    return;
  }

  // ── /pet release ───────────────────────────────────────────────────────
  if (sub === 'release') {
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId(`pet_release_confirm_${userId}`).setLabel('Thả thú cưng').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId(`pet_release_cancel_${userId}`).setLabel('Huỷ').setStyle(ButtonStyle.Secondary),
    );
    const confirmMsg = await i.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(COLORS.warning)
          .setTitle(`${def.icon} Thả ${def.name}?`)
          .setDescription(
            `Bạn sắp thả **${def.name}** (Lv.**${petRow.level}**) về tự nhiên.\n` +
            `Nhận lại: **${def.releaseItem}** x1\n\n` +
            `*Hành động này không thể hoàn tác!*`
          ),
      ],
      components: [row],
    });

    const btn = await confirmMsg.awaitMessageComponent({
      componentType: ComponentType.Button,
      filter: onlyUser(userId),
      time: 20_000,
    }).catch(() => null);

    if (!btn || btn.customId.includes('cancel')) {
      await i.editReply({ components: [] });
      return;
    }

    await btn.deferUpdate();

    if ((player as any).active_pet === petId) {
      db.prepare('UPDATE players SET active_pet=NULL WHERE user_id=? AND guild_id=?').run(userId, guildId);
    }
    db.prepare('DELETE FROM player_pets WHERE user_id=? AND guild_id=? AND pet_id=?').run(userId, guildId, petId);
    addItem(userId, guildId, def.releaseItem, 1);

    await btn.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(COLORS.info)
          .setTitle(`${def.icon} Đã Thả ${def.name}`)
          .setDescription(`**${def.name}** (Lv.${petRow.level}) đã trở về tự nhiên.\n📦 Nhận: **${def.releaseItem}** x1`),
      ],
      components: [],
    });
  }
}
