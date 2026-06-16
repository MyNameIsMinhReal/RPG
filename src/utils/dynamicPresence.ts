import { Client, ActivityType } from 'discord.js';
import db from '../database/index';

function getStats() {
  const totalDeaths = (db.prepare('SELECT COUNT(*) as count FROM legacies').get() as any).count as number;
  const totalPlayers = (db.prepare('SELECT COUNT(*) as count FROM characters').get() as any).count as number;
  const todayDeaths = (db.prepare(
    "SELECT COUNT(*) as count FROM legacies WHERE created_at >= unixepoch('now', 'start of day')"
  ).get() as any).count as number;

  return { totalDeaths, totalPlayers, todayDeaths };
}

export function setupDynamicPresence(client: Client) {
  function rotate() {
    const { totalDeaths, totalPlayers, todayDeaths } = getStats();

    const activities = [
      { name: `${todayDeaths.toLocaleString('vi-VN')} Mạo hiểm giả bỏ mạng hôm nay.`, type: ActivityType.Watching },
      { name: `${totalDeaths.toLocaleString('vi-VN')} linh hồn đã ngã xuống.`, type: ActivityType.Watching },
      { name: `${totalPlayers.toLocaleString('vi-VN')} Mạo hiểm giả đang thách thức số phận.`, type: ActivityType.Watching },
      { name: 'Trong cơn Bão Tro Đỏ...', type: ActivityType.Playing },
      { name: 'Những bóng ma ở Khe Nứt Thời Gian.', type: ActivityType.Watching },
      { name: 'Tiếng xóc đồng xu tại Hẻm Tối.', type: ActivityType.Listening },
      { name: 'Tiếng gãy xương của Tân thủ.', type: ActivityType.Listening },
      { name: 'Tin nhắn báo trừ tiền thẻ tín dụng của bạn.', type: ActivityType.Watching },
      { name: 'Giải vô địch [Bỏ Chạy] toàn máy chủ.', type: ActivityType.Competing },
    ];

    let i = 0;

    client.user?.setPresence({ activities: [activities[i]], status: 'dnd' });

    setInterval(() => {
      i = (i + 1) % activities.length;
      client.user?.setPresence({ activities: [activities[i]], status: 'dnd' });
    }, 30_000);
  }

  // Chạy lần đầu ngay sau khi bot ready
  rotate();

  // Làm mới danh sách stats mỗi 10 phút để số không bị stale
  setInterval(rotate, 10 * 60 * 1000);
}
