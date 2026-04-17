import React, { useState, useMemo, useEffect } from 'react'

import { Copy, Check } from 'lucide-react'

import type { Product } from '@/hooks/apis/usePublicProducts'

// ─── Helpers ─────────────────────────────────────────────

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8002/api'
const LANGS = ['cURL', 'PHP', 'Node.js', 'Python', 'Go'] as const

// Field key: ưu tiên field.key, fallback slug(label)
const getFieldKey = (field: { key?: string; label?: string }) =>
  field.key || (field.label || 'field').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')

function CopyBtn({ text }: { text: string }) {
  const [ok, setOk] = useState(false)

  const copy = () => {
    navigator.clipboard.writeText(text)
    setOk(true)
    setTimeout(() => setOk(false), 2000)
  }

  return (
    <button
      onClick={copy}
      className='flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white transition-colors text-xs font-medium'
    >
      {ok ? <Check size={13} /> : <Copy size={13} />}
      <span>{ok ? 'Copied!' : 'Copy'}</span>
    </button>
  )
}

function buildRequestBody(product: Product, params: Record<string, string>): Record<string, any> {
  const body: Record<string, any> = {
    product_code: product.code,
    quantity: Number(params.quantity) || 1,
  }

  // duration — chỉ thêm khi SP có price_by_duration
  if (product.price_by_duration?.length) {
    body.duration = Number(params.duration) || Number(product.price_by_duration[0]?.key) || 1
  }

  // protocol
  if (product.protocols?.length > 1) {
    body.protocol = params.protocol || product.protocols[0]
  }

  // custom_fields
  const cf: Record<string, string> = {}
  let hasCf = false

  for (const field of product.custom_fields ?? []) {
    const fk = getFieldKey(field)
    const val = params[`cf_${fk}`]

    if (val) {
      cf[fk] = val
      hasCf = true
    } else if (field.default) {
      cf[fk] = field.default
      hasCf = true
    }
  }

  if (hasCf) body.custom_fields = cf

  return body
}

function genCode(method: string, bodyJson: string, lang: string, apiKey: string): string {
  const url = `${API_BASE}/buy-proxy`
  const k = apiKey || 'YOUR_API_KEY'

  switch (lang) {
    case 'cURL':
      return [
        'curl -X POST \\',
        `  -H "X-API-Key: ${k}" \\`,
        '  -H "Content-Type: application/json" \\',
        `  -d '${bodyJson}' \\`,
        `  "${url}"`,
      ].join('\n')

    case 'PHP':
      return [
        `$ch = curl_init("${url}");`,
        'curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);',
        'curl_setopt($ch, CURLOPT_POST, true);',
        `curl_setopt($ch, CURLOPT_HTTPHEADER, [`,
        `  "X-API-Key: ${k}",`,
        `  "Content-Type: application/json"`,
        ']);',
        `curl_setopt($ch, CURLOPT_POSTFIELDS, '${bodyJson}');`,
        '',
        '$response = curl_exec($ch);',
        'curl_close($ch);',
        '$data = json_decode($response, true);',
        'print_r($data);',
      ].join('\n')

    case 'Node.js':
      return [
        `const res = await fetch("${url}", {`,
        '  method: "POST",',
        '  headers: {',
        `    "X-API-Key": "${k}",`,
        '    "Content-Type": "application/json"',
        '  },',
        `  body: JSON.stringify(${bodyJson})`,
        '});',
        'const data = await res.json();',
        'console.log(data);',
      ].join('\n')

    case 'Python':
      return [
        'import requests',
        '',
        `res = requests.post(`,
        `  "${url}",`,
        `  headers={"X-API-Key": "${k}"},`,
        `  json=${bodyJson}`,
        ')',
        'print(res.json())',
      ].join('\n')

    case 'Go':
      return [
        'package main',
        '',
        'import (',
        '  "fmt"',
        '  "io"',
        '  "net/http"',
        '  "strings"',
        ')',
        '',
        'func main() {',
        `  body := strings.NewReader(\`${bodyJson}\`)`,
        `  req, _ := http.NewRequest("POST", "${url}", body)`,
        `  req.Header.Set("X-API-Key", "${k}")`,
        '  req.Header.Set("Content-Type", "application/json")',
        '',
        '  resp, _ := http.DefaultClient.Do(req)',
        '  defer resp.Body.Close()',
        '  data, _ := io.ReadAll(resp.Body)',
        '  fmt.Println(string(data))',
        '}',
      ].join('\n')

    default:
      return ''
  }
}

// ─── Component ───────────────────────────────────────────

interface BuyProxyBuilderProps {
  product: Product
  apiKey?: string
}

export default function BuyProxyBuilder({ product, apiKey = '' }: BuyProxyBuilderProps) {
  const [lang, setLang] = useState<string>('cURL')
  const [params, setParams] = useState<Record<string, string>>({})

  // Reset params khi đổi product
  useEffect(() => {
    const defaults: Record<string, string> = {
      quantity: '1',
    }

    if (product.price_by_duration?.length) {
      defaults.duration = product.price_by_duration[0].key
    }

    if (product.protocols?.length) {
      defaults.protocol = product.protocols[0]
    }

    for (const f of product.custom_fields ?? []) {
      const fk = getFieldKey(f)

      if (f.default) defaults[`cf_${fk}`] = f.default
      else if (f.options?.length) defaults[`cf_${fk}`] = f.options[0].key
    }

    setParams(defaults)
  }, [product.code])

  const setParam = (key: string, val: string) => setParams(prev => ({ ...prev, [key]: val }))

  const body = useMemo(() => buildRequestBody(product, params), [product, params])
  const bodyJson = JSON.stringify(body, null, 2)
  const code = useMemo(() => genCode('POST', bodyJson, lang, apiKey), [bodyJson, lang, apiKey])

  // Tính giá hiện tại
  const currentPrice = useMemo(() => {
    const qty = Number(params.quantity) || 1

    if (product.pricing_mode === 'per_unit' && product.price_per_unit) {
      return qty * product.price_per_unit
    }

    const dur = product.price_by_duration?.find(d => d.key === params.duration)

    if (dur) {
      // Check quantity_tiers
      if (dur.quantity_tiers?.length) {
        const tier = dur.quantity_tiers.find(t => qty >= Number(t.min) && qty <= Number(t.max))

        if (tier) return qty * Number(tier.price)
      }

      return qty * dur.value
    }

    return qty * product.price
  }, [product, params])

  return (
    <div className='flex gap-0 border border-gray-200 rounded-lg overflow-hidden bg-white'>
      {/* Left: Form */}
      <div className='w-[280px] flex-shrink-0 p-4 space-y-3 border-r border-gray-100'>
        {/* Quantity */}
        <div>
          <label className='text-xs font-medium text-gray-600 mb-1 block'>
            Số lượng
            <span className='text-gray-400 font-normal'> ({product.min_quantity}–{product.max_quantity})</span>
          </label>
          <input
            type='number'
            min={product.min_quantity}
            max={product.max_quantity}
            value={params.quantity ?? '1'}
            onChange={e => setParam('quantity', e.target.value)}
            className='w-full px-2.5 py-1.5 rounded-md border border-gray-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent'
          />
        </div>

        {/* Duration — chỉ hiện khi có price_by_duration */}
        {product.price_by_duration?.length > 0 && (
          <div>
            <label className='text-xs font-medium text-gray-600 mb-1 block'>Thời hạn</label>
            <select
              value={params.duration ?? ''}
              onChange={e => setParam('duration', e.target.value)}
              className='w-full px-2.5 py-1.5 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent'
            >
              {product.price_by_duration.map(d => (
                <option key={d.key} value={d.key}>
                  {d.key} ngày — {Number(d.value).toLocaleString('vi-VN')}đ/proxy
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Protocol — chỉ hiện khi > 1 protocol */}
        {product.protocols?.length > 1 && (
          <div>
            <label className='text-xs font-medium text-gray-600 mb-1 block'>Giao thức</label>
            <div className='flex gap-1.5'>
              {product.protocols.map(p => (
                <button
                  key={p}
                  onClick={() => setParam('protocol', p)}
                  className={`flex-1 px-2.5 py-1.5 rounded-md text-xs font-medium border transition-all ${
                    params.protocol === p
                      ? 'bg-gray-900 text-white border-gray-900'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
                  }`}
                >
                  {p.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Custom fields */}
        {product.custom_fields?.map(field => {
          const fk = getFieldKey(field)

          return (
            <div key={fk}>
              <label className='text-xs font-medium text-gray-600 mb-1 block'>
                {field.label}
                {field.required && <span className='text-red-500 ml-0.5'>*</span>}
              </label>
              {field.type === 'select' && field.options?.length ? (
                <select
                  value={params[`cf_${fk}`] ?? ''}
                  onChange={e => setParam(`cf_${fk}`, e.target.value)}
                  className='w-full px-2.5 py-1.5 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent'
                >
                  {field.options.map(opt => (
                    <option key={opt.key} value={opt.key}>
                      {opt.flag ? `[${opt.flag.toUpperCase()}] ${opt.label}` : opt.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type={field.type === 'number' ? 'number' : 'text'}
                  value={params[`cf_${fk}`] ?? ''}
                  onChange={e => setParam(`cf_${fk}`, e.target.value)}
                  placeholder={field.default || ''}
                  className='w-full px-2.5 py-1.5 rounded-md border border-gray-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent'
                />
              )}
            </div>
          )
        })}

        {/* Price summary */}
        <div className='pt-2 border-t border-gray-100'>
          <div className='flex justify-between text-sm'>
            <span className='text-gray-500'>Tổng tiền</span>
            <span className='font-bold text-gray-900'>{currentPrice.toLocaleString('vi-VN')}đ</span>
          </div>
        </div>
      </div>

      {/* Right: Code */}
      <div className='flex-1 flex flex-col min-w-0'>
        {/* Lang tabs */}
        <div className='flex items-center gap-1 px-4 py-2 border-b border-gray-200 bg-gray-50'>
          {LANGS.map(l => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                lang === l ? 'bg-gray-900 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-200'
              }`}
            >
              {l}
            </button>
          ))}
        </div>

        {/* Code block */}
        <div className='flex-1 overflow-auto'>
          <div className='bg-gray-900 m-3 rounded-lg overflow-hidden'>
            <div className='flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700'>
              <span className='text-gray-400 text-xs'>{lang}</span>
              <CopyBtn text={code} />
            </div>
            <pre className='p-4 overflow-x-auto text-[13px] leading-relaxed m-0'>
              <code className='text-gray-300 font-mono'>{code}</code>
            </pre>
          </div>

          {/* Request body (JSON) */}
          <div className='bg-gray-900 mx-3 mb-3 rounded-lg overflow-hidden'>
            <div className='flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700'>
              <span className='text-gray-400 text-xs'>Request Body (JSON)</span>
              <CopyBtn text={bodyJson} />
            </div>
            <pre className='p-4 overflow-x-auto text-[13px] leading-relaxed m-0'>
              <code className='text-green-400 font-mono'>{bodyJson}</code>
            </pre>
          </div>

          {/* Response mẫu */}
          <div className='bg-gray-900 mx-3 mb-3 rounded-lg overflow-hidden'>
            <div className='px-4 py-2 bg-gray-800 border-b border-gray-700'>
              <span className='text-gray-400 text-xs'>Response (200 OK)</span>
            </div>
            <pre className='p-4 overflow-x-auto text-[13px] leading-relaxed m-0'>
              <code className='text-gray-300 font-mono'>
                {JSON.stringify(
                  {
                    status: 'success',
                    order_code: 'ORD-XXXXXX',
                    message: 'Order placed successfully.',
                    price_per_unit: currentPrice / (Number(params.quantity) || 1),
                    total_amount: currentPrice,
                    items: [
                      {
                        key: 'abc123xyz...',
                        status: 0,
                        proxy: '1.2.3.4:8080:user:pass',
                        ip_whitelist: ['42.118.149.138']
                      },
                      {
                        key: 'def456uvw...',
                        status: 3,
                        proxy: null,
                        ip_whitelist: ['42.118.149.138']
                      }
                    ]
                  },
                  null,
                  2
                )}
              </code>
            </pre>
            <div className='px-4 py-2 bg-gray-800 border-t border-gray-700 text-[11px] text-gray-400 leading-relaxed'>
              <strong className='text-gray-300'>items[]</strong> — danh sách proxy của đơn hàng.
              <br />• <code className='text-blue-300'>key</code>: ID nội bộ để quản lý proxy (update IP whitelist, xoay, polling status).
              <br />• <code className='text-blue-300'>status</code>: <strong>0</strong>=Đang hoạt động, <strong>1</strong>=Đã tắt, <strong>2</strong>=Hết hạn, <strong>3</strong>=Chờ NCC (proxy chưa có).
              <br />• <code className='text-blue-300'>proxy</code>: <code>null</code> khi status=3 (proxy xoay deferred). Polling <code>GET /order-items/{'{key}'}</code> sau vài giây để nhận.
              <br />• <code className='text-blue-300'>ip_whitelist</code>: IP đã set khi mua. Update qua <code>PUT /order-items/{'{key}'}/ip-whitelist</code>.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
