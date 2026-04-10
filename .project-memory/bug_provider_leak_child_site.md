---
name: Lộ thông tin NCC trên site con
description: BUG NGHIÊM TRỌNG — site con hiển thị provider_code (tên NCC như proxy.vn) trong log xoay proxy + log đơn hàng. Đã fix FE, cần rà soát BE.
type: project
---

## ĐÃ FIX FE (02/04/2026)

Site con hiển thị `provider_code` (tên NCC: proxy.vn) trong:
- Log xoay proxy (OrderDetail.tsx — user view)
- Log đơn hàng timeline (OrderDetailModal.tsx — admin view)
- Log gia hạn (AdminHistoryLogPanel)
- Log xoay admin (ItemLogPanel)

**Fix:** Thêm `!isChild` guard trước khi render provider_code. User view xóa hoàn toàn.

## CẦN RÀ SOÁT THÊM

1. **BE API** — nên strip `provider_code`, `provider_name` khỏi response khi `is_child = true`:
   - API log xoay proxy
   - API log đơn hàng
   - API order history logs
   - Bất kỳ endpoint nào trả context chứa provider info

2. **FE rà soát toàn diện** — grep `provider` trong toàn bộ views, đảm bảo mọi chỗ hiện provider info đều có `!isChild` guard

**Why:** Lộ tên NCC = lộ nguồn hàng → site con có thể bypass mua trực tiếp.
**How to apply:** Mọi thông tin NCC (tên, code, URL, config) PHẢI ẩn khỏi site con ở cả FE lẫn BE.
