---
name: typed-attributes-v2-plan
description: "Thiết kế ĐÃ DUYỆT (chưa implement) — Mongo type_service_attributes + PHP kind config, KHÔNG đụng orders/api version. Chờ finish test Proxyma + push pending."
metadata:
  type: project
---

## Status: APPROVED 2026-05-28, PENDING (anh chọn phương án c — làm sau khi finish test Proxyma + push các pending)

## Pain points anh nói

1. `type_services.metadata` JSON "túi rác" — không khoa học
2. `purchase_options[]` generic key/source/depends_on → API consumer khó hiểu nghĩa
3. Thêm loại mới phải đụng nhiều chỗ
4. "Thêm thuộc tính nào để nó ra ngoài thì hợp lý đối với từng loại" — wants typed shape per kind

## Quyết định kiến trúc (đã chốt với anh)

### Storage
- **MySQL `type_services`**: KHÔNG đụng. `orders.service_type_id` FK giữ nguyên (anh không có ý đụng orders).
- **Mongo `type_service_attributes`** (collection NEW): 1-1 optional với `type_services`, lưu `{type_service_id, kind, attributes: {...typed per kind}}`. Chỉ SP mới hoặc SP đã migrate có doc này.
- **Migration**: KHÔNG cần migrate big-bang. SP cũ vẫn dùng `metadata` legacy. SP mới tạo sau khi v2 LIVE → đi qua Mongo. Anh chuyển từng SP cũ qua khi muốn (admin UI).

### Kind definition: PHP config (KHÔNG Mongo)
- File: `config/proxy_kinds.php`
- Lý do: business rule (residential cần tariff), thay đổi cực hiếm. Git → code review trước khi deploy → an toàn production. IDE type-safe.
- Anh đã đồng ý PHP config (chốt 2026-05-28).
- Mongo chỉ lưu **instance per SP** (`type_service_attributes`), không lưu schema.

### API: KHÔNG bump version v2
- Cùng endpoint `GET /api/services/{slug}` thêm field mới `attributes` (typed) bên cạnh `custom_fields` legacy.
- Consumer mới: đọc `attributes`. Consumer cũ: vẫn `custom_fields`. Coexist.
- KHÔNG có `/api/v2/*` routes. KHÔNG có v2 OrderProcessor.

### Order placement: KHÔNG đụng
- Order processor (vd `ProxymaResidentialProcessor`) đọc value qua helper trên ServiceType model:
  - `$service->attribute('tariff')` — fallback Mongo `attributes` → MySQL `metadata` (legacy).
- Cách này coexist tự nhiên — không if-else theo schema_version.

## Architecture diagram

```
MySQL type_services (không đụng)
   id=42, slug, kind, name, price, metadata={legacy}
       ↓ 1-1 optional
Mongo type_service_attributes (NEW)
   {type_service_id:42, kind:'residential',
    attributes:{tariff:'1gb', countries:['us'], regions:{us:[...]}, ...}}

PHP config/proxy_kinds.php (source-of-truth definition)
   ['residential' => ['attributes' => [tariff=>[...], countries=>[...], ...]]]

API GET /api/services/{slug}
   → MySQL row + Mongo doc (nếu có) → response merge
   → {id, slug, kind, attributes: typed, custom_fields: legacy}

ServiceType::attribute(key)  ← helper, fallback Mongo → metadata
```

## Naming convention quan trọng

- **`type_service_attributes`** (KHÔNG `service_type_v2`) — tên này misleading như "version 2 của SP", thực ra nó là **extension typed per kind**.
- Advisor đã flag điểm này — em đã đổi.

## Pain point CHƯA hỏi rõ anh

**"Người nối API" là ai?** Câu trả lời quyết định scope:
- Developer khách hàng dùng SDK → cần OpenAPI spec + docs + versioning chặt (+3 ngày)
- Site con resell → cần backward compat resp shape qua `MktProxyResellerProcessor` (+2 ngày)
- Dev team internal → chỉ cần code clean (scope như estimate)

Phải hỏi anh khi quay lại implement.

## Scope estimate (~3-5 ngày PoC)

| Item | File |
|---|---|
| `config/proxy_kinds.php` + `KindDefinition` contract | 2 file |
| Mongo migration `type_service_attributes` collection | 1 file |
| Mongo model `TypeServiceAttribute` | 1 file |
| Helper `ServiceType::attribute($key)` với Mongo fallback | sửa model |
| `ServiceTypeController` merge attributes vào response | sửa controller |
| Admin UI: form generator từ `proxy_kinds.php` | 2-3 file FE |
| Doc API attributes shape | 1 markdown |

**0 file legacy đụng** trong order flow. **15-20 file new** mostly.

## Cross-DB cost (advisor flag)

Mỗi v2 SP detail load = 1 MySQL + 1 Mongo query. Cần cache merged result keyed `service_type_id`. Tận dụng pattern cache đã có (xem các cache hook hiện tại). Flag trong implement plan.

## Pre-existing legacy đề cập rõ trong doc

`providers.api_config.purchase_options[]` → v2 SPs KHÔNG dùng (kind def trong PHP config thay). Legacy SPs vẫn dùng. State rõ trong README để dev sau không update lẫn.

## Loại đầu tiên đi v2 (PoC)

Chưa chốt. Em khuyến nghị: loại mới hoàn toàn (vd Mobile 4G/5G hoặc NCC mới anh đang nhắm) — PoC sạch, không đụng SP đang LIVE. Hỏi anh khi quay lại.

## Liên quan

- [[project_residential_proxy_provider]] — kiến trúc residential đã LIVE, sẽ là 1 trong các kind cần định nghĩa
- [[project_custom_fields_architecture]] — 3 lớp key/provider_value/label legacy mà v2 sẽ thay
- [[project_provider_system_wip]] — config-driven legacy
- [[feedback_config_ui_principles]] — admin UI form generator phải tuân theo
- [[reference_proxyma_api]] — Proxyma là kind 'residential' điển hình
