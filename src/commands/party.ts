import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import {
  createParty, disbandParty, addMember, removeMember,
  getPartyOf, getPartyMembers, isPartyLeader
} from '../systems/party';
import { getPlayer, applyPassiveStats } from '../systems/player';
import { COLORS } from '../utils/embeds';

export const data = new SlashCommandBuilder()
  .setName('party')
  .setDescription('Quản lý party khám phá (tối đa 4 người)')
  .addSubcommand(sc => sc
    .setName('create')
    .setDescription('Tạo party mới')
  )
  .addSubcommand(sc => sc
    .setName('invite')
    .setDescription('Mời người vào party (chỉ leader)')
    .addUserOption(opt => opt.setName('member').setDescription('Người cần mời').setRequired(true))
  )
  .addSubcommand(sc => sc
    .setName('leave')
    .setDescription('Rời party hiện tại')
  )
  .addSubcommand(sc => sc
    .setName('kick')
    .setDescription('Đuổi thành viên (chỉ leader)')
    .addUserOption(opt => opt.setName('member').setDescription('Thành viên cần đuổi').setRequired(true))
  )
  .addSubcommand(sc => sc
    .setName('disband')
    .setDescription('Giải tán party (chỉ leader)')
  )
  .addSubcommand(sc => sc
    .setName('info')
    .setDescription('Xem thông tin party hiện tại')
  );

function se(color: number, desc: string) {
  return new EmbedBuilder().setColor(color).setDescription(desc);
}

function memberListText(guildId: string, leaderId: string, memberIds: string[]): string {
  return memberIds.map(id => {
    const raw = getPlayer(id, guildId);
    const p = raw ? applyPassiveStats(raw) : null;
    const role = id === leaderId ? '👑' : '⚔️';
    return `${role} **${p?.name ?? id}** Lv.${p?.level ?? '?'} — ❤️ ${p?.hp ?? 0}/${p?.max_hp ?? 0} HP`;
  }).join('\n');
}

async function safeDeferButton(btn: any): Promise<boolean> {
  return btn.deferUpdate().then(() => true).catch(() => false);
}

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const userId  = interaction.user.id;
  const guildId = interaction.guildId!;
  const sub     = interaction.options.getSubcommand();

  // Invite phải là tin nhắn công khai, nếu để ephemeral thì người được mời không thấy nút Accept.
  if (sub === 'invite') await interaction.deferReply();
  else await interaction.deferReply({ flags: 64 });

  const player = getPlayer(userId, guildId);
  if (!player || !player.alive) {
    await interaction.editReply({ embeds: [se(COLORS.warning, '❌ Bạn cần có nhân vật sống để dùng party!')] });
    return;
  }

  // ── /party create ──────────────────────────────────────────────────────────
  if (sub === 'create') {
    if (getPartyOf(guildId, userId)) {
      await interaction.editReply({ embeds: [se(COLORS.warning, '❌ Bạn đang trong party rồi. Dùng `/party leave` hoặc `/party disband` trước.')] });
      return;
    }
    createParty(guildId, userId);
    await interaction.editReply({
      embeds: [new EmbedBuilder()
        .setColor(COLORS.success)
        .setTitle('⚔️ Party Đã Tạo!')
        .setDescription(
          `**${player.name}** đã tạo party mới.\n\n` +
          `Dùng \`/party invite @người\` để mời tối đa 3 thành viên nữa.\n` +
          `Khi sẵn sàng, leader dùng \`/explore\` để khám phá cùng nhau!`
        )
        .setFooter({ text: '1/4 thành viên' })
      ]
    });
    return;
  }

  // ── /party invite ──────────────────────────────────────────────────────────
  if (sub === 'invite') {
    const party = getPartyOf(guildId, userId);
    if (!party || party.leaderId !== userId) {
      await interaction.editReply({ embeds: [se(COLORS.warning, '❌ Chỉ leader party mới có thể mời. Tạo party với `/party create`.')] });
      return;
    }
    if (party.memberIds.length >= 4) {
      await interaction.editReply({ embeds: [se(COLORS.warning, '❌ Party đã đủ 4 người!')] });
      return;
    }

    const invitee = interaction.options.getUser('member', true);
    if (invitee.id === userId) {
      await interaction.editReply({ embeds: [se(COLORS.warning, '❌ Không thể tự mời bản thân.')] });
      return;
    }
    if (party.memberIds.includes(invitee.id)) {
      await interaction.editReply({ embeds: [se(COLORS.warning, `❌ Người này đã trong party rồi.`)] });
      return;
    }
    if (getPartyOf(guildId, invitee.id)) {
      await interaction.editReply({ embeds: [se(COLORS.warning, `❌ Người này đang trong party khác.`)] });
      return;
    }
    const inviteePlayer = getPlayer(invitee.id, guildId);
    if (!inviteePlayer || !inviteePlayer.alive) {
      await interaction.editReply({ embeds: [se(COLORS.warning, `❌ **${invitee.displayName}** chưa có nhân vật hoặc đã chết.`)] });
      return;
    }

    const inviteEmbed = new EmbedBuilder()
      .setColor(COLORS.info)
      .setTitle('⚔️ Lời Mời Party!')
      .setDescription(
        `${invitee} — **${player.name}** mời bạn vào party!\n\n` +
        `Nhấn **Chấp nhận** trong vòng 60 giây.`
      )
      .addFields(
        { name: '👑 Leader', value: `**${player.name}** Lv.${player.level}`, inline: true },
        { name: '👥 Thành viên', value: `${party.memberIds.length}/4`, inline: true }
      );

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`party_accept_${userId}_${invitee.id}`)
        .setLabel('Chấp nhận').setEmoji('✅').setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`party_decline_${userId}_${invitee.id}`)
        .setLabel('Từ chối').setEmoji('❌').setStyle(ButtonStyle.Secondary)
    );

    await interaction.editReply({ content: `${invitee}`, embeds: [inviteEmbed], components: [row] });
    const reply = await interaction.fetchReply();

    const btn = await reply.awaitMessageComponent({
      filter: i => i.user.id === invitee.id,
      time: 60_000
    }).catch(() => null);

    if (!btn) {
      await interaction.editReply({ embeds: [se(COLORS.info, '⏰ Lời mời đã hết hạn.')], components: [], content: '' });
      return;
    }
    const ok = await safeDeferButton(btn);
    if (!ok) {
      await interaction.editReply({ embeds: [se(COLORS.warning, '⚠️ Interaction lời mời đã hết hạn. Hãy mời lại.')], components: [], content: '' }).catch(() => {});
      return;
    }

    if (btn.customId === `party_decline_${userId}_${invitee.id}`) {
      await interaction.editReply({ embeds: [se(COLORS.info, `❌ **${inviteePlayer.name}** từ chối lời mời.`)], components: [], content: '' });
      return;
    }

    const result = addMember(guildId, userId, invitee.id);
    const errMsgs: Record<string, string> = {
      already_in_party: 'Bạn đang trong party khác rồi.',
      party_full: 'Party đã đầy!',
      no_party: 'Party không còn tồn tại.'
    };
    if (result !== 'ok') {
      await interaction.editReply({ embeds: [se(COLORS.warning, `❌ ${errMsgs[result]}`)], components: [], content: '' });
      return;
    }

    const updatedMembers = getPartyMembers(guildId, userId);
    await interaction.editReply({
      embeds: [new EmbedBuilder()
        .setColor(COLORS.success)
        .setTitle('✅ Đã Tham Gia Party!')
        .setDescription(`**${inviteePlayer.name}** đã vào party!\n\n${memberListText(guildId, userId, updatedMembers)}`)
        .setFooter({ text: `${updatedMembers.length}/4 thành viên` })
      ],
      components: [],
      content: ''
    });
    return;
  }

  // ── /party leave ───────────────────────────────────────────────────────────
  if (sub === 'leave') {
    const party = getPartyOf(guildId, userId);
    if (!party) {
      await interaction.editReply({ embeds: [se(COLORS.warning, '❌ Bạn không trong party nào.')] });
      return;
    }
    if (party.leaderId === userId) {
      disbandParty(guildId, userId);
      await interaction.editReply({ embeds: [se(COLORS.info, '🚪 Bạn rời party — party bị giải tán vì leader rời đi.')] });
    } else {
      removeMember(guildId, userId);
      await interaction.editReply({ embeds: [se(COLORS.info, `🚪 **${player.name}** đã rời party.`)] });
    }
    return;
  }

  // ── /party kick ────────────────────────────────────────────────────────────
  if (sub === 'kick') {
    const party = getPartyOf(guildId, userId);
    if (!party || party.leaderId !== userId) {
      await interaction.editReply({ embeds: [se(COLORS.warning, '❌ Chỉ leader party mới có thể đuổi người.')] });
      return;
    }
    const target = interaction.options.getUser('member', true);
    if (target.id === userId) {
      await interaction.editReply({ embeds: [se(COLORS.warning, '❌ Không thể tự đuổi mình. Dùng `/party disband` để giải tán.')] });
      return;
    }
    if (!party.memberIds.includes(target.id)) {
      await interaction.editReply({ embeds: [se(COLORS.warning, '❌ Người này không trong party của bạn.')] });
      return;
    }
    removeMember(guildId, target.id);
    const targetPlayer = getPlayer(target.id, guildId);
    await interaction.editReply({ embeds: [se(COLORS.info, `👢 **${targetPlayer?.name ?? target.displayName}** đã bị đuổi khỏi party.`)] });
    return;
  }

  // ── /party disband ─────────────────────────────────────────────────────────
  if (sub === 'disband') {
    if (!isPartyLeader(guildId, userId)) {
      await interaction.editReply({ embeds: [se(COLORS.warning, '❌ Chỉ leader party mới có thể giải tán.')] });
      return;
    }
    disbandParty(guildId, userId);
    await interaction.editReply({ embeds: [se(COLORS.info, '💥 Party đã được giải tán.')] });
    return;
  }

  // ── /party info ────────────────────────────────────────────────────────────
  if (sub === 'info') {
    const party = getPartyOf(guildId, userId);
    if (!party) {
      await interaction.editReply({
        embeds: [se(COLORS.info, '👥 Bạn không trong party nào.\n\nDùng `/party create` để tạo party mới!')]
      });
      return;
    }
    await interaction.editReply({
      embeds: [new EmbedBuilder()
        .setColor(COLORS.info)
        .setTitle('⚔️ Party')
        .setDescription(memberListText(guildId, party.leaderId, party.memberIds))
        .setFooter({ text: `${party.memberIds.length}/4 thành viên · Leader dùng /explore để khám phá cùng nhau` })
      ]
    });
    return;
  }
}
