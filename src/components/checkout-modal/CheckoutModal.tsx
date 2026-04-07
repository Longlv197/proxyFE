'use client'

import React, { useRef, useState, useEffect } from 'react'

import { X, ShoppingCart, Loader, AlertTriangle, Tag, Clock, CheckCircle } from 'lucide-react'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-toastify'
import { useDispatch, useSelector } from 'react-redux'
import { useRouter } from 'next/navigation'

import QuantityControl from '@components/form/input-quantity/QuantityControl'
import ProtocolSelector from '@components/form/protocol-selector/ProtocolSelector'
import { setBalance } from '@/store/userSlice'
import type { AppDispatch, RootState } from '@/store'
import useAxiosAuth from '@/hocs/useAxiosAuth'

import './styles.css'

export interface PriceOption {
  key: string
  label: string
  price: number
}

interface CheckoutModalProps {
  open: boolean
  onClose: () => void
  productName: string
  productType: 'static' | 'rotating'
  serviceTypeId: number
  priceOptions: PriceOption[]
  protocols: string[]
  ipVersion?: string
  proxyType?: string
  country?: string
  extraPayload?: Record<string, any>
  authType?: 'userpass' | 'ip_whitelist' | 'both' | null
  pricingMode?: 'fixed' | 'per_unit'
  timeUnit?: 'day' | 'month'
  pricePerUnit?: number
  allowCustomAuth?: boolean
  maxIps?: number
  discountTiers?: Array<{ min: string; max: string; discount: string }>
  quantityTiers?: Array<{ min: string; max: string; discount?: string; price?: string }>
  customFields?: Array<{
    key: string // key nội bộ (gửi trong custom_fields)
    param?: string // backward compat
    label: string
    type: 'select' | 'text' | 'number'
    required?: boolean
    options?: Array<{ value: string; label: string }>
    default?: string
  }>
}

const CheckoutModal: React.FC<CheckoutModalProps> = ({
  open,
  onClose,
  productName,
  productType,
  serviceTypeId,
  priceOptions,
  protocols,
  ipVersion,
  proxyType,
  country,
  extraPayload,
  authType,
  pricingMode = 'fixed',
  timeUnit = 'day',
  pricePerUnit = 0,
  allowCustomAuth = false,
  maxIps = 1,
  discountTiers = [],
  quantityTiers = [],
  customFields
}) => {
  const [selectedDuration, setSelectedDuration] = useState(priceOptions[0]?.key || '1')
  const [customDuration, setCustomDuration] = useState(1)
  const [selectedProtocol, setSelectedProtocol] = useState(protocols[0] || 'http')
  const [quantity, setQuantity] = useState(1)
  const [discountCode, setDiscountCode] = useState('')
  const [purchaseSuccess, setPurchaseSuccess] = useState(false)
  const [apiError, setApiError] = useState('')
  const [showTopBanner, setShowTopBanner] = useState(false)
  const [authMethod, setAuthMethod] = useState<'userpass' | 'ip_whitelist'>('userpass')
  const [customUser, setCustomUser] = useState('')
  const [customPass, setCustomPass] = useState('')
  const [allowIp, setAllowIp] = useState('')
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({})

  // Hiện auth options nếu sản phẩm hỗ trợ
  const showAuthOptions = authType === 'both'
  const showUserPassFields = authType === 'userpass' || authType === 'both'
  const showIpField = authType === 'ip_whitelist' || (authType === 'both' && authMethod === 'ip_whitelist')

  const dispatch = useDispatch<AppDispatch>()
  const queryClient = useQueryClient()
  const axiosAuth = useAxiosAuth()
  const router = useRouter()
  const { sodu } = useSelector((state: RootState) => state.user)
  const isSubmitting = useRef(false)

  // Reset state khi options thay đổi (product khác)
  useEffect(() => {
    setSelectedDuration(priceOptions[0]?.key || '1')
    setSelectedProtocol(protocols[0] || 'http')
    setQuantity(1)
    setDiscountCode('')
    setPurchaseSuccess(false)
    setShowTopBanner(false)
    setCustomUser('')
    setCustomPass('')
    setAllowIp('')
    setAuthMethod('userpass')
    // Init custom field defaults
    const defaults: Record<string, string> = {}
    customFields?.forEach(field => {
      const fieldKey = field.key || field.param || ''
      if (field.default && fieldKey) defaults[fieldKey] = field.default
    })
    setCustomFieldValues(defaults)
    isSubmitting.current = false
  }, [priceOptions, protocols, customFields])

  // Reset success state khi modal mở lại
  useEffect(() => {
    if (open) {
      setPurchaseSuccess(false)
      setApiError('')
      setShowTopBanner(false)
      isSubmitting.current = false
    }
  }, [open])

  const isPerUnit = pricingMode === 'per_unit'
  const selectedOption = priceOptions.find(p => p.key === selectedDuration) || priceOptions[0]

  // Per_unit: tìm discount tier theo khoảng ngày
  const activeDiscount =
    isPerUnit && discountTiers.length > 0
      ? discountTiers.find(t => {
          const min = parseInt(t.min) || 0
          const max = parseInt(t.max) || Infinity

          return customDuration >= min && customDuration <= max
        })
      : null
  const discountPct = parseInt(activeDiscount?.discount || '0') || 0
  const effectivePricePerUnit = discountPct > 0 ? Math.round(pricePerUnit * (1 - discountPct / 100)) : pricePerUnit
  const fullPriceTotal = pricePerUnit * customDuration

  // Quantity discount — per_unit mode
  const activeQtyTier =
    quantityTiers.length > 0
      ? quantityTiers.find(t => {
          const min = parseInt(t.min) || 0
          const max = parseInt(t.max) || Infinity
          return quantity >= min && quantity <= max
        })
      : null
  const qtyDiscountPct = parseFloat(activeQtyTier?.discount || '0') || 0
  const qtyFixedPrice = activeQtyTier?.price ? parseInt(activeQtyTier.price) : 0
  const priceAfterQtyDiscount =
    qtyFixedPrice > 0
      ? qtyFixedPrice
      : qtyDiscountPct > 0
        ? Math.round(effectivePricePerUnit * (1 - qtyDiscountPct / 100))
        : effectivePricePerUnit

  // Fixed mode: quantity tiers nhúng trong price option
  const fixedQtyTiers = !isPerUnit && selectedOption ? (selectedOption as any).quantity_tiers || [] : []
  const activeFixedQtyTier =
    fixedQtyTiers.length > 0
      ? fixedQtyTiers.find((t: any) => {
          const min = parseInt(t.min) || 0
          const max = parseInt(t.max) || Infinity
          return quantity >= min && quantity <= max
        })
      : null
  const fixedQtyDiscountPct = parseFloat(activeFixedQtyTier?.discount || '0') || 0
  const fixedQtyPrice = activeFixedQtyTier?.price
    ? parseInt(activeFixedQtyTier.price)
    : fixedQtyDiscountPct > 0
      ? Math.round((selectedOption?.price || 0) * (1 - fixedQtyDiscountPct / 100))
      : 0

  const unitPrice = isPerUnit
    ? priceAfterQtyDiscount * customDuration
    : fixedQtyPrice > 0
      ? fixedQtyPrice
      : selectedOption?.price || 0
  const baseUnitPrice = isPerUnit ? effectivePricePerUnit * customDuration : selectedOption?.price || 0
  const hasQtyDiscount = unitPrice < baseUnitPrice

  const activeDuration = isPerUnit ? String(customDuration) : selectedDuration
  const total = unitPrice * quantity

  const calculateDiscount = (key: string, price: number) => {
    if (priceOptions.length <= 1) return null
    const sorted = [...priceOptions].sort((a, b) => parseInt(a.key) - parseInt(b.key))
    const base = sorted[0]
    const baseDays = parseInt(base.key) || 1
    const basePrice = base.price

    if (!basePrice) return null
    const currentDays = parseInt(key) || 0

    if (!currentDays) return null
    const originalPrice = (basePrice / baseDays) * currentDays

    if (price >= originalPrice) return null
    const pct = (1 - price / originalPrice) * 100

    return pct > 0 ? Math.round(pct) : null
  }

  const { mutate, isPending } = useMutation({
    mutationFn: (orderData: any) => {
      const endpoint = productType === 'static' ? '/buy-proxy-static' : '/buy-proxy-rotating'

      return axiosAuth.post(endpoint, orderData)
    },
    onSuccess: data => {
      isSubmitting.current = false

      if (data.data.success === false) {
        toast.error('Lỗi hệ thống, xin vui lòng liên hệ Admin.')
      } else {
        setPurchaseSuccess(true)
        setApiError('')
        setShowTopBanner(true)

        // Số dư thật từ response — không cần gọi /me
        if (data.data?.new_balance != null) {
          dispatch(setBalance(data.data.new_balance))
        }

        const queryKey = productType === 'static' ? 'orderProxyStatic' : 'proxyData'

        queryClient.invalidateQueries({ queryKey: [queryKey] })
        queryClient.invalidateQueries({ queryKey: ['userOrders'] })
        queryClient.invalidateQueries({ queryKey: ['profile'] })
      }
    },
    onError: (error: any) => {
      isSubmitting.current = false
      setApiError(error.response?.data?.message || 'Lỗi không xác định, vui lòng thử lại.')
      setShowTopBanner(true)
    }
  })

  const handlePurchase = () => {
    if (isSubmitting.current || isPending || purchaseSuccess) return
    isSubmitting.current = true
    setApiError('')

    // Validate user:pass pair
    if (customUser && !customPass) {
      toast.error('Đã nhập username thì phải nhập password.')
      isSubmitting.current = false
      return
    }
    if (!customUser && customPass) {
      toast.error('Đã nhập password thì phải nhập username.')
      isSubmitting.current = false
      return
    }
    // Validate IP nếu chọn ip_whitelist
    if (showIpField && authMethod === 'ip_whitelist') {
      const ips = allowIp
        .split(',')
        .map((ip: string) => ip.trim())
        .filter(Boolean)
      if (ips.length === 0) {
        toast.error('Vui lòng nhập IP whitelist.')
        isSubmitting.current = false
        return
      }
      const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/
      const invalidIp = ips.find((ip: string) => !ipRegex.test(ip))
      if (invalidIp) {
        toast.error(`IP không hợp lệ: ${invalidIp}`)
        isSubmitting.current = false
        return
      }
      if (maxIps > 0 && ips.length > maxIps) {
        toast.error(`Tối đa ${maxIps} IP`)
        isSubmitting.current = false
        return
      }
    }
    // Validate required custom fields
    const missingField = customFields?.find(
      field => field.required && !customFieldValues[field.key || field.param || '']
    )
    if (missingField) {
      toast.error(`Vui lòng chọn ${missingField.label}.`)
      isSubmitting.current = false
      return
    }

    const orderData: any = {
      serviceTypeId,
      quantity,
      protocol: selectedProtocol,
      days: activeDuration,
      total,
      ...(productType === 'static' && {
        price: unitPrice,
        ip_version: ipVersion,
        proxy_type: proxyType,
        country,
        isPrivate: 'true'
      }),
      ...(productType === 'rotating' && {
        time: activeDuration,
        ...extraPayload
      }),
      // Auth options
      ...(customUser && { custom_user: customUser, custom_pass: customPass }),
      ...(showAuthOptions && { auth_method: authMethod }),
      ...(showIpField &&
        allowIp && {
          ip_whitelist: allowIp
            .split(',')
            .map((ip: string) => ip.trim())
            .filter(Boolean)
        }),
      ...(Object.keys(customFieldValues).length > 0 && { custom_fields: customFieldValues })
    }

    mutate(orderData)
  }

  const handleApplyDiscount = () => {
    toast.info('Tính năng đang phát triển')
  }

  if (!open) return null

  return (
    <div className='checkout-overlay' onClick={() => !isPending && onClose()}>
      <div className='checkout-modal' onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className='checkout-header'>
          <h2 className='checkout-title'>
            <ShoppingCart size={20} />
            Thanh Toán
          </h2>
          <button type='button' className='checkout-close' onClick={onClose} disabled={isPending}>
            <X size={20} />
          </button>
        </div>

        <div className='checkout-body'>
          {/* Banner nổi — sticky đầu body, click X → về vị trí cuối */}
          {showTopBanner && (apiError || purchaseSuccess) && (
            <div
              style={{
                position: 'sticky',
                top: -20,
                zIndex: 10,
                margin: '-20px -20px 12px -20px',
                padding: '10px 14px',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                background: purchaseSuccess ? '#f0fdf4' : '#fef2f2',
                borderBottom: `1px solid ${purchaseSuccess ? '#bbf7d0' : '#fecaca'}`,
                color: purchaseSuccess ? '#16a34a' : '#dc2626'
              }}
            >
              {purchaseSuccess ? (
                <CheckCircle size={16} style={{ flexShrink: 0 }} />
              ) : (
                <AlertTriangle size={16} style={{ flexShrink: 0 }} />
              )}
              <span style={{ flex: 1 }}>{purchaseSuccess ? 'Mua proxy thành công!' : apiError}</span>
              <button
                type='button'
                onClick={() => setShowTopBanner(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, flexShrink: 0 }}
              >
                <X size={14} color='#94a3b8' />
              </button>
            </div>
          )}

          <p className='checkout-product-name'>
            {productName} <span style={{ fontSize: '12px', fontWeight: 500, color: '#94a3b8' }}>#{serviceTypeId}</span>
          </p>

          {/* Per-unit duration input */}
          {isPerUnit && (
            <div className='checkout-section'>
              <label className='checkout-section-label'>
                <Clock size={16} />
                {timeUnit === 'month' ? 'CHỌN SỐ THÁNG' : 'CHỌN SỐ NGÀY'}
              </label>

              {/* Mốc nhanh theo discount tiers */}
              {discountTiers.length > 0 && (
                <div className='perunit-tiers'>
                  {/* Mốc 1 (không CK) */}
                  {(() => {
                    // Lấy ra 5 tier đầu để hiển thị, nếu nhiều hơn 5 thì user có thể tự nhập ở input bên dưới
                    const limit5Tiers = discountTiers.slice(0, 5)
                    const unitLabel = timeUnit === 'month' ? 'tháng' : 'ngày'
                    return (
                      <>
                        <button
                          type='button'
                          className={`perunit-tier ${customDuration === 1 ? 'active' : ''}`}
                          onClick={() => setCustomDuration(1)}
                        >
                          <span className='perunit-tier-top'>
                            <span className='perunit-tier-days'>1</span>
                            <span className='perunit-tier-unit'>{unitLabel}</span>
                          </span>
                          <span className='perunit-tier-price'>{pricePerUnit.toLocaleString('vi-VN')}đ</span>
                        </button>
                        {limit5Tiers.map((tier, i) => {
                          const minDays = parseInt(tier.min) || 1
                          const disc = parseInt(tier.discount) || 0
                          const tierPrice = Math.round(pricePerUnit * (1 - disc / 100))

                          return (
                            <button
                              type='button'
                              key={i}
                              className={`perunit-tier ${customDuration === minDays ? 'active' : ''}`}
                              onClick={() => setCustomDuration(minDays)}
                            >
                              <span className='perunit-tier-badge'>-{disc}%</span>
                              <span className='perunit-tier-top'>
                                <span className='perunit-tier-days'>{minDays}</span>
                                <span className='perunit-tier-unit'>{unitLabel}</span>
                              </span>
                              <span className='perunit-tier-price'>{tierPrice.toLocaleString('vi-VN')}đ</span>
                            </button>
                          )
                        })}
                      </>
                    )
                  })()}
                </div>
              )}

              {/* Input tự nhập + tổng giá */}
              <div className='perunit-input-row'>
                <span className='perunit-input-label'>Hoặc nhập:</span>
                <div className='perunit-input-wrap'>
                  <input
                    type='number'
                    min={1}
                    max={365}
                    value={customDuration}
                    onChange={e => setCustomDuration(Math.max(1, parseInt(e.target.value) || 1))}
                    className='perunit-input'
                  />
                  <span className='perunit-input-unit'>{timeUnit === 'month' ? 'tháng' : 'ngày'}</span>
                </div>
                <span className='perunit-calc'>
                  = <strong>{unitPrice.toLocaleString('vi-VN')}đ</strong>
                </span>
              </div>

              {/* Discount info */}
              {discountPct > 0 && (
                <div className='perunit-saving'>
                  <span className='perunit-saving-pct'>-{discountPct}%</span>
                  <span className='perunit-saving-detail'>
                    <s>{fullPriceTotal.toLocaleString('vi-VN')}đ</s> tiết kiệm{' '}
                    <strong>{(fullPriceTotal - unitPrice).toLocaleString('vi-VN')}đ</strong>
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Duration selector (mốc cố định) */}
          {!isPerUnit && priceOptions.length > 1 && (
            <div className='checkout-section'>
              <label className='checkout-section-label'>
                <Clock size={16} />
                THỜI GIAN
              </label>
              <div className='checkout-duration-options'>
                {priceOptions.map(option => {
                  const discount = calculateDiscount(option.key, option.price)

                  return (
                    <label
                      key={option.key}
                      className={`checkout-duration-option ${selectedDuration === option.key ? 'active' : ''}`}
                    >
                      <input
                        type='radio'
                        value={option.key}
                        checked={selectedDuration === option.key}
                        onChange={() => setSelectedDuration(option.key)}
                      />
                      <span>{option.label}</span>
                      {discount !== null && discount > 0 && <span className='duration-discount'>-{discount}%</span>}
                    </label>
                  )
                })}
              </div>
            </div>
          )}

          {/* Protocol selector */}
          {protocols.length > 1 && (
            <div className='checkout-section'>
              <ProtocolSelector
                protocols={protocols}
                selectedProtocol={selectedProtocol}
                onProtocolChange={setSelectedProtocol}
                label='GIAO THỨC'
              />
            </div>
          )}

          {/* Custom fields (tuỳ chọn mua hàng từ ServiceType) */}
          {customFields?.map(field => {
            const fieldKey = field.key || field.param || ''
            return (
              <div className='checkout-section' key={fieldKey}>
                <label className='checkout-section-label'>{field.label.toUpperCase()}</label>
                {(field.type || 'select') === 'select' && field.options ? (
                  <div className='checkout-duration-options'>
                    {field.options.map(opt => (
                      <label
                        key={opt.value}
                        className={`checkout-duration-option ${(customFieldValues[fieldKey] || field.default) === opt.value ? 'active' : ''}`}
                      >
                        <input
                          type='radio'
                          value={opt.value}
                          checked={(customFieldValues[fieldKey] || field.default) === opt.value}
                          onChange={() => setCustomFieldValues(prev => ({ ...prev, [fieldKey]: opt.value }))}
                        />
                        <span>{opt.label}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <input
                    type={field.type === 'number' ? 'number' : 'text'}
                    className='discount-input'
                    placeholder={field.default || ''}
                    value={customFieldValues[fieldKey] || ''}
                    onChange={e => setCustomFieldValues(prev => ({ ...prev, [fieldKey]: e.target.value }))}
                    style={{ width: '100%' }}
                  />
                )}
              </div>
            )
          })}

          {/* Auth section */}
          {(authType === 'userpass' || authType === 'ip_whitelist' || authType === 'both') && (
            <div className='checkout-section'>
              <label className='checkout-section-label'>CÁCH KẾT NỐI PROXY</label>

              {/* Giải thích chung */}
              <div
                style={{
                  fontSize: '11.5px',
                  color: '#64748b',
                  marginBottom: 10,
                  lineHeight: 1.5,
                  padding: '8px 12px',
                  background: '#f8fafc',
                  borderRadius: 8
                }}
              >
                {authType === 'both'
                  ? 'Chọn cách xác thực proxy. Bạn có thể đổi sau khi mua.'
                  : authType === 'userpass'
                    ? 'Proxy sử dụng User:Pass để xác thực kết nối.'
                    : 'Proxy sử dụng IP Whitelist — chỉ IP bạn đăng ký mới dùng được.'}
              </div>

              {/* Radio chọn mode — chỉ khi both */}
              {authType === 'both' && (
                <div className='checkout-duration-options' style={{ marginBottom: 12 }}>
                  <label className={`checkout-duration-option ${authMethod === 'userpass' ? 'active' : ''}`}>
                    <input
                      type='radio'
                      value='userpass'
                      checked={authMethod === 'userpass'}
                      onChange={() => setAuthMethod('userpass')}
                    />
                    <span>User:Pass</span>
                  </label>
                  <label className={`checkout-duration-option ${authMethod === 'ip_whitelist' ? 'active' : ''}`}>
                    <input
                      type='radio'
                      value='ip_whitelist'
                      checked={authMethod === 'ip_whitelist'}
                      onChange={() => setAuthMethod('ip_whitelist')}
                    />
                    <span>IP Whitelist</span>
                  </label>
                </div>
              )}

              {/* User:Pass fields */}
              {(authType === 'userpass' || (authType === 'both' && authMethod === 'userpass')) && (
                <div style={{ padding: '12px', background: '#fafbfc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  {allowCustomAuth ? (
                    <>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                        Tài khoản proxy
                      </div>
                      <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: 8 }}>
                        Tự đặt username/password hoặc bỏ trống để hệ thống tạo ngẫu nhiên.
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '10px', color: '#64748b', marginBottom: 3, fontWeight: 500 }}>
                            Username
                          </div>
                          <input
                            type='text'
                            placeholder='VD: myproxy01'
                            value={customUser}
                            onChange={e => setCustomUser(e.target.value.replace(/[^a-zA-Z0-9_.-]/g, ''))}
                            className='discount-input'
                            style={{
                              width: '100%',
                              padding: '8px 10px',
                              border: '1px solid #d1d5db',
                              borderRadius: 6,
                              fontSize: '13px'
                            }}
                            maxLength={50}
                          />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '10px', color: '#64748b', marginBottom: 3, fontWeight: 500 }}>
                            Password
                          </div>
                          <input
                            type='text'
                            placeholder='VD: pass1234'
                            value={customPass}
                            onChange={e => setCustomPass(e.target.value.replace(/[^a-zA-Z0-9_.-]/g, ''))}
                            className='discount-input'
                            style={{
                              width: '100%',
                              padding: '8px 10px',
                              border: '1px solid #d1d5db',
                              borderRadius: 6,
                              fontSize: '13px'
                            }}
                            maxLength={50}
                          />
                        </div>
                      </div>
                    </>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 8,
                          background: '#dbeafe',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}
                      >
                        <span style={{ fontSize: '14px' }}>~</span>
                      </div>
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>Tự động tạo tài khoản</div>
                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                          Username và password sẽ được tạo ngẫu nhiên sau khi mua thành công.
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* IP Whitelist field */}
              {(authType === 'ip_whitelist' || (authType === 'both' && authMethod === 'ip_whitelist')) && (
                <div style={{ padding: '12px', background: '#fafbfc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                    IP được phép sử dụng proxy
                  </div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: 8 }}>
                    Chỉ thiết bị có IP này mới kết nối được.
                    {maxIps > 1 ? ` Tối đa ${maxIps} IP, cách nhau bởi dấu phẩy.` : ''}
                  </div>
                  <div>
                    <div style={{ fontSize: '10px', color: '#64748b', marginBottom: 3, fontWeight: 500 }}>
                      Địa chỉ IP
                    </div>
                    <input
                      type='text'
                      placeholder='VD: 123.45.67.89, 98.76.54.32'
                      value={allowIp}
                      onChange={e => setAllowIp(e.target.value.replace(/[^0-9.,\s]/g, ''))}
                      className='discount-input'
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        border: '1px solid #d1d5db',
                        borderRadius: 6,
                        fontSize: '13px'
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Price + Quantity table */}
          <div className='checkout-price-table'>
            <div className='price-table-header'>
              <span>Giá</span>
              <span>Số lượng</span>
              <span>Thành tiền</span>
            </div>
            <div className='price-table-row'>
              <span className='price-cell'>
                {hasQtyDiscount && (
                  <span style={{ textDecoration: 'line-through', color: '#94a3b8', fontSize: '11px', marginRight: 4 }}>
                    {baseUnitPrice.toLocaleString('vi-VN')}đ
                  </span>
                )}
                {unitPrice.toLocaleString('vi-VN')}đ
              </span>
              <div className='qty-cell'>
                <QuantityControl min={1} max={9999} value={quantity} onChange={setQuantity} />
              </div>
              <span className='subtotal-cell'>{total.toLocaleString('vi-VN')}đ</span>
            </div>
            {/* Qty discount tiers */}
            {(quantityTiers.length > 0 || fixedQtyTiers.length > 0) && (
              <div
                style={{ padding: '8px 12px', fontSize: '11px', background: '#f0fdf4', borderRadius: '0 0 8px 8px' }}
              >
                {hasQtyDiscount ? (
                  <div style={{ color: '#16a34a', fontWeight: 600 }}>Mua {quantity} proxy — đang được giảm giá!</div>
                ) : (
                  <div style={{ color: '#64748b', marginBottom: 4 }}>
                    {(() => {
                      const tiers = isPerUnit ? quantityTiers : fixedQtyTiers
                      const nextTier = tiers.find((t: any) => quantity < (parseInt(t.min) || 0))
                      return nextTier
                        ? `Mua từ ${nextTier.min}+ proxy để được giảm giá`
                        : 'Mua nhiều hơn để được giảm giá'
                    })()}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                  {(isPerUnit ? quantityTiers : fixedQtyTiers)
                    .filter((t: any) => t.min && (t.discount || t.price))
                    .map((t: any, i: number) => {
                      const disc = parseFloat(t.discount) || 0
                      const min = parseInt(t.min) || 0
                      const isActive = quantity >= min && quantity <= (parseInt(t.max) || Infinity)
                      return (
                        <span
                          key={i}
                          style={{
                            padding: '2px 8px',
                            borderRadius: 4,
                            fontSize: '10.5px',
                            fontWeight: isActive ? 700 : 500,
                            background: isActive ? '#dcfce7' : '#f8fafc',
                            color: isActive ? '#15803d' : '#64748b',
                            border: `1px solid ${isActive ? '#86efac' : '#e2e8f0'}`
                          }}
                        >
                          {t.min}+: {disc ? `-${disc}%` : ''}
                          {t.price ? ` ${parseInt(t.price).toLocaleString('vi-VN')}đ` : ''}
                        </span>
                      )
                    })}
                </div>
              </div>
            )}
          </div>

          {/* Discount code */}
          <div className='checkout-discount'>
            <div className='discount-input-wrapper'>
              <Tag size={16} className='discount-icon' />
              <input
                type='text'
                placeholder='Mã giảm giá'
                value={discountCode}
                onChange={e => setDiscountCode(e.target.value)}
                className='discount-input'
              />
            </div>
            <button type='button' className='discount-btn' onClick={handleApplyDiscount}>
              Áp dụng
            </button>
          </div>

          {/* Order summary */}
          <div className='checkout-summary'>
            {ipVersion && (
              <div className='summary-row'>
                <span className='summary-label'>Loại IP:</span>
                <span className='summary-value'>
                  {productType === 'rotating' ? 'Rotating' : 'Static'} {ipVersion?.toUpperCase()} {country || ''}
                </span>
              </div>
            )}
            <div className='summary-row'>
              <span className='summary-label'>Thời lượng:</span>
              <span className='summary-value'>{selectedOption?.label || ''}</span>
            </div>
            <div className='summary-row'>
              <span className='summary-label'>Giao thức:</span>
              <span className='summary-value'>{selectedProtocol?.toUpperCase()}</span>
            </div>
            <div className='summary-row'>
              <span className='summary-label'>Giá:</span>
              <span className='summary-value'>
                {unitPrice.toLocaleString('vi-VN')}đ
                {(() => {
                  const disc = !isPerUnit ? calculateDiscount(selectedDuration, unitPrice) : null

                  if (!disc || disc <= 0) return null
                  const sorted = [...priceOptions].sort((a, b) => parseInt(a.key) - parseInt(b.key))
                  const base = sorted[0]
                  const baseDays = parseInt(base.key) || 1
                  const currentDays = parseInt(selectedDuration) || 0
                  const originalPrice = (base.price / baseDays) * currentDays

                  return (
                    <span style={{ fontSize: '11px', color: '#22c55e', fontWeight: 600, marginLeft: 6 }}>
                      Tiết kiệm {disc}%{' '}
                      <span style={{ textDecoration: 'line-through', color: '#94a3b8', fontWeight: 400 }}>
                        ({originalPrice.toLocaleString('vi-VN')}đ)
                      </span>
                    </span>
                  )
                })()}
              </span>
            </div>
            <div className='summary-row'>
              <span className='summary-label'>Số lượng:</span>
              <span className='summary-value'>{quantity}</span>
            </div>
          </div>

          {/* Lỗi từ API — hiển thị ở cuối */}
          {apiError && !purchaseSuccess && !showTopBanner && (
            <div className='checkout-warning'>
              <AlertTriangle size={16} />
              <span>{apiError}</span>
            </div>
          )}

          {/* Mua thành công — hiển thị ở cuối */}
          {purchaseSuccess && !showTopBanner && (
            <div
              style={{
                padding: '10px 14px',
                background: '#f0fdf4',
                borderRadius: 8,
                border: '1px solid #bbf7d0',
                fontSize: '13px',
                color: '#16a34a',
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              <CheckCircle size={16} />
              <span>Mua proxy thành công!</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className='checkout-footer'>
          <div className='checkout-total'>
            <span className='total-text'>Tổng Cộng:</span>
            <span className='total-amount'>{total.toLocaleString('vi-VN')}đ</span>
          </div>
          {purchaseSuccess ? (
            <div style={{ display: 'flex', gap: 8, width: '100%' }}>
              <button
                type='button'
                className='checkout-pay-btn'
                style={{ flex: 1 }}
                onClick={() => {
                  setPurchaseSuccess(false)
                  setApiError('')
                  setShowTopBanner(false)
                  isSubmitting.current = false
                }}
              >
                <ShoppingCart size={18} /> Mua tiếp
              </button>
              <button
                type='button'
                className='checkout-pay-btn'
                style={{ flex: 1, background: '#334155' }}
                onClick={() => {
                  onClose()
                  router.push('/history-order')
                }}
              >
                Lịch sử đơn hàng
              </button>
            </div>
          ) : (
            <button type='button' className='checkout-pay-btn' onClick={handlePurchase} disabled={isPending}>
              {isPending ? (
                <>
                  <Loader size={18} className='animate-pulse' /> Đang xử lý...
                </>
              ) : (
                <>
                  <ShoppingCart size={18} /> Thanh Toán
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default CheckoutModal
