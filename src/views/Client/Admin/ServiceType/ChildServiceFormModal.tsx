'use client'

/**
 * Form thêm/sửa sản phẩm cho SITE CON.
 * Đơn giản hơn form site mẹ:
 * - Chọn SP từ site mẹ (dropdown)
 * - Bảng giá: giá nhập (read-only) | giá bán (editable)
 * - Tên, mô tả, tag, trạng thái
 * - KHÔNG có: provider, api_provider, body_api, code
 */

import { useState, useEffect, useMemo, memo } from 'react'

import {
  Dialog,
  DialogContent,
  Button,
  TextField,
  MenuItem,
  Grid2,
  Alert,
  IconButton,
  Chip,
  Switch,
  FormControlLabel,
  Tooltip
} from '@mui/material'
import {
  X,
  Save,
  Loader2,
  Package,
  Info,
  MapPin,
  Shield,
  Wifi,
  Zap,
  Users,
  RefreshCw,
  Clock,
  Globe,
  ShoppingCart
} from 'lucide-react'
import { useFormNotification } from '@/hooks/useFormNotification'
import FormAlert from '@/components/FormAlert'
import { useForm, Controller } from 'react-hook-form'

import CustomTextField from '@/@core/components/mui/TextField'
import CollapsibleSection from '@/views/Client/Admin/ServiceType/CollapsibleSection'
import { useServiceType, useCreateServiceType, useUpdateServiceType } from '@/hooks/apis/useServiceType'
import { useCheckSupplierProduct, type SupplierProduct } from '@/hooks/apis/useSupplierProducts'
import { useCountries } from '@/hooks/apis/useCountries'

import { PREDEFINED_TAGS, getTagStyle } from '@/configs/tagConfig'

interface Props {
  open: boolean
  onClose: () => void
  serviceId?: number | null
  initialData?: any
}

// ─── Discount Tier Row cho site con (local state cho ô giá — tránh computed value ghi đè) ───
// Helpers format VN
const parseVN = (str: string): number => {
  if (!str) return 0
  return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0
}
const formatVN = (num: number): string => {
  if (!num && num !== 0) return ''
  const rounded = Math.round(num * 100) / 100
  return rounded % 1 === 0
    ? rounded.toLocaleString('vi-VN')
    : rounded.toLocaleString('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 2 })
}
const sanitizeVN = (str: string): string => str.replace(/[^0-9.,]/g, '')

interface DiscountTier {
  min: string
  max: string
  discount: string
  price?: string
}

const ChildDiscountTierRow = memo(function ChildDiscountTierRow({
  tier,
  idx,
  sellBase,
  costAt,
  profit,
  isLoss,
  onUpdate,
  onRemove
}: {
  tier: DiscountTier
  idx: number
  sellBase: number
  costAt: number
  profit: number
  isLoss: boolean
  onUpdate: (idx: number, tier: DiscountTier) => void
  onRemove: (idx: number) => void
}) {
  const disc = parseFloat(tier.discount) || 0
  const displayPrice = tier.price
    ? formatVN(parseVN(tier.price))
    : sellBase > 0 && disc > 0
      ? formatVN(Math.round(sellBase * (1 - disc / 100) * 100) / 100)
      : ''

  const inputStyle = { width: '100%', padding: '4px 6px', border: '1px solid #e2e8f0', borderRadius: 4, fontSize: 12 }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr 1fr 32px',
        gap: 2,
        alignItems: 'center',
        padding: '5px 8px',
        borderTop: '1px solid #f1f5f9',
        background: isLoss ? '#fef2f2' : undefined
      }}
    >
      <input
        type='number'
        placeholder='5'
        value={tier.min}
        onChange={e => onUpdate(idx, { ...tier, min: e.target.value })}
        style={inputStyle}
      />
      <input
        type='number'
        placeholder='∞'
        value={tier.max}
        onChange={e => onUpdate(idx, { ...tier, max: e.target.value })}
        style={inputStyle}
      />
      <input
        placeholder='VD: 10,5'
        value={tier.discount}
        onChange={e => {
          const pct = sanitizeVN(e.target.value)
          const pctNum = parseFloat(pct) || 0
          const newPrice =
            sellBase > 0 && pctNum > 0 ? String(Math.round(sellBase * (1 - pctNum / 100) * 100) / 100) : undefined
          onUpdate(idx, { ...tier, discount: pct, price: newPrice })
        }}
        style={inputStyle}
      />
      <input
        placeholder='VD: 4.500'
        value={displayPrice}
        onChange={e => {
          const raw = sanitizeVN(e.target.value)
          const priceNum = parseVN(raw)
          const newDisc =
            sellBase > 0 && priceNum > 0 ? String(Math.round((1 - priceNum / sellBase) * 10000) / 100) : tier.discount
          onUpdate(idx, { ...tier, discount: newDisc, price: String(priceNum) })
        }}
        style={{ ...inputStyle, fontWeight: disc > 0 ? 600 : 400, color: disc > 0 ? '#1e293b' : '#94a3b8' }}
      />
      <span style={{ fontSize: 11, color: '#6366f1' }}>{costAt > 0 ? formatVN(costAt) + 'đ' : '—'}</span>
      <span style={{ fontSize: 11, fontWeight: 700, color: isLoss ? '#ef4444' : profit > 0 ? '#16a34a' : '#94a3b8' }}>
        {profit !== 0 ? `${profit > 0 ? '+' : ''}${formatVN(profit)}đ` : '—'}
      </span>
      <button
        type='button'
        onClick={() => onRemove(idx)}
        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 13, padding: 0 }}
      >
        ✕
      </button>
    </div>
  )
})

export default function ChildServiceFormModal({ open, onClose, serviceId, initialData }: Props) {
  const isEditMode = !!serviceId

  // Data
  const { data: fetchedData, isLoading: loadingService } = useServiceType(serviceId, isEditMode && open)
  const serviceData = fetchedData || initialData
  const checkProductMutation = useCheckSupplierProduct()
  const { data: countries } = useCountries()

  // Mutations
  const createMutation = useCreateServiceType()
  const updateMutation = useUpdateServiceType(serviceId)

  // State
  const [supplierCodeInput, setSupplierCodeInput] = useState('')
  const [checkedProduct, setCheckedProduct] = useState<(SupplierProduct & { already_imported?: boolean }) | null>(null)
  const [selectedSupplierId, setSelectedSupplierId] = useState<number | null>(null)
  const [selectedSupplierCode, setSelectedSupplierCode] = useState<string | null>(null)
  const { notification, showSuccess, showError, clear: clearNotification } = useFormNotification()
  const [priceFields, setPriceFields] = useState<Array<{ key: string; value: string; cost: string }>>([])
  const [pricingMode, setPricingMode] = useState<'fixed' | 'per_unit'>('fixed')
  const [parentPricingMode, setParentPricingMode] = useState<'fixed' | 'per_unit'>('fixed')
  const [timeUnit, setTimeUnit] = useState<'day' | 'month'>('day')
  const [pricePerUnit, setPricePerUnit] = useState('')
  const [costPerUnit, setCostPerUnit] = useState('')
  const [allowCustomAuth, setAllowCustomAuth] = useState(false)
  const [renewable, setRenewable] = useState(false)
  const [renewalDuration, setRenewalDuration] = useState<string>('original')
  const [allowExpiredRenew, setAllowExpiredRenew] = useState(false)
  const [parentRenewable, setParentRenewable] = useState<boolean | null>(null)
  const [discountTiers, setDiscountTiers] = useState<DiscountTier[]>([])
  const [syncStatus, setSyncStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [purchaseOptions, setPurchaseOptions] = useState<
    Array<{
      key: string
      param_name: string
      label: string
      type: 'select' | 'text' | 'number'
      required: boolean
      default: string
      options: Array<{ value: string; label: string }>
    }>
  >([])

  // All supplier products (imported + available)
  // selectedProduct = product đã check từ site mẹ (hoặc load từ metadata khi edit)
  const selectedProduct = checkedProduct

  // Form
  const {
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    setError,
    formState: { errors }
  } = useForm({
    defaultValues: {
      name: '',
      code: '',
      status: 'active',
      type: '0',
      ip_version: 'ipv4',
      proxy_type: 'residential',
      protocols: [] as string[],
      country: '',
      note: '',
      tag: '',
      is_purchasable: true,
      min_quantity: 1,
      max_quantity: 100,
      auth_type: '',
      bandwidth: '',
      rotation_type: '',
      rotation_interval: '',
      pool_size: '',
      request_limit: '',
      concurrent_connections: ''
    }
  })

  const watchTag = watch('tag')

  // Watch all fields for preview
  const watchAll = watch()

  // Load service data when editing
  useEffect(() => {
    if (serviceData && isEditMode) {
      const meta =
        typeof serviceData.metadata === 'string' ? JSON.parse(serviceData.metadata || '{}') : serviceData.metadata || {}

      const supplierId = meta.provider_product_id || null
      let supplierCode = meta.provider_product_code || null

      setSelectedSupplierId(supplierId)

      setSelectedSupplierCode(supplierCode)
      setSupplierCodeInput(supplierCode || '')

      // Auto-fetch product từ site mẹ theo code để lấy provider_discount_tiers + auth_type
      if (supplierCode && !checkedProduct) {
        checkProductMutation.mutate(supplierCode, {
          onSuccess: data => {
            setCheckedProduct(data)
            // Auto-fill auth_type nếu local chưa set
            if (data.auth_type && !serviceData?.auth_type) {
              setValue('auth_type', data.auth_type)
            }
          }
        })
      }

      // Parse price_by_duration
      let prices = serviceData.price_by_duration

      if (typeof prices === 'string')
        try {
          prices = JSON.parse(prices)
        } catch {
          prices = []
        }

      if (prices && Array.isArray(prices)) {
        const supplierPrices = meta.provider_prices || {}

        setPriceFields(
          prices.map((p: any) => ({
            key: p.key || '',
            value: String(p.value || ''),
            cost: String(supplierPrices[p.key] || p.cost || '')
          }))
        )
      }

      // Load pricing mode
      setPricingMode(serviceData.pricing_mode || 'fixed')
      setParentPricingMode(meta.parent_pricing_mode || serviceData.pricing_mode || 'fixed')
      setTimeUnit(serviceData.time_unit || 'day')
      setPricePerUnit(serviceData.price_per_unit?.toString() || '')
      setCostPerUnit(serviceData.cost_per_unit?.toString() || '')
      setAllowCustomAuth(!!meta.allow_custom_auth)
      setRenewable(!!meta.renewable)
      setRenewalDuration(meta.renewal_duration || 'original')
      setAllowExpiredRenew(!!meta.allow_expired_renew)
      setDiscountTiers(meta.discount_tiers || [])

      // Load purchase options (custom fields)
      if (meta.custom_fields && Array.isArray(meta.custom_fields)) {
        setPurchaseOptions(
          meta.custom_fields.map((f: any) => ({
            key: f.key || f.param || '',
            param_name: f.param_name || f.param || '',
            label: f.label || '',
            type: f.type || 'select',
            required: f.required || false,
            default: f.default || '',
            options: f.options || [{ value: '', label: '' }]
          }))
        )
      } else {
        setPurchaseOptions([])
      }

      let parsedProtocols = serviceData.protocols

      if (typeof parsedProtocols === 'string')
        try {
          parsedProtocols = JSON.parse(parsedProtocols)
        } catch {
          parsedProtocols = []
        }

      reset({
        name: serviceData.name || '',
        code: serviceData.code || '',
        status: serviceData.status || 'active',
        type: serviceData.type?.toString() || '0',
        ip_version: serviceData.ip_version?.toLowerCase() || 'ipv4',
        proxy_type: serviceData.proxy_type || 'residential',
        protocols: parsedProtocols || [],
        country: serviceData.country?.toLowerCase() || '',
        note: serviceData.note || '',
        tag: serviceData.tag || '',
        is_purchasable: serviceData.is_purchasable !== false,
        min_quantity: serviceData.min_quantity ?? 1,
        max_quantity: serviceData.max_quantity ?? 100,
        auth_type: serviceData.auth_type || '',
        bandwidth: serviceData.bandwidth || '',
        rotation_type: serviceData.rotation_type || '',
        rotation_interval: serviceData.rotation_interval || '',
        pool_size: serviceData.pool_size || '',
        request_limit: serviceData.request_limit || '',
        concurrent_connections: serviceData.concurrent_connections?.toString() || ''
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceData, isEditMode, reset, open])

  // When selecting a supplier product (new import)
  useEffect(() => {
    if (!selectedProduct || isEditMode) return

    // Auto fill from supplier product
    setValue('name', selectedProduct.name)
    setValue('type', selectedProduct.type === 'ROTATING' ? '1' : '0')
    setValue('country', selectedProduct.country?.toLowerCase() || '')

    if (selectedProduct.protocols) {
      setValue('protocols', selectedProduct.protocols)
    }

    // Auto fill auth_type + max_ips từ site mẹ
    if (selectedProduct.auth_type) {
      setValue('auth_type', selectedProduct.auth_type)
    }

    // Set pricing mode theo site mẹ
    const parentMode = selectedProduct.pricing_mode || 'fixed'
    setParentPricingMode(parentMode)
    setPricingMode(parentMode)
    setTimeUnit(selectedProduct.time_unit || 'day')

    if (parentMode === 'per_unit') {
      // Per_unit: giá nhập = cost_per_unit (giá vốn gốc), fallback price_per_unit
      setCostPerUnit(String(selectedProduct.cost_per_unit || selectedProduct.price_per_unit || 0))
      setPricePerUnit('') // Admin nhập giá bán
      setPriceFields([])
    } else {
      // Fixed: provider_prices giờ trả giá vốn gốc, sell_prices trả giá bán tham khảo
      const costs = selectedProduct.provider_prices || {}
      const sells = selectedProduct.sell_prices || {}
      setPriceFields(
        Object.entries(costs).map(([key, cost]) => ({
          key,
          value: String(sells[key] || ''), // Giá bán tham khảo từ site mẹ (admin có thể sửa)
          cost: String(cost) // Giá vốn gốc
        }))
      )
    }
  }, [selectedProduct, isEditMode, setValue])

  // Reset when modal opens
  useEffect(() => {
    clearNotification()

    if (open && !isEditMode) {
      reset({
        name: '',
        code: '',
        status: 'active',
        type: '0',
        ip_version: 'ipv4',
        proxy_type: 'residential',
        protocols: [],
        country: '',
        note: '',
        tag: '',
        is_purchasable: true,
        auth_type: '',
        bandwidth: '',
        rotation_type: '',
        rotation_interval: '',
        pool_size: '',
        request_limit: '',
        concurrent_connections: '',
        min_quantity: 1,
        max_quantity: 100
      })
      setSelectedSupplierId(null)
      setSelectedSupplierCode(null)
      setSupplierCodeInput('')
      setCheckedProduct(null)
      setPriceFields([])
      setAllowCustomAuth(false)
      setRenewable(false)
      setRenewalDuration('original')
      setAllowExpiredRenew(false)
      setParentRenewable(null)
      setPurchaseOptions([])
      setPricingMode('fixed')
      setTimeUnit('day')
      setPricePerUnit('')
      setCostPerUnit('')
    }
  }, [open, isEditMode, reset])

  const getDurationLabel = (key: string) => {
    const days = parseInt(key)

    if (days === 1) return '1 ngày'
    if (days === 7) return '7 ngày (tuần)'
    if (days === 30) return '30 ngày (tháng)'
    if (days === 90) return '90 ngày (quý)'
    if (days === 365) return '365 ngày (năm)'

    return `${key} ngày`
  }

  const toggleTag = (preset: string) => {
    const current = watchTag
      ? watchTag
          .split(',')
          .map((t: string) => t.trim())
          .filter(Boolean)
      : []
    const exists = current.includes(preset)
    const updated = exists ? current.filter((t: string) => t !== preset) : [...current, preset]

    setValue('tag', updated.join(', '))
  }

  const getCountryNameFromCode = (code: string) => {
    if (!code || !countries) return ''
    const found = (countries as any[]).find((c: any) => c.code.toLowerCase() === code.toLowerCase())

    return found ? found.name : code.toUpperCase()
  }

  const getAuthTypeLabel = (val: string) => {
    switch (val) {
      case 'userpass':
        return 'User:Pass'
      case 'ip_whitelist':
        return 'IP Whitelist'
      case 'both':
        return 'User:Pass + IP'
      default:
        return val
    }
  }

  const getRotationTypeLabel = (val: string) => {
    switch (val) {
      case 'per_request':
        return 'Per request'
      case 'sticky':
        return 'Sticky'
      case 'time_based':
        return 'Time-based'
      default:
        return val
    }
  }

  const onSubmit = (data: any) => {
    if (pricingMode === 'per_unit') {
      // Per_unit: validate giá bán/đơn vị
      const sell = parseInt(pricePerUnit)
      const cost = parseInt(costPerUnit)

      if (!sell || sell <= 0) {
        showError('Vui lòng nhập giá bán / đơn vị')
        return
      }

      if (cost > 0 && sell <= cost) {
        showError(
          `Giá bán phải cao hơn giá nhập (${cost.toLocaleString('vi-VN')}đ/${timeUnit === 'month' ? 'tháng' : 'ngày'})`
        )
        return
      }
    } else {
      // Fixed: validate giá bán
      const emptyPrices = priceFields.filter(p => !p.value || parseInt(p.value) <= 0)

      if (priceFields.length > 0 && emptyPrices.length > 0) {
        showError('Vui lòng nhập giá bán cho tất cả thời gian')
        document.getElementById('child-form-alert')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
        return
      }

      const underPriced = priceFields.filter(p => parseInt(p.value) <= parseInt(p.cost))

      if (underPriced.length > 0) {
        const label = getDurationLabel(underPriced[0].key)
        showError(`Giá bán ${label} phải cao hơn giá nhập (${parseInt(underPriced[0].cost).toLocaleString('vi-VN')}đ)`)
        document.getElementById('child-form-alert')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
        return
      }
    }

    const submitData: any = {
      ...data,
      pricing_mode: pricingMode,
      time_unit: timeUnit,
      price_per_unit: pricingMode === 'per_unit' ? parseInt(pricePerUnit) || null : null,
      // Luôn giữ cost_per_unit — cần để tính giá nhập khi đổi mode
      cost_per_unit: parseInt(costPerUnit) || null,
      price: pricingMode === 'per_unit' ? parseInt(pricePerUnit) || 0 : parseInt(priceFields[0]?.value || '0'),
      // per_unit: giữ price_by_duration cũ nếu có, không xóa mốc
      price_by_duration:
        pricingMode === 'per_unit'
          ? serviceData?.price_by_duration || []
          : priceFields.map(p => {
              // Ưu tiên field.cost (đã đồng bộ/nhập), fallback tính từ đơn giá mẹ
              const cost =
                parseInt(p.cost) ||
                (parentPricingMode === 'per_unit' ? (parseInt(costPerUnit) || 0) * (parseInt(p.key) || 0) : 0)

              return { key: p.key, value: parseInt(p.value), cost }
            }),
      cost_price:
        pricingMode === 'per_unit'
          ? parseInt(costPerUnit) || 0
          : (() => {
              const costs = priceFields
                .map(
                  p =>
                    parseInt(p.cost) ||
                    (parentPricingMode === 'per_unit' ? (parseInt(costPerUnit) || 0) * (parseInt(p.key) || 0) : 0)
                )
                .filter(v => v > 0)

              return costs.length > 0 ? Math.min(...costs) : 0
            })(),
      proxy_type: data.proxy_type || 'residential',
      country: data.country || '',
      api_type: 'buy_api',
      api_provider: '', // Site con không cần — SupplierService tự xử lý
      body_api: null,
      code: data.code || null,
      auth_type: data.auth_type || '',
      bandwidth: data.bandwidth || '',
      rotation_type: data.rotation_type || '',
      rotation_interval: data.rotation_interval || '',
      pool_size: data.pool_size || '',
      request_limit: data.request_limit || '',
      concurrent_connections: data.concurrent_connections ? parseInt(data.concurrent_connections) : null,
      min_quantity: data.min_quantity || 1,
      max_quantity: data.max_quantity || 100,
      status: data.status || 'active',
    }

    // Luôn gửi metadata — cả tạo mới và cập nhật
    if (selectedSupplierId || selectedSupplierCode) {
      // Giữ metadata cũ + merge supplier info mới
      const existingMeta =
        isEditMode && serviceData?.metadata
          ? typeof serviceData.metadata === 'string'
            ? JSON.parse(serviceData.metadata || '{}')
            : serviceData.metadata
          : {}

      submitData.metadata = {
        ...existingMeta,
        ...(selectedSupplierCode ? { provider_product_code: selectedSupplierCode } : {}),
        ...(selectedSupplierId ? { provider_product_id: selectedSupplierId } : {}),
        parent_pricing_mode: parentPricingMode,
        allow_custom_auth: allowCustomAuth,
        max_ips: selectedProduct?.max_ips || existingMeta?.max_ips || null,
        renewable: renewable,
        renewal_duration: renewalDuration,
        allow_expired_renew: allowExpiredRenew,
        discount_tiers: pricingMode === 'per_unit' ? discountTiers.filter(t => t.min && t.discount) : undefined,
        // Lưu mốc giá nhập từ site mẹ → dùng tính giá vốn khi tạo đơn
        cost_discount_tiers: (() => {
          // Ưu tiên data mới từ site mẹ, fallback existing metadata
          const tiers = selectedProduct?.provider_discount_tiers || existingMeta?.cost_discount_tiers
          if (!tiers?.length || pricingMode !== 'per_unit') return existingMeta?.cost_discount_tiers || undefined
          return tiers
            .filter((t: any) => t.min && (t.discount || t.price))
            .map((t: any) => ({
              min: t.min,
              max: t.max || null,
              discount: t.discount || '0',
              ...(t.price ? { price: t.price } : {})
            }))
        })(),
        custom_fields: purchaseOptions
          .filter(o => o.key && o.label && (o.type !== 'select' || o.options.some(opt => opt.value)))
          .map(o => ({
            key: o.key,
            param_name: o.param_name || o.key,
            label: o.label,
            type: o.type || 'select',
            required: o.required,
            default: o.default || (o.type === 'select' ? o.options[0]?.value || '' : ''),
            ...(o.type === 'select' ? { options: o.options.filter(opt => opt.value) } : {})
          })),
        provider_prices:
          pricingMode === 'per_unit'
            ? { per_unit: parseInt(costPerUnit) || 0 }
            : Object.fromEntries(
                priceFields.map(p => {
                  const cost =
                    parseInt(p.cost) ||
                    (parentPricingMode === 'per_unit' ? (parseInt(costPerUnit) || 0) * (parseInt(p.key) || 0) : 0)

                  return [p.key, cost]
                })
              )
      }
    }

    const mutation = isEditMode ? updateMutation : createMutation

    clearNotification()

    mutation.mutate(submitData, {
      onSuccess: () => {
        showSuccess(isEditMode ? 'Cập nhật thành công!' : 'Thêm sản phẩm thành công!')
      },
      onError: (error: any) => {
        const res = error?.response?.data

        // Parse validation errors → set lỗi vào từng field
        if (res?.errors && typeof res.errors === 'object') {
          console.error('Validation errors:', res.errors)
          const errorMessages: string[] = []

          Object.entries(res.errors).forEach(([field, fieldErrors]: [string, any]) => {
            const msg = Array.isArray(fieldErrors) ? fieldErrors[0] : fieldErrors

            setError(field as any, { type: 'server', message: msg })
            errorMessages.push(`${field}: ${msg}`)
          })

          showError('Lỗi: ' + errorMessages.join(', '))
        } else {
          showError(res?.message || 'Có lỗi xảy ra')
        }
      }
    })
  }

  const isPending = createMutation.isPending || updateMutation.isPending
  const isLoading = loadingService

  // Preview helpers
  const previewName = watchAll.name || 'Tên sản phẩm'
  const previewTags = watchAll.tag
    ? watchAll.tag
        .split(',')
        .map((t: string) => t.trim())
        .filter(Boolean)
    : []
  const previewType = watchAll.type === '1' ? 'Rotating' : 'Static'
  const previewIpVersion = watchAll.ip_version === 'ipv6' ? 'V6' : 'V4'
  const previewCountryCode = watchAll.country || ''
  const previewCountryName = getCountryNameFromCode(previewCountryCode)

  const previewProtocols =
    Array.isArray(watchAll.protocols) && watchAll.protocols.length > 0
      ? watchAll.protocols.map((p: string) => p.toUpperCase()).join('/')
      : '—'

  const previewPrice =
    pricingMode === 'per_unit' && pricePerUnit
      ? `${parseInt(pricePerUnit).toLocaleString('vi-VN')}đ/${timeUnit === 'month' ? 'tháng' : 'ngày'}`
      : priceFields.length > 0 && priceFields[0].value
        ? `${parseInt(priceFields[0].value).toLocaleString('vi-VN')}đ`
        : '—'

  const FeatureRow = ({
    icon: Icon,
    iconColor,
    label,
    value
  }: {
    icon: any
    iconColor: string
    label: string
    value: string
  }) => (
    <div
      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 4px', borderBottom: '1px solid #f8fafc' }}
    >
      <Icon size={16} color={iconColor} />
      <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '14px', color: '#4a5568', fontWeight: 500 }}>{label}:</span>
        <span style={{ fontSize: '14px', color: '#1e293b', fontWeight: 700 }}>{value}</span>
      </div>
    </div>
  )

  return (
    <Dialog open={open} onClose={onClose} maxWidth='lg' fullWidth closeAfterTransition={false}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 20px',
          borderBottom: '1px solid #e5e7eb'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'color-mix(in srgb, var(--primary-hover, #6366f1) 12%, white)'
            }}
          >
            <Package size={16} style={{ color: 'var(--primary-hover, #6366f1)' }} />
          </div>
          <span style={{ fontSize: '14px', fontWeight: 600, color: '#1f2937' }}>
            {isEditMode ? 'Sửa sản phẩm' : 'Thêm sản phẩm từ nhà cung cấp'}
          </span>
        </div>
        <IconButton onClick={onClose} size='small' sx={{ color: '#9ca3af' }}>
          <X size={18} />
        </IconButton>
      </div>

      <FormAlert notification={notification} onClose={clearNotification} />

      <DialogContent sx={{ pt: 2.5 }}>
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>Đang tải...</div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)}>
            <div style={{ display: 'flex', gap: 24 }}>
              {/* Left: Form */}
              <div style={{ flex: 3 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  {/* Nhập code SP site mẹ (chỉ khi tạo mới) */}
                  {!isEditMode && (
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b', marginBottom: 8 }}>
                        Nhập code sản phẩm từ Provider
                      </div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                        <CustomTextField
                          fullWidth
                          size='small'
                          value={supplierCodeInput}
                          onChange={(e: any) => {
                            setSupplierCodeInput(e.target.value.trim())
                            setCheckedProduct(null)
                          }}
                          placeholder='VD: proxy-vn-rotate-a3f2'
                          helperText={
                            checkedProduct?.already_imported
                              ? 'Sản phẩm này đã được import trước đó'
                              : checkedProduct
                                ? `✓ ${checkedProduct.name} (${checkedProduct.type})`
                                : 'Nhập code rồi bấm Kiểm tra để xác nhận sản phẩm tồn tại'
                          }
                          error={checkProductMutation.isError}
                          sx={{
                            '& .MuiFormHelperText-root': {
                              color: checkedProduct?.already_imported
                                ? '#d97706'
                                : checkedProduct
                                  ? '#16a34a'
                                  : undefined
                            }
                          }}
                        />
                        <Button
                          size='small'
                          variant='outlined'
                          disabled={!supplierCodeInput || checkProductMutation.isPending}
                          onClick={() => {
                            checkProductMutation.mutate(supplierCodeInput, {
                              onSuccess: data => {
                                setCheckedProduct(data)
                                setSelectedSupplierId(data.supplier_id)
                                setSelectedSupplierCode(data.supplier_code || supplierCodeInput)
                              },
                              onError: () => setCheckedProduct(null)
                            })
                          }}
                          sx={{ whiteSpace: 'nowrap', minWidth: 90, height: 40 }}
                        >
                          {checkProductMutation.isPending ? '...' : 'Kiểm tra'}
                        </Button>
                      </div>
                      {checkProductMutation.isError && (
                        <div style={{ fontSize: 12, color: '#ef4444', marginTop: 4 }}>
                          {(checkProductMutation.error as any)?.response?.data?.message ||
                            'Không tìm thấy sản phẩm với code này'}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Tên + Code + Trạng thái */}
                  {/* Hàng 1: Tên + Trạng thái */}
                  <Grid2 container spacing={1.5}>
                    <Grid2 size={{ xs: 12, sm: 9 }}>
                      <Controller
                        name='name'
                        control={control}
                        render={({ field }) => (
                          <CustomTextField
                            {...field}
                            fullWidth
                            label='Tên sản phẩm'
                            placeholder='VD: Proxy IPv4 Việt Nam'
                            error={!!errors.name}
                            helperText={errors.name?.message as string}
                          />
                        )}
                      />
                    </Grid2>
                    <Grid2 size={{ xs: 12, sm: 3 }}>
                      <Controller
                        name='status'
                        control={control}
                        render={({ field }) => (
                          <CustomTextField {...field} fullWidth select label='Trạng thái'>
                            <MenuItem value='active'>Đang bán</MenuItem>
                            <MenuItem value='inactive'>Tạm ẩn</MenuItem>
                          </CustomTextField>
                        )}
                      />
                    </Grid2>
                  </Grid2>

                  {/* Hàng 2: Code site con + Code site mẹ — cùng 1 hàng, cùng style */}
                  <div style={{ display: 'flex', gap: 12, marginTop: 6 }}>
                    <Controller
                      name='code'
                      control={control}
                      render={({ field }) => (
                        <CustomTextField
                          {...field}
                          fullWidth
                          label='Code sản phẩm (site bạn)'
                          placeholder='Để trống sẽ tự tạo'
                          error={!!errors.code}
                          helperText={serviceId ? `ID: ${serviceId}` : 'Mã riêng trên site của bạn'}
                        />
                      )}
                    />
                    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                      <CustomTextField
                        fullWidth
                        label='Code sản phẩm (site mẹ)'
                        value={selectedSupplierCode || ''}
                        onChange={(e: any) => {
                          setSelectedSupplierCode(e.target.value || null)
                          if (isEditMode) setCheckedProduct(null)
                        }}
                        placeholder={isEditMode ? 'Nhập code SP trên site mẹ' : 'Tự động khi chọn SP'}
                        helperText={
                          checkedProduct
                            ? `✓ ${checkedProduct.name} (ID: ${checkedProduct.supplier_id}) — ${Object.keys(checkedProduct.provider_prices || {}).length} mốc giá`
                            : selectedSupplierId
                              ? `ID trên site mẹ: ${selectedSupplierId}`
                              : 'Dùng để mua hàng từ site mẹ'
                        }
                        sx={{
                          '& input': { fontFamily: 'monospace' },
                          '& .MuiFormHelperText-root': { color: checkedProduct && isEditMode ? '#16a34a' : undefined }
                        }}
                      />
                      {isEditMode && (
                        <Button
                          size='small'
                          variant='outlined'
                          disabled={!selectedSupplierCode || checkProductMutation.isPending}
                          onClick={() => {
                            checkProductMutation.mutate(selectedSupplierCode!, {
                              onSuccess: data => {
                                setCheckedProduct(data)
                                setSelectedSupplierId(data.supplier_id)
                                setSelectedSupplierCode(data.supplier_code || selectedSupplierCode)
                                // Auto-fill auth_type nếu admin chưa chọn
                                if (data.auth_type && !watch('auth_type')) {
                                  setValue('auth_type', data.auth_type)
                                }
                              },
                              onError: () => setCheckedProduct(null)
                            })
                          }}
                          sx={{ whiteSpace: 'nowrap', minWidth: 90, height: 40, mt: '20px' }}
                        >
                          {checkProductMutation.isPending ? '...' : 'Kiểm tra'}
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Banner cảnh báo IP Whitelist từ site mẹ */}
                  {checkedProduct?.auth_type &&
                    (checkedProduct.auth_type === 'ip_whitelist' || checkedProduct.auth_type === 'both') && (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: '10px 14px',
                          borderRadius: 8,
                          background: '#fef2f2',
                          border: '1px solid #fecaca'
                        }}
                      >
                        <span style={{ fontSize: '18px' }}>🔒</span>
                        <div>
                          <div style={{ fontSize: '12px', fontWeight: 700, color: '#991b1b' }}>
                            Site mẹ bắt buộc nhập IP Whitelist
                          </div>
                          <div style={{ fontSize: '11px', color: '#dc2626', marginTop: 2 }}>
                            Khách hàng phải nhập IP trước khi mua. Đảm bảo mục "Xác thực" bên dưới chọn "
                            {checkedProduct.auth_type === 'ip_whitelist' ? 'IP Whitelist' : 'Cả hai'}".
                            {checkedProduct.max_ips ? ` Tối đa ${checkedProduct.max_ips} IP.` : ''}
                          </div>
                        </div>
                      </div>
                    )}

                  {/* Banner khi SP local chưa set auth_type nhưng site mẹ yêu cầu */}
                  {checkedProduct?.auth_type &&
                    (checkedProduct.auth_type === 'ip_whitelist' || checkedProduct.auth_type === 'both') &&
                    watch('auth_type') !== checkedProduct.auth_type && (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: '10px 14px',
                          borderRadius: 8,
                          background: '#fffbeb',
                          border: '1px solid #fde68a'
                        }}
                      >
                        <span style={{ fontSize: '18px' }}>⚠️</span>
                        <div>
                          <div style={{ fontSize: '12px', fontWeight: 700, color: '#92400e' }}>
                            Xác thực chưa khớp với site mẹ!
                          </div>
                          <div style={{ fontSize: '11px', color: '#b45309', marginTop: 2 }}>
                            Bạn đang chọn "{watch('auth_type') || 'Không chọn'}" nhưng site mẹ yêu cầu "
                            {checkedProduct.auth_type === 'ip_whitelist' ? 'IP Whitelist' : 'Cả hai'}". Nếu không khớp,
                            đơn hàng có thể lỗi.
                          </div>
                        </div>
                      </div>
                    )}

                  {/* Chế độ giá — site con được chọn riêng */}
                  {(selectedProduct || isEditMode) && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
                      <span style={{ fontSize: '12px', color: '#64748b' }}>Chế độ giá bán:</span>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button
                          type='button'
                          onClick={() => {
                            setPricingMode('fixed')
                            if (pricingMode !== 'fixed' && priceFields.length === 0) {
                              setPriceFields([
                                { key: '1', value: '', cost: '' },
                                { key: '7', value: '', cost: '' },
                                { key: '30', value: '', cost: '' }
                              ])
                            }
                          }}
                          style={{
                            padding: '4px 12px',
                            fontSize: '12px',
                            fontWeight: 600,
                            borderRadius: 6,
                            border: '1px solid',
                            cursor: 'pointer',
                            transition: 'all 0.15s',
                            background: pricingMode === 'fixed' ? '#1e293b' : '#fff',
                            color: pricingMode === 'fixed' ? '#fff' : '#64748b',
                            borderColor: pricingMode === 'fixed' ? '#1e293b' : '#e2e8f0'
                          }}
                        >
                          Mốc cố định
                        </button>
                        {/* Per_unit chỉ khả dụng khi mẹ per_unit — mẹ fixed chỉ bán theo mốc */}
                        <button
                          type='button'
                          onClick={() => {
                            if (parentPricingMode === 'per_unit') setPricingMode('per_unit')
                          }}
                          disabled={parentPricingMode === 'fixed'}
                          title={
                            parentPricingMode === 'fixed' ? 'Site mẹ bán theo mốc cố định — không thể bán tự do' : ''
                          }
                          style={{
                            padding: '4px 12px',
                            fontSize: '12px',
                            fontWeight: 600,
                            borderRadius: 6,
                            border: '1px solid',
                            transition: 'all 0.15s',
                            cursor: parentPricingMode === 'fixed' ? 'not-allowed' : 'pointer',
                            opacity: parentPricingMode === 'fixed' ? 0.4 : 1,
                            background: pricingMode === 'per_unit' ? '#1e293b' : '#fff',
                            color: pricingMode === 'per_unit' ? '#fff' : '#64748b',
                            borderColor: pricingMode === 'per_unit' ? '#1e293b' : '#e2e8f0'
                          }}
                        >
                          Nhập tự do ({timeUnit === 'month' ? 'tháng' : 'ngày'})
                        </button>
                      </div>
                      {parentPricingMode === 'fixed' && pricingMode === 'fixed' && (
                        <span style={{ fontSize: '11px', color: '#64748b' }}>
                          Site mẹ bán theo mốc — chỉ hỗ trợ bán mốc cố định
                        </span>
                      )}
                    </div>
                  )}

                  {/* Per_unit: giá nhập + giá bán / đơn vị */}
                  {pricingMode === 'per_unit' && (selectedProduct || isEditMode) && (
                    <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 12, marginBottom: 8 }}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: 8
                        }}
                      >
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
                          Giá theo {timeUnit === 'month' ? 'tháng' : 'ngày'}
                        </div>
                        {selectedSupplierCode && (
                          <button
                            type='button'
                            onClick={() => {
                              setSyncStatus('loading')
                              checkProductMutation.mutate(selectedSupplierCode, {
                                onSuccess: data => {
                                  setCheckedProduct(data)
                                  if (data?.price_per_unit) {
                                    setCostPerUnit(String(parseInt(data.price_per_unit) || 0))
                                  }
                                  if (data?.custom_fields) {
                                    setPurchaseOptions(
                                      data.custom_fields.map((f: any) => ({
                                        key: f.key || '',
                                        param_name: f.param_name || f.key || '',
                                        label: f.label || '',
                                        type: f.type || 'select',
                                        required: f.required || false,
                                        default: f.default || '',
                                        options: f.options || [{ value: '', label: '' }]
                                      }))
                                    )
                                  }
                                  if (data?.allow_custom_auth !== undefined)
                                    setAllowCustomAuth(!!data.allow_custom_auth)
                                  setSyncStatus('done')
                                  setTimeout(() => setSyncStatus('idle'), 2000)
                                },
                                onError: () => {
                                  setSyncStatus('error')
                                  setTimeout(() => setSyncStatus('idle'), 2000)
                                }
                              })
                            }}
                            disabled={syncStatus === 'loading'}
                            style={{
                              fontSize: '11.5px',
                              padding: '4px 10px',
                              borderRadius: 6,
                              border: '1px solid',
                              cursor: syncStatus === 'loading' ? 'wait' : 'pointer',
                              fontWeight: 600,
                              background:
                                syncStatus === 'done' ? '#f0fdf4' : syncStatus === 'error' ? '#fef2f2' : '#eff6ff',
                              color: syncStatus === 'done' ? '#16a34a' : syncStatus === 'error' ? '#ef4444' : '#2563eb',
                              borderColor:
                                syncStatus === 'done' ? '#bbf7d0' : syncStatus === 'error' ? '#fecaca' : '#3b82f6'
                            }}
                          >
                            {syncStatus === 'loading'
                              ? 'Đang đồng bộ...'
                              : syncStatus === 'done'
                                ? '✓ Đã đồng bộ'
                                : '↻ Đồng bộ giá & cấu hình'}
                          </button>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                        <TextField
                          size='small'
                          label={`Giá nhập/${timeUnit === 'month' ? 'tháng' : 'ngày'}`}
                          value={costPerUnit ? parseInt(costPerUnit).toLocaleString('vi-VN') : ''}
                          disabled
                          sx={{ width: 160, '& input': { fontSize: '13px' } }}
                        />
                        <TextField
                          size='small'
                          label={`Giá bán/${timeUnit === 'month' ? 'tháng' : 'ngày'}`}
                          value={pricePerUnit ? parseInt(pricePerUnit).toLocaleString('vi-VN') : ''}
                          onChange={e => setPricePerUnit(e.target.value.replace(/[^0-9]/g, ''))}
                          placeholder='Nhập giá bán'
                          error={
                            !!pricePerUnit &&
                            parseInt(costPerUnit) > 0 &&
                            parseInt(pricePerUnit) <= parseInt(costPerUnit)
                          }
                          sx={{ width: 160, '& input': { fontSize: '13px' } }}
                        />
                        {parseInt(pricePerUnit) > 0 && parseInt(costPerUnit) > 0 && (
                          <div style={{ fontSize: '13px', paddingTop: 8 }}>
                            <span
                              style={{
                                fontWeight: 600,
                                color: parseInt(pricePerUnit) > parseInt(costPerUnit) ? '#22c55e' : '#ef4444'
                              }}
                            >
                              +{(parseInt(pricePerUnit) - parseInt(costPerUnit)).toLocaleString('vi-VN')}đ (
                              {Math.round(
                                ((parseInt(pricePerUnit) - parseInt(costPerUnit)) / parseInt(costPerUnit)) * 100
                              )}
                              %)
                            </span>
                          </div>
                        )}
                      </div>
                      <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: 6 }}>
                        Khách hàng sẽ nhập số {timeUnit === 'month' ? 'tháng' : 'ngày'}, tổng = giá bán × số lượng.
                      </div>

                      {/* ── Giảm giá khi khách mua nhiều ngày ── */}
                      <div style={{ marginTop: 10, borderTop: '1px solid #f1f5f9', paddingTop: 10 }}>
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: 4
                          }}
                        >
                          <div>
                            <div style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>
                              Giảm giá khi mua nhiều {timeUnit === 'month' ? 'tháng' : 'ngày'}
                            </div>
                            <div style={{ fontSize: '10.5px', color: '#94a3b8' }}>
                              Khách mua càng nhiều {timeUnit === 'month' ? 'tháng' : 'ngày'} → được giảm giá → bạn vẫn
                              có lãi nếu set đúng
                            </div>
                          </div>
                          <button
                            type='button'
                            onClick={() => setDiscountTiers(prev => [...prev, { min: '', max: '', discount: '' }])}
                            style={{
                              fontSize: '11px',
                              padding: '3px 10px',
                              borderRadius: 6,
                              border: '1px solid #e2e8f0',
                              background: '#fff',
                              cursor: 'pointer',
                              color: '#475569',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            + Thêm mức
                          </button>
                        </div>

                        {/* Bảng mốc từ site mẹ — admin chọn áp dụng + nhập giá bán */}
                        {(() => {
                          const supplierTiers = selectedProduct?.provider_discount_tiers || []
                          const costBase = parseFloat(costPerUnit) || 0
                          const sellBase = parseFloat(pricePerUnit) || 0
                          const unitLabel = timeUnit === 'month' ? 'tháng' : 'ngày'

                          if (supplierTiers.length === 0 && costBase <= 0) return null

                          const getCostAt = (days: number) => {
                            for (const st of supplierTiers) {
                              const sMin = parseInt(st.min as any) || 0
                              const sMax = parseInt(st.max as any) || Infinity
                              // Dùng price nếu có (chính xác), fallback tính từ %
                              const stPrice = (st as any).price ? parseFloat((st as any).price) : 0
                              const sDisc = parseFloat(st.discount as any) || 0
                              if (days >= sMin && days <= sMax && (sDisc > 0 || stPrice > 0)) {
                                return stPrice > 0 ? stPrice : Math.round(costBase * (1 - sDisc / 100) * 100) / 100
                              }
                            }
                            return costBase
                          }

                          const allMilestones = [
                            { days: 1, costDisc: 0, cost: costBase },
                            ...supplierTiers
                              .filter(t => t.min && (t.discount || (t as any).price))
                              .map(t => ({
                                days: parseInt(t.min as any) || 1,
                                costDisc: parseFloat(t.discount as any) || 0,
                                cost: getCostAt(parseInt(t.min as any) || 1)
                              }))
                          ]

                          // Tìm discount tier đang áp cho mốc ngày
                          const findTierIdx = (days: number) => {
                            return discountTiers.findIndex(dt => {
                              const min = parseInt(dt.min) || 0
                              const max = parseInt(dt.max) || Infinity
                              return days >= min && days <= max
                            })
                          }

                          // Áp nhanh: tạo discount tier từ mốc site mẹ
                          const applyMilestone = (m: (typeof allMilestones)[0]) => {
                            if (m.costDisc === 0) return // mốc 1 ngày không cần
                            // Check đã có tier chưa
                            const existing = findTierIdx(m.days)
                            if (existing >= 0) return // đã có

                            // Tìm max của mốc trước
                            const nextMilestone = allMilestones.find(mm => mm.days > m.days)
                            const maxDay = nextMilestone ? String(nextMilestone.days - 1) : ''

                            // Gợi ý % giảm = giữ lợi nhuận tương đương mốc 1 ngày
                            const profitAt1 = sellBase - costBase
                            const suggestedSell = m.cost + profitAt1
                            const suggestedDisc = sellBase > 0 ? Math.round((1 - suggestedSell / sellBase) * 100) : 0

                            setDiscountTiers(prev => [
                              ...prev,
                              {
                                min: String(m.days),
                                max: maxDay,
                                discount: String(Math.max(0, suggestedDisc))
                              }
                            ])
                          }

                          // Bỏ mốc
                          const removeMilestone = (days: number) => {
                            const idx = findTierIdx(days)
                            if (idx >= 0) setDiscountTiers(prev => prev.filter((_, i) => i !== idx))
                          }

                          return (
                            <div
                              style={{
                                border: '1px solid #e0e7ff',
                                borderRadius: 8,
                                overflow: 'hidden',
                                marginBottom: 8
                              }}
                            >
                              <div
                                style={{
                                  background: '#eef2ff',
                                  padding: '6px 10px',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  color: '#4338ca',
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center'
                                }}
                              >
                                <span>Các mốc giá từ site mẹ — bấm "Áp dụng" để thêm mức giảm giá</span>
                                <button
                                  type='button'
                                  onClick={() => {
                                    // Áp tất cả mốc cùng lúc
                                    allMilestones.filter(m => m.costDisc > 0).forEach(m => applyMilestone(m))
                                  }}
                                  style={{
                                    fontSize: 10,
                                    padding: '2px 8px',
                                    borderRadius: 4,
                                    border: '1px solid #a5b4fc',
                                    background: '#e0e7ff',
                                    cursor: 'pointer',
                                    color: '#4338ca',
                                    fontWeight: 600
                                  }}
                                >
                                  Áp dụng tất cả
                                </button>
                              </div>
                              <div
                                style={{
                                  display: 'grid',
                                  gridTemplateColumns: '55px 1fr 1fr 1fr 80px',
                                  gap: 2,
                                  padding: '4px 10px',
                                  fontSize: '10px',
                                  fontWeight: 600,
                                  color: '#64748b',
                                  background: '#f8fafc'
                                }}
                              >
                                <span>Mốc</span>
                                <span>Trả site mẹ</span>
                                <span>Bán cho khách</span>
                                <span>Lợi nhuận</span>
                                <span></span>
                              </div>
                              {allMilestones.map((m, i) => {
                                const tierIdx = findTierIdx(m.days)
                                const isApplied = tierIdx >= 0
                                const sellDisc = isApplied ? parseInt(discountTiers[tierIdx].discount) || 0 : 0
                                const sellPrice = sellDisc > 0 ? Math.round(sellBase * (1 - sellDisc / 100)) : sellBase
                                const profit = sellPrice - m.cost
                                const isLoss = profit < 0
                                const isFirst = i === 0

                                return (
                                  <div
                                    key={i}
                                    style={{
                                      display: 'grid',
                                      gridTemplateColumns: '55px 1fr 1fr 1fr 80px',
                                      gap: 2,
                                      alignItems: 'center',
                                      padding: '6px 10px',
                                      borderTop: '1px solid #f1f5f9',
                                      background: isLoss ? '#fef2f2' : isApplied ? '#f0fdf4' : undefined
                                    }}
                                  >
                                    <span style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>
                                      {m.days} {unitLabel}
                                    </span>
                                    <span style={{ fontSize: 11, color: '#6366f1' }}>
                                      <span>
                                        {m.cost.toLocaleString('vi-VN')}đ/{unitLabel}
                                      </span>
                                      {m.costDisc > 0 && (
                                        <span style={{ fontSize: 9, color: '#94a3b8', marginLeft: 2 }}>
                                          (-{m.costDisc}%)
                                        </span>
                                      )}
                                      <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 400 }}>
                                        Tổng: {(m.cost * m.days).toLocaleString('vi-VN')}đ
                                      </div>
                                    </span>
                                    <span style={{ fontSize: 11, fontWeight: 600, color: '#1e293b' }}>
                                      {isApplied ? (
                                        <>
                                          <input
                                            type='number'
                                            value={sellPrice || ''}
                                            onChange={e => {
                                              const val = parseInt(e.target.value) || 0
                                              const newDisc = sellBase > 0 ? Math.round((1 - val / sellBase) * 100) : 0
                                              setDiscountTiers(prev =>
                                                prev.map((t, ti) =>
                                                  ti === tierIdx ? { ...t, discount: String(Math.max(0, newDisc)) } : t
                                                )
                                              )
                                            }}
                                            style={{
                                              width: 80,
                                              padding: '4px 6px',
                                              border: '1px solid #e2e8f0',
                                              borderRadius: 4,
                                              fontSize: 12,
                                              fontWeight: 600,
                                              textAlign: 'right'
                                            }}
                                          />
                                          <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 400 }}>
                                            Tổng: {(sellPrice * m.days).toLocaleString('vi-VN')}đ
                                            {sellDisc > 0 && (
                                              <span style={{ color: '#16a34a', marginLeft: 3 }}>(-{sellDisc}%)</span>
                                            )}
                                          </div>
                                        </>
                                      ) : (
                                        <>
                                          <span>{sellBase.toLocaleString('vi-VN')}đ</span>
                                          <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 400 }}>
                                            Tổng: {(sellBase * m.days).toLocaleString('vi-VN')}đ
                                          </div>
                                        </>
                                      )}
                                    </span>
                                    <span>
                                      <span
                                        style={{ fontSize: 11, fontWeight: 700, color: isLoss ? '#ef4444' : '#16a34a' }}
                                      >
                                        {profit > 0 ? '+' : ''}
                                        {profit.toLocaleString('vi-VN')}đ
                                      </span>
                                      {m.cost > 0 && (
                                        <div
                                          style={{
                                            fontSize: 10,
                                            fontWeight: 600,
                                            color: isLoss ? '#ef4444' : '#16a34a'
                                          }}
                                        >
                                          {profit >= 0 ? '+' : ''}
                                          {Math.round((profit / m.cost) * 100)}% so với gốc
                                        </div>
                                      )}
                                    </span>
                                    <span>
                                      {isFirst ? (
                                        <span style={{ fontSize: 10, color: '#94a3b8' }}>Giá gốc</span>
                                      ) : isApplied ? (
                                        <button
                                          type='button'
                                          onClick={() => removeMilestone(m.days)}
                                          style={{
                                            fontSize: 10,
                                            padding: '2px 8px',
                                            borderRadius: 4,
                                            border: '1px solid #fecaca',
                                            background: '#fef2f2',
                                            cursor: 'pointer',
                                            color: '#ef4444',
                                            fontWeight: 600
                                          }}
                                        >
                                          Bỏ
                                        </button>
                                      ) : (
                                        <button
                                          type='button'
                                          onClick={() => applyMilestone(m)}
                                          style={{
                                            fontSize: 10,
                                            padding: '2px 8px',
                                            borderRadius: 4,
                                            border: '1px solid #bbf7d0',
                                            background: '#f0fdf4',
                                            cursor: 'pointer',
                                            color: '#16a34a',
                                            fontWeight: 600
                                          }}
                                        >
                                          Áp dụng
                                        </button>
                                      )}
                                    </span>
                                  </div>
                                )
                              })}
                            </div>
                          )
                        })()}

                        {discountTiers.length > 0 &&
                          (() => {
                            const unitLabel = timeUnit === 'month' ? 'tháng' : 'ngày'
                            const sellBase = parseFloat(pricePerUnit) || 0
                            const costBase = parseFloat(costPerUnit) || 0
                            const supplierTiers = selectedProduct?.provider_discount_tiers || []

                            // Helper: tìm giá nhập tại mốc ngày
                            const getCostAt = (days: number) => {
                              for (const st of supplierTiers) {
                                const sMin = parseInt(st.min as any) || 0
                                const sMax = parseInt(st.max as any) || Infinity
                                const stPrice = (st as any).price ? parseFloat((st as any).price) : 0
                                const sDisc = parseFloat(st.discount as any) || 0
                                if (days >= sMin && days <= sMax && (sDisc > 0 || stPrice > 0)) {
                                  return stPrice > 0 ? stPrice : Math.round(costBase * (1 - sDisc / 100) * 100) / 100
                                }
                              }
                              return costBase
                            }

                            return (
                              <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
                                <div
                                  style={{
                                    display: 'grid',
                                    gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr 1fr 32px',
                                    gap: 2,
                                    background: '#f8fafc',
                                    padding: '5px 8px',
                                    fontSize: '10px',
                                    fontWeight: 600,
                                    color: '#64748b'
                                  }}
                                >
                                  <span>Từ ({unitLabel})</span>
                                  <span>Đến ({unitLabel})</span>
                                  <span>Giảm giá (%)</span>
                                  <span>Bán/{unitLabel}</span>
                                  <span>Gốc/{unitLabel}</span>
                                  <span>Lợi nhuận</span>
                                  <span></span>
                                </div>
                                {discountTiers.map((tier, idx) => {
                                  const disc = parseInt(tier.discount) || 0
                                  const sellAfter =
                                    sellBase > 0 && disc > 0 ? Math.round(sellBase * (1 - disc / 100)) : sellBase
                                  const minDays = parseInt(tier.min) || 1
                                  const costAt = getCostAt(minDays)
                                  const profit = sellAfter > 0 && costAt > 0 ? sellAfter - costAt : 0
                                  const isLoss = profit < 0

                                  return (
                                    <ChildDiscountTierRow
                                      key={idx}
                                      tier={tier}
                                      idx={idx}
                                      sellBase={sellBase}
                                      costAt={costAt}
                                      profit={profit}
                                      isLoss={isLoss}
                                      onUpdate={(i, tier) =>
                                        setDiscountTiers(prev => prev.map((t, j) => (j === i ? tier : t)))
                                      }
                                      onRemove={i => setDiscountTiers(prev => prev.filter((_, j) => j !== i))}
                                    />
                                  )
                                })}
                              </div>
                            )
                          })()}

                        {/* Giải thích cho admin */}
                        {discountTiers.length > 0 && (
                          <div style={{ marginTop: 6, fontSize: '10.5px', color: '#64748b', lineHeight: 1.5 }}>
                            <strong>Cách đọc:</strong> "Bán/ng" là giá bạn bán cho khách sau giảm. "Nhập/ng" là giá bạn
                            phải trả site mẹ.
                            <strong style={{ color: '#16a34a' }}> Lãi xanh = có lời</strong>,
                            <strong style={{ color: '#ef4444' }}> lãi đỏ = bạn đang bù lỗ!</strong>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Bảng giá fixed */}
                  {pricingMode === 'fixed' &&
                    priceFields.length > 0 &&
                    (() => {
                      // Mẹ per_unit → giá nhập = costPerUnit × số ngày (tính realtime)
                      const parentIsPerUnit = parentPricingMode === 'per_unit'
                      const parentCostPerDay = parseInt(costPerUnit) || 0
                      const unitLabel = timeUnit === 'month' ? 'tháng' : 'ngày'

                      // Đồng bộ giá nhập từ supplier product
                      const applySyncData = (product: any) => {
                        // Sync custom_fields (tuỳ chọn khi mua) từ site mẹ
                        if (product?.custom_fields && Array.isArray(product.custom_fields)) {
                          setPurchaseOptions(
                            product.custom_fields.map((f: any) => ({
                              key: f.key || '',
                              param_name: f.param_name || f.key || '',
                              label: f.label || '',
                              type: f.type || 'select',
                              required: f.required || false,
                              default: f.default || '',
                              options: f.options || [{ value: '', label: '' }]
                            }))
                          )
                        }
                        if (product?.allow_custom_auth !== undefined) {
                          setAllowCustomAuth(!!product.allow_custom_auth)
                        }

                        // Sync renewal settings từ site mẹ vào state + selectedProduct
                        if (product) {
                          if (product.renewable !== undefined) {
                            setRenewable(!!product.renewable)
                            setParentRenewable(!!product.renewable)
                          }

                          if (product.renewal_duration) setRenewalDuration(product.renewal_duration)
                          if (product.allow_expired_renew !== undefined) setAllowExpiredRenew(!!product.allow_expired_renew)
                          setCheckedProduct((prev: any) => ({
                            ...prev,
                            renewable: product.renewable,
                            renewal_duration: product.renewal_duration,
                            allow_expired_renew: product.allow_expired_renew,
                          }))
                        }
                        if (parentIsPerUnit && product?.price_per_unit) {
                          const newCostPerDay = parseInt(product.price_per_unit) || 0

                          setCostPerUnit(String(newCostPerDay))
                          setPriceFields(prev =>
                            prev.map(p => ({
                              ...p,
                              cost: String((parseInt(p.key) || 0) * newCostPerDay)
                            }))
                          )
                          setSyncStatus('done')
                        } else if (product?.provider_prices) {
                          const sp = product.provider_prices
                          setPriceFields(prev => {
                            // Cập nhật cost cho mốc đã có
                            const updated = prev.map(p => ({
                              ...p,
                              cost: String(sp[p.key] || p.cost || '')
                            }))
                            // Thêm mốc mới từ site mẹ mà local chưa có
                            const existingKeys = new Set(prev.map(p => p.key))
                            const newFields = Object.entries(sp)
                              .filter(([key]) => !existingKeys.has(key))
                              .map(([key, cost]) => ({ key, value: '', cost: String(cost) }))
                            return [...updated, ...newFields]
                          })
                          setSyncStatus('done')
                        } else {
                          setSyncStatus('error')
                        }
                        setTimeout(() => setSyncStatus('idle'), 2000)
                      }

                      const handleSyncCost = () => {
                        setSyncStatus('loading')
                        // Luôn gọi API site mẹ lấy giá mới nhất
                        if (selectedSupplierCode) {
                          checkProductMutation.mutate(selectedSupplierCode, {
                            onSuccess: data => {
                              setCheckedProduct(data)
                              setSelectedSupplierId(data.supplier_id)
                              applySyncData(data)
                            },
                            onError: () => {
                              setSyncStatus('error')
                              setTimeout(() => setSyncStatus('idle'), 2000)
                            }
                          })
                        } else {
                          setSyncStatus('error')
                          setTimeout(() => setSyncStatus('idle'), 2000)
                        }
                      }

                      return (
                        <div>
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              marginBottom: 4
                            }}
                          >
                            <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
                              Bảng giá mốc cố định
                            </div>
                            <button
                              type='button'
                              onClick={handleSyncCost}
                              disabled={syncStatus === 'loading'}
                              style={{
                                fontSize: '11.5px',
                                padding: '4px 10px',
                                borderRadius: 6,
                                border: '1px solid',
                                cursor: syncStatus === 'loading' ? 'wait' : 'pointer',
                                fontWeight: 600,
                                background:
                                  syncStatus === 'done' ? '#f0fdf4' : syncStatus === 'error' ? '#fef2f2' : '#eff6ff',
                                color:
                                  syncStatus === 'done' ? '#16a34a' : syncStatus === 'error' ? '#ef4444' : '#2563eb',
                                borderColor:
                                  syncStatus === 'done' ? '#bbf7d0' : syncStatus === 'error' ? '#fecaca' : '#3b82f6'
                              }}
                            >
                              {syncStatus === 'loading' ? (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                  <RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} /> Đang đồng
                                  bộ...
                                </span>
                              ) : syncStatus === 'done' ? (
                                '✓ Đã đồng bộ'
                              ) : syncStatus === 'error' ? (
                                '✗ Không tìm thấy giá'
                              ) : (
                                '↻ Đồng bộ giá & cấu hình'
                              )}
                            </button>
                          </div>
                          {parentIsPerUnit && parentCostPerDay > 0 && (
                            <div
                              style={{
                                fontSize: '11.5px',
                                color: '#3b82f6',
                                background: '#eff6ff',
                                padding: '6px 10px',
                                borderRadius: 8,
                                marginBottom: 8
                              }}
                            >
                              Site mẹ tính giá tự do:{' '}
                              <strong>
                                {parentCostPerDay.toLocaleString('vi-VN')}đ/{unitLabel}
                              </strong>{' '}
                              → Giá nhập mỗi mốc = đơn giá × số {unitLabel}
                            </div>
                          )}
                          <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
                            {/* Header */}
                            <div
                              style={{
                                display: 'grid',
                                gridTemplateColumns: '100px 1fr 1fr 1fr',
                                background: '#f8fafc',
                                padding: '8px 12px',
                                fontSize: '12px',
                                fontWeight: 600,
                                color: '#64748b',
                                borderBottom: '1px solid #e2e8f0'
                              }}
                            >
                              <span>Số {unitLabel}</span>
                              <span>Giá nhập{parentIsPerUnit ? ' (tự tính)' : ' (site mẹ)'}</span>
                              <span>Giá bán (của bạn)</span>
                              <span>Lợi nhuận</span>
                            </div>
                            {/* Rows */}
                            {priceFields.map((field, idx) => {
                              const days = parseInt(field.key) || 0
                              // Ưu tiên field.cost (đã đồng bộ/lưu), fallback tính từ đơn giá mẹ
                              const cost = parseInt(field.cost) || (parentIsPerUnit ? parentCostPerDay * days : 0)
                              const sell = parseInt(field.value) || 0
                              const profit = sell - cost
                              const profitPct = cost > 0 ? Math.round((profit / cost) * 100) : 0

                              return (
                                <div
                                  key={idx}
                                  style={{
                                    display: 'grid',
                                    gridTemplateColumns: '100px 1fr 1fr 1fr',
                                    alignItems: 'center',
                                    padding: '8px 12px',
                                    borderBottom: idx < priceFields.length - 1 ? '1px solid #f1f5f9' : 'none'
                                  }}
                                >
                                  {/* Số ngày — editable chỉ khi mẹ per_unit (con tự tạo mốc) */}
                                  {parentIsPerUnit ? (
                                    <TextField
                                      size='small'
                                      value={field.key}
                                      onChange={e => {
                                        const raw = e.target.value.replace(/[^0-9]/g, '')

                                        setPriceFields(prev => prev.map((p, i) => (i === idx ? { ...p, key: raw } : p)))
                                      }}
                                      placeholder='Nhập'
                                      sx={{
                                        '& input': { fontSize: '13px', padding: '6px 10px', fontWeight: 600 },
                                        width: 70
                                      }}
                                    />
                                  ) : (
                                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
                                      {getDurationLabel(field.key)}
                                    </span>
                                  )}
                                  {/* Giá nhập */}
                                  <span
                                    style={{
                                      fontSize: '13px',
                                      fontWeight: cost > 0 ? 600 : 400,
                                      color: cost > 0 ? '#1e293b' : '#cbd5e1'
                                    }}
                                  >
                                    {cost > 0
                                      ? `${cost.toLocaleString('vi-VN')}đ`
                                      : parentIsPerUnit && days === 0
                                        ? 'Nhập số ngày'
                                        : '—'}
                                  </span>
                                  {/* Giá bán */}
                                  <TextField
                                    size='small'
                                    value={field.value ? parseInt(field.value).toLocaleString('vi-VN') : ''}
                                    onChange={e => {
                                      const raw = e.target.value.replace(/[^0-9]/g, '')

                                      setPriceFields(prev => prev.map((p, i) => (i === idx ? { ...p, value: raw } : p)))
                                    }}
                                    placeholder='Nhập giá bán'
                                    sx={{ '& input': { fontSize: '13px', padding: '6px 10px' } }}
                                    error={!!field.value && cost > 0 && sell <= cost}
                                  />
                                  {/* Lợi nhuận */}
                                  {sell > 0 && cost > 0 ? (
                                    <div
                                      style={{
                                        padding: '3px 8px',
                                        borderRadius: 6,
                                        fontSize: '12px',
                                        fontWeight: 700,
                                        background: profit > 0 ? '#f0fdf4' : '#fef2f2',
                                        color: profit > 0 ? '#16a34a' : '#ef4444',
                                        border: `1px solid ${profit > 0 ? '#bbf7d0' : '#fecaca'}`
                                      }}
                                    >
                                      {profit > 0 ? '+' : ''}
                                      {profit.toLocaleString('vi-VN')}đ
                                      <span
                                        style={{ fontSize: '10.5px', fontWeight: 500, marginLeft: 3, opacity: 0.8 }}
                                      >
                                        ({profitPct}%)
                                      </span>
                                    </div>
                                  ) : (
                                    <span style={{ fontSize: '13px', color: '#94a3b8' }}>—</span>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: 6 }}>
                            {parentIsPerUnit
                              ? `Giá nhập tự tính: ${parentCostPerDay.toLocaleString('vi-VN')}đ/${unitLabel} × số ${unitLabel}. Bạn tự đặt giá bán cho từng mốc.`
                              : 'Giá nhập lấy tự động từ site mẹ. Phần chênh lệch là lợi nhuận của bạn.'}
                          </div>
                          {/* Thêm/xóa mốc — chỉ khi mẹ per_unit (con tự tạo mốc), mẹ fixed thì khóa */}
                          {parentIsPerUnit && (
                            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                              <button
                                type='button'
                                onClick={() => setPriceFields(prev => [...prev, { key: '', value: '', cost: '' }])}
                                style={{
                                  fontSize: '12px',
                                  padding: '4px 10px',
                                  borderRadius: 6,
                                  border: '1px solid #e2e8f0',
                                  background: '#fff',
                                  cursor: 'pointer',
                                  color: '#475569'
                                }}
                              >
                                + Thêm mốc
                              </button>
                              {priceFields.length > 1 && (
                                <button
                                  type='button'
                                  onClick={() => setPriceFields(prev => prev.slice(0, -1))}
                                  style={{
                                    fontSize: '12px',
                                    padding: '4px 10px',
                                    borderRadius: 6,
                                    border: '1px solid #fecaca',
                                    background: '#fff',
                                    cursor: 'pointer',
                                    color: '#ef4444'
                                  }}
                                >
                                  − Xóa mốc cuối
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })()}

                  {/* Thông tin SP */}
                  <Grid2 container spacing={1.5}>
                    <Grid2 size={{ xs: 4 }}>
                      <Controller
                        name='type'
                        control={control}
                        render={({ field }) => (
                          <CustomTextField {...field} fullWidth select label='Loại'>
                            <MenuItem value='0'>Static</MenuItem>
                            <MenuItem value='1'>Rotating</MenuItem>
                          </CustomTextField>
                        )}
                      />
                    </Grid2>
                    <Grid2 size={{ xs: 4 }}>
                      <Controller
                        name='ip_version'
                        control={control}
                        render={({ field }) => (
                          <CustomTextField {...field} fullWidth select label='IP Version'>
                            <MenuItem value='ipv4'>IPv4</MenuItem>
                            <MenuItem value='ipv6'>IPv6</MenuItem>
                          </CustomTextField>
                        )}
                      />
                    </Grid2>
                    <Grid2 size={{ xs: 4 }}>
                      <Controller
                        name='proxy_type'
                        control={control}
                        render={({ field }) => (
                          <CustomTextField {...field} fullWidth select label='Loại proxy'>
                            <MenuItem value='residential'>Residential</MenuItem>
                            <MenuItem value='datacenter'>Datacenter</MenuItem>
                          </CustomTextField>
                        )}
                      />
                    </Grid2>
                  </Grid2>

                  {/* Country */}
                  <Controller
                    name='country'
                    control={control}
                    render={({ field }) => (
                      <CustomTextField
                        {...field}
                        fullWidth
                        select
                        label='Quốc gia'
                        error={!!errors.country}
                        helperText={errors.country?.message as string}
                      >
                        <MenuItem value=''>
                          <em>— Chọn —</em>
                        </MenuItem>
                        {(countries || []).map((c: any) => (
                          <MenuItem key={c.code} value={c.code.toLowerCase()}>
                            <img
                              src={`https://flagcdn.com/w20/${c.code.toLowerCase()}.png`}
                              style={{ width: 20, height: 15, marginRight: 8, verticalAlign: 'middle' }}
                            />
                            {c.name}
                          </MenuItem>
                        ))}
                      </CustomTextField>
                    )}
                  />

                  {/* Proxy attribute fields */}
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b', marginBottom: 8 }}>
                      Thuộc tính proxy
                    </div>
                    <Grid2 container spacing={1.5}>
                      <Grid2 size={{ xs: 6 }}>
                        <Controller
                          name='auth_type'
                          control={control}
                          render={({ field }) => (
                            <CustomTextField
                              {...field}
                              fullWidth
                              select
                              label='Xác thực'
                              helperText={(() => {
                                const parentAuth = checkedProduct?.auth_type
                                if (!parentAuth)
                                  return field.value === 'ip_whitelist'
                                    ? 'Khách hàng bắt buộc nhập IP trước khi mua'
                                    : field.value === 'both'
                                      ? 'Khách chọn User:Pass hoặc IP Whitelist'
                                      : undefined
                                const parentLabel =
                                  parentAuth === 'ip_whitelist'
                                    ? 'Bắt buộc nhập IP Whitelist'
                                    : parentAuth === 'both'
                                      ? 'User:Pass hoặc IP Whitelist'
                                      : 'User:Pass'
                                if (parentAuth !== field.value)
                                  return `⚠ Site mẹ yêu cầu: ${parentLabel} — bạn đang chọn khác!`
                                return `✓ Khớp site mẹ: ${parentLabel}`
                              })()}
                              sx={(() => {
                                const parentAuth = checkedProduct?.auth_type
                                if (parentAuth && parentAuth !== field.value)
                                  return { '& .MuiFormHelperText-root': { color: '#dc2626', fontWeight: 600 } } as any
                                if (parentAuth && parentAuth === field.value)
                                  return { '& .MuiFormHelperText-root': { color: '#16a34a' } } as any
                                if (field.value === 'ip_whitelist')
                                  return { '& .MuiFormHelperText-root': { color: '#6366f1' } } as any
                                return {} as any
                              })()}
                            >
                              <MenuItem value=''>
                                <em>— Không chọn —</em>
                              </MenuItem>
                              <MenuItem value='userpass'>User:Pass</MenuItem>
                              <MenuItem value='ip_whitelist'>IP Whitelist</MenuItem>
                              <MenuItem value='both'>Cả hai</MenuItem>
                            </CustomTextField>
                          )}
                        />
                      </Grid2>

                      {/* User:Pass mode — cho admin chọn */}
                      {(watchAll.auth_type === 'userpass' || watchAll.auth_type === 'both') && (
                        <Grid2 size={{ xs: 12 }}>
                          <div
                            style={{
                              border: '1px solid #e2e8f0',
                              borderRadius: 10,
                              padding: '10px 14px',
                              background: '#fafbfc'
                            }}
                          >
                            <div style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>
                              User:Pass cho khách hàng
                            </div>
                            <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                              <button
                                type='button'
                                onClick={() => setAllowCustomAuth(false)}
                                style={{
                                  padding: '5px 12px',
                                  fontSize: '12px',
                                  fontWeight: 600,
                                  borderRadius: 7,
                                  border: '1.5px solid',
                                  cursor: 'pointer',
                                  background: !allowCustomAuth ? '#1e293b' : '#fff',
                                  color: !allowCustomAuth ? '#fff' : '#64748b',
                                  borderColor: !allowCustomAuth ? '#1e293b' : '#e2e8f0'
                                }}
                              >
                                Random tự động
                              </button>
                              <button
                                type='button'
                                onClick={() => setAllowCustomAuth(true)}
                                style={{
                                  padding: '5px 12px',
                                  fontSize: '12px',
                                  fontWeight: 600,
                                  borderRadius: 7,
                                  border: '1.5px solid',
                                  cursor: 'pointer',
                                  background: allowCustomAuth ? '#1e293b' : '#fff',
                                  color: allowCustomAuth ? '#fff' : '#64748b',
                                  borderColor: allowCustomAuth ? '#1e293b' : '#e2e8f0'
                                }}
                              >
                                Khách tự nhập
                              </button>
                            </div>
                            <div
                              style={{
                                padding: '6px 10px',
                                borderRadius: 8,
                                fontSize: '11.5px',
                                border: '1px solid',
                                background: allowCustomAuth ? '#eff6ff' : '#f0fdf4',
                                borderColor: allowCustomAuth ? '#bfdbfe' : '#bbf7d0'
                              }}
                            >
                              {allowCustomAuth ? (
                                <>
                                  <strong style={{ color: '#1e40af' }}>Khách sẽ thấy:</strong> 2 ô nhập Username +
                                  Password
                                </>
                              ) : (
                                <>
                                  <strong style={{ color: '#166534' }}>Khách sẽ thấy:</strong> 🔑 User:Pass tạo tự động
                                  sau khi mua
                                </>
                              )}
                            </div>
                          </div>
                        </Grid2>
                      )}

                      <Grid2 size={{ xs: 6 }}>
                        <Controller
                          name='bandwidth'
                          control={control}
                          render={({ field }) => (
                            <CustomTextField {...field} fullWidth label='Băng thông' placeholder='VD: unlimited, 1GB' />
                          )}
                        />
                      </Grid2>
                      <Grid2 size={{ xs: 6 }}>
                        <Controller
                          name='request_limit'
                          control={control}
                          render={({ field }) => (
                            <CustomTextField
                              {...field}
                              fullWidth
                              label='Giới hạn request'
                              placeholder='VD: unlimited'
                            />
                          )}
                        />
                      </Grid2>
                      <Grid2 size={{ xs: 6 }}>
                        <Controller
                          name='concurrent_connections'
                          control={control}
                          render={({ field }) => (
                            <CustomTextField
                              {...field}
                              fullWidth
                              type='number'
                              label='Kết nối đồng thời'
                              placeholder='VD: 100'
                            />
                          )}
                        />
                      </Grid2>
                      {/* Rotating-only fields */}
                      {watchAll.type === '1' && (
                        <>
                          <Grid2 size={{ xs: 4 }}>
                            <Controller
                              name='rotation_type'
                              control={control}
                              render={({ field }) => (
                                <CustomTextField {...field} fullWidth select label='Kiểu xoay'>
                                  <MenuItem value=''>
                                    <em>— Chưa chọn —</em>
                                  </MenuItem>
                                  <MenuItem value='per_request'>Đổi IP mỗi request</MenuItem>
                                  <MenuItem value='sticky'>Giữ IP cố định (Sticky)</MenuItem>
                                  <MenuItem value='time_based'>Đổi IP theo thời gian</MenuItem>
                                </CustomTextField>
                              )}
                            />
                          </Grid2>
                          <Grid2 size={{ xs: 4 }}>
                            <Controller
                              name='rotation_interval'
                              control={control}
                              render={({ field: { value, onChange, ...field } }) => {
                                const presets = ['', '30', '60', '120', '300', '600', '1800', '3600']
                                const strVal = String(value || '')
                                const isCustom = strVal && !presets.includes(strVal)
                                const formatSeconds = (s: number) =>
                                  !s || isNaN(s)
                                    ? 'Tùy chỉnh'
                                    : s >= 3600
                                      ? Math.floor(s / 3600) + ' giờ'
                                      : s >= 60
                                        ? Math.floor(s / 60) + ' phút'
                                        : s + ' giây'

                                return (
                                  <CustomTextField
                                    {...field}
                                    value={strVal}
                                    onChange={(e: any) => onChange(e.target.value === '' ? '' : e.target.value)}
                                    fullWidth
                                    select
                                    label='Tự động xoay IP'
                                  >
                                    <MenuItem value=''>
                                      <em>Tắt</em>
                                    </MenuItem>
                                    <MenuItem value='30'>30 giây</MenuItem>
                                    <MenuItem value='60'>1 phút</MenuItem>
                                    <MenuItem value='120'>2 phút</MenuItem>
                                    <MenuItem value='300'>5 phút</MenuItem>
                                    <MenuItem value='600'>10 phút</MenuItem>
                                    <MenuItem value='1800'>30 phút</MenuItem>
                                    <MenuItem value='3600'>1 giờ</MenuItem>
                                    {isCustom && <MenuItem value={strVal}>{formatSeconds(Number(strVal))}</MenuItem>}
                                  </CustomTextField>
                                )
                              }}
                            />
                          </Grid2>
                          <Grid2 size={{ xs: 4 }}>
                            <Controller
                              name='pool_size'
                              control={control}
                              render={({ field }) => (
                                <CustomTextField {...field} fullWidth label='Pool size' placeholder='VD: 10,000+' />
                              )}
                            />
                          </Grid2>
                        </>
                      )}
                    </Grid2>
                  </div>

                  {/* Tuỳ chọn mua hàng — Custom fields */}
                  <CollapsibleSection
                    title='Tuỳ chọn mua hàng'
                    icon={ShoppingCart}
                    iconColor='#7c3aed'
                    iconBg='#f5f3ff'
                    border='1px solid #e2e8f0'
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 10
                      }}
                    >
                      <span style={{ fontWeight: 600, fontSize: 13 }}>Danh sách tuỳ chọn</span>
                      <Button
                        size='small'
                        variant='outlined'
                        onClick={() =>
                          setPurchaseOptions(prev => [
                            ...prev,
                            {
                              key: '',
                              param_name: '',
                              label: '',
                              type: 'select' as const,
                              required: true,
                              default: '',
                              options: [{ value: '', label: '' }]
                            }
                          ])
                        }
                        sx={{ fontSize: '12px', textTransform: 'none' }}
                      >
                        + Thêm tuỳ chọn
                      </Button>
                    </div>

                    {purchaseOptions.length === 0 && (
                      <p style={{ color: '#94a3b8', fontSize: 12, textAlign: 'center', padding: '8px 0' }}>
                        Chưa có tuỳ chọn. Khách mua không cần chọn thêm gì.
                      </p>
                    )}

                    {purchaseOptions.map((opt, optIdx) => (
                      <div
                        key={optIdx}
                        style={{
                          background: '#f8fafc',
                          borderRadius: 8,
                          padding: 10,
                          marginBottom: 10,
                          position: 'relative'
                        }}
                      >
                        <button
                          type='button'
                          onClick={() => setPurchaseOptions(prev => prev.filter((_, i) => i !== optIdx))}
                          style={{
                            position: 'absolute',
                            top: 6,
                            right: 8,
                            background: 'none',
                            border: 'none',
                            color: '#ef4444',
                            cursor: 'pointer',
                            fontSize: 14,
                            fontWeight: 700
                          }}
                        >
                          ✕
                        </button>

                        <Grid2 container spacing={1} sx={{ mb: 1 }}>
                          <Grid2 size={{ xs: 3 }}>
                            <TextField
                              size='small'
                              fullWidth
                              label='Key nội bộ'
                              placeholder='nha_mang'
                              value={opt.key}
                              onChange={e => {
                                const v = e.target.value.replace(/[^a-zA-Z0-9_]/g, '')
                                setPurchaseOptions(prev => prev.map((o, i) => (i === optIdx ? { ...o, key: v } : o)))
                              }}
                            />
                          </Grid2>
                          <Grid2 size={{ xs: 3 }}>
                            <TextField
                              size='small'
                              fullWidth
                              label='Param gốc (ẩn)'
                              placeholder='loaiproxy'
                              value={opt.param_name}
                              onChange={e => {
                                const v = e.target.value.replace(/[^a-zA-Z0-9_]/g, '')
                                setPurchaseOptions(prev =>
                                  prev.map((o, i) => (i === optIdx ? { ...o, param_name: v } : o))
                                )
                              }}
                            />
                          </Grid2>
                          <Grid2 size={{ xs: 3 }}>
                            <TextField
                              size='small'
                              fullWidth
                              label='Label hiển thị'
                              placeholder='Nhà mạng'
                              value={opt.label}
                              onChange={e =>
                                setPurchaseOptions(prev =>
                                  prev.map((o, i) => (i === optIdx ? { ...o, label: e.target.value } : o))
                                )
                              }
                            />
                          </Grid2>
                          <Grid2 size={{ xs: 1.5 }}>
                            <TextField
                              size='small'
                              fullWidth
                              select
                              label='Loại'
                              value={opt.type || 'select'}
                              onChange={e =>
                                setPurchaseOptions(prev =>
                                  prev.map((o, i) => (i === optIdx ? { ...o, type: e.target.value as any } : o))
                                )
                              }
                            >
                              <MenuItem value='select'>Select</MenuItem>
                              <MenuItem value='text'>Text</MenuItem>
                              <MenuItem value='number'>Number</MenuItem>
                            </TextField>
                          </Grid2>
                          <Grid2 size={{ xs: 1.5 }}>
                            <TextField
                              size='small'
                              fullWidth
                              select
                              label='Bắt buộc'
                              value={opt.required ? 'true' : 'false'}
                              onChange={e =>
                                setPurchaseOptions(prev =>
                                  prev.map((o, i) => (i === optIdx ? { ...o, required: e.target.value === 'true' } : o))
                                )
                              }
                            >
                              <MenuItem value='true'>Có</MenuItem>
                              <MenuItem value='false'>Không</MenuItem>
                            </TextField>
                          </Grid2>
                        </Grid2>

                        {/* Options — chỉ cho type=select */}
                        {(opt.type || 'select') === 'select' && (
                          <>
                            <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>
                              Giá trị:
                            </div>
                            {opt.options.map((option, valIdx) => (
                              <div
                                key={valIdx}
                                style={{ display: 'flex', gap: 6, marginBottom: 4, alignItems: 'center' }}
                              >
                                <TextField
                                  size='small'
                                  placeholder='Value'
                                  value={option.value}
                                  sx={{ flex: 1 }}
                                  onChange={e => {
                                    const newOpts = [...opt.options]
                                    newOpts[valIdx] = { ...newOpts[valIdx], value: e.target.value }
                                    if (!newOpts[valIdx].label) newOpts[valIdx].label = e.target.value
                                    setPurchaseOptions(prev =>
                                      prev.map((o, i) => (i === optIdx ? { ...o, options: newOpts } : o))
                                    )
                                  }}
                                />
                                <TextField
                                  size='small'
                                  placeholder='Label'
                                  value={option.label}
                                  sx={{ flex: 1 }}
                                  onChange={e => {
                                    const newOpts = [...opt.options]
                                    newOpts[valIdx] = { ...newOpts[valIdx], label: e.target.value }
                                    setPurchaseOptions(prev =>
                                      prev.map((o, i) => (i === optIdx ? { ...o, options: newOpts } : o))
                                    )
                                  }}
                                />
                                <button
                                  type='button'
                                  onClick={() => {
                                    if (opt.options.length <= 1) return
                                    setPurchaseOptions(prev =>
                                      prev.map((o, i) =>
                                        i === optIdx ? { ...o, options: o.options.filter((_, j) => j !== valIdx) } : o
                                      )
                                    )
                                  }}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    color: opt.options.length <= 1 ? '#cbd5e1' : '#ef4444',
                                    cursor: opt.options.length <= 1 ? 'default' : 'pointer',
                                    fontSize: 13
                                  }}
                                >
                                  ✕
                                </button>
                              </div>
                            ))}
                            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                              <Button
                                size='small'
                                variant='text'
                                sx={{ fontSize: 11 }}
                                onClick={() => {
                                  const newOpts = [...opt.options, { value: '', label: '' }]
                                  setPurchaseOptions(prev =>
                                    prev.map((o, i) => (i === optIdx ? { ...o, options: newOpts } : o))
                                  )
                                }}
                              >
                                + Thêm giá trị
                              </Button>
                              <TextField
                                size='small'
                                select
                                label='Mặc định'
                                sx={{ minWidth: 100 }}
                                value={opt.default || opt.options[0]?.value || ''}
                                onChange={e =>
                                  setPurchaseOptions(prev =>
                                    prev.map((o, i) => (i === optIdx ? { ...o, default: e.target.value } : o))
                                  )
                                }
                              >
                                {opt.options
                                  .filter(o => o.value)
                                  .map(o => (
                                    <MenuItem key={o.value} value={o.value}>
                                      {o.label || o.value}
                                    </MenuItem>
                                  ))}
                              </TextField>
                            </div>
                          </>
                        )}

                        {/* Default cho text/number */}
                        {(opt.type === 'text' || opt.type === 'number') && (
                          <TextField
                            size='small'
                            fullWidth
                            label='Giá trị mặc định'
                            placeholder={opt.type === 'number' ? '300' : 'VD: giá trị mặc định'}
                            type={opt.type}
                            value={opt.default}
                            onChange={e =>
                              setPurchaseOptions(prev =>
                                prev.map((o, i) => (i === optIdx ? { ...o, default: e.target.value } : o))
                              )
                            }
                            sx={{ mt: 1 }}
                          />
                        )}
                      </div>
                    ))}
                  </CollapsibleSection>

                  {/* Gia hạn */}
                  <div
                    style={{
                      border: '1px solid #e2e8f0',
                      borderRadius: 10,
                      padding: '12px 14px',
                      background: '#fafafa'
                    }}
                  >
                    {/* Header + toggle */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 7,
                            background: renewable ? '#ecfdf5' : '#f1f5f9',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <RefreshCw size={14} color={renewable ? '#10b981' : '#94a3b8'} />
                        </div>
                        <span style={{ fontWeight: 600, fontSize: 13, color: '#1e293b' }}>Cho phép gia hạn</span>
                      </div>
                      <Switch
                        size='small'
                        checked={renewable}
                        onChange={e => setRenewable(e.target.checked)}
                      />
                    </div>

                    {/* Trạng thái NCC */}
                    {parentRenewable !== null && (
                      <div
                        style={{
                          marginTop: 8,
                          padding: '5px 10px',
                          borderRadius: 7,
                          fontSize: '11px',
                          background: parentRenewable ? '#eff6ff' : '#fef2f2',
                          border: `1px solid ${parentRenewable ? '#bfdbfe' : '#fecaca'}`,
                          color: parentRenewable ? '#1e40af' : '#991b1b'
                        }}
                      >
                        NCC: {parentRenewable ? 'Hỗ trợ gia hạn' : 'Không hỗ trợ gia hạn'}
                      </div>
                    )}

                    {/* Cảnh báo nếu bật mà NCC không hỗ trợ */}
                    {renewable && parentRenewable === false && (
                      <div
                        style={{
                          marginTop: 6,
                          padding: '5px 10px',
                          borderRadius: 7,
                          fontSize: '11px',
                          background: '#fffbeb',
                          border: '1px solid #fde68a',
                          color: '#92400e'
                        }}
                      >
                        NCC chưa bật gia hạn — user gia hạn sẽ bị lỗi
                      </div>
                    )}

                    {renewable && (
                      <>
                        {/* Mode gia hạn */}
                        <div style={{ marginTop: 10 }}>
                          <div style={{ fontSize: '11.5px', fontWeight: 600, color: '#475569', marginBottom: 6 }}>
                            Thời hạn gia hạn
                          </div>
                          <div style={{ display: 'flex', gap: 8 }}>
                            {[
                              { value: 'original', label: 'Theo chu kỳ gốc', desc: 'Tự động dùng thời hạn lúc mua' },
                              { value: 'ncc', label: 'Tuỳ chọn', desc: 'User được nhập số ngày' }
                            ].map(opt => (
                              <button
                                key={opt.value}
                                type='button'
                                onClick={() => setRenewalDuration(opt.value)}
                                style={{
                                  flex: 1,
                                  padding: '8px 10px',
                                  fontSize: '12px',
                                  fontWeight: 600,
                                  borderRadius: 8,
                                  border: '1.5px solid',
                                  cursor: 'pointer',
                                  textAlign: 'left',
                                  background: renewalDuration === opt.value ? '#f0f9ff' : '#fff',
                                  color: renewalDuration === opt.value ? '#0c4a6e' : '#64748b',
                                  borderColor: renewalDuration === opt.value ? '#7dd3fc' : '#e2e8f0'
                                }}
                              >
                                <div>{opt.label}</div>
                                <div style={{ fontSize: '10.5px', fontWeight: 400, marginTop: 2, opacity: 0.8 }}>
                                  {opt.desc}
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Gia hạn khi hết hạn */}
                        <div
                          style={{
                            marginTop: 10,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}
                        >
                          <span style={{ fontSize: '12px', color: '#475569' }}>Cho phép gia hạn khi đã hết hạn</span>
                          <Switch
                            size='small'
                            checked={allowExpiredRenew}
                            onChange={e => setAllowExpiredRenew(e.target.checked)}
                          />
                        </div>

                        {/* Giá gia hạn */}
                        <div
                          style={{
                            marginTop: 8,
                            padding: '6px 10px',
                            borderRadius: 8,
                            fontSize: '11px',
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            color: '#64748b'
                          }}
                        >
                          Giá gia hạn = giá bán sản phẩm (theo mốc thời gian đã cấu hình ở trên)
                        </div>
                      </>
                    )}
                  </div>

                  {/* Tag — chọn từ preset có màu */}
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: 6 }}>
                      Tag sản phẩm
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {PREDEFINED_TAGS.map(preset => {
                        const tags = watchTag ? watchTag.split(',').map((t: string) => t.trim()) : []
                        const isActive = tags.includes(preset)
                        const style = getTagStyle(preset)

                        return (
                          <div
                            key={preset}
                            onClick={() => toggleTag(preset)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              padding: '4px 12px',
                              borderRadius: 6,
                              cursor: 'pointer',
                              fontSize: '12px',
                              fontWeight: 600,
                              transition: 'all 0.15s ease',
                              background: isActive ? style.gradient || style.bgColor : '#f8fafc',
                              color: isActive ? style.textColor : '#64748b',
                              border: isActive ? `1px solid ${style.borderColor}` : '1px solid #e2e8f0',
                              transform: isActive ? 'scale(1.05)' : 'scale(1)'
                            }}
                          >
                            {style.icon && <span style={{ fontSize: '11px' }}>{style.icon}</span>}
                            {preset}
                          </div>
                        )
                      })}
                    </div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: 4 }}>
                      Nhấn để chọn/bỏ chọn. Có thể chọn nhiều tag.
                    </div>
                  </div>

                  {/* Cho phép mua + Min/Max */}
                  <Grid2 container spacing={1.5} alignItems='center'>
                    <Grid2 size={{ xs: 4 }}>
                      <Controller
                        name='status'
                        control={control}
                        render={({ field }) => (
                          <FormControlLabel
                            control={
                              <Switch
                                checked={field.value === 'active'}
                                onChange={e => field.onChange(e.target.checked ? 'active' : 'inactive')}
                                color='success'
                              />
                            }
                            label='Trạng thái'
                          />
                        )}
                      />
                    </Grid2>
                    <Grid2 size={{ xs: 4 }}>
                      <Controller
                        name='is_purchasable'
                        control={control}
                        render={({ field }) => (
                          <FormControlLabel
                            control={
                              <Switch
                                checked={field.value}
                                onChange={e => field.onChange(e.target.checked)}
                                color='success'
                              />
                            }
                            label='Cho phép mua'
                          />
                        )}
                      />
                    </Grid2>
                    <Grid2 size={{ xs: 4 }}>
                      <Controller
                        name='min_quantity'
                        control={control}
                        render={({ field }) => (
                          <CustomTextField
                            {...field}
                            value={field.value ?? 1}
                            onChange={e => field.onChange(e.target.value === '' ? null : Number(e.target.value))}
                            fullWidth
                            type='number'
                            label='SL tối thiểu'
                            slotProps={{ input: { inputProps: { min: 1 } } }}
                          />
                        )}
                      />
                    </Grid2>
                    <Grid2 size={{ xs: 4 }}>
                      <Controller
                        name='max_quantity'
                        control={control}
                        render={({ field }) => (
                          <CustomTextField
                            {...field}
                            value={field.value ?? 100}
                            onChange={e => field.onChange(e.target.value === '' ? null : Number(e.target.value))}
                            fullWidth
                            type='number'
                            label='SL tối đa'
                            slotProps={{ input: { inputProps: { min: 1 } } }}
                          />
                        )}
                      />
                    </Grid2>
                  </Grid2>

                  <Controller
                    name='note'
                    control={control}
                    render={({ field }) => (
                      <CustomTextField
                        {...field}
                        fullWidth
                        label='Mô tả sản phẩm'
                        placeholder='Mô tả ngắn hiển thị trên card sản phẩm...'
                        multiline
                        minRows={2}
                        maxRows={4}
                      />
                    )}
                  />

                  {/* Submit */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'flex-end',
                      gap: 8,
                      paddingTop: 8,
                      borderTop: '1px solid #f1f5f9'
                    }}
                  >
                    <Button onClick={onClose} variant='outlined' color='secondary' disabled={isPending}>
                      Hủy
                    </Button>
                    <Button
                      type='submit'
                      variant='contained'
                      disabled={isPending || (!isEditMode && !selectedSupplierId)}
                      startIcon={isPending ? <Loader2 size={16} className='animate-spin' /> : <Save size={16} />}
                      sx={{
                        background: 'var(--primary-gradient, linear-gradient(45deg, #FC4336, #F88A4B))',
                        color: 'var(--primary-contrast, #fff)',
                        '&:hover': { opacity: 0.9 }
                      }}
                    >
                      {isPending ? 'Đang lưu...' : isEditMode ? 'Cập nhật' : 'Thêm sản phẩm'}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Right: Preview */}
              <div style={{ flex: 2, position: 'sticky', top: 0, alignSelf: 'flex-start' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: 8 }}>
                  Xem trước sản phẩm
                </div>
                <div
                  style={{
                    background: 'white',
                    borderRadius: 12,
                    padding: 16,
                    border: '1px solid #e2e8f0',
                    position: 'relative',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                  }}
                >
                  {/* top gradient bar */}
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: 3,
                      background: 'var(--primary-gradient, linear-gradient(90deg, #e53e3e, #ff6b6b))',
                      borderRadius: '12px 12px 0 0'
                    }}
                  />

                  {/* Header: name + tags */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      gap: 8,
                      marginBottom: 8,
                      paddingTop: 4
                    }}
                  >
                    <div style={{ fontSize: '15px', fontWeight: 700, color: '#1e293b', lineHeight: 1.3 }}>
                      {previewName}
                      {(serviceId || watchAll.code) && (
                        <div
                          style={{
                            fontFamily: 'monospace',
                            fontSize: '11px',
                            color: '#94a3b8',
                            fontWeight: 400,
                            marginTop: 2
                          }}
                        >
                          {serviceId ? `${serviceId}#` : ''}
                          {watchAll.code || serviceData?.code || ''}
                        </div>
                      )}
                    </div>
                    {previewTags.length > 0 && (
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', flexShrink: 0 }}>
                        {previewTags.map((tag: string) => {
                          const style = getTagStyle(tag)

                          return (
                            <span
                              key={tag}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 2,
                                padding: '2px 8px',
                                borderRadius: 4,
                                fontSize: '10px',
                                fontWeight: 600,
                                background: style.gradient || style.bgColor,
                                color: style.textColor,
                                border: `1px solid ${style.borderColor}`,
                                lineHeight: 1.4
                              }}
                            >
                              {style.icon && <span style={{ fontSize: '9px' }}>{style.icon}</span>}
                              {tag}
                            </span>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  {watchAll.note && (
                    <div
                      style={{
                        fontSize: '12px',
                        color: '#64748b',
                        marginBottom: 12,
                        lineHeight: 1.4,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical' as any
                      }}
                    >
                      {watchAll.note}
                    </div>
                  )}

                  {/* Divider */}
                  <div style={{ borderTop: '1px solid #e2e8f0', margin: '8px 0' }} />

                  {/* Feature rows */}
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <FeatureRow
                      icon={MapPin}
                      iconColor='#e53e3e'
                      label='Loại IP'
                      value={`${previewType} ${previewIpVersion}${previewCountryName ? ` — ${previewCountryCode ? `\u{1F1E6}` : ''}` : ''}${previewCountryName ? ` ${previewCountryName}` : ''}`}
                    />
                    {previewCountryCode && (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          padding: '6px 4px',
                          borderBottom: '1px solid #f8fafc'
                        }}
                      >
                        <MapPin size={16} color='#e53e3e' style={{ visibility: 'hidden' }} />
                        <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
                          <img
                            src={`https://flagcdn.com/w20/${previewCountryCode.toLowerCase()}.png`}
                            style={{ width: 20, height: 15, marginRight: 4, verticalAlign: 'middle' }}
                          />
                          <span style={{ fontSize: '13px', color: '#64748b' }}>{previewCountryName}</span>
                        </div>
                      </div>
                    )}
                    <FeatureRow icon={Shield} iconColor='#6366f1' label='Hỗ trợ' value={previewProtocols} />
                    {watchAll.auth_type && (
                      <FeatureRow
                        icon={Shield}
                        iconColor='#8b5cf6'
                        label='Xác thực'
                        value={
                          getAuthTypeLabel(watchAll.auth_type) +
                          (watchAll.auth_type === 'userpass' || watchAll.auth_type === 'both'
                            ? allowCustomAuth
                              ? ' (Tự nhập)'
                              : ' (Random)'
                            : '')
                        }
                      />
                    )}
                    {watchAll.bandwidth && (
                      <FeatureRow icon={Wifi} iconColor='#0ea5e9' label='Băng thông' value={watchAll.bandwidth} />
                    )}
                    {watchAll.request_limit && (
                      <FeatureRow
                        icon={Zap}
                        iconColor='#f59e0b'
                        label='Giới hạn request'
                        value={watchAll.request_limit}
                      />
                    )}
                    {watchAll.concurrent_connections && (
                      <FeatureRow
                        icon={Users}
                        iconColor='#10b981'
                        label='Kết nối đồng thời'
                        value={watchAll.concurrent_connections}
                      />
                    )}
                    {watchAll.type === '1' && watchAll.rotation_type && (
                      <FeatureRow
                        icon={RefreshCw}
                        iconColor='#e53e3e'
                        label='Kiểu xoay'
                        value={getRotationTypeLabel(watchAll.rotation_type)}
                      />
                    )}
                    {watchAll.type === '1' &&
                      watchAll.rotation_interval &&
                      !isNaN(Number(watchAll.rotation_interval)) && (
                        <FeatureRow
                          icon={Clock}
                          iconColor='#64748b'
                          label='Tự động xoay'
                          value={
                            Number(watchAll.rotation_interval) >= 60
                              ? Math.floor(Number(watchAll.rotation_interval) / 60) + ' phút'
                              : watchAll.rotation_interval + ' giây'
                          }
                        />
                      )}
                    {watchAll.type === '1' && watchAll.pool_size && (
                      <FeatureRow icon={Globe} iconColor='#0ea5e9' label='Pool size' value={watchAll.pool_size} />
                    )}
                    <FeatureRow
                      icon={RefreshCw}
                      iconColor={renewable ? '#10b981' : '#94a3b8'}
                      label='Gia hạn'
                      value={
                        renewable
                          ? renewalDuration === 'original'
                            ? 'Hỗ trợ (theo chu kỳ gốc)'
                            : 'Hỗ trợ (tuỳ chọn thời hạn)'
                          : 'Không hỗ trợ'
                      }
                    />
                  </div>

                  {/* Divider */}
                  <div style={{ borderTop: '1px solid #e2e8f0', margin: '10px 0 8px' }} />

                  {/* Footer: price + buy button */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <span style={{ fontSize: '11px', color: '#94a3b8' }}>từ </span>
                      <span style={{ fontSize: '16px', fontWeight: 700, color: '#1e293b' }}>{previewPrice}</span>
                    </div>
                    <span
                      style={{
                        padding: '5px 12px',
                        borderRadius: 7,
                        fontSize: '11px',
                        fontWeight: 600,
                        background: watchAll.is_purchasable
                          ? 'color-mix(in srgb, var(--primary-hover) 12%, white)'
                          : '#f1f5f9',
                        color: watchAll.is_purchasable ? 'var(--primary-hover)' : '#94a3b8',
                        border: watchAll.is_purchasable
                          ? '1px solid color-mix(in srgb, var(--primary-hover) 30%, transparent)'
                          : '1px solid #e2e8f0',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4
                      }}
                    >
                      <ShoppingCart size={12} />
                      {watchAll.is_purchasable ? 'Mua ngay' : 'Tạm ngừng'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
