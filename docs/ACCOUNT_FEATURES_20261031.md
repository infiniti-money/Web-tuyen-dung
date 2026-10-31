# Hưng Yên Jobs — tài khoản, gợi ý việc làm và quản lý CV

## Tính năng triển khai

1. **Việc làm đã lưu đồng bộ:** người dùng chưa đăng nhập tiếp tục lưu UUID công việc trong trình duyệt. Khi đăng nhập, hệ thống chuyển các dấu trang chưa đăng nhập lên `public.saved_jobs` theo `user_id`, rồi xóa dấu trang cục bộ đã chuyển. Mỗi tài khoản có bộ dấu trang riêng; đồng bộ sau khi đăng nhập trên thiết bị khác. Sửa trên trang sẽ cập nhật cơ sở dữ liệu ngay; nếu lỗi sẽ không cập nhật UI.
2. **Thông báo việc làm phù hợp trong website:** ứng viên lưu từ khóa, ngành nghề, địa bàn, lương tối thiểu, bật/tắt và thời điểm đánh dấu đã xem trong `public.job_alert_preferences`. Khi mở `#alerts`, ứng dụng lấy tối đa 200 tin đã xuất bản và đối chiếu. Số "Mới" dựa vào `created_at > last_seen_at`. Đây **không phải** email định kỳ, push trên điện thoại hay công việc chạy ngầm.
3. **Quản lý CV cá nhân:** `#cv` chỉ dành cho ứng viên. Tải PDF tối đa 5MB vào bucket private `candidate-cvs`, lưu metadata trong `public.candidate_documents`. Xem qua signed URL 60 giây, xóa nếu tệp chưa gắn với bất cứ đơn ứng tuyển nào. CV từ các đơn ứng tuyển cũ vẫn được liệt kê riêng.
4. **Sử dụng lại CV đã lưu:** biểu mẫu nộp đơn cho phép chọn CV đang sở hữu mà không tải lại. Đường dẫn phải thuộc danh sách metadata mà ứng viên đang được phép đọc; kho RLS tiếp tục bảo vệ việc đọc CV của Nhà tuyển dụng và Admin.
5. **Hồ sơ doanh nghiệp nâng cao:** thêm ngành, quy mô, năm thành lập, website HTTPS, phúc lợi. Chủ sở hữu có thể sửa những trường thông tin này. Trang công khai chỉ hiển thị doanh nghiệp `approved`, HTML được escape và chỉ cho phép liên kết website HTTPS.

## An toàn dữ liệu

- Migration: `supabase/migrations/20261031053000_account_alerts_cv_company_profiles.sql`.
- Các bảng mới đã bật RLS và chỉ cấp SELECT/INSERT/DELETE/UPDATE thiết yếu cho role `authenticated` có `auth.uid()` đúng chủ dữ liệu.
- Tài khoản khác không thể xem dấu trang, sở thích hoặc metadata CV; `anon` không được cấp quyền đọc.
- CV đang gắn với đơn ứng tuyển **không được phép xóa** từ thư viện; không thay đổi file CV hoặc bản ghi ứng tuyển đã lưu từ trước.
- Vẫn còn vấn đề cần giải quyết trước khi mời người dùng đại trà tại issue #6.

## Kiểm thử

- SQL transaction với `ROLLBACK`: Ứng viên tạo/xem dữ liệu của mình; Nhà tuyển dụng khác không nhìn thấy; khách `anon` không có quyền SELECT.
- Chạy `node --check`, smoke test Node, build Pages và Playwright trên trình duyệt điện thoại.
- Kiểm thử ứng viên thật: đăng nhập, lưu 1 tin, đăng nhập trên thiết bị khác để xem tin đã lưu; đặt từ khóa thông báo; tải CV và tái sử dụng; mở hồ sơ doanh nghiệp kiểm tra website HTTPS.
- Tránh yêu cầu hoặc lưu mật khẩu, khóa bí mật và CV cá nhân trong mã nguồn hoặc artifacts.

## Giới hạn hiện tại

Trang gợi ý việc làm chỉ lọc 200 tin gần nhất trong trình duyệt. Khi quy mô tăng cần chuyển việc ghép tiêu chí và phân trang sang cơ sở dữ liệu, xây dựng dịch vụ thông báo qua email/push có opt-in, giới hạn tốc độ và giám sát.
