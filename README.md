# ☕ Coffee Shop Management System

Hệ thống web quản lý quán cà phê đa vai trò — Thu Ngân, Barista, Quản Lý — tích hợp AI multi-agent hỗ trợ phân tích và cảnh báo thông minh.

**Tech Stack:** Python Flask · SQLAlchemy · SQL Server (hoặc SQLite) · React 18 · TailwindCSS · Lucide Icons · Google Gemini AI

---

## Tính năng chính

| Module | Mô tả |
|---|---|
| 🧑‍💼 **Đa vai trò** | Thu ngân, Barista, Quản lý — mỗi vai trò có giao diện riêng |
| 🛒 **Quản lý Order** | Tạo order, theo dõi trạng thái theo thời gian thực |
| 💳 **Thanh toán** | Hỗ trợ tiền mặt, tích điểm thành viên, đổi điểm giảm giá |
| 👥 **Khách hàng thành viên** | 3 hạng: Normal / Silver / Gold — tự động nâng hạng theo điểm |
| 📧 **Gửi voucher email** | Tự động gửi voucher theo hạng thành viên qua SMTP |
| 📦 **Quản lý kho** | Theo dõi nguyên liệu, cảnh báo khi sắp hết |
| 📊 **Báo cáo** | Doanh thu theo ngày/giờ/danh mục, món bán chạy |
| 🤖 **AI Multi-Agent** | Chat hỏi doanh thu, tồn kho — dùng Google Gemini |
| 🔔 **Alert Agent** | Tự động cảnh báo bất thường (kho thấp, doanh thu giảm) |

---

## Yêu cầu hệ thống

| Thành phần | Phiên bản |
|---|---|
| Python | 3.10+ |
| Node.js | 18+ |
| SQL Server | 2019+ / SQL Server Express (hoặc SQLite để dev) |
| ODBC Driver 17 for SQL Server | [Tải tại Microsoft](https://learn.microsoft.com/en-us/sql/connect/odbc/download-odbc-driver-for-sql-server) |

---

## Khởi động nhanh

### Windows (1 lệnh)

```bat
start.bat
```

### Mac / Linux (1 lệnh)

```bash
chmod +x start.sh && ./start.sh
```

Script sẽ tự động: tạo virtual environment, cài dependencies, seed dữ liệu mẫu và khởi động cả backend lẫn frontend.

---

## Cài đặt thủ công

### Bước 1 — Cấu hình biến môi trường

Tạo file `backend/.env` từ template:

```bash
cp backend/.env.example backend/.env
```

Chỉnh sửa các giá trị trong `.env` theo môi trường của bạn (xem [Biến môi trường](#biến-môi-trường) bên dưới).

### Bước 2 — Tạo database SQL Server

Mở SQL Server Management Studio (SSMS) và chạy:

```sql
CREATE DATABASE CoffeeShop;
GO
```

> ⚠️ Tên database phải là **`CoffeeShop`** — đã cấu hình sẵn trong `backend/config.py`.

Nếu muốn dùng **SQL Authentication** thay vì Windows Auth, đặt biến môi trường:

```
DATABASE_URL=mssql+pyodbc://username:password@server/CoffeeShop?driver=ODBC+Driver+17+for+SQL+Server
```

### Bước 3 — Chạy Backend

```bash
cd backend

# Tạo và kích hoạt virtual environment
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # Mac/Linux

# Cài dependencies
pip install -r requirements.txt

# Seed dữ liệu mẫu (menu, kho, lịch sử 30 ngày)
python seed.py

# Chạy Flask
python app.py
```

Backend khởi động tại `http://localhost:5000`  
Swagger UI: `http://localhost:5000/apidocs`

### Bước 4 — Chạy Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend khởi động tại `http://localhost:3000`

---

## Biến môi trường

Tạo file `backend/.env` với nội dung sau:

```env
# ── Bảo mật ──────────────────────────────────────────────────────────────────
# Bắt buộc — đổi thành chuỗi ngẫu nhiên dài (min 32 ký tự)
SECRET_KEY=your-secret-key-here
JWT_SECRET=your-jwt-secret-here

# ── Cơ sở dữ liệu ────────────────────────────────────────────────────────────
# SQL Server (Windows Auth — mặc định, đổi tên server cho phù hợp)
# DATABASE_URL=mssql+pyodbc:///?odbc_connect=DRIVER={ODBC Driver 17 for SQL Server};SERVER=YOUR_PC\SQLEXPRESS;DATABASE=CoffeeShop;Trusted_Connection=yes;TrustServerCertificate=yes;

# SQL Server (SQL Auth)
# DATABASE_URL=mssql+pyodbc://username:password@localhost/CoffeeShop?driver=ODBC+Driver+17+for+SQL+Server

# SQLite (dev nhanh, không cần SQL Server)
# DATABASE_URL=sqlite:///coffee_shop.db

# ── CORS ─────────────────────────────────────────────────────────────────────
# Danh sách origin được phép (phân cách bằng dấu phẩy)
CORS_ORIGINS=http://localhost:3000

# ── Email / SMTP ──────────────────────────────────────────────────────────────
# Dùng để gửi voucher cho khách hàng thành viên
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
# Gmail: tạo App Password tại myaccount.google.com/apppasswords
SMTP_PASSWORD=your-app-password
SMTP_USE_TLS=true
MAIL_SENDER=your-email@gmail.com

# ── Thông tin quán ───────────────────────────────────────────────────────────
SHOP_NAME=Coffee Shop

# ── AI Multi-Agent (Tùy chọn) ────────────────────────────────────────────────
# Lấy API key tại: https://aistudio.google.com
GEMINI_API_KEY=your-gemini-api-key-here

# URL backend mà AI agent dùng để gọi API nội bộ
BACKEND_URL=http://localhost:5000
```

> ⚠️ **Lưu ý bảo mật:** File `.env` đã được thêm vào `.gitignore`. **Không commit file này lên Git.**

### Tóm tắt các biến

| Biến | Bắt buộc | Mô tả |
|---|---|---|
| `SECRET_KEY` | ✅ | Flask session secret |
| `JWT_SECRET` | ✅ | Ký JWT token |
| `DATABASE_URL` | ⚠️ | Mặc định: SQL Server Express local |
| `CORS_ORIGINS` | ⚠️ | Mặc định: `http://localhost:3000` |
| `SMTP_HOST` | Tùy chọn | Cần nếu dùng tính năng gửi email |
| `SMTP_USERNAME` | Tùy chọn | Email gửi voucher |
| `SMTP_PASSWORD` | Tùy chọn | App Password (Gmail) |
| `MAIL_SENDER` | Tùy chọn | Địa chỉ hiển thị trong email |
| `SHOP_NAME` | Tùy chọn | Tên quán (mặc định: `Coffee Shop`) |
| `GEMINI_API_KEY` | Tùy chọn | Cần nếu dùng tính năng AI chat |
| `BACKEND_URL` | Tùy chọn | Mặc định: `http://localhost:5000` |

---

## Tài khoản demo

Được tạo tự động khi chạy `python seed.py` hoặc khởi động lần đầu:

| Vai trò | Username | Password |
|---|---|---|
| Manager | `manager` | `manager123` |
| Cashier | `cashier` | `cashier123` |
| Barista | `barista` | `barista123` |

---

## Chạy với SQLite (không cần SQL Server)

Phù hợp để dev/test nhanh mà không cài SQL Server:

1. Trong `backend/.env`, thêm:
   ```env
   DATABASE_URL=sqlite:///coffee_shop.db
   ```
2. Trong `backend/requirements.txt`, comment dòng `pyodbc`
3. Chạy bình thường như hướng dẫn trên

> ⚠️ SQLite không hỗ trợ SQL Trigger — tính năng tự động đồng bộ kho nguyên liệu sẽ không hoạt động. Toàn bộ tính năng còn lại hoạt động bình thường.

---

## Cấu trúc dự án

```
coffees-shop-management/
├── start.bat                   ← Khởi động nhanh (Windows)
├── start.sh                    ← Khởi động nhanh (Mac/Linux)
│
├── backend/
│   ├── .env                    ← Biến môi trường (KHÔNG commit)
│   ├── .env.example            ← Template biến môi trường
│   ├── app.py                  ← Flask app factory + entry point
│   ├── config.py               ← Cấu hình DB, JWT, SMTP, CORS
│   ├── seed.py                 ← Dữ liệu mẫu: nhân viên, menu, kho, lịch sử 30 ngày
│   ├── requirements.txt
│   │
│   ├── agents/                 ← AI Multi-Agent System (Google Gemini)
│   │   ├── orchestrator.py     ← 5 chuyên gia AI: Report, Inventory, Menu, Ops, Alert
│   │   └── alert_agent.py      ← Cảnh báo tự động (APScheduler)
│   │
│   ├── models/                 ← SQLAlchemy models
│   │   ├── employee.py
│   │   ├── table.py
│   │   ├── bill.py
│   │   ├── order.py
│   │   ├── order_item.py
│   │   ├── menu_item.py
│   │   ├── inventory.py        ← Inventory + MenuItemIngredient + Supplier
│   │   ├── customer.py         ← Thành viên + hạng + tích điểm
│   │   ├── member_notification.py
│   │   └── report.py
│   │
│   ├── services/               ← Business logic
│   │   ├── auth_service.py
│   │   ├── order_service.py
│   │   ├── payment_service.py
│   │   ├── inventory_service.py
│   │   ├── customer_service.py
│   │   └── member_campaign_service.py  ← Voucher email theo hạng thành viên
│   │
│   ├── routes/                 ← HTTP endpoints
│   │   ├── auth_routes.py
│   │   ├── order_routes.py
│   │   ├── payment_routes.py
│   │   ├── menu_routes.py
│   │   ├── table_routes.py
│   │   ├── inventory_routes.py
│   │   ├── report_routes.py
│   │   ├── customer_routes.py
│   │   ├── employee_routes.py
│   │   └── ai_routes.py        ← /ai/chat, /ai/alerts
│   │
│   ├── middleware/
│   │   └── auth_middleware.py  ← JWT decode + @require_roles decorator
│   │
│   └── database/
│       └── db.py               ← SQLAlchemy instance
│
└── frontend/
    ├── vite.config.js          ← Dev proxy → :5000
    ├── package.json
    └── src/
        ├── App.jsx             ← Router + ProtectedRoute theo role
        ├── pages/
        │   ├── LoginPage.jsx           ← Đăng nhập
        │   ├── CashierPage.jsx         ← Thu ngân: tạo order, thanh toán
        │   ├── BaristaPage.jsx         ← Barista: hàng đợi pha chế
        │   └── ManagerPage.jsx         ← Quản lý: menu, kho, báo cáo, AI
        ├── components/
        │   ├── Navbar.jsx
        │   ├── TableStatus.jsx
        │   ├── MenuDisplay.jsx
        │   ├── OrderPanel.jsx
        │   ├── PaymentPanel.jsx        ← Tích điểm, đổi điểm, voucher
        │   ├── InvoiceModal.jsx
        │   └── Skeleton.jsx
        ├── context/
        │   ├── AuthContext.jsx         ← JWT state, login/logout
        │   └── ToastContext.jsx        ← Global toast notifications
        └── services/
            └── api.js                  ← Axios instance + JWT interceptor
```

---

## API Endpoints

### Auth
```
POST  /auth/login              → Đăng nhập, nhận JWT
GET   /auth/me                 → Thông tin user hiện tại
```

### Tables
```
GET    /tables                 → Danh sách bàn + trạng thái (Any role)
POST   /tables                 → Thêm bàn (Manager)
DELETE /tables/:id             → Xóa bàn (Manager)
```

### Menu
```
GET    /menu                   → Menu khả dụng — isAvailable=true (Any role)
GET    /menu/all               → Toàn bộ menu kể cả tạm ngưng (Manager)
POST   /menu                   → Thêm món (Manager)
PUT    /menu/:id               → Sửa / toggle isAvailable (Manager)
DELETE /menu/:id               → Xóa món (Manager)
```

### Orders
```
POST   /orders                         → Tạo order mới (Cashier)
GET    /orders/preparing               → Hàng đợi pha chế (Barista)
GET    /orders/table/:table_id         → Bill + orders hiện tại của bàn
PUT    /orders/:id/complete            → Đánh dấu hoàn thành (Barista)
GET    /orders/history?from=&to=       → Lịch sử order (Manager)
```

### Payment
```
GET    /payment/bills/unpaid           → Bill chờ thanh toán (Cashier)
GET    /payment/bills/history?from=&to=→ Lịch sử bill đã thanh toán (Manager)
GET    /payment/bills/:id              → Chi tiết bill (Cashier)
POST   /payment                        → Xử lý thanh toán (Cashier)
PUT    /payment/bills/:id/failed       → Ghi nhận thanh toán thất bại (Cashier)
```

### Customers
```
GET    /customers              → Danh sách khách hàng (filter: search, level, status)
POST   /customers              → Thêm khách hàng mới
GET    /customers/phone?q=     → Tìm theo số điện thoại
GET    /customers/stats        → Thống kê tổng hợp thành viên
GET    /customers/:id          → Chi tiết khách hàng
PUT    /customers/:id          → Cập nhật thông tin
DELETE /customers/:id          → Xóa khách hàng (Manager)
POST   /customers/:id/campaign → Gửi email voucher (Manager)
GET    /customers/vouchers     → Catalog voucher theo hạng
```

### Employees
```
GET    /employees              → Danh sách nhân viên (Manager)
POST   /employees              → Thêm nhân viên (Manager)
PUT    /employees/:id          → Cập nhật nhân viên (Manager)
DELETE /employees/:id          → Xóa nhân viên (Manager)
```

### Inventory
```
GET    /inventory              → Toàn bộ kho nguyên liệu (Manager)
GET    /inventory/alerts       → Nguyên liệu sắp hết (Manager)
POST   /inventory              → Thêm nguyên liệu (Manager)
PUT    /inventory/:id          → Cập nhật số lượng (Manager)
```

### Reports
```
GET    /reports                         → Lịch sử báo cáo đã lưu (Manager)
POST   /reports                         → Tạo và lưu báo cáo (Manager)
GET    /reports/summary                 → KPI hôm nay (Manager)
GET    /reports/revenue/daily?from=&to= → Doanh thu theo ngày (Manager)
GET    /reports/revenue/hourly?from=&to=→ Phân bố theo giờ (Manager)
GET    /reports/top-items?from=&to=     → Món bán chạy (Manager)
GET    /reports/revenue/category?from=&to= → Doanh thu theo danh mục (Manager)
```

### AI
```
POST   /ai/chat                → Chat với AI multi-agent (Manager)
GET    /ai/alerts              → Danh sách cảnh báo tự động (Manager)
PUT    /ai/alerts/read         → Đánh dấu đã đọc (Manager)
```

> Tài liệu API đầy đủ (Swagger UI): `http://localhost:5000/apidocs`

---

## Hệ thống thành viên

| Hạng | Điểm cần | Voucher | Hạn sử dụng |
|---|---|---|---|
| Normal | 0+ | WELCOME5 — giảm 5%, tối đa 20.000đ | 15 ngày |
| Silver | 50+ | SILVER10 — giảm 10%, tối đa 40.000đ | 20 ngày |
| Gold | 200+ | GOLD15 — giảm 15%, tối đa 70.000đ | 30 ngày |

**Quy tắc tích điểm:** 1 điểm / 10.000đ thanh toán — hạng tự động nâng lên sau mỗi lần thanh toán.

---

## AI Multi-Agent

Tính năng AI yêu cầu `GEMINI_API_KEY` trong file `.env`.

Hệ thống gồm 5 agent chuyên biệt:

- **ReportAgent** — truy vấn doanh thu, KPI, thống kê
- **InventoryAgent** — kiểm tra tồn kho, cảnh báo hết hàng
- **MenuAgent** — phân tích món ăn, đề xuất
- **OperationsAgent** — trạng thái bàn, hàng đợi order
- **AlertAgent** — chạy định kỳ (APScheduler), phát hiện bất thường và push thông báo

Ví dụ câu hỏi:
- *"Hôm nay doanh thu bao nhiêu?"*
- *"Món nào bán chạy nhất tuần này?"*
- *"Nguyên liệu nào sắp hết?"*
- *"Giờ nào đông khách nhất?"*

---

## Xử lý lỗi phổ biến

**Lỗi kết nối SQL Server:**
```
Error: ('08001', ...)
```
→ Kiểm tra SQL Server đang chạy, ODBC Driver 17 đã cài, tên server/instance trong `.env` hoặc `config.py` đúng. Bật TCP/IP trong SQL Server Configuration Manager.

**Lỗi tên database không tìm thấy:**
```
Cannot open database "CoffeeShopDB" requested by the login
```
→ Tên đúng là `CoffeeShop` (không phải `CoffeeShopDB`). Chạy: `CREATE DATABASE CoffeeShop;`

**Lỗi CORS:**
```
Access-Control-Allow-Origin
```
→ Backend phải chạy ở port 5000. Frontend phải chạy qua `npm run dev` (port 3000) — không mở trực tiếp file HTML.

**Lỗi JWT expired:**
```json
{"error": "Token expired"}
```
→ Đăng xuất và đăng nhập lại. Token có hiệu lực 8 giờ.

**AI không hoạt động:**
→ Kiểm tra `GEMINI_API_KEY` đã được set trong `.env`. Lấy key tại [aistudio.google.com](https://aistudio.google.com).

**Email không gửi được:**
→ Với Gmail, cần tạo **App Password** riêng tại [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords) — không dùng mật khẩu Gmail thông thường.

---

## Deploy (Production)

Set các biến môi trường trên server — **không** dùng file `.env` mặc định:

```bash
export SECRET_KEY="chuoi-ngau-nhien-dai-it-nhat-32-ky-tu"
export JWT_SECRET="chuoi-ngau-nhien-khac-dai-it-nhat-32-ky-tu"
export DATABASE_URL="mssql+pyodbc://..."
export CORS_ORIGINS="https://your-domain.com"
export GEMINI_API_KEY="your-production-key"
export SMTP_USERNAME="your-email@gmail.com"
export SMTP_PASSWORD="your-app-password"
```

Build frontend:

```bash
cd frontend
npm run build
# Serve thư mục dist/ bằng nginx hoặc static hosting
```

---

## License

MIT
# coffeeshop_management-
# coffeeshop_management-
# CoffeeShop
