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
  | { type: 'combat_random' };

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

export const DATA_DRIVEN_EXPLORE_EVENTS: readonly DataDrivenExploreEventDef[] = [

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
    id: 'dd_forest_wolf_tracks',
    title: '🐺 Dấu Chân Sói Tươi',
    description: 'Dấu chân sói còn in sâu trên nền đất ẩm. Chúng mới đi qua đây không lâu, và có vẻ không chỉ có một con.',
    color: 0x355e3b,
    image: 'combat',
    weight: 3,
    zones: ['forest'],
    requiresCombat: true,
    timeoutText: '🐺 Bạn lùi lại trước khi tiếng tru vang lên gần hơn.',
    choices: [
      { id: 'hunt', label: 'Lần theo', emoji: '🐾', style: 'danger', outcomes: [{ chance: 75, text: 'Bạn lần theo dấu chân và đụng độ bầy sói.', actions: [{ type: 'combat_random' }] }, { chance: 25, text: 'Bạn tìm được ổ cũ của bầy sói. Chúng đã đi, nhưng còn vài thứ sót lại.', actions: [{ type: 'item', itemId: 'bone_glue', min: 1, max: 1 }, { type: 'exp', min: 6, max: 12 }] }] },
      { id: 'avoid', label: 'Đi vòng', emoji: '🌲', style: 'secondary', outcomes: [{ chance: 100, text: 'Bạn chọn đường vòng. Mất thời gian, nhưng tránh được một trận không cần thiết.', actions: [{ type: 'exp', min: 3, max: 7 }] }] },
    ],
  },
  {
    id: 'dd_forest_old_hunter',
    title: '🏹 Thợ Săn Già',
    description: 'Một thợ săn già ngồi mài mũi tên bên gốc cây. Ông ta nhìn vết thương của bạn rồi chỉ vào rừng sâu.',
    color: 0x4f7942,
    image: 'villager',
    weight: 2,
    zones: ['forest'],
    timeoutText: '🏹 Thợ săn già im lặng quay lại việc mài tên.',
    choices: [
      { id: 'advice', label: 'Xin lời khuyên', emoji: '🗣️', style: 'primary', outcomes: [{ chance: 100, text: 'Ông ta chỉ bạn cách nghe tiếng lá để đoán hướng thú dữ.', actions: [{ type: 'exp', min: 8, max: 18 }] }] },
      { id: 'buy', label: 'Mua thuốc rừng - 25G', emoji: '🌿', style: 'success', requires: { gold: 25 }, outcomes: [{ chance: 100, text: 'Bạn mua một ít thuốc rừng được gói trong lá khô.', actions: [{ type: 'gold', min: -25, max: -25 }, { type: 'item', itemId: 'forest_tonic', min: 1, max: 1 }] }] },
    ],
  },
  {
    id: 'dd_forest_thorn_bush',
    title: '🌿 Bụi Gai Đen',
    description: 'Một bụi gai đen chắn ngang lối đi. Sau lớp gai, bạn thấy có thứ gì đó lấp lánh.',
    color: 0x2f4f2f,
    image: 'trap',
    weight: 3,
    zones: ['forest'],
    timeoutText: '🌿 Bạn không cố chui qua bụi gai.',
    choices: [
      { id: 'reach', label: 'Thò tay lấy', emoji: '✋', style: 'danger', outcomes: [{ chance: 100, text: 'Gai cứa vào tay bạn, nhưng bạn lấy được thứ mắc bên trong.', actions: [{ type: 'damage_percent', min: 5, max: 10 }, { type: 'item', itemId: 'herb', min: 2, max: 4 }] }] },
      { id: 'cut', label: 'Cắt đường', emoji: '🪓', style: 'primary', outcomes: [{ chance: 70, text: 'Bạn mở được một lối nhỏ và gom vài cây thuốc.', actions: [{ type: 'item', itemId: 'herb', min: 1, max: 3 }, { type: 'exp', min: 4, max: 10 }] }, { chance: 30, text: 'Bụi gai bật ngược lại, làm bạn bị thương nhẹ.', actions: [{ type: 'damage_percent', min: 4, max: 8 }] }] },
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
    id: 'dd_forest_fallen_scout',
    title: '🧭 Trinh Sát Gục Bên Gốc Cây',
    description: 'Một trinh sát bị thương nằm tựa vào rễ cây. Túi bản đồ của anh ta vẫn còn, nhưng tiếng lá động quanh đây không bình thường.',
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
          { chance: 35, text: 'Tiếng động của bạn thu hút kẻ săn mồi gần đó.', actions: [{ type: 'world_danger', amount: 1 }, { type: 'combat_random' }] },
          { chance: 25, text: 'Cái giá của sự hấp tấp là vài vết thương và một bài học đau.', actions: [{ type: 'damage_percent', min: 7, max: 14 }, { type: 'exp', min: 4, max: 10 }] },
        ],
      },
    ],
  },
  {
    id: 'dd_forest_blood_moss',
    title: '🩸 Rêu Máu',
    description: 'Một mảng rêu đỏ bám quanh thân cây, phập phồng như có mạch đập. Nó có thể là thuốc, cũng có thể là bẫy.',
    color: 0x2f4f2f,
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
          { chance: 75, text: 'Bạn xử lý tình huống cẩn thận và lấy được chút lợi ích mà không gây quá nhiều tiếng động.', actions: [{ type: 'item', itemId: 'blood_vial', min: 1, max: 1 }, { type: 'exp', min: 5, max: 12 }] },
          { chance: 25, text: 'Bạn đánh giá sai một chi tiết nhỏ và bị thương nhẹ.', actions: [{ type: 'damage_percent', min: 4, max: 9 }, { type: 'exp', min: 3, max: 7 }] },
        ],
      },
      {
        id: 'risk',
        label: 'Mạo hiểm hơn',
        emoji: '⚠️',
        style: 'danger',
        outcomes: [
          { chance: 40, text: 'Bạn chấp nhận rủi ro và tìm được phần thưởng tốt hơn trong rừng sâu.', actions: [{ type: 'gold', min: 8, max: 26 }, { type: 'item', itemId: 'blood_vial', min: 1, max: 2 }] },
          { chance: 35, text: 'Tiếng động của bạn thu hút kẻ săn mồi gần đó.', actions: [{ type: 'combat_random' }] },
          { chance: 25, text: 'Cái giá của sự hấp tấp là vài vết thương và một bài học đau.', actions: [{ type: 'damage_percent', min: 7, max: 14 }, { type: 'exp', min: 4, max: 10 }] },
        ],
      },
    ],
  },
  {
    id: 'dd_forest_rope_bridge',
    title: '🌉 Cầu Dây Mục',
    description: 'Một cây cầu dây cũ bắc qua khe sâu. Bên kia có lối đi ngắn hơn, nhưng vài sợi dây đã sắp đứt.',
    color: 0x4f7942,
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
          { chance: 75, text: 'Bạn xử lý tình huống cẩn thận và lấy được chút lợi ích mà không gây quá nhiều tiếng động.', actions: [{ type: 'item', itemId: 'wood', min: 1, max: 1 }, { type: 'exp', min: 5, max: 12 }] },
          { chance: 25, text: 'Bạn đánh giá sai một chi tiết nhỏ và bị thương nhẹ.', actions: [{ type: 'damage_percent', min: 4, max: 9 }, { type: 'exp', min: 3, max: 7 }] },
        ],
      },
      {
        id: 'risk',
        label: 'Mạo hiểm hơn',
        emoji: '⚠️',
        style: 'danger',
        outcomes: [
          { chance: 40, text: 'Bạn chấp nhận rủi ro và tìm được phần thưởng tốt hơn trong rừng sâu.', actions: [{ type: 'gold', min: 8, max: 26 }, { type: 'item', itemId: 'wood', min: 1, max: 2 }] },
          { chance: 35, text: 'Tiếng động của bạn thu hút kẻ săn mồi gần đó.', actions: [{ type: 'combat_random' }] },
          { chance: 25, text: 'Cái giá của sự hấp tấp là vài vết thương và một bài học đau.', actions: [{ type: 'damage_percent', min: 7, max: 14 }, { type: 'exp', min: 4, max: 10 }] },
        ],
      },
    ],
  },
  {
    id: 'dd_forest_hungry_crows',
    title: '🐦\u200d⬛ Đàn Quạ Đói',
    description: 'Một đàn quạ đen đậu kín trên cành cây. Chúng nhìn túi đồ của bạn bằng ánh mắt quá thông minh.',
    color: 0x3b5f2a,
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
          { chance: 75, text: 'Bạn xử lý tình huống cẩn thận và lấy được chút lợi ích mà không gây quá nhiều tiếng động.', actions: [{ type: 'item', itemId: 'eagle_feather', min: 1, max: 1 }, { type: 'exp', min: 5, max: 12 }] },
          { chance: 25, text: 'Bạn đánh giá sai một chi tiết nhỏ và bị thương nhẹ.', actions: [{ type: 'damage_percent', min: 4, max: 9 }, { type: 'exp', min: 3, max: 7 }] },
        ],
      },
      {
        id: 'risk',
        label: 'Mạo hiểm hơn',
        emoji: '⚠️',
        style: 'danger',
        outcomes: [
          { chance: 40, text: 'Bạn chấp nhận rủi ro và tìm được phần thưởng tốt hơn trong rừng sâu.', actions: [{ type: 'gold', min: 8, max: 26 }, { type: 'item', itemId: 'eagle_feather', min: 1, max: 2 }] },
          { chance: 35, text: 'Tiếng động của bạn thu hút kẻ săn mồi gần đó.', actions: [{ type: 'combat_random' }] },
          { chance: 25, text: 'Cái giá của sự hấp tấp là vài vết thương và một bài học đau.', actions: [{ type: 'damage_percent', min: 7, max: 14 }, { type: 'exp', min: 4, max: 10 }] },
        ],
      },
    ],
  },
  {
    id: 'dd_forest_glowing_fern',
    title: '🌱 Dương Xỉ Phát Sáng',
    description: 'Bụi dương xỉ phát ra ánh xanh nhạt dưới bóng cây. Mỗi chiếc lá như đang chỉ về một hướng khác nhau.',
    color: 0x5a6b3a,
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
          { chance: 35, text: 'Tiếng động của bạn thu hút kẻ săn mồi gần đó.', actions: [{ type: 'combat_random' }] },
          { chance: 25, text: 'Cái giá của sự hấp tấp là vài vết thương và một bài học đau.', actions: [{ type: 'damage_percent', min: 7, max: 14 }, { type: 'exp', min: 4, max: 10 }] },
        ],
      },
    ],
  },
  {
    id: 'dd_forest_trapwire',
    title: '🪤 Dây Bẫy Căng Ngang',
    description: 'Một sợi dây mảnh gần như vô hình căng ngang lối mòn. Có người đã đặt bẫy ở đây rất gần đây.',
    color: 0x355e3b,
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
          { chance: 75, text: 'Bạn xử lý tình huống cẩn thận và lấy được chút lợi ích mà không gây quá nhiều tiếng động.', actions: [{ type: 'item', itemId: 'leather', min: 1, max: 1 }, { type: 'exp', min: 5, max: 12 }] },
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
    id: 'dd_forest_lost_boot',
    title: '🥾 Chiếc Ủng Lạc',
    description: 'Một chiếc ủng mắc trong bùn. Dấu kéo dài phía sau cho thấy chủ nhân của nó không tự bước đi.',
    color: 0x2f4f2f,
    image: 'loot',
    weight: 3,
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

  // EXTRA_50_MIXED_EVENTS_START
  {
    "id": "dd_extra_common_worn_banner",
    "title": "🏳️ Lá Cờ Rách Bên Đường",
    "description": "Một lá cờ rách bị cắm nghiêng bên đường. Trên vải có ký hiệu của một đoàn thám hiểm đã mất tích.",
    "color": 9079434,
    "image": "loot",
    "weight": 2,
    "timeoutText": "Bạn chần chừ quá lâu và sự kiện trôi qua.",
    "choices": [
      {
        "id": "inspect",
        "label": "Xem ký hiệu",
        "emoji": "🔎",
        "style": "primary",
        "outcomes": [
          {
            "chance": 100,
            "text": "Bạn ghi lại ký hiệu và hiểu thêm về vùng đất này.",
            "actions": [
              {
                "type": "exp",
                "min": 6,
                "max": 14
              }
            ]
          }
        ]
      },
      {
        "id": "take",
        "label": "Gỡ lá cờ",
        "emoji": "🏳️",
        "style": "secondary",
        "outcomes": [
          {
            "chance": 70,
            "text": "Bạn gỡ được lá cờ và tìm thấy túi tiền nhỏ buộc bên dưới.",
            "actions": [
              {
                "type": "gold",
                "min": 6,
                "max": 18
              }
            ]
          },
          {
            "chance": 30,
            "text": "Cọc cờ mục gãy, làm bụi gai quẹt qua tay bạn.",
            "actions": [
              {
                "type": "damage_percent",
                "min": 3,
                "max": 7
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "dd_extra_common_rain_barrel",
    "title": "🛢️ Thùng Nước Mưa",
    "description": "Một thùng gỗ hứng nước mưa nằm cạnh mái lều sập. Nước trong veo nhưng đáy thùng có ánh sáng lạ.",
    "color": 4891591,
    "image": "spring",
    "weight": 3,
    "timeoutText": "Bạn chần chừ quá lâu và sự kiện trôi qua.",
    "choices": [
      {
        "id": "drink",
        "label": "Uống thử",
        "emoji": "💧",
        "style": "success",
        "outcomes": [
          {
            "chance": 75,
            "text": "Nước mưa mát lạnh giúp bạn tỉnh táo hơn.",
            "actions": [
              {
                "type": "heal_percent",
                "min": 6,
                "max": 12
              },
              {
                "type": "mp_percent",
                "min": 5,
                "max": 10
              }
            ]
          },
          {
            "chance": 25,
            "text": "Dư vị kim loại khiến bạn hơi choáng.",
            "actions": [
              {
                "type": "damage_percent",
                "min": 3,
                "max": 6
              }
            ]
          }
        ]
      },
      {
        "id": "scoop",
        "label": "Múc mang đi",
        "emoji": "🫙",
        "style": "primary",
        "outcomes": [
          {
            "chance": 100,
            "text": "Bạn múc một ít nước trong nhất vào bình.",
            "actions": [
              {
                "type": "item",
                "itemId": "moonwater",
                "min": 1,
                "max": 1
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "dd_extra_common_wandering_cook",
    "title": "🍳 Đầu Bếp Lang Thang",
    "description": "Một người đầu bếp đeo nồi sau lưng đang nhóm lửa. Ông ta đổi bữa ăn nóng lấy chút vàng.",
    "color": 14190906,
    "image": "camp",
    "weight": 2,
    "timeoutText": "Bạn chần chừ quá lâu và sự kiện trôi qua.",
    "choices": [
      {
        "id": "buy",
        "label": "Mua bữa ăn - 18G",
        "emoji": "🍲",
        "style": "success",
        "outcomes": [
          {
            "chance": 100,
            "text": "Bữa ăn nóng giúp bạn lấy lại sức.",
            "actions": [
              {
                "type": "gold",
                "min": -18,
                "max": -18
              },
              {
                "type": "heal_percent",
                "min": 12,
                "max": 18
              },
              {
                "type": "item",
                "itemId": "hunter_meal",
                "min": 1,
                "max": 1
              }
            ]
          }
        ],
        "requires": {
          "gold": 18
        }
      },
      {
        "id": "chat",
        "label": "Ngồi trò chuyện",
        "emoji": "🗣️",
        "style": "secondary",
        "outcomes": [
          {
            "chance": 100,
            "text": "Bạn nghe được vài mẹo sinh tồn thú vị.",
            "actions": [
              {
                "type": "exp",
                "min": 5,
                "max": 11
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "dd_extra_common_old_notice_board",
    "title": "📌 Bảng Tin Cũ",
    "description": "Một bảng tin mục nát vẫn còn ghim vài tờ giấy. Có tờ ghi phần thưởng, có tờ chỉ là lời cảnh báo.",
    "color": 10254906,
    "image": "villager",
    "weight": 3,
    "timeoutText": "Bạn chần chừ quá lâu và sự kiện trôi qua.",
    "choices": [
      {
        "id": "read",
        "label": "Đọc thông báo",
        "emoji": "📜",
        "style": "primary",
        "outcomes": [
          {
            "chance": 70,
            "text": "Bạn đọc được một tuyến đường ít nguy hiểm hơn.",
            "actions": [
              {
                "type": "exp",
                "min": 6,
                "max": 12
              },
              {
                "type": "reputation",
                "amount": 1
              }
            ]
          },
          {
            "chance": 30,
            "text": "Một tờ truy nã cũ khiến dân vùng này nhìn bạn nghi ngờ hơn.",
            "actions": [
              {
                "type": "wanted",
                "amount": 1
              }
            ]
          }
        ]
      },
      {
        "id": "repair",
        "label": "Dựng lại bảng",
        "emoji": "🔨",
        "style": "success",
        "outcomes": [
          {
            "chance": 100,
            "text": "Bạn sửa lại bảng tin để người đi đường dễ đọc hơn.",
            "actions": [
              {
                "type": "reputation",
                "amount": 2
              },
              {
                "type": "exp",
                "min": 4,
                "max": 9
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "dd_extra_common_lucky_beetle",
    "title": "🪲 Bọ Cánh Vàng",
    "description": "Một con bọ cánh vàng bò ngang giày bạn. Người lữ hành nói gặp nó là điềm may, miễn là đừng quá tham.",
    "color": 16762967,
    "image": "mysterious",
    "weight": 2,
    "timeoutText": "Bạn chần chừ quá lâu và sự kiện trôi qua.",
    "choices": [
      {
        "id": "watch",
        "label": "Quan sát",
        "emoji": "👀",
        "style": "secondary",
        "outcomes": [
          {
            "chance": 100,
            "text": "Bạn để nó bò đi và cảm thấy may mắn kỳ lạ.",
            "actions": [
              {
                "type": "exp",
                "min": 4,
                "max": 9
              },
              {
                "type": "gold",
                "min": 5,
                "max": 12
              }
            ]
          }
        ]
      },
      {
        "id": "catch",
        "label": "Bắt lấy",
        "emoji": "✋",
        "style": "danger",
        "outcomes": [
          {
            "chance": 50,
            "text": "Bạn bắt được nó, nhưng cánh vàng tan thành bụi.",
            "actions": [
              {
                "type": "item",
                "itemId": "lucky_coin",
                "min": 1,
                "max": 1
              }
            ]
          },
          {
            "chance": 50,
            "text": "Nó cắn một phát rồi biến mất.",
            "actions": [
              {
                "type": "damage_percent",
                "min": 4,
                "max": 8
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "dd_extra_common_sealed_satchel",
    "title": "🎒 Túi Da Niêm Phong",
    "description": "Một chiếc túi da có dấu niêm phong nằm dưới phiến đá. Chủ nhân của nó có lẽ không còn quay lại.",
    "color": 9132587,
    "image": "loot",
    "weight": 2,
    "timeoutText": "Bạn chần chừ quá lâu và sự kiện trôi qua.",
    "choices": [
      {
        "id": "open",
        "label": "Mở niêm phong",
        "emoji": "🔓",
        "style": "primary",
        "outcomes": [
          {
            "chance": 65,
            "text": "Bên trong có ít vật dụng còn khô ráo.",
            "actions": [
              {
                "type": "item",
                "itemId": "bread",
                "min": 1,
                "max": 2
              },
              {
                "type": "gold",
                "min": 6,
                "max": 15
              }
            ]
          },
          {
            "chance": 35,
            "text": "Niêm phong là bùa cảnh báo. Một luồng khí lạnh làm bạn choáng.",
            "actions": [
              {
                "type": "damage_percent",
                "min": 5,
                "max": 9
              },
              {
                "type": "exp",
                "min": 3,
                "max": 7
              }
            ]
          }
        ]
      },
      {
        "id": "return",
        "label": "Treo lên cọc gần đường",
        "emoji": "📍",
        "style": "success",
        "outcomes": [
          {
            "chance": 100,
            "text": "Bạn để chiếc túi ở nơi dễ thấy. Một việc nhỏ nhưng tử tế.",
            "actions": [
              {
                "type": "reputation",
                "amount": 2
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "dd_extra_common_broken_bridge",
    "title": "🌉 Cầu Gỗ Gãy",
    "description": "Một cây cầu gỗ cũ bắc qua khe nhỏ đã gãy một nửa. Bên kia có dấu bánh xe còn mới.",
    "color": 8088917,
    "image": "trap",
    "weight": 2,
    "timeoutText": "Bạn chần chừ quá lâu và sự kiện trôi qua.",
    "choices": [
      {
        "id": "cross",
        "label": "Băng qua nhanh",
        "emoji": "🏃",
        "style": "danger",
        "outcomes": [
          {
            "chance": 55,
            "text": "Bạn chạy qua được trước khi ván gỗ gãy thêm.",
            "actions": [
              {
                "type": "exp",
                "min": 7,
                "max": 15
              }
            ]
          },
          {
            "chance": 45,
            "text": "Một tấm ván sập xuống làm bạn trượt ngã.",
            "actions": [
              {
                "type": "damage_percent",
                "min": 6,
                "max": 12
              }
            ]
          }
        ]
      },
      {
        "id": "repair",
        "label": "Chèn gỗ tạm",
        "emoji": "🪵",
        "style": "success",
        "outcomes": [
          {
            "chance": 100,
            "text": "Bạn gia cố lối đi tạm để người sau bớt nguy hiểm.",
            "actions": [
              {
                "type": "reputation",
                "amount": 2
              },
              {
                "type": "exp",
                "min": 5,
                "max": 10
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "dd_extra_common_mg_signal_flags",
    "title": "🚩 Cờ Hiệu Bỏ Quên",
    "description": "Ba lá cờ hiệu treo trên dây mục. Nếu đọc đúng tín hiệu, bạn có thể lần ra chỗ cất đồ của đoàn cũ.",
    "color": 15105570,
    "image": "mysterious",
    "weight": 2,
    "miniGame": {
      "title": "🚩 Đọc Cờ Hiệu",
      "introText": "Chọn đúng ý nghĩa tín hiệu ở ít nhất 2/3 lượt.",
      "startLabel": "Đọc tín hiệu",
      "startEmoji": "🚩",
      "startStyle": "primary",
      "options": [
        {
          "id": "safe",
          "label": "An Toàn",
          "emoji": "✅",
          "style": "success"
        },
        {
          "id": "danger",
          "label": "Nguy Hiểm",
          "emoji": "⚠️",
          "style": "danger"
        },
        {
          "id": "supply",
          "label": "Tiếp Tế",
          "emoji": "📦",
          "style": "primary"
        }
      ],
      "rounds": [
        {
          "prompt": "Cờ xanh treo thấp, cạnh nút thắt đôi.",
          "correctOptionId": "safe",
          "successLine": "Bạn nhận ra dấu hiệu đường an toàn.",
          "failureLine": "Bạn hiểu nhầm tín hiệu mở đường."
        },
        {
          "prompt": "Cờ đỏ bị xé góc, cắm hướng xuống đất.",
          "correctOptionId": "danger",
          "successLine": "Bạn đọc đúng tín hiệu cảnh báo.",
          "failureLine": "Bạn bỏ qua vết xé quan trọng."
        },
        {
          "prompt": "Cờ vàng có ký hiệu hình hòm nhỏ ở giữa.",
          "correctOptionId": "supply",
          "successLine": "Bạn xác định được chỗ giấu tiếp tế.",
          "failureLine": "Bạn nhìn đúng màu nhưng sai ký hiệu."
        }
      ],
      "successNeeded": 2,
      "successText": "Bạn đọc được tín hiệu và tìm thấy hòm nhỏ bị che dưới đá.",
      "failureText": "Bạn đọc sai quá nhiều tín hiệu và mất dấu.",
      "onSuccess": [
        {
          "type": "gold",
          "min": 10,
          "max": 24
        },
        {
          "type": "item",
          "itemId": "bread",
          "min": 1,
          "max": 1
        }
      ],
      "onFailure": [
        {
          "type": "exp",
          "min": 3,
          "max": 7
        }
      ],
      "timeoutText": "⏳ Bạn phản ứng quá chậm nên mini game thất bại."
    }
  },
  {
    "id": "dd_extra_common_mg_stone_melody",
    "title": "🎵 Đá Biết Hát",
    "description": "Ba phiến đá phát ra âm thanh khác nhau khi chạm vào. Một giai điệu cổ đang chờ được đánh đúng nhịp.",
    "color": 10181046,
    "image": "altar",
    "weight": 2,
    "miniGame": {
      "title": "🎵 Gõ Giai Điệu Đá",
      "introText": "Chọn đúng phiến đá ở ít nhất 2/3 lượt.",
      "startLabel": "Gõ thử",
      "startEmoji": "🎵",
      "startStyle": "primary",
      "options": [
        {
          "id": "low",
          "label": "Âm Trầm",
          "emoji": "🥁",
          "style": "secondary"
        },
        {
          "id": "mid",
          "label": "Âm Vừa",
          "emoji": "🎶",
          "style": "primary"
        },
        {
          "id": "high",
          "label": "Âm Cao",
          "emoji": "🔔",
          "style": "success"
        }
      ],
      "rounds": [
        {
          "prompt": "Nét khắc đầu tiên là vòng tròn lớn, thường mở bằng âm trầm.",
          "correctOptionId": "low",
          "successLine": "Âm đầu vang sâu và ổn định.",
          "failureLine": "Giai điệu lệch ngay từ nhịp đầu."
        },
        {
          "prompt": "Nét thứ hai mảnh hơn, nằm giữa hai đường song song.",
          "correctOptionId": "mid",
          "successLine": "Bạn giữ đúng nhịp giữa.",
          "failureLine": "Âm thanh bị chói lên một chút."
        },
        {
          "prompt": "Nét cuối nhỏ và nhọn như giọt sương.",
          "correctOptionId": "high",
          "successLine": "Âm cao kết thúc nghi thức hoàn chỉnh.",
          "failureLine": "Bạn kết thúc sai cao độ."
        }
      ],
      "successNeeded": 2,
      "successText": "Giai điệu hoàn chỉnh khiến một khe đá mở ra.",
      "failureText": "Giai điệu vỡ nhịp, chỉ để lại tiếng vọng lạ.",
      "onSuccess": [
        {
          "type": "mp_percent",
          "min": 10,
          "max": 18
        },
        {
          "type": "item",
          "itemId": "broken_rune",
          "min": 1,
          "max": 1
        }
      ],
      "onFailure": [
        {
          "type": "damage_percent",
          "min": 3,
          "max": 7
        },
        {
          "type": "exp",
          "min": 2,
          "max": 5
        }
      ],
      "timeoutText": "⏳ Bạn phản ứng quá chậm nên mini game thất bại."
    }
  },
  {
    "id": "dd_extra_common_mg_dice_riddle",
    "title": "🎲 Xúc Xắc Khắc Rune",
    "description": "Một viên xúc xắc gỗ có rune ở mỗi mặt. Nó lăn về phía bạn như đang mời chơi một ván nhỏ.",
    "color": 5793266,
    "image": "mysterious",
    "weight": 2,
    "miniGame": {
      "title": "🎲 Đoán Mặt Rune",
      "introText": "Chọn mặt rune đúng theo mô tả ở ít nhất 2/3 lượt.",
      "startLabel": "Lăn xúc xắc",
      "startEmoji": "🎲",
      "startStyle": "primary",
      "options": [
        {
          "id": "sun",
          "label": "Mặt Trời",
          "emoji": "☀️",
          "style": "success"
        },
        {
          "id": "moon",
          "label": "Mặt Trăng",
          "emoji": "🌙",
          "style": "primary"
        },
        {
          "id": "fang",
          "label": "Răng Nanh",
          "emoji": "🦷",
          "style": "danger"
        }
      ],
      "rounds": [
        {
          "prompt": "Mặt rune ấm lên khi ánh sáng chiếu vào.",
          "correctOptionId": "sun",
          "successLine": "Bạn chọn đúng mặt mặt trời.",
          "failureLine": "Bạn chọn mặt không cộng hưởng."
        },
        {
          "prompt": "Mặt rune lạnh nhất nằm ở phía khuất bóng.",
          "correctOptionId": "moon",
          "successLine": "Bạn chọn đúng mặt trăng.",
          "failureLine": "Bạn bỏ qua cảm giác lạnh trên tay."
        },
        {
          "prompt": "Mặt cuối có cạnh sắc và vết cắn nhỏ ở viền.",
          "correctOptionId": "fang",
          "successLine": "Bạn nhận ra mặt răng nanh.",
          "failureLine": "Viên xúc xắc bật ngược khỏi tay bạn."
        }
      ],
      "successNeeded": 2,
      "successText": "Bạn thắng trò chơi nhỏ và viên xúc xắc nhả ra một đồng may mắn.",
      "failureText": "Bạn thua ván cược, viên xúc xắc lấy đi chút sức lực.",
      "onSuccess": [
        {
          "type": "item",
          "itemId": "fate_coin",
          "min": 1,
          "max": 1
        },
        {
          "type": "exp",
          "min": 6,
          "max": 12
        }
      ],
      "onFailure": [
        {
          "type": "damage_percent",
          "min": 4,
          "max": 8
        }
      ],
      "timeoutText": "⏳ Bạn phản ứng quá chậm nên mini game thất bại."
    }
  },
  {
    "id": "dd_extra_forest_root_cache",
    "title": "🌳 Hốc Rễ Cất Đồ",
    "description": "Giữa những rễ cây xoắn, bạn thấy một hốc nhỏ được che bằng lá khô. Có ai đó từng dùng nơi này làm kho tạm.",
    "color": 3066993,
    "image": "chest",
    "weight": 3,
    "zones": [
      "forest"
    ],
    "timeoutText": "Bạn chần chừ quá lâu và sự kiện trôi qua.",
    "choices": [
      {
        "id": "search",
        "label": "Lục hốc rễ",
        "emoji": "🔎",
        "style": "primary",
        "outcomes": [
          {
            "chance": 75,
            "text": "Bạn tìm được ít nguyên liệu rừng còn dùng được.",
            "actions": [
              {
                "type": "item",
                "itemId": "wood",
                "min": 1,
                "max": 3
              },
              {
                "type": "item",
                "itemId": "herb",
                "min": 1,
                "max": 2
              }
            ]
          },
          {
            "chance": 25,
            "text": "Một ổ kiến trong hốc rễ làm bạn phải rút tay vội.",
            "actions": [
              {
                "type": "damage_percent",
                "min": 3,
                "max": 7
              }
            ]
          }
        ]
      },
      {
        "id": "leave_note",
        "label": "Để lại ký hiệu",
        "emoji": "📍",
        "style": "secondary",
        "outcomes": [
          {
            "chance": 100,
            "text": "Bạn đánh dấu hốc rễ cho lần sau và học thêm cách tìm dấu cũ.",
            "actions": [
              {
                "type": "exp",
                "min": 5,
                "max": 11
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "dd_extra_forest_briar_gate",
    "title": "🌿 Cổng Gai Sống",
    "description": "Hai bụi gai mọc cong vào nhau như một cánh cổng. Sau cổng, tiếng nước chảy rất nhỏ vọng ra.",
    "color": 2067276,
    "image": "trap",
    "weight": 2,
    "zones": [
      "forest"
    ],
    "timeoutText": "Bạn chần chừ quá lâu và sự kiện trôi qua.",
    "choices": [
      {
        "id": "cut",
        "label": "Chặt lối đi",
        "emoji": "🪓",
        "style": "primary",
        "outcomes": [
          {
            "chance": 60,
            "text": "Bạn mở được lối và nhặt được nhựa cây cổ.",
            "actions": [
              {
                "type": "item",
                "itemId": "amber_sap",
                "min": 1,
                "max": 1
              },
              {
                "type": "exp",
                "min": 5,
                "max": 10
              }
            ]
          },
          {
            "chance": 40,
            "text": "Gai quật ngược làm bạn rướm máu.",
            "actions": [
              {
                "type": "damage_percent",
                "min": 6,
                "max": 11
              }
            ]
          }
        ]
      },
      {
        "id": "crawl",
        "label": "Bò sát đất",
        "emoji": "🧎",
        "style": "danger",
        "outcomes": [
          {
            "chance": 70,
            "text": "Bạn bò qua an toàn và tìm thấy vài quả rừng.",
            "actions": [
              {
                "type": "item",
                "itemId": "forest_fruit",
                "min": 1,
                "max": 3
              }
            ]
          },
          {
            "chance": 30,
            "text": "Tóc áo mắc gai khiến bạn bị kéo lại.",
            "actions": [
              {
                "type": "damage_percent",
                "min": 5,
                "max": 9
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "dd_extra_forest_fox_cache",
    "title": "🦊 Ổ Cáo Tinh Ranh",
    "description": "Một con cáo nhìn bạn rồi chạy vòng quanh một bụi rậm. Có vẻ nó đang giấu thứ gì đó.",
    "color": 16747586,
    "image": "loot",
    "weight": 2,
    "zones": [
      "forest"
    ],
    "timeoutText": "Bạn chần chừ quá lâu và sự kiện trôi qua.",
    "choices": [
      {
        "id": "follow",
        "label": "Đi theo cáo",
        "emoji": "🦊",
        "style": "primary",
        "outcomes": [
          {
            "chance": 65,
            "text": "Con cáo dẫn bạn tới chỗ có túi đồ rách.",
            "actions": [
              {
                "type": "gold",
                "min": 8,
                "max": 20
              },
              {
                "type": "item",
                "itemId": "leather",
                "min": 1,
                "max": 1
              }
            ]
          },
          {
            "chance": 35,
            "text": "Nó lừa bạn vào bụi gai rồi biến mất.",
            "actions": [
              {
                "type": "damage_percent",
                "min": 4,
                "max": 8
              }
            ]
          }
        ]
      },
      {
        "id": "feed",
        "label": "Cho ăn bánh mì",
        "emoji": "🍞",
        "style": "success",
        "outcomes": [
          {
            "chance": 100,
            "text": "Con cáo nhận bánh rồi để lại một vật nhỏ sáng bóng.",
            "actions": [
              {
                "type": "item",
                "itemId": "lucky_coin",
                "min": 1,
                "max": 1
              },
              {
                "type": "gold",
                "min": -1,
                "max": -1
              }
            ]
          }
        ],
        "requires": {
          "itemId": "bread"
        }
      }
    ]
  },
  {
    "id": "dd_extra_forest_fallen_nest",
    "title": "🪺 Tổ Chim Rơi",
    "description": "Một tổ chim lớn rơi xuống đất sau cơn gió. Trứng đã vỡ, nhưng bên trong còn vài chiếc lông quý.",
    "color": 7842406,
    "image": "loot",
    "weight": 3,
    "zones": [
      "forest"
    ],
    "timeoutText": "Bạn chần chừ quá lâu và sự kiện trôi qua.",
    "choices": [
      {
        "id": "collect",
        "label": "Nhặt lông",
        "emoji": "🪶",
        "style": "primary",
        "outcomes": [
          {
            "chance": 100,
            "text": "Bạn nhặt được vài chiếc lông còn sạch.",
            "actions": [
              {
                "type": "item",
                "itemId": "eagle_feather",
                "min": 1,
                "max": 2
              }
            ]
          }
        ]
      },
      {
        "id": "rebury",
        "label": "Che lại tổ",
        "emoji": "🍂",
        "style": "success",
        "outcomes": [
          {
            "chance": 100,
            "text": "Bạn phủ lá che tổ và cảm thấy nhẹ lòng hơn.",
            "actions": [
              {
                "type": "reputation",
                "amount": 1
              },
              {
                "type": "exp",
                "min": 4,
                "max": 9
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "dd_extra_forest_honeyed_bark",
    "title": "🍯 Vỏ Cây Ngọt Mật",
    "description": "Một thân cây rỉ ra nhựa thơm như mật. Tiếng ong vo ve quanh đó nhưng chưa quá đông.",
    "color": 15774761,
    "image": "spring",
    "weight": 2,
    "zones": [
      "forest"
    ],
    "timeoutText": "Bạn chần chừ quá lâu và sự kiện trôi qua.",
    "choices": [
      {
        "id": "scrape",
        "label": "Cạo nhựa cây",
        "emoji": "🔪",
        "style": "danger",
        "outcomes": [
          {
            "chance": 60,
            "text": "Bạn lấy được mật rừng đặc sánh.",
            "actions": [
              {
                "type": "item",
                "itemId": "honey",
                "min": 1,
                "max": 2
              }
            ]
          },
          {
            "chance": 40,
            "text": "Đàn ong phát hiện và đuổi bạn chạy.",
            "actions": [
              {
                "type": "damage_percent",
                "min": 5,
                "max": 10
              }
            ]
          }
        ]
      },
      {
        "id": "smoke",
        "label": "Dùng khói xua ong",
        "emoji": "💨",
        "style": "primary",
        "outcomes": [
          {
            "chance": 100,
            "text": "Bạn lấy ít mật an toàn hơn nhưng không làm vỡ tổ.",
            "actions": [
              {
                "type": "item",
                "itemId": "honey",
                "min": 1,
                "max": 1
              },
              {
                "type": "exp",
                "min": 4,
                "max": 8
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "dd_extra_forest_hollow_drumming",
    "title": "🥁 Tiếng Gõ Trong Thân Rỗng",
    "description": "Một thân cây rỗng phát ra tiếng gõ đều đều từ bên trong. Nhịp gõ giống tín hiệu cầu cứu.",
    "color": 5208386,
    "image": "mysterious",
    "weight": 2,
    "zones": [
      "forest"
    ],
    "requiresCombat": true,
    "timeoutText": "Bạn chần chừ quá lâu và sự kiện trôi qua.",
    "choices": [
      {
        "id": "open",
        "label": "Bổ thân cây",
        "emoji": "🪓",
        "style": "danger",
        "outcomes": [
          {
            "chance": 55,
            "text": "Bạn bổ thân cây và giải thoát một linh thể nhỏ.",
            "actions": [
              {
                "type": "reputation",
                "amount": 2
              },
              {
                "type": "item",
                "itemId": "spirit_essence",
                "min": 1,
                "max": 1
              }
            ]
          },
          {
            "chance": 45,
            "text": "Thứ bên trong không hề muốn được giải thoát.",
            "actions": [
              {
                "type": "combat_random"
              }
            ]
          }
        ]
      },
      {
        "id": "knock",
        "label": "Gõ đáp lại",
        "emoji": "👊",
        "style": "secondary",
        "outcomes": [
          {
            "chance": 100,
            "text": "Tiếng gõ dừng lại, để lại một nhịp điệu ám ảnh trong đầu bạn.",
            "actions": [
              {
                "type": "exp",
                "min": 6,
                "max": 13
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "dd_extra_forest_deer_salt_lick",
    "title": "🧂 Vệt Muối Của Hươu",
    "description": "Bạn thấy vệt muối trắng trên đá, xung quanh có nhiều dấu chân thú. Đây là điểm tụ của động vật rừng.",
    "color": 8956535,
    "image": "forest",
    "weight": 3,
    "zones": [
      "forest"
    ],
    "timeoutText": "Bạn chần chừ quá lâu và sự kiện trôi qua.",
    "choices": [
      {
        "id": "wait",
        "label": "Nấp chờ",
        "emoji": "🫣",
        "style": "primary",
        "outcomes": [
          {
            "chance": 70,
            "text": "Bạn quan sát được lối đi của thú và học cách lần dấu.",
            "actions": [
              {
                "type": "exp",
                "min": 7,
                "max": 15
              }
            ]
          },
          {
            "chance": 30,
            "text": "Một con thú lớn phát hiện bạn trước.",
            "actions": [
              {
                "type": "damage_percent",
                "min": 4,
                "max": 9
              }
            ]
          }
        ]
      },
      {
        "id": "collect",
        "label": "Gom ít muối",
        "emoji": "🧂",
        "style": "secondary",
        "outcomes": [
          {
            "chance": 100,
            "text": "Bạn gom được chút muối tinh khiết còn khô.",
            "actions": [
              {
                "type": "item",
                "itemId": "purifying_salt",
                "min": 1,
                "max": 1
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "dd_extra_forest_mg_firefly_path",
    "title": "✨ Lối Đom Đóm",
    "description": "Đom đóm tụ thành ba luồng sáng khác nhau. Một luồng dẫn tới nơi an toàn, hai luồng còn lại dẫn vào bụi gai.",
    "color": 9426580,
    "image": "forest",
    "weight": 2,
    "zones": [
      "forest"
    ],
    "miniGame": {
      "title": "✨ Theo Đom Đóm",
      "introText": "Chọn đúng luồng sáng ở ít nhất 2/3 lượt.",
      "startLabel": "Theo ánh sáng",
      "startEmoji": "✨",
      "startStyle": "primary",
      "options": [
        {
          "id": "green",
          "label": "Luồng Xanh",
          "emoji": "🟢",
          "style": "success"
        },
        {
          "id": "yellow",
          "label": "Luồng Vàng",
          "emoji": "🟡",
          "style": "primary"
        },
        {
          "id": "red",
          "label": "Luồng Đỏ",
          "emoji": "🔴",
          "style": "danger"
        }
      ],
      "rounds": [
        {
          "prompt": "Luồng sáng không nhấp nháy và bay thấp gần rêu mềm.",
          "correctOptionId": "green",
          "successLine": "Bạn chọn đúng luồng an toàn.",
          "failureLine": "Bạn bị ánh sáng rực hơn đánh lừa."
        },
        {
          "prompt": "Ở đoạn hai, luồng vàng bay thành vòng tròn quanh thân cây.",
          "correctOptionId": "yellow",
          "successLine": "Bạn nhận ra dấu chỉ đường cũ.",
          "failureLine": "Bạn bỏ qua hình vòng tròn quan trọng."
        },
        {
          "prompt": "Đoạn cuối chỉ còn luồng đỏ bay ngược chiều gió.",
          "correctOptionId": "red",
          "successLine": "Bạn hiểu đây là dấu hiệu của lối thoát.",
          "failureLine": "Bạn nghĩ màu đỏ luôn là nguy hiểm."
        }
      ],
      "successNeeded": 2,
      "successText": "Bạn theo đúng đom đóm và tìm được một khoảng rừng bình yên.",
      "failureText": "Bạn theo nhầm ánh sáng và bị gai rừng cào xước.",
      "onSuccess": [
        {
          "type": "heal_percent",
          "min": 8,
          "max": 14
        },
        {
          "type": "item",
          "itemId": "glowing_mushroom",
          "min": 1,
          "max": 1
        }
      ],
      "onFailure": [
        {
          "type": "damage_percent",
          "min": 5,
          "max": 10
        }
      ],
      "timeoutText": "⏳ Bạn phản ứng quá chậm nên mini game thất bại."
    }
  },
  {
    "id": "dd_extra_forest_mg_bird_calls",
    "title": "🐦 Tiếng Chim Dẫn Đường",
    "description": "Ba tiếng chim vang lên liên tục như một mật mã của thợ săn. Nếu nghe đúng, bạn sẽ tránh được ổ quái.",
    "color": 6732650,
    "image": "forest",
    "weight": 2,
    "zones": [
      "forest"
    ],
    "miniGame": {
      "title": "🐦 Nghe Tiếng Chim",
      "introText": "Chọn đúng tiếng chim ở ít nhất 2/3 lượt.",
      "startLabel": "Lắng nghe",
      "startEmoji": "🐦",
      "startStyle": "primary",
      "options": [
        {
          "id": "short",
          "label": "Một Tiếng Ngắn",
          "emoji": "🐤",
          "style": "secondary"
        },
        {
          "id": "double",
          "label": "Hai Tiếng Liền",
          "emoji": "🐦",
          "style": "primary"
        },
        {
          "id": "long",
          "label": "Một Tiếng Dài",
          "emoji": "🦉",
          "style": "success"
        }
      ],
      "rounds": [
        {
          "prompt": "Tiếng đầu ngắn, dứt khoát, phát ra ngay sau tiếng lá động.",
          "correctOptionId": "short",
          "successLine": "Bạn phân biệt được tiếng cảnh báo gần.",
          "failureLine": "Bạn nghe nhầm tiếng gió thành tiếng chim."
        },
        {
          "prompt": "Tiếng thứ hai vang hai nhịp liên tiếp từ cùng một hướng.",
          "correctOptionId": "double",
          "successLine": "Bạn nhận ra dấu có lối rẽ.",
          "failureLine": "Bạn đếm sai nhịp gọi."
        },
        {
          "prompt": "Tiếng cuối kéo dài rồi tắt hẳn sau bụi dương xỉ.",
          "correctOptionId": "long",
          "successLine": "Bạn chọn đúng hướng an toàn cuối cùng.",
          "failureLine": "Bạn vội vàng trước khi âm kết thúc."
        }
      ],
      "successNeeded": 2,
      "successText": "Bạn hiểu tiếng chim và tránh được đoạn đường nguy hiểm.",
      "failureText": "Bạn lạc khỏi tuyến an toàn và mất sức.",
      "onSuccess": [
        {
          "type": "exp",
          "min": 9,
          "max": 18
        },
        {
          "type": "reputation",
          "amount": 1
        }
      ],
      "onFailure": [
        {
          "type": "damage_percent",
          "min": 4,
          "max": 8
        }
      ],
      "timeoutText": "⏳ Bạn phản ứng quá chậm nên mini game thất bại."
    }
  },
  {
    "id": "dd_extra_forest_mg_mushroom_colors",
    "title": "🍄 Nấm Ba Màu",
    "description": "Một vòng nấm phát sáng theo ba màu khác nhau. Dược sĩ rừng thường dùng màu sáng để phân biệt độc và lành.",
    "color": 11167436,
    "image": "mysterious",
    "weight": 2,
    "zones": [
      "forest"
    ],
    "miniGame": {
      "title": "🍄 Phân Loại Nấm",
      "introText": "Chọn đúng màu ở ít nhất 2/3 lượt để hái nấm an toàn.",
      "startLabel": "Phân loại",
      "startEmoji": "🍄",
      "startStyle": "primary",
      "options": [
        {
          "id": "blue",
          "label": "Nấm Xanh Lam",
          "emoji": "🔵",
          "style": "primary"
        },
        {
          "id": "white",
          "label": "Nấm Trắng",
          "emoji": "⚪",
          "style": "secondary"
        },
        {
          "id": "purple",
          "label": "Nấm Tím",
          "emoji": "🟣",
          "style": "danger"
        }
      ],
      "rounds": [
        {
          "prompt": "Loại có viền xanh lam thường mọc cạnh nước sạch.",
          "correctOptionId": "blue",
          "successLine": "Bạn hái đúng nấm lành.",
          "failureLine": "Bạn chọn loại quá rực."
        },
        {
          "prompt": "Loại trắng có mũ tròn và không có chấm đen.",
          "correctOptionId": "white",
          "successLine": "Bạn nhận ra dấu hiệu an toàn.",
          "failureLine": "Bạn bỏ qua chấm đen ở gốc nấm."
        },
        {
          "prompt": "Loại tím chỉ lấy bào tử, không ăn trực tiếp.",
          "correctOptionId": "purple",
          "successLine": "Bạn thu đúng phần có ích.",
          "failureLine": "Bạn chạm vào phần độc của nấm."
        }
      ],
      "successNeeded": 2,
      "successText": "Bạn hái được nấm và bào tử có giá trị.",
      "failureText": "Bạn bị bào tử làm choáng và phải lùi lại.",
      "onSuccess": [
        {
          "type": "item",
          "itemId": "glowing_mushroom",
          "min": 1,
          "max": 2
        },
        {
          "type": "item",
          "itemId": "rare_herb",
          "min": 1,
          "max": 1
        }
      ],
      "onFailure": [
        {
          "type": "damage_percent",
          "min": 5,
          "max": 10
        }
      ],
      "timeoutText": "⏳ Bạn phản ứng quá chậm nên mini game thất bại."
    }
  },
  {
    "id": "dd_extra_shrine_cracked_incense",
    "title": "🪔 Lư Hương Nứt",
    "description": "Một lư hương nứt vẫn tỏa khói mỏng. Tro bên trong xếp thành những ký tự méo mó.",
    "color": 13938487,
    "image": "altar",
    "weight": 3,
    "zones": [
      "shrine"
    ],
    "timeoutText": "Bạn chần chừ quá lâu và sự kiện trôi qua.",
    "choices": [
      {
        "id": "pray",
        "label": "Thắp lời cầu",
        "emoji": "🙏",
        "style": "primary",
        "outcomes": [
          {
            "chance": 75,
            "text": "Làn khói dịu lại và xoa bớt mệt mỏi trong đầu bạn.",
            "actions": [
              {
                "type": "mp_percent",
                "min": 10,
                "max": 18
              },
              {
                "type": "exp",
                "min": 5,
                "max": 10
              }
            ]
          },
          {
            "chance": 25,
            "text": "Khói đen bám vào cổ tay như lời cảnh cáo.",
            "actions": [
              {
                "type": "damage_percent",
                "min": 5,
                "max": 9
              }
            ]
          }
        ]
      },
      {
        "id": "take_ash",
        "label": "Lấy tro linh",
        "emoji": "🫙",
        "style": "secondary",
        "outcomes": [
          {
            "chance": 100,
            "text": "Bạn lấy một ít tro sạch trong đáy lư hương.",
            "actions": [
              {
                "type": "item",
                "itemId": "soul_dust",
                "min": 1,
                "max": 2
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "dd_extra_shrine_bell_rope",
    "title": "🔔 Dây Chuông Mục",
    "description": "Một sợi dây chuông thả xuống từ trần đền. Chuông phía trên khuất trong bóng tối, nhưng gió không làm nó lay động.",
    "color": 15105570,
    "image": "altar",
    "weight": 2,
    "zones": [
      "shrine"
    ],
    "requiresCombat": true,
    "timeoutText": "Bạn chần chừ quá lâu và sự kiện trôi qua.",
    "choices": [
      {
        "id": "ring",
        "label": "Kéo chuông",
        "emoji": "🔔",
        "style": "danger",
        "outcomes": [
          {
            "chance": 50,
            "text": "Tiếng chuông xua tan tà khí quanh bạn.",
            "actions": [
              {
                "type": "heal_percent",
                "min": 10,
                "max": 16
              },
              {
                "type": "reputation",
                "amount": 1
              }
            ]
          },
          {
            "chance": 50,
            "text": "Tiếng chuông gọi thứ đang ngủ dưới nền đá.",
            "actions": [
              {
                "type": "combat_random"
              }
            ]
          }
        ]
      },
      {
        "id": "tie",
        "label": "Buộc dây lại",
        "emoji": "🪢",
        "style": "success",
        "outcomes": [
          {
            "chance": 100,
            "text": "Bạn buộc dây để chuông không tự vang trong đêm.",
            "actions": [
              {
                "type": "reputation",
                "amount": 2
              },
              {
                "type": "exp",
                "min": 4,
                "max": 8
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "dd_extra_shrine_empty_offering_bowl",
    "title": "🥣 Bát Cúng Trống",
    "description": "Một bát cúng bằng đá nằm giữa sân đền. Trong bát chỉ còn vài giọt nước mưa và cánh hoa khô.",
    "color": 13214247,
    "image": "altar",
    "weight": 3,
    "zones": [
      "shrine"
    ],
    "timeoutText": "Bạn chần chừ quá lâu và sự kiện trôi qua.",
    "choices": [
      {
        "id": "offer",
        "label": "Đặt lễ vật nhỏ",
        "emoji": "🌸",
        "style": "success",
        "outcomes": [
          {
            "chance": 100,
            "text": "Bát đá sáng lên nhẹ, như chấp nhận sự thành tâm.",
            "actions": [
              {
                "type": "item",
                "itemId": "flower_crown",
                "min": 1,
                "max": 1
              },
              {
                "type": "reputation",
                "amount": 1
              }
            ]
          }
        ],
        "requires": {
          "itemId": "herb"
        }
      },
      {
        "id": "sip",
        "label": "Nếm nước trong bát",
        "emoji": "💧",
        "style": "danger",
        "outcomes": [
          {
            "chance": 60,
            "text": "Nước mưa mang vị thanh khiết lạ thường.",
            "actions": [
              {
                "type": "mp_percent",
                "min": 8,
                "max": 15
              }
            ]
          },
          {
            "chance": 40,
            "text": "Vị đắng lạnh chạy dọc sống lưng bạn.",
            "actions": [
              {
                "type": "damage_percent",
                "min": 5,
                "max": 10
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "dd_extra_shrine_torn_sutra",
    "title": "📖 Kinh Văn Rách",
    "description": "Một trang kinh rách mắc trên khung cửa. Dòng chữ cuối chưa hoàn chỉnh, như bị xé đi khi đang đọc.",
    "color": 15844367,
    "image": "mysterious",
    "weight": 3,
    "zones": [
      "shrine"
    ],
    "timeoutText": "Bạn chần chừ quá lâu và sự kiện trôi qua.",
    "choices": [
      {
        "id": "read",
        "label": "Đọc phần còn lại",
        "emoji": "📖",
        "style": "primary",
        "outcomes": [
          {
            "chance": 80,
            "text": "Bạn đọc được một đoạn chú bảo hộ ngắn.",
            "actions": [
              {
                "type": "exp",
                "min": 8,
                "max": 16
              },
              {
                "type": "mp_percent",
                "min": 5,
                "max": 10
              }
            ]
          },
          {
            "chance": 20,
            "text": "Câu chữ đảo ngược làm đầu bạn đau nhói.",
            "actions": [
              {
                "type": "damage_percent",
                "min": 4,
                "max": 8
              }
            ]
          }
        ]
      },
      {
        "id": "fold",
        "label": "Gấp thành bùa",
        "emoji": "🧿",
        "style": "secondary",
        "outcomes": [
          {
            "chance": 100,
            "text": "Bạn gấp mảnh kinh thành một lá bùa tạm.",
            "actions": [
              {
                "type": "item",
                "itemId": "warding_charm",
                "min": 1,
                "max": 1
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "dd_extra_shrine_monk_shadow",
    "title": "🧘 Bóng Nhà Sư",
    "description": "Một bóng người ngồi thiền hiện lên trên tường, dù trước mặt bạn không có ai. Bóng ấy chắp tay rất chậm.",
    "color": 10181046,
    "image": "mysterious",
    "weight": 2,
    "zones": [
      "shrine"
    ],
    "timeoutText": "Bạn chần chừ quá lâu và sự kiện trôi qua.",
    "choices": [
      {
        "id": "bow",
        "label": "Cúi chào",
        "emoji": "🙇",
        "style": "success",
        "outcomes": [
          {
            "chance": 100,
            "text": "Bóng nhà sư cúi đáp lại, để lại một cảm giác bình an.",
            "actions": [
              {
                "type": "heal_percent",
                "min": 8,
                "max": 14
              },
              {
                "type": "reputation",
                "amount": 1
              }
            ]
          }
        ]
      },
      {
        "id": "touch",
        "label": "Chạm vào bóng",
        "emoji": "✋",
        "style": "danger",
        "outcomes": [
          {
            "chance": 50,
            "text": "Ngón tay bạn xuyên qua bóng và chạm vào một mảnh ký ức.",
            "actions": [
              {
                "type": "item",
                "itemId": "lost_memory",
                "min": 1,
                "max": 1
              }
            ]
          },
          {
            "chance": 50,
            "text": "Cái lạnh từ tường truyền ngược vào người bạn.",
            "actions": [
              {
                "type": "damage_percent",
                "min": 6,
                "max": 11
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "dd_extra_shrine_locked_reliquary",
    "title": "🔒 Hộp Thánh Tích Khóa",
    "description": "Một hộp thánh tích nhỏ bị khóa bằng dây đồng. Trên nắp có vết móng tay cào từ bên trong.",
    "color": 12092939,
    "image": "chest",
    "weight": 2,
    "zones": [
      "shrine"
    ],
    "requiresCombat": true,
    "timeoutText": "Bạn chần chừ quá lâu và sự kiện trôi qua.",
    "choices": [
      {
        "id": "open",
        "label": "Mở hộp",
        "emoji": "🔓",
        "style": "danger",
        "outcomes": [
          {
            "chance": 55,
            "text": "Trong hộp là mảnh thánh tích còn sáng.",
            "actions": [
              {
                "type": "item",
                "itemId": "shrine_relic",
                "min": 1,
                "max": 1
              },
              {
                "type": "exp",
                "min": 8,
                "max": 14
              }
            ]
          },
          {
            "chance": 45,
            "text": "Hộp bật mở và một linh hồn giận dữ lao ra.",
            "actions": [
              {
                "type": "combat_random"
              }
            ]
          }
        ]
      },
      {
        "id": "seal",
        "label": "Niêm phong lại",
        "emoji": "🧵",
        "style": "success",
        "outcomes": [
          {
            "chance": 100,
            "text": "Bạn buộc lại dây đồng và khắc thêm một dấu trấn.",
            "actions": [
              {
                "type": "reputation",
                "amount": 2
              },
              {
                "type": "exp",
                "min": 5,
                "max": 10
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "dd_extra_shrine_cold_threshold",
    "title": "🚪 Ngưỡng Cửa Lạnh",
    "description": "Một ngưỡng cửa đá lạnh buốt chắn trước phòng phụ. Bên trong có tiếng tụng kinh rất nhỏ nhưng không rõ là người hay gió.",
    "color": 9807270,
    "image": "trap",
    "weight": 2,
    "zones": [
      "shrine"
    ],
    "timeoutText": "Bạn chần chừ quá lâu và sự kiện trôi qua.",
    "choices": [
      {
        "id": "step",
        "label": "Bước qua",
        "emoji": "🚶",
        "style": "danger",
        "outcomes": [
          {
            "chance": 60,
            "text": "Bạn vượt qua và tìm được đồ cúng còn sót lại.",
            "actions": [
              {
                "type": "gold",
                "min": 8,
                "max": 20
              },
              {
                "type": "item",
                "itemId": "holy_water",
                "min": 1,
                "max": 1
              }
            ]
          },
          {
            "chance": 40,
            "text": "Lạnh buốt bám vào chân khiến bạn đau nhói.",
            "actions": [
              {
                "type": "damage_percent",
                "min": 6,
                "max": 12
              }
            ]
          }
        ]
      },
      {
        "id": "listen",
        "label": "Đứng nghe",
        "emoji": "👂",
        "style": "secondary",
        "outcomes": [
          {
            "chance": 100,
            "text": "Bạn nghe được đoạn tụng kinh cuối và ghi nhớ nó.",
            "actions": [
              {
                "type": "exp",
                "min": 7,
                "max": 14
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "dd_extra_shrine_mg_prayer_beads",
    "title": "📿 Chuỗi Hạt Đứt",
    "description": "Một chuỗi hạt cầu nguyện vỡ làm ba đoạn. Nếu xếp đúng thứ tự, lời chúc phúc cũ có thể thức dậy.",
    "color": 15965202,
    "image": "altar",
    "weight": 2,
    "zones": [
      "shrine"
    ],
    "miniGame": {
      "title": "📿 Xếp Chuỗi Hạt",
      "introText": "Chọn đúng đoạn hạt ở ít nhất 2/3 lượt.",
      "startLabel": "Xếp lại",
      "startEmoji": "📿",
      "startStyle": "primary",
      "options": [
        {
          "id": "wood",
          "label": "Hạt Gỗ",
          "emoji": "🟤",
          "style": "secondary"
        },
        {
          "id": "bone",
          "label": "Hạt Xương",
          "emoji": "⚪",
          "style": "primary"
        },
        {
          "id": "jade",
          "label": "Hạt Ngọc",
          "emoji": "🟢",
          "style": "success"
        }
      ],
      "rounds": [
        {
          "prompt": "Đoạn mở đầu có hạt gỗ mòn vì chạm tay nhiều nhất.",
          "correctOptionId": "wood",
          "successLine": "Bạn đặt đúng đoạn mở đầu.",
          "failureLine": "Bạn bắt đầu bằng đoạn quá lạnh."
        },
        {
          "prompt": "Đoạn giữa có hạt xương khắc lời sám hối.",
          "correctOptionId": "bone",
          "successLine": "Bạn nối đúng đoạn giữa.",
          "failureLine": "Bạn bỏ qua chữ khắc nhỏ."
        },
        {
          "prompt": "Đoạn cuối có hạt ngọc dùng để khóa lời cầu.",
          "correctOptionId": "jade",
          "successLine": "Bạn hoàn tất chuỗi hạt đúng cách.",
          "failureLine": "Lời cầu bị ngắt ở đoạn cuối."
        }
      ],
      "successNeeded": 2,
      "successText": "Chuỗi hạt sáng lên rồi tan thành phước lành.",
      "failureText": "Chuỗi hạt vỡ vụn thành bụi lạnh.",
      "onSuccess": [
        {
          "type": "heal_percent",
          "min": 10,
          "max": 18
        },
        {
          "type": "item",
          "itemId": "holy_water",
          "min": 1,
          "max": 1
        }
      ],
      "onFailure": [
        {
          "type": "exp",
          "min": 2,
          "max": 6
        }
      ],
      "timeoutText": "⏳ Bạn phản ứng quá chậm nên mini game thất bại."
    }
  },
  {
    "id": "dd_extra_shrine_mg_spirit_lanterns",
    "title": "🏮 Đèn Linh Hồn",
    "description": "Ba chiếc đèn linh hồn sáng theo thứ tự khác nhau. Chọn đúng đèn để dẫn linh hồn rời khỏi đền.",
    "color": 16768409,
    "image": "altar",
    "weight": 2,
    "zones": [
      "shrine"
    ],
    "miniGame": {
      "title": "🏮 Dẫn Đèn Linh Hồn",
      "introText": "Chọn đúng đèn ở ít nhất 2/3 lượt.",
      "startLabel": "Dẫn đường",
      "startEmoji": "🏮",
      "startStyle": "primary",
      "options": [
        {
          "id": "left",
          "label": "Đèn Trái",
          "emoji": "⬅️",
          "style": "secondary"
        },
        {
          "id": "middle",
          "label": "Đèn Giữa",
          "emoji": "⬆️",
          "style": "primary"
        },
        {
          "id": "right",
          "label": "Đèn Phải",
          "emoji": "➡️",
          "style": "secondary"
        }
      ],
      "rounds": [
        {
          "prompt": "Đèn trái sáng trước nhưng ngọn lửa không run.",
          "correctOptionId": "left",
          "successLine": "Bạn chọn đúng ngọn đèn mở đường.",
          "failureLine": "Bạn bị ánh sáng mạnh hơn lừa."
        },
        {
          "prompt": "Đèn giữa sáng khi tiếng chuông xa vang lên.",
          "correctOptionId": "middle",
          "successLine": "Bạn bắt được nhịp chuông.",
          "failureLine": "Bạn chọn trước khi chuông kết thúc."
        },
        {
          "prompt": "Đèn phải có khói bay ngược về cửa ra.",
          "correctOptionId": "right",
          "successLine": "Bạn dẫn đúng hướng thoát.",
          "failureLine": "Linh hồn bị kéo lại vào bóng tối."
        }
      ],
      "successNeeded": 2,
      "successText": "Bạn dẫn được linh hồn đi, để lại lời cảm ơn mờ nhạt.",
      "failureText": "Linh hồn tan vào đền và để lại cơn lạnh.",
      "onSuccess": [
        {
          "type": "soul_shard",
          "amount": 1
        },
        {
          "type": "reputation",
          "amount": 2
        }
      ],
      "onFailure": [
        {
          "type": "damage_percent",
          "min": 4,
          "max": 9
        }
      ],
      "timeoutText": "⏳ Bạn phản ứng quá chậm nên mini game thất bại."
    }
  },
  {
    "id": "dd_extra_shrine_mg_sutra_order",
    "title": "📜 Thứ Tự Kinh Văn",
    "description": "Ba mảnh kinh văn nằm lộn xộn quanh bàn thờ. Nếu đọc đúng thứ tự, bạn có thể mở khóa lời chú ngắn.",
    "color": 14070634,
    "image": "mysterious",
    "weight": 2,
    "zones": [
      "shrine"
    ],
    "miniGame": {
      "title": "📜 Sắp Xếp Kinh Văn",
      "introText": "Chọn đúng mảnh kinh ở ít nhất 2/3 lượt.",
      "startLabel": "Sắp xếp",
      "startEmoji": "📜",
      "startStyle": "primary",
      "options": [
        {
          "id": "mercy",
          "label": "Từ Bi",
          "emoji": "🙏",
          "style": "success"
        },
        {
          "id": "seal",
          "label": "Phong Ấn",
          "emoji": "🔒",
          "style": "primary"
        },
        {
          "id": "release",
          "label": "Giải Thoát",
          "emoji": "🕊️",
          "style": "secondary"
        }
      ],
      "rounds": [
        {
          "prompt": "Mảnh đầu nói về lòng từ bi trước khi trừng phạt.",
          "correctOptionId": "mercy",
          "successLine": "Bạn đặt đúng mảnh mở đầu.",
          "failureLine": "Bạn bỏ qua sắc thái lời mở."
        },
        {
          "prompt": "Mảnh thứ hai nhắc đến vòng phong ấn bằng tro.",
          "correctOptionId": "seal",
          "successLine": "Bạn nối đúng đoạn phong ấn.",
          "failureLine": "Bạn đọc nhầm dấu tro thành dấu kết."
        },
        {
          "prompt": "Mảnh cuối có chữ giải thoát bị nhòe ở góc giấy.",
          "correctOptionId": "release",
          "successLine": "Bạn hoàn chỉnh câu chú.",
          "failureLine": "Câu chú kết thúc sai ý."
        }
      ],
      "successNeeded": 2,
      "successText": "Bạn đọc đúng thứ tự và nhận được chút tri thức cổ.",
      "failureText": "Kinh văn tự cháy, chỉ còn lại ít tro.",
      "onSuccess": [
        {
          "type": "exp",
          "min": 10,
          "max": 20
        },
        {
          "type": "item",
          "itemId": "soul_dust",
          "min": 1,
          "max": 1
        }
      ],
      "onFailure": [
        {
          "type": "damage_percent",
          "min": 3,
          "max": 7
        }
      ],
      "timeoutText": "⏳ Bạn phản ứng quá chậm nên mini game thất bại."
    }
  },
  {
    "id": "dd_extra_mines_ore_cart_cache",
    "title": "🛒 Xe Quặng Bỏ Lại",
    "description": "Một xe quặng mắc kẹt trên đường ray gỉ. Dưới lớp than vụn có vài mảnh kim loại còn sáng.",
    "color": 9807270,
    "image": "loot",
    "weight": 3,
    "zones": [
      "mines"
    ],
    "timeoutText": "Bạn chần chừ quá lâu và sự kiện trôi qua.",
    "choices": [
      {
        "id": "dig",
        "label": "Bới quặng",
        "emoji": "⛏️",
        "style": "primary",
        "outcomes": [
          {
            "chance": 75,
            "text": "Bạn tìm được một ít quặng dùng để craft.",
            "actions": [
              {
                "type": "item",
                "itemId": "iron_ore",
                "min": 1,
                "max": 3
              },
              {
                "type": "item",
                "itemId": "stone",
                "min": 1,
                "max": 2
              }
            ]
          },
          {
            "chance": 25,
            "text": "Xe quặng trượt nhẹ làm bạn va vào thành hang.",
            "actions": [
              {
                "type": "damage_percent",
                "min": 4,
                "max": 8
              }
            ]
          }
        ]
      },
      {
        "id": "push",
        "label": "Đẩy xe về ray",
        "emoji": "💪",
        "style": "success",
        "outcomes": [
          {
            "chance": 100,
            "text": "Bạn đưa xe về ray và phát hiện đường hầm phụ.",
            "actions": [
              {
                "type": "exp",
                "min": 8,
                "max": 16
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "dd_extra_mines_lantern_oil",
    "title": "🪔 Dầu Đèn Cũ",
    "description": "Một bình dầu đèn còn sót lại trong hốc đá. Dầu có mùi khét nhưng vẫn cháy được.",
    "color": 15965202,
    "image": "camp",
    "weight": 3,
    "zones": [
      "mines"
    ],
    "timeoutText": "Bạn chần chừ quá lâu và sự kiện trôi qua.",
    "choices": [
      {
        "id": "light",
        "label": "Thắp đèn",
        "emoji": "🔥",
        "style": "primary",
        "outcomes": [
          {
            "chance": 80,
            "text": "Ánh đèn giúp bạn nhìn rõ đường và tránh ổ sụt.",
            "actions": [
              {
                "type": "exp",
                "min": 7,
                "max": 14
              }
            ]
          },
          {
            "chance": 20,
            "text": "Bấc đèn bùng lên làm bạn giật mình.",
            "actions": [
              {
                "type": "damage_percent",
                "min": 3,
                "max": 6
              }
            ]
          }
        ]
      },
      {
        "id": "bottle",
        "label": "Đổ vào chai",
        "emoji": "🧴",
        "style": "secondary",
        "outcomes": [
          {
            "chance": 100,
            "text": "Bạn giữ lại dầu để dùng như chất đốt tạm.",
            "actions": [
              {
                "type": "item",
                "itemId": "weapon_oil",
                "min": 1,
                "max": 1
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "dd_extra_mines_crystal_sweat",
    "title": "💎 Mồ Hôi Pha Lê",
    "description": "Một mảng tinh thể rỉ từng giọt sáng như nước. Mỗi giọt rơi xuống lại ngân lên tiếng kim loại.",
    "color": 48340,
    "image": "mysterious",
    "weight": 2,
    "zones": [
      "mines"
    ],
    "timeoutText": "Bạn chần chừ quá lâu và sự kiện trôi qua.",
    "choices": [
      {
        "id": "collect",
        "label": "Hứng tinh dịch",
        "emoji": "🫙",
        "style": "primary",
        "outcomes": [
          {
            "chance": 65,
            "text": "Bạn hứng được giọt pha lê trước khi nó đông cứng.",
            "actions": [
              {
                "type": "item",
                "itemId": "mana_crystal",
                "min": 1,
                "max": 1
              },
              {
                "type": "mp_percent",
                "min": 5,
                "max": 10
              }
            ]
          },
          {
            "chance": 35,
            "text": "Giọt pha lê vỡ thành mảnh sắc cắt vào tay.",
            "actions": [
              {
                "type": "damage_percent",
                "min": 5,
                "max": 9
              }
            ]
          }
        ]
      },
      {
        "id": "study",
        "label": "Quan sát mạch tinh thể",
        "emoji": "🔎",
        "style": "secondary",
        "outcomes": [
          {
            "chance": 100,
            "text": "Bạn học được cách nhận biết tinh thể sống.",
            "actions": [
              {
                "type": "exp",
                "min": 8,
                "max": 16
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "dd_extra_mines_black_damp",
    "title": "🌫️ Khí Đen Trong Hầm",
    "description": "Một lớp khí đen bò sát mặt đất. Đuốc cháy yếu đi khi bạn đến gần.",
    "color": 3426654,
    "image": "trap",
    "weight": 2,
    "zones": [
      "mines"
    ],
    "timeoutText": "Bạn chần chừ quá lâu và sự kiện trôi qua.",
    "choices": [
      {
        "id": "hold_breath",
        "label": "Nín thở đi qua",
        "emoji": "😮‍💨",
        "style": "danger",
        "outcomes": [
          {
            "chance": 60,
            "text": "Bạn vượt qua trước khi khí tràn lên cao.",
            "actions": [
              {
                "type": "exp",
                "min": 8,
                "max": 14
              }
            ]
          },
          {
            "chance": 40,
            "text": "Bạn hít phải một hơi khí nặng và choáng váng.",
            "actions": [
              {
                "type": "damage_percent",
                "min": 7,
                "max": 13
              }
            ]
          }
        ]
      },
      {
        "id": "vent",
        "label": "Mở khe thông gió",
        "emoji": "🪨",
        "style": "success",
        "outcomes": [
          {
            "chance": 100,
            "text": "Bạn đẩy đá mở một khe thoát khí.",
            "actions": [
              {
                "type": "reputation",
                "amount": 1
              },
              {
                "type": "exp",
                "min": 5,
                "max": 11
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "dd_extra_mines_rusted_pickrack",
    "title": "⛏️ Giá Cuốc Rỉ",
    "description": "Một giá treo cuốc chim đã rỉ gần hết. Có một chiếc vẫn còn dùng được nếu sửa qua.",
    "color": 8359053,
    "image": "loot",
    "weight": 2,
    "zones": [
      "mines"
    ],
    "timeoutText": "Bạn chần chừ quá lâu và sự kiện trôi qua.",
    "choices": [
      {
        "id": "take",
        "label": "Lấy chiếc tốt nhất",
        "emoji": "⛏️",
        "style": "primary",
        "outcomes": [
          {
            "chance": 100,
            "text": "Bạn lấy được vài mảnh sắt và một dụng cụ còn dùng tạm.",
            "actions": [
              {
                "type": "item",
                "itemId": "rusty_gear",
                "min": 1,
                "max": 2
              },
              {
                "type": "item",
                "itemId": "black_iron",
                "min": 1,
                "max": 1
              }
            ]
          }
        ]
      },
      {
        "id": "salvage",
        "label": "Tháo từng phần",
        "emoji": "🔧",
        "style": "secondary",
        "outcomes": [
          {
            "chance": 100,
            "text": "Bạn tháo cẩn thận, tiết kiệm được nhiều vật liệu hơn.",
            "actions": [
              {
                "type": "item",
                "itemId": "iron_ore",
                "min": 2,
                "max": 4
              },
              {
                "type": "exp",
                "min": 4,
                "max": 9
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "dd_extra_mines_echoing_helmet",
    "title": "⛑️ Mũ Thợ Mỏ Vọng Âm",
    "description": "Một chiếc mũ thợ mỏ nằm giữa đường ray. Khi bạn nhặt lên, nó phát ra tiếng thì thầm của người cũ.",
    "color": 11579568,
    "image": "mysterious",
    "weight": 2,
    "zones": [
      "mines"
    ],
    "requiresCombat": true,
    "timeoutText": "Bạn chần chừ quá lâu và sự kiện trôi qua.",
    "choices": [
      {
        "id": "listen",
        "label": "Áp tai nghe",
        "emoji": "👂",
        "style": "primary",
        "outcomes": [
          {
            "chance": 60,
            "text": "Tiếng thì thầm chỉ bạn vị trí kho cũ.",
            "actions": [
              {
                "type": "gold",
                "min": 12,
                "max": 28
              },
              {
                "type": "exp",
                "min": 5,
                "max": 10
              }
            ]
          },
          {
            "chance": 40,
            "text": "Âm vọng biến thành tiếng gầm từ hầm sâu.",
            "actions": [
              {
                "type": "combat_random"
              }
            ]
          }
        ]
      },
      {
        "id": "bury",
        "label": "Chôn lại mũ",
        "emoji": "🪦",
        "style": "success",
        "outcomes": [
          {
            "chance": 100,
            "text": "Bạn đặt chiếc mũ vào hốc đá như một lời tưởng niệm.",
            "actions": [
              {
                "type": "reputation",
                "amount": 2
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "dd_extra_mines_warm_wall",
    "title": "🔥 Bức Tường Ấm",
    "description": "Một mảng tường đá tỏa nhiệt đều đều. Sau tường có tiếng dung nham chảy rất xa.",
    "color": 15158332,
    "image": "trap",
    "weight": 2,
    "zones": [
      "mines"
    ],
    "timeoutText": "Bạn chần chừ quá lâu và sự kiện trôi qua.",
    "choices": [
      {
        "id": "mine",
        "label": "Đục thử",
        "emoji": "⛏️",
        "style": "danger",
        "outcomes": [
          {
            "chance": 50,
            "text": "Bạn lấy được tinh thể nóng trước khi vết nứt lan rộng.",
            "actions": [
              {
                "type": "item",
                "itemId": "burning_core",
                "min": 1,
                "max": 1
              }
            ]
          },
          {
            "chance": 50,
            "text": "Hơi nóng phụt ra làm bạn bỏng nhẹ.",
            "actions": [
              {
                "type": "damage_percent",
                "min": 7,
                "max": 13
              }
            ]
          }
        ]
      },
      {
        "id": "mark",
        "label": "Đánh dấu nguy hiểm",
        "emoji": "⚠️",
        "style": "success",
        "outcomes": [
          {
            "chance": 100,
            "text": "Bạn đánh dấu để người sau tránh xa khu vực nóng.",
            "actions": [
              {
                "type": "reputation",
                "amount": 1
              },
              {
                "type": "exp",
                "min": 5,
                "max": 10
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "dd_extra_mines_mg_track_switch",
    "title": "🔀 Ghi Đường Ray",
    "description": "Ba cần gạt đường ray bị kẹt. Nếu kéo đúng thứ tự, xe quặng sẽ mở lối sang hầm phụ.",
    "color": 9807270,
    "image": "trap",
    "weight": 2,
    "zones": [
      "mines"
    ],
    "miniGame": {
      "title": "🔀 Gạt Đường Ray",
      "introText": "Chọn đúng cần gạt ở ít nhất 2/3 lượt.",
      "startLabel": "Kéo cần",
      "startEmoji": "🔀",
      "startStyle": "primary",
      "options": [
        {
          "id": "left",
          "label": "Cần Trái",
          "emoji": "⬅️",
          "style": "secondary"
        },
        {
          "id": "center",
          "label": "Cần Giữa",
          "emoji": "⬆️",
          "style": "primary"
        },
        {
          "id": "right",
          "label": "Cần Phải",
          "emoji": "➡️",
          "style": "secondary"
        }
      ],
      "rounds": [
        {
          "prompt": "Đường ray đầu bị lệch sang trái, cần trái có vết mòn mới.",
          "correctOptionId": "left",
          "successLine": "Bạn đưa ray đầu về đúng rãnh.",
          "failureLine": "Bạn kéo nhầm làm ray kêu ken két."
        },
        {
          "prompt": "Đoạn giữa mắc đá, cần giữa có dây kéo phụ.",
          "correctOptionId": "center",
          "successLine": "Bạn giải phóng đoạn ray chính.",
          "failureLine": "Bạn bỏ qua dây kéo phụ."
        },
        {
          "prompt": "Lối phụ nằm bên phải, cần phải bị bụi che gần hết.",
          "correctOptionId": "right",
          "successLine": "Bạn mở được hầm phụ.",
          "failureLine": "Xe quặng đi lệch hướng."
        }
      ],
      "successNeeded": 2,
      "successText": "Xe quặng lăn đúng hướng và để lộ kho nhỏ.",
      "failureText": "Xe quặng kẹt lại, đá vụn rơi xuống quanh bạn.",
      "onSuccess": [
        {
          "type": "gold",
          "min": 14,
          "max": 30
        },
        {
          "type": "item",
          "itemId": "silver_ore",
          "min": 1,
          "max": 2
        }
      ],
      "onFailure": [
        {
          "type": "damage_percent",
          "min": 5,
          "max": 10
        }
      ],
      "timeoutText": "⏳ Bạn phản ứng quá chậm nên mini game thất bại."
    }
  },
  {
    "id": "dd_extra_mines_mg_crystal_tone",
    "title": "🔮 Âm Tinh Thể",
    "description": "Ba khối tinh thể phát ra âm khác nhau. Chạm đúng âm sẽ không làm cả hang cộng hưởng nguy hiểm.",
    "color": 48340,
    "image": "mysterious",
    "weight": 2,
    "zones": [
      "mines"
    ],
    "miniGame": {
      "title": "🔮 Chạm Tinh Thể",
      "introText": "Chọn đúng âm ở ít nhất 2/3 lượt.",
      "startLabel": "Chạm thử",
      "startEmoji": "🔮",
      "startStyle": "primary",
      "options": [
        {
          "id": "deep",
          "label": "Âm Sâu",
          "emoji": "🔵",
          "style": "secondary"
        },
        {
          "id": "clear",
          "label": "Âm Trong",
          "emoji": "⚪",
          "style": "primary"
        },
        {
          "id": "sharp",
          "label": "Âm Sắc",
          "emoji": "🔺",
          "style": "danger"
        }
      ],
      "rounds": [
        {
          "prompt": "Khối đầu rung chậm, ánh sáng xanh lan từ đáy lên.",
          "correctOptionId": "deep",
          "successLine": "Bạn chạm đúng âm sâu.",
          "failureLine": "Âm thanh lệch làm đá rung nhẹ."
        },
        {
          "prompt": "Khối thứ hai trong suốt, vang như giọt nước rơi.",
          "correctOptionId": "clear",
          "successLine": "Bạn giữ được cộng hưởng ổn định.",
          "failureLine": "Bạn chọn khối đục hơn."
        },
        {
          "prompt": "Khối cuối có mũi nhọn nhỏ phát tia sáng.",
          "correctOptionId": "sharp",
          "successLine": "Bạn kết thúc bằng âm sắc chính xác.",
          "failureLine": "Tia sáng bắn vào vách đá."
        }
      ],
      "successNeeded": 2,
      "successText": "Tinh thể cộng hưởng dịu lại và rơi ra vài mảnh nhỏ.",
      "failureText": "Cộng hưởng vỡ nhịp làm bạn ù tai.",
      "onSuccess": [
        {
          "type": "item",
          "itemId": "mana_crystal",
          "min": 1,
          "max": 2
        },
        {
          "type": "exp",
          "min": 8,
          "max": 16
        }
      ],
      "onFailure": [
        {
          "type": "damage_percent",
          "min": 4,
          "max": 9
        }
      ],
      "timeoutText": "⏳ Bạn phản ứng quá chậm nên mini game thất bại."
    }
  },
  {
    "id": "dd_extra_mines_mg_miner_knots",
    "title": "🪢 Nút Dây Thợ Mỏ",
    "description": "Một đoạn dây cứu hộ thắt ba loại nút. Mỗi nút đánh dấu một nguy hiểm khác nhau trong hầm.",
    "color": 9334355,
    "image": "loot",
    "weight": 2,
    "zones": [
      "mines"
    ],
    "miniGame": {
      "title": "🪢 Đọc Nút Dây",
      "introText": "Chọn đúng ý nghĩa nút ở ít nhất 2/3 lượt.",
      "startLabel": "Đọc nút",
      "startEmoji": "🪢",
      "startStyle": "primary",
      "options": [
        {
          "id": "fall",
          "label": "Sập Hầm",
          "emoji": "🪨",
          "style": "danger"
        },
        {
          "id": "water",
          "label": "Nước Ngầm",
          "emoji": "💧",
          "style": "primary"
        },
        {
          "id": "ore",
          "label": "Mạch Quặng",
          "emoji": "💎",
          "style": "success"
        }
      ],
      "rounds": [
        {
          "prompt": "Nút kép buộc sát nền thường báo đoạn trần yếu.",
          "correctOptionId": "fall",
          "successLine": "Bạn đọc đúng cảnh báo sập hầm.",
          "failureLine": "Bạn tưởng đó là dấu mạch quặng."
        },
        {
          "prompt": "Nút thắt trơn và ẩm hơn các đoạn khác.",
          "correctOptionId": "water",
          "successLine": "Bạn nhận ra dấu nước ngầm.",
          "failureLine": "Bạn bỏ qua độ ẩm trên dây."
        },
        {
          "prompt": "Nút cuối có bột đá lấp lánh dính quanh sợi.",
          "correctOptionId": "ore",
          "successLine": "Bạn xác định được mạch quặng.",
          "failureLine": "Bạn đi sai hướng khỏi mạch chính."
        }
      ],
      "successNeeded": 2,
      "successText": "Bạn đọc được dấu dây và tìm được lối đào an toàn.",
      "failureText": "Bạn hiểu sai dấu dây và phải quay lại.",
      "onSuccess": [
        {
          "type": "item",
          "itemId": "iron_ore",
          "min": 2,
          "max": 4
        },
        {
          "type": "item",
          "itemId": "silver_ore",
          "min": 1,
          "max": 1
        }
      ],
      "onFailure": [
        {
          "type": "exp",
          "min": 3,
          "max": 7
        }
      ],
      "timeoutText": "⏳ Bạn phản ứng quá chậm nên mini game thất bại."
    }
  },
  {
    "id": "dd_extra_wastes_glass_bloom",
    "title": "🌺 Hoa Kính Vỡ",
    "description": "Một bông hoa làm từ kính mọc giữa cát xám. Mỗi cánh hoa phản chiếu một phiên bản khác của bạn.",
    "color": 10181046,
    "image": "mysterious",
    "weight": 2,
    "zones": [
      "wastes"
    ],
    "timeoutText": "Bạn chần chừ quá lâu và sự kiện trôi qua.",
    "choices": [
      {
        "id": "pluck",
        "label": "Hái hoa",
        "emoji": "✋",
        "style": "danger",
        "outcomes": [
          {
            "chance": 55,
            "text": "Bạn bẻ được một cánh kính chứa năng lượng lạ.",
            "actions": [
              {
                "type": "item",
                "itemId": "void_fragment",
                "min": 1,
                "max": 1
              },
              {
                "type": "exp",
                "min": 8,
                "max": 16
              }
            ]
          },
          {
            "chance": 45,
            "text": "Cánh hoa vỡ và cứa vào tay bạn bằng ký ức sắc lạnh.",
            "actions": [
              {
                "type": "damage_percent",
                "min": 7,
                "max": 13
              }
            ]
          }
        ]
      },
      {
        "id": "reflect",
        "label": "Nhìn vào phản chiếu",
        "emoji": "👁️",
        "style": "primary",
        "outcomes": [
          {
            "chance": 100,
            "text": "Bạn nhìn thấy một thất bại có thể tránh được.",
            "actions": [
              {
                "type": "exp",
                "min": 10,
                "max": 18
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "dd_extra_wastes_singing_bone",
    "title": "🦴 Xương Biết Hát",
    "description": "Một khúc xương trắng phát ra giai điệu trầm khi gió thổi qua. Nó chỉ im khi bạn bước lại gần.",
    "color": 14472951,
    "image": "mysterious",
    "weight": 2,
    "zones": [
      "wastes"
    ],
    "requiresCombat": true,
    "timeoutText": "Bạn chần chừ quá lâu và sự kiện trôi qua.",
    "choices": [
      {
        "id": "take",
        "label": "Nhặt khúc xương",
        "emoji": "🦴",
        "style": "danger",
        "outcomes": [
          {
            "chance": 50,
            "text": "Khúc xương hóa thành bụi linh hồn trong tay bạn.",
            "actions": [
              {
                "type": "item",
                "itemId": "ancient_bone",
                "min": 1,
                "max": 1
              },
              {
                "type": "item",
                "itemId": "soul_dust",
                "min": 1,
                "max": 1
              }
            ]
          },
          {
            "chance": 50,
            "text": "Bài hát gọi một thứ đang săn mồi trong sương.",
            "actions": [
              {
                "type": "combat_random"
              }
            ]
          }
        ]
      },
      {
        "id": "hum",
        "label": "Ngân nga theo",
        "emoji": "🎵",
        "style": "secondary",
        "outcomes": [
          {
            "chance": 100,
            "text": "Bạn bắt chước giai điệu và học được nhịp của vùng đất méo mó.",
            "actions": [
              {
                "type": "exp",
                "min": 9,
                "max": 18
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "dd_extra_wastes_inverted_camp",
    "title": "⛺ Trại Ngược",
    "description": "Một trại nhỏ xuất hiện với lửa cháy xuống dưới và khói bay vào đất. Túi đồ vẫn đặt cạnh đống lửa ngược.",
    "color": 9323693,
    "image": "camp",
    "weight": 2,
    "zones": [
      "wastes"
    ],
    "timeoutText": "Bạn chần chừ quá lâu và sự kiện trôi qua.",
    "choices": [
      {
        "id": "loot",
        "label": "Lục túi đồ",
        "emoji": "🎒",
        "style": "primary",
        "outcomes": [
          {
            "chance": 60,
            "text": "Bạn lấy được vài món trước khi trại biến mất.",
            "actions": [
              {
                "type": "gold",
                "min": 12,
                "max": 28
              },
              {
                "type": "item",
                "itemId": "void_shard",
                "min": 1,
                "max": 1
              }
            ]
          },
          {
            "chance": 40,
            "text": "Trại đảo chiều kéo bạn ngã vào cát lạnh.",
            "actions": [
              {
                "type": "damage_percent",
                "min": 6,
                "max": 12
              }
            ]
          }
        ]
      },
      {
        "id": "extinguish",
        "label": "Dập lửa ngược",
        "emoji": "🧯",
        "style": "success",
        "outcomes": [
          {
            "chance": 100,
            "text": "Ngọn lửa tắt và để lại một mảnh ký ức.",
            "actions": [
              {
                "type": "item",
                "itemId": "lost_memory",
                "min": 1,
                "max": 1
              },
              {
                "type": "exp",
                "min": 5,
                "max": 10
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "dd_extra_wastes_echo_well",
    "title": "🕳️ Giếng Tiếng Vọng",
    "description": "Một cái giếng không đáy nằm giữa hoang nguyên. Khi bạn nhìn xuống, tiếng của chính bạn vọng lên trước khi bạn nói.",
    "color": 7101671,
    "image": "mysterious",
    "weight": 3,
    "zones": [
      "wastes"
    ],
    "timeoutText": "Bạn chần chừ quá lâu và sự kiện trôi qua.",
    "choices": [
      {
        "id": "ask",
        "label": "Hỏi một câu",
        "emoji": "❓",
        "style": "primary",
        "outcomes": [
          {
            "chance": 70,
            "text": "Tiếng vọng trả lời bằng một gợi ý mơ hồ nhưng hữu ích.",
            "actions": [
              {
                "type": "exp",
                "min": 10,
                "max": 20
              }
            ]
          },
          {
            "chance": 30,
            "text": "Câu trả lời là tiếng hét của bạn ở một ngày tồi tệ hơn.",
            "actions": [
              {
                "type": "damage_percent",
                "min": 5,
                "max": 10
              }
            ]
          }
        ]
      },
      {
        "id": "drop_coin",
        "label": "Thả đồng xu",
        "emoji": "🪙",
        "style": "secondary",
        "outcomes": [
          {
            "chance": 100,
            "text": "Đồng xu rơi mãi rồi bật ngược lên thành thứ khác.",
            "actions": [
              {
                "type": "gold",
                "min": -5,
                "max": -5
              },
              {
                "type": "item",
                "itemId": "fate_coin",
                "min": 1,
                "max": 1
              }
            ]
          }
        ],
        "requires": {
          "gold": 5
        }
      }
    ]
  },
  {
    "id": "dd_extra_wastes_moth_lantern",
    "title": "🦋 Đèn Bướm Ký Ức",
    "description": "Một đàn bướm xám bay quanh chiếc đèn không lửa. Cánh chúng mang những hình ảnh vụn vặt của người đã mất.",
    "color": 10656766,
    "image": "mysterious",
    "weight": 2,
    "zones": [
      "wastes"
    ],
    "timeoutText": "Bạn chần chừ quá lâu và sự kiện trôi qua.",
    "choices": [
      {
        "id": "open",
        "label": "Mở đèn",
        "emoji": "🏮",
        "style": "danger",
        "outcomes": [
          {
            "chance": 55,
            "text": "Một ký ức ấm áp thoát ra và chữa lành bạn.",
            "actions": [
              {
                "type": "heal_percent",
                "min": 12,
                "max": 20
              }
            ]
          },
          {
            "chance": 45,
            "text": "Ký ức hỗn loạn tràn vào đầu bạn.",
            "actions": [
              {
                "type": "damage_percent",
                "min": 6,
                "max": 11
              }
            ]
          }
        ]
      },
      {
        "id": "guide",
        "label": "Dẫn bướm đi",
        "emoji": "🦋",
        "style": "success",
        "outcomes": [
          {
            "chance": 100,
            "text": "Bạn dẫn đàn bướm tới một cột mốc cũ. Chúng tan thành bụi sáng.",
            "actions": [
              {
                "type": "item",
                "itemId": "stardust",
                "min": 1,
                "max": 2
              },
              {
                "type": "reputation",
                "amount": 1
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "dd_extra_wastes_black_sundial",
    "title": "🕰️ Đồng Hồ Nắng Đen",
    "description": "Một đồng hồ nắng bằng đá đen không có bóng. Kim của nó xoay về hướng không tồn tại trên bản đồ.",
    "color": 2962486,
    "image": "mysterious",
    "weight": 1,
    "zones": [
      "wastes"
    ],
    "timeoutText": "Bạn chần chừ quá lâu và sự kiện trôi qua.",
    "choices": [
      {
        "id": "turn",
        "label": "Xoay kim",
        "emoji": "🕰️",
        "style": "danger",
        "outcomes": [
          {
            "chance": 50,
            "text": "Thời gian quanh bạn chậm lại đủ để tìm được vật lạ.",
            "actions": [
              {
                "type": "item",
                "itemId": "time_fragment",
                "min": 1,
                "max": 1
              }
            ]
          },
          {
            "chance": 50,
            "text": "Một lát thời gian bị cắt khỏi cơ thể bạn.",
            "actions": [
              {
                "type": "damage_percent",
                "min": 8,
                "max": 14
              }
            ]
          }
        ]
      },
      {
        "id": "copy",
        "label": "Vẽ lại ký hiệu",
        "emoji": "✍️",
        "style": "secondary",
        "outcomes": [
          {
            "chance": 100,
            "text": "Bạn sao chép được ký hiệu thời gian hiếm.",
            "actions": [
              {
                "type": "exp",
                "min": 12,
                "max": 22
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "dd_extra_wastes_dust_market",
    "title": "🛒 Chợ Bụi Tàn",
    "description": "Vài sạp hàng hiện lên trong cơn bụi. Người bán không có mặt, chỉ có bảng giá viết bằng ký hiệu kỳ lạ.",
    "color": 9323693,
    "image": "merchant",
    "weight": 2,
    "zones": [
      "wastes"
    ],
    "timeoutText": "Bạn chần chừ quá lâu và sự kiện trôi qua.",
    "choices": [
      {
        "id": "buy",
        "label": "Mua vật lạ - 35G",
        "emoji": "🛒",
        "style": "primary",
        "outcomes": [
          {
            "chance": 100,
            "text": "Bạn đặt vàng xuống và nhận được một mảnh hư không.",
            "actions": [
              {
                "type": "gold",
                "min": -35,
                "max": -35
              },
              {
                "type": "item",
                "itemId": "void_shard",
                "min": 1,
                "max": 1
              }
            ]
          }
        ],
        "requires": {
          "gold": 35
        }
      },
      {
        "id": "steal",
        "label": "Lấy trộm",
        "emoji": "🖐️",
        "style": "danger",
        "outcomes": [
          {
            "chance": 45,
            "text": "Bạn giật được vật nhỏ trước khi sạp biến mất.",
            "actions": [
              {
                "type": "item",
                "itemId": "mysterious_shard",
                "min": 1,
                "max": 1
              },
              {
                "type": "wanted",
                "amount": 1
              }
            ]
          },
          {
            "chance": 55,
            "text": "Cái bóng của người bán tóm lấy cổ tay bạn.",
            "actions": [
              {
                "type": "damage_percent",
                "min": 7,
                "max": 13
              },
              {
                "type": "wanted",
                "amount": 1
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "dd_extra_wastes_mg_memory_mirrors",
    "title": "🪞 Gương Ký Ức",
    "description": "Ba mảnh gương phản chiếu ba thời điểm khác nhau. Chọn đúng mảnh để không bị nuốt vào ký ức sai.",
    "color": 10181046,
    "image": "mysterious",
    "weight": 2,
    "zones": [
      "wastes"
    ],
    "miniGame": {
      "title": "🪞 Chọn Mảnh Gương",
      "introText": "Chọn đúng mảnh ở ít nhất 2/3 lượt.",
      "startLabel": "Nhìn gương",
      "startEmoji": "🪞",
      "startStyle": "primary",
      "options": [
        {
          "id": "past",
          "label": "Quá Khứ",
          "emoji": "⏪",
          "style": "secondary"
        },
        {
          "id": "present",
          "label": "Hiện Tại",
          "emoji": "⏺️",
          "style": "primary"
        },
        {
          "id": "future",
          "label": "Tương Lai",
          "emoji": "⏩",
          "style": "danger"
        }
      ],
      "rounds": [
        {
          "prompt": "Mảnh đầu có bụi phủ dày và hình ảnh chậm hơn hơi thở của bạn.",
          "correctOptionId": "past",
          "successLine": "Bạn nhận ra ký ức quá khứ.",
          "failureLine": "Bạn nhìn nhầm tốc độ phản chiếu."
        },
        {
          "prompt": "Mảnh thứ hai phản chiếu đúng vết thương hiện tại.",
          "correctOptionId": "present",
          "successLine": "Bạn neo mình lại hiện tại.",
          "failureLine": "Bạn bị một phiên bản khác kéo lệch."
        },
        {
          "prompt": "Mảnh cuối phản chiếu một bước chân bạn chưa đi.",
          "correctOptionId": "future",
          "successLine": "Bạn đọc đúng bóng tương lai.",
          "failureLine": "Bạn chạm vào tương lai sai."
        }
      ],
      "successNeeded": 2,
      "successText": "Bạn nối đúng ba phản chiếu và nhận được mảnh ký ức hữu ích.",
      "failureText": "Gương nứt và ký ức sai cào qua tâm trí bạn.",
      "onSuccess": [
        {
          "type": "item",
          "itemId": "lost_memory",
          "min": 1,
          "max": 2
        },
        {
          "type": "exp",
          "min": 10,
          "max": 20
        }
      ],
      "onFailure": [
        {
          "type": "damage_percent",
          "min": 6,
          "max": 12
        }
      ],
      "timeoutText": "⏳ Bạn phản ứng quá chậm nên mini game thất bại."
    }
  },
  {
    "id": "dd_extra_wastes_mg_void_compass",
    "title": "🧭 La Bàn Hư Không",
    "description": "La bàn xoay không ngừng giữa ba hướng không có trên bản đồ. Bạn cần khóa đúng hướng để thoát khỏi vùng méo.",
    "color": 7101671,
    "image": "mysterious",
    "weight": 2,
    "zones": [
      "wastes"
    ],
    "miniGame": {
      "title": "🧭 Khóa La Bàn",
      "introText": "Chọn đúng hướng ở ít nhất 2/3 lượt.",
      "startLabel": "Khóa hướng",
      "startEmoji": "🧭",
      "startStyle": "primary",
      "options": [
        {
          "id": "ash",
          "label": "Hướng Tro",
          "emoji": "🌫️",
          "style": "secondary"
        },
        {
          "id": "star",
          "label": "Hướng Sao",
          "emoji": "⭐",
          "style": "success"
        },
        {
          "id": "echo",
          "label": "Hướng Vọng",
          "emoji": "🔊",
          "style": "primary"
        }
      ],
      "rounds": [
        {
          "prompt": "Kim chỉ về nơi bụi bay ngược chiều gió.",
          "correctOptionId": "ash",
          "successLine": "Bạn khóa đúng hướng tro.",
          "failureLine": "Bạn quên xét hướng bụi."
        },
        {
          "prompt": "Ở đoạn hai, kim dừng khi trời lộ một điểm sao tím.",
          "correctOptionId": "star",
          "successLine": "Bạn bám đúng hướng sao.",
          "failureLine": "Bạn chọn trước khi sao hiện rõ."
        },
        {
          "prompt": "Đoạn cuối, tiếng bước chân vọng lại từ hướng trống.",
          "correctOptionId": "echo",
          "successLine": "Bạn tin vào tiếng vọng đúng lúc.",
          "failureLine": "Bạn chọn hướng yên lặng giả."
        }
      ],
      "successNeeded": 2,
      "successText": "La bàn ổn định và dẫn bạn tới một khe an toàn.",
      "failureText": "La bàn vỡ, làm không gian quanh bạn chao đảo.",
      "onSuccess": [
        {
          "type": "item",
          "itemId": "void_fragment",
          "min": 1,
          "max": 1
        },
        {
          "type": "mp_percent",
          "min": 8,
          "max": 14
        }
      ],
      "onFailure": [
        {
          "type": "damage_percent",
          "min": 5,
          "max": 10
        }
      ],
      "timeoutText": "⏳ Bạn phản ứng quá chậm nên mini game thất bại."
    }
  },
  {
    "id": "dd_extra_wastes_mg_echo_names",
    "title": "📣 Tên Trong Tiếng Vọng",
    "description": "Tiếng vọng gọi ba cái tên khác nhau. Chỉ một cái là tên thật của linh hồn đang mắc kẹt.",
    "color": 7428322,
    "image": "mysterious",
    "weight": 2,
    "zones": [
      "wastes"
    ],
    "miniGame": {
      "title": "📣 Gọi Đúng Tên",
      "introText": "Chọn đúng tên ở ít nhất 2/3 lượt.",
      "startLabel": "Gọi tên",
      "startEmoji": "📣",
      "startStyle": "primary",
      "options": [
        {
          "id": "soft",
          "label": "Tên Êm",
          "emoji": "🕊️",
          "style": "success"
        },
        {
          "id": "broken",
          "label": "Tên Vỡ",
          "emoji": "💔",
          "style": "secondary"
        },
        {
          "id": "hollow",
          "label": "Tên Rỗng",
          "emoji": "🕳️",
          "style": "danger"
        }
      ],
      "rounds": [
        {
          "prompt": "Tên đầu vang êm, không bị tiếng gió cắt ngang.",
          "correctOptionId": "soft",
          "successLine": "Linh hồn phản ứng dịu lại.",
          "failureLine": "Bạn gọi một tiếng vọng giả."
        },
        {
          "prompt": "Tên thứ hai bị vỡ ở âm cuối như người từng quên chính mình.",
          "correctOptionId": "broken",
          "successLine": "Bạn nhận ra phần ký ức bị đứt.",
          "failureLine": "Bạn bỏ qua âm cuối bị vỡ."
        },
        {
          "prompt": "Tên cuối rỗng nhưng kéo dài từ lòng đất.",
          "correctOptionId": "hollow",
          "successLine": "Bạn khép lại tiếng gọi cuối.",
          "failureLine": "Tiếng gọi dội ngược vào ngực bạn."
        }
      ],
      "successNeeded": 2,
      "successText": "Bạn gọi đúng chuỗi tên và giải phóng một linh hồn lạc.",
      "failureText": "Bạn gọi sai, tiếng vọng biến thành áp lực đè nặng.",
      "onSuccess": [
        {
          "type": "soul_shard",
          "amount": 1
        },
        {
          "type": "reputation",
          "amount": 2
        }
      ],
      "onFailure": [
        {
          "type": "damage_percent",
          "min": 6,
          "max": 12
        }
      ],
      "timeoutText": "⏳ Bạn phản ứng quá chậm nên mini game thất bại."
    }
  },
  // EXTRA_50_MIXED_EVENTS_END

  // ZONE2_50_SHRINE_EVENTS_START
  {
    "id": "dd_z2_echo_crack",
    "title": "👁️ Vết Nứt Có Mắt",
    "description": "Một vết nứt trên tường đá mở ra như mí mắt. Nó không nhìn hành lang — nó nhìn thẳng vào ký ức của bạn.",
    "color": 7153881,
    "image": "mysterious",
    "weight": 2,
    "zones": [
      "shrine"
    ],
    "choices": [
      {
        "id": "trace",
        "label": "Đặt tay lên vết nứt",
        "emoji": "✋",
        "style": "primary",
        "outcomes": [
          {
            "chance": 65,
            "text": "Vết nứt lạnh buốt, nhưng để lại một mảnh ký ức có hình con mắt.",
            "actions": [
              {
                "type": "item",
                "itemId": "lost_memory",
                "min": 1,
                "max": 1
              },
              {
                "type": "exp",
                "min": 18,
                "max": 34
              },
              {
                "type": "corruption",
                "amount": 4
              }
            ]
          },
          {
            "chance": 35,
            "text": "Con mắt trong đá chớp một lần. Bạn quên mất vài nhịp thở.",
            "actions": [
              {
                "type": "damage_percent",
                "min": 6,
                "max": 12
              },
              {
                "type": "corruption",
                "amount": 7
              }
            ]
          }
        ]
      },
      {
        "id": "salt",
        "label": "Rắc muối lên mắt đá",
        "emoji": "🧂",
        "style": "success",
        "outcomes": [
          {
            "chance": 100,
            "text": "Muối trắng kéo con mắt khép lại. Một mảnh đá phù văn rơi xuống chân bạn.",
            "actions": [
              {
                "type": "consume_item",
                "itemId": "purifying_salt",
                "amount": 1
              },
              {
                "type": "item",
                "itemId": "shrine_stone",
                "min": 1,
                "max": 2
              },
              {
                "type": "corruption",
                "amount": -8
              },
              {
                "type": "exp",
                "min": 10,
                "max": 18
              }
            ]
          }
        ],
        "requires": {
          "itemId": "purifying_salt"
        }
      },
      {
        "id": "leave",
        "label": "Lùi lại",
        "emoji": "🚪",
        "style": "secondary",
        "outcomes": [
          {
            "chance": 100,
            "text": "Bạn rời khỏi vết nứt trước khi nó học được khuôn mặt mình.",
            "actions": [
              {
                "type": "exp",
                "min": 3,
                "max": 8
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "dd_z2_silver_ash_bowl",
    "title": "⚱️ Bát Tro Bạc",
    "description": "Một bát tro bạc đặt dưới tượng thần mất đầu. Mỗi hạt tro phản chiếu một mảnh trần đền khác nhau.",
    "color": 12105937,
    "image": "altar",
    "weight": 3,
    "zones": [
      "shrine"
    ],
    "choices": [
      {
        "id": "gather",
        "label": "Gom tro bạc",
        "emoji": "⚱️",
        "style": "primary",
        "outcomes": [
          {
            "chance": 75,
            "text": "Bạn gom được tro thánh còn ấm, đủ để dùng trong nghi lễ.",
            "actions": [
              {
                "type": "item",
                "itemId": "holy_ash",
                "min": 1,
                "max": 2
              },
              {
                "type": "exp",
                "min": 8,
                "max": 18
              }
            ]
          },
          {
            "chance": 25,
            "text": "Tro bạc bám vào da như sương độc.",
            "actions": [
              {
                "type": "damage_percent",
                "min": 4,
                "max": 9
              },
              {
                "type": "corruption",
                "amount": 5
              }
            ]
          }
        ]
      },
      {
        "id": "bless",
        "label": "Nhỏ Holy Water",
        "emoji": "💧",
        "style": "success",
        "outcomes": [
          {
            "chance": 100,
            "text": "Nước thánh làm bát tro sáng lên. Một lời cầu cũ được đánh thức.",
            "actions": [
              {
                "type": "consume_item",
                "itemId": "holy_water",
                "amount": 1
              },
              {
                "type": "item",
                "itemId": "holy_ash",
                "min": 2,
                "max": 3
              },
              {
                "type": "reputation",
                "amount": 2
              },
              {
                "type": "corruption",
                "amount": -6
              }
            ]
          }
        ],
        "requires": {
          "itemId": "holy_water"
        }
      }
    ]
  },
  {
    "id": "dd_z2_bell_without_sound",
    "title": "🔔 Chuông Không Tiếng",
    "description": "Một quả chuông đồng treo giữa hành lang, nhưng dây chuông đã mục. Dù vậy, bạn vẫn cảm thấy tiếng ngân trong xương.",
    "color": 12616956,
    "image": "legacy",
    "weight": 2,
    "zones": [
      "shrine"
    ],
    "choices": [
      {
        "id": "touch",
        "label": "Chạm vào chuông",
        "emoji": "🔔",
        "style": "primary",
        "outcomes": [
          {
            "chance": 55,
            "text": "Chuông không vang, nhưng một phù văn hiện trên lòng bàn tay bạn.",
            "actions": [
              {
                "type": "exp",
                "min": 22,
                "max": 42
              },
              {
                "type": "item",
                "itemId": "rune_ink",
                "min": 1,
                "max": 1
              }
            ]
          },
          {
            "chance": 45,
            "text": "Âm thanh không phát ra ngoài mà nổ trong đầu bạn.",
            "actions": [
              {
                "type": "damage_percent",
                "min": 7,
                "max": 13
              },
              {
                "type": "corruption",
                "amount": 5
              }
            ]
          }
        ]
      },
      {
        "id": "bow",
        "label": "Cúi chào rồi đi qua",
        "emoji": "🙏",
        "style": "success",
        "outcomes": [
          {
            "chance": 100,
            "text": "Bạn tôn trọng sự im lặng. Hành lang phía trước bớt lạnh.",
            "actions": [
              {
                "type": "reputation",
                "amount": 1
              },
              {
                "type": "corruption",
                "amount": -3
              },
              {
                "type": "mp_percent",
                "min": 4,
                "max": 10
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "dd_z2_broken_komainu",
    "title": "🗿 Tượng Hộ Pháp Gãy Sừng",
    "description": "Một tượng đá canh cổng bị gãy mất sừng. Dưới chân nó có vết cào mới, như thứ gì đó vừa cố đi qua.",
    "color": 7893356,
    "image": "legacy",
    "weight": 3,
    "zones": [
      "shrine"
    ],
    "requiresCombat": true,
    "choices": [
      {
        "id": "repair",
        "label": "Gắn đá phù văn",
        "emoji": "🧩",
        "style": "success",
        "outcomes": [
          {
            "chance": 100,
            "text": "Bạn đặt mảnh đá vào vết nứt. Tượng hộ pháp cúi đầu rất chậm.",
            "actions": [
              {
                "type": "item",
                "itemId": "shrine_stone",
                "min": 1,
                "max": 1
              },
              {
                "type": "exp",
                "min": 14,
                "max": 28
              },
              {
                "type": "corruption",
                "amount": -4
              }
            ]
          }
        ]
      },
      {
        "id": "challenge",
        "label": "Gõ vào khiên đá",
        "emoji": "🛡️",
        "style": "danger",
        "outcomes": [
          {
            "chance": 100,
            "text": "Tượng đá chuyển động. Bài kiểm tra của hộ pháp bắt đầu.",
            "actions": [
              {
                "type": "combat_random"
              }
            ]
          }
        ]
      },
      {
        "id": "search",
        "label": "Tìm quanh chân tượng",
        "emoji": "🔍",
        "style": "primary",
        "outcomes": [
          {
            "chance": 70,
            "text": "Bạn tìm thấy mảnh thánh tích bị che dưới bụi đá.",
            "actions": [
              {
                "type": "item",
                "itemId": "shrine_relic",
                "min": 1,
                "max": 1
              },
              {
                "type": "gold",
                "min": 12,
                "max": 28
              }
            ]
          },
          {
            "chance": 30,
            "text": "Một con dơi nguyền rít lên từ hốc tượng.",
            "actions": [
              {
                "type": "combat_random"
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "dd_z2_red_thread_hall",
    "title": "🧵 Hành Lang Chỉ Đỏ",
    "description": "Những sợi chỉ đỏ nối từ trần xuống nền đá, mỗi sợi buộc vào một chiếc chuông nhỏ không phát tiếng.",
    "color": 14427686,
    "image": "trap",
    "weight": 2,
    "zones": [
      "shrine"
    ],
    "choices": [
      {
        "id": "crawl",
        "label": "Luồn qua khe chỉ",
        "emoji": "🫥",
        "style": "primary",
        "outcomes": [
          {
            "chance": 65,
            "text": "Bạn luồn qua được và nhặt một mảnh gương dưới nền.",
            "actions": [
              {
                "type": "item",
                "itemId": "mirror_shard",
                "min": 1,
                "max": 1
              },
              {
                "type": "exp",
                "min": 10,
                "max": 18
              }
            ]
          },
          {
            "chance": 35,
            "text": "Một sợi chỉ chạm vai. Chuông câm ngân thẳng vào máu.",
            "actions": [
              {
                "type": "damage_percent",
                "min": 5,
                "max": 11
              },
              {
                "type": "corruption",
                "amount": 4
              }
            ]
          }
        ]
      },
      {
        "id": "cut",
        "label": "Cắt chỉ",
        "emoji": "✂️",
        "style": "danger",
        "outcomes": [
          {
            "chance": 50,
            "text": "Chỉ đứt, để lộ hộp nhỏ giấu sau tường.",
            "actions": [
              {
                "type": "item",
                "itemId": "mysterious_shard",
                "min": 1,
                "max": 1
              },
              {
                "type": "gold",
                "min": 18,
                "max": 44
              }
            ]
          },
          {
            "chance": 50,
            "text": "Tất cả chuông cùng rung, gọi thứ canh đền tỉnh giấc.",
            "actions": [
              {
                "type": "combat_random"
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "dd_z2_moonlit_roof_gap",
    "title": "🌙 Khe Trăng Trên Mái Đền",
    "description": "Một khe nứt trên mái để ánh trăng rơi thành vệt mỏng. Bụi trong vệt sáng bay ngược lên trời.",
    "color": 9684477,
    "image": "spring",
    "weight": 3,
    "zones": [
      "shrine"
    ],
    "choices": [
      {
        "id": "stand",
        "label": "Đứng dưới ánh trăng",
        "emoji": "🌙",
        "style": "success",
        "outcomes": [
          {
            "chance": 70,
            "text": "Ánh trăng rửa sạch hơi lạnh bám trên linh hồn.",
            "actions": [
              {
                "type": "heal_percent",
                "min": 8,
                "max": 16
              },
              {
                "type": "mp_percent",
                "min": 8,
                "max": 16
              },
              {
                "type": "corruption",
                "amount": -5
              }
            ]
          },
          {
            "chance": 30,
            "text": "Ánh trăng chiếu qua bạn như qua một cái bóng rỗng.",
            "actions": [
              {
                "type": "corruption",
                "amount": 6
              },
              {
                "type": "exp",
                "min": 8,
                "max": 16
              }
            ]
          }
        ]
      },
      {
        "id": "bottle",
        "label": "Hứng ánh trăng",
        "emoji": "🫙",
        "style": "primary",
        "outcomes": [
          {
            "chance": 100,
            "text": "Bạn hứng được vài giọt Moonwater trong bình cũ.",
            "actions": [
              {
                "type": "item",
                "itemId": "moonwater",
                "min": 1,
                "max": 1
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "dd_z2_name_scratched_pillar",
    "title": "✍️ Cột Đá Khắc Tên",
    "description": "Một cột đá phủ đầy tên người. Ở gần chân cột, bạn thấy tên mình đang dần hiện ra dù chưa ai khắc.",
    "color": 8266446,
    "image": "mysterious",
    "weight": 2,
    "zones": [
      "shrine"
    ],
    "choices": [
      {
        "id": "scratch",
        "label": "Cạo tên mình đi",
        "emoji": "🪨",
        "style": "primary",
        "outcomes": [
          {
            "chance": 60,
            "text": "Bạn cạo được dòng tên trước khi nó hoàn tất.",
            "actions": [
              {
                "type": "exp",
                "min": 18,
                "max": 36
              },
              {
                "type": "corruption",
                "amount": -3
              }
            ]
          },
          {
            "chance": 40,
            "text": "Cái tên chảy thành mực đen và bám vào tay.",
            "actions": [
              {
                "type": "damage_percent",
                "min": 6,
                "max": 12
              },
              {
                "type": "corruption",
                "amount": 7
              }
            ]
          }
        ]
      },
      {
        "id": "ink",
        "label": "Hứng mực đen",
        "emoji": "🪄",
        "style": "danger",
        "outcomes": [
          {
            "chance": 100,
            "text": "Bạn hứng được thứ mực rune nguy hiểm.",
            "actions": [
              {
                "type": "item",
                "itemId": "rune_ink",
                "min": 1,
                "max": 1
              },
              {
                "type": "corruption",
                "amount": 8
              },
              {
                "type": "reputation",
                "amount": -1
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "dd_z2_child_laugh_echo",
    "title": "👂 Tiếng Cười Trẻ Nhỏ",
    "description": "Tiếng cười trẻ nhỏ vang lên từ phòng thờ bỏ hoang. Mỗi lần bạn quay lại, âm thanh lại đến từ phía trước.",
    "color": 10980346,
    "image": "mysterious",
    "weight": 2,
    "zones": [
      "shrine"
    ],
    "requiresCombat": true,
    "choices": [
      {
        "id": "follow",
        "label": "Đi theo tiếng cười",
        "emoji": "👣",
        "style": "primary",
        "outcomes": [
          {
            "chance": 55,
            "text": "Tiếng cười dẫn bạn đến một túi lễ vật cũ.",
            "actions": [
              {
                "type": "gold",
                "min": 20,
                "max": 48
              },
              {
                "type": "item",
                "itemId": "holy_water",
                "min": 1,
                "max": 1
              }
            ]
          },
          {
            "chance": 45,
            "text": "Tiếng cười biến thành tiếng khóc của quái linh.",
            "actions": [
              {
                "type": "combat_random"
              }
            ]
          }
        ]
      },
      {
        "id": "whisper",
        "label": "Thì thầm lời ru",
        "emoji": "🤫",
        "style": "success",
        "outcomes": [
          {
            "chance": 100,
            "text": "Tiếng cười dịu lại. Có thứ gì đó đặt mảnh ký ức vào tay bạn.",
            "actions": [
              {
                "type": "item",
                "itemId": "lost_memory",
                "min": 1,
                "max": 1
              },
              {
                "type": "reputation",
                "amount": 2
              },
              {
                "type": "corruption",
                "amount": -4
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "dd_z2_bloodless_footprints",
    "title": "👣 Dấu Chân Không Máu",
    "description": "Dấu chân ướt in trên nền đá, nhưng không có nước hay máu. Chúng đi vòng quanh bạn ba lần rồi dừng lại.",
    "color": 4674921,
    "image": "trap",
    "weight": 2,
    "zones": [
      "shrine"
    ],
    "requiresCombat": true,
    "choices": [
      {
        "id": "track",
        "label": "Lần theo dấu chân",
        "emoji": "🔍",
        "style": "primary",
        "outcomes": [
          {
            "chance": 60,
            "text": "Dấu chân dẫn đến một hốc tường chứa đá đền cổ.",
            "actions": [
              {
                "type": "item",
                "itemId": "shrine_stone",
                "min": 1,
                "max": 2
              },
              {
                "type": "exp",
                "min": 10,
                "max": 20
              }
            ]
          },
          {
            "chance": 40,
            "text": "Bạn nhận ra dấu chân đang lần theo chính mình.",
            "actions": [
              {
                "type": "combat_random"
              }
            ]
          }
        ]
      },
      {
        "id": "salt_circle",
        "label": "Rắc muối thành vòng",
        "emoji": "🧂",
        "style": "success",
        "outcomes": [
          {
            "chance": 100,
            "text": "Vòng muối làm dấu chân tan thành hơi trắng.",
            "actions": [
              {
                "type": "consume_item",
                "itemId": "purifying_salt",
                "amount": 1
              },
              {
                "type": "corruption",
                "amount": -10
              },
              {
                "type": "exp",
                "min": 12,
                "max": 22
              }
            ]
          }
        ],
        "requires": {
          "itemId": "purifying_salt"
        }
      }
    ]
  },
  {
    "id": "dd_z2_sutra_moth_swarm",
    "title": "🦋 Bầy Bướm Kinh Văn",
    "description": "Một đàn bướm giấy bay ra từ cuộn kinh mục nát. Trên cánh chúng có những chữ cổ chỉ hiện dưới ánh nến.",
    "color": 16436245,
    "image": "legacy",
    "weight": 3,
    "zones": [
      "shrine"
    ],
    "choices": [
      {
        "id": "catch",
        "label": "Bắt một con bướm",
        "emoji": "🦋",
        "style": "primary",
        "outcomes": [
          {
            "chance": 70,
            "text": "Cánh bướm hóa thành mảnh cổ tự khi chạm vào tay bạn.",
            "actions": [
              {
                "type": "item",
                "itemId": "ancient_book",
                "min": 1,
                "max": 1
              },
              {
                "type": "exp",
                "min": 8,
                "max": 16
              }
            ]
          },
          {
            "chance": 30,
            "text": "Bướm giấy cắt qua da như lưỡi dao mỏng.",
            "actions": [
              {
                "type": "damage_percent",
                "min": 4,
                "max": 8
              }
            ]
          }
        ]
      },
      {
        "id": "let_go",
        "label": "Thả chúng bay",
        "emoji": "🕊️",
        "style": "success",
        "outcomes": [
          {
            "chance": 100,
            "text": "Bầy bướm bay thành hình vòng phong ấn rồi tan biến.",
            "actions": [
              {
                "type": "reputation",
                "amount": 2
              },
              {
                "type": "corruption",
                "amount": -4
              },
              {
                "type": "mp_percent",
                "min": 5,
                "max": 12
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "dd_z2_sealed_well",
    "title": "🕳️ Giếng Phong Ấn",
    "description": "Một miệng giếng bị bịt bằng ba lớp dây bùa. Từ dưới sâu vọng lên tiếng nước chảy dù đền đã khô cạn.",
    "color": 561586,
    "image": "spring",
    "weight": 2,
    "zones": [
      "shrine"
    ],
    "requiresCombat": true,
    "choices": [
      {
        "id": "lower",
        "label": "Thả dây xuống giếng",
        "emoji": "🪢",
        "style": "primary",
        "outcomes": [
          {
            "chance": 55,
            "text": "Bạn kéo lên một bình nước trăng còn nguyên nắp.",
            "actions": [
              {
                "type": "item",
                "itemId": "moonwater",
                "min": 1,
                "max": 1
              },
              {
                "type": "exp",
                "min": 8,
                "max": 14
              }
            ]
          },
          {
            "chance": 45,
            "text": "Thứ kéo dây từ dưới giếng mạnh hơn bạn.",
            "actions": [
              {
                "type": "combat_random"
              }
            ]
          }
        ]
      },
      {
        "id": "seal",
        "label": "Gia cố dây bùa",
        "emoji": "🔒",
        "style": "success",
        "outcomes": [
          {
            "chance": 100,
            "text": "Bạn siết lại phong ấn. Tiếng nước im dần.",
            "actions": [
              {
                "type": "corruption",
                "amount": -7
              },
              {
                "type": "reputation",
                "amount": 2
              },
              {
                "type": "item",
                "itemId": "holy_ash",
                "min": 1,
                "max": 1
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "dd_z2_ceramic_masks",
    "title": "🎭 Mặt Nạ Gốm Trên Tường",
    "description": "Nhiều mặt nạ gốm treo thành hàng. Chỉ có một chiếc quay theo chuyển động của bạn.",
    "color": 16109822,
    "image": "mysterious",
    "weight": 2,
    "zones": [
      "shrine"
    ],
    "choices": [
      {
        "id": "wear",
        "label": "Đeo mặt nạ",
        "emoji": "🎭",
        "style": "danger",
        "outcomes": [
          {
            "chance": 45,
            "text": "Mặt nạ cho bạn thấy lối đi bí mật sau bàn thờ.",
            "actions": [
              {
                "type": "item",
                "itemId": "shrine_relic",
                "min": 1,
                "max": 1
              },
              {
                "type": "exp",
                "min": 20,
                "max": 38
              },
              {
                "type": "corruption",
                "amount": 5
              }
            ]
          },
          {
            "chance": 55,
            "text": "Mặt nạ dính chặt trong vài nhịp thở, hút mất hơi ấm.",
            "actions": [
              {
                "type": "damage_percent",
                "min": 8,
                "max": 14
              },
              {
                "type": "corruption",
                "amount": 7
              }
            ]
          }
        ]
      },
      {
        "id": "turn",
        "label": "Quay mặt nạ vào tường",
        "emoji": "↩️",
        "style": "success",
        "outcomes": [
          {
            "chance": 100,
            "text": "Những mặt nạ thôi nhìn bạn. Một mảnh gốm rơi xuống như lời cảm ơn.",
            "actions": [
              {
                "type": "item",
                "itemId": "mysterious_shard",
                "min": 1,
                "max": 1
              },
              {
                "type": "corruption",
                "amount": -3
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "dd_z2_frozen_prayer_room",
    "title": "❄️ Phòng Cầu Nguyện Đóng Băng",
    "description": "Cả căn phòng bị phủ sương trắng. Trên nền đá, dấu quỳ gối vẫn còn như vừa có người rời đi.",
    "color": 6809849,
    "image": "spring",
    "weight": 2,
    "zones": [
      "shrine"
    ],
    "choices": [
      {
        "id": "kneel",
        "label": "Quỳ vào dấu cũ",
        "emoji": "🙏",
        "style": "primary",
        "outcomes": [
          {
            "chance": 65,
            "text": "Bạn nghe được lời cầu cuối cùng của người canh đền.",
            "actions": [
              {
                "type": "exp",
                "min": 22,
                "max": 40
              },
              {
                "type": "mp_percent",
                "min": 8,
                "max": 18
              },
              {
                "type": "corruption",
                "amount": -2
              }
            ]
          },
          {
            "chance": 35,
            "text": "Lời cầu bị ngắt giữa chừng và biến thành gai lạnh.",
            "actions": [
              {
                "type": "damage_percent",
                "min": 5,
                "max": 10
              },
              {
                "type": "corruption",
                "amount": 4
              }
            ]
          }
        ]
      },
      {
        "id": "water",
        "label": "Rưới Moonwater",
        "emoji": "🌙",
        "style": "success",
        "outcomes": [
          {
            "chance": 100,
            "text": "Sương trắng tan thành ánh trăng mỏng.",
            "actions": [
              {
                "type": "consume_item",
                "itemId": "moonwater",
                "amount": 1
              },
              {
                "type": "heal_percent",
                "min": 12,
                "max": 22
              },
              {
                "type": "corruption",
                "amount": -8
              },
              {
                "type": "reputation",
                "amount": 1
              }
            ]
          }
        ],
        "requires": {
          "itemId": "moonwater"
        }
      }
    ]
  },
  {
    "id": "dd_z2_inverted_torii",
    "title": "⛩️ Cổng Torii Lộn Ngược",
    "description": "Một cổng torii nhỏ mọc ngược từ trần xuống. Bóng của nó trên nền lại đứng đúng chiều.",
    "color": 15680580,
    "image": "altar",
    "weight": 2,
    "zones": [
      "shrine"
    ],
    "requiresCombat": true,
    "choices": [
      {
        "id": "pass_shadow",
        "label": "Đi qua bóng cổng",
        "emoji": "🌑",
        "style": "primary",
        "outcomes": [
          {
            "chance": 60,
            "text": "Bạn bước qua cái bóng và thấy một phòng phụ bị che giấu.",
            "actions": [
              {
                "type": "gold",
                "min": 18,
                "max": 42
              },
              {
                "type": "item",
                "itemId": "mirror_shard",
                "min": 1,
                "max": 1
              }
            ]
          },
          {
            "chance": 40,
            "text": "Cái bóng đóng lại sau lưng bạn, nhốt bạn với hộ vệ đền.",
            "actions": [
              {
                "type": "combat_random"
              }
            ]
          }
        ]
      },
      {
        "id": "pray_gate",
        "label": "Cúi đầu trước cổng",
        "emoji": "🙏",
        "style": "success",
        "outcomes": [
          {
            "chance": 100,
            "text": "Cổng torii rung nhẹ, rồi để rơi một dải bùa cũ.",
            "actions": [
              {
                "type": "item",
                "itemId": "holy_ash",
                "min": 1,
                "max": 1
              },
              {
                "type": "reputation",
                "amount": 2
              },
              {
                "type": "corruption",
                "amount": -3
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "dd_z2_white_snake_relic",
    "title": "🐍 Rắn Trắng Cuộn Quanh Thánh Tích",
    "description": "Một con rắn trắng ngủ quanh hộp thánh tích. Trên lưng nó có hoa văn giống vòng phong ấn.",
    "color": 14870768,
    "image": "chest",
    "weight": 2,
    "zones": [
      "shrine"
    ],
    "choices": [
      {
        "id": "feed",
        "label": "Đặt lễ vật nhỏ",
        "emoji": "🍞",
        "style": "success",
        "outcomes": [
          {
            "chance": 100,
            "text": "Rắn trắng mở mắt, nuốt lễ vật vô hình rồi nhường đường.",
            "actions": [
              {
                "type": "gold",
                "min": -20,
                "max": -20
              },
              {
                "type": "item",
                "itemId": "shrine_relic",
                "min": 1,
                "max": 1
              },
              {
                "type": "corruption",
                "amount": -2
              }
            ]
          }
        ],
        "requires": {
          "gold": 20
        }
      },
      {
        "id": "take",
        "label": "Lấy thánh tích ngay",
        "emoji": "✋",
        "style": "danger",
        "outcomes": [
          {
            "chance": 50,
            "text": "Bạn lấy được thánh tích trước khi rắn thức dậy.",
            "actions": [
              {
                "type": "item",
                "itemId": "shrine_relic",
                "min": 1,
                "max": 1
              },
              {
                "type": "corruption",
                "amount": 4
              }
            ]
          },
          {
            "chance": 50,
            "text": "Rắn trắng cắn vào cổ tay, truyền lời nguyền lạnh.",
            "actions": [
              {
                "type": "damage_percent",
                "min": 7,
                "max": 13
              },
              {
                "type": "corruption",
                "amount": 8
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "dd_z2_ashen_kimono",
    "title": "👘 Áo Lễ Phủ Tro",
    "description": "Một bộ áo lễ treo trong tủ gỗ mục. Tro rơi từ tay áo dù không ai chạm vào.",
    "color": 9741240,
    "image": "legacy",
    "weight": 2,
    "zones": [
      "shrine"
    ],
    "choices": [
      {
        "id": "shake",
        "label": "Phủi tro khỏi áo",
        "emoji": "👘",
        "style": "primary",
        "outcomes": [
          {
            "chance": 70,
            "text": "Tro rơi xuống thành một nắm Holy Ash tinh sạch.",
            "actions": [
              {
                "type": "item",
                "itemId": "holy_ash",
                "min": 1,
                "max": 2
              },
              {
                "type": "exp",
                "min": 8,
                "max": 15
              }
            ]
          },
          {
            "chance": 30,
            "text": "Bàn tay vô hình kéo tay áo lại.",
            "actions": [
              {
                "type": "damage_percent",
                "min": 5,
                "max": 9
              },
              {
                "type": "corruption",
                "amount": 4
              }
            ]
          }
        ]
      },
      {
        "id": "burn",
        "label": "Đốt áo lễ",
        "emoji": "🔥",
        "style": "danger",
        "outcomes": [
          {
            "chance": 50,
            "text": "Áo cháy thành bùa tro, để lại mảnh curse shard.",
            "actions": [
              {
                "type": "item",
                "itemId": "curse_shard",
                "min": 1,
                "max": 1
              },
              {
                "type": "corruption",
                "amount": 5
              }
            ]
          },
          {
            "chance": 50,
            "text": "Khói đen gọi linh hồn chủ cũ tỉnh dậy.",
            "actions": [
              {
                "type": "combat_random"
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "dd_z2_singing_floor_tiles",
    "title": "🎼 Nền Đá Biết Hát",
    "description": "Mỗi bước chân làm một viên đá ngân lên. Một đoạn giai điệu phong ấn còn thiếu nốt cuối.",
    "color": 3718648,
    "image": "mysterious",
    "weight": 2,
    "zones": [
      "shrine"
    ],
    "choices": [
      {
        "id": "hum",
        "label": "Ngân theo giai điệu",
        "emoji": "🎵",
        "style": "primary",
        "outcomes": [
          {
            "chance": 65,
            "text": "Bạn bắt đúng nốt cuối. Nền đá mở ra một hốc nhỏ.",
            "actions": [
              {
                "type": "item",
                "itemId": "mana_crystal",
                "min": 1,
                "max": 1
              },
              {
                "type": "exp",
                "min": 18,
                "max": 32
              }
            ]
          },
          {
            "chance": 35,
            "text": "Bạn lệch nhịp, giai điệu trở thành tiếng rít.",
            "actions": [
              {
                "type": "damage_percent",
                "min": 5,
                "max": 10
              }
            ]
          }
        ]
      },
      {
        "id": "silence",
        "label": "Giữ im lặng",
        "emoji": "🤫",
        "style": "success",
        "outcomes": [
          {
            "chance": 100,
            "text": "Khi bạn im lặng, nền đá tự hoàn thành đoạn nhạc.",
            "actions": [
              {
                "type": "mp_percent",
                "min": 10,
                "max": 20
              },
              {
                "type": "corruption",
                "amount": -3
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "dd_z2_moth_eaten_banner",
    "title": "🏳️ Lá Cờ Bị Mối Ăn",
    "description": "Một lá cờ cũ mang biểu tượng đền cổ. Phần bị mối ăn tạo thành hình con mắt mở nửa chừng.",
    "color": 16498468,
    "image": "legacy",
    "weight": 2,
    "zones": [
      "shrine"
    ],
    "choices": [
      {
        "id": "fold",
        "label": "Gấp cờ lại",
        "emoji": "🏳️",
        "style": "success",
        "outcomes": [
          {
            "chance": 100,
            "text": "Bạn gấp lá cờ theo nghi thức cũ. Một lời chúc phúc yếu ớt còn sót lại.",
            "actions": [
              {
                "type": "reputation",
                "amount": 2
              },
              {
                "type": "heal_percent",
                "min": 6,
                "max": 12
              },
              {
                "type": "corruption",
                "amount": -2
              }
            ]
          }
        ]
      },
      {
        "id": "tear",
        "label": "Xé phần có mắt",
        "emoji": "👁️",
        "style": "danger",
        "outcomes": [
          {
            "chance": 60,
            "text": "Bạn xé được mảnh vải phù văn.",
            "actions": [
              {
                "type": "item",
                "itemId": "mysterious_shard",
                "min": 1,
                "max": 1
              },
              {
                "type": "exp",
                "min": 8,
                "max": 16
              }
            ]
          },
          {
            "chance": 40,
            "text": "Con mắt trên vải chảy thành mực đen.",
            "actions": [
              {
                "type": "corruption",
                "amount": 6
              },
              {
                "type": "damage_percent",
                "min": 4,
                "max": 8
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "dd_z2_hollow_drum",
    "title": "🥁 Trống Rỗng Ruột",
    "description": "Một chiếc trống lễ đã rách mặt, nhưng bên trong vẫn có tiếng tim đập đều đều.",
    "color": 9584654,
    "image": "altar",
    "weight": 2,
    "zones": [
      "shrine"
    ],
    "requiresCombat": true,
    "choices": [
      {
        "id": "beat",
        "label": "Gõ ba nhịp",
        "emoji": "🥁",
        "style": "primary",
        "outcomes": [
          {
            "chance": 55,
            "text": "Ba nhịp trống mở khóa một ngăn bí mật.",
            "actions": [
              {
                "type": "gold",
                "min": 20,
                "max": 55
              },
              {
                "type": "item",
                "itemId": "rune_ink",
                "min": 1,
                "max": 1
              }
            ]
          },
          {
            "chance": 45,
            "text": "Nhịp thứ ba bị thứ gì đó gõ đáp lại từ sau lưng.",
            "actions": [
              {
                "type": "combat_random"
              }
            ]
          }
        ]
      },
      {
        "id": "seal_drum",
        "label": "Niêm phong mặt trống",
        "emoji": "🔒",
        "style": "success",
        "outcomes": [
          {
            "chance": 100,
            "text": "Bạn dùng tro thánh bịt lại mặt trống.",
            "actions": [
              {
                "type": "consume_item",
                "itemId": "holy_ash",
                "amount": 1
              },
              {
                "type": "corruption",
                "amount": -9
              },
              {
                "type": "exp",
                "min": 16,
                "max": 30
              }
            ]
          }
        ],
        "requires": {
          "itemId": "holy_ash"
        }
      }
    ]
  },
  {
    "id": "dd_z2_sunless_garden",
    "title": "🌿 Vườn Không Có Mặt Trời",
    "description": "Một khu vườn nhỏ mọc dưới lòng đền. Lá cây màu bạc, còn rễ thì quấn quanh các mảnh bùa mục.",
    "color": 2278750,
    "image": "spring",
    "weight": 3,
    "zones": [
      "shrine"
    ],
    "choices": [
      {
        "id": "harvest",
        "label": "Hái lá bạc",
        "emoji": "🌿",
        "style": "primary",
        "outcomes": [
          {
            "chance": 75,
            "text": "Lá bạc có thể dùng làm thuốc thanh tẩy nhẹ.",
            "actions": [
              {
                "type": "item",
                "itemId": "purifying_salt",
                "min": 1,
                "max": 1
              },
              {
                "type": "exp",
                "min": 5,
                "max": 12
              }
            ]
          },
          {
            "chance": 25,
            "text": "Rễ cây siết cổ tay bạn như dây bùa sống.",
            "actions": [
              {
                "type": "damage_percent",
                "min": 4,
                "max": 8
              }
            ]
          }
        ]
      },
      {
        "id": "water",
        "label": "Tưới Moonwater",
        "emoji": "🌙",
        "style": "success",
        "outcomes": [
          {
            "chance": 100,
            "text": "Cây bạc rung nhẹ và thả xuống giọt nước trăng mới.",
            "actions": [
              {
                "type": "consume_item",
                "itemId": "moonwater",
                "amount": 1
              },
              {
                "type": "item",
                "itemId": "moonwater",
                "min": 1,
                "max": 1
              },
              {
                "type": "item",
                "itemId": "holy_ash",
                "min": 1,
                "max": 1
              },
              {
                "type": "corruption",
                "amount": -4
              }
            ]
          }
        ],
        "requires": {
          "itemId": "moonwater"
        }
      }
    ]
  },
  {
    "id": "dd_z2_cracked_oracle_eye",
    "title": "🔮 Mắt Tiên Tri Nứt",
    "description": "Một viên thủy tinh lớn nằm trong lòng tượng. Bên trong là hình ảnh bạn đang đứng ở đúng nơi này, chậm hơn vài giây.",
    "color": 9133302,
    "image": "mysterious",
    "weight": 2,
    "zones": [
      "shrine"
    ],
    "choices": [
      {
        "id": "ask",
        "label": "Hỏi về phong ấn",
        "emoji": "❔",
        "style": "primary",
        "outcomes": [
          {
            "chance": 65,
            "text": "Mắt tiên tri cho bạn thấy một đoạn đường an toàn.",
            "actions": [
              {
                "type": "exp",
                "min": 22,
                "max": 44
              },
              {
                "type": "corruption",
                "amount": -2
              }
            ]
          },
          {
            "chance": 35,
            "text": "Hình ảnh trong thủy tinh nhìn ngược lại bạn và mỉm cười.",
            "actions": [
              {
                "type": "corruption",
                "amount": 8
              },
              {
                "type": "damage_percent",
                "min": 4,
                "max": 9
              }
            ]
          }
        ]
      },
      {
        "id": "break_eye",
        "label": "Đập viên mắt",
        "emoji": "🔨",
        "style": "danger",
        "outcomes": [
          {
            "chance": 50,
            "text": "Thủy tinh vỡ, rơi ra mảnh gương lạnh.",
            "actions": [
              {
                "type": "item",
                "itemId": "mirror_shard",
                "min": 1,
                "max": 2
              }
            ]
          },
          {
            "chance": 50,
            "text": "Vết nứt lan vào không khí, gọi bóng canh gương.",
            "actions": [
              {
                "type": "combat_random"
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "dd_z2_ink_black_lotus",
    "title": "🪷 Sen Mực Đen",
    "description": "Một đóa sen đen mọc trong chậu đá khô. Cánh hoa nhỏ mực xuống nền thành các ký tự cấm.",
    "color": 1120295,
    "image": "altar",
    "weight": 2,
    "zones": [
      "shrine"
    ],
    "choices": [
      {
        "id": "collect_ink",
        "label": "Lấy mực sen",
        "emoji": "🪄",
        "style": "primary",
        "outcomes": [
          {
            "chance": 70,
            "text": "Bạn thu được mực rune từ cánh sen.",
            "actions": [
              {
                "type": "item",
                "itemId": "rune_ink",
                "min": 1,
                "max": 1
              },
              {
                "type": "exp",
                "min": 8,
                "max": 16
              }
            ]
          },
          {
            "chance": 30,
            "text": "Mực đen bò ngược lên tay bạn.",
            "actions": [
              {
                "type": "corruption",
                "amount": 6
              },
              {
                "type": "damage_percent",
                "min": 4,
                "max": 9
              }
            ]
          }
        ]
      },
      {
        "id": "purify_lotus",
        "label": "Thanh tẩy bằng Holy Water",
        "emoji": "💧",
        "style": "success",
        "outcomes": [
          {
            "chance": 100,
            "text": "Nước thánh làm đóa sen hóa trắng trong khoảnh khắc.",
            "actions": [
              {
                "type": "consume_item",
                "itemId": "holy_water",
                "amount": 1
              },
              {
                "type": "item",
                "itemId": "holy_ash",
                "min": 1,
                "max": 1
              },
              {
                "type": "corruption",
                "amount": -8
              },
              {
                "type": "reputation",
                "amount": 1
              }
            ]
          }
        ],
        "requires": {
          "itemId": "holy_water"
        }
      }
    ]
  },
  {
    "id": "dd_z2_sleeping_guardian_core",
    "title": "💠 Lõi Hộ Vệ Ngủ Quên",
    "description": "Một lõi đá nhỏ phát sáng dưới đống giáp vỡ. Nó đập nhịp chậm như trái tim của tượng hộ pháp.",
    "color": 6333946,
    "image": "chest",
    "weight": 1,
    "zones": [
      "shrine"
    ],
    "requiresCombat": true,
    "choices": [
      {
        "id": "take_core",
        "label": "Nhấc lõi đá",
        "emoji": "💠",
        "style": "danger",
        "outcomes": [
          {
            "chance": 45,
            "text": "Bạn lấy được lõi đá trước khi nó thức dậy.",
            "actions": [
              {
                "type": "item",
                "itemId": "shrine_stone",
                "min": 2,
                "max": 3
              },
              {
                "type": "corruption",
                "amount": 4
              }
            ]
          },
          {
            "chance": 55,
            "text": "Lõi đá bừng sáng và kéo giáp vỡ đứng dậy.",
            "actions": [
              {
                "type": "combat_random"
              }
            ]
          }
        ]
      },
      {
        "id": "lull",
        "label": "Đọc chú ngủ",
        "emoji": "📜",
        "style": "success",
        "outcomes": [
          {
            "chance": 100,
            "text": "Bạn đọc chú ngủ. Lõi đá dịu xuống và tách ra một mảnh an toàn.",
            "actions": [
              {
                "type": "item",
                "itemId": "shrine_stone",
                "min": 1,
                "max": 1
              },
              {
                "type": "exp",
                "min": 18,
                "max": 30
              },
              {
                "type": "corruption",
                "amount": -3
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "dd_z2_cold_coin_fountain",
    "title": "🪙 Đài Phun Đồng Lạnh",
    "description": "Một đài phun nước khô chứa đầy đồng xu lạnh buốt. Mỗi đồng xu có khắc một lời ước chưa thành.",
    "color": 13938487,
    "image": "spring",
    "weight": 3,
    "zones": [
      "shrine"
    ],
    "choices": [
      {
        "id": "take_coins",
        "label": "Nhặt đồng xu",
        "emoji": "🪙",
        "style": "danger",
        "outcomes": [
          {
            "chance": 60,
            "text": "Bạn nhặt được vài đồng xu cổ còn giá trị.",
            "actions": [
              {
                "type": "gold",
                "min": 25,
                "max": 70
              },
              {
                "type": "corruption",
                "amount": 4
              }
            ]
          },
          {
            "chance": 40,
            "text": "Một lời ước chết bám vào túi bạn.",
            "actions": [
              {
                "type": "damage_percent",
                "min": 4,
                "max": 8
              },
              {
                "type": "corruption",
                "amount": 7
              }
            ]
          }
        ]
      },
      {
        "id": "offer_coin",
        "label": "Đặt lại một đồng xu",
        "emoji": "🙏",
        "style": "success",
        "outcomes": [
          {
            "chance": 100,
            "text": "Bạn trả lại một lời ước cho đài phun. Nước sáng lên một nhịp.",
            "actions": [
              {
                "type": "gold",
                "min": -15,
                "max": -15
              },
              {
                "type": "corruption",
                "amount": -5
              },
              {
                "type": "reputation",
                "amount": 2
              },
              {
                "type": "mp_percent",
                "min": 4,
                "max": 10
              }
            ]
          }
        ],
        "requires": {
          "gold": 15
        }
      }
    ]
  },
  {
    "id": "dd_z2_unfinished_mural",
    "title": "🎨 Bức Họa Chưa Hoàn Tất",
    "description": "Bức tường vẽ cảnh phong ấn Echo Demon, nhưng khuôn mặt con quỷ bị bỏ trống như chờ người tô tiếp.",
    "color": 16347926,
    "image": "legacy",
    "weight": 2,
    "zones": [
      "shrine"
    ],
    "choices": [
      {
        "id": "paint_seal",
        "label": "Tô vòng phong ấn",
        "emoji": "🖌️",
        "style": "primary",
        "outcomes": [
          {
            "chance": 70,
            "text": "Bạn tô lại vòng phong ấn. Bức họa sáng lên vài giây.",
            "actions": [
              {
                "type": "exp",
                "min": 20,
                "max": 38
              },
              {
                "type": "corruption",
                "amount": -4
              }
            ]
          },
          {
            "chance": 30,
            "text": "Màu vẽ chảy thành mắt đen trên tường.",
            "actions": [
              {
                "type": "corruption",
                "amount": 6
              },
              {
                "type": "damage_percent",
                "min": 4,
                "max": 9
              }
            ]
          }
        ]
      },
      {
        "id": "use_ink",
        "label": "Dùng Rune Ink",
        "emoji": "🪄",
        "style": "success",
        "outcomes": [
          {
            "chance": 100,
            "text": "Mực rune hoàn tất nét vẽ bị thiếu. Một cổ tự rơi khỏi tường.",
            "actions": [
              {
                "type": "consume_item",
                "itemId": "rune_ink",
                "amount": 1
              },
              {
                "type": "item",
                "itemId": "ancient_book",
                "min": 1,
                "max": 1
              },
              {
                "type": "exp",
                "min": 16,
                "max": 28
              }
            ]
          }
        ],
        "requires": {
          "itemId": "rune_ink"
        }
      }
    ]
  },
  {
    "id": "dd_z2_silent_monk_bowl",
    "title": "🥣 Bát Của Tu Sĩ Im Lặng",
    "description": "Một chiếc bát gỗ đặt giữa đường. Bên trong không có gì, nhưng khi bạn nhìn kỹ, bóng bạn lại đang bỏ lễ vật vào đó.",
    "color": 7877903,
    "image": "altar",
    "weight": 2,
    "zones": [
      "shrine"
    ],
    "choices": [
      {
        "id": "donate",
        "label": "Bỏ 40 Gold",
        "emoji": "💰",
        "style": "success",
        "outcomes": [
          {
            "chance": 100,
            "text": "Đồng vàng biến mất trước khi chạm đáy bát. Một hơi ấm đáp lại.",
            "actions": [
              {
                "type": "gold",
                "min": -40,
                "max": -40
              },
              {
                "type": "heal_percent",
                "min": 10,
                "max": 18
              },
              {
                "type": "reputation",
                "amount": 2
              },
              {
                "type": "corruption",
                "amount": -3
              }
            ]
          }
        ],
        "requires": {
          "gold": 40
        }
      },
      {
        "id": "steal_shadow",
        "label": "Lấy bóng trong bát",
        "emoji": "🌑",
        "style": "danger",
        "outcomes": [
          {
            "chance": 55,
            "text": "Bạn kéo ra một mảnh ký ức lạc.",
            "actions": [
              {
                "type": "item",
                "itemId": "lost_memory",
                "min": 1,
                "max": 1
              },
              {
                "type": "soul_shard",
                "amount": 1
              },
              {
                "type": "corruption",
                "amount": 8
              }
            ]
          },
          {
            "chance": 45,
            "text": "Bóng của bạn bị kéo dài, đau như vết thương thật.",
            "actions": [
              {
                "type": "damage_percent",
                "min": 8,
                "max": 15
              },
              {
                "type": "corruption",
                "amount": 6
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "dd_z2_torn_seal_rope",
    "title": "🪢 Dây Phong Ấn Bị Xé",
    "description": "Một sợi dây phong ấn treo ngang cửa đã bị xé một nửa. Mép dây vẫn rỉ ra bụi đỏ như máu khô.",
    "color": 12131356,
    "image": "trap",
    "weight": 2,
    "zones": [
      "shrine"
    ],
    "requiresCombat": true,
    "choices": [
      {
        "id": "tie",
        "label": "Buộc lại dây",
        "emoji": "🪢",
        "style": "success",
        "outcomes": [
          {
            "chance": 100,
            "text": "Bạn buộc lại dây phong ấn. Cánh cửa phía sau thôi run rẩy.",
            "actions": [
              {
                "type": "corruption",
                "amount": -6
              },
              {
                "type": "exp",
                "min": 12,
                "max": 24
              },
              {
                "type": "item",
                "itemId": "holy_ash",
                "min": 1,
                "max": 1
              }
            ]
          }
        ]
      },
      {
        "id": "pull",
        "label": "Kéo đứt hoàn toàn",
        "emoji": "💢",
        "style": "danger",
        "outcomes": [
          {
            "chance": 45,
            "text": "Sau cửa là một hòm nhỏ bị bỏ quên.",
            "actions": [
              {
                "type": "gold",
                "min": 30,
                "max": 80
              },
              {
                "type": "item",
                "itemId": "mysterious_shard",
                "min": 1,
                "max": 1
              }
            ]
          },
          {
            "chance": 55,
            "text": "Phong ấn đứt hẳn. Thứ sau cửa lao ra.",
            "actions": [
              {
                "type": "combat_random"
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "dd_z2_mirror_dust_stairs",
    "title": "🪞 Cầu Thang Phủ Bụi Gương",
    "description": "Bậc thang xuống tầng dưới phủ đầy bụi sáng như kính nghiền. Mỗi dấu chân phản chiếu một phiên bản khác của bạn.",
    "color": 12891645,
    "image": "mysterious",
    "weight": 2,
    "zones": [
      "shrine"
    ],
    "choices": [
      {
        "id": "descend",
        "label": "Đi xuống",
        "emoji": "⬇️",
        "style": "primary",
        "outcomes": [
          {
            "chance": 60,
            "text": "Bạn xuống được tầng phụ và nhặt mảnh gương ở chiếu nghỉ.",
            "actions": [
              {
                "type": "item",
                "itemId": "mirror_shard",
                "min": 1,
                "max": 1
              },
              {
                "type": "exp",
                "min": 12,
                "max": 22
              }
            ]
          },
          {
            "chance": 40,
            "text": "Một phiên bản trong bụi gương bước nhanh hơn bạn một nhịp.",
            "actions": [
              {
                "type": "damage_percent",
                "min": 5,
                "max": 10
              },
              {
                "type": "corruption",
                "amount": 5
              }
            ]
          }
        ]
      },
      {
        "id": "scroll",
        "label": "Dùng Scroll of Mirror",
        "emoji": "📜",
        "style": "success",
        "outcomes": [
          {
            "chance": 100,
            "text": "Cuộn phép gom các phản chiếu lại thành một lối đi rõ ràng.",
            "actions": [
              {
                "type": "consume_item",
                "itemId": "scroll_mirror",
                "amount": 1
              },
              {
                "type": "item",
                "itemId": "mirror_shard",
                "min": 2,
                "max": 2
              },
              {
                "type": "corruption",
                "amount": -6
              }
            ]
          }
        ],
        "requires": {
          "itemId": "scroll_mirror"
        }
      }
    ]
  },
  {
    "id": "dd_z2_withered_blessing_tree",
    "title": "🌳 Cây Phước Lành Héo",
    "description": "Một cây nhỏ mọc trong sân đền, cành treo đầy bùa giấy đã ngả vàng. Dưới gốc có tro thánh lẫn đất đen.",
    "color": 6660877,
    "image": "spring",
    "weight": 2,
    "zones": [
      "shrine"
    ],
    "choices": [
      {
        "id": "clean_roots",
        "label": "Dọn gốc cây",
        "emoji": "🌿",
        "style": "success",
        "outcomes": [
          {
            "chance": 100,
            "text": "Bạn gỡ bùa mục và dọn tro đen. Cây rung nhẹ như vừa thở lại.",
            "actions": [
              {
                "type": "item",
                "itemId": "holy_ash",
                "min": 1,
                "max": 1
              },
              {
                "type": "reputation",
                "amount": 2
              },
              {
                "type": "corruption",
                "amount": -5
              }
            ]
          }
        ]
      },
      {
        "id": "take_branch",
        "label": "Bẻ cành khô",
        "emoji": "🪵",
        "style": "danger",
        "outcomes": [
          {
            "chance": 70,
            "text": "Cành khô hóa thành vật liệu rune khi rời cây.",
            "actions": [
              {
                "type": "item",
                "itemId": "rune_ink",
                "min": 1,
                "max": 1
              },
              {
                "type": "exp",
                "min": 8,
                "max": 15
              }
            ]
          },
          {
            "chance": 30,
            "text": "Cây héo rít lên trong tiếng gió không có thật.",
            "actions": [
              {
                "type": "corruption",
                "amount": 6
              },
              {
                "type": "damage_percent",
                "min": 4,
                "max": 8
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "dd_z2_ancient_wardrobe",
    "title": "🚪 Tủ Áo Cổ Bị Niêm Phong",
    "description": "Một tủ áo gỗ đứng đơn độc trong phòng phụ. Từ khe cửa thò ra một dải bùa đã cháy mất nửa chữ.",
    "color": 8736014,
    "image": "chest",
    "weight": 2,
    "zones": [
      "shrine"
    ],
    "requiresCombat": true,
    "choices": [
      {
        "id": "open",
        "label": "Mở tủ",
        "emoji": "🚪",
        "style": "danger",
        "outcomes": [
          {
            "chance": 55,
            "text": "Trong tủ có hộp lễ vật còn nguyên.",
            "actions": [
              {
                "type": "item",
                "itemId": "holy_water",
                "min": 1,
                "max": 1
              },
              {
                "type": "gold",
                "min": 12,
                "max": 34
              }
            ]
          },
          {
            "chance": 45,
            "text": "Bộ áo lễ bên trong tự mặc vào một cái bóng.",
            "actions": [
              {
                "type": "combat_random"
              }
            ]
          }
        ]
      },
      {
        "id": "read_tag",
        "label": "Đọc bùa cháy",
        "emoji": "📜",
        "style": "primary",
        "outcomes": [
          {
            "chance": 100,
            "text": "Bạn đọc phần chữ còn sót lại và ghi nhớ cách khóa tà khí.",
            "actions": [
              {
                "type": "exp",
                "min": 18,
                "max": 34
              },
              {
                "type": "corruption",
                "amount": -2
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "dd_z2_omen_crows_inside",
    "title": "🐦 Quạ Đậu Trong Đền",
    "description": "Ba con quạ đen đậu trên xà ngang dù mọi cửa sổ đều đóng kín. Con giữa ngậm một mảnh giấy trắng.",
    "color": 2042167,
    "image": "mysterious",
    "weight": 2,
    "zones": [
      "shrine"
    ],
    "choices": [
      {
        "id": "take_note",
        "label": "Lấy mảnh giấy",
        "emoji": "📄",
        "style": "primary",
        "outcomes": [
          {
            "chance": 65,
            "text": "Mảnh giấy hiện chữ khi chạm vào tay bạn.",
            "actions": [
              {
                "type": "exp",
                "min": 16,
                "max": 30
              },
              {
                "type": "item",
                "itemId": "lost_memory",
                "min": 1,
                "max": 1
              }
            ]
          },
          {
            "chance": 35,
            "text": "Quạ giữa mổ vào bóng của bạn, đau hơn mổ vào da.",
            "actions": [
              {
                "type": "damage_percent",
                "min": 4,
                "max": 9
              },
              {
                "type": "corruption",
                "amount": 5
              }
            ]
          }
        ]
      },
      {
        "id": "feed_crows",
        "label": "Cho quạ ăn lễ vật",
        "emoji": "🍞",
        "style": "success",
        "outcomes": [
          {
            "chance": 100,
            "text": "Ba con quạ cúi đầu rồi bay xuyên qua mái đền.",
            "actions": [
              {
                "type": "gold",
                "min": -25,
                "max": -25
              },
              {
                "type": "corruption",
                "amount": -5
              },
              {
                "type": "reputation",
                "amount": 2
              }
            ]
          }
        ],
        "requires": {
          "gold": 25
        }
      }
    ]
  },
  {
    "id": "dd_z2_lantern_oil_puddle",
    "title": "🛢️ Vũng Dầu Đèn Xanh",
    "description": "Dầu đèn màu xanh đọng trên nền, không bốc cháy nhưng phản chiếu trần đền như mặt nước sâu.",
    "color": 1357990,
    "image": "altar",
    "weight": 2,
    "zones": [
      "shrine"
    ],
    "choices": [
      {
        "id": "scoop",
        "label": "Múc dầu đèn",
        "emoji": "🛢️",
        "style": "primary",
        "outcomes": [
          {
            "chance": 75,
            "text": "Bạn múc được dầu linh hồn dùng cho nghi lễ nhỏ.",
            "actions": [
              {
                "type": "item",
                "itemId": "rune_ink",
                "min": 1,
                "max": 1
              },
              {
                "type": "mp_percent",
                "min": 4,
                "max": 10
              }
            ]
          },
          {
            "chance": 25,
            "text": "Dầu xanh dính vào tay và lạnh đến tận xương.",
            "actions": [
              {
                "type": "damage_percent",
                "min": 5,
                "max": 9
              }
            ]
          }
        ]
      },
      {
        "id": "ignite",
        "label": "Châm lửa thử",
        "emoji": "🔥",
        "style": "danger",
        "outcomes": [
          {
            "chance": 50,
            "text": "Lửa xanh cháy thành vòng bảo hộ ngắn ngủi.",
            "actions": [
              {
                "type": "heal_percent",
                "min": 8,
                "max": 14
              },
              {
                "type": "corruption",
                "amount": -3
              }
            ]
          },
          {
            "chance": 50,
            "text": "Lửa xanh bùng ngược vào mặt bạn.",
            "actions": [
              {
                "type": "damage_percent",
                "min": 8,
                "max": 14
              },
              {
                "type": "corruption",
                "amount": 4
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "dd_z2_buried_priest_bones",
    "title": "🦴 Xương Tu Sĩ Dưới Sàn",
    "description": "Một mảng gạch lỏng để lộ bộ xương ôm chặt một túi tro. Hộp sọ quay về phía cổng phong ấn.",
    "color": 15067115,
    "image": "legacy",
    "weight": 2,
    "zones": [
      "shrine"
    ],
    "choices": [
      {
        "id": "rebury",
        "label": "Chôn lại tử tế",
        "emoji": "🕯️",
        "style": "success",
        "outcomes": [
          {
            "chance": 100,
            "text": "Bạn chôn lại bộ xương và đọc lời tiễn ngắn.",
            "actions": [
              {
                "type": "reputation",
                "amount": 3
              },
              {
                "type": "item",
                "itemId": "holy_ash",
                "min": 1,
                "max": 1
              },
              {
                "type": "corruption",
                "amount": -6
              }
            ]
          }
        ]
      },
      {
        "id": "take_ash",
        "label": "Lấy túi tro",
        "emoji": "⚱️",
        "style": "danger",
        "outcomes": [
          {
            "chance": 65,
            "text": "Bạn lấy được túi tro thánh.",
            "actions": [
              {
                "type": "item",
                "itemId": "holy_ash",
                "min": 1,
                "max": 2
              },
              {
                "type": "corruption",
                "amount": 3
              }
            ]
          },
          {
            "chance": 35,
            "text": "Xương tay khép lại quanh cổ tay bạn.",
            "actions": [
              {
                "type": "damage_percent",
                "min": 6,
                "max": 12
              },
              {
                "type": "corruption",
                "amount": 6
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "dd_z2_ritual_salt_line",
    "title": "🧂 Đường Muối Đứt Đoạn",
    "description": "Một đường muối trắng chạy quanh phòng tế lễ nhưng bị đứt ở ba điểm. Bóng tối đang rỉ qua những chỗ hở.",
    "color": 16317180,
    "image": "altar",
    "weight": 2,
    "zones": [
      "shrine"
    ],
    "choices": [
      {
        "id": "repair_salt",
        "label": "Vá đường muối",
        "emoji": "🧂",
        "style": "success",
        "outcomes": [
          {
            "chance": 100,
            "text": "Bạn dùng muối thanh tẩy nối lại vòng bảo hộ.",
            "actions": [
              {
                "type": "consume_item",
                "itemId": "purifying_salt",
                "amount": 1
              },
              {
                "type": "corruption",
                "amount": -12
              },
              {
                "type": "reputation",
                "amount": 2
              },
              {
                "type": "exp",
                "min": 10,
                "max": 20
              }
            ]
          }
        ],
        "requires": {
          "itemId": "purifying_salt"
        }
      },
      {
        "id": "step_over",
        "label": "Bước qua đường muối",
        "emoji": "🚶",
        "style": "danger",
        "outcomes": [
          {
            "chance": 60,
            "text": "Bạn vượt qua và thấy một hốc cất lễ vật.",
            "actions": [
              {
                "type": "item",
                "itemId": "shrine_relic",
                "min": 1,
                "max": 1
              },
              {
                "type": "gold",
                "min": 12,
                "max": 30
              }
            ]
          },
          {
            "chance": 40,
            "text": "Bóng tối chạm vào gót chân bạn.",
            "actions": [
              {
                "type": "corruption",
                "amount": 8
              },
              {
                "type": "damage_percent",
                "min": 4,
                "max": 8
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "dd_z2_twisted_incense_smoke",
    "title": "🌫️ Khói Hương Xoắn Ngược",
    "description": "Khói từ ba cây hương đã tắt vẫn cuộn lên trần, rồi rơi ngược xuống như tóc đen.",
    "color": 6583435,
    "image": "altar",
    "weight": 2,
    "zones": [
      "shrine"
    ],
    "choices": [
      {
        "id": "breathe",
        "label": "Hít một hơi",
        "emoji": "🌫️",
        "style": "danger",
        "outcomes": [
          {
            "chance": 50,
            "text": "Bạn thấy ký ức về nghi lễ phong ấn đầu tiên.",
            "actions": [
              {
                "type": "exp",
                "min": 28,
                "max": 52
              },
              {
                "type": "corruption",
                "amount": 6
              }
            ]
          },
          {
            "chance": 50,
            "text": "Khói hương biến thành gai trong phổi.",
            "actions": [
              {
                "type": "damage_percent",
                "min": 7,
                "max": 13
              },
              {
                "type": "corruption",
                "amount": 5
              }
            ]
          }
        ]
      },
      {
        "id": "fan",
        "label": "Quạt khói ra cửa",
        "emoji": "🪭",
        "style": "primary",
        "outcomes": [
          {
            "chance": 100,
            "text": "Bạn dẫn khói ra khỏi phòng. Một mảnh tro sáng còn lại trên bàn.",
            "actions": [
              {
                "type": "item",
                "itemId": "holy_ash",
                "min": 1,
                "max": 1
              },
              {
                "type": "exp",
                "min": 8,
                "max": 16
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "dd_z2_mg_mirror_alignment",
    "title": "🪞 Căn Gương Tam Diện",
    "description": "Ba chiếc gương đen phản chiếu ba hướng khác nhau. Cần xoay đúng hướng để ánh trăng chạm vào cổng phụ.",
    "color": 10980346,
    "image": "mysterious",
    "weight": 2,
    "zones": [
      "shrine"
    ],
    "miniGame": {
      "title": "🪞 Căn Gương",
      "introText": "Xoay đúng gương theo dấu hiệu ở ít nhất 2/3 lượt.",
      "startLabel": "Căn gương",
      "startEmoji": "🪞",
      "startStyle": "primary",
      "options": [
        {
          "id": "left",
          "label": "Gương Trái",
          "emoji": "⬅️",
          "style": "secondary"
        },
        {
          "id": "middle",
          "label": "Gương Giữa",
          "emoji": "⬆️",
          "style": "primary"
        },
        {
          "id": "right",
          "label": "Gương Phải",
          "emoji": "➡️",
          "style": "secondary"
        }
      ],
      "rounds": [
        {
          "prompt": "Vệt trăng chạm mép trái trước.",
          "correctOptionId": "left",
          "successLine": "Gương trái bắt ánh trăng.",
          "failureLine": "Ánh trăng trượt khỏi mặt kính."
        },
        {
          "prompt": "Bóng người trong gương giữa cúi đầu.",
          "correctOptionId": "middle",
          "successLine": "Gương giữa đứng yên.",
          "failureLine": "Bóng người quay đi."
        },
        {
          "prompt": "Vết nứt trên gương phải sáng lên.",
          "correctOptionId": "right",
          "successLine": "Gương phải khóa tia sáng cuối.",
          "failureLine": "Vết nứt lan rộng."
        }
      ],
      "successNeeded": 2,
      "successText": "Ba gương thẳng hàng, ánh trăng mở ra một hốc thánh tích.",
      "failureText": "Gương lệch hướng, bóng tối tràn qua khe nứt.",
      "onSuccess": [
        {
          "type": "item",
          "itemId": "mirror_shard",
          "min": 2,
          "max": 3
        },
        {
          "type": "exp",
          "min": 18,
          "max": 34
        },
        {
          "type": "corruption",
          "amount": -5
        }
      ],
      "onFailure": [
        {
          "type": "damage_percent",
          "min": 5,
          "max": 10
        },
        {
          "type": "corruption",
          "amount": 6
        }
      ],
      "timeoutText": "⏳ Bạn phản ứng quá chậm nên mini game thất bại."
    }
  },
  {
    "id": "dd_z2_mg_candle_breath",
    "title": "🕯️ Giữ Lửa Nến Xanh",
    "description": "Một ngọn nến xanh sắp tắt. Bạn phải điều chỉnh hơi thở để ngọn lửa không bị tiếng vọng nuốt mất.",
    "color": 16436245,
    "image": "altar",
    "weight": 2,
    "zones": [
      "shrine"
    ],
    "miniGame": {
      "title": "🕯️ Giữ Lửa Nến",
      "introText": "Chọn đúng nhịp ở ít nhất 2/3 lượt.",
      "startLabel": "Giữ lửa",
      "startEmoji": "🕯️",
      "startStyle": "primary",
      "options": [
        {
          "id": "slow",
          "label": "Thở Chậm",
          "emoji": "🐢",
          "style": "secondary"
        },
        {
          "id": "hold",
          "label": "Nín Thở",
          "emoji": "🤫",
          "style": "primary"
        },
        {
          "id": "quick",
          "label": "Thở Nhanh",
          "emoji": "💨",
          "style": "danger"
        }
      ],
      "rounds": [
        {
          "prompt": "Lửa rung nhỏ nhưng đều.",
          "correctOptionId": "slow",
          "successLine": "Bạn thở chậm theo nhịp lửa.",
          "failureLine": "Hơi thở làm lửa lệch."
        },
        {
          "prompt": "Tiếng vọng gọi tên bạn ngay sát tai.",
          "correctOptionId": "hold",
          "successLine": "Bạn nín thở, tiếng gọi trôi qua.",
          "failureLine": "Bạn đáp lại bằng hơi thở run."
        },
        {
          "prompt": "Khói xanh tụ lại quá dày.",
          "correctOptionId": "quick",
          "successLine": "Bạn thổi nhanh để tản khói.",
          "failureLine": "Khói xanh bám vào mắt."
        }
      ],
      "successNeeded": 2,
      "successText": "Ngọn nến đứng thẳng. Sáp chảy thành một dấu ấn nhỏ.",
      "failureText": "Ngọn nến tắt phụt, để lại mùi tro lạnh.",
      "onSuccess": [
        {
          "type": "item",
          "itemId": "holy_ash",
          "min": 1,
          "max": 2
        },
        {
          "type": "mp_percent",
          "min": 10,
          "max": 18
        },
        {
          "type": "corruption",
          "amount": -4
        }
      ],
      "onFailure": [
        {
          "type": "corruption",
          "amount": 7
        },
        {
          "type": "damage_percent",
          "min": 4,
          "max": 8
        }
      ],
      "timeoutText": "⏳ Bạn phản ứng quá chậm nên mini game thất bại."
    }
  },
  {
    "id": "dd_z2_mg_salt_circle",
    "title": "🧂 Vòng Muối Nứt",
    "description": "Vòng muối quanh bàn thờ bị nứt ở ba điểm. Bóng tối đang rỉ vào như nước đen.",
    "color": 16317180,
    "image": "altar",
    "weight": 2,
    "zones": [
      "shrine"
    ],
    "miniGame": {
      "title": "🧂 Vá Vòng Muối",
      "introText": "Chọn đúng điểm vá ở ít nhất 2/3 lượt.",
      "startLabel": "Vá vòng",
      "startEmoji": "🧂",
      "startStyle": "primary",
      "options": [
        {
          "id": "north",
          "label": "Điểm Bắc",
          "emoji": "⬆️",
          "style": "primary"
        },
        {
          "id": "east",
          "label": "Điểm Đông",
          "emoji": "➡️",
          "style": "secondary"
        },
        {
          "id": "south",
          "label": "Điểm Nam",
          "emoji": "⬇️",
          "style": "secondary"
        }
      ],
      "rounds": [
        {
          "prompt": "Vết nứt có hơi lạnh thổi từ phía trên bản đồ nghi lễ.",
          "correctOptionId": "north",
          "successLine": "Muối ở điểm Bắc sáng lại.",
          "failureLine": "Bạn vá nhầm điểm im lặng."
        },
        {
          "prompt": "Bóng tối rỉ nhanh nhất về phía chuông đồng.",
          "correctOptionId": "east",
          "successLine": "Điểm Đông khép lại.",
          "failureLine": "Bóng tối trườn qua kẽ hở."
        },
        {
          "prompt": "Tro dưới chân tụ về phía cửa thấp.",
          "correctOptionId": "south",
          "successLine": "Điểm Nam được khóa.",
          "failureLine": "Tro đen phồng lên."
        }
      ],
      "successNeeded": 2,
      "successText": "Vòng muối khép kín, đẩy lùi ô nhiễm linh hồn.",
      "failureText": "Vòng muối vỡ thêm, lời nguyền thoát ra.",
      "onSuccess": [
        {
          "type": "consume_item",
          "itemId": "purifying_salt",
          "amount": 1
        },
        {
          "type": "corruption",
          "amount": -14
        },
        {
          "type": "exp",
          "min": 14,
          "max": 26
        }
      ],
      "onFailure": [
        {
          "type": "corruption",
          "amount": 10
        },
        {
          "type": "damage_percent",
          "min": 4,
          "max": 8
        }
      ],
      "timeoutText": "⏳ Bạn phản ứng quá chậm nên mini game thất bại."
    }
  },
  {
    "id": "dd_z2_mg_echo_names",
    "title": "👁️ Ba Tên Vọng Âm",
    "description": "Ba cái tên vang ra từ sau cửa đá. Chỉ một tên là tiếng vọng thật ở mỗi lượt.",
    "color": 9133302,
    "image": "mysterious",
    "weight": 2,
    "zones": [
      "shrine"
    ],
    "miniGame": {
      "title": "👁️ Nhận Diện Tiếng Vọng",
      "introText": "Chọn đúng tiếng vọng ở ít nhất 2/3 lượt.",
      "startLabel": "Lắng nghe",
      "startEmoji": "👁️",
      "startStyle": "primary",
      "options": [
        {
          "id": "near",
          "label": "Gần",
          "emoji": "👂",
          "style": "primary"
        },
        {
          "id": "far",
          "label": "Xa",
          "emoji": "🌫️",
          "style": "secondary"
        },
        {
          "id": "inside",
          "label": "Trong Đầu",
          "emoji": "🧠",
          "style": "danger"
        }
      ],
      "rounds": [
        {
          "prompt": "Âm đầu tiên vang gần nhưng không có hơi thở.",
          "correctOptionId": "near",
          "successLine": "Bạn nhận ra tiếng gần là thật.",
          "failureLine": "Bạn nghe nhầm tiếng vang phụ."
        },
        {
          "prompt": "Âm thứ hai vọng từ cuối hành lang nhưng bóng lại ở trước mặt.",
          "correctOptionId": "far",
          "successLine": "Bạn chọn đúng tiếng xa.",
          "failureLine": "Bạn nhìn bóng thay vì nghe âm."
        },
        {
          "prompt": "Âm cuối không vang ngoài tai mà xuất hiện trong đầu.",
          "correctOptionId": "inside",
          "successLine": "Bạn khóa đúng tiếng trong đầu.",
          "failureLine": "Nó học thêm một mảnh tên bạn."
        }
      ],
      "successNeeded": 2,
      "successText": "Bạn phân biệt được tiếng vọng thật và nhận lại một mảnh ký ức.",
      "failureText": "Bạn gọi nhầm tiếng vọng giả.",
      "onSuccess": [
        {
          "type": "item",
          "itemId": "lost_memory",
          "min": 1,
          "max": 1
        },
        {
          "type": "exp",
          "min": 20,
          "max": 38
        },
        {
          "type": "corruption",
          "amount": -3
        }
      ],
      "onFailure": [
        {
          "type": "corruption",
          "amount": 9
        },
        {
          "type": "damage_percent",
          "min": 5,
          "max": 10
        }
      ],
      "timeoutText": "⏳ Bạn phản ứng quá chậm nên mini game thất bại."
    }
  },
  {
    "id": "dd_z2_mg_seal_rhythm",
    "title": "🥁 Nhịp Trống Phong Ấn",
    "description": "Chiếc trống rỗng ruột đòi ba nhịp đúng để đánh thức vòng phong ấn cũ.",
    "color": 9584654,
    "image": "altar",
    "weight": 2,
    "zones": [
      "shrine"
    ],
    "miniGame": {
      "title": "🥁 Đánh Nhịp Phong Ấn",
      "introText": "Chọn đúng nhịp ở ít nhất 2/3 lượt.",
      "startLabel": "Đánh trống",
      "startEmoji": "🥁",
      "startStyle": "primary",
      "options": [
        {
          "id": "one",
          "label": "Một Nhịp",
          "emoji": "1️⃣",
          "style": "secondary"
        },
        {
          "id": "two",
          "label": "Hai Nhịp",
          "emoji": "2️⃣",
          "style": "primary"
        },
        {
          "id": "three",
          "label": "Ba Nhịp",
          "emoji": "3️⃣",
          "style": "success"
        }
      ],
      "rounds": [
        {
          "prompt": "Dây bùa rung một lần rồi đứng yên.",
          "correctOptionId": "one",
          "successLine": "Một nhịp khóa dây bùa.",
          "failureLine": "Bạn đánh quá nhiều."
        },
        {
          "prompt": "Hai ngọn nến xanh sáng cùng lúc.",
          "correctOptionId": "two",
          "successLine": "Hai nhịp giữ được lửa.",
          "failureLine": "Nhịp của bạn lệch nến."
        },
        {
          "prompt": "Ba vòng tròn trên trống hiện lên.",
          "correctOptionId": "three",
          "successLine": "Ba nhịp đóng vòng tròn.",
          "failureLine": "Vòng tròn bị bỏ dở."
        }
      ],
      "successNeeded": 2,
      "successText": "Trống ngân không thành tiếng, nhưng phong ấn mạnh lên.",
      "failureText": "Nhịp sai gọi một thứ phía sau tường.",
      "onSuccess": [
        {
          "type": "item",
          "itemId": "shrine_stone",
          "min": 1,
          "max": 2
        },
        {
          "type": "exp",
          "min": 18,
          "max": 32
        },
        {
          "type": "corruption",
          "amount": -4
        }
      ],
      "onFailure": [
        {
          "type": "combat_random"
        }
      ],
      "timeoutText": "⏳ Bạn phản ứng quá chậm nên mini game thất bại."
    }
  },
  {
    "id": "dd_z2_mg_knot_prayer",
    "title": "🪢 Thắt Dây Cầu Nguyện",
    "description": "Dây bùa bị tháo rời thành ba đoạn. Bạn phải thắt lại đúng kiểu để khóa căn phòng.",
    "color": 15680580,
    "image": "legacy",
    "weight": 2,
    "zones": [
      "shrine"
    ],
    "miniGame": {
      "title": "🪢 Thắt Dây Bùa",
      "introText": "Chọn đúng nút thắt ở ít nhất 2/3 lượt.",
      "startLabel": "Thắt dây",
      "startEmoji": "🪢",
      "startStyle": "primary",
      "options": [
        {
          "id": "loop",
          "label": "Vòng",
          "emoji": "➰",
          "style": "secondary"
        },
        {
          "id": "cross",
          "label": "Chéo",
          "emoji": "❌",
          "style": "primary"
        },
        {
          "id": "seal",
          "label": "Khóa",
          "emoji": "🔒",
          "style": "success"
        }
      ],
      "rounds": [
        {
          "prompt": "Đoạn đầu cần tạo vòng để giữ tro.",
          "correctOptionId": "loop",
          "successLine": "Vòng đầu giữ được tro thánh.",
          "failureLine": "Tro rơi khỏi dây."
        },
        {
          "prompt": "Đoạn giữa có hai vệt máu giao nhau.",
          "correctOptionId": "cross",
          "successLine": "Nút chéo khớp dấu cũ.",
          "failureLine": "Dây xoắn sai chiều."
        },
        {
          "prompt": "Đoạn cuối phải khóa bằng lời chú.",
          "correctOptionId": "seal",
          "successLine": "Nút khóa siết lại.",
          "failureLine": "Dây tự nới ra."
        }
      ],
      "successNeeded": 2,
      "successText": "Dây bùa sáng lên và để lại một ít tro thánh.",
      "failureText": "Dây bùa đứt, bóng tối ùa ra.",
      "onSuccess": [
        {
          "type": "item",
          "itemId": "holy_ash",
          "min": 1,
          "max": 1
        },
        {
          "type": "reputation",
          "amount": 2
        },
        {
          "type": "corruption",
          "amount": -5
        }
      ],
      "onFailure": [
        {
          "type": "corruption",
          "amount": 8
        },
        {
          "type": "damage_percent",
          "min": 4,
          "max": 9
        }
      ],
      "timeoutText": "⏳ Bạn phản ứng quá chậm nên mini game thất bại."
    }
  },
  {
    "id": "dd_z2_mg_black_lotus_pulse",
    "title": "🪷 Mạch Sen Đen",
    "description": "Đóa sen mực đen nở theo nhịp lạ. Chọn đúng cánh hoa để lấy mực mà không đánh thức lời nguyền.",
    "color": 1120295,
    "image": "altar",
    "weight": 2,
    "zones": [
      "shrine"
    ],
    "miniGame": {
      "title": "🪷 Hái Cánh Sen",
      "introText": "Chọn đúng cánh ở ít nhất 2/3 lượt.",
      "startLabel": "Hái sen",
      "startEmoji": "🪷",
      "startStyle": "primary",
      "options": [
        {
          "id": "cold",
          "label": "Cánh Lạnh",
          "emoji": "❄️",
          "style": "secondary"
        },
        {
          "id": "warm",
          "label": "Cánh Ấm",
          "emoji": "🔥",
          "style": "primary"
        },
        {
          "id": "silent",
          "label": "Cánh Im",
          "emoji": "🤫",
          "style": "success"
        }
      ],
      "rounds": [
        {
          "prompt": "Cánh lạnh không nhỏ mực.",
          "correctOptionId": "cold",
          "successLine": "Bạn lấy đúng cánh an toàn.",
          "failureLine": "Bạn chạm vào cánh có gai mực."
        },
        {
          "prompt": "Cánh ấm đập theo nhịp tim.",
          "correctOptionId": "warm",
          "successLine": "Bạn cắt đúng lúc cánh mở.",
          "failureLine": "Mực nóng bắn vào tay."
        },
        {
          "prompt": "Cánh im lặng không phản chiếu bóng bạn.",
          "correctOptionId": "silent",
          "successLine": "Bạn nhận ra cánh thật.",
          "failureLine": "Bạn bị bóng giả lừa."
        }
      ],
      "successNeeded": 2,
      "successText": "Bạn thu được mực rune sạch từ sen đen.",
      "failureText": "Sen đen khép lại và phun mực nguyền.",
      "onSuccess": [
        {
          "type": "item",
          "itemId": "rune_ink",
          "min": 1,
          "max": 2
        },
        {
          "type": "exp",
          "min": 14,
          "max": 26
        }
      ],
      "onFailure": [
        {
          "type": "corruption",
          "amount": 7
        },
        {
          "type": "damage_percent",
          "min": 4,
          "max": 9
        }
      ],
      "timeoutText": "⏳ Bạn phản ứng quá chậm nên mini game thất bại."
    }
  },
  {
    "id": "dd_z2_mg_tile_steps",
    "title": "🎼 Bước Trên Nền Hát",
    "description": "Nền đá ngân lên theo bước chân. Nếu bước đúng chuỗi, cửa phụ sẽ mở.",
    "color": 3718648,
    "image": "mysterious",
    "weight": 2,
    "zones": [
      "shrine"
    ],
    "miniGame": {
      "title": "🎼 Bước Đúng Nhịp",
      "introText": "Chọn đúng ô đá ở ít nhất 2/3 lượt.",
      "startLabel": "Bắt đầu bước",
      "startEmoji": "🎼",
      "startStyle": "primary",
      "options": [
        {
          "id": "white",
          "label": "Ô Trắng",
          "emoji": "⬜",
          "style": "secondary"
        },
        {
          "id": "black",
          "label": "Ô Đen",
          "emoji": "⬛",
          "style": "danger"
        },
        {
          "id": "blue",
          "label": "Ô Xanh",
          "emoji": "🟦",
          "style": "primary"
        }
      ],
      "rounds": [
        {
          "prompt": "Nốt đầu trong trẻo như chuông bạc.",
          "correctOptionId": "white",
          "successLine": "Ô trắng ngân đúng nốt.",
          "failureLine": "Nốt đầu bị đục."
        },
        {
          "prompt": "Nốt giữa trầm và tối.",
          "correctOptionId": "black",
          "successLine": "Ô đen giữ nhịp trầm.",
          "failureLine": "Bạn bước sai cao độ."
        },
        {
          "prompt": "Nốt cuối có ánh xanh trên mép đá.",
          "correctOptionId": "blue",
          "successLine": "Ô xanh khóa đoạn nhạc.",
          "failureLine": "Giai điệu vỡ ở nốt cuối."
        }
      ],
      "successNeeded": 2,
      "successText": "Cửa phụ mở ra, để lộ vật liệu nghi lễ.",
      "failureText": "Nền đá im bặt rồi phản chấn lên chân bạn.",
      "onSuccess": [
        {
          "type": "item",
          "itemId": "mana_crystal",
          "min": 1,
          "max": 1
        },
        {
          "type": "item",
          "itemId": "shrine_stone",
          "min": 1,
          "max": 1
        },
        {
          "type": "exp",
          "min": 12,
          "max": 24
        }
      ],
      "onFailure": [
        {
          "type": "damage_percent",
          "min": 5,
          "max": 11
        }
      ],
      "timeoutText": "⏳ Bạn phản ứng quá chậm nên mini game thất bại."
    }
  },
  {
    "id": "dd_z2_mg_spirit_ferry",
    "title": "🛶 Đưa Linh Hồn Qua Hồ Cạn",
    "description": "Một linh hồn đứng trước hồ đá cạn, chờ bạn chọn đúng hướng gió để đưa nó rời khỏi đền.",
    "color": 6333946,
    "image": "spring",
    "weight": 2,
    "zones": [
      "shrine"
    ],
    "miniGame": {
      "title": "🛶 Dẫn Hồn Qua Hồ",
      "introText": "Chọn đúng hướng ở ít nhất 2/3 lượt.",
      "startLabel": "Dẫn hồn",
      "startEmoji": "🛶",
      "startStyle": "primary",
      "options": [
        {
          "id": "north",
          "label": "Gió Bắc",
          "emoji": "⬆️",
          "style": "secondary"
        },
        {
          "id": "west",
          "label": "Gió Tây",
          "emoji": "⬅️",
          "style": "primary"
        },
        {
          "id": "moon",
          "label": "Ánh Trăng",
          "emoji": "🌙",
          "style": "success"
        }
      ],
      "rounds": [
        {
          "prompt": "Tro trên mặt hồ bay về phía Bắc.",
          "correctOptionId": "north",
          "successLine": "Bạn theo đúng luồng tro.",
          "failureLine": "Tro xoáy ngược lại."
        },
        {
          "prompt": "Tiếng chuông chìm từ phía Tây.",
          "correctOptionId": "west",
          "successLine": "Bạn bắt đúng hướng chuông.",
          "failureLine": "Bạn nghe nhầm tiếng nước."
        },
        {
          "prompt": "Bóng linh hồn chỉ rõ về vệt trăng.",
          "correctOptionId": "moon",
          "successLine": "Ánh trăng mở lối cuối.",
          "failureLine": "Linh hồn lạc khỏi vệt sáng."
        }
      ],
      "successNeeded": 2,
      "successText": "Linh hồn qua được hồ, để lại lời chúc phúc.",
      "failureText": "Linh hồn tan vào sương lạnh.",
      "onSuccess": [
        {
          "type": "reputation",
          "amount": 3
        },
        {
          "type": "item",
          "itemId": "holy_water",
          "min": 1,
          "max": 1
        },
        {
          "type": "corruption",
          "amount": -6
        }
      ],
      "onFailure": [
        {
          "type": "corruption",
          "amount": 5
        },
        {
          "type": "damage_percent",
          "min": 3,
          "max": 7
        }
      ],
      "timeoutText": "⏳ Bạn phản ứng quá chậm nên mini game thất bại."
    }
  },
  {
    "id": "dd_z2_mg_reliquary_locks",
    "title": "🔐 Ba Khóa Thánh Tích",
    "description": "Một hộp thánh tích có ba ổ khóa cổ. Mỗi ổ khóa phản ứng với một dấu hiệu khác nhau.",
    "color": 14251782,
    "image": "chest",
    "weight": 2,
    "zones": [
      "shrine"
    ],
    "miniGame": {
      "title": "🔐 Mở Khóa Thánh Tích",
      "introText": "Chọn đúng khóa ở ít nhất 2/3 lượt.",
      "startLabel": "Mở khóa",
      "startEmoji": "🔐",
      "startStyle": "primary",
      "options": [
        {
          "id": "ash",
          "label": "Khóa Tro",
          "emoji": "⚱️",
          "style": "secondary"
        },
        {
          "id": "moon",
          "label": "Khóa Trăng",
          "emoji": "🌙",
          "style": "primary"
        },
        {
          "id": "mirror",
          "label": "Khóa Gương",
          "emoji": "🪞",
          "style": "success"
        }
      ],
      "rounds": [
        {
          "prompt": "Ổ đầu có bụi tro sáng quanh rìa.",
          "correctOptionId": "ash",
          "successLine": "Khóa Tro mở ra.",
          "failureLine": "Bụi tro tắt phụt."
        },
        {
          "prompt": "Ổ thứ hai lạnh như nước đêm.",
          "correctOptionId": "moon",
          "successLine": "Khóa Trăng xoay nhẹ.",
          "failureLine": "Hơi lạnh cắn ngón tay."
        },
        {
          "prompt": "Ổ cuối phản chiếu bạn không chớp mắt.",
          "correctOptionId": "mirror",
          "successLine": "Khóa Gương chịu mở.",
          "failureLine": "Phản chiếu nhe răng cười."
        }
      ],
      "successNeeded": 2,
      "successText": "Hộp mở ra, còn giữ thánh tích nhỏ.",
      "failureText": "Hộp khóa chặt và phóng bùa phản vệ.",
      "onSuccess": [
        {
          "type": "item",
          "itemId": "shrine_relic",
          "min": 1,
          "max": 1
        },
        {
          "type": "item",
          "itemId": "ancient_seal",
          "min": 1,
          "max": 1
        },
        {
          "type": "exp",
          "min": 12,
          "max": 22
        }
      ],
      "onFailure": [
        {
          "type": "damage_percent",
          "min": 6,
          "max": 12
        },
        {
          "type": "corruption",
          "amount": 5
        }
      ],
      "timeoutText": "⏳ Bạn phản ứng quá chậm nên mini game thất bại."
    }
  },
  {
    "id": "dd_z2_mg_demon_whisper_filter",
    "title": "📣 Lọc Tiếng Quỷ",
    "description": "Echo Demon thả ba tiếng thì thầm qua khe cửa. Bạn phải nhận ra tiếng nào là mồi nhử.",
    "color": 8141549,
    "image": "mysterious",
    "weight": 2,
    "zones": [
      "shrine"
    ],
    "miniGame": {
      "title": "📣 Lọc Tiếng Thì Thầm",
      "introText": "Chọn đúng phản ứng ở ít nhất 2/3 lượt.",
      "startLabel": "Lọc âm",
      "startEmoji": "📣",
      "startStyle": "primary",
      "options": [
        {
          "id": "answer",
          "label": "Đáp Lại",
          "emoji": "🗣️",
          "style": "danger"
        },
        {
          "id": "silence",
          "label": "Im Lặng",
          "emoji": "🤫",
          "style": "success"
        },
        {
          "id": "salt",
          "label": "Rắc Muối",
          "emoji": "🧂",
          "style": "primary"
        }
      ],
      "rounds": [
        {
          "prompt": "Tiếng đầu gọi đúng tên bạn.",
          "correctOptionId": "silence",
          "successLine": "Bạn im lặng, nó không học thêm gì.",
          "failureLine": "Bạn để nó lấy thêm âm giọng."
        },
        {
          "prompt": "Tiếng thứ hai bò sát nền đá.",
          "correctOptionId": "salt",
          "successLine": "Muối làm âm thanh tan ra.",
          "failureLine": "Tiếng vọng len qua kẽ muối."
        },
        {
          "prompt": "Tiếng cuối giả làm đồng đội cầu cứu.",
          "correctOptionId": "silence",
          "successLine": "Bạn nhận ra đó là mồi nhử.",
          "failureLine": "Bạn suýt đáp lại tiếng giả."
        }
      ],
      "successNeeded": 2,
      "successText": "Bạn lọc được lời quỷ, cổng phong ấn yếu đi một chút.",
      "failureText": "Bạn bị tiếng quỷ đánh dấu.",
      "onSuccess": [
        {
          "type": "exp",
          "min": 22,
          "max": 40
        },
        {
          "type": "corruption",
          "amount": -5
        },
        {
          "type": "item",
          "itemId": "curse_shard",
          "min": 1,
          "max": 1
        }
      ],
      "onFailure": [
        {
          "type": "corruption",
          "amount": 10
        },
        {
          "type": "damage_percent",
          "min": 5,
          "max": 11
        }
      ],
      "timeoutText": "⏳ Bạn phản ứng quá chậm nên mini game thất bại."
    }
  },
  {
    "id": "dd_z2_mg_offering_scale",
    "title": "⚖️ Cân Lễ Vật Cũ",
    "description": "Chiếc cân đá đòi bạn đặt đúng thứ tự lễ vật vô hình: ký ức, tro và ánh trăng.",
    "color": 16436245,
    "image": "altar",
    "weight": 2,
    "zones": [
      "shrine"
    ],
    "miniGame": {
      "title": "⚖️ Cân Lễ Vật",
      "introText": "Chọn đúng lễ vật ở ít nhất 2/3 lượt.",
      "startLabel": "Cân lễ",
      "startEmoji": "⚖️",
      "startStyle": "primary",
      "options": [
        {
          "id": "memory",
          "label": "Ký Ức",
          "emoji": "🧠",
          "style": "secondary"
        },
        {
          "id": "ash",
          "label": "Tro",
          "emoji": "⚱️",
          "style": "primary"
        },
        {
          "id": "moon",
          "label": "Ánh Trăng",
          "emoji": "🌙",
          "style": "success"
        }
      ],
      "rounds": [
        {
          "prompt": "Đĩa cân bên trái khắc hình con mắt.",
          "correctOptionId": "memory",
          "successLine": "Ký ức làm cân cân bằng.",
          "failureLine": "Cân nghiêng về bóng tối."
        },
        {
          "prompt": "Đĩa cân giữa phủ bụi bạc.",
          "correctOptionId": "ash",
          "successLine": "Tro bạc nằm đúng chỗ.",
          "failureLine": "Tro rơi qua kẽ đá."
        },
        {
          "prompt": "Đĩa cân cuối có vết trăng non.",
          "correctOptionId": "moon",
          "successLine": "Ánh trăng khóa nghi lễ.",
          "failureLine": "Ánh trăng bị nuốt mất."
        }
      ],
      "successNeeded": 2,
      "successText": "Cân đá cân bằng, trả lại phần thưởng nhỏ.",
      "failureText": "Cân đá đổ nghiêng, lời nguyền tràn ra.",
      "onSuccess": [
        {
          "type": "item",
          "itemId": "holy_ash",
          "min": 1,
          "max": 1
        },
        {
          "type": "item",
          "itemId": "moonwater",
          "min": 1,
          "max": 1
        },
        {
          "type": "exp",
          "min": 14,
          "max": 26
        }
      ],
      "onFailure": [
        {
          "type": "corruption",
          "amount": 7
        },
        {
          "type": "damage_percent",
          "min": 5,
          "max": 10
        }
      ],
      "timeoutText": "⏳ Bạn phản ứng quá chậm nên mini game thất bại."
    }
  },
  {
    "id": "dd_z2_mg_sigil_drawing",
    "title": "✍️ Vẽ Lại Phù Ấn",
    "description": "Một vòng phù ấn trên sàn đã mờ. Bạn phải vẽ lại đúng nét để nó không biến thành cổng nguyền.",
    "color": 8490232,
    "image": "altar",
    "weight": 2,
    "zones": [
      "shrine"
    ],
    "miniGame": {
      "title": "✍️ Vẽ Phù Ấn",
      "introText": "Chọn đúng nét ở ít nhất 2/3 lượt.",
      "startLabel": "Vẽ ấn",
      "startEmoji": "✍️",
      "startStyle": "primary",
      "options": [
        {
          "id": "circle",
          "label": "Vòng Tròn",
          "emoji": "⭕",
          "style": "primary"
        },
        {
          "id": "slash",
          "label": "Nét Chém",
          "emoji": "➖",
          "style": "secondary"
        },
        {
          "id": "eye",
          "label": "Mắt",
          "emoji": "👁️",
          "style": "danger"
        }
      ],
      "rounds": [
        {
          "prompt": "Nét mở đầu bao lấy vùng tro.",
          "correctOptionId": "circle",
          "successLine": "Vòng tròn khép đúng chỗ.",
          "failureLine": "Vòng bị méo."
        },
        {
          "prompt": "Nét thứ hai cắt qua đường nứt.",
          "correctOptionId": "slash",
          "successLine": "Nét chém khóa kẽ nứt.",
          "failureLine": "Nét chém lệch khỏi vết nứt."
        },
        {
          "prompt": "Nét cuối là con mắt bị khép.",
          "correctOptionId": "eye",
          "successLine": "Mắt khép lại.",
          "failureLine": "Mắt mở to hơn."
        }
      ],
      "successNeeded": 2,
      "successText": "Phù ấn sáng lại, để rơi một mảnh cổ tự.",
      "failureText": "Phù ấn biến dạng và cắn ngược vào tay bạn.",
      "onSuccess": [
        {
          "type": "item",
          "itemId": "ancient_book",
          "min": 1,
          "max": 1
        },
        {
          "type": "exp",
          "min": 16,
          "max": 30
        },
        {
          "type": "corruption",
          "amount": -4
        }
      ],
      "onFailure": [
        {
          "type": "damage_percent",
          "min": 6,
          "max": 12
        },
        {
          "type": "corruption",
          "amount": 6
        }
      ],
      "timeoutText": "⏳ Bạn phản ứng quá chậm nên mini game thất bại."
    }
  },
  {
    "id": "dd_z2_mg_bone_chimes",
    "title": "💀 Chuông Xương",
    "description": "Ba mảnh xương treo trên dây bùa. Gió không thổi, nhưng chúng vẫn rung theo câu hỏi của đền.",
    "color": 15067115,
    "image": "legacy",
    "weight": 2,
    "zones": [
      "shrine"
    ],
    "miniGame": {
      "title": "💀 Chọn Chuông Xương",
      "introText": "Chọn đúng mảnh xương ở ít nhất 2/3 lượt.",
      "startLabel": "Nghe chuông",
      "startEmoji": "💀",
      "startStyle": "primary",
      "options": [
        {
          "id": "finger",
          "label": "Xương Tay",
          "emoji": "✋",
          "style": "secondary"
        },
        {
          "id": "rib",
          "label": "Xương Sườn",
          "emoji": "🦴",
          "style": "primary"
        },
        {
          "id": "skull",
          "label": "Hộp Sọ",
          "emoji": "💀",
          "style": "danger"
        }
      ],
      "rounds": [
        {
          "prompt": "Âm đầu nhỏ như tiếng gõ cửa.",
          "correctOptionId": "finger",
          "successLine": "Xương tay rung đúng âm.",
          "failureLine": "Bạn chọn âm quá nặng."
        },
        {
          "prompt": "Âm giữa vang từ lồng ngực rỗng.",
          "correctOptionId": "rib",
          "successLine": "Xương sườn ngân đúng nhịp.",
          "failureLine": "Nhịp bị lệch."
        },
        {
          "prompt": "Âm cuối thì thầm từ hộp sọ.",
          "correctOptionId": "skull",
          "successLine": "Hộp sọ khép miệng.",
          "failureLine": "Nó cười thành tiếng."
        }
      ],
      "successNeeded": 2,
      "successText": "Chuông xương dịu lại, thả xuống tro thánh.",
      "failureText": "Chuông xương ré lên, gọi bóng chết.",
      "onSuccess": [
        {
          "type": "item",
          "itemId": "holy_ash",
          "min": 1,
          "max": 1
        },
        {
          "type": "soul_shard",
          "amount": 1
        },
        {
          "type": "corruption",
          "amount": -2
        }
      ],
      "onFailure": [
        {
          "type": "combat_random"
        }
      ],
      "timeoutText": "⏳ Bạn phản ứng quá chậm nên mini game thất bại."
    }
  },
  {
    "id": "dd_z2_mg_shadow_lantern_path",
    "title": "🏮 Lối Đèn Bóng",
    "description": "Một dãy đèn tạo ra ba cái bóng khác nhau. Chọn đúng bóng để đi qua hành lang mà không đánh thức hộ vệ.",
    "color": 16096779,
    "image": "altar",
    "weight": 2,
    "zones": [
      "shrine"
    ],
    "miniGame": {
      "title": "🏮 Đi Theo Bóng Đèn",
      "introText": "Chọn đúng bóng ở ít nhất 2/3 lượt.",
      "startLabel": "Đi theo",
      "startEmoji": "🏮",
      "startStyle": "primary",
      "options": [
        {
          "id": "short",
          "label": "Bóng Ngắn",
          "emoji": "➖",
          "style": "secondary"
        },
        {
          "id": "long",
          "label": "Bóng Dài",
          "emoji": "〰️",
          "style": "danger"
        },
        {
          "id": "broken",
          "label": "Bóng Đứt",
          "emoji": "💔",
          "style": "primary"
        }
      ],
      "rounds": [
        {
          "prompt": "Bóng đầu ngắn dù đèn ở xa.",
          "correctOptionId": "short",
          "successLine": "Bạn theo bóng ngắn an toàn.",
          "failureLine": "Bạn theo bóng giả."
        },
        {
          "prompt": "Bóng thứ hai kéo dài về cửa cấm.",
          "correctOptionId": "long",
          "successLine": "Bạn nhận ra hướng thử thách.",
          "failureLine": "Bóng dài quấn chân bạn."
        },
        {
          "prompt": "Bóng cuối bị đứt ở giữa nền đá.",
          "correctOptionId": "broken",
          "successLine": "Bạn bước qua đoạn đứt đúng lúc.",
          "failureLine": "Bạn đạp lên kẽ nứt."
        }
      ],
      "successNeeded": 2,
      "successText": "Bạn vượt qua lối đèn và tìm được vật liệu cũ.",
      "failureText": "Đèn tắt cùng lúc, bóng tối cắn vào chân bạn.",
      "onSuccess": [
        {
          "type": "item",
          "itemId": "shrine_stone",
          "min": 1,
          "max": 1
        },
        {
          "type": "item",
          "itemId": "mirror_shard",
          "min": 1,
          "max": 1
        },
        {
          "type": "exp",
          "min": 10,
          "max": 20
        }
      ],
      "onFailure": [
        {
          "type": "damage_percent",
          "min": 5,
          "max": 10
        },
        {
          "type": "corruption",
          "amount": 4
        }
      ],
      "timeoutText": "⏳ Bạn phản ứng quá chậm nên mini game thất bại."
    }
  },

  // ZONE2_SPECIAL_MINIGAMES_START
  {
    id: 'dd_z2_special_blue_candle_vigil',
    title: '🕯️ Canh Lửa Nến Xanh',
    description: 'Bạn gặp một bệ đá có ngọn nến xanh đang thở từng nhịp. Nếu giữ được lửa qua ba dấu hiệu, đền cổ sẽ để lại tro thánh.',
    color: 0xF59E0B,
    image: 'altar',
    weight: 3,
    zones: ['shrine'],
    miniGame: {
      title: '🕯️ Giữ Lửa Nến Xanh',
      introText: 'Đây là mini game canh dấu hiệu. Mỗi lượt hãy đọc hiện tượng của ngọn nến rồi chọn hành động hợp lý.',
      startLabel: 'Bắt đầu canh lửa',
      startEmoji: '🕯️',
      startStyle: 'primary',
      options: [
        { id: 'shield', label: 'Che Gió', emoji: '🛡️', style: 'primary' },
        { id: 'salt', label: 'Rắc Muối', emoji: '🧂', style: 'success' },
        { id: 'silence', label: 'Giữ Im Lặng', emoji: '🤫', style: 'secondary' },
        { id: 'chant', label: 'Đọc Chú Văn', emoji: '📜', style: 'primary' },
      ],
      rounds: [
        { prompt: 'Ngọn nến nghiêng mạnh như có gió lùa từ khe cửa đá.', correctOptionId: 'shield', successLine: 'Bạn che gió đúng lúc, lửa xanh đứng thẳng trở lại.', failureLine: 'Lửa xanh bị gió đẩy lệch khỏi bấc.' },
        { prompt: 'Sáp nến chuyển sang màu đen và bò xuống bệ đá như mực sống.', correctOptionId: 'salt', successLine: 'Muối thanh tẩy làm sáp đen đông lại.', failureLine: 'Sáp đen chạm vào tay bạn, lạnh như lời nguyền.' },
        { prompt: 'Tiếng vọng gọi tên bạn từ trong ngọn lửa.', correctOptionId: 'silence', successLine: 'Bạn không đáp lại. Tiếng gọi mất đường bám.', failureLine: 'Một hơi thở vô thức khiến tiếng vọng học được nhịp của bạn.' },
        { prompt: 'Chữ cổ quanh bệ đá sáng lên rồi tắt dần.', correctOptionId: 'chant', successLine: 'Chú văn nối lại vòng chữ cổ.', failureLine: 'Chữ cổ vỡ thành tàn lửa.' },
      ],
      successNeeded: 3,
      successText: 'Ngọn nến cháy ổn định đến cuối nghi lễ. Tro thánh rơi xuống như tuyết mỏng.',
      failureText: 'Ngọn nến phụt tắt. Căn phòng tối đi và tiếng vọng cười rất khẽ.',
      onSuccess: [{ type: 'item', itemId: 'holy_ash', min: 2, max: 3 }, { type: 'mp_percent', min: 10, max: 18 }, { type: 'corruption', amount: -8 }, { type: 'exp', min: 18, max: 34 }],
      onFailure: [{ type: 'corruption', amount: 8 }, { type: 'damage_percent', min: 5, max: 10 }, { type: 'exp', min: 8, max: 14 }],
      timeoutText: '⏳ Bạn chần chừ quá lâu. Ngọn nến tắt trước khi nghi lễ bắt đầu.',
    },
  },
  {
    id: 'dd_z2_special_mirror_memory_sequence',
    title: '🪞 Gương Phản Chiếu Sai Lệch',
    description: 'Một chiếc gương đen chiếu ra chuỗi biểu tượng rồi lập tức xóa sạch. Bạn phải nhớ lại thứ tự mà chiếc gương vừa nói dối.',
    color: 0x7C3AED,
    image: 'mysterious',
    weight: 3,
    zones: ['shrine'],
    miniGame: {
      title: '🪞 Ghi Nhớ Ảnh Gương',
      introText: 'Gương sẽ đưa ra từng đoạn ký ức. Chọn biểu tượng đúng theo dấu hiệu, sai quá nhiều sẽ làm tăng Corruption.',
      startLabel: 'Nhìn vào gương',
      startEmoji: '🪞',
      startStyle: 'primary',
      options: [
        { id: 'candle', label: 'Nến', emoji: '🕯️', style: 'secondary' },
        { id: 'mirror', label: 'Gương', emoji: '🪞', style: 'primary' },
        { id: 'salt', label: 'Muối', emoji: '🧂', style: 'success' },
        { id: 'eye', label: 'Mắt', emoji: '👁️', style: 'danger' },
      ],
      rounds: [
        { prompt: 'Chuỗi phản chiếu hiện ra: 🕯️ → 🪞 → 🧂. Biểu tượng đầu tiên là gì?', correctOptionId: 'candle', successLine: 'Bạn giữ được biểu tượng nến trong trí nhớ.', failureLine: 'Hình phản chiếu cười khi bạn nhớ sai biểu tượng đầu.' },
        { prompt: 'Chuỗi phản chiếu hiện ra: 👁️ → 🧂 → 🪞. Biểu tượng cuối cùng là gì?', correctOptionId: 'mirror', successLine: 'Bạn bắt đúng điểm kết của chuỗi gương.', failureLine: 'Mặt kính đổi chỗ biểu tượng cuối.' },
        { prompt: 'Chuỗi phản chiếu hiện ra: 🧂 → 🕯️ → 👁️. Biểu tượng ở giữa là gì?', correctOptionId: 'candle', successLine: 'Bạn không để gương tráo ký ức giữa chuỗi.', failureLine: 'Ký ức giữa chuỗi bị bẻ cong.' },
        { prompt: 'Chuỗi phản chiếu hiện ra: 🪞 → 👁️ → 🧂. Biểu tượng nào khóa lời nguyền?', correctOptionId: 'salt', successLine: 'Muối hiện đúng lúc, lời nguyền tắt tiếng.', failureLine: 'Bạn chọn nhầm thứ chỉ phản chiếu lời nguyền.' },
      ],
      successNeeded: 3,
      successText: 'Mặt gương trong lại. Một mảnh kính đen rơi xuống tay bạn mà không cắt da.',
      failureText: 'Gương ghi nhớ sai lầm của bạn và trả lại một tiếng cười méo mó.',
      onSuccess: [{ type: 'item', itemId: 'mirror_shard', min: 2, max: 3 }, { type: 'item', itemId: 'scroll_mirror', min: 1, max: 1 }, { type: 'exp', min: 20, max: 38 }],
      onFailure: [{ type: 'corruption', amount: 10 }, { type: 'damage_percent', min: 5, max: 11 }],
      timeoutText: '⏳ Ký hiệu tan khỏi mặt kính. Bạn không còn nhớ chuỗi ban đầu.',
    },
  },
  {
    id: 'dd_z2_special_seal_bell_timing',
    title: '🔔 Chuông Phong Ấn',
    description: 'Một chiếc chuông đồng treo giữa hành lang không có gió. Nó chỉ được gõ khi âm vang tự tìm đúng nhịp.',
    color: 0xD97706,
    image: 'altar',
    weight: 3,
    zones: ['shrine'],
    miniGame: {
      title: '🔔 Canh Nhịp Chuông',
      introText: 'Không phải lúc nào cũng được gõ. Hãy chọn đúng thời điểm khi chuông đạt nhịp phong ấn.',
      startLabel: 'Đứng chờ nhịp',
      startEmoji: '🔔',
      startStyle: 'primary',
      options: [
        { id: 'wait', label: 'Chờ', emoji: '⏳', style: 'secondary' },
        { id: 'strike', label: 'Gõ Chuông', emoji: '🔔', style: 'primary' },
        { id: 'mute', label: 'Giữ Chuông', emoji: '🤫', style: 'success' },
      ],
      rounds: [
        { prompt: 'Chuông im phăng phắc. Không khí quanh nó còn chưa rung.', correctOptionId: 'wait', successLine: 'Bạn chờ đúng nhịp đầu.', failureLine: 'Bạn làm âm vang lệch trước khi nó thành hình.' },
        { prompt: 'Miệng chuông sáng lên một vòng mỏng. Đây là nhịp đẹp nhất.', correctOptionId: 'strike', successLine: 'Tiếng chuông vang sạch, mở một lớp phong ấn.', failureLine: 'Bạn bỏ lỡ khoảnh khắc chuông sáng.' },
        { prompt: 'Chuông rung méo tiếng, như có thứ bên trong muốn hét.', correctOptionId: 'mute', successLine: 'Bạn giữ chuông lại trước khi tiếng hét thoát ra.', failureLine: 'Tiếng méo xé qua tai bạn.' },
        { prompt: 'Âm vang trở lại đúng một nhịp, ngắn và trong.', correctOptionId: 'strike', successLine: 'Bạn gõ nhịp cuối, hành lang lặng xuống.', failureLine: 'Nhịp cuối trôi qua không được khóa.' },
      ],
      successNeeded: 3,
      successText: 'Chuông phong ấn ngân ba nhịp trọn vẹn. Một thánh tích nhỏ rơi khỏi dây treo.',
      failureText: 'Chuông vang sai nhịp, gọi về một luồng lạnh từ dưới nền đá.',
      onSuccess: [{ type: 'item', itemId: 'shrine_relic', min: 1, max: 1 }, { type: 'item', itemId: 'ancient_seal', min: 1, max: 1 }, { type: 'corruption', amount: -5 }, { type: 'exp', min: 22, max: 42 }],
      onFailure: [{ type: 'corruption', amount: 9 }, { type: 'damage_percent', min: 6, max: 12 }],
      timeoutText: '⏳ Nhịp chuông tắt dần. Cơ hội gõ đúng đã qua.',
    },
  },
  {
    id: 'dd_z2_special_salt_circle_repair',
    title: '🧂 Vòng Muối Đứt Đoạn',
    description: 'Một vòng muối trắng bao quanh bàn thờ, nhưng bốn điểm đã bị gió đen xóa mất. Bạn phải vá đúng loại vết nứt.',
    color: 0xE5E7EB,
    image: 'altar',
    weight: 3,
    zones: ['shrine'],
    miniGame: {
      title: '🧂 Sửa Vòng Phong Ấn',
      introText: 'Mỗi vết hỏng cần một cách xử lý khác nhau. Chọn đúng để đẩy lùi Corruption.',
      startLabel: 'Kiểm tra vòng muối',
      startEmoji: '🧂',
      startStyle: 'success',
      options: [
        { id: 'salt', label: 'Rắc Muối', emoji: '🧂', style: 'success' },
        { id: 'moonwater', label: 'Rửa Bằng Moonwater', emoji: '🌙', style: 'primary' },
        { id: 'candle', label: 'Đặt Nến', emoji: '🕯️', style: 'secondary' },
        { id: 'leave', label: 'Không Đụng', emoji: '🚶', style: 'secondary' },
      ],
      rounds: [
        { prompt: 'Đoạn phía Bắc bị vỡ thành khoảng trống sạch.', correctOptionId: 'salt', successLine: 'Muối mới khớp vào đường vỡ.', failureLine: 'Vết vỡ không cần thứ bạn vừa dùng.' },
        { prompt: 'Đoạn phía Đông chuyển đen và chảy như mực.', correctOptionId: 'moonwater', successLine: 'Moonwater rửa sạch mảng đen.', failureLine: 'Mực đen lan rộng hơn.' },
        { prompt: 'Đoạn phía Nam lạnh đến mức muối đóng băng.', correctOptionId: 'candle', successLine: 'Nến làm băng tan mà không phá vòng.', failureLine: 'Lạnh buốt ăn sâu vào vòng muối.' },
        { prompt: 'Đoạn phía Tây vẫn ổn định và sáng nhẹ.', correctOptionId: 'leave', successLine: 'Bạn không chạm vào phần còn ổn.', failureLine: 'Bạn sửa nhầm điểm đang hoạt động.' },
      ],
      successNeeded: 3,
      successText: 'Vòng muối liền lại. Bóng tối bị ép khỏi bàn thờ như khói tan.',
      failureText: 'Vòng muối vỡ thêm một đoạn, để tiếng vọng chui qua.',
      onSuccess: [{ type: 'item', itemId: 'purifying_salt', min: 1, max: 2 }, { type: 'corruption', amount: -16 }, { type: 'exp', min: 18, max: 34 }],
      onFailure: [{ type: 'corruption', amount: 12 }, { type: 'damage_percent', min: 4, max: 9 }],
      timeoutText: '⏳ Bạn đứng quá lâu. Vòng muối tự vỡ thêm một đoạn.',
    },
  },
  {
    id: 'dd_z2_special_true_echo_filter',
    title: '👁️ Lọc Tiếng Vọng',
    description: 'Ba giọng nói vang ra từ sau cửa đá. Có giọng dẫn đường, có giọng muốn học tên bạn, và có giọng chỉ lặp lại nỗi sợ.',
    color: 0x4C1D95,
    image: 'mysterious',
    weight: 3,
    zones: ['shrine'],
    miniGame: {
      title: '👁️ Chọn Giọng An Toàn',
      introText: 'Quy tắc: giọng an toàn không gọi tên bạn, không bảo bạn chạm vào gương, và thường khuyên im lặng.',
      startLabel: 'Lắng nghe ba giọng',
      startEmoji: '👂',
      startStyle: 'primary',
      options: [
        { id: 'leave', label: '“Rời khỏi đây.”', emoji: '🚪', style: 'secondary' },
        { id: 'touch', label: '“Chạm vào gương.”', emoji: '🪞', style: 'danger' },
        { id: 'silent', label: '“Đừng trả lời nó.”', emoji: '🤫', style: 'success' },
        { id: 'name', label: '“Ta biết tên ngươi.”', emoji: '👁️', style: 'danger' },
      ],
      rounds: [
        { prompt: 'Giọng thứ nhất nói rất nhỏ: “Đừng trả lời nó.”', correctOptionId: 'silent', successLine: 'Bạn chọn giọng biết giữ im lặng.', failureLine: 'Bạn nghe theo tiếng vọng thích gọi tên.' },
        { prompt: 'Giọng thứ hai đẩy bạn lùi khỏi cánh cửa: “Rời khỏi đây.”', correctOptionId: 'leave', successLine: 'Bạn nhận ra lời cảnh báo thật.', failureLine: 'Bạn bỏ qua lời cảnh báo.' },
        { prompt: 'Giọng thứ ba thì thầm: “Chạm vào gương, nó sẽ mở đường.”', correctOptionId: 'touch', successLine: 'Bạn nhận diện được bẫy gương và khóa nó lại.', failureLine: 'Gương bắt được sự chú ý của bạn.' },
        { prompt: 'Giọng cuối cùng nói: “Ta biết tên ngươi.”', correctOptionId: 'name', successLine: 'Bạn nhận diện đúng giọng nguyền và không đáp lại.', failureLine: 'Tên của bạn vang lên trong hành lang.' },
      ],
      successNeeded: 3,
      successText: 'Bạn tách được giọng thật khỏi tiếng quỷ. Một mảnh ký ức rơi ra khỏi tường đá.',
      failureText: 'Tiếng vọng trộn vào giọng của bạn. Đền cổ nhớ bạn rõ hơn.',
      onSuccess: [{ type: 'item', itemId: 'lost_memory', min: 1, max: 1 }, { type: 'item', itemId: 'echo_core', min: 1, max: 1 }, { type: 'corruption', amount: -6 }, { type: 'exp', min: 20, max: 40 }],
      onFailure: [{ type: 'corruption', amount: 12 }, { type: 'mp_percent', min: 1, max: 3 }],
      timeoutText: '⏳ Các giọng hòa vào nhau. Bạn không còn phân biệt được giọng nào là thật.',
    },
  },
  {
    id: 'dd_z2_special_soul_lake_crossing',
    title: '🛶 Dẫn Hồn Qua Hồ',
    description: 'Một linh hồn nhỏ đứng bên hồ đen, không nhớ đường sang bờ nến xanh. Nó sẽ đi theo lựa chọn của bạn.',
    color: 0x60A5FA,
    image: 'spring',
    weight: 3,
    zones: ['shrine'],
    miniGame: {
      title: '🛶 Dẫn Hồn Qua Hồ',
      introText: 'Dẫn linh hồn qua ba đoạn hồ. Đừng đi theo tiếng gọi hoặc bóng phản chiếu sai.',
      startLabel: 'Dẫn hồn',
      startEmoji: '🛶',
      startStyle: 'primary',
      options: [
        { id: 'candle', label: 'Theo Ánh Nến', emoji: '🕯️', style: 'success' },
        { id: 'reflection', label: 'Theo Bóng Nước', emoji: '🪞', style: 'danger' },
        { id: 'voice', label: 'Theo Tiếng Gọi', emoji: '👂', style: 'danger' },
        { id: 'still', label: 'Đứng Yên', emoji: '🤫', style: 'secondary' },
      ],
      rounds: [
        { prompt: 'Sương mù che kín mặt hồ, chỉ còn một ngọn nến xanh ở xa.', correctOptionId: 'candle', successLine: 'Linh hồn đi theo ánh nến và không lạc.', failureLine: 'Bóng nước kéo linh hồn lệch khỏi bờ.' },
        { prompt: 'Mặt nước phản chiếu một con đường quá đẹp, quá thẳng.', correctOptionId: 'still', successLine: 'Bạn đứng yên cho đến khi phản chiếu giả tan đi.', failureLine: 'Bạn tin vào con đường trong nước.' },
        { prompt: 'Một giọng thân quen gọi từ phía sau: “Lối này.”', correctOptionId: 'candle', successLine: 'Bạn bỏ qua tiếng gọi và tiếp tục theo nến.', failureLine: 'Tiếng gọi kéo linh hồn quay đầu.' },
        { prompt: 'Bờ nến xanh đã gần, nhưng mặt hồ bỗng im lặng tuyệt đối.', correctOptionId: 'still', successLine: 'Bạn chờ mặt hồ thở lại rồi mới bước tiếp.', failureLine: 'Bạn vội bước vào khoảng im lặng.' },
      ],
      successNeeded: 3,
      successText: 'Linh hồn sang được bờ bên kia. Nó cúi đầu, để lại một cây nến nhỏ và tro thánh.',
      failureText: 'Linh hồn tan vào mặt hồ. Nước đen dâng lên tận mắt cá chân bạn.',
      onSuccess: [{ type: 'item', itemId: 'soul_candle', min: 1, max: 1 }, { type: 'item', itemId: 'holy_ash', min: 1, max: 2 }, { type: 'reputation', amount: 3 }, { type: 'corruption', amount: -10 }],
      onFailure: [{ type: 'corruption', amount: 10 }, { type: 'combat_random' }],
      timeoutText: '⏳ Linh hồn chờ quá lâu rồi tan thành đốm sáng trên mặt hồ.',
    },
  },
  {
    id: 'dd_z2_special_stone_seal_carving',
    title: '🗿 Khắc Lại Ấn Đá',
    description: 'Một phiến đá hộ vệ mất gần hết phù văn. Nếu khắc lại đúng thứ tự, Ấn Đá sẽ yếu đi trước khi Broken Guardian xuất hiện.',
    color: 0x78716C,
    image: 'altar',
    weight: 3,
    zones: ['shrine'],
    miniGame: {
      title: '🗿 Khắc Phù Văn Đá',
      introText: 'Chọn đúng nét khắc theo vết mờ trên phiến đá. Đây là mini game chuẩn bị cho Ấn Đá.',
      startLabel: 'Bắt đầu khắc',
      startEmoji: '🗿',
      startStyle: 'primary',
      options: [
        { id: 'stone', label: 'Dấu Đá', emoji: '🗿', style: 'secondary' },
        { id: 'candle', label: 'Dấu Nến', emoji: '🕯️', style: 'primary' },
        { id: 'mirror', label: 'Dấu Gương', emoji: '🪞', style: 'success' },
        { id: 'eye', label: 'Dấu Mắt', emoji: '👁️', style: 'danger' },
      ],
      rounds: [
        { prompt: 'Nét đầu nặng như chân tượng hộ vệ.', correctOptionId: 'stone', successLine: 'Dấu Đá ăn sâu vào phiến đá.', failureLine: 'Phiến đá rung lên vì nét sai.' },
        { prompt: 'Nét thứ hai cần ánh lửa để không nứt.', correctOptionId: 'candle', successLine: 'Dấu Nến giữ vết khắc không vỡ.', failureLine: 'Vết khắc rạn thêm một đường.' },
        { prompt: 'Nét cuối phải phản chiếu lại vết nứt.', correctOptionId: 'mirror', successLine: 'Dấu Gương khóa vết nứt cuối.', failureLine: 'Vết nứt phản chiếu ngược vào bạn.' },
      ],
      successNeeded: 2,
      successText: 'Ấn Đá sáng lên. Bạn nhặt được đá đền và cảm thấy hộ vệ cổ yếu đi đôi chút.',
      failureText: 'Phiến đá vỡ một góc. Tiếng bước chân hộ vệ vang lên gần hơn.',
      onSuccess: [{ type: 'item', itemId: 'shrine_stone', min: 2, max: 3 }, { type: 'exp', min: 16, max: 30 }, { type: 'corruption', amount: -3 }],
      onFailure: [{ type: 'corruption', amount: 6 }, { type: 'combat_random' }],
      timeoutText: '⏳ Phù văn nguội đi. Phiến đá không còn nhận nét khắc.',
    },
  },
  {
    id: 'dd_z2_special_ceramic_mask_trial',
    title: '🎭 Mặt Nạ Gốm Biết Cười',
    description: 'Bốn mặt nạ gốm treo trên tường. Chúng đổi cảm xúc mỗi khi bạn chớp mắt, nhưng chỉ một chiếc nói thật.',
    color: 0xB45309,
    image: 'mysterious',
    weight: 3,
    zones: ['shrine'],
    miniGame: {
      title: '🎭 Chọn Mặt Nạ Thật',
      introText: 'Đền cổ để lại gợi ý: mặt nạ thật không phô cảm xúc, không dụ dỗ và không khóc thay bạn.',
      startLabel: 'Quan sát mặt nạ',
      startEmoji: '🎭',
      startStyle: 'primary',
      options: [
        { id: 'smile', label: 'Cười', emoji: '🙂', style: 'danger' },
        { id: 'cry', label: 'Khóc', emoji: '😢', style: 'secondary' },
        { id: 'silent', label: 'Im Lặng', emoji: '😐', style: 'success' },
        { id: 'anger', label: 'Giận Dữ', emoji: '😠', style: 'danger' },
      ],
      rounds: [
        { prompt: 'Một mặt nạ cười trước khi bạn hỏi.', correctOptionId: 'silent', successLine: 'Bạn không tin nụ cười quá sớm.', failureLine: 'Nụ cười giả dính vào khóe miệng bạn.' },
        { prompt: 'Một mặt nạ khóc bằng giọng của người quen.', correctOptionId: 'silent', successLine: 'Bạn nhận ra nước mắt vay mượn.', failureLine: 'Nước mắt gốm rơi xuống tay bạn.' },
        { prompt: 'Một mặt nạ im lặng dù cả tường đang thì thầm.', correctOptionId: 'silent', successLine: 'Bạn chọn đúng chiếc không bị tiếng vọng chi phối.', failureLine: 'Bạn bỏ qua sự im lặng thật.' },
      ],
      successNeeded: 2,
      successText: 'Mặt nạ im lặng rơi xuống, để lộ một ngăn giấu sau tường.',
      failureText: 'Các mặt nạ cười cùng lúc. Một lời nguyền bám vào sau gáy bạn.',
      onSuccess: [{ type: 'item', itemId: 'ancient_seal', min: 1, max: 1 }, { type: 'gold', min: 25, max: 55 }, { type: 'exp', min: 18, max: 34 }],
      onFailure: [{ type: 'corruption', amount: 8 }, { type: 'damage_percent', min: 4, max: 9 }],
      timeoutText: '⏳ Mặt nạ đổi chỗ quá nhanh. Bạn không kịp chọn chiếc thật.',
    },
  },
  {
    id: 'dd_z2_special_lantern_shadow_path',
    title: '🏮 Lối Đèn Bóng Lệch',
    description: 'Hành lang phía trước có ba lối, mỗi lối treo một chiếc đèn. Ánh sáng không chỉ đường — bóng mới là thứ cần đọc.',
    color: 0xF97316,
    image: 'altar',
    weight: 3,
    zones: ['shrine'],
    miniGame: {
      title: '🏮 Đọc Bóng Đèn',
      introText: 'Đi qua ba đoạn hành lang. Đèn xanh không luôn an toàn; hãy đọc dấu hiệu của bóng.',
      startLabel: 'Bước vào hành lang',
      startEmoji: '🏮',
      startStyle: 'primary',
      options: [
        { id: 'green', label: 'Đèn Xanh', emoji: '🟢', style: 'success' },
        { id: 'white', label: 'Đèn Trắng', emoji: '⚪', style: 'secondary' },
        { id: 'dark', label: 'Đèn Tắt', emoji: '⚫', style: 'danger' },
        { id: 'broken', label: 'Bóng Đứt', emoji: '💔', style: 'primary' },
      ],
      rounds: [
        { prompt: 'Lối trái có đèn xanh, nhưng bóng của nó kéo ngược về sau.', correctOptionId: 'broken', successLine: 'Bạn đi theo bóng đứt, không theo màu đèn.', failureLine: 'Màu xanh chỉ là mồi nhử.' },
        { prompt: 'Lối giữa có đèn trắng, bóng đứng yên dưới chân.', correctOptionId: 'white', successLine: 'Bóng đứng yên nghĩa là lối ổn định.', failureLine: 'Bạn bỏ qua lối ổn định duy nhất.' },
        { prompt: 'Lối phải tắt đèn, nhưng không có bóng nào ở đó.', correctOptionId: 'dark', successLine: 'Không bóng nghĩa là không có thứ gì bám theo.', failureLine: 'Bạn bước vào lối có bóng chờ sẵn.' },
        { prompt: 'Ở cuối hành lang, một bóng bị cắt ngang bởi vết nứt.', correctOptionId: 'broken', successLine: 'Bạn nhảy qua phần bóng bị cắt.', failureLine: 'Bóng nắm lấy gót chân bạn.' },
      ],
      successNeeded: 3,
      successText: 'Bạn vượt qua hành lang đèn bóng và tìm được lối phụ chứa vật liệu cổ.',
      failureText: 'Đèn tắt cùng lúc. Hành lang cắn vào bước chân bạn.',
      onSuccess: [{ type: 'item', itemId: 'mirror_shard', min: 1, max: 2 }, { type: 'item', itemId: 'shrine_relic', min: 1, max: 1 }, { type: 'exp', min: 18, max: 34 }],
      onFailure: [{ type: 'damage_percent', min: 6, max: 12 }, { type: 'corruption', amount: 8 }],
      timeoutText: '⏳ Đèn đổi màu quá nhanh. Bạn buộc phải quay lại.',
    },
  },
  {
    id: 'dd_z2_special_ancient_tablet_riddle',
    title: '📜 Bia Đá Cổ Không Bóng',
    description: 'Một bia đá không hắt bóng dưới ánh nến. Trên mặt đá có câu hỏi cũ, như thể nó đã chờ người đọc hàng trăm năm.',
    color: 0x8B5CF6,
    image: 'altar',
    weight: 3,
    zones: ['shrine'],
    miniGame: {
      title: '📜 Giải Bia Đá Cổ',
      introText: 'Chọn đáp án đúng cho các câu đố ngắn của đền. Câu trả lời nằm trong theme Zone 2: tiếng vọng, gương, bóng và muối.',
      startLabel: 'Đọc bia đá',
      startEmoji: '📜',
      startStyle: 'primary',
      options: [
        { id: 'fire', label: 'Lửa', emoji: '🔥', style: 'danger' },
        { id: 'shadow', label: 'Bóng', emoji: '🌑', style: 'primary' },
        { id: 'mirror', label: 'Gương', emoji: '🪞', style: 'secondary' },
        { id: 'salt', label: 'Muối', emoji: '🧂', style: 'success' },
      ],
      rounds: [
        { prompt: '“Không phải ánh sáng mở cửa, mà là thứ còn lại sau khi ánh sáng tắt.”', correctOptionId: 'shadow', successLine: 'Bia đá nhận câu trả lời: Bóng.', failureLine: 'Ánh sáng trên bia đá tắt phụt.' },
        { prompt: '“Thứ nói bằng giọng của ngươi, nhưng không có linh hồn.”', correctOptionId: 'mirror', successLine: 'Mặt gương trên bia đá khép lại.', failureLine: 'Tiếng vọng mượn giọng bạn.' },
        { prompt: '“Thứ không giết quỷ, nhưng khiến quỷ không bước qua.”', correctOptionId: 'salt', successLine: 'Một vòng muối hiện quanh chân bia.', failureLine: 'Vòng muối bị xóa đi.' },
        { prompt: '“Thứ cháy càng lâu càng để lộ bóng tối.”', correctOptionId: 'fire', successLine: 'Ngọn lửa xanh lóe lên đúng nhịp.', failureLine: 'Lửa xanh cháy ngược vào chữ cổ.' },
      ],
      successNeeded: 3,
      successText: 'Bia đá mở ra một khe nhỏ. Cổ thư và kinh nghiệm nghi lễ nằm bên trong.',
      failureText: 'Bia đá khép lại. Một phần câu đố khắc ngược lên da tay bạn.',
      onSuccess: [{ type: 'item', itemId: 'ancient_book', min: 1, max: 1 }, { type: 'item', itemId: 'ancient_seal', min: 1, max: 1 }, { type: 'exp', min: 24, max: 46 }, { type: 'corruption', amount: -4 }],
      onFailure: [{ type: 'damage_percent', min: 5, max: 10 }, { type: 'corruption', amount: 7 }, { type: 'exp', min: 8, max: 16 }],
      timeoutText: '⏳ Chữ cổ chạy khỏi mặt bia. Câu hỏi khép lại.',
    },
  },
  // ZONE2_SPECIAL_MINIGAMES_END

  // ZONE2_50_SHRINE_EVENTS_END

] as const;
