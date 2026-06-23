# Frontend Progress Report

Ngay cap nhat: 2026-06-19

## Tong Quan

Frontend cho AWS Serverless Event Portal da hoan thanh cac hang muc UI theo lo trinh Tuần 1 den Tuần 4. Ung dung hien da co cac flow chinh: bao ve route, trang loi 403/404, waitlist khi het ve, ho so nguoi dung, QR check-in cho admin, danh gia su kien, goi y su kien, xuat lich, danh sach thanh vien da dang ky va cac reusable components.

Build frontend da duoc kiem tra thanh cong bang:

```bash
npm.cmd run build
```

## Tuan 1 - Critical

Trang thai: Hoan tat

### ProtectedRoute Component

- Kiem tra trang thai dang nhap truoc khi render noi dung can bao ve.
- Ho tro guard route user thong thuong.
- Ho tro guard route admin qua `requireAdmin`.
- Hien thi trang yeu cau dang nhap hoac khong du quyen khi user khong hop le.

File lien quan:

- `frontend/src/components/ProtectedRoute.tsx`
- `frontend/src/App.tsx`

### Unauthorized Page 403

- Co trang hien thi khi user khong co quyen truy cap.
- Co thong tin loi va nut dieu huong quay ve.

File lien quan:

- `frontend/src/pages/UnauthorizedPage.tsx`
- `frontend/src/App.tsx`

### Not Found Page 404

- Co trang hien thi khi URL/trang khong ton tai trong flow noi bo.
- Co hanh dong quay ve trang chu/quay lai.

File lien quan:

- `frontend/src/pages/NotFoundPage.tsx`
- `frontend/src/App.tsx`

## Tuan 2 - Should Have, Phan 1

Trang thai: Hoan tat

### Waitlist UI

- Co trang waitlist cho su kien het ve.
- Co form nhap email va so dien thoai.
- Co validation email/so dien thoai.
- Co hien thi thong ke va danh sach cho mau.
- Da integrate tu trang chi tiet su kien khi het ve.

File lien quan:

- `frontend/src/pages/WaitlistPage.tsx`
- `frontend/src/App.tsx`

Ghi chu:

- Hien dang dung mock UI/local flow. Khi backend co API waitlist, co the thay `handleJoinWaitlist` trong `App.tsx` bang API call that.

### User Profile Page

- Co trang ho so ca nhan.
- Hien thi ten, email, user ID, role.
- Co tab bao mat, form doi mat khau.
- Co khu vuc xoa tai khoan.
- Co tuy chon thong bao/rieng tu dang mock.

File lien quan:

- `frontend/src/pages/UserProfilePage.tsx`
- `frontend/src/App.tsx`

Ghi chu:

- Doi mat khau va xoa tai khoan hien la mock UI. Can noi API Cognito/backend neu muon xu ly that.

## Tuan 3 - Should Have, Phan 2

Trang thai: Hoan tat

### QR Check-in Page

- Co trang QR check-in danh cho Admin.
- Co mo phong khung quet QR.
- Co nhap ma ve/QR payload.
- Co xac nhan check-in thanh cong, trung ve, hoac khong tim thay ve.
- Co danh sach ve mau de thao tac nhanh.
- Da integrate vao nav/admin flow.

File lien quan:

- `frontend/src/pages/QRCheckInPage.tsx`
- `frontend/src/App.tsx`
- `frontend/src/App.css`

Ghi chu:

- Hien la QR scanner simulation, chua dung camera that. Co the nang cap sau bang thu vien QR scanner neu can.

### Review/Rating Component

- Co star rating 1-5.
- Co textarea viet review.
- Co danh sach review.
- Co diem trung binh review.
- Da integrate vao trang chi tiet su kien.

File lien quan:

- `frontend/src/components/ReviewRating.tsx`
- `frontend/src/App.tsx`
- `frontend/src/App.css`

Ghi chu:

- Review hien luu trong `localStorage` theo event ID. Khi backend co API review, co the thay localStorage bang API.

## Tuan 4 - Nice to Have

Trang thai: Hoan tat

### Event Recommendations

- Co component hien thi su kien goi y.
- Hien thi tren homepage va trang chi tiet su kien.
- Loc goi y theo danh muc/hien trang su kien va bo qua su kien dang xem.

File lien quan:

- `frontend/src/components/EventRecommendations.tsx`
- `frontend/src/App.tsx`
- `frontend/src/App.css`

### Export Calendar

- Co nut xuat file `.ics`.
- Co nut "Them vao Google Calendar".
- Da integrate vao trang chi tiet su kien.

File lien quan:

- `frontend/src/components/CalendarExportButton.tsx`
- `frontend/src/App.tsx`

### Member List View

- Admin co the mo danh sach nguoi da dang ky theo tung su kien.
- Co bang hien thi email, ma ve, ngay dang ky, trang thai.
- Co fallback mock members neu backend chua tra registration list day du cho su kien.

File lien quan:

- `frontend/src/pages/MemberListPage.tsx`
- `frontend/src/App.tsx`
- `frontend/src/App.css`

### Reusable Components

Da tach cac reusable components:

- `frontend/src/components/SearchInput.tsx`
- `frontend/src/components/CategoryPills.tsx`
- `frontend/src/components/LoadingSpinner.tsx`
- `frontend/src/components/EventCard.tsx`
- `frontend/src/components/TicketCard.tsx`
- `frontend/src/components/Modal.tsx`
- `frontend/src/components/ToastAlert.tsx`

## Cac File Chinh Da Cap Nhat

- `frontend/src/App.tsx`
- `frontend/src/App.css`
- `frontend/src/components/ProtectedRoute.tsx`
- `frontend/src/components/SearchInput.tsx`
- `frontend/src/components/CategoryPills.tsx`
- `frontend/src/components/LoadingSpinner.tsx`
- `frontend/src/components/EventCard.tsx`
- `frontend/src/components/TicketCard.tsx`
- `frontend/src/components/Modal.tsx`
- `frontend/src/components/ToastAlert.tsx`
- `frontend/src/components/CalendarExportButton.tsx`
- `frontend/src/components/EventRecommendations.tsx`
- `frontend/src/components/ReviewRating.tsx`
- `frontend/src/pages/UnauthorizedPage.tsx`
- `frontend/src/pages/NotFoundPage.tsx`
- `frontend/src/pages/WaitlistPage.tsx`
- `frontend/src/pages/UserProfilePage.tsx`
- `frontend/src/pages/QRCheckInPage.tsx`
- `frontend/src/pages/MemberListPage.tsx`

## Trang Thai Ky Thuat

- TypeScript build: Pass
- Vite production build: Pass
- Cac route noi bo trong `App.tsx`: Da noi
- Cac component UI moi: Da import va su dung
- Cac luong Admin: Da co Admin dashboard, QR check-in, member list

## Gioi Han Hien Tai

Mot so tinh nang da co UI va flow frontend nhung dang dung mock/local data:

- Waitlist: mock submit va waitlist preview.
- Review/Rating: luu `localStorage`.
- QR Check-in: simulation, chua quet camera that.
- Member List: dung registrations hien co, co fallback mock member.
- Profile security: doi mat khau/xoa tai khoan dang mock.

## De Xuat Buoc Tiep Theo

1. Noi API backend cho waitlist, reviews, member list va check-in.
2. Them routing that bang React Router neu muon URL truc tiep cho tung page.
3. Them test UI/component cho cac flow quan trong.
4. Chuan hoa lai encoding tieng Viet trong cac file cu neu can hien thi tieng Viet co dau day du.
