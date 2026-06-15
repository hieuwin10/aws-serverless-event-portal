---
title: "IAM Policies Reference"
category: Reference
domain: Security
difficulty: Trung bình
reading_time: 1 giờ
last_updated: 2026-06-12
tags: [iam, policies, least-privilege, lambda]
requirements: [Requirement 3, Requirement 16, Requirement 17]
---
***
*Breadcrumbs: [Trang chủ Well-Architected](../../README.md) > [Chỉ mục](../../index.md) > [Security](../../index.md#security) > Reference*
***

# IAM Policies Reference - Least Privilege cho AWS Serverless

## Mô tả

Bộ sưu tập IAM policies được thiết kế theo nguyên tắc Least Privilege (Quyền tối thiểu) cho kiến trúc AWS Serverless. Mỗi policy chỉ cấp quyền tối thiểu cần thiết cho từng Lambda function và AWS service.

**Use Case**: Áp dụng cho Lambda functions, API Gateway, CloudFront, và các AWS services khác trong kiến trúc Serverless

**Free Tier**: Có - IAM hoàn toàn miễn phí

**Ước tính chi phí**: $0/tháng

## Bảng Tổng Hợp Policies

Bảng này liệt kê tất cả IAM policies được cung cấp trong tài liệu này, giúp bạn nhanh chóng tìm policy phù hợp với nhu cầu:

| Số | Policy Name | AWS Services | Use Case | Ví dụ |
|----|-------------|--------------|----------|-------|
| 1 | Lambda DynamoDB Read/Write | Lambda, DynamoDB, CloudWatch Logs | Lambda function cần đọc/ghi DynamoDB | [Ví dụ 1](#ví-dụ-1-lambda-dynamodb-readwrite-policy) |
| 2 | Lambda S3 Read-Only | Lambda, S3 | Lambda function chỉ cần đọc S3 objects | [Ví dụ 2](#ví-dụ-2-lambda-s3-read-only-policy) |
| 3 | API Gateway CloudWatch Logs | API Gateway, CloudWatch Logs | API Gateway ghi logs vào CloudWatch | [Ví dụ 3](#ví-dụ-3-api-gateway-cloudwatch-logs-policy) |
| 3.1 | API Gateway Lambda Invocation | API Gateway, Lambda | API Gateway invoke Lambda functions | [Ví dụ 3.1](#ví-dụ-31-api-gateway-lambda-invocation-policy) |
| 4 | Lambda Secrets Manager | Lambda, Secrets Manager, KMS | Lambda đọc secrets từ Secrets Manager | [Ví dụ 4](#ví-dụ-4-lambda-secrets-manager-policy) |
| 5 | Lambda SNS/SES Notification | Lambda, SNS, SES | Lambda gửi notifications qua SNS và email qua SES | [Ví dụ 5](#ví-dụ-5-lambda-snsses-notification-policy) |

### Coverage theo AWS Services

✅ **Lambda** - Covered (Examples 1, 2, 4, 5)  
✅ **DynamoDB** - Covered (Example 1)  
✅ **S3** - Covered (Example 2)  
✅ **CloudWatch Logs** - Covered (Examples 1, 3)  
✅ **API Gateway** - Covered (Examples 3, 3.1)  
✅ **Secrets Manager** - Covered (Example 4)  
✅ **KMS** - Covered (Example 4)  
✅ **SNS** - Covered (Example 5)  
✅ **SES** - Covered (Example 5)

## Cú pháp

### Cú pháp cơ bản

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DescriptiveName",
      "Effect": "Allow",
      "Action": ["service:Action"],
      "Resource": "arn:aws:service:region:account:resource"
    }
  ]
}
```

### Cú pháp đầy đủ với Conditions

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DescriptiveName",
      "Effect": "Allow",
      "Action": ["service:Action1", "service:Action2"],
      "Resource": ["arn:aws:service:region:account:resource1", "arn:aws:service:region:account:resource2"],
      "Condition": {
        "StringEquals": {
          "aws:RequestedRegion": "us-east-1"
        }
      }
    }
  ]
}
```

## Tham số

### Tham số bắt buộc

| Tham số | Kiểu | Mô tả | Giá trị mặc định | Ràng buộc |
|---------|------|-------|------------------|-----------|
| Version | string | Phiên bản policy language | N/A | Phải là "2012-10-17" |
| Statement | array | Danh sách các statements | N/A | Ít nhất 1 statement |
| Effect | string | Allow hoặc Deny | N/A | "Allow" hoặc "Deny" |
| Action | array/string | AWS API actions | N/A | Format: "service:Action" |
| Resource | array/string | AWS resource ARNs | N/A | Valid ARN format |

### Tham số tùy chọn

| Tham số | Kiểu | Mô tả | Giá trị mặc định | Ràng buộc |
|---------|------|-------|------------------|-----------|
| Sid | string | Statement ID | null | Unique trong policy |
| Condition | object | Điều kiện áp dụng | null | Valid condition operators |
| Principal | object | Áp dụng cho ai | null | Chỉ dùng trong resource-based policies |

## Ví dụ

### Ví dụ 1: Lambda DynamoDB Read/Write Policy

Policy cho Lambda function cần đọc/ghi DynamoDB table cụ thể.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DynamoDBTableAccess",
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:Query",
        "dynamodb:BatchGetItem",
        "dynamodb:BatchWriteItem"
      ],
      "Resource": [
        "arn:aws:dynamodb:${AWS::Region}:${AWS::AccountId}:table/EventsTable",
        "arn:aws:dynamodb:${AWS::Region}:${AWS::AccountId}:table/EventsTable/index/*"
      ]
    },
    {
      "Sid": "CloudWatchLogsAccess",
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:${AWS::Region}:${AWS::AccountId}:log-group:/aws/lambda/*"
    }
  ]
}
```

**Giải thích**:
- **DynamoDB Actions**:
  - `dynamodb:GetItem`: Đọc một item theo primary key
  - `dynamodb:PutItem`: Tạo mới hoặc thay thế item hoàn toàn
  - `dynamodb:UpdateItem`: Cập nhật một số attributes của item (không thay thế toàn bộ)
  - `dynamodb:Query`: Truy vấn items theo partition key và sort key (efficient cho queries phức tạp)
  - `dynamodb:BatchGetItem`: Đọc nhiều items cùng lúc (tối đa 100 items)
  - `dynamodb:BatchWriteItem`: Ghi nhiều items cùng lúc (tối đa 25 items)
  - **Không có**: `DeleteItem` (không cho phép xóa), `Scan` (operation tốn kém, nên tránh)
- **Resource scope**: 
  - Base table: `table/EventsTable` - cho tất cả operations trên main table
  - Indexes: `table/EventsTable/index/*` - cho Query operations trên Global/Local Secondary Indexes
- **CloudWatch Logs**: 
  - Chỉ có 3 permissions cần thiết để ghi logs: CreateLogGroup, CreateLogStream, PutLogEvents
  - Không có Read/Delete permissions (không cần thiết cho Lambda)
  - Resource giới hạn trong `/aws/lambda/*` namespace
- **Variables**: Sử dụng `${AWS::Region}` và `${AWS::AccountId}` để policy có thể reuse across environments

**Kết quả**: Lambda có quyền tối thiểu để hoạt động với DynamoDB và ghi logs, không thể xóa data hoặc scan toàn bộ table

**Dependencies**: AWS SDK v3 (@aws-sdk/client-dynamodb, @aws-sdk/lib-dynamodb)
**Environment Variables**: 
- `DYNAMODB_TABLE_NAME`: Tên DynamoDB table (ví dụ: EventsTable)

### Ví dụ 2: Lambda S3 Read-Only Policy

Policy cho Lambda function chỉ cần đọc objects từ S3 bucket.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "S3ReadOnlyAccess",
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:GetObjectVersion",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::event-app-uploads",
        "arn:aws:s3:::event-app-uploads/*"
      ],
      "Condition": {
        "StringEquals": {
          "s3:ExistingObjectTag/Environment": "production"
        }
      }
    }
  ]
}
```

**Giải thích**:
- **Action permissions**: Chỉ GetObject và ListBucket (không có PutObject, DeleteObject) để đảm bảo read-only access
  - `s3:GetObject`: Đọc nội dung object
  - `s3:GetObjectVersion`: Đọc các phiên bản cũ nếu S3 versioning được bật
  - `s3:ListBucket`: Liệt kê objects trong bucket (cần cho pagination và search)
- **Resource scope**: Bao gồm cả bucket (`arn:aws:s3:::event-app-uploads`) và objects (`/*` suffix)
- **Condition**: Chỉ access objects có tag Environment=production để tránh đọc nhầm test/staging data
- **Security**: Không có write/delete permissions, giảm thiểu rủi ro nếu Lambda bị compromise

**Kết quả**: Lambda chỉ có thể đọc S3 objects, không thể modify hoặc delete

**Dependencies**: AWS SDK v3 (@aws-sdk/client-s3)
**Environment Variables**: 
- `S3_BUCKET_NAME`: Tên S3 bucket (ví dụ: event-app-uploads)

### Ví dụ 3: API Gateway CloudWatch Logs Policy

Policy cho API Gateway để ghi logs vào CloudWatch.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "APIGatewayLogsAccess",
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:DescribeLogGroups",
        "logs:DescribeLogStreams",
        "logs:PutLogEvents",
        "logs:GetLogEvents",
        "logs:FilterLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:*"
    }
  ]
}
```

**Giải thích**:
- API Gateway cần nhiều permissions hơn Lambda để quản lý logging
- Resource wildcard vì API Gateway tạo log groups động cho từng stage
- DescribeLogGroups và DescribeLogStreams cần thiết để API Gateway kiểm tra existing logs
- FilterLogEvents cho phép API Gateway query logs khi cần troubleshoot

**Kết quả**: API Gateway có quyền đầy đủ để ghi và quản lý logs

**Dependencies**: Không cần
**Environment Variables**: Không cần

### Ví dụ 3.1: API Gateway Lambda Invocation Policy

Trust policy và permissions cho phép API Gateway invoke Lambda functions.

**Trust Policy (cho Lambda Execution Role)**:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "apigateway.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
```

**Permission Policy (Lambda Resource-based Policy)**:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowAPIGatewayInvoke",
      "Effect": "Allow",
      "Principal": {
        "Service": "apigateway.amazonaws.com"
      },
      "Action": "lambda:InvokeFunction",
      "Resource": "arn:aws:lambda:${AWS::Region}:${AWS::AccountId}:function:event-*",
      "Condition": {
        "ArnLike": {
          "AWS:SourceArn": "arn:aws:execute-api:${AWS::Region}:${AWS::AccountId}:${API_ID}/*/*"
        }
      }
    }
  ]
}
```

**Giải thích**:
- Trust policy cho phép API Gateway service assume role để invoke Lambda
- Resource-based policy gắn trực tiếp vào Lambda function
- Condition ArnLike giới hạn chỉ API Gateway instance cụ thể (${API_ID}) có thể invoke
- Wildcard `event-*` cho phép invoke tất cả Lambda functions có prefix "event-"
- Pattern `/*/*` trong SourceArn cover tất cả stages và methods

**Kết quả**: API Gateway có quyền invoke Lambda một cách an toàn với giới hạn rõ ràng

**Dependencies**: API Gateway REST API đã được tạo
**Environment Variables**: 
- `API_ID`: ID của API Gateway (ví dụ: abc123def4)

### Ví dụ 4: Lambda Secrets Manager Policy

Policy cho Lambda đọc secrets từ AWS Secrets Manager.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "SecretsManagerReadAccess",
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue",
        "secretsmanager:DescribeSecret"
      ],
      "Resource": "arn:aws:secretsmanager:${AWS::Region}:${AWS::AccountId}:secret:event-app/*",
      "Condition": {
        "StringEquals": {
          "secretsmanager:VersionStage": "AWSCURRENT"
        }
      }
    },
    {
      "Sid": "KMSDecryptAccess",
      "Effect": "Allow",
      "Action": [
        "kms:Decrypt",
        "kms:DescribeKey"
      ],
      "Resource": "arn:aws:kms:${AWS::Region}:${AWS::AccountId}:key/*",
      "Condition": {
        "StringEquals": {
          "kms:ViaService": "secretsmanager.${AWS::Region}.amazonaws.com"
        }
      }
    }
  ]
}
```

**Giải thích**:
- **Secrets Manager Actions**:
  - `secretsmanager:GetSecretValue`: Đọc giá trị secret (chuỗi text hoặc JSON)
  - `secretsmanager:DescribeSecret`: Lấy metadata về secret (creation date, rotation config, v.v.) nhưng không lấy giá trị
  - **Không có**: CreateSecret, UpdateSecret, DeleteSecret (Lambda không nên có quyền modify secrets)
- **Resource scope**: Giới hạn trong prefix `event-app/*` để chỉ access secrets của application này
- **Condition - VersionStage**: 
  - Chỉ đọc version `AWSCURRENT` (version hiện tại đang active)
  - Không đọc `AWSPENDING` (version đang rotation) hoặc `AWSPREVIOUS` (version cũ)
  - Đảm bảo Lambda luôn dùng secret mới nhất và stable
- **KMS Actions** (cần thiết khi secrets được encrypt bằng customer-managed KMS key):
  - `kms:Decrypt`: Giải mã secret value
  - `kms:DescribeKey`: Lấy thông tin về KMS key
- **KMS Condition**: 
  - `kms:ViaService`: Chỉ cho phép KMS decrypt thông qua Secrets Manager service
  - Ngăn chặn Lambda dùng KMS key để decrypt arbitrary data

**Kết quả**: Lambda có thể đọc secrets một cách an toàn, không thể modify hoặc delete secrets

**Dependencies**: AWS SDK v3 (@aws-sdk/client-secrets-manager)
**Environment Variables**: 
- `SECRET_NAME`: Tên secret trong Secrets Manager (ví dụ: event-app/database-credentials)

### Ví dụ 5: Lambda SNS/SES Notification Policy

Policy cho Lambda gửi notifications qua SNS và SES.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "SNSPublishAccess",
      "Effect": "Allow",
      "Action": [
        "sns:Publish"
      ],
      "Resource": "arn:aws:sns:${AWS::Region}:${AWS::AccountId}:event-notifications"
    },
    {
      "Sid": "SESEmailAccess",
      "Effect": "Allow",
      "Action": [
        "ses:SendEmail",
        "ses:SendRawEmail"
      ],
      "Resource": "*",
      "Condition": {
        "StringEquals": {
          "ses:FromAddress": "noreply@event-app.com"
        }
      }
    }
  ]
}
```

**Giải thích**:
- **SNS Actions**:
  - `sns:Publish`: Gửi message đến SNS topic
  - **Resource**: Giới hạn đến topic cụ thể `event-notifications` (không phải wildcard)
  - **Security**: Lambda không thể tạo/xóa topics, chỉ publish messages
- **SES Actions**:
  - `ses:SendEmail`: Gửi email với định dạng đơn giản (subject, body, recipients)
  - `ses:SendRawEmail`: Gửi email với MIME format (cho attachments, HTML phức tạp)
  - **Resource**: `"*"` vì SES không support resource-level permissions
- **SES Condition - FromAddress**:
  - Giới hạn chỉ gửi từ địa chỉ `noreply@event-app.com` (phải được verify trong SES)
  - Ngăn chặn Lambda abuse email system để gửi spam từ địa chỉ khác
  - Nếu cần nhiều sender addresses, dùng array: `["noreply@event-app.com", "support@event-app.com"]`
- **Free Tier**: 
  - SNS: 1M publishes/tháng miễn phí
  - SES: 62,000 emails/tháng miễn phí khi gửi từ EC2/Lambda

**Kết quả**: Lambda có thể gửi notifications qua SNS và emails qua SES một cách an toàn với giới hạn rõ ràng

**Dependencies**: AWS SDK v3 (@aws-sdk/client-sns, @aws-sdk/client-ses)
**Environment Variables**: 
- `SNS_TOPIC_ARN`: ARN của SNS topic (ví dụ: arn:aws:sns:us-east-1:123456789012:event-notifications)
- `SES_FROM_EMAIL`: Email address đã verify (ví dụ: noreply@event-app.com)

## Lưu ý

### Quan trọng

- ⚠️ **Tránh Wildcards**: Không dùng `"Resource": "*"` trừ khi thực sự cần thiết
- ⚠️ **Tránh `*` trong Actions**: Chỉ định actions cụ thể thay vì `"dynamodb:*"`
- ⚠️ **Test Thoroughly**: Test policies trên staging trước khi apply lên production
- ⚠️ **Version Control**: Lưu tất cả IAM policies trong Git
- ⚠️ **Regular Audits**: Sử dụng IAM Access Analyzer để detect overly permissive policies

### Best Practices

- ✅ **Principle of Least Privilege**: Bắt đầu với quyền tối thiểu, thêm dần khi cần
- ✅ **Use Conditions**: Thêm conditions để giới hạn thêm (IP, time, tags, etc.)
- ✅ **Separate Policies**: Tạo policies riêng cho từng concern (DynamoDB, S3, Logs)
- ✅ **Use Variables**: Dùng `${AWS::Region}`, `${AWS::AccountId}` để reusable
- ✅ **Descriptive Sids**: Đặt tên Sid rõ ràng để dễ audit

### Anti-patterns

- ❌ **Wildcard Resources**: `"Resource": "*"` cho phép access tất cả resources
- ❌ **Wildcard Actions**: `"Action": "s3:*"` cho phép tất cả S3 operations
- ❌ **No Conditions**: Không có conditions = policy quá rộng
- ❌ **Hardcoded ARNs**: Hardcode region/account ID = không reusable
- ❌ **Admin Policies**: Gán AdministratorAccess cho Lambda functions

### Troubleshooting

#### Vấn đề 1: Access Denied Error

**Triệu chứng**:
```
AccessDeniedException: User: arn:aws:sts::123456789012:assumed-role/LambdaRole/function-name is not authorized to perform: dynamodb:GetItem on resource: arn:aws:dynamodb:us-east-1:123456789012:table/EventsTable
```

**Nguyên nhân**: IAM policy thiếu permission hoặc resource ARN sai

**Giải pháp**:
```bash
# Check CloudWatch Logs để xem exact error
aws logs filter-log-events \
  --log-group-name /aws/lambda/YourFunction \
  --filter-pattern "AccessDenied"

# Thêm missing permission vào policy
# Verify resource ARN đúng format
```

#### Vấn đề 2: Policy Too Large

**Triệu chứng**: Error "Policy document is too large"

**Nguyên nhân**: IAM policy vượt 6,144 characters (managed policy) hoặc 10,240 characters (inline policy)

**Giải pháp**:
- Split thành multiple managed policies
- Attach multiple policies vào role
- Sử dụng wildcards hợp lý (ví dụ: `table/*` thay vì list tất cả tables)

#### Vấn đề 3: Condition Not Working

**Triệu chứng**: Condition không filter như mong đợi

**Nguyên nhân**: Sai condition operator hoặc key

**Giải pháp**:
```json
// Sai: StringEquals với array
"Condition": {
  "StringEquals": {
    "aws:RequestedRegion": ["us-east-1", "us-west-2"]
  }
}

// Đúng: ForAnyValue:StringEquals với array
"Condition": {
  "ForAnyValue:StringEquals": {
    "aws:RequestedRegion": ["us-east-1", "us-west-2"]
  }
}
```




## Bước tiếp theo

- [Áp dụng policies vào hệ thống](../how-to/security-hardening.md)
- [Test IAM policies](../../testing/how-to/security-testing.md)

## Tài liệu liên quan

- [Security Hardening Guide](../how-to/security-hardening.md)
- [Security Testing](../../testing/how-to/security-testing.md)

---

**Metadata**:
- **Requirements**: Requirement 3, Requirement 16, Requirement 17, Requirement 18
- **Category**: Reference
- **Domain**: Security
- **Tags**: iam, security, least-privilege, policies, lambda, dynamodb, s3
- **Last Updated**: 2026-06-12
- **Free Tier Compatible**: Yes
- **AWS Services**: IAM, Lambda, DynamoDB, S3, CloudWatch, Secrets Manager, SNS, SES
- **Difficulty**: Trung bình
- **Estimated Reading/Implementation Time**: 1 giờ