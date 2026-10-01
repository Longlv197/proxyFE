'use client'

import React, { useEffect, useState } from 'react'

import { Alert, Button, Chip, FormControlLabel, Switch, TextField } from '@mui/material'
import { Loader2, Save } from 'lucide-react'
import { toast } from 'react-toastify'

import useAxiosAuth from '@/hocs/useAxiosAuth'

import { sectionDescSx, sectionTitleSx } from './shared'

type TrangThaiSecret = { has_value: boolean; masked: string | null }

/**
 * Cấu hình nạp crypto: công tắc hiển thị + số liệu vận hành + khoá bí mật.
 *
 * Lưu ở bảng `settings` (sửa trên web, hiệu lực ngay, có lịch sử cấu hình để xem lại).
 * Tự quản state và tự lưu qua `admin/crypto-settings`, KHÔNG dùng nút "Lưu cấu hình" chung của tab.
 *
 * ⚠ VỀ KHOÁ BÍ MẬT — đọc trước khi sửa phần này:
 *  - Máy chủ KHÔNG trả khoá nguyên văn về đây (trả về là khoá đi qua mạng + nằm trong trình duyệt),
 *    chỉ trả `has_value` + 4 ký tự cuối. Nên ô nhập LUÔN RỖNG khi mở lại màn hình.
 *  - Vì vậy máy chủ coi **rỗng = KHÔNG ĐỔI**. Không được "sửa cho tiện" thành rỗng = xoá: admin
 *    vào đổi tỷ giá rồi bấm Lưu sẽ mất sạch khoá API và scanner ngừng chạy mà không ai biết.
 */
const CryptoDisplaySection = () => {
  const axiosAuth = useAxiosAuth()

  const [showForVn, setShowForVn] = useState(false)
  const [moBinance, setMoBinance] = useState(false)
  const [moOnchain, setMoOnchain] = useState(false)

  const [rate, setRate] = useState('0')
  const [minBinance, setMinBinance] = useState('0')
  const [minOnchain, setMinOnchain] = useState('0')
  const [notePrefix, setNotePrefix] = useState('mktproxy')

  // Ô nhập khoá: luôn bắt đầu rỗng. `trangThai` cho biết máy chủ đang giữ khoá nào.
  const [khoa, setKhoa] = useState({
    binance_api_key: '',
    binance_api_secret: '',
    bscscan_api_key: '',
    wallet_xpub: ''
  })

  const [trangThai, setTrangThai] = useState<Record<string, TrangThaiSecret>>({})
  const [dangTai, setDangTai] = useState(true)
  const [dangLuu, setDangLuu] = useState(false)

  const nap = async () => {
    try {
      const res = await axiosAuth.get('/admin/crypto-settings')
      const d = res?.data?.data

      setShowForVn(Boolean(d?.show_for_vn))
      setMoBinance(Boolean(d?.enabled_binance))
      setMoOnchain(Boolean(d?.enabled_onchain))
      setRate(String(d?.rate_usdt ?? 0))
      setMinBinance(String(d?.min_binance ?? 0))
      setMinOnchain(String(d?.min_onchain ?? 0))
      setNotePrefix(String(d?.note_prefix ?? 'mktproxy'))
      setTrangThai({
        binance_api_key: d?.binance_api_key,
        binance_api_secret: d?.binance_api_secret,
        bscscan_api_key: d?.bscscan_api_key,
        wallet_xpub: d?.wallet_xpub
      })
    } catch {
      toast.error('Không tải được cấu hình nạp crypto')
    } finally {
      setDangTai(false)
    }
  }

  useEffect(() => {
    nap()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const guiLen = async (payloadThem: Record<string, unknown>, thongBao?: string) => {
    setDangLuu(true)

    try {
      const res = await axiosAuth.post('/admin/crypto-settings', {
        show_for_vn: showForVn,
        rate_usdt: Number(rate) || 0,
        min_binance: Number(minBinance) || 0,
        min_onchain: Number(minOnchain) || 0,
        note_prefix: notePrefix,
        ...payloadThem
      })

      toast.info(thongBao || res?.data?.message || 'Đã lưu')
      // Nạp lại để thấy 4 ký tự cuối của khoá vừa nhập, và xoá ô nhập.
      setKhoa({ binance_api_key: '', binance_api_secret: '', bscscan_api_key: '', wallet_xpub: '' })
      await nap()

      return true
    } catch (err: any) {
      const loi = err?.response?.data?.errors

      toast.error(loi ? Object.values(loi).flat().join(' · ') : 'Lưu không thành công')

      return false
    } finally {
      setDangLuu(false)
    }
  }

  const doiCongTac = async (batLen: boolean) => {
    const truoc = showForVn

    setShowForVn(batLen)
    const ok = await guiLen(
      { show_for_vn: batLen },
      batLen
        ? 'Đã bật: khách IP Việt Nam cũng thấy cách nạp crypto'
        : 'Đã tắt: chỉ khách IP nước ngoài thấy cách nạp crypto'
    )

    if (!ok) setShowForVn(truoc)
  }

  const oKhoa = (field: keyof typeof khoa, nhan: string, goiY: string) => {
    const tt = trangThai[field]

    return (
      <TextField
        size='small'
        type='password'
        label={nhan}
        value={khoa[field]}
        onChange={e => setKhoa(k => ({ ...k, [field]: e.target.value }))}
        placeholder={tt?.has_value ? `đang lưu: ${tt.masked}` : 'chưa đặt'}
        helperText={
          tt?.has_value
            ? `Đang có khoá (${tt.masked}). Để trống = giữ nguyên. Nhập mới để thay.`
            : goiY
        }
        autoComplete='new-password'
        sx={{ flex: 1, minWidth: 260 }}
      />
    )
  }

  const rateSo = Number(rate) || 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <h6 style={sectionTitleSx}>Nạp bằng crypto (Binance Pay · USDT)</h6>
        <p style={sectionDescSx}>
          Mặc định chỉ khách có IP nước ngoài mới thấy các cách nạp crypto. Khách Việt Nam chỉ thấy
          chuyển khoản ngân hàng.
        </p>
      </div>

      <FormControlLabel
        control={
          <Switch checked={showForVn} disabled={dangTai || dangLuu} onChange={e => doiCongTac(e.target.checked)} />
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
        <span style={{ fontSize: 12.5, color: 'var(--mui-palette-text-secondary)' }}>Trạng thái mở thật:</span>
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
        <span style={{ fontSize: 12, color: 'var(--mui-palette-text-secondary)' }}>
          (chỉ để xem — mở thật khi phần nối Binance/blockchain hoàn thành)
        </span>
      </div>

      {/* ── Số liệu vận hành ── */}
      <div>
        <h6 style={sectionTitleSx}>Tỷ giá và mức nạp</h6>
        <p style={sectionDescSx}>Số liệu dùng để quy USDT ra VNĐ và chặn các khoản nạp quá nhỏ</p>
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <TextField
          size='small'
          type='number'
          label='Tỷ giá (VNĐ cho 1 USDT)'
          value={rate}
          onChange={e => setRate(e.target.value)}
          helperText='Ví dụ 26000. Làm tròn XUỐNG khi cộng tiền, không bao giờ cộng dư cho khách.'
          sx={{ flex: 1, minWidth: 220 }}
        />
        <TextField
          size='small'
          type='number'
          label='Tối thiểu Binance (USDT)'
          value={minBinance}
          onChange={e => setMinBinance(e.target.value)}
          helperText='0 = không giới hạn. Dưới mức này sẽ chờ admin xử tay.'
          sx={{ flex: 1, minWidth: 220 }}
        />
        <TextField
          size='small'
          type='number'
          label='Tối thiểu USDT on-chain'
          value={minOnchain}
          onChange={e => setMinOnchain(e.target.value)}
          helperText='0 = không giới hạn'
          sx={{ flex: 1, minWidth: 220 }}
        />
        <TextField
          size='small'
          label='Tiền tố ghi chú Binance'
          value={notePrefix}
          onChange={e => setNotePrefix(e.target.value)}
          helperText='Khách dán "mktproxy 15934" vào ghi chú. Chỉ chữ, số, gạch — không khoảng trắng.'
          sx={{ flex: 1, minWidth: 220 }}
        />
      </div>

      {rateSo <= 0 && (
        <Alert severity='warning' sx={{ fontSize: '13px', '& .MuiAlert-message': { fontSize: '13px' } }}>
          Chưa đặt tỷ giá. Hệ thống sẽ <b>không cộng đồng nào</b> cho khách nạp crypto cho tới khi có
          tỷ giá — đây là chốt an toàn có chủ đích, không phải lỗi.
        </Alert>
      )}

      {/* ── Khoá bí mật ── */}
      <div>
        <h6 style={sectionTitleSx}>Khoá kết nối</h6>
        <p style={sectionDescSx}>
          Khoá API để hệ thống tự nhận tiền. Chưa có khoá thì phần nạp crypto không thể mở.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {oKhoa('binance_api_key', 'Binance API Key', 'Lấy ở Binance → API Management')}
        {oKhoa('binance_api_secret', 'Binance API Secret', 'CHỈ cấp quyền đọc, tuyệt đối không bật quyền rút')}
        {oKhoa('bscscan_api_key', 'BscScan API Key', 'Đăng ký miễn phí tại bscscan.com')}
        {oKhoa('wallet_xpub', 'Ví nhận USDT (xpub)', 'Mỗi khách sẽ có một địa chỉ riêng sinh từ ví này')}
      </div>

      <Alert severity='warning' sx={{ fontSize: '13px', '& .MuiAlert-message': { fontSize: '13px' } }}>
        Vì lý do an toàn, khoá đã lưu <b>không hiện lại</b> — chỉ thấy 4 ký tự cuối để đối chiếu. Để
        trống nghĩa là <b>giữ nguyên khoá cũ</b>, nên bạn có thể sửa tỷ giá rồi bấm Lưu mà không sợ mất
        khoá. Muốn đổi thì nhập lại cả chuỗi mới.
      </Alert>

      <div>
        <Button
          variant='contained'
          size='small'
          startIcon={dangLuu ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={15} />}
          disabled={dangTai || dangLuu}
          onClick={() => guiLen(khoa)}
        >
          Lưu cấu hình crypto
        </Button>
      </div>
    </div>
  )
}

export default CryptoDisplaySection
