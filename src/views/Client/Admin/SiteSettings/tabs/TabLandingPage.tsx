'use client'

import React from 'react'
import {
  TextField,
  Button,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material'
import { Plus, Trash2, Eye } from 'lucide-react'
import type { BrandingSettings } from './shared'
import { sectionTitleSx, sectionDescSx } from './shared'

interface TabLandingPageProps {
  branding: BrandingSettings
  updateBrandingField: (field: keyof BrandingSettings, value: any) => void
  setBranding: React.Dispatch<React.SetStateAction<BrandingSettings>>
}

export default function TabLandingPage({ branding, updateBrandingField, setBranding }: TabLandingPageProps) {
  const handlePreview = () => {
    sessionStorage.setItem('landing_preview', JSON.stringify({
      landing_hero: branding.landing_hero,
      landing_pricing: branding.landing_pricing
    }))

    window.open(`/${document.documentElement.lang || 'vi'}?preview=1`, '_blank')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Preview button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant='outlined'
          size='small'
          startIcon={<Eye size={14} />}
          onClick={handlePreview}
          sx={{
            textTransform: 'none',
            fontSize: '13px',
            fontWeight: 600,
            borderColor: '#6366f1',
            color: '#6366f1',
            '&:hover': { borderColor: '#4f46e5', bgcolor: '#eef2ff' }
          }}
        >
          Xem trước Landing Page
        </Button>
      </div>

      {/* ── Hero Section ── */}
      <div style={{ background: '#f8fafc', borderRadius: 12, padding: 20, border: '1px solid #e2e8f0' }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>
          Nội dung Hero Banner
        </div>
        <div style={{ fontSize: 12, color: '#64748b', marginBottom: 16 }}>
          Tiêu đề, mô tả, tính năng nổi bật, nút CTA và chỉ số tin cậy trên trang chủ.
        </div>

        {/* Title line 1 & 2 */}
        {(['title_line1', 'title_line2'] as const).map((field, fi) => (
          <div key={field} style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 2 }}>
              Tiêu đề dòng {fi + 1}
            </div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 6 }}>
              {fi === 0
                ? 'Dòng chữ lớn đầu tiên trên Hero banner — thường là tên thương hiệu hoặc slogan chính'
                : 'Dòng chữ highlight phía dưới — thường là điểm nhấn dịch vụ'}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[
                { code: 'vi', label: 'Tiếng Việt', ph: fi === 0 ? 'Proxy Việt Nam' : 'Chất Lượng Cao' },
                { code: 'en', label: 'English', ph: fi === 0 ? 'Vietnam Proxy' : 'High Quality' }
              ].map(lang => (
                <TextField
                  key={lang.code}
                  size='small'
                  label={lang.label}
                  placeholder={lang.ph}
                  value={(branding.landing_hero as any)?.[field]?.[lang.code] || ''}
                  onChange={e =>
                    setBranding(prev => {
                      const hero = { ...(prev.landing_hero || {}) } as any

                      hero[field] = { ...(hero[field] || {}), [lang.code]: e.target.value }

                      return { ...prev, landing_hero: hero }
                    })
                  }
                  sx={{ flex: 1, minWidth: 200 }}
                />
              ))}
            </div>
          </div>
        ))}

        {/* Subtitle */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 2 }}>Mô tả ngắn</div>
          <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 6 }}>
            Đoạn văn ngắn bên dưới tiêu đề, giới thiệu tổng quan dịch vụ cho khách hàng mới
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[
              { code: 'vi', label: 'Tiếng Việt', ph: 'Dịch vụ proxy uy tín, tốc độ cao...' },
              { code: 'en', label: 'English', ph: 'Reliable, high-speed proxy service...' }
            ].map(lang => (
              <TextField
                key={lang.code}
                size='small'
                label={lang.label}
                placeholder={lang.ph}
                value={(branding.landing_hero as any)?.subtitle?.[lang.code] || ''}
                onChange={e =>
                  setBranding(prev => {
                    const hero = { ...(prev.landing_hero || {}) } as any

                    hero.subtitle = { ...(hero.subtitle || {}), [lang.code]: e.target.value }

                    return { ...prev, landing_hero: hero }
                  })
                }
                multiline
                minRows={2}
                sx={{ flex: 1, minWidth: 200 }}
              />
            ))}
          </div>
        </div>

        {/* Features */}
        <div style={{ marginBottom: 12 }}>
          <div
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}
          >
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Tính năng nổi bật</div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>
                4 icon + text hiện bên dưới mô tả (VD: "190+ quốc gia", "Tốc độ cao"...)
              </div>
            </div>
            <Button
              size='small'
              startIcon={<Plus size={14} />}
              onClick={() =>
                setBranding(prev => {
                  const hero = { ...(prev.landing_hero || {}) } as any
                  const features = [...(hero.features || [])]

                  features.push({ icon: 'globe', text: {} })
                  hero.features = features

                  return { ...prev, landing_hero: hero }
                })
              }
              sx={{ fontSize: 12, textTransform: 'none' }}
            >
              Thêm
            </Button>
          </div>
          {((branding.landing_hero as any)?.features || []).map((feat: any, idx: number) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                gap: 8,
                alignItems: 'center',
                marginBottom: 8,
                padding: 8,
                background: '#fff',
                borderRadius: 8,
                border: '1px solid #e2e8f0'
              }}
            >
              <FormControl size='small' sx={{ width: 110 }}>
                <InputLabel sx={{ fontSize: 13 }}>Icon</InputLabel>
                <Select
                  value={feat.icon || 'globe'}
                  label='Icon'
                  onChange={e =>
                    setBranding(prev => {
                      const hero = { ...(prev.landing_hero || {}) } as any
                      const features = [...(hero.features || [])]

                      features[idx] = { ...features[idx], icon: e.target.value }
                      hero.features = features

                      return { ...prev, landing_hero: hero }
                    })
                  }
                  sx={{ fontSize: 13 }}
                >
                  {[
                    { value: 'globe', label: 'Globe' },
                    { value: 'zap', label: 'Zap' },
                    { value: 'shield', label: 'Shield' },
                    { value: 'users', label: 'Users' },
                    { value: 'clock', label: 'Clock' },
                    { value: 'star', label: 'Star' }
                  ].map(opt => (
                    <MenuItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              {[
                { code: 'vi', label: 'Text (VI)', ph: 'VD: 190+ quốc gia' },
                { code: 'en', label: 'Text (EN)', ph: 'e.g. 190+ countries' }
              ].map(lang => (
                <TextField
                  key={lang.code}
                  size='small'
                  label={lang.label}
                  placeholder={lang.ph}
                  value={feat.text?.[lang.code] || ''}
                  onChange={e =>
                    setBranding(prev => {
                      const hero = { ...(prev.landing_hero || {}) } as any
                      const features = [...(hero.features || [])]

                      features[idx] = {
                        ...features[idx],
                        text: { ...(features[idx].text || {}), [lang.code]: e.target.value }
                      }
                      hero.features = features

                      return { ...prev, landing_hero: hero }
                    })
                  }
                  sx={{ flex: 1, minWidth: 140 }}
                />
              ))}
              <IconButton
                size='small'
                color='error'
                onClick={() =>
                  setBranding(prev => {
                    const hero = { ...(prev.landing_hero || {}) } as any

                    hero.features = (hero.features || []).filter((_: any, i: number) => i !== idx)

                    return { ...prev, landing_hero: hero }
                  })
                }
              >
                <Trash2 size={14} />
              </IconButton>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 2 }}>Nút CTA (Call to Action)</div>
          <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 6 }}>
            Nút hành động chính trên Hero — text hiển thị trên nút + link khi click (VD: /proxy-tinh, /proxy-rotate)
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            {[
              { code: 'vi', ph: 'Mua ngay' },
              { code: 'en', ph: 'Buy Now' }
            ].map(lang => (
              <TextField
                key={lang.code}
                size='small'
                label={`Text (${lang.code.toUpperCase()})`}
                placeholder={lang.ph}
                value={(branding.landing_hero as any)?.cta_text?.[lang.code] || ''}
                onChange={e =>
                  setBranding(prev => {
                    const hero = { ...(prev.landing_hero || {}) } as any

                    hero.cta_text = { ...(hero.cta_text || {}), [lang.code]: e.target.value }

                    return { ...prev, landing_hero: hero }
                  })
                }
                sx={{ width: 160 }}
              />
            ))}
            <TextField
              size='small'
              label='Link'
              placeholder='/proxy-tinh'
              value={(branding.landing_hero as any)?.cta_link || ''}
              onChange={e =>
                setBranding(prev => {
                  const hero = { ...(prev.landing_hero || {}) } as any

                  hero.cta_link = e.target.value

                  return { ...prev, landing_hero: hero }
                })
              }
              sx={{ width: 200 }}
            />
          </div>
        </div>

        {/* Trust Indicators */}
        <div>
          <div
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}
          >
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Chỉ số tin cậy</div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>
                Dãy số ấn tượng phía dưới nút CTA (VD: "5000+ Khách hàng", "99.9% Uptime", "24/7 Hỗ trợ")
              </div>
            </div>
            <Button
              size='small'
              startIcon={<Plus size={14} />}
              onClick={() =>
                setBranding(prev => {
                  const hero = { ...(prev.landing_hero || {}) } as any
                  const items = [...(hero.trust_items || [])]

                  items.push({ number: '', label: {} })
                  hero.trust_items = items

                  return { ...prev, landing_hero: hero }
                })
              }
              sx={{ fontSize: 12, textTransform: 'none' }}
            >
              Thêm
            </Button>
          </div>
          {((branding.landing_hero as any)?.trust_items || []).map((item: any, idx: number) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                gap: 8,
                alignItems: 'center',
                marginBottom: 8,
                padding: 8,
                background: '#fff',
                borderRadius: 8,
                border: '1px solid #e2e8f0'
              }}
            >
              <TextField
                size='small'
                label='Số'
                placeholder='5000+'
                value={item.number || ''}
                onChange={e =>
                  setBranding(prev => {
                    const hero = { ...(prev.landing_hero || {}) } as any
                    const items = [...(hero.trust_items || [])]

                    items[idx] = { ...items[idx], number: e.target.value }
                    hero.trust_items = items

                    return { ...prev, landing_hero: hero }
                  })
                }
                sx={{ width: 100 }}
              />
              {[
                { code: 'vi', label: 'Nhãn (VI)', ph: 'VD: Khách hàng' },
                { code: 'en', label: 'Label (EN)', ph: 'e.g. Customers' }
              ].map(lang => (
                <TextField
                  key={lang.code}
                  size='small'
                  label={lang.label}
                  placeholder={lang.ph}
                  value={item.label?.[lang.code] || ''}
                  onChange={e =>
                    setBranding(prev => {
                      const hero = { ...(prev.landing_hero || {}) } as any
                      const items = [...(hero.trust_items || [])]

                      items[idx] = {
                        ...items[idx],
                        label: { ...(items[idx].label || {}), [lang.code]: e.target.value }
                      }
                      hero.trust_items = items

                      return { ...prev, landing_hero: hero }
                    })
                  }
                  sx={{ flex: 1, minWidth: 140 }}
                />
              ))}
              <IconButton
                size='small'
                color='error'
                onClick={() =>
                  setBranding(prev => {
                    const hero = { ...(prev.landing_hero || {}) } as any

                    hero.trust_items = (hero.trust_items || []).filter((_: any, i: number) => i !== idx)

                    return { ...prev, landing_hero: hero }
                  })
                }
              >
                <Trash2 size={14} />
              </IconButton>
            </div>
          ))}
        </div>
      </div>

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
  )
}
