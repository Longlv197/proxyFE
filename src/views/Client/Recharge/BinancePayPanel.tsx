'use client'

import { useState } from 'react'

import { Alert, Box, Button, CircularProgress, TextField, Typography } from '@mui/material'
import { CheckCircle2, Clock, HelpCircle, XCircle } from 'lucide-react'

import { useBinanceClaims, useXinNhanKhoan } from '@/hooks/apis/useBinanceClaims'
import { useDepositNote } from '@/hooks/apis/usePaymentMethods'

/**
 * Nạp tiền qua Binance Pay + đường cứu "khoản tiền của tôi đâu?".
 *
 * VÌ SAO KHÔNG BẮT KHÁCH GÕ MÃ GIAO DỊCH: mã Binance dài (`M_P_71505104267788288`),
 * trên điện thoại gần như không copy nổi. Khách CHỌN khoản của mình trong danh sách rồi
 * khai tên tài khoản Binance — ngắn, dễ gõ, và đủ để admin đối chiếu.
 *
 * ⚠ Danh sách này chỉ có số tiền + giờ. Đừng hỏi máy chủ trả thêm tên người gửi để
 * "cho khách dễ nhận ra": đó là tên của khách KHÁC.
 */
const BinancePayPanel = () => {
  const [moDanhSach, setMoDanhSach] = useState(false)
  const [dangChon, setDangChon] = useState<number | null>(null)
  const [tenBinance, setTenBinance] = useState('')
  const [daGui, setDaGui] = useState(false)

  const { data, isLoading } = useBinanceClaims(moDanhSach)
  const { data: ghiChuCanDien = '' } = useDepositNote()
  const xinNhan = useXinNhanKhoan()

  const guiYeuCau = () => {
    if (!dangChon || !tenBinance.trim()) return

    xinNhan.mutate(
      { depositId: dangChon, binanceTen: tenBinance.trim() },
      {
        onSuccess: () => {
          // Phản hồi tại chỗ, KHÔNG dùng toast success (quy ước dự án).
          setDaGui(true)
          setDangChon(null)
          setTenBinance('')
        }
      }
    )
  }

  return (
    <Box
      sx={{
        background: 'var(--mui-palette-background-paper, #fff)',
        borderRadius: '12px',
        border: '1px solid var(--mui-palette-divider, #e2e8f0)',
        padding: '20px'
      }}
    >
      <Typography sx={{ fontWeight: 700, fontSize: 14, mb: 1.5 }}>Nạp tiền qua Binance Pay</Typography>

      <Alert severity='info' sx={{ mb: 2, fontSize: 13 }}>
        Khi chuyển tiền, hãy điền <strong>ghi chú</strong> đúng như sau — tiền sẽ tự cộng sau 1–5 phút:
        <Box
          component='code'
          sx={{
            display: 'inline-block',
            ml: 0.75,
            px: 1,
            py: 0.25,
            borderRadius: '6px',
            fontWeight: 700,
            background: 'var(--mui-palette-action-hover, rgba(0,0,0,0.06))'
          }}
        >
          {ghiChuCanDien}
        </Box>
      </Alert>

      {/* ── Đường cứu khi khách quên ghi chú ───────────────────────────── */}
      {!moDanhSach && (
        <Button
          variant='text'
          size='small'
          startIcon={<HelpCircle size={15} />}
          onClick={() => setMoDanhSach(true)}
          sx={{ textTransform: 'none', fontSize: 13, p: 0 }}
        >
          Đã chuyển tiền mà chưa được cộng?
        </Button>
      )}

      {moDanhSach && (
        <Box sx={{ mt: 1 }}>
          <Typography sx={{ fontWeight: 600, fontSize: 13, mb: 0.5 }}>
            Chọn khoản bạn vừa chuyển
          </Typography>
          <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 1.5 }}>
            Thường là do quên ghi chú nên máy không biết tiền của ai. Chọn đúng khoản của bạn rồi gửi
            yêu cầu — chúng tôi đối chiếu với Binance trước khi cộng tiền.
          </Typography>

          {isLoading && <CircularProgress size={18} />}

          {!isLoading && (data?.khoAnChuaCoChu?.length ?? 0) === 0 && (
            <Alert severity='success' sx={{ fontSize: 13 }}>
              Không có khoản nào đang chờ. Nếu bạn vừa chuyển tiền, hãy đợi vài phút rồi tải lại trang.
            </Alert>
          )}

          {!isLoading &&
            (data?.khoAnChuaCoChu?.length ?? 0) > 0 && (
              <>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2 }}>
                  {data!.khoAnChuaCoChu.map(k => {
                    const dangBamChon = dangChon === k.id

                    return (
                      <Box
                        key={k.id}
                        onClick={() => setDangChon(k.id)}
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: 1,
                          px: 1.5,
                          py: 1.25,
                          cursor: 'pointer',
                          borderRadius: '8px',
                          border: dangBamChon
                            ? '2px solid var(--primary-color)'
                            : '1px solid var(--mui-palette-divider, #e2e8f0)',
                          background: dangBamChon
                            ? 'var(--mui-palette-action-selected, rgba(0,0,0,0.04))'
                            : 'transparent'
                        }}
                      >
                        <Typography sx={{ fontWeight: 700, fontSize: 14 }}>{k.amount_usdt} USDT</Typography>
                        <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{k.luc}</Typography>
                      </Box>
                    )
                  })}
                </Box>

                <TextField
                  fullWidth
                  size='small'
                  label='Tên hoặc ID tài khoản Binance của bạn'
                  placeholder='Ví dụ: Nguyen Van A — hoặc 88001122'
                  value={tenBinance}
                  onChange={e => setTenBinance(e.target.value)}
                  helperText='Dùng để đối chiếu bạn đúng là người đã chuyển khoản tiền này.'
                  sx={{ mb: 1.5 }}
                />

                {xinNhan.isError && (
                  <Alert severity='error' sx={{ mb: 1.5, fontSize: 13 }}>
                    {(xinNhan.error as any)?.response?.data?.message ?? 'Không gửi được yêu cầu.'}
                  </Alert>
                )}

                {daGui && (
                  <Alert severity='success' icon={<CheckCircle2 size={18} />} sx={{ mb: 1.5, fontSize: 13 }}>
                    Đã ghi nhận. Yêu cầu của bạn đang chờ xác nhận — tiền sẽ vào ví sau khi được duyệt.
                  </Alert>
                )}

                <Button
                  variant='contained'
                  disabled={!dangChon || !tenBinance.trim() || xinNhan.isPending}
                  onClick={guiYeuCau}
                  sx={{ textTransform: 'none' }}
                >
                  {xinNhan.isPending ? 'Đang gửi…' : 'Đây là khoản của tôi'}
                </Button>
              </>
            )}

          {/* Các lần khách này đã xin — để khách theo dõi, không phải hỏi hỗ trợ. */}
          {(data?.donXinCuaToi?.length ?? 0) > 0 && (
            <Box sx={{ mt: 2.5 }}>
              <Typography sx={{ fontWeight: 600, fontSize: 13, mb: 1 }}>Yêu cầu của bạn</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                {data!.donXinCuaToi.map(d => (
                  <Box key={d.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, fontSize: 13 }}>
                    {d.trang_thai === 'da_cong' && <CheckCircle2 size={15} color='var(--mui-palette-success-main)' />}
                    {d.trang_thai === 'dang_cho' && <Clock size={15} color='var(--mui-palette-warning-main)' />}
                    {d.trang_thai === 'tu_choi' && <XCircle size={15} color='var(--mui-palette-error-main)' />}
                    <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{d.amount_usdt} USDT</Typography>
                    <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                      {d.luc_xin}
                      {' · '}
                      {d.trang_thai === 'da_cong'
                        ? 'đã cộng tiền'
                        : d.trang_thai === 'tu_choi'
                          ? 'không được chấp nhận'
                          : 'đang chờ xác nhận'}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          )}
        </Box>
      )}
    </Box>
  )
}

export default BinancePayPanel
