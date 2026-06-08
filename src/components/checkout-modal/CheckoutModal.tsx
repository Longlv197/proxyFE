'use client'

import React, { useRef, useState, useEffect } from 'react'

import { X, ShoppingCart, Loader, AlertTriangle, Tag, Clock, CheckCircle } from 'lucide-react'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-toastify'
import { useDispatch, useSelector } from 'react-redux'
import { useParams, useRouter } from 'next/navigation'

import { resolveCountryLabel } from '@/utils/countryI18n'

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
  unit?: string  // Phase 2: 'day' | 'week' | 'month' | 'quarter' | 'year' | 'half_day' | 'custom'
  qty?: number   // Phase 2: số đơn vị (vd 3 tháng)
}

// Format label đẹp cho user theo unit + qty (vd '3 tháng', '1 quý', '1 năm')
// Fallback: 'X ngày' nếu không có unit
const UNIT_LABELS: Record<string, string> = {
  half_day: 'nửa ngày',
  day: 'ngày',
  week: 'tuần',
  month: 'tháng',
  quarter: 'quý',
  year: 'năm',
}

export function formatDurationLabel(opt: PriceOption): string {
  if (opt.unit && UNIT_LABELS[opt.unit] && opt.qty) {
    return `${opt.qty} ${UNIT_LABELS[opt.unit]}`
  }

  // Fallback: dùng label cũ hoặc "X ngày"
  return opt.label || `${opt.key} ngày`
}

interface CheckoutModalProps {
  open: boolean
  onClose: () => void
  productName: string
  productType: 'static' | 'rotating'
  /** Discriminator chi tiết hơn productType — vd 'residential' → label "Residential V4". */
  kind?: string
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
  /** Giới hạn số lượng từ SP (Proxyma residential: min=max=1). */
  minQuantity?: number
  maxQuantity?: number
  /** Residential: 'package' = giá cố định theo gói (total KHÔNG nhân số lượng). Mặc định 'multiply'. */
  priceQuantityMode?: 'multiply' | 'package'
  discountTiers?: Array<{ min: string; max: string; discount: string }>
  quantityTiers?: Array<{ min: string; max: string; discount?: string; price?: string }>
  customFields?: Array<{
    key: string
    param?: string
    label: string
    type: 'select' | 'text' | 'number' | 'combo'
    required?: boolean
    options?: Array<{ key?: string; value?: string; label: string; price?: number; flag?: string; values?: Record<string, string> }>
    default?: string
    source?: 'manual' | 'api_tariffs' | 'api_countries' | 'api_regions' | 'api_cities'
    depends_on?: string
    // Snapshot subset per parent value (admin cấu hình trước, KHÔNG fetch live)
    options_by_parent?: Record<string, Array<{ key?: string; value?: string; label: string }>>
    // Combo (Phase 2): components map sang param NCC
    components?: Array<{ key: string; param_name: string }>
  }>
}

const CheckoutModal: React.FC<CheckoutModalProps> = ({
  open,
  onClose,
  productName,
  productType,
  kind,
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
  minQuantity = 1,
  maxQuantity = 9999,
  priceQuantityMode = 'multiply',
  discountTiers = [],
  quantityTiers = [],
  customFields
}) => {
  const [selectedDuration, setSelectedDuration] = useState(priceOptions[0]?.key || '1')
  const [customDuration, setCustomDuration] = useState(1)
  const [selectedProtocol, setSelectedProtocol] = useState(protocols[0] || 'http')
  const [quantity, setQuantity] = useState(Math.max(1, minQuantity))
  const [discountCode, setDiscountCode] = useState('')
  const [purchaseSuccess, setPurchaseSuccess] = useState(false)
  const [apiError, setApiError] = useState('')
  const [showTopBanner, setShowTopBanner] = useState(false)
  const [authMethod, setAuthMethod] = useState<'userpass' | 'ip_whitelist'>('userpass')
  const [customUser, setCustomUser] = useState('')
  const [customPass, setCustomPass] = useState('')
  const [allowIp, setAllowIp] = useState('')
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({})

  // Cascade reset: khi parent thay đổi → reset child + grandchild values
  const setFieldValue = (key: string, value: string) => {
    setCustomFieldValues(prev => {
      const next = { ...prev, [key]: value }
      customFields?.forEach(f => {
        if (f.depends_on === key) {
          delete next[f.key || f.param || '']
          customFields?.forEach(g => {
            if (g.depends_on === (f.key || f.param || '')) {
              delete next[g.key || g.param || '']
            }
          })
        }
      })
      return next
    })
  }

  // Search filter local cho mỗi field (region/city) — pill grid với search inline
  const [fieldSearch, setFieldSearch] = useState<Record<string, string>>({})

  // Locale từ Next.js [lang] dynamic segment (vi/en/ko/ja/cn). Default 'vi'.
  const params = useParams<{ lang?: string }>()
  const locale = (params?.lang as string) || 'vi'

  // Resolve label theo locale: nếu opt là country (có flag/key match ISO) → dùng dictionary.
  // Else fallback opt.label_i18n[locale] (Phase 1b) → opt.label gốc.
  const resolveLabel = React.useCallback((opt: any, isCountry: boolean): string => {
    if (isCountry) {
      const code = (opt.flag || opt.key || opt.value || '').toString()

      return resolveCountryLabel(code, locale, opt.label)
    }
    if (opt.label_i18n && typeof opt.label_i18n === 'object') {
      return opt.label_i18n[locale] || opt.label_i18n.en || opt.label
    }

    return opt.label
  }, [locale])

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

  // Pricing — dùng cấu trúc chung của hệ thống (price_by_duration / per_unit).
  // KHÔNG override theo option price (đồng bộ với mọi SP, đơn giản hoá).
  const unitPrice = isPerUnit
    ? priceAfterQtyDiscount * customDuration
    : fixedQtyPrice > 0
      ? fixedQtyPrice
      : selectedOption?.price || 0
  const baseUnitPrice = isPerUnit ? effectivePricePerUnit * customDuration : selectedOption?.price || 0
  const hasQtyDiscount = unitPrice < baseUnitPrice

  const activeDuration = isPerUnit ? String(customDuration) : selectedDuration
  // Package mode (residential): giá cố định theo gói, số lượng proxy KHÔNG nhân vào tiền (khớp BE).
  const total = priceQuantityMode === 'package' ? unitPrice : unitPrice * quantity

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
                    max={9999}
                    value={customDuration || ''}
                    onChange={e => {
                      const val = e.target.value
                      if (val === '') { setCustomDuration(0); return }
                      const num = parseInt(val)
                      if (!isNaN(num)) setCustomDuration(Math.max(num, 1))
                    }}
                    onBlur={() => { if (!customDuration || customDuration < 1) setCustomDuration(1) }}
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
                      <span>{formatDurationLabel(option)}</span>
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
          {customFields?.map((field, fieldIdx) => {
            const fieldKey = field.key || field.param || ''
            // Auto-detect country flag: display_type='country_flag' HOẶC source='api_countries'/key='country'
            const isCountryFlag = (field as any).display_type === 'country_flag' ||
              field.source === 'api_countries' ||
              fieldKey === 'country'
            // Tariff card không còn — đã bỏ pricing per option. Detect chỉ bằng source.
            // Nếu admin muốn card nổi bật cho tariff, dùng display_type='card' (Phase sau).
            const isTariffCard = false
            const isDependent = field.source === 'api_regions' || field.source === 'api_cities'
            const parentKey = field.depends_on || ''
            const parentValue = parentKey ? customFieldValues[parentKey] : ''
            // Dependent → đọc snapshot options_by_parent[parentValue] (admin đã chọn trước)
            const fieldOptions = isDependent
              ? (field.options_by_parent?.[parentValue] || [])
              : (field.options || [])
            const isLoading = false  // Không còn fetch live — snapshot mode
            const isLocked = isDependent && !parentValue
            const parentLabel = customFields?.find(f => (f.key || f.param) === parentKey)?.label || parentKey
            const stepNum = ['①', '②', '③', '④', '⑤', '⑥'][fieldIdx] || `${fieldIdx + 1}.`
            const selectedValue = customFieldValues[fieldKey] || field.default
            const selectedOpt = fieldOptions.find((o: any) => (o.key || o.value) === selectedValue)

            return (
              <div className='checkout-section' key={fieldKey}
                style={{ opacity: isLocked ? 0.5 : 1, transition: 'opacity .2s' }}
              >
                <label className='checkout-section-label' style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: 20, height: 20, borderRadius: '50%',
                    background: selectedOpt ? '#10b981' : (isLocked ? '#cbd5e1' : '#6366f1'),
                    color: '#fff', fontSize: 11, fontWeight: 700
                  }}>{selectedOpt ? '✓' : stepNum}</span>
                  {field.label.toUpperCase()}
                  {field.required && <span style={{ color: '#ef4444' }}>*</span>}
                  {isLoading && <span style={{ fontSize: 11, color: '#64748b', fontWeight: 400 }}>Đang tải…</span>}
                </label>

                {isLocked ? (
                  <div style={{ padding: '12px', background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: 8, fontSize: 12.5, color: '#64748b', textAlign: 'center' }}>
                    Chọn <strong style={{ color: '#475569' }}>{parentLabel}</strong> ở bước trên để hiện danh sách
                  </div>
                ) : isLoading ? (
                  <div style={{ padding: '12px', background: '#f1f5f9', borderRadius: 8, fontSize: 12, color: '#64748b', textAlign: 'center' }}>
                    ⏳ Đang tải danh sách từ NCC…
                  </div>
                ) : isDependent && fieldOptions.length === 0 ? (
                  <div style={{ padding: '10px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, fontSize: 12, color: '#991b1b' }}>
                    NCC không có {field.label.toLowerCase()} cho lựa chọn này. {!field.required ? 'Có thể bỏ qua.' : 'Chọn lại field trên.'}
                  </div>
                ) : field.type === 'combo' ? (
                  // Combo gói vị trí — 1 lưới, mỗi gói = cờ + tên, click chọn key (bên trong tự bung country/region/city)
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 8 }}>
                    {(field.options || []).map((opt: any) => {
                      const ok = opt.key
                      const selected = selectedValue === ok
                      return (
                        <div key={ok} onClick={() => setFieldValue(fieldKey, ok)}
                          style={{
                            cursor: 'pointer', padding: '10px 12px', borderRadius: 8,
                            border: selected ? '2px solid #6366f1' : '1px solid #e2e8f0',
                            background: selected ? '#eef2ff' : '#fff',
                            display: 'flex', alignItems: 'center', gap: 8, transition: 'all .15s'
                          }}>
                          {opt.flag && <img src={`https://flagcdn.com/w20/${opt.flag}.png`} alt='' style={{ width: 20, height: 14, objectFit: 'cover', borderRadius: 2, flexShrink: 0 }} />}
                          <span style={{ fontSize: 13, fontWeight: selected ? 600 : 400 }}>{opt.label}</span>
                        </div>
                      )
                    })}
                  </div>
                ) : (field.type || 'select') === 'select' && fieldOptions.length ? (
                  // Hiển thị 3 cách tuỳ data + display_type
                  isTariffCard && fieldOptions.length <= 12 ? (
                    // Tariff card — hiển thị tên + traffic + giá nổi bật
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
                      {fieldOptions.map((opt: any) => {
                        const optId = opt.key || opt.value
                        const active = selectedValue === optId
                        const parts = String(opt.label || '').split('—').map(s => s.trim())
                        const name = parts[0] || opt.label
                        const detail = parts[1] || ''
                        return (
                          <label key={optId}
                            style={{
                              display: 'block', padding: '12px 14px', cursor: 'pointer',
                              borderRadius: 10, position: 'relative',
                              border: active ? '2px solid #6366f1' : '1px solid #e2e8f0',
                              background: active ? 'linear-gradient(135deg,#eef2ff 0%,#f5f3ff 100%)' : '#fff',
                              boxShadow: active ? '0 2px 8px rgba(99,102,241,.15)' : 'none',
                              transition: 'all .15s ease'
                            }}
                          >
                            <input type='radio' value={optId} checked={active} onChange={() => setFieldValue(fieldKey, optId)} style={{ display: 'none' }} />
                            {active && (
                              <span style={{ position: 'absolute', top: 8, right: 8, width: 18, height: 18, borderRadius: '50%', background: '#6366f1', color: '#fff', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>✓</span>
                            )}
                            <div style={{ fontSize: 13.5, fontWeight: 700, color: active ? '#3730a3' : '#1e293b', marginBottom: 2 }}>{name}</div>
                            {detail && <div style={{ fontSize: 11.5, color: '#64748b', marginBottom: 6 }}>{detail}</div>}
                            {typeof opt.price === 'number' && opt.price > 0 && (
                              <div style={{ fontSize: 16, fontWeight: 700, color: active ? '#6366f1' : '#16a34a' }}>
                                {opt.price.toLocaleString('vi-VN')}đ
                              </div>
                            )}
                          </label>
                        )
                      })}
                    </div>
                  ) : isCountryFlag && fieldOptions.length <= 30 ? (
                    // Country card — flag lớn + tên
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 }}>
                      {fieldOptions.map((opt: any) => {
                        const optId = opt.key || opt.value
                        const active = selectedValue === optId
                        const flagCode = (opt.flag || opt.key || opt.value || '').toLowerCase()
                        return (
                          <label key={optId}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px',
                              cursor: 'pointer', borderRadius: 8, position: 'relative',
                              border: active ? '2px solid #6366f1' : '1px solid #e2e8f0',
                              background: active ? '#eef2ff' : '#fff',
                              transition: 'all .15s ease'
                            }}
                          >
                            <input type='radio' value={optId} checked={active} onChange={() => setFieldValue(fieldKey, optId)} style={{ display: 'none' }} />
                            <img src={`https://flagcdn.com/w40/${flagCode}.png`} alt=''
                              style={{ width: 28, height: 20, objectFit: 'cover', borderRadius: 2, flexShrink: 0, boxShadow: '0 0 0 1px rgba(0,0,0,.05)' }} />
                            <span style={{ fontSize: 13, fontWeight: active ? 600 : 500, color: active ? '#3730a3' : '#334155' }}>
                              {resolveLabel(opt, true)}
                            </span>
                            {active && (
                              <span style={{ position: 'absolute', top: 6, right: 6, width: 14, height: 14, borderRadius: '50%', background: '#6366f1', color: '#fff', fontSize: 9, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✓</span>
                            )}
                          </label>
                        )
                      })}
                    </div>
                  ) : fieldOptions.length > 8 ? (
                    // Nhiều options non-country → pill grid + search inline (UX đẹp hơn datalist HTML5)
                    (() => {
                      const searchKey = fieldKey
                      const query = (fieldSearch[searchKey] || '').toLowerCase().trim()
                      const filtered = query
                        ? fieldOptions.filter((o: any) => o.label.toLowerCase().includes(query))
                        : fieldOptions
                      const showSearch = fieldOptions.length > 12

                      return (
                        <div>
                          {showSearch && (
                            <div style={{ position: 'relative', marginBottom: 8 }}>
                              <input
                                type='text'
                                className='discount-input'
                                placeholder={`🔍 Tìm ${field.label.toLowerCase()} trong ${fieldOptions.length} lựa chọn...`}
                                value={fieldSearch[searchKey] || ''}
                                onChange={e => setFieldSearch(prev => ({ ...prev, [searchKey]: e.target.value }))}
                                style={{ width: '100%', fontSize: 12.5, padding: '8px 12px' }}
                              />
                              {query && (
                                <button
                                  type='button'
                                  onClick={() => setFieldSearch(prev => ({ ...prev, [searchKey]: '' }))}
                                  style={{
                                    position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                                    border: 'none', background: 'transparent', cursor: 'pointer',
                                    color: '#94a3b8', fontSize: 16, padding: 4, lineHeight: 1
                                  }}
                                  title='Xoá tìm'
                                >×</button>
                              )}
                            </div>
                          )}
                          {filtered.length === 0 ? (
                            <div style={{ padding: '14px', textAlign: 'center', fontSize: 12, color: '#64748b', background: '#f8fafc', borderRadius: 8 }}>
                              Không có {field.label.toLowerCase()} nào khớp "{query}"
                            </div>
                          ) : (
                            <div style={{
                              display: 'grid',
                              gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                              gap: 6,
                              maxHeight: 220, overflowY: 'auto',
                              padding: '2px',
                              border: '1px solid #e2e8f0', borderRadius: 8,
                              background: '#fafbfc'
                            }}>
                              {filtered.map((opt: any) => {
                                const optId = opt.key || opt.value
                                const active = selectedValue === optId

                                return (
                                  <label
                                    key={optId}
                                    style={{
                                      display: 'flex', alignItems: 'center', gap: 6,
                                      padding: '7px 10px', cursor: 'pointer',
                                      borderRadius: 6, fontSize: 12.5, fontWeight: active ? 600 : 500,
                                      border: active ? '1.5px solid #6366f1' : '1px solid transparent',
                                      background: active ? '#eef2ff' : '#fff',
                                      color: active ? '#3730a3' : '#334155',
                                      transition: 'all .12s ease',
                                      position: 'relative'
                                    }}
                                  >
                                    <input
                                      type='radio' value={optId} checked={active}
                                      onChange={() => setFieldValue(fieldKey, optId)}
                                      style={{ display: 'none' }}
                                    />
                                    <span style={{
                                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                      width: 14, height: 14, borderRadius: '50%', flexShrink: 0,
                                      border: active ? '4px solid #6366f1' : '1.5px solid #cbd5e1',
                                      background: active ? '#fff' : '#fff',
                                      transition: 'all .12s'
                                    }} />
                                    <span style={{
                                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                                    }}>{resolveLabel(opt, isCountryFlag)}</span>
                                  </label>
                                )
                              })}
                            </div>
                          )}
                          {selectedValue && selectedOpt && (
                            <div style={{
                              marginTop: 8, padding: '8px 12px',
                              background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 8,
                              fontSize: 12, color: '#065f46',
                              display: 'flex', alignItems: 'center', gap: 6
                            }}>
                              <span style={{ fontSize: 14 }}>✓</span>
                              <span>Đã chọn:</span>
                              <strong style={{ color: '#047857' }}>{resolveLabel(selectedOpt, isCountryFlag)}</strong>
                              <button
                                type='button'
                                onClick={() => setFieldValue(fieldKey, '')}
                                style={{
                                  marginLeft: 'auto', border: 'none', background: 'transparent',
                                  color: '#059669', cursor: 'pointer', fontSize: 11.5, fontWeight: 500,
                                  textDecoration: 'underline'
                                }}
                              >Bỏ chọn</button>
                            </div>
                          )}
                        </div>
                      )
                    })()
                  ) : (
                    // Ít options (≤8) → radio buttons
                    <div className='checkout-duration-options'>
                      {fieldOptions.map((opt: any) => {
                        const optId = opt.key || opt.value
                        return (
                        <label
                          key={optId}
                          className={`checkout-duration-option ${selectedValue === optId ? 'active' : ''}`}
                        >
                          <input
                            type='radio' value={optId}
                            checked={selectedValue === optId}
                            onChange={() => setFieldValue(fieldKey, optId)}
                          />
                          <span>{resolveLabel(opt, isCountryFlag)}</span>
                        </label>
                        )
                      })}
                    </div>
                  )
                ) : (
                  <input
                    type={field.type === 'number' ? 'number' : 'text'}
                    className='discount-input'
                    placeholder={field.default || ''}
                    value={customFieldValues[fieldKey] || ''}
                    onChange={e => setFieldValue(fieldKey, e.target.value)}
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
                {/* Respect SP min/max. Khi min=max (vd Proxyma residential) → control disabled. */}
                <QuantityControl
                  min={Math.max(1, minQuantity)}
                  max={Math.max(minQuantity, maxQuantity)}
                  value={quantity}
                  onChange={setQuantity}
                />
              </div>
              <span className='subtotal-cell'>{total.toLocaleString('vi-VN')}đ</span>
            </div>
            {/* Qty discount tiers */}
            {(quantityTiers.length > 0 || fixedQtyTiers.length > 0) && (() => {
              const tiers = isPerUnit ? quantityTiers : fixedQtyTiers
              const sortedTiers = [...tiers]
                .filter((t: any) => t.min && (t.discount || t.price))
                .sort((a: any, b: any) => (parseInt(a.min) || 0) - (parseInt(b.min) || 0))
              const basePrice = baseUnitPrice
              const saveNow = hasQtyDiscount ? (baseUnitPrice - unitPrice) * quantity : 0
              const nextTier = sortedTiers.find((t: any) => quantity < (parseInt(t.min) || 0))

              return (
                <div style={{ padding: '12px 14px', background: '#f0fdf4', borderRadius: '0 0 8px 8px' }}>
                  {/* Status banner */}
                  {hasQtyDiscount ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, padding: '8px 10px', background: '#dcfce7', borderRadius: 6, border: '1px solid #86efac' }}>
                      <span style={{ fontSize: 16 }}>🎉</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#15803d' }}>
                          Đang được giảm giá!
                        </div>
                        <div style={{ fontSize: 11, color: '#166534' }}>
                          Tiết kiệm {saveNow.toLocaleString('vi-VN')}đ cho {quantity} proxy
                        </div>
                      </div>
                    </div>
                  ) : nextTier ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, padding: '8px 10px', background: '#fef3c7', borderRadius: 6, border: '1px solid #fcd34d' }}>
                      <span style={{ fontSize: 16 }}>💡</span>
                      <div style={{ fontSize: 11.5, color: '#92400e' }}>
                        Mua thêm <strong>{(parseInt(nextTier.min) || 0) - quantity}</strong> proxy (tổng {nextTier.min}+) để được giảm giá
                      </div>
                    </div>
                  ) : null}

                  {/* Tier cards — click để nhảy đến mốc */}
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 6 }}>
                    CHIẾT KHẤU THEO SỐ LƯỢNG — click để áp dụng
                  </div>
                  <div className='perunit-tiers'>
                    {/* Card mốc 1 proxy (không CK) — nếu tier đầu min >= 2 */}
                    {basePrice > 0 && sortedTiers[0] && (parseInt(sortedTiers[0].min) || 0) >= 2 && (() => {
                      const firstMin = parseInt(sortedTiers[0].min) || 2
                      const isBaseActive = quantity < firstMin

                      return (
                        <button
                          type='button'
                          className={`perunit-tier ${isBaseActive ? 'active' : ''}`}
                          onClick={() => setQuantity(1)}
                        >
                          <span className='perunit-tier-top'>
                            <span className='perunit-tier-days'>1-{firstMin - 1}</span>
                            <span className='perunit-tier-unit'>proxy</span>
                          </span>
                          <span className='perunit-tier-price'>{basePrice.toLocaleString('vi-VN')}đ</span>
                        </button>
                      )
                    })()}

                    {sortedTiers.map((t: any, i: number) => {
                      const min = parseInt(t.min) || 0
                      const max = parseInt(t.max) || Infinity
                      const isActive = quantity >= min && quantity <= max
                      const disc = parseFloat(t.discount) || 0
                      const tierPrice = t.price ? parseInt(t.price) : (disc && basePrice ? Math.round(basePrice * (1 - disc / 100)) : 0)
                      const savingsPct = basePrice > 0 && tierPrice > 0 ? Math.round((1 - tierPrice / basePrice) * 100) : 0
                      const rangeLabel = t.max ? `${t.min}-${t.max}` : `${t.min}+`

                      return (
                        <button
                          type='button'
                          key={i}
                          className={`perunit-tier ${isActive ? 'active' : ''}`}
                          onClick={() => setQuantity(min)}
                        >
                          {savingsPct > 0 && <span className='perunit-tier-badge'>-{savingsPct}%</span>}
                          <span className='perunit-tier-top'>
                            <span className='perunit-tier-days'>{rangeLabel}</span>
                            <span className='perunit-tier-unit'>proxy</span>
                          </span>
                          <span className='perunit-tier-price'>{tierPrice.toLocaleString('vi-VN')}đ</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })()}
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
                  {/* Label derive: kind=residential → Residential; productType=rotating → Rotating; else Static.
                      Tránh hardcode "Static" sai cho residential. */}
                  {kind === 'residential'
                    ? 'Residential'
                    : productType === 'rotating'
                      ? 'Rotating'
                      : 'Static'}
                  {' '}{ipVersion?.toUpperCase()}{country ? ` · ${country}` : ''}
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

            {/* Hiện giá trị các custom field đã chọn (Gói GB, Quốc gia, Khu vực, Thành phố...) —
                để user verify TRƯỚC khi bấm Thanh Toán, không phải scroll lên. */}
            {customFields?.map(f => {
              const key = f.key || f.param || ''
              const value = customFieldValues[key]
              if (!value) return null
              const opt = (f.options || []).find((o: any) => (o.value ?? o.key) === value || (o.provider_value === value))
              // Detect country field để dùng i18n dictionary
              const isCountryF = (f as any).display_type === 'country_flag' ||
                f.source === 'api_countries' || key === 'country'
              const label = opt ? resolveLabel(opt, isCountryF) : value

              return (
                <div className='summary-row' key={key}>
                  <span className='summary-label'>{f.label}:</span>
                  <span className='summary-value'>{label}</span>
                </div>
              )
            })}
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
