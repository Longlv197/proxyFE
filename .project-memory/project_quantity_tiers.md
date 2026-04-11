---
name: Quantity Tiers - Chiết khấu theo số lượng
description: ĐÃ IMPLEMENT BE+FE. Fix 11/04 — quantity_tiers recalculate theo user markup (hiển thị + tính giá).
type: project
---

## Trạng thái: BE+FE hoàn chỉnh (11/04/2026)

### BE:
- `PricingService::getPrice()` nhận `$quantity` (default=1, backward compat)
- `applyQuantityTier()` — fixed price hoặc discount %
- `applyQuantityTierCost()` — cho giá vốn
- **Fix 24/03:** Tất cả 9 providers ở parent site giờ truyền `$quantity` + áp quantity tier cho giá vốn
- `buyForChildSite()` đã truyền quantity từ trước

### Fix 11/04 — quantity_tiers + user markup:
- **Bug:** quantity_tiers trong price_by_duration lưu giá gốc (admin set). Khi user có cost-based markup (Cấp 2a/2b/reseller default), cả hiển thị FE lẫn tính giá BE đều dùng giá gốc thay vì giá đã markup → user markup -10% mua 20+ proxy bị charge giá GỐC (cao hơn giá base!)
- **Fix hiển thị:** `applyUserPricing()` trong ProxyController — recalculate `tier.price = ceil(tier.cost × (1 + markup/100))`
- **Fix tính giá:** `PricingService::getPrice()` fixed mode — cùng logic recalculate trước khi gọi `applyQuantityTier()`
- **Method chung:** `PricingService::detectMarkupPercent($userId, $serviceType)` — detect Cấp 2a/2b/reseller, trả null cho Cấp 1/3/wholesale → không ảnh hưởng user thường
- **Guard:** `isset($tier['cost'])` — nếu tier không có cost thì giữ nguyên price gốc

### FE CheckoutModal đã có:
- Per_unit mode: quantity discount % → `priceAfterQtyDiscount`
- Fixed mode: nested `quantity_tiers` trong price option → `fixedQtyPrice`
- UI: strikethrough giá gốc, hint mua thêm để giảm giá

### Data format:
**Fixed mode** — nhúng trong `price_by_duration`:
```json
{ "key": "30", "value": 5000, "cost": 3000, "quantity_tiers": [
  { "min": 20, "max": 49, "price": 4500, "cost": 2800 },
  { "min": 50, "max": null, "price": 4000, "cost": 2500 }
]}
```

**Per_unit mode** — trong `metadata.quantity_tiers`:
```json
[{ "min": 20, "max": 49, "discount": 5 }, { "min": 50, "max": null, "discount": 12.5 }]
```

**Why:** Nhà cung cấp có chiết khấu theo SL. Cần linh hoạt per-provider.
