'use client'

import { useState } from 'react'

import { Alert, Box, Button, TextField, Typography } from '@mui/material'
import { CheckCircle2, Clock, Copy, HelpCircle, XCircle } from 'lucide-react'

import { useCopy } from '@/app/hooks/useCopy'
import { useBinanceClaims, useXinNhanKhoan } from '@/hooks/apis/useBinanceClaims'
import { useDepositNote, type BinanceReceiver } from '@/hooks/apis/usePaymentMethods'

const dinhDangVnd = (n: number) => new Intl.NumberFormat('vi-VN').format(Math.floor(n))

/** Một dòng "nhãn: giá trị [sao chép]" — khách phải chép CHÍNH XÁC Pay ID và ghi chú. */
const DongSaoChep = ({ nhan, giaTri, onCopy }: { nhan: string; giaTri: string; onCopy: () => void }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
    <Typography sx={{ fontSize: 13, color: 'text.secondary', minWidth: 110 }}>{nhan}</Typography>
    <Box
      component='code'
      sx={{ px: 1, py: 0.25, borderRadius: '6px', fontWeight: 700, fontSize: 14, background: 'var(--mui-palette-action-hover, rgba(0,0,0,0.06))' }}
    >
      {giaTri}
    </Box>
    <Button size='small' startIcon={<Copy size={13} />} onClick={onCopy} sx={{ textTransform: 'none', minWidth: 0 }}>
      Sao chép
    </Button>
  </Box>
)

/**
 * Nạp tiền qua Binance Pay + đường cứu "tiền của tôi đâu?".
 *
 * ⚠ KHÔNG hiện danh sách khoản chưa có chủ. Bản đầu có, và nó phải phơi số tiền + giờ của
 * khách khác cho mọi người xem; bằng chứng lại chỉ là tên tài khoản — mà Binance che tên
 * (`Tran V***`) nên ai gõ "Tran" cũng khớp. Nay khách khai MÃ GIAO DỊCH: chỉ người đã
 * chuyển tiền mới thấy nó trong lịch sử Binance của chính họ. Đừng thêm lại danh sách.
 */
const BinancePayPanel = ({ receiver }: { receiver?: BinanceReceiver }) => {
  const [moForm, setMoForm] = useState(false)
  const [maGiaoDich, setMaGiaoDich] = useState('')
  const [ketQua, setKetQua] = useState<{ daCong: boolean; soTien: number | null; loi?: string } | null>(null)

  const { data } = useBinanceClaims(moForm)
  const { data: ghiChuCanDien = '' } = useDepositNote()
  const xinNhan = useXinNhanKhoan()
  const [, copy] = useCopy()

  const apiBase = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/api\/?$/, '')
  const qr = receiver?.qr_url ? (receiver.qr_url.startsWith('http') ? receiver.qr_url : `${apiBase}${receiver.qr_url}`) : ''
  const tyGia = receiver?.rate_vnd ?? 0
  const toiThieu = receiver?.min_usdt ?? 0

  const gui = () => {
    const ma = maGiaoDich.trim()

    if (!ma) return

    setKetQua(null)
    xinNhan.mutate(
      { transactionId: ma },
      {
        // Phản hồi tại chỗ, KHÔNG dùng toast success (quy ước dự án).
        onSuccess: res => {
          setKetQua({ daCong: !!res?.da_cong, soTien: res?.so_tien_vnd ?? null })
          setMaGiaoDich('')
        },
        onError: (e: any) =>
          setKetQua({ daCong: false, soTien: null, loi: e?.response?.data?.message ?? 'Không gửi được yêu cầu.' })
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

      <Box sx={{ display: 'flex', gap: 2.5, flexWrap: 'wrap', alignItems: 'flex-start', mb: 2 }}>
        <Box sx={{ flex: 1, minWidth: 260, display: 'flex', flexDirection: 'column', gap: 1.25 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 600 }}>
            1. Mở app Binance → <strong>Pay</strong> → <strong>Gửi</strong>, chuyển USDT tới:
          </Typography>
          {receiver?.pay_id && (
            <DongSaoChep nhan='Pay ID / Binance ID' giaTri={receiver.pay_id} onCopy={() => copy(receiver.pay_id)} />
          )}
          {receiver?.name && (
            <Typography sx={{ fontSize: 13 }}>
              Tên người nhận hiện trên app: <strong>{receiver.name}</strong> — sai tên thì đừng chuyển.
            </Typography>
          )}

          <Typography sx={{ fontSize: 13, fontWeight: 600, mt: 0.5 }}>
            2. Ở ô <strong>Ghi chú</strong>, điền chính xác:
          </Typography>
          <DongSaoChep nhan='Ghi chú' giaTri={ghiChuCanDien} onCopy={() => copy(ghiChuCanDien)} />

          <Typography sx={{ fontSize: 13, fontWeight: 600, mt: 0.5 }}>3. Tiền tự cộng vào ví sau 1–5 phút.</Typography>
          {tyGia > 0 && (
            <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
              Tỷ giá: 1 USDT = <strong>{dinhDangVnd(tyGia)}đ</strong>
              {toiThieu > 0 && (
                <>
                  {' · '}Tối thiểu <strong>{toiThieu} USDT</strong> ({dinhDangVnd(toiThieu * tyGia)}đ)
                </>
              )}
              {' · '}VD: 10 USDT = {dinhDangVnd(10 * tyGia)}đ
            </Typography>
          )}
        </Box>

        {qr && (
          <Box sx={{ textAlign: 'center' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qr} alt='QR Binance Pay' style={{ width: 180, maxWidth: '100%', borderRadius: 8, border: '1px solid var(--mui-palette-divider)' }} />
            <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>Hoặc quét mã trong app Binance</Typography>
          </Box>
        )}
      </Box>

      <Alert severity='warning' sx={{ mb: 2, fontSize: 13 }}>
        Quên ghi chú hoặc ghi sai thì tiền <strong>không tự cộng</strong> — bấm &quot;Đã chuyển tiền mà chưa được
        cộng?&quot; bên dưới và dán mã giao dịch.
        {toiThieu > 0 && ` Chuyển dưới ${toiThieu} USDT sẽ phải chờ admin duyệt tay.`}
      </Alert>

      {/* ── Đường cứu khi khách quên ghi chú ───────────────────────────── */}
      {!moForm && (
        <Button
          variant='text'
          size='small'
          startIcon={<HelpCircle size={15} />}
          onClick={() => setMoForm(true)}
          sx={{ textTransform: 'none', fontSize: 13, p: 0 }}
        >
          Đã chuyển tiền mà chưa được cộng?
        </Button>
      )}

      {moForm && (
        <Box sx={{ mt: 1 }}>
          <Typography sx={{ fontWeight: 600, fontSize: 13, mb: 0.5 }}>Điền mã giao dịch Binance</Typography>
          <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 1.5 }}>
            Mở ứng dụng Binance → <strong>Lịch sử giao dịch</strong> → chọn lệnh chuyển tiền vừa rồi →
            bấm sao chép ở dòng <strong>mã giao dịch</strong> rồi dán vào đây. Chúng tôi đối chiếu trực
            tiếp với Binance, nên chỉ bạn — người đã chuyển tiền — mới nhận được khoản này.
          </Typography>

          <TextField
            fullWidth
            size='small'
            label='Mã giao dịch'
            placeholder='Ví dụ: M_P_71505104267788288'
            value={maGiaoDich}
            onChange={e => setMaGiaoDich(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && gui()}
            sx={{ mb: 1.5, '& input': { fontFamily: 'monospace' } }}
          />

          {ketQua?.loi && (
            <Alert severity='error' sx={{ mb: 1.5, fontSize: 13 }}>
              {ketQua.loi}
            </Alert>
          )}

          {ketQua && !ketQua.loi && (
            <Alert
              severity={ketQua.daCong ? 'success' : 'info'}
              icon={ketQua.daCong ? <CheckCircle2 size={18} /> : <Clock size={18} />}
              sx={{ mb: 1.5, fontSize: 13 }}
            >
              {ketQua.daCong
                ? `Đã cộng ${(ketQua.soTien ?? 0).toLocaleString('vi-VN')}đ vào ví của bạn.`
                : 'Đã nhận yêu cầu. Khoản này cần được duyệt tay — chúng tôi sẽ xử lý sớm.'}
            </Alert>
          )}

          <Button
            variant='contained'
            disabled={!maGiaoDich.trim() || xinNhan.isPending}
            onClick={gui}
            sx={{ textTransform: 'none' }}
          >
            {xinNhan.isPending ? 'Đang kiểm tra…' : 'Kiểm tra và cộng tiền'}
          </Button>

          {/* Các lần khách này đã khai — để khách theo dõi, không phải hỏi hỗ trợ. */}
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
                          : 'đang chờ duyệt'}
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
