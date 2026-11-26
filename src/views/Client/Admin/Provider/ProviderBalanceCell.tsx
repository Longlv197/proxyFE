'use client'

import { RefreshCw } from 'lucide-react'
import { Box, CircularProgress, IconButton, Tooltip } from '@mui/material'

import { formatProviderBalance, type ProviderBalanceInfo } from '@/hooks/apis/useProviders'

interface Props {
  info?: ProviderBalanceInfo
  loading?: boolean
  onRefresh?: () => void
}

/**
 * Ô "Số dư NCC" trong bảng NCC. Số lấy từ cache BE (providers:sync-balance, 15 phút/lần).
 * Lỗi lần gần nhất → vẫn hiện số cũ nhưng tô màu cảnh báo + lý do trong tooltip.
 * NCC chưa cấu hình (không có info) → "-".
 */
export default function ProviderBalanceCell({ info, loading, onRefresh }: Props) {
  if (!info) {
    return (
      <Box component='span' sx={{ color: 'text.disabled', fontSize: 12 }}>
        -
      </Box>
    )
  }

  const low = info.low_threshold != null && info.balance != null && info.balance < Number(info.low_threshold)
  const failed = info.success === false
  const color = failed ? 'warning.main' : low ? 'error.main' : 'success.main'

  const tip = [
    failed ? `Lần lấy gần nhất lỗi: ${info.message}` : null,
    info.fetched_at ? `Số liệu lúc: ${info.fetched_at}` : 'Chưa lấy được lần nào',
    info.checked_at && info.checked_at !== info.fetched_at ? `Kiểm tra lúc: ${info.checked_at}` : null,
    low ? `Dưới ngưỡng cảnh báo ${formatProviderBalance(Number(info.low_threshold), info.currency)}` : null
  ]
    .filter(Boolean)
    .join('\n')

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      <Tooltip title={<span style={{ whiteSpace: 'pre-line' }}>{tip}</span>}>
        <Box component='span' sx={{ fontWeight: 600, fontSize: 13, color }}>
          {formatProviderBalance(info.balance, info.currency)}
          {failed && ' ⚠'}
        </Box>
      </Tooltip>
      {onRefresh && (
        <Tooltip title='Lấy số dư ngay từ NCC'>
          <span>
            <IconButton size='small' disabled={loading} onClick={onRefresh} sx={{ color: 'text.secondary' }}>
              {loading ? <CircularProgress size={12} /> : <RefreshCw size={13} />}
            </IconButton>
          </span>
        </Tooltip>
      )}
    </Box>
  )
}
