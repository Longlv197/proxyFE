---
name: Tự verify kỹ trước khi báo xong
description: KHÔNG báo xong rồi mới tìm lỗi khi user hỏi. Phải trace + review toàn bộ TRƯỚC khi nói "chờ push".
type: feedback
---

**KHÔNG được** báo "chờ push" rồi khi user hỏi "có vấn đề gì không" lại tìm ra lỗi mới.

**Why:** Session 11/04 — mỗi lần user hỏi "chắc chắn không" đều phát hiện thêm bug: submit thiếu join(','), ResellerController cùng bug quantity_tiers, SyncSupplierProducts thiếu custom_fields check, auto-fetch không sync custom_fields. User frustration vì phải liên tục prompt kiểm tra.

**How to apply:**
1. Sau khi code xong → **TỰ trace e2e từng flow** trước khi nói "chờ push"
2. Grep tất cả nơi dùng cùng logic → fix đồng bộ (VD: applyUserPricing fix ở ProxyController thì phải check ResellerController)
3. Trace submit flow: FE gửi gì → BE nhận gì → validate gì → lưu gì
4. **Không mental execution** — đọc code thật, trace giá trị thật
5. Chỉ báo "chờ push" khi đã có bảng chứng minh cho MỌI flow liên quan
