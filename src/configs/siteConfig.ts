/**
 * Centralized site configuration.
 * Branding (name, logo, favicon, description) lấy từ DB qua API /get-settings.
 *
 * .env.production chỉ cần:
 *   NEXTAUTH_URL, NEXTAUTH_SECRET, API_URL, NEXT_PUBLIC_API_URL
 */
const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8002/api'

export const siteConfig = {
  apiUrl,
  socketUrl: process.env.NEXT_PUBLIC_SOCKET_URL || '',

  // Default colors — dùng khi DB chưa cấu hình
  primaryColor: '#FC4336',
  primaryHover: '#e63946',
  primaryGradient: 'linear-gradient(45deg, #FC4336, #F88A4B)',
}
