import type { ChapterReward } from './chapters';

export type ChapterExploreActionKind = 'lore_only' | 'choice' | 'track_minigame';
export type ChapterButtonStyle = 'primary' | 'secondary' | 'success' | 'danger';
export type TrackDirection = 'left' | 'center' | 'right';

export type ChapterEventEffect =
  | { type: 'gold'; min: number; max: number }
  | { type: 'exp'; min: number; max: number }
  | { type: 'soul_shards'; amount: number }
  | { type: 'item'; itemId: string; min?: number; max?: number }
  | { type: 'damage_percent'; min: number; max: number }
  | { type: 'heal_percent'; min: number; max: number }
  | { type: 'mp_percent'; min: number; max: number }
  | { type: 'reputation'; amount: number };

export interface ChapterChoiceOption {
  id: string;
  label: string;
  emoji?: string;
  style?: ChapterButtonStyle;
  text: string;
  effects?: ChapterEventEffect[];
}

export interface ChapterExploreEventDef {
  id: string;
  chapterId: number;
  title: string;
  color?: number;
  lore: string;
  continueLabel?: string;
  continueEmoji?: string;
  action:
    | {
        type: 'lore_only';
        title?: string;
        text: string;
        effects?: ChapterEventEffect[];
      }
    | {
        type: 'choice';
        title: string;
        description: string;
        choices: ChapterChoiceOption[];
      }
    | {
        type: 'track_minigame';
        title: string;
        description: string;
        sequence: TrackDirection[];
        requiredCorrect: number;
        successText: string;
        failureText: string;
        successEffects?: ChapterEventEffect[];
        failureEffects?: ChapterEventEffect[];
        completeOnFailure?: boolean;
      };
}

export const CHAPTER_EXPLORE_EVENTS: ChapterExploreEventDef[] = [
  {
    id: 'ch1_blood_trail_after_oak',
    chapterId: 1,
    title: '🌲 Tiếng Hú Sau Rừng Đen',
    color: 0x2e8b57,
    lore:
      'Ancient Oak đổ xuống, rễ cây khổng lồ co lại như những ngón tay chết.\n\n' +
      'Tưởng như khu rừng sẽ yên lặng, nhưng từ sâu trong màn sương vang lên một tiếng hú trầm hơn mọi con sói bạn từng gặp.\n' +
      'Trên mặt đất, một vệt máu đen bò ngược về phía rừng sâu...',
    continueLabel: 'Đi theo vệt máu',
    continueEmoji: '🐾',
    action: {
      type: 'track_minigame',
      title: '🐾 Lần Theo Dấu Máu',
      description:
        'Vệt máu tách ra qua nhiều bụi cây. Bạn phải chọn hướng đi trong 3 lần.\n' +
        'Chọn đúng ít nhất **2/3** lần để lần ra nơi tiếng hú bắt đầu.',
      sequence: ['left', 'center', 'right'],
      requiredCorrect: 2,
      successText:
        'Bạn lần ra một khoảng rừng bị xé toạc bởi móng vuốt khổng lồ. Trên đá có khắc ký hiệu của một ngôi đền cổ.\n\n' +
        'Con đường đến **Đền Cổ Hoang Phế** đã được hé lộ.',
      failureText:
        'Bạn mất dấu trong sương và bị gai đen cào rách tay. Dù vậy, tiếng hú cuối cùng vẫn chỉ về phía tây — nơi ngôi đền cổ đang thức giấc.',
      successEffects: [
        { type: 'exp', min: 18, max: 35 },
        { type: 'item', itemId: 'wolf_fang', min: 1, max: 1 },
      ],
      failureEffects: [
        { type: 'damage_percent', min: 8, max: 14 },
        { type: 'exp', min: 8, max: 15 },
      ],
      completeOnFailure: true,
    },
  },
  {
    id: 'ch2_rune_after_echo_demon',
    chapterId: 2,
    title: '⛩️ Sau Khi Tiếng Vọng Im Lặng',
    color: 0x8a2be2,
    lore:
      'Echo Demon tan thành một vòng tiếng vọng đen. Chiếc chuông khổng lồ phía sau phong ấn rung lên một lần duy nhất, nhưng không phát ra âm thanh.\n\n' +
      'Trên nền đá hiện ra ba ký hiệu cổ: **Mắt**, **Chuông**, và **Mỏ Neo**. Phong ấn đã mở đường xuống lòng núi, nhưng chỉ một phù văn dẫn tới lối an toàn.',
    continueLabel: 'Chạm vào phù văn',
    continueEmoji: '📜',
    action: {
      type: 'choice',
      title: '📜 Phù Văn Dẫn Xuống Hầm Mỏ',
      description: 'Bạn cần chọn phù văn cộng hưởng với tiếng chuông lặng để mở lối sang Zone 3.',
      choices: [
        {
          id: 'eye',
          label: 'Mắt Cổ',
          emoji: '👁️',
          style: 'secondary',
          text: 'Mắt Cổ mở ra và cho bạn thấy hàng trăm đường hầm tối dưới lòng núi. Tầm nhìn quá mạnh khiến bạn choáng váng, nhưng bạn hiểu nơi cần đến tiếp theo.',
          effects: [
            { type: 'damage_percent', min: 5, max: 10 },
            { type: 'exp', min: 15, max: 25 },
          ],
        },
        {
          id: 'bell',
          label: 'Chuông Lặng',
          emoji: '🔔',
          style: 'success',
          text: 'Bạn chạm vào Chuông Lặng. Âm thanh không vang trong tai, mà vang trong xương. Một cánh cửa đá mở ra, để lộ bản đồ dẫn xuống hầm mỏ bị nguyền.',
          effects: [
            { type: 'exp', min: 25, max: 45 },
            { type: 'item', itemId: 'mana_crystal', min: 1, max: 1 },
          ],
        },
        {
          id: 'anchor',
          label: 'Mỏ Neo Đen',
          emoji: '⚓',
          style: 'danger',
          text: 'Mỏ Neo Đen kéo bóng bạn dính chặt xuống nền đá. Bạn phải tự xé mình ra khỏi lời nguyền, nhưng bên dưới cái bóng là một mảnh quặng lạ.',
          effects: [
            { type: 'damage_percent', min: 10, max: 16 },
            { type: 'item', itemId: 'black_iron', min: 1, max: 1 },
          ],
        },
      ],
    },
  },
  {
    id: 'ch3_echo_rail_after_colossus',
    chapterId: 3,
    title: '⛏️ Đường Ray Dưới Xác Khổng Lồ',
    color: 0x8b6f47,
    lore:
      'Mine Colossus gục xuống, thân đá nứt ra như một quả núi nhỏ. Bên dưới lớp ngực rỗng của nó là một đường ray cũ kéo dài vào bóng tối.\n\n' +
      'Từ sâu trong đường hầm, có tiếng bánh sắt lăn dù không hề có xe.',
    continueLabel: 'Bước xuống đường ray',
    continueEmoji: '🛤️',
    action: {
      type: 'track_minigame',
      title: '🛤️ Chuyến Xe Không Người Lái',
      description:
        'Một chiếc xe mỏ vô hình lao tới trong bóng tối. Bạn phải né qua 3 đoạn ray bị gãy.\n' +
        'Chọn đúng ít nhất **2/3** lần để thoát khỏi hầm sập.',
      sequence: ['right', 'left', 'center'],
      requiredCorrect: 2,
      successText:
        'Bạn vượt qua đoạn ray cuối cùng đúng lúc trần hầm sụp xuống sau lưng. Khi bụi tan, trước mặt bạn là bầu trời xám của Hoang Nguyên Tiếng Vọng.',
      failureText:
        'Bạn bị hất văng khỏi đường ray, vai đập vào đá. Dù vậy, cú va chạm làm lộ ra một lối thoát dẫn thẳng tới vùng hoang nguyên.',
      successEffects: [
        { type: 'gold', min: 25, max: 60 },
        { type: 'exp', min: 25, max: 45 },
      ],
      failureEffects: [
        { type: 'damage_percent', min: 12, max: 20 },
        { type: 'item', itemId: 'rusty_gear', min: 1, max: 2 },
      ],
      completeOnFailure: true,
    },
  },
  {
    id: 'ch4_final_echo_after_forgotten',
    chapterId: 4,
    title: '🌌 Tiếng Vọng Cuối Cùng',
    color: 0x4b0082,
    lore:
      'The Forgotten tan biến, nhưng không để lại xác. Chỉ còn một khoảng trống hình người giữa không khí.\n\n' +
      'Từ khoảng trống đó, bạn nghe thấy giọng nói của chính mình ở rất xa: “Nếu thế giới này được cứu, ai sẽ nhớ đến những lần ta đã chết?”',
    continueLabel: 'Bước vào tiếng vọng',
    continueEmoji: '🌌',
    action: {
      type: 'choice',
      title: '🌌 Lựa Chọn Sau Cùng',
      description: 'Tiếng vọng đòi bạn để lại một câu trả lời trước khi khép lại cốt truyện.',
      choices: [
        {
          id: 'remember_dead',
          label: 'Nhớ những người đã ngã xuống',
          emoji: '🕯️',
          style: 'success',
          text: 'Bạn khắc tên những kẻ đã ngã xuống vào rìa thế giới. Tiếng vọng dịu lại, như thể cuối cùng đã có người lắng nghe.',
          effects: [{ type: 'reputation', amount: 8 }],
        },
        {
          id: 'take_power',
          label: 'Giữ lấy sức mạnh còn sót lại',
          emoji: '💠',
          style: 'danger',
          text: 'Bạn nắm lấy phần sức mạnh cuối cùng của The Forgotten. Nó lạnh như tro, nhưng nghe lời.',
          effects: [{ type: 'soul_shards', amount: 1 }],
        },
        {
          id: 'walk_away',
          label: 'Im lặng rời đi',
          emoji: '🚶',
          style: 'secondary',
          text: 'Bạn không trả lời. Có những hành trình không cần lời kết, chỉ cần còn người bước tiếp.',
          effects: [{ type: 'exp', min: 30, max: 60 }],
        },
      ],
    },
  },
];

export function getChapterExploreEvent(id: string): ChapterExploreEventDef | undefined {
  return CHAPTER_EXPLORE_EVENTS.find(e => e.id === id);
}

export function getChapterExploreEventForChapter(chapterId: number): ChapterExploreEventDef | undefined {
  return CHAPTER_EXPLORE_EVENTS.find(e => e.chapterId === chapterId);
}

export function describeChapterReward(reward: ChapterReward): string {
  return [
    reward.gold ? `🪙 +**${reward.gold} Gold**` : null,
    reward.exp ? `⭐ +**${reward.exp} EXP**` : null,
    reward.shards ? `💀 +**${reward.shards} Soul Shards**` : null,
    reward.titleId ? `🏷️ Danh hiệu mới` : null,
  ].filter(Boolean).join('\n');
}
