'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

import { Alert, Box, Button, Chip, CircularProgress, TextField, Typography } from '@mui/material'
import { CheckCircle2, Clock, Copy, HelpCircle, Plus, XCircle } from 'lucide-react'

import { useCopy } from '@/app/hooks/useCopy'
import { useBinanceClaims, useXinNhanKhoan } from '@/hooks/apis/useBinanceClaims'
import {
  useBinanceBills,
  useHuyBill,
  useLamMoiSoDu,
  useTaoBill,
  useXacNhanBill,
  type BillNapBinance
} from '@/hooks/apis/useBinanceBills'
import { type BinanceReceiver } from '@/hooks/apis/usePaymentMethods'

const vnd = (n: number) => new Intl.NumberFormat('vi-VN').format(Math.floor(n))

const khung = {
  background: 'var(--mui-palette-background-paper, #fff)',
  borderRadius: '12px',
  border: '1px solid var(--mui-palette-divider, #e2e8f0)',
  padding: '20px'
}

/** Một dòng "nhãn: giá trị [sao chép]" — khách phải chép CHÍNH XÁC Pay ID, số tiền, ghi chú. */
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

const NHAN_TRANG_THAI: Record<BillNapBinance['trang_thai'], { nhan: string; mau: 'default' | 'info' | 'warning' | 'success' | 'error' }> = {
  open: { nhan: 'Chờ chuyển tiền', mau: 'info' },
  expired: { nhan: 'Quá hạn giữ tỷ giá', mau: 'default' },
  mismatch: { nhan: 'Lệch số tiền — cần mã giao dịch', mau: 'warning' },
  completed: { nhan: 'Đã cộng tiền', mau: 'success' },
  cancelled: { nhan: 'Đã huỷ', mau: 'default' }
}

const useDemNguoc = (hetHan: string | null, chay: boolean) => {
  const [bayGio, setBayGio] = useState(() => Date.now())

  useEffect(() => {
    if (!chay) return
    const t = setInterval(() => setBayGio(Date.now()), 1000)

    return () => clearInterval(t)
  }, [chay])

  if (!hetHan) return null
  const con = Math.max(0, Math.floor((new Date(hetHan).getTime() - bayGio) / 1000))

  return `${String(Math.floor(con / 60)).padStart(2, '0')}:${String(con % 60).padStart(2, '0')}`
}

/** Ô dán mã giao dịch cho MỘT bill (lệch số tiền / quên ghi chú). */
const ODanMa = ({ bill }: { bill: BillNapBinance }) => {
  const [ma, setMa] = useState('')
  const [kq, setKq] = useState<{ ok: boolean; loi?: boolean; text: string } | null>(null)
  const xacNhan = useXacNhanBill()

  const gui = () => {
    const m = ma.trim()

    if (!m) return
    setKq(null)
    xacNhan.mutate(
      { id: bill.id, transactionId: m },
      {
        onSuccess: res => {
          setMa('')
          setKq({
            ok: !!res?.da_cong,
            text: res?.da_cong
              ? `Đã cộng ${vnd(res?.so_tien_vnd ?? 0)}đ vào ví của bạn.`
              : res?.message ?? 'Đã nhận yêu cầu, chờ admin duyệt.'
          })
        },
        onError: (e: any) => setKq({ ok: false, loi: true, text: e?.response?.data?.message ?? 'Không gửi được yêu cầu.' })
      }
    )
  }

  return (
    <Box sx={{ mt: 1.5 }}>
      <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 1 }}>
        Mở Binance → <strong>Lịch sử giao dịch</strong> → chọn lệnh chuyển tiền → sao chép <strong>mã giao dịch</strong>. Chúng tôi
        đối chiếu trực tiếp với Binance và cộng đúng số tiền bạn đã chuyển. Mỗi bill chỉ xác nhận được một lần.
      </Typography>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <TextField
          size='small'
          label='Mã giao dịch Binance'
          placeholder='Ví dụ: M_P_71505104267788288'
          value={ma}
          onChange={e => setMa(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && gui()}
          sx={{ flex: 1, minWidth: 220, '& input': { fontFamily: 'monospace' } }}
        />
        <Button variant='contained' disabled={!ma.trim() || xacNhan.isPending} onClick={gui} sx={{ textTransform: 'none' }}>
          {xacNhan.isPending ? 'Đang kiểm tra…' : 'Xác nhận'}
        </Button>
      </Box>
      {kq && (
        <Alert severity={kq.ok ? 'success' : kq.loi ? 'error' : 'info'} sx={{ mt: 1, fontSize: 13 }}>
          {kq.text}
        </Alert>
      )}
    </Box>
  )
}

/** Ba con số của bill: muốn nạp · coin thực nhận · thực cộng. */
const BaConSo = ({ bill }: { bill: BillNapBinance }) => {
  const k = bill.da_cong

  if (!k) return null
  const chenh = bill.chenh_lech_usdt ?? 0

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: 1.5, mt: 1, width: '100%', wordBreak: 'break-word' }}>
      <Box>
        <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>Muốn nạp</Typography>
        <Typography sx={{ fontWeight: 700 }}>{bill.usdt_muon_nap} USDT</Typography>
      </Box>
      <Box>
        <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>Thực nhận</Typography>
        <Typography sx={{ fontWeight: 700 }}>
          {k.so_coin_nhan} {k.coin}
          {chenh !== 0 && (
            <Typography component='span' sx={{ fontSize: 12, ml: 0.5, color: chenh > 0 ? 'success.main' : 'warning.main' }}>
              ({chenh > 0 ? 'thừa' : 'thiếu'} {Math.abs(chenh)})
            </Typography>
          )}
        </Typography>
      </Box>
      <Box>
        <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>Thực cộng</Typography>
        <Typography sx={{ fontWeight: 700 }}>
          {k.usdt_quy_doi} USDT × {vnd(k.ty_gia)} = {vnd(k.vnd_da_cong ?? 0)}đ
        </Typography>
      </Box>
      <Box sx={{ gridColumn: '1 / -1' }}>
        <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
          Mã giao dịch Binance: <code>{k.transaction_id}</code>
          {k.luc_cong && ` · cộng lúc ${k.luc_cong}`}
        </Typography>
      </Box>
    </Box>
  )
}

const TheBill = ({ bill, receiver, onDong }: { bill: BillNapBinance; receiver?: BinanceReceiver; onDong: () => void }) => {
  const [, copy] = useCopy()
  const huy = useHuyBill()
  const [moDanMa, setMoDanMa] = useState(false)
  const demNguoc = useDemNguoc(bill.het_han_luc, bill.trang_thai === 'open')
  const tt = NHAN_TRANG_THAI[bill.trang_thai]
  const choTien = bill.trang_thai === 'open' || bill.trang_thai === 'expired'

  const apiBase = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/api\/?$/, '')
  const qr = receiver?.qr_url ? (receiver.qr_url.startsWith('http') ? receiver.qr_url : `${apiBase}${receiver.qr_url}`) : ''

  return (
    <Box sx={{ border: '1px solid var(--mui-palette-divider)', borderRadius: '10px', p: 2, mb: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 1.5 }}>
        <Typography sx={{ fontWeight: 700 }}>Bill {bill.code}</Typography>
        <Chip size='small' label={tt.nhan} color={tt.mau} />
        <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>tạo lúc {bill.tao_luc}</Typography>
        <Box sx={{ flex: 1 }} />
        <Button size='small' onClick={onDong} sx={{ textTransform: 'none' }}>
          Đóng
        </Button>
      </Box>

      {choTien && (
        <Box sx={{ display: 'flex', gap: 2.5, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <Box sx={{ flex: 1, minWidth: 260, display: 'flex', flexDirection: 'column', gap: 1.25 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 600 }}>
              1. Mở app Binance → <strong>Pay</strong> → <strong>Gửi</strong> tới:
            </Typography>
            {receiver?.pay_id ? (
              <DongSaoChep nhan='Pay ID / Binance ID' giaTri={receiver.pay_id} onCopy={() => copy(receiver.pay_id)} />
            ) : (
              <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>Liên hệ hỗ trợ để nhận Pay ID tài khoản nhận tiền.</Typography>
            )}
            {receiver?.name && (
              <Typography sx={{ fontSize: 13 }}>
                Tên người nhận hiện trên app: <strong>{receiver.name}</strong> — sai tên thì đừng chuyển.
              </Typography>
            )}

            <Typography sx={{ fontSize: 13, fontWeight: 600, mt: 0.5 }}>2. Chuyển ĐÚNG số tiền:</Typography>
            <DongSaoChep nhan='Số tiền' giaTri={`${bill.usdt_muon_nap} USDT`} onCopy={() => copy(bill.usdt_muon_nap)} />
            <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
              = {vnd(bill.vnd_du_kien)}đ (tỷ giá {vnd(bill.ty_gia)}đ/USDT). Chỉ nhận <strong>USDT</strong>.
            </Typography>

            <Typography sx={{ fontSize: 13, fontWeight: 600, mt: 0.5 }}>
              3. Ở ô <strong>Ghi chú</strong>, điền chính xác:
            </Typography>
            <DongSaoChep nhan='Ghi chú' giaTri={bill.ghi_chu} onCopy={() => copy(bill.ghi_chu)} />

            {bill.trang_thai === 'open' ? (
              <Alert severity='info' icon={<Clock size={18} />} sx={{ fontSize: 13, mt: 0.5 }}>
                Đang chờ tiền về — trang tự cập nhật. Giữ tỷ giá còn <strong>{demNguoc}</strong>.
              </Alert>
            ) : (
              <Alert severity='warning' sx={{ fontSize: 13, mt: 0.5 }}>
                Bill đã quá hạn giữ tỷ giá. Nếu bạn đã chuyển, tiền về trong 24 giờ vẫn được cộng theo tỷ giá hiện tại.
                Chưa chuyển thì hãy tạo bill mới.
              </Alert>
            )}
          </Box>

          {qr && (
            <Box sx={{ textAlign: 'center' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qr} alt='QR Binance Pay' style={{ width: 180, maxWidth: '100%', borderRadius: 8, border: '1px solid var(--mui-palette-divider)' }} />
              <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>Quét trong app Binance</Typography>
            </Box>
          )}
        </Box>
      )}

      {bill.trang_thai === 'mismatch' && (
        <>
          <Alert severity='warning' sx={{ fontSize: 13 }}>
            Tiền đã về nhưng <strong>khác số trên bill</strong>
            {bill.cac_khoan[0] && (
              <>
                {' '}
                (bill {bill.usdt_muon_nap} USDT, nhận {bill.cac_khoan[0].so_coin_nhan} {bill.cac_khoan[0].coin})
              </>
            )}
            . Dán mã giao dịch Binance để xác nhận — chúng tôi cộng đúng số bạn đã chuyển.
          </Alert>
          <ODanMa bill={bill} />
        </>
      )}

      {bill.trang_thai === 'completed' && (
        <Alert
          severity='success'
          icon={<CheckCircle2 size={18} />}
          sx={{ fontSize: 13, '& .MuiAlert-message': { flex: 1, minWidth: 0, overflow: 'visible' } }}
        >
          Đã cộng tiền vào ví{bill.xong_luc ? ` lúc ${bill.xong_luc}` : ''}.
          <BaConSo bill={bill} />
        </Alert>
      )}

      {/* Khoản tiền về thêm cùng mã bill (đã chốt rồi) — hiện ra cho minh bạch. */}
      {bill.cac_khoan.filter(k => k.transaction_id !== bill.da_cong?.transaction_id && k.trang_thai === 'pending').length > 0 &&
        bill.trang_thai === 'completed' && (
          <Alert severity='info' sx={{ fontSize: 13, mt: 1 }}>
            Có thêm khoản tiền mang mã bill này — mỗi bill chỉ xử lý một lần nên khoản đó đang chờ admin duyệt.
          </Alert>
        )}

      {choTien && (
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1.5 }}>
          {!moDanMa && (
            <Button size='small' startIcon={<HelpCircle size={15} />} onClick={() => setMoDanMa(true)} sx={{ textTransform: 'none' }}>
              Đã chuyển nhưng quên hoặc ghi sai ghi chú?
            </Button>
          )}
          {bill.trang_thai === 'open' && (
            <Button size='small' color='inherit' disabled={huy.isPending} onClick={() => huy.mutate(bill.id)} sx={{ textTransform: 'none' }}>
              Huỷ bill
            </Button>
          )}
        </Box>
      )}
      {choTien && moDanMa && <ODanMa bill={bill} />}
    </Box>
  )
}

/**
 * Nạp tiền qua Binance Pay bằng BILL (anh Long 13/10).
 *
 * Luật (máy chủ quyết, FE chỉ vẽ): đúng ghi chú + đúng số → tự cộng · lệch số → khách dán mã giao dịch,
 * cộng theo số thực nhận · mỗi bill chốt 1 lần · tỷ giá admin đặt, giữ 30 phút theo bill.
 *
 * ⚠ KHÔNG hiện danh sách khoản chưa có chủ — chỉ bill của chính khách (xem BinanceClaimService).
 */
const BinancePayPanel = ({ receiver }: { receiver?: BinanceReceiver }) => {
  const { data: bills = [], isLoading } = useBinanceBills()
  const taoBill = useTaoBill()
  const lamMoiSoDu = useLamMoiSoDu()

  const [soUsdt, setSoUsdt] = useState('')
  const [loiTao, setLoiTao] = useState('')
  const [dangXem, setDangXem] = useState<number | null>(null)

  const tyGia = receiver?.rate_vnd ?? 0
  const toiThieu = receiver?.min_usdt ?? 0

  // Mặc định mở bill đang dở (chờ tiền / lệch) gần nhất.
  const billXem = useMemo(() => {
    if (dangXem === -1) return null
    if (dangXem) return bills.find(b => b.id === dangXem) ?? null

    return bills.find(b => b.trang_thai === 'open' || b.trang_thai === 'mismatch') ?? null
  }, [bills, dangXem])

  // Bill vừa chuyển sang "đã cộng" (do máy quét) → làm mới số dư trên đầu trang.
  const truoc = useRef<Map<number, string>>(new Map())

  useEffect(() => {
    const moi = new Map(bills.map(b => [b.id, b.trang_thai as string]))

    if (bills.some(b => b.trang_thai === 'completed' && truoc.current.has(b.id) && truoc.current.get(b.id) !== 'completed')) {
      lamMoiSoDu()
    }

    truoc.current = moi
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bills])

  const tao = () => {
    setLoiTao('')
    taoBill.mutate(soUsdt.trim(), {
      onSuccess: b => {
        setSoUsdt('')
        setDangXem(b?.id ?? null)
      },
      onError: (e: any) => setLoiTao(e?.response?.data?.message ?? 'Không tạo được bill.')
    })
  }

  const soHopLe = /^\d{1,7}(\.\d{1,2})?$/.test(soUsdt.trim()) && Number(soUsdt) >= Math.max(toiThieu, 0.01)

  return (
    <Box sx={khung}>
      <Typography sx={{ fontWeight: 700, fontSize: 14, mb: 1.5 }}>Nạp tiền qua Binance Pay</Typography>

      {billXem ? (
        <TheBill bill={billXem} receiver={receiver} onDong={() => setDangXem(-1)} />
      ) : (
        <Box sx={{ mb: 2 }}>
          <Typography sx={{ fontSize: 13, mb: 1 }}>Nhập số USDT muốn nạp để tạo bill. Bill có mã riêng dùng làm ghi chú chuyển tiền.</Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <TextField
              size='small'
              label='Số USDT'
              value={soUsdt}
              onChange={e => setSoUsdt(e.target.value.replace(',', '.'))}
              onKeyDown={e => e.key === 'Enter' && soHopLe && tao()}
              inputProps={{ inputMode: 'decimal' }}
              helperText={
                tyGia > 0
                  ? `${soHopLe ? `≈ ${vnd(Number(soUsdt) * tyGia)}đ · ` : ''}Tỷ giá ${vnd(tyGia)}đ/USDT${toiThieu > 0 ? ` · tối thiểu ${toiThieu} USDT` : ''}`
                  : ' '
              }
              sx={{ width: 260, maxWidth: '100%' }}
            />
            <Button
              variant='contained'
              startIcon={taoBill.isPending ? <CircularProgress size={14} color='inherit' /> : <Plus size={16} />}
              disabled={!soHopLe || taoBill.isPending}
              onClick={tao}
              sx={{ textTransform: 'none', height: 40 }}
            >
              Tạo bill nạp
            </Button>
          </Box>
          {loiTao && (
            <Alert severity='error' sx={{ mt: 1, fontSize: 13 }}>
              {loiTao}
            </Alert>
          )}
        </Box>
      )}

      {/* Bill của bạn — minh bạch: muốn nạp · thực nhận · thực cộng */}
      {!isLoading && bills.length > 0 && (
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <Typography sx={{ fontWeight: 600, fontSize: 13 }}>Bill của bạn</Typography>
            <Box sx={{ flex: 1 }} />
            {billXem && (
              <Button size='small' startIcon={<Plus size={14} />} onClick={() => setDangXem(-1)} sx={{ textTransform: 'none' }}>
                Tạo bill mới
              </Button>
            )}
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
            {bills.map(b => {
              const tt = NHAN_TRANG_THAI[b.trang_thai]

              return (
                <Box
                  key={b.id}
                  onClick={() => setDangXem(b.id)}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    flexWrap: 'wrap',
                    fontSize: 13,
                    p: 1,
                    borderRadius: '8px',
                    cursor: 'pointer',
                    background: billXem?.id === b.id ? 'var(--mui-palette-action-selected)' : 'transparent',
                    '&:hover': { background: 'var(--mui-palette-action-hover)' }
                  }}
                >
                  {b.trang_thai === 'completed' && <CheckCircle2 size={15} color='var(--mui-palette-success-main)' />}
                  {(b.trang_thai === 'open' || b.trang_thai === 'mismatch') && <Clock size={15} color='var(--mui-palette-warning-main)' />}
                  {(b.trang_thai === 'cancelled' || b.trang_thai === 'expired') && <XCircle size={15} color='var(--mui-palette-text-disabled)' />}
                  <Typography sx={{ fontSize: 13, fontWeight: 600, fontFamily: 'monospace' }}>{b.code}</Typography>
                  <Typography sx={{ fontSize: 13 }}>{b.usdt_muon_nap} USDT</Typography>
                  <Chip size='small' label={tt.nhan} color={tt.mau} variant='outlined' />
                  {b.da_cong && (
                    <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                      nhận {b.da_cong.so_coin_nhan} {b.da_cong.coin} → +{vnd(b.da_cong.vnd_da_cong ?? 0)}đ
                    </Typography>
                  )}
                  <Box sx={{ flex: 1 }} />
                  <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{b.tao_luc}</Typography>
                </Box>
              )
            })}
          </Box>
        </Box>
      )}

      <ChuyenKhongBill />
    </Box>
  )
}

/**
 * Đường cứu cho khoản chuyển KHÔNG qua bill (khách cũ quen ghi chú "<tiền tố> <mã khách>",
 * hoặc chuyển mà chưa tạo bill): dán mã giao dịch để nhận.
 */
const ChuyenKhongBill = () => {
  const [mo, setMo] = useState(false)
  const [ma, setMa] = useState('')
  const [kq, setKq] = useState<{ ok: boolean; loi?: boolean; text: string } | null>(null)
  const { data } = useBinanceClaims(mo)
  const xinNhan = useXinNhanKhoan()

  const gui = () => {
    const m = ma.trim()

    if (!m) return
    setKq(null)
    xinNhan.mutate(
      { transactionId: m },
      {
        onSuccess: res => {
          setMa('')
          setKq({
            ok: !!res?.da_cong,
            text: res?.da_cong ? `Đã cộng ${vnd(res?.so_tien_vnd ?? 0)}đ vào ví của bạn.` : res?.message ?? 'Đã nhận yêu cầu, chờ admin duyệt.'
          })
        },
        onError: (e: any) => setKq({ ok: false, loi: true, text: e?.response?.data?.message ?? 'Không gửi được yêu cầu.' })
      }
    )
  }

  if (!mo) {
    return (
      <Button variant='text' size='small' startIcon={<HelpCircle size={15} />} onClick={() => setMo(true)} sx={{ textTransform: 'none', fontSize: 13, p: 0, mt: 2 }}>
        Đã chuyển tiền mà không tạo bill?
      </Button>
    )
  }

  return (
    <Box sx={{ mt: 2 }}>
      <Typography sx={{ fontWeight: 600, fontSize: 13, mb: 0.5 }}>Điền mã giao dịch Binance</Typography>
      <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 1 }}>
        Binance → <strong>Lịch sử giao dịch</strong> → chọn lệnh chuyển → sao chép <strong>mã giao dịch</strong>. Chỉ người đã chuyển
        tiền mới có mã này.
      </Typography>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <TextField
          size='small'
          label='Mã giao dịch'
          placeholder='Ví dụ: M_P_71505104267788288'
          value={ma}
          onChange={e => setMa(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && gui()}
          sx={{ flex: 1, minWidth: 220, '& input': { fontFamily: 'monospace' } }}
        />
        <Button variant='contained' disabled={!ma.trim() || xinNhan.isPending} onClick={gui} sx={{ textTransform: 'none' }}>
          {xinNhan.isPending ? 'Đang kiểm tra…' : 'Kiểm tra và cộng tiền'}
        </Button>
      </Box>
      {kq && (
        <Alert severity={kq.ok ? 'success' : kq.loi ? 'error' : 'info'} sx={{ mt: 1, fontSize: 13 }}>
          {kq.text}
        </Alert>
      )}
      {(data?.donXinCuaToi?.length ?? 0) > 0 && (
        <Box sx={{ mt: 1.5 }}>
          <Typography sx={{ fontWeight: 600, fontSize: 12, mb: 0.5 }}>Yêu cầu của bạn</Typography>
          {data!.donXinCuaToi.map(d => (
            <Typography key={d.id} sx={{ fontSize: 12, color: 'text.secondary' }}>
              {d.amount_usdt} USDT · {d.luc_xin} ·{' '}
              {d.trang_thai === 'da_cong' ? 'đã cộng tiền' : d.trang_thai === 'tu_choi' ? 'không được chấp nhận' : 'đang chờ duyệt'}
            </Typography>
          ))}
        </Box>
      )}
    </Box>
  )
}

export default BinancePayPanel
