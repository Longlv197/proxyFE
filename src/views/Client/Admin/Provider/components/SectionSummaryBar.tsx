'use client'

import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

/**
 * Dải tóm tắt đặt ĐẦU mỗi tab cấu hình (Xoay / IP Whitelist / Gia hạn):
 * hiện GIÁ TRỊ THẬT đang set bằng tiếng người, để nhìn 5 giây là biết tab này đang cấu hình gì —
 * không phải rà từng ô. Cùng ngôn ngữ trình bày với dòng tóm tắt khi thu khối ở tab Mua proxy.
 */
interface Props {
  enabled: boolean

  /** Câu mô tả khi TẮT — nói rõ hậu quả, không chỉ "đang tắt" */
  offText: string

  /** Các mẩu tóm tắt khi BẬT (đã là giá trị thật) */
  parts: Array<string | false | undefined | null>
}

/** Rút gọn URL cho dòng tóm tắt: bỏ https:// và cắt đuôi quá dài. */
export function shortUrl(url?: string): string {
  const u = String(url || '').trim().replace(/^https?:\/\//, '')

  return u.length > 56 ? `${u.slice(0, 53)}…` : u
}

export default function SectionSummaryBar({ enabled, offText, parts }: Props) {
  const clean = parts.filter(Boolean) as string[]

  return (
    <Box
      sx={{
        px: 2,
        py: 1.25,
        borderRadius: 1.5,
        border: '1px solid',
        borderColor: enabled ? 'success.light' : 'divider',
        bgcolor: enabled ? 'success.lighterOpacity' : 'action.hover',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 1
      }}
    >
      <Box
        component='span'
        sx={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          bgcolor: enabled ? 'success.main' : 'action.disabled',
          mt: 0.75,
          flexShrink: 0
        }}
      />
      <Typography variant='body2' sx={{ color: enabled ? 'text.primary' : 'text.secondary', wordBreak: 'break-word' }}>
        {enabled ? clean.join(' · ') : offText}
      </Typography>
    </Box>
  )
}
