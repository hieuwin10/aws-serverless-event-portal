# Ma Trận Đồng Nhất Nhóm & Kịch Bản Nghiệm Thu (Team Alignment Matrix & Walkthrough Scenarios)

**Tài liệu họp team kỹ thuật chốt phương án thiết kế (Design First, Code Later)**  
**Dự án:** Website Quản Lý và Đăng Ký Sự Kiện Online  
**Phiên bản:** v1.0 (Milestone 1)  

---

## 1. Ma Trận Phân Nhiệm Trách Nhiệm (RACI Matrix)

Để đảm bảo quy trình phát triển diễn ra trơn tru, không chồng chéo và có người chịu trách nhiệm rõ ràng cho từng cấu phần của monorepo, chúng tôi thiết lập ma trận phân nhiệm **RACI** dưới đây:

*   **R - Responsible (Người thực hiện):** Thành viên trực tiếp viết code và triển khai nghiệp vụ.
*   **A - Accountable (Người chịu trách nhiệm chính):** Thành viên duyệt kết quả cuối cùng, chịu trách nhiệm chất lượng đầu ra.
*   **C - Consulted (Người được tham vấn):** Chuyên gia hoặc thành viên hỗ trợ tư vấn chuyên môn.
*   **I - Informed (Người nhận thông tin):** Các thành viên cần nắm được tiến độ/kết quả nhưng không trực tiếp tham gia.

### Bảng Phân Nhiệm RACI Chi Tiết

| Hạng mục công việc / Vai trò | Frontend Dev (React/Vite) | Backend Dev (Lambda TS) | Cloud/DevOps Architect | Tech Lead / PM |
| :--- | :---: | :---: | :---: | :---: |
| **1. Khởi tạo khung dự án & Script Monorepo** | **R** | **R** | **C** | **A** |
| **2. Phát triển UI Components & HSL Design System** | **R** | **I** | **I** | **A** |
| **3. Xây dựng State Management (React Context)** | **R** | **C** | **I** | **A** |
| **4. Viết 7 Lambda Function Handlers (Node.js TS)** | **I** | **R** | **C** | **A** |
| **5. Thiết kế & cấu hình dbService (DynamoDB SDK v3)** | **I** | **R** | **C** | **A** |
| **6. Khởi tạo AWS SAM Template (`template.yaml`)** | **I** | **C** | **R** | **A** |
| **7. Thiết lập Cognito User Pool & API GW** | **C** | **C** | **R** | **A** |
| **8. Xây dựng Mock Layer phát triển Offline** | **R** | **R** | **C** | **A** |
| **9. Viết Unit & Integration Tests (Vitest/Supertest)**| **R** | **R** | **I** | **A** |
| **10. Cài đặt GitHub Actions CI/CD Pipeline** | **I** | **I** | **R** | **A** |

---

## 2. Kịch Bản Nghiệm Thu & Demo Offline (Milestone 1 Testing Scenarios)

Do dự án áp dụng chiến lược **Design First, Code Later**, việc xây dựng một **Local Mock Layer (Lớp giả lập cục bộ)** là chìa khóa để cả đội ngũ có thể chạy, kiểm thử tích hợp và duyệt giao diện/luồng dữ liệu ngay trên máy cá nhân mà không tốn một đồng chi phí AWS nào.

Dưới đây là 3 kịch bản nghiệm thu chạy hoàn toàn Offline bằng Mock Layer dành cho buổi họp chốt Milestone 1:

### 2.1. Kịch Bản 1: Đăng Ký và Đăng Nhập Người Dùng (Mock Cognito Flow)

*   **Mục tiêu:** Giả lập toàn bộ quy trình đăng ký tài khoản, gửi OTP (xác minh) và đăng nhập nhận Token JWT mà không cần kết nối internet hay tạo Cognito thực tế.
*   **Các bước thực hiện:**
    1.  **Mở trình duyệt:** Truy cập địa chỉ `http://localhost:3000` (được phục vụ bởi Vite Dev Server).
    2.  **Đăng ký tài khoản:** 
        *   Nhấp vào nút **"Đăng Nhập"** -> Chọn **"Đăng ký tài khoản mới"**.
        *   Nhập các trường thông tin: Email (`testuser@example.com`), Mật khẩu (`Password123!`), Họ tên (`Nguyễn Văn A`).
        *   Nhấn **"Đăng Ký"**.
    3.  **Xác minh mã OTP Giả Lập:**
        *   Giao diện hiển thị trang nhập mã xác nhận OTP.
        *   *Mock Layer Behavior:* Hệ thống sẽ in mã OTP giả lập ra console của trình duyệt (ví dụ: `[MOCK COGNITO] Verification Code for testuser@example.com is: 123456`).
        *   Nhập mã `123456` và nhấn **"Xác Nhận"**. Giao diện hiển thị thông báo "Tài khoản kích hoạt thành công!" và chuyển hướng sang trang đăng nhập.
    4.  **Đăng nhập hệ thống:**
        *   Nhập email `testuser@example.com` và mật khẩu `Password123!`.
        *   Nhấn **"Đăng Nhập"**.
    5.  **Kết quả mong đợi:**
        *   Đăng nhập thành công. Header cập nhật trạng thái hiển thị: `"Chào Nguyễn Văn A"` kèm avatar mặc định.
        *   Trong tab `Application -> Local Storage` của trình duyệt xuất hiện khóa `mock_cognito_token` chứa chuỗi JWT token giả lập có cấu trúc claims phân quyền `role: "User"`.

---

### 2.2. Kịch Bản 2: Đăng Ký Tham Gia Sự Kiện (Mock API & LocalStorage DB Flow)

*   **Mục tiêu:** Giả lập luồng gọi API Gateway đến Lambda, tự động kiểm tra số lượng ghế còn trống và lưu trữ thông tin đăng ký của User vào `localStorage` giả lập DynamoDB.
*   **Các bước thực hiện:**
    1.  **Duyệt sự kiện:** Từ trang chủ `http://localhost:3000`, nhấp vào thẻ sự kiện `"Hội Thảo AWS Serverless Đột Phá 2026"`.
    2.  **Xem chi tiết:** Trang chi tiết sự kiện hiển thị đồng hồ đếm ngược, mô tả, diễn giả và thanh đo số lượng vé còn trống (`142 / 500 vé đã đăng ký`).
    3.  **Đăng ký một chạm:** 
        *   Nhấn nút **"Đăng Ký Tham Gia Ngay"** (Nút này chỉ khả dụng khi đã đăng nhập ở Kịch Bản 1).
        *   *Mock Layer Behavior:* Frontend gửi request `POST http://localhost:3001/events/evt_9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d/register` kèm header `Authorization: Bearer <mock_token>`. 
        *   Máy chủ Mock Express (`backend/src/localServer.ts`) tiếp nhận request, trích xuất user claims, cập nhật tăng `registeredCount` thêm `1` đơn vị trong cơ sở dữ liệu giả lập (`localStorage` của trình duyệt) và tạo mới một item Registration.
    4.  **Kết quả mong đợi:**
        *   Nút đăng ký chuyển thành trạng thái màu xanh lá: **"Đã Đăng Ký Thành Công"**.
        *   Thống kê vé còn trống tăng lên trực quan: `143 / 500`.
        *   Màn hình hiển thị một **Vé điện tử Premium (Mock Ticket Card)** chứa:
            *   Mã vé độc bản: `TKT-AWS-9B1D-XXXX` (sinh ngẫu nhiên).
            *   Mã QR Code giả lập.
            *   Email người đăng ký và thời gian đăng ký thực tế.
        *   Khi truy cập trang **"Trang cá nhân của tôi"**, sự kiện vừa đăng ký hiển thị đầy đủ trong danh sách.

---

### 2.3. Kịch Bản 3: Quản Trị Viên Tạo Mới Sự Kiện (Mock Admin Authorization)

*   **Mục tiêu:** Giả lập phân quyền nhóm người dùng (Cognito Groups), chặn người dùng thường truy cập Admin Panel và thực thi hành động CRUD sự kiện lên cơ sở dữ liệu offline.
*   **Các bước thực hiện:**
    1.  **Thử nghiệm chặn truy cập trái phép:**
        *   Với tư cách là `testuser@example.com` (quyền User), cố tình gõ tay địa chỉ URL `/admin` trên trình duyệt.
        *   **Kết quả mong đợi:** Hệ thống hiển thị trang **"403 Forbidden - Bạn không có quyền truy cập trang này. Yêu cầu tài khoản Admin."** hoặc tự động redirect về trang chủ.
    2.  **Đăng nhập tài khoản Admin:**
        *   Thực hiện đăng xuất và đăng nhập lại bằng tài khoản admin mặc định của Mock Layer: Email `admin@eventapp.com`, Mật khẩu `AdminPass123!`.
        *   *Mock Layer Behavior:* Cognito Mock cấp Token có claim `"cognito:groups": ["Admin"]`.
    3.  **Vào trang quản trị:**
        *   Nhấp vào liên kết **"Admin Panel"** xuất hiện trên thanh điều hướng.
        *   Giao diện hiển thị bảng quản lý danh sách tất cả các sự kiện hiện có và bảng thống kê tổng quát.
    4.  **Tạo sự kiện mới:**
        *   Nhấn nút **"Thêm Sự Kiện Mới"** để mở Modal Form.
        *   Điền các thông tin: Tiêu đề (`Lập trình React Premium 2026`), Danh mục (`education`), Địa điểm (`Văn phòng AWS Hà Nội`), Tổng số ghế (`100`), Ảnh bìa (sử dụng link mockup Unsplash).
        *   Nhấn **"Tạo Sự Kiện"**.
    5.  **Kết quả mong đợi:**
        *   Hệ thống gửi request `POST http://localhost:3001/events` kèm token admin.
        *   Sự kiện mới lập tức được thêm vào mảng dữ liệu trong `localStorage`.
        *   Modal tự động đóng, giao diện hiển thị thông báo toast thành công rực rỡ.
        *   Admin được chuyển hướng về trang chủ và thấy sự kiện `"Lập trình React Premium 2026"` xuất hiện ở ngay vị trí đầu tiên của danh sách nhờ bộ lọc thời gian mới nhất.

---

## 3. Hướng Dẫn Chạy Demo Chỉ Với Một Lệnh (One-Click Running Guide)

Cả đội ngũ (bao gồm cả PM và QA) có thể chạy toàn bộ kịch bản nghiệm thu trên chỉ bằng cách cài đặt và chạy môi trường monorepo cục bộ:

```bash
# Bước 1: Clone source code dự án và di chuyển vào thư mục gốc
cd Demo

# Bước 2: Cài đặt tự động toàn bộ dependencies cho cả frontend & backend
npm run setup

# Bước 3: Khởi chạy đồng thời cả Frontend React (3000) và Mock Backend Express (3001)
npm run dev
```

*   **Log Console Backend:** Theo dõi trực tiếp tại Terminal các request HTTP đi vào (được giả lập giống 100% định dạng AWS API Gateway Proxy Request).
*   **Dữ liệu bền vững:** Dữ liệu sự kiện và đăng ký được lưu trữ trong `localStorage` của trình duyệt. Bạn có thể F5 trang thoải mái mà không lo mất dữ liệu demo, giúp quy trình test diễn ra mượt mà và trực quan nhất.
