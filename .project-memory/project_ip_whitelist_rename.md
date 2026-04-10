---
name: Rename ip_config→ip_whitelist + allow_ips→ip_whitelist
description: ĐÃ DEPLOY 02/04. Code xong, cần chạy migration data trước deploy production.
type: project
---

## Trạng thái: ĐÃ PUSH — chờ migrate data + deploy

### Code đã sửa (02/04/2026)

**BE (13 files):**
- GenericOrderProcessor, ResellerController, ProxyController, ProxyKeyController
- MktProxyResellerProcessor, GenericBuyProvider, OrderItemHelper, OrderItem model
- DefaultHandler, MigrateApiKeysToOrderItems, updatekeyExprire
- routes/api.php, MigrateIpWhitelistField.php (migration command mới)

**FE (11 files):**
- ProviderFormTypes, ProviderFormSerializer, IpWhitelistSection, ModalAddProvider
- CheckoutModal, useOrderItems, order-items page, admin/order-items page
- BuyConfigSection, RotateSection, OrderDetailModal

**NestJS:** apikey.entity.ts — property mapped `{ name: 'allow_ips' } → ip_whitelist`

### Thứ tự deploy

1. `php artisan migrate:ip-whitelist --dry-run` → kiểm tra
2. `php artisan migrate:ip-whitelist` → chạy thật
3. Deploy BE site mẹ → site con
4. Deploy FE

### Migration command chi tiết

`php artisan migrate:ip-whitelist` xử lý:
- Provider `api_config.ip_config` → `ip_whitelist`
- Provider `params_mapping[].variable: "allow_ips"` → `"ip_whitelist"`
- Provider `rotate_params[].field: "allow_ips"` → `"ip_whitelist"`
- Order `metadata.allow_ips` → `ip_whitelist`
- MongoDB OrderItem field `allow_ips` → `ip_whitelist`

### KHÔNG thay đổi

- MySQL `api_keys.allow_ips` column — legacy, không chạy production
- Param gửi NCC (`ip`, `allowed_ips`...) — giữ nguyên, do admin config
- Legacy web ProxyController, blade views — dev only

### Backward compat còn giữ

- `resolveVariable()`: accept cả `allow_ips` và `ip_whitelist` variable name (cho DB chưa migrate)
- `mappedVars` check: check cả 2 tên

### Cleanup sau khi confirm OK

- Bỏ `'allow_ips'` khỏi `resolveVariable()` match
- Bỏ `!in_array('allow_ips', $mappedVars)` check
