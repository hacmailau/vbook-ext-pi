# System overview — vbook-extensions (fork của Darkrai9x)

> **Ghi chú cho agent.** Tài liệu này mô tả repo upstream `Darkrai9x/vbook-extensions` (fork, 20 extension,
> layout hybrid, nhiều ext artifact-only). Repo `vbook-ext-pi` dùng layout source-first: mọi extension giữ `src/`.
> Dùng tài liệu này để hiểu kiến trúc runtime, hợp đồng API, CLI và bẫy thường gặp (mục 4, 5, 7).
> Bỏ qua các mục riêng của upstream: số liệu 20 extension (mục 2), khôi phục source từ git (mục 6.4, 10).
> Quy trình chính thức của repo này nằm ở `README.md` và `docs/WORKFLOW.md`.

Tài liệu mô tả repo, kiến trúc runtime, và quy trình làm việc với AI trên pi coding.

## 1. Repo này là gì

Hai vai trò tách biệt:

1. **Kho extension** — mỗi thư mục con là một extension vBook (`plugin.json` + `icon.png` + `plugin.zip`).
2. **Kho công cụ AI** — `.agents/skills/vbook-extensions/` chứa skill, reference API, template, và CLI test/build/install.

Các file JSON ở root là **registry index** (danh sách extension app tải về), không phải manifest của extension:

| File | Nội dung | Số entry (đã đồng bộ) |
|---|---|---|
| `plugin.json` | registry chính (novel/comic) | 2 |
| `chinese_plugin.json` | truyện chữ Trung | 0 |
| `audio.json` | nhạc/audio | 0 |
| `video_plugin.json` | phim/donghua/short | 0 |
| `tts.json` | engine TTS | 4 |
| `translate.json` | engine dịch | 9 |
| `ai.json` | engine AI (chat/summary) | 5 |
| `repository.json` | danh sách repo của tác giả khác | 19 |

`chinese_plugin.json`, `audio.json`, `video_plugin.json` hiện là mảng rỗng vì toàn bộ extension
tương ứng đã bị xoá; file vẫn giữ để `repository.json` không trỏ vào link chết.

Registry là file **hand-maintained**, không sinh tự động (xem docstring `scripts/build_registry.py`).

## 2. Trạng thái hiện tại (sau khi bạn xoá bớt)

- HEAD: `2344374` — 390 file tracked, 0 thư mục `src/`.
- Working tree: xoá 74 thư mục extension, còn **20 extension**:

```
ai:        chatgpt-ai  claude-ai  deepseek-ai  gemini-ai  grok-ai
translate: baidu-translate  chatgpt-translate  claude-translate  deepl-translate
           deepseek-translate  edge-translate  gemini-translate  google-translate  grok-translate
tts:       bing-tts  gemini-tts  google-tts  tiktok-tts
novel:     metruyenchu  metruyenchu-app
```

Cả 20 extension còn lại đều có entry trong registry, và registry không còn entry trỏ tới thư mục
đã xoá (đã đồng bộ ngày sau khi dọn).

### Cảnh báo kiến trúc quan trọng

Commit `b0b7cd4` (2026-07-13, "chore: remove per-extension src and plugin.json files") đã xoá **572 file `src/*.js`**. Nghĩa là:

- Repo hiện chỉ còn **artifact release**: `plugin.zip` với `src/*.js` **đã mã hoá** (`metadata.encrypt: true`) — không đọc/sửa được.
- CLI `vbook.js test|build|install` **fail** với ext không có `src/` vì nó đọc `src/*.js` từ disk:

```
ERROR: src/ not found in <dir>
```

  Hiện chỉ `metruyenchu` có `src/` (đã khôi phục); 19 ext còn lại artifact-only.
- Source plaintext vẫn nằm trong git history (trước `b0b7cd4`) cho 7 ext, khôi phục được (xem §10.2–10.3).
- Hệ quả thực tế: repo dùng để **tạo extension mới** (từ template) hoặc **dev ext đã khôi phục source**;
  19 ext artifact-only chỉ test được bằng cách cài lên máy.

## 3. Cấu trúc thư mục

```
vbook-extensions/
├── AGENTS.md                  # luật repo cho agent (pi/Codex/Claude...)
├── README.md                  # hướng dẫn skill + CLI + debug VS Code
├── extension-api.md           # contract API (2336 dòng) — nguồn chuẩn
├── extension_docs.md          # REST API của developer server
├── SYSTEM-OVERVIEW.md         # tài liệu này
├── *.json                     # registry index (xem §1)
├── <ext>/                     # plugin.json + icon.png + plugin.zip
├── tutorial/                  # ảnh cho README
├── vbook-vscode-tester/       # source VS Code extension "vBook Tester"
├── vbook-vscode-tester-0.0.5.vsix
├── scripts/build_registry.py  # mirror artifact sang repo public
├── mkicon.py                  # convert icon_src.ico -> icon.png 200x200
├── run.bat / run.sh           # chạy ExtensionMaker.jar (JAR không có trong repo)
├── .agents/skills/vbook-extensions/   # SKILL CHUẨN
│   ├── SKILL.md
│   ├── modes/{create,fix,test,audit,refactor}.md
│   ├── reference/{runtime,type-contracts,cli,verify-checklist,extension-api}.md
│   ├── templates/{novel,comic,audio,video,tts,translate,ai}/
│   └── scripts/{vbook.js,servers.example.json}
├── .claude/skills/vbook-extensions/SKILL.md   # chỉ là pointer
└── .vscode/launch.json        # debug vbook-vscode-tester (F5)
```

## 4. Kiến trúc runtime

### 4.1 Đường đi của một lần test

```
pi / terminal
  └─ node .agents/skills/vbook-extensions/scripts/vbook.js test <ext> detail.js <url>
       ├─ đọc <ext>/plugin.json + <ext>/src/*.js từ disk
       ├─ resolve server: --server → $VBOOK_SERVER → scripts/servers.json (probe /connect)
       └─ POST http://<phone>:<port>/extension/test
            body { plugin, icon?, src (JSON string), input: {script, vararg[]} }
              └─ vBook app (Android/iOS) — ScriptExecutor (Rhino)
                   ├─ fetch / jsoup / Storage / localBook / localConfig / crypto
                   └─ Response.success(data, next) | Response.error(msg)
              ← { code, log, data }
```

`build` và `install` dùng cùng payload nhưng gọi `/extension/build` (trả base64 zip, server tự mã hoá) và `/extension/install` (nạp vào DB app).

### 4.2 Hai lớp contract

| Lớp | File | Nội dung |
|---|---|---|
| Engine API | `extension-api.md` = `reference/extension-api.md` (bắt buộc giống hệt) | `plugin.json` schema, `config`, `fetch`, jsoup, `browser`, `crypto`, `load()`, signature từng script, ví dụ đầy đủ, dev server |
| Runtime rules | `reference/runtime.md` | giới hạn Rhino ES6, bẫy trailing slash, `next` phải là string, referrer policy, static vs dynamic explore |
| Type contracts | `reference/type-contracts.md` | novel/comic: `detail→page?→toc→chap`; video/audio: `chap→track`; tts: `voice+tts`; translate: `language+translate`; ai: `chatStream` |

### 4.3 Các loại extension

`novel`, `comic`, `audio`, `video`, `tts`, `translate`, `ai`. Mỗi loại có template đầy đủ trong `templates/<type>/` — đây là cách duy nhất còn hiệu quả để tạo extension mới trong repo này.

### 4.4 Công cụ phụ

- `scripts/check_repo.py`: guard tính nhất quán (registry ↔ disk, `plugin.json` ↔ `src/`, 2 bản API).
  Chạy trước mỗi commit; exit 0 = sạch.
- `scripts/build_registry.py --src . --public ../public-repo`: mirror `plugin.zip`/`plugin.json`/`icon.png` sang repo public, prune thư mục không còn ở source, ghi `changed=N` vào `$GITHUB_OUTPUT`. **Không** sinh registry index.
- `mkicon.py`: cần `icon_src.ico` + Pillow, xuất `icon.png` 200×200.
- `run.bat` / `run.sh`: cần `ExtensionMaker.jar` + JavaFX SDK — **không có trong repo**, chỉ là di sản.
- `vbook-vscode-tester/`: GUI test song song với CLI (VS Code → panel vBook). `.vscode/launch.json` chỉ debug extension này.

## 5. Lớp AI

| Đường dẫn | Vai trò |
|---|---|
| `AGENTS.md` | luật bắt buộc: đọc SKILL.md trước khi sửa, chỉ dùng `vbook.js`, không suy ra quyền build/install/commit |
| `.agents/skills/vbook-extensions/SKILL.md` | **nguồn chuẩn duy nhất**: route task → mode, load tài liệu tối thiểu, invariants |
| `.agents/.../modes/*.md` | quy trình 5 nhánh: create / fix / test / audit / refactor |
| `.agents/.../reference/*` | contract + runtime + CLI + checklist verify |
| `.agents/.../templates/<type>/` | scaffold hoàn chỉnh |
| `.agents/.../scripts/vbook.js` | CLI duy nhất được phép |
| `.claude/skills/.../SKILL.md` | pointer tương thích cho Claude Code, **không** copy tài nguyên |

Trên pi coding, skill này đã được nạp sẵn (tên `vbook-extensions`), nên không cần cài thêm.

### Nguyên tắc bất biến (từ SKILL.md)

- Test/build/install **chỉ** qua `vbook.js` — không dùng MCP, không tự dựng payload REST.
- Không suy ra quyền build/install/commit/push từ yêu cầu "review/sửa code/test".
- Reproduce trước khi fix; `code:0` **không** phải pass — phải verify data theo `verify-checklist.md`.
- Dùng URL và response thật; không đoán selector/host/ID.
- Giữ nguyên thay đổi không liên quan trong working tree.
- Script nằm trực tiếp trong `src/`, mỗi file một `execute`; giới hạn 10 MB/script, 2 MB/plugin.json, 5 MB/icon.

## 6. Quy trình làm việc với AI trên pi

### 6.1 Chuẩn bị một lần

```bash
# 1) Bật developer server trên điện thoại (chạm 7 lần vào tên phiên bản → Dev mode)
# 2) Cấu hình server cho CLI (file bị gitignore)
cp .agents/skills/vbook-extensions/scripts/servers.example.json \
   .agents/skills/vbook-extensions/scripts/servers.json
# sửa thành ["http://192.168.x.x:8080"]

# 3) Kiểm tra kết nối
node .agents/skills/vbook-extensions/scripts/vbook.js connect
```

### 6.2 Chọn mode theo yêu cầu

| Bạn muốn | Mode | Câu lệnh mẫu trên pi |
|---|---|---|
| Tạo extension mới từ URL | CREATE | `Dùng skill vbook-extensions, tạo extension comic từ https://site/truyen/x` |
| Sửa extension hỏng | FIX | `Dùng skill vbook-extensions, fix extension X: detail trả rỗng` |
| Kiểm tra, không sửa | TEST | `Dùng skill vbook-extensions, test toàn bộ script của X` |
| Quét sức khoẻ nhiều ext | AUDIT | `Dùng skill vbook-extensions, audit 20 extension còn lại` |
| Chuẩn hoá code, giữ hành vi | REFACTOR | `Dùng skill vbook-extensions, refactor X theo template novel` |
| Chỉ build/install | — | `build extension X` (đọc `reference/cli.md`) |

### 6.3 Vòng lặp làm việc chuẩn

1. **Đọc trước khi sửa**: SKILL.md → đúng 1 file mode → `reference/runtime.md` → phần API liên quan.
2. **Reproduce**: chạy script lỗi với input thật, phân loại (connectivity / domain move / selector / config / contract / referrer).
3. **Sửa hẹp**, một concern mỗi lần.
4. **Test lại** bằng CLI, verify data theo checklist (field, URL tuyệt đối, số lượng item, host khớp `metadata.source`).
5. **Chuỗi phụ thuộc**: `detail → page → toc → chap → track`; đổi `config.js` thì test lại toàn bộ chain.
6. **Bump `metadata.version` một lần** (fix/refactor), rồi **hỏi trước khi build/install**.

### 6.4 Khôi phục source plaintext (khi cần fix extension cũ)

```bash
# xem commit trước khi source bị xoá
git show --stat b0b7cd4 | head

# khôi phục src/ của một extension
mkdir -p metruyenchu/src
for f in $(git ls-tree -r --name-only b0b7cd4^ -- metruyenchu/src); do
  git show "b0b7cd4^:$f" > "$f"
done

# hoặc chỉ xem nhanh một file
git show b0b7cd4^:metruyenchu/src/detail.js | less
```

Sau đó `vbook.js test metruyenchu detail.js <url>` mới chạy được.

### 6.5 Lệnh CLI thường dùng

```bash
node .agents/skills/vbook-extensions/scripts/vbook.js connect
node .agents/skills/vbook-extensions/scripts/vbook.js test <ext> detail.js <url>
node .agents/skills/vbook-extensions/scripts/vbook.js test <ext> search.js "tien" 1
node .agents/skills/vbook-extensions/scripts/vbook.js testall <ext...> --query tien --timeout 45000 --json report.json
node .agents/skills/vbook-extensions/scripts/vbook.js build <ext> [out.zip]
node .agents/skills/vbook-extensions/scripts/vbook.js install <ext> [--no-icon]
```

`testall` là triage: WORK / MOVED / AUTH-MSG / EMPTY / CRASH / UNREACHABLE / BAD_PLUGIN. Không được xoá extension chỉ vì một lần probe.

### 6.6 Ranh giới trách nhiệm

| Việc | Ai làm |
|---|---|
| Đọc/soạn code, chọn selector, chạy CLI, đọc log | AI |
| Cấp URL thật, bật dev mode, quyết định xoá extension | Bạn |
| Build / install / commit / push | Chỉ khi bạn yêu cầu rõ |

## 7. Phát triển extension mới

Nguồn chuẩn: `extension-api.md` (contract engine) + `extension_docs.md` (REST của dev server).
CLI `vbook.js` chỉ là wrapper của 4 endpoint đó, nên mọi thứ dưới đây test được ngay trên máy.

### 7.1 Chọn `type` và bộ script

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

### 7.2 Cấu trúc package

```
<ext>/
  plugin.json      # manifest (<= 2 MB; quá thì app đọc thành {})
  icon.png         # optional, <= 5 MB, app scale về 200x200
  src/             # script PHẢI nằm trực tiếp ở đây, không dùng thư mục con
    config.js detail.js toc.js chap.js search.js ...
```

Giới hạn: 1 script ≤ 10 MB, file trong `src/` con bị bỏ qua. `load('x.js')` chỉ đọc file top-level
và là thay thế text (không lồng nhau), nên shared helper phải nằm cùng cấp.

### 7.3 `plugin.json` tối thiểu

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

### 7.4 Ba loại `config` — đừng lẫn

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

### 7.5 Quy trình test tăng dần

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

### 7.6 Bẫy thường gặp (từ mục Troubleshooting của API)

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

### 7.7 Phát hành

1. `metadata.version` tăng 1 (số nguyên).
2. `vbook.js build $EXT` → sinh `<ext>/plugin.zip` (mã hoá nếu `encrypt: true`); `install` để cài thử.
3. Thêm entry vào registry đúng loại (`plugin.json` / `chinese_plugin.json` / `audio.json` /
   `video_plugin.json` / `tts.json` / `translate.json` / `ai.json`): `name`, `author`, `path`,
   `version`, `source`, `icon`, `description`, `type`, `locale`.
4. Mirror artifact sang repo public: `python scripts/build_registry.py --src . --public ../public-repo`.

### 7.8 Done nghĩa là

- Mọi script khai trong `plugin.json` đều PASS với dữ liệu thật, không có field rỗng bất thường.
- `regexp` khớp một URL detail thật; `page` (nếu có) trả ≥ 1 URL tuyệt đối và `toc` ra chương cho từng trang.
- Chuỗi phụ thuộc đã test: `detail → page → toc → chap → track`, `search → detail`,
  `explore` + từng section `script`.
- Không còn comment giảng dạy của template; `config` không trùng tên biến.

## 8. Nợ kỹ thuật cần biết

| Vấn đề | Ảnh hưởng | Cách xử lý |
|---|---|---|
| Không có `src/` (b0b7cd4) | `test/build/install` fail toàn bộ | xem §10 — chỉ 7/20 ext khôi phục được từ git |
| `plugin.zip` đã mã hoá | không đọc/sửa được code trong zip | luôn làm việc trên `src/` plaintext |
| Registry từng trỏ 33 thư mục đã xoá | link chết nếu push | đã đồng bộ; nhớ lặp lại mỗi lần xoá ext |
| `build_registry.py` prune theo `plugin.zip` | xoá ext khỏi repo public nếu thiếu zip | chạy khô với `--public` là clone tạm trước |
| `run.bat`/`run.sh` thiếu JAR | không dùng được | bỏ qua, dùng `vbook.js` |
| `mkicon.py` hardcode `icon_src.ico` | cần đúng tên file | copy icon nguồn vào root trước |
| `.vscode/launch.json` chỉ debug tester | F5 không test extension | dùng CLI, hoặc panel vBook Tester |

## 9. Checklist trước khi commit

1. `git status` — chỉ thay đổi dự kiến, không lẫn file rác (`*test.json`, `data.json`, `servers.json` đã gitignore).
2. Extension đã test bằng `vbook.js` với URL thật, data verify theo checklist.
3. `metadata.version` bump đúng một lần.
4. `extension-api.md` và `reference/extension-api.md` vẫn giống hệt (`diff -q`).
5. Registry index khớp với thư mục thực tế trên disk.
6. Comment "giảng dạy" của template đã xoá.

## 10. Khắc phục trạng thái repo hiện tại

### 10.1 Chọn vai trò repo trước khi sửa gì

| Lựa chọn | Nghĩa | Hệ quả |
|---|---|---|
| **A. Release-only** | chỉ commit artifact (`plugin.json` + `plugin.zip` + `icon.png`) | CLI `test/build/install` **không dùng được**; test bằng cách cài lên máy; muốn sửa ext phải có source ở nơi khác |
| **B. Source-first** | commit thêm `src/` plaintext, zip là output | dùng được toàn bộ skill/CLI; nhưng 13/20 ext chưa từng có source trong repo → phải lấy từ nơi khác |
| **C. Hybrid** | chỉ ext đang phát triển có `src/` | đơn giản nhất khi chỉ dev vài ext; phải nhớ ext nào có src |

**Đã chọn: C (hybrid).** Trạng thái hiện tại: `metruyenchu` có `src/` (14 file, đã `node --check`),
19 ext còn lại artifact-only. Guard: `python scripts/check_repo.py` — cảnh báo ext không có `src/`
nhưng **không** coi đó là lỗi, chỉ báo lỗi khi `src/` có mà thiếu file được khai báo.

Quy ước hybrid:

- Ext đang sửa **phải** có `<ext>/src/` plaintext; commit cả `src/` và `plugin.zip`.
- Ext không sửa: chỉ `plugin.json` + `plugin.zip` + `icon.png`; không test được bằng CLI.
- Muốn chuyển một ext sang diện dev: chạy `restore_src <ext>` (§10.3) nếu có trong git history,
  ngược lại lấy source từ nơi build thật hoặc viết lại từ template.
- Xoá `src/` của ext đã xong việc là hợp lệ — nhưng khi đó không còn test lại được bằng CLI.

### 10.2 Ext nào khôi phục được source

Commit `b0b7cd4` xoá sạch `src/`; sau đó **82 commit chỉ đổi `plugin.json` + `plugin.zip`**, không thêm `src/` nào.

**7/20 khôi phục được** (src có trong git history, phủ đủ mọi script mà `plugin.json` HEAD khai báo):

| ext | Ghi chú |
|---|---|
| `metruyenchu` | 14 file, gồm cả `crypto.js`, `base64.js` — **đã khôi phục** vào working tree |
| `baidu-translate`, `edge-translate` | có `language_list.js` |
| `bing-tts`, `gemini-tts`, `google-tts`, `tiktok-tts` | có `voice_list.js` |

**13/20 không khôi phục được** — source chưa bao giờ nằm trong repo này (build từ nơi khác):
`chatgpt-ai`, `claude-ai`, `deepseek-ai`, `gemini-ai`, `grok-ai`,
`chatgpt-translate`, `claude-translate`, `deepseek-translate`, `gemini-translate`, `grok-translate`,
`google-translate`, `deepl-translate`, `metruyenchu-app`.

### 10.3 Lệnh khôi phục (làm từng ext, không làm cả loạt)

```bash
restore_src() {
  ext="$1"
  [ -d "$ext/src" ] && { echo "$ext/src đã có, bỏ qua"; return 1; }
  mkdir -p "$ext/src"
  git ls-tree -r --name-only b0b7cd4^ -- "$ext/src" \
    | while read -r f; do git show "b0b7cd4^:$f" > "$f"; done
  echo "== $ext: $(ls "$ext/src" | wc -l) file trong src/"
  # file mà plugin.json khai báo phải tồn tại thật
  python -c "import json,os,sys; e=sys.argv[1]; d=json.load(open(e+'/plugin.json',encoding='utf-8')); m=[s for s in d['script'].values() if not os.path.isfile(os.path.join(e,'src',s))]; print('missing:', m or 'none')" "$ext"
}

restore_src metruyenchu
node .agents/skills/vbook-extensions/scripts/vbook.js test metruyenchu detail.js https://metruyencv.com/truyen/<slug>
```

Lưu ý quan trọng:

- Snapshot `b0b7cd4^` (2026-07-13) **cũ hơn** artifact HEAD (2026-11-03) — các fix sau đó chỉ nằm trong zip đã mã hoá.
  Khôi phục xong phải coi như FIX mode: test từng script với URL thật, sửa cái nào lệch.
- Trước khi build lại phải tăng `metadata.version` (vì bản trong zip đã cao hơn).
- Không khôi phục `plugin.json` từ `b0b7cd4^` — giữ `plugin.json` ở HEAD (mới hơn), chỉ lấy `src/`.

### 10.4 13 ext không có source — 3 cách xử

| Cách | Khi nào dùng | Đánh đổi |
|---|---|---|
| Lấy source từ nơi build thật (repo private/backup) | ext còn dùng, cần sửa đúng hành vi hiện tại | tốt nhất, không rủi ro |
| Viết lại từ `templates/<type>/` | ext nhỏ, hoặc cần đổi nhiều | hành vi có thể khác bản đang phát hành |
| Coi là artifact-only | không sửa code, chỉ cập nhật registry | không test được bằng CLI; test bằng cài lên máy |

Không nên giải mã `plugin.zip`: key derive từ `metadata.source` + `metadata.author` (đều công khai)
nên về lý thuyết là được, nhưng phải reverse KDF của app — dễ sai và vi phạm tinh thần "dùng artifact
đã build" của skill.

### 10.5 Dọn nợ lặt vặt

| Mục | Việc cần làm |
|---|---|
| `run.bat` / `run.sh` | trỏ tới `javafx-sdk-*` + `ExtensionMaker.jar` **không còn trong repo** → `git rm run.bat run.sh` |
| `mkicon.py` | cần `icon_src.ico` ở root; nếu không dùng nữa thì `git rm mkicon.py` |
| `.vscode/launch.json` | chỉ debug `vbook-vscode-tester`; giữ nếu dùng GUI, không thì xoá cùng `.vscode/` |
| `report.json` từ `testall --json` | thêm vào `.gitignore` |
| `servers.json` | đã gitignore; tạo từ `servers.example.json` |
| 3 registry rỗng (`chinese/audio/video`) | giữ (an toàn) hoặc xoá kèm 3 entry trong `repository.json` |

### 10.6 Guard trước khi commit

```bash
python scripts/check_repo.py     # exit 0 = sạch
```

Script kiểm tra: registry không trỏ thư mục chết · ext trên disk đều có entry registry ·
`plugin.json` parse được và `metadata.version` là số nguyên · mọi script khai báo phải có file
trong `src/` (khi `src/` tồn tại) · `extension-api.md` và bản trong skill giống hệt.

### 10.7 Quy trình chuẩn sau khi khắc phục

1. `mkdir <ext>/src` + copy `templates/<type>/` (ext mới) hoặc khôi phục/lấy source (ext cũ).
2. Sửa theo FIX/CREATE mode, test từng script bằng `vbook.js test` với URL thật.
3. Tăng `metadata.version` (số nguyên).
4. `vbook.js build <ext>` → `plugin.zip`; `install` để cài thử lên máy.
5. Cập nhật registry đúng file; chạy `build_registry.py` khi publish.
6. Commit **cả `src/` và artifact** (nếu chọn B/C) để lần sau không mất source.
7. Chạy guard §10.6.
