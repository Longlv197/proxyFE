'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

import Image from 'next/image'
import { useParams } from 'next/navigation'

import { useDispatch, useSelector } from 'react-redux'
import { toast } from 'react-toastify'

import { Wallet, QrCode, Clock, Copy, Loader, Clock3, CircleAlert, Trash2, CheckCircle2, Radio } from 'lucide-react'

import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import { InputAdornment, LinearProgress, Tab, Tabs, Chip } from '@mui/material'
import Pagination from '@mui/material/Pagination'

import { useReactTable, getCoreRowModel, flexRender, getPaginationRowModel } from '@tanstack/react-table'

import { useQuery, useQueryClient } from '@tanstack/react-query'

import CustomTextField from '@core/components/mui/TextField'

import { useCreateBankQr, usePendingBankQr, useCancelBankQr, type PendingBankQr } from '@/hooks/apis/useBankQr'
import { useBankInfo } from '@/hooks/apis/useBankInfo'
import { useUpdateTransferName } from '@/hooks/apis/useTransferName'
import { useDepositHistory } from '@/hooks/apis/useDeponsitHistory'
import { useCopy } from '@/app/hooks/useCopy'
import { formatDateTimeLocal } from '@/utils/formatDate'
import useAxiosAuth from '@/hocs/useAxiosAuth'
import { setUser } from '@/store/userSlice'

import type { AppDispatch, RootState } from '@/store'
import { useBranding } from '@/app/contexts/BrandingContext'
import TurnstileWidget from '@/components/TurnstileWidget'

const DEFAULT_DENOMINATIONS = ['2000', '5000', '10000', '50000', '100000', '200000', '500000', '1000000']
const EXPIRE_SECONDS = 600

export default function RechargePage() {
  const { user } = useSelector((state: RootState) => state.user)
  const dispatch = useDispatch<AppDispatch>()
  const params = useParams()
  const branding = useBranding()
  const { turnstile_enabled } = branding
  const denominations = useMemo(() => {
    if (branding?.deposit_preset_amounts?.length) {
      return branding.deposit_preset_amounts.map((a: number) => String(a))
    }
    return DEFAULT_DENOMINATIONS
  }, [branding?.deposit_preset_amounts])
  const queryClient = useQueryClient()
  const [tabIndex, setTabIndex] = useState(0)

  // Transfer name (chỉ dùng khi chưa cấu hình)
  const [transferNameInput, setTransferNameInput] = useState('')
  const [transferNameError, setTransferNameError] = useState('')
  const updateTransferName = useUpdateTransferName()

  // Recharge form
  const [rechargeAmount, setRechargeAmount] = useState('50,000')
  const [amount, setAmount] = useState('50000')
  const [isGeneratingQR, setIsGeneratingQR] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState('')
  const [countdown, setCountdown] = useState(0)
  const [createdRecord, setCreatedRecord] = useState<PendingBankQr | null>(null)
  const [paymentSuccess, setPaymentSuccess] = useState(false)

  const createBankQr = useCreateBankQr()
  const cancelBankQr = useCancelBankQr()
  const { data: pendingData, refetch: refetchPending } = usePendingBankQr(true, true)
  const { data: bankInfo, isLoading: loadingBank } = useBankInfo()
  const [, copy] = useCopy()
  const axiosAuth = useAxiosAuth()

  // Refs để detect payment success
  const prevPendingRef = useRef<PendingBankQr | null>(null)
  const wasCancelledRef = useRef(false)
  const countdownRef = useRef(0)

  const pendingRecord = pendingData?.data ?? createdRecord
  const hasPending = !!pendingRecord
  const transferConfig = user?.transfer_config
  const hasTransferName = !!transferConfig?.name && !!transferConfig?.key

  // Countdown timer
  useEffect(() => {
    if (!pendingRecord?.expires_at) {
      setCountdown(0)

      return
    }

    const calcRemaining = () => {
      const expiresAt = new Date(pendingRecord.expires_at).getTime()
      const now = Date.now()

      return Math.max(0, Math.floor((expiresAt - now) / 1000))
    }

    setCountdown(calcRemaining())

    const timer = setInterval(() => {
      const remaining = calcRemaining()

      setCountdown(remaining)
      countdownRef.current = remaining

      if (remaining <= 0) {
        clearInterval(timer)
        refetchPending()
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [pendingRecord?.expires_at, refetchPending])

  // Detect payment success: pending → null mà không phải do cancel
  // Threshold 15s để tránh false positive khi server expire trước FE countdown
  useEffect(() => {
    const prev = prevPendingRef.current
    const current = pendingData?.data ?? null

    if (prev && !current && !wasCancelledRef.current && countdownRef.current > 15) {
      setPaymentSuccess(true)
      toast.success(`Nạp ${prev.amount.toLocaleString('vi-VN')}đ thành công! Số dư đã được cập nhật.`)

      // Refresh balance + history (async, không block UI)
      axiosAuth
        .post('/me')
        .then(res => {
          if (res?.data) dispatch(setUser(res.data))
        })
        .catch(() => {})
      queryClient.invalidateQueries({ queryKey: ['depositHistory'] })
      queryClient.invalidateQueries({ queryKey: ['getTransactionHistory'] })

      setTimeout(() => setPaymentSuccess(false), 5000)
    }

    prevPendingRef.current = current
    wasCancelledRef.current = false
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingData?.data])

  // Khi server đã xác nhận record, không cần createdRecord nữa
  useEffect(() => {
    if (pendingData?.data && createdRecord) {
      setCreatedRecord(null)
    }
  }, [pendingData?.data, createdRecord])

  const formatCurrency = (value: string) => {
    const numericValue = value.replace(/\D/g, '')

    return numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  }

  const formatCountdown = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60

    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const changeInputAmount = (event: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCurrency(event.target.value)
    const rawValue = event.target.value.replace(/[^0-9]/g, '')

    setAmount(rawValue)
    setRechargeAmount(formatted)
  }

  const handleAmountSelect = (selectedAmount: string) => {
    if (hasPending) return
    const formatted = formatCurrency(selectedAmount)

    setRechargeAmount(formatted)
    const rawValue = selectedAmount.replace(/[^0-9]/g, '')

    setAmount(rawValue)
  }

  const handleCreateQrCode = async () => {
    if (hasPending) return

    if (turnstile_enabled === 'true' && !turnstileToken) {
      toast.error('Vui lòng xác minh bảo mật trước khi tạo QR.')

      return
    }

    setIsGeneratingQR(true)

    try {
      const result = await createBankQr.mutateAsync({
        amount: Number(amount),
        ...(turnstileToken ? { turnstile_token: turnstileToken } : {})
      })

      if (result.success && result.data) {
        setCreatedRecord(result.data)
        refetchPending()
      }
    } catch (error: any) {
      const errorData = error?.response?.data

      if (errorData?.data) {
        setCreatedRecord(errorData.data)
        refetchPending()
      }

      console.error('Lỗi khi tạo QR:', error)
    } finally {
      setIsGeneratingQR(false)
    }
  }

  const handleSaveTransferName = async () => {
    if (!transferNameInput.trim() || transferNameInput.trim().length < 3) return

    setTransferNameError('')

    try {
      await updateTransferName.mutateAsync(transferNameInput.trim())
    } catch (error: any) {
      const msg = error?.response?.data?.message || 'Lỗi khi lưu tên chuyển tiền.'

      setTransferNameError(msg)
    }
  }

  const getQrUrl = () => {
    if (!pendingRecord) return ''
    const addInfo = pendingRecord.note || pendingRecord.transaction_code

    if (!bankInfo) return ''

    return `https://img.vietqr.io/image/${bankInfo.bank_code}-${bankInfo.account_number}-compact2.png?amount=${pendingRecord.amount}&addInfo=${encodeURIComponent(addInfo)}`
  }

  const handleCancelPending = async () => {
    if (!pendingRecord) return
    wasCancelledRef.current = true

    try {
      await cancelBankQr.mutateAsync(pendingRecord.id)
      setCreatedRecord(null)
      refetchPending()
    } catch (error) {
      wasCancelledRef.current = false
      console.error('Lỗi khi hủy giao dịch:', error)
    }
  }

  const handleCopyAll = () => {
    if (!pendingRecord) return
    if (!bankInfo) return
    const textToCopy = `${bankInfo.account_number} - ${bankInfo.account_name} - ${pendingRecord.amount} - ${pendingRecord.note || pendingRecord.transaction_code}`

    copy(textToCopy)
  }

  const isButtonDisabled = !amount || Number(amount) <= 0 || isGeneratingQR || hasPending
  const progressPercent = hasPending ? (countdown / EXPIRE_SECONDS) * 100 : 0

  return (
    <div className='table-container'>
      <div className='orders-content'>
        <div className='table-toolbar'>
          <div className='header-left'>
            <div className='page-icon'>
              <Wallet size={17} />
            </div>
            <div>
              <h5 className='mb-0 font-semibold'>Nạp tiền</h5>
            </div>
          </div>
        </div>

        <Box sx={{ padding: { xs: '12px', md: '20px' }, display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* ===== Chưa cấu hình tên → hiện form setup ===== */}
          {!hasTransferName && (
            <Box
              sx={{
                background: '#fff',
                borderRadius: '10px',
                border: '1px solid var(--mui-palette-divider, #e2e8f0)',
                padding: '20px'
              }}
            >
              <Typography
                sx={{
                  fontWeight: 600,
                  fontSize: '14px',
                  color: 'var(--mui-palette-text-primary, #1e293b)',
                  mb: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <CircleAlert size={16} color='var(--primary-color)' />
                Xác nhận tên tài khoản ngân hàng
              </Typography>
              <Typography
                sx={{ fontSize: '13px', color: 'var(--mui-palette-text-secondary, #64748b)', mb: 1.5, lineHeight: 1.6 }}
              >
                Nhập họ tên đầy đủ của chủ tài khoản ngân hàng bạn sẽ dùng để chuyển khoản nạp tiền —{' '}
                <strong>viết hoa, không dấu</strong>. Hệ thống dùng tên này để tự động xác nhận giao dịch.
              </Typography>

              {/* Ví dụ minh họa */}
              <Box
                sx={{
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: '8px',
                  padding: '12px 14px',
                  mb: 1.5
                }}
              >
                <Typography sx={{ fontSize: '12px', fontWeight: 600, color: '#166534', mb: 1 }}>
                  Cách tìm tên chủ tài khoản:
                </Typography>
                <Box
                  component='ol'
                  sx={{
                    margin: 0,
                    paddingLeft: '18px',
                    '& li': { fontSize: '12px', color: '#15803d', lineHeight: 1.6, mb: 0.3 }
                  }}
                >
                  <li>Mở app ngân hàng (VD: Vietcombank, MB Bank, Techcombank...)</li>
                  <li>
                    Vào phần <strong>Tài khoản</strong> hoặc <strong>Thông tin cá nhân</strong>
                  </li>
                  <li>
                    Tìm dòng <strong>"Chủ tài khoản"</strong> — thường viết IN HOA, không dấu
                  </li>
                  <li>Nhập chính xác tên đó vào ô bên dưới</li>
                </Box>
                <Box
                  sx={{ mt: 1, p: '8px 10px', background: '#fff', borderRadius: '6px', border: '1px dashed #86efac' }}
                >
                  <Typography sx={{ fontSize: '11px', color: '#6b7280' }}>
                    Ví dụ: Trên app ngân hàng hiển thị chủ tài khoản là
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: '14px',
                      fontWeight: 700,
                      color: '#166534',
                      fontFamily: 'monospace',
                      letterSpacing: '0.5px'
                    }}
                  >
                    NGUYEN VAN A
                  </Typography>
                  <Typography sx={{ fontSize: '11px', color: '#6b7280', mt: 0.3 }}>
                    → Nhập vào ô bên dưới: <strong>NGUYEN VAN A</strong> (họ tên đầy đủ, viết hoa, không dấu)
                  </Typography>
                </Box>
              </Box>

              <Box
                sx={{
                  background: '#fffbeb',
                  border: '1px solid #fde68a',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  mb: 2,
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px'
                }}
              >
                <CircleAlert size={14} color='#b45309' style={{ flexShrink: 0, marginTop: 2 }} />
                <Typography sx={{ fontSize: '12px', color: '#92400e', lineHeight: 1.5 }}>
                  <strong>Lưu ý:</strong> Tên phải khớp với tên hiển thị khi chuyển khoản. Nếu sai, tiền sẽ không được
                  cộng tự động. Tên sau khi lưu không thể thay đổi.
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <CustomTextField
                  placeholder='Họ tên đầy đủ, VD: NGUYEN VAN A'
                  value={transferNameInput}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTransferNameInput(e.target.value)}
                  size='small'
                  sx={{ '& .MuiInputBase-root': { fontSize: '14px' } }}
                />
                <Typography
                  sx={{ fontSize: '11px', color: 'var(--mui-palette-text-disabled, #94a3b8)', lineHeight: 1.4 }}
                >
                  Nhập họ tên đầy đủ, viết hoa, không dấu — giống tên hiển thị trên app ngân hàng khi chuyển khoản.
                </Typography>
                {transferNameError && (
                  <Box
                    sx={{
                      background: '#fef2f2',
                      border: '1px solid #fecaca',
                      borderRadius: '6px',
                      padding: '6px 10px',
                      fontSize: '12px',
                      color: '#991b1b',
                      lineHeight: 1.4
                    }}
                  >
                    {transferNameError}
                  </Box>
                )}
                <Button
                  variant='contained'
                  onClick={handleSaveTransferName}
                  disabled={
                    !transferNameInput.trim() || transferNameInput.trim().length < 3 || updateTransferName.isPending
                  }
                  sx={{
                    fontSize: '13px',
                    textTransform: 'none',
                    color: 'white',
                    borderRadius: '10px',
                    py: 1.2,
                    alignSelf: 'flex-start',
                    px: 4
                  }}
                >
                  {updateTransferName.isPending ? <Loader size={14} className='spinning-icon me-2' /> : null}
                  Xác nhận
                </Button>
              </Box>
            </Box>
          )}

          {/* ===== Form nạp tiền / QR (chỉ hiện khi đã cấu hình tên) ===== */}
          {hasTransferName && (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: hasPending ? '1fr 1fr' : '1fr' },
                gap: '16px'
              }}
            >
              {/* FORM NHẬP SỐ TIỀN */}
              {!hasPending && (
                <Box
                  sx={{
                    background: 'var(--mui-palette-background-paper, #fff)',
                    borderRadius: '12px',
                    border: '1px solid var(--mui-palette-divider, #e2e8f0)',
                    overflow: 'hidden'
                  }}
                >
                  {/* Hướng dẫn 3 bước */}
                  <Box sx={{ padding: '20px', paddingBottom: '16px' }}>
                    <Typography
                      sx={{
                        fontWeight: 700,
                        fontSize: '14px',
                        color: '#1e293b',
                        mb: 2,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                    >
                      <Wallet size={16} color='var(--primary-color)' />
                      Nạp tiền qua chuyển khoản ngân hàng
                    </Typography>

                    <Box
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
                        gap: '12px',
                        mb: 2
                      }}
                    >
                      {[
                        { step: '1', title: 'Tạo mã QR', desc: 'Nhập số tiền và bấm tạo QR bên dưới' },
                        { step: '2', title: 'Chuyển khoản', desc: 'Quét QR hoặc chuyển khoản theo thông tin' },
                        { step: '3', title: 'Nhận tiền', desc: 'Tiền tự động cộng sau 1–5 phút' }
                      ].map(item => (
                        <Box
                          key={item.step}
                          sx={{
                            display: 'flex',
                            gap: '10px',
                            alignItems: 'flex-start',
                            padding: '12px',
                            borderRadius: '10px',
                            background: '#f8fafc',
                            border: '1px solid #f1f5f9'
                          }}
                        >
                          <Box
                            sx={{
                              width: 28,
                              height: 28,
                              borderRadius: '50%',
                              background: 'var(--primary-gradient)',
                              color: '#fff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '13px',
                              fontWeight: 700,
                              flexShrink: 0
                            }}
                          >
                            {item.step}
                          </Box>
                          <Box>
                            <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#1e293b', lineHeight: 1.3 }}>
                              {item.title}
                            </Typography>
                            <Typography sx={{ fontSize: '12px', color: '#64748b', lineHeight: 1.4, mt: 0.3 }}>
                              {item.desc}
                            </Typography>
                          </Box>
                        </Box>
                      ))}
                    </Box>

                    {/* Cảnh báo quan trọng */}
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        background: '#fffbeb',
                        border: '1px solid #fde68a'
                      }}
                    >
                      <CircleAlert size={15} color='#d97706' style={{ flexShrink: 0 }} />
                      <Typography sx={{ fontSize: '12px', color: '#92400e', lineHeight: 1.4 }}>
                        <strong>Quan trọng:</strong> Phải tạo QR trước rồi mới chuyển khoản. Chuyển khoản không qua QR
                        sẽ không được ghi nhận tự động.
                      </Typography>
                    </Box>
                  </Box>

                  {/* Divider */}
                  <Box sx={{ borderTop: '1px solid var(--mui-palette-divider, #e2e8f0)' }} />

                  {/* Form body */}
                  <Box sx={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* Số dư hiện tại */}
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        padding: '10px 14px'
                      }}
                    >
                      <Typography sx={{ fontSize: '13px', color: '#64748b' }}>Số dư hiện tại</Typography>
                      <Typography sx={{ fontSize: '14px', fontWeight: 700, color: '#1e293b' }}>
                        {new Intl.NumberFormat('vi-VN').format(user?.sodu ?? 0)}đ
                      </Typography>
                    </Box>

                    {/* Input + Chips trên 1 row trên desktop */}
                    <Box
                      sx={{
                        display: 'flex',
                        flexDirection: { xs: 'column', sm: 'row' },
                        gap: '12px',
                        alignItems: { sm: 'flex-end' }
                      }}
                    >
                      <Box sx={{ flex: 1 }}>
                        <CustomTextField
                          label='Số tiền nạp'
                          placeholder='Nhập số tiền'
                          type='text'
                          fullWidth
                          value={rechargeAmount}
                          onInput={changeInputAmount}
                          slotProps={{
                            input: {
                              endAdornment: (
                                <InputAdornment
                                  position='end'
                                  sx={{
                                    '& .MuiTypography-root': { fontWeight: 700, fontSize: '13px', color: '#94a3b8' }
                                  }}
                                >
                                  VNĐ
                                </InputAdornment>
                              )
                            }
                          }}
                          sx={{
                            '& .MuiInputBase-root': { padding: '4px 8px', fontSize: '16px', fontWeight: 700 },
                            '& .MuiInputLabel-root': { fontSize: '13px', fontWeight: 600 }
                          }}
                        />
                      </Box>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '6px', pb: '4px' }}>
                        {denominations.map((denominationValue, key) => (
                          <BoxAmount
                            key={key}
                            handleSelectAmount={handleAmountSelect}
                            amount={denominationValue}
                            isActive={denominationValue === amount}
                          />
                        ))}
                      </Box>
                    </Box>

                    <TurnstileWidget onVerify={setTurnstileToken} onExpire={() => setTurnstileToken('')} />

                    {/* CTA */}
                    <Button
                      onClick={handleCreateQrCode}
                      disabled={isButtonDisabled}
                      variant='contained'
                      sx={{
                        padding: '10px 32px',
                        color: 'white',
                        fontSize: '14px',
                        fontWeight: 600,
                        textTransform: 'none',
                        borderRadius: '10px',
                        alignSelf: 'flex-start',
                        '&.Mui-disabled': {
                          backgroundColor: '#f1f5f9',
                          color: '#94a3b8',
                          cursor: 'not-allowed !important'
                        }
                      }}
                    >
                      {isGeneratingQR ? (
                        <>
                          <Loader size={15} className='spinning-icon me-2' /> Đang tạo QR...
                        </>
                      ) : (
                        <>
                          <QrCode size={15} className='me-2' /> Tạo mã QR thanh toán
                        </>
                      )}
                    </Button>
                  </Box>
                </Box>
              )}

              {/* BANNER THANH TOÁN THÀNH CÔNG */}
              {paymentSuccess && !hasPending && (
                <Box
                  sx={{
                    gridColumn: '1 / -1',
                    background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
                    borderRadius: '12px',
                    border: '1px solid #86efac',
                    padding: '24px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '8px',
                    animation: 'fadeIn 0.3s ease'
                  }}
                >
                  <CheckCircle2 size={40} color='#16a34a' />
                  <Typography sx={{ fontSize: '16px', fontWeight: 700, color: '#15803d' }}>
                    Nạp tiền thành công!
                  </Typography>
                  <Typography sx={{ fontSize: '13px', color: '#166534' }}>
                    Số dư của bạn đã được cập nhật. Bạn có thể tiếp tục mua proxy.
                  </Typography>
                </Box>
              )}

              {/* KHI CÓ PENDING: Cột trái = thông tin bank, Cột phải = QR */}
              {hasPending && pendingRecord && (
                <>
                  {/* Thông tin chuyển khoản */}
                  <Box
                    sx={{
                      background: 'var(--mui-palette-background-paper, #fff)',
                      borderRadius: '10px',
                      border: '1px solid var(--mui-palette-divider, #e2e8f0)',
                      overflow: 'hidden'
                    }}
                  >
                    {/* Header countdown + polling indicator */}
                    <Box
                      sx={{
                        background: 'var(--mui-palette-background-default, #f8fafc)',
                        borderBottom: '1px solid var(--mui-palette-divider, #e2e8f0)',
                        padding: '14px 16px',
                        paddingBottom: '10px'
                      }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                        <Typography
                          sx={{
                            color: 'var(--mui-palette-text-secondary, #64748b)',
                            fontWeight: 600,
                            fontSize: '13px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          <Clock size={14} /> Thời gian còn lại
                        </Typography>
                        <Typography
                          sx={{
                            color: countdown <= 60 ? '#dc2626' : '#1e293b',
                            fontSize: '16px',
                            fontWeight: 'bold',
                            fontFamily: 'monospace'
                          }}
                        >
                          {formatCountdown(countdown)}
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant='determinate'
                        value={progressPercent}
                        sx={{
                          height: 4,
                          borderRadius: 2,
                          backgroundColor: '#e2e8f0',
                          '& .MuiLinearProgress-bar': {
                            borderRadius: 2,
                            backgroundColor: countdown <= 60 ? '#dc2626' : 'var(--primary-color)',
                            transition: 'width 1s linear'
                          }
                        }}
                      />
                      {/* Polling indicator */}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: '6px', mt: 1 }}>
                        <Radio size={10} color='#22c55e' className='animate-pulse' />
                        <Typography sx={{ fontSize: '11px', color: '#16a34a', fontWeight: 500 }}>
                          Tự động kiểm tra mỗi 5 giây
                        </Typography>
                      </Box>
                    </Box>

                    {/* Bank info */}
                    <Box sx={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <Typography
                        sx={{
                          fontSize: '20px',
                          fontWeight: 'bold',
                          textAlign: 'center',
                          color: 'var(--primary-color)'
                        }}
                      >
                        {formatCurrency(String(pendingRecord.amount))} VNĐ
                      </Typography>
                      <InfoRow label='Ngân hàng' value={bankInfo?.bank_name || '—'} />
                      <InfoRow label='Số tài khoản' value={bankInfo?.account_number || '—'} copy={copy} />
                      <InfoRow label='Chủ tài khoản' value={bankInfo?.account_name || '—'} copy={copy} />
                      <InfoRow
                        label='Nội dung chuyển khoản'
                        value={pendingRecord.note || pendingRecord.transaction_code}
                        copy={copy}
                        highlight
                      />

                      {/* Lưu ý quan trọng */}
                      <Box
                        sx={{
                          background: '#fffbeb',
                          border: '1px solid #fde68a',
                          borderRadius: '8px',
                          padding: '10px 12px',
                          mt: 0.5
                        }}
                      >
                        <Typography sx={{ fontSize: '12px', color: '#92400e', lineHeight: 1.6, fontWeight: 500 }}>
                          Chuyển <strong>đúng số tiền</strong> và <strong>đúng nội dung</strong> chuyển khoản.
                        </Typography>
                        <Typography sx={{ fontSize: '12px', color: '#92400e', lineHeight: 1.6 }}>
                          Tiền sẽ tự động cộng sau <strong>1–5 phút</strong>. Vui lòng chờ hệ thống xử lý, không rời
                          khỏi trang.
                        </Typography>
                        <Typography
                          sx={{ fontSize: '11px', color: '#78716c', lineHeight: 1.6, mt: 0.5, fontStyle: 'italic' }}
                        >
                          Nếu quá 10 phút chưa được cộng tiền, hãy liên hệ Admin hoặc{' '}
                          <a
                            href={`/${params.lang || 'vi'}/tickets`}
                            style={{ color: 'var(--primary-color)', fontWeight: 600, textDecoration: 'underline' }}
                          >
                            tạo ticket hỗ trợ
                          </a>
                          .
                        </Typography>
                      </Box>

                      <Box sx={{ display: 'flex', gap: '8px' }}>
                        <Button
                          variant='tonal'
                          fullWidth
                          onClick={handleCopyAll}
                          sx={{ padding: '10px', fontSize: '13px', textTransform: 'none', borderRadius: '10px' }}
                        >
                          <Copy size={14} className='me-2' /> Sao chép tất cả
                        </Button>
                        <Button
                          variant='outlined'
                          fullWidth
                          onClick={handleCancelPending}
                          disabled={cancelBankQr.isPending}
                          sx={{
                            padding: '10px',
                            fontSize: '13px',
                            textTransform: 'none',
                            borderRadius: '10px',
                            color: '#dc2626',
                            borderColor: '#fecaca',
                            '&:hover': { backgroundColor: '#fef2f2', borderColor: '#dc2626' }
                          }}
                        >
                          {cancelBankQr.isPending ? <Loader size={14} className='spinning-icon' /> : 'Hủy giao dịch'}
                        </Button>
                      </Box>
                    </Box>
                  </Box>

                  {/* QR Code */}
                  <Box
                    sx={{
                      background: 'var(--mui-palette-background-paper, #fff)',
                      borderRadius: '10px',
                      border: '1px solid var(--mui-palette-divider, #e2e8f0)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '20px'
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: '13px',
                        fontWeight: 600,
                        mb: 1.5,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        color: 'var(--mui-palette-text-primary, #1e293b)'
                      }}
                    >
                      <QrCode size={15} color='var(--primary-color)' /> Quét mã để thanh toán
                    </Typography>
                    <img
                      src={getQrUrl()}
                      alt='VietQR Code'
                      style={{ width: '100%', maxWidth: '280px', height: 'auto', borderRadius: '8px' }}
                    />
                  </Box>
                </>
              )}
            </Box>
          )}

          {/* ===== PHẦN DƯỚI: TABS ===== */}
          <Box
            sx={{
              background: 'var(--mui-palette-background-paper, #fff)',
              borderRadius: '12px',
              border: '1px solid var(--mui-palette-divider, #e2e8f0)',
              overflow: 'hidden'
            }}
          >
            <Tabs
              value={tabIndex}
              onChange={(_, v) => setTabIndex(v)}
              sx={{
                borderBottom: '1px solid var(--mui-palette-divider, #e2e8f0)',
                '& .MuiTab-root': { textTransform: 'none', fontWeight: 600 }
              }}
            >
              <Tab label='Lịch sử nạp tiền' />
              <Tab label='Lịch sử giao dịch' />
            </Tabs>

            <Box sx={{ padding: '16px' }}>
              {tabIndex === 0 && <DepositHistoryTab />}
              {tabIndex === 1 && <TransactionHistoryTab />}
            </Box>
          </Box>
        </Box>
      </div>
    </div>
  )
}

// ======== Sub-components ========

const BoxAmount = ({
  amount,
  handleSelectAmount,
  isActive
}: {
  amount: string
  handleSelectAmount: (selectedAmount: string) => void
  isActive: boolean
}) => {
  const numericValue = amount.replace(/\D/g, '')
  const num = Number(numericValue)
  const label = num >= 1_000_000 ? `${num / 1_000_000}tr` : `${num / 1_000}k`

  return (
    <Box
      onClick={() => handleSelectAmount(numericValue)}
      sx={{
        padding: '6px 14px',
        borderRadius: '20px',
        fontWeight: 600,
        fontSize: '13px',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        backgroundColor: isActive ? 'color-mix(in srgb, var(--primary-hover, #f97316) 8%, white)' : '#f8fafc',
        border: isActive ? '1.5px solid var(--primary-color)' : '1.5px solid #e2e8f0',
        color: isActive ? 'var(--primary-color)' : '#475569',
        '&:hover': {
          borderColor: 'var(--primary-color)',
          backgroundColor: 'color-mix(in srgb, var(--primary-hover, #f97316) 5%, white)',
          color: 'var(--primary-color)'
        }
      }}
    >
      {label}
    </Box>
  )
}

const InfoRow = ({
  label,
  value,
  copy,
  highlight
}: {
  label: string
  value: string
  copy?: (text: string) => void
  highlight?: boolean
}) => (
  <div className='flex flex-column gap-0'>
    <Typography component='div' sx={{ fontSize: '12px', color: 'var(--mui-palette-text-disabled, #94a3b8)' }}>
      {label}
    </Typography>
    <Typography
      component='div'
      sx={{
        fontSize: highlight ? '14px' : '13px',
        fontWeight: 600,
        color: highlight ? 'var(--primary-color)' : '#1e293b'
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {value}
        {copy && (
          <Button size='small' variant='text' onClick={() => copy(value)} sx={{ minWidth: 'auto', p: '2px' }}>
            <Copy size={12} />
          </Button>
        )}
      </Box>
    </Typography>
  </div>
)

// ======== Tab: Lịch sử nạp tiền ========
function DepositHistoryTab() {
  const { data: deposits = [], isLoading, refetch: refetchDeposits } = useDepositHistory()
  const cancelBankQr = useCancelBankQr()
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const handleDeleteDeposit = async (id: number) => {
    setDeletingId(id)

    try {
      await cancelBankQr.mutateAsync(id)
      refetchDeposits()
    } catch (error) {
      console.error('Lỗi khi xóa giao dịch:', error)
    } finally {
      setDeletingId(null)
    }
  }

  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 })

  const columns = useMemo(
    () => [
      {
        header: 'ID',
        size: 60,
        cell: ({ row }: any) => <span className='text-sm'>#{row.original.id}</span>
      },
      {
        header: 'Số tiền',
        size: 120,
        cell: ({ row }: any) => {
          const formatter = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })

          return <span className='text-sm font-bold'>{formatter.format(row.original.amount || 0)}</span>
        }
      },
      {
        header: 'Mã GD',
        size: 180,
        cell: ({ row }: any) => (
          <span className='text-sm text-gray-600'>{row.original.transaction_code || row.original.tid || '-'}</span>
        )
      },
      {
        header: 'Mô tả',
        size: 200,
        cell: ({ row }: any) => (
          <span className='text-sm text-gray-600'>{row.original.description || row.original.note || '-'}</span>
        )
      },
      {
        header: 'Trạng thái',
        size: 120,
        cell: ({ row }: any) => {
          const status = row.original.status

          if (status === 'success') return <Chip label='Thành công' size='small' color='success' />
          if (status === 'pending') return <Chip label='Đang chờ' size='small' color='warning' />
          if (status === 'failed') return <Chip label='Thất bại' size='small' color='error' />

          return <Chip label={status || '-'} size='small' />
        }
      },
      {
        header: 'Ngày',
        size: 150,
        cell: ({ row }: any) => (
          <div className='d-flex align-items-center gap-1'>
            <Clock3 size={14} />
            <span style={{ marginTop: '2px' }}>
              {row.original.created_at ? formatDateTimeLocal(row.original.created_at) : '-'}
            </span>
          </div>
        )
      },
      {
        header: '',
        id: 'actions',
        size: 60,
        cell: ({ row }: any) => {
          const status = row.original.status

          if (status !== 'pending') return null
          const isDeleting = deletingId === row.original.id

          return (
            <Button
              size='small'
              variant='text'
              onClick={() => handleDeleteDeposit(row.original.id)}
              disabled={isDeleting}
              sx={{
                minWidth: 'auto',
                p: '4px',
                color: 'var(--mui-palette-text-disabled, #94a3b8)',
                '&:hover': { color: '#dc2626', backgroundColor: '#fef2f2' }
              }}
              title='Xóa giao dịch'
            >
              {isDeleting ? <Loader size={14} className='spinning-icon' /> : <Trash2 size={14} />}
            </Button>
          )
        }
      }
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [deletingId]
  )

  const table = useReactTable({
    data: deposits,
    columns,
    state: { pagination },
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel()
  })

  return <DataTable table={table} columns={columns} isLoading={isLoading} data={deposits} />
}

// ======== Tab: Lịch sử giao dịch ========
function TransactionHistoryTab() {
  const axiosAuth = useAxiosAuth()

  const { data: dataOrders = [], isLoading } = useQuery({
    queryKey: ['getTransactionHistory'],
    queryFn: async () => {
      const res = await axiosAuth.get('/get-transaction-history')

      return res.data ?? []
    }
  })

  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 })

  const columns = useMemo(
    () => [
      {
        header: 'Lịch sử giao dịch',
        size: 400,
        cell: ({ row }: any) => {
          if (row.original?.type === 'NAPTIEN') {
            return (
              <div>
                <Chip label='Nạp' size='small' color='success' />
                <span className='font-sm ms-2'>Nạp tiền thành công!</span>
              </div>
            )
          } else if (row.original.type === 'TRUTIEN') {
            return (
              <div>
                <Chip label='Tiêu' size='small' color='primary' style={{ color: '#fff' }} />
                <span className='font-sm ms-2'>Trừ tiền thành công!</span>
              </div>
            )
          } else if (row.original.type === 'BUY') {
            return (
              <div>
                <Chip label='Mua' size='small' color='info' style={{ color: '#fff' }} />
                <span className='font-sm ms-2'>{row.original.noidung}</span>
              </div>
            )
          } else if (row.original.type === 'REFUND') {
            return (
              <div>
                <Chip label='Hoàn' size='small' color='error' style={{ color: '#fff' }} />
                <span className='font-sm ms-2'>{row.original.noidung}</span>
              </div>
            )
          }
        }
      },
      {
        size: 100,
        header: 'Số trước',
        cell: ({ row }: any) => {
          const formatter = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })

          return <span className='text-sm text-gray-500 font-bold'>{formatter.format(row.original.sotientruoc)}</span>
        }
      },
      {
        size: 100,
        header: 'Số tiền',
        cell: ({ row }: any) => {
          const formatter = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })

          return <span className='text-sm text-gray-500 font-bold'>{formatter.format(row.original.sotienthaydoi)}</span>
        }
      },
      {
        size: 100,
        header: 'Số tiền sau',
        cell: ({ row }: any) => {
          const formatter = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })

          return <span className='text-sm text-gray-500 font-bold'>{formatter.format(row.original.sotiensau)}</span>
        }
      },
      {
        header: 'Thời gian',
        size: 100,
        cell: ({ row }: any) => (
          <div className='d-flex align-items-center gap-1'>
            <Clock3 size={14} />
            <div style={{ marginTop: '2px' }}>{formatDateTimeLocal(row.original.created_at)}</div>
          </div>
        )
      }
    ],
    []
  )

  const table = useReactTable({
    data: dataOrders,
    columns,
    state: { pagination },
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel()
  })

  return <DataTable table={table} columns={columns} isLoading={isLoading} data={dataOrders} />
}

// ======== Shared DataTable ========
function DataTable({
  table,
  columns,
  isLoading,
  data
}: {
  table: any
  columns: any[]
  isLoading: boolean
  data: any[]
}) {
  const { pageIndex, pageSize } = table.getState().pagination
  const totalRows = table.getFilteredRowModel().rows.length
  const startRow = pageIndex * pageSize + 1
  const endRow = Math.min(startRow + pageSize - 1, totalRows)

  return (
    <div className='table-container'>
      <div className='table-wrapper'>
        <table className='data-table' style={isLoading || data.length === 0 ? { height: '100%' } : {}}>
          <thead className='table-header'>
            {table.getHeaderGroups().map((headerGroup: any) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header: any) => (
                  <th style={{ width: header.getSize() }} className='table-header th' key={header.id}>
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={columns.length} className='py-10 text-center'>
                  <div className='loader-wrapper'>
                    <div className='loader'>
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                    <p className='loading-text'>Đang tải dữ liệu...</p>
                  </div>
                </td>
              </tr>
            ) : table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className='py-10 text-center'>
                  <div className='flex flex-col items-center justify-center'>
                    <Image src='/images/no-data.png' alt='No data' width={160} height={160} />
                    <p className='mt-4 text-gray-500'>Không có dữ liệu</p>
                  </div>
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row: any) => (
                <tr className='table-row' key={row.id}>
                  {row.getVisibleCells().map((cell: any) => (
                    <td className='table-cell' key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalRows > 0 && (
        <div className='pagination-container'>
          <div className='pagination-wrapper'>
            <div className='pagination-info'>
              <div className='page-size-select'>
                <span className='text-sm text-gray'>Hiển thị mỗi trang</span>
                <div className='page-size-select-wrapper'>
                  <select
                    value={table.getState().pagination.pageSize}
                    onChange={(e: any) => table.setPageSize(Number(e.target.value))}
                    className='page-size-select'
                  >
                    <option value='10'>10</option>
                    <option value='50'>50</option>
                    <option value='100'>100</option>
                  </select>
                  <div className='select-arrow'>
                    <svg className='h-4 w-4' xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20'>
                      <path d='M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z' />
                    </svg>
                  </div>
                </div>
              </div>
              <div>
                <span>
                  {startRow} - {endRow} của {totalRows} hàng
                </span>
              </div>
            </div>
            <div className='pagination-buttons'>
              <Pagination
                count={table.getPageCount()}
                shape='rounded'
                variant='outlined'
                color='primary'
                page={table.getState().pagination.pageIndex + 1}
                onChange={(_: any, page: number) => table.setPageIndex(page - 1)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
