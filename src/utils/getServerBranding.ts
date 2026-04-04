import { siteConfig } from '@/configs/siteConfig'
import type { BrandingSettings } from '@/hooks/apis/useBrandingSettings'

// Resolve relative path → full URL dùng API domain (server-side)
function resolveAssetUrl(path: string | null | undefined): string {
  if (!path) return ''
  if (path.startsWith('http')) return path
  const apiBase = (process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || '').replace(/\/api\/?$/, '')

  return apiBase ? `${apiBase}${path}` : path
}

/**
 * Fetch branding settings server-side (cho generateMetadata + layout).
 *
 * Cache strategy:
 * - Next.js fetch cache với tag 'branding' — revalidate mỗi 5 phút
 * - Khi admin update → gọi revalidateTag('branding') để xóa cache ngay
 * - Client-side: TanStack Query cache 10 phút riêng
 */
export async function getServerBranding(): Promise<BrandingSettings> {
  try {
    const apiUrl = process.env.API_URL || siteConfig.apiUrl

    // Cache 5 phút ở Next.js + tag 'branding' để admin save gọi revalidateTag xóa cache
    // 3-tier: BE Laravel cache → Next.js fetch cache → Client TanStack Query
    const res = await fetch(`${apiUrl}/get-settings`, {
      next: { tags: ['branding'], revalidate: 300 }
    })

    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const json = await res.json()

    if (json?.success && json?.data) {
      const data = json.data

      // Resolve relative paths → full URLs
      data.logo_url = resolveAssetUrl(data.logo_url)
      data.logo_icon_url = resolveAssetUrl(data.logo_icon_url)
      data.favicon_url = resolveAssetUrl(data.favicon_url)
      data.og_image_url = resolveAssetUrl(data.og_image_url)

      return data
    }
  } catch (e) {
    console.error('[getServerBranding] Failed:', e)
  }

  // Fallback — không có branding từ DB, trả rỗng + default colors
  return {
    site_name: '',
    site_description: '',
    logo_url: '',
    logo_icon_url: '',
    favicon_url: '',
    og_image_url: null,
    primary_color: siteConfig.primaryColor,
    primary_hover: siteConfig.primaryHover,
    primary_gradient: siteConfig.primaryGradient,
    seo_meta: null,
    google_verification: null,
    gtm_id: null,
    organization_name: null,
    organization_phone: null,
    organization_email: null,
    organization_address: null,
    website_url: null,
    working_hours: null,
    tax_id: null,
    social_links: null,
    sidebar_description: null,
    footer_text: null,
    support_contact: null,
    head_scripts: null,
    body_scripts: null,
    pay2s_webhook_token: null,
    telegram_bot_token_system: null,
    telegram_chat_id_system: null,
    telegram_bot_token_deposit: null,
    telegram_chat_id_deposit: null,
    telegram_bot_token_error: null,
    telegram_chat_id_error: null,
    show_product_code: null,
    deposit_min_amount: null,
    deposit_preset_amounts: null,
    deposit_notify_telegram: null,
    landing_pricing: null,
    menu_labels: null,
    site_mode: 'child',
  }
}
