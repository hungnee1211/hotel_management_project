# Báo cáo tuần 1 — 31/10/2026

## Phạm vi đã hoàn thành

Thực hiện trực tiếp tại C:\Users\asus\Downloads\hotel_management_project, nhánh feature/auth-pages.
Không tạo branch/bản sao project, không commit/push. Giữ nguyên .vscode/ có sẵn.
Đã đọc và đánh giá backend nguồn F:\hotel_management_project\backend trước khi triển khai; chi tiết tái sử dụng trong README.

FastAPI + PostgreSQL; đăng ký/đăng nhập/đăng xuất; hash Argon2; access session và refresh token có xoay vòng/thu hồi; /api/me; RBAC ở backend; Dashboard; Audit Log; cấu hình localhost/CORS; kiểm thử và hướng dẫn chạy.

## File đã sửa

| File | Nội dung |
| --- | --- |
| .gitignore | Bỏ qua môi trường Python/cache; cho phép đưa env mẫu vào Git |
| README.md | Hướng dẫn chạy, API, kiểm thử, đánh giá backend cũ và giới hạn |
| next.config.ts | Chuyển tiếp /api về backend localhost |
| app/layout.tsx | Metadata HOTELAI, ngôn ngữ tiếng Việt |
| app/page.tsx | Chuyển trang chính đến Dashboard |
| app/login/page.tsx | Nối API, trạng thái gửi/lỗi, ghi nhớ đăng nhập |
| app/register/page.tsx | Nối API, trạng thái gửi/lỗi, chuyển sang đăng nhập |

Bố cục, màu sắc, các khối nội dung và lớp CSS của hai trang auth được giữ lại; có thêm thông báo lỗi và cập nhật mật khẩu tối thiểu thành 8 ký tự.

## File mới

| File | Nội dung |
| --- | --- |
| .env.example | BACKEND_URL mẫu |
| compose.yaml | PostgreSQL tùy chọn cho môi trường cài mới |
| app/lib/api.ts | Gọi API, cookie, tự refresh khi access hết hạn |
| app/dashboard/page.tsx | Dashboard và nhật ký theo quyền |
| app/dashboard/user-roles.tsx | Giao diện quản trị phân quyền, phân trang tài khoản |
| backend/.env.example | Cấu hình database/CORS/cookie mẫu |
| backend/requirements.txt | Dependencies trực tiếp |
| backend/requirements.lock.txt | Toàn bộ phiên bản đã kiểm thử |
| backend/app/__init__.py | Package |
| backend/app/core/__init__.py | Package |
| backend/app/core/config.py | Đọc cấu hình |
| backend/app/core/database.py | Engine, session, dependency database |
| backend/app/core/security.py | Argon2, sinh token và hash token |
| backend/app/init_db.py | Tạo schema, seed role/permission, bootstrap admin |
| backend/app/main.py | API, CSRF, CORS, auth, RBAC, audit |
| backend/app/models/__init__.py | Đăng ký các model |
| backend/app/models/user.py | Tái sử dụng User |
| backend/app/models/role.py | Tái sử dụng Role, Permission và bảng nối |
| backend/app/models/audit_log.py | Tái sử dụng AuditLog |
| backend/app/models/session.py | Phiên đăng nhập và lịch sử refresh đã dùng |
| backend/tests/conftest.py | Database fixture SQLite/PostgreSQL |
| backend/tests/test_auth.py | 20 trường hợp kiểm thử |
| backend/tests/smoke_localhost.py | Kiểm tra HTTP qua frontend localhost |
| WEEK1_REPORT.md | Báo cáo này |

File local không đưa vào Git: backend/.env và backend/.venv/.
Database mới: hotel_management_week1, dùng PostgreSQL local đang chạy. Không chỉnh dữ liệu database cũ.

## Kết quả kiểm tra

| Kiểm tra | Kết quả |
| --- | --- |
| npm run lint | PASS |
| npx tsc --noEmit | PASS |
| npm run build | PASS; 5 route trang được tạo |
| pytest -q, SQLite | 20 passed |
| pytest -q --postgres, PostgreSQL 18.6 | 20 passed |
| HTTP health backend | 200 |
| HTTP /login, /register, /dashboard | 200 |
| HTTP qua Next.js /api | Đăng ký → đăng nhập → /me → Dashboard → refresh → đăng xuất: PASS |
| Member truy cập Audit Log qua localhost | 403 đúng |
| /me sau logout qua localhost | 401 đúng |
| git diff --check | PASS |
| Cấu hình mật khẩu và môi trường Python | Được .gitignore bỏ qua |

Tài khoản/dữ liệu smoke test đã được dọn; schema test PostgreSQL cũng tự dọn.
Kiểm tra localhost dùng HTTP client thật qua Next.js proxy, chưa tự động thao tác biểu mẫu bằng trình duyệt.
Một cảnh báo từ thư viện Starlette TestClient về httpx đã deprecated; không có test thất bại.
Cảnh báo UTC trong model nguồn đã được sửa.

## Chạy lại smoke test

Sau khi chạy frontend cổng 3000 và backend cổng 8000:

    cd backend
    $env:PYTHONPATH = '.'
    .venv/Scripts/python.exe tests/smoke_localhost.py

## Giới hạn còn lại ngoài mục tiêu tuần 1

Chưa triển khai email reset/verify, nghiệp vụ phòng/booking/hóa đơn, migration nâng cấp schema có phiên bản, giới hạn tần suất đăng nhập và chính sách lưu trữ/dọn dữ liệu trước khi mở public.
Không tạo sẵn tài khoản admin/mật khẩu mặc định; dùng lệnh bootstrap trong README.

## Kiểm tra lại ngày 31/10/2026

- Xác nhận nhánh feature/auth-pages; giữ nguyên các thay đổi chưa commit.
- Chạy lại lint, TypeScript, production build: đạt.
- SQLite: 20 passed; PostgreSQL: 20 passed. Còn một cảnh báo deprecation từ Starlette TestClient/httpx.
- Chạy bản production frontend trên 127.0.0.1:3000 và backend trên 127.0.0.1:8000; smoke test qua localhost đạt, tài khoản tạm đã dọn.
- Database thực tế đủ admin, manager, receptionist, staff, member và đúng quyền theo seed.
- Phần mới được kiểm thử gồm ma trận 5 vai trò, danh sách tài khoản có phân trang/ẩn thông tin nhạy cảm, khởi tạo lặp lại không cấp quyền cho vai trò tùy chỉnh.
- Không phát hiện lỗi chặn mục tiêu tuần 1 trong các kiểm tra trên. Chưa thực hiện kiểm thử thao tác trình duyệt tự động hoặc tải đồng thời/nhiều tab.
- Lần kiểm tra này chỉ cập nhật báo cáo, không sửa code chức năng, không commit/push.
