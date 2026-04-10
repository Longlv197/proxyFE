---
name: Country Flag Custom Field
description: Redesign custom_field display_type=country_flag — admin chọn quốc gia + nhập value API cùng 1 dòng, FE hiện cờ
type: project
---

## Trạng thái: ĐÃ IMPLEMENT (10/04/2026)

## Data structure

```json
{
  "key": "location",
  "param_name": "location_id",
  "label": "Vị trí quốc gia",
  "type": "select",
  "display_type": "country_flag",
  "options": [
    { "value": "176", "label": "Philippines", "flag": "ph" },
    { "value": "157", "label": "Malaysia", "flag": "my" }
  ]
}
```

## Đã hoàn thành

1. **Admin form site mẹ** — option row compact: `[🇵🇭 Tên] [Value API] [✕]` + dropdown thêm quốc gia
2. **Admin form site con** — display_type selector + country_flag UI giống site mẹ + fix save metadata (display_type + flag)
3. **Preview card** — column selector (3/4/5 cột) + hiện cờ quốc gia realtime
4. **Card sản phẩm** — hiện cờ từ `flag`, ẩn `country` row nếu có country_flag
5. **Checkout** — radio buttons có cờ + tên, gửi `value` cho API

## Files liên quan

### FE
- `ServiceFormModal.tsx` — admin form site mẹ, PurchaseOptionsSection
- `ChildServiceFormModal.tsx` — admin form site con, sync custom_fields
- `productFieldsHelper.tsx` — card sản phẩm, case 'custom_fields' + case 'country'
- `CheckoutModal.tsx` — checkout modal, hiện cờ trong radio buttons

## TODO còn lại

- **BE sync verify**: test thực tế site con import sản phẩm từ site mẹ — đảm bảo `display_type` + `flag` qua checkByCode + import + applySyncData
- **API response**: verify FE client map `value → flag` khi hiển thị order detail
