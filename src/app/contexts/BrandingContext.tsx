'use client'

import { createContext, useContext, useEffect, useMemo } from 'react'

import { siteConfig } from '@/configs/siteConfig'
import { useBrandingSettings, type SiteMode, type BrandingSettings } from '@/hooks/apis/useBrandingSettings'

// Resolve relative path → full URL dùng API domain
// /uploads/branding/xxx.png → https://api.domain.com/uploads/branding/xxx.png
function resolveAssetUrl(path: string | null | undefined): string {
  if (!path) return ''
  if (path.startsWith('http')) return path
  const apiBase = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/api\/?$/, '')

  return apiBase ? `${apiBase}${path}` : path
}

interface BrandingContextValue extends Omit<BrandingSettings, 'site_mode'> {
  name: string
  description: string
  logo: string
  logoIcon: string
  favicon: string
  primaryColor: string
  primaryHover: string
  primaryGradient: string
  siteMode: SiteMode
  isParent: boolean
  isChild: boolean
  isLoading: boolean
}

const defaultBranding: BrandingContextValue = {
  name: '',
  description: '',
  logo: '',
  logoIcon: '',
  favicon: '',
  primaryColor: siteConfig.primaryColor,
  primaryHover: siteConfig.primaryHover,
  primaryGradient: siteConfig.primaryGradient,
  siteMode: 'child',
  isParent: false,
  isChild: true,
  isLoading: false,

  // New fields defaults
  site_name: null,
  site_description: null,
  logo_url: null,
  logo_icon_url: null,
  favicon_url: null,
  og_image_url: null,
  primary_color: null,
  primary_hover: null,
  primary_gradient: null,
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
  turnstile_enabled: null,
  turnstile_site_key: null
}

const BrandingContext = createContext<BrandingContextValue>(defaultBranding)

export const useBranding = () => useContext(BrandingContext)

export function BrandingProvider({
  children,
  initialData
}: {
  children: React.ReactNode
  initialData?: BrandingSettings
}) {
  const { data, isLoading } = useBrandingSettings(initialData)

  const siteMode: SiteMode = (data?.site_mode || 'child') as SiteMode

  // Site con: chỉ dùng DB, không fallback env var (tránh hiện thông tin site mẹ)
  // Site mẹ: DB → env var → default
  const isChild = siteMode === 'child'

  const branding = useMemo<BrandingContextValue>(
    () => ({
      name: data?.site_name || '',
      description: data?.site_description || '',
      logo: resolveAssetUrl(data?.logo_url),
      logoIcon: resolveAssetUrl(data?.logo_icon_url),
      favicon: resolveAssetUrl(data?.favicon_url),
      primaryColor: data?.primary_color || siteConfig.primaryColor,
      primaryHover: data?.primary_hover || siteConfig.primaryHover,
      primaryGradient: data?.primary_gradient || siteConfig.primaryGradient,
      siteMode,
      isParent: siteMode === 'parent',
      isChild: siteMode === 'child',
      isLoading,

      // All raw fields from API
      site_name: data?.site_name ?? null,
      site_description: data?.site_description ?? null,
      logo_url: data?.logo_url ?? null,
      logo_icon_url: data?.logo_icon_url ?? null,
      favicon_url: data?.favicon_url ?? null,
      og_image_url: data?.og_image_url ?? null,
      primary_color: data?.primary_color ?? null,
      primary_hover: data?.primary_hover ?? null,
      primary_gradient: data?.primary_gradient ?? null,
      seo_meta: data?.seo_meta ?? null,
      google_verification: data?.google_verification ?? null,
      gtm_id: data?.gtm_id ?? null,
      organization_name: data?.organization_name ?? null,
      organization_phone: data?.organization_phone ?? null,
      organization_email: data?.organization_email ?? null,
      organization_address: data?.organization_address ?? null,
      website_url: data?.website_url ?? null,
      working_hours: data?.working_hours ?? null,
      tax_id: data?.tax_id ?? null,
      social_links: data?.social_links ?? null,
      sidebar_description: data?.sidebar_description ?? null,
      footer_text: data?.footer_text ?? null,
      support_contact: data?.support_contact ?? null,
      head_scripts: data?.head_scripts ?? null,
      body_scripts: data?.body_scripts ?? null,
      pay2s_webhook_token: data?.pay2s_webhook_token ?? null,
      telegram_bot_token_system: data?.telegram_bot_token_system ?? null,
      telegram_chat_id_system: data?.telegram_chat_id_system ?? null,
      telegram_bot_token_deposit: data?.telegram_bot_token_deposit ?? null,
      telegram_chat_id_deposit: data?.telegram_chat_id_deposit ?? null,
      telegram_bot_token_error: data?.telegram_bot_token_error ?? null,
      telegram_chat_id_error: data?.telegram_chat_id_error ?? null,
      show_product_code: data?.show_product_code ?? null,
      deposit_min_amount: data?.deposit_min_amount ?? null,
      deposit_preset_amounts: data?.deposit_preset_amounts ?? null,
      deposit_notify_telegram: data?.deposit_notify_telegram ?? null,
      landing_pricing: data?.landing_pricing ?? null,
      menu_labels: data?.menu_labels ?? null,
      turnstile_enabled: data?.turnstile_enabled ?? null,
      turnstile_site_key: data?.turnstile_site_key ?? null
    }),
    [data, isLoading, siteMode]
  )

  // Inject CSS variables — chỉ khi giá trị thực sự đổi
  const { primaryColor, primaryHover, primaryGradient, favicon } = branding

  useEffect(() => {
    if (isLoading) return
    const root = document.documentElement

    // Primary color → inject cả custom vars lẫn MUI vars (ThemeProvider không tự set CSS vars)
    root.style.setProperty('--primary-color', primaryColor, 'important')
    root.style.setProperty('--primary-hover', primaryHover, 'important')
    root.style.setProperty('--primary-gradient', primaryGradient, 'important')
    root.style.setProperty('--mui-palette-primary-main', primaryColor, 'important')

    // Compute light/dark variants
    const lighten = (hex: string, amount: number) => {
      const num = parseInt(hex.replace('#', ''), 16)
      const r = Math.min(255, Math.round(((num >> 16) & 0xff) + (255 - ((num >> 16) & 0xff)) * amount))
      const g = Math.min(255, Math.round(((num >> 8) & 0xff) + (255 - ((num >> 8) & 0xff)) * amount))
      const b = Math.min(255, Math.round((num & 0xff) + (255 - (num & 0xff)) * amount))
      return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`
    }

    const darken = (hex: string, amount: number) => {
      const num = parseInt(hex.replace('#', ''), 16)
      const r = Math.round(((num >> 16) & 0xff) * (1 - amount))
      const g = Math.round(((num >> 8) & 0xff) * (1 - amount))
      const b = Math.round((num & 0xff) * (1 - amount))
      return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`
    }

    root.style.setProperty('--mui-palette-primary-light', lighten(primaryColor, 0.2), 'important')
    root.style.setProperty('--mui-palette-primary-dark', darken(primaryColor, 0.1), 'important')

    // mainChannel for opacity variants (MUI uses rgb channel format)
    const hex = primaryColor.replace('#', '')
    const r = parseInt(hex.substring(0, 2), 16)
    const g = parseInt(hex.substring(2, 4), 16)
    const b = parseInt(hex.substring(4, 6), 16)
    root.style.setProperty('--mui-palette-primary-mainChannel', `${r} ${g} ${b}`, 'important')

    // Light variant for hover backgrounds
    root.style.setProperty('--primary-light', `rgba(${r}, ${g}, ${b}, 0.1)`, 'important')
    root.style.setProperty('--mui-palette-primary-lightOpacity', `rgba(${r}, ${g}, ${b}, 0.16)`, 'important')
    root.style.setProperty('--mui-palette-primary-lighterOpacity', `rgba(${r}, ${g}, ${b}, 0.08)`, 'important')

    // Contrast
    const luminance = 0.299 * (r / 255) + 0.587 * (g / 255) + 0.114 * (b / 255)
    root.style.setProperty('--primary-contrast', luminance > 0.6 ? '#1e293b' : '#ffffff')
  }, [isLoading, primaryColor, primaryHover, primaryGradient])

  // Favicon — chỉ chạy khi favicon URL đổi, không chạy mỗi navigation
  useEffect(() => {
    if (isLoading || !favicon) return

    const faviconUrl = favicon.replace(/^http:\/\//i, 'https://')
    const existingIcons = document.querySelectorAll(
      'link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]'
    )

    if (existingIcons.length > 0) {
      existingIcons.forEach(el => {
        if ((el as HTMLLinkElement).href !== faviconUrl) {
          ;(el as HTMLLinkElement).href = faviconUrl
        }
      })
    } else {
      const link = document.createElement('link')

      link.rel = 'icon'
      link.href = faviconUrl
      document.head.appendChild(link)
    }
  }, [isLoading, favicon])

  return <BrandingContext.Provider value={branding}>{children}</BrandingContext.Provider>
}
