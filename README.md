# Hưng Yên Jobs — Nền tảng tuyển dụng khu vực Hưng Yên

**Phiên bản:** v2 · Supabase PostgreSQL + Auth + Storage + Row Level Security  
**Supabase project:** `hung-yen-jobs` · Singapore · `lxarzbxymgjomsztftqj`

## Giao diện

- `index.html`: Trang giới thiệu và demo giao diện (các tin có sẵn đều là **minh họa**).
- `app.html`: Hệ thống **dữ liệu thật**, dùng Supabase, dành cho ứng viên, nhà tuyển dụng và quản trị viên.
- `src/app.js`: Xác thực, bảng điều khiển, đăng tin, kiểm duyệt và nộp CV.
- `config.public.js`: Supabase Project URL và **publishable key** cho frontend (không chứa khóa bí mật).
- `supabase/schema.sql`: Cơ sở dữ liệu và chính sách truy cập RLS.
- `docs/DEPLOY.md`: Hướng dẫn xuất bản, quản trị và kiểm thử.

## Tính năng hồ sơ ứng viên và doanh nghiệp nâng cao

- **Đồng bộ việc làm đã lưu theo tài khoản:** chuyển dấu trang ẩn danh khi đăng nhập; dữ liệu sau đó nằm trong Supabase với quyền riêng theo tài khoản.
- **Thông báo việc làm phù hợp:** mục `#alerts` lưu từ khóa, địa điểm, ngành nghề và mức lương; hiển thị gợi ý và tin mới ngay trong website. **Chưa có email hoặc push tự động.**
- **Thư viện CV cá nhân:** mục `#cv` cho phép ứng viên tải/xem/xóa CV chưa được sử dụng và chọn lại CV khi nộp hồ sơ. CV gắn đơn ứng tuyển được giữ an toàn.
- **Hồ sơ doanh nghiệp:** thêm ngành nghề, quy mô, năm thành lập, website HTTPS, phúc lợi; các thông tin chính đã được phê duyệt vẫn cần Admin xử lý nếu thay đổi.
- Chi tiết bảo mật, giới hạn và hướng dẫn: [docs/ACCOUNT_FEATURES_20261031.md](docs/ACCOUNT_FEATURES_20261031.md).

## Nâng cấp trải nghiệm ngày 31/10/2026

- Ứng viên và khách có thể **lưu/bỏ lưu việc làm yêu thích** tại `app.html#saved`. Danh sách lưu cục bộ trong trình duyệt, chỉ chứa mã UUID công việc và **không đồng bộ thiết bị**. Tin đã đóng không hiển thị trong trang đã lưu.
- **Chia sẻ tin** bằng trình chia sẻ của thiết bị (nếu hỗ trợ) hoặc sao chép liên kết.
- **Lọc nhanh theo ngành** trực tiếp từ danh mục ngành của các tin đang tuyển.
- **Nhà tuyển dụng tìm kiếm và lọc hồ sơ nhận được** theo tên/vị trí/trạng thái, dữ liệu tiếp tục qua Supabase RLS.
- Tăng cường thao tác di động và hiển thị tên/dung lượng tệp PDF được chọn trước khi gửi.
- CI Playwright chạy trên bản build **của chính PR** tại máy chủ tĩnh cục bộ, kiểm thử UI mobile. Kiểm thử Admin/Nhà tuyển dụng dùng tài khoản **mô phỏng**, không phải đăng nhập bằng tài khoản thật.

Không thêm bảng mới, không thay đổi tài khoản, CV, quyền truy cập, hay dữ liệu ứng tuyển hiện tại. Lưu việc làm trong trình duyệt không phải lưu trên server; xóa dữ liệu trình duyệt sẽ làm mất dấu trang.

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
- GitHub Actions kiểm tra cú pháp và chuẩn bị tự xuất bản bằng Pages.
- **GitHub Pages đã triển khai thành công**. Đã kiểm thử trực tiếp quy trình Admin duyệt doanh nghiệp/tin, ứng viên nộp CV PDF, Nhà tuyển dụng mở CV và chuyển trạng thái `reviewing`.
- Tài khoản Admin đã được cấp quyền và có thể phê duyệt thực tế. Xác minh email qua SMTP iCloud đã hoạt động trong lượt thử.
- **Chưa coi là production-ready** cho người dùng đại trà: cần chính sách quyền riêng tư/retention, backup và phục hồi, chống spam, kiểm thử đa trình duyệt; xem `docs/QA-ACCEPTANCE.md`.

## Triển khai

Mở [docs/DEPLOY.md](docs/DEPLOY.md) để kích hoạt GitHub Pages, cấu hình Authentication URL và thiết lập tài khoản quản trị.

**Không bao giờ** đưa Supabase secret key hay service_role key vào frontend.
