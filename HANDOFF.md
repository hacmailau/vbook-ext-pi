# HANDOFF: vbook-ext-pi

Bàn giao cho session tiếp theo. Đọc file này, rồi `AGENTS.md` và `README.md`.
Không ghi IP thiết bị hay mã truy cập vào file này; hỏi người dùng khi cần.

Cập nhật lần cuối: 2026-11-28.

## 1. Trạng thái repo

- Repo: `https://github.com/hacmailau/vbook-ext-pi`, nhánh `main`, local `G:\repos\automation\vbook-ext-pi`.
- HEAD (đã đồng bộ với `origin/main`): `4d9c990 docs(comnguoinovel): add sanitized handoff and testing matrix`.
- Chưa commit: `.gitignore` (thêm `.monitor/`, `.pi/remote-pi/`), `AGENTS.md` (khối `Agent skills`), `README.md`, `HANDOFF.md` này, `docs/BEGINNER.md`, `docs/agents/`, `skills-lock.json`, `.pi/`, và 27 skill của `mattpocock/skills` trong `.agents/skills/`.
- `python scripts/check_repo.py` báo `OK`.
- Layout source-first: mỗi extension giữ `src/` plaintext cùng `plugin.json`, `icon.png`, `plugin.zip`.
- Email commit của repo này là địa chỉ noreply (`35002087+hacmailau@users.noreply.github.com`), đặt bằng `git config` cục bộ. GitHub từ chối push nếu commit mang email riêng.

| Extension | Loại | Version | Ghi chú |
|---|---|---|---|
| `comnguoinovel` | novel | 5 (registry gốc còn ghi 3, xem mục 4) | Site `comnguoinovel.site`. Đọc chương chạy trong WebView, chi tiết ở `comnguoinovel/HANDOFF.md`. Có tests trong `comnguoinovel/tests/`. |
| `9router-translate` | translate | 1 | Có `icon.png`. `source` trỏ tới một địa chỉ Tailscale riêng, người dùng đã chọn giữ nguyên. |

Registry: `plugin.json` (gốc, cả hai extension) và `translate.json`. URL cài trong vBook:
`https://raw.githubusercontent.com/hacmailau/vbook-ext-pi/main/plugin.json`.

## 2. Những việc đã làm

1. Review repo cũ `vbook-extensions` (fork Darkrai9x). Abort merge dở với upstream (7 file conflict, do đã xoá 74 extension).
2. Chốt hướng: tách hẳn khỏi upstream, source-first, không merge upstream nữa.
3. Dựng `vbook-ext-pi` từ repo GitHub của người dùng, thêm: skill `.agents/skills/vbook-extensions/`, `AGENTS.md`, `extension-api.md`, `docs/WORKFLOW.md`, `docs/SYSTEM-OVERVIEW.md`, `docs/extension_docs.md`, `scripts/check_repo.py`, `scripts/build_registry.py`, `.gitattributes` (ép LF). Viết lại `README.md`.
4. Sửa `check_repo.py`: nhận đường dẫn `/main/`, không coi registry vắng là lỗi.
5. Thêm `9router-translate/icon.png` (200x200) và trường `icon` trong hai registry.
6. Merge `hacmailau/comnguoinovel-v2` (giữ lịch sử) vào repo này. Giữ `vbook.js` của comnguoinovel (báo lỗi khi response bị cắt, timeout 90 giây). Giữ `extension-api.md` của repo này.
7. Đổi comnguoinovel sang `.site` (`BASE_URL`, `API_URL`, `ASSET_URL`, `source`, `DOMAIN` mặc định). `regexp` nhận cả `.site` và `.com`. Tăng version lên 3, build zip, cài lên điện thoại, push.
8. Dọn repo cũ: `G:\repos\automation\vbook-extensions` reset cứng về `origin/master` của Darkrai9x. Bản cũ nằm ở nhánh `backup/pre-restore-20261127` (`a8720ea`). Clone upstream tham chiếu ở `G:\repos\references\darkrai9x-vbook-extensions`.

## 3. Kết quả test trên thiết bị (Android 15, Samsung SM-A146P, domain `.site`, bản v3)

Đây là kết quả của v3. Từ v4/v5, `chap.js` đã đọc được chương (xem `comnguoinovel/HANDOFF.md` và `comnguoinovel/TESTING.md`).

| Script | Kết quả |
|---|---|
| `explore`, `home` | OK, link và bìa dùng `.site` |
| `genre` | OK, 15 thể loại |
| `search "kiem lai"` | OK, 1 kết quả, 557 chương |
| `detail` | OK, đủ trường |
| `toc` | OK, 557 chương, URL tuyệt đối, không trùng; chương 557 `lock: true` |
| `listing latest` | OK, 20 truyện |
| `listing genre:bach-hop` | OK, 1 truyện (API site cũng trả 1) |
| `chap` | **Chưa kiểm chứng.** Trả "Cần đăng nhập website trong browser VBook" |

Màn hình app (chụp 16:25) hiển thị đúng tab Khám phá. Logcat không có lỗi `E`/`F`; chỉ có cảnh báo `W` không liên quan.

## 4. Việc chưa xong

1. **Version registry:** đã đồng bộ lên 5 ngày 2026-11-28. Từ nay `check_repo.py` báo lỗi nếu version trong registry hoặc trong `plugin.zip` khác `<ext>/plugin.json`.
2. **Kết quả test bản 5 chưa có.** `comnguoinovel/VALIDATION.md` mới ghi đến bản 2. Các mục chưa kiểm chứng của `chap.js` (phiên hết hạn, truyện khác, chương khoá không có quyền, thời gian tải) nằm ở mục 4 của `comnguoinovel/HANDOFF.md`. Khi có kết quả, ghi vào `VALIDATION.md`.
3. **Commit** các thay đổi chưa commit ở mục 1 khi người dùng yêu cầu, chia thành các commit riêng (skill, tài liệu, phần còn lại). Không tự push.
4. **Repo `comnguoinovel-v2` cũ** vẫn trỏ về domain `.com`. Đề xuất: thêm dòng chuyển hướng về `vbook-ext-pi` trong README của nó, rồi người dùng tự archive. Chưa làm.
5. **Dọn nợ lặt vặt** (chưa hỏi người dùng): `.agents/skills/` của repo này là bản cũ hơn upstream mới nhất ("Rework the vBook skill and templates"). Có thể so sánh rồi chọn phần cần lấy.
6. **Chọn license** cho repo (chưa có `LICENSE`). Cần người dùng quyết định.

## 5. Cách kết nối thiết bị (Windows)

Điện thoại cắm USB vào PC, bật Dev mode trong vBook. IP mạng di động của điện thoại không gọi từ PC được, nên dùng `adb forward`:

```bash
ADB="/g/repos/personal/proxypin/scrcpy-win64-v5.0.1/adb.exe"
"$ADB" devices                                   # kỳ vọng: R92W3126YPP device
"$ADB" forward tcp:8080 tcp:8080
curl -s http://127.0.0.1:8080/connect            # {"code":200,"data":"samsung SM-A146P"}
node .agents/skills/vbook-extensions/scripts/vbook.js connect --server http://127.0.0.1:8080
```

- CLI không cần mã truy cập. Thông tin kết nối riêng do người dùng cung cấp trong phiên.
- Xem màn hình: `scrcpy.exe --serial R92W3126YPP --window-title "vBook device" --stay-awake` (thư mục `scrcpy-win64-v5.0.1` cùng chỗ với `adb.exe`).
- Chụp màn hình: `"$ADB" -s R92W3126YPP exec-out screencap -p > .monitor/screen.png`.
- Logcat theo tiến trình vBook: lấy pid bằng `shell pidof com.vbook.android`, rồi `logcat -v time --pid=<pid> > .monitor/logcat.txt`. Pid đổi khi app khởi động lại, phải bật lại. Thư mục `.monitor/` bị gitignore.
- Sau khi xong việc: `"$ADB" forward --remove tcp:8080`, đóng scrcpy và dừng logcat nền.

## 6. Bẫy đã gặp (đừng lặp lại)

- **DNS nhà mạng chặn site.** Trước đó `comnguoinovel.com` phân giải thành `127.0.0.1` trên điện thoại và sinkhole Palo Alto trên PC, nên `explore.js` trả HTTP 504. Triệu chứng giống lỗi extension nhưng không phải. Kiểm tra bằng `ping <domain>` trên máy và `nslookup <domain> 8.8.8.8`.
- **Windows và `/tmp`.** Python (Windows) không đọc được `/tmp` của Git Bash. Dùng `cygpath -m "$TEMP"` cho file tạm dùng chung giữa bash và python.
- **Python in tiếng Việt lỗi `UnicodeEncodeError`.** Đặt `PYTHONIOENCODING=utf-8`.
- **CRLF.** Máy có `core.autocrlf=true`. `.gitattributes` ép LF. Hai bản `extension-api.md` phải giống hệt từng byte, nếu không `check_repo.py` lỗi.
- **Sửa chuỗi trong `plugin.json`.** Regexp chứa `\\.` (hai backslash thật trong file). `str.replace` với chuỗi có `\\` dễ không khớp; dùng `chr(92)` hoặc xác nhận số lần thay trước khi ghi.
- **Push bị từ chối** nếu commit mang email riêng. Xem mục 1.
- **Không đóng gói lại zip bằng tay.** Dùng `vbook.js build`.

## 7. Luật không được vi phạm

- Test, build, install chỉ qua `.agents/skills/vbook-extensions/scripts/vbook.js`.
- Không suy ra quyền build, install, commit, push từ yêu cầu review hay sửa source. Hỏi trước.
- `code:0` chưa phải pass. Verify field, URL tuyệt đối, số item, host.
- Không commit API key, IP thiết bị, mã truy cập hay cookie vào repo.
- Bump `metadata.version` đúng một lần cho mỗi lần phát hành.
- Chạy `python scripts/check_repo.py` trước khi commit; exit 0 là bắt buộc.
