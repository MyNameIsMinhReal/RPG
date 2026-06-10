import type { FactionId } from '../systems/player';

export interface FactionDef {
  id: FactionId;
  name: string;
  icon: string;
  description: string;
  positiveBenefit: string;
  negativeWarning: string;
}

export const FACTIONS: Record<FactionId, FactionDef> = {
  villagers: {
    id: 'villagers', name: 'Ashveil Villagers', icon: '🏘️',
    description: 'Dân làng thường dân. Họ nhớ rất lâu ai đã cứu họ và ai đã bỏ mặc họ.',
    positiveBenefit: '+EXP nhỏ từ nhiệm vụ/cứu trợ, dễ mở title thiện lành.',
    negativeWarning: 'Rep thấp khiến các event dân làng lạnh nhạt hơn.',
  },
  merchants: {
    id: 'merchants', name: 'Merchant Guild', icon: '🏦',
    description: 'Mạng lưới thương nhân, xe hàng và chợ đen nửa hợp pháp.',
    positiveBenefit: '+Gold từ combat/event theo mốc reputation.',
    negativeWarning: 'Rep thấp kết hợp Wanted làm shop đắt và merchant dễ gọi hộ vệ.',
  },
  hunters: {
    id: 'hunters', name: 'Hunters Guild', icon: '🏹',
    description: 'Những người theo dấu quái vật, dấu boss và vật liệu hiếm.',
    positiveBenefit: '+Drop chance nhẹ khi đánh quái/boss.',
    negativeWarning: 'Rep thấp khiến nhiệm vụ săn khó xuất hiện hơn.',
  },
  old_church: {
    id: 'old_church', name: 'Old Church', icon: '🕯️',
    description: 'Giáo hội cũ chuyên phong ấn lời nguyền và ghi chép di vật.',
    positiveBenefit: '+EXP nhẹ từ combat nhờ lời chúc phúc.',
    negativeWarning: 'Rep thấp khiến các nghi lễ dễ phản tác dụng hơn.',
  },
  shadow_court: {
    id: 'shadow_court', name: 'Shadow Court', icon: '🌑',
    description: 'Mạng lưới bóng tối, giao dịch nguy hiểm và lựa chọn mờ ám.',
    positiveBenefit: '+Gold khi reputation dương, nhưng dễ đi kèm lựa chọn rủi ro.',
    negativeWarning: 'Rep quá thấp làm các giao kèo bóng tối quay lưng.',
  },
};

export function factionTier(rep: number): string {
  if (rep >= 80) return 'Exalted';
  if (rep >= 50) return 'Trusted';
  if (rep >= 20) return 'Friendly';
  if (rep <= -80) return 'Hated';
  if (rep <= -50) return 'Hostile';
  if (rep <= -20) return 'Suspicious';
  return 'Neutral';
}
