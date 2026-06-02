# Runbooks — Cẩm Nang Vận Hành

Tài liệu này cung cấp hướng dẫn xử lý sự cố từng bước cho 5 tình huống thường gặp nhất. Mỗi runbook bao gồm: triệu chứng, nguyên nhân, chẩn đoán, và các bước giải quyết với lệnh AWS CLI cụ thể.

---

## Runbook 1: Lambda Timeout

### Triệu Chứng
```
Task timed out after 30.00 seconds
```
Hoặc API Gateway trả về `504 Gateway Timeout`.

### Nguyên Nhân Thường Gặp
- Code chạy chậm (vòng lặp lớn, tính toán nặng)
- DynamoDB bị throttle → Lambda phải retry → hết timeout
- Kết nối đến external service quá chậm
- Lambda cold start + heavy initialization
- Memory quá thấp → CPU throttling → chạy chậm hơn

### Chẩn Đoán

```bash
#!/bin/bash
FUNCTION_NAME="getEvents"  # Thay bằng function bị timeout
REGION="us-east-1"

# Bước 1: Xác nhận timeout đang xảy ra
echo "=== Kiểm tra Lambda Errors ==="
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Errors \
  --dimensions Name=FunctionName,Value=$FUNCTION_NAME \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -v-1H +%Y-%m-%dT%H:%M:%SZ) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%SZ) \
  --period 300 \
  --statistics Sum \
  --query 'Datapoints[*].{Time:Timestamp,Errors:Sum}' \
  --output table

# Bước 2: Tìm log entries chứa timeout
echo ""
echo "=== Log Entries Chứa Timeout ==="
aws logs filter-log-events \
  --log-group-name "/aws/lambda/$FUNCTION_NAME" \
  --filter-pattern "Task timed out" \
  --start-time $(date -d '1 hour ago' +%s000 2>/dev/null || date -v-1H +%s000) \
  --limit 10 \
  --query 'events[*].{Time:timestamp,Message:message}' \
  --output table

# Bước 3: Xem duration gần đây
echo ""
echo "=== Lambda Duration (p99) 1 giờ qua ==="
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Duration \
  --dimensions Name=FunctionName,Value=$FUNCTION_NAME \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -v-1H +%Y-%m-%dT%H:%M:%SZ) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%SZ) \
  --period 300 \
  --extended-statistics p99 \
  --query 'Datapoints[*].{Time:Timestamp,P99:ExtendedStatistics.p99}' \
  --output table

# Bước 4: Xem cấu hình hiện tại
echo ""
echo "=== Cấu hình Lambda ==="
aws lambda get-function-configuration \
  --function-name $FUNCTION_NAME \
  --query '{Timeout:Timeout,MemorySize:MemorySize,Runtime:Runtime}'
```

### Giải Quyết

```bash
#!/bin/bash
FUNCTION_NAME="getEvents"

# Giải pháp A: Tăng timeout (nếu code cần thêm thời gian chạy)
echo "Tăng timeout lên 60 giây..."
aws lambda update-function-configuration \
  --function-name $FUNCTION_NAME \
  --timeout 60

# Giải pháp B: Tăng memory (tự động tăng CPU, code chạy nhanh hơn)
echo "Tăng memory từ 128MB lên 512MB..."
aws lambda update-function-configuration \
  --function-name $FUNCTION_NAME \
  --memory-size 512

# Giải pháp C: Kiểm tra DynamoDB throttling đồng thời
echo ""
echo "Kiểm tra DynamoDB throttling..."
aws cloudwatch get-metric-statistics \
  --namespace AWS/DynamoDB \
  --metric-name ReadThrottleEvents \
  --dimensions Name=TableName,Value=EventsTable \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -v-1H +%Y-%m-%dT%H:%M:%SZ) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%SZ) \
  --period 300 \
  --statistics Sum \
  --query 'Datapoints[*].Sum' \
  --output text

# Giải pháp D: Xem chi tiết log của 1 invocation cụ thể
echo ""
echo "Xem log streams gần nhất..."
aws logs describe-log-streams \
  --log-group-name "/aws/lambda/$FUNCTION_NAME" \
  --order-by LastEventTime \
  --descending \
  --limit 3 \
  --query 'logStreams[*].{Stream:logStreamName,LastEvent:lastEventTimestamp}'
```

### Theo Dõi Sau Khi Xử Lý

```bash
# Đợi 5 phút rồi kiểm tra lại
sleep 300
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Errors \
  --dimensions Name=FunctionName,Value=$FUNCTION_NAME \
  --start-time $(date -u -d '5 minutes ago' +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -v-5M +%Y-%m-%dT%H:%M:%SZ) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%SZ) \
  --period 300 \
  --statistics Sum \
  --query 'Datapoints[*].Sum' \
  --output text
```

---

## Runbook 2: DynamoDB Throttling

### Triệu Chứng
```
ProvisionedThroughputExceededException: The level of configured
provisioned throughput for the table was exceeded.
```
Lambda trả về `500 Internal Server Error`, CloudWatch alarm `DynamoDB-ReadThrottles` hoặc `DynamoDB-WriteThrottles` bật lên.

### Nguyên Nhân
- Traffic đột biến vượt RCU/WCU được cấp phát
- Hot partition key (quá nhiều requests đến cùng 1 partition)
- Batch operations quá lớn
- DynamoDB đang dùng Provisioned mode (không auto-scale)

### Chẩn Đoán

```bash
#!/bin/bash
TABLE_NAME="EventsTable"
START_TIME=$(date -u -d '30 minutes ago' +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -v-30M +%Y-%m-%dT%H:%M:%SZ)
END_TIME=$(date -u +%Y-%m-%dT%H:%M:%SZ)

echo "=== DynamoDB Throttle Metrics (30 phút qua) ==="
for METRIC in ReadThrottleEvents WriteThrottleEvents; do
  echo ""
  echo "--- $METRIC ---"
  aws cloudwatch get-metric-statistics \
    --namespace AWS/DynamoDB \
    --metric-name $METRIC \
    --dimensions Name=TableName,Value=$TABLE_NAME \
    --start-time $START_TIME \
    --end-time $END_TIME \
    --period 60 \
    --statistics Sum \
    --query 'sort_by(Datapoints,&Timestamp)[*].{Time:Timestamp,Count:Sum}' \
    --output table
done

echo ""
echo "=== Consumed vs Provisioned Capacity ==="
aws cloudwatch get-metric-statistics \
  --namespace AWS/DynamoDB \
  --metric-name ConsumedReadCapacityUnits \
  --dimensions Name=TableName,Value=$TABLE_NAME \
  --start-time $START_TIME \
  --end-time $END_TIME \
  --period 60 \
  --statistics Sum \
  --query 'sort_by(Datapoints,&Timestamp)[-5:].{Time:Timestamp,Consumed:Sum}' \
  --output table

echo ""
echo "=== Billing Mode Hiện Tại ==="
aws dynamodb describe-table \
  --table-name $TABLE_NAME \
  --query 'Table.{BillingMode:BillingModeSummary.BillingMode,RCU:ProvisionedThroughput.ReadCapacityUnits,WCU:ProvisionedThroughput.WriteCapacityUnits}'
```

### Giải Quyết

```bash
#!/bin/bash
TABLE_NAME="EventsTable"

# Giải pháp NHANH: Chuyển sang On-Demand (PAY_PER_REQUEST) ngay
# - Không cần estimate capacity
# - Tự động scale vô hạn
# - CHỈ trả tiền khi có request
# ⚠️ Có thể vượt Free Tier nếu traffic lớn
echo "=== Chuyển sang On-Demand Mode ==="
aws dynamodb update-table \
  --table-name $TABLE_NAME \
  --billing-mode PAY_PER_REQUEST

echo "Đợi table update hoàn thành..."
aws dynamodb wait table-exists --table-name $TABLE_NAME

echo "✅ DynamoDB đã chuyển sang On-Demand mode"

# Kiểm tra lại
aws dynamodb describe-table \
  --table-name $TABLE_NAME \
  --query 'Table.BillingModeSummary'

# Giải pháp DÀI HẠN: Bật Auto Scaling cho Provisioned mode
# (xem cloudformation-templates.md để deploy đầy đủ)
echo ""
echo "=== Bật Auto Scaling (nếu muốn dùng Provisioned mode) ==="
# Đăng ký table với Application Auto Scaling
aws application-autoscaling register-scalable-target \
  --service-namespace dynamodb \
  --resource-id "table/$TABLE_NAME" \
  --scalable-dimension dynamodb:table:ReadCapacityUnits \
  --min-capacity 1 \
  --max-capacity 100

aws application-autoscaling register-scalable-target \
  --service-namespace dynamodb \
  --resource-id "table/$TABLE_NAME" \
  --scalable-dimension dynamodb:table:WriteCapacityUnits \
  --min-capacity 1 \
  --max-capacity 100

# Thiết lập scaling policy
aws application-autoscaling put-scaling-policy \
  --service-namespace dynamodb \
  --resource-id "table/$TABLE_NAME" \
  --scalable-dimension dynamodb:table:ReadCapacityUnits \
  --policy-name "${TABLE_NAME}-read-scaling" \
  --policy-type TargetTrackingScaling \
  --target-tracking-scaling-policy-configuration '{
    "TargetValue": 70.0,
    "PredefinedMetricSpecification": {
      "PredefinedMetricType": "DynamoDBReadCapacityUtilization"
    },
    "ScaleInCooldown": 60,
    "ScaleOutCooldown": 60
  }'
```

---

## Runbook 3: Cognito Authentication Failures

### Triệu Chứng
- Users không đăng nhập được
- Nhận lỗi `NotAuthorizedException`, `UserNotFoundException`, hoặc `InvalidPasswordException`
- Nhiều requests đến `/auth/login` thất bại
- CloudWatch metric `SuccessfulLogins` giảm đột ngột

### Chẩn Đoán

```bash
#!/bin/bash
USER_POOL_ID="us-east-1_XXXXXXX"  # Thay bằng User Pool ID thực
USERNAME="user@example.com"        # User đang gặp vấn đề

echo "=== Thông tin User ==="
aws cognito-idp admin-get-user \
  --user-pool-id $USER_POOL_ID \
  --username $USERNAME \
  --query '{
    Status:UserStatus,
    Enabled:Enabled,
    Created:UserCreateDate,
    Modified:UserLastModifiedDate,
    Attributes:UserAttributes[*].{Name:Name,Value:Value}
  }'

echo ""
echo "=== Auth Events (nếu Advanced Security bật) ==="
aws cognito-idp admin-list-user-auth-events \
  --user-pool-id $USER_POOL_ID \
  --username $USERNAME \
  --max-results 5 \
  --query 'AuthEvents[*].{
    Type:EventType,
    Date:CreationDate,
    Risk:EventRisk.RiskDecision,
    Response:EventResponse
  }' \
  --output table

echo ""
echo "=== Kiểm tra MFA Setup ==="
aws cognito-idp get-user-mfa-preference \
  --user-pool-id $USER_POOL_ID \
  --username $USERNAME \
  2>/dev/null || echo "Không thể lấy MFA preference (cần user token)"

echo ""
echo "=== Số lượng Users trong Pool ==="
aws cognito-idp list-users \
  --user-pool-id $USER_POOL_ID \
  --filter "status = \"CONFIRMED\"" \
  --query 'length(Users)' \
  --output text
```

### Giải Quyết

```bash
#!/bin/bash
USER_POOL_ID="us-east-1_XXXXXXX"
USERNAME="user@example.com"

# Trường hợp 1: User bị DISABLED
echo "=== Kiểm tra và Enable User ==="
USER_STATUS=$(aws cognito-idp admin-get-user \
  --user-pool-id $USER_POOL_ID \
  --username $USERNAME \
  --query 'Enabled' \
  --output text)

if [ "$USER_STATUS" = "False" ]; then
  echo "User đang bị disabled. Enable lại..."
  aws cognito-idp admin-enable-user \
    --user-pool-id $USER_POOL_ID \
    --username $USERNAME
  echo "✅ User đã được enable"
fi

# Trường hợp 2: User quên mật khẩu / tài khoản bị lock
echo ""
echo "=== Reset Password (gửi temporary password qua email) ==="
aws cognito-idp admin-reset-user-password \
  --user-pool-id $USER_POOL_ID \
  --username $USERNAME
echo "✅ Temporary password đã gửi đến email của user"

# Trường hợp 3: User chưa confirm email
echo ""
echo "=== Force Confirm User (nếu chưa verify email) ==="
USER_STATUS=$(aws cognito-idp admin-get-user \
  --user-pool-id $USER_POOL_ID \
  --username $USERNAME \
  --query 'UserStatus' \
  --output text)

if [ "$USER_STATUS" = "UNCONFIRMED" ]; then
  aws cognito-idp admin-confirm-sign-up \
    --user-pool-id $USER_POOL_ID \
    --username $USERNAME
  echo "✅ User đã được confirm"
fi

# Trường hợp 4: Xóa MFA setup (nếu user mất thiết bị MFA)
echo ""
echo "=== Reset MFA (nếu user mất thiết bị) ==="
echo "Lệnh này yêu cầu user setup lại MFA:"
echo "aws cognito-idp admin-set-user-mfa-preference \\"
echo "  --user-pool-id $USER_POOL_ID \\"
echo "  --username $USERNAME \\"
echo "  --software-token-mfa-settings Enabled=false,PreferredMfa=false"

# Trường hợp 5: Sign out tất cả sessions của user (security incident)
echo ""
echo "=== Global Sign Out (force logout tất cả devices) ==="
echo "⚠️ Cẩn thận: Lệnh này logout user khỏi tất cả thiết bị"
# aws cognito-idp admin-user-global-sign-out \
#   --user-pool-id $USER_POOL_ID \
#   --username $USERNAME
```

---

## Runbook 4: API Gateway 5xx Errors

### Triệu Chứng
- HTTP 500 Internal Server Error hoặc 502 Bad Gateway
- HTTP 503 Service Unavailable
- Alarm `APIGateway-5xxErrors` triggered
- Users báo cáo ứng dụng không hoạt động

### Chẩn Đoán

```bash
#!/bin/bash
API_NAME="EventPortalAPI"
STAGE="dev"
REGION="us-east-1"

# Bước 1: Xác định mức độ lỗi
echo "=== API Gateway 5xx Errors (1 giờ qua) ==="
aws cloudwatch get-metric-statistics \
  --namespace AWS/ApiGateway \
  --metric-name 5XXError \
  --dimensions Name=ApiName,Value=$API_NAME Name=Stage,Value=$STAGE \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -v-1H +%Y-%m-%dT%H:%M:%SZ) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%SZ) \
  --period 60 \
  --statistics Sum \
  --query 'sort_by(Datapoints,&Timestamp)[-10:].{Time:Timestamp,Errors:Sum}' \
  --output table

# Bước 2: Lấy execution logs từ API Gateway
echo ""
echo "=== API Gateway Execution Logs ==="
# Lấy API ID
API_ID=$(aws apigateway get-rest-apis \
  --query "items[?name=='$API_NAME'].id" \
  --output text)

echo "API ID: $API_ID"

# Xem API Gateway logs (nếu logging đã bật)
aws logs filter-log-events \
  --log-group-name "API-Gateway-Execution-Logs_${API_ID}/${STAGE}" \
  --filter-pattern "5XX" \
  --start-time $(date -d '1 hour ago' +%s000 2>/dev/null || date -v-1H +%s000) \
  --limit 20 \
  --query 'events[*].message' \
  --output text 2>/dev/null || echo "Logging chưa bật hoặc không có log"

# Bước 3: Kiểm tra Lambda function liên quan
echo ""
echo "=== Lambda Errors Cùng Thời Điểm ==="
for FUNCTION in getEvents createEvent updateEvent deleteEvent registerEvent; do
  ERRORS=$(aws cloudwatch get-metric-statistics \
    --namespace AWS/Lambda \
    --metric-name Errors \
    --dimensions Name=FunctionName,Value=$FUNCTION \
    --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -v-1H +%Y-%m-%dT%H:%M:%SZ) \
    --end-time $(date -u +%Y-%m-%dT%H:%M:%SZ) \
    --period 3600 \
    --statistics Sum \
    --query 'Datapoints[0].Sum' \
    --output text 2>/dev/null)
  
  if [ "$ERRORS" != "None" ] && [ "$ERRORS" != "" ] && [ $(echo "$ERRORS > 0" | bc 2>/dev/null || echo "0") = "1" ]; then
    echo "❌ $FUNCTION: $ERRORS errors"
  else
    echo "✅ $FUNCTION: OK"
  fi
done
```

### Giải Quyết

```bash
#!/bin/bash
FUNCTION_NAME="getEvents"  # Function đang lỗi

# Bước 1: Xem Lambda logs chi tiết
echo "=== Lambda Error Logs ==="
LOG_STREAM=$(aws logs describe-log-streams \
  --log-group-name "/aws/lambda/$FUNCTION_NAME" \
  --order-by LastEventTime \
  --descending \
  --limit 1 \
  --query 'logStreams[0].logStreamName' \
  --output text)

aws logs get-log-events \
  --log-group-name "/aws/lambda/$FUNCTION_NAME" \
  --log-stream-name "$LOG_STREAM" \
  --limit 50 \
  --query 'events[*].message' \
  --output text | grep -E "ERROR|Error|WARN|Unhandled"

# Bước 2: Nếu là deployment mới gây lỗi — Rollback ngay
echo ""
echo "=== Danh sách Lambda Versions ==="
aws lambda list-versions-by-function \
  --function-name $FUNCTION_NAME \
  --query 'Versions[-5:].{Version:Version,Modified:LastModified,Description:Description}' \
  --output table

echo ""
echo "=== Rollback về version trước (thay VERSION_NUMBER) ==="
PREVIOUS_VERSION="5"  # Thay bằng version number trước deployment
echo "aws lambda update-alias \\"
echo "  --function-name $FUNCTION_NAME \\"
echo "  --name prod \\"
echo "  --function-version $PREVIOUS_VERSION"

# Bước 3: Kiểm tra IAM permissions
echo ""
echo "=== Kiểm tra IAM Role của Lambda ==="
ROLE_ARN=$(aws lambda get-function-configuration \
  --function-name $FUNCTION_NAME \
  --query 'Role' \
  --output text)
echo "Role: $ROLE_ARN"

# Bước 4: Test invoke Lambda trực tiếp
echo ""
echo "=== Test Invoke Lambda Trực Tiếp ==="
aws lambda invoke \
  --function-name $FUNCTION_NAME \
  --payload '{"httpMethod":"GET","path":"/events","headers":{},"queryStringParameters":null,"body":null}' \
  --cli-binary-format raw-in-base64-out \
  /tmp/lambda-test-output.json

echo "Response:"
cat /tmp/lambda-test-output.json
```

---

## Runbook 5: CloudFront Cache Issues

### Triệu Chứng
- Users thấy nội dung cũ sau khi deploy
- CSS/JS mới không được load
- API responses bị cache khi không nên
- CloudFront trả về stale data

### Chẩn Đoán

```bash
#!/bin/bash
# Lấy CloudFront Distribution ID
DISTRIBUTION_ID=$(aws cloudfront list-distributions \
  --query 'DistributionList.Items[0].Id' \
  --output text)

echo "Distribution ID: $DISTRIBUTION_ID"

# Kiểm tra cache behaviors
echo ""
echo "=== Cache Behaviors ==="
aws cloudfront get-distribution-config \
  --id $DISTRIBUTION_ID \
  --query 'DistributionConfig.CacheBehaviors.Items[*].{
    Path:PathPattern,
    TTL:DefaultTTL,
    Compress:Compress,
    AllowedMethods:AllowedMethods.Items
  }' \
  --output table

# Kiểm tra error rate
echo ""
echo "=== CloudFront Error Rate (1 giờ qua) ==="
aws cloudwatch get-metric-statistics \
  --namespace AWS/CloudFront \
  --metric-name TotalErrorRate \
  --dimensions Name=DistributionId,Value=$DISTRIBUTION_ID Name=Region,Value=Global \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -v-1H +%Y-%m-%dT%H:%M:%SZ) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%SZ) \
  --period 300 \
  --statistics Average \
  --query 'Datapoints[*].{Time:Timestamp,ErrorRate:Average}' \
  --output table

# Kiểm tra headers của response
echo ""
echo "=== Test Cache Headers ==="
API_URL="https://your-cloudfront-domain.cloudfront.net"
curl -I "$API_URL/index.html" 2>/dev/null | grep -E "x-cache|Age|Cache-Control|Expires|Last-Modified"
```

### Giải Quyết

```bash
#!/bin/bash
DISTRIBUTION_ID="XXXXXXXXXX"  # Thay bằng Distribution ID thực

# Giải pháp 1: Invalidate cache cụ thể (sau khi deploy frontend mới)
echo "=== Invalidate Frontend Assets ==="
aws cloudfront create-invalidation \
  --distribution-id $DISTRIBUTION_ID \
  --paths "/index.html" "/static/js/*" "/static/css/*"

echo ""
echo "Đợi invalidation hoàn thành..."
INVALIDATION_ID=$(aws cloudfront create-invalidation \
  --distribution-id $DISTRIBUTION_ID \
  --paths "/*" \
  --query 'Invalidation.Id' \
  --output text)

# Theo dõi tiến trình invalidation
aws cloudfront wait invalidation-completed \
  --distribution-id $DISTRIBUTION_ID \
  --id $INVALIDATION_ID

echo "✅ Cache invalidation hoàn thành"

# Giải pháp 2: Invalidate toàn bộ cache (emergency)
# ⚠️ $0.005 cho mỗi path sau 1000 paths/tháng
echo ""
echo "=== Invalidate Tất Cả Cache (emergency) ==="
echo "⚠️ Chi phí: Miễn phí 1000 paths/tháng, sau đó $0.005/path"
echo "Chạy lệnh sau nếu cần:"
echo "aws cloudfront create-invalidation \\"
echo "  --distribution-id $DISTRIBUTION_ID \\"
echo "  --paths '/*'"

# Giải pháp 3: Kiểm tra và sửa Cache-Control headers
echo ""
echo "=== Kiểm tra S3 Object Metadata ==="
BUCKET="event-portal-frontend-$(aws sts get-caller-identity --query Account --output text)"
aws s3api head-object \
  --bucket $BUCKET \
  --key "index.html" \
  --query '{CacheControl:CacheControl,ContentType:ContentType,LastModified:LastModified}'

# Cập nhật Cache-Control cho index.html (không cache HTML)
echo ""
echo "=== Cập nhật Cache-Control Headers ==="
aws s3 cp \
  s3://$BUCKET/index.html \
  s3://$BUCKET/index.html \
  --metadata-directive REPLACE \
  --cache-control "no-cache, no-store, must-revalidate" \
  --content-type "text/html"

echo "✅ Cache-Control đã cập nhật cho index.html"

# Kiểm tra trạng thái invalidation
echo ""
echo "=== Danh sách Invalidations gần đây ==="
aws cloudfront list-invalidations \
  --distribution-id $DISTRIBUTION_ID \
  --query 'InvalidationList.Items[0:5].{Id:Id,Status:Status,CreateTime:CreateTime}' \
  --output table
```

---

## Bảng Tóm Tắt Quick Reference

| Sự Cố | Lệnh Chẩn Đoán Nhanh | Lệnh Fix Nhanh |
|-------|----------------------|----------------|
| Lambda Timeout | `aws logs filter-log-events --filter-pattern "timed out"` | `aws lambda update-function-configuration --timeout 60` |
| DynamoDB Throttle | `aws cloudwatch get-metric-statistics --metric-name ThrottledRequests` | `aws dynamodb update-table --billing-mode PAY_PER_REQUEST` |
| Cognito Login Fail | `aws cognito-idp admin-get-user` | `aws cognito-idp admin-reset-user-password` |
| API 5xx Error | `aws logs filter-log-events --filter-pattern "ERROR"` | Rollback deployment |
| CloudFront Cache | `curl -I https://domain/index.html \| grep x-cache` | `aws cloudfront create-invalidation --paths "/*"` |

## Tài Liệu Liên Quan

- [monitoring-alerting.md](../how-to/monitoring-alerting.md) — Thiết lập alarms để phát hiện sự cố sớm
- [backup-recovery.md](../how-to/backup-recovery.md) — Khôi phục data khi cần
- [cloudformation-templates.md](../../infrastructure/reference/cloudformation-templates.md) — Rollback infrastructure
