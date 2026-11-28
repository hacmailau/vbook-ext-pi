# Lịch sử thay đổi

## Bản 3

- Đóng gói icon nguồn vào `plugin.zip`. Icon lấy từ mirror `truyendich.space` và chuyển từ WebP sang PNG.
- Đồng bộ phiên bản, tên miền, mô tả và đường dẫn icon giữa gói phát hành và registry. Không thay đổi mã đọc truyện.
- Đã đối chiếu manifest và icon trong ZIP với các tệp nguồn; chưa cài thử bản 3 trên thiết bị.

## Bản 2

- Đổi tên miền mặc định sang `truyendich.space` vì API trên `.us` trả 504 trong vBook. Vẫn nhận link `.us`, `.fit` và `.space`.
- Cả 8 script đã qua kiểm tra trên Android. Đã cài thử và đọc được truyện trong vBook.
- Giới hạn tạm thời `403 SOFT_FORBIDDEN` vẫn do website áp dụng. Đã xác nhận có thể đọc tiếp sau thời gian chờ mà không cần đăng nhập lại trong lần thử; extension không tự lưu token.

## Bản 1 — chưa phát hành

- Triển khai tìm kiếm, khám phá, thể loại, chi tiết, mục lục phân trang và đọc chương qua API JSON.

Xem [HANDOFF.md](HANDOFF.md) để biết kết quả kiểm tra và các trường hợp còn hạn chế.
