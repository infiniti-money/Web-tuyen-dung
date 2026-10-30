# Hưng Yên Jobs v2 — thiết lập hệ thống thật

## Kiến trúc
- Frontend tĩnh `app.html` + `src/app.js` với Supabase JS SDK.
- Supabase: PostgreSQL, Auth (email/mật khẩu), Storage CV riêng tư, Row Level Security (RLS).
- Vai trò: `candidate`, `employer`, `admin`; người đăng ký công khai chỉ được chọn candidate hoặc employer.
- Nhà tuyển dụng cần xác minh doanh nghiệp; tin phải được kiểm duyệt rồi mới xuất hiện công khai.

## Kích hoạt
1. Tạo project Supabase tại https://supabase.com/dashboard (chọn region gần Việt Nam nếu có).
2. Chạy toàn bộ SQL trong `supabase/schema.sql` bằng SQL Editor, trên project mới. Migration hiện dành cho lần cài đầu, không tự động tái chạy trên DB có policy trùng tên.
3. Bật Email Auth; cấu hình Site URL và Redirect URL theo domain chạy thực tế trong Authentication > URL Configuration.
4. Tạo file `config.js` từ `config.example.js`, điền **Project URL** và **publishable (anon) key**. Tuyệt đối không đặt secret/service_role key trong frontend.
5. Đưa `config.js` lên host an toàn (giá trị URL + publishable key được phép công khai; an toàn dựa trên RLS, không phải việc giấu publishable key). Truy cập `app.html`.
6. Tạo tài khoản cho quản trị viên (đăng ký như ứng viên), xác nhận email, rồi chạy trong Supabase SQL Editor với UUID đã xác minh:
   ```sql
   drop trigger protect_role on public.profiles;
   update public.profiles set role='admin' where id='<uuid-auth-user-da-xac-minh>';
   create trigger protect_role before update on public.profiles
      for each row execute function public.guard_profile_role();
   ```
   Chỉ quản trị cơ sở dữ liệu được chạy lệnh này. Không triển khai endpoint tự cấp quyền admin.
7. Đăng nhập tài khoản employer → tạo doanh nghiệp; admin duyệt doanh nghiệp; employer tạo tin; admin duyệt tin; candidate nộp hồ sơ.

## Tình trạng triển khai
Đã có logic cơ bản cho đăng ký/đăng nhập, phân quyền, duyệt doanh nghiệp, đăng tuyển, tìm việc công khai, gửi hồ sơ với CV PDF riêng tư và theo dõi trạng thái.
Chưa chạy thử end-to-end trên Supabase thật; chưa có email thông báo, đổi mật khẩu trong UI, chống spam nâng cao, chính sách dữ liệu cá nhân, xác minh giấy phép kinh doanh tự động, kiểm thử bảo mật độc lập hoặc sao lưu vận hành.
**Không đưa vào production xử lý dữ liệu ứng viên trước khi kiểm thử và thực hiện các yêu cầu bảo mật/pháp lý.**

## Ghi chú quan trọng
- GitHub Pages có thể host frontend tĩnh và kết nối Supabase nhưng **không** chạy PostgreSQL.
- `index.html` vẫn là trang demo gốc; `app.html` là hệ thống mới.
- `config.js` được gitignore để ngăn commit nhầm cấu hình. Trên GitHub Pages cần quy trình build/deploy cấu hình phù hợp; có thể công khai publishable key nhưng không được đưa service key lên client.
