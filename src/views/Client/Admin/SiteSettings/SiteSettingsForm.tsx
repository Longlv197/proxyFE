'use client'

import { useState, useEffect, useRef } from 'react'

import {
  Button,
  TextField,
  IconButton,
  Tooltip,
  Tabs,
  Tab,
  Box,
  Alert,
  MenuItem,
  Select,
  FormControl,
  InputLabel
} from '@mui/material'
import {
  Settings,
  Plus,
  Trash2,
  Save,
  Loader2,
  Upload,
  Palette,
  Search,
  Code,
  PanelLeft,
  Truck,
  Globe,
  Info,
  Eye,
  ShoppingCart,
  CreditCard,
  Headphones,
  Shield
} from 'lucide-react'
import { toast } from 'react-toastify'

import { useSidebarSettings, useUpdateSidebarSettings } from '@/hooks/apis/useSidebarSettings'
import type { SupportLink, YoutubeVideo } from '@/hooks/apis/useSidebarSettings'
import { useBrandingSettings, useUpdateBrandingSettings } from '@/hooks/apis/useBrandingSettings'
import type { BrandingSettings, SocialLink, SeoMeta } from '@/hooks/apis/useBrandingSettings'
import { useSupplierSettings, useUpdateSupplierSettings } from '@/hooks/apis/useSupplierSettings'
import { useBankSettings, useUpdateBankSettings } from '@/hooks/apis/useBankSettings'
import type { BankSettings } from '@/hooks/apis/useBankSettings'
import { useBranding } from '@/app/contexts/BrandingContext'
import useAxiosAuth from '@/hocs/useAxiosAuth'

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

const ICON_OPTIONS = [
  { value: 'zalo', label: 'Zalo' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'telegram', label: 'Telegram' },
  { value: 'youtube', label: 'Youtube' },
  { value: 'other', label: 'Khác' }
]

const SOCIAL_PLATFORM_OPTIONS = [
  { value: 'facebook', label: 'Facebook' },
  { value: 'telegram', label: 'Telegram' },
  { value: 'zalo', label: 'Zalo' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'youtube', label: 'YouTube' }
]

const SEO_LANGUAGES = [
  { code: 'vi', label: 'Tiếng Việt' },
  { code: 'en', label: 'English' },
  { code: 'ja', label: '日本語' },
  { code: 'ko', label: '한국어' }
]

// SEO placeholders — siteName sẽ được inject runtime từ branding
const getSeoPlaceholders = (
  siteName: string
): Record<string, { title: string; description: string; keywords: string }> => ({
  vi: {
    title: `${siteName || 'Tên site'} - Dịch vụ Proxy Chất Lượng Cao`,
    description: 'Cung cấp proxy residential, datacenter chất lượng cao cho mọi nhu cầu',
    keywords: 'proxy, mua proxy, proxy việt nam, residential proxy'
  },
  en: {
    title: `${siteName || 'Site Name'} - High Quality Proxy Service`,
    description: 'Premium residential and datacenter proxies for all your needs',
    keywords: 'proxy, buy proxy, residential proxy, datacenter proxy'
  },
  ja: {
    title: `${siteName || 'サイト名'} - 高品質プロキシサービス`,
    description: '高品質なレジデンシャルプロキシとデータセンタープロキシを提供',
    keywords: 'プロキシ, proxy, レジデンシャルプロキシ'
  },
  ko: {
    title: `${siteName || '사이트 이름'} - 고품질 프록시 서비스`,
    description: '모든 요구에 맞는 프리미엄 주거용 및 데이터센터 프록시',
    keywords: '프록시, proxy, 레지덴셜 프록시'
  }
})

const COLOR_PRESETS = [
  {
    name: 'Đỏ cam',
    primary: '#FC4336',
    hover: '#e63946',
    gradient: 'linear-gradient(45deg, #FC4336, #F88A4B)'
  },
  {
    name: 'Xanh dương',
    primary: '#2092EC',
    hover: '#1a7ad4',
    gradient: 'linear-gradient(45deg, #2092EC, #5CAFF1)'
  },
  {
    name: 'Xanh lá',
    primary: '#0D9394',
    hover: '#096B6C',
    gradient: 'linear-gradient(45deg, #0D9394, #4EB0B1)'
  },
  {
    name: 'Tím',
    primary: '#7C3AED',
    hover: '#6D28D9',
    gradient: 'linear-gradient(45deg, #7C3AED, #A78BFA)'
  },
  {
    name: 'Hồng',
    primary: '#EC4899',
    hover: '#DB2777',
    gradient: 'linear-gradient(45deg, #EC4899, #F472B6)'
  }
]

const BANK_LIST = [
  { code: '970436', name: 'Vietcombank', shortName: 'VCB' },
  { code: '970415', name: 'VietinBank', shortName: 'CTG' },
  { code: '970418', name: 'BIDV', shortName: 'BIDV' },
  { code: '970422', name: 'MB Bank', shortName: 'MB' },
  { code: '970416', name: 'ACB', shortName: 'ACB' },
  { code: '970407', name: 'Techcombank', shortName: 'TCB' },
  { code: '970423', name: 'TPBank', shortName: 'TPB' },
  { code: '970432', name: 'VPBank', shortName: 'VPB' },
  { code: '970448', name: 'OCB', shortName: 'OCB' },
  { code: '970405', name: 'Agribank', shortName: 'AGR' },
  { code: '970403', name: 'Sacombank', shortName: 'STB' },
  { code: '970406', name: 'DongA Bank', shortName: 'DAB' },
  { code: '970441', name: 'VIB', shortName: 'VIB' },
  { code: '970443', name: 'SHB', shortName: 'SHB' },
  { code: '970431', name: 'Eximbank', shortName: 'EIB' },
  { code: '970426', name: 'MSB', shortName: 'MSB' },
  { code: '970454', name: 'Viet Capital Bank', shortName: 'BVB' },
  { code: '970449', name: 'LienVietPostBank', shortName: 'LPB' },
  { code: '970412', name: 'PVcomBank', shortName: 'PVC' },
  { code: '970429', name: 'SeABank', shortName: 'SSB' },
  { code: '970427', name: 'VietA Bank', shortName: 'VAB' },
  { code: '970433', name: 'VietBank', shortName: 'VBB' },
  { code: '970440', name: 'Nam A Bank', shortName: 'NAB' },
  { code: '970437', name: 'HDBank', shortName: 'HDB' },
  { code: '970424', name: 'Shinhan Bank', shortName: 'SHN' },
  { code: '970425', name: 'ABBANK', shortName: 'ABB' },
  { code: '970452', name: 'KienLong Bank', shortName: 'KLB' }
]

const emptySupportLink: SupportLink = { label: '', url: '', icon: 'other', color: '#3b82f6' }
const emptyVideo: YoutubeVideo = { title: '', url: '' }
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
  deposit_min_amount: null,
  deposit_preset_amounts: null,
  deposit_notify_telegram: null,
  landing_pricing: null,
  menu_labels: null
}

const defaultBank: BankSettings = {
  bank_name: '',
  bank_code: '',
  bank_number: '',
  bank_account: '',
  format_chuyentien: ''
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const sectionTitleSx = { fontSize: '14px', fontWeight: 600, color: '#1e293b', margin: 0 }
const sectionDescSx = { fontSize: '12px', color: '#94a3b8', margin: 0, marginTop: 2 }
const fieldLabelSx = { fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }

const tabSx = {
  textTransform: 'none' as const,
  fontWeight: 500,
  fontSize: '13px',
  minHeight: 44,
  gap: '6px'
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function SiteSettingsForm() {
  const axiosAuth = useAxiosAuth()
  const { isChild, name: brandingName } = useBranding()
  const { data: sidebarData, isLoading: loadingSidebar } = useSidebarSettings()
  const { data: brandingData, isLoading: loadingBranding } = useBrandingSettings()
  const updateSidebarMutation = useUpdateSidebarSettings()
  const updateBrandingMutation = useUpdateBrandingSettings()

  const { data: supplierData } = useSupplierSettings()
  const updateSupplierMutation = useUpdateSupplierSettings()
  const [supplier, setSupplier] = useState({ provider_api_url: '', provider_api_key: '' })
  const [supplierTestResult, setSupplierTestResult] = useState<any>(null)

  const { data: bankData } = useBankSettings()
  const updateBankMutation = useUpdateBankSettings()
  const [bank, setBank] = useState<BankSettings>({ ...defaultBank })

  const [affiliatePercent, setAffiliatePercent] = useState(2)

  const [activeTab, setActiveTab] = useState(0)
  const [colorMode, setColorMode] = useState<'preset' | 'custom'>('preset')
  const [seoLangTab, setSeoLangTab] = useState(0)

  const [supportLinks, setSupportLinks] = useState<SupportLink[]>([])
  const [youtubeVideos, setYoutubeVideos] = useState<YoutubeVideo[]>([])
  const [branding, setBranding] = useState<BrandingSettings>({ ...defaultBranding })

  const logoInputRef = useRef<HTMLInputElement>(null)
  const logoIconInputRef = useRef<HTMLInputElement>(null)
  const faviconInputRef = useRef<HTMLInputElement>(null)
  const ogImageInputRef = useRef<HTMLInputElement>(null)

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
    if (brandingData) {
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
        deposit_min_amount: brandingData.deposit_min_amount ?? null,
        deposit_preset_amounts: brandingData.deposit_preset_amounts ?? null,
        deposit_notify_telegram: brandingData.deposit_notify_telegram ?? null,
        landing_pricing: migrateLandingPricing(brandingData.landing_pricing),
        menu_labels: brandingData.menu_labels ?? null
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

  const applyColorPreset = (preset: (typeof COLOR_PRESETS)[0]) => {
    setBranding(prev => ({
      ...prev,
      primary_color: preset.primary,
      primary_hover: preset.hover,
      primary_gradient: preset.gradient
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
            value={activeTab}
            onChange={(_, v) => setActiveTab(v)}
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
          {/* ═══════════════ Tab 0: Thương hiệu ═══════════════ */}
          {activeTab === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div>
                <h6 style={sectionTitleSx}>Thông tin cơ bản</h6>
                <div
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: 10,
                    padding: '12px 16px',
                    fontSize: '12px',
                    color: '#475569',
                    lineHeight: 1.8
                  }}
                >
                  <strong>Tên site</strong> hiện ở: menu trái, header, footer, tab trình duyệt
                  <br />
                  <strong>Logo</strong> hiện ở: menu trái (mở rộng), header trang chủ
                  <br />
                  <strong>Logo thu gọn</strong> hiện ở: menu trái (thu nhỏ)
                  <br />
                  <strong>Favicon</strong> hiện ở: icon tab trình duyệt + icon bên cạnh URL trên Google
                  <br />
                  <strong>OG Image</strong> hiện ở: ảnh preview khi chia sẻ link lên Facebook/Zalo
                </div>
              </div>

              {/* Name + Description */}
              <div style={{ display: 'flex', gap: 12 }}>
                <TextField
                  size='small'
                  label='Tên site'
                  value={branding.site_name}
                  onChange={e => updateBrandingField('site_name', e.target.value)}
                  placeholder='VD: My Proxy Site'
                  helperText='Hiện ở: sidebar menu, header, footer, tab trình duyệt (fallback khi chưa có SEO title)'
                  sx={{ flex: 1 }}
                />
                <TextField
                  size='small'
                  label='Mô tả ngắn'
                  value={branding.site_description}
                  onChange={e => updateBrandingField('site_description', e.target.value)}
                  placeholder='VD: Dịch vụ Proxy Chất Lượng Cao'
                  helperText='Hiện ở: dưới tên site, fallback cho SEO description khi tab SEO để trống'
                  sx={{ flex: 2 }}
                />
              </div>

              {/* Logo + Favicon + OG Image */}
              <div>
                <h6 style={sectionTitleSx}>Hình ảnh</h6>
                <p style={sectionDescSx}>
                  Upload ảnh xong <strong>tự động lưu</strong> (không cần nhấn Lưu). Xóa ảnh = về hình mặc định.
                </p>
              </div>
              <div style={{ display: 'flex', gap: 24 }}>
                {/* Logo */}
                <div style={{ flex: 1 }}>
                  <div style={fieldLabelSx}>
                    Logo{' '}
                    <span style={{ fontWeight: 400, color: '#94a3b8' }}>
                      — Hiển thị ở sidebar + header. PNG/SVG nền trong suốt, 360x100px
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {branding.logo_url ? (
                      <img
                        src={resolveUrl(branding.logo_url)}
                        alt='Logo'
                        style={{
                          maxHeight: 40,
                          maxWidth: 160,
                          objectFit: 'contain',
                          border: '1px solid #e2e8f0',
                          borderRadius: 6,
                          padding: 4
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          height: 40,
                          padding: '0 12px',
                          display: 'flex',
                          alignItems: 'center',
                          border: '1px dashed #cbd5e1',
                          borderRadius: 6,
                          color: '#94a3b8',
                          fontSize: '12px'
                        }}
                      >
                        Đang dùng logo mặc định
                      </div>
                    )}
                    <Button
                      variant='outlined'
                      size='small'
                      startIcon={<Upload size={14} />}
                      onClick={() => logoInputRef.current?.click()}
                      sx={{ textTransform: 'none', fontSize: '12px' }}
                    >
                      {branding.logo_url ? 'Thay' : 'Tải lên'}
                    </Button>
                    {branding.logo_url && (
                      <Tooltip title='Về logo mặc định'>
                        <IconButton
                          size='small'
                          onClick={() => resetImageField('logo_url')}
                          sx={{ color: '#94a3b8', '&:hover': { color: '#ef4444' } }}
                        >
                          <Trash2 size={14} />
                        </IconButton>
                      </Tooltip>
                    )}
                    <input
                      ref={logoInputRef}
                      type='file'
                      hidden
                      accept='image/png,image/svg+xml,image/webp'
                      onChange={e => {
                        const file = e.target.files?.[0]

                        if (file) handleImageUpload(file, 'logo_url')
                        e.target.value = ''
                      }}
                    />
                  </div>
                </div>

                {/* Logo Icon (collapsed menu) */}
                <div style={{ flex: 1 }}>
                  <div style={fieldLabelSx}>
                    Logo thu gọn{' '}
                    <span style={{ fontWeight: 400, color: '#94a3b8' }}>— Hiện khi menu co lại. Vuông, 64x64px</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {branding.logo_icon_url ? (
                      <img
                        src={resolveUrl(branding.logo_icon_url)}
                        alt='Logo Icon'
                        style={{
                          width: 36,
                          height: 36,
                          objectFit: 'contain',
                          border: '1px solid #e2e8f0',
                          borderRadius: 8,
                          padding: 2
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: '1px dashed #cbd5e1',
                          borderRadius: 8,
                          color: '#94a3b8',
                          fontSize: '10px'
                        }}
                      >
                        —
                      </div>
                    )}
                    <Button
                      variant='outlined'
                      size='small'
                      startIcon={<Upload size={14} />}
                      onClick={() => logoIconInputRef.current?.click()}
                      sx={{ textTransform: 'none', fontSize: '12px' }}
                    >
                      {branding.logo_icon_url ? 'Thay' : 'Tải lên'}
                    </Button>
                    {branding.logo_icon_url && (
                      <Tooltip title='Xóa logo thu gọn'>
                        <IconButton
                          size='small'
                          onClick={() => resetImageField('logo_icon_url')}
                          sx={{ color: '#94a3b8', '&:hover': { color: '#ef4444' } }}
                        >
                          <Trash2 size={14} />
                        </IconButton>
                      </Tooltip>
                    )}
                    <input
                      ref={logoIconInputRef}
                      type='file'
                      hidden
                      accept='image/png,image/svg+xml,image/webp'
                      onChange={e => {
                        const file = e.target.files?.[0]

                        if (file) handleImageUpload(file, 'logo_icon_url')
                        e.target.value = ''
                      }}
                    />
                  </div>
                </div>

                {/* Favicon */}
                <div style={{ flex: 1 }}>
                  <div style={fieldLabelSx}>
                    Favicon{' '}
                    <span style={{ fontWeight: 400, color: '#94a3b8' }}>
                      — Icon nhỏ trên tab trình duyệt. PNG/ICO vuông 32x32px
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {branding.favicon_url ? (
                      <img
                        src={resolveUrl(branding.favicon_url)}
                        alt='Favicon'
                        style={{
                          width: 32,
                          height: 32,
                          objectFit: 'contain',
                          border: '1px solid #e2e8f0',
                          borderRadius: 6,
                          padding: 2
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: '1px dashed #cbd5e1',
                          borderRadius: 6,
                          color: '#cbd5e1',
                          fontSize: '10px'
                        }}
                      >
                        ?
                      </div>
                    )}
                    <Button
                      variant='outlined'
                      size='small'
                      startIcon={<Upload size={14} />}
                      onClick={() => faviconInputRef.current?.click()}
                      sx={{ textTransform: 'none', fontSize: '12px' }}
                    >
                      {branding.favicon_url ? 'Thay' : 'Tải lên'}
                    </Button>
                    {branding.favicon_url && (
                      <Tooltip title='Về favicon mặc định'>
                        <IconButton
                          size='small'
                          onClick={() => resetImageField('favicon_url')}
                          sx={{ color: '#94a3b8', '&:hover': { color: '#ef4444' } }}
                        >
                          <Trash2 size={14} />
                        </IconButton>
                      </Tooltip>
                    )}
                    <input
                      ref={faviconInputRef}
                      type='file'
                      hidden
                      accept='image/png,image/x-icon,image/svg+xml'
                      onChange={e => {
                        const file = e.target.files?.[0]

                        if (file) handleImageUpload(file, 'favicon_url')
                        e.target.value = ''
                      }}
                    />
                  </div>
                </div>

                {/* OG Image */}
                <div style={{ flex: 1 }}>
                  <div style={fieldLabelSx}>
                    OG Image{' '}
                    <span style={{ fontWeight: 400, color: '#94a3b8' }}>
                      — Ảnh hiện khi chia sẻ link lên Facebook/Zalo. 1200x630px
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {branding.og_image_url ? (
                      <img
                        src={resolveUrl(branding.og_image_url)}
                        alt='OG Image'
                        style={{
                          maxHeight: 40,
                          maxWidth: 80,
                          objectFit: 'cover',
                          border: '1px solid #e2e8f0',
                          borderRadius: 6,
                          padding: 2
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          height: 40,
                          padding: '0 12px',
                          display: 'flex',
                          alignItems: 'center',
                          border: '1px dashed #cbd5e1',
                          borderRadius: 6,
                          color: '#94a3b8',
                          fontSize: '12px'
                        }}
                      >
                        Chưa có
                      </div>
                    )}
                    <Button
                      variant='outlined'
                      size='small'
                      startIcon={<Upload size={14} />}
                      onClick={() => ogImageInputRef.current?.click()}
                      sx={{ textTransform: 'none', fontSize: '12px' }}
                    >
                      {branding.og_image_url ? 'Thay' : 'Tải lên'}
                    </Button>
                    {branding.og_image_url && (
                      <Tooltip title='Xóa OG image'>
                        <IconButton
                          size='small'
                          onClick={() => resetImageField('og_image_url')}
                          sx={{ color: '#94a3b8', '&:hover': { color: '#ef4444' } }}
                        >
                          <Trash2 size={14} />
                        </IconButton>
                      </Tooltip>
                    )}
                    <input
                      ref={ogImageInputRef}
                      type='file'
                      hidden
                      accept='image/*'
                      onChange={e => {
                        const file = e.target.files?.[0]

                        if (file) handleImageUpload(file, 'og_image_url')
                        e.target.value = ''
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Sidebar description, footer, support contact */}
              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 20 }}>
                <h6 style={sectionTitleSx}>Nội dung hiển thị</h6>
                <p style={sectionDescSx}>Các thông tin này không bắt buộc — chỉ điền khi muốn hiển thị</p>
              </div>
              <TextField
                size='small'
                label='Mô tả sidebar'
                value={branding.sidebar_description}
                onChange={e => updateBrandingField('sidebar_description', e.target.value)}
                placeholder='VD: Proxy tốc độ cao, hỗ trợ 24/7'
                helperText='Hiển thị dưới logo trong menu bên trái. Để trống nếu không cần.'
                multiline
                minRows={2}
                maxRows={4}
                fullWidth
              />
              <TextField
                size='small'
                label='Nội dung footer'
                value={branding.footer_text}
                onChange={e => updateBrandingField('footer_text', e.target.value)}
                placeholder={`VD: © 2024 ${brandingName || 'Your Site'}. All rights reserved.`}
                helperText='Hiển thị ở cuối trang. Để trống sẽ dùng tên site mặc định.'
                multiline
                minRows={2}
                maxRows={4}
                fullWidth
              />
              {/* Liên hệ hỗ trợ đã chuyển sang tab "Hỗ trợ & Liên hệ" */}
            </div>
          )}

          {/* ═══════════════ Tab 1: Màu sắc ═══════════════ */}
          {activeTab === 1 &&
            (() => {
              const pc = branding.primary_color || '#FC4336'
              const ph = branding.primary_hover || '#e63946'
              const pg = branding.primary_gradient || 'linear-gradient(45deg, #FC4336, #F88A4B)'
              const isPreset = COLOR_PRESETS.some(
                p => branding.primary_color === p.primary && branding.primary_gradient === p.gradient
              )
              const currentPresetName = COLOR_PRESETS.find(p => branding.primary_color === p.primary)?.name

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                  {/* ── Phần 1: Chọn màu ── */}
                  <div>
                    <h6 style={sectionTitleSx}>Chọn màu cho site của bạn</h6>
                    <p style={sectionDescSx}>
                      Chọn 1 màu bên dưới — toàn bộ nút bấm, menu, viền, đường link trên site sẽ đổi theo. Xem kết quả
                      ngay bên dưới.
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {COLOR_PRESETS.map(preset => {
                      const isActive =
                        branding.primary_color === preset.primary && branding.primary_gradient === preset.gradient

                      return (
                        <div
                          key={preset.name}
                          onClick={() => {
                            applyColorPreset(preset)
                            setColorMode('preset')
                          }}
                          style={{
                            padding: '10px 22px',
                            borderRadius: 10,
                            cursor: 'pointer',
                            background: preset.gradient,
                            border: isActive ? `2px solid ${preset.primary}` : '2px solid transparent',
                            outline: isActive ? `3px solid ${preset.primary}33` : 'none',
                            boxShadow: isActive ? `0 0 0 4px ${preset.primary}22` : '0 2px 6px rgba(0,0,0,0.08)',
                            transition: 'all 0.15s ease',
                            transform: isActive ? 'scale(1.05)' : 'scale(1)'
                          }}
                        >
                          <span
                            style={{
                              fontSize: '13px',
                              color: '#fff',
                              fontWeight: 700,
                              textShadow: '0 1px 3px rgba(0,0,0,0.3)',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {isActive ? `✓ ${preset.name}` : preset.name}
                          </span>
                        </div>
                      )
                    })}
                  </div>

                  {/* Tự chọn màu */}
                  <div>
                    <div
                      onClick={() => setColorMode(colorMode === 'custom' ? 'preset' : 'custom')}
                      style={{
                        fontSize: '13px',
                        fontWeight: 600,
                        color: '#64748b',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '6px 0'
                      }}
                    >
                      {colorMode === 'custom' ? '▾' : '▸'} Không thích màu có sẵn? Tự chọn màu
                      {!isPreset && (
                        <span style={{ fontSize: '11px', color: '#22c55e', fontWeight: 500, marginLeft: 4 }}>
                          ✓ Đang dùng
                        </span>
                      )}
                    </div>

                    {colorMode === 'custom' &&
                      (() => {
                        const darken = (hex: string, pct: number) => {
                          const n = parseInt(hex.replace('#', ''), 16)
                          const r = Math.max(0, Math.round(((n >> 16) & 0xff) * (1 - pct)))
                          const g = Math.max(0, Math.round(((n >> 8) & 0xff) * (1 - pct)))
                          const b = Math.max(0, Math.round((n & 0xff) * (1 - pct)))

                          return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
                        }

                        const lighten = (hex: string, pct: number) => {
                          const n = parseInt(hex.replace('#', ''), 16)
                          const r = Math.min(255, Math.round(((n >> 16) & 0xff) + (255 - ((n >> 16) & 0xff)) * pct))
                          const g = Math.min(255, Math.round(((n >> 8) & 0xff) + (255 - ((n >> 8) & 0xff)) * pct))
                          const b = Math.min(255, Math.round((n & 0xff) + (255 - (n & 0xff)) * pct))

                          return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
                        }

                        const applyCustomColor = (c: string) => {
                          setBranding(prev => ({
                            ...prev,
                            primary_color: c,
                            primary_hover: darken(c, 0.12),
                            primary_gradient: `linear-gradient(45deg, ${c}, ${lighten(c, 0.25)})`
                          }))
                        }

                        // Các kiểu gradient có sẵn từ màu đã chọn
                        // Các kiểu hiệu ứng — phải khác biệt rõ ràng
                        const gradientStyles = [
                          { name: 'Một màu', value: pc, desc: 'Đơn giản, chuyên nghiệp' },
                          {
                            name: 'Ấm dần',
                            value: `linear-gradient(135deg, ${pc}, ${lighten(pc, 0.35)})`,
                            desc: 'Đậm sang sáng'
                          },
                          {
                            name: 'Hoàng hôn',
                            value: `linear-gradient(135deg, ${darken(pc, 0.2)}, ${pc}, ${lighten(pc, 0.4)})`,
                            desc: '3 tông màu mượt'
                          },
                          {
                            name: 'Ánh kim',
                            value: `linear-gradient(135deg, ${pc}, ${lighten(pc, 0.15)}, ${pc})`,
                            desc: 'Lấp lánh, nổi bật'
                          },
                          {
                            name: 'Neon',
                            value: `linear-gradient(135deg, ${darken(pc, 0.3)}, ${lighten(pc, 0.5)})`,
                            desc: 'Tương phản mạnh'
                          }
                        ]

                        return (
                          <div
                            style={{
                              padding: 16,
                              marginTop: 8,
                              border: '1px solid #e2e8f0',
                              borderRadius: 12,
                              background: '#fafafa',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 16
                            }}
                          >
                            {/* Bước 1: Chọn màu */}
                            <div>
                              <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b', marginBottom: 8 }}>
                                Bước 1: Chọn màu chính
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <input
                                  type='color'
                                  value={pc}
                                  onChange={e => applyCustomColor(e.target.value)}
                                  style={{
                                    width: 48,
                                    height: 48,
                                    border: '2px solid #e2e8f0',
                                    borderRadius: 10,
                                    cursor: 'pointer',
                                    padding: 3
                                  }}
                                />
                                <div>
                                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>{pc}</div>
                                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>Nhấn ô màu bên trái để đổi</div>
                                </div>
                              </div>
                            </div>

                            {/* Bước 2: Chọn kiểu hiệu ứng */}
                            <div>
                              <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b', marginBottom: 4 }}>
                                Bước 2: Nút bấm và menu trông như thế nào?
                              </div>
                              <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: 12 }}>
                                Chọn kiểu bạn thích — nhấn vào để xem thay đổi bên dưới
                              </div>
                              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                                {gradientStyles.map(gs => {
                                  const isSelected = branding.primary_gradient === gs.value

                                  return (
                                    <div
                                      key={gs.name}
                                      onClick={() => updateBrandingField('primary_gradient', gs.value)}
                                      style={{
                                        cursor: 'pointer',
                                        borderRadius: 12,
                                        overflow: 'hidden',
                                        width: 130,
                                        border: isSelected ? `2px solid ${pc}` : '2px solid #e2e8f0',
                                        boxShadow: isSelected ? `0 0 0 3px ${pc}22` : 'none',
                                        transition: 'all 0.15s ease',
                                        transform: isSelected ? 'scale(1.03)' : 'scale(1)'
                                      }}
                                    >
                                      {/* Preview: nút mẫu bên trong */}
                                      <div
                                        style={{
                                          padding: 10,
                                          background: '#fff',
                                          display: 'flex',
                                          flexDirection: 'column',
                                          gap: 6,
                                          alignItems: 'center'
                                        }}
                                      >
                                        <div
                                          style={{
                                            width: '100%',
                                            padding: '6px',
                                            borderRadius: 6,
                                            background: gs.value,
                                            color: '#fff',
                                            fontSize: '11px',
                                            fontWeight: 600,
                                            textAlign: 'center'
                                          }}
                                        >
                                          Mua ngay
                                        </div>
                                        <div
                                          style={{ width: '100%', height: 4, borderRadius: 2, background: gs.value }}
                                        />
                                      </div>
                                      <div
                                        style={{
                                          padding: '5px 8px',
                                          textAlign: 'center',
                                          background: isSelected ? `${pc}08` : '#f8fafc',
                                          borderTop: '1px solid #f1f5f9'
                                        }}
                                      >
                                        <div
                                          style={{
                                            fontSize: '11px',
                                            fontWeight: 600,
                                            color: isSelected ? pc : '#475569'
                                          }}
                                        >
                                          {isSelected ? `✓ ${gs.name}` : gs.name}
                                        </div>
                                        <div style={{ fontSize: '10px', color: '#94a3b8' }}>{gs.desc}</div>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          </div>
                        )
                      })()}
                  </div>

                  {/* ── Phần 2: Kết quả preview ── */}
                  <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 20 }}>
                    <h6 style={sectionTitleSx}>Kết quả — những nơi sẽ thay đổi khi bạn lưu</h6>
                    <p style={sectionDescSx}>Bên dưới là giao diện thực tế khách hàng sẽ nhìn thấy</p>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    {/* Preview: Thanh menu — interactive */}
                    <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
                      <div style={{ background: '#f8fafc', padding: '8px 14px', borderBottom: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>Thanh menu</div>
                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>Thử rê chuột vào các mục bên dưới</div>
                      </div>
                      <div style={{ padding: 12 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                          {['Dashboard', 'Mua proxy', 'Đơn hàng'].map((item, i) => (
                            <div
                              key={item}
                              className='preview-menu-item'
                              style={{
                                padding: '7px 10px',
                                borderRadius: 8,
                                fontSize: '12px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                                ...(i === 0 ? { background: pg, color: '#fff' } : { color: '#64748b' })
                              }}
                              onMouseEnter={e => {
                                if (i !== 0) {
                                  ;(e.target as HTMLElement).style.background =
                                    `color-mix(in srgb, ${ph} 10%, transparent)`
                                  ;(e.target as HTMLElement).style.color = ph
                                }
                              }}
                              onMouseLeave={e => {
                                if (i !== 0) {
                                  ;(e.target as HTMLElement).style.background = 'transparent'
                                  ;(e.target as HTMLElement).style.color = '#64748b'
                                }
                              }}
                            >
                              {item} {i === 0 && <span style={{ fontSize: '10px', opacity: 0.7 }}>← đang chọn</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Preview: Sản phẩm — interactive hover card */}
                    <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
                      <div style={{ background: '#f8fafc', padding: '8px 14px', borderBottom: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>Sản phẩm</div>
                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>Thử rê chuột vào card và nút Mua</div>
                      </div>
                      <div style={{ padding: 12 }}>
                        <div
                          style={{
                            border: '1px solid #e2e8f0',
                            borderRadius: 10,
                            padding: 10,
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.borderColor = `color-mix(in srgb, ${ph} 40%, transparent)`
                            e.currentTarget.style.transform = 'translateY(-2px)'
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.borderColor = '#e2e8f0'
                            e.currentTarget.style.transform = 'none'
                            e.currentTarget.style.boxShadow = 'none'
                          }}
                        >
                          <div style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>
                            IPv4 Residential VN
                          </div>
                          <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: 8 }}>
                            Loại IP: Static V4 — VN
                          </div>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              paddingTop: 8,
                              borderTop: '1px solid #f1f5f9'
                            }}
                          >
                            <span style={{ fontSize: '15px', fontWeight: 700, color: ph }}>50,000đ</span>
                            <span
                              style={{
                                padding: '5px 12px',
                                borderRadius: 7,
                                fontSize: '11px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                                background: `color-mix(in srgb, ${ph} 12%, white)`,
                                color: ph,
                                border: `1px solid color-mix(in srgb, ${ph} 30%, transparent)`
                              }}
                              onMouseEnter={e => {
                                ;(e.target as HTMLElement).style.background = ph
                                ;(e.target as HTMLElement).style.color = '#fff'
                                ;(e.target as HTMLElement).style.borderColor = ph
                              }}
                              onMouseLeave={e => {
                                ;(e.target as HTMLElement).style.background = `color-mix(in srgb, ${ph} 12%, white)`
                                ;(e.target as HTMLElement).style.color = ph
                                ;(e.target as HTMLElement).style.borderColor =
                                  `color-mix(in srgb, ${ph} 30%, transparent)`
                              }}
                            >
                              Mua ngay
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Preview: Thanh toán — interactive button */}
                    <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
                      <div style={{ background: '#f8fafc', padding: '8px 14px', borderBottom: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>Xác nhận thanh toán</div>
                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>Thử nhấn nút Thanh Toán</div>
                      </div>
                      <div style={{ padding: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                          <span style={{ fontSize: '12px', color: '#64748b' }}>Tổng cộng:</span>
                          <span style={{ fontSize: '14px', fontWeight: 700, color: ph }}>50,000đ</span>
                        </div>
                        <div
                          style={{
                            padding: '9px',
                            borderRadius: 8,
                            textAlign: 'center',
                            background: pg,
                            color: '#fff',
                            fontSize: '13px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                          onMouseEnter={e => {
                            ;(e.target as HTMLElement).style.opacity = '0.85'
                            ;(e.target as HTMLElement).style.transform = 'translateY(-1px)'
                          }}
                          onMouseLeave={e => {
                            ;(e.target as HTMLElement).style.opacity = '1'
                            ;(e.target as HTMLElement).style.transform = 'none'
                          }}
                          onMouseDown={e => {
                            ;(e.target as HTMLElement).style.transform = 'scale(0.97)'
                          }}
                          onMouseUp={e => {
                            ;(e.target as HTMLElement).style.transform = 'translateY(-1px)'
                          }}
                        >
                          Thanh Toán
                        </div>
                      </div>
                    </div>

                    {/* Preview: Các nút + ngôn ngữ — interactive */}
                    <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
                      <div style={{ background: '#f8fafc', padding: '8px 14px', borderBottom: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>
                          Các nút, viền, ngôn ngữ
                        </div>
                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>Thử rê chuột vào từng nút</div>
                      </div>
                      <div style={{ padding: 12, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                        <span
                          style={{
                            padding: '7px 16px',
                            borderRadius: 8,
                            border: 'none',
                            background: pg,
                            color: '#fff',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                          onMouseEnter={e => {
                            ;(e.target as HTMLElement).style.opacity = '0.85'
                          }}
                          onMouseLeave={e => {
                            ;(e.target as HTMLElement).style.opacity = '1'
                          }}
                        >
                          Nút chính
                        </span>
                        <span
                          style={{
                            padding: '7px 16px',
                            borderRadius: 8,
                            background: 'transparent',
                            color: ph,
                            border: `1px solid ${ph}`,
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                          onMouseEnter={e => {
                            ;(e.target as HTMLElement).style.background = `color-mix(in srgb, ${ph} 8%, transparent)`
                          }}
                          onMouseLeave={e => {
                            ;(e.target as HTMLElement).style.background = 'transparent'
                          }}
                        >
                          Nạp tiền
                        </span>
                        <span
                          style={{
                            padding: '7px 16px',
                            borderRadius: 8,
                            border: `1px solid ${ph}`,
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            color: '#475569'
                          }}
                          onMouseEnter={e => {
                            ;(e.target as HTMLElement).style.borderColor = ph
                            ;(e.target as HTMLElement).style.color = ph
                          }}
                          onMouseLeave={e => {
                            ;(e.target as HTMLElement).style.color = '#475569'
                          }}
                        >
                          🇻🇳 Tiếng Việt ▾
                        </span>
                        <span
                          style={{
                            color: ph,
                            fontSize: '12px',
                            fontWeight: 500,
                            textDecoration: 'underline',
                            cursor: 'pointer'
                          }}
                        >
                          Đường link
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Ghi chú cuối */}
                  <Alert severity='success' sx={{ fontSize: '13px', '& .MuiAlert-message': { fontSize: '13px' } }}>
                    {isPreset
                      ? `Bạn đang chọn bộ màu "${currentPresetName}". Nhấn "Lưu cấu hình" ở trên để áp dụng cho toàn bộ site.`
                      : `Bạn đang dùng màu tự chọn (${pc}). Nhấn "Lưu cấu hình" ở trên để áp dụng.`}
                  </Alert>
                </div>
              )
            })()}

          {/* ═══════════════ Tab 2: SEO ═══════════════ */}
          {activeTab === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <h6 style={sectionTitleSx}>Nội dung hiển thị trên Google</h6>
                <p style={sectionDescSx}>
                  Khi khách tìm kiếm trên Google, họ sẽ thấy <strong>tiêu đề</strong> và <strong>mô tả</strong> bạn nhập
                  ở đây. Mỗi ngôn ngữ cần nhập riêng. Để trống = dùng tên + mô tả ở tab Thương hiệu.
                </p>
              </div>

              {/* Google preview mockup */}
              {(() => {
                const previewLang = SEO_LANGUAGES[seoLangTab]?.code || 'vi'
                const pm = branding.seo_meta?.[previewLang] || {}
                const pTitle =
                  pm.title ||
                  (branding.site_name && branding.site_description
                    ? `${branding.site_name} - ${branding.site_description}`
                    : branding.site_name || 'Tiêu đề site của bạn')
                const pDesc =
                  pm.description ||
                  branding.site_description ||
                  'Mô tả site sẽ hiện ở đây khi khách tìm kiếm trên Google...'

                return (
                  <div
                    style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: '14px 16px', background: '#fff' }}
                  >
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: 8, fontWeight: 600 }}>
                      Xem trước kết quả Google:
                    </div>
                    <div style={{ fontFamily: 'Arial, sans-serif' }}>
                      <div
                        style={{
                          fontSize: '12px',
                          color: '#202124',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          marginBottom: 2
                        }}
                      >
                        {branding.favicon_url && (
                          <img
                            src={resolveUrl(branding.favicon_url)}
                            alt=''
                            style={{ width: 16, height: 16, borderRadius: 99 }}
                          />
                        )}
                        <span>{branding.site_name || 'yoursite.com'}</span>
                      </div>
                      <div
                        style={{
                          fontSize: '18px',
                          color: '#1a0dab',
                          fontWeight: 400,
                          marginBottom: 2,
                          cursor: 'pointer'
                        }}
                      >
                        {pTitle}
                      </div>
                      <div style={{ fontSize: '13px', color: '#4d5156', lineHeight: 1.5 }}>
                        {pDesc.length > 160 ? pDesc.substring(0, 160) + '...' : pDesc}
                      </div>
                    </div>
                    <div
                      style={{
                        fontSize: '10.5px',
                        color: '#94a3b8',
                        marginTop: 8,
                        borderTop: '1px solid #f1f5f9',
                        paddingTop: 6
                      }}
                    >
                      Sau khi lưu, Google cập nhật trong 1-3 ngày. Keywords giúp Google tìm thấy site bạn.
                    </div>
                  </div>
                )
              })()}

              {/* Language sub-tabs */}
              <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs
                  value={seoLangTab}
                  onChange={(_, v) => setSeoLangTab(v)}
                  sx={{
                    minHeight: 36,
                    '& .MuiTab-root': { minHeight: 36, py: 0.5 },
                    '& .MuiTabs-indicator': { height: 2 }
                  }}
                >
                  {SEO_LANGUAGES.map(lang => (
                    <Tab
                      key={lang.code}
                      icon={<Globe size={14} />}
                      iconPosition='start'
                      label={lang.label}
                      sx={{ textTransform: 'none', fontSize: '12px', fontWeight: 500, gap: '4px', minHeight: 36 }}
                    />
                  ))}
                </Tabs>
              </Box>

              {SEO_LANGUAGES.map((lang, langIdx) => {
                if (seoLangTab !== langIdx) return null

                const meta = branding.seo_meta?.[lang.code] || {}
                const seoPlaceholders = getSeoPlaceholders(brandingName)
                const placeholder = seoPlaceholders[lang.code] || seoPlaceholders.en

                return (
                  <div key={lang.code} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <TextField
                      size='small'
                      label={`Title (${lang.label})`}
                      value={meta.title || ''}
                      onChange={e => updateSeoMeta(lang.code, 'title', e.target.value)}
                      placeholder={placeholder.title}
                      fullWidth
                      helperText='Hiển thị trên tab trình duyệt và kết quả Google (50-60 ký tự)'
                    />
                    <TextField
                      size='small'
                      label={`Description (${lang.label})`}
                      value={meta.description || ''}
                      onChange={e => updateSeoMeta(lang.code, 'description', e.target.value)}
                      placeholder={placeholder.description}
                      fullWidth
                      multiline
                      minRows={2}
                      maxRows={4}
                      helperText='Mô tả hiển thị dưới title trên Google (150-160 ký tự)'
                    />
                    <TextField
                      size='small'
                      label={`Keywords (${lang.label})`}
                      value={meta.keywords || ''}
                      onChange={e => updateSeoMeta(lang.code, 'keywords', e.target.value)}
                      placeholder={placeholder.keywords}
                      fullWidth
                      helperText='Các từ khóa cách nhau bằng dấu phẩy'
                    />
                  </div>
                )
              })}

              {/* ── Kết nối Google (gộp từ tab Nâng cao) ── */}
              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 20 }}>
                <h6 style={sectionTitleSx}>
                  Kết nối Google{' '}
                  <span style={{ fontWeight: 400, color: '#94a3b8', fontSize: '12px' }}>
                    (tuỳ chọn — bỏ qua nếu chưa cần)
                  </span>
                </h6>
                <p style={sectionDescSx}>
                  Xác minh chủ site + cài tracking. Không ảnh hưởng hoạt động site nếu để trống.
                </p>
              </div>
              <TextField
                size='small'
                label='Mã xác minh Google Search Console'
                value={branding.google_verification}
                onChange={e => updateBrandingField('google_verification', e.target.value)}
                placeholder='e5EmD9db9R0m8F4FPV9q...'
                fullWidth
                helperText='Chỉ dán phần mã (không dán cả thẻ meta). Lấy từ: Google Search Console → Cài đặt → Xác minh quyền sở hữu → Thẻ HTML → copy phần content'
              />

              {/* GTM */}
              <TextField
                size='small'
                label='Google Tag Manager ID'
                value={branding.gtm_id}
                onChange={e => updateBrandingField('gtm_id', e.target.value)}
                placeholder='GTM-XXXXXXX'
                fullWidth
                helperText='Quản lý tracking (Analytics, Pixel, TikTok...) tập trung. Tạo tại tagmanager.google.com → chọn Web → copy mã GTM-XXX. Không bắt buộc.'
              />

              {/* Thông tin tổ chức đã chuyển sang tab "Hỗ trợ & Liên hệ" */}

              {/* Social links */}
              <div>
                <div style={fieldLabelSx}>Mạng xã hội</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {(branding.social_links || []).map((link, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <FormControl size='small' sx={{ width: 150 }}>
                        <InputLabel>Nền tảng</InputLabel>
                        <Select
                          value={link.platform}
                          label='Nền tảng'
                          onChange={e => updateSocialLink(idx, 'platform', e.target.value)}
                        >
                          {SOCIAL_PLATFORM_OPTIONS.map(opt => (
                            <MenuItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      <TextField
                        size='small'
                        label='URL'
                        value={link.url}
                        onChange={e => updateSocialLink(idx, 'url', e.target.value)}
                        placeholder='https://facebook.com/mktproxy'
                        sx={{ flex: 1 }}
                      />
                      <Tooltip title='Xóa'>
                        <IconButton
                          size='small'
                          onClick={() => removeSocialLink(idx)}
                          sx={{ color: '#94a3b8', '&:hover': { color: '#ef4444', backgroundColor: '#fef2f2' } }}
                        >
                          <Trash2 size={16} />
                        </IconButton>
                      </Tooltip>
                    </div>
                  ))}
                  <Button
                    size='small'
                    variant='outlined'
                    startIcon={<Plus size={16} />}
                    onClick={addSocialLink}
                    sx={{ alignSelf: 'flex-start', textTransform: 'none', fontSize: '13px' }}
                  >
                    Thêm mạng xã hội
                  </Button>
                </div>
              </div>

              {/* Scripts (hide if isChild) */}
              {!isChild && (
                <>
                  <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 20 }}>
                    <h6 style={sectionTitleSx}>Script tùy chỉnh</h6>
                    <p style={sectionDescSx}>Chèn tracking code, CDN link hoặc script bên thứ 3</p>
                  </div>

                  <Alert severity='warning' sx={{ fontSize: '13px', '& .MuiAlert-message': { fontSize: '13px' } }}>
                    Cẩn thận: Script không hợp lệ có thể ảnh hưởng hoạt động site
                  </Alert>

                  <TextField
                    size='small'
                    label='Script chèn vào <head>'
                    value={branding.head_scripts}
                    onChange={e => updateBrandingField('head_scripts', e.target.value)}
                    placeholder='<script src="https://..."></script>'
                    multiline
                    minRows={3}
                    maxRows={8}
                    fullWidth
                    helperText='Dán CDN link hoặc tracking script'
                    slotProps={{ input: { style: { fontFamily: 'monospace', fontSize: '13px' } } }}
                  />
                  <TextField
                    size='small'
                    label='Script chèn vào <body>'
                    value={branding.body_scripts}
                    onChange={e => updateBrandingField('body_scripts', e.target.value)}
                    placeholder='<noscript>...</noscript>'
                    multiline
                    minRows={3}
                    maxRows={8}
                    fullWidth
                    helperText='Thường dùng cho noscript fallback của GTM'
                    slotProps={{ input: { style: { fontFamily: 'monospace', fontSize: '13px' } } }}
                  />
                </>
              )}
            </div>
          )}

          {/* ═══════════════ Tab 3: Hỗ trợ & Liên hệ ═══════════════ */}
          {activeTab === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {/* Tổng quan tab */}
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 10,
                  padding: '12px 16px',
                  fontSize: '12px',
                  color: '#475569',
                  lineHeight: 1.8
                }}
              >
                <strong>Thông tin liên hệ</strong> → hiện ở trang liên hệ + giúp Google hiểu doanh nghiệp (Schema.org)
                <br />
                <strong>Nút liên hệ nhanh</strong> → hiện ở trang chủ (cột phải) +{' '}
                <strong>nút nổi góc phải dưới mọi trang</strong> (Zalo, Telegram...)
                <br />
                <strong>Video hướng dẫn</strong> → hiện ở trang chủ (cột phải), có ảnh thumbnail YouTube
              </div>

              {/* ── Section 1: Thông tin liên hệ ── */}
              <div>
                <h6 style={sectionTitleSx}>Thông tin liên hệ</h6>
                <p style={sectionDescSx}>
                  Hiện ở trang liên hệ + Google hiểu doanh nghiệp bạn (tên, SĐT, email, địa chỉ). Không bắt buộc — để
                  trống nếu chưa cần.
                </p>
              </div>
              <TextField
                size='small'
                label='Liên hệ hỗ trợ nhanh'
                value={branding.support_contact}
                onChange={e => updateBrandingField('support_contact', e.target.value)}
                placeholder='VD: Zalo: 0123456789, Telegram: @mktproxy'
                helperText='Hiển thị ở sidebar trái + footer — dòng text ngắn để khách liên hệ nhanh'
                fullWidth
              />
              <div style={{ display: 'flex', gap: 12 }}>
                <TextField
                  size='small'
                  label='Tên tổ chức / doanh nghiệp'
                  value={branding.organization_name}
                  onChange={e => updateBrandingField('organization_name', e.target.value)}
                  placeholder='VD: Công ty TNHH ABC'
                  helperText='Hiện ở trang liên hệ + Google Schema.org'
                  sx={{ flex: 2 }}
                />
                <TextField
                  size='small'
                  label='Số điện thoại'
                  value={branding.organization_phone}
                  onChange={e => updateBrandingField('organization_phone', e.target.value)}
                  placeholder='VD: 0563072397'
                  helperText='Hiện ở trang liên hệ'
                  sx={{ flex: 1 }}
                />
                <TextField
                  size='small'
                  label='Email liên hệ'
                  value={branding.organization_email}
                  onChange={e => updateBrandingField('organization_email', e.target.value)}
                  placeholder='VD: contact@domain.com'
                  helperText='Hiện ở trang liên hệ'
                  sx={{ flex: 1 }}
                />
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <TextField
                  size='small'
                  label='Địa chỉ'
                  value={branding.organization_address}
                  onChange={e => updateBrandingField('organization_address', e.target.value)}
                  placeholder='VD: 123 Đường ABC, Quận 1, TP.HCM'
                  helperText='Hiện ở trang liên hệ'
                  sx={{ flex: 2 }}
                />
                <TextField
                  size='small'
                  label='Website'
                  value={branding.website_url}
                  onChange={e => updateBrandingField('website_url', e.target.value)}
                  placeholder='VD: https://domain.com'
                  sx={{ flex: 1 }}
                />
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <TextField
                  size='small'
                  label='Giờ làm việc'
                  value={branding.working_hours}
                  onChange={e => updateBrandingField('working_hours', e.target.value)}
                  placeholder='VD: 8:00 - 22:00 (T2-T7)'
                  helperText='Hiện ở trang liên hệ'
                  sx={{ flex: 1 }}
                />
                <TextField
                  size='small'
                  label='Mã số thuế'
                  value={branding.tax_id}
                  onChange={e => updateBrandingField('tax_id', e.target.value)}
                  placeholder='VD: 0123456789'
                  helperText='Hiện ở trang liên hệ'
                  sx={{ flex: 1 }}
                />
              </div>

              {/* ── Section 2: Nút liên hệ sidebar ── */}
              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 20 }}>
                <h6 style={sectionTitleSx}>Nút liên hệ nhanh</h6>
                <p style={sectionDescSx}>
                  Hiển thị ở <strong>2 nơi</strong>: (1) cột phải trang chủ "Bạn cần hỗ trợ?" + (2){' '}
                  <strong>nút nổi góc phải dưới mọi trang</strong>. Thêm link Zalo, Telegram, Facebook... để khách nhấn
                  liên hệ trực tiếp. Không thêm = không hiện.
                </p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {supportLinks.map((link, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <TextField
                      size='small'
                      label='Tên'
                      value={link.label}
                      onChange={e => updateLink(idx, 'label', e.target.value)}
                      placeholder='VD: Chat Zalo'
                      sx={{ flex: 1 }}
                    />
                    <TextField
                      size='small'
                      label='URL'
                      value={link.url}
                      onChange={e => updateLink(idx, 'url', e.target.value)}
                      placeholder='https://zalo.me/0123456789'
                      sx={{ flex: 2 }}
                    />
                    <TextField
                      size='small'
                      select
                      label='Icon'
                      value={link.icon}
                      onChange={e => updateLink(idx, 'icon', e.target.value)}
                      sx={{ width: 120 }}
                      slotProps={{ select: { native: true } }}
                    >
                      {ICON_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </TextField>
                    <TextField
                      size='small'
                      type='color'
                      label='Màu'
                      value={link.color}
                      onChange={e => updateLink(idx, 'color', e.target.value)}
                      sx={{ width: 80 }}
                    />
                    <Tooltip title='Xóa'>
                      <IconButton
                        size='small'
                        onClick={() => setSupportLinks(prev => prev.filter((_, i) => i !== idx))}
                        sx={{ color: '#94a3b8', '&:hover': { color: '#ef4444', backgroundColor: '#fef2f2' } }}
                      >
                        <Trash2 size={16} />
                      </IconButton>
                    </Tooltip>
                  </div>
                ))}
                <Button
                  size='small'
                  variant='outlined'
                  startIcon={<Plus size={16} />}
                  onClick={() => setSupportLinks(prev => [...prev, { ...emptySupportLink }])}
                  sx={{ alignSelf: 'flex-start', textTransform: 'none', fontSize: '13px' }}
                >
                  Thêm liên kết
                </Button>
              </div>

              {/* ── Section 3: Video hướng dẫn ── */}
              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 20 }}>
                <h6 style={sectionTitleSx}>Video hướng dẫn</h6>
                <p style={sectionDescSx}>
                  Hiển thị ở <strong>cột phải trang chủ</strong> (mục "Video hướng dẫn sử dụng") — danh sách video
                  YouTube hướng dẫn khách sử dụng dịch vụ.
                </p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {youtubeVideos.map((video, idx) => {
                  const ytId = video.url?.match(
                    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/))([^?&\s]+)/
                  )?.[1]

                  return (
                    <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      {ytId ? (
                        <img
                          src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`}
                          alt=''
                          style={{
                            width: 128,
                            height: 72,
                            objectFit: 'cover',
                            borderRadius: 6,
                            border: '1px solid #e2e8f0',
                            flexShrink: 0
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: 128,
                            height: 72,
                            borderRadius: 6,
                            border: '1px dashed #cbd5e1',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#94a3b8',
                            fontSize: '10px',
                            flexShrink: 0
                          }}
                        >
                          —
                        </div>
                      )}
                      <TextField
                        size='small'
                        label='Tiêu đề'
                        value={video.title}
                        onChange={e => updateVideo(idx, 'title', e.target.value)}
                        placeholder='VD: Hướng dẫn mua proxy'
                        sx={{ flex: 1 }}
                      />
                      <TextField
                        size='small'
                        label='URL YouTube'
                        value={video.url}
                        onChange={e => updateVideo(idx, 'url', e.target.value)}
                        placeholder='https://youtube.com/watch?v=...'
                        sx={{ flex: 2 }}
                      />
                      <Tooltip title='Xóa'>
                        <IconButton
                          size='small'
                          onClick={() => setYoutubeVideos(prev => prev.filter((_, i) => i !== idx))}
                          sx={{ color: '#94a3b8', '&:hover': { color: '#ef4444', backgroundColor: '#fef2f2' } }}
                        >
                          <Trash2 size={16} />
                        </IconButton>
                      </Tooltip>
                    </div>
                  )
                })}
                <Button
                  size='small'
                  variant='outlined'
                  startIcon={<Plus size={16} />}
                  onClick={() => setYoutubeVideos(prev => [...prev, { ...emptyVideo }])}
                  sx={{ alignSelf: 'flex-start', textTransform: 'none', fontSize: '13px' }}
                >
                  Thêm video
                </Button>
              </div>
            </div>
          )}

          {/* ═══════════════ Tab 5: Sản phẩm ═══════════════ */}
          {activeTab === 4 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div>
                <h6 style={sectionTitleSx}>Hiển thị sản phẩm</h6>
                <p style={sectionDescSx}>Tuỳ chỉnh cách hiển thị sản phẩm trên trang khách hàng</p>
              </div>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: '13px',
                  color: '#475569',
                  cursor: 'pointer'
                }}
              >
                <input
                  type='checkbox'
                  checked={branding.show_product_code !== '0'}
                  onChange={e => updateBrandingField('show_product_code', e.target.checked ? '1' : '0')}
                  style={{ accentColor: 'var(--primary-color, #2092EC)' }}
                />
                Hiện mã sản phẩm (code) dưới tên sản phẩm
              </label>
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 10,
                  padding: '12px 16px',
                  fontSize: '12px',
                  color: '#475569',
                  lineHeight: 1.8
                }}
              >
                <strong>Mã sản phẩm (code)</strong> hiện ở: thẻ sản phẩm trang mua hàng, dưới tên sản phẩm.
                <br />
                Dùng để phân biệt sản phẩm khi có nhiều sản phẩm cùng tên hoặc khi khách liên hệ hỗ trợ.
                <br />
                Tắt nếu không muốn khách thấy mã kỹ thuật.
              </div>
            </div>
          )}

          {/* ═══════════════ Tab 6: Thanh toán ═══════════════ */}
          {activeTab === 5 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {/* ── Section 1: Ngân hàng nhận tiền ── */}
              <div>
                <h6 style={sectionTitleSx}>Ngân hàng nhận tiền</h6>
                <p style={sectionDescSx}>Thông tin ngân hàng hiển thị cho khách khi nạp tiền chuyển khoản</p>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <TextField
                  size='small'
                  select
                  label='Ngân hàng'
                  value={bank.bank_code || ''}
                  onChange={e => {
                    const selected = BANK_LIST.find(b => b.code === e.target.value)

                    if (selected) {
                      setBank(prev => ({ ...prev, bank_name: selected.name, bank_code: selected.code }))
                    }
                  }}
                  required
                  sx={{ flex: 1 }}
                  helperText='Chọn ngân hàng nhận tiền'
                >
                  <MenuItem value=''>
                    <em>— Chọn ngân hàng —</em>
                  </MenuItem>
                  {BANK_LIST.map(b => (
                    <MenuItem key={b.code} value={b.code}>
                      {b.name} ({b.shortName})
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  size='small'
                  label='Số tài khoản'
                  value={bank.bank_number}
                  onChange={e => setBank(prev => ({ ...prev, bank_number: e.target.value }))}
                  placeholder='VD: 1234567890'
                  required
                  sx={{ flex: 1 }}
                  helperText='Số tài khoản ngân hàng nhận tiền'
                />
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <TextField
                  size='small'
                  label='Tên chủ tài khoản'
                  value={bank.bank_account}
                  onChange={e => setBank(prev => ({ ...prev, bank_account: e.target.value }))}
                  placeholder='VD: NGUYEN VAN A'
                  required
                  sx={{ flex: 1 }}
                  helperText='Viết IN HOA, không dấu — đúng như trên thẻ ngân hàng'
                />
              </div>
              <Button
                size='small'
                variant='contained'
                onClick={() => {
                  if (!bank.bank_name || !bank.bank_number || !bank.bank_account) {
                    toast.error('Vui lòng nhập đầy đủ tên ngân hàng, số tài khoản và chủ tài khoản')

                    return
                  }

                  updateBankMutation.mutate(bank, {
                    onSuccess: () => toast.success('Cập nhật ngân hàng thành công'),
                    onError: (error: any) => toast.error(error?.response?.data?.message || 'Có lỗi xảy ra')
                  })
                }}
                disabled={updateBankMutation.isPending}
                startIcon={
                  updateBankMutation.isPending ? <Loader2 size={14} className='animate-spin' /> : <Save size={14} />
                }
                sx={{
                  alignSelf: 'flex-start',
                  textTransform: 'none',
                  fontSize: '13px',
                  color: '#fff',
                  background: 'var(--primary-hover, #e63946)',
                  '&:hover': { opacity: 0.9 }
                }}
              >
                {updateBankMutation.isPending ? 'Đang lưu...' : 'Lưu ngân hàng'}
              </Button>

              {/* ── Section 2: Cài đặt nạp tiền ── */}
              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 20 }}>
                <h6 style={sectionTitleSx}>Cài đặt nạp tiền</h6>
                <p style={sectionDescSx}>
                  Số tiền tối thiểu, mệnh giá gợi ý và thông báo khi khách tạo hoá đơn nạp tiền
                </p>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <TextField
                  size='small'
                  label='Số tiền tối thiểu (đ)'
                  value={branding.deposit_min_amount || ''}
                  onChange={e => updateBrandingField('deposit_min_amount', e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder='VD: 2000'
                  sx={{ flex: 1 }}
                  helperText='Khách không thể nạp dưới số này. Để trống = 2.000đ'
                />
              </div>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: '13px',
                  color: '#475569',
                  cursor: 'pointer'
                }}
              >
                <input
                  type='checkbox'
                  checked={branding.deposit_notify_telegram === '1' || branding.deposit_notify_telegram === 'true'}
                  onChange={e => updateBrandingField('deposit_notify_telegram', e.target.checked ? '1' : '0')}
                  style={{ accentColor: 'var(--primary-color, #2092EC)' }}
                />
                Gửi thông báo Telegram khi khách tạo hoá đơn nạp tiền
              </label>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 500, color: '#475569', marginBottom: 8 }}>
                  Mệnh giá gợi ý (khách click nhanh)
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                  {(branding.deposit_preset_amounts || []).map((amt: number, idx: number) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '4px 10px',
                        borderRadius: 6,
                        border: '1px solid #e2e8f0',
                        background: '#f8fafc'
                      }}
                    >
                      <span style={{ fontSize: '13px' }}>{Number(amt).toLocaleString('vi-VN')}đ</span>
                      <IconButton
                        size='small'
                        onClick={() => {
                          const updated = (branding.deposit_preset_amounts || []).filter(
                            (_: number, i: number) => i !== idx
                          )
                          updateBrandingField('deposit_preset_amounts', updated)
                        }}
                        sx={{ padding: '2px' }}
                      >
                        <Trash2 size={12} color='#ef4444' />
                      </IconButton>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <TextField
                    size='small'
                    placeholder='Nhập mệnh giá (VD: 50000)'
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        const input = e.target as HTMLInputElement
                        const val = parseInt(input.value.replace(/[^0-9]/g, ''))
                        if (val > 0) {
                          const current = branding.deposit_preset_amounts || []
                          if (!current.includes(val)) {
                            updateBrandingField(
                              'deposit_preset_amounts',
                              [...current, val].sort((a: number, b: number) => a - b)
                            )
                          }
                          input.value = ''
                        }
                      }
                    }}
                    sx={{ width: 200 }}
                    helperText='Nhập số rồi Enter để thêm'
                  />
                </div>
              </div>

              {/* ── Section 3: Pay2s ── */}
              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 20 }}>
                <h6 style={sectionTitleSx}>Pay2s (nạp tiền tự động)</h6>
                <p style={sectionDescSx}>
                  Token xác thực webhook từ pay2s.vn. Khi có giao dịch ngân hàng, pay2s gửi thông báo &rarr; hệ thống tự
                  cộng tiền.
                </p>
              </div>
              <TextField
                size='small'
                label='Pay2s Webhook Token'
                value={branding.pay2s_webhook_token}
                onChange={e => updateBrandingField('pay2s_webhook_token', e.target.value)}
                placeholder='token từ pay2s.vn'
                fullWidth
                helperText='Lấy token từ trang quản trị pay2s.vn > Cài đặt webhook'
              />

              {/* ── Section 3: Telegram thông báo ── */}
              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 20 }}>
                <h6 style={sectionTitleSx}>Telegram thông báo</h6>
                <p style={sectionDescSx}>Cấu hình bot Telegram để nhận thông báo tự động theo từng kênh</p>
              </div>

              {/* System channel */}
              <div
                style={{
                  padding: 16,
                  border: '1px solid #e2e8f0',
                  borderRadius: 10,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12
                }}
              >
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>Kênh Hệ thống</div>
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>Thông báo hệ thống: đơn hàng mới, lỗi xử lý</div>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <TextField
                    size='small'
                    label='Bot Token'
                    value={branding.telegram_bot_token_system}
                    onChange={e => updateBrandingField('telegram_bot_token_system', e.target.value)}
                    placeholder='123456:ABC-DEF...'
                    sx={{ flex: 2 }}
                  />
                  <TextField
                    size='small'
                    label='Chat ID'
                    value={branding.telegram_chat_id_system}
                    onChange={e => updateBrandingField('telegram_chat_id_system', e.target.value)}
                    placeholder='-1001234567890'
                    sx={{ flex: 1 }}
                  />
                </div>
              </div>

              {/* Deposit channel */}
              <div
                style={{
                  padding: 16,
                  border: '1px solid #e2e8f0',
                  borderRadius: 10,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>Kênh Nạp tiền</div>
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        fontSize: '12px',
                        color: '#64748b',
                        cursor: 'pointer'
                      }}
                    >
                      <input
                        type='checkbox'
                        checked={
                          branding.deposit_notify_telegram === '1' || branding.deposit_notify_telegram === 'true'
                        }
                        onChange={e => updateBrandingField('deposit_notify_telegram', e.target.checked ? '1' : '0')}
                        style={{ accentColor: 'var(--primary-color, #2092EC)' }}
                      />
                      Gửi thông báo khi khách tạo bill nạp tiền
                    </label>
                  </div>
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                    Thông báo nạp tiền: khi khách tạo hoá đơn hoặc chuyển khoản thành công
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <TextField
                    size='small'
                    label='Bot Token'
                    value={branding.telegram_bot_token_deposit}
                    onChange={e => updateBrandingField('telegram_bot_token_deposit', e.target.value)}
                    placeholder='123456:ABC-DEF...'
                    sx={{ flex: 2 }}
                  />
                  <TextField
                    size='small'
                    label='Chat ID'
                    value={branding.telegram_chat_id_deposit}
                    onChange={e => updateBrandingField('telegram_chat_id_deposit', e.target.value)}
                    placeholder='-1001234567890'
                    sx={{ flex: 1 }}
                  />
                </div>
              </div>

              {/* Error channel */}
              <div
                style={{
                  padding: 16,
                  border: '1px solid #e2e8f0',
                  borderRadius: 10,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12
                }}
              >
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>Kênh Lỗi</div>
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                    Thông báo lỗi: khi có lỗi API, lỗi xử lý đơn hàng
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <TextField
                    size='small'
                    label='Bot Token'
                    value={branding.telegram_bot_token_error}
                    onChange={e => updateBrandingField('telegram_bot_token_error', e.target.value)}
                    placeholder='123456:ABC-DEF...'
                    sx={{ flex: 2 }}
                  />
                  <TextField
                    size='small'
                    label='Chat ID'
                    value={branding.telegram_chat_id_error}
                    onChange={e => updateBrandingField('telegram_chat_id_error', e.target.value)}
                    placeholder='-1001234567890'
                    sx={{ flex: 1 }}
                  />
                </div>
              </div>

              <Alert severity='info' sx={{ fontSize: '13px', '& .MuiAlert-message': { fontSize: '13px' } }}>
                Pay2s và Telegram lưu cùng nút &quot;Lưu cấu hình&quot; ở trên cùng. Ngân hàng lưu riêng bằng nút
                &quot;Lưu ngân hàng&quot;.
              </Alert>
            </div>
          )}

          {/* ═══════════════ Tab 6: Nhà cung cấp (only if isChild) ═══════════════ */}
          {isChild && activeTab === 6 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <h6 style={sectionTitleSx}>Kết nối nhà cung cấp (site mẹ)</h6>
                <p style={sectionDescSx}>
                  Thay đổi API credentials kết nối đến site mẹ.{' '}
                  {supplierData?.configured ? 'Đã cấu hình.' : 'Chưa cấu hình — vui lòng nhập thông tin bên dưới.'}
                </p>
              </div>
              <TextField
                size='small'
                label='Supplier API URL'
                value={supplier.provider_api_url}
                onChange={e => setSupplier(prev => ({ ...prev, provider_api_url: e.target.value }))}
                placeholder='https://app.mktproxy.com/api'
                fullWidth
              />
              <TextField
                size='small'
                label='API Key'
                value={supplier.provider_api_key}
                onChange={e => setSupplier(prev => ({ ...prev, provider_api_key: e.target.value }))}
                placeholder='mkt_xxxxx'
                fullWidth
              />
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <Button
                  size='small'
                  variant='contained'
                  onClick={() => {
                    if (!supplier.provider_api_url || !supplier.provider_api_key) {
                      toast.error('Vui lòng nhập đầy đủ URL và API Key')

                      return
                    }

                    setSupplierTestResult(null)
                    updateSupplierMutation.mutate(supplier, {
                      onSuccess: data => {
                        toast.success(data?.message || 'Cập nhật thành công')
                        setSupplierTestResult(data?.test)
                      },
                      onError: (error: any) => {
                        toast.error(error?.response?.data?.message || 'Có lỗi xảy ra')
                      }
                    })
                  }}
                  disabled={updateSupplierMutation.isPending}
                  startIcon={
                    updateSupplierMutation.isPending ? (
                      <Loader2 size={14} className='animate-spin' />
                    ) : (
                      <Save size={14} />
                    )
                  }
                  sx={{ textTransform: 'none', fontSize: '13px', color: '#fff' }}
                >
                  {updateSupplierMutation.isPending ? 'Đang lưu...' : 'Lưu & Test kết nối'}
                </Button>
                {supplierTestResult && (
                  <span
                    style={{
                      fontSize: '13px',
                      color: supplierTestResult.connected ? '#059669' : '#dc2626',
                      fontWeight: 500
                    }}
                  >
                    {supplierTestResult.connected
                      ? `Kết nối OK — Số dư: ${new Intl.NumberFormat('vi-VN').format(supplierTestResult.balance)}đ`
                      : `Lỗi kết nối: ${supplierTestResult.error}`}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* ═══════════════ Tab Landing Page ═══════════════ */}
          {activeTab === availableTabs.findIndex(t => t.label === 'Landing Page') && activeTab >= 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div style={{ background: '#f8fafc', borderRadius: 12, padding: 20, border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>
                  Giá 3 gói trên Landing Page
                </div>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 16 }}>
                  Sửa giá hiển thị cho 3 gói Viettel / FPT / VNPT. Cache SSR 5 phút.
                </div>
                {['viettel', 'fpt', 'vnpt'].map(key => {
                  const label = key === 'viettel' ? 'Viettel Proxy' : key === 'fpt' ? 'FPT Proxy' : 'VNPT Proxy'
                  const currentVal = (branding.landing_pricing as any)?.[key] || {}
                  const periodObj = typeof currentVal.period === 'object' && currentVal.period ? currentVal.period : {}

                  return (
                    <div
                      key={key}
                      style={{
                        marginBottom: 16,
                        padding: 12,
                        background: '#fff',
                        borderRadius: 8,
                        border: '1px solid #e2e8f0'
                      }}
                    >
                      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8, color: '#334155' }}>{label}</div>
                      {/* Row 1: Giá */}
                      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 8 }}>
                        <TextField
                          size='small'
                          label='Giá bán'
                          placeholder='18.000'
                          value={currentVal.price || ''}
                          onChange={e =>
                            setBranding(prev => ({
                              ...prev,
                              landing_pricing: {
                                ...(prev.landing_pricing || {}),
                                [key]: { ...(prev.landing_pricing as any)?.[key], price: e.target.value }
                              }
                            }))
                          }
                          sx={{ width: 120 }}
                        />
                        <TextField
                          size='small'
                          label='Giá gốc'
                          placeholder='25.000'
                          value={currentVal.originalPrice || ''}
                          onChange={e =>
                            setBranding(prev => ({
                              ...prev,
                              landing_pricing: {
                                ...(prev.landing_pricing || {}),
                                [key]: { ...(prev.landing_pricing as any)?.[key], originalPrice: e.target.value }
                              }
                            }))
                          }
                          sx={{ width: 120 }}
                        />
                        <TextField
                          size='small'
                          label='Giảm giá'
                          placeholder='28%'
                          value={currentVal.discount || ''}
                          onChange={e =>
                            setBranding(prev => ({
                              ...prev,
                              landing_pricing: {
                                ...(prev.landing_pricing || {}),
                                [key]: { ...(prev.landing_pricing as any)?.[key], discount: e.target.value }
                              }
                            }))
                          }
                          sx={{ width: 100 }}
                        />
                      </div>
                      {/* Row 2: Thời hạn per locale */}
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>
                          Thời hạn hiển thị:
                        </span>
                        {[
                          { code: 'vi', label: 'Tiếng Việt', placeholder: '1 tháng' },
                          { code: 'en', label: 'English', placeholder: '1 month' },
                          { code: 'cn', label: '中文', placeholder: '1个月' },
                          { code: 'ko', label: '한국어', placeholder: '1개월' },
                          { code: 'ja', label: '日本語', placeholder: '1ヶ月' }
                        ].map(lang => (
                          <TextField
                            key={lang.code}
                            size='small'
                            label={lang.label}
                            placeholder={lang.placeholder}
                            value={(periodObj as any)[lang.code] || ''}
                            onChange={e =>
                              setBranding(prev => {
                                const prevItem = (prev.landing_pricing as any)?.[key] || {}
                                const prevPeriod =
                                  typeof prevItem.period === 'object' && prevItem.period ? prevItem.period : {}

                                return {
                                  ...prev,
                                  landing_pricing: {
                                    ...(prev.landing_pricing || {}),
                                    [key]: { ...prevItem, period: { ...prevPeriod, [lang.code]: e.target.value } }
                                  }
                                }
                              })
                            }
                            sx={{ width: 110 }}
                          />
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ═══════════════ Tab Cài đặt chung ═══════════════ */}
          {activeTab === availableTabs.findIndex(t => t.label === 'Cài đặt chung') && activeTab >= 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {/* Affiliate */}
              <div style={{ background: '#f0fdf4', borderRadius: 12, padding: 20, border: '1px solid #bbf7d0' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#166534', marginBottom: 4 }}>
                  Hoa hồng Affiliate
                </div>
                <div style={{ fontSize: 12, color: '#4ade80', marginBottom: 16 }}>
                  Tỷ lệ hoa hồng cho người giới thiệu. Áp dụng chung cho tất cả user.
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <span style={{ width: 160, fontSize: 13, color: '#64748b' }}>Hoa hồng mặc định</span>
                  <TextField
                    size='small'
                    type='number'
                    value={affiliatePercent}
                    onChange={e => {
                      const v = Math.max(0, Math.min(100, parseInt(e.target.value) || 0))
                      setAffiliatePercent(v)
                    }}
                    slotProps={{ input: { endAdornment: <span style={{ color: '#94a3b8', fontSize: 13 }}>%</span> } }}
                    sx={{ width: 120 }}
                  />
                </div>
              </div>

              <div style={{ background: '#f8fafc', borderRadius: 12, padding: 20, border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>Tên menu sidebar</div>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 16 }}>
                  Đổi tên hiển thị các mục menu. Bỏ trống = giữ mặc định. Cache SSR 5 phút.
                </div>
                {[
                  { key: 'home', label: 'Trang chủ', defaultVal: 'Trang chủ' },
                  { key: 'products', label: 'Sản phẩm', defaultVal: 'Sản phẩm' },
                  { key: 'finance', label: 'Tài chính', defaultVal: 'Tài chính' },
                  { key: 'earn', label: 'Kiếm tiền', defaultVal: 'Kiếm tiền' },
                  { key: 'support', label: 'Hỗ trợ', defaultVal: 'Hỗ trợ' },
                  { key: 'admin', label: 'Quản trị', defaultVal: 'Quản trị' }
                ].map(item => (
                  <div key={item.key} style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 10 }}>
                    <span style={{ width: 80, fontSize: 13, color: '#64748b' }}>{item.defaultVal}</span>
                    <TextField
                      size='small'
                      placeholder={item.defaultVal}
                      value={(branding.menu_labels as any)?.[item.key] || ''}
                      onChange={e =>
                        setBranding(prev => ({
                          ...prev,
                          menu_labels: {
                            ...(prev.menu_labels || {}),
                            [item.key]: e.target.value
                          }
                        }))
                      }
                      sx={{ width: 200 }}
                    />
                  </div>
                ))}
              </div>

              {/* Cloudflare Turnstile */}
              <div style={{ background: '#eff6ff', borderRadius: 12, padding: 20, border: '1px solid #bfdbfe' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <Shield size={16} color='#2563eb' />
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#1e40af' }}>Cloudflare Turnstile</div>
                </div>
                <div style={{ fontSize: 12, color: '#60a5fa', marginBottom: 16 }}>
                  Chống bot cho trang đăng nhập & đăng ký. Lấy key tại{' '}
                  <a
                    href='https://dash.cloudflare.com/?to=/:account/turnstile'
                    target='_blank'
                    rel='noopener noreferrer'
                    style={{ color: '#2563eb', textDecoration: 'underline' }}
                  >
                    Cloudflare Dashboard
                  </a>
                  .
                </div>

                <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
                  <span style={{ width: 160, fontSize: 13, color: '#64748b' }}>Bật Turnstile</span>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input
                      type='checkbox'
                      checked={branding.turnstile_enabled === 'true'}
                      onChange={e => updateBrandingField('turnstile_enabled', e.target.checked ? 'true' : 'false')}
                      style={{ width: 18, height: 18, accentColor: '#2563eb' }}
                    />
                    <span
                      style={{ fontSize: 13, color: branding.turnstile_enabled === 'true' ? '#16a34a' : '#94a3b8' }}
                    >
                      {branding.turnstile_enabled === 'true' ? 'Đang bật' : 'Đang tắt'}
                    </span>
                  </label>
                </div>

                <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
                  <span style={{ width: 160, fontSize: 13, color: '#64748b' }}>Site Key</span>
                  <TextField
                    size='small'
                    placeholder='0x4AAAAAAA...'
                    value={branding.turnstile_site_key || ''}
                    onChange={e => updateBrandingField('turnstile_site_key', e.target.value)}
                    sx={{ flex: 1, maxWidth: 400 }}
                  />
                </div>

                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <span style={{ width: 160, fontSize: 13, color: '#64748b' }}>Secret Key</span>
                  <TextField
                    size='small'
                    type='password'
                    placeholder='0x4AAAAAAA...'
                    value={(branding as any).turnstile_secret_key || ''}
                    onChange={e => updateBrandingField('turnstile_secret_key' as any, e.target.value)}
                    sx={{ flex: 1, maxWidth: 400 }}
                  />
                </div>

                {branding.turnstile_enabled === 'true' && !branding.turnstile_site_key && (
                  <Alert severity='warning' sx={{ mt: 2, fontSize: 12 }}>
                    Turnstile đã bật nhưng chưa nhập Site Key. Widget sẽ không hiển thị trên form đăng nhập/đăng ký.
                  </Alert>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
