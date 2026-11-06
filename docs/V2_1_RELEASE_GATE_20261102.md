# Hưng Yên Jobs — Cổng nghiệm thu và phát hành v2.1 (02/11/2026)

**PR:** #28, nhánh `feat/v2-1-deletion-review-gate-20261102`. Môi trường production: Supabase `lxarzbxymgjomsztftqj`, GitHub Pages từ `main`.

## Quy tắc
Không được đánh dấu hoàn thành hoặc gộp PR vào `main` khi chưa đủ cổng an toàn bên dưới. Đây là tài liệu ghi nhận kết quả thực, không phải báo cáo giả định. Không đưa CV, email, token hoặc dữ liệu cá nhân vào GitHub.

| Cổng | Trạng thái lúc lập | Bằng chứng / việc còn phải làm |
|---|---|---|
| CI website (Validate, Browser QA, Pages) | ĐẠT ở commit PR trước đợt chỉnh cuối; cần kiểm tra lại commit mới | GitHub Actions trên PR #28 |
| PostgreSQL logic (giao dịch bảng tạm, mã migration ánh xạ pg_temp) | ĐẠT 8 kịch bản, không có lỗi SQL | Chặn pending->resolved; chặn phản hồi ngắn; nhận in_review->resolved hợp lệ; giữ các trạng thái khác; chặn sửa phản hồi đã resolved thành ngắn. Chạy trong BEGIN/ROLLBACK, không dùng bảng production. |
| Test trên Supabase development branch độc lập | CHƯA ĐẠT | Không có branch ở thời điểm kiểm tra; tạo branch có thể tính phí nên phải chấp thuận chi phí trước |
| Migration production | CHƯA TRIỂN KHAI | Không gọi `apply_migration` trước cổng backup và nghiệm thu |
| Admin login thực tế | CHƯA ĐẠT | DB xác nhận có 1 Admin đã xác minh và có lịch sử đăng nhập; **không** có phiên đăng nhập tương tác Admin trong lần nghiệm thu này |
| Test quyền riêng tư ứng viên/nhà tuyển dụng/Admin | CHƯA ĐẠT | Thực hiện với tài khoản thử đã xác minh, không xem dữ liệu của người khác; dùng yêu cầu thử không có thông tin thật |
| Sao lưu PostgreSQL | CHƯA ĐẠT | Chưa có tệp backup được lưu an toàn và checksum SHA-256 |
| Sao lưu Storage `candidate-cvs` | CHƯA ĐẠT | Có 1 object, chưa có bản sao bytes và checksum |
| Thử phục hồi tách biệt | CHƯA ĐẠT | Chưa có đích restore cô lập và bằng chứng đọc được CV sau restore |
| Danh tính đơn vị chịu trách nhiệm | CHƯA ĐẠT | Chưa có tên pháp nhân/đơn vị, địa chỉ công khai và email được chủ dự án xác nhận |
| Chính sách quyền riêng tư chính thức / retention CV | CHƯA ĐẠT | Chỉ có bản dự thảo; cần duyệt bản công bố, căn cứ/chu kỳ lưu trữ, xử lý yêu cầu xóa |
| Google OAuth | CHƯA ĐẠT | Người dùng đã gặp Google `redirect_uri_mismatch`; cần cấu hình callback Cloud và kiểm thử thực tế |

## Đối soát chỉ đọc tại thời điểm chuẩn bị
- `applications`: 1.
- `storage.objects` bucket `candidate-cvs`: 1.
- Thiếu liên kết `applications.cv_path` -> Storage: 0.
- `data_rights_requests`: 0.
- Function `public.enforce_deletion_review_before_resolution()`: **chưa có** trên production.
- Không thực hiện xóa hay cập nhật CV/đơn/Profiles production khi kiểm thử.

## Sao lưu PostgreSQL và Storage (thao tác từ máy quản trị, KHÔNG lưu trên GitHub)
1. Kiểm tra phiên bản CLI: `supabase --version`, `supabase db dump --help`, `supabase storage cp --help`. Chỉ nhập kết nối DB trong công cụ quản lý secrets/credential trên máy, **không** commit hoặc đẩy vào log.
2. Dùng **Supabase CLI** từ thiết bị quản trị xuất riêng roles/schema/data theo tài liệu chính thức: https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore . Cần đối soát cả `auth`, `public`, bảng Storage metadata và migration hiện có, không mặc định một tệp schema chứa toàn bộ dữ liệu.
3. Xuất **bytes** của mọi object trong bucket private `candidate-cvs` theo https://supabase.com/docs/guides/storage/management/download-objects , bằng CLI hoặc S3 client riêng tư (không chuyển bucket thành public).
4. Mã hóa bản sao, lưu vào nơi truy cập giới hạn, tạo SHA-256 và manifest riêng (thời điểm, số bản ghi, số file, byte, checksum, cách lưu khóa mã hóa). Không tải lên repo, Actions hoặc chat.
5. Phục hồi PostgreSQL + Storage trên **đích cô lập không phải production** theo hướng dẫn Supabase; cấu hình Auth và Storage riêng; xác minh qua tài khoản kiểm thử rằng ứng tuyển/metadata, bytes và liên kết CV còn nguyên. Lưu số liệu và thời gian RPO/RTO thực đo.
6. Chỉ sau khi backup + restore có bằng chứng mới xin duyệt áp migration và gộp PR.

## Kịch bản Admin trên trình duyệt thật
- Admin đăng nhập thật vào `app.html#admin-rights`, xác minh đúng quyền và không lộ yêu cầu của người khác.
- Trên bản sao có dữ liệu kiểm thử giả: gửi yêu cầu `deletion` từ tài khoản candidate.
- Thử `pending -> resolved`: phải bị từ chối; `pending -> in_review`: được phép.
- Khi thiếu một trong bốn xác nhận: UI chặn; khi phản hồi <80 ký tự: UI và trigger DB chặn; sau khi có bằng chứng thực tế, bốn xác nhận và trả lời dài đủ: mới `resolved`.
- Kiểm tra `rejected` vẫn hoạt động theo chính sách; thử truy cập chéo ứng viên/nhà tuyển dụng không lấy được CV; kiểm thử điện thoại.
- Trên production, **không tạo yêu cầu xóa dữ liệu thật chỉ để kiểm thử**, không chọn `resolved` cho yêu cầu chưa xử lý thực.

## Quyết định
**HOLD / KHÔNG MERGE** cho đến khi toàn bộ điều kiện còn thiếu được hoàn thành. Không coi CI xanh là đã có backup, đã login Admin, đã tuân thủ pháp luật hoặc đã sửa Google OAuth.
