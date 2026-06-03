# Tổng Quan Dự Án: Website Quản Lý & Đăng Ký Sự Kiện Online

**Ngày lập:** 26/05/2026  
**Loại hình:** Full-stack Web Application (Serverless)  
**Mẫu kiến trúc:** AWS Serverless (Cognito + CloudFront + S3 + API Gateway + Lambda + DynamoDB + CloudWatch)  

---

## 1. Tóm Tắt Dự Án (Executive Summary)

Dự án này hướng tới phát triển một giải pháp phần mềm toàn diện cho phép người dùng tìm kiếm, xem chi tiết và đăng ký tham gia các sự kiện trực tuyến hoặc trực tiếp. Đồng thời, hệ thống cung cấp một bảng quản trị dành riêng cho Ban tổ chức (Admin) để tạo mới, chỉnh sửa, xóa và theo dõi danh sách thành viên tham gia sự kiện.

Để đảm bảo hiệu năng và loại bỏ chi phí vận hành ban đầu cho các startup hoặc nhà phát triển cá nhân, toàn bộ hạ tầng dự án được triển khai trên nền tảng **AWS Free Tier**. Bằng cách kết hợp kiến trúc **Serverless**, hệ thống sẽ tự động mở rộng theo nhu cầu sử dụng thực tế (Pay-as-you-go) mà không đòi hỏi bất kỳ máy chủ nào chạy liên tục, giữ chi phí ở mức 0đ cho lưu lượng sử dụng nhỏ và vừa.

---

## 2. Phân Loại Dự Án (Project Classification)

*   **Loại kho lưu trữ (Repository Type):** Monorepo (chứa cả mã nguồn Frontend và Backend)
*   **Ngôn ngữ chính (Primary Languages):** TypeScript (Backend & Core logic), JavaScript & HTML/CSS (Frontend)
*   **Hạ tầng đám mây (Cloud Provider):** Amazon Web Services (AWS)
*   **Chế độ thanh toán Cloud:** AWS Free Tier (Tối ưu hóa chi phí tối đa)

---

## 3. Cấu Trúc Các Phần Dự Án (Multi-Part Structure)

Dự án bao gồm hai cấu phần độc lập nhưng tích hợp chặt chẽ với nhau:

```
                  ┌───────────────────────────────────────────────┐
                  │                 USER BROWSER                  │
                  └──────┬────────────────────────────────┬───────┘
                         │                                │
            (Tải giao diện tĩnh)                   (Xác thực Cognito)
                         ▼                                ▼
            ┌───────────────────────────┐   ┌───────────────────────────┐
            │         FRONTEND          │   │      AMAZON COGNITO       │
            │   (React + S3 + CDN)      │   │     (User/Admin Auth)     │
            └────────────┬──────────────┘   └─────────────┬─────────────┘
                         │                                │
                  (Gửi API Request)                (Xác thực Token)
                         ▼                                ▼
            ┌───────────────────────────────────────────────────────────┐
            │                        BACKEND API                        │
            │      (API Gateway + Lambda TS + DynamoDB Database)        │
            └───────────────────────────────────────────────────────────┘
```

### 3.1. Frontend Component
*   **Thư mục:** `frontend/`
*   **Nhiệm vụ:** Cung cấp trải nghiệm người dùng hiện đại, hiển thị danh sách sự kiện, thực hiện đăng ký và đăng nhập, và bảng điều khiển quản trị.
*   **Công nghệ sử dụng:** React (Vite), Vanilla CSS (Design system sang trọng, hiệu ứng Glassmorphism, Theme tối, Micro-animations).

### 3.2. Backend Component
*   **Thư mục:** `backend/`
*   **Nhiệm vụ:** Xử lý nghiệp vụ chính, bảo mật endpoint, kiểm tra số lượng vé còn trống của sự kiện và lưu trữ dữ liệu.
*   **Công nghệ sử dụng:** Node.js (TypeScript), AWS Lambda, Amazon DynamoDB, AWS SDK v3.

---

## 4. Các Tính Năng Cốt Lõi (Key Features)

### Đối với Người Dùng Đăng Ký (Users)
*   **Xác thực tài khoản bảo mật:** Đăng ký, đăng nhập và đăng xuất tài khoản thông qua cổng bảo mật **Amazon Cognito**.
*   **Trang chủ sự kiện & Gợi ý cá nhân hóa:** Hiển thị danh sách các sự kiện đang diễn ra kèm theo bộ lọc nhanh theo danh mục, thanh tìm kiếm tức thời và mục gợi ý sự kiện dựa trên lịch sử tham gia của người dùng.
*   **Chi tiết sự kiện cao cấp:** Cung cấp thông tin chi tiết về sự kiện (thời gian, địa điểm, mô tả, diễn giả), điểm đánh giá (Rating) cùng tiến trình số lượng vé còn trống trực quan.
*   **Đăng ký tham gia một chạm & Danh sách chờ (Waitlist):** Người dùng có thể đăng ký sự kiện dễ dàng. Nếu sự kiện hết vé, tự động đưa vào danh sách chờ và tự động đẩy vé khi có người hủy.
*   **Hệ thống Check-in QR Code:** Mỗi vé điện tử được đính kèm một mã QR để check-in tại sự kiện.
*   **Đánh giá sự kiện (Reviews):** Cho phép người dùng đánh giá và nhận xét sự kiện sau khi đã check-in thành công.
*   **Trang cá nhân, Hạng thành viên & Lịch sự kiện:** Quản lý danh sách sự kiện đã đăng ký dưới dạng danh sách hoặc Lịch (Calendar View), tải file đồng bộ Google/Apple Calendar (.ics), theo dõi điểm thưởng (Loyalty Points) và hạng thành viên.

### Đối với Quản Trị Viên (Admins) & Ban Tổ Chức (Organizers)
*   **Phân quyền đa cấp (Multi-Role):** Hỗ trợ vai trò Admin tối cao và vai trò Organizer (Ban tổ chức). Admin có toàn quyền, trong khi Organizer chỉ có quyền trên các sự kiện do chính họ tạo ra.
*   **Quản lý sự kiện (CRUD):** Tạo mới sự kiện (kèm upload ảnh), cập nhật thông tin sự kiện và xóa sự kiện.
*   **Điểm danh (Check-in) linh hoạt:** Hỗ trợ quét mã QR bằng thiết bị di động để check-in siêu tốc, hoặc điểm danh thủ công (đánh dấu trực tiếp trên danh sách) trên giao diện quản lý của Admin/Organizer.
*   **Thống kê & Quản lý danh sách chờ:** Theo dõi danh sách đăng ký, danh sách chờ và quản lý các đánh giá sự kiện từ người dùng.

---

## 5. Điểm Nhấn Kiến Trúc (Architecture Highlights)

*   **Bảo mật không dùng Key (IAM Roles):** Không lưu trữ bất kỳ thông tin nhạy cảm nào như AWS Access Key trong mã nguồn. Toàn bộ quyền truy cập giữa Lambda và DynamoDB hay API Gateway đều được phân quyền thông qua **IAM Roles** chặt chẽ.
*   **Tối ưu hóa Free Tier:**
    *   DynamoDB được cấu hình cố định ở chế độ **Provisioned Capacity** (25 RCU / 25 WCU) để nằm hoàn toàn trong hạn mức Always Free.
    *   S3 + CloudFront cung cấp băng thông phân phối lên tới 1 TB miễn phí hàng tháng.
*   **Giám sát Chủ động:** Tích hợp **CloudWatch Logs** ghi lại toàn bộ lịch sử lỗi và nhật ký hệ thống với log retention là 7 ngày để tránh phát sinh chi phí lưu trữ vượt hạn mức.

---

## 6. Hướng Dẫn Vận Hành & Khởi Chạy Nhanh

### Yêu Cầu Hệ Thống (Prerequisites)
*   [Node.js](https://nodejs.org) v20 trở lên
*   Quản lý package bằng `npm`
*   AWS CLI (nếu muốn deploy thực tế) hoặc LocalStack (nếu muốn test offline giả lập đám mây)

### Câu Lệnh Cốt Lõi (Key Commands)

#### Khởi tạo & Cài đặt Dependencies
```bash
# Tại thư mục gốc dự án
npm run setup
```

#### Chạy Cục Bộ (Local Development)
```bash
# Khởi chạy frontend (React + Vite)
cd frontend
npm run dev

# Khởi chạy mock API Gateway & Lambda local
cd backend
npm run start:local
```

---

## 7. Sơ Đồ Tài Liệu Hướng Dẫn

Để xem chi tiết cách thức hoạt động của từng bộ phận:
*   Xem [Phân tích thư mục nguồn](./source-tree-analysis.md) để biết vị trí các file code.
*   Xem [Kiến trúc tích hợp AWS](./integration-architecture.md) để biết cách cấu hình trên AWS Console.
*   Xem [Thông số API](./api-contracts.md) để biết danh sách các endpoint dữ liệu.
*   Xem [Chiến lược kiểm thử](./testing-strategy.md) để biết cách viết test.
*   Xem [Hạ tầng dưới dạng mã](./infrastructure-as-code.md) để triển khai tự động bằng SAM.
*   Xem [Vận hành & CI/CD](./operations-backup-cicd.md) để thiết lập GitHub Actions.
*   Xem [Ma trận nhóm & Nghiệm thu](./team-alignment-matrix.md) để chốt phân nhiệm RACI và chạy thử kịch bản offline.

---

## 8. Lịch Sử Phiên Bản Tài Liệu (Version History)

| Phiên bản | Ngày | Tác giả | Nội dung thay đổi |
| :--- | :--- | :--- | :--- |
| v1.0 | 26/05/2026 | AI Architect | Khởi tạo bộ tài liệu gốc (9 files): index, project-overview, integration-architecture, architecture-frontend, architecture-backend, source-tree-analysis, development-guide, api-contracts, data-models. |
| v1.1 | 26/05/2026 | AI Architect | Bổ sung 4 tài liệu mới: error-handling-troubleshooting, infrastructure-as-code, testing-strategy, operations-backup-cicd. Cập nhật data-models (Access Patterns + Sample Layout). |
| v1.2 | 26/05/2026 | AI Architect (BMAD Review) | Rà soát theo chuẩn BMAD-METHOD v6 checklist. Bổ sung project-parts.json, Version History, Dependency Map, State Management Deep-Dive, Environment Variables. |
| v1.3 | 26/05/2026 | Senior Cloud Architect (Tổng biên tập) | Rà soát chéo đồng nhất dữ liệu (AP-8, DELETE/PUT SAM functions). Tạo mới team-alignment-matrix.md (RACI & offline kịch bản nghiệm thu). Chuẩn hóa toàn bộ relative paths để sẵn sàng deploy. |
| v1.4 | 03/06/2026 | Antigravity AI | Bổ sung 6 tính năng nâng cao (QR Check-in, Waitlist, Ratings/Reviews, Recommendations, Organizer Role, Loyalty Points) sử dụng kiến trúc Serverless Event-driven để giữ vững giới hạn Free Tier. |

---

## 9. Tài Liệu Tham Chiếu (References)

*   [AWS Free Tier — Trang chính thức](https://aws.amazon.com/free/) — Chi tiết hạn mức miễn phí của từng dịch vụ.
*   [AWS SAM Developer Guide](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/) — Hướng dẫn chính thức về Serverless Application Model.
*   [Amazon DynamoDB — Best Practices](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/best-practices.html) — Chuẩn thiết kế Single-Table Design.
*   [BMAD-METHOD v6 — GitHub](https://github.com/bmad-code-org/BMAD-METHOD) — Phương pháp phát triển Agile AI-Driven được sử dụng làm quy chuẩn tài liệu.
*   [Vite Documentation](https://vitejs.dev/) — Tài liệu công cụ bundler Frontend.

