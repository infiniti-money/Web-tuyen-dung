# Hưng Yên Jobs — Bản thảo phê duyệt thông tin quyền riêng tư và lưu CV

**Trạng thái:** BẢN THẢO CHƯA ĐƯỢC PHÊ DUYỆT. Không dùng thay trang `app.html#privacy` hiện tại hoặc thông báo chính thức cho đến khi người vận hành và người phụ trách pháp lý xác nhận.

## Thông tin đơn vị phải xác nhận

| Trường | Giá trị |
| --- | --- |
| Đơn vị kiểm soát dữ liệu cá nhân / tên pháp nhân đầy đủ | **[CẦN CHỦ DỰ ÁN XÁC NHẬN]** |
| Mã định danh pháp lý (nếu áp dụng) | **[CẦN XÁC NHẬN]** |
| Địa chỉ công khai | **[CẦN XÁC NHẬN]** |
| Email hỗ trợ / xử lý yêu cầu dữ liệu | **[CẦN XÁC NHẬN]** |
| Người hoặc bộ phận chịu trách nhiệm | **[CẦN XÁC NHẬN]** |
| Kênh dự phòng tiếp nhận yêu cầu | **[CẦN XÁC NHẬN]** |
| Ngày phê duyệt và phiên bản chính sách | **[CHƯA CÓ]** |

Không lấy email/tên từ dự án khác; `contact@example.com` trong `index.html` chỉ là ví dụ, **không** thể dùng làm đầu mối tiếp nhận thật.

## Nội dung chuẩn bị cho thông báo người dùng

Hưng Yên Jobs xử lý tài khoản Supabase Auth (email xác thực), hồ sơ (tên và các trường tự nguyện như số điện thoại/ngày sinh), hồ sơ công ty và tin tuyển dụng, CV PDF, đơn ứng tuyển, trạng thái tuyển dụng, việc làm đã lưu và tùy chọn thông báo. Các trường không cần thiết cho nhiệm vụ tuyển dụng phải được tối thiểu hóa.

Mục đích: xác thực tài khoản; cung cấp nền tảng tuyển dụng; chuyển hồ sơ tới nhà tuyển dụng được phân quyền; kiểm duyệt tin; bảo vệ truy cập và hỗ trợ người dùng. Email/Web Push quảng bá chỉ gửi khi người dùng tự chọn nhận và dịch vụ đã được bật.

Bên nhận dữ liệu: người dùng đúng tài khoản; nhà tuyển dụng của tin tuyển dụng mà ứng viên nộp; Admin theo đúng nhiệm vụ; đơn vị hạ tầng GitHub Pages (frontend) và Supabase (Auth, database và Storage). Dự án Supabase đặt ở Singapore; việc chuyển dữ liệu xuyên biên giới và các nghĩa vụ liên quan phải được người vận hành và cố vấn pháp lý đánh giá trước khi công bố chính sách.

Quyền của người dùng: truy cập, chỉnh sửa, nhận bản sao, hạn chế xử lý, rút đồng ý và yêu cầu xóa phù hợp pháp luật. Họ có thể gửi yêu cầu trong `app.html#data-rights`. Việc gửi yêu cầu xóa không khiến CV gắn với ứng tuyển đang xử lý bị xóa tự động. Phản hồi phải nêu rõ kết quả và lý do lưu giữ lại khi áp dụng.

## Bảng thời hạn lưu CV — đề xuất cần lựa chọn

**Không có thời hạn nào dưới đây được duyệt hoặc kích hoạt tự động.** Con số trong ví dụ chỉ là lựa chọn thiết kế, không phải thời hạn do pháp luật ấn định.

| Loại dữ liệu | Thời hạn | Sự kiện bắt đầu tính | Hành động kết thúc |
| --- | --- | --- | --- |
| CV trong thư viện cá nhân chưa gắn ứng tuyển | **[CẦN CHỌN, ví dụ 90 ngày sau khi người dùng xóa tài khoản]** | Sau yêu cầu xóa tài khoản đã xác minh hoặc theo thỏa thuận | Xem xét xóa object và metadata, nếu không có liên kết đang dùng |
| CV đã nộp cho tuyển dụng | **[CẦN CHỌN, ví dụ 12 tháng kể từ kết thúc đợt tuyển dụng]** | Trạng thái chốt của quy trình tuyển dụng phải được định nghĩa rõ | Đối soát `applications`, pháp lý, backup rồi xử lý xóa/ẩn danh |
| CV trong bản sao lưu mã hóa | **[CẦN CHỌN]** | Thời điểm tạo backup | Hết chu kỳ backup đã được thông báo; có cơ chế xử lý yêu cầu xóa |
| Nhật ký hoạt động / chứng cứ nghiệp vụ | **[CẦN CHỌN]** | Tạo bản ghi | Xóa/ẩn danh theo nghĩa vụ lưu giữ áp dụng |

Cần xác định dữ liệu liên quan đơn đang `reviewing`, tranh chấp hoặc nghĩa vụ lưu giữ, đồng ý nhận tin và cách rút đồng ý, lịch trình rà soát dữ liệu, chu kỳ backup. Tránh chạy job xóa tự động khi chưa có backup/restore được kiểm thử và logic quan hệ CV an toàn.

## Phê duyệt trước phát hành

- [ ] Chủ dự án xác nhận chính xác tên đơn vị, địa chỉ, email liên hệ và người phụ trách.
- [ ] Chủ dự án xác nhận bảng thời hạn lưu và tiêu chí kết thúc quy trình tuyển dụng.
- [ ] Người phụ trách pháp lý rà soát nội dung theo pháp luật hiện hành, đặc biệt Luật 91/2025/QH15 và hướng dẫn có liên quan.
- [ ] Bản chính thức nêu rõ phiên bản/ngày có hiệu lực, cách liên hệ, rút đồng ý và xử lý yêu cầu.
- [ ] Kiểm thử tính dễ đọc/di động và quy trình gửi yêu cầu người dùng thực.
- [ ] Cập nhật giao diện `src/privacy-rights.js` chỉ sau khi các trường đã được phê duyệt; không thay placeholder bằng thông tin giả.

Nguồn tham khảo: https://congbao.chinhphu.vn/van-ban/luat-so-91-2025-qh15-45578/57730.htm
