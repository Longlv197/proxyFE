---
name: proxyma-isp-whitelist-swap
description: Proxyma ISP (proxy tĩnh) — whitelist IP xong (commit c9fcd3d7, chưa deploy, NCC 13 chưa bật ip_whitelist); đổi IP code xong nhưng TẮT (cờ isp_swap_enabled) vì Proxyma đã bỏ route swap-ip
metadata:
  type: project
---

Service chung: `app/Services/Providers/ProxymaIspService.php` (đổi tên từ ProxymaIspWhitelistService 25/11/2026). Gói test **1657** (ISP-1 $5, mua 25/11, hết hạn 26/12/2026, không gắn đơn web, whitelist `[]`, free_swaps còn 1) — dùng để test sau deploy.

## Whitelist IP — BE commit c9fcd3d7 (develop), CHƯA deploy — changelog BE 15.N+88
- Anh chọn: viết RIÊNG cho Proxyma ISP, chỉ site mẹ, DÙNG CHUNG cấu hình whitelist có sẵn (`api_config.ip_whitelist` enabled/max_ips/mode) + endpoint `PUT order-items/{key}/ip-whitelist` & `update-ip-whitelist` — KHÔNG endpoint riêng, FE giữ nguyên UI cũ.
- API (verified gói 1657): POST `/api/isp/packages/{id}/ip-authorize` `{ip:[..]}` · DELETE cùng URL `{ip:"x"}` → cả hai trả MẢNG IP hiện tại (không phải {success}); trùng/xoá-không-có → 200; IP sai → 422 tiếng Nga; nhận ≥11 IP. `authorized_ips` = null / [] / ["ip"].
- Anh yêu cầu: lỗi trả khách CHUNG CHUNG (không lộ message NCC), chi tiết chỉ trong OrderLog.
- Mã gói = provider_order_code (buy trả order_id = id gói). `order_id` nội bộ trong object gói (vd 220527, 310389) KHÔNG dùng được → 404.
- Prod NCC 13 chưa bật `ip_whitelist` → chưa chạy tới khi admin bật.

## Đổi IP — code xong, TẮT — changelog BE 15.N+89, FE 13.N+90
- Proxyma đã BỎ route `GET /api/isp/packages/{package}/swap-ip` (Swagger vẫn ghi): 404 trên cả api.proxyma.io & api.proxyma1.io; PUT cũng 404 (route có thật trả 405) → không đăng ký. Anh: "khả năng họ bỏ API đó rồi, giữ lại code".
- Anh chốt: dùng lại endpoint/nút Xoay (`proxies/rotate-ip` → nhánh ISP đổi cả gói); cho đổi CẢ KHI HẾT `free_swaps`.
- Cờ `api_config.isp_swap_enabled` (mặc định tắt) — vì prod NCC 13 có sẵn URL `swap_ip`. `get-key-proxy` trả `can_swap_ip` → FE chỉ hiện nút "Đổi IP" (chi tiết đơn, cạnh nút Xuất) khi true.
- Bật lại: sửa URL nếu khác + `"isp_swap_enabled": true` → test gói 1657.

## Liên quan
- [[residential-proxy-provider-proxyma]] · [[prod-ssh-keep-password-login]]
- Gia hạn Proxyma: anh bảo bỏ qua. Reseller `/api/reseller/update/{key}` chỉ POST, body chưa rõ; ISP `/api/isp/packages/{id}/update` (POST) body chỉ `promo`.
