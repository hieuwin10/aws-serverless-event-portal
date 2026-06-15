---
title: "Hướng Dẫn Hardening Bảo Mật Toàn Diện cho AWS Serverless"
category: How-To
domain: Security
difficulty: Trung bình
reading_time: 2 giờ
last_updated: 2026-06-12
tags: [security, iam, s3, cloudfront, hardening]
requirements: [Requirement 3, Requirement 16, Requirement 17, Requirement 18]
---
***
*Breadcrumbs: [Trang chủ Well-Architected](../../README.md) > [Chỉ mục](../../index.md) > [Security](../../index.md#security) > How-To*
***

# Hướng Dẫn Hardening Bảo Mật Toàn Diện cho AWS Serverless

## Vấn đề

Kiến trúc AWS Serverless hiện tại (CloudFront + S3 + Cognito + API Gateway + Lambda + DynamoDB + CloudWatch) có nhiều lỗ hổng bảo mật cần được khắc phục:

- **IAM Policies quá rộng**: Lambda functions có quyền truy cập không cần thiết
- **Thiếu WAF**: API Gateway không được bảo vệ khỏi các cuộc tấn công web
- **Thiếu MFA**: Cognito User Pool chưa bắt buộc xác thực đa yếu tố
- **S3 Public Access**: Buckets có nguy cơ bị truy cập công khai
- **Thiếu Security Headers**: CloudFront không có các headers bảo mật cần thiết

## Giải pháp

Triển khai chiến lược hardening bảo mật toàn diện theo 5 lớp:
1. **IAM Hardening**: Áp dụng nguyên tắc Least Privilege
2. **Network Security**: Triển khai WAF và bảo vệ API Gateway
3. **Data Protection**: Mã hóa dữ liệu và chặn public access
4. **Authentication**: Bật MFA và cấu hình Cognito nâng cao
5. **Monitoring**: Logging và audit trail đầy đủ

**Free Tier**: Một số giải pháp vượt Free Tier (WAF: $5/tháng + $1/rule)

**Ước tính chi phí**: $10-15/tháng cho WAF, các giải pháp khác miễn phí trong Free Tier

## Điều kiện tiên quyết

- Quyền Administrator hoặc PowerUser trên AWS Console
- AWS CLI version 2.x đã cài đặt và cấu hình
- Hiểu biết cơ bản về IAM, Lambda, API Gateway, S3, CloudFront
- Node.js 18+ (nếu cần chạy scripts validation)

## Các bước thực hiện

### 1. Hardening IAM Policies - Áp dụng Least Privilege

**Mục đích**: Giảm quyền truy cập của Lambda functions xuống mức tối thiểu cần thiết

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DynamoDBReadWrite",
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:Query"
      ],
      "Resource": [
        "arn:aws:dynamodb:${AWS::Region}:${AWS::AccountId}:table/EventsTable",
        "arn:aws:dynamodb:${AWS::Region}:${AWS::AccountId}:table/EventsTable/index/*"
      ]
    },
    {
      "Sid": "CloudWatchLogsWrite",
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
- Chỉ cho phép 4 operations cần thiết trên DynamoDB (không có DeleteItem, Scan)
- Giới hạn resource cụ thể đến table và indexes
- CloudWatch Logs chỉ cho phép write, không có read/delete
- Sử dụng variables ${AWS::Region} và ${AWS::AccountId} để tái sử dụng

**Kết quả mong đợi**: Lambda function chỉ có quyền tối thiểu, giảm rủi ro nếu bị compromise

### 2. Triển khai AWS WAF cho API Gateway

**Mục đích**: Bảo vệ API Gateway khỏi SQL injection, XSS, rate limiting abuse

⚠️ **Cảnh báo chi phí**: WAF không có Free Tier - $5/tháng + $1/rule

```json
{
  "Name": "EventAPIProtection",
  "Scope": "REGIONAL",
  "DefaultAction": {
    "Allow": {}
  },
  "Rules": [
    {
      "Name": "RateLimitRule",
      "Priority": 1,
      "Statement": {
        "RateBasedStatement": {
          "Limit": 2000,
          "AggregateKeyType": "IP"
        }
      },
      "Action": {
        "Block": {}
      },
      "VisibilityConfig": {
        "SampledRequestsEnabled": true,
        "CloudWatchMetricsEnabled": true,
        "MetricName": "RateLimitRule"
      }
    },
    {
      "Name": "AWSManagedRulesCommonRuleSet",
      "Priority": 2,
      "Statement": {
        "ManagedRuleGroupStatement": {
          "VendorName": "AWS",
          "Name": "AWSManagedRulesCommonRuleSet"
        }
      },
      "OverrideAction": {
        "None": {}
      },
      "VisibilityConfig": {
        "SampledRequestsEnabled": true,
        "CloudWatchMetricsEnabled": true,
        "MetricName": "AWSManagedRulesCommonRuleSet"
      }
    },
    {
      "Name": "AWSManagedRulesKnownBadInputsRuleSet",
      "Priority": 3,
      "Statement": {
        "ManagedRuleGroupStatement": {
          "VendorName": "AWS",
          "Name": "AWSManagedRulesKnownBadInputsRuleSet"
        }
      },
      "OverrideAction": {
        "None": {}
      },
      "VisibilityConfig": {
        "SampledRequestsEnabled": true,
        "CloudWatchMetricsEnabled": true,
        "MetricName": "AWSManagedRulesKnownBadInputsRuleSet"
      }
    }
  ],
  "VisibilityConfig": {
    "SampledRequestsEnabled": true,
    "CloudWatchMetricsEnabled": true,
    "MetricName": "EventAPIProtection"
  }
}
```

**Giải thích**:
- **Rate Limiting**: 2000 requests/5 phút per IP (phù hợp với Free Tier API Gateway)
- **Common Rule Set**: Chặn OWASP Top 10 (SQL injection, XSS, etc.)
- **Known Bad Inputs**: Chặn các patterns tấn công đã biết
- **CloudWatch Metrics**: Giám sát các requests bị block

**Deployment**:
```bash
# Tạo WAF Web ACL
aws wafv2 create-web-acl \
  --name EventAPIProtection \
  --scope REGIONAL \
  --region us-east-1 \
  --default-action Allow={} \
  --rules file://waf-rules.json \
  --visibility-config SampledRequestsEnabled=true,CloudWatchMetricsEnabled=true,MetricName=EventAPIProtection

# Associate với API Gateway
aws wafv2 associate-web-acl \
  --web-acl-arn arn:aws:wafv2:us-east-1:ACCOUNT_ID:regional/webacl/EventAPIProtection/WEB_ACL_ID \
  --resource-arn arn:aws:apigateway:us-east-1::/restapis/API_ID/stages/prod
```

**Kết quả mong đợi**: API Gateway được bảo vệ khỏi 90% các cuộc tấn công web phổ biến

### 3. Chặn S3 Public Access và Bật Encryption

**Mục đích**: Đảm bảo S3 buckets không bị truy cập công khai và dữ liệu được mã hóa

```bash
# Block all public access
aws s3api put-public-access-block \
  --bucket event-app-frontend \
  --public-access-block-configuration \
    "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"

# Enable default encryption (AES256 - miễn phí)
aws s3api put-bucket-encryption \
  --bucket event-app-frontend \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      },
      "BucketKeyEnabled": true
    }]
  }'

# Enable versioning (để có thể rollback nếu bị xóa nhầm)
aws s3api put-bucket-versioning \
  --bucket event-app-frontend \
  --versioning-configuration Status=Enabled

# Enable logging
aws s3api put-bucket-logging \
  --bucket event-app-frontend \
  --bucket-logging-status '{
    "LoggingEnabled": {
      "TargetBucket": "event-app-logs",
      "TargetPrefix": "s3-access-logs/"
    }
  }'
```

**Giải thích**:
- **BlockPublicAcls**: Chặn tất cả ACLs public mới
- **IgnorePublicAcls**: Ignore các ACLs public hiện có
- **BlockPublicPolicy**: Chặn bucket policies cho phép public access
- **RestrictPublicBuckets**: Chỉ cho phép AWS services và authorized users
- **AES256**: Mã hóa server-side miễn phí (không cần KMS)
- **BucketKeyEnabled**: Giảm chi phí KMS requests (nếu sau này chuyển sang KMS)

**S3 Bucket Policy JSON** (để chặn public access và chỉ cho phép CloudFront):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowCloudFrontServicePrincipal",
      "Effect": "Allow",
      "Principal": {
        "Service": "cloudfront.amazonaws.com"
      },
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::event-app-frontend/*",
      "Condition": {
        "StringEquals": {
          "AWS:SourceArn": "arn:aws:cloudfront::ACCOUNT_ID:distribution/DISTRIBUTION_ID"
        }
      }
    },
    {
      "Sid": "DenyInsecureTransport",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:*",
      "Resource": [
        "arn:aws:s3:::event-app-frontend",
        "arn:aws:s3:::event-app-frontend/*"
      ],
      "Condition": {
        "Bool": {
          "aws:SecureTransport": "false"
        }
      }
    },
    {
      "Sid": "DenyUnencryptedObjectUploads",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:PutObject",
      "Resource": "arn:aws:s3:::event-app-frontend/*",
      "Condition": {
        "StringNotEquals": {
          "s3:x-amz-server-side-encryption": "AES256"
        }
      }
    }
  ]
}
```

**Apply bucket policy**:
```bash
# Save policy to file
cat > s3-bucket-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowCloudFrontServicePrincipal",
      "Effect": "Allow",
      "Principal": {
        "Service": "cloudfront.amazonaws.com"
      },
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::event-app-frontend/*",
      "Condition": {
        "StringEquals": {
          "AWS:SourceArn": "arn:aws:cloudfront::ACCOUNT_ID:distribution/DISTRIBUTION_ID"
        }
      }
    },
    {
      "Sid": "DenyInsecureTransport",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:*",
      "Resource": [
        "arn:aws:s3:::event-app-frontend",
        "arn:aws:s3:::event-app-frontend/*"
      ],
      "Condition": {
        "Bool": {
          "aws:SecureTransport": "false"
        }
      }
    },
    {
      "Sid": "DenyUnencryptedObjectUploads",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:PutObject",
      "Resource": "arn:aws:s3:::event-app-frontend/*",
      "Condition": {
        "StringNotEquals": {
          "s3:x-amz-server-side-encryption": "AES256"
        }
      }
    }
  ]
}
EOF

# Apply policy
aws s3api put-bucket-policy \
  --bucket event-app-frontend \
  --policy file://s3-bucket-policy.json
```

**Giải thích S3 Bucket Policy**:
- **AllowCloudFrontServicePrincipal**: Chỉ cho phép CloudFront distribution cụ thể đọc objects
- **DenyInsecureTransport**: Bắt buộc HTTPS cho tất cả requests đến S3
- **DenyUnencryptedObjectUploads**: Bắt buộc encryption (AES256) khi upload files

**Kết quả mong đợi**: S3 bucket hoàn toàn private, dữ liệu được mã hóa at rest

### 4. Bật MFA cho Cognito User Pool

**Mục đích**: Bắt buộc xác thực đa yếu tố cho tất cả users

```bash
# Enable MFA
aws cognito-idp set-user-pool-mfa-config \
  --user-pool-id us-east-1_XXXXXXXXX \
  --mfa-configuration OPTIONAL \
  --software-token-mfa-configuration Enabled=true \
  --sms-mfa-configuration '{
    "SmsConfiguration": {
      "SnsCallerArn": "arn:aws:iam::ACCOUNT_ID:role/CognitoSNSRole",
      "ExternalId": "event-app-cognito"
    }
  }'

# Update password policy
aws cognito-idp update-user-pool \
  --user-pool-id us-east-1_XXXXXXXXX \
  --policies '{
    "PasswordPolicy": {
      "MinimumLength": 12,
      "RequireUppercase": true,
      "RequireLowercase": true,
      "RequireNumbers": true,
      "RequireSymbols": true,
      "TemporaryPasswordValidityDays": 1
    }
  }'

# Enable advanced security features (OPTIONAL - có phí)
aws cognito-idp set-user-pool-mfa-config \
  --user-pool-id us-east-1_XXXXXXXXX \
  --user-pool-add-ons '{
    "AdvancedSecurityMode": "AUDIT"
  }'
```

**Giải thích**:
- **OPTIONAL MFA**: Users có thể chọn enable MFA (khuyến nghị set REQUIRED cho production)
- **Software Token**: Hỗ trợ Google Authenticator, Authy (miễn phí)
- **SMS MFA**: Cần SNS role (có phí $0.00645/SMS ở US)
- **Password Policy**: 12 ký tự, bao gồm uppercase, lowercase, numbers, symbols
- **Advanced Security**: AUDIT mode miễn phí, ENFORCED mode có phí

**Kết quả mong đợi**: Users phải sử dụng MFA, passwords mạnh hơn

### 5. Thêm Security Headers vào CloudFront

**Mục đích**: Bảo vệ frontend khỏi XSS, clickjacking, MIME sniffing

```javascript
// Lambda@Edge function để inject security headers
exports.handler = async (event) => {
  const response = event.Records[0].cf.response;
  const headers = response.headers;

  // Strict-Transport-Security (HSTS)
  headers['strict-transport-security'] = [{
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains; preload'
  }];

  // Content-Security-Policy (CSP)
  headers['content-security-policy'] = [{
    key: 'Content-Security-Policy',
    value: "default-src 'self'; script-src 'self' 'unsafe-inline' https://cognito-idp.us-east-1.amazonaws.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://*.execute-api.us-east-1.amazonaws.com https://cognito-idp.us-east-1.amazonaws.com; frame-ancestors 'none';"
  }];

  // X-Content-Type-Options
  headers['x-content-type-options'] = [{
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  }];

  // X-Frame-Options
  headers['x-frame-options'] = [{
    key: 'X-Frame-Options',
    value: 'DENY'
  }];

  // X-XSS-Protection
  headers['x-xss-protection'] = [{
    key: 'X-XSS-Protection',
    value: '1; mode=block'
  }];

  // Referrer-Policy
  headers['referrer-policy'] = [{
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin'
  }];

  // Permissions-Policy
  headers['permissions-policy'] = [{
    key: 'Permissions-Policy',
    value: 'geolocation=(), microphone=(), camera=()'
  }];

  return response;
};
```

**Deployment**:
```bash
# Package Lambda@Edge function
zip security-headers.zip index.js

# Create Lambda function in us-east-1 (required for Lambda@Edge)
aws lambda create-function \
  --region us-east-1 \
  --function-name SecurityHeadersEdge \
  --runtime nodejs18.x \
  --role arn:aws:iam::ACCOUNT_ID:role/LambdaEdgeRole \
  --handler index.handler \
  --zip-file fileb://security-headers.zip \
  --publish

# Associate với CloudFront distribution
aws cloudfront update-distribution \
  --id DISTRIBUTION_ID \
  --distribution-config file://cloudfront-config.json
```

**Giải thích**:
- **HSTS**: Force HTTPS trong 1 năm
- **CSP**: Chỉ cho phép scripts/styles từ self và AWS services
- **X-Content-Type-Options**: Chặn MIME sniffing
- **X-Frame-Options**: Chặn clickjacking
- **X-XSS-Protection**: Enable XSS filter của browser
- **Referrer-Policy**: Giới hạn thông tin referrer
- **Permissions-Policy**: Disable các APIs không cần thiết

**Kết quả mong đợi**: Frontend đạt A+ trên securityheaders.com

### 6. Triển khai Tất cả bằng CloudFormation/SAM Template

**Mục đích**: Tự động hóa toàn bộ security hardening bằng Infrastructure as Code

```yaml
# template.yaml - SAM Template cho Security Hardening
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31
Description: Security Hardening cho AWS Serverless Event Portal

Parameters:
  FrontendBucketName:
    Type: String
    Default: event-app-frontend
    Description: Tên S3 bucket cho frontend
  
  LogsBucketName:
    Type: String
    Default: event-app-logs
    Description: Tên S3 bucket cho logs
  
  CognitoUserPoolId:
    Type: String
    Description: Cognito User Pool ID hiện tại
  
  ApiGatewayId:
    Type: String
    Description: API Gateway REST API ID hiện tại
  
  ApiGatewayStageName:
    Type: String
    Default: prod
    Description: API Gateway Stage name

Resources:
  # ============================================================================
  # IAM Role cho Lambda với Least Privilege
  # ============================================================================
  LambdaExecutionRole:
    Type: AWS::IAM::Role
    Properties:
      RoleName: EventLambdaExecutionRole-Hardened
      AssumeRolePolicyDocument:
        Version: '2012-10-17'
        Statement:
          - Effect: Allow
            Principal:
              Service: lambda.amazonaws.com
            Action: sts:AssumeRole
      ManagedPolicyArns:
        - arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
      Policies:
        - PolicyName: DynamoDBLeastPrivilege
          PolicyDocument:
            Version: '2012-10-17'
            Statement:
              - Sid: DynamoDBReadWrite
                Effect: Allow
                Action:
                  - dynamodb:GetItem
                  - dynamodb:PutItem
                  - dynamodb:UpdateItem
                  - dynamodb:Query
                Resource:
                  - !Sub 'arn:aws:dynamodb:${AWS::Region}:${AWS::AccountId}:table/EventsTable'
                  - !Sub 'arn:aws:dynamodb:${AWS::Region}:${AWS::AccountId}:table/EventsTable/index/*'
              - Sid: CloudWatchLogsWrite
                Effect: Allow
                Action:
                  - logs:CreateLogGroup
                  - logs:CreateLogStream
                  - logs:PutLogEvents
                Resource: !Sub 'arn:aws:logs:${AWS::Region}:${AWS::AccountId}:log-group:/aws/lambda/*'

  # ============================================================================
  # S3 Bucket cho Frontend với Security Hardening
  # ============================================================================
  FrontendBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: !Ref FrontendBucketName
      PublicAccessBlockConfiguration:
        BlockPublicAcls: true
        BlockPublicPolicy: true
        IgnorePublicAcls: true
        RestrictPublicBuckets: true
      BucketEncryption:
        ServerSideEncryptionConfiguration:
          - ServerSideEncryptionByDefault:
              SSEAlgorithm: AES256
            BucketKeyEnabled: true
      VersioningConfiguration:
        Status: Enabled
      LoggingConfiguration:
        DestinationBucketName: !Ref LogsBucket
        LogFilePrefix: s3-access-logs/
      LifecycleConfiguration:
        Rules:
          - Id: DeleteOldVersions
            Status: Enabled
            NoncurrentVersionExpirationInDays: 30
          - Id: TransitionToIA
            Status: Enabled
            Transitions:
              - TransitionInDays: 90
                StorageClass: STANDARD_IA

  FrontendBucketPolicy:
    Type: AWS::S3::BucketPolicy
    Properties:
      Bucket: !Ref FrontendBucket
      PolicyDocument:
        Version: '2012-10-17'
        Statement:
          - Sid: AllowCloudFrontOAI
            Effect: Allow
            Principal:
              Service: cloudfront.amazonaws.com
            Action: s3:GetObject
            Resource: !Sub '${FrontendBucket.Arn}/*'
            Condition:
              StringEquals:
                'AWS:SourceArn': !Sub 'arn:aws:cloudfront::${AWS::AccountId}:distribution/${CloudFrontDistribution}'
          - Sid: DenyInsecureTransport
            Effect: Deny
            Principal: '*'
            Action: 's3:*'
            Resource:
              - !GetAtt FrontendBucket.Arn
              - !Sub '${FrontendBucket.Arn}/*'
            Condition:
              Bool:
                'aws:SecureTransport': false

  LogsBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: !Ref LogsBucketName
      PublicAccessBlockConfiguration:
        BlockPublicAcls: true
        BlockPublicPolicy: true
        IgnorePublicAcls: true
        RestrictPublicBuckets: true
      BucketEncryption:
        ServerSideEncryptionConfiguration:
          - ServerSideEncryptionByDefault:
              SSEAlgorithm: AES256
      LifecycleConfiguration:
        Rules:
          - Id: DeleteOldLogs
            Status: Enabled
            ExpirationInDays: 90

  # ============================================================================
  # WAF Web ACL cho API Gateway
  # ============================================================================
  WAFWebACL:
    Type: AWS::WAFv2::WebACL
    Properties:
      Name: EventAPIProtection
      Scope: REGIONAL
      DefaultAction:
        Allow: {}
      Rules:
        - Name: RateLimitRule
          Priority: 1
          Statement:
            RateBasedStatement:
              Limit: 2000
              AggregateKeyType: IP
          Action:
            Block: {}
          VisibilityConfig:
            SampledRequestsEnabled: true
            CloudWatchMetricsEnabled: true
            MetricName: RateLimitRule
        
        - Name: AWSManagedRulesCommonRuleSet
          Priority: 2
          OverrideAction:
            None: {}
          Statement:
            ManagedRuleGroupStatement:
              VendorName: AWS
              Name: AWSManagedRulesCommonRuleSet
          VisibilityConfig:
            SampledRequestsEnabled: true
            CloudWatchMetricsEnabled: true
            MetricName: AWSManagedRulesCommonRuleSet
        
        - Name: AWSManagedRulesKnownBadInputsRuleSet
          Priority: 3
          OverrideAction:
            None: {}
          Statement:
            ManagedRuleGroupStatement:
              VendorName: AWS
              Name: AWSManagedRulesKnownBadInputsRuleSet
          VisibilityConfig:
            SampledRequestsEnabled: true
            CloudWatchMetricsEnabled: true
            MetricName: AWSManagedRulesKnownBadInputsRuleSet
      
      VisibilityConfig:
        SampledRequestsEnabled: true
        CloudWatchMetricsEnabled: true
        MetricName: EventAPIProtection

  WAFWebACLAssociation:
    Type: AWS::WAFv2::WebACLAssociation
    Properties:
      ResourceArn: !Sub 'arn:aws:apigateway:${AWS::Region}::/restapis/${ApiGatewayId}/stages/${ApiGatewayStageName}'
      WebACLArn: !GetAtt WAFWebACL.Arn

  # ============================================================================
  # Lambda@Edge cho CloudFront Security Headers
  # ============================================================================
  LambdaEdgeExecutionRole:
    Type: AWS::IAM::Role
    Properties:
      AssumeRolePolicyDocument:
        Version: '2012-10-17'
        Statement:
          - Effect: Allow
            Principal:
              Service:
                - lambda.amazonaws.com
                - edgelambda.amazonaws.com
            Action: sts:AssumeRole
      ManagedPolicyArns:
        - arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole

  SecurityHeadersFunction:
    Type: AWS::Serverless::Function
    Properties:
      FunctionName: SecurityHeadersEdge
      Runtime: nodejs18.x
      Handler: index.handler
      Role: !GetAtt LambdaEdgeExecutionRole.Arn
      AutoPublishAlias: live
      InlineCode: |
        exports.handler = async (event) => {
          const response = event.Records[0].cf.response;
          const headers = response.headers;
          
          headers['strict-transport-security'] = [{
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload'
          }];
          
          headers['content-security-policy'] = [{
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' https://cognito-idp.us-east-1.amazonaws.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://*.execute-api.us-east-1.amazonaws.com https://cognito-idp.us-east-1.amazonaws.com; frame-ancestors 'none';"
          }];
          
          headers['x-content-type-options'] = [{
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          }];
          
          headers['x-frame-options'] = [{
            key: 'X-Frame-Options',
            value: 'DENY'
          }];
          
          headers['x-xss-protection'] = [{
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          }];
          
          headers['referrer-policy'] = [{
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          }];
          
          headers['permissions-policy'] = [{
            key: 'Permissions-Policy',
            value: 'geolocation=(), microphone=(), camera=()'
          }];
          
          return response;
        };

  # ============================================================================
  # CloudFront Distribution với Security Headers
  # ============================================================================
  CloudFrontOriginAccessControl:
    Type: AWS::CloudFront::OriginAccessControl
    Properties:
      OriginAccessControlConfig:
        Name: !Sub '${FrontendBucketName}-OAC'
        OriginAccessControlOriginType: s3
        SigningBehavior: always
        SigningProtocol: sigv4

  CloudFrontDistribution:
    Type: AWS::CloudFront::Distribution
    Properties:
      DistributionConfig:
        Enabled: true
        DefaultRootObject: index.html
        Origins:
          - Id: S3Origin
            DomainName: !GetAtt FrontendBucket.RegionalDomainName
            OriginAccessControlId: !Ref CloudFrontOriginAccessControl
            S3OriginConfig: {}
        DefaultCacheBehavior:
          TargetOriginId: S3Origin
          ViewerProtocolPolicy: redirect-to-https
          AllowedMethods:
            - GET
            - HEAD
            - OPTIONS
          CachedMethods:
            - GET
            - HEAD
          Compress: true
          ForwardedValues:
            QueryString: false
            Cookies:
              Forward: none
          LambdaFunctionAssociations:
            - EventType: origin-response
              LambdaFunctionARN: !Ref SecurityHeadersFunction.Version
        ViewerCertificate:
          CloudFrontDefaultCertificate: true
        Logging:
          Bucket: !GetAtt LogsBucket.DomainName
          Prefix: cloudfront-logs/
          IncludeCookies: false

  # ============================================================================
  # CloudWatch Alarms cho Security Monitoring
  # ============================================================================
  WAFBlockedRequestsAlarm:
    Type: AWS::CloudWatch::Alarm
    Properties:
      AlarmName: WAF-HighBlockedRequests
      AlarmDescription: Alert when WAF blocks more than 1000 requests in 5 minutes
      MetricName: BlockedRequests
      Namespace: AWS/WAFV2
      Statistic: Sum
      Period: 300
      EvaluationPeriods: 1
      Threshold: 1000
      ComparisonOperator: GreaterThanThreshold
      Dimensions:
        - Name: Rule
          Value: ALL
        - Name: WebACL
          Value: EventAPIProtection

Outputs:
  LambdaExecutionRoleArn:
    Description: ARN của Lambda Execution Role với Least Privilege
    Value: !GetAtt LambdaExecutionRole.Arn
    Export:
      Name: !Sub '${AWS::StackName}-LambdaExecutionRoleArn'

  FrontendBucketName:
    Description: Tên S3 bucket cho frontend (đã hardened)
    Value: !Ref FrontendBucket

  WAFWebACLArn:
    Description: ARN của WAF Web ACL
    Value: !GetAtt WAFWebACL.Arn

  CloudFrontDistributionId:
    Description: CloudFront Distribution ID
    Value: !Ref CloudFrontDistribution

  CloudFrontDomainName:
    Description: CloudFront Domain Name
    Value: !GetAtt CloudFrontDistribution.DomainName

  SecurityHeadersFunctionArn:
    Description: ARN của Lambda@Edge function cho security headers
    Value: !GetAtt SecurityHeadersFunction.Arn
```

**Deployment Instructions**:

```bash
# 1. Validate template
sam validate --template template.yaml

# 2. Deploy stack
sam deploy \
  --template-file template.yaml \
  --stack-name event-app-security-hardening \
  --parameter-overrides \
    FrontendBucketName=event-app-frontend \
    LogsBucketName=event-app-logs \
    CognitoUserPoolId=us-east-1_XXXXXXXXX \
    ApiGatewayId=abcdef1234 \
    ApiGatewayStageName=prod \
  --capabilities CAPABILITY_NAMED_IAM \
  --region us-east-1

# 3. Get outputs
aws cloudformation describe-stacks \
  --stack-name event-app-security-hardening \
  --query 'Stacks[0].Outputs'

# 4. Update existing Lambda functions để sử dụng role mới
aws lambda update-function-configuration \
  --function-name YourExistingFunction \
  --role $(aws cloudformation describe-stacks \
    --stack-name event-app-security-hardening \
    --query 'Stacks[0].Outputs[?OutputKey==`LambdaExecutionRoleArn`].OutputValue' \
    --output text)
```

**Giải thích Template**:

1. **LambdaExecutionRole**: IAM role với Least Privilege cho tất cả Lambda functions
2. **FrontendBucket**: S3 bucket với:
   - Public access block enabled
   - AES256 encryption
   - Versioning enabled
   - Lifecycle policies để tối ưu chi phí
3. **FrontendBucketPolicy**: Bucket policy cho phép CloudFront OAI, deny insecure transport
4. **WAFWebACL**: Web ACL với 3 rules (rate limiting, common rule set, bad inputs)
5. **SecurityHeadersFunction**: Lambda@Edge function inject security headers
6. **CloudFrontDistribution**: Distribution với OAC, security headers, logging
7. **CloudWatch Alarms**: Cảnh báo khi có anomalies

**Dependencies**:
- AWS SAM CLI: `pip install aws-sam-cli`
- AWS CLI configured: `aws configure`

**Cost Estimate** (sau khi deploy):
- WAF: $5/month + $3/month (3 rules) = $8/month
- CloudFront: Free Tier (50 GB/month)
- Lambda@Edge: $0.60/1M requests (thường < $1/month)
- S3: Free Tier (5 GB storage)
- **Total**: ~$9-10/month

## Xác minh

### Kiểm tra 1: IAM Policy Analyzer

```bash
# Check IAM policy cho Lambda function
aws iam get-role-policy \
  --role-name EventLambdaRole \
  --policy-name LambdaExecutionPolicy

# Sử dụng IAM Access Analyzer
aws accessanalyzer create-analyzer \
  --analyzer-name EventAppAnalyzer \
  --type ACCOUNT

aws accessanalyzer list-findings \
  --analyzer-arn arn:aws:access-analyzer:us-east-1:ACCOUNT_ID:analyzer/EventAppAnalyzer
```

**Kết quả mong đợi**: Không có findings về overly permissive policies

### Kiểm tra 2: WAF Metrics

```bash
# Check WAF blocked requests
aws cloudwatch get-metric-statistics \
  --namespace AWS/WAFV2 \
  --metric-name BlockedRequests \
  --dimensions Name=Rule,Value=ALL Name=WebACL,Value=EventAPIProtection \
  --start-time 2024-01-01T00:00:00Z \
  --end-time 2024-01-02T00:00:00Z \
  --period 3600 \
  --statistics Sum
```

**Kết quả mong đợi**: Có thể thấy số requests bị block (nếu có attacks)

### Kiểm tra 3: S3 Public Access

```bash
# Verify S3 bucket không public
aws s3api get-public-access-block \
  --bucket event-app-frontend

# Check bucket policy
aws s3api get-bucket-policy \
  --bucket event-app-frontend
```

**Kết quả mong đợi**: 
```json
{
  "PublicAccessBlockConfiguration": {
    "BlockPublicAcls": true,
    "IgnorePublicAcls": true,
    "BlockPublicPolicy": true,
    "RestrictPublicBuckets": true
  }
}
```

### Kiểm tra 4: Security Headers

```bash
# Test security headers
curl -I https://d1234567890.cloudfront.net

# Hoặc sử dụng online tool
# https://securityheaders.com/?q=https://your-domain.com
```

**Kết quả mong đợi**: Tất cả security headers có mặt trong response

### Kiểm tra 5: Cognito MFA

```bash
# Check MFA configuration
aws cognito-idp describe-user-pool \
  --user-pool-id us-east-1_XXXXXXXXX \
  --query 'UserPool.MfaConfiguration'
```

**Kết quả mong đợi**: `"OPTIONAL"` hoặc `"ON"` (REQUIRED)

## Lưu ý

### Quan trọng

- ⚠️ **WAF Chi phí**: WAF không có Free Tier - $5/tháng base + $1/rule. Với 3 rules = ~$8/tháng
- ⚠️ **Lambda@Edge**: Chỉ có thể deploy ở us-east-1, có phí invocation ($0.60/1M requests)
- ⚠️ **SMS MFA**: Có phí $0.00645/SMS ở US, khuyến nghị dùng Software Token (miễn phí)
- ⚠️ **Backup IAM Policies**: Trước khi thay đổi IAM, backup policies hiện tại
- ⚠️ **Test trước Production**: Test tất cả changes trên staging environment trước

### Best Practices

- ✅ **Principle of Least Privilege**: Luôn bắt đầu với quyền tối thiểu, thêm dần khi cần
- ✅ **Defense in Depth**: Nhiều lớp bảo mật (WAF + IAM + Encryption + MFA)
- ✅ **Regular Audits**: Chạy IAM Access Analyzer hàng tuần
- ✅ **Rotate Credentials**: Rotate AWS access keys mỗi 90 ngày
- ✅ **Enable CloudTrail**: Log tất cả API calls để audit

### Troubleshooting

**Vấn đề**: Lambda function bị "Access Denied" sau khi update IAM policy
**Giải pháp**: 
```bash
# Check CloudWatch Logs để xem operation nào bị deny
aws logs filter-log-events \
  --log-group-name /aws/lambda/YourFunction \
  --filter-pattern "AccessDenied"

# Thêm permission cần thiết vào IAM policy
```

**Vấn đề**: WAF block legitimate requests
**Giải pháp**:
```bash
# Check sampled requests trong WAF console
aws wafv2 get-sampled-requests \
  --web-acl-arn arn:aws:wafv2:us-east-1:ACCOUNT_ID:regional/webacl/EventAPIProtection/WEB_ACL_ID \
  --rule-metric-name RateLimitRule \
  --scope REGIONAL \
  --time-window StartTime=2024-01-01T00:00:00Z,EndTime=2024-01-02T00:00:00Z \
  --max-items 100

# Adjust rate limit hoặc add IP whitelist nếu cần
```

**Vấn đề**: CloudFront không serve security headers
**Giải pháp**:
- Verify Lambda@Edge function được associate đúng với CloudFront behavior
- Check Lambda@Edge logs trong us-east-1 region (không phải region của distribution)
- Invalidate CloudFront cache: `aws cloudfront create-invalidation --distribution-id ID --paths "/*"`

### Tối ưu hóa

#### Performance Optimization
- Lambda@Edge có latency thấp hơn origin response
- Cache security headers ở browser với max-age dài
- Sử dụng CloudFront caching để giảm Lambda invocations

#### Cost Optimization
- Dùng Software Token MFA thay vì SMS (miễn phí)
- Sử dụng AES256 encryption thay vì KMS (miễn phí)
- Monitor WAF metrics để optimize rules (giảm false positives)
- Xem xét dùng AWS Managed Rules thay vì custom rules (rẻ hơn)

#### Security Optimization
- Enable AWS GuardDuty để detect threats ($4/tháng cho 1000 CloudTrail events)
- Enable AWS Security Hub để centralize security findings
- Sử dụng AWS Secrets Manager cho sensitive data ($0.40/secret/month)




## Bước tiếp theo

- [Triển khai WAF cho API Gateway](waf-configuration.md)
- [Bật MFA và Cognito nâng cao](cognito-advanced.md)
- [Kiểm tra bảo mật với OWASP ZAP](../../testing/how-to/security-testing.md)

## Tài liệu liên quan

- [IAM Policies Reference](../reference/iam-policies.md)
- [WAF Configuration](waf-configuration.md)
- [Well-Architected Assessment](../../well-architected-assessment.md)

---

**Metadata**:
- **Requirements**: Requirement 3, Requirement 16, Requirement 17, Requirement 18
- **Category**: How-To
- **Domain**: Security
- **Tags**: security, hardening, iam, waf, cognito, mfa, s3, cloudfront, encryption
- **Last Updated**: 2026-06-12
- **Free Tier Compatible**: Partial (WAF có phí)
- **Difficulty**: Trung bình
- **Estimated Reading/Implementation Time**: 2 giờ