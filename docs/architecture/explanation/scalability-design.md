# Thiết Kế Khả Năng Mở Rộng cho AWS Serverless

## Tổng quan

Khả năng mở rộng (Scalability) là khả năng hệ thống xử lý tăng trưởng traffic mà không giảm performance. Trong kiến trúc AWS Serverless, scalability được thiết kế sẵn nhưng cần cấu hình đúng để tránh bottlenecks.

## Khái niệm cơ bản

### Horizontal Scaling vs Vertical Scaling

**Horizontal Scaling**: Thêm nhiều instances (Lambda functions, DynamoDB partitions)
**Vertical Scaling**: Tăng resources của instance (Lambda memory, DynamoDB capacity)

Serverless architecture chủ yếu sử dụng **Horizontal Scaling** tự động.

### Auto Scaling

AWS tự động scale Lambda functions dựa trên số requests. DynamoDB cần cấu hình Auto Scaling.

### Cold Start

Khi Lambda function không được invoke trong một thời gian, AWS sẽ "freeze" container. Request tiếp theo sẽ gặp "cold start" (latency cao hơn).

## Tại sao quan trọng?

**Lợi ích chính:**
- Xử lý traffic spikes mà không downtime
- Tối ưu chi phí (chỉ trả tiền cho resources thực tế sử dụng)
- Cải thiện user experience (low latency)
- Đảm bảo availability cao

**Rủi ro khi bỏ qua:**
- DynamoDB throttling khi traffic tăng đột ngột
- Lambda cold starts gây latency cao
- API Gateway rate limiting block legitimate requests
- Hệ thống crash khi traffic vượt capacity

## Best Practices

### 1. Enable DynamoDB Auto Scaling

```yaml
Resources:
  EventsTable:
    Type: AWS::DynamoDB::Table
    Properties:
      TableName: EventsTable
      BillingMode: PAY_PER_REQUEST  # Hoặc PROVISIONED với Auto Scaling
      AttributeDefinitions:
        - AttributeName: PK
          AttributeType: S
        - AttributeName: SK
          AttributeType: S
      KeySchema:
        - AttributeName: PK
          KeyType: HASH
        - AttributeName: SK
          KeyType: RANGE
```

**Cách áp dụng**:
- Sử dụng PAY_PER_REQUEST cho unpredictable workloads
- Sử dụng PROVISIONED với Auto Scaling cho predictable workloads (rẻ hơn)
- Set min capacity = 1, max capacity = 10 (trong Free Tier)

### 2. Optimize Lambda Cold Starts

```typescript
// Provisioned Concurrency để giảm cold starts
import { LambdaClient, PutProvisionedConcurrencyConfigCommand } from "@aws-sdk/client-lambda";

const lambda = new LambdaClient({ region: "us-east-1" });

await lambda.send(new PutProvisionedConcurrencyConfigCommand({
  FunctionName: "getEvents",
  ProvisionedConcurrentExecutions: 2  // Giữ 2 instances warm
}));
```

**Cách áp dụng**:
- Provisioned Concurrency cho critical functions (có phí)
- Lambda warming với CloudWatch Events (miễn phí nhưng hacky)
- Optimize code để giảm cold start time (minimize dependencies)

### 3. API Gateway Throttling

```yaml
Resources:
  EventAPI:
    Type: AWS::ApiGateway::RestApi
    Properties:
      Name: EventAPI
      
  EventAPIStage:
    Type: AWS::ApiGateway::Stage
    Properties:
      RestApiId: !Ref EventAPI
      StageName: prod
      ThrottlingBurstLimit: 5000  # Max concurrent requests
      ThrottlingRateLimit: 2000   # Requests per second
      MethodSettings:
        - ResourcePath: "/*"
          HttpMethod: "*"
          ThrottlingBurstLimit: 5000
          ThrottlingRateLimit: 2000
```

**Cách áp dụng**:
- Set rate limit phù hợp với expected traffic
- Implement exponential backoff ở client side
- Use API keys để track usage per client

## Anti-patterns

### ❌ Anti-pattern 1: Fixed Provisioned Capacity

**Vấn đề**: DynamoDB với fixed capacity không scale khi traffic tăng

**Tại sao nên tránh**: Throttling errors khi vượt capacity

**Thay thế bằng**: DynamoDB Auto Scaling hoặc On-Demand mode

### ❌ Anti-pattern 2: Synchronous Processing

**Vấn đề**: Lambda xử lý synchronous tasks lâu (>30s)

**Tại sao nên tránh**: API Gateway timeout sau 30s

**Thay thế bằng**: Async processing với SQS/SNS

### ❌ Anti-pattern 3: No Caching

**Vấn đề**: Mọi request đều hit database

**Tại sao nên tránh**: Tăng latency và chi phí

**Thay thế bằng**: CloudFront caching, API Gateway caching, DynamoDB DAX

## Ví dụ thực tế

### Ví dụ 1: E-commerce Flash Sale

**Bối cảnh**: Website bán hàng có flash sale, traffic tăng từ 100 req/s lên 10,000 req/s trong 5 phút

**Thách thức**: 
- DynamoDB throttling
- Lambda cold starts
- API Gateway rate limiting

**Giải pháp**:
```yaml
# DynamoDB On-Demand mode
BillingMode: PAY_PER_REQUEST

# Lambda Provisioned Concurrency
ProvisionedConcurrentExecutions: 100

# API Gateway throttling
ThrottlingRateLimit: 10000
ThrottlingBurstLimit: 20000

# CloudFront caching
DefaultCacheBehavior:
  DefaultTTL: 300  # 5 minutes
```

**Kết quả**: Xử lý được 10,000 req/s mà không downtime, chi phí tăng 3x nhưng revenue tăng 50x

## So sánh các phương pháp

| Phương pháp | Ưu điểm | Nhược điểm | Khi nào sử dụng | Chi phí |
|-------------|---------|------------|-----------------|---------|
| DynamoDB On-Demand | Auto-scale, không cần config | Đắt hơn Provisioned 25% | Unpredictable traffic | Paid |
| DynamoDB Provisioned + Auto Scaling | Rẻ hơn On-Demand | Cần config, có delay khi scale | Predictable traffic | Free Tier available |
| Lambda Provisioned Concurrency | Không cold start | Đắt ($0.015/GB-hour) | Critical low-latency functions | Paid |
| Lambda Warming | Miễn phí | Hacky, không reliable | Non-critical functions | Free |
| API Gateway Caching | Giảm backend load | Có phí ($0.02/GB-hour) | Read-heavy APIs | Paid |
| CloudFront Caching | Giảm latency, miễn phí | Stale data | Static/semi-static content | Free Tier |

## Tài liệu liên quan

### How-To Guides
- [DynamoDB Auto Scaling Setup](../../operations/how-to/dynamodb-autoscaling.md)
- [Lambda Performance Optimization](../../operations/how-to/lambda-optimization.md)

### Reference
- [Architecture Decisions](../reference/architecture-decisions.md)

### AWS Documentation
- [DynamoDB Auto Scaling](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/AutoScaling.html)
- [Lambda Scaling](https://docs.aws.amazon.com/lambda/latest/dg/invocation-scaling.html)

---

**Lưu ý về Free Tier**: 
- DynamoDB Provisioned: 25 RCU/WCU miễn phí
- Lambda: 1M requests/month miễn phí
- API Gateway: 1M requests/month miễn phí (12 tháng đầu)
- Provisioned Concurrency, API Gateway Caching có phí

**Cập nhật lần cuối**: 2024-01-15
