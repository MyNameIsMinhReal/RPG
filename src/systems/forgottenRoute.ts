import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  ComponentType,
  Message,
} from 'discord.js';
import { addItem, addPet, getItemQty, getPlayer, removeItem, updatePlayerHpMp } from './player';
import { COLORS } from '../utils/embeds';
import { onlyUser } from '../utils/collectors';
import { attachContinueExploreHandler, buildContinueExploreRow, simpleEmbed } from './explore/shared';

export const FORGOTTEN_ROUTE = {
  zoneId: 'wastes',
  bossId: 'the_forgotten',
  beaconItemId: 'abyss_core',
  beaconCost: 3,
  anchorItemId: 'memory_lantern',
  firstClearFlag: (userId: string) => `forgotten_route_first_clear_${userId}`,
};

export const FORGOTTEN_STARTING_EFFECTS = [
  { name: 'memory_lantern', duration: 999, value: 15, target: 'player' as const },
  { name: 'void_shell', duration: 999, value: 1, target: 'enemy' as const },
];

type StartBossFight = () => Promise<void>;

const MAZE_STEPS = [
  {
    title: 'Mê Cung Tinh Tú · Bước 1/3',
    text: 'Không gian gãy thành ba đường. Không đường nào có mặt đất thật sự.',
    options: [
      { key: 'left', emoji: '◀️', label: 'Khối hình học méo mó' },
      { key: 'middle', emoji: '🟣', label: 'Ánh sáng tím rực rỡ' },
      { key: 'right', emoji: '💨', label: 'Tiếng thở dài' },
    ],
    correct: 'middle',
  },
  {
    title: 'Mê Cung Tinh Tú · Bước 2/3',
    text: 'Một vùng trời không có bầu trời. Những vật thể lơ lửng gọi bạn bằng giọng rất quen.',
    options: [
      { key: 'left', emoji: '⭐', label: 'Mảnh sao đang rơi' },
      { key: 'middle', emoji: '🚪', label: 'Cánh cửa không bóng' },
      { key: 'right', emoji: '✋', label: 'Bàn tay không tên' },
    ],
    correct: 'left',
  },
  {
    title: 'Mê Cung Tinh Tú · Bước 3/3',
    text: 'Ở cuối mê cung, mọi ký ức đều trở thành tro. Chỉ một vệt sáng còn nhớ đường về.',
    options: [
      { key: 'left', emoji: '🌠', label: 'Vệt sáng cuối chân trời' },
      { key: 'middle', emoji: '👑', label: 'Chiếc ngai đổ nát' },
      { key: 'right', emoji: '🎭', label: 'Mặt nạ khóc' },
    ],
    correct: 'left',
  },
] as const;

function hasBeacons(userId: string, guildId: string): boolean {
  return getItemQty(userId, guildId, FORGOTTEN_ROUTE.beaconItemId) >= FORGOTTEN_ROUTE.beaconCost;
}

function hasAnchor(userId: string, guildId: string): boolean {
  return getItemQty(userId, guildId, FORGOTTEN_ROUTE.anchorItemId) > 0;
}

export function canShowForgottenRift(userId: string, guildId: string, zoneId: string): boolean {
  return zoneId === FORGOTTEN_ROUTE.zoneId && hasBeacons(userId, guildId);
}

async function finishWithContinue(
  interaction: ChatInputCommandInteraction,
  userId: string,
  guildId: string,
  embed: EmbedBuilder
): Promise<void> {
  const reply = await interaction.editReply({ embeds: [embed], components: buildContinueExploreRow(userId) });
  attachContinueExploreHandler(reply as Message<boolean>, interaction, userId, guildId);
}

async function punishWrongMazeChoice(
  interaction: ChatInputCommandInteraction,
  userId: string,
  guildId: string,
  wrongLabel: string
): Promise<void> {
  const player = getPlayer(userId, guildId)!;
  const dmg = Math.max(1, Math.floor(player.max_hp * 0.50));
  const hp = Math.max(1, player.hp - dmg);
  updatePlayerHpMp(userId, guildId, hp, player.mp);

  await finishWithContinue(
    interaction,
    userId,
    guildId,
    new EmbedBuilder()
      .setColor(COLORS.danger)
      .setTitle('🌌 Mê Cung Từ Chối Bạn')
      .setDescription(
        `Bạn chọn **${wrongLabel}**.\n\n` +
        'Không gian lập tức gập lại như một tờ giấy cháy. Đèn Lồng Ký Ức rung lên dữ dội, nhưng không kịp giữ bạn lại.\n\n' +
        `💔 Bạn bị quăng khỏi Rạn Nứt Không Gian và mất **${dmg} HP**. (${hp}/${player.max_hp})\n` +
        `⚫ **${FORGOTTEN_ROUTE.beaconCost}× Abyss Core** đã cháy hết khi tọa độ sụp đổ.\n\n` +
        '*Bạn phải dựng lại tọa độ nếu muốn thử lần nữa.*'
      )
  );
}

async function showMazeStep(
  interaction: ChatInputCommandInteraction,
  userId: string,
  guildId: string,
  stepIndex: number,
  startBossFight: StartBossFight
): Promise<void> {
  const step = MAZE_STEPS[stepIndex];
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    ...step.options.map(opt => new ButtonBuilder()
      .setCustomId(`forgotten_maze_${stepIndex}_${opt.key}_${userId}`)
      .setEmoji(opt.emoji)
      .setLabel(opt.label)
      .setStyle(ButtonStyle.Secondary)
    )
  );

  const embed = new EmbedBuilder()
    .setColor(0x2B003F)
    .setTitle(`🧭 ${step.title}`)
    .setDescription(
      `${step.text}\n\n` +
      'Đèn Lồng Ký Ức cháy bằng một ngọn lửa không có nhiệt. Trong bóng tối, một luật duy nhất còn nguyên:\n\n' +
      '> **Hãy đi theo thứ còn nhớ ánh sáng của sao rơi.**'
    );

  const reply = await interaction.editReply({ embeds: [embed], components: [row] });
  const btn = await reply.awaitMessageComponent({
    componentType: ComponentType.Button,
    filter: onlyUser(userId),
    time: 45_000,
  }).catch(() => null);

  if (!btn) {
    await finishWithContinue(
      interaction,
      userId,
      guildId,
      simpleEmbed(COLORS.warning, '🌌 Bạn đứng quá lâu giữa mê cung. Các vì sao tắt dần, và Rạn Nứt nhả bạn trở lại Hoang Nguyên.')
    );
    return;
  }

  const ok = await btn.deferUpdate().then(() => true).catch(() => false);
  if (!ok) return;

  const choice = btn.customId.replace(`forgotten_maze_${stepIndex}_`, '').replace(`_${userId}`, '');
  const chosen = step.options.find(opt => opt.key === choice);
  if (choice !== step.correct) {
    await punishWrongMazeChoice(interaction, userId, guildId, chosen?.label ?? 'một ngã rẽ sai');
    return;
  }

  if (stepIndex < MAZE_STEPS.length - 1) {
    await showMazeStep(interaction, userId, guildId, stepIndex + 1, startBossFight);
    return;
  }

  await interaction.editReply({
    embeds: [new EmbedBuilder()
      .setColor(0x0B0014)
      .setTitle('💀 The Forgotten Nhớ Ra Bạn')
      .setDescription(
        'Vệt sáng cuối cùng mở ra thành một bầu trời không có trăng.\n\n' +
        'Một bóng người đứng giữa những mảnh sao rơi. Không có mặt. Không có tên. Chỉ có cảm giác rằng thế giới đã cố quên hắn quá lâu.\n\n' +
        '**The Forgotten** quay đầu lại.\n\n' +
        '> “Ngươi đã mang theo mỏ neo. Vậy hãy thử nhớ mình là ai.”'
      )],
    components: [],
  });

  await new Promise(resolve => setTimeout(resolve, 800));
  await startBossFight();
}

export async function showForgottenRiftNode(
  interaction: ChatInputCommandInteraction,
  userId: string,
  guildId: string,
  startBossFight: StartBossFight
): Promise<void> {
  const player = getPlayer(userId, guildId)!;
  const coreQty = getItemQty(userId, guildId, FORGOTTEN_ROUTE.beaconItemId);
  const lanternQty = getItemQty(userId, guildId, FORGOTTEN_ROUTE.anchorItemId);

  const canEnter = coreQty >= FORGOTTEN_ROUTE.beaconCost && lanternQty > 0;
  const row = new ActionRowBuilder<ButtonBuilder>();

  if (canEnter) {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`forgotten_enter_${userId}`)
        .setEmoji('🪔')
        .setLabel('Bước vào bằng Đèn Lồng')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(`forgotten_leave_${userId}`)
        .setEmoji('🚶')
        .setLabel('Rời đi')
        .setStyle(ButtonStyle.Secondary)
    );
  } else {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`forgotten_touch_${userId}`)
        .setEmoji('🌌')
        .setLabel('Chạm thử')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(`forgotten_leave_${userId}`)
        .setEmoji('🚶')
        .setLabel('Rời đi')
        .setStyle(ButtonStyle.Secondary)
    );
  }

  const embed = new EmbedBuilder()
    .setColor(0x130012)
    .setTitle('🌌 Rạn Nứt Không Gian')
    .setDescription(
      'Không khí trước mặt bạn bị xé ra như một tấm vải mục.\n\n' +
      'Bên trong khe nứt ấy không có bóng tối. Cũng không có ánh sáng. Chỉ có những mảnh ký ức trôi lơ lửng và một tiếng gọi rất khẽ:\n\n' +
      '> “Ngươi đã tìm đủ tọa độ. Giờ hãy nhớ đường quay về.”\n\n' +
      `⚫ Abyss Core: **${coreQty}/${FORGOTTEN_ROUTE.beaconCost}**\n` +
      `🪔 Đèn Lồng Ký Ức: **${lanternQty > 0 ? 'Đã có' : 'Chưa có'}**\n\n` +
      (canEnter
        ? 'Đèn Lồng Ký Ức trong túi bạn bỗng sáng lên. Ngọn lửa bên trong không cháy bằng dầu, mà bằng những cái tên chưa bị lãng quên.'
        : 'Bạn cảm giác chỉ cần bước thêm một bước, một phần nào đó của mình sẽ bị xóa khỏi thế giới.')
    );

  const reply = await interaction.editReply({ embeds: [embed], components: [row] });
  const btn = await reply.awaitMessageComponent({
    componentType: ComponentType.Button,
    filter: onlyUser(userId),
    time: 45_000,
  }).catch(() => null);

  if (!btn) {
    await interaction.editReply({ components: [] }).catch(() => {});
    return;
  }

  const ok = await btn.deferUpdate().then(() => true).catch(() => false);
  if (!ok) return;

  if (btn.customId === `forgotten_leave_${userId}`) {
    await finishWithContinue(
      interaction,
      userId,
      guildId,
      simpleEmbed(COLORS.info, '🚶 Bạn rời khỏi Rạn Nứt. Nó vẫn treo lơ lửng phía sau, như một con mắt không có mí.')
    );
    return;
  }

  if (btn.customId === `forgotten_touch_${userId}`) {
    const dmg = Math.max(1, Math.floor(player.max_hp * 0.30));
    const hp = Math.max(1, player.hp - dmg);
    updatePlayerHpMp(userId, guildId, hp, player.mp);
    await finishWithContinue(
      interaction,
      userId,
      guildId,
      new EmbedBuilder()
        .setColor(COLORS.danger)
        .setTitle('🫥 Bạn Quên Mất Cách Hít Thở')
        .setDescription(
          'Bạn vừa đặt tay lên rạn nứt.\n\n' +
          'Trong khoảnh khắc đó, bạn quên mất tên mình. Quên vì sao mình đến đây. Quên cả cách hít thở.\n\n' +
          `💔 Mất **${dmg} HP**. (${hp}/${player.max_hp})\n\n` +
          'Có lẽ bạn cần một thứ gì đó để **neo bản thân lại với thực tại**.'
        )
    );
    return;
  }

  if (!removeItem(userId, guildId, FORGOTTEN_ROUTE.beaconItemId, FORGOTTEN_ROUTE.beaconCost)) {
    await finishWithContinue(
      interaction,
      userId,
      guildId,
      simpleEmbed(COLORS.warning, '⚫ Abyss Core trong túi bạn không còn đủ. Rạn nứt khép lại trước khi tọa độ được dựng xong.')
    );
    return;
  }

  await showMazeStep(interaction, userId, guildId, 0, startBossFight);
}

export function awardForgottenRouteRewards(userId: string, guildId: string): string[] {
  const lines: string[] = [];
  // Route-exclusive reward layer. The boss definition already guarantees Fallen Star Fragment.

  if (Math.random() < 0.35) {
    addItem(userId, guildId, 'lost_memory', 1);
    lines.push('🫥 **Lost Memory** ×1 *(hiếm)*');
  }

  if (Math.random() < 0.05) {
    const added = addPet(userId, guildId, 'void_beast');
    lines.push(added ? '🐈‍⬛ **Void Beast** đã đi theo bạn! *(5% pet drop)*' : '🐈‍⬛ **Void Beast** xuất hiện, nhưng bạn đã sở hữu nó rồi.');
  }

  return lines;
}
