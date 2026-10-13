# Đối chiếu Hướng B với ảnh vệ tinh / ảnh thực tế Hồ Trúc Giang
Cập nhật: 2026-10-13.

## Phạm vi và nguyên tắc
- Hồ Trúc Giang (Bờ Hồ Bến Tre), tâm 10.23861 N, 106.37814 E.
- Hình học hồ chuẩn tham chiếu OpenStreetMap water way [217484891](https://www.openstreetmap.org/way/217484891).
- Chỉ chi tiết hóa tối đa 300 m **từ mép hồ**; đây không phải bán kính 300m từ tâm hồ.
- Vệ tinh: [Google Maps Satellite](https://www.google.com/maps/@10.23861,106.37814,19z/data=!3m1!1e3), [Mapcarta Satellite](https://mapcarta.com/W217484891), [Esri World Imagery](https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer). Nguồn vệ tinh có giấy phép, không tải lại thành texture gói public nếu không được phép.
- Ảnh nhìn từ trên cao **không phải** ảnh vệ tinh: https://addflag.com/ho_truc_giang__4361 và https://baodongkhoi.vn/phong-su-anh-tp-ben-tre-hom-nay-a59368.html
- Ảnh mặt đất: https://triphunter.vn/places/ben-tre/items/ho-truc-giang
- Hạn chế lịch sử: nhiều ảnh công khai là 2016–2019; đài phun nước có dữ liệu nâng cấp 2025 (https://vilight.vn/website/thi-cong-dai-phun-nuoc-ho-truc-giang-ben-tre/).

## Kết quả đối chiếu dựa trên ảnh và scene OSM hiện tại
| Đối tượng | Đánh giá | Lỗi / rủi ro | Việc tiếp theo |
|---|---|---|---|
| Biên nước | Nền đúng từ OSM | Dữ liệu OSM chưa phải bản đo trắc địa; hình cũ có thể sai nhẹ | So khớp shoreline ảnh vệ tinh và thực địa |
| Hình tỷ lệ | Hồ khoảng 200 × 107 m (bounding box) | Scene có góc phóng đại dễ làm sai cảm nhận | Camera mặc định + minh họa tỷ lệ |
| Lối dạo | Mô hình hóa dải kè | Thiếu từng đoạn vỉa hè, gạch, đường cong bồn cây | Ghim ảnh theo từng cạnh/lô, đo bề rộng |
| Cây bóng mát | Quá đồng đều so với ảnh | Thiếu cây cổ thụ tán lớn, độ phân bố thực | Chụp từng hàng cây, neo GPS/hướng |
| Đài phun nước | Có mô hình gần trung tâm | Hình thức năm 2025 khác ảnh cũ, chưa xác thực vị trí máy và as-built | Ảnh mới 4 góc + công trình nhà thầu |
| Tượng Trần Văn Ơn | Mốc phía tây hợp lý | Mesh chỉ là khối biểu tượng, không phải điêu khắc | Ảnh chính diện/nghiêng/sau + kích thước |
| Đường bao hồ | Tuyến đường OSM có dữ liệu | Width chưa đo, đường gom/vỉa hè có thể khác | Hướng ảnh theo Hai Bà Trưng/Nguyễn Trung Trực/Lê Quý Đôn/Trần Quốc Tuấn |
| Nhà phố | Sai lệch lớn nhất | Dữ liệu OSM chỉ có 16 polygon building trong 300 m sau lọc, trong cảnh có facade proxy ngẫu nhiên; không thể coi đây là từng căn thật | Trích footprint từ ảnh có bản quyền hợp lệ/OSM được xác minh; khảo sát mặt đứng |
| Công viên | Công viên Trần Văn Ơn phía tây, đúng khu vực | Bố cục tiểu cảnh chưa đúng; hồ sơ ảnh 2026 còn thiếu | Thu thập ảnh hiện trường định hướng |

## Cơ chế thu hồi sai khác
1. Người dùng bật **📍 Ghim ảnh**, chạm điểm trên mô hình; chọn ảnh.
2. Nhập hướng nhìn từ Bắc 0–359 độ, ngày chụp, ghi chú sai khác.
3. Ảnh lưu riêng trên thiết bị (IndexedDB), chưa gửi đi.
4. Người dùng chủ động **⇩ Xuất ảnh** để tạo bundle JSON có ảnh base64/định vị.
5. Maintainer xem và kiểm tra quyền trước khi chạy:
   \`python3 bo-ho-ben-tre/scripts/import_survey.py ho-truc-giang-khao-sat-YYYY-MM-DD.json\`
6. Import kiểm tra ảnh, giới hạn 300m từ polygon hồ, magic bytes, quyền công bố. Dữ liệu được lưu vào \`data/surveys/manifest.json\` + \`assets/surveys/\`.
7. Chạy \`python3 bo-ho-ben-tre/scripts/build.py --osm\`, xuất SQLite canonical (\`field_surveys\`, \`photos\`, \`photo_hotspots\`) và \`scene.json\`.
8. Kiểm thử WebGL desktop/mobile, duyệt ảnh/biểu tượng chọn đúng; sau đó đưa lên GitHub Pages.

## Vấn đề chưa giải quyết bằng ảnh vệ tinh
- Vệ tinh không cho biết chiều cao nhà, kiểu mặt đứng, gạch lát, kích thước bồn hoa nhỏ hay ngày thi công phun nước.
- Không suy vị trí máy chụp từ một ảnh đơn lẻ khi không có EXIF. Điểm ghim là **vị trí người dùng tự chọn trong scene**, sai số chưa đo.
- Ảnh chưa được cấp phép chỉ được tham chiếu qua liên kết nguồn; không gắn vào kho asset công khai.


## Kiểm tra mặt nước hồ — cập nhật 2026-10-13
- Từ hình học OSM: diện tích khoảng **16.840 m²**, chu vi khoảng **553m**, bề ngang/chiều dài bounding-box xấp xỉ 107 × 200m. Các con số này là ước lượng từ dữ liệu cộng đồng; một nguồn tham khảo mô tả hồ **gần 2 ha**. Chênh lệch không đủ để kết luận OSM sai nhưng cần đo từ tư liệu địa lý có giấy phép.
- Ảnh flycam thực tế https://addflag.com/ho_truc_giang__4361 cho thấy mặt nước xanh đen/pha rêu, phản chiếu bóng cây và phố; ảnh TripHunter https://triphunter.vn/places/ben-tre/items/ho-truc-giang vào lúc trời sáng cho mặt nước xanh lam/sáng hơn. Vì thế không nên dùng màu nước xanh ngọc cố định.
- Trước Water V3 shader cũ dùng hàm sin gây các vệt đều, như bề mặt sơn xanh; khối mặt nước thô 24 cạnh và dải lối đi màu be 13,5m làm thiếu cảm giác thực. Water V3 dùng shader tối-trong gợn yếu và phản xạ cây ở vị trí tương quan đường bờ, thay vì cố sao chép ảnh bên ngoài.
- Đường bờ render hiện làm mượt riêng theo OSM (không chuyển sang shape ellipse), kẹp sai lệch cực đại 1,7m từ đoạn gốc và đảo về gốc nếu diện tích thay đổi quá 3,5%. Giá trị nguồn trong scene.json giữ nguyên.
- Thu hẹp dải bờ rộng 13,5m xuống 9,2m; bóng cây chỉ là texture mô phỏng, không phải gương phẳng phản chiếu đúng tọa độ mắt/ánh sáng.
- **Giới hạn quan trọng:** vẫn chưa xác minh được đường bờ từng đoạn bằng ảnh vệ tinh Google ở cùng thời điểm; không khẳng định đây là bản sao hiện trạng 2026. Cần ảnh flycam/survey năm gần nhất, vị trí cây, kích thước bồn hoa để chốt.
- Kiểm thử: GitHub Actions desktop + mobile, xem screenshot và kiểm tra đối tượng `lakeGeometry` trong Debug chứa diện tích gốc/diện tích đã nội suy.
## Đối chiếu bổ sung — Google Maps Terrain / Raised Buildings (13-10-2026)

### Ba chế độ khác nhau, không được đồng nhất
1. **Google Maps \`terrain\`** (MapTypeId.TERRAIN): lớp nền mô tả địa hình vật lý, không phải mô hình từng công trình. https://developers.google.com/maps/documentation/javascript/maptypes
2. **3D/raised buildings trên vector maps**: vẽ footprint thành các khối nổi khi zoom gần, thường >=17, với khả năng tilt/heading. https://developers.google.com/maps/documentation/javascript/vector-map và https://developers.google.com/maps/documentation/javascript/cloud-customization/building-style
3. **Photorealistic 3D Maps**: mô hình bề mặt textured, phụ thuộc vùng phủ; không khẳng định có ở Hồ Trúc Giang khi chưa kiểm tra coverage riêng. https://developers.google.com/maps/documentation/javascript/3d/coverage
   - Trong Google Maps Android, '3D map details' cho dẫn đường có thể hiển thị khối nhà nổi ở khu vực chưa có 3D imagery. Đây là công nghệ hiển thị, không phải exportable dữ liệu 3D. https://support.google.com/maps/answer/3273406?hl=en
   - Google Maps 3D API chỉ hỗ trợ \`satellite\` và \`hybrid\`; không có tổ hợp \`terrain\` + photorealistic 3D dưới cùng một MapTypeId. Bản đồ terrain vẫn hữu ích để so địa hình.

### Kiểm toán phiên bản HTML hiện tại
Nguồn: \`data/scene.json\`, \`scripts/build.py\`, \`index.html\`; các con số tại snapshot Oct-2026:
- **1 polygon mặt nước** OSM way 217484891, local-bounds x=-100..+100m; z=-53..+54m.
- **159 đoạn đường** OSM (không phải 159 tuyến đường độc lập), **8 polygon công viên**.
- **16 OSM building-tag polygons**, trong đó một tag là tượng; ~15 building objects render. **0/16 polygon có \`height\` thực được nhập từ OSM**. \`building:levels\` chỉ hỗ trợ suy đoán số tầng x 3,1m; mặc định 7,5m cho trường hợp thiếu.
- **42 nhà phố được sinh minh họa bằng code** \`populateFrontages\`: 14 bắc, 14 nam, 8 đông, 6 tây. Tọa độ x,z, chiều rộng, hướng và chiều cao đều sinh từ các công thức mẫu, không phải footprint ngoài thực địa.
- Địa hình nền **mặt phẳng 990 x 990 mét cao độ cố định**. Không có DEM/DTM thực. Vì Hồ Trúc Giang nằm vùng địa hình thấp, điều này ít ảnh hưởng nhận diện bằng mắt hơn mật độ dãy nhà, nhưng không đạt tính năng Terrain.
- Ảnh, hotspots: 8 điểm ảnh tham chiếu SQLite; ảnh điền địa bàn thủ công được thêm qua gói khảo sát, không coi địa điểm ghim là pose máy chụp thực.

### Bảng đánh giá gap
| Tiêu chí | Google Terrain / Raised buildings | Mô hình bdx0 hiện tại | Mức ưu tiên |
|---|---|---|---|
| Địa hình/elevation | Thể hiện relief theo lớp terrain; nơi có dữ liệu 3D có surfaces | Nền phẳng; không có DEM | P2 cho visual, P1 nếu cần độ cao ngập |
| Nước/shoreline | Google imagery/OSM là hai nguồn khác nhau; kiểm tra thị giác riêng; không digitize Google | 1 polygon OSM, hình khá nhận diện | P1 kiểm tra các đoạn kè |
| Footprint nhà | Raised buildings dựa trên lớp geometry bên Google; coverage khác nhau | 16 polygon OSM, nhiều khối giả lập ngoài OSM | **P0** |
| Mật độ nhà phố | Đồ họa thực vùng nội thị khi có building coverage | 42 facade giả định, khoảng trống rất lớn | **P0** |
| Số tầng/chiều cao | Có hiệu ứng nâng khối tùy coverage; không export chiều cao | 0/16 chiều cao đo thật, mẫu 8–18,4 m | **P0** |
| Đường/công viên | Google nền hiển thị tương quan giao lộ/công viên | 159 OSM segments, 8 park polygons; chiều rộng đường là công thức | P1 |
| Cây lớn/bóng đổ | Vệ tinh/3D mesh tùy vùng phủ cho cảm nhận tán cây | Procedural spaced-every-N trees | P1 |
| Chi tiết mặt tiền | Raised buildings không đảm bảo có mặt tiền thật; photorealistic 3D mới có texture khi vùng phủ hỗ trợ | Khối nhà màu trơn, cửa sổ giả | P1 sau footprint |
| Đài phun và tượng | Ảnh hiện trường có tính thời điểm, Google imagery có thể cũ | Đã có mesh proxy chưa verified as-built | P1 |

### Hướng sửa có dữ liệu, tránh sao chép Google Content
- **Không scrape/trace/digitize Google Maps basemap, imagery, elevations hay 3D building geometry** vào SQLite hoặc WebGL: điều khoản Google Maps Platform hạn chế rõ việc tái tạo dữ liệu này. Nguồn tham khảo: https://cloud.google.com/maps-platform/terms
- Đối chiếu Google bằng việc mở ứng dụng gốc: [Google Maps Terrain](https://www.google.com/maps/@10.23861,106.37814,18z/data=!5m1!1e4), [Google Maps Satellite/3D](https://www.google.com/maps/@10.23861,106.37814,19z/data=!3m1!1e3) (bật Globe/3D nếu hỗ trợ), [Google Earth](https://earth.google.com/web/search/Ho+Truc+Giang+Ben+Tre).
- Bảo vệ tính pháp lý của dữ liệu dựng: footprint từ OSM/khảo sát gốc/ảnh flycam có quyền sử dụng, số tầng từ nguồn được cấp phép và quan sát thực địa; lưu \`source\`, \`date\`, \`license\`, \`confidence\`.
- **Nguồn dữ liệu xây dựng hợp lệ nên thử đầu tiên:** [Overture Maps Buildings](https://docs.overturemaps.org/guides/buildings/) cung cấp footprint toàn cầu ODbL từ OSM và các nguồn mở (bao gồm dữ liệu Google Open Buildings đã cấp phép). Lọc bbox và đối chiếu trùng lặp với 16 OSM polygon hiện tại, không giả định độ chính xác hay số lượng Bến Tre trước khi nhập. Dữ liệu [Google Research Open Buildings](https://sites.research.google/gr/open-buildings/) là một **bộ dữ liệu mở riêng biệt**, phát hành CC BY 4.0 hoặc ODbL (tùy điều kiện tuân thủ), không đồng nhất với dữ liệu tòa nhà trong Google Maps. Dữ liệu phát hiện từ ảnh đã cũ có thể không phản ánh năm 2026.
- **P0-1:** bổ sung footprint nhà thực hoặc đánh dấu \`missing\`, tuyệt đối không hiển thị 42 căn procedural như tòa nhà có vị trí thật; cho phép bật/tắt lớp \`illustrative\` để kiểm tra.
- **P0-2:** nhập chiều cao/số tầng và hướng trục từ đo ngoài thực địa hoặc nguồn được phép; giữ NULL thay vì mặc định 7,5m như thể là giá trị đo.
- **P1:** chỉnh đường, vỉa hè, bóng cây, công viên và mốc kiến trúc theo ảnh hiện trường có georeference; link photo hotspots vào đúng các đối tượng.
- **QA:** so bảng coverage và ảnh người dùng cung cấp theo cùng ROI/orientation (north-up / camera tilt), tách rõ vấn đề dữ liệu khỏi khác biệt phong cách render.

**Giới hạn xác minh:** chưa có ảnh chụp trực tiếp của Google Maps tại đúng tọa độ với lớp Raised buildings đã bật; không khẳng định mức độ phủ mô hình 3D của Google trong Bến Tre. Các giá trị thực đo được ở đây là kiểm toán scene hiện tại, không phải trích xuất geometry từ Google.
