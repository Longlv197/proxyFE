---
name: Residential Proxy Provider (GB-based)
description: Tích hợp NCC residential proxy bán theo GB — 3 bước API gộp thành 1 bước user, custom_fields cho tariff/country/rotation
type: project
---

## Trạng thái: CHƯA LÀM — cần thiết kế chi tiết

## NCC API Flow (3 bước)

### Step 1: Lấy tariff
```
GET /api/reseller/get/tariffs
→ [{ tariff_id: 1, name: "Tariff", price: "10 $", traffic: "1 GB" }]
```

### Step 2: Mua package
```
POST /api/reseller/buy/package
{ package_id: 1 }
→ { package_key: "123" }
```

### Step 3: Tạo proxy list trong package
```
POST /api/reseller/create/proxy
{
  package_key: "123",
  list_name: "us-ca-la",
  list_login: "client001",
  format: 1,
  rotation_period: 0,
  country_code: "US",
  region_name: "CA",
  city: "Los Angeles"
}
→ { list_id: 111, login: "client001", password: "secret", proxy_list: ["1.1.1.1:1000"] }
```

## Phase 1 — Gộp 3 bước thành 1

User chọn: gói GB + country + rotation → bấm mua → BE tự động gọi 3 API → trả proxy.
Không sửa, không xóa proxy sau mua. Đơn giản như sản phẩm thường.

## Phase 2 — Hoàn thiện

- Command schedule poll GB remaining từ NCC
- Hiện GB còn lại trên order detail
- Cho sửa/xóa/tạo lại proxy list
- Cảnh báo gần hết GB

## Cần thiết kế chi tiết (session sau)

1. **Provider handler**: `ResidentialGBProvider` — gộp 3 API, xử lý lỗi từng bước
2. **Custom_fields config**: tariff (select GB), country (select), region (select/text), city (text), rotation_period (select), format (select)
3. **Pricing**: tính theo GB — `pricing_mode: "per_unit"` với unit = GB? Hay tạo mode mới?
4. **Order metadata**: package_key, total_traffic, list_id, login, password, proxy_list
5. **Tariff sync**: NCC tariff list có thay đổi không? Cần sync định kỳ hay hardcode?
6. **Country/Region/City**: NCC có API trả danh sách? Hay phải hardcode?
7. **Lỗi giữa chừng**: mua package OK nhưng tạo proxy fail → xử lý sao?
8. **Site con**: bán residential → flow relay site con → site mẹ → NCC
9. **FE checkout**: custom_fields đủ cho flow này? Hay cần UI riêng?
10. **Order detail FE**: hiện proxy list, package info, GB usage (phase 2)

## Liên quan

- Custom fields architecture: `project_custom_fields_architecture.md` — 3 lớp key/provider_value/label
- Provider system: `project_provider_system_wip.md` — config-driven + handler plugin
