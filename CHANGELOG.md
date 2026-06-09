# Update Log

---

## [Patch] — 2026-06-09

### 🌳 Sự Kiện Thức Tỉnh Cổ Mộc
Sự kiện boss mới hoàn toàn cho khu rừng — thay thế cơ chế "Thách Boss" trực tiếp.

**Điều kiện triệu hồi:**
- Hạ gục Miniboss rừng (`Alpha Thornmaw` hoặc `Moss-Crowned Stag`)
- Sở hữu **3× Ancient Relic** trong túi đồ

**Flow sự kiện:**
1. Bấm **🔍 Truy Tìm Linh Thú** → sau 5 lần khám phá, Miniboss rừng sẽ xuất hiện bắt buộc
2. Sau khi đủ điều kiện, bấm **🌳 Thức Tỉnh Cổ Mộc** → tiêu 3 relic, mở cửa sổ **5 phút** cho người khác tham gia
3. Bất kỳ người tham gia nào bấm **⚔️ Công Kích** để vào chiến đấu
4. HP boss được chia sẻ toàn server — thắng/thua/chạy đều lưu HP lại cho người tiếp theo
5. Boss HP = 0 → phần thưởng chia theo % damage đóng góp

**HP boss scale theo số người:**
| Người tham gia | HP boss |
|---|---|
| 1 | 550 |
| 2 | 770 |
| 3 | 990 |
| 4 | 1210 |
| 5 | 1430 |

**Boss respawn sau 48 giờ.**

---

### 🎭 Lore Events — Thông Báo Điều Kiện
Mỗi điều kiện thỏa mãn sẽ trigger một event lore riêng vào lần khám phá tiếp theo:

- **🌿 Rừng Im Lặng Bất Thường** — xuất hiện sau khi hạ Miniboss rừng
- **⚱️ Relic Rung Lên** — xuất hiện khi đã có đủ 3 Ancient Relic (và đã có prereq)
    
---

### 🌿 Bark Armor — Mechanic Riêng Của Ancient Oak
- Boss kích hoạt **Bark Armor**: giảm **60% sát thương** nhận vào trong 2 lượt
- Khi Bark Armor active, nút **🔥 Đốt Vỏ Cây (25 MP)** xuất hiện
- Dùng nút đó: phá giáp + boss vào trạng thái **Vulnerable** (+50% damage nhận vào, 3 lượt)

---

### 💪 Ancient Oak — Buff Chỉ Số
Boss được tăng sức để khuyến khích lập party:

| Chỉ số | Trước | Sau |
|---|---|---|
| HP | 315 | **550** |
| ATK | 25 | **44** |
| DEF | 20 | **35** |

> Solo sẽ rất khổ. Hãy lập party.

---

### 🔒 Boss Gate — Khoá Zone
Từ nay phải **tự tay hạ boss** của zone hiện tại mới có thể di chuyển sang zone tiếp theo.

| Để vào | Phải hạ |
|---|---|
| Đền Cổ Hoang Phế | 🌳 Ancient Oak |
| Hầm Mỏ Bị Nguyền | ⛩️ Shrine Guardian |
| Hoang Nguyên Tiếng Vọng | 🪨 Mine Colossus |

> Mang tính **cá nhân** — mỗi người phải tự vượt qua, không tính theo server.

---

### 🗡️ Attune Skill — Điều Chỉnh Chi Phí
Lần đầu trang bị skill vào loadout **miễn phí** — các lần sau tăng dần:

| Lần | Chi phí |
|---|---|
| 1 (lần đầu) | **FREE** |
| 2 | 1× base gold + 1 Soul Shard |
| 3 | 2× base gold + 1 Soul Shard |
| 4+ | 3× base gold + 1 Soul Shard |

---

### 🐛 Bug Fixes
- Sau khi chiến đấu với Shopkeeper và bỏ chạy, nút **Khám phá tiếp** giờ hiện đúng
