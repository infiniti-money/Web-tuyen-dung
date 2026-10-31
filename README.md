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
