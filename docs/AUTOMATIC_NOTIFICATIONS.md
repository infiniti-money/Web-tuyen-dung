# Hưng Yên Jobs — Tự động gửi email và Web Push (giai đoạn kích hoạt)

Cập nhật: 31/10/2026. Supabase project: `lxarzbxymgjomsztftqj`.

## Những phần đã được triển khai

- Schema theo dõi sự đồng ý: `job_alert_preferences.email_opt_in`, `push_opt_in`, thời điểm bật từng kênh, mặc định **false**. Trigger DB tự xác lập thời điểm bật/tắt, không để frontend tự khai báo thời điểm.
- Mốc tin **mới được duyệt**: `jobs.published_at`. Những tin đã công khai trước migration có `NULL` để không spam lịch sử.
- Bảng push subscriptions `web_push_subscriptions`: RLS chỉ tài khoản Ứng viên sở hữu mới đọc/ghi/xóa endpoint của mình.
- Nhật ký gửi `job_notification_deliveries`: chỉ phía máy chủ; ràng buộc `unique(user_id,job_id,channel)`, không cấp quyền cho `anon` hoặc `authenticated`.
- Edge Function `job-alert-dispatch`, triển khai trên Supabase với `verify_jwt=false` nhưng **bắt buộc** có `x-alert-job-secret` dài ít nhất 32 ký tự khớp `ALERT_JOB_SECRET` trên máy chủ.
- Email qua Resend (chỉ sau khi xác minh tên miền), Web Push theo VAPID (chỉ sau khi trình duyệt được cấp quyền).
- GitHub Actions `dispatch-job-alerts.yml` kiểm tra theo lịch mỗi giờ (phút 17 UTC), nhưng **không gửi** nếu biến `HYJOBS_ALERT_DISPATCH_ENABLED` chưa đặt thành `true`.
- Giao diện tại `app.html#alerts`: ứng viên tự bật/tắt email, bật/tắt push bằng thao tác trực tiếp, không hỏi quyền khi chưa bấm.

## Kích hoạt gửi thật: công việc quản trị còn cần thực hiện

**Mặc định hiện tại: CHƯA KÍCH HOẠT gửi email và Push thật. Không được coi là đã gửi thành công khi chưa có cấu hình và bài kiểm thử có người nhận đồng ý.**

1. Tạo tài khoản <https://resend.com/> và xác minh tên miền gửi email. Lấy `RESEND_API_KEY` và địa chỉ `ALERT_FROM_EMAIL` thuộc tên miền đã xác minh. Không dùng iCloud SMTP của Supabase Auth như API gửi thư hàng loạt.
2. Sinh một cặp khóa VAPID theo hướng dẫn thư viện `web-push`. Chỉ khóa công khai `VAPID_PUBLIC_KEY` được đưa vào `config.notifications.js`. **Không bao giờ** commit khóa riêng tư `VAPID_PRIVATE_KEY`.
3. Tạo chuỗi ngẫu nhiên `ALERT_JOB_SECRET` độ dài ít nhất 32 ký tự. Cấu hình ở môi trường Secrets của **Supabase Edge Functions**, không lưu vào database/public repo.
4. Cấu hình Secrets của Supabase Function: `ALERT_JOB_SECRET`, `RESEND_API_KEY`, `ALERT_FROM_EMAIL`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_CONTACT_EMAIL` (dạng `mailto:contact@yourdomain`). Supabase Edge Runtime phải có `SUPABASE_URL` và khóa máy chủ `SUPABASE_SERVICE_ROLE_KEY`; không đưa khóa máy chủ lên frontend.
5. GitHub repository Settings → Secrets and variables → Actions: tạo secret `HYJOBS_ALERT_JOB_SECRET` có **cùng giá trị** với `ALERT_JOB_SECRET` của Supabase. Ban đầu **chưa** đặt biến `HYJOBS_ALERT_DISPATCH_ENABLED=true`.
6. Đăng ký/xác minh email Ứng viên thử nghiệm và **chủ động bật** email tại `#alerts`. Trên thiết bị hỗ trợ, bật Push sau khi key công khai được cấu hình.
7. Đăng một tin tuyển dụng QA mới, phê duyệt **sau** thời điểm đăng ký nhận tin; kiểm tra Edge Logs, Resend delivery status, trình duyệt Push và bảng `job_notification_deliveries` chỉ có 1 dòng mỗi cặp user-job-channel.
8. Sau khi kiểm thử, bật GitHub variable `HYJOBS_ALERT_DISPATCH_ENABLED=true`; tự động gọi Edge Function qua lịch GitHub Actions. Giám sát failures thường xuyên.

Khi chưa có nhà cung cấp / key, chức năng gửi vẫn được khóa, **không** cam kết gửi email/Push.

## Điều kiện hoạt động và giới hạn

- Chỉ tài khoản Ứng viên đã chọn nhận tin và có email đã xác minh mới nhận email.
- Chỉ tin `published` của công ty `approved`, có `published_at` sau thời điểm bật kênh mới được gửi.
- Dùng bộ lọc từ khóa/ngành/khu vực/mức lương của `job_alert_preferences`, không sử dụng CV/thông tin nhạy cảm trong nội dung thông báo.
- Edge Function giới hạn tối đa 80 lần nhận việc gửi mỗi lượt, 200 tin công khai, 500 người dùng đang bật; mở rộng sau khi chuyển sang truy vấn trang phía server.
- Ưu tiên **không gửi trùng**: claim duy nhất được ghi vào DB trước khi gửi; lỗi được ghi `failed` và **không tự thử lại**, tránh trùng thư. Chưa có hệ thống retry/idempotency hoàn chỉnh.
- Safari trên iOS 16.4+ yêu cầu website đã thêm vào **Màn hình chính** trước khi hỗ trợ Web Push. Không ép yêu cầu quyền khi người dùng chưa bấm.
- Không tự động bật opt-in cho tài khoản cũ; bất cứ lúc nào cũng có thể tắt kênh.
- GitHub Actions lịch có thể chậm hơn giờ dự kiến. Đây là quét định kỳ, **không phải** thông báo tức thời theo giây.
- Công việc production (riêng tư, lưu CV, email sender/reputation, chống lạm dụng) vẫn theo issue #6.

## Kiểm thử bảo mật đã thực hiện

Migration được chạy thử `BEGIN ... ROLLBACK` trước khi áp dụng. Kiểm thử SQL theo vai trò Ứng viên xác nhận timestamp tự sinh và xóa khi rút đồng ý, endpoint chỉ chính chủ nhìn thấy; người khác không đọc được, `anon` không có SELECT, log gửi không cấp cho người dùng. Kiểm thử dấu `published_at` khi công việc chuyển sang `published` cũng được rollback.
