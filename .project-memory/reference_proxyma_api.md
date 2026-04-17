---
name: Proxyma Residential API
description: API endpoints, flow, response format cho provider Proxyma (Residential proxy)
type: reference
originSessionId: 5acc1bf8-b50b-4108-9203-270a23968168
---
## Flow mua proxy (3 bước)

### Bước 1: GET /api/reseller/get/tariffs
Lấy danh sách gói. Response:
```json
{
  "result": {
    "status": 200,
    "data": [
      { "tariff_id": 1, "name": "Tariff", "price": "10 $", "traffic": "1 GB" }
    ]
  }
}
```
**Traffic cố định theo tariff** — user KHÔNG chọn GB riêng.

### Bước 2: POST /api/reseller/buy/package
Body tối giản:
```json
{ "package_id": 1 }   // package_id = tariff_id từ bước 1
```
Response:
```json
{ "result": { "status": 200, "package_key": "123" } }
```

### Bước 3: POST /api/reseller/create/proxy
Body:
```json
{
  "package_key": "123",
  "list_name": "us-ca-la",
  "list_login": "client001",
  "format": 1,
  "rotation_period": 0,
  "country_code": "US",
  "region_name": "CA",
  "city": "Los Angeles"
}
```
Response:
```json
{
  "result": {
    "status": 200,
    "data": {
      "list_id": 111,
      "login": "client001",
      "password": "secret",
      "proxy_list": ["1.1.1.1:1000"]
    }
  }
}
```

## Endpoints phụ

| Endpoint | Method | Mô tả |
|----------|--------|-------|
| `/api/reseller/info/package/{packageKey}` | GET | status, created_at, expired_at, days_left, traffic {limit, usage} |
| `/api/reseller/get/lists` | GET | Danh sách proxy list đã tạo trong package |
| `/api/reseller/get/proxy` | GET | Lấy proxy của list |
| `/api/reseller/get/api_tools/{packageKey}` | GET | Lấy proxy của package |
| `/api/reseller/update/{packageKey}` | PUT | Gia hạn (cùng điều kiện gói gốc) |

## Đặc điểm quan trọng

- **Bán theo traffic (GB)**, không theo số lượng proxy — traffic cố định trong tariff
- **Rotation tự động** phía Proxyma, không cần gọi API
- **Unlimited proxy lists** per package (khuyến nghị <= 2,000)
- 1 package → nhiều list khác country/region/rotation
- Proxy format có thể là `ip:port` hoặc `login:pass@host:port` tuỳ `format` param
- `create/proxy` params bắt buộc: `list_name`, `list_login`, `format`
