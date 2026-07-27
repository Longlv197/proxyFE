'use client'

import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

import type { StepDigestData } from '@/hooks/apis/useConfigTools'

/**
 * Bốn câu của MỘT bước (§4.2b spec chặng 1):
 *   Gọi            đi đâu (method + URL + vị trí token)
 *   Gửi            payload gì
 *   Nhận           response hình gì, biết thành công bằng cách nào
 *   → cho bước sau  để lại gì
 *
 * Câu cuối là thứ đang thiếu hẳn ở màn hiện tại: không chỗ nào nói "bước 1 đẻ ra mã đơn,
 * bước sau cần đúng cái đó" → người xem không nối được hai bước với nhau.
 *
 * Giá trị do BE (StepDigest) dựng sẵn từ config thật — FE CHỈ hiển thị, không tự suy diễn,
 * không tự điền mặc định. Field chưa đặt thì BE đã trả chữ "chưa đặt".
 */
const ROWS: Array<{ key: keyof StepDigestData; label: string }> = [
  { key: 'call', label: 'Gọi' },
  { key: 'send', label: 'Gửi' },
  { key: 'receive', label: 'Nhận' },
  { key: 'produces', label: '→ cho bước sau' }
]

export default function StepDigestBox({ digest }: { digest?: StepDigestData }) {
  if (!digest) return null

  return (
    <Box
      sx={{
        px: 1.5,
        py: 1,
        mb: 1.5,
        borderRadius: 1.5,
        bgcolor: 'action.hover',
        display: 'grid',
        gridTemplateColumns: 'auto 1fr',
        columnGap: 1.5,
        rowGap: 0.5
      }}
    >
      {ROWS.map(row => {
        const value = digest[row.key]

        if (typeof value !== 'string' || !value) return null

        return (
          <Box key={row.key} sx={{ display: 'contents' }}>
            <Typography variant='caption' sx={{ color: 'text.disabled', whiteSpace: 'nowrap' }}>
              {row.label}
            </Typography>
            <Typography variant='caption' sx={{ color: 'text.primary', wordBreak: 'break-word' }}>
              {value}
            </Typography>
          </Box>
        )
      })}
    </Box>
  )
}
