'use client'

import { useState } from 'react'
import type { ReactNode } from 'react'

import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Paper from '@mui/material/Paper'
import Alert from '@mui/material/Alert'
import AlertTitle from '@mui/material/AlertTitle'
import Chip from '@mui/material/Chip'
import Button from '@mui/material/Button'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import FormControlLabel from '@mui/material/FormControlLabel'
import Checkbox from '@mui/material/Checkbox'
import CircularProgress from '@mui/material/CircularProgress'

import { useValidateConfig, useConfigCard, useTestConfig } from '@/hooks/apis/useConfigTools'
import type { HarnessCheck, ValidateIssue } from '@/hooks/apis/useConfigTools'
import { useServiceTypes } from '@/hooks/apis/useServiceType'

// Màu theo trạng thái — dùng token theme, KHÔNG hardcode hex.
const STATUS_COLOR: Record<string, 'success' | 'error' | 'default'> = {
  green: 'success',
  red: 'error',
  gray: 'default'
}

const STATUS_ICON: Record<string, string> = { green: '🟢', red: '🔴', gray: '⚪' }

/**
 * Path lỗi (BE trả theo section schema: buy./rotate./renew./ip./response./fetch. + key top-level)
 * → tab cần vào sửa trong modal. Path không khớp → KHÔNG hiện nút (không đoán bừa, tránh chỉ sai chỗ).
 */
const TAB_HINTS: { match: RegExp; tab: number; label: string }[] = [
  { match: /^buy\./, tab: 1, label: 'Mua proxy' },
  { match: /^response\./, tab: 1, label: 'Mua proxy' },
  { match: /^fetch\./, tab: 1, label: 'Mua proxy' },
  { match: /^rotate\./, tab: 2, label: 'Xoay proxy' },
  { match: /^ip\./, tab: 3, label: 'IP Whitelist' },
  { match: /^renew\./, tab: 4, label: 'Gia hạn' },
  { match: /^(kind|residential)/, tab: 5, label: 'Residential' }
]

const findTabHint = (path?: string) => (path ? TAB_HINTS.find(h => h.match.test(path)) : undefined)

/** Khối có tiêu đề — mỗi phần 1 Paper cho thoáng, không nhồi. */
const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <Paper variant='outlined' sx={{ p: 2.5, mb: 2.5, borderRadius: 1 }}>
    <Typography variant='subtitle1' fontWeight={600} sx={{ mb: 1.5 }}>
      {title}
    </Typography>
    {children}
  </Paper>
)

/** 1 lỗi/cảnh báo: nói NGHĨA + nút nhảy thẳng tới tab cần sửa. */
const IssueAlert = ({
  issue,
  severity,
  onGoToTab
}: {
  issue: ValidateIssue
  severity: 'error' | 'warning'
  onGoToTab?: (tab: number) => void
}) => {
  const hint = findTabHint(issue.path)

  return (
    <Alert
      severity={severity}
      sx={{ mb: 1, '& .MuiAlert-message': { minWidth: 0, wordBreak: 'break-word' } }}
      action={
        hint && onGoToTab ? (
          <Button type='button' size='small' color='inherit' onClick={() => onGoToTab(hint.tab)} sx={{ whiteSpace: 'nowrap' }}>
            Sửa ở tab {hint.label}
          </Button>
        ) : undefined
      }
    >
      <AlertTitle sx={{ fontSize: '0.85rem', mb: 0.25 }}>{issue.path}</AlertTitle>
      <Typography variant='caption'>{issue.message}</Typography>
    </Alert>
  )
}

interface Props {
  code?: string
  providerId?: number

  /** Nhảy sang tab khác trong modal (nút "Sửa ở tab ..."). */
  onGoToTab?: (tab: number) => void
}

/**
 * Tab "🔍 Kiểm tra" trong modal Provider (edit mode): thẻ đọc-trước → cảnh báo thay đổi →
 * kết quả kiểm cấu hình → test thử an toàn $0. Full-width, KHÔNG sticky (bug đè cột config 25/07).
 */
export default function ConfigToolPanel({ code, providerId, onGoToTab }: Props) {
  const { data: validate, isLoading: vLoading } = useValidateConfig(code)
  const { data: card, isLoading: cLoading } = useConfigCard(code)
  const { data: allServiceTypes } = useServiceTypes()
  const testMutation = useTestConfig()

  const [productId, setProductId] = useState('')
  const [live, setLive] = useState(false)

  if (!code) return null

  // Sản phẩm (type_service) của NCC này → dropdown chọn để Test.
  const products = Array.isArray(allServiceTypes)
    ? allServiceTypes.filter((s: any) => Number(s.provider_id) === Number(providerId))
    : []

  const errors = validate?.errors ?? []
  const warnings = validate?.warnings ?? []

  // BE liệt kê RIÊNG từng key top-level ngoài schema (kind, timeout, base_url, isp_tariffs...) —
  // 8 thẻ giống hệt nhau lấp hết panel. Gom 1 thẻ, vẫn liệt kê đủ tên key, không giấu gì.
  const isUnknownTopKey = (w: ValidateIssue) => !w.path.includes('.') && w.message.includes('ngoài schema')
  const unknownKeys = warnings.filter(isUnknownTopKey)
  const fieldWarnings = warnings.filter(w => !isUnknownTopKey(w))

  // BE nhét cảnh báo thay đổi vào CẢ `lines` (dòng bắt đầu bằng ⚠) lẫn `changes`.
  // → lọc khỏi thẻ tóm tắt, chỉ hiện 1 lần bằng Alert cho nổi bật (tránh hiện 2 lần).
  const cardLines = (card?.lines ?? []).filter(l => !l.trim().startsWith('⚠'))
  const changeLines = (card?.lines ?? []).filter(l => l.trim().startsWith('⚠'))
  const changes = card?.changes ?? []

  const runTest = () => {
    const pid = Number(productId)

    if (!pid) return
    testMutation.mutate({ code, product_id: pid, live })
  }

  return (
    <Box sx={{ maxWidth: 1100, pb: 2 }}>
      {/* ─── 1. Đọc nhanh (thẻ tóm tắt tiếng người) ─── */}
      <Section title='📄 Đọc nhanh — nhà cung cấp này bán kiểu gì'>
        {cLoading ? (
          <CircularProgress size={18} />
        ) : cardLines.length > 0 ? (
          <Box
            sx={{
              bgcolor: 'action.hover',
              borderRadius: 1,
              p: 2,
              fontSize: '0.875rem',
              lineHeight: 1.9,
              wordBreak: 'break-word'
            }}
          >
            {cardLines.map((line, i) => (
              <Box key={i} component='div'>
                {line}
              </Box>
            ))}
          </Box>
        ) : (
          <Typography variant='body2' color='text.secondary'>
            Chưa đọc được cấu hình.
          </Typography>
        )}
      </Section>

      {/* ─── 2. Thay đổi so lần trước (diff-guard) — thứ chặn sự cố đổi nhầm cấu hình ─── */}
      {(changes.length > 0 || changeLines.length > 0) && (
        <Section title='⚠️ Thay đổi so với lần lưu trước'>
          {changes.length > 0
            ? changes.map((c, i) => {
                const hint = findTabHint(c.path)

                return (
                  <Alert
                    key={i}
                    severity={c.severity === 'red' ? 'error' : 'warning'}
                    sx={{ mb: 1, '& .MuiAlert-message': { minWidth: 0, wordBreak: 'break-word' } }}
                    action={
                      hint && onGoToTab ? (
                        <Button
                          type='button'
                          size='small'
                          color='inherit'
                          onClick={() => onGoToTab(hint.tab)}
                          sx={{ whiteSpace: 'nowrap' }}
                        >
                          Xem tab {hint.label}
                        </Button>
                      ) : undefined
                    }
                  >
                    <AlertTitle sx={{ fontSize: '0.85rem', mb: 0.25 }}>{c.label || c.path}</AlertTitle>
                    <Typography variant='caption'>{c.message}</Typography>
                  </Alert>
                )
              })
            : changeLines.map((l, i) => (
                <Alert key={i} severity='warning' sx={{ mb: 1 }}>
                  <Typography variant='caption'>{l}</Typography>
                </Alert>
              ))}
          <Typography variant='caption' color='text.secondary'>
            Đây là các mục trọng yếu (URL, handler, định dạng proxy…) — đổi nhầm là đơn hàng đi sai nhà cung cấp.
            Nếu anh cố ý đổi thì bỏ qua.
          </Typography>
        </Section>
      )}

      {/* ─── 3. Kết quả kiểm cấu hình ─── */}
      <Section title='Kết quả kiểm tra cấu hình'>
        {vLoading ? (
          <CircularProgress size={18} />
        ) : validate?.skipped ? (
          <Alert severity='info'>
            Nhà cung cấp này <b>không chạy theo cấu hình</b> (dùng code riêng) — không có gì để kiểm.
          </Alert>
        ) : errors.length === 0 && warnings.length === 0 ? (
          <Alert severity='success'>🟢 Cấu hình hợp lệ — không phát hiện vấn đề.</Alert>
        ) : (
          <>
            {errors.map((e, i) => (
              <IssueAlert key={`e${i}`} issue={e} severity='error' onGoToTab={onGoToTab} />
            ))}
            {fieldWarnings.map((w, i) => (
              <IssueAlert key={`w${i}`} issue={w} severity='warning' onGoToTab={onGoToTab} />
            ))}
            {unknownKeys.length > 0 && (
              <Alert severity='warning' sx={{ mb: 1 }}>
                <AlertTitle sx={{ fontSize: '0.85rem', mb: 0.25 }}>
                  {unknownKeys.length} mục cấu hình nằm ngoài danh mục kiểm
                </AlertTitle>
                <Typography variant='caption' component='div' sx={{ wordBreak: 'break-word' }}>
                  {unknownKeys.map(w => w.path).join(', ')}
                </Typography>
                <Typography variant='caption' component='div' sx={{ mt: 0.5 }}>
                  Máy chưa mô hình hoá các mục này nên <b>không kiểm được</b> — không phải lỗi. Chỉ cần liếc xem có
                  tên nào gõ sai không.
                </Typography>
              </Alert>
            )}
            <Typography variant='caption' color='text.secondary'>
              🔴 chắc chắn sai, phải sửa · 🟡 nên kiểm lại (có thể là field mới hoặc gõ sai tên).
            </Typography>
          </>
        )}
      </Section>

      {/* ─── 4. Test thử ─── */}
      <Section title='Test thử — an toàn, KHÔNG mua gì ($0)'>
        <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
          Dựng thử lệnh mua để xem gửi đi những gì (chỉ dựng, không gửi). Tick “gọi thật” để gọi thêm vài
          endpoint chỉ-đọc của nhà cung cấp (xem số dư / danh mục) — vẫn không mua.
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
          <FormControl size='small' sx={{ minWidth: 260 }}>
            <InputLabel>Chọn sản phẩm</InputLabel>
            <Select label='Chọn sản phẩm' value={productId} onChange={e => setProductId(String(e.target.value))}>
              {products.length === 0 && (
                <MenuItem value='' disabled>
                  (Nhà cung cấp chưa có sản phẩm)
                </MenuItem>
              )}
              {products.map((p: any) => (
                <MenuItem key={p.id} value={String(p.id)}>
                  {p.name || `#${p.id}`}
                  <Typography component='span' variant='caption' sx={{ ml: 0.5, color: 'text.secondary' }}>
                    #{p.id}
                  </Typography>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControlLabel
            control={<Checkbox size='small' checked={live} onChange={e => setLive(e.target.checked)} />}
            label={<Typography variant='body2'>Gọi thật (endpoint chỉ-đọc)</Typography>}
          />
          <Button
            type='button'
            variant='contained'
            onClick={runTest}
            disabled={!productId || testMutation.isPending}
            sx={{ color: '#fff' }}
          >
            {testMutation.isPending ? 'Đang test...' : 'Test'}
          </Button>
        </Box>

        {testMutation.isError && (
          <Alert severity='error' sx={{ mb: 1 }}>
            {(testMutation.error as any)?.response?.data?.message || 'Lỗi khi test'}
          </Alert>
        )}

        {testMutation.data?.checks?.length ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {testMutation.data.checks.map((c: HarnessCheck, i: number) => (
              <Paper key={i} variant='outlined' sx={{ p: 1.5, borderRadius: 1 }}>
                <Chip
                  size='small'
                  color={STATUS_COLOR[c.status] || 'default'}
                  label={`${STATUS_ICON[c.status] || ''} ${c.name}`}
                  sx={{ mb: 0.75 }}
                />
                <Typography
                  variant='caption'
                  component='div'
                  sx={{ color: 'text.secondary', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                >
                  {c.detail}
                </Typography>
              </Paper>
            ))}
          </Box>
        ) : null}
      </Section>
    </Box>
  )
}
