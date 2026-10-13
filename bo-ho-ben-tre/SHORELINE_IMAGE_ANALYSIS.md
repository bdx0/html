# Phân tích hình dạng Hồ Trúc Giang từ ảnh người dùng (2026-10-13)

**Trạng thái:** tài liệu đối chiếu, CHƯA phải ranh nước đo chính xác hoặc georeferenced geometry.

Ảnh người dùng: \`IMG_2668.jpeg\` (Google Maps / Airbus) **1536 × 1073 pixel**. Chỉ dùng để phân tích; **không commit file ảnh hoặc 68 điểm trace của Google Maps vào public repo** khi chưa có quyền phân phối.

## Kết luận quan trọng về mặt nước

Đây là **một hồ kéo dài tây–đông, bất đối xứng, giống hình hạt đậu nằm ngang**:

1. **Bờ bắc có mũi đất nhô xuống nước** dưới khu "Bờ kè công viên bờ hồ". Nghĩa là *đất lồi* vào trong, *mặt nước lõm* vào giữa cạnh bắc (điểm #03); hai mép hai bên nổi trở lại ở #02/#04. Đây là "chỗ lồi lên" đặc trưng mà các phiên bản ellipse/smoothing bỏ qua.
2. **Bờ nam chạy chéo từ tây-bắc xuống đông-nam**, song song tương đối với tuyến Đường Lê Quí Đôn; không phải đáy gần ngang như polygon OSM hiện tại. Ở khoảng #09 còn có điểm đổi hướng nhỏ của ranh nước.
3. **Bờ đông là cung lồi dài**, từ #05 qua #06/#07 vào một góc đông-nam tròn nở ra #08.
4. **Bờ tây gồ/lõm không đều**, nối từ #01 xuống #12 rồi #11. Hai đầu hồ không đối xứng nhau.
5. **Đài phun nước nằm lệch về nửa phía đông trên ảnh**, không thể giữ giả định mesh \`makeFountain(0,0)\` là hiện trạng đúng.

Ảnh sáng lóa nửa phía tây là **phản chiếu trên mặt nước**, không phải mảng đất, đảo hay polygon riêng.

## Mốc đường bao: tọa độ pixel ảnh 1536 × 1073

Quy ước (x,y) từ góc trên-trái, +x sang phải, +y xuống dưới. Đều là ước lượng ảnh, sai số do ảnh/glare/tán cây có thể khoảng 10–30 px. **Không phải lat/lon hoặc tọa độ khảo sát.**

| # | x | y | Nội dung |
|---|--:|--:|---|
| 01 | 372 | 317 | Vai tây-bắc bo cong |
| 02 | 559 | 292 | Bờ bắc phía tây, mép nước nhô lên |
| **03** | **877** | **370** | **MŨI ĐẤT BỜ BẮC lấn sâu xuống hồ, vùng nước khuyết vào** |
| 04 | 1030 | 316 | Bờ bắc đông, mép nước quay lên sau mũi đất |
| 05 | 1286 | 380 | Góc cong phía đông-bắc |
| 06 | 1316 | 543 | Cung bờ đông, không phải đường thẳng |
| 07 | 1289 | 748 | Cung bờ đông-nam |
| 08 | 1182 | 839 | Góc tròn đông-nam, gần đường dạo và tiểu cảnh |
| **09** | **967** | **785** | **Điểm chuyển hướng nhỏ bờ nam-đông** |
| **10** | **720** | **745** | **Bờ nam chéo, gần Đường Lê Quí Đôn** |
| 11 | 415 | 611 | Khúc uốn tây-nam |
| 12 | 382 | 491 | Bờ tây bị cây che, không tuyệt đối thẳng |

## POI gắn ảnh

| ID | x | y | Nhãn tham chiếu |
|---|---:|---:|---|
| P01 | 1153 | 538 | Đài phun nước Hồ Trúc Giang |
| P02 | 868 | 336 | Bờ kè công viên bờ hồ (liên quan #03) |
| P03 | 716 | 308 | Bờ kè café |
| P04 | 620 | 716 | Cây đại thụ |
| P05 | 1030 | 861 | Cây Me Tây cổ thụ |
| P06 | 1000 | 245 | Hai Bà Trưng — đường bắc hồ |
| P07 | 1460 | 595 | Nguyễn Trung Trực — đường đông hồ |
| P08 | 848 | 850 | Đường Lê Quí Đôn — đường nam hồ |
| P09 | 175 | 355 | Trần Quốc Tuấn — phía tây hồ |
| P10 | 1299 | 854 | Tiểu cảnh/giao lộ đông-nam (nằm **ngoài** mặt nước) |

Ảnh có attribution 2026; **không suy ra ngày vệ tinh chụp từ năm copyright**.

## So sánh với geometry thực trong \`scene.json\`

- Water way OSM [217484891](https://www.openstreetmap.org/way/217484891), 25 đỉnh gồm 1 đỉnh đóng, gần 200 m theo đông-tây và 107 m theo bắc-nam.
- Diện tích OSM từ phép quy đổi địa phương khoảng **16.840 m²**, chu vi gần **553m**. Đây là thống kê OSM, chưa phải đo thực tế.
- OSM có sẵn **một chỗ lõm nhỏ ở bờ bắc**, nhưng **đường bờ nam trên OSM gần ngang**, trái với bờ nam chéo nổi bật trong ảnh. Không được tuyên bố OSM đã khớp chỉ vì có notch hoặc diện tích gần đúng.
- Pipeline trước chỉ làm mượt, giới hạn độ lệch diện tích 3,5%; tiêu chí đó **không kiểm tra đúng silhouette hay chỗ lồi/lõm**.
- Ảnh screenshot chưa có metadata georegistration, scale/tilt/heading chính xác. **Không thể chuyển pixel thành GPS chính xác** chỉ bằng đo từ ảnh này. Điểm gốc local model \`(lat 10.23861, lon 106.37814)\` không phải tọa độ của mọi điểm.
- Nghiêm cấm import 12 điểm pixel này thành lon/lat giả hoặc số hóa map ảnh Google vào WebGL repo; cần data survey/OSM độc lập có quyền tái sử dụng.

## Kế hoạch kiểm chứng

1. Đặt chế độ **top-down, North-up**, ẩn hết bờ kè, cây, nhà và vật liệu để đo đúng polygon mặt nước.
2. Kiểm thử hình khuyết bờ bắc (#02→#03→#04), trục bờ nam chéo (#11→#10→#09→#08), cung đông (#05→#06→#07) và góc cong #08. Không chỉ kiểm area/bbox.
3. Lấy 3–4 điểm control thực địa/GPS hoặc nguồn GIS độc lập đã cấp phép để georegister tài liệu đối chiếu; ghi rõ thời điểm dữ liệu.
4. Cập nhật water ring trong nguồn OSM hoặc lớp dữ liệu khảo sát được cấp phép, lưu provenance + confidence; **sau khi** ranh nước được xác nhận mới cập nhật offset kè, đường dạo, cây và vị trí đài phun.
5. Đối chiếu ảnh cùng góc camera/heading với screenshot, sau đó mới render vật liệu nước.

**Ảnh annotated PNG và sơ đồ so sánh** được cung cấp trực tiếp trong cuộc trò chuyện, không đóng gói cùng public GitHub Pages vì giới hạn quyền ảnh Google/Airbus.
