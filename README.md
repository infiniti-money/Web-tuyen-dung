# Hưng Yên Jobs

Website tuyển dụng tập trung vào khu vực Hưng Yên, giao diện tiếng Việt, tương thích desktop và mobile.

## Chạy thử

Mở tệp `index.html` trực tiếp trên trình duyệt hoặc phục vụ qua web server tĩnh. Không yêu cầu cài đặt Node.js.

## Chức năng bản demo v1.0

- Tìm kiếm công việc theo từ khóa, khu vực, ngành nghề, mức lương.
- Khám phá ngành nghề, tìm việc theo khu vực.
- Lưu công việc yêu thích qua localStorage.
- Xem chi tiết tin tuyển dụng.
- Tạo tin tuyển dụng demo được lưu **chỉ trên thiết bị đang dùng** qua localStorage.
- Giao diện responsive và điều hướng trên điện thoại.

## Giới hạn hiện tại

- Tất cả tin mặc định là **dữ liệu minh họa**, không có doanh nghiệp hay vị trí tuyển dụng nào được xác minh.
- Chưa có backend, tài khoản, cơ sở dữ liệu, xác thực, kiểm duyệt hoặc nộp hồ sơ thật.
- Tin được tạo trong trình duyệt không được đồng bộ giữa người dùng; không nhập thông tin cá nhân nhạy cảm.
- Danh sách khu vực là nhãn tìm kiếm quen dùng; cần cập nhật theo đơn vị hành chính hiện hành trước khi vận hành chính thức.

## GitHub Pages

Workflow `.github/workflows/deploy-pages.yml` tự xuất bản trang tĩnh từ nhánh `main` khi GitHub Pages được bật với nguồn **GitHub Actions** tại Settings → Pages.

## Lộ trình

1. Xây dựng backend và PostgreSQL, lưu việc làm tập trung.
2. Đăng ký/đăng nhập ứng viên, nhà tuyển dụng và quản trị.
3. Kiểm duyệt, xác minh doanh nghiệp, chống tin giả.
4. Nộp hồ sơ, quản lý CV và thông báo việc làm.
5. SEO, analytics, bảo mật, sao lưu và vận hành thực tế.
