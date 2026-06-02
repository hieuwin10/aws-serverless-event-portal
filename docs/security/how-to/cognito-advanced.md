# Cấu Hình Cognito Nâng Cao

## Vấn Đề

Cognito User Pool mặc định có nhiều điểm yếu bảo mật:
- **Không có MFA** — tài khoản dễ bị brute-force hoặc credential stuffing
- **Password policy yếu** — mật khẩu ngắn, không có ký tự đặc biệt
- **Không có custom authentication flows** — không thể tùy chỉnh logic xác thực
- **Không bật advanced security** — không phát hiện được tấn công account takeover
- **Thiếu app client restrictions** — token có thể bị lạm dụng

## Giải Pháp

Cấu hình Cognito User Pool với:
1. **MFA** (Multi-Factor Authentication) — bắt buộc hoặc tùy chọn
2. **Strong password policy** — tối thiểu 12 ký tự, có chữ hoa, số, ký tự đặc biệt
3. **Lambda Triggers** — custom authentication flows
4. **Advanced Security** — risk-based authentication (AUDIT/ENFORCED mode)
5. **App Client** — chỉ cho phép Auth Flows cần thiết

## Điều Kiện Tiên Quyết

- AWS CLI đã cài đặt và cấu hình
- Node.js 18+ và AWS SAM CLI
- Cognito User Pool đã tồn tại (xem [security-hardening.md](./security-hardening.md))
- IAM permissions: `cognito-idp:*`

> ⚠️ **Chi phí**: Software Token MFA miễn phí. SMS MFA tốn $0.00645/SMS. Advanced Security ENFORCED mode tốn $0.05/MAU (Monthly Active User) — vượt Free Tier khi có nhiều users.

---

## Bước 1: Cập Nhật Cognito User Pool Qua CloudFormation

Thay thế Cognito User Pool hiện tại bằng template nâng cao:

```yaml
# cognito-advanced.yaml
AWSTemplateFormatVersion: '2010-09-09'
Description: 'Cognito User Pool nâng cao với MFA và Advanced Security'

Parameters:
  Environment:
    Type: String
    Default: dev
    AllowedValues: [dev, staging, prod]
  MFAConfiguration:
    Type: String
    Default: OPTIONAL
    AllowedValues: [OFF, OPTIONAL, ON]
    Description: "OPTIONAL = user chọn, ON = bắt buộc"
  AdvancedSecurityMode:
    Type: String
    Default: AUDIT
    AllowedValues: [OFF, AUDIT, ENFORCED]
    Description: "AUDIT = chỉ log, ENFORCED = tự động block"

Resources:
  # SNS Role cho SMS MFA
  CognitoSNSRole:
    Type: AWS::IAM::Role
    Properties:
      RoleName: !Sub 'CognitoSNSRole-${Environment}'
      AssumeRolePolicyDocument:
        Version: '2012-10-17'
        Statement:
          - Effect: Allow
            Principal:
              Service: cognito-idp.amazonaws.com
            Action: sts:AssumeRole
            Condition:
              StringEquals:
                sts:ExternalId: !Sub 'CognitoSNS-${Environment}'
      Policies:
        - PolicyName: CognitoSNSPolicy
          PolicyDocument:
            Version: '2012-10-17'
            Statement:
              - Effect: Allow
                Action: sns:Publish
                Resource: '*'

  # Lambda Role cho Triggers
  CognitoTriggerRole:
    Type: AWS::IAM::Role
    Properties:
      RoleName: !Sub 'CognitoTriggerRole-${Environment}'
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
        - PolicyName: CognitoTriggerPolicy
          PolicyDocument:
            Version: '2012-10-17'
            Statement:
              - Effect: Allow
                Action:
                  - cognito-idp:AdminGetUser
                  - cognito-idp:AdminUpdateUserAttributes
                Resource: !Sub 'arn:aws:cognito-idp:${AWS::Region}:${AWS::AccountId}:userpool/*'

  # Pre-Authentication Lambda Trigger
  PreAuthLambda:
    Type: AWS::Lambda::Function
    Properties:
      FunctionName: !Sub 'cognito-pre-auth-${Environment}'
      Runtime: nodejs18.x
      Handler: index.handler
      Role: !GetAtt CognitoTriggerRole.Arn
      Timeout: 10
      Environment:
        Variables:
          ENVIRONMENT: !Ref Environment
          MAX_FAILED_ATTEMPTS: '5'
      Code:
        ZipFile: |
          exports.handler = async (event) => {
            console.log('Pre-Auth trigger:', JSON.stringify(event));
            // Cho phép authentication tiếp tục
            return event;
          };

  # Post-Authentication Lambda Trigger
  PostAuthLambda:
    Type: AWS::Lambda::Function
    Properties:
      FunctionName: !Sub 'cognito-post-auth-${Environment}'
      Runtime: nodejs18.x
      Handler: index.handler
      Role: !GetAtt CognitoTriggerRole.Arn
      Timeout: 10
      Environment:
        Variables:
          ENVIRONMENT: !Ref Environment
      Code:
        ZipFile: |
          exports.handler = async (event) => {
            console.log('Post-Auth trigger:', JSON.stringify(event));
            return event;
          };

  # Custom Message Lambda Trigger
  CustomMessageLambda:
    Type: AWS::Lambda::Function
    Properties:
      FunctionName: !Sub 'cognito-custom-message-${Environment}'
      Runtime: nodejs18.x
      Handler: index.handler
      Role: !GetAtt CognitoTriggerRole.Arn
      Timeout: 10
      Environment:
        Variables:
          APP_NAME: 'AWS Event Portal'
      Code:
        ZipFile: |
          exports.handler = async (event) => {
            if (event.triggerSource === 'CustomMessage_SignUp') {
              event.response.emailSubject = 'Xác nhận tài khoản - AWS Event Portal';
              event.response.emailMessage = `
                <h2>Chào mừng đến với AWS Event Portal!</h2>
                <p>Mã xác nhận của bạn: <strong>${event.request.codeParameter}</strong></p>
                <p>Mã này có hiệu lực trong 24 giờ.</p>
              `;
            }
            if (event.triggerSource === 'CustomMessage_ForgotPassword') {
              event.response.emailSubject = 'Đặt lại mật khẩu - AWS Event Portal';
              event.response.emailMessage = `
                <h2>Đặt lại mật khẩu</h2>
                <p>Mã xác nhận: <strong>${event.request.codeParameter}</strong></p>
                <p>Nếu bạn không yêu cầu, hãy bỏ qua email này.</p>
              `;
            }
            return event;
          };

  # Lambda Permissions cho Cognito
  PreAuthLambdaPermission:
    Type: AWS::Lambda::Permission
    Properties:
      FunctionName: !GetAtt PreAuthLambda.Arn
      Action: lambda:InvokeFunction
      Principal: cognito-idp.amazonaws.com
      SourceArn: !GetAtt EventUserPool.Arn

  PostAuthLambdaPermission:
    Type: AWS::Lambda::Permission
    Properties:
      FunctionName: !GetAtt PostAuthLambda.Arn
      Action: lambda:InvokeFunction
      Principal: cognito-idp.amazonaws.com
      SourceArn: !GetAtt EventUserPool.Arn

  CustomMessageLambdaPermission:
    Type: AWS::Lambda::Permission
    Properties:
      FunctionName: !GetAtt CustomMessageLambda.Arn
      Action: lambda:InvokeFunction
      Principal: cognito-idp.amazonaws.com
      SourceArn: !GetAtt EventUserPool.Arn

  # Cognito User Pool nâng cao
  EventUserPool:
    Type: AWS::Cognito::UserPool
    Properties:
      UserPoolName: !Sub 'EventUserPool-${Environment}'
      
      # Alias settings — cho phép đăng nhập bằng email
      UsernameAttributes:
        - email
      UsernameConfiguration:
        CaseSensitive: false
      
      # Password Policy mạnh
      Policies:
        PasswordPolicy:
          MinimumLength: 12
          RequireUppercase: true
          RequireLowercase: true
          RequireNumbers: true
          RequireSymbols: true
          TemporaryPasswordValidityDays: 7
      
      # MFA Configuration
      MfaConfiguration: !Ref MFAConfiguration
      EnabledMfas:
        - SOFTWARE_TOKEN_MFA  # Google Authenticator, Authy (Free)
        # - SMS_MFA           # Bật nếu cần SMS (tốn phí)
      
      # SMS Configuration (cần thiết nếu bật SMS MFA)
      SmsConfiguration:
        ExternalId: !Sub 'CognitoSNS-${Environment}'
        SnsCallerArn: !GetAtt CognitoSNSRole.Arn
      
      # Account Recovery
      AccountRecoverySetting:
        RecoveryMechanisms:
          - Name: verified_email
            Priority: 1
      
      # Auto-verify email
      AutoVerifiedAttributes:
        - email
      
      # Email configuration
      EmailConfiguration:
        EmailSendingAccount: COGNITO_DEFAULT  # Dùng Cognito email (Free Tier)
        # EmailSendingAccount: DEVELOPER     # Dùng SES nếu cần custom domain
      
      # User attributes
      Schema:
        - Name: email
          AttributeDataType: String
          Required: true
          Mutable: true
        - Name: name
          AttributeDataType: String
          Required: true
          Mutable: true
        - Name: custom:role
          AttributeDataType: String
          Mutable: true
      
      # Advanced Security Mode
      UserPoolAddOns:
        AdvancedSecurityMode: !Ref AdvancedSecurityMode
      
      # Lambda Triggers
      LambdaConfig:
        PreAuthentication: !GetAtt PreAuthLambda.Arn
        PostAuthentication: !GetAtt PostAuthLambda.Arn
        CustomMessage: !GetAtt CustomMessageLambda.Arn
      
      # Admin create user config
      AdminCreateUserConfig:
        AllowAdminCreateUserOnly: false
        InviteMessageTemplate:
          EmailSubject: 'Tài khoản tạm thời - AWS Event Portal'
          EmailMessage: |
            Tài khoản của bạn đã được tạo.
            Username: {username}
            Mật khẩu tạm thời: {####}
      
      # Device tracking
      DeviceConfiguration:
        ChallengeRequiredOnNewDevice: true
        DeviceOnlyRememberedOnUserPrompt: true

  # App Client (không có client secret cho SPA)
  EventUserPoolClient:
    Type: AWS::Cognito::UserPoolClient
    Properties:
      ClientName: !Sub 'EventApp-${Environment}'
      UserPoolId: !Ref EventUserPool
      GenerateSecret: false  # SPA không cần client secret
      
      # Chỉ cho phép các auth flows cần thiết
      ExplicitAuthFlows:
        - ALLOW_USER_SRP_AUTH        # SRP (Secure Remote Password) — an toàn nhất
        - ALLOW_REFRESH_TOKEN_AUTH   # Refresh token
        # KHÔNG bật ALLOW_USER_PASSWORD_AUTH (truyền password trực tiếp)
      
      # Token validity
      AccessTokenValidity: 1        # 1 giờ
      IdTokenValidity: 1            # 1 giờ
      RefreshTokenValidity: 30      # 30 ngày
      TokenValidityUnits:
        AccessToken: hours
        IdToken: hours
        RefreshToken: days
      
      # Prevent user existence errors
      PreventUserExistenceErrors: ENABLED
      
      # OAuth settings (nếu cần Hosted UI)
      AllowedOAuthFlows:
        - code           # Authorization Code Flow (khuyến nghị)
      AllowedOAuthScopes:
        - email
        - openid
        - profile
      AllowedOAuthFlowsUserPoolClient: true
      CallbackURLs:
        - !Sub 'https://app.${Environment}.event-portal.com/callback'
        - 'http://localhost:3000/callback'  # Chỉ dùng trong dev
      LogoutURLs:
        - !Sub 'https://app.${Environment}.event-portal.com/logout'
        - 'http://localhost:3000'

  # User Pool Domain (cho Hosted UI)
  UserPoolDomain:
    Type: AWS::Cognito::UserPoolDomain
    Properties:
      Domain: !Sub 'event-portal-${Environment}-${AWS::AccountId}'
      UserPoolId: !Ref EventUserPool

Outputs:
  UserPoolId:
    Value: !Ref EventUserPool
    Export:
      Name: !Sub '${AWS::StackName}-UserPoolId'
  UserPoolClientId:
    Value: !Ref EventUserPoolClient
    Export:
      Name: !Sub '${AWS::StackName}-UserPoolClientId'
  UserPoolArn:
    Value: !GetAtt EventUserPool.Arn
    Export:
      Name: !Sub '${AWS::StackName}-UserPoolArn'
```

**Triển khai:**
```bash
# Deploy CloudFormation stack
aws cloudformation deploy \
  --template-file cognito-advanced.yaml \
  --stack-name event-portal-cognito-dev \
  --parameter-overrides \
    Environment=dev \
    MFAConfiguration=OPTIONAL \
    AdvancedSecurityMode=AUDIT \
  --capabilities CAPABILITY_NAMED_IAM

# Lấy output
aws cloudformation describe-stacks \
  --stack-name event-portal-cognito-dev \
  --query 'Stacks[0].Outputs'
```

---

## Bước 2: Triển Khai Lambda Triggers Hoàn Chỉnh

### 2.1 Pre-Authentication Trigger — Kiểm Tra Trước Khi Đăng Nhập

File: `backend/src/functions/cognito-pre-auth/index.ts`

```typescript
import { PreAuthenticationTriggerEvent } from 'aws-lambda';

// Danh sách IP bị chặn (có thể lưu vào DynamoDB hoặc Parameter Store)
const BLOCKED_IPS: string[] = process.env.BLOCKED_IPS?.split(',') || [];

// Số lần đăng nhập thất bại tối đa (lưu trong session — ví dụ minh họa)
const MAX_FAILED_ATTEMPTS = parseInt(process.env.MAX_FAILED_ATTEMPTS || '5');

export const handler = async (
  event: PreAuthenticationTriggerEvent
): Promise<PreAuthenticationTriggerEvent> => {
  console.log('Pre-Auth Event:', JSON.stringify({
    userPoolId: event.userPoolId,
    username: event.userName,
    callerContext: event.callerContext,
    request: {
      userAttributes: event.request.userAttributes,
      validationData: event.request.validationData,
    },
  }));

  const { userAttributes, validationData } = event.request;

  // 1. Kiểm tra user có bị disable không
  if (userAttributes['cognito:user_status'] === 'DISABLED') {
    throw new Error('PreAuthentication failed with error: Tài khoản đã bị vô hiệu hóa.');
  }

  // 2. Kiểm tra email đã được xác minh chưa
  if (userAttributes.email_verified !== 'true') {
    throw new Error('PreAuthentication failed with error: Email chưa được xác minh.');
  }

  // 3. Kiểm tra IP bị chặn (nếu client gửi IP trong validationData)
  const clientIp = validationData?.['client-ip'];
  if (clientIp && BLOCKED_IPS.includes(clientIp)) {
    console.warn(`Blocked IP attempt: ${clientIp}`);
    throw new Error('PreAuthentication failed with error: Truy cập bị từ chối.');
  }

  // 4. Log thành công để giám sát
  console.log(`Pre-auth passed for user: ${event.userName}`);

  return event;
};
```

### 2.2 Post-Authentication Trigger — Ghi Log Sau Khi Đăng Nhập

```typescript
import { PostAuthenticationTriggerEvent } from 'aws-lambda';
import { CloudWatchClient, PutMetricDataCommand } from '@aws-sdk/client-cloudwatch';

const cloudwatch = new CloudWatchClient({ region: process.env.AWS_REGION });

export const handler = async (
  event: PostAuthenticationTriggerEvent
): Promise<PostAuthenticationTriggerEvent> => {
  const { userAttributes } = event.request;
  const username = event.userName;
  const isMFAAuthenticated = event.request.newDeviceUsed || false;

  console.log('Post-Auth Event:', JSON.stringify({
    username,
    email: userAttributes.email,
    mfaAuthenticated: isMFAAuthenticated,
    timestamp: new Date().toISOString(),
  }));

  // Gửi custom metric lên CloudWatch
  try {
    await cloudwatch.send(new PutMetricDataCommand({
      Namespace: 'EventPortal/Auth',
      MetricData: [
        {
          MetricName: 'SuccessfulLogins',
          Value: 1,
          Unit: 'Count',
          Dimensions: [
            { Name: 'Environment', Value: process.env.ENVIRONMENT || 'dev' },
            { Name: 'MFAUsed', Value: isMFAAuthenticated ? 'true' : 'false' },
          ],
        },
      ],
    }));
  } catch (error) {
    // Không block authentication nếu CloudWatch lỗi
    console.error('Failed to push CloudWatch metric:', error);
  }

  return event;
};
```

### 2.3 Custom Message Trigger — Email Tùy Chỉnh

```typescript
import { CustomMessageTriggerEvent } from 'aws-lambda';

const APP_NAME = process.env.APP_NAME || 'AWS Event Portal';
const APP_URL = process.env.APP_URL || 'https://event-portal.com';

export const handler = async (
  event: CustomMessageTriggerEvent
): Promise<CustomMessageTriggerEvent> => {
  const { triggerSource, request, response } = event;

  switch (triggerSource) {
    case 'CustomMessage_SignUp':
      response.emailSubject = `[${APP_NAME}] Xác nhận địa chỉ email`;
      response.emailMessage = buildConfirmationEmail(
        request.usernameParameter,
        request.codeParameter
      );
      break;

    case 'CustomMessage_ForgotPassword':
      response.emailSubject = `[${APP_NAME}] Đặt lại mật khẩu`;
      response.emailMessage = buildPasswordResetEmail(
        request.usernameParameter,
        request.codeParameter
      );
      break;

    case 'CustomMessage_ResendCode':
      response.emailSubject = `[${APP_NAME}] Mã xác nhận mới`;
      response.emailMessage = buildResendCodeEmail(request.codeParameter);
      break;

    case 'CustomMessage_VerifyUserAttribute':
      response.emailSubject = `[${APP_NAME}] Xác nhận thay đổi email`;
      response.emailMessage = buildVerifyEmailEmail(request.codeParameter);
      break;

    default:
      console.log(`Unhandled trigger source: ${triggerSource}`);
  }

  return event;
};

function buildConfirmationEmail(username: string, code: string): string {
  return `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #232f3e;">Chào mừng đến với ${APP_NAME}!</h2>
  <p>Xin chào <strong>${username}</strong>,</p>
  <p>Mã xác nhận email của bạn là:</p>
  <div style="background: #f0f0f0; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; margin: 20px 0;">
    ${code}
  </div>
  <p>Mã này có hiệu lực trong <strong>24 giờ</strong>.</p>
  <p>Nếu bạn không đăng ký tài khoản, hãy bỏ qua email này.</p>
  <hr>
  <p style="color: #888; font-size: 12px;">${APP_NAME} | ${APP_URL}</p>
</body>
</html>`;
}

function buildPasswordResetEmail(username: string, code: string): string {
  return `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #d13212;">Đặt Lại Mật Khẩu</h2>
  <p>Xin chào <strong>${username}</strong>,</p>
  <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu. Mã xác nhận của bạn:</p>
  <div style="background: #f0f0f0; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; margin: 20px 0;">
    ${code}
  </div>
  <p>Mã này có hiệu lực trong <strong>1 giờ</strong>.</p>
  <p style="color: #d13212;"><strong>Nếu bạn không yêu cầu đặt lại mật khẩu, hãy liên hệ ngay với chúng tôi.</strong></p>
  <hr>
  <p style="color: #888; font-size: 12px;">${APP_NAME} | ${APP_URL}</p>
</body>
</html>`;
}

function buildResendCodeEmail(code: string): string {
  return `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2>Mã Xác Nhận Mới</h2>
  <p>Mã xác nhận mới của bạn:</p>
  <div style="background: #f0f0f0; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px;">
    ${code}
  </div>
  <p>Mã này có hiệu lực trong <strong>24 giờ</strong>.</p>
</body>
</html>`;
}

function buildVerifyEmailEmail(code: string): string {
  return `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif;">
  <h2>Xác Nhận Thay Đổi Email</h2>
  <p>Mã xác nhận địa chỉ email mới:</p>
  <div style="background: #f0f0f0; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px;">
    ${code}
  </div>
</body>
</html>`;
}
```

---

## Bước 3: Bật và Cấu Hình MFA Qua AWS CLI

```bash
#!/bin/bash
# Lấy USER_POOL_ID từ CloudFormation output
USER_POOL_ID=$(aws cloudformation describe-stacks \
  --stack-name event-portal-cognito-dev \
  --query 'Stacks[0].Outputs[?OutputKey==`UserPoolId`].OutputValue' \
  --output text)

echo "User Pool ID: $USER_POOL_ID"

# Kiểm tra cấu hình MFA hiện tại
aws cognito-idp get-user-pool-mfa-config \
  --user-pool-id $USER_POOL_ID

# Cấu hình Software Token MFA (TOTP — Google Authenticator)
aws cognito-idp set-user-pool-mfa-config \
  --user-pool-id $USER_POOL_ID \
  --software-token-mfa-configuration Enabled=true \
  --mfa-configuration OPTIONAL

# Kiểm tra Advanced Security Mode
aws cognito-idp describe-user-pool \
  --user-pool-id $USER_POOL_ID \
  --query 'UserPool.UserPoolAddOns'

# Cập nhật Advanced Security lên ENFORCED (sau khi kiểm tra AUDIT logs)
# CẢNH BÁO: Tốn $0.05/MAU — chỉ bật ở production
# aws cognito-idp update-user-pool \
#   --user-pool-id $USER_POOL_ID \
#   --user-pool-add-ons AdvancedSecurityMode=ENFORCED
```

---

## Bước 4: Quản Lý Users Qua AWS CLI

```bash
#!/bin/bash
USER_POOL_ID="us-east-1_XXXXXXX"  # Thay bằng User Pool ID thực

# 4.1 Liệt kê tất cả users
aws cognito-idp list-users \
  --user-pool-id $USER_POOL_ID \
  --limit 20

# 4.2 Lấy thông tin chi tiết 1 user
aws cognito-idp admin-get-user \
  --user-pool-id $USER_POOL_ID \
  --username "user@example.com"

# 4.3 Enable MFA bắt buộc cho 1 user cụ thể
aws cognito-idp admin-set-user-mfa-preference \
  --user-pool-id $USER_POOL_ID \
  --username "user@example.com" \
  --software-token-mfa-settings Enabled=true,PreferredMfa=true

# 4.4 Reset password cho user (gửi temporary password)
aws cognito-idp admin-reset-user-password \
  --user-pool-id $USER_POOL_ID \
  --username "user@example.com"

# 4.5 Disable user (khóa tài khoản)
aws cognito-idp admin-disable-user \
  --user-pool-id $USER_POOL_ID \
  --username "user@example.com"

# 4.6 Enable user (mở khóa)
aws cognito-idp admin-enable-user \
  --user-pool-id $USER_POOL_ID \
  --username "user@example.com"

# 4.7 Xóa user (cẩn thận!)
# aws cognito-idp admin-delete-user \
#   --user-pool-id $USER_POOL_ID \
#   --username "user@example.com"

# 4.8 Kiểm tra Advanced Security risk events (nếu bật)
aws cognito-idp admin-list-user-auth-events \
  --user-pool-id $USER_POOL_ID \
  --username "user@example.com" \
  --max-results 10
```

---

## Bước 5: Tích Hợp MFA Trong Frontend (TypeScript/React)

```typescript
// src/services/auth.ts
import {
  CognitoIdentityProviderClient,
  AssociateSoftwareTokenCommand,
  VerifySoftwareTokenCommand,
  SetUserMFAPreferenceCommand,
  RespondToAuthChallengeCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { Amplify, Auth } from 'aws-amplify';

// Cấu hình Amplify
Amplify.configure({
  Auth: {
    region: process.env.REACT_APP_AWS_REGION,
    userPoolId: process.env.REACT_APP_USER_POOL_ID,
    userPoolWebClientId: process.env.REACT_APP_USER_POOL_CLIENT_ID,
  },
});

// ---- Đăng nhập với xử lý MFA challenge ----
export async function signInWithMFA(
  username: string,
  password: string
): Promise<{ user: any; requiresMFA: boolean; mfaType?: string }> {
  try {
    const user = await Auth.signIn(username, password);

    if (user.challengeName === 'SOFTWARE_TOKEN_MFA') {
      // User cần nhập TOTP code từ Authenticator app
      return { user, requiresMFA: true, mfaType: 'TOTP' };
    }

    if (user.challengeName === 'SMS_MFA') {
      // User cần nhập OTP từ SMS
      return { user, requiresMFA: true, mfaType: 'SMS' };
    }

    if (user.challengeName === 'MFA_SETUP') {
      // User chưa cài đặt MFA, cần setup
      return { user, requiresMFA: true, mfaType: 'SETUP_REQUIRED' };
    }

    return { user, requiresMFA: false };
  } catch (error: any) {
    if (error.code === 'UserNotConfirmedException') {
      throw new Error('Email chưa được xác nhận. Vui lòng kiểm tra hộp thư.');
    }
    if (error.code === 'NotAuthorizedException') {
      throw new Error('Email hoặc mật khẩu không đúng.');
    }
    if (error.code === 'UserNotFoundException') {
      throw new Error('Tài khoản không tồn tại.');
    }
    throw error;
  }
}

// ---- Xác nhận MFA code ----
export async function confirmMFACode(
  user: any,
  code: string
): Promise<void> {
  await Auth.confirmSignIn(user, code, 'SOFTWARE_TOKEN_MFA');
}

// ---- Setup TOTP MFA lần đầu ----
export async function setupTOTPMFA(): Promise<{
  qrCodeUrl: string;
  secretCode: string;
}> {
  const user = await Auth.currentAuthenticatedUser();

  // Lấy secret token để hiển thị QR code
  const totpSetup = await Auth.setupTOTP(user);
  const secretCode = totpSetup.unverified.secretCode;

  // Tạo URL cho QR code (dùng với Google Authenticator)
  const issuer = encodeURIComponent('AWS Event Portal');
  const accountName = encodeURIComponent(user.attributes.email);
  const qrCodeUrl = `otpauth://totp/${issuer}:${accountName}?secret=${secretCode}&issuer=${issuer}`;

  return { qrCodeUrl, secretCode };
}

// ---- Xác nhận TOTP setup ----
export async function verifyTOTPSetup(code: string): Promise<void> {
  const user = await Auth.currentAuthenticatedUser();
  await Auth.verifyTotpToken(user, code);

  // Đặt TOTP làm phương thức MFA ưa thích
  await Auth.setPreferredMFA(user, 'TOTP');
}
```

---

## Bước 6: Kiểm Tra Advanced Security Events

```bash
#!/bin/bash
USER_POOL_ID="us-east-1_XXXXXXX"
USERNAME="user@example.com"

# Lấy risk events (yêu cầu Advanced Security bật)
aws cognito-idp admin-list-user-auth-events \
  --user-pool-id $USER_POOL_ID \
  --username $USERNAME \
  --max-results 20 \
  --query 'AuthEvents[*].{
    EventId:EventId,
    EventType:EventType,
    CreationDate:CreationDate,
    RiskDecision:EventRisk.RiskDecision,
    RiskLevel:EventRisk.RiskLevel
  }'

# Xem Cognito logs trong CloudWatch
aws logs filter-log-events \
  --log-group-name /aws/cognito/userpools \
  --filter-pattern 'RISK_CHANGED' \
  --start-time $(date -d '1 hour ago' +%s000) \
  --limit 20
```

---

## Xác Minh

```bash
#!/bin/bash
USER_POOL_ID=$(aws cloudformation describe-stacks \
  --stack-name event-portal-cognito-dev \
  --query 'Stacks[0].Outputs[?OutputKey==`UserPoolId`].OutputValue' \
  --output text)

# Kiểm tra password policy
echo "=== Password Policy ==="
aws cognito-idp describe-user-pool \
  --user-pool-id $USER_POOL_ID \
  --query 'UserPool.Policies.PasswordPolicy'

# Kiểm tra MFA config
echo "=== MFA Configuration ==="
aws cognito-idp get-user-pool-mfa-config \
  --user-pool-id $USER_POOL_ID

# Kiểm tra Lambda triggers
echo "=== Lambda Triggers ==="
aws cognito-idp describe-user-pool \
  --user-pool-id $USER_POOL_ID \
  --query 'UserPool.LambdaConfig'

# Kiểm tra Advanced Security
echo "=== Advanced Security ==="
aws cognito-idp describe-user-pool \
  --user-pool-id $USER_POOL_ID \
  --query 'UserPool.UserPoolAddOns'
```

---

## Lưu Ý

| Tính năng | Free Tier | Chi phí |
|-----------|-----------|---------|
| Software Token MFA (TOTP) | ✅ Miễn phí | $0 |
| SMS MFA | ❌ Tốn phí | $0.00645/SMS |
| Advanced Security (AUDIT) | ✅ Miễn phí | $0 |
| Advanced Security (ENFORCED) | ❌ Tốn phí | $0.05/MAU |
| Lambda Triggers | ✅ Free Tier Lambda | Xem [cost-optimization.md](../operations/how-to/cost-optimization.md) |

> ⚠️ **Quan trọng**: Khi migrate từ User Pool cũ sang cấu hình mới, không thể thay đổi `UsernameAttributes` sau khi tạo. Cần tạo User Pool mới và migrate users.

## Tài Liệu Liên Quan

- [security-hardening.md](./security-hardening.md) — Hardening tổng thể
- [iam-policies.md](../reference/iam-policies.md) — IAM policies cho Cognito
- [waf-configuration.md](./waf-configuration.md) — WAF bảo vệ API Gateway
- [monitoring-alerting.md](../../operations/how-to/monitoring-alerting.md) — Giám sát login events
- [AWS Cognito Developer Guide](https://docs.aws.amazon.com/cognito/latest/developerguide/)
