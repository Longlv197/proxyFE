---
name: Ẩn mọi thông tin NCC khỏi site con
description: BẮT BUỘC — mọi nơi hiện provider info (tên, code, URL, config) PHẢI có !isChild guard. Lộ NCC = lộ nguồn hàng.
type: feedback
---

Mọi thông tin nhà cung cấp (provider_code, provider_name, provider URL, api_config) **TUYỆT ĐỐI KHÔNG** hiển thị trên site con.

**Why:** Lộ tên NCC (proxy.vn, proxyv6.net...) = site con biết nguồn hàng → bypass mua trực tiếp → mất doanh thu. User phát hiện ngày 02/04/2026 khi thấy "proxy.vn" trong log xoay.

**How to apply:**
- FE: Mọi chỗ render `provider_code`, `provider_name`, `provider.title` → wrap trong `!isChild &&`
- BE: API response cho site con nên strip provider fields trước khi trả
- Khi tạo component/page mới có provider info → kiểm tra isChild TRƯỚC
- Rà soát: grep `provider_code|provider_name|provider\.title` trong views/
- **CHECKLIST BẮT BUỘC**: Sau mỗi thay đổi logic, TRƯỚC khi báo xong → rà soát files đã sửa + files liên quan xem có lộ provider info trên site con không. Không được bỏ qua bước này.
