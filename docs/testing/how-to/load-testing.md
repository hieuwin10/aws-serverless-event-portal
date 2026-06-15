---
title: "Kiểm Thử Tải với Artillery và k6"
category: How-To
domain: Testing
difficulty: Trung bình
reading_time: 1.5 giờ
last_updated: 2026-06-12
tags: [load-testing, artillery, k6, performance]
requirements: [Requirement 11, Requirement 16, Requirement 18]
---
***
*Breadcrumbs: [Trang chủ Well-Architected](../../README.md) > [Chỉ mục](../../index.md) > [Testing](../../index.md#testing) > How-To*
***

# Kiểm Thử Tải với Artillery và k6

## Vấn đề

Không biết hệ thống chịu được bao nhiêu concurrent users:
- **Không có baseline performance** — không biết đâu là điểm giới hạn
- **Lambda cold start** ảnh hưởng response time nhưng chưa đo lường
- **DynamoDB throttling** có thể xảy ra khi traffic tăng đột biến
- **API Gateway throttling** chưa được cấu hình phù hợp
- **Không có test scenarios** cho các API endpoints thực tế

## Giải pháp

Load testing với 2 công cụ:
- **Artillery** — dễ cấu hình bằng YAML, phù hợp cho API testing
- **k6** — scripting mạnh hơn, metrics chi tiết, có thể tích hợp CI/CD

## Điều kiện tiên quyết

```bash
# Cài Artillery
npm install -g artillery@latest

# Cài k6 (Windows)
winget install k6 --source winget

# Hoặc k6 (Linux/Mac)
brew install k6
# hoặc
sudo apt-get install k6

# Verify
artillery --version
k6 version
```

> 💰 **Free Tier**: Load testing chạy từ local machine không tốn phí thêm. Chỉ tốn chi phí của Lambda/DynamoDB bị gọi — nằm trong Free Tier nếu test nhẹ. Tránh chạy test heavy trên tài khoản Free Tier.

> ⚠️ **CẢNH BÁO**: Luôn test trên môi trường **dev/staging**, KHÔNG bao giờ load test trực tiếp trên production!

---

## Bước 1: Chuẩn Bị Môi Trường Test

```bash
#!/bin/bash
# Lấy API URL và Cognito info từ CloudFormation
STACK_NAME="event-portal-dev"

API_URL=$(aws cloudformation describe-stacks \
  --stack-name $STACK_NAME \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' \
  --output text)

USER_POOL_ID=$(aws cloudformation describe-stacks \
  --stack-name $STACK_NAME \
  --query 'Stacks[0].Outputs[?OutputKey==`UserPoolId`].OutputValue' \
  --output text)

CLIENT_ID=$(aws cloudformation describe-stacks \
  --stack-name $STACK_NAME \
  --query 'Stacks[0].Outputs[?OutputKey==`UserPoolClientId`].OutputValue' \
  --output text)

echo "API URL: $API_URL"
echo "User Pool ID: $USER_POOL_ID"
echo "Client ID: $CLIENT_ID"

# Lưu vào .env.test
cat > .env.test << EOF
API_URL=$API_URL
USER_POOL_ID=$USER_POOL_ID
CLIENT_ID=$CLIENT_ID
TEST_USERNAME=loadtest@example.com
TEST_PASSWORD=LoadTest123!@#
EOF

echo "Tạo test user trong Cognito..."
aws cognito-idp admin-create-user \
  --user-pool-id $USER_POOL_ID \
  --username "loadtest@example.com" \
  --temporary-password "Temp123!@#" \
  --user-attributes Name=email,Value=loadtest@example.com Name=email_verified,Value=true \
  2>/dev/null || echo "User đã tồn tại"

aws cognito-idp admin-set-user-password \
  --user-pool-id $USER_POOL_ID \
  --username "loadtest@example.com" \
  --password "LoadTest123!@#" \
  --permanent

echo "✅ Test user sẵn sàng"
```

---

## Bước 2: Artillery Test Scripts

### 2.1 Config cơ bản — Baseline Test

File: `tests/load/artillery-baseline.yaml`

```yaml
# artillery-baseline.yaml
# Mục tiêu: Xác định baseline performance khi có ít users

config:
  target: "{{ $processEnvironment.API_URL }}"
  phases:
    # Warm up — tránh cold start ảnh hưởng kết quả
    - name: "Warm Up"
      duration: 30       # 30 giây
      arrivalRate: 1     # 1 user/giây
    # Baseline — đo performance bình thường
    - name: "Baseline"
      duration: 120      # 2 phút
      arrivalRate: 5     # 5 users/giây
  
  defaults:
    headers:
      Content-Type: "application/json"
      Accept: "application/json"
  
  # Ngưỡng pass/fail
  ensure:
    thresholds:
      - http.response_time.p95: 2000   # p95 < 2 giây
      - http.response_time.p99: 5000   # p99 < 5 giây
      - http.codes.200: 95             # 95% requests thành công
  
  plugins:
    ensure: {}  # Bật ensure plugin

scenarios:
  - name: "Get Events (unauthenticated)"
    weight: 60  # 60% traffic
    flow:
      - get:
          url: "/events"
          expect:
            - statusCode: [200, 401]

  - name: "Get Single Event"
    weight: 30  # 30% traffic
    flow:
      - get:
          url: "/events/EVENT_ID_001"  # Thay bằng event ID thực
          expect:
            - statusCode: [200, 401, 404]

  - name: "Health Check"
    weight: 10  # 10% traffic
    flow:
      - get:
          url: "/health"
          expect:
            - statusCode: 200
```

### 2.2 Stress Test — Tìm Điểm Giới Hạn

File: `tests/load/artillery-stress.yaml`

```yaml
# artillery-stress.yaml
# Mục tiêu: Tìm điểm hệ thống bắt đầu bị lỗi

config:
  target: "{{ $processEnvironment.API_URL }}"
  phases:
    - name: "Ramp Up Chậm"
      duration: 60
      arrivalRate: 5
      rampTo: 20

    - name: "Sustained Load"
      duration: 120
      arrivalRate: 20

    - name: "Ramp Up Tiếp"
      duration: 60
      arrivalRate: 20
      rampTo: 50

    - name: "High Load"
      duration: 120
      arrivalRate: 50

    - name: "Peak Load"
      duration: 60
      arrivalRate: 50
      rampTo: 100

    - name: "Ramp Down"
      duration: 60
      arrivalRate: 100
      rampTo: 0

  plugins:
    ensure: {}

  ensure:
    thresholds:
      - http.response_time.p99: 10000  # p99 < 10 giây
      - http.codes.200: 90             # 90% thành công

  http:
    timeout: 30   # Timeout 30 giây

scenarios:
  - name: "Read Events"
    weight: 70
    flow:
      - get:
          url: "/events"
          qs:
            limit: "20"

  - name: "Read Single Event"
    weight: 20
    flow:
      - get:
          url: "/events/EVENT_ID_001"

  - name: "Register for Event (authenticated)"
    weight: 10
    flow:
      - post:
          url: "/events/EVENT_ID_001/register"
          headers:
            Authorization: "Bearer {{ $processEnvironment.TEST_TOKEN }}"
          json:
            userId: "user-{{ $randomNumber(1, 1000) }}"
          expect:
            - statusCode: [200, 201, 400, 401, 409]
```

### 2.3 Full Scenario Test

File: `tests/load/artillery-full.yaml`

```yaml
# artillery-full.yaml
# Mục tiêu: Test toàn bộ user journey

config:
  target: "{{ $processEnvironment.API_URL }}"
  phases:
    - name: "Normal Business Hours"
      duration: 300        # 5 phút
      arrivalRate: 10      # 10 users/giây (bình thường)

    - name: "Event Registration Rush"
      duration: 120        # 2 phút
      arrivalRate: 10
      rampTo: 50           # Tăng đột biến khi event bắt đầu nhận đăng ký

    - name: "Return to Normal"
      duration: 120
      arrivalRate: 50
      rampTo: 10

  defaults:
    headers:
      Content-Type: "application/json"

  variables:
    testEventId: "EVENT_TEST_001"

scenarios:
  # Scenario 1: Khách vãng lai xem sự kiện
  - name: "Browse Events"
    weight: 50
    flow:
      # Xem danh sách sự kiện
      - get:
          url: "/events"
          qs:
            limit: "10"
            page: "1"
          capture:
            - json: "$.events[0].id"
              as: "eventId"
      
      # Xem chi tiết sự kiện (nếu có)
      - think: 2  # Đọc thông tin 2 giây
      
      - get:
          url: "/events/{{ eventId }}"
          ifTrue: "eventId"

  # Scenario 2: User đăng nhập và đăng ký sự kiện
  - name: "Register for Event"
    weight: 30
    flow:
      # Xem danh sách
      - get:
          url: "/events"
      
      - think: 3
      
      # Đăng ký (cần token thực, dùng pre-generated token)
      - post:
          url: "/events/{{ testEventId }}/register"
          headers:
            Authorization: "Bearer {{ $processEnvironment.TEST_TOKEN }}"
          json:
            notes: "Đăng ký từ load test"
          expect:
            - statusCode: [200, 201, 400, 401, 409]

  # Scenario 3: Admin xem tất cả events
  - name: "Admin Operations"
    weight: 20
    flow:
      - get:
          url: "/events"
          qs:
            limit: "50"
          headers:
            Authorization: "Bearer {{ $processEnvironment.ADMIN_TOKEN }}"
```

### 2.4 Chạy Artillery Tests

```bash
#!/bin/bash
# Lấy test token (đăng nhập và lấy JWT)
echo "=== Lấy Auth Token ==="
source .env.test

# Sử dụng AWS CLI để authenticate (cần aws-cli với Cognito support)
AUTH_RESULT=$(aws cognito-idp initiate-auth \
  --auth-flow USER_PASSWORD_AUTH \
  --client-id $CLIENT_ID \
  --auth-parameters USERNAME=$TEST_USERNAME,PASSWORD=$TEST_PASSWORD \
  --query 'AuthenticationResult.IdToken' \
  --output text)

export TEST_TOKEN=$AUTH_RESULT

echo "Token obtained: ${AUTH_RESULT:0:20}..."

# Chạy Baseline Test
echo ""
echo "=== BASELINE TEST ==="
artillery run \
  --output results/baseline-report.json \
  tests/load/artillery-baseline.yaml

# Generate HTML report
artillery report results/baseline-report.json \
  --output results/baseline-report.html

echo "Baseline report: results/baseline-report.html"

# Chạy Stress Test (cẩn thận!)
echo ""
echo "=== STRESS TEST (chạy cẩn thận!) ==="
read -p "Tiếp tục stress test? (y/N): " confirm
if [ "$confirm" = "y" ]; then
  artillery run \
    --output results/stress-report.json \
    tests/load/artillery-stress.yaml
  
  artillery report results/stress-report.json \
    --output results/stress-report.html
fi
```

---

## Bước 3: k6 Test Scripts

### 3.1 k6 Baseline Test

File: `tests/load/k6-baseline.js`

```javascript
// k6-baseline.js
import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('custom_error_rate');
const apiLatency = new Trend('api_latency', true);  // true = track in milliseconds
const registrationCount = new Counter('registration_count');

// Test configuration
export const options = {
  stages: [
    { duration: '30s', target: 5 },   // Warm up
    { duration: '2m', target: 20 },   // Baseline load
    { duration: '1m', target: 50 },   // Ramp up
    { duration: '2m', target: 50 },   // Sustained high load
    { duration: '30s', target: 0 },   // Ramp down
  ],
  
  // Thresholds — test FAIL nếu vi phạm
  thresholds: {
    'http_req_duration': [
      'p(95)<2000',   // 95% requests dưới 2 giây
      'p(99)<5000',   // 99% requests dưới 5 giây
    ],
    'http_req_failed': ['rate<0.05'],  // Error rate < 5%
    'custom_error_rate': ['rate<0.05'],
    'api_latency': ['p(95)<2000'],
  },
};

const BASE_URL = __ENV.API_URL || 'https://api.event-portal.com';
const TOKEN = __ENV.TEST_TOKEN || '';

// ---- Helper functions ----
function getHeaders(authenticated = false) {
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
  if (authenticated && TOKEN) {
    headers['Authorization'] = `Bearer ${TOKEN}`;
  }
  return headers;
}

// ---- Main test function ----
export default function () {
  const userId = `user-${Math.floor(Math.random() * 10000)}`;
  
  group('Browse Events', () => {
    // Test GET /events
    const startTime = Date.now();
    const res = http.get(`${BASE_URL}/events?limit=10`, {
      headers: getHeaders(),
      tags: { endpoint: 'get-events' },
    });
    
    const duration = Date.now() - startTime;
    apiLatency.add(duration);
    
    const success = check(res, {
      'GET /events: status 200': (r) => r.status === 200 || r.status === 401,
      'GET /events: response time < 3s': (r) => r.timings.duration < 3000,
      'GET /events: has body': (r) => r.body && r.body.length > 0,
    });
    
    errorRate.add(!success);
    
    sleep(1);
    
    // Nếu lấy được events, test GET /events/:id
    if (res.status === 200 && res.json('events') && res.json('events').length > 0) {
      const eventId = res.json('events')[0].id;
      
      const detailRes = http.get(`${BASE_URL}/events/${eventId}`, {
        headers: getHeaders(),
        tags: { endpoint: 'get-event-detail' },
      });
      
      check(detailRes, {
        'GET /events/:id: status 200': (r) => r.status === 200 || r.status === 401,
        'GET /events/:id: response time < 2s': (r) => r.timings.duration < 2000,
      });
      
      sleep(0.5);
    }
  });
  
  // Một số users thực hiện registration
  if (Math.random() < 0.2 && TOKEN) {  // 20% users đăng ký
    group('Register for Event', () => {
      const regRes = http.post(
        `${BASE_URL}/events/EVENT_TEST_001/register`,
        JSON.stringify({ notes: `Load test registration ${userId}` }),
        {
          headers: getHeaders(true),
          tags: { endpoint: 'register' },
        }
      );
      
      const success = check(regRes, {
        'POST /register: valid status': (r) => [200, 201, 400, 401, 409].includes(r.status),
        'POST /register: response time < 5s': (r) => r.timings.duration < 5000,
      });
      
      if (regRes.status === 201) {
        registrationCount.add(1);
      }
      
      errorRate.add(regRes.status >= 500);
    });
  }
  
  sleep(1);
}

// ---- Setup function (chạy 1 lần trước test) ----
export function setup() {
  console.log(`Starting load test against: ${BASE_URL}`);
  
  // Verify API is reachable
  const res = http.get(`${BASE_URL}/events`, {
    headers: getHeaders(),
  });
  
  if (res.status >= 500) {
    throw new Error(`API không response: ${res.status}`);
  }
  
  console.log(`API OK: HTTP ${res.status}`);
  return { startTime: Date.now() };
}

// ---- Teardown function (chạy 1 lần sau test) ----
export function teardown(data) {
  const duration = (Date.now() - data.startTime) / 1000;
  console.log(`Test completed in ${duration}s`);
}
```

### 3.2 Chạy k6 Tests

```bash
#!/bin/bash
source .env.test

# Lấy auth token
AUTH_TOKEN=$(aws cognito-idp initiate-auth \
  --auth-flow USER_PASSWORD_AUTH \
  --client-id $CLIENT_ID \
  --auth-parameters USERNAME=$TEST_USERNAME,PASSWORD=$TEST_PASSWORD \
  --query 'AuthenticationResult.IdToken' \
  --output text)

mkdir -p results

echo "=== CHẠY k6 BASELINE TEST ==="
k6 run \
  --env API_URL=$API_URL \
  --env TEST_TOKEN=$AUTH_TOKEN \
  --out json=results/k6-baseline.json \
  --summary-trend-stats="min,avg,med,p(90),p(95),p(99),max" \
  tests/load/k6-baseline.js

echo ""
echo "=== k6 SMOKE TEST (1 user, 1 phút) ==="
k6 run \
  --vus 1 \
  --duration 60s \
  --env API_URL=$API_URL \
  --env TEST_TOKEN=$AUTH_TOKEN \
  tests/load/k6-baseline.js
```

---

## Bước 4: Phân Tích Kết Quả

### Metrics Quan Trọng Cần Đánh Giá

| Metric | Mức Tốt | Cần Cải Thiện | Nguy Hiểm |
|--------|---------|---------------|-----------|
| p50 Latency | < 500ms | 500ms–1s | > 1s |
| p95 Latency | < 1s | 1s–3s | > 3s |
| p99 Latency | < 2s | 2s–5s | > 5s |
| Error Rate | < 1% | 1%–5% | > 5% |
| Throughput | > 50 RPS | 20–50 RPS | < 20 RPS |

### Script Phân Tích Kết Quả

```bash
#!/bin/bash
# Phân tích CloudWatch metrics sau khi chạy load test

FUNCTION_NAME="getEvents"
START_TIME=$(date -u -d '30 minutes ago' +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -v-30M +%Y-%m-%dT%H:%M:%SZ)
END_TIME=$(date -u +%Y-%m-%dT%H:%M:%SZ)

echo "=== Lambda Performance Trong Load Test ==="
echo ""
echo "Duration p99:"
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Duration \
  --dimensions Name=FunctionName,Value=$FUNCTION_NAME \
  --start-time $START_TIME \
  --end-time $END_TIME \
  --period 60 \
  --extended-statistics p99 \
  --query 'sort_by(Datapoints,&Timestamp)[*].{Time:Timestamp,P99ms:ExtendedStatistics.p99}' \
  --output table

echo ""
echo "Error Count:"
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Errors \
  --dimensions Name=FunctionName,Value=$FUNCTION_NAME \
  --start-time $START_TIME \
  --end-time $END_TIME \
  --period 60 \
  --statistics Sum \
  --query 'sort_by(Datapoints,&Timestamp)[*].{Time:Timestamp,Errors:Sum}' \
  --output table

echo ""
echo "Throttle Count:"
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Throttles \
  --dimensions Name=FunctionName,Value=$FUNCTION_NAME \
  --start-time $START_TIME \
  --end-time $END_TIME \
  --period 60 \
  --statistics Sum \
  --query 'sort_by(Datapoints,&Timestamp)[*].{Time:Timestamp,Throttles:Sum}' \
  --output table

echo ""
echo "=== DynamoDB Performance ==="
aws cloudwatch get-metric-statistics \
  --namespace AWS/DynamoDB \
  --metric-name ThrottledRequests \
  --dimensions Name=TableName,Value=EventsTable \
  --start-time $START_TIME \
  --end-time $END_TIME \
  --period 60 \
  --statistics Sum \
  --query 'sort_by(Datapoints,&Timestamp)[*].{Time:Timestamp,Throttles:Sum}' \
  --output table
```

### Đọc Kết Quả k6

```bash
# k6 output mẫu và cách đọc
cat << 'EOF'
✓ http_req_duration.............: avg=234ms  min=45ms  med=198ms  p(90)=456ms p(95)=623ms  p(99)=1.2s   max=4.5s
✓ http_req_failed................: 0.42%  ✓ 4752 ✗ 20
✓ http_reqs......................: 4772   23.4/s
  iterations...................: 2386   11.7/s
  vus..........................: 50     min=1   max=50
  vus_max......................: 50     min=50  max=50

Diễn giải:
- p(95)=623ms: 95% requests hoàn thành trong 623ms — OK (< 1s)
- p(99)=1.2s: 99% requests hoàn thành trong 1.2s — OK (< 2s)
- http_req_failed: 0.42% — OK (< 5%)
- 23.4/s throughput: Xử lý 23 requests/giây

Cần cải thiện nếu:
- p95 > 1s: Lambda quá chậm, tăng memory hoặc optimize code
- Error rate > 5%: DynamoDB throttling hoặc Lambda errors
- Throttles > 0: Cần bật DynamoDB auto-scaling
EOF
```

---

## Bước 5: Tối Ưu Sau Load Test

```bash
#!/bin/bash
# Dựa trên kết quả load test, thực hiện tối ưu

# Nếu Lambda Duration cao (cold start issue) → Provisioned Concurrency
aws lambda put-provisioned-concurrency-config \
  --function-name getEvents \
  --qualifier prod \
  --provisioned-concurrent-executions 5  # Giữ 5 instances warm
# ⚠️ Tốn phí: $0.015/GB-hour — chỉ dùng ở production

# Nếu DynamoDB throttling → Chuyển sang On-Demand
aws dynamodb update-table \
  --table-name EventsTable \
  --billing-mode PAY_PER_REQUEST

# Nếu API Gateway throttling → Tăng rate limit
# (cấu hình trong API Gateway console hoặc CloudFormation)
```

---

## Lưu ý Free Tier

> ⚠️ **Lambda**: 1M requests/tháng và 400,000 GB-seconds miễn phí. Load test 100 RPS × 60 giây = 6,000 requests — rất nhỏ so với Free Tier.

> ⚠️ **DynamoDB**: Stress test có thể tốn nhiều RCU/WCU. Dùng On-Demand mode để không bị throttle, nhưng theo dõi chi phí.

> 💡 **Tip**: Chạy load test trong thời gian ngắn (< 5 phút) và monitor CloudWatch dashboard đồng thời.




## Bước tiếp theo

- [Chaos test sau load test](chaos-engineering.md)
- [Tối ưu scale dựa trên kết quả](../../architecture/explanation/scalability-design.md)

## Tài liệu liên quan

- [Scalability Design](../../architecture/explanation/scalability-design.md)
- [Monitoring & Alerting](../../operations/how-to/monitoring-alerting.md)
- [Chaos Engineering](chaos-engineering.md)

---

**Metadata**:
- **Requirements**: Requirement 11, Requirement 16, Requirement 17, Requirement 18
- **Category**: How-To
- **Domain**: Testing
- **Difficulty**: Trung bình
- **Estimated Reading/Implementation Time**: 1.5 giờ
- **Last Updated**: 2026-06-12