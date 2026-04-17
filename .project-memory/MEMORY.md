# MKT Proxy — Memory Index

## Luôn đọc đầu session
- [User preferences](user_preferences.md) — tiếng Việt, đơn giản, production safety
- [Project structure](reference_project_structure.md) — tech stack, auth, security, file locations
- [Changelog rule](feedback_changelog_rule.md) — tách FE/BE, format, cuối session phải ghi

## Quy tắc bắt buộc (đọc trước khi code)
- [Quy trình dev](feedback_dev_process.md) — review 3 lớp + chứng minh TRƯỚC khi báo xong
- [E2E trace](feedback_e2e_trace.md) — verify xuyên suốt input→DB, không từng method rời
- [Verify UX flow](feedback_verify_ux_flow.md) — verify PHẢI bao gồm UX, không chỉ data path
- [Ẩn NCC site con](feedback_hide_provider_child.md) — TUYỆT ĐỐI không lộ provider info trên site con
- [Branding colors](feedback_branding_colors.md) — KHÔNG hardcode màu, dùng CSS vars / useBranding()
- [Không toast success](feedback_no_success_toast.md) — dùng inline feedback thay toast
- [Redis memory](feedback_redis_memory_control.md) — TTL, LTRIM, compact keys
- [Migration safety](feedback_migration_safety.md) — hasColumn/listIndexes trước add/drop
- [api_config merge](feedback_api_config_merge.md) — BE merge không replace, trace round-trip
- [Config UI](feedback_config_ui_principles.md) — trực quan, config-driven, ghi đè có ngữ cảnh
- [Review against design](feedback_review_against_design.md) — đọc design doc TRƯỚC khi suy luận
- [Tự verify trước khi báo xong](feedback_self_verify.md) — trace e2e + grep logic đồng bộ TRƯỚC khi nói "chờ push"
- [Checklist bắt buộc trước push](feedback_verify_checklist.md) — PHẢI paste bảng 5 điểm với kết quả CỤ THỂ trước khi nói "chờ push"

## Kiến trúc core
- [Multi-site](project_multisite_architecture.md) — site mẹ vs site con, phân quyền, data flow
- [Quy trình mua hàng](project_order_flow.md) — flow order, provider mapping, site mẹ vs site con
- [Order Lock Flow](project_order_lock_flow.md) — Redis lock, backup fetch-pending-orders, retry
- [Product Code Migration](project_product_code_migration.md) — ID→CODE cho giao tiếp giữa sites

## Pricing (đọc khi liên quan đến giá/chiết khấu)
- [Pricing System](project_pricing_system.md) — 4 cấp giá, detectMarkupPercent(), fix 11/04 qty_tiers+markup
- [Quantity Tiers](project_quantity_tiers.md) — chiết khấu theo SL, fix 11/04 recalculate theo user markup
- [Renewal System](project_renewal_system.md) — v3 locks+CB, v4 unified params, SP override

## Provider & Config (đọc khi sửa NCC/config)
- [Provider System](project_provider_system_wip.md) — config-driven + handler plugin
- [Provider Config UX](project_provider_config_redesign.md) — vertical tabs, pipeline steps
- [Response Mapping](project_response_mapping.md) — 2-tier (provider + product)
- [Params Mapping](project_params_mapping_design.md) — 3 lớp + key→param_name mapping
- [Biến chuẩn Proxy](project_standard_variables.md) — params_mapping per-variable
- [Proxyma API](reference_proxyma_api.md) — Residential proxy: endpoints, flow, response format

## Features hoàn thành
- [Proxy object chuẩn](project_proxy_object_cleanup.md) — format {value, protocol, ip, port}
- [Auto Rotate](project_auto_rotate_redesign.md) — scan 10s + worker BLPOP
- [Child Site Rotate](project_child_site_rotate.md) — site con poll
- [Deferred Proxy Fetch](project_deferred_proxy_fetch.md) — config-driven
- [Report & Affiliate](project_report_redesign.md) — order_histories, shared affiliate_percent
- [Provider Report](project_provider_report.md) — actual/expected, vốn NCC, margin, renewal
- [Admin Manual Resolve](project_admin_manual_resolve.md) — timeout, confirm, import proxy
- [Expired Deposit](project_expired_deposit_flow.md) — admin cộng tiền lệnh nạp hết hạn
- [IP Whitelist Sync](project_ip_whitelist_sync.md) — sync site con→mẹ, mode both, flow xoay
- [Custom Fields](project_custom_fields_architecture.md) — 3 lớp key/provider_value/label, ẩn NCC
- [Country Flag](project_country_flag_custom_field.md) — admin UX + preview dùng ProxyCard

## Bugs
- [Auth Flash Debug](bug_auth_flash_debug.md) — ĐANG DEBUG: user nói "auth flash" = gửi log
- [Toast under Modal](bug_toast_under_modal.md) — ĐÃ FIX 26/03
- [Lộ NCC site con](bug_provider_leak_child_site.md) — ĐÃ FIX 02/04
- [Đơn deferred thiếu history](../proxybe-memory/bug_missing_buy_history.md) — ĐÃ FIX 08/04

## TODO
- **RÀ SOÁT BẮT BUỘC**: sau mỗi thay đổi logic → grep provider trong files liên quan → đảm bảo !isChild guard
- [Tier display config](project_tier_display_config.md) — DONE 17/04: price_display_unit tách khỏi time_unit, dropdown mẹ+con, ProxyCard convert × hệ số. Fixed mode + site-level config để sau.
- [Residential Proxy Provider](project_residential_proxy_provider.md) — CHƯA LÀM: NCC bán theo GB
- [Naming Refactor](project_naming_refactor.md) — CHƯA: rename supplier→provider variables
- Params mapping FE admin UI

## Setup & Reference
- [Setup site mẹ/con](project_site_setup_steps.md) — php artisan site:setup, lỗi đã fix
- [_data_field child site](project_data_field_child_site.md) — TODO: FE refactor
- Workspace: `SETUP.md` ở root — clone, config, deploy, supervisor
- Dev mới: đọc `SETUP.md` → `BE/CLAUDE.md` → `FE/CLAUDE.md`
