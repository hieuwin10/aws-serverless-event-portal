# Xử Lý Lỗi & Hướng Dẫn Khắc Phục Sự Cố (Error Handling & Troubleshooting Catalog)

Tài liệu này cung cấp danh mục toàn diện các lỗi thường gặp trong môi trường **AWS Serverless**, bao gồm cả lỗi phát sinh từ mã nguồn (Logic Errors) lẫn lỗi do cấu hình đám mây (Cloud Configuration Errors). Mỗi lỗi đều kèm theo nguyên nhân gốc rễ, cách phát hiện qua **CloudWatch Logs** và phương án khắc phục cụ thể.

---

## 1. Lỗi Tầng AWS Lambda

### 1.1. Lambda Timeout (Hết thời gian chờ)

| Mục | Chi tiết |
| :--- | :--- |
| **Mã lỗi trả về** | `HTTP 504 Gateway Timeout` (từ API Gateway) |
| **Thông báo CloudWatch** | `Task timed out after X.XX seconds` |
| **Nguyên nhân phổ biến** | Hàm Lambda thực thi quá lâu so với giới hạn timeout đã thiết lập (mặc định 3 giây). Nguyên nhân gốc rễ thường do: (1) Truy vấn DynamoDB quét toàn bảng (`Scan`) trên tập dữ liệu lớn thay vì dùng `Query`, (2) Hàm chờ một kết nối bên ngoài không phản hồi (ví dụ gọi API bên thứ 3). |
| **Cách khắc phục** | 1. Tăng giới hạn timeout lên **10-15 giây** (nhưng không nên vượt quá 29 giây vì API Gateway có giới hạn cứng là 29s). <br/> 2. Tối ưu truy vấn DynamoDB: Dùng `Query` với `PK` thay vì `Scan`. <br/> 3. Kiểm tra lại code xem có đoạn `await` nào không có cơ chế timeout riêng không. |

### 1.2. Lambda Cold Start (Khởi động lạnh)

| Mục | Chi tiết |
| :--- | :--- |
| **Biểu hiện** | Lần gọi đầu tiên sau một khoảng thời gian dài không có request mất từ 1-5 giây để phản hồi, trong khi các lần gọi tiếp theo chỉ mất ~100ms. |
| **Nguyên nhân** | AWS cần khởi tạo runtime container cho Lambda function khi nó chưa "ấm" (warm). |
| **Cách khắc phục** | 1. Giữ gói deploy Lambda siêu nhẹ (< 5MB) bằng cách loại bỏ `devDependencies` và dùng tree-shaking (Webpack/esbuild). <br/> 2. Chọn runtime **Node.js 20.x** (cold start nhanh hơn Node 18). <br/> 3. (Tùy chọn nâng cao) Cấu hình **Provisioned Concurrency** — tuy nhiên tính năng này có phí, không nằm trong Free Tier. |

### 1.3. Lambda Out of Memory

| Mục | Chi tiết |
| :--- | :--- |
| **Thông báo CloudWatch** | `Runtime exited with error: signal: killed` hoặc `REPORT ... Max Memory Used: 128 MB` |
| **Nguyên nhân** | Hàm cố gắng xử lý dữ liệu quá lớn trong bộ nhớ (ví dụ: load toàn bộ bảng DynamoDB vào RAM). |
| **Cách khắc phục** | 1. Tăng bộ nhớ Lambda lên **256MB** (vẫn nằm trong Free Tier vì hạn mức tính theo GB-seconds). <br/> 2. Phân trang dữ liệu: Sử dụng `Limit` và `ExclusiveStartKey` khi truy vấn DynamoDB. |

---

## 2. Lỗi Tầng API Gateway

### 2.1. CORS Error (Lỗi chính sách truy cập tài nguyên chéo nguồn gốc)

| Mục | Chi tiết |
| :--- | :--- |
| **Biểu hiện** | Trình duyệt hiện thông báo: `Access to fetch at '...' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present` |
| **Nguyên nhân** | 1. Quên cấu hình CORS trên API Gateway. <br/> 2. Hàm Lambda không trả về header `Access-Control-Allow-Origin` trong phản hồi. <br/> 3. Quên tạo method `OPTIONS` (Preflight) cho endpoint. |
| **Cách khắc phục** | 1. Trên API Gateway Console: Bật **Enable CORS** cho từng Resource hoặc toàn bộ API. <br/> 2. Đảm bảo hàm `responseBuilder.ts` luôn đính kèm header CORS (đã mô tả trong [architecture-backend.md](./architecture-backend.md)). <br/> 3. Tạo method `OPTIONS` và trả về `200 OK` với đầy đủ header CORS. |

### 2.2. 401 Unauthorized — Token Expired

| Mục | Chi tiết |
| :--- | :--- |
| **Biểu hiện** | Client nhận được `HTTP 401` mặc dù người dùng đã đăng nhập. |
| **Nguyên nhân** | `IdToken` hoặc `AccessToken` của Cognito mặc định hết hạn sau **1 giờ**. |
| **Cách khắc phục** | Frontend cần triển khai cơ chế **Silent Token Refresh**: Trước mỗi API call, kiểm tra thời hạn token. Nếu sắp hết hạn (< 5 phút), sử dụng `RefreshToken` để lấy bộ token mới từ Cognito mà không cần người dùng đăng nhập lại. |

### 2.3. 504 Gateway Timeout (API Gateway timeout)

| Mục | Chi tiết |
| :--- | :--- |
| **Nguyên nhân** | API Gateway có giới hạn cứng (hard limit) là **29 giây**. Nếu Lambda chưa phản hồi trong 29 giây, API Gateway tự động cắt kết nối và trả về lỗi 504. |
| **Cách khắc phục** | 1. Đảm bảo timeout Lambda < 29 giây. <br/> 2. Nếu nghiệp vụ cần xử lý lâu (ví dụ: gửi email hàng loạt), tách thành mô hình **bất đồng bộ (Async Invocation)**: API Gateway kích hoạt Lambda gốc trả về `202 Accepted` tức thì, Lambda gốc kích hoạt Lambda xử lý phụ chạy ngầm. |

---

## 3. Lỗi Tầng Amazon DynamoDB

### 3.1. ProvisionedThroughputExceededException (Throttling — Vượt hạn mức)

| Mục | Chi tiết |
| :--- | :--- |
| **Thông báo** | `ProvisionedThroughputExceededException: The level of configured provisioned throughput for the table was exceeded` |
| **Nguyên nhân** | Số lượng request đọc/ghi trong cùng 1 giây vượt quá giới hạn 25 RCU / 25 WCU đã cấu hình. Thường xảy ra khi có đột biến lưu lượng truy cập (ví dụ: 100 người cùng bấm đăng ký sự kiện hot). |
| **Cách khắc phục** | 1. **Ngắn hạn:** Bật tính năng **DynamoDB Auto Scaling** cho phép tạm thời nâng RCU/WCU khi tải cao (lưu ý: phần vượt quá 25 sẽ có phí rất nhỏ). <br/> 2. **Dài hạn:** Thiết kế lại access pattern để phân tán đều yêu cầu. Tránh để tất cả viết vào cùng 1 Partition Key (hot partition). <br/> 3. **Code-level:** Triển khai cơ chế **Exponential Backoff with Jitter** — khi nhận lỗi throttle, đợi 100ms rồi thử lại, lần sau đợi 200ms, 400ms... cộng thêm một khoảng ngẫu nhiên nhỏ. |

```typescript
// Ví dụ: Exponential Backoff Retry
const MAX_RETRIES = 3;
async function dynamoQueryWithRetry(params: any, retryCount = 0): Promise<any> {
  try {
    return await dynamoClient.send(new QueryCommand(params));
  } catch (error: any) {
    if (error.name === 'ProvisionedThroughputExceededException' && retryCount < MAX_RETRIES) {
      const delay = Math.pow(2, retryCount) * 100 + Math.random() * 50;
      console.warn(`[DynamoDB Throttled] Retry #${retryCount + 1} after ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return dynamoQueryWithRetry(params, retryCount + 1);
    }
    throw error;
  }
}
```

### 3.2. ValidationException — Sai cấu trúc dữ liệu

| Mục | Chi tiết |
| :--- | :--- |
| **Thông báo** | `ValidationException: One or more parameter values were invalid` |
| **Nguyên nhân** | 1. Gửi thuộc tính trùng tên Partition Key nhưng giá trị rỗng. <br/> 2. Sử dụng kiểu dữ liệu sai (ví dụ: gửi số nguyên nhưng schema khai báo String). |
| **Cách khắc phục** | Viết hàm validation ở tầng Lambda để kiểm tra dữ liệu đầu vào **trước** khi gửi xuống DynamoDB. TypeScript giúp bắt lỗi này từ lúc biên dịch nếu khai báo interface chặt chẽ. |

---

## 4. Lỗi Tầng Amazon Cognito

### 4.1. UserNotConfirmedException

| Mục | Chi tiết |
| :--- | :--- |
| **Biểu hiện** | Người dùng đăng nhập sau khi đăng ký nhưng nhận lỗi "User is not confirmed". |
| **Nguyên nhân** | Cognito bật xác minh email nhưng người dùng chưa nhập mã OTP gửi về email. |
| **Cách khắc phục** | Frontend cần điều hướng sang trang "Xác minh email" sau khi đăng ký, cho phép người dùng nhập mã OTP. Gọi API `confirmSignUp` của Cognito SDK. |

---

## 5. Bảng Tra Cứu Nhanh Lỗi (Quick Reference Table)

| Mã HTTP | Tên lỗi | Tầng gốc | Hành động ngay |
| :--- | :--- | :--- | :--- |
| `400` | Bad Request | Lambda (Logic) | Kiểm tra dữ liệu đầu vào từ client |
| `401` | Unauthorized | Cognito / API GW | Kiểm tra token JWT đã hết hạn hoặc bị sai |
| `403` | Forbidden | Cognito Groups | Người dùng thiếu vai trò Admin |
| `404` | Not Found | Lambda (Logic) | ID tài nguyên không tồn tại trong DynamoDB |
| `429` | Too Many Requests | API GW / DynamoDB | Throttling — triển khai Retry + Backoff |
| `500` | Internal Server Error | Lambda (Runtime) | Mở CloudWatch Logs tìm stack trace |
| `502` | Bad Gateway | Lambda | Lambda trả về response sai format |
| `504` | Gateway Timeout | API GW / Lambda | Lambda chạy > 29 giây — tối ưu truy vấn |
