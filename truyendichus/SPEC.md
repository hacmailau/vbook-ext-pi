# Xác minh kết nối truyendich.us

## Đọc liên tiếp trên `.space`

Người dùng báo mở nhanh khoảng 12 chương rồi lỗi tại `https://truyendich.space/doc-truyen/thien-hang-than-y/chuong-13`; phải mở Browser Nguồn. `vbook.js test` trên Samsung SM-A146P tái hiện `{"code":1,"data":"Không tải được chương: HTTP 403"}`. Probe tạm xác nhận HTTP 403 `SOFT_FORBIDDEN`, `Retry-After: 20`, `X-Cooldown-Seconds: 20`. Sau khi chờ 21 giây và không mở Browser Nguồn hay đăng nhập lại trong lần thử này, `chap.js` trả code 0, chương 13 «Trường Kiến Thức», 11023 ký tự HTML. Xác nhận cooldown tạm thời, chưa biết ngưỡng hoặc mục đích chính xác. Probe đã xóa. Đề xuất hiển thị thời gian còn lại từ header và để người dùng thử lại sau; không tự retry trong thời gian chờ.

- **A. Chẩn đoán**: sau một lần lỗi, mở chương trong Browser Nguồn theo luồng chính thức, ghi nhận có yêu cầu đăng nhập/xác minh không, rồi thử lại đúng URL một lần. Không thu cookie/token hay gửi dồn request.
- **B. Sửa thông báo**: giữ nguyên xác thực, hướng dẫn người dùng chờ và mở Browser Nguồn nếu website yêu cầu đăng nhập/xác minh. Không tự động retry 403 hoặc cache token.

Đặc tả nguồn: [truyendichus.md](../truyendichus.md). Source v1 dùng API JSON công khai và giữ edition trong chuỗi detail → page → toc → chap. Không dùng WebView hay API dịch streaming.

Dev server nhận lệnh bình thường; script detail trả HTTP 504 từ lớp fetch và PC gặp reset TLS khi gọi API .us. Chưa có bằng chứng lỗi mapping hay xác định nguyên nhân HTTP 504. Không đổi domain mặc định hay thêm workaround khi chưa kiểm chứng.

- **A. Đã thực hiện**: Chrome trên điện thoại mở được cả trang truyện lẫn API `.us`. JSON do người dùng cung cấp xác nhận `id: 14033`, `latest_chapter_number: 2414`, 4 thể loại và 2 edition (`ai`, `convert`). Lần chạy lại vBook vẫn trả HTTP 504. Chưa xác định vì sao hai ứng dụng cho kết quả khác nhau.
- **A2. Đã thực hiện**: probe GET tối giản trên Samsung SM-A146P qua `vbook.js` trả `{"ok":false,"status":504,"elapsedMs":793}` cho trang truyện và `{"ok":false,"status":504,"elapsedMs":1181}` cho API; timeout cấu hình 15000 ms. Lỗi tái hiện không cần parse JSON, và không riêng endpoint API. Chưa phân biệt được lỗi transport của fetch với phản hồi HTTP từ phía mạng. Probe đã xóa; không đổi source chính.
- **A3. Đã thực hiện**: `vbook.js test` chạy lại `detail.js` và trả `{"code":1,"data":"Không tải được truyện: HTTP 504"}`. `adb logcat` lọc PID vBook từ thời điểm bắt đầu tái hiện báo `process log entries: 0`. Chưa có dữ liệu để kết luận DNS, TLS hay lỗi kết nối khác. Không đổi mã nguồn.
- **B. Probe mirror `.space` PASS**: Chrome trả JSON và `vbook.js test` trên Samsung SM-A146P trả `{"ok":true,"status":200,"elapsedMs":586,"title":"Tụ Bảo Tiên Bồn","chapters":2414}`. Probe đã xóa. Bước tiếp theo: kiểm tra chuỗi `detail → page → toc → chap` với cấu hình mirror; chưa đổi domain mặc định.
