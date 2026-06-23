# 1️⃣ Chuẩn Bị Code Backend & Đẩy Lên Đám Mây

*Mục đích: Đóng gói mã nguồn Backend từ máy tính của bạn và đưa lên một trạm trung chuyển (S3) để lát nữa CloudFormation có thể lấy nó mà tự động cài đặt.*

## 1. Nén Code Ở Máy Cục Bộ
1. Mở Terminal/Command Prompt trên máy tính của bạn.
2. Trỏ vào thư mục `backend` trong source code: 
   ```bash
   cd "C:\Users\Sieu chu nhiem\Desktop\aws-serverless-event-portal\backend"
   ```
3. Cài đặt thư viện: `npm install`
4. Build mã nguồn từ TypeScript sang JavaScript: `npm run build`
5. Lúc này, thư mục `backend` sẽ sinh ra thư mục con tên là `dist`.
6. Bạn hãy Copy file `package.json` và thư mục `node_modules` bỏ chung vào trong thư mục `dist`.
7. Click chuột phải bôi đen toàn bộ các file bên TRONG thư mục `dist` -> Chọn **Send to -> Compressed (zipped) folder**. Đặt tên là `backend-code.zip`.

## 2. Đẩy Code Lên Trạm Trung Chuyển (Amazon S3)
*Vì chúng ta hoàn toàn thao tác trên Web Console, bạn cần tự đưa file zip này lên AWS trước.*

1. Đăng nhập AWS Console, gõ vào thanh tìm kiếm trên cùng: **S3**.
2. Nhấn nút màu cam **Create bucket**.
   * *Bucket name:* Đặt một tên bất kỳ viết thường, không dấu, không trùng lặp (Ví dụ: `tram-trung-chuyen-code-2026`).
   * Cuộn xuống dưới cùng và bấm **Create bucket** (giữ nguyên mọi cài đặt bảo mật, không cần public).
3. Bấm vào cái Bucket bạn vừa tạo.
4. Bấm nút **Upload**. Kéo thả file `backend-code.zip` của bạn vào đó và bấm **Upload** để tải lên.
5. Sau khi tải xong 100%, bấm vào tên file `backend-code.zip` đó.
6. Ở cửa sổ hiện ra, nhìn sang góc phải sẽ thấy phần **Object URL** hoặc **S3 URI**. Hãy bấm biểu tượng **Copy** để lưu lại cái link này.
   *(Ví dụ URL: `https://tram-trung-chuyen-code-2026.s3.ap-southeast-1.amazonaws.com/backend-code.zip`)*.

---
👉 **Hoàn thành Bước 1! Bạn hãy giữ kỹ cái link URL vừa copy và chuyển sang Bước 2.**
