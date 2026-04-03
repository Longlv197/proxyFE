// Third-party Imports
import CredentialsProvider from 'next-auth/providers/credentials'

// import type { NextAuthOptions } from 'next-auth'
import type { JWT } from 'next-auth/jwt'

async function refreshToken(token: JWT): Promise<JWT> {
  try {
    const res = await fetch(`${process.env.API_URL}/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token.refresh_token}` // 🧠 dùng refresh token
      }
    })

    const refreshedTokens = await res.json()

    if (!res.ok) throw refreshedTokens

    console.log('✅ [Server Refresh] Refresh thành công.')

    const newAccessToken = refreshedTokens.access_token

    // Gọi /me để sync role + userData mới nhất (phòng trường hợp admin promote role)
    let updatedRole = token.role
    let updatedUserData = token.userData

    try {
      const meRes = await fetch(`${process.env.API_URL}/me`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${newAccessToken}`
        }
      })

      if (meRes.ok) {
        const meData = await meRes.json()

        if (meData?.id) {
          updatedRole = meData.role || updatedRole
          updatedUserData = meData
        }
      }
    } catch {
      // Nếu /me lỗi thì giữ nguyên role cũ, không ảnh hưởng refresh flow
    }

    return {
      ...token,
      access_token: newAccessToken,
      accessTokenExpires: Date.now() + (refreshedTokens.expires_in || 3600) * 1000,
      refresh_token: refreshedTokens.refresh_token ?? token.refresh_token,
      role: updatedRole,
      userData: updatedUserData,
      error: undefined
    }
  } catch (error) {
    console.error('❌ [Server Refresh] Lỗi khi làm mới token:', error)

    return {
      ...token,
      error: 'TokenExpiredError'
    }
  }
}

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'text' },
        password: { label: 'Password', type: 'password' },
        token: { label: 'Token', type: 'text' },
        turnstile_token: { label: 'Turnstile', type: 'text' }
      },
      async authorize(credentials, req) {
        const { email, password, token = null, turnstile_token = null } = credentials as { email?: string; password?: string; token?: string; turnstile_token?: string }
        const apiUrl = process.env.API_URL
        const userAgent = req.headers?.['user-agent'] || ''

        try {
          if (token) {
            const checkUser = await fetch(`${apiUrl}/me`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'User-Agent': userAgent, Authorization: `Bearer ${token}` }
            })

            const resUser = await checkUser.json()

            if (!checkUser.ok || !resUser?.id) {
              throw new Error('Token không hợp lệ hoặc người dùng không tồn tại')
            }

            // ✅ Trả dữ liệu cho NextAuth callback
            return {
              id: resUser.id,
              access_token: token,
              refresh_token: null,
              accessTokenExpires: Date.now() + 60 * 60 * 1000, // 1 giờ
              role: resUser.role || 'user',
              userData: resUser
            } as any
          }

          const res = await fetch(`${apiUrl}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'User-Agent': userAgent },
            body: JSON.stringify({ email, password, turnstile_token })
          })

          const data = await res.json()

          // Nếu login thất bại hoặc không có data user -> trả về null
          if (!res.ok) {
            // Laravel gửi về message + type
            const msg = data?.message || 'Đăng nhập thất bại'
            const type = data?.type || 'unknown_error'

            // Gắn message + type trong Error
            const err = new Error(msg)

            // @ts-ignore
            err.type = type
            throw err
          }

          // Dữ liệu trả về từ authorize sẽ được truyền vào callback `jwt` thông qua tham số `user`
          return {
            id: data.user.id || data.user.email,
            access_token: data.access_token,
            refresh_token: data.refresh_token,
            accessTokenExpires: Date.now() + (data.expires_in || 3600) * 1000,
            role: data.user.role,
            userData: data.user
          } as any
        } catch (error) {
          throw new Error(JSON.stringify({ message: error.message, type: error.type || 'unknown_error' }))
        }
      }
    })
  ],

  session: {
    strategy: 'jwt',
    maxAge: 365 * 24 * 60 * 60, // 1 năm — access token vẫn refresh ngắn hạn qua refreshToken()
  },

  pages: {
    signIn: '/login'
  },

  callbacks: {
    async jwt({ token, user, account, trigger }: any) {
      if (user && account) {
        return {
          ...token,
          access_token: (user as any).access_token,
          accessTokenExpires: (user as any).accessTokenExpires,
          refresh_token: user.refresh_token,
          role: (user as any).role,
          userData: (user as any).userData
        }
      }

      // Khi client gọi session.update() → fetch /me để sync userData mới nhất
      if (trigger === 'update') {
        try {
          const meRes = await fetch(`${process.env.API_URL}/me`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token.access_token}`
            }
          })

          if (meRes.ok) {
            const meData = await meRes.json()

            if (meData?.id) {
              token.role = meData.role || token.role
              token.userData = meData
            }
          }
        } catch {
          // Giữ nguyên data cũ nếu /me lỗi
        }

        return token
      }

      // Refresh sodu từ DB mỗi 30s — server-side, client nhận số đúng từ đầu
      const SODU_REFRESH_MS = 30 * 1000
      if (token.access_token && (!token.soduUpdatedAt || Date.now() - token.soduUpdatedAt > SODU_REFRESH_MS)) {
        try {
          const meRes = await fetch(`${process.env.API_URL}/me`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token.access_token}` }
          })
          if (meRes.ok) {
            const meData = await meRes.json()
            if (meData?.id) {
              token.userData = meData
              token.soduUpdatedAt = Date.now()
            }
          }
        } catch {}
      }

      // Buffer 60s - refresh sớm để tránh token hết hạn giữa chừng
      const BUFFER_MS = 60 * 1000

      if (token.accessTokenExpires && Date.now() < token.accessTokenExpires - BUFFER_MS) {
        return token
      }

      console.log('⚠️ Token hết hạn, đang gọi refresh...')

      return await refreshToken(token)
    },

    async session({ session, token }: any) {
      session.user = token.userData
      session.access_token = token.access_token
      session.refresh_token = token.refresh_token
      session.role = token.role
      session.error = token.error

      return session
    }
  }
}
