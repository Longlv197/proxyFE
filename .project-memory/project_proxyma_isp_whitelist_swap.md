---
name: proxyma-isp-whitelist-swap
description: Proxyma ISP (proxy tĩnh) — whitelist IP + đổi IP (TẮT, NCC bỏ swap-ip) DEPLOYED 25/11; form SP mục "Proxy tĩnh ISP / Gói NCC" + bảng giá live đang làm; SP #46 cấu hình sai chờ sửa lại bằng form mới
metadata:
  type: project
---

Service chung: `app/Services/Providers/ProxymaIspService.php` (đổi tên từ ProxymaIspWhitelistService 25/11/2026). NCC ISP = provider **#13 `proxyma-isp`** (KHÔNG dùng #10 residential: thiếu buy_static + require_host_override=true + sự cố 24/07). Gói test **1657** (ISP-1 $5, mua 25/11, hết hạn 26/12/2026, không gắn đơn web, whitelist `[]`, free_swaps còn 1).

## Whitelist IP — BE c9fcd3d7, DEPLOYED prod 25/11 (HEAD 3b668956) — changelog BE 15.N+88
- Anh chọn: viết RIÊNG cho Proxyma ISP, chỉ site mẹ, DÙNG CHUNG cấu hình whitelist có sẵn (`api_config.ip_whitelist` enabled/max_ips/mode) + endpoint `PUT order-items/{key}/ip-whitelist` & `update-ip-whitelist` — KHÔNG endpoint riêng, FE giữ nguyên UI cũ (UI chỉ nhập 1 IP → max_ips nên 1).
- API (verified gói 1657): POST `/api/isp/packages/{id}/ip-authorize` `{ip:[..]}` · DELETE cùng URL `{ip:"x"}` → cả hai trả MẢNG IP hiện tại (không phải {success}); trùng/xoá-không-có → 200; IP sai → 422 tiếng Nga; nhận ≥11 IP. `authorized_ips` = null / [] / ["ip"].
- Anh yêu cầu: lỗi trả khách CHUNG CHUNG (không lộ message NCC), chi tiết chỉ trong OrderLog.
- Mã gói = provider_order_code (buy trả order_id = id gói). `order_id` nội bộ trong object gói (vd 220527, 310389) KHÔNG dùng được → 404.
- Prod NCC 13 chưa bật `ip_whitelist` → chưa chạy tới khi admin bật.

## Đổi IP — BE 3b668956 DEPLOYED nhưng TẮT — changelog BE 15.N+89
- Proxyma đã BỎ route `GET /api/isp/packages/{package}/swap-ip` (Swagger vẫn ghi): 404 trên cả api.proxyma.io & api.proxyma1.io; PUT cũng 404 (route có thật trả 405) → không đăng ký. Anh: "khả năng họ bỏ API đó rồi, giữ lại code".
- Anh chốt: đổi qua endpoint xoay `proxies/rotate-ip` (nhánh ISP đổi cả gói); cho đổi CẢ KHI HẾT `free_swaps`.
- Cờ `api_config.isp_swap_enabled` (mặc định tắt). `get-key-proxy` trả `can_swap_ip`. **Nút FE "Đổi IP" đã GỠ** (anh yêu cầu 25/11) — chưa có UI.
- Bật lại: sửa URL nếu khác + `"isp_swap_enabled": true` → test gói 1657 → làm lại nút FE.

## Form SP ISP + bảng giá live — CHƯA commit (25/11) — BE 15.N+90, FE 13.N+90
- Form cũ không biết SP ISP: ô "Giá theo số lượng" chỉ hiện khi Proxy Type = Dân cư → admin chọn Dân cư → `kind=residential` dính (không gỡ được qua form); SL mặc định 1 → gói N IP chỉ nhận 1 IP.
- FE `IspPackageSection` (hiện khi NCC kind=isp): chọn gói → tự điền body_api tariff_id, SL min=max=số IP, giá theo gói, isp_*; lưu luôn kind=isp + package. Cảnh báo Dân cư / có Quốc gia / SL sai.
- Bảng giá lấy TRỰC TIẾP NCC: BE `GET admin/isp-providers/{id}/tariffs[?fresh=1]` (cache 10 phút, NCC lỗi → snapshot). Deploy BE cần `php artisan route:cache` (prod cache route).
- NCC 25/11 có 16 gói (1–700 IP); số dư Proxyma $51.5.
- **SP #46 "ISP 3 IP"** đang sai: SL 1/1, proxy_type Dân cư, kind residential, có 10 quốc gia, isp_* chép từ SP 43. Sửa bằng form mới: chọn gói 3 IP, Proxy Type "—", xoá Quốc gia, Lưu. Giá đã nhập: 370.000 / vốn 351.000 (tỷ giá 26.000).

## Liên quan
- [[residential-proxy-provider-proxyma]] · [[prod-ssh-keep-password-login]]
- Gia hạn Proxyma: anh bảo bỏ qua. Reseller `/api/reseller/update/{key}` chỉ POST, body chưa rõ; ISP `/api/isp/packages/{id}/update` (POST) body chỉ `promo`.
