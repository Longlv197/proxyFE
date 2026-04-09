'use client'

import { useState, useEffect } from 'react'

import {
  Button,
  Tabs,
  Tab,
  Box
} from '@mui/material'
import {
  Settings,
  Save,
  Loader2,
  Palette,
  Search,
  Truck,
  ShoppingCart,
  CreditCard,
  Headphones
} from 'lucide-react'
import { toast } from 'react-toastify'

import { useSidebarSettings, useUpdateSidebarSettings } from '@/hooks/apis/useSidebarSettings'
import type { SupportLink, YoutubeVideo } from '@/hooks/apis/useSidebarSettings'
import { useAdminBrandingSettings, useUpdateBrandingSettings } from '@/hooks/apis/useBrandingSettings'
import type { BrandingSettings, SocialLink, SeoMeta } from '@/hooks/apis/useBrandingSettings'
import { useProviderSettings, useupdateProviderSettings } from '@/hooks/apis/useSupplierSettings'
import { useBankSettings, useUpdateBankSettings } from '@/hooks/apis/useBankSettings'
import type { BankSettings } from '@/hooks/apis/useBankSettings'
import { useBranding } from '@/app/contexts/BrandingContext'
import useAxiosAuth from '@/hocs/useAxiosAuth'
import ProductSettingForm from './ProductSettingForm'

// Tab components
import TabBranding from './tabs/TabBranding'
import TabColors from './tabs/TabColors'
import TabSeo from './tabs/TabSeo'
import TabSupport from './tabs/TabSupport'
import TabPayment from './tabs/TabPayment'
import TabSupplier from './tabs/TabSupplier'
import TabLandingPage from './tabs/TabLandingPage'
import TabGeneral from './tabs/TabGeneral'

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Migrate landing_pricing.period từ string cũ sang Record<locale, string> */
function migrateLandingPricing(data: any): any {
  if (!data) return null
  const result = { ...data }

  for (const key of ['viettel', 'fpt', 'vnpt']) {
    if (result[key]?.period && typeof result[key].period === 'string') {
      result[key] = { ...result[key], period: { vi: result[key].period } }
    }
  }

  return result
}

// ─── Constants ───────────────────────────────────────────────────────────────

const emptySocialLink: SocialLink = { platform: 'facebook', url: '' }

const defaultBranding: BrandingSettings = {
  site_name: '',
  site_description: '',
  logo_url: '',
  logo_icon_url: '',
  favicon_url: '',
  og_image_url: '',
  primary_color: '#FC4336',
  primary_hover: '#e63946',
  primary_gradient: 'linear-gradient(45deg, #FC4336, #F88A4B)',
  seo_meta: null,
  google_verification: '',
  gtm_id: '',
  organization_name: '',
  organization_phone: '',
  organization_email: '',
  organization_address: '',
  website_url: '',
  working_hours: '',
  tax_id: '',
  social_links: [],
  sidebar_description: '',
  footer_text: '',
  support_contact: '',
  head_scripts: '',
  body_scripts: '',
  pay2s_webhook_token: '',
  telegram_bot_token_system: '',
  telegram_chat_id_system: '',
  telegram_bot_token_deposit: '',
  telegram_chat_id_deposit: '',
  telegram_bot_token_error: '',
  telegram_chat_id_error: '',
  site_mode: null,
  show_product_code: null,
  product_fields: null,
  deposit_min_amount: null,
  deposit_preset_amounts: null,
  deposit_notify_telegram: null,
  landing_pricing: null,
  landing_hero: null,
  menu_labels: null,
  turnstile_enabled: null,
  turnstile_site_key: null,
  turnstile_pages: null
}

const defaultBank: BankSettings = {
  bank_name: '',
  bank_code: '',
  bank_number: '',
  bank_account: '',
  format_chuyentien: ''
}

const tabSx = {
  textTransform: 'none' as const,
  fontWeight: 500,
  fontSize: '13px',
  minHeight: 44,
  gap: '6px'
}

const sectionTitleSx = { fontSize: '14px', fontWeight: 600, color: '#1e293b', margin: 0 }
const sectionDescSx = { fontSize: '12px', color: '#94a3b8', margin: 0, marginTop: 2 }

// ─── Component ───────────────────────────────────────────────────────────────

export default function SiteSettingsForm() {
  const axiosAuth = useAxiosAuth()
  const { isChild, name: brandingName } = useBranding()
  const { data: sidebarData, isLoading: loadingSidebar } = useSidebarSettings()
  const { data: brandingData, isLoading: loadingBranding } = useAdminBrandingSettings()
  const updateSidebarMutation = useUpdateSidebarSettings()
  const updateBrandingMutation = useUpdateBrandingSettings()

  const { data: supplierData } = useProviderSettings()
  const updateSupplierMutation = useupdateProviderSettings()
  const [supplier, setSupplier] = useState({ provider_api_url: '', provider_api_key: '' })
  const [brandingLoaded, setBrandingLoaded] = useState(false)
  const [supplierTestResult, setSupplierTestResult] = useState<any>(null)

  const { data: bankData } = useBankSettings()
  const updateBankMutation = useUpdateBankSettings()
  const [bank, setBank] = useState<BankSettings>({ ...defaultBank })

  const [affiliatePercent, setAffiliatePercent] = useState(2)

  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('settings_active_tab')

      return saved ? parseInt(saved) || 0 : 0
    }

    return 0
  })
  const [colorMode, setColorMode] = useState<'preset' | 'custom'>('preset')
  const [seoLangTab, setSeoLangTab] = useState(0)

  const [supportLinks, setSupportLinks] = useState<SupportLink[]>([])
  const [youtubeVideos, setYoutubeVideos] = useState<YoutubeVideo[]>([])
  const [branding, setBranding] = useState<BrandingSettings>({ ...defaultBranding })

  // Resolve relative path → full URL cho preview ảnh
  const resolveUrl = (path: string | null | undefined) => {
    if (!path) return ''
    if (path.startsWith('http')) return path
    const apiBase = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/api\/?$/, '')

    return apiBase ? `${apiBase}${path}` : path
  }

  // ─── Effects ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (sidebarData) {
      setSupportLinks(sidebarData.support_links || [])
      setYoutubeVideos(sidebarData.youtube_videos || [])
    }
  }, [sidebarData])

  useEffect(() => {
    if (brandingData && !brandingLoaded) {
      setBrandingLoaded(true)
      setBranding({
        site_name: brandingData.site_name || '',
        site_description: brandingData.site_description || '',
        logo_url: brandingData.logo_url || '',
        logo_icon_url: brandingData.logo_icon_url || '',
        favicon_url: brandingData.favicon_url || '',
        og_image_url: brandingData.og_image_url || '',
        primary_color: brandingData.primary_color || '#FC4336',
        primary_hover: brandingData.primary_hover || '#e63946',
        primary_gradient: brandingData.primary_gradient || 'linear-gradient(45deg, #FC4336, #F88A4B)',
        seo_meta: brandingData.seo_meta || {},
        google_verification: brandingData.google_verification || '',
        gtm_id: brandingData.gtm_id || '',
        organization_name: brandingData.organization_name || '',
        organization_phone: brandingData.organization_phone || '',
        organization_email: brandingData.organization_email || '',
        organization_address: brandingData.organization_address || '',
        website_url: brandingData.website_url || '',
        working_hours: brandingData.working_hours || '',
        tax_id: brandingData.tax_id || '',
        social_links: brandingData.social_links || [],
        sidebar_description: brandingData.sidebar_description || '',
        footer_text: brandingData.footer_text || '',
        support_contact: brandingData.support_contact || '',
        head_scripts: brandingData.head_scripts || '',
        body_scripts: brandingData.body_scripts || '',
        pay2s_webhook_token: brandingData.pay2s_webhook_token || '',
        telegram_bot_token_system: brandingData.telegram_bot_token_system || '',
        telegram_chat_id_system: brandingData.telegram_chat_id_system || '',
        telegram_bot_token_deposit: brandingData.telegram_bot_token_deposit || '',
        telegram_chat_id_deposit: brandingData.telegram_chat_id_deposit || '',
        telegram_bot_token_error: brandingData.telegram_bot_token_error || '',
        telegram_chat_id_error: brandingData.telegram_chat_id_error || '',
        site_mode: brandingData.site_mode || null,
        show_product_code: brandingData.show_product_code ?? null,
        product_fields: brandingData.product_fields ?? null,
        deposit_min_amount: brandingData.deposit_min_amount ?? null,
        deposit_preset_amounts: brandingData.deposit_preset_amounts ?? null,
        deposit_notify_telegram: brandingData.deposit_notify_telegram ?? null,
        landing_pricing: migrateLandingPricing(brandingData.landing_pricing),
        landing_hero: brandingData.landing_hero ?? null,
        menu_labels: brandingData.menu_labels ?? null,
        turnstile_enabled: brandingData.turnstile_enabled ?? null,
        turnstile_site_key: brandingData.turnstile_site_key ?? null,
        turnstile_pages: brandingData.turnstile_pages ?? ['login', 'register'],
        turnstile_secret_key: (brandingData as any).turnstile_secret_key ?? null,
        turnstile_secret_key_saved: (brandingData as any).turnstile_secret_key_saved ?? false
      })
    }
  }, [brandingData])

  useEffect(() => {
    if (supplierData) {
      setSupplier({
        provider_api_url: supplierData.provider_api_url || supplierData.supplier_api_url || '',
        provider_api_key: supplierData.provider_api_key || supplierData.supplier_api_key || ''
      })
    }
  }, [supplierData])

  useEffect(() => {
    if (bankData) {
      setBank({
        bank_name: bankData.bank_name || '',
        bank_code: bankData.bank_code || '',
        bank_number: bankData.bank_number || '',
        bank_account: bankData.bank_account || '',
        format_chuyentien: bankData.format_chuyentien || ''
      })
    }
  }, [bankData])

  useEffect(() => {
    axiosAuth
      .get('/admin/affiliate-settings')
      .then(res => {
        if (res.data?.success) {
          setAffiliatePercent(res.data.data.default_affiliate_percent ?? 2)
        }
      })
      .catch(() => {})
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Handlers ────────────────────────────────────────────────────────────

  const handleImageUpload = async (
    file: File,
    field: 'logo_url' | 'logo_icon_url' | 'favicon_url' | 'og_image_url'
  ) => {
    const formData = new FormData()

    // Map field name → tên SEO: logo_url → logo, favicon_url → favicon, og_image_url → og-image
    const fieldName = field.replace('_url', '').replace('_', '-')

    formData.append('image', file)
    formData.append('folder', 'branding')
    formData.append('field', fieldName)

    // Gửi URL ảnh cũ để BE xóa file cũ, giảm tải server
    const oldUrl = branding[field]

    if (oldUrl) formData.append('old_url', oldUrl as string)

    try {
      const res = await axiosAuth.post('/admin/upload-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      if (res.data.success) {
        const url = res.data.url

        setBranding(prev => ({ ...prev, [field]: url }))

        // Auto save field ảnh ngay
        updateBrandingMutation.mutate({ [field]: url } as any, {
          onSuccess: () => toast.success('Cập nhật thành công'),
          onError: () => toast.error('Lưu thất bại')
        })
      }
    } catch {
      toast.error('Lỗi upload ảnh')
    }
  }

  const handleSave = async () => {
    const validLinks = supportLinks.filter(l => l.label.trim() && l.url.trim())
    const validVideos = youtubeVideos.filter(v => v.title.trim() && v.url.trim())

    const isSaving = updateSidebarMutation.isPending || updateBrandingMutation.isPending

    if (isSaving) return

    try {
      await Promise.all([
        updateSidebarMutation.mutateAsync({
          support_links: validLinks,
          youtube_videos: validVideos
        }),
        updateBrandingMutation.mutateAsync(branding),
        axiosAuth.post('/admin/affiliate-settings', {
          default_affiliate_percent: affiliatePercent
        })
      ])
      toast.success('Lưu cấu hình thành công')
    } catch {
      toast.error('Có lỗi xảy ra')
    }
  }

  const updateLink = (idx: number, field: keyof SupportLink, value: string) => {
    setSupportLinks(prev => prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item)))
  }

  const updateVideo = (idx: number, field: keyof YoutubeVideo, value: string) => {
    setYoutubeVideos(prev => prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item)))
  }

  const updateBrandingField = (field: keyof BrandingSettings, value: any) => {
    setBranding(prev => ({ ...prev, [field]: value }))
  }

  // Xóa ảnh → lưu DB ngay (gửi empty string để BE xóa key)
  const resetImageField = (field: 'logo_url' | 'logo_icon_url' | 'favicon_url' | 'og_image_url') => {
    setBranding(prev => ({ ...prev, [field]: '' }))
    updateBrandingMutation.mutate({ [field]: '' } as any, {
      onSuccess: () => toast.success('Đã về mặc định'),
      onError: () => toast.error('Lỗi cập nhật')
    })
  }

  const updateSeoMeta = (lang: string, field: keyof SeoMeta, value: string) => {
    setBranding(prev => {
      const seo = { ...(prev.seo_meta || {}) }

      seo[lang] = { ...(seo[lang] || {}), [field]: value }

      return { ...prev, seo_meta: seo }
    })
  }

  const updateSocialLink = (idx: number, field: keyof SocialLink, value: string) => {
    setBranding(prev => {
      const links = [...(prev.social_links || [])]

      links[idx] = { ...links[idx], [field]: value }

      return { ...prev, social_links: links }
    })
  }

  const addSocialLink = () => {
    setBranding(prev => ({
      ...prev,
      social_links: [...(prev.social_links || []), { ...emptySocialLink }]
    }))
  }

  const removeSocialLink = (idx: number) => {
    setBranding(prev => ({
      ...prev,
      social_links: (prev.social_links || []).filter((_, i) => i !== idx)
    }))
  }

  const isPending = updateSidebarMutation.isPending || updateBrandingMutation.isPending

  // ─── Loading ─────────────────────────────────────────────────────────────

  if (loadingSidebar || loadingBranding) {
    return (
      <div className='orders-content'>
        <div className='table-container' style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
          Đang tải...
        </div>
      </div>
    )
  }

  // ─── Tab panels ──────────────────────────────────────────────────────────

  const availableTabs = [
    { label: 'Thương hiệu', icon: <Palette size={16} /> },
    { label: 'Màu sắc', icon: <Palette size={16} /> },
    { label: 'Google & Quảng bá', icon: <Search size={16} /> },
    { label: 'Hỗ trợ & Liên hệ', icon: <Headphones size={16} /> },
    { label: 'Sản phẩm', icon: <ShoppingCart size={16} /> },
    { label: 'Thanh toán & Giao dịch', icon: <CreditCard size={16} /> },
    ...(isChild ? [{ label: 'Nhà cung cấp', icon: <Truck size={16} /> }] : []),
    { label: 'Landing Page', icon: <ShoppingCart size={16} /> },
    { label: 'Cài đặt chung', icon: <Settings size={16} /> }
  ]

  // Clamp tab nếu saved tab > số tab hiện có
  const safeTab = activeTab < availableTabs.length ? activeTab : 0

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className='orders-content'>
      <div className='table-container'>
        {/* Header toolbar */}
        <div className='table-toolbar'>
          <div className='header-left'>
            <div className='page-icon'>
              <Settings size={17} />
            </div>
            <h5 style={{ margin: 0, fontWeight: 600, fontSize: '15px', color: '#1e293b' }}>Cài đặt chung</h5>
          </div>
          <div className='header-right'>
            <Button
              onClick={handleSave}
              variant='contained'
              size='small'
              startIcon={isPending ? <Loader2 size={16} className='animate-spin' /> : <Save size={16} />}
              disabled={isPending}
              sx={{
                background: 'var(--primary-gradient, linear-gradient(45deg, #fc4336, #f88a4b))',
                color: '#fff',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                fontWeight: 600,
                fontSize: '13px',
                textTransform: 'none',
                '&:hover': { opacity: 0.9, boxShadow: '0 6px 16px rgba(0, 0, 0, 0.2)' }
              }}
            >
              {isPending ? 'Đang lưu...' : 'Lưu cấu hình'}
            </Button>
          </div>
        </div>

        {/* Hướng dẫn nhanh — hiện khi chưa có tên site */}
        {!branding.site_name && (
          <div
            style={{
              margin: '12px 16px 0',
              padding: '12px 16px',
              background: '#fffbeb',
              border: '1px solid #fcd34d',
              borderRadius: 10,
              fontSize: '13px',
              color: '#92400e',
              lineHeight: 1.6
            }}
          >
            <strong>Bắt đầu setup site:</strong> Điền lần lượt từ trái sang phải →<strong> Thương hiệu</strong> (tên +
            logo) →<strong> Màu sắc</strong> (chọn màu chủ đạo) →<strong> Google & Quảng bá</strong> (nội dung khi khách
            tìm kiếm) →<strong> Hỗ trợ & Liên hệ</strong> (Zalo, Telegram...) →<strong> Thanh toán</strong> (ngân hàng
            nhận tiền).
          </div>
        )}

        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
          <Tabs
            value={safeTab}
            onChange={(_, v) => {
              setActiveTab(v)
              localStorage.setItem('settings_active_tab', String(v))
            }}
            variant='scrollable'
            scrollButtons='auto'
            sx={{
              minHeight: 44,
              '& .MuiTab-root': { minHeight: 44 },
              '& .MuiTabs-indicator': { height: 2.5, borderRadius: 2 }
            }}
          >
            {availableTabs.map((t, i) => (
              <Tab key={i} icon={t.icon} iconPosition='start' label={t.label} sx={tabSx} />
            ))}
          </Tabs>
        </Box>

        {/* Tab content */}
        <div style={{ padding: 20 }}>
          {safeTab === 0 && (
            <TabBranding
              branding={branding}
              updateBrandingField={updateBrandingField}
              handleImageUpload={handleImageUpload}
              resetImageField={resetImageField}
              resolveUrl={resolveUrl}
              brandingName={brandingName}
            />
          )}

          {safeTab === 1 && (
            <TabColors
              branding={branding}
              updateBrandingField={updateBrandingField}
              setBranding={setBranding}
              colorMode={colorMode}
              setColorMode={setColorMode}
            />
          )}

          {safeTab === 2 && (
            <TabSeo
              branding={branding}
              updateBrandingField={updateBrandingField}
              updateSeoMeta={updateSeoMeta}
              updateSocialLink={updateSocialLink}
              addSocialLink={addSocialLink}
              removeSocialLink={removeSocialLink}
              seoLangTab={seoLangTab}
              setSeoLangTab={setSeoLangTab}
              brandingName={brandingName}
              isChild={isChild}
              resolveUrl={resolveUrl}
            />
          )}

          {safeTab === 3 && (
            <TabSupport
              branding={branding}
              updateBrandingField={updateBrandingField}
              supportLinks={supportLinks}
              setSupportLinks={setSupportLinks}
              updateLink={updateLink}
              youtubeVideos={youtubeVideos}
              setYoutubeVideos={setYoutubeVideos}
              updateVideo={updateVideo}
            />
          )}

          {safeTab === 4 && (
            <ProductSettingForm
              sectionTitleSx={sectionTitleSx}
              sectionDescSx={sectionDescSx}
              show_product_code={branding?.show_product_code}
              updateBrandingField={updateBrandingField}
              product_fields={branding?.product_fields}
            />
          )}

          {safeTab === 5 && (
            <TabPayment
              branding={branding}
              updateBrandingField={updateBrandingField}
              bank={bank}
              setBank={setBank}
              updateBankMutation={updateBankMutation}
              affiliatePercent={affiliatePercent}
              setAffiliatePercent={setAffiliatePercent}
              axiosAuth={axiosAuth}
            />
          )}

          {isChild && safeTab === 6 && (
            <TabSupplier
              supplier={supplier}
              setSupplier={setSupplier}
              updateSupplierMutation={updateSupplierMutation}
              supplierData={supplierData}
              supplierTestResult={supplierTestResult}
              setSupplierTestResult={setSupplierTestResult}
              axiosAuth={axiosAuth}
            />
          )}

          {safeTab === availableTabs.findIndex(t => t.label === 'Landing Page') && activeTab >= 0 && (
            <TabLandingPage
              branding={branding}
              updateBrandingField={updateBrandingField}
              setBranding={setBranding}
            />
          )}

          {safeTab === availableTabs.findIndex(t => t.label === 'Cài đặt chung') && activeTab >= 0 && (
            <TabGeneral
              branding={branding}
              updateBrandingField={updateBrandingField}
              setBranding={setBranding}
              affiliatePercent={affiliatePercent}
              setAffiliatePercent={setAffiliatePercent}
            />
          )}
        </div>
      </div>
    </div>
  )
}
