'use client'

import { TextField, Tabs, Tab, IconButton, Tooltip, MenuItem, Box, FormControl, InputLabel, Select, Button, Alert } from '@mui/material'
import { Plus, Trash2, Code, Globe, Info } from 'lucide-react'

import type { BrandingSettings, SeoMeta, SocialLink } from '@/hooks/apis/useBrandingSettings'
import { sectionTitleSx, sectionDescSx, fieldLabelSx } from './shared'

// ── Constants ────────────────────────────────────────────────────────────────

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

// ── Types ────────────────────────────────────────────────────────────────────

interface TabSeoProps {
  branding: BrandingSettings
  updateBrandingField: (field: keyof BrandingSettings, value: any) => void
  updateSeoMeta: (lang: string, field: keyof SeoMeta, value: string) => void
  updateSocialLink: (idx: number, field: keyof SocialLink, value: string) => void
  addSocialLink: () => void
  removeSocialLink: (idx: number) => void
  seoLangTab: number
  setSeoLangTab: (tab: number) => void
  brandingName: string
  isChild: boolean
  resolveUrl: (path: string | null | undefined) => string
}

// ── Component ────────────────────────────────────────────────────────────────

const TabSeo = ({
  branding,
  updateBrandingField,
  updateSeoMeta,
  updateSocialLink,
  addSocialLink,
  removeSocialLink,
  seoLangTab,
  setSeoLangTab,
  brandingName,
  isChild,
  resolveUrl
}: TabSeoProps) => {
  return (
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
  )
}

export default TabSeo
