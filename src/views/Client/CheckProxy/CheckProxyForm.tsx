'use client'

import React, { useState, useRef, useEffect } from 'react'

import {
  AlertCircle,
  CheckCircle,
  Clock,
  Copy,
  Globe,
  Loader,
  MapPin,
  RefreshCw,
  Search,
  Shield,
  XCircle
} from 'lucide-react'

import './styles.css'

import MenuItem from '@mui/material/MenuItem'

import { InputAdornment } from '@mui/material'

import { useTheme } from '@mui/material/styles'

import Button from '@mui/material/Button'

import { useForm, Controller } from 'react-hook-form'
import * as yup from 'yup'
import { yupResolver } from '@hookform/resolvers/yup'

import { LoadingButton } from '@mui/lab'

import CustomTextField from '@core/components/mui/TextField'
import CustomIconButton from '@core/components/mui/IconButton'
import { useCopy } from '@/app/hooks/useCopy'
import { useProxyCheck, PROXY_FORMATS, type ProxyFormatValue } from '@/hooks/apis/useProxyCheck'

// Tạo schema validation bằng Yup.
// `format_proxy` = định dạng khách tự chọn (mặc định 'auto' = tự nhận). Khách khai rõ thì
// server tách chính xác, hết nhập nhằng — nhất là dạng user:pass:host:port vốn không đoán nổi.
const schema = yup.object().shape({
  format_proxy: yup.string().required(),
  protocol: yup.string().required('Vui lòng chọn giao thức'),
  list_proxy: yup.string().required('Vui lòng nhập danh sách proxy')
})

interface CheckProxyRow {
  id?: number
  proxy: string
  ip: string
  protocol: string
  status: string
  responseTime: number | string
  type: string
  message?: string
}

interface CheckProxyFormProps {
  /** Dựng lại toàn bộ bảng (lúc bấm Kiểm tra). */
  onItemListChange: (items: CheckProxyRow[]) => void
  /** Kết quả của MỘT lô — trang cha ghép vào bảng theo chuỗi proxy. */
  onCheckedProxy: (items: CheckProxyRow[]) => void
}

export default function CheckProxyForm({ onItemListChange, onCheckedProxy }: CheckProxyFormProps) {
  const [successProxies, setSuccessProxies] = useState<string[]>([])
  const [errorProxies, setErrorProxies] = useState<string[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [currentProgress, setCurrentProgress] = useState({ current: 0, total: 0, duplicates: 0 })

  const [, copy] = useCopy()
  const { checkAll, batchSize } = useProxyCheck()

  // Huỷ vòng lặp khi rời trang giữa chừng — khỏi ghi trạng thái vào component đã tháo.
  const cancelRef = useRef({ cancelled: false })

  // Đọc cancelRef TẠI LÚC DỌN, không chụp lại từ lúc gắn: mỗi lần bấm Kiểm tra là một thẻ huỷ
  // mới, chụp sớm thì lúc rời trang sẽ bật cờ trên thẻ CŨ và vòng lặp đang chạy không dừng.
  useEffect(() => {
    return () => { cancelRef.current.cancelled = true }
  }, [])

  // ⚠ Hai hàm này TRƯỚC ĐÂY chép nhầm chéo nhau: nút ở ô "đang hoạt động" chép danh sách LỖI
  // và ngược lại — cả nhãn lẫn nội dung đều ngược. Nay đặt tên theo đúng thứ nó chép.
  const handleCopySuccess = () => copy(successProxies.join('\n'), 'Đã sao chép danh sách proxy đang hoạt động!')
  const handleCopyError = () => copy(errorProxies.join('\n'), 'Đã sao chép danh sách proxy ngưng hoạt động!')

  const theme = useTheme()

  const isLoading = isProcessing

  const {
    control,
    handleSubmit,
    formState: { errors }
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      format_proxy: 'auto',
      protocol: 'http',
      list_proxy: ''
    }
  })

  /**
   * Kiểm tra cả danh sách.
   *
   * TRƯỚC: hàng đợi chạy ĐÚNG 1 LUỒNG, mỗi proxy tối đa 15 giây → 100 proxy mất tới 25 phút.
   * NAY: chia lô, mỗi lô máy chủ chạy song song → một lượt tốn bằng con chậm nhất trong lô,
   * và kết quả đổ về sau MỖI lô nên thanh tiến trình nhúc nhích liên tục.
   */
  const onSubmit = async (data: any) => {
    const protocol: string = data.protocol
    const format = (data.format_proxy || 'auto') as ProxyFormatValue

    const lines: string[] = String(data.list_proxy)
      .split('\n')
      .map(l => l.trim())
      .filter(l => l !== '')

    // Dán trùng dòng thì chỉ GỌI KIỂM 1 lần cho mỗi chuỗi khác nhau — nhưng vẫn GIỮ ĐỦ
    // số dòng khách dán trong bảng. Trang cha ghép kết quả theo chuỗi proxy nên mọi dòng
    // trùng đều nhận đúng kết quả, mà không tốn thêm lượt gọi nào.
    // (Không được lặng lẽ bỏ bớt dòng của khách — họ đếm số dòng để đối chiếu.)
    const unique = Array.from(new Set(lines))
    const duplicates = lines.length - unique.length

    setSuccessProxies([])
    setErrorProxies([])
    setIsProcessing(true)
    setCurrentProgress({ current: 0, total: unique.length, duplicates })

    // Huỷ lượt chạy trước (nếu còn) rồi mới cấp thẻ huỷ mới cho lượt này.
    cancelRef.current.cancelled = true
    cancelRef.current = { cancelled: false }

    const token = cancelRef.current

    // Dựng bảng ngay để khách thấy danh sách + trạng thái "đang chờ".
    // Cột IP để TRỐNG: đây là IP thoát thật, chỉ biết sau khi kiểm. Trước đây điền sẵn host
    // khách vừa gõ vào rồi gọi đó là "IP" — cột ấy chưa bao giờ nói đúng điều gì.
    onItemListChange(
      lines.map((proxy, index) => ({
        id: index + 1,
        proxy,
        ip: '',
        protocol,
        status: 'checking',
        responseTime: 'checking',
        type: ''
      }))
    )

    await checkAll(
      unique.map((proxy, index) => ({ id: index, proxy, protocol: protocol as 'http' | 'socks5' })),
      results => {
        const rows: CheckProxyRow[] = results.map(r => ({
          proxy: unique[Number(r.id)] ?? '',
          ip: r.exit_ip || '',
          protocol,
          status: r.status,
          responseTime: r.status === 'success' ? r.latency_ms : -1,
          type: r.format || '',
          message: r.message || ''
        }))

        onCheckedProxy(rows)
        setSuccessProxies(prev => [...prev, ...rows.filter(r => r.status === 'success').map(r => r.proxy)])
        setErrorProxies(prev => [...prev, ...rows.filter(r => r.status !== 'success').map(r => r.proxy)])
        setCurrentProgress(prev => ({ ...prev, current: Math.min(prev.current + rows.length, prev.total) }))
      },
      token,
      format
    )

    if (!token.cancelled) setIsProcessing(false)
  }

  const dataLocation = [
    {
      value: 'http',
      label: 'HTTP'
    },
    {
      value: 'socks5',
      label: 'SOCKS5'
    }
  ]

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className='check-form-panel'>
        <div className='form-card'>
          <div className='form-header'>
            <h3>Kiểm tra thông tin Proxy</h3>
          </div>

          {/* Định dạng proxy: khách chọn để server tách chính xác. "Tự nhận" là mặc định.
              Dấu phân tách phẩy / gạch đứng / tab được nhận tự động cho MỌI lựa chọn. */}
          <div className='form-group-check'>
            <Controller
              name='format_proxy'
              control={control}
              render={({ field }) => (
                <CustomTextField
                  select
                  fullWidth
                  id='format_proxy'
                  {...field}
                  label={
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Shield size={16} />
                      Định dạng Proxy
                    </span>
                  }
                  helperText='Chọn "Tự nhận" nếu không chắc. Nhận cả dấu phẩy / gạch đứng / tab.'
                  sx={{
                    '& .MuiInputLabel-root': {
                      color: 'var(--mui-palette-text-secondary, #4a5568)',
                      fontWeight: '600',
                      fontSize: '13px',
                      paddingBottom: '5px'
                    }
                  }}
                >
                  {PROXY_FORMATS.map(item => (
                    <MenuItem key={item.value} value={item.value}>
                      {item.label}
                    </MenuItem>
                  ))}
                </CustomTextField>
              )}
            />
          </div>

          {/* Giao thức */}
          <div className='form-group-check'>
            <Controller
              name='protocol'
              control={control}
              render={({ field }) => (
                <CustomTextField
                  select
                  fullWidth
                  defaultValue='http'
                  id='locale'
                  error={Boolean(errors.protocol)}
                  helperText={errors.protocol?.message}
                  {...field}
                  label={
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Globe size={16} />
                      Giao thức
                    </span>
                  }
                  sx={{
                    '& .MuiInputLabel-root': {
                      color: 'var(--mui-palette-text-secondary, #4a5568)',
                      fontWeight: '600',
                      fontSize: '13px',
                      paddingBottom: '5px'
                    }
                  }}
                >
                  {dataLocation.map((item, index) => {
                    return (
                      <MenuItem key={index} value={item.value}>
                        {item.label}
                      </MenuItem>
                    )
                  })}
                </CustomTextField>
              )}
            />
          </div>

          {/* Danh sách proxies */}
          <div className='form-group-check'>
            <Controller
              name='list_proxy'
              control={control}
              render={({ field }) => (
                <CustomTextField
                  rows={4}
                  multiline
                  fullWidth
                  placeholder='Nhập danh sách proxy, mỗi proxy một dòng...'
                  id='list_proxy'
                  error={Boolean(errors.list_proxy)}
                  helperText={errors.list_proxy?.message}
                  {...field}
                  label={
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <AlertCircle size={16} />
                      Danh sách proxy
                    </span>
                  }
                  sx={{
                    // Nhắm đến thẻ label của component này
                    '& .MuiInputLabel-root': {
                      color: 'var(--mui-palette-text-secondary, #4a5568)', // Đổi màu label thành màu cam
                      fontWeight: '600', // In đậm chữ
                      fontSize: '13px', // Thay đổi kích thước font
                      paddingBottom: '5px'
                    }
                  }}
                />
              )}
            />
          </div>

          {/* Check Button */}
          <LoadingButton
            variant='contained'
            type='submit'
            fullWidth
            loading={isLoading}
            loadingIndicator={<Loader size={25} className='spinning-icon spinning-icon-loading ' />}
            sx={{
              background: 'var(--primary-gradient, linear-gradient(45deg, #FC4336, #F88A4B))',
              color: 'var(--primary-contrast, #fff)',
              padding: '16px 24px',
              borderRadius: '12px',
              fontWeight: 600,
              fontSize: '16px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              marginBottom: '24px',
              width: '100%',
              '&:hover': {
                background: 'var(--primary-gradient, linear-gradient(45deg, #FC4336, #F88A4B))',
                opacity: 0.9,
              },
            }}
          >
            Kiểm tra
          </LoadingButton>

          {/* Progress Bar */}
          {isProcessing && currentProgress.total > 0 && (
            <div className='form-group-check'>
              <div style={{ marginBottom: '8px', fontSize: '14px', color: 'var(--mui-palette-text-secondary, #4a5568)' }}>
                Đã kiểm {currentProgress.current}/{currentProgress.total} proxy
                <span style={{ opacity: 0.7 }}> · mỗi lượt {batchSize} proxy chạy cùng lúc</span>
                {currentProgress.duplicates > 0 && (
                  <span style={{ opacity: 0.7 }}> · {currentProgress.duplicates} dòng trùng dùng chung kết quả</span>
                )}
              </div>
              <div
                style={{
                  width: '100%',
                  height: '8px',
                  backgroundColor: '#e2e8f0',
                  borderRadius: '4px',
                  overflow: 'hidden'
                }}
              >
                <div
                  style={{
                    width: `${(currentProgress.current / currentProgress.total) * 100}%`,
                    height: '100%',
                    backgroundColor: '#22c55e',
                    transition: 'width 0.3s ease'
                  }}
                />
              </div>
            </div>
          )}

          {/* Proxy đang hoạt động */}
          <div className='form-group-check'>
            <CustomTextField
              rows={4}
              multiline
              fullWidth
              name='proxy_success'
              id='proxy_success'
              value={successProxies.join('\n')}
              label={
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <CheckCircle size={16} className='text-green-500' />
                  Proxy đang hoạt động
                </span>
              }
              sx={{
                // Nhắm đến thẻ label của component này
                '& .MuiInputLabel-root': {
                  color: 'var(--mui-palette-text-secondary, #4a5568)', // Đổi màu label thành màu cam
                  fontWeight: '600', // In đậm chữ
                  fontSize: '13px', // Thay đổi kích thước font
                  paddingBottom: '5px'
                },
                '& .MuiInputBase-root': {
                  backgroundColor: '#dcfce7 !important',
                  borderColor: '#22c55e !important'
                }
              }}
            />
            <button type='button' className='copy-btn' onClick={handleCopySuccess}>
              <Copy size={14} />
            </button>
          </div>

          {/* Proxy ngưng hoạt động */}
          <div className='form-group-check'>
            <CustomTextField
              rows={4}
              multiline
              fullWidth
              name='proxy_error'
              id='proxy_error'
              value={errorProxies.join('\n')}
              label={
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <XCircle size={16} className='text-red-500' />
                  Proxy ngưng hoạt động
                </span>
              }
              sx={{
                // Nhắm đến thẻ label của component này
                '& .MuiInputLabel-root': {
                  color: 'var(--mui-palette-text-secondary, #4a5568)', // Đổi màu label thành màu cam
                  fontWeight: '600', // In đậm chữ
                  fontSize: '13px', // Thay đổi kích thước font
                  paddingBottom: '5px'
                },
                '& .MuiInputBase-root': {
                  backgroundColor: '#fef2f2 !important',
                  borderColor: '#ef4444 !important'
                }
              }}
            />
            <CustomIconButton
              type='button'
              aria-label='capture screenshot'
              color='success'
              variant='contained'
              className='copy-btn'
              onClick={handleCopyError}
            >
              <Copy size={14} />
            </CustomIconButton>
          </div>
        </div>
      </form>
    </>
  )
}
