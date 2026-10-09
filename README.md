# bdx0 / HTML Lab

Thư viện các trang HTML tương tác, được xuất bản tại **https://bdx0.github.io/html/**.

## Thêm một trang mới

1. Thêm file `.html` vào repo, ví dụ `ai-agent-demo.html` hoặc `experiments/radar.html`.
2. Push lên nhánh `main`. GitHub Actions sẽ tự xuất bản **toàn bộ file HTML** (kể cả thư mục con) và tự tạo `catalog.json`.
3. Trang chủ **tự tìm thấy trang mới**, không cần sửa `index.html` hoặc workflow.

### Thông tin hiển thị trên trang chủ

Mặc định, tên trang lấy từ thẻ `<title>`, mô tả lấy từ `<meta name="description">`. Bạn có thể thêm thẻ trong `<head>` của trang:

```html
<title>Radar 3D</title>
<meta name="description" content="Mô phỏng radar tương tác.">
<meta name="catalog:category" content="Điện tử & RF">
<meta name="catalog:tags" content="Radar,ESP32,3D">
<meta name="catalog:icon" content="📡">
```

Hoặc ghi đè tên, mô tả, danh mục, tags, icon, theme, thứ tự ưu tiên trong **`_catalog.json`** mà không cần sửa trang con.

Các giá trị theme hỗ trợ: `cyan`, `violet`, `emerald`, `amber`, `rose`.

## Cấu trúc

- `index.html` — trang thư viện, tìm kiếm và lọc theo chủ đề.
- `*.html` — các ứng dụng HTML độc lập.
- `_catalog.json` — metadata tùy chọn cho các ứng dụng.
- `scripts/build_catalog.py` — tự tìm HTML và tạo JSON catalog.
- `.github/workflows/deploy-pages.yml` — tự động deploy GitHub Pages.

## Xem trên máy tính

Mở trực tiếp `index.html` vẫn có mục Wi-Fi CSI dự phòng. Để kiểm tra đầy đủ danh mục động, dùng web server nhỏ:

```sh
python3 scripts/build_catalog.py --root . --output catalog.json
python3 -m http.server 8000
```

Sau đó truy cập `http://localhost:8000`. File `catalog.json` do script tạo có thể xóa khi không dùng (trên GitHub Pages nó được sinh trong quá trình build).

## Lưu ý

GitHub Pages là website **công khai**, không đưa API key, mật khẩu hay dữ liệu riêng tư vào bất kỳ file được deploy nào.
