'use client'

import React from 'react'
import { TextField, Button, IconButton, Tooltip } from '@mui/material'
import { Plus, Trash2 } from 'lucide-react'

import type { BrandingSettings } from '@/hooks/apis/useBrandingSettings'
import type { SupportLink, YoutubeVideo } from '@/hooks/apis/useSidebarSettings'
import { sectionTitleSx, sectionDescSx } from './shared'

// ─── Constants ───────────────────────────────────────────────────────────────

const ICON_OPTIONS = [
  { value: 'zalo', label: 'Zalo' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'telegram', label: 'Telegram' },
  { value: 'youtube', label: 'Youtube' },
  { value: 'other', label: 'Khác' }
]

const emptySupportLink: SupportLink = { label: '', url: '', icon: 'other', color: '#3b82f6' }
const emptyVideo: YoutubeVideo = { title: '', url: '' }

// ─── Types ───────────────────────────────────────────────────────────────────

interface TabSupportProps {
  branding: BrandingSettings
  updateBrandingField: (field: keyof BrandingSettings, value: any) => void
  supportLinks: SupportLink[]
  setSupportLinks: React.Dispatch<React.SetStateAction<SupportLink[]>>
  updateLink: (idx: number, field: keyof SupportLink, value: string) => void
  youtubeVideos: YoutubeVideo[]
  setYoutubeVideos: React.Dispatch<React.SetStateAction<YoutubeVideo[]>>
  updateVideo: (idx: number, field: keyof YoutubeVideo, value: string) => void
}

// ─── Component ───────────────────────────────────────────────────────────────

function TabSupport({
  branding,
  updateBrandingField,
  supportLinks,
  setSupportLinks,
  updateLink,
  youtubeVideos,
  setYoutubeVideos,
  updateVideo
}: TabSupportProps) {
  return (
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
  )
}

export default TabSupport
