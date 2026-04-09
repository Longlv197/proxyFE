import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import useAxiosAuth from '@/hocs/useAxiosAuth'

export type SiteMode = 'parent' | 'child'

export interface SeoMeta {
  title?: string
  description?: string
  keywords?: string
}

export interface SocialLink {
  platform: string
  url: string
}

export interface BrandingSettings {
  site_name: string | null
  site_description: string | null
  logo_url: string | null
  logo_icon_url: string | null
  favicon_url: string | null
  og_image_url: string | null

  // Theme
  primary_color: string | null
  primary_hover: string | null
  primary_gradient: string | null

  // SEO đa ngôn ngữ { vi: { title, description, keywords }, en: { ... } }
  seo_meta: Record<string, SeoMeta> | null

  // Technical
  google_verification: string | null
  gtm_id: string | null

  // Schema
  organization_name: string | null
  organization_phone: string | null
  organization_email: string | null
  organization_address: string | null
  website_url: string | null
  working_hours: string | null
  tax_id: string | null
  social_links: SocialLink[] | null

  // Content
  sidebar_description: string | null
  footer_text: string | null
  support_contact: string | null

  // Scripts
  head_scripts: string | null
  body_scripts: string | null

  // Pay2s
  pay2s_webhook_token: string | null

  // Telegram
  telegram_bot_token_system: string | null
  telegram_chat_id_system: string | null
  telegram_bot_token_deposit: string | null
  telegram_chat_id_deposit: string | null
  telegram_bot_token_error: string | null
  telegram_chat_id_error: string | null

  // Display settings
  show_product_code: string | null
  product_fields: { key: string; label: string; visible: boolean }[] | null

  // Deposit settings
  deposit_min_amount: string | null
  deposit_preset_amounts: number[] | null
  deposit_notify_telegram: string | null

  // Landing page
  landing_pricing: {
    viettel?: { price?: string; originalPrice?: string; discount?: string; period?: string | Record<string, string> }
    fpt?: { price?: string; originalPrice?: string; discount?: string; period?: string | Record<string, string> }
    vnpt?: { price?: string; originalPrice?: string; discount?: string; period?: string | Record<string, string> }
  } | null

  // Landing hero
  landing_hero: {
    title_line1?: Record<string, string>
    title_line2?: Record<string, string>
    subtitle?: Record<string, string>
    features?: { icon: string; text: Record<string, string> }[]
    cta_text?: Record<string, string>
    cta_link?: string
    trust_items?: { number: string; label: Record<string, string> }[]
  } | null

  // Menu labels
  menu_labels: Record<string, string> | null

  // Cloudflare Turnstile
  turnstile_enabled: string | null
  turnstile_site_key: string | null
  turnstile_pages: string[] | null

  // Mode
  site_mode: SiteMode | null
}

export const useBrandingSettings = (serverData?: BrandingSettings) => {
  return useQuery({
    queryKey: ['branding-settings'],
    queryFn: async () => {
      // Public API — không cần auth
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || ''
      const res = await fetch(`${apiUrl}/get-settings`)
      const json = await res.json()

      return (json?.data ?? {}) as BrandingSettings
    },
    initialData: serverData,    // server đã fetch → client dùng ngay, không gọi API
    staleTime: 30_000,          // 30s — sau đó refetch background khi mount
    gcTime: Infinity,           // giữ cache trong session
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })
}

/**
 * Admin: load branding có auth → BE trả thêm turnstile_secret_key masked
 */
export const useAdminBrandingSettings = () => {
  const axiosAuth = useAxiosAuth()

  return useQuery({
    queryKey: ['branding-settings-admin'],
    queryFn: async () => {
      const res = await axiosAuth.get('/get-settings')

      return (res?.data?.data ?? {}) as BrandingSettings & { turnstile_secret_key?: string; turnstile_secret_key_saved?: boolean }
    },
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  })
}

export const useUpdateBrandingSettings = () => {
  const axiosAuth = useAxiosAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: Partial<BrandingSettings>) => {
      const res = await axiosAuth.post('/admin/update-branding-settings', data)

      return res?.data
    },
    onSuccess: () => {
      // Force refetch cả public + admin query
      queryClient.invalidateQueries({ queryKey: ['branding-settings'] })
      queryClient.refetchQueries({ queryKey: ['branding-settings'] })
      queryClient.invalidateQueries({ queryKey: ['branding-settings-admin'] })
      queryClient.refetchQueries({ queryKey: ['branding-settings-admin'] })

      // Invalidate server cache (Next.js) → SEO metadata cập nhật ngay
      fetch('/api/revalidate?tag=branding', { method: 'POST' }).catch(() => { })
    },
  })
}
