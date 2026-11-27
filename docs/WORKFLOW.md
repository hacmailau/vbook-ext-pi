# Workflow: tao, test, phat hanh extension

Trich tu tai lieu he thong cua repo fork Darkrai9x; chi giu phan ap dung cho repo nay.

## 1. Quy trình làm việc với AI trên pi

### 1.1 Chuẩn bị một lần

```bash
# 1) Bật developer server trên điện thoại (chạm 7 lần vào tên phiên bản → Dev mode)
# 2) Cấu hình server cho CLI (file bị gitignore)
cp .agents/skills/vbook-extensions/scripts/servers.example.json \
   .agents/skills/vbook-extensions/scripts/servers.json
# sửa thành ["http://192.168.x.x:8080"]

# 3) Kiểm tra kết nối
node .agents/skills/vbook-extensions/scripts/vbook.js connect
```

### 1.2 Chọn mode theo yêu cầu

| Bạn muốn | Mode | Câu lệnh mẫu trên pi |
|---|---|---|
| Tạo extension mới từ URL | CREATE | `Dùng skill vbook-extensions, tạo extension comic từ https://site/truyen/x` |
| Sửa extension hỏng | FIX | `Dùng skill vbook-extensions, fix extension X: detail trả rỗng` |
| Kiểm tra, không sửa | TEST | `Dùng skill vbook-extensions, test toàn bộ script của X` |
| Quét sức khoẻ nhiều ext | AUDIT | `Dùng skill vbook-extensions, audit toàn bộ extension trong repo` |
| Chuẩn hoá code, giữ hành vi | REFACTOR | `Dùng skill vbook-extensions, refactor X theo template novel` |
| Chỉ build/install | — | `build extension X` (đọc `reference/cli.md`) |

### 1.3 Vòng lặp làm việc chuẩn

1. **Đọc trước khi sửa**: SKILL.md → đúng 1 file mode → `reference/runtime.md` → phần API liên quan.
2. **Reproduce**: chạy script lỗi với input thật, phân loại (connectivity / domain move / selector / config / contract / referrer).
3. **Sửa hẹp**, một concern mỗi lần.
4. **Test lại** bằng CLI, verify data theo checklist (field, URL tuyệt đối, số lượng item, host khớp `metadata.source`).
5. **Chuỗi phụ thuộc**: `detail → page → toc → chap → track`; đổi `config.js` thì test lại toàn bộ chain.
6. **Bump `metadata.version` một lần** (fix/refactor), rồi **hỏi trước khi build/install**.

### 1.4 Lệnh CLI thường dùng

```bash
node .agents/skills/vbook-extensions/scripts/vbook.js connect
node .agents/skills/vbook-extensions/scripts/vbook.js test <ext> detail.js <url>
node .agents/skills/vbook-extensions/scripts/vbook.js test <ext> search.js "tien" 1
node .agents/skills/vbook-extensions/scripts/vbook.js testall <ext...> --query tien --timeout 45000 --json report.json
node .agents/skills/vbook-extensions/scripts/vbook.js build <ext> [out.zip]
node .agents/skills/vbook-extensions/scripts/vbook.js install <ext> [--no-icon]
```

`testall` là triage: WORK / MOVED / AUTH-MSG / EMPTY / CRASH / UNREACHABLE / BAD_PLUGIN. Không được xoá extension chỉ vì một lần probe.

### 1.5 Ranh giới trách nhiệm

| Việc | Ai làm |
|---|---|
| Đọc/soạn code, chọn selector, chạy CLI, đọc log | AI |
| Cấp URL thật, bật dev mode, quyết định xoá extension | Bạn |
| Build / install / commit / push | Chỉ khi bạn yêu cầu rõ |

## 2. Phát triển extension mới

Nguồn chuẩn: `extension-api.md` (contract engine) + `extension_docs.md` (REST của dev server).
CLI `vbook.js` chỉ là wrapper của 4 endpoint đó, nên mọi thứ dưới đây test được ngay trên máy.

### 2.1 Chọn `type` và bộ script

| type | Script bắt buộc | Optional | Nội dung `chap` |
|---|---|---|---|
| `novel` | `search`, `detail`, `toc`, `chap` | `page`, `home`, `explore`, `genre` | HTML string (+ `data2` = tiêu đề chương) |
| `comic` | `search`, `detail`, `toc`, `chap` | `page`, `home`, `explore`, `genre` | **array** ảnh (string hoặc object) |
| `audio` | `search`, `detail`, `toc`, `chap`, `track` | `page`, `home`, `explore`, `genre` | `[{ title, data }]` → `track` |
| `video` | `search`, `detail`, `toc`, `chap`, `track` | `page`, `home`, `explore`, `genre` | `[{ title, data }]` → `track` |
| `tts` | `voice`, `tts` | — | base64 audio trong `data` |
| `translate` | `language`, `translate` | `model`, `style` | string hoặc `{ text, segments }` |
| `ai` | `chatStream` | — | stream qua `ai.emitToken` |

- `explore` khai báo thì `home` bị bỏ qua.
- `search` chỉ phục vụ màn search; các tab list chạy script do `home`/`genre`/`explore` chỉ định.
- Script nào khai trong `plugin.json.script` **phải** tồn tại trong `src/`.

### 2.2 Cấu trúc package

```
<ext>/
  plugin.json      # manifest (<= 2 MB; quá thì app đọc thành {})
  icon.png         # optional, <= 5 MB, app scale về 200x200
  src/             # script PHẢI nằm trực tiếp ở đây, không dùng thư mục con
    config.js detail.js toc.js chap.js search.js ...
```

Giới hạn: 1 script ≤ 10 MB, file trong `src/` con bị bỏ qua. `load('x.js')` chỉ đọc file top-level
và là thay thế text (không lồng nhau), nên shared helper phải nằm cùng cấp.

### 2.3 `plugin.json` tối thiểu

```json
{
  "metadata": {
    "name": "Ten Nguon",
    "author": "vBook",
    "version": 1,
    "source": "https://example.com",
    "description": "Mo ta ngan",
    "locale": "vi",
    "regexp": "(https?://)?(www\\.)?example\\.com/.+",
    "type": "comic",
    "nsfw": false,
    "encrypt": true
  },
  "script": { "search": "search.js", "detail": "detail.js", "toc": "toc.js", "chap": "chap.js" },
  "config": { "DOMAIN": { "title": "Domain", "default": "https://example.com", "mode": "input" } }
}
```

Bẫy:

- `regexp` so khớp **toàn bộ URL** (Kotlin `String.matches`). `example\\.com` không bao giờ khớp;
  dùng `(https?://)?(www\\.)?example\\.com/.+`. Chỉ có ý nghĩa với novel/comic/audio/video.
- `version` phải là số nguyên (`"1.2"` đọc thành 0).
- `encrypt: true` → chỉ build qua `/extension/build` mới sinh script mã hoá; app giải mã bằng key
  từ `source` + `author`.
- `source` là base cho mọi link tương đối; `config.DOMAIN.default` phải bằng `metadata.source`.

### 2.4 Ba loại `config` — đừng lẫn

| Loại | Khai báo | Script đọc bằng |
|---|---|---|
| Static | `config: { KEY: { title, default, mode, values, format } }` | hằng số được **inject** vào script, luôn là **string** |
| Dynamic | `script.config = "config.js"` trả về cùng shape | `localConfig.getItem(key)` — trả `null` nếu chưa set, **không** trả `default` |
| Connection / engine | bare value: `"thread_num": 2, "delay": 500, "ignore": true` | app tự đọc; `"2"` (có nháy) **không** được đọc |

- Static value luôn là string: `FLAG === "true"`, `parseInt(PAGE_SIZE)`; `localConfig.getItem`
  **không** đọc static.
- Key static phải là JS identifier hợp lệ và **không trùng** `let`/`const` trong script, nếu không
  toàn bộ script chết bằng SyntaxError.
- `mode`: `input` | `select` | `toggle` | `list` | `database`. `mode: "list"` lưu JSON array dạng string.
- `mode: "database"` khai báo bảng `localDatabase` cùng tên key, không inject hằng số.
- `timeout` không phải connection key — đặt trong `fetch(url, { timeout: ms })`.
- Engine keys cũng là bare value: tts `preload_size`/`preload_parallel`/`max_length`,
  translate `support_auto_detect`/`max_line`/`max_length`. Quên `max_length` (> 0) thì TTS gọi
  từng ký tự một.

### 2.5 Quy trình test tăng dần

```bash
EXT=mysite
# 1) detail trước — lấy URL detail thật
node .agents/skills/vbook-extensions/scripts/vbook.js test $EXT detail.js https://example.com/truyen/x
# 2) (page →) toc — dùng URL thật trong data.url của detail
node .agents/skills/vbook-extensions/scripts/vbook.js test $EXT toc.js https://example.com/truyen/x
# 3) chap — dùng URL thật của chương đầu
node .agents/skills/vbook-extensions/scripts/vbook.js test $EXT chap.js https://example.com/truyen/x/chuong-1
# 4) search (query, page)
node .agents/skills/vbook-extensions/scripts/vbook.js test $EXT search.js "tien hiep" 1
# 5) home / genre / explore (không tham số)
node .agents/skills/vbook-extensions/scripts/vbook.js test $EXT explore.js
# 6) audio/video: chap → track với data thật của track đầu
node .agents/skills/vbook-extensions/scripts/vbook.js test $EXT track.js "<data cua track>"
# 7) tts / translate / ai
node .agents/skills/vbook-extensions/scripts/vbook.js test $EXT voice.js
node .agents/skills/vbook-extensions/scripts/vbook.js test $EXT tts.js "Xin chao" vi-VN-Standard-A
node .agents/skills/vbook-extensions/scripts/vbook.js test $EXT translate.js "Hello" en vi chapterContent
node .agents/skills/vbook-extensions/scripts/vbook.js test $EXT chat_stream.js '[{"role":"user","content":"hi"}]' ""
```

Quy tắc:

- `code:0` **chưa** phải pass — đối chiếu `data` với bảng field trong `extension-api.md`
  (`reference/verify-checklist.md`): field đủ, URL tuyệt đối, số item hợp lý, host khớp `metadata.source`.
- `/extension/test` **không** trim `/` cuối URL như app thật — tự xử lý nếu site cần.
- Mọi tham số `execute(...)` đều là string.
- Sau ~3 vòng sửa không tiến triển: fetch lại trang, diff selector, đổi giả thuyết thay vì sửa mò.

### 2.6 Bẫy thường gặp (từ mục Troubleshooting của API)

| Triệu chứng | Nguyên nhân |
|---|---|
| Không mở được URL chia sẻ | `regexp` không khớp toàn bộ URL |
| Setting không có tác dụng | so sánh string với `false`; dùng `=== "true"` |
| Mọi script SyntaxError | key config không phải JS identifier hoặc trùng `let`/`const` |
| Link tương đối sai | thiếu `host` (đừng gửi `""`), `//cdn…` phải thêm `https:`, `page.js` phải trả URL tuyệt đối |
| `json()` throw | request lỗi (`status` 504) — luôn `if (!res.ok) return Response.error(...)` |
| `next` page lỗi | `Response.success(items, next)` cần **string**, `""` khi hết |
| comic 0 ảnh | `chap` trả string/object thay vì array |
| video/audio không phát | `chap` trả bare string; `track.type` sai case (`Native`); `native` nhận page URL |
| server không nhớ lựa chọn | `title` của track trùng hoặc rỗng |
| ảnh cover 403 | thêm `referrerpolicy: "no-referrer"` / `"origin"` |
| iOS lỗi lạ | native call trả `undefined` thay vì throw — check giá trị, đừng chỉ `try/catch` |

### 2.7 Phát hành

1. `metadata.version` tăng 1 (số nguyên).
2. `vbook.js build <ext>` sinh `<ext>/plugin.zip` (mã hoá nếu `encrypt: true`); `vbook.js install <ext>` để cài thử.
3. Thêm hoặc cập nhật entry trong registry đúng loại (`plugin.json` cho novel/comic, `translate.json`, `tts.json`, `ai.json`...): `name`, `author`, `path`, `version`, `source`, `icon`, `description`, `type`, `locale`.
   `path` trỏ tới `https://raw.githubusercontent.com/hacmailau/vbook-ext-pi/main/<ext>/plugin.zip`.
4. `python scripts/check_repo.py` phải exit 0, rồi commit cả `src/`, `plugin.json`, `plugin.zip` và registry.

### 2.8 Done nghĩa là

- Mọi script khai trong `plugin.json` đều PASS với dữ liệu thật, không có field rỗng bất thường.
- `regexp` khớp một URL detail thật; `page` (nếu có) trả ≥ 1 URL tuyệt đối và `toc` ra chương cho từng trang.
- Chuỗi phụ thuộc đã test: `detail → page → toc → chap → track`, `search → detail`,
  `explore` + từng section `script`.
- Không còn comment giảng dạy của template; `config` không trùng tên biến.
