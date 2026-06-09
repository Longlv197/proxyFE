---
name: residential-proxy-provider-proxyma
description: "Tích hợp NCC residential proxy bán theo gói GB + 30d — 2-stage queue, schema lite, domain masking"
metadata: 
  node_type: memory
  type: project
  originSessionId: ed3d15e1-11b5-4750-a542-4c6855a0e02e
---

## Trạng thái: HƯỚNG A (config-driven) ĐÃ IMPLEMENT 08/06/2026 — code xong, build/lint pass, CHƯA test E2E, CHƯA deploy, CHƯA commit. Standalone Processor giữ phòng hờ (không route tới).

## ⚠️ NEXT: anh tự cấu hình 4b trên UI (provider api_config buy=deferred + fetch_proxies auth_string; SP proxy_host + price_quantity_mode=package + max_quantity>1 + custom_fields tariff stage=buy / combo location type=combo) → test E2E local → deploy → `supervisorctl restart all`. Reversible: bỏ comment 1 dòng ProviderFactory.

## Refactor hướng A — đã làm (Phase 1+2+3, changelog BE 15.46+15.47, FE 13.102+13.103)

**Mô hình mới:** Proxyma = NCC deferred bình thường (KHÔNG còn special-case). Mua = deferred (NCC trả package_key làm mã đơn) → FetchProviderItems tạo proxy (= bước "lấy proxy"). Mỗi proxy 1 OrderItem rotating-shaped (KHÔNG package box). Giá theo gói (quantity không nhân). Combo location gói country+region+city.

**Cơ chế then chốt (đều additive + gated mặc định → NCC cũ 0 ảnh hưởng):**
- Format `auth_string` (`user:pass@host:port`) + thay host NCC → `SP.metadata.proxy_host` (ẩn NCC). `ProxyFormat::fromAuthAtHost`, `DefaultHandler` mapProxy, `saveGenericDeferredProxies` bơm `_host_override` + bọc chuỗi thô.
- Nhãn `stage` (buy/fetch) per custom_field: buy skip field fetch (Layer 3), fetch inject field fetch (`injectFetchStagedFields`). Combo (type=combo) bung 1→N param tại đây theo `components` + option `values`.
- `price_quantity_mode=package`: total/cost KHÔNG ×quantity. Vá cross-module cả immediate (BaseProvider) lẫn deferred (FetchProviderItems finalizeOrder/createBuyHistory). FE CheckoutModal+ProxyCard total đúng.
- Combo lưu KEY trong đơn (validate ResellerController), bung values lúc fetch (ẩn NCC + tránh drift). Site con strip components+values (AppliesProductPricing).
- Routing: `ProviderFactory` bỏ hardcode proxyma.io. Buy-side vốn dùng GenericBuyProvider.
- Hiển thị: `OrderController` _data_field='proxy' luôn; `OrderDetail` isResidential=false → render rotating.

**Pending chưa làm:** site con giá ×quantity (`FetchProviderItems:576`) + gia hạn (`ProxyController:422`) chưa áp package. Dead code chờ xoá: ResidentialPackageBox, DownloadProxyModal, CreateProxymaList/RetryProxymaStage2/SyncProxymaPackages commands, ProxymaResidentialProcessor.

## (Lịch sử) PHASE 2 DEPLOYED prod (01/06/2026) — commits BE 18db999+3302e3f+4614eff, FE 6fd5701. Phase 1 E2E verified 21/05/2026.

E2E thực tế với NCC thật (token live, balance $100 → $95):
- Stage 1: 2.2s, package_key=2169373599b4de0cda89 (gói 1GB/30d/$5)
- Stage 2: 5.68s, list_id=20502189, login=mkt12, pass=PobdWspcfO
- 4 IP US residential thật khác nhau (Verizon/Comcast/Sonic/Cablevision)
- Rotate auto verified (cùng port 2 lần → 2 IP khác)
- sync:proxyma-packages cập nhật traffic 0/1024MB, days_left 29

4 bug đã fix trong quá trình test:
1. Seeder `rotation_mode` → đổi `rotation_type='auto'` (column rotation_mode không tồn tại trong type_services)
2. GenericBuyProvider.php: bỏ `rotation_mode` khỏi `Order::create` (bug có sẵn project, block mọi NCC). Commit 1041ab5
3. ProxymaResidentialProcessor: thêm helper `resolveOptionKeyAndValue` match cả key lẫn provider_value (ResellerController pre-resolve key→value → processor không thể lookup key nữa)
4. SyncProxymaPackages: NCC trả unit GB (không phải bytes) → `* 1024` thay vì `/ 1024 / 1024`

Bước user CHƯA verify: FE browser (OrderDetail render ResidentialPackageBox + DownloadProxyModal + form mua /products có dropdown tariff/country). FE dev server :3001 đã chạy lúc bàn giao.

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

## Phase 2 (29/05/2026) — ĐÃ DEPLOY prod ✅

### Done
- Admin Provider UI tab Residential (toggle kind, balance live, sync tariffs, proxy_host_options, residential_endpoints)
- Admin ServiceType UI residential (ResidentialConfigSection + LocationTreePickerModal 1223 dòng v2 + LocationTreeViewer + NccOptionsPickerModal + dependent dropdown country→region→city + tariff source=api_tariffs)
- BE admin API `/admin/{slug}/balance|tariffs|countries|regions|cities|sync-tariffs` (generic theo slug, fix sau lần đầu hardcode `proxyma`)
- BE user API `/services/{code}/regions|cities` (SP code, KHÔNG lộ NCC slug)
- ProxymaApiClient đọc URL/token từ `provider.api_config.residential_endpoints` (đã dynamic)
- Custom field `source=api_regions|api_cities` validate qua `options_by_parent` snapshot
- Security: bỏ `provider_code` khỏi `/api/products` response, xoá dead prop `providerCode` FE
- Build prod fix: tạo swap 4GB (npm ci OOM trước đó), reinstall next-swc binary corrupt, reinstall framer-motion thiếu file
- `transaction_bank` MANUAL deposit fix: set partner+partner_transaction_id unique (BankQrController dùng bankAuto.id, AdminUserController dùng microsec+admin_id)

### Pending — quyết định kiến trúc CHƯA chốt (anh sẽ xử lý sau)

**Bối cảnh:** Anh thấy code Proxyma hiện tại (656 dòng standalone Processor) **không nên giữ** — config-driven đã gần đủ pattern. Stage 2 ≈ "lấy proxy từ đơn hàng" (FetchProviderItems hiện có). Mỗi proxy port là 1 OrderItem, không cần concept "package".

**3 hướng đã thảo luận:**

- **A (anh nghiêng về)** — Xoá ProxymaResidentialProcessor, mở rộng Generic+Handler:
  - `params` templating từ `{{custom_fields.X.provider_value}}`
  - `fetch_proxies` đọc params từ Order context (không chỉ provider_order_code)
  - Response mode `expand_port_range` (1 object → N proxy items)
  - Effort 5-8h. Future NCC residential = chỉ config.

- **B** — Giữ standalone Processor đơn giản:
  - Stage 2 bulk insert 1000 OrderItem (port 10000-10999)
  - Xoá SyncProxymaPackages + ResidentialPackageBox + DownloadProxyModal + residential branches BE/FE
  - Effort 2-3h. An toàn nhất.

- **C** — Hybrid: Processor đọc config từ api_config (URL/params/response), không hardcode. Effort 3-4h.

**Mô hình cuối cùng anh xác nhận (áp dụng cho mọi hướng):**
- 1 Order = 1 package (tự nhiên)
- 1 OrderItem = 1 proxy port (1000 rows/đơn) — `{host, port, login, password}` chuẩn proxy
- KHÔNG lưu package state (traffic_used, days_left) — anh tự check ở admin NCC
- Tariff/country/region/city = custom_field options khách chọn (đã có pattern)
- Sau refactor: residential render UI giống rotating (table + summary), KHÔNG có UI riêng package

**Files đề xuất xoá khi refactor:**
- `SyncProxymaPackages` command + cron `sync:proxyma-packages`
- BE residential branch trong `OrderController::getApiKeys()._data_field` + `ResellerController::orderDetail`
- Endpoint `/orders/{code}/proxies`
- FE `ResidentialPackageBox.tsx` + `DownloadProxyModal.tsx`
- FE residential branch trong `OrderDetail.tsx` + `_kind` trong `useApiKeys.ts`

**Files giữ:**
- ProxymaApiClient (dynamic config tốt)
- CreateProxymaList worker + RetryProxymaStage2 cron
- Admin UI Phase 2 (provider config, location picker)

### Pending khác (chưa làm)
- Renewal `POST /update/{key}`
- Domain custom site con (override host từ site mẹ trả về)
- IP whitelist Proxyma (chưa verify NCC có hỗ trợ)
- Multiple lists per package (1 package nhiều country)

## Liên quan

- [[reference_proxyma_api]] — API endpoints Proxyma đã verify
- [[project_custom_fields_architecture]] — 3 lớp key/value/label
- [[project_provider_system_wip]] — Provider system config-driven
- [[project_order_lock_flow]] — Redis lock pattern
