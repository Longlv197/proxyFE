---
name: Checklist bắt buộc trước khi nói "chờ push"
description: PHẢI chạy checklist này và paste kết quả TRƯỚC KHI báo xong. Không pass = không được báo xong.
type: feedback
---

## Checklist bắt buộc — chạy SAU code, TRƯỚC "chờ push"

**KHÔNG ĐƯỢC nói "chờ push" nếu chưa paste bảng này với kết quả cụ thể.**

| # | Kiểm tra | Cách verify | Pass? |
|---|----------|-------------|-------|
| 1 | **Grep cùng logic** — tất cả nơi dùng cùng pattern đã fix đồng bộ chưa? | `grep -r "keyword" BE/ FE/` — liệt kê từng file, từng dòng | |
| 2 | **Cycle test** — action chạy lần 2, lần 3 có đúng không? | Trace: sau khi xong → state gì → lần chạy tiếp → guard nào → kết quả gì | |
| 3 | **Submit trace** — FE gửi gì → BE nhận gì → validate gì → lưu gì → trả gì? | Đọc code thật từng bước, không mental execution | |
| 4 | **Site mẹ vs site con** — logic có chạy trên cả 2 không? Khác gì? | Check cùng endpoint/processor trên cả 2 context | |
| 5 | **Backward compat** — user cũ, data cũ có bị ảnh hưởng không? | Trace case: data không có field mới → fallback đúng? | |

**Why:** Session 11/04 — mỗi lần bỏ 1 bước → user phải hỏi lại → phát hiện bug mới. 6+ lần liên tiếp. Root cause: vội báo xong, skip verify.

**Quy tắc:** Nếu không paste được bảng này với kết quả cụ thể cho từng dòng → CHƯA XONG → tiếp tục verify.
