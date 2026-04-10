---
name: Custom Fields Architecture
description: Quy tắc 3 lớp cho custom_fields — key (client), value (NCC), label (user). Tách data hiển thị khỏi data internal
type: project
---

## Trạng thái: ĐANG IMPLEMENT (11/04/2026)

## Nguyên tắc 3 lớp

```
Client (FE)  →  option.key    ("ph")           ← FE gửi khi mua
Server (BE)  →  option.value  ("176")          ← gửi NCC, lưu order
User thấy    →  option.label  ("Philippines")  ← hiển thị
```

- Client không biết `value` (ID NCC)
- NCC không biết `key` (nội bộ)
- User chỉ thấy `label`

## Data structure

### Field level (đã có):
```
key: "location"            → FE biết
param_name: "location_id"  → NCC biết (ẩn khỏi client)
label: "Vị trí quốc gia"   → User thấy
```

### Option level (thêm `key`):
```
key: "ph"                  → FE biết, gửi lên
value: "176"               → NCC biết (ẩn khỏi client)
label: "Philippines"       → User thấy
flag: "ph"                 → Hiện cờ (optional)
```

### Auto-sinh option.key:
- Có `flag` → dùng flag: `"ph"`, `"my"`
- Không có flag → slug(label): `"viettel"`, `"fpt"`, `"50gb"`

## API flow

### GET /products — trả client:
- Field: `key`, `label`, `type`, `required`, `default`
- Option: `key`, `label`, `flag`
- **STRIP**: `value`, `param_name`

### POST /buy-proxy — FE gửi:
```json
{ "custom_fields": { "location": "ph" } }
```
Field.key + option.key. Không gửi value NCC.

### BE xử lý:
1. Nhận option.key ("ph")
2. Lookup từ ServiceType.metadata.custom_fields → tìm value ("176")
3. Lưu order.metadata.custom_fields: `{ "location": "176" }` (value, cho processor)
4. Lưu order.metadata.display: `{ "Vị trí quốc gia": "Philippines" }` (label, cho hiển thị)

### Processor gửi NCC:
- Đọc order.metadata.custom_fields → `{ "location": "176" }`
- Map field.key → field.param_name → `{ location_id: "176" }`
- **Không đổi gì** so với trước

### Site con → site mẹ:
- MktProxyResellerProcessor đọc order.metadata.custom_fields → `{ "location": "176" }`
- Gửi nguyên cho site mẹ → **Không đổi gì**

### Order API trả client:
- Trả `display`, strip `custom_fields`

## Type text/number:
- Không có options → FE gửi value trực tiếp
- BE lưu thẳng, không lookup
- display = field.label + giá trị user nhập

## Quy tắc cho mọi custom_field mới:
1. Admin tạo field: nhập key, param_name, label, type
2. Nếu type=select: tạo options, mỗi option có key (auto) + value (gửi NCC) + label (hiển thị)
3. FE chỉ thấy key + label
4. BE map key → value khi xử lý
