# HANDOFF: đọc chương của `comnguoinovel`

Trạng thái: **PASS** (v5). `chap.js` đọc được chương 1 (`lock:false`) và chương 11 (`lock:true`)
qua `vbook.js`, và nội dung chương hiển thị trên app vBook. Quy trình kiểm thử lặp lại được nằm
trong [TESTING.md](TESTING.md).

## 1. Cách đọc chương hiện tại

`chap.js` chạy theo thứ tự:

1. `route()` (trong `config.js`) tách `slug` và số chương từ URL.
2. `fetch` HTML trang chương. Trang là Next.js App Router, nội dung chương **không** có trong
   HTML. HTML chỉ chứa prop `tokenCanvas`.
3. `chapterTokenFromHtml()` giải mã `tokenCanvas`: một ảnh SVG `data:image/svg+xml;base64,...`
   kích thước 11x9. Mỗi pixel cho 3 bit (`channel & 1` theo thứ tự R, G, B, theo hàng). Lưới bắt
   đầu bằng màu nền `#f0f0f0`, rồi các `<rect>` ghi đè từng pixel. Pixel không có `<rect>` giữ màu
   nền. 16 bit đầu là độ dài, sau đó mỗi 8 bit là một ký tự ASCII. Kết quả phải khớp
   `/^[a-f0-9]{32}$/`.
4. `readChapter()` mở `Engine.newBrowser()` tại URL chương, rồi chạy `pageRead()` bằng `callJs`.
   `pageRead()` gửi `POST https://api.comnguoinovel.site/api/novels/{slug}/chap/{n}/read` bằng XHR
   đồng bộ, với `withCredentials`, header `X-Chapter-Token`, `Idempotency-Key` ngẫu nhiên,
   `X-Chapter-Read-Contract-Version: 1`, và `Authorization: Bearer` lấy từ
   `localStorage.accessToken` của trang. Kết quả (`status`, `body`) trả về qua
   `putVariable` / `getVariable`.
5. `decodeChapterContent()` giải mã AES (CryptoJS, passphrase nằm trong `reader.js`) rồi đảo thứ
   tự dòng. `paragraphHtml()` tạo các thẻ `<p>`.

Lỗi được map sang tiếng Việt trong `readErrorMessage()` (`reader.js`).

## 2. Vì sao phải chạy trong WebView

- `fetch` của extension gọi cùng API bị trả `403 CHAPTER_CLIENT_FORBIDDEN` ("Forbidden:
  Automation tools are not allowed").
- Cùng request chạy trong trang của `Engine.newBrowser()` trả `200` kèm `content`. Request này
  dùng phiên của WebView: cookie (kể cả HttpOnly) và `localStorage`.
- API còn yêu cầu cookie phiên đọc `__Host-tdmp_reader` (HttpOnly, Secure, SameSite=Strict, sống
  khoảng 31 phút) do Cloudflare Turnstile cấp. Cookie này chỉ có sau khi người dùng xác minh
  trên website, nên extension phụ thuộc vào bước đó.
- Extension không đọc hay sao chép cookie, không tự giải Turnstile, không giả lập client.
  Không được thêm các cách đó.

**Điều kiện hoạt động:** người dùng đã mở "Trang nguồn" của chương trong vBook và hoàn tất xác
minh. Khi chưa xác minh hoặc cookie hết hạn, API trả `403 READ_SESSION_REQUIRED` và `chap.js`
hiện thông báo hướng dẫn bấm "Trang nguồn" rồi tải lại chương.

## 3. Bài học từ lần điều tra (tránh làm lại)

- **Không đọc nội dung bằng React Fiber hay chờ DOM render.** WebView của `Engine.newBrowser()`
  không phát `onload`/`onerror` cho ảnh (cả SVG data-URL lẫn PNG). Hàm giải mã `tokenCanvas`
  của trang vì thế treo, query nội dung không bật và trang kẹt ở các khung skeleton. `chap.js`
  cũ chờ 30 giây rồi báo hết thời gian. Selector `main` hay `div.container` không phải nguyên
  nhân.
- Token phải giải mã bằng code thuần trong Rhino, không dùng canvas.
- SVG của các chương có số `<rect>` khác nhau (chương 1: 99, chương 11: 90 trên lưới 99). Nếu bỏ
  qua pixel nền, token thiếu bit và chỉ còn 31 ký tự.
- `GET /novels/{slug}/chap/{n}` cũ trả `410 LEGACY_CHAPTER_READ_RETIRED`. Chỉ dùng `POST .../read`.
- Mạng công ty có thể chặn TLS tới `comnguoinovel.site`. Nên để điện thoại dùng 4G/5G và kết nối
  `vbook.js` qua `adb forward tcp:8080 tcp:8080`.

## 4. Chưa kiểm chứng

- Bản v5 trên app mới được xác nhận ở mức "nội dung chương hiển thị". Chưa test có hệ thống các
  trường hợp bên dưới.
- Trường hợp phiên chưa xác minh hoặc đã hết hạn: thông báo hướng dẫn chưa được thấy trên app.
- Truyện khác ngoài `ac-mong-kinh-tap`.
- Thời gian tải mỗi chương. `readChapter()` mở cả trang chương, có thể chờ gần hết 15 giây của
  `launch`. Chưa đo.
- Nội dung chương 11 bắt đầu bằng "Chương 10: Số Đo", còn mục lục ghi "Chương 11: Số đo". Chưa biết
  đây là dữ liệu gốc của website hay lỗi của extension.
- Mã lỗi `ADS_REQUIRED`, `READING_COOLDOWN`, `CHAPTER_TEMPORARILY_UNAVAILABLE`, `401` và chương
  khoá mà tài khoản không có quyền: đã có thông báo trong code, chưa gặp phản hồi thật.

## 5. Rủi ro

Website ghi rõ không cho phép công cụ tự động. Cách hiện tại hoạt động vì request đi từ phiên
WebView thật của người dùng đã đăng nhập. Nếu website siết chính sách, chương có thể lại bị chặn
và tài khoản có thể bị giới hạn.

## 6. Mẹo khi làm việc

- Git Bash trên Windows đổi đường dẫn `/sdcard` thành đường dẫn Windows. Đặt
  `MSYS_NO_PATHCONV=1` trước các lệnh `adb shell`.
- Không chạy `vbook.js test` song song với lúc đang sửa file nguồn. Kết quả có thể ứng với bản
  file cũ.
- File probe tạm đặt trong `src/` phải xoá sau khi test (xem `AGENTS.md`).
- Không commit cookie, token, HAR hay evidence bundle vào repo.
