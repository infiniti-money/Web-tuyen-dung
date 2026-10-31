# Hưng Yên Jobs — Marketplace nâng cao (31/10/2026)

## Phạm vi phát triển

- **Tìm việc:** Bộ lọc ngành nghề và địa bàn lấy từ các tin `published` thực tế; tìm theo chức danh, ngành, mô tả, tên doanh nghiệp; các dải lương, sắp xếp và phân trang 12 kết quả/trang.
- **Thông tin công việc:** Đường dẫn sâu `app.html#job/<uuid>`, mô tả đầy đủ, yêu cầu tuyển dụng, khu vực, lương, ngày đăng, doanh nghiệp liên quan, nút ứng tuyển.
- **Hồ sơ doanh nghiệp:** `app.html#company/<uuid>`, chỉ công khai hồ sơ ở trạng thái `approved`, giới thiệu, khu vực, danh sách tin `published` và nút tìm tất cả tin của doanh nghiệp.
- **Admin:** Chỉ với tài khoản `admin`, hiển thị bốn thống kê nghiệp vụ, tiến độ xuất bản và hàng đợi duyệt công ty/tin; tìm kiếm và lọc theo trạng thái; thao tác cập nhật được xác nhận từ DB.
- **Giữ quy trình gốc:** Auth/Email, upload CV PDF, Storage riêng tư, RLS, ứng viên theo dõi và nhà tuyển dụng đọc CV/cập nhật hồ sơ không thay đổi.

## Giới hạn và lưu ý kỹ thuật

- Danh sách việc làm hiện tải theo từng lô 200 bản ghi, tối đa 1000 tin gần nhất, sau đó lọc/phân trang ở trình duyệt. Đây là cách phù hợp với quy mô nhỏ hiện tại (2 tin), **không phải** truy vấn phân trang phía server cho lưu lượng lớn.
- Khi tin tăng vượt 1000 hoặc có nhiều người dùng đồng thời, ưu tiên chuyển bộ lọc, phân trang và tổng số kết quả sang truy vấn PostgreSQL/PostgREST (đếm chính xác, chỉ tải mỗi trang) và lập chỉ mục phù hợp.
- Hàng đợi Admin hiện hiển thị tối đa 100 doanh nghiệp/tin gần nhất theo truy vấn hiện hành. Khi quy mô lớn hơn cần server-side pagination và bộ lọc DB.
- Không có ảnh/logo doanh nghiệp do bảng `companies` chưa lưu media. Giao diện dùng chữ cái đại diện, **không dựng thông tin/logo giả**.
- Doanh nghiệp đã duyệt hiện vẫn chịu chính sách kiểm duyệt khi muốn thay đổi nội dung; nâng cấp quy trình yêu cầu chỉnh sửa có phê duyệt ở giai đoạn kế tiếp.
- Chỉ người có quyền mới được xem CV. Không đặt signed URL hoặc thông tin nhạy cảm vào liên kết công khai.
- Ứng dụng vẫn ở GitHub Pages sử dụng publishable key, mọi kiểm soát quyền thực hiện qua RLS Supabase.

## Kiểm tra bắt buộc

1. Khách chưa đăng nhập xem `#jobs`, lọc ngành/khu vực/lương/sắp xếp/trang rồi xem chi tiết một tin `published`.
2. Mở `#job/<uuid>` và `#company/<uuid>` trực tiếp sau khi làm mới trình duyệt. UUID sai hoặc dữ liệu chưa được duyệt không được lộ.
3. Ứng viên đã xác minh có thể xem tin, ứng tuyển, nộp CV PDF và xem trạng thái tại dashboard.
4. Nhà tuyển dụng thấy hồ sơ doanh nghiệp mình công khai, danh sách ứng tuyển và mở CV với quyền đã được kiểm thử.
5. Admin đăng nhập, dùng lọc công ty/tin chờ duyệt, phê duyệt tin thử mới và xác nhận tin xuất hiện ở tìm việc; không ảnh hưởng tin hồ sơ hiện có.
6. Kiểm tra giao diện trên điện thoại và desktop: filter 2 cột/1 cột, trang chi tiết xếp dọc, bảng Admin cuộn ngang, focus bàn phím.
7. Chạy các test `node --check`, `node --test tests/smoke.test.mjs` và GitHub Actions cho nhánh/PR trước khi merge.

## Điều kiện production

Luồng cốt lõi đã nghiệm thu trước đó, nhưng vẫn còn những việc tại issue #6: chính sách quyền riêng tư, lưu trữ/xóa CV, backup & restore và chống spam. Không xóa test data hay mở rộng tiếp nhận hồ sơ thật quy mô lớn trước khi hoàn tất.
