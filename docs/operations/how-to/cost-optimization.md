---
title: "Cost Optimization"
category: How-To
domain: Operations
difficulty: Dễ
reading_time: 45 phút
last_updated: 2026-06-12
tags: [cost, free-tier, billing, optimization]
requirements: [Requirement 5, Requirement 16, Requirement 18]
---
***
*Breadcrumbs: [Trang chủ Well-Architected](../../README.md) > [Chỉ mục](../../index.md) > [Operations](../../index.md#operations) > How-To*
***

# Hướng Dẫn Tối Ưu Chi Phí AWS Serverless

## Vấn đề

Kiến trúc AWS Serverless hiện tại thiếu các cơ chế giám sát và tối ưu chi phí:
- Không có Billing Alerts để cảnh báo khi vượt ngân sách
- Lambda memory chưa được right-size dựa trên actual usage
- DynamoDB capacity chưa được optimize (fixed Provisioned Capacity)
- Thiếu monitoring để tránh vượt Free Tier limits

**Rủi ro**: Chi phí có thể tăng đột ngột mà không được phát hiện kịp thời

## Giải pháp

Triển khai chiến lược tối ưu chi phí 4 lớp:
1. **Monitoring & Alerts**: Thiết lập cảnh báo chi phí
2. **Right-sizing**: Optimize Lambda memory và DynamoDB capacity
3. **Free Tier Optimization**: Maximize Free Tier usage
4. **Cost Analysis**: Phân tích và dự báo chi phí

**Free Tier**: Có - Tất cả giải pháp trong Free Tier

**Ước tính chi phí**: $0/tháng (nếu trong Free Tier limits)

## Điều kiện tiên quyết

- AWS CLI version 2.x
- Quyền truy cập CloudWatch, Cost Explorer, Budgets
- Node.js 18+ (cho scripts)
- Hiểu biết về Lambda, DynamoDB pricing

## Các bước thực hiện

### 1. Thiết lập AWS Billing Alerts

```bash
# Enable Billing Alerts (chỉ cần làm 1 lần)
aws ce put-cost-allocation-tags \
  --cost-allocation-tags-status Status=Active

# Tạo SNS topic cho alerts
aws sns create-topic --name billing-alerts

# Subscribe email
aws sns subscribe \
  --topic-arn arn:aws:sns:us-east-1:ACCOUNT_ID:billing-alerts \
  --protocol email \
  --notification-endpoint your-email@example.com

# Tạo Budget với alert
aws budgets create-budget \
  --account-id ACCOUNT_ID \
  --budget file://budget.json \
  --notifications-with-subscribers file://notifications.json
```

**budget.json**:
```json
{
  "BudgetName": "MonthlyBudget",
  "BudgetType": "COST",
  "TimeUnit": "MONTHLY",
  "BudgetLimit": {
    "Amount": "10",
    "Unit": "USD"
  },
  "CostFilters": {},
  "CostTypes": {
    "IncludeTax": true,
    "IncludeSubscription": true,
    "UseBlended": false
  }
}
```

**notifications.json**:
```json
[
  {
    "Notification": {
      "NotificationType": "ACTUAL",
      "ComparisonOperator": "GREATER_THAN",
      "Threshold": 80,
      "ThresholdType": "PERCENTAGE"
    },
    "Subscribers": [
      {
        "SubscriptionType": "SNS",
        "Address": "arn:aws:sns:us-east-1:ACCOUNT_ID:billing-alerts"
      }
    ]
  }
]
```

**Kết quả**: Nhận email khi chi phí đạt 80% budget ($8)

### 2. Right-size Lambda Memory

```typescript
// Script để analyze Lambda metrics và recommend optimal memory
import { CloudWatchClient, GetMetricStatisticsCommand } from "@aws-sdk/client-cloudwatch";
import { LambdaClient, ListFunctionsCommand, UpdateFunctionConfigurationCommand } from "@aws-sdk/client-lambda";

const cloudwatch = new CloudWatchClient({ region: "us-east-1" });
const lambda = new LambdaClient({ region: "us-east-1" });

async function analyzeLambdaMemory(functionName: string) {
  // Get max memory used in last 7 days
  const params = {
    Namespace: "AWS/Lambda",
    MetricName: "MaxMemoryUsed",
    Dimensions: [{ Name: "FunctionName", Value: functionName }],
    StartTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    EndTime: new Date(),
    Period: 3600,
    Statistics: ["Maximum"]
  };

  const data = await cloudwatch.send(new GetMetricStatisticsCommand(params));
  const maxMemoryUsed = Math.max(...data.Datapoints!.map(d => d.Maximum!));
  
  // Recommend memory = maxUsed * 1.2 (20% buffer)
  const recommendedMemory = Math.ceil(maxMemoryUsed * 1.2 / 64) * 64; // Round to 64MB
  
  console.log(`Function: ${functionName}`);
  console.log(`Max Memory Used: ${maxMemoryUsed}MB`);
  console.log(`Recommended Memory: ${recommendedMemory}MB`);
  
  return recommendedMemory;
}

// Run for all functions
const functions = await lambda.send(new ListFunctionsCommand({}));
for (const func of functions.Functions!) {
  const recommended = await analyzeLambdaMemory(func.FunctionName!);
  
  // Update if different
  if (func.MemorySize !== recommended) {
    await lambda.send(new UpdateFunctionConfigurationCommand({
      FunctionName: func.FunctionName,
      MemorySize: recommended
    }));
    console.log(`Updated ${func.FunctionName} to ${recommended}MB`);
  }
}
```

**Kết quả**: Giảm 20-40% chi phí Lambda bằng cách right-size memory

### 3. Optimize DynamoDB Capacity

```bash
# Enable DynamoDB Auto Scaling
aws application-autoscaling register-scalable-target \
  --service-namespace dynamodb \
  --resource-id table/EventsTable \
  --scalable-dimension dynamodb:table:ReadCapacityUnits \
  --min-capacity 1 \
  --max-capacity 10

aws application-autoscaling put-scaling-policy \
  --service-namespace dynamodb \
  --resource-id table/EventsTable \
  --scalable-dimension dynamodb:table:ReadCapacityUnits \
  --policy-name EventsTableReadScaling \
  --policy-type TargetTrackingScaling \
  --target-tracking-scaling-policy-configuration '{
    "TargetValue": 70.0,
    "PredefinedMetricSpecification": {
      "PredefinedMetricType": "DynamoDBReadCapacityUtilization"
    }
  }'

# Repeat for WriteCapacityUnits
```

**Kết quả**: DynamoDB tự động scale, giảm chi phí khi traffic thấp

### 4. Monitor Free Tier Usage

```typescript
// Script để check Free Tier usage
import { CostExplorerClient, GetCostAndUsageCommand } from "@aws-sdk/client-cost-explorer";

const ce = new CostExplorerClient({ region: "us-east-1" });

async function checkFreeTierUsage() {
  const params = {
    TimePeriod: {
      Start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      End: new Date().toISOString().split('T')[0]
    },
    Granularity: "MONTHLY",
    Metrics: ["UsageQuantity"],
    GroupBy: [{ Type: "DIMENSION", Key: "SERVICE" }]
  };

  const data = await ce.send(new GetCostAndUsageCommand(params));
  
  // Free Tier limits
  const limits = {
    "AWS Lambda": { limit: 1000000, unit: "requests" },
    "Amazon DynamoDB": { limit: 25, unit: "GB-storage" },
    "Amazon API Gateway": { limit: 1000000, unit: "requests" },
    "Amazon CloudFront": { limit: 50, unit: "GB-transfer" }
  };

  for (const result of data.ResultsByTime!) {
    for (const group of result.Groups!) {
      const service = group.Keys![0];
      const usage = parseFloat(group.Metrics!.UsageQuantity.Amount);
      
      if (limits[service]) {
        const percent = (usage / limits[service].limit) * 100;
        console.log(`${service}: ${usage.toFixed(2)} / ${limits[service].limit} ${limits[service].unit} (${percent.toFixed(1)}%)`);
        
        if (percent > 80) {
          console.warn(`⚠️ WARNING: ${service} at ${percent.toFixed(1)}% of Free Tier`);
        }
      }
    }
  }
}

checkFreeTierUsage();
```

**Kết quả**: Biết được usage % của Free Tier, tránh vượt limits

### 5. Implement Cost Tagging Strategy

```bash
# Tag all resources với Environment và Project
aws lambda tag-resource \
  --resource arn:aws:lambda:us-east-1:ACCOUNT_ID:function:getEvents \
  --tags Environment=production,Project=event-app,CostCenter=engineering

aws dynamodb tag-resource \
  --resource-arn arn:aws:dynamodb:us-east-1:ACCOUNT_ID:table/EventsTable \
  --tags Environment=production,Project=event-app,CostCenter=engineering

# Enable Cost Allocation Tags
aws ce put-cost-allocation-tags \
  --cost-allocation-tags-status Status=Active \
  --cost-allocation-tags Key=Environment,Status=Active Key=Project,Status=Active
```

**Kết quả**: Có thể track chi phí theo Environment, Project, CostCenter

## Best Practices

1. ✅ **Set Budgets**: Tạo budgets cho từng environment (dev, staging, prod)
2. ✅ **Right-size Resources**: Review Lambda memory và DynamoDB capacity hàng tháng
3. ✅ **Use Reserved Capacity**: Nếu traffic stable, consider DynamoDB Reserved Capacity (giảm 50-75%)
4. ✅ **Enable Auto Scaling**: DynamoDB auto-scaling để tránh over-provisioning
5. ✅ **Monitor Free Tier**: Check Free Tier usage hàng tuần
6. ✅ **Delete Unused Resources**: Xóa old Lambda versions, unused S3 objects
7. ✅ **Use S3 Lifecycle Policies**: Archive old data sang S3 Glacier
8. ✅ **Optimize CloudWatch Logs**: Set retention period (7 days thay vì never expire)
9. ✅ **Use Cost Explorer**: Analyze chi phí trends hàng tháng
10. ✅ **Tag Everything**: Tag tất cả resources để track chi phí

## Xác minh

```bash
# Check current month cost
aws ce get-cost-and-usage \
  --time-period Start=2024-01-01,End=2024-01-31 \
  --granularity MONTHLY \
  --metrics BlendedCost

# Check Free Tier usage
aws freetier get-free-tier-usage

# List all budgets
aws budgets describe-budgets --account-id ACCOUNT_ID
```




## Bước tiếp theo

- [Right-size Lambda/DynamoDB](../../architecture/explanation/scalability-design.md)
- [Thiết lập billing alarms](monitoring-alerting.md)

## Tài liệu liên quan

- [Monitoring & Alerting](monitoring-alerting.md)
- [Scalability Design](../../architecture/explanation/scalability-design.md)
- [Well-Architected Assessment](../../well-architected-assessment.md)

---

**Metadata**:
- **Requirements**: Requirement 5, Requirement 16, Requirement 17, Requirement 18
- **Category**: How-To
- **Domain**: Operations
- **Tags**: cost, optimization, free-tier, budgets, right-sizing
- **Last Updated**: 2026-06-12
- **Free Tier Compatible**: Yes
- **Difficulty**: Dễ
- **Estimated Reading/Implementation Time**: 45 phút