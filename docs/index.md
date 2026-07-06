---
title: INDEX — Chỉ Mục Tài Liệu Well-Architected
category: Index
domain: Overview
difficulty: Dễ
reading_time: 10 phút
last_updated: 2026-06-12
tags: [index, navigation, bmad-method]
---
# INDEX — Chỉ Mục Tài Liệu Well-Architected

> Phân loại theo **BMAD-METHOD**: Tutorials · How-To Guides · Explanations · References  
> Tổ chức theo **AWS Well-Architected pillars**: Security · Reliability · Performance · Cost · Operations

---

<a id="security"></a>

## 🔒 Security (Bảo Mật)

### How-To Guides

| File | Mô Tả Ngắn | Use Case |
|------|------------|----------|
| [security-hardening.md](./security/how-to/security-hardening.md) | Hardening S3 public access, CloudFront security headers, Lambda least privilege | Khi cần tăng cường bảo mật tổng thể |
| [waf-configuration.md](./security/how-to/waf-configuration.md) | Cấu hình AWS WAF với rate limiting, IP reputation, SQL injection rules | Khi API Gateway cần WAF protection |
| [cognito-advanced.md](./security/how-to/cognito-advanced.md) | Bật MFA, custom password policy, Lambda triggers, advanced user management | Khi cần nâng cao bảo mật authentication |

### References

| File | Mô Tả Ngắn | Use Case |
|------|------------|----------|
| [iam-policies.md](./security/reference/iam-policies.md) | Least Privilege IAM policies cho Lambda, DynamoDB, S3, CloudWatch, API Gateway | Khi cần tham chiếu IAM policy syntax |

---

<a id="operations"></a>

## ⚙️ Operations (Vận Hành)

### How-To Guides

| File | Mô Tả Ngắn | Use Case |
|------|------------|----------|
| [monitoring-alerting.md](./operations/how-to/monitoring-alerting.md) | 10 CloudWatch Alarms quan trọng, Dashboard JSON, SNS notifications, custom metrics | Khi cần thiết lập monitoring |
| [backup-recovery.md](./operations/how-to/backup-recovery.md) | DynamoDB PITR, On-Demand Backup, S3 versioning, lifecycle policies, disaster recovery | Khi cần bảo vệ data |
| [cost-optimization.md](./operations/how-to/cost-optimization.md) | Billing alerts, Lambda right-sizing, DynamoDB optimization, Free Tier monitoring | Khi cần giảm chi phí AWS |

### References

| File | Mô Tả Ngắn | Use Case |
|------|------------|----------|
| [runbooks.md](./operations/reference/runbooks.md) | Runbooks cho Lambda timeout, DynamoDB throttling, Cognito failures, API Gateway 5xx, CloudFront cache | Khi xảy ra incident |

---

<a id="architecture"></a>

## 🏗️ Architecture (Kiến Trúc)

### Tutorials

| File | Mô Tả Ngắn | Use Case |
|------|------------|----------|
| [deploy-serverless-stack.md](./architecture/tutorials/deploy-serverless-stack.md) | Deploy SAM stack từ đầu: build, guided deploy, verify API | Khi mới bắt đầu triển khai lên AWS |

### Explanations

| File | Mô Tả Ngắn | Use Case |
|------|------------|----------|
| [scalability-design.md](./architecture/explanation/scalability-design.md) | DynamoDB auto-scaling, Lambda cold start optimization, API Gateway throttling config | Khi cần hiểu cách scale serverless |

### References

| File | Mô Tả Ngắn | Use Case |
|------|------------|----------|
| [architecture-decisions.md](./architecture/reference/architecture-decisions.md) | ADRs: DynamoDB vs RDS, Lambda vs EC2, Cognito vs custom auth, Single-Table Design | Khi cần hiểu lý do chọn kiến trúc |

---

<a id="infrastructure"></a>

## 🔧 Infrastructure (Hạ Tầng)

### How-To Guides

| File | Mô Tả Ngắn | Use Case |
|------|------------|----------|
| [cicd-pipeline.md](./infrastructure/how-to/cicd-pipeline.md) | GitHub Actions workflows: security scan, automated testing, blue-green deployment | Khi cần thiết lập CI/CD |

### References

| File | Mô Tả Ngắn | Use Case |
|------|------------|----------|
| [cloudformation-templates.md](./infrastructure/reference/cloudformation-templates.md) | CloudFormation/SAM templates cho WAF, enhanced monitoring, DynamoDB scaling, Lambda config, IAM roles | Khi cần deploy infrastructure as code |

---

<a id="testing"></a>

## 🧪 Testing (Kiểm Thử)

### How-To Guides

| File | Mô Tả Ngắn | Use Case |
|------|------------|----------|
| [load-testing.md](./testing/how-to/load-testing.md) | Artillery (YAML config) và k6 (JavaScript) load test scripts, baseline/stress/full scenarios | Khi cần test khả năng chịu tải |
| [security-testing.md](./testing/how-to/security-testing.md) | OWASP ZAP scanning, IAM policy testing (Python), API penetration testing, AWS Security Hub | Khi cần kiểm tra bảo mật |
| [chaos-engineering.md](./testing/how-to/chaos-engineering.md) | AWS FIS experiments: Lambda error injection, DynamoDB throttle, API Gateway 5xx, concurrency limits | Khi cần test resilience |

---

## 📋 Assessment & Overview

| File | Mô Tả Ngắn | Use Case |
|------|------------|----------|
| [well-architected-assessment.md](./well-architected-assessment.md) | Đánh giá đầy đủ 5 pillars, 30 vấn đề, risk matrix, priority matrix, 90-day plan | Tổng quan về vấn đề cần giải quyết |
| [README.md](./README.md) | Navigation guide, Mermaid diagrams, quick start cho từng use case | Entry point cho toàn bộ tài liệu |

---

## 🔍 Tìm Kiếm Theo Vấn Đề

| Vấn Đề | Tài Liệu Liên Quan |
|---------|-------------------|
| IAM permissions quá rộng | [iam-policies.md](./security/reference/iam-policies.md) · [security-hardening.md](./security/how-to/security-hardening.md) |
| API bị tấn công DDoS/brute force | [waf-configuration.md](./security/how-to/waf-configuration.md) |
| Tài khoản bị brute force | [cognito-advanced.md](./security/how-to/cognito-advanced.md) |
| DynamoDB throttling | [scalability-design.md](./architecture/explanation/scalability-design.md) · [runbooks.md](./operations/reference/runbooks.md) |
| Lambda cold start chậm | [scalability-design.md](./architecture/explanation/scalability-design.md) · [cloudformation-templates.md](./infrastructure/reference/cloudformation-templates.md) |
| Không biết khi nào hệ thống lỗi | [monitoring-alerting.md](./operations/how-to/monitoring-alerting.md) |
| Mất data | [backup-recovery.md](./operations/how-to/backup-recovery.md) |
| Chi phí AWS cao | [cost-optimization.md](./operations/how-to/cost-optimization.md) |
| Deploy thủ công, dễ lỗi | [cicd-pipeline.md](./infrastructure/how-to/cicd-pipeline.md) |
| Xử lý incident chậm | [runbooks.md](./operations/reference/runbooks.md) |
| Kiểm tra performance | [load-testing.md](./testing/how-to/load-testing.md) |
| Kiểm tra lỗ hổng bảo mật | [security-testing.md](./testing/how-to/security-testing.md) |
| Test resilience hệ thống | [chaos-engineering.md](./testing/how-to/chaos-engineering.md) |

---

## 📂 Toàn Bộ File Theo BMAD Category

### Tutorials (1 file)
1. [architecture/tutorials/deploy-serverless-stack.md](./architecture/tutorials/deploy-serverless-stack.md) — Deploy SAM stack từ đầu

### How-To Guides (10 files)
1. [security/how-to/security-hardening.md](./security/how-to/security-hardening.md)
2. [security/how-to/waf-configuration.md](./security/how-to/waf-configuration.md)
3. [security/how-to/cognito-advanced.md](./security/how-to/cognito-advanced.md)
4. [operations/how-to/monitoring-alerting.md](./operations/how-to/monitoring-alerting.md)
5. [operations/how-to/backup-recovery.md](./operations/how-to/backup-recovery.md)
6. [operations/how-to/cost-optimization.md](./operations/how-to/cost-optimization.md)
7. [infrastructure/how-to/cicd-pipeline.md](./infrastructure/how-to/cicd-pipeline.md)
8. [testing/how-to/load-testing.md](./testing/how-to/load-testing.md)
9. [testing/how-to/security-testing.md](./testing/how-to/security-testing.md)
10. [testing/how-to/chaos-engineering.md](./testing/how-to/chaos-engineering.md)

### Explanations (1 file)
1. [architecture/explanation/scalability-design.md](./architecture/explanation/scalability-design.md)

### References (4 files)
1. [security/reference/iam-policies.md](./security/reference/iam-policies.md)
2. [operations/reference/runbooks.md](./operations/reference/runbooks.md)
3. [architecture/reference/architecture-decisions.md](./architecture/reference/architecture-decisions.md)
4. [infrastructure/reference/cloudformation-templates.md](./infrastructure/reference/cloudformation-templates.md)

---

## 📚 Tài Liệu Cũ (Technical Reference)

> Đây là các tài liệu technical docs gốc của dự án, không theo BMAD-METHOD.

- [index.md](./legacy/index.md) — Chỉ mục tài liệu gốc
- [project-overview.md](./legacy/project-overview.md) — Tổng quan dự án
- [architecture-backend.md](./legacy/architecture-backend.md) — Kiến trúc Lambda/API
- [architecture-frontend.md](./legacy/architecture-frontend.md) — Kiến trúc React/S3
- [data-models.md](./legacy/data-models.md) — DynamoDB Single-Table Design
- [api-contracts.md](./legacy/api-contracts.md) — API Gateway endpoints
- [infrastructure-as-code.md](./legacy/infrastructure-as-code.md) — SAM template.yaml
- [development-guide.md](./legacy/development-guide.md) — Setup guide
- [testing-strategy.md](./legacy/testing-strategy.md) — Test pyramid
- [integration-architecture.md](./legacy/integration-architecture.md) — AWS service integration
- [error-handling-troubleshooting.md](./legacy/error-handling-troubleshooting.md) — Error catalog

---

*INDEX này bao gồm 16 tài liệu Well-Architected (15 guides + 1 tutorial) theo phương pháp BMAD-METHOD. Xem [README.md](./README.md) để có navigation guide đầy đủ.*


---

**Metadata**:
- **Requirements**: Requirement 1, Requirement 15, Requirement 16
