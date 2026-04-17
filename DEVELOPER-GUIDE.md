# MKT Proxy - Frontend Developer Guide

> File tham khảo cho developer maintain dự án FE.
> Cập nhật mỗi khi có thay đổi quan trọng.

---

## Mục lục

1. [Tech Stack](#1-tech-stack)
2. [Cấu trúc thư mục](#2-cấu-trúc-thư-mục)
3. [Environment Variables](#3-environment-variables)
4. [API Configuration](#4-api-configuration)
5. [Multi-site & Branding](#5-multi-site--branding)
6. [Quản lý sản phẩm (ServiceType)](#6-quản-lý-sản-phẩm-servicetype)
7. [Authentication Flow](#7-authentication-flow)
8. [Data Fetching Pattern](#8-data-fetching-pattern)
9. [FE ↔ BE API Reference](#9-fe--be-api-reference)
10. [Routing & Middleware](#10-routing--middleware)
11. [Quy tắc khi phát triển](#11-quy-tắc-khi-phát-triển)
12. [Partner Proxy Delivery — Quy trình lấy proxy từ đối tác](#12-partner-proxy-delivery--quy-trình-lấy-proxy-từ-đối-tác)
13. [Changelog - Các vấn đề đã sửa](#13-changelog---các-vấn-đề-đã-sửa)
14. [Known Issues — Danh sách vấn đề cần xử lý](#14-known-issues--danh-sách-vấn-đề-cần-xử-lý)

---

## 1. Tech Stack

| Thành phần        | Công nghệ                          |
| ----------------- | ---------------------------------- |
| Framework         | Next.js 15.4.8 (App Router)       |
| Language          | TypeScript 5.5                     |
| UI                | MUI 6 + Tailwind CSS 3.4          |
| State (global)    | Redux Toolkit + React Redux        |
| State (server)    | TanStack React Query 5             |
| Table             | TanStack React Table 8             |
| Auth              | NextAuth 4 (JWT strategy)          |
| HTTP              | Axios                              |
| Form              | React Hook Form + Yup/Zod          |
| i18n              | i18next + react-i18next            |
| Realtime          | Socket.IO                          |

---

## 2. Cấu trúc thư mục

```
FE/
├── src/
│   ├── @core/              # Core utilities, types, theme helpers
│   ├── @layouts/           # Layout system (shared across pages)
│   ├── @menu/              # Navigation & menu context
│   ├── app/                # Next.js App Router (xem chi tiết bên dưới)
│   ├── components/         # Shared components (UI, modals, form, auth guards...)
│   ├── config/             # Runtime config (api.ts - URL tập trung)
│   ├── configs/            # Static config (i18n, theme, breakpoints...)
│   ├── constants/          # App constants
│   ├── data/               # Navigation data, search data, dictionaries
│   ├── hocs/               # HOCs & hooks liên quan auth/routing
│   │   ├── useAxiosAuth.tsx  # ← Axios interceptor: gắn token + auto-logout 401
│   │   ├── AuthGuard.tsx     # Server-side auth guard cho layout
│   │   ├── GuestOnlyRoute.tsx# Chặn user đã login vào trang login/register
│   │   ├── TranslationWrapper.tsx # Wrapper i18n cho layout
│   │   └── useRandomString.tsx
│   ├── hooks/              # Custom hooks
│   │   ├── apis/           # ← Tất cả hooks gọi API (React Query)
│   │   ├── useClientAuthGuard.tsx  # Client-side auth check (chỉ check NextAuth status)
│   │   └── useRole.tsx     # Hook lấy role user
│   ├── libs/
│   │   ├── axios.ts        # Axios singleton instance (baseURL = PUBLIC_API_URL)
│   │   └── auth.ts         # NextAuth config (providers, callbacks, JWT strategy)
│   ├── locales/            # File dịch (vi, en, cn, ko, ja)
│   ├── store/              # Redux store (chỉ có userSlice - lưu thông tin user)
│   ├── types/              # TypeScript types
│   ├── utils/              # Utility functions (serverSessionValidation, helpers...)
│   ├── views/              # Page view components
│   │   ├── Auth/           #   Login, Register, Reset password...
│   │   └── Client/         #   Xem chi tiết bên dưới
│   └── middleware.ts       # Route protection (JWT check, role check)
│
├── .env.development        # Dev environment
├── .env.production         # Production environment
├── next.config.ts
├── tsconfig.json
└── package.json
```

### App Router Routes

```
app/[lang]/
├── (landing-page)/         # Public: trang chủ, about, cooperate, hotline
├── (public)/               # Public: login, register, check-proxy, reset-password...
├── (private)/(client)/     # ← Cần auth
│   ├── admin/              #   Admin dashboard, quản lý user, giao dịch
│   ├── overview/           #   Tổng quan tài khoản
│   ├── products/           #   Danh sách proxy
│   ├── recharge/           #   Nạp tiền
│   ├── transaction-history/#   Lịch sử giao dịch
│   ├── history-order/      #   Lịch sử đơn hàng
│   ├── affiliate/          #   Chương trình affiliate
│   ├── profile/            #   Thông tin cá nhân
│   └── contact/            #   Liên hệ
├── api/                    # API routes (xem chi tiết bên dưới)
└── docs/                   # Tài liệu API (Redoc)
```

### Views/Client (Page Components)

```
views/Client/
├── Admin/                  # Quản lý admin (dashboard, users, giao dịch)
├── Affiliate/              # Chương trình affiliate
├── CheckProxy/             # Kiểm tra proxy
├── HistoryLogin/           # Lịch sử đăng nhập
├── HistoryOrder/           # Lịch sử đơn hàng
├── OrderProxy/             # Đặt mua proxy
├── OrderRotatingProxy/     # Đặt proxy xoay
├── Overview/               # Tổng quan tài khoản
├── Partner/                # Đối tác
├── Profile/                # Thông tin cá nhân
├── Recharge/               # Nạp tiền
├── ResetPassword/          # Đặt lại mật khẩu
├── RotatingProxy/          # Proxy xoay (landing)
├── StaticProxy/            # Proxy tĩnh (landing)
├── TransactionHistory/     # Lịch sử giao dịch
└── VerifyEmail/            # Xác minh email
```

### API Routes (Next.js Route Handlers)

```
app/api/
├── admin/                  # Admin endpoints (proxy server-side)
├── auth/                   # NextAuth [...nextauth] route
├── buy-proxy/              # Mua proxy
├── check-proxy/            # Kiểm tra proxy
├── countries/              # Danh sách quốc gia
├── docs/                   # API docs
├── get-dashboard-by-date/  # Dashboard theo ngày
├── login/                  # Login
├── me/                     # User info (POST /api/me)
├── partners/               # Đối tác
├── proxy-static/           # Proxy tĩnh
├── test-token/             # Test token validity
└── withdrawal-user/        # Rút tiền
```

### Path Aliases (tsconfig)

```
@/*        → src/*
@core/*    → src/@core/*
@layouts/* → src/@layouts/*
@menu/*    → src/@menu/*
@components/* → src/components/*
@configs/* → src/configs/*
@views/*   → src/views/*
@assets/*  → src/assets/*
```

---

## 3. Environment Variables

| Variable | Mục đích |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | API URL cho client (browser). Dev: `http://127.0.0.1:8002/api` |
| `API_URL` | API URL cho server (SSR/RSC). Thường giống `NEXT_PUBLIC_API_URL` |
| `NEXT_PUBLIC_APP_URL` | URL frontend — **chỉ cho SEO metadata**, KHÔNG dùng để fetch API |
| `NEXT_PUBLIC_APP_NAME` | Tên hiển thị của site (VD: `MKT Proxy`, `VN Proxy`) |
| `NEXT_PUBLIC_SITE_DESCRIPTION` | Mô tả ngắn hiển thị trên SEO & header |
| `NEXT_PUBLIC_LOGO_PATH` | Đường dẫn logo (relative to `/public`) |
| `NEXT_PUBLIC_FAVICON_PATH` | Đường dẫn favicon |
| `NEXT_PUBLIC_API_DOCS_URL` | Base URL hiển thị trong trang tài liệu API |
| `NEXT_PUBLIC_SOCKET_URL` | URL WebSocket server |
| `NEXT_PUBLIC_PRIMARY_COLOR` | Màu chủ đạo (HEX). VD: `#FC4336` |
| `NEXT_PUBLIC_PRIMARY_HOVER` | Màu hover. VD: `#e63946` |
| `NEXT_PUBLIC_PRIMARY_GRADIENT` | Gradient chính. VD: `linear-gradient(45deg, #FC4336, #F88A4B)` |
| `NEXTAUTH_SECRET` | JWT secret cho NextAuth |
| `NEXTAUTH_BASEPATH` | Base path NextAuth |

> **Lưu ý quan trọng:** `NEXT_PUBLIC_APP_URL` là URL frontend, KHÔNG phải API. Tuyệt đối không dùng biến này để gọi API.

---

## 4. API Configuration

### Cấu trúc tập trung

Tất cả API URL được quản lý tại **`src/config/api.ts`**:

```typescript
export const PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL!   // Client-side
export const SERVER_API_URL = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL!  // Server-side
```

### Luồng sử dụng

```
Client component  →  useAxiosAuth()  →  axiosInstance (src/libs/axios.ts)  →  PUBLIC_API_URL
Server component  →  fetch() với SERVER_API_URL  (từ src/config/api.ts)
```

### Quy tắc

- **Client-side:** Luôn dùng `useAxiosAuth()` (tự gắn token + auto-logout khi 401)
- **Server-side:** Import `SERVER_API_URL` từ `@/config/api`
- **KHÔNG** hardcode URL API trong bất kỳ file nào
- **KHÔNG** dùng `NEXT_PUBLIC_APP_URL` để gọi API

---

## 5. Multi-site & Branding

### Kiến trúc

Hệ thống hỗ trợ deploy nhiều site con (white-label) từ **cùng 1 source code**. Mỗi site chỉ khác nhau file `.env`.

```
Site mẹ (MKT Proxy)          Site con (VN Proxy)
├── .env.production           ├── .env.production    ← chỉ khác file này
├── src/ (giống nhau)         ├── src/ (giống nhau)
└── public/                   └── public/
    └── images/logo/              └── images/logo/   ← logo riêng
```

### siteConfig.ts

Tất cả thông tin branding được đọc từ env vars qua file `src/configs/siteConfig.ts`:

```typescript
export const siteConfig = {
  name: process.env.NEXT_PUBLIC_APP_NAME || 'MKT Proxy',
  url: process.env.NEXT_PUBLIC_APP_URL || 'https://mktproxy.com',
  apiUrl: process.env.NEXT_PUBLIC_API_URL || '...',
  logo: process.env.NEXT_PUBLIC_LOGO_PATH || '/images/logo/Logo_MKT_Proxy.png',
  primaryColor: process.env.NEXT_PUBLIC_PRIMARY_COLOR || '#FC4336',
  primaryHover: process.env.NEXT_PUBLIC_PRIMARY_HOVER || '#e63946',
  primaryGradient: process.env.NEXT_PUBLIC_PRIMARY_GRADIENT || '...',
  // ...
}
```

### CSS Variables

Màu sắc được inject vào CSS variables tại `layout.tsx`:

```
siteConfig.primaryHover   → --primary-hover
siteConfig.primaryGradient → --primary-gradient
```

CSS variables này ghi đè giá trị mặc định trong `css-variables.css`. Các component sử dụng `var(--primary-gradient)` sẽ tự động nhận màu mới.

### Tạo site con mới (Hướng dẫn Admin)

1. **Copy `.env.example`** → `.env.production`
2. **Sửa các giá trị**:
   - `NEXT_PUBLIC_APP_NAME` → Tên site mới
   - `NEXT_PUBLIC_APP_URL` → Domain site mới
   - `NEXT_PUBLIC_API_URL` → API URL (có thể trỏ về site mẹ hoặc API riêng)
   - `NEXT_PUBLIC_PRIMARY_COLOR` → Màu chủ đạo
   - `NEXT_PUBLIC_PRIMARY_HOVER` → Màu hover
   - `NEXT_PUBLIC_PRIMARY_GRADIENT` → Gradient chính
3. **Thay logo**: Đặt file logo vào `public/images/logo/`, cập nhật `NEXT_PUBLIC_LOGO_PATH`
4. **Deploy**: Build & deploy với file `.env.production` mới

### Tạo site con mới (Hướng dẫn Developer)

Site mẹ và site con chia sẻ cùng codebase. Khác biệt:

| | Site mẹ | Site con |
|---|---|---|
| **API** | Kết nối trực tiếp nhiều Partner (nguồn proxy) | Kết nối 1 nguồn (site mẹ hoặc partner ngoài) |
| **Backend** | Full DB, quản lý Partner, User, Order | Có thể dùng chung BE hoặc deploy BE riêng |
| **Frontend** | `.env` với branding site mẹ | `.env` với branding site con |

**Thêm nguồn proxy mới (Partner)**:
1. Tạo record trong bảng `partners` (Model: `Partner`)
2. Tạo ServiceType với `partner_id` trỏ đến partner mới
3. Implement logic gọi API partner trong `ProxyController`

---

## 6. Quản lý sản phẩm (ServiceType)

### Thiết kế Status

Mỗi sản phẩm (ServiceType) có 2 boolean độc lập:

| Field | Kiểu | Mô tả |
|---|---|---|
| `status` | enum(`active`, `inactive`) | Hiển thị trên listing hay không |
| `is_purchasable` | boolean (default: `true`) | Cho phép mua hay không |

**Ma trận hành vi**:

| status | is_purchasable | Kết quả |
|---|---|---|
| `active` | `true` | Hiển thị + mua được ✅ |
| `active` | `false` | Hiển thị + nút mua disabled ⚠️ |
| `inactive` | `true`/`false` | Ẩn hoàn toàn khỏi listing ❌ |

### Tags

Tags (`tag` field) là nhãn hiển thị thuần tuý, **KHÔNG ảnh hưởng logic mua/bán**:
- Ví dụ: `Bảo trì`, `Nhanh`, `Ổn định`, `Hot`, `Mới`
- Hiển thị dưới dạng chip/badge trên card
- Admin tự nhập, không giới hạn

### Note (Mô tả sản phẩm)

Field `note` chứa mô tả chi tiết. Trên card, mô tả hiển thị dạng **expandable**:
- Mặc định: truncate 2 dòng
- Click "Xem thêm" → hiện toàn bộ
- Click "Thu gọn" → thu lại 2 dòng

### Admin Form (Modal)

Admin quản lý ServiceType qua **modal** (không phải page riêng):
- Click "Thêm mới" hoặc "Sửa" → mở `ServiceFormModal`
- **Section 1 "Thông tin cơ bản"**: tên, loại, proxy type, IP version, protocols, quốc gia, 2 switch toggle (hiển thị + cho phép mua)
- **Section 2 "Tags & Mô tả"**: tag input, textarea mô tả
- **Section 3 "Cấu hình kỹ thuật"** (collapsed mặc định): partner, API endpoint, giá vốn, code, API body, multi inputs, bảng giá

---

## 7. Authentication Flow

### Kiến trúc 2 lớp

```
Request → middleware.ts (server-side, check JWT trước khi render)
       → useAxiosAuth interceptor (client-side, auto-logout khi API trả 401)
```

| Layer                  | Vai trò                              | Vị trí                        |
| ---------------------- | ------------------------------------ | ----------------------------- |
| `middleware.ts`        | Chặn route private khi chưa login    | Server-side, trước render     |
| `useAxiosAuth`         | Gắn Bearer token + logout khi 401   | Client-side, mỗi API call    |

### Chi tiết từng thành phần

**`middleware.ts`** — Route guard server-side:
- Check JWT token bằng `next-auth/jwt`
- Phân loại: private routes, admin routes, auth routes (login/register)
- Redirect về login nếu chưa auth, redirect về home nếu đã auth mà vào login

**`useAxiosAuth` (`src/hocs/useAxiosAuth.tsx`)** — Axios interceptor:
- Request interceptor: gắn `Authorization: Bearer <token>`
- Response interceptor: nhận 401 → `signOut()` tự động
- Tất cả hooks API đều dùng hook này thay vì `fetch()` trực tiếp

**`NextAuthProvider`** (`src/app/[lang]/layout.tsx`):
- `refetchInterval={5 * 60}` — refresh session mỗi 5 phút (KHÔNG đặt thấp hơn, sẽ gây lag)
- `refetchOnWindowFocus={true}`

**`useClientAuthGuard`** (`src/hooks/useClientAuthGuard.tsx`):
- Chỉ check `status` từ NextAuth, KHÔNG gọi thêm API
- Dùng cho `ClientAuthGuard` component (hiện loading/empty page khi chưa auth)

### Những thứ đã loại bỏ (không cần, gây thừa request)

- `GlobalSessionCleanup` — đã bỏ khỏi Providers, trùng chức năng với axios interceptor 401
- `fetch('/api/me')` trong useClientAuthGuard — thừa vì middleware + interceptor đã xử lý

---

## 8. Data Fetching Pattern

### Convention cho API hooks

Tất cả hooks API nằm trong `src/hooks/apis/`. Pattern chung:

```typescript
// src/hooks/apis/useExample.ts
import { useQuery } from '@tanstack/react-query'
import useAxiosAuth from '@/hocs/useAxiosAuth'

export const useExample = (params, enabled = true) => {
  const axiosAuth = useAxiosAuth()

  return useQuery({
    queryKey: ['example', ...Object.values(params)],
    queryFn: async () => {
      const res = await axiosAuth.get('/endpoint', { params })
      return res.data
    },
    enabled,
  })
}
```

### Danh sách hooks hiện có

| Hook                           | Endpoint                  | Ghi chú                         |
| ------------------------------ | ------------------------- | -------------------------------- |
| `useDashboard`                 | `/admin/dashboard`        | Dashboard admin                  |
| `useDashboardMonthly`          | `/get-dashboard-by-date`  | Dashboard theo ngày              |
| `useAdminTransactionHistory`   | `/transaction-history`    | Giao dịch admin, server-side pagination |
| `useOrders`                    | `/transaction-history`    | Giao dịch user (client-side)    |
| `useHistoryOrders`             | `/history-order`          | Lịch sử đơn hàng                |
| `useBankQr`                    | `/pending-bank-qr`        | Polling QR nạp tiền             |
| `useDepositHistory`            | `/get-deponsit-history`   | Nạp tiền (admin: tất cả, user: của mình). Max 100 |
| `useDeleteDeposit`             | `/admin/bank-auto/delete` | Admin: soft-delete nạp tiền (mutation) |
| `useCountries`                 | `/countries`              | Danh sách quốc gia              |
| `useServiceType`               | `/service-type`           | Loại dịch vụ                    |
| `usePartners`                  | `/partners`               | Đối tác                         |
| `useCodeTransactions`          | `/code-transactions`      | Giao dịch mã code               |
| `useTransferName`              | `/transfer-name`          | Tên chuyển khoản                |
| `useUserOrders`                | `/user-orders`            | Đơn hàng user                   |

### Server-side Pagination

Khi dùng server-side pagination (ví dụ `useAdminTransactionHistory`):

```typescript
// Hook truyền params: page, per_page, search, status, date
// Table config:
manualPagination: true
pageCount: serverLastPage  // từ API response
```

Backend cần trả format Laravel paginate: `{ data: [], current_page, last_page, per_page, total }`

### Cache Strategy & Invalidation

> **Nguyên tắc**: Khi mutation thay đổi data → PHẢI invalidate tất cả query liên quan ngay trong `onSuccess`. Không chấp nhận để user thấy data cũ.

#### staleTime theo loại data

| Loại data | staleTime | Lý do |
|-----------|-----------|-------|
| Realtime (QR pending, polling) | 0–10s | Cần cập nhật liên tục |
| Danh sách thay đổi thường xuyên (orders, deposits, transactions, tickets) | 30s | Cân bằng giữa fresh và performance |
| Config/profile (credentials, settings, service types) | 60s–5m | Ít thay đổi, nhưng khi đổi phải invalidate ngay |
| Static/branding (countries, sidebar, branding, announcements) | 10m | Hiếm thay đổi, invalidate khi admin update |

#### Bảng Query Keys & Invalidation Map

| queryKey | staleTime | File | Mutations invalidate |
|----------|-----------|------|---------------------|
| `['myCredentials']` | 5m | `useMyCredentials.ts` | `useRegenerateMyCredentials` + `updateSession()` |
| `['branding-settings']` | 10m | `useBrandingSettings.ts` | `useUpdateBrandingSettings` |
| `['sidebar-settings']` | 10m | `useSidebarSettings.ts` | `useUpdateSidebarSettings` |
| `['supplierSettings']` | 60s | `useSupplierSettings.ts` | `useUpdateSupplierSettings` |
| `['countries']` | 10m | `useCountries.ts` | — (read-only) |
| `['bank-info']` | 10m | `useBankInfo.ts` | — (read-only) |
| `['partners']` | 5m | `usePartners.ts` | `useCreatePartner`, `useUpdatePartner`, `useDeletePartner` |
| `['service-types']` | 60s | `useServiceType.ts` | `useCreateServiceType`, `useUpdateServiceType`, `useDeleteServiceType`, `useCopyServiceType` |
| `['proxyStaticPlans']` | 5m | `useProxyPlans.ts` | Invalidated khi service-type thay đổi |
| `['proxyRotatingPlans']` | 5m | `useProxyPlans.ts` | Invalidated khi service-type thay đổi |
| `['orderProxyStatic']` | 30s | `useOrders.ts` | `useCancelOrder`, `useResendOrder`, `useFillProxies`, `useDeleteOrder` |
| `['orderApiKeys', order_id]` | 30s | `useOrders.ts` | — (read-only) |
| `['userOrders']` | 30s | `useHistoryOrders.ts` | `useCancelOrder`, `useResendOrder`, `useDeleteOrder` |
| `['pending-bank-qr']` | 10s | `useBankQr.ts` | `useCreateBankQr`, `useCancelBankQr` |
| `['depositHistory']` | 30s | `useDeponsitHistory.ts` | `useDeleteDeposit`, `useCreateBankQr`, `useCancelBankQr` |
| `['transactionBank']` | 30s | `useTransactionBank.ts` | `useManualCredit`, `useDismissTransaction`, `useUndismissTransaction` |
| `['transactionBankSummary']` | 30s | `useTransactionBank.ts` | (giống trên) |
| `['code-transactions']` | 30s | `useCodeTransactions.ts` | `useCreateCodeTransaction` |
| `['adminUsers']` | 30s | `useAdminUsers.ts` | `useUpdateUser`, `useAdjustBalance`, `useToggleBan` |
| `['adminUserStats']` | 60s | `useAdminUsers.ts` | — (read-only, nên thêm invalidate khi user thay đổi) |
| `['adminResellers']` | 30s | `useAdminResellers.ts` | `useCreateReseller`, `useUpdateReseller`, `useToggleResellerStatus`, `useRegenerateCredentials`, `useAdjustResellerBalance` |
| `['adminResellerStats']` | 60s | `useAdminResellers.ts` | `useCreateReseller`, `useToggleResellerStatus`, `useAdjustResellerBalance` |
| `['myTickets']` | 30s | `useTickets.ts` | `useCreateTicket` |
| `['adminTickets']` | 30s | `useTickets.ts` | `useRetryPartial`, `useRefundPartial`, `useResolveTicket`, `useUpdateTicketStatus`, `useMarkTicketViewed`, `useAssignTicket` |
| `['partialOrders']` | 30s | `useTickets.ts` | `useRetryPartial`, `useRefundPartial`, `useFillProxies` |
| `['announcements']` | 10m | `useAnnouncements.ts` | `useCreateAnnouncement`, `useUpdateAnnouncement`, `useDeleteAnnouncement` |
| `['admin-announcements']` | 30s | `useAnnouncements.ts` | (giống trên) |
| `['dashboard']` | 60s | `useDashboard.ts` | — (read-only) |
| `['dashboardMonthly']` | 5m | `useDashboard.ts` | — (read-only) |
| `['overview']` | 60s | `useOverview.ts` | — (read-only) |
| `['profile']` | 60s | `useProfile.ts` | — (nên invalidate khi update profile) |
| `['affiliate']` | 60s | `useAffiliate.ts` | — (read-only) |

#### Quy tắc bắt buộc khi viết mutation

```typescript
// ✅ ĐÚNG: Invalidate tất cả query liên quan
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['mainQuery'] })
  queryClient.invalidateQueries({ queryKey: ['relatedQuery'] }) // query phụ thuộc
}

// ❌ SAI: Quên invalidate query liên quan
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['mainQuery'] })
  // Thiếu invalidate relatedQuery → user thấy data cũ!
}
```

#### Session sync khi thay đổi user data

Khi mutation thay đổi data có trong `session.user` (ví dụ `api_key`, `role`, `name`):

```typescript
import { useSession } from 'next-auth/react'

const { update: updateSession } = useSession()

// Trong onSuccess của mutation:
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['myCredentials'] })
  updateSession() // Trigger jwt callback với trigger='update' → fetch /me → sync session
}
```

`auth.ts` callback `jwt` xử lý `trigger === 'update'` bằng cách gọi `/me` để lấy userData mới nhất.

#### Smart polling

Một số query dùng polling thông minh (chỉ poll khi cần):

```typescript
// useBankQr: poll 5s khi có QR pending, 30-60s khi không
refetchInterval: hasPending ? 5000 : 30000

// useHistoryOrders: poll 10s khi có đơn pending, tắt khi không
refetchInterval: hasPendingOrders ? 10000 : false
```

---

## 9. FE ↔ BE API Reference

### Backend Overview

- **Framework:** Laravel (PHP)
- **Base URL:** `https://api.mktproxy.com/api` (production) | `http://127.0.0.1:8002/api` (dev)
- **Auth:** JWT (`Authorization: Bearer <token>`) via `middleware: auth:api`
- **Admin check:** `role == 0` trong bảng `users`

### Database Tables chính

| Table         | Model      | Mô tả                            |
| ------------- | ---------- | --------------------------------- |
| `users`       | `User`     | Tài khoản, sodu (số dư), role    |
| `dongtien`    | `Dongtien` | Lịch sử giao dịch (mua/hoàn/nạp)|
| `bank_auto`   | `BankAuto` | Lịch sử nạp tiền (QR, webhook, manual) |
| `orders`      | `Order`    | Đơn hàng proxy                   |
| `api_keys`    | `ApiKey`   | Key proxy đã mua                 |

### API Endpoints — Mapping FE → BE

#### Deposit (Nạp tiền) — bảng `bank_auto`

| FE Hook | Method | BE Route | Controller | Mô tả |
|---------|--------|----------|------------|-------|
| `useDepositHistory` | GET | `/get-deponsit-history` | `UserController::deponsitHistory` | **Chung 1 API**: admin thấy tất cả, user thấy của mình. Max 100 bản ghi. Params: `page`, `per_page`, `status` |
| `useDeleteDeposit` | DELETE | `/admin/bank-auto/delete` | `BankQrController::adminDelete` | Admin: soft-delete 1 hoặc nhiều bản ghi (`{ ids: [1,2,3] }`) |
| — | POST | `/admin/bank-auto/{id}/credit` | `BankQrController::adminCredit` | Admin: cộng tiền thủ công |
| `useBankQr` | POST | `/create-bank-qr` | `BankQrController::store` | User: tạo QR nạp tiền |
| `useBankQr` | GET | `/pending-bank-qr` | `BankQrController::pending` | User: kiểm tra QR pending |
| — | DELETE | `/cancel-bank-qr/{id}` | `BankQrController::cancel` | User: hủy QR pending |

#### Transaction (Giao dịch) — bảng `dongtien`

| FE Hook | Method | BE Route | Controller | Mô tả |
|---------|--------|----------|------------|-------|
| `useAdminTransactionHistory` | GET | `/transaction-history` | `TransactionHistoryController::getTransactionHistory` | Tất cả giao dịch trừ NAPTIEN |
| `useOrders` | GET | `/transaction-history` | (giống trên) | Client-side pagination |
| — | POST | `/cancel-order/{id}` | `TransactionHistoryController::cancelOrder` | Hủy đơn failed + hoàn tiền |
| — | POST | `/resend-order/{id}` | `TransactionHistoryController::resendOrder` | Gửi lại đơn failed |

#### Dashboard & Report

| FE Hook | Method | BE Route | Controller |
|---------|--------|----------|------------|
| `useDashboard` | GET | `/admin/dashboard` | `DashboardController::getDashboard` |
| `useDashboardMonthly` | GET | `/get-dashboard-by-date` | `DashboardController::getDashboardByDate` |

#### Dongtien Types (bảng `dongtien.type`)

| Constant | Giá trị | Ý nghĩa |
|----------|---------|---------|
| `TYPE_NAPTIEN` | `NAPTIEN` | Nạp tiền tự động |
| `TYPE_NAPTIEN_PAY2S` | `NAPTIEN_PAY2S` | Nạp qua pay2s webhook |
| `TYPE_NAPTIEN_MANUAL` | `NAPTIEN_MANUAL` | Admin nạp thủ công |
| `TYPE_THANHTOAN` | `THANHTOAN` | Mua proxy v3 |
| `TYPE_THANHTOAN_V4` | `THANHTOAN_V4` | Mua proxy v4 |
| `TYPE_GIAHAN` | `GIAHAN` | Gia hạn v3 |
| `TYPE_GIAHAN_V4` | `GIAHAN_V4` | Gia hạn v4 |
| `TYPE_RUT_HOA_HONG_AFFILIATE` | `RUT_HOA_HONG_AFFILIATE` | Rút hoa hồng |

#### BankAuto Status (bảng `bank_auto.status`)

| Giá trị | Ý nghĩa |
|---------|---------|
| `pending` | Đang chờ thanh toán |
| `success` | Nạp thành công |
| `failed` | Nạp thất bại |
| `expired` | Hết hạn (chưa thanh toán) |
| `cancelled` | User đã hủy |

#### BankAuto Soft-Delete

Bảng `bank_auto` dùng soft-delete qua 2 cột:
- `is_deleted` (boolean) — `true` = đã xóa
- `deleted_by` (int) — ID user xóa

Model có **Global Scope** `notDeleted` tự động ẩn record đã xóa. Admin dùng `withoutGlobalScope('notDeleted')` để xem tất cả.

---

## 10. Routing & Middleware

### Ngôn ngữ hỗ trợ

`vi` | `en` | `cn` | `ko` | `ja` — URL format: `/{lang}/route`

### Phân loại route trong middleware

| Loại           | Routes                                                              | Xử lý                              |
| -------------- | ------------------------------------------------------------------- | ----------------------------------- |
| Private        | overview, order-proxy, history-order, affiliate, transaction-history, dashboard, admin | Redirect → login nếu chưa auth    |
| Admin          | admin/*                                                              | Check role = admin                  |
| Auth           | login, register                                                      | Redirect → home nếu đã auth        |
| Public         | Còn lại                                                              | Cho qua                            |

### Skip middleware

Static files (`/_next`, `.`), API routes (`/api`) được skip sớm để tối ưu performance.

---

## 11. Quy tắc khi phát triển

### Thêm API hook mới

1. Tạo file trong `src/hooks/apis/`
2. Dùng `useAxiosAuth()`, KHÔNG dùng `fetch()` trực tiếp
3. QueryKey phải unique và chứa đủ params để cache đúng
4. Export interface cho params nếu cần

### Thêm route mới

1. Tạo thư mục trong `app/[lang]/(private)/(client)/` hoặc `(public)/`
2. Nếu cần auth → thêm route name vào `privateRoutesSet` trong `middleware.ts`
3. Nếu là admin → thêm vào cả `adminRoutesSet`
4. Tạo view component trong `src/views/Client/`

### Thêm component mới

- Shared/reusable → `src/components/`
- Chỉ dùng cho 1 page → `src/views/Client/{Feature}/`
- Form inputs → `src/components/form/`
- Modals → `src/components/modals/`

### Lưu ý performance

- `NextAuthProvider refetchInterval` phải >= 300 (5 phút). Thấp hơn sẽ gây re-render liên tục → page đơ
- Không tạo thêm layer check session ngoài middleware + useAxiosAuth
- Dùng debounce cho search inputs (400ms)
- Server-side pagination cho table > 50 rows

### Quy tắc sử dụng màu chủ đạo (Branding Colors)

Hệ thống hỗ trợ **multi-site branding** — mỗi site con có thể cấu hình màu riêng qua Admin > Cài đặt chung > Màu sắc. Khi thêm component mới, **KHÔNG hardcode màu** mà dùng CSS variables hoặc `useBranding()`.

#### CSS Variables có sẵn

| Variable | Dùng cho | Ví dụ |
|---|---|---|
| `--primary-gradient` | Gradient cho button chính, menu active, progress bar | `background: var(--primary-gradient)` |
| `--primary-hover` | Màu đơn cho text, border, icon, link | `color: var(--primary-hover)` |
| `--primary-contrast` | Màu text trên nền primary (tự tính trắng/đen) | `color: var(--primary-contrast)` |

#### Cách dùng trong CSS file

```css
/* ✅ Đúng */
.my-button {
  background: var(--primary-gradient, linear-gradient(45deg, #FC4336, #F88A4B));
  color: var(--primary-contrast, #fff);
}
.my-link {
  color: var(--primary-hover, #e63946);
}
.my-card:hover {
  border-color: color-mix(in srgb, var(--primary-hover, #e63946) 40%, transparent);
}

/* ❌ Sai — không hardcode */
.my-button {
  background: linear-gradient(45deg, #FC4336, #F88A4B);
  color: #ef4444;
}
```

#### Cách dùng trong TSX (inline style)

```tsx
// ✅ Đúng — dùng CSS variable
<div style={{ background: 'var(--primary-gradient)' }}>
<span style={{ color: 'var(--primary-hover, #e63946)' }}>

// ✅ Đúng — dùng useBranding() khi cần giá trị JS
import { useBranding } from '@/app/contexts/BrandingContext'

const { primaryHover, primaryGradient, primaryColor } = useBranding()
<div style={{ borderColor: primaryHover }}>

// ❌ Sai
<div style={{ background: 'linear-gradient(45deg, #FC4336, #F88A4B)' }}>
```

#### Khi nào dùng CSS variable vs useBranding()?

| Trường hợp | Dùng |
|---|---|
| CSS file (`.css`) | `var(--primary-hover)`, `var(--primary-gradient)` |
| Inline style tĩnh (không cần JS) | `var(--primary-hover)` trong string |
| Cần giá trị JS (tính toán, condition) | `useBranding().primaryHover` |
| MUI sx prop | `var(--primary-hover)` hoặc `useBranding()` |
| Server component | `siteConfig.primaryColor` (env var) |

#### MUI Theme

MUI `primary.main` được sync từ DB qua `BrandingThemeSync` component. Nên `variant='contained'` và `variant='outlined'` tự nhận màu đúng. **Không cần** thêm `color='warning'` hay hardcode sx.

```tsx
// ✅ Đúng — MUI tự dùng primary từ DB
<Button variant='contained'>Mua ngay</Button>
<Button variant='outlined'>Nạp tiền</Button>

// ❌ Sai — override bằng color warning/error cho nút không phải lỗi
<Button variant='contained' color='warning'>Kiểm tra</Button>
```

#### Checklist khi thêm tính năng mới

- [ ] Button chính: dùng `var(--primary-gradient)` hoặc MUI `variant='contained'`
- [ ] Button phụ (outlined): dùng `var(--primary-hover)` cho border/text hoặc MUI `variant='outlined'`
- [ ] Link/text accent: `color: var(--primary-hover)`
- [ ] Border hover: `border-color: color-mix(in srgb, var(--primary-hover) 40%, transparent)`
- [ ] Box shadow: dùng `rgba(0,0,0,0.15)` (neutral), **KHÔNG** dùng `rgba(252,67,54,0.3)` (hardcode)
- [ ] Skeleton loading: dùng `color-mix(in srgb, var(--primary-hover) 15%, white)` cho accent
- [ ] Tên site: `useBranding().name` hoặc `siteConfig.name`, **KHÔNG** hardcode "MKT Proxy"
- [ ] Kiểm tra cả dark mode (nếu có)

### BE: Field `proxys` vs `api_key` trong ApiKey

Bảng `api_keys` có 2 field quan trọng liên quan proxy data:

| Field | Dùng cho | Nội dung | Processors |
|-------|----------|----------|------------|
| `proxys` | Proxy tĩnh (static) + phần lớn proxy xoay | JSON chứa `IP:port:user:pass` | HomeProxy, ZingProxy, MktProxy, UpProxy |
| `api_key` | Proxy xoay ProxyVN | Key xoay từ partner (VD: `"keyxoay"`) | ProxyVnRotatingProcessor |

**Tại sao khác nhau?**
- Đa số partner trả về `IP:port:user:pass` cố định → lưu vào `proxys`
- ProxyVN rotating trả về 1 **key xoay** (dùng key này để rotate IP tự động) → ghi đè vào `api_key`

**Khi retry partial (mua bù):**
- Processors check `empty($k->proxys)` để tìm ApiKey chưa có proxy
- Riêng `ProxyVnRotatingProcessor` check `empty($k->api_key)` vì dữ liệu nằm ở field khác

**Lưu ý khi thêm partner mới:**
- Nếu partner trả IP:port:user:pass → lưu vào `proxys`, check `proxys` khi retry
- Nếu partner trả rotating key → lưu vào `api_key`, check `api_key` khi retry

### BE: `failOrderWithRefund` vs `handleProcessorFailure`

Hai hàm xử lý order fail với retry logic giống nhau (retry 3 lần → FAILED + Telegram), nhưng **caller khác nhau**:

| Hàm | Nằm ở | Gọi bởi | Khi nào chạy |
|-----|-------|---------|-------------|
| `failOrderWithRefund()` | `BasePartner` | Processor (trong `processOrder()`) | Processor **tự bắt lỗi** và gọi hàm này |
| `handleProcessorFailure()` | `PlaceOrder` command | PlaceOrder worker | **Safety net** — chỉ chạy khi processor fail mà **chưa tự update status** |

**Flow:**
1. PlaceOrder gọi `$processor->processOrder($order)`
2. Nếu processor gặp lỗi → processor gọi `failOrderWithRefund()` → set PENDING/FAILED → return `['success' => false]`
3. PlaceOrder nhận `success=false` → check `$order->status !== PROCESSING`
   - Nếu TRUE (processor đã xử lý) → **không làm gì thêm**
   - Nếu FALSE (processor crash giữa chừng, chưa update status) → gọi `handleProcessorFailure()` làm safety net

**TODO:** Cân nhắc gộp 2 hàm nếu logic phức tạp hơn trong tương lai. Hiện tại giữ tách vì caller context khác nhau.

---

## 12. Partner Proxy Delivery — Quy trình lấy proxy từ đối tác

Hệ thống có 2 pattern lấy proxy từ đối tác, tùy thuộc vào cách partner trả dữ liệu:

### Pattern 1: Instant (1 bước) — ProxyVn, UpProxy

```
PlaceOrder → processOrder() → Gọi API partner → Partner trả proxy ngay → Lưu DB → Finalize order
```

- Partner trả proxy **trong response** luôn, không cần chờ
- `processOrder()` xử lý toàn bộ: gọi API → lưu proxy → finalize
- Status flow: `PENDING → PROCESSING → IN_USE`

**Files**: `ProxyVnRotatingProcessor.php`, `UpProxyStaticProcessor.php`

| Partner | Loại | Giao thức |
|---------|------|-----------|
| proxy.vn | Rotating | GET, trả array proxy + status 100 |
| upproxy.net | Static | POST JSON, trả `data.proxies[]` |

### Pattern 2: Async (2 bước) — HomeProxy

```
Bước 1: PlaceOrder → processOrder() → Gọi API tạo order → Lưu id_order_partner → Set AWAITING_PARTNER
Bước 2: fetch-partner-proxies (mỗi phút) → Scan AWAITING_PARTNER → Gọi API lấy proxy → Lưu DB → Finalize
```

- Partner **không trả proxy ngay** — phải đợi partner xử lý (vài giây đến vài phút)
- `processOrder()` chỉ làm bước 1: tạo order + lưu `id_order_partner` + set status `awaiting_partner` (10)
- Command `fetch-partner-proxies` chạy mỗi phút scan status 10, gọi API lấy proxy
- Timeout 30 phút — quá hạn thì fail order
- Status flow: `PENDING → PROCESSING → AWAITING_PARTNER → IN_USE`

**Files**:
- Bước 1: `HomeProxyRotatingProcessor.php`, `HomeProxyStaticProcessor.php`
- Bước 2: `FetchPartnerProxies.php` (command)

| Partner | Loại | Giao thức |
|---------|------|-----------|
| homeproxy.vn | Rotating | POST JSON tạo order → `getOrderByOrderId()` lấy proxy |
| homeproxy.vn | Static | POST JSON tạo order → `getProxiesByOrderId()` lấy proxy |

### Chống duplicate & Error handling (chung cho cả 2 pattern)

| Cơ chế | Mô tả |
|--------|-------|
| **Idempotency (1-step)** | `markPartnerCalled()` / `wasPartnerCalled()` — nếu partner đã gọi mà DB lỗi → lock order, không gọi lại |
| **Idempotency (2-step)** | `getExistingPartnerOrderId()` — nếu đã có `id_order_partner` → skip gọi API, set `awaiting_partner` luôn |
| **DB retry + lock** | `saveProxiesToDb()` retry 1 lần nếu DB lỗi, vẫn lỗi → `lockOrder()` (partner đã trả proxy, cần admin check) |
| **3-layer anti-dup** | Enqueue lock (Redis setNx) → Processing lock → Status check |

### Partners không còn dùng

| Partner | File | Lý do |
|---------|------|-------|
| mktproxy.com | `MktProxyRotatingProcessor.php` | Comment out trong PartnerFactory |
| zingproxy.com | `ZingProxyRotatingProcessor.php` | Comment out trong PartnerFactory |

### Quy trình thêm nhà cung cấp mới

> Xem: **`BE/DEVELOPER-GUIDE.md`** → Section 5.4

---

## 13. Changelog - Các vấn đề đã sửa

### 17/04/2026

#### 13.N+35 Fix label thời gian theo time_unit (sản phẩm bán theo tháng)

**Vấn đề:** Sản phẩm `time_unit=month` vẫn hiển thị label "ngày" / "Tuần" / "Tháng" theo logic hardcode của đơn vị ngày → sai nghĩa (7 tháng hiện "Tuần", "Gia hạn N ngày" khi renew tháng).

**Sửa (scope hẹp — 3 file):**
- `ProxyCard.getDurationLabel`: branch theo `provider.time_unit`. `month` → trả "Tháng"/"Năm"/"N tháng"; `day` giữ nguyên mapping cũ
- `OrderDetail`: renewal label "Gia hạn X ngày" (dòng 1074) + "Số ngày:" (dòng 1124) → dùng biến `unitLabel` đã có sẵn từ `perUnit?.time_unit`
- `CustomPriceModal`: label `${d} ngày` → `${d} ${serviceType?.time_unit === 'month' ? 'tháng' : 'ngày'}`

**Files:**
- `src/app/[lang]/(private)/(client)/components/proxy-card/ProxyCard.tsx`
- `src/views/Client/HistoryOrder/OrderDetail.tsx`
- `src/views/Client/Admin/ServiceType/CustomPriceModal.tsx`

**Backward compat:** `time_unit=day` hoặc null → giữ hành vi cũ, zero regression.

**Chưa fix (sẽ làm đợt khác khi anh báo):** RotatingProxyPage.getDurationLabel (plan đã có time_unit, chỉ cần truyền vào); Admin OrderDetailModal dòng 781/888/1279/1531 + OrderDetail:827 renewal history — cần BE bổ sung `time_unit` trong response `orders` / `order_histories`.

### 28/03/2026

#### 13.N+34 Response Mapping + Bảng mapping biến + Data Visibility cho admin

**Thêm:**
- `ModalAddProvider`:
  - ResponseMappingTable — bảng dynamic rows cho admin lưu thêm field custom từ NCC response
  - **Bảng mapping biến** (SavePreviewBox) — tự động build từ config, hiện rõ từng dòng: `Hệ thống (OrderItem) ← NCC (response)`. Admin nhìn 1 phát biết biến nào của mình lấy từ biến nào của NCC, theo từng loại proxy format (key/string/fields) + response_mapping custom.
- `OrderDetailModal`:
  - OrderRawDataPanel — expandable panel hiện toàn bộ Order data nội bộ (tài chính, chi tiết, timestamps, note, metadata)
  - ExpandableItemRow — click proxy row → expand chi tiết: proxy object, metadata, provider fields, thông tin chung
  - Cột Metadata trong bảng proxy

**Files:** `ModalAddProvider.tsx`, `OrderDetailModal.tsx`, `ServiceFormModal.tsx`

**Chi tiết ngôn ngữ:**
- Bỏ thuật ngữ: "response" → "kết quả trả về", "metadata" → "dữ liệu bổ sung", "proxy object" → "thông tin proxy", "NCC" → "nhà cung cấp"
- Bảng tóm tắt mapping: 4 cột tiếng Việt (Thông tin lưu / Mô tả / Lấy từ nhà cung cấp / Lưu vào đâu)
- OrderDetailModal: tất cả label tiếng Việt (Mã đơn nội bộ, Giá vốn/đơn vị, Đã gọi NCC → Rồi/Chưa...)
- ServiceFormModal: thêm section "Lưu thêm dữ liệu từ nhà cung cấp" per sản phẩm, override mặc định NCC

#### 13.N+23 SessionSync so sánh chính xác sodu/role

**Sửa:** SessionSync so sánh theo giá trị `sodu` và `role` cụ thể thay vì object reference — tránh re-render vô hạn khi object mới nhưng data giống.

**Files:** `StoreProvider.tsx`

#### 13.N+24 User status FAILED hiện "Đang xử lý" + ORDER_STATUS_COLORS_ADMIN

**Sửa:** Order status FAILED phía user hiện "Đang xử lý" (cam) thay vì "Thất bại". Admin vẫn giữ "Thất bại" (đỏ). Thêm `ORDER_STATUS_COLORS_ADMIN` map riêng cho admin views.

**Files:** `orderStatus.ts`, `OrderDetailModal.tsx`, `ResolveTicketDialog.tsx`

#### 13.N+25 Admin OrderDetail — tab Lịch sử gia hạn + log panel

**Thêm:**
- Tab "Lịch sử gia hạn" trong OrderDetailModal admin
- Log panel bên phải hiện request/response/headers chi tiết
- `CodeBlock` component: nút copy + resize tự do (draggable)
- Modal mở rộng `lg` khi log panel active

**Files:** `OrderDetailModal.tsx`

#### 13.N+26 Provider form — renew config visual tables

**Sửa:** Renew config trong provider form chuyển từ JSON thô sang visual tables (`RenewParamsTable`, `DurationMapSection`). Labels dễ hiểu cho admin. Inherit params thêm dropdown `proxy.loaiproxy`. Fix TDZ lỗi `ORDER_STATUS_COLORS_ADMIN`.

**Files:** `ModalAddProvider.tsx`

#### 13.N+27 Bảng đơn hàng user/admin — gộp cột + UX

**Sửa:** Gộp cột bảng đơn hàng cho gọn. Thêm hover highlight row, nút "Xem sản phẩm" truy cập nhanh.

**Files:** `OrderDetailModal.tsx`, `AdminOrdersPage.tsx`

#### 13.N+28 HistoryLogItem — thêm request/response fields

**Thêm:** Interface `HistoryLogItem` bổ sung fields `request` và `response` để hiển thị trong log panel.

**Files:** `useRenewal.ts`

---

### 26/03/2026

#### 13.N+20 Fix UX gia hạn + toast bị modal đè + export proxy format

**Sửa:**
- Toast bị modal đè: chuyển ToastContainer ra `createPortal(_, document.body)` — thoát stacking context `div.relative.z-10`
- confirm() → MUI Dialog cho renewal retry/dismiss. Tất cả dialog: đóng trước rồi toast sau
- Status order_histories đúng ý nghĩa: 4=Đang sử dụng, 5=Hết hạn (không còn status 2 refund)
- Text "Tiền đã được hoàn lại" → "Liên hệ admin" (không tự hoàn nữa)
- User không thấy lỗi kỹ thuật ("Provider returned error") → thấy "Liên hệ admin"

**Thêm:**
- Tab Gia hạn trong OrderDetail user — bảng chi tiết: lần, ngày, thời hạn, tiền, hết hạn cũ→mới, trạng thái
- Section Gia hạn trong OrderDetail admin — hiện giữa info cards và tabs
- Export proxy chọn format: protocol (HTTP/SOCKS5) + file (TXT/CSV/JSON)
- Badge RENEWAL + REFUND_RENEWAL trong trang dòng tiền + filter dropdown
- Debug chi tiết trong log tab (auth_type, auth_param, headers)
- Field auth_param riêng cho renew config khi không dùng inherit

**Files:** `OrderDetail.tsx`, `OrderDetailModal.tsx`, `ToastProvider.tsx`, `LayoutProvider.tsx`, `layout.tsx`, `AdminOrdersPage.tsx`, `TableTransactionHistory.tsx`, `ModalAddProvider.tsx`, `useOrderHistories.ts`

---

### 26/03/2026

#### 13.N+20 Admin Queue Monitor — real-time worker visibility

**Thêm:**
- `useQueueStatus.ts` — hook GET /admin/queue-status (refetch 5s) + mutation clear circuit breaker
- `QueueMonitorPage.tsx` — queue lengths, worker heartbeat (đang xử lý order nào, item nào, progress), circuit breakers (nút Mở lại), activity log table (100 entries)
- Menu "Queue Monitor" trong sidebar admin (chỉ site mẹ)

**Files:** `useQueueStatus.ts`, `QueueMonitorPage.tsx`, `VerticalMenu.tsx`, route `admin/queue-monitor/page.tsx`

#### 13.N+21 Admin hoàn tiền gia hạn + History Log panel

**Thêm:**
- `useRenewalRefund()` — mutation POST /admin/renewal-refund (history_id + reason)
- `useOrderHistoryLogs()` — query GET /admin/order-history-logs/{history_id}
- `RenewalHistory` component: status 6 (Hoàn thành 1 phần, cam) + status 7 (Đã hoàn tiền, tím), nút "Hoàn" cho admin (FAILED/IN_USE/PARTIAL), số tiền gạch ngang khi refunded
- `HistoryLogPanel` — expandable row (click lần gia hạn → xem log API calls: time, action, message, HTTP status, ms, item key)
- Admin click row → expand log, click lại → collapse

**Files:** `useRenewal.ts`, `OrderDetail.tsx`, `useOrderHistories.ts`

#### 13.N+22 Admin xác nhận thành công + Fix provider form deferred

**Thêm:**
- `useRenewalConfirm()` — xác nhận gia hạn thành công (history FAILED → IN_USE)
- `useOrderConfirm()` — xác nhận mua hàng thành công (3 case: có proxy / có mã NCC / chưa có)
- OrderDetail: nút "OK" cạnh nút "Hoàn" cho history FAILED/PARTIAL
- AdminOrdersPage: nút ✓ + dialog cho order processing+max_retry, có ô nhập mã đơn NCC

**Sửa:**
- Provider form: load deferred mode bị mất `order_id_field` → fallback `data.proxies` sai. Fix: đọc `order_id_field` khi deferred

**Files:** `useRenewal.ts`, `OrderDetail.tsx`, `AdminOrdersPage.tsx`, `ModalAddProvider.tsx`

---

### 25/03/2026

#### 13.N+19 Hệ thống Gia hạn Proxy — UI + status mới

**Thêm:**
- `useRenewal.ts` — hook POST /renew
- `RenewalDialog.tsx` — dialog chọn thời hạn gia hạn, gradient xanh phân biệt với mua mới
- `OrderDetail.tsx` — nút "Gia hạn tất cả" / "Gia hạn N proxy đã chọn". Message cho status 11 (đang gia hạn) + 12 (gia hạn lỗi)
- `orderStatus.ts` — labels/colors: AWAITING_RENEWAL, RENEWAL_FAILED. Transaction types: RENEWAL, REFUND_RENEWAL
- `ModalAddProvider.tsx` — admin config deferred + fetch_proxies + pagination + renew section

**Files:** `useRenewal.ts`, `RenewalDialog.tsx`, `OrderDetail.tsx`, `orderStatus.ts`, `ModalAddProvider.tsx`

---

### 24/03/2026

#### 13.N+18 Fix hiển thị +/- trước % chiết khấu nhà cung cấp

**Vấn đề:** ProviderPricingModal và CustomPriceModal hardcode dấu `+` trước `markup_percent` → markup âm (giảm giá) hiện sai (`+-5%`).

**Sửa:**
- `ProviderPricingModal.tsx`: hiện `+` khi >0, `-` khi <0, không dấu khi =0. Màu xanh cho giảm giá, vàng cho tăng giá.
- `CustomPriceModal.tsx`: tương tự cho Chip label `vốn+X%` → `vốn-5%` nếu âm.

**Files:** `ProviderPricingModal.tsx`, `CustomPriceModal.tsx`

### 23/03/2026

#### 13.N+17 Drag-and-drop + arrow reorder cho bảng dịch vụ

**Vấn đề:** Admin không thể sắp xếp lại thứ tự hiển thị dịch vụ (ServiceType).

**Sửa:**
- Thêm drag handle column (GripVertical) làm cột đầu tiên — kéo thả để đổi thứ tự
- Thêm nút ChevronUp/ChevronDown trong cột Action — click để di chuyển lên/xuống
- Khi filter/search đang active → ẩn drag handle + arrow buttons (chỉ reorder full list)
- Reorder optimistic: cập nhật local state ngay, gọi API `POST /reorder-service-types` debounced 500ms
- Invalidate query `orderProxyStatic` sau khi API thành công/thất bại
- Dùng `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` (đã cài)

**Files:** `TableServiceType.tsx`

### 22/03/2026

#### 13.N+16 Params 3 lớp — tách key/param_name, hỗ trợ text/number

**Vấn đề:** Purchase options chỉ có `param` (lộ param gốc đối tác), chỉ hỗ trợ type `select`.

**Sửa:**
- ServiceFormModal: tách `key` (nội bộ) + `param_name` (param gốc ẩn), thêm chọn type (select/text/number), đổi label "Body API" → "Params mặc định (JSON)" + helperText giải thích
- ChildServiceFormModal: đồng bộ format key/param_name/type với site mẹ
- CheckoutModal: dùng `key` thay `param`, render text/number input cho field type tương ứng
- ProxyCard: backward compat `field.key || field.param`, hiện "Tự nhập" cho text/number type
- proxy-xoay/page: thêm `metadata`, `pricing_mode`, `time_unit`, `price_per_unit` vào data mapping (thiếu → ProxyCard không nhận được custom_fields)

**Files:** `ServiceFormModal.tsx`, `ChildServiceFormModal.tsx`, `CheckoutModal.tsx`, `ProxyCard.tsx`, `proxy-xoay/page.tsx`

**Cross-ref:** BE thay đổi tương ứng → `BE/DEVELOPER-GUIDE.md` section 15

### 19/03/2026

#### 13.N+15 Dual-write fallback — hỗ trợ field names mới từ MongoDB order_items

**Vấn đề:** BE chuyển đổi field names trong MongoDB order_items (api_key→key, proxys→proxy, api_key_provider→provider_key, plan_type→type, supplier_order_code→provider_order_code). Trong giai đoạn dual-write, API trả về cả format cũ và mới.

**Sửa:** Thêm fallback pattern `item.key || item.api_key` ở tất cả FE files đọc order item fields. Proxy field: `item.proxy || item.proxys`. Provider key: `item.provider_key || item.api_key_provider || item.parent_api_mapping?.supplier_api_key`. Plan type: `item.type || item.plan_type`. Supplier order code: `item.provider_order_code || item.supplier_order_code`.

**Files:** `OrderDetailModal.tsx`, `AdminOrdersPage.tsx`, `OrderDetail.tsx`, `OrderRotatingProxyPage.tsx`

### 17/03/2026

#### 13.N+9 Product Code — hiện id#code, search theo code

**Sửa:** TableServiceType hiện cột `ID#Code`, search theo code. ServiceFormModal thêm input "Mã sản phẩm (Code)". ChildServiceFormModal auto-fill code từ supplier. ProxyCard + PlanCard hiện `id#code`. apiDocsConfig dùng `product_code`.

**Files:** `TableServiceType.tsx`, `ServiceFormModal.tsx`, `ChildServiceFormModal.tsx`, `ProxyCard.tsx`, `RotatingProxyPage.tsx`, `apiDocsConfig.ts`, `useSupplierProducts.ts`

#### 13.N+10 Env vars tối giản + branding từ DB

**Sửa:** Bỏ `NEXT_PUBLIC_APP_URL/APP_NAME/LOGO_PATH/FAVICON_PATH/SITE_DESCRIPTION` → branding 100% từ DB. `.env.production` chỉ cần 4 biến. `siteConfig.ts` chỉ giữ URL + default colors. Bỏ fallback env cho branding.

**Files:** `siteConfig.ts`, `.env.example`, `layout.tsx`, `BrandingContext.tsx`, `getServerBranding.ts`, `generatePageMetadata.ts`, `sitemap.ts`

#### 13.N+11 Upload ảnh SEO-friendly + resolve URL linh hoạt

**Sửa:** FE gửi `field` khi upload (logo/favicon/og-image). Helper `resolveAssetUrl()` ghép domain API tự động — local dùng HTTP, production dùng HTTPS.

**Files:** `SiteSettingsForm.tsx`, `BrandingContext.tsx`, `getServerBranding.ts`

#### 13.N+12 Admin cộng tiền lệnh nạp hết hạn

**Sửa:** Nút $ trên lệnh expired/pending → confirm dialog (thông tin khách, số tiền, ghi chú). Note mặc định cho expired. Hook `useAdminCreditDeposit`.

**Files:** `TabDepositRequests.tsx`, `useDepositManagement.ts`

#### 13.N+13 Fix login button xoay mãi + docs-api reload loop

**Sửa:** LoginForm: `setLoading(false)` cho mọi error type. ApiUsage: `useMyCredentials(isAuth)` — chỉ gọi khi authenticated, tránh 401 → signOut loop.

**Files:** `LoginForm.tsx`, `ApiUsage.tsx`, `useMyCredentials.ts`

### 18/03/2026

#### 13.N+14 API Docs — editable params cho test proxy APIs

**Vấn đề:** Trang API docs có nút "Chạy thử" nhưng dùng giá trị example cố định. User không nhập được proxy key thật để test /proxies/new, /proxies/current, /proxies/rotate-ip.

**Sửa:** Thêm editable input fields cho tham số trước nút "Chạy thử". User nhập key proxy thật → gọi API → xem response. Param values cũng sync vào code examples. `buildUrl()` + `genCode()` nhận `overrides`.

**Files:** `ApiUsage.tsx`

### 15/03/2026

#### 13.N+8 ChildServiceFormModal — thêm fields & cải thiện UX

**Vấn đề:** Form thiếu `proxy_type`, country là text input thay vì dropdown, giá bán không format thousands separator, tag không có preset chips, submitData dùng `api_partner` (đã rename thành `api_provider`).

**Sửa:**
- Thêm field `proxy_type` (select: residential/datacenter) vào form + defaultValues + submitData
- Thêm `proxy_type` và `country` vào submitData
- Country: đổi text input thành Select dropdown với flag icons (dùng `useCountries` hook + flagcdn.com)
- Price: format display với `toLocaleString('vi-VN')` (50.000), lưu raw number
- Tag: thêm preset chips (Hot, New, Cheap, Premium, Best Seller) toggle được, giữ custom input
- Đổi `api_partner` thành `api_provider` trong submitData

**Files:** ChildServiceFormModal.tsx

---

#### 13.N+7 PlanCard layout: tags inline header, price in footer

**Vấn đề:** PlanCard (Rotating Proxy) có tags float absolute trên viền card, giá nằm ở header, footer chỉ có nút mua full-width — không match layout mới của ProxyCard.

**Sửa:**
- Tags: bỏ absolute positioned div, chuyển inline vào header (right side) với compact chip style (padding 3px 10px, fontSize 10.5px, borderRadius 6px)
- Header: bỏ giá, chỉ còn title + tags
- Footer: flex row — giá bên trái ("Giá từ" label + số tiền), nút mua bên phải (compact)
- CSS `styles.css`: thay hardcoded `#f0944e` / `rgba(224,124,80,...)` / `rgba(240,148,78,...)` bằng CSS variables
- ServiceFormModal preview: cập nhật tương tự — tags inline header, price+button footer

**Files:** RotatingProxyPage.tsx, styles.css (RotatingProxy), ServiceFormModal.tsx

---

#### 13.N+6 Fix hardcoded branding trong Cooperate page + border colors toàn codebase

**Vấn đề:** Cooperate components dùng `process.env.NEXT_PUBLIC_APP_NAME` thay vì `useBranding().name`. Nhiều file CSS/TSX dùng hardcoded `#ef4444` / `#f97316` cho border-color thay vì CSS variable.

**Sửa:**
- Cooperate Hero/Services/About: thay `process.env.NEXT_PUBLIC_APP_NAME` bằng `useBranding().name`
- About.tsx: thay `text-red-600` bằng inline style `var(--primary-hover)` cho brand name
- `(public)/main.css`: 5 chỗ border-color `#ef4444` → `var(--primary-hover, #ef4444)`
- `modals/styles.css`: input focus + checkbox checked → `var(--primary-hover, #ef4444)`
- `DailyStats.tsx`, `DateRangePicker.tsx`: `border-[#f97316]` → inline style `var(--primary-hover)`
- `KPICard.tsx`: hover border/text → CSS class `.kpi-card` trong shared-layout.css
- `shared-layout.css`: thêm `.kpi-card:hover` rules dùng CSS variable

**Files:** Hero.tsx, Services.tsx, About.tsx (cooperate), main.css (public), styles.css (modals), DailyStats.tsx, DateRangePicker.tsx, KPICard.tsx, shared-layout.css

---

#### 13.N+5 Fix hardcoded brand names & colors trong About / Hotline pages

**Vấn đề:** Các trang About và Hotline (landing page) dùng `process.env.NEXT_PUBLIC_APP_NAME` trực tiếp và hardcode Tailwind brand colors (`text-red-500`, `text-orange-500`, `bg-red-500`, `from-red-500 to-orange-500`, `from-orange-500 to-red-600`), khiến sub-site không đổi được brand.

**Sửa:**
- About components (AboutHero, CompanyInfo, TeamSection): thay `process.env.NEXT_PUBLIC_APP_NAME` bằng `useBranding().name`
- About components (CompanyInfo, TeamSection, MissionVision): thay hardcoded Tailwind brand colors bằng inline `style` dùng CSS variables `var(--primary-hover)` / `var(--primary-gradient)`
- Hotline ContactInfo: thay `process.env.NEXT_PUBLIC_APP_NAME` bằng `useBranding().name`; dùng `branding.organization_phone` / `branding.organization_email` với fallback translation
- Hotline ContactInfo: thay `text-red-500`, `bg-red-500` bằng inline style `var(--primary-hover)`; thêm class `input-brand-focus` cho form inputs
- Hotline style.css: thêm `.input-brand-focus:focus` class dùng CSS variable

**Files:** AboutHero.tsx, CompanyInfo.tsx, TeamSection.tsx, MissionVision.tsx, ContactInfo.tsx (hotline), hotline/style.css

---

### 13/03/2026

#### 13.N+4 Reseller xem/đổi API Key — tích hợp vào Profile

**Vấn đề:** Reseller không có chỗ xem/đổi API key. Gộp api_key + api_secret thành 1 key duy nhất.

**Sửa:**
- `useRole.tsx`: thêm role `reseller` + permission `reseller.credentials` + helper `isReseller`/`useIsReseller`
- `useMyCredentials.ts`: hook `GET /my-credentials` + `useRegenerateMyCredentials` cho reseller tự đổi key
- `CredentialsPanel.tsx`: tab Profile — hiển thị api_key (copy) + nút "Tạo lại API Key"
- `ProfilePage.tsx`: thêm tab "API Credentials" chỉ hiện cho role=reseller
- `ModalCredentials.tsx`: bỏ field API Secret, chỉ hiện API Key
- `SiteSettingsForm.tsx`: bỏ field API Secret, chỉ cần URL + API Key
- `useSupplierSettings.ts`, `useAdminResellers.ts`: bỏ `api_secret` khỏi interfaces
- `userSlice.ts`: thêm `role` vào Redux store, sync từ `/me` mỗi 30s
- `useRole.tsx`: ưu tiên Redux role (realtime) > session role
- `auth.ts`: refresh token gọi `/me` sync role + userData

**Files:** useRole.tsx, useMyCredentials.ts, CredentialsPanel.tsx, ProfilePage.tsx, ModalCredentials.tsx, SiteSettingsForm.tsx, useSupplierSettings.ts, useAdminResellers.ts, userSlice.ts, auth.ts

---

### 15/03/2026

#### 13.N+4 ServiceFormModal — Tag chips + Country dropdown with flags

**Vấn đề:** Tag dùng multi-select dropdown, country dùng danh sách tĩnh từ serviceTypes — không đồng bộ UI với ChildServiceFormModal.

**Sửa:**
- Tag: thay multi-select dropdown bằng colored preset chips (click toggle), dùng `PREDEFINED_TAGS` + `getTagStyle` từ `tagConfig`
- Country: thay danh sách tĩnh `countryOptions` bằng `useCountries()` hook + flag icons từ flagcdn
- Xóa `countryOptions` useMemo (không còn dùng)

**Files:** `FE/src/views/Client/Admin/ServiceType/ServiceFormModal.tsx`

---

### 12/03/2026

#### 13.N+3 Fix sidebar collapsed — labels/section headers vẫn hiển thị

**Vấn đề:** Khi co lại sidebar (collapsed), text labels của menu items và section headers vẫn hiển thị bị cắt ngắn thay vì ẩn đi. Nguyên nhân: custom `rootStyles` (static, có `display: 'inline'` trên label) có CSS priority cao hơn theme styles, ghi đè `opacity: 0` / `display: none` của theme.

**Sửa:**
- Chuyển `baseMenuItemStyles`, `mergedActiveStyles`, `menuSectionHeaderStyles` từ hằng số tĩnh → `useMemo` reactive theo `collapsedNotHovered`
- Khi collapsed: label có `opacity: 0, width: 0, overflow: 'hidden'`; section header giảm margin
- Bỏ `display: 'inline'` trên label (gây xung đột CSS specificity)
- Tách phần button styles ra `baseButtonStyles` (static, không cần reactive)

**Files:** `FE/src/components/layout/vertical/VerticalMenu.tsx`

---

#### 13.N+1 HistoryOrderPage — Search button + Deferred search

**Vấn đề:** Tìm kiếm live-filter không có nút, UX chưa rõ ràng.

**Sửa:**
- Thêm state `appliedSearch` (tách khỏi `searchText` đang nhập)
- Lọc `filteredOrders` dùng `appliedSearch` thay vì `searchText`
- Thêm nút **"Tìm kiếm"** (MUI Button), Enter key → `handleSearch()`
- X clear button → reset cả 2 states

**Files:** `FE/src/views/Client/HistoryOrder/HistoryOrderPage.tsx`

---

#### 13.N+2 Fix cờ quốc gia proxy — Normalize country code

**Vấn đề:** Country code từ service type có thể khác case/whitespace → flag URL hoặc lookup sai.

**Sửa:**
- Normalize country code: `.trim().toUpperCase()` khi build `countryOptions`
- `countries.find` dùng case-insensitive so sánh
- Filter `selectedCountry` comparison cũng normalize
- Áp dụng cho cả `StaticProxyPage`, `RotatingProxyPage`, `ProxyCard`

**Files:** `StaticProxyPage.tsx`, `RotatingProxyPage.tsx`, `ProxyCard.tsx`

---

### 11/03/2026

#### 13.N Redesign admin xử lý đơn thiếu proxy — Fill Proxies thủ công

**Vấn đề:** Tab "Đơn thiếu proxy" riêng biệt gây phân mảnh UI. Admin cần cơ chế thêm proxy từ đối tác trả về (tĩnh/xoay) để bù đơn partial.

**Sửa:**
- **Bỏ Tab** — xóa Tab 1 "Đơn thiếu proxy", xóa imports `Tabs/Tab/Badge/AlertTriangle/usePartialOrders`
- **Trạng thái trong bảng chính** — status 3 hiện chip "Thiếu proxy" màu vàng, actions column có 3 nút: Mua bù (RefreshCw), Hoàn tiền (DollarSign), Thêm proxy thủ công (PlusCircle)
- **FillProxiesDialog** mới: nhập nhiều proxy một lúc qua textarea hoặc upload .txt; tự nhận dạng format tĩnh (`ip:port` / `ip:port:user:pass`) hay xoay (`key` / `key ip:port`)
- Hook `useFillProxies` gọi `POST /admin/fill-proxies/{order_id}`
- BE `FillProxiesController`: parse lines, tìm slot trống, update `delivered_quantity`, set `in_use` hoặc giữ `in_use_partial`, ghi OrderLog
- **FE liên quan** → `BE/DEVELOPER-GUIDE.md` entry 15.14

**Files:**
- `src/views/Client/Admin/Orders/AdminOrdersPage.tsx` (bỏ tab, thêm 3 buttons status 3)
- `src/views/Client/Admin/Orders/FillProxiesDialog.tsx` (mới)
- `src/hooks/apis/useOrders.ts` (thêm `useFillProxies`)

#### 13.M Summary cards dùng BE aggregate + search-aware

**Vấn đề:** Summary tính từ allOrders (bị giới hạn per_page) → sai khi có nhiều đơn hơn limit. Khi tìm kiếm, summary không cập nhật theo kết quả search.

**Sửa:**
- BE `OrderReportController::detail()`: thêm aggregate query (`COUNT/SUM`) trả về `summary: {total_orders, total_amount, total_cost, profit}` song song với pagination query
- FE: khi không có search → dùng `ordersData?.summary` từ BE; khi có search → tính client-side từ `orders` đã filter

**Files:**
- `src/views/Client/Admin/Orders/AdminOrdersPage.tsx` (summary useMemo)
- BE: `OrderReportController.php`

#### 13.L OrderStatusReport — tính báo cáo client-side

**Vấn đề:** 2 API call (summary + detail) dư thừa; statusBreakdown/dailyTrend tính sai khi per_page < tổng đơn.

**Sửa:** Bỏ `useOrderReportSummary`, dùng `per_page: 5000` để lấy đủ data, tính `statusBreakdown` + `dailyTrend` bằng `useMemo` client-side. `STATUS_KEY` constant ra ngoài component.

**Files:** `src/views/Client/Admin/Dashboard/OrderStatusReport.tsx`, `src/hooks/apis/useOrderReport.ts`

---

### 28/02/2026

#### 13.1 Fix CORS — Dashboard fetch sai URL

**Vấn đề:** `useDashboard.ts` dùng `fetch()` với `NEXT_PUBLIC_APP_URL` (https://mktproxy.com) → CORS error vì gọi frontend URL thay vì API URL.

**Sửa:** Chuyển cả `useDashboard` và `useDashboardMonthly` sang dùng `useAxiosAuth()`.

**Files:** `src/hooks/apis/useDashboard.ts`

---

#### 13.2 Tập trung API URL config

**Vấn đề:** Hardcoded fallback `https://api.minhan.online/api` rải rác nhiều file → production có thể dùng URL cũ sai.

**Sửa:** Tạo `src/config/api.ts` export `PUBLIC_API_URL` và `SERVER_API_URL`. Tất cả file import từ đây.

**Files:** `src/config/api.ts` (mới), `src/libs/axios.ts`, `src/utils/serverSessionValidation.ts`, `src/app/[lang]/(private)/(client)/overview/page.tsx`

---

#### 13.3 Admin Transaction History — Server-side pagination

**Vấn đề:** Trang admin dùng `useOrders()` không truyền params → không phân trang, không filter, thiếu cột thông tin.

**Sửa:**
- Tạo hook `useAdminTransactionHistory` với params: `page`, `per_page`, `search`, `status`, `date`
- Table dùng `manualPagination: true`
- Thêm cột: Số trước (`sotientruoc`), Số sau (`sotiensau`)
- Page size mặc định 100, options: 50/100/200/500
- Search debounce 400ms

**Files:** `src/hooks/apis/useAdminTransactionHistory.ts` (mới), `src/views/Client/Admin/TransactionHistory/TableTransactionHistory.tsx`

**Lưu ý:** Backend cần hỗ trợ params `page`, `per_page`, `search`, `status`, `date` trên `GET /transaction-history` và trả format Laravel paginate.

---

#### 13.4 Fix page đơ cứng (freeze)

**Vấn đề:** `NextAuthProvider refetchInterval={10}` (10 giây) → session refetch liên tục → re-render toàn app.

**Sửa:** `refetchInterval={5 * 60}` (5 phút).

**Files:** `src/app/[lang]/layout.tsx`

---

#### 13.5 Loại bỏ session check trùng lặp

**Vấn đề:** 4 nơi cùng validate session (middleware, NextAuth refetch, GlobalSessionCleanup, useClientAuthGuard) → mỗi 10 giây bắn 2-3 request `/api/me` thừa.

**Sửa:**
- **Bỏ** `GlobalSessionCleanup` khỏi `Providers.tsx` (trùng chức năng với axios interceptor 401)
- **Sửa** `useClientAuthGuard`: bỏ `fetch('/api/me')`, chỉ check `status` từ NextAuth. Dependency `[status]` thay vì `[session, status, router, pathname]`

**Giữ lại 2 layer đủ dùng:**
- `middleware.ts` → bảo vệ route server-side
- `useAxiosAuth` interceptor → auto-logout khi API trả 401

**Files:** `src/components/Providers.tsx`, `src/hooks/useClientAuthGuard.tsx`

---

#### 13.6 Deposit History — Gộp 1 API, phân quyền + xóa đơn/nhiều

**Vấn đề:** Trang deposit-history dùng API riêng cho admin và user, admin không có tính năng xóa.

**Sửa:**
- **BE:** Sửa `UserController::deponsitHistory()` thành 1 API chung:
  - Admin (role == 0): thấy tất cả bản ghi (kể cả đã xóa)
  - User: chỉ thấy của mình, is_deleted = 0
  - Server-side pagination, mặc định 100, **tối đa 100** bản ghi
  - Params: `page`, `per_page`, `status`
- **BE:** Thêm `DELETE /admin/bank-auto/delete` cho admin xóa đơn/nhiều (soft-delete)
- **FE:** Cập nhật `useDepositHistory` hỗ trợ params pagination + tạo `useDeleteDeposit` mutation
- **FE:** Cập nhật `TableDepositHistory.tsx`: server-side pagination, checkbox, xóa đơn/nhiều, cột User

**Files:**
- BE: `app/Http/Controllers/Api/UserController.php`, `app/Http/Controllers/Api/BankQrController.php`, `routes/api.php`
- FE: `src/hooks/apis/useDeponsitHistory.ts`, `src/views/Client/Admin/DepositHistory/TableDepositHistory.tsx`

---

#### 13.7 Fix Transaction History crash trình duyệt — BE pagination + FE tối ưu

**Vấn đề:** `GET /transaction-history` dùng `->get()` lấy **tất cả** records không phân trang → JSON response cực lớn → browser crash ("Ôi hỏng"). FE gửi params `page`, `per_page` nhưng BE bỏ qua hoàn toàn.

**Sửa BE:**
- `TransactionHistoryController::getTransactionHistory()`: thay `->get()` bằng `->paginate()`. Mặc định 50, tối đa 100.
- Thêm filter server-side: `search` (tên/email user, nội dung), `status` (order status), `type` (loại giao dịch)
- Eager load chỉ cột cần thiết: `User:id,name,email`, `order:id,order_code,status,total_amount,note`
- Cũng sửa `getDepositHistory()` tương tự (cùng vấn đề `->get()`)

**Sửa FE:**
- Bỏ debounce tự động → chuyển sang **bấm nút Search / Enter** để tìm (tránh gọi API khi gõ)
- Giảm page size options: 20/50/100 (bỏ 200/500 — vô nghĩa khi BE cap 100)
- `staleTime: 30s` thay vì `0` — tránh re-fetch không cần thiết
- `refetchOnWindowFocus: false` — không re-fetch khi quay lại tab
- Bỏ unused imports, đơn giản hóa table (bỏ client-side filter/sort không dùng)
- UX: placeholder "Tên hoặc email user..." thay vì "Nhập user...", label "Tất cả trạng thái" thay vì "Chọn trạng thái"

**Files:**
- BE: `app/Http/Controllers/Api/TransactionHistoryController.php`
- FE: `src/hooks/apis/useAdminTransactionHistory.ts`, `src/views/Client/Admin/TransactionHistory/TableTransactionHistory.tsx`

---

### 08/03/2026

#### 13.8 Tối ưu Admin — Table search/filter + Polish form modal

**Vấn đề:**
1. Table Service List: giá ẩn trong hover, không có tìm kiếm/lọc
2. ServiceFormModal: UI flat, section headers plain text, thiếu visual grouping

**Sửa Table:**
- Bỏ `getRowTooltipContent()` và `<Tooltip>` wrapper trên rows
- Thêm cột **Giá bán** (Ngày/Tuần/Tháng) + cột **Tag** (pill style)
- Thêm **Search bar** + **Filter chips** (Tĩnh/Xoay, Active/Inactive)

**Sửa Form Modal:**
- Wrap sections trong card containers (bg #fafbfc, rounded, border)
- Section headers thêm icon badge màu (Info, Zap, Tag)
- Toggle switches trong white card, submit button brand gradient
- Di chuyển Tags từ section riêng vào Section 1 (cùng protocols)
- Bỏ RichTextEditor → thay bằng plain textarea (maxLength 500 ký tự) gộp vào Section 1
- Xóa Section "Mô tả sản phẩm" (không cần thiết)
- Bỏ `renderNote()` expandable trong preview, giữ `renderNotePreview()` ngắn dưới tên

**Sửa Client Cards:**
- Bỏ expandable "Ghi chú sản phẩm" (note-info-box) khỏi ProxyCard + PlanCard
- Giữ note preview text ngắn dưới tên sản phẩm
- Xóa unused imports: `ChevronDown`, `Info`, `sanitizeHtml`

**Files:**
- `src/views/Client/Admin/ServiceType/TableServiceType.tsx`
- `src/views/Client/Admin/ServiceType/ServiceFormModal.tsx`
- `src/app/[lang]/(private)/(client)/components/proxy-card/ProxyCard.tsx`
- `src/views/Client/RotatingProxy/RotatingProxyPage.tsx`

#### 13.8 Bỏ pagination, tối ưu query + polling + redesign search UI

**Vấn đề 1:** BE dùng `->paginate()` chạy `COUNT(*)` toàn bộ bảng chỉ để phân trang. Với mặc định 100 records, không cần đếm tổng — chỉ lấy 100 giao dịch gần nhất là đủ.

**Sửa BE:** Thay `->paginate($perPage)` bằng `->take($limit)->get()` cho:
- `TransactionHistoryController::getTransactionHistory()` — response chỉ còn `{ success, data }`
- `TransactionHistoryController::getDepositHistory()` — tương tự
- `UserController::deponsitHistory()` — tương tự
- Tham số đổi từ `per_page` sang `limit`, mặc định 100, tối đa 100

**Vấn đề 2:** `usePendingBankQr` poll mỗi 5s trên **mọi trang** (qua NavbarContent). 100 users = 1200 request/phút lãng phí.

**Sửa FE:** Smart conditional polling trong `useBankQr.ts`:
- Thêm param `activePolling` (mặc định `false`)
- `activePolling=true` (trang nạp tiền): poll 5s khi có pending, 60s khi không
- `activePolling=false` (navbar): poll 30s khi có pending, 60s khi không
- `staleTime: 10s` thay vì `0` — tránh duplicate request

**Vấn đề 3:** Search UI chật, thiếu trực quan.

**Sửa FE:** Redesign search bar:
- Tách search/filter ra dòng riêng bên dưới title (không ép chung header)
- Search input rộng hơn, placeholder rõ: "Tìm theo tên, email hoặc nội dung..."
- Nút "Tìm" có label text thay vì chỉ icon
- Nút "Xóa bộ lọc" hiện khi có filter active
- Bỏ hoàn toàn pagination — footer chỉ hiển thị "Hiển thị X giao dịch gần nhất"
- Khi search không có kết quả: "Không tìm thấy giao dịch phù hợp"

**Files:**
- BE: `TransactionHistoryController.php`, `UserController.php`
- FE: `useAdminTransactionHistory.ts`, `useDeponsitHistory.ts`, `useBankQr.ts`
- FE: `TableTransactionHistory.tsx`, `TableDepositHistory.tsx`, `NavbarContent.tsx` (không đổi, dùng default passive polling)

---

### 02/03/2026

#### 13.9 Fix bảo mật & data integrity cho flow mua proxy

**Vấn đề:**
1. Response 500 lộ stacktrace (file, line, trace) → lỗ hổng bảo mật
2. Race condition trừ tiền: 2 request đồng thời có thể vượt quá số dư
3. Order/ApiKey/Dongtien tạo ngoài transaction → nếu lỗi giữa chừng, data bất nhất
4. MktProxyPartner: `cost_price = $setupTime` (số ngày thay vì giá vốn)
5. Thiếu `exists` validation cho `serviceTypeId` trong buyProxyRotate

**Sửa:**
- Xóa stacktrace khỏi 4 catch blocks trong ProxyController, chỉ trả "Internal Server Error"
- Wrap toàn bộ (lockForUpdate → check balance → Order → ApiKey → debit → Dongtien) trong 1 DB::transaction với pessimistic lock theo pattern DepositService
- Fix `cost_price => $priceCost` ở MktProxyPartner
- Thêm `exists:type_services,id` validation cho serviceTypeId
- Telegram/Redis giữ ngoài transaction (tránh giữ DB lock lâu)

**Files:**
- `BE/app/Http/Controllers/Api/ProxyController.php`
- `BE/app/Services/Partners/ProxyVn/ProxyVNPartner.php`
- `BE/app/Services/Partners/HomeProxy/HomeProxyPartner.php`
- `BE/app/Services/Partners/MktProxy/MktProxyPartner.php`
- `BE/app/Services/Partners/ZingProxy/ZingProxyPartner.php`
- `BE/app/Services/Partners/ProxyVn/ProxyVNStaticPartner.php`
- `BE/app/Services/Partners/HomeProxy/HomeProxyStaticPartner.php`
- `BE/app/Services/Partners/Upproxy/UpproxyStaticPartner.php`
- `BE/app/Services/Partners/Upproxy/UpproxyPartner.php`

### 02/03/2026

#### 13.10 Chuyển Telegram notification sang queue (async)

**Vấn đề:**
- Gọi Telegram API đồng bộ trong API mua proxy → chậm response, nếu Telegram timeout thì ảnh hưởng UX

**Sửa:**
- Tạo job `SendTelegramNotification` (queue: `notifications`, tries: 3, backoff: 10s)
- Thay toàn bộ `TelegramHelper` bằng `SendTelegramNotification::dispatch()` trong 14 files (8 partner buy + BasePartner + 5 OrderProcessors)
- Job hỗ trợ 3 method: `system`, `naptien`, `error` (map sang 3 hàm TelegramHelper)
- Partner buy files: dispatch trong try-catch (non-critical, không block response)
- BasePartner/OrderProcessors: dispatch giữ nguyên vị trí trong catch blocks hiện có
- Cần cấu hình `.env`: `QUEUE_DRIVER=redis` và chạy supervisor worker cho queue `notifications`
- File supervisor config: `BE/supervisors/notifications-worker.conf`

**Files:**
- `BE/app/Jobs/SendTelegramNotification.php` (mới)
- `BE/supervisors/notifications-worker.conf` (mới)
- `BE/app/Services/Partners/ProxyVn/ProxyVNPartner.php`
- `BE/app/Services/Partners/HomeProxy/HomeProxyPartner.php`
- `BE/app/Services/Partners/MktProxy/MktProxyPartner.php`
- `BE/app/Services/Partners/ZingProxy/ZingProxyPartner.php`
- `BE/app/Services/Partners/ProxyVn/ProxyVNStaticPartner.php`
- `BE/app/Services/Partners/HomeProxy/HomeProxyStaticPartner.php`
- `BE/app/Services/Partners/Upproxy/UpproxyStaticPartner.php`
- `BE/app/Services/Partners/Upproxy/UpproxyPartner.php`
- `BE/app/Services/Partners/BasePartner.php`
- `BE/app/Services/Partners/OrderProcessors/HomeProxyStaticProcessor.php`
- `BE/app/Services/Partners/OrderProcessors/MktProxyRotatingProcessor.php`
- `BE/app/Services/Partners/OrderProcessors/ZingProxyRotatingProcessor.php`
- `BE/app/Services/Partners/OrderProcessors/ProxyVnRotatingProcessor.php`
- `BE/app/Services/Partners/OrderProcessors/UpProxyStaticProcessor.php`

#### 13.11 Fix bug logic hàm buy() partner + validation controller

**Vấn đề:**
- `$pricePerUnit = null` khi không tìm thấy giá trong `price_by_duration` → `$total = 0` → đơn hàng miễn phí
- `$setupTime` undefined variable nếu `$dataBody['time']` không tồn tại (MktProxy, ZingProxy, HomeProxy, ProxyVN)
- Thiếu `max` validation cho `quantity` → có thể gửi quantity rất lớn, lock DB lâu
- ProxyVN & Upproxy rotating: ApiKey `quantity` = tổng đơn hàng thay vì 1, thiếu field `api_key`
- `$priceCost` null gây warning khi nhân với quantity

**Sửa:**
- Thêm check `$pricePerUnit === null || $pricePerUnit <= 0` trước khi tính `$total` (7 partner files)
- Khởi tạo `$setupTime = $dataBody['time'] ?? null` + check early return (4 rotating partners)
- Thêm `max:2000` vào validation `quantity` (4 methods trong controller)
- Fix `quantity => 1` + thêm `api_key` cho ProxyVN & Upproxy rotating
- Dùng `($priceCost ?? 0)` để tránh null warning

**Files:**
- `BE/app/Http/Controllers/Api/ProxyController.php`
- `BE/app/Services/Partners/ProxyVn/ProxyVNPartner.php`
- `BE/app/Services/Partners/HomeProxy/HomeProxyPartner.php`
- `BE/app/Services/Partners/MktProxy/MktProxyPartner.php`
- `BE/app/Services/Partners/ZingProxy/ZingProxyPartner.php`
- `BE/app/Services/Partners/ProxyVn/ProxyVNStaticPartner.php`
- `BE/app/Services/Partners/HomeProxy/HomeProxyStaticPartner.php`
- `BE/app/Services/Partners/Upproxy/UpproxyStaticPartner.php`
- `BE/app/Services/Partners/Upproxy/UpproxyPartner.php`

#### 13.12 Chuyển API response messages sang tiếng Anh

**Vấn đề:** Các message trả về cho user đang bằng tiếng Việt, không phù hợp với API public.

**Sửa:** Chuyển toàn bộ `'message'` trong response array sang tiếng Anh:
- Partners (8 files): "Số dư không đủ" → "Insufficient balance. Please top up.", "Token không tồn tại" → "Token not found.", etc.
- ProxyController: "Lấy dữ liệu thành công" → "Data retrieved successfully.", cooldown messages, validation messages
- OrderProcessors (6 files): "Template body không hợp lệ" → "Invalid template body", "Thiếu ApiKey" → "Missing ApiKey", etc.

**Lưu ý:** Chỉ đổi message trong response trả về client. Log nội bộ và Telegram vẫn giữ tiếng Việt.

**Files:**
- `BE/app/Http/Controllers/Api/ProxyController.php`
- `BE/app/Services/Partners/` (8 partner files)
- `BE/app/Services/Partners/OrderProcessors/` (6 processor files)

#### 13.13 Refactor Order Queue: Anti-duplicate + Retry + Multi-worker

**Vấn đề:**
- `OrderHelper::saveOrderToRedis` push full JSON → duplicate processing
- Retry logic dead code (`$newRetry < 1` luôn FALSE)
- 2 hàm `failOrderWithRefund` xung đột (PlaceOrder vs BasePartner)
- Latency 5 phút (FetchPendingOrders cron)
- Không có processing lock → nguy hiểm khi numprocs > 1
- Processors: thiếu DB::transaction, markOrderSuccess sai vị trí, JSON validation bug

**Sửa:**
- **3 lớp lock**: Enqueue lock (TTL 90s) + Processing lock (TTL 600s) + Status check (DB WHERE status=PENDING)
- **OrderHelper**: Push chỉ order ID, thêm enqueue lock chống duplicate
- **FetchPendingOrders**: Cron 1 phút, recover order kẹt PROCESSING > 10 phút, filter retry < 3
- **PlaceOrder**: Thêm processing lock, bỏ failOrderWithRefund riêng, thêm safety net handleProcessorFailure, bỏ emitSocketUpdate
- **BasePartner**: Fix retry 3 lần (was dead code), thêm Telegram khi FAILED, bỏ methods thừa
- **6 Processors**: Thống nhất error handling (failOrderWithRefund), wrap DB::transaction, fix markOrderSuccess position, fix JSON validation bug
- **Supervisor**: numprocs=3 (an toàn nhờ processing lock)

**Files:**
- `BE/app/Helpers/OrderHelper.php`
- `BE/app/Console/Commands/FetchPendingOrders.php`
- `BE/app/Console/Commands/PlaceOrder.php`
- `BE/app/Console/Kernel.php`
- `BE/app/Services/Partners/BasePartner.php`
- `BE/app/Services/Partners/OrderProcessors/` (6 processor files)
- `BE/supervisors/orders-partner.conf`

#### 13.14 Fix bugs tiềm ẩn trong order flow (review lần 2)

**Vấn đề:**
1. **CRITICAL**: FetchPendingOrders race condition — ghi đè IN_USE thành PENDING khi recover
2. **CRITICAL**: HomeProxy double order ở đối tác khi retry (2-step flow không idempotent)
3. **HIGH**: ProxyVn sleep() trong DB::transaction giữ lock hàng chục giây
4. **HIGH**: HomeProxyRotating thiếu DB::transaction, partial update khi crash
5. **HIGH**: HomeProxyStatic config error throw → retry vô nghĩa 3 lần
6. **MEDIUM**: HomeProxyRotating $dataKey undefined nếu time không phải 1/7/30
7. **MEDIUM**: UpProxy null access nếu JSON decode fail
8. **MEDIUM**: Telegram exception chặn Redis push trong 7 buy() methods
9. **MEDIUM**: HomeProxyRotating getOrderByOrderId không retry

**Sửa:**
- FetchPendingOrders: thêm `WHERE status=PROCESSING` vào update tránh race condition
- HomeProxy processors: lưu `id_order_partner` ngay sau step 1, skip step 1 khi retry (idempotency)
- BasePartner: thêm `getExistingPartnerOrderId()` helper
- ProxyVn: bỏ sleep(1) trong transaction
- HomeProxyRotating: wrap loop trong DB::transaction, dùng match() + validation cho time, thêm retry 5 lần cho getOrderByOrderId
- HomeProxyStatic: đổi throw → return cho config error, bỏ dead code
- UpProxy: thêm null check trước access `$data['statusCode']`
- 7 buy() files: tách Redis push và Telegram thành try-catch riêng, Redis push trước

**Files:**
- `BE/app/Console/Commands/FetchPendingOrders.php`
- `BE/app/Services/Partners/BasePartner.php`
- `BE/app/Services/Partners/OrderProcessors/HomeProxyStaticProcessor.php`
- `BE/app/Services/Partners/OrderProcessors/HomeProxyRotatingProcessor.php`
- `BE/app/Services/Partners/OrderProcessors/ProxyVnRotatingProcessor.php`
- `BE/app/Services/Partners/OrderProcessors/UpProxyStaticProcessor.php`
- `BE/app/Services/Partners/*/` (7 buy partner files)

#### 13.15 Redesign Order Status System + delivered_quantity

**Vấn đề:**
- `partial_completed` (3) dùng sai nghĩa — thực chất là "mua thiếu" chứ không phải "hoàn 1 phần"
- `completed` (4) thực chất là "hết hạn" → tên sai
- Thiếu trạng thái: `waiting_refund`, `refunded_all`, `partial_refunded`
- Cột `status` là VARCHAR(20) → nặng index
- Không track được số proxy thực tế nhận vs đặt

**Sửa:**
- **9 trạng thái mới** (giá trị integer giữ nguyên, FE không ảnh hưởng):
  - 0=pending, 1=processing, 2=in_use, 3=in_use_partial (mua thiếu), 4=expired (hết hạn), 5=failed, 6=partial_refunded, 7=waiting_refund, 8=refunded_all
- **STATUS_TEXT_MAP** giữ tên cũ cho API backward compatibility (3→'partial_completed', 4→'completed')
- **delivered_quantity** (SMALLINT UNSIGNED nullable): track số proxy thực tế nhận được
- **Migration**: data migrate status 6→4, string→int, thêm delivered_quantity, backfill, drop redundant index, VARCHAR→TINYINT
- **BasePartner**: `finalizeOrder()` set `in_use_partial` + `delivered_quantity`, `markOrderSuccess()` set `delivered_quantity = quantity`
- **CheckProxyStatus**: fix BUG — check cả `in_use` VÀ `in_use_partial` cho expiry
- **Đổi tên references**: `completed→expired`, `canceled→waiting_refund`, `partial_completed→in_use_partial` toàn bộ BE
- Xóa 2 relationship sai trong Order model (`type_service`, `api_key`)

**Files:**
- `BE/database/migrations/2026_03_03_000000_change_orders_status_to_tinyint.php`
- `BE/app/Models/MySql/Order.php`
- `BE/app/Services/Partners/BasePartner.php`
- `BE/app/Console/Commands/CheckProxyStatus.php`
- `BE/app/Models/Mongo/OrderLog.php`
- `BE/app/Http/Controllers/Api/TransactionHistoryController.php`
- `BE/app/Http/Controllers/Api/DashboardController.php`
- `BE/app/Http/Controllers/Api/AffiliateController.php`
- `BE/app/Http/Controllers/Admin/AffiliateController.php`
- `BE/app/Console/Commands/OrderStatistics.php`
- `BE/app/Console/Commands/RealtimeStatistics.php`
- `BE/app/Console/Commands/PlaceOrderTest.php`
- `BE/app/Services/StatisticsService.php`
- `BE/resources/views/admin/order_v6/index.blade.php`

#### 13.16 Tạo BE/DEVELOPER-GUIDE.md

**Mô tả:** Tạo developer guide riêng cho BE, ghi lại toàn bộ quy trình nghiệp vụ, domain knowledge (resell proxy vs sell proxy), order status system, partner system, payment flow, affiliate, thống kê. Liên kết với FE guide.

**Files:** `BE/DEVELOPER-GUIDE.md`

#### 13.17 Bug #9: Hệ thống ticket hỗ trợ + Xử lý đơn thiếu proxy

**Vấn đề:** Order `in_use_partial` có proxy thiếu nhưng không có cơ chế mua bù, báo admin, hoặc hoàn tiền phần thiếu.

**Sửa:**
- Tạo bảng `support_tickets` + model `SupportTicket` (auto ticket_code)
- `BasePartner::finalizeOrder()` tự tạo ticket khi `in_use_partial`
- Admin endpoints: xem ticket, xem partial orders, retry mua bù, hoàn tiền phần thiếu
- User endpoints: tạo ticket, xem ticket của mình
- Status `partial_refunded` (6) = order vẫn active, proxy vẫn chạy, đã hoàn phần thiếu
- `CheckProxyStatus` thêm `partial_refunded` vào check hết hạn
- 6 processors: skip filled ApiKeys khi retry, chỉ mua cho ApiKey chưa có proxy
- Hoàn tiền tạo Dongtien type=REFUND, auto-resolve ticket liên quan

**Files:**
- `BE/database/migrations/2026_03_03_000001_create_support_tickets_table.php` (mới)
- `BE/app/Models/MySql/SupportTicket.php` (mới)
- `BE/app/Http/Controllers/Api/SupportTicketController.php` (mới)
- `BE/routes/api.php`
- `BE/app/Services/Partners/BasePartner.php`
- `BE/app/Console/Commands/CheckProxyStatus.php`
- 6 processors: MktProxy, HomeProxyRotating/Static, ProxyVn, UpProxy, ZingProxy

### 03/03/2026

#### 13.18 Fix token refresh logic — tránh logout bất ngờ

**Vấn đề:**
- Axios gặp 401 → signOut ngay, không thử refresh trước → user bị logout bất ngờ
- Error string mismatch: `auth.ts` set `'RefreshAccessTokenError'` nhưng client check `'TokenExpiredError'` → refresh failure không bao giờ được detect
- Không có buffer time → token hết hạn giữa chừng gây request fail
- `refetchInterval=15min` quá dài so với token TTL
- 2 file `SessionCleanup` orphaned (không mount ở đâu)

**Sửa:**
- `auth.ts`: đổi error string → `'TokenExpiredError'`, thêm buffer 60s trước khi hết hạn
- `axios.ts`: gặp 401 → gọi `_onRefresh()` (NextAuth update) → retry 1 lần → fail mới signOut. Dedup bằng `_isRefreshing` flag
- `useAxiosAuth.tsx`: wire `setOnRefresh()` dùng NextAuth `update()` để trigger server-side JWT refresh
- `layout.tsx`: giảm `refetchInterval` từ 15 phút → 4 phút
- Xóa `GlobalSessionCleanup.tsx` + `SessionCleanup.tsx` (orphaned)

**Files:**
- `FE/src/libs/auth.ts`
- `FE/src/libs/axios.ts`
- `FE/src/hocs/useAxiosAuth.tsx`
- `FE/src/app/[lang]/layout.tsx`
- `FE/src/components/GlobalSessionCleanup.tsx` (xóa)
- `FE/src/app/[lang]/(private)/(client)/components/SessionCleanup.tsx` (xóa)

### 04/03/2026

#### 13.19 FE: Giao diện Ticket hỗ trợ + Quản lý đơn thiếu proxy

**Mô tả:** Tạo giao diện FE cho hệ thống support ticket (user tạo ticket, xem trạng thái) và admin quản lý (resolve ticket, xem đơn thiếu proxy, retry/refund).

**Sửa:**
- Constants: `TICKET_STATUS`, `TICKET_STATUS_LABELS`, `TICKET_STATUS_COLORS`, `TICKET_TYPES`, `TICKET_TYPE_LABELS`
- 7 API hooks: `useMyTickets`, `useCreateTicket`, `useAdminTickets`, `usePartialOrders`, `useRetryPartial`, `useRefundPartial`, `useResolveTicket`
- User: trang "Hỗ trợ" — danh sách ticket (TanStack table), tạo ticket (Dialog + form), xem chi tiết (admin note, ai xử lý, khi nào)
- Admin: trang "Tickets hỗ trợ" — filters (status, type), resolve ticket (nhập note, đổi status)
- Admin: trang "Đơn thiếu proxy" — danh sách partial orders, retry mua bù, refund hoàn tiền
- Menu: thêm "Hỗ trợ" (user) + "Tickets hỗ trợ" + "Đơn thiếu proxy" (admin)

**Files:**
- `FE/src/constants/ticketStatus.ts` (mới)
- `FE/src/hooks/apis/useTickets.ts` (mới)
- `FE/src/views/Client/SupportTickets/TicketsPage.tsx` (mới)
- `FE/src/views/Client/SupportTickets/CreateTicketDialog.tsx` (mới)
- `FE/src/views/Client/SupportTickets/TicketDetailDialog.tsx` (mới)
- `FE/src/views/Client/Admin/SupportTickets/AdminTicketsPage.tsx` (mới)
- `FE/src/views/Client/Admin/SupportTickets/ResolveTicketDialog.tsx` (mới)
- `FE/src/views/Client/Admin/PartialOrders/PartialOrdersPage.tsx` (mới)
- `FE/src/app/[lang]/(private)/(client)/support-tickets/page.tsx` (mới)
- `FE/src/app/[lang]/(private)/(client)/admin/support-tickets/page.tsx` (mới)
- `FE/src/app/[lang]/(private)/(client)/admin/partial-orders/page.tsx` (mới)
- `FE/src/constants/index.ts` (sửa — export ticketStatus)
- `FE/src/components/layout/vertical/VerticalMenu.tsx` (sửa — thêm menu items)

#### 13.20 Fix dropdown đơn hàng trong CreateTicketDialog

**Vấn đề:** Dropdown chọn đơn hàng khi tạo ticket hiển thị quá ít thông tin, value type mismatch (number vs string) khiến không chọn được.

**Sửa:**
- Fix value type: dùng `String(order.id)` thống nhất
- Dropdown hiện chi tiết: order_code, số lượng, ngày mua, trạng thái (Chip màu)
- Thêm card chi tiết đơn hàng đã chọn: hiển thị thiếu bao nhiêu proxy, giá, thời hạn
- TicketDetailDialog + ResolveTicketDialog: thêm Chip trạng thái đơn, hiển thị proxy thiếu

**Files:**
- `FE/src/views/Client/SupportTickets/CreateTicketDialog.tsx`
- `FE/src/views/Client/SupportTickets/TicketDetailDialog.tsx`
- `FE/src/views/Client/Admin/SupportTickets/ResolveTicketDialog.tsx`

#### 13.21 Nâng cấp hệ thống Ticket — Phase 2 (Tracking + Telegram + Overdue)

**Vấn đề:** Thiếu tracking ai xử lý/giao cho ai, admin detail view bị hỏng (`open={false}`), không có thông báo Telegram khi tạo/resolve ticket, không cảnh báo ticket quá hạn.

**Sửa:**
- **BE:** Migration thêm 4 cột tracking (`assigned_to`, `processing_by`, `processing_at`, `overdue_notified_at`)
- **BE:** Model thêm 3 relationships (`resolvedByUser`, `assignedToUser`, `processingByUser`)
- **BE:** Controller: eager-load tracking relations, Telegram khi tạo/resolve, 2 endpoints mới (`updateStatus`, `assignTicket`), fix `refundPartialOrder` thiếu `resolved_by`
- **BE:** Command `ticket:check-overdue` — cảnh báo Telegram ticket >2h chưa xử lý, schedule 30 phút/lần
- **FE:** 2 hooks mới (`useUpdateTicketStatus`, `useAssignTicket`)
- **FE:** Fix admin detail view: dùng `TicketDetailDialog` thay `ResolveTicketDialog open={false}`
- **FE:** AdminTicketsPage: thêm cột "Phụ trách", nút "Nhận xử lý" cho ticket OPEN
- **FE:** TicketDetailDialog + ResolveTicketDialog: hiện tracking info (xử lý bởi, phụ trách, nhận xử lý)

**Files:**
- `BE/database/migrations/2026_03_04_000001_add_tracking_fields_to_support_tickets.php` (mới)
- `BE/app/Console/Commands/CheckTicketOverdue.php` (mới)
- `BE/app/Models/MySql/SupportTicket.php` (sửa)
- `BE/app/Http/Controllers/Api/SupportTicketController.php` (sửa)
- `BE/routes/api.php` (sửa)
- `BE/app/Console/Kernel.php` (sửa)
- `FE/src/hooks/apis/useTickets.ts` (sửa)
- `FE/src/views/Client/Admin/SupportTickets/AdminTicketsPage.tsx` (sửa)
- `FE/src/views/Client/SupportTickets/TicketDetailDialog.tsx` (sửa)
- `FE/src/views/Client/Admin/SupportTickets/ResolveTicketDialog.tsx` (sửa)

#### 13.22 Auto-track "Đã xem bởi ai" cho Ticket

**Vấn đề:** Cần tracking admin nào đã xem ticket, nhưng không thể bấm nút — phải tự động.

**Sửa:**
- **BE:** Migration thêm `viewed_by` + `viewed_at`, endpoint `POST /admin/support-tickets/{id}/view`
- **FE:** Khi admin mở TicketDetailDialog, sau 3 giây tự gọi API `markViewed` (useEffect + setTimeout)
- **FE:** AdminTicketsPage hiện cột "Đã xem" với tên admin

**Files:**
- `BE/database/migrations/2026_03_04_000002_add_viewed_fields_to_support_tickets.php` (mới)
- `BE/app/Models/MySql/SupportTicket.php` (sửa)
- `BE/app/Http/Controllers/Api/SupportTicketController.php` (sửa)
- `BE/routes/api.php` (sửa)
- `FE/src/hooks/apis/useTickets.ts` (sửa)
- `FE/src/views/Client/Admin/SupportTickets/AdminTicketsPage.tsx` (sửa)

#### 13.23 Fix toast không tự tắt

**Vấn đề:** Toast notification hiển thị nhưng không tự đóng sau 3 giây — thiếu CSS của react-toastify.

**Sửa:** Thêm `import 'react-toastify/dist/ReactToastify.css'` vào `LayoutProvider.tsx` và `landing-page/layout.tsx`.

**Files:**
- `FE/src/components/LayoutProvider.tsx` (sửa)
- `FE/src/app/[lang]/(landing-page)/layout.tsx` (sửa)

---

### 04/03/2026

#### 13.24 Thêm trạng thái "Đang mua bù" (status 9) + Fix mapping order status

**Vấn đề:**
- Admin bấm "Mua bù" → đơn chuyển status 1 (processing) giống đơn mới, không phân biệt được
- `retryPartialOrder()` set status=1 nhưng `PlaceOrder` chỉ chấp nhận status=0 → đơn kẹt ~10 phút
- FE `orderStatus.ts` mapping sai (status 3=FAILED, 4=CANCEL, 5=EXPIRED — không khớp BE)

**Sửa:**
- BE: Thêm `retry_processing_partial => 9` vào `Order::STATUS_KEY` và `STATUS_TEXT_MAP`
- BE: `retryPartialOrder()` dùng status 9 thay vì 1
- BE: `PlaceOrder.findPendingOrder()` chấp nhận status 0 + 9
- BE: `FetchPendingOrders` gom status 9 vào nhóm pending
- FE: Sửa toàn bộ `orderStatus.ts` cho đúng mapping BE (0-9)
- FE: Thêm `ORDER_STATUS_LABELS_ADMIN` — admin thấy "Đang mua bù", user thấy "Đang xử lý"
- FE: Admin views dùng `ORDER_STATUS_LABELS_ADMIN`, fix switch case icons

**Files:**
- `BE/app/Models/MySql/Order.php` (sửa)
- `BE/app/Http/Controllers/Api/SupportTicketController.php` (sửa)
- `BE/app/Console/Commands/PlaceOrder.php` (sửa)
- `BE/app/Console/Commands/FetchPendingOrders.php` (sửa)
- `FE/src/constants/orderStatus.ts` (sửa)
- `FE/src/views/Client/Admin/TransactionHistory/TableTransactionHistory.tsx` (sửa)
- `FE/src/views/Client/Admin/TransactionHistory/OrderDetailModal.tsx` (sửa)
- `FE/src/views/Client/Admin/TransactionHistory/LogModal.tsx` (sửa)
- `FE/src/views/Client/Admin/SupportTickets/ResolveTicketDialog.tsx` (sửa)

#### 13.25 Order Log — Hiển thị log xử lý thật từ MongoDB

**Vấn đề:** LogModal admin hiện demo data giả. Không có API endpoint query OrderLog (MongoDB). `retryPartialOrder`, `refundPartialOrder`, `FetchPendingOrders` không ghi log vào OrderLog.

**Sửa:**
- BE: Thêm `getOrderLogs()` endpoint `GET /admin/order-logs/{order_id}` query MongoDB
- BE: Thêm 3 ACTION constants vào OrderLog model (`admin_retry_partial`, `admin_refund_partial`, `auto_recovered`)
- BE: `retryPartialOrder` + `refundPartialOrder` ghi OrderLog::create sau khi update status
- BE: `FetchPendingOrders` ghi OrderLog khi auto-recover order stuck PROCESSING > 10 phút
- FE: Hook `useOrderLogs(orderId)` trong useTickets.ts
- FE: Rewrite `LogModal.tsx` — fetch data thật, hiện timeline với action labels, status transitions, duration_ms, http_status, response body (collapsible)

**Files:**
- `BE/app/Models/Mongo/OrderLog.php` (sửa)
- `BE/app/Http/Controllers/Api/SupportTicketController.php` (sửa)
- `BE/routes/api.php` (sửa)
- `BE/app/Console/Commands/FetchPendingOrders.php` (sửa)
- `FE/src/hooks/apis/useTickets.ts` (sửa)
- `FE/src/views/Client/Admin/TransactionHistory/LogModal.tsx` (sửa)
- `FE/src/views/Client/Admin/TransactionHistory/TableTransactionHistory.tsx` (sửa)

#### 13.26 Đổi format order_code thêm timestamp + user_id

**Vấn đề:** Format cũ `ORD-yymmdd-RANDOM6` thiếu thông tin thời gian chính xác và user.

**Sửa:** Đổi sang `ORD-yymmddHHiiss-{user_id}-RANDOM4`. Ví dụ: `ORD-260304143025-42-ABCD`.

**Files:**
- `BE/app/Models/MySql/Order.php` (sửa)

#### 13.27 Fix bugs: total_price, batch insert ApiKey, dual ApiKeys source

**#8 — Dual ApiKeys source (MktProxyRotatingProcessor):**
- Bỏ `ApiKey::where()` query riêng, dùng duy nhất `$order->apiKeys` — tránh mismatch index giữa 2 nguồn data

**#12 — total_price per ApiKey sai:**
- 8 file Partner lưu `total_price => $total` (tổng đơn hàng) thay vì giá per-unit → sửa thành `$pricePerUnit` (hoặc tương đương)

**#5 — N+1 ApiKey inserts:**
- 8 file Partner dùng loop `ApiKey::create()` → đổi sang `ApiKey::insert($records)` batch 1 query

**Files:**
- `BE/app/Services/Partners/OrderProcessors/MktProxyRotatingProcessor.php` (sửa)
- `BE/app/Services/Partners/MktProxy/MktProxyPartner.php` (sửa)
- `BE/app/Services/Partners/HomeProxy/HomeProxyPartner.php` (sửa)
- `BE/app/Services/Partners/HomeProxy/HomeProxyStaticPartner.php` (sửa)
- `BE/app/Services/Partners/ZingProxy/ZingProxyPartner.php` (sửa)
- `BE/app/Services/Partners/ProxyVn/ProxyVNPartner.php` (sửa)
- `BE/app/Services/Partners/ProxyVn/ProxyVNStaticPartner.php` (sửa)
- `BE/app/Services/Partners/Upproxy/UpproxyPartner.php` (sửa)
- `BE/app/Services/Partners/Upproxy/UpproxyStaticPartner.php` (sửa)

#### 13.28 Fix: enqueue lock TTL, ZingProxy transaction, delivered_quantity default

**#5 — Enqueue lock TTL 90s → 600s:**
- Khớp với processing lock (600s), tránh FetchPendingOrders push trùng order đang xử lý

**#7 — ZingProxy tách API call ra ngoài transaction:**
- Trước: API call trong `DB::transaction` → lock DB khi API chậm
- Sau: Phase 1 gọi API → Phase 2 `DB::transaction` chỉ update DB (giống MktProxy pattern)

**#12 — Default delivered_quantity = quantity:**
- Order.boot: tự set `delivered_quantity = quantity` khi tạo mới
- Migration backfill: set `delivered_quantity = quantity` cho records NULL cũ

**Files:**
- `BE/app/Helpers/OrderHelper.php` (sửa)
- `BE/app/Console/Commands/FetchPendingOrders.php` (sửa)
- `BE/app/Services/Partners/OrderProcessors/ZingProxyRotatingProcessor.php` (sửa)
- `BE/app/Models/MySql/Order.php` (sửa)
- `BE/database/migrations/2026_03_04_000001_set_delivered_quantity_default.php` (mới)

#### 13.29 Document: proxys vs api_key convention + failOrderWithRefund vs handleProcessorFailure

**#11 — Ghi chú `proxys` vs `api_key`:**
- Thêm comment vào 6 processors giải thích tại sao check `proxys` hoặc `api_key` khi retry partial
- Thêm section trong DEVELOPER-GUIDE giải thích convention, bảng so sánh, hướng dẫn khi thêm partner mới

**#6 — Ghi chú `failOrderWithRefund` vs `handleProcessorFailure`:**
- Thêm section trong DEVELOPER-GUIDE giải thích caller context khác nhau và flow chi tiết

**Files:**
- `BE/app/Services/Partners/OrderProcessors/ProxyVnRotatingProcessor.php` (comment)
- `BE/app/Services/Partners/OrderProcessors/HomeProxyRotatingProcessor.php` (comment)
- `BE/app/Services/Partners/OrderProcessors/HomeProxyStaticProcessor.php` (comment)
- `BE/app/Services/Partners/OrderProcessors/ZingProxyRotatingProcessor.php` (comment)
- `BE/app/Services/Partners/OrderProcessors/MktProxyRotatingProcessor.php` (comment)
- `BE/app/Services/Partners/OrderProcessors/UpProxyStaticProcessor.php` (comment)
- `FE/DEVELOPER-GUIDE.md` (thêm 2 sections trong phần 11)

#### 13.30 Fix đối soát tài chính + Báo cáo đơn hàng theo trạng thái

**Vấn đề:**
- `testTotals()` chỉ query `NAPTIEN` + `BUY` → bỏ qua `NAPTIEN_PAY2S`, `NAPTIEN_MANUAL`, `RUT_HOA_HONG_AFFILIATE`, v3/v4 types
- `scanDeposits()` chỉ scan `NAPTIEN` → deposit mới từ Pay2S/Manual không vào report
- Không có báo cáo chi tiết theo 10 trạng thái đơn hàng

**Sửa — Phần A (Đối soát):**
- `testTotals()`: query tất cả deposit types, tách BUY v6 (dương) vs v3/v4 (âm), thêm affiliate
- `scanDeposits()`: `whereIn` 3 deposit types thay vì 1
- Công thức mới: `deposits + affiliate - purchases + refunds = balance`

**Sửa — Phần B (Report đơn hàng):**
- Migration `report_order_status`: aggregate theo (date, partner_id, status)
- Command `report:order-status`: chạy daily 00:15, hỗ trợ backfill `--from` / `--to`
- Controller `OrderReportController`: 2 API (summary + detail)

**Sửa — Phần C (FE Dashboard):**
- Component `OrderStatusReport`: PieChart + BarChart + KPI + Table paginated
- Filter: date range + partner + status (click pie slice)
- Hook `useOrderReport` + proxy routes

**Files:**
- `BE/app/Http/Controllers/Api/DashboardController.php` (fix testTotals)
- `BE/app/Services/StatisticsService.php` (fix scanDeposits)
- `BE/database/migrations/2026_03_04_000003_create_report_order_status_table.php` (mới)
- `BE/app/Models/MySql/ReportOrderStatus.php` (mới)
- `BE/app/Console/Commands/ReportOrderStatus.php` (mới)
- `BE/app/Console/Kernel.php` (schedule 00:15)
- `BE/app/Http/Controllers/Api/OrderReportController.php` (mới)
- `BE/routes/api.php` (thêm 2 routes)
- `FE/src/hooks/apis/useOrderReport.ts` (mới)
- `FE/src/app/api/admin/order-report/summary/route.ts` (mới)
- `FE/src/app/api/admin/order-report/detail/route.ts` (mới)
- `FE/src/views/Client/Admin/Dashboard/OrderStatusReport.tsx` (mới)
- `FE/src/app/[lang]/(private)/(client)/admin/dashboard/page.tsx` (thêm component)

### 05/03/2026

#### 13.31 Gộp deposit types: NAPTIEN + NAPTIEN_PAY2S → NAPTIEN_AUTO

**Vấn đề:**
- 3 type nạp tiền riêng biệt (NAPTIEN, NAPTIEN_PAY2S, NAPTIEN_MANUAL) gây phức tạp khi query
- Phương thức nạp (bank polling, pay2s) là chi tiết implementation, không cần type riêng

**Sửa:**
- Gộp thành 2 type duy nhất: `NAPTIEN_AUTO` (tự động) + `NAPTIEN_MANUAL` (admin cộng tay)
- Phương thức cụ thể ghi trong `datas.deposit_type` (auto, pay2s, manual)
- Thêm constant `Dongtien::DEPOSIT_TYPES` — dùng cho `whereIn` queries toàn codebase
- Migration update data cũ: `NAPTIEN` + `NAPTIEN_PAY2S` → `NAPTIEN_AUTO`

**Files:**
- `BE/app/Models/MySql/Dongtien.php` (constants + getNoiDung)
- `BE/app/Services/DepositService.php` (type mapping)
- `BE/app/Services/NapTien.php` (type)
- `BE/app/Services/StatisticsService.php` (scanDeposits)
- `BE/app/Http/Controllers/Api/DashboardController.php` (testTotals)
- `BE/app/Http/Controllers/Api/DepositController.php` (raw SQL + queries)
- `BE/app/Http/Controllers/Api/TransactionHistoryController.php` (filter)
- `BE/app/Http/Controllers/Admin/HomeController.php` (dashboard)
- `BE/app/Http/Controllers/Admin/UsersController.php` (lịch sử)
- `BE/app/Http/Controllers/AffiliateController.php` (affiliate)
- `BE/app/Console/Commands/RealtimeStatistics.php` (scan deposits)
- `BE/app/Console/Commands/OrderStatistics.php` (user deposit query)
- `BE/database/migrations/2026_03_05_000001_migrate_deposit_types_to_naptien_auto.php` (mới)

#### 13.32 Thêm order_type (BUY/RENEWAL) + Tạo Order cho gia hạn

**Vấn đề:**
- Gia hạn chỉ update `ApiKey.expired_at` + tạo Dongtien (order_id=NULL), không tạo Order
- Báo cáo thiếu doanh thu gia hạn, không phân biệt được mua mới vs gia hạn

**Sửa:**
- Thêm `order_type` (TINYINT: 0=BUY, 1=RENEWAL) + `parent_order_id` vào bảng `orders`
- Order code prefix: `ORD-` (mua mới) vs `RNW-` (gia hạn)
- Tạo helper `createRenewalOrder()` — dùng chung cho 3 methods gia hạn (V3, V4, V6)
- Mỗi lần gia hạn → tạo Order RENEWAL riêng, link `parent_order_id` về đơn gốc
- `NapTien::ThemDongTien` nhận thêm `$order_id` → Dongtien link tới order
- `report_order_status` thêm `order_type` dimension → aggregate tách bạch BUY/RENEWAL
- Command `report:order-status` đổi sang delete+insert (thay vì updateOrCreate) — tránh stale data
- `OrderReportController` thêm filter `order_type` cho summary + detail

**Files:**
- `BE/database/migrations/2026_03_05_000002_add_order_type_to_orders.php` (mới)
- `BE/database/migrations/2026_03_05_000003_add_order_type_to_report_order_status.php` (mới)
- `BE/app/Models/MySql/Order.php` (constants + fillable + boot prefix + relationships)
- `BE/app/Models/MySql/ReportOrderStatus.php` (fillable + casts)
- `BE/app/Http/Controllers/ProxyController.php` (createRenewalOrder helper + refactor 3 methods)
- `BE/app/Services/NapTien.php` (ThemDongTien thêm order_id param)
- `BE/app/Console/Commands/ReportOrderStatus.php` (order_type groupBy + delete+insert)
- `BE/app/Http/Controllers/Api/OrderReportController.php` (filter order_type + detail output)

#### 13.33 Fix scan logic báo cáo — terminal states + order snapshot

**Vấn đề:**
- Scan chỉ bắt `expired` (4) và `failed` (5), bỏ sót status 6 (partial_refunded), 8 (refunded_all)
- Scan reset khi status thay đổi → double-count revenue
- Revenue chỉ hiện khi order expired (trễ 30 ngày)
- Order counts trong report_order không phản ánh trạng thái hiện tại

**Sửa:**
- Bỏ scan reset trong `Order::boot()` — scan=1 là vĩnh viễn
- Thêm `Order::TERMINAL_STATUSES = [4, 6, 8]`
- Revenue scan: chỉ terminal states (expired, partial_refunded, refunded_all)
- Bỏ failed scan (admin xử lý → chuyển sang terminal state)
- `report_order`: chuyển sang snapshot (delete+insert) cho 14 ngày gần nhất mỗi lần chạy
- successful_orders = status IN (2,3,4,6) — đơn đã deliver proxy

**Files:**
- `BE/app/Models/MySql/Order.php` (bỏ scan reset, thêm TERMINAL_STATUSES)
- `BE/app/Console/Commands/RealtimeStatistics.php` (refactor sections 2-5)

### 06/03/2026

#### 13.34 Fix typo total_refunts → total_refunds + cleanup ReportOrder model

- **Vấn đề**: Column `total_refunts` trong bảng `report_transaction` là typo (đúng: `total_refunds`). ReportOrder model có `$casts` sai column (`date` thay vì `date_at`) và dead code scopes.
- **Sửa**:
  - Migration rename column `total_refunts` → `total_refunds`
  - Update tất cả references trong 5 file BE + 1 file FE
  - Fix `$casts['date']` → `$casts['date_at']` trong ReportOrder
  - Xóa dead code: 3 scopes + 2 static methods dùng sai column
- **Files**:
  - `BE/database/migrations/2026_03_06_000001_rename_total_refunts_to_total_refunds_in_report_transaction.php` (mới)
  - `BE/app/Models/MySql/ReportTransaction.php`
  - `BE/app/Models/MySql/ReportOrder.php`
  - `BE/app/Console/Commands/RealtimeStatistics.php`
  - `BE/app/Services/StatisticsService.php`
  - `BE/app/Http/Controllers/Api/DashboardController.php`
  - `FE/src/views/Client/Admin/Dashboard/DailyStats.tsx`

#### 13.35 Fix migration tương thích proxy_api + thêm refunded_amount

- **Vấn đề**: Migration `change_orders_status_to_tinyint` không xử lý `full_completed` (status=7 trên proxy_api). Khi chạy trên production, records status=7 sẽ bị hiểu nhầm thành `waiting_refund`. Order model thiếu `refunded_amount` (proxy_api có).
- **Sửa**:
  - Fix migration cũ: thêm convert status=7 → 8 + string `full_completed` → 8
  - Tạo migration safety net: convert status=7 → 8 (cho trường hợp migration cũ đã chạy)
  - Thêm `refunded_amount` + `final_amount` vào Order (fillable + migration + auto-calculate)
  - `final_amount = total_amount - refunded_amount` — auto-calculate trong boot `saving` event
  - Cập nhật STATUS_TEXT_MAP comments — ghi rõ backward compat với proxy_api
- **Files**:
  - `BE/database/migrations/2026_03_03_000000_change_orders_status_to_tinyint.php` (sửa)
  - `BE/database/migrations/2026_03_06_000002_convert_full_completed_status.php` (mới)
  - `BE/database/migrations/2026_03_06_000003_add_refunded_amount_to_orders.php` (mới)
  - `BE/database/migrations/2026_03_06_000004_add_final_amount_to_orders.php` (mới)
  - `BE/app/Models/MySql/Order.php` (refunded_amount, final_amount, auto-calculate, comments)

#### 13.36 Redesign Admin Financial Dashboard

- **Vấn đề**: Dashboard cũ query từ bảng aggregated (report_transaction, report_order) → số liệu không chính xác. Không có đối soát (testTotals có nhưng không hiện). Layout 2 cột khó đọc.
- **Sửa**:
  - **BE**: Thêm `financialReport()` vào DashboardController — query trực tiếp source tables (dongtien, orders, users). Tái sử dụng logic đối soát từ `testTotals()`. Hỗ trợ filter date range (start/end).
  - **BE**: Route `GET /admin/financial-report?start=dd-mm-yyyy&end=dd-mm-yyyy`
  - **FE**: Hook `useFinancialReport` với typed response
  - **FE**: 4 components mới: `DateRangeFilter` (preset buttons + date picker), `ReconciliationHero` (hero section xanh/đỏ theo kết quả đối soát), `RevenueProfitCards` (4 KPI cards), `OrdersDepositsRow` (2 cột chi tiết đơn hàng + nạp tiền)
  - **FE**: Rewrite `page.tsx` — single column layout: Filter → Đối soát → KPI → Chi tiết → OrderStatusReport
  - API trả 4 sections: `reconciliation` (đối soát), `revenue` (doanh thu/lợi nhuận), `deposits` (nạp tiền), `orders` (đơn hàng)
- **Files**:
  - `BE/app/Http/Controllers/Api/DashboardController.php` (thêm financialReport)
  - `BE/routes/api.php` (thêm route)
  - `FE/src/hooks/apis/useFinancialReport.ts` (mới)
  - `FE/src/views/Client/Admin/Dashboard/DateRangeFilter.tsx` (mới)
  - `FE/src/views/Client/Admin/Dashboard/ReconciliationHero.tsx` (mới)
  - `FE/src/views/Client/Admin/Dashboard/RevenueProfitCards.tsx` (mới)
  - `FE/src/views/Client/Admin/Dashboard/OrdersDepositsRow.tsx` (mới)
  - `FE/src/app/[lang]/(private)/(client)/admin/dashboard/page.tsx` (rewrite)

#### 13.37 Dashboard v2: ProfitHero + Daily Trend Charts + TB/ngày

- **Vấn đề**: Dashboard v1 (12.36) đặt Đối soát ở trên cùng (quá kỹ thuật), thiếu biểu đồ xu hướng, thiếu TB/ngày — finance manager không trả lời được "đang lãi hay lỗ?", "doanh thu đi lên hay xuống?", "mỗi ngày bao nhiêu bill nạp?".
- **Sửa**:
  - **BE**: Thêm `daily_trend` (30 ngày gần nhất, group by date từ orders + dongtien) + `period_days` vào response `financialReport()`
  - **FE**: `ProfitHero` — hero section xanh/đỏ theo lãi/lỗ, hiện lợi nhuận + margin + TB/ngày + breakdown
  - **FE**: `TrendCharts` — 2 biểu đồ: (1) Doanh thu & Lợi nhuận (AreaChart), (2) Nạp tiền hàng ngày (Bar = tiền, Line = số bill)
  - **FE**: `ReconciliationHero` → đơn giản thành card nhỏ ở dưới cùng (KHỚP/CHÊNH LỆCH)
  - **FE**: `RevenueProfitCards` + `OrdersDepositsRow` thêm TB/ngày (tính từ period_days)
  - **FE**: Mock data (`USE_MOCK = true`) với số liệu realistic cho development
  - **Layout mới**: Filter → ProfitHero → TrendCharts → KPI Cards → Chi tiết → Đối soát → OrderStatusReport
- **Files**:
  - `BE/app/Http/Controllers/Api/DashboardController.php` (thêm daily_trend + period_days)
  - `FE/src/hooks/apis/useFinancialReport.ts` (types + mock data)
  - `FE/src/views/Client/Admin/Dashboard/ProfitHero.tsx` (mới)
  - `FE/src/views/Client/Admin/Dashboard/TrendCharts.tsx` (mới)
  - `FE/src/views/Client/Admin/Dashboard/ReconciliationHero.tsx` (simplify → card nhỏ)
  - `FE/src/views/Client/Admin/Dashboard/RevenueProfitCards.tsx` (thêm TB/ngày)
  - `FE/src/views/Client/Admin/Dashboard/OrdersDepositsRow.tsx` (thêm TB/ngày)
  - `FE/src/app/[lang]/(private)/(client)/admin/dashboard/page.tsx` (restructure layout)

#### 13.38 Dashboard v3: Chỉ số chiến lược + OrderStatusReport fix

- **Vấn đề**: Thiếu chỉ số chiến lược (AOV, tỉ lệ gia hạn/thất bại/hoàn tiền). OrderStatusReport có filter ngày riêng không sync với dashboard, KPI row trùng lặp, legend tiếng Anh.
- **Sửa**:
  - **FE**: `OrdersDepositsRow` thêm cột 3 "Chỉ Số Chiến Lược": AOV, tỉ lệ gia hạn, thất bại, hoàn tiền, chi tiêu (có color threshold)
  - **FE**: `OrderStatusReport` — bỏ KPI row trùng, Việt hóa bar chart legend, sync filter ngày từ parent dashboard, bỏ date picker riêng
  - **FE**: `page.tsx` truyền `filterStart`/`filterEnd` xuống OrderStatusReport
- **Files**:
  - `FE/src/views/Client/Admin/Dashboard/OrdersDepositsRow.tsx` (thêm cột chiến lược)
  - `FE/src/views/Client/Admin/Dashboard/OrderStatusReport.tsx` (bỏ KPI trùng, Việt hóa, sync filter)
  - `FE/src/app/[lang]/(private)/(client)/admin/dashboard/page.tsx` (pass filter props)

### 07/03/2026

#### 13.39 Fix Data Integrity — Refund + Cost + Affiliate Commission

- **Vấn đề**:
  - `order.refunded_amount` **không bao giờ được cập nhật** khi tạo Dongtien REFUND → `final_amount` luôn = `total_amount` (sai)
  - Không chặn duplicate refund → admin bấm 2 lần = user nhận tiền 2 lần
  - Refund flow không dùng DB transaction → race condition trên số dư user
  - Renewal order có `total_cost = 0, cost_price = 0` → báo cáo thiếu chi phí
  - `total_cost_final` (chi phí thực tế) chưa được tính khi giao proxy
  - Affiliate commission không tính vào chi phí khi order expired
  - Dongtien dùng `'REFUND'` string trực tiếp, không có constant phân biệt partial/full
- **Sửa**:
  - **Migration**: thêm `total_cost_final` + `affiliate_commission` vào bảng `orders`
  - **Dongtien model**: thêm `TYPE_REFUND_PARTIAL`, `TYPE_REFUND_FULL`, `REFUND_TYPES` array (backward compat: query cả 3 type `REFUND`, `REFUND_PARTIAL`, `REFUND_FULL`)
  - **SupportTicketController.refundPartialOrder()**: DB::beginTransaction + User::lockForUpdate + duplicate refund check + update `refunded_amount` + `total_cost_final` + type = `REFUND_PARTIAL`
  - **TransactionHistoryController.cancelOrder()**: tương tự + type = `REFUND_FULL` + status đổi từ `waiting_refund`(7) → `refunded_all`(8) + bỏ dead code checks
  - **BasePartner**: `markOrderSuccess()` + `finalizeOrder()` set `total_cost_final = cost_price × delivered_quantity`
  - **ProxyController.createRenewalOrder()**: lấy cost từ ServiceType `price_by_duration` (ưu tiên) hoặc `cost_price` (fallback)
  - **CheckProxyStatus**: affiliate_commission sẽ được tính trong command báo cáo (Phase 2), không tính ở đây
  - **BackfillOrderData command**: sync data cũ (total_cost_final, refunded_amount từ dongtien, affiliate_commission cho expired orders). Hỗ trợ `--dry-run`
  - **ApiKey + ApiKey_v4**: chuyển status từ VARCHAR → TINYINT (ACTIVE=0, INACTIVE=1, EXPIRED=2). Override `toArray()` map int→string cho API output (backward compat)
  - **Migration**: convert data in-place bằng raw SQL, rồi ALTER COLUMN type
  - **FE**: sửa typo `EXPRIRED` → `EXPIRED` ở 5 file (OrderProxy, StaticProxy, RotatingProxy, ProxyDetailModal, OrderDetailModal)
  - **ProxyController**: sửa `FIELD(status, ...)` dùng int thay vì string, sửa type hint `int $statusConst`
- **Files**:
  - `BE/database/migrations/2026_03_07_000001_add_cost_final_and_affiliate_to_orders.php` (mới)
  - `BE/database/migrations/2026_03_07_000002_convert_api_keys_status_to_tinyint.php` (mới)
  - `BE/app/Models/MySql/Dongtien.php` (thêm REFUND constants)
  - `BE/app/Models/MySql/Order.php` (thêm fillable + comments)
  - `BE/app/Models/MySql/ApiKey.php` (int constants + STATUS_TEXT_MAP + toArray)
  - `BE/app/Models/MySql/ApiKey_v4.php` (int constants + STATUS_TEXT_MAP + toArray)
  - `BE/app/Http/Controllers/Api/SupportTicketController.php` (rewrite refundPartialOrder)
  - `BE/app/Http/Controllers/Api/TransactionHistoryController.php` (rewrite cancelOrder)
  - `BE/app/Services/Partners/BasePartner.php` (set total_cost_final)
  - `BE/app/Http/Controllers/ProxyController.php` (renewal cost + FIELD int + type hint)
  - `BE/app/Console/Commands/CheckProxyStatus.php` (bỏ affiliate calc)
  - `BE/app/Console/Commands/BackfillOrderData.php` (mới)
  - `FE/src/views/Client/OrderRotatingProxy/OrderRotatingProxyPage.tsx` (EXPRIRED→EXPIRED)
  - `FE/src/views/Client/OrderProxy/OrderProxyPage.tsx` (EXPRIRED→EXPIRED)
  - `FE/src/views/Client/StaticProxy/OrderProxyPage.tsx` (EXPRIRED→EXPIRED)
  - `FE/src/views/Client/OrderRotatingProxy/ProxyDetailModal.tsx` (EXPRIRED→EXPIRED)
  - `FE/src/views/Client/Admin/TransactionHistory/OrderDetailModal.tsx` (EXPRIRED→EXPIRED)

---

#### 13.40 Report Command — report:daily (đơn hàng + dòng tiền)

- **Vấn đề**: 2 command báo cáo riêng rẽ, thiếu data `total_cost_final`, `refunded_amount`, `affiliate_commission`. Dongtien không có cơ chế scan → không báo cáo được dòng tiền thanh toán.
- **Sửa**:
  - **Command `report:daily`** (hourly), 3 phần:
    - **Đơn hàng terminal** (4,6,8): scan=0 → tính affiliate → **cộng dồn N+M** → scan=1
    - **Đơn hàng non-terminal** (còn lại): query lại tổng hiện tại → **thay thế N=M** (không đánh scan — orders chưa kết thúc)
    - **Dòng tiền**: scan=0 từ dongtien → **cộng dồn N+M** → scan=1 (trong DB transaction)
  - **Dòng tiền normalized**: mỗi row = `date_at × type × user_id` (NAPTIEN_AUTO, THANHTOAN, REFUND_PARTIAL, ...)
  - **Migration 000003**: thêm `total_cost_final`, `total_refunded`, `total_affiliate_commission` vào `report_order_status`
  - **Migration 000004**: tạo `report_deposits` normalized (`date_at × type × user_id × total_amount × count`)
  - **Migration 000005**: thêm `scan` vào dongtien + bỏ data cũ (mark scan=1, truncate reports)
  - **Dongtien model**: thêm `PAYMENT_TYPES` constant
  - **Bỏ backfill** (`--from/--to`): data cũ không dùng, tính từ đầu sau deploy
- **Files**:
  - `BE/app/Console/Commands/ReportDaily.php` (mới)
  - `BE/app/Models/MySql/ReportDeposit.php` (mới)
  - `BE/app/Models/MySql/Dongtien.php` (thêm PAYMENT_TYPES)
  - `BE/app/Models/MySql/ReportOrderStatus.php` (thêm fillable + casts)
  - `BE/app/Models/MySql/Order.php` (sửa comment scan)
  - `BE/database/migrations/2026_03_07_000003_add_cost_columns_to_report_order_status.php` (mới)
  - `BE/database/migrations/2026_03_07_000004_create_report_daily_table.php` (mới — `report_deposits`)
  - `BE/database/migrations/2026_03_07_000005_add_scan_to_dongtien_and_reset_reports.php` (mới)
  - `BE/app/Console/Kernel.php` (schedule update)

#### 13.41 Phase 3 — Dashboard tài chính từ bảng report

- **Vấn đề**: `financialReport()` query trực tiếp 20+ queries từ `orders` + `dongtien`. Không phân biệt doanh thu xác nhận vs dự kiến, dùng chi phí dự kiến thay vì thực tế, thiếu hoa hồng affiliate.
- **Sửa**:
  - **BE `financialReport()`**: Chuyển sang query `report_order_status` + `report_deposits` (pre-aggregated)
    - Revenue: `confirmed` (terminal) vs `expected` (in_use), `cost_actual`, `affiliate_cost`
    - Orders: `by_status[]` array thay vì hardcode `active/completed/failed/refunded`
    - Deposits: đầy đủ 5 loại (auto, manual, payment, refund, affiliate)
    - Mới: `partner_breakdown[]` — hiệu suất theo partner
    - Đối soát (`reconciliation`): vẫn query direct tables (real-time)
  - **FE types**: `FinancialReportData` cập nhật revenue/deposits/orders + thêm `OrderStatusItem`, `PartnerBreakdownItem`
  - **ProfitHero**: hiện "Doanh thu xác nhận" + pipeline (expected), breakdown 4 ô (XN, Chi phí TT, Hoàn, Hoa hồng AF)
  - **RevenueProfitCards**: 4 KPI cards — Doanh thu XN, Chi phí TT, Lợi nhuận (margin%), Tổng nạp
  - **OrdersDepositsRow**: Đơn hàng render từ `by_status[]` dynamic, Dòng tiền hiện đủ 5 loại
  - **PartnerBreakdown** (mới): bảng partner_name, đơn hàng, doanh thu, chi phí, lợi nhuận, margin%
  - `USE_MOCK = false` — tắt mock data
  - **Performance**: Gộp ~32 queries → ~8 queries (conditional aggregation)
  - **Lazy-load reconciliation**: Tách đối soát ra endpoint `/admin/reconciliation` + hook `useReconciliation` riêng — dashboard chính render ngay, đối soát load background
  - **Đối soát dùng report_deposits**: `buildReconciliation()` query `report_deposits` (conditional aggregation) thay `dongtien` trực tiếp. Chỉ duy nhất `users.sodu` (số dư live) là query source table.
  - **Command `report:backfill`**: Populate 2 bảng report từ lịch sử (chạy 1 lần sau deploy). Truncate → aggregate orders → aggregate dongtien → mark scan=1.
  - **Index**: Composite index `dongtien(created_at, type, user_id)`
- **Files**:
  - `BE/app/Http/Controllers/Api/DashboardController.php` (rewrite financialReport + reconciliation endpoint + buildReconciliation dùng report_deposits)
  - `BE/app/Console/Commands/ReportBackfill.php` (mới — `php artisan report:backfill`)
  - `BE/app/Console/Kernel.php` (đăng ký ReportBackfill)
  - `BE/routes/api.php` (thêm route `/admin/reconciliation`)
  - `BE/database/migrations/2026_03_07_000006_add_created_at_index_to_dongtien.php` (mới)
  - `FE/src/hooks/apis/useFinancialReport.ts` (types + useReconciliation hook)
  - `FE/src/views/Client/Admin/Dashboard/ProfitHero.tsx`
  - `FE/src/views/Client/Admin/Dashboard/RevenueProfitCards.tsx`
  - `FE/src/views/Client/Admin/Dashboard/OrdersDepositsRow.tsx` (bỏ reconciliation dep)
  - `FE/src/views/Client/Admin/Dashboard/ReconciliationHero.tsx` (self-loading với useReconciliation)
  - `FE/src/views/Client/Admin/Dashboard/PartnerBreakdown.tsx` (mới)
  - `FE/src/app/[lang]/(private)/(client)/admin/dashboard/page.tsx`

#### 13.42 Dashboard instant render — placeholderData + mock data

- **Vấn đề**: Dashboard chờ API >5s rồi mới render. Nếu report tables trống → "Không có dữ liệu". UX tệ.
- **Sửa**:
  - **Mock data**: Dữ liệu mô phỏng 30 ngày kinh doanh thực tế — 986 đơn, 5 partner, 10 trạng thái, xu hướng tăng nhẹ, margin 39.6%, đối soát chênh 150K. Số liệu nhất quán nội bộ (profit = confirmed - refunded - cost - affiliate).
  - **`placeholderData`**: TanStack Query render mock ngay 0ms, API data thay thế seamlessly khi sẵn sàng.
  - **Bỏ skeleton/empty**: Dashboard luôn render (mock fallback), không còn "Không có dữ liệu".
  - **Loading bar**: Thanh 0.5px gradient animate-pulse ở top khi đang fetch.
  - **ReconciliationHero**: Dùng mock fallback thay skeleton "Đang tải đối soát...".
  - Export `MOCK_FINANCIAL` + `MOCK_RECONCILIATION` cho component fallback.
- **Files**:
  - `FE/src/hooks/apis/useFinancialReport.ts` (mock data + placeholderData + export)
  - `FE/src/app/[lang]/(private)/(client)/admin/dashboard/page.tsx` (bỏ skeleton, fallback mock)
  - `FE/src/views/Client/Admin/Dashboard/ReconciliationHero.tsx` (mock fallback)

#### 13.43 Fix UX: date filter feedback + OrderStatusReport mock data

- **Vấn đề**:
  1. Chọn thời gian (1 ngày, 7 ngày...) không thấy phản hồi giao diện — mock data không thay đổi, loading bar quá nhỏ
  2. "Chi Tiết Đơn Hàng Theo Trạng Thái" ở cuối load nhưng không có data (report tables trống)
- **Sửa**:
  - **Date filter feedback**: Khi `isFetching`, toàn bộ nội dung dashboard dim `opacity-50` + `pointer-events-none` → user thấy rõ đang cập nhật. DateRangeFilter giữ nguyên sáng (không bị dim)
  - **OrderStatusReport mock**: Thêm `placeholderData` cho `useOrderReportSummary` (pie chart + bar chart 7 ngày + status breakdown) và `useOrderReportDetail` (15 mock orders với tên, dịch vụ, trạng thái thực tế)
- **Files**:
  - `FE/src/app/[lang]/(private)/(client)/admin/dashboard/page.tsx` (content dim khi fetching)
  - `FE/src/hooks/apis/useOrderReport.ts` (mock data + placeholderData)

#### 13.44 Fix OrderStatusReport biến mất khi API trả rỗng

- **Vấn đề**: Section "Chi Tiết Đơn Hàng" hiện mock data rồi biến mất (mất luôn) — `placeholderData` bị thay thế khi API trả rỗng/null, điều kiện `summary ? <> : null` render nothing.
- **Sửa**:
  - Fallback mock: `summary = summaryRaw ?? MOCK_SUMMARY`, `detail = detailRaw ?? MOCK_DETAIL` — luôn có data
  - Bỏ `summaryLoading ? <CircularProgress> : summary ? ... : null` — luôn render
  - Dùng `opacity-50` khi `summaryFetching || detailFetching` thay vì spinner
  - Export `MOCK_SUMMARY` + `MOCK_DETAIL` từ hook
- **Files**:
  - `FE/src/hooks/apis/useOrderReport.ts` (export mock constants)
  - `FE/src/views/Client/Admin/Dashboard/OrderStatusReport.tsx` (fallback + bỏ loading skeleton)

#### 13.45 Chuẩn hóa spacing + thêm expected profit & net cash flow

- **Vấn đề**: Spacing không đồng nhất (mỗi component tự quản `mb-4`). Thiếu lợi nhuận dự kiến từ pipeline và dòng tiền ròng cho quản lý tài chính.
- **Sửa**:
  - **Spacing**: Wrapper dùng `space-y-4`, bỏ `mb-4`/`mt-6` khỏi tất cả component → gap đồng nhất 16px
  - **Lợi nhuận dự kiến**: ProfitHero hiện "lãi dự kiến +X" từ pipeline (= expected × margin%). Breakdown thêm ô "Pipeline" màu vàng. Góc phải thêm box "Lợi nhuận dự kiến"
  - **Dòng tiền ròng**: Card Dòng Tiền thêm tổng kết `Net = Nạp - Thanh toán - Rút AF`, hiện xanh (dương) hoặc đỏ (âm)
- **Files**:
  - `FE/src/app/[lang]/(private)/(client)/admin/dashboard/page.tsx` (space-y-4 wrapper)
  - `FE/src/views/Client/Admin/Dashboard/DateRangeFilter.tsx` (bỏ mb-4)
  - `FE/src/views/Client/Admin/Dashboard/ProfitHero.tsx` (expected profit + pipeline box)
  - `FE/src/views/Client/Admin/Dashboard/TrendCharts.tsx` (bỏ mb-4)
  - `FE/src/views/Client/Admin/Dashboard/RevenueProfitCards.tsx` (bỏ mb-4)
  - `FE/src/views/Client/Admin/Dashboard/OrdersDepositsRow.tsx` (net cash flow + bỏ mb-4)
  - `FE/src/views/Client/Admin/Dashboard/PartnerBreakdown.tsx` (bỏ mb-4)
  - `FE/src/views/Client/Admin/Dashboard/ReconciliationHero.tsx` (bỏ mb-4)
  - `FE/src/views/Client/Admin/Dashboard/OrderStatusReport.tsx` (bỏ mt-6)

#### 13.46 Fix migrations — safety checks + duplicate prevention

- **Vấn đề**: `php artisan migrate` lỗi "Duplicate key name 'orders_order_code_unique'" và nhiều migration thiếu `Schema::hasColumn()` → fail nếu chạy lại.
- **Sửa**:
  - **order_code unique**: Thêm check index tồn tại trước khi tạo
  - **Duplicate timestamp**: Đổi `2026_03_04_000001_set_delivered_quantity_default` → `000004`
  - **Duplicate scan dongtien**: Thêm `hasColumn('dongtien', 'scan')` check
  - **11 migrations**: Thêm `Schema::hasColumn()` / index check cho tất cả migration add column/index
- **Files** (BE migrations):
  - `2026_03_04_000000_add_unique_index_to_order_code.php` (check index exists)
  - `2026_03_04_000001_set_delivered_quantity_default.php` → renamed `000004`
  - `2026_03_07_000005_add_scan_to_dongtien_and_reset_reports.php` (hasColumn check)
  - `2026_03_07_000006_add_created_at_index_to_dongtien.php` (check index exists)
  - `2026_02_09_000000_add_is_payment_affiliate_to_orders_table.php` (hasColumn)
  - `2026_02_10_152221_add_is_affiliate_paid_to_orders_table.php` (hasColumn)
  - `2026_03_05_000002_add_order_type_to_orders.php` (hasColumn)
  - `2026_03_05_000003_add_order_type_to_report_order_status.php` (hasColumn + index check)
  - `2026_03_06_000004_add_final_amount_to_orders.php` (hasColumn)
  - `2026_03_07_000001_add_cost_final_and_affiliate_to_orders.php` (hasColumn × 2)
  - `2026_03_07_000003_add_cost_columns_to_report_order_status.php` (hasColumn)

#### 13.47 Fix TrendCharts biến mất + client-side pagination cho OrderStatusReport

- **Vấn đề**:
  1. TrendCharts (biểu đồ doanh thu/lợi nhuận) biến mất khi API trả object rỗng — `apiData ?? MOCK_FINANCIAL` không trigger vì apiData non-null
  2. Detail table phân trang server-side không hoạt động (API trả rỗng), click page gọi API mỗi lần
- **Sửa**:
  - **TrendCharts**: Đổi fallback sang check meaningful data: `apiData.daily_trend?.length > 0 && apiData.revenue?.confirmed > 0`
  - **Client-side pagination**: Fetch 1 lần (per_page=100), slice trên client theo `clientPage` + `perPage`. Mock 50 orders. Bỏ `page` khỏi API params. Dropdown chọn 10/20/50/100 per page
- **Files**:
  - `FE/src/app/[lang]/(private)/(client)/admin/dashboard/page.tsx` (meaningful data check)
  - `FE/src/hooks/apis/useOrderReport.ts` (bỏ page param, per_page=100, mock 50 orders)
  - `FE/src/views/Client/Admin/Dashboard/OrderStatusReport.tsx` (client-side pagination logic)

---

### 07/03/2026

#### 13.48 Bỏ tab "Mua hàng" / "Danh sách" ở trang proxy-tĩnh và proxy-xoay

- **Vấn đề**: Trang proxy-tĩnh và proxy-xoay có tab bar (Mua hàng / Danh sách) không cần thiết
- **Sửa**: Bỏ tab bar, hiển thị nội dung trực tiếp (filter + cards). Bỏ phần Danh sách (OrderProxyPage, OrderRotatingProxyPage)
- **Files**:
  - `FE/src/views/Client/StaticProxy/StaticProxyPage.tsx`
  - `FE/src/components/ProxyPlansClient.tsx`

#### 13.49 Bổ sung 7 thuộc tính sản phẩm proxy (auth, bandwidth, rotation...)

- **Vấn đề**: Card sản phẩm chỉ hiển thị 3 thuộc tính cơ bản (IP version, proxy type, country). Khách thiếu thông tin quan trọng: xác thực kiểu gì, bandwidth bao nhiêu, xoay kiểu gì
- **Sửa**:
  - **BE**: Migration thêm 7 cột vào `type_services`: `auth_type`, `bandwidth`, `rotation_type`, `rotation_interval`, `request_limit`, `concurrent_connections`, `pool_size` (tất cả nullable)
  - **BE**: Cập nhật Model `$fillable` + Controller validation/data mapping
  - **FE Admin**: Thêm section "Thông số sản phẩm" vào `ServiceFormModal` với conditional rendering (field xoay chỉ hiện khi type=Rotating)
  - **FE Admin**: `rotation_interval` chỉ hiện khi rotation_type = sticky/time_based (ẩn khi per_request)
  - **FE Admin**: Fix resolver crash khi `err.inner` undefined + thêm error logging + auto scroll to error
  - **FE Client**: Thêm nhóm chip specs (icon + label) trên card proxy tĩnh và proxy xoay
- **Files**:
  - `BE/database/migrations/2026_03_08_000001_add_product_attributes_to_type_services.php` (mới)
  - `BE/app/Models/MySql/ServiceType.php`
  - `BE/app/Http/Controllers/Api/ServiceTypeController.php`
  - `FE/src/views/Client/Admin/ServiceType/ServiceFormModal.tsx`
  - `FE/src/app/[lang]/(private)/(client)/components/proxy-card/ProxyCard.tsx`
  - `FE/src/views/Client/RotatingProxy/RotatingProxyPage.tsx`
  - `FE/src/app/[lang]/(private)/(client)/proxy-xoay/page.tsx`

### 08/03/2026

#### 13.50 Preview card + giữ modal mở + tối ưu hiệu suất

- **Vấn đề**: Modal đóng sau cập nhật, không có preview, click sửa phải chờ API load lại data dù list đã có sẵn
- **Sửa**:
  - Giữ modal mở sau cập nhật (edit mode), chỉ đóng khi tạo mới
  - Preview card real-time cột phải — 100% giống card khách hàng (Static: ProxyCard layout, Rotating: PlanCard layout). Có: info tags, spec chips, feature rows từ multi_inputs (CheckCircle + label:value giống StaticFeatureRow), duration radio với discount badge (RadioFeatureRow style cho rotating), protocol radio, note collapsible, tags, quantity + total + nút mua, "Tạm ngừng bán"
  - Truyền `initialData` từ list vào modal → mở form tức thì, không gọi API lại
  - Parse `price_by_duration`, `multi_inputs`, `protocols` dạng JSON string (từ list API)
  - Fix bug: bỏ `required` khỏi `api_partner` (chặn submit khi Accordion thu gọn)
  - Auto mở Accordion + hiện lỗi tại field khi BE trả validation error
  - Cải thiện layout form: dialog xl, section dividers, compact spacing (1.5), switches inline, preview 300px, section headers uppercase
- **Files**: `ServiceFormModal.tsx`, `TableServiceType.tsx`

#### 13.51 Checkout Modal — tách chọn số lượng ra khỏi card sản phẩm

- **Vấn đề**: Card sản phẩm (ProxyCard + PlanCard) quá nặng — vừa hiển thị, vừa chọn số lượng, vừa tính tổng. Footer card chiếm nhiều không gian.
- **Sửa**:
  - **CheckoutModal** (mới): Modal thanh toán với bảng giá, QuantityControl, mã giảm giá (future), tóm tắt đơn hàng, cảnh báo số dư, nút thanh toán. Xử lý cả static (`/api/proxy-static`) và rotating (`/api/buy-proxy`)
  - **ProxyCard**: Bỏ `quantity` khỏi schema/form, bỏ `QuantityControl` + tổng tiền + `useBuyProxy` + `ConfirmDialogOrder`. Footer chỉ còn nút "Mua Proxy" → mở CheckoutModal
  - **PlanCard**: Tương tự ProxyCard — bỏ quantity, bỏ `ConfirmDialog`, footer chỉ còn nút "Mua Proxy" → mở CheckoutModal
  - **Admin Preview**: `renderFooter()` bỏ qty + tổng tiền, chỉ giữ nút "Mua Proxy"
  - **Xóa** `ConfirmDialogOrder.tsx` (không còn dùng)
- **Files**:
  - `FE/src/components/checkout-modal/CheckoutModal.tsx` (mới)
  - `FE/src/components/checkout-modal/styles.css` (mới)
  - `FE/src/app/[lang]/(private)/(client)/components/proxy-card/ProxyCard.tsx` (sửa)
  - `FE/src/views/Client/RotatingProxy/RotatingProxyPage.tsx` (sửa)
  - `FE/src/views/Client/Admin/ServiceType/ServiceFormModal.tsx` (sửa)
  - `FE/src/components/confirm-modal/ConfirmDialogOrder.tsx` (xóa)

#### 13.52 Redesign card — feature rows với icon màu, bỏ spec chips

- **Vấn đề**: Card dùng MUI Chip nhỏ cho specs (auth, bandwidth...) + CheckCircle xanh đồng loạt cho feature rows. Thiếu sự phân biệt trực quan giữa các loại thông tin.
- **Sửa**:
  - **Feature rows thay spec chips**: auth_type, bandwidth, rotation_type, rotation_interval, pool_size, request_limit, concurrent_connections giờ hiển thị dạng feature rows thống nhất
  - **Icon màu riêng biệt**: Shield (cam), Wifi (xanh dương), RefreshCw (tím), Clock (vàng), Globe (cyan), Zap (xanh lá), Users (đỏ), MapPin (indigo)
  - **multi_inputs xoay vòng màu**: 7 màu luân phiên thay vì tất cả xanh
  - **Spacing thoáng hơn**: feature-row padding 6px, font 14px, min-height 24px, value bold #1e293b
  - **ProxyCard**: Gộp info chips (IP version, type, country) thành 1 feature row "Loại IP"
  - **Admin Preview**: Cập nhật khớp với client cards
- **Files**:
  - `FE/src/views/Client/RotatingProxy/styles.css` (spacing)
  - `FE/src/views/Client/RotatingProxy/RotatingProxyPage.tsx` (StaticFeatureRow + bỏ chips)
  - `FE/src/app/[lang]/(private)/(client)/proxy-xoay/page.tsx` (icon colors)
  - `FE/src/app/[lang]/(private)/(client)/components/proxy-card/ProxyCard.tsx` (feature rows)
  - `FE/src/app/[lang]/(private)/(client)/components/proxy-card/styles.css` (feature-row styles)
  - `FE/src/views/Client/Admin/ServiceType/ServiceFormModal.tsx` (preview)

#### 13.53 Card 100% static + CheckoutModal chọn duration/protocol

- **Vấn đề**: Card có quá nhiều interactive elements (radio duration, protocol selector), gây rối UX. Duration/protocol nên chọn khi mua, không phải trên card.
- **Sửa**:
  - **CheckoutModal**: Rewrite — nhận `priceOptions: PriceOption[]` + `protocols: string[]`, tự render duration selector (có discount badge) + protocol selector bên trong modal
  - **ProxyCard**: Bỏ toàn bộ form (react-hook-form, yup), protocol hiển thị dạng static feature row "Hỗ trợ: HTTP/SOCKS5", thêm note preview dưới title, thêm giá header
  - **PlanCard**: Bỏ time/protocol radio, thêm giá header (title trái + giá phải), thêm note preview, protocol dạng static feature row
  - **Admin Preview**: Cập nhật khớp — rotating thêm giá header + note preview + IP info row + protocol static row, bỏ duration/protocol radio. Static thêm note preview + protocol static row, bỏ ProtocolSelector/duration buttons. Footer dùng gradient giống client
  - **Nút mua**: Luôn hiển thị "Mua Proxy" thay vì đổi text "Đăng nhập" khi chưa auth (handle auth silently qua modal)
- **Files**:
  - `FE/src/components/checkout-modal/CheckoutModal.tsx` (rewrite interface)
  - `FE/src/components/checkout-modal/styles.css` (duration options, product name)
  - `FE/src/app/[lang]/(private)/(client)/components/proxy-card/ProxyCard.tsx` (bỏ form)
  - `FE/src/views/Client/RotatingProxy/RotatingProxyPage.tsx` (PlanCard simplify)
  - `FE/src/views/Client/Admin/ServiceType/ServiceFormModal.tsx` (preview khớp)

#### 13.54 Redesign nút mua — outlined button + interaction states

- **Vấn đề**: Nút mua filled gradient đỏ→cam quá nổi bật, 6 card = 6 khối màu lớn chiếm visual weight. Mắt user bị kéo xuống button thay vì đọc nội dung sản phẩm. Thiếu `:active` (click không feedback), thiếu `:focus-visible`. Shimmer thừa (mobile không thấy).
- **Sửa**:
  - **Outlined brand accent**: Default viền `#F88A4B` (cam) + text `#ea580c` (cam đậm) → on-brand, khác biệt rõ với giá đỏ `#e53e3e`
  - **Hover**: Fill brand gradient `45deg, #FC4336, #F88A4B` + text trắng → on-brand, ấm áp
  - **Active**: `#e63946` + scale 0.97 → biết đã click
  - **Focus-visible**: Ring cam 3px
  - **Padding**: 12px (từ 10px) → đạt 44px min touch target
  - **Disabled**: `#f1f5f9` bg + `#94a3b8` text + `#e2e8f0` border
  - **Bỏ shimmer** `::before` pseudo-element
  - **Text**: Luôn "Mua Proxy" (bỏ đổi "Đăng nhập" khi chưa auth)
  - **Checkout pay-btn giữ filled** (modal đã focus hành động, cần nổi bật)
- **Files**:
  - `FE/src/app/[lang]/(public)/main.css` (buy-button base)
  - `FE/src/app/[lang]/(landing-page)/main.css` (buy-button copy)
  - `FE/src/components/checkout-modal/styles.css` (thêm active/focus cho pay-btn)
  - `FE/src/app/[lang]/(private)/(client)/components/proxy-card/styles.css` (bỏ override thừa)
  - `FE/src/views/Client/RotatingProxy/styles.css` (bỏ override thừa)
  - `FE/src/views/Client/Admin/ServiceType/ServiceFormModal.tsx` (preview khớp outlined)
  - **Card hover polish**: Shadow brand-tinted `rgba(252,67,54,0.08)`, border tint `rgba(248,138,75,0.25)`, lift `-4px`, transition `0.25s`. Shadow default layered hơn.
  - **Files thêm**: `FE/src/app/globals.css`, `FE/src/views/Client/RotatingProxy/styles.css`, `proxy-card/styles.css`

#### 13.55 Mute brand colors + tags + card UX polish

- **Vấn đề**: Màu brand quá chói. Tag vị trí chưa tối ưu. Button mua chưa mềm mại.
- **Sửa**:
  - **Tags → border badge**: `position: absolute, top: 0, left: 14, translateY(-50%)` — nằm trên viền card, không ảnh hưởng layout. Card `overflow: visible`.
  - **Tag refined**: Gradient background (135deg, 2-tone), white semi-transparent border, colored shadow thay vì black, font 600 + letter-spacing 0.3px, icon 10px. Premium/tinh tế hơn flat solid.
  - **Button mềm mại**: Light warm fill `#fff5ed`, text `#d06830`, border `#f0c4a0`. Hover → `#f0944e` (warm → deeper warm).
  - **Tags mới**: "Best Seller" (amber) + "Hot" (coral) trong `tagConfig.ts` với gradient
  - **Feature rows**: Hover highlight `#f8fafc`, padding-inline `4px`
  - **Price**: "từ" prefix khi nhiều mức giá
- **Files**:
  - `FE/src/app/[lang]/(public)/main.css`, `(landing-page)/main.css` (button soft fill)
  - `FE/src/views/Client/RotatingProxy/styles.css`, `proxy-card/styles.css` (hover + feature row)
  - `FE/src/configs/tagConfig.ts` (gradient + icon cho tags)
  - `ProxyCard.tsx`, `RotatingProxyPage.tsx` (border badge, refined rendering)
  - `ServiceFormModal.tsx` (preview tag khớp refined style)

#### 13.56 Bỏ expandable note + RichTextEditor → textarea

- **Vấn đề**: Expandable "Ghi chú sản phẩm" thừa, RichTextEditor quá nặng cho mô tả ngắn
- **Sửa**:
  - Bỏ expandable note (note-info-box) khỏi ProxyCard, PlanCard, admin preview
  - Giữ note preview ngắn dưới tên sản phẩm
  - Thay RichTextEditor bằng textarea 500 ký tự, gộp vào Section 1 form
  - Di chuyển Tags vào Section 1, xóa Section "Mô tả sản phẩm"
  - Xóa unused imports: `ChevronDown`, `Info`, `sanitizeHtml`
- **Files**: `ProxyCard.tsx`, `RotatingProxyPage.tsx`, `ServiceFormModal.tsx`

### 09/03/2026

#### 13.57 FE Admin — Trang đối soát giao dịch ngân hàng + Webhook Logs

- **Vấn đề**: Admin không có giao diện xem/lọc giao dịch ngân hàng từ webhook pay2s, không đối soát được ai nạp, nạp bao nhiêu, có match hay không. Cũng không xem được lịch sử webhook raw data.
- **Sửa**:
  - **API hook** `useTransactionBank.ts`: 3 hooks — `useTransactionBank` (danh sách GD), `useTransactionBankSummary` (thống kê), `useWebhookLogs` (webhook logs). Pattern useAxiosAuth + useQuery
  - **Trang Giao dịch ngân hàng**: Summary cards (tổng GD, tiền vào, đã/chưa xử lý) + filter bar (ngân hàng, trạng thái, loại, search) + bảng 10 cột (ID, gateway, số TK, mã GD, ngày, nội dung, loại IN/OUT, số tiền, trạng thái, ID đối tác) + server-side pagination
  - **Trang Webhook Logs**: Filter bar (đối tác, response code) + bảng 8 cột (ID, partner, IP, method, response code badge màu, số GD, thời gian, nút xem chi tiết) + Dialog xem raw payload & headers JSON formatted
  - **Navigation**: Thêm 2 menu items "Giao dịch ngân hàng" (Landmark icon) + "Webhook Logs" (Webhook icon) vào admin MenuSection, permission `admin.depositHistory`. Prefetch routes
- **Files**:
  - `FE/src/hooks/apis/useTransactionBank.ts` (mới)
  - `FE/src/views/Client/Admin/TransactionBank/TableTransactionBank.tsx` (mới)
  - `FE/src/views/Client/Admin/WebhookLogs/TableWebhookLogs.tsx` (mới)
  - `FE/src/app/[lang]/(private)/(client)/admin/transaction-bank/page.tsx` (mới)
  - `FE/src/app/[lang]/(private)/(client)/admin/webhook-logs/page.tsx` (mới)
  - `FE/src/components/layout/vertical/VerticalMenu.tsx` (sửa — thêm 2 menu items + prefetch)

#### 13.58 Gộp trang đối soát nạp tiền — investigation + cộng tiền thủ công

- **Vấn đề**: Admin non-tech không biết phải làm gì. 2 menu tách rời (GD ngân hàng + Webhook). Khi khách báo nạp không lên tiền, không có công cụ điều tra nguyên nhân và không thể cộng tay từ giao diện.
- **Sửa**:
  - **BE**: Migration thêm `matched_user_id` + `matched_bank_auto_id` vào `transaction_bank`. Thêm 2 endpoint: `GET /admin/transaction-bank/{id}/investigate` (phân tích tại sao GD chưa xử lý: content match, pending deposit, reason) + `POST /admin/transaction-bank/{id}/manual-credit` (cộng tiền thủ công với anti-dup 4 lớp: is_processed check → lockForUpdate → endpoint recheck → unique TID)
  - **Gộp 2 trang → 1**: Trang "Đối soát nạp tiền" với MUI Tabs (Giao dịch | Nhật ký hệ thống). Xóa page webhook-logs riêng
  - **Investigation panel**: Click GD chưa xử lý → dialog hiện: webhook đã nhận ✅, nội dung CK khớp user hay không, user có lệnh nạp đang chờ hay không, nguyên nhân cụ thể
  - **Cộng tiền thủ công**: Autocomplete chọn user (auto-suggest từ investigation), số tiền readonly, ghi chú admin → confirm → cộng qua DepositService
  - **UX**: Date presets, cột "Người nhận", banner xanh/vàng, highlight dòng chưa xử lý, Webhook Logs tiếng Việt hóa
  - **Menu**: Gộp 2 menu → 1 entry "Đối soát nạp tiền"
- **Files**:
  - `BE/database/migrations/2026_03_09_000002_add_matched_user_id_to_transaction_bank.php` (mới)
  - `BE/app/Models/MySql/TransactionBank.php` (thêm matchedUser relation)
  - `BE/app/Http/Controllers/Api/TransactionBankController.php` (thêm investigate + manualCredit)
  - `BE/app/Http/Controllers/Api/WebhookPay2sController.php` (lưu matched_user_id)
  - `BE/routes/api.php` (thêm 2 routes)
  - `FE/src/hooks/apis/useTransactionBank.ts` (thêm useInvestigate + useManualCredit)
  - `FE/src/app/[lang]/(private)/(client)/admin/transaction-bank/page.tsx` (rewrite — tabs)
  - `FE/src/views/Client/Admin/TransactionBank/TableTransactionBank.tsx` (rewrite — investigation + manual credit)
  - `FE/src/views/Client/Admin/WebhookLogs/TableWebhookLogs.tsx` (rewrite — tiếng Việt)
  - `FE/src/components/layout/vertical/VerticalMenu.tsx` (gộp menu)

#### 13.63 Quản lý nạp tiền — Evidence Chain 6 bước + Dismiss + Gộp 3 trang

- **Vấn đề**: 3 trang admin rời rạc (Lịch sử giao dịch, Lịch sử chuyển tiền, Đối soát nạp tiền) gây nhầm lẫn. Khi khách báo "nạp không lên", admin phải mở 3 trang tự đoán. Không có chuỗi bằng chứng liên kết, không bỏ qua được GD spam.
- **Sửa**:
  - **BE**: Migration thêm `dismissed_at/dismissed_by/dismiss_reason` cho `transaction_bank`. Endpoint `investigateFull` — chuỗi bằng chứng 6 bước (webhook → GD ngân hàng → khớp nội dung CK → lệnh nạp → cộng tiền → hoàn tất) với 2 entry point: từ `transaction_bank` hoặc `bank_auto`. Endpoint `dismiss/undismiss` cho GD spam. Endpoint `adminDeposits` — danh sách bank_auto server-side pagination.
  - **FE**: Gộp 3 trang → 1 trang "Quản lý nạp tiền" với 3 tabs (Giao dịch ngân hàng + Lệnh nạp tiền + Nhật ký webhook), badge đỏ hiện số cần xử lý. InvestigationDrawer — MUI Drawer hiện evidence chain dạng stepper (xanh/đỏ/xám), near-matches khi khớp sai, gợi ý hành động, form cộng tay + bỏ qua. Dismiss: row xám strikethrough, undo được.
  - **Menu**: Đổi "Lịch sử giao dịch" → "Biến động số dư", "Đối soát nạp tiền" → "Quản lý nạp tiền". Xóa menu "Lịch sử chuyển tiền". Xóa trang admin/deposit-history.
- **Files**:
  - `BE/database/migrations/2026_03_10_000001_add_dismiss_to_transaction_bank.php` (mới)
  - `BE/app/Models/MySql/TransactionBank.php` (thêm dismiss fields + relation)
  - `BE/app/Http/Controllers/Api/TransactionBankController.php` (thêm investigateFull, dismiss, undismiss, adminDeposits)
  - `BE/routes/api.php` (thêm 4 routes)
  - `FE/src/hooks/apis/useDepositManagement.ts` (mới — 4 hooks)
  - `FE/src/views/Client/Admin/DepositManagement/InvestigationDrawer.tsx` (mới)
  - `FE/src/views/Client/Admin/DepositManagement/TabDepositRequests.tsx` (mới)
  - `FE/src/app/[lang]/(private)/(client)/admin/transaction-bank/page.tsx` (rewrite — 3 tabs + badges)
  - `FE/src/views/Client/Admin/TransactionBank/TableTransactionBank.tsx` (rewrite — dismiss + InvestigationDrawer)
  - `FE/src/components/layout/vertical/VerticalMenu.tsx` (rename + cleanup)
  - `FE/src/app/[lang]/(private)/(client)/admin/deposit-history/page.tsx` (xóa)
  - `FE/src/views/Client/Admin/DepositHistory/TableDepositHistory.tsx` (xóa)
  - `FE/src/app/[lang]/(private)/(client)/admin/webhook-logs/page.tsx` (xóa)

#### 13.57 Tag redesign — pill badge trong card, nền đậm + icon

- **Vấn đề**: Tag corner ribbon 8px quá nhỏ, mờ, khó đọc. Preview không khớp client.
- **Sửa**:
  - **tagConfig**: Đổi pastel → nền đậm + text trắng. Thêm icon emoji (🛡️ ⚡ 🔥 🏆). Thêm tag "Phổ biến".
  - **Client cards + preview**: Pill badge 12px bold, borderRadius 20px, colored shadow nhẹ. Nằm trong card (không absolute), là phần tử đầu tiên trước title. Không đè lên component ngoài.
- **Files**: `tagConfig.ts`, `ProxyCard.tsx`, `RotatingProxyPage.tsx`, `ServiceFormModal.tsx`

#### 13.58 Counter gói + tag on-border không overlap

- **Vấn đề**: "6/6 gói" chiếm dòng riêng lãng phí. Tag trên viền card đè lên component phía trên.
- **Sửa**:
  - Gộp counter vào header filter: `Bộ lọc (X/Y)`. Bỏ dòng riêng (rotating) + footer (static).
  - Tag giữ absolute `top: -12px` trên viền card. Card `overflow: visible`. Grid tăng `rowSpacing={4}` + `mt` để tag không đè lên filter box/card hàng trên.
- **Files**: `RotatingProxyPage.tsx`, `StaticProxyPage.tsx`, `ProxyCard.tsx`, `ServiceFormModal.tsx`, `globals.css`, `proxy-card/styles.css`, `RotatingProxy/styles.css`

#### 13.59 Tag điệu đà + Filter quốc gia có cờ

- **Sửa**:
  - **Tag**: Glass effect (gradient overlay + inset shadow), border trắng mờ, chuyển sang phải (`right: 14px`)
  - **Filter quốc gia**: Flag images từ flagcdn.com (Windows không hỗ trợ flag emoji), pill tròn `borderRadius: 20px`, tên tiếng Việt
  - **tagConfig**: Thêm field `gradient`, helper `getCountryName()`, `COUNTRY_NAMES` mapping
- **Files**: `tagConfig.ts`, `ProxyCard.tsx`, `RotatingProxyPage.tsx`, `StaticProxyPage.tsx`, `ServiceFormModal.tsx`

#### 13.60 Cờ quốc gia trên product cards

- **Sửa**: Hiển thị flag image (flagcdn.com) cạnh tên quốc gia trong row "Loại IP" trên tất cả product cards
  - **ProxyCard**: Thêm `<img>` flag vào feature row "Loại IP"
  - **PlanCard (Rotating)**: Thêm row "Loại IP" mới với MapPin icon + flag + tên quốc gia (tiếng Việt)
  - **Admin preview**: Thêm flag image vào cả 2 preview (rotating + static)
- **Files**: `ProxyCard.tsx`, `RotatingProxyPage.tsx`, `ServiceFormModal.tsx`

#### 13.61 Hiển thị ID sản phẩm + bỏ blur modal

- **Sửa**:
  - Hiển thị `#id` nhỏ (11px, màu xám) cạnh tên sản phẩm trên ProxyCard, PlanCard và CheckoutModal
  - Bỏ `backdrop-filter: blur(4px)` trên checkout overlay, giảm opacity còn 0.35 (tối nhẹ, không mờ)
- **Files**: `ProxyCard.tsx`, `RotatingProxyPage.tsx`, `CheckoutModal.tsx`, `checkout-modal/styles.css`

#### 13.62 Admin User Management — trang quản lý Users đầy đủ

- **Vấn đề**: Admin không có giao diện quản lý users trên hệ thống mới (trang cũ chỉ là stub). Cần xem danh sách, tìm kiếm, sửa thông tin, cộng/trừ tiền, ban/unban, reset password.
- **Sửa**:
  - **BE**: Tạo `AdminUserController` với 5 endpoints: list (paginated + stats + search), update, adjust-balance, toggle-ban, reset-password. Migration thêm cột `is_banned` vào users table.
  - **FE**: Stats cards (tổng users, mới tháng này, tổng số dư, tổng nạp). Bảng server-side pagination với 9 cột. Search theo tên/email/SĐT. 4 actions: Edit (modal form), Cộng/trừ tiền (modal toggle add/subtract), Ban/Unban (confirm dialog), Reset password (dialog hiện password mới).
  - **Menu**: Đổi "Quản lý tài khoản" → "Users"
- **Files**:
  - `BE/app/Http/Controllers/Api/AdminUserController.php` (mới)
  - `BE/database/migrations/2026_03_09_100001_add_is_banned_to_users_table.php` (mới)
  - `BE/app/User.php` (thêm is_banned vào fillable)
  - `BE/routes/api.php` (thêm 5 routes admin/users)
  - `FE/src/hooks/apis/useAdminUsers.ts` (mới)
  - `FE/src/views/Client/Admin/Users/UsersPage.tsx` (rewrite)
  - `FE/src/views/Client/Admin/Users/TableUsers.tsx` (mới)
  - `FE/src/views/Client/Admin/Users/ModalEditUser.tsx` (mới)
  - `FE/src/views/Client/Admin/Users/ModalBalanceAdjust.tsx` (mới)
  - `FE/src/components/layout/vertical/VerticalMenu.tsx` (đổi label)

#### 13.64 Redesign sidebar menu + BalanceCard

- **Vấn đề**: Menu nhóm "Dịch vụ" chứa quá nhiều item không liên quan. BalanceCard gradient orange→red quá chói, UX kém. Admin menu lộn xộn.
- **Sửa**:
  - **Client menu**: Đổi "Proxy" → "Sản phẩm", gom Check Proxy + Lịch sử mua hàng vào. Tách "Tài chính" (Nạp tiền, Lịch sử GD), "Kiếm tiền" (Affiliate, Đối tác), "Hỗ trợ" (API Docs, Hỗ trợ, Liên hệ). Bỏ section "Liên hệ" cũ.
  - **Admin menu**: Sắp xếp theo nhóm — Sản phẩm & Đơn hàng (Quản lý sản phẩm, Đối tác, Đơn thiếu proxy), Tài chính (Lịch sử giao dịch, Quản lý nạp tiền), Người dùng & Hỗ trợ, Cài đặt. Đổi tên: "Dịch vụ" → "Quản lý sản phẩm", "Biến động số dư" → "Lịch sử giao dịch", "Users" → "Người dùng". Fix icon phù hợp.
  - **BalanceCard**: Bỏ gradient chói → nền `slate-50` + border nhẹ, text tối dễ đọc.
- **Files**: `VerticalMenu.tsx`, `BalanceCardClient.tsx`

#### 13.65 Landing page — rewrite PartnersSection + audit toàn bộ

- **Vấn đề**: PartnersSection blank hoàn toàn (content không render) do CSS phức tạp: 820+ dòng duplicate, decorative background (z-index/mask/animation) che content. Padding sections thừa. Hero có `target='_blank'` trên link nội bộ. `<main>` có class `flex-auto` giãn ra fill viewport → khoảng trắng lớn dưới content.
- **Sửa**:
  - **PartnersSection**: Rewrite hoàn toàn — bỏ decorative background, floating shapes, grid pattern SVG, infinite scroll animation, CSS mask. Dùng inline styles đảm bảo render. Component gọn từ 233 → 120 dòng.
  - **CSS cleanup**: Xóa 820+ dòng CSS partners duplicate trong `main.css` (4854 → 4035 dòng). Xóa CSS partners trong `mobile-responsive.css`.
  - **Layout fix**: Bỏ `flex-auto` trên VerticalLayout root + LayoutContent khi landing page. Override `height/min-height` trên html/body via CSS `:has(.landing-page)`.
  - **Missing sections**: Thêm `TestimonialsSection` (reviews khách hàng) + `VietnamCoverageSection` (bản đồ phủ sóng) vào page.tsx. Rewrite cả 2 với inline styles, bỏ CSS classes không tồn tại.
  - **Products section**: Giảm `padding-block-end` từ 100px → 40px
  - **Hero**: Bỏ button "Xem demo", đổi route "Mua Proxy Ngay" → `/proxy-xoay`, bỏ `target='_blank'` trên link nội bộ
- **Files**: `PartnersSection.tsx`, `TestimonialsSection.tsx`, `VietnamCoverageSection.tsx`, `Hero.tsx`, `page.tsx`, `VerticalLayout.tsx`, `LayoutContent.tsx`, `main.css`, `mobile-responsive.css`

#### 13.66 Admin Users — Lịch sử giao dịch user

- **Vấn đề**: Admin cộng/trừ tiền tay có ghi chú nhưng không có chỗ xem lại lịch sử giao dịch của user.
- **Sửa**: Thêm modal xem lịch sử giao dịch (100 giao dịch gần nhất) với cột: thời gian, loại GD, số dư trước/thay đổi/sau, nội dung. Nút "Lịch sử" (icon History) trong cột Thao tác.
- **Files**: `UserTransactionModal.tsx` (mới), `TableUsers.tsx`, `UsersPage.tsx`, `useAdminUsers.ts`, `AdminUserController.php`, `api.php`

#### 13.66 Fix bộ lọc Lịch sử giao dịch + Trang Quản lý đơn hàng

- **Vấn đề**: Bộ lọc "Lịch sử giao dịch" dùng trạng thái đơn hàng (ORDER_STATUS) thay vì loại giao dịch (TRANSACTION_TYPES). Thiếu trang quản lý đơn hàng riêng biệt cho admin.
- **Sửa**:
  - Fix dropdown filter: đổi từ ORDER_STATUS → TRANSACTION_TYPES, param `status` → `type`
  - Tạo trang `/admin/orders` với: 4 stats cards (tổng đơn, doanh thu, vốn, lợi nhuận), bộ lọc (date range, status, partner, order type), bảng server-side pagination, actions (xem chi tiết, hủy+hoàn tiền, gửi lại)
  - Thêm menu "Quản lý đơn hàng" (icon ShoppingCart) vào sidebar admin
- **Files**: `TableTransactionHistory.tsx`, `AdminOrdersPage.tsx` (mới), `admin/orders/page.tsx` (mới), `useOrderReport.ts`, `VerticalMenu.tsx`

#### 13.67 Redesign BalanceCard sidebar + Form nạp tiền

- **Vấn đề**: Card "Số dư" sidebar quá plain. Form nạp tiền full-width trống trải, thiếu context (không hiện số dư, không có flow hint), warning đỏ hiện trước khi user làm gì.
- **Sửa**:
  - BalanceCard: compact 1 hàng (icon brand accent + label + số tiền), bỏ card background nặng
  - RechargePage form: centered max-480px, header gradient brand, hiện số dư hiện tại, flow hint, mệnh giá dạng chips pill, bỏ warning trước QR
  - RechargeInputDialog: sync UI tương tự (flow hint, chips pill, bỏ warning)
- **Files**: `BalanceCardClient.tsx`, `RechargePage.tsx`, `RechargeInputDialog.tsx`

#### 13.68 Redesign Announcement Feed trang chủ

- **Vấn đề**: Mọi thông báo trông giống nhau (cùng avatar xanh "Admin"), không phân biệt loại khi lướt nhanh, action bar trống trải.
- **Sửa**:
  - Bỏ avatar + "Admin" lặp lại → thay bằng icon + màu theo loại (Tag/Sparkles/TrendingUp/Wrench/Megaphone)
  - Thêm left border accent theo màu loại → lướt nhanh biết ngay bảo trì (đỏ) hay giảm giá (xanh)
  - Header gọn: type icon + chip + time trên 1 dòng
  - Action button thu gọn (inline, không full-width)
  - Skeleton loading match layout mới
  - Empty state: thay "Chưa có thông báo nào" bằng welcome + 4 quick action cards (Mua Proxy, Nạp tiền, Check Proxy, API Docs)
- **Files**: `home/page.tsx`, `globals.css`

### 10/03/2026

#### 13.69 Fix lỗi insert `quantity` vào bảng `api_keys`

- **Vấn đề**: `HomeProxyPartner::buy()` insert cột `quantity` vào bảng `api_keys`, nhưng bảng này không có cột đó → lỗi `Column not found: 1054 Unknown column 'quantity'`
- **Sửa**: Xóa `'quantity' => 1` khỏi batch insert `api_keys` (quantity chỉ thuộc bảng `orders`)
- **Files**: `BE/app/Services/Partners/HomeProxy/HomeProxyPartner.php`

#### 13.70 Nâng cấp UX trang Lịch sử mua hàng (client)

- **Vấn đề**: Status labels SAI (status 3 hiện "Thất bại" nhưng thực tế là "Thiếu proxy", status 4/5 cũng sai), thiếu tên dịch vụ, không có search/filter, giá trong modal dùng sai source
- **Sửa**:
  - Dùng `ORDER_STATUS_LABELS`/`ORDER_STATUS_COLORS` từ constants thay hard-coded (đủ 10 trạng thái)
  - Thêm cột "Dịch vụ" (tên + proxy_type) vào bảng chính
  - Thêm search (mã đơn/tên dịch vụ) + filter theo trạng thái (client-side)
  - Hiển thị thời gian còn lại ("còn Xd Xh") cho đơn đang hoạt động
  - Hiển thị `delivered_quantity/quantity` khi khác nhau
  - Fix giá dùng `price_per_unit` thay `type_servi.price`, protocol thực thay hard-coded
  - Bật TimeProxyDie countdown trong DetailProxy
  - Dọn console.log, fix text "Kích cỡ trang linh"
- **Files**: `HistoryOrderPage.tsx`, `OrderDetail.tsx`, `DetaiProxy.tsx`

#### 13.71 Fix lỗi `quantity` trong tất cả Partner files + double submit khi mua hàng

- **Vấn đề 1**: Tất cả Partner files (HomeProxyStatic, ProxyVNStatic, UpproxyStatic, MktProxy, ProxyVN, ZingProxy, Upproxy rotating) insert cột `quantity` vào bảng `api_keys` nhưng bảng không có cột đó → lỗi SQL khi mua hàng
- **Vấn đề 2**: CheckoutModal tạo axios instance mới mỗi lần mutate (không dùng `useAxiosAuth`), không có guard chống rapid-click → click mua 1 lần nhưng API có thể gọi nhiều lần
- **Sửa**:
  - Xóa `'quantity' => 1` / `'quantity' => $dataBody['quantity']` khỏi insert `api_keys` trong 7 file Partner
  - CheckoutModal: dùng `useAxiosAuth()` gọi trực tiếp đến Laravel API, thêm `useRef` guard chống double-click
  - Bỏ auto-close modal + auto-navigate sau mua thành công (giữ modal mở, khách tự đóng)
  - Chặn đóng modal (overlay/nút X) khi đang pending
  - Thêm state `purchaseSuccess` → nút chuyển "Mua thành công" (xanh) 2 giây rồi tự reset để khách mua tiếp
  - Thêm invalidate `userOrders` query để trang lịch sử tự cập nhật
- **Files**: `HomeProxyStaticPartner.php`, `ProxyVNStaticPartner.php`, `UpproxyStaticPartner.php`, `MktProxyPartner.php`, `ProxyVNPartner.php`, `ZingProxyPartner.php`, `UpproxyPartner.php`, `CheckoutModal.tsx`

#### 13.72 Ẩn thông tin nhạy cảm API lịch sử mua hàng + fix bảo mật getKeyOrder

- **Vấn đề**: API `/get-order` trả về toàn bộ model Order/ServiceType/ApiKey cho client, bao gồm giá vốn (`cost_price`, `total_cost`, `total_cost_final`), key đối tác (`api_key_partner`), hoa hồng (`affiliate_commission`), `partner_id`, `api_body`... Endpoint `getKeyOrder` không kiểm tra quyền sở hữu (user A xem được proxy của user B).
- **Sửa**:
  - `getOrder()`: bỏ eager load `User`, thêm `makeHidden()` cho Order (cost_price, total_cost, total_cost_final, affiliate_commission, api_key_partner, is_affiliate_paid, is_payment_affiliate, scan, retry, note), ServiceType (cost_price, partner_id, api_body, api_type), ApiKey (api_key_partner, price_cost)
  - `getKeyOrder()`: thêm check `user_id` ownership trước khi trả data, thêm `makeHidden()` cho ApiKey
- **Files**: `BE/app/Http/Controllers/Api/OrderController.php`

#### 13.73 Nâng cấp UX trang nạp tiền — auto-detect thanh toán + ghi chú 10 phút

- **Vấn đề**: Khi bill pending được thanh toán, UI chỉ mất phần QR mà không có thông báo thành công, số dư không tự cập nhật. Thiếu ghi chú rõ ràng cho khách về trường hợp chuyển khoản quá 10 phút.
- **Sửa**:
  - Detect payment success: khi `pendingData` chuyển từ có → null mà còn countdown > 0 và không phải cancel → toast thành công + banner xanh + tự refresh balance (gọi `/me`) + refresh lịch sử nạp/giao dịch
  - Thêm indicator "Tự động kiểm tra mỗi 5 giây" (pulsing dot) khi đang có bill pending
  - Cải thiện note: box vàng nổi bật, ghi rõ "Nếu đã chuyển khoản quá 10 phút mà chưa nhận được, vui lòng liên hệ Admin"
  - Fix text "Kích cỡ trang" → "Hiển thị mỗi trang"
  - Áp dụng cho cả RechargePage (trang chính) và RechargeInputDialog (dialog)
- **Files**: `RechargePage.tsx`, `RechargeInputDialog.tsx`

#### 13.74 Ẩn thông tin nhạy cảm API proxy storefront + fix error messages

- **Vấn đề**: API `/get-proxy-static` và `/get-proxy-rotating` eager load `partner` relation → lộ **token_api** (API credential), `partner_code`, `cost_price`, `api_body`... Endpoint `getOrderProxyStatic` load relation `User` thừa. Error messages từ server buy proxy trả về tiếng Anh kỹ thuật. `price_by_duration` chứa trường `cost` (giá vốn).
- **Sửa**:
  - Bỏ `->with('partner')` trong `getProxyRotate()` và `getProxyStatic()` (FE không dùng)
  - Thêm `makeHidden()` cho `cost_price`, `partner_id`, `api_body`, `api_type`, `discount_price`
  - Strip `cost` khỏi `price_by_duration` entries
  - `getOrderProxyStatic()`: bỏ load `User` thừa, ẩn `api_key_partner`, `price_cost` trên ApiKey
  - Thêm `mapErrorMessage()` trong ProxyController: map lỗi nội bộ (English) → tiếng Việt cho khách
  - Catch blocks trả `'Lỗi hệ thống, vui lòng thử lại sau hoặc liên hệ Admin.'` thay `'Internal Server Error'`
  - Detect payment threshold 15s tránh false positive khi countdown gần hết
- **Files**: `BE/app/Http/Controllers/Api/ProxyController.php`, `RechargePage.tsx`, `RechargeInputDialog.tsx`

#### 13.75 Thêm cột partner_price + ẩn price_cost toàn bộ client API

- **Vấn đề**: `price_cost` hiển thị trong lịch sử cho khách. Cần 2 loại giá cost: giá vốn bên mình (`price_cost`) và giá thực tế đối tác tính (`partner_price`) để đối chiếu.
- **Sửa**:
  - Migration thêm cột `partner_price` (decimal 15,2, nullable) vào `api_keys`
  - Cập nhật ApiKey model: thêm `partner_price` vào `$fillable` và `$moneyFields`
  - 8 Partner buy() methods: populate `price_cost` + `partner_price` khi tạo ApiKey
  - Fix 4 endpoint còn thiếu `makeHidden`: `getOrderProxyRotating` (bỏ load User thừa), `getAllProxy` (fix cả Redis cache), `getProxy`, OrderController
  - Tất cả client API giờ ẩn cả `price_cost` + `partner_price` + `api_key_partner` + `parent_api_mapping`
  - Strip `cost` từ `price_by_duration` trong 3 endpoint order history
  - Order: ẩn thêm `metadata`, `transaction_id`
  - ServiceType (order history): ẩn `discount_price`, `code`, `order`, `note`, `allow_user`, `date_mapping`, `multi_inputs`
  - Fix `PlaceOrder` command: xóa relationship `api_key` không tồn tại, update `ModelMongo` namespace cho `mongodb/laravel-mongodb` v4+
  - `getOrder()`: bỏ object `type_servi` → flatten thành `service_name`, `service_type`, `ip_version`
  - `getOrder()`: `proxies` chỉ trả data đơn giản (id + proxy info + type), không trả full ApiKey
  - FE `OrderDetail`: fetch full proxy data qua `useApiKeys(order.id)` khi mở modal
  - FE: cập nhật `HistoryOrderPage` + `OrderDetail` dùng flat fields thay `type_servi.*`
- **Files**: `BE/database/migrations/2026_03_10_000002_add_partner_price_to_api_keys.php`, `BE/app/Models/MySql/ApiKey.php`, `BE/app/Http/Controllers/Api/ProxyController.php`, `BE/app/Http/Controllers/Api/OrderController.php`, `BE/app/Console/Commands/PlaceOrder.php`, `BE/app/Models/Mongo/ModelMongo.php`, `FE/src/views/Client/HistoryOrder/OrderDetail.tsx`, `FE/src/views/Client/HistoryOrder/HistoryOrderPage.tsx`, 8 Partner files

#### 13.76 Fix toàn bộ landing page - sections không hiển thị

- **Vấn đề**: Landing page bị trắng ở phần dưới (Footer invisible). Root cause: `html { block-size: 100% }` (globals.css) + `body { flex-auto }` giới hạn chiều cao = viewport → không scroll được. Footer dùng CSS classes + Bootstrap grid bị ảnh hưởng bởi global `* { margin:0; padding:0 }` reset. `:has()` selector không reliable.
- **Sửa**:
  - **Footer.tsx**: rewrite hoàn toàn bằng inline styles, bỏ CSS classes, Bootstrap grid, `useTranslation`/`useLanguageSync`
  - **layout.tsx**: thêm `<style>` tag override `html/body { height: auto; block-size: auto; flex: none }` và `.main { background: none; display: block }`
  - **main.css**: scope `* { margin:0; padding:0 }` vào `.landing-page-wrapper` only (trước đó apply global gây hỏng các trang khác), xóa `:has()` rule
  - TestimonialsSection: bỏ `next/image`, dùng avatar initials thay ảnh external
  - VietnamCoverageSection: bỏ `useTranslation`/`useLanguageSync` thừa, thêm `Link` cho nút đăng ký
- **Files**: `Footer.tsx`, `layout.tsx` (landing-page), `main.css`, `TestimonialsSection.tsx`, `VietnamCoverageSection.tsx`

#### 13.77 Redesign landing page header — UX mềm mại hơn

- **Vấn đề**: Header trông "phèn" — mix Bootstrap navbar + MUI + custom CSS không đồng nhất. Active state (background đỏ + underline) quá aggressive. CTA button gradient đỏ-cam trông template-like. Background `#f9fafc` xám xỉn.
- **Sửa**:
  - **MainHeader.tsx**: inline styles, background glass effect `rgba(255,255,255,0.92)` + `backdrop-filter: blur(16px)`, subtle shadow on scroll, height `72→62px` on scroll
  - **MenuDesktop.tsx**: nav links `color: #64748b` → hover `#0f172a` + subtle bg. Active chỉ đổi màu `#ef4444` (không background tint/underline). CTA: "Đăng nhập" text button + "Đăng ký" pill gradient. Authenticated: "Trang chủ" pill + arrow icon
  - Bỏ unused imports (`VuexyLogo`, `CustomAvatar`, `LanguageSelect`)
- **Files**: `MainHeader.tsx`, `MenuDesktop.tsx`

#### 13.78 Tối ưu performance landing page

- **Vấn đề**: Landing page render chậm, UX kém. Root causes: (1) `useLanguageSync()` gọi trong mọi component gây re-render thừa (2) Duplicate CSS imports giữa root layout và landing layout (3) Tất cả sections load đồng thời dù nằm dưới fold (4) Framer Motion (~60KB) import chỉ cho scroll animation đơn giản
- **Sửa**:
  - Xóa `useLanguageSync()` khỏi Hero, ProductsSection, PartnersSection, Header (I18nProvider ở root layout đã sync)
  - Xóa duplicate CSS imports (`globals.css`, `shared-layout.css`, `root.css`, `main.css`, `iconify`) khỏi landing layout — root layout đã import
  - Below-fold components dùng `dynamic()` với `ssr: true` (ProductsSection, VietnamCoverage, Partners, Testimonials)
  - Thay `framer-motion` bằng CSS `transition: all 0.3s ease` + `useState` scroll listener (`{ passive: true }`) trong MainHeader
  - Header.tsx: bỏ `'use client'`, `useState`, `useTranslation` thừa — chỉ render `<MainHeader />`
- **Files**: `page.tsx`, `layout.tsx` (landing), `MainHeader.tsx`, `Header.tsx`, `Hero.tsx`, `ProductsSection.tsx`, `PartnersSection.tsx`

#### 13.79 Fix navigation lag — bỏ provider nặng + cache API

- **Vấn đề**: Click navigate khựng lại vì: (1) `Providers.tsx` gọi `getServerSession()` lần thứ 3 (root layout đã gọi 2 lần) (2) `NextAuthProvider` + `ModalContextProvider` bị wrap 2 lần (root + Providers) (3) `VerticalNavProvider` load thừa (landing không có sidebar) (4) `getServerUserData()` gọi `POST /me` với `cache: 'no-store'` mỗi request
- **Sửa**:
  - **layout.tsx (landing)**: bỏ `Providers`, inline chỉ `SettingsProvider` + `ThemeProvider` (MUI cần). Bỏ `NextAuthProvider`/`ModalContextProvider`/`VerticalNavProvider` (root layout đã có hoặc không cần)
  - **serverSessionValidation.ts**: đổi `cache: 'no-store'` → `next: { revalidate: 30 }` cho `POST /me` — giảm API calls
- **Files**: `layout.tsx` (landing), `serverSessionValidation.ts`

#### 13.80 Cải thiện navigation smoothness — loading state + lazy load

- **Vấn đề**: Navigation cảm giác "cứng" — không có visual feedback khi chuyển trang, AuthModal (framer-motion + 5 forms) load eager dù chưa cần, `ReferralHandler` dùng `useSearchParams()` block render, `ReactQueryDevtools` load cả production
- **Sửa**:
  - Tạo `loading.tsx` cho landing route group — spinner hiện ngay khi navigate
  - Lazy load `AuthModal` bằng `next/dynamic` + `ssr: false` trong MainHeader
  - Thêm fade-in animation (`pageIn`) cho landing page content
  - Wrap `ReferralHandler` trong `<Suspense>` ở root layout (tránh `useSearchParams()` block render)
  - `TanstackProvider`: lazy load `ReactQueryDevtools` chỉ khi `NODE_ENV === 'development'`
- **Files**: `loading.tsx` (landing, mới), `MainHeader.tsx`, `page.tsx` (landing), `layout.tsx` (root), `TanstackProvider.tsx`

#### 13.81 Fix admin quản lý đơn hàng — thiếu đơn + sort + per_page + UX

- **Vấn đề**: (1) Backend exclude `user_id` [1, 16011] → admin không thấy đơn của mình (2) `per_page` max=100, default=20 quá ít (3) Không có cột ID, không sort được (4) Chỉ chọn 20/50/100 cố định
- **Sửa**:
  - **BE**: Bỏ exclude user IDs, nâng `per_page` max→10000 default→100, thêm `sort_by` (id/created_at) + `sort_order` (asc/desc)
  - **FE hook**: Thêm `sort_by`, `sort_order` params vào `useAdminOrders`
  - **FE page**: Thêm cột ID + Ngày tạo có sort toggle (click header ▲▼), input giới hạn API (20-10000) ở toolbar filter, dropdown hiển thị/trang (20/50/100/200) ở pagination, client-side pagination với `getPaginationRowModel`, table minWidth 1350px
- **Files**: `OrderReportController.php`, `useOrderReport.ts`, `AdminOrdersPage.tsx`

#### 13.81 Fix ESLint errors còn lại (batch 2)

- **Vấn đề**: Nhiều lỗi ESLint còn sót: `@typescript-eslint/no-unused-vars` rule not found, `<a>` thay vì `<Link>`, import order sai, import module không tồn tại, unescaped entities, JSX component undefined
- **Sửa**:
  - Đổi `@typescript-eslint/no-unused-vars` → `no-unused-vars` trong eslint-disable comments (3 files)
  - `FileUploaderSingle.tsx`: thay `<a>` bằng `<Link>` từ `next/link`
  - Fix import order: `history-order/page.tsx`, `layout.tsx`, `CheckProxyForm.tsx`
  - Xóa import `PasswordReset` (file không tồn tại, không dùng) trong `AuthModal.tsx`
  - Xóa import `TimeProxyRotating` (file không tồn tại, không dùng) trong `DetaiProxy.tsx`
  - Đổi `./styles.css` → `./stylesOrder.css` trong `OrderProxyPage.tsx`
  - Đổi `import { EmblaCarouselType }` → `import type` trong `useAutoplay.tsx`
  - Xóa `InputIcon` (không tồn tại, không dùng) khỏi import `AdminOrdersPage.tsx`
  - Thay `"` → `&quot;` trong JSX text: `InvestigationDrawer.tsx`, `CreateTicketDialog.tsx`
  - Thêm import `BadgeMinus` vào `OrderDetailModal.tsx` (dùng nhưng chưa import)
  - Di chuyển `getServerSession` import trước `getServerUserData` + xóa duplicate trong `layout.tsx`
- **Files**: `useLayoutInit.ts`, `route.ts`, `GenerateMenu.tsx`, `FileUploaderSingle.tsx`, `history-order/page.tsx`, `layout.tsx`, `AuthModal.tsx`, `CheckProxyForm.tsx`, `DetaiProxy.tsx`, `OrderProxyPage.tsx`, `useAutoplay.tsx`, `AdminOrdersPage.tsx`, `InvestigationDrawer.tsx`, `CreateTicketDialog.tsx`, `OrderDetailModal.tsx`

#### 13.82 Fix toàn bộ ESLint errors — build pass + thêm bundle analyzer

- **Vấn đề**: `npm run build` fail do ~45 ESLint errors (rules-of-hooks, import order, unescaped entities, undefined components, missing imports)
- **Sửa**:
  - Auto-fix hàng trăm lỗi format (import/order, padding-line, newline-before-return)
  - Fix 17 lỗi `rules-of-hooks`: di chuyển early return (`if (!open) return null`) xuống SAU tất cả hooks trong 4 modal/component (TransactionModal, UserTransactionModal, ProxyCard, QrCodeDisplayDialog)
  - Fix import order, unescaped entities, undefined components (xem 12.81 cho chi tiết batch trước)
  - Thêm `@next/bundle-analyzer` để phân tích bundle size (chạy với `ANALYZE=true npm run build`)
- **Kết quả**: Build pass trong ~48s, chỉ còn warnings (exhaustive-deps)
- **Files**: `next.config.ts`, `TransactionModal.tsx`, `UserTransactionModal.tsx`, `ProxyCard.tsx`, `QrCodeDisplayDialog.tsx`, `MainHeader.tsx`, `layout.tsx`, `ServerSideSessionPattern.tsx`, `TablePartner.tsx` + nhiều file khác

### 10/03/2026

#### 13.83 Đồng bộ idempotency tất cả processors + Tách flow HomeProxy 2 phase

- **Vấn đề 1**: Các processor (ProxyVn, UpProxy, MktProxy, ZingProxy) không có chống duplicate khi gọi partner → retry có thể mua trùng proxy
- **Sửa 1**: Thêm `markPartnerCalled()` / `wasPartnerCalled()` vào BasePartner, áp dụng cho tất cả 1-step processors. Wrap `failOrderWithRefund()` trong try-catch
- **Vấn đề 2**: HomeProxy processors block worker 15-60s (sleep + polling chờ partner trả proxy). Các đơn khác phải chờ
- **Sửa 2**:
  - Thêm status `awaiting_partner = 10` vào Order model
  - Rewrite HomeProxy Rotating/Static processors: chỉ tạo order + lưu `id_order_partner` + set status `awaiting_partner` → return ngay (không sleep, không polling)
  - Tạo command `fetch-partner-proxies` chạy mỗi phút: scan orders `awaiting_partner` → gọi HomeProxy API lấy proxy → lưu DB → finalize order. Timeout 30 phút
  - Comment out MktProxy + ZingProxy trong PartnerFactory (không còn dùng)
  - Thêm status 10 vào FE constants `orderStatus.ts`
- **Files BE**: `Order.php`, `BasePartner.php`, `PartnerFactory.php`, `HomeProxyRotatingProcessor.php`, `HomeProxyStaticProcessor.php`, `MktProxyRotatingProcessor.php`, `ZingProxyRotatingProcessor.php`, `ProxyVnRotatingProcessor.php`, `UpProxyStaticProcessor.php`, `FetchPartnerProxies.php` (mới), `Kernel.php`
- **Files FE**: `orderStatus.ts`

#### 13.84 Fix bugs FetchPartnerProxies + Refactor bỏ log thừa

- **Bug 1**: `$updated` khai báo trong closure nhưng dùng ngoài → undefined variable
- **Bug 2**: `saveStaticProxies` ghi đè `parent_api_mapping` thay vì merge → mất data
- **Sửa**: `&$updated` reference, `array_merge()` + `save()` cho static
- **Refactor**: bỏ `Log::channel/info/warning` thừa (OrderLog + Telegram đã cover), xóa dead code `getProxiesByOrderIdWithRetry`
- **Files**: `FetchPartnerProxies.php`, `BasePartner.php`, `ProxyVnRotatingProcessor.php`, `UpProxyStaticProcessor.php`, `HomeProxyService.php`

#### 13.85 Redesign trang lịch sử đơn hàng (khách hàng)

- **Vấn đề**: Trang lịch sử mua hàng UI cũ, không có auto-refresh khi đơn đang pending → user phải reload thủ công
- **Sửa**:
  - `useHistoryOrders`: thêm `refetchInterval` tự động 5s khi có đơn pending (status 0/1/9/10), tắt khi không có
  - Redesign `HistoryOrderPage`: toolbar 2 dòng giống admin, banner thông báo đơn pending + indicator "Tự động kiểm tra mỗi 5 giây", row highlight vàng cho đơn pending, spinner icon bên cạnh status chip
  - Bỏ tanstack features không cần (rowSelection, faceted, sorted) — chỉ giữ core + pagination
  - Clean up page.tsx: xóa mock data cũ không dùng
- **Files**: `useHistoryOrders.ts`, `HistoryOrderPage.tsx`, `history-order/page.tsx`

---

#### 13.86 Thêm quy trình thêm partner mới vào BE dev guide

- **Sửa**: Thêm Section 5.4 vào `BE/DEVELOPER-GUIDE.md` — hướng dẫn thêm partner mới: chọn pattern, các bước (DB → Service → Processor → Factory → FetchPartnerProxies), format dữ liệu, checklist
- **Files**: `BE/DEVELOPER-GUIDE.md`, `FE/DEVELOPER-GUIDE.md`

#### 13.87 Tối ưu UI/UX đơn hàng toàn diện + Order Logs + Test data

- **Vấn đề 1**: Trang lịch sử user và admin thiếu cột loại đơn (Mua/Gia hạn)
- **Vấn đề 2**: User không thấy proxy khi partner trả xong do `useApiKeys` cache 5 phút
- **Vấn đề 3**: Modal chi tiết đơn hàng user quá to, nằm dưới màn hình
- **Vấn đề 4**: Admin không có log xử lý đơn hàng
- **Sửa**:
  - Thêm cột "Loại" (Mua/Gia hạn) vào `HistoryOrderPage` user
  - Fix `useApiKeys` staleTime 5min → 30s
  - Redesign `OrderDetail.tsx` (user): maxWidth md, centered, gọn nhẹ, InfoCard grid
  - Redesign `OrderDetailModal.tsx` (admin): maxWidth md, thêm Tabs (Proxy | Logs), timeline hiển thị từng bước xử lý
  - Tạo hook `useOrderLogs` gọi `GET /admin/order-logs/{order_id}`
  - Timeline log: icon/color theo action, hiển thị partner_code, duration_ms, http_status, response_body (expandable cho error)
  - Tạo `TestOrderSeeder.php` — 9 đơn mẫu đủ status + API keys + OrderLogs cho admin@admin.com
- **Files FE**: `useOrderLogs.ts` (mới), `useOrders.ts`, `HistoryOrderPage.tsx`, `OrderDetail.tsx`, `OrderDetailModal.tsx`
- **Files BE**: `TestOrderSeeder.php` (mới)

#### 13.88 Fix UX lịch sử đơn hàng user

- **Vấn đề**: Banner lộ "Tự động kiểm tra mỗi 5 giây", trạng thái "Chờ đối tác" lộ nội bộ, modal thấp, cột bị nén
- **Sửa**:
  - Bỏ text "Tự động kiểm tra mỗi 5 giây" khỏi pending banner
  - Đổi label user: "Đang chờ xử lý" → "Chờ xử lý", "Chờ đối tác" → "Chờ tạo proxy"
  - Nâng modal lên đầu màn hình (`mt: '5vh'`, `mb: 'auto'`) — cả user và admin
  - Table `minWidth: 1200px` + `minWidth` trên mỗi header để cột không bị nén
  - Fix MongoDB local: bỏ username trong `.env` (local không cần auth)
  - Insert 38 order logs mẫu vào MongoDB
  - Admin: nút "Xem log" + "Chi tiết" + "User" hiện cho tất cả đơn (trước chỉ FAILED mới có log)
- **Files**: `HistoryOrderPage.tsx`, `OrderDetail.tsx`, `OrderDetailModal.tsx`, `orderStatus.ts`, `TableTransactionHistory.tsx`, `.env`

#### 13.89 Hoàn thiện OrderLog — lưu response success + log timeout

- **Vấn đề**: MktProxy & ZingProxy không lưu response body khi success. UpProxy & ProxyVn catch block không gọi `logApiCall` → timeout không có log
- **Sửa**:
  - MktProxy: `logApiCall` success truyền `json_encode($result)` thay vì `null`
  - ZingProxy: tương tự
  - UpProxy: thêm `logApiCall(ACTION_API_CALL_ERROR)` trong catch (log duration + error message)
  - ProxyVn: tương tự
  - Đổi label user: PROCESSING → "Đang tạo proxy"
- **Files BE**: `MktProxyRotatingProcessor.php`, `ZingProxyRotatingProcessor.php`, `UpProxyStaticProcessor.php`, `ProxyVnRotatingProcessor.php`
- **Files FE**: `orderStatus.ts`

#### 13.90 Tối ưu tốc độ tải trang /home & /check-proxy

- **Vấn đề**: Trang /home và /check-proxy tải chậm, UX kém — do `getServerUserData()` gọi API `/me` blocking mỗi navigation (~200-500ms), NavigationProgress có 400ms delay nhân tạo
- **Sửa**:
  - **Bỏ blocking API call**: Loại `getServerUserData()` khỏi root layout, dùng `session.user` từ JWT trực tiếp (session callback đã chứa userData)
  - **Giảm navigation delay**: NavigationProgress timeout 400ms → 150ms
  - Thêm `loading.tsx` skeleton cho `/home` (feed + sidebar) và `/check-proxy` (form + table)
  - Thêm `optimizePackageImports` trong `next.config.ts` cho MUI, lucide-react, recharts, iconify
- **Files**: `[lang]/layout.tsx`, `NavigationProgress.tsx`, `home/loading.tsx` (mới), `check-proxy/loading.tsx` (mới), `next.config.ts`

#### 13.91 Multi-site: Bank info dynamic + site_mode context + menu conditional

- **Vấn đề**: Bank info hardcode trong 4 file FE → site con không dùng bank riêng được. `site_mode` chưa expose ra FE context. Menu admin giống nhau cho cả site mẹ/con.
- **Sửa**:
  - **Hook `useBankInfo`**: Fetch bank info từ `GET /api/get-bank-info`, fallback hardcode, staleTime 10 phút
  - **Xóa hardcode bank**: `bankInfo.ts` chỉ giữ `generateTransactionCode()`, xóa `getBankNumber()`
  - **3 dialog/page**: `RechargeInputDialog`, `QrCodeDisplayDialog`, `RechargePage` — dùng `useBankInfo()` thay BANK_INFO const
  - **BrandingContext**: Thêm `siteMode`, `isParent`, `isChild` (từ `data.site_mode`)
  - **useBrandingSettings**: Export type `SiteMode`, thêm `site_mode` vào interface
  - **VerticalMenu**: Ẩn admin "Đối tác" cho site con (`!isChild`)
- **Files**: `useBankInfo.ts` (mới), `bankInfo.ts`, `RechargeInputDialog.tsx`, `QrCodeDisplayDialog.tsx`, `RechargePage.tsx`, `BrandingContext.tsx`, `useBrandingSettings.ts`, `VerticalMenu.tsx`
- **Xem thêm BE**: `BE/DEVELOPER-GUIDE.md` → 15.18

#### 13.92 Admin Reseller Management — trang quản lý Reseller

- **Vấn đề**: Chưa có UI cho admin site mẹ tạo/quản lý reseller (role=2). ResellerService BE sẵn sàng nhưng không có endpoint/UI.
- **Sửa**:
  - **Hooks `useAdminResellers`**: 7 hooks (list, stats, create, update, toggleStatus, regenerateCredentials, adjustBalance)
  - **AdminResellerPage**: Page wrapper quản lý state modals
  - **TableReseller**: Bảng reseller + stats cards + inline dialogs (toggle status, adjust balance)
  - **ModalAddReseller**: Form tạo/sửa reseller (user mới/có sẵn + profile fields)
  - **ModalCredentials**: Xem/copy api_key, api_secret + regenerate credentials
  - **Route**: `/admin/resellers` — chỉ hiển thị trên site mẹ (`!isChild`)
  - **Menu**: Thêm "Quản lý Reseller" sau "Đối tác" trong VerticalMenu
- **Files**: `useAdminResellers.ts`, `AdminResellerPage.tsx`, `TableReseller.tsx`, `ModalAddReseller.tsx`, `ModalCredentials.tsx`, `page.tsx`, `VerticalMenu.tsx`
- **Xem thêm BE**: `BE/DEVELOPER-GUIDE.md` → 15.19

#### 13.93 Supplier credentials linh hoạt — thay đổi qua admin UI

- **Vấn đề**: Site con phải sửa `.env` + restart Laravel khi thay đổi supplier credentials. Không linh hoạt.
- **Sửa**:
  - **Hook `useSupplierSettings`**: GET/POST supplier credentials từ DB
  - **SiteSettingsForm**: Thêm section "Kết nối nhà cung cấp" (chỉ hiển thị khi `isChild`)
  - Nhập URL, API Key, API Secret → "Lưu & Test kết nối" → hiển thị kết quả test (OK + số dư hoặc lỗi)
  - Hiển thị nguồn credentials hiện tại (database / env)
- **Files**: `useSupplierSettings.ts` (mới), `SiteSettingsForm.tsx`
- **Xem thêm BE**: `BE/DEVELOPER-GUIDE.md` → 15.20

#### 13.95 API Docs — Getting Started + Cache invalidation + Session sync

- **Vấn đề**: Trang docs-api không có hướng dẫn sử dụng; api_key hiển thị sai (lấy từ session cũ, không đồng bộ khi regenerate); URL docs hardcode site mẹ thay vì dùng URL site hiện tại
- **Sửa**:
  - `ApiUsage.tsx`: thêm trang "Bắt đầu" (Getting Started) — Base URL, xác thực, quy trình 4 bước, ví dụ cURL, bảng giá trị mặc định. Đổi từ `useSession()` sang `useMyCredentials()` để luôn lấy api_key mới nhất từ DB
  - `apiDocsConfig.ts`: bỏ `NEXT_PUBLIC_API_DOCS_URL`, dùng `NEXT_PUBLIC_API_URL` (URL backend site hiện tại)
  - `siteConfig.ts`: `apiDocsUrl` giờ dùng `NEXT_PUBLIC_API_URL`
  - `auth.ts`: thêm xử lý `trigger === 'update'` trong jwt callback — gọi `/me` để sync userData (bao gồm api_key) khi client gọi `session.update()`
  - `CredentialsPanel.tsx`: gọi `updateSession()` sau regenerate key để sync session ngay lập tức
  - `ResellerController.php`: `quantity` default 1, `duration` chỉ chấp nhận 1/7/30 (default 1), `protocol` chỉ http/socks5 (default http)
  - Thêm section "Cache Strategy & Invalidation" vào dev guide (section 8) — bảng query keys, staleTime, invalidation map, quy tắc viết mutation
- **Files**: `ApiUsage.tsx`, `apiDocsConfig.ts`, `siteConfig.ts`, `auth.ts`, `CredentialsPanel.tsx`, `ResellerController.php`, `DEVELOPER-GUIDE.md`

#### 13.94 API Key cho mọi user — tab Profile mở cho tất cả

- **Vấn đề**: Tab "API Credentials" chỉ hiện cho reseller (role=2). Giờ api_key nằm trên bảng `users`, mọi user đều có thể tạo/dùng API key.
- **Sửa**:
  - `ProfilePage.tsx`: bỏ điều kiện `isReseller`, tab "API Key" hiện cho mọi user
  - `CredentialsPanel.tsx`: đơn giản hóa — chỉ hiển thị api_key + copy + regenerate. Xử lý trường hợp chưa có key (nút "Tạo API Key"). Bỏ các field reseller-specific (domain, company, status, IPs)
  - `useMyCredentials.ts`: interface `MyCredentials` chỉ còn `api_key`
  - `useAdminResellers.ts`: bỏ `api_key` khỏi `ResellerProfile` interface, thêm vào `AdminReseller`
  - `ModalCredentials.tsx`: đọc `reseller?.api_key` thay vì `profile?.api_key`
- **Files**: `ProfilePage.tsx`, `CredentialsPanel.tsx`, `useMyCredentials.ts`, `useAdminResellers.ts`, `ModalCredentials.tsx`
- **Xem thêm BE**: `BE/DEVELOPER-GUIDE.md` → 15.24

### 15/03/2026

#### 13.96 Admin tab Thanh toán — Bank + Pay2s + Telegram config

- **Vấn đề**: Site con thiếu UI cấu hình ngân hàng nhận tiền, pay2s webhook token, và Telegram notification channels.
- **Sửa**:
  - Thêm tab "Thanh toán" (index 5) trong `SiteSettingsForm.tsx` với 3 section: Ngân hàng, Pay2s, Telegram
  - Tạo hook `useBankSettings.ts` (GET/POST `/admin/bank-settings`) — lưu riêng bảng `banks`
  - Pay2s + Telegram dùng chung branding settings (lưu bảng `settings`)
  - Cập nhật `BrandingSettings` interface thêm 7 keys mới
  - Tab index "Nhà cung cấp" dịch từ 5 → 6
- **Files**: `SiteSettingsForm.tsx`, `useBankSettings.ts`, `useBrandingSettings.ts`
- **Xem thêm BE**: `BE/DEVELOPER-GUIDE.md` → 15.27

#### 13.97 ChildServiceFormModal — Thêm proxy attributes + Live preview card

- **Vấn đề**: Form thêm/sửa SP site con thiếu trường thuộc tính proxy (auth_type, bandwidth, rotation...) và admin không thấy được preview sản phẩm khi đang chỉnh.
- **Sửa**:
  - Thêm 7 trường proxy attributes: `auth_type`, `bandwidth`, `rotation_type`, `rotation_interval`, `pool_size`, `request_limit`, `concurrent_connections`
  - Trường rotating-only (rotation_type, rotation_interval, pool_size) chỉ hiện khi type='1'
  - Layout 2 cột: form (60%) + live preview card (40%) dùng `watch()` realtime
  - Preview card giống ProxyCard/PlanCard: gradient bar, tag chips, feature rows với icons, price footer, nút Mua ngay/Tạm ngừng
  - Dialog maxWidth đổi từ `md` → `lg`
  - Thêm fields vào cả 3 chỗ reset() + submitData
- **Files**: `ChildServiceFormModal.tsx`

### 29/03/2026

#### 13.98 Redesign UX cấu hình nhà cung cấp (ModalAddProvider)

- **Vấn đề**: Form cấu hình NCC 2573 dòng, 1 file duy nhất, tổ chức theo accordion rời rạc — admin không hiểu flow, không tự thêm NCC mới được.
- **Sửa**:
  - **Tách file**: 1 file 2573 dòng → ~15 file (types, serializer, sections, components, hooks)
  - **Vertical Tabs**: thay 6 accordion bằng 5 tab dọc bên trái (Cơ bản / Mua proxy / Xoay / IP WL / Gia hạn) + badge trạng thái (bật/tắt)
  - **Pipeline Steps**: tab "Mua proxy" chia 5 bước pipeline đánh số: Gọi API → Kiểm tra → Đọc proxy → Lưu data → Xử lý lỗi — mỗi bước có tiêu đề + mô tả
  - **Rotating/Static toggle**: gộp 2 accordion thành 1 tab với toggle switch
  - **Auto-suggest**: paste response mẫu → hệ thống tự nhận dạng format (array/object, success field, proxy format, ID...) → hiện gợi ý checkbox → admin click "Áp dụng"
  - **PipelineStepCard**: component wrapper có số bước, tiêu đề, mô tả, viền màu
  - Fix `toast.success` → `toast.info` (theo convention)
  - Tab content render lazy + ẩn bằng `display: none` (giữ form field registration)
- **Files**: `ModalAddProvider.tsx`, `ProviderFormTypes.ts`, `ProviderFormSerializer.ts`, `sections/BasicInfoSection.tsx`, `sections/BuyConfigSection.tsx`, `sections/RotateSection.tsx`, `sections/IpWhitelistSection.tsx`, `sections/RenewSection.tsx`, `components/FieldHint.tsx`, `components/PipelineStepCard.tsx`, `components/ResponseMappingTable.tsx`, `components/SavePreviewBox.tsx`, `components/ResponseDryRun.tsx`, `components/JsonPreviewPanel.tsx`, `hooks/useAutoSuggest.ts`

---

## 14. Known Issues — Danh sách vấn đề cần xử lý

> Tổng hợp toàn bộ vấn đề đã phát hiện qua review. Đánh dấu ✅ khi đã fix.

### CRITICAL — Ảnh hưởng trực tiếp đến đơn hàng / tiền

| # | Mô tả | File | Ghi chú |
|---|-------|------|---------|
| C1 | UpproxyPartner (rotating) **không gọi** `OrderHelper::saveOrderToRedis()` → đơn mãi PENDING, khách mất tiền | `UpproxyPartner.php` | Thiếu dòng push Redis sau commit transaction |
| C2 | ProxyVnRotating: nhánh `else` (status ≠ 100) return false **không gọi** `failOrderWithRefund` → đơn kẹt PROCESSING mãi | `ProxyVnRotatingProcessor.php:131` | Thêm `failOrderWithRefund` trước return |
| C3 | ProxyVnRotating: `$expired_at`/`$buy_at` tính ra nhưng **không lưu DB** | `ProxyVnRotatingProcessor.php:110-111` | Xóa 2 biến thừa hoặc lưu vào Order/ApiKey nếu cần |
| C4 | `getProxyCurrent`: access `$apiKey->api_key` (line 940) trước null check (line 972) → crash | `ProxyController.php:940` | Đổi null check lên trước |

### HIGH — Ảnh hưởng nghiệp vụ / data integrity

| # | Mô tả | File | Ghi chú |
|---|-------|------|---------|
| H1 | HomeProxy retry reuse partner order ID → gán **proxy trùng** cho ApiKey mới | `HomeProxyRotating/StaticProcessor` | Cần filter proxies đã gán khi retry, hoặc lưu offset |
| ✅ H2 | ~~ProxyVn, ZingProxy, UpProxy **không có idempotency** khi retry → mua trùng proxy bên đối tác~~ | 3 processor files | Fixed 13.83: `markPartnerCalled()` / `wasPartnerCalled()` cho tất cả processors |
| H3 | MktProxy: `formatResponseProxyV2($apiKeys[$index], ...)` pass **Model** thay vì string + Redis write trong DB::transaction | `MktProxyRotatingProcessor.php:84-85` | Đổi thành `$apiKeys[$index]->api_key`. Di chuyển Redis write ra ngoài transaction |
| H4 | ZingProxy: query ApiKey **2 nguồn** (`ApiKey::where()` + `$order->apiKeys`) — chưa fix như MktProxy | `ZingProxyRotatingProcessor.php:22,42` | Bỏ `ApiKey::where()`, dùng `$order->apiKeys` duy nhất |
| H5 | Config errors (Invalid template body, Missing ApiKey...) return false **không gọi** failOrderWithRefund → PlaceOrder safety net retry 3 lần vô ích | Tất cả processors | Dùng `failOrderWithoutRetry()` cho config errors |
| H6 | `handleProcessorFailure` log `from_status=processing` nhưng order có thể vẫn PENDING | `PlaceOrder.php:190` | Lấy `$order->status` thực tế thay vì hardcode |
| H7 | `finalizeOrder()` ghi MongoDB (`logOrderStatus`) trong DB::transaction → không rollback được | `BasePartner::finalizeOrder()` | Di chuyển log ra ngoài transaction hoặc dùng `DB::afterCommit()` |
| H8 | "All keys have proxies" shortcut không set `delivered_quantity` | `PlaceOrder.php:119-131` | Thêm `delivered_quantity = quantity` trong shortcut |

### MEDIUM — Logic/Data không đúng nhưng không mất tiền

| # | Mô tả | File | Ghi chú |
|---|-------|------|---------|
| M1 | UpproxyPartner: `$setupTime = null` → `price * null * quantity = 0` (đơn miễn phí) | `UpproxyPartner.php:25-38` | Thêm early return khi `$setupTime` null như các partner khác |
| M2 | Factory thiếu partner: `ProxyPartnerFactory` thiếu Upproxy, `ProxyStaticFactory` thiếu ProxyVN | 2 factory files | Thêm mapping vào factory |
| M3 | FetchPendingOrders recover stuck PROCESSING → không reset retry count → hao retry vô ích | `FetchPendingOrders.php:73` | Cân nhắc giữ nguyên retry hoặc trừ 1 khi recover |
| M4 | HomeProxyStaticProcessor: `$emptyApiKeys[$index]` truy cập trực tiếp, không bounds check | `HomeProxyStaticProcessor.php:166` | Thêm `?? null` + guard như các processor khác |
| M5 | ProxyVnRotating: `$itemFromApi['keyxoay']` không null check | `ProxyVnRotatingProcessor.php:119` | Thêm `$itemFromApi['keyxoay'] ?? null` + skip nếu null |
| M6 | ZingProxy: protocol luôn lưu `'HTTP'` dù user chọn socks5 | `ZingProxyRotatingProcessor.php:114` | Dùng `$firstApiKey->protocol` để set key trong `proxys` |
| M7 | `buyProxyStatic`: `days` chỉ validate `required`, thiếu `integer\|min:1\|max:30` | `ProxyController.php:303` | Thêm validation |
| M8 | UpproxyStaticPartner: hardcoded 30 ngày, bỏ qua `$dataBody['days']` | `UpproxyStaticPartner.php:40,61` | Dùng `$dataBody['days']` thay vì hardcode |
| M9 | `$bodyApi === null && json_last_error()` logic khó hiểu, null `api_body` lọt qua | Tất cả processors | Đổi thành check `empty($bodyApi)` rõ ràng hơn |
| M10 | HomeProxy processors: deep nested access (`$data['products'][0]['order']['id']`, `$proxyData['ipaddress']['ip']`...) không null-safe | `HomeProxyStatic/RotatingProcessor` | Thêm null check hoặc data_get() |
| M11 | ProxyVnRotating: `str_replace('&', '&&', $query)` → Guzzle có thể parse sai query string | `ProxyVnRotatingProcessor.php:69` | Verify với ProxyVN API docs, cân nhắc truyền array thay string |

### LOW — Code quality / edge cases hiếm

| # | Mô tả | File |
|---|-------|------|
| L1 | `str_shuffle + time()` trong batch insert loop → collision risk nhỏ trong cùng 1 giây | Tất cả Partner `buy()` files |
| L2 | `decodeBrokenJson` có thể mask lỗi JSON thật từ partner | `BasePartner.php:224-251` |
| L3 | Thiếu null check cho relationship chains (`$order->type_servi->partner`) | Tất cả processors |
| L4 | Dead code: UpProxyStaticProcessor check `status == failed` (PlaceOrder đã filter trước) | `UpProxyStaticProcessor.php:20-22` |
| L5 | UpProxyStaticProcessor: `$bodyApi ?? ''` rồi check `=== null` → dead code | `UpProxyStaticProcessor.php:24-28` |
| L6 | ProxyController: `getProxyRotating`, `getProxyNew`, `getProxyCurrent` switch thiếu `default` case → return null | `ProxyController.php` |
| L7 | Unused import `use Psr7\build` | `ProxyController.php:6` |
| L8 | HomeProxy processors: `$body`/`$durationMs` = null khi log success trên retry path | `HomeProxyRotating/StaticProcessor` |
| L9 | `stopwaitsecs=30` trong supervisor vs partner API có thể chạy >30s → worker bị kill giữa chừng | `orders-partner.conf:13` |

---

### 16/03/2026

#### 13.N+9 Xóa mock data khỏi Dashboard report hooks

**Vấn đề:** `useFinancialReport`, `useReconciliation`, `useOrderReportSummary`, `useOrderReportDetail` dùng `placeholderData: MOCK_*` → dashboard luôn hiển thị số mẫu (105.5M revenue, 986 đơn...) kể cả khi API trả data thật hoặc rỗng.

**Sửa:**
- Xóa toàn bộ mock data (~200 dòng) khỏi `useFinancialReport.ts` và `useOrderReport.ts`
- Xóa `placeholderData` khỏi 4 hooks
- Dashboard page: thêm loading state + null check thay vì fallback mock
- `ReconciliationHero`: bỏ fallback `MOCK_RECONCILIATION`, thêm loading state
- `OrderStatusReport`: bỏ fallback `MOCK_DETAIL.orders`, dùng `[]` khi chưa có data

**Files:** `useFinancialReport.ts`, `useOrderReport.ts`, `dashboard/page.tsx`, `ReconciliationHero.tsx`, `OrderStatusReport.tsx`

#### 13.N+10 Deposit history — cải thiện refresh

**Vấn đề:** `useDepositHistory` có `staleTime: 30s` và `refetchOnWindowFocus: false` → bảng lịch sử nạp tiền không tự cập nhật khi có giao dịch mới.

**Sửa:** Giảm `staleTime` xuống 10s, bật `refetchOnWindowFocus: true`

**Files:** `useDeponsitHistory.ts`

#### 13.N+11 LogModal — thêm action exception (lỗi hệ thống)

**Vấn đề:** BE giờ log exception chi tiết vào OrderLog (action=`exception`), FE chưa nhận diện action này.

**Sửa:** Thêm action `exception` vào `ACTION_LABELS` + `ACTION_STYLES` với icon Bug, label "Lỗi hệ thống", style đỏ đậm.

**Files:** `LogModal.tsx`

### Chưa review kỹ — Cần kiểm tra thêm

Các phần dưới đây nằm ngoài scope "flow mua proxy" nhưng có thể có vấn đề tương tự:

| # | Phần | Files chính | Cần check |
|---|------|-------------|-----------|
| R1 | **CheckProxyStatus** (logic hết hạn) | `CheckProxyStatus.php` | Có cover đủ status `in_use`, `in_use_partial`, `partial_refunded` không? Edge case khi expired_at null? |
| R2 | **Flow gia hạn proxy** (renew/extend) | `ProxyController` renew methods, Partner renew logic | Transaction safety, lock, tính giá gia hạn, update expired_at |
| R3 | **Admin retry/refund** | `SupportTicketController::retryPartialOrder`, `refundPartialOrder` | Race condition khi admin bấm 2 lần? Refund amount đúng chưa? |
| R4 | **getProxy\* endpoints** | `ProxyController::getProxyRotating/New/Current` | Null safety (C4 đã phát hiện 1), switch thiếu default (L6), cache invalidation |
| R5 | **Partner Services** | `HomeProxyService`, `ZingProxyService`, `MktProxyService`, `ProxyVnService` | Timeout config, retry logic, error handling, response parsing |
| R6 | **Affiliate commission** | `AffiliateController`, logic tính hoa hồng khi mua proxy | Tính đúng % chưa? Race condition trùng commission? |
| R7 | **Flow nạp tiền** (deposit/payment) | `BankQrController`, `DepositService`, pay2s webhook | Webhook idempotency, double-credit, QR expiry |
| R8 | **Dongtien recording** | Tạo record `dongtien` khi mua/gia hạn/refund | Có ghi đúng type, amount, balance before/after? Missing records? |

### 20/03/2026

#### 13.N Pricing System — FE Phase 5+6

**Sửa:**
- **Phase 5 — Admin UI:**
  - `ServiceFormModal`: thêm section "Chế độ giá" — chọn fixed/per_unit, nhập price_per_unit, cost_per_unit, time_unit
  - `TableServiceType`: nút "Giá riêng" ($) per row → mở `CustomPriceModal`
  - `CustomPriceModal`: CRUD giá riêng per user — chọn user, loại giá (cost_plus/fixed), preview realtime
  - `useCustomPrices.ts`: hook TanStack Query cho CRUD + preview API
- **Phase 6 — User UI:**
  - `CheckoutModal`: hỗ trợ per_unit mode — input số ngày/tháng, tính giá realtime
  - `ProxyCard`: hiện "từ Xđ/ngày" khi per_unit mode

**Files:** `ServiceFormModal.tsx`, `TableServiceType.tsx`, `CustomPriceModal.tsx`, `useCustomPrices.ts`, `CheckoutModal.tsx`, `ProxyCard.tsx`, `RotatingProxyPage.tsx`

#### 13.N+1 Fix: CheckoutModal chặn mua sai khi FE balance stale

**Vấn đề:** CheckoutModal check `sodu >= total` từ Redux để disable nút "Thanh Toán". Redux `sodu` chỉ refresh mỗi 30s → user nạp tiền xong vẫn bị chặn mua vì FE chưa cập nhật balance. UX rất tệ — user có tiền mà không mua được.

**Sửa:** Bỏ chặn mua dựa trên FE balance check. Warning "Số dư không đủ" vẫn hiện nhưng chỉ là cảnh báo tham khảo. BE là nơi quyết định cuối cùng (`lockForUpdate` + check `sodu` real-time). Nếu BE trả lỗi → FE hiện toast.

**Files:** `CheckoutModal.tsx`

### 21/03/2026

#### 13.N+2 Pricing 4 cấp — cost_discount_tiers UI + Provider markup per user

**Vấn đề:** Admin cần set chiết khấu giá gốc NCC theo khoảng ngày (cost_discount_tiers) và markup chung theo NCC per user (Cấp 2a).

**Sửa:**
- `ServiceFormModal`: thêm section cost_discount_tiers (nền vàng, chỉ hiện khi per_unit + có cost_per_unit)
- `useUserProviderPricing.ts`: hook CRUD cho user_provider_pricing
- `ProviderPricingModal`: modal CRUD markup NCC per user (thêm/sửa/xóa/toggle)
- `UsersPage` + `TableUsers`: thêm nút "Markup NCC" (icon Tags) vào cột thao tác

**Files:** `ServiceFormModal.tsx`, `useUserProviderPricing.ts`, `ProviderPricingModal.tsx`, `UsersPage.tsx`, `TableUsers.tsx`

### 31/03/2026

#### 13.N+3 Proxy Keys pages + Search server-side + Rotate config UI

**Sửa:**
- **Proxy Keys pages (MỚI)**: user (`/proxy-keys`) + admin (`/admin/proxy-keys`) — filter, search, copy, update IP whitelist
- **Menu**: user "Danh sách proxy", admin "Proxy Keys"
- **BuyConfigSection**: render cả 2 tab rotating/static (display:none), giữ form data khi switch
- **OrderDetailModal**: auto-show log panel, request payload/URL, `next_rotate_seconds`, trim trailing colons, hiện `allow_ips`
- **ServiceFormModal**: section "Tự động xoay IP" riêng biệt (switch + dropdown preset), nhóm thông số hiển thị tách biệt, `max_ips` config
- **ChildServiceFormModal**: dropdown preset xoay, label tiếng Việt
- **CheckoutModal**: nhập nhiều IP (comma), validate format + max_ips
- **History order + Admin orders**: search server-side, URL `?search=` param fill input

**Files:** `ProxyKeysPage.tsx`, `AdminProxyKeysPage.tsx`, `BuyConfigSection.tsx`, `OrderDetailModal.tsx`, `ServiceFormModal.tsx`, `ChildServiceFormModal.tsx`, `CheckoutModal.tsx`, `HistoryOrderPage.tsx`, `AdminOrdersPage.tsx`, `VerticalMenu.tsx`

#### 13.N+4 Fix nút Tìm kiếm + Period landing page đa ngôn ngữ

**Sửa:**
- **HistoryOrderPage**: thay `setTimeout(refetch)` bằng `queryClient.invalidateQueries` — luôn gọi server khi click. Thêm animation xoay (Loader2) + icon Search trên nút. Nút clear (X) cũng invalidate query
- **Landing page period i18n**: `period` chuyển từ `string` sang `Record<locale, string>`. Admin form hiện 5 input per locale (VI/EN/CN/KO/JA). `ProductsSection` đọc period theo locale hiện tại, fallback vi → ''. Backward compat: data cũ (string) tự migrate sang `{ vi: value }`
- **Type**: `useBrandingSettings.ts` thêm `period` vào `landing_pricing` type

**Files:** `HistoryOrderPage.tsx`, `SiteSettingsForm.tsx`, `ProductsSection.tsx`, `useBrandingSettings.ts`

#### 13.N+5 Params Mapping UI — biến chuẩn hệ thống trên Provider form

**Thêm:**
- **BuyConfigSection**: Step 6 "Params Mapping" — bảng map biến chuẩn (protocol, quantity, duration, username, password, allow_ips, auth_token, ip_version) sang param NCC. Dropdown cố định, value_map bảng 2 cột, default value, format cho array. Alert warning config cũ bị thay khi biến được map
- **ProviderFormTypes**: `ParamsMappingEntry` type, `STANDARD_VARIABLES` + `VARIABLE_FORMAT_OPTIONS` constants, field `params_mapping` + `params_mapping_enabled` trong `ApiConfigBuy`
- **ProviderFormSerializer**: parse value_map object→array (DB→form), build array→object (form→DB). Backward compat: NCC chưa có mapping → `params_mapping_enabled = false`

**Files:** `ProviderFormTypes.ts`, `ProviderFormSerializer.ts`, `BuyConfigSection.tsx`

### 01/04/2026

#### 13.N+6 Chuẩn hoá proxy object FE — utility thay inline logic

**Thêm:** `extractProxyValue()`, `extractProtocol()`, `getProxyString()` trong `protocolProxy.ts`
**Sửa:** 8 file hiển thị proxy dùng utility thay inline logic. Admin config labels đổi `loaiproxy` → `protocol`.
**Files:** `protocolProxy.ts`, `OrderProxyPage.tsx` (2 files), `ProxyDetailModal.tsx`, `OrderRotatingProxyPage.tsx`, `OrderDetail.tsx`, `OrderDetailModal.tsx`, `ProviderFormTypes.ts`, `BuyConfigSection.tsx`, `RenewSection.tsx`, `ServiceFormModal.tsx`

#### 13.N+7 Hoa hồng Affiliate — field cài đặt chung (01/04/2026)

**Thêm:** Field "Hoa hồng Affiliate (%)" vào tab Cài đặt chung trong trang Site Settings
**Files:** SiteSettingsForm.tsx

#### 13.N+8 Fix auth flash + cải thiện UX nạp tiền (01/04/2026)

**Sửa:** AuthGuard bỏ timer 800ms, dựa vào `wasAuthenticated` — đã login thì luôn giữ content, axios interceptor quyết định signOut khi BE xác nhận token chết. Hết lỗi "phải đăng nhập" flash.
**Sửa:** Form tên chuyển tiền: tiêu đề rõ nghĩa, warning box cảnh báo sai tên = không cộng tiền tự động, placeholder + helper hướng dẫn cụ thể.
**Files:** `AuthGuard.tsx`, `RechargePage.tsx`
