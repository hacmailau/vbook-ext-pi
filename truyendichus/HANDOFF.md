# Truyện Dịch AI (us) — bàn giao

**PASS sau khi chờ cooldown:** probe trả HTTP 403 `SOFT_FORBIDDEN` với `Retry-After: 20` và `X-Cooldown-Seconds: 20`. Chờ 21 giây rồi thử `chap.js` đúng một lần, không đăng nhập lại: code 0, chương 13 «Trường Kiến Thức», 11023 ký tự HTML. Probe đã xóa, chưa sửa extension.

**FAIL ban đầu khi đọc liên tiếp trên `.space`:** người dùng báo dừng ở chương 13 Thiên Hàng Thần Y. Test riêng `chap.js` bằng `vbook.js` trên Samsung SM-A146P (USB forward cổng 8080) trả `{"code":1,"data":"Không tải được chương: HTTP 403"}`. Các script khác không chạy lại trong lần này. Xem lựa chọn A/B trong [SPEC.md](SPEC.md). Chưa chỉnh mã hoặc cài lại.

**PASS tất cả 8 script trên mặc định mới `.space` (v2).**

Chạy `vbook.js test` trên Samsung SM-A146P: tất cả `code:0`. Home: 7 tab; genre: 66; explore: 6 hàng + 66 chip; search: hai trang `kiem` khác nhau (24 truyện mỗi trang, next `2`/`3`) và cả 9 input tab/hàng trả 24 truyện mỗi input. Detail chấp nhận link `.us` và trả link/bìa `.space`; page: 13 URL; toc: 200 và 14 chương ở trang đầu/cuối; chap: chương 2414, 7704 ký tự HTML.

Bảng dưới là lần kiểm tra ban đầu với `.us`; kết quả mirror nằm cuối file.

| Script | Trạng thái | Bằng chứng |
|---|---|---|
| home.js | PASS | `"code": 0`, đúng 7 tab và input; chưa kiểm tra dữ liệu từng tab. |
| detail.js | FAIL | `{"code":1,"data":"Không tải được truyện: HTTP 504"}` |
| page.js | UNTESTED | Cần URL do detail trả về. |
| toc.js | UNTESTED | Cần URL do page trả về. |
| chap.js | UNTESTED | Cần URL do toc trả về. |
| search.js | UNTESTED | Chờ xác minh kết nối site. |
| genre.js | UNTESTED | Chờ xác minh kết nối site. |
| explore.js | UNTESTED | Chờ xác minh kết nối site và từng section. |

CLI kết nối được thiết bị Samsung SM-A146P qua cổng 8080 đã forward về localhost. Dòng cuối `[test] code=200` là HTTP của dev server, không phải kết quả script. Input detail: `https://truyendich.us/doc-truyen/tu-bao-tien-bon`. Từ PC, curl tới API .us báo `curl: (35) Recv failure: Connection was reset`. Chưa lấy được icon từ .us; thử đường dẫn icon trên .fit và .space đều timeout từ PC. Chưa xác định site hay đường mạng là nguyên nhân.

Đã thử hướng A: người dùng xác nhận trang truyện mở được trong Chrome trên điện thoại. Chạy lại `detail.js` qua CLI vẫn trả `{"code":1,"data":"Không tải được truyện: HTTP 504"}`. Người dùng cũng mở được URL API trực tiếp trong Chrome, trả JSON với 2414 chương. Probe A2 qua `vbook.js` đã tái hiện `ok:false, status:504` cho cả trang truyện (793 ms) và API (1181 ms), không parse JSON. Probe đã xóa. A3 đã tái hiện `detail.js` trả HTTP 504; `adb logcat` lọc PID vBook ghi nhận 0 dòng trong lần tái hiện, chưa rõ nguyên nhân. Probe B đã xác nhận `fetch` trên `.space` trả `ok:true, status:200`, đúng tên truyện và 2414 chương trong 586 ms. Probe đã xóa; xem [SPEC.md](SPEC.md). Chuỗi đọc trên `.space` đã PASS qua `vbook.js`, dùng bản sao tạm với `source`, `DOMAIN.default` và fallback cùng trỏ mirror (đã dọn): `detail` code 0, đúng tên/tác giả/4 thể loại; `page` code 0, 13 URL; `toc` code 0, trang 1 có 200 chương, trang 13 có 14 chương (2401–2414); `chap` code 0, chương 2414 có 7704 ký tự HTML và 84 đoạn. Sau khi người dùng chốt, source chính chuyển sang `.space` và được kiểm tra lại như ghi ở trên. Không có icon, chưa build, cài đặt, thêm registry, commit hoặc push.
