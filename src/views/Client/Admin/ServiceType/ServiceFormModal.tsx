'use client'

import { useState, useEffect, useMemo, memo, useCallback } from 'react'

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid2,
  Button,
  MenuItem,
  Chip,
  CircularProgress,

  Switch,
  FormControlLabel,
  Typography,
  Box,
  Alert,
  Collapse,
  IconButton,
  Checkbox
} from '@mui/material'

import { toast } from 'react-toastify'
import { X, Plus, ChevronDown, AlertCircle, Eye, Shield, Wifi, Zap, Users, MapPin, RefreshCw, Clock, Info, ShoppingCart, CheckCircle, Globe, Tag, DollarSign, Trash2 } from 'lucide-react'
import { useForm, useWatch, Controller } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'

import CustomTextField from '@/@core/components/mui/TextField'

// RichTextEditor removed — using plain textarea for note
import { TAG_CONFIG, PREDEFINED_TAGS, getTagStyle, fixCountryCode } from '@/configs/tagConfig'
import { useProviders } from '@/hooks/apis/useProviders'
import { useCountries } from '@/hooks/apis/useCountries'
import { useServiceType, useCreateServiceType, useUpdateServiceType } from '@/hooks/apis/useServiceType'
import MultiInputModal from '@/views/Client/Admin/ServiceType/MultiInputModal'
// PriceByDurationModal removed — giá theo thời gian giờ inline trong form
import CollapsibleSection from '@/views/Client/Admin/ServiceType/CollapsibleSection'
import { useBranding } from '@/app/contexts/BrandingContext'

import '@/views/Client/RotatingProxy/styles.css'

// ─── Hoist constants ngoài component — tránh tạo mới mỗi render ───
const PROTOCOLS = [
  { value: 'http', label: 'HTTP' },
  { value: 'socks5', label: 'SOCKS5' },
]

const IP_VERSION_OPTIONS = [
  { value: 'ipv4', label: 'IPV4' },
  { value: 'ipv6', label: 'IPV6' },
]

const STATIC_PLACEHOLDER = 'Proxy IPv4 dân cư Việt Nam, tốc độ cao, uptime 99.5%. Hỗ trợ HTTP/SOCKS5. Phù hợp cho SEO, social media marketing, và scraping. Băng thông không giới hạn.'
const ROTATING_PLACEHOLDER = 'Proxy xoay tự động mỗi 5-30 phút, pool 10,000+ IP Việt Nam. Phù hợp cho crawl data, multi-account, và automation. Hỗ trợ sticky session theo thời gian.'

const DEFAULT_DURATION_OPTIONS_CONST = [
  { value: '1', label: '1 ngày' }, { value: '3', label: '3 ngày' },
  { value: '7', label: '7 ngày' }, { value: '14', label: '14 ngày' },
  { value: '21', label: '21 ngày' }, { value: '30', label: '30 ngày' }
]

const LABEL_MAP_CONST: Record<string, string> = {
  '1': '1 ngày', '3': '3 ngày', '7': '7 ngày', '14': '14 ngày',
  '21': '21 ngày', '30': '30 ngày', '60': '60 ngày', '90': '90 ngày',
}

const FORM_DEFAULT_VALUES = {
  name: '',
  api_provider: '',
  cost_price: undefined as number | undefined,
  code: '',
  status: 'active',
  provider_id: '',
  type: '0',
  ip_version: 'ipv4',
  protocols: [] as string[],
  body_api: '',
  proxy_type: '',
  country: [] as string[],
  note: '',
  tag: '',
  is_purchasable: true,
  min_quantity: 1,
  max_quantity: 100,
  auth_type: '',
  bandwidth: '',
  rotation_type: '',
  rotation_interval: '',
  request_limit: '',
  concurrent_connections: undefined as number | undefined,
  pool_size: '',
  metadata_json: '',
}

// Dialog sx styles — stable references
const DIALOG_PAPER_SX = { sx: { maxHeight: { xs: '100vh', sm: '92vh' }, m: { xs: 0, sm: '16px' }, borderRadius: { xs: 0, sm: '12px' } } }
const DIALOG_SX = { '& .MuiDialog-container': { alignItems: { xs: 'stretch', sm: 'center' } } }
const DIALOG_TITLE_SX = {
  background: 'var(--primary-gradient, linear-gradient(135deg, #F88A4B 0%, #F6734B 100%))',
  color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1.5
}
const DIALOG_CONTENT_SX = { mt: 1, pb: 1, position: 'relative' as const, display: 'flex', gap: 2, overflow: 'hidden', px: { xs: 1.5, sm: 2 } }
const FORM_BOX_SX = {
  flex: 1, minWidth: 0, overflowY: 'auto' as const, pr: 1,
  '& .MuiInputLabel-root': { fontSize: '0.8rem', mb: '2px' },
  '& .MuiInputBase-sizeSmall': { fontSize: '0.85rem' },
  '& .MuiInputBase-inputSizeSmall:not(textarea)': { py: '5px !important', px: '10px !important' },
  '& .MuiFormHelperText-root': { fontSize: '0.7rem', mt: '2px' },
}
const PREVIEW_BOX_SX = { width: 380, flexShrink: 0, overflowY: 'auto' as const, borderLeft: '1px solid #e2e8f0', pl: 2, display: { xs: 'none', md: 'block' } }

const schema = yup.object({
  name: yup
    .string()
    .nullable()
    .transform(value => (value ? value.trim() : value))
    .required('Tên dịch vụ là bắt buộc')
    .min(1, 'Tên dịch vụ là bắt buộc'),
  api_provider: yup
    .string()
    .nullable()
    .transform(value => (value ? value.trim() : value)),
  cost_price: yup
    .number()
    .nullable()
    .transform((value, original) => (original === '' || original === null ? null : value))
    .typeError('Giá nhập phải là số')
    .positive('Giá nhập phải lớn hơn 0'),
  code: yup
    .string()
    .nullable()
    .transform(value => (value ? value.trim() : value)),
  status: yup.string().nullable().required('Trạng thái là bắt buộc'),
  provider_id: yup.string().nullable(),
  type: yup.string().nullable().required('Loại dịch vụ là bắt buộc'),
  ip_version: yup.string().nullable().required('IP Version là bắt buộc'),
  protocols: yup
    .array()
    .nullable()
    .of(yup.string())
    .min(1, 'Vui lòng chọn ít nhất một giao thức')
    .required('Giao thức là bắt buộc')
    .default([]),
  body_api: yup
    .string()
    .nullable()
    .transform(value => (value ? value.trim() : value))
    .test('is-valid-json', 'Body Api phải là JSON hợp lệ', function (value) {
      if (!value) return true

      try {
        JSON.parse(value)
        
return true
      } catch (error) {
        return false
      }
    }),
  proxy_type: yup.string().nullable().required('Proxy type là bắt buộc'),
  country: yup.mixed().nullable().required('Quốc gia là bắt buộc'),
  note: yup
    .string()
    .nullable()
    .transform(value => (value ? value.trim() : value)),
  tag: yup
    .string()
    .nullable()
    .transform(value => (value ? value.trim() : value)),
  is_purchasable: yup.boolean().default(true),
  min_quantity: yup.number().nullable().min(1).default(1),
  max_quantity: yup.number().nullable().min(1).default(100),
  auth_type: yup.string().nullable(),
  bandwidth: yup.string().nullable(),
  rotation_type: yup.string().nullable(),
  rotation_interval: yup.string().nullable(),
  request_limit: yup.string().nullable(),
  concurrent_connections: yup
    .number()
    .nullable()
    .transform((value, original) => (original === '' || original === null ? null : value))
    .integer('Phải là số nguyên')
    .min(0, 'Phải >= 0'),
  pool_size: yup.string().nullable(),
  metadata_json: yup.string().nullable(),
})

// ─── Helpers: format số theo chuẩn VN (1.000,50) ───
// Parse: "1.000,50" → 1000.5 | "1000.5" → 1000.5
const parseVN = (str: string): number => {
  if (!str) return 0
  const cleaned = str.replace(/\./g, '').replace(',', '.')
  return parseFloat(cleaned) || 0
}
// Format: 1000.5 → "1.000,5" | 1000 → "1.000" (chỉ hiện thập phân khi cần)
const formatVN = (num: number): string => {
  if (!num && num !== 0) return ''
  const rounded = Math.round(num * 100) / 100
  return rounded % 1 === 0
    ? rounded.toLocaleString('vi-VN')
    : rounded.toLocaleString('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 2 })
}
// Chỉ cho nhập: số, dấu chấm (ngăn nghìn), dấu phẩy (thập phân)
const sanitizeVN = (str: string): string => str.replace(/[^0-9.,]/g, '')

// ─── Discount Tier Row — lưu cả % và giá, nhập cái nào thì cái đó chính xác ───
interface DiscountTier { min: string; max: string; discount: string; price?: string }

const DiscountTierRow = memo(function DiscountTierRow({ tier, idx, basePrice, baseCost, costTiers, color, onUpdate, onRemove }: {
  tier: DiscountTier; idx: number; basePrice: number
  baseCost?: number; costTiers?: DiscountTier[]; color: string
  onUpdate: (idx: number, tier: DiscountTier) => void
  onRemove: (idx: number) => void
}) {
  const disc = parseFloat(tier.discount) || 0
  const sellPrice = tier.price ? parseVN(tier.price)
    : (basePrice > 0 && disc > 0 ? Math.round(basePrice * (1 - disc / 100) * 100) / 100 : 0)
  const displayPrice = sellPrice > 0 ? formatVN(sellPrice) : ''
  const displayDisc = tier.discount || ''

  // Tính giá gốc tại mốc ngày này (từ cost_discount_tiers)
  const minDays = parseInt(tier.min) || 1
  let costAtTier = baseCost || 0
  if (baseCost && costTiers) {
    for (const ct of costTiers) {
      const ctMin = parseInt(ct.min) || 0
      const ctMax = parseInt(ct.max) || Infinity
      if (minDays >= ctMin && minDays <= ctMax) {
        costAtTier = ct.price ? parseVN(ct.price) : Math.round(baseCost * (1 - (parseFloat(ct.discount) || 0) / 100) * 100) / 100
        break
      }
    }
  }
  const profit = sellPrice > 0 && costAtTier > 0 ? sellPrice - costAtTier : 0
  const isLoss = profit < 0
  const showProfit = baseCost && baseCost > 0

  const inputSx = { '& input': { fontSize: '12px', padding: '5px 8px' } }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: showProfit ? '1fr 1fr 1fr 1fr 80px 40px' : '1fr 1fr 1fr 1fr 40px', gap: '6px', alignItems: 'center', padding: '6px 10px', borderTop: '1px solid #f1f5f9', background: isLoss ? '#fef2f2' : undefined }}>
      <CustomTextField size='small' type='number' placeholder='VD: 5' value={tier.min}
        onChange={(e: any) => onUpdate(idx, { ...tier, min: e.target.value })} sx={inputSx} />
      <CustomTextField size='small' type='number' placeholder='Không giới hạn' value={tier.max}
        onChange={(e: any) => onUpdate(idx, { ...tier, max: e.target.value })} sx={inputSx} />
      <CustomTextField size='small' placeholder='VD: 10,5' value={displayDisc}
        onChange={(e: any) => {
          const pct = sanitizeVN(e.target.value)
          const pctNum = parseFloat(pct) || 0
          const newPrice = basePrice > 0 && pctNum > 0
            ? String(Math.round(basePrice * (1 - pctNum / 100) * 100) / 100)
            : undefined
          onUpdate(idx, { ...tier, discount: pct, price: newPrice })
        }}
        sx={inputSx} />
      <CustomTextField size='small' placeholder='VD: 4.500' value={displayPrice}
        onChange={(e: any) => {
          const raw = sanitizeVN(e.target.value)
          const priceNum = parseVN(raw)
          const newDisc = basePrice > 0 && priceNum > 0
            ? String(Math.round((1 - priceNum / basePrice) * 10000) / 100)
            : tier.discount
          onUpdate(idx, { ...tier, discount: newDisc, price: String(priceNum) })
        }}
        sx={{ '& input': { fontSize: '12px', padding: '5px 8px', color: disc > 0 ? color : undefined, fontWeight: disc > 0 ? 600 : undefined } }} />
      {showProfit && (
        <span style={{ fontSize: '11px', fontWeight: 600, color: isLoss ? '#ef4444' : profit > 0 ? '#16a34a' : '#94a3b8', whiteSpace: 'nowrap' }}>
          {profit !== 0 ? `${profit > 0 ? '+' : ''}${formatVN(profit)}đ` : '—'}
        </span>
      )}
      <button type='button' onClick={() => onRemove(idx)}
        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 14 }}>✕</button>
    </div>
  )
})

// ─── Preview component (cô lập re-render khỏi form chính) ───
const PREVIEW_FIELDS = ['name', 'type', 'tag', 'status', 'rotation_type', 'protocols', 'auth_type', 'bandwidth',
  'rotation_interval', 'pool_size', 'request_limit', 'concurrent_connections', 'note', 'code',
  'country', 'ip_version', 'proxy_type', 'is_purchasable'] as const

const ServicePreview = memo(function ServicePreview({ control, serviceId, priceFields, multiInputFields, allowCustomAuth }: {
  control: any; serviceId?: number | null
  priceFields: Array<{ key: string; value: string; cost?: string }>
  multiInputFields: Array<{ key: string; value: string }>
  allowCustomAuth: boolean
}) {
  const previewData = useWatch({ control, name: PREVIEW_FIELDS as any })
  const previewObj = useMemo(() => {
    const obj: any = {}
    PREVIEW_FIELDS.forEach((f, i) => { obj[f] = (previewData as any)?.[i] })
    return obj
  }, [previewData])

  const watchedType = previewObj.type

  const convertIpVersion = (v: string) => { switch (v?.toLowerCase()) { case 'ipv4': case 'v4': return 'V4'; case 'ipv6': case 'v6': return 'V6'; default: return v || '' } }
  const convertAuthType = (t: string) => { switch (t) { case 'userpass': return 'User:Pass'; case 'ip_whitelist': return 'IP Whitelist'; case 'both': return 'User:Pass + IP'; default: return t || '' } }

  const validPrices = priceFields.filter((field: any) => field.key && field.value && parseInt(field.value, 10) > 0)
  const firstPrice = validPrices.length > 0 ? parseInt(validPrices[0].value, 10) : 0
  const isAvailable = previewObj.is_purchasable !== false

  const specFeatureRows = [
    previewObj.auth_type && { label: 'Xác thực', value: convertAuthType(previewObj.auth_type) + ((previewObj.auth_type === 'userpass' || previewObj.auth_type === 'both') ? (allowCustomAuth ? ' (Tự nhập)' : ' (Random)') : ''), icon: Shield, color: 'var(--primary-hover, #f97316)' },
    previewObj.bandwidth && { label: 'Băng thông', value: previewObj.bandwidth === 'unlimited' ? 'Không giới hạn' : previewObj.bandwidth, icon: Wifi, color: '#3b82f6' },
    watchedType === '1' && previewObj.rotation_type && { label: 'Kiểu xoay', value: previewObj.rotation_type === 'per_request' ? 'Đổi IP mỗi request' : previewObj.rotation_type === 'sticky' ? 'Giữ IP cố định' : previewObj.rotation_type === 'time_based' ? 'Đổi IP theo thời gian' : previewObj.rotation_type, icon: RefreshCw, color: '#8b5cf6' },
    watchedType === '1' && previewObj.rotation_interval && { label: 'Tự động xoay', value: Number(previewObj.rotation_interval) >= 3600 ? Number(previewObj.rotation_interval) / 3600 + ' giờ' : Number(previewObj.rotation_interval) >= 60 ? Math.floor(Number(previewObj.rotation_interval) / 60) + ' phút' : previewObj.rotation_interval + ' giây', icon: Clock, color: '#f59e0b' },
    watchedType === '1' && previewObj.pool_size && { label: 'Pool size', value: previewObj.pool_size, icon: Globe, color: '#06b6d4' },
    previewObj.request_limit && { label: 'Giới hạn request', value: previewObj.request_limit, icon: Zap, color: '#22c55e' },
    previewObj.concurrent_connections && { label: 'Kết nối đồng thời', value: previewObj.concurrent_connections, icon: Users, color: '#ef4444' },
  ].filter(Boolean)

  const tagElements = previewObj.tag ? previewObj.tag.split(',').map((t: string) => t.trim()).filter(Boolean) : []
  const visibleTagEls = tagElements.filter((tag: string) => { const cfg = getTagStyle(tag); return !(cfg && 'hidden' in cfg && cfg.hidden) })

  const renderInlineTags = () => visibleTagEls.length > 0 ? (
    <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
      {visibleTagEls.map((tag: string, i: number) => {
        const cfg = getTagStyle(tag)
        return <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', padding: '3px 10px', fontSize: '10.5px', fontWeight: 700, borderRadius: '6px', background: `linear-gradient(180deg, rgba(255,255,255,0.2) 0%, transparent 50%), ${cfg.gradient || cfg.bgColor}`, color: cfg.textColor, boxShadow: `0 2px 10px ${cfg.borderColor}55, inset 0 1px 0 rgba(255,255,255,0.2)`, border: '1px solid rgba(255,255,255,0.25)', letterSpacing: '0.3px', lineHeight: 1.2 }}>
          {cfg.icon && <span style={{ fontSize: '10px' }}>{cfg.icon}</span>}{tag}
        </span>
      })}
    </div>
  ) : null

  const renderNotePreview = () => {
    if (!previewObj.note || previewObj.note === '<p></p>') return null
    const text = previewObj.note.replace(/<[^>]+>/g, '').trim()
    if (!text) return null
    const preview = text.length > 80 ? text.substring(0, 80) + '...' : text
    return <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 8px', lineHeight: 1.4 }}>{preview}</p>
  }

  const renderFooter = () => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 'auto', paddingTop: 12, borderTop: '1px solid #f1f5f9' }}>
      <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--primary-hover, #e53e3e)', whiteSpace: 'nowrap' }}>
        {validPrices.length > 1 && <span style={{ fontSize: '12px', fontWeight: 500, color: '#94a3b8', marginRight: '2px' }}>từ </span>}
        {firstPrice > 0 ? `${firstPrice.toLocaleString('vi-VN')}đ` : '—'}
      </div>
      {isAvailable ? (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '8px 18px', fontSize: '13px', fontWeight: 600, color: 'var(--primary-hover, #d06830)', background: 'color-mix(in srgb, var(--primary-hover, #f97316) 8%, white)', borderRadius: '10px', border: '1px solid color-mix(in srgb, var(--primary-hover, #f97316) 25%, white)', whiteSpace: 'nowrap' }}>
          <ShoppingCart size={14} /> Mua ngay
        </div>
      ) : (
        <div style={{ padding: '8px 14px', borderRadius: '8px', backgroundColor: '#f1f5f9', border: '1px solid #e2e8f0', color: '#64748b', fontSize: '13px', fontWeight: 600 }}>
          Tạm ngừng
        </div>
      )}
    </div>
  )

  const renderSpecRows = () => specFeatureRows.map((spec: any, i: number) => (
    <div key={`spec-${i}`} className='feature-row'>
      <div className='feature-icons'><spec.icon size={16} color={spec.color} /></div>
      <div className='feature-content'>
        <span className='feature-label'>{spec.label}:</span>
        <span className='feature-value'>{spec.value}</span>
      </div>
    </div>
  ))

  const renderIpRow = (prefix: string) => {
    if (!previewObj.ip_version && !previewObj.country) return null
    const countries = Array.isArray(previewObj.country) ? previewObj.country : (previewObj.country ? [previewObj.country] : [])

    return (
      <>
        <div className='feature-row'>
          <div className='feature-icons'><MapPin size={16} color='#6366f1' /></div>
          <div className='feature-content'>
            <span className='feature-label'>Loại IP:</span>
            <span className='feature-value'>
              {prefix} {convertIpVersion(previewObj.ip_version || '')}
            </span>
          </div>
        </div>
        {countries.length > 0 && (
          <div className='feature-row' style={{ alignItems: 'flex-start' }}>
            <div className='feature-icons' style={{ paddingTop: 2 }}><Globe size={16} color='#059669' /></div>
            <div className='feature-content'>
              <span className='feature-label'>Quốc gia:</span>
              <span className='feature-value' style={{ display: 'flex', flexWrap: 'wrap', gap: '3px 6px' }}>
                {countries.map((c: string) => (
                  <span key={c} style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                    <img src={`https://flagcdn.com/w20/${fixCountryCode(c)}.png`} alt='' style={{ width: 16, height: 11, objectFit: 'cover', borderRadius: 1 }} />
                    <span style={{ fontSize: '11.5px' }}>{COUNTRY_NAMES[c] || c.toUpperCase()}</span>
                  </span>
                ))}
              </span>
            </div>
          </div>
        )}
      </>
    )
  }

  const renderProtocolRow = () => Array.isArray(previewObj.protocols) && previewObj.protocols.length > 0 ? (
    <div className='feature-row'>
      <div className='feature-icons'><Shield size={16} color='var(--primary-hover, #f97316)' /></div>
      <div className='feature-content'>
        <span className='feature-label'>Hỗ trợ:</span>
        <span className='feature-value'>{previewObj.protocols.map((p: string) => p.toUpperCase()).join('/')}</span>
      </div>
    </div>
  ) : null

  try {
    return (
      <div style={{
        background: 'white', borderRadius: '12px', padding: '16px',
        boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0',
        position: 'relative', overflow: 'visible', display: 'flex', flexDirection: 'column',
        ...((!isAvailable) ? { opacity: 0.7 } : {})
      }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: watchedType === '1' ? 'linear-gradient(90deg, #3b82f6, #60a5fa)' : 'var(--primary-gradient, linear-gradient(90deg, #e53e3e, #ff6b6b))', borderRadius: '12px 12px 0 0' }} />

        {watchedType === '1' ? (
          <>
            <div style={{ marginBottom: '12px', paddingBottom: '10px', borderBottom: '1px solid #f1f5f9', paddingTop: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#1e293b', margin: 0, textAlign: 'left', flex: 1 }}>{previewObj.name || 'Tên sản phẩm'} <span style={{ fontFamily: 'monospace', fontSize: '11px', fontWeight: 500, color: '#94a3b8' }}>#{serviceId || '?'}</span></h3>
                {renderInlineTags()}
              </div>
            </div>
            {renderNotePreview()}
            <div style={{ marginBottom: '4px', flex: 1 }}>
              {renderIpRow('Rotating')}
              {renderProtocolRow()}
              {renderSpecRows()}
              {multiInputFields.filter((field: any) => field.key && field.value).map((input: any, i: number) => {
                const featureColors = ['var(--primary-hover, #f97316)', '#3b82f6', '#22c55e', '#8b5cf6', '#06b6d4', '#f59e0b', '#ef4444']
                return (
                  <div key={i} className='feature-row'>
                    <div className='feature-icons'><CheckCircle size={16} color={featureColors[i % featureColors.length]} /></div>
                    <div className='feature-content'>
                      <span className='feature-label'>{input.key}:</span>
                      <span className='feature-value'>{input.value}</span>
                    </div>
                  </div>
                )
              })}
            </div>
            {renderFooter()}
          </>
        ) : (
          <>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', paddingTop: '4px' }}>
              <div style={{ marginBottom: '10px', paddingBottom: '8px', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#1e293b', margin: 0, flex: 1 }}>{previewObj.name || 'Tên sản phẩm'} <span style={{ fontFamily: 'monospace', fontSize: '11px', fontWeight: 500, color: '#94a3b8' }}>#{serviceId || '?'}</span></h3>
                  {renderInlineTags()}
                </div>
              </div>
              {renderNotePreview()}
              <div style={{ marginBottom: '8px' }}>
                {renderIpRow('Static')}
                {renderProtocolRow()}
                {renderSpecRows()}
              </div>
            </div>
            {renderFooter()}
          </>
        )}
      </div>
    )
  } catch (e) { return <div style={{ padding: '16px', color: '#ef4444', fontSize: '12px' }}>Preview error: {String(e)}</div> }
})

// ─── Purchase Options Section (cô lập state khỏi form chính) ───
interface PurchaseOption {
  key: string; param_name: string; label: string
  type: 'select' | 'text' | 'number'; required: boolean; default: string
  display_type?: 'country_flag' | ''
  options: Array<{ value: string; label: string }>
}

const PurchaseOptionsSection = memo(function PurchaseOptionsSection({
  options, onChange, control, errors, countries
}: {
  options: PurchaseOption[]
  onChange: (options: PurchaseOption[]) => void
  control: any; errors: any; countries?: any[]
}) {
  const update = (idx: number, patch: Partial<PurchaseOption>) => {
    onChange(options.map((o, i) => i === idx ? { ...o, ...patch } : o))
  }

  return (
    <Grid2 size={{ xs: 12 }}>
      <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <ShoppingCart size={16} color='#7c3aed' />
          <span style={{ fontWeight: 700, fontSize: 14, color: '#5b21b6' }}>Params gửi NCC khi mua hàng</span>
        </div>

        {/* Giải thích 3 lớp params */}
        <div style={{ fontSize: 12, color: '#475569', marginBottom: 14, background: '#f5f3ff', borderRadius: 8, padding: '10px 12px', border: '1px solid #e9d5ff', lineHeight: 1.8 }}>
          <div style={{ fontWeight: 600, color: '#7c3aed', marginBottom: 4 }}>Khi khách mua sản phẩm → hệ thống gửi params cho NCC theo 3 lớp:</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            <span style={{ background: '#e2e8f0', padding: '1px 6px', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>Lớp 1</span>
            <span><strong>Provider config</strong> — params cố định trong cấu hình NCC (URL, auth, quantity...)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            <span style={{ background: '#ddd6fe', padding: '1px 6px', borderRadius: 4, fontSize: 11, fontWeight: 600, color: '#5b21b6' }}>Lớp 2</span>
            <span><strong>Mặc định sản phẩm</strong> (bên dưới) — params riêng cho SP này, khách không thấy</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ background: '#c4b5fd', padding: '1px 6px', borderRadius: 4, fontSize: 11, fontWeight: 600, color: '#fff' }}>Lớp 3</span>
            <span><strong>Khách chọn</strong> — hiện trên form checkout, khách tự chọn giá trị</span>
          </div>
          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 6 }}>Trùng key → lớp sau ghi đè lớp trước. VD: SP đặt loaiproxy=Viettel, nhưng khách chọn loaiproxy=VNPT → gửi VNPT.</div>
        </div>

        {/* Lớp 2: Mặc định sản phẩm */}
        <div style={{ marginBottom: 16, padding: '10px 12px', background: '#fafbfc', border: '1px solid #e2e8f0', borderRadius: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#5b21b6', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ background: '#ddd6fe', padding: '1px 6px', borderRadius: 4, fontSize: 10, fontWeight: 700, color: '#5b21b6' }}>Lớp 2</span>
            Mặc định sản phẩm — tự gửi kèm, khách không thấy
          </div>
          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 8 }}>
            JSON object chứa params cố định cho SP này. VD: loại proxy, quốc gia, giao thức... Hệ thống gửi NCC cùng mỗi request mua.
          </div>
          <Controller name='body_api' control={control} render={({ field }) => (
            <CustomTextField {...field} rows={2} fullWidth multiline size='small'
              placeholder='VD: {"loaiproxy":"Viettel","type":"HTTP"}'
              error={!!errors.body_api} helperText={errors.body_api?.message} />
          )} />
        </div>

        {/* Lớp 3: Khách chọn */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#5b21b6', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ background: '#c4b5fd', padding: '1px 6px', borderRadius: 4, fontSize: 10, fontWeight: 700, color: '#fff' }}>Lớp 3</span>
            Khách chọn khi mua — hiện trên form checkout
          </div>
          <Button size='small' variant='outlined'
            onClick={() => onChange([...options, { key: '', param_name: '', label: '', type: 'select', required: true, default: '', display_type: '', options: [{ value: '', label: '' }] }])}>
            + Thêm tuỳ chọn
          </Button>
        </div>

        {options.length === 0 && (
          <p style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', padding: '12px 0' }}>
            Chưa có tuỳ chọn nào. User sẽ mua mà không cần chọn thêm.
          </p>
        )}

        {options.map((opt, optIdx) => (
          <div key={optIdx} style={{ background: '#f8fafc', borderRadius: 8, padding: 12, marginBottom: 12, position: 'relative' }}>
            <button type='button' onClick={() => onChange(options.filter((_, i) => i !== optIdx))}
              style={{ position: 'absolute', top: 8, right: 8, background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 16, fontWeight: 700 }}>✕</button>

            <Grid2 container spacing={1.5} sx={{ mb: 1 }}>
              <Grid2 size={{ xs: 3 }}>
                <CustomTextField fullWidth size='small' label='Key nội bộ' placeholder='nha_mang' value={opt.key}
                  onChange={(e: any) => update(optIdx, { key: e.target.value.replace(/[^a-zA-Z0-9_]/g, '') })} />
              </Grid2>
              <Grid2 size={{ xs: 3 }}>
                <CustomTextField fullWidth size='small' label='Param gốc (ẩn)' placeholder='loaiproxy' value={opt.param_name}
                  onChange={(e: any) => update(optIdx, { param_name: e.target.value.replace(/[^a-zA-Z0-9_]/g, '') })} />
              </Grid2>
              <Grid2 size={{ xs: 3 }}>
                <CustomTextField fullWidth size='small' label='Label hiển thị' placeholder='Nhà mạng' value={opt.label}
                  onChange={(e: any) => update(optIdx, { label: e.target.value })} />
              </Grid2>
              <Grid2 size={{ xs: 1.5 }}>
                <CustomTextField fullWidth size='small' select label='Loại' value={opt.type || 'select'}
                  onChange={(e: any) => update(optIdx, { type: e.target.value })}>
                  <MenuItem value='select'>Select</MenuItem>
                  <MenuItem value='text'>Text</MenuItem>
                  <MenuItem value='number'>Number</MenuItem>
                </CustomTextField>
              </Grid2>
              <Grid2 size={{ xs: 1.5 }}>
                <CustomTextField fullWidth size='small' select label='Bắt buộc' value={opt.required ? 'true' : 'false'}
                  onChange={(e: any) => update(optIdx, { required: e.target.value === 'true' })}>
                  <MenuItem value='true'>Có</MenuItem>
                  <MenuItem value='false'>Không</MenuItem>
                </CustomTextField>
              </Grid2>
            </Grid2>
            {(opt.type || 'select') === 'select' && (
              <Grid2 container spacing={1.5} sx={{ mb: 1 }}>
                <Grid2 size={{ xs: 3 }}>
                  <CustomTextField fullWidth size='small' select label='Hiển thị ngoài card' value={opt.display_type || ''}
                    onChange={(e: any) => update(optIdx, { display_type: e.target.value || '' })}>
                    <MenuItem value=''>Mặc định (text)</MenuItem>
                    <MenuItem value='country_flag'>Cờ quốc gia</MenuItem>
                  </CustomTextField>
                </Grid2>
              </Grid2>
            )}

            {(opt.type || 'select') === 'select' && (
              <>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>Giá trị:</div>
                {opt.options.map((option, valIdx) => (
                  <div key={valIdx} style={{ display: 'flex', gap: 6, marginBottom: 4, alignItems: 'center' }}>
                    <CustomTextField size='small' placeholder='Giá trị gửi API' value={option.value} sx={{ flex: 1 }}
                      onChange={(e: any) => {
                        const newOpts = [...opt.options]; newOpts[valIdx] = { ...newOpts[valIdx], value: e.target.value }
                        update(optIdx, { options: newOpts })
                      }} />
                    {opt.display_type === 'country_flag' ? (
                      <CustomTextField size='small' select label='Quốc gia' value={(option as any).flag || ''} sx={{ flex: 1 }}
                        onChange={(e: any) => {
                          const code = e.target.value
                          const country = countries?.find((c: any) => c.code.toLowerCase() === code)
                          const newOpts = [...opt.options]

                          ;(newOpts[valIdx] as any) = { ...newOpts[valIdx], flag: code, label: country?.name || code.toUpperCase() }
                          update(optIdx, { options: newOpts })
                        }}
                        slotProps={{ select: { MenuProps: { PaperProps: { style: { maxHeight: 250 } } } } }}
                      >
                        <MenuItem value=''><em>— Chọn —</em></MenuItem>
                        {(countries || []).map((c: any) => (
                          <MenuItem key={c.code} value={c.code.toLowerCase()}>
                            <img src={`https://flagcdn.com/w20/${c.code.toLowerCase()}.png`} alt='' style={{ width: 18, height: 13, marginRight: 8, objectFit: 'cover', borderRadius: 1 }} />
                            {c.name}
                          </MenuItem>
                        ))}
                      </CustomTextField>
                    ) : (
                      <CustomTextField size='small' placeholder='Hiển thị (label)' value={option.label} sx={{ flex: 1 }}
                        onChange={(e: any) => {
                          const newOpts = [...opt.options]; newOpts[valIdx] = { ...newOpts[valIdx], label: e.target.value }
                          update(optIdx, { options: newOpts })
                        }} />
                    )}
                    <button type='button'
                      onClick={() => { if (opt.options.length <= 1) return; update(optIdx, { options: opt.options.filter((_, i) => i !== valIdx) }) }}
                      style={{ background: 'none', border: 'none', color: opt.options.length <= 1 ? '#cbd5e1' : '#ef4444', cursor: opt.options.length <= 1 ? 'default' : 'pointer', fontSize: 14, padding: '4px 6px' }}>✕</button>
                  </div>
                ))}
                <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                  <Button size='small' variant='text' sx={{ fontSize: 12 }}
                    onClick={() => update(optIdx, { options: [...opt.options, { value: '', label: '' }] })}>+ Thêm giá trị</Button>
                  <CustomTextField size='small' select label='Mặc định' sx={{ minWidth: 120 }}
                    value={opt.default || opt.options[0]?.value || ''}
                    onChange={(e: any) => update(optIdx, { default: e.target.value })}>
                    {opt.options.filter(o => o.value).map(o => (
                      <MenuItem key={o.value} value={o.value}>{o.label || o.value}</MenuItem>
                    ))}
                  </CustomTextField>
                </div>
              </>
            )}

            {(opt.type === 'text' || opt.type === 'number') && (
              <CustomTextField size='small' fullWidth label='Giá trị mặc định'
                placeholder={opt.type === 'number' ? '300' : 'VD: giá trị mặc định'}
                type={opt.type} value={opt.default}
                onChange={(e: any) => update(optIdx, { default: e.target.value })}
                sx={{ mt: 1 }} />
            )}
          </div>
        ))}
      </div>
    </Grid2>
  )
})

const COUNTRY_NAMES: Record<string, string> = {
  vi: 'Việt Nam', kr: 'Hàn Quốc', us: 'Mỹ', jp: 'Nhật Bản', sg: 'Singapore',
  th: 'Thái Lan', id: 'Indonesia', my: 'Malaysia', ph: 'Philippines', in: 'Ấn Độ',
  cn: 'Trung Quốc', tw: 'Đài Loan', hk: 'Hồng Kông', de: 'Đức', gb: 'Anh',
  fr: 'Pháp', au: 'Úc', ca: 'Canada', br: 'Brazil', ru: 'Nga',
}

// ─── NCC Renewal Preview — cô lập re-render ───
const NccRenewalPreview = memo(function NccRenewalPreview({
  providerId, providers, renewOverrideEnabled, setRenewOverrideEnabled,
  renewOverrideParams, setRenewOverrideParams
}: {
  providerId: string; providers: any[]; renewOverrideEnabled: boolean
  setRenewOverrideEnabled: (v: boolean) => void
  renewOverrideParams: any[]; setRenewOverrideParams: (v: any) => void
}) {
  const selectedProvider = providers?.find((p: any) => String(p.id) === String(providerId))
  const nccRenew = selectedProvider?.api_config?.renew
  const nccParams = nccRenew?.params || {}
  const nccInherit = nccRenew?.inherit_params || []
  const nccDuration = nccRenew?.duration_param

  const hasNccConfig = nccRenew && (Object.keys(nccParams).length > 0 || nccInherit.length > 0 || nccDuration)

  if (!hasNccConfig) return (
    <Grid2 size={{ xs: 12 }}>
      <Box sx={{ p: 1.5, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 1.5 }}>
        <Typography sx={{ fontSize: 12, color: '#991b1b' }}>
          NCC chưa cấu hình gia hạn. Vào trang NCC → tab Gia hạn để cấu hình trước.
        </Typography>
      </Box>
    </Grid2>
  )

  return (
    <>
      <Grid2 size={{ xs: 12 }}>
        <Box sx={{ p: 1.5, background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 1.5 }}>
          <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#0c4a6e', mb: 0.5 }}>
            Params gia hạn từ NCC ({selectedProvider?.provider_code || selectedProvider?.title})
          </Typography>
          <Box sx={{ fontSize: 12, fontFamily: 'monospace', color: '#334155', lineHeight: 2 }}>
            {Object.entries(nccParams).map(([k, v]) => (
              <div key={k}><strong>{k}</strong> = {String(v)}</div>
            ))}
            {nccDuration && <div><strong>{nccDuration}</strong> = số ngày gia hạn</div>}
            {nccInherit.map((ip: any, i: number) => (
              <div key={i}><strong>{ip.param}</strong> = {ip.source}.{ip.field}</div>
            ))}
          </Box>
          <Typography sx={{ fontSize: 11, color: '#64748b', mt: 0.5, fontStyle: 'italic' }}>
            Không thể bỏ — NCC yêu cầu. Sửa tại trang NCC.
          </Typography>
        </Box>
      </Grid2>

      {/* Override toggle */}
      <Grid2 size={{ xs: 12 }}>
        <FormControlLabel
          control={<Checkbox checked={renewOverrideEnabled} onChange={e => setRenewOverrideEnabled(e.target.checked)} size='small' />}
          label={<Typography variant='body2' sx={{ fontSize: 12 }}>Custom thêm / ghi đè params cho SP này</Typography>}
        />
      </Grid2>

      {/* Override params table */}
      {renewOverrideEnabled && (
        <Grid2 size={{ xs: 12 }}>
          <Box sx={{ p: 1.5, background: '#f5f3ff', border: '1px solid #c4b5fd', borderRadius: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#7c3aed' }}>
                Params ghi đè / thêm mới cho SP này
              </Typography>
              <Button size='small' startIcon={<Plus size={14} />}
                onClick={() => setRenewOverrideParams((prev: any[]) => [...prev, { param: '', source: 'default', value: '' }])}>
                Thêm
              </Button>
            </Box>
            <Typography sx={{ fontSize: 11, color: '#64748b', mb: 1 }}>
              Trùng tên param với NCC → SP ghi đè. Tên mới → thêm vào request.
            </Typography>

            {renewOverrideParams.length === 0 && (
              <Typography sx={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>
                Chưa có. Bấm Thêm để ghi đè hoặc thêm params.
              </Typography>
            )}

            {renewOverrideParams.map((row, i) => (
              <Box key={i} sx={{ mb: 1, p: 1, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 0.5 }}>
                  <IconButton size='small' color='error'
                    onClick={() => setRenewOverrideParams((prev: any[]) => prev.filter((_: any, idx: number) => idx !== i))}>
                    <Trash2 size={14} />
                  </IconButton>
                </Box>
                <Grid2 container spacing={1}>
                  <Grid2 size={{ xs: 12, sm: 3 }}>
                    <CustomTextField size='small' fullWidth label='Param gửi đi' placeholder='VD: loaiproxy'
                      value={row.param} onChange={(e: any) => {
                        const next = [...renewOverrideParams]; next[i] = { ...next[i], param: e.target.value }; setRenewOverrideParams(next)
                      }} />
                  </Grid2>
                  <Grid2 size={{ xs: 12, sm: 3 }}>
                    <CustomTextField size='small' select fullWidth label='Nguồn giá trị'
                      value={row.source} onChange={(e: any) => {
                        const next = [...renewOverrideParams]; next[i] = { ...next[i], source: e.target.value }; setRenewOverrideParams(next)
                      }}>
                      <MenuItem value='order_items'>order_items</MenuItem>
                      <MenuItem value='orders'>orders</MenuItem>
                      <MenuItem value='user_input'>User nhập</MenuItem>
                      <MenuItem value='default'>Mặc định (cố định)</MenuItem>
                    </CustomTextField>
                  </Grid2>
                  {(row.source === 'orders' || row.source === 'order_items') && (
                    <Grid2 size={{ xs: 12, sm: 6 }}>
                      <CustomTextField size='small' fullWidth label='Field trong DB' placeholder='provider_item_id, proxy.protocol'
                        value={row.field || ''} onChange={(e: any) => {
                          const next = [...renewOverrideParams]; next[i] = { ...next[i], field: e.target.value }; setRenewOverrideParams(next)
                        }} />
                    </Grid2>
                  )}
                  {row.source === 'default' && (
                    <Grid2 size={{ xs: 12, sm: 6 }}>
                      <CustomTextField size='small' fullWidth label='Giá trị cố định' placeholder='VD: 4Gvinaphone'
                        value={row.value || ''} onChange={(e: any) => {
                          const next = [...renewOverrideParams]; next[i] = { ...next[i], value: e.target.value }; setRenewOverrideParams(next)
                        }} />
                    </Grid2>
                  )}
                  {row.source === 'user_input' && (
                    <>
                      <Grid2 size={{ xs: 6, sm: 3 }}>
                        <CustomTextField size='small' fullWidth label='Label hiện user' placeholder='Số ngày'
                          value={row.input_label || ''} onChange={(e: any) => {
                            const next = [...renewOverrideParams]; next[i] = { ...next[i], input_label: e.target.value }; setRenewOverrideParams(next)
                          }} />
                      </Grid2>
                      <Grid2 size={{ xs: 6, sm: 3 }}>
                        <CustomTextField size='small' select fullWidth label='Loại input'
                          value={row.input_type || 'string'} onChange={(e: any) => {
                            const next = [...renewOverrideParams]; next[i] = { ...next[i], input_type: e.target.value }; setRenewOverrideParams(next)
                          }}>
                          <MenuItem value='number'>Số</MenuItem>
                          <MenuItem value='string'>Chữ</MenuItem>
                          <MenuItem value='select'>Chọn từ danh sách</MenuItem>
                        </CustomTextField>
                      </Grid2>
                    </>
                  )}
                </Grid2>
              </Box>
            ))}
          </Box>
        </Grid2>
      )}
    </>
  )
})

interface ServiceFormModalProps {
  open: boolean
  onClose: () => void
  serviceId?: number | null
  initialData?: any
}

export default function ServiceFormModal({ open, onClose, serviceId, initialData }: ServiceFormModalProps) {
  const isEditMode = !!serviceId
  const { isChild } = useBranding()

  // Data fetching
  const { data: providers = [], isLoading: loadingProviders } = useProviders()

  // Fetch chi tiết khi edit để lấy field hidden (api_provider) — dùng initialData làm placeholder
  const { data: fetchedData, isLoading: loadingService } = useServiceType(serviceId ?? undefined, isEditMode && open)
  const serviceData = fetchedData ?? initialData
  // Bỏ useServiceTypes() — chỉ dùng để derive protocols/ipVersions, đã hardcode sẵn

  // Mutations
  const createMutation = useCreateServiceType()
  const updateMutation = useUpdateServiceType(serviceId ?? undefined)

  // Out-of-form state
  const [multiInputFields, setMultiInputFields] = useState<Array<{ key: string; value: string }>>([{ key: '', value: '' }])
  const [priceFields, setPriceFields] = useState<Array<{ key: string; value: string; cost?: string; quantity_tiers?: Array<{ min: string; max: string; price: string; cost: string }> }>>([{ key: '', value: '', cost: '' }])
  const [isMultiInputModalOpen, setIsMultiInputModalOpen] = useState(false)
  // quantity_tiers cho per_unit mode
  const [quantityTiers, setQuantityTiers] = useState<Array<{ min: string; max: string; discount: string }>>([])

  const [pricingMode, setPricingMode] = useState<'fixed' | 'per_unit'>('fixed')
  const [timeUnit, setTimeUnit] = useState<'day' | 'month'>('day')
  const [pricePerUnit, setPricePerUnit] = useState('')
  const [costPerUnit, setCostPerUnit] = useState('')

  const [formErrors, setFormErrors] = useState<string[]>([])
  const [formSuccess, setFormSuccess] = useState('')

  const [responseMappingRows, setResponseMappingRows] = useState<{ from: string; to: string; store: string }[]>([])
  const [purchaseOptions, setPurchaseOptions] = useState<PurchaseOption[]>([])
  const [allowCustomAuth, setAllowCustomAuth] = useState(false)
  const [requireIp, setRequireIp] = useState(false)
  const [maxIps, setMaxIps] = useState(1)
  const [providerAuthType, setProviderAuthType] = useState<string | null>(null) // auth_type gốc từ site mẹ
  const [providerMaxIps, setProviderMaxIps] = useState<number | null>(null) // max_ips gốc từ site mẹ
  const [renewable, setRenewable] = useState(false)
  const [renewalDuration, setRenewalDuration] = useState('ncc')
  const [allowExpiredRenew, setAllowExpiredRenew] = useState('')
  const [renewOverrideEnabled, setRenewOverrideEnabled] = useState(false)
  const [renewOverrideParams, setRenewOverrideParams] = useState<Array<{
    param: string; source: string; field?: string; value?: string
    input_type?: string; input_label?: string; min?: number; max?: number
    options?: Array<{ value: string; label: string }>; is_duration?: boolean
  }>>([])

  const [discountTiers, setDiscountTiers] = useState<DiscountTier[]>([])
  const [costDiscountTiers, setCostDiscountTiers] = useState<DiscountTier[]>([])


  // Form
  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
    setError,
    setValue,
  } = useForm({
    resolver: async (data, context, options) => {
      try {
        const values = await schema.validate(data, { abortEarly: false })

        
return { values, errors: {} }
      } catch (err: any) {
        if (!err.inner || !Array.isArray(err.inner)) {
          console.error('Validation error:', err)
          
return { values: {}, errors: { name: { type: 'validation', message: err.message || 'Lỗi validation' } } }
        }

        const formattedErrors = err.inner.reduce(
          (allErrors: any, currentError: any) => ({
            ...allErrors,
            [currentError.path]: {
              type: currentError.type ?? 'validation',
              message: currentError.message
            }
          }),
          {}
        )

        
return { values: {}, errors: formattedErrors }
      }
    },
    mode: 'onSubmit',
    defaultValues: FORM_DEFAULT_VALUES
  })

  // Subscribe thay đổi provider_id → cập nhật duration options
  // Dùng useWatch thay vì watch() subscription để chỉ re-render khi field này đổi
  const watchedProviderId = useWatch({ control, name: 'provider_id' })

  // Load service data when editing
  useEffect(() => {
    if (serviceData && isEditMode) {
      let bodyApiString = ''

      if (serviceData.api_body) {
        try {
          bodyApiString =
            typeof serviceData.api_body === 'string'
              ? serviceData.api_body
              : JSON.stringify(serviceData.api_body, null, 2)
        } catch (error) {
          bodyApiString = ''
        }
      }

      // Parse multi_inputs (có thể là JSON string hoặc array)
      let multiInputs = serviceData.multi_inputs

      if (typeof multiInputs === 'string') { try { multiInputs = JSON.parse(multiInputs) } catch { multiInputs = null } }

      if (multiInputs && Array.isArray(multiInputs)) {
        setMultiInputFields(multiInputs.length > 0 ? multiInputs : [{ key: '', value: '' }])
      }

      // Parse price_by_duration (có thể là JSON string hoặc array)
      let priceDurations = serviceData.price_by_duration

      if (typeof priceDurations === 'string') { try { priceDurations = JSON.parse(priceDurations) } catch { priceDurations = null } }

      if (priceDurations && Array.isArray(priceDurations)) {
        setPriceFields(
          priceDurations.length > 0
            ? priceDurations.map((item: any) => ({
                key: item.key || '',
                value: item.value || '',
                cost: item.cost || '',
                quantity_tiers: item.quantity_tiers || []
              }))
            : [{ key: '', value: '', cost: '' }]
        )
      }

      // Load pricing mode fields
      setPricingMode(serviceData.pricing_mode || 'fixed')
      setTimeUnit(serviceData.time_unit || 'day')
      setPricePerUnit(serviceData.price_per_unit?.toString() || '')
      setCostPerUnit(serviceData.cost_per_unit?.toString() || '')

      // Parse protocols (có thể là JSON string hoặc array)
      let parsedProtocols = serviceData.protocols

      if (typeof parsedProtocols === 'string') { try { parsedProtocols = JSON.parse(parsedProtocols) } catch { parsedProtocols = [] } }

      reset({
        name: serviceData.name || '',
        api_provider: serviceData.api_provider || '',
        cost_price: serviceData.cost_price || undefined,
        code: serviceData.code || '',
        status: serviceData.status || 'active',
        provider_id: serviceData.provider_id || '',
        type: serviceData.type?.toString() || '0',
        ip_version: serviceData.ip_version?.toLowerCase() || 'ipv4',
        protocols: parsedProtocols || [],
        body_api: bodyApiString,
        proxy_type: serviceData.proxy_type?.toLowerCase() || '',
        country: Array.isArray(serviceData.country) ? serviceData.country
          : (serviceData.country ? serviceData.country.toLowerCase().split(',').map((c: string) => c.trim()).filter(Boolean) : []),
        note: serviceData.note || '',
        tag: serviceData.tag || '',
        is_purchasable: serviceData.is_purchasable !== false,
        min_quantity: serviceData.min_quantity ?? 1,
        max_quantity: serviceData.max_quantity ?? 100,
        auth_type: serviceData.auth_type || '',
        bandwidth: serviceData.bandwidth || '',
        rotation_type: serviceData.rotation_type || '',
        rotation_interval: serviceData.rotation_interval || '',
        request_limit: serviceData.request_limit || '',
        concurrent_connections: serviceData.concurrent_connections ?? undefined,
        pool_size: serviceData.pool_size || '',
        metadata_json: '',
      })

      // Load purchase options + allow_custom_auth từ metadata
      const meta = serviceData.metadata || {}
      setAllowCustomAuth(!!meta.allow_custom_auth)
      setRequireIp(!!meta.require_ip)
      setMaxIps(meta.max_ips || 1)
      setProviderAuthType(meta.provider_auth_type || null)
      setProviderMaxIps(meta.provider_max_ips || meta.max_ips || null)
      setRenewable(!!meta.renewable)
      setRenewalDuration(meta.renewal_duration || 'ncc')
      setAllowExpiredRenew(meta.allow_expired_renew != null ? String(meta.allow_expired_renew) : '')
      setRenewOverrideEnabled(Array.isArray(meta.renew_override_params) && meta.renew_override_params.length > 0)
      setRenewOverrideParams(meta.renew_override_params || [])
      setDiscountTiers(meta.discount_tiers || [])
      setCostDiscountTiers(meta.cost_discount_tiers || [])
      setQuantityTiers(meta.quantity_tiers || [])
      setResponseMappingRows(
        Array.isArray(meta.response_mapping)
          ? meta.response_mapping.map((r: any) => ({ from: r.from || '', to: r.to || '', store: r.store || 'metadata' }))
          : []
      )
      if (meta.custom_fields && Array.isArray(meta.custom_fields)) {
        setPurchaseOptions(meta.custom_fields.map((f: any) => ({
          key: f.key || f.param || '',
          param_name: f.param_name || f.param || '',
          label: f.label || '',
          type: f.type || 'select',
          required: f.required || false,
          default: f.default || '',
          display_type: f.display_type || '',
          options: f.options || [{ value: '', label: '' }],
        })))
      } else {
        setPurchaseOptions([])
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceData, isEditMode, reset, open])

  // Reset form when modal opens for create
  useEffect(() => {
    if (open && !isEditMode) {
      reset(FORM_DEFAULT_VALUES)
      setMultiInputFields([{ key: '', value: '' }])
      setPriceFields([{ key: '', value: '', cost: '' }])
      setPurchaseOptions([])
      setResponseMappingRows([])
      setAllowCustomAuth(false)
      setRequireIp(false)
      setMaxIps(1)
      setRenewable(false)
      setRenewalDuration('')
      setAllowExpiredRenew('')
      setRenewOverrideEnabled(false)
      setRenewOverrideParams([])
      setDiscountTiers([])
      setQuantityTiers([])
      setPricingMode('fixed')
      setTimeUnit('day')
      setPricePerUnit('')
      setCostPerUnit('')

      setFormErrors([])
    }
  }, [open, isEditMode, reset])

  const MenuProps = useMemo(() => ({
    PaperProps: {
      style: {
        maxHeight: 48 * 4.5 + 8,
        width: 250
      }
    }
  }), [])

  const onSubmit = (data: any) => {
    setFormErrors([])
    // Normalize country: array → comma-separated string cho BE
    if (Array.isArray(data.country)) {
      data.country = data.country.join(',')
    }

    const formattedPriceFields = priceFields.map((field: any) => {
      const qtyTiers = (field.quantity_tiers || []).filter((t: any) => t.min && (t.price || t.cost))
      return {
        key: field.key,
        value: field.value,
        cost: field.cost ?? '',
        ...(qtyTiers.length > 0 ? { quantity_tiers: qtyTiers } : {})
      }
    })

    // Clean empty Tiptap content to null
    const cleanNote = data.note && data.note !== '<p></p>' ? data.note : null

    // Auto-tính cost_price từ min(price_by_duration[].cost)
    const costs = formattedPriceFields.map((p: any) => parseInt(p.cost) || 0).filter((c: number) => c > 0)
    const autoCostPrice = costs.length > 0 ? Math.min(...costs) : data.cost_price || 0

    // Build metadata từ purchase options
    const validOptions = purchaseOptions.filter(o => o.key && o.label && (o.type !== 'select' || o.options.some(opt => opt.value)))
    const metadata = validOptions.length > 0 ? {
      custom_fields: validOptions.map(o => ({
        key: o.key,
        param_name: o.param_name || o.key,
        label: o.label,
        type: o.type || 'select',
        required: o.required,
        default: o.default || (o.type === 'select' ? o.options[0]?.value || '' : ''),
        ...(o.type === 'select' ? { options: o.options.filter(opt => opt.value).map(opt => {
          const entry: any = { value: opt.value, label: opt.label }
          if ((opt as any).flag) entry.flag = (opt as any).flag
          return entry
        }) } : {}),
        ...(o.display_type ? { display_type: o.display_type } : {}),
      }))
    } : null

    // Merge allow_custom_auth vào metadata
    const metadataFinal = {
      ...(metadata || {}),
      allow_custom_auth: allowCustomAuth,
      require_ip: requireIp || undefined,
      max_ips: maxIps > 1 ? maxIps : undefined,
      renewable: renewable || undefined,
      renewal_duration: renewable ? (renewalDuration || 'ncc') : undefined,
      allow_expired_renew: allowExpiredRenew === 'true' ? true : (allowExpiredRenew === 'false' ? false : undefined),
      renew_override_params: renewOverrideEnabled && renewOverrideParams.filter(p => p.param).length > 0
        ? renewOverrideParams.filter(p => p.param) : undefined,
      discount_tiers: pricingMode === 'per_unit' ? discountTiers.filter(t => t.min && t.discount) : undefined,
      cost_discount_tiers: pricingMode === 'per_unit' ? costDiscountTiers.filter(t => t.min && t.discount) : undefined,
      quantity_tiers: pricingMode === 'per_unit' && quantityTiers.length > 0
        ? quantityTiers.filter(t => t.min && t.discount) : undefined,
      response_mapping: responseMappingRows.filter(r => r.from && r.to).length > 0
        ? responseMappingRows.filter(r => r.from && r.to).map(r => ({ from: r.from, to: r.to, store: r.store }))
        : undefined,
      provider_auth_type: providerAuthType || undefined,
      provider_max_ips: providerMaxIps || undefined,
    }

    const submitData: any = {
      ...data,
      note: cleanNote,
      api_type: 'buy_api',
      multi_inputs: multiInputFields,
      // per_unit: giữ price_by_duration cũ nếu có (không xóa mốc)
      price_by_duration: pricingMode === 'per_unit' && formattedPriceFields.filter((f: any) => f.key).length === 0
        ? (serviceData?.price_by_duration || [])
        : formattedPriceFields,
      cost_price: autoCostPrice,
      metadata: metadataFinal,
      pricing_mode: pricingMode,
      time_unit: timeUnit,
      price_per_unit: pricingMode === 'per_unit' ? (parseInt(pricePerUnit) || null) : null,
      cost_per_unit: pricingMode === 'per_unit' ? (parseFloat(costPerUnit) || null) : null,
    }
    delete submitData.metadata_json

    const mutation = isEditMode ? updateMutation : createMutation

    mutation.mutate(submitData, {
      onSuccess: () => {
        setFormErrors([])
        setFormSuccess(isEditMode ? 'Cập nhật dịch vụ thành công!' : 'Thêm dịch vụ thành công!')
        document.getElementById('service-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      },
      onError: (error: any) => {
        console.error('API error:', error?.response?.status, error?.response?.data || error?.message)
        const res = error?.response?.data
        const errors: string[] = []

        // Parse validation errors object từ Laravel → set lỗi trực tiếp vào field
        if (res?.errors && typeof res.errors === 'object') {
          Object.entries(res.errors).forEach(([field, fieldErrors]: [string, any]) => {
            const msg = Array.isArray(fieldErrors) ? fieldErrors[0] : fieldErrors
            const feField = field === 'api_body' ? 'body_api' : field

            setError(feField as any, { type: 'server', message: msg })
            errors.push(msg)
          })

        } else if (res?.message) {
          errors.push(res.message)
        } else {
          errors.push('Có lỗi xảy ra, vui lòng thử lại')
        }

        setFormErrors(errors)

        // Scroll to top of dialog to show error
        document.getElementById('service-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    })
  }

  const onError = (validationErrors: any) => {
    console.error('Form validation errors:', validationErrors)

    const messages = Object.values(validationErrors)
      .map((error: any) => error?.message)
      .filter(Boolean) as string[]

    setFormErrors(messages)

    // Scroll to top of dialog to show error
    document.getElementById('service-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  // useWatch cô lập re-render — chỉ re-render khi các field này thay đổi
  const [watchedType, watchedRotationType, watchedTag, watchedStatus, watchedAuthType, watchedRotationInterval] = useWatch({
    control,
    name: ['type', 'rotation_type', 'tag', 'status', 'auth_type', 'rotation_interval'],
  })

  // Duration options — useMemo thay vì useState+useEffect (tránh infinite loop)
  const { durationOptions, durationUrlMap } = useMemo(() => {
    try {
      const prov = providers?.find((p: any) => String(p.id) === String(watchedProviderId))

      if (!prov?.api_config) return { durationOptions: DEFAULT_DURATION_OPTIONS_CONST, durationUrlMap: {} as Record<string, string> }

      const config = typeof prov.api_config === 'string' ? JSON.parse(prov.api_config) : prov.api_config
      const buyKey = watchedType === '0' ? 'buy_static' : 'buy_rotating'
      const urlByDuration = (config?.[buyKey] ?? config?.buy)?.url_by_duration

      if (!urlByDuration || typeof urlByDuration !== 'object' || Object.keys(urlByDuration).length === 0) {
        return { durationOptions: DEFAULT_DURATION_OPTIONS_CONST, durationUrlMap: {} as Record<string, string> }
      }

      return {
        durationUrlMap: urlByDuration as Record<string, string>,
        durationOptions: Object.keys(urlByDuration)
          .map(key => ({ value: key, label: LABEL_MAP_CONST[key] || `${key} ngày` }))
          .sort((a, b) => Number(a.value) - Number(b.value))
      }
    } catch {
      return { durationOptions: DEFAULT_DURATION_OPTIONS_CONST, durationUrlMap: {} as Record<string, string> }
    }
  }, [providers, watchedProviderId, watchedType])

  const { data: countries } = useCountries()

  const toggleTag = useCallback((preset: string) => {
    const current = watchedTag ? watchedTag.split(',').map((t: string) => t.trim()).filter(Boolean) : []
    const updated = current.includes(preset) ? current.filter((t: string) => t !== preset) : [...current, preset]

    setValue('tag', updated.join(', '))
  }, [watchedTag, setValue])
  const notePlaceholder = watchedType === '1' ? ROTATING_PLACEHOLDER : STATIC_PLACEHOLDER

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth='xl' fullWidth
        PaperProps={DIALOG_PAPER_SX}
        sx={DIALOG_SX}
        fullScreen={false}>
        <DialogTitle sx={DIALOG_TITLE_SX}>
          <span style={{ fontWeight: 700, fontSize: '16px' }}>
            {isEditMode ? 'Chỉnh sửa dịch vụ' : 'Thêm dịch vụ mới'}
          </span>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              borderRadius: '6px',
              padding: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              color: 'white'
            }}
          >
            <X size={20} />
          </button>
        </DialogTitle>

        <DialogContent sx={DIALOG_CONTENT_SX}>
          {/* Loading overlay khi đang xử lý */}
          {isPending && (
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                zIndex: 10,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'rgba(255, 255, 255, 0.85)',
                backdropFilter: 'blur(2px)',
                borderRadius: '8px',
              }}
            >
              <CircularProgress size={48} sx={{ color: '#F6734B', mb: 2 }} />
              <Typography variant='body1' fontWeight={700} sx={{ color: '#1e293b' }}>
                {isEditMode ? 'Đang cập nhật dịch vụ...' : 'Đang tạo dịch vụ mới...'}
              </Typography>
              <Typography variant='caption' sx={{ color: '#64748b', mt: 0.5 }}>
                Vui lòng chờ trong giây lát
              </Typography>
            </Box>
          )}

          {/* Left: Form — compact inputs */}
          <Box sx={FORM_BOX_SX}>
          {loadingService && isEditMode && !initialData ? (
            <Box display='flex' justifyContent='center' alignItems='center' minHeight='300px'>
              <CircularProgress />
            </Box>
          ) : (
            <form id='service-form' onSubmit={handleSubmit(onSubmit, onError)}>
              {/* Inline error alert */}
              <Collapse in={formErrors.length > 0}>
                <Alert
                  severity='error'
                  icon={<AlertCircle size={20} />}
                  action={
                    <IconButton size='small' color='inherit' onClick={() => setFormErrors([])}>
                      <X size={16} />
                    </IconButton>
                  }
                  sx={{
                    mb: 2,
                    borderRadius: '8px',
                    border: '1px solid #fca5a5',
                    '& .MuiAlert-message': { width: '100%' }
                  }}
                >
                  <Typography variant='body2' fontWeight={700} sx={{ mb: formErrors.length > 1 ? 0.5 : 0 }}>
                    {isEditMode ? 'Cập nhật thất bại' : 'Tạo dịch vụ thất bại'}
                  </Typography>
                  {formErrors.length === 1 ? (
                    <Typography variant='body2'>{formErrors[0]}</Typography>
                  ) : (
                    <ul style={{ margin: '4px 0 0', paddingLeft: '18px' }}>
                      {formErrors.map((msg, i) => (
                        <li key={i}>
                          <Typography variant='body2'>{msg}</Typography>
                        </li>
                      ))}
                    </ul>
                  )}
                </Alert>
              </Collapse>

              {/* Inline success alert */}
              {formSuccess && (
                <div
                  data-form-alert
                  style={{
                    marginBottom: 16, padding: '12px 16px', borderRadius: 8,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                    fontSize: 14, fontWeight: 600, animation: 'fadeIn 0.3s ease',
                    background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d',
                  }}
                >
                  <span>✓ {formSuccess}</span>
                  <button onClick={() => setFormSuccess('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: 18, padding: '0 4px', lineHeight: 1 }}>×</button>
                </div>
              )}

              {/* ========== Section 1: Thông tin cơ bản ========== */}
              <div style={{ background: '#fafbfc', borderRadius: '10px', padding: '14px 16px', marginBottom: '14px', border: '1px solid #f1f5f9' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <div style={{ width: '26px', height: '26px', borderRadius: '7px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Info size={13} color='#3b82f6' />
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>Thông tin cơ bản</span>
                </div>
              <Grid2 container spacing={1}>
                <Grid2 size={{ xs: 6, sm: 3 }}>
                  <Controller
                    name='provider_id'
                    control={control}
                    render={({ field }) => (
                      <CustomTextField {...field} fullWidth select label='Provider' disabled={loadingProviders}>
                        <MenuItem value=''><em>{loadingProviders ? '...' : '—'}</em></MenuItem>
                        {providers?.filter((p: any) => p.status === 'active').map((provider: any) => (
                          <MenuItem key={provider.id} value={provider.id}>
                            <span style={{ color: '#94a3b8', fontSize: 12, marginRight: 4 }}>#{provider.id}</span>
                            {provider.title || provider.name}
                            {provider.provider_code && (
                              <span style={{ color: '#6366f1', fontSize: 11, marginLeft: 4, fontFamily: 'monospace' }}>
                                [{provider.provider_code}]
                              </span>
                            )}
                          </MenuItem>
                        ))}
                      </CustomTextField>
                    )}
                  />
                </Grid2>

                <Grid2 size={{ xs: 12, sm: 3 }}>
                  <Controller
                    name='name'
                    control={control}
                    render={({ field }) => (
                      <CustomTextField
                        {...field}
                        required
                        fullWidth
                        label='Tên dịch vụ'
                        placeholder='Proxy Xoay VN SV1'
                        error={!!errors.name}
                        helperText={errors.name?.message}
                      />
                    )}
                  />
                </Grid2>

                <Grid2 size={{ xs: 6, sm: 3 }}>
                  <Controller
                    name='code'
                    control={control}
                    render={({ field }) => (
                      <CustomTextField
                        {...field}
                        fullWidth
                        label='Mã sản phẩm (Code)'
                        placeholder='Để trống tự tạo'
                        helperText={serviceId ? `ID: ${serviceId}` : 'Site con dùng code này để mua hàng'}
                      />
                    )}
                  />
                </Grid2>

                <Grid2 size={{ xs: 6, sm: 2 }}>
                  <Controller
                    name='type'
                    control={control}
                    render={({ field }) => (
                      <CustomTextField {...field} fullWidth select label='Loại' error={!!errors.type} helperText={errors.type?.message}>
                        <MenuItem value='0'>Tĩnh</MenuItem>
                        <MenuItem value='1'>Xoay</MenuItem>
                      </CustomTextField>
                    )}
                  />
                </Grid2>

                <Grid2 size={{ xs: 6, sm: 2 }}>
                  <Controller
                    name='proxy_type'
                    control={control}
                    render={({ field }) => (
                      <CustomTextField {...field} fullWidth select label='Proxy Type' value={field.value || ''}>
                        <MenuItem value=''><em>—</em></MenuItem>
                        <MenuItem value='residential'>Dân cư</MenuItem>
                        <MenuItem value='datacenter'>Datacenter</MenuItem>
                      </CustomTextField>
                    )}
                  />
                </Grid2>

                <Grid2 size={{ xs: 6, sm: 2 }}>
                  <Controller
                    name='ip_version'
                    control={control}
                    render={({ field }) => (
                      <CustomTextField {...field} fullWidth select label='IP Version'>
                        {IP_VERSION_OPTIONS.map(opt => (
                          <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                        ))}
                      </CustomTextField>
                    )}
                  />
                </Grid2>

                <Grid2 size={{ xs: 6, sm: 3 }}>
                  <Controller
                    name='country'
                    control={control}
                    render={({ field }) => {
                      // Normalize: string "us" → ["us"], array giữ nguyên, filter invalid codes
                      const values: string[] = (Array.isArray(field.value) ? field.value
                        : (field.value ? field.value.split(',').map((c: string) => c.trim().toLowerCase()) : [])
                      ).filter((c: string) => c.length >= 2)
                      return (
                        <CustomTextField
                          select fullWidth label='Quốc gia'
                          value={values}
                          onChange={(e: any) => field.onChange(e.target.value)}
                          slotProps={{
                            select: {
                              multiple: true,
                              MenuProps,
                              renderValue: (selected: any) => {
                                const vals = selected as string[]
                                if (!vals?.length) return <em>— Chọn —</em>
                                return (
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                                    {vals.map(code => (
                                      <span key={code} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, background: '#f1f5f9', borderRadius: 4, padding: '1px 6px', fontSize: '11px' }}>
                                        <img src={`https://flagcdn.com/w20/${code}.png`} alt='' style={{ width: 16, height: 11 }} />
                                        {code.toUpperCase()}
                                      </span>
                                    ))}
                                  </div>
                                )
                              }
                            }
                          }}
                        >
                          {(countries || []).map((c: any) => (
                            <MenuItem key={c.code} value={c.code.toLowerCase()}>
                              <img src={`https://flagcdn.com/w20/${c.code.toLowerCase()}.png`} alt='' style={{ width: 20, height: 15, marginRight: 8 }} />
                              {c.name}
                            </MenuItem>
                          ))}
                        </CustomTextField>
                      )
                    }}
                  />
                </Grid2>

                <Grid2 size={{ xs: 12, sm: 4 }}>
                  <Controller
                    name='protocols'
                    control={control}
                    render={({ field }) => (
                      <CustomTextField
                        select
                        fullWidth
                        label='Giao thức'
                        value={field.value || []}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        name={field.name}
                        error={!!errors.protocols}
                        helperText={errors.protocols?.message}
                        slotProps={{
                          select: {
                            multiple: true,
                            MenuProps,
                            renderValue: selected => {
                              const values = selected as unknown as string[]

                              if (!values || values.length === 0) return <em>Chọn giao thức</em>
                              
return (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                  {values.map(val => {
                                    const p = PROTOCOLS.find(p => p.value === val)

                                    
return <Chip key={val} label={p?.label || val} size='small' />
                                  })}
                                </div>
                              )
                            }
                          }
                        }}
                      >
                        {PROTOCOLS.map(protocol => (
                          <MenuItem key={protocol.value} value={protocol.value}>
                            {protocol.label}
                          </MenuItem>
                        ))}
                      </CustomTextField>
                    )}
                  />
                </Grid2>

                {/* Tags */}
                <Grid2 size={{ xs: 12, sm: 4 }}>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: 6 }}>Tag sản phẩm</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {PREDEFINED_TAGS.map(preset => {
                        const tags = watchedTag ? watchedTag.split(',').map((t: string) => t.trim()) : []
                        const isActive = tags.includes(preset)
                        const style = getTagStyle(preset)

                        return (
                          <div key={preset} onClick={() => toggleTag(preset)} style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            padding: '4px 12px', borderRadius: 6, cursor: 'pointer',
                            fontSize: '12px', fontWeight: 600, transition: 'all 0.15s ease',
                            background: isActive ? (style.gradient || style.bgColor) : '#f8fafc',
                            color: isActive ? style.textColor : '#64748b',
                            border: isActive ? `1px solid ${style.borderColor}` : '1px solid #e2e8f0',
                            transform: isActive ? 'scale(1.05)' : 'scale(1)',
                          }}>
                            {style.icon && <span style={{ fontSize: '11px' }}>{style.icon}</span>}
                            {preset}
                          </div>
                        )
                      })}
                    </div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: 4 }}>Nhấn để chọn/bỏ chọn</div>
                  </div>
                </Grid2>

                {/* Switches */}
                <Grid2 size={{ xs: 12, sm: 6 }}>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center', padding: '8px 14px', background: 'white', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <Controller
                      name='status'
                      control={control}
                      render={({ field }) => (
                        <FormControlLabel
                          control={<Switch size='small' checked={field.value === 'active'} onChange={e => field.onChange(e.target.checked ? 'active' : 'inactive')} color='success' />}
                          label={<Typography variant='body2' fontWeight={600} fontSize='12px'>{watchedStatus === 'active' ? 'Hiển thị' : 'Đang ẩn'}</Typography>}
                          sx={{ ml: 0, mr: 0 }}
                        />
                      )}
                    />
                    <Controller
                      name='is_purchasable'
                      control={control}
                      render={({ field }) => (
                        <FormControlLabel
                          control={<Switch size='small' checked={field.value !== false} onChange={e => field.onChange(e.target.checked)} color='primary' />}
                          label={<Typography variant='body2' fontWeight={600} fontSize='12px'>{field.value !== false ? 'Cho phép mua' : 'Tạm ngừng'}</Typography>}
                          sx={{ ml: 0, mr: 0 }}
                        />
                      )}
                    />
                  </div>
                </Grid2>

                {/* Min/Max số lượng proxy */}
                <Grid2 size={{ xs: 6, sm: 3 }}>
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
                        label='Tối thiểu'
                        helperText='Số proxy tối thiểu mỗi lần mua'
                        slotProps={{ input: { inputProps: { min: 1 } } }}
                      />
                    )}
                  />
                </Grid2>
                <Grid2 size={{ xs: 6, sm: 3 }}>
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
                        label='Tối đa'
                        helperText='Số proxy tối đa mỗi lần mua'
                        slotProps={{ input: { inputProps: { min: 1 } } }}
                      />
                    )}
                  />
                </Grid2>

                {/* Mô tả ngắn */}
                <Grid2 size={{ xs: 12 }}>
                  <Controller
                    name='note'
                    control={control}
                    render={({ field }) => (
                      <CustomTextField
                        {...field}
                        value={field.value || ''}
                        fullWidth
                        multiline
                        rows={2}
                        label='Mô tả ngắn'
                        placeholder='Mô tả ngắn về sản phẩm (hiển thị dưới tên sản phẩm trên card)'
                        inputProps={{ maxLength: 500 }}
                        helperText={`${(field.value || '').replace(/<[^>]+>/g, '').length}/500 ký tự`}
                        sx={{ '& .MuiInputBase-inputMultiline': { resize: 'vertical' } }}
                      />
                    )}
                  />
                </Grid2>
              </Grid2>
              </div>

              {/* ========== Section: Tự động xoay IP (chỉ Rotating) ========== */}
              {watchedType === '1' && (
              <CollapsibleSection title='Tự động xoay IP' icon={RefreshCw} iconColor='#f59e0b' iconBg='#fffbeb'>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Switch
                    checked={!!watchedRotationInterval}
                    onChange={e => {
                      const field = control._fields?.rotation_interval
                      if (e.target.checked) {
                        setValue('rotation_interval', '60')
                      } else {
                        setValue('rotation_interval', '')
                      }
                    }}
                    size='small'
                    color='warning'
                  />
                  {watchedRotationInterval ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Typography sx={{ fontSize: 13, color: '#1e293b' }}>Xoay mỗi</Typography>
                      <Controller name='rotation_interval' control={control} render={({ field: { value, onChange, ...field } }) => {
                        const presets = ['30', '60', '120', '300', '600', '1800', '3600']
                        const strVal = String(value || '60')
                        const isCustom = strVal && !presets.includes(strVal)
                        const fmt = (s: number) => s >= 3600 ? (s / 3600) + ' giờ' : s >= 60 ? (s / 60) + ' phút' : s + ' giây'
                        return (
                          <CustomTextField {...field} value={strVal} onChange={(e: any) => onChange(e.target.value)} select size='small' sx={{ width: 140 }}>
                            <MenuItem value='30'>30 giây</MenuItem>
                            <MenuItem value='60'>1 phút</MenuItem>
                            <MenuItem value='120'>2 phút</MenuItem>
                            <MenuItem value='300'>5 phút</MenuItem>
                            <MenuItem value='600'>10 phút</MenuItem>
                            <MenuItem value='1800'>30 phút</MenuItem>
                            <MenuItem value='3600'>1 giờ</MenuItem>
                            {isCustom && <MenuItem value={strVal}>{fmt(Number(strVal))}</MenuItem>}
                          </CustomTextField>
                        )
                      }} />
                    </Box>
                  ) : (
                    <Typography sx={{ fontSize: 13, color: '#94a3b8' }}>Tắt — hệ thống không tự xoay IP</Typography>
                  )}
                </Box>
              </CollapsibleSection>
              )}

              {/* ========== Section: Thông số sản phẩm ========== */}
              <CollapsibleSection title='Thông số sản phẩm' icon={Zap} iconColor='#22c55e' iconBg='#f0fdf4'>
              <Grid2 container spacing={1}>
                <Grid2 size={{ xs: 6, sm: 3 }}>
                  <Controller
                    name='auth_type'
                    control={control}
                    render={({ field }) => {
                      // Site con: không được nới rộng hơn auth_type site mẹ
                      const locked = isChild && !!providerAuthType && providerAuthType !== 'both'
                      return (
                        <CustomTextField
                          {...field} fullWidth select label='Xác thực' value={field.value || ''}
                          disabled={locked}
                          helperText={locked ? `Site mẹ bắt buộc: ${providerAuthType === 'ip_whitelist' ? 'IP Whitelist' : 'User:Pass'}` : undefined}
                        >
                          {isChild && providerAuthType === 'both' ? (
                            // Site mẹ cho chọn cả 2 → site con được thu hẹp
                            [
                              <MenuItem key='both' value='both'>User:Pass + IP (giữ nguyên)</MenuItem>,
                              <MenuItem key='userpass' value='userpass'>Chỉ User:Pass</MenuItem>,
                              <MenuItem key='ip_whitelist' value='ip_whitelist'>Chỉ IP Whitelist</MenuItem>,
                            ]
                          ) : (
                            [
                              <MenuItem key='' value=''><em>—</em></MenuItem>,
                              <MenuItem key='userpass' value='userpass'>User:Pass</MenuItem>,
                              <MenuItem key='ip_whitelist' value='ip_whitelist'>IP Whitelist</MenuItem>,
                              <MenuItem key='both' value='both'>User:Pass + IP</MenuItem>,
                            ]
                          )}
                        </CustomTextField>
                      )
                    }}
                  />
                </Grid2>

                {/* User:Pass mode — cho admin chọn + preview */}
                {(watchedAuthType === 'userpass' || watchedAuthType === 'both') && (
                  <Grid2 size={{ xs: 12 }}>
                    <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: '12px 14px', background: '#fafbfc' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>User:Pass cho khách hàng</div>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                      <button
                        type='button'
                        onClick={() => setAllowCustomAuth(false)}
                        style={{
                          padding: '6px 14px', fontSize: '12px', fontWeight: 600, borderRadius: 8, border: '1.5px solid',
                          cursor: 'pointer', transition: 'all 0.15s',
                          background: !allowCustomAuth ? '#1e293b' : '#fff',
                          color: !allowCustomAuth ? '#fff' : '#64748b',
                          borderColor: !allowCustomAuth ? '#1e293b' : '#e2e8f0',
                        }}
                      >
                        Random tự động
                      </button>
                      <button
                        type='button'
                        onClick={() => setAllowCustomAuth(true)}
                        style={{
                          padding: '6px 14px', fontSize: '12px', fontWeight: 600, borderRadius: 8, border: '1.5px solid',
                          cursor: 'pointer', transition: 'all 0.15s',
                          background: allowCustomAuth ? '#1e293b' : '#fff',
                          color: allowCustomAuth ? '#fff' : '#64748b',
                          borderColor: allowCustomAuth ? '#1e293b' : '#e2e8f0',
                        }}
                      >
                        Khách tự nhập
                      </button>
                    </div>
                    {/* Preview — admin thấy user sẽ nhìn thấy gì */}
                    <div style={{ padding: '8px 12px', borderRadius: 8, fontSize: '12px', border: '1px solid', background: allowCustomAuth ? '#eff6ff' : '#f0fdf4', borderColor: allowCustomAuth ? '#bfdbfe' : '#bbf7d0' }}>
                      {allowCustomAuth ? (
                        <div>
                          <strong style={{ color: '#1e40af' }}>Khách sẽ thấy:</strong> 2 ô nhập Username + Password tùy chọn
                          <div style={{ color: '#64748b', marginTop: 2 }}>Khách có thể tự đặt user:pass hoặc để trống (hệ thống random)</div>
                        </div>
                      ) : (
                        <div>
                          <strong style={{ color: '#166534' }}>Khách sẽ thấy:</strong> 🔑 User:Pass được tạo tự động sau khi mua
                          <div style={{ color: '#64748b', marginTop: 2 }}>Không hiện input — hệ thống tự sinh user:pass random</div>
                        </div>
                      )}
                    </div>
                    </div>
                  </Grid2>
                )}

                {/* IP Whitelist mode — bắt buộc hay không */}
                {(watchedAuthType === 'ip_whitelist' || watchedAuthType === 'both') && (
                  <Grid2 size={{ xs: 12 }}>
                    <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: '12px 14px', background: '#fafbfc' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>IP Whitelist khi mua</div>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                      <button
                        type='button'
                        onClick={() => setRequireIp(false)}
                        style={{
                          padding: '6px 14px', fontSize: '12px', fontWeight: 600, borderRadius: 8, border: '1.5px solid',
                          cursor: 'pointer', transition: 'all 0.15s',
                          background: !requireIp ? '#1e293b' : '#fff',
                          color: !requireIp ? '#fff' : '#64748b',
                          borderColor: !requireIp ? '#1e293b' : '#e2e8f0',
                        }}
                      >
                        Tùy chọn
                      </button>
                      <button
                        type='button'
                        onClick={() => setRequireIp(true)}
                        style={{
                          padding: '6px 14px', fontSize: '12px', fontWeight: 600, borderRadius: 8, border: '1.5px solid',
                          cursor: 'pointer', transition: 'all 0.15s',
                          background: requireIp ? '#1e293b' : '#fff',
                          color: requireIp ? '#fff' : '#64748b',
                          borderColor: requireIp ? '#1e293b' : '#e2e8f0',
                        }}
                      >
                        Bắt buộc
                      </button>
                    </div>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 8 }}>
                      <div style={{ fontSize: '12px', color: '#475569' }}>Số IP tối đa:</div>
                      <select value={maxIps} onChange={e => setMaxIps(Number(e.target.value))} style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: '12px' }}>
                        {[1, 2, 3, 5, 10].filter(n => !isChild || !providerMaxIps || n <= providerMaxIps).map(n => <option key={n} value={n}>{n} IP</option>)}
                      </select>
                      {isChild && providerMaxIps && <span style={{ fontSize: '11px', color: '#94a3b8' }}>(site mẹ tối đa {providerMaxIps})</span>}
                    </div>
                    <div style={{ padding: '8px 12px', borderRadius: 8, fontSize: '12px', border: '1px solid', background: requireIp ? '#fef2f2' : '#f0fdf4', borderColor: requireIp ? '#fecaca' : '#bbf7d0' }}>
                      {requireIp ? (
                        <div>
                          <strong style={{ color: '#dc2626' }}>Bắt buộc:</strong> Khách phải nhập IP whitelist khi mua
                          <div style={{ color: '#64748b', marginTop: 2 }}>Không nhập IP → không thể mua. Tối đa {maxIps} IP, cách nhau bởi dấu phẩy.</div>
                        </div>
                      ) : (
                        <div>
                          <strong style={{ color: '#166534' }}>Tùy chọn:</strong> Khách có thể nhập IP hoặc bỏ qua
                          <div style={{ color: '#64748b', marginTop: 2 }}>Tối đa {maxIps} IP, cách nhau bởi dấu phẩy.</div>
                        </div>
                      )}
                    </div>
                    </div>
                  </Grid2>
                )}

                {/* ═══ Gia hạn settings ═══ */}
                <Grid2 size={{ xs: 12 }}>
                  <Box sx={{ border: '1px solid #fcd34d', borderTop: '3px solid #f59e0b', borderRadius: 2, overflow: 'hidden' }}>
                    <Box sx={{ background: '#fffbeb', borderBottom: '1px solid #fde68a', px: 2, py: 1.25 }}>
                      <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#d97706' }}>
                        Gia hạn
                      </Typography>
                      <Typography sx={{ fontSize: 12, color: '#475569', mt: 0.25 }}>
                        Cho phép khách hàng gia hạn proxy khi sắp hoặc đã hết hạn.
                      </Typography>
                    </Box>
                    <Box sx={{ p: 2 }}>
                      {/* Hướng dẫn nhanh */}
                      <Box sx={{ mb: 2, p: 1.5, background: '#fefce8', border: '1px solid #fde68a', borderRadius: 1.5 }}>
                        <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#854d0e', mb: 0.5 }}>Hướng dẫn cấu hình gia hạn</Typography>
                        <Box component='ol' sx={{ fontSize: 11.5, color: '#713f12', m: 0, pl: 2.5, lineHeight: 2, '& li::marker': { fontWeight: 700 } }}>
                          <li><strong>Bước 1 — Cấu hình NCC:</strong> Vào trang <em>Nhà cung cấp → tab Gia hạn</em> để cấu hình API gia hạn (URL, params, duration_param). Đây là nền tảng bắt buộc.</li>
                          <li><strong>Bước 2 — Bật gia hạn:</strong> Chọn <strong>"Cho phép gia hạn = Có"</strong> bên dưới.</li>
                          <li><strong>Bước 3 — Chọn thời hạn:</strong>
                            <Box component='ul' sx={{ pl: 2, mt: 0.25, mb: 0.5, '& li': { lineHeight: 1.8 } }}>
                              <li><strong>Theo NCC</strong> — khách nhập số ngày, có mốc giảm giá nếu cấu hình (phổ biến nhất)</li>
                              <li><strong>Như lần mua đầu</strong> — tự lấy số ngày từ đơn mua gốc, khách không cần chọn</li>
                            </Box>
                          </li>
                          <li><strong>Bước 4 — Hết hạn:</strong> Chọn có cho phép gia hạn khi proxy đã hết hạn hay chỉ khi còn hạn.</li>
                        </Box>
                        {!isChild && (
                          <Box sx={{ mt: 1, pt: 1, borderTop: '1px dashed #fbbf24', fontSize: 11, color: '#92400e', lineHeight: 1.8 }}>
                            <strong>Nâng cao (tuỳ chọn):</strong> Nếu sản phẩm này cần gửi params khác với cấu hình NCC mặc định, tick <em>"Custom thêm / ghi đè params"</em> để thêm hoặc ghi đè riêng cho SP này.
                          </Box>
                        )}
                      </Box>

                      <Grid2 container spacing={2}>
                        <Grid2 size={{ xs: 6, sm: 3 }}>
                          <CustomTextField
                            fullWidth select
                            label='Cho phép gia hạn'
                            value={renewable ? 'true' : 'false'}
                            onChange={e => setRenewable(e.target.value === 'true')}
                          >
                            <MenuItem value='false'>Không</MenuItem>
                            <MenuItem value='true'>Có</MenuItem>
                          </CustomTextField>
                        </Grid2>
                        {renewable && (
                          <>
                            <Grid2 size={{ xs: 6, sm: 3 }}>
                              <CustomTextField
                                fullWidth select
                                label='Thời hạn gia hạn'
                                value={renewalDuration}
                                onChange={e => setRenewalDuration(e.target.value)}
                                slotProps={{ select: { displayEmpty: true } }}
                                helperText={
                                  renewalDuration === 'original'
                                    ? 'Lấy từ đơn mua gốc, khách không cần chọn'
                                    : 'Khách nhập số ngày muốn gia hạn'
                                }
                              >
                                <MenuItem value='ncc'>Theo NCC — khách nhập số ngày</MenuItem>
                                <MenuItem value='original'>Như lần mua đầu — tự động</MenuItem>
                              </CustomTextField>
                            </Grid2>
                            <Grid2 size={{ xs: 6, sm: 3 }}>
                              <CustomTextField
                                fullWidth select
                                label='Gia hạn khi hết hạn'
                                value={allowExpiredRenew}
                                onChange={e => setAllowExpiredRenew(e.target.value)}
                                slotProps={{ select: { displayEmpty: true } }}
                                helperText={
                                  allowExpiredRenew === '' ? 'Tuỳ NCC cho phép hay không' :
                                  allowExpiredRenew === 'true' ? 'Proxy hết hạn vẫn gia hạn được' :
                                  'Chỉ gia hạn khi proxy còn hạn'
                                }
                              >
                                <MenuItem value=''>Theo NCC (mặc định)</MenuItem>
                                <MenuItem value='true'>Cho phép</MenuItem>
                                <MenuItem value='false'>Không cho phép</MenuItem>
                              </CustomTextField>
                            </Grid2>

                            {/* Tóm tắt trạng thái cấu hình */}
                            <Grid2 size={{ xs: 12 }}>
                              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                <Chip size='small' variant='outlined' color='success' label='Gia hạn: BẬT' sx={{ fontSize: 11, fontWeight: 600 }} />
                                <Chip size='small' variant='outlined'
                                  label={`Thời hạn: ${renewalDuration === 'original' ? 'Theo đơn mua' : 'Khách nhập'}`}
                                  sx={{ fontSize: 11 }} />
                                <Chip size='small' variant='outlined'
                                  color={allowExpiredRenew === 'false' ? 'error' : 'default'}
                                  label={`Hết hạn: ${allowExpiredRenew === '' ? 'Theo NCC' : allowExpiredRenew === 'true' ? 'Cho phép' : 'Không cho phép'}`}
                                  sx={{ fontSize: 11 }} />
                              </Box>
                            </Grid2>

                            {/* Preview NCC renew params — chỉ site mẹ */}
                            {!isChild && (
                              <NccRenewalPreview
                                providerId={watchedProviderId}
                                providers={providers}
                                renewOverrideEnabled={renewOverrideEnabled}
                                setRenewOverrideEnabled={setRenewOverrideEnabled}
                                renewOverrideParams={renewOverrideParams}
                                setRenewOverrideParams={setRenewOverrideParams}
                              />
                            )}
                          </>
                        )}
                      </Grid2>
                    </Box>
                  </Box>
                </Grid2>

                {/* ── Thông số hiển thị — user nhìn thấy trên trang sản phẩm ── */}
                <Grid2 size={{ xs: 12 }}>
                  <Box sx={{ p: 1.5, background: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0' }}>
                    <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#475569', mb: 0.5 }}>Mô tả sản phẩm</Typography>
                    <Typography sx={{ fontSize: 11, color: '#94a3b8', mb: 1.5 }}>Hiển thị trên trang sản phẩm — chỉ để người mua tham khảo, không ảnh hưởng hệ thống</Typography>
                    <Grid2 container spacing={1}>
                      <Grid2 size={{ xs: 6, sm: 3 }}>
                        <Controller name='bandwidth' control={control} render={({ field }) => (
                          <CustomTextField {...field} fullWidth select label='Băng thông' value={field.value || ''}>
                            <MenuItem value=''><em>—</em></MenuItem>
                            <MenuItem value='unlimited'>Unlimited</MenuItem>
                            <MenuItem value='1GB'>1 GB</MenuItem>
                            <MenuItem value='5GB'>5 GB</MenuItem>
                            <MenuItem value='10GB'>10 GB</MenuItem>
                            <MenuItem value='50GB'>50 GB</MenuItem>
                            <MenuItem value='100GB'>100 GB</MenuItem>
                          </CustomTextField>
                        )} />
                      </Grid2>
                      <Grid2 size={{ xs: 6, sm: 3 }}>
                        <Controller name='request_limit' control={control} render={({ field }) => (
                          <CustomTextField {...field} fullWidth label='Giới hạn request' placeholder='—' />
                        )} />
                      </Grid2>
                      <Grid2 size={{ xs: 6, sm: 3 }}>
                        <Controller name='concurrent_connections' control={control} render={({ field }) => (
                          <CustomTextField {...field} value={field.value ?? ''} onChange={e => { field.onChange(e.target.value === '' ? null : Number(e.target.value)) }} fullWidth type='number' label='Kết nối đồng thời' placeholder='—' />
                        )} />
                      </Grid2>
                      {watchedType === '1' && (
                        <>
                          <Grid2 size={{ xs: 6, sm: 3 }}>
                            <Controller name='rotation_type' control={control} render={({ field }) => (
                              <CustomTextField {...field} fullWidth select label='Kiểu xoay' value={field.value || ''}>
                                <MenuItem value=''><em>—</em></MenuItem>
                                <MenuItem value='sticky'>Giữ IP cố định (Sticky)</MenuItem>
                                <MenuItem value='time_based'>Đổi IP theo thời gian</MenuItem>
                              </CustomTextField>
                            )} />
                          </Grid2>
                          <Grid2 size={{ xs: 6, sm: 3 }}>
                            <Controller name='pool_size' control={control} render={({ field }) => (
                              <CustomTextField {...field} fullWidth label='Pool size' placeholder='—' />
                            )} />
                          </Grid2>
                        </>
                      )}
                    </Grid2>
                  </Box>
                </Grid2>

                <PurchaseOptionsSection
                  options={purchaseOptions}
                  onChange={setPurchaseOptions}
                  control={control}
                  errors={errors}
                  countries={countries}
                />

                {/* Lưu thêm dữ liệu từ nhà cung cấp — per sản phẩm */}
                <Grid2 size={{ xs: 12 }}>
                  <Box sx={{ mt: 1, p: 1.5, background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 1.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                      <Box>
                        <Typography variant='body2' fontWeight={600} sx={{ fontSize: 13, color: '#0c4a6e' }}>
                          Ánh xạ dữ liệu — ghi đè cho riêng sản phẩm này
                        </Typography>
                        <Typography sx={{ fontSize: 11.5, color: '#475569', mt: 0.5, lineHeight: 1.6 }}>
                          Khi mua SP này, hệ thống đọc thêm field từ response NCC → lưu vào DB. <strong>Ghi đè</strong> cấu hình mặc định NCC nếu trùng.
                          <br />
                          Để trống = dùng cấu hình mặc định trong trang NCC (tab Mua proxy → bước 4).
                        </Typography>
                      </Box>
                      <Button size='small' startIcon={<Plus size={14} />} onClick={() => setResponseMappingRows(prev => [...prev, { from: '', to: '', store: 'metadata' }])}>
                        Thêm
                      </Button>
                    </Box>
                    {responseMappingRows.length === 0 && (
                      <Typography variant='caption' color='text.secondary' sx={{ fontStyle: 'italic' }}>
                        Chưa có. Bấm "Thêm" nếu sản phẩm này cần lưu thêm dữ liệu riêng (khác mặc định nhà cung cấp).
                      </Typography>
                    )}
                    {responseMappingRows.map((row, i) => (
                      <Box key={i} sx={{ display: 'flex', gap: 1, mb: 0.5, alignItems: 'center' }}>
                        <CustomTextField
                          size='small' value={row.from}
                          onChange={e => { const next = [...responseMappingRows]; next[i] = { ...next[i], from: e.target.value }; setResponseMappingRows(next) }}
                          placeholder='Trường NCC trả về (VD: data.region)'
                          sx={{ flex: 1 }}
                        />
                        <CustomTextField
                          size='small' value={row.to}
                          onChange={e => { const next = [...responseMappingRows]; next[i] = { ...next[i], to: e.target.value }; setResponseMappingRows(next) }}
                          placeholder='Tên lưu trong hệ thống (VD: region)'
                          sx={{ flex: 1 }}
                        />
                        <CustomTextField
                          size='small' select value={row.store}
                          onChange={e => { const next = [...responseMappingRows]; next[i] = { ...next[i], store: e.target.value as any }; setResponseMappingRows(next) }}
                          sx={{ minWidth: 220 }}
                        >
                          <MenuItem value='metadata'>Thông tin thêm (xem trong chi tiết)</MenuItem>
                          <MenuItem value='proxy'>Gắn vào proxy (hiện cùng IP/Port)</MenuItem>
                        </CustomTextField>
                        <IconButton size='small' color='error' onClick={() => setResponseMappingRows(prev => prev.filter((_, idx) => idx !== i))}>
                          <Trash2 size={14} />
                        </IconButton>
                      </Box>
                    ))}
                  </Box>
                </Grid2>
              </Grid2>
              </CollapsibleSection>

              {/* ========== Section: Cấu hình API (nhà cung cấp) ========== */}
              <CollapsibleSection title='Cấu hình Provider' icon={Globe} iconColor='#16a34a' iconBg='#f0fdf4'>
                <Grid2 container spacing={1}>
                  <Grid2 size={{ xs: 6, sm: 4 }}>
                    <Controller
                      name='api_provider'
                      control={control}
                      render={({ field }) => (
                        <CustomTextField {...field} fullWidth label='API Endpoint' placeholder='URL đối tác' />
                      )}
                    />
                  </Grid2>
                  <Grid2 size={{ xs: 12 }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <Button onClick={() => setIsMultiInputModalOpen(true)} variant='contained' color='secondary' size='small' className='text-white' startIcon={<Plus size={14} />}>
                        Thêm nhiều trường
                      </Button>
                    </div>
                  </Grid2>
                </Grid2>
              </CollapsibleSection>

              {/* ========== Section: Chế độ giá ========== */}
              <CollapsibleSection title='Chế độ giá' icon={DollarSign} iconColor='#d97706' iconBg='#fffbeb' border='1px solid #e2e8f0'>
                <Grid2 container spacing={2}>
                  <Grid2 size={{ xs: 12, sm: 4 }}>
                    <CustomTextField
                      select
                      fullWidth
                      size='small'
                      label='Pricing mode'
                      value={pricingMode}
                      onChange={(e) => {
                        const mode = e.target.value as 'fixed' | 'per_unit'

                        setPricingMode(mode)

                        // Đổi về fixed mà chưa có mốc giá → tạo mặc định
                        if (mode === 'fixed' && priceFields.filter(f => f.key && f.value).length === 0) {
                          setPriceFields([
                            { key: '1', value: '', cost: '' },
                            { key: '7', value: '', cost: '' },
                            { key: '30', value: '', cost: '' },
                          ])
                        }
                      }}
                    >
                      <MenuItem value='fixed'>Mốc cố định</MenuItem>
                      <MenuItem value='per_unit'>Nhập tự do (per unit)</MenuItem>
                    </CustomTextField>
                  </Grid2>

                  {pricingMode === 'per_unit' && (
                    <>
                      <Grid2 size={{ xs: 12, sm: 2.5 }}>
                        <CustomTextField
                          select
                          fullWidth
                          size='small'
                          label='Đơn vị'
                          value={timeUnit}
                          onChange={(e) => setTimeUnit(e.target.value as 'day' | 'month')}
                        >
                          <MenuItem value='day'>Ngày</MenuItem>
                          <MenuItem value='month'>Tháng</MenuItem>
                        </CustomTextField>
                      </Grid2>
                      <Grid2 size={{ xs: 12, sm: 2.5 }}>
                        <CustomTextField
                          fullWidth
                          size='small'
                          type='number'
                          label={`Giá bán/${timeUnit === 'month' ? 'tháng' : 'ngày'}`}
                          value={pricePerUnit}
                          onChange={(e) => setPricePerUnit(e.target.value)}
                        />
                      </Grid2>
                      <Grid2 size={{ xs: 12, sm: 2.5 }}>
                        <CustomTextField
                          fullWidth
                          size='small'
                          type='number'
                          label={`Giá vốn/${timeUnit === 'month' ? 'tháng' : 'ngày'}`}
                          value={costPerUnit}
                          onChange={(e) => setCostPerUnit(e.target.value)}
                        />
                      </Grid2>
                    </>
                  )}

                  {/* Chiết khấu theo khoảng ngày */}
                  {pricingMode === 'per_unit' && (
                    <Grid2 size={{ xs: 12 }}>
                      <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: '12px 14px', background: '#fafbfc' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>Chiết khấu giá BÁN theo số {timeUnit === 'month' ? 'tháng' : 'ngày'}</div>
                            <div style={{ fontSize: '11px', color: '#64748b', lineHeight: 1.5 }}>Giảm giá bán cho <strong>khách thường + site con</strong> khi mua nhiều {timeUnit === 'month' ? 'tháng' : 'ngày'}. Không áp cho đại lý.{parseInt(pricePerUnit) > 0 && <><br/>VD: Giá bán {parseInt(pricePerUnit).toLocaleString('vi-VN')}đ, giảm 10% → khách trả {Math.round(parseInt(pricePerUnit) * 0.9).toLocaleString('vi-VN')}đ/{timeUnit === 'month' ? 'tháng' : 'ngày'}.</>}</div>
                          </div>
                          <Button
                            size='small' variant='outlined'
                            onClick={() => setDiscountTiers(prev => [...prev, { min: '', max: '', discount: '' }])}
                            sx={{ fontSize: '11px', textTransform: 'none' }}
                          >
                            + Thêm mức
                          </Button>
                        </div>

                        {discountTiers.length === 0 && (
                          <div style={{ fontSize: '12px', color: '#94a3b8', textAlign: 'center', padding: '8px 0' }}>
                            Chưa có chiết khấu — khách thường trả full đơn giá bán bất kể số {timeUnit === 'month' ? 'tháng' : 'ngày'}.
                          </div>
                        )}

                        {discountTiers.length > 0 && (
                          <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: parseFloat(costPerUnit) > 0 ? '1fr 1fr 1fr 1fr 80px 40px' : '1fr 1fr 1fr 1fr 40px', gap: '6px', background: '#f1f5f9', padding: '6px 10px', fontSize: '11px', fontWeight: 600, color: '#64748b' }}>
                              <span>Từ ({timeUnit === 'month' ? 'tháng' : 'ngày'})</span>
                              <span>Đến ({timeUnit === 'month' ? 'tháng' : 'ngày'})</span>
                              <span>Giảm (%)</span>
                              <span>Bán sau giảm</span>
                              {parseFloat(costPerUnit) > 0 && <span>Lãi/lỗ</span>}
                              <span></span>
                            </div>
                            {discountTiers.map((tier, idx) => (
                              <DiscountTierRow key={idx} tier={tier} idx={idx} basePrice={parseFloat(pricePerUnit) || 0}
                                baseCost={parseFloat(costPerUnit) || 0} costTiers={costDiscountTiers}
                                color='#16a34a'
                                onUpdate={(i, tier) => setDiscountTiers(prev => prev.map((t, j) => j === i ? tier : t))}
                                onRemove={(i) => setDiscountTiers(prev => prev.filter((_, j) => j !== i))} />
                            ))}
                          </div>
                        )}

                        {/* Preview cho admin */}
                        {discountTiers.length > 0 && parseFloat(pricePerUnit) > 0 && (
                          <div style={{ marginTop: 8, padding: '8px 10px', background: '#eff6ff', borderRadius: 8, border: '1px solid #bfdbfe', fontSize: '11.5px', color: '#1e40af' }}>
                            <strong>Khách sẽ thấy khi nhập số {timeUnit === 'month' ? 'tháng' : 'ngày'}:</strong>
                            {discountTiers.filter(t => t.min && (t.discount || t.price)).map((t, i) => {
                              const base = parseFloat(pricePerUnit) || 0
                              const disc = parseFloat(t.discount) || 0
                              // Dùng giá lưu trực tiếp nếu có, không tính ngược từ %
                              const price = t.price ? parseVN(t.price) : Math.round(base * (1 - disc / 100) * 100) / 100

                              return (
                                <span key={i}>
                                  {' '}{i > 0 ? '· ' : ''}{t.min}{t.max ? `-${t.max}` : '+'} {timeUnit === 'month' ? 'tháng' : 'ngày'}: <strong>{formatVN(price)}đ (-{disc}%)</strong>
                                </span>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    </Grid2>
                  )}

                  {/* Chiết khấu giá GỐC Provider theo khoảng ngày */}
                  {pricingMode === 'per_unit' && parseFloat(costPerUnit) > 0 && (
                    <Grid2 size={{ xs: 12 }}>
                      <div style={{ border: '1px solid #fde68a', borderRadius: 10, padding: '12px 14px', background: '#fffbeb' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: '#92400e' }}>Chiết khấu giá GỐC (Provider) theo số {timeUnit === 'month' ? 'tháng' : 'ngày'}</div>
                            <div style={{ fontSize: '11px', color: '#92400e', lineHeight: 1.5 }}>Chỉ áp cho <strong>đại lý (reseller)</strong>. Nhập chính sách giá từ Provider — giá vốn giảm khi mua nhiều {timeUnit === 'month' ? 'tháng' : 'ngày'}.{parseFloat(costPerUnit) > 0 && <><br/>VD: Gốc {parseFloat(costPerUnit).toLocaleString('vi-VN')}đ, giảm 20% → vốn {Math.round(parseFloat(costPerUnit) * 0.8).toLocaleString('vi-VN')}đ, đại lý +15% → trả {Math.round(parseFloat(costPerUnit) * 0.8 * 1.15).toLocaleString('vi-VN')}đ/{timeUnit === 'month' ? 'tháng' : 'ngày'}.</>}</div>
                          </div>
                          <Button
                            size='small' variant='outlined' color='warning'
                            onClick={() => setCostDiscountTiers(prev => [...prev, { min: '', max: '', discount: '' }])}
                            sx={{ fontSize: '11px', textTransform: 'none' }}
                          >
                            + Thêm mức
                          </Button>
                        </div>

                        {costDiscountTiers.length === 0 && (
                          <div style={{ fontSize: '12px', color: '#b45309', textAlign: 'center', padding: '8px 0' }}>
                            Chưa có chiết khấu Provider — đại lý mua với giá gốc cố định ({parseFloat(costPerUnit) > 0 ? `${parseFloat(costPerUnit).toLocaleString('vi-VN')}đ` : '...'} × markup%) bất kể số {timeUnit === 'month' ? 'tháng' : 'ngày'}.
                          </div>
                        )}

                        {costDiscountTiers.length > 0 && (
                          <div style={{ border: '1px solid #fde68a', borderRadius: 8, overflow: 'hidden' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 40px', gap: '6px', background: '#fef3c7', padding: '6px 10px', fontSize: '11px', fontWeight: 600, color: '#92400e' }}>
                              <span>Từ ({timeUnit === 'month' ? 'tháng' : 'ngày'})</span>
                              <span>Đến ({timeUnit === 'month' ? 'tháng' : 'ngày'})</span>
                              <span>Giảm (%)</span>
                              <span>Gốc sau giảm</span>
                              <span></span>
                            </div>
                            {costDiscountTiers.map((tier, idx) => (
                              <DiscountTierRow key={idx} tier={tier} idx={idx} basePrice={parseFloat(costPerUnit) || 0}
                                color='#d97706'
                                onUpdate={(i, tier) => setCostDiscountTiers(prev => prev.map((t, j) => j === i ? tier : t))}
                                onRemove={(i) => setCostDiscountTiers(prev => prev.filter((_, j) => j !== i))} />
                            ))}
                          </div>
                        )}
                      </div>
                    </Grid2>
                  )}

                  {/* Khi per_unit: hiện mốc giá cũ đã lưu (read-only) */}
                  {pricingMode === 'per_unit' && priceFields.filter(f => f.key && f.value).length > 0 && (
                    <Grid2 size={{ xs: 12 }}>
                      <div style={{ fontSize: '11.5px', color: '#94a3b8', padding: '6px 10px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                        Có {priceFields.filter(f => f.key && f.value).length} mốc giá cố định đã lưu trước đó — sẽ được giữ lại để dùng khi đổi về "Mốc cố định"
                      </div>
                    </Grid2>
                  )}

                  {/* Fixed mode: bảng mốc giá inline */}
                  {pricingMode === 'fixed' && (
                    <Grid2 size={{ xs: 12 }}>
                      <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '8px 12px', borderBottom: '1px solid #e2e8f0' }}>
                          <span style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>Mốc giá theo thời gian</span>
                          <Button size='small' startIcon={<Plus size={13} />}
                            onClick={() => setPriceFields(prev => [...prev, { key: '', value: '', cost: '' }])}
                            disabled={priceFields.length >= durationOptions.length}
                          >Thêm mốc</Button>
                        </div>
                        {priceFields.map((field, index) => {
                          const qtyTiers = field.quantity_tiers || []
                          const hasQtyTiers = qtyTiers.length > 0
                          const sellPrice = parseFloat(field.value) || 0
                          const costPrice = parseFloat(field.cost || '') || 0
                          const profit = sellPrice && costPrice ? sellPrice - costPrice : 0
                          const profitPct = costPrice > 0 ? ((profit / costPrice) * 100) : 0
                          const profitColor = profit > 0 ? '#16a34a' : profit < 0 ? '#ef4444' : '#94a3b8'
                          return (
                            <div key={index} style={{ borderBottom: '1px solid #e2e8f0', padding: '10px 12px' }}>
                              {/* Row 1: inputs */}
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'flex-end' }}>
                                <div style={{ flex: '0 0 auto' }}>
                                  <div style={{ fontSize: '10px', color: '#64748b', marginBottom: 2 }}>Thời gian</div>
                                  <CustomTextField size='small' select value={field.key} onChange={(e: any) => {
                                    setPriceFields(prev => prev.map((f, i) => i === index ? { ...f, key: e.target.value } : f))
                                  }} slotProps={{ select: { displayEmpty: true } }} sx={{ minWidth: 110 }}>
                                    <MenuItem value=''><em>Chọn</em></MenuItem>
                                    {durationOptions
                                      .filter(o => o.value === field.key || !priceFields.some(f => f.key === o.value))
                                      .map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
                                  </CustomTextField>
                                </div>
                                <div style={{ flex: '0 1 120px', minWidth: 80 }}>
                                  <div style={{ fontSize: '10px', color: '#64748b', marginBottom: 2 }}>Giá bán</div>
                                  <CustomTextField size='small' type='number' placeholder='đ' value={field.value} fullWidth
                                    onChange={(e: any) => setPriceFields(prev => prev.map((f, i) => i === index ? { ...f, value: e.target.value } : f))} />
                                </div>
                                <div style={{ flex: '0 1 120px', minWidth: 80 }}>
                                  <div style={{ fontSize: '10px', color: '#64748b', marginBottom: 2 }}>Giá vốn</div>
                                  <CustomTextField size='small' type='number' placeholder='đ' value={field.cost || ''} fullWidth
                                    onChange={(e: any) => setPriceFields(prev => prev.map((f, i) => i === index ? { ...f, cost: e.target.value } : f))} />
                                </div>
                                {/* Profit badge */}
                                {sellPrice > 0 && costPrice > 0 ? (
                                  <span style={{ fontSize: '11px', fontWeight: 600, color: profitColor, background: profit > 0 ? '#f0fdf4' : profit < 0 ? '#fef2f2' : '#f8fafc', borderRadius: 4, padding: '3px 8px', whiteSpace: 'nowrap', lineHeight: 1.4 }}>
                                    {profit > 0 ? '+' : ''}{profit.toLocaleString('vi-VN')}đ ({profitPct > 0 ? '+' : ''}{profitPct.toFixed(1)}%)
                                  </span>
                                ) : null}
                                <Button size='small' variant={hasQtyTiers ? 'contained' : 'outlined'} color={hasQtyTiers ? 'success' : 'inherit'}
                                  sx={{ fontSize: '10px', minWidth: 0, px: 1, py: 0.3, flex: '0 0 auto' }}
                                  onClick={() => {
                                    if (!hasQtyTiers) {
                                      setPriceFields(prev => prev.map((f, i) => i === index ? { ...f, quantity_tiers: [{ min: '', max: '', price: '', cost: '' }] } : f))
                                    } else {
                                      setPriceFields(prev => prev.map((f, i) => i === index ? { ...f, quantity_tiers: [] } : f))
                                    }
                                  }}>
                                  {hasQtyTiers ? `${qtyTiers.length} mức` : '+ SL'}
                                </Button>
                                {priceFields.length > 1 && (
                                  <IconButton size='small' color='error' sx={{ p: '2px', flex: '0 0 auto' }}
                                    onClick={() => setPriceFields(prev => prev.filter((_, i) => i !== index))}>
                                    <X size={14} />
                                  </IconButton>
                                )}
                              </div>
                              {/* Row 2: URL */}
                              {field.key && durationUrlMap[field.key] && (
                                <a href={durationUrlMap[field.key]} target='_blank' rel='noopener noreferrer'
                                  style={{ display: 'inline-block', fontSize: '11px', color: '#6366f1', marginTop: 6, textDecoration: 'none', wordBreak: 'break-all', lineHeight: 1.4 }}>
                                  ↗ {durationUrlMap[field.key]}
                                </a>
                              )}
                              {/* Sub-rows: qty tiers */}
                              {hasQtyTiers && (
                                <div style={{ background: '#fafbfc', borderTop: '1px dashed #e2e8f0', padding: '6px 12px 8px 16px', marginTop: 6, borderRadius: '0 0 6px 6px' }}>
                                  <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 600, marginBottom: 4 }}>Giảm giá theo số lượng:</div>
                                  {qtyTiers.map((qt, qIdx) => {
                                    const qtSell = parseFloat(qt.price) || 0
                                    const qtCost = parseFloat(qt.cost) || 0
                                    const qtProfit = qtSell && qtCost ? qtSell - qtCost : 0
                                    return (
                                    <div key={qIdx} style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', marginBottom: 4 }}>
                                      <CustomTextField size='small' type='number' placeholder='Từ SL' value={qt.min}
                                        onChange={(e: any) => setPriceFields(prev => prev.map((f, i) => i === index ? {
                                          ...f, quantity_tiers: (f.quantity_tiers || []).map((t, j) => j === qIdx ? { ...t, min: e.target.value } : t)
                                        } : f))} sx={{ width: 70, '& input': { fontSize: '11px', p: '4px 8px' } }} />
                                      <span style={{ fontSize: '10px', color: '#94a3b8' }}>→</span>
                                      <CustomTextField size='small' type='number' placeholder='Đến SL' value={qt.max}
                                        onChange={(e: any) => setPriceFields(prev => prev.map((f, i) => i === index ? {
                                          ...f, quantity_tiers: (f.quantity_tiers || []).map((t, j) => j === qIdx ? { ...t, max: e.target.value } : t)
                                        } : f))} sx={{ width: 70, '& input': { fontSize: '11px', p: '4px 8px' } }} />
                                      <CustomTextField size='small' type='number' placeholder='Giá bán' value={qt.price}
                                        onChange={(e: any) => setPriceFields(prev => prev.map((f, i) => i === index ? {
                                          ...f, quantity_tiers: (f.quantity_tiers || []).map((t, j) => j === qIdx ? { ...t, price: e.target.value } : t)
                                        } : f))} sx={{ width: 90, '& input': { fontSize: '11px', p: '4px 8px' } }} />
                                      <CustomTextField size='small' type='number' placeholder='Giá vốn' value={qt.cost}
                                        onChange={(e: any) => setPriceFields(prev => prev.map((f, i) => i === index ? {
                                          ...f, quantity_tiers: (f.quantity_tiers || []).map((t, j) => j === qIdx ? { ...t, cost: e.target.value } : t)
                                        } : f))} sx={{ width: 90, '& input': { fontSize: '11px', p: '4px 8px' } }} />
                                      {qtSell > 0 && qtCost > 0 && (
                                        <span style={{ fontSize: '10px', fontWeight: 600, color: qtProfit > 0 ? '#16a34a' : qtProfit < 0 ? '#ef4444' : '#94a3b8' }}>
                                          {qtProfit > 0 ? '+' : ''}{qtProfit.toLocaleString('vi-VN')}đ
                                        </span>
                                      )}
                                      <IconButton size='small' sx={{ p: '1px' }} color='error'
                                        onClick={() => setPriceFields(prev => prev.map((f, i) => i === index ? {
                                          ...f, quantity_tiers: (f.quantity_tiers || []).filter((_, j) => j !== qIdx)
                                        } : f))}>
                                        <X size={12} />
                                      </IconButton>
                                    </div>
                                    )
                                  })}
                                  <Button size='small' sx={{ fontSize: '10px', mt: 0.5 }} startIcon={<Plus size={11} />}
                                    onClick={() => setPriceFields(prev => prev.map((f, i) => i === index ? {
                                      ...f, quantity_tiers: [...(f.quantity_tiers || []), { min: '', max: '', price: '', cost: '' }]
                                    } : f))}>
                                    Thêm mức SL
                                  </Button>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </Grid2>
                  )}

                  {/* Per_unit: chiết khấu theo số lượng */}
                  {pricingMode === 'per_unit' && (
                    <Grid2 size={{ xs: 12 }}>
                      <div style={{ border: '1px solid #dbeafe', borderRadius: 8, overflow: 'hidden' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#eff6ff', padding: '8px 12px', borderBottom: '1px solid #dbeafe' }}>
                          <div>
                            <span style={{ fontSize: '12px', fontWeight: 600, color: '#1e40af' }}>Chiết khấu theo số lượng</span>
                            <div style={{ fontSize: '10px', color: '#64748b' }}>Mua nhiều proxy → giảm giá thêm (áp dụng sau chiết khấu thời gian)</div>
                          </div>
                          <Button size='small' startIcon={<Plus size={13} />}
                            onClick={() => setQuantityTiers(prev => [...prev, { min: '', max: '', discount: '' }])}>
                            Thêm mức
                          </Button>
                        </div>
                        {quantityTiers.length === 0 && (
                          <div style={{ padding: '12px', fontSize: '11.5px', color: '#94a3b8', textAlign: 'center' }}>
                            Chưa có chiết khấu SL — giá giống nhau dù mua 1 hay 100 proxy
                          </div>
                        )}
                        {quantityTiers.map((tier, idx) => (
                          <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '6px 12px', borderBottom: '1px solid #f1f5f9' }}>
                            <CustomTextField size='small' type='number' placeholder='Từ SL' value={tier.min}
                              onChange={(e: any) => setQuantityTiers(prev => prev.map((t, i) => i === idx ? { ...t, min: e.target.value } : t))}
                              sx={{ width: 80 }} />
                            <CustomTextField size='small' type='number' placeholder='Đến SL' value={tier.max}
                              onChange={(e: any) => setQuantityTiers(prev => prev.map((t, i) => i === idx ? { ...t, max: e.target.value } : t))}
                              sx={{ width: 80 }} />
                            <CustomTextField size='small' type='number' placeholder='Giảm %' value={tier.discount}
                              onChange={(e: any) => setQuantityTiers(prev => prev.map((t, i) => i === idx ? { ...t, discount: e.target.value } : t))}
                              sx={{ width: 80 }} />
                            {parseFloat(pricePerUnit) > 0 && parseFloat(tier.discount) > 0 && (
                              <span style={{ fontSize: '11px', color: '#16a34a', whiteSpace: 'nowrap' }}>
                                = {Math.round(parseFloat(pricePerUnit) * (1 - parseFloat(tier.discount) / 100)).toLocaleString('vi-VN')}đ/{timeUnit === 'month' ? 'th' : 'ng'}
                              </span>
                            )}
                            <IconButton size='small' color='error'
                              onClick={() => setQuantityTiers(prev => prev.filter((_, i) => i !== idx))}>
                              <X size={14} />
                            </IconButton>
                          </div>
                        ))}
                      </div>
                    </Grid2>
                  )}
                </Grid2>
              </CollapsibleSection>
            </form>
          )}
          </Box>

          {/* Right: Preview — 100% giống card khách hàng */}
          <Box sx={PREVIEW_BOX_SX}>
            <Box sx={{ position: 'sticky', top: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                <Eye size={16} color='#16a34a' />
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#15803d' }}>Xem trước</span>
              </div>

              <ServicePreview
                control={control}
                serviceId={serviceId}
                priceFields={priceFields}
                multiInputFields={multiInputFields}
                allowCustomAuth={allowCustomAuth}
              />

              <div style={{ textAlign: 'center', marginTop: '8px', fontSize: '11px', color: '#94a3b8' }}>
                Cập nhật theo thời gian thực
              </div>
            </Box>
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 2, pb: 1.5, pt: 1 }}>
          <Button onClick={onClose} variant='outlined' disabled={isPending}>
            Hủy
          </Button>
          <Button
            type='submit'
            form='service-form'
            variant='contained'
            className='text-white'
            disabled={isPending || (isEditMode && loadingService && !initialData)}
            startIcon={isPending ? <CircularProgress size={18} color='inherit' /> : null}
            sx={{
              background: 'var(--primary-gradient, linear-gradient(135deg, #F88A4B 0%, #F6734B 100%))',
              '&:hover': { opacity: 0.9 },
              fontWeight: 700,
              px: 3,
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
            }}
          >
            {isPending
              ? (isEditMode ? 'Đang cập nhật...' : 'Đang thêm...')
              : (isEditMode ? 'Cập nhật dịch vụ' : 'Thêm dịch vụ')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Sub-modals */}
      <MultiInputModal
        isOpen={isMultiInputModalOpen}
        onClose={() => setIsMultiInputModalOpen(false)}
        onSave={(fields) => {
          toast.success(`Đã lưu ${fields.length} trường thành công!`)
          setIsMultiInputModalOpen(false)
        }}
        title='Thêm nhiều trường'
        keyLabel='Key'
        valueLabel='Value'
        fields={multiInputFields}
        setFields={setMultiInputFields}
      />

      {/* PriceByDurationModal removed — giá theo thời gian giờ inline trong form */}
    </>
  )
}
