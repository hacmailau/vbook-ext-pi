# HANDOFF: truyendichai

Cập nhật: 2026-11-28. Trạng thái: v1 đã build (plugin.zip 44938 byte), cài lên SM-A146P (install code=200), thêm vào registry gốc. Tất cả script PASS; chap với chương chưa dịch báo lỗi sau ~8 giây (Turnstile). Nhánh API key Gemini: UNTESTED.

## Đã làm
- Khảo sát site qua Chrome CDP, ghi trong `SPEC.md`.
- Người dùng chọn: toc theo phương án C (fetch, 403 thì hướng dẫn mở trình duyệt vBook); chap theo B1 (WebView render trang chương).
- Tạo `plugin.json` khung (detail, toc, chap; regexp đã kiểm với URL truyện và URL chương).

## Đang chặn
- Điện thoại phân giải `truyendichai.com` về `127.0.0.1` (DNS nhà mạng). vBook không vào được site: fetch 504, WebView `chrome-error`.

## Bước tiếp theo (mới)
- Người dùng mở đúng chương 2 trong trình duyệt vBook, qua Cloudflare, rồi chạy lại probe WebView ngay. Nếu vẫn kẹt: B1 không khả thi, chọn D (chap báo mở trình duyệt) hoặc B2.
- Viết detail/search/home/genre/toc bằng fetch (`.md` + `/data/toc.json`); cần tìm cách lấy `sourceId` từ trang chi tiết.

## Bước tiếp theo (cũ, đã xong bước 1)
1. Người dùng bật Private DNS trên Android: Cài đặt → Kết nối → Cài đặt kết nối khác → DNS riêng tư → `one.one.one.one` (hoặc `dns.google`). Kiểm tra: `adb shell ping -c1 truyendichai.com` không còn ra `127.0.0.1`.
2. Mở `https://truyendichai.com/truyen/vo-luong-dao-quan/69shuba/chuong-2-luyen-che-ho-than-phu-cau-phieu-tu` trong trình duyệt của vBook, qua Cloudflare, đăng nhập.
3. Chạy lại probe B1 (tạo lại `src/probe_chap.js` theo mô tả trong SPEC: fetch toc `.md`, launch WebView, poll `#chapter-article-body` mỗi 4 giây), rồi mới viết detail/toc/chap.

## Kết nối thiết bị
Xem `HANDOFF.md` gốc mục 5 (`adb forward tcp:8080 tcp:8080`, `vbook.js connect --server http://127.0.0.1:8080`).
