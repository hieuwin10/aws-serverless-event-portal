# AWS Serverless Event Management Portal (Enterprise-Grade Standard)

[![AWS Compliant](https://img.shields.io/badge/AWS-Free%20Tier-orange?logo=amazon-aws)](https://aws.amazon.com/free/)
[![BMAD Method](https://img.shields.io/badge/BMAD-Method%20v6-blue?logo=github)](https://github.com/bmad-code-org/BMAD-METHOD)
[![License](https://img.shields.io/badge/license-MIT-green)](#)

Chào mừng bạn đến với kho lưu trữ mã nguồn và đặc tả thiết kế của hệ thống **AWS Serverless Event Management Portal** (Cổng thông tin Quản lý và Đăng ký Sự kiện Trực tuyến). 

Hệ thống được thiết kế theo mô hình **Serverless** 100% không máy chủ, sử dụng các dịch vụ lõi của Amazon Web Services (AWS) và được tối ưu hóa cấu hình để **chạy hoàn toàn miễn phí trong gói AWS Free Tier** (Always Free và 12 Months Free).

---

## 🏗️ 1. Sơ Đồ Kiến Trúc Hệ Thống (AWS Serverless Architecture)

Hệ thống vận hành theo cơ chế **Event-Driven Architecture (Kiến trúc hướng sự kiện)**, chỉ tính toán và kích hoạt tài nguyên khi có yêu cầu thực tế từ Client, giúp hóa đơn AWS luôn ở mức 0đ.

```mermaid
graph TD
    %% Tác nhân & Phân phối
    User([Người dùng / Admin]) -->|1. Truy cập Domain| CF[Amazon CloudFront <br/> Global CDN]
    CF -->|2. Tải trang tĩnh| S3[(Amazon S3 Bucket <br/> Static Website Hosting)]
    
    %% Xác thực tài khoản
    User -->|3. Đăng nhập / Đăng ký| Cognito[Amazon Cognito <br/> User Pools]
    Cognito -->|4. Cấp JWT Token| User

    %% Cổng kết nối API
    User -->|5. Gửi request + JWT| APIGW[Amazon API Gateway]
    APIGW -->|6. Xác thực JWT| Cognito
    
    %% Phân quyền IAM
    APIGW -.->|7. Phân quyền truy cập| IAM[AWS IAM Roles]
    
    %% Backend Lambda
    APIGW -->|8. Kích hoạt Function| Lambda[AWS Lambda <br/> Node.js TS]
    
    %% Database & Logs
    Lambda -->|9. Đọc/Ghi dữ liệu dưới quyền IAM| DynamoDB[(Amazon DynamoDB <br/> Single-Table NoSQL)]
    Lambda -.->|10. Đẩy Log hoạt động| CW[Amazon CloudWatch <br/> Logs]

    %% CSS Styling
    style User fill:#f9f,stroke:#333,stroke-width:2px
    style S3 fill:#ff9900,stroke:#333,stroke-width:2px,color:#fff
    style CF fill:#ff9900,stroke:#333,stroke-width:2px,color:#fff
    style Cognito fill:#ff5050,stroke:#333,stroke-width:2px,color:#fff
    style APIGW fill:#ff9900,stroke:#333,stroke-width:2px,color:#fff
    style IAM fill:#757575,stroke:#333,stroke-width:1px,stroke-dasharray: 5 5,color:#fff
    style Lambda fill:#ff9900,stroke:#333,stroke-width:2px,color:#fff
    style DynamoDB fill:#4070ff,stroke:#333,stroke-width:2px,color:#fff
    style CW fill:#40a0ff,stroke:#333,stroke-width:2px,color:#fff
```

---

## 📊 2. Bản Thiết Kế Cơ Sở Dữ Liệu Single-Table Design Đỉnh Cao

Dữ liệu được tổ chức khoa học trong một bảng duy nhất `EventApp-Data` hỗ trợ tới **17 thực thể nghiệp vụ khác nhau** chỉ bằng **2 Chỉ mục phụ (Overloaded GSIs)**:

*   **CQRS Seats Projection:** Khi ghi dữ liệu đặt vé, hệ thống chỉ ghi trực tiếp vào `TICKET`. Tính năng **DynamoDB Streams** tự động kích hoạt Lambda để đồng bộ bất đồng bộ (`Eventual Consistency`) sang trường tổng ghế trống `Event.remainingSeats` giúp tối ưu hóa tối đa hiệu năng đọc/ghi.
*   **Hybrid Audit Timeline:** Ghi log phân tán rộng rãi bằng `PK = LOG#<Component>` chống hot partition, đồng thời gộp dòng thời gian log toàn cục qua `GSI1Index` phục vụ Admin.
*   **Idempotency Key:** Trường `requestId` được tích hợp trong `REGISTRATION` để triệt tiêu lỗi mua trùng vé (double-booking).

---

## 📂 3. Bản Đồ 14 Tệp Tài Liệu Kỹ Thuật (docs/)

Toàn bộ các khía cạnh nghiệp vụ, giao diện, API, hạ tầng và CI/CD của hệ thống được tài liệu hóa chi tiết tại thư mục `docs/`:

1.  **[index.md](./docs/index.md) (Chỉ Mục Tài Liệu):** Điểm điều hướng trung tâm của toàn bộ hệ thống tài liệu.
2.  **[project-overview.md](./docs/project-overview.md) (Tổng Quan Dự Án):** Tóm tắt dự án, tính năng cốt lõi và lịch sử các phiên bản v1.3.
3.  **[source-tree-analysis.md](./docs/source-tree-analysis.md) (Cấu Trúc Thư Mục):** Phân tích sơ đồ Monorepo và bản đồ phụ thuộc thư viện NPM.
4.  **[team-alignment-matrix.md](./docs/team-alignment-matrix.md) (Tài Liệu Họp Team):** Ma trận trách nhiệm **RACI** và 3 kịch bản nghiệm thu offline Milestone 1.
5.  **[db.md](./db.md) (Sơ Đồ Thực Thể Database):** Thiết kế chi tiết cấu trúc bảng quan hệ (DBML) của 17 thực thể.
6.  **[data-models.md](./docs/data-models.md) (Đặc Tả DynamoDB):** Thiết kế Single-Table chi tiết, 15 Access Patterns (AP-1 đến AP-15) và mô phỏng Layout.
7.  **[integration-architecture.md](./docs/integration-architecture.md) (Kiến Trúc Tích Hợp):** Đặc tả 7 dịch vụ AWS, quyền IAM Roles và kiểm soát chi phí Free Tier.
8.  **[architecture-frontend.md](./docs/architecture-frontend.md) (Kiến Trúc Frontend):** Cấu trúc React Context, Responsive layout mobile-first và route guard bảo mật.
9.  **[architecture-backend.md](./docs/architecture-backend.md) (Kiến Trúc Backend):** Thiết kế độc lập 7 hàm Lambda (Single-purpose) và bộ builder response đính kèm CORS.
10. **[api-contracts.md](./docs/api-contracts.md) (Thông Số API):** Định nghĩa cấu trúc request/response và các HTTP code lỗi chuẩn hóa.
11. **[development-guide.md](./docs/development-guide.md) (Hướng Dẫn Phát Triển):** Cách cấu hình biến môi trường `.env` và mock offline cục bộ.
12. **[infrastructure-as-code.md](./docs/infrastructure-as-code.md) (Hạ Tầng Dưới Dạng Mã):** Tệp cấu hình AWS SAM `template.yaml` hoàn chỉnh.
13. **[testing-strategy.md](./docs/testing-strategy.md) (Chiến Lược Kiểm Thử):** Kim tự tháp kiểm thử gồm Unit, Integration và E2E tests.
14. **[operations-backup-cicd.md](./docs/operations-backup-cicd.md) (CI/CD Pipeline):** Thiết lập GitHub Actions tự động hóa quy trình deploy khi push code.

---

## 🚀 4. Hướng Dẫn Tải Lên GitHub Nhanh Chóng

Thực hiện lần lượt các bước sau để đẩy toàn bộ dự án lên kho lưu trữ GitHub mới của bạn:

### Bước 1: Khởi tạo Git tại máy cục bộ
Mở Terminal tại thư mục `Demo` và chạy:
```bash
# Khởi tạo repository cục bộ
git init

# Thêm tất cả tài liệu vào staging area
git add .

# Thực hiện commit đầu tiên
git commit -m "feat: init AWS Serverless Event Portal Technical Design Docs (v1.3)"
```

### Bước 2: Tạo Repo mới trên Github
1.  Truy cập [github.com/new](https://github.com/new).
2.  Đặt tên Repository Name là: `aws-serverless-event-portal`
3.  Phần cấu hình khác (README, gitignore, License) chọn **None / Off** (vì chúng ta đã chuẩn bị sẵn).
4.  Nhấn nút **"Create repository"** màu xanh lá.

### Bước 3: Liên kết và tải lên GitHub
Chạy các dòng lệnh hiển thị trên màn hình GitHub của bạn (thay thế bằng URL repo của bạn):
```bash
# Đổi tên nhánh chính thành main
git branch -M main

# Liên kết với Github repo vừa tạo (thay thế hieuvin10 bằng tài khoản của bạn)
git remote add origin https://github.com/hieuvin10/aws-serverless-event-portal.git

# Đẩy code lên GitHub
git push -u origin main
```

---
*Tài liệu được biên soạn dựa trên tiêu chuẩn kiến trúc BMAD Method v6 (Breakthrough Method for Agile AI-Driven Development).*
