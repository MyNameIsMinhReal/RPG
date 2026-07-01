import forestEventsJson from './events/forestEvents.json';
import wastesForgottenEventsJson from './events/wastesForgottenEvents.json';
import random50EventsJson from './events/random50Events.json';

export type DataDrivenExploreEventId = string;

export type DataButtonStyle = 'primary' | 'secondary' | 'success' | 'danger';
export type DataEventTime = 'dawn' | 'day' | 'dusk' | 'night';

export type DataEventAction =
  | { type: 'gold'; min: number; max: number }
  | { type: 'exp'; min: number; max: number }
  | { type: 'item'; itemId: string; min?: number; max?: number }
  | { type: 'consume_item'; itemId: string; amount?: number }
  | { type: 'corruption'; amount: number }
  | { type: 'damage_percent'; min: number; max: number }
  | { type: 'heal_percent'; min: number; max: number }
  | { type: 'mp_percent'; min: number; max: number }
  | { type: 'reputation'; amount: number }
  | { type: 'wanted'; amount: number }
  | { type: 'soul_shard'; amount: number }
  | { type: 'learn_random_skill'; tier: 't1' | 't2' | 't3' }
  | { type: 'world_danger'; amount: number }
  | { type: 'combat_random' }
  | { type: 'combat_enemy'; enemyId: string };

export interface DataEventOutcome {
  chance: number;
  text: string;
  actions?: DataEventAction[];
}

export interface DataEventRequirement {
  gold?: number;
  soulShards?: number;
  itemId?: string;
  minHpPercent?: number;
}

export interface DataEventChoice {
  id: string;
  label: string;
  emoji?: string;
  style?: DataButtonStyle;
  requires?: DataEventRequirement;
  outcomes: DataEventOutcome[];
}

export interface DataEventMiniGameOption {
  id: string;
  label: string;
  emoji?: string;
  style?: DataButtonStyle;
}

export interface DataEventMiniGameRound {
  prompt: string;
  correctOptionId: string;
  successLine?: string;
  failureLine?: string;
}

export interface DataEventMiniGame {
  title?: string;
  introText?: string;
  startLabel?: string;
  startEmoji?: string;
  startStyle?: DataButtonStyle;
  options: DataEventMiniGameOption[];
  rounds: DataEventMiniGameRound[];
  successNeeded?: number;
  successText: string;
  failureText: string;
  onSuccess?: DataEventAction[];
  onFailure?: DataEventAction[];
  timeoutText?: string;
}

export interface DataDrivenExploreEventDef {
  id: DataDrivenExploreEventId;
  title: string;
  description: string;
  color?: number;
  image?: string;
  weight: number;
  zones?: string[];
  minRep?: number;
  maxRep?: number;
  minWanted?: number;
  maxWanted?: number;
  times?: DataEventTime[];
  requiresCombat?: boolean;
  timeoutText?: string;
  choices?: DataEventChoice[];
  miniGame?: DataEventMiniGame;
}

const CODE_DRIVEN_EXPLORE_EVENTS: readonly DataDrivenExploreEventDef[] = [

  {
    id: 'dd_ancient_book_sage',
    title: '📖 Cổ Thư Biết Nói',
    description: 'Một cuốn cổ thư nằm mở giữa vòng nến xanh. Những dòng chữ tự dịch chuyển, như đang chờ ai đó đủ can đảm đọc tiếp.',
    color: 0x8b5cf6,
    image: 'mysterious',
    weight: 2,
    zones: ['forest', 'shrine', 'mines', 'wastes'],
    timeoutText: '📖 Cổ thư khép lại. Tiếng thì thầm biến mất trong gió.',
    choices: [
      {
        id: 'read',
        label: 'Đọc cổ thư',
        emoji: '📖',
        style: 'primary',
        outcomes: [
          { chance: 60, text: 'Cổ tự bừng sáng. Một kỹ năng xa lạ khắc thẳng vào ký ức của bạn.', actions: [{ type: 'learn_random_skill', tier: 't1' }, { type: 'exp', min: 8, max: 18 }] },
          { chance: 25, text: 'Cổ thư phản ứng mạnh hơn dự đoán. Bạn học được tri thức hiếm, nhưng lời nguyền cào qua da thịt.', actions: [{ type: 'learn_random_skill', tier: 't2' }, { type: 'damage_percent', min: 5, max: 10 }] },
          { chance: 15, text: 'Trang sách vỡ thành bụi. Bạn chỉ giữ lại được vài mảnh cổ tự còn đọc được.', actions: [{ type: 'item', itemId: 'ancient_book', min: 1, max: 1 }, { type: 'item', itemId: 'curse_shard', min: 1, max: 1 }] },
        ],
      },
      {
        id: 'seal',
        label: 'Niêm phong mang về',
        emoji: '🔒',
        style: 'success',
        outcomes: [
          { chance: 100, text: 'Bạn niêm phong cuốn sách lại. Có thể nghiên cứu nó an toàn hơn ở Hội Quán.', actions: [{ type: 'item', itemId: 'ancient_book', min: 1, max: 1 }, { type: 'item', itemId: 'curse_shard', min: 1, max: 1 }] },
        ],
      },
    ],
  },
  {
    id: 'dd_common_supply_cache',
    title: '📦 Hòm Tiếp Tế Bị Bỏ Lại',
    description: 'Bạn tìm thấy một hòm tiếp tế cũ bị phủ bụi. Dấu niêm phong đã nứt, nhưng bên trong vẫn còn vài thứ dùng được.',
    color: 0x9c7a3a,
    image: 'chest',
    weight: 3,
    timeoutText: '📦 Bạn bỏ qua chiếc hòm. Có thể chủ nhân của nó vẫn đang ở gần.',
    choices: [
      {
        id: 'open',
        label: 'Mở hòm',
        emoji: '📦',
        style: 'primary',
        outcomes: [
          { chance: 70, text: 'Bạn mở hòm và tìm được ít đồ tiếp tế còn dùng được.', actions: [{ type: 'gold', min: 5, max: 18 }, { type: 'item', itemId: 'bread', min: 1, max: 1 }] },
          { chance: 30, text: 'Hòm đã bị chuột và côn trùng phá nát. Bạn chỉ nhặt được chút kinh nghiệm lục soát.', actions: [{ type: 'exp', min: 4, max: 10 }] },
        ],
      },
      {
        id: 'mark',
        label: 'Đánh dấu vị trí',
        emoji: '📍',
        style: 'secondary',
        outcomes: [
          { chance: 100, text: 'Bạn đánh dấu vị trí để người khác có thể tìm thấy. Việc nhỏ này vẫn khiến dân quanh vùng nhớ đến bạn.', actions: [{ type: 'reputation', amount: 2 }, { type: 'exp', min: 4, max: 8 }] },
        ],
      },
    ],
  },
  {
    id: 'dd_common_bad_meal',
    title: '🍲 Bữa Ăn Bỏ Quên',
    description: 'Một nồi thức ăn vẫn còn âm ấm bên đống lửa tàn. Mùi thơm khá dễ chịu, nhưng không rõ nó đã ở đây bao lâu.',
    color: 0xb77b3b,
    image: 'camp',
    weight: 3,
    timeoutText: '🍲 Bạn quyết định không động vào nồi thức ăn lạ.',
    choices: [
      {
        id: 'eat',
        label: 'Ăn thử',
        emoji: '🍲',
        style: 'danger',
        outcomes: [
          { chance: 55, text: 'May mắn là thức ăn vẫn còn ổn. Bạn cảm thấy tỉnh táo hơn một chút.', actions: [{ type: 'heal_percent', min: 8, max: 14 }, { type: 'mp_percent', min: 5, max: 10 }] },
          { chance: 45, text: 'Bạn vừa nuốt xong thì bụng quặn lại. Không phải bữa ăn nào trong hoang dã cũng là quà tặng.', actions: [{ type: 'damage_percent', min: 7, max: 13 }, { type: 'exp', min: 3, max: 7 }] },
        ],
      },
      {
        id: 'pack',
        label: 'Gói lại mang đi',
        emoji: '🎒',
        style: 'primary',
        outcomes: [
          { chance: 100, text: 'Bạn lấy phần còn khô ráo nhất và gói lại cẩn thận.', actions: [{ type: 'item', itemId: 'bread', min: 1, max: 1 }] },
        ],
      },
    ],
  },
  {
    id: 'dd_common_cracked_lockbox',
    title: '🔐 Hộp Sắt Nứt Khóa',
    description: 'Một hộp sắt nhỏ nằm dưới gốc cây. Ổ khóa bị nứt nhưng vẫn đủ cứng để làm bạn mất thời gian.',
    color: 0x777777,
    image: 'loot',
    weight: 2,
    timeoutText: '🔐 Bạn để chiếc hộp lại. Không đáng để đứng lâu một chỗ.',
    choices: [
      {
        id: 'force',
        label: 'Cạy khóa',
        emoji: '🔧',
        style: 'primary',
        outcomes: [
          { chance: 65, text: 'Bạn cạy được khóa sau vài lần thử. Bên trong có ít tiền lẻ và vật dụng nhỏ.', actions: [{ type: 'gold', min: 8, max: 28 }, { type: 'item', itemId: 'rusty_gear', min: 1, max: 2 }] },
          { chance: 35, text: 'Khóa bật ngược làm xước tay bạn. Dù vậy, bạn học được cách xử lý loại khóa này.', actions: [{ type: 'damage_percent', min: 4, max: 8 }, { type: 'exp', min: 6, max: 14 }] },
        ],
      },
      {
        id: 'smash',
        label: 'Đập vỡ',
        emoji: '🪓',
        style: 'danger',
        outcomes: [
          { chance: 45, text: 'Bạn đập vỡ hộp, nhưng tiếng động kéo theo thứ gì đó gần đó.', actions: [{ type: 'combat_random' }] },
          { chance: 55, text: 'Chiếc hộp móp méo vỡ ra. Phần lớn đồ bên trong hỏng, nhưng còn chút vàng.', actions: [{ type: 'gold', min: 10, max: 22 }] },
        ],
      },
    ],
  },
  {
    id: 'dd_shrine_candle_rows',
    title: '🕯️ Hàng Nến Chưa Tắt',
    description: 'Một hàng nến vẫn cháy trong ngôi đền bỏ hoang. Không có gió, nhưng ngọn lửa nghiêng về phía bạn.',
    color: 0xc9a227,
    image: 'altar',
    weight: 3,
    zones: ['shrine'],
    timeoutText: '🕯️ Bạn rời đi trước khi những ngọn nến tắt cùng lúc.',
    choices: [
      { id: 'pray', label: 'Cầu nguyện', emoji: '🙏', style: 'primary', outcomes: [{ chance: 80, text: 'Bạn cầu nguyện trong im lặng. Một hơi ấm nhẹ lan qua cơ thể.', actions: [{ type: 'mp_percent', min: 8, max: 15 }, { type: 'exp', min: 6, max: 14 }] }, { chance: 20, text: 'Lời cầu nguyện bị thứ gì đó đáp lại. Không hẳn là thần linh.', actions: [{ type: 'damage_percent', min: 5, max: 11 }, { type: 'soul_shard', amount: 1 }] }] },
      { id: 'snuff', label: 'Thổi tắt nến', emoji: '💨', style: 'danger', outcomes: [{ chance: 50, text: 'Bóng tối tràn ra khỏi hàng nến và quấn lấy bạn.', actions: [{ type: 'damage_percent', min: 8, max: 14 }] }, { chance: 50, text: 'Khi ngọn nến cuối cùng tắt, một vật nhỏ rơi xuống nền đá.', actions: [{ type: 'item', itemId: 'shrine_relic', min: 1, max: 1 }] }] },
    ],
  },
  {
    id: 'dd_shrine_broken_incense',
    title: '⚱️ Lư Hương Vỡ',
    description: 'Một lư hương vỡ nằm giữa nền đền. Tro bên trong vẫn tỏa mùi ngọt và làm bạn hơi choáng.',
    color: 0x8f7d5c,
    image: 'shrine',
    weight: 2,
    zones: ['shrine'],
    choices: [
      { id: 'collect', label: 'Thu tro hương', emoji: '⚱️', style: 'primary', outcomes: [{ chance: 100, text: 'Bạn gói lại một ít tro hương còn linh lực.', actions: [{ type: 'item', itemId: 'purifying_salt', min: 1, max: 1 }, { type: 'exp', min: 5, max: 11 }] }] },
      { id: 'inhale', label: 'Hít khói', emoji: '🌫️', style: 'danger', outcomes: [{ chance: 45, text: 'Bạn nhìn thấy một ký ức cũ của ngôi đền.', actions: [{ type: 'exp', min: 12, max: 24 }, { type: 'mp_percent', min: 5, max: 10 }] }, { chance: 55, text: 'Khói hương làm đầu bạn đau nhói.', actions: [{ type: 'damage_percent', min: 6, max: 12 }] }] },
    ],
  },
  {
    id: 'dd_shrine_soul_mirror',
    title: '🪞 Gương Linh Hồn Nứt Vỡ',
    description: 'Một chiếc gương đặt giữa hành lang đền. Trong gương, bóng bạn mỉm cười chậm hơn nửa nhịp và đưa tay chạm vào mặt kính.',
    color: 0x8a2be2,
    image: 'mysterious',
    weight: 4,
    zones: ['shrine'],
    timeoutText: '🪞 Bạn phủ vải lên gương và rời đi. Sau lưng vẫn vang tiếng móng tay cào nhẹ vào kính.',
    choices: [
      {
        id: 'look', label: 'Nhìn thẳng vào gương', emoji: '👁️', style: 'danger',
        outcomes: [
          { chance: 45, text: 'Bạn nhìn thấy một lối đi ẩn sau chính bóng mình. Tri thức tràn vào đầu, nhưng linh hồn bị nhuốm lạnh.', actions: [{ type: 'exp', min: 24, max: 44 }, { type: 'item', itemId: 'mirror_shard', min: 1, max: 1 }, { type: 'corruption', amount: 6 }] },
          { chance: 55, text: 'Bóng trong gương bước lệch ra khỏi bạn. Nó để lại một vết nứt hình con mắt trên linh hồn.', actions: [{ type: 'damage_percent', min: 8, max: 15 }, { type: 'corruption', amount: 8 }] },
        ],
      },
      {
        id: 'cover', label: 'Che gương bằng muối thánh', emoji: '🧂', style: 'success', requires: { itemId: 'purifying_salt' },
        outcomes: [{ chance: 100, text: 'Muối thanh tẩy cháy thành khói trắng. Bóng trong gương lùi lại, để rơi một mảnh kính lạnh.', actions: [{ type: 'consume_item', itemId: 'purifying_salt', amount: 1 }, { type: 'item', itemId: 'mirror_shard', min: 1, max: 2 }, { type: 'corruption', amount: -12 }, { type: 'exp', min: 14, max: 26 }] }],
      },
      {
        id: 'break', label: 'Đập vỡ', emoji: '🔨', style: 'primary',
        outcomes: [
          { chance: 60, text: 'Gương vỡ thành hàng trăm mảnh. Mỗi mảnh thì thầm một lời cảnh báo khác nhau.', actions: [{ type: 'item', itemId: 'mirror_shard', min: 1, max: 2 }, { type: 'damage_percent', min: 4, max: 8 }] },
          { chance: 40, text: 'Tiếng kính vỡ đánh thức một cái bóng canh gương.', actions: [{ type: 'corruption', amount: 4 }, { type: 'combat_random' }] },
        ],
      },
    ],
  },
  {
    id: 'dd_shrine_bound_spirit',
    title: '⛓️ Linh Hồn Bị Xích',
    description: 'Một linh hồn quỳ trước cột đá, bị xích bởi phù văn cổ. Nó không cầu cứu, chỉ lặp lại: “Đừng để tiếng vọng học được tên ngươi.”',
    color: 0x6d5dfc,
    image: 'legacy',
    weight: 4,
    zones: ['shrine'],
    choices: [
      { id: 'free', label: 'Giải thoát', emoji: '🕯️', style: 'success', outcomes: [{ chance: 75, text: 'Bạn phá mắt xích cuối cùng. Linh hồn cúi đầu, để lại tro thánh trước khi tan đi.', actions: [{ type: 'reputation', amount: 3 }, { type: 'item', itemId: 'holy_ash', min: 1, max: 2 }, { type: 'corruption', amount: -6 }] }, { chance: 25, text: 'Xích vỡ, nhưng lời nguyền bắn ngược vào tay bạn.', actions: [{ type: 'damage_percent', min: 7, max: 13 }, { type: 'item', itemId: 'holy_ash', min: 1, max: 1 }] }] },
      { id: 'absorb', label: 'Hấp thụ linh lực', emoji: '🌑', style: 'danger', outcomes: [{ chance: 100, text: 'Bạn kéo phần linh lực còn lại vào cơ thể. Sức mạnh tăng lên trong giây lát, nhưng đền cổ cũng nhớ mùi linh hồn của bạn.', actions: [{ type: 'mp_percent', min: 15, max: 28 }, { type: 'soul_shard', amount: 1 }, { type: 'corruption', amount: 12 }, { type: 'reputation', amount: -2 }] }] },
    ],
  },
  {
    id: 'dd_shrine_seal_tablet',
    title: '📜 Bia Đá Phong Ấn',
    description: 'Một bia đá chặn giữa đường, trên mặt khắc ba vòng tròn: Chuông, Mắt và Nến. Chữ cổ chuyển động như muốn thử trí nhớ của bạn.',
    color: 0x7c3aed,
    image: 'altar',
    weight: 3,
    zones: ['shrine'],
    miniGame: {
      title: '📜 Giải Phù Văn Đền Cổ',
      introText: 'Bia đá yêu cầu bạn chọn đúng biểu tượng theo lời thì thầm. Sai quá nhiều sẽ kích hoạt bẫy linh hồn.',
      startLabel: 'Đọc phù văn',
      startEmoji: '📜',
      options: [
        { id: 'bell', label: 'Chuông', emoji: '🔔', style: 'primary' },
        { id: 'eye', label: 'Mắt', emoji: '👁️', style: 'secondary' },
        { id: 'candle', label: 'Nến', emoji: '🕯️', style: 'success' },
      ],
      rounds: [
        { prompt: '“Ta vang lên nhưng không ai nghe.”', correctOptionId: 'bell', successLine: 'Chuông Lặng sáng lên.', failureLine: 'Bia đá rung mạnh, như thất vọng.' },
        { prompt: '“Ta nhìn thấy tội lỗi cả khi ngươi nhắm mắt.”', correctOptionId: 'eye', successLine: 'Mắt Cổ khép lại.', failureLine: 'Một con mắt mở ra trên nền đá.' },
        { prompt: '“Ta cháy khi không còn người sống.”', correctOptionId: 'candle', successLine: 'Ngọn nến xanh cúi thấp.', failureLine: 'Lửa xanh liếm qua đầu ngón tay bạn.' },
      ],
      successNeeded: 2,
      successText: 'Bia đá tách làm đôi. Một ngăn nhỏ bên trong còn giữ mảnh phong ấn cổ.',
      failureText: 'Bia đá khóa lại. Phù văn phản phệ, nhưng bạn vẫn nhớ được một phần thứ tự cổ tự.',
      onSuccess: [{ type: 'item', itemId: 'ancient_seal', min: 1, max: 1 }, { type: 'exp', min: 24, max: 42 }, { type: 'corruption', amount: -4 }],
      onFailure: [{ type: 'damage_percent', min: 8, max: 14 }, { type: 'exp', min: 10, max: 18 }, { type: 'corruption', amount: 5 }],
      timeoutText: '⏳ Chữ trên bia đá nguội đi. Cánh cửa ẩn khép lại trong tiếng đá nghiến.',
    },
  },
  {
    id: 'dd_shrine_cleansing_pool',
    title: '💧 Hồ Thanh Tẩy Cạn Nước',
    description: 'Một hồ đá khô nằm dưới mái vòm sập. Đáy hồ vẫn còn vài giọt nước sáng như trăng non.',
    color: 0x60a5fa,
    image: 'spring',
    weight: 3,
    zones: ['shrine'],
    choices: [
      { id: 'drink', label: 'Uống giọt trăng', emoji: '🌙', style: 'primary', outcomes: [{ chance: 70, text: 'Nước trăng làm cổ họng lạnh buốt, nhưng linh hồn nhẹ đi rõ rệt.', actions: [{ type: 'mp_percent', min: 12, max: 22 }, { type: 'corruption', amount: -8 }] }, { chance: 30, text: 'Giọt nước đã bị nhiễm tà khí. Bạn hồi mana nhưng lời thì thầm bám theo.', actions: [{ type: 'mp_percent', min: 8, max: 16 }, { type: 'corruption', amount: 6 }] }] },
      { id: 'bottle', label: 'Hứng vào bình', emoji: '🫙', style: 'success', outcomes: [{ chance: 100, text: 'Bạn gom được ít nước trăng còn sạch.', actions: [{ type: 'item', itemId: 'moonwater', min: 1, max: 1 }] }] },
    ],
  },
  {
    id: 'dd_shrine_offering_scale',
    title: '⚖️ Cân Hiến Tế Bằng Đá',
    description: 'Một chiếc cân đá đặt trước bàn thờ. Một bên có khắc chữ “Ký Ức”, bên còn lại là “Máu”.',
    color: 0xa16207,
    image: 'altar',
    weight: 3,
    zones: ['shrine'],
    choices: [
      { id: 'memory', label: 'Dâng Ancient Book', emoji: '📖', style: 'success', requires: { itemId: 'ancient_book' }, outcomes: [{ chance: 100, text: 'Cổ thư tan thành bụi sáng. Chiếc cân nghiêng về phía bạn, để lộ một vật cúng bị giấu.', actions: [{ type: 'consume_item', itemId: 'ancient_book', amount: 1 }, { type: 'item', itemId: 'ancient_seal', min: 1, max: 1 }, { type: 'corruption', amount: -10 }, { type: 'exp', min: 18, max: 32 }] }] },
      { id: 'blood', label: 'Dâng máu', emoji: '🩸', style: 'danger', outcomes: [{ chance: 60, text: 'Máu rơi xuống cân. Bàn thờ mở ra, nhưng tiếng vọng học được mùi của bạn.', actions: [{ type: 'damage_percent', min: 10, max: 18 }, { type: 'item', itemId: 'curse_shard', min: 1, max: 2 }, { type: 'corruption', amount: 10 }] }, { chance: 40, text: 'Cân đá từ chối máu sống và gọi hộ vệ tới.', actions: [{ type: 'corruption', amount: 6 }, { type: 'combat_random' }] }] },
    ],
  },
  {
    id: 'dd_shrine_guardian_footsteps',
    title: '🗿 Bước Chân Hộ Vệ',
    description: 'Nền đền rung theo nhịp chậm. Từ hành lang phía trước, bụi đá rơi xuống từng mảng như có thứ nặng nề đang đến gần.',
    color: 0x78716c,
    image: 'combat',
    weight: 3,
    zones: ['shrine'],
    requiresCombat: true,
    timeoutText: '🗿 Bạn né vào một hốc tường. Bước chân đi qua, để lại mùi đá ẩm và hương trầm cháy.',
    choices: [
      { id: 'face', label: 'Đối mặt', emoji: '⚔️', style: 'danger', outcomes: [{ chance: 100, text: 'Bạn bước ra giữa hành lang. Tượng hộ vệ quay đầu, đôi mắt đá sáng lên.', actions: [{ type: 'combat_random' }] }] },
      { id: 'hide', label: 'Ẩn sau cột đá', emoji: '🫥', style: 'secondary', outcomes: [{ chance: 65, text: 'Bạn đợi hộ vệ đi qua và nhặt được mảnh đá phù văn rơi lại.', actions: [{ type: 'item', itemId: 'shrine_stone', min: 1, max: 1 }, { type: 'exp', min: 8, max: 16 }] }, { chance: 35, text: 'Cột đá phản chiếu bóng bạn. Hộ vệ phát hiện ra dấu hơi thở.', actions: [{ type: 'combat_random' }] }] },
    ],
  },
  {
    id: 'dd_shrine_echo_whisper',
    title: '👁️ Tiếng Vọng Gọi Tên',
    description: 'Một giọng nói từ sau tường gọi đúng tên bạn. Nó không đe dọa, chỉ nhắc lại những câu bạn từng nói trong lúc sắp chết.',
    color: 0x4c1d95,
    image: 'mysterious',
    weight: 3,
    zones: ['shrine'],
    choices: [
      { id: 'answer', label: 'Trả lời tiếng gọi', emoji: '🗣️', style: 'danger', outcomes: [{ chance: 45, text: 'Tiếng vọng cười khẽ và tặng lại một mảnh lõi âm. Nhưng giờ nó nhớ rõ giọng của bạn hơn.', actions: [{ type: 'item', itemId: 'echo_core', min: 1, max: 1 }, { type: 'corruption', amount: 14 }] }, { chance: 55, text: 'Bạn vừa mở miệng, tiếng vọng đã lặp lại câu trả lời bằng giọng của người thân đã mất.', actions: [{ type: 'damage_percent', min: 8, max: 15 }, { type: 'corruption', amount: 10 }] }] },
      { id: 'silence', label: 'Giữ im lặng', emoji: '🤫', style: 'success', outcomes: [{ chance: 100, text: 'Bạn không đáp lại. Sau một lúc, bức tường tự nứt ra để lộ một lối đi phụ.', actions: [{ type: 'exp', min: 16, max: 30 }, { type: 'corruption', amount: -3 }] }] },
    ],
  },

  {
    id: 'dd_mines_gas_pocket',
    title: '💨 Túi Khí Độc',
    description: 'Một khe đá phụt ra luồng khí xanh nhạt. Nếu đi nhanh, bạn có thể vượt qua trước khi khí lan rộng.',
    color: 0x6b8e23,
    image: 'trap',
    weight: 3,
    zones: ['mines'],
    timeoutText: '💨 Khí độc lan ra. Bạn buộc phải lùi lại.',
    choices: [
      { id: 'dash', label: 'Chạy qua', emoji: '🏃', style: 'danger', outcomes: [{ chance: 55, text: 'Bạn nín thở và chạy qua khe khí thành công.', actions: [{ type: 'exp', min: 7, max: 16 }] }, { chance: 45, text: 'Bạn hít phải một ít khí độc và ho sặc sụa.', actions: [{ type: 'damage_percent', min: 8, max: 16 }] }] },
      { id: 'seal', label: 'Bịt khe đá', emoji: '🪨', style: 'primary', outcomes: [{ chance: 100, text: 'Bạn dùng đá vụn bịt khe khí. Đường hầm an toàn hơn một chút.', actions: [{ type: 'world_danger', amount: -1 }, { type: 'exp', min: 5, max: 12 }] }] },
    ],
  },
  {
    id: 'dd_mines_locked_toolbox',
    title: '🧰 Hộp Dụng Cụ Khóa Chặt',
    description: 'Một hộp dụng cụ thợ mỏ nằm dưới ray cũ. Bên ngoài có ký hiệu của đội khai thác đã mất tích.',
    color: 0x8b6f47,
    image: 'loot',
    weight: 3,
    zones: ['mines'],
    choices: [
      { id: 'open', label: 'Mở cẩn thận', emoji: '🔧', style: 'primary', outcomes: [{ chance: 75, text: 'Bạn mở được hộp mà không làm hỏng dụng cụ bên trong.', actions: [{ type: 'item', itemId: 'rusty_gear', min: 2, max: 4 }, { type: 'gold', min: 4, max: 12 }] }, { chance: 25, text: 'Một lò xo gỉ bật vào tay bạn.', actions: [{ type: 'damage_percent', min: 4, max: 9 }, { type: 'item', itemId: 'rusty_gear', min: 1, max: 1 }] }] },
      { id: 'return', label: 'Đem về trạm mỏ', emoji: '🤝', style: 'success', outcomes: [{ chance: 100, text: 'Bạn đem hộp dụng cụ về trạm mỏ. Một vài thợ mỏ sống sót rất biết ơn.', actions: [{ type: 'reputation', amount: 3 }, { type: 'gold', min: 8, max: 20 }] }] },
    ],
  },
  {
    id: 'dd_wastes_ash_well',
    title: '🕳️ Giếng Tro Cạn',
    description: 'Giữa hoang nguyên có một cái giếng khô đầy tro xám. Từ đáy giếng vọng lên tiếng nước nhỏ giọt.',
    color: 0x4b4b4b,
    image: 'mysterious',
    weight: 3,
    zones: ['wastes'],
    choices: [
      { id: 'descend', label: 'Leo xuống', emoji: '🪢', style: 'danger', outcomes: [{ chance: 50, text: 'Bạn leo xuống đáy giếng và tìm thấy thứ bị tro vùi.', actions: [{ type: 'item', itemId: 'void_shard', min: 1, max: 1 }, { type: 'gold', min: 8, max: 22 }] }, { chance: 50, text: 'Dây trượt khỏi tay. Bạn va vào thành giếng trước khi leo lên được.', actions: [{ type: 'damage_percent', min: 10, max: 18 }] }] },
      { id: 'listen', label: 'Lắng nghe', emoji: '👂', style: 'secondary', outcomes: [{ chance: 100, text: 'Tiếng nước hóa thành lời cảnh báo mơ hồ về con đường phía trước.', actions: [{ type: 'exp', min: 8, max: 18 }] }] },
    ],
  },
  {
    id: 'dd_wastes_buried_statue',
    title: '🗿 Tượng Đá Bị Vùi',
    description: 'Một khuôn mặt đá khổng lồ nhô lên khỏi cát tro. Đôi mắt nó khép hờ như đang mơ.',
    color: 0x6e5f52,
    image: 'altar',
    weight: 2,
    zones: ['wastes'],
    choices: [
      { id: 'dig', label: 'Đào quanh tượng', emoji: '⛏️', style: 'primary', outcomes: [{ chance: 60, text: 'Bạn đào quanh tượng và tìm thấy vật cúng cũ.', actions: [{ type: 'item', itemId: 'forgotten_crown', min: 1, max: 1 }] }, { chance: 40, text: 'Cát tro sụp xuống làm bạn trầy xước, nhưng bạn vẫn hiểu thêm về tàn tích này.', actions: [{ type: 'damage_percent', min: 6, max: 12 }, { type: 'exp', min: 10, max: 22 }] }] },
      { id: 'bow', label: 'Cúi chào', emoji: '🙇', style: 'secondary', outcomes: [{ chance: 100, text: 'Bạn cúi chào bức tượng. Gió tro dịu đi trong vài giây.', actions: [{ type: 'reputation', amount: 2 }, { type: 'mp_percent', min: 5, max: 12 }] }] },
    ],
  },
  // EXTRA_FOREST_50_EVENTS_START
  {
    id: 'dd_forest_moon_pool',
    title: '🌙 Vũng Nước Ánh Trăng',
    description: 'Một vũng nước nhỏ phản chiếu bầu trời đêm dù hiện tại không phải ban đêm. Mặt nước lạnh bất thường.',
    color: 0x4f7942,
    image: 'spring',
    weight: 2,
    zones: ['forest'],
    timeoutText: 'Bạn bỏ qua dấu hiệu lạ trong rừng và tiếp tục đi.',
    choices: [
      {
        id: 'careful',
        label: 'Tiếp cận cẩn thận',
        emoji: '🔎',
        style: 'primary',
        outcomes: [
          { chance: 75, text: 'Bạn xử lý tình huống cẩn thận và lấy được chút lợi ích mà không gây quá nhiều tiếng động.', actions: [{ type: 'reputation', amount: 1 }, { type: 'item', itemId: 'moonwater', min: 1, max: 1 }, { type: 'exp', min: 5, max: 12 }] },
          { chance: 25, text: 'Bạn đánh giá sai một chi tiết nhỏ và bị thương nhẹ.', actions: [{ type: 'damage_percent', min: 4, max: 9 }, { type: 'exp', min: 3, max: 7 }] },
        ],
      },
      {
        id: 'risk',
        label: 'Mạo hiểm hơn',
        emoji: '⚠️',
        style: 'danger',
        outcomes: [
          { chance: 40, text: 'Bạn chấp nhận rủi ro và tìm được phần thưởng tốt hơn trong rừng sâu.', actions: [{ type: 'gold', min: 8, max: 26 }, { type: 'item', itemId: 'moonwater', min: 1, max: 2 }] },
          { chance: 35, text: 'Tiếng động của bạn thu hút kẻ săn mồi gần đó.', actions: [{ type: 'combat_random' }] },
          { chance: 25, text: 'Cái giá của sự hấp tấp là vài vết thương và một bài học đau.', actions: [{ type: 'damage_percent', min: 7, max: 14 }, { type: 'exp', min: 4, max: 10 }] },
        ],
      },
    ],
  },
  {
    id: 'dd_forest_antler_totem',
    title: '🦌 Cọc Totem Gạc Hươu',
    description: 'Một cọc gỗ treo đầy gạc hươu và dây đỏ. Bên dưới có tro nhang mới tàn.',
    color: 0x3b5f2a,
    image: 'altar',
    weight: 2,
    zones: ['forest'],
    timeoutText: 'Bạn bỏ qua dấu hiệu lạ trong rừng và tiếp tục đi.',
    choices: [
      {
        id: 'careful',
        label: 'Tiếp cận cẩn thận',
        emoji: '🔎',
        style: 'primary',
        outcomes: [
          { chance: 75, text: 'Bạn xử lý tình huống cẩn thận và lấy được chút lợi ích mà không gây quá nhiều tiếng động.', actions: [{ type: 'item', itemId: 'ancient_bark', min: 1, max: 1 }, { type: 'exp', min: 5, max: 12 }] },
          { chance: 25, text: 'Bạn đánh giá sai một chi tiết nhỏ và bị thương nhẹ.', actions: [{ type: 'damage_percent', min: 4, max: 9 }, { type: 'exp', min: 3, max: 7 }] },
        ],
      },
      {
        id: 'risk',
        label: 'Mạo hiểm hơn',
        emoji: '⚠️',
        style: 'danger',
        outcomes: [
          { chance: 40, text: 'Bạn chấp nhận rủi ro và tìm được phần thưởng tốt hơn trong rừng sâu.', actions: [{ type: 'gold', min: 8, max: 26 }, { type: 'item', itemId: 'ancient_bark', min: 1, max: 2 }] },
          { chance: 35, text: 'Tiếng động của bạn thu hút kẻ săn mồi gần đó.', actions: [{ type: 'world_danger', amount: 1 }, { type: 'combat_random' }] },
          { chance: 25, text: 'Cái giá của sự hấp tấp là vài vết thương và một bài học đau.', actions: [{ type: 'damage_percent', min: 7, max: 14 }, { type: 'exp', min: 4, max: 10 }] },
        ],
      },
    ],
  },
  {
    id: 'dd_forest_hollow_owl',
    title: '🦉 Cú Mèo Trong Hốc Cây',
    description: 'Một con cú mèo trắng nhìn bạn từ hốc cây. Trong móng nó là một mảnh giấy nhỏ.',
    color: 0x5a6b3a,
    image: 'mysterious',
    weight: 3,
    zones: ['forest'],
    timeoutText: 'Bạn bỏ qua dấu hiệu lạ trong rừng và tiếp tục đi.',
    choices: [
      {
        id: 'careful',
        label: 'Tiếp cận cẩn thận',
        emoji: '🔎',
        style: 'primary',
        outcomes: [
          { chance: 75, text: 'Bạn xử lý tình huống cẩn thận và lấy được chút lợi ích mà không gây quá nhiều tiếng động.', actions: [{ type: 'item', itemId: 'scroll_detection', min: 1, max: 1 }, { type: 'exp', min: 5, max: 12 }] },
          { chance: 25, text: 'Bạn đánh giá sai một chi tiết nhỏ và bị thương nhẹ.', actions: [{ type: 'damage_percent', min: 4, max: 9 }, { type: 'exp', min: 3, max: 7 }] },
        ],
      },
      {
        id: 'risk',
        label: 'Mạo hiểm hơn',
        emoji: '⚠️',
        style: 'danger',
        outcomes: [
          { chance: 40, text: 'Bạn chấp nhận rủi ro và tìm được phần thưởng tốt hơn trong rừng sâu.', actions: [{ type: 'gold', min: 8, max: 26 }, { type: 'item', itemId: 'scroll_detection', min: 1, max: 2 }] },
          { chance: 35, text: 'Tiếng động của bạn thu hút kẻ săn mồi gần đó.', actions: [{ type: 'combat_random' }] },
          { chance: 25, text: 'Cái giá của sự hấp tấp là vài vết thương và một bài học đau.', actions: [{ type: 'damage_percent', min: 7, max: 14 }, { type: 'exp', min: 4, max: 10 }] },
        ],
      },
    ],
  },
  {
    id: 'dd_forest_broken_cart',
    title: '🛒 Xe Hàng Vỡ Bánh',
    description: 'Một chiếc xe hàng nằm nghiêng bên đường. Hàng hóa vương vãi, nhưng không thấy chủ xe đâu.',
    color: 0x355e3b,
    image: 'caravan',
    weight: 2,
    zones: ['forest'],
    timeoutText: 'Bạn bỏ qua dấu hiệu lạ trong rừng và tiếp tục đi.',
    choices: [
      {
        id: 'careful',
        label: 'Tiếp cận cẩn thận',
        emoji: '🔎',
        style: 'primary',
        outcomes: [
          { chance: 75, text: 'Bạn xử lý tình huống cẩn thận và lấy được chút lợi ích mà không gây quá nhiều tiếng động.', actions: [{ type: 'item', itemId: 'bread', min: 1, max: 1 }, { type: 'exp', min: 5, max: 12 }] },
          { chance: 25, text: 'Bạn đánh giá sai một chi tiết nhỏ và bị thương nhẹ.', actions: [{ type: 'damage_percent', min: 4, max: 9 }, { type: 'exp', min: 3, max: 7 }] },
        ],
      },
      {
        id: 'risk',
        label: 'Mạo hiểm hơn',
        emoji: '⚠️',
        style: 'danger',
        outcomes: [
          { chance: 40, text: 'Bạn chấp nhận rủi ro và tìm được phần thưởng tốt hơn trong rừng sâu.', actions: [{ type: 'gold', min: 8, max: 26 }, { type: 'item', itemId: 'bread', min: 1, max: 2 }] },
          { chance: 35, text: 'Tiếng động của bạn thu hút kẻ săn mồi gần đó.', actions: [{ type: 'combat_random' }] },
          { chance: 25, text: 'Cái giá của sự hấp tấp là vài vết thương và một bài học đau.', actions: [{ type: 'damage_percent', min: 7, max: 14 }, { type: 'exp', min: 4, max: 10 }] },
        ],
      },
    ],
  },
  {
    id: 'dd_forest_wounded_boar',
    title: '🐗 Heo Rừng Bị Thương',
    description: 'Một con heo rừng bị mắc bẫy, thở hồng hộc. Nó vừa sợ vừa giận, chỉ cần tới gần là có thể bị húc.',
    color: 0x2f4f2f,
    image: 'combat',
    weight: 2,
    zones: ['forest'],
    requiresCombat: true,
    timeoutText: 'Bạn bỏ qua dấu hiệu lạ trong rừng và tiếp tục đi.',
    choices: [
      {
        id: 'careful',
        label: 'Tiếp cận cẩn thận',
        emoji: '🔎',
        style: 'primary',
        outcomes: [
          { chance: 75, text: 'Bạn xử lý tình huống cẩn thận và lấy được chút lợi ích mà không gây quá nhiều tiếng động.', actions: [{ type: 'item', itemId: 'meat', min: 1, max: 1 }, { type: 'exp', min: 5, max: 12 }] },
          { chance: 25, text: 'Bạn đánh giá sai một chi tiết nhỏ và bị thương nhẹ.', actions: [{ type: 'damage_percent', min: 4, max: 9 }, { type: 'exp', min: 3, max: 7 }] },
        ],
      },
      {
        id: 'risk',
        label: 'Mạo hiểm hơn',
        emoji: '⚠️',
        style: 'danger',
        outcomes: [
          { chance: 40, text: 'Bạn chấp nhận rủi ro và tìm được phần thưởng tốt hơn trong rừng sâu.', actions: [{ type: 'gold', min: 8, max: 26 }, { type: 'item', itemId: 'meat', min: 1, max: 2 }] },
          { chance: 35, text: 'Tiếng động của bạn thu hút kẻ săn mồi gần đó.', actions: [{ type: 'combat_random' }] },
          { chance: 25, text: 'Cái giá của sự hấp tấp là vài vết thương và một bài học đau.', actions: [{ type: 'damage_percent', min: 7, max: 14 }, { type: 'exp', min: 4, max: 10 }] },
        ],
      },
    ],
  },
  {
    id: 'dd_forest_silent_beehive',
    title: '🍯 Tổ Ong Im Lặng',
    description: 'Một tổ ong lớn treo thấp, kỳ lạ là không có tiếng vo ve. Mật bên trong chảy ra như hổ phách.',
    color: 0x4f7942,
    image: 'loot',
    weight: 3,
    zones: ['forest'],
    timeoutText: 'Bạn bỏ qua dấu hiệu lạ trong rừng và tiếp tục đi.',
    choices: [
      {
        id: 'careful',
        label: 'Tiếp cận cẩn thận',
        emoji: '🔎',
        style: 'primary',
        outcomes: [
          { chance: 75, text: 'Bạn xử lý tình huống cẩn thận và lấy được chút lợi ích mà không gây quá nhiều tiếng động.', actions: [{ type: 'item', itemId: 'honey', min: 1, max: 1 }, { type: 'exp', min: 5, max: 12 }] },
          { chance: 25, text: 'Bạn đánh giá sai một chi tiết nhỏ và bị thương nhẹ.', actions: [{ type: 'damage_percent', min: 4, max: 9 }, { type: 'exp', min: 3, max: 7 }] },
        ],
      },
      {
        id: 'risk',
        label: 'Mạo hiểm hơn',
        emoji: '⚠️',
        style: 'danger',
        outcomes: [
          { chance: 40, text: 'Bạn chấp nhận rủi ro và tìm được phần thưởng tốt hơn trong rừng sâu.', actions: [{ type: 'gold', min: 8, max: 26 }, { type: 'item', itemId: 'honey', min: 1, max: 2 }] },
          { chance: 35, text: 'Tiếng động của bạn thu hút kẻ săn mồi gần đó.', actions: [{ type: 'combat_random' }] },
          { chance: 25, text: 'Cái giá của sự hấp tấp là vài vết thương và một bài học đau.', actions: [{ type: 'damage_percent', min: 7, max: 14 }, { type: 'exp', min: 4, max: 10 }] },
        ],
      },
    ],
  },
  {
    id: 'dd_forest_ivy_door',
    title: '🚪 Cửa Phủ Dây Thường Xuân',
    description: 'Sau một bức tường đá phủ rêu là cánh cửa bị dây thường xuân quấn kín. Có tiếng gió thổi từ bên trong.',
    color: 0x3b5f2a,
    image: 'legacy',
    weight: 2,
    zones: ['forest'],
    timeoutText: 'Bạn bỏ qua dấu hiệu lạ trong rừng và tiếp tục đi.',
    choices: [
      {
        id: 'careful',
        label: 'Tiếp cận cẩn thận',
        emoji: '🔎',
        style: 'primary',
        outcomes: [
          { chance: 75, text: 'Bạn xử lý tình huống cẩn thận và lấy được chút lợi ích mà không gây quá nhiều tiếng động.', actions: [{ type: 'item', itemId: 'ancient_wood', min: 1, max: 1 }, { type: 'exp', min: 5, max: 12 }] },
          { chance: 25, text: 'Bạn đánh giá sai một chi tiết nhỏ và bị thương nhẹ.', actions: [{ type: 'damage_percent', min: 4, max: 9 }, { type: 'exp', min: 3, max: 7 }] },
        ],
      },
      {
        id: 'risk',
        label: 'Mạo hiểm hơn',
        emoji: '⚠️',
        style: 'danger',
        outcomes: [
          { chance: 40, text: 'Bạn chấp nhận rủi ro và tìm được phần thưởng tốt hơn trong rừng sâu.', actions: [{ type: 'gold', min: 8, max: 26 }, { type: 'item', itemId: 'ancient_wood', min: 1, max: 2 }] },
          { chance: 35, text: 'Tiếng động của bạn thu hút kẻ săn mồi gần đó.', actions: [{ type: 'combat_random' }] },
          { chance: 25, text: 'Cái giá của sự hấp tấp là vài vết thương và một bài học đau.', actions: [{ type: 'damage_percent', min: 7, max: 14 }, { type: 'exp', min: 4, max: 10 }] },
        ],
      },
    ],
  },
  {
    id: 'dd_forest_hidden_snare',
    title: '🪢 Thòng Lọng Ẩn',
    description: 'Một thòng lọng giấu dưới lá khô. Nếu không nhìn kỹ, ai đi qua cũng sẽ bị treo ngược.',
    color: 0x5a6b3a,
    image: 'trap',
    weight: 2,
    zones: ['forest'],
    timeoutText: 'Bạn bỏ qua dấu hiệu lạ trong rừng và tiếp tục đi.',
    choices: [
      {
        id: 'careful',
        label: 'Tiếp cận cẩn thận',
        emoji: '🔎',
        style: 'primary',
        outcomes: [
          { chance: 75, text: 'Bạn xử lý tình huống cẩn thận và lấy được chút lợi ích mà không gây quá nhiều tiếng động.', actions: [{ type: 'reputation', amount: 1 }, { type: 'item', itemId: 'leather', min: 1, max: 1 }, { type: 'exp', min: 5, max: 12 }] },
          { chance: 25, text: 'Bạn đánh giá sai một chi tiết nhỏ và bị thương nhẹ.', actions: [{ type: 'damage_percent', min: 4, max: 9 }, { type: 'exp', min: 3, max: 7 }] },
        ],
      },
      {
        id: 'risk',
        label: 'Mạo hiểm hơn',
        emoji: '⚠️',
        style: 'danger',
        outcomes: [
          { chance: 40, text: 'Bạn chấp nhận rủi ro và tìm được phần thưởng tốt hơn trong rừng sâu.', actions: [{ type: 'gold', min: 8, max: 26 }, { type: 'item', itemId: 'leather', min: 1, max: 2 }] },
          { chance: 35, text: 'Tiếng động của bạn thu hút kẻ săn mồi gần đó.', actions: [{ type: 'combat_random' }] },
          { chance: 25, text: 'Cái giá của sự hấp tấp là vài vết thương và một bài học đau.', actions: [{ type: 'damage_percent', min: 7, max: 14 }, { type: 'exp', min: 4, max: 10 }] },
        ],
      },
    ],
  },
  {
    id: 'dd_forest_fog_whispers',
    title: '🌫️ Tiếng Thì Thầm Trong Sương',
    description: 'Sương mù trườn qua thân cây, mang theo những giọng nói gọi đúng tên bạn.',
    color: 0x355e3b,
    image: 'mysterious',
    weight: 3,
    zones: ['forest'],
    timeoutText: 'Bạn bỏ qua dấu hiệu lạ trong rừng và tiếp tục đi.',
    choices: [
      {
        id: 'careful',
        label: 'Tiếp cận cẩn thận',
        emoji: '🔎',
        style: 'primary',
        outcomes: [
          { chance: 75, text: 'Bạn xử lý tình huống cẩn thận và lấy được chút lợi ích mà không gây quá nhiều tiếng động.', actions: [{ type: 'item', itemId: 'soul_dust', min: 1, max: 1 }, { type: 'exp', min: 5, max: 12 }] },
          { chance: 25, text: 'Bạn đánh giá sai một chi tiết nhỏ và bị thương nhẹ.', actions: [{ type: 'damage_percent', min: 4, max: 9 }, { type: 'exp', min: 3, max: 7 }] },
        ],
      },
      {
        id: 'risk',
        label: 'Mạo hiểm hơn',
        emoji: '⚠️',
        style: 'danger',
        outcomes: [
          { chance: 40, text: 'Bạn chấp nhận rủi ro và tìm được phần thưởng tốt hơn trong rừng sâu.', actions: [{ type: 'gold', min: 8, max: 26 }, { type: 'item', itemId: 'soul_dust', min: 1, max: 2 }] },
          { chance: 35, text: 'Tiếng động của bạn thu hút kẻ săn mồi gần đó.', actions: [{ type: 'combat_random' }] },
          { chance: 25, text: 'Cái giá của sự hấp tấp là vài vết thương và một bài học đau.', actions: [{ type: 'damage_percent', min: 7, max: 14 }, { type: 'exp', min: 4, max: 10 }] },
        ],
      },
    ],
  },
  {
    id: 'dd_forest_old_camp_map',
    title: '🗺️ Bản Đồ Trại Cũ',
    description: 'Trong tro tàn của một trại cũ, bạn thấy mảnh bản đồ cháy dở đánh dấu vài vòng tròn đỏ.',
    color: 0x2f4f2f,
    image: 'camp',
    weight: 2,
    zones: ['forest'],
    timeoutText: 'Bạn bỏ qua dấu hiệu lạ trong rừng và tiếp tục đi.',
    choices: [
      {
        id: 'careful',
        label: 'Tiếp cận cẩn thận',
        emoji: '🔎',
        style: 'primary',
        outcomes: [
          { chance: 75, text: 'Bạn xử lý tình huống cẩn thận và lấy được chút lợi ích mà không gây quá nhiều tiếng động.', actions: [{ type: 'item', itemId: 'rusty_gear', min: 1, max: 1 }, { type: 'exp', min: 5, max: 12 }] },
          { chance: 25, text: 'Bạn đánh giá sai một chi tiết nhỏ và bị thương nhẹ.', actions: [{ type: 'damage_percent', min: 4, max: 9 }, { type: 'exp', min: 3, max: 7 }] },
        ],
      },
      {
        id: 'risk',
        label: 'Mạo hiểm hơn',
        emoji: '⚠️',
        style: 'danger',
        outcomes: [
          { chance: 40, text: 'Bạn chấp nhận rủi ro và tìm được phần thưởng tốt hơn trong rừng sâu.', actions: [{ type: 'gold', min: 8, max: 26 }, { type: 'item', itemId: 'rusty_gear', min: 1, max: 2 }] },
          { chance: 35, text: 'Tiếng động của bạn thu hút kẻ săn mồi gần đó.', actions: [{ type: 'world_danger', amount: 1 }, { type: 'combat_random' }] },
          { chance: 25, text: 'Cái giá của sự hấp tấp là vài vết thương và một bài học đau.', actions: [{ type: 'damage_percent', min: 7, max: 14 }, { type: 'exp', min: 4, max: 10 }] },
        ],
      },
    ],
  },
  {
    id: 'dd_forest_river_stones',
    title: '🪨 Đá Trơn Qua Suối',
    description: 'Một dòng suối lạnh chắn đường. Những tảng đá nhô lên đủ để bước qua, nhưng rêu phủ rất dày.',
    color: 0x4f7942,
    image: 'spring',
    weight: 2,
    zones: ['forest'],
    timeoutText: 'Bạn bỏ qua dấu hiệu lạ trong rừng và tiếp tục đi.',
    choices: [
      {
        id: 'careful',
        label: 'Tiếp cận cẩn thận',
        emoji: '🔎',
        style: 'primary',
        outcomes: [
          { chance: 75, text: 'Bạn xử lý tình huống cẩn thận và lấy được chút lợi ích mà không gây quá nhiều tiếng động.', actions: [{ type: 'item', itemId: 'herb', min: 1, max: 1 }, { type: 'exp', min: 5, max: 12 }] },
          { chance: 25, text: 'Bạn đánh giá sai một chi tiết nhỏ và bị thương nhẹ.', actions: [{ type: 'damage_percent', min: 4, max: 9 }, { type: 'exp', min: 3, max: 7 }] },
        ],
      },
      {
        id: 'risk',
        label: 'Mạo hiểm hơn',
        emoji: '⚠️',
        style: 'danger',
        outcomes: [
          { chance: 40, text: 'Bạn chấp nhận rủi ro và tìm được phần thưởng tốt hơn trong rừng sâu.', actions: [{ type: 'gold', min: 8, max: 26 }, { type: 'item', itemId: 'herb', min: 1, max: 2 }] },
          { chance: 35, text: 'Tiếng động của bạn thu hút kẻ săn mồi gần đó.', actions: [{ type: 'combat_random' }] },
          { chance: 25, text: 'Cái giá của sự hấp tấp là vài vết thương và một bài học đau.', actions: [{ type: 'damage_percent', min: 7, max: 14 }, { type: 'exp', min: 4, max: 10 }] },
        ],
      },
    ],
  },
  {
    id: 'dd_forest_mushroom_bread',
    title: '🍄 Ổ Bánh Nấm',
    description: 'Một ổ bánh đặt trên phiến đá, xung quanh mọc đầy nấm tím. Bánh còn mềm như vừa được nướng.',
    color: 0x3b5f2a,
    image: 'mushroom',
    weight: 3,
    zones: ['forest'],
    timeoutText: 'Bạn bỏ qua dấu hiệu lạ trong rừng và tiếp tục đi.',
    choices: [
      {
        id: 'careful',
        label: 'Tiếp cận cẩn thận',
        emoji: '🔎',
        style: 'primary',
        outcomes: [
          { chance: 75, text: 'Bạn xử lý tình huống cẩn thận và lấy được chút lợi ích mà không gây quá nhiều tiếng động.', actions: [{ type: 'item', itemId: 'strange_mushroom', min: 1, max: 1 }, { type: 'exp', min: 5, max: 12 }] },
          { chance: 25, text: 'Bạn đánh giá sai một chi tiết nhỏ và bị thương nhẹ.', actions: [{ type: 'damage_percent', min: 4, max: 9 }, { type: 'exp', min: 3, max: 7 }] },
        ],
      },
      {
        id: 'risk',
        label: 'Mạo hiểm hơn',
        emoji: '⚠️',
        style: 'danger',
        outcomes: [
          { chance: 40, text: 'Bạn chấp nhận rủi ro và tìm được phần thưởng tốt hơn trong rừng sâu.', actions: [{ type: 'gold', min: 8, max: 26 }, { type: 'item', itemId: 'strange_mushroom', min: 1, max: 2 }] },
          { chance: 35, text: 'Tiếng động của bạn thu hút kẻ săn mồi gần đó.', actions: [{ type: 'combat_random' }] },
          { chance: 25, text: 'Cái giá của sự hấp tấp là vài vết thương và một bài học đau.', actions: [{ type: 'damage_percent', min: 7, max: 14 }, { type: 'exp', min: 4, max: 10 }] },
        ],
      },
    ],
  },
  {
    id: 'dd_forest_green_fireflies',
    title: '✨ Đom Đóm Xanh',
    description: 'Một đàn đom đóm xanh bay quanh bạn thành vòng tròn. Ánh sáng của chúng làm các vết thương hơi ấm lên.',
    color: 0x5a6b3a,
    image: 'spring',
    weight: 2,
    zones: ['forest'],
    timeoutText: 'Bạn bỏ qua dấu hiệu lạ trong rừng và tiếp tục đi.',
    choices: [
      {
        id: 'careful',
        label: 'Tiếp cận cẩn thận',
        emoji: '🔎',
        style: 'primary',
        outcomes: [
          { chance: 75, text: 'Bạn xử lý tình huống cẩn thận và lấy được chút lợi ích mà không gây quá nhiều tiếng động.', actions: [{ type: 'item', itemId: 'soul_dust', min: 1, max: 1 }, { type: 'exp', min: 5, max: 12 }] },
          { chance: 25, text: 'Bạn đánh giá sai một chi tiết nhỏ và bị thương nhẹ.', actions: [{ type: 'damage_percent', min: 4, max: 9 }, { type: 'exp', min: 3, max: 7 }] },
        ],
      },
      {
        id: 'risk',
        label: 'Mạo hiểm hơn',
        emoji: '⚠️',
        style: 'danger',
        outcomes: [
          { chance: 40, text: 'Bạn chấp nhận rủi ro và tìm được phần thưởng tốt hơn trong rừng sâu.', actions: [{ type: 'gold', min: 8, max: 26 }, { type: 'item', itemId: 'soul_dust', min: 1, max: 2 }] },
          { chance: 35, text: 'Tiếng động của bạn thu hút kẻ săn mồi gần đó.', actions: [{ type: 'combat_random' }] },
          { chance: 25, text: 'Cái giá của sự hấp tấp là vài vết thương và một bài học đau.', actions: [{ type: 'damage_percent', min: 7, max: 14 }, { type: 'exp', min: 4, max: 10 }] },
        ],
      },
    ],
  },
  {
    id: 'dd_forest_root_maze',
    title: '🌳 Mê Cung Rễ Cây',
    description: 'Rễ cây đan vào nhau thành một lối đi ngoằn ngoèo. Càng nhìn lâu, bạn càng quên mình đến từ hướng nào.',
    color: 0x355e3b,
    image: 'forest',
    weight: 2,
    zones: ['forest'],
    timeoutText: 'Bạn bỏ qua dấu hiệu lạ trong rừng và tiếp tục đi.',
    choices: [
      {
        id: 'careful',
        label: 'Tiếp cận cẩn thận',
        emoji: '🔎',
        style: 'primary',
        outcomes: [
          { chance: 75, text: 'Bạn xử lý tình huống cẩn thận và lấy được chút lợi ích mà không gây quá nhiều tiếng động.', actions: [{ type: 'item', itemId: 'ancient_bark', min: 1, max: 1 }, { type: 'exp', min: 5, max: 12 }] },
          { chance: 25, text: 'Bạn đánh giá sai một chi tiết nhỏ và bị thương nhẹ.', actions: [{ type: 'damage_percent', min: 4, max: 9 }, { type: 'exp', min: 3, max: 7 }] },
        ],
      },
      {
        id: 'risk',
        label: 'Mạo hiểm hơn',
        emoji: '⚠️',
        style: 'danger',
        outcomes: [
          { chance: 40, text: 'Bạn chấp nhận rủi ro và tìm được phần thưởng tốt hơn trong rừng sâu.', actions: [{ type: 'gold', min: 8, max: 26 }, { type: 'item', itemId: 'ancient_bark', min: 1, max: 2 }] },
          { chance: 35, text: 'Tiếng động của bạn thu hút kẻ săn mồi gần đó.', actions: [{ type: 'combat_random' }] },
          { chance: 25, text: 'Cái giá của sự hấp tấp là vài vết thương và một bài học đau.', actions: [{ type: 'damage_percent', min: 7, max: 14 }, { type: 'exp', min: 4, max: 10 }] },
        ],
      },
    ],
  },
  {
    id: 'dd_forest_poacher_cache',
    title: '🦌 Kho Đồ Của Kẻ Săn Trộm',
    description: 'Bạn phát hiện một hốc cây giấu bẫy, da thú và túi tiền nhỏ. Có dấu chân mới quanh đây.',
    color: 0x2f4f2f,
    image: 'loot',
    weight: 3,
    zones: ['forest'],
    timeoutText: 'Bạn bỏ qua dấu hiệu lạ trong rừng và tiếp tục đi.',
    choices: [
      {
        id: 'careful',
        label: 'Tiếp cận cẩn thận',
        emoji: '🔎',
        style: 'primary',
        outcomes: [
          { chance: 75, text: 'Bạn xử lý tình huống cẩn thận và lấy được chút lợi ích mà không gây quá nhiều tiếng động.', actions: [{ type: 'reputation', amount: 1 }, { type: 'item', itemId: 'leather', min: 1, max: 1 }, { type: 'exp', min: 5, max: 12 }] },
          { chance: 25, text: 'Bạn đánh giá sai một chi tiết nhỏ và bị thương nhẹ.', actions: [{ type: 'damage_percent', min: 4, max: 9 }, { type: 'exp', min: 3, max: 7 }] },
        ],
      },
      {
        id: 'risk',
        label: 'Mạo hiểm hơn',
        emoji: '⚠️',
        style: 'danger',
        outcomes: [
          { chance: 40, text: 'Bạn chấp nhận rủi ro và tìm được phần thưởng tốt hơn trong rừng sâu.', actions: [{ type: 'gold', min: 8, max: 26 }, { type: 'item', itemId: 'leather', min: 1, max: 2 }] },
          { chance: 35, text: 'Tiếng động của bạn thu hút kẻ săn mồi gần đó.', actions: [{ type: 'combat_random' }] },
          { chance: 25, text: 'Cái giá của sự hấp tấp là vài vết thương và một bài học đau.', actions: [{ type: 'damage_percent', min: 7, max: 14 }, { type: 'exp', min: 4, max: 10 }] },
        ],
      },
    ],
  },
  {
    id: 'dd_forest_nest_of_bones',
    title: '🦴 Tổ Xương Trên Cành',
    description: 'Trên một cành cao là cái tổ làm từ xương nhỏ và dây rừng. Có thứ sáng mắc giữa các khúc xương.',
    color: 0x4f7942,
    image: 'loot',
    weight: 2,
    zones: ['forest'],
    timeoutText: 'Bạn bỏ qua dấu hiệu lạ trong rừng và tiếp tục đi.',
    choices: [
      {
        id: 'careful',
        label: 'Tiếp cận cẩn thận',
        emoji: '🔎',
        style: 'primary',
        outcomes: [
          { chance: 75, text: 'Bạn xử lý tình huống cẩn thận và lấy được chút lợi ích mà không gây quá nhiều tiếng động.', actions: [{ type: 'item', itemId: 'bone_shard', min: 1, max: 1 }, { type: 'exp', min: 5, max: 12 }] },
          { chance: 25, text: 'Bạn đánh giá sai một chi tiết nhỏ và bị thương nhẹ.', actions: [{ type: 'damage_percent', min: 4, max: 9 }, { type: 'exp', min: 3, max: 7 }] },
        ],
      },
      {
        id: 'risk',
        label: 'Mạo hiểm hơn',
        emoji: '⚠️',
        style: 'danger',
        outcomes: [
          { chance: 40, text: 'Bạn chấp nhận rủi ro và tìm được phần thưởng tốt hơn trong rừng sâu.', actions: [{ type: 'gold', min: 8, max: 26 }, { type: 'item', itemId: 'bone_shard', min: 1, max: 2 }] },
          { chance: 35, text: 'Tiếng động của bạn thu hút kẻ săn mồi gần đó.', actions: [{ type: 'combat_random' }] },
          { chance: 25, text: 'Cái giá của sự hấp tấp là vài vết thương và một bài học đau.', actions: [{ type: 'damage_percent', min: 7, max: 14 }, { type: 'exp', min: 4, max: 10 }] },
        ],
      },
    ],
  },
  {
    id: 'dd_forest_sap_wound',
    title: '🟡 Vết Thương Của Cây',
    description: 'Một thân cây cổ rỉ ra nhựa vàng như máu. Mùi nhựa ngọt nhưng làm đầu óc hơi mơ màng.',
    color: 0x3b5f2a,
    image: 'tree',
    weight: 2,
    zones: ['forest'],
    timeoutText: 'Bạn bỏ qua dấu hiệu lạ trong rừng và tiếp tục đi.',
    choices: [
      {
        id: 'careful',
        label: 'Tiếp cận cẩn thận',
        emoji: '🔎',
        style: 'primary',
        outcomes: [
          { chance: 75, text: 'Bạn xử lý tình huống cẩn thận và lấy được chút lợi ích mà không gây quá nhiều tiếng động.', actions: [{ type: 'item', itemId: 'amber_sap', min: 1, max: 1 }, { type: 'exp', min: 5, max: 12 }] },
          { chance: 25, text: 'Bạn đánh giá sai một chi tiết nhỏ và bị thương nhẹ.', actions: [{ type: 'damage_percent', min: 4, max: 9 }, { type: 'exp', min: 3, max: 7 }] },
        ],
      },
      {
        id: 'risk',
        label: 'Mạo hiểm hơn',
        emoji: '⚠️',
        style: 'danger',
        outcomes: [
          { chance: 40, text: 'Bạn chấp nhận rủi ro và tìm được phần thưởng tốt hơn trong rừng sâu.', actions: [{ type: 'gold', min: 8, max: 26 }, { type: 'item', itemId: 'amber_sap', min: 1, max: 2 }] },
          { chance: 35, text: 'Tiếng động của bạn thu hút kẻ săn mồi gần đó.', actions: [{ type: 'combat_random' }] },
          { chance: 25, text: 'Cái giá của sự hấp tấp là vài vết thương và một bài học đau.', actions: [{ type: 'damage_percent', min: 7, max: 14 }, { type: 'exp', min: 4, max: 10 }] },
        ],
      },
    ],
  },
  {
    id: 'dd_forest_barking_tree',
    title: '🗣️ Cây Biết Sủa',
    description: 'Một cái cây phát ra tiếng sủa khàn khàn mỗi khi bạn tới gần. Trong hốc cây có thứ gì đó rung lên.',
    color: 0x5a6b3a,
    image: 'tree',
    weight: 3,
    zones: ['forest'],
    timeoutText: 'Bạn bỏ qua dấu hiệu lạ trong rừng và tiếp tục đi.',
    choices: [
      {
        id: 'careful',
        label: 'Tiếp cận cẩn thận',
        emoji: '🔎',
        style: 'primary',
        outcomes: [
          { chance: 75, text: 'Bạn xử lý tình huống cẩn thận và lấy được chút lợi ích mà không gây quá nhiều tiếng động.', actions: [{ type: 'item', itemId: 'ancient_wood', min: 1, max: 1 }, { type: 'exp', min: 5, max: 12 }] },
          { chance: 25, text: 'Bạn đánh giá sai một chi tiết nhỏ và bị thương nhẹ.', actions: [{ type: 'damage_percent', min: 4, max: 9 }, { type: 'exp', min: 3, max: 7 }] },
        ],
      },
      {
        id: 'risk',
        label: 'Mạo hiểm hơn',
        emoji: '⚠️',
        style: 'danger',
        outcomes: [
          { chance: 40, text: 'Bạn chấp nhận rủi ro và tìm được phần thưởng tốt hơn trong rừng sâu.', actions: [{ type: 'gold', min: 8, max: 26 }, { type: 'item', itemId: 'ancient_wood', min: 1, max: 2 }] },
          { chance: 35, text: 'Tiếng động của bạn thu hút kẻ săn mồi gần đó.', actions: [{ type: 'world_danger', amount: 1 }, { type: 'combat_random' }] },
          { chance: 25, text: 'Cái giá của sự hấp tấp là vài vết thương và một bài học đau.', actions: [{ type: 'damage_percent', min: 7, max: 14 }, { type: 'exp', min: 4, max: 10 }] },
        ],
      },
    ],
  },
  {
    id: 'dd_forest_sleeping_deer',
    title: '🦌 Hươu Ngủ Dưới Hoa',
    description: 'Một con hươu trắng ngủ giữa thảm hoa. Trên gạc nó treo một sợi dây chuyền cũ.',
    color: 0x355e3b,
    image: 'spring',
    weight: 2,
    zones: ['forest'],
    timeoutText: 'Bạn bỏ qua dấu hiệu lạ trong rừng và tiếp tục đi.',
    choices: [
      {
        id: 'careful',
        label: 'Tiếp cận cẩn thận',
        emoji: '🔎',
        style: 'primary',
        outcomes: [
          { chance: 75, text: 'Bạn xử lý tình huống cẩn thận và lấy được chút lợi ích mà không gây quá nhiều tiếng động.', actions: [{ type: 'item', itemId: 'dream_petal', min: 1, max: 1 }, { type: 'exp', min: 5, max: 12 }] },
          { chance: 25, text: 'Bạn đánh giá sai một chi tiết nhỏ và bị thương nhẹ.', actions: [{ type: 'damage_percent', min: 4, max: 9 }, { type: 'exp', min: 3, max: 7 }] },
        ],
      },
      {
        id: 'risk',
        label: 'Mạo hiểm hơn',
        emoji: '⚠️',
        style: 'danger',
        outcomes: [
          { chance: 40, text: 'Bạn chấp nhận rủi ro và tìm được phần thưởng tốt hơn trong rừng sâu.', actions: [{ type: 'gold', min: 8, max: 26 }, { type: 'item', itemId: 'dream_petal', min: 1, max: 2 }] },
          { chance: 35, text: 'Tiếng động của bạn thu hút kẻ săn mồi gần đó.', actions: [{ type: 'combat_random' }] },
          { chance: 25, text: 'Cái giá của sự hấp tấp là vài vết thương và một bài học đau.', actions: [{ type: 'damage_percent', min: 7, max: 14 }, { type: 'exp', min: 4, max: 10 }] },
        ],
      },
    ],
  },
  {
    id: 'dd_forest_black_feather',
    title: '🪶 Lông Đen Rơi Xuống',
    description: 'Một chiếc lông đen rơi thẳng vào lòng bàn tay bạn dù không có chim trên trời. Nó lạnh như kim loại.',
    color: 0x2f4f2f,
    image: 'mysterious',
    weight: 2,
    zones: ['forest'],
    timeoutText: 'Bạn bỏ qua dấu hiệu lạ trong rừng và tiếp tục đi.',
    choices: [
      {
        id: 'careful',
        label: 'Tiếp cận cẩn thận',
        emoji: '🔎',
        style: 'primary',
        outcomes: [
          { chance: 75, text: 'Bạn xử lý tình huống cẩn thận và lấy được chút lợi ích mà không gây quá nhiều tiếng động.', actions: [{ type: 'item', itemId: 'shadow_shard', min: 1, max: 1 }, { type: 'exp', min: 5, max: 12 }] },
          { chance: 25, text: 'Bạn đánh giá sai một chi tiết nhỏ và bị thương nhẹ.', actions: [{ type: 'damage_percent', min: 4, max: 9 }, { type: 'exp', min: 3, max: 7 }] },
        ],
      },
      {
        id: 'risk',
        label: 'Mạo hiểm hơn',
        emoji: '⚠️',
        style: 'danger',
        outcomes: [
          { chance: 40, text: 'Bạn chấp nhận rủi ro và tìm được phần thưởng tốt hơn trong rừng sâu.', actions: [{ type: 'gold', min: 8, max: 26 }, { type: 'item', itemId: 'shadow_shard', min: 1, max: 2 }] },
          { chance: 35, text: 'Tiếng động của bạn thu hút kẻ săn mồi gần đó.', actions: [{ type: 'combat_random' }] },
          { chance: 25, text: 'Cái giá của sự hấp tấp là vài vết thương và một bài học đau.', actions: [{ type: 'damage_percent', min: 7, max: 14 }, { type: 'exp', min: 4, max: 10 }] },
        ],
      },
    ],
  },
  {
    id: 'dd_forest_cursed_puddle',
    title: '🕳️ Vũng Nước Đen',
    description: 'Một vũng nước đen đặc nằm giữa đường mòn. Mặt nước phản chiếu bạn với đôi mắt không thuộc về bạn.',
    color: 0x4f7942,
    image: 'mysterious',
    weight: 3,
    zones: ['forest'],
    timeoutText: 'Bạn bỏ qua dấu hiệu lạ trong rừng và tiếp tục đi.',
    choices: [
      {
        id: 'careful',
        label: 'Tiếp cận cẩn thận',
        emoji: '🔎',
        style: 'primary',
        outcomes: [
          { chance: 75, text: 'Bạn xử lý tình huống cẩn thận và lấy được chút lợi ích mà không gây quá nhiều tiếng động.', actions: [{ type: 'item', itemId: 'broken_soul', min: 1, max: 1 }, { type: 'exp', min: 5, max: 12 }] },
          { chance: 25, text: 'Bạn đánh giá sai một chi tiết nhỏ và bị thương nhẹ.', actions: [{ type: 'damage_percent', min: 4, max: 9 }, { type: 'exp', min: 3, max: 7 }] },
        ],
      },
      {
        id: 'risk',
        label: 'Mạo hiểm hơn',
        emoji: '⚠️',
        style: 'danger',
        outcomes: [
          { chance: 40, text: 'Bạn chấp nhận rủi ro và tìm được phần thưởng tốt hơn trong rừng sâu.', actions: [{ type: 'gold', min: 8, max: 26 }, { type: 'item', itemId: 'broken_soul', min: 1, max: 2 }] },
          { chance: 35, text: 'Tiếng động của bạn thu hút kẻ săn mồi gần đó.', actions: [{ type: 'combat_random' }] },
          { chance: 25, text: 'Cái giá của sự hấp tấp là vài vết thương và một bài học đau.', actions: [{ type: 'damage_percent', min: 7, max: 14 }, { type: 'exp', min: 4, max: 10 }] },
        ],
      },
    ],
  },
  {
    id: 'dd_forest_herb_circle',
    title: '🌿 Vòng Cỏ Thuốc',
    description: 'Nhiều loại cỏ thuốc mọc thành vòng tròn hoàn hảo. Không có dấu chân nào bên trong vòng.',
    color: 0x3b5f2a,
    image: 'herb',
    weight: 2,
    zones: ['forest'],
    timeoutText: 'Bạn bỏ qua dấu hiệu lạ trong rừng và tiếp tục đi.',
    choices: [
      {
        id: 'careful',
        label: 'Tiếp cận cẩn thận',
        emoji: '🔎',
        style: 'primary',
        outcomes: [
          { chance: 75, text: 'Bạn xử lý tình huống cẩn thận và lấy được chút lợi ích mà không gây quá nhiều tiếng động.', actions: [{ type: 'reputation', amount: 1 }, { type: 'item', itemId: 'rare_herb', min: 1, max: 1 }, { type: 'exp', min: 5, max: 12 }] },
          { chance: 25, text: 'Bạn đánh giá sai một chi tiết nhỏ và bị thương nhẹ.', actions: [{ type: 'damage_percent', min: 4, max: 9 }, { type: 'exp', min: 3, max: 7 }] },
        ],
      },
      {
        id: 'risk',
        label: 'Mạo hiểm hơn',
        emoji: '⚠️',
        style: 'danger',
        outcomes: [
          { chance: 40, text: 'Bạn chấp nhận rủi ro và tìm được phần thưởng tốt hơn trong rừng sâu.', actions: [{ type: 'gold', min: 8, max: 26 }, { type: 'item', itemId: 'rare_herb', min: 1, max: 2 }] },
          { chance: 35, text: 'Tiếng động của bạn thu hút kẻ săn mồi gần đó.', actions: [{ type: 'combat_random' }] },
          { chance: 25, text: 'Cái giá của sự hấp tấp là vài vết thương và một bài học đau.', actions: [{ type: 'damage_percent', min: 7, max: 14 }, { type: 'exp', min: 4, max: 10 }] },
        ],
      },
    ],
  },
  {
    id: 'dd_forest_abandoned_totem',
    title: '🪵 Totem Bị Bỏ Quên',
    description: 'Một totem gỗ cũ đổ nghiêng, mặt khắc đã mòn. Dù vậy, mắt gỗ vẫn nhìn theo bạn.',
    color: 0x5a6b3a,
    image: 'altar',
    weight: 2,
    zones: ['forest'],
    timeoutText: 'Bạn bỏ qua dấu hiệu lạ trong rừng và tiếp tục đi.',
    choices: [
      {
        id: 'careful',
        label: 'Tiếp cận cẩn thận',
        emoji: '🔎',
        style: 'primary',
        outcomes: [
          { chance: 75, text: 'Bạn xử lý tình huống cẩn thận và lấy được chút lợi ích mà không gây quá nhiều tiếng động.', actions: [{ type: 'item', itemId: 'ancient_wood', min: 1, max: 1 }, { type: 'exp', min: 5, max: 12 }] },
          { chance: 25, text: 'Bạn đánh giá sai một chi tiết nhỏ và bị thương nhẹ.', actions: [{ type: 'damage_percent', min: 4, max: 9 }, { type: 'exp', min: 3, max: 7 }] },
        ],
      },
      {
        id: 'risk',
        label: 'Mạo hiểm hơn',
        emoji: '⚠️',
        style: 'danger',
        outcomes: [
          { chance: 40, text: 'Bạn chấp nhận rủi ro và tìm được phần thưởng tốt hơn trong rừng sâu.', actions: [{ type: 'gold', min: 8, max: 26 }, { type: 'item', itemId: 'ancient_wood', min: 1, max: 2 }] },
          { chance: 35, text: 'Tiếng động của bạn thu hút kẻ săn mồi gần đó.', actions: [{ type: 'combat_random' }] },
          { chance: 25, text: 'Cái giá của sự hấp tấp là vài vết thương và một bài học đau.', actions: [{ type: 'damage_percent', min: 7, max: 14 }, { type: 'exp', min: 4, max: 10 }] },
        ],
      },
    ],
  },
  {
    id: 'dd_forest_shivering_bush',
    title: '🍃 Bụi Cây Run Rẩy',
    description: 'Một bụi cây rung liên tục dù không có gió. Có tiếng thở nhỏ bên trong.',
    color: 0x355e3b,
    image: 'villager',
    weight: 3,
    zones: ['forest'],
    timeoutText: 'Bạn bỏ qua dấu hiệu lạ trong rừng và tiếp tục đi.',
    choices: [
      {
        id: 'careful',
        label: 'Tiếp cận cẩn thận',
        emoji: '🔎',
        style: 'primary',
        outcomes: [
          { chance: 75, text: 'Bạn xử lý tình huống cẩn thận và lấy được chút lợi ích mà không gây quá nhiều tiếng động.', actions: [{ type: 'item', itemId: 'forest_fruit', min: 1, max: 1 }, { type: 'exp', min: 5, max: 12 }] },
          { chance: 25, text: 'Bạn đánh giá sai một chi tiết nhỏ và bị thương nhẹ.', actions: [{ type: 'damage_percent', min: 4, max: 9 }, { type: 'exp', min: 3, max: 7 }] },
        ],
      },
      {
        id: 'risk',
        label: 'Mạo hiểm hơn',
        emoji: '⚠️',
        style: 'danger',
        outcomes: [
          { chance: 40, text: 'Bạn chấp nhận rủi ro và tìm được phần thưởng tốt hơn trong rừng sâu.', actions: [{ type: 'gold', min: 8, max: 26 }, { type: 'item', itemId: 'forest_fruit', min: 1, max: 2 }] },
          { chance: 35, text: 'Tiếng động của bạn thu hút kẻ săn mồi gần đó.', actions: [{ type: 'combat_random' }] },
          { chance: 25, text: 'Cái giá của sự hấp tấp là vài vết thương và một bài học đau.', actions: [{ type: 'damage_percent', min: 7, max: 14 }, { type: 'exp', min: 4, max: 10 }] },
        ],
      },
    ],
  },
  {
    id: 'dd_forest_fairy_jar',
    title: '🫙 Lọ Đom Đóm Bị Nút Kín',
    description: 'Một chiếc lọ thủy tinh treo trên cành, bên trong có ánh sáng nhỏ đập liên tục vào thành lọ.',
    color: 0x2f4f2f,
    image: 'fairy',
    weight: 2,
    zones: ['forest'],
    timeoutText: 'Bạn bỏ qua dấu hiệu lạ trong rừng và tiếp tục đi.',
    choices: [
      {
        id: 'careful',
        label: 'Tiếp cận cẩn thận',
        emoji: '🔎',
        style: 'primary',
        outcomes: [
          { chance: 75, text: 'Bạn xử lý tình huống cẩn thận và lấy được chút lợi ích mà không gây quá nhiều tiếng động.', actions: [{ type: 'item', itemId: 'soul_dust', min: 1, max: 1 }, { type: 'exp', min: 5, max: 12 }] },
          { chance: 25, text: 'Bạn đánh giá sai một chi tiết nhỏ và bị thương nhẹ.', actions: [{ type: 'damage_percent', min: 4, max: 9 }, { type: 'exp', min: 3, max: 7 }] },
        ],
      },
      {
        id: 'risk',
        label: 'Mạo hiểm hơn',
        emoji: '⚠️',
        style: 'danger',
        outcomes: [
          { chance: 40, text: 'Bạn chấp nhận rủi ro và tìm được phần thưởng tốt hơn trong rừng sâu.', actions: [{ type: 'gold', min: 8, max: 26 }, { type: 'item', itemId: 'soul_dust', min: 1, max: 2 }] },
          { chance: 35, text: 'Tiếng động của bạn thu hút kẻ săn mồi gần đó.', actions: [{ type: 'combat_random' }] },
          { chance: 25, text: 'Cái giá của sự hấp tấp là vài vết thương và một bài học đau.', actions: [{ type: 'damage_percent', min: 7, max: 14 }, { type: 'exp', min: 4, max: 10 }] },
        ],
      },
    ],
  },
  {
    id: 'dd_forest_bone_wind_chime',
    title: '🎐 Chuông Gió Bằng Xương',
    description: 'Những mảnh xương nhỏ treo trên cành cây kêu leng keng dù không có gió. Âm thanh nghe như lời cảnh báo.',
    color: 0x4f7942,
    image: 'mysterious',
    weight: 2,
    zones: ['forest'],
    timeoutText: 'Bạn bỏ qua dấu hiệu lạ trong rừng và tiếp tục đi.',
    choices: [
      {
        id: 'careful',
        label: 'Tiếp cận cẩn thận',
        emoji: '🔎',
        style: 'primary',
        outcomes: [
          { chance: 75, text: 'Bạn xử lý tình huống cẩn thận và lấy được chút lợi ích mà không gây quá nhiều tiếng động.', actions: [{ type: 'item', itemId: 'bone_shard', min: 1, max: 1 }, { type: 'exp', min: 5, max: 12 }] },
          { chance: 25, text: 'Bạn đánh giá sai một chi tiết nhỏ và bị thương nhẹ.', actions: [{ type: 'damage_percent', min: 4, max: 9 }, { type: 'exp', min: 3, max: 7 }] },
        ],
      },
      {
        id: 'risk',
        label: 'Mạo hiểm hơn',
        emoji: '⚠️',
        style: 'danger',
        outcomes: [
          { chance: 40, text: 'Bạn chấp nhận rủi ro và tìm được phần thưởng tốt hơn trong rừng sâu.', actions: [{ type: 'gold', min: 8, max: 26 }, { type: 'item', itemId: 'bone_shard', min: 1, max: 2 }] },
          { chance: 35, text: 'Tiếng động của bạn thu hút kẻ săn mồi gần đó.', actions: [{ type: 'world_danger', amount: 1 }, { type: 'combat_random' }] },
          { chance: 25, text: 'Cái giá của sự hấp tấp là vài vết thương và một bài học đau.', actions: [{ type: 'damage_percent', min: 7, max: 14 }, { type: 'exp', min: 4, max: 10 }] },
        ],
      },
    ],
  },
  {
    id: 'dd_forest_old_well',
    title: '🕳️ Giếng Cổ Trong Rừng',
    description: 'Một cái giếng đá nằm giữa rừng, không có làng nào quanh đây. Từ dưới vọng lên tiếng nước nhỏ giọt.',
    color: 0x3b5f2a,
    image: 'spring',
    weight: 3,
    zones: ['forest'],
    timeoutText: 'Bạn bỏ qua dấu hiệu lạ trong rừng và tiếp tục đi.',
    choices: [
      {
        id: 'careful',
        label: 'Tiếp cận cẩn thận',
        emoji: '🔎',
        style: 'primary',
        outcomes: [
          { chance: 75, text: 'Bạn xử lý tình huống cẩn thận và lấy được chút lợi ích mà không gây quá nhiều tiếng động.', actions: [{ type: 'item', itemId: 'rusty_gear', min: 1, max: 1 }, { type: 'exp', min: 5, max: 12 }] },
          { chance: 25, text: 'Bạn đánh giá sai một chi tiết nhỏ và bị thương nhẹ.', actions: [{ type: 'damage_percent', min: 4, max: 9 }, { type: 'exp', min: 3, max: 7 }] },
        ],
      },
      {
        id: 'risk',
        label: 'Mạo hiểm hơn',
        emoji: '⚠️',
        style: 'danger',
        outcomes: [
          { chance: 40, text: 'Bạn chấp nhận rủi ro và tìm được phần thưởng tốt hơn trong rừng sâu.', actions: [{ type: 'gold', min: 8, max: 26 }, { type: 'item', itemId: 'rusty_gear', min: 1, max: 2 }] },
          { chance: 35, text: 'Tiếng động của bạn thu hút kẻ săn mồi gần đó.', actions: [{ type: 'combat_random' }] },
          { chance: 25, text: 'Cái giá của sự hấp tấp là vài vết thương và một bài học đau.', actions: [{ type: 'damage_percent', min: 7, max: 14 }, { type: 'exp', min: 4, max: 10 }] },
        ],
      },
    ],
  },
  {
    id: 'dd_forest_deep_howl',
    title: '🐺 Tiếng Hú Rất Gần',
    description: 'Một tiếng hú trầm vang lên sau lưng bạn. Không thấy bóng con thú nào, nhưng rừng đột nhiên im phăng phắc.',
    color: 0x5a6b3a,
    image: 'combat',
    weight: 2,
    zones: ['forest'],
    requiresCombat: true,
    timeoutText: 'Bạn bỏ qua dấu hiệu lạ trong rừng và tiếp tục đi.',
    choices: [
      {
        id: 'careful',
        label: 'Tiếp cận cẩn thận',
        emoji: '🔎',
        style: 'primary',
        outcomes: [
          { chance: 75, text: 'Bạn xử lý tình huống cẩn thận và lấy được chút lợi ích mà không gây quá nhiều tiếng động.', actions: [{ type: 'item', itemId: 'wolf_fang', min: 1, max: 1 }, { type: 'exp', min: 5, max: 12 }] },
          { chance: 25, text: 'Bạn đánh giá sai một chi tiết nhỏ và bị thương nhẹ.', actions: [{ type: 'damage_percent', min: 4, max: 9 }, { type: 'exp', min: 3, max: 7 }] },
        ],
      },
      {
        id: 'risk',
        label: 'Mạo hiểm hơn',
        emoji: '⚠️',
        style: 'danger',
        outcomes: [
          { chance: 40, text: 'Bạn chấp nhận rủi ro và tìm được phần thưởng tốt hơn trong rừng sâu.', actions: [{ type: 'gold', min: 8, max: 26 }, { type: 'item', itemId: 'wolf_fang', min: 1, max: 2 }] },
          { chance: 35, text: 'Tiếng động của bạn thu hút kẻ săn mồi gần đó.', actions: [{ type: 'combat_random' }] },
          { chance: 25, text: 'Cái giá của sự hấp tấp là vài vết thương và một bài học đau.', actions: [{ type: 'damage_percent', min: 7, max: 14 }, { type: 'exp', min: 4, max: 10 }] },
        ],
      },
    ],
  },
  {
    id: 'dd_forest_trail_of_coins',
    title: '🪙 Vệt Đồng Xu Trên Lá',
    description: 'Một hàng đồng xu nhỏ nằm rải trên lá khô, dẫn vào lối mòn hẹp. Quá ngay ngắn để là tình cờ.',
    color: 0x355e3b,
    image: 'loot',
    weight: 2,
    zones: ['forest'],
    timeoutText: 'Bạn bỏ qua dấu hiệu lạ trong rừng và tiếp tục đi.',
    choices: [
      {
        id: 'careful',
        label: 'Tiếp cận cẩn thận',
        emoji: '🔎',
        style: 'primary',
        outcomes: [
          { chance: 75, text: 'Bạn xử lý tình huống cẩn thận và lấy được chút lợi ích mà không gây quá nhiều tiếng động.', actions: [{ type: 'reputation', amount: 1 }, { type: 'item', itemId: 'lucky_coin', min: 1, max: 1 }, { type: 'exp', min: 5, max: 12 }] },
          { chance: 25, text: 'Bạn đánh giá sai một chi tiết nhỏ và bị thương nhẹ.', actions: [{ type: 'damage_percent', min: 4, max: 9 }, { type: 'exp', min: 3, max: 7 }] },
        ],
      },
      {
        id: 'risk',
        label: 'Mạo hiểm hơn',
        emoji: '⚠️',
        style: 'danger',
        outcomes: [
          { chance: 40, text: 'Bạn chấp nhận rủi ro và tìm được phần thưởng tốt hơn trong rừng sâu.', actions: [{ type: 'gold', min: 8, max: 26 }, { type: 'item', itemId: 'lucky_coin', min: 1, max: 2 }] },
          { chance: 35, text: 'Tiếng động của bạn thu hút kẻ săn mồi gần đó.', actions: [{ type: 'combat_random' }] },
          { chance: 25, text: 'Cái giá của sự hấp tấp là vài vết thương và một bài học đau.', actions: [{ type: 'damage_percent', min: 7, max: 14 }, { type: 'exp', min: 4, max: 10 }] },
        ],
      },
    ],
  },
  {
    id: 'dd_forest_torn_banner',
    title: '🏳️ Lá Cờ Rách',
    description: 'Một lá cờ rách mắc trên cành cao. Ký hiệu trên đó giống một đoàn thám hiểm đã mất tích.',
    color: 0x2f4f2f,
    image: 'legacy',
    weight: 3,
    zones: ['forest'],
    timeoutText: 'Bạn bỏ qua dấu hiệu lạ trong rừng và tiếp tục đi.',
    choices: [
      {
        id: 'careful',
        label: 'Tiếp cận cẩn thận',
        emoji: '🔎',
        style: 'primary',
        outcomes: [
          { chance: 75, text: 'Bạn xử lý tình huống cẩn thận và lấy được chút lợi ích mà không gây quá nhiều tiếng động.', actions: [{ type: 'item', itemId: 'knight_emblem', min: 1, max: 1 }, { type: 'exp', min: 5, max: 12 }] },
          { chance: 25, text: 'Bạn đánh giá sai một chi tiết nhỏ và bị thương nhẹ.', actions: [{ type: 'damage_percent', min: 4, max: 9 }, { type: 'exp', min: 3, max: 7 }] },
        ],
      },
      {
        id: 'risk',
        label: 'Mạo hiểm hơn',
        emoji: '⚠️',
        style: 'danger',
        outcomes: [
          { chance: 40, text: 'Bạn chấp nhận rủi ro và tìm được phần thưởng tốt hơn trong rừng sâu.', actions: [{ type: 'gold', min: 8, max: 26 }, { type: 'item', itemId: 'knight_emblem', min: 1, max: 2 }] },
          { chance: 35, text: 'Tiếng động của bạn thu hút kẻ săn mồi gần đó.', actions: [{ type: 'combat_random' }] },
          { chance: 25, text: 'Cái giá của sự hấp tấp là vài vết thương và một bài học đau.', actions: [{ type: 'damage_percent', min: 7, max: 14 }, { type: 'exp', min: 4, max: 10 }] },
        ],
      },
    ],
  },
  {
    id: 'dd_forest_wild_honey',
    title: '🍯 Mật Rừng Chảy Trên Đá',
    description: 'Mật vàng chảy ra từ khe đá, mùi thơm nồng đến mức làm bụng bạn réo lên.',
    color: 0x4f7942,
    image: 'loot',
    weight: 2,
    zones: ['forest'],
    timeoutText: 'Bạn bỏ qua dấu hiệu lạ trong rừng và tiếp tục đi.',
    choices: [
      {
        id: 'careful',
        label: 'Tiếp cận cẩn thận',
        emoji: '🔎',
        style: 'primary',
        outcomes: [
          { chance: 75, text: 'Bạn xử lý tình huống cẩn thận và lấy được chút lợi ích mà không gây quá nhiều tiếng động.', actions: [{ type: 'item', itemId: 'honey', min: 1, max: 1 }, { type: 'exp', min: 5, max: 12 }] },
          { chance: 25, text: 'Bạn đánh giá sai một chi tiết nhỏ và bị thương nhẹ.', actions: [{ type: 'damage_percent', min: 4, max: 9 }, { type: 'exp', min: 3, max: 7 }] },
        ],
      },
      {
        id: 'risk',
        label: 'Mạo hiểm hơn',
        emoji: '⚠️',
        style: 'danger',
        outcomes: [
          { chance: 40, text: 'Bạn chấp nhận rủi ro và tìm được phần thưởng tốt hơn trong rừng sâu.', actions: [{ type: 'gold', min: 8, max: 26 }, { type: 'item', itemId: 'honey', min: 1, max: 2 }] },
          { chance: 35, text: 'Tiếng động của bạn thu hút kẻ săn mồi gần đó.', actions: [{ type: 'combat_random' }] },
          { chance: 25, text: 'Cái giá của sự hấp tấp là vài vết thương và một bài học đau.', actions: [{ type: 'damage_percent', min: 7, max: 14 }, { type: 'exp', min: 4, max: 10 }] },
        ],
      },
    ],
  },
  {
    id: 'dd_forest_thief_shadow',
    title: '🗡️ Bóng Người Sau Thân Cây',
    description: 'Một bóng người lướt qua sau thân cây, nhanh như đã quen săn mồi trong rừng.',
    color: 0x3b5f2a,
    image: 'ambush',
    weight: 2,
    zones: ['forest'],
    requiresCombat: true,
    timeoutText: 'Bạn bỏ qua dấu hiệu lạ trong rừng và tiếp tục đi.',
    choices: [
      {
        id: 'careful',
        label: 'Tiếp cận cẩn thận',
        emoji: '🔎',
        style: 'primary',
        outcomes: [
          { chance: 75, text: 'Bạn xử lý tình huống cẩn thận và lấy được chút lợi ích mà không gây quá nhiều tiếng động.', actions: [{ type: 'item', itemId: 'bribe_coin', min: 1, max: 1 }, { type: 'exp', min: 5, max: 12 }] },
          { chance: 25, text: 'Bạn đánh giá sai một chi tiết nhỏ và bị thương nhẹ.', actions: [{ type: 'damage_percent', min: 4, max: 9 }, { type: 'exp', min: 3, max: 7 }] },
        ],
      },
      {
        id: 'risk',
        label: 'Mạo hiểm hơn',
        emoji: '⚠️',
        style: 'danger',
        outcomes: [
          { chance: 40, text: 'Bạn chấp nhận rủi ro và tìm được phần thưởng tốt hơn trong rừng sâu.', actions: [{ type: 'gold', min: 8, max: 26 }, { type: 'item', itemId: 'bribe_coin', min: 1, max: 2 }] },
          { chance: 35, text: 'Tiếng động của bạn thu hút kẻ săn mồi gần đó.', actions: [{ type: 'combat_random' }] },
          { chance: 25, text: 'Cái giá của sự hấp tấp là vài vết thương và một bài học đau.', actions: [{ type: 'damage_percent', min: 7, max: 14 }, { type: 'exp', min: 4, max: 10 }] },
        ],
      },
    ],
  },
  {
    id: 'dd_forest_rain_shelter',
    title: '🌧️ Mái Trú Mưa Bằng Lá',
    description: 'Mưa rừng đổ xuống bất ngờ. Một mái trú bằng lá cũ vẫn còn đủ che một người.',
    color: 0x5a6b3a,
    image: 'camp',
    weight: 3,
    zones: ['forest'],
    timeoutText: 'Bạn bỏ qua dấu hiệu lạ trong rừng và tiếp tục đi.',
    choices: [
      {
        id: 'careful',
        label: 'Tiếp cận cẩn thận',
        emoji: '🔎',
        style: 'primary',
        outcomes: [
          { chance: 75, text: 'Bạn xử lý tình huống cẩn thận và lấy được chút lợi ích mà không gây quá nhiều tiếng động.', actions: [{ type: 'item', itemId: 'bread', min: 1, max: 1 }, { type: 'exp', min: 5, max: 12 }] },
          { chance: 25, text: 'Bạn đánh giá sai một chi tiết nhỏ và bị thương nhẹ.', actions: [{ type: 'damage_percent', min: 4, max: 9 }, { type: 'exp', min: 3, max: 7 }] },
        ],
      },
      {
        id: 'risk',
        label: 'Mạo hiểm hơn',
        emoji: '⚠️',
        style: 'danger',
        outcomes: [
          { chance: 40, text: 'Bạn chấp nhận rủi ro và tìm được phần thưởng tốt hơn trong rừng sâu.', actions: [{ type: 'gold', min: 8, max: 26 }, { type: 'item', itemId: 'bread', min: 1, max: 2 }] },
          { chance: 35, text: 'Tiếng động của bạn thu hút kẻ săn mồi gần đó.', actions: [{ type: 'combat_random' }] },
          { chance: 25, text: 'Cái giá của sự hấp tấp là vài vết thương và một bài học đau.', actions: [{ type: 'damage_percent', min: 7, max: 14 }, { type: 'exp', min: 4, max: 10 }] },
        ],
      },
    ],
  },
  {
    id: 'dd_forest_silver_leaf',
    title: '🍃 Chiếc Lá Bạc',
    description: 'Một chiếc lá bạc xoay tròn trong không trung, không rơi xuống đất. Mỗi vòng xoay để lại vệt sáng mỏng.',
    color: 0x355e3b,
    image: 'magic',
    weight: 2,
    zones: ['forest'],
    timeoutText: 'Bạn bỏ qua dấu hiệu lạ trong rừng và tiếp tục đi.',
    choices: [
      {
        id: 'careful',
        label: 'Tiếp cận cẩn thận',
        emoji: '🔎',
        style: 'primary',
        outcomes: [
          { chance: 75, text: 'Bạn xử lý tình huống cẩn thận và lấy được chút lợi ích mà không gây quá nhiều tiếng động.', actions: [{ type: 'item', itemId: 'silver_ore', min: 1, max: 1 }, { type: 'exp', min: 5, max: 12 }] },
          { chance: 25, text: 'Bạn đánh giá sai một chi tiết nhỏ và bị thương nhẹ.', actions: [{ type: 'damage_percent', min: 4, max: 9 }, { type: 'exp', min: 3, max: 7 }] },
        ],
      },
      {
        id: 'risk',
        label: 'Mạo hiểm hơn',
        emoji: '⚠️',
        style: 'danger',
        outcomes: [
          { chance: 40, text: 'Bạn chấp nhận rủi ro và tìm được phần thưởng tốt hơn trong rừng sâu.', actions: [{ type: 'gold', min: 8, max: 26 }, { type: 'item', itemId: 'silver_ore', min: 1, max: 2 }] },
          { chance: 35, text: 'Tiếng động của bạn thu hút kẻ săn mồi gần đó.', actions: [{ type: 'world_danger', amount: 1 }, { type: 'combat_random' }] },
          { chance: 25, text: 'Cái giá của sự hấp tấp là vài vết thương và một bài học đau.', actions: [{ type: 'damage_percent', min: 7, max: 14 }, { type: 'exp', min: 4, max: 10 }] },
        ],
      },
    ],
  },
  {
    id: 'dd_forest_dead_rabbit',
    title: '🐇 Xác Thỏ Không Máu',
    description: 'Một con thỏ nằm giữa đường mòn, không có vết thương nhưng toàn bộ máu đã biến mất.',
    color: 0x2f4f2f,
    image: 'mysterious',
    weight: 2,
    zones: ['forest'],
    requiresCombat: true,
    timeoutText: 'Bạn bỏ qua dấu hiệu lạ trong rừng và tiếp tục đi.',
    choices: [
      {
        id: 'careful',
        label: 'Tiếp cận cẩn thận',
        emoji: '🔎',
        style: 'primary',
        outcomes: [
          { chance: 75, text: 'Bạn xử lý tình huống cẩn thận và lấy được chút lợi ích mà không gây quá nhiều tiếng động.', actions: [{ type: 'item', itemId: 'bone_shard', min: 1, max: 1 }, { type: 'exp', min: 5, max: 12 }] },
          { chance: 25, text: 'Bạn đánh giá sai một chi tiết nhỏ và bị thương nhẹ.', actions: [{ type: 'damage_percent', min: 4, max: 9 }, { type: 'exp', min: 3, max: 7 }] },
        ],
      },
      {
        id: 'risk',
        label: 'Mạo hiểm hơn',
        emoji: '⚠️',
        style: 'danger',
        outcomes: [
          { chance: 40, text: 'Bạn chấp nhận rủi ro và tìm được phần thưởng tốt hơn trong rừng sâu.', actions: [{ type: 'gold', min: 8, max: 26 }, { type: 'item', itemId: 'bone_shard', min: 1, max: 2 }] },
          { chance: 35, text: 'Tiếng động của bạn thu hút kẻ săn mồi gần đó.', actions: [{ type: 'combat_random' }] },
          { chance: 25, text: 'Cái giá của sự hấp tấp là vài vết thương và một bài học đau.', actions: [{ type: 'damage_percent', min: 7, max: 14 }, { type: 'exp', min: 4, max: 10 }] },
        ],
      },
    ],
  },
  {
    id: 'dd_forest_singing_stump',
    title: '🎵 Gốc Cây Hát Nhỏ',
    description: 'Một gốc cây mục phát ra giai điệu khe khẽ. Bài hát làm bạn nhớ đến nơi chưa từng đến.',
    color: 0x4f7942,
    image: 'mysterious',
    weight: 3,
    zones: ['forest'],
    timeoutText: 'Bạn bỏ qua dấu hiệu lạ trong rừng và tiếp tục đi.',
    choices: [
      {
        id: 'careful',
        label: 'Tiếp cận cẩn thận',
        emoji: '🔎',
        style: 'primary',
        outcomes: [
          { chance: 75, text: 'Bạn xử lý tình huống cẩn thận và lấy được chút lợi ích mà không gây quá nhiều tiếng động.', actions: [{ type: 'reputation', amount: 1 }, { type: 'item', itemId: 'bard_song', min: 1, max: 1 }, { type: 'exp', min: 5, max: 12 }] },
          { chance: 25, text: 'Bạn đánh giá sai một chi tiết nhỏ và bị thương nhẹ.', actions: [{ type: 'damage_percent', min: 4, max: 9 }, { type: 'exp', min: 3, max: 7 }] },
        ],
      },
      {
        id: 'risk',
        label: 'Mạo hiểm hơn',
        emoji: '⚠️',
        style: 'danger',
        outcomes: [
          { chance: 40, text: 'Bạn chấp nhận rủi ro và tìm được phần thưởng tốt hơn trong rừng sâu.', actions: [{ type: 'gold', min: 8, max: 26 }, { type: 'item', itemId: 'bard_song', min: 1, max: 2 }] },
          { chance: 35, text: 'Tiếng động của bạn thu hút kẻ săn mồi gần đó.', actions: [{ type: 'combat_random' }] },
          { chance: 25, text: 'Cái giá của sự hấp tấp là vài vết thương và một bài học đau.', actions: [{ type: 'damage_percent', min: 7, max: 14 }, { type: 'exp', min: 4, max: 10 }] },
        ],
      },
    ],
  },
  {
    id: 'dd_forest_buried_arrow',
    title: '🏹 Mũi Tên Cắm Trong Đất',
    description: 'Một mũi tên cũ cắm sâu xuống đất, lông đuôi vẫn còn dính máu khô.',
    color: 0x3b5f2a,
    image: 'loot',
    weight: 2,
    zones: ['forest'],
    timeoutText: 'Bạn bỏ qua dấu hiệu lạ trong rừng và tiếp tục đi.',
    choices: [
      {
        id: 'careful',
        label: 'Tiếp cận cẩn thận',
        emoji: '🔎',
        style: 'primary',
        outcomes: [
          { chance: 75, text: 'Bạn xử lý tình huống cẩn thận và lấy được chút lợi ích mà không gây quá nhiều tiếng động.', actions: [{ type: 'item', itemId: 'iron_ore', min: 1, max: 1 }, { type: 'exp', min: 5, max: 12 }] },
          { chance: 25, text: 'Bạn đánh giá sai một chi tiết nhỏ và bị thương nhẹ.', actions: [{ type: 'damage_percent', min: 4, max: 9 }, { type: 'exp', min: 3, max: 7 }] },
        ],
      },
      {
        id: 'risk',
        label: 'Mạo hiểm hơn',
        emoji: '⚠️',
        style: 'danger',
        outcomes: [
          { chance: 40, text: 'Bạn chấp nhận rủi ro và tìm được phần thưởng tốt hơn trong rừng sâu.', actions: [{ type: 'gold', min: 8, max: 26 }, { type: 'item', itemId: 'iron_ore', min: 1, max: 2 }] },
          { chance: 35, text: 'Tiếng động của bạn thu hút kẻ săn mồi gần đó.', actions: [{ type: 'combat_random' }] },
          { chance: 25, text: 'Cái giá của sự hấp tấp là vài vết thương và một bài học đau.', actions: [{ type: 'damage_percent', min: 7, max: 14 }, { type: 'exp', min: 4, max: 10 }] },
        ],
      },
    ],
  },
  {
    id: 'dd_forest_mirror_bark',
    title: '🪞 Vỏ Cây Như Gương',
    description: 'Một mảng vỏ cây phản chiếu bạn rõ như gương. Trong ảnh phản chiếu, bạn đang cầm một thứ khác.',
    color: 0x5a6b3a,
    image: 'mysterious',
    weight: 2,
    zones: ['forest'],
    timeoutText: 'Bạn bỏ qua dấu hiệu lạ trong rừng và tiếp tục đi.',
    choices: [
      {
        id: 'careful',
        label: 'Tiếp cận cẩn thận',
        emoji: '🔎',
        style: 'primary',
        outcomes: [
          { chance: 75, text: 'Bạn xử lý tình huống cẩn thận và lấy được chút lợi ích mà không gây quá nhiều tiếng động.', actions: [{ type: 'item', itemId: 'mysterious_shard', min: 1, max: 1 }, { type: 'exp', min: 5, max: 12 }] },
          { chance: 25, text: 'Bạn đánh giá sai một chi tiết nhỏ và bị thương nhẹ.', actions: [{ type: 'damage_percent', min: 4, max: 9 }, { type: 'exp', min: 3, max: 7 }] },
        ],
      },
      {
        id: 'risk',
        label: 'Mạo hiểm hơn',
        emoji: '⚠️',
        style: 'danger',
        outcomes: [
          { chance: 40, text: 'Bạn chấp nhận rủi ro và tìm được phần thưởng tốt hơn trong rừng sâu.', actions: [{ type: 'gold', min: 8, max: 26 }, { type: 'item', itemId: 'mysterious_shard', min: 1, max: 2 }] },
          { chance: 35, text: 'Tiếng động của bạn thu hút kẻ săn mồi gần đó.', actions: [{ type: 'combat_random' }] },
          { chance: 25, text: 'Cái giá của sự hấp tấp là vài vết thương và một bài học đau.', actions: [{ type: 'damage_percent', min: 7, max: 14 }, { type: 'exp', min: 4, max: 10 }] },
        ],
      },
    ],
  },
  {
    id: 'dd_forest_fern_tunnel',
    title: '🌿 Đường Hầm Dương Xỉ',
    description: 'Hai hàng dương xỉ cao quá đầu tạo thành một đường hầm xanh. Không thấy cuối đường.',
    color: 0x355e3b,
    image: 'forest',
    weight: 3,
    zones: ['forest'],
    timeoutText: 'Bạn bỏ qua dấu hiệu lạ trong rừng và tiếp tục đi.',
    choices: [
      {
        id: 'careful',
        label: 'Tiếp cận cẩn thận',
        emoji: '🔎',
        style: 'primary',
        outcomes: [
          { chance: 75, text: 'Bạn xử lý tình huống cẩn thận và lấy được chút lợi ích mà không gây quá nhiều tiếng động.', actions: [{ type: 'item', itemId: 'rare_herb', min: 1, max: 1 }, { type: 'exp', min: 5, max: 12 }] },
          { chance: 25, text: 'Bạn đánh giá sai một chi tiết nhỏ và bị thương nhẹ.', actions: [{ type: 'damage_percent', min: 4, max: 9 }, { type: 'exp', min: 3, max: 7 }] },
        ],
      },
      {
        id: 'risk',
        label: 'Mạo hiểm hơn',
        emoji: '⚠️',
        style: 'danger',
        outcomes: [
          { chance: 40, text: 'Bạn chấp nhận rủi ro và tìm được phần thưởng tốt hơn trong rừng sâu.', actions: [{ type: 'gold', min: 8, max: 26 }, { type: 'item', itemId: 'rare_herb', min: 1, max: 2 }] },
          { chance: 35, text: 'Tiếng động của bạn thu hút kẻ săn mồi gần đó.', actions: [{ type: 'combat_random' }] },
          { chance: 25, text: 'Cái giá của sự hấp tấp là vài vết thương và một bài học đau.', actions: [{ type: 'damage_percent', min: 7, max: 14 }, { type: 'exp', min: 4, max: 10 }] },
        ],
      },
    ],
  },
  {
    id: 'dd_forest_fallen_idol',
    title: '🗿 Tượng Nhỏ Bị Đổ',
    description: 'Một tượng đá nhỏ nằm úp mặt xuống bùn. Phần lưng khắc đầy ký hiệu cầu may.',
    color: 0x2f4f2f,
    image: 'altar',
    weight: 2,
    zones: ['forest'],
    timeoutText: 'Bạn bỏ qua dấu hiệu lạ trong rừng và tiếp tục đi.',
    choices: [
      {
        id: 'careful',
        label: 'Tiếp cận cẩn thận',
        emoji: '🔎',
        style: 'primary',
        outcomes: [
          { chance: 75, text: 'Bạn xử lý tình huống cẩn thận và lấy được chút lợi ích mà không gây quá nhiều tiếng động.', actions: [{ type: 'item', itemId: 'broken_rune', min: 1, max: 1 }, { type: 'exp', min: 5, max: 12 }] },
          { chance: 25, text: 'Bạn đánh giá sai một chi tiết nhỏ và bị thương nhẹ.', actions: [{ type: 'damage_percent', min: 4, max: 9 }, { type: 'exp', min: 3, max: 7 }] },
        ],
      },
      {
        id: 'risk',
        label: 'Mạo hiểm hơn',
        emoji: '⚠️',
        style: 'danger',
        outcomes: [
          { chance: 40, text: 'Bạn chấp nhận rủi ro và tìm được phần thưởng tốt hơn trong rừng sâu.', actions: [{ type: 'gold', min: 8, max: 26 }, { type: 'item', itemId: 'broken_rune', min: 1, max: 2 }] },
          { chance: 35, text: 'Tiếng động của bạn thu hút kẻ săn mồi gần đó.', actions: [{ type: 'combat_random' }] },
          { chance: 25, text: 'Cái giá của sự hấp tấp là vài vết thương và một bài học đau.', actions: [{ type: 'damage_percent', min: 7, max: 14 }, { type: 'exp', min: 4, max: 10 }] },
        ],
      },
    ],
  },
  {
    id: 'dd_forest_dreaming_moth',
    title: '🦋 Bướm Đêm Mơ Ngủ',
    description: 'Một con bướm đêm khổng lồ bám trên thân cây, cánh phủ bụi phát sáng. Giấc mơ của nó lan ra xung quanh.',
    color: 0x4f7942,
    image: 'mysterious',
    weight: 2,
    zones: ['forest'],
    timeoutText: 'Bạn bỏ qua dấu hiệu lạ trong rừng và tiếp tục đi.',
    choices: [
      {
        id: 'careful',
        label: 'Tiếp cận cẩn thận',
        emoji: '🔎',
        style: 'primary',
        outcomes: [
          { chance: 75, text: 'Bạn xử lý tình huống cẩn thận và lấy được chút lợi ích mà không gây quá nhiều tiếng động.', actions: [{ type: 'item', itemId: 'dream_petal', min: 1, max: 1 }, { type: 'exp', min: 5, max: 12 }] },
          { chance: 25, text: 'Bạn đánh giá sai một chi tiết nhỏ và bị thương nhẹ.', actions: [{ type: 'damage_percent', min: 4, max: 9 }, { type: 'exp', min: 3, max: 7 }] },
        ],
      },
      {
        id: 'risk',
        label: 'Mạo hiểm hơn',
        emoji: '⚠️',
        style: 'danger',
        outcomes: [
          { chance: 40, text: 'Bạn chấp nhận rủi ro và tìm được phần thưởng tốt hơn trong rừng sâu.', actions: [{ type: 'gold', min: 8, max: 26 }, { type: 'item', itemId: 'dream_petal', min: 1, max: 2 }] },
          { chance: 35, text: 'Tiếng động của bạn thu hút kẻ săn mồi gần đó.', actions: [{ type: 'combat_random' }] },
          { chance: 25, text: 'Cái giá của sự hấp tấp là vài vết thương và một bài học đau.', actions: [{ type: 'damage_percent', min: 7, max: 14 }, { type: 'exp', min: 4, max: 10 }] },
        ],
      },
    ],
  },
  {
    id: 'dd_forest_swarm_crossing',
    title: '🐜 Đàn Côn Trùng Băng Đường',
    description: 'Một dòng côn trùng đen đặc băng qua lối mòn. Chúng tha theo những mảnh xương nhỏ và lá thuốc.',
    color: 0x3b5f2a,
    image: 'trap',
    weight: 3,
    zones: ['forest'],
    timeoutText: 'Bạn bỏ qua dấu hiệu lạ trong rừng và tiếp tục đi.',
    choices: [
      {
        id: 'careful',
        label: 'Tiếp cận cẩn thận',
        emoji: '🔎',
        style: 'primary',
        outcomes: [
          { chance: 75, text: 'Bạn xử lý tình huống cẩn thận và lấy được chút lợi ích mà không gây quá nhiều tiếng động.', actions: [{ type: 'item', itemId: 'healing_herb', min: 1, max: 1 }, { type: 'exp', min: 5, max: 12 }] },
          { chance: 25, text: 'Bạn đánh giá sai một chi tiết nhỏ và bị thương nhẹ.', actions: [{ type: 'damage_percent', min: 4, max: 9 }, { type: 'exp', min: 3, max: 7 }] },
        ],
      },
      {
        id: 'risk',
        label: 'Mạo hiểm hơn',
        emoji: '⚠️',
        style: 'danger',
        outcomes: [
          { chance: 40, text: 'Bạn chấp nhận rủi ro và tìm được phần thưởng tốt hơn trong rừng sâu.', actions: [{ type: 'gold', min: 8, max: 26 }, { type: 'item', itemId: 'healing_herb', min: 1, max: 2 }] },
          { chance: 35, text: 'Tiếng động của bạn thu hút kẻ săn mồi gần đó.', actions: [{ type: 'world_danger', amount: 1 }, { type: 'combat_random' }] },
          { chance: 25, text: 'Cái giá của sự hấp tấp là vài vết thương và một bài học đau.', actions: [{ type: 'damage_percent', min: 7, max: 14 }, { type: 'exp', min: 4, max: 10 }] },
        ],
      },
    ],
  },
  {
    id: 'dd_forest_old_grave_marker',
    title: '🪦 Dấu Mộ Không Tên',
    description: 'Một tảng đá nhỏ dựng giữa rừng, không khắc tên. Dưới chân mộ có một bó hoa đã héo.',
    color: 0x5a6b3a,
    image: 'grave',
    weight: 2,
    zones: ['forest'],
    timeoutText: 'Bạn bỏ qua dấu hiệu lạ trong rừng và tiếp tục đi.',
    choices: [
      {
        id: 'careful',
        label: 'Tiếp cận cẩn thận',
        emoji: '🔎',
        style: 'primary',
        outcomes: [
          { chance: 75, text: 'Bạn xử lý tình huống cẩn thận và lấy được chút lợi ích mà không gây quá nhiều tiếng động.', actions: [{ type: 'reputation', amount: 1 }, { type: 'item', itemId: 'lost_memory', min: 1, max: 1 }, { type: 'exp', min: 5, max: 12 }] },
          { chance: 25, text: 'Bạn đánh giá sai một chi tiết nhỏ và bị thương nhẹ.', actions: [{ type: 'damage_percent', min: 4, max: 9 }, { type: 'exp', min: 3, max: 7 }] },
        ],
      },
      {
        id: 'risk',
        label: 'Mạo hiểm hơn',
        emoji: '⚠️',
        style: 'danger',
        outcomes: [
          { chance: 40, text: 'Bạn chấp nhận rủi ro và tìm được phần thưởng tốt hơn trong rừng sâu.', actions: [{ type: 'gold', min: 8, max: 26 }, { type: 'item', itemId: 'lost_memory', min: 1, max: 2 }] },
          { chance: 35, text: 'Tiếng động của bạn thu hút kẻ săn mồi gần đó.', actions: [{ type: 'combat_random' }] },
          { chance: 25, text: 'Cái giá của sự hấp tấp là vài vết thương và một bài học đau.', actions: [{ type: 'damage_percent', min: 7, max: 14 }, { type: 'exp', min: 4, max: 10 }] },
        ],
      },
    ],
  },
  // EXTRA_FOREST_50_EVENTS_END,
  // EXTRA_FOREST_12_MINIGAME_EVENTS_START
  {
    id: 'dd_forest_mg_wolf_tracks',
    title: '🐺 Dấu Chân Sói Xám',
    description: 'Những dấu chân sói cắt ngang thảm lá. Chúng tách làm ba nhánh, và chỉ một đường dẫn đến ổ săn thật sự.',
    color: 0x355e3b,
    image: 'forest',
    weight: 2,
    zones: ['forest'],
    timeoutText: '🐺 Bạn bỏ mặc dấu chân đang dần bị gió che lấp.',
    miniGame: {
      title: '🐺 Lần Theo Dấu Chân',
      introText: 'Hãy chọn đúng hướng ở ít nhất 2/3 lượt để bám được đàn sói.',
      startLabel: 'Bắt đầu lần dấu',
      startEmoji: '🐾',
      startStyle: 'primary',
      options: [
        { id: 'left', label: 'Lối Trái', emoji: '⬅️', style: 'secondary' },
        { id: 'mid', label: 'Đường Giữa', emoji: '⬆️', style: 'primary' },
        { id: 'right', label: 'Lối Phải', emoji: '➡️', style: 'secondary' },
      ],
      rounds: [
        { prompt: 'Lá khô bị cào mạnh, còn bên trái có mùi lông ướt.', correctOptionId: 'left', successLine: 'Bạn đọc đúng dấu cào trên lá.', failureLine: 'Bạn bỏ qua mùi lông còn mới trên gió.' },
        { prompt: 'Một gốc cây có bùn bắn lên cao ở lối giữa.', correctOptionId: 'mid', successLine: 'Bùn còn ẩm chỉ đúng đường đàn sói vừa đi qua.', failureLine: 'Bạn chọn nhánh sai và mất dấu vài giây quý giá.' },
        { prompt: 'Tiếng gầm rất khẽ vang từ phía có bụi cây nghiêng sang phải.', correctOptionId: 'right', successLine: 'Bạn bám đúng tiếng gầm ở cuối đường.', failureLine: 'Bạn nghe nhầm tiếng gió luồn qua thân cây.' },
      ],
      successNeeded: 2,
      successText: 'Bạn lần tới một chỗ săn cũ của đàn sói và nhặt được chút chiến lợi phẩm.',
      failureText: 'Bạn mất dấu đàn sói và còn để lại tiếng động khiến mình bị thương nhẹ.',
      onSuccess: [{ type: 'gold', min: 10, max: 22 }, { type: 'item', itemId: 'leather', min: 1, max: 2 }, { type: 'exp', min: 8, max: 16 }],
      onFailure: [{ type: 'damage_percent', min: 6, max: 12 }, { type: 'exp', min: 3, max: 7 }],
    },
  },
  {
    id: 'dd_forest_mg_fireflies',
    title: '✨ Vệt Đom Đóm Lạ',
    description: 'Một bầy đom đóm sáng thành ba màu khác nhau. Chúng bay thành nhịp kỳ lạ, như đang dẫn bạn đến đâu đó.',
    color: 0x4f7942,
    image: 'forest',
    weight: 2,
    zones: ['forest'],
    miniGame: {
      title: '✨ Theo Bầy Đom Đóm',
      introText: 'Chọn đúng luồng sáng ở ít nhất 2/3 lượt để đi qua khu rừng mù sương.',
      startLabel: 'Đi theo ánh sáng',
      startEmoji: '✨',
      startStyle: 'success',
      options: [
        { id: 'green', label: 'Xanh Lục', emoji: '🟢', style: 'success' },
        { id: 'gold', label: 'Vàng Nhạt', emoji: '🟡', style: 'primary' },
        { id: 'blue', label: 'Lam Mờ', emoji: '🔵', style: 'secondary' },
      ],
      rounds: [
        { prompt: 'Nhóm sáng thấp gần mặt đất bay thành vòng tròn nhỏ.', correctOptionId: 'green', successLine: 'Bạn đọc đúng đường bay sát rễ cây.', failureLine: 'Bạn bị ánh sáng phản chiếu đánh lừa.' },
        { prompt: 'Vệt sáng dẫn qua chỗ có nấm phát quang màu mật ong.', correctOptionId: 'gold', successLine: 'Bạn bám đúng cụm nấm phát quang hiếm.', failureLine: 'Bạn lạc sang vùng cỏ ẩm tối hơn.' },
        { prompt: 'Luồng sáng cuối cùng biến thành một nét dài mảnh như sương.', correctOptionId: 'blue', successLine: 'Bạn theo đúng luồng sáng cuối xuyên màn sương.', failureLine: 'Bạn chần chừ và để bầy đom đóm tản mất.' },
      ],
      successNeeded: 2,
      successText: 'Bầy đom đóm dẫn bạn tới một hốc cây chứa đồ tiếp tế cũ.',
      failureText: 'Bạn đi lạc khỏi vệt sáng và chỉ tìm được đường ra sau khi mệt mỏi.',
      onSuccess: [{ type: 'item', itemId: 'mana_potion', min: 1, max: 1 }, { type: 'exp', min: 9, max: 18 }],
      onFailure: [{ type: 'damage_percent', min: 4, max: 8 }, { type: 'exp', min: 3, max: 6 }],
    },
  },
  {
    id: 'dd_forest_mg_vine_bridge',
    title: '🌉 Cầu Dây Leo Mục',
    description: 'Một cây cầu dây leo bắc qua khe cạn. Mỗi bước sai có thể khiến bạn rơi xuống đám đá sắc phía dưới.',
    color: 0x556b2f,
    image: 'trap',
    weight: 2,
    zones: ['forest'],
    miniGame: {
      title: '🌉 Qua Cầu Dây Leo',
      introText: 'Chọn cách di chuyển an toàn ở mỗi lượt. Đúng ít nhất 2/3 lượt để qua cầu.',
      startLabel: 'Bước lên cầu',
      startEmoji: '🪢',
      startStyle: 'primary',
      options: [
        { id: 'left', label: 'Bám Dây Trái', emoji: '⬅️', style: 'secondary' },
        { id: 'center', label: 'Đi Giữa', emoji: '⬆️', style: 'primary' },
        { id: 'right', label: 'Bám Dây Phải', emoji: '➡️', style: 'secondary' },
      ],
      rounds: [
        { prompt: 'Đầu cầu rung mạnh bên phải, còn giữa có ít sợi mới buộc hơn.', correctOptionId: 'center', successLine: 'Bạn dẫm lên phần còn chắc nhất.', failureLine: 'Bạn nghe sai nhịp rung của cây cầu.' },
        { prompt: 'Một mảng dây leo bên trái căng hơn hẳn sau thân cây.', correctOptionId: 'left', successLine: 'Bạn bám đúng chỗ dây còn chịu lực tốt.', failureLine: 'Bước hụt khiến bạn trượt một đoạn ngắn.' },
        { prompt: 'Cuối cầu nghiêng về phía có chạc cây giữ dây bên phải.', correctOptionId: 'right', successLine: 'Bạn nương theo chạc cây giữ được thăng bằng.', failureLine: 'Bạn khựng lại quá lâu và cầu lắc mạnh.' },
      ],
      successNeeded: 2,
      successText: 'Bạn qua cầu an toàn và nhặt được chút đồ còn sót ở đầu bên kia.',
      failureText: 'Bạn qua được cầu nhưng bị trầy xước và mất sức đáng kể.',
      onSuccess: [{ type: 'gold', min: 8, max: 18 }, { type: 'item', itemId: 'herb', min: 1, max: 2 }],
      onFailure: [{ type: 'damage_percent', min: 7, max: 13 }],
    },
  },
  {
    id: 'dd_forest_mg_bird_calls',
    title: '🐦 Tiếng Gọi Của Chim Rừng',
    description: 'Ba hướng trong rừng vang lên ba tiếng chim khác nhau. Chỉ một hướng là tín hiệu báo an của thợ săn già.',
    color: 0x6b8e23,
    image: 'forest',
    weight: 2,
    zones: ['forest'],
    miniGame: {
      title: '🐦 Nghe Tiếng Chim',
      introText: 'Dựa vào mô tả và chọn đúng tiếng gọi ở ít nhất 2/3 lượt.',
      startLabel: 'Lắng nghe kỹ',
      startEmoji: '👂',
      startStyle: 'success',
      options: [
        { id: 'owl', label: 'Cú Mèo', emoji: '🦉', style: 'secondary' },
        { id: 'crow', label: 'Quạ Rừng', emoji: '🐦', style: 'primary' },
        { id: 'finch', label: 'Chim Sẻ', emoji: '🐤', style: 'success' },
      ],
      rounds: [
        { prompt: 'Tiếng gọi ngắn, gắt, vang ba nhịp từ trên cành khô.', correctOptionId: 'crow', successLine: 'Bạn phân biệt được tiếng quạ cộc cằn.', failureLine: 'Âm vang trong rừng khiến bạn nghe nhầm.' },
        { prompt: 'Âm trầm, kéo dài, vọng từ tán cây tối sâu hơn.', correctOptionId: 'owl', successLine: 'Bạn nhận ra tiếng cú ẩn dưới tán rậm.', failureLine: 'Bạn chọn theo cảm giác thay vì âm sắc.' },
        { prompt: 'Chuỗi tiếng nhỏ, nhanh, đứt quãng gần bụi dâu dại.', correctOptionId: 'finch', successLine: 'Bạn bắt đúng tín hiệu nhỏ mà rõ.', failureLine: 'Tiếng lá làm bạn mất tập trung.' },
      ],
      successNeeded: 2,
      successText: 'Bạn hiểu tín hiệu chim rừng và tìm được lối đi an toàn.',
      failureText: 'Bạn nghe sai tín hiệu và vòng vào chỗ rậm gai hơn.',
      onSuccess: [{ type: 'exp', min: 10, max: 20 }, { type: 'reputation', amount: 1 }],
      onFailure: [{ type: 'damage_percent', min: 5, max: 10 }],
    },
  },
  {
    id: 'dd_forest_mg_hunter_traps',
    title: '🪤 Bãi Bẫy Thợ Săn',
    description: 'Một bãi bẫy dây và hố ngụy trang nằm kín dưới thảm lá. Bạn phải chọn đường thật chính xác để băng qua.',
    color: 0x4b5320,
    image: 'trap',
    weight: 2,
    zones: ['forest'],
    miniGame: {
      title: '🪤 Vượt Bãi Bẫy',
      introText: 'Chọn điểm đặt chân đúng ở ít nhất 2/3 lượt để qua bãi bẫy.',
      startLabel: 'Bắt đầu vượt bẫy',
      startEmoji: '🪤',
      startStyle: 'danger',
      options: [
        { id: 'stone', label: 'Phiến Đá', emoji: '🪨', style: 'primary' },
        { id: 'root', label: 'Rễ Cây', emoji: '🌱', style: 'secondary' },
        { id: 'mud', label: 'Bùn Đen', emoji: '🟤', style: 'secondary' },
      ],
      rounds: [
        { prompt: 'Một sợi dây rất mảnh nối ngang qua bùn đen phía trước.', correctOptionId: 'root', successLine: 'Bạn tránh được dây bẫy thấp sát đất.', failureLine: 'Bước sai làm bẫy khẽ rung động.' },
        { prompt: 'Chiếc lá phủ trên hố sâu rung nhẹ ngay gần rễ cây.', correctOptionId: 'stone', successLine: 'Bạn đặt chân lên phiến đá ổn định hơn.', failureLine: 'Lớp lá giả suýt kéo bạn xuống hố.' },
        { prompt: 'Đường cuối trơn ẩm, chỉ có chỗ bùn màu sáng ít lún hơn.', correctOptionId: 'mud', successLine: 'Bạn phân biệt được mảng đất ít nguy hiểm hơn.', failureLine: 'Bạn nặng nề đè trúng chỗ đất mềm.' },
      ],
      successNeeded: 2,
      successText: 'Bạn qua được bãi bẫy và nhặt vài thứ còn sót của thợ săn.',
      failureText: 'Một cái bẫy bật trúng bạn trước khi bạn thoát ra ngoài.',
      onSuccess: [{ type: 'item', itemId: 'bread', min: 1, max: 1 }, { type: 'gold', min: 6, max: 16 }],
      onFailure: [{ type: 'damage_percent', min: 8, max: 15 }],
    },
  },
  {
    id: 'dd_forest_mg_mushroom_ring',
    title: '🍄 Vòng Nấm Tiên',
    description: 'Một vòng nấm phát sáng hiện ra trên nền đất ẩm. Mỗi cây nấm sáng theo một nhịp khác nhau, như một câu đố cổ.',
    color: 0x9370db,
    image: 'mysterious',
    weight: 2,
    zones: ['forest'],
    miniGame: {
      title: '🍄 Giải Vòng Nấm',
      introText: 'Chọn đúng cây nấm phát sáng theo mô tả ở ít nhất 2/3 lượt.',
      startLabel: 'Chạm vào nấm',
      startEmoji: '🍄',
      startStyle: 'primary',
      options: [
        { id: 'red', label: 'Nấm Đỏ', emoji: '🔴', style: 'danger' },
        { id: 'blue', label: 'Nấm Lam', emoji: '🔵', style: 'primary' },
        { id: 'white', label: 'Nấm Trắng', emoji: '⚪', style: 'success' },
      ],
      rounds: [
        { prompt: 'Ánh sáng đầu tiên chớp ngắn rồi tắt hẳn, lạnh như sương.', correctOptionId: 'blue', successLine: 'Bạn cảm nhận đúng nhịp lạnh của nấm lam.', failureLine: 'Bạn chọn theo màu sắc thay vì linh lực.' },
        { prompt: 'Một luồng sáng ấm, đều, lan trên vành nấm thấp nhất.', correctOptionId: 'white', successLine: 'Bạn chọn đúng cây nấm có nhịp sáng ổn định.', failureLine: 'Bạn chạm nhầm vào ánh sáng đánh lừa.' },
        { prompt: 'Ánh cuối rực hơn và có mùi cay nồng rất khẽ.', correctOptionId: 'red', successLine: 'Bạn phân biệt được luồng linh lực hung hăng hơn.', failureLine: 'Một xung lực nhỏ dội vào tay bạn.' },
      ],
      successNeeded: 2,
      successText: 'Vòng nấm mở ra một khoảnh đất nhỏ chứa nguyên liệu quý.',
      failureText: 'Vòng nấm phản ứng dữ dội rồi tan đi, để lại cơn choáng ngắn.',
      onSuccess: [{ type: 'item', itemId: 'herb', min: 2, max: 4 }, { type: 'mp_percent', min: 8, max: 16 }],
      onFailure: [{ type: 'damage_percent', min: 5, max: 9 }, { type: 'mp_percent', min: 2, max: 5 }],
    },
  },
  {
    id: 'dd_forest_mg_river_stones',
    title: '🌊 Đá Bước Qua Suối',
    description: 'Con suối hẹp nhưng chảy xiết. Những phiến đá nổi lên chỉ đủ cho một bước chân sai lầm là ngã nhào xuống nước lạnh.',
    color: 0x4682b4,
    image: 'spring',
    weight: 2,
    zones: ['forest'],
    miniGame: {
      title: '🌊 Băng Qua Suối',
      introText: 'Chọn đúng phiến đá ở ít nhất 2/3 lượt để băng qua an toàn.',
      startLabel: 'Nhảy qua suối',
      startEmoji: '🌊',
      startStyle: 'primary',
      options: [
        { id: 'flat', label: 'Đá Phẳng', emoji: '⬜', style: 'primary' },
        { id: 'moss', label: 'Đá Rêu', emoji: '🟩', style: 'secondary' },
        { id: 'sharp', label: 'Đá Nhọn', emoji: '🔺', style: 'secondary' },
      ],
      rounds: [
        { prompt: 'Phiến đầu có bọt nước ít bám quanh chân đá hơn.', correctOptionId: 'flat', successLine: 'Bạn chọn đúng bề mặt ít trơn nhất.', failureLine: 'Nước lạnh bắn tung khi bạn trượt nhẹ.' },
        { prompt: 'Giữa suối, rêu bám dày nhưng có một phiến nhọn nhô hẳn khỏi dòng.', correctOptionId: 'sharp', successLine: 'Bạn tận dụng đúng điểm tựa cao hơn dòng nước.', failureLine: 'Bạn đạp vào chỗ rêu trơn trượt.' },
        { prompt: 'Đá cuối có màu xỉn nhưng giữ nước kém hơn hai phiến còn lại.', correctOptionId: 'flat', successLine: 'Bạn về đích với bước nhảy vững vàng cuối cùng.', failureLine: 'Bước cuối hụt làm bạn ướt sũng nửa ống quần.' },
      ],
      successNeeded: 2,
      successText: 'Bạn qua suối và nhặt được ít đồ bị mắc bên bờ bên kia.',
      failureText: 'Bạn qua được suối nhưng bị ngã và hao sức khá nhiều.',
      onSuccess: [{ type: 'gold', min: 7, max: 15 }, { type: 'heal_percent', min: 6, max: 10 }],
      onFailure: [{ type: 'damage_percent', min: 6, max: 11 }],
    },
  },
  {
    id: 'dd_forest_mg_root_maze',
    title: '🌳 Mê Cung Rễ Cây',
    description: 'Rễ của một cây cổ thụ trồi lên như những bức tường đan chéo, tạo thành mê cung tự nhiên đầy lối cụt.',
    color: 0x3d5229,
    image: 'forest',
    weight: 2,
    zones: ['forest'],
    miniGame: {
      title: '🌳 Đi Qua Mê Cung Rễ',
      introText: 'Chọn đúng ngách ở ít nhất 2/3 lượt để thoát khỏi mê cung rễ.',
      startLabel: 'Tiến vào mê cung',
      startEmoji: '🌳',
      startStyle: 'primary',
      options: [
        { id: 'gap', label: 'Khe Hẹp', emoji: '↔️', style: 'secondary' },
        { id: 'arch', label: 'Vòm Rễ', emoji: '🪵', style: 'primary' },
        { id: 'slope', label: 'Dốc Lá', emoji: '🍂', style: 'secondary' },
      ],
      rounds: [
        { prompt: 'Dấu cào mới xuất hiện gần lối có vòm rễ khô hơn.', correctOptionId: 'arch', successLine: 'Bạn đọc được hướng gió luồn qua vòm rễ.', failureLine: 'Bạn vào nhánh ẩm và mất thời gian quay lại.' },
        { prompt: 'Một khe hẹp có đất nén cứng hơn, ít rêu hơn hai lối còn lại.', correctOptionId: 'gap', successLine: 'Bạn chọn đúng lối từng có người đi qua.', failureLine: 'Bạn sa vào lối nhiều rễ phụ chằng chịt.' },
        { prompt: 'Cuối mê cung, lá mục trượt xuống theo chiều dốc nhẹ.', correctOptionId: 'slope', successLine: 'Bạn theo đúng độ dốc tự nhiên ra khỏi mê cung.', failureLine: 'Bạn chọn nhầm ngách và bị cành quật trúng.' },
      ],
      successNeeded: 2,
      successText: 'Bạn thoát mê cung và tìm được vị trí nhìn ra một lối mòn an toàn.',
      failureText: 'Bạn thoát ra muộn, kiệt sức hơn và đầy vết xước nhỏ.',
      onSuccess: [{ type: 'exp', min: 9, max: 18 }, { type: 'reputation', amount: 1 }],
      onFailure: [{ type: 'damage_percent', min: 5, max: 10 }],
    },
  },
  {
    id: 'dd_forest_mg_dryad_whispers',
    title: '🌿 Tiếng Thì Thầm Của Dryad',
    description: 'Một tiếng thì thầm nhẹ như gió quanh tán lá gọi bạn theo ba từ khóa khác nhau. Chỉ một lời dẫn là thật.',
    color: 0x7fbf7f,
    image: 'mysterious',
    weight: 2,
    zones: ['forest'],
    miniGame: {
      title: '🌿 Nghe Lời Rừng',
      introText: 'Chọn đúng tiếng gọi của rừng ở ít nhất 2/3 lượt.',
      startLabel: 'Lắng nghe',
      startEmoji: '🌿',
      startStyle: 'success',
      options: [
        { id: 'shade', label: 'Bóng Râm', emoji: '🌑', style: 'secondary' },
        { id: 'dew', label: 'Sương Sớm', emoji: '💧', style: 'primary' },
        { id: 'thorns', label: 'Gai Nhọn', emoji: '🌵', style: 'danger' },
      ],
      rounds: [
        { prompt: 'Giọng đầu tiên mang cảm giác mát, sạch và rất ngắn.', correctOptionId: 'dew', successLine: 'Bạn phân biệt được lời dẫn dịu nhất.', failureLine: 'Bạn để mình bị kéo theo tiếng xì xào giả.' },
        { prompt: 'Lời gọi tiếp theo không có sát ý, chỉ nặng và chậm hơn.', correctOptionId: 'shade', successLine: 'Bạn nhận ra giọng trầm của bóng cây già.', failureLine: 'Bạn chọn theo vẻ đáng sợ bề ngoài.' },
        { prompt: 'Âm cuối sắc và khô, như cố đẩy bạn vào lối đau đớn.', correctOptionId: 'thorns', successLine: 'Bạn đoán đúng mánh khóe ở lượt cuối.', failureLine: 'Bạn bị chính lời thì thầm đánh lừa.' },
      ],
      successNeeded: 2,
      successText: 'Bạn vượt qua thử thách của rừng và nhận được một chút phù trợ.',
      failureText: 'Những tiếng thì thầm làm đầu bạn nhức nhối trước khi tan biến.',
      onSuccess: [{ type: 'mp_percent', min: 10, max: 18 }, { type: 'exp', min: 8, max: 16 }],
      onFailure: [{ type: 'damage_percent', min: 4, max: 8 }, { type: 'exp', min: 2, max: 5 }],
    },
  },
  {
    id: 'dd_forest_mg_spider_web',
    title: '🕸️ Đường Hầm Tơ Nhện',
    description: 'Một đường hầm tơ nhện mỏng chắn lối đi. Bạn cần chọn chỗ luồn qua ít chạm vào mạng nhất.',
    color: 0x708090,
    image: 'trap',
    weight: 2,
    zones: ['forest'],
    miniGame: {
      title: '🕸️ Luồn Qua Tơ Nhện',
      introText: 'Chọn đúng khe tơ ở ít nhất 2/3 lượt để tránh đánh động bầy nhện.',
      startLabel: 'Luồn qua',
      startEmoji: '🕸️',
      startStyle: 'danger',
      options: [
        { id: 'high', label: 'Khe Cao', emoji: '⬆️', style: 'secondary' },
        { id: 'low', label: 'Khe Thấp', emoji: '⬇️', style: 'secondary' },
        { id: 'middle', label: 'Khe Giữa', emoji: '↔️', style: 'primary' },
      ],
      rounds: [
        { prompt: 'Tơ bên dưới căng và dính nhiều lá vụn mới hơn.', correctOptionId: 'high', successLine: 'Bạn tránh được lớp tơ mới kéo thấp.', failureLine: 'Một sợi tơ rung lên ngay cạnh vai bạn.' },
        { prompt: 'Chỗ giữa có giọt sương rung nhè nhẹ, còn sát đất thì khô hơn.', correctOptionId: 'low', successLine: 'Bạn hạ người đúng chỗ ít tơ hơn.', failureLine: 'Bạn đi vào phần tơ bị giăng ngang tầm ngực.' },
        { prompt: 'Cuối đường hầm chỉ còn một lối đủ rộng ở chính giữa thân cây tách đôi.', correctOptionId: 'middle', successLine: 'Bạn luồn qua khe cuối cùng thật gọn.', failureLine: 'Tơ bám lên áo khiến bạn thấy lạnh gáy.' },
      ],
      successNeeded: 2,
      successText: 'Bạn vượt qua mạng nhện và tìm được tổ cũ còn sót lại chiến lợi phẩm nhỏ.',
      failureText: 'Bạn chạm vào quá nhiều sợi tơ và phải lao ra trước khi thứ gì đó quay lại.',
      onSuccess: [{ type: 'gold', min: 8, max: 18 }, { type: 'item', itemId: 'leather', min: 1, max: 1 }],
      onFailure: [{ type: 'damage_percent', min: 6, max: 12 }, { type: 'combat_random' }],
    },
  },
  {
    id: 'dd_forest_mg_owl_totems',
    title: '🪶 Cọc Cú Cổ',
    description: 'Ba cọc gỗ cắm quanh gốc cây, trên mỗi cọc là một dấu khắc hình mắt cú khác nhau. Một nghi thức nhỏ của thợ săn rừng.',
    color: 0x5f6b7a,
    image: 'altar',
    weight: 2,
    zones: ['forest'],
    miniGame: {
      title: '🪶 Đọc Dấu Cọc Cú',
      introText: 'Chọn đúng dấu khắc ở ít nhất 2/3 lượt để hiểu được nghi thức.',
      startLabel: 'Xem ký hiệu',
      startEmoji: '🪶',
      startStyle: 'primary',
      options: [
        { id: 'open', label: 'Mắt Mở', emoji: '👁️', style: 'primary' },
        { id: 'half', label: 'Mắt Hờ', emoji: '😑', style: 'secondary' },
        { id: 'closed', label: 'Mắt Nhắm', emoji: '😌', style: 'success' },
      ],
      rounds: [
        { prompt: 'Dấu đầu khắc sâu, mép nét sắc và dứt khoát như cảnh báo.', correctOptionId: 'open', successLine: 'Bạn hiểu đúng ký hiệu cảnh báo.', failureLine: 'Bạn đọc sai ý nghĩa của nét khắc đầu tiên.' },
        { prompt: 'Ký hiệu giữa mềm hơn, nông hơn, như một lời nhắc im lặng.', correctOptionId: 'half', successLine: 'Bạn chọn đúng ký hiệu trung gian.', failureLine: 'Bạn bỏ lỡ sự khác biệt tinh tế giữa các nét chạm.' },
        { prompt: 'Ký hiệu cuối tròn và khép, thường dùng để kết thúc nghi thức.', correctOptionId: 'closed', successLine: 'Bạn hoàn thành chuỗi ký hiệu đúng thứ tự.', failureLine: 'Bạn kết thúc sai và phá hỏng nhịp nghi thức.' },
      ],
      successNeeded: 2,
      successText: 'Bạn đọc hiểu nghi thức cũ và được để lại chút quà nhỏ của thợ săn.',
      failureText: 'Bạn không hiểu hết ký hiệu và chỉ còn một cơn bối rối khó chịu.',
      onSuccess: [{ type: 'item', itemId: 'bread', min: 1, max: 1 }, { type: 'exp', min: 8, max: 15 }],
      onFailure: [{ type: 'exp', min: 2, max: 5 }],
    },
  },
  {
    id: 'dd_forest_mg_tree_marks',
    title: '🪓 Dấu Rìu Trên Cây Già',
    description: 'Ba vết rìu cũ trên cây cổ thụ tạo thành một sơ đồ đường mòn bí mật của tiều phu xưa.',
    color: 0x8b5a2b,
    image: 'forest',
    weight: 2,
    zones: ['forest'],
    miniGame: {
      title: '🪓 Đọc Dấu Rìu',
      introText: 'Chọn đúng diễn giải ở ít nhất 2/3 lượt để giải được dấu mốc cổ.',
      startLabel: 'Giải dấu mốc',
      startEmoji: '🪓',
      startStyle: 'primary',
      options: [
        { id: 'north', label: 'Hướng Bắc', emoji: '⬆️', style: 'secondary' },
        { id: 'rest', label: 'Điểm Nghỉ', emoji: '🪵', style: 'success' },
        { id: 'danger', label: 'Chỗ Nguy', emoji: '⚠️', style: 'danger' },
      ],
      rounds: [
        { prompt: 'Vết chéo sâu đè lên vết cũ hơn, thường dùng để cảnh báo né đường.', correctOptionId: 'danger', successLine: 'Bạn hiểu đúng ký hiệu nguy hiểm.', failureLine: 'Bạn hiểu nhầm một dấu cấm thành dấu dẫn đường.' },
        { prompt: 'Hai vết song song ngang thấp, ngay dưới một mảng rêu khô thường đánh dấu chỗ nghỉ.', correctOptionId: 'rest', successLine: 'Bạn nhận ra biểu tượng trạm dừng cũ.', failureLine: 'Bạn nhìn dấu mà quên xét vị trí của nó trên thân cây.' },
        { prompt: 'Một vết gọn hướng lên phía cao hơn, thường chỉ phương của lối mòn chính.', correctOptionId: 'north', successLine: 'Bạn nối được ký hiệu cuối thành bản đồ sơ lược.', failureLine: 'Bạn đoán sai hướng từ nét rìu cuối.' },
      ],
      successNeeded: 2,
      successText: 'Bạn giải được dấu mốc cũ và tìm thấy một đoạn đường tắt hữu ích.',
      failureText: 'Bạn vẫn rút ra được chút kinh nghiệm, nhưng không giải được hết ý nghĩa dấu rìu.',
      onSuccess: [{ type: 'gold', min: 9, max: 20 }, { type: 'exp', min: 8, max: 15 }],
      onFailure: [{ type: 'exp', min: 3, max: 6 }],
    },
  },
  {
    id: 'dd_forest_mg_stag_trail',
    title: '🦌 Đường Chạy Của Hươu Trắng',
    description: 'Một con hươu trắng lướt qua bụi cây rồi biến mất. Bạn chỉ còn những dấu hiệu nhỏ để đuổi theo nó.',
    color: 0x8fbc8f,
    image: 'forest',
    weight: 2,
    zones: ['forest'],
    miniGame: {
      title: '🦌 Đuổi Theo Hươu Trắng',
      introText: 'Chọn đúng manh mối ở ít nhất 2/3 lượt để bám theo con hươu bí ẩn.',
      startLabel: 'Bắt đầu truy dấu',
      startEmoji: '🦌',
      startStyle: 'success',
      options: [
        { id: 'hoof', label: 'Dấu Móng', emoji: '🦶', style: 'primary' },
        { id: 'fur', label: 'Lông Rụng', emoji: '🪶', style: 'secondary' },
        { id: 'branches', label: 'Cành Gãy', emoji: '🌿', style: 'secondary' },
      ],
      rounds: [
        { prompt: 'Bên vũng đất mềm có một dấu lõm mới còn đọng nước.', correctOptionId: 'hoof', successLine: 'Bạn bám đúng vào dấu móng còn mới.', failureLine: 'Bạn bị cành lá đánh lạc hướng.' },
        { prompt: 'Một sợi lông trắng mắc trên gai ở độ cao ngang hông.', correctOptionId: 'fur', successLine: 'Bạn nhìn ra chi tiết nhỏ nhưng quyết định.', failureLine: 'Bạn mải để ý đất mà quên nhìn ngang tầm mắt.' },
        { prompt: 'Ở cuối đường, một nhánh cây bị gạt mạnh về phía bìa rừng.', correctOptionId: 'branches', successLine: 'Bạn bám đúng hướng nhánh cây vừa bị va quệt.', failureLine: 'Bạn tới chậm và mất dấu khi gió nổi lên.' },
      ],
      successNeeded: 2,
      successText: 'Bạn không bắt được hươu trắng, nhưng nó để lại nơi trú có ít chiến lợi phẩm.',
      failureText: 'Bạn để mất dấu con hươu và chỉ nhận lại vài vết xước trong bụi rậm.',
      onSuccess: [{ type: 'item', itemId: 'health_potion', min: 1, max: 1 }, { type: 'exp', min: 8, max: 16 }],
      onFailure: [{ type: 'damage_percent', min: 4, max: 8 }, { type: 'exp', min: 2, max: 5 }],
    },
  },
  // EXTRA_FOREST_12_MINIGAME_EVENTS_END


] as const;

export const DATA_DRIVEN_EXPLORE_EVENTS: readonly DataDrivenExploreEventDef[] = [
  ...(forestEventsJson as readonly DataDrivenExploreEventDef[]),
  ...(wastesForgottenEventsJson as readonly DataDrivenExploreEventDef[]),
  ...(random50EventsJson as readonly DataDrivenExploreEventDef[]),
  ...CODE_DRIVEN_EXPLORE_EVENTS,
] as const;
