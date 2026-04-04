'use client'

import { useEffect, useState } from 'react'

import { usePathname } from 'next/navigation'

import { useSession } from 'next-auth/react'

import type { Locale } from '@/configs/configi18n'
import type { ChildrenType } from '@core/types'

import EmptyAuthPage from '@/components/EmptyAuthPage'

// Routes cho phép truy cập không cần đăng nhập
const PUBLIC_ROUTES = ['/home', '/proxy-tinh', '/proxy-xoay', '/check-proxy', '/docs-api']

// Module-level — persist xuyên page session, KHÔNG reset khi component remount
let _wasEverAuthenticated = false

export default function AuthGuard({ children, locale }: ChildrenType & { locale: Locale }) {
  const pathname = usePathname()
  const { status } = useSession()
  const [confirmedUnauth, setConfirmedUnauth] = useState(false)

  if (status === 'authenticated') {
    _wasEverAuthenticated = true
  }

  // Debug log đã xác nhận: mất session do network (ERR_NAME_NOT_RESOLVED) → đã fix ở useAxiosAuth

  useEffect(() => {
    setConfirmedUnauth(false)

    if (status === 'unauthenticated' && !_wasEverAuthenticated) {
      const timer = setTimeout(() => {
        console.warn('[AuthGuard] ⚠️ Confirmed unauthenticated after 1.5s', { pathname })
        setConfirmedUnauth(true)
      }, 1500)

      return () => clearTimeout(timer)
    }
  }, [status, pathname])

  const isPublicRoute = PUBLIC_ROUTES.some(route => pathname.endsWith(route))
  if (isPublicRoute) return <>{children}</>

  if (status === 'authenticated') return <>{children}</>

  if (_wasEverAuthenticated) return <>{children}</>

  if (status === 'loading' || !confirmedUnauth) return null

  return <EmptyAuthPage lang={locale} />
}
