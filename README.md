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

- Database Supabase đã tạo và áp dụng migration; security advisor sau khi rà soát: **0 cảnh báo**.
- Giao diện đã có cấu hình Supabase trên nhánh `main`.
- GitHub Actions kiểm tra cú pháp và chuẩn bị tự xuất bản bằng Pages.
- **Chưa xác nhận GitHub Pages hoạt động công khai**, chưa kiểm thử toàn bộ luồng người dùng thực tế.
- Chưa tạo tài khoản admin đầu tiên; chưa cấu hình Auth Site URL cho domain sau khi xuất bản.
- Trước khi nhận dữ liệu người dùng thật, cần kiểm thử và hoàn thiện chính sách dữ liệu cá nhân, xử lý file upload và giám sát bảo mật.

## Triển khai

Mở [docs/DEPLOY.md](docs/DEPLOY.md) để kích hoạt GitHub Pages, cấu hình Authentication URL và thiết lập tài khoản quản trị.

**Không bao giờ** đưa Supabase secret key hay service_role key vào frontend.
