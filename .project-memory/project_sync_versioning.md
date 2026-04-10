---
name: Sync SP site con — versioning + audit log + revert
description: TODO LỚN. SyncProviderProducts chỉ check diff + báo Telegram, không tự ghi đè. Cần hệ thống versioning cấu hình.
type: project
---

## Yêu cầu (04/04/2026)

### Hiện trạng
- `SyncProviderProducts` command sync giá + custom_fields từ site mẹ → **ghi đè thẳng** vào DB site con
- Không có lịch sử, không revert được
- Admin site con không biết gì đã thay đổi

### Yêu cầu mới

**1. SyncProviderProducts chỉ check, không ghi đè:**
- So sánh SP site mẹ vs site con: giá, custom_fields, auth_type, max_ips, discount_tiers
- Nếu khác → báo Telegram chi tiết (SP nào, field nào khác)
- KHÔNG tự cập nhật DB

**2. Đồng bộ riêng (chủ động):**
- Admin site con bấm đồng bộ từng SP hoặc tất cả
- Hiện diff trước khi áp dụng (cũ vs mới)
- Admin confirm mới lưu

**3. Lịch sử đồng bộ (audit log):**
- Mỗi lần đồng bộ lưu log: ai, khi nào, SP nào, field nào
- Phiên bản cũ (snapshot) vs phiên bản mới
- Diff chi tiết giữa 2 phiên bản

**4. Revert:**
- Admin xem lịch sử → chọn phiên bản cũ → revert
- Revert cấu hình SP (metadata, giá, auth_type...)
- Revert cấu hình NCC (api_config)

### Scope ảnh hưởng

**BE:**
- `SyncProviderProducts.php` — đổi từ auto-sync sang check-only
- Tạo bảng `sync_logs` (MySQL) hoặc collection (MongoDB) — lưu lịch sử
- API mới: GET sync-diff, POST sync-apply, POST sync-revert
- Controller mới hoặc thêm vào SupplierProductController

**FE:**
- Trang admin mới: Lịch sử đồng bộ
- ChildServiceFormModal: nút đồng bộ hiện diff trước khi áp dụng
- UI revert: chọn phiên bản → preview → confirm

### Files liên quan hiện tại
- `BE/app/Console/Commands/SyncProviderProducts.php` — command sync
- `BE/app/Http/Controllers/Api/SupplierProductController.php` — checkByCode, import
- `FE/src/views/Client/Admin/ServiceType/ChildServiceFormModal.tsx` — form edit SP site con
- `FE/src/hooks/apis/useSupplierProducts.ts` — hooks

### 5. Admin bổ sung custom_fields cho đơn cũ
- Đơn hàng mua trước khi SP có custom_fields → thiếu tuỳ chọn (VD nhà mạng)
- Admin cần UI edit order metadata → bổ sung custom_fields → retry/reprocess
- Hoặc: admin manual resolve → nhập tuỳ chọn thiếu → gửi lại NCC

### Lưu ý
- Deploy site mẹ TRƯỚC site con
- custom_fields site con KHÔNG nên khác site mẹ (param gửi NCC)
- Giá site con có thể khác (admin set giá bán riêng)
