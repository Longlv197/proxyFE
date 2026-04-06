---
name: IP Whitelist Sync — site con → site mẹ
description: Flow ip_whitelist khi mua và khi xoay proxy, sync giữa site con và site mẹ — bugs đã fix 03-06/04/2026
type: project
---

## Bug 1: Sync ip_whitelist sau khi mua (03/04/2026)

User site con thêm IP whitelist sau khi mua → chỉ lưu local, không sync lên site mẹ → xoay proxy không có IP.

**Fix**: `ProxyKeyController::updateIpWhitelist()` → gọi `SupplierService::updateIpWhitelist(provider_key)` → site mẹ nhận qua `PUT /reseller/order-items/{key}/ip-whitelist`.

## Bug 2: Provider cũ không lưu ip_whitelist vào metadata (06/04/2026)

Site con gửi `ip_whitelist` khi mua → `ResellerController::buyProxy()` truyền `$dataBody['ip_whitelist']` → nhưng provider cũ (`ProxyVNProvider`, `HomeProxyProvider`...) **không lưu ip_whitelist vào order.metadata** (chỉ `GenericBuyProvider` có logic này).

**Fix**: `ResellerController::buyProxy()` sau khi `$provider->buy()` → ghi `ip_whitelist` + `auth_method` vào order metadata **VÀ** copy vào order items.

## Bug 3: PlaceOrder worker skip đơn có proxy rỗng (06/04/2026)

`ProxyVNProvider::buy()` tạo order items với proxy object rỗng `{value:"", ip:"", port:""}`. Worker check `!empty($item->proxy) && is_array($item->proxy)` → **true** (array có keys dù values rỗng) → skip gọi API → proxy trống mãi.

**Fix**: `PlaceOrder.php` check proxy phải có `value` thực hoặc `provider_key`:
```php
$value = $item->proxy['value'] ?? '';
return !empty($value) || !empty($item->provider_key);
```

## Bug 4: Race condition metadata (06/04/2026 - đã xử lý)

`GenericBuyProvider::buy()` tạo order → push Redis → worker pop → đọc metadata. Nhưng `ResellerController` ghi `ip_whitelist` vào metadata **sau** buy. Worker có thể đọc trước khi metadata được ghi.

**Fix**: `GenericOrderProcessor` thêm `$order->refresh()` trước khi đọc metadata. Và `ResellerController` copy `ip_whitelist` trực tiếp vào order items (không phụ thuộc worker).

## ip_whitelist.mode

| Mode | Gửi IP khi mua | Gửi IP khi xoay |
|---|---|---|
| `on_buy` | ✅ (GenericOrderProcessor Layer 5) | ❌ |
| `on_rotate` | ❌ | ✅ (rotate_params) |
| `both` | ✅ | ✅ |

**Lưu ý**: "gửi IP khi xoay" cần `rotate.rotate_params` có `field: "ip_whitelist"`. `mode` chỉ ảnh hưởng lúc mua.

## Flow hoàn chỉnh (sau tất cả fix)

### Khi mua từ site con
```
FE site con gửi ip_whitelist trong checkout
  → ProxyController::buyForChildSite() → order.metadata.ip_whitelist ✅
  → MktProxyResellerProcessor → SupplierService::buyProxy({ip_whitelist})
  → Site mẹ ResellerController::buyProxy()
    → $provider->buy() tạo order + items
    → ResellerController ghi ip_whitelist vào:
      1. order.metadata ✅
      2. Tất cả order items ✅ (fix Bug 2)
  → PlaceOrder worker pop → GenericOrderProcessor
    → $order->refresh() đọc metadata fresh ✅ (fix Bug 4)
    → Gọi API NCC (nếu ip_whitelist.mode = on_buy/both → gửi IP)
    → saveProxiesToDb() copy ip_whitelist vào items ✅
```

### Khi user thêm IP sau mua
```
FE → PUT /order-items/{key}/ip-whitelist (site con)
  → ProxyKeyController lưu local ✅
  → SupplierService::updateIpWhitelist(provider_key) → site mẹ ✅
  → ResellerController tìm item theo key → lưu ip_whitelist ✅
```

### Khi xoay proxy
```
AutoRotateProxies worker (site mẹ)
  → DefaultHandler::rotateProxy()
  → rotate_params: field "ip_whitelist" → đọc từ order_item ✅
  → Gửi param whitelist=1.2.3.4 cho NCC ✅
```

## Debug checklist (khi ip_whitelist không hoạt động)

1. **FE gửi ip_whitelist?** → Kiểm tra network request checkout
2. **Order site con có metadata.ip_whitelist?** → `Order::find(id)->metadata`
3. **Site mẹ nhận ip_whitelist?** → Grep proxy.log `[Reseller] Buy request`
4. **Order site mẹ có metadata.ip_whitelist?** → `Order::where('metadata', 'LIKE', '%external_ref%')->first()`
5. **Order item site mẹ có ip_whitelist?** → `OrderItem::where('order_id', id)->first(['ip_whitelist'])`
6. **Worker có skip?** → Log "bỏ qua, đơn đã có proxy" = Bug 3 (proxy rỗng)
7. **Xoay có gửi IP?** → Grep proxy.log `[GenericRotate]` xem `request.whitelist`

## Files liên quan

- `ResellerController.php` — ghi ip_whitelist vào metadata + items sau buy
- `ProxyKeyController.php` — endpoint update ip_whitelist + sync site con
- `SupplierService.php` — `updateIpWhitelist()` gọi site mẹ
- `GenericOrderProcessor.php` — `$order->refresh()` + Layer 5 ip_whitelist mode + saveProxiesToDb copy
- `PlaceOrder.php` — check proxy rỗng (Bug 3 fix)
- `DefaultHandler.php` — `rotateProxy()` + `rotate_params` đọc ip_whitelist
- `AutoRotateProxies.php` — worker xoay, site con poll `getProxyCurrent`
- `routes/api.php` — route PUT `/reseller/order-items/{key}/ip-whitelist`
