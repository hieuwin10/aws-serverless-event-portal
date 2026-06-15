# Kiến Trúc Tích Hợp AWS (Integration Architecture)

Tài liệu này mô tả chi tiết cách thức liên kết và cấu hình các dịch vụ đám mây của **Amazon Web Services (AWS)** để vận hành hệ thống Quản lý và Đăng ký Sự kiện Online. Toàn bộ kiến trúc được tối ưu hóa để vận hành bền bỉ và tuyệt đối an toàn trong phạm vi gói **AWS Free Tier**.

---

## 1. Sơ Đồ Kiến Trúc Chi Tiết

Hệ thống hoạt động theo mô hình **Serverless Event-Driven Architecture**. Không có máy chủ ảo (như EC2) chạy liên tục. Dữ liệu chỉ được tính toán và xử lý khi có yêu cầu thực tế từ phía người dùng.

```mermaid
graph TD
    %% Định nghĩa các tác nhân
    User([Người dùng / Admin]) -->|1. Truy cập Domain| CF[Amazon CloudFront <br/> Global CDN]
    CF -->|2. Tải trang tĩnh| S3[(Amazon S3 Bucket <br/> Static Website Hosting)]
    
    %% Xác thực tài khoản
    User -->|3. Đăng nhập / Đăng ký| Cognito[Amazon Cognito <br/> User Pools]
    Cognito -->|4. Cấp JWT Token| User

    %% Kết nối API Gateway
    User -->|5. Gửi request + JWT| APIGW[Amazon API Gateway]
    APIGW -->|6. Kiểm định JWT| Cognito
    
    %% Trình quản lý IAM
    APIGW -.->|7. Phân quyền| IAM[AWS IAM Roles]
    
    %% Hàm xử lý backend Lambda
    APIGW -->|8. Kích hoạt Function| Lambda[AWS Lambda <br/> Node.js TS]
    
    %% Cơ sở dữ liệu, Streams & Logs
    Lambda -->|9. Đọc/Ghi dữ liệu dưới quyền IAM| DynamoDB[(Amazon DynamoDB <br/> NoSQL Database)]
    DynamoDB -.->|10. Kích hoạt xử lý nền (CQRS/Waitlist)| Streams[DynamoDB Streams]
    Streams -->|11. Gọi hàm nền| Lambda
    Lambda -.->|12. Xuất log hoạt động| CW[Amazon CloudWatch <br/> Logs]
    %% Định dạng CSS cho Sơ đồ
    style User fill:#f9f,stroke:#333,stroke-width:2px
    style S3 fill:#ff9900,stroke:#333,stroke-width:2px,color:#fff
    style CF fill:#ff9900,stroke:#333,stroke-width:2px,color:#fff
    style Cognito fill:#ff5050,stroke:#333,stroke-width:2px,color:#fff
    style APIGW fill:#ff9900,stroke:#333,stroke-width:2px,color:#fff
    style IAM fill:#757575,stroke:#333,stroke-width:1px,stroke-dasharray: 5 5,color:#fff
    style Lambda fill:#ff9900,stroke:#333,stroke-width:2px,color:#fff
    style DynamoDB fill:#4070ff,stroke:#333,stroke-width:2px,color:#fff
    style Streams fill:#4070ff,stroke:#333,stroke-width:1px,stroke-dasharray: 5 5,color:#fff
    style CW fill:#40a0ff,stroke:#333,stroke-width:2px,color:#fff
```

---

## 2. Vai Trò Chi Tiết Của 7 Dịch Vụ AWS & Cấu Hình Free Tier

Hệ thống sử dụng đúng 7 dịch vụ nhằm đáp ứng đầy đủ các tiêu chuẩn của một ứng dụng Web chuyên nghiệp (Sản xuất, Bảo mật, Giám sát, Cơ sở dữ liệu, Xác thực, CDN và Hosting):

### 2.1. Amazon CloudFront (Always Free)
*   **Vai trò:** Nhận yêu cầu truy cập từ người dùng và phân phối mã nguồn frontend lưu trữ tại S3. CloudFront đóng vai trò là lớp bảo mật HTTPS ngoài cùng (SSL/TLS), tự động gán chứng chỉ bảo mật và tối ưu hóa bộ nhớ đệm (Caching).
*   **Cấu hình Free Tier:** Cung cấp miễn phí **1 TB** băng thông truyền tải dữ liệu ra Internet mỗi tháng và tối đa **10,000,000** lượt gọi HTTP/HTTPS.

### 2.2. Amazon S3 (12 Months Free)
*   **Vai trò:** Lưu trữ toàn bộ tài nguyên tĩnh của Frontend (gói build sau khi chạy `npm run build` bao gồm các tệp `index.html`, các tệp `.js`, `.css` và hình ảnh). S3 bucket được cấu hình ở chế độ **Private**, chỉ cho phép duy nhất **Amazon CloudFront** truy cập thông qua cơ chế **Origin Access Control (OAC)** để ngăn chặn việc người dùng tải trực tiếp từ S3 làm phát sinh chi phí.
*   **Cấu hình Free Tier:** **5 GB** lưu trữ Standard, **20,000** Get Requests và **2,000** Put Requests mỗi tháng.

### 2.3. Amazon Cognito (Always Free)
*   **Vai trò:** Quản lý vòng đời tài khoản (Đăng ký, xác minh email, đăng nhập, đặt lại mật khẩu). Cognito tự động hóa việc mã hóa mật khẩu, cung cấp giao diện Token JWT an toàn và hỗ trợ phân nhóm người dùng (`UserGroup` và `AdminGroup`).
*   **Cấu hình Free Tier:** Miễn phí lên tới **50,000** người dùng hoạt động hàng tháng (MAU) đối với tài khoản đăng ký trực tiếp qua Cognito User Pool.

### 2.4. Amazon API Gateway (12 Months Free)
*   **Vai trò:** Cung cấp cổng tiếp nhận Endpoint HTTP. API Gateway tích hợp **Cognito Authorizer** để tự động kiểm duyệt chữ ký mã hóa JWT Token từ trình duyệt trước khi chuyển tiếp dữ liệu tới Lambda, đảm bảo các endpoint Admin không bị xâm nhập trái phép.
*   **Cấu hình Free Tier:** **1,000,000 (1 triệu)** cuộc gọi API nhận được mỗi tháng.

### 2.5. AWS Lambda (Always Free)
*   **Vai trò:** Thực hiện toàn bộ logic backend. Mã nguồn viết bằng **Node.js (TypeScript)** sẽ được biên dịch và đóng gói thành tệp zip siêu nhẹ. Khi có request từ API Gateway, Lambda được kích hoạt tức thời để xử lý (như lưu trữ sự kiện mới, đăng ký chỗ tham gia sự kiện) và tự động tắt ngay sau khi phản hồi dữ liệu.
*   **Cấu hình Free Tier:** **1,000,000** lượt gọi và **3.2 triệu giây** tính toán miễn phí mỗi tháng (với cấu hình ram 256MB).

### 2.6. Amazon DynamoDB (Always Free)
*   **Vai trò:** Cơ sở dữ liệu NoSQL lưu trữ thông tin thực thể của hệ thống. Dữ liệu được tổ chức theo thiết kế **Single-Table Design** hoặc cấu trúc bảng phân tách tối giản nhằm giảm thiểu số lượng bảng cần quản trị.
*   **Cấu hình Free Tier:** **25 GB** dung lượng lưu trữ dữ liệu.
*   **LƯU Ý CỰC KỲ QUAN TRỌNG:** Cần cấu hình chế độ dung lượng là **Provisioned Capacity** thay vì *On-Demand*. Thiết lập **Read Capacity Units (RCU) = 25** và **Write Capacity Units (WCU) = 25** để nằm hoàn toàn trong hạn mức miễn phí Always Free.

### 2.7. Amazon CloudWatch (Always Free)
*   **Vai trò:** Tự động thu thập toàn bộ log hoạt động từ các hàm AWS Lambda. Bất kỳ lỗi logic nào xảy ra khi chạy code hoặc dữ liệu gửi lên bị thiếu sẽ được ghi nhận chi tiết tại **CloudWatch Log Groups**.
*   **Cấu hình Free Tier:** **5 GB** dung lượng lưu trữ log dữ liệu mỗi tháng.
*   **CẤU HÌNH TỐI ƯU:** Mặc định log group được tạo sẽ để chế độ lưu trữ vô thời hạn (Never Expire). Chúng ta cần cấu hình **Log Retention Policy là 7 ngày** để hệ thống tự động dọn dẹp log cũ, giữ dung lượng luôn dưới mức 5 GB miễn phí.

### 2.8. DynamoDB Streams (Always Free)
*   **Vai trò:** Bắt các luồng thay đổi dữ liệu (Insert/Modify/Remove) theo thời gian thực từ bảng DynamoDB. Sử dụng cho mô hình Event-driven để kích hoạt các Lambda chạy nền xử lý: Tự động đẩy vé từ Danh sách chờ (Waitlist), tính điểm đánh giá trung bình (CQRS) và hệ thống cộng điểm thành viên.
*   **Cấu hình Free Tier:** Tích hợp trực tiếp trong giới hạn miễn phí của DynamoDB, đọc Streams bằng Lambda hoàn toàn không phát sinh phụ phí nếu nằm trong mức Free Tier Lambda.

---

## 3. Quản Lý Quyền Truy Cập Bằng AWS IAM (Security IAM Roles)

Hệ thống tuân thủ nghiêm ngặt nguyên tắc **Least Privilege** (Cấp quyền tối thiểu cần thiết để hoạt động). Có hai IAM Role chính được thiết lập:

### 3.1. Lambda Basic Execution & CloudWatch Role
*   **Tên Role đề xuất:** `EventAppLambdaExecutionRole`
*   **Vai trò:** Được AWS Lambda sử dụng để giao tiếp với các dịch vụ khác.
*   **Quyền được cấp (Inline / Managed Policies):**
    *   `AWSLambdaBasicExecutionRole` (Quyền cơ bản để ghi log vào CloudWatch: `logs:CreateLogGroup`, `logs:CreateLogStream`, `logs:PutLogEvents`).
    *   **DynamoDB Policy giới hạn:** Chỉ cho phép thực hiện các hành động cần thiết lên đúng ARN của bảng dữ liệu sự kiện:
        ```json
        {
          "Version": "2012-10-17",
          "Statement": [
            {
              "Effect": "Allow",
              "Action": [
                "dynamodb:GetItem",
                "dynamodb:PutItem",
                "dynamodb:UpdateItem",
                "dynamodb:DeleteItem",
                "dynamodb:Scan",
                "dynamodb:Query"
              ],
              "Resource": "arn:aws:dynamodb:ap-southeast-1:YOUR_ACCOUNT_ID:table/EventApp-*"
            }
          ]
        }
        ```

### 3.2. API Gateway to CloudWatch Role
*   **Tên Role đề xuất:** `APIGatewayToCloudWatchRole`
*   **Vai trò:** Cho phép API Gateway đẩy log thông tin lượt gọi (Request/Response) vào CloudWatch để theo dõi hiệu năng API.

---

## 4. Kế Hoạch Vận Hành Không Phát Sinh Chi Phí (Cost Prevention Checklist)

Để đảm bảo tài khoản AWS của bạn **luôn hiển thị hóa đơn 0đ**, hãy thực hiện đúng các bước cấu hình sau khi tạo tài nguyên trên AWS:

1.  [ ] **Thiết lập Billing Alarm:** Tạo một cảnh báo chi phí (Billing Alarm) trong AWS Budgets với hạn mức **$1.00 USD**. Nếu hệ thống vô tình chạy quá hạn mức Free Tier và phát sinh dù chỉ $1 USD, AWS sẽ lập tức gửi email cảnh báo về điện thoại của bạn.
2.  [ ] **Không chọn chế độ On-Demand cho DynamoDB:** Khi tạo bảng DynamoDB, luôn chọn **Provisioned** và đặt giá trị `25` cho cả Read và Write.
3.  [ ] **Đặt thời gian hết hạn log CloudWatch:** Luôn chỉnh sửa cài đặt Log Retention của các Lambda log groups thành `7 days` hoặc `14 days`.
4.  [ ] **Hạn chế số lượng ảnh tải lên S3 thực tế:** Đối với hình ảnh đại diện sự kiện, thay vì cho phép người dùng tự tải ảnh dung lượng lớn lên S3 thực tế của bạn, hãy sử dụng các đường link ảnh mockup từ bên ngoài (như Unsplash) hoặc giới hạn kích thước tệp tải lên dưới **1 MB** ở phía Frontend.
