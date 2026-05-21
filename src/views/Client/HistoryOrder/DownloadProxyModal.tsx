'use client'

import React, { useMemo, useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  RadioGroup,
  FormControlLabel,
  Radio,
  TextField,
  Stack,
  Tabs,
  Tab,
  Chip,
  IconButton,
} from '@mui/material'
import { Copy, Download, X } from 'lucide-react'
import { toast } from 'react-toastify'

interface ResidentialMeta {
  host?: string
  port_start?: number
  port_end?: number
  total_ports?: number
  login?: string
  password?: string
}

interface Props {
  open: boolean
  onClose: () => void
  orderCode: string
  meta: ResidentialMeta
}

const FORMAT_PRESETS = [
  { key: 'user_pass_host_port', label: '{user}:{pass}@{host}:{port}', template: '{user}:{pass}@{host}:{port}' },
  { key: 'host_port_user_pass', label: '{host}:{port}:{user}:{pass}', template: '{host}:{port}:{user}:{pass}' },
  { key: 'host_port_at_user_pass', label: '{host}:{port}@{user}:{pass}', template: '{host}:{port}@{user}:{pass}' },
]

const FILE_TYPES = [
  { key: 'txt', label: '.txt — 1 dòng/proxy', mime: 'text/plain' },
  { key: 'csv', label: '.csv — host,port,user,pass', mime: 'text/csv' },
]

const DownloadProxyModal: React.FC<Props> = ({ open, onClose, orderCode, meta }) => {
  const [formatKey, setFormatKey] = useState('user_pass_host_port')
  const [customTemplate, setCustomTemplate] = useState('{user}:{pass}@{host}:{port}')
  const [useCustom, setUseCustom] = useState(false)
  const [fileType, setFileType] = useState('txt')
  const [rangeMode, setRangeMode] = useState<'all' | 'first_n' | 'custom'>('all')
  const [firstN, setFirstN] = useState(100)
  const [customStart, setCustomStart] = useState<number | ''>(meta.port_start ?? 10000)
  const [customEnd, setCustomEnd] = useState<number | ''>(meta.port_end ?? 10999)

  const portStart = meta.port_start ?? 10000
  const portEnd = meta.port_end ?? 10999
  const host = meta.host ?? ''
  const login = meta.login ?? ''
  const password = meta.password ?? ''

  const effectiveTemplate = useCustom ? customTemplate : (FORMAT_PRESETS.find(p => p.key === formatKey)?.template ?? FORMAT_PRESETS[0].template)

  const portRange = useMemo<[number, number]>(() => {
    if (rangeMode === 'all') return [portStart, portEnd]
    if (rangeMode === 'first_n') {
      const n = Math.max(1, Math.min(firstN, portEnd - portStart + 1))
      return [portStart, portStart + n - 1]
    }
    const start = typeof customStart === 'number' ? Math.max(portStart, customStart) : portStart
    const end = typeof customEnd === 'number' ? Math.min(portEnd, customEnd) : portEnd
    return [start, Math.max(start, end)]
  }, [rangeMode, firstN, customStart, customEnd, portStart, portEnd])

  const totalCount = portRange[1] - portRange[0] + 1

  const previewLines = useMemo(() => {
    const [s] = portRange
    const result: string[] = []
    const previewCount = Math.min(3, totalCount)
    for (let i = 0; i < previewCount; i++) {
      result.push(buildProxy(effectiveTemplate, host, s + i, login, password))
    }
    return result
  }, [effectiveTemplate, host, portRange, login, password, totalCount])

  const buildAll = (): string[] => {
    const [s, e] = portRange
    const lines: string[] = []
    for (let p = s; p <= e; p++) {
      lines.push(buildProxy(effectiveTemplate, host, p, login, password))
    }
    return lines
  }

  const buildCsv = (): string => {
    const [s, e] = portRange
    const rows = ['host,port,user,pass']
    for (let p = s; p <= e; p++) {
      rows.push(`${host},${p},${login},${password}`)
    }
    return rows.join('\n')
  }

  const handleDownload = () => {
    let content = ''
    let mime = 'text/plain'
    let ext = 'txt'

    if (fileType === 'csv') {
      content = buildCsv()
      mime = 'text/csv'
      ext = 'csv'
    } else {
      content = buildAll().join('\n')
    }

    const blob = new Blob([content], { type: mime + ';charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `proxy-${orderCode}-${portRange[0]}_${portRange[1]}.${ext}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.info(`Đã tải ${totalCount} proxy`)
  }

  const handleCopyAll = async () => {
    const content = fileType === 'csv' ? buildCsv() : buildAll().join('\n')
    try {
      await navigator.clipboard.writeText(content)
      toast.info(`Đã copy ${totalCount} dòng`)
    } catch {
      toast.error('Trình duyệt chặn copy')
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth='sm' fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        Tải proxy list ({totalCount} proxy)
        <IconButton onClick={onClose} size='small'><X size={18} /></IconButton>
      </DialogTitle>

      <DialogContent dividers>
        <Stack spacing={2}>
          {/* Format */}
          <Box>
            <Typography variant='subtitle2' mb={1}>Định dạng proxy</Typography>
            <RadioGroup value={useCustom ? 'custom' : formatKey} onChange={(e) => {
              if (e.target.value === 'custom') {
                setUseCustom(true)
              } else {
                setUseCustom(false)
                setFormatKey(e.target.value)
              }
            }}>
              {FORMAT_PRESETS.map(p => (
                <FormControlLabel
                  key={p.key}
                  value={p.key}
                  control={<Radio size='small' />}
                  label={<code style={{ fontSize: 13 }}>{p.label}</code>}
                />
              ))}
              <FormControlLabel value='custom' control={<Radio size='small' />} label='Tự nhập template' />
            </RadioGroup>
            {useCustom && (
              <TextField
                fullWidth
                size='small'
                value={customTemplate}
                onChange={(e) => setCustomTemplate(e.target.value)}
                placeholder='{user}:{pass}@{host}:{port}'
                helperText='Biến hỗ trợ: {host} {port} {user} {pass}'
                sx={{ mt: 1 }}
              />
            )}
          </Box>

          {/* Range */}
          <Box>
            <Typography variant='subtitle2' mb={1}>Số lượng proxy</Typography>
            <Tabs
              value={rangeMode}
              onChange={(_, v) => setRangeMode(v)}
              variant='fullWidth'
              sx={{ mb: 1, minHeight: 36, '& .MuiTab-root': { minHeight: 36 } }}
            >
              <Tab label={`Tất cả (${portEnd - portStart + 1})`} value='all' />
              <Tab label='N proxy đầu' value='first_n' />
              <Tab label='Theo port' value='custom' />
            </Tabs>

            {rangeMode === 'first_n' && (
              <TextField
                fullWidth
                size='small'
                type='number'
                label='Số proxy'
                value={firstN}
                onChange={(e) => setFirstN(parseInt(e.target.value) || 1)}
                inputProps={{ min: 1, max: portEnd - portStart + 1 }}
              />
            )}

            {rangeMode === 'custom' && (
              <Stack direction='row' spacing={1}>
                <TextField
                  fullWidth size='small' type='number' label='Port bắt đầu'
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value === '' ? '' : parseInt(e.target.value))}
                  inputProps={{ min: portStart, max: portEnd }}
                />
                <TextField
                  fullWidth size='small' type='number' label='Port kết thúc'
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value === '' ? '' : parseInt(e.target.value))}
                  inputProps={{ min: portStart, max: portEnd }}
                />
              </Stack>
            )}
          </Box>

          {/* File type */}
          <Box>
            <Typography variant='subtitle2' mb={1}>Định dạng file</Typography>
            <RadioGroup row value={fileType} onChange={(e) => setFileType(e.target.value)}>
              {FILE_TYPES.map(f => (
                <FormControlLabel key={f.key} value={f.key} control={<Radio size='small' />} label={f.label} />
              ))}
            </RadioGroup>
          </Box>

          {/* Preview */}
          <Box>
            <Typography variant='subtitle2' mb={1}>Xem trước (3 dòng đầu)</Typography>
            <Box
              p={1.5}
              sx={{
                background: '#0f172a',
                color: '#e2e8f0',
                borderRadius: 1,
                fontFamily: 'monospace',
                fontSize: 12,
                overflow: 'auto',
              }}
            >
              {previewLines.map((l, i) => <div key={i}>{l}</div>)}
              {totalCount > 3 && <div style={{ color: '#64748b' }}>... và {totalCount - 3} dòng nữa</div>}
            </Box>
          </Box>

          <Chip
            size='small'
            label={`Tổng: ${totalCount} proxy (port ${portRange[0]} → ${portRange[1]})`}
            color='primary'
            variant='outlined'
          />
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleCopyAll} startIcon={<Copy size={16} />}>Copy tất cả</Button>
        <Button onClick={handleDownload} variant='contained' startIcon={<Download size={16} />}>
          Tải file
        </Button>
      </DialogActions>
    </Dialog>
  )
}

function buildProxy(template: string, host: string, port: number, user: string, pass: string): string {
  return template
    .replace(/{host}/g, host)
    .replace(/{port}/g, String(port))
    .replace(/{user}/g, user)
    .replace(/{pass}/g, pass)
}

export default DownloadProxyModal
