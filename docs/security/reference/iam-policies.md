# IAM Policies Reference - Least Privilege cho AWS Serverless

## Mô tả

Bộ sưu tập IAM policies được thiết kế theo nguyên tắc Least Privilege (Quyền tối thiểu) cho kiến trúc AWS Serverless. Mỗi policy chỉ cấp quyền tối thiểu cần thiết cho từng Lambda function và AWS service.

**Use Case**: Áp dụng cho Lambda functions, API Gateway, CloudFront, và các AWS services khác trong kiến trúc Serverless

**Free Tier**: Có - IAM hoàn toàn miễn phí

**Ước tính chi phí**: $0/tháng

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
- Chỉ cho phép 6 operations cần thiết (không có DeleteItem, Scan)
- Giới hạn resource đến table cụ thể và indexes
- CloudWatch Logs chỉ write, không read/delete
- Sử dụng variables để tái sử dụng across regions/accounts

**Kết quả**: Lambda có quyền tối thiểu để hoạt động

**Dependencies**: AWS SDK v3
**Environment Variables**: Không cần

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
- Chỉ GetObject và ListBucket (không có PutObject, DeleteObject)
- Condition: Chỉ access objects có tag Environment=production
- Bao gồm cả bucket và objects (/* suffix)

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
- API Gateway cần nhiều permissions hơn Lambda
- Resource wildcard vì API Gateway tạo log groups động

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
- GetSecretValue để đọc secret value
- Condition: Chỉ đọc version AWSCURRENT (không phải old versions)
- KMS Decrypt cần thiết nếu secrets được encrypt bằng KMS
- Condition: KMS chỉ qua Secrets Manager service

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
- SNS: Chỉ Publish đến topic cụ thể
- SES: Chỉ gửi từ địa chỉ verified
- Condition: Giới hạn FromAddress để tránh abuse

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

## Xem thêm

### How-To Guides
- [Security Hardening Guide](../how-to/security-hardening.md)
- [IAM Policy Testing](../how-to/iam-policy-testing.md)

### AWS Documentation
- [IAM Policy Reference](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies.html)
- [IAM Policy Examples](https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_examples.html)
- [IAM Condition Keys](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_condition-keys.html)

### Tools
- [IAM Policy Simulator](https://policysim.aws.amazon.com/)
- [IAM Access Analyzer](https://console.aws.amazon.com/access-analyzer/)

---

**Metadata**:
- **Category**: reference
- **Domain**: security
- **Tags**: iam, security, least-privilege, policies, lambda, dynamodb, s3
- **Last Updated**: 2024-01-15
- **Free Tier Compatible**: Yes
- **Estimated Cost**: Free
- **AWS Services**: IAM, Lambda, DynamoDB, S3, CloudWatch, Secrets Manager, SNS, SES
- **Complexity**: Intermediate
- **Estimated Implementation Time**: 2-4 hours
