# Hưng Yên Jobs — Google Login qua Supabase Auth (v2.1)

Ngày: 02/11/2026. Hosting vẫn là **GitHub Pages**, backend vẫn là dự án Supabase `hung-yen-jobs` (`lxarzbxymgjomsztftqj`).

## Đã triển khai trong mã nguồn

- Nút **Đăng nhập bằng Google** trên `app.html#account`, cạnh phương thức email/mật khẩu hiện có.
- Gọi `supabase.auth.signInWithOAuth({provider:'google',options:{redirectTo}})`. Chỉ chuyển về HTTPS chính xác của ứng dụng, không kèm query hay fragment và không tiết lộ token.
- Biến `window.HYJOBS_GOOGLE_AUTH = {enabled:false}` trong `config.google.js` mặc định **tắt** để nút không khởi động OAuth khi nhà cung cấp chưa được xác minh, không làm hỏng đăng nhập cũ.
- Không có Google Client ID/Secret trong frontend, CSS có giao diện điện thoại, smoke và Playwright mock.
- Không thay đổi tài khoản Auth, vai trò, đơn ứng tuyển hoặc CV hiện có.

## 1. Tạo Google Cloud OAuth client

1. Vào [Google Cloud Console](https://console.cloud.google.com/) bằng tài khoản quản lý dự án, tạo/chọn một Project, ví dụ `Hung Yen Jobs`.
2. Vào **Google Auth Platform → Branding**: đặt tên ứng dụng **Hưng Yên Jobs**, email hỗ trợ, điền các thông tin mà Google yêu cầu và lưu.
3. Vào **Audience**: chọn **External** nếu dành cho người dùng Gmail thông thường. Nếu đang ở trạng thái **Testing**, chỉ các email nằm trong danh sách **Test users** mới có thể thử đăng nhập; thêm tài khoản thử trước. Sau khi hoàn tất nội dung và kiểm thử, chuyển sang **In production** theo điều kiện của Google.
4. Vào **Data Access**: chỉ sử dụng các scope cơ bản `openid`, `userinfo.email`, `userinfo.profile`. Không yêu cầu Google Drive, danh bạ, dữ liệu nhạy cảm.
5. Vào **Clients → Create client → Web application** và khai báo:

| Trường Google Cloud | Giá trị |
|---|---|
| Application name | `Hung Yen Jobs Web` |
| Authorized JavaScript origins | `https://infiniti-money.github.io` |
| Authorized redirect URIs | `https://lxarzbxymgjomsztftqj.supabase.co/auth/v1/callback` |

**Quan trọng:** Callback URI đăng ký với Google là URL của **Supabase**, không phải URL GitHub Pages. Host GitHub Pages chỉ đặt ở JavaScript origins, không có đường dẫn `/Web-tuyen-dung` ở trường này.

6. Sau khi lưu, Google cấp **Client ID** và **Client Secret**. Giữ **Client Secret** riêng tư, không gửi trong chat và không commit GitHub. Mã nguồn website không cần biết Client ID.

Tham khảo: [Supabase — Sign in with Google](https://supabase.com/docs/guides/auth/social-sign-in/auth-google).

## 2. Cấu hình Supabase

1. Mở [Supabase — Google provider](https://supabase.com/dashboard/project/lxarzbxymgjomsztftqj/auth/providers?provider=Google) → **Authentication → Sign In / Providers → Google**.
2. Chọn **Enable Sign in with Google**, nhập **Client ID** và **Client Secret** tương ứng, lưu. Kiểm tra callback được Supabase hiển thị là `https://lxarzbxymgjomsztftqj.supabase.co/auth/v1/callback`.
3. Mở [Supabase — URL Configuration](https://supabase.com/dashboard/project/lxarzbxymgjomsztftqj/auth/url-configuration), bảo đảm:
   - **Site URL:** `https://infiniti-money.github.io/Web-tuyen-dung/app.html`
   - **Redirect URLs** có đúng URL `https://infiniti-money.github.io/Web-tuyen-dung/app.html`.
4. Không xóa các URL cũ dùng cho xác minh email hiện có.
5. Nếu Supabase yêu cầu CAPTCHA với đăng ký email/mật khẩu, **giữ nguyên** Cloudflare Turnstile đang dùng. Luồng OAuth Google riêng không thay thế việc chống bot cho mật khẩu hoặc nộp hồ sơ.

## 3. Bật nút Google trên GitHub Pages

Chỉ sau khi đã bật Google provider trong Supabase và cấu hình Redirect URL thành công, sửa `config.google.js` từ:

```js
window.HYJOBS_GOOGLE_AUTH = { enabled: false };
```

thành:

```js
window.HYJOBS_GOOGLE_AUTH = { enabled: true };
```

Đây là **công tắc công khai**, không phải bí mật. Có thể nhờ ChatGPT cập nhật tệp, tạo PR, chạy CI rồi merge/deploy.

## 4. Kiểm thử nghiệm thu bằng tài khoản thật

- [ ] Truy cập [Hưng Yên Jobs — Đăng nhập](https://infiniti-money.github.io/Web-tuyen-dung/app.html#account), bấm **Đăng nhập bằng Google**.
- [ ] Hiển thị giao diện chọn tài khoản và chấp thuận Google; điều hướng trở lại `https://infiniti-money.github.io/Web-tuyen-dung/app.html`.
- [ ] Tên/email hiển thị trong **Tài khoản**, có thể truy cập Dashboard với vai trò đúng.
- [ ] Đăng xuất rồi đăng nhập Google lại; cùng một tài khoản có cùng ID/profile, không làm mất Saved Jobs hoặc CV.
- [ ] Đăng nhập bằng mật khẩu cũ vẫn hoạt động; Turnstile cũ vẫn hoạt động.
- [ ] Thử trên trình duyệt điện thoại Android/iOS và desktop.
- [ ] Kiểm tra Supabase Authentication → Users và Logs; Google Analytics/Cloud Console nếu có. Không gửi thông tin đăng nhập thật hay token vào log/issue.

### Vai trò tài khoản và quyền truy cập

- Đăng ký mới bằng Google **mặc định là Ứng viên**, theo trigger hiện tại trong Supabase; Google không được phép tự chọn vai trò Admin.
- Nếu muốn trở thành Nhà tuyển dụng, nên đăng ký với vai trò **Nhà tuyển dụng** bằng quy trình hiện có, rồi sử dụng cơ chế liên kết danh tính được xác minh theo hướng dẫn của Supabase; không tự chỉnh trực tiếp vai trò hoặc giả định tự chuyển quyền.
- Với tài khoản đã tồn tại cùng email, Supabase có thể liên kết danh tính nếu đáp ứng điều kiện xác minh của Auth; **phải kiểm thử bằng tài khoản đã tồn tại** trước khi cam kết giữ nguyên mọi hồ sơ. Không xóa người dùng hoặc sửa `profiles.role` để giải quyết tài khoản trùng.
- Xem [Supabase Identity Linking](https://supabase.com/docs/guides/auth/auth-identity-linking).

## 5. Nếu có lỗi

| Lỗi | Kiểm tra |
|---|---|
| `Unsupported provider` hoặc `provider not enabled` | Đã bật Google trong Supabase chưa? |
| `redirect_uri_mismatch` | URI Google Cloud phải là `https://lxarzbxymgjomsztftqj.supabase.co/auth/v1/callback`, chính xác cả giao thức, path |
| `redirect_to is not allowed` | Supabase Redirect URLs đã cho phép `https://infiniti-money.github.io/Web-tuyen-dung/app.html` chưa? |
| `access_denied` hoặc ứng dụng đang Testing | Tài khoản Gmail có trong Google **Test users** chưa? |
| Sau Google quay lại nhưng không đăng nhập | Kiểm tra Supabase Auth Logs, email/provider, trình duyệt có chặn cookies/storage hay không; thử lại ở tab thường |
| Google login hoạt động nhưng mất vai trò mong đợi | Xem user ID/profile và cách liên kết identity, không tự cấp Admin hoặc đổi role |

**Rollback an toàn:** đặt `enabled:false` trong `config.google.js` và triển khai lại GitHub Pages. Email/password vẫn hoạt động, CV và đơn ứng tuyển không bị động đến.

## Tình trạng hiện tại

- Code UI/OAuth, docs và tests đã có.
- **Chưa cấu hình Client ID/Secret trong Supabase bằng công cụ này** và chưa xác nhận luồng Google thật; không được gọi là Google login đã kích hoạt thành công cho người dùng cuối.
- Cần người có quyền Google Cloud/Supabase điền credentials bí mật trong Dashboard, sau đó bật công tắc công khai, nghiệm thu tài khoản thực tế.
