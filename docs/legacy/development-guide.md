# Hướng Dẫn Phát Triển Dự Án (Development Guide)

Cẩm nang này hướng dẫn chi tiết cách thiết lập môi trường phát triển cục bộ (Local Development) và quy trình triển khai (Deployment) hệ thống lên môi trường đám mây **AWS Cloud** nằm trọn trong gói miễn phí **AWS Free Tier**.

---

## 1. Yêu Cầu Cài Đặt Ban Đầu (Prerequisites)

Hãy chắc chắn rằng máy tính cá nhân của bạn đã cài đặt đầy đủ các công cụ sau:
*   **Node.js:** Phiên bản ổn định dài hạn mới nhất (LTS v20+).
*   **Git:** Để quản lý mã nguồn.
*   **IDE khuyên dùng:** VS Code hoặc Cursor/Claude Code với các plugin hỗ trợ TypeScript và React.
*   **AWS CLI (Tùy chọn):** Để thực hiện các lệnh deploy trực tiếp từ terminal.

---

## 2. Hướng Dẫn Thiết Lập Cục Bộ (Local Installation)

Làm theo các bước sau để khởi chạy dự án ngay trên máy tính của bạn:

### Bước 2.1: Clone dự án và cài đặt toàn bộ thư viện
Mở Terminal của bạn (Command Prompt hoặc PowerShell trên Windows) tại thư mục dự án và chạy lệnh sau:
```bash
# Cài đặt tất cả thư viện cho cả thư mục gốc, frontend và backend
npm run setup
```

### Bước 2.2: Khởi chạy môi trường giả lập (Local Mock Layer)
Để phát triển offline nhanh chóng, hệ thống tích hợp sẵn lớp giả lập API Gateway và Lambda:
*   Mã nguồn chạy server backend giả lập sẽ được khởi chạy tại cổng `http://localhost:3001`.
*   Cơ sở dữ liệu DynamoDB được giả lập bằng một tệp tin JSON cục bộ hoặc đồng bộ hóa qua `localStorage` ở Client để dữ liệu không bị mất đi khi F5.

Chạy lệnh sau tại thư mục gốc để khởi động đồng thời cả máy chủ Frontend và Backend:
```bash
npm run dev
```
Sau khi chạy thành công:
*   Trang chủ ứng dụng (React + Vite) sẽ hiển thị tại địa chỉ: `http://localhost:3000`
*   Máy chủ API Mock (Express Lambda Runner) sẽ lắng nghe tại: `http://localhost:3001`

### Bước 2.3: Cấu hình Biến Môi Trường (Environment Variables)

Tạo các tệp `.env` trong mỗi thư mục con theo mẫu sau:

**`frontend/.env` (Chạy cục bộ):**
```env
# URL của Backend API Mock (hoặc API Gateway thật khi deploy)
VITE_API_BASE_URL=http://localhost:3001

# Cognito Config (Bỏ trống khi dùng Mock Auth, điền khi kết nối AWS thật)
VITE_COGNITO_USER_POOL_ID=
VITE_COGNITO_CLIENT_ID=
VITE_COGNITO_REGION=ap-southeast-1

# Chế độ xác thực: "mock" (giả lập localStorage) hoặc "cognito" (AWS thật)
VITE_AUTH_MODE=mock
```

**`backend/.env` (Chạy cục bộ):**
```env
# Tên bảng DynamoDB (hoặc tên bảng trên DynamoDB Local)
DYNAMODB_TABLE_NAME=EventApp-Data

# Cognito User Pool ID (bỏ trống khi dùng Mock)
COGNITO_USER_POOL_ID=

# Chế độ database: "mock" (JSON file) hoặc "dynamodb" (AWS thật / DynamoDB Local)
DB_MODE=mock

# Endpoint DynamoDB Local (nếu dùng Docker container)
DYNAMODB_ENDPOINT=http://localhost:8000

# Region AWS (dùng khi kết nối cloud thật)
AWS_REGION=ap-southeast-1
```

> ⚠️ **BẢO MẬT:** Tệp `.env` chứa thông tin nhạy cảm. Luôn thêm `.env` vào `.gitignore` để tránh vô tình đẩy lên GitHub.

---

## 3. Quy Trình Phát Triển Offline (Offline Workflow)

Khi bạn muốn thêm một chức năng mới:
1.  **Định nghĩa Schema dữ liệu:** Thêm các thuộc tính mới vào mô hình dữ liệu trong [data-models.md](./data-models.md).
2.  **Viết API mới:** Tạo một handler mới trong thư mục `backend/src/handlers/` và đăng ký route tương ứng tại tệp `backend/src/localServer.ts`.
3.  **Tích hợp UI:** Sử dụng `fetch` hoặc `axios` từ React để gọi đến api giả lập và cập nhật giao diện người dùng.

---

## 4. Hướng Dẫn Triển Khai Thực Tế Lên AWS (Production Deployment)

Khi dự án đã hoàn tất và chạy mượt mà ở cục bộ, hãy làm theo quy trình 5 bước sau để đưa ứng dụng lên hệ thống mạng AWS Cloud thực tế:

### Bước 4.1: Tạo Cơ sở dữ liệu và Xác thực
1.  **Amazon DynamoDB:** 
    *   Truy cập AWS Console -> DynamoDB -> Create Table.
    *   Đặt tên bảng là `EventApp-Data`. Partition Key là `PK` (String), Sort Key là `SK` (String).
    *   **QUAN TRỌNG:** Chọn chế độ dung lượng là **Provisioned** với 25 RCU và 25 WCU.
2.  **Amazon Cognito:**
    *   Truy cập Cognito -> Create User Pool.
    *   Bật tính năng xác thực bằng Email, cho phép người dùng tự đăng ký.
    *   Tạo Client App Client để lấy `UserPoolId` và `ClientId` tích hợp vào Frontend.

### Bước 4.2: Triển khai các hàm AWS Lambda
1.  Đóng gói mã nguồn backend thành tệp `.zip` (hoặc chạy lệnh build Webpack đóng gói tệp JS duy nhất).
2.  Truy cập Lambda -> Create Function. Chọn Node.js 20.x, kiến trúc x86_64.
3.  Tạo **Execution Role** cấp quyền đọc/ghi bảng DynamoDB `EventApp-Data` và đẩy log vào CloudWatch.
4.  Tải tệp `.zip` lên và thiết lập các biến môi trường:
    *   `DYNAMODB_TABLE_NAME` = `EventApp-Data`
    *   `COGNITO_USER_POOL_ID` = `YOUR_USER_POOL_ID`

### Bước 4.3: Thiết lập Amazon API Gateway
1.  Truy cập API Gateway -> Create API -> Chọn HTTP API hoặc REST API.
2.  Tạo các Endpoint tương ứng với các Lambda handler (ví dụ: `GET /events` trỏ đến lambda `getEvents`).
3.  Tạo **Cognito Authorizer** gắn vào các route cần bảo mật và bật **CORS** cho phép tên miền Frontend truy cập.

### Bước 4.4: Triển khai Frontend lên Amazon S3 & CloudFront
1.  Chạy lệnh đóng gói mã nguồn Frontend tại máy cá nhân:
    ```bash
    cd frontend
    npm run build
    ```
    Lệnh này sinh ra thư mục `dist/` chứa gói mã nguồn tối ưu hóa tĩnh.
2.  Tạo một **Amazon S3 Bucket** (chế độ Private). Tải toàn bộ nội dung trong thư mục `dist/` lên bucket này.
3.  Tạo một **Amazon CloudFront Distribution**:
    *   Trỏ Origin Domain về S3 bucket vừa tạo.
    *   Thiết lập **Origin Access Control (OAC)** để chỉ CloudFront có quyền lấy file từ S3.
    *   Thiết lập **Default Root Object** là `index.html`.
    *   Cấu hình cơ chế **Error Pages**: Định hướng các lỗi `403` và `404` về `/index.html` với mã trạng thái `200` để cơ chế Client-side Routing của React Router hoạt động chính xác.

### Bước 4.5: Cài đặt Giám sát CloudWatch
1.  Truy cập CloudWatch -> Log Groups.
2.  Chọn Log Group của các hàm Lambda vừa tạo, chỉnh sửa **Log Retention Policy** thành `7 days`.
