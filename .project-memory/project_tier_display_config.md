---
name: Tier display config — price_display_unit (Phase 1 DONE 17/04)
description: Phase 1 DONE — thêm field price_display_unit tách khỏi time_unit. Site mẹ/con đều có dropdown riêng. ProxyCard convert giá × hệ số theo đơn vị hiển thị.
type: project
originSessionId: b077dcf6-67f9-4f24-bb03-3f7f6b31f69d
---
## Trạng thái: Phase 1 DONE (17/04/2026, chờ push)

## Thiết kế chốt với anh Long

- Field MỚI `type_services.price_display_unit` ENUM('day','month') NULLABLE — tách biệt khỏi `time_unit` (đơn vị bán).
- NULL = dùng `time_unit` (backward compat, hành vi cũ nguyên vẹn).
- Admin mẹ + admin con đều có dropdown riêng — mỗi site tự chọn, không ép theo mẹ, không auto sync.
- ProxyCard convert giá theo công thức `price × (displayFactor / sellFactor)` với day=1, month=30.
- CheckoutModal, pricing logic, renewal — KHÔNG đụng (người mua vẫn theo đơn vị bán thật).

## Files đã sửa

**BE (4 file):**
- `database/migrations/2026_04_17_000001_add_price_display_unit_to_type_services.php` (mới, hasColumn guard)
- `app/Models/MySql/ServiceType.php` — fillable
- `app/Http/Controllers/Api/ServiceTypeController.php` — validate nullable|in:day,month ở store+update, lưu data ở cả 2
- `app/Http/Controllers/Api/ResellerController.php` — response include field (line 142 area)

**FE (3 file):**
- `src/views/Client/Admin/ServiceType/ServiceFormModal.tsx` — state `priceDisplayUnit`, load/submit, dropdown "Đơn vị hiển thị giá" trong block per_unit, 3 option (Mặc định/Ngày/Tháng)
- `src/views/Client/Admin/ServiceType/ChildServiceFormModal.tsx` — tương tự, dropdown "Hiển thị giá theo" trong header per_unit. KHÔNG auto sync từ mẹ (để con tự set)
- `src/app/[lang]/(private)/(client)/components/proxy-card/ProxyCard.tsx` — `sellUnit = time_unit`, `displayUnit = price_display_unit ?? sellUnit`, `displayRatio`, convert `headerPrice × displayRatio`, suffix theo displayUnit

## Giới hạn / chưa làm

- Fixed mode: form chưa có dropdown `price_display_unit` (chỉ hiển thị trong per_unit block). Fixed mode muốn đổi đơn vị hiển thị → chưa làm. Anh Long bảo "đơn giản trước", khi cần sẽ mở rộng.
- Endpoint list sản phẩm (ProxyController::listProxy) dùng Eloquent model serialization → tự include field do đã vào `$fillable`. Không cần sửa controller.
- SupplierProductController KHÔNG ép sync field này — đúng thiết kế "mỗi site tự quản".

## Chỗ còn hardcode "ngày" cần BE mở rộng (đã ghi từ đợt trước)

- `Admin OrderDetailModal.tsx:781/888/1279/1531` + `OrderDetail.tsx:827` — renewal history entry. Cần BE bổ sung `time_unit` trong response `orders`/`order_histories`.
- `RotatingProxyPage.tsx:174-182` — getDurationLabel plan (data đã có plan.time_unit, chỉ cần truyền).

## Phase 2 — per-site config toàn bộ thông số hiển thị (sau)

Anh Long: "site thì nó sẽ rộng hơn là cấu hình mọi thông số hiển thị sau, lưu ở bộ nhớ, khi nào có thời gian thì tôi sửa lại".

**Hướng:** Branding/display settings per-site — fallback default cho sản phẩm không set riêng.

**How to apply:** Khi làm phase 2, per-product override vẫn thắng per-site default (cascading).

## Phase 3 — Feature 3 site con thêm/xoá tier chiết khấu riêng (chưa làm)

Đã thảo luận: site con hiện chỉ nhập giá bán cho tier mẹ trả về, KHÔNG thêm/xoá tier mới được. Anh Long đồng ý cần tách minh bạch giá NCC vs giá bán cho user. Hoãn sang đợt sau, Phase 1 đã push trước.
