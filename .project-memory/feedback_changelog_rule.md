---
name: Changelog rule — tách FE/BE
description: Sau mỗi session sửa code phải cập nhật changelog đúng guide. BẮT BUỘC.
type: feedback
---

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

**Why:** Dự án 2 repo, dev cần biết thay đổi ở đâu mà không phải đọc git log.
**How to apply:** Cuối mỗi session có sửa code → kiểm tra đã ghi changelog chưa.
