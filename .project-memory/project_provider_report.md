---
name: Provider Report — Báo cáo tài chính NCC
description: ĐÃ IMPLEMENT 06/04 — report:provider_daily tách actual/expected, vốn NCC từ provider_invoices, margin, renewal, active proxies
type: project
---

## Bảng liên quan

| Bảng | Loại | Vai trò |
|---|---|---|
| `provider_statistics` | MySQL | Report tổng hợp per provider per ngày (cron hourly) |
| `orders` | MySQL | Đơn hàng mua mới — nguồn doanh thu/chi phí mua |
| `order_histories` | MySQL | Lịch sử gia hạn — nguồn doanh thu/chi phí gia hạn |
| `order_items` | MongoDB | Proxy items — đếm active proxies |
| `provider_invoices` | MongoDB | Hoá đơn/topup NCC — vốn đổ vào NCC (không theo ngày) |

## Công thức

### Doanh thu

| Loại | Công thức | Nguồn |
|---|---|---|
| **Doanh thu thực tế** | SUM(total_amount - refunded_amount) WHERE status IN (expired, partial_refunded) | orders đã kết thúc, không tranh chấp thêm |
| **Doanh thu dự kiến** | SUM(total_amount) WHERE status IN (in_use, in_use_partial) | orders đang dùng, chưa hết hạn |

### Chi phí

| Loại | Công thức | Nguồn |
|---|---|---|
| **Chi phí đơn hàng (actual)** | SUM(total_cost_final) WHERE status IN (expired, partial_refunded) | Giá vốn đơn đã xong |
| **Chi phí đơn hàng (expected)** | SUM(total_cost_final) WHERE status IN (in_use, in_use_partial) | Giá vốn đơn đang dùng |
| **Vốn đổ vào NCC** | SUM(provider_invoices.amount) WHERE paid_date IS NOT NULL | Topup, phí tháng, setup... — tổng cộng dồn, KHÔNG per-day |

### Lợi nhuận

| Loại | Công thức |
|---|---|
| **Lợi nhuận thực tế** | actual_revenue - actual_cost |
| **Lợi nhuận dự kiến** | expected_revenue - expected_cost |
| **Margin %** | actual_profit / actual_revenue × 100 |

### Số dư NCC

```
total_invested     = SUM(provider_invoices.amount WHERE paid)
total_order_cost   = SUM(provider_statistics.actual_cost + renewal_cost)
estimated_balance  = total_invested - total_order_cost
```

### Gia hạn (từ order_histories)

```
renewal_orders   = COUNT(order_histories WHERE type=renewal, status IN (in_use, expired))
renewal_revenue  = SUM(order_histories.amount)
renewal_cost     = SUM(order_histories.cost_amount)
```

### Proxy metrics

```
active_proxies        = COUNT(order_items WHERE status=0, expired_at > now(), service_type thuộc provider)
total_proxies_delivered = SUM(orders.delivered_quantity)
total_proxies_failed    = SUM(orders.quantity - orders.delivered_quantity)
```

## Command

```bash
php artisan report:provider_daily           # Chạy cho hôm nay
php artisan report:provider_daily 2026-04-05 # Chạy cho ngày cụ thể
```

Schedule: hourly (Kernel.php)

## provider_statistics columns

### Per-day (report hàng ngày)
- total_orders, successful_orders, failed_orders, partial_orders
- total_revenue, total_cost, total_profit, margin_percent
- actual_revenue, actual_cost, actual_profit
- expected_revenue, expected_cost, expected_profit
- total_refunds
- renewal_orders, renewal_revenue, renewal_cost
- total_proxies_delivered, total_proxies_failed, active_proxies
- success_rate, avg_response_time_ms, uptime_percent

### Summary (tổng hợp qua ProviderStatistic::summary())
- Tất cả fields trên (SUM/AVG)
- total_invested, estimated_balance — từ provider_invoices (tổng cộng dồn)

## provider_invoices (hoá đơn NCC)

Lưu trữ **vốn đổ vào NCC** — KHÔNG phải chi phí per-day:
- Types: topup, monthly_fee, setup_fee, bandwidth, other
- Payment: bank_transfer, crypto, balance, other
- attachments: array URLs (ảnh bill upload qua /upload-image?folder=invoices)
- paid_date: khi nào thanh toán (dùng để tính total_invested)

**Why tách khỏi report per-day:** 1 lần topup 5 triệu không thuộc ngày cụ thể nào. Nó là vốn tích luỹ. Chi phí thực tế per-day = giá vốn đơn hàng (orders.total_cost_final).

## FE hiển thị

**ModalStatistic.tsx** (modal thống kê NCC):
- Row 1: Tổng quan (đơn mua, gia hạn, tỷ lệ OK, proxy, margin, hoàn tiền)
- Row 2: Thực tế vs Dự kiến (DT/CP/LN mỗi bên)
- Row 3: Vốn NCC (tổng đã nạp, số dư ước tính, DT gia hạn)
- Chart 1: BarChart — DT thực tế + DT dự kiến + CP thực tế + LN thực tế
- Chart 2: LineChart — Đơn mua + Gia hạn + Proxy hoạt động
- Chart 3: LineChart — Margin % + Tỷ lệ thành công %

## Files

### BE
- `ReportProviderStatistic.php` — command tổng hợp per-day
- `ProviderStatistic.php` — model + summary() + compareProviders()
- `ProviderStatisticController.php` — API show + dashboard
- `ProviderInvoice.php` — model hoá đơn (MongoDB)
- `ProviderInvoiceController.php` — CRUD + upload attachments

### FE
- `ModalStatistic.tsx` — modal thống kê (summary cards + charts)
- `ProviderInvoiceTab.tsx` — tab hoá đơn (CRUD + upload ảnh bill)
- `ModalAddProvider.tsx` — modal edit NCC, tab Hoá đơn
- `useProviders.ts` — hooks: useProviderStatistics, useProviderInvoices, etc.
