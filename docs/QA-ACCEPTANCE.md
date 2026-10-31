# Hưng Yên Jobs — Báo cáo kiểm thử nghiệm thu

Cập nhật: **31/10/2026** (Asia/Bangkok).

- Website: https://infiniti-money.github.io/Web-tuyen-dung/app.html
- Supabase: `hung-yen-jobs` (`lxarzbxymgjomsztftqj`), Singapore
- GitHub: `infiniti-money/Web-tuyen-dung`

## 1. Đã kiểm thử thành công bằng dữ liệu thật trong hệ thống

| Nội dung | Kết quả | Bằng chứng |
| --- | --- | --- |
| Đăng ký và xác minh email | PASS | Auth có tài khoản đã xác minh, các lần đăng ký hợp lệ trả HTTP 200 |
| Đăng nhập Admin, Nhà tuyển dụng, Ứng viên | PASS | `auth.users` và vai trò `profiles` phù hợp |
| Nhà tuyển dụng tạo doanh nghiệp | PASS | `CTY KIỂM THỬ HƯNG YÊN` |
| Admin duyệt doanh nghiệp | PASS | `companies.status=approved` |
| Nhà tuyển dụng đăng tin và Admin duyệt | PASS | `[TEST] Nhân viên kho Hưng Yên` là `published` |
| Ứng viên gửi hồ sơ | PASS | Hồ sơ ứng tuyển đã tạo với `submitted` |
| Tải PDF thật lên Storage | PASS | `candidate-cvs` có đối tượng `application/pdf`, 530094 byte |
| Nhà tuyển dụng mở PDF bằng website | PASS — **người dùng xác nhận** | Đã mở và xem thành công trong trình duyệt |
| Nhà tuyển dụng đổi trạng thái | PASS | `submitted → reviewing`, xác minh từ tài khoản Nhà tuyển dụng |
| Ứng viên xem trạng thái | PASS | Truy vấn RLS của ứng viên trả `reviewing` |
| CV không bị công khai | PASS | `candidate-cvs` là private; `anon` không được đọc đối tượng |
| Nhà tuyển dụng chỉ xem CV có hồ sơ liên quan | PASS | RLS cho phép đúng nhà tuyển dụng, đã sửa path comparison (PR #3) |
| Giữ được dữ liệu thật qua kiểm thử | PASS | Dữ liệu QA giả lập được `ROLLBACK`; không xóa ứng tuyển thật |

### Ảnh chụp trạng thái dữ liệu tại thời điểm nghiệm thu

- 4 tài khoản Auth: 1 Admin, 1 Nhà tuyển dụng, 2 Ứng viên (1 trong đó chưa xác minh).
- 1 doanh nghiệp đã duyệt.
- 2 tin: tin `[TEST] Nhân viên kho Hưng Yên` đã xuất bản, tin `nhân viên kho` khác còn `pending`.
- 1 đơn ứng tuyển thật: trạng thái **`reviewing`**.
- 1 tệp CV PDF private trong Storage.
- Giữ nguyên mọi dữ liệu hiện có; các tin thử nghiệm chưa được xóa.

## 2. Kiểm thử phân quyền và trạng thái

- Thử bằng ngữ cảnh JWT người dùng tương ứng với `authenticated`, không bypass RLS để giả lập quyền người dùng.
- `anon` không đọc được CV hoặc đơn ứng tuyển.
- Employer đúng doanh nghiệp đọc được đối tượng CV và hồ sơ qua RPC `public.employer_applications()`.
- Candidate truy vấn lại hồ sơ của mình sau khi đổi trạng thái.
- Thay đổi trạng thái ứng tuyển được COMMIT và truy vấn lại thấy `reviewing`.
- Bài kiểm thử giả lập nhiều vai trò khác được `ROLLBACK` và không tạo tài khoản/công ty giả lâu dài.
- CV PDF đã được người dùng mở thành công; việc đọc sâu nội dung bytes của đối tượng qua công cụ quản trị không thuộc phạm vi kiểm thử này.

## 3. Các bản vá đã áp dụng

1. **PR #3:** Sửa đường dẫn `storage.objects.name` trong CV Storage RLS; đã áp dụng migration và kiểm tra lại. <https://github.com/infiniti-money/Web-tuyen-dung/pull/3>
2. **PR #4:** Thêm chức năng gửi lại email xác minh, đã triển khai trên GitHub Pages. <https://github.com/infiniti-money/Web-tuyen-dung/pull/4>
3. **Bản hoàn thiện tiếp theo:** Việt hóa trạng thái ứng tuyển, chặn tải CV lên khi hồ sơ bị trùng, yêu cầu Supabase trả về bản ghi đã lưu trước khi báo cập nhật thành công.

## 4. Chưa đủ điều kiện để tuyên bố production-ready

- **Bảo vệ tài khoản:** Supabase Security Advisor còn cảnh báo `auth_leaked_password_protection` chưa bật.
- **Email:** SMTP iCloud đã gửi email kiểm thử thành công, nhưng chưa có kiểm thử tải thực tế hoặc phương án gửi email giao dịch quy mô lớn.
- **Chính sách dữ liệu:** Cần công bố chính sách quyền riêng tư, thời hạn lưu/xóa CV, đầu mối tiếp nhận yêu cầu xóa dữ liệu và quy trình xử lý sự cố.
- **Sao lưu/phục hồi:** Cần lập và thử phương án backup Postgres cùng đối tượng CV trong Storage, không giả định backup DB bao gồm file CV.
- **Bảo vệ thao tác:** Tiếp tục kiểm thử file PDF lỗi, dung lượng vượt 5 MB, giới hạn tốc độ, spam, nhiều người dùng đồng thời.
- **Thiết bị:** Chưa có bằng chứng nghiệm thu toàn bộ trên nhiều trình duyệt và kích cỡ màn hình.
- **Dữ liệu kiểm thử:** Chưa xóa các hồ sơ, CV hoặc tin có tên `[TEST]`; chỉ dọn sau khi Admin quyết định.

## 5. Tiêu chí nghiệm thu giai đoạn sau

1. Hoàn tất giao diện tiếng Việt và thông báo lỗi rõ ràng.
2. Mọi hành động lưu trạng thái phải xác nhận bản ghi trả về từ Supabase; không báo thành công khi cập nhật 0 dòng.
3. Các thay đổi được kiểm tra bằng `node --check`, bộ smoke test và GitHub Actions, chỉ gộp sau khi CI xanh.
4. Xác minh email, nộp CV, mở CV và cập nhật trạng thái thực tế sau mỗi thay đổi liên quan quyền truy cập.
5. Chuẩn bị quy chế dữ liệu, backup/restore và cơ chế chống lạm dụng trước khi mở rộng người dùng.

**Kết luận:** Nghiệm thu quy trình nghiệp vụ cốt lõi **PASS**; kiểm thử và điều kiện vận hành production vẫn đang được hoàn thiện.
