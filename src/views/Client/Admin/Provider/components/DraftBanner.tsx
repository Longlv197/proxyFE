'use client'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'

import type { DraftMeta } from '../useProviderDraft'

/**
 * Dải báo "có bản nháp chưa lưu" ở đầu modal.
 *
 * KHÔNG tự khôi phục — admin bấm mới khôi phục. Tự đè sẽ nuốt mất thay đổi mà người khác
 * (hoặc chính mình ở máy khác) vừa lưu.
 */
export default function DraftBanner({
  draft,
  onRestore,
  onDiscard
}: {
  draft: DraftMeta
  onRestore: () => void
  onDiscard: () => void
}) {
  const when = new Date(draft.savedAt).toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit'
  })

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        px: 2,
        py: 1.25,
        mb: 2,
        borderRadius: 1.5,
        border: '1px solid',
        borderColor: draft.isStale ? 'warning.light' : 'info.light',
        bgcolor: draft.isStale ? 'warning.lighterOpacity' : 'info.lighterOpacity'
      }}
    >
      <Box
        component='i'
        className='tabler-device-floppy'
        sx={{ fontSize: 20, color: draft.isStale ? 'warning.main' : 'info.main', flexShrink: 0 }}
      />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant='body2' sx={{ fontWeight: 600 }}>
          Có bản nháp chưa lưu — lúc {when}
        </Typography>
        <Typography variant='caption' sx={{ color: 'text.secondary', display: 'block' }}>
          {draft.isStale
            ? '⚠ Nhà cung cấp này đã được sửa ở nơi khác SAU khi anh lưu nháp — khôi phục có thể đè mất thay đổi đó.'
            : 'Khôi phục để làm tiếp chỗ đang dở. Khoá API không được lưu vào nháp, anh nhập lại.'}
        </Typography>
      </Box>
      <Button size='small' variant='contained' onClick={onRestore} sx={{ flexShrink: 0 }}>
        Khôi phục
      </Button>
      <Button size='small' color='secondary' onClick={onDiscard} sx={{ flexShrink: 0 }}>
        Bỏ nháp
      </Button>
    </Box>
  )
}
