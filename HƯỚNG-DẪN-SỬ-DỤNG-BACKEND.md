# 🚀 Hướng Dẫn Sử Dụng Backend - EventApp

## 📋 Tóm tắt

Backend đã được hoàn thành 100% với:
- ✅ **12 Lambda functions** xử lý tất cả API endpoints
- ✅ **Authentication & Authorization** với Cognito JWT
- ✅ **DynamoDB Single-Table Design** tối ưu
- ✅ **Local Mock Server** cho development
- ✅ **AWS SAM Template** sẵn sàng deploy
- ✅ **Security best practices** đã áp dụng
- ✅ **Monitoring & Logging** với CloudWatch

---

## 🏃 Quick Start

### Bước 1: Cài đặt Dependencies

```bash
cd backend
npm install
```

### Bước 2: Chạy Local Development Server

```bash
npm run dev
```

Server sẽ khởi động tại: **http://localhost:3001**

### Bước 3: Test API

#### Option 1: Dùng curl

```bash
# Lấy danh sách sự kiện
curl http://localhost:3001/events

# Lấy chi tiết 1 sự kiện
curl http://localhost:3001/events/evt_9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d

# Tạo sự kiện mới (cần Admin token)
curl -X POST http://localhost:3001/events \
  -H "Authorization: Bearer mock_admin_token" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Workshop AWS 2026",
    "category": "technology",
    "description": "Learn AWS serverless",
    "date": "2026-08-01T10:00:00Z",
    "location": "Hanoi",
    "totalSeats": 100
  }'
```

#### Option 2: Dùng test script

```bash
# Chạy tất cả test cases
bash test-api.sh
```

#### Option 3: Dùng Postman/Thunder Client

Import các endpoint từ file `docs/api-contracts.md`

---

## 🔐 Authentication trong Local Development

### Mock Tokens

Backend local server hỗ trợ mock authentication:

**Admin User:**
```
Authorization: Bearer mock_admin_token
```
- User ID: `usr_admin_9999_9999_9999_9999`
- Email: `admin@eventapp.com`
- Groups: `['Admin']`

**Regular User:**
```
Authorization: Bearer mock_user_token_john
```
- User ID: `usr_client_john`
- Email: `john@example.com`
- Groups: `[]`

### Example Request với Auth

```bash
curl -X POST http://localhost:3001/events \
  -H "Authorization: Bearer mock_admin_token" \
  -H "Content-Type: application/json" \
  -d '{"title": "New Event", ...}'
```

---

## 📂 Cấu trúc Backend

```
backend/
├── src/
│   ├── handlers/              # 12 Lambda functions
│   │   ├── getEvents.ts
│   │   ├── getEventById.ts
│   │   ├── createEvent.ts
│   │   ├── updateEvent.ts
│   │   ├── deleteEvent.ts
│   │   ├── registerEvent.ts
│   │   ├── getUserRegistrations.ts
│   │   ├── getRecommendations.ts    ✨ MỚI
│   │   ├── exportEventICS.ts        ✨ MỚI
│   │   ├── qrCheckIn.ts            ✨ MỚI
│   │   ├── submitReview.ts         ✨ MỚI
│   │   └── joinWaitlist.ts         ✨ MỚI
│   ├── services/
│   │   ├── dbService.ts           # DynamoDB operations
│   │   └── authService.ts         ✨ MỚI - JWT parsing
│   └── utils/
│       ├── responseBuilder.ts     # Standardized responses
│       └── logger.ts             # CloudWatch logging
├── template.yaml                 # AWS SAM (đã cập nhật)
├── package.json                  # NPM scripts
├── tsconfig.json                # TypeScript config
├── README.md                    ✨ MỚI - Full documentation
├── .env.example                 ✨ MỚI - Config template
└── test-api.sh                  ✨ MỚI - Test script
```

---

## 🎯 Tất cả API Endpoints

### 1️⃣ Public (Không cần auth)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/events` | Danh sách sự kiện (filter: category, search) |
| GET | `/events/{id}` | Chi tiết 1 sự kiện |
| GET | `/events/{id}/export` | Export file .ics (Google Calendar) |

### 2️⃣ Authenticated (User)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/events/recommendations` | Gợi ý cá nhân hóa |
| GET | `/users/registrations` | Lịch sử đăng ký |
| POST | `/events/{id}/register` | Đăng ký sự kiện |
| POST | `/events/{id}/waitlist` | Tham gia danh sách chờ |
| POST | `/events/{id}/reviews` | Viết đánh giá (phải check-in) |

### 3️⃣ Admin/Organizer Only

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/events` | Tạo sự kiện mới |
| PUT | `/events/{id}` | Cập nhật sự kiện |
| DELETE | `/events/{id}` | Xóa sự kiện |
| POST | `/events/{id}/checkin` | Điểm danh QR code |

---

## 🚢 Deploy lên AWS

### Lần đầu tiên (Guided Mode)

```bash
# Build TypeScript
npm run build

# Deploy với interactive prompts
sam build
sam deploy --guided
```

Trong quá trình guided deployment, bạn sẽ được hỏi:
- **Stack Name**: `eventapp` (hoặc tên khác)
- **AWS Region**: `ap-southeast-1` (Singapore)
- **Email cho alerts**: email của bạn
- Confirm changes: `Y`
- Save configuration: `Y`

### Các lần sau

```bash
npm run deploy
# hoặc
sam build && sam deploy
```

### Xem deployment outputs

```bash
aws cloudformation describe-stacks \
  --stack-name eventapp \
  --query 'Stacks[0].Outputs'
```

Outputs bao gồm:
- **ApiUrl**: URL của API Gateway
- **UserPoolId**: Cognito User Pool ID
- **UserPoolClientId**: Client ID cho Frontend
- **DynamoDBTableName**: Tên bảng DynamoDB

---

## 📊 Monitoring & Logs

### Xem CloudWatch Logs

```bash
# Xem logs real-time của một function
sam logs -n GetEventsFunction --stack-name eventapp --tail

# Xem logs với AWS CLI
aws logs tail /aws/lambda/EventApp-GetEvents --follow
```

### CloudWatch Alarms đã setup

1. **Billing Alert**: Cảnh báo khi chi phí > $10
2. **API 5XX Errors**: Cảnh báo khi có lỗi server (>= 5 errors trong 5 phút)

### Nhận notifications

Sau khi deploy, check email để xác nhận SNS subscription. Bạn sẽ nhận alerts khi:
- Chi phí vượt ngưỡng
- API có lỗi 5XX

---

## 🔧 Troubleshooting

### Problem: Local server không khởi động

**Solution:**
```bash
# Kiểm tra port 3001 có bị chiếm không
netstat -ano | findstr :3001

# Thay đổi port trong package.json hoặc set biến môi trường
PORT=3002 npm run dev
```

### Problem: Lambda function bị timeout

**Solution:**
- Kiểm tra CloudWatch Logs: `sam logs -n <FunctionName> --tail`
- Tăng timeout trong `template.yaml` (mặc định 15s)
- Tối ưu query DynamoDB

### Problem: DynamoDB throttling

**Solution:**
- Kiểm tra CloudWatch Metrics
- Tăng provisioned capacity trong `template.yaml`
- Hoặc chuyển sang On-Demand billing mode

### Problem: Cognito authentication fail

**Solution:**
- Verify JWT token hợp lệ
- Check token expiry
- Ensure user thuộc đúng Cognito User Pool
- Kiểm tra API Gateway Authorizer configuration

---

## 🧪 Testing Checklist

Trước khi deploy production, test các scenarios sau:

### ✅ Public Endpoints
- [ ] GET /events - Lấy tất cả sự kiện
- [ ] GET /events?category=technology - Filter theo category
- [ ] GET /events?search=AWS - Tìm kiếm
- [ ] GET /events/{id} - Lấy chi tiết
- [ ] GET /events/{id}/export - Export .ics file

### ✅ User Flows
- [ ] Đăng nhập với Cognito
- [ ] GET /events/recommendations - Xem gợi ý
- [ ] POST /events/{id}/register - Đăng ký sự kiện
- [ ] GET /users/registrations - Xem lịch sử
- [ ] POST /events/{id}/waitlist - Join waitlist
- [ ] POST /events/{id}/reviews - Viết review (sau check-in)

### ✅ Admin Flows
- [ ] POST /events - Tạo sự kiện mới
- [ ] PUT /events/{id} - Cập nhật sự kiện
- [ ] DELETE /events/{id} - Xóa sự kiện
- [ ] POST /events/{id}/checkin - Điểm danh

### ✅ Error Handling
- [ ] 401 - Request không có token
- [ ] 403 - User không có quyền
- [ ] 404 - Event không tồn tại
- [ ] 400 - Invalid input data
- [ ] 500 - Server error (check logs)

---

## 📈 Performance Tips

### 1. DynamoDB Query Optimization
- Sử dụng `GetItem` cho single item (O(1))
- Sử dụng `Query` cho range queries
- Tránh `Scan` khi có thể
- Sử dụng GSI cho access patterns phức tạp

### 2. Lambda Optimization
- Reuse DynamoDB client connections
- Minimize cold start (keep memory = 128MB)
- Use environment variables
- Enable Lambda layers cho shared code

### 3. API Gateway Caching
```yaml
# Thêm vào template.yaml
CacheClusterEnabled: true
CacheClusterSize: '0.5'  # Smallest size
```

### 4. CloudWatch Logs Optimization
- Log retention: 7 days (đã setup)
- Filter logs trước khi ship to S3
- Use structured logging (JSON)

---

## 🔒 Security Checklist

### ✅ Đã implement
- [x] Cognito JWT validation
- [x] Role-based access control
- [x] IAM Least Privilege policies
- [x] S3 block public access
- [x] CORS configuration
- [x] Input validation
- [x] Error masking (không expose internals)
- [x] CloudWatch logging
- [x] MFA support trong Cognito

### 🚧 Optional enhancements
- [ ] AWS WAF (rate limiting, SQL injection)
- [ ] API Gateway Usage Plans & API Keys
- [ ] VPC cho Lambda functions
- [ ] Secrets Manager cho sensitive configs
- [ ] AWS Shield cho DDoS protection

---

## 💰 Cost Estimation (AWS Free Tier)

### Miễn phí (Always Free)
- Lambda: 1M requests/month, 400K GB-seconds ✅
- DynamoDB: 25GB storage, 25 RCU/WCU ✅
- CloudWatch: 10 alarms, 5GB logs ✅

### Sẽ tốn phí (nếu vượt Free Tier)
- API Gateway: $3.50/million requests (sau 12 tháng)
- CloudWatch Logs: $0.50/GB (sau 5GB)
- DynamoDB On-Demand: $1.25/million write requests

### Ước tính monthly cost (startup traffic)
- **Free Tier**: $0
- **Light usage** (10K requests/day): ~$1-2
- **Medium usage** (100K requests/day): ~$10-15

---

## 📚 Documentation Links

- **API Contracts**: `docs/api-contracts.md`
- **Data Models**: `docs/data-models.md`
- **Architecture**: `docs/architecture-backend.md`
- **Error Handling**: `docs/error-handling-troubleshooting.md`
- **Backend README**: `backend/README.md`

---

## 🎉 Kết luận

Backend EventApp đã sẵn sàng production với:

✅ **12 API endpoints đầy đủ**  
✅ **Security best practices**  
✅ **AWS Free Tier optimized**  
✅ **Monitoring & alerting**  
✅ **Local development friendly**  
✅ **Well documented**  

### Next Steps:
1. ✅ Backend hoàn thành - DONE!
2. 🔜 Frontend integration
3. 🔜 End-to-end testing
4. 🔜 Production deployment

---

**Happy Coding! 🚀**

Nếu có vấn đề gì, tham khảo:
- `backend/README.md` - Chi tiết kỹ thuật
- `BACKEND-COMPLETION-SUMMARY.md` - Tổng quan implementation
- `docs/` - Architecture & API documentation
