# Chaos Engineering với AWS Fault Injection Simulator

## Vấn Đề

Không biết hệ thống có bền vững khi có failures thực tế:
- **Chưa biết** Lambda xử lý thế nào khi bị lỗi 50% requests
- **Chưa biết** hệ thống có retry đúng cách khi DynamoDB bị throttle không
- **Chưa biết** user experience bị ảnh hưởng ra sao khi có partial failures
- **Không có Game Days** — chưa từng diễn tập incident response
- **Runbooks chưa được test** trong điều kiện thực tế

## Giải Pháp

Chaos Engineering với 3 công cụ:
1. **AWS Fault Injection Simulator (FIS)** — service chính thức của AWS
2. **Manual chaos scripts** — inject lỗi thủ công để test
3. **CloudWatch monitoring** — đo impact và recovery time

## Nguyên Tắc Chaos Engineering

> **"Break things on purpose to learn how to fix them faster"**

Quy trình chuẩn:
1. **Define steady state** — đo baseline khi hệ thống bình thường
2. **Hypothesis** — dự đoán điều gì sẽ xảy ra
3. **Inject failure** — thực hiện chaos experiment
4. **Observe** — quan sát impact qua metrics
5. **Conclude** — hệ thống có resilient không?
6. **Fix** — cải thiện nếu không đạt kỳ vọng

## Điều Kiện Tiên Quyết

```bash
# Verify AWS FIS permissions
aws iam simulate-principal-policy \
  --policy-source-arn "arn:aws:iam::$(aws sts get-caller-identity --query Account --output text):user/$(aws sts get-caller-identity --query Arn --output text | cut -d'/' -f2)" \
  --action-names fis:CreateExperimentTemplate \
  --resource-arns "*"

# Cài AWS CLI và verify
aws fis list-actions --query 'actions[?tags.service==`aws:lambda`].id'
```

> ⚠️ **QUAN TRỌNG**: Luôn chạy Chaos Engineering trên môi trường **dev/staging**. KHÔNG bao giờ chạy trực tiếp trên production trừ khi đã có kinh nghiệm và approval từ team.

> 💰 **Chi phí**: AWS FIS tính phí theo thời gian experiment chạy. Khoảng $0.10/minute cho mỗi action. Test 5 phút ≈ $0.50.

---

## Bước 1: Thiết Lập IAM Role cho AWS FIS

```yaml
# fis-setup.yaml
AWSTemplateFormatVersion: '2010-09-09'
Description: 'AWS FIS Role và CloudWatch Alarms cho Chaos Engineering'

Parameters:
  Environment:
    Type: String
    Default: dev

Resources:
  # IAM Role cho AWS FIS
  FISExperimentRole:
    Type: AWS::IAM::Role
    Properties:
      RoleName: !Sub 'FISExperimentRole-${Environment}'
      AssumeRolePolicyDocument:
        Version: '2012-10-17'
        Statement:
          - Effect: Allow
            Principal:
              Service: fis.amazonaws.com
            Action: sts:AssumeRole
      Policies:
        - PolicyName: FISExperimentPolicy
          PolicyDocument:
            Version: '2012-10-17'
            Statement:
              # Lambda chaos permissions
              - Effect: Allow
                Action:
                  - lambda:InvokeFunction
                  - lambda:GetFunction
                  - lambda:PutFunctionConcurrency
                  - lambda:DeleteFunctionConcurrency
                Resource: !Sub 'arn:aws:lambda:${AWS::Region}:${AWS::AccountId}:function:*'

              # CloudWatch Logs permissions
              - Effect: Allow
                Action:
                  - logs:CreateLogDelivery
                  - logs:PutLogEvents
                  - logs:DescribeLogGroups
                Resource: '*'

              # CloudWatch alarms để dừng experiment tự động
              - Effect: Allow
                Action:
                  - cloudwatch:DescribeAlarms
                Resource: '*'

  # Stop Condition Alarm — Dừng experiment nếu error rate > 50%
  ChaosStopAlarm:
    Type: AWS::CloudWatch::Alarm
    Properties:
      AlarmName: !Sub 'FIS-StopCondition-ErrorRate-${Environment}'
      AlarmDescription: 'Dừng FIS experiment nếu Lambda error rate > 50%'
      Namespace: AWS/Lambda
      MetricName: Errors
      Statistic: Sum
      Period: 60
      EvaluationPeriods: 1
      Threshold: 50
      ComparisonOperator: GreaterThanThreshold
      TreatMissingData: notBreaching

Outputs:
  FISRoleArn:
    Value: !GetAtt FISExperimentRole.Arn
    Export:
      Name: !Sub '${AWS::StackName}-FISRoleArn'
  StopAlarmArn:
    Value: !GetAtt ChaosStopAlarm.Arn
    Export:
      Name: !Sub '${AWS::StackName}-StopAlarmArn'
```

```bash
# Deploy FIS setup
aws cloudformation deploy \
  --template-file fis-setup.yaml \
  --stack-name event-portal-fis-setup-dev \
  --parameter-overrides Environment=dev \
  --capabilities CAPABILITY_NAMED_IAM

# Lấy FIS Role ARN
FIS_ROLE_ARN=$(aws cloudformation describe-stacks \
  --stack-name event-portal-fis-setup-dev \
  --query 'Stacks[0].Outputs[?OutputKey==`FISRoleArn`].OutputValue' \
  --output text)

STOP_ALARM_ARN=$(aws cloudformation describe-stacks \
  --stack-name event-portal-fis-setup-dev \
  --query 'Stacks[0].Outputs[?OutputKey==`StopAlarmArn`].OutputValue' \
  --output text)

echo "FIS Role: $FIS_ROLE_ARN"
echo "Stop Alarm: $STOP_ALARM_ARN"
```

---

## Bước 2: Scenario 1 — Lambda Failures (50% Error Rate)

### 2.1 FIS Experiment Template

```json
{
  "description": "Inject 50% errors vào Lambda getEvents trong 5 phút",
  "targets": {
    "LambdaFunctions": {
      "resourceType": "aws:lambda:function",
      "resourceArns": [
        "arn:aws:lambda:us-east-1:ACCOUNT_ID:function:getEvents"
      ],
      "selectionMode": "ALL"
    }
  },
  "actions": {
    "InjectLambdaErrors": {
      "actionId": "aws:lambda:invocation-error",
      "description": "Inject errors vào 50% Lambda invocations",
      "parameters": {
        "errorType": "ServiceException",
        "errorMessage": "FIS Injected Error: Testing resilience",
        "percentage": "50",
        "startupDelay": "PT0S"
      },
      "targets": {
        "Functions": "LambdaFunctions"
      },
      "startAfter": []
    }
  },
  "stopConditions": [
    {
      "source": "aws:cloudwatch:alarm",
      "value": "STOP_ALARM_ARN"
    }
  ],
  "roleArn": "FIS_ROLE_ARN",
  "tags": {
    "Environment": "dev",
    "Experiment": "lambda-error-injection",
    "SafeToRun": "true"
  },
  "experimentOptions": {
    "accountTargeting": "single-account",
    "emptyTargetResolutionMode": "fail"
  },
  "logConfiguration": {
    "cloudWatchLogsConfiguration": {
      "logGroupArn": "arn:aws:logs:us-east-1:ACCOUNT_ID:log-group:/aws/fis/experiments:*"
    },
    "logSchemaVersion": 2
  }
}
```

### 2.2 Script Tạo và Chạy Experiment

```bash
#!/bin/bash
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
REGION="us-east-1"

FIS_ROLE_ARN=$(aws cloudformation describe-stacks \
  --stack-name event-portal-fis-setup-dev \
  --query 'Stacks[0].Outputs[?OutputKey==`FISRoleArn`].OutputValue' \
  --output text)

STOP_ALARM_ARN=$(aws cloudformation describe-stacks \
  --stack-name event-portal-fis-setup-dev \
  --query 'Stacks[0].Outputs[?OutputKey==`StopAlarmArn`].OutputValue' \
  --output text)

echo "=== CHAOS EXPERIMENT: Lambda Error Injection ==="
echo "Target: getEvents Lambda function"
echo "Error Rate: 50%"
echo "Duration: 5 phút"
echo ""
read -p "⚠️ Xác nhận chạy experiment trên môi trường DEV? (yes/N): " confirm

if [ "$confirm" != "yes" ]; then
  echo "Đã hủy."
  exit 0
fi

# Tạo experiment template
TEMPLATE_ID=$(aws fis create-experiment-template \
  --description "Test Lambda resilience - 50% error rate" \
  --targets '{
    "LambdaFunctions": {
      "resourceType": "aws:lambda:function",
      "resourceArns": ["arn:aws:lambda:'$REGION':'$ACCOUNT_ID':function:getEvents"],
      "selectionMode": "ALL"
    }
  }' \
  --actions '{
    "InjectErrors": {
      "actionId": "aws:lambda:invocation-error",
      "parameters": {
        "errorType": "ServiceException",
        "errorMessage": "FIS Test Error",
        "percentage": "50"
      },
      "targets": {"Functions": "LambdaFunctions"}
    }
  }' \
  --stop-conditions '[{"source": "aws:cloudwatch:alarm", "value": "'$STOP_ALARM_ARN'"}]' \
  --role-arn $FIS_ROLE_ARN \
  --tags 'Environment=dev,Experiment=lambda-error' \
  --query 'experimentTemplate.id' \
  --output text)

echo "Template ID: $TEMPLATE_ID"

# Ghi lại baseline metrics trước khi chạy
echo ""
echo "=== BASELINE METRICS (trước experiment) ==="
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Errors \
  --dimensions Name=FunctionName,Value=getEvents \
  --start-time $(date -u -d '5 minutes ago' +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -v-5M +%Y-%m-%dT%H:%M:%SZ) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%SZ) \
  --period 300 \
  --statistics Sum \
  --query 'Datapoints[0].Sum' \
  --output text

# Bắt đầu experiment
echo ""
echo "Bắt đầu experiment..."
EXPERIMENT_ID=$(aws fis start-experiment \
  --experiment-template-id $TEMPLATE_ID \
  --tags 'RunDate='$(date +%Y%m%d) \
  --query 'experiment.id' \
  --output text)

echo "Experiment ID: $EXPERIMENT_ID"
echo ""
echo "Đang chạy... Monitor tại CloudWatch Dashboard"
echo "Đợi 5 phút..."

# Monitor trong khi experiment chạy
for i in 1 2 3 4 5; do
  sleep 60
  STATUS=$(aws fis get-experiment \
    --id $EXPERIMENT_ID \
    --query 'experiment.state.status' \
    --output text)
  
  ERRORS=$(aws cloudwatch get-metric-statistics \
    --namespace AWS/Lambda \
    --metric-name Errors \
    --dimensions Name=FunctionName,Value=getEvents \
    --start-time $(date -u -d '1 minute ago' +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -v-1M +%Y-%m-%dT%H:%M:%SZ) \
    --end-time $(date -u +%Y-%m-%dT%H:%M:%SZ) \
    --period 60 \
    --statistics Sum \
    --query 'Datapoints[0].Sum' \
    --output text 2>/dev/null || echo "0")
  
  echo "[$i/5] Status: $STATUS | Lambda Errors: ${ERRORS:-0}"
done

echo ""
echo "=== METRICS SAU EXPERIMENT ==="
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Errors \
  --dimensions Name=FunctionName,Value=getEvents \
  --start-time $(date -u -d '10 minutes ago' +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -v-10M +%Y-%m-%dT%H:%M:%SZ) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%SZ) \
  --period 60 \
  --statistics Sum \
  --query 'sort_by(Datapoints,&Timestamp)[*].{Time:Timestamp,Errors:Sum}' \
  --output table
```

---

## Bước 3: Scenario 2 — DynamoDB Throttling Simulation

```bash
#!/bin/bash
TABLE_NAME="EventsTable"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
REGION="us-east-1"

echo "=== CHAOS EXPERIMENT: DynamoDB Throttling Simulation ==="
echo ""
echo "Phương pháp: Giảm provisioned capacity xuống 1 WCU (nếu đang dùng Provisioned mode)"
echo "Sau đó tăng traffic để gây throttle"
echo ""

# Kiểm tra billing mode
BILLING_MODE=$(aws dynamodb describe-table \
  --table-name $TABLE_NAME \
  --query 'Table.BillingModeSummary.BillingMode' \
  --output text)

echo "Billing mode hiện tại: $BILLING_MODE"

if [ "$BILLING_MODE" = "PAY_PER_REQUEST" ]; then
  echo ""
  echo "Table đang dùng On-Demand mode — không thể throttle bằng cách giảm WCU"
  echo "Alternative: Dùng AWS FIS DynamoDB throttling action (nếu available)"
  echo ""
  echo "Phương pháp thay thế: Chạy concurrent writes để test retry logic"
  
  # Tạo 100 concurrent write requests
  echo "Tạo 100 concurrent write requests..."
  for i in $(seq 1 100); do
    aws dynamodb put-item \
      --table-name $TABLE_NAME \
      --item '{
        "PK": {"S": "TEST#CHAOS"},
        "SK": {"S": "ITEM#'$i'"},
        "data": {"S": "chaos-test-'$i'"}
      }' &
  done
  wait
  echo "✅ 100 concurrent writes hoàn thành"

else
  # Provisioned mode — có thể giảm WCU
  echo ""
  echo "Lưu lại WCU hiện tại..."
  CURRENT_WCU=$(aws dynamodb describe-table \
    --table-name $TABLE_NAME \
    --query 'Table.ProvisionedThroughput.WriteCapacityUnits' \
    --output text)
  echo "Current WCU: $CURRENT_WCU"
  
  read -p "Giảm WCU xuống 1 để test throttling? (yes/N): " confirm
  if [ "$confirm" = "yes" ]; then
    # Giảm WCU xuống 1
    aws dynamodb update-table \
      --table-name $TABLE_NAME \
      --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=1
    
    echo "WCU đã giảm xuống 1. Đợi 30 giây..."
    sleep 30
    
    # Tạo nhiều writes để gây throttle
    echo "Gây throttle bằng concurrent writes..."
    for i in $(seq 1 50); do
      aws dynamodb put-item \
        --table-name $TABLE_NAME \
        --item '{"PK":{"S":"CHAOS#TEST"},"SK":{"S":"'$i'"},"data":{"S":"test"}}' &
    done
    wait
    
    # Xem throttling metrics
    echo ""
    echo "=== Throttle Metrics ==="
    aws cloudwatch get-metric-statistics \
      --namespace AWS/DynamoDB \
      --metric-name WriteThrottleEvents \
      --dimensions Name=TableName,Value=$TABLE_NAME \
      --start-time $(date -u -d '2 minutes ago' +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -v-2M +%Y-%m-%dT%H:%M:%SZ) \
      --end-time $(date -u +%Y-%m-%dT%H:%M:%SZ) \
      --period 60 \
      --statistics Sum \
      --query 'Datapoints[*].Sum' \
      --output text
    
    # QUAN TRỌNG: Khôi phục WCU về giá trị ban đầu
    echo ""
    echo "Khôi phục WCU về $CURRENT_WCU..."
    aws dynamodb update-table \
      --table-name $TABLE_NAME \
      --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=$CURRENT_WCU
    echo "✅ WCU đã khôi phục"
  fi
fi

# Cleanup test data
echo ""
echo "Cleanup test items..."
aws dynamodb delete-item \
  --table-name $TABLE_NAME \
  --key '{"PK":{"S":"TEST#CHAOS"},"SK":{"S":"ITEM#1"}}' \
  2>/dev/null || true
```

---

## Bước 4: Scenario 3 — Lambda Concurrency Limit

```bash
#!/bin/bash
FUNCTION_NAME="getEvents"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

echo "=== CHAOS EXPERIMENT: Lambda Concurrency Limit ==="
echo "Giảm reserved concurrency xuống 1 để simulate throttling"
echo ""

read -p "Xác nhận? (yes/N): " confirm
if [ "$confirm" != "yes" ]; then exit 0; fi

# Lưu lại concurrency hiện tại
CURRENT_CONCURRENCY=$(aws lambda get-function-concurrency \
  --function-name $FUNCTION_NAME \
  --query 'ReservedConcurrentExecutions' \
  --output text 2>/dev/null || echo "NONE")

echo "Current concurrency: $CURRENT_CONCURRENCY"

# Giảm concurrency xuống 1
aws lambda put-function-concurrency \
  --function-name $FUNCTION_NAME \
  --reserved-concurrent-executions 1

echo "Concurrency giảm xuống 1"
echo "Đợi 30 giây..."
sleep 30

# Gửi 20 concurrent requests để trigger throttle
echo ""
echo "Gửi 20 concurrent requests..."
API_URL="https://your-api-url.execute-api.us-east-1.amazonaws.com/dev"

for i in $(seq 1 20); do
  curl -s -o /dev/null -w "Request $i: %{http_code}\n" \
    --max-time 10 \
    "${API_URL}/events" &
done
wait

# Xem throttle metrics
echo ""
echo "=== Lambda Throttles ==="
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Throttles \
  --dimensions Name=FunctionName,Value=$FUNCTION_NAME \
  --start-time $(date -u -d '5 minutes ago' +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -v-5M +%Y-%m-%dT%H:%M:%SZ) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%SZ) \
  --period 60 \
  --statistics Sum \
  --query 'Datapoints[*].Sum' \
  --output text

# QUAN TRỌNG: Khôi phục concurrency
echo ""
echo "Khôi phục concurrency..."
if [ "$CURRENT_CONCURRENCY" = "NONE" ]; then
  aws lambda delete-function-concurrency --function-name $FUNCTION_NAME
else
  aws lambda put-function-concurrency \
    --function-name $FUNCTION_NAME \
    --reserved-concurrent-executions $CURRENT_CONCURRENCY
fi
echo "✅ Concurrency đã khôi phục"
```

---

## Bước 5: Phân Tích Kết Quả Chaos Experiments

### Checklist Đánh Giá Sau Experiment

```bash
#!/bin/bash
# post-experiment-analysis.sh
FUNCTION_NAME="getEvents"
TABLE_NAME="EventsTable"
START_TIME=$(date -u -d '30 minutes ago' +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -v-30M +%Y-%m-%dT%H:%M:%SZ)
END_TIME=$(date -u +%Y-%m-%dT%H:%M:%SZ)

echo "============================================"
echo "POST-EXPERIMENT ANALYSIS REPORT"
echo "Time: $(date)"
echo "============================================"
echo ""

echo "1. Lambda Error Rate:"
ERRORS=$(aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Errors \
  --dimensions Name=FunctionName,Value=$FUNCTION_NAME \
  --start-time $START_TIME \
  --end-time $END_TIME \
  --period 1800 \
  --statistics Sum \
  --query 'Datapoints[0].Sum' \
  --output text)
echo "   Total Errors: ${ERRORS:-0}"

echo ""
echo "2. Lambda Throttles:"
THROTTLES=$(aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Throttles \
  --dimensions Name=FunctionName,Value=$FUNCTION_NAME \
  --start-time $START_TIME \
  --end-time $END_TIME \
  --period 1800 \
  --statistics Sum \
  --query 'Datapoints[0].Sum' \
  --output text)
echo "   Total Throttles: ${THROTTLES:-0}"

echo ""
echo "3. API Gateway 5xx Errors:"
API_ERRORS=$(aws cloudwatch get-metric-statistics \
  --namespace AWS/ApiGateway \
  --metric-name 5XXError \
  --start-time $START_TIME \
  --end-time $END_TIME \
  --period 1800 \
  --statistics Sum \
  --query 'Datapoints[0].Sum' \
  --output text)
echo "   Total 5xx: ${API_ERRORS:-0}"

echo ""
echo "4. DynamoDB Throttles:"
DB_THROTTLES=$(aws cloudwatch get-metric-statistics \
  --namespace AWS/DynamoDB \
  --metric-name ThrottledRequests \
  --dimensions Name=TableName,Value=$TABLE_NAME \
  --start-time $START_TIME \
  --end-time $END_TIME \
  --period 1800 \
  --statistics Sum \
  --query 'Datapoints[0].Sum' \
  --output text)
echo "   Total Throttles: ${DB_THROTTLES:-0}"

echo ""
echo "============================================"
echo "HYPOTHESIS VALIDATION"
echo "============================================"
echo ""
echo "Kỳ vọng khi inject 50% Lambda errors:"
echo "  ✓ API Gateway nên trả về 503 (không phải crash)"
echo "  ✓ Error rate CloudWatch alarm nên trigger"
echo "  ✓ Hệ thống nên recover sau khi experiment dừng"
echo "  ✓ Retry logic nên giảm user-visible errors"
echo ""
echo "Phát hiện:"
echo "  ❓ Retry logic có hoạt động? → Xem Lambda logs"
echo "  ❓ Error handling có trả về thông báo đúng? → Test thủ công"
echo "  ❓ Recovery time bao lâu? → Xem CloudWatch timeline"
```

---

## Bảng Scenarios Và Hypothesis

| Scenario | Chaos Input | Kỳ Vọng (Pass) | Cần Cải Thiện |
|----------|-------------|----------------|---------------|
| Lambda 50% Error | FIS error injection | Error rate < 60%, alarm trigger | Retry logic, graceful degradation |
| DynamoDB Throttle | Giảm WCU xuống 1 | Lambda retry, partial success | Exponential backoff |
| Lambda Concurrency=1 | Reserved concurrency | 429 thay vì 500, queue requests | Async processing |
| Cold Start Burst | Giảm xuống 0 concurrency | First request < 5s | Provisioned concurrency |

---

## Lưu Ý

> ⚠️ **Safety First**: Luôn có `stopConditions` trong FIS template. Experiment sẽ tự dừng nếu alarm trigger.

> ⚠️ **Không chạy trên Production** cho đến khi đã thực hành nhiều lần trên dev/staging và có rollback plan rõ ràng.

> 💡 **Game Day**: Tổ chức "Chaos Game Day" định kỳ (3 tháng/lần) — cả team cùng xem chaos experiment và thực hành incident response.

> 💡 **Tip**: Sau mỗi experiment, cập nhật [runbooks.md](../../operations/reference/runbooks.md) với những gì học được.

## Tài Liệu Liên Quan

- [runbooks.md](../../operations/reference/runbooks.md) — Incident response
- [monitoring-alerting.md](../../operations/how-to/monitoring-alerting.md) — Monitor trong experiments
- [scalability-design.md](../../architecture/explanation/scalability-design.md) — Thiết kế resilient
- [AWS FIS Documentation](https://docs.aws.amazon.com/fis/latest/userguide/)
