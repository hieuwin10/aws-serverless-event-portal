---
title: "Tutorial: Deploy Serverless Stack với AWS SAM"
category: Tutorial
domain: Architecture
difficulty: Trung bình
reading_time: 1 giờ
last_updated: 2026-06-12
tags: [tutorial, sam, deploy, getting-started]
requirements: [Requirement 1, Requirement 9, Requirement 16]
---
***
*Breadcrumbs: [Trang chủ Well-Architected](../../README.md) > [Chỉ mục](../../index.md) > [Architecture](../../index.md#architecture) > Tutorial*
***

# Tutorial: Deploy Serverless Stack với AWS SAM

## Mục tiêu

Sau khi hoàn thành tutorial này, bạn sẽ:

- Hiểu quy trình deploy backend serverless (API Gateway + Lambda + DynamoDB) bằng AWS SAM
- Build và deploy stack `event-portal` lên AWS từ máy local
- Xác minh API hoạt động sau deploy
- Biết cách rollback và dọn dẹp resources để tránh phát sinh chi phí

## Điều kiện tiên quyết

- Tài khoản AWS với quyền deploy CloudFormation/SAM
- **AWS CLI** v2 và **AWS SAM CLI** đã cài đặt
- **Node.js** 18+ và npm
- Đã clone repository `aws-serverless-event-portal`
- AWS credentials đã cấu hình: `aws configure` hoặc biến môi trường `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`

> 💰 **Free Tier**: Stack dev sử dụng Lambda, DynamoDB, API Gateway — nằm trong Free Tier nếu traffic thấp. Tránh deploy nhiều stack trùng lặp.

## Các bước thực hiện

### Bước 1: Cài đặt dependencies backend

```bash
cd backend
npm install
```

**Giải thích**: Cài dependencies cho Lambda handlers trước khi SAM build đóng gói code.

---

### Bước 2: Build SAM application

```bash
sam build
```

**Giải thích**: SAM compile TypeScript, đóng gói Lambda functions vào thư mục `.aws-sam/build/`.

**Kết quả mong đợi**: Output `Build Succeeded` không có lỗi.

---

### Bước 3: Deploy lần đầu (guided)

```bash
sam deploy --guided
```

Trả lời các prompt:

| Prompt | Giá trị gợi ý |
|--------|---------------|
| Stack Name | `event-portal-dev` |
| AWS Region | `ap-southeast-1` (hoặc region bạn chọn) |
| Confirm changes | `Y` |
| Allow SAM CLI IAM role creation | `Y` |
| Save arguments to config | `Y` |

**Giải thích**: `--guided` tạo `samconfig.toml` để các lần deploy sau nhanh hơn.

> ⚠️ **Lưu ý**: Lần deploy đầu mất 5–10 phút do tạo DynamoDB table, API Gateway, Lambda functions.

---

### Bước 4: Lấy API endpoint

```bash
aws cloudformation describe-stacks \
  --stack-name event-portal-dev \
  --query "Stacks[0].Outputs[?OutputKey=='ApiUrl'].OutputValue" \
  --output text
```

Hoặc xem trong AWS Console → CloudFormation → Outputs.

**Giải thích**: Output `ApiUrl` là base URL để gọi REST API.

---

### Bước 5: Kiểm tra API hoạt động

```bash
# Thay YOUR_API_URL bằng URL từ bước 4
curl -s https://YOUR_API_URL/events | head -c 500
```

**Kết quả mong đợi**: JSON response (có thể là mảng rỗng `[]` nếu chưa có data).

```bash
# Kiểm tra health — nếu có endpoint health
curl -s -o /dev/null -w "%{http_code}" https://YOUR_API_URL/events
```

**Kết quả mong đợi**: HTTP status `200`.

---

## Kiểm tra kết quả

### Kiểm tra 1: CloudFormation stack status

```bash
aws cloudformation describe-stacks \
  --stack-name event-portal-dev \
  --query "Stacks[0].StackStatus" \
  --output text
```

**Kết quả mong đợi**: `CREATE_COMPLETE` hoặc `UPDATE_COMPLETE`

### Kiểm tra 2: Lambda functions tồn tại

```bash
aws lambda list-functions \
  --query "Functions[?contains(FunctionName,'event-portal')].FunctionName" \
  --output table
```

**Kết quả mong đợi**: Danh sách Lambda functions của stack

## Tổng kết

**Những điểm chính**:

- SAM `build` + `deploy` là quy trình chuẩn cho serverless IaC
- Stack outputs cung cấp API URL và resource IDs
- Luôn test trên dev stack trước khi production

**Kỹ năng đã đạt được**:

- Deploy serverless stack end-to-end
- Đọc CloudFormation outputs
- Verify API sau deploy

## Xử lý sự cố

### Vấn đề 1: `sam build` lỗi TypeScript

**Nguyên nhân**: Thiếu dependencies hoặc lỗi compile

**Giải pháp**:

```bash
cd backend && npm install && npm run build
sam build
```

### Vấn đề 2: Deploy fail — IAM permissions

**Nguyên nhân**: User không đủ quyền tạo IAM roles

**Giải pháp**: Dùng tài khoản có `AdministratorAccess` hoặc policy `AWSCloudFormationFullAccess` + `IAMFullAccess` (chỉ dev).

### Vấn đề 3: Rollback / xóa stack

```bash
sam delete --stack-name event-portal-dev
```

**Giải thích**: Xóa toàn bộ resources để tránh chi phí khi không dùng nữa.





## Bước tiếp theo

- [Security hardening sau deploy](../../security/how-to/security-hardening.md)
- [Thiết lập monitoring](../../operations/how-to/monitoring-alerting.md)
- [CI/CD tự động hóa](../../infrastructure/how-to/cicd-pipeline.md)

## Tài liệu liên quan

- [CloudFormation Templates](../../infrastructure/reference/cloudformation-templates.md)
- [Development Guide (legacy)](../../development-guide.md)
- [Well-Architected Assessment](../../well-architected-assessment.md)

---

**Metadata**:
- **Category**: Tutorial
- **Domain**: Architecture
- **Difficulty**: Trung bình
- **Estimated Reading/Implementation Time**: 1 giờ
- **Last Updated**: 2026-06-12
- **Free Tier Compatible**: Yes