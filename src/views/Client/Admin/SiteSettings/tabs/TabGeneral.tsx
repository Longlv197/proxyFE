'use client'

import React from 'react'
import { TextField, Alert } from '@mui/material'
import { Shield } from 'lucide-react'
import type { BrandingSettings } from './shared'

interface TabGeneralProps {
  branding: BrandingSettings
  updateBrandingField: (field: keyof BrandingSettings, value: any) => void
  affiliatePercent: number
  setAffiliatePercent: (v: number) => void
  setBranding: React.Dispatch<React.SetStateAction<BrandingSettings>>
}

export default function TabGeneral({
  branding,
  updateBrandingField,
  affiliatePercent,
  setAffiliatePercent,
  setBranding
}: TabGeneralProps) {
  return (
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

        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
          <span style={{ width: 160, fontSize: 13, color: '#64748b' }}>Secret Key</span>
          <TextField
            size='small'
            placeholder='0x4AAAAAAA...'
            value={(branding as any).turnstile_secret_key || ''}
            onChange={e => updateBrandingField('turnstile_secret_key' as any, e.target.value)}
            sx={{ flex: 1, maxWidth: 400 }}
          />
        </div>

        {/* Chọn page hiển thị Turnstile */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <span style={{ width: 160, fontSize: 13, color: '#64748b', paddingTop: 4 }}>Hiển thị tại</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[
              { value: 'login', label: 'Trang đăng nhập' },
              { value: 'register', label: 'Trang đăng ký' },
              { value: 'forgot_password', label: 'Trang quên mật khẩu' },
              { value: 'reset_password', label: 'Trang đặt lại mật khẩu' },
              { value: 'recharge', label: 'Trang nạp tiền' }
            ].map(page => {
              const pages = branding.turnstile_pages || []
              const checked = pages.includes(page.value)

              return (
                <label key={page.value} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input
                    type='checkbox'
                    checked={checked}
                    onChange={e => {
                      const next = e.target.checked
                        ? [...pages, page.value]
                        : pages.filter(p => p !== page.value)

                      updateBrandingField('turnstile_pages', next)
                    }}
                    style={{ width: 16, height: 16, accentColor: '#2563eb' }}
                  />
                  <span style={{ fontSize: 13, color: checked ? '#1e293b' : '#94a3b8' }}>{page.label}</span>
                </label>
              )
            })}
            <span style={{ fontSize: 11, color: '#94a3b8' }}>
              Chỉ các trang được chọn mới hiển thị widget xác minh
            </span>
          </div>
        </div>

        {branding.turnstile_enabled === 'true' && !branding.turnstile_site_key && (
          <Alert severity='warning' sx={{ mt: 2, fontSize: 12 }}>
            Turnstile đã bật nhưng chưa nhập Site Key. Widget sẽ không hiển thị trên form đăng nhập/đăng ký.
          </Alert>
        )}
      </div>
    </div>
  )
}
