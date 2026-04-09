'use client'

import React, { useCallback } from 'react'

import { ArrowUp, ArrowDown, GripVertical, Eye, EyeOff, ShoppingCart } from 'lucide-react'

import '@/app/[lang]/(private)/(client)/components/proxy-card/styles.css'

import type { BrandingSettings } from '@/hooks/apis/useBrandingSettings'
import { getVisibleFields, renderFeatureRow } from '@/app/[lang]/(private)/(client)/components/proxy-card/productFieldsHelper'

interface ProductField {
  key: string
  label: string
  visible: boolean
}

const DEFAULT_FIELDS: ProductField[] = [
  { key: 'ip_type', label: 'Loại IP', visible: true },
  { key: 'protocol', label: 'Hỗ trợ (HTTP/SOCKS5)', visible: true },
  { key: 'auth_type', label: 'Xác thực', visible: true },
  { key: 'bandwidth', label: 'Băng thông', visible: true },
  { key: 'request_limit', label: 'Giới hạn request', visible: true },
  { key: 'concurrent', label: 'Kết nối đồng thời', visible: true },
  { key: 'rotation_type', label: 'Kiểu xoay (Rotating)', visible: true },
  { key: 'rotation_interval', label: 'Chu kỳ xoay (Rotating)', visible: true },
  { key: 'pool_size', label: 'Pool size (Rotating)', visible: true },
  { key: 'custom_fields', label: 'Tuỳ chỉnh (Custom fields)', visible: true }
]

interface ProductSettingFormProps {
  sectionTitleSx: React.CSSProperties
  sectionDescSx: React.CSSProperties
  show_product_code: string | null
  updateBrandingField: (field: keyof BrandingSettings, value: any) => void
  product_fields?: ProductField[] | null
}

export default function ProductSettingForm({
  sectionTitleSx,
  sectionDescSx,
  show_product_code,
  updateBrandingField,
  product_fields
}: ProductSettingFormProps) {
  // Merge saved fields với defaults — giữ thứ tự đã lưu, thêm field mới nếu có
  const fields: ProductField[] = (() => {
    if (!product_fields || product_fields.length === 0) return DEFAULT_FIELDS

    const savedKeys = new Set(product_fields.map(f => f.key))
    const merged = [...product_fields]

    // Thêm field mới (chưa có trong saved) vào cuối
    DEFAULT_FIELDS.forEach(df => {
      if (!savedKeys.has(df.key)) merged.push(df)
    })

    return merged
  })()

  const updateFields = useCallback((updated: ProductField[]) => {
    updateBrandingField('product_fields', updated)
  }, [updateBrandingField])

  const toggleField = (key: string) => {
    updateFields(fields.map(f => f.key === key ? { ...f, visible: !f.visible } : f))
  }

  const moveField = (idx: number, direction: 'up' | 'down') => {
    const target = direction === 'up' ? idx - 1 : idx + 1

    if (target < 0 || target >= fields.length) return

    const updated = [...fields]
    const temp = updated[idx]

    updated[idx] = updated[target]
    updated[target] = temp
    updateFields(updated)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h6 style={sectionTitleSx}>Hiển thị sản phẩm</h6>
        <p style={sectionDescSx}>Tuỳ chỉnh cách hiển thị sản phẩm trên trang khách hàng</p>
      </div>

      {/* Show product code toggle */}
      <label
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: '13px',
          color: '#475569',
          cursor: 'pointer'
        }}
      >
        <input
          type='checkbox'
          checked={show_product_code !== '0'}
          onChange={e => updateBrandingField('show_product_code', e.target.checked ? '1' : '0')}
          style={{ accentColor: 'var(--primary-color, #2092EC)' }}
        />
        Hiện mã sản phẩm (code) dưới tên sản phẩm
      </label>

      {/* Product fields ordering + Preview side by side */}
      <div>
        <h6 style={sectionTitleSx}>Thông tin sản phẩm</h6>
        <p style={sectionDescSx}>
          Bật/tắt và sắp xếp thứ tự hiển thị. Xem trước bên phải cập nhật ngay khi thay đổi.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
        {/* Left: field list */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            border: '1px solid #e2e8f0',
            borderRadius: 10,
            overflow: 'hidden'
          }}>
            {fields.map((field, idx) => (
              <div
                key={field.key}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 14px',
                  borderBottom: idx < fields.length - 1 ? '1px solid #f1f5f9' : 'none',
                  background: field.visible ? '#fff' : '#f8fafc',
                  transition: 'background 0.15s'
                }}
              >
                <GripVertical size={14} color='#cbd5e1' style={{ flexShrink: 0 }} />
                <span style={{
                  width: 22, height: 22, borderRadius: 6,
                  background: field.visible ? '#eef2ff' : '#f1f5f9',
                  color: field.visible ? '#6366f1' : '#94a3b8',
                  fontSize: 11, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0
                }}>
                  {idx + 1}
                </span>
                <span style={{
                  flex: 1, fontSize: 13, fontWeight: 600,
                  color: field.visible ? '#1e293b' : '#94a3b8',
                  textDecoration: field.visible ? 'none' : 'line-through'
                }}>
                  {field.label}
                </span>
                <button
                  type='button'
                  onClick={() => toggleField(field.key)}
                  title={field.visible ? 'Ẩn' : 'Hiện'}
                  style={{
                    padding: 4, borderRadius: 6, border: 'none', cursor: 'pointer',
                    background: field.visible ? '#eef2ff' : '#f1f5f9',
                    color: field.visible ? '#6366f1' : '#94a3b8',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.15s'
                  }}
                >
                  {field.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                </button>
                <button
                  type='button'
                  onClick={() => moveField(idx, 'up')}
                  disabled={idx === 0}
                  title='Di chuyển lên'
                  style={{
                    padding: 4, borderRadius: 6, border: 'none', cursor: idx === 0 ? 'default' : 'pointer',
                    background: 'transparent', color: idx === 0 ? '#e2e8f0' : '#64748b',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}
                >
                  <ArrowUp size={14} />
                </button>
                <button
                  type='button'
                  onClick={() => moveField(idx, 'down')}
                  disabled={idx === fields.length - 1}
                  title='Di chuyển xuống'
                  style={{
                    padding: 4, borderRadius: 6, border: 'none', cursor: idx === fields.length - 1 ? 'default' : 'pointer',
                    background: 'transparent', color: idx === fields.length - 1 ? '#e2e8f0' : '#64748b',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}
                >
                  <ArrowDown size={14} />
                </button>
              </div>
            ))}
          </div>

          <div
            style={{
              marginTop: 16,
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 10,
              padding: '12px 16px',
              fontSize: '12px',
              color: '#475569',
              lineHeight: 1.8
            }}
          >
            <strong>Thứ tự:</strong> Trên cùng = hiện đầu tiên.
            <strong> Ẩn/hiện:</strong> Tắt field không cần.
            <strong> Lưu ý:</strong> Field bật nhưng sản phẩm không có data → tự ẩn.
          </div>
        </div>

        {/* Right: preview card */}
        <div style={{ width: 300, flexShrink: 0, position: 'sticky', top: 80 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
            Xem trước
          </div>
          <PreviewCard fields={fields} showCode={show_product_code !== '0'} />
        </div>
      </div>
    </div>
  )
}

/* ── Mock data cho preview ── */
const MOCK_PROVIDER = {
  name: 'Proxy Residential VN',
  code: 'static-ipv4-vn-res',
  id: 99,
  ip_version: 'ipv4',
  country: 'vn',
  country_name: 'Việt Nam',
  protocols: ['http', 'socks5'],
  auth_type: 'userpass',
  bandwidth: 'unlimited',
  request_limit: '1000',
  concurrent_connections: 5,
  rotation_type: 'time_based',
  rotation_interval: 60,
  pool_size: 10000,
  metadata: {
    allow_custom_auth: false,
    custom_fields: [
      { key: 'isp', label: 'Nhà mạng', type: 'select', options: [{ label: 'Viettel' }, { label: 'FPT' }, { label: 'VNPT' }] }
    ]
  }
}

function PreviewCard({ fields, showCode }: { fields: ProductField[]; showCode: boolean }) {
  const visibleFields = getVisibleFields(fields)
  const convertIpVersion = (v: string) => v?.toLowerCase() === 'ipv4' ? 'V4' : v?.toLowerCase() === 'ipv6' ? 'V6' : v || ''
  const convertAuthType = (t: string) => {
    switch (t) {
      case 'userpass': return 'User:Pass'
      case 'ip_whitelist': return 'IP Whitelist'
      case 'both': return 'User:Pass + IP'
      default: return t || ''
    }
  }

  return (
    <div
      className='proxy-card-column'
      style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}
    >
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div className='card-header-column'>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h3 className='provider-title-column' style={{ marginBottom: 1 }}>
                {MOCK_PROVIDER.name}
              </h3>
              {showCode && (
                <span style={{ fontFamily: 'monospace', fontSize: '10.5px', fontWeight: 500, color: '#b0b8c4', lineHeight: 1, display: 'block' }}>
                  {MOCK_PROVIDER.id}#{MOCK_PROVIDER.code}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', padding: '3px 10px', fontSize: '10.5px', fontWeight: 700, borderRadius: '6px', background: 'linear-gradient(135deg, #22c55e, #16a34a)', color: '#fff', lineHeight: 1.3 }}>
                Ổn định
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', padding: '3px 10px', fontSize: '10.5px', fontWeight: 700, borderRadius: '6px', background: 'linear-gradient(135deg, #ef4444, #dc2626)', color: '#fff', lineHeight: 1.3 }}>
                Hot
              </span>
            </div>
          </div>
        </div>

        {/* Feature rows — driven by config */}
        <div style={{ marginBottom: '8px' }}>
          {visibleFields.map(f => {
            const row = renderFeatureRow(
              f.key,
              MOCK_PROVIDER,
              MOCK_PROVIDER.protocols,
              convertIpVersion,
              convertAuthType,
              () => MOCK_PROVIDER.country_name
            )

            return row ? <React.Fragment key={f.key}>{row}</React.Fragment> : null
          })}
        </div>
      </div>

      {/* Footer */}
      <div className='card-footer'>
        <div>
          <div className='price-amount'>
            <span style={{ fontSize: '12px', fontWeight: 500, color: '#94a3b8', marginRight: '2px' }}>từ </span>
            2.000đ/ngày
          </div>
          <div style={{ fontSize: '10.5px', fontWeight: 600, color: '#22c55e', marginTop: 1 }}>
            Tiết kiệm đến 45%
          </div>
        </div>
        <button type='button' className='buy-button' style={{ padding: '8px 18px', pointerEvents: 'none' }}>
          <ShoppingCart size={14} className='mr-1' />
          Mua ngay
        </button>
      </div>
    </div>
  )
}
