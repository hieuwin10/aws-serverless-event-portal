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
      BillingMode: PROVISIONED
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

---

**Metadata**:
- **Category**: reference
- **Domain**: infrastructure
- **Tags**: cloudformation, sam, iac, templates
- **Last Updated**: 2024-01-15
