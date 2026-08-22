'use client'

import { useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { Box, Typography, MenuItem, IconButton, Tooltip, Card, Button, Chip } from '@mui/material'
import { Key, RefreshCw, Shield, Search, Copy, Check, ExternalLink, Clock, User, X, Unlock, FileText } from 'lucide-react'
import CustomTextField from '@core/components/mui/TextField'
import { useOrderItems, useUnlockRotate, type OrderItemRecord } from '@/hooks/apis/useOrderItems'
import { useOrderItemLogs, type OrderItemLog } from '@/hooks/apis/useOrderItemLogs'
import { extractProxyValue, extractProtocol } from '@/utils/protocolProxy'

const STATUS_MAP: Record<number, { label: string; color: string; bg: string }> = {
  0: { label: 'Hoạt động', color: '#16a34a', bg: '#dcfce7' },
  1: { label: 'Tắt', color: '#94a3b8', bg: '#f1f5f9' },
  2: { label: 'Hết hạn', color: '#dc2626', bg: '#fee2e2' },
}

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  rotate_success: { label: 'Xoay OK', color: '#16a34a' },
  rotate_error: { label: 'Xoay lỗi', color: '#dc2626' },
  // Khách CÓ gọi nhưng hệ thống không gọi NCC (còn khoá chờ / SP tắt xoay tay / chưa gắn NCC).
  // Màu xám vì KHÔNG phải lỗi — đừng để admin tưởng hệ thống hỏng.
  rotate_skipped: { label: 'Bỏ qua (không gọi NCC)', color: '#64748b' },
  paused: { label: 'Dừng xoay', color: '#f59e0b' },
  no_provider: { label: 'Không có NCC', color: '#94a3b8' },
}

const formatProxy = (item: OrderItemRecord) => {
  const raw = extractProxyValue(item.proxy)
  return raw.replace(/:+$/, '') || '—'
}

export default function AdminProxyKeysPage() {
  const params = useParams()
  const locale = params.lang || 'vi'
  const [type, setType] = useState('')
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const [userId, setUserId] = useState('')
  const [limit, setLimit] = useState(100)
  const [appliedFilters, setAppliedFilters] = useState<any>({ limit: 100 })
  const [copied, setCopied] = useState<string | null>(null)
  const [selectedItem, setSelectedItem] = useState<OrderItemRecord | null>(null)

  const { data, isLoading, isFetching, refetch } = useOrderItems(appliedFilters, true)
  const unlockRotate = useUnlockRotate()
  const { data: logs = [], isLoading: logsLoading } = useOrderItemLogs(selectedItem?.key ?? null)
  const items = data?.data ?? []
  const meta = data?.meta

  const handleSearch = useCallback(() => {
    setAppliedFilters({
      limit, type: type || undefined, status: status || undefined,
      search: search || undefined, user_id: userId ? Number(userId) : undefined,
    })
    setTimeout(() => refetch(), 50)
  }, [type, status, search, userId, limit, refetch])

  const copyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 1500)
  }

  const searching = isLoading || isFetching

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 1400, mx: 'auto' }}>
      <Typography variant='h5' sx={{ fontWeight: 700, mb: 2.5, color: '#1e293b' }}>
        Quản lý Proxy Keys
      </Typography>

      {/* Filter card */}
      <Card variant='outlined' sx={{ p: 2, mb: 2.5, borderColor: '#e2e8f0' }}>
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <CustomTextField select value={type} onChange={e => setType(e.target.value)} size='small' sx={{ minWidth: 110 }} label='Loại'>
            <MenuItem value=''>Tất cả</MenuItem>
            <MenuItem value='ROTATING'>Xoay</MenuItem>
            <MenuItem value='STATIC'>Tĩnh</MenuItem>
          </CustomTextField>
          <CustomTextField select value={status} onChange={e => setStatus(e.target.value)} size='small' sx={{ minWidth: 120 }} label='Trạng thái'>
            <MenuItem value=''>Tất cả</MenuItem>
            <MenuItem value='0'>Hoạt động</MenuItem>
            <MenuItem value='1'>Tắt</MenuItem>
            <MenuItem value='2'>Hết hạn</MenuItem>
          </CustomTextField>
          <CustomTextField
            size='small' placeholder='User ID' type='number' label='User'
            value={userId} onChange={e => setUserId(e.target.value)}
            sx={{ width: 90 }}
            InputProps={{ startAdornment: <User size={13} style={{ marginRight: 4, color: '#94a3b8' }} /> }}
          />
          <CustomTextField
            size='small' placeholder='Tìm theo key...'
            value={search} onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            sx={{ minWidth: 180, flex: 1 }}
          />
          <CustomTextField select value={limit} onChange={e => setLimit(Number(e.target.value))} size='small' sx={{ width: 90 }} label='Số lượng'>
            {[100, 500, 1000, 5000, 10000].map(n => <MenuItem key={n} value={n}>{n.toLocaleString()}</MenuItem>)}
          </CustomTextField>
          <Button
            variant='contained' size='small' onClick={handleSearch} disabled={searching}
            sx={{ height: 40, textTransform: 'none', fontWeight: 600, px: 3, minWidth: 110, background: 'var(--primary-gradient, var(--primary-hover))', '&:hover': { opacity: 0.9 } }}
          >
            <Search size={15} style={{ marginRight: 6, ...(searching ? { animation: 'spin 0.8s linear infinite' } : {}) }} />
            {searching ? 'Đang tìm...' : 'Tìm kiếm'}
          </Button>
        </Box>
      </Card>
      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>

      {/* Table card */}
      <Card variant='outlined' sx={{ borderColor: '#e2e8f0', overflow: 'hidden' }}>
        {meta && (
          <Box sx={{ px: 2, py: 1, borderBottom: '1px solid #f1f5f9', background: '#fafbfc' }}>
            <Typography sx={{ fontSize: 12, color: '#64748b' }}>{meta.total.toLocaleString()} proxy</Typography>
          </Box>
        )}
        <Box sx={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr>
                <th style={thStyle}>Key</th>
                <th style={thStyle}>User</th>
                <th style={thStyle}>Loại</th>
                <th style={thStyle}>Proxy</th>
                <th style={thStyle}>IP Whitelist</th>
                <th style={thStyle}>Key NCC</th>
                <th style={thStyle}>Trạng thái</th>
                <th style={thStyle}>Hết hạn</th>
                <th style={thStyle}>Xoay</th>
                <th style={thStyle}>Đơn hàng</th>
              </tr>
            </thead>
            <tbody>
              {searching ? (
                <tr><td colSpan={10} style={emptyStyle}>
                  <RefreshCw size={18} style={{ animation: 'spin 0.8s linear infinite', color: '#94a3b8' }} />
                  <div style={{ marginTop: 6 }}>Đang tải...</div>
                </td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={10} style={emptyStyle}>
                  {meta ? 'Không tìm thấy' : 'Nhấn "Tìm kiếm" để bắt đầu'}
                </td></tr>
              ) : items.map((item: OrderItemRecord) => {
                const st = STATUS_MAP[item.status] ?? STATUS_MAP[2]
                const proxyText = formatProxy(item)
                const isSelected = selectedItem?.key === item.key
                return (
                  <tr key={item._id}
                    style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer', background: isSelected ? '#eff6ff' : undefined, transition: 'background 0.1s' }}
                    onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#f8fafc' }}
                    onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = '' }}
                    onClick={() => setSelectedItem(isSelected ? null : item)}
                  >
                    <td style={tdStyle}>
                      <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                        <span style={{ fontFamily: 'monospace', fontSize: '10px', color: '#6366f1' }} title={item.key}>{item.key.slice(0, 10)}...</span>
                        <CopyBtn copied={copied === item.key} onClick={(e) => { e.stopPropagation(); copyText(item.key, item.key) }} />
                      </Box>
                    </td>
                    <td style={tdStyle}><span style={{ fontSize: '11px', color: '#475569' }}>#{item.user_id}</span></td>
                    <td style={tdStyle}><TypeBadge type={item.type} /></td>
                    <td style={tdStyle}>
                      <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                        <span style={{ fontFamily: 'monospace', fontSize: '10px' }} title={proxyText}>{proxyText.length > 25 ? proxyText.slice(0, 25) + '...' : proxyText}</span>
                        {proxyText !== '—' && <CopyBtn copied={copied === `p-${item._id}`} onClick={(e) => { e.stopPropagation(); copyText(proxyText, `p-${item._id}`) }} />}
                      </Box>
                      <div style={{ fontSize: '9px', color: '#94a3b8' }}>{extractProtocol(item.proxy) || (item.protocol || 'http').toUpperCase()}</div>
                    </td>
                    <td style={tdStyle}>
                      {item.ip_whitelist?.length ? (
                        <span style={{ fontSize: '10px', color: '#2563eb', fontFamily: 'monospace' }}>{item.ip_whitelist[0]}</span>
                      ) : <span style={{ color: '#cbd5e1', fontSize: '10px' }}>—</span>}
                    </td>
                    <td style={tdStyle}>
                      {item.provider_key ? (
                        <span style={{ fontFamily: 'monospace', fontSize: '9px', color: '#8b5cf6' }} title={item.provider_key}>{item.provider_key.slice(0, 12)}...</span>
                      ) : <span style={{ color: '#cbd5e1', fontSize: '10px' }}>—</span>}
                    </td>
                    <td style={tdStyle}>
                      <span style={{ padding: '2px 8px', borderRadius: 99, fontSize: '10px', fontWeight: 600, color: st.color, background: st.bg }}>{st.label}</span>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ fontSize: '10px', color: '#64748b' }}>
                        {item.expired_at ? new Date(item.expired_at).toLocaleDateString('vi-VN') : '—'}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      {item.type === 'ROTATING' && item.next_rotate_seconds != null ? (
                        <span style={{ fontSize: '10px', color: item.next_rotate_seconds > 0 ? '#f59e0b' : '#16a34a', display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                          <Clock size={10} />
                          {item.next_rotate_seconds > 0 ? `${item.next_rotate_seconds}s` : 'OK'}
                        </span>
                      ) : <span style={{ color: '#cbd5e1', fontSize: '10px' }}>—</span>}
                    </td>
                    <td style={tdStyle}>
                      {item.order_code ? (
                        <a href={`/${locale}/admin/orders?search=${item.order_code}`} style={{ fontSize: '10px', color: '#6366f1', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 2 }}
                          onClick={e => e.stopPropagation()}>
                          {item.order_code.slice(-8)} <ExternalLink size={9} />
                        </a>
                      ) : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </Box>
      </Card>

      {/* Log panel — hiện khi click row */}
      {selectedItem && (
        <Card variant='outlined' sx={{ mt: 2, borderColor: '#e2e8f0', overflow: 'hidden' }}>
          <Box sx={{ px: 2, py: 1.5, background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <FileText size={14} color='#6366f1' />
              <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>
                Log: <span style={{ fontFamily: 'monospace', color: '#6366f1' }}>{selectedItem.key.slice(0, 16)}...</span>
              </Typography>
              <TypeBadge type={selectedItem.type} />
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {/* Action buttons */}
              {selectedItem.type === 'ROTATING' && selectedItem.next_rotate_seconds != null && selectedItem.next_rotate_seconds >= 60 && (
                <Button
                  size='small' variant='outlined' color='warning'
                  startIcon={<Unlock size={13} />}
                  disabled={unlockRotate.isPending}
                  onClick={() => unlockRotate.mutate(selectedItem.key, {
                    onSuccess: () => { refetch() },
                  })}
                  sx={{ textTransform: 'none', fontSize: 11, fontWeight: 600, py: 0.25, px: 1.5 }}
                >
                  {unlockRotate.isPending ? 'Đang gỡ...' : `Gỡ lock (${selectedItem.next_rotate_seconds}s)`}
                </Button>
              )}
              <IconButton size='small' onClick={() => setSelectedItem(null)}>
                <X size={16} />
              </IconButton>
            </Box>
          </Box>

          {/* Log entries */}
          <Box sx={{ maxHeight: 350, overflowY: 'auto', p: 1.5 }}>
            {logsLoading ? (
              <Typography sx={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', py: 3 }}>Đang tải log...</Typography>
            ) : logs.length === 0 ? (
              <Typography sx={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', py: 3 }}>Chưa có log</Typography>
            ) : logs.map((log: OrderItemLog, i: number) => {
              const actionInfo = ACTION_LABELS[log.action] ?? { label: log.action, color: '#475569' }
              return (
                <Box key={i} sx={{ mb: 1, p: 1.5, borderRadius: 1.5, border: '1px solid #f1f5f9', background: log.action === 'rotate_error' || log.action === 'paused' ? '#fef2f2' : '#fff', '&:hover': { borderColor: '#d1d5db' } }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip label={actionInfo.label} size='small' sx={{ fontSize: 10, fontWeight: 700, height: 20, color: actionInfo.color, borderColor: actionInfo.color, bgcolor: 'transparent' }} variant='outlined' />
                      {log.duration_ms != null && (
                        <span style={{ fontSize: 10, color: '#94a3b8' }}>{log.duration_ms}ms</span>
                      )}
                      {log.status_code != null && (
                        <span style={{ fontSize: 10, color: log.status_code >= 400 ? '#dc2626' : '#16a34a' }}>HTTP {log.status_code}</span>
                      )}
                    </Box>
                    <span style={{ fontSize: 10, color: '#94a3b8' }}>
                      {new Date(log.created_at).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit', day: '2-digit', month: '2-digit' })}
                    </span>
                  </Box>
                  {log.message && (
                    <div style={{ fontSize: 11, color: '#475569', lineHeight: 1.5 }}>{log.message}</div>
                  )}
                  {log.request && (
                    <div style={{ fontSize: 10, color: '#6366f1', fontFamily: 'monospace', marginTop: 4, padding: '4px 8px', background: '#f8fafc', borderRadius: 4 }}>
                      {log.request.method} {log.request.url}
                    </div>
                  )}
                  {/* Payload + response THÔ của nhà cung cấp — thứ duy nhất phân định được
                      "lỗi do mình hay do đối tác". Mặc định thu gọn cho đỡ rối, lỗi thì tự bung. */}
                  {log.request?.params && (
                    <details style={{ marginTop: 3 }}>
                      <summary style={{ fontSize: 10, color: '#6366f1', cursor: 'pointer' }}>Đã gửi (payload)</summary>
                      <pre style={{ fontSize: 10, margin: '3px 0 0', padding: '6px 8px', background: '#0f172a', color: '#93c5fd', borderRadius: 4, overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                        {typeof log.request.params === 'string' ? log.request.params : JSON.stringify(log.request.params, null, 2)}
                      </pre>
                    </details>
                  )}
                  {log.response && (
                    <details style={{ marginTop: 3 }} open={log.action === 'rotate_error'}>
                      <summary style={{ fontSize: 10, color: log.action === 'rotate_error' ? '#dc2626' : '#16a34a', cursor: 'pointer' }}>
                        Đối tác trả về{log.status_code ? ` (HTTP ${log.status_code})` : ''}
                      </summary>
                      <pre style={{ fontSize: 10, margin: '3px 0 0', padding: '6px 8px', background: '#0f172a', color: log.action === 'rotate_error' ? '#fca5a5' : '#86efac', borderRadius: 4, overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                        {log.response}
                      </pre>
                    </details>
                  )}
                  {log.context?.called_by != null && (
                    <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 3 }}>
                      Người gọi: user #{log.context.called_by}
                      {log.context.is_owner === false && ' (KHÔNG phải chủ đơn)'}
                      {log.context.source ? ` · ${log.context.source === 'manual' ? 'khách/API gọi' : log.context.source}` : ''}
                    </div>
                  )}
                </Box>
              )
            })}
          </Box>
        </Card>
      )}
    </Box>
  )
}

function CopyBtn({ copied, onClick }: { copied: boolean; onClick: (e: React.MouseEvent) => void }) {
  return (
    <Tooltip title={copied ? 'Đã copy!' : 'Copy'}>
      <IconButton size='small' onClick={onClick} sx={{ p: 0.25, opacity: 0.4, '&:hover': { opacity: 1 } }}>
        {copied ? <Check size={10} color='#16a34a' /> : <Copy size={10} color='#94a3b8' />}
      </IconButton>
    </Tooltip>
  )
}

function TypeBadge({ type }: { type: string }) {
  const r = type === 'ROTATING'
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: '10px', padding: '2px 7px', borderRadius: 99, fontWeight: 600, background: r ? '#fef3c7' : '#dbeafe', color: r ? '#b45309' : '#1d4ed8' }}>
      {r ? <RefreshCw size={9} /> : <Shield size={9} />}
      {r ? 'Xoay' : 'Tĩnh'}
    </span>
  )
}

const thStyle: React.CSSProperties = { padding: '8px 10px', textAlign: 'left', fontSize: '11px', fontWeight: 600, color: '#475569', borderBottom: '2px solid #e2e8f0', background: '#f8fafc', whiteSpace: 'nowrap' }
const tdStyle: React.CSSProperties = { padding: '7px 10px', verticalAlign: 'middle' }
const emptyStyle: React.CSSProperties = { textAlign: 'center', padding: 50, color: '#94a3b8', fontSize: '13px' }
