# EventApp Backend - AWS Serverless API

Backend API cho hệ thống Quản lý và Đăng ký Sự kiện Online, được xây dựng bằng **AWS Lambda**, **API Gateway**, **DynamoDB**, và **Cognito**.

## 🏗️ Kiến trúc

- **Runtime**: Node.js 20.x (TypeScript)
- **Database**: Amazon DynamoDB (Single-Table Design)
- **Authentication**: Amazon Cognito User Pool với JWT
- **API Gateway**: AWS API Gateway với Cognito Authorizer
- **Logging**: Amazon CloudWatch Logs

## 📂 Cấu trúc thư mục

```
backend/
├── src/
│   ├── handlers/              # Lambda function handlers
│   │   ├── getEvents.ts       # GET /events
│   │   ├── getEventById.ts    # GET /events/{id}
│   │   ├── createEvent.ts     # POST /events [Admin/Organizer]
│   │   ├── updateEvent.ts     # PUT /events/{id} [Admin/Organizer]
│   │   ├── deleteEvent.ts     # DELETE /events/{id} [Admin/Organizer]
│   │   ├── registerEvent.ts   # POST /events/{id}/register
│   │   ├── getUserRegistrations.ts # GET /users/registrations
│   │   ├── getRecommendations.ts   # GET /events/recommendations
│   │   ├── exportEventICS.ts      # GET /events/{id}/export
│   │   ├── qrCheckIn.ts          # POST /events/{id}/checkin [Admin/Organizer]
│   │   ├── submitReview.ts       # POST /events/{id}/reviews
│   │   └── joinWaitlist.ts       # POST /events/{id}/waitlist
│   ├── services/
│   │   ├── dbService.ts       # DynamoDB operations
│   │   └── authService.ts     # Cognito JWT claims parsing
│   └── utils/
│       ├── responseBuilder.ts # Standardized API responses
│       └── logger.ts          # CloudWatch logging
├── template.yaml              # AWS SAM template
├── tsconfig.json             # TypeScript configuration
└── package.json              # Dependencies
```

## 🚀 API Endpoints

### Public Endpoints (No Authentication)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/events` | Lấy danh sách sự kiện (có thể filter theo category/search) |
| GET | `/events/{id}` | Lấy chi tiết 1 sự kiện |
| GET | `/events/{id}/export` | Xuất file lịch .ics (Google Calendar) |

### Authenticated Endpoints (Cognito JWT Required)

| Method | Endpoint | Roles | Description |
|--------|----------|-------|-------------|
| GET | `/events/recommendations` | User | Lấy đề xuất sự kiện cá nhân hóa |
| POST | `/events` | Admin/Organizer | Tạo sự kiện mới |
| PUT | `/events/{id}` | Admin/Organizer | Cập nhật sự kiện |
| DELETE | `/events/{id}` | Admin/Organizer | Xóa sự kiện |
| POST | `/events/{id}/register` | User | Đăng ký tham gia sự kiện |
| POST | `/events/{id}/waitlist` | User | Tham gia danh sách chờ |
| POST | `/events/{id}/checkin` | Admin/Organizer | Điểm danh QR code |
| POST | `/events/{id}/reviews` | User (đã check-in) | Viết đánh giá sự kiện |
| GET | `/users/registrations` | User | Xem lịch sử đăng ký của mình |

## 🛠️ Development - Local Mock Server

### 1. Cài đặt dependencies

```bash
cd backend
npm install
```

### 2. Chạy local mock server

```bash
npm run dev
```

Server sẽ chạy tại `http://localhost:3001`

### 3. Mock Authentication

Để test các endpoint yêu cầu authentication, sử dụng Bearer token trong header:

**Admin User:**
```bash
Authorization: Bearer mock_admin_token
```

**Regular User:**
```bash
Authorization: Bearer mock_user_token_john
```

### 4. Test API với curl

**Lấy danh sách sự kiện:**
```bash
curl http://localhost:3001/events
```

**Tạo sự kiện mới (Admin):**
```bash
curl -X POST http://localhost:3001/events \
  -H "Authorization: Bearer mock_admin_token" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "AWS Workshop 2026",
    "category": "technology",
    "description": "Hands-on workshop",
    "date": "2026-08-01T10:00:00Z",
    "location": "Hanoi",
    "totalSeats": 100
  }'
```

**Đăng ký sự kiện (User):**
```bash
curl -X POST http://localhost:3001/events/{eventId}/register \
  -H "Authorization: Bearer mock_user_token_john" \
  -H "Content-Type: application/json"
```

## 📦 Deployment lên AWS

### 1. Build TypeScript

```bash
npm run build
```

### 2. Deploy với SAM CLI

```bash
sam build
sam deploy --guided
```

### 3. Lần deploy tiếp theo

```bash
sam build && sam deploy
```

## 🔐 Security Best Practices (Đã implement)

✅ **IAM Least Privilege**: Mỗi Lambda function chỉ có quyền cần thiết  
✅ **Cognito JWT Validation**: API Gateway tự động validate token  
✅ **Role-based Access Control**: Admin/Organizer/User roles  
✅ **CORS Configuration**: Secure CORS headers  
✅ **Input Validation**: Validate tất cả request body  
✅ **Error Handling**: Không expose sensitive errors ra ngoài  
✅ **CloudWatch Logs**: Log retention 7 days (cost optimization)

## 📊 Monitoring & Alerts

### CloudWatch Alarms (đã setup trong template.yaml)

1. **Billing Alert**: Cảnh báo khi chi phí > $10
2. **API Gateway 5XX Errors**: Cảnh báo khi có lỗi server
3. **Lambda Errors**: Tự động log vào CloudWatch

### Xem logs

```bash
# Xem logs của một function cụ thể
sam logs -n GetEventsFunction --stack-name eventapp --tail

# Xem logs real-time
aws logs tail /aws/lambda/EventApp-GetEvents --follow
```

## 🔧 Environment Variables

Các biến môi trường được set tự động trong `template.yaml`:

- `DYNAMODB_TABLE_NAME`: Tên bảng DynamoDB
- `COGNITO_USER_POOL_ID`: ID của Cognito User Pool
- `DB_MODE`: `mock` (local) hoặc `dynamodb` (production)

## 🧪 Testing

### Unit Tests (TODO)

```bash
npm test
```

### Integration Tests (TODO)

```bash
npm run test:integration
```

## 📝 Database Schema

Project sử dụng **Single-Table Design** trên DynamoDB với:

- **Main Table**: `EventApp-Data`
- **GSI1**: Category-based queries (events by category)
- **GSI2**: User-based queries (user registrations, reviews)

Chi tiết schema xem tại: `../docs/data-models.md`

## 🎯 Roadmap

- [ ] Thêm unit tests với Jest
- [ ] Thêm integration tests
- [ ] Implement DynamoDB Streams processors (waitlist automation)
- [ ] Thêm Redis caching layer
- [ ] Implement rate limiting
- [ ] Add API Gateway Usage Plans
- [ ] Setup AWS WAF rules
- [ ] Implement blue-green deployment
- [ ] Add performance monitoring với X-Ray

## 📞 Support

Nếu gặp vấn đề, tham khảo:
- Documentation: `../docs/`
- API Contracts: `../docs/api-contracts.md`
- Architecture: `../docs/architecture-backend.md`
- Error Handling: `../docs/error-handling-troubleshooting.md`

---

**Built with ❤️ using AWS Serverless & TypeScript**
