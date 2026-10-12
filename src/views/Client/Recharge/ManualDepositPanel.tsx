'use client'

import Image from 'next/image'

import { useSelector } from 'react-redux'
import { Headphones } from 'lucide-react'

import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

import { useBranding } from '@/app/contexts/BrandingContext'
import type { RootState } from '@/store'

const ANH_KENH: Record<string, string> = {
  facebook: '/images/infos/fb.png',
  zalo: '/images/infos/zalo.png',
  telegram: '/images/infos/tele.png',
  tiktok: '/images/infos/tiktok.png',
  youtube: '/images/infos/youtube.png'
}

/**
 * Nạp tay: khách liên hệ admin, admin cộng tiền bằng tay. Không tạo lệnh gì ở máy chủ.
 * Thông tin liên hệ lấy từ branding của CHÍNH site đang xem → site con hiện liên hệ của site con.
 */
const ManualDepositPanel = ({ note }: { note: string }) => {
  const branding = useBranding()
  const { user } = useSelector((state: RootState) => state.user)

  const kenh = (branding.social_links || []).filter(l => l.url && l.platform !== 'youtube' && l.platform !== 'tiktok')
  const phone = branding.organization_phone || ''
  const email = branding.organization_email || ''

  return (
    <Box
      sx={{
        background: 'var(--mui-palette-background-paper, #fff)',
        borderRadius: '12px',
        border: '1px solid var(--mui-palette-divider, #e2e8f0)',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px'
      }}
    >
      <Typography sx={{ fontWeight: 700, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Headphones size={16} color='var(--primary-color)' />
        Liên hệ admin để nạp tiền
      </Typography>

      <Typography sx={{ fontSize: '13px', color: 'var(--mui-palette-text-secondary, #64748b)', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
        {note ||
          'Nhắn cho admin qua một trong các kênh bên dưới, gửi kèm mã khách và số tiền muốn nạp. Admin sẽ hướng dẫn chuyển tiền và cộng vào tài khoản cho bạn.'}
      </Typography>

      {user?.id && (
        <Typography sx={{ fontSize: '13px' }}>
          Mã khách của bạn: <strong>{user.id}</strong>
          {user.email ? ` · ${user.email}` : ''}
        </Typography>
      )}

      {kenh.length > 0 && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          {kenh.map((l, i) => (
            <a
              key={i}
              href={l.url}
              target='_blank'
              rel='noopener noreferrer'
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 14px',
                borderRadius: 8,
                border: '1px solid var(--mui-palette-divider, #e2e8f0)',
                fontSize: 13,
                fontWeight: 600,
                textTransform: 'capitalize',
                color: 'var(--mui-palette-text-primary, #1e293b)'
              }}
            >
              {ANH_KENH[l.platform] && <Image src={ANH_KENH[l.platform]} alt={l.platform} width={22} height={22} />}
              {l.platform}
            </a>
          ))}
        </Box>
      )}

      {(phone || email) && (
        <Box sx={{ fontSize: '13px', color: 'var(--mui-palette-text-secondary, #64748b)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {phone && (
            <span>
              Điện thoại / Zalo: <strong>{phone}</strong>
            </span>
          )}
          {email && (
            <span>
              Email: <strong>{email}</strong>
            </span>
          )}
        </Box>
      )}

      {kenh.length === 0 && !phone && !email && branding.support_contact && (
        <Typography sx={{ fontSize: '13px' }}>{branding.support_contact}</Typography>
      )}
    </Box>
  )
}

export default ManualDepositPanel
