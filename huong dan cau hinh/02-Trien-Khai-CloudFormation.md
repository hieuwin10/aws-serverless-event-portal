# 2️⃣ Triển Khai "1 Phát Ăn Trọn" Backend Với CloudFormation

*Mục đích: Giao bản vẽ thiết kế (template.yaml) cho CloudFormation để nó tự động đẻ ra Database (DynamoDB), Auth (Cognito), Logic (12 hàm Lambda), và API Gateway.*

## 1. Cập Nhật Bản Vẽ `template.yaml`
1. Mở file `template.yaml` (nằm trong thư mục `backend`) bằng Notepad hoặc VS Code trên máy tính của bạn.
2. Ấn tổ hợp `Ctrl + F` để tìm tất cả các dòng có chữ: `CodeUri: dist/` (Sẽ có tổng cộng 12 dòng như vậy cho 12 hàm Lambda).
3. Hãy **Thay thế (Replace)** tất cả các chữ `dist/` đó thành đường link **Object URL** mà bạn đã copy ở Bước 1.
   *(Ví dụ: Sửa `CodeUri: dist/` thành `CodeUri: https://tram-trung-chuyen-code-2026.s3.ap-southeast-1.amazonaws.com/backend-code.zip`)*.
4. Bấm **Lưu (Save)** file `template.yaml` lại.

## 2. Kích Hoạt Cỗ Máy Đẻ CloudFormation Trên Web
1. Mở trình duyệt, trên thanh tìm kiếm của AWS Console gõ chữ **CloudFormation**.
2. Nhấn nút màu cam **Create stack** (chọn *With new resources (standard)*).
3. **Step 1: Create stack**
   * Trong phần *Specify template*: Chọn mục **Upload a template file**.
   * Bấm nút **Choose file** và chọn ngay cái file `template.yaml` mà bạn vừa sửa ở trên.
   * Bấm **Next**.
4. **Step 2: Specify stack details**
   * *Stack name:* Nhập tên `EventApp-Backend-System`.
   * *BillingAlertEmail:* Nhập địa chỉ email cá nhân của bạn (Để AWS báo cáo nếu có lỗi).
   * Bấm **Next**.
5. **Step 3: Configure stack options**
   * Không cần sửa gì, cứ cuộn xuống cuối cùng và bấm **Next**.
6. **Step 4: Review**
   * Cuộn xuống tận cùng của trang.
   * Bạn MẶC ĐỊNH PHẢI **Tick** vào cái ô vuông có dòng chữ: *"I acknowledge that AWS CloudFormation might create IAM resources"*. (Xác nhận cho AWS tự tạo quyền).
   * Bấm nút màu cam **Submit**.

> ⏳ **Pha cà phê chờ đợi:** Màn hình sẽ chuyển sang danh sách Events. Lúc này AWS đang tự động xây dựng nhà cửa cho bạn. Hãy bấm nút **Refresh** 🔄 thỉnh thoảng để xem tiến độ. Hệ thống sẽ tốn khoảng 3-4 phút để sinh ra toàn bộ cơ sở dữ liệu và 12 APIs.

## 3. Thu Hoạch Chiến Lợi Phẩm (Lấy Link Giao Cho Frontend)
Khi chữ *CREATE_IN_PROGRESS* ở góc trên đổi thành chữ **CREATE_COMPLETE** màu xanh lá, tức là Backend đã hoàn thiện 100%!

1. Bấm sang tab **Outputs** (Kế bên tab Events).
2. Chà! CloudFormation đã xuất sẵn ra mâm cho bạn 4 thông số cực kỳ quan trọng. Hãy Copy chúng lại:
   * **ApiUrl**: Đường link chính của Backend API (ví dụ: `https://xxx.execute-api.ap-southeast-1.amazonaws.com/prod/`).
   * **UserPoolId**: ID của bộ nhận diện người dùng.
   * **UserPoolClientId**: Mã ứng dụng cho Frontend đăng nhập.
   * **FrontendBucketName**: Tên S3 Bucket đã được tạo sẵn để bạn chứa code Frontend.

👉 Cất 4 thông số này đi, chúng ta chuẩn bị sang Bước 3 ráp nối vào Frontend là xong!
