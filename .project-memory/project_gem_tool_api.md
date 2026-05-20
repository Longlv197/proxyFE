---
name: Gem1 Tool API — buy_token + Redis list (20/04/2026)
description: Flow API cho tool GEM1 bên thứ 3 — auth qua buy_token (BE sinh khi /add-transaction, không lộ qua CK ngân hàng). Redis LIST LPOP/RPUSH thay auth code+amount.
type: project
originSessionId: a6bd552c-0e2d-44da-95f3-f1afe7007b4c
---
## Bối cảnh

Flow cũ `apiBuyProxy{Rotating,Static}` hardcode serviceTypeId + không có spent tracking → lỗ hổng.
Flow trung gian dùng `code+amount` trong body → `code` lộ qua nội dung CK ngân hàng.
**Flow cuối (current):** dùng `buy_token` BE sinh + Redis LIST atomic LPOP.

## Flow tool GEM1

```
1. POST /api/add-transaction?code=C&amount=Y       (giữ URL cũ)
   → BE: buy_token T = Str::uuid()
   → DB:  bank_auto.buy_token = T (cột mới, unique)
   → Response: {..., buy_token: T}   ← tool LƯU T BÍ MẬT, KHÔNG lộ qua CK

2. Khách CK nội dung "gem1 C" amount Y    (C lộ qua CK, T không lộ)

3. Webhook pay2s match C → status=success
   → BankAuto model event (updated + wasChanged('status')) tự động:
      RPUSH gem:bt:{T} 1 EX 90 ngày

4. POST /api/buy/proxy  body: {buy_token: T, service_type_id|product_code, quantity, duration, ...}
   → Redis LPOP gem:bt:{T}  (atomic)
      - "1" = đã CK thật + chưa dùng → mua
      - null = chưa CK, token sai, hoặc đã dùng → 400 token_not_ready
   → Validate SP, custom_fields, ip_whitelist, auth_method (lỗi → RPUSH lại để retry)
   → PricingService::getPrice → check totalPrice <= deposit.amount (tool tính sai → RPUSH lại)
   → provider->buy()
      - success=true → list đã rỗng, xong (không mua lại được)
      - success=false → RPUSH lại "1" (retry OK)
      - exception (có thể đã gọi NCC) → KHÔNG RPUSH, log admin
   → addLog gem_purchased vào deposit.activity_log (order_id)

5. GET /api/gem-orders?buy_token=T         (tra cứu list, NOT qua Redis)
   GET /api/gem-orders/{order_code}?buy_token=T   (chi tiết)
   → Query BankAuto by buy_token → check order.id ∈ activity_log[gem_purchased]
```

## Chống cheat

| Kịch bản | Kết quả |
|---|---|
| Code lộ qua CK ngân hàng | ✅ Không đủ để mua (cần buy_token, BE không trả lại khi poll) |
| buy_token lộ qua log/mạng | ⚠️ Nếu chưa mua: attacker mua được. Nếu đã mua: list rỗng → vô hại |
| Brute force buy_token | ✅ UUID v4, không đoán được |
| Race 2 request song song | ✅ LPOP atomic — 1 thắng 1 thua |
| Replay cùng buy_token | ✅ List rỗng sau LPOP lần đầu |
| Tool sinh code yếu | ✅ Không ảnh hưởng — buy_token BE sinh |
| Admin xem DB | ⚠️ Admin có DB có thể lấy buy_token chưa dùng → mua được. Trust model. |

## Files

### Mới
- `app/Http/Controllers/Api/GemController.php` — 3 method public: `buy`, `orderDetail`, `ordersList`
- `database/migrations/2026_04_20_000001_add_buy_token_to_bank_auto.php` — thêm cột unique nullable

### Sửa
- `app/Models/MySql/BankAuto.php`:
  - Fillable: thêm `buy_token`
  - `booted()` — thêm `static::updated` event: gem1 + status→SUCCESS + buy_token có → auto RPUSH Redis
- `app/Http/Controllers/Api/CheckBankAutoController.php::addTransaction`:
  - Sinh `buy_token = Str::uuid()`, lưu DB, trả trong response
- `app/Http/Controllers/Api/ProxyController.php` — xoá 2 method `apiBuyProxy{Rotating,Static}` (cũ hardcode SP)
- `routes/api.php` — xoá 2 route `/api/buy/proxy-{rotating,static}`, thêm 3 route mới

## Routes GEM1 cuối

| Method | URL | Mục đích |
|---|---|---|
| POST | `/api/add-transaction` | Tạo giao dịch, trả `buy_token` |
| GET  | `/api/bank-auto-gem` | Check status — nhận `?buy_token=T` (mới) hoặc `?code=X&amount=Y` (cũ backward compat). Trả `{status, buy_token, code, amount, token (JWT legacy)}` |
| GET  | `/api/total-deposit` | Giữ nguyên |
| **POST** | **`/api/buy/proxy`** | Mua — body chứa `buy_token` + params SP (gộp rotating + static) |
| **GET**  | **`/api/gem-orders`** | List đơn của deposit (auth `buy_token`) |
| **GET**  | **`/api/gem-orders/{order_code}`** | Chi tiết 1 đơn |

## Redis key format

```
gem:bt:{buy_token}  → Redis LIST
  [] (empty)     = chưa CK HOẶC đã dùng HOẶC sai token HOẶC đã hết 24h
  ["1"]          = đã CK thật, sẵn sàng mua
  TTL: 24h kể từ lần RPUSH gần nhất (webhook push khi status→SUCCESS)
```

**Vì sao TTL 24h (không 90 ngày):** Token có thể lộ qua DB admin/log pay2s. Giới hạn cửa sổ tấn công xuống 24h. Khách không mua trong 24h kể từ CK → phải tạo giao dịch nạp mới (UX cost chấp nhận được vì khách thường mua ngay khi nạp).

## Rule quan trọng

- **1 deposit = 1 đơn** — enforce qua Redis list rỗng sau LPOP
- **Không backward compat** với endpoint cũ — đã xoá
- **Không đụng `/add-transaction`, `/bank-auto-gem`, `/total-deposit`** — giữ URL/behavior
- **Nạp bao nhiêu mua bấy nhiêu** — check `totalPrice <= deposit.amount`
- **Tool sinh code (nội dung CK)** + **BE sinh buy_token (bí mật)** — 2 giá trị tách biệt
- **Tool phải lưu `buy_token` bí mật** — không log plain, không lộ public

## Đánh dấu Order ↔ Deposit ↔ Token (admin audit)

Sau khi Order tạo thành công, metadata được gắn:

```json
{
  "gem_bank_auto_id":   123,           // FK BankAuto.id (primary key, tra nhanh)
  "gem_deposit_code":   "ABC",         // code tool sinh, khớp note CK ngân hàng
  "gem_deposit_amount": 72000,         // số tiền nạp
  "gem_buy_token":      "uuid-36"      // token đã dùng để mua đơn này
}
```

Link 2 chiều:
- **Order → Deposit**: đọc `Order.metadata.gem_bank_auto_id` / `gem_buy_token`
- **Deposit → Orders**: đọc `BankAuto.activity_log[gem_purchased]` — có `order_id` + `order_code` + `service_type_id` + `quantity` + `duration` + `amount`

## Restore logic khi mua fail — rule đơn giản: **order_code là chân lý**

- **Có `order_code` sau `provider->buy()`** → Order đã tạo trong DB → **KHÔNG RPUSH**. Proxy chưa về / NCC pending / có lỗi nhẹ gì đó = admin xử lý phần còn lại. Tool coi như OK.
- **KHÔNG có `order_code`** → đơn chưa tạo được → **RPUSH lại** (tool retry)
- Lỗi validation TRƯỚC khi gọi `provider->buy()` (SP ngừng, qty invalid, custom_fields thiếu, giá lệch...) → **RPUSH lại** (chưa đụng provider, an toàn retry)
- **Exception** trong catch sau khi LPOP → **KHÔNG RPUSH** (có thể đã gọi NCC → tránh double buy, admin xử lý thủ công qua log `[Gem] buy exception — token NOT restored`)

## Endpoint Reseller thay thế (tham chiếu)

- `/api/products` — list SP tool dùng để build UI
- `/api/buy-proxy` (Reseller, X-API-Key) — KHÔNG dùng cho GEM1 vì không có checkGemDepositLimit

## Admin audit UI (20/04/2026)

- Routes GEM1 bọc trong `if (config('site.is_parent'))` — CHỈ site mẹ, site con không expose
- `TransactionBankController::investigateFull` — thêm `buildGemInfo($bankAutoId)` trả:
  - `buy_token`, `token_status` (ready/consumed_or_expired/not_paid_yet/redis_error/unknown), `token_ttl`
  - `deposit_code`, `deposit_amount`, `purchases_count`
  - `orders[]` (join từ `activity_log[gem_purchased].order_id`)
  - `activity_log[]` đầy đủ
- Response thêm `data.gem_info` (null nếu không phải gem1 hoặc bank_auto không tìm thấy)
- FE `InvestigationDrawer.tsx` render section "GEM1 Tool" khi `gem_info` khác null:
  - Badge token_status màu theo trạng thái
  - Buy Token (ẩn/hiện/copy)
  - TTL countdown
  - List đơn mua (mã, status, SL, tổng)
- Bằng chứng cho admin chứng minh khách đã nạp/đã mua:
  - Đã nạp = `status: 'success'` + có `buy_token`
  - Đã mua = `purchases_count > 0` + list orders hiện
  - Token còn dùng được = `token_status = 'ready'` (Redis còn "1")
