# Object Review Studio — duyệt từng đối tượng trước khi nhập dữ liệu

**Mở:** https://bdx0.github.io/html/bo-ho-ben-tre/object-review.html

## Trạng thái nguồn
- **CAD nháp:** 311 đối tượng vector số hóa từ ảnh minh họa, đơn vị pixel, hệ trục chưa được georeference và góc Bắc ảnh chưa được kiểm chứng. Tuyệt đối không suy ra GPS hoặc khoảng cách mét từ pixel.
- **OSM:** đọc geometry nguyên gốc từ \`scene.json\`, có EPSG:4326, vẫn là nguồn cộng đồng chưa khảo sát. Mặc định CAD và OSM đặt **cạnh nhau**, không xoay/ghép chồng khiến người xem tưởng là đã được căn chỉnh.
- **7 đối tượng ghi chú bổ sung:** thành kè, lan can, nền đất, trường, quán cà phê và hai lô đất trống. Một số chưa có footprint, tránh tạo tọa độ giả.
- CAD/OSM/SQLite nguồn giữ nguyên. Phạm vi Digital Twin hiện hữu 300m từ mép hồ vẫn không đổi.

## Hướng dẫn làm việc
1. Tại thanh đối tượng hoặc trực tiếp trên bản đồ, chọn **mặt hồ / đường bờ / thành kè / lan can / nhà / đường / cây / vỉa hè / mặt đất**. Các loại có thông số riêng, giá trị trống mang nghĩa **chưa đo**, tuyệt đối không lấy giá trị placeholder trong slider để nhập DB.
2. Chuyển CAD / OSM / So sánh đôi. **So sánh đôi là hai hệ dữ liệu tách biệt**, không phải overlay cùng tọa độ.
3. Chọn **✎ Sửa bờ** để hiệu chỉnh polygon CAD nháp. Kéo các đỉnh, nhấp đúp đường bờ để thêm đỉnh, ↶ để hoàn tác; không chuyển tọa độ pixel này thành GPS.
4. Chỉnh thông số hoặc để trống. Ghi chú; **Lưu nháp** tự lưu IndexedDB + dự phòng localStorage và tải bản sao JSON.
5. **✓ Duyệt trực quan** tạo thêm một sự kiện bất biến + tự tải toàn bộ lịch sử JSON. Có thể chọn phiên bản cũ để trở về dạng nháp mà không xóa sự kiện gốc. Trạng thái duyệt là \`visual_review_only_not_surveyed\`, không phải đo thực địa.
6. Để lưu bền vững qua nhiều thiết bị và lần xóa dữ liệu trình duyệt, gửi **file JSON đã xuất** để commit vào \`data/object-review/reviews/\`. Khi chạy build, file được replay vào SQLite riêng.

## Data pipeline
- \`scripts/build_object_review.py\`: đọc trực tiếp \`cad-gis-vector-data.js\` và \`data/scene.json\` (hoặc \`--scene\` khi deploy), xuất **\`data/object-review-base.json\`** và **\`data/object-review.sqlite\`**.
- Bảng SQLite: \`metadata\`, \`sources\`, \`object_types\`, \`objects\`, \`parameter_specs\`, \`review_events\`, \`approved_parameters\`.
- Toàn bộ object ID bất biến trong cùng một snapshot: \`cad:<layer>:<index>\`, \`osm-way-<id>\`, hoặc \`review:<landmark>\`. Nếu thay nguồn CAD theo phiên bản mới, phải version/migration và map ID; không xem ID số thứ tự là vĩnh viễn xuyên các bản export CAD.
- \`review_events\` lưu tất cả lần duyệt dưới event ID duy nhất và SHA256 của gói đã commit; build từ chối mâu thuẫn hoặc thông số ngoài biên.
- \`approved_parameters\` là **view dẫn xuất của các lần duyệt trực quan**, không phải bảng tọa độ/chiều cao thực đo.
- Không dùng \`catalog.sqlite\` làm sandbox review, vì nó là database canonical của dự án.

## Giới hạn bảo toàn
**Không có backend tài khoản nên duyệt trên trang tĩnh chưa thể tự đồng bộ lên GitHub.** IndexedDB có thể mất khi xóa dữ liệu web; bản tải JSON vẫn cần giữ. Mỗi lần lưu nháp/duyệt có tải bản sao giúp hạn chế mất dữ liệu. Khi file JSON đã được kiểm tra và commit vào repo, bản dữ liệu đó có lịch sử Git và được tái tạo qua CI.

## QA
\`python3 bo-ho-ben-tre/scripts/build_object_review.py\`

\`node scripts/test_object_review.mjs\` (yêu cầu Playwright + Chromium)

\`.github/workflows/smoke-object-review.yml\` kiểm tra SQLite integrity, dữ liệu nguồn không đổi, download bundle, IndexedDB sau reload và giao diện 1366×900, 390×844, 320×690.
