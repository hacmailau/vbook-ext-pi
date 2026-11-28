# truyendich.us — Nghiên cứu API & đặc tả extension vBook

- **Trạng thái:** tài liệu khảo sát ngày 2026-11-28; các ví dụ dưới đây là thiết kế ban đầu. Extension v2 đã dùng `truyendich.space` mặc định; xem [bàn giao](truyendichus/HANDOFF.md) để biết kết quả kiểm tra và cooldown.
- **Site gốc:** `https://truyendich.us` (canonical của mọi domain mirror).
- **Mục tiêu:** đủ dữ kiện để viết extension `truyendichus` (type `novel`) cho vBook.
- **Cách thu thập:**
  1. `sitemap-static.xml` (76 route tĩnh) + `sitemap-novels-1.xml` (17.230 truyện).
  2. Tải 15 trang đại diện, trích **25 file JS chunk**, đọc code gọi API (`fetch`, `apiFetch`).
  3. Gọi thật từng endpoint (chỉ GET) để lấy shape response + giới hạn tham số.
  4. Đối chiếu bằng `capture_browser_scenario` (rea MCP) trên Chrome thật: xem trang nào gọi API nào.
- **Dữ liệu thô:** bản ghi khảo sát cục bộ, không phát hành cùng extension.

---

## 0. TL;DR cho người viết extension

1. Đây là **Next.js App Router + backend FastAPI**, mọi API nằm dưới **`/api` cùng origin**. Không có domain API riêng.
2. **Toàn bộ dữ liệu đọc được trả về JSON** — không cần WebView, không cần Turnstile, không cần cookie để đọc truyện. Đây là điểm khác biệt lớn so với `truyendichai`.
3. Có **API tìm kiếm JSON**: `GET /api/novels/search?q=&page=&size=`. Không cần parse HTML để search.
4. Có **API danh sách**: `/api/lists/<slug>`, `/api/categories/<slug>`, `/api/explore`.
5. Có **API mục lục phân trang**: `/api/novels/<slug>/chapters?page=&size=` (**size tối đa 200**).
6. Có **API nội dung chương**: `/api/novels/<slug>/chapters/<chapter_number>?edition_type=`.
7. Chỉ 2 thứ cần Turnstile/đăng nhập: **dịch AI streaming** (`/api-stream/translate-ai`) và **TTS** (`/api/tts/v2/sessions`) → extension **không cần** hai cái này.
8. Turnstile **không** chặn trang HTML/JSON thường. Cloudflare chỉ chặn theo kiểu rate-limit (403/429) → cần retry/backoff nhẹ.

---

## 1. Nhận diện site & domain

| Domain | Quan hệ | Ghi chú |
|---|---|---|
| `truyendich.us` | **gốc / canonical** | `<link rel="canonical" href="https://truyendich.us">`, `url` trong JSON-LD |
| `truyendich.fit` | mirror | cùng bản build (28/28 chunk trùng hash), cùng Cloudflare account |
| `truyendich.space` | mirror | như trên |
| `truyendichai.com` | **khác nền tảng** | Astro, Cloudflare account khác, API khác — không dùng cho extension này |

Bằng chứng cùng một bản build: 5 chunk JS lấy từ `.fit` và `.space` có **SHA-256 trùng khít** (`1255-…` = `5f58c8bb5dd6affd…`, `webpack-…` = `57005eab36fe1929…`). GA4 `G-JV8B4ZF0C1` và AdSense `ca-pub-4732437726997509` giống nhau trên mọi mirror.

> Khuyến nghị: `BASE_URL = https://truyendich.us`, cho phép đổi qua config `DOMAIN` (để dùng mirror khi domain gốc bị chặn ở VN — `.fit` đã bị chặn TLS từ mạng của người khảo sát, `.us`/`.space` thì không).

### Hạ tầng

- Cloudflare phía trước: HTML `cf-cache-status: DYNAMIC`, asset tĩnh `HIT`, có `cdn-cgi/challenge-platform/jsd` + `cdn-cgi/rum`.
- `robots.txt`: `Disallow: /tim-kiem`, `/api/`, `/admin/`, `/poison-trap`, `/*.json$`. `/admin` trả **404** (không có UI admin công khai), `/forbidden` trả 200.
- Không lộ `/openapi.json`, `/docs`, `/api/docs`.

---

## 2. Kiến trúc API

```
Browser ──► Cloudflare ──► Next.js (BFF, App Router)
                              ├─ SSR/RSC: gọi backend nội bộ, render HTML + flight data
                              └─ /api/*: proxy JSON  ──►  FastAPI (Python)
```

- Base API trong bundle: `(process.env.NEXT_PUBLIC_API_URL || "/api")`. Build hiện tại **không set** env → **luôn same-origin**.
- Dấu hiệu backend FastAPI: lỗi `{"detail":"Not Found"}`, `{"detail":[{"type":"int_parsing","loc":["path","novel_id"],…}]}`, `{"detail":{"error_code":"LOGIN_REQUIRED","message":"Vui lòng đăng nhập."}}`.
- Client chỉ gọi `/api/*` cho **tương tác**; dữ liệu trang (list/truyện/chương) do **SSR** trả sẵn → extension không cần quan tâm HTML nếu đã có JSON.

---

## 3. Mô hình dữ liệu

### 3.1 Novel object (`/api/novels/<slug>`, item của mọi list)

```jsonc
{
  "id": 14033,
  "title": "Tụ Bảo Tiên Bồn",
  "title_cn": "聚宝仙盆",
  "title_hv": "Tụ Bảo Tiên Bồn",
  "slug": "tu-bao-tien-bon",
  "image_url": "/anh-bia/tu-bao-tien-bon-14033.webp?v=1795842948",   // path tương đối
  "status": "ongoing",            // "ongoing" | "completed"
  "author": "Hương Quả Vị Nãi Trà",
  "is_hot": true,
  "is_new": false,
  "view": 4155099,
  "has_ai": true,                 // có edition AI
  "latest_chapter_number": 2414,  // = tổng số chương hiện có
  "updated_at": "2026-11-28T05:15:48",   // giờ VN (UTC+7), không có hậu tố Z
  "created_at": null,
  "last_ai_update": null,
  "description": "<p><strong>[Phàm nhân lưu]…</p>",   // HTML
  "categories": [                                        // CHỈ có ở /api/novels/<slug>
    { "id": 1, "name": "Tiên Hiệp", "slug": "tien-hiep" },
    { "id": 5, "name": "Kiếm Hiệp", "slug": "kiem-hiep" }
  ],
  "author_rel": { "id": 9874, "name": "Hương Quả Vị Nãi Trà", "slug": "huong-qua-vi-nai-tra", "description": null },
  "editions": [                                          // 1..2 phần tử
    { "id": 15923, "edition_name": "ai",      "first_chapter_slug": "1", "description": "…" },
    { "id": 15899, "edition_name": "convert", "first_chapter_slug": "1", "description": "…" }
  ]
}
```

> Item trong list (`/api/lists`, `/api/categories`, `/api/explore`, `/api/novels/search`) **không có** `categories`/`author_rel`; một số list trả `title_cn: null`, `title_hv: null`, `description: null` (đã lược bớt cho nhẹ).

### 3.2 Chapter object

```jsonc
// GET /api/novels/<slug>/chapters?page=1&size=3&edition_type=
{ "total": 2414, "page": 1, "size": 3,
  "items": [ { "id": 13554498, "chapter_number": 1, "title": "Kiểm Cá Phá Bồn",
               "status": "COMPLETED", "update_time": "2026-11-26T03:38:41.656818" } ] }
```

```jsonc
// GET /api/novels/<slug>/chapters/<n>?edition_type=ai
{
  "id": 18471682,                 // id của chương TRONG edition đã chọn
  "chapter_number": 2414,         // KHOÁ ỔN ĐỊNH — dùng cái này để build URL
  "title": "Hựu Tiến Lai Nhất Cá",
  "status": "COMPLETED",
  "update_time": "2026-11-28T04:45:57.636243",
  "content": "「Cái gì?」<br/><br/>Nghe được lời…",   // HTML, phân đoạn bằng <br/><br/>
  "novel_edition_id": 15923,
  "edition_name": "ai",                       // edition thực sự trả về
  "available_editions": ["convert", "ai"],
  "prev_chapter_number": 2413,
  "next_chapter_number": null,
  "is_raw": false,                            // true = chưa dịch, là bản convert thô
  "next_chapter_has_ai": false,
  "next2_chapter_number": null,
  "next2_chapter_has_ai": false,
  "pre_translation_status": null,
  "trust_challenge": "verify_silent",         // "verify_silent" | "verify_now" | "unauthorized"
  "chapter_token": "998e9cc4…",               // dùng cho /api-stream/translate-ai
  "proxy_status": "healthy",
  "system_tip": null
}
```

### 3.3 Edition (bản nội dung)

| `edition_name` | Path trang | `?edition_type=` | Ý nghĩa |
|---|---|---|---|
| `ai` | `/doc-truyen/ai/<slug>` | `ai` | Bản dịch AI (chất lượng cao nhất) |
| `convert` | `/doc-truyen/cv/<slug>` | `cv` | Bản convert thô (Hán Việt, có thể còn khoảng trắng giữa chữ) |
| `translate` | `/doc-truyen/<slug>` | `translate` | Bản dịch chuẩn (nếu có) |

Quy tắc **fallback đã kiểm chứng**:

- Không truyền `edition_type` → backend trả **`ai` nếu có**, ngược lại `convert`/`translate`.
  - `kiem-de` ch.100: mặc định `ai` (7341 ký tự); `?edition_type=cv` → `convert` (7871 ký tự); `?edition_type=translate` → rơi về `ai`.
  - `thien-hang-than-y` ch.642 (chỉ có `convert`): mặc định trả `convert`, `is_raw: true`.
- URL chương hợp lệ cho cả 3 edition: `/doc-truyen/<slug>/chuong-<n>`, `/doc-truyen/cv/<slug>/chuong-<n>`, `/doc-truyen/ai/<slug>/chuong-<n>` (đều 200).

### 3.4 Danh mục & list

- `GET /api/categories` → **66 thể loại** dạng `[{id,name,slug}]`.
- 6 list cố định (`/api/lists/<slug>`) — tổng đã đo:

| slug | ý nghĩa | total |
|---|---|---|
| `truyen-moi` | Truyện Mới | 17.230 |
| `truyen-hot` | Truyện Hot (top 100) | 100 |
| `truyen-full` | Truyện Full | 6.244 |
| `truyen-dich` | Truyện Dịch | 2.876 |
| `truyen-convert` | Truyện Convert | 14.793 |
| `truyen-dich-ai` | Truyện Dịch AI | 7.001 |

---

## 4. Danh mục API (tổng)

| # | Method | Endpoint | Nhóm |
|---|---|---|---|
| 1 | GET | `/api/novels/search?q=&page=&size=` | Tìm kiếm |
| 2 | GET | `/api/novels/<slug>` | Truyện |
| 3 | GET | `/api/novels/<slug>/chapters?page=&size=&edition_type=` | Mục lục |
| 4 | GET | `/api/novels/<slug>/chapters/<n>?edition_type=` | Nội dung chương |
| 5 | GET | `/api/novels/<id>/chapters/<n>/next-chapter-ai-status` | Trạng thái AI chương kế |
| 6 | POST | `/api/novels/<id>/view` | Đếm view |
| 7 | POST | `/api/novels/<slug>/chapters/<n>/repair?edition_type=` | Sửa chương lỗi |
| 8 | GET | `/api/lists/<slug>?page=&size=` | 6 danh sách |
| 9 | GET | `/api/categories` | Danh mục thể loại |
| 10 | GET | `/api/categories/<slug>?page=&size=` | Truyện theo thể loại |
| 11 | GET | `/api/explore?page=&size=&sort=&status=&category=&min_chapters=&max_chapters=` | Khám phá |
| 12 | GET | `/api/ads/config` | Cấu hình quảng cáo |
| 13 | GET | `/api/auth/me` | Phiên đăng nhập |
| 14 | POST | `/api/auth/google/onetap` | Đăng nhập Google |
| 15 | POST | `/api/auth/logout` | Đăng xuất |
| 16 | POST | `/api/auth/verify-turnstile` | Xác minh Turnstile |
| 17 | GET | `/api/reading-progress` | Lịch sử đọc |
| 18 | POST | `/api/reading-progress/sync` | Đồng bộ lịch sử đọc |
| 19 | POST | `/api/settings/sync` | Đồng bộ cài đặt đọc |
| 20 | POST | `/api/glossary/sync` | Đồng bộ glossary |
| 21 | POST | `/api/novels/<slug>/glossary` | Glossary riêng của truyện |
| 22 | GET | `/api/added-novels` | Tủ truyện |
| 23 | DELETE | `/api/added-novels/<id>` | Xoá khỏi tủ truyện |
| 24 | POST | `/api-stream/translate-ai` (SSE) | Dịch AI streaming |
| 25 | POST | `/api/tts/v2/sessions` | Tạo phiên TTS |
| 26 | GET | `/api/tts/v2/sessions/<sid>/chapters/<n>/playlist.m3u8` | HLS audio |
| 27 | POST | `/api/tts/v2/sessions/<sid>/stop` | Dừng TTS |
| 28 | GET | `/api/crawl/sources` | Nguồn crawl |
| 29 | GET | `/api/crawl/quota` | Hạn mức crawl |
| 30 | POST | `/api/crawl/parse` · `/resolve` · `/resolve-manual` · `/submit` | Thêm truyện |

**Extension chỉ cần #1–#11.**

---

## 5. Chi tiết endpoint (phần extension dùng)

### 5.1 `GET /api/novels/search`

| Param | Kiểu | Ghi chú |
|---|---|---|
| `q` | string, **bắt buộc** | `q=""` → 422 `string_too_short`. **Không phân biệt dấu**: `q=kiem de` khớp "Kiếm Đế" |
| `page` | int ≥ 1 | mặc định 1 |
| `size` | int 1..**200** | mặc định **20**; `size=500` → 422 `less_than_equal: 200` |

```jsonc
{ "total": 684, "page": 1, "size": 20, "items": [ { …novel… } ] }
```
Đo thực tế: `q=kiem` → 684 kết quả; `q=kiem de` → 31; `q=a` → 16.938.

> Đây là endpoint **tốt nhất** cho `search.js`: nhanh, có `total` để tính trang cuối, không cần parse HTML.

### 5.2 `GET /api/novels/<slug>`

Trả **novel object đầy đủ** (có `categories`, `author_rel`, `editions`). Dùng cho `detail.js`.
`<slug>` **không** phải id: `/api/novels/14033/chapters` → `total: 0`; `/api/novels` → 404.

### 5.3 `GET /api/novels/<slug>/chapters`

| Param | Ghi chú |
|---|---|
| `page` | ≥ 1 (0 → 422) |
| `size` | 1..**200**, mặc định **50** |
| `edition_type` | `ai` / `cv` / `translate` (không bắt buộc) |

- Sắp xếp **tăng dần** theo `chapter_number` (page 13/13 của truyện 2414 chương → chương 2401…2414).
- Không có endpoint "lấy tất cả". Muốn lấy 8178 chương → 41 request (200/lần).
- `total` = số chương của edition đang xét.

### 5.4 `GET /api/novels/<slug>/chapters/<n>?edition_type=`

Xem 3.2. Lưu ý:

- `content` là **HTML**, phân đoạn bằng `<br/><br/>`, thoại trong `「」`.
- Nếu `content === ""` **và** `trust_challenge === "verify_now"` → gọi lại 1 lần (đã gặp đúng 1 lần khi request lạnh từ IP lạ; lần 2 có nội dung). Nếu vẫn rỗng → báo lỗi hoặc thử `edition_type` khác.
- `is_raw: true` → là bản convert thô chưa dịch; vẫn đọc được, nên hiển thị bình thường.
- `available_editions` cho biết nên chào edition nào trong UI.

### 5.5 `GET /api/lists/<slug>` · `GET /api/categories/<slug>` · `GET /api/explore`

Cùng shape `{total,page,size,items[]}`. `page` ≥ 1, `size` tối đa **200** (list page dùng 24).

`/api/explore` — tham số lọc (đã kiểm chứng tác dụng):

| Param | Giá trị | Ảnh hưởng tới `total` |
|---|---|---|
| `sort` | `recommended` (mặc định của UI) / `new` / `updated` / `hot` / `views` | `recommended` → 180 (tập tuyển chọn); `new`/`hot`/`views` → 17.230; `updated` → sắp theo `updated_at` |
| `status` | `ongoing` / `completed` | 10.159 / 6.244 |
| `category` | slug thể loại | vd `kiem-hiep` → 483 |
| `min_chapters`, `max_chapters` | int | `min_chapters=500` → 5.993; `max_chapters=100` → 5.227 |

> `sort` không hợp lệ sẽ rơi về mặc định (sắp theo `view`). `q`/`search` **không** có tác dụng trên `/api/explore`.

### 5.6 Nhóm cần đăng nhập (không dùng cho extension)

`GET /api/reading-progress`, `GET /api/added-novels`, `GET /api/crawl/quota` → **401** `{"detail":{"error_code":"LOGIN_REQUIRED",…}}`.

`POST /api/settings/sync` body `{settings:{theme,fontSize,lineHeight,fontFamily,ttsVoice,ttsSpeed,ttsPitch},updatedAt}` → trả `{settings,updatedAt}`; chỉ chạy khi đã đăng nhập.

### 5.7 Nhóm AI/TTS (không dùng, nhưng ghi lại để hiểu site)

- `POST /api-stream/translate-ai` — SSE, body `{chapter_id, chapter_token, novel_id, chapter_number, is_retry, is_retranslation}`, header `Accept: text/event-stream`. 429 → UI báo "chờ 1 phút".
- `POST /api/auth/verify-turnstile` body `{token, pending_action?:{action_type:"pre_translate"|"tts_stream", novel_id, chapter_number}}`.
- `POST /api/tts/v2/sessions` body `{slug, chapter_number, edition_type, voice, rate, speed, pitch, volume, bookmark}` → có `session_id`, `chain_id`; phát qua `/api/tts/v2/sessions/<sid>/chapters/<n>/playlist.m3u8` (HLS), dừng bằng `POST …/stop`.
- `GET /api/ads/config` → `{masterEnabled, placements:{chapter-top,chapter-mid,chapter-bottom,novel-detail,pop}, …}` với các mạng `aads, clickadu, adsterra, exoclick, monetag, hilltopads, adcash, adskeeper, bidvertiser, clickadilla, profiton`.

---

## 6. Trang ↔ API (đã xác nhận bằng capture trên Chrome thật)

| Trang | API quan sát được | Ghi chú |
|---|---|---|
| `/` | `GET /api/auth/me` + prefetch `?_rsc=` | dữ liệu trang chủ do SSR |
| `/kham-pha` | `GET /api/auth/me`, **`GET /api/explore?page=1&size=24&sort=recommended`** | khám phá tải client-side |
| `/doc-truyen/<slug>` | `GET /api/ads/config`, `GET /api/auth/me` | chi tiết + 50 chương đầu do SSR (`initialData`) |
| `/doc-truyen/<slug>/chuong-<n>` | `GET /api/ads/config`, `GET /api/auth/me`, **`POST /api/novels/17790/view`** | view bắn sau ~3s, debounce theo chương |
| `/the-loai/<slug>` | `GET /api/auth/me` | **SSR 24 truyện/trang; `?page=` KHÔNG có tác dụng** — phân trang chỉ qua `GET /api/categories/<slug>?page&size` |
| `/danh-sach/<slug>` | `GET /api/auth/me` | SSR 24 truyện; phân trang qua `GET /api/lists/<slug>?page&size` |
| `/tim-kiem?q=&page=` | `GET /api/auth/me` | **SSR, `?page=` CÓ tác dụng** (24 kết quả/trang) |
| `/tu-truyen` | `GET /api/auth/me` (+ `GET /api/added-novels` khi đã đăng nhập) | |
| `/them-truyen` | `GET /api/crawl/sources`, `/api/crawl/quota` | |
| `/tai-khoan` | `GET /api/auth/me` | |
| `/chinh-sach`, `/dmca`, `/lien-he`, `/ve-chung-toi`, `/dieu-khoan` | — | trang tĩnh |

---

## 7. Đặc tả extension `truyendichus`

Thư mục: `truyendichus/` (theo `README.md` của repo, giữ `src/` plaintext + `plugin.json` + `icon.png` + `plugin.zip` build bằng `vbook.js`).

### 7.1 `plugin.json`

```json
{
  "metadata": {
    "name": "Truyện Dịch AI (us)",
    "author": "Personal",
    "version": 1,
    "source": "https://truyendich.us",
    "description": "Tìm, xem chi tiết, mục lục và đọc truyện dịch AI từ truyendich.us (API JSON, không cần Turnstile).",
    "locale": "vi",
    "regexp": "(?:www\\.)?truyendich\\.(?:us|fit|space)/doc-truyen/(?:(?:cv|ai|translate)/)?[^/?#]+/?$",
    "type": "novel",
    "nsfw": false,
    "encrypt": false
  },
  "script": {
    "home": "home.js",
    "explore": "explore.js",
    "genre": "genre.js",
    "search": "search.js",
    "detail": "detail.js",
    "toc": "toc.js",
    "page": "page.js",
    "chap": "chap.js"
  },
  "config": {
    "DOMAIN": { "title": "Website", "default": "https://truyendich.us", "mode": "input", "format": "text" }
  }
}
```

> `regexp` khớp cả `/doc-truyen/<slug>`, `/doc-truyen/cv/<slug>`, `/doc-truyen/ai/<slug>` — để bấm link trên trình duyệt là mở được trong app. **Không** khớp URL chương (có thêm `/chuong-<n>`) vì đó không phải trang detail.

### 7.2 `src/config.js`

```js
let BASE_URL = "https://truyendich.us";
try { if (DOMAIN) BASE_URL = DOMAIN; } catch (e) {}

function normalizeUrl(url) {
    return String(url || "").replace(/^(?:https?:\/\/)?(?:[^@\n]+@)?(?:www\.)?([^:\/\n?]+)/im, BASE_URL);
}

function absUrl(p) {
    if (!p) return "";
    if (p.indexOf("http") === 0) return p;
    return BASE_URL + (p.charAt(0) === "/" ? "" : "/") + p;
}

// /doc-truyen/cv/<slug> | /doc-truyen/ai/<slug> | /doc-truyen/translate/<slug>  ->  {slug, edition}
function parseDetailUrl(url) {
    var m = String(url).match(/\/doc-truyen\/(?:(cv|ai|translate)\/)?([^\/?#]+)/);
    if (!m) return null;
    return { slug: m[2], edition: m[1] || "" };
}

function editionQuery(edition) {
    if (edition === "cv") return "cv";
    if (edition === "ai") return "ai";
    if (edition === "translate") return "translate";
    return "";
}

function apiGet(path, queries) {
    var opts = {};
    if (queries) opts.queries = queries;
    var res = fetch(BASE_URL + path, opts);
    if (!res.ok) return { ok: false, status: res.status, data: null };
    try { return { ok: true, status: res.status, data: res.json() }; }
    catch (e) { return { ok: false, status: res.status, data: null }; }
}

function apiUrl(path, queries) {
    var q = [];
    if (queries) {
        for (var k in queries) {
            if (queries[k] === undefined || queries[k] === null || queries[k] === "") continue;
            q.push(encodeURIComponent(k) + "=" + encodeURIComponent(queries[k]));
        }
    }
    return BASE_URL + path + (q.length ? "?" + q.join("&") : "");
}

function escapeHtml(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function stripHtml(s) {
    return String(s == null ? "" : s).replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "").trim();
}

var LOGIN_MESSAGE = "Mục này cần đăng nhập trên truyendich.us (vBook không hỗ trợ đăng nhập Google trong extension).";
```

### 7.3 `src/home.js`

```js
load('config.js');

function tab(title, input) {
    return { title: title, input: input, script: "search.js" };
}

function execute() {
    return Response.success([
        tab("Truyện Mới",    "list:truyen-moi"),
        tab("Truyện Hot",    "list:truyen-hot"),
        tab("Truyện Dịch AI","list:truyen-dich-ai"),
        tab("Truyện Full",   "list:truyen-full"),
        tab("Tiên Hiệp",     "cat:tien-hiep"),
        tab("Huyền Huyễn",   "cat:huyen-huyen"),
        tab("Đô Thị",        "cat:do-thi")
    ]);
}
```

### 7.4 `src/explore.js`

```js
load('config.js');

function section(id, title, type, input) {
    return { id: id, title: title, type: type, script: "search.js", input: input,
             more: { type: "list", name: title, script: "search.js", input: input } };
}

function execute() {
    var lists = [
        ["moi",   "Truyện Mới",      "list:truyen-moi"],
        ["hot",   "Truyện Hot",      "list:truyen-hot"],
        ["ai",    "Truyện Dịch AI",  "list:truyen-dich-ai"],
        ["full",  "Truyện Full",     "list:truyen-full"],
        ["dich",  "Truyện Dịch",     "list:truyen-dich"],
        ["cv",    "Truyện Convert",  "list:truyen-convert"]
    ];
    var out = [];
    for (var i = 0; i < lists.length; i++) out.push(section(lists[i][0], lists[i][1], "horizontal_list", lists[i][2]));

    // Chip thể loại: lấy từ /api/categories (66 mục)
    var res = apiGet("/api/categories");
    if (res.ok && res.data && res.data.length) {
        var chips = [];
        for (var j = 0; j < res.data.length; j++) {
            chips.push({ name: res.data[j].name, action: { type: "list", name: res.data[j].name, script: "search.js", input: "cat:" + res.data[j].slug } });
        }
        out.push({ id: "genres", title: "Thể Loại", type: "chip", items: chips });
    }
    return Response.success(out);
}
```

### 7.5 `src/genre.js`

```js
load('config.js');

function execute() {
    var res = apiGet("/api/categories");
    if (!res.ok || !res.data || !res.data.length) return Response.error("Không tải được danh mục (HTTP " + res.status + ").");
    var genres = [];
    for (var i = 0; i < res.data.length; i++) {
        genres.push({ title: res.data[i].name, input: "cat:" + res.data[i].slug, script: "search.js" });
    }
    return Response.success(genres);
}
```

### 7.6 `src/search.js`

Xử lý 3 loại `input`:
- `list:<slug>` → `/api/lists/<slug>`
- `cat:<slug>` → `/api/categories/<slug>`
- còn lại → `/api/novels/search?q=`

```js
load('config.js');

var PAGE_SIZE = 24;

function toItem(n) {
    var tags = [];
    if (n.status === "completed") tags.push("Full");
    if (n.has_ai) tags.push("AI");
    return {
        name: n.title,
        link: absUrl("/doc-truyen/" + n.slug),
        cover: absUrl(n.image_url),
        description: (n.author || "") + (n.latest_chapter_number ? " · " + n.latest_chapter_number + " chương" : ""),
        tag: tags.join(" · "),
        host: BASE_URL
    };
}

function execute(query, page) {
    query = String(query || "").trim();
    var p = parseInt(page || "1", 10);
    if (!p || p < 1) p = 1;

    var res;
    if (query.indexOf("list:") === 0) {
        res = apiGet("/api/lists/" + query.substring(5), { page: p, size: PAGE_SIZE });
    } else if (query.indexOf("cat:") === 0) {
        res = apiGet("/api/categories/" + query.substring(4), { page: p, size: PAGE_SIZE });
    } else if (query) {
        res = apiGet("/api/novels/search", { q: query, page: p, size: PAGE_SIZE });
    } else {
        // Người dùng bấm tab rỗng: trả danh sách mới nhất
        res = apiGet("/api/lists/truyen-moi", { page: p, size: PAGE_SIZE });
    }

    if (!res.ok || !res.data) return Response.error("Không tải được danh sách (HTTP " + res.status + ").");
    var items = res.data.items || [];
    var out = [];
    for (var i = 0; i < items.length; i++) out.push(toItem(items[i]));

    var total = res.data.total || 0;
    var next = "";
    if (items.length > 0 && p * PAGE_SIZE < total) next = String(p + 1);
    return Response.success(out, next);
}
```

> `page` là token do chính `search.js` trả về (`data2`), nên đổi `PAGE_SIZE` không phá vỡ trạng thái.

### 7.7 `src/detail.js`

```js
load('config.js');

function execute(url) {
    url = normalizeUrl(url);
    var parsed = parseDetailUrl(url);
    if (!parsed) return Response.error("URL không hợp lệ: " + url);

    var res = apiGet("/api/novels/" + encodeURIComponent(parsed.slug));
    if (!res.ok || !res.data) return Response.error("Không tải được truyện (HTTP " + res.status + ").");
    var n = res.data;

    var info = [];
    if (n.author) info.push("Tác giả: " + escapeHtml(n.author));
    if (n.title_cn) info.push("Tên gốc: " + escapeHtml(n.title_cn));
    if (n.latest_chapter_number) info.push("Số chương: " + n.latest_chapter_number);
    if (n.view) info.push("Lượt xem: " + n.view);
    if (n.updated_at) info.push("Cập nhật: " + String(n.updated_at).replace("T", " ").substring(0, 16));
    if (n.editions && n.editions.length) {
        var eds = [];
        for (var e = 0; e < n.editions.length; e++) eds.push(n.editions[e].edition_name);
        info.push("Bản nội dung: " + eds.join(", "));
    }

    var genres = [];
    if (n.categories) {
        for (var i = 0; i < n.categories.length; i++) {
            genres.push({ title: n.categories[i].name, input: "cat:" + n.categories[i].slug, script: "search.js" });
        }
    }

    return Response.success({
        name: n.title,
        author: n.author || "",
        cover: absUrl(n.image_url),
        description: n.description || "",
        detail: info.join("<br>"),
        url: absUrl("/doc-truyen/" + n.slug),
        type: "novel",
        format: "novel",
        ongoing: n.status !== "completed",
        genres: genres
    });
}
```

### 7.8 Mục lục: `src/page.js` + `src/toc.js`

Truyện lớn nhất đo được: 8.178 chương (`tieu-dao-tu-cong-tu`) → **41 trang × 200**. Dùng `page.js` để app tải lười (detail chỉ tải trang 1, reader tải hết).

`src/page.js` — trả danh sách URL trang mục lục (phải **tuyệt đối**):

```js
load('config.js');

var TOC_PAGE_SIZE = 200;

function execute(url) {
    var parsed = parseDetailUrl(normalizeUrl(url));
    if (!parsed) return Response.error("URL không hợp lệ.");
    var first = apiGet("/api/novels/" + encodeURIComponent(parsed.slug) + "/chapters",
                       { page: 1, size: TOC_PAGE_SIZE });
    if (!first.ok || !first.data) return Response.error("Không tải được mục lục (HTTP " + first.status + ").");
    var total = first.data.total || 0;
    var pages = Math.max(1, Math.ceil(total / TOC_PAGE_SIZE));
    var urls = [];
    for (var i = 1; i <= pages; i++) {
        urls.push(apiUrl("/api/novels/" + encodeURIComponent(parsed.slug) + "/chapters",
                         { page: i, size: TOC_PAGE_SIZE }));
    }
    return Response.success(urls);
}
```

`src/toc.js` — nhận cả URL detail và URL API:

```js
load('config.js');

function chapterUrl(slug, number, edition) {
    var prefix = edition === "cv" ? "/doc-truyen/cv/" : edition === "ai" ? "/doc-truyen/ai/" : "/doc-truyen/";
    return BASE_URL + prefix + slug + "/chuong-" + number;
}

function execute(url) {
    url = normalizeUrl(url);
    var slug, edition, apiPath;

    var m = String(url).match(/\/api\/novels\/([^\/?#]+)\/chapters/);
    if (m) {
        slug = decodeURIComponent(m[1]);
        edition = "";
        apiPath = url.replace(/^https?:\/\/[^\/]+/, "");
    } else {
        var parsed = parseDetailUrl(url);
        if (!parsed) return Response.error("URL không hợp lệ: " + url);
        slug = parsed.slug;
        edition = parsed.edition;
        apiPath = "/api/novels/" + encodeURIComponent(slug) + "/chapters?page=1&size=200";
    }

    var res = fetch(BASE_URL + apiPath);
    if (!res.ok) return Response.error("Không tải được mục lục (HTTP " + res.status + ").");
    var data;
    try { data = res.json(); } catch (e) { return Response.error("Mục lục không phải JSON."); }

    var items = (data && data.items) || [];
    if (!items.length) return Response.error("Mục lục trống.");

    var chapters = [];
    for (var i = 0; i < items.length; i++) {
        var it = items[i];
        chapters.push({
            name: "Chương " + it.chapter_number + (it.title ? ": " + it.title : ""),
            url: chapterUrl(slug, it.chapter_number, edition),
            description: it.status && it.status !== "COMPLETED" ? it.status : "",
            lock: false,
            pay: false
        });
    }
    return Response.success(chapters);
}
```

**Phương án B (không dùng `page.js`)** — nếu muốn giữ `toc.js` đơn giản, gộp tất cả trang trong 1 lần gọi:

```js
function execute(url) {
    var parsed = parseDetailUrl(normalizeUrl(url));
    var slug = parsed.slug, edition = parsed.edition;
    var chapters = [], page = 1, total = Infinity, size = 200;
    while ((page - 1) * size < total) {
        var r = fetch(apiUrl("/api/novels/" + encodeURIComponent(slug) + "/chapters", { page: page, size: size }));
        if (!r.ok) { if (page === 1) return Response.error("HTTP " + r.status); break; }
        var d = r.json();
        total = d.total || 0;
        var items = d.items || [];
        if (!items.length) break;
        for (var i = 0; i < items.length; i++) {
            chapters.push({ name: "Chương " + items[i].chapter_number + ": " + (items[i].title || ""),
                            url: chapterUrl(slug, items[i].chapter_number, edition), description: "", lock: false, pay: false });
        }
        page++;
    }
    if (!chapters.length) return Response.error("Mục lục trống.");
    return Response.success(chapters);
}
```
Nhược điểm: truyện 8.000 chương = 41 request tuần tự trong 1 lần gọi (chậm, dễ timeout). **Khuyến nghị dùng `page.js`.**

### 7.9 `src/chap.js`

```js
load('config.js');

function contentToHtml(content) {
    // Nội dung là HTML với <br/><br/> làm ranh giới đoạn.
    var parts = String(content || "").split(/<br\s*\/?>\s*<br\s*\/?>/i);
    var html = "";
    for (var i = 0; i < parts.length; i++) {
        var t = parts[i].replace(/<br\s*\/?>/gi, "<br>").trim();
        if (t) html += "<p>" + t + "</p>";
    }
    return html;
}

function fetchChapter(slug, number, edition) {
    var path = "/api/novels/" + encodeURIComponent(slug) + "/chapters/" + number;
    var queries = edition ? { edition_type: edition } : null;
    var res = fetch(apiUrl(path, queries));
    if (!res.ok) return { status: res.status, data: null };
    var data = null;
    try { data = res.json(); } catch (e) {}
    return { status: res.status, data: data };
}

function execute(url) {
    url = normalizeUrl(url);
    var m = String(url).match(/\/doc-truyen\/(?:(cv|ai|translate)\/)?([^\/?#]+)\/chuong-(\d+)/);
    if (!m) return Response.error("URL chương không hợp lệ: " + url);
    var edition = m[1] || "";
    var slug = m[2];
    var number = parseInt(m[3], 10);

    var r = fetchChapter(slug, number, edition);
    if (!r.data) return Response.error("Không tải được chương (HTTP " + r.status + ").");

    // Lần gọi lạnh đôi khi trả content rỗng + trust_challenge=verify_now: thử lại 1 lần.
    if (!r.data.content && r.data.trust_challenge === "verify_now") {
        r = fetchChapter(slug, number, edition);
        if (!r.data) return Response.error("Không tải được chương (HTTP " + r.status + ").");
    }

    var content = r.data.content || "";
    if (!content) {
        // Thử edition khác nếu có
        var alts = r.data.available_editions || [];
        for (var i = 0; i < alts.length; i++) {
            var alt = alts[i] === "convert" ? "cv" : alts[i];
            if (alt === edition) continue;
            var r2 = fetchChapter(slug, number, alt);
            if (r2.data && r2.data.content) { content = r2.data.content; break; }
        }
    }
    if (!content) {
        return Response.error("Chương này chưa có nội dung trên truyendich.us. Thử lại sau hoặc mở bằng bản " +
            ((r.data.available_editions || []).join("/") || "khác") + ".");
    }

    var html = contentToHtml(content);
    var note = "";
    if (r.data.is_raw) note = "<p><em>(Bản convert thô, chưa qua dịch AI.)</em></p>";
    return Response.success(note + html);
}
```

**Không cần** `Engine.newBrowser()`, **không cần** cookie, **không cần** Turnstile cho luồng đọc chương này.

---

## 8. Cạm bẫy & rủi ro

1. **`size` tối đa 200** cho `/chapters`, `/lists`, `/categories`, `/explore`, `/novels/search` → 422 nếu vượt.
2. **`/the-loai/<slug>?page=N` bị bỏ qua** (SSR luôn trả trang 1) — đừng viết `search.js` parse HTML + `?page=`. Dùng JSON API.
3. **`/tim-kiem` thì ngược lại**: phân trang bằng `?page=` hoạt động, nhưng **không có JSON** → chỉ dùng HTML nếu muốn (không cần, đã có `/api/novels/search`).
4. **`chapter_number` là khoá**, không phải `id` (mỗi edition có `id` khác nhau cho cùng chương).
5. **`content: ""` + `trust_challenge: "verify_now"`**: hiếm, gọi lại 1 lần là được. Đừng retry vô hạn.
6. **`is_raw: true`**: bản convert thô, vẫn đọc được; đừng coi là lỗi.
7. **Timestamp `updated_at` là giờ VN, không có `Z`** — đừng `new Date()` trực tiếp rồi hiển thị UTC.
8. **Domain**: `.fit` có thể bị chặn TLS ở VN (đã gặp: TCP mở nhưng handshake treo). Mặc định `.us`, cho đổi qua config `DOMAIN`.
9. **403/429**: backend có `SOFT_FORBIDDEN` + `x-cooldown-seconds`, và rate-limit 429. Extension chỉ đọc nên hiếm gặp; nếu gặp, trả `Response.error` kèm hướng dẫn chờ, **không** spam retry.
10. **Không** gọi `POST /api/novels/<id>/view`, `POST /api/glossary/sync`, `POST /api/reading-progress/sync` — vBook tự quản lý lịch sử đọc, gọi thêm là tạo dữ liệu rác cho site.
11. `description` của novel là **HTML** (có `<p>`, `<strong>`) — trả nguyên cho `detail.description`, vBook sẽ flatten.
12. Ảnh bìa là path tương đối `"/anh-bia/…webp?v=<unix>"` → phải `absUrl()`. Có thể dùng `referrerpolicy: "no-referrer"` như `truyendichai` nếu ảnh bị chặn hotlink.

---

## 9. Checklist test (dùng `vbook.js`)

| Script | Input thử | Kỳ vọng |
|---|---|---|
| `genre.js` | — | 66 thể loại, có "Tiên Hiệp", "Đam Mỹ" |
| `home.js` | — | 7 tab, mỗi tab có dữ liệu |
| `explore.js` | — | 6 hàng ngang + 1 hàng chip 66 thể loại |
| `search.js` | `kiem` | 24 item, `next = "2"`, trang 2 khác trang 1 (684 kết quả → 29 trang) |
| `search.js` | `list:truyen-hot` | 24 item, `next` có, trang 5 là trang cuối (100 kết quả) |
| `search.js` | `cat:tien-hiep` | 24 item, `next` tới trang 85 (2032 kết quả) |
| `detail.js` | `/doc-truyen/tu-bao-tien-bon` | tên, tác giả, 4 thể loại, 2414 chương, bản `ai`+`convert` |
| `detail.js` | `/doc-truyen/cv/tu-bao-tien-bon` | như trên (phải strip prefix `/cv/`) |
| `page.js` | `/doc-truyen/tieu-dao-tu-cong-tu` | 41 URL (8178 chương / 200) |
| `toc.js` | URL từ `page.js` | 200 chương/trang, `url` dạng `/doc-truyen/<slug>/chuong-<n>` |
| `chap.js` | `/doc-truyen/tu-bao-tien-bon/chuong-2414` | > 7000 ký tự, nhiều `<p>` |
| `chap.js` | `/doc-truyen/cv/kiem-de/chuong-100` | bản convert (dài hơn bản `ai`: 7.871 vs 7.341 ký tự) |
| `chap.js` | `/doc-truyen/thien-hang-than-y/chuong-642` | chỉ có edition `convert`, vẫn có nội dung |

Lệnh (theo `AGENTS.md`, dùng `scripts/vbook.js`):

```bash
node .agents/skills/vbook-extensions/scripts/vbook.js connect
MSYS_NO_PATHCONV=1 node .agents/skills/vbook-extensions/scripts/vbook.js test truyendichus search.js kiem
MSYS_NO_PATHCONV=1 node .agents/skills/vbook-extensions/scripts/vbook.js test truyendichus detail.js /doc-truyen/tu-bao-tien-bon
```

> Trên Git Bash phải đặt `MSYS_NO_PATHCONV=1`, nếu không `/doc-truyen/...` bị đổi thành đường dẫn Windows.

---

## 10. Phụ lục

### 10.1 Selector HTML (chỉ dùng khi bắt buộc parse HTML)

**Trang `/tim-kiem?q=&page=`** (24 kết quả/trang):

| Dữ liệu | Selector |
|---|---|
| card | `main a[href^="/doc-truyen/"]` |
| tên | card `h3` (chứa `<mark>` highlight → dùng `.text()` để bỏ markup) |
| bìa | card `img` → `src` |
| link | card `href` |
| tổng | chuỗi "Tìm thấy N kết quả" |
| trang kế | `a[href*="page="]` có text "Trang sau →" |

**Trang `/doc-truyen/<slug>`**:

| Dữ liệu | Selector |
|---|---|
| tên | `h1` |
| tên gốc | `h1` + sibling `span` (chữ Hán) |
| tác giả | khối có nhãn "Tác giả" → `p` |
| thể loại | `a[href^="/the-loai/"]` |
| trạng thái | nhãn "Trạng thái" → "Đang ra" / "Hoàn thành" |
| số chương | nhãn "Số chương" → `p` |
| giới thiệu | khối "Giới thiệu truyện" → `.prose` |
| bìa | `meta[property="og:image"]` |
| tab edition | `a[href^="/doc-truyen/cv/"]`, `a[href^="/doc-truyen/ai/"]` |
| chương | `a[href*="/chuong-"]` (SSR chỉ 50 chương đầu) |

### 10.2 Bảng tra nhanh endpoint

```bash
# tìm kiếm
curl -s 'https://truyendich.us/api/novels/search?q=kiem&page=1&size=20'

# chi tiết
curl -s 'https://truyendich.us/api/novels/tu-bao-tien-bon'

# mục lục (200/trang)
curl -s 'https://truyendich.us/api/novels/tu-bao-tien-bon/chapters?page=1&size=200'

# nội dung chương
curl -s 'https://truyendich.us/api/novels/tu-bao-tien-bon/chapters/2414'
curl -s 'https://truyendich.us/api/novels/kiem-de/chapters/100?edition_type=cv'

# danh mục & list
curl -s 'https://truyendich.us/api/categories'
curl -s 'https://truyendich.us/api/categories/tien-hiep?page=1&size=24'
curl -s 'https://truyendich.us/api/lists/truyen-dich-ai?page=1&size=24'
curl -s 'https://truyendich.us/api/explore?page=1&size=24&sort=updated'
```

### 10.3 Số liệu đo được (2026-11-28)

| Hạng mục | Giá trị |
|---|---|
| Tổng truyện (`/api/lists/truyen-moi`) | 17.230 |
| Thể loại | 66 |
| Truyện nhiều chương nhất trong mẫu | 8.178 (`tieu-dao-tu-cong-tu`) |
| `size` tối đa | 200 (chapters/lists/categories/explore/search) |
| `size` mặc định | chapters 50 · lists/categories 24 · search 20 · explore 24 |
| `total` trang chương | 642 (`thien-hang-than-y`), 2414 (`tu-bao-tien-bon`) |
| Route tĩnh trong sitemap | 76 |
| API endpoint client dùng | 31 |

### 10.4 Khác biệt với extension `truyendichai` (đừng copy nguyên)

| | `truyendichai` (Astro) | `truyendichus` (Next.js) |
|---|---|---|
| Nội dung chương | **không** có trong HTML, phải stream dịch + Turnstile | **có sẵn** trong JSON |
| `chap.js` | `Engine.newBrowser()` + poll DOM | `fetch()` JSON |
| Mục lục | `chapters.json` theo `source` | `/api/novels/<slug>/chapters` phân trang |
| Tìm kiếm | parse HTML `.md` | API JSON |
| Đăng nhập | bắt buộc cho nhiều truyện | không cần |
| Cloudflare | managed challenge 403 | chỉ rate-limit |

---

## 11. Việc cần làm tiếp

1. Scaffold `truyendichus/` từ `.agents/skills/vbook-extensions/templates/novel/` + 8 file ở mục 7.
2. `icon.png` (lấy từ `https://truyendich.us/icon.webp` → PNG 256×256).
3. Chạy checklist mục 9 trên thiết bị, ghi kết quả PASS/FAIL vào `truyendichus/HANDOFF.md`.
4. Nếu PASS: `vbook.js build`, thêm entry vào `plugin.json` gốc, `python scripts/check_repo.py`, commit.
5. Cân nhắc mở rộng sau (không cần cho v1): tab "Khám phá" dùng `/api/explore` với bộ lọc `status`/`min_chapters`/`max_chapters`; chọn edition trong `detail` (truyền `/doc-truyen/cv/<slug>` để `toc`/`chap` theo bản convert).
