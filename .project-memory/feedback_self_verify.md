---
name: Tự verify kỹ trước khi báo xong
description: KHÔNG báo xong rồi mới tìm lỗi khi user hỏi. Phải trace + grep TOÀN BỘ flow liên quan TRƯỚC khi nói "chờ push".
type: feedback
---

**KHÔNG được** báo "chờ push" rồi khi user hỏi "chắc chắn không" lại tìm ra lỗi mới.

**Why:** Session 11/04 — MỖI LẦN user hỏi lại đều phát hiện bug mới:
- Fix applyUserPricing → quên ResellerController cùng logic
- Fix custom_fields sync → quên nút sync thiếu auth_type/protocols/time_unit
- Fix check endpoint → quên FE hiển thị provider_value editable
- Fix submit → quên country join(',')
Tổng cộng 6+ lần user phải prompt kiểm tra lại. Root cause: fix từng điểm rồi báo xong, KHÔNG rà soát toàn bộ flow liên quan.

**How to apply:**
1. Sau khi code xong → **grep TẤT CẢ nơi dùng cùng logic** (VD: fix ở ProxyController → grep cùng pattern ở ResellerController, GenericBuyProvider, etc.)
2. **Trace e2e từng flow** từ API → FE → submit → BE → worker → đích
3. **So sánh site mẹ vs site con**: cấu hình site mẹ có gì → site con có đủ không → user mua có thiếu gì không
4. **Liệt kê TẤT CẢ field** cần sync/check, đối chiếu từng cái — không bỏ sót
5. **Test mental execution**: nếu admin bấm nút X → data đi đâu → lưu gì → hiển thị gì → submit gửi gì
6. Chỉ báo "chờ push" khi đã có bảng chứng minh TOÀN BỘ flow, không phải chỉ điểm vừa fix
7. **KHÔNG tự tin** khi chưa grep xong — confirmation bias là kẻ thù số 1
