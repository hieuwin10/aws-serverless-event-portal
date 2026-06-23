# 📖 Tổng Quan: Triển Khai Nhanh Bằng CloudFormation (IaC)

Chúc mừng bạn đã chọn "lối đi của những người thông minh"! Thay vì phải tốn hàng giờ đồng hồ để click tay tạo từng cái Database, Lambda, API Gateway... chúng ta sẽ sử dụng công nghệ **Infrastructure as Code (IaC)** thông qua tính năng **AWS CloudFormation** trực tiếp trên nền web.

Trong phương pháp này, file `template.yaml` có sẵn trong source code đóng vai trò như một "bản vẽ kiến trúc". CloudFormation sẽ đọc bản vẽ này và tự động gọi những robot của AWS ra xây nhà cho bạn chỉ trong 3 phút.

## 🚀 Thứ Tự Triển Khai Mới (Chỉ còn 3 Bước)

Phương pháp này nhàn hơn rất nhiều, quy trình được rút gọn lại chỉ còn:

1. **[01-Chuan-Bi-Code.md](./01-Chuan-Bi-Code.md)**: Nén code Backend và đẩy tạm lên mạng.
2. **[02-Trien-Khai-CloudFormation.md](./02-Trien-Khai-CloudFormation.md)**: Nạp bản vẽ `template.yaml` vào máy đẻ CloudFormation để sinh ra toàn bộ Backend.
3. **[03-Trien-Khai-Frontend.md](./03-Trien-Khai-Frontend.md)**: Lấy link API đẩy code Frontend lên S3.

Bạn đã sẵn sàng để thấy "phép thuật" của AWS chưa? Hãy bắt đầu với Bước 1 nhé!
