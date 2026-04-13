import React from 'react'

import type { Product } from '@/hooks/apis/usePublicProducts'

// ─── Helpers ─────────────────────────────────────────────

const typeLabel = (type: string) => (type === '1' ? 'Rotating' : 'Static')

const proxyTypeLabel = (pt: string) =>
  pt === 'residential' ? 'Residential' : pt === 'datacenter' ? 'Datacenter' : pt || 'Proxy'

const formatPrice = (p: Product) => {
  if (p.pricing_mode === 'per_unit' && p.price_per_unit)
    return `${p.price_per_unit.toLocaleString('vi-VN')}đ/ngày`

  const first = p.price_by_duration?.[0]

  if (first) return `${Number(first.value).toLocaleString('vi-VN')}đ / ${first.key} ngày`

  return `${p.price.toLocaleString('vi-VN')}đ`
}

const countryFlags = (country: string) =>
  country
    .split(',')
    .slice(0, 3)
    .map(c => c.trim().toUpperCase())
    .join('/')

const hasCustomFields = (p: Product) => p.custom_fields && p.custom_fields.length > 0

// Group products by proxy_type + type
function groupProducts(products: Product[]) {
  const groups: Record<string, Product[]> = {}

  for (const p of products) {
    const key = `${typeLabel(p.type)} ${proxyTypeLabel(p.proxy_type)}`

    if (!groups[key]) groups[key] = []
    groups[key].push(p)
  }

  return groups
}

// ─── Component ───────────────────────────────────────────

interface ProductSelectorProps {
  products: Product[]
  selectedCode: string | null
  onSelect: (code: string) => void
}

export default function ProductSelector({ products, selectedCode, onSelect }: ProductSelectorProps) {
  const groups = groupProducts(products)

  return (
    <div className='space-y-4'>
      {Object.entries(groups).map(([group, items]) => (
        <div key={group}>
          <div className='text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2'>{group}</div>
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2'>
            {items.map(p => {
              const active = selectedCode === p.code

              return (
                <button
                  key={p.code}
                  onClick={() => onSelect(p.code)}
                  className={`text-left px-3 py-2.5 rounded-lg border transition-all ${
                    active
                      ? 'border-gray-900 bg-gray-900 text-white shadow-sm'
                      : 'border-gray-200 bg-white hover:border-gray-400 text-gray-700'
                  }`}
                >
                  <div className='flex items-center gap-2'>
                    <span className='text-sm'>{countryFlags(p.country)}</span>
                    <span className={`text-sm font-medium truncate ${active ? 'text-white' : 'text-gray-900'}`}>
                      {p.name}
                    </span>
                    {p.tag && (
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-semibold flex-shrink-0 ${
                          active ? 'bg-white/20 text-white' : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {p.tag}
                      </span>
                    )}
                  </div>
                  <div className={`flex items-center gap-2 mt-1 text-xs ${active ? 'text-gray-300' : 'text-gray-500'}`}>
                    <span>
                      {p.ip_version.toUpperCase()} · {p.protocols.join(', ')}
                    </span>
                    <span>·</span>
                    <span className='font-medium'>{formatPrice(p)}</span>
                    {hasCustomFields(p) && (
                      <>
                        <span>·</span>
                        <span className='italic'>
                          {p.custom_fields!.map(f => f.label).join(', ')}
                        </span>
                      </>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
