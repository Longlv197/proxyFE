'use client'

import { useState } from 'react'

import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import FormControlLabel from '@mui/material/FormControlLabel'
import Checkbox from '@mui/material/Checkbox'
import Divider from '@mui/material/Divider'
import CircularProgress from '@mui/material/CircularProgress'

import { useValidateConfig, useConfigCard, useTestConfig } from '@/hooks/apis/useConfigTools'
import type { HarnessCheck } from '@/hooks/apis/useConfigTools'

// Màu theo trạng thái — dùng token theme, KHÔNG hardcode hex.
const STATUS_COLOR: Record<string, 'success' | 'error' | 'default'> = {
  green: 'success',
  red: 'error',
  gray: 'default'
}

const STATUS_ICON: Record<string, string> = { green: '🟢', red: '🔴', gray: '⚪' }

interface Props {
  code?: string
}

/**
 * Panel bộ máy cấu hình (chạm nhẹ Spec 1): kết quả validate + thẻ tóm tắt (đọc-trước) +
 * nút Test API thật. Chỉ hiện ở edit mode (cần provider đã lưu để đối chiếu DB).
 */
export default function ConfigToolPanel({ code }: Props) {
  const { data: validate, isLoading: vLoading } = useValidateConfig(code)
  const { data: card, isLoading: cLoading } = useConfigCard(code)
  const testMutation = useTestConfig()

  const [productId, setProductId] = useState('')
  const [live, setLive] = useState(false)

  if (!code) return null

  const errors = validate?.errors ?? []
  const warnings = validate?.warnings ?? []

  const runTest = () => {
    const pid = Number(productId)

    if (!pid) return
    testMutation.mutate({ code, product_id: pid, live })
  }

  return (
    <Box sx={{ position: 'sticky', top: 16, mt: 3 }}>
      <Typography variant='subtitle2' fontWeight={600} sx={{ mb: 1 }}>
        🔎 Kiểm tra cấu hình
      </Typography>

      {/* ─── Validate ─── */}
      <Box sx={{ mb: 2 }}>
        {vLoading ? (
          <CircularProgress size={16} />
        ) : validate?.skipped ? (
          <Chip size='small' label='Không-config-driven — bỏ qua kiểm' variant='tonal' color='secondary' />
        ) : errors.length === 0 && warnings.length === 0 ? (
          <Chip size='small' color='success' label='🟢 Config hợp lệ' />
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {errors.map((e, i) => (
              <Typography key={`e${i}`} variant='caption' color='error.main'>
                🔴 <b>{e.path}</b>: {e.message}
              </Typography>
            ))}
            {warnings.map((w, i) => (
              <Typography key={`w${i}`} variant='caption' color='warning.main'>
                🟡 <b>{w.path}</b>: {w.message}
              </Typography>
            ))}
          </Box>
        )}
      </Box>

      <Divider sx={{ my: 1.5 }} />

      {/* ─── Thẻ tóm tắt (đọc-trước) ─── */}
      <Box sx={{ mb: 2 }}>
        {cLoading ? (
          <CircularProgress size={16} />
        ) : card ? (
          <Box
            sx={{
              bgcolor: 'action.hover',
              borderRadius: 1,
              p: 1.5,
              fontSize: '0.8rem',
              lineHeight: 1.7,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word'
            }}
          >
            {card.lines.map((line, i) => {
              const isChange = line.trim().startsWith('⚠')

              return (
                <Box key={i} component='div' sx={{ color: isChange ? 'error.main' : 'text.primary', fontWeight: isChange ? 600 : 400 }}>
                  {line}
                </Box>
              )
            })}
          </Box>
        ) : null}
      </Box>

      <Divider sx={{ my: 1.5 }} />

      {/* ─── Test API thật ─── */}
      <Box>
        <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mb: 1 }}>
          {'Test API (dry-run mua an toàn $0; tick “gọi thật” để test endpoint đọc)'}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, flexWrap: 'wrap' }}>
          <TextField
            size='small'
            type='number'
            label='ServiceType id'
            value={productId}
            onChange={e => setProductId(e.target.value)}
            sx={{ width: 130 }}
          />
          <FormControlLabel
            control={<Checkbox size='small' checked={live} onChange={e => setLive(e.target.checked)} />}
            label={<Typography variant='caption'>gọi thật</Typography>}
          />
          <Button
            size='small'
            variant='contained'
            onClick={runTest}
            disabled={!productId || testMutation.isPending}
            sx={{ color: '#fff' }}
          >
            {testMutation.isPending ? 'Đang test...' : 'Test'}
          </Button>
        </Box>

        {testMutation.isError && (
          <Typography variant='caption' color='error.main'>
            {(testMutation.error as any)?.response?.data?.message || 'Lỗi khi test'}
          </Typography>
        )}

        {testMutation.data?.checks?.map((c: HarnessCheck, i: number) => (
          <Box key={i} sx={{ mb: 1 }}>
            <Chip size='small' color={STATUS_COLOR[c.status] || 'default'} label={`${STATUS_ICON[c.status] || ''} ${c.name}`} />
            <Typography variant='caption' sx={{ display: 'block', color: 'text.secondary', whiteSpace: 'pre-wrap', mt: 0.5 }}>
              {c.detail}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  )
}
