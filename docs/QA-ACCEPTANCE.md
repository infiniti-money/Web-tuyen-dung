# Hưng Yên Jobs — Kiểm thử nghiệm thu trước khi mở công khai

Ngày kiểm thử SQL: 31/10/2026 (Asia/Bangkok).
Dự án Supabase: `hung-yen-jobs` (`lxarzbxymgjomsztftqj`).
Website: https://infiniti-money.github.io/Web-tuyen-dung/app.html

## Kết quả đã kiểm tra trên PostgreSQL thực tế

Đã chạy bài thử toàn bộ quy trình dưới giao dịch `BEGIN ... ROLLBACK` với
3 tài khoản mô phỏng (employer, candidate A, candidate B) và một ngữ cảnh Admin
đã được cấp quyền. Kết quả: **PASS**.

Các tình huống được xác minh:
- Tự tạo `profiles` với vai trò employer/candidate từ đăng ký giả lập.
- Nhà tuyển dụng tạo company ở trạng thái pending; không thể tự duyệt company.
- Nhà tuyển dụng không thể tự cấp vai trò admin.
- Admin có thể duyệt company.
- Tin đăng cố xuất bản trực tiếp sẽ bị chuyển về pending.
- Tin pending ẩn với khách; tin được Admin duyệt published thì khách xem được.
- Ứng viên tạo application và trạng thái mới bị cưỡng chế thành submitted.
- Ứng viên không được thay đổi trạng thái hồ sơ của chính mình.
- Ứng viên B không đọc được hồ sơ hoặc profile của ứng viên A.
- Hệ thống bác bỏ đường dẫn CV mạo danh ứng viên A.
- Nhà tuyển dụng đọc được thông tin ứng viên A thông qua scoped RPC,
  nhưng không đọc trực tiếp toàn bộ bảng profile ứng viên.
- Nhà tuyển dụng đổi trạng thái application sang shortlisted; ứng viên thấy trạng thái mới.

**Toàn bộ fixture đã rollback**, xác minh sau thử nghiệm: 1 admin có thật, 0
company, 0 job, 0 application, 0 CV và không còn tài khoản mô phỏng.

## Các bước kiểm thử giao diện bắt buộc (cần 2 email kiểm thử do người dùng sở hữu)

Không dùng mật khẩu, OTP, CV thật hoặc thông tin cá nhân thật trong báo cáo kiểm thử.

1. **Admin:** dùng tài khoản quản trị đã được xác minh. Kiểm tra có trang
   duyệt Doanh nghiệp và Tin tuyển dụng.
2. **Employer:** đăng xuất Admin; đăng ký bằng một email thứ hai bạn kiểm soát,
   chọn Nhà tuyển dụng, xác thực email, đăng nhập. Đăng ký doanh nghiệp
   `CTY KIỂM THỬ HƯNG YÊN` tại `Mỹ Hào`; phải thấy `pending`.
3. **Admin:** đăng xuất Employer, đăng nhập lại Admin, duyệt công ty sang
   `approved`.
4. **Employer:** đăng nhập Employer, tạo tin `[TEST] Nhân viên kho Hưng Yên`,
   ngành `Kho vận`, địa điểm `Mỹ Hào`, lương từ 8 đến 12 triệu.
   Tin mới phải là `pending`, không xuất hiện công khai.
5. **Admin:** đăng nhập lại, duyệt tin sang `published`.
   Khách không đăng nhập phải xem được tin trên trang Việc làm.
6. **Candidate:** dùng một email kiểm thử khác bạn sở hữu, chọn Ứng viên,
   xác minh email, đăng nhập. Nhấn Ứng tuyển tin trên và nhập thư giới thiệu
   mẫu. Tải lên **PDF giả lập không có thông tin cá nhân thật**, dưới 5 MB.
   Kiểm tra hồ sơ chuyển sang `submitted`. Thử PDF lớn hơn 5 MB hoặc
   định dạng không được chấp nhận, phải được báo lỗi.
7. **Employer:** đăng nhập lại, thấy hồ sơ ứng viên, mở được CV PDF qua
   đường dẫn có thời hạn, thay đổi trạng thái sang `reviewing` hoặc
   `shortlisted`.
8. **Candidate:** đăng nhập lại, thấy trạng thái ứng tuyển đã cập nhật.
   Không xem được hồ sơ ứng viên khác.
9. **Admin:** xác minh các công ty/tin chỉ xuất hiện trong phạm vi phù hợp,
   và không có cảnh báo lỗi.

## Điều kiện mở chính thức

- Toàn bộ 9 bước trên thành công trong trình duyệt trên máy tính và điện thoại.
- Đã xác minh gửi email và mở liên kết xác thực đúng domain.
- Kiểm thử upload, signed URL và giới hạn quyền truy cập CV qua HTTP thật.
- Có chính sách quyền riêng tư, thời hạn lưu dữ liệu, phương án xóa dữ liệu,
  chống spam và phương án sao lưu/phục hồi.
- Cân nhắc cấu hình email SMTP riêng trước khi có nhiều người đăng ký.

**Trạng thái hiện tại:** PASS kiểm thử SQL; đang chờ kiểm thử giao diện và
file upload thật. Không coi là nghiệm thu production cho đến khi hoàn thành.
