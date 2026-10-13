# Duyệt 4 đoạn bờ hồ ngay trên mô hình 3D / Floor Plan

**Trạng thái: CHỈ ĐỂ ĐỐI CHIẾU, chưa có đường bao nước đã được đo và chấp thuận.**

- Link model 3D: https://bdx0.github.io/html/bo-ho-ben-tre/
- Link duyệt hình hồ: https://bdx0.github.io/html/bo-ho-ben-tre/model.html?sector=north_notch#osm-way-217484891
- Nguồn bờ nước gốc: OSM way [217484891](https://www.openstreetmap.org/way/217484891).
- Dữ liệu thực địa hiện **chưa có đủ mốc được xác minh** để thay đường bao.

## Cách biểu diễn

Trong mô hình **3D**: dải cam bám sát **các cạnh của đường bao OSM**, có bốn chấm **1–4** neo vào bờ nước tương ứng. Bấm chấm chuyển sang Model Data View để duyệt một đoạn cụ thể.

Trong **PLAN** và **SPLIT**: phần đường OSM tương ứng được tô **cam**, số của từng đoạn đặt sát bờ. Không tô màu cam toàn bộ nước — đó không phải vùng chắc chắn cần nạo vét hoặc sửa công trình.

Trong **Model Data View**: chọn ①–④ trên bản đồ hoặc thanh ở trên. Màu cam = đường OSM đang sử dụng; màu xanh đứt đoạn = **xem thử độ dịch ranh +/- mét do người xem kéo**, không tự động áp dụng. Bản dịch đơn giản chỉ để làm rõ "nước rộng ra hay hẹp đi", **không thể tự xác định mũi đất hay độ nghiêng phức tạp**. Chọn "Cần sửa / Có vẻ đúng / Chưa rõ", điền mô tả bằng lời rồi xuất đánh giá JSON. Không ghi kết quả thành geospatial polygon.

| Số | Khu vực OSM (ring index, 0-based) | Bạn đang xác minh gì? | Điều chỉnh có thể phát sinh |
|---|---|---|---|
| ① | 15–22, Bắc | Mũi đất từ công viên nhô vào nước sâu bao nhiêu; đường bờ lõm ở đâu? | Thêm/chỉnh các đỉnh để mặt nước khuyết đúng, không làm tròn cả bờ bắc |
| ② | 3–10, Nam | Bờ phía Lê Quí Đôn chéo thế nào; có điểm ngoặt nào? | Đổi góc và vị trí riêng từng đoạn, thêm đỉnh nếu ảnh/đo GPS chứng minh |
| ③ | 10–15, Đông | Bờ đông là cung bao lồi cỡ nào, bo về Đông-Nam ở chỗ nào? | Điều chỉnh cung phía đông, có thể sửa các điểm chuyển cong |
| ④ | 22,23,0–3, Tây | Bờ tây bị cây che có bao nhiêu khúc gồ/lõm? | Bổ sung các điểm gấp khi có ảnh/đo thực địa phù hợp |

**Các chỉ mục này chỉ định khu vực nghi vấn trên dữ liệu OSM, không khẳng định toàn bộ từng đoạn phải thay đổi.**

## Phân biệt 3 loại bằng chứng

- **Nhận xét trực quan**: "mũi đất cần lồi hơn", slider dịch thử 5–20 m. Lưu localStorage, xuất JSON, chưa xác minh GPS.
- **Điểm kiểm soát địa lý**: GPS / nguồn GIS độc lập, có tọa độ WGS84, ngày đo, phương pháp, sai số được người dùng khai báo. Lưu cục bộ, xuất JSON, chưa tự động áp dụng.
- **Ranh hồ đã được kiểm chứng**: chỉ được ghi vào nguồn dữ liệu 3D khi đủ điểm, kiểm tra topology, giấy phép dữ liệu, và phê duyệt thủ công.

## Ảnh chụp mặt đường được người dùng gửi ngày 13/10/2026

Tệp ảnh trong cuộc trò chuyện có kích thước **1536×1152**, metadata JPEG **không có GPS, hướng từ trường/compass, hoặc giờ chụp tin cậy**. Không gán nhầm ngày người dùng gửi là ngày người dùng chụp.

Quan sát trực quan: ảnh từ dưới mái che của một địa điểm ven phố; ở tiền cảnh có các xe đậu trên đường; bên kia đường là vỉa hè, cây bụi và tán cây ven hồ; mặt nước phía sau dải cây. Chưa có dấu hiệu độc nhất đủ xác định ảnh từ Hai Bà Trưng (nhìn nam) hay Lê Quí Đôn (nhìn bắc), cũng chưa đủ gắn chính xác điểm ảnh lên 3D.

Để xác minh ảnh: cung cấp ít nhất một trong số **vị trí Google Maps/cửa hàng/quán đang đứng**, hoặc **GPS vị trí chụp + góc la bàn**, tốt nhất kèm điểm nhìn thấy trên ảnh mà người dùng có thể chỉ ra. Không công khai nguyên bản ảnh người dùng hoặc metadata cá nhân trong repo nếu chưa được cho phép.

Dữ liệu ảnh khảo sát có thể nhập riêng qua công cụ khảo sát trên trang 3D; vị trí x/y/z trong thế giới mô hình **không** tự trở thành vị trí camera gốc nếu chưa được xác minh.
