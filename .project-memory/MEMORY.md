# MKT Proxy — Memory Index

## Luôn đọc đầu session
- [⏩ Đang làm tới đâu](project_current_work_state.md) — config engine Spec 1 XONG + ĐÃ DEPLOY PROD (BE+FE). 25/07 đã sửa xong [UI panel Kiểm tra](bug_config_panel_ui_overlap.md) — CHỜ PUSH
- [User preferences](user_preferences.md) — tiếng Việt, đơn giản, production safety
- [Văn phong giao tiếp](feedback_comms_style.md) — thân thiện, dễ hiểu, giải thích thuật ngữ (không quá dày)
- [Người định hướng - máy thực thi](feedback_human_directs_machine_executes.md) — người sở hữu quy trình + kết quả toàn cục; code làm phần tỉ mỉ
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
- [Đọc data cũ trước khi ghi](feedback_check_existing_before_write.md) — PROD: đọc GIÁ TRỊ cũ + check ghi đè, KHÔNG đoán theo local
- Versioning hook (BE 15.N+31): Provider/ServiceType `booted()`→autoLog→ConfigVersion tự động CẢ console/seeder/tinker (fix gap `if(!$user)return null`). Revert config được. Đọc `reference_proxyma_isp_api` mục DEPLOYED.
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
- [Config Panel UX design](project_config_panel_ux_design.md) — thiết kế UX thân thiện panel "Kiểm tra cấu hình" admin (tab riêng, thẻ đọc-trước, Alert). Đọc trước khi sửa UI panel.
- [Provider System](project_provider_system_wip.md) — config-driven + handler plugin
- [Provider Config UX](project_provider_config_redesign.md) — vertical tabs, pipeline steps
- [Response Mapping](project_response_mapping.md) — 2-tier (provider + product)
- [Params Mapping](project_params_mapping_design.md) — 3 lớp + key→param_name mapping
- [Biến chuẩn Proxy](project_standard_variables.md) — params_mapping per-variable
- [Proxyma API](reference_proxyma_api.md) — Residential proxy: endpoints, flow, response format
- [Proxyma ISP API](reference_proxyma_isp_api.md) — Proxy TĨNH: host khác (api.proxyma1.io), mua deferred, spec Swagger sai 2 chỗ

## Features hoàn thành
- [Voucher (mã giảm giá)](project_voucher_system.md) — 06/07: OrderChargeService gom 9 provider charge, total_amount=net, web-only, tiêu mã atomic. Đọc khi sửa charge/provider buy()
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
- [Gem1 Tool API](project_gem_tool_api.md) — 20/04: GemController /api/buy/proxy + /api/gem-orders, auth code+amount (không JWT), Redis lock chống overspend
- [Proxyma Residential](project_residential_proxy_provider.md) — PHASE 2 DEPLOYED 01/06. NEXT: anh quyết hướng refactor A/B/C (xoá Processor 656 dòng vs giữ simple bulk insert 1000 OrderItem). Đọc memory TRƯỚC khi code.

## Bugs
- [Config panel UI đè lên config](bug_config_panel_ui_overlap.md) — ĐÃ SỬA 25/07 (chờ push): tách tab riêng "Kiểm tra" + chấm cảnh báo trên nhãn tab, verify Playwright.
- [Modal Provider — layout/cuộn](bug_provider_modal_layout.md) — gói 1 XONG 25/07 (hết thanh cuộn ngoài, rail tab đứng yên). **Gói 2 (JSON linh hoạt + vỡ layout 1366) và gói 3 (2 nút lưu, chấm rail) CHƯA làm.**
- [HomeProxy utilities + fetch phân trang](project_homeproxy_utilities.md) — DONE 14/07: fix thiếu proxy đơn >20 (phân trang), số dư + nạp tiền QR admin.
- [Reseller residential no proxies](bug_reseller_residential_no_proxies.md) — FIXED 13/07: SP kind=residential giao proxy thường (bestproxy) → reseller API return null sớm → site con kẹt, phải fill tay. Fix: không list_id thì rơi xuống trả proxies.
- [Reseller HomeProxy xoay thiếu protocol](bug_reseller_homeproxy_rotating_protocol.md) — FIXED+DEPLOYED 21/07 (BE 84d8176): đơn reseller HomeProxy XOAY crash `Undefined array key protocol` sau charge → 0 OrderItem → báo nhầm "Missing ApiKey". Fix: ResellerController set protocol cho xoay + null-safe + đổi message. Cứu đơn #14701/#14749 (NCC chưa gọi → không hoàn tiền).
- [HomeProxy rotate 1 phút](bug_homeproxy_rotate_interval.md) — FIXED+DEPLOYED 13/07: cơ chế NCC-tự-xoay (rotation_driver top-level), real_ip=IP exit, log xoay tay. Bài học: thêm api_config cho NCC hardcode → hijack config-driven (2 bug buy+rotate).
- [Auth Flash Debug](bug_auth_flash_debug.md) — ĐANG DEBUG: user nói "auth flash" = gửi log
- [Toast under Modal](bug_toast_under_modal.md) — ĐÃ FIX 26/03
- [Lộ NCC site con](bug_provider_leak_child_site.md) — ĐÃ FIX 02/04
- [Đơn deferred thiếu history](../proxybe-memory/bug_missing_buy_history.md) — ĐÃ FIX 08/04

## Pending design (chưa implement)
- [Typed attributes v2 plan](project_typed_attributes_v2_plan.md) — APPROVED 2026-05-28 nhưng PAUSE (anh chọn làm sau test Proxyma). Mongo `type_service_attributes` 1-1 với MySQL `type_services`, kind def PHP config, KHÔNG đụng orders/API version, helper `ServiceType::attribute($key)` fallback Mongo→metadata.

## TODO
- **RÀ SOÁT BẮT BUỘC**: sau mỗi thay đổi logic → grep provider trong files liên quan → đảm bảo !isChild guard
- [Tier display config](project_tier_display_config.md) — DONE 17/04: price_display_unit tách khỏi time_unit, dropdown mẹ+con, ProxyCard convert × hệ số. Fixed mode + site-level config để sau.
- [Residential Proxy Provider](project_residential_proxy_provider.md) — Phase 1+2 DEPLOYED 01/06. NEXT (chưa làm): refactor architecture A/B/C, renewal `POST /update/{key}`, domain custom site con, IP whitelist Proxyma, multiple lists per package
- [Naming Refactor](project_naming_refactor.md) — CHƯA: rename supplier→provider variables
- Params mapping FE admin UI

## Setup & Reference
- [Server deploy prod](reference_deploy_server.md) — `ssh root@103.77.182.93`, BE `/var/www/proxy` (develop), FE `/var/www/min_proxy` (pm2 `mktproxy-fe`, `bash deploy.sh`). Quy trình deploy đầy đủ.
- [Setup site mẹ/con](project_site_setup_steps.md) — php artisan site:setup, lỗi đã fix
- [_data_field child site](project_data_field_child_site.md) — TODO: FE refactor
- Workspace: `SETUP.md` ở root — clone, config, deploy, supervisor
- Dev mới: đọc `SETUP.md` → `BE/CLAUDE.md` → `FE/CLAUDE.md`
