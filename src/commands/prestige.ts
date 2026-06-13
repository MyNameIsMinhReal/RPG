import {
  SlashCommandBuilder, ChatInputCommandInteraction,
  EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType
} from 'discord.js';
import { getPlayer, resetPlayer, addRebirthBlessing, addPet } from '../systems/player';
import { CLASSES } from '../data/classes';
import { COLORS } from '../utils/embeds';

const PRESTIGE_MIN_LEVEL = 20;

export const data = new SlashCommandBuilder()
  .setName('prestige')
  .setDescription('Reset về Lv.1 để nhận Rebirth Blessing — bonus permanent mỗi lần');

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });
  const { id: userId } = interaction.user;
  const guildId = interaction.guildId!;
  const player  = getPlayer(userId, guildId);

  if (!player?.alive) {
    await interaction.editReply({ embeds: [new EmbedBuilder().setColor(COLORS.danger).setDescription('❌ Bạn cần đang sống để Prestige.')] });
    return;
  }
  if (player.level < PRESTIGE_MIN_LEVEL) {
    await interaction.editReply({
      embeds: [new EmbedBuilder().setColor(COLORS.warning)
        .setDescription(`⚠️ Cần ít nhất **Lv.${PRESTIGE_MIN_LEVEL}** để Prestige.\nHiện tại: **Lv.${player.level}**`)]
    });
    return;
  }

  const currentBlessing = (player as any).rebirth_blessing ?? 0;
  const cls = CLASSES[(player as any).class ?? 'warrior'] ?? CLASSES.warrior;
  const nextHp  = 100 + cls.hpBonus + (currentBlessing + 1) * 20;
  const nextMp  = 50  + cls.mpBonus + (currentBlessing + 1) * 10;
  const nextAtk = 10  + cls.atkBonus + (currentBlessing + 1) * 2;
  const nextDef = 5   + cls.defBonus + (currentBlessing + 1);

  const confirmEmbed = new EmbedBuilder()
    .setColor(COLORS.purple)
    .setTitle('✨ Prestige — Xác Nhận')
    .setDescription(
      `Bạn sắp reset nhân vật về **Lv.1**.\n\n` +
      `**MẤT:**\n> Level, EXP, Gold, Inventory (trừ trang bị đang đeo)\n\n` +
      `**GIỮ:**\n> Class · Trang bị đang đeo · Skill Pool · Soul Shards · Deaths\n\n` +
      `**NHẬN** (Rebirth Blessing #${currentBlessing + 1}):\n` +
      `> ❤️ **${nextHp} HP** · 💧 **${nextMp} MP** · ⚔️ **${nextAtk} ATK** · 🛡️ **${nextDef} DEF**\n` +
      `> 🪙 **${50 + (currentBlessing + 1) * 50} Gold** ban đầu\n\n` +
      `*Mỗi lần Prestige tích lũy, bonus càng lớn.*`
    )
    .setFooter({ text: `Class hiện tại: ${cls.icon} ${cls.name}` });

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId('prestige_confirm').setLabel('Xác nhận Prestige').setEmoji('✨').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('prestige_cancel').setLabel('Hủy').setStyle(ButtonStyle.Secondary)
  );

  const msg = await interaction.editReply({ embeds: [confirmEmbed], components: [row] });

  const btn = await msg.awaitMessageComponent({
    filter: i => i.user.id === userId,
    componentType: ComponentType.Button,
    time: 30_000
  }).catch(() => null);

  if (!btn || btn.customId === 'prestige_cancel') {
    await interaction.editReply({ embeds: [new EmbedBuilder().setColor(COLORS.warning).setDescription('❌ Hủy Prestige.')], components: [] });
    return;
  }

  await btn.deferUpdate();

  // Grant blessing first, then resetPlayer consumes 1 blessing for bonuses
  addRebirthBlessing(userId, guildId, 1);
  const spriteUnlocked = currentBlessing + 1 >= 3 ? addPet(userId, guildId, 'celestial_sprite') : false;
  resetPlayer(userId, guildId);
  const fresh = getPlayer(userId, guildId)!;

  await interaction.editReply({
    embeds: [new EmbedBuilder()
      .setColor(COLORS.purple)
      .setTitle('✨ Prestige Thành Công!')
      .setDescription(
        `${cls.icon} **${fresh.name}** đã được tái sinh!\n\n` +
        `> ❤️ **${fresh.max_hp} HP**  ·  💧 **${fresh.max_mp} MP**\n` +
        `> ⚔️ **${fresh.atk} ATK**  ·  🛡️ **${fresh.def} DEF**\n` +
        `> 🪙 **${fresh.gold} Gold** khởi đầu\n\n` +
        `Rebirth Blessing hiện tại: **${currentBlessing + 1}** lần ✦` +
        (spriteUnlocked ? `\n\n✨ **Celestial Sprite** đã gia nhập vì bạn Prestige lần 3+!` : '')
      )
      .setFooter({ text: `Lv.${PRESTIGE_MIN_LEVEL} để Prestige lần tiếp theo` })],
    components: []
  });
}

// Text-prefix aliases (auto-loaded by registry.ts)
export const aliases = ['pr'];
