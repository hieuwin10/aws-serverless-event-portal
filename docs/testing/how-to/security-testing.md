---
title: "Security Testing"
category: How-To
domain: Testing
difficulty: Khó
reading_time: 2.5 giờ
last_updated: 2026-06-12
tags: [security-testing, owasp, penetration, iam]
requirements: [Requirement 12, Requirement 16, Requirement 17]
---
***
*Breadcrumbs: [Trang chủ Well-Architected](../../README.md) > [Chỉ mục](../../index.md) > [Testing](../../index.md#testing) > How-To*
***

# Kiểm Thử Bảo Mật

## Vấn đề

Kiến trúc hiện tại chưa được kiểm thử bảo mật chuyên sâu:
- **Không có OWASP Top 10 testing** — không biết có lỗ hổng web phổ biến
- **IAM policies chưa được verify** — có thể quá rộng hoặc quá hẹp
- **API Gateway chưa penetration test** — chưa biết có bypass auth không
- **Chưa dùng AWS Security Hub** — không có cái nhìn tổng thể về security posture
- **Không có automated security scan** trong CI/CD pipeline

## Giải pháp

Security testing theo 4 lớp:
1. **OWASP Top 10** — kiểm tra các lỗ hổng web phổ biến nhất
2. **IAM Policy Testing** — xác minh permissions đúng với Least Privilege
3. **API Penetration Testing** — tấn công thủ công/tự động vào API Gateway
4. **AWS Security Hub** — giám sát security posture tổng thể

## Điều kiện tiên quyết

```bash
# Cài OWASP ZAP (Java-based)
# Download từ: https://www.zaproxy.org/download/

# Cài Docker (để chạy ZAP)
# Hoặc cài trực tiếp: https://www.zaproxy.org/

# Python tools
pip install boto3 awscli

# Node.js tools
npm install -g @zaproxy/zap-api-client
```

> ⚠️ **PHÁP LÝ**: Chỉ được phép penetration test trên hệ thống của chính mình. AWS cấm test trực tiếp lên AWS infrastructure (load balancers, CloudFront endpoints). Xem [AWS Penetration Testing Policy](https://aws.amazon.com/security/penetration-testing/).

> 💰 **Chi phí**: OWASP ZAP miễn phí. AWS Security Hub: 30 ngày miễn phí, sau đó $0.0010/finding/month.

---

## Phần 1: OWASP Top 10 Testing

### 1.1 Các Lỗ Hổng OWASP Top 10 Cần Kiểm Tra

| # | Lỗ Hổng | Liên Quan Đến | Cách Test |
|---|---------|---------------|-----------|
| A01 | Broken Access Control | Cognito JWT, Lambda auth | Test bypass JWT |
| A02 | Cryptographic Failures | S3 encryption, DynamoDB SSE | Kiểm tra cấu hình |
| A03 | Injection | DynamoDB queries | Test NoSQL injection |
| A04 | Insecure Design | Architecture review | Manual review |
| A05 | Security Misconfiguration | S3 public, IAM | AWS Config rules |
| A06 | Vulnerable Components | npm dependencies | npm audit |
| A07 | Authentication Failures | Cognito config | Test brute force |
| A08 | Software Integrity | CI/CD pipeline | Verify signatures |
| A09 | Logging Failures | CloudWatch | Verify log completeness |
| A10 | SSRF | Lambda internal calls | Test request forgery |

### 1.2 OWASP ZAP Automated Scan

```bash
#!/bin/bash
# Chạy OWASP ZAP baseline scan bằng Docker

API_URL="https://your-api-gateway-url.execute-api.us-east-1.amazonaws.com/dev"
REPORT_DIR="./security-reports"
mkdir -p $REPORT_DIR

echo "=== OWASP ZAP Baseline Scan ==="
echo "Target: $API_URL"

# Baseline scan — passive scan, không tấn công
docker run --rm \
  -v $(pwd)/security-reports:/zap/wrk/:rw \
  -t ghcr.io/zaproxy/zaproxy:stable \
  zap-baseline.py \
    -t $API_URL \
    -r zap-baseline-report.html \
    -J zap-baseline-report.json \
    -l WARN \
    -I  # Ignore warnings — chỉ fail khi có FAIL

echo "Report saved to: $REPORT_DIR/zap-baseline-report.html"

# API Scan — dựa trên OpenAPI/Swagger spec
if [ -f "openapi.yaml" ]; then
  echo ""
  echo "=== ZAP API Scan (từ OpenAPI spec) ==="
  docker run --rm \
    -v $(pwd):/zap/wrk/:rw \
    -t ghcr.io/zaproxy/zaproxy:stable \
    zap-api-scan.py \
      -t openapi.yaml \
      -f openapi \
      -r zap-api-report.html \
      -J zap-api-report.json
fi
```

### 1.3 Test Injection Thủ Công

```bash
#!/bin/bash
# Test NoSQL Injection vào API Gateway
API_URL="https://your-api-id.execute-api.us-east-1.amazonaws.com/dev"
TOKEN="your-valid-jwt-token"

echo "=== Test NoSQL Injection ==="

# Test 1: Injection vào query params
echo "Test 1: Query param injection..."
curl -s -o /dev/null -w "Status: %{http_code}\n" \
  "${API_URL}/events?id[$ne]=null" \
  -H "Authorization: Bearer $TOKEN"

# Kỳ vọng: 400 Bad Request hoặc 200 với empty results
# NGUY HIỂM nếu: 200 với tất cả records (bypass filter)

echo ""
echo "Test 2: Body injection trong POST..."
curl -s -w "\nStatus: %{http_code}\n" \
  -X POST "${API_URL}/events" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": {"$ne": null}, "date": "2024-01-01"}'

# Kỳ vọng: 400 Bad Request (validate input)
# NGUY HIỂM nếu: 201 Created với data không hợp lệ

echo ""
echo "Test 3: Path traversal..."
curl -s -o /dev/null -w "Status: %{http_code}\n" \
  "${API_URL}/events/../../../etc/passwd" \
  -H "Authorization: Bearer $TOKEN"
# Kỳ vọng: 403 hoặc 404

echo ""
echo "Test 4: Large payload (DoS test)"
LARGE_PAYLOAD=$(python3 -c "print('A' * 10000)")
curl -s -o /dev/null -w "Status: %{http_code}\n" \
  -X POST "${API_URL}/events" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"name\": \"$LARGE_PAYLOAD\"}"
# Kỳ vọng: 400 Bad Request (size limit)
# API Gateway mặc định giới hạn 10MB payload
```

### 1.4 Test Authentication Bypass

```bash
#!/bin/bash
API_URL="https://your-api-id.execute-api.us-east-1.amazonaws.com/dev"

echo "=== Test Authentication Bypass ==="

# Test 1: Không có token
echo "Test 1: No token..."
curl -s -o /dev/null -w "Status: %{http_code}\n" \
  "${API_URL}/events"
# Kỳ vọng: 401 Unauthorized

# Test 2: Token sai
echo ""
echo "Test 2: Invalid token..."
curl -s -o /dev/null -w "Status: %{http_code}\n" \
  "${API_URL}/events" \
  -H "Authorization: Bearer invalid.token.here"
# Kỳ vọng: 401 Unauthorized

# Test 3: Token hết hạn (dùng expired token)
echo ""
echo "Test 3: Expired token (cần tạo thủ công)..."
EXPIRED_TOKEN="eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."  # expired JWT
curl -s -o /dev/null -w "Status: %{http_code}\n" \
  "${API_URL}/events" \
  -H "Authorization: Bearer $EXPIRED_TOKEN"
# Kỳ vọng: 401 Unauthorized

# Test 4: JWT Algorithm Confusion (None algorithm)
echo ""
echo "Test 4: JWT algorithm none attack..."
# Tạo JWT với alg=none (công cụ: jwt_tool)
# pip install jwt_tool
# python3 jwt_tool.py <token> -X a
# Kỳ vọng: 401 (Cognito từ chối alg=none)

# Test 5: Truy cập resource của user khác
echo ""
echo "Test 5: Horizontal privilege escalation..."
MY_TOKEN="your-token-for-user-A"
USER_B_RESOURCE="/events/EVENT_OWNED_BY_USER_B"
curl -s -o /dev/null -w "Status: %{http_code}\n" \
  "${API_URL}${USER_B_RESOURCE}" \
  -H "Authorization: Bearer $MY_TOKEN"
# Kỳ vọng: 403 Forbidden
```

---

## Phần 2: IAM Policy Testing

### 2.1 AWS IAM Policy Simulator

```bash
#!/bin/bash
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
REGION="us-east-1"

echo "=== IAM Policy Testing với Policy Simulator ==="

# Test Lambda role chỉ có quyền cần thiết
LAMBDA_ROLE="arn:aws:iam::${ACCOUNT_ID}:role/getEventsLambdaRole"
TABLE_ARN="arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/EventsTable"

echo "--- Kiểm tra permissions Lambda nên có ---"

# Phải có: dynamodb:Query trên EventsTable
aws iam simulate-principal-policy \
  --policy-source-arn $LAMBDA_ROLE \
  --action-names dynamodb:Query \
  --resource-arns $TABLE_ARN \
  --query 'EvaluationResults[*].{Action:EvalActionName,Decision:EvalDecision}' \
  --output table

# Phải có: logs:CreateLogGroup
aws iam simulate-principal-policy \
  --policy-source-arn $LAMBDA_ROLE \
  --action-names logs:CreateLogGroup \
  --resource-arns "arn:aws:logs:${REGION}:${ACCOUNT_ID}:*" \
  --query 'EvaluationResults[*].{Action:EvalActionName,Decision:EvalDecision}' \
  --output table

echo ""
echo "--- Kiểm tra permissions Lambda KHÔNG nên có ---"

# Không được có: dynamodb:DeleteTable
aws iam simulate-principal-policy \
  --policy-source-arn $LAMBDA_ROLE \
  --action-names dynamodb:DeleteTable \
  --resource-arns $TABLE_ARN \
  --query 'EvaluationResults[*].{Action:EvalActionName,Decision:EvalDecision}' \
  --output table

# Không được có: iam:CreateUser
aws iam simulate-principal-policy \
  --policy-source-arn $LAMBDA_ROLE \
  --action-names iam:CreateUser \
  --resource-arns "*" \
  --query 'EvaluationResults[*].{Action:EvalActionName,Decision:EvalDecision}' \
  --output table

# Không được có: s3:DeleteBucket
aws iam simulate-principal-policy \
  --policy-source-arn $LAMBDA_ROLE \
  --action-names s3:DeleteBucket \
  --resource-arns "arn:aws:s3:::*" \
  --query 'EvaluationResults[*].{Action:EvalActionName,Decision:EvalDecision}' \
  --output table
```

### 2.2 Script Kiểm Tra IAM Tự Động

```python
#!/usr/bin/env python3
# iam-policy-checker.py
# Kiểm tra tất cả Lambda roles có đúng Least Privilege không

import boto3
import json

iam = boto3.client('iam')
sts = boto3.client('sts')

ACCOUNT_ID = sts.get_caller_identity()['Account']
REGION = 'us-east-1'

# Danh sách permissions KHÔNG nên có ở Lambda roles
DANGEROUS_PERMISSIONS = [
    'iam:*',
    'iam:CreateUser',
    'iam:CreateAccessKey',
    'iam:AttachRolePolicy',
    'iam:CreatePolicy',
    's3:DeleteBucket',
    'dynamodb:DeleteTable',
    'cloudformation:DeleteStack',
    'ec2:*',
    '*:*',
]

def get_lambda_roles():
    """Lấy danh sách IAM roles của Lambda functions"""
    lambda_client = boto3.client('lambda')
    functions = lambda_client.list_functions()['Functions']
    roles = set()
    for func in functions:
        role_arn = func['Role']
        role_name = role_arn.split('/')[-1]
        roles.add(role_name)
    return roles

def check_role_permissions(role_name):
    """Kiểm tra role có permission nguy hiểm không"""
    issues = []
    
    # Lấy inline policies
    inline_policies = iam.list_role_policies(RoleName=role_name)['PolicyNames']
    for policy_name in inline_policies:
        policy = iam.get_role_policy(RoleName=role_name, PolicyName=policy_name)
        policy_doc = policy['PolicyDocument']
        issues.extend(check_policy_document(policy_doc, f"{role_name}/{policy_name}"))
    
    # Lấy attached policies
    attached_policies = iam.list_attached_role_policies(RoleName=role_name)['AttachedPolicies']
    for policy in attached_policies:
        # Bỏ qua AWS managed policies phổ biến
        if policy['PolicyArn'].startswith('arn:aws:iam::aws:policy/service-role/'):
            continue
        
        # Kiểm tra các policy khác
        version = iam.get_policy(PolicyArn=policy['PolicyArn'])['Policy']['DefaultVersionId']
        policy_doc = iam.get_policy_version(
            PolicyArn=policy['PolicyArn'],
            VersionId=version
        )['PolicyVersion']['Document']
        
        issues.extend(check_policy_document(policy_doc, policy['PolicyName']))
    
    return issues

def check_policy_document(policy_doc, policy_name):
    """Kiểm tra policy document có permissions nguy hiểm"""
    issues = []
    
    for statement in policy_doc.get('Statement', []):
        if statement.get('Effect') != 'Allow':
            continue
        
        actions = statement.get('Action', [])
        if isinstance(actions, str):
            actions = [actions]
        
        for action in actions:
            for dangerous in DANGEROUS_PERMISSIONS:
                if action == dangerous or (dangerous == '*:*' and action == '*'):
                    issues.append({
                        'policy': policy_name,
                        'action': action,
                        'severity': 'HIGH' if 'iam:' in action or action == '*:*' else 'MEDIUM',
                    })
    
    return issues

def main():
    print("=== IAM Policy Security Check ===\n")
    
    roles = get_lambda_roles()
    total_issues = []
    
    for role_name in roles:
        print(f"Checking: {role_name}")
        issues = check_role_permissions(role_name)
        
        if issues:
            print(f"  ❌ {len(issues)} vấn đề phát hiện:")
            for issue in issues:
                severity_emoji = "🔴" if issue['severity'] == 'HIGH' else "🟡"
                print(f"    {severity_emoji} [{issue['severity']}] {issue['action']} trong {issue['policy']}")
            total_issues.extend(issues)
        else:
            print(f"  ✅ OK")
    
    print(f"\n=== KẾT QUẢ ===")
    print(f"Roles kiểm tra: {len(roles)}")
    print(f"Vấn đề phát hiện: {len(total_issues)}")
    
    high_severity = [i for i in total_issues if i['severity'] == 'HIGH']
    if high_severity:
        print(f"\n🔴 {len(high_severity)} vấn đề HIGH severity cần xử lý ngay!")
        return 1
    
    return 0

if __name__ == '__main__':
    exit(main())
```

```bash
# Chạy IAM checker
python3 iam-policy-checker.py
```

---

## Phần 3: Penetration Testing API Gateway

### 3.1 Test Rate Limiting

```bash
#!/bin/bash
API_URL="https://your-api-id.execute-api.us-east-1.amazonaws.com/dev"

echo "=== Test Rate Limiting ==="
echo "Gửi 100 requests trong 10 giây..."

SUCCESS=0
RATE_LIMITED=0
ERROR=0

for i in $(seq 1 100); do
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    --max-time 5 \
    "${API_URL}/events" 2>/dev/null)
  
  case $HTTP_CODE in
    200|401) SUCCESS=$((SUCCESS + 1)) ;;
    429) RATE_LIMITED=$((RATE_LIMITED + 1)) ;;
    *) ERROR=$((ERROR + 1)) ;;
  esac
  
  # Không sleep — tạo burst requests
done

echo "Results:"
echo "  Success (200/401): $SUCCESS"
echo "  Rate Limited (429): $RATE_LIMITED"
echo "  Errors: $ERROR"

if [ $RATE_LIMITED -eq 0 ]; then
  echo "⚠️ Không có rate limiting — cần cấu hình API Gateway throttling"
else
  echo "✅ Rate limiting hoạt động ($RATE_LIMITED requests bị chặn)"
fi
```

### 3.2 Test Security Headers

```bash
#!/bin/bash
CLOUDFRONT_URL="https://your-distribution.cloudfront.net"
API_URL="https://your-api-id.execute-api.us-east-1.amazonaws.com/dev"

echo "=== Kiểm Tra Security Headers ==="

check_headers() {
  local URL=$1
  local NAME=$2
  
  echo ""
  echo "--- $NAME ($URL) ---"
  
  HEADERS=$(curl -sI --max-time 10 "$URL" 2>/dev/null)
  
  # Kiểm tra từng security header
  check_header() {
    local HEADER=$1
    local EXPECTED=$2
    if echo "$HEADERS" | grep -qi "^${HEADER}:"; then
      VALUE=$(echo "$HEADERS" | grep -i "^${HEADER}:" | head -1)
      echo "✅ $HEADER: $VALUE"
    else
      echo "❌ THIẾU $HEADER${EXPECTED:+ (cần: $EXPECTED)}"
    fi
  }
  
  check_header "Strict-Transport-Security" "max-age=31536000"
  check_header "X-Content-Type-Options" "nosniff"
  check_header "X-Frame-Options" "DENY"
  check_header "X-XSS-Protection" "1; mode=block"
  check_header "Content-Security-Policy"
  check_header "Referrer-Policy"
  check_header "Permissions-Policy"
}

check_headers "$CLOUDFRONT_URL" "CloudFront (Frontend)"
check_headers "$API_URL/events" "API Gateway"

echo ""
echo "=== Kiểm tra không leak thông tin nhạy cảm ==="
HEADERS=$(curl -sI --max-time 10 "$API_URL/events" 2>/dev/null)
if echo "$HEADERS" | grep -qi "X-Powered-By:\|Server: Apache\|Server: nginx"; then
  echo "❌ Headers tiết lộ server technology"
else
  echo "✅ Server headers không leak technology info"
fi
```

---

## Phần 4: AWS Security Hub

### 4.1 Bật và Cấu Hình Security Hub

```bash
#!/bin/bash
REGION="us-east-1"

echo "=== Bật AWS Security Hub ==="

# Bật Security Hub (30 ngày miễn phí)
aws securityhub enable-security-hub \
  --enable-default-standards \
  --region $REGION

echo "✅ Security Hub đã bật (30 ngày miễn phí)"
echo "⚠️ Sau 30 ngày: $0.0010/finding/month"

# Bật các standards
echo ""
echo "=== Bật AWS Security Standards ==="

# AWS Foundational Security Best Practices
aws securityhub batch-enable-standards \
  --standards-subscription-requests \
    "StandardsArn=arn:aws:securityhub:${REGION}::standards/aws-foundational-security-best-practices/v/1.0.0" \
    "StandardsArn=arn:aws:securityhub:${REGION}::standards/cis-aws-foundations-benchmark/v/1.2.0"

echo "✅ Standards đã bật"
```

### 4.2 Lấy và Phân Tích Findings

```bash
#!/bin/bash
REGION="us-east-1"

echo "=== Security Hub Findings ==="

# Lấy CRITICAL findings
echo "--- CRITICAL Findings ---"
aws securityhub get-findings \
  --filters '{
    "SeverityLabel": [{"Value": "CRITICAL", "Comparison": "EQUALS"}],
    "WorkflowStatus": [{"Value": "NEW", "Comparison": "EQUALS"}],
    "RecordState": [{"Value": "ACTIVE", "Comparison": "EQUALS"}]
  }' \
  --query 'Findings[*].{
    Title:Title,
    Severity:Severity.Label,
    Service:Resources[0].Type,
    ResourceId:Resources[0].Id,
    Remediation:Remediation.Recommendation.Text
  }' \
  --output table \
  --region $REGION

# Lấy HIGH findings
echo ""
echo "--- HIGH Findings ---"
aws securityhub get-findings \
  --filters '{
    "SeverityLabel": [{"Value": "HIGH", "Comparison": "EQUALS"}],
    "WorkflowStatus": [{"Value": "NEW", "Comparison": "EQUALS"}]
  }' \
  --query 'Findings[*].{Title:Title,Remediation:Remediation.Recommendation.Text}' \
  --output table \
  --region $REGION

# Summary
echo ""
echo "--- Summary ---"
aws securityhub get-insights \
  --insight-arns "arn:aws:securityhub:::insight/securityhub/default/1" \
  --region $REGION \
  2>/dev/null || echo "Dùng findings count thay:"

aws securityhub get-findings \
  --filters '{
    "WorkflowStatus": [{"Value": "NEW", "Comparison": "EQUALS"}],
    "RecordState": [{"Value": "ACTIVE", "Comparison": "EQUALS"}]
  }' \
  --query 'length(Findings)' \
  --output text \
  --region $REGION
```

### 4.3 Remediation Tự Động

```python
#!/usr/bin/env python3
# auto-remediate.py
# Tự động fix một số security findings phổ biến

import boto3

securityhub = boto3.client('securityhub')
s3 = boto3.client('s3')
ec2 = boto3.client('ec2')

def remediate_s3_public_access(resource_id):
    """Bật S3 Block Public Access nếu chưa bật"""
    bucket_name = resource_id.split(':::')[1] if ':::' in resource_id else resource_id
    
    try:
        s3.put_public_access_block(
            Bucket=bucket_name,
            PublicAccessBlockConfiguration={
                'BlockPublicAcls': True,
                'IgnorePublicAcls': True,
                'BlockPublicPolicy': True,
                'RestrictPublicBuckets': True,
            }
        )
        print(f"✅ Fixed: S3 public access blocked for {bucket_name}")
        return True
    except Exception as e:
        print(f"❌ Failed to fix {bucket_name}: {e}")
        return False

def get_actionable_findings():
    """Lấy findings có thể auto-remediate"""
    findings = securityhub.get_findings(
        Filters={
            'SeverityLabel': [{'Value': 'HIGH', 'Comparison': 'EQUALS'}],
            'WorkflowStatus': [{'Value': 'NEW', 'Comparison': 'EQUALS'}],
            'RecordState': [{'Value': 'ACTIVE', 'Comparison': 'EQUALS'}],
        }
    )['Findings']
    
    return findings

def main():
    print("=== Auto Remediation Script ===\n")
    findings = get_actionable_findings()
    print(f"Tìm thấy {len(findings)} HIGH findings\n")
    
    remediated = 0
    for finding in findings:
        title = finding.get('Title', '')
        resources = finding.get('Resources', [])
        
        if not resources:
            continue
            
        resource_type = resources[0].get('Type', '')
        resource_id = resources[0].get('Id', '')
        
        print(f"Finding: {title}")
        print(f"Resource: {resource_type} - {resource_id[:50]}")
        
        # Auto-fix S3 public access
        if 'S3.2' in finding.get('GeneratorId', '') or \
           'S3 buckets should prohibit public access' in title:
            if remediate_s3_public_access(resource_id):
                remediated += 1
        else:
            print(f"  ⏭️  Manual review cần thiết")
        
        print()
    
    print(f"\n=== Kết quả: {remediated}/{len(findings)} findings đã fix ===")

if __name__ == '__main__':
    main()
```

```bash
# Chạy auto-remediation (cẩn thận — review code trước)
python3 auto-remediate.py
```

---

## Bảng Tóm Tắt Kiểm Thử

| Loại Test | Công Cụ | Tần Suất | Thời Gian |
|-----------|---------|----------|-----------|
| OWASP ZAP Baseline | ZAP Docker | Mỗi PR | ~10 phút |
| IAM Policy Check | Python script | Hàng tuần | ~2 phút |
| Security Headers | curl script | Hàng ngày | ~1 phút |
| Rate Limit Test | curl bash | Trước release | ~1 phút |
| Security Hub Review | AWS Console | Hàng tuần | ~15 phút |
| npm audit | npm | Mỗi commit | ~1 phút |

---

## Lưu ý

> ⚠️ **AWS Penetration Testing Policy**: Được phép test API Gateway, Lambda, DynamoDB của chính mình. **KHÔNG** được test CloudFront, Route 53, WAF endpoint trực tiếp mà không xin phép AWS.

> 💡 **Tip**: Tích hợp security scan vào CI/CD pipeline (xem `cicd-pipeline.md`) để tự động phát hiện vấn đề mỗi khi có code change.




## Bước tiếp theo

- [Fix issues với security hardening](../../security/how-to/security-hardening.md)
- [Tích hợp scan vào CI/CD](../../infrastructure/how-to/cicd-pipeline.md)

## Tài liệu liên quan

- [Security Hardening](../../security/how-to/security-hardening.md)
- [WAF Configuration](../../security/how-to/waf-configuration.md)
- [IAM Policies](../../security/reference/iam-policies.md)

---

**Metadata**:
- **Requirements**: Requirement 12, Requirement 16, Requirement 17, Requirement 18
- **Category**: How-To
- **Domain**: Testing
- **Difficulty**: Khó
- **Estimated Reading/Implementation Time**: 2.5 giờ
- **Last Updated**: 2026-06-12