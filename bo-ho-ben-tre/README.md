# Hồ Trúc Giang / Bờ Hồ Bến Tre — Digital Twin B0/B1

## Mở và kiểm tra
- Trực tiếp: https://bdx0.github.io/html/bo-ho-ben-tre/
- Repo: https://github.com/bdx0/html/tree/main/bo-ho-ben-tre
- Bản UX tham khảo: https://github.com/bdx0/html/blob/main/warestack-3d.html
- Hướng dẫn agent: [AGENTS.md](AGENTS.md), [../AGENTS.md](../AGENTS.md).

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

## Công việc tiếp theo
- Đối chiếu mặt hồ OSM với ảnh vệ tinh / đo thực địa, tách chính xác bờ nước–bờ kè.
- Nhập ảnh hiện trường được cấp phép, đo bề rộng lòng đường/vỉa hè và cao độ công trình.
- Phát triển các mesh LOD2 (landmarks/fountain/facades/trees), gắn mỗi mesh vào ID bền trong SQLite.
- Sửa mọi lỗi browser smoke, đặc biệt zoom mobile, resize, data failover, 2D fallback.

Dữ liệu bản đồ © OpenStreetMap contributors (ODbL): https://www.openstreetmap.org/copyright.
