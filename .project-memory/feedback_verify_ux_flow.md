---
name: Verify phải bao gồm UX flow, không chỉ data flow
description: Khi verify logic mới, PHẢI trace cả UX flow (admin thấy gì, hiểu gì, hành động gì) — không chỉ trace data path code tĩnh.
type: feedback
---

Verify logic mới PHẢI bao gồm cả UX flow — không chỉ data flow.

**Why:** Ngày 02/04/2026, implement ip_whitelist cho site con. Trace E2E code tĩnh xác nhận data đi đúng từ FE→BE→site mẹ → kết luận "an toàn". Nhưng bỏ qua: admin site con mở form KHÔNG BIẾT site mẹ yêu cầu IP whitelist → không set auth_type → khách mua không thấy ô nhập IP → proxy không dùng được.

**Why (case 2):** Ngày 07-08/06/2026, fix toggle residential không lưu. Lần 1 trace data path (undefined→null, BE merge) → đúng nhưng CHƯA ĐỦ: modal Sửa NCC có 2 nút lưu ("Lưu cấu hình Residential" trong tab + "Cập nhật" footer), user bấm footer → state cục bộ của section không vào payload → fix lần 1 vô tác dụng với user. Phải fix lần 2 (13.100): section expose buildConfig() qua stateRef → footer merge vào payload.

**How to apply:**
Checklist verify thêm 1 bước:
- ☐ **UX trace**: Mô phỏng admin/user mở trang → thấy gì → có nhận ra cần làm gì không → nếu không làm gì → hậu quả gì?
- ☐ **Nút nào user sẽ bấm?** Form có nhiều nút save/submit → kiểm tra TỪNG nút có lưu đúng data đang sửa không. State cục bộ ngoài react-hook-form là red flag.
- Đặc biệt quan trọng khi: thêm config mới, thêm flow bắt buộc, thay đổi behavior mặc định
- "Data đi đúng" ≠ "User biết phải kích hoạt"
