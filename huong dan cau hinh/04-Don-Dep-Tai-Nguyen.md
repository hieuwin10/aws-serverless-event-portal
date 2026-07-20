# 🧹 4️⃣ Hướng Dẫn Dọn Dẹp Tài Nguyên (Cleanup)

*Mục đích: Nếu bạn chỉ muốn test thử hệ thống và không có nhu cầu sử dụng tiếp, hãy làm theo các bước sau để xóa sạch toàn bộ tài nguyên trên AWS. Điều này giúp đảm bảo tài khoản của bạn tuyệt đối không bị trừ tiền oan.*

## 1. Xóa Code Frontend Khỏi S3 Bucket
CloudFormation (ở bước sau) sẽ **báo lỗi và không chịu xóa** nếu cái giỏ (Bucket) chứa code web của bạn vẫn còn chứa dữ liệu bên trong. Do đó ta phải tự tay làm rỗng nó trước:

1. Mở dịch vụ **S3** trên AWS Console.
2. Tìm đến Bucket chứa giao diện web (ví dụ: `eventapp-frontend-xxx`).
3. Tick chọn cái Bucket đó (không bấm vào tên, chỉ tick ô vuông bên trái).
4. Bấm nút **Empty** ở phía trên cùng.
5. AWS sẽ bắt bạn gõ chữ `permanently delete` vào ô trống để xác nhận. Gõ xong bấm **Empty**.
6. (Tùy chọn) Làm tương tự với Bucket chứa code Backend (`tram-trung-chuyen-code-2026`).

## 2. Xóa Toàn Bộ Backend (CloudFormation)
Đây là lúc sức mạnh của IaC (Infrastructure as Code) lên ngôi. Bạn không cần phải đi xóa lắt nhắt từng cái Lambda, từng cái bảng Database hay API Gateway.

1. Mở dịch vụ **CloudFormation** trên AWS Console.
2. Bấm vào tab **Stacks**.
3. Chọn Stack mà bạn đã tạo ở Bước 2 (tên là `EventApp-Backend-System`).
4. Bấm nút **Delete** ở góc phải trên cùng.
5. Bấm **Delete** một lần nữa để xác nhận.

> ⏳ **Pha trà chờ đợi:** Trạng thái sẽ chuyển thành `DELETE_IN_PROGRESS`. Đợi khoảng 3-5 phút, khi toàn bộ Stack biến mất khỏi danh sách (hoặc chuyển sang `DELETE_COMPLETE`) tức là toàn bộ ngôi nhà Backend của bạn đã được "phá dỡ" hoàn toàn, không để lại dấu vết nào!

🎉 **HOÀN TẤT DỌN DẸP!** Tài khoản AWS của bạn đã trở lại trạng thái nguyên thủy an toàn.
