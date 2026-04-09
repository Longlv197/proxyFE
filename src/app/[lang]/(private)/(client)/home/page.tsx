'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'

import { useParams } from 'next/navigation'

import {
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  FormControlLabel,
  Checkbox
} from '@mui/material'
import { Share2, Clock, X, ChevronLeft, ChevronRight, ExternalLink, Tag, Sparkles, TrendingUp, Wrench, Megaphone, Wallet, Globe, Search, BookOpen, ArrowRight, Youtube } from 'lucide-react'
import { SOCIAL_ICON_MAP } from '@/components/icons/SocialIcons'
import { toast } from 'react-toastify'
import { useSelector } from 'react-redux'
import type { RootState } from '@/store'

import { useAnnouncements } from '@/hooks/apis/useAnnouncements'
import type { Announcement } from '@/hooks/apis/useAnnouncements'
import { useSidebarSettings } from '@/hooks/apis/useSidebarSettings'

function useHydrated() {
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => { setHydrated(true) }, [])

  return hydrated
}

const TYPE_MAP: Record<string, { label: string; color: string; icon: typeof Tag }> = {
  discount: { label: 'Giảm giá', color: '#22c55e', icon: Tag },
  new_product: { label: 'Sản phẩm mới', color: '#3b82f6', icon: Sparkles },
  price_change: { label: 'Thay đổi giá', color: '#f59e0b', icon: TrendingUp },
  maintenance: { label: 'Bảo trì', color: '#ef4444', icon: Wrench },
  general: { label: 'Chung', color: '#6b7280', icon: Megaphone }
}

function timeAgo(dateStr: string) {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (diffMin < 1) return 'Vừa xong'
  if (diffMin < 60) return `${diffMin} phút trước`
  if (diffHour < 24) return `${diffHour} giờ trước`
  if (diffDay < 7) return `${diffDay} ngày trước`

  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

let _DOMPurify: any = null

function sanitize(html: string): string {
  if (typeof window === 'undefined') return ''

  if (!_DOMPurify) {
    _DOMPurify = require('dompurify')
  }

  return _DOMPurify.sanitize(html, {
    ADD_TAGS: ['img'],
    ADD_ATTR: ['src', 'alt', 'style', 'class']
  })
}

/* ─── Modal Cooldown (localStorage) ─── */
const MODAL_STORAGE_KEY = 'modal_announcements_dismissed'
const MODAL_COOLDOWN_MS = 30 * 60 * 1000 // 30 phút

function getDismissedMap(): Record<string, number> {
  try {
    const raw = localStorage.getItem(MODAL_STORAGE_KEY)

    if (!raw) return {}
    const parsed = JSON.parse(raw)

    // Xóa entries quá hạn
    const now = Date.now()
    const cleaned: Record<string, number> = {}

    for (const [id, ts] of Object.entries(parsed)) {
      if (typeof ts === 'number' && now - ts < MODAL_COOLDOWN_MS) {
        cleaned[id] = ts
      }
    }

    return cleaned
  } catch {
    return {}
  }
}

function dismissModals(ids: number[]) {
  const map = getDismissedMap()
  const now = Date.now()

  for (const id of ids) {
    map[String(id)] = now
  }

  localStorage.setItem(MODAL_STORAGE_KEY, JSON.stringify(map))
}

/* ─── Modal Popup Announcements ─── */
function ModalAnnouncements({ items }: { items: Announcement[] }) {
  const [open, setOpen] = useState(false)
  const [currentIdx, setCurrentIdx] = useState(0)
  const [dontShowAgain, setDontShowAgain] = useState(false)
  const [pendingItems, setPendingItems] = useState<Announcement[]>([])

  useEffect(() => {
    if (typeof window === 'undefined' || items.length === 0) {
      setPendingItems([])

      return
    }

    const dismissed = getDismissedMap()
    const filtered = items.filter(item => !dismissed[String(item.id)])

    setPendingItems(filtered)

    if (filtered.length > 0) {
      setCurrentIdx(0)
      setDontShowAgain(false)
      setOpen(true)
    }
  }, [items])

  if (pendingItems.length === 0) return null

  const current = pendingItems[currentIdx]

  if (!current) return null

  const typeInfo = TYPE_MAP[current.type] || TYPE_MAP.general
  const html = sanitize(current.content)
  const hasMultiple = pendingItems.length > 1

  const handleClose = () => {
    if (dontShowAgain) {
      dismissModals(pendingItems.map(i => i.id))
    }

    setOpen(false)
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth='sm'
      fullWidth
      closeAfterTransition={false}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pr: 6 }}>
        <Chip
          label={typeInfo.label}
          size='small'
          sx={{
            fontSize: '11px',
            fontWeight: 600,
            backgroundColor: `${typeInfo.color}15`,
            color: typeInfo.color,
            border: `1px solid ${typeInfo.color}30`
          }}
        />
        <span style={{ fontSize: '16px', fontWeight: 700 }}>{current.title}</span>
        <IconButton
          onClick={handleClose}
          sx={{ position: 'absolute', right: 8, top: 8 }}
          size='small'
        >
          <X size={18} />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
          <Clock size={12} />
          {timeAgo(current.published_at)}
        </div>
        <div
          className='announcement-content'
          style={{ padding: 0 }}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </DialogContent>
      <DialogActions sx={{ justifyContent: 'space-between', px: 2 }}>
        <FormControlLabel
          control={
            <Checkbox
              size='small'
              checked={dontShowAgain}
              onChange={e => setDontShowAgain(e.target.checked)}
            />
          }
          label='Không hiển thị trong 30 phút'
          sx={{ '& .MuiFormControlLabel-label': { fontSize: '13px', color: '#64748b' } }}
        />
        {hasMultiple ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Button
              size='small'
              startIcon={<ChevronLeft size={16} />}
              disabled={currentIdx === 0}
              onClick={() => setCurrentIdx(i => i - 1)}
            >
              Trước
            </Button>
            <span style={{ fontSize: 13, color: '#64748b' }}>
              {currentIdx + 1} / {pendingItems.length}
            </span>
            <Button
              size='small'
              endIcon={<ChevronRight size={16} />}
              disabled={currentIdx === pendingItems.length - 1}
              onClick={() => setCurrentIdx(i => i + 1)}
            >
              Tiếp
            </Button>
          </div>
        ) : (
          <Button size='small' onClick={handleClose}>
            Đóng
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}

/* ─── Feed Post Card ─── */
function AnnouncementPost({ announcement }: { announcement: Announcement }) {
  const [showFull, setShowFull] = useState(false)
  const hydrated = useHydrated()
  const typeInfo = TYPE_MAP[announcement.type] || TYPE_MAP.general
  const TypeIcon = typeInfo.icon

  const sanitizedHTML = useMemo(() => sanitize(announcement.content), [announcement.content])
  const isLong = announcement.content.length > 500

  const handleShare = async () => {
    const textContent = announcement.content.replace(/<[^>]*>/g, '').trim()
    const shareText = `${announcement.title}\n\n${textContent}`

    if (navigator.share) {
      try {
        await navigator.share({ title: announcement.title, text: shareText })
      } catch {
        // user cancelled
      }
    } else {
      await navigator.clipboard.writeText(shareText)
      toast.success('Đã sao chép nội dung')
    }
  }

  return (
    <div className='announcement-post' style={{ borderLeft: `3px solid ${typeInfo.color}` }}>
      {/* Header: icon + chip + time */}
      <div className='announcement-post-header'>
        <div className='announcement-type-icon' style={{ backgroundColor: `${typeInfo.color}12`, color: typeInfo.color }}>
          <TypeIcon size={16} />
        </div>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <Chip
            label={typeInfo.label}
            size='small'
            sx={{
              height: '22px',
              fontSize: '11px',
              fontWeight: 700,
              backgroundColor: `${typeInfo.color}12`,
              color: typeInfo.color,
              border: `1px solid ${typeInfo.color}25`
            }}
          />
          <span className='announcement-time'>
            <Clock size={11} />
            {hydrated ? timeAgo(announcement.published_at) : ''}
          </span>
        </div>
      </div>

      {/* Title */}
      <h3 className='announcement-post-title'>{announcement.title}</h3>

      {/* Content */}
      <div
        className={`announcement-content ${isLong && !showFull ? 'announcement-content-collapsed' : ''}`}
        dangerouslySetInnerHTML={{ __html: sanitizedHTML }}
      />
      {isLong && !showFull && (
        <button className='announcement-see-more' onClick={() => setShowFull(true)}>
          Xem thêm
        </button>
      )}

      {/* Actions */}
      <div className='announcement-post-actions'>
        <button className='announcement-action-btn' onClick={handleShare}>
          <Share2 size={14} />
          Chia sẻ
        </button>
      </div>
    </div>
  )
}

/* ─── Sidebar Icon Map ─── */
// Icon fallback cho platform không có SVG
const LucideIconMap: Record<string, typeof ExternalLink> = { other: ExternalLink }

/* ─── Sidebar ─── */
function HomeSidebar() {
  const { data } = useSidebarSettings()

  const supportLinks = data?.support_links ?? []
  const youtubeVideos = data?.youtube_videos ?? []

  return (
    <div className='home-sidebar'>
      {supportLinks.length > 0 && (
        <div className='sidebar-card'>
          <h4 className='sidebar-card-title'>Bạn cần hỗ trợ?</h4>
          <div className='sidebar-links-grid'>
            {supportLinks.map(link => {
              const SvgIcon = SOCIAL_ICON_MAP[link.icon]
              const FallbackIcon = LucideIconMap[link.icon] || ExternalLink

              return (
                <a
                  key={link.label}
                  href={link.url}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='sidebar-link-item'
                >
                  <div className='sidebar-link-icon' style={{ backgroundColor: SvgIcon ? 'transparent' : `${link.color}15`, color: link.color }}>
                    {SvgIcon ? <SvgIcon size={36} /> : <FallbackIcon size={20} />}
                  </div>
                  <span className='sidebar-link-label'>{link.label}</span>
                </a>
              )
            })}
          </div>
        </div>
      )}

      {youtubeVideos.length > 0 && (
        <div className='sidebar-card'>
          <h4 className='sidebar-card-title'>
            <Youtube size={18} style={{ color: '#ef4444' }} />
            Video hướng dẫn sử dụng
          </h4>
          <div className='sidebar-video-list'>
            {youtubeVideos.map(video => {
              // Extract YouTube video ID from URL
              const videoId = video.url?.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/))([^?&\s]+)/)?.[1]
              const thumbUrl = videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : ''

              return (
                <a
                  key={video.title}
                  href={video.url}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='sidebar-video-item'
                >
                  <div className='sidebar-video-thumb' style={thumbUrl ? { backgroundImage: `url(${thumbUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}>
                    {!thumbUrl && <Youtube size={24} />}
                  </div>
                  <span className='sidebar-video-title'>{video.title}</span>
                </a>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── Skeleton ─── */
function FeedSkeleton() {
  return (
    <div className='home-layout'>
      <div className='announcement-feed'>
        {[1, 2, 3].map(i => (
          <div key={i} className='announcement-post' style={{ borderLeft: '3px solid #e2e8f0' }}>
            <div className='announcement-post-header'>
              <div className='announcement-skeleton' style={{ width: 32, height: 32, borderRadius: 10 }} />
              <div className='announcement-skeleton' style={{ width: 70, height: 20, borderRadius: 12 }} />
              <div className='announcement-skeleton' style={{ width: 80, height: 14, borderRadius: 4 }} />
            </div>
            <div className='announcement-skeleton' style={{ width: '65%', height: 17, borderRadius: 4, margin: '10px 16px 4px' }} />
            <div className='announcement-skeleton' style={{ width: '90%', height: 50, borderRadius: 6, margin: '0 16px 14px' }} />
          </div>
        ))}
        <style>{`@keyframes skeletonPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
      </div>
      <HomeSidebar />
    </div>
  )
}

/* ─── Empty Feed ─── */
function EmptyFeed() {
  const { lang } = useParams()
  const locale = lang || 'vi'
  const { name } = useSelector((state: RootState) => state.user)

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Chào buổi sáng' : hour < 18 ? 'Chào buổi chiều' : 'Chào buổi tối'
  const displayName = name || 'bạn'

  const quickActions = [
    { icon: Globe, label: 'Proxy Tĩnh', desc: 'IP cố định, ổn định', href: `/${locale}/proxy-tinh`, color: '#3b82f6', gradient: 'linear-gradient(135deg, #3b82f6, #6366f1)' },
    { icon: TrendingUp, label: 'Proxy Xoay', desc: 'Đổi IP tự động', href: `/${locale}/proxy-xoay`, color: '#8b5cf6', gradient: 'linear-gradient(135deg, #8b5cf6, #a855f7)' },
    { icon: Wallet, label: 'Nạp Tiền', desc: 'Chuyển khoản tự động', href: `/${locale}/recharge`, color: '#22c55e', gradient: 'linear-gradient(135deg, #22c55e, #16a34a)' },
    { icon: BookOpen, label: 'API Docs', desc: 'Tích hợp qua REST API', href: `/${locale}/docs-api`, color: '#f59e0b', gradient: 'linear-gradient(135deg, #f59e0b, #d97706)' }
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Welcome Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #1e293b 0%, color-mix(in srgb, var(--primary-color, #6366f1) 40%, #1e293b) 60%, color-mix(in srgb, var(--primary-color, #6366f1) 25%, #334155) 100%)',
        borderRadius: 16, padding: '32px 28px', color: '#fff', position: 'relative', overflow: 'hidden',
      }}>
        {/* Background decoration */}
        <div style={{ position: 'absolute', top: -20, right: -20, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
        <div style={{ position: 'absolute', bottom: -30, right: 60, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 6px', letterSpacing: '-0.3px' }}>
            {greeting}, {displayName}! 👋
          </h2>
          <p style={{ fontSize: 14, opacity: 0.85, margin: '0 0 20px', lineHeight: 1.5, maxWidth: 400 }}>
            Hôm nay bạn muốn làm gì? Chọn nhanh bên dưới để bắt đầu.
          </p>
          <a
            href={`/${locale}/proxy-tinh`}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '10px 20px', borderRadius: 10,
              background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)',
              color: '#fff', fontWeight: 600, fontSize: 14,
              textDecoration: 'none', border: '1px solid rgba(255,255,255,0.25)',
              transition: 'background 0.2s',
            }}
          >
            <Sparkles size={16} /> Khám phá ngay <ArrowRight size={16} />
          </a>
        </div>
      </div>

      {/* Quick Actions Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
        {quickActions.map(action => {
          const Icon = action.icon

          return (
            <a
              key={action.label}
              href={action.href}
              className='empty-feed-action'
              style={{
                '--action-color': action.color,
                padding: '16px',
                borderRadius: 12,
                background: '#fff',
                border: '1px solid #f1f5f9',
              } as React.CSSProperties}
            >
              <div style={{
                width: 42, height: 42, borderRadius: 12,
                background: action.gradient, color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                boxShadow: `0 4px 12px ${action.color}30`,
              }}>
                <Icon size={20} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', marginBottom: 2 }}>{action.label}</div>
                <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.3 }}>{action.desc}</div>
              </div>
              <ArrowRight size={16} style={{ color: '#cbd5e1', flexShrink: 0 }} />
            </a>
          )
        })}
      </div>

    </div>
  )
}

/* ─── Page ─── */
export default function HomePage() {
  const { data, isLoading } = useAnnouncements()

  if (isLoading) {
    return <FeedSkeleton />
  }

  const homeList = data?.home ?? []
  const modalList = data?.modal ?? []

  return (
    <>
      <ModalAnnouncements items={modalList} />

      <div className='home-layout'>
        <div className='announcement-feed'>
          <EmptyFeed />
          {homeList.length > 0 && homeList.map(announcement => (
            <AnnouncementPost key={announcement.id} announcement={announcement} />
          ))}
        </div>

        <HomeSidebar />
      </div>
    </>
  )
}
