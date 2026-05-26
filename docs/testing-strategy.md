# Chiến Lược Kiểm Thử (Testing Strategy)

Tài liệu này xây dựng chiến lược kiểm thử toàn diện cho dự án, bao gồm **Unit Test** (Kiểm thử đơn vị), **Integration Test** (Kiểm thử tích hợp) và **End-to-End Test** (Kiểm thử đầu cuối). Mục tiêu là đảm bảo mỗi thành phần hoạt động đúng chức năng và toàn bộ luồng dữ liệu từ Frontend → API Gateway → Lambda → DynamoDB vận hành chính xác trước khi deploy lên môi trường production AWS.

---

## 1. Kim Tự Tháp Kiểm Thử (Testing Pyramid)

```
                  ┌─────────────┐
                  │   E2E Test  │  ← Ít nhất, chạy chậm nhất
                  │  (Cypress /  │     Nhưng phát hiện lỗi tích hợp quan trọng nhất
                  │  Playwright) │
                  ├─────────────┤
                  │ Integration │  ← Trung bình, kiểm tra luồng API → Lambda → DB
                  │    Tests    │     Dùng SAM Local hoặc Mock DynamoDB
                  │ (Supertest) │
                  ├─────────────┤
                  │  Unit Tests │  ← Nhiều nhất, chạy nhanh nhất
                  │  (Vitest /  │     Kiểm tra logic nghiệp vụ từng hàm riêng lẻ
                  │    Jest)    │
                  └─────────────┘
```

---

## 2. Unit Test — Kiểm Thử Đơn Vị

### 2.1. Công cụ sử dụng
*   **Frontend:** [Vitest](https://vitest.dev/) — tương thích hoàn hảo với Vite, tốc độ chạy cực nhanh.
*   **Backend (Lambda):** [Jest](https://jestjs.io/) hoặc Vitest — hỗ trợ TypeScript, mock module tốt.

### 2.2. Phạm vi kiểm thử

| Tầng | Đối tượng kiểm thử | Ví dụ cụ thể |
| :--- | :--- | :--- |
| **Backend** | Từng hàm Lambda handler | `createEvent.handler` nhận body hợp lệ → trả về `201 Created` |
| **Backend** | Hàm tiện ích `responseBuilder` | `buildResponse(200, data)` → trả đúng cấu trúc JSON + CORS headers |
| **Backend** | Validation logic | Kiểm tra `title` rỗng → trả lỗi `400 Bad Request` |
| **Frontend** | React component render | `<EventCard>` hiển thị đúng tiêu đề và ngày tháng sự kiện |
| **Frontend** | Custom hooks logic | `useAuth()` trả về `user: null` khi chưa đăng nhập |

### 2.3. Mẫu Unit Test cho Lambda Handler

```typescript
// backend/src/handlers/__tests__/createEvent.test.ts
import { handler } from '../createEvent';
import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';

const ddbMock = mockClient(DynamoDBDocumentClient);

describe('createEvent Lambda Handler', () => {
  beforeEach(() => {
    ddbMock.reset();
    process.env.DYNAMODB_TABLE_NAME = 'EventApp-Data-Test';
  });

  test('Tạo sự kiện thành công khi body hợp lệ', async () => {
    ddbMock.on(PutCommand).resolves({});

    const event = {
      body: JSON.stringify({
        title: 'Hội thảo AWS 2026',
        category: 'technology',
        date: '2026-07-15T09:00:00Z',
        location: 'Trực tuyến',
        totalSeats: 100,
        description: 'Mô tả sự kiện...'
      }),
      requestContext: {
        authorizer: {
          claims: {
            sub: 'user-123',
            email: 'admin@test.com',
            'cognito:groups': 'Admin'
          }
        }
      }
    };

    const result = await handler(event as any);
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(201);
    expect(body.success).toBe(true);
    expect(body.data.title).toBe('Hội thảo AWS 2026');
  });

  test('Trả lỗi 400 khi thiếu tiêu đề sự kiện', async () => {
    const event = {
      body: JSON.stringify({ category: 'technology' }),
      requestContext: {
        authorizer: { claims: { sub: 'user-123', 'cognito:groups': 'Admin' } }
      }
    };

    const result = await handler(event as any);
    expect(result.statusCode).toBe(400);
  });

  test('Trả lỗi 403 khi người dùng không phải Admin', async () => {
    const event = {
      body: JSON.stringify({ title: 'Test Event' }),
      requestContext: {
        authorizer: { claims: { sub: 'user-456', 'cognito:groups': '' } }
      }
    };

    const result = await handler(event as any);
    expect(result.statusCode).toBe(403);
  });
});
```

---

## 3. Integration Test — Kiểm Thử Tích Hợp

### 3.1. Mục tiêu
Kiểm tra toàn bộ luồng dữ liệu thực tế: **API Request → Lambda Handler → DynamoDB Read/Write → API Response**. Đảm bảo các thành phần giao tiếp đúng với nhau qua các giao diện đã đặc tả tại [api-contracts.md](./api-contracts.md).

### 3.2. Phương pháp thực hiện
Sử dụng **SAM Local** + **DynamoDB Local** (Docker container chạy DynamoDB ngay trên máy) để tạo môi trường test sát với production nhất:

```bash
# Bước 1: Khởi chạy DynamoDB Local bằng Docker
docker run -d -p 8000:8000 amazon/dynamodb-local

# Bước 2: Tạo bảng test trên DynamoDB Local
aws dynamodb create-table \
  --endpoint-url http://localhost:8000 \
  --table-name EventApp-Data-Test \
  --attribute-definitions AttributeName=PK,AttributeType=S AttributeName=SK,AttributeType=S \
  --key-schema AttributeName=PK,KeyType=HASH AttributeName=SK,KeyType=RANGE \
  --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5

# Bước 3: Khởi chạy API Gateway giả lập qua SAM
sam local start-api --port 3001 --env-vars env.json
```

### 3.3. Mẫu Integration Test (Supertest)

```typescript
// backend/integration-tests/events.integration.test.ts
import request from 'supertest';

const API_URL = 'http://localhost:3001';

describe('Integration: Events API Flow', () => {
  
  test('Luồng hoàn chỉnh: Tạo sự kiện → Xem danh sách → Đăng ký', async () => {
    // 1. Tạo sự kiện mới (giả lập Admin token)
    const createRes = await request(API_URL)
      .post('/events')
      .set('Authorization', 'Bearer MOCK_ADMIN_JWT_TOKEN')
      .send({
        title: 'Integration Test Event',
        category: 'education',
        date: '2026-08-01T10:00:00Z',
        location: 'TP.HCM',
        totalSeats: 50,
        description: 'Sự kiện kiểm thử tích hợp'
      });
    
    expect(createRes.status).toBe(201);
    const eventId = createRes.body.data.id;

    // 2. Xem danh sách — sự kiện vừa tạo phải xuất hiện
    const listRes = await request(API_URL).get('/events');
    expect(listRes.status).toBe(200);
    expect(listRes.body.data.some((e: any) => e.id === eventId)).toBe(true);

    // 3. Đăng ký tham gia sự kiện
    const registerRes = await request(API_URL)
      .post(`/events/${eventId}/register`)
      .set('Authorization', 'Bearer MOCK_USER_JWT_TOKEN');
    
    expect(registerRes.status).toBe(200);
    expect(registerRes.body.data.ticketCode).toBeDefined();
  });
});
```

---

## 4. End-to-End Test — Kiểm Thử Đầu Cuối (E2E)

### 4.1. Công cụ đề xuất
*   [Playwright](https://playwright.dev/) — hỗ trợ đa trình duyệt (Chromium, Firefox, WebKit), API hiện đại.
*   Thay thế: [Cypress](https://www.cypress.io/) — giao diện trực quan hơn, dễ debug.

### 4.2. Các kịch bản E2E ưu tiên

| # | Kịch bản | Các bước chính |
| :--- | :--- | :--- |
| 1 | **Người dùng đăng ký tài khoản mới** | Mở trang `/register` → Điền form → Nhập OTP → Được chuyển về trang chủ |
| 2 | **Người dùng đăng nhập & đăng ký sự kiện** | Đăng nhập → Duyệt danh sách → Nhấn vào 1 sự kiện → Bấm "Đăng ký" → Thấy vé điện tử |
| 3 | **Admin tạo sự kiện mới** | Đăng nhập Admin → Vào Dashboard → Nhấn "Tạo mới" → Điền form → Submit → Sự kiện hiển thị ở trang chủ |
| 4 | **Xử lý sự kiện hết vé** | Đăng ký đầy đủ `totalSeats` → Người dùng thứ N+1 bấm đăng ký → Hiển thị thông báo "Hết vé" |

---

## 5. Câu Lệnh Chạy Test

```bash
# Chạy Unit Test cho Backend
cd backend
npm test

# Chạy Unit Test cho Frontend  
cd frontend
npm test

# Chạy Integration Test (cần DynamoDB Local + SAM Local đang chạy)
cd backend
npm run test:integration

# Chạy E2E Test (cần Frontend + Backend đang chạy)
cd frontend
npx playwright test
```

---

## 6. Bảng Tóm Tắt Chiến Lược (Testing Matrix)

| Loại Test | Công cụ | Phạm vi | Tần suất chạy | Thời gian |
| :--- | :--- | :--- | :--- | :--- |
| **Unit Test** | Vitest / Jest | Logic từng hàm | Mỗi lần commit | < 10 giây |
| **Integration Test** | Supertest + SAM Local | Luồng API → DB | Mỗi lần merge PR | 1-3 phút |
| **E2E Test** | Playwright | Giao diện trình duyệt | Trước mỗi bản release | 3-10 phút |
