# IMPLEMENTATION SPEC — REDESIGN CHÙA AN LẠC VIÊN (THREE.JS)
Phiên bản: 1.0 • Ngày: 02/11/2026 • Trạng thái: V2 ĐANG TRIỂN KHAI — theo dõi IMPLEMENTATION-STATUS.md

## 1. Vai trò và nhiệm vụ cho coder
Bạn là senior Three.js engineer, technical artist low-poly, UX engineer mobile Safari và gameplay developer. **Nhiệm vụ**: xây lại môi trường 3D theo hồ sơ CONCEPT-ARCHITECTURE.md; giữ hệ thống đang chạy và cải thiện tính chân thực kiến trúc. Không quảng bá rằng cảnh mới đã triển khai khi mới có spec.

Mã nguồn hiện tại: len-chua-cau-an/index.html (ES module, importmap Three.js CDN, thủ công hình học, WebAudio, 5 hoạt động, NPC, virtual dual analog, Gamepad API, localStorage, canvas share). Không thay thế bằng dự án framework hay bộ asset có bản quyền. Xuất bản chính: https://bdx0.github.io/html/len-chua-cau-an/; không tái tạo dự án Cloudflare Pages đã xóa.

## 2. Quy tắc bảo toàn
- Giữ một file index.html độc lập làm bản chạy: hình học tạo bằng mã, không import mô hình 3D/tranh/nhạc không rõ quyền; importmap Three.js đã có là ngoại lệ được chấp thuận.
- Giữ URL và khả năng chạy GitHub Pages, không làm hỏng root HTML Lab hoặc các dự án khác.
- Không xóa dữ liệu người dùng cũ: giữ localStorage key len-chua-cau-an-v1, định dạng name/incense/best/wishes/fortunes; khi mở rộng phải migration versioned và có fallback.
- Giữ hoạt động dâng hương, chuông, mõ 30 giây, cầu an tối đa 120 chữ và tối thiểu 40 lời lành; giữ ảnh chia sẻ 1080×1350, nhật ký, mute, bàn phím WASD/mũi tên/E, cảm ứng 2 cần + nút A và gamepad vật lý.
- Không sử dụng chỉ số khách mô phỏng làm thống kê người thật; không ép đăng nhập, giao dịch, quyên góp, quảng cáo hoặc dự đoán vận mệnh.
- Giữ cách chặn double-tap/pinch Safari *trong canvas và vùng điều khiển*, song không cản ô nhập, cuộn modal và chức năng phóng to hỗ trợ của hệ điều hành.

## 3. Hệ tọa độ và dữ liệu kiến trúc
- Đơn vị: 1 Three.js unit = 1 m. X hướng ngang; Y đứng; +Z phía tam quan / người chơi; −Z phía chính điện. Site x∈[−32,+32], z∈[−28,+28].
- Không tiếp tục hard-code rời rạc. Tạo const SITE_PLAN chứa id, kind, position, footprint, elevation, orientation, bounds, access, zone, detailLevel, interactiveId. Dữ liệu là nguồn duy nhất để sinh hình học, collision, waypoint và điểm tương tác.
- Các tâm mốc: gate(0,+25), courtyard(0,+8), incense(0,−3), hall(0,−16), bell(−20,+4), pond(+20,+5), bodhi(−20,−12), quietCorridor(+20,−13).
- Kích thước xem hồ sơ concept. Kiểm tra không chồng footprint; biên an toàn người đi ≥0.45 m ngoài vật cản; lối chính ≥2.2 m theo hệ game. Khoảng cách tương tác thường 1.8–2.6 m, nhưng chỉ kích hoạt khi có tuyến tiếp cận hợp lệ.
- Tách builder chức năng (có thể là nhiều function trong cùng HTML): buildSite, buildCourtyard, buildGate, buildMainHall, buildBellTower, buildPond, buildBodhi, buildQuietWalk, buildProps, populateNPCs.

## 4. Geometry & technical art (không tạo vật thể vô lý)
- Roof builder: 2–4 mặt mái hợp lý, các mặt gặp nhau liên tục tại đường nóc/góc giao; tránh mái cong dạng tấm lơ lửng, ngói xuyên nhau, đòn tay không có điểm đỡ. Mái có diềm, đầu hồi phù hợp; số ngói dùng InstancedMesh, dải màu nhẹ, LOD theo khoảng cách.
- Main hall: nền +0.6 m, bốn bậc cao 0.15 m, lối dốc mô phỏng bên hiên; mái và cột thống nhất tỉ lệ; 3 nhịp cửa nhìn thấy, hiên sâu 2.5–3 m. Phòng thờ bố cục tập trung, cấm xuyên qua tượng và bàn thờ.
- Gate: 3 lối cân đối có ray đỡ, khoảng thông cửa hợp lý; biển chữ đọc xuôi từ hướng vào; không render chữ bị lật do mặt sau.
- Bell: chuông có quai treo và dầm đỡ; khi gõ rung nhỏ có giảm chấn; trụ và xà không xuyên thân chuông.
- Pond: mặt nước theo đường bờ, vùng va chạm theo polygon/elip + margin; hoa đăng nổi theo Y tương ứng mặt nước, không lạc ra khỏi bờ.
- Bodhi: thân cây có nhánh chịu các dải lụa, lá nhiều lớp không tạo tường che camera; dây treo hợp lý.
- Vật liệu procedural dùng màu/roughness/normal nhẹ tự sinh bằng CanvasTexture; tiết chế texture kích thước và cấp phát, dispose đúng khi xóa đồ.

## 5. Cấu trúc scene graph và resource lifecycle
- Root groups: environment / architecture / landscape / props / NPC / interactives / VFX / UI3D. Đặt tên mesh/id để debug; static geometry không bị cập nhật mỗi frame.
- Cảnh vật tĩnh dùng geometry/material shared và InstancedMesh. Có camera frustum culling và khoảng tối đa cập nhật NPC xa.
- Mọi geometry/material/texture tạo theo lượt chơi hoặc lời cầu nguyện phải có hàm dispose. Không tạo canvas texture mới mỗi frame.
- Target ưu tiên: ≥30 FPS ổn định trên iPhone/iPad tầm trung, mục tiêu 60 FPS ở thiết bị khá; không hứa cố định mọi máy. Pixel ratio adapt 1–2, shadows có cấu hình low/medium, giảm hạt/đèn.
- Hạn chế đèn đổ bóng động, ưu tiên một nguồn chính + đèn ấm không shadow. Màn hình mất WebGL/CDN phải hiện thông báo thân thiện, không trắng toàn trang.

## 6. Đi lại, va chạm, camera, tương tác
- Sinh collision từ footprint và ranh giới cùng nguồn SITE_PLAN; thêm collider cho cột, bậc, lư, bờ hồ, cây, tượng, bàn thờ; sân/lối dốc là walkable surfaces.
- Đường nối waypoint: Gate → Court → Hall; Court ↔ Bell ↔ Bodhi; Court ↔ Pond ↔ Corridor ↔ Hall; có kết nối vòng; BFS/A* từ điểm spawn tới cả 5 điểm không vướng collider.
- Khóa camera qua tường/cột bằng raycast/spherecast hoặc giới hạn khoảng cách camera động; giữ damping khi xoay. Không cho camera clipping vào tượng hoặc mái.
- Spawn từ bên trong sân sau tam quan, hướng nhìn vào chính điện; không spawn trúng NPC.
- Giữ 2 analog: trái di chuyển, phải xoay; nút A tương tác. Nếu có physical Gamepad ưu tiên nhận input, khi ngắt trở lại virtual. Keyboard, drag-camera và nút tương tác giữ đầy đủ.
- Khi modal mở, xóa input đang giữ để tránh nhân vật đi tiếp; focus và scroll modal được khôi phục hợp lý.

## 7. NPC state machines (có đời sống)
- Các archetype: MONK_SWEEP, MONK_GARDEN, MONK_WALK, DEVOTEE_PRAY, DEVOTEE_REST, FAMILY_WALK, QUIET_VISITOR.
- Trạng thái chung: idle → pathfind → walk → arrive → action → idle. State transitions theo timer, không teleport trước camera; path có độ rộng và tránh vật thể/nhân vật bằng local separation.
- Tốc độ: trong điện 0–0.55 m/s; sân 0.65–1.05; khu vườn 0.4–0.8 (đây là tốc độ mô phỏng, không phải số liệu dân số).
- Giới hạn mật độ: trong điện 0–4; sân 8–16; tĩnh tâm 0–2; hồ/vườn 2–5. Khi thiết bị yếu, giảm cỡ đoàn mà không bỏ nhân vật cốt lõi (một sư quét sân, hai khách lễ).
- Không bubble chat ở chính điện, không dùng giọng đọc kinh giả giọng tu sĩ, trẻ em không chạy trong gian lễ.
- Bộ đếm khách phải ghi rõ “mô phỏng”, không ngụ ý lượt truy cập web.

## 8. Trải nghiệm hoạt động & dữ liệu
- Dâng hương: khu lư ngoài chính điện, mặc định 1 nén; giữ tùy chọn 3 nén như tính năng cũ nếu phù hợp; cúi đầu 1–2 giây; số lượng hiển thị hợp lý, tàn hương tự fade sau thời gian.
- Thỉnh chuông: giao diện nhẹ, không ăn mừng thắng; sound envelope dài, giảm ambient tạm thời, không lặp chuông bất ngờ khi người chơi ở chánh điện.
- Gõ mõ: 30 giây, tính chính xác nhịp nội bộ; phần báo cho người chơi là câu động viên, không “đứng hạng”.
- Cầu an: giới hạn 120 ký tự, sanitize DOM (textContent), lưu localStorage; tùy chọn ribbon/lotus; tái dựng trên scene ở lần chơi sau, không tăng bộ nhớ mãi mãi.
- Lời lành: 40+ câu, tránh khẳng định tiên tri, không đánh đồng với nghi thức chùa.
- Mỗi activity có states enter → interact → feedback → return; không khóa điều khiển sau khi đóng modal. Journal đọc/ghi tương thích dữ liệu cũ.
- Ảnh chia sẻ vẽ Canvas 1080×1350, ghi rõ “mô phỏng”, không tự động đăng hoặc thu thập lời cầu nguyện.

## 9. Ánh sáng, VFX, âm thanh
- 3 pha thời gian: hoàng hôn / chạng vạng / tối nhẹ, khoảng 3–4 phút vòng chuyển cảnh; màu hướng và ambient interpolated, không chuyển ánh sáng đột ngột.
- Đèn nội điện ấm, đèn lồng và hoa đăng có cường độ hợp lý; hạn chế point lights, bật đẹp trên desktop nhưng mobile vẫn chạy.
- Gió, chim, lá, nước nhỏ; âm trong điện thưa và tĩnh hơn ngoài sân. WebAudio chỉ khởi tạo sau user gesture; mute rõ ràng, không phát nhạc bản quyền.
- Preset Reduced Motion: giảm chuyển động lá, hạt, gợn nước, camera bob và cường độ tương phản; tôn trọng prefers-reduced-motion.
- Vật lý: hoa đăng trôi trong vùng hồ, lá rơi có gia tốc/chu kỳ hợp lý, lụa đu theo gió giảm dần, chuông có hồi phục về cân bằng.

## 10. UX, khả dụng, bảo mật
- Mobile-first 320×640, 390×844, iPad 800×600 và desktop 1440×900; HUD tránh safe-area của Safari, không che nút điều khiển hoặc lối tương tác.
- Chống accidental zoom trên vùng game, nhưng không vô hiệu zoom trợ năng ngoài vùng game; form text ≥16px để tránh tự phóng khi focus trên Safari.
- CSS không horizontal overflow, modal có scroll, focus/escape/đóng rõ ràng, hỗ trợ bàn phím, nhãn tiếng Việt.
- Không fetch dữ liệu cá nhân; toàn bộ lời nguyện và tên ở localStorage, có tính năng xóa nếu bổ sung trong tương lai; hiển thị rằng chia sẻ là tự nguyện.
- Tránh XSS với mọi tên/lời nguyện khi chèn vào DOM hoặc canvas; không chèn user text vào innerHTML.
- Khi tài nguyên CDN/WebGL lỗi, có fallback màn hướng dẫn thử lại thay vì trang trống.

## 11. Kế hoạch triển khai theo 5 milestone (mỗi milestone có bằng chứng)
| Mốc | Công việc | Gate nghiệm thu |
|---|---|---|
| M0 | Snapshot bản hiện tại, baseline đo FPS và kiểm thử 5 hoạt động | Không hồi quy tính năng |
| M1 | SITE_PLAN + top-down plan + đường đi/collision, giữ geometry cũ tạm | BFS đi được 5 điểm, không xuyên lư/hồ/tường |
| M2 | Tái dựng tam quan/chính điện/gác chuông/mái ngói theo tỉ lệ | 5 góc camera kiểm tra mái/cột/ngói, không vật thể lơ lửng |
| M3 | Hồ sen/bồ đề/hành lang + NPC theo zone + ánh sáng và âm thanh | NPC không xuyên vật thể; hai góc nghỉ yên tĩnh |
| M4 | UX nghi lễ, quality setting, accessibility, hồi quy Safari & gamepad | Tất cả checklist cuối và GitHub Pages thành công |

Không gộp một commit khổng lồ. Sau mỗi mốc: đo FPS mobile, chụp ảnh 3D thật, kiểm tra console, commit riêng, cập nhật changelog. Nếu gặp lỗi ở mốc sau phải có thể rollback an toàn.

## 12. Checklist kiểm thử bắt buộc
- Desktop Chrome/Firefox/Safari (nếu có), iPhone Safari và iPad Safari thật; thiết bị thật xác thực được hành vi đa chạm.
- 320×640 / 390×844 / 800×600 / 1440×900: cover, HUD, virtual controller, dialog không tràn ngang.
- Double-tap và pinch vùng gameplay không làm zoom kẹt; textarea và modal vẫn nhập/cuộn được.
- WASD/mũi tên, hai analog, E/A, Gamepad connect/disconnect, resize/orientation, mất focus.
- Đi từ spawn tới 5 hoạt động; không rơi xuống hồ, xuyên chính điện, cột, tượng, bệ cây.
- Dâng hương x1/x3, thỉnh chuông, nhịp mõ 30 giây, lời cầu an ribbon và lotus, 40+ lời lành.
- Reload giữ dữ liệu cũ, mở journal đúng, xóa/stale texture có dispose, Canvas 1080×1350, Web Share fallback.
- Không lỗi JS console, không 404 assets, CDN fallback; kiểm tra FPS và bộ nhớ sau 10 phút.
- Quan sát camera từ 5 góc kiến trúc, không mái xuyên cột, không biển chữ lật, không NPC đứng trên nước.
- CI GitHub Pages sinh catalog và đường dẫn truy cập ổn định. Chỉ đánh dấu checked nếu có kết quả thử thật.

## 13. Definition of Done
Một mốc chỉ hoàn tất nếu: mã được commit, scene chạy bằng Three.js thật (không stub), ảnh/screenshots từ browser thực, test tự động và kiểm tra tương tác, có so sánh trước/sau, có tóm tắt giới hạn và bản deploy GitHub Pages. Không gọi spec là “đã thiết kế xong game” khi các hạng mục còn là kế hoạch.

## 14. Prompt bàn giao cho coding agent
Mở CONCEPT-ARCHITECTURE.md và IMPLEMENTATION-SPEC.md, đọc toàn bộ index.html hiện tại. Phân tích các phụ thuộc và lập bảng mapping từ SITE_PLAN sang scene, collision, navigation, interaction. Thực hiện tuần tự M0→M4, mỗi mốc có commit, ảnh thực tế và checklist. Ưu tiên đúng kiến trúc Nam Bộ và di chuyển thông suốt hơn nhiều vật trang trí. Không xóa phần đang hoạt động, không phá GitHub Pages, không deploy Cloudflare Pages. Báo cáo rõ tính năng nào mới ở mức concept và tính năng nào đã code.
