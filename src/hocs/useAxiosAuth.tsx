import { useEffect, useRef } from 'react'

import { useSession, signOut } from 'next-auth/react'

import axiosInstance, { setAccessToken, setOnAuthError, setOnRefresh } from '@/libs/axios'

// Flag đảm bảo auth error handler chỉ được set 1 lần
let _authErrorSetup = false

const useAxiosAuth = () => {
  const { data: session, update } = useSession()
  const tokenRef = useRef<string | null>(null)

  // Sync token khi session thay đổi - chỉ update reference, không add/remove interceptor
  // KHÔNG xóa token khi session tạm null (network mất → NextAuth set session=null)
  // Chỉ update khi có token MỚI — tránh domino: null token → 401 → signOut
  useEffect(() => {
    const newToken = (session as any)?.access_token || null

    if (newToken && newToken !== tokenRef.current) {
      tokenRef.current = newToken
      setAccessToken(newToken)
    }
  }, [session])

  // Setup auth error handler + refresh handler 1 lần duy nhất
  useEffect(() => {
    if (_authErrorSetup) return
    _authErrorSetup = true

    setOnAuthError(async () => {
      const currentPath = window.location.pathname
      const callbackUrl = currentPath.includes('/login') ? '/' : currentPath

      await signOut({ callbackUrl })
    })

    setOnRefresh(async () => {
      // Gọi NextAuth update() → trigger JWT callback → tự refresh token
      const newSession = await update()

      if ((newSession as any)?.error || !(newSession as any)?.access_token) {
        throw new Error('Session refresh failed')
      }

      // Sync token mới vào axios
      setAccessToken((newSession as any)?.access_token || null)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return axiosInstance
}

export default useAxiosAuth
