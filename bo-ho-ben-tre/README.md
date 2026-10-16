# Hồ Trúc Giang / Bờ Hồ Bến Tre — Digital Twin (vùng 300m)

## N/E/S/W đồng bộ cho CAD/GIS và Model View (2026-10-16)

**Bốn hướng nhìn dùng chung:** `N` = Bắc ở trên (0°), `E` = Đông ở trên (90°), `S` = Nam ở trên (180°), `W` = Tây ở trên (270°). Đây là **góc xoay mặt bằng trên màn hình**, không phải camera đứng nhìn từ phía Bắc/Đông trong 3D. Nút hướng và mũi tên Bắc đều thay đổi, có thể quay về N nhanh. Bố cục mobile giữ nút bấm nhỏ gọn, không thêm drawer. Lựa chọn lưu tại localStorage `bdx0:truc-giang:view-direction-v1`; chuyển `cad-gis.html` ↔ `model.html` giữ nguyên, hai tab cập nhật thông qua `storage` event. Có thể override khi mở trang bằng query `?dir=north|east|south|west`.

- `map-orientation.js` chứa định nghĩa duy nhất `rotate(x,z)` / `unrotate(x,z)`: kinh tuyến tăng = +x Đông; vĩ tuyến tăng = +z Bắc; hướng 90° làm vector Đông quay thành hướng lên. Với Model View, mọi vị trí OSM WGS84 chuyển theo projection *và* reverse-projection tương ứng; pan một ngón, wheel zoom neo vị trí, hit-test các thực thể, lớp mốc kiểm chứng, và highlight bờ đều phải giữ địa lý chuẩn.
- `model.html`: thanh bốn hướng `#modelDirectionBar`, mũi tên `#modelNorthArrow`, `TrucGiangModelMap.getOrientation()/projectLocal()/invert()`; hình học 2D, lưới và vị trí ghim xoay cùng nhau. `shoreline-review.js` cũng xoay vector pháp tuyến để badge đoạn bờ nằm đúng phía.
- `cad-gis.html`: `#cadDirectionBar`, `#cadNorthArrow`, một SVG group xoay **chỉ cho hiển thị** quanh tâm bản vẽ. Khi click/kéo đỉnh edit sử dụng inverse `cadRotated.getScreenCTM().inverse()`; pan/zoom dùng CTM của SVG viewBox; nhãn CAD được phản xoay cho dễ đọc. Tọa độ bản vẽ `ring_image_pixels`, GeoJSON WGS84 *suy diễn*, DXF mét *danh nghĩa* và SQLite **không bị biến đổi**.
- **Giới hạn nguồn quan trọng:** CAD/GIS chứa vector số hóa từ **ảnh minh họa**, góc Bắc thật/GCP chưa xác minh. Bốn hướng chỉ thống nhất cách hiển thị, **không tạo ra độ chính xác georeference mà dữ liệu chưa có**. Model View dùng tọa độ OSM thực nhưng chính đường bờ OSM vẫn chưa khảo sát xác minh.
- `scripts/test_ben_tre.mjs` kiểm từng hướng, quy luật Đông/phải – Đông/lên – Đông/trái – Đông/xuống, phép chiếu ngược, zoom out/in, tính bất biến của CAD ring/GeoJSON/DXF, và chia sẻ hướng CAD → Model trên desktop/mobile. Các tests trên GitHub Actions vẫn cần quan sát kết quả chạy.


## Fix zoom-out · giữ hướng Bắc và tọa độ (2026-10-15)

- Khi zoom out bằng **hai ngón**, cờ `pinchGestureActive` duy trì cho đến khi nhả hết ngón. Ngón tay còn lại sau pinch không được âm thầm chuyển `viewPreset="top"` thành `orbit`. Chạm la bàn **N** trở về TOP Bắc lên trên, Đông sang phải.
- Thu phóng quanh vị trí chạm/midpoint bằng **raycast mặt đất y=0** trên camera Three.js, lấy hiệu giữa điểm thế giới trước/sau zoom; target GIS vẫn giữ `x=East,z=North`. Mỗi lần raycast buộc `camera.updateMatrixWorld(true)` vì sự kiện zoom có thể chạy trước render tiếp theo. Không cộng pan theo azimuth cũ, vốn không tương thích với chuyển đổi `scene.scale.z=-1`.
- Camera cho phép xa tới 1.250m nhưng fog cũ bắt đầu ở 690m và kết thúc ở 1.440m, khiến scene bị mờ/mất khi thu nhỏ: tăng fog lên **2.200–5.200m**, mặt đất mô phỏng lên **3.600×3.600m**. Không phóng to/biến dạng raster tự host; ranh giới nguồn ảnh vẫn theo bbox địa lý.
- Google Satellite Floor Plan thêm listener `bounds_changed` để vector OSM luôn dùng phép chiếu cập nhật khi Google zoom-out có animation.
- CI browser smoke kiểm tra zoom out/in nhiều vòng bằng wheel và nút +/-; PLAN zoom-out vẫn Bắc lên/Đông phải; mobile Chromium kích hoạt touch pinch thực và xác nhận chế độ TOP không bị mất. Chưa coi kiểm thử được xác nhận thành công khi chưa nhìn thấy GitHub Actions job hoàn tất.
- Chẩn đoán Debug: `cameraViewPreset`, `pinchGestureActive`, `sceneFogNear`, `geographicAlignment` để đối chiếu ảnh/screenshots lỗi.


## True North — canh la bàn GIS / 3D / Floor Plan / Satellite (2026-10-14)

**Đã sửa tận gốc lỗi hiển thị soi gương Đông–Tây trong chế độ TOP.** GIS/OSM/SQLite/annotation/field survey vẫn giữ nguyên hệ WGS84 và local GIS `x = East, z = North` (mét), không xoay dịch dữ liệu gốc. Three.js cần hệ thuận tay phải nên `scene.scale.z = -1`: `world X = East, Y = Up, Z = South` (`North = -Z`). Camera TOP dùng `camera.up = (0,0,-1)`, và toàn bộ vị trí camera/tâm nhìn/projection hotspots/review pins/field survey được chuyển chính xác qua dấu trừ ở Z. Do đó **TOP = Bắc địa lý lên trên, Đông sang phải** giống Floor Plan và ảnh vệ tinh thực, không phải la bàn từ cảm biến từ trường điện thoại.

- La bàn `#wbTrueCompass` có mũi tên **N** xoay theo camera 3D, hiển thị 0° khi PLAN; bấm la bàn để về góc nhìn TOP đúng hướng. Ở mobile, nó nằm dưới cụm điều khiển góc, không chiếm thêm một bảng lớn.
- PLAN giữ hệ `x = East`, `z = North`, canvas Y tăng xuống: Bắc lên trên, Đông sang phải. Raster được warp trong pipeline `EPSG:4326`, bbox `[W,S,E,N]`, góc ảnh pixel `NW` và cờ `north_up: true`; trình duyệt từ chối ảnh không có metadata định hướng đúng.
- Google Maps Satellite (khi người dùng tự cung cấp key) khóa `heading: 0`, `tilt: 0`. Các vector OSM được vẽ trực tiếp bằng `OverlayView.fromLatLngToContainerPixel`; lớp grid địa phương cũ không còn vẽ khi Google Satellite đang bật vì phép pan hai lớp trước đây không đồng bộ.
- Ảnh tự host OpenAerialMap/Sentinel raster: góc trên-trái là Tây-Bắc, texture dựng trên geobounds trong PLAN và 3D bằng cùng hệ tọa độ GIS, giữ nguyên attribution và độ phân giải nguồn.
- QA tự động: `scripts/test_ben_tre.mjs` đo tọa độ màn hình khi TOP để xác nhận **North screen Y tăng và East screen X tăng**, đo sai số chéo, scene mirror Z = -1 và hướng la bàn 0° trên desktop/mobile (320/390/landscape); có thể xem phép thử bằng `window.TrucGiangWorkbench.getAlignment()` hoặc bảng Debug `geographicAlignment`.
- Bước chưa kiểm chứng: đối chiếu thực địa hoặc bản đồ ảnh có tọa độ đo đạc để xác minh OSM shoreline và độ chính xác nguồn ảnh. Chỉ sửa phép hiển thị không chứng minh đường bờ nguồn đúng thực tế.


## Ảnh nền OPEN DATA tự host · PLAN + Three.js (2026-10-14)

- **Khi có raster hợp lệ, nền ảnh mở tự bật trong PLAN và 3D**; bấm **🌍 Ảnh mở** trên Floor Plan hoặc **🌍 Nền 3D** ở thanh công cụ (hoặc vào **☰ Công cụ** trên điện thoại) để bật/tắt. Đây là ảnh nền thật có tọa độ, không phải ảnh tạo sinh hay dữ liệu GIS được "verified". Các đối tượng và đoạn bờ OSM không đổi.
- Nguồn ưu tiên **OpenAerialMap v2 STAC** (\`https://api.imagery.hotosm.org/stac/search\`): xét ảnh bao đủ ô địa lý, asset RGB thực, chỉ nhận giấy phép **CC-BY-4.0 / CC-BY-SA-4.0 / CC0**, yêu cầu ít nhất 95% pixel hợp lệ. Chưa có chứng cứ một ảnh như vậy tồn tại tại Hồ Trúc Giang cho đến khi pipeline chạy; trường \`oam_intersecting\` và metadata ghi kết quả truy vấn.
- Nếu không tìm được ảnh OAM phù hợp, lấy **Copernicus Sentinel-2 L2A** từ Earth Search STAC, chọn granule mây thấp và ba dải red/green/blue, hiệu chỉnh biểu diễn RGB. **Độ phân giải Sentinel-2 thực 10m**, dù raster web 1024×1024; không suy luận bờ lồi/lõm centimet từ ảnh này. Ghi nguyên văn \`Contains modified Copernicus Sentinel data [year]\`, ngày chụp và giấy phép.
- \`bo-ho-ben-tre/scripts/build_open_imagery.py\` tạo \`data/imagery/basemap.webp\` và \`manifest.json\` (bbox \`[west,south,east,north]\`, source, acquired, native_resolution_m, license, source_url, attribution). **GitHub Pages deploy workflow** tạo **file ảnh trong \`_site\`**; ảnh được **host trên chính GitHub Pages**, không gọi tile Google/Esri khi xem, không chứa API key. Binary không được commit trong Git: file trong repository \`data/imagery/manifest.json\` chỉ là placeholder pending; bản triển khai là sản phẩm pipeline. Có thể chạy script tại máy của bạn với \`pip install rasterio numpy pillow requests\` rồi \`python3 bo-ho-ben-tre/scripts/build_open_imagery.py\`.
- Nếu API ảnh bị chặn hoặc không tìm được scene đủ hợp lệ, hiển thị trạng thái \`unavailable\` và giữ nền mô hình kỹ thuật OSM. Không lấy ảnh từ nguồn thương mại đóng hoặc giả lập ảnh vệ tinh. Trạng thái thực tế chỉ có thể xác nhận sau khi kiểm tra manifest tại URL GitHub Pages và ảnh đã tải.
- Hai tọa độ phải thống nhất: WGS84 geobounds → hệ XYZ local của dự án; North-up khi xem PLAN và Three.js (mặt phẳng x/+z). Luôn hiện ghi nguồn + độ phân giải thật khi bật ảnh. Ảnh không xác minh đường bờ OSM way 217484891 hoặc thay đổi dữ liệu SQLite.
- QA: smoke script có bộ ảnh **synthetic fixture chỉ trong Playwright** để thử zoom/pan/raster trong 3D và PLAN; fixture không được đưa vào dữ liệu thực. Thử trên màn hình 320, 390 và landscape.


## Ảnh vệ tinh Google Maps trong Floor Plan (tùy chọn · 2026-10-14)

- Trên trang 3D, chuyển sang **PLAN** rồi chọn **🛰 Google Satellite**. Trên điện thoại có thêm lối tắt trong **☰ Công cụ**.
- Lần bật đầu tiên, nhập **Google Maps JavaScript API key** của bạn. Bật **Maps JavaScript API** và **Billing** trên Google Cloud; giới hạn API key bằng HTTP referrer `https://bdx0.github.io/html/*` (và các môi trường dev cho phép). Không đưa API key thực vào GitHub. Trong trình duyệt, key được giữ tại `sessionStorage` của tab hiện tại.
- Ảnh Google hiển thị bằng `google.maps.Map({mapTypeId:'satellite'})` chính thức, **không** tải tile về, không ghép Google imagery thành texture Three.js. Lớp `wbPlanCanvas` vẽ dữ liệu OSM độc lập theo GPS nhờ `OverlayView.getProjection().fromLatLngToContainerPixel`, và đồng bộ zoom/kéo. Giữ nguyên Google copyright/branding và vùng bấm ở cuối khung.
- **Chỉ ở chế độ PLAN**: khi 3D hoặc SPLIT, hiển thị bản kỹ thuật OSM hiện có, tránh việc dùng ảnh Google như một non-Google-map texture/sai góc phối cảnh. Bật/tắt trở lại không thay đổi file SQLite, scene.json hay annotation.
- Khi chưa có key, khi Google API bị lỗi hoặc khi không có kết nối, Floor Plan vẫn hoạt động bình thường. Nút **🛰 Vệ tinh** cũ dùng Esri World Imagery trong hộp tham chiếu độc lập vẫn giữ nguyên. Đây không phải ảnh vệ tinh trực tiếp theo thời gian thực.
- Chưa kiểm chứng màu/tile Google trên tài khoản có key thực: test browser mặc định xác nhận UI opt-in, không tải Maps API trước khi người dùng đồng ý; QA cần thử key hợp lệ với giới hạn HTTP referrer rồi xem trực quan độ khớp lớp OSM và các ghim ở nhiều mức zoom.


## Mobile-first interface · 2026-10-14
- Main page `index.html` loads `mobile-layout.css` and `mobile-layout.js`: a compact header, one accessible menu for survey/satellite/scene controls/model/CAD/SQLite, and an opt-in inspector sheet. These files are **UI only**, not GIS source data.
- Mobile default: full 3D scene, bottom sheet collapsed, minimap hidden, axis gizmo collapsed. The three visible mode buttons remain 3D / PLAN / SPLIT; tapping `⌖ Góc nhìn` reveals the XYZ gizmo and TOP/N/E/ISO presets. Survey/satellite entry points remain accessible in the menu, even when their older HUD buttons are hidden.
- Mobile portrait SPLIT stacks WebGL on top and Floor Plan below; mobile landscape SPLIT places them side-by-side to keep the plan usable. Resize the Three.js drawing buffer **and the camera aspect** to match the displayed WebGL pane; CSS-only cropping makes the model seem to vanish.
- PLAN keeps annotations, existing raw OSM geometry and CAD/GIS links working. Neither local annotations nor shoreline previews mutate authoritative SQLite/scene data. Desktop panels and `warestack-3d.html` remain untouched.
- Mobile regression test `scripts/test_ben_tre.mjs` covers 320 px, 390 px and 844×390 landscape, responsive menu, collapsed XYZ, drawers and adaptive split. Changes to navigation/controls must update this test. Inspect screenshots before declaring visual QA complete.

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

## Mặt nước và đường bờ tham chiếu thực tế (Water V3)
- Mặt hồ vẫn có đường bao từ OSM water way `217484891`: **khoảng 16.840 m² (1,68 ha)**, biên dài khoảng **553m**, kích thước bao xấp xỉ 200 × 107 m (số liệu OSM, chưa phải bản đo thực địa).
- Khung hiển thị được làm mượt riêng (nội suy có giới hạn 1,7m), bản đồ OSM và SQLite **không đổi**; có cảnh báo/fallback nếu diện tích hình thể hiện lệch trên 3,5%.
- Vật liệu shader chuyển sang **xanh sẫm pha xanh trời**, gợn rất nhẹ và mô phỏng bóng cây ven bờ. Bóng phản chiếu này là hiệu ứng thị giác gần đúng, chưa phải ray tracing.
- Thu hẹp dải lát quanh hồ xuống khoảng 9 m thay vì 13,5 m, đưa cây xanh gần mép nước hơn. Phải khảo sát kích thước và vị trí cây trước khi xem đây là hiện trạng chính xác.
- Độ giống phụ thuộc điều kiện trời: ảnh hồ lúc nắng sáng xanh, ảnh râm/chiều tối khá đen; không dùng một mẫu màu để nhận là hiện trạng duy nhất.
- Đối chiếu ảnh thực tế trong [COMPARISON.md](COMPARISON.md), mở ứng dụng để thử camera ở góc thấp và trên điện thoại.

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
 
## Xác minh hình hồ ngay trên mặt bằng (4 vùng được đánh số)
- Vào [Model Data View](model.html#osm-way-217484891), mở Hồ Trúc Giang. Trên đường bờ hiện **4 đoạn màu cam**, có các nút ①–④ ngay trên hình; chạm vào số hoặc vùng tô đậm rồi chọn **Duyệt sửa**.
- ① **Bắc**: mũi đất nhô xuống nước → kiểm xem mép nước cần lõm thêm hay nới ra. ② **Nam**: đường bờ chéo và những góc đổi hướng → dịch song song thôi **không đủ**, cần ảnh/mốc địa lý để đặt điểm uốn. ③ **Đông**: cung bờ và chỗ bo góc Đông–Nam. ④ **Tây**: các mũi/góc bị tán cây che.
- Mỗi vùng có câu hỏi đơn giản, danh sách lựa chọn **Chưa rõ / Cần sửa / OSM có vẻ đúng**, ghi chú và thanh kéo thử ±25m. Cam = đoạn OSM **chưa xác minh**, nét xanh đứt = dịch thử mép nước bằng một phép biến dạng có giảm dần về hai đầu đoạn; **không phải proposed geometry chính xác**, không chỉnh trực tiếp OSM/SQLite. Giá trị 0m nghĩa là xem đúng ranh OSM hiện có.
- Bấm **Lưu nhận xét trên máy**: lưu tại trình duyệt hiện tại, trạng thái \`visual_review_only_not_georeferenced\`. **⇩ Xuất bản đánh giá** tải \`truc-giang-shore-review-YYYY-MM-DD.json\` gồm từng vùng, nhận xét và số mét dịch thử. Không phải xác nhận GPS; cần điểm đo độc lập trước khi chốt ranh hồ.
- Nếu có tọa độ thực địa, tiếp tục dùng **＋ Nhập mốc tọa độ** (ghi nguồn, ngày đo và sai số); file điểm đo xuất riêng. Mọi điểm tự nhập \`self_reported_unreviewed\` tới khi kiểm chứng chính thức.
- Model Data Viewer đã tăng zoom mặc định vào nước hồ trên mobile, dùng panel dưới tối đa 53dvh khi duyệt để không che hoàn toàn hình; smoke test Chromium kiểm 4 overlay, ± preview, điều hướng vùng, lưu/xuất nhận xét.

## Duyệt sửa hình hồ trực quan (4 đoạn OSM)
- **Trên 3D:** bốn đoạn bờ nghi vấn tô **cam** trực tiếp dọc biên nước, mỗi đoạn có chấm **1, 2, 3, 4**. Bấm chấm mở đúng phần cần bạn đối chiếu tại \`model.html?sector=...#osm-way-217484891\`.
- **Trên PLAN / SPLIT:** các cạnh OSM tương ứng được đánh cam cùng số mốc. Chạm số để mở form xác minh. Mốc 1=mũi đất bờ bắc, 2=bờ nam chéo, 3=cung bờ đông, 4=khúc bờ tây.
- **Trên Model Data View:** màu CAM = đường bao OSM hiện tại, màu XANH đứt nét = xem thử bờ dịch theo slider để hình dung nước nở/thu; chọn nhận xét và xuất JSON. Đây là **sơ đồ so sánh chưa được đo**, không thay SQLite/scene/OSM.
- Mốc GPS có nguồn và sai số được nhập riêng tại tab **Mốc kiểm chứng bờ hồ**; thông tin đánh giá, dữ liệu GPS và sửa polygon là ba tầng nghiệp vụ khác nhau.
- Hướng dẫn chi tiết: [SHORELINE_REVIEW_GUIDE.md](SHORELINE_REVIEW_GUIDE.md). Ảnh ngoài cửa hàng ven hồ do người dùng gửi trong chat không có GPS/hướng la bàn trong EXIF; chưa gắn điểm ảnh vào mô hình do thiếu thông tin vị trí.

## Model Data View (mô hình dữ liệu dễ hiểu) — cập nhật 13/10/2026
- **Mở trực tiếp:** https://bdx0.github.io/html/bo-ho-ben-tre/model.html
- Đây là chế độ dành cho người đọc hiểu đối tượng, không phải trình xem hàng/cột SQL: mặt bằng OSM North-up, danh sách hồ, đường phố đã **gộp các đoạn cùng tên**, công trình, công viên, 5 mốc địa điểm; chọn một đối tượng để thấy dữ liệu địa lý, tên, nguồn, mức tin cậy, ảnh liên quan, mức khảo sát và liên kết với đối tượng khác.
- Tải dữ liệu: \`catalog.sqlite\` → \`scripts/model_export.py\` → \`data/model-view.json\` → \`model.html\`. Dữ liệu schema \`ben-tre-semantic-model-v1\` chứa 535 thực thể, 857 liên kết tại snapshot hiện tại (con số thay đổi theo dữ liệu). **Không tạo geometry mới từ ảnh Google**. Tất cả thuộc tính thiếu được để là "Chưa có", không lấy chiều cao suy đoán làm chiều cao đo.
- Ghi rõ hai lớp: đối tượng vật lý OSM (bản đồ cộng đồng) và đối tượng logic dự án (mốc hồ, công viên, tượng, đài phun, hạng mục cần thu thập). Các liên kết ảnh là tài liệu **tham chiếu**, không khẳng định vị trí camera gốc.
- Đường bao hồ OSM way 217484891 **chưa đúng so với ảnh do người dùng cung cấp**, được gắn trạng thái \`conflict_unresolved\`; 4 hạng mục bờ bắc/mũi đất, bờ nam chéo, bờ đông cong, bờ tây chưa chứng minh đều hiển thị riêng. Bản đề xuất dựng sai đã bị loại, **0 bản sửa đường bao đã được kiểm chứng**.
- Trong chi tiết hồ có chức năng **＋ Nhập mốc tọa độ** để ghi tọa độ GPS/WGS84 từ đo thực địa hoặc dữ liệu GIS độc lập, sai số, nguồn, ngày đo, ghi chú; lưu **chỉ trên thiết bị** và có **⇩ Xuất mốc JSON**. Dữ liệu chưa xác minh không tự sửa SQLite/scene. Sau này maintainer cần xác minh giấy phép, độ chính xác, thứ tự đường bờ và kiểm tra tự giao polygon trước khi nhập geometry mới.
- Các nguồn tham khảo gồm OSM, ảnh người dùng chỉ để so sánh trực quan và Copernicus Browser (ảnh vệ tinh Sentinel-2 10m thường quá thô để đo đường kè/mũi đất nhỏ chính xác); Overture Maps Base water phần lớn dẫn xuất từ OSM nên không phải nguồn xác minh độc lập. Không khẳng định hiện đã sửa đúng mép nước.

## SQLite Explorer — xem dữ liệu database
**[Mở SQLite Explorer](sqlite.html)** để xem toàn bộ dữ liệu trực tiếp theo bảng của bản xuất SQLite. Giao diện mobile/desktop hỗ trợ: danh sách bảng cùng số dòng, duyệt cột, tìm kiếm, sort, phân trang, xem record đầy đủ, **SCHEMA (CREATE TABLE, PRIMARY KEY, FK)** và tải CSV theo bảng.

Nguồn dữ liệu: \`data/catalog.sqlite\` → Python \`scripts/build.py\` → \`data/sqlite-explorer.json\` → \`sqlite.html\`. Đây là **bản xuất read-only từ SQLite**, không phải kết nối SQLite trực tiếp trong trình duyệt, không hỗ trợ chạy SQL tùy ý hoặc chỉnh dữ liệu live. Có nút tải \`catalog.sqlite\` gốc để làm việc bằng công cụ SQLite riêng.

**Lưu ý về hình hồ:** Bản hình dáng "đề xuất" do AI dựng trước đó đã bị đánh giá sai nghiêm trọng và hiện **không còn được sử dụng**. Chế độ mặc định trở lại OSM way 217484891 và vẫn ghi rõ chưa xác minh. Floor Plan / Split / Axis vẫn hoạt động. Không nên lấy polygon OSM như bản khảo sát chính xác; cần điểm kiểm tra độc lập trước khi chỉnh lại.

## Floor Plan, trục tọa độ và hình dạng hồ — cập nhật trực tiếp
Bản HTML đã có **3D / PLAN / SPLIT** theo style Warestack 3D (trắng – xanh dương, panel kỹ thuật). \`PLAN\` là hình chiếu mặt bằng nhìn từ trên cao, bắc hướng lên, với đường phố/công viên/tòa nhà OSM và các mốc cạnh nước. \`SPLIT\` đặt mặt bằng bên cạnh renderer 3D; chạm mặt bằng để focus camera 3D.

- **Axis (X/East, Y/Up, Z/North):** bấm lên đầu trục hoặc TOP / N / E / ISO để chọn góc nhìn. Trên sàn 3D, Y là độ cao; tọa độ mặt bằng là X (đông), Z (bắc).
- **OSM gốc:** khôi phục polygon mặt hồ nguồn way \`217484891\`, giữ nguyên như trong \`scene.json\`.
- **Dáng đề xuất:** mô hình hình học tạm thời \`lake-shape.js\` dựa trên các đặc điểm do người dùng xác định: một mũi đất ở phía bắc làm mặt nước lõm vào; bờ nam chạy chéo; bờ đông cung lồi; tây-nam bất đối xứng. 12 điểm B01–B12 hiển thị trong PLAN.
- **Quan trọng:** đây là mẫu hình học đề xuất **chưa được đo thực địa, chưa có chuyển đổi pixel→GPS được xác minh**. Không sao chép dữ liệu bản đồ Google Maps vào cơ sở dữ liệu; cần kiểm chứng với khảo sát độc lập hoặc nguồn GIS được cấp phép trước khi dùng làm dữ liệu định vị chính thức.
- Khi chuyển Raw/Candidate, toàn bộ mặt nước, bờ kè, cây xanh và đài phun (đang là proxy) được dựng lại đồng bộ. Giá trị tọa độ nguồn SQLite và JSON không bị sửa. Xem bảng trong \`SHORELINE_IMAGE_ANALYSIS.md\`.

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


## CAD / GIS Floor Plan có thể chỉnh sửa (14/10/2026)

**[Mở CAD / GIS trực tiếp trên GitHub Pages](cad-gis.html)**. Trang này đã tích hợp vào thanh công cụ 3D, khung Workbench và Model Data View.

- 11 nhóm lớp nháp gồm: mặt nước, đường bờ, đường dạo, đường phố, công viên, khối mái công trình, tán cây, đài phun, quảng trường, điểm cần duyệt và OSM so sánh. Có 311 đối tượng được số hóa từ **ảnh floor plan AI được người dùng xem và chỉnh sửa**, gồm 259 ghim tán cây và 32 mái công trình chỉ mang tính minh họa, không phải đo thực địa.
- Chạm lớp để bật/tắt; bật **Chỉnh đường bờ** để kéo từng đỉnh hoặc nhấp đúp cạnh thêm đỉnh; Undo / Redo, lưu localStorage và khôi phục đường bao nháp.
- Xuất JSON candidate tương thích công cụ `build_cad_gis.py --candidate`, GIS GeoJSON, CAD DXF và SVG ngay trên trình duyệt.
- Vector truyền đến viewer dưới dạng dữ liệu JS nén ở `cad-gis-vector-data.js` (gồm 311 đối tượng), hoàn toàn riêng khỏi SQLite canonical, `scene.json` và OSM. GeoJSON và DXF xuất từ trang chỉ có tọa độ **xấp xỉ**, không phải lớp GIS có độ chính xác kiểm định. Khi người dùng duyệt xong mới cập nhật bản nháp CAD/GIS, còn địa hình chính thức cần GCP/nguồn đo có quyền sử dụng.

## Annotation: ghim trực tiếp những chi tiết 3D đang sai (13/10/2026)
- **Vào thẳng chế độ ghim:** https://bdx0.github.io/html/bo-ho-ben-tre/?annotate=1
- Hoặc vào 3D, nhấn **✎ Ghim lỗi trên Floor Plan**; trình xem chuyển sang PLAN. Chạm vị trí cần sửa; kéo ngón/chuột chỉ di chuyển mặt bằng, không tạo ghim.
- Nhập **loại lỗi, tiêu đề, mô tả hiện trạng sai / mong muốn đúng** rồi **✓ Lưu ghim**. Mỗi ghim có số thứ tự đỏ, tọa độ local X (Đông), Z (Bắc) theo mét và vị trí WGS84 *suy ra xấp xỉ*, **không phải GPS khảo sát**.
- Nhấn **☷ Số ghim** để xem/sửa/xóa ghi chú; chạm số đỏ trên bản đồ cũng mở đúng ghi chú. Có thể chọn **Ghim mới** để đánh dấu tiếp.
- **⇩ Xuất JSON** lưu ID, X/Z, lat/lon suy ra, mô tả và nguồn; **▧ Xuất ảnh PLAN** tải PNG mặt bằng với các ghim đánh số. Gửi **cả JSON và PNG** trong cuộc trò chuyện để xác định từng điểm cần sửa.
- **↑ Nhập JSON** khôi phục file trên thiết bị khác. Ghi chú lưu tại localStorage của trình duyệt, không tự đồng bộ giữa các thiết bị và có thể mất nếu xóa dữ liệu website / dùng chế độ ẩn danh. Giới hạn 150 điểm.
- Annotation **không ghi vào SQLite/scene.json/OSM**, không tự xác nhận hình học; chỉnh đường bờ vẫn yêu cầu bằng chứng khảo sát độc lập.

## Công việc tiếp theo
- Đối chiếu mặt hồ OSM với ảnh vệ tinh / đo thực địa, tách chính xác bờ nước–bờ kè.
- Nhập ảnh hiện trường được cấp phép, đo bề rộng lòng đường/vỉa hè và cao độ công trình.
- Phát triển các mesh LOD2 (landmarks/fountain/facades/trees), gắn mỗi mesh vào ID bền trong SQLite.
- Sửa mọi lỗi browser smoke, đặc biệt zoom mobile, resize, data failover, 2D fallback.

Dữ liệu bản đồ © OpenStreetMap contributors (ODbL): https://www.openstreetmap.org/copyright.
