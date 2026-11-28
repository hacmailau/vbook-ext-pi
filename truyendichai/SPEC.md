# SPEC: truyendichai (novel)

Status: needs-info. Ngày khảo sát: 2026-11-28. Chưa viết code.

## Cập nhật sau khi người dùng qua Cloudflare và đăng nhập (Chrome CDP)

- Mục lục `/truyen/<slug>/danh-sach-chuong-day-du.md` trả 200 khi có cookie: 1373 dòng dạng `- [Chương N: Tên](URL)`, một trang, không phân trang. Không cookie thì 403.
- **Trang chương không chứa nội dung trong HTML.** Bản `.md` ghi: "This chapter is awaiting AI stream translation and is currently uncached." HTML chỉ có khung `ChapterReaderShell` (Astro island).
- Nội dung được dịch tại chỗ: JS gọi `POST /api/getChapterStream` với `novel_id`, `source_id`, `chapter_url`, `translator`, `is_free`, `use_memory`, `target_lang`, đọc stream rồi đổ vào `article#chapter-article-body.chapter-prose` (217 thẻ `<p>` ở chương 1).
- Bundle `ChapterReaderShell.l1B9IzqG.js`: khi `is_free` (hoặc model không dùng API key riêng của user), request cần **token Cloudflare Turnstile** (`turnstileSiteKey`). Khi user dùng API key riêng thì không cần token.
- Nội dung mẫu chương 1 lẫn Hán Việt và chuỗi rác của model (`"-> Wait, mus`), lỗi từ phía site.
- Không gọi thẳng `/api/getChapterStream`: cần token Turnstile, và robots.txt chặn `/api/`. Tạo token giả là vượt cơ chế chống bot, không làm.

### Phương án chap mới (thay cho A/B/C cũ)

- **B1. WebView render trang chương.** `Engine.newBrowser()` mở URL chương, để JS của site tự xin Turnstile và dịch, chờ tới khi `#chapter-article-body` có chữ và ổn định, rồi lấy HTML. Mỗi chương có thể mất 10-60 giây; Turnstile có thể đòi tương tác trong WebView ẩn và thất bại.
- **B2. Như B1 nhưng chỉ cho chế độ API key riêng.** Người dùng cấu hình key Gemini trong tài khoản site; site không cần Turnstile. Vẫn phải chờ stream dịch.
- **D. Bỏ chap đọc trực tiếp.** `chap` trả lỗi hướng dẫn mở chương trong trình duyệt vBook. Extension chỉ còn tìm, xem chi tiết, mục lục.

`toc` dùng `fetch` bản `.md` (cookie `cf_clearance` của vBook), gặp 403 thì báo mở trình duyệt vBook, theo phương án C người dùng đã chọn.

## Dữ kiện đã kiểm chứng

Dữ liệu lấy qua Chrome có cổng CDP 9222, chạy `fetch` cùng origin trong tab `https://truyendichai.com/`.

### Mạng

- DNS mạng hiện tại trả `truyendichai.com` về sinkhole Palo Alto. DNS `8.8.8.8` trả về Cloudflare (`104.21.90.78`, `172.67.153.253`).
- Từ PC, curl tới IP Cloudflare vẫn không kết nối được. Từ điện thoại SM-A146P, `fetch` trong vBook trả `ok:false, status:504`.

### Cấu trúc site

- Site dựng bằng Astro (bundle `/_astro/*.js`).
- Theo `llms.txt`, mọi trang HTML có bản Markdown khi thêm đuôi `.md` hoặc gửi header `Accept: text/markdown`.

| Trang | URL | Truy cập không cần cookie |
|---|---|---|
| Trang chủ | `/`, `/index.md`: bảng "Mới cập nhật", "Đọc nhiều tuần", "Top Vé Tháng Qidian" | 200 |
| Tìm kiếm | `/tim-truyen`, `/tim-truyen.md` (20 dòng), `/tim-truyen?q=...` | 200 |
| Thể loại | `/the-loai/<slug>`, `/the-loai/<slug>.md`. Slug đã thấy: tien-hiep, huyen-huyen, do-thi, ky-huyen, vo-hiep, linh-di, lich-su-quan-su, canh-ky | 200 |
| Xếp hạng | `/xep-hang/ve-thang`, `/xep-hang/ban-chay`, `/xep-hang/chi-so-doc`, `/xep-hang/top-truyen-<năm>` | chưa thử |
| Chi tiết | `/truyen/<slug>`, `/truyen/<slug>.md`: front-matter có title, author, genre, tags, status, chapters, cùng phần "Giới thiệu" và "Chương mới nhất" | 200 |
| Mục lục | `/truyen/<slug>/danh-sach-chuong-day-du` | **403, Cloudflare managed challenge** |
| Chương | `/truyen/<slug>/<nguồn>/<slug-chương>`, ví dụ `/truyen/vo-luong-dao-quan/69shuba/chuong-1151-...`. Nguồn đã thấy: `69shuba`, `sudugu` | **403, Cloudflare managed challenge** (cả bản `.md`) |
| Feed | `/rss.xml` (truyện mới), `/feed/new-chapters.xml` (chương mới) | 200 |
| Ảnh bìa | `/api/thumb/<id>` (webp) | 200 |

- `regexp` dự kiến: `truyendichai\.com/truyen/[^/]+/?$`. Mẫu này không khớp URL chương, vì URL chương có thêm phân đoạn thứ ba.
- Một truyện có thể có nhiều nguồn. Ví dụ `vo-luong-dao-quan`: front-matter ghi 1373 chương, nhưng trang chi tiết chỉ liệt kê chương của `69shuba` tới chương 1152.

## Vấn đề chưa rõ

1. **Cloudflare chặn mục lục và chương.** Cả hai trang trả 403 "Just a moment..." kể cả khi `fetch` kèm cookie. Profile Chrome mới chưa có cookie `cf_clearance`. Chưa biết vBook có vượt qua được không:
   - `fetch` thường không chạy được JavaScript của thử thách.
   - `Engine.newBrowser().launch()` là WebView có chạy JS, nhưng chưa test thử thách loại managed.
   - API ghi rằng `fetch` dùng chung cookie jar của app. Nếu người dùng mở site trong trình duyệt của vBook để qua thử thách, `cf_clearance` có thể được lưu lại cho `fetch`. Điều này chưa kiểm chứng.
2. **Điện thoại không vào được site** qua mạng hiện tại, nên chưa chạy được `vbook.js test`.
3. **Chưa thấy markup** của trang mục lục và trang chương.

## Phương án cho toc/chap

- **A. Dùng `fetch` và cookie của vBook.** Người dùng mở site trong trình duyệt vBook một lần. `toc` và `chap` gọi `fetch`, khi gặp 403 thì trả lỗi hướng dẫn mở trình duyệt. Script nhẹ nhất, nhưng phụ thuộc vào thời hạn `cf_clearance`.
- **B. Dùng WebView (`Engine.newBrowser`).** `toc` và `chap` mở trang trong WebView, chờ thử thách tự qua, rồi đọc DOM. Chạy chậm hơn (vài giây mỗi chương) và chưa chắc qua được thử thách managed. comnguoinovel đang dùng cách tương tự.
- **C. Kết hợp.** Gọi `fetch` trước, nếu gặp 403 thì chuyển sang WebView.

`detail`, `home`, `genre`, `search` không bị chặn, dùng `fetch` và bản `.md` hoặc HTML.

## Bước tiếp theo

1. Người dùng mở một trang chương trong Chrome CDP và tự vượt thử thách Cloudflare, để agent đọc được markup mục lục và chương.
2. Người dùng làm cho điện thoại vào được site (VPN hoặc Private DNS), rồi thử A, B, C trên thiết bị.
3. Người dùng chọn phương án, sau đó mới scaffold và viết code.

## Probe B1 trên điện thoại (2026-11-28, SM-A146P)

Kết quả: **FAIL do mạng**, chưa đánh giá được B1.

- `fetch` mục lục `.md`: HTTP 504.
- `Engine.newBrowser().launch(chapterUrl)`: trang lỗi `chrome-error://chromewebdata/` ("Trang web hiện không khả dụng") trong suốt 48 giây.
- `ping truyendichai.com` trên điện thoại: phân giải về `127.0.0.1`. `private_dns_mode` = `off`, không có VPN đang chạy.
- Kết luận: DNS nhà mạng chặn tên miền. Việc người dùng vào được site trên Android có thể là qua Chrome có Secure DNS riêng, không áp dụng cho vBook.
- Probe tạm `src/probe_chap.js` đã xoá. Còn lại `plugin.json` khung (chưa có script).

## Probe trên điện thoại lần 2 (2026-11-28, có VPN, đã đăng nhập trong trình duyệt vBook)

`ping truyendichai.com` trên điện thoại ra `104.21.90.78`. `fetch` từ vBook:

| URL | HTTP | Ghi chú |
|---|---|---|
| `/index.md` | 200 | 5159 byte |
| `/truyen/vo-luong-dao-quan.md` | 200 | 7531 byte |
| `/tim-truyen.md?q=truong%20sinh` | 200 | 3896 byte |
| `/data/toc.json?novelId=12901&sourceId=4` | 200 | 143802 byte, `total: 1373`, không bị Cloudflare chặn |
| `/truyen/vo-luong-dao-quan/danh-sach-chuong-day-du.md` | 403 | Cloudflare |

- `novelId` có trên trang chi tiết HTML (`data-novel-id="12901"`). `sourceId` chưa thấy trên trang chi tiết; `toc.json` cần cả hai.
- WebView (`Engine.newBrowser().launch`) mở chương 2: kẹt ở trang Cloudflare "Chờ một chút..." suốt 60 giây, không ra nội dung. B1 FAIL ở lần thử này.
- Chưa rõ vì sao: WebView ẩn có dùng chung cookie `cf_clearance` với trình duyệt vBook không, hay thử thách bắt tương tác.
- Probe tạm đã xoá.

## Kết quả test script (2026-11-28, SM-A146P, VPN, đã đăng nhập trong trình duyệt vBook)

| Script | Trạng thái | Bằng chứng |
|---|---|---|
| detail | PASS | `vo-luong-dao-quan`: tên, tác giả, bìa `/api/thumb/...`, giới thiệu, genres `Tiên Hiệp`, nguồn `sudugu` |
| toc | PASS | 1484 chương, URL tuyệt đối, không trùng, lấy từ `/data/chapters.json?novelId&source` |
| chap (chương đã có bản dịch) | PASS | `69shuba/chuong-2-...`: 74 đoạn, 12784 ký tự |
| chap (chương chưa dịch) | FAIL | `sudugu/chuong-1-...-4`: trang hiện "Đang xác minh bảo mật..." rồi sau ~60 giây "Turnstile verification timed out" |
| search | PASS | "truong sinh": 20 kết quả, trang 2 có, next "3" |
| home | PASS | 5 tab; `/tim-truyen`, `?sort=view_all` mỗi tab 20 truyện |
| genre | PASS | 13 thể loại; `/the-loai/tien-hiep` trang 1 và 2 mỗi trang 20 truyện |

Nguyên nhân FAIL đã xác định: chương chưa có bản dịch phải được dịch qua `/api/getChapterStream`. Tài khoản miễn phí cần token Turnstile, và Turnstile không hoàn tất trong WebView ẩn của vBook. Chương đã có bản dịch (cache) thì không cần Turnstile.

Lưu ý khi test trên Git Bash: đặt `MSYS_NO_PATHCONV=1`, nếu không tham số `/tim-truyen` bị đổi thành đường dẫn Windows.

## Cách 3 (người dùng chọn): báo lỗi sớm + hỗ trợ API key

- `chap.js` dò chữ "Đang xác minh bảo mật" và "GIÁN ĐOẠN LUỒNG DỊCH AI" trên trang. Nếu thấy hai lần liên tiếp mà chưa có đoạn văn nào, script báo lỗi và hướng dẫn mở chương trong trình duyệt vBook hoặc gắn API key Gemini.
- Nếu đoạn văn đang được stream (trường hợp có API key), script chờ tới khi độ dài không đổi qua 2 lần kiểm tra.
- Test: `69shuba/chuong-2-...` PASS (74 đoạn, 12 giây). `sudugu/chuong-2-...-5` (chưa dịch) báo lỗi sau 8 giây, thay vì 60 giây như trước.
- Nhánh API key: UNTESTED, cần người dùng gắn key trong tài khoản site.
