'use client'

import React, { useState, useMemo } from 'react'

import { useTranslation } from 'react-i18next'

import { useForm, Controller, useWatch } from 'react-hook-form'
import * as yup from 'yup'
import { yupResolver } from '@hookform/resolvers/yup'
import {
  CheckCircle,
  ShoppingCart,
  User,
  Users,
  Shield,
  Clock,
  Filter,
  Globe,
  Wifi,
  X,
  SearchX,
  SlidersHorizontal,
  RefreshCw,
  Zap,
  MapPin,
  Search
} from 'lucide-react'
import Switch from '@mui/material/Switch'
import MenuItem from '@mui/material/MenuItem'
import { useSession } from 'next-auth/react'
import { useBranding } from '@/app/contexts/BrandingContext'

import { Box, Grid2, Typography } from '@mui/material'

import Chip from '@mui/material/Chip'

import { getTagStyle, shouldHideByTag, getCountryName, fixCountryCode } from '@/configs/tagConfig'
import { getVisibleFields, renderFeatureRow } from '@/app/[lang]/(private)/(client)/components/proxy-card/productFieldsHelper'

import { useModalContext } from '@/app/contexts/ModalContext'

import CustomTextField from '@core/components/mui/TextField'
import CheckoutModal from '@/components/checkout-modal/CheckoutModal'
import { useCountries } from '@/hooks/apis/useCountries'
import './styles.css'

// Schema cho các field động (input/checkbox/select) — time & protocol chuyển sang CheckoutModal
const proxyPlanSchema = yup.object({})

// Component này render một dòng feature có select (dropdown)
const SelectFeatureRow = ({ feature, control, planId }) => (
  <>
    <Controller
      name={feature.field}
      control={control}
      render={({ field }) => (
        <div className='feature-row'>
          <div className='feature-icons'>
            <CheckCircle size={16} color={feature.iconColor || '#22c55e'} />
          </div>

          <div className='feature-content'>
            <label className='feature-label' htmlFor={`${planId}-${feature.label}`}>
              {feature.label}:
            </label>
            <CustomTextField
              select
              size='small'
              id={`${planId}-${field.name}`}
              value={field.value || ''}
              onChange={e => field.onChange(e.target.value)}
            >
              {feature.options?.map((opt: any) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </CustomTextField>
          </div>
        </div>
      )}
    />
  </>
)

// Component này render một dòng feature tĩnh (chỉ hiển thị thông tin)
const StaticFeatureRow = ({ feature }) => {
  if (!feature.value && feature.value !== 0) return null

  const IconComponent = feature.icon || CheckCircle
  const iconColor = feature.iconColor || '#22c55e'

  return (
    <div className='feature-row'>
      <div className='feature-icons'>
        {typeof IconComponent === 'string' ? (
          <span dangerouslySetInnerHTML={{ __html: IconComponent }} />
        ) : (
          <IconComponent size={16} color={iconColor} />
        )}
      </div>
      <div className='feature-content'>
        <span className='feature-label'>{feature.label}:</span>
        <span className='feature-value'>{feature.value}</span>
      </div>
    </div>
  )
}

// Component này render một dòng feature có input
const InputFeatureRow = ({ feature, control, errors, planId, isDisabled = false, min = 1, max = 100 }) => (
  <Controller
    name={feature.field}
    control={control}
    render={({ field }) => (
      <div>
        <div className='feature-row'>
          <div className='feature-icons'>
            <CheckCircle size={16} color={errors[feature.field] ? '#ef4444' : feature.iconColor || '#22c55e'} />
          </div>
          <div className='feature-content'>
            <label
              className={`feature-label ${errors[feature.field] ? 'text-red-500' : ''}`}
              htmlFor={`${planId}-${field.name}`}
            >
              {feature.label}:
            </label>
            <CustomTextField
              size='small'
              id={`${planId}-${field.name}`}
              type={feature.inputType || 'text'}
              inputProps={feature.inputType === 'number' ? { min: feature.min ?? 1, max: feature.max ?? 100 } : {}}
              {...field}
              disabled={isDisabled}
              error={!!errors[feature.field]}
              helperText={errors[feature.field]?.message}
            />
          </div>
        </div>
        {errors[feature.field] && <span className='text-red-500 text-sm'>{errors[feature.field].message}</span>}
      </div>
    )}
  />
)

// Component này render một dòng feature có switch (checkbox)
const SwitchFeatureRow = ({ feature, control, planId }) => (
  <Controller
    name={feature.field}
    control={control}
    render={({ field }) => (
      <div className='feature-row'>
        <div className='feature-icons'>
          <CheckCircle size={16} color={feature.iconColor || '#22c55e'} />
        </div>
        <div className='feature-content'>
          <label className='feature-label' htmlFor={`${planId}-${field.name}`}>
            {feature.label}:
          </label>
          <Switch
            id={`${planId}-${field.name}`}
            color='error'
            checked={field.value || false}
            onChange={e => field.onChange(e.target.checked)}
          />
        </div>
      </div>
    )}
  />
)

// Component này render radio buttons cho thời gian sử dụng và giao thức
const RadioFeatureRow = ({ feature, control, planId, plan }) => {
  const getDurationLabel = (key: string) => {
    const days = parseInt(key)

    if (days === 1) return 'Ngày'
    if (days === 7) return 'Tuần'
    if (days === 30) return 'Tháng'

    return `${days} ngày`
  }

  // Hàm tính phần trăm giảm giá theo công thức: (1 - giá_thực_tế / giá_gốc) * 100
  const calculateDiscount = (duration: string, discountedPrice: string) => {
    // Chỉ tính discount cho feature time
    if (feature.field !== 'time') {
      return null
    }

    if (!feature?.options || feature.options.length === 0) {
      return null
    }

    const currentPrice = parseInt(discountedPrice, 10) || 0
    const currentDuration = parseInt(duration, 10) || 0

    // Nếu không có giá hoặc duration = 0 thì không hiển thị
    if (!currentPrice || currentPrice === 0 || !currentDuration || currentDuration === 0) {
      return null
    }

    // Lấy danh sách options từ feature
    const options = feature.options

    // Tìm giá của đơn vị thời gian ngắn nhất (duration nhỏ nhất)
    const sortedOptions = [...options].sort((a: any, b: any) => parseInt(a.key, 10) - parseInt(b.key, 10))

    if (sortedOptions.length === 0) {
      return null
    }

    const baseOption = sortedOptions[0] // Duration ngắn nhất
    const baseDurationDays = parseInt(baseOption.key, 10) || 1
    const basePrice = parseInt(baseOption.value, 10) || 0

    // Nếu không có giá đơn vị cơ sở thì không tính
    if (!basePrice || basePrice === 0) {
      return null
    }

    // Tính giá gốc cho duration hiện tại = (giá đơn vị cơ sở / số ngày cơ sở) * số ngày hiện tại
    const basePricePerDay = basePrice / baseDurationDays
    const originalPriceForCurrentDuration = basePricePerDay * currentDuration

    // Nếu giá thực tế >= giá gốc tính theo công thức thì không có giảm giá
    if (currentPrice >= originalPriceForCurrentDuration) {
      return null
    }

    // Tính % giảm giá theo công thức: (1 - giá_thực_tế / giá_gốc) * 100
    const discountPercent = (1 - currentPrice / originalPriceForCurrentDuration) * 100

    // Chỉ hiển thị nếu có giảm giá (discountPercent > 0)
    if (discountPercent <= 0) {
      return null
    }

    return Math.round(discountPercent)
  }

  return (
    <Controller
      name={feature.field}
      control={control}
      render={({ field }) => (
        <div>
          <div className='feature-row'>
            <div className='feature-content' style={{ display: 'block', width: '100%' }}>
              <div className='flex align-start' style={{ alignItems: 'center', marginBottom: '6px', gap: '8px' }}>
                <div className='feature-icons'>
                  <CheckCircle size={14} className='text-green-500' />
                </div>
                <label className='feature-label'>{feature.label}:</label>
              </div>
              <div
                style={{
                  display: 'flex',
                  gap: '8px',
                  flexWrap: 'wrap'
                }}
              >
                {feature.options?.map((item: any, index: number) => {
                  // Tính discount theo công thức mới nếu là feature time, nếu không thì dùng discount cũ
                  const calculatedDiscount = feature.field === 'time' ? calculateDiscount(item.key, item.value) : null

                  const discount =
                    calculatedDiscount !== null ? calculatedDiscount : item.discount ? parseInt(item.discount) : 0

                  // Hiển thị label: nếu là time thì dùng getDurationLabel, nếu là protocol thì dùng item.label
                  const displayLabel = feature.field === 'time' ? getDurationLabel(item.key) : item.label

                  return (
                    <label
                      key={item.key}
                      htmlFor={`${planId}-${feature.field}-${item.key}`}
                      style={{
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 12px',
                        border:
                          field.value === item.key ? '2px solid var(--mui-palette-primary-main)' : '1px solid #e5e7eb',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        backgroundColor: field.value === item.key ? 'var(--mui-palette-primary-lightOpacity)' : 'white',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <input
                        type='radio'
                        id={`${planId}-${feature.field}-${item.key}`}
                        value={item.key}
                        checked={field.value === item.key}
                        onChange={field.onChange}
                        style={{ cursor: 'pointer' }}
                      />
                      <span style={{ fontSize: '13px', fontWeight: '500' }}>{displayLabel}</span>
                      {discount > 0 && (
                        <span
                          style={{
                            position: 'absolute',
                            top: '-8px',
                            right: '-8px',
                            backgroundColor: '#ef4444',
                            color: 'white',
                            fontSize: '10px',
                            fontWeight: '700',
                            padding: '2px 6px',
                            borderRadius: '8px',
                            boxShadow: '0 2px 4px rgba(239, 68, 68, 0.3)'
                          }}
                        >
                          -{discount}%
                        </span>
                      )}
                    </label>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    />
  )
}

// Component chính cho mỗi thẻ plan
const PlanCard = ({ plan }) => {
  const [checkoutOpen, setCheckoutOpen] = useState(false)

  const { openAuthModal } = useModalContext()
  const session = useSession()
  const { show_product_code, product_fields } = useBranding()

  const isAvailable = plan?.is_purchasable !== false

  // Protocols
  const protocolList: string[] = plan.protocols && plan.protocols.length > 0 ? plan.protocols : ['http']

  // Build priceOptions từ time feature
  const timeFeature = plan.features.find((f: any) => f.field === 'time')

  const priceOptions = useMemo(() => {
    if (!timeFeature?.options?.length) {
      return [{ key: '1', label: 'Ngày', price: plan.price || 0 }]
    }

    return timeFeature.options.map((opt: any) => ({
      key: opt.key,
      label: (() => {
        const days = parseInt(opt.key)

        if (days === 1) return 'Ngày'
        if (days === 7) return 'Tuần'
        if (days === 30) return 'Tháng'
        if (days === 365) return 'Năm'

        return `${opt.key} ngày`
      })(),
      price: parseInt(opt.value, 10) || 0,
      quantity_tiers: opt.quantity_tiers || []
    }))
  }, [timeFeature, plan.price])

  // Giá hiển thị ở header (giá thấp nhất)
  const headerPrice = priceOptions[0]?.price || plan.price || 0

  // Tính % tiết kiệm tối đa
  const maxDiscount = useMemo(() => {
    if (plan.pricing_mode === 'per_unit' || priceOptions.length <= 1) return 0
    const sorted = [...priceOptions].sort((a, b) => parseInt(a.key) - parseInt(b.key))
    const base = sorted[0]
    const baseDays = parseInt(base.key) || 1
    let max = 0

    sorted.slice(1).forEach(opt => {
      const days = parseInt(opt.key) || 0
      const origPrice = (base.price / baseDays) * days

      if (opt.price < origPrice) {
        const pct = Math.round((1 - opt.price / origPrice) * 100)

        if (pct > max) max = pct
      }
    })

    return max
  }, [priceOptions, plan.pricing_mode])

  const visibleTags = useMemo(() => {
    if (!plan?.tag) return []

    return plan.tag.split(',').filter((t: string) => {
      const tagDef = getTagStyle(t)

      return !(tagDef && 'hidden' in tagDef && tagDef.hidden)
    })
  }, [plan?.tag])

  // Note preview (strip HTML, truncate)
  const hasNote = useMemo(() => {
    if (!plan.note || plan.note === '<p></p>') return false
    const text = plan.note.replace(/<[^>]+>/g, '').trim()

    return !!text
  }, [plan.note])

  // Form chỉ còn cho dynamic fields (input/checkbox/select) — không cho time/protocol
  const {
    control,
    handleSubmit,
    formState: { errors }
  } = useForm({
    defaultValues: {},
    mode: 'onChange',
    resolver: yupResolver(proxyPlanSchema)
  })

  const watchedFields = useWatch({ control })

  const onSubmit = async (data: any) => {
    // Collect extra fields (autoRotate, rotationTime, etc.)
    const extraPayload: Record<string, any> = {}

    plan.features.forEach((f: any) => {
      if (f.field && f.field !== 'time' && f.field !== 'protocol' && f.field !== 'quantity' && f.status !== 'success') {
        if (data[f.field] !== undefined) {
          extraPayload[f.field] = data[f.field]
        }
      }
    })

    setCheckoutOpen(true)
  }

  const handleBuy = () => {
    if (session.status !== 'authenticated') {
      openAuthModal('login')

      return
    }

    // Nếu có dynamic fields cần validate, dùng handleSubmit
    const hasDynamicFields = plan.features.some(
      (f: any) =>
        f.field &&
        f.field !== 'time' &&
        f.field !== 'protocol' &&
        f.field !== 'quantity' &&
        ['input', 'checkbox', 'select'].includes(f.status)
    )

    if (hasDynamicFields) {
      handleSubmit(onSubmit)()
    } else {
      setCheckoutOpen(true)
    }
  }

  return (
    <>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className={`proxy-plan-card ${plan.color}${checkoutOpen ? ' active' : ''}`}
        style={{
          position: 'relative',
          ...(!isAvailable ? { opacity: 0.7 } : {})
        }}
      >
        {/* Header: title + tags (max 3, còn lại +N) */}
        <div className='plan-header'>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h3 className='plan-title' style={{ textAlign: 'left', marginBottom: 1 }}>
                {plan.title}
              </h3>
              {show_product_code !== '0' && (
                <span
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '10.5px',
                    fontWeight: 500,
                    color: '#b0b8c4',
                    lineHeight: 1,
                    display: 'block'
                  }}
                >
                  #{plan.code || plan.id}
                </span>
              )}
            </div>
            {visibleTags.length > 0 && (
              <div style={{ display: 'flex', gap: '4px', flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end', maxWidth: '60%' }}>
                {visibleTags.slice(0, 3).map((tag: string, i: number) => {
                  const tagDef = getTagStyle(tag)

                  return (
                    <span
                      key={i}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px',
                        padding: '3px 10px',
                        fontSize: '10.5px',
                        fontWeight: 700,
                        borderRadius: '6px',
                        background: `linear-gradient(180deg, rgba(255,255,255,0.2) 0%, transparent 50%), ${tagDef.gradient || tagDef.bgColor}`,
                        color: tagDef.textColor,
                        boxShadow: `0 2px 10px ${tagDef.borderColor}55, inset 0 1px 0 rgba(255,255,255,0.2)`,
                        border: '1px solid rgba(255,255,255,0.25)',
                        letterSpacing: '0.3px',
                        lineHeight: 1.3,
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {tagDef.icon && <span style={{ fontSize: '10px' }}>{tagDef.icon}</span>}
                      {tag.trim()}
                    </span>
                  )
                })}
                {visibleTags.length > 3 && (
                  <span className='tag-more-wrapper'>
                    <span className='tag-more-badge'>
                      +{visibleTags.length - 3}
                    </span>
                    <span className='tag-more-tooltip'>
                      {visibleTags.slice(3).map((tag: string, i: number) => {
                        const tagDef = getTagStyle(tag)

                        return (
                          <span
                            key={i}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              padding: '3px 10px',
                              fontSize: '10.5px',
                              fontWeight: 700,
                              borderRadius: '6px',
                              background: `linear-gradient(180deg, rgba(255,255,255,0.2) 0%, transparent 50%), ${tagDef.gradient || tagDef.bgColor}`,
                              color: tagDef.textColor,
                              letterSpacing: '0.3px',
                              lineHeight: 1.3,
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {tagDef.icon && <span style={{ fontSize: '10px' }}>{tagDef.icon}</span>}
                            {tag.trim()}
                          </span>
                        )
                      })}
                    </span>
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Note — hiện full HTML */}
        {hasNote && (
          <div
            className='proxy-note-content'
            style={{ fontSize: '12px', color: '#64748b', margin: '0 0 8px', lineHeight: 1.5, padding: '0 2px' }}
            dangerouslySetInnerHTML={{ __html: plan.note }}
          />
        )}

        <div className='plan-features'>
          {/* Feature rows — rendered by product_fields config */}
          {getVisibleFields(product_fields).map(f => {
            const row = renderFeatureRow(
              f.key,
              plan,
              protocolList,
              (v: string) => v?.toUpperCase() === 'IPV4' ? 'V4' : v?.toUpperCase() === 'IPV6' ? 'V6' : v || '',
              (t: string) => t === 'userpass' ? 'User:Pass' : t === 'ip_whitelist' ? 'IP Whitelist' : t === 'both' ? 'User:Pass + IP' : t,
              () => getCountryName(plan.country || plan.country_code || '')
            )

            return row ? <React.Fragment key={f.key}>{row}</React.Fragment> : null
          })}
          {/* Dynamic features: bỏ time + protocol, giữ success/input/checkbox/select */}
          {plan.features
            .filter(
              (feature: any) => feature.field !== 'protocol' && feature.field !== 'quantity' && feature.field !== 'time'
            )
            .map((feature: any, index: number) => {
              switch (feature.status) {
                case 'success':
                  return <StaticFeatureRow key={index} feature={feature} />
                case 'input':
                  const isRotationTimeInput = feature.field === 'rotationTime'

                  return (
                    <InputFeatureRow
                      key={index}
                      feature={feature}
                      control={control}
                      errors={errors}
                      planId={plan.id}
                      min={plan.min}
                      max={plan.max}
                      isDisabled={(isRotationTimeInput && !watchedFields.autoRotate) || !isAvailable}
                    />
                  )
                case 'checkbox':
                  return <SwitchFeatureRow key={index} feature={feature} control={control} planId={plan.id} />
                case 'select':
                  return <SelectFeatureRow key={index} feature={feature} control={control} planId={plan.id} />
                default:
                  return null
              }
            })}
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            marginTop: 'auto',
            paddingTop: 12,
            borderTop: '1px solid #f1f5f9'
          }}
        >
          <div>
            <div
              style={{
                fontSize: '16px',
                fontWeight: 700,
                color: 'var(--primary-hover, #e53e3e)',
                whiteSpace: 'nowrap'
              }}
            >
              {priceOptions.length > 1 && (
                <span style={{ fontSize: '12px', fontWeight: 500, color: '#94a3b8', marginRight: '2px' }}>từ </span>
              )}
              {headerPrice.toLocaleString('vi-VN')}đ
            </div>
            {maxDiscount > 0 && (
              <div style={{ fontSize: '10.5px', fontWeight: 600, color: '#22c55e', marginTop: 1 }}>
                Tiết kiệm đến {maxDiscount}%
              </div>
            )}
          </div>
          {isAvailable ? (
            <button type='button' className='buy-button' onClick={handleBuy} style={{ padding: '8px 18px' }}>
              <ShoppingCart size={14} className='mr-1' />
              Mua ngay
            </button>
          ) : (
            <div
              style={{
                padding: '8px 14px',
                borderRadius: '8px',
                backgroundColor: '#f1f5f9',
                border: '1px solid #e2e8f0',
                color: '#64748b',
                fontSize: '13px',
                fontWeight: 600
              }}
            >
              Tạm ngừng
            </div>
          )}
        </div>
      </form>

      <CheckoutModal
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        productName={plan.title}
        productType='rotating'
        serviceTypeId={plan.id}
        priceOptions={priceOptions}
        protocols={protocolList}
        ipVersion={plan.ip_version}
        proxyType={plan.proxy_type}
        country={plan.country}
        authType={plan.auth_type || null}
        pricingMode={plan.pricing_mode || 'fixed'}
        timeUnit={plan.time_unit || 'day'}
        pricePerUnit={plan.price_per_unit || 0}
        allowCustomAuth={!!plan.metadata?.allow_custom_auth}
        discountTiers={plan.metadata?.discount_tiers || []}
        quantityTiers={plan.metadata?.quantity_tiers || []}
        customFields={plan.metadata?.custom_fields || undefined}
        maxIps={plan.metadata?.max_ips || 1}
      />
    </>
  )
}

interface RotatingProxyPageProps {
  data: any
  onRefresh?: () => void
  isRefreshing?: boolean
}

export default function RotatingProxyPage({ data, onRefresh, isRefreshing }: RotatingProxyPageProps) {
  console.log(data)
  const [selectedVersion, setSelectedVersion] = useState('')
  const [selectedProxyType, setSelectedProxyType] = useState('')
  const [selectedCountry, setSelectedCountry] = useState('')
  const [showActiveOnly, setShowActiveOnly] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const { data: countries } = useCountries()

  // Auto-extract unique filter values from actual data
  const filterOptions = useMemo(() => {
    if (!data?.length) return { versions: [], proxyTypes: [], countries: [] }

    const versions = [...new Set(data.map((p: any) => p.ip_version?.toLowerCase()).filter(Boolean))]
    const proxyTypes = [...new Set(data.map((p: any) => p.proxy_type?.toLowerCase()).filter(Boolean))]

    const countrySet = new Set<string>()

    data.forEach((p: any) => {
      const raw = (p.country || p.country_code || '').trim()
      if (!raw) return
      raw.split(',').forEach((c: string) => {
        const code = fixCountryCode(c.trim()).toUpperCase()
        if (code.length >= 2) countrySet.add(code)
      })
    })

    const countryOptions = [...countrySet].map(code => ({
      code,
      name: getCountryName(code)
    }))

    return { versions, proxyTypes, countries: countryOptions }
  }, [data])

  const hasActiveFilter = selectedVersion || selectedProxyType || selectedCountry || !showActiveOnly

  // Lọc danh sách plan theo các filter + search
  const filteredProviders = useMemo(
    () =>
      data?.filter((plan: any) => {
        if (shouldHideByTag(plan?.tag)) return false
        if (showActiveOnly && plan?.is_purchasable === false) return false
        if (selectedVersion && plan.ip_version?.toLowerCase() !== selectedVersion.toLowerCase()) return false
        if (selectedProxyType && plan.proxy_type?.toLowerCase() !== selectedProxyType.toLowerCase()) return false

        if (selectedCountry) {
          const raw = (plan.country || plan.country_code || '').trim()
          const codes = raw.split(',').map((c: string) => fixCountryCode(c.trim()).toUpperCase())

          if (!codes.includes(selectedCountry)) return false
        }

        if (searchQuery) {
          const q = searchQuery.toLowerCase()
          const name = (plan.name || plan.title || '').toLowerCase()
          const code = (plan.code || '').toLowerCase()

          if (!name.includes(q) && !code.includes(q)) return false
        }

        return true
      }),
    [data, selectedVersion, selectedProxyType, selectedCountry, showActiveOnly, searchQuery]
  )

  const clearAllFilters = () => {
    setSelectedVersion('')
    setSelectedProxyType('')
    setSelectedCountry('')
    setShowActiveOnly(true)
    setSearchQuery('')
  }

  const versionLabel = (v: string) => (v === 'ipv4' ? 'IPv4' : v === 'ipv6' ? 'IPv6' : v.toUpperCase())
  const proxyTypeLabel = (t: string) => (t === 'residential' ? 'Dân cư' : t === 'datacenter' ? 'Datacenter' : t)

  return (
    <>
      {/* Filter bar */}
      <Box
        sx={{
          mb: 2.5,
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          background: 'white',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            borderBottom: '1px solid #f1f5f9',
            background: '#f8fafc'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <SlidersHorizontal size={16} color='#475569' />
            <span style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b' }}>Bộ lọc</span>
            <span style={{ fontSize: '13px', color: '#94a3b8' }}>
              ({filteredProviders?.length || 0}/{data?.length || 0} gói)
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              border: '1px solid #e2e8f0', borderRadius: 8, padding: '4px 10px',
              background: '#fff', minWidth: 180
            }}>
              <Search size={14} color='#94a3b8' />
              <input
                type='text'
                placeholder='Tìm sản phẩm...'
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  border: 'none', outline: 'none', fontSize: '13px',
                  background: 'transparent', width: '100%', color: '#1e293b'
                }}
              />
              {searchQuery && (
                <X size={14} color='#94a3b8' style={{ cursor: 'pointer' }} onClick={() => setSearchQuery('')} />
              )}
            </div>
            {onRefresh && (
              <button
                type='button'
                onClick={() => onRefresh()}
                disabled={isRefreshing}
                title='Tải lại danh sách'
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: 32, height: 32, borderRadius: 8,
                  border: '1px solid #e2e8f0', background: '#fff',
                  cursor: isRefreshing ? 'wait' : 'pointer',
                  transition: 'all 0.15s'
                }}
              >
                <RefreshCw
                  size={14}
                  color={isRefreshing ? '#3b82f6' : '#64748b'}
                  style={isRefreshing ? { animation: 'spin 1s linear infinite' } : undefined}
                />
              </button>
            )}
          </div>
          {hasActiveFilter && (
            <Chip
              icon={<X size={14} />}
              label='Xoá bộ lọc'
              onClick={clearAllFilters}
              size='small'
              sx={{
                fontWeight: 600,
                fontSize: '12px',
                height: '28px',
                borderRadius: '6px',
                bgcolor: '#fef2f2',
                color: '#dc2626',
                border: '1px solid #fecaca',
                '&:hover': { bgcolor: '#fee2e2' },
                '& .MuiChip-icon': { color: '#dc2626' }
              }}
            />
          )}
        </div>

        {/* Filter groups */}
        <div style={{ padding: '14px 16px', display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'flex-start' }}>
          {filterOptions.versions.length > 0 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <Wifi size={14} color='#64748b' />
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#475569',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}
                >
                  Phiên bản IP
                </span>
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <Chip
                  label='Tất cả'
                  variant={!selectedVersion ? 'filled' : 'outlined'}
                  onClick={() => setSelectedVersion('')}
                  sx={{
                    fontWeight: 600,
                    fontSize: '13px',
                    height: '34px',
                    borderRadius: '8px',
                    ...(!selectedVersion
                      ? { bgcolor: '#1e293b', color: '#fff', '&:hover': { bgcolor: '#334155' } }
                      : {
                          borderColor: '#cbd5e1',
                          color: '#334155',
                          '&:hover': { bgcolor: '#f1f5f9', borderColor: '#94a3b8' }
                        })
                  }}
                />
                {filterOptions.versions.map((v: string) => (
                  <Chip
                    key={v}
                    label={versionLabel(v)}
                    variant={selectedVersion === v ? 'filled' : 'outlined'}
                    onClick={() => setSelectedVersion(selectedVersion === v ? '' : v)}
                    sx={{
                      fontWeight: 600,
                      fontSize: '13px',
                      height: '34px',
                      borderRadius: '8px',
                      ...(selectedVersion === v
                        ? { bgcolor: '#1e293b', color: '#fff', '&:hover': { bgcolor: '#334155' } }
                        : {
                            borderColor: '#cbd5e1',
                            color: '#334155',
                            '&:hover': { bgcolor: '#f1f5f9', borderColor: '#94a3b8' }
                          })
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {filterOptions.proxyTypes.length > 0 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <Filter size={14} color='#64748b' />
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#475569',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}
                >
                  Loại proxy
                </span>
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <Chip
                  label='Tất cả'
                  variant={!selectedProxyType ? 'filled' : 'outlined'}
                  onClick={() => setSelectedProxyType('')}
                  sx={{
                    fontWeight: 600,
                    fontSize: '13px',
                    height: '34px',
                    borderRadius: '8px',
                    ...(!selectedProxyType
                      ? { bgcolor: '#1e293b', color: '#fff', '&:hover': { bgcolor: '#334155' } }
                      : {
                          borderColor: '#cbd5e1',
                          color: '#334155',
                          '&:hover': { bgcolor: '#f1f5f9', borderColor: '#94a3b8' }
                        })
                  }}
                />
                {filterOptions.proxyTypes.map((t: string) => (
                  <Chip
                    key={t}
                    label={proxyTypeLabel(t)}
                    variant={selectedProxyType === t ? 'filled' : 'outlined'}
                    onClick={() => setSelectedProxyType(selectedProxyType === t ? '' : t)}
                    sx={{
                      fontWeight: 600,
                      fontSize: '13px',
                      height: '34px',
                      borderRadius: '8px',
                      ...(selectedProxyType === t
                        ? { bgcolor: '#1e293b', color: '#fff', '&:hover': { bgcolor: '#334155' } }
                        : {
                            borderColor: '#cbd5e1',
                            color: '#334155',
                            '&:hover': { bgcolor: '#f1f5f9', borderColor: '#94a3b8' }
                          })
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Trạng thái */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <ShoppingCart size={14} color='#64748b' />
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#475569',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}
              >
                Trạng thái
              </span>
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <Chip
                label='Đang bán'
                variant={showActiveOnly ? 'filled' : 'outlined'}
                onClick={() => setShowActiveOnly(true)}
                sx={{
                  fontWeight: 600,
                  fontSize: '13px',
                  height: '34px',
                  borderRadius: '8px',
                  ...(showActiveOnly
                    ? { bgcolor: '#1e293b', color: '#fff', '&:hover': { bgcolor: '#334155' } }
                    : {
                        borderColor: '#cbd5e1',
                        color: '#334155',
                        '&:hover': { bgcolor: '#f1f5f9', borderColor: '#94a3b8' }
                      })
                }}
              />
              <Chip
                label='Tất cả'
                variant={!showActiveOnly ? 'filled' : 'outlined'}
                onClick={() => setShowActiveOnly(false)}
                sx={{
                  fontWeight: 600,
                  fontSize: '13px',
                  height: '34px',
                  borderRadius: '8px',
                  ...(!showActiveOnly
                    ? { bgcolor: '#1e293b', color: '#fff', '&:hover': { bgcolor: '#334155' } }
                    : {
                        borderColor: '#cbd5e1',
                        color: '#334155',
                        '&:hover': { bgcolor: '#f1f5f9', borderColor: '#94a3b8' }
                      })
                }}
              />
            </div>
          </div>

          {filterOptions.countries.length > 0 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <Globe size={14} color='#64748b' />
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#475569',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}
                >
                  Quốc gia
                </span>
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <Chip
                  label='Tất cả'
                  variant={!selectedCountry ? 'filled' : 'outlined'}
                  onClick={() => setSelectedCountry('')}
                  sx={{
                    fontWeight: 600,
                    fontSize: '13px',
                    height: '34px',
                    borderRadius: '8px',
                    ...(!selectedCountry
                      ? { bgcolor: '#1e293b', color: '#fff', '&:hover': { bgcolor: '#334155' } }
                      : {
                          borderColor: '#cbd5e1',
                          color: '#334155',
                          '&:hover': { bgcolor: '#f1f5f9', borderColor: '#94a3b8' }
                        })
                  }}
                />
                {filterOptions.countries.map((c: any) => (
                  <Chip
                    key={c.code}
                    label={
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        {c.code.split(',').map((cc: string) => (
                          <img
                            key={cc}
                            src={`https://flagcdn.com/w40/${fixCountryCode(cc.trim())}.png`}
                            alt={cc.trim()}
                            style={{ width: 20, height: 15, objectFit: 'cover', borderRadius: 2 }}
                          />
                        ))}
                        <span>{c.name}</span>
                      </span>
                    }
                    variant={selectedCountry === c.code ? 'filled' : 'outlined'}
                    onClick={() => setSelectedCountry(selectedCountry === c.code ? '' : c.code)}
                    sx={{
                      fontWeight: 600,
                      fontSize: '13px',
                      height: '36px',
                      borderRadius: '20px',
                      ...(selectedCountry === c.code
                        ? { bgcolor: '#1e293b', color: '#fff', '&:hover': { bgcolor: '#334155' } }
                        : {
                            borderColor: '#e2e8f0',
                            color: '#334155',
                            bgcolor: '#fff',
                            '&:hover': { bgcolor: '#f8fafc', borderColor: '#94a3b8' }
                          })
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </Box>

      <Grid2 container columnSpacing={1.5} rowSpacing={2.5} sx={{ mt: 1 }}>
        {filteredProviders?.length > 0 ? (
          filteredProviders.map((plan: any, index: any) => (
            <Grid2 key={plan.id || index} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
              <PlanCard plan={plan} />
            </Grid2>
          ))
        ) : (
          <Grid2 size={{ xs: 12 }}>
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '280px',
                p: 4,
                borderRadius: '12px',
                border: '1px dashed #cbd5e1',
                background: '#f8fafc'
              }}
            >
              <SearchX size={48} color='#94a3b8' strokeWidth={1.5} style={{ marginBottom: '16px' }} />
              <Typography sx={{ fontSize: '16px', fontWeight: 600, color: '#475569', mb: 0.5 }}>
                Không tìm thấy gói proxy phù hợp
              </Typography>
              <Typography sx={{ fontSize: '14px', color: '#94a3b8', mb: 2 }}>
                Thử thay đổi bộ lọc hoặc xoá bộ lọc để xem tất cả
              </Typography>
              {hasActiveFilter && (
                <Chip
                  icon={<X size={14} />}
                  label='Xoá tất cả bộ lọc'
                  onClick={clearAllFilters}
                  sx={{
                    fontWeight: 600,
                    fontSize: '13px',
                    height: '36px',
                    borderRadius: '8px',
                    bgcolor: '#1e293b',
                    color: '#fff',
                    '&:hover': { bgcolor: '#334155' },
                    '& .MuiChip-icon': { color: '#fff' }
                  }}
                />
              )}
            </Box>
          </Grid2>
        )}
      </Grid2>
    </>
  )
}
