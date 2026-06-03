# Kiến Trúc Nghiệp Vụ (Architecture Backend)

Tài liệu này trình bày chi tiết thiết kế kiến trúc của cấu phần **Backend** cho dự án Website Quản Lý và Đăng Ký Sự Kiện Online. Hệ thống backend được xây dựng bằng **Node.js (TypeScript)** theo mô hình **Serverless Micro-functions** chạy trực tiếp trên **AWS Lambda** và giao tiếp thông qua **Amazon API Gateway**.

---

## 1. Kiến Trúc Các Hàm Xử Lý Độc Lập (Lambda Functions)

Chúng tôi lựa chọn giải pháp **Single-purpose Functions** (Mỗi hàm xử lý duy nhất một nghiệp vụ cụ thể) thay vì nhét toàn bộ backend vào một hàm đơn lẻ (Monolith Lambda). Phương pháp này giúp:
1.  Thời gian khởi động lạnh (**Cold Start**) của Lambda cực kỳ nhanh vì gói nén code siêu nhỏ.
2.  Dễ dàng phân chia quyền truy cập tối thiểu (**IAM Role**) cho từng hàm riêng biệt (Hàm xem danh sách sự kiện chỉ cần quyền đọc, hàm tạo sự kiện mới cần quyền ghi DynamoDB).

### Cấu Trúc Các Hàm Lambda:

```
backend/src/
 ├── handlers/                    # Thư mục chứa các hàm xử lý API
 │    ├── getEvents.ts            # GET /events (Xem danh sách sự kiện)
 │    ├── getEventById.ts         # GET /events/{id} (Xem chi tiết 1 sự kiện)
 │    ├── createEvent.ts          # POST /events [ADMIN/ORG] (Tạo sự kiện mới)
 │    ├── updateEvent.ts          # PUT /events/{id} [ADMIN/ORG] (Cập nhật sự kiện)
 │    ├── deleteEvent.ts          # DELETE /events/{id} [ADMIN/ORG] (Xóa sự kiện)
 │    ├── registerEvent.ts        # POST /events/{id}/register (Đăng ký vé)
 │    ├── getUserRegistrations.ts # GET /users/registrations (Lịch sử đăng ký)
 │    ├── qrCheckIn.ts            # POST /events/{id}/checkin (Quét QR Code)
 │    ├── submitReview.ts         # POST /events/{id}/reviews (Viết đánh giá)
 │    ├── getRecommendations.ts   # GET /events/recommendations (Gợi ý cá nhân hóa)
 │    ├── exportEventICS.ts       # GET /events/{id}/export (Tạo file lịch .ics)
 │    └── streams/                # Lambda trigger từ DynamoDB Streams
 │         ├── waitlistProcessor.ts # Xử lý chuyển vé Waitlist
 │         └── reviewAggregator.ts  # Tính toán Rating trung bình (CQRS)
 ├── services/                    # Tầng nghiệp vụ xử lý dữ liệu chung
 │    ├── dbService.ts            # Giao tiếp với Amazon DynamoDB SDK v3
 │    └── authService.ts          # Các tiện ích liên quan đến giải mã Token
 └── utils/
      ├── responseBuilder.ts      # Chuẩn hóa định dạng phản hồi HTTP (CORS, Headers)
      └── logger.ts               # Định dạng log gửi lên CloudWatch
```

---

## 2. Chuẩn Hóa Phản Hồi API & Cấu Hình CORS (Response Builder)

Môi trường Serverless đòi hỏi các phản hồi HTTP trả về từ Lambda phải tuân thủ đúng định dạng của API Gateway (Proxy Integration). Một hàm tiện ích `responseBuilder.ts` được thiết lập để đảm bảo mọi phản hồi đều đính kèm đầy đủ tiêu đề CORS bảo mật:

```typescript
export interface APIGatewayResponse {
  statusCode: number;
  headers: Record<string, string | boolean>;
  body: string;
}

export const buildResponse = (
  statusCode: number, 
  data: any, 
  errorMessage?: string
): APIGatewayResponse => {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*', // Có thể cấu hình chỉ domain CloudFront cụ thể ở production
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
      'Access-Control-Allow-Credentials': true
    },
    body: JSON.stringify({
      success: statusCode >= 200 && statusCode < 300,
      data: data || null,
      error: errorMessage || null,
      timestamp: new Date().toISOString()
    })
  };
};
```

---

## 3. Quy Trình Xác Thực Qua API Gateway JWT Authorizer

Để bảo vệ các route nhạy cảm (như tạo sự kiện mới, đăng ký chỗ), API Gateway tích hợp **Cognito User Pool Authorizer**. Quy trình hoạt động diễn ra tự động tại tầng hạ tầng cloud:

```
[Client Request + JWT] ──► [Amazon API Gateway]
                                  │
                       (Xác thực Token tự động)
                                  ├─► [Không hợp lệ] ──► Trả về HTTP 401 Unauthorized
                                  │
                                  ▼ [Hợp lệ]
                       [Giải mã Claims & Đưa vào Context]
                                  │
                                  ▼
                       [Kích Hoạt Hàm AWS Lambda]
```

### Cách lấy thông tin User bên trong Code Lambda TypeScript:
Khi API Gateway chuyển tiếp yêu cầu sau khi xác thực, thông tin của User (ID, Email, Nhóm quyền) sẽ nằm trong tham số `event.requestContext.authorizer.claims`:

```typescript
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { buildResponse } from '../utils/responseBuilder';

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // 1. Lấy thông tin user đã được xác thực từ Cognito Claims
    const userClaims = event.requestContext.authorizer?.claims;
    if (!userClaims) {
      return buildResponse(401, null, 'Unauthorized request');
    }

    const userId = userClaims.sub; // Unique ID của User trên Cognito
    const userEmail = userClaims.email;
    const userGroups = userClaims['cognito:groups'] || []; // Mảng chứa nhóm quyền: ["Admin", "Organizer"]

    // Kiểm tra quyền Organizer hoặc Admin
    const isAdmin = userGroups.includes("Admin");
    const isOrganizer = userGroups.includes("Organizer");

    // 2. Xử lý logic...
    return buildResponse(200, { message: "Xác thực thành công", userId, isAdmin, isOrganizer });
  } catch (error: any) {
    return buildResponse(500, null, error.message);
  }
};
```

---

## 4. Xử Lý Lỗi Và Đồng Bộ Logs Lên CloudWatch

Mỗi khi hàm Lambda thực thi thất bại, chúng ta tuyệt đối không để lộ mã lỗi máy chủ nhạy cảm (như stack trace cơ sở dữ liệu) ra ngoài Client. Thay vào đó:
1.  **Ghi log chi tiết lỗi nội bộ** bằng `console.error(error)` lên CloudWatch Logs kèm theo mã định danh yêu cầu `awsRequestId` độc bản.
2.  **Trả về mã lỗi HTTP thân thiện** (như `HTTP 400 Bad Request` hoặc `HTTP 500 Internal Server Error`) kèm thông báo chung dạng chuỗi văn bản cho người dùng.

```typescript
try {
  // Thực hiện truy vấn DynamoDB
} catch (dbError: any) {
  // Ghi log chi tiết lên CloudWatch để lập trình viên xem
  console.error(`[RequestId: ${context.awsRequestId}] DynamoDB Query Failed:`, dbError);
  
  // Trả về phản hồi an toàn cho client
  return buildResponse(500, null, 'Không thể truy xuất dữ liệu sự kiện lúc này. Vui lòng thử lại sau.');
}
```

---

## 5. Giả Lập Cục Bộ (Local Mock Layer)

Để phát triển ứng dụng offline mà không cần kết nối Internet và không tốn phí chạy cloud, chúng ta xây dựng một tệp giả lập API Gateway server chạy bằng **Node.js (ts-node)**:
*   Sử dụng framework **Express** gọn nhẹ chạy ở cổng `3001` cục bộ.
*   Bản đồ hóa các endpoint Express trỏ thẳng đến các tệp `handler` của các module Lambda.
*   Giả lập đối tượng `event` và `context` của AWS Lambda trước khi truyền vào hàm handler, giúp đảm bảo code Lambda chạy local 100% giống hệt như khi chạy trên Cloud thực tế.
