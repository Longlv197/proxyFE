---
name: User preferences & project context
description: Cách giao tiếp, ưu tiên thiết kế, production safety. ĐỌC ĐẦU TIÊN mỗi session.
type: user
---

## Giao tiếp
- Tiếng Việt
- Ưu tiên giải pháp đơn giản, thực tế
- Không thích over-engineering

## Thiết kế
- UX phải trực quan — admin site con có thể không phải dev
- Config-driven, không hardcode

## Production safety
- Dự án đã chạy production → mọi thay đổi phải đảm bảo không ảnh hưởng logic đang chạy
- Phải trace e2e trước khi báo xong
- Phải chứng minh logic cũ không bị ảnh hưởng
