---
name: Project structure & tech stack
description: Tech stack, cấu trúc thư mục, auth layers. Đọc khi cần biết file ở đâu.
type: reference
---

## Tech Stack
- **FE**: Next.js 15 (App Router), MUI 6, TanStack Query, NextAuth 4
- **BE**: Laravel (API tại `https://api.mktproxy.com/api`)

## Files quan trọng
- Dev guide FE: `FE/DEVELOPER-GUIDE.md` (changelog section 13)
- Dev guide BE: `BE/DEVELOPER-GUIDE.md` (changelog section 15)
- Changelog tổng hợp: `CHANGELOG.md` (root)

## Auth
- 2 layer: `middleware.ts` (route protection) + `useAxiosAuth` (token interceptor)
- API hooks: `FE/src/hooks/apis/` — dùng `useAxiosAuth()`, KHÔNG dùng `fetch()` trực tiếp

## Security (ĐÃ IMPLEMENT 02/04)
- Middleware `api_admin`: tự apply cho mọi route `api/admin/*` → user thường 403
- Model `$hidden`: ServiceType (api_body, api_type, cost_price...), Provider (token_api, api_config)
- Log xoay: site con admin thấy log nhưng BE strip provider_code/request/response
- Route `GET /api/proxies` đã xóa (public, lộ ALL OrderItems)
