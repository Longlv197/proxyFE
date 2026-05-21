---
name: proxyma-residential-api
description: "API Proxyma reseller — endpoints, auth, response thực tế (verified 2026-05-20 với key thật)"
metadata: 
  node_type: memory
  type: reference
  originSessionId: 23563ca0-6107-4982-a5d1-6d6a9d079c67
---

## Auth & Base

- **Base**: `https://api.proxyma.io`
- **Auth header**: `api-key: <token>` (lowercase header, không phải Bearer)
- **Content-Type**: `application/json` cho POST
- **Errors**: shape `{"result":{"status":<code>,"message":"..."}}` cho 400; Laravel `{"message":"..."}` cho 404/405

## Endpoints — verified 2026-05-20

| Method | Path | Mô tả / Param |
|--------|------|---------------|
| GET  | `/api/reseller/get/balance` | Balance USD (response: `result.message` = số) |
| GET  | `/api/reseller/get/packages` | List package của reseller (title, status, package_key, expired_at, days_left, type) |
| GET  | `/api/reseller/get/tariffs` | List tariff (tariff_id, name, price `"30 $"`, traffic `"10 GB"`) — **5 gói cố định** |
| GET  | `/api/reseller/get/countries` | Tất cả country (object {CODE: Name}) |
| GET  | `/api/reseller/get/regions?country_code=US` | List region (array string) — **bắt buộc country_code** |
| GET  | `/api/reseller/get/cities?country_code=US&region_name=California` | List city — **bắt buộc cả 2** |
| POST | `/api/reseller/buy/package` | `{package_id: N}` → `package_key` |
| POST | `/api/reseller/create/proxy` | body đầy đủ → tạo proxy list (1000 proxies) |
| GET  | `/api/reseller/info/package/{key}` | status, created_at, expired_at, days_left, traffic{limit, usage} |
| GET  | `/api/reseller/get/lists?package_key=X` | Lists trong package (`"List name"`, `"List id"`) |
| GET  | `/api/reseller/get/proxy?package_key=X&list_name=Y&list_id=Z` | **PHẢI gửi cả 3 param** (error message OR'd nhưng required AND) |
| GET  | `/api/reseller/get/api_tools/{key}` | Default proxy của package — HTTPS + SOCKS5 `user:pass@host:port` |
| POST | `/api/reseller/update/{key}` | Renewal — **POST không phải PUT** (memory cũ sai) |

## Tariffs thực tế (snapshot 2026-05-20)

| tariff_id | name | price | traffic |
|-----------|------|-------|---------|
| 8 | Startuna | 5 $ | 1 GB |
| 1 | Nebula Set | 30 $ | 10 GB |
| 2 | Protostar Set | 78 $ | 30 GB |
| 3 | Supernova Set | 160 $ | 80 GB |
| 4 | Pulsar Set | 272 $ | 160 GB |

**Traffic CỐ ĐỊNH theo tariff** — không cho user nhập GB tự do. SP map 1-1 với tariff_id.

## /create/proxy body & response

```json
// Request
{
  "package_key": "9621e4bfb60ef7d28504",
  "list_name": "test-mkt-us-ca",
  "list_login": "mktest001",
  "format": 1,
  "rotation_period": 0,
  "country_code": "US",
  "region_name": "California"   // city optional
}

// Response
{
  "result": {
    "status": 200,
    "message": "List successfully generated",
    "data": {
      "list_id": 20493254,
      "login": "mktest001",
      "password": "unlfqpPjmU",
      "proxy_list": [           // 1000 proxies, port 10000-10999
        "mktest001:unlfqpPjmU@proxy.proxyma.io:10000",
        ...
        "mktest001:unlfqpPjmU@proxy.proxyma.io:10999"
      ]
    }
  }
}
```

## Đặc điểm chốt

1. **Endpoint format: `user:pass@proxy.proxyma.io:PORT`** — hostname **cố định** `proxy.proxyma.io`, port 10000-10999 (1000 proxy/list)
2. **Auth proxy**: user/pass embedded (NOT IP whitelist)
3. **Rotating tự động**: cùng 1 port → mỗi request exit IP residential khác (verified: 3 lần test cùng port → 3 IP khác US)
4. **Exit thật**: residential ISP (Frontier, Comcast, …), country/region khớp param
5. **Format param `format=1`** = `user:pass@host:port` style. Format khác chưa test
6. **rotation_period=0** = rotate mỗi request
7. **1 package → nhiều list** (khác country/region/rotation). Reseller giới hạn ngầm ~2000 list

## Implications cho design Provider

- **Pricing**: cố định theo tariff (per_unit GB không khả thi vì tariff cố định) → admin map SP với `tariff_id`
- **Domain masking đơn giản nhất**: CNAME `gw.mkt-proxy.com → proxy.proxyma.io` (1 record, không wildcard)
- **Lưu order**: chỉ cần `list_id`, `package_key`, `login`, `password`, `host`, `port_start=10000`, `port_end=10999`, `format` → KHÔNG cần lưu 1000 row proxy
- **Render cho user**: build lại 1000 proxy string từ meta (host masked theo config + port range)
- **Multi-list**: 1 đơn user = 1 list = 1000 proxy. Hoặc 1 đơn = N list (mỗi list khác country)

## Liên quan
- [[project_residential_proxy_provider]] — thiết kế provider handler
- [[project_provider_system_wip]] — config-driven framework
- [[project_custom_fields_architecture]] — country/region/city = custom_fields
