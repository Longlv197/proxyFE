---
name: auto-rotate-proxy-redesign
description: "Model xoay proxy. CẬP NHẬT 07/06: 2 mode — thủ công (mặc định đơn mới) + auto (khách bật). Lõi RotateProxyService dùng chung."
metadata: 
  node_type: memory
  type: project
  originSessionId: 011a845a-5e41-4fbb-99d1-98a2ccd63837
---

## CẬP NHẬT 07/06/2026 — Model 2 mode (đè model cũ bên dưới)

**Quyết định anh:** đơn MỚI mặc định xoay THỦ CÔNG; đơn CŨ giữ auto (backfill, sàn 60s).

### 2 mode (cấu hình per sản phẩm `metadata.rotation`)
- `allow_manual` (mặc định true): khách gọi `proxies/rotate-ip` → GỌI NCC xoay thật (trước chỉ đọc cache). Có cooldown `last_rotate` chống spam.
- `allow_auto` (mặc định true): khách tự bật ở trang đơn qua `proxies/rotation-mode` {auto_rotate, interval≥min}. Bật → `OrderItem.auto_rotate=true` + `auto_rotate_interval`.
- `min_interval`: sàn (FE dropdown), hằng `RotateProxyService::MIN_AUTO_INTERVAL=60` (1 phút).

### Lõi dùng chung — `App\Services\RotateProxyService` (MỚI)
- `rotate($item,$provider,$isChild)`: **lock NX `rotate_lock:{key}` TTL 20s** (chặn worker auto + HTTP manual xoay cùng key) → callProvider → normalize → lưu `proxy:{key}`+DB → del lock. KHÔNG tự set `last_rotate` (caller quyết).
- `eligibleAutoQuery()` + `resolveInterval()` (SP>NCC>api_config) — DÙNG CHUNG scan + backfill (không lệch).
- `AutoRotateProxies` (worker auto) + `ProxyController::rotateProxyIp` (manual) đều gọi service.

### Scan đổi
`ScanRotateProxies` giờ CHỈ nhặt `auto_rotate=true` + interval = `auto_rotate_interval` (sàn 60). Đơn không bật auto → không xoay nền.

### Backfill (chạy 1 lần khi deploy)
`php artisan backfill:auto-rotate` (idempotent, có `--dry`): đơn ROTATING đang chạy (raw interval>0) → set auto_rotate=true + interval=max(raw,60). DEPLOY: deploy code → backfill → `supervisorctl restart all`. **Chạy cả site mẹ + con** (mỗi site DB riêng). Đã chạy dry 07/06: mẹ=10, con=7 (đều enabled, skipped=0).

### Trạng thái
- BE: DEPLOYED + VERIFIED PROD (gitlab develop, mới nhất 01b20dc). Test 07/06: gọi `rotate-ip` đơn mới → kích hoạt + xoay thật OK (trả proxy + second=60). Có GET `proxies/rotation-mode` trả trạng thái mode.
- FE Pha 1 XONG (github main, mới nhất 9286c25): (a) admin "Chế độ xoay IP" trong ServiceFormModal (allow_manual/allow_auto/min_interval → metadata.rotation); (b) `ProxyDetailModal` + `OrderRotatingProxyPage`: badge mode (Thủ công/Tự động), nút "Lấy proxy/Xoay IP" + đếm ngược cooldown, toggle "Tự động xoay" + chọn chu kỳ. Modal mở cả khi đơn mới chưa có proxy.
- UX đơn mới: LAZY — chưa có proxy tới khi khách bấm "Lấy proxy" (rotate-ip) lần đầu (đúng spec "gọi API mới kích hoạt"). proxies/new|current chỉ đọc, không kích hoạt.
- Nút khách nằm ở **chi tiết đơn** (history-order → click đơn → cột "Xoay IP" → nút "Xoay / Cài đặt" mở ProxyDetailModal). KHÔNG phải OrderRotatingProxyPage (component đó không mount) hay proxy-xoay (trang mua).
- **IP gốc NCC** (09/06): admin khai báo field ở NCC tab Xoay (`response.proxy_fields.real_ip`) → rotate đọc → lưu `real_ip` → trả qua rotate-ip/current + hiện "IP gốc (NCC)" trong modal. config-driven, không có thì bỏ qua.
- API docs (`apiDocsConfig.ts`) đã sửa khớp thực tế: rotate-ip POST trả `second`+`value/ip/port/user/pass/real_ip/rotated_at/http/socks5`+"Đã xoay IP"; cooldown trả 200 proxy hiện tại (không phải 400). rotation-mode KHÔNG vào docs (auth user, không phải X-API-Key).
- **Pha 2 site con — XONG (09/06, gitlab 8dd5419, rút gọn):** con CHỦ ĐỘNG gọi thẳng `rotate-ip` mẹ để xoay thật (cả auto con-scan lẫn tay). `SupplierService::rotateProxy` đổi `proxies/new`→`proxies/rotate-ip`; `RotateProxyService` nhánh con dùng `rotateProxy` thay `getProxyCurrent`. KHÔNG sync cấu hình auto con→mẹ (con tự lên lịch, mẹ xoay theo lệnh) — tránh lệch con-auto/mẹ-manual. Mẹ có cooldown riêng chống spam. real_ip mẹ tự truyền xuống con. Deploy: BE site CON git pull + restart worker (mẹ không đổi).
- Liên quan: [[project_child_site_rotate]].

---

## (CŨ — TRƯỚC 07/06, đã bị model 2 mode đè) Auto Rotate v1

Kiến trúc cũ: MỌI proxy ROTATING tự xoay theo `rotation_interval` SP (forced), `rotate-ip` chỉ đọc cache. Keys: `proxy:{key}` (no TTL), `last_rotate:{key}` (TTL=interval). 3 endpoint `/proxies/new|current|rotate-ip` đều `readProxyFromRedis` (KHÔNG gọi NCC). Files: ScanRotateProxies (scan 10s), AutoRotateProxies (BLPOP x3), ProxyController.
