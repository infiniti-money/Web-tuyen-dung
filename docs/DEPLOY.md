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

## Kết nối GitHub Pages qua Repository Variables
Trong GitHub repository, vào **Settings → Secrets and variables → Actions → Variables** và tạo:
- `SUPABASE_URL`: Project URL dạng `https://<project-ref>.supabase.co`.
- `SUPABASE_PUBLISHABLE_KEY`: Supabase **publishable key** (`sb_publishable_...`) hoặc legacy anon key.

Hai giá trị trên là thông tin **công khai trong trình duyệt**; bảo mật dữ liệu dựa trên các policy RLS trong `schema.sql`. **KHÔNG BAO GIỜ** lưu service_role/secret API key trong GitHub repo variables dùng cho website tĩnh.
Chọn **Settings → Pages → Build and deployment → Source: GitHub Actions**.
Sau khi merge nhánh này vào main, push sẽ kích hoạt workflow kiểm tra mã nguồn và build thư mục `dist`.
Workflow chỉ đóng gói `index.html`, `app.html`, `src/app.js`, `config.js`; không đưa migration SQL lên site. Nếu chưa có biến Supabase, site demo vẫn hoạt động, còn `app.html` sẽ hiện trang hướng dẫn cấu hình.

URL website dự kiến: `https://infiniti-money.github.io/Web-tuyen-dung/`.
Bản có dữ liệu thật: `https://infiniti-money.github.io/Web-tuyen-dung/app.html`.

## Quy trình kiểm thử trước khi mở công khai
1. Đăng ký candidate + xác minh email, đăng nhập lại.
2. Đăng ký employer + xác minh email, tạo company; kiểm tra status=pending.
3. Admin cấp phép company; xác nhận employer không thể tự thay đổi `approved`.
4. Employer đăng tin pending; admin duyệt published; xem trang public.
5. Candidate tải PDF đúng định dạng và ứng tuyển.
6. Employer chỉ xem ứng viên liên quan tới công việc của công ty mình; tải CV bằng URL có thời hạn.
7. Candidate không được xem hồ sơ của người khác; employer không được đổi role và không được đăng tin tự duyệt.
8. Kiểm tra chính sách bảo vệ dữ liệu cá nhân, giới hạn email, sao lưu, log, giám sát và kế hoạch khôi phục.

## GitHub Pages: kết nối cấu hình Supabase (không dùng secret)
1. Mở Settings > Secrets and variables > Actions > Variables.
2. Tạo `SUPABASE_URL` và `SUPABASE_PUBLISHABLE_KEY` với **public** Supabase project URL và publishable key. Không dùng secret/service_role key.
3. Bật Settings > Pages > Source: GitHub Actions. Workflow `.github/workflows/deploy-pages.yml` tự tạo `config.js` trong artifact khi push nhánh main.
4. Truy cập `/app.html` để sử dụng hệ thống thật; `/index.html` vẫn là trang giới thiệu.
5. Chạy migration SQL và cấu hình Authentication Site URL trước khi mời người dùng đăng ký.
6. Kiểm thử RLS thực tế, quản trị và tải CV trước khi mở dịch vụ cho cộng đồng.

## Dữ liệu cá nhân
Ứng viên có thể tải lên CV PDF tối đa 5 MB, lưu vào bucket riêng tư. Nhà tuyển dụng chỉ được đọc hồ sơ của ứng viên đã ứng tuyển vào tin do mình sở hữu. Cần bổ sung chính sách lưu giữ/xóa dữ liệu, chống spam, kiểm tra file upload, email xác nhận và giám sát trước khi vận hành chính thức.
