---
title: "CI/CD Pipeline với GitHub Actions"
category: How-To
domain: Infrastructure
difficulty: Khó
reading_time: 2.5 giờ
last_updated: 2026-06-12
tags: [cicd, github-actions, deployment, devops]
requirements: [Requirement 10, Requirement 16, Requirement 17]
---
***
*Breadcrumbs: [Trang chủ Well-Architected](../../README.md) > [Chỉ mục](../../index.md) > [Infrastructure](../../index.md#infrastructure) > How-To*
***

# CI/CD Pipeline Nâng Cao

## Vấn đề

Quy trình triển khai hiện tại hoàn toàn thủ công:
- **Không có automated testing** — lỗi chỉ phát hiện sau khi deploy lên production
- **Không có security scanning** — dependencies có thể có lỗ hổng bảo mật
- **Không có blue-green deployment** — downtime khi deploy
- **Không có automatic rollback** — khi lỗi phải fix thủ công
- **Không nhất quán** — mỗi lần deploy có thể khác nhau

## Giải pháp

Pipeline tự động với GitHub Actions gồm 3 stages:
1. **Security Scan** — quét lỗ hổng bảo mật trong dependencies
2. **Automated Testing** — unit tests + integration tests
3. **Blue-Green Deploy** — deploy không downtime với auto-rollback

## Điều kiện tiên quyết

- GitHub repository đã thiết lập
- AWS IAM User với quyền deploy (xem `iam-policies.md`)
- AWS SAM CLI đã cài đặt
- GitHub Secrets đã cấu hình:
  - `AWS_ACCESS_KEY_ID`
  - `AWS_SECRET_ACCESS_KEY`
  - `AWS_REGION`

> 💰 **Chi phí**: GitHub Actions Free Tier — 2,000 phút/tháng cho private repos. AWS SAM deploy tốn Lambda, S3 (trong Free Tier).

---

## Bước 1: Cấu Hình GitHub Secrets

```bash
#!/bin/bash
# Tạo IAM User riêng cho CI/CD (Least Privilege)
aws iam create-user --user-name github-actions-deployer

# Gắn policy deploy (xem iam-policies.md)
aws iam attach-user-policy \
  --user-name github-actions-deployer \
  --policy-arn arn:aws:iam::aws:policy/AWSCloudFormationFullAccess

# Tạo Access Key
aws iam create-access-key \
  --user-name github-actions-deployer \
  --query 'AccessKey.{AccessKeyId:AccessKeyId,SecretAccessKey:SecretAccessKey}'

# Thêm vào GitHub Secrets qua CLI (cần GitHub CLI)
# gh secret set AWS_ACCESS_KEY_ID --body "YOUR_ACCESS_KEY"
# gh secret set AWS_SECRET_ACCESS_KEY --body "YOUR_SECRET_KEY"
# gh secret set AWS_REGION --body "us-east-1"
```

---

## Bước 2: Security Scanning Workflow

File: `.github/workflows/security-scan.yml`

```yaml
name: 🔒 Security Scan

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]
  schedule:
    # Chạy hàng tuần vào thứ Hai 9:00 AM UTC
    - cron: '0 9 * * 1'

permissions:
  contents: read
  security-events: write  # Cần để upload SARIF

jobs:
  # ============================================
  # Job 1: Quét lỗ hổng npm dependencies
  # ============================================
  npm-audit:
    name: NPM Audit
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: backend/package-lock.json

      - name: Audit Backend Dependencies
        working-directory: backend
        run: |
          echo "=== Backend NPM Audit ==="
          npm audit --audit-level=high --json > audit-report.json || true
          
          # Đếm lỗ hổng
          HIGH=$(cat audit-report.json | jq '.metadata.vulnerabilities.high // 0')
          CRITICAL=$(cat audit-report.json | jq '.metadata.vulnerabilities.critical // 0')
          
          echo "Critical: $CRITICAL, High: $HIGH"
          
          if [ "$CRITICAL" -gt "0" ]; then
            echo "❌ Có $CRITICAL lỗ hổng CRITICAL — FAIL"
            exit 1
          fi
          
          if [ "$HIGH" -gt "5" ]; then
            echo "❌ Có $HIGH lỗ hổng HIGH — FAIL (limit: 5)"
            exit 1
          fi
          
          echo "✅ Không có lỗ hổng nghiêm trọng"

      - name: Audit Frontend Dependencies
        working-directory: frontend
        run: |
          npm audit --audit-level=high || true

      - name: Upload Audit Report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: npm-audit-report
          path: backend/audit-report.json

  # ============================================
  # Job 2: Static Application Security Testing
  # ============================================
  sast:
    name: SAST Scan
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Run Semgrep
        uses: semgrep/semgrep-action@v1
        with:
          config: >-
            p/javascript
            p/typescript
            p/owasp-top-ten
            p/secrets
        env:
          SEMGREP_APP_TOKEN: ${{ secrets.SEMGREP_APP_TOKEN }}
        continue-on-error: true  # Không block pipeline nếu Semgrep fails

      - name: Check for hardcoded secrets
        run: |
          echo "=== Scanning for hardcoded secrets ==="
          
          # Tìm patterns nguy hiểm
          if grep -rn \
            -e "AWS_SECRET_ACCESS_KEY\s*=\s*['\"][A-Za-z0-9+/]{40}['\"]" \
            -e "aws_secret_access_key\s*=\s*['\"][A-Za-z0-9+/]{40}['\"]" \
            --include="*.ts" --include="*.js" --include="*.env" \
            --exclude-dir=node_modules \
            --exclude-dir=.git \
            . 2>/dev/null; then
            echo "❌ Phát hiện hardcoded AWS credentials!"
            exit 1
          fi
          
          if grep -rn \
            -e "password\s*=\s*['\"][^'\"]{8,}['\"]" \
            --include="*.ts" --include="*.js" \
            --exclude-dir=node_modules \
            --exclude-dir=.git \
            . 2>/dev/null | grep -v "password.*process.env\|password.*config\|password.*test\|// "; then
            echo "⚠️ Có thể có hardcoded passwords — kiểm tra thủ công"
          fi
          
          echo "✅ Không phát hiện credentials hardcoded"

  # ============================================
  # Job 3: CloudFormation Security Check
  # ============================================
  cfn-security:
    name: CloudFormation Security
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install cfn-nag
        run: gem install cfn-nag

      - name: Scan CloudFormation Templates
        run: |
          echo "=== Scanning CloudFormation templates ==="
          find . -name "*.yaml" -o -name "*.yml" | \
            grep -v node_modules | \
            xargs cfn_nag_scan --input-path 2>/dev/null || true
          echo "✅ CloudFormation security scan complete"
```

---

## Bước 3: Automated Testing Workflow

File: `.github/workflows/test.yml`

```yaml
name: 🧪 Automated Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  # ============================================
  # Job 1: Unit Tests
  # ============================================
  unit-tests:
    name: Unit Tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: backend/package-lock.json

      - name: Install dependencies
        working-directory: backend
        run: npm ci

      - name: Run unit tests
        working-directory: backend
        run: |
          npm test -- \
            --coverage \
            --coverageReporters=json,lcov,text \
            --forceExit \
            --testTimeout=10000
        env:
          NODE_ENV: test
          AWS_REGION: us-east-1

      - name: Check coverage thresholds
        working-directory: backend
        run: |
          COVERAGE=$(cat coverage/coverage-summary.json | \
            jq '.total.lines.pct')
          echo "Code coverage: $COVERAGE%"
          
          if (( $(echo "$COVERAGE < 70" | bc -l) )); then
            echo "❌ Coverage $COVERAGE% thấp hơn ngưỡng 70%"
            exit 1
          fi
          
          echo "✅ Coverage $COVERAGE% đạt ngưỡng"

      - name: Upload coverage report
        uses: codecov/codecov-action@v4
        with:
          directory: backend/coverage
          fail_ci_if_error: false

  # ============================================
  # Job 2: Integration Tests
  # ============================================
  integration-tests:
    name: Integration Tests
    runs-on: ubuntu-latest
    needs: unit-tests
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: backend/package-lock.json

      - name: Install dependencies
        working-directory: backend
        run: npm ci

      - name: Start DynamoDB Local
        run: |
          docker run -d \
            --name dynamodb-local \
            -p 8000:8000 \
            amazon/dynamodb-local \
            -jar DynamoDBLocal.jar -sharedDb

      - name: Create local DynamoDB table
        run: |
          aws dynamodb create-table \
            --table-name EventsTable \
            --attribute-definitions \
              AttributeName=PK,AttributeType=S \
              AttributeName=SK,AttributeType=S \
            --key-schema \
              AttributeName=PK,KeyType=HASH \
              AttributeName=SK,KeyType=RANGE \
            --billing-mode PAY_PER_REQUEST \
            --endpoint-url http://localhost:8000
        env:
          AWS_ACCESS_KEY_ID: local
          AWS_SECRET_ACCESS_KEY: local
          AWS_REGION: us-east-1

      - name: Run integration tests
        working-directory: backend
        run: npm run test:integration
        env:
          NODE_ENV: test
          DYNAMODB_ENDPOINT: http://localhost:8000
          TABLE_NAME: EventsTable
          AWS_ACCESS_KEY_ID: local
          AWS_SECRET_ACCESS_KEY: local
          AWS_REGION: us-east-1

  # ============================================
  # Job 3: Frontend Build Test
  # ============================================
  frontend-build:
    name: Frontend Build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json

      - name: Install & Build
        working-directory: frontend
        run: |
          npm ci
          npm run build
        env:
          REACT_APP_API_URL: https://api.example.com
          REACT_APP_USER_POOL_ID: us-east-1_TEST
          REACT_APP_USER_POOL_CLIENT_ID: test-client-id

      - name: Check build size
        working-directory: frontend
        run: |
          BUILD_SIZE=$(du -sh build/ | cut -f1)
          echo "Build size: $BUILD_SIZE"
```

---

## Bước 4: Blue-Green Deployment Workflow

File: `.github/workflows/deploy.yml`

```yaml
name: 🚀 Deploy to AWS

on:
  push:
    branches: [main]
  workflow_dispatch:
    inputs:
      environment:
        description: 'Deploy environment'
        required: true
        default: 'dev'
        type: choice
        options: [dev, staging, prod]

env:
  AWS_REGION: ${{ secrets.AWS_REGION }}
  SAM_STACK_NAME: event-portal-${{ github.event.inputs.environment || 'dev' }}
  ENVIRONMENT: ${{ github.event.inputs.environment || 'dev' }}

jobs:
  # ============================================
  # Job 1: Build và Package
  # ============================================
  build:
    name: Build & Package
    runs-on: ubuntu-latest
    outputs:
      artifact-bucket: ${{ steps.get-bucket.outputs.bucket }}
    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS Credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Setup SAM
        uses: aws-actions/setup-sam@v2

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'

      - name: SAM Build
        working-directory: backend
        run: sam build --use-container

      - name: Get deployment bucket
        id: get-bucket
        run: |
          BUCKET=$(aws cloudformation describe-stack-resource \
            --stack-name ${{ env.SAM_STACK_NAME }} \
            --logical-resource-id DeploymentBucket \
            --query 'StackResourceDetail.PhysicalResourceId' \
            --output text 2>/dev/null || echo "")
          
          if [ -z "$BUCKET" ]; then
            BUCKET="event-portal-deploy-$(aws sts get-caller-identity --query Account --output text)-${{ env.ENVIRONMENT }}"
            aws s3 mb s3://$BUCKET --region ${{ env.AWS_REGION }} 2>/dev/null || true
          fi
          
          echo "bucket=$BUCKET" >> $GITHUB_OUTPUT
          echo "Deployment bucket: $BUCKET"

      - name: SAM Package
        working-directory: backend
        run: |
          sam package \
            --s3-bucket ${{ steps.get-bucket.outputs.bucket }} \
            --s3-prefix deployments/${{ github.sha }} \
            --output-template-file packaged.yaml

      - name: Upload packaged template
        uses: actions/upload-artifact@v4
        with:
          name: packaged-template
          path: backend/packaged.yaml

  # ============================================
  # Job 2: Deploy với Blue-Green Strategy
  # ============================================
  deploy:
    name: Deploy (${{ github.event.inputs.environment || 'dev' }})
    runs-on: ubuntu-latest
    needs: build
    environment: ${{ github.event.inputs.environment || 'dev' }}
    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS Credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Setup SAM
        uses: aws-actions/setup-sam@v2

      - name: Download packaged template
        uses: actions/download-artifact@v4
        with:
          name: packaged-template
          path: backend

      # Lưu Lambda alias hiện tại để rollback nếu cần
      - name: Save current Lambda versions
        id: save-versions
        run: |
          CURRENT_ALIAS=$(aws lambda get-alias \
            --function-name getEvents \
            --name prod \
            --query 'FunctionVersion' \
            --output text 2>/dev/null || echo "")
          echo "current-version=$CURRENT_ALIAS" >> $GITHUB_OUTPUT
          echo "Current prod version: $CURRENT_ALIAS"

      - name: SAM Deploy
        working-directory: backend
        run: |
          sam deploy \
            --template-file packaged.yaml \
            --stack-name ${{ env.SAM_STACK_NAME }} \
            --parameter-overrides \
              Environment=${{ env.ENVIRONMENT }} \
            --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM \
            --no-confirm-changeset \
            --no-fail-on-empty-changeset \
            --tags \
              Environment=${{ env.ENVIRONMENT }} \
              GitCommit=${{ github.sha }} \
              DeployedAt=$(date -u +%Y-%m-%dT%H:%M:%SZ)

      # ---- Health Check sau khi deploy ----
      - name: Health Check
        id: health-check
        run: |
          echo "Đợi deployment ổn định..."
          sleep 30
          
          API_URL=$(aws cloudformation describe-stacks \
            --stack-name ${{ env.SAM_STACK_NAME }} \
            --query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' \
            --output text)
          
          echo "API URL: $API_URL"
          
          # Test 3 lần
          FAILED=0
          for i in 1 2 3; do
            HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
              --max-time 10 \
              "${API_URL}/events" \
              -H "Content-Type: application/json")
            
            echo "Attempt $i: HTTP $HTTP_CODE"
            
            if [ "$HTTP_CODE" != "200" ] && [ "$HTTP_CODE" != "401" ]; then
              FAILED=$((FAILED + 1))
            fi
            sleep 5
          done
          
          if [ $FAILED -ge 2 ]; then
            echo "::error::Health check FAILED — $FAILED/3 attempts failed"
            echo "health-ok=false" >> $GITHUB_OUTPUT
            exit 1
          fi
          
          echo "✅ Health check PASSED"
          echo "health-ok=true" >> $GITHUB_OUTPUT

      # ---- Auto Rollback nếu health check thất bại ----
      - name: Rollback on Failure
        if: failure() && steps.save-versions.outputs.current-version != ''
        run: |
          echo "❌ Deploy failed — Đang rollback..."
          PREVIOUS_VERSION="${{ steps.save-versions.outputs.current-version }}"
          
          if [ -n "$PREVIOUS_VERSION" ] && [ "$PREVIOUS_VERSION" != "\$LATEST" ]; then
            aws lambda update-alias \
              --function-name getEvents \
              --name prod \
              --function-version $PREVIOUS_VERSION
            
            echo "✅ Đã rollback getEvents về version $PREVIOUS_VERSION"
          fi

      - name: Notify on Success
        if: success()
        run: |
          echo "🚀 Deploy thành công!"
          echo "Environment: ${{ env.ENVIRONMENT }}"
          echo "Commit: ${{ github.sha }}"
          echo "Time: $(date -u)"

  # ============================================
  # Job 3: Deploy Frontend lên S3 + Invalidate CloudFront
  # ============================================
  deploy-frontend:
    name: Deploy Frontend
    runs-on: ubuntu-latest
    needs: deploy
    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS Credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json

      - name: Build Frontend
        working-directory: frontend
        run: |
          npm ci
          npm run build
        env:
          REACT_APP_API_URL: ${{ secrets.API_URL }}
          REACT_APP_USER_POOL_ID: ${{ secrets.USER_POOL_ID }}
          REACT_APP_USER_POOL_CLIENT_ID: ${{ secrets.USER_POOL_CLIENT_ID }}
          REACT_APP_ENVIRONMENT: ${{ env.ENVIRONMENT }}

      - name: Get S3 Bucket và CloudFront ID
        id: get-infra
        run: |
          BUCKET=$(aws cloudformation describe-stacks \
            --stack-name ${{ env.SAM_STACK_NAME }} \
            --query 'Stacks[0].Outputs[?OutputKey==`FrontendBucket`].OutputValue' \
            --output text)
          
          CF_ID=$(aws cloudformation describe-stacks \
            --stack-name ${{ env.SAM_STACK_NAME }} \
            --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontDistributionId`].OutputValue' \
            --output text)
          
          echo "bucket=$BUCKET" >> $GITHUB_OUTPUT
          echo "cf-id=$CF_ID" >> $GITHUB_OUTPUT

      - name: Sync to S3
        run: |
          # Upload static assets với cache dài (hash trong filename)
          aws s3 sync frontend/build/static \
            s3://${{ steps.get-infra.outputs.bucket }}/static \
            --cache-control "public, max-age=31536000, immutable" \
            --delete
          
          # Upload HTML với no-cache
          aws s3 sync frontend/build \
            s3://${{ steps.get-infra.outputs.bucket }} \
            --exclude "static/*" \
            --cache-control "no-cache, no-store, must-revalidate" \
            --delete

      - name: Invalidate CloudFront
        run: |
          aws cloudfront create-invalidation \
            --distribution-id ${{ steps.get-infra.outputs.cf-id }} \
            --paths "/index.html" "/manifest.json"
          
          echo "✅ CloudFront cache invalidated"
```

---

## Bước 5: Cấu Hình AWS CodePipeline (Alternative)

Nếu muốn dùng AWS native tools thay vì GitHub Actions:

```yaml
# codepipeline.yaml
AWSTemplateFormatVersion: '2010-09-09'
Description: 'AWS CodePipeline cho Event Portal'

Parameters:
  GitHubOwner:
    Type: String
    Description: 'GitHub username/org'
  GitHubRepo:
    Type: String
    Default: 'aws-serverless-event-portal'
  GitHubBranch:
    Type: String
    Default: 'main'
  GitHubToken:
    Type: String
    NoEcho: true
    Description: 'GitHub Personal Access Token'

Resources:
  ArtifactBucket:
    Type: AWS::S3::Bucket
    Properties:
      VersioningConfiguration:
        Status: Enabled
      LifecycleConfiguration:
        Rules:
          - Status: Enabled
            ExpirationInDays: 30

  CodeBuildRole:
    Type: AWS::IAM::Role
    Properties:
      AssumeRolePolicyDocument:
        Version: '2012-10-17'
        Statement:
          - Effect: Allow
            Principal:
              Service: codebuild.amazonaws.com
            Action: sts:AssumeRole
      ManagedPolicyArns:
        - arn:aws:iam::aws:policy/AdministratorAccess  # Thu hẹp trong production

  CodePipelineRole:
    Type: AWS::IAM::Role
    Properties:
      AssumeRolePolicyDocument:
        Version: '2012-10-17'
        Statement:
          - Effect: Allow
            Principal:
              Service: codepipeline.amazonaws.com
            Action: sts:AssumeRole
      ManagedPolicyArns:
        - arn:aws:iam::aws:policy/AdministratorAccess

  BuildProject:
    Type: AWS::CodeBuild::Project
    Properties:
      Name: event-portal-build
      ServiceRole: !GetAtt CodeBuildRole.Arn
      Artifacts:
        Type: CODEPIPELINE
      Environment:
        Type: LINUX_CONTAINER
        ComputeType: BUILD_GENERAL1_SMALL
        Image: aws/codebuild/standard:7.0
      Source:
        Type: CODEPIPELINE
        BuildSpec: |
          version: 0.2
          phases:
            install:
              runtime-versions:
                nodejs: 18
              commands:
                - cd backend && npm ci
            pre_build:
              commands:
                - cd backend && npm test
                - npm audit --audit-level=high
            build:
              commands:
                - cd backend && sam build
                - sam package
                  --s3-bucket ${ARTIFACT_BUCKET}
                  --output-template-file packaged.yaml
          artifacts:
            files:
              - backend/packaged.yaml

  Pipeline:
    Type: AWS::CodePipeline::Pipeline
    Properties:
      Name: event-portal-pipeline
      RoleArn: !GetAtt CodePipelineRole.Arn
      ArtifactStore:
        Type: S3
        Location: !Ref ArtifactBucket
      Stages:
        - Name: Source
          Actions:
            - Name: GitHub
              ActionTypeId:
                Category: Source
                Owner: ThirdParty
                Provider: GitHub
                Version: '1'
              Configuration:
                Owner: !Ref GitHubOwner
                Repo: !Ref GitHubRepo
                Branch: !Ref GitHubBranch
                OAuthToken: !Ref GitHubToken
              OutputArtifacts:
                - Name: SourceCode

        - Name: Build
          Actions:
            - Name: Build
              ActionTypeId:
                Category: Build
                Owner: AWS
                Provider: CodeBuild
                Version: '1'
              Configuration:
                ProjectName: !Ref BuildProject
              InputArtifacts:
                - Name: SourceCode
              OutputArtifacts:
                - Name: BuildOutput

        - Name: Deploy-Dev
          Actions:
            - Name: Deploy
              ActionTypeId:
                Category: Deploy
                Owner: AWS
                Provider: CloudFormation
                Version: '1'
              Configuration:
                ActionMode: CREATE_UPDATE
                StackName: event-portal-dev
                TemplatePath: 'BuildOutput::backend/packaged.yaml'
                Capabilities: CAPABILITY_IAM,CAPABILITY_NAMED_IAM
              InputArtifacts:
                - Name: BuildOutput
```

---

## Xác Minh Pipeline

```bash
# Kiểm tra workflow runs gần nhất
gh run list --limit 5

# Xem chi tiết 1 run
gh run view <RUN_ID>

# Xem logs của bước cụ thể
gh run view <RUN_ID> --log

# Trigger thủ công
gh workflow run deploy.yml -f environment=dev
```

---




## Bước tiếp theo

- [Security testing trong pipeline](../../testing/how-to/security-testing.md)
- [Load test sau deploy](../../testing/how-to/load-testing.md)

## Tài liệu liên quan

- [CloudFormation Templates](../reference/cloudformation-templates.md)
- [Security Testing](../../testing/how-to/security-testing.md)

---

**Metadata**:
- **Requirements**: Requirement 10, Requirement 16, Requirement 17, Requirement 18
- **Category**: How-To
- **Domain**: Infrastructure
- **Difficulty**: Khó
- **Estimated Reading/Implementation Time**: 2.5 giờ
- **Last Updated**: 2026-06-12