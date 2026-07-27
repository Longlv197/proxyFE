'use client'

import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

/**
 * Dòng cảnh báo "bước này cần lập trình viên viết thêm" (§6b spec chặng 1).
 *
 * Đặt NGAY TRÊN khối bước liên quan — không gom về panel riêng, vì admin cần biết
 * CHỖ NÀO vướng chứ không phải "ở đâu đó trong config có vấn đề".
 *
 * 🔴 CHỈ render khi BE trả needs_code ≠ null. BE chỉ báo khi trúng 1 trong 3 dấu hiệu
 * chắc chắn (có handler / proxy_format lạ / thiếu URL) — FE TUYỆT ĐỐI không tự suy diễn,
 * vì báo bừa còn tệ hơn không báo (admin sẽ ngừng tin cảnh báo).
 */
export default function NeedsCodeAlert({ reason, detail }: { reason: string; detail: string }) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 1,
        px: 1.5,
        py: 1,
        mb: 1.5,
        borderRadius: 1.5,
        border: '1px solid',
        borderColor: 'warning.light',
        bgcolor: 'warning.lighterOpacity'
      }}
    >
      <Box component='i' className='tabler-alert-triangle' sx={{ fontSize: 18, color: 'warning.main', mt: 0.25 }} />
      <Box sx={{ minWidth: 0 }}>
        <Typography variant='body2' sx={{ fontWeight: 600, color: 'warning.dark' }}>
          {reason} — cần lập trình viên
        </Typography>
        <Typography variant='caption' sx={{ color: 'text.secondary', display: 'block', wordBreak: 'break-word' }}>
          {detail}
        </Typography>
      </Box>
    </Box>
  )
}
