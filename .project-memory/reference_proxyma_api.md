---
name: Proxyma Residential API
description: API endpoints, flow, response format cho provider Proxyma (Residential proxy)
type: reference
---

## Flow mua proxy

1. `GET /get/tariffs` — lấy danh sách gói
2. `POST /buy/package` — mua gói, `package_id` = `tariff_id` từ bước 1 → trả `package_key`
3. `POST /create/proxy` — tạo proxy list từ `package_key`

## Endpoints chính

| Endpoint | Method | Mô tả |
|----------|--------|-------|
| `/get/tariffs` | GET | Danh sách gói (tariff_id) |
| `/buy/package` | POST | Mua gói → trả `package_key` |
| `/create/proxy` | POST | Tạo proxy list (params: list_name, list_login, rotation_period, country_code, region_name, city, format) |
| `/api/reseller/get/api_tools/{packageKey}` | GET | Lấy proxy của package |
| `/api/reseller/info/package/{packageKey}` | GET | Info package (status, expired_at, traffic usage/limit) |
| `/api/reseller/get/lists` | GET | Danh sách proxy lists |
| `/api/reseller/get/proxy` | GET | Lấy proxy list |
| `PUT /update/{packageKey}` | PUT | Gia hạn (cùng điều kiện gói gốc) |

## Response format

- Proxy format: `login:password@proxy.proxyma.io:10000`
- Create proxy response: `{ result: { status: 200, data: { list_id, login, password, proxy_list: ["login:pass@host:port"] } } }`
- Buy response: `{ result: { status: 200, package_key: "..." } }`
- Package info: `{ result: { status: 200, data: { status, created_at, expired_at, days_left, traffic: { limit, usage } } } }`

## Đặc điểm

- Rotation: tự động phía Proxyma, không cần gọi API
- Renewal: cùng điều kiện gói gốc
- Unlimited proxy lists per package (khuyến nghị <= 2,000)
- Create proxy params required: list_name, list_login, format
