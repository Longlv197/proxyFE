---
name: residential-proxy-provider-proxyma
description: "Tích hợp NCC residential proxy bán theo gói GB + 30d — 2-stage queue, schema lite, domain masking"
metadata: 
  node_type: memory
  type: project
  originSessionId: ed3d15e1-11b5-4750-a542-4c6855a0e02e
---

## Trạng thái: PHASE 1 ĐÃ CODE (20/05/2026) — chưa test e2e thật

## Kiến trúc 2-stage queue

```
Stage 1 — Worker PlaceOrder (queue order_list_web):
  ProxymaResidentialProcessor::processOrder()
  → POST /buy/package {package_id: tariff_id} → package_key
  → Save vào OrderItem.metadata (1 row/đơn)
  → Order.status = AWAITING_PROVIDER
  → Enqueue proxyma:create_list_queue

Stage 2 — Worker CreateProxymaList (BLPOP queue):
  ProxymaResidentialProcessor::stage2CreateProxy()
  → Lock proxyma:stage2_lock:{order_id} TTL 60s
  → POST /create/proxy {package_key, country, region?, city?} → list_id + login + pass
  → Save metadata residential (host, port range, traffic, days_left, expired_at)
  → markOrderSuccess

Command retry:proxyma-stage2 (cron 5 phút):
  Scan order có package_key + chưa có list_id + lock không active → re-enqueue
Command sync:proxyma-packages (cron 1 giờ):
  GET /info/package/{key} → update traffic_used_mb + days_left + expired_at
```

## Schema "Hybrid" (1 OrderItem/đơn, lite + lazy expand)

- 1 đơn = 1 OrderItem row
- `metadata`: package_key, list_id, login, password, host, port_start=10000, port_end=10999, traffic_limit_mb, traffic_used_mb, days_left, expired_at
- Response `/orders/{code}` trả `residential_package` (raw), KHÔNG expand 1000 string
- Endpoint mới `/orders/{code}/proxies` trả raw host + port range + login/pass → FE tự build template (downloadable)
- Detect: `ServiceType.metadata.kind='residential'` → trigger render khác cả ở BE response + FE component

## Custom field 3 lớp (theo custom_fields_architecture)

- key="10gb" (FE) → provider_value=1 (BE→NCC = tariff_id) → label="10 GB - 30$" (user)
- Tương tự cho country (us → US → United States)
- region/city: type=text, gửi nguyên giá trị user nhập

## Domain masking (chống lộ NCC)

**Site mẹ Provider config:** `api_config.proxy_host_options[]` — admin nhập list domain CNAME (vd `gw.shop1.com` → `proxy.proxyma.io`)
**Site mẹ SP:** `metadata.proxy_host` (1 domain dùng cho SP này) + `metadata.shared_proxy_hosts[]` (lọc cho site con)
**Site con:** `metadata.proxy_host` riêng. Phase 1 dùng host site mẹ (mediated). Phase 2 thêm option "tự nhập CNAME riêng".
**Khi mua:** OrderItem.metadata.host = SP.metadata.proxy_host (snapshot). Response render `user:pass@${host}:${port}` thay vì proxy.proxyma.io.

## Site con relay (Phase 1: mediated mode)

- `MktProxyResellerProcessor` đã forward `custom_fields` ✓
- `FetchProviderItems` merge metadata từ site mẹ → site con tự nhận host/login/pass/traffic của site mẹ
- `SyncSupplierProducts` thêm check `kind` + `tariff_durations` + `available_proxy_hosts` → báo Telegram diff
- `stripCostFromMetadata` (AppliesProductPricing trait) rename `shared_proxy_hosts` → `available_proxy_hosts` + strip `proxy_host` site mẹ khi trả /products cho site con

## Error handling

- Stage 1 fail pre-call (token/proxy_host rỗng, tariff invalid) → `failOrderWithoutRetry` (chưa gọi NCC)
- NCC từ chối stage 1 → `failOrderWithRefund`
- NCC timeout stage 1 → `markProviderCalled` + max retry (idempotency)
- Stage 2 fail → **KHÔNG refund** (package_key đã trừ tiền NCC) → command `retry:proxyma-stage2` thử lại mỗi 5 phút
- Log từng giai đoạn `[ProxymaStage1]` / `[ProxymaStage2]` — debug dễ

## Pricing

- Quantity cố định = 1 (1 đơn = 1 gói). Admin set `min/max_quantity = 1`.
- Duration 30 ngày — admin config `tariff_durations` per tariff_key
- Giá dùng `price_by_duration` chuẩn hệ thống (không phụ thuộc tariff Proxyma)

## Files

**BE mới:**
- `database/seeders/ProxymaResidentialSeeder.php`
- `app/Services/Providers/OrderProcessors/ProxymaResidentialProcessor.php`
- `app/Console/Commands/CreateProxymaList.php` (worker BLPOP)
- `app/Console/Commands/RetryProxymaStage2.php` (cron 5p)
- `app/Console/Commands/SyncProxymaPackages.php` (cron 1h)

**BE sửa:** `ProviderFactory.php`, `ResellerController.php`, `OrderController.php`, `AppliesProductPricing.php`, `SyncSupplierProducts.php`, `Kernel.php`, `routes/api.php`

**FE mới:** `views/Client/HistoryOrder/ResidentialPackageBox.tsx`, `views/Client/HistoryOrder/DownloadProxyModal.tsx`
**FE sửa:** `OrderDetail.tsx` (detect kind + rẽ nhánh), `hooks/apis/useOrders.ts` (attach `_kind`)

## Setup operations Phase 1

1. `php artisan db:seed --class=ProxymaResidentialSeeder` → tạo Provider + SP mẫu
2. Set env `PROXYMA_API_KEY` thật + rerun seed (hoặc sửa Provider.token_api qua DB)
3. Admin sửa `Provider.api_config.proxy_host_options[]` thêm domain đã setup CNAME
4. Admin sửa `ServiceType.metadata.proxy_host` qua tinker (Phase 2 sẽ có admin UI)
5. Supervisor thêm worker `php artisan create-proxyma-list` (numprocs=1, autostart=true)

## Phase 2 (chưa làm)

- Renewal `POST /update/{key}`
- Domain custom site con (override host từ site mẹ trả về)
- Admin UI ServiceType set kind/proxy_host/tariff_durations/shared_proxy_hosts
- IP whitelist Proxyma (chưa verify NCC có hỗ trợ)
- Multiple lists per package (1 package nhiều country)

## Liên quan

- [[reference_proxyma_api]] — API endpoints Proxyma đã verify
- [[project_custom_fields_architecture]] — 3 lớp key/value/label
- [[project_provider_system_wip]] — Provider system config-driven
- [[project_order_lock_flow]] — Redis lock pattern
