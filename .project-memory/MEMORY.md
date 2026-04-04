# MKT Proxy - Project Memory

## Changelog Rule

Sau mỗi session có sửa code/thêm tính năng, **tự động cập nhật changelog**:

**Tách riêng FE/BE:**
- Thay đổi FE → `FE/DEVELOPER-GUIDE.md` section 13
- Thay đổi BE → `BE/DEVELOPER-GUIDE.md` section 15
- Thay đổi cả 2 → ghi ở cả 2 guide, thêm cross-reference + tóm tắt ở `CHANGELOG.md` (root)

**Format:**
- Mục mới: `#### X.N Tiêu đề ngắn` + **Vấn đề / Sửa / Files**
- Nhóm theo ngày (`### DD/MM/YYYY`)
- Ngắn gọn, đủ ý, không dài dòng
- Sửa tính năng cũ → cập nhật mục cũ thay vì tạo mới
- Thay đổi cấu trúc project → cập nhật phần Cấu trúc thư mục

## Project Structure

- **FE**: Next.js 15 (App Router), MUI 6, TanStack Query, NextAuth 4
- **BE**: Laravel (API tại `https://api.mktproxy.com/api`)
- Dev guide FE: `FE/DEVELOPER-GUIDE.md`
- Dev guide BE: `BE/DEVELOPER-GUIDE.md`
- Changelog tổng hợp: `CHANGELOG.md` (root)
- Auth: 2 layer (middleware.ts + useAxiosAuth interceptor)
- API hooks: `FE/src/hooks/apis/` — dùng `useAxiosAuth()`, KHÔNG dùng `fetch()` trực tiếp

## User Preferences

- Giao tiếp bằng tiếng Việt
- Ưu tiên giải pháp đơn giản, thực tế
- Không thích over-engineering
- UX phải trực quan — admin site con có thể không phải dev
- **Dự án đã chạy production** → mọi thay đổi phải đảm bảo không ảnh hưởng logic đang chạy

## Kiến trúc & hệ thống

- [Kiến trúc multi-site](project_multisite_architecture.md) — site mẹ vs site con, phân quyền, data flow
- [Quy trình mua hàng](project_order_flow.md) — flow order, provider mapping, site mẹ vs site con
- [Order Lock Flow](project_order_lock_flow.md) — Redis lock, backup fetch-pending-orders, retry
- [Setup site mẹ/con](project_site_setup_steps.md) — `php artisan site:setup`, lỗi đã fix
- [Product Code Migration](project_product_code_migration.md) — ID→CODE cho giao tiếp giữa sites
- [_data_field child site](project_data_field_child_site.md) — TODO: FE refactor khi bán sản phẩm khác

## Multi-site & Branding

- [Quy tắc màu chủ đạo](feedback_branding_colors.md) — PHẢI đọc khi thêm component/page mới
- KHÔNG hardcode màu → CSS vars / `useBranding()`
- KHÔNG hardcode tên "MKT Proxy" → `useBranding().name`
- Menu/feature: site mẹ → `!isChild`, site con → `isChild`

## Provider & Config

- [Provider System](project_provider_system_wip.md) — ĐÃ DEPLOY: config-driven + handler plugin
- [Provider Config UX](project_provider_config_redesign.md) — ĐÃ IMPLEMENT 29/03: vertical tabs, pipeline steps
- [Response Mapping](project_response_mapping.md) — ĐÃ IMPLEMENT 28/03: 2-tier (provider + product)
- [Params Mapping](project_params_mapping_design.md) — ĐÃ IMPLEMENT: 3 lớp + key→param_name mapping
- [Biến chuẩn Proxy](project_standard_variables.md) — ĐÃ IMPLEMENT 01/04: params_mapping per-variable

## Hệ thống đã hoàn thành

- [Pricing System](project_pricing_system.md) — ĐÃ DEPLOY: 4 cấp giá, per_unit/fixed, quantity tiers, Redis cache
- [Renewal System](project_renewal_system.md) — ĐÃ DEPLOY: v3 locks+CB + v4 unified params + SP override
- [Proxy object chuẩn](project_proxy_object_cleanup.md) — ĐÃ IMPLEMENT 01/04: format {value, protocol, ip, port}
- [Auto Rotate](project_auto_rotate_redesign.md) — ĐÃ IMPLEMENT 30/03: scan 10s + worker BLPOP
- [Child Site Rotate](project_child_site_rotate.md) — ĐÃ IMPLEMENT BE 31/03: site con poll
- [Deferred Proxy Fetch](project_deferred_proxy_fetch.md) — ĐÃ IMPLEMENT 24/03: config-driven
- [Quantity Tiers](project_quantity_tiers.md) — ĐÃ IMPLEMENT: chiết khấu theo SL
- [Report & Affiliate](project_report_redesign.md) — ĐÃ IMPLEMENT 01/04: order_histories, shared affiliate_percent
- [Admin Manual Resolve](project_admin_manual_resolve.md) — ĐÃ DEPLOY: timeout, confirm, import proxy
- [Expired Deposit](project_expired_deposit_flow.md) — ĐÃ DEPLOY: admin cộng tiền lệnh nạp hết hạn

## Bugs

- [Toast under Modal](bug_toast_under_modal.md) — ĐÃ FIX 26/03
- [Auth Flash Debug](bug_auth_flash_debug.md) — ĐANG DEBUG: user nói "auth flash" = gửi log
- [Lộ NCC site con](bug_provider_leak_child_site.md) — ĐÃ FIX 02/04: middleware api_admin + model $hidden + BE strip log

## Setup Guide

- **Workspace**: `SETUP.md` ở root — hướng dẫn clone, config, deploy, supervisor
- **Dev mới**: đọc `SETUP.md` → `BE/CLAUDE.md` → `FE/CLAUDE.md` → `FE/.project-memory/MEMORY.md`

## Security (ĐÃ IMPLEMENT 02/04)

- Middleware `api_admin`: tự apply cho mọi route `api/admin/*` → user thường 403
- Model `$hidden`: ServiceType (api_body, api_type, cost_price...), Provider (token_api, api_config)
- Log xoay: site con admin thấy log nhưng BE strip provider_code/request/response
- Route `GET /api/proxies` đã xóa (public, lộ ALL OrderItems)

## IP Whitelist & Sync

- [IP Whitelist Sync](project_ip_whitelist_sync.md) — ĐÃ FIX 03/04: sync site con→mẹ, mode both, flow xoay

## TODO

- **⚠️ RÀ SOÁT BẮT BUỘC**: Sau mỗi thay đổi logic, rà soát lộ thông tin NCC trên site con (provider_code, provider_name, URL NCC, api_config). Grep `provider` trong files đã sửa + liên quan → đảm bảo có `!isChild` guard. Không báo xong nếu chưa rà soát.
- [Naming Refactor](project_naming_refactor.md) — CHƯA: rename supplier→provider variables
- Params mapping FE admin UI

## Feedback (quy tắc bắt buộc)

- [Quy trình dev](feedback_dev_process.md) — review 3 lớp + chứng minh TRƯỚC khi báo xong
- [Branding colors](feedback_branding_colors.md) — KHÔNG hardcode màu, dùng CSS vars
- [Không toast success](feedback_no_success_toast.md) — dùng inline feedback thay toast
- [Redis memory](feedback_redis_memory_control.md) — TTL, LTRIM, compact keys
- [Migration safety](feedback_migration_safety.md) — hasColumn/listIndexes trước add/drop
- [api_config merge](feedback_api_config_merge.md) — BE merge không replace, trace round-trip
- [E2E trace](feedback_e2e_trace.md) — verify xuyên suốt input→DB, không từng method rời
- [Config UI](feedback_config_ui_principles.md) — trực quan, config-driven, ghi đè có ngữ cảnh
- [Review against design](feedback_review_against_design.md) — đọc design doc TRƯỚC khi suy luận
- [Ẩn NCC site con](feedback_hide_provider_child.md) — TUYỆT ĐỐI không lộ provider info trên site con
- [Verify UX flow](feedback_verify_ux_flow.md) — verify PHẢI bao gồm UX (admin thấy gì, hiểu gì), không chỉ data path
