import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { COLORS } from '../utils/embeds';

export const data = new SlashCommandBuilder()
  .setName('help')
  .setDescription('Guide hướng dẫn cách chơi RPG bot');

export function buildHelpGuideEmbeds(): EmbedBuilder[] {
  const intro = new EmbedBuilder()
    .setColor(COLORS.magic)
    .setTitle('📘 RPG Bot Guide — Cách chơi nhanh')
    .setDescription(
      '**Mục tiêu:** tạo nhân vật, đi khám phá, sống sót, làm chapter, nhặt đồ, học skill và mạnh dần lên.\n\n' +
      '**Lệnh có thể dùng bằng 2 kiểu:**\n' +
      '• Slash: `/start`, `/explore`, `/profile`...\n' +
      '• Prefix nhanh: `rpg s`, `rpg e`, `rpg p`...\n\n' +
      '**Thứ tự nên chơi cho người mới:**\n' +
      '`/start` → `/chapter` → `/explore` → `/inventory` → `/craft` → `/profile`'
    )
    .addFields(
      {
        name: '🚀 Bắt đầu',
        value:
          '`/start` hoặc `rpg s` — tạo nhân vật / hồi sinh nếu đã chết\n' +
          '`/profile` hoặc `rpg p` — xem chỉ số, cộng STR/VIT/END/AGI/LUK, level, gold, trang bị\n' +
          '`/chapter` hoặc `rpg ch` — xem nhiệm vụ cốt truyện chính',
        inline: false,
      },
      {
        name: '🗺️ Gameplay chính',
        value:
          '`/explore` hoặc `rpg e` — đi khám phá, gặp quái, event, loot, chapter event\n' +
          '`/daily` hoặc `rpg d` — làm nhiệm vụ ngày để nhận thưởng\n' +
          '`/world` hoặc `rpg w` — xem trạng thái thế giới/server',
        inline: false,
      },
      {
        name: '⚠️ Lưu ý quan trọng',
        value:
          'Game đang theo hướng sinh tồn RPG: quái thường cũng nguy hiểm, chạy trốn không chắc chắn, chết sẽ đau.\n' +
          'Khi chết/reset: mất inventory, mất đồ đang equip, mất skill loadout; skill đã học vẫn nằm trong Skill Pool.',
        inline: false,
      },
    )
    .setFooter({ text: 'Tip: người mới nên bám /chapter để biết nên làm gì tiếp theo.' });

  const combat = new EmbedBuilder()
    .setColor(COLORS.danger)
    .setTitle('⚔️ Chiến đấu & sinh tồn')
    .setDescription(
      'Khi explore, bạn có thể gặp quái thường, ambush, miniboss, boss hoặc event đặc biệt. Đừng coi mobs thường là bao cát — chúng có thể làm hao HP/MP/potion rất nhanh.'
    )
    .addFields(
      {
        name: 'Trong combat',
        value:
          '• **Attack**: đánh thường\n' +
          '• **Skill**: dùng skill trong loadout\n' +
          '• **Item**: dùng potion/vật phẩm\n' +
          '• **Flee**: chạy trốn, tỉ lệ tăng dần theo lần thử',
        inline: false,
      },
      {
        name: 'Chết thì sao?',
        value:
          '• Nhân vật chết cần `/start` để hồi sinh/reset\n' +
          '• Mất inventory và đồ đang equip\n' +
          '• Skill loadout bị xoá\n' +
          '• Skill Pool vẫn giữ, nhưng muốn gắn lại skill cần tốn gold + Soul Shard',
        inline: false,
      },
      {
        name: 'Mẹo sống sót early game',
        value:
          '• Đừng spam explore khi HP thấp\n' +
          '• Giữ potion cho combat khó\n' +
          '• Gặp nhóm quái đông thì cân nhắc chạy sớm\n' +
          '• Ưu tiên làm chapter/daily thay vì chỉ farm quái thường',
        inline: false,
      },
    );

  const progression = new EmbedBuilder()
    .setColor(COLORS.gold)
    .setTitle('📈 Progression — mạnh lên bằng cách nào?')
    .addFields(
      {
        name: '🧬 Level & Stats',
        value:
          'Mỗi lần lên level nhận **+3 Stat Points**. Mở `/profile` để cộng điểm bằng nút: **STR** tăng ATK, **VIT** tăng HP, **END** tăng DEF, **AGI** tăng crit/dodge, **LUK** tăng gold/drop. Có **1 lần reset stats miễn phí** sau update.',
        inline: false,
      },
      {
        name: '🎒 Đồ & vật phẩm',
        value:
          '`/inventory` hoặc `rpg i` — xem túi đồ, equip gear, quản lý skill pool/loadout\n' +
          '`/use <item_id>` hoặc `rpg u <item_id>` — dùng vật phẩm\n' +
          '`/craft` hoặc `rpg c` — chế tạo trang bị/vật phẩm từ nguyên liệu',
        inline: false,
      },
      {
        name: '📖 Chapter & event cốt truyện',
        value:
          '`/chapter` cho biết objective hiện tại. Khi hoàn thành objective, lần explore sau có thể kích hoạt **chapter lore/event/mini game** để mở nhiệm vụ tiếp theo.',
        inline: false,
      },
      {
        name: '🐾 Pet, party, guild',
        value:
          '`/pet` — xem pet, feed/equip, pet EXP và vai trò sau combat\n' +
          '`/party` hoặc `rpg pt` — lập party để đi cùng người khác\n' +
          '`/guild` — hệ thống guild/clan',
        inline: false,
      },
      {
        name: '🏆 Nội dung nâng cao',
        value:
          '`/achievements` hoặc `rpg a` — thành tựu\n' +
          '`/worldboss` hoặc `rpg wb` — world boss\n' +
          '`/duel @user` — PvP\n' +
          '`/prestige` — prestige khi đủ điều kiện\n' +
          '`/code <code>` — nhập giftcode',
        inline: false,
      },
    );

  const commands = new EmbedBuilder()
    .setColor(COLORS.info)
    .setTitle('⌨️ Bảng lệnh nhanh')
    .setDescription(
      '**Prefix thường dùng:**\n' +
      '`rpg s` — start/hồi sinh\n' +
      '`rpg p` — profile\n' +
      '`rpg e` — explore\n' +
      '`rpg i` — inventory\n' +
      '`rpg ch` — chapter\n' +
      '`rpg c` — craft\n' +
      '`rpg d` — daily\n' +
      '`rpg w` — world\n' +
      '`rpg pt` — party\n' +
      '`🏛️ Hội Quán trong làng` — tiến hoá class, faction, cổ thư/pet role\n`rpg code <code>` — nhập code\n\n' +
      '**Lệnh có tham số:**\n' +
      '`rpg p @user` — xem profile người khác\n' +
      '`rpg u <item_id>` — dùng item\n' +
      '`rpg t @user <gold>` — chuyển gold\n' +
      '`rpg duel @user` — thách đấu\n' +
      '`rpg pt create/invite/leave/kick/disband` — quản lý party'
    )
    .setFooter({ text: 'Dùng /help hoặc rpg help để mở lại guide này.' });

  return [intro, combat, progression, commands];
}

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();
  await interaction.editReply({ embeds: buildHelpGuideEmbeds() });
}
