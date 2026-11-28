# vbook-ext-pi

Extension cho ứng dụng vBook, kèm bộ công cụ để phát triển extension mới. Repo này giữ **source plaintext** (`src/`) của từng extension, nên có thể dùng làm tài liệu tham khảo.

## Extension

| Thư mục | Loại | Mô tả |
|---|---|---|
| `comnguoinovel` | novel | Tìm, khám phá Chung/BL, đọc truyện từ comnguoinovel.site. Cần đăng nhập thủ công trong browser VBook để đọc chương. Chi tiết: [comnguoinovel/README.md](comnguoinovel/README.md). |
| `truyendichai` | novel | Tìm, xem chi tiết, mục lục, đọc chương đã dịch từ truyendichai.com. Chương chưa dịch phải mở một lần trong trình duyệt vBook (Turnstile) hoặc gắn API key Gemini. Chi tiết: [truyendichai/SPEC.md](truyendichai/SPEC.md). |
| `9router-translate` | translate | Dịch bằng endpoint tương thích OpenAI (9Router). Model mặc định `cbai/deepseek-v4.1-flash`; nhập API key trong phần cài đặt extension. |

## Cài vào vBook

Thêm repository trong vBook bằng URL:

```
https://raw.githubusercontent.com/hacmailau/vbook-ext-pi/main/plugin.json
```

## Cấu trúc

```
<ext>/plugin.json, icon.png, src/*.js    # source của extension
<ext>/plugin.zip                         # bản build đã đóng gói, app tải file này
plugin.json, translate.json, ...         # registry: danh sách extension app tải về
extension-api.md                         # contract API của engine vBook
docs/WORKFLOW.md                         # quy trình tạo, test, phát hành
docs/extension_docs.md                   # REST API của developer server
scripts/check_repo.py                    # kiểm tra nhất quán, chạy trước khi commit
.agents/skills/vbook-extensions/         # skill cho AI agent: CLI vbook.js, template, reference
```

Chỉ có `src/` là source. `plugin.zip` là output của `vbook.js build`, đừng sửa tay.

## Tạo extension mới

1. Bật Dev mode trên điện thoại và tạo `.agents/skills/vbook-extensions/scripts/servers.json` từ `servers.example.json` (file này bị gitignore).
2. Chép `.agents/skills/vbook-extensions/templates/<type>/` thành `<tên-ext>/`. Các loại: `novel`, `comic`, `audio`, `video`, `tts`, `translate`, `ai`.
3. Test từng script với URL thật:
   ```bash
   node .agents/skills/vbook-extensions/scripts/vbook.js connect
   node .agents/skills/vbook-extensions/scripts/vbook.js test <ext> detail.js <url>
   ```
4. Build, cài thử, cập nhật registry, rồi chạy `python scripts/check_repo.py`.

Người mới tiếp quản: đọc [docs/BEGINNER.md](docs/BEGINNER.md) trước. Chi tiết từng bước và các bẫy thường gặp nằm trong [docs/WORKFLOW.md](docs/WORKFLOW.md). Nếu dùng AI agent, đọc [AGENTS.md](AGENTS.md) trước.

## Quy ước

- Mỗi extension giữ `src/` plaintext trong git, cùng `plugin.zip` đã build.
- Tăng `metadata.version` (số nguyên) một lần mỗi lần phát hành.
- `extension-api.md` và `.agents/skills/vbook-extensions/reference/extension-api.md` phải giống hệt nhau.
- Không commit API key hay địa chỉ máy cá nhân vào `src/` hoặc `plugin.json`.
