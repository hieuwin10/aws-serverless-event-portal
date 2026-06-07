# AWS Well-Architected Assessment Report

**Dự án**: AWS Serverless Event Portal  
**Ngày đánh giá**: 02/06/2026  
**Phiên bản**: 1.0  
**Kiến trúc hiện tại**: CloudFront + S3 (Frontend) → Cognito (Auth) → API Gateway → Lambda → DynamoDB + CloudWatch

---

## Tóm Tắt Điều Hành

Hệ thống được đánh giá theo **5 trụ cột AWS Well-Architected Framework**. Đây là kiến trúc serverless tốt về bản chất nhưng còn nhiều điểm cần cải thiện, đặc biệt về **Security** và **Operational Excellence**.

### Risk Summary Matrix

| Trụ Cột | Risk Tổng Thể | High Issues | Medium Issues | Low Issues |
|---------|--------------|-------------|---------------|------------|
| 🔴 Security | **HIGH** | 5 | 3 | 2 |
| 🟡 Reliability | **MEDIUM** | 3 | 3 | 2 |
| 🟡 Performance Efficiency | **MEDIUM** | 2 | 3 | 2 |
| 🟡 Cost Optimization | **MEDIUM** | 2 | 3 | 2 |
| 🟠 Operational Excellence | **HIGH** | 3 | 3 | 1 |

**Tổng số vấn đề**: 15 HIGH, 15 MEDIUM, 9 LOW

---

## Trụ Cột 1: Security (Bảo Mật)

**Risk tổng thể: 🔴 HIGH**

### Vấn Đề HIGH Risk

#### SEC-01: IAM Policies Quá Rộng
- **Risk**: 🔴 HIGH
- **Tình trạng hiện tại**: Lambda functions sử dụng `dynamodb:*` thay vì chỉ các actions cần thiết. Một số roles có `*` trong Resource.
- **Tác động**: Nếu Lambda bị compromise, attacker có thể xóa toàn bộ data hoặc access các resources khác.
- **Khuyến nghị**: Áp dụng Least Privilege — chỉ cấp đúng permissions cần thiết cho từng function.
- **Hướng dẫn**: [iam-policies.md](security/reference/iam-policies.md)

```json
// ❌ Hiện tại — quá rộng
{
  "Action": "dynamodb:*",
  "Resource": "*"
}

// ✅ Nên làm — Least Privilege
{
  "Action": ["dynamodb:Query", "dynamodb:GetItem"],
  "Resource": "arn:aws:dynamodb:us-east-1:ACCOUNT:table/EventsTable"
}
```

#### SEC-02: Không Có WAF (Web Application Firewall)
- **Risk**: 🔴 HIGH
- **Tình trạng hiện tại**: API Gateway không có WAF protection. Không có rate limiting ở tầng WAF. DDoS attacks có thể tốn tiền và gây downtime.
- **Tác động**: SQL injection, XSS, brute force attacks không bị chặn ở tầng đầu tiên.
- **Khuyến nghị**: Deploy AWS WAF với rate limiting rules trước API Gateway.
- **Hướng dẫn**: [waf-configuration.md](security/how-to/waf-configuration.md)
- **⚠️ Chi phí**: WAF không có Free Tier — $5/month + $1/rule

#### SEC-03: Cognito Không Có MFA
- **Risk**: 🔴 HIGH
- **Trạng thái**: ✅ Đã giải quyết (Cấu hình `MfaConfiguration: OPTIONAL` trong `template.yaml`)
- **Tình trạng hiện tại**: Cognito User Pool không bật MFA. Password policy yếu (default settings).
- **Tác động**: Tài khoản dễ bị brute force, credential stuffing, account takeover.
- **Khuyến nghị**: Bật TOTP MFA (miễn phí), tăng cường password policy.
- **Hướng dẫn**: [cognito-advanced.md](security/how-to/cognito-advanced.md)

#### SEC-04: S3 Bucket Frontend Có Thể Bị Public Access
- **Risk**: 🔴 HIGH
- **Trạng thái**: ✅ Đã giải quyết (Cấu hình `PublicAccessBlockConfiguration` trong `template.yaml`)
- **Tình trạng hiện tại**: S3 bucket frontend chưa chắc đã block public access hoàn toàn. Nếu ai đó accidentally set bucket policy public, toàn bộ assets sẽ accessible.
- **Khuyến nghị**: Bật S3 Block Public Access ở account level và bucket level.
- **Hướng dẫn**: [security-hardening.md](security/how-to/security-hardening.md)

```bash
# Fix ngay
aws s3api put-public-access-block \
  --bucket YOUR-FRONTEND-BUCKET \
  --public-access-block-configuration \
    "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"
```

#### SEC-05: Thiếu Security Headers Trong CloudFront
- **Risk**: 🔴 HIGH
- **Tình trạng hiện tại**: CloudFront distribution không có Response Headers Policy. Không có HSTS, X-Content-Type-Options, CSP, hay X-Frame-Options.
- **Tác động**: Clickjacking attacks, MIME type sniffing, không có HTTPS enforcement.
- **Khuyến nghị**: Thêm CloudFront Response Headers Policy với security headers đầy đủ.
- **Hướng dẫn**: [security-hardening.md](security/how-to/security-hardening.md)

### Vấn Đề MEDIUM Risk

#### SEC-06: Thiếu Encryption At Rest Cho CloudWatch Logs
- **Risk**: 🟡 MEDIUM
- **Khuyến nghị**: Bật KMS encryption cho CloudWatch Log Groups.

#### SEC-07: Không Có VPC Cho Lambda
- **Risk**: 🟡 MEDIUM
- **Tình trạng**: Lambda chạy trong AWS public VPC, không isolate về mặt network.
- **Khuyến nghị**: Nếu Lambda cần access internal resources, deploy trong VPC. Không bắt buộc với serverless architecture hiện tại.

#### SEC-08: Thiếu AWS Config Rules
- **Risk**: 🟡 MEDIUM
- **Khuyến nghị**: Bật AWS Config để detect configuration drift tự động.

---

## Trụ Cột 2: Reliability (Độ Tin Cậy)

**Risk tổng thể: 🟡 MEDIUM**

### Vấn Đề HIGH Risk

#### REL-01: DynamoDB Dùng Provisioned Capacity Không Có Auto-Scaling
- **Risk**: 🔴 HIGH
- **Tình trạng hiện tại**: DynamoDB table dùng Provisioned Capacity với WCU/RCU cố định. Không có Application Auto Scaling.
- **Tác động**: Traffic đột biến → ProvisionedThroughputExceededException → 500 errors cho users.
- **Khuyến nghị**: Chuyển sang On-Demand mode hoặc bật Auto Scaling.
- **Hướng dẫn**: [scalability-design.md](architecture/explanation/scalability-design.md)

```bash
# Fix nhanh: Chuyển sang On-Demand
aws dynamodb update-table \
  --table-name EventsTable \
  --billing-mode PAY_PER_REQUEST
```

#### REL-02: Không Có Multi-Region Backup
- **Risk**: 🔴 HIGH
- **Tình trạng**: Tất cả data chỉ ở 1 region. Nếu region us-east-1 có outage, không có failover.
- **Khuyến nghị**: Enable DynamoDB Global Tables hoặc cross-region backup. Với Free Tier, ít nhất bật PITR.
- **Hướng dẫn**: [backup-recovery.md](operations/how-to/backup-recovery.md)

#### REL-03: Không Có Health Checks Tự Động
- **Risk**: 🔴 HIGH
- **Tình trạng**: Không có automated health check endpoint. Không có CloudWatch Synthetic Canary.
- **Khuyến nghị**: Tạo `/health` endpoint trong API Gateway. Bật CloudWatch Synthetic Canary.
- **Hướng dẫn**: [monitoring-alerting.md](operations/how-to/monitoring-alerting.md)

```typescript
// Thêm vào SAM template
// GET /health endpoint
export const healthCheck = async () => ({
  statusCode: 200,
  body: JSON.stringify({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    region: process.env.AWS_REGION,
  }),
});
```

### Vấn Đề MEDIUM Risk

#### REL-04: Thiếu Retry Logic Trong Lambda
- **Risk**: 🟡 MEDIUM
- **Tình trạng**: Lambda functions gọi DynamoDB nhưng không có exponential backoff khi bị throttle.
- **Khuyến nghị**: Dùng AWS SDK retry configuration hoặc implement custom retry với `@aws-sdk/middleware-retry`.

#### REL-05: Thiếu Dead Letter Queue
- **Risk**: 🟡 MEDIUM
- **Tình trạng**: Lambda không có DLQ. Failed async invocations sẽ bị mất.
- **Khuyến nghị**: Bật DLQ (SQS) cho tất cả Lambda functions dùng async invocation.

#### REL-06: Không Có Circuit Breaker
- **Risk**: 🟡 MEDIUM
- **Tình trạng**: Không có circuit breaker pattern. Khi DynamoDB chậm, Lambda sẽ timeout thay vì fail fast.
- **Khuyến nghị**: Implement circuit breaker với AWS Parameter Store để toggle.

---

## Trụ Cột 3: Performance Efficiency (Hiệu Năng)

**Risk tổng thể: 🟡 MEDIUM**

### Vấn Đề HIGH Risk

#### PERF-01: Lambda Cold Start Ảnh Hưởng Latency
- **Risk**: 🔴 HIGH
- **Tình trạng**: Lambda functions chưa có Provisioned Concurrency. Cold start thêm 500ms–2s vào response time.
- **Tác động**: p99 latency cao, user experience xấu khi traffic thấp (cold start thường xuyên).
- **Khuyến nghị**: Bật Provisioned Concurrency cho prod, dùng Lambda Warming cho dev.
- **Hướng dẫn**: [scalability-design.md](architecture/explanation/scalability-design.md)

```yaml
# SAM template — Provisioned Concurrency
GetEventsFunction:
  Type: AWS::Serverless::Function
  Properties:
    AutoPublishAlias: prod
    ProvisionedConcurrencyConfig:
      ProvisionedConcurrentExecutions: 3
```

#### PERF-02: Không Tối Ưu DynamoDB Queries
- **Risk**: 🔴 HIGH
- **Tình trạng**: Một số queries dùng Scan thay vì Query. Không có Global Secondary Index cho các access patterns phổ biến.
- **Khuyến nghị**: Review tất cả DynamoDB access patterns, thêm GSI cần thiết, dùng Query thay vì Scan.

### Vấn Đề MEDIUM Risk

#### PERF-03: Thiếu CloudFront Caching Optimization
- **Risk**: 🟡 MEDIUM
- **Tình trạng**: CloudFront cache settings chưa tối ưu. Static assets không có cache headers đúng.
- **Khuyến nghị**: Cấu hình Cache-Control headers: `max-age=31536000` cho assets có hash, `no-cache` cho HTML.

#### PERF-04: Thiếu API Gateway Caching
- **Risk**: 🟡 MEDIUM
- **Tình trạng**: API Gateway không bật caching cho các read-heavy endpoints.
- **Khuyến nghị**: Bật API Gateway Stage Cache cho `GET /events` (TTL: 30s). **Tốn phí** — không có Free Tier.

#### PERF-05: Lambda Memory Chưa Được Tune
- **Risk**: 🟡 MEDIUM
- **Tình trạng**: Tất cả Lambda functions dùng 128 MB default. Memory thấp → CPU thấp → execution chậm hơn.
- **Khuyến nghị**: Dùng [AWS Lambda Power Tuning](https://github.com/alexcasalboni/aws-lambda-power-tuning) để tìm memory size tối ưu về chi phí/performance.

---

## Trụ Cột 4: Cost Optimization (Tối Ưu Chi Phí)

**Risk tổng thể: 🟡 MEDIUM**

### Vấn Đề HIGH Risk

#### COST-01: Không Có Cost Monitoring
- **Risk**: 🔴 HIGH
- **Trạng thái**: ✅ Đã giải quyết (Thêm `AWS::CloudWatch::Alarm` vào `template.yaml`)
- **Tình trạng**: Không có Billing Alarms. Không theo dõi chi phí theo service. Có thể bị "bill shock" nếu traffic tăng đột biến.
- **Khuyến nghị**: Bật CloudWatch Billing Alarm, thiết lập AWS Budgets.
- **Hướng dẫn**: [cost-optimization.md](operations/how-to/cost-optimization.md)

```bash
# Fix ngay: Tạo billing alarm
aws cloudwatch put-metric-alarm \
  --alarm-name "AWS-Billing-Alert" \
  --namespace AWS/Billing \
  --metric-name EstimatedCharges \
  --dimensions Name=Currency,Value=USD \
  --statistic Maximum \
  --period 86400 \
  --threshold 10 \
  --comparison-operator GreaterThanThreshold \
  --alarm-actions YOUR-SNS-TOPIC-ARN \
  --region us-east-1
```

#### COST-02: CloudWatch Log Retention Không Giới Hạn
- **Risk**: 🔴 HIGH
- **Trạng thái**: ✅ Đã giải quyết (Thêm `RetentionInDays: 7` vào các `LogGroup` trong `template.yaml`)
- **Tình trạng**: Lambda Log Groups không có retention policy. Logs tích lũy vĩnh viễn → tốn tiền khi vượt 5 GB Free Tier.
- **Khuyến nghị**: Set retention 7 ngày cho dev, 30 ngày cho prod.

```bash
# Fix: Set retention cho tất cả Lambda log groups
for FUNCTION in getEvents createEvent updateEvent deleteEvent registerEvent; do
  aws logs put-retention-policy \
    --log-group-name "/aws/lambda/$FUNCTION" \
    --retention-in-days 7
done
```

### Vấn Đề MEDIUM Risk

#### COST-03: Lambda Memory 128MB Có Thể Không Tối Ưu
- **Risk**: 🟡 MEDIUM
- **Tình trạng**: 128 MB có thể chạy chậm, tăng execution duration, dẫn đến chi phí cao hơn tổng thể.
- **Khuyến nghị**: Test với 256 MB — thường rẻ hơn vì thời gian chạy ngắn hơn.

#### COST-04: Không Có S3 Lifecycle Policies
- **Risk**: 🟡 MEDIUM
- **Tình trạng**: S3 không có lifecycle rules. Old versions tích lũy (nếu versioning bật).
- **Hướng dẫn**: [backup-recovery.md](operations/how-to/backup-recovery.md)

#### COST-05: DynamoDB Provisioned Capacity Lãng Phí
- **Risk**: 🟡 MEDIUM
- **Tình trạng**: DynamoDB WCU/RCU cố định ngay cả khi không có traffic.
- **Khuyến nghị**: Chuyển sang On-Demand cho dev. Provisioned + Auto Scaling cho prod.

---

## Trụ Cột 5: Operational Excellence (Vận Hành Xuất Sắc)

**Risk tổng thể: 🟠 HIGH**

### Vấn Đề HIGH Risk

#### OPS-01: Thiếu Comprehensive Monitoring
- **Risk**: 🔴 HIGH
- **Trạng thái**: ✅ Đã giải quyết (Thêm Alarms cơ bản vào `template.yaml`)
- **Tình trạng**: Chỉ dùng default Lambda metrics. Không có CloudWatch Alarms. Không có Dashboard. Không biết khi nào có vấn đề.
- **Tác động**: Sự cố có thể kéo dài nhiều giờ trước khi phát hiện.
- **Khuyến nghị**: Thiết lập 10 CloudWatch Alarms quan trọng, Dashboard, SNS notifications.
- **Hướng dẫn**: [monitoring-alerting.md](operations/how-to/monitoring-alerting.md)

#### OPS-02: Không Có Automated Deployment (CI/CD)
- **Risk**: 🔴 HIGH
- **Tình trạng**: Deploy thủ công → không nhất quán, không có automated testing trước khi deploy, không có rollback tự động.
- **Tác động**: Lỗi được đưa lên production, downtime dài khi cần rollback.
- **Khuyến nghị**: Thiết lập GitHub Actions pipeline với security scan + testing + blue-green deploy.
- **Hướng dẫn**: [cicd-pipeline.md](infrastructure/how-to/cicd-pipeline.md)

#### OPS-03: Không Có Runbooks
- **Risk**: 🔴 HIGH
- **Tình trạng**: Không có tài liệu hướng dẫn xử lý sự cố. Khi có incident, team phải improvise.
- **Tác động**: Thời gian giải quyết sự cố (MTTR) cao. Xử lý không nhất quán.
- **Khuyến nghị**: Tạo runbooks cho các tình huống thường gặp.
- **Hướng dẫn**: [runbooks.md](operations/reference/runbooks.md)

### Vấn Đề MEDIUM Risk

#### OPS-04: Thiếu Distributed Tracing
- **Risk**: 🟡 MEDIUM
- **Tình trạng**: AWS X-Ray chưa được bật. Khó trace request qua CloudFront → API Gateway → Lambda → DynamoDB.
- **Khuyến nghị**: Bật X-Ray tracing cho API Gateway và Lambda.

```yaml
# SAM template
Globals:
  Function:
    Tracing: Active
  Api:
    TracingEnabled: true
```

#### OPS-05: Không Có Structured Logging
- **Risk**: 🟡 MEDIUM
- **Tình trạng**: Lambda logs là plain text, khó search và analyze.
- **Khuyến nghị**: Dùng structured JSON logging.

```typescript
// Thay vì console.log("User logged in")
console.log(JSON.stringify({
  level: 'info',
  event: 'user_login',
  userId: event.userId,
  timestamp: new Date().toISOString(),
  requestId: context.awsRequestId,
}));
```

#### OPS-06: Không Có Change Management Process
- **Risk**: 🟡 MEDIUM
- **Tình trạng**: Không có review process trước khi deploy. Không có approval workflow cho production changes.
- **Khuyến nghị**: Bật GitHub branch protection rules, require PR reviews.

---

## Priority Matrix — Thứ Tự Xử Lý

### 🚨 Ưu Tiên 1 — Xử Lý Ngay (Tuần 1)

| # | Vấn Đề | Effort | Impact | Trạng Thái / Lệnh |
|---|---------|--------|--------|-------------|
| 1 | Billing Alarm (COST-01) | 5 phút | Tránh bill shock | ✅ Đã giải quyết (Trong `template.yaml`) |
| 2 | S3 Block Public Access (SEC-04) | 5 phút | Ngăn data breach | ✅ Đã giải quyết (Trong `template.yaml`) |
| 3 | Log Retention (COST-02) | 10 phút | Tiết kiệm chi phí | ✅ Đã giải quyết (Trong `template.yaml`) |
| 4 | CloudWatch Alarms (OPS-01) | 1 giờ | Phát hiện sự cố sớm | ✅ Đã giải quyết (Trong `template.yaml`) |
| 5 | Cognito MFA (SEC-03) | 2 giờ | Bảo mật tài khoản | ✅ Đã giải quyết (Trong `template.yaml`) |

### 🟠 Ưu Tiên 2 — Xử Lý Trong Tháng 1

| # | Vấn Đề | Effort | Impact |
|---|---------|--------|--------|
| 6 | IAM Least Privilege (SEC-01) | 1 ngày | Giảm blast radius |
| 7 | DynamoDB On-Demand (REL-01) | 30 phút | Tránh throttling |
| 8 | Security Headers CloudFront (SEC-05) | 2 giờ | Bảo mật frontend |
| 9 | PITR Backup (REL-02) | 1 giờ | Bảo vệ data |
| 10 | CI/CD Pipeline (OPS-02) | 2 ngày | Automated deployment |

### 🟡 Ưu Tiên 3 — Cải Thiện Dần (Quý 1)

| # | Vấn Đề | Effort | Impact |
|---|---------|--------|--------|
| 11 | WAF (SEC-02) | 1 ngày | Bảo vệ API (có chi phí) |
| 12 | Lambda Memory Tuning (PERF-05) | 1 ngày | Performance + cost |
| 13 | Provisioned Concurrency (PERF-01) | 2 giờ | Giảm cold start (có chi phí) |
| 14 | X-Ray Tracing (OPS-04) | 2 giờ | Better observability |
| 15 | Structured Logging (OPS-05) | 2 ngày | Easier debugging |

---

## Kế Hoạch Cải Thiện 90 Ngày

```
Tuần 1-2:  Quick wins — Billing, S3 security, Log retention, CloudWatch Alarms
Tuần 3-4:  Security — Cognito MFA, IAM Least Privilege, Security Headers
Tuần 5-6:  Reliability — DynamoDB scaling, PITR Backup, Health Checks
Tuần 7-8:  Operations — CI/CD Pipeline, Runbooks, Monitoring Dashboard
Tuần 9-10: Performance — Lambda tuning, CloudFront optimization
Tuần 11-12: Testing — Load tests, Security tests, Chaos engineering
```

---

## Điểm Số Tổng Thể

| Trụ Cột | Điểm Hiện Tại | Điểm Sau Cải Thiện |
|---------|--------------|-------------------|
| Security | 3/10 | 8/10 |
| Reliability | 5/10 | 8/10 |
| Performance | 5/10 | 8/10 |
| Cost Optimization | 5/10 | 9/10 |
| Operational Excellence | 3/10 | 8/10 |
| **Tổng** | **4.2/10** | **8.2/10** |

---

## Tài Liệu Liên Quan

| Trụ Cột | Tài Liệu |
|---------|---------|
| Security | [security-hardening.md](security/how-to/security-hardening.md) · [iam-policies.md](security/reference/iam-policies.md) · [waf-configuration.md](security/how-to/waf-configuration.md) · [cognito-advanced.md](security/how-to/cognito-advanced.md) |
| Reliability | [backup-recovery.md](operations/how-to/backup-recovery.md) · [scalability-design.md](architecture/explanation/scalability-design.md) · [runbooks.md](operations/reference/runbooks.md) |
| Performance | [scalability-design.md](architecture/explanation/scalability-design.md) · [cloudformation-templates.md](infrastructure/reference/cloudformation-templates.md) |
| Cost | [cost-optimization.md](operations/how-to/cost-optimization.md) · [backup-recovery.md](operations/how-to/backup-recovery.md) |
| Operations | [monitoring-alerting.md](operations/how-to/monitoring-alerting.md) · [runbooks.md](operations/reference/runbooks.md) · [cicd-pipeline.md](infrastructure/how-to/cicd-pipeline.md) |
| Testing | [load-testing.md](testing/how-to/load-testing.md) · [security-testing.md](testing/how-to/security-testing.md) · [chaos-engineering.md](testing/how-to/chaos-engineering.md) |

---

*Báo cáo này được tạo theo AWS Well-Architected Framework. Để đánh giá chính thức, dùng [AWS Well-Architected Tool](https://console.aws.amazon.com/wellarchitected/) trong AWS Console (miễn phí).*
