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
