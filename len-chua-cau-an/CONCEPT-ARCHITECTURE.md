# HỒ SƠ CONCEPT KIẾN TRÚC — CHÙA AN LẠC VIÊN
Phiên bản: 1.0 • Ngày: 02/11/2026 • Loại: thiết kế ý tưởng cho thế giới 3D tương tác

> Trạng thái: ĐỀ XUẤT — CHƯA DỰNG LẠI CẢNH. Đây là hồ sơ định hướng nghệ thuật và không gian cho một ngôi chùa HƯ CẤU trong game, không phải hồ sơ thi công, hồ sơ kết cấu, hồ sơ PCCC hoặc một công trình có thật được đo đạc.

## A. Tuyên ngôn thiết kế
**“Bước qua tam quan, bước chậm lại.”** Một khuôn viên chùa Nam Bộ mộc mạc, trang nghiêm, hiên sâu, gió nhẹ và có các khoảng lặng. Đặt trải nghiệm chiêm bái và quan sát lên trên tính thắng thua. Không dựng một “sân game” nơi mọi vật thể đều đòi người chơi bấm nút.

Bốn giá trị: (1) trục nghi lễ rõ ràng; (2) tỉ lệ kiến trúc hợp lý; (3) cảnh quan điều hòa cảm xúc; (4) người và không gian ứng xử đúng mực.

## B. Cơ sở tham chiếu và giới hạn
- Tham chiếu kiến trúc chùa cổ Nam Bộ: Chùa Giác Lâm có bố cục chữ Tam gồm chính điện, giảng đường, nhà trai; chính điện một gian hai chái và hệ cột gỗ. Nguồn: Cục Du lịch Quốc gia Việt Nam, https://vietnamtourism.vn/index.php/tourism/items/259
- Lối hành lễ và ứng xử: hạn chế nhang khói, tôn trọng khu thờ tự, giữ tiếng nói nhỏ, không tự ý chạm tượng/thờ tự. Tham khảo: Vietnam News, https://vietnamnews.vn/life-style/expat-corner/1778088/temple-etiquette-keeps-visitors-in-sacred-harmony.html
- Chọn ngôn ngữ kiến trúc chủ đạo là chùa Phật giáo Bắc tông phổ biến trong khu vực Nam Bộ; không trộn mái, tượng Naga và họa tiết Khmer hoặc mô típ Trung Hoa tùy tiện. Đặc trưng chùa Khmer là một dòng kiến trúc khác, không phải bộ trang trí thay thế. Nguồn phân biệt: Cục Du lịch, https://vietnamtourism.vn/en/index.php/news/items/10615
- Các kích thước dưới đây là THÔNG SỐ THIẾT KẾ CHO GAME, cần thẩm tra riêng nếu chuyển thành công trình thực.

## C. Nhiệm vụ thiết kế và chỉ tiêu
- Đất giả định 64 m ngang × 56 m sâu, trục đối xứng chính Bắc–Nam; hướng vào chùa ở phía Nam (+Z), chính điện ở phía Bắc (−Z); gốc tọa độ (0,0,0) giữa sân.
- Quy ước 1 đơn vị Three.js = 1 m; X: trái/phải khi đứng ở cổng nhìn vào chính điện; Y: cao độ; Z dương: về cổng.
- 3 lớp: **Từ phố vào tam quan → Sân lễ trang nghiêm → Vườn thiền, hồ sen và hậu viện**. Mỗi lớp có một tốc độ di chuyển và mật độ âm thanh/NPC khác nhau.
- Mục tiêu trải nghiệm: trong 20–40 giây đầu nhìn ra trục chùa và chính điện; từ chỗ xuất phát có thể tiếp cận 5 hoạt động mà không xuyên vật thể; có ít nhất hai góc ngồi không bắt buộc tương tác.
- Ngôn ngữ màu: ngói đỏ nâu #88453F, gạch tàu #A76350, tường vôi kem #E5CEA6, gỗ trầm #58392F, đá xám #8D9287, lá #486B48, nước #527C84, ánh đèn #EAB676.

## D. Tổng mặt bằng và tọa độ quy hoạch
Tất cả tâm vị trí ở mặt phẳng X/Z. Kích thước là ngang × sâu (m), trừ khi ghi khác.

| Hạng mục | Tâm (X, Z) | Kích thước dự kiến | Vai trò |
|---|---|---|---|
| Ranh khuôn viên | (0, 0) | 64 × 56 | Hàng rào thấp, sân cỏ, không xuyên qua |
| Tam quan ba lối | (0, +25) | 12 × 3.5; cao ~7 | Cửa vào, điểm chuyển cảm xúc |
| Sân gạch chính | (0, +8) | 28 × 22 | Trục hành lễ và tập kết |
| Lư hương | (0, −3) | Ø 2.0; cao ~1.7 | Trước bậc chính điện, không chặn lối |
| Chính điện | (0, −16) | 20 × 14; nền +0.6 | Khối chính, hiên và chỗ lễ |
| Bậc lên chính điện | (0, −7.6) | rộng 7.5; 4 bậc × 0.15 | Chuyển tiếp mặt sân–hiên |
| Lối dốc bên hiên | (+12.5, −8.5) | dốc dài ≥7.2, rộng ≥1.5 | Tuyến thay thế bậc, mô phỏng tiếp cận |
| Gác chuông | (−20, +4) | 5 × 5; cao ~8 | Không tranh vai chính điện |
| Hồ sen | (+20, +5) | elip ~13 × 9 | Góc ngắm, thả hoa đăng |
| Cây bồ đề | (−20, −12) | bóng tán Ø 11–13 | Vòng ngồi và dải lụa nguyện |
| Hành lang tĩnh | (+20, −13) | 12 × 3 | Lối dạo ít người |
| Góc ghế đá | (+20, −16) | 5 × 4 | Nhìn về hồ, nghỉ không nhiệm vụ |
| Hậu viện/nếp nhà phụ | (−19, −24) | 8 × 5 | Nơi quét sân, chăm cây, giới hạn vào |
| Nhà trà/nhà khách biểu trưng | (+20, −24) | 8 × 5 | Chỉ mô phỏng, không lấn chính điện |

Sơ đồ quan hệ, KHÔNG theo tỉ lệ:

    BẮC (−Z)
    [Hậu viện]       [CHÍNH ĐIỆN]       [Nhà trà]
       [Bồ đề]     [hiên / bậc lên]     [Hành lang]
       [Gác chuông]   [LƯ HƯƠNG]        [Hồ sen]
                       [SÂN GẠCH]
                 [TAM QUAN / CỔNG]
    NAM (+Z) — điểm người chơi bắt đầu

Tuyến chính: tam quan → sân → lư hương → chính điện. Tuyến vòng: chính điện → gác chuông → bồ đề → phía sau → hành lang → hồ sen → sân. Không cho phép đường ngắn xuyên qua bàn thờ, hồ, thân cây và mái hiên kín.

## E. Khối tích và cấu tạo hình học dự kiến
### E1. Tam quan
Ba cửa có nhịp 5.2 m giữa + 2.4 m mỗi bên, mố cột và khoảng đệm còn lại; mái lợp ngói âm dương cách điệu bằng lớp ngói lặp; độ cong đầu mái tiết chế, phân biệt mũ mái phụ. Biển tên “CHÙA AN LẠC VIÊN” quay về phía tiếp cận. Cửa hai bên tiếp đón khách, cửa giữa không tạo hiệu ứng cổng VIP.

### E2. Chính điện
Giữ hình thái nhà gỗ Nam Bộ “một gian hai chái” theo tinh thần tham khảo, không mô phỏng sao chép di tích. Nền cao +0.6 m; bốn cột trụ chính nhấn nhịp kiến trúc; ba nhịp cửa mặt trước; hiên sâu 2.5–3 m. Mái dốc bốn mặt có bo góc cong nhẹ; mái phải có diềm, đòn tay, đường ngói và đua mái hợp lý. Tượng Phật bố trí trên bục có khoảng lùi, không để camera hoặc người đi xuyên tượng. Đèn nội thất ấm và dịu; không ánh nhấp nháy kiểu sân khấu.

### E3. Gác chuông
Khung gỗ 4 trụ, một mái chính có nét cong nhỏ; chuông đồng tại vùng nhìn rõ. Chuông chuyển động biên độ rất thấp; vị trí gõ có khoảng đứng an toàn. Không bắt người chơi “đập chuông để thắng điểm”.

### E4. Công trình phụ
Giảng đường/nhà trà chỉ tạo chiều sâu hậu cảnh ở giai đoạn đầu. Bất kỳ mặt bằng/khung chịu lực nào đều là biểu đạt trực quan trong game; không tuyên bố cấu kiện đủ chịu lực thực tế. Công năng tăng xá không được biến thành minigame làm phiền sinh hoạt.

## F. Cảnh quan và vi khí hậu
- **Sân:** gạch nung xen khe, độ biến thiên màu nhẹ; không tạo ổ gà gây cản trở điều khiển; trục lễ để thoáng.
- **Bồ đề:** gốc sần vừa phải, tán nhiều tầng, bóng lọc sáng; bệ ngồi tròn thấp đặt ngoài bán kính va chạm thân cây; lụa treo ở các nhánh có thể nhìn rõ.
- **Hồ sen:** bờ elip mềm, thấp; mặt nước có sóng nhỏ với phản quang tiết chế; nhiều lá, ít hoa, hoa đăng thưa; có viền an toàn và lối đi không cắt ngang nước.
- **Hành lang:** bóng râm dọc hiên 2–3 m, ít người, cây thấp và ghế đá để tĩnh tâm.
- **Đời sống:** lá lay động, chim về chiều, đèn thắp chậm, người quét sân; không có hiệu ứng lấp lánh liên tục.

## G. Ánh sáng, âm thanh, ba thời điểm
| Pha | Thị giác | Âm thanh / hành vi |
|---|---|---|
| Hoàng hôn | Ánh xiên ấm, bóng dài, mặt gạch ấm | Chim, gió, người dạo |
| Chạng vạng | Trời tím xanh, hiên và đèn bắt đầu sáng | Giảm tiếng nói, chuông thưa |
| Tối nhẹ | Nước phản chiếu, nội điện ấm, lối đủ sáng | Khoảng lặng, tiếng lá, côn trùng rất nhỏ |

Luôn ưu tiên khả năng nhìn rõ lối đi và giao diện; chế độ giảm chuyển động, tắt âm và tắt hiệu ứng rối. Không giả tiếng tụng kinh thật của một dòng truyền thừa cụ thể nếu chưa có tư liệu phù hợp và kiểm duyệt.

## H. Thiết kế trải nghiệm năm điểm
1. **Dâng hương:** lư trước chính điện; mặc định 1 nén, cho lựa chọn tượng trưng; nhân vật chắp tay và cúi đầu, không phát pháo sáng.
2. **Thỉnh chuông:** tương tác theo nhịp nhẹ, tiếng chuông ngân và âm nền hạ xuống; không đếm thành tích công khai.
3. **Gõ mõ/tĩnh tâm:** vẫn có nhịp 30 giây như phiên bản hiện tại, nhưng lời kết là “Tâm an / Đang tập trung / Cứ chậm lại”; số điểm kỹ thuật có thể giữ nội bộ để tương thích dữ liệu.
4. **Viết lời cầu an:** tối đa 120 ký tự, lưu tại máy; chọn treo lụa gần bồ đề hoặc hoa đăng hồ sen; tuyệt đối không khẳng định điều ước sẽ thành hiện thực.
5. **Một lời lành:** giữ tối thiểu 40 câu tích cực, diễn đạt như lời khích lệ, không gọi là tiên tri hay kết quả số mệnh.

## I. Hành vi nhân vật và phẩm chất không gian
- Tăng nhân: quét sân, tưới cây, đi tới khu nội viện, ngồi tĩnh tâm (tránh tạo hoạt động sai nghi lễ).
- Khách lễ: dạo chậm, nhường đường, dừng chắp tay, nghỉ ở ghế; gia đình và trẻ nhỏ cư xử phù hợp.
- Phân vùng: trong chính điện mật độ ≤ 4 NPC hiện hữu tại một thời điểm và tốc độ rất chậm; sân thoáng 8–16; góc thiền 0–2; vùng vườn/hồ 2–5.
- Tránh NPC đi qua lư hương, tượng, mép nước, hàng cột hoặc xuyên nhau; giữ khoảng trống trước nơi hành lễ.

## J. Góc máy và phân cảnh đánh giá
1. Từ ngoài cổng thấy mái chính điện theo trục.
2. Từ sân bên trái thấy gác chuông, hiên và chiều sâu hàng cột.
3. Từ ghế bên hồ thấy bóng nước và cây, không bị HUD che.
4. Từ bệ bồ đề thấy nắng xuyên tán và sân vắng.
5. Trong chính điện đủ trang nghiêm, không camera lọt xuyên tường/tượng.

## K. Quy trình nghiệm thu concept
- Khóa mặt bằng bằng bản đồ tọa độ trước khi dựng chi tiết; chụp ảnh top-down để kiểm tra xung đột.
- Review tỉ lệ người (1.65–1.75 m) cạnh cửa/cột/bậc; đảm bảo đường dạo không bế tắc.
- Kiểm duyệt mô tả và nghi lễ với người hiểu văn hóa Phật giáo Việt Nam trước khi công bố “chân thực”.
- Test điện thoại dọc, điện thoại ngang, iPad Safari, máy tính và gamepad.
- Chỉ đánh dấu **ĐÃ DỰNG** sau khi có màn hình thực tế và kiểm thử, không đồng nhất tài liệu thiết kế với trạng thái game.

## L. Các quyết định chưa khóa
- Tên hiển thị trong game đang là “CHÙA AN LẠC”; “AN LẠC VIÊN” là tên *concept đề xuất*, không tự đổi thương hiệu trước khi được duyệt.
- Vị trí giảng đường/nhà trai là lớp hậu cảnh; chưa mô phỏng hành lễ nội viện.
- Các kích thước là thước tỷ lệ cho mô hình, KHÔNG phải thiết kế kết cấu hoặc tiêu chuẩn tiếp cận đã được phê duyệt.
