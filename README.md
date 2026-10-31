# HOTELAI — Tuần 1

Frontend Next.js + backend FastAPI/PostgreSQL. Giữ bố cục đăng nhập/đăng ký sẵn có, bổ sung API và Dashboard. Dashboard tuần 1 hiển thị tài khoản, vai trò, quyền, số phiên và nhật ký (khi có quyền).

## Chạy trên máy Windows này

Project: C:\Users\asus\Downloads\hotel_management_project, nhánh feature/auth-pages.
Đã tạo backend/.venv và backend/.env (không đưa vào Git). Database local riêng: hotel_management_week1 trên PostgreSQL đang chạy. Không sửa database/backend cũ tại F:.

Mở hai PowerShell ở thư mục project:

Cửa sổ 1:

    cd backend
    .\.venv\Scripts\python.exe -m app.init_db
    .\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload

Cửa sổ 2, thư mục gốc project:

    npm run dev -- --hostname 127.0.0.1 --port 3000

Mở http://localhost:3000/register để tạo tài khoản rồi đăng nhập.
Trang chính chuyển đến /dashboard; người chưa đăng nhập được chuyển về /login.
Backend health: http://127.0.0.1:8000/health. API docs: http://127.0.0.1:8000/docs.

## Cài mới

Cần Node.js 20.9+, Python 3.11+ và PostgreSQL. Có thể dùng PostgreSQL cài sẵn hoặc Docker Compose:

    npm ci
    py -m venv backend/.venv
    backend/.venv/Scripts/python.exe -m pip install -r backend/requirements.lock.txt
    Copy-Item backend/.env.example backend/.env
    # Chỉ chạy Docker nếu không dùng PostgreSQL local và cổng 5432 còn trống:
    docker compose up -d db
    cd backend
    .venv/Scripts/python.exe -m app.init_db

Nếu dùng PostgreSQL có sẵn, tạo database riêng và sửa DATABASE_URL trong backend/.env.
Không ghi đè file .env đang có. Mật khẩu chứa ký tự đặc biệt phải URL-encode.
app.init_db tạo bảng và seed quyền theo cách có thể chạy lại; không xóa dữ liệu.
Lệnh này dành cho schema tuần 1 mới, không phải công cụ nâng cấp database cũ có cấu trúc khác.
Các thay đổi schema sau này cần migration có phiên bản trước khi triển khai.

## Cấu hình localhost

- Frontend gọi đường dẫn tương đối /api; Next.js chuyển tiếp đến BACKEND_URL (mặc định http://127.0.0.1:8000).
- Nếu đổi backend, đặt BACKEND_URL trong .env.local ở thư mục gốc và khởi động lại Next.js.
- CORS_ORIGINS cho phép rõ ràng http://localhost:3000 và http://127.0.0.1:3000.
- Nếu đổi cổng frontend, thêm origin tương ứng trong backend/.env và khởi động lại backend.
- Cookie có HttpOnly, SameSite=Lax, Path=/api, không đặt Domain. COOKIE_SECURE=false chỉ dành cho HTTP local; HTTPS dùng true.
- Dùng nhất quán localhost hoặc 127.0.0.1 trên trình duyệt vì cookie của hai hostname khác nhau.
- Nếu /api trả 502: kiểm tra backend cổng 8000 và /health; lỗi 403 CSRF: kiểm tra Origin và X-Requested-With.
- Nếu cổng bị chiếm, kiểm tra tiến trình đang chạy trước khi đổi cổng.

## Xác thực và phân quyền

- Mật khẩu 8–128 ký tự; hash Argon2 qua pwdlib.
- Access session là token ngẫu nhiên 48 byte, sống 15 phút, lưu hash SHA-256 trong database.
- Refresh token sống tối đa 7 ngày, xoay vòng sau mỗi lần dùng. Token cũ bị dùng lại sẽ thu hồi phiên liên quan.
- Khóa dòng PostgreSQL bảo vệ thay mới token đồng thời. Đăng xuất thu hồi phiên ngay ở backend.
- Tài khoản bị khóa/vô hiệu hóa bị chặn ở /me, API có quyền và refresh.
- Không lưu token trong localStorage. “Ghi nhớ đăng nhập” bật Max-Age; khi tắt dùng session cookie (trình duyệt khôi phục phiên có thể khôi phục cookie).
- API thay đổi dữ liệu yêu cầu header X-Requested-With: HotelApp và kiểm tra Origin; frontend tự gửi.
- /me không trả hash/token. Response API có Cache-Control: no-store.
- Member, Staff và Receptionist: dashboard:read. Manager: dashboard:read, audit:read. Admin: dashboard:read, audit:read, users:manage.
- Admin có mục Phân quyền tài khoản trên Dashboard: chọn một hoặc nhiều vai trò rồi lưu. Có phân trang; không được tự đổi vai trò. Tuần 1 chưa có nghiệp vụ phòng/booking nên Staff và Receptionist cùng quyền xem Dashboard; quyền nghiệp vụ sẽ bổ sung ở tuần 2.
- Quyền được kiểm tra bằng quan hệ User → Role → Permission trong database ở từng request; thay đổi quyền có hiệu lực ngay.
- Đăng ký công khai luôn nhận member; không tự cấp admin cho tài khoản đầu tiên.
- Bootstrap admin bằng lệnh local, không có mật khẩu admin mặc định:

    cd backend
    .venv/Scripts/python.exe -m app.init_db --admin-email admin@example.com

Nếu email chưa tồn tại, nhập mật khẩu ít nhất 12 ký tự khi được hỏi. Nếu đã có, lệnh cấp vai trò admin cho tài khoản đó. Chỉ người có quyền vận hành máy/database chạy lệnh này.

## API

| Method | Đường dẫn | Mục đích |
| --- | --- | --- |
| GET | /health | Kiểm tra kết nối database |
| POST | /api/auth/register | email, full_name, password |
| POST | /api/auth/login | email, password, remember |
| POST | /api/auth/refresh | Cookie refresh; xoay token |
| POST | /api/auth/logout | Thu hồi phiên; xóa cookie |
| GET | /api/me | Tài khoản, vai trò và quyền hiện tại |
| GET | /api/dashboard | dashboard:read |
| GET | /api/audit-logs?limit=50&offset=0 | audit:read, tối đa 100 dòng |
| GET | /api/roles | users:manage |
| GET | /api/users?limit=50&offset=0 | users:manage; danh sách tài khoản, không trả mật khẩu/token |
| PUT | /api/users/{id}/roles | users:manage; body {"roles":["member"]} |

Swagger hiển thị schema API. Khi thử POST/PUT bằng công cụ API, gửi header X-Requested-With: HotelApp; cookie được trả từ login. Không có luồng Bearer/JWT trong phiên bản này.

Audit ghi đăng ký, đăng nhập thành công/thất bại, refresh, token dùng lại, đăng xuất và thay đổi vai trò; không ghi mật khẩu/token. Quản trị viên xem 50 hoạt động mới nhất trên Dashboard; API hỗ trợ phân trang.

## Kiểm thử

    npm run lint
    npx tsc --noEmit
    npm run build
    cd backend
    .venv/Scripts/python.exe -m pytest -q
    .venv/Scripts/python.exe -m pytest -q --postgres

Test mặc định dùng SQLite in-memory. --postgres dùng DATABASE_URL và tạo schema ngẫu nhiên test_<uuid>, tự dọn đúng schema sau từng test; không xóa bảng ứng dụng. User database cần quyền CREATE SCHEMA.
Có thể đặt TEST_DATABASE_URL để dùng database kiểm thử riêng.

Bao phủ hash, email trùng/khác hoa thường, validation, chống tự nâng quyền, đăng nhập, cookie, /me, Dashboard, logout/revocation, hết hạn access/refresh, refresh replay, tài khoản khóa, RBAC và thay đổi quyền, Audit Log, CSRF và CORS.

## Đánh giá backend cũ

Đã đọc F:\hotel_management_project\backend trước khi triển khai:
- Tái sử dụng trực tiếp User, Role, Permission, các bảng nối và AuditLog; chỉnh giới hạn email/username và thời gian UTC.
- Giữ cách hash/verify Argon2 bằng pwdlib từ core/security.py.
- Backend cũ thiếu core/database.py; main.py chưa include auth router; auth.py mới có register.
- Chưa có phiên có thể thu hồi, refresh rotation, kiểm tra Permission, Dashboard hoặc test.
- Schema đăng ký cũ bắt buộc username, không phù hợp biểu mẫu email hiện tại; bản mới dùng email chuẩn hóa.
- Không tái sử dụng secret mặc định hoặc JWT refresh không có quản lý phiên. Chọn opaque session/token lưu hash để logout có hiệu lực tức thì.
- Không nhập các module phòng/booking/hóa đơn/AI chưa thuộc tuần 1; giữ nguyên chúng ở nguồn cũ.

## Giới hạn phạm vi

Quên mật khẩu hiện hướng dẫn liên hệ quản trị viên; gửi email reset/verify chưa thuộc tuần 1.
Trước khi mở public cần bổ sung giới hạn tần suất đăng nhập ở gateway/API, quản lý secrets, migration có phiên bản, lưu trữ/dọn phiên và nhật ký theo chính sách vận hành.
