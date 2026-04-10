---
name: Log Redesign — viết log cho admin + kỹ thuật đều hiểu
description: TODO LỚN. Redesign toàn bộ log order — mỗi log có hành động + mục đích + file/hàm + mô tả dễ hiểu
type: project
---

## Yêu cầu (05/04/2026)

### Hiện trạng
- Log viết cho dev: "Bắt đầu xử lý", "API thành công", "Hoàn thành" — admin không hiểu
- Thiếu: hành động gì, mục đích gì, file/hàm nào
- "Debug chi tiết" không rõ ý nghĩa

### Yêu cầu mới
Mỗi log phải có:
1. **Động từ + mục đích**: "Mua proxy trên NCC bestproxy.vn" thay vì "Bắt đầu xử lý"
2. **Kết quả rõ**: "✅ Mua thành công — nhận 1 proxy" thay vì "API thành công"
3. **File + hàm** cho kỹ thuật: `[PlaceOrder::processSingleOrder]`
4. **Mô tả ngắn dễ hiểu**: admin đọc biết ngay chuyện gì xảy ra
5. **Debug = request/response/context** — ghi rõ label

### Ví dụ format mong muốn
```
Tạo đơn hàng — trừ 1,438đ từ tài khoản khách
[PlaceOrder] Mua proxy tĩnh trên NCC [bestproxy.vn] — gọi API mua
[PlaceOrder] ✅ Mua thành công — nhận 1/1 proxy (588ms)
[PlaceOrder] ✅ Hoàn thành — đơn hàng sẵn sàng sử dụng
```

### Scope
- PlaceOrder (mua)
- FetchProviderItems (lấy proxy deferred)
- GenericOrderProcessor (xử lý mua)
- ProcessRenewal (gia hạn)
- AutoRotateProxies (xoay)
- Admin actions (retry, refund, confirm...)

### Files liên quan
- `app/Traits/LogsOrderStatus.php` — helper log
- `app/Console/Commands/PlaceOrder.php`
- `app/Console/Commands/FetchProviderItems.php`
- `app/Services/Providers/OrderProcessors/GenericOrderProcessor.php`
- `FE: src/views/Client/Admin/TransactionHistory/OrderDetailModal.tsx` — hiển thị log
