# Hạ Tầng Dưới Dạng Mã (Infrastructure as Code — IaC)

Tài liệu này mô tả cách sử dụng **AWS SAM (Serverless Application Model)** để định nghĩa toàn bộ hạ tầng đám mây bằng tệp cấu hình YAML thay vì phải nhấn chuột tạo tay từng dịch vụ trên AWS Console. Phương pháp IaC giúp:
1.  **Tái tạo hoàn hảo:** Bất kỳ ai trong đội ngũ cũng có thể triển khai hệ thống y hệt nhau chỉ bằng 1 dòng lệnh.
2.  **Kiểm soát phiên bản:** Mọi thay đổi hạ tầng đều được theo dõi qua Git (ai đã đổi, đổi gì, khi nào).
3.  **Tránh nhầm lẫn:** Loại bỏ hoàn toàn rủi ro cấu hình sai do thao tác thủ công trên giao diện web.

---

## 1. Vì Sao Chọn AWS SAM?

| Tiêu chí | AWS SAM | Terraform | Serverless Framework |
| :--- | :--- | :--- | :--- |
| **Tương thích AWS** | ✅ Tối ưu nhất (do chính AWS phát triển) | ✅ Đa nền tảng | ✅ Tốt |
| **Miễn phí** | ✅ Hoàn toàn | ✅ Bản Open Source | ✅ Bản Community |
| **Hỗ trợ Lambda** | ✅ Tích hợp sâu (build, test, deploy) | ⚠️ Cần plugin | ✅ Tốt |
| **Chạy thử cục bộ** | ✅ `sam local invoke` / `sam local start-api` | ❌ Không hỗ trợ | ⚠️ Cần plugin |
| **Độ phức tạp** | Thấp (chỉ cần biết YAML) | Trung bình (HCL syntax) | Thấp |

> **Kết luận:** AWS SAM là lựa chọn tối ưu nhất cho dự án Serverless thuần AWS vì nó vừa được AWS hỗ trợ chính thức, vừa cho phép test offline ngay trên máy cá nhân mà không cần deploy lên cloud.

---

## 2. Cài Đặt AWS SAM CLI

### Yêu cầu tiên quyết
*   **AWS CLI** đã được cài đặt và cấu hình (`aws configure`) với Access Key (hoặc SSO).
*   **Docker** đã cài đặt (để chạy `sam local` giả lập môi trường Lambda runtime trên máy cục bộ).

### Cài đặt trên Windows
```bash
# Tải bộ cài từ trang chính thức
# https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html

# Hoặc cài qua Chocolatey
choco install aws-sam-cli

# Kiểm tra phiên bản sau khi cài
sam --version
```

---

## 3. Cấu Trúc Tệp SAM Template (`template.yaml`)

Dưới đây là tệp **`template.yaml`** hoàn chỉnh định nghĩa toàn bộ 7 tài nguyên AWS của dự án. Tệp này nằm tại thư mục gốc `backend/`:

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31
Description: >
  EventApp — Website Quản Lý và Đăng Ký Sự Kiện Online (AWS Free Tier)

# ============================================================
# BIẾN MÔI TRƯỜNG TOÀN CỤC (Global Variables)
# ============================================================
Globals:
  Function:
    Runtime: nodejs20.x
    Timeout: 15
    MemorySize: 256
    Environment:
      Variables:
        DYNAMODB_TABLE_NAME: !Ref EventAppTable
        COGNITO_USER_POOL_ID: !Ref CognitoUserPool

# ============================================================
# TÀI NGUYÊN (Resources)
# ============================================================
Resources:

  # ----------------------------------------------------------
  # 1. COGNITO USER POOL — Xác thực người dùng
  # ----------------------------------------------------------
  CognitoUserPool:
    Type: AWS::Cognito::UserPool
    Properties:
      UserPoolName: EventApp-UserPool
      AutoVerifiedAttributes:
        - email
      UsernameAttributes:
        - email
      Policies:
        PasswordPolicy:
          MinimumLength: 8
          RequireUppercase: true
          RequireLowercase: true
          RequireNumbers: true
          RequireSymbols: false
      Schema:
        - Name: name
          AttributeDataType: String
          Mutable: true
          Required: true

  CognitoUserPoolClient:
    Type: AWS::Cognito::UserPoolClient
    Properties:
      ClientName: EventApp-WebClient
      UserPoolId: !Ref CognitoUserPool
      GenerateSecret: false
      ExplicitAuthFlows:
        - ALLOW_USER_SRP_AUTH
        - ALLOW_REFRESH_TOKEN_AUTH
      PreventUserExistenceErrors: ENABLED

  CognitoAdminGroup:
    Type: AWS::Cognito::UserPoolGroup
    Properties:
      GroupName: Admin
      UserPoolId: !Ref CognitoUserPool
      Description: Nhóm quản trị viên có quyền CRUD sự kiện

  # ----------------------------------------------------------
  # 2. DYNAMODB TABLE — Cơ sở dữ liệu NoSQL
  # ----------------------------------------------------------
  EventAppTable:
    Type: AWS::DynamoDB::Table
    Properties:
      TableName: EventApp-Data
      BillingMode: PAY_PER_REQUEST            # Đã cấu hình On-Demand để tránh phí
      AttributeDefinitions:
        - AttributeName: PK
          AttributeType: S
        - AttributeName: SK
          AttributeType: S
        - AttributeName: GSI1PK
          AttributeType: S
        - AttributeName: GSI1SK
          AttributeType: S
        - AttributeName: GSI2PK
          AttributeType: S
        - AttributeName: GSI2SK
          AttributeType: S
      KeySchema:
        - AttributeName: PK
          KeyType: HASH
        - AttributeName: SK
          KeyType: RANGE
      GlobalSecondaryIndexes:
        - IndexName: GSI1Index
          KeySchema:
            - AttributeName: GSI1PK
              KeyType: HASH
            - AttributeName: GSI1SK
              KeyType: RANGE
          Projection:
            ProjectionType: ALL
        - IndexName: GSI2Index
          KeySchema:
            - AttributeName: GSI2PK
              KeyType: HASH
            - AttributeName: GSI2SK
              KeyType: RANGE
          Projection:
            ProjectionType: ALL

  # ----------------------------------------------------------
  # 3. API GATEWAY — Cổng tiếp nhận HTTP
  # ----------------------------------------------------------
  EventAppApi:
    Type: AWS::Serverless::Api
    Properties:
      StageName: prod
      Auth:
        DefaultAuthorizer: CognitoAuthorizer
        Authorizers:
          CognitoAuthorizer:
            UserPoolArn: !GetAtt CognitoUserPool.Arn
      Cors:
        AllowMethods: "'GET,POST,PUT,DELETE,OPTIONS'"
        AllowHeaders: "'Content-Type,Authorization'"
        AllowOrigin: "'*'"

  # ----------------------------------------------------------
  # 4. LAMBDA FUNCTIONS — Các hàm xử lý nghiệp vụ
  # ----------------------------------------------------------
  GetEventsFunction:
    Type: AWS::Serverless::Function
    Properties:
      FunctionName: EventApp-GetEvents
      Handler: handlers/getEvents.handler
      CodeUri: dist/
      Policies:
        - DynamoDBReadPolicy:
            TableName: !Ref EventAppTable
      Events:
        GetEvents:
          Type: Api
          Properties:
            RestApiId: !Ref EventAppApi
            Path: /events
            Method: GET
            Auth:
              Authorizer: NONE           # Endpoint công khai

  GetEventByIdFunction:
    Type: AWS::Serverless::Function
    Properties:
      FunctionName: EventApp-GetEventById
      Handler: handlers/getEventById.handler
      CodeUri: dist/
      Policies:
        - DynamoDBReadPolicy:
            TableName: !Ref EventAppTable
      Events:
        GetEventById:
          Type: Api
          Properties:
            RestApiId: !Ref EventAppApi
            Path: /events/{id}
            Method: GET
            Auth:
              Authorizer: NONE           # Endpoint công khai

  CreateEventFunction:
    Type: AWS::Serverless::Function
    Properties:
      FunctionName: EventApp-CreateEvent
      Handler: handlers/createEvent.handler
      CodeUri: dist/
      Policies:
        - DynamoDBCrudPolicy:
            TableName: !Ref EventAppTable
      Events:
        CreateEvent:
          Type: Api
          Properties:
            RestApiId: !Ref EventAppApi
            Path: /events
            Method: POST
            # Auth: Mặc định dùng CognitoAuthorizer (yêu cầu JWT)

  RegisterEventFunction:
    Type: AWS::Serverless::Function
    Properties:
      FunctionName: EventApp-RegisterEvent
      Handler: handlers/registerEvent.handler
      CodeUri: dist/
      Policies:
        - DynamoDBCrudPolicy:
            TableName: !Ref EventAppTable
      Events:
        RegisterEvent:
          Type: Api
          Properties:
            RestApiId: !Ref EventAppApi
            Path: /events/{id}/register
            Method: POST

  GetUserRegistrationsFunction:
    Type: AWS::Serverless::Function
    Properties:
      FunctionName: EventApp-GetUserRegistrations
      Handler: handlers/getUserRegistrations.handler
      CodeUri: dist/
      Policies:
        - DynamoDBReadPolicy:
            TableName: !Ref EventAppTable
      Events:
        GetUserRegistrations:
          Type: Api
          Properties:
            RestApiId: !Ref EventAppApi
            Path: /users/registrations
            Method: GET

  UpdateEventFunction:
    Type: AWS::Serverless::Function
    Properties:
      FunctionName: EventApp-UpdateEvent
      Handler: handlers/updateEvent.handler
      CodeUri: dist/
      Policies:
        - DynamoDBCrudPolicy:
            TableName: !Ref EventAppTable
      Events:
        UpdateEvent:
          Type: Api
          Properties:
            RestApiId: !Ref EventAppApi
            Path: /events/{id}
            Method: PUT

  DeleteEventFunction:
    Type: AWS::Serverless::Function
    Properties:
      FunctionName: EventApp-DeleteEvent
      Handler: handlers/deleteEvent.handler
      CodeUri: dist/
      Policies:
        - DynamoDBCrudPolicy:
            TableName: !Ref EventAppTable
      Events:
        DeleteEvent:
          Type: Api
          Properties:
            RestApiId: !Ref EventAppApi
            Path: /events/{id}
            Method: DELETE

# ============================================================
# OUTPUTS — Thông tin xuất ra sau khi deploy thành công
# ============================================================
Outputs:
  ApiUrl:
    Description: URL gốc của API Gateway sau khi deploy
    Value: !Sub "https://${EventAppApi}.execute-api.${AWS::Region}.amazonaws.com/prod"
  UserPoolId:
    Description: ID của Cognito User Pool
    Value: !Ref CognitoUserPool
  UserPoolClientId:
    Description: Client ID để tích hợp vào Frontend
    Value: !Ref CognitoUserPoolClient
  DynamoDBTableName:
    Description: Tên bảng DynamoDB
    Value: !Ref EventAppTable
```

---

## 4. Các Lệnh SAM Thường Dùng

### 4.1. Kiểm thử cục bộ (Local Testing)
```bash
# Kiểm thử 1 hàm Lambda riêng lẻ với dữ liệu đầu vào giả lập
sam local invoke GetEventsFunction --event events/get-events.json

# Khởi chạy API Gateway giả lập trên localhost:3001
sam local start-api --port 3001
```

### 4.2. Triển khai lên AWS Cloud
```bash
# Lần đầu tiên: SAM sẽ hỏi cấu hình (Region, Stack Name...)
sam deploy --guided

# Các lần tiếp theo: Dùng cấu hình đã lưu trong samconfig.toml
sam deploy

# Xóa toàn bộ tài nguyên đã tạo (clean up)
sam delete --stack-name EventApp
```

### 4.3. Xem log CloudWatch từ terminal
```bash
# Xem log realtime của hàm GetEvents
sam logs -n GetEventsFunction --stack-name EventApp --tail
```

---

## 5. Lưu Ý Khi Dùng IaC Với AWS Free Tier

> ⚠️ **CẢNH BÁO:** Khi chạy `sam deploy`, SAM sẽ tạo một **CloudFormation Stack** trên AWS. Stack này quản lý toàn bộ tài nguyên. Nếu bạn muốn xóa hết tài nguyên để tránh phát sinh phí, hãy chạy `sam delete` thay vì vào Console xóa từng dịch vụ một — vì xóa tay có thể để sót tài nguyên "mồ côi" (orphaned resources) vẫn tính phí.

> 💡 **MẸO:** Tệp `samconfig.toml` được sinh ra sau `sam deploy --guided` chứa toàn bộ cấu hình deploy. Hãy commit tệp này vào Git để đội ngũ không cần cấu hình lại từ đầu.
