export interface EventChainStep {
  id: string;
  desc: string;
  match: { type?: string; zoneId?: string; includes?: string };
}

export interface EventChainReward {
  gold?: number;
  exp?: number;
  titleId?: string;
  itemId?: string;
  itemQty?: number;
}

export interface EventChainDef {
  id: string;
  name: string;
  icon: string;
  description: string;
  steps: EventChainStep[];
  reward: EventChainReward;
}

export const EVENT_CHAINS: EventChainDef[] = [
  {
    id: 'merchant_road',
    name: 'Đường Hàng Ashveil',
    icon: '🚚',
    description: 'Chuỗi câu chuyện về đoàn thương nhân đi qua vùng nguy hiểm.',
    steps: [
      { id: 'save_caravan', desc: 'Giải cứu hoặc hộ tống một đoàn thương nhân', match: { type: 'world_news', includes: 'thương' } },
      { id: 'make_trade', desc: 'Thực hiện một giao dịch với người chơi khác', match: { type: 'trade' } },
      { id: 'show_mercy', desc: 'Tha mạng hoặc xử lý nhẹ tay với shopkeeper', match: { type: 'shopkeeper_mercy' } },
    ],
    reward: { gold: 450, exp: 120, titleId: 'road_broker', itemId: 'lucky_coin', itemQty: 1 },
  },
  {
    id: 'forest_oath',
    name: 'Lời Thề Của Rừng',
    icon: '🌲',
    description: 'Dấu vết linh thú, mini boss và Ancient Oak để lại một lời thề với khu rừng.',
    steps: [
      { id: 'forest_hunt', desc: 'Thắng một event combat trong Forest', match: { type: 'event_combat', zoneId: 'forest' } },
      { id: 'oak_falls', desc: 'Hạ Ancient Oak', match: { type: 'boss', zoneId: 'forest', includes: 'Cổ Mộc' } },
    ],
    reward: { gold: 300, exp: 180, titleId: 'oak_sworn', itemId: 'ancient_relic', itemQty: 1 },
  },
  {
    id: 'shadow_debt',
    name: 'Món Nợ Trong Bóng Tối',
    icon: '🌑',
    description: 'Những lựa chọn xấu không biến mất. Chúng thành giao kèo.',
    steps: [
      { id: 'first_blood_money', desc: 'Cướp hoặc giết một shopkeeper', match: { type: 'shopkeeper_robbery' } },
      { id: 'survive_death', desc: 'Chết ít nhất một lần sau đó', match: { type: 'death' } },
      { id: 'kill_again', desc: 'Trở lại và hạ một kẻ địch', match: { type: 'kill' } },
    ],
    reward: { gold: 150, exp: 150, titleId: 'shadow_debtor', itemId: 'shadow_shard', itemQty: 1 },
  },
];
