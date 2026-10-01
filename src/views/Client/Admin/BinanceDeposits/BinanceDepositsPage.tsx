'use client'

import { useState } from 'react'

import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Tab,
  Tabs,
  TextField,
  Typography
} from '@mui/material'
import { CheckCircle2, ShieldCheck } from 'lucide-react'

import {
  useBinanceDeposits,
  useHanhDongKhoanNap,
  useTimKhach,
  type KhachTimDuoc,
  type KhoanNapBinance
} from '@/hooks/apis/useBinanceDeposits'

/**
 * Màn admin xử lý khoản nạp Binance.
 *
 * Nguyên tắc trình bày của dự án: KHÔNG "hiển thị cho xong". Mỗi dòng phải nói được
 *   · vì sao khoản này đang treo (hậu quả: khách chưa nhận được tiền)
 *   · có ai đang xin nhận không, và máy đối chiếu ra KHỚP hay LỆCH
 *   · bấm nút nào thì chuyện gì xảy ra
 * Nên `ket_qua_so` được làm nổi bật kèm giảng giải, không phải một chữ trơ.
 */

const TRANG_THAI: Array<{ ma: 'pending' | 'credited' | 'ignored'; nhan: string }> = [
  { ma: 'pending', nhan: 'Đang chờ xử lý' },
  { ma: 'credited', nhan: 'Đã cộng tiền' },
  { ma: 'ignored', nhan: 'Đã bỏ qua' }
]

/**
 * Bằng chứng khách đưa ra. Phải nói NGHĨA, không hiện chữ trơ.
 *
 * Bằng chứng là MÃ GIAO DỊCH — chỉ người đã chuyển tiền mới thấy nó trong lịch sử Binance
 * của chính họ, nên khai đúng mã là bằng chứng mạnh. (Bản đầu dùng TÊN tài khoản, nhưng
 * Binance che tên `Tran V***` nên ai gõ "Tran" cũng "khớp" — đã bỏ.)
 */
const TheBangChung = ({ ketQua }: { ketQua: KhoanNapBinance['ket_qua_so'] }) => {
  if (ketQua !== 'khop') return null

  return (
    <Box>
      <Chip size='small' color='success' icon={<ShieldCheck size={14} />} label='KHAI ĐÚNG MÃ' sx={{ fontWeight: 700 }} />
      <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.5 }}>
        Khách khai đúng mã giao dịch Binance — chỉ người đã chuyển tiền mới biết mã này.
      </Typography>
    </Box>
  )
}

/**
 * Ô tìm khách để admin TỰ GÁN khoản tiền không ai nhận.
 *
 * Đây là đường cứu CUỐI CÙNG: khách không ghi chú, cũng không khai mã giao dịch. Tiền vào
 * ví mà KHÔNG có bằng chứng nào máy kiểm được — chỉ có quyết định của người. Vì vậy giao
 * diện phải bắt admin **nhìn thấy rõ mình đang cộng cho ai** (tên + email + ID) trước khi
 * bấm, và máy chủ ghi riêng một dòng lịch sử `admin_tu_gan_khach`.
 */
const ChonKhach = ({
  daChon,
  onChon
}: {
  daChon: KhachTimDuoc | null
  onChon: (k: KhachTimDuoc | null) => void
}) => {
  const [tuKhoa, setTuKhoa] = useState('')
  const { data: ketQua = [], isFetching } = useTimKhach(tuKhoa)

  if (daChon) {
    return (
      <Box sx={{ mt: 1 }}>
        <Alert
          severity='info'
          sx={{ fontSize: 13, py: 0.5 }}
          action={
            <Button size='small' onClick={() => onChon(null)} sx={{ textTransform: 'none' }}>
              Đổi
            </Button>
          }
        >
          Sẽ cộng cho <strong>{daChon.name}</strong> · {daChon.email} · ID {daChon.id}
        </Alert>
      </Box>
    )
  }

  return (
    <Box sx={{ mt: 1 }}>
      <TextField
        fullWidth
        size='small'
        label='Tìm khách để cộng tiền'
        placeholder='ID, email hoặc tên'
        value={tuKhoa}
        onChange={e => setTuKhoa(e.target.value)}
      />

      {isFetching && <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.5 }}>Đang tìm…</Typography>}

      {ketQua.length > 0 && (
        <Box
          sx={{
            mt: 0.75,
            maxHeight: 180,
            overflowY: 'auto',
            border: '1px solid var(--mui-palette-divider, #e2e8f0)',
            borderRadius: '8px'
          }}
        >
          {ketQua.map(k => (
            <Box
              key={k.id}
              onClick={() => onChon(k)}
              sx={{
                px: 1.5,
                py: 1,
                cursor: 'pointer',
                borderBottom: '1px solid var(--mui-palette-divider, #f1f5f9)',
                '&:last-of-type': { borderBottom: 'none' },
                '&:hover': { background: 'var(--mui-palette-action-hover, rgba(0,0,0,0.04))' }
              }}
            >
              <Typography sx={{ fontSize: 13, fontWeight: 600 }}>
                {k.name} <span style={{ fontWeight: 400, opacity: 0.6 }}>· ID {k.id}</span>
              </Typography>
              <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                {k.email} · số dư {k.sodu.toLocaleString('vi-VN')}đ
              </Typography>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  )
}

const BinanceDepositsPage = () => {
  const [tab, setTab] = useState(0)
  const trangThai = TRANG_THAI[tab].ma

  const { data, isLoading } = useBinanceDeposits(trangThai)
  const hanhDong = useHanhDongKhoanNap()
  const [vuaLam, setVuaLam] = useState<{ id: number; loi?: string } | null>(null)

  // Khách admin tự chọn, theo TỪNG khoản — không dùng một biến chung, không thì chọn ở
  // khoản này lại vô tình cộng cho khoản khác.
  const [khachDaChon, setKhachDaChon] = useState<Record<number, KhachTimDuoc | null>>({})

  const chay = (id: number, viec: 'duyet' | 'tu-choi' | 'bo-qua') => {
    hanhDong.mutate(
      { id, hanhDong: viec, userId: viec === 'duyet' ? khachDaChon[id]?.id : undefined },
      {
        // Phản hồi tại chỗ, không dùng toast success (quy ước dự án).
        onSuccess: () => {
          setVuaLam({ id })
          setKhachDaChon(cu => ({ ...cu, [id]: null }))
        },
        onError: (e: any) => setVuaLam({ id, loi: e?.response?.data?.message ?? 'Không thực hiện được.' })
      }
    )
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Typography variant='h5' sx={{ fontWeight: 700, mb: 0.5 }}>
        Khoản nạp Binance
      </Typography>
      <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: 2 }}>
        Khoản máy không tự khớp được sẽ nằm ở đây. Mỗi khoản đang chờ là một khách đã chuyển tiền mà
        chưa nhận được — xử lý sớm.
      </Typography>

      {/* Lớp tổng quan: con số đáng chú ý trước, chi tiết sau. */}
      {data && (
        <Box sx={{ display: 'flex', gap: 1.5, mb: 2, flexWrap: 'wrap' }}>
          <Chip
            color={data.dem.dang_cho > 0 ? 'warning' : 'default'}
            label={`${data.dem.dang_cho} khoản đang treo`}
            sx={{ fontWeight: 600 }}
          />
          <Chip
            color={data.dem.khach_dang_xin > 0 ? 'primary' : 'default'}
            label={`${data.dem.khach_dang_xin} khách đang xin nhận`}
            sx={{ fontWeight: 600 }}
          />
        </Box>
      )}

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, '& .MuiTab-root': { textTransform: 'none' } }}>
        {TRANG_THAI.map(t => (
          <Tab key={t.ma} label={t.nhan} />
        ))}
      </Tabs>

      {isLoading && <CircularProgress size={22} />}

      {!isLoading && (data?.data?.length ?? 0) === 0 && (
        <Alert severity='success'>Không có khoản nào ở trạng thái này.</Alert>
      )}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {data?.data?.map(k => (
          <Box
            key={k.id}
            sx={{
              border: '1px solid var(--mui-palette-divider, #e2e8f0)',
              borderRadius: '12px',
              p: 2,
              background: 'var(--mui-palette-background-paper, #fff)'
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap', mb: 1 }}>
              <Box>
                <Typography sx={{ fontWeight: 700, fontSize: 16 }}>
                  {k.amount_usdt} {k.currency} ={' '}
                  {(k.credited_vnd ?? k.gross_vnd).toLocaleString('vi-VN')}đ
                </Typography>
                <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                  {k.luc} · tỷ giá {k.rate_vnd.toLocaleString('vi-VN')}đ/USDT
                </Typography>
              </Box>

              {/* Trạng thái nói HẬU QUẢ, không chỉ nói tên trạng thái. */}
              {k.status === 'pending' && (
                <Chip
                  size='small'
                  color='warning'
                  label={
                    k.reason === 'no_note'
                      ? 'Chưa rõ chủ — tiền đang treo'
                      : k.reason === 'below_min'
                        ? 'Dưới mức tối thiểu — chưa cộng'
                        : 'Đang chờ'
                  }
                />
              )}
              {k.status === 'credited' && (
                <Chip size='small' color='success' icon={<CheckCircle2 size={14} />} label={`Đã cộng ${k.luc_cong}`} />
              )}
            </Box>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                gap: 1.5,
                fontSize: 13,
                mb: 1.5
              }}
            >
              <Box>
                <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>Binance báo</Typography>
                <Typography sx={{ fontSize: 13 }}>
                  Người gửi: <strong>{k.payer_name ?? '(không có)'}</strong>
                  {k.payer_binance_id && ` · ID ${k.payer_binance_id}`}
                </Typography>
                <Typography sx={{ fontSize: 13 }}>
                  Ghi chú: <strong>{k.note ? k.note : '(trống)'}</strong>
                </Typography>
              </Box>

              <Box>
                {k.chu_he_thong_biet && (
                  <>
                    <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>Máy đã xác định chủ</Typography>
                    <Typography sx={{ fontSize: 13 }}>
                      <strong>{k.chu_he_thong_biet.name}</strong> · {k.chu_he_thong_biet.email}
                    </Typography>
                  </>
                )}

                {k.nguoi_xin_nhan && (
                  <>
                    <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: k.chu_he_thong_biet ? 1 : 0 }}>
                      Khách khai mã giao dịch ({k.luc_xin})
                    </Typography>
                    <Typography sx={{ fontSize: 13 }}>
                      <strong>{k.nguoi_xin_nhan.name}</strong> · {k.nguoi_xin_nhan.email}
                    </Typography>
                    <Typography sx={{ fontSize: 13, mb: 0.75, wordBreak: 'break-all' }}>
                      Mã khách khai: <strong>{k.bang_chung_khach}</strong>
                    </Typography>
                    <TheBangChung ketQua={k.ket_qua_so} />
                  </>
                )}

                {!k.chu_he_thong_biet && !k.nguoi_xin_nhan && k.status === 'pending' && (
                  <>
                    <Alert severity='warning' sx={{ fontSize: 12, py: 0 }}>
                      Chưa biết của ai và chưa có khách nào khai mã. Khách khai đúng mã giao dịch ở trang
                      nạp tiền là tự cộng được — hoặc chọn khách bên dưới rồi duyệt.
                    </Alert>
                    <ChonKhach
                      daChon={khachDaChon[k.id] ?? null}
                      onChon={khach => setKhachDaChon(cu => ({ ...cu, [k.id]: khach }))}
                    />
                  </>
                )}
              </Box>
            </Box>

            {vuaLam?.id === k.id && (
              <Alert severity={vuaLam.loi ? 'error' : 'success'} sx={{ mb: 1.5, fontSize: 13 }}>
                {vuaLam.loi ?? 'Đã xử lý xong.'}
              </Alert>
            )}

            {k.status === 'pending' && (
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Button
                  variant='contained'
                  size='small'
                  disabled={
                    hanhDong.isPending ||
                    (!k.nguoi_xin_nhan && !k.chu_he_thong_biet && !khachDaChon[k.id])
                  }
                  onClick={() => chay(k.id, 'duyet')}
                  sx={{ textTransform: 'none' }}
                >
                  Duyệt → cộng tiền
                </Button>
                {k.nguoi_xin_nhan && (
                  <Button
                    variant='outlined'
                    size='small'
                    color='warning'
                    disabled={hanhDong.isPending}
                    onClick={() => chay(k.id, 'tu-choi')}
                    sx={{ textTransform: 'none' }}
                  >
                    Từ chối yêu cầu
                  </Button>
                )}
                <Button
                  variant='text'
                  size='small'
                  color='error'
                  disabled={hanhDong.isPending}
                  onClick={() => chay(k.id, 'bo-qua')}
                  sx={{ textTransform: 'none' }}
                >
                  Bỏ qua khoản này
                </Button>
              </Box>
            )}

            {/* Chỉ giải thích khi NÚT ĐÓ THẬT SỰ CÓ MẶT — giải thích một nút không tồn tại
                trên dòng này thì admin đi tìm nút, không tìm thấy, và mất tin vào màn hình. */}
            {k.status === 'pending' && k.nguoi_xin_nhan && (
              <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.75 }}>
                “Từ chối yêu cầu” chỉ bỏ yêu cầu của khách, khoản tiền vẫn còn chờ để người đúng xin
                lại. “Bỏ qua khoản này” là loại hẳn, không cộng cho ai.
              </Typography>
            )}
          </Box>
        ))}
      </Box>
    </Box>
  )
}

export default BinanceDepositsPage
