# bdx0 / HTML Lab

Thư viện các trang HTML tương tác, được xuất bản tại **https://bdx0.github.io/html/**.

## Thêm một trang mới

1. Thêm file `.html` vào repo, ví dụ `ai-agent-demo.html` hoặc `experiments/radar.html`.
2. Chọn nhóm chuẩn trong metadata hoặc `_catalog.json`, rồi chạy `python3 scripts/build_catalog.py --root . --output /tmp/html-lab-catalog.json --snapshot catalog.js` và commit snapshot cùng trang.
3. Push lên nhánh `main`. GitHub Actions sẽ tự xuất bản **toàn bộ file HTML** (kể cả thư mục con) và tạo lại catalog JSON/JS.
4. Trang chủ **tự tìm thấy trang mới**, không cần sửa `index.html` hoặc workflow.

### Thông tin hiển thị trên trang chủ

Mặc định, tên trang lấy từ thẻ `<title>`, mô tả lấy từ `<meta name="description">`. Bạn có thể thêm thẻ trong `<head>` của trang:

```html
<title>Radar 3D</title>
<meta name="description" content="Mô phỏng radar tương tác.">
<meta name="catalog:category" content="Khoa học & Điện tử">
<meta name="catalog:tags" content="Radar,ESP32,3D">
<meta name="catalog:icon" content="📡">
```

Hoặc ghi đè tên, mô tả, danh mục, tags, icon, theme, thứ tự ưu tiên và parent trong **`_catalog.json`** mà không cần sửa trang con.

Các giá trị theme hỗ trợ: `cyan`, `violet`, `emerald`, `amber`, `rose`.

### Phân loại và nhóm dự án

Nhóm chính: AI & Phần mềm; Khoa học & Điện tử; GIS & Digital Twin; Thế giới 3D & Mô phỏng; Thiết kế & Sáng tạo; Trò chơi & Giải trí; Giáo dục & Luyện tập. Nhóm Khác dành cho trang chưa phân loại. Các tên nhóm cũ được chuẩn hóa trong builder.

Dùng `"parent": "du-an/index.html"` trong override (hoặc meta `catalog:parent`) để nhóm trang chức năng dưới mục chính cùng chủ đề. Tìm kiếm vẫn bao gồm trang chức năng; mọi URL giữ nguyên. Trang mới mặc định độc lập. Với cùng nội dung hoặc các phiên bản, đặt groupTitle và groupDescription trên trang đại diện, linkTitle để đặt nhãn từng phiên bản. Thẻ nhóm chứa tất cả liên kết, kể cả trang đại diện; danh sách có thể thu gọn.

## Cấu trúc

- `index.html` — trang thư viện, tìm kiếm và lọc theo chủ đề.
- `*.html` — các ứng dụng HTML độc lập.
- `_catalog.json` — metadata tùy chọn cho các ứng dụng.
- `catalog.js` — snapshot sinh tự động cho host tĩnh và mở bằng file://; cập nhật khi metadata hoặc trang thay đổi.
- `scripts/build_catalog.py` — tự tìm HTML và tạo JSON catalog.
- `.github/workflows/deploy-pages.yml` — tự động deploy GitHub Pages.

## Xem trên máy tính

Mở trực tiếp `index.html` dùng toàn bộ snapshot `catalog.js`. Để kiểm tra đầy đủ danh mục động, dùng web server nhỏ:

```sh
python3 scripts/build_catalog.py --root . --output catalog.json --snapshot catalog.js
python3 -m http.server 8000
```

Sau đó truy cập `http://localhost:8000`. File `catalog.json` do script tạo có thể xóa khi không dùng (trên GitHub Pages nó được sinh trong quá trình build).

## Lưu ý

GitHub Pages là website **công khai**, không đưa API key, mật khẩu hay dữ liệu riêng tư vào bất kỳ file được deploy nào.
