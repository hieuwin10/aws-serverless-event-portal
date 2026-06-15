---
title: "Monitoring & Alerting với CloudWatch"
category: How-To
domain: Operations
difficulty: Trung bình
reading_time: 1.5 giờ
last_updated: 2026-06-12
tags: [cloudwatch, monitoring, alarms, sns]
requirements: [Requirement 6, Requirement 16, Requirement 17, Requirement 18]
---
***
*Breadcrumbs: [Trang chủ Well-Architected](../../README.md) > [Chỉ mục](../../index.md) > [Operations](../../index.md#operations) > How-To*
***

# Giám Sát và Cảnh Báo Toàn Diện

## Vấn đề

Kiến trúc hiện tại thiếu hệ thống giám sát đầy đủ:
- **Không có CloudWatch Alarms** — không nhận được cảnh báo khi có lỗi
- **Không có Dashboard** — không thấy được tình trạng hệ thống theo thời gian thực
- **Thiếu custom metrics** — chỉ dùng default metrics, thiếu business metrics
- **Log chưa được tổng hợp** — khó debug khi có sự cố liên quan đến nhiều services
- **Không có SNS notifications** — ops team không được thông báo khi có incident

## Giải pháp

Thiết lập hệ thống giám sát 4 lớp:
1. **CloudWatch Alarms** cho 10 metrics quan trọng nhất
2. **CloudWatch Dashboard** để visualize toàn bộ hệ thống
3. **Custom Metrics** từ Lambda functions (business metrics)
4. **Log Aggregation** với Lambda log processor

## Điều kiện tiên quyết

- AWS CLI đã cài đặt và cấu hình
- Lambda functions, DynamoDB table, API Gateway đã triển khai
- Email/SMS để nhận SNS notifications
- IAM permissions: `cloudwatch:*`, `logs:*`, `sns:*`

> 💰 **Free Tier**: 10 custom metrics, 10 alarms, 5 GB log ingestion — **miễn phí**. Vượt quá: $0.30/alarm/month, $0.02/GB log ingestion.

---

## Bước 1: Triển Khai CloudWatch Alarms Qua CloudFormation

```yaml
# monitoring-alarms.yaml
AWSTemplateFormatVersion: '2010-09-09'
Description: 'CloudWatch Alarms cho AWS Serverless Event Portal'

Parameters:
  Environment:
    Type: String
    Default: dev
  AlertEmail:
    Type: String
    Description: 'Email nhận cảnh báo'
    Default: 'ops@example.com'
  LambdaFunctionNames:
    Type: CommaDelimitedList
    Default: 'getEvents,createEvent,updateEvent,deleteEvent,registerEvent'
    Description: 'Danh sách Lambda function names'
  DynamoDBTableName:
    Type: String
    Default: 'EventsTable'
  ApiGatewayName:
    Type: String
    Default: 'EventPortalAPI'

Resources:
  # SNS Topic để gửi thông báo
  AlertTopic:
    Type: AWS::SNS::Topic
    Properties:
      TopicName: !Sub 'event-portal-alerts-${Environment}'
      DisplayName: 'Event Portal Alerts'
      Subscriptions:
        - Protocol: email
          Endpoint: !Ref AlertEmail

  # ==================================================
  # ALARM 1: Lambda Error Rate cao
  # ==================================================
  LambdaErrorAlarm:
    Type: AWS::CloudWatch::Alarm
    Properties:
      AlarmName: !Sub 'Lambda-HighErrorRate-${Environment}'
      AlarmDescription: 'Lambda error rate vượt 5% trong 5 phút'
      Namespace: AWS/Lambda
      MetricName: Errors
      Statistic: Sum
      Period: 300          # 5 phút
      EvaluationPeriods: 2 # 2 lần liên tiếp
      Threshold: 10        # 10 errors trong 5 phút
      ComparisonOperator: GreaterThanThreshold
      TreatMissingData: notBreaching
      AlarmActions:
        - !Ref AlertTopic
      OKActions:
        - !Ref AlertTopic
      Dimensions:
        - Name: FunctionName
          Value: getEvents  # Alarm riêng cho function quan trọng nhất

  # ==================================================
  # ALARM 2: Lambda Throttles
  # ==================================================
  LambdaThrottleAlarm:
    Type: AWS::CloudWatch::Alarm
    Properties:
      AlarmName: !Sub 'Lambda-Throttles-${Environment}'
      AlarmDescription: 'Lambda bị throttle — cần tăng concurrency limit'
      Namespace: AWS/Lambda
      MetricName: Throttles
      Statistic: Sum
      Period: 60
      EvaluationPeriods: 3
      Threshold: 5
      ComparisonOperator: GreaterThanThreshold
      TreatMissingData: notBreaching
      AlarmActions:
        - !Ref AlertTopic

  # ==================================================
  # ALARM 3: Lambda Duration gần đến timeout
  # ==================================================
  LambdaDurationAlarm:
    Type: AWS::CloudWatch::Alarm
    Properties:
      AlarmName: !Sub 'Lambda-HighDuration-${Environment}'
      AlarmDescription: 'Lambda execution time > 25s (timeout = 30s)'
      Namespace: AWS/Lambda
      MetricName: Duration
      Statistic: p99           # 99th percentile
      Period: 300
      EvaluationPeriods: 2
      Threshold: 25000         # 25 giây (milliseconds)
      ComparisonOperator: GreaterThanThreshold
      TreatMissingData: notBreaching
      AlarmActions:
        - !Ref AlertTopic

  # ==================================================
  # ALARM 4: DynamoDB Read Throttles
  # ==================================================
  DynamoDBReadThrottleAlarm:
    Type: AWS::CloudWatch::Alarm
    Properties:
      AlarmName: !Sub 'DynamoDB-ReadThrottles-${Environment}'
      AlarmDescription: 'DynamoDB bị throttle đọc — RCU không đủ'
      Namespace: AWS/DynamoDB
      MetricName: ReadThrottleEvents
      Statistic: Sum
      Period: 60
      EvaluationPeriods: 2
      Threshold: 1
      ComparisonOperator: GreaterThanOrEqualToThreshold
      TreatMissingData: notBreaching
      AlarmActions:
        - !Ref AlertTopic
      Dimensions:
        - Name: TableName
          Value: !Ref DynamoDBTableName

  # ==================================================
  # ALARM 5: DynamoDB Write Throttles
  # ==================================================
  DynamoDBWriteThrottleAlarm:
    Type: AWS::CloudWatch::Alarm
    Properties:
      AlarmName: !Sub 'DynamoDB-WriteThrottles-${Environment}'
      AlarmDescription: 'DynamoDB bị throttle ghi — WCU không đủ'
      Namespace: AWS/DynamoDB
      MetricName: WriteThrottleEvents
      Statistic: Sum
      Period: 60
      EvaluationPeriods: 2
      Threshold: 1
      ComparisonOperator: GreaterThanOrEqualToThreshold
      TreatMissingData: notBreaching
      AlarmActions:
        - !Ref AlertTopic
      Dimensions:
        - Name: TableName
          Value: !Ref DynamoDBTableName

  # ==================================================
  # ALARM 6: API Gateway 4xx Errors
  # ==================================================
  ApiGateway4xxAlarm:
    Type: AWS::CloudWatch::Alarm
    Properties:
      AlarmName: !Sub 'APIGateway-4xxErrors-${Environment}'
      AlarmDescription: 'API 4xx error rate > 10% — lỗi client hoặc auth'
      Namespace: AWS/ApiGateway
      MetricName: 4XXError
      Statistic: Average
      Period: 300
      EvaluationPeriods: 2
      Threshold: 0.1           # 10%
      ComparisonOperator: GreaterThanThreshold
      TreatMissingData: notBreaching
      AlarmActions:
        - !Ref AlertTopic
      Dimensions:
        - Name: ApiName
          Value: !Ref ApiGatewayName

  # ==================================================
  # ALARM 7: API Gateway 5xx Errors
  # ==================================================
  ApiGateway5xxAlarm:
    Type: AWS::CloudWatch::Alarm
    Properties:
      AlarmName: !Sub 'APIGateway-5xxErrors-${Environment}'
      AlarmDescription: 'API 5xx errors — lỗi server nghiêm trọng'
      Namespace: AWS/ApiGateway
      MetricName: 5XXError
      Statistic: Sum
      Period: 60
      EvaluationPeriods: 2
      Threshold: 5
      ComparisonOperator: GreaterThanThreshold
      TreatMissingData: notBreaching
      AlarmActions:
        - !Ref AlertTopic
      Dimensions:
        - Name: ApiName
          Value: !Ref ApiGatewayName

  # ==================================================
  # ALARM 8: API Gateway Latency cao
  # ==================================================
  ApiGatewayLatencyAlarm:
    Type: AWS::CloudWatch::Alarm
    Properties:
      AlarmName: !Sub 'APIGateway-HighLatency-${Environment}'
      AlarmDescription: 'API p99 latency > 3 giây'
      Namespace: AWS/ApiGateway
      MetricName: IntegrationLatency
      ExtendedStatistic: p99
      Period: 300
      EvaluationPeriods: 2
      Threshold: 3000          # 3 giây (milliseconds)
      ComparisonOperator: GreaterThanThreshold
      TreatMissingData: notBreaching
      AlarmActions:
        - !Ref AlertTopic

  # ==================================================
  # ALARM 9: CloudFront Error Rate
  # ==================================================
  CloudFrontErrorAlarm:
    Type: AWS::CloudWatch::Alarm
    Properties:
      AlarmName: !Sub 'CloudFront-ErrorRate-${Environment}'
      AlarmDescription: 'CloudFront error rate > 5%'
      Namespace: AWS/CloudFront
      MetricName: TotalErrorRate
      Statistic: Average
      Period: 300
      EvaluationPeriods: 2
      Threshold: 5
      ComparisonOperator: GreaterThanThreshold
      TreatMissingData: notBreaching
      AlarmActions:
        - !Ref AlertTopic

  # ==================================================
  # ALARM 10: AWS Billing Alert
  # ==================================================
  BillingAlarm:
    Type: AWS::CloudWatch::Alarm
    Properties:
      AlarmName: !Sub 'AWS-Billing-Alert-${Environment}'
      AlarmDescription: 'Chi phí AWS dự kiến vượt $10/tháng'
      Namespace: AWS/Billing
      MetricName: EstimatedCharges
      Statistic: Maximum
      Period: 86400            # 1 ngày
      EvaluationPeriods: 1
      Threshold: 10            # $10 USD
      ComparisonOperator: GreaterThanThreshold
      TreatMissingData: notBreaching
      AlarmActions:
        - !Ref AlertTopic
      Dimensions:
        - Name: Currency
          Value: USD

Outputs:
  AlertTopicArn:
    Value: !Ref AlertTopic
    Export:
      Name: !Sub '${AWS::StackName}-AlertTopicArn'
```

**Triển khai:**
```bash
aws cloudformation deploy \
  --template-file monitoring-alarms.yaml \
  --stack-name event-portal-monitoring-dev \
  --parameter-overrides \
    Environment=dev \
    AlertEmail=your-email@example.com \
    DynamoDBTableName=EventsTable \
    ApiGatewayName=EventPortalAPI \
  --capabilities CAPABILITY_IAM

# Confirm SNS subscription — kiểm tra email và click "Confirm subscription"
```

---

## Bước 2: Tạo CloudWatch Dashboard

```bash
#!/bin/bash
# Tạo dashboard từ JSON config
DASHBOARD_NAME="EventPortal-Dashboard"
REGION="us-east-1"

aws cloudwatch put-dashboard \
  --dashboard-name $DASHBOARD_NAME \
  --dashboard-body '{
  "widgets": [
    {
      "type": "text",
      "x": 0, "y": 0, "width": 24, "height": 1,
      "properties": {
        "markdown": "# 🚀 AWS Event Portal — Monitoring Dashboard"
      }
    },
    {
      "type": "alarm",
      "x": 0, "y": 1, "width": 24, "height": 2,
      "properties": {
        "title": "🚨 Trạng Thái Cảnh Báo",
        "alarms": [
          "arn:aws:cloudwatch:us-east-1:ACCOUNT_ID:alarm:Lambda-HighErrorRate-dev",
          "arn:aws:cloudwatch:us-east-1:ACCOUNT_ID:alarm:Lambda-Throttles-dev",
          "arn:aws:cloudwatch:us-east-1:ACCOUNT_ID:alarm:DynamoDB-ReadThrottles-dev",
          "arn:aws:cloudwatch:us-east-1:ACCOUNT_ID:alarm:APIGateway-5xxErrors-dev",
          "arn:aws:cloudwatch:us-east-1:ACCOUNT_ID:alarm:AWS-Billing-Alert-dev"
        ]
      }
    },
    {
      "type": "metric",
      "x": 0, "y": 3, "width": 12, "height": 6,
      "properties": {
        "title": "Lambda — Errors & Throttles",
        "view": "timeSeries",
        "stacked": false,
        "period": 300,
        "stat": "Sum",
        "metrics": [
          ["AWS/Lambda", "Errors", "FunctionName", "getEvents", {"label": "getEvents Errors", "color": "#d62728"}],
          ["AWS/Lambda", "Errors", "FunctionName", "createEvent", {"label": "createEvent Errors", "color": "#ff7f0e"}],
          ["AWS/Lambda", "Throttles", "FunctionName", "getEvents", {"label": "getEvents Throttles", "color": "#9467bd", "yAxis": "right"}]
        ],
        "yAxis": {
          "left": {"label": "Error Count", "min": 0},
          "right": {"label": "Throttle Count", "min": 0}
        }
      }
    },
    {
      "type": "metric",
      "x": 12, "y": 3, "width": 12, "height": 6,
      "properties": {
        "title": "Lambda — Duration (p50, p95, p99)",
        "view": "timeSeries",
        "period": 300,
        "metrics": [
          ["AWS/Lambda", "Duration", "FunctionName", "getEvents", {"stat": "p50", "label": "p50", "color": "#2ca02c"}],
          ["AWS/Lambda", "Duration", "FunctionName", "getEvents", {"stat": "p95", "label": "p95", "color": "#ff7f0e"}],
          ["AWS/Lambda", "Duration", "FunctionName", "getEvents", {"stat": "p99", "label": "p99", "color": "#d62728"}]
        ],
        "yAxis": {"left": {"label": "Duration (ms)", "min": 0}}
      }
    },
    {
      "type": "metric",
      "x": 0, "y": 9, "width": 12, "height": 6,
      "properties": {
        "title": "DynamoDB — Consumed Capacity",
        "view": "timeSeries",
        "period": 60,
        "metrics": [
          ["AWS/DynamoDB", "ConsumedReadCapacityUnits", "TableName", "EventsTable", {"stat": "Sum", "label": "RCU Used", "color": "#1f77b4"}],
          ["AWS/DynamoDB", "ConsumedWriteCapacityUnits", "TableName", "EventsTable", {"stat": "Sum", "label": "WCU Used", "color": "#ff7f0e"}],
          ["AWS/DynamoDB", "ReadThrottleEvents", "TableName", "EventsTable", {"stat": "Sum", "label": "Read Throttles", "color": "#d62728", "yAxis": "right"}],
          ["AWS/DynamoDB", "WriteThrottleEvents", "TableName", "EventsTable", {"stat": "Sum", "label": "Write Throttles", "color": "#9467bd", "yAxis": "right"}]
        ]
      }
    },
    {
      "type": "metric",
      "x": 12, "y": 9, "width": 12, "height": 6,
      "properties": {
        "title": "API Gateway — Requests & Latency",
        "view": "timeSeries",
        "period": 300,
        "metrics": [
          ["AWS/ApiGateway", "Count", "ApiName", "EventPortalAPI", {"stat": "Sum", "label": "Total Requests", "color": "#1f77b4"}],
          ["AWS/ApiGateway", "4XXError", "ApiName", "EventPortalAPI", {"stat": "Sum", "label": "4xx Errors", "color": "#ff7f0e"}],
          ["AWS/ApiGateway", "5XXError", "ApiName", "EventPortalAPI", {"stat": "Sum", "label": "5xx Errors", "color": "#d62728"}],
          ["AWS/ApiGateway", "Latency", "ApiName", "EventPortalAPI", {"stat": "p99", "label": "p99 Latency (ms)", "yAxis": "right", "color": "#9467bd"}]
        ]
      }
    },
    {
      "type": "metric",
      "x": 0, "y": 15, "width": 12, "height": 6,
      "properties": {
        "title": "Business Metrics — Custom",
        "view": "timeSeries",
        "period": 300,
        "metrics": [
          ["EventPortal/Business", "EventsCreated", {"stat": "Sum", "label": "Events Created", "color": "#2ca02c"}],
          ["EventPortal/Business", "Registrations", {"stat": "Sum", "label": "Registrations", "color": "#1f77b4"}],
          ["EventPortal/Auth", "SuccessfulLogins", {"stat": "Sum", "label": "Successful Logins", "color": "#9467bd"}]
        ]
      }
    },
    {
      "type": "metric",
      "x": 12, "y": 15, "width": 12, "height": 6,
      "properties": {
        "title": "Chi Phí AWS (USD)",
        "view": "timeSeries",
        "period": 86400,
        "metrics": [
          ["AWS/Billing", "EstimatedCharges", "Currency", "USD", {"stat": "Maximum", "label": "Estimated Cost ($)", "color": "#d62728"}]
        ]
      }
    }
  ]
}'

echo "Dashboard created: https://${REGION}.console.aws.amazon.com/cloudwatch/home?region=${REGION}#dashboards:name=${DASHBOARD_NAME}"
```

---

## Bước 3: Custom Metrics Từ Lambda (TypeScript)

File: `backend/src/utils/metrics.ts`

```typescript
import {
  CloudWatchClient,
  PutMetricDataCommand,
  MetricDatum,
} from '@aws-sdk/client-cloudwatch';

const cloudwatch = new CloudWatchClient({ region: process.env.AWS_REGION });
const NAMESPACE = 'EventPortal/Business';
const ENVIRONMENT = process.env.ENVIRONMENT || 'dev';

// Helper function để gửi metrics
async function publishMetrics(metrics: MetricDatum[]): Promise<void> {
  try {
    await cloudwatch.send(
      new PutMetricDataCommand({
        Namespace: NAMESPACE,
        MetricData: metrics.map((m) => ({
          ...m,
          Dimensions: [
            ...(m.Dimensions || []),
            { Name: 'Environment', Value: ENVIRONMENT },
          ],
        })),
      })
    );
  } catch (error) {
    // Không throw error để không ảnh hưởng business logic
    console.error('[Metrics] Failed to publish:', error);
  }
}

// ---- Business metrics ----

export async function trackEventCreated(eventId: string): Promise<void> {
  await publishMetrics([
    {
      MetricName: 'EventsCreated',
      Value: 1,
      Unit: 'Count',
      Dimensions: [{ Name: 'Action', Value: 'Create' }],
    },
  ]);
}

export async function trackRegistration(
  eventId: string,
  status: 'success' | 'failed'
): Promise<void> {
  await publishMetrics([
    {
      MetricName: 'Registrations',
      Value: 1,
      Unit: 'Count',
      Dimensions: [{ Name: 'Status', Value: status }],
    },
  ]);
}

export async function trackAPILatency(
  endpoint: string,
  durationMs: number
): Promise<void> {
  await publishMetrics([
    {
      MetricName: 'APILatency',
      Value: durationMs,
      Unit: 'Milliseconds',
      Dimensions: [{ Name: 'Endpoint', Value: endpoint }],
    },
  ]);
}

// Middleware pattern cho Lambda
export function withMetrics<T>(
  fn: () => Promise<T>,
  metricName: string
): Promise<T> {
  const start = Date.now();
  return fn()
    .then(async (result) => {
      await publishMetrics([
        {
          MetricName: `${metricName}Success`,
          Value: 1,
          Unit: 'Count',
        },
        {
          MetricName: `${metricName}Duration`,
          Value: Date.now() - start,
          Unit: 'Milliseconds',
        },
      ]);
      return result;
    })
    .catch(async (error) => {
      await publishMetrics([
        {
          MetricName: `${metricName}Error`,
          Value: 1,
          Unit: 'Count',
        },
      ]);
      throw error;
    });
}
```

**Sử dụng trong Lambda handler:**
```typescript
// backend/src/functions/createEvent/index.ts
import { trackEventCreated, withMetrics } from '../../utils/metrics';

export const handler = async (event: APIGatewayProxyEvent) => {
  return withMetrics(async () => {
    const body = JSON.parse(event.body || '{}');

    // Business logic tạo event
    const newEvent = await createEventInDynamoDB(body);

    // Track custom metric
    await trackEventCreated(newEvent.id);

    return {
      statusCode: 201,
      body: JSON.stringify(newEvent),
    };
  }, 'CreateEvent');
};
```

---

## Bước 4: Log Aggregation với Lambda

File: `backend/src/functions/log-aggregator/index.ts`

```typescript
import { CloudWatchLogsEvent, CloudWatchLogsDecodedData } from 'aws-lambda';
import { gunzipSync } from 'zlib';
import {
  CloudWatchClient,
  PutMetricDataCommand,
} from '@aws-sdk/client-cloudwatch';

const cloudwatch = new CloudWatchClient({ region: process.env.AWS_REGION });

interface LogEvent {
  timestamp: number;
  message: string;
}

export const handler = async (event: CloudWatchLogsEvent): Promise<void> => {
  // Decode và decompress CloudWatch Logs data
  const payload = Buffer.from(event.awslogs.data, 'base64');
  const decompressed = gunzipSync(payload).toString('utf-8');
  const logData: CloudWatchLogsDecodedData = JSON.parse(decompressed);

  console.log(`Processing ${logData.logEvents.length} log events from ${logData.logGroup}`);

  const errorCount = { errors: 0, warnings: 0, timeouts: 0 };

  for (const logEvent of logData.logEvents) {
    const msg = logEvent.message;

    // Đếm errors
    if (msg.includes('ERROR') || msg.includes('Error')) {
      errorCount.errors++;
    }

    // Đếm warnings
    if (msg.includes('WARN') || msg.includes('Warning')) {
      errorCount.warnings++;
    }

    // Đếm timeouts
    if (msg.includes('Task timed out') || msg.includes('TimeoutError')) {
      errorCount.timeouts++;
    }

    // Log structured errors để dễ search
    if (msg.includes('ERROR')) {
      console.error(JSON.stringify({
        source: logData.logGroup,
        stream: logData.logStream,
        timestamp: new Date(logEvent.timestamp).toISOString(),
        message: msg.substring(0, 500), // Giới hạn 500 chars
      }));
    }
  }

  // Publish aggregated metrics
  if (errorCount.errors > 0 || errorCount.timeouts > 0) {
    await cloudwatch.send(
      new PutMetricDataCommand({
        Namespace: 'EventPortal/Logs',
        MetricData: [
          {
            MetricName: 'AggregatedErrors',
            Value: errorCount.errors,
            Unit: 'Count',
            Dimensions: [{ Name: 'LogGroup', Value: logData.logGroup }],
          },
          {
            MetricName: 'AggregatedTimeouts',
            Value: errorCount.timeouts,
            Unit: 'Count',
            Dimensions: [{ Name: 'LogGroup', Value: logData.logGroup }],
          },
        ],
      })
    );
  }
};
```

**Thiết lập Log Subscription Filter:**
```bash
#!/bin/bash
# Lấy Log Aggregator Lambda ARN
AGGREGATOR_ARN=$(aws lambda get-function \
  --function-name log-aggregator-dev \
  --query 'Configuration.FunctionArn' \
  --output text)

# Subscribe Lambda log groups vào aggregator
for FUNCTION in getEvents createEvent updateEvent deleteEvent registerEvent; do
  LOG_GROUP="/aws/lambda/${FUNCTION}"
  
  echo "Adding subscription filter for ${LOG_GROUP}..."
  
  aws logs put-subscription-filter \
    --log-group-name $LOG_GROUP \
    --filter-name "ErrorAggregation" \
    --filter-pattern "ERROR" \
    --destination-arn $AGGREGATOR_ARN
  
  # Cho phép CloudWatch Logs invoke Lambda
  aws lambda add-permission \
    --function-name log-aggregator-dev \
    --statement-id "AllowCloudWatchLogs-${FUNCTION}" \
    --action lambda:InvokeFunction \
    --principal logs.amazonaws.com \
    --source-arn "arn:aws:logs:us-east-1:$(aws sts get-caller-identity --query Account --output text):log-group:${LOG_GROUP}:*" \
    2>/dev/null || true  # Bỏ qua nếu permission đã tồn tại
    
done

echo "Log aggregation setup complete!"
```

---

## Bước 5: Kiểm Tra Hệ Thống Giám Sát

```bash
#!/bin/bash
echo "=== Kiểm tra CloudWatch Alarms ==="
aws cloudwatch describe-alarms \
  --alarm-name-prefix "event-portal" \
  --query 'MetricAlarms[*].{Name:AlarmName,State:StateValue,Reason:StateReason}' \
  --output table

echo ""
echo "=== Kiểm tra SNS Topic ==="
TOPIC_ARN=$(aws cloudformation describe-stacks \
  --stack-name event-portal-monitoring-dev \
  --query 'Stacks[0].Outputs[?OutputKey==`AlertTopicArn`].OutputValue' \
  --output text)

aws sns list-subscriptions-by-topic --topic-arn $TOPIC_ARN \
  --query 'Subscriptions[*].{Protocol:Protocol,Endpoint:Endpoint,Status:SubscriptionArn}'

echo ""
echo "=== Test alarm bằng cách gửi test notification ==="
aws sns publish \
  --topic-arn $TOPIC_ARN \
  --subject "TEST: Event Portal Monitoring" \
  --message "Đây là test notification từ monitoring system. Nếu bạn nhận được email này, monitoring đã hoạt động đúng."

echo ""
echo "=== Kiểm tra Dashboard ==="
aws cloudwatch list-dashboards \
  --dashboard-name-prefix "EventPortal" \
  --query 'DashboardEntries[*].{Name:DashboardName,LastModified:LastModified}'
```

---

## Bước 6: Thiết Lập Log Retention Policy

```bash
#!/bin/bash
# Giới hạn log retention để tránh vượt Free Tier (5 GB)
for FUNCTION in getEvents createEvent updateEvent deleteEvent registerEvent; do
  LOG_GROUP="/aws/lambda/${FUNCTION}"
  
  # Set retention 7 ngày (đủ để debug, tiết kiệm storage)
  aws logs put-retention-policy \
    --log-group-name $LOG_GROUP \
    --retention-in-days 7
    
  echo "Set 7-day retention for ${LOG_GROUP}"
done

# API Gateway logs
aws logs put-retention-policy \
  --log-group-name "API-Gateway-Execution-Logs_XXXXXXX/dev" \
  --retention-in-days 7
```

---

## 10 Metrics Quan Trọng Cần Giám Sát

| # | Metric | Namespace | Ngưỡng Cảnh Báo | Ý Nghĩa |
|---|--------|-----------|-----------------|---------|
| 1 | Lambda Errors | AWS/Lambda | > 10 trong 5 phút | Lambda function bị lỗi |
| 2 | Lambda Throttles | AWS/Lambda | > 5 trong 1 phút | Vượt concurrency limit |
| 3 | Lambda Duration p99 | AWS/Lambda | > 25,000 ms | Gần timeout |
| 4 | DynamoDB ReadThrottleEvents | AWS/DynamoDB | ≥ 1 | RCU không đủ |
| 5 | DynamoDB WriteThrottleEvents | AWS/DynamoDB | ≥ 1 | WCU không đủ |
| 6 | API 4XXError | AWS/ApiGateway | > 10% | Lỗi client/auth |
| 7 | API 5XXError | AWS/ApiGateway | > 5 trong 1 phút | Lỗi server nghiêm trọng |
| 8 | API Latency p99 | AWS/ApiGateway | > 3,000 ms | Hệ thống chậm |
| 9 | CloudFront TotalErrorRate | AWS/CloudFront | > 5% | Frontend có vấn đề |
| 10 | EstimatedCharges | AWS/Billing | > $10 | Chi phí vượt ngưỡng |

---

## Xác Minh

```bash
# Kiểm tra tất cả alarms ở trạng thái OK
aws cloudwatch describe-alarms \
  --state-value ALARM \
  --query 'MetricAlarms[*].AlarmName'

# Nếu có alarm đang ALARM, đây là việc cần xử lý ngay
# Xem logs của alarm cụ thể
aws cloudwatch describe-alarm-history \
  --alarm-name "Lambda-HighErrorRate-dev" \
  --history-item-type StateUpdate \
  --max-records 10
```

---

## Lưu ý

> ⚠️ **Free Tier**: Chỉ có 10 custom metrics và 10 alarms miễn phí. Template trên tạo 10 alarms — đúng giới hạn Free Tier. Khi thêm functions mới, cần cân nhắc hoặc nâng cấp.

> 💡 **Tip**: Billing alarm chỉ hoạt động ở region `us-east-1`. Nếu deploy ở region khác, vẫn phải tạo billing alarm ở `us-east-1`.




## Bước tiếp theo

- [Thiết lập runbooks cho incidents](../reference/runbooks.md)
- [Tối ưu chi phí monitoring](cost-optimization.md)

## Tài liệu liên quan

- [Runbooks](../reference/runbooks.md)
- [Cost Optimization](cost-optimization.md)
- [CloudFormation Templates](../../infrastructure/reference/cloudformation-templates.md)

---

**Metadata**:
- **Requirements**: Requirement 6, Requirement 16, Requirement 17, Requirement 18
- **Category**: How-To
- **Domain**: Operations
- **Difficulty**: Trung bình
- **Estimated Reading/Implementation Time**: 1.5 giờ
- **Last Updated**: 2026-06-12