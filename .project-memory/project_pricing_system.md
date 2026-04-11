---
name: Pricing System — 4 tiers + per_unit/fixed
description: ĐÃ DEPLOY. PricingService 4 cấp giá, Redis cache, per_unit mode, quantity tiers, site con sync. detectMarkupPercent() dùng chung.
type: project
---

## ĐÃ DEPLOY (20-24/03/2026, fix 11/04)

### 4 cấp giá (ưu tiên cao → thấp)

1. **Tier 3 — Fixed custom** (CustomPrice với giá cố định per user per product)
2. **Tier 2b — Custom markup** (CustomPrice với cost_plus per product)
3. **Tier 2a — Provider markup** (user_provider_pricing, markup per NCC per user)
4. **Tier 1 — Default** (price_per_unit + discount_tiers, hoặc price_by_duration)

Fallback giữa 2a và 1: **ResellerProfile.default_markup_percent** (markup mặc định cho tất cả NCC)

Site con KHÔNG thấy Tier 2a/2b hoặc provider info.

### 2 mode

- **per_unit**: `price_per_unit × duration`, hỗ trợ quantity discount tiers
- **fixed**: `price_by_duration[key]`, hỗ trợ nested quantity_tiers

### Kiến trúc

- `PricingService::getPrice($quantity)` — resolve tier + apply quantity discount
- `PricingService::detectMarkupPercent($userId, $st)` — detect cost-based markup (Cấp 2a/2b/reseller), null cho Cấp 1/3/wholesale. Dùng chung cho cả hiển thị (applyUserPricing) và tính giá (getPrice).
- Redis cache TTL 60 phút, invalidate on config change
- Site con sync pricing_mode + cost từ site mẹ
- FE: CheckoutModal hiển thị giá theo mode + discount

### Fix 11/04: quantity_tiers + markup
- quantity_tiers lưu giá gốc trong DB → phải recalculate khi user có markup
- Công thức: `tier.cost × (1 + markupPercent / 100)`
- Áp ở 2 nơi: hiển thị (applyUserPricing) + tính giá (getPrice)
- User thường (markupPercent=null) → giữ nguyên, không ảnh hưởng

### Files chính

- BE: `PricingService.php`, `CustomPrice` model, `custom_prices` table
- BE: `ProxyController.php` → `applyUserPricing()` (hiển thị theo user)
- FE: `CheckoutModal`, `ServiceFormModal`, `CustomPriceModal`
