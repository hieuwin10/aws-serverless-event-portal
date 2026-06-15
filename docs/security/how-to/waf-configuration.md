---
title: "Cấu Hình AWS WAF cho API Gateway"
category: How-To
domain: Security
difficulty: Trung bình
reading_time: 1.5 giờ
last_updated: 2026-06-12
tags: [waf, api-gateway, security, ddos]
requirements: [Requirement 3, Requirement 16, Requirement 18]
---
***
*Breadcrumbs: [Trang chủ Well-Architected](../../README.md) > [Chỉ mục](../../index.md) > [Security](../../index.md#security) > How-To*
***

# Hướng Dẫn Cấu Hình AWS WAF cho API Gateway và CloudFront

## Vấn đề

Kiến trúc AWS Serverless hiện tại thiếu lớp bảo vệ Web Application Firewall (WAF), khiến hệ thống dễ bị tấn công:

- **SQL Injection**: API Gateway không được bảo vệ khỏi các cuộc tấn công SQL injection
- **Cross-Site Scripting (XSS)**: Thiếu filtering cho malicious scripts
- **Rate Limiting Abuse**: Không có giới hạn số requests, dễ bị DDoS
- **Known Attack Patterns**: Không chặn các attack signatures đã biết
- **Geo-based Attacks**: Không có khả năng block traffic từ các quốc gia có rủi ro cao
- **Bot Traffic**: Không phân biệt được legitimate users và malicious bots

## Giải pháp

Triển khai AWS WAF với các managed rules và custom rules để bảo vệ:
1. **API Gateway Protection**: WAF Regional cho REST API
2. **CloudFront Protection**: WAF CloudFront cho static content
3. **Rate Limiting**: Giới hạn requests per IP
4. **OWASP Top 10 Protection**: Sử dụng AWS Managed Rules
5. **Custom Rules**: Geo blocking và IP whitelisting/blacklisting

⚠️ **Free Tier**: **KHÔNG** - WAF không có Free Tier

**Ước tính chi phí**: 
- Base: $5/tháng per Web ACL
- Rules: $1/tháng per rule
- Requests: $0.60 per 1 million requests
- **Tổng ước tính**: $10-15/tháng cho setup cơ bản

## Điều kiện tiên quyết

- Quyền IAM: `wafv2:*`, `apigateway:*`, `cloudfront:*`, `cloudformation:*`
- AWS CLI version 2.x đã cài đặt và cấu hình
- Hiểu biết cơ bản về API Gateway, CloudFront, và WAF concepts
- API Gateway REST API đã deploy (stage: prod)
- CloudFront distribution đã tạo (nếu cần bảo vệ frontend)
- Node.js 18+ hoặc Python 3.9+ (nếu cần chạy scripts validation)

## Các bước thực hiện

### 1. Tạo WAF Web ACL cho API Gateway (Regional)

**Mục đích**: Tạo Web ACL để bảo vệ API Gateway khỏi các cuộc tấn công web


```json
{
  "Name": "EventAPI-WAF-Regional",
  "Scope": "REGIONAL",
  "DefaultAction": {
    "Allow": {}
  },
  "Description": "WAF Web ACL for Event Management API Gateway",
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
        "Block": {
          "CustomResponse": {
            "ResponseCode": 429,
            "CustomResponseBodyKey": "rate-limit-response"
          }
        }
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
          "Name": "AWSManagedRulesCommonRuleSet",
          "ExcludedRules": []
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
    }
  ]
}
```


**Giải thích**:
- **Scope: REGIONAL**: Dành cho API Gateway REST API (không phải CloudFront)
- **DefaultAction: Allow**: Cho phép tất cả requests trừ khi bị block bởi rules
- **RateLimitRule**: Giới hạn 2000 requests/5 phút per IP (phù hợp với Free Tier API Gateway 1M requests/tháng)
- **ResponseCode 429**: HTTP status "Too Many Requests" khi bị rate limit
- **AWSManagedRulesCommonRuleSet**: Bảo vệ khỏi OWASP Top 10 (SQL injection, XSS, LFI, RFI, etc.)
- **CloudWatch Metrics**: Enable để giám sát blocked requests

**Deployment bằng AWS CLI**:

```bash
# Lưu JSON config vào file
cat > waf-regional-config.json << 'EOF'
{
  "Name": "EventAPI-WAF-Regional",
  "Scope": "REGIONAL",
  "DefaultAction": {"Allow": {}},
  "Description": "WAF Web ACL for Event Management API Gateway",
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
      "OverrideAction": {"None": {}},
      "VisibilityConfig": {
        "SampledRequestsEnabled": true,
        "CloudWatchMetricsEnabled": true,
        "MetricName": "CommonRuleSet"
      }
    }
  ],
  "VisibilityConfig": {
    "SampledRequestsEnabled": true,
    "CloudWatchMetricsEnabled": true,
    "MetricName": "EventAPIWAF"
  }
}
EOF


# Tạo Web ACL (thay YOUR_REGION bằng region của bạn, ví dụ: us-east-1)
aws wafv2 create-web-acl \
  --name EventAPI-WAF-Regional \
  --scope REGIONAL \
  --region YOUR_REGION \
  --default-action Allow={} \
  --description "WAF Web ACL for Event Management API Gateway" \
  --rules file://waf-regional-config.json \
  --visibility-config SampledRequestsEnabled=true,CloudWatchMetricsEnabled=true,MetricName=EventAPIWAF

# Lưu lại Web ACL ARN từ output
# Output sẽ có dạng: arn:aws:wafv2:YOUR_REGION:ACCOUNT_ID:regional/webacl/EventAPI-WAF-Regional/WEB_ACL_ID
```

**Kết quả mong đợi**:
```json
{
  "Summary": {
    "Name": "EventAPI-WAF-Regional",
    "Id": "a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
    "ARN": "arn:aws:wafv2:us-east-1:123456789012:regional/webacl/EventAPI-WAF-Regional/a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
    "LockToken": "a1b2c3d4-5678-90ab-cdef-EXAMPLE22222"
  }
}
```

### 2. Thêm AWS Managed Rules cho Bảo Mật Nâng Cao

**Mục đích**: Thêm các managed rules để bảo vệ khỏi known bad inputs và SQL injection

```bash
# Update Web ACL để thêm thêm rules
aws wafv2 update-web-acl \
  --name EventAPI-WAF-Regional \
  --scope REGIONAL \
  --region YOUR_REGION \
  --id WEB_ACL_ID \
  --lock-token LOCK_TOKEN \
  --default-action Allow={} \
  --rules '[
    {
      "Name": "RateLimitRule",
      "Priority": 1,
      "Statement": {
        "RateBasedStatement": {
          "Limit": 2000,
          "AggregateKeyType": "IP"
        }
      },
      "Action": {"Block": {}},
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
      "OverrideAction": {"None": {}},
      "VisibilityConfig": {
        "SampledRequestsEnabled": true,
        "CloudWatchMetricsEnabled": true,
        "MetricName": "CommonRuleSet"
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
      "OverrideAction": {"None": {}},
      "VisibilityConfig": {
        "SampledRequestsEnabled": true,
        "CloudWatchMetricsEnabled": true,
        "MetricName": "KnownBadInputs"
      }
    },
    {
      "Name": "AWSManagedRulesSQLiRuleSet",
      "Priority": 4,
      "Statement": {
        "ManagedRuleGroupStatement": {
          "VendorName": "AWS",
          "Name": "AWSManagedRulesSQLiRuleSet"
        }
      },
      "OverrideAction": {"None": {}},
      "VisibilityConfig": {
        "SampledRequestsEnabled": true,
        "CloudWatchMetricsEnabled": true,
        "MetricName": "SQLiRuleSet"
      }
    }
  ]' \
  --visibility-config SampledRequestsEnabled=true,CloudWatchMetricsEnabled=true,MetricName=EventAPIWAF
```

**Giải thích các Managed Rules**:
- **AWSManagedRulesCommonRuleSet**: OWASP Top 10, bao gồm XSS, path traversal, command injection
- **AWSManagedRulesKnownBadInputsRuleSet**: Chặn các patterns tấn công đã biết (CVEs, exploits)
- **AWSManagedRulesSQLiRuleSet**: Chuyên về SQL injection protection

**Chi phí**: 4 rules × $1/tháng = $4/tháng + $5 base = **$9/tháng**

**Kết quả mong đợi**: Web ACL được update với 4 rules bảo vệ toàn diện

### 3. Associate WAF với API Gateway

**Mục đích**: Kết nối Web ACL với API Gateway stage để bắt đầu filtering traffic

```bash
# Lấy API Gateway ARN
API_ID=$(aws apigateway get-rest-apis \
  --query "items[?name=='EventManagementAPI'].id" \
  --output text)

STAGE_NAME="prod"
REGION="YOUR_REGION"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

API_ARN="arn:aws:apigateway:${REGION}::/restapis/${API_ID}/stages/${STAGE_NAME}"

echo "API Gateway ARN: $API_ARN"

# Associate Web ACL với API Gateway
aws wafv2 associate-web-acl \
  --web-acl-arn arn:aws:wafv2:${REGION}:${ACCOUNT_ID}:regional/webacl/EventAPI-WAF-Regional/WEB_ACL_ID \
  --resource-arn $API_ARN \
  --region $REGION
```


**Giải thích**:
- **API Gateway ARN format**: `arn:aws:apigateway:region::/restapis/api-id/stages/stage-name`
- **Associate**: Kết nối Web ACL với specific stage (prod, dev, staging)
- Có thể associate 1 Web ACL với nhiều resources

**Kết quả mong đợi**: 
```
(No output means success)
```

Verify bằng cách:
```bash
aws wafv2 get-web-acl-for-resource \
  --resource-arn $API_ARN \
  --region $REGION
```

### 4. Tạo CloudFormation Template cho WAF (Production-Ready)

**Mục đích**: Infrastructure as Code để deploy WAF một cách nhất quán

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Description: 'AWS WAF Web ACL for API Gateway - Event Management System'

Parameters:
  Environment:
    Type: String
    Default: prod
    AllowedValues:
      - dev
      - staging
      - prod
    Description: Environment name
  
  RateLimit:
    Type: Number
    Default: 2000
    MinValue: 100
    MaxValue: 20000
    Description: Rate limit per IP (requests per 5 minutes)
  
  ApiGatewayId:
    Type: String
    Description: API Gateway REST API ID
  
  ApiGatewayStageName:
    Type: String
    Default: prod
    Description: API Gateway stage name

Resources:
  # WAF Web ACL
  EventAPIWebACL:
    Type: AWS::WAFv2::WebACL
    Properties:
      Name: !Sub 'EventAPI-WAF-${Environment}'
      Scope: REGIONAL
      Description: !Sub 'WAF Web ACL for Event Management API - ${Environment}'
      DefaultAction:
        Allow: {}
      
      Rules:
        # Rule 1: Rate Limiting
        - Name: RateLimitRule
          Priority: 1
          Statement:
            RateBasedStatement:
              Limit: !Ref RateLimit
              AggregateKeyType: IP
          Action:
            Block:
              CustomResponse:
                ResponseCode: 429
          VisibilityConfig:
            SampledRequestsEnabled: true
            CloudWatchMetricsEnabled: true
            MetricName: RateLimitRule
        
        # Rule 2: AWS Managed Rules - Common Rule Set
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
            MetricName: CommonRuleSet

        
        # Rule 3: Known Bad Inputs
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
            MetricName: KnownBadInputs
        
        # Rule 4: SQL Injection Protection
        - Name: AWSManagedRulesSQLiRuleSet
          Priority: 4
          OverrideAction:
            None: {}
          Statement:
            ManagedRuleGroupStatement:
              VendorName: AWS
              Name: AWSManagedRulesSQLiRuleSet
          VisibilityConfig:
            SampledRequestsEnabled: true
            CloudWatchMetricsEnabled: true
            MetricName: SQLiRuleSet
      
      VisibilityConfig:
        SampledRequestsEnabled: true
        CloudWatchMetricsEnabled: true
        MetricName: !Sub 'EventAPIWAF-${Environment}'
      
      Tags:
        - Key: Environment
          Value: !Ref Environment
        - Key: Application
          Value: EventManagement
        - Key: ManagedBy
          Value: CloudFormation

  # Associate WAF with API Gateway
  WebACLAssociation:
    Type: AWS::WAFv2::WebACLAssociation
    Properties:
      ResourceArn: !Sub 'arn:aws:apigateway:${AWS::Region}::/restapis/${ApiGatewayId}/stages/${ApiGatewayStageName}'
      WebACLArn: !GetAtt EventAPIWebACL.Arn

  # CloudWatch Alarm for Blocked Requests
  BlockedRequestsAlarm:
    Type: AWS::CloudWatch::Alarm
    Properties:
      AlarmName: !Sub 'WAF-BlockedRequests-${Environment}'
      AlarmDescription: Alert when WAF blocks more than 100 requests in 5 minutes
      MetricName: BlockedRequests
      Namespace: AWS/WAFV2
      Statistic: Sum
      Period: 300
      EvaluationPeriods: 1
      Threshold: 100
      ComparisonOperator: GreaterThanThreshold
      Dimensions:
        - Name: Rule
          Value: ALL
        - Name: WebACL
          Value: !Sub 'EventAPI-WAF-${Environment}'
        - Name: Region
          Value: !Ref AWS::Region
      TreatMissingData: notBreaching

Outputs:
  WebACLId:
    Description: WAF Web ACL ID
    Value: !GetAtt EventAPIWebACL.Id
    Export:
      Name: !Sub '${AWS::StackName}-WebACLId'
  
  WebACLArn:
    Description: WAF Web ACL ARN
    Value: !GetAtt EventAPIWebACL.Arn
    Export:
      Name: !Sub '${AWS::StackName}-WebACLArn'
  
  WebACLName:
    Description: WAF Web ACL Name
    Value: !Ref EventAPIWebACL
    Export:
      Name: !Sub '${AWS::StackName}-WebACLName'
```


**Deployment CloudFormation**:

```bash
# Lưu template vào file
cat > waf-cloudformation.yaml << 'EOF'
[Paste YAML template above]
EOF

# Deploy stack
aws cloudformation create-stack \
  --stack-name event-api-waf-prod \
  --template-body file://waf-cloudformation.yaml \
  --parameters \
    ParameterKey=Environment,ParameterValue=prod \
    ParameterKey=RateLimit,ParameterValue=2000 \
    ParameterKey=ApiGatewayId,ParameterValue=YOUR_API_ID \
    ParameterKey=ApiGatewayStageName,ParameterValue=prod \
  --region YOUR_REGION

# Monitor stack creation
aws cloudformation wait stack-create-complete \
  --stack-name event-api-waf-prod \
  --region YOUR_REGION

# Get outputs
aws cloudformation describe-stacks \
  --stack-name event-api-waf-prod \
  --query 'Stacks[0].Outputs' \
  --region YOUR_REGION
```

**Kết quả mong đợi**: Stack được tạo thành công với WAF Web ACL và association

### 5. Tạo WAF cho CloudFront (Optional - cho Frontend)

**Mục đích**: Bảo vệ CloudFront distribution serving frontend static files

```yaml
# CloudFront WAF Web ACL (Scope: CLOUDFRONT, phải deploy ở us-east-1)
AWSTemplateFormatVersion: '2010-09-09'
Description: 'AWS WAF Web ACL for CloudFront - Event Management Frontend'

Parameters:
  Environment:
    Type: String
    Default: prod
  
  CloudFrontDistributionId:
    Type: String
    Description: CloudFront Distribution ID

Resources:
  CloudFrontWebACL:
    Type: AWS::WAFv2::WebACL
    Properties:
      Name: !Sub 'EventFrontend-WAF-${Environment}'
      Scope: CLOUDFRONT
      Description: !Sub 'WAF Web ACL for Event Management Frontend - ${Environment}'
      DefaultAction:
        Allow: {}
      
      Rules:
        # Rate Limiting for Frontend
        - Name: FrontendRateLimitRule
          Priority: 1
          Statement:
            RateBasedStatement:
              Limit: 5000
              AggregateKeyType: IP
          Action:
            Block: {}
          VisibilityConfig:
            SampledRequestsEnabled: true
            CloudWatchMetricsEnabled: true
            MetricName: FrontendRateLimit
        
        # Common Rule Set
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
            MetricName: CommonRuleSet
      
      VisibilityConfig:
        SampledRequestsEnabled: true
        CloudWatchMetricsEnabled: true
        MetricName: !Sub 'EventFrontendWAF-${Environment}'

Outputs:
  CloudFrontWebACLArn:
    Description: CloudFront WAF Web ACL ARN
    Value: !GetAtt CloudFrontWebACL.Arn
```


**Deployment CloudFront WAF**:

```bash
# QUAN TRỌNG: CloudFront WAF phải deploy ở us-east-1
aws cloudformation create-stack \
  --stack-name event-frontend-waf-prod \
  --template-body file://waf-cloudfront.yaml \
  --parameters \
    ParameterKey=Environment,ParameterValue=prod \
    ParameterKey=CloudFrontDistributionId,ParameterValue=YOUR_DISTRIBUTION_ID \
  --region us-east-1

# Sau khi stack tạo xong, update CloudFront distribution
WEBACL_ARN=$(aws cloudformation describe-stacks \
  --stack-name event-frontend-waf-prod \
  --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontWebACLArn`].OutputValue' \
  --output text \
  --region us-east-1)

# Update CloudFront distribution config để associate WAF
# (Cần get current config trước, modify, rồi update)
aws cloudfront get-distribution-config \
  --id YOUR_DISTRIBUTION_ID \
  --query 'DistributionConfig' \
  > cloudfront-config.json

# Edit cloudfront-config.json: thêm "WebACLId": "$WEBACL_ARN"
# Sau đó update:
aws cloudfront update-distribution \
  --id YOUR_DISTRIBUTION_ID \
  --distribution-config file://cloudfront-config.json \
  --if-match ETAG_FROM_GET_COMMAND
```

**Kết quả mong đợi**: CloudFront distribution được bảo vệ bởi WAF

### 6. Thêm Custom Rules - Geo Blocking (Optional)

**Mục đích**: Block traffic từ các quốc gia có rủi ro cao

```bash
# Thêm Geo blocking rule vào Web ACL
aws wafv2 update-web-acl \
  --name EventAPI-WAF-Regional \
  --scope REGIONAL \
  --region YOUR_REGION \
  --id WEB_ACL_ID \
  --lock-token LOCK_TOKEN \
  --default-action Allow={} \
  --rules '[
    {
      "Name": "GeoBlockingRule",
      "Priority": 0,
      "Statement": {
        "GeoMatchStatement": {
          "CountryCodes": ["CN", "RU", "KP"]
        }
      },
      "Action": {"Block": {}},
      "VisibilityConfig": {
        "SampledRequestsEnabled": true,
        "CloudWatchMetricsEnabled": true,
        "MetricName": "GeoBlocking"
      }
    },
    ... (existing rules with Priority 1, 2, 3, 4)
  ]'
```

**Giải thích**:
- **CountryCodes**: ISO 3166-1 alpha-2 country codes
- **Priority 0**: Chạy trước tất cả rules khác
- Ví dụ: CN (China), RU (Russia), KP (North Korea)

⚠️ **Lưu ý**: Cân nhắc kỹ trước khi block toàn bộ quốc gia, có thể ảnh hưởng legitimate users

**Kết quả mong đợi**: Traffic từ các quốc gia bị block sẽ nhận 403 Forbidden


### 7. Tạo CDK Stack cho WAF (Alternative to CloudFormation)

**Mục đích**: Sử dụng AWS CDK (TypeScript) để deploy WAF với type safety

```typescript
// lib/waf-stack.ts
import * as cdk from 'aws-cdk-lib';
import * as wafv2 from 'aws-cdk-lib/aws-wafv2';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import { Construct } from 'constructs';

export interface WafStackProps extends cdk.StackProps {
  environment: string;
  rateLimit: number;
  apiGatewayArn: string;
}

export class WafStack extends cdk.Stack {
  public readonly webAcl: wafv2.CfnWebACL;

  constructor(scope: Construct, id: string, props: WafStackProps) {
    super(scope, id, props);

    // Create WAF Web ACL
    this.webAcl = new wafv2.CfnWebACL(this, 'EventAPIWebACL', {
      name: `EventAPI-WAF-${props.environment}`,
      scope: 'REGIONAL',
      description: `WAF Web ACL for Event Management API - ${props.environment}`,
      defaultAction: { allow: {} },
      
      rules: [
        // Rate Limiting Rule
        {
          name: 'RateLimitRule',
          priority: 1,
          statement: {
            rateBasedStatement: {
              limit: props.rateLimit,
              aggregateKeyType: 'IP',
            },
          },
          action: {
            block: {
              customResponse: {
                responseCode: 429,
              },
            },
          },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: 'RateLimitRule',
          },
        },
        
        // AWS Managed Rules - Common Rule Set
        {
          name: 'AWSManagedRulesCommonRuleSet',
          priority: 2,
          overrideAction: { none: {} },
          statement: {
            managedRuleGroupStatement: {
              vendorName: 'AWS',
              name: 'AWSManagedRulesCommonRuleSet',
            },
          },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: 'CommonRuleSet',
          },
        },
        
        // Known Bad Inputs
        {
          name: 'AWSManagedRulesKnownBadInputsRuleSet',
          priority: 3,
          overrideAction: { none: {} },
          statement: {
            managedRuleGroupStatement: {
              vendorName: 'AWS',
              name: 'AWSManagedRulesKnownBadInputsRuleSet',
            },
          },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: 'KnownBadInputs',
          },
        },
        
        // SQL Injection Protection
        {
          name: 'AWSManagedRulesSQLiRuleSet',
          priority: 4,
          overrideAction: { none: {} },
          statement: {
            managedRuleGroupStatement: {
              vendorName: 'AWS',
              name: 'AWSManagedRulesSQLiRuleSet',
            },
          },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: 'SQLiRuleSet',
          },
        },
      ],
      
      visibilityConfig: {
        sampledRequestsEnabled: true,
        cloudWatchMetricsEnabled: true,
        metricName: `EventAPIWAF-${props.environment}`,
      },
      
      tags: [
        { key: 'Environment', value: props.environment },
        { key: 'Application', value: 'EventManagement' },
        { key: 'ManagedBy', value: 'CDK' },
      ],
    });


    // Associate WAF with API Gateway
    new wafv2.CfnWebACLAssociation(this, 'WebACLAssociation', {
      resourceArn: props.apiGatewayArn,
      webAclArn: this.webAcl.attrArn,
    });

    // CloudWatch Alarm for Blocked Requests
    new cloudwatch.Alarm(this, 'BlockedRequestsAlarm', {
      alarmName: `WAF-BlockedRequests-${props.environment}`,
      alarmDescription: 'Alert when WAF blocks more than 100 requests in 5 minutes',
      metric: new cloudwatch.Metric({
        namespace: 'AWS/WAFV2',
        metricName: 'BlockedRequests',
        dimensionsMap: {
          Rule: 'ALL',
          WebACL: `EventAPI-WAF-${props.environment}`,
          Region: this.region,
        },
        statistic: 'Sum',
        period: cdk.Duration.minutes(5),
      }),
      threshold: 100,
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    // Outputs
    new cdk.CfnOutput(this, 'WebACLId', {
      value: this.webAcl.attrId,
      description: 'WAF Web ACL ID',
      exportName: `${this.stackName}-WebACLId`,
    });

    new cdk.CfnOutput(this, 'WebACLArn', {
      value: this.webAcl.attrArn,
      description: 'WAF Web ACL ARN',
      exportName: `${this.stackName}-WebACLArn`,
    });
  }
}
```

**Deployment CDK**:

```bash
# Install dependencies
npm install aws-cdk-lib constructs

# Bootstrap CDK (first time only)
cdk bootstrap aws://ACCOUNT_ID/YOUR_REGION

# Deploy stack
cdk deploy WafStack \
  --context environment=prod \
  --context rateLimit=2000 \
  --context apiGatewayArn=arn:aws:apigateway:YOUR_REGION::/restapis/API_ID/stages/prod

# Destroy stack (if needed)
cdk destroy WafStack
```

**Giải thích**:
- **Type Safety**: CDK TypeScript cung cấp type checking và IntelliSense
- **Reusable**: Có thể tạo construct library để reuse across projects
- **Testing**: Có thể viết unit tests cho CDK stacks

**Kết quả mong đợi**: WAF stack được deploy với type safety và better developer experience

## Xác minh

### Kiểm tra 1: Verify WAF Association

```bash
# Check WAF association với API Gateway
aws wafv2 get-web-acl-for-resource \
  --resource-arn arn:aws:apigateway:YOUR_REGION::/restapis/API_ID/stages/prod \
  --region YOUR_REGION

# Expected output: Web ACL ARN
```

**Kết quả mong đợi**:
```json
{
  "WebACL": {
    "Name": "EventAPI-WAF-Regional",
    "Id": "a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
    "ARN": "arn:aws:wafv2:us-east-1:123456789012:regional/webacl/EventAPI-WAF-Regional/..."
  }
}
```


### Kiểm tra 2: Test Rate Limiting

```bash
# Test rate limiting bằng cách gửi nhiều requests
API_ENDPOINT="https://YOUR_API_ID.execute-api.YOUR_REGION.amazonaws.com/prod"

# Gửi 2100 requests trong vòng 1 phút (vượt limit 2000/5min)
for i in {1..2100}; do
  curl -s -o /dev/null -w "%{http_code}\n" "$API_ENDPOINT/events" &
done
wait

# Sau khi vượt limit, sẽ thấy HTTP 429 (Too Many Requests)
```

**Kết quả mong đợi**: 
- Requests 1-2000: HTTP 200
- Requests 2001+: HTTP 429 (Too Many Requests)

### Kiểm tra 3: Test SQL Injection Protection

```bash
# Test SQL injection attack
curl -X POST "$API_ENDPOINT/events" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Event",
    "description": "1' OR '1'='1"
  }'

# WAF sẽ block request này
```

**Kết quả mong đợi**: HTTP 403 Forbidden (blocked by WAF)

### Kiểm tra 4: Monitor WAF Metrics trong CloudWatch

```bash
# Get blocked requests metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/WAFV2 \
  --metric-name BlockedRequests \
  --dimensions Name=Rule,Value=ALL Name=WebACL,Value=EventAPI-WAF-Regional Name=Region,Value=YOUR_REGION \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Sum \
  --region YOUR_REGION

# Get allowed requests metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/WAFV2 \
  --metric-name AllowedRequests \
  --dimensions Name=Rule,Value=ALL Name=WebACL,Value=EventAPI-WAF-Regional Name=Region,Value=YOUR_REGION \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Sum \
  --region YOUR_REGION
```

**Kết quả mong đợi**: Có thể thấy số lượng blocked và allowed requests

### Kiểm tra 5: Review Sampled Requests trong AWS Console

**Các bước**:
1. Mở AWS Console → WAF & Shield
2. Chọn Web ACLs → EventAPI-WAF-Regional
3. Tab "Sampled requests"
4. Xem các requests bị block và lý do

**Kết quả mong đợi**: Có thể thấy chi tiết requests bị block, rule nào đã block, và request headers/body

### Kiểm tra 6: Validate CloudFormation Stack

```bash
# Check stack status
aws cloudformation describe-stacks \
  --stack-name event-api-waf-prod \
  --query 'Stacks[0].StackStatus' \
  --region YOUR_REGION

# Get stack outputs
aws cloudformation describe-stacks \
  --stack-name event-api-waf-prod \
  --query 'Stacks[0].Outputs' \
  --region YOUR_REGION
```

**Kết quả mong đợi**: StackStatus = "CREATE_COMPLETE" hoặc "UPDATE_COMPLETE"


## Lưu ý

### Quan trọng

- ⚠️ **Chi phí WAF**: WAF **KHÔNG có Free Tier**
  - Base: $5/tháng per Web ACL
  - Rules: $1/tháng per rule (4 rules = $4/tháng)
  - Requests: $0.60 per 1 million requests
  - **Tổng ước tính**: $10-15/tháng cho setup cơ bản
  
- ⚠️ **CloudFront WAF Location**: WAF cho CloudFront **phải deploy ở us-east-1** (global region)

- ⚠️ **Rate Limit Tuning**: Rate limit 2000 requests/5min phù hợp với Free Tier API Gateway (1M requests/tháng). Điều chỉnh dựa trên traffic thực tế:
  - Low traffic: 1000-2000 requests/5min
  - Medium traffic: 5000-10000 requests/5min
  - High traffic: 20000+ requests/5min

- ⚠️ **False Positives**: AWS Managed Rules có thể block legitimate requests. Monitor sampled requests và adjust rules nếu cần.

- ⚠️ **Testing**: **LUÔN test WAF trên staging environment trước** khi deploy lên production

- ⚠️ **Backup Configuration**: Backup Web ACL configuration trước khi update:
  ```bash
  aws wafv2 get-web-acl \
    --name EventAPI-WAF-Regional \
    --scope REGIONAL \
    --id WEB_ACL_ID \
    --region YOUR_REGION > waf-backup.json
  ```

### Best Practices

- ✅ **Start with Count Mode**: Khi deploy lần đầu, set rules sang "Count" mode thay vì "Block" để monitor false positives:
  ```json
  "Action": {
    "Count": {}
  }
  ```
  Sau 1-2 tuần monitoring, chuyển sang "Block" mode.

- ✅ **Use Managed Rules**: AWS Managed Rules được update thường xuyên với latest threats, tiết kiệm thời gian maintain custom rules.

- ✅ **Enable Logging**: Enable WAF logging để audit và troubleshooting:
  ```bash
  aws wafv2 put-logging-configuration \
    --logging-configuration ResourceArn=WEB_ACL_ARN,LogDestinationConfigs=arn:aws:logs:REGION:ACCOUNT:log-group:aws-waf-logs-event-api
  ```

- ✅ **CloudWatch Dashboards**: Tạo dashboard để monitor WAF metrics real-time

- ✅ **Regular Review**: Review sampled requests hàng tuần để identify attack patterns và optimize rules

- ✅ **IP Whitelisting**: Nếu có trusted IPs (office, CI/CD), whitelist để tránh bị rate limit:
  ```json
  {
    "Name": "IPWhitelistRule",
    "Priority": 0,
    "Statement": {
      "IPSetReferenceStatement": {
        "Arn": "arn:aws:wafv2:region:account:regional/ipset/trusted-ips/..."
      }
    },
    "Action": {"Allow": {}},
    "VisibilityConfig": {...}
  }
  ```

### Troubleshooting

**Vấn đề**: WAF block legitimate requests (false positives)

**Giải pháp**:
```bash
# 1. Check sampled requests để identify rule nào block
aws wafv2 get-sampled-requests \
  --web-acl-arn WEB_ACL_ARN \
  --rule-metric-name RuleName \
  --scope REGIONAL \
  --time-window StartTime=2024-01-01T00:00:00Z,EndTime=2024-01-02T00:00:00Z \
  --max-items 100 \
  --region YOUR_REGION

# 2. Exclude specific rule trong managed rule group
# Edit Web ACL, thêm ExcludedRules:
"ManagedRuleGroupStatement": {
  "VendorName": "AWS",
  "Name": "AWSManagedRulesCommonRuleSet",
  "ExcludedRules": [
    {"Name": "SizeRestrictions_BODY"},
    {"Name": "GenericRFI_BODY"}
  ]
}

# 3. Hoặc override action sang Count thay vì Block
"RuleActionOverrides": [
  {
    "Name": "SizeRestrictions_BODY",
    "ActionToUse": {"Count": {}}
  }
]
```


**Vấn đề**: Rate limit quá thấp, block legitimate users

**Giải pháp**:
```bash
# Tăng rate limit
aws wafv2 update-web-acl \
  --name EventAPI-WAF-Regional \
  --scope REGIONAL \
  --region YOUR_REGION \
  --id WEB_ACL_ID \
  --lock-token LOCK_TOKEN \
  --default-action Allow={} \
  --rules '[
    {
      "Name": "RateLimitRule",
      "Priority": 1,
      "Statement": {
        "RateBasedStatement": {
          "Limit": 5000,  # Tăng từ 2000 lên 5000
          "AggregateKeyType": "IP"
        }
      },
      "Action": {"Block": {}},
      "VisibilityConfig": {...}
    },
    ...
  ]'

# Hoặc thay đổi AggregateKeyType sang FORWARDED_IP nếu dùng load balancer
"AggregateKeyType": "FORWARDED_IP"
```

**Vấn đề**: WAF không associate được với API Gateway

**Giải pháp**:
```bash
# Verify API Gateway ARN format
# Đúng: arn:aws:apigateway:region::/restapis/api-id/stages/stage-name
# SAI: arn:aws:apigateway:region:account-id:/restapis/... (không có account-id)

# Check IAM permissions
# Cần: wafv2:AssociateWebACL, apigateway:GET, apigateway:PATCH

# Verify Web ACL scope
# API Gateway cần REGIONAL scope, không phải CLOUDFRONT
```

**Vấn đề**: CloudWatch metrics không hiển thị

**Giải pháp**:
```bash
# Verify VisibilityConfig enabled
aws wafv2 get-web-acl \
  --name EventAPI-WAF-Regional \
  --scope REGIONAL \
  --id WEB_ACL_ID \
  --region YOUR_REGION \
  --query 'WebACL.VisibilityConfig'

# Expected:
{
  "SampledRequestsEnabled": true,
  "CloudWatchMetricsEnabled": true,
  "MetricName": "EventAPIWAF"
}

# Wait 5-10 minutes cho metrics xuất hiện lần đầu
```

**Vấn đề**: Chi phí WAF cao hơn dự kiến

**Giải pháp**:
```bash
# Check số lượng requests
aws cloudwatch get-metric-statistics \
  --namespace AWS/WAFV2 \
  --metric-name AllowedRequests \
  --dimensions Name=Rule,Value=ALL Name=WebACL,Value=EventAPI-WAF-Regional \
  --start-time $(date -u -d '30 days ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 86400 \
  --statistics Sum \
  --region YOUR_REGION

# Tính chi phí:
# Base: $5/month
# Rules: 4 rules × $1 = $4/month
# Requests: (Total requests / 1,000,000) × $0.60

# Optimization:
# - Giảm số rules nếu không cần thiết
# - Sử dụng 1 Web ACL cho nhiều resources
# - Monitor và optimize rate limiting
```

### Tối ưu hóa

#### Performance Optimization

- **Caching**: WAF evaluation happens trước khi request đến API Gateway, không ảnh hưởng latency nếu request bị block
- **Rule Order**: Đặt rules thường match nhất ở priority thấp (chạy trước) để giảm evaluation time
- **Managed Rules**: AWS Managed Rules được optimize performance bởi AWS

#### Cost Optimization

- **Consolidate Web ACLs**: Sử dụng 1 Web ACL cho nhiều API Gateway stages (dev, staging, prod) nếu rules giống nhau
- **Minimize Custom Rules**: Mỗi custom rule = $1/tháng, ưu tiên Managed Rules
- **Monitor Request Volume**: Track requests để estimate chi phí chính xác
- **Use Count Mode Initially**: Test với Count mode trước khi Block để tránh over-blocking

#### Security Optimization

- **Enable WAF Logging**: 
  ```bash
  aws wafv2 put-logging-configuration \
    --logging-configuration '{
      "ResourceArn": "WEB_ACL_ARN",
      "LogDestinationConfigs": ["arn:aws:logs:REGION:ACCOUNT:log-group:aws-waf-logs-event-api"],
      "RedactedFields": [
        {"SingleHeader": {"Name": "authorization"}},
        {"SingleHeader": {"Name": "cookie"}}
      ]
    }'
  ```

- **Integrate with AWS Security Hub**: Centralize security findings
  ```bash
  aws securityhub enable-security-hub
  aws securityhub batch-enable-standards \
    --standards-subscription-requests StandardsArn=arn:aws:securityhub:REGION::standards/aws-foundational-security-best-practices/v/1.0.0
  ```

- **Use AWS Shield Standard**: Miễn phí, tự động enable cho WAF, bảo vệ khỏi DDoS layer 3/4

- **Regular Rule Updates**: AWS Managed Rules tự động update, nhưng review release notes để biết changes





## Bước tiếp theo

- [Hardening bảo mật tổng thể](security-hardening.md)
- [Deploy WAF template](../../infrastructure/reference/cloudformation-templates.md)
- [Penetration testing API](../../testing/how-to/security-testing.md)

## Tài liệu liên quan

- [Security Hardening](security-hardening.md)
- [CloudFormation Templates](../../infrastructure/reference/cloudformation-templates.md)
- [Monitoring & Alerting](../../operations/how-to/monitoring-alerting.md)

---

**Metadata**:
- **Requirements**: Requirement 3, Requirement 16, Requirement 17, Requirement 18
- **Category**: How-To
- **Domain**: Security
- **Tags**: waf, security, api-gateway, cloudfront, ddos, rate-limiting, sql-injection, xss, owasp
- **Last Updated**: 2026-06-12
- **Free Tier Compatible**: No
- **Difficulty**: Trung bình
- **Estimated Reading/Implementation Time**: 1.5 giờ