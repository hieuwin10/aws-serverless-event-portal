# Đặc Tả Mô Hình Dữ Liệu & Thiết Kế DynamoDB (Advanced Single-Table Design)

Tài liệu này đặc tả thiết kế cơ sở dữ liệu **Amazon DynamoDB** cho dự án Website Quản Lý và Đăng Ký Sự Kiện Online. Hệ thống áp dụng mô hình **Single-Table Design** đỉnh cao nhằm nén toàn bộ 17 thực thể nghiệp vụ vào một bảng duy nhất có tên `EventApp-Data`. 

Mô hình này được thiết kế theo quy chuẩn **BMAD-METHOD v6**, giải quyết triệt để các bài toán về:
*   Tối ưu hóa số lượng bảng để nằm trọn trong gói miễn phí **AWS Free Tier Always Free** (chỉ dùng đúng 1 bảng duy nhất và 2 GSI).
*   Đảm bảo hiệu năng đọc/ghi dưới 10 mili-giây với hàng triệu bản ghi.
*   Bảo vệ ranh giới thất bại (Failure Boundaries) thông qua các cơ chế Eventual Consistency và Idempotency.

---

## 1. Bản Đồ Thiết Kế Khóa Tổng Thể (Key Mapping Strategy)

Bảng duy nhất `EventApp-Data` sử dụng cơ chế khóa generic để lưu trữ nhiều dạng thực thể khác nhau:
*   **Partition Key (Khóa phân vùng - PK):** Cấu trúc dạng chuỗi `String`.
*   **Sort Key (Khóa sắp xếp - SK):** Cấu trúc dạng chuỗi `String`.

### Bảng Ánh Xạ Khóa Dữ Liệu Cho 17 Thực Thể

| Thực thể (Entity) | Partition Key (PK) | Sort Key (SK) | GSI1-PK | GSI1-SK | GSI2-PK | GSI2-SK |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **1. USER** | `USER#<UserId>` | `METADATA` | - | - | - | - |
| **2. EVENT** | `EVENT#<EventId>` | `METADATA` | `CAT#<CategoryId>` | `START#<Time>#EVT#<Id>`| - | - |
| **3. REGISTRATION** | `USER#<UserId>` | `EVENT#<EventId>` | - | - | `EVENT#<EventId>` | `USER#<UserId>` |
| **4. PAYMENT** | `REG#<RegId>` | `PAYMENT#<PayId>` | - | - | `USER#<UserId>` | `TXN#<TxnId>` |
| **5. CHECKIN** | `REG#<RegId>` | `CHECKIN#<Timestamp>` | - | - | - | - |
| **6. CATEGORY** | `CAT#<CategoryId>` | `METADATA` | - | - | - | - |
| **7. LOCATION** | `LOC#<LocationId>` | `METADATA` | - | - | - | - |
| **8. ORGANIZER** | `ORG#<OrganizerId>` | `METADATA` | - | - | - | - |
| **9. SPEAKER** | `SPEAKER#<SpeakerId>` | `METADATA` | - | - | - | - |
| **10. EVENT_SPEAKER** | `EVENT#<EventId>` | `SPEAKER#<SpeakerId>`| `SPEAKER#<SpeakerId>` | `EVENT#<EventId>` | - | - |
| **11. SPONSOR** | `SPONSOR#<SponsorId>` | `METADATA` | - | - | - | - |
| **12. EVENT_SPONSOR** | `EVENT#<EventId>` | `SPONSOR#<SponsorId>`| `SPONSOR#<SponsorId>` | `EVENT#<EventId>` | - | - |
| **13. TICKET** | `EVENT#<EventId>` | `TICKET#<TicketId>` | - | - | - | - |
| **14. FEEDBACK** | `EVENT#<EventId>` | `FEEDBACK#<UserId>` | - | - | - | - |
| **15. NOTIFICATION** | `USER#<UserId>` | `NOTIF#<NotifId>` | - | - | - | - |
| **16. AUDIT_LOG** | `LOG#<Component>` | `TIME#<Epoch>` | `AUDIT_TIMELINE` | `TIME#<Epoch>#LOG#<Id>`| - | - |
| **17. MATERIALIZED_VIEW**| `CACHE#<ViewId>` | `VERSION#<Num>` | - | - | - | - |
| **18. WAITLIST** | `EVENT#<EventId>` | `WAITLIST#<Time>` | - | - | `USER#<UserId>` | `EVENT#<EventId>` |
| **19. REVIEW** | `EVENT#<EventId>` | `REVIEW#<UserId>` | `USER#<UserId>` | `REVIEW#<EventId>` | - | - |
| **20. USER_PROFILE** | `USER#<UserId>` | `PROFILE` | - | - | - | - |

---

## 2. Quyết Định Kiến Trúc Cốt Lõi (Architectural Decisions)

Trong buổi thẩm định thiết kế, đội ngũ kỹ sư trưởng (Principal/Staff Engineers) đã thống nhất chốt 4 phương án thiết kế nâng cao dưới đây:

### Quyết định 2.1: Đồng bộ số ghế trống qua CQRS Projection (Streams recompute)
*   **Vấn đề:** Tránh trùng lặp Single Source of Truth và rủi ro bất đồng bộ dữ liệu (`eventual inconsistency`) khi lưu cả `totalSeats` ở Event và `remainingQuantity` ở Ticket.
*   **Giải pháp:** 
    *   **Source of Authority (Nguồn xác thực):** `Ticket.remainingQuantity` lưu trữ số lượng vé thực tế còn trống cho từng loại vé cụ thể.
    *   **Computed Projection (Bộ chiếu tính toán):** `Event.remainingSeats` được hiển thị ở màn hình Discovery (Homepage).
    *   **Cơ chế cập nhật:** Khi khách hàng mua vé thành công, backend chỉ thực hiện cập nhật ghi trực tiếp vào thực thể `TICKET`. Hệ thống kích hoạt **DynamoDB Streams** tự động đẩy luồng thay đổi tới một hàm Lambda xử lý bất đồng bộ (`Streams async recompute`) để cộng gộp và cập nhật lại `Event.remainingSeats`.
    *   *Lợi ích:* Đảm bảo tính nhất quán dữ liệu ghi (`Write Consistency`) cực nhanh và tối ưu hóa tối đa truy vấn đọc trang chủ (`Read Optimization`).

### Quyết định 2.2: Trì hoãn phân mảnh khóa danh mục (No GSI Write Sharding NOW)
*   **Quyết định:** Mặc dù GSI1 trên danh mục sự kiện (`CAT#<CategoryId>`) có nguy cơ tạo ra **Hot Partition** ở các danh mục lớn, việc triển khai phân mảnh (`Write Sharding` dạng `CAT#tech#SHARD#0-4`) ở giai đoạn MVP là **Over-engineering**.
*   **Giải pháp:** Giữ nguyên thiết kế không phân mảnh để đơn giản hóa logic lập trình backend/frontend (`YAGNI - Defer complexity until needed`). Chỉ kích hoạt sharding khi hệ thống phát tín hiệu cảnh báo throttling thật sự thông qua CloudWatch Alarms ở các giai đoạn scale-up tiếp theo.

### Quyết định 2.3: Thiết kế Audit Log Hybrid chống Hot Partition
*   **Vấn đề:** Nếu đặt `PK = AUDIT_LOGS` để dễ dàng lấy dòng thời gian log (timeline), toàn bộ các luồng ghi log từ mọi cấu phần hệ thống sẽ đổ dồn vào một phân vùng vật lý duy nhất, gây sập hệ thống do nghẽn ghi.
*   **Giải pháp Hybrid:**
    *   **Distributed Writes (Bảng chính):** Ghi log phân tán rộng rãi trên bảng chính sử dụng `PK = LOG#<Component>` và `SK = TIME#<Epoch>`.
    *   **Global Timeline Query (Chỉ mục phụ):** Áp dụng kỹ thuật Overloaded GSI trên chỉ mục phụ GSI1 với cấu hình `GSI1PK = AUDIT_TIMELINE` và `GSI1SK = TIME#<Epoch>#LOG#<Id>`. Chỉ mục phụ sẽ tự động gộp dòng thời gian log mà không ảnh hưởng tới hiệu năng ghi trực tiếp của bảng chính.

### Quyết định 2.4: TTL strategy giảm tải chi phí (Always Free Tier)
*   Tự động hóa dọn dẹp dữ liệu log và thông báo rác thông qua tính năng Time-To-Live (TTL) của DynamoDB:
    *   `NOTIFICATION`: Tự động xóa sau 30 ngày (`ttl = 30 days`).
    *   `AUDIT_LOG`: Tự động xóa sau 7 ngày (`ttl = 7 days`).
    *   `MATERIALIZED_VIEW`: Hết hạn cache sau 60 giây (`ttl = 60 seconds`).

---

## 3. Bản Đồ Mẫu Access Patterns (Đặc Tả 15 Truy Vấn Hệ Thống)

Đây là cẩm nang hướng dẫn lập trình viên backend chuyển đổi các yêu cầu nghiệp vụ thành các câu truy vấn DynamoDB SDK v3 chính xác:

| Mã số | Nghiệp vụ (Access Pattern) | Thao tác | Khóa chính & Điều kiện truy vấn | Chỉ mục / Bảng |
| :--- | :--- | :--- | :--- | :--- |
| **AP-1** | Lấy chi tiết thông tin 1 sự kiện | `GetItem` | `PK = EVENT#<Id>`, `SK = METADATA` | Bảng chính |
| **AP-2** | Lấy danh sách sự kiện theo danh mục | `Query` | `GSI1PK = CAT#<CategoryId>`, `GSI1SK begins_with START#` | Chỉ mục `GSI1` |
| **AP-3** | Lấy thông tin chi tiết một User | `GetItem` | `PK = USER#<UserId>`, `SK = METADATA` | Bảng chính |
| **AP-4** | Lấy danh sách người đăng ký sự kiện | `Query` | `GSI2PK = EVENT#<EventId>`, `GSI2SK begins_with USER#` | Chỉ mục `GSI2` |
| **AP-5** | Xem các sự kiện mà 1 user đã đăng ký | `Query` | `PK = USER#<UserId>`, `SK begins_with EVENT#` | Bảng chính |
| **AP-6** | Lấy lịch sử giao dịch thanh toán của User | `Query` | `GSI2PK = USER#<UserId>`, `GSI2SK begins_with TXN#` | Chỉ mục `GSI2` |
| **AP-7** | Xem lịch sử check-in của 1 lượt đăng ký| `Query` | `PK = REG#<RegistrationId>`, `SK begins_with CHECKIN#`| Bảng chính |
| **AP-8** | Xem danh sách diễn giả của 1 sự kiện | `Query` | `PK = EVENT#<EventId>`, `SK begins_with SPEAKER#` | Bảng chính |
| **AP-9** | Xem danh sách sự kiện của 1 diễn giả | `Query` | `GSI1PK = SPEAKER#<SpeakerId>`, `GSI1SK begins_with EVENT#`| Chỉ mục `GSI1` |
| **AP-10**| Xem danh sách nhà tài trợ của sự kiện | `Query` | `PK = EVENT#<EventId>`, `SK begins_with SPONSOR#` | Bảng chính |
| **AP-11**| Xem danh sách loại vé của sự kiện | `Query` | `PK = EVENT#<EventId>`, `SK begins_with TICKET#` | Bảng chính |
| **AP-12**| Kiểm tra thanh toán của 1 lượt đăng ký | `Query` | `PK = REG#<RegistrationId>`, `SK begins_with PAYMENT#` | Bảng chính |
| **AP-13**| Lấy dòng thời gian log hệ thống | `Query` | `GSI1PK = AUDIT_TIMELINE`, `GSI1SK begins_with TIME#` | Chỉ mục `GSI1` |
| **AP-14**| Đọc cache trang chủ (Homepage) | `GetItem` | `PK = CACHE#HOMEPAGE`, `SK = TRENDING_EVENTS` | Bảng chính |
| **AP-15**| Xem thông báo chưa đọc của User | `Query` | `PK = USER#<UserId>`, `SK begins_with NOTIF#` | Bảng chính |
| **AP-16**| Lấy danh sách chờ của sự kiện | `Query` | `PK = EVENT#<EventId>`, `SK begins_with WAITLIST#` | Bảng chính |
| **AP-17**| Đọc đánh giá của 1 sự kiện | `Query` | `PK = EVENT#<EventId>`, `SK begins_with REVIEW#` | Bảng chính |
| **AP-18**| Đọc các đánh giá do 1 user viết | `Query` | `GSI1PK = USER#<UserId>`, `GSI1SK begins_with REVIEW#` | Chỉ mục `GSI1` |
| **AP-19**| Lấy hồ sơ điểm thưởng của User | `GetItem` | `PK = USER#<UserId>`, `SK = PROFILE` | Bảng chính |

---

## 4. Mô Phỏng Trực Quan Dữ Liệu Trong Bảng (Sample Table Layout)

Dưới đây là mô phỏng dữ liệu thực tế lưu trữ trong bảng `EventApp-Data`:

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                          BẢNG: EventApp-Data                                           │
├───────────────────────┬───────────────────────────┬─────────────────┬──────────────────────────────────┤
│    PK (Partition)     │      SK (Sort)            │    GSI1-PK      │  Các thuộc tính khác (data JSON) │
├───────────────────────┼───────────────────────────┼─────────────────┼──────────────────────────────────┤
│ EVENT#evt_9b1d...     │ METADATA                  │ CAT#technology  │ title="AWS Summit 2026", seats=50│
│ EVENT#evt_9b1d...     │ TICKET#tkt_vip            │ -               │ price=100.0, name="Vé VIP"       │
│ EVENT#evt_9b1d...     │ SPEAKER#spk_hieuvu        │ -               │ sessionTitle="Vận hành Serverless│
├───────────────────────┼───────────────────────────┼─────────────────┼──────────────────────────────────┤
│ USER#usr_c66f...      │ METADATA                  │ -               │ fullName="Nguyễn Văn A", role=Use│
│ USER#usr_c66f...      │ EVENT#evt_9b1d...         │ -               │ ticketCode="TKT-AWS-9B1D-C66"    │
│ USER#usr_c66f...      │ PROFILE                   │ -               │ points=25, tier="Silver"         │
├───────────────────────┼───────────────────────────┼─────────────────┼──────────────────────────────────┤
│ EVENT#evt_9b1d...     │ WAITLIST#1716710500       │ -               │ userId="usr_c66f...", autoEnroll=│
│ EVENT#evt_9b1d...     │ REVIEW#usr_c66f...        │ USER#usr_c66f...│ rating=5, comment="Great event!" │
├───────────────────────┼───────────────────────────┼─────────────────┼──────────────────────────────────┤
│ REG#reg_77f8...       │ PAYMENT#pay_44e1...       │ -               │ amount=100.0, state="SUCCESS"    │
│ REG#reg_77f8...       │ CHECKIN#1716710400        │ -               │ deviceId="iPhone15Pro"           │
├───────────────────────┼───────────────────────────┼─────────────────┼──────────────────────────────────┤
│ LOG#BackendService    │ TIME#1716710410           │ AUDIT_TIMELINE  │ action="CREATE_EVENT", logId=L001│
└───────────────────────┴───────────────────────────┴─────────────────┴──────────────────────────────────┘
```

> 💡 **Giải thích luồng chạy chéo:**
> Khi Admin thêm Diễn giả `spk_hieuvu` vào Sự kiện `evt_9b1d...`, backend ghi 1 item mới có:
> *   `PK = EVENT#evt_9b1d...`
> *   `SK = SPEAKER#spk_hieuvu`
> *   `GSI1PK = SPEAKER#spk_hieuvu`
> *   `GSI1SK = EVENT#evt_9b1d...`
>
> Nhờ đó:
> 1. Truy vấn xem danh sách speaker của event `evt_9b1d...` -> `Query` trên bảng chính bằng `PK = EVENT#evt_9b1d...` và `SK begins_with SPEAKER#` (AP-8).
> 2. Truy vấn xem diễn giả `spk_hieuvu` nói ở những sự kiện nào -> `Query` trên chỉ mục `GSI1` bằng `GSI1PK = SPEAKER#spk_hieuvu` (AP-9).
>
> **Không có bất kỳ lệnh Scan nào được thực thi, hiệu năng luôn là O(1) hoặc O(log N)!**
