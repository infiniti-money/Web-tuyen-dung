# Hưng Yên Jobs — Cloudflare Turnstile (v2.1)

**Triển khai:** GitHub Pages `https://infiniti-money.github.io/Web-tuyen-dung/app.html` và Supabase `hung-yen-jobs`.

## Phạm vi phiên bản này

- Giao diện Turnstile bằng script gốc Cloudflare cho **Đăng nhập**, **Đăng ký tài khoản** và **Gửi lại email xác minh**.
- Token mới được gửi kèm `captchaToken` trong request của Supabase Auth, không chỉ kiểm tra bằng JavaScript.
- CAPTCHA được làm mới sau mỗi request, tự xóa token khi hết hạn, lỗi hoặc vượt thời gian.
- **Supabase Auth** là nơi kiểm tra bí mật Turnstile qua máy chủ khi tính năng Bot and Abuse Protection được bật. Không đưa secret key vào GitHub Pages.
- Giữ nguyên PostgreSQL rate limit 15 hồ sơ/30 phút/ứng viên và 50 tin/24 giờ/doanh nghiệp; **hai luồng này chưa có Turnstile server-side**. Thêm widget vào hai biểu mẫu đó mà không bảo vệ đường ghi database sẽ không tạo bảo vệ thực.

## Kích hoạt thực tế — theo đúng thứ tự để không chặn người dùng

### 1. Tạo widget Cloudflare

Truy cập [Cloudflare Turnstile](https://dash.cloudflare.com/?to=/:account/turnstile) → **Add widget**.

- Tên: `Hung Yen Jobs - Production Auth`.
- Mode: `Managed` (hoặc `Non-interactive` theo mức rủi ro).
- Hostname: `infiniti-money.github.io` (**không** nhập `https://`, đường dẫn `/Web-tuyen-dung` hoặc ký tự `#`).
- Lưu **Site Key** công khai và **Secret Key** bí mật. Chỉ Site Key được đưa vào code.

### 2. Bật xác minh phía Supabase Auth

Vào [Supabase Dashboard](https://supabase.com/dashboard/project/lxarzbxymgjomsztftqj/auth/providers) → Authentication → Bot and Abuse Protection (tùy UI nằm trong Auth Settings).

- Chọn **Cloudflare Turnstile**, điền **Secret Key**.
- Chưa bật/Save chế độ bắt buộc nếu website chưa có Site Key sẵn sàng: có thể làm hỏng đăng ký/đăng nhập đang hoạt động.
- Xác nhận cấu hình Secret đã được lưu an toàn chỉ ở máy chủ.
- Tham khảo [Supabase Auth CAPTCHA](https://supabase.com/docs/guides/auth/auth-captcha).

### 3. Xuất bản Site Key ở GitHub

Sửa `config.turnstile.js` trên GitHub `main` thành:

```js
// Public Cloudflare Site Key — never use the Secret Key here.
window.HYJOBS_TURNSTILE = {
  enabled: true,
  siteKey: 'SITE_KEY_CONG_KHAI_CUA_BAN'
};
```

Việc đổi `enabled` sẽ hiển thị widget và bắt buộc token hợp lệ trước khi client gửi request Supabase Auth. Nếu widget không tải, trình duyệt không thể gửi form xác thực qua giao diện chuẩn. **Không dùng Cloudflare test keys trên production.**

### 4. Kích hoạt đồng bộ và kiểm thử

Trong cửa sổ ngắn ít truy cập, bật xác minh Turnstile ở Supabase Auth gần thời điểm cấu hình Site Key được GitHub Pages deploy thành công. Kiểm thử ngay:

- [ ] Đăng nhập tài khoản thật với CAPTCHA hợp lệ.
- [ ] Đăng ký tài khoản thử; kiểm tra xác minh email vẫn hoạt động.
- [ ] Gửi lại email xác minh cho tài khoản thử.
- [ ] Không có token phải không gửi request từ giao diện chuẩn; gọi API Auth trực tiếp không có token phải bị **Supabase từ chối** sau khi bật.
- [ ] Token đã dùng lại / hết hạn (5 phút) phải bị từ chối; widget reset cho lượt mới.
- [ ] Điện thoại Android và Safari iOS, màn hình 360/390px không bị tràn.
- [ ] Xem Turnstile Analytics và Supabase Auth Logs xem có lỗi thực tế.
- [ ] Khóa bảo mật không xuất hiện trong `dist/`, CI logs hoặc file công khai.

**Rollback:** nếu có sự cố khi đang kích hoạt, tắt yêu cầu CAPTCHA trong Supabase Auth rồi đổi `enabled:false` ở frontend. Không cần thay đổi/xóa database, CV hay ứng tuyển.

## Giới hạn và bước tiếp

- Trước khi có Site Key và Secret Key thật, **Turnstile vẫn chưa bật**; chỉ phần mã nguồn, CSS và test đã được phát hành.
- Ngay cả khi giao diện có widget, Cloudflare yêu cầu **server-side Siteverify**, token một lần, thời hạn 300 giây. Supabase Auth tự đảm nhận bước này khi bật CAPTCHA trong Dashboard.
- Nộp đơn ứng tuyển, đăng tin tuyển dụng: hiện có **giới hạn tần suất** tại PostgreSQL, không có Turnstile bắt buộc. Để bảo vệ bằng Turnstile cần dời thao tác tạo bản ghi sang API server thực hiện Siteverify, đồng thời chặn đường insert trực tiếp qua Supabase client; không triển khai giả an toàn bằng widget frontend.
- Không bật leaked-password protection nếu tính năng Supabase yêu cầu gói hoặc cấu hình mới mà chưa xem xét; Security Advisor vẫn có cảnh báo này.

Tham khảo: [Cloudflare Turnstile Getting Started](https://developers.cloudflare.com/turnstile/get-started/), [Cloudflare Siteverify](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/), [Supabase CAPTCHA](https://supabase.com/docs/guides/auth/auth-captcha).

## Tiêu chí phát hành

CI JavaScript và Browser QA xanh, GitHub Pages Success, không secret và không lỗi các luồng đăng nhập cũ trước kích hoạt. **Không gọi là đã kích hoạt Turnstile thành công khi chưa kiểm thử khóa thật và cấu hình server.**
