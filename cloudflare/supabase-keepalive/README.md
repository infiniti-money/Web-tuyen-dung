# Hưng Yên Jobs — Supabase keepalive bằng Cloudflare Worker

Worker độc lập, chỉ chạy bằng Cron Trigger mỗi 6 giờ để tạo một lượt đọc
Data API trên Supabase Free. Mẫu gốc:
[Web-Design/cloudflare/supabase-keepalive](https://github.com/infiniti-money/Web-Design/tree/b8e017cc9c5254be3e2ca51bbb6fb41d11e0dafc/cloudflare/supabase-keepalive).

## Cấu hình đã đối chiếu

| Mục | Giá trị |
| --- | --- |
| Repository | `infiniti-money/Web-tuyen-dung`, nhánh đích `main` |
| Supabase | `hung-yen-jobs`, Singapore, `lxarzbxymgjomsztftqj` |
| Project URL | `https://lxarzbxymgjomsztftqj.supabase.co` |
| Worker | `hyjobs-supabase-keepalive` |
| Cron UTC | `17 */6 * * *` — 00:17, 06:17, 12:17, 18:17 |
| Giờ Việt Nam / UTC+7 | **01:17, 07:17, 13:17, 19:17** |
| Số lần dự kiến | 4/ngày, khoảng 120/30 ngày |
| HTTP công khai | Không có `fetch` handler; tắt `workers.dev`, preview URL và routes |
| Log | Workers Observability, lấy mẫu 100% |

Đọc cấu hình tại `config.public.js`, schema và chính sách SELECT thực tế của
`public.jobs` trước khi chọn endpoint:

```text
GET https://lxarzbxymgjomsztftqj.supabase.co/rest/v1/jobs?select=id&status=eq.published&limit=1
```

Request chỉ dùng header `apikey` chứa **publishable key** hiện có trong
`config.public.js` (trường có tên lịch sử là `anonKey`). Không thêm JWT phiên
đăng nhập hoặc `Authorization: Bearer` cho publishable key. Vai trò hiệu lực là
`anon`, chịu RLS; chỉ chọn cột `id` của tối đa một tin đã xuất bản. Kết quả `[]`
vẫn là SELECT thành công khi chưa có tin công khai.

Worker chỉ chấp nhận URL dự án trên và khóa `sb_publishable_...`. Khóa legacy
anon dạng JWT chưa được hỗ trợ vì repo đã dùng publishable key; không cần đổi
khóa hoặc bật thêm quyền. Khóa `sb_secret_...`, service-role và JWT người dùng
bị từ chối trước request. Worker không gọi RPC, Auth, Storage, Edge Functions,
không đọc bảng ứng viên/đơn ứng tuyển/CV và không ghi dữ liệu hay sửa RLS/schema.
Request có timeout 20 giây, bỏ qua cache và từ chối redirect. Chỉ HTTP 200 cùng
JSON array hợp lệ mới thành công. Lỗi HTTP, mạng, timeout hoặc payload làm
invocation thất bại; không tự thử lại trong cùng invocation. Log chỉ chứa kết
quả, HTTP status, số dòng và lịch chạy; không chứa khóa hoặc nội dung dòng.

## Trạng thái ngày 07/11/2026

- Mã nguồn, cấu hình, kiểm thử và hướng dẫn deploy được chuẩn bị trong PR.
- Supabase được kiểm tra là `ACTIVE_HEALTHY`; `jobs` bật RLS và có quyền SELECT
  cho `anon`. Không thay đổi dữ liệu hoặc quyền truy cập khi kiểm tra.
- **Chưa deploy lên tài khoản Cloudflare.** `wrangler whoami` báo chưa đăng nhập;
  phiên làm việc không có Cloudflare API token/account ID. Chưa có deployment ID
  hoặc bằng chứng production Cron Trigger chạy thành công.
- Kiểm thử giả lập, build dry-run hay SELECT trực tiếp thành công **không phải**
  bằng chứng Cron Trigger production đã hoạt động.
- Không tắt hoặc sửa lịch keepalive GitHub nào. Trên `main` đã đối chiếu
  (`bab63143c621533902a5c1335560f3faad4a1008`) của repo tuyển dụng chưa có
  `.github/workflows/supabase-keepalive.yml`. Workflow `dispatch-job-alerts.yml`
  là gửi thông báo opt-in, không phải keepalive, và được giữ nguyên. Keepalive
  GitHub trong repo Web-Design cũng được giữ nguyên vì thuộc dự án khác.

Kết quả xác minh trong phiên chuẩn bị PR:

| Kiểm tra | Kết quả |
| --- | --- |
| 56 kiểm thử Node (gồm 12 kiểm thử Worker) | Đạt |
| Wrangler build/deploy dry-run | Đạt, không upload |
| SELECT thật bằng publishable key từ Node | HTTP 200, 05:07:02 UTC ngày 07/11/2026 |
| Scheduled handler trên local Workers runtime | HTTP 200, `status=ok`, 05:10:51 UTC ngày 07/11/2026 |
| Deploy / Cron Trigger trên Cloudflare production | Chưa thực hiện; thiếu đăng nhập/quyền Cloudflare |

Phép thử runtime đã xác nhận dùng `redirect: "manual"` rồi từ chối HTTP 3xx;
Cloudflare Workers không hỗ trợ `redirect: "error"` như Node. Không chuyển khóa
sang địa chỉ redirect. Các phép thử có mạng chỉ SELECT dữ liệu công khai.

## Quyền cần để deploy Cloudflare

Dùng tài khoản Cloudflare của chủ dự án có quyền quản lý Workers và xem log.
Đăng nhập OAuth bằng `npx wrangler login`, hoặc cung cấp tại **máy quản trị**:

- `CLOUDFLARE_ACCOUNT_ID`: đúng tài khoản muốn đặt Worker.
- `CLOUDFLARE_API_TOKEN`: token giới hạn vào tài khoản đó, có quyền
  **Account → Workers Scripts → Edit**. Khi đọc log trực tiếp cần quyền xem
  Workers Tail; xem hướng dẫn quyền của Cloudflare nếu token chưa có.
- Không cần quyền DNS/zone, database password hoặc Supabase service-role key.

Không đưa Cloudflare API token vào source, frontend, `.dev.vars` của Worker
hoặc nội dung PR. OAuth/token là quyền triển khai; chúng không phải binding
Supabase và không được gửi sang Supabase.

## Deploy lần đầu cùng secret

Yêu cầu Node.js **22 trở lên**. Từ thư mục gốc repository đã checkout nhánh PR
hoặc commit đã merge:

```powershell
cd cloudflare/supabase-keepalive
npm ci
npx wrangler login
npx wrangler whoami
Copy-Item .dev.vars.example .dev.vars
```

Sửa `.dev.vars` trên máy quản trị: thay placeholder bằng đúng giá trị `anonKey`
trong `../../config.public.js`, bắt đầu bằng `sb_publishable_`. File chỉ chứa:

```dotenv
SUPABASE_PUBLISHABLE_KEY="sb_publishable_REPLACE_WITH_PUBLIC_KEY"
```

Sau khi đối chiếu đúng tài khoản Cloudflare và tên Worker riêng
`hyjobs-supabase-keepalive`, chạy:

```powershell
npm test
npm run dry-run
npm run deploy -- --secrets-file .dev.vars
npx wrangler secret list
```

Wrangler **4.158.0** đã được ghim cùng lockfile. `--secrets-file` tải mã nguồn
và secret trong cùng deployment, tránh bật cron trước khi có khóa. Xác nhận
secret có tên `SUPABASE_PUBLISHABLE_KEY`; không in giá trị. `.dev.vars` và
`.wrangler/` đã được gitignore. File ví dụ không chứa khóa thật. Binding
`SUPABASE_URL` và cron nằm trong `wrangler.toml`.

Để xoay khóa sau này, chạy lệnh dưới rồi nhập publishable key mới qua prompt
ẩn (lệnh tạo version và deploy ngay):

```powershell
npx wrangler secret put SUPABASE_PUBLISHABLE_KEY
```

Repo không thêm workflow tự deploy Cloudflare và không cần secrets production
để chạy CI. Việc merge PR không tự kích hoạt Worker. Quản lý lịch bằng
`wrangler.toml` và deploy; tránh sửa cùng lịch ở Dashboard rồi bị lần deploy
kế tiếp ghi đè.

## Xác nhận production trước khi chuyển lịch cũ

1. Ghi lại tài khoản, Worker, deployment/version ID và commit đã triển khai.
2. Cloudflare Dashboard → Workers & Pages → `hyjobs-supabase-keepalive` →
   Settings → Trigger Events: kiểm tra `17 */6 * * *`. Cron dùng **UTC**;
   thay đổi trigger có thể mất đến 15 phút để lan truyền.
3. Chờ **ít nhất một lần Cron Trigger thực tế** ở khung giờ tiếp theo, rồi mở
   View events / Workers Logs. Với lịch 6 giờ, việc chờ có thể gần 6 giờ;
   lịch sử của Worker mới có thể hiển thị chậm đến 30 phút.
4. Kiểm tra invocation thuộc loại scheduled, outcome thành công, cron chính
   xác và log JSON có `event="hyjobs-supabase-keepalive"`, `status="ok"`,
   `httpStatus=200`, `rows` bằng 0 hoặc 1. Lưu thời điểm UTC, invocation ID và
   deployment ID; không lưu nội dung tin hoặc khóa. Có thể theo dõi log bằng
   `npx wrangler tail --format json` khi có quyền Workers Tail.
5. Nếu 401/403, kiểm tra publishable key, grant SELECT và RLS; nếu 5xx/timeout,
   kiểm tra trạng thái Supabase. Không thay bằng service-role, không nới RLS,
   không tạo dữ liệu giả để ép kiểm thử thành công.
6. **Chỉ sau khi có bằng chứng production cron thành công** mới xem xét tắt
   keepalive GitHub của **cùng dự án**, bằng thay đổi riêng có thể review.
   Không xóa/sửa `dispatch-job-alerts.yml` hoặc keepalive của Web-Design.

## Kiểm thử và kiểm tra local

Từ gốc repository, bộ kiểm thử hoàn toàn offline:

```powershell
node --check cloudflare/supabase-keepalive/src/index.mjs
node --test tests/smoke.test.mjs tests/notification-security.test.mjs tests/cloudflare-keepalive.test.mjs
```

12 kiểm thử Worker bao phủ endpoint/method/header, bảng công khai rỗng, sai
dự án, khóa không hợp lệ/đặc quyền, HTTP lỗi, timeout/mạng, JSON/payload lỗi,
propagate lỗi scheduled và log không chứa khóa/dữ liệu. Bộ kiểm thử hiện có
cũng được chạy để bảo vệ build Pages và thông báo. CI chạy kiểm thử Worker và
`npm ci` / `npm run dry-run`, không đọc Supabase production.

Có thể kiểm tra handler bằng Workers runtime local sau khi đã tạo `.dev.vars`:

```powershell
cd cloudflare/supabase-keepalive
npm run dev -- --local
```

Tại terminal khác, với bản Wrangler đã ghim:

```powershell
Invoke-WebRequest -Uri 'http://127.0.0.1:8787/__scheduled?cron=17%20*%2F6%20*%20*%20*'
```

Endpoint này chỉ tồn tại trong local `--test-scheduled`, không tạo HTTP endpoint
production. Kiểm tra cả HTTP 200 và log `status=ok` của handler. Handler dùng
publishable key và thực hiện một SELECT thật trên tin công khai. Đây là phép
thử tự chọn có mạng, không chạy tự động trong CI, và không thay thế xác nhận
cron production ở trên.

## Giới hạn và tài liệu

Lịch đọc định kỳ chỉ tạo hoạt động nhẹ trên database. **Không cam kết chống
pause Supabase Free**; Supabase có thể tạm dừng dự án ít hoạt động. Worker cũng
không tự khôi phục dự án đã pause. Khoảng 120 lượt/tháng là ước tính cho Worker
này; kiểm tra quota tổng của tài khoản Cloudflare khi triển khai.

- [Supabase API keys và vai trò anon/RLS](https://supabase.com/docs/guides/getting-started/api-keys)
- [Supabase Free: availability và inactivity](https://supabase.com/docs/guides/deployment/going-into-prod#availability)
- [Cloudflare Cron Triggers, UTC và kiểm tra sự kiện](https://developers.cloudflare.com/workers/configuration/cron-triggers/)
- [Cloudflare secrets và deploy cùng secrets-file](https://developers.cloudflare.com/workers/configuration/secrets/)
- [Cloudflare external CI/CD và API token](https://developers.cloudflare.com/workers/ci-cd/external-cicd/)
