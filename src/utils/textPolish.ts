const REPLACEMENTS: Array<[RegExp, string]> = [
  [/❌ Bạn chưa có nhân vật! Dùng `\/start` để bắt đầu\.?/g, '🕯️ Bạn chưa có hồ sơ mạo hiểm. Dùng `/start` để thức tỉnh nhân vật.'],
  [/Bạn chưa có nhân vật! Dùng `\/start` để bắt đầu\.?/g, 'Bạn chưa có hồ sơ mạo hiểm. Dùng `/start` để bắt đầu hành trình.'],
  [/Nhân vật không tồn tại hoặc đã chết!/g, 'Nhân vật chưa sẵn sàng hoặc đã ngã xuống. Dùng `/start` để hồi sinh.'],
  [/❌ Bạn đã chết\. Dùng `\/start` để hồi sinh\.?/g, '💀 Bạn đã ngã xuống. Dùng `/start` để hồi sinh trước khi tiếp tục.'],
  [/Bạn đã chết\. Dùng `\/start` để hồi sinh\.?/g, 'Bạn đã ngã xuống. Dùng `/start` để hồi sinh trước khi tiếp tục.'],
  [/\*Chiến đấu bắt đầu\.\.\.\*/g, '⚔️ **Chiến đấu bắt đầu.** Chuẩn bị hành động.'],
  [/Chiến đấu bắt đầu\.\.\./g, 'Chiến đấu bắt đầu. Chuẩn bị hành động.'],
  [/Không có gì rơi\.\.\./g, 'Không có chiến lợi phẩm.'],
  [/Bạn chần chừ quá lâu và sự kiện trôi qua\.?/g, 'Bạn do dự quá lâu. Cơ hội tan vào màn sương.'],
  [/Sự kiện đã trôi qua\.?/g, 'Dấu vết của sự kiện đã biến mất.'],
  [/Sự kiện này hiện chưa được cấu hình hoàn chỉnh\.?/g, 'Sự kiện này chưa ổn định trong thế giới hiện tại.'],
  [/Không đủ MP/g, 'Không đủ MP'],
  [/không đủ MP/g, 'không đủ MP'],
  [/❤️ HP mất \*\*(.+?)\*\*/g, '❤️ Mất **$1 HP**'],
  [/🪙 \+\*\*(.+?)\*\* Gold/g, '🪙 Nhận **$1 Gold**'],
  [/💰 \+\*\*(.+?)\*\* Gold/g, '🪙 Nhận **$1 Gold**'],
  [/⭐ \+\*\*(.+?)\*\* EXP/g, '⭐ Nhận **$1 EXP**'],
  [/Reputation:/g, 'Danh vọng:'],
  [/Wanted:/g, 'Truy nã:'],
  [/\(guaranteed\)/g, '(chắc chắn)'],
  [/\bGold\b/g, 'Vàng'],
  [/Stat Points/g, 'Điểm Tiềm Năng'],
  [/\blegacy\b/g, 'di sản'],
];

export function polishGameText(input: string): string {
  let text = String(input ?? '').replace(/\r\n/g, '\n').trim();
  for (const [pattern, replacement] of REPLACEMENTS) text = text.replace(pattern, replacement);
  return text.replace(/\n{3,}/g, '\n\n');
}

export function section(title: string, lines: Array<string | null | undefined>): string {
  const body = lines.filter((line): line is string => !!line && line.trim().length > 0).map(polishGameText);
  return body.length ? `**${title}**\n${body.join('\n')}` : '';
}

export function eventIntro(description: string, hint = 'Chọn cách xử lý bên dưới.'): string {
  return polishGameText(`> ${description}\n\n🎯 **${hint}**`);
}

export function eventResult(outcomeLines: string[], rewardLines: string[] = []): string {
  const parts: string[] = [];
  const story = outcomeLines.map(polishGameText).filter(Boolean);
  if (story.length) parts.push(section('📜 Diễn biến', story));
  if (rewardLines.length) parts.push(section('🎁 Kết quả', rewardLines));
  return parts.filter(Boolean).join('\n\n') || '📜 Sự kiện khép lại trong im lặng.';
}

export function combatStartLine(): string {
  return '⚔️ **Chiến đấu bắt đầu.** Hãy chọn hành động cẩn thận.';
}

const TITLE_REPLACEMENTS: Array<[RegExp, string]> = [
  [/LEVEL UP!?/gi, 'Lên Cấp'],
  [/Chiến Thắng!/g, 'Chiến Thắng'],
  [/Bạn Đã Ngã Xuống/g, 'Mạo Hiểm Giả Đã Ngã Xuống'],
  [/Loot/g, 'Chiến Lợi Phẩm'],
  [/Gold/g, 'Vàng'],
  [/Wanted/g, 'Truy Nã'],
  [/Reputation/g, 'Danh Vọng'],
  [/Stat Points/g, 'Điểm Tiềm Năng'],
  [/Skill Loadout/g, 'Kỹ Năng Đang Mang'],
  [/Equipment/g, 'Trang Bị'],
];

export function polishGameTitle(input: string): string {
  let text = String(input ?? '').trim();
  for (const [pattern, replacement] of TITLE_REPLACEMENTS) text = text.replace(pattern, replacement);
  return text;
}
