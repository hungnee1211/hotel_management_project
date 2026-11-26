# Ghi chú: cách chạy Front-end

Front-end của Hệ thống quản lý khách sạn (React + Vite + Tailwind).
Cần chạy kèm back-end: https://github.com/hungnee1211/backend_hotel_management_nodejs_express

## Yêu cầu
- Node.js 20 trở lên (có sẵn npm)
- Back-end đang chạy ở `http://localhost:5000` (back-end cần MongoDB dạng replica set)

## Cài đặt và chạy
```bash
npm install
cp .env.example .env     # Windows PowerShell: copy .env.example .env
npm run dev              # mở http://localhost:3000
```

Khi chạy dev, Vite chuyển tiếp mọi yêu cầu `/api` sang back-end (`VITE_API_PROXY`, mặc định `http://localhost:5000`),
nên trình duyệt chỉ thấy một địa chỉ và cookie đăng nhập hoạt động bình thường.

## Các lệnh
| Lệnh | Tác dụng |
|---|---|
| `npm run dev` | Chạy chế độ phát triển (cổng 3000) |
| `npm run build` | Đóng gói bản production vào thư mục `dist/` |
| `npm run preview` | Xem thử bản đã build |
| `npm test` | Chạy unit test (Vitest) |

## Cấu trúc thư mục `src/`
| Thư mục | Nội dung |
|---|---|
| `api/` | Hàm gọi API back-end |
| `components/` | Thành phần giao diện dùng chung (layout, ui, biểu đồ) |
| `context/` | Trạng thái chung: đăng nhập, giao diện sáng/tối, thông báo |
| `hooks/` | Custom hooks |
| `lib/` | Tiện ích: định dạng tiền/ngày, menu, phân quyền |
| `pages/` | Các trang: admin, auth, billing, customer, ops, dashboard |

## Lỗi thường gặp
- **`npm.ps1 cannot be loaded because running scripts is disabled`** (Windows PowerShell):
  chạy một lần `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned`, rồi mở lại terminal.
- **`Could not read package.json`**: chưa `cd` vào thư mục `frontend` trước khi chạy `npm`.
- **Đăng nhập không được / lỗi gọi API**: kiểm tra back-end đã chạy ở cổng 5000 chưa.
- **Lấy mã OTP khi đăng ký**: back-end chưa gửi SMS/email thật, mã OTP được in ra trong terminal của back-end
  (dòng dạng `[MOCK SMS] ... OTP=xxxxxx`).
