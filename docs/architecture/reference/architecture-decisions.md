---
title: "Architecture Decision Records (ADR)"
category: Reference
domain: Architecture
difficulty: Dễ
reading_time: 45 phút
last_updated: 2026-06-12
tags: [adr, architecture, decisions]
requirements: [Requirement 14, Requirement 16]
---
***
*Breadcrumbs: [Trang chủ Well-Architected](../../README.md) > [Chỉ mục](../../index.md) > [Architecture](../../index.md#architecture) > Reference*
***

# Architecture Decision Records (ADR)

## ADR-001: Sử dụng DynamoDB thay vì RDS

**Ngày quyết định**: 2024-01-10
**Trạng thái**: ✅ Accepted

### Context

Cần chọn database cho ứng dụng quản lý sự kiện với yêu cầu:
- Lưu trữ events, users, registrations
- Traffic không đều (spike khi có sự kiện hot)
- Cần scale nhanh
- Tối ưu chi phí (Free Tier)

### Decision

Chọn **Amazon DynamoDB** (NoSQL) thay vì Amazon RDS (SQL)

### Consequences

**Ưu điểm**:
- ✅ Auto-scaling tự động theo traffic
- ✅ Serverless, không cần quản lý servers
- ✅ Free Tier: 25 GB storage, 25 RCU/WCU
- ✅ Single-digit millisecond latency
- ✅ Tích hợp tốt với Lambda

**Nhược điểm**:
- ❌ Không có JOIN queries (cần denormalize data)
- ❌ Phải thiết kế Access Patterns trước
- ❌ Khó migrate sang SQL sau này
- ❌ Query phức tạp khó implement

**Mitigation**:
- Sử dụng Single-Table Design để optimize
- Document tất cả Access Patterns
- Sử dụng GSI cho flexible queries

---

## ADR-002: Sử dụng Lambda thay vì EC2

**Ngày quyết định**: 2024-01-10
**Trạng thái**: ✅ Accepted

### Context

Cần chọn compute platform cho backend API với yêu cầu:
- Xử lý HTTP requests từ API Gateway
- Traffic không đều
- Tối ưu chi phí
- Không cần maintain servers

### Decision

Chọn **AWS Lambda** (Serverless) thay vì Amazon EC2 (VMs)

### Consequences

**Ưu điểm**:
- ✅ Pay-per-use (chỉ trả khi có requests)
- ✅ Auto-scaling tự động
- ✅ Free Tier: 1M requests/month
- ✅ Không cần maintain servers
- ✅ Deploy nhanh

**Nhược điểm**:
- ❌ Cold start latency (100-500ms)
- ❌ Timeout limit 15 phút
- ❌ Stateless (không lưu state giữa invocations)
- ❌ Khó debug hơn EC2

**Mitigation**:
- Provisioned Concurrency cho critical functions
- Optimize code để giảm cold start
- Sử dụng DynamoDB để lưu state
- CloudWatch Logs để debug

---

## ADR-003: Sử dụng Cognito thay vì Custom Auth

**Ngày quyết định**: 2024-01-10
**Trạng thái**: ✅ Accepted

### Context

Cần authentication system với yêu cầu:
- User registration/login
- JWT tokens
- MFA support
- Social login (future)
- Secure và compliant

### Decision

Chọn **Amazon Cognito** thay vì tự build authentication system

### Consequences

**Ưu điểm**:
- ✅ Managed service, không cần maintain
- ✅ Free Tier: 50,000 MAUs
- ✅ Built-in MFA, password policies
- ✅ JWT tokens tự động
- ✅ Social login ready
- ✅ HIPAA, SOC, ISO compliant

**Nhược điểm**:
- ❌ Vendor lock-in
- ❌ Customization hạn chế
- ❌ UI không đẹp (cần custom)
- ❌ Pricing tăng nhanh sau 50K users

**Mitigation**:
- Sử dụng Cognito Hosted UI với custom domain
- Abstract Cognito logic vào service layer
- Monitor MAU để tránh vượt Free Tier

---

## ADR-004: Single-Table Design cho DynamoDB

**Ngày quyết định**: 2024-01-12
**Trạng thái**: ✅ Accepted

### Context

Cần thiết kế DynamoDB schema với yêu cầu:
- Lưu trữ Events, Users, Registrations
- Support nhiều Access Patterns
- Optimize cost và performance

### Decision

Sử dụng **Single-Table Design** thay vì multiple tables

### Consequences

**Ưu điểm**:
- ✅ Giảm chi phí (1 table thay vì 3)
- ✅ Atomic transactions across entities
- ✅ Ít API calls hơn
- ✅ Consistent performance

**Nhược điểm**:
- ❌ Schema phức tạp hơn
- ❌ Khó hiểu cho developers mới
- ❌ Phải design Access Patterns trước
- ❌ Khó refactor sau này

**Mitigation**:
- Document rõ ràng Access Patterns
- Sử dụng naming conventions cho PK/SK
- Training team về Single-Table Design

**Schema**:
```
PK                    SK                      Attributes
EVENT#<eventId>       METADATA                name, date, location, ...
EVENT#<eventId>       USER#<userId>           registrationDate, status
USER#<userId>         METADATA                email, name, ...
USER#<userId>         EVENT#<eventId>         registrationDate, status
```

---

## ADR-005: CloudFront + S3 cho Frontend

**Ngày quyết định**: 2024-01-10
**Trạng thái**: ✅ Accepted

### Context

Cần host React SPA với yêu cầu:
- Low latency globally
- HTTPS
- Caching
- Tối ưu chi phí

### Decision

Sử dụng **CloudFront + S3** thay vì Amplify Hosting hoặc EC2

### Consequences

**Ưu điểm**:
- ✅ Free Tier: 50 GB transfer, 2M requests
- ✅ Global CDN, low latency
- ✅ HTTPS miễn phí
- ✅ Caching tự động
- ✅ Rẻ nhất trong các options

**Nhược điểm**:
- ❌ Cần config manual (không có CI/CD built-in)
- ❌ Invalidation có phí ($0.005/path)
- ❌ Không có preview deployments

**Mitigation**:
- Setup GitHub Actions cho CI/CD
- Sử dụng versioned file names để tránh invalidation
- CloudFront cache TTL = 1 hour

---

## Template cho ADR mới

```markdown
## ADR-XXX: [Tiêu đề]

**Ngày quyết định**: YYYY-MM-DD
**Trạng thái**: [Proposed/Accepted/Deprecated/Superseded]

### Context
[Mô tả vấn đề và constraints]

### Decision
[Quyết định đã chọn]

### Consequences

**Ưu điểm**:
- ✅ [Benefit 1]
- ✅ [Benefit 2]

**Nhược điểm**:
- ❌ [Drawback 1]
- ❌ [Drawback 2]

**Mitigation**:
- [Cách giảm thiểu drawbacks]
```





## Bước tiếp theo

- [Hiểu scalability patterns](../explanation/scalability-design.md)
- [Deploy theo ADR với SAM](../../infrastructure/reference/cloudformation-templates.md)

## Tài liệu liên quan

- [Scalability Design](../explanation/scalability-design.md)
- [CloudFormation Templates](../../infrastructure/reference/cloudformation-templates.md)
- [Well-Architected Assessment](../../well-architected-assessment.md)

---

**Metadata**:
- **Requirements**: Requirement 14, Requirement 16
- **Category**: Reference
- **Domain**: Architecture
- **Tags**: adr, decisions, architecture, design
- **Last Updated**: 2026-06-12
- **Difficulty**: Dễ
- **Estimated Reading/Implementation Time**: 45 phút