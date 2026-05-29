'use client'

import { useEffect, useMemo, useState } from 'react'

import {
  Box, Button, Checkbox, Chip, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, IconButton, InputAdornment, Stack, TextField, Typography
} from '@mui/material'
import { Search, X } from 'lucide-react'
import { toast } from 'react-toastify'

import useAxiosAuth from '@/hocs/useAxiosAuth'

/**
 * Modal admin chọn options từ NCC API.
 * Dùng cho field source=api_tariffs|api_countries — admin chọn subset từ list NCC trả về.
 *
 * Hỗ trợ: search, select all, đếm số đã chọn, preview flag cho country.
 */

type NccOption = {
  key: string
  provider_value: string | number
  label: string
  flag?: string
}

type Props = {
  open: boolean
  onClose: () => void
  providerCode: string
  source: 'api_tariffs' | 'api_countries' | 'api_regions' | 'api_cities'
  // Subset đã chọn trước đó — admin tick sẵn để dễ edit
  currentSelection: NccOption[]
  onSave: (selected: NccOption[]) => void
  // Cho dependent sources (regions/cities): cần value parent để query
  parentCountryCode?: string  // cho api_regions + api_cities (cần country)
  parentRegionName?: string   // cho api_cities (cần region)
  parentLabel?: string        // hiển thị tiêu đề ("Regions cho Vietnam")
}

export default function NccOptionsPickerModal({
  open, onClose, providerCode, source, currentSelection, onSave,
  parentCountryCode, parentRegionName, parentLabel
}: Props) {
  const axiosAuth = useAxiosAuth()
  const [loading, setLoading] = useState(false)
  const [allOptions, setAllOptions] = useState<NccOption[]>([])
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')

  const slug = providerCode.split('.')[0]
  const endpointMap: Record<string, string> = {
    api_tariffs: 'tariffs', api_countries: 'countries',
    api_regions: 'regions', api_cities: 'cities'
  }
  const endpoint = endpointMap[source]
  const isCountry = source === 'api_countries'

  // Khi mở modal — fetch options từ NCC + load current selection
  useEffect(() => {
    if (!open || !providerCode) return
    setSelectedKeys(new Set(currentSelection.map(o => o.key)))

    let active = true
    setLoading(true)
    let url = `/admin/${slug}/${endpoint}`
    const params: Record<string, string> = {}
    if (source === 'api_regions') {
      if (!parentCountryCode) { toast.error('Thiếu country để load regions'); setLoading(false); return }
      params.country_code = parentCountryCode
    }
    if (source === 'api_cities') {
      if (!parentCountryCode || !parentRegionName) { toast.error('Thiếu country/region để load cities'); setLoading(false); return }
      params.country_code = parentCountryCode
      params.region_name = parentRegionName
    }
    const qs = new URLSearchParams(params).toString()
    if (qs) url += '?' + qs

    axiosAuth.get(url)
      .then(res => {
        if (!active) return
        const list = res?.data?.data ?? []
        const normalized: NccOption[] = endpoint === 'tariffs'
          ? list.map((t: any) => ({
              key: t.key_suggest || `${t.traffic_gb}gb`,
              provider_value: t.tariff_id,
              label: `${t.name} — ${t.traffic_label} — ${t.price_label}`
            }))
          : endpoint === 'countries'
          ? list.map((c: any) => ({
              key: c.code.toLowerCase(),
              provider_value: c.code,
              label: c.name,
              flag: c.code.toLowerCase()
            }))
          : list.map((s: string) => ({  // regions/cities trả mảng string
              key: s, provider_value: s, label: s
            }))
        setAllOptions(normalized)
      })
      .catch(e => toast.error(e?.response?.data?.message || e.message))
      .finally(() => active && setLoading(false))

    return () => { active = false }
  }, [open, providerCode, endpoint])

  const filtered = useMemo(() => {
    if (!search.trim()) return allOptions
    const q = search.toLowerCase()
    return allOptions.filter(o =>
      o.label.toLowerCase().includes(q) ||
      String(o.provider_value).toLowerCase().includes(q) ||
      o.key.toLowerCase().includes(q)
    )
  }, [allOptions, search])

  const toggleOne = (key: string) => {
    setSelectedKeys(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key); else next.add(key)
      return next
    })
  }

  const toggleAllFiltered = () => {
    const filteredKeys = filtered.map(o => o.key)
    const allChecked = filteredKeys.every(k => selectedKeys.has(k))
    setSelectedKeys(prev => {
      const next = new Set(prev)
      if (allChecked) filteredKeys.forEach(k => next.delete(k))
      else filteredKeys.forEach(k => next.add(k))
      return next
    })
  }

  const handleSave = () => {
    const selected = allOptions.filter(o => selectedKeys.has(o.key))
    if (selected.length === 0) {
      toast.error('Phải chọn ít nhất 1 option')
      return
    }
    onSave(selected)
    onClose()
  }

  const allFilteredChecked = filtered.length > 0 && filtered.every(o => selectedKeys.has(o.key))

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth='md'>
      <DialogTitle sx={{ pb: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Typography fontWeight={600}>
            Chọn options từ NCC — {endpoint.charAt(0).toUpperCase() + endpoint.slice(1)}
            {parentLabel && <span style={{ color: '#6366f1', marginLeft: 6 }}>cho {parentLabel}</span>}
          </Typography>
          <Typography variant='caption' color='text.secondary'>
            {loading ? 'Đang tải...' : `${allOptions.length} options tổng • Đã chọn: ${selectedKeys.size}`}
          </Typography>
        </Box>
        <IconButton size='small' onClick={onClose}><X size={16} /></IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 0 }}>
        {/* Search + Select all */}
        <Box sx={{ p: 2, borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
          <Stack direction='row' spacing={1.5} alignItems='center'>
            <TextField
              size='small' fullWidth value={search} onChange={e => setSearch(e.target.value)}
              placeholder='Tìm theo tên / code / label...'
              InputProps={{
                startAdornment: <InputAdornment position='start'><Search size={14} /></InputAdornment>,
              }}
            />
            <Button size='small' variant='outlined' onClick={toggleAllFiltered} disabled={filtered.length === 0} sx={{ whiteSpace: 'nowrap' }}>
              {allFilteredChecked ? 'Bỏ chọn tất cả' : 'Chọn tất cả'} ({filtered.length})
            </Button>
          </Stack>
        </Box>

        {/* List */}
        <Box sx={{ maxHeight: 480, overflow: 'auto' }}>
          {loading ? (
            <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box>
          ) : filtered.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
              {allOptions.length === 0 ? 'NCC không trả về option nào' : 'Không có kết quả khớp'}
            </Box>
          ) : (
            filtered.map(opt => {
              const checked = selectedKeys.has(opt.key)
              return (
                <Box
                  key={opt.key}
                  onClick={() => toggleOne(opt.key)}
                  sx={{
                    px: 2, py: 1, display: 'flex', alignItems: 'center', gap: 1.5,
                    borderBottom: '1px solid #f1f5f9', cursor: 'pointer',
                    background: checked ? '#eef2ff' : 'transparent',
                    '&:hover': { background: checked ? '#e0e7ff' : '#f8fafc' }
                  }}
                >
                  <Checkbox checked={checked} size='small' sx={{ p: 0 }} />
                  {isCountry && opt.flag && (
                    <img src={`https://flagcdn.com/w20/${opt.flag}.png`} alt='' style={{ width: 22, height: 16, objectFit: 'cover', borderRadius: 2 }} />
                  )}
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography fontSize={13} fontWeight={500}>{opt.label}</Typography>
                    <Typography variant='caption' color='text.secondary'>
                      key=<code>{opt.key}</code> · value=<code>{opt.provider_value}</code>
                    </Typography>
                  </Box>
                </Box>
              )
            })
          )}
        </Box>

        {/* Footer count */}
        {selectedKeys.size > 0 && (
          <Box sx={{ p: 1.5, background: '#f0f9ff', borderTop: '1px solid #bae6fd' }}>
            <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap>
              {Array.from(selectedKeys).slice(0, 15).map(k => {
                const opt = allOptions.find(o => o.key === k)
                return opt ? <Chip key={k} size='small' label={opt.label} onDelete={() => toggleOne(k)} /> : null
              })}
              {selectedKeys.size > 15 && <Chip size='small' label={`+${selectedKeys.size - 15} nữa`} />}
            </Stack>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 2, py: 1.5 }}>
        <Button onClick={onClose}>Huỷ</Button>
        <Button variant='contained' onClick={handleSave} disabled={loading || selectedKeys.size === 0}>
          Lưu {selectedKeys.size} options
        </Button>
      </DialogActions>
    </Dialog>
  )
}
