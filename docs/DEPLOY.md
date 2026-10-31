# Triển khai Hưng Yên Jobs v2

## 1. Các thành phần đã được cấu hình

- GitHub repo: https://github.com/infiniti-money/Web-tuyen-dung
- Nhánh: `main`
- Supabase project: `hung-yen-jobs` (`lxarzbxymgjomsztftqj`), Singapore.
- Project URL: `https://lxarzbxymgjomsztftqj.supabase.co`
- PostgreSQL: `profiles`, `companies`, `jobs`, `applications`, đều đã bật RLS.
- Auth: email/password qua Supabase Auth.
- Storage: `candidate-cvs`, private, PDF tối đa 5 MB.
- `config.public.js` chỉ dùng **Supabase publishable key**; không chứa mật khẩu database hoặc service_role key.
- Schema được triển khai qua migration; các bản vá bảo mật được đồng bộ trong `supabase/schema.sql`.
- Security Advisor hiện còn cảnh báo **Leaked Password Protection Disabled**; cần kiểm tra khả năng bật trên gói dịch vụ trước khi mở công khai.

## 2. Kích hoạt giao diện trên GitHub Pages

1. Mở https://github.com/infiniti-money/Web-tuyen-dung/settings/pages
2. Trong **Build and deployment → Source**, chọn **GitHub Actions**.
3. Truy cập https://github.com/infiniti-money/Web-tuyen-dung/actions để kiểm tra workflow `Validate and deploy Hưng Yên Jobs to GitHub Pages`.
4. Khi workflow thành công, mở URL dự kiến: `https://infiniti-money.github.io/Web-tuyen-dung/`. Hệ thống chính: `https://infiniti-money.github.io/Web-tuyen-dung/app.html`.
5. Không cần tạo Repository Variables để cấu hình Supabase vì `config.public.js` đã chứa public Project URL và publishable key.

> Nếu dùng tên miền riêng, cập nhật URL ở GitHub Pages và Supabase Auth tương ứng.

## 3. Cấu hình Supabase Authentication

1. Mở https://supabase.com/dashboard/project/lxarzbxymgjomsztftqj/auth/url-configuration
2. Đặt **Site URL** thành `https://infiniti-money.github.io/Web-tuyen-dung/app.html` sau khi GitHub Pages hoạt động, hoặc domain thực tế.
3. Thêm **Redirect URLs** phù hợp với domain và đường dẫn ứng dụng.
4. Bật xác minh email, kiểm tra template xác minh, giới hạn đăng ký và cấu hình email gửi đi phù hợp trước khi mở công khai.

## 4. Tạo quản trị viên đầu tiên

1. Đăng ký một tài khoản **ứng viên** trên trang `app.html`, xác minh email.
2. Trên Supabase Dashboard → Authentication → Users, lấy chính xác UUID của người dùng cần làm admin.
3. Chỉ quản trị viên database mới chạy SQL trong SQL Editor:

```sql
begin;
drop trigger protect_role on public.profiles;
update public.profiles set role='admin' where id='<verified-auth-user-uuid>';
create trigger protect_role before update on public.profiles
for each row execute function public.guard_profile_role();
commit;
```

4. Kiểm tra lại role và đăng nhập lại trên website. Tuyệt đối không cấp admin qua public signup.

## 5. Quy trình sử dụng

- Employer đăng ký tài khoản, tạo doanh nghiệp. Ban đầu doanh nghiệp `pending`.
- Admin duyệt doanh nghiệp sang `approved`.
- Employer đăng tin (mặc định `pending`), admin duyệt sang `published`.
- Ứng viên tìm việc và nộp hồ sơ, tùy chọn CV PDF.
- Employer xem đúng những hồ sơ thuộc công việc của doanh nghiệp mình và đổi trạng thái ứng tuyển.

## 6. Kiểm tra trước khi nhận hồ sơ thật

- Đăng ký, xác minh email, đăng nhập và đăng xuất.
- Ứng viên không thể xem hồ sơ của người khác; employer không thể tự duyệt doanh nghiệp hay tin.
- Admin có thể duyệt doanh nghiệp và đăng tuyển.
- Nộp CV, kiểm tra kích thước/loại MIME, URL tải file hết hạn và quyền đọc file.
- Kiểm tra việc tạo hồ sơ trùng, lỗi mạng, upload thất bại và email thông báo.
- Thiết lập sao lưu, quy trình xóa dữ liệu theo yêu cầu, chính sách quyền riêng tư và chống spam.

**Tình trạng 31/10/2026:** GitHub Pages, Auth/SMTP, Admin phê duyệt, Employer đăng tin, Candidate tải CV PDF thật và Employer mở CV/cập nhật `reviewing` đều đã được kiểm thử. Nghiệp vụ cốt lõi đạt; vẫn cần chính sách dữ liệu, backup/restore, chống spam và nghiệm thu đa thiết bị trước khi mở rộng production. Chi tiết: [QA-ACCEPTANCE.md](QA-ACCEPTANCE.md).
