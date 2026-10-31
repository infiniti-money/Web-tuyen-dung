# Hưng Yên Jobs — Nền tảng tuyển dụng khu vực Hưng Yên

**Phiên bản chính thức:** v2.0.0 · GitHub Pages + Supabase PostgreSQL, Auth, Storage và RLS  
**Supabase project:** `hung-yen-jobs` · Singapore · `lxarzbxymgjomsztftqj`

[**Ghi chú phát hành v2.0.0**](docs/releases/v2.0.0.md) · [**Website đang chạy**](https://infiniti-money.github.io/Web-tuyen-dung/app.html)

## Giao diện

- `index.html`: Trang giới thiệu và demo giao diện (các tin có sẵn đều là **minh họa**).
- `app.html`: Hệ thống **dữ liệu thật**, dùng Supabase, dành cho ứng viên, nhà tuyển dụng và quản trị viên.
- `src/app.js`: Xác thực, bảng điều khiển, đăng tin, kiểm duyệt và nộp CV.
- `config.public.js`: Supabase Project URL và **publishable key** cho frontend (không chứa khóa bí mật).
- `supabase/schema.sql`: Cơ sở dữ liệu và chính sách truy cập RLS.
- `docs/DEPLOY.md`: Hướng dẫn xuất bản, quản trị và kiểm thử.

## Thông báo tự động (triển khai bảo mật, chờ kích hoạt nhà cung cấp)

- Ứng viên có thể chủ động đăng ký/bỏ đăng ký email tại `#alerts`; thông báo Web Push chỉ được bật khi có khóa công khai và người dùng cấp quyền.
- Supabase `job-alert-dispatch` đã có logic gửi Resend và Web Push theo tin tuyển dụng **mới được duyệt**, ghi log chống gửi trùng theo tài khoản/tin/kênh.
- GitHub Actions `dispatch-job-alerts.yml` được **khóa mặc định** bằng biến `HYJOBS_ALERT_DISPATCH_ENABLED`. Không có khóa và cấu hình email/VAPID thì không gửi.
- Cách kích hoạt bằng secrets, kiểm thử và lưu ý iPhone: [docs/AUTOMATIC_NOTIFICATIONS.md](docs/AUTOMATIC_NOTIFICATIONS.md).

## Tính năng hồ sơ ứng viên và doanh nghiệp nâng cao

- **Đồng bộ việc làm đã lưu theo tài khoản:** chuyển dấu trang ẩn danh khi đăng nhập; dữ liệu sau đó nằm trong Supabase với quyền riêng theo tài khoản.
- **Thông báo việc làm phù hợp:** mục `#alerts` lưu từ khóa, địa điểm, ngành nghề và mức lương; hiển thị gợi ý và tin mới ngay trong website. **Chưa có email hoặc push tự động.**
- **Thư viện CV cá nhân:** mục `#cv` cho phép ứng viên tải/xem/xóa CV chưa được sử dụng và chọn lại CV khi nộp hồ sơ. CV gắn đơn ứng tuyển được giữ an toàn.
- **Hồ sơ doanh nghiệp:** thêm ngành nghề, quy mô, năm thành lập, website HTTPS, phúc lợi; các thông tin chính đã được phê duyệt vẫn cần Admin xử lý nếu thay đổi.
- Chi tiết bảo mật, giới hạn và hướng dẫn: [docs/ACCOUNT_FEATURES_20261031.md](docs/ACCOUNT_FEATURES_20261031.md).

## Nâng cấp trải nghiệm ngày 31/10/2026

- Ứng viên và khách có thể **lưu/bỏ lưu việc làm yêu thích** tại `app.html#saved`. Khách chưa đăng nhập lưu cục bộ theo thiết bị; khi đăng nhập dấu trang được chuyển vào tài khoản Supabase và có thể đồng bộ trên thiết bị khác. Tin đã đóng không hiển thị trong trang đã lưu.
- **Chia sẻ tin** bằng trình chia sẻ của thiết bị (nếu hỗ trợ) hoặc sao chép liên kết.
- **Lọc nhanh theo ngành** trực tiếp từ danh mục ngành của các tin đang tuyển.
- **Nhà tuyển dụng tìm kiếm và lọc hồ sơ nhận được** theo tên/vị trí/trạng thái, dữ liệu tiếp tục qua Supabase RLS.
- Tăng cường thao tác di động và hiển thị tên/dung lượng tệp PDF được chọn trước khi gửi.
- CI Playwright chạy trên bản build **của chính PR** tại máy chủ tĩnh cục bộ, kiểm thử UI mobile. Kiểm thử Admin/Nhà tuyển dụng dùng tài khoản **mô phỏng**, không phải đăng nhập bằng tài khoản thật.

Lưu ý lịch sử: bản nâng cấp giao diện ban đầu chỉ dùng dấu trang tại thiết bị. Các bản nâng cấp tiếp theo đã bổ sung bảng `saved_jobs`, CV cá nhân và thông báo có RLS theo tài khoản. Không xóa dữ liệu ứng tuyển cũ trong các bản nâng cấp.

## Giao diện Marketplace nâng cao

- Trang tìm việc `app.html#jobs` có bộ lọc ngành nghề, địa bàn, mức lương, sắp xếp và phân trang.
- Trang chi tiết công việc `app.html#job/<uuid>` và hồ sơ doanh nghiệp công khai `app.html#company/<uuid>`.
- Dashboard Admin có số liệu nghiệp vụ và hàng đợi duyệt doanh nghiệp/tin với tìm kiếm theo trạng thái.
- Chi tiết phạm vi và giới hạn hiện tại: [docs/MARKETPLACE-UPGRADE.md](docs/MARKETPLACE-UPGRADE.md).

## Chức năng chính

1. Đăng ký tài khoản bằng email, phân quyền ứng viên hoặc nhà tuyển dụng; vai trò admin chỉ do quản trị hệ thống cấp.
2. Doanh nghiệp đăng ký và chờ phê duyệt.
3. Đăng tin tuyển dụng, duyệt tin, xem danh sách việc làm đã xuất bản.
4. Ứng viên nộp hồ sơ, có thể tải CV PDF lên kho lưu trữ **riêng tư**.
5. Nhà tuyển dụng xem hồ sơ của công việc thuộc doanh nghiệp mình, quản lý tiến trình tuyển dụng.
6. Bảo vệ truy cập bằng Supabase Auth và Row Level Security.

## Trạng thái triển khai

- Database Supabase và migrations đã hoạt động; Storage `candidate-cvs` là private. Security Advisor còn cảnh báo **Leaked Password Protection chưa bật**.
- Giao diện đã có cấu hình Supabase trên nhánh `main`.
- GitHub Actions kiểm thử và tự động xuất bản website lên Pages từ nhánh `main`.
- **GitHub Pages đã triển khai thành công**. Đã kiểm thử trực tiếp quy trình Admin duyệt doanh nghiệp/tin, ứng viên nộp CV PDF, Nhà tuyển dụng mở CV và chuyển trạng thái `reviewing`.
- Tài khoản Admin đã được cấp quyền và có thể phê duyệt thực tế. Xác minh email qua SMTP iCloud đã hoạt động trong lượt thử.
- **Chưa coi là production-ready** cho người dùng đại trà: cần chính sách quyền riêng tư/retention, backup và phục hồi, chống spam, kiểm thử đa trình duyệt; xem `docs/QA-ACCEPTANCE.md`.

## Triển khai

Mở [docs/DEPLOY.md](docs/DEPLOY.md) để kích hoạt GitHub Pages, cấu hình Authentication URL và thiết lập tài khoản quản trị.

**Không bao giờ** đưa Supabase secret key hay service_role key vào frontend.
