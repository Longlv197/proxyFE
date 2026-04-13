'use client'

import React, { useState, useMemo } from 'react'

import { Copy, Check, Terminal, Play, Loader2 } from 'lucide-react'
import { useSession } from 'next-auth/react'

import { usePublicProducts, type Product } from '@/hooks/apis/usePublicProducts'
import { useMyCredentials } from '@/hooks/apis/useMyCredentials'
import {
  apiEndpoints,
  categoryLabels,
  type ApiEndpoint,
} from '@/configs/apiDocsConfig'

import BuyProxyBuilder from './BuyProxyBuilder'

// ─── Helpers ─────────────────────────────────────────────

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8002/api'
const LANGS = ['cURL', 'PHP', 'Node.js', 'Python', 'Go'] as const

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

function buildUrl(ep: ApiEndpoint, overrides?: Record<string, string>): string {
  let url = ep.endpoint
  const qp: string[] = []

  ep.parameters?.forEach(p => {
    const val = overrides?.[p.name] || p.example

    if (url.includes(`{${p.name}}`)) {
      url = url.replace(`{${p.name}}`, val)
    } else if (ep.method === 'GET') {
      qp.push(`${p.name}=${encodeURIComponent(val)}`)
    }
  })

  if (qp.length) url += '?' + qp.join('&')

  return url
}

function genCode(ep: ApiEndpoint, lang: string, key: string, overrides?: Record<string, string>): string {
  const url = buildUrl(ep, overrides)
  const k = key || 'YOUR_API_KEY'
  const isPost = ep.method === 'POST'
  const body = ep.requestBody
  const compact = body?.replace(/\n\s*/g, ' ').trim()

  switch (lang) {
    case 'cURL': {
      const p = ['curl']

      if (isPost) p.push('-X POST')
      p.push(`-H "X-API-Key: ${k}"`)
      if (isPost && compact) {
        p.push('-H "Content-Type: application/json"')
        p.push(`-d '${compact}'`)
      }
      p.push(`"${url}"`)

      return p.join(' \\\n  ')
    }

    case 'PHP': {
      let c = `$ch = curl_init("${url}");\ncurl_setopt($ch, CURLOPT_RETURNTRANSFER, true);\n`
      const h = [`  "X-API-Key: ${k}"`]

      if (isPost && compact) h.push(`  "Content-Type: application/json"`)
      c += `curl_setopt($ch, CURLOPT_HTTPHEADER, [\n${h.join(',\n')}\n]);\n`
      if (isPost && compact) {
        c += `curl_setopt($ch, CURLOPT_POST, true);\ncurl_setopt($ch, CURLOPT_POSTFIELDS, '${compact}');\n`
      }
      c += `\n$response = curl_exec($ch);\ncurl_close($ch);\n$data = json_decode($response, true);\nprint_r($data);`

      return c
    }

    case 'Node.js': {
      const h = [`    "X-API-Key": "${k}"`]

      if (isPost && compact) h.push(`    "Content-Type": "application/json"`)
      let c = `const res = await fetch("${url}", {\n`

      if (isPost) c += `  method: "POST",\n`
      c += `  headers: {\n${h.join(',\n')}\n  }`
      if (isPost && compact) c += `,\n  body: JSON.stringify(${compact})`
      c += `\n});\nconst data = await res.json();\nconsole.log(data);`

      return c
    }

    case 'Python': {
      const m = isPost ? 'post' : 'get'
      const a = [`"${url}"`, `headers={"X-API-Key": "${k}"}`]

      if (isPost && compact) a.push(`json=${compact}`)

      return `import requests\n\nres = requests.${m}(\n  ${a.join(',\n  ')}\n)\nprint(res.json())`
    }

    case 'Go': {
      let c = 'package main\n\nimport (\n  "fmt"\n  "io"\n  "net/http"\n'

      if (isPost) c += '  "strings"\n'
      c += ')\n\nfunc main() {\n'
      if (isPost && compact) {
        c += `  body := strings.NewReader(\`${compact}\`)\n`
        c += `  req, _ := http.NewRequest("POST", "${url}", body)\n`
      } else {
        c += `  req, _ := http.NewRequest("GET", "${url}", nil)\n`
      }
      c += `  req.Header.Set("X-API-Key", "${k}")\n`
      if (isPost) c += `  req.Header.Set("Content-Type", "application/json")\n`
      c += `\n  resp, _ := http.DefaultClient.Do(req)\n  defer resp.Body.Close()\n  data, _ := io.ReadAll(resp.Body)\n  fmt.Println(string(data))\n}`

      return c
    }

    default:
      return ''
  }
}

const methodColor = (m: string) => {
  if (m === 'GET') return 'bg-blue-600'
  if (m === 'POST') return 'bg-emerald-600'
  if (m === 'PUT') return 'bg-amber-600'
  if (m === 'DELETE') return 'bg-red-600'

  return 'bg-gray-600'
}

// ─── Static Endpoint View (giữ logic cũ từ ApiUsage) ─────

function StaticEndpointView({ ep, apiKey }: { ep: ApiEndpoint; apiKey: string }) {
  const [selectedLang, setSelectedLang] = useState<string>('cURL')
  const [selectedStatus, setSelectedStatus] = useState('200 OK')
  const [liveRes, setLiveRes] = useState<string | null>(null)
  const [liveStatus, setLiveStatus] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [paramOverrides, setParamOverrides] = useState<Record<string, string>>({})

  const setParamValue = (name: string, value: string) => setParamOverrides(prev => ({ ...prev, [name]: value }))

  const code = genCode(ep, selectedLang, apiKey, paramOverrides)

  const tryIt = async () => {
    if (!apiKey || !ep) return
    setLoading(true)
    setLiveRes(null)
    setLiveStatus(null)

    try {
      const url = buildUrl(ep, paramOverrides)
      const headers: Record<string, string> = { 'X-API-Key': apiKey }
      const opts: RequestInit = { method: ep.method, headers }

      if (ep.method === 'POST' && ep.requestBody) {
        headers['Content-Type'] = 'application/json'
        opts.body = ep.requestBody
      }

      const res = await fetch(url, opts)
      const d = await res.json()

      setLiveStatus(res.status)
      setLiveRes(JSON.stringify(d, null, 2))
    } catch (e: any) {
      setLiveStatus(0)
      setLiveRes(`Error: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='flex-1 flex flex-col overflow-hidden'>
      {/* Header */}
      <div className='flex items-center gap-3 px-6 py-3 border-b border-gray-200 bg-white'>
        <span className={`px-2.5 py-1 rounded-md text-xs font-bold text-white ${methodColor(ep.method)}`}>
          {ep.method}
        </span>
        <div className='flex-1 min-w-0'>
          <h2 className='text-base font-bold text-gray-900 m-0 leading-tight'>{ep.title}</h2>
          <code className='text-xs text-gray-500 font-mono mt-0.5 block truncate'>{ep.endpoint}</code>
        </div>
      </div>

      {/* Two-column */}
      <div className='flex-1 flex overflow-hidden'>
        {/* Left: Info */}
        <div className='flex-1 overflow-y-auto p-6 space-y-5 border-r border-gray-100'>
          <p className='text-sm text-gray-600 leading-relaxed m-0'>{ep.description}</p>

          {/* Parameters */}
          {ep.parameters && ep.parameters.length > 0 && (
            <div>
              <h3 className='text-sm font-semibold text-gray-800 mb-2'>Parameters</h3>
              <div className='rounded-lg border border-gray-200 overflow-hidden'>
                <table className='w-full text-sm'>
                  <thead>
                    <tr className='bg-gray-50'>
                      <th className='text-left px-4 py-2 font-semibold text-gray-600 text-xs'>Tên</th>
                      <th className='text-left px-4 py-2 font-semibold text-gray-600 text-xs'>Kiểu</th>
                      <th className='text-left px-4 py-2 font-semibold text-gray-600 text-xs'></th>
                      <th className='text-left px-4 py-2 font-semibold text-gray-600 text-xs'>Mô tả</th>
                    </tr>
                  </thead>
                  <tbody className='divide-y divide-gray-100'>
                    {ep.parameters.map(p => (
                      <tr key={p.name}>
                        <td className='px-4 py-2.5'>
                          <code className='font-mono bg-gray-100 px-1.5 py-0.5 rounded text-rose-600 text-xs'>
                            {p.name}
                          </code>
                        </td>
                        <td className='px-4 py-2.5 text-gray-500 text-xs'>{p.type}</td>
                        <td className='px-4 py-2.5'>
                          {p.required ? (
                            <span className='text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded'>
                              Required
                            </span>
                          ) : (
                            <span className='text-[10px] font-bold text-gray-400'>Optional</span>
                          )}
                        </td>
                        <td className='px-4 py-2.5 text-gray-600 text-xs'>{p.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Responses */}
          <div>
            <h3 className='text-sm font-semibold text-gray-800 mb-2'>Responses</h3>
            <div className='flex gap-2 mb-3'>
              {ep.statusCodes.map(s => (
                <button
                  key={s}
                  onClick={() => setSelectedStatus(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    selectedStatus === s
                      ? s.startsWith('2')
                        ? 'bg-green-50 text-green-700 border-green-300 ring-1 ring-green-200'
                        : 'bg-red-50 text-red-700 border-red-300 ring-1 ring-red-200'
                      : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            <div className='bg-gray-900 rounded-lg overflow-hidden'>
              <pre className='p-4 overflow-x-auto text-sm leading-relaxed m-0'>
                <code className='text-gray-300 font-mono'>{ep.responses[selectedStatus] || 'No data'}</code>
              </pre>
            </div>
          </div>
        </div>

        {/* Right: Code + Try it */}
        <div className='w-[480px] flex-shrink-0 flex flex-col overflow-hidden bg-gray-50'>
          {/* Language tabs */}
          <div className='flex items-center gap-1 px-4 py-3 border-b border-gray-200 bg-white'>
            <Terminal size={14} className='text-gray-400 mr-1' />
            {LANGS.map(l => (
              <button
                key={l}
                onClick={() => setSelectedLang(l)}
                className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                  selectedLang === l ? 'bg-gray-900 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                {l}
              </button>
            ))}
          </div>

          <div className='flex-1 overflow-y-auto'>
            <div className='bg-gray-900 m-4 mb-2 rounded-lg overflow-hidden'>
              <div className='flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700'>
                <span className='text-gray-400 text-xs font-medium'>{selectedLang}</span>
                <CopyBtn text={code} />
              </div>
              <pre className='p-4 overflow-x-auto text-[13px] leading-relaxed m-0'>
                <code className='text-gray-300 font-mono'>{code}</code>
              </pre>
            </div>

            {/* Editable params + Try it */}
            <div className='px-4 py-3 space-y-3'>
              {ep.parameters && ep.parameters.length > 0 && (
                <div className='space-y-2'>
                  <span className='text-xs font-semibold text-gray-500 uppercase tracking-wider'>Tham số</span>
                  {ep.parameters.map(p => (
                    <div key={p.name} className='flex items-center gap-2'>
                      <label className='text-xs text-gray-600 font-mono w-24 flex-shrink-0 truncate' title={p.name}>
                        {p.name}
                      </label>
                      <input
                        type='text'
                        value={paramOverrides[p.name] ?? p.example}
                        onChange={e => setParamValue(p.name, e.target.value)}
                        placeholder={p.example}
                        className='flex-1 px-2.5 py-1.5 rounded-md border border-gray-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent'
                      />
                    </div>
                  ))}
                </div>
              )}
              <button
                onClick={tryIt}
                disabled={loading || !apiKey}
                className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${
                  apiKey
                    ? 'bg-green-600 hover:bg-green-700 text-white shadow-sm hover:shadow-md'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                {loading ? <Loader2 size={16} className='animate-spin' /> : <Play size={16} />}
                {loading ? 'Đang gọi...' : apiKey ? 'Chạy thử' : 'Đăng nhập để chạy thử'}
              </button>
            </div>

            {/* Live response */}
            {liveRes && (
              <div className='bg-gray-900 mx-4 mb-4 rounded-lg overflow-hidden'>
                <div className='flex items-center gap-2 px-4 py-2 bg-gray-800 border-b border-gray-700'>
                  <span className='text-gray-400 text-xs font-medium'>Response</span>
                  {liveStatus !== null && (
                    <span
                      className={`px-2 py-0.5 rounded-md text-xs font-bold ${
                        liveStatus >= 200 && liveStatus < 300
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-red-500/20 text-red-400'
                      }`}
                    >
                      {liveStatus || 'Error'}
                    </span>
                  )}
                  <div className='flex-1' />
                  <CopyBtn text={liveRes} />
                </div>
                <pre className='p-4 overflow-x-auto text-[13px] leading-relaxed max-h-[300px] m-0'>
                  <code className='text-gray-300 font-mono'>{liveRes}</code>
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Getting Started ─────────────────────────────────────

function GettingStarted({ apiKey }: { apiKey: string }) {
  const k = apiKey || 'YOUR_API_KEY'

  return (
    <div className='flex-1 overflow-y-auto'>
      <div className='max-w-3xl mx-auto p-8 space-y-8'>
        <div>
          <h1 className='text-2xl font-bold text-gray-900 m-0'>API Documentation</h1>
          <p className='text-sm text-gray-500 mt-1 mb-0'>Tích hợp mua và quản lý proxy qua REST API</p>
        </div>

        {/* Base URL */}
        <div className='bg-gray-900 rounded-lg overflow-hidden'>
          <div className='flex items-center gap-2 px-4 py-2 bg-gray-800 border-b border-gray-700'>
            <span className='text-gray-400 text-xs font-semibold'>BASE URL</span>
          </div>
          <div className='px-4 py-3'>
            <code className='text-green-400 font-mono text-sm'>{API_BASE}</code>
          </div>
        </div>

        {/* Auth */}
        <div className='space-y-3'>
          <h2 className='text-base font-bold text-gray-900 m-0'>Xác thực</h2>
          <p className='text-sm text-gray-600 m-0'>
            Gửi header{' '}
            <code className='bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono text-rose-600'>X-API-Key</code> trong
            mỗi request.
          </p>
          <div className='bg-gray-900 rounded-lg px-4 py-3'>
            <code className='text-gray-300 font-mono text-sm'>X-API-Key: {k}</code>
          </div>
          {apiKey ? (
            <div className='flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-4 py-2.5'>
              <Check size={14} className='text-green-600 flex-shrink-0' />
              <span className='text-sm text-green-700'>
                API Key:{' '}
                <code className='font-mono text-xs bg-green-100 px-1.5 py-0.5 rounded'>
                  {apiKey.slice(0, 16)}...{apiKey.slice(-6)}
                </code>
              </span>
              <CopyBtn text={apiKey} />
            </div>
          ) : (
            <div className='bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 text-sm text-amber-700'>
              Đăng nhập và vào <strong>Profile</strong> để lấy API Key.
            </div>
          )}
        </div>

        {/* Quick flow */}
        <div className='space-y-3'>
          <h2 className='text-base font-bold text-gray-900 m-0'>Quy trình</h2>
          <div className='space-y-3'>
            {[
              { step: '1', title: 'Xem sản phẩm', api: 'GET /products' },
              { step: '2', title: 'Mua proxy', api: 'POST /buy-proxy' },
              { step: '3', title: 'Kiểm tra đơn', api: 'GET /orders/{order_code}' },
              { step: '4', title: 'Sử dụng proxy', api: 'GET /proxies/new?key=xxx' },
            ].map(s => (
              <div key={s.step} className='flex gap-3 items-center'>
                <div
                  className='w-7 h-7 rounded-full text-white text-xs font-bold flex items-center justify-center flex-shrink-0'
                  style={{ background: 'var(--primary-hover, #f97316)' }}
                >
                  {s.step}
                </div>
                <span className='text-sm font-semibold text-gray-900'>{s.title}</span>
                <code className='text-[11px] font-mono text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded'>{s.api}</code>
              </div>
            ))}
          </div>
        </div>

        <div className='text-xs text-gray-400 pt-4 border-t border-gray-100'>
          Chọn endpoint ở sidebar bên trái để xem chi tiết.
        </div>
      </div>
    </div>
  )
}

// ─── Product Specs Summary ───────────────────────────────

function ProductSpecs({ product }: { product: Product }) {
  const specs = [
    { label: 'Loại', value: product.type === '1' ? 'Rotating' : 'Static' },
    { label: 'Proxy', value: product.proxy_type || '—' },
    { label: 'IP', value: product.ip_version?.toUpperCase() || '—' },
    { label: 'Quốc gia', value: product.country?.toUpperCase() || '—' },
    { label: 'Giao thức', value: product.protocols?.join(', ') || '—' },
    { label: 'Auth', value: product.auth_type || '—' },
    { label: 'Bandwidth', value: product.bandwidth || '—' },
    product.rotation_interval ? { label: 'Xoay mỗi', value: `${product.rotation_interval}s` } : null,
    product.pool_size ? { label: 'Pool', value: `${product.pool_size} IPs` } : null,
    { label: 'Số lượng', value: `${product.min_quantity}–${product.max_quantity}` },
  ].filter(Boolean) as { label: string; value: string }[]

  return (
    <div className='flex flex-wrap gap-x-4 gap-y-1'>
      {specs.map(s => (
        <span key={s.label} className='text-xs text-gray-500'>
          <span className='font-medium text-gray-700'>{s.label}:</span> {s.value}
        </span>
      ))}
    </div>
  )
}

// ─── Buy Proxy View (product-driven) ─────────────────────

function BuyProxyView({ products, apiKey }: { products: Product[]; apiKey: string }) {
  const [inputCode, setInputCode] = useState('')
  const [selectedCode, setSelectedCode] = useState<string | null>(null)
  const selectedProduct = products.find(p =>
    p.code === selectedCode || String(p.id) === selectedCode
  )

  const handleLookup = () => {
    const v = inputCode.trim()

    if (!v) return

    // Match by code (exact) or ID (number)
    const found = products.find(p => p.code === v || String(p.id) === v)

    if (found) setSelectedCode(found.code)
    else setSelectedCode(v) // Will show "not found"
  }

  return (
    <div className='flex-1 flex flex-col overflow-hidden'>
      {/* Header */}
      <div className='flex items-center gap-3 px-6 py-3 border-b border-gray-200 bg-white'>
        <span className='px-2.5 py-1 rounded-md text-xs font-bold text-white bg-emerald-600'>POST</span>
        <div className='flex-1 min-w-0'>
          <h2 className='text-base font-bold text-gray-900 m-0 leading-tight'>Mua Proxy</h2>
          <code className='text-xs text-gray-500 font-mono mt-0.5 block'>{API_BASE}/buy-proxy</code>
        </div>
      </div>

      <div className='flex-1 overflow-y-auto p-6 space-y-6'>
        {/* Mô tả API */}
        <div className='space-y-2'>
          <p className='text-sm text-gray-600 m-0'>
            Tạo đơn mua proxy. Gọi{' '}
            <code className='bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono text-blue-600'>GET /products</code>{' '}
            để lấy danh sách sản phẩm và <code className='bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono text-rose-600'>product_code</code> tương ứng.
          </p>
        </div>

        {/* Bảng tham số chung */}
        <div>
          <h3 className='text-sm font-semibold text-gray-800 mb-2'>Tham số</h3>
          <div className='rounded-lg border border-gray-200 overflow-hidden'>
            <table className='w-full text-sm'>
              <thead>
                <tr className='bg-gray-50'>
                  <th className='text-left px-4 py-2 font-semibold text-gray-600 text-xs'>Tên</th>
                  <th className='text-left px-4 py-2 font-semibold text-gray-600 text-xs'>Kiểu</th>
                  <th className='text-left px-4 py-2 font-semibold text-gray-600 text-xs'></th>
                  <th className='text-left px-4 py-2 font-semibold text-gray-600 text-xs'>Mô tả</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-gray-100'>
                {[
                  { name: 'product_code', type: 'string', req: true, desc: 'Mã sản phẩm — lấy từ GET /products' },
                  { name: 'quantity', type: 'integer', req: false, desc: 'Số lượng proxy (mặc định: 1)' },
                  { name: 'duration', type: 'integer', req: false, desc: 'Số ngày sử dụng — tuỳ sản phẩm' },
                  { name: 'protocol', type: 'string', req: false, desc: 'http hoặc socks5 (mặc định: http)' },
                  { name: 'custom_fields', type: 'object', req: false, desc: 'Tuỳ chọn riêng từng sản phẩm (nếu có). Xem chi tiết bên dưới.' },
                  { name: 'external_ref', type: 'string', req: false, desc: 'Mã tham chiếu để chống trùng đơn' },
                  { name: 'ip_whitelist', type: 'string[]', req: false, desc: 'Danh sách IP whitelist (tối đa 10)' },
                ].map(p => (
                  <tr key={p.name}>
                    <td className='px-4 py-2.5'>
                      <code className='font-mono bg-gray-100 px-1.5 py-0.5 rounded text-rose-600 text-xs'>{p.name}</code>
                    </td>
                    <td className='px-4 py-2.5 text-gray-500 text-xs'>{p.type}</td>
                    <td className='px-4 py-2.5'>
                      {p.req ? (
                        <span className='text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded'>Required</span>
                      ) : (
                        <span className='text-[10px] font-bold text-gray-400'>Optional</span>
                      )}
                    </td>
                    <td className='px-4 py-2.5 text-gray-600 text-xs'>{p.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Lookup sản phẩm */}
        <div className='space-y-3'>
          <h3 className='text-sm font-semibold text-gray-800 m-0'>Thử với sản phẩm cụ thể</h3>
          <p className='text-xs text-gray-500 m-0'>
            Nhập <code className='bg-gray-100 px-1 py-0.5 rounded text-xs'>product_code</code> hoặc{' '}
            <code className='bg-gray-100 px-1 py-0.5 rounded text-xs'>ID</code> để xem tham số chi tiết và request mẫu.
          </p>
          <div className='flex gap-2'>
            <input
              type='text'
              value={inputCode}
              onChange={e => setInputCode(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLookup()}
              placeholder='VD: B-static-ipv4-vn-datacenter hoặc 28'
              className='flex-1 px-3 py-2 rounded-lg border border-gray-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent'
            />
            <button
              onClick={handleLookup}
              className='px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition-colors'
            >
              Xem
            </button>
          </div>

          {/* Quick select — dropdown nhỏ cho ai muốn browse */}
          <div className='flex items-center gap-2'>
            <span className='text-xs text-gray-400'>hoặc chọn nhanh:</span>
            <select
              value={selectedCode ?? ''}
              onChange={e => {
                setSelectedCode(e.target.value || null)
                setInputCode(e.target.value)
              }}
              className='text-xs px-2 py-1 rounded border border-gray-200 text-gray-600 focus:outline-none focus:ring-1 focus:ring-gray-400'
            >
              <option value=''>— Chọn sản phẩm —</option>
              {products.map(p => (
                <option key={p.code} value={p.code}>
                  {p.name} ({p.code})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Kết quả lookup */}
        {selectedCode && !selectedProduct && (
          <div className='bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700'>
            Không tìm thấy sản phẩm <code className='font-mono bg-red-100 px-1 py-0.5 rounded'>{selectedCode}</code>.
            Gọi <code className='font-mono bg-red-100 px-1 py-0.5 rounded'>GET /products</code> để xem danh sách.
          </div>
        )}

        {selectedProduct && (
          <div className='space-y-4'>
            {/* Specs tóm tắt */}
            <div className='bg-gray-50 rounded-lg px-4 py-3 space-y-2'>
              <div className='flex items-center gap-2'>
                <span className='text-sm font-bold text-gray-900'>{selectedProduct.name}</span>
                <code className='text-[11px] font-mono text-gray-500 bg-gray-200 px-1.5 py-0.5 rounded'>
                  {selectedProduct.code}
                </code>
                {selectedProduct.tag && (
                  <span className='text-[10px] px-1.5 py-0.5 rounded font-semibold bg-amber-50 text-amber-700'>
                    {selectedProduct.tag}
                  </span>
                )}
              </div>
              {selectedProduct.note && (
                <p className='text-xs text-gray-500 m-0'>{selectedProduct.note}</p>
              )}
              <ProductSpecs product={selectedProduct} />
            </div>

            {/* Custom fields explanation */}
            {selectedProduct.custom_fields?.length ? (
              <div className='bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 space-y-2'>
                <p className='text-xs font-semibold text-blue-800 m-0'>
                  Sản phẩm này có tuỳ chọn riêng — gửi trong <code className='bg-blue-100 px-1 py-0.5 rounded'>custom_fields</code>:
                </p>
                {selectedProduct.custom_fields.map(f => (
                  <div key={f.key || f.label} className='text-xs text-blue-700'>
                    <code className='font-mono bg-blue-100 px-1 py-0.5 rounded'>{f.key || f.label}</code>
                    {' — '}{f.label}
                    {f.required && <span className='text-red-600 ml-1'>(bắt buộc)</span>}
                    {f.type === 'select' && f.options?.length ? (
                      <span className='text-blue-500'>
                        {' '}· Giá trị: {f.options.map(o => o.key).join(', ')}
                      </span>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}

            {/* Builder */}
            <BuyProxyBuilder product={selectedProduct} apiKey={apiKey} />
          </div>
        )}

        {!selectedCode && (
          <div className='text-center py-8 text-gray-400 text-sm'>
            Nhập product_code hoặc chọn sản phẩm để xem request mẫu
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────

// Lọc bỏ buy-proxy static (sẽ dùng product-driven thay thế)
const staticEndpoints = apiEndpoints.filter(e => e.id !== 'buy-proxy')

type ViewMode = 'getting-started' | 'buy-proxy' | { endpointId: string }

export default function ApiDocsPage() {
  const { status } = useSession()
  const isAuth = status === 'authenticated'
  const { data: credentials } = useMyCredentials(isAuth)
  const userApiKey = credentials?.api_key || ''

  const { data: products = [], isLoading: productsLoading } = usePublicProducts()

  const [view, setView] = useState<ViewMode>('getting-started')

  const grouped = useMemo(() => {
    const g: Record<string, ApiEndpoint[]> = {}

    staticEndpoints.forEach(a => {
      if (!g[a.category]) g[a.category] = []
      g[a.category].push(a)
    })

    return g
  }, [])

  const selectedEp =
    typeof view === 'object' ? staticEndpoints.find(e => e.id === view.endpointId) || null : null

  // ─── Sidebar ───
  const sidebar = (
    <div className='w-64 bg-gray-50 border-r border-gray-200 flex flex-col flex-shrink-0'>
      {/* Getting Started */}
      <div
        onClick={() => setView('getting-started')}
        className={`px-4 py-3 cursor-pointer transition-all border-b border-gray-200 ${
          view === 'getting-started'
            ? 'bg-white border-l-[3px] border-l-orange-500 shadow-sm'
            : 'border-l-[3px] border-l-transparent hover:bg-white/60'
        }`}
      >
        <span className={`text-sm ${view === 'getting-started' ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>
          Bắt đầu
        </span>
      </div>

      <div className='flex-1 overflow-y-auto'>
        {/* Buy Proxy — special entry */}
        <div className='px-4 pt-4 pb-2'>
          <span className='text-[11px] font-bold text-gray-400 uppercase tracking-wider'>Mua Proxy</span>
        </div>
        <div
          onClick={() => setView('buy-proxy')}
          className={`group px-4 py-3 cursor-pointer transition-all ${
            view === 'buy-proxy'
              ? 'bg-white border-l-[3px] border-l-orange-500 shadow-sm'
              : 'border-l-[3px] border-l-transparent hover:bg-white/60'
          }`}
        >
          <div className='flex items-center gap-2'>
            <span className='px-1.5 py-0.5 rounded text-[10px] font-bold text-white bg-emerald-600 flex-shrink-0'>
              POST
            </span>
            <span className={`text-sm ${view === 'buy-proxy' ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>
              Mua Proxy
            </span>
            {productsLoading && <Loader2 size={12} className='animate-spin text-gray-400' />}
          </div>
        </div>

        {/* Static endpoints */}
        {Object.entries(grouped).map(([cat, apis]) => (
          <div key={cat}>
            <div className='px-4 pt-4 pb-2'>
              <span className='text-[11px] font-bold text-gray-400 uppercase tracking-wider'>
                {categoryLabels[cat] || cat}
              </span>
            </div>
            {apis.map(a => {
              const active = typeof view === 'object' && view.endpointId === a.id

              return (
                <div
                  key={a.id}
                  onClick={() => setView({ endpointId: a.id })}
                  className={`group px-4 py-3 cursor-pointer transition-all ${
                    active
                      ? 'bg-white border-l-[3px] border-l-orange-500 shadow-sm'
                      : 'border-l-[3px] border-l-transparent hover:bg-white/60'
                  }`}
                >
                  <div className='flex items-center gap-2'>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold text-white ${methodColor(a.method)} flex-shrink-0`}
                    >
                      {a.method}
                    </span>
                    <span className={`text-sm ${active ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>
                      {a.title}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div className='flex rounded-xl overflow-hidden border border-gray-200 bg-white flex-1 min-h-0'>
      {sidebar}
      {view === 'getting-started' && <GettingStarted apiKey={userApiKey} />}
      {view === 'buy-proxy' && <BuyProxyView products={products} apiKey={userApiKey} />}
      {selectedEp && <StaticEndpointView ep={selectedEp} apiKey={userApiKey} />}
    </div>
  )
}
