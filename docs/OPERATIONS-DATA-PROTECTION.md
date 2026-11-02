# Hưng Yên Jobs v2.1 — Sổ tay quyền riêng tư và khôi phục dữ liệu

Cập nhật: 02/11/2026 · Hạ tầng: GitHub Pages + Supabase (Free trong cấu hình dự án ban đầu).

## 1. Phạm vi và trạng thái pháp lý

Luật Bảo vệ dữ liệu cá nhân Việt Nam số 91/2025/QH15 đã có hiệu lực từ ngày 01/01/2026. Xem [Bộ Công an](https://bocongan.gov.vn/chinh-sach-phap-luat/co-so-du-lieu-van-ban/luat-bao-ve-du-lieu-ca-nhan-1753688803) và [cổng văn bản Chính phủ](https://vanban.chinhphu.vn/?classid=1&docid=214590&pageid=27160&typegroup=).

Giao diện `app.html#privacy` cung cấp **thông tin xử lý dữ liệu bản dự thảo** để giải thích các nhóm dữ liệu, dịch vụ nhận dữ liệu và quyền cơ bản. Không công bố rằng dự án đã tuân thủ pháp luật hoàn toàn. Người vận hành còn phải xác nhận:
- Tên pháp nhân/đơn vị kiểm soát dữ liệu, đầu mối và email tiếp nhận chính thức; thông tin liên hệ công khai.
- Mục đích và cơ sở xử lý từng loại dữ liệu, nội dung thông báo/đồng ý của chủ thể dữ liệu.
- Thời hạn lưu dữ liệu và CV, xử lý với hồ sơ ứng tuyển đang xét duyệt, quy định xóa/ẩn danh.
- Đánh giá các bên xử lý dữ liệu, phân quyền, việc lưu trữ/chuyển dữ liệu ra nước ngoài và quy định pháp lý liên quan.
- Văn bản được người có trách nhiệm pháp lý hoặc vận hành phê duyệt trước khi chuyển từ **dự thảo** sang chính sách chính thức.

## 2. Những chức năng đã triển khai

- `app.html#data-rights`: người đã đăng nhập xem lịch sử yêu cầu riêng và gửi yêu cầu truy cập, chỉnh sửa, xóa, hạn chế xử lý, rút đồng ý hoặc yêu cầu khác.
- `app.html#data-rights` có tải bản sao JSON các dữ liệu ứng dụng **đang thuộc quyền tài khoản** (metadata tài khoản, đơn ứng tuyển và thư giới thiệu, tên CV, việc đã lưu, tùy chọn thông báo). **Không** chứa mật khẩu, phiên đăng nhập, tệp PDF hay thông tin người dùng khác; việc xuất tệp cần tự bảo vệ thiết bị lưu.
- `app.html#admin-rights`: Admin xem hàng đợi và phản hồi. Không có nút xóa tài khoản hay CV từ Admin UI.
- Bảng `public.data_rights_requests`: RLS chủ sở hữu / Admin; giới hạn một yêu cầu đang mở mỗi loại, thời gian chờ tối thiểu 15 phút giữa các lần gửi; không cho ứng viên tự đổi trạng thái; dữ liệu thử được rollback.
- Mã quản trị và các ô hiển thị đều phải escape HTML trước khi render.

## 3. Quy trình tiếp nhận yêu cầu xóa (KHÔNG tự xóa)

1. Người dùng đăng nhập và gửi yêu cầu; hệ thống tạo ID, thời gian và trạng thái `pending`. Admin kiểm tra yêu cầu mới tại `#admin-rights`, ghi nhận điều kiện xác minh danh tính.
2. Xem xét loại dữ liệu, đơn ứng tuyển liên quan, quyền lợi của doanh nghiệp và nghĩa vụ phải lưu theo luật hoặc thỏa thuận. Chuyển trạng thái `in_review`.
3. Lập danh sách **cụ thể** các bản ghi thuộc yêu cầu, tệp CV, các bản sao lưu và phụ thuộc giữa bảng `applications`, `candidate_documents`, `storage.objects`. Không đưa danh sách tên người và đường dẫn CV lên GitHub Issue/CI logs.
4. **Bắt buộc** xác nhận phương án sao lưu và kết quả thử phục hồi trên môi trường tách biệt trước khi xóa bất kỳ dữ liệu production nào. Lập biên bản hành động được người có quyền phê duyệt.
5. Thao tác xóa phù hợp phạm vi được duyệt, đối soát tệp và metadata sau xóa. Supabase Storage không hỗ trợ khôi phục file đã xóa bằng cách rollback giao dịch PostgreSQL.
6. Trả lời người dùng rõ dữ liệu nào đã xử lý, dữ liệu nào chưa thể xóa và lý do; không đánh dấu `resolved` khi chưa thực hiện xong. Không tạo nội dung phản hồi có CV, token hoặc dữ liệu của bên thứ ba.
7. Thực hiện kiểm tra hậu xử lý bằng `supabase/audits/production-integrity.sql` (chỉ trả về số lượng, không chứa thông tin cá nhân).

## 4. Sao lưu phục hồi — SOP bắt buộc

**Không sử dụng GitHub Releases, Actions artifacts hoặc thư mục công khai để lưu bản sao CV hay database.**

- Supabase Free không có daily database backup tự động. Tài liệu: [Supabase Free backup FAQ](https://supabase.com/kb/faqs/platform/free-plan-backups), [Supabase Database Backups](https://supabase.com/docs/guides/platform/backups). Cần chạy bản sao lưu thủ công định kỳ hoặc nâng cấp gói theo quyết định của chủ dự án.
- Sao lưu **PostgreSQL** gồm Auth/Profiles/Jobs/Applications/Preferences/metadata. Từ máy được cấp quyền, sử dụng Supabase CLI và thực hiện `supabase db dump --help` để chọn cách xuất tương ứng phiên bản; hoặc `pg_dump` với kết nối database riêng tư. Bảo mật mật khẩu và tệp backup. Không ghi URL chứa password vào shell history.
- Sao lưu **file trong bucket private `candidate-cvs`** riêng biệt qua [Supabase Storage Download](https://supabase.com/docs/guides/storage/management/download-objects) hoặc S3-compatible client (rclone/Cyberduck) sau khi bật S3 protocol và tạo access credentials ở Dashboard; lưu metadata phục vụ đối chiếu và checksum. Không công khai object hoặc gửi signed URL qua chat.
- Mã nguồn tĩnh và migration đã có trong GitHub; ZIP phát hành chỉ có website, **không** có dữ liệu production.
- Lưu các bản sao dưới dạng **mã hóa**, có kiểm soát truy cập, giới hạn số người được mở và thời gian lưu; chìa khóa giải mã bảo quản độc lập với bản sao.
- Phục hồi thử trên một **dự án/đích cô lập** có quyền quản trị phù hợp (có thể phát sinh phí). Tuyệt đối không restore đè project đang chạy. So sánh các thống kê không nhạy cảm bằng script audit, rồi kiểm tra thử hồ sơ/CV bằng quyền thử nghiệm.
- Ghi nhận lần sao lưu gần nhất, người thực hiện, kiểm tra SHA-256, số bản ghi/tệp, ngày thử phục hồi, thời gian khôi phục thực tế. RPO/RTO chỉ xác nhận sau khi có bài test, không được tự đặt.
- Supabase Database Backup chỉ lưu **metadata của Storage**, không kèm bytes của CV; thiếu backup object sẽ không phục hồi được CV đã xóa.

**Điều kiện đủ:** bằng chứng đã có bản sao của cả database và CV, đã mở/khôi phục trên bản sao, có người chịu trách nhiệm; chưa có bằng chứng đó thì không đánh dấu hoàn thành v2.2 hay tuyên bố production-ready.

## 5. Quyền truy cập và an toàn

- Không lưu service-role, database URI, SMTP password, VAPID private key trong JavaScript website hoặc repo.
- MFA / leaked-password protection / chống bot với xác minh máy chủ còn phải kiểm tra, đặc biệt cảnh báo Supabase Auth leaked-password protection hiện đang bật hay tắt theo Security Advisor.
- Duy trì RLS và giới hạn quyền signed URL của Storage; không dùng key server để thay quyền ứng viên trên frontend.
- Định kỳ kiểm tra object không có application/document và ứng dụng tham chiếu thiếu file (script audit). Không tự xóa những file được đánh dấu "unused" khi chưa có quyết định hợp lệ.
- Email/Push vẫn khóa nếu chưa xác minh nhà cung cấp và có đồng ý.

## 6. Giới hạn tần suất bổ sung (v2.1)

- Ứng viên được phép gửi tối đa **15 hồ sơ trong 30 phút**, Nhà tuyển dụng tối đa **50 tin/24 giờ** theo công ty (trên dữ liệu mới).
- Hai trigger PostgreSQL kiểm tra theo tài khoản/công ty, dùng khóa giao dịch `pg_advisory_xact_lock` để tránh hai yêu cầu đồng thời cùng vượt giới hạn.
- Đã thử 15/16 lượt ứng tuyển và 50/51 lượt đăng tin trong transaction `BEGIN/ROLLBACK`. Đơn thứ 16 và tin thứ 51 bị từ chối; dữ liệu kiểm thử không lưu lại.
- Đây là giới hạn ở tầng **ứng dụng sau đăng nhập**, không thay thế Turnstile/CAPTCHA có xác minh server, bảo vệ endpoint đăng ký Auth, email throttling, abuse detection theo IP và giám sát đăng nhập. Các hạng mục này còn cần cấu hình và kiểm thử riêng.
- Khi Nhà tuyển dụng cần đăng hàng loạt hợp lệ, phải có quy trình xác thực Admin và thay đổi giới hạn có kiểm soát thay vì tắt bảo vệ.

## 6. Biên bản nghiệm thu thương mại

Phải có chữ ký/phê duyệt của người vận hành cho chính sách quyền riêng tư; thử quy trình nhận và giải quyết yêu cầu của tài khoản thật; chứng nhận test backup và restore; kiểm thử quyền chéo, bảo mật CV, chống lạm dụng Auth/Job/Application và kiểm thử iPhone/Android thực tế. Tính năng email/Push gửi thật là một cổng kích hoạt riêng, không được xem là đã hoạt động nếu chưa có cấu hình.
