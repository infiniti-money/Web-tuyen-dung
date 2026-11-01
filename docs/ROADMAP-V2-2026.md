# Lộ trình hoàn thiện Hưng Yên Jobs sau v2.0.0

Cập nhật: **02/11/2026**. Nền tảng hiện tại: [GitHub Pages](https://infiniti-money.github.io/Web-tuyen-dung/app.html) + Supabase `hung-yen-jobs`. Mục tiêu: từ bản v2.0.0 đã có quy trình tuyển dụng thực tế sang phiên bản vận hành tin cậy, bảo vệ dữ liệu và mở rộng có kiểm soát.

## Nguyên tắc không được phá vỡ

- Không tạo lại Supabase, đổi URL, đổi tài khoản Admin, xóa đơn ứng tuyển hoặc tệp CV đang sử dụng.
- Duy trì RLS đối với ứng viên, nhà tuyển dụng, Admin; private Storage `candidate-cvs`, signed URL theo quyền, bảo vệ các secrets.
- Merge chỉ khi chạy CI thành công, có mô tả rủi ro/rollback và có kết quả kiểm thử phù hợp.
- Email/Web Push tự động chỉ gửi **sau khi người dùng tự nguyện bật**, đã cấu hình nhà cung cấp và kiểm thử không gửi trùng.
- Chi phí ước lượng hoặc hành động xóa dữ liệu production cần được người quản trị phê duyệt riêng.

## v2.1 — Quyền riêng tư, kiểm tra CV và an toàn dữ liệu (đang triển khai)

- [x] Xác nhận bucket `candidate-cvs`: `public=false`, tối đa 5 MiB, MIME `application/pdf`.
- [x] Bổ sung kiểm tra chữ ký PDF `%PDF-` và giới hạn kích thước, MIME, tên tệp tại **cả hai luồng tải lên**. Không đọc nội dung CV lên log.
- [x] Kiểm thử file PDF thật/giả, sai phần mở rộng, quá dung lượng bằng smoke test Node.
- [ ] Công bố thông tin sử dụng dữ liệu cá nhân, thời hạn lưu và kênh nhận yêu cầu xóa có người phụ trách; cần xác nhận email liên hệ chính thức và rà soát chính sách trước khi công bố.
- [ ] Quy trình xóa theo yêu cầu có kiểm tra liên kết `applications` và Storage, bảo đảm không xóa CV đang được nhà tuyển dụng xem/đang xử lý.
- [ ] Kiểm thử riêng file PDF chứa nội dung nguy hiểm và phương án quét trên **máy chủ**. Kiểm tra magic bytes phía client chỉ là một lớp kiểm tra, **không phải** quét virus hoặc bảo đảm toàn vẹn PDF.
- [ ] Kiểm thử bằng điện thoại iOS/Android và tài khoản thật, có biên bản nghiệm thu.

**Điều kiện hoàn tất v2.1:** tài liệu dữ liệu cá nhân được người vận hành phê duyệt, quy trình yêu cầu xóa hoạt động an toàn, RLS và kiểm thử CV hoàn chỉnh.

## v2.2 — Sao lưu, phục hồi và vận hành

- [ ] Kế hoạch sao lưu cả PostgreSQL lẫn bucket `candidate-cvs` và phiên bản file frontend.
- [ ] Phục hồi trên dự án thử nghiệm riêng; xác minh liên kết hồ sơ/Storage và phép mở CV, không thử ghi đè production.
- [ ] Tài liệu RPO/RTO, vận hành khi lỗi, kiểm soát quyền đối với bản sao lưu.
- [ ] Định kỳ kiểm tra log lỗi Supabase, dung lượng Storage và tình trạng CI.

## v2.3 — Chống spam, quyền truy cập và tin cậy

- [ ] Turnstile/CAPTCHA phù hợp GitHub Pages + Supabase, có xác minh phía máy chủ; không chỉ kiểm tra ở trình duyệt.
- [ ] Rate limit và chống tạo nhiều đơn/hồ sơ, không làm gián đoạn luồng ứng tuyển hợp lệ.
- [ ] Giải quyết Security Advisor `Leaked Password Protection Disabled` theo tính năng/gói Supabase thực tế.
- [ ] Kiểm thử RLS theo Ứng viên, Nhà tuyển dụng, Admin, khách; signed URL hết hạn và phân quyền giữa doanh nghiệp.

## v2.4 — Email & Web Push tự động (cấu trúc đã có, chưa kích hoạt gửi thật)

- [x] Có Edge Function `job-alert-dispatch`, log chống gửi trùng và cơ chế đồng ý nhận thông báo.
- [ ] Cấu hình email sender đã xác minh, API key lưu an toàn; không tái sử dụng SMTP xác nhận Auth cho gửi hàng loạt không kiểm soát.
- [ ] Tạo VAPID, chỉ đưa public key lên GitHub Pages; private key giữ trong Supabase Secrets.
- [ ] Kiểm thử email/Push với tài khoản tự đăng ký, xác minh rút đồng ý và bảo vệ không gửi trùng.
- [ ] Chỉ sau nghiệm thu mới bật GitHub Actions dispatch định kỳ; theo dõi lỗi nhà cung cấp.

**Theo dõi:** [Issue #16](https://github.com/infiniti-money/Web-tuyen-dung/issues/16).

## v2.5 — Nâng cao trải nghiệm thương mại và quy mô lớn

- [ ] Phân trang và bộ lọc phía PostgreSQL thay vì lọc 1.000 tin trên trình duyệt.
- [ ] Mô hình doanh nghiệp nâng cao, tìm kiếm theo khu vực/ngành/mức lương và đánh giá chất lượng tin.
- [ ] Dashboard quản trị có lịch sử thao tác, xuất dữ liệu giới hạn quyền, cảnh báo việc làm có dấu hiệu spam.
- [ ] Theo dõi hiệu quả tuyển dụng theo hướng tổng hợp, không để lộ CV/dữ liệu cá nhân cho người không được cấp quyền.

## Trạng thái nền tảng tại thời điểm bắt đầu

- Bản v2.0.0 đã phát hành, không có PR mở trong lượt rà soát.
- Supabase có 4 người dùng, 1 application, 1 CV PDF đang lưu; chưa tiến hành xóa dữ liệu.
- Kiểm tra Security Advisors: vẫn còn cảnh báo `auth_leaked_password_protection`. Thông tin RLS không có chính sách ở bảng log gửi là có chủ đích (không cấp quyền client).
- Nhánh triển khai v2.1 đầu tiên: `feat/v2.1-cv-safety-roadmap-20261102`.

## Tài liệu và điểm theo dõi

- [Issue #6 — Production readiness](https://github.com/infiniti-money/Web-tuyen-dung/issues/6).
- [Issue #14 — QA bằng tài khoản thật](https://github.com/infiniti-money/Web-tuyen-dung/issues/14).
- [Issue #16 — Resend và Web Push](https://github.com/infiniti-money/Web-tuyen-dung/issues/16).
- [Báo cáo kiểm thử nền tảng](../QA-ACCEPTANCE.md).
