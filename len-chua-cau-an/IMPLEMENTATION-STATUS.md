# IMPLEMENTATION STATUS — CHÙA AN LẠC VIÊN V2
Ngày cập nhật: 02/11/2026 • Nhánh: main • Xuất bản: https://bdx0.github.io/html/len-chua-cau-an/

## Trạng thái
- [x] M0: đọc code gốc, duy trì key localStorage và các tương tác hiện có; kiểm tra cú pháp.
- [x] M1: dựng SITE_PLAN 64×56m, điều chỉnh mặt bằng, tạo collider từ plan, lưới BFS 1.2m, đường đi cho 5 hoạt động.
- [x] M2: xây mới tam quan 3 lối, chính điện nền cao/hiên sâu, mái nhiều nhịp, gác chuông phía trái, khu mõ và bàn lời lành. Mô hình dựng bằng code, không phải bản đo thực tế.
- [x] M3 (bản đầu): chuyển hồ sen sang phải, bồ đề sang trái, lối hiên, ghế nghỉ, tăng nhân có chổi, NPC chọn mục tiêu theo vai trò; giảm số nhân vật xuống 34 để nhẹ máy.
- [x] M4 (bản đầu): giữ virtual controller, Gamepad API, 5 hoạt động, journal, ảnh chia sẻ; bổ sung reduced-motion và pixel ratio thấp hơn trên thiết bị cảm ứng; giảm thi đua trong phản hồi gõ mõ.
- [x] Static regression: cú pháp JS, 5 tuyến đến hoạt động, xác thực va chạm cơ bản.
- [ ] Test WebGL và FPS thực trên iPhone Safari và iPad Safari.
- [ ] Thẩm định hình ảnh mái, lối dốc và tỷ lệ bởi kiến trúc sư/đại diện văn hóa trực tiếp.
- [ ] Test tự động toàn bộ 5 hoạt động và localStorage trên trình duyệt thực sau khi tái thiết.
- [ ] Điều hướng NPC nâng cao: tránh nhau ở phạm vi gần, giảm thay đổi hướng khi đứng đông.
- [ ] Camera raycast/spherecast với cột và mái ở các tình huống vào sâu nội điện.
- [ ] WebGL/CDN fallback và theo dõi FPS/bộ nhớ tự động.

## Bằng chứng đã kiểm tra
- Sử dụng VM Node/JS để đánh giá trực tiếp hàm findPath và canMove trích từ index.html.
- Các điểm đứng có đường đi: dâng hương (19 nút), chuông (30), mõ (30), bồ đề (40), lời lành (15).
- Các tâm lư, hồ, bồ đề và bệ Phật bị chặn va chạm; ranh giới không xuyên qua.
- JavaScript module không có lỗi cú pháp theo hàm parse.
- Đã tạo triển khai GitHub Pages theo workflow hiện có; trạng thái deploy cần kiểm tra đối chiếu commit mới nhất.

## Lưu ý
Đây là **một phiên bản triển khai V2 có thể tiếp tục phát triển**, không phải chứng nhận đạt tất cả tiêu chí Definition of Done. Đặc biệt chưa có bằng chứng từ Safari thật hoặc camera 3D chụp trong phiên kiểm thử. Không phát ngôn rằng các hạn chế chưa kiểm tra đã được giải quyết.

## Chạy lại kiểm tra
```bash
node len-chua-cau-an/tests/site-plan-smoke.mjs
```
Đối chiếu với CONCEPT-ARCHITECTURE.md và IMPLEMENTATION-SPEC.md trong cùng thư mục.
