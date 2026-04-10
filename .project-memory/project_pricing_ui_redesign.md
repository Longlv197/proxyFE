---
name: Redesign bảng giá site mẹ — trực quan như site con
description: TODO: bảng giá ServiceFormModal site mẹ cần hiện lãi/lỗ, %, tổng tiền, URL NCC. Tham khảo ChildServiceFormModal.
type: project
---

## Yêu cầu (02/04/2026)

Site mẹ form sản phẩm (ServiceFormModal) phần "Chế độ giá" → "Mốc giá theo thời gian" quá đơn giản — chỉ có input giá bán + giá vốn.

### Tham khảo site con (ChildServiceFormModal)

Site con hiện rất trực quan:
- **Lãi/lỗ** mỗi mốc: `+1.562đ` (xanh = lãi, đỏ = lỗ)
- **% so với gốc**: `+109% so với gốc`
- **Giá/ngày**: `1.438đ/ngày (-20%)`
- **Tổng**: `Tổng: 12.900đ (-14%)`
- Bảng quantity discount cũng hiện lãi/lỗ mỗi mức

### Cần làm ở site mẹ

1. Mỗi dòng mốc giá hiện: lãi = giá bán - giá vốn, % lãi, màu xanh/đỏ
2. Hiện URL NCC bên dưới dropdown thời gian (đã implement 02/04)
3. Quantity tiers table cũng hiện lãi/lỗ
4. Per_unit mode: hiện giá/ngày, tổng dự kiến

### Files

- `FE/src/views/Client/Admin/ServiceType/ServiceFormModal.tsx` — section "Chế độ giá" (~line 2200)
- Tham khảo: `FE/src/views/Client/Admin/ServiceType/ChildServiceFormModal.tsx`
