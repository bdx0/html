# Hồ Trúc Giang / Bờ Hồ Bến Tre — Digital Twin (vùng 300m)

## Mở và kiểm tra
- Trực tiếp: https://bdx0.github.io/html/bo-ho-ben-tre/
- Repo: https://github.com/bdx0/html/tree/main/bo-ho-ben-tre
- Bản UX tham khảo: https://github.com/bdx0/html/blob/main/warestack-3d.html
- Hướng dẫn agent: [AGENTS.md](AGENTS.md), [../AGENTS.md](../AGENTS.md).

## Ranh giới dự án
- Chỉ dựng trong phạm vi **300 mét tính từ mép hồ Trúc Giang** (đường bao nước OSM way `217484891`), không phải 300m tính từ tâm hồ.
- Dữ liệu OSM được lọc tại nguồn: đoạn đường cắt theo khoảng cách tới bờ; polygon công trình/công viên phải nằm hoàn toàn trong vùng. Đây là bản đồ cộng đồng chứ không phải khảo sát địa chính.
- Trước đây đề xuất toàn khu 750m, hiện đã bỏ phạm vi đó khỏi scene. Danh mục gốc 305 hạng mục và ảnh/giá vẫn được giữ để làm chứng cứ.

## Liên kết ảnh trực tiếp với các vị trí 3D (B2.1)
- SQLite có các bảng \`photo_hotspots\` và \`photo_hotspot_items\`, được chuyển thành \`scene.json.photo_hotspots\` qua script build.
- 8 mốc gồm: Toàn cảnh Hồ Trúc Giang, Đài phun nước, Tượng Trần Văn Ơn, Bờ bắc, Bờ nam, Công viên Trần Văn Ơn, Dãy phố phía đông và Khu UBND.
- Camera 3D chiếu tọa độ của các mốc thành nút 📷 nổi; người dùng chạm nút để xem ảnh, nguồn gốc, năm và độ liên quan ngay trong bottom-sheet. Chạm 3D vào đối tượng có liên kết sẽ mở cùng bộ ảnh.
- Các mốc là tọa độ đại diện cho đối tượng hoặc khu vực **không phải nơi đứng chụp ảnh**. Nguồn ảnh có thể mang tính toàn cảnh, tư liệu lịch sử hoặc tham chiếu chung; mối quan hệ này được ghi minh bạch trong DB.
- Hình ảnh từ nguồn bên ngoài không được đưa vào repo khi chưa có quyền. Ảnh lỗi tải trực tiếp vẫn mở được trang nguồn.

## Giao diện mobile
- Khi mở điện thoại, cảnh 3D chiếm phần lớn màn hình và bảng dữ liệu thu gọn ở cạnh dưới.
- Chạm nút **▧ / ▤ / ₫** để mở nhanh Ảnh / Danh mục / Giá. Chạm **Thu gọn bảng** để trở lại cảnh 3D.
- Kéo một ngón để xoay, chụm hai ngón để zoom và dịch chuyển, nút **+ / −** để chỉnh khoảng cách, nút **⌂** để về toàn cảnh. Giao diện có hỗ trợ safe-area.
- Có chế độ ngày/đêm, bật/tắt cây minh họa, minimap, Debug; kiểm thử Chromium desktop và mobile qua GitHub Actions.

## Đã thực hiện
1. Import blueprint v1 đầy đủ (305 yêu cầu, 90 góc khảo sát đề xuất, 16 nhóm và 16 vùng, nguồn dẫn).
2. SQLite làm nguồn dữ liệu: tạo bằng Python stdlib, chứa image metadata + liên kết tới từng yêu cầu, POIs và chi phí.
3. OSM importer truy xuất snapshot địa lý, vẽ đường/tòa nhà/mặt nước/công viên nếu có thật trong bản đồ cộng đồng; ghi nguồn xuất và timestamp.
4. `index.html` trình diễn WebGL/Three.js cục bộ, quay–zoom, pan minimap, bật/tắt cây minh họa, ngày đêm, bảng ảnh, yêu cầu, chi phí, debug. Có canvas 2D dự phòng.
5. CI build SQLite, scene JSON, validate 305/90, lint JS, Playwright desktop/mobile và GitHub Pages.

## Dữ liệu và mức tin cậy
- `data/catalog-blueprint-v1.json`: hồ sơ danh mục đầy đủ, giữ nguyên v1.
- `data/catalog.sqlite`: SQLite schema, normalisation, provenance và dữ liệu giá.
- `data/scene.json`: bản xuất cho trình duyệt; không phải database canonical.
- Bảng: `project_meta`, `sources`, `zones`, `requirements`, `survey_shots`, `objects`, `photos`, `photo_links`, `object_photos`, `cost_items`, `cost_quotes`, `reference_prices`, `osm_features`.
- Mỗi yêu cầu trong 305 mục có ít nhất một `photo_links` (ảnh hạng mục hoặc `context_only`). Không tự diễn giải các ảnh này là bản đo mặt đứng / proof hiện trạng 2026.
- Ảnh là *reference-only*, giữ metadata nguồn/author/year và link trang gốc. Không đóng gói ảnh có bản quyền lên GitHub; nếu máy chủ chặn hotlink, dùng trang nguồn.
- OSM water way `217484891`, CRS EPSG:4326. 3D viewer dùng quy đổi xấp xỉ sang local metres ở phạm vi nhỏ, không phải trắc địa chính xác; không tự nhận nhà hay chiều cao là đúng từng mét.
- Giá trong DB: `cost_items` là khung ngân sách dựng 3D, trường NULL vì chưa báo giá. `reference_prices` chứa một giá **gói thầu sửa chữa đài phun nước (công khai năm 2025)**; đây không phải giá trúng thầu/chi phí quyết toán, cũng không phải chi phí xây digital twin.

## Chạy build
```bash
python3 bo-ho-ben-tre/scripts/build.py
python3 bo-ho-ben-tre/scripts/build.py --osm
python3 -m http.server 8000
# http://localhost:8000/bo-ho-ben-tre/
```

Giữ `data/catalog-blueprint-v1.json` và `scripts/build.py` trong commit để tái tạo SQLite/scene. Nếu không có internet hoặc OSM thất bại, code tạo catalog đầy đủ và chuyển scene sang mode `illustrative_no_osm`; không âm thầm thay bằng dữ liệu giả không nhãn.

## Ảnh hiện trường cần bổ sung để tiến tới sát thực tế
- Các mặt nước / mép kè theo 4 hướng, dải lan can, vật liệu lát.
- Mặt đứng và mái của từng dãy nhà cạnh bốn đường bao quanh.
- Công viên Trần Văn Ơn và tượng nhìn 4 phía; đài phun nước day/night.
- Tree survey: vị trí, chủng loại, đường kính thân/tán, độ cao.
- Giao lộ, mặt cắt đường, hệ thống đèn, bảng hiệu, bãi xe.
- Mọi tệp nhận từ người dùng có thể gắn EXIF, mốc thời gian, GPS, hướng nhìn, tác giả và quyền sử dụng.

## Giai đoạn dựng cảnh v2 — nhận diện hồ
- Biên mặt nước lấy trực tiếp từ OSM, không phải hồ ellipse giả; khoảng 200×105 m, các đoạn lõm/bo góc được giữ lại.
- Dựng liên tục bờ kè, dải lối đi lát sáng, bồn cây, hàng lan can xanh, cây me/phượng tán rộng theo ảnh tham chiếu, vòi phun đa tầng.
- Sửa lỗi mặt nước bị thủng tam giác và sửa OSM đường thành các dải asphalt nằm ngang thay vì tường gai.
- Thêm dãy mặt tiền nhà ở bốn hướng theo tương quan đường thực. **Mặt đứng và chiều cao của các dãy nhà này là mô hình minh họa chưa khảo sát.**
- Snapshot screenshot desktop/mobile là yêu cầu nghiệm thu; không chỉ dựa vào report FPS.
- Nguồn đối chiếu ảnh: https://addflag.com/ho_truc_giang__4361 và https://triphunter.vn/places/ben-tre/items/ho-truc-giang; ảnh nguồn chỉ để xem tham chiếu.
 
## Xem vệ tinh và bổ sung ảnh khảo sát
- Nhấn **🛰 Vệ tinh** để xem ảnh vệ tinh khu vực Hồ Trúc Giang từ Esri World Imagery; có liên kết thay thế tới Google Maps vệ tinh nếu trình duyệt không hỗ trợ nhúng. Ảnh có thể được chụp vào thời điểm khác với hiện trạng.
- Nhấn **📍 Ghim ảnh**, chạm một vị trí trên mặt đất trong thế giới 3D (tối đa 300 m từ bờ hồ), tải ảnh JPG/PNG/WebP, nhập hướng từ Bắc 0–359°, ngày chụp và nội dung so sánh.
- Tất cả ảnh lưu trong IndexedDB ngay trên thiết bị, chưa đưa lên GitHub hoặc máy chủ. Xem/xóa bằng biểu tượng 📍 trong mô hình.
- Nhấn **⇩ Xuất ảnh** để tải gói JSON (gồm ảnh base64, vị trí, hướng chụp); người dùng có thể gửi gói này để nhập vào repo.
- Người quản trị kiểm tra giấy phép, tính nhạy cảm của GPS và ảnh, sau đó chạy:
  `python3 bo-ho-ben-tre/scripts/import_survey.py /path/to/ho-truc-giang-khao-sat-YYYY-MM-DD.json`
  `python3 bo-ho-ben-tre/scripts/build.py --osm`
- Kết quả tồn tại bền trong `data/surveys/manifest.json`, `assets/surveys/`, SQLite `field_surveys` và `scene.json.photo_hotspots`.
- Đối chiếu thật–giả và danh sách sai lệch: [COMPARISON.md](COMPARISON.md).

## Công việc tiếp theo
- Đối chiếu mặt hồ OSM với ảnh vệ tinh / đo thực địa, tách chính xác bờ nước–bờ kè.
- Nhập ảnh hiện trường được cấp phép, đo bề rộng lòng đường/vỉa hè và cao độ công trình.
- Phát triển các mesh LOD2 (landmarks/fountain/facades/trees), gắn mỗi mesh vào ID bền trong SQLite.
- Sửa mọi lỗi browser smoke, đặc biệt zoom mobile, resize, data failover, 2D fallback.

Dữ liệu bản đồ © OpenStreetMap contributors (ODbL): https://www.openstreetmap.org/copyright.
