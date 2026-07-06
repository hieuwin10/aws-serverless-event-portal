# Thông Số Kỹ Thuật API (API Contracts)

Tài liệu này định nghĩa chi tiết các cổng giao tiếp API (**API Endpoints**) giữa ứng dụng Frontend và Backend. Tất cả các endpoint đều được cấu hình CORS và hỗ trợ cơ chế bảo mật xác thực bằng **Amazon Cognito JWT Tokens** khi chạy trên production.

---

## 1. Danh Sách Các Endpoint API Cốt Lõi

| Phương thức | Endpoint | Yêu cầu xác thực | Vai trò người dùng | Chức năng chính |
| :--- | :--- | :--- | :--- | :--- |
| **GET** | `/events` | Không | Tất cả mọi người | Xem danh sách các sự kiện |
| **GET** | `/events/recommendations` | Có (Cognito JWT) | **User** | Lấy danh sách sự kiện được cá nhân hóa |
| **GET** | `/events/{id}` | Không | Tất cả mọi người | Xem chi tiết thông tin 1 sự kiện |
| **GET** | `/events/{id}/export` | Không | Tất cả mọi người | Xuất file lịch .ics (Google Calendar) |
| **POST** | `/events` | Có (Cognito JWT) | **Admin** / **Organizer** | Tạo sự kiện mới |
| **PUT** | `/events/{id}` | Có (Cognito JWT) | **Admin** / **Organizer** | Cập nhật thông tin sự kiện |
| **DELETE** | `/events/{id}` | Có (Cognito JWT) | **Admin** / **Organizer** | Xóa sự kiện |
| **POST** | `/events/{id}/register` | Có (Cognito JWT) | **User** | Đăng ký tham gia sự kiện |
| **POST** | `/events/{id}/waitlist` | Có (Cognito JWT) | **User** | Đăng ký vào danh sách chờ |
| **POST** | `/events/{id}/checkin` | Có (Cognito JWT) | **Admin** / **Organizer** | Điểm danh (QR hoặc thủ công) |
| **POST** | `/events/{id}/reviews` | Có (Cognito JWT) | **User** (đã check-in)| Viết đánh giá cho sự kiện |
| **GET** | `/users/registrations`| Có (Cognito JWT) | **User** | Xem danh sách sự kiện đã đăng ký |

---

## 2. Đặc Tả Chi Tiết Từng Endpoint

### 2.1. Lấy danh sách sự kiện (`GET /events`)
*   **Tham số truy vấn (Query String - Tùy chọn):**
    *   `category`: Lọc theo danh mục (ví dụ: `technology`, `music`, `education`).
    *   `search`: Tìm kiếm từ khóa theo tiêu đề hoặc nội dung sự kiện.
*   **Phản hồi thành công (`HTTP 200 OK`):**
    ```json
    {
      "success": true,
      "data": [
        {
          "id": "evt_9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
          "title": "Hội Thảo AWS Serverless Đột Phá 2026",
          "category": "technology",
          "description": "Chia sẻ kinh nghiệm thực tế về tối ưu hóa chi phí và xây dựng ứng dụng không máy chủ trên AWS.",
          "date": "2026-06-15T09:00:00Z",
          "location": "Trực tuyến (Zoom)",
          "imageUrl": "https://images.unsplash.com/photo-1540575467063-178a50c2df87",
          "totalSeats": 500,
          "registeredCount": 142
        }
      ],
      "error": null,
      "timestamp": "2026-05-26T10:42:00Z"
    }
    ```

---

### 2.2. Tạo sự kiện mới (`POST /events`)
*   **Headers:**
    *   `Authorization`: `Bearer <Cognito_JWT_ID_Token>`
*   **Dữ liệu gửi lên (Request Body):**
    ```json
    {
      "title": "Lập trình React Premium 2026",
      "category": "education",
      "description": "Khóa học nâng cao thiết kế giao diện bằng CSS và tối ưu hóa hiệu năng React.",
      "date": "2026-07-20T14:00:00Z",
      "location": "Văn phòng AWS Hà Nội",
      "imageUrl": "https://images.unsplash.com/photo-1515187029135-18ee286d815b",
      "totalSeats": 100
    }
    ```
*   **Phản hồi thành công (`HTTP 201 Created`):**
    ```json
    {
      "success": true,
      "data": {
        "id": "evt_22a1de89-3c7d-4fff-8aaa-1b0d7b3d111d",
        "title": "Lập trình React Premium 2026",
        "category": "education",
        "description": "Khóa học nâng cao thiết kế giao diện bằng CSS và tối ưu hóa hiệu năng React.",
        "date": "2026-07-20T14:00:00Z",
        "location": "Văn phòng AWS Hà Nội",
        "imageUrl": "https://images.unsplash.com/photo-1515187029135-18ee286d815b",
        "totalSeats": 100,
        "registeredCount": 0
      },
      "error": null,
      "timestamp": "2026-05-26T10:43:10Z"
    }
    ```
*   **Phản hồi thất bại do thiếu quyền (`HTTP 403 Forbidden`):**
    ```json
    {
      "success": false,
      "data": null,
      "error": "Bạn không có quyền thực hiện hành động này. Yêu cầu nhóm quyền Admin.",
      "timestamp": "2026-05-26T10:43:12Z"
    }
    ```

---

### 2.3. Đăng ký tham gia sự kiện (`POST /events/{id}/register`)
*   **Headers:**
    *   `Authorization`: `Bearer <Cognito_JWT_ID_Token>`
*   **Phản hồi thành công (`HTTP 200 OK`):**
    ```json
    {
      "success": true,
      "data": {
        "registrationId": "reg_77f88a99-4c7b-4fff-9999-2b0d7b3d222d",
        "eventId": "evt_9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
        "userId": "usr_c66ff888-2c2c-4aaa-bbb-8b0d7b3d8888",
        "email": "user@example.com",
        "registeredAt": "2026-05-26T10:44:00Z",
        "ticketCode": "TKT-AWS-9B1D-8888"
      },
      "error": null,
      "timestamp": "2026-05-26T10:44:01Z"
    }
    ```
*   **Phản hồi thất bại do hết vé (`HTTP 400 Bad Request`):**
    ```json
    {
      "success": false,
      "data": null,
      "error": "Rất tiếc! Sự kiện này đã hết vé trống tham gia.",
      "timestamp": "2026-05-26T10:44:05Z"
    }
    ```

---

### 2.4. Điểm danh / Quét QR Check-in (`POST /events/{id}/checkin`)
*   **Headers:**
    *   `Authorization`: `Bearer <Cognito_JWT_ID_Token>` (Role: Admin/Organizer)
*   **Dữ liệu gửi lên (Request Body):**
    ```json
    {
      "ticketCode": "TKT-AWS-9B1D-8888",
      "manualOverride": false // Gửi true nếu điểm danh thủ công qua UI không cần quét QR
    }
    ```
*   **Phản hồi thành công (`HTTP 200 OK`):**
    ```json
    {
      "success": true,
      "data": {
        "status": "CHECKED_IN",
        "message": "Hợp lệ. Đã cộng 10 Loyalty Points cho user."
      },
      "error": null
    }
    ```

---

## 3. Định Dạng Chuẩn Lỗi Hệ Thống (Standardized Error Format)

Hệ thống cam kết luôn trả về cấu trúc lỗi đồng nhất để Frontend dễ dàng bắt lỗi và hiển thị thông báo sinh động lên giao diện:

```json
{
  "success": false,
  "data": null,
  "error": "Chuỗi thông báo mô tả lỗi thân thiện với người dùng",
  "timestamp": "ISO_8601_TIMESTAMP"
}
```

### Các mã lỗi chuẩn hóa thường gặp:
*   `400 Bad Request`: Dữ liệu đầu vào bị thiếu hoặc không hợp lệ (như định dạng ngày sai, số lượng vé âm).
*   `401 Unauthorized`: Token xác thực bị thiếu, hết hạn hoặc sai chữ ký mã hóa.
*   `403 Forbidden`: Người dùng đã đăng nhập thành công nhưng không có vai trò phù hợp (chưa thuộc nhóm Admin).
*   `404 Not Found`: Không tìm thấy thực thể yêu cầu (như ID sự kiện không tồn tại).
*   `500 Internal Server Error`: Lỗi hệ thống xảy ra tại backend. Lập trình viên cần kiểm tra **CloudWatch Logs** để tìm lỗi chi tiết.
