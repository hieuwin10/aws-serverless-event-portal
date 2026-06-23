# 3️⃣ Triển Khai Giao Diện Web (Amazon S3 Frontend Hosting)

*Mục đích: Đưa mã nguồn Frontend lên mạng. Tin vui là CloudFormation đã "chu đáo" tạo sẵn luôn cái kho S3 cho Frontend rồi, chúng ta chỉ việc cấu hình và đẩy code lên thôi!*

## 1. Cấu hình Code Frontend Local
1. Mở thư mục `frontend` trên máy của bạn.
2. Tạo một file mới tên là `.env` ngang hàng với thư mục `src`.
3. Điền các giá trị mà bạn đã Copy từ tab **Outputs** của CloudFormation ở bước trước vào file này:

```env
VITE_API_ENDPOINT=https://xxx.execute-api.ap-southeast-1.amazonaws.com/prod
VITE_COGNITO_USER_POOL_ID=ap-southeast-1_xxxxxxxxx
VITE_COGNITO_CLIENT_ID=abc123xyz456
```
4. Mở Terminal, trỏ vào thư mục `frontend`: `cd C:\Users\Sieu chu nhiem\Desktop\aws-serverless-event-portal\frontend`
5. Cài thư viện: `npm install`
6. Build giao diện web tĩnh: `npm run build`
*(Quá trình này sẽ tạo ra một thư mục tên là `dist` chứa các file web tĩnh).*

## 2. Cấu hình Bucket (Do CloudFormation tạo sẵn)
1. Mở dịch vụ **S3** trên thanh tìm kiếm AWS.
2. Bạn sẽ thấy một Bucket đã được tạo sẵn có tên giống với thông số **FrontendBucketName** (Ví dụ: `eventapp-frontend-xxx`). Bấm vào nó!
3. Chuyển sang tab **Permissions**.
4. Ở phần **Block public access (bucket settings)**, bấm nút **Edit**.
   * **BỎ CHỌN (Untick)** cái ô vuông "Block *all* public access".
   * Bấm **Save changes** và gõ chữ `confirm` để xác nhận.
5. Cuộn xuống phần **Bucket policy** và bấm nút **Edit**.
   * Copy đoạn JSON dưới đây paste vào hộp chữ. **NHỚ SỬA chữ `<FrontendBucketName>`** thành tên bucket thực tế của bạn.

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::<FrontendBucketName>/*"
        }
    ]
}
```
   * Bấm **Save changes**.

## 3. Bật Tính Năng Website & Upload Code Web
1. Chuyển sang tab **Properties**.
2. Kéo xuống cuối cùng trang, tìm phần **Static website hosting**, bấm nút **Edit**.
3. Chọn **Enable**.
   * *Index document:* Nhập `index.html`
   * *Error document:* Nhập `index.html`
4. Bấm **Save changes**. Copy luôn cái đường link **Bucket website endpoint** ở cuối trang để tí truy cập web.
5. Chuyển lên tab **Objects**. Bấm nút **Upload**.
6. Kéo thả TOÀN BỘ các file và thư mục nằm **BÊN TRONG** thư mục `dist` của Frontend mà bạn vừa build.
7. Bấm nút **Upload** và chờ 100%.

🎉 **HOÀN THÀNH TOÀN BỘ DỰ ÁN!** 🎉
Bây giờ bạn chỉ việc mở trình duyệt web, paste đường link **Bucket website endpoint** bạn lấy ở Bước 3 vào. Website đã sẵn sàng chạy với hệ thống Backend Serverless thực thụ bên dưới! Vừa rẻ, vừa nhanh, lại cấu hình cực nhàn!
