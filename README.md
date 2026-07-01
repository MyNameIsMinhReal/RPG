# Butterfly Effect Permadeath RPG — Discord Bot

Bot Discord RPG permadeath với khám phá, combat, party, boss server-wide, craft và nhiều sự kiện lore. Giao diện và thông báo chủ yếu **tiếng Việt**.

## Yêu cầu

- **Node.js 22+** (dùng `node:sqlite` — cần flag `--experimental-sqlite`)
- Tài khoản [Discord Developer Portal](https://discord.com/developers/applications)

## Cài đặt nhanh

```bash
git clone <repo-url>
cd rpg-bot-copy
npm install
cp .env.example .env   # rồi điền token
npm run doctor         # kiểm tra dữ liệu game
npm run dev            # chạy bot (ts-node)
```

## Biến môi trường

| Biến | Bắt buộc | Mô tả |
|------|----------|-------|
| `DISCORD_TOKEN` | Có | Bot token từ Developer Portal |
| `CLIENT_ID` | Có (deploy) | Application ID |
| `GUILD_ID` | Không | Nếu set → deploy slash command vào 1 server (dev). Bỏ trống → deploy global |
| `RPG_DB_PATH` | Không | Đường dẫn SQLite (mặc định: `./rpg.db`). Test dùng `:memory:` |

## Scripts

| Lệnh | Mô tả |
|------|-------|
| `npm run dev` | Chạy bot ở chế độ dev (TypeScript trực tiếp) |
| `npm run build` | Compile TypeScript → `dist/` |
| `npm start` | Chạy bản build (`dist/index.js`) |
| `npm run deploy` | Đăng ký slash commands lên Discord |
| `npm run doctor` | Kiểm tra toàn vẹn dữ liệu game (enemies, zones, items…) |
| `npm test` | Chạy test (Vitest, DB in-memory) |

## Cấu trúc thư mục

```
src/
  commands/     Slash + prefix handlers (auto-discovered)
  systems/      Logic game (combat, explore, player, economy…)
  data/         Dữ liệu tĩnh (enemies, items, zones, events…)
  database/     SQLite schema + migrations
  utils/        Embed, format, collectors…
test/           Unit tests
```

### Prefix text

Ngoài slash command, bot hỗ trợ prefix `rpg`:

```
rpg help
rpg explore
rpg p          → profile
rpg u healing_potion
```

## Thêm lệnh mới

Tạo file trong `src/commands/` export:

- `data` — `SlashCommandBuilder`
- `execute` — handler
- `aliases?` — alias prefix (tuỳ chọn)
- `prefixSpec?` — quy tắc parse args prefix (tuỳ chọn)

Không cần sửa `index.ts` hay `deploy.ts`.

## Explore events (refactor)

Types và helpers dùng chung nằm tại `src/systems/explore/events/`:

- `types.ts` — `ExploreEventType`, `RunExploreEventInput`, …
- `shared.ts` — `finishExploreEvent`, `awaitVote`, `awaitExploreBtn`

`commands/exploreEvents.ts` vẫn re-export tạm để tương thích import cũ.

## Bảo mật dependency

`npm audit` có thể báo lỗi từ `undici` (dependency của discord.js) và `esbuild` (dev, qua vitest). Các bản fix hiện tại thường yêu cầu major upgrade — xem [npm audit](https://docs.npmjs.com/cli/v10/commands/npm-audit) trước khi `npm audit fix --force`.

## License

Private / theo repo gốc.
