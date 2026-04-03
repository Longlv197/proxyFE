---
name: IP Whitelist Sync — site con → site mẹ
description: Flow ip_whitelist khi mua và khi xoay proxy, sync giữa site con và site mẹ — bug đã fix 03/04/2026
type: project
---

## Vấn đề (03/04/2026)

User site con thêm IP whitelist sau khi mua proxy xoay → ip_whitelist chỉ lưu trên order item site con, **không sync lên site mẹ** → khi site mẹ xoay proxy, NCC không nhận được IP → proxy xoay không đúng IP.

## Nguyên nhân gốc

1. **Lúc mua**: user thường không nhập IP (sản phẩm rotating không bắt buộc ip_whitelist lúc checkout)
2. **Sau khi mua**: user thêm IP qua `PUT /order-items/{key}/ip-whitelist` → `ProxyKeyController::updateIpWhitelist()` chỉ lưu local, không sync lên site mẹ
3. **Lúc xoay**: site mẹ `AutoRotateProxies` → `DefaultHandler::rotateProxy()` → `rotate_params` đọc `ip_whitelist` từ order item site mẹ → **null** → không gửi param `whitelist` cho NCC

## Fix đã deploy

### 1. Sync ip_whitelist site con → site mẹ
- `ProxyKeyController::updateIpWhitelist()` — sau khi save local, nếu `is_child` → gọi `SupplierService::updateIpWhitelist(provider_key, ips)`
- `SupplierService::updateIpWhitelist()` — `PUT /order-items/{key}/ip-whitelist` lên site mẹ
- `ResellerController::updateIpWhitelist()` — site mẹ nhận, tìm order item theo `provider_key`, lưu ip_whitelist

### 2. GenericOrderProcessor hỗ trợ `mode: "both"`
- Trước: `ip_whitelist.mode` chỉ chấp nhận `"on_buy"` để gửi IP khi mua
- Sau: chấp nhận cả `"on_buy"` và `"both"` → gửi IP cả khi mua lẫn khi xoay
- Config provider cần đổi `"mode": "on_rotate"` → `"mode": "both"` nếu muốn gửi IP cả 2 lúc

## ip_whitelist.mode giải thích

| Mode | Gửi IP khi mua | Gửi IP khi xoay |
|---|---|---|
| `on_buy` | ✅ (qua GenericOrderProcessor Layer 5) | ❌ |
| `on_rotate` | ❌ | ✅ (qua rotate_params) |
| `both` | ✅ | ✅ |

**Lưu ý**: "gửi IP khi xoay" phụ thuộc vào `rotate.rotate_params` có entry `field: "ip_whitelist"` — `mode` chỉ ảnh hưởng lúc mua.

## Flow đầy đủ sau fix

```
User site con thêm IP whitelist
  → PUT /order-items/{key}/ip-whitelist (site con)
  → Lưu order_item.ip_whitelist local ✅
  → SupplierService::updateIpWhitelist(provider_key, ips)
  → PUT site_mẹ/order-items/{provider_key}/ip-whitelist
  → ResellerController tìm item theo provider_key → lưu ✅

Site mẹ xoay proxy (AutoRotateProxies):
  → DefaultHandler::rotateProxy() → rotate_params
  → field: "ip_whitelist" → đọc từ order_item ✅
  → gửi param whitelist=1.2.3.4 cho NCC ✅
```

## Files liên quan

- `ProxyKeyController.php` — endpoint update ip_whitelist + sync site con
- `SupplierService.php` — `updateIpWhitelist()` gọi site mẹ
- `ResellerController.php` — `updateIpWhitelist()` nhận sync từ site con
- `GenericOrderProcessor.php` — Layer 5 ip_whitelist mode check
- `DefaultHandler.php` — `rotateProxy()` + `rotate_params` đọc ip_whitelist
- `AutoRotateProxies.php` — worker xoay, site con chỉ poll `getProxyCurrent`
- `routes/api.php` — route PUT trong reseller group
