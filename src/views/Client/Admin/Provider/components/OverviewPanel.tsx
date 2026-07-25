'use client'

import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Paper from '@mui/material/Paper'
import Alert from '@mui/material/Alert'
import AlertTitle from '@mui/material/AlertTitle'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'

import type { ConfigCard, ValidateResult } from '@/hooks/apis/useConfigTools'

/** Trạng thái 1 tab — khớp TabState bên ModalAddProvider */
type TabState = 'off' | 'ok' | 'missing'

interface Props {
  card?: ConfigCard
  cardLoading: boolean
  validate?: ValidateResult
  tabStatus: TabState[]
  tabLabels: string[]

  /** Thiếu gì thì bấm nhảy thẳng tới tab đó */
  onGoToTab: (tab: number) => void

  /** Mở tab Kiểm tra (validate chi tiết + test thử) */
  onOpenCheck: () => void
}

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <Paper variant='outlined' sx={{ p: 2.5, mb: 2.5, borderRadius: 1 }}>
    <Typography variant='subtitle1' fontWeight={600} sx={{ mb: 1.5 }}>
      {title}
    </Typography>
    {children}
  </Paper>
)

/**
 * Màn ĐẦU TIÊN khi mở sửa 1 NCC: nhìn 5 giây biết NCC này bán kiểu gì, đang thiếu gì,
 * có gì mới đổi — thay vì phải lần lượt bấm từng tab hoặc đọc JSON.
 */
export default function OverviewPanel({
  card,
  cardLoading,
  validate,
  tabStatus,
  tabLabels,
  onGoToTab,
  onOpenCheck
}: Props) {
  // BE nhét cảnh báo thay đổi vào cả `lines` lẫn `changes` → lọc để không hiện 2 lần
  const cardLines = (card?.lines ?? []).filter(l => !l.trim().startsWith('⚠'))
  const changes = card?.changes ?? []

  // Tab nào đang bật mà thiếu field bắt buộc (bỏ tab 0 "Cơ bản" và tab cuối "Liên hệ")
  const missing = tabStatus
    .map((s, i) => ({ state: s, index: i }))
    .filter(t => t.state === 'missing' && t.index > 0)

  const on = tabStatus
    .map((s, i) => ({ state: s, index: i }))
    .filter(t => t.state === 'ok' && t.index > 0 && t.index < tabStatus.length - 1)

  const errors = validate?.errors ?? []

  return (
    <Box sx={{ maxWidth: 1100, pb: 2 }}>
      {/* 1. Đọc nhanh */}
      <Section title='📄 Nhà cung cấp này bán kiểu gì'>
        {cardLoading ? (
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
              <Box key={i}>{line}</Box>
            ))}
          </Box>
        ) : (
          <Typography variant='body2' color='text.secondary'>
            Chưa đọc được cấu hình của nhà cung cấp này.
          </Typography>
        )}
      </Section>

      {/* 2. Thay đổi so lần lưu trước — thứ chặn sự cố đổi nhầm cấu hình */}
      {changes.length > 0 && (
        <Section title='⚠️ Thay đổi so với lần lưu trước'>
          {changes.map((c, i) => (
            <Alert key={i} severity={c.severity === 'red' ? 'error' : 'warning'} sx={{ mb: 1 }}>
              <AlertTitle sx={{ fontSize: '0.85rem', mb: 0.25 }}>{c.label || c.path}</AlertTitle>
              <Typography variant='caption'>{c.message}</Typography>
            </Alert>
          ))}
          <Typography variant='caption' color='text.secondary'>
            Đổi nhầm mấy mục này là đơn hàng đi sai nhà cung cấp. Cố ý đổi thì bỏ qua.
          </Typography>
        </Section>
      )}

      {/* 3. Việc cần làm */}
      <Section title='Việc cần làm'>
        {missing.length === 0 && errors.length === 0 ? (
          <Alert severity='success'>Không thiếu gì — các phần đang bật đều đã có thông tin tối thiểu.</Alert>
        ) : (
          <>
            {missing.map(m => (
              <Alert
                key={m.index}
                severity='warning'
                sx={{ mb: 1 }}
                action={
                  <Button type='button' size='small' color='inherit' onClick={() => onGoToTab(m.index)}>
                    Sửa ngay
                  </Button>
                }
              >
                <b>{tabLabels[m.index]}</b> — đang bật nhưng chưa nhập đủ thông tin bắt buộc.
              </Alert>
            ))}
            {errors.length > 0 && (
              <Alert
                severity='error'
                action={
                  <Button type='button' size='small' color='inherit' onClick={onOpenCheck}>
                    Xem chi tiết
                  </Button>
                }
              >
                {errors.length} lỗi cấu hình cần sửa.
              </Alert>
            )}
          </>
        )}
      </Section>

      {/* 4. Đang bật những gì */}
      <Section title='Đang bật những gì'>
        {on.length === 0 ? (
          <Typography variant='body2' color='text.secondary'>
            Chưa bật phần nào — vào các tab bên trái để cấu hình.
          </Typography>
        ) : (
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {on.map(t => (
              <Chip
                key={t.index}
                size='small'
                color='success'
                variant='tonal'
                label={tabLabels[t.index]}
                onClick={() => onGoToTab(t.index)}
              />
            ))}
          </Box>
        )}
        <Box sx={{ mt: 2 }}>
          <Button type='button' size='small' variant='tonal' onClick={onOpenCheck}>
            Kiểm tra cấu hình &amp; test thử (an toàn, $0)
          </Button>
        </Box>
      </Section>
    </Box>
  )
}
