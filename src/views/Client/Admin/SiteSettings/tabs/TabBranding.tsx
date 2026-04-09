'use client'

import { useRef } from 'react'

import { TextField, Button, IconButton, Tooltip } from '@mui/material'
import { Upload, Trash2 } from 'lucide-react'

import { sectionTitleSx, sectionDescSx, fieldLabelSx } from './shared'
import type { BrandingSettings } from './shared'

interface TabBrandingProps {
  branding: BrandingSettings
  updateBrandingField: (field: keyof BrandingSettings, value: any) => void
  handleImageUpload: (file: File, field: 'logo_url' | 'logo_icon_url' | 'favicon_url' | 'og_image_url') => void
  resetImageField: (field: 'logo_url' | 'logo_icon_url' | 'favicon_url' | 'og_image_url') => void
  resolveUrl: (path: string | null | undefined) => string
  brandingName: string
  show_product_code?: string | null
}

const TabBranding = ({
  branding,
  updateBrandingField,
  handleImageUpload,
  resetImageField,
  resolveUrl,
  brandingName
}: TabBrandingProps) => {
  const logoInputRef = useRef<HTMLInputElement>(null)
  const logoIconInputRef = useRef<HTMLInputElement>(null)
  const faviconInputRef = useRef<HTMLInputElement>(null)
  const ogImageInputRef = useRef<HTMLInputElement>(null)

  return (
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
  )
}

export default TabBranding
