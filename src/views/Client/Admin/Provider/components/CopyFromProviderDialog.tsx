'use client'

import { useState } from 'react'

import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'
import MenuItem from '@mui/material/MenuItem'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'

import CustomTextField from '@core/components/mui/TextField'

/**
 * Chép cấu hình MUA từ một NCC có sẵn (§5.3 spec chặng 1) — chỉ khi TẠO MỚI.
 *
 * Vì sao chép tay thay vì máy tự đoán "NCC nào giống 80%": đo độ giống là tầng 3, phức tạp
 * và dễ sai. Admin nhìn danh sách vài NCC là tự biết cái nào gần nhất — máy chỉ cần chép
 * cho nhanh và sạch.
 *
 * 🔴 KHÔNG chép token. Chỉ điền vào form đang mở, KHÔNG tự lưu — admin xem lại rồi mới bấm Lưu.
 */

interface ProviderOption {
  id: number
  provider_code: string
  title?: string
  api_config?: any
}

interface Props {
  open: boolean
  providers: ProviderOption[]
  onClose: () => void
  onPick: (config: any, fromCode: string) => void
}

/** Cùng danh sách với BE (StepDigest / ConfigExampleService). */
const SECRET_KEYS = ['key', 'api_key', 'apikey', 'token', 'token_api', 'password', 'pass', 'secret']

/** Bỏ mọi field bí mật ở MỌI TẦNG trước khi chép. */
function stripSecrets(value: any): any {
  if (Array.isArray(value)) return value.map(stripSecrets)

  if (value && typeof value === 'object') {
    const out: Record<string, any> = {}

    for (const [k, v] of Object.entries(value)) {
      if (SECRET_KEYS.includes(k.toLowerCase())) continue
      out[k] = stripSecrets(v)
    }

    return out
  }

  return value
}

/** Mô tả ngắn NCC nguồn để admin chọn đúng cái gần giống. */
function describe(cfg: any): string {
  if (!cfg) return 'chưa có cấu hình mua'

  const parts: string[] = []

  if (cfg.buy_rotating || cfg.buy) parts.push('proxy xoay')
  if (cfg.buy_static) parts.push('proxy tĩnh')

  const body = cfg.buy_static || cfg.buy_rotating || cfg.buy

  if (body?.response_mode === 'deferred') parts.push('lấy proxy sau')
  else if (body) parts.push('nhận proxy ngay')

  return parts.length ? parts.join(' · ') : 'chưa có cấu hình mua'
}

export default function CopyFromProviderDialog({ open, providers, onClose, onPick }: Props) {
  const [code, setCode] = useState('')

  const picked = providers.find(p => p.provider_code === code)

  const handleCopy = () => {
    if (!picked) return

    const cfg = picked.api_config ?? {}

    const copied = stripSecrets({
      ...(cfg.buy ? { buy: cfg.buy } : {}),
      ...(cfg.buy_static ? { buy_static: cfg.buy_static } : {}),
      ...(cfg.buy_rotating ? { buy_rotating: cfg.buy_rotating } : {})
    })

    onPick(copied, picked.provider_code)
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth='xs' fullWidth>
      <DialogTitle>Chép cấu hình mua từ NCC có sẵn</DialogTitle>
      <DialogContent>
        <Typography variant='body2' sx={{ mb: 2, color: 'text.secondary' }}>
          Chọn một NCC gần giống nhất để điền sẵn phần <b>Mua</b>. Khoá API <b>không</b> được chép — anh nhập lại.
          Chép xong vẫn phải xem và sửa cho đúng NCC mới, rồi mới bấm Lưu.
        </Typography>

        <CustomTextField select fullWidth label='Chép từ' value={code} onChange={e => setCode(e.target.value)}>
          {providers.map(p => (
            <MenuItem key={p.id} value={p.provider_code}>
              {p.title || p.provider_code}
            </MenuItem>
          ))}
        </CustomTextField>

        {picked && (
          <Box sx={{ mt: 1.5, px: 1.5, py: 1, borderRadius: 1.5, bgcolor: 'action.hover' }}>
            <Typography variant='caption' sx={{ color: 'text.secondary' }}>
              {picked.provider_code} — {describe(picked.api_config)}
            </Typography>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button color='secondary' onClick={onClose}>
          Huỷ
        </Button>
        <Button variant='contained' disabled={!picked} onClick={handleCopy}>
          Chép vào form
        </Button>
      </DialogActions>
    </Dialog>
  )
}
