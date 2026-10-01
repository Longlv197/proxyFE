'use client'

import React, { useEffect, useState } from 'react'

import { Alert, Chip, FormControlLabel, Switch } from '@mui/material'
import { Loader2 } from 'lucide-react'
import { toast } from 'react-toastify'

import useAxiosAuth from '@/hocs/useAxiosAuth'

import { sectionDescSx, sectionTitleSx } from './shared'

/**
 * Cấu hình HIỂN THỊ cách nạp crypto.
 *
 * Vì sao cần công tắc này thay vì cứng hoá trong code:
 *  1. Luật "ai thấy crypto" là quyết định kinh doanh → admin phải sửa được trên web, không deploy.
 *  2. Không có công tắc thì admin KHÔNG BAO GIỜ xem được giao diện nạp crypto: quốc gia lấy từ
 *     header Cloudflare, mà máy dev không có header đó nên mọi lượt truy cập đều bị coi là VN.
 *
 * Tự quản state + tự lưu qua `admin/crypto-settings` (không dùng nút "Lưu cấu hình" chung),
 * nên bật/tắt có hiệu lực ngay mà không ảnh hưởng các mục khác trong tab.
 */
const CryptoDisplaySection = () => {
  const axiosAuth = useAxiosAuth()

  const [showForVn, setShowForVn] = useState(false)
  const [moBinance, setMoBinance] = useState(false)
  const [moOnchain, setMoOnchain] = useState(false)
  const [dangTai, setDangTai] = useState(true)
  const [dangLuu, setDangLuu] = useState(false)

  useEffect(() => {
    let huy = false

    axiosAuth
      .get('/admin/crypto-settings')
      .then(res => {
        if (huy) return
        const d = res?.data?.data

        setShowForVn(Boolean(d?.show_for_vn))
        setMoBinance(Boolean(d?.enabled_binance))
        setMoOnchain(Boolean(d?.enabled_onchain))
      })
      .catch(() => {
        if (!huy) toast.error('Không tải được cấu hình nạp crypto')
      })
      .finally(() => {
        if (!huy) setDangTai(false)
      })

    return () => {
      huy = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const doiCongTac = async (batLen: boolean) => {
    setDangLuu(true)
    const truoc = showForVn

    setShowForVn(batLen) // phản hồi ngay, lỗi thì trả về giá trị cũ

    try {
      const res = await axiosAuth.post('/admin/crypto-settings', { show_for_vn: batLen })

      toast.info(res?.data?.message || 'Đã cập nhật')
    } catch {
      setShowForVn(truoc)
      toast.error('Lưu không thành công, đã giữ nguyên cấu hình cũ')
    } finally {
      setDangLuu(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div>
        <h6 style={sectionTitleSx}>Nạp bằng crypto (Binance Pay · USDT)</h6>
        <p style={sectionDescSx}>
          Mặc định chỉ khách có IP nước ngoài mới thấy các cách nạp crypto. Khách Việt Nam chỉ thấy
          chuyển khoản ngân hàng.
        </p>
      </div>

      <FormControlLabel
        control={
          <Switch
            checked={showForVn}
            disabled={dangTai || dangLuu}
            onChange={e => doiCongTac(e.target.checked)}
          />
        }
        label={
          <span style={{ fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            Hiện cách nạp crypto cho cả khách IP Việt Nam
            {(dangTai || dangLuu) && <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />}
          </span>
        }
      />

      <Alert severity='info' sx={{ fontSize: '13px', '& .MuiAlert-message': { fontSize: '13px' } }}>
        Bật công tắc này để <b>tự xem giao diện nạp crypto</b> — kể cả khi bạn đang ở Việt Nam. Hai cách
        nạp crypto sẽ hiện kèm nhãn &quot;chưa mở&quot; và khách <b>không bấm được</b>, nên bật lên cũng
        không có ai đi vào màn hình trống.
      </Alert>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12.5, color: 'var(--mui-palette-text-secondary)' }}>
          Trạng thái mở thật của từng cách nạp:
        </span>
        <Chip
          size='small'
          label={`Binance Pay: ${moBinance ? 'đã mở' : 'chưa mở'}`}
          color={moBinance ? 'success' : 'default'}
          variant={moBinance ? 'filled' : 'outlined'}
        />
        <Chip
          size='small'
          label={`USDT (BEP20): ${moOnchain ? 'đã mở' : 'chưa mở'}`}
          color={moOnchain ? 'success' : 'default'}
          variant={moOnchain ? 'filled' : 'outlined'}
        />
      </div>

      <Alert severity='warning' sx={{ fontSize: '13px', '& .MuiAlert-message': { fontSize: '13px' } }}>
        Hai trạng thái trên <b>chỉ để xem</b>, chưa sửa được ở đây. Chúng chỉ được mở khi phần nối với
        Binance và blockchain hoàn thành — mở sớm thì khách chọn xong sẽ không có màn hình nào để nạp.
      </Alert>
    </div>
  )
}

export default CryptoDisplaySection
