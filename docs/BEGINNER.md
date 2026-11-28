# Hướng dẫn cho người mới tiếp quản

Dành cho người mới muốn thêm extension hoặc sửa lỗi extension đã có, với sự hỗ trợ của AI agent (pi). Đọc theo thứ tự: file này, `README.md`, `AGENTS.md`, rồi `HANDOFF.md` (trạng thái hiện tại và việc còn dở).

## 1. Chuẩn bị một lần

1. Cài Node.js và Python 3. Cài pi và đăng nhập một model.
2. Điện thoại Android cài vBook, bật Dev mode (chạm 7 lần vào tên phiên bản).
3. Tạo `.agents/skills/vbook-extensions/scripts/servers.json` từ `servers.example.json` (file này bị gitignore, vì chứa địa chỉ máy riêng).
4. Kiểm tra kết nối:
   ```bash
   node .agents/skills/vbook-extensions/scripts/vbook.js connect
   ```
   Cách kết nối qua USB (`adb forward`) nằm ở mục 5 của `HANDOFF.md`.

## 2. Skill nào dùng khi nào

Repo có nhiều skill, nhưng người mới chỉ cần nhớ các skill dưới đây. Gọi bằng `/tên-skill` hoặc nhắc tên skill trong câu yêu cầu.

| Việc | Skill |
|---|---|
| Tạo, sửa, test, build, cài extension | `vbook-extensions` (skill chính, bắt buộc cho mọi việc về extension) |
| Chưa rõ muốn gì, cần làm rõ yêu cầu trước | `grill-me` |
| Lỗi khó, chưa biết nguyên nhân | `diagnosing-bugs` |
| Ghi lại việc cần làm thành issue | `to-spec`, `to-tickets` |
| Xếp loại và chọn việc tiếp theo trong danh sách issue | `triage` |
| Kết thúc phiên, bàn giao cho phiên sau | `handoff` |

Các skill còn lại (`tdd`, `wayfinder`, `wizard`, `code-review`...) dành cho phát triển phần mềm cỡ lớn. Chưa cần dùng.

Bản gốc và cách cập nhật skill: `skills-lock.json`. Chạy `npx skills update` để lấy bản mới, `npx skills list` để xem danh sách.

## 3. Quy trình thường gặp

### Sửa extension bị hỏng

1. Ghi lỗi thành một issue: tạo file `.scratch/<ten-ext>/issues/01-<mo-ta-ngan>.md` (hoặc nhờ agent dùng `/to-tickets`). Ghi extension nào, script nào, URL nào, lỗi thấy gì. Dòng đầu: `Status: needs-triage`.
2. Nhờ agent: `Dùng skill vbook-extensions, fix extension <ten-ext>: <mô tả lỗi>`.
3. Agent sẽ chạy `vbook.js test` với URL thật, sửa, test lại. Nếu sau 3 vòng vẫn lỗi, agent dừng và ghi `HANDOFF.md`. Đừng ép tiếp.
4. Khi hết lỗi: đổi dòng `Status:` của issue thành `resolved`.

### Thêm extension mới

1. Chuẩn bị một URL truyện thật của site cần làm.
2. Nhờ agent: `Dùng skill vbook-extensions, tạo extension novel từ <URL>` (các loại: `novel`, `comic`, `audio`, `video`, `tts`, `translate`, `ai`).
3. Agent chép template, viết script, test từng script.
4. Chi tiết từng bước nằm ở `docs/WORKFLOW.md`.

### Phát hành

1. Tăng `metadata.version` (số nguyên) trong `<ext>/plugin.json`, một lần mỗi lần phát hành.
2. Yêu cầu rõ: `build extension <ten-ext>`, rồi `install` để cài thử lên điện thoại.
3. Cập nhật entry trong registry (`plugin.json` gốc hoặc `translate.json`), rồi chạy:
   ```bash
   python scripts/check_repo.py
   ```
   Kết quả phải là exit code 0 trước khi commit.
4. Commit cả `src/`, `plugin.json`, `plugin.zip` và registry.

## 4. Quy tắc an toàn

- Agent chỉ build, cài, commit hoặc push khi bạn yêu cầu rõ.
- Không đưa API key hay địa chỉ máy cá nhân vào `src/` hoặc `plugin.json`.
- Không sửa tay `plugin.zip`. File này là output của `vbook.js build`.
- `code:0` khi test chưa đủ để coi là đạt. Kiểm tra dữ liệu trả về có đủ trường, URL tuyệt đối, đúng domain.
- Không xóa extension chỉ vì một lần test lỗi. Site có thể tạm thời không truy cập được.

## 5. Nơi lưu từng thứ

| Thứ | Vị trí |
|---|---|
| Issue, spec (local markdown) | `.scratch/<feature>/` (được git theo dõi) |
| Quy ước tracker và nhãn | `docs/agents/` |
| Trạng thái, việc còn dở | `HANDOFF.md` và `<ext>/HANDOFF.md` |
| Kết quả kiểm chứng của extension | `<ext>/VALIDATION.md` |
| Thuật ngữ và quyết định thiết kế | `GLOSSARY.md`, `docs/adr/` (tạo dần khi cần) |
