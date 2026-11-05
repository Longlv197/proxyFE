'use client'

import { useState } from 'react'
import { useWatch, useFormContext } from 'react-hook-form'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Checkbox from '@mui/material/Checkbox'
import FormControlLabel from '@mui/material/FormControlLabel'
import type { UseFormSetValue } from 'react-hook-form'

import type { BuySectionProps, FormValues } from '../ProviderFormTypes'
import { autoSuggestConfig, type Suggestion } from '../hooks/useAutoSuggest'

function getByDotPath(obj: any, path: string): any {
  return path.split('.').reduce((curr, key) => curr?.[key], obj)
}

interface ResponseDryRunProps extends BuySectionProps {
  setValue?: UseFormSetValue<FormValues>
}

export default function ResponseDryRun({ prefix, control, setValue }: ResponseDryRunProps) {
  const [input, setInput] = useState('')
  const [result, setResult] = useState<{ lines: { label: string; value: string; status: 'ok' | 'error' | 'info' }[] } | null>(null)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<string>>(new Set())

  const successField = useWatch({ control, name: `${prefix}.response.success_field` as any })
  const successValue = useWatch({ control, name: `${prefix}.response.success_value` as any })
  const responseType = useWatch({ control, name: `${prefix}.response.type` as any })
  const proxiesPath = useWatch({ control, name: `${prefix}.response.proxies_path` as any })
  const proxiesShape = useWatch({ control, name: `${prefix}.response.proxies_shape` as any })
  const proxyFormat = useWatch({ control, name: `${prefix}.response.proxy_format` as any })
  const proxyKeyField = useWatch({ control, name: `${prefix}.response.proxy_key_field` as any })
  const proxyFieldsIp = useWatch({ control, name: `${prefix}.response.proxy_fields_ip` as any })
  const proxyFieldsPort = useWatch({ control, name: `${prefix}.response.proxy_fields_port` as any })
  const proxyFieldsUser = useWatch({ control, name: `${prefix}.response.proxy_fields_user` as any })
  const proxyFieldsPass = useWatch({ control, name: `${prefix}.response.proxy_fields_pass` as any })
  const itemIdField = useWatch({ control, name: `${prefix}.response.item_id_field` as any })
  const responseMapping: any[] = useWatch({ control, name: `${prefix}.response.response_mapping` as any }) || []

  const handleTest = () => {
    if (!input.trim()) return
    const lines: { label: string; value: string; status: 'ok' | 'error' | 'info' }[] = []

    try {
      const data = JSON.parse(input)

      if (successField) {
        const actual = responseType === 'array_last_status'
          ? (Array.isArray(data) ? data[data.length - 1]?.[successField] : data[successField])
          : getByDotPath(data, successField)
        const expected = successValue
        const match = String(actual) === String(expected)
        lines.push({
          label: `Kiểm tra thành công: "${successField}" = ${expected}`,
          value: actual !== undefined ? `Tìm thấy: ${actual} → ${match ? 'THÀNH CÔNG' : 'THẤT BẠI'}` : `Không tìm thấy trường "${successField}"`,
          status: actual === undefined ? 'error' : match ? 'ok' : 'error',
        })
      }

      let proxies: any[] = []
      if (responseType === 'array_last_status' && Array.isArray(data)) {
        proxies = data.slice(0, -1)
        lines.push({ label: 'Danh sách proxy (bỏ phần tử cuối)', value: `Tìm thấy ${proxies.length} proxy`, status: proxies.length > 0 ? 'ok' : 'error' })
      } else if (proxiesPath) {
        const found = getByDotPath(data, proxiesPath)
        const laObject = found !== null && typeof found === 'object' && !Array.isArray(found)
        if (proxiesShape === 'object' && laObject) {
          proxies = [found]
          lines.push({ label: `"${proxiesPath}"`, value: '1 object, là 1 item', status: 'ok' })
        } else if (Array.isArray(found) && proxiesShape !== 'object') {
          const canObject = proxiesShape === 'list_object'
          const canChuoi = proxiesShape === 'list_string'
          const saiPhanTu = found.some(x => (canObject && (x === null || typeof x !== 'object')) || (canChuoi && typeof x === 'object'))
          proxies = saiPhanTu ? [] : found
          lines.push(saiPhanTu
            ? { label: `"${proxiesPath}"`, value: `Phần tử không đúng dạng đã khai (cần mảng ${canObject ? 'object' : 'chuỗi'})`, status: 'error' }
            : { label: `Danh sách proxy tại "${proxiesPath}"`, value: `Tìm thấy ${proxies.length} proxy`, status: proxies.length > 0 ? 'ok' : 'error' })
        } else if (found !== undefined && found !== null) {
          lines.push({ label: `"${proxiesPath}"`, value: `Giá trị: ${JSON.stringify(found).substring(0, 50)} (không đúng dạng đã khai)`, status: 'error' })
        } else {
          lines.push({ label: `"${proxiesPath}"`, value: 'Không tìm thấy', status: 'error' })
        }
      }

      const sample = proxies[0]
      if (sample) {
        lines.push({ label: '--- Phân tích proxy đầu tiên ---', value: '', status: 'info' })
        if (proxyFormat === 'key') {
          const key = proxyKeyField || 'keyxoay'
          const val = sample[key]
          lines.push({ label: `Key proxy: "${key}"`, value: val !== undefined ? `✓ ${val}` : `✗ Không tìm thấy`, status: val !== undefined ? 'ok' : 'error' })
        } else if (proxyFormat === 'string') {
          const field = proxyKeyField || 'proxy'
          const val = sample[field]
          if (val) {
            const parts = String(val).split(':')
            lines.push({ label: `Chuỗi proxy: "${field}"`, value: `✓ ${val}`, status: 'ok' })
            lines.push({ label: '  → IP', value: parts[0] || '(trống)', status: parts[0] ? 'ok' : 'error' })
            lines.push({ label: '  → Port', value: parts[1] || '(trống)', status: parts[1] ? 'ok' : 'error' })
            lines.push({ label: '  → User', value: parts[2] || '(trống)', status: parts[2] ? 'ok' : 'info' })
            lines.push({ label: '  → Pass', value: parts[3] || '(trống)', status: parts[3] ? 'ok' : 'info' })
          } else {
            lines.push({ label: `Chuỗi proxy: "${field}"`, value: '✗ Không tìm thấy', status: 'error' })
          }
        } else if (proxyFormat === 'fields') {
          const fields = [
            { label: 'IP', key: proxyFieldsIp || 'ip' },
            { label: 'Port', key: proxyFieldsPort || 'port' },
            { label: 'User', key: proxyFieldsUser || 'username' },
            { label: 'Pass', key: proxyFieldsPass || 'password' },
          ]
          fields.forEach(f => {
            const val = sample[f.key]
            lines.push({ label: `${f.label}: "${f.key}"`, value: val !== undefined ? `✓ ${val}` : `✗ Không tìm thấy`, status: val !== undefined ? 'ok' : 'error' })
          })
        }

        if (itemIdField) {
          const val = sample[itemIdField]
          lines.push({ label: `ID proxy: "${itemIdField}"`, value: val !== undefined ? `✓ ${val}` : `✗ Không tìm thấy`, status: val !== undefined ? 'ok' : 'error' })
        }

        responseMapping.filter(r => r?.from && r?.to).forEach(r => {
          const val = getByDotPath(sample, r.from)
          lines.push({ label: `${r.to}: "${r.from}"`, value: val !== undefined ? `✓ ${val}` : `✗ Không tìm thấy`, status: val !== undefined ? 'ok' : 'error' })
        })
      }
    } catch {
      lines.push({ label: 'Lỗi parse JSON', value: 'Response không đúng định dạng JSON', status: 'error' })
    }

    setResult({ lines })
  }

  const handleAutoSuggest = () => {
    if (!input.trim()) return
    const results = autoSuggestConfig(input)
    setSuggestions(results)
    setSelectedSuggestions(new Set(results.map(s => s.id)))
  }

  const handleApplySuggestions = () => {
    if (!setValue) return
    suggestions
      .filter(s => selectedSuggestions.has(s.id))
      .forEach(s => {
        const fieldPath = s.field.startsWith('response_mode')
          ? `${prefix}.${s.field}`
          : `${prefix}.${s.field}`
        setValue(fieldPath as any, s.value)
      })
    // After applying, run the test to validate
    setTimeout(handleTest, 100)
  }

  const toggleSuggestion = (id: string) => {
    setSelectedSuggestions(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <Box sx={{ mt: 1, p: 1.5, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 1.5 }}>
      <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#334155', mb: 0.5 }}>
        Kiểm tra cấu hình — paste response mẫu từ nhà cung cấp
      </Typography>
      <Typography sx={{ fontSize: 11, color: '#64748b', mb: 1 }}>
        Gọi thử API nhà cung cấp, copy kết quả trả về, paste vào đây. Hệ thống sẽ phân tích và gợi ý cấu hình tự động.
      </Typography>
      <textarea
        value={input}
        onChange={e => { setInput(e.target.value); setSuggestions([]); setResult(null) }}
        placeholder='Paste JSON response từ nhà cung cấp vào đây...'
        style={{
          width: '100%', minHeight: 80, padding: 10, fontSize: 12,
          fontFamily: 'monospace', border: '1px solid #e2e8f0', borderRadius: 6,
          background: '#fff', resize: 'vertical', outline: 'none',
        }}
      />
      <Box sx={{ mt: 1, display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
        {setValue && (
          <Button size='small' variant='outlined' onClick={handleAutoSuggest} disabled={!input.trim()}
            sx={{ textTransform: 'none', fontSize: 12, borderColor: '#3b82f6', color: '#3b82f6' }}>
            Tự động nhận dạng
          </Button>
        )}
        <Button size='small' variant='contained' onClick={handleTest} disabled={!input.trim()}
          sx={{ textTransform: 'none', fontSize: 12 }}>
          Kiểm tra cấu hình
        </Button>
        {(result || suggestions.length > 0) && (
          <Button size='small' onClick={() => { setResult(null); setInput(''); setSuggestions([]) }}
            sx={{ textTransform: 'none', fontSize: 12, color: '#64748b' }}>
            Xoá
          </Button>
        )}
      </Box>

      {/* Auto-suggest results */}
      {suggestions.length > 0 && (
        <Box sx={{ mt: 1.5, border: '1px solid #93c5fd', borderRadius: 1.5, overflow: 'hidden', background: '#eff6ff' }}>
          <Box sx={{ px: 1.5, py: 1, borderBottom: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#1d4ed8' }}>
              Gợi ý cấu hình ({suggestions.length} mục)
            </Typography>
            {setValue && (
              <Button size='small' variant='contained' onClick={handleApplySuggestions}
                disabled={selectedSuggestions.size === 0}
                sx={{ textTransform: 'none', fontSize: 11, py: 0.25 }}>
                Áp dụng đã chọn ({selectedSuggestions.size})
              </Button>
            )}
          </Box>
          {suggestions.map(s => (
            <Box key={s.id} sx={{
              display: 'flex', alignItems: 'center', px: 1, py: 0.5,
              borderBottom: '1px solid #dbeafe', fontSize: 12,
              '&:last-child': { borderBottom: 'none' },
            }}>
              <Checkbox
                size='small'
                checked={selectedSuggestions.has(s.id)}
                onChange={() => toggleSuggestion(s.id)}
                sx={{ p: 0.5, mr: 0.5 }}
              />
              <Box sx={{ flex: 1 }}>
                <span style={{ fontWeight: 500, color: '#1e40af' }}>{s.label}</span>
                {s.detail && (
                  <span style={{ color: '#64748b', marginLeft: 8, fontSize: 11 }}>{s.detail}</span>
                )}
              </Box>
            </Box>
          ))}
        </Box>
      )}

      {/* Validation results */}
      {result && (
        <Box sx={{ mt: 1, border: '1px solid #e2e8f0', borderRadius: 1, overflow: 'hidden' }}>
          {result.lines.map((l, i) => (
            <Box key={i} sx={{
              display: 'flex', gap: 1, px: 1, py: 0.5, fontSize: 12,
              background: l.status === 'error' ? '#fef2f2' : l.status === 'ok' ? '#f0fdf4' : '#fff',
              borderBottom: '1px solid #f1f5f9',
            }}>
              <span style={{ color: l.status === 'error' ? '#dc2626' : l.status === 'ok' ? '#16a34a' : '#64748b', minWidth: 220, flexShrink: 0, fontWeight: 500 }}>{l.label}</span>
              <span style={{ fontFamily: 'monospace', color: '#1e293b', wordBreak: 'break-all' }}>{l.value}</span>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  )
}
