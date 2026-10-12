'use client'

import React, { useEffect, useState } from 'react'

import { Alert, Button, FormControlLabel, Switch, TextField } from '@mui/material'
import { Check, Loader2, Save } from 'lucide-react'
import { toast } from 'react-toastify'

import useAxiosAuth from '@/hocs/useAxiosAuth'

import { sectionDescSx, sectionTitleSx } from './shared'

type CauHinh = {
  bank_qr_enabled: boolean
  manual_enabled: boolean
  manual_note: string
  binance_enabled: boolean
  bank_configured: boolean
  binance_configured: boolean
}

/**
 * Cách nạp tiền khách được thấy ở trang Nạp tiền. Tắt = khách không thấy + máy chủ chặn tạo lệnh mới.
 * Tự quản state, tự lưu qua `admin/deposit-method-settings` (không dùng nút "Lưu cấu hình" chung).
 * Gửi lên ĐỦ 4 field mỗi lần lưu; máy chủ chỉ ghi field có gửi, nên thêm field mới không làm mất field cũ.
 */
const DepositMethodsSection = () => {
  const axiosAuth = useAxiosAuth()

  const [cauHinh, setCauHinh] = useState<CauHinh | null>(null)
  const [dangLuu, setDangLuu] = useState(false)
  const [vuaLuu, setVuaLuu] = useState(false)

  useEffect(() => {
    axiosAuth
      .get('/admin/deposit-method-settings')
      .then(res => setCauHinh(res?.data?.data ?? null))
      .catch(() => toast.error('Không tải được cấu hình cách nạp tiền'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!cauHinh) return null

  const doi = (field: keyof CauHinh, value: any) => {
    setVuaLuu(false)
    setCauHinh(prev => (prev ? { ...prev, [field]: value } : prev))
  }

  const luu = async () => {
    setDangLuu(true)

    try {
      await axiosAuth.post('/admin/deposit-method-settings', {
        bank_qr_enabled: cauHinh.bank_qr_enabled,
        manual_enabled: cauHinh.manual_enabled,
        manual_note: cauHinh.manual_note,
        binance_enabled: cauHinh.binance_enabled
      })
      setVuaLuu(true)
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Lưu không thành công')
    } finally {
      setDangLuu(false)
    }
  }

  const tatHet = !cauHinh.bank_qr_enabled && !cauHinh.manual_enabled && !cauHinh.binance_enabled

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div>
        <h6 style={sectionTitleSx}>Cách nạp tiền khách được thấy</h6>
        <p style={sectionDescSx}>
          Tắt cách nào thì khách không thấy cách đó ở trang Nạp tiền và không tạo được lệnh nạp mới. Tiền khách đã chuyển
          trước khi tắt vẫn được cộng bình thường.
        </p>
      </div>

      <FormControlLabel
        control={<Switch checked={cauHinh.bank_qr_enabled} onChange={e => doi('bank_qr_enabled', e.target.checked)} />}
        label={<span style={{ fontSize: 13 }}>Chuyển khoản ngân hàng (QR tự động cộng tiền)</span>}
      />
      {cauHinh.bank_qr_enabled && !cauHinh.bank_configured && (
        <Alert severity='warning' sx={{ fontSize: 13 }}>
          Chưa có ngân hàng nhận tiền ở mục bên dưới — khách thấy cách này nhưng không tạo được mã QR.
        </Alert>
      )}

      <FormControlLabel
        control={<Switch checked={cauHinh.binance_enabled} onChange={e => doi('binance_enabled', e.target.checked)} />}
        label={<span style={{ fontSize: 13 }}>Binance Pay (chỉ khách IP nước ngoài, trừ khi bật &quot;hiện cho khách VN&quot;)</span>}
      />
      {cauHinh.binance_enabled && !cauHinh.binance_configured && (
        <Alert severity='info' sx={{ fontSize: 13 }}>
          Đã bật nhưng khách CHƯA thấy: còn thiếu khoá API Binance / secret / tỷ giá USDT ở mục &quot;Nạp crypto&quot; bên dưới.
        </Alert>
      )}

      <FormControlLabel
        control={<Switch checked={cauHinh.manual_enabled} onChange={e => doi('manual_enabled', e.target.checked)} />}
        label={<span style={{ fontSize: 13 }}>Liên hệ admin để nạp (admin cộng tiền bằng tay)</span>}
      />
      {cauHinh.manual_enabled && (
        <TextField
          size='small'
          multiline
          minRows={2}
          label='Lời nhắn hiện cho khách'
          value={cauHinh.manual_note}
          onChange={e => doi('manual_note', e.target.value)}
          placeholder='VD: Nhắn Zalo 09xx kèm mã khách + số tiền, admin cộng trong 5 phút (8h–22h).'
          helperText='Để trống = dùng lời nhắn mặc định. Kênh liên hệ lấy từ tab "Hỗ trợ & Liên hệ".'
          inputProps={{ maxLength: 1000 }}
        />
      )}

      {tatHet && (
        <Alert severity='warning' sx={{ fontSize: 13 }}>
          Đang tắt hết — khách vào trang Nạp tiền chỉ thấy lời nhắn &quot;chưa mở nạp tiền trực tuyến&quot;.
        </Alert>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Button
          size='small'
          variant='contained'
          onClick={luu}
          disabled={dangLuu}
          startIcon={dangLuu ? <Loader2 size={14} className='animate-spin' /> : <Save size={14} />}
          sx={{ textTransform: 'none', fontSize: '13px', color: '#fff' }}
        >
          {dangLuu ? 'Đang lưu...' : 'Lưu cách nạp tiền'}
        </Button>
        {vuaLuu && (
          <span style={{ fontSize: 13, color: 'var(--mui-palette-success-main)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Check size={14} /> Đã lưu — khách thấy thay đổi sau tối đa 5 phút hoặc khi tải lại trang
          </span>
        )}
      </div>
    </div>
  )
}

export default DepositMethodsSection
