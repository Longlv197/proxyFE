import React from 'react'

import { MapPin, Shield, Wifi, Zap, Users } from 'lucide-react'

import { fixCountryCode } from '@/configs/tagConfig'

interface ProductField {
  key: string
  label: string
  visible: boolean
}

const DEFAULT_FIELDS: ProductField[] = [
  { key: 'ip_type', label: 'Loại IP', visible: true },
  { key: 'protocol', label: 'Hỗ trợ', visible: true },
  { key: 'auth_type', label: 'Xác thực', visible: true },
  { key: 'bandwidth', label: 'Băng thông', visible: true },
  { key: 'request_limit', label: 'Giới hạn request', visible: true },
  { key: 'concurrent', label: 'Kết nối đồng thời', visible: true },
  { key: 'custom_fields', label: 'Tuỳ chỉnh', visible: true }
]

export function getVisibleFields(product_fields: ProductField[] | null | undefined): ProductField[] {
  if (!product_fields || product_fields.length === 0) return DEFAULT_FIELDS.filter(f => f.visible)

  const savedKeys = new Set(product_fields.map(f => f.key))
  const merged = [...product_fields]

  DEFAULT_FIELDS.forEach(df => {
    if (!savedKeys.has(df.key)) merged.push(df)
  })

  return merged.filter(f => f.visible)
}

export function renderFeatureRow(
  key: string,
  provider: any,
  protocolList: string[],
  convertIpVersion: (v: string) => string,
  convertAuthType: (t: string) => string,
  getCountryName: () => string | null
): React.ReactNode {
  switch (key) {
    case 'ip_type':
      return (
        <div className='feature-row'>
          <div className='feature-icons'><MapPin size={14} color='#6366f1' /></div>
          <div className='feature-content'>
            <span className='feature-label'>Loại IP:</span>
            <span className='feature-value' style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              {provider.rotation_type ? 'Rotating' : 'Static'} {convertIpVersion(provider.ip_version)} —{' '}
              {(provider?.country || provider?.country_code) && (
                <img
                  src={`https://flagcdn.com/w40/${fixCountryCode(provider.country || provider.country_code)}.png`}
                  alt=''
                  style={{ width: 18, height: 13, objectFit: 'cover', borderRadius: 2 }}
                />
              )}
              {getCountryName() || provider?.country_name || provider?.country || 'N/A'}
            </span>
          </div>
        </div>
      )

    case 'protocol':
      return (
        <div className='feature-row'>
          <div className='feature-icons'><Shield size={14} color='#f97316' /></div>
          <div className='feature-content'>
            <span className='feature-label'>Hỗ trợ:</span>
            <span className='feature-value'>{protocolList.map(p => p.toUpperCase()).join('/')}</span>
          </div>
        </div>
      )

    case 'auth_type':
      if (!provider?.auth_type) return null

      return (
        <div className='feature-row'>
          <div className='feature-icons'><Shield size={14} color='#e67e22' /></div>
          <div className='feature-content'>
            <span className='feature-label'>Xác thực:</span>
            <span className='feature-value'>
              {convertAuthType(provider.auth_type)}
              {(provider.auth_type === 'userpass' || provider.auth_type === 'both') && (
                <span style={{ fontSize: '10.5px', fontWeight: 500, color: provider.metadata?.allow_custom_auth ? '#2563eb' : '#16a34a', marginLeft: 4 }}>
                  ({provider.metadata?.allow_custom_auth ? 'Tự nhập' : 'Random'})
                </span>
              )}
            </span>
          </div>
        </div>
      )

    case 'bandwidth':
      if (!provider?.bandwidth) return null

      return (
        <div className='feature-row'>
          <div className='feature-icons'><Wifi size={14} color='#3b82f6' /></div>
          <div className='feature-content'>
            <span className='feature-label'>Băng thông:</span>
            <span className='feature-value'>{provider.bandwidth === 'unlimited' ? 'Không giới hạn' : provider.bandwidth}</span>
          </div>
        </div>
      )

    case 'request_limit':
      if (!provider?.request_limit) return null

      return (
        <div className='feature-row'>
          <div className='feature-icons'><Zap size={14} color='#22c55e' /></div>
          <div className='feature-content'>
            <span className='feature-label'>Giới hạn request:</span>
            <span className='feature-value'>{provider.request_limit}</span>
          </div>
        </div>
      )

    case 'concurrent':
      if (!provider?.concurrent_connections) return null

      return (
        <div className='feature-row'>
          <div className='feature-icons'><Users size={14} color='#ef4444' /></div>
          <div className='feature-content'>
            <span className='feature-label'>Kết nối đồng thời:</span>
            <span className='feature-value'>{provider.concurrent_connections}</span>
          </div>
        </div>
      )

    case 'rotation_type':
      if (!provider?.rotation_type) return null

      return (
        <div className='feature-row'>
          <div className='feature-icons'><Zap size={14} color='#8b5cf6' /></div>
          <div className='feature-content'>
            <span className='feature-label'>Kiểu xoay:</span>
            <span className='feature-value'>{provider.rotation_type === 'time' ? 'Time-based' : provider.rotation_type}</span>
          </div>
        </div>
      )

    case 'rotation_interval':
      if (!provider?.rotation_interval) return null

      return (
        <div className='feature-row'>
          <div className='feature-icons'><Zap size={14} color='#a855f7' /></div>
          <div className='feature-content'>
            <span className='feature-label'>Chu kỳ xoay:</span>
            <span className='feature-value'>
              {provider.rotation_interval >= 60
                ? `${Math.floor(provider.rotation_interval / 60)} phút`
                : `${provider.rotation_interval} giây`}
            </span>
          </div>
        </div>
      )

    case 'pool_size':
      if (!provider?.pool_size) return null

      return (
        <div className='feature-row'>
          <div className='feature-icons'><Users size={14} color='#0ea5e9' /></div>
          <div className='feature-content'>
            <span className='feature-label'>Pool size:</span>
            <span className='feature-value'>{provider.pool_size}</span>
          </div>
        </div>
      )

    case 'custom_fields':
      if (!provider?.metadata?.custom_fields?.length) return null

      return (
        <>
          {provider.metadata.custom_fields.map((field: any) => (
            <div className='feature-row' key={field.key || field.param}>
              <div className='feature-icons'><Zap size={14} color='#8b5cf6' /></div>
              <div className='feature-content'>
                <span className='feature-label'>{field.label}:</span>
                <span className='feature-value'>
                  {field.type === 'text' || field.type === 'number'
                    ? (field.default || 'Tự nhập')
                    : field.options?.map((o: any) => o.label).join(', ')}
                </span>
              </div>
            </div>
          ))}
        </>
      )

    default:
      return null
  }
}
