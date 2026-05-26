# Chỉ Mục Tài Liệu Dự Án (Documentation Index)

Chào mừng bạn đến với tài liệu hướng dẫn kỹ thuật của dự án **Website Quản Lý và Đăng Ký Sự Kiện Online**. Hệ thống được thiết kế theo kiến trúc **Serverless** hiện đại, an toàn và tối ưu hóa chi phí hoàn toàn trên nền tảng **AWS Free Tier**.

---

## Thông Tin Chung (Quick Reference)

*   **Tên dự án:** Online Event Management and Registration Website
*   **Kiến trúc:** Serverless (Không máy chủ)
*   **Công nghệ Frontend:** React (Vite) + Vanilla CSS (Theme tối, Glassmorphism)
*   **Công nghệ Backend:** Node.js (TypeScript) + AWS Lambda + AWS IAM Roles
*   **Cơ sở dữ liệu:** Amazon DynamoDB (NoSQL)
*   **Hệ thống xác thực:** Amazon Cognito User Pools
*   **Giám sát & Debug:** Amazon CloudWatch Logs
*   **Cổng phân phối & API:** Amazon CloudFront & Amazon API Gateway
*   **Hạn mức vận hành:** Hoàn toàn miễn phí trong gói **AWS Free Tier**

---

## Bản Đồ Tài Liệu (Documentation Map)

Để hiểu rõ hơn về từng cấu phần của dự án, vui lòng tham khảo các tài liệu chi tiết sau đây:

### 1. Tài Liệu Cốt Lõi (Core Docs)
*   [Tổng Quan Dự Án (Project Overview)](./project-overview.md)
    *   Tóm tắt dự án, phân loại công nghệ, các tính năng cốt lõi và hướng dẫn khởi chạy nhanh.
*   [Phân Tích Cấu Trúc Thư Mục (Source Tree Analysis)](./source-tree-analysis.md)
    *   Cấu trúc thư mục của toàn bộ dự án (`frontend/`, `backend/`, `docs/`) cùng chức năng chi tiết của các file quan trọng.
*   [Ma Trận Đồng Nhất Nhóm & Kịch Bản Nghiệm Thu (Team Alignment Matrix)](./team-alignment-matrix.md)
    *   Ma trận phân nhiệm RACI cho các thành viên và kịch bản nghiệm thu giả lập offline chi tiết cho Milestone 1.

### 2. Kiến Trúc Hệ Thống (Architecture Docs)
*   [Kiến Trúc Tích Hợp AWS (Integration Architecture)](./integration-architecture.md)
    *   Sơ đồ tương tác toàn hệ thống, chi tiết vai trò của 7 dịch vụ AWS, cấu hình IAM Roles bảo mật và cài đặt giám sát CloudWatch.
*   [Kiến Trúc Giao Diện (Architecture Frontend)](./architecture-frontend.md)
    *   Thiết kế kiến trúc React + Vite, hệ thống Design System với CSS Variables, Responsive Layout và cơ chế bảo vệ Route.
*   [Kiến Trúc Nghiệp Vụ (Architecture Backend)](./architecture-backend.md)
    *   Thiết kế các hàm AWS Lambda (Node.js + TS), cơ chế xử lý lỗi Serverless, tích hợp CORS và xác thực API Gateway JWT Authorizer.

### 3. Cẩm Nang Phát Triển & Đặc Tả Kỹ Thuật (Development & Contracts)
*   [Hướng Dẫn Phát Triển (Development Guide)](./development-guide.md)
    *   Các công cụ cần cài đặt, hướng dẫn thiết lập môi trường giả lập (Local Mocking) offline và các câu lệnh hữu ích khi làm việc.
*   [Thông Số Kỹ Thuật API (API Contracts)](./api-contracts.md)
    *   Các endpoint của API Gateway, dữ liệu đầu vào (Payload), định dạng phản hồi (Response) và kiểm tra lỗi.
*   [Mô Hình Dữ Liệu (Data Models)](./data-models.md)
    *   Thiết kế cơ sở dữ liệu Amazon DynamoDB (Single-Table Design), bảng Access Patterns trực quan, mô phỏng dữ liệu mẫu và chỉ mục thứ cấp (GSI).

### 4. Kiểm Thử & Xử Lý Lỗi (Testing & Error Handling)
*   [Chiến Lược Kiểm Thử (Testing Strategy)](./testing-strategy.md)
    *   Kim tự tháp kiểm thử: Unit Test (Vitest/Jest), Integration Test (Supertest + SAM Local), E2E Test (Playwright). Mẫu code test Lambda handler chi tiết.
*   [Xử Lý Lỗi & Khắc Phục Sự Cố (Error Handling & Troubleshooting)](./error-handling-troubleshooting.md)
    *   Danh mục toàn diện các lỗi Serverless thường gặp: Lambda Timeout/Cold Start, CORS, DynamoDB Throttling, Token Expired. Kèm mẫu code Exponential Backoff Retry.

### 5. Vận Hành & Triển Khai Tự Động (Operations & Deployment)
*   [Hạ Tầng Dưới Dạng Mã (Infrastructure as Code)](./infrastructure-as-code.md)
    *   Tệp AWS SAM `template.yaml` hoàn chỉnh định nghĩa toàn bộ 7 tài nguyên AWS bằng code YAML. Hướng dẫn SAM CLI test cục bộ và deploy lên cloud.
*   [Vận Hành, Sao Lưu & CI/CD Pipeline](./operations-backup-cicd.md)
    *   Chiến lược Backup DynamoDB (On-Demand, PITR, Export S3). Tệp GitHub Actions workflow tự động build → test → deploy lên S3/Lambda/CloudFront khi push code.

---

## Hướng Dẫn Dành Cho AI-Assisted Development

Tài liệu này được định dạng chuẩn hóa để hỗ trợ các trợ lý AI (như Claude Code, Cursor, Antigravity) hiểu rõ toàn bộ cấu trúc dự án trước khi lập trình:

*   **Khi muốn sửa đổi/thêm giao diện (UI):** Tham khảo [architecture-frontend.md](./architecture-frontend.md).
*   **Khi muốn viết thêm hàm API/Backend:** Tham khảo [architecture-backend.md](./architecture-backend.md) và [api-contracts.md](./api-contracts.md).
*   **Khi muốn thay đổi cấu trúc bảng hoặc lưu trữ dữ liệu:** Tham khảo [data-models.md](./data-models.md).
*   **Khi kiểm thử cục bộ hoặc triển khai AWS:** Tham khảo [development-guide.md](./development-guide.md) và [integration-architecture.md](./integration-architecture.md).
*   **Khi cần debug lỗi production:** Tham khảo [error-handling-troubleshooting.md](./error-handling-troubleshooting.md).
*   **Khi cần tạo hạ tầng AWS bằng code:** Tham khảo [infrastructure-as-code.md](./infrastructure-as-code.md).
*   **Khi cần viết test hoặc thiết lập CI/CD:** Tham khảo [testing-strategy.md](./testing-strategy.md) và [operations-backup-cicd.md](./operations-backup-cicd.md).
*   **Khi chuẩn bị họp team và duyệt kịch bản offline:** Tham khảo [team-alignment-matrix.md](./team-alignment-matrix.md).

---
_Tài liệu được biên soạn dựa trên tiêu chuẩn kiến trúc BMAD Method v6 (Breakthrough Method for Agile AI-Driven Development)._

