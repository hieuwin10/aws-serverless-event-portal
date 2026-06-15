---
title: "CloudFormation/SAM Templates Reference"
category: Reference
domain: Infrastructure
difficulty: Khó
reading_time: 2 giờ
last_updated: 2026-06-12
tags: [cloudformation, sam, iac, templates]
requirements: [Requirement 9, Requirement 16, Requirement 17, Requirement 18]
---
***
*Breadcrumbs: [Trang chủ Well-Architected](../../README.md) > [Chỉ mục](../../index.md) > [Infrastructure](../../index.md#infrastructure) > Reference*
***

# CloudFormation/SAM Templates Reference

## Mô tả

Bộ sưu tập CloudFormation và SAM templates để deploy infrastructure as code cho AWS Serverless architecture. Tất cả templates tuân thủ security best practices và optimize cho Free Tier.

**Use Case**: Deploy toàn bộ hoặc từng phần của infrastructure

**Free Tier**: Có - CloudFormation miễn phí

**Ước tính chi phí**: $0/tháng (chỉ trả cho resources được tạo)

## Template 1: DynamoDB với Auto Scaling

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Description: 'DynamoDB table với Auto Scaling'

Parameters:
  TableName:
    Type: String
    Default: EventsTable
    Description: DynamoDB table name
  
  MinReadCapacity:
    Type: Number
    Default: 1
    Description: Minimum read capacity units
  
  MaxReadCapacity:
    Type: Number
    Default: 10
    Description: Maximum read capacity units

Resources:
  EventsTable:
    Type: AWS::DynamoDB::Table
    Properties:
      TableName: !Ref TableName
      BillingMode: PAY_PER_REQUEST
      AttributeDefinitions:
        - AttributeName: PK
          AttributeType: S
        - AttributeName: SK
          AttributeType: S
        - AttributeName: GSI1PK
          AttributeType: S
        - AttributeName: GSI1SK
          AttributeType: S
      KeySchema:
        - AttributeName: PK
          KeyType: HASH
        - AttributeName: SK
          KeyType: RANGE
      GlobalSecondaryIndexes:
        - IndexName: GSI1
          KeySchema:
            - AttributeName: GSI1PK
              KeyType: HASH
            - AttributeName: GSI1SK
              KeyType: RANGE
          Projection:
            ProjectionType: ALL
          ProvisionedThroughput:
            ReadCapacityUnits: !Ref MinReadCapacity
            WriteCapacityUnits: !Ref MinReadCapacity
      ProvisionedThroughput:
        ReadCapacityUnits: !Ref MinReadCapacity
        WriteCapacityUnits: !Ref MinReadCapacity
      PointInTimeRecoverySpecification:
        PointInTimeRecoveryEnabled: true
      SSESpecification:
        SSEEnabled: true
      Tags:
        - Key: Environment
          Value: production
        - Key: Project
          Value: event-app

  # Auto Scaling for Read Capacity
  TableReadScalingTarget:
    Type: AWS::ApplicationAutoScaling::ScalableTarget
    Properties:
      ServiceNamespace: dynamodb
      ResourceId: !Sub 'table/${TableName}'
      ScalableDimension: dynamodb:table:ReadCapacityUnits
      MinCapacity: !Ref MinReadCapacity
      MaxCapacity: !Ref MaxReadCapacity
      RoleARN: !GetAtt ScalingRole.Arn

  TableReadScalingPolicy:
    Type: AWS::ApplicationAutoScaling::ScalingPolicy
    Properties:
      PolicyName: ReadAutoScalingPolicy
      PolicyType: TargetTrackingScaling
      ScalingTargetId: !Ref TableReadScalingTarget
      TargetTrackingScalingPolicyConfiguration:
        TargetValue: 70.0
        PredefinedMetricSpecification:
          PredefinedMetricType: DynamoDBReadCapacityUtilization

  # Auto Scaling for Write Capacity
  TableWriteScalingTarget:
    Type: AWS::ApplicationAutoScaling::ScalableTarget
    Properties:
      ServiceNamespace: dynamodb
      ResourceId: !Sub 'table/${TableName}'
      ScalableDimension: dynamodb:table:WriteCapacityUnits
      MinCapacity: !Ref MinReadCapacity
      MaxCapacity: !Ref MaxReadCapacity
      RoleARN: !GetAtt ScalingRole.Arn

  TableWriteScalingPolicy:
    Type: AWS::ApplicationAutoScaling::ScalingPolicy
    Properties:
      PolicyName: WriteAutoScalingPolicy
      PolicyType: TargetTrackingScaling
      ScalingTargetId: !Ref TableWriteScalingTarget
      TargetTrackingScalingPolicyConfiguration:
        TargetValue: 70.0
        PredefinedMetricSpecification:
          PredefinedMetricType: DynamoDBWriteCapacityUtilization

  ScalingRole:
    Type: AWS::IAM::Role
    Properties:
      AssumeRolePolicyDocument:
        Version: '2012-10-17'
        Statement:
          - Effect: Allow
            Principal:
              Service: application-autoscaling.amazonaws.com
            Action: sts:AssumeRole
      ManagedPolicyArns:
        - arn:aws:iam::aws:policy/service-role/DynamoDBAutoscalingRole

Outputs:
  TableName:
    Value: !Ref EventsTable
    Export:
      Name: !Sub '${AWS::StackName}-TableName'
  
  TableArn:
    Value: !GetAtt EventsTable.Arn
    Export:
      Name: !Sub '${AWS::StackName}-TableArn'
```

**Deployment**:
```bash
aws cloudformation create-stack \
  --stack-name event-app-dynamodb \
  --template-body file://dynamodb-autoscaling.yaml \
  --parameters ParameterKey=TableName,ParameterValue=EventsTable \
  --capabilities CAPABILITY_IAM
```

## Template 2: Lambda với Least Privilege IAM

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31
Description: 'Lambda function với Least Privilege IAM'

Parameters:
  FunctionName:
    Type: String
    Default: getEvents
  
  TableName:
    Type: String
    Default: EventsTable

Resources:
  GetEventsFunction:
    Type: AWS::Serverless::Function
    Properties:
      FunctionName: !Ref FunctionName
      Runtime: nodejs18.x
      Handler: index.handler
      CodeUri: ./src/handlers/getEvents/
      MemorySize: 256
      Timeout: 30
      Environment:
        Variables:
          TABLE_NAME: !Ref TableName
          NODE_OPTIONS: '--enable-source-maps'
      Policies:
        - Version: '2012-10-17'
          Statement:
            - Effect: Allow
              Action:
                - dynamodb:Query
                - dynamodb:GetItem
              Resource:
                - !Sub 'arn:aws:dynamodb:${AWS::Region}:${AWS::AccountId}:table/${TableName}'
                - !Sub 'arn:aws:dynamodb:${AWS::Region}:${AWS::AccountId}:table/${TableName}/index/*'
            - Effect: Allow
              Action:
                - logs:CreateLogGroup
                - logs:CreateLogStream
                - logs:PutLogEvents
              Resource: !Sub 'arn:aws:logs:${AWS::Region}:${AWS::AccountId}:log-group:/aws/lambda/${FunctionName}:*'
      Tags:
        Environment: production
        Project: event-app

  GetEventsFunctionLogGroup:
    Type: AWS::Logs::LogGroup
    Properties:
      LogGroupName: !Sub '/aws/lambda/${FunctionName}'
      RetentionInDays: 7

Outputs:
  FunctionArn:
    Value: !GetAtt GetEventsFunction.Arn
    Export:
      Name: !Sub '${AWS::StackName}-FunctionArn'
```

**Deployment**:
```bash
sam build
sam deploy \
  --stack-name event-app-lambda \
  --parameter-overrides FunctionName=getEvents TableName=EventsTable \
  --capabilities CAPABILITY_IAM
```

## Template 3: CloudWatch Alarms

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Description: 'CloudWatch Alarms cho monitoring'

Parameters:
  SNSTopicArn:
    Type: String
    Description: SNS topic ARN for alerts
  
  FunctionName:
    Type: String
    Default: getEvents

Resources:
  LambdaErrorAlarm:
    Type: AWS::CloudWatch::Alarm
    Properties:
      AlarmName: !Sub '${FunctionName}-errors'
      AlarmDescription: Alert when Lambda errors exceed threshold
      MetricName: Errors
      Namespace: AWS/Lambda
      Statistic: Sum
      Period: 300
      EvaluationPeriods: 1
      Threshold: 5
      ComparisonOperator: GreaterThanThreshold
      Dimensions:
        - Name: FunctionName
          Value: !Ref FunctionName
      AlarmActions:
        - !Ref SNSTopicArn
      TreatMissingData: notBreaching

  LambdaThrottleAlarm:
    Type: AWS::CloudWatch::Alarm
    Properties:
      AlarmName: !Sub '${FunctionName}-throttles'
      AlarmDescription: Alert when Lambda throttles occur
      MetricName: Throttles
      Namespace: AWS/Lambda
      Statistic: Sum
      Period: 300
      EvaluationPeriods: 1
      Threshold: 1
      ComparisonOperator: GreaterThanThreshold
      Dimensions:
        - Name: FunctionName
          Value: !Ref FunctionName
      AlarmActions:
        - !Ref SNSTopicArn

  LambdaDurationAlarm:
    Type: AWS::CloudWatch::Alarm
    Properties:
      AlarmName: !Sub '${FunctionName}-duration'
      AlarmDescription: Alert when Lambda duration is high
      MetricName: Duration
      Namespace: AWS/Lambda
      Statistic: Average
      Period: 300
      EvaluationPeriods: 2
      Threshold: 5000
      ComparisonOperator: GreaterThanThreshold
      Dimensions:
        - Name: FunctionName
          Value: !Ref FunctionName
      AlarmActions:
        - !Ref SNSTopicArn

  BillingAlarm:
    Type: AWS::CloudWatch::Alarm
    Properties:
      AlarmName: monthly-billing-alert
      AlarmDescription: Alert when monthly bill exceeds $10
      MetricName: EstimatedCharges
      Namespace: AWS/Billing
      Statistic: Maximum
      Period: 21600
      EvaluationPeriods: 1
      Threshold: 10
      ComparisonOperator: GreaterThanThreshold
      Dimensions:
        - Name: Currency
          Value: USD
      AlarmActions:
        - !Ref SNSTopicArn
```

**Deployment**:
```bash
aws cloudformation create-stack \
  --stack-name event-app-alarms \
  --template-body file://cloudwatch-alarms.yaml \
  --parameters ParameterKey=SNSTopicArn,ParameterValue=arn:aws:sns:us-east-1:ACCOUNT_ID:alerts
```

## Template 4: WAF cho API Gateway

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Description: 'AWS WAF Web ACL cho API Gateway Regional endpoint'

Parameters:
  ApiGatewayStageArn:
    Type: String
    Description: ARN của API Gateway stage cần bảo vệ

  RateLimit:
    Type: Number
    Default: 2000
    Description: Số requests tối đa trong 5 phút cho mỗi IP

Resources:
  EventApiWebAcl:
    Type: AWS::WAFv2::WebACL
    Properties:
      Name: event-api-web-acl
      Scope: REGIONAL
      DefaultAction:
        Allow: {}
      VisibilityConfig:
        CloudWatchMetricsEnabled: true
        MetricName: EventApiWebAcl
        SampledRequestsEnabled: true
      Rules:
        - Name: RateLimitRule
          Priority: 0
          Action:
            Block: {}
          Statement:
            RateBasedStatement:
              Limit: !Ref RateLimit
              AggregateKeyType: IP
          VisibilityConfig:
            CloudWatchMetricsEnabled: true
            MetricName: RateLimitRule
            SampledRequestsEnabled: true
        - Name: AWSManagedRulesCommonRuleSet
          Priority: 1
          OverrideAction:
            None: {}
          Statement:
            ManagedRuleGroupStatement:
              VendorName: AWS
              Name: AWSManagedRulesCommonRuleSet
          VisibilityConfig:
            CloudWatchMetricsEnabled: true
            MetricName: CommonRuleSet
            SampledRequestsEnabled: true
        - Name: AWSManagedRulesKnownBadInputsRuleSet
          Priority: 2
          OverrideAction:
            None: {}
          Statement:
            ManagedRuleGroupStatement:
              VendorName: AWS
              Name: AWSManagedRulesKnownBadInputsRuleSet
          VisibilityConfig:
            CloudWatchMetricsEnabled: true
            MetricName: KnownBadInputs
            SampledRequestsEnabled: true
        - Name: AWSManagedRulesSQLiRuleSet
          Priority: 3
          OverrideAction:
            None: {}
          Statement:
            ManagedRuleGroupStatement:
              VendorName: AWS
              Name: AWSManagedRulesSQLiRuleSet
          VisibilityConfig:
            CloudWatchMetricsEnabled: true
            MetricName: SQLiRuleSet
            SampledRequestsEnabled: true

  WebAclAssociation:
    Type: AWS::WAFv2::WebACLAssociation
    Properties:
      ResourceArn: !Ref ApiGatewayStageArn
      WebACLArn: !GetAtt EventApiWebAcl.Arn

Outputs:
  WebAclArn:
    Value: !GetAtt EventApiWebAcl.Arn
    Export:
      Name: !Sub '${AWS::StackName}-WebAclArn'
```

**Deployment**:
```bash
aws cloudformation create-stack \
  --stack-name event-app-waf \
  --template-body file://waf-api-gateway.yaml \
  --parameters ParameterKey=ApiGatewayStageArn,ParameterValue=arn:aws:apigateway:us-east-1::/restapis/API_ID/stages/prod \
  --region us-east-1
```

> ⚠️ **Chi phí**: AWS WAF không có Free Tier. Ước tính cơ bản: $5/month cho Web ACL + $1/month/rule + $0.60/1M requests.

## Template 5: Lambda Optimized Configuration

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31
Description: 'Lambda optimized config với tracing, concurrency, log retention và IAM least privilege'

Parameters:
  FunctionName:
    Type: String
    Default: getEvents

  TableName:
    Type: String
    Default: EventsTable

  ReservedConcurrency:
    Type: Number
    Default: 20

  ProvisionedConcurrency:
    Type: Number
    Default: 1

Resources:
  OptimizedFunction:
    Type: AWS::Serverless::Function
    Properties:
      FunctionName: !Ref FunctionName
      Runtime: nodejs18.x
      Handler: index.handler
      CodeUri: ./src/handlers/getEvents/
      MemorySize: 512
      Timeout: 15
      Tracing: Active
      ReservedConcurrentExecutions: !Ref ReservedConcurrency
      AutoPublishAlias: live
      ProvisionedConcurrencyConfig:
        ProvisionedConcurrentExecutions: !Ref ProvisionedConcurrency
      Environment:
        Variables:
          TABLE_NAME: !Ref TableName
          AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1'
          NODE_OPTIONS: '--enable-source-maps'
      Policies:
        - Version: '2012-10-17'
          Statement:
            - Effect: Allow
              Action:
                - dynamodb:GetItem
                - dynamodb:Query
              Resource:
                - !Sub 'arn:aws:dynamodb:${AWS::Region}:${AWS::AccountId}:table/${TableName}'
                - !Sub 'arn:aws:dynamodb:${AWS::Region}:${AWS::AccountId}:table/${TableName}/index/*'
            - Effect: Allow
              Action:
                - xray:PutTraceSegments
                - xray:PutTelemetryRecords
              Resource: '*'

  OptimizedFunctionLogGroup:
    Type: AWS::Logs::LogGroup
    Properties:
      LogGroupName: !Sub '/aws/lambda/${FunctionName}'
      RetentionInDays: 14

Outputs:
  FunctionArn:
    Value: !GetAtt OptimizedFunction.Arn
    Export:
      Name: !Sub '${AWS::StackName}-OptimizedFunctionArn'
```

**Deployment**:
```bash
sam build
sam deploy \
  --stack-name event-app-lambda-optimized \
  --parameter-overrides FunctionName=getEvents TableName=EventsTable ReservedConcurrency=20 ProvisionedConcurrency=1 \
  --capabilities CAPABILITY_IAM
```

> ⚠️ **Chi phí**: Provisioned Concurrency có phí. Đặt `ProvisionedConcurrency=0` cho dev nếu muốn tối ưu Free Tier.

## Lưu ý

### Best Practices
- ✅ Sử dụng Parameters để reusable
- ✅ Export Outputs để cross-stack references
- ✅ Tag tất cả resources
- ✅ Enable encryption by default
- ✅ Set log retention để tránh chi phí

### Troubleshooting
- Check CloudFormation Events tab để xem errors
- Sử dụng `--debug` flag với AWS CLI
- Validate template trước: `aws cloudformation validate-template`





## Bước tiếp theo

- [Tích hợp templates vào CI/CD](../how-to/cicd-pipeline.md)
- [Validate với chaos engineering](../../testing/how-to/chaos-engineering.md)

## Tài liệu liên quan

- [CI/CD Pipeline](../how-to/cicd-pipeline.md)
- [Scalability Design](../../architecture/explanation/scalability-design.md)
- [WAF Configuration](../../security/how-to/waf-configuration.md)

---

**Metadata**:
- **Requirements**: Requirement 9, Requirement 16, Requirement 17, Requirement 18
- **Category**: Reference
- **Domain**: Infrastructure
- **Tags**: cloudformation, sam, iac, templates
- **Last Updated**: 2026-06-12
- **Difficulty**: Khó
- **Estimated Reading/Implementation Time**: 2 giờ