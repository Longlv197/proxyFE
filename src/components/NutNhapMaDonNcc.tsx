'use client'

import { useState } from 'react'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import TextField from '@mui/material/TextField'

import { useOrderConfirm } from '@/hooks/apis/useRenewal'

/**
 * Nút trên dòng log đỏ cuối cùng: đối tác đã nhận đơn nhưng hệ thống không lưu được mã, hoặc mã sai.
 * BE quyết định khi nào hiện (`nhap_ma_don`), đơn đã hoàn tiền hay site con thì không có khoá này.
 */

export type ThongTinNhapMaDon = { ma_hien_tai?: string | null; ma_goi_y?: string | null }

export default function NutNhapMaDonNcc({ orderId, thongTin }: { orderId: number; thongTin?: ThongTinNhapMaDon | null }) {
  const { mutateAsync, isPending } = useOrderConfirm()
  const [mo, setMo] = useState(false)
  const [ma, setMa] = useState('')
  const [loi, setLoi] = useState('')
  const [daLuu, setDaLuu] = useState('')

  if (!thongTin) return null

  const maHienTai = thongTin.ma_hien_tai || ''
  const maGoiY = thongTin.ma_goi_y || ''

  const moHop = () => {
    setMa(maHienTai || maGoiY)
    setLoi('')
    setDaLuu('')
    setMo(true)
  }

  const luu = async () => {
    const maNhap = ma.trim()

    if (!maNhap) return setLoi('Chưa nhập mã đơn.')

    try {
      await mutateAsync({ orderId, providerOrderCode: maNhap })
      setDaLuu(maNhap)
      setMo(false)
    } catch (err: any) {
      setLoi(err?.response?.data?.message || 'Không lưu được mã đơn.')
    }
  }

  const goiYChu = maHienTai
    ? `Mã đang lưu: ${maHienTai}${maGoiY && maGoiY !== maHienTai ? `. Response đối tác ghi: ${maGoiY}` : ''}`
    : maGoiY
      ? 'Đọc từ response đối tác, kiểm tra lại trước khi lưu.'
      : 'Không đọc được từ response, xem mã trong trang đối tác.'

  return (
    <Box sx={{ mt: 0.5, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
      <Button size='small' variant='outlined' color='warning' onClick={moHop} sx={{ fontSize: 11, py: 0.25 }}>
        {maHienTai ? 'Sửa mã đơn NCC' : 'Nhập mã đơn NCC'}
      </Button>
      {daLuu && (
        <Box component='span' sx={{ fontSize: 11, color: 'success.dark' }}>
          Đã lưu mã {daLuu}, hệ thống đang lấy hàng.
        </Box>
      )}

      <Dialog open={mo} onClose={() => setMo(false)} maxWidth='xs' fullWidth>
        <DialogTitle>{maHienTai ? 'Sửa mã đơn NCC' : 'Nhập mã đơn NCC'}</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2, fontSize: 13 }}>
            Chỉ dùng khi đối tác đã nhận đơn này. Hệ thống dùng mã để lấy hàng, không mua thêm.
          </DialogContentText>
          <TextField
            autoFocus
            fullWidth
            size='small'
            label='Mã đơn NCC'
            value={ma}
            onChange={e => {
              setMa(e.target.value)
              setLoi('')
            }}
            error={!!loi}
            helperText={loi || goiYChu}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMo(false)} color='inherit'>
            Huỷ
          </Button>
          <Button onClick={luu} variant='contained' disabled={isPending}>
            {isPending ? 'Đang lưu...' : 'Lưu và lấy hàng'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
