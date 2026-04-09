'use client'

import React from 'react'
import Alert from '@mui/material/Alert'
import type { BrandingSettings } from '@/hooks/apis/useBrandingSettings'
import { sectionTitleSx, sectionDescSx } from './shared'

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

interface TabColorsProps {
  branding: BrandingSettings
  updateBrandingField: (field: keyof BrandingSettings, value: any) => void
  setBranding: React.Dispatch<React.SetStateAction<BrandingSettings>>
  colorMode: 'preset' | 'custom'
  setColorMode: (mode: 'preset' | 'custom') => void
}

const TabColors = ({ branding, updateBrandingField, setBranding, colorMode, setColorMode }: TabColorsProps) => {
  const applyColorPreset = (preset: (typeof COLOR_PRESETS)[0]) => {
    setBranding(prev => ({
      ...prev,
      primary_color: preset.primary,
      primary_hover: preset.hover,
      primary_gradient: preset.gradient
    }))
  }

  const pc = branding.primary_color || '#FC4336'
  const ph = branding.primary_hover || '#e63946'
  const pg = branding.primary_gradient || 'linear-gradient(45deg, #FC4336, #F88A4B)'
  const isPreset = COLOR_PRESETS.some(
    p => branding.primary_color === p.primary && branding.primary_gradient === p.gradient
  )
  const currentPresetName = COLOR_PRESETS.find(p => branding.primary_color === p.primary)?.name

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

        {colorMode === 'custom' && (
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
        )}
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
              Tiếng Việt ▾
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
}

export default TabColors
