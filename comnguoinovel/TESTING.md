# TESTING: `comnguoinovel`

Các kiểm tra dưới đây đã được chạy trong lúc sửa `chap.js` (v5). Tài liệu này ghi lại để chạy lại
bằng tay hoặc đưa vào CI/CD. Mỗi mục ghi rõ có cần thiết bị hay không.

Các lệnh chạy từ thư mục gốc repo. Đặt biến để ngắn gọn:

```bash
V="node .agents/skills/vbook-extensions/scripts/vbook.js"
S="--server http://127.0.0.1:8080"   # hoặc đặt VBOOK_SERVER
```

## 1. Kiểm tra tĩnh (không cần thiết bị, chạy được trên CI)

| ID | Lệnh | Kỳ vọng |
|---|---|---|
| S1 | `python scripts/check_repo.py` | exit 0 |
| S2 | `grep -n -E "=>\|\`\|\?\.\|\.\.\.\|async \|await \|\blet \b\|\bconst \b" comnguoinovel/src/chap.js comnguoinovel/src/reader.js` | Không có kết quả (Rhino không hỗ trợ các cú pháp này). Lưu ý: `pageRead()` chạy trong WebView Chrome nên không bị giới hạn Rhino, nhưng vẫn nên giữ cùng phong cách. |
| S3 | Giải nén `comnguoinovel/plugin.zip` rồi so từng file trong `src/` với bản trong repo (`cmp`) | Giống hệt. `plugin.json` trong zip có cùng `metadata.version` với `comnguoinovel/plugin.json`. |
| S4 | `grep -n -i -E "secret\|apikey\|api_key\|password" comnguoinovel/src/*.js comnguoinovel/plugin.json` | Không có secret thật. Tên biến chứa `token` (ví dụ `chapterTokenFromHtml`) là bình thường. |
| S5 | Tìm serial thiết bị, đường dẫn thư mục người dùng, IP nội bộ, token trong tài liệu và `src/` | Không có kết quả. |

## 2. Kiểm tra trên thiết bị (cần vBook dev server)

Điều kiện:

- Điện thoại cài vBook, bật debug/dev server cổng 8080, có mạng truy cập được
  `comnguoinovel.site` (4G/5G nếu mạng công ty chặn TLS).
- `adb forward tcp:8080 tcp:8080`, rồi `$V connect $S`. Lệnh này phải in tên thiết bị.
- Với nhóm `chap.js`: trước khi chạy, mở "Trang nguồn" của một chương trong vBook và hoàn tất xác
  minh trên website. Cookie phiên đọc sống khoảng 31 phút. Đây là bước thủ công của người dùng,
  không tự động hoá.

`code:0` chưa đủ. Mỗi mục cần kiểm tra thêm dữ liệu như cột "Kỳ vọng".

| ID | Lệnh | Kỳ vọng (đã quan sát) |
|---|---|---|
| D1 | `$V test comnguoinovel search.js "ac mong" 1 $S` | `code:0`. Có truyện "Ác Mộng Kinh Tập": `link` = `https://comnguoinovel.site/truyen/ac-mong-kinh-tap`, `cover` là URL tuyệt đối, `description` kết thúc bằng "1740 chương", `tag` "Hoàn thành". `data2` = `""`. |
| D2 | `$V test comnguoinovel detail.js "https://comnguoinovel.site/truyen/ac-mong-kinh-tap" $S` | `code:0`. `name` "Ác Mộng Kinh Tập", có `author`, `cover`, `description` dạng `<p>`, `detail` chứa "Số chương: 1740", `type` và `format` là `novel`, `ongoing` là `false`. |
| D3 | `$V test comnguoinovel toc.js "https://comnguoinovel.site/truyen/ac-mong-kinh-tap" $S` | `code:0`. Mỗi phần tử có `name`, `url` dạng `.../chuong/N`, `lock`, `pay`. Chương 1 đến 6 có `lock:false`. **Chưa kiểm chứng:** tổng số phần tử (kỳ vọng khoảng 1740) và `lock:true` của chương 11. |
| D4 | `$V test comnguoinovel home.js $S` | `code:0`. Phần tử đầu: `title` "Mới cập nhật", `input` `latest`. |
| D5 | `$V test comnguoinovel explore.js $S` | `code:0`. Phần tử đầu: `id` `latest`, `title` "Mới cập nhật". |
| D6 | `$V test comnguoinovel genre.js $S` | `code:0`. Phần tử đầu: `title` "Bách Hợp", `input` `genre:bach-hop`. |
| D7 | `$V test comnguoinovel chap.js "https://comnguoinovel.site/truyen/ac-mong-kinh-tap/chuong/1" $S` (phiên đã xác minh) | `code:0`. `data` là chuỗi các thẻ `<p>`. Đoạn đầu: "**Giải thích về Ác mộng (kèm theo một số thiết lập)**". |
| D8 | Như D7 với `.../chuong/11` (chương `lock:true` trong mục lục) | `code:0`. Các thẻ `<p>`, đoạn đầu "Chương 10: Số Đo" (xem mục "Chưa kiểm chứng" trong HANDOFF.md). |
| D9 | Như D7 khi **chưa** xác minh hoặc cookie đã hết hạn | `code:1`. Thông báo chứa "Trang nguồn" và `READ_SESSION_REQUIRED`. **Chưa kiểm chứng** trên thiết bị. |
| D10 | Như D7 với một chương của truyện khác | **Chưa kiểm chứng.** |

### Trường hợp hồi quy đã gặp

Hai lỗi này đã xảy ra và đã sửa. Nên giữ làm test hồi quy:

- **R1, token thiếu bit:** chương 11 từng báo "Không giải mã được mã chương." vì SVG chỉ có 90
  trong 99 `<rect>`. Kỳ vọng: D7 và D8 đều không còn lỗi này.
- **R2, 403 `CHAPTER_CLIENT_FORBIDDEN`:** xảy ra khi gọi API bằng `fetch` của extension. Kỳ vọng: `chap.js`
  không gọi API bằng `fetch`, mà chạy trong `Engine.newBrowser()` (xem HANDOFF.md §2).

## 3. Đề xuất cho CI/CD

- **Tầng 1, chạy mọi lần push (không cần thiết bị):** S1 đến S5.
- **Tầng 2, runner tự quản có điện thoại thật:** D1 đến D6 (không cần xác minh). Dùng `testall`
  của `vbook.js` hoặc từng lệnh ở trên, kiểm tra thêm dữ liệu theo cột "Kỳ vọng".
- **Không đưa vào CI tự động:** D7 đến D10. Chúng cần người dùng xác minh trên website trước. Cookie
  Turnstile do website cấp cho người thật. Không tự động hoá hay giả lập bước này. Nếu cần chạy, để
  người phụ trách mở "Trang nguồn" rồi kích hoạt job thủ công trong vòng khoảng 30 phút.
- Dữ liệu trong cột "Kỳ vọng" lấy từ website thật nên có thể đổi theo thời gian (số chương, thứ
  tự thể loại). Khi so sánh, ưu tiên kiểm tra cấu trúc và trường bắt buộc thay vì chuỗi cố định.
