'use client'

import React, { useState } from 'react'
import { Box, Typography, LinearProgress, Chip, Button, Stack, Divider, Tooltip } from '@mui/material'
import { Copy, Download, MapPin, Globe, Calendar, Database, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { toast } from 'react-toastify'

import { useCopy } from '@/app/hooks/useCopy'
import DownloadProxyModal from './DownloadProxyModal'

interface ResidentialMeta {
  list_id?: string | number
  package_key?: string
  host?: string
  port_start?: number
  port_end?: number
  total_ports?: number
  login?: string
  password?: string
  country_code?: string
  region_name?: string
  city?: string
  tariff_key?: string
  traffic_limit_mb?: number | null
  traffic_used_mb?: number | null
  traffic_synced_at?: string | null
  expired_at?: string | null
  days_left?: number | null
}

interface Props {
  meta: ResidentialMeta
  orderCode: string
  orderStatus?: string
}

const formatMb = (mb?: number | null): string => {
  if (mb === null || mb === undefined) return '—'
  if (mb < 1024) return `${mb} MB`
  return `${(mb / 1024).toFixed(2)} GB`
}

const ResidentialPackageBox: React.FC<Props> = ({ meta, orderCode, orderStatus }) => {
  const [, copy] = useCopy()
  const [downloadOpen, setDownloadOpen] = useState(false)

  // Trường hợp đơn chưa tạo list xong (stage 2 chưa chạy)
  if (!meta || !meta.list_id || !meta.host) {
    return (
      <Box p={3} sx={{ background: '#fff7ed', borderRadius: 2, border: '1px solid #fed7aa' }}>
        <Stack direction='row' spacing={1.5} alignItems='center'>
          <AlertTriangle size={20} color='#ea580c' />
          <Typography variant='body2' color='#9a3412'>
            Hệ thống đang tạo proxy list từ nhà cung cấp. Vui lòng đợi 30s và tải lại trang.
          </Typography>
        </Stack>
      </Box>
    )
  }

  const limit = meta.traffic_limit_mb ?? 0
  const used = meta.traffic_used_mb ?? 0
  const usedPct = limit > 0 ? Math.min(100, (used * 100) / limit) : 0
  const trafficColor = usedPct > 80 ? 'error' : usedPct > 60 ? 'warning' : 'success'

  const daysLeft = meta.days_left ?? null
  const expiryColor = daysLeft !== null && daysLeft <= 3 ? '#dc2626' : '#16a34a'

  const handleCopy = (value: string | undefined, label: string) => {
    if (!value) return
    copy(value, `Đã copy ${label}`)
  }

  const sampleProxy = meta.login && meta.password && meta.host && meta.port_start
    ? `${meta.login}:${meta.password}@${meta.host}:${meta.port_start}`
    : null

  return (
    <Box>
      {/* Header card */}
      <Box
        p={3}
        sx={{
          background: 'linear-gradient(135deg, #eff6ff 0%, #ddd6fe 100%)',
          borderRadius: 2,
          border: '1px solid #c7d2fe',
          mb: 2,
        }}
      >
        <Stack direction='row' justifyContent='space-between' alignItems='flex-start' spacing={2}>
          <Box>
            <Stack direction='row' spacing={1} alignItems='center' mb={0.5}>
              <Globe size={18} color='#4338ca' />
              <Typography variant='subtitle2' fontWeight={700} color='#3730a3'>
                Residential Package — List #{meta.list_id}
              </Typography>
            </Stack>
            <Typography variant='caption' color='text.secondary'>
              {meta.country_code}{meta.region_name ? ` · ${meta.region_name}` : ''}{meta.city ? ` · ${meta.city}` : ''}
              {meta.tariff_key && ` · ${meta.tariff_key.toUpperCase()}`}
            </Typography>
          </Box>
          <Button
            variant='contained'
            size='small'
            startIcon={<Download size={16} />}
            onClick={() => setDownloadOpen(true)}
            sx={{ flexShrink: 0 }}
          >
            Tải proxy list
          </Button>
        </Stack>
      </Box>

      {/* Traffic + Expiry */}
      <Box display='grid' gridTemplateColumns={{ xs: '1fr', md: '1fr 1fr' }} gap={2} mb={2}>
        <Box p={2} sx={{ background: '#fff', borderRadius: 2, border: '1px solid #e5e7eb' }}>
          <Stack direction='row' spacing={1} alignItems='center' mb={1}>
            <Database size={16} color='#6366f1' />
            <Typography variant='body2' fontWeight={600}>Dung lượng</Typography>
          </Stack>
          <Typography variant='h6' fontWeight={700}>
            {formatMb(used)} <Typography component='span' variant='body2' color='text.secondary'>/ {formatMb(limit)}</Typography>
          </Typography>
          <LinearProgress
            variant='determinate'
            value={usedPct}
            color={trafficColor}
            sx={{ height: 8, borderRadius: 1, mt: 1 }}
          />
          <Typography variant='caption' color='text.secondary' mt={0.5} display='block'>
            Đã dùng {usedPct.toFixed(1)}%
            {meta.traffic_synced_at && ` · cập nhật ${new Date(meta.traffic_synced_at).toLocaleString('vi-VN')}`}
          </Typography>
        </Box>

        <Box p={2} sx={{ background: '#fff', borderRadius: 2, border: '1px solid #e5e7eb' }}>
          <Stack direction='row' spacing={1} alignItems='center' mb={1}>
            <Calendar size={16} color='#6366f1' />
            <Typography variant='body2' fontWeight={600}>Thời hạn</Typography>
          </Stack>
          <Typography variant='h6' fontWeight={700} color={expiryColor}>
            {daysLeft !== null ? `Còn ${daysLeft} ngày` : '—'}
          </Typography>
          {meta.expired_at && (
            <Typography variant='caption' color='text.secondary' display='block' mt={0.5}>
              Hết hạn: {new Date(meta.expired_at).toLocaleString('vi-VN')}
            </Typography>
          )}
          {daysLeft !== null && daysLeft <= 3 && (
            <Chip
              label='Sắp hết hạn'
              color='error'
              size='small'
              icon={<AlertTriangle size={14} />}
              sx={{ mt: 1 }}
            />
          )}
        </Box>
      </Box>

      {/* Credentials */}
      <Box p={2} sx={{ background: '#fff', borderRadius: 2, border: '1px solid #e5e7eb', mb: 2 }}>
        <Typography variant='body2' fontWeight={600} mb={1.5}>Thông tin truy cập</Typography>

        <Box display='grid' gridTemplateColumns={{ xs: '1fr', md: '1fr 1fr' }} gap={1.5}>
          <CredRow label='Host' value={meta.host} onCopy={() => handleCopy(meta.host, 'host')} />
          <CredRow
            label='Port range'
            value={`${meta.port_start} - ${meta.port_end}`}
            sub={`${meta.total_ports ?? 1000} ports`}
            onCopy={() => handleCopy(`${meta.port_start}-${meta.port_end}`, 'port range')}
          />
          <CredRow label='Username' value={meta.login} onCopy={() => handleCopy(meta.login, 'username')} />
          <CredRow label='Password' value={meta.password} onCopy={() => handleCopy(meta.password, 'password')} mask />
        </Box>

        {sampleProxy && (
          <>
            <Divider sx={{ my: 1.5 }} />
            <Stack direction='row' spacing={1} alignItems='center'>
              <Typography variant='caption' color='text.secondary' flex={1}>
                Ví dụ: <code style={{ background: '#f3f4f6', padding: '2px 6px', borderRadius: 4 }}>{sampleProxy}</code>
              </Typography>
              <Tooltip title='Copy proxy mẫu'>
                <Button size='small' onClick={() => handleCopy(sampleProxy, 'proxy mẫu')} sx={{ minWidth: 0 }}>
                  <Copy size={14} />
                </Button>
              </Tooltip>
            </Stack>
          </>
        )}
      </Box>

      {/* Status */}
      <Stack direction='row' spacing={1} alignItems='center'>
        <CheckCircle2 size={16} color='#16a34a' />
        <Typography variant='caption' color='text.secondary'>
          Mọi proxy trong khoảng port {meta.port_start}–{meta.port_end} cùng dùng user/pass trên. Proxyma tự xoay IP mỗi request trên cùng port.
        </Typography>
      </Stack>

      {/* Download modal */}
      <DownloadProxyModal
        open={downloadOpen}
        onClose={() => setDownloadOpen(false)}
        orderCode={orderCode}
        meta={meta}
      />
    </Box>
  )
}

interface CredRowProps {
  label: string
  value?: string | number | null
  sub?: string
  onCopy: () => void
  mask?: boolean
}

const CredRow: React.FC<CredRowProps> = ({ label, value, sub, onCopy, mask }) => {
  const [revealed, setRevealed] = useState(!mask)
  const displayValue = value === null || value === undefined ? '—' : String(value)
  const masked = mask && !revealed ? '••••••••' : displayValue

  return (
    <Stack direction='row' spacing={1} alignItems='center'>
      <Box flex={1} minWidth={0}>
        <Typography variant='caption' color='text.secondary' display='block'>{label}</Typography>
        <Typography
          variant='body2'
          fontWeight={500}
          fontFamily='monospace'
          sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: mask ? 'pointer' : 'default' }}
          onClick={() => mask && setRevealed(r => !r)}
        >
          {masked}
        </Typography>
        {sub && <Typography variant='caption' color='text.secondary'>{sub}</Typography>}
      </Box>
      <Tooltip title={`Copy ${label.toLowerCase()}`}>
        <Button size='small' onClick={onCopy} sx={{ minWidth: 0, p: 0.5 }} disabled={!value}>
          <Copy size={14} />
        </Button>
      </Tooltip>
    </Stack>
  )
}

export default ResidentialPackageBox
