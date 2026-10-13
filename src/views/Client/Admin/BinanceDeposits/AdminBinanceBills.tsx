'use client'

import { useState } from 'react'

import { Alert, Box, Chip, CircularProgress, MenuItem, TextField, Typography } from '@mui/material'

import { useAdminBinanceBills, type BillNapBinance } from '@/hooks/apis/useBinanceBills'

const vnd = (n: number) => new Intl.NumberFormat('vi-VN').format(Math.floor(n))

const NHAN: Record<BillNapBinance['trang_thai'], { nhan: string; mau: 'default' | 'info' | 'warning' | 'success' }> = {
  open: { nhan: 'Chờ chuyển tiền', mau: 'info' },
  expired: { nhan: 'Quá hạn giữ tỷ giá', mau: 'default' },
  mismatch: { nhan: 'Lệch số tiền — chờ khách dán mã GD', mau: 'warning' },
  completed: { nhan: 'Đã cộng', mau: 'success' },
  cancelled: { nhan: 'Khách huỷ', mau: 'default' }
}

/**
 * Bill nạp Binance — minh bạch đủ 3 con số: khách muốn nạp · coin thực nhận · thực cộng.
 * Khoản tiền lệch/bill đã dùng vẫn xử lý ở tab "Đang chờ xử lý" (nút Duyệt ở đó).
 */
const AdminBinanceBills = () => {
  const [trangThai, setTrangThai] = useState('all')
  const [tuKhoa, setTuKhoa] = useState('')
  const { data, isLoading } = useAdminBinanceBills(trangThai, tuKhoa.trim())

  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mb: 2 }}>
        <TextField select size='small' label='Trạng thái' value={trangThai} onChange={e => setTrangThai(e.target.value)} sx={{ minWidth: 200 }}>
          <MenuItem value='all'>Tất cả</MenuItem>
          <MenuItem value='open'>Chờ chuyển tiền</MenuItem>
          <MenuItem value='mismatch'>Lệch số tiền</MenuItem>
          <MenuItem value='completed'>Đã cộng</MenuItem>
          <MenuItem value='cancelled'>Khách huỷ</MenuItem>
        </TextField>
        <TextField size='small' label='Mã bill hoặc ID khách' value={tuKhoa} onChange={e => setTuKhoa(e.target.value)} sx={{ minWidth: 220 }} />
        {data && data.dem.lech > 0 && <Chip color='warning' label={`${data.dem.lech} bill lệch số tiền`} sx={{ fontWeight: 600 }} />}
      </Box>

      {isLoading && <CircularProgress size={22} />}
      {!isLoading && (data?.data?.length ?? 0) === 0 && <Alert severity='info'>Chưa có bill nào.</Alert>}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {data?.data?.map(b => {
          const k = b.da_cong
          const chenh = b.chenh_lech_usdt ?? 0

          return (
            <Box
              key={b.id}
              sx={{ border: '1px solid var(--mui-palette-divider)', borderRadius: '12px', p: 2, background: 'var(--mui-palette-background-paper)' }}
            >
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap', mb: 1 }}>
                <Typography sx={{ fontWeight: 700, fontFamily: 'monospace' }}>{b.code}</Typography>
                <Chip size='small' label={NHAN[b.trang_thai].nhan} color={NHAN[b.trang_thai].mau} />
                <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                  {b.khach?.name ?? `ID ${b.khach?.id}`} {b.khach?.email && `· ${b.khach.email}`} · ID {b.khach?.id} · tạo {b.tao_luc}
                </Typography>
              </Box>

              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 1.5 }}>
                <Box>
                  <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>Khách muốn nạp</Typography>
                  <Typography sx={{ fontWeight: 700 }}>{b.usdt_muon_nap} USDT</Typography>
                  <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                    tỷ giá bill {vnd(b.ty_gia)}đ · dự kiến {vnd(b.vnd_du_kien)}đ
                  </Typography>
                </Box>
                <Box>
                  <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>Coin thực nhận</Typography>
                  <Typography sx={{ fontWeight: 700 }}>
                    {k ? `${k.so_coin_nhan} ${k.coin}` : b.cac_khoan[0] ? `${b.cac_khoan[0].so_coin_nhan} ${b.cac_khoan[0].coin}` : '—'}
                  </Typography>
                  {k && chenh !== 0 && (
                    <Typography sx={{ fontSize: 12, color: chenh > 0 ? 'success.main' : 'warning.main' }}>
                      {chenh > 0 ? 'Thừa' : 'Thiếu'} {Math.abs(chenh)} USDT so với bill
                    </Typography>
                  )}
                </Box>
                <Box>
                  <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>Thực cộng</Typography>
                  <Typography sx={{ fontWeight: 700 }}>{k ? `${vnd(k.vnd_da_cong ?? 0)}đ` : '—'}</Typography>
                  {k && (
                    <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                      {k.usdt_quy_doi} USDT × {vnd(k.ty_gia)}đ · {k.cach_cong === 'scanner' ? 'tự động' : k.cach_cong === 'user_claim' ? 'khách dán mã GD' : 'admin duyệt'}
                    </Typography>
                  )}
                </Box>
              </Box>

              {/* Mọi khoản tiền mang mã bill này — kể cả khoản thứ 2 đang chờ. */}
              {b.cac_khoan.length > 0 && (
                <Box sx={{ mt: 1.5, pt: 1, borderTop: '1px dashed var(--mui-palette-divider)' }}>
                  {b.cac_khoan.map(c => (
                    <Typography key={c.transaction_id} sx={{ fontSize: 12, color: 'text.secondary', wordBreak: 'break-all' }}>
                      GD <code>{c.transaction_id}</code> · {c.so_coin_nhan} {c.coin} · {c.luc} ·{' '}
                      {c.trang_thai === 'credited' ? `đã cộng ${vnd(c.vnd_da_cong ?? 0)}đ` : c.trang_thai === 'ignored' ? 'đã bỏ qua' : 'đang chờ'}
                      {c.nguoi_gui && ` · người gửi ${c.nguoi_gui}`}
                      {c.binance_id_nguoi_gui && ` (ID ${c.binance_id_nguoi_gui})`}
                      {c.ghi_chu_khach && ` · ghi chú "${c.ghi_chu_khach}"`}
                    </Typography>
                  ))}
                </Box>
              )}
            </Box>
          )
        })}
      </Box>
    </Box>
  )
}

export default AdminBinanceBills
