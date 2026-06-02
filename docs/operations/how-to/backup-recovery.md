# Sao Lưu và Phục Hồi Dữ Liệu

## Vấn Đề

Kiến trúc hiện tại không có chiến lược backup rõ ràng:
- **DynamoDB không bật PITR** — mất dữ liệu khi có lỗi ứng dụng hoặc xóa nhầm
- **S3 không bật versioning** — không thể phục hồi file đã ghi đè
- **Không có Disaster Recovery Plan** — không biết phải làm gì khi có sự cố lớn
- **Không test restoration** — backup có thể không dùng được khi thực sự cần

## Giải Pháp

Chiến lược backup 3 lớp:
1. **DynamoDB PITR** (Point-in-Time Recovery) — phục hồi đến bất kỳ thời điểm nào trong 35 ngày
2. **DynamoDB On-Demand Backups** — snapshot thủ công để lưu trữ dài hạn
3. **S3 Versioning + Lifecycle** — bảo vệ frontend assets
4. **Automated Backup** — tự động hóa quy trình backup

## Điều Kiện Tiên Quyết

- AWS CLI đã cài đặt và cấu hình
- DynamoDB table `EventsTable` đã tồn tại
- S3 bucket `event-portal-frontend-ACCOUNT_ID` đã tồn tại
- IAM permissions: `dynamodb:*`, `s3:*`

> 💰 **Chi phí**:
> - DynamoDB PITR: $0.20/GB/month — **vượt Free Tier** nếu data > 25 GB
> - DynamoDB On-Demand Backup: $0.10/GB/month lưu trữ
> - S3 Versioning: Tính phí theo số versions × kích thước
> - **Free Tier giới hạn**: DynamoDB 25 GB, S3 5 GB

---

## Bước 1: Bật DynamoDB Point-in-Time Recovery (PITR)

### 1.1 Bật PITR Qua CloudFormation

```yaml
# backup-pitr.yaml
AWSTemplateFormatVersion: '2010-09-09'
Description: 'DynamoDB Backup và S3 Versioning Configuration'

Parameters:
  TableName:
    Type: String
    Default: EventsTable
  FrontendBucketName:
    Type: String
    Default: event-portal-frontend
  BackupRetentionDays:
    Type: Number
    Default: 7
    Description: 'Số ngày giữ On-Demand backups'
  Environment:
    Type: String
    Default: dev

Resources:
  # DynamoDB Table với PITR enabled
  EventsTable:
    Type: AWS::DynamoDB::Table
    DeletionPolicy: Retain          # QUAN TRỌNG: Không xóa table khi xóa stack
    UpdateReplacePolicy: Retain
    Properties:
      TableName: !Ref TableName
      BillingMode: PAY_PER_REQUEST  # On-Demand tốt hơn cho Free Tier dev
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
      # Bật PITR
      PointInTimeRecoverySpecification:
        PointInTimeRecoveryEnabled: true
      # Encryption at rest
      SSESpecification:
        SSEEnabled: true
      # Tags để quản lý chi phí
      Tags:
        - Key: Environment
          Value: !Ref Environment
        - Key: Backup
          Value: 'pitr-enabled'

  # S3 Bucket với Versioning
  FrontendBucket:
    Type: AWS::S3::Bucket
    DeletionPolicy: Retain
    Properties:
      BucketName: !Sub '${FrontendBucketName}-${AWS::AccountId}'
      # Bật Versioning
      VersioningConfiguration:
        Status: Enabled
      # Lifecycle rules để tự động archive/xóa old versions
      LifecycleConfiguration:
        Rules:
          - Id: ArchiveOldVersions
            Status: Enabled
            NoncurrentVersionTransitions:
              - TransitionInDays: 30
                StorageClass: STANDARD_IA    # Rẻ hơn 45% sau 30 ngày
              - TransitionInDays: 90
                StorageClass: GLACIER        # Rẻ hơn 80% sau 90 ngày
            NoncurrentVersionExpiration:
              NoncurrentDays: 365            # Xóa sau 1 năm
          - Id: CleanIncompleteMultipartUploads
            Status: Enabled
            AbortIncompleteMultipartUpload:
              DaysAfterInitiation: 7
      # Block public access (quan trọng cho bảo mật)
      PublicAccessBlockConfiguration:
        BlockPublicAcls: true
        BlockPublicPolicy: true
        IgnorePublicAcls: true
        RestrictPublicBuckets: true
      # Encryption
      BucketEncryption:
        ServerSideEncryptionConfiguration:
          - ServerSideEncryptionByDefault:
              SSEAlgorithm: AES256
      Tags:
        - Key: Environment
          Value: !Ref Environment

  # Lambda Role cho Backup Automation
  BackupLambdaRole:
    Type: AWS::IAM::Role
    Properties:
      RoleName: !Sub 'BackupLambdaRole-${Environment}'
      AssumeRolePolicyDocument:
        Version: '2012-10-17'
        Statement:
          - Effect: Allow
            Principal:
              Service: lambda.amazonaws.com
            Action: sts:AssumeRole
      ManagedPolicyArns:
        - arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
      Policies:
        - PolicyName: BackupPolicy
          PolicyDocument:
            Version: '2012-10-17'
            Statement:
              - Effect: Allow
                Action:
                  - dynamodb:CreateBackup
                  - dynamodb:ListBackups
                  - dynamodb:DeleteBackup
                  - dynamodb:DescribeContinuousBackups
                Resource: !GetAtt EventsTable.Arn
              - Effect: Allow
                Action:
                  - sns:Publish
                Resource: '*'

  # Lambda Function để tạo On-Demand Backup hàng ngày
  AutoBackupLambda:
    Type: AWS::Lambda::Function
    Properties:
      FunctionName: !Sub 'dynamodb-auto-backup-${Environment}'
      Runtime: nodejs18.x
      Handler: index.handler
      Role: !GetAtt BackupLambdaRole.Arn
      Timeout: 60
      Environment:
        Variables:
          TABLE_NAME: !Ref TableName
          RETENTION_DAYS: !Sub '${BackupRetentionDays}'
          ENVIRONMENT: !Ref Environment
      Code:
        ZipFile: |
          const { DynamoDBClient, CreateBackupCommand, ListBackupsCommand, DeleteBackupCommand } = require('@aws-sdk/client-dynamodb');
          const dynamo = new DynamoDBClient({});
          
          exports.handler = async () => {
            const tableName = process.env.TABLE_NAME;
            const retentionDays = parseInt(process.env.RETENTION_DAYS);
            const today = new Date().toISOString().split('T')[0];
            
            // 1. Tạo backup mới
            const backupName = `${tableName}-${today}-auto`;
            console.log(`Creating backup: ${backupName}`);
            
            const createResult = await dynamo.send(new CreateBackupCommand({
              TableName: tableName,
              BackupName: backupName,
            }));
            
            console.log('Backup created:', createResult.BackupDetails.BackupArn);
            
            // 2. Xóa backups cũ hơn retention period
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
            
            const listResult = await dynamo.send(new ListBackupsCommand({
              TableName: tableName,
              BackupType: 'USER',
              TimeRangeLowerBound: new Date('2020-01-01'),
              TimeRangeUpperBound: cutoffDate,
            }));
            
            for (const backup of (listResult.BackupSummaries || [])) {
              if (backup.BackupName?.endsWith('-auto')) {
                console.log(`Deleting old backup: ${backup.BackupArn}`);
                await dynamo.send(new DeleteBackupCommand({ BackupArn: backup.BackupArn }));
              }
            }
            
            return {
              status: 'success',
              newBackup: createResult.BackupDetails.BackupArn,
              deletedCount: listResult.BackupSummaries?.length || 0,
            };
          };

  # EventBridge Rule để chạy backup hàng ngày lúc 2:00 AM
  DailyBackupSchedule:
    Type: AWS::Events::Rule
    Properties:
      Name: !Sub 'daily-dynamodb-backup-${Environment}'
      Description: 'Tự động backup DynamoDB hàng ngày lúc 2:00 AM UTC'
      ScheduleExpression: 'cron(0 2 * * ? *)'  # 2:00 AM UTC mỗi ngày
      State: ENABLED
      Targets:
        - Id: AutoBackupLambda
          Arn: !GetAtt AutoBackupLambda.Arn

  # Permission cho EventBridge invoke Lambda
  BackupSchedulePermission:
    Type: AWS::Lambda::Permission
    Properties:
      FunctionName: !GetAtt AutoBackupLambda.Arn
      Action: lambda:InvokeFunction
      Principal: events.amazonaws.com
      SourceArn: !GetAtt DailyBackupSchedule.Arn

Outputs:
  TableArn:
    Value: !GetAtt EventsTable.Arn
  FrontendBucketName:
    Value: !Ref FrontendBucket
  BackupLambdaArn:
    Value: !GetAtt AutoBackupLambda.Arn
```

**Triển khai:**
```bash
aws cloudformation deploy \
  --template-file backup-pitr.yaml \
  --stack-name event-portal-backup-dev \
  --parameter-overrides \
    TableName=EventsTable \
    Environment=dev \
    BackupRetentionDays=7 \
  --capabilities CAPABILITY_NAMED_IAM
```

---

## Bước 2: Quản Lý Backup Qua AWS CLI

```bash
#!/bin/bash
TABLE_NAME="EventsTable"

# 2.1 Kiểm tra PITR đã bật chưa
echo "=== Kiểm tra PITR Status ==="
aws dynamodb describe-continuous-backups \
  --table-name $TABLE_NAME \
  --query 'ContinuousBackupsDescription.PointInTimeRecoveryDescription'

# 2.2 Tạo On-Demand Backup thủ công (trước khi deploy lớn)
BACKUP_NAME="${TABLE_NAME}-before-deploy-$(date +%Y%m%d-%H%M%S)"
echo "=== Tạo Backup: $BACKUP_NAME ==="
aws dynamodb create-backup \
  --table-name $TABLE_NAME \
  --backup-name $BACKUP_NAME

# 2.3 Liệt kê tất cả backups
echo "=== Danh sách Backups ==="
aws dynamodb list-backups \
  --table-name $TABLE_NAME \
  --query 'BackupSummaries[*].{Name:BackupName,Status:BackupStatus,Size:BackupSizeBytes,Created:BackupCreationDateTime}' \
  --output table

# 2.4 Kiểm tra earliest restore time (PITR)
echo "=== Thời điểm sớm nhất có thể restore ==="
aws dynamodb describe-continuous-backups \
  --table-name $TABLE_NAME \
  --query 'ContinuousBackupsDescription.PointInTimeRecoveryDescription.EarliestRestorableDateTime'
```

---

## Bước 3: Phục Hồi Dữ Liệu

### 3.1 Restore Từ PITR (Point-in-Time Recovery)

```bash
#!/bin/bash
TABLE_NAME="EventsTable"
# Restore về thời điểm trước khi xảy ra lỗi
RESTORE_TIME="2024-01-15T10:30:00Z"  # Thay bằng thời điểm cần restore

echo "=== Restore từ PITR về thời điểm: $RESTORE_TIME ==="

# Restore ra table mới (KHÔNG restore trực tiếp vào table đang dùng!)
RESTORED_TABLE="${TABLE_NAME}-restored-$(date +%Y%m%d)"

aws dynamodb restore-table-to-point-in-time \
  --source-table-name $TABLE_NAME \
  --target-table-name $RESTORED_TABLE \
  --restore-date-time $RESTORE_TIME \
  --billing-mode-override PAY_PER_REQUEST

echo "Đang restore... Chờ khoảng 10-30 phút tùy kích thước data"

# Đợi restore hoàn thành
aws dynamodb wait table-exists --table-name $RESTORED_TABLE

echo "=== Restore hoàn thành! ==="
echo "Table mới: $RESTORED_TABLE"
echo "Kiểm tra data trước khi switch traffic"
```

### 3.2 Restore Từ On-Demand Backup

```bash
#!/bin/bash
TABLE_NAME="EventsTable"

# Lấy backup ARN cần restore
BACKUP_ARN=$(aws dynamodb list-backups \
  --table-name $TABLE_NAME \
  --query 'BackupSummaries[0].BackupArn' \
  --output text)

echo "Backup ARN: $BACKUP_ARN"

# Restore ra table mới
RESTORED_TABLE="${TABLE_NAME}-from-backup-$(date +%Y%m%d)"

aws dynamodb restore-table-from-backup \
  --target-table-name $RESTORED_TABLE \
  --backup-arn $BACKUP_ARN \
  --billing-mode-override PAY_PER_REQUEST

# Đợi restore hoàn thành
aws dynamodb wait table-exists --table-name $RESTORED_TABLE
echo "Restore hoàn thành: $RESTORED_TABLE"
```

### 3.3 Script Kiểm Tra Và Switch Table

```bash
#!/bin/bash
# Sau khi restore, kiểm tra data và switch traffic

ORIGINAL_TABLE="EventsTable"
RESTORED_TABLE="EventsTable-restored-20240115"

# 1. Đếm items trong cả 2 tables
echo "=== So sánh Item Count ==="
ORIGINAL_COUNT=$(aws dynamodb describe-table \
  --table-name $ORIGINAL_TABLE \
  --query 'Table.ItemCount' \
  --output text)

RESTORED_COUNT=$(aws dynamodb describe-table \
  --table-name $RESTORED_TABLE \
  --query 'Table.ItemCount' \
  --output text)

echo "Original: $ORIGINAL_COUNT items"
echo "Restored: $RESTORED_COUNT items"

# 2. Scan vài items để verify data
echo ""
echo "=== Sample data từ Restored Table ==="
aws dynamodb scan \
  --table-name $RESTORED_TABLE \
  --limit 5 \
  --query 'Items[*]'

# 3. Nếu data OK, update Lambda environment variable để dùng table mới
echo ""
echo "Nếu data OK, chạy lệnh sau để switch traffic:"
echo "aws lambda update-function-configuration \\"
echo "  --function-name getEvents \\"
echo "  --environment Variables={TABLE_NAME=$RESTORED_TABLE}"
```

---

## Bước 4: Kiểm Tra S3 Versioning và Restore

```bash
#!/bin/bash
BUCKET_NAME="event-portal-frontend-$(aws sts get-caller-identity --query Account --output text)"

# Kiểm tra versioning đã bật chưa
echo "=== Trạng thái Versioning ==="
aws s3api get-bucket-versioning --bucket $BUCKET_NAME

# Liệt kê tất cả versions của file
echo ""
echo "=== Versions của index.html ==="
aws s3api list-object-versions \
  --bucket $BUCKET_NAME \
  --prefix "index.html" \
  --query '{Versions:Versions[*].{VersionId:VersionId,LastModified:LastModified,Size:Size}}'

# Restore version cũ của file
echo ""
echo "=== Restore version cụ thể ==="
# Lấy version ID cần restore
VERSION_ID="XXXXXXXXX"  # Thay bằng version ID cần restore

aws s3api copy-object \
  --bucket $BUCKET_NAME \
  --copy-source "${BUCKET_NAME}/index.html?versionId=${VERSION_ID}" \
  --key "index.html"

echo "Đã restore index.html về version: $VERSION_ID"

# Hoặc khôi phục từ delete marker (nếu file bị xóa nhầm)
echo ""
echo "=== Restore file đã xóa nhầm ==="
# Xóa delete marker để khôi phục file
DELETE_MARKER_VERSION="YYYYYYY"  # Version ID của delete marker
aws s3api delete-object \
  --bucket $BUCKET_NAME \
  --key "index.html" \
  --version-id $DELETE_MARKER_VERSION
```

---

## Bước 5: Disaster Recovery Plan

### Mức Độ Sự Cố và Quy Trình Xử Lý

**Thông số DR:**
- **RTO** (Recovery Time Objective): 4 giờ — thời gian tối đa để khôi phục
- **RPO** (Recovery Point Objective): 1 giờ — dữ liệu tối đa có thể mất

| Cấp độ | Sự cố | Thời gian xử lý | Hành động |
|--------|-------|-----------------|-----------|
| P1 — Critical | Toàn bộ hệ thống down | < 30 phút | Invoke DR plan |
| P2 — High | DynamoDB data corruption | < 2 giờ | PITR restore |
| P3 — Medium | Lambda function fail | < 1 giờ | Rollback deployment |
| P4 — Low | Một API endpoint lỗi | < 4 giờ | Debug và hotfix |

### Script Kiểm Tra Sức Khỏe Hệ Thống

```bash
#!/bin/bash
# health-check.sh — chạy hàng giờ qua cron hoặc EventBridge

echo "============================================"
echo "Health Check: $(date)"
echo "============================================"

ERRORS=0

# 1. Kiểm tra DynamoDB
echo ""
echo "--- DynamoDB Health ---"
TABLE_STATUS=$(aws dynamodb describe-table \
  --table-name EventsTable \
  --query 'Table.TableStatus' \
  --output text 2>&1)

if [ "$TABLE_STATUS" = "ACTIVE" ]; then
  echo "✅ DynamoDB: ACTIVE"
else
  echo "❌ DynamoDB: $TABLE_STATUS"
  ERRORS=$((ERRORS + 1))
fi

# 2. Kiểm tra Lambda functions
echo ""
echo "--- Lambda Health ---"
for FUNCTION in getEvents createEvent registerEvent; do
  STATE=$(aws lambda get-function \
    --function-name $FUNCTION \
    --query 'Configuration.State' \
    --output text 2>&1)
  
  if [ "$STATE" = "Active" ]; then
    echo "✅ Lambda $FUNCTION: Active"
  else
    echo "❌ Lambda $FUNCTION: $STATE"
    ERRORS=$((ERRORS + 1))
  fi
done

# 3. Kiểm tra PITR status
echo ""
echo "--- Backup Status ---"
PITR_STATUS=$(aws dynamodb describe-continuous-backups \
  --table-name EventsTable \
  --query 'ContinuousBackupsDescription.PointInTimeRecoveryDescription.PointInTimeRecoveryStatus' \
  --output text 2>&1)

if [ "$PITR_STATUS" = "ENABLED" ]; then
  echo "✅ DynamoDB PITR: ENABLED"
else
  echo "❌ DynamoDB PITR: DISABLED — NGUY HIỂM!"
  ERRORS=$((ERRORS + 1))
fi

# 4. Test API endpoint
echo ""
echo "--- API Health ---"
API_URL=$(aws cloudformation describe-stacks \
  --stack-name event-portal-api-dev \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' \
  --output text 2>/dev/null)

if [ -n "$API_URL" ]; then
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "${API_URL}/events" --max-time 10)
  if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "401" ]; then
    echo "✅ API Gateway: HTTP $HTTP_CODE (OK)"
  else
    echo "❌ API Gateway: HTTP $HTTP_CODE"
    ERRORS=$((ERRORS + 1))
  fi
fi

# 5. Summary
echo ""
echo "============================================"
if [ $ERRORS -eq 0 ]; then
  echo "✅ Health Check PASSED — Tất cả hệ thống OK"
else
  echo "❌ Health Check FAILED — $ERRORS vấn đề cần xử lý"
  echo "Xem runbooks tại: docs/operations/reference/runbooks.md"
fi
echo "============================================"

exit $ERRORS
```

---

## Bước 6: Test Backup Restoration (Hàng Tháng)

```bash
#!/bin/bash
# test-restore.sh — chạy hàng tháng để verify backup hoạt động

TABLE_NAME="EventsTable"
TEST_RESTORED_TABLE="${TABLE_NAME}-test-restore-$(date +%Y%m)"

echo "=== BẮT ĐẦU TEST RESTORE BACKUP ==="
echo "Thời gian: $(date)"
echo "Source: $TABLE_NAME"
echo "Target: $TEST_RESTORED_TABLE"

# 1. Restore về 1 giờ trước
RESTORE_TIME=$(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || \
  date -u -v-1H +%Y-%m-%dT%H:%M:%SZ)

echo ""
echo "Restore về: $RESTORE_TIME"

aws dynamodb restore-table-to-point-in-time \
  --source-table-name $TABLE_NAME \
  --target-table-name $TEST_RESTORED_TABLE \
  --restore-date-time $RESTORE_TIME \
  --billing-mode-override PAY_PER_REQUEST

echo "Đang restore... Chờ khoảng 10-30 phút..."
aws dynamodb wait table-exists --table-name $TEST_RESTORED_TABLE

# 2. Verify data
echo ""
echo "=== VERIFY DATA ==="
ORIGINAL_COUNT=$(aws dynamodb describe-table \
  --table-name $TABLE_NAME \
  --query 'Table.ItemCount' \
  --output text)

RESTORED_COUNT=$(aws dynamodb describe-table \
  --table-name $TEST_RESTORED_TABLE \
  --query 'Table.ItemCount' \
  --output text)

echo "Original items: $ORIGINAL_COUNT"
echo "Restored items: $RESTORED_COUNT"

if [ "$ORIGINAL_COUNT" = "$RESTORED_COUNT" ]; then
  echo "✅ Item count khớp — Restore thành công!"
  RESTORE_STATUS="SUCCESS"
else
  echo "⚠️ Item count không khớp — Kiểm tra thêm"
  RESTORE_STATUS="WARNING"
fi

# 3. Xóa test table sau khi verify
echo ""
echo "Xóa test table..."
aws dynamodb delete-table --table-name $TEST_RESTORED_TABLE
aws dynamodb wait table-not-exists --table-name $TEST_RESTORED_TABLE

echo ""
echo "=== KẾT QUẢ TEST RESTORE ==="
echo "Status: $RESTORE_STATUS"
echo "Thời gian: $(date)"
echo "Ghi lại kết quả vào runbook để tracking"
```

---

## Xác Minh

```bash
#!/bin/bash
echo "=== Kiểm tra toàn bộ Backup Setup ==="

# 1. PITR status
echo "1. DynamoDB PITR:"
aws dynamodb describe-continuous-backups \
  --table-name EventsTable \
  --query 'ContinuousBackupsDescription.PointInTimeRecoveryDescription'

# 2. Latest backup
echo ""
echo "2. Latest On-Demand Backup:"
aws dynamodb list-backups \
  --table-name EventsTable \
  --query 'BackupSummaries[0].{Name:BackupName,Status:BackupStatus,Created:BackupCreationDateTime}'

# 3. S3 versioning
BUCKET="event-portal-frontend-$(aws sts get-caller-identity --query Account --output text)"
echo ""
echo "3. S3 Versioning:"
aws s3api get-bucket-versioning --bucket $BUCKET

# 4. Auto backup Lambda
echo ""
echo "4. Auto Backup Lambda Schedule:"
aws events list-rules \
  --name-prefix "daily-dynamodb-backup" \
  --query 'Rules[*].{Name:Name,State:State,Schedule:ScheduleExpression}'
```

---

## Lưu Ý

> ⚠️ **Không restore trực tiếp vào table đang production!** Luôn restore vào table mới, verify data, rồi mới switch traffic.

> ⚠️ **PITR có chi phí**: $0.20/GB/month. Với DynamoDB Free Tier 25 GB, chi phí PITR có thể là $5/month nếu dùng hết storage.

> 💡 **Tip**: Chạy `test-restore.sh` mỗi tháng để đảm bảo backup thực sự dùng được — "Backup chưa test là backup chưa tồn tại".

## Tài Liệu Liên Quan

- [monitoring-alerting.md](./monitoring-alerting.md) — Giám sát health check
- [runbooks.md](../reference/runbooks.md) — Quy trình xử lý sự cố
- [cloudformation-templates.md](../../infrastructure/reference/cloudformation-templates.md) — Templates đầy đủ
- [cost-optimization.md](./cost-optimization.md) — Tối ưu chi phí backup
- [AWS DynamoDB Backup](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/BackupRestore.html)
