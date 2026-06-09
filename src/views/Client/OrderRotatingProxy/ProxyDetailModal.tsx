'use client'

import React, { useState, useEffect, useCallback } from 'react'

import {
  Dialog,
  DialogContent,
  Button,
  Typography,
  Box,
  Switch,
  TextField,
  MenuItem,
  CircularProgress,
  Divider
} from '@mui/material'

import { toast } from 'react-toastify'
import { Copy, RefreshCw, Zap } from 'lucide-react'

import { extractProxyValue, extractProtocol } from '@/utils/protocolProxy'
import { useCopy } from '@/app/hooks/useCopy'
import useAxiosAuth from '@/hocs/useAxiosAuth'

interface RotationState {
  auto_rotate: boolean
  auto_rotate_interval: number
  allow_manual: boolean
  allow_auto: boolean
  min_interval: number
  second: number
}

interface ProxyDetailModalProps {
  open: boolean
  onClose: () => void
  proxy: any
  orderKey?: string | null
  onProxyChange?: (data: any) => void
}

const INTERVAL_OPTIONS = [
  { v: 60, label: '1 phút' },
  { v: 120, label: '2 phút' },
  { v: 300, label: '5 phút' },
  { v: 600, label: '10 phút' },
  { v: 1800, label: '30 phút' },
  { v: 3600, label: '1 giờ' }
]

const fmtInterval = (s: number) => INTERVAL_OPTIONS.find(o => o.v === s)?.label || `${s}s`

const ProxyDetailModal: React.FC<ProxyDetailModalProps> = ({ open, onClose, proxy, orderKey, onProxyChange }) => {
  const [, copy] = useCopy()
  const axiosAuth = useAxiosAuth()

  const [localProxy, setLocalProxy] = useState<any>(proxy)
  const [rot, setRot] = useState<RotationState | null>(null)
  const [loadingRot, setLoadingRot] = useState(false)
  const [rotating, setRotating] = useState(false)
  const [savingMode, setSavingMode] = useState(false)
  const [countdown, setCountdown] = useState(0)

  // Đồng bộ proxy từ prop khi mở/đổi
  useEffect(() => { setLocalProxy(proxy) }, [proxy])

  // Lấy trạng thái chế độ xoay khi mở modal
  const fetchMode = useCallback(async () => {
    if (!orderKey) return
    setLoadingRot(true)
    try {
      const res = await axiosAuth.get('/proxies/rotation-mode', { params: { key: orderKey } })
      if (res.data?.success) {
        setRot(res.data)
        setCountdown(Number(res.data.second) || 0)
      }
    } catch {
      // im lặng — không có cấu hình thì ẩn panel
    } finally {
      setLoadingRot(false)
    }
  }, [orderKey, axiosAuth])

  useEffect(() => {
    if (open && orderKey) fetchMode()
  }, [open, orderKey, fetchMode])

  // Đếm ngược cooldown
  useEffect(() => {
    if (countdown <= 0) return
    const t = setInterval(() => setCountdown(c => (c <= 1 ? 0 : c - 1)), 1000)
    return () => clearInterval(t)
  }, [countdown])

  // Xoay IP / Lấy proxy lần đầu (gọi NCC)
  const handleRotate = async () => {
    if (!orderKey || rotating) return
    setRotating(true)
    try {
      const res = await axiosAuth.post('/proxies/rotate-ip', { key: orderKey })
      if (res.data?.success) {
        const data = res.data.data
        setLocalProxy(data)
        onProxyChange?.(data)
        setCountdown(Number(res.data.second) || 0)
        toast.info(res.data.message || 'Đã xoay IP')
      } else {
        toast.error(res.data?.message || 'Xoay IP thất bại')
      }
    } catch (e: any) {
      const d = e?.response?.data
      // Đang cooldown → BE trả seconds; cập nhật đếm ngược
      if (d?.seconds) setCountdown(Number(d.seconds))
      toast.error(d?.message || 'Xoay IP thất bại')
    } finally {
      setRotating(false)
    }
  }

  // Bật/tắt tự động xoay (+ chọn chu kỳ)
  const saveMode = async (auto: boolean, interval?: number) => {
    if (!orderKey || savingMode) return
    setSavingMode(true)
    try {
      const res = await axiosAuth.post('/proxies/rotation-mode', {
        key: orderKey,
        auto_rotate: auto,
        interval: interval ?? rot?.auto_rotate_interval
      })
      if (res.data?.success) {
        setRot(r => r ? { ...r, auto_rotate: auto, auto_rotate_interval: interval ?? r.auto_rotate_interval } : r)
        if (typeof res.data.second === 'number') setCountdown(res.data.second)
        toast.info(res.data.message || (auto ? 'Đã bật tự động xoay' : 'Đã tắt tự động xoay'))
      } else {
        toast.error(res.data?.message || 'Không lưu được cấu hình')
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Không lưu được cấu hình')
    } finally {
      setSavingMode(false)
    }
  }

  const proxys = localProxy?.proxys || localProxy
  const proxyValue = localProxy ? extractProxyValue(proxys) : null
  const protocol = (localProxy && (extractProtocol(proxys) || localProxy.protocol?.toUpperCase())) || 'HTTP'
  const intervalOptions = INTERVAL_OPTIONS.filter(o => o.v >= (rot?.min_interval || 60))

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth='sm'
      PaperProps={{ sx: { borderRadius: 3, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' } }}>
      <DialogContent dividers sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography sx={{ fontWeight: 700, fontSize: 17 }}>Thông tin proxy</Typography>
          <Button onClick={onClose} disableRipple sx={{ minWidth: 0, color: '#94a3b8' }}><i className='tabler-x' /></Button>
        </Box>

        {/* Proxy value */}
        {proxyValue ? (
          <Box sx={{ mb: 2 }}>
            <Typography variant='body2' color='text.secondary' sx={{ mb: 1 }}>{protocol} Proxy:</Typography>
            <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1, border: '1px solid', borderColor: 'grey.300' }}>
              <div className='flex items-center gap-2'>
                <Typography variant='body1' sx={{ flex: 1, fontFamily: 'monospace', wordBreak: 'break-all', fontSize: '0.9rem' }}>
                  {proxyValue}
                </Typography>
                <Button variant='outlined' size='small' startIcon={<Copy size={14} />}
                  onClick={() => copy(proxyValue, `Đã copy ${protocol} proxy!`)}>Copy</Button>
              </div>
            </Box>
          </Box>
        ) : (
          <Box sx={{ p: 2.5, mb: 2, bgcolor: '#fffbeb', borderRadius: 2, border: '1px solid #fde68a', textAlign: 'center' }}>
            <Typography variant='body2' sx={{ color: '#92400e' }}>
              Chưa có proxy — bấm <strong>"Lấy proxy"</strong> bên dưới để kích hoạt (hệ thống gọi sang nhà cung cấp).
            </Typography>
          </Box>
        )}

        {/* IP gốc NCC trả về (nếu NCC có cấu hình field) */}
        {localProxy?.real_ip && (
          <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant='body2' color='text.secondary'>IP gốc (NCC):</Typography>
            <Typography sx={{ fontFamily: 'monospace', fontWeight: 600, color: '#059669', fontSize: '0.9rem' }}>{localProxy.real_ip}</Typography>
            <Button variant='text' size='small' startIcon={<Copy size={13} />} sx={{ minWidth: 0 }}
              onClick={() => copy(localProxy.real_ip, 'Đã copy IP gốc!')} />
          </Box>
        )}

        {/* Panel chế độ xoay — hiện khi có orderKey. Nút xoay tay hiện KỂ CẢ khi chưa load được cấu hình (BE lỗi/chưa deploy). */}
        {orderKey && (
          <>
            <Divider sx={{ my: 2 }} />

            {/* Nút xoay/lấy proxy thủ công — mặc định cho xoay tay; chỉ ẩn khi SP tắt allow_manual */}
            {(!rot || rot.allow_manual) && (
              <Button fullWidth variant='contained' color='warning' disableElevation
                startIcon={rotating ? <CircularProgress size={16} color='inherit' /> : <RefreshCw size={16} />}
                disabled={rotating || countdown > 0}
                onClick={handleRotate}
                sx={{ mb: 1.5, fontWeight: 600 }}>
                {rotating ? 'Đang xoay...'
                  : countdown > 0 ? `Có thể xoay sau ${countdown}s`
                  : proxyValue ? 'Xoay IP ngay' : 'Lấy proxy'}
              </Button>
            )}

            {/* Đang tải cấu hình tự động (chưa biết allow_auto/min) */}
            {loadingRot && !rot && (
              <Typography sx={{ fontSize: 11, color: '#94a3b8', textAlign: 'center' }}>Đang tải cấu hình tự động xoay...</Typography>
            )}

            {/* Toggle tự động xoay — chỉ hiện khi đã load được cấu hình SP (cần min/interval) */}
            {rot?.allow_auto && (
              <Box sx={{ p: 1.5, bgcolor: '#f8fafc', borderRadius: 1.5, border: '1px solid #e2e8f0' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <Zap size={15} color='#f59e0b' />
                    <Typography sx={{ fontSize: 13, fontWeight: 600 }}>Tự động đổi IP định kỳ</Typography>
                  </Box>
                  <Switch size='small' color='warning' checked={rot.auto_rotate} disabled={savingMode}
                    onChange={e => saveMode(e.target.checked)} />
                </Box>
                {rot.auto_rotate && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                    <Typography sx={{ fontSize: 12, color: '#64748b' }}>Chu kỳ:</Typography>
                    <TextField select size='small' value={rot.auto_rotate_interval} disabled={savingMode}
                      onChange={e => saveMode(true, Number(e.target.value))} sx={{ minWidth: 120 }}>
                      {intervalOptions.map(o => <MenuItem key={o.v} value={o.v}>{o.label}</MenuItem>)}
                    </TextField>
                  </Box>
                )}
                <Typography sx={{ fontSize: 11, color: '#94a3b8', mt: 0.75 }}>
                  {rot.auto_rotate
                    ? `Hệ thống tự đổi IP mỗi ${fmtInterval(rot.auto_rotate_interval)} — không cần gọi API.`
                    : `Bật để hệ thống tự đổi IP định kỳ. Chu kỳ tối thiểu cho sản phẩm này: ${fmtInterval(rot.min_interval)}.`}
                </Typography>
              </Box>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default ProxyDetailModal
