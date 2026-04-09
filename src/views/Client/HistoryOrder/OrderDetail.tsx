'use client'

import React, { useMemo, useState, useCallback } from 'react'

import {
  Dialog,
  DialogContent,
  Typography,
  Box,
  Chip,
  Pagination,
  CircularProgress,
  Tabs,
  Tab
} from '@mui/material'

import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  getPaginationRowModel
} from '@tanstack/react-table'

import Checkbox from '@mui/material/Checkbox'

import {
  Copy,
  Clock,
  FileDown,
  X,
  ShoppingCart,
  Package,
  DollarSign,
  Clock3,
  Loader2,
  CheckCircle
} from 'lucide-react'

import { RefreshCw, Loader, AlertTriangle, ChevronDown, ChevronRight, Undo2 } from 'lucide-react'

import { extractProxyValue, getProxyString as getProxyStringUtil } from '@/utils/protocolProxy'
import { toast } from 'react-toastify'
import { useDispatch, useSelector } from 'react-redux'

import { setBalance } from '@/store/userSlice'
import type { AppDispatch, RootState } from '@/store'
import { formatDateTimeLocal } from '@/utils/formatDate'
import { useCopy } from '@/app/hooks/useCopy'
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from '@/constants/orderStatus'
import { useApiKeys } from '@/hooks/apis/useOrders'
import { useRenewOrder, useRenewInfo, useRenewalRefund, useRenewalConfirm, useOrderHistoryLogs } from '@/hooks/apis/useRenewal'
import { useRole } from '@/hooks/useRole'
import { useBranding } from '@/app/contexts/BrandingContext'
import { useOrderHistories, type OrderHistoryItem } from '@/hooks/apis/useOrderHistories'
import { useOrderItemLogs, type OrderItemLog } from '@/hooks/apis/useOrderItemLogs'
import { useUnlockRotate } from '@/hooks/apis/useOrderItems'

const formatVND = (v: number) => new Intl.NumberFormat('vi-VN').format(v) + 'đ'

interface OrderDetailProps {
  open: boolean
  onClose: () => void
  order: {
    id: number
    order_code: string
    total_amount: number
    price_per_unit: number
    quantity: number
    delivered_quantity?: number
    status: string
    order_type?: number
    buy_at: string
    expired_at: string
    proxy_type?: string
    service_name?: string
    service_type?: string
    ip_version?: string
    proxies?: any[]
  } | null
}

const OrderDetail: React.FC<OrderDetailProps> = ({ open, onClose, order }) => {
  const [rowSelection, setRowSelection] = useState({})
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 })
  const [, copy] = useCopy()
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [renewOpen, setRenewOpen] = useState(false)
  const [detailTab, setDetailTab] = useState(0)
  const [viewLogId, setViewLogId] = useState<number | null>(null)
  const [viewItemKey, setViewItemKey] = useState<string | null>(null)
  const { isAdmin } = useRole()
  const { isChild } = useBranding()
  const canViewRotateLog = isAdmin && !isChild // Chỉ admin site mẹ thấy log xoay

  const { data: apiKeysData = [], isLoading: isLoadingKeys } = useApiKeys(order?.id, open)
  const { data: histories = [] } = useOrderHistories(order?.id ?? null, open)
  const renewals = useMemo(() => histories.filter(h => h.type === 'renewal'), [histories])

  const copyWithFeedback = (text: string, field: string, msg?: string) => {
    copy(text, msg)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  // Tính thời gian còn lại
  const getTimeRemaining = () => {
    if (!order?.expired_at) return null
    const s = String(order.status)

    if (s !== '2' && s !== '3') return null

    const diff = new Date(order.expired_at).getTime() - Date.now()

    if (diff <= 0) return null

    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

    
return days > 0 ? `${days}d ${hours}h` : `${hours}h`
  }

  const columns = useMemo(
    () => [
      {
        id: 'select',
        header: ({ table }: { table: any }) => (
          <Checkbox
            checked={table.getIsAllRowsSelected()}
            indeterminate={table.getIsSomeRowsSelected()}
            onChange={table.getToggleAllRowsSelectedHandler()}
            size='small'
          />
        ),
        cell: ({ row }: { row: any }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onChange={row.getToggleSelectedHandler()}
            size='small'
          />
        ),
        size: 40
      },
      {
        header: order?.service_type === '0' ? 'Proxy' : 'API Key',
        cell: ({ row }: { row: any }) => {
          if (order?.service_type === '0') {
            const proxys = row.original.proxy || row.original.proxys || {}
            const firstProxy = extractProxyValue(proxys) || '-'

            return (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'monospace', fontSize: '12px' }}>
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{firstProxy}</span>
                {firstProxy !== '-' && (
                  <button
                    onClick={() => copyWithFeedback(firstProxy, `proxy-${row.id}`, 'Đã copy proxy!')}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: copiedField === `proxy-${row.id}` ? '#16a34a' : '#94a3b8' }}
                  >
                    {copiedField === `proxy-${row.id}` ? <CheckCircle size={14} /> : <Copy size={14} />}
                  </button>
                )}
              </div>
            )
          }

          const apiKey = row.original?.key || row.original?.api_key || '-'

          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'monospace', fontSize: '12px', color: '#dc2626' }}>
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{apiKey}</span>
              {apiKey !== '-' && (
                <button
                  onClick={() => copyWithFeedback(apiKey, `key-${row.id}`, 'Đã copy API key!')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: copiedField === `key-${row.id}` ? '#16a34a' : '#94a3b8' }}
                >
                  {copiedField === `key-${row.id}` ? <CheckCircle size={14} /> : <Copy size={14} />}
                </button>
              )}
            </div>
          )
        },
        size: 280
      },
      {
        header: 'Protocol',
        cell: ({ row }: { row: any }) => (
          <span style={{ fontSize: '12px', textTransform: 'uppercase' as const, fontWeight: 500 }}>
            {row.original.protocol || '-'}
          </span>
        ),
        size: 80
      },
      {
        header: 'Hết hạn',
        cell: ({ row }: { row: any }) => (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#64748b', fontSize: '12px' }}>
            <Clock size={12} />
            {formatDateTimeLocal(row.original.expired_at)}
          </div>
        ),
        size: 160
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [order, copiedField, copy]
  )

  const table = useReactTable({
    data: apiKeysData,
    columns,
    state: { rowSelection, pagination },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel()
  })

  const selectedCount = table.getFilteredSelectedRowModel().rows.length
  const totalRows = apiKeysData.length

  const handleCopySelected = () => {
    const selectedRows = table.getFilteredSelectedRowModel().rows

    if (selectedRows.length === 0) return

    const texts = selectedRows.map((row: any) => {
      if (order?.service_type === '0') {
        const proxys = row.original.proxy || row.original.proxys || {}

return extractProxyValue(proxys)
      }


return row.original?.key || row.original?.api_key || ''
    }).filter(Boolean)

    copy(texts.join('\n'), `Đã copy ${texts.length} ${order?.service_type === '0' ? 'proxy' : 'API key'}!`)
  }

  const [exportFormat, setExportFormat] = useState<'txt' | 'csv' | 'json'>('txt')
  const [exportProtocol, setExportProtocol] = useState<'http' | 'socks5'>('http')

  const getExportRows = () => {
    const selectedRows = table.getFilteredSelectedRowModel().rows
    return selectedRows.length > 0 ? selectedRows.map((r: any) => r.original) : apiKeysData
  }

  const getProxyString = (item: any, protocol: 'http' | 'socks5') => {
    return getProxyStringUtil(item, protocol)
  }

  const handleExport = () => {
    const rows = getExportRows()
    if (!rows.length) return

    const isProxy = order?.service_type === '0'
    let content: string
    let ext = exportFormat
    let mime: string

    if (exportFormat === 'json') {
      const data = rows.map((item: any) => {
        if (isProxy) {
          return { proxy: getProxyString(item, exportProtocol), expired_at: item.expired_at || null }
        }
        return { key: item.key || item.api_key || '', expired_at: item.expired_at || null }
      })
      content = JSON.stringify(data, null, 2)
      mime = 'application/json'
    } else if (exportFormat === 'csv') {
      const header = isProxy ? 'proxy,expired_at' : 'key,expired_at'
      const lines = rows.map((item: any) => {
        const val = isProxy ? getProxyString(item, exportProtocol) : (item.key || item.api_key || '')
        return `${val},${item.expired_at || ''}`
      })
      content = header + '\n' + lines.join('\n')
      mime = 'text/csv'
    } else {
      content = rows.map((item: any) => {
        if (isProxy) return getProxyString(item, exportProtocol)
        return item.key || item.api_key || ''
      }).filter(Boolean).join('\n')
      mime = 'text/plain'
    }

    const blob = new Blob([content], { type: `${mime};charset=utf-8` })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${order?.order_code || 'order'}_${isProxy ? exportProtocol : 'keys'}.${ext}`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  }

  const timeRemaining = getTimeRemaining()
  const statusLabel = ORDER_STATUS_LABELS[String(order?.status)] || 'Không xác định'
  const statusColor = (ORDER_STATUS_COLORS[String(order?.status)] || 'default') as any

  if (!open) return null

  return (
    <>
      <Dialog
        open={open}
        onClose={() => { setDetailTab(0); onClose() }}
        fullWidth
        maxWidth={(renewOpen || viewItemKey) ? 'lg' : 'md'}
        PaperProps={{
          sx: {
            borderRadius: '12px',
            maxHeight: '85vh',
            mt: '5vh',
            mb: 'auto',
          }
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '16px 20px', borderBottom: '1px solid #f1f5f9'
        }}>
          <div>
            <Typography sx={{ fontSize: '16px', fontWeight: 700, color: '#1e293b' }}>
              Chi tiết đơn hàng
            </Typography>
            <Typography sx={{ fontSize: '13px', color: '#64748b', mt: 0.3 }}>
              #{order?.order_code}
            </Typography>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, color: '#94a3b8', borderRadius: 8 }}
          >
            <X size={20} />
          </button>
        </div>

        <DialogContent sx={{ p: 0 }}>
          {order ? (
            <div style={{ display: 'flex' }}>
            {/* Left: Order detail */}
            <div style={{ flex: 1, minWidth: 0 }}>
              {/* Order info cards */}
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', p: '16px 20px' }}>
                <InfoCard icon={<ShoppingCart size={16} />} label='Dịch vụ' value={order.service_name || '-'} />
                <InfoCard icon={<Package size={16} />} label='Số lượng' value={
                  order.delivered_quantity != null && order.delivered_quantity !== order.quantity
                    ? `${order.delivered_quantity}/${order.quantity}`
                    : String(order.quantity)
                } />
                <InfoCard icon={<DollarSign size={16} />} label='Tổng tiền' value={formatVND(order.total_amount)} highlight />
                <InfoCard icon={<Clock3 size={16} />} label='Ngày mua' value={formatDateTimeLocal(order.buy_at)} />
                <Box sx={{
                  p: '10px 12px', borderRadius: '10px',
                  background: '#f8fafc', border: '1px solid #f1f5f9'
                }}>
                  <Typography sx={{ fontSize: '11px', color: '#94a3b8', mb: 0.5 }}>Trạng thái</Typography>
                  <Chip label={statusLabel} size='small' color={statusColor} />
                  {timeRemaining && (
                    <Typography sx={{ fontSize: '11px', color: '#16a34a', fontWeight: 500, mt: 0.5 }}>
                      Còn {timeRemaining}
                    </Typography>
                  )}
                </Box>
                <InfoCard icon={<Clock size={16} />} label='Loại' value={order.order_type === 1 ? 'Gia hạn' : 'Mua mới'} />

                {/* Nút gia hạn — trong grid, cùng hàng với info cards */}
                {order.order_type !== 1 && ['2', '3'].includes(String(order.status)) && !renewOpen && (
                  <Box sx={{
                    p: '10px 12px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: '#eff6ff', border: '1px solid #bfdbfe', cursor: 'pointer',
                    '&:hover': { background: '#dbeafe' }, transition: 'background 0.15s',
                  }}
                    onClick={() => setRenewOpen(true)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <RefreshCw size={15} style={{ color: '#3b82f6' }} />
                      <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#2563eb' }}>
                        {selectedCount > 0 ? `Gia hạn ${selectedCount}` : 'Gia hạn'}
                      </Typography>
                    </div>
                  </Box>
                )}
              </Box>

              {/* Tabs */}
              <Tabs
                value={detailTab}
                onChange={(_, v) => setDetailTab(v)}
                sx={{
                  borderBottom: '1px solid #f1f5f9', px: '20px',
                  '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, fontSize: '13px', minHeight: 42 }
                }}
              >
                <Tab label={`Proxy (${totalRows})`} />
                {renewals.length > 0 && <Tab label={`Lịch sử gia hạn (${renewals.length})`} />}
              </Tabs>

              {/* Tab: Proxy */}
              {detailTab === 0 && <Box sx={{ display: 'flex', gap: 0 }}>
              <Box sx={{ flex: 1, minWidth: 0, p: '16px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <Typography sx={{ fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>
                    Danh sách proxy ({totalRows})
                  </Typography>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                    {selectedCount > 0 && (
                      <>
                        <span style={{ fontSize: '12px', color: '#64748b' }}>Đã chọn: {selectedCount}</span>
                        <button
                          onClick={handleCopySelected}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 4,
                            padding: '5px 10px', fontSize: '12px', fontWeight: 500,
                            background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0',
                            borderRadius: 6, cursor: 'pointer'
                          }}
                        >
                          <Copy size={13} /> Copy
                        </button>
                      </>
                    )}
                    {order?.service_type === '0' && (
                      <select
                        value={exportProtocol}
                        onChange={e => setExportProtocol(e.target.value as 'http' | 'socks5')}
                        style={{
                          padding: '4px 8px', fontSize: '12px', borderRadius: 6,
                          border: '1px solid #e2e8f0', background: '#fff', color: '#374151', cursor: 'pointer'
                        }}
                      >
                        <option value='http'>HTTP</option>
                        <option value='socks5'>SOCKS5</option>
                      </select>
                    )}
                    <select
                      value={exportFormat}
                      onChange={e => setExportFormat(e.target.value as 'txt' | 'csv' | 'json')}
                      style={{
                        padding: '4px 8px', fontSize: '12px', borderRadius: 6,
                        border: '1px solid #e2e8f0', background: '#fff', color: '#374151', cursor: 'pointer'
                      }}
                    >
                      <option value='txt'>TXT</option>
                      <option value='csv'>CSV</option>
                      <option value='json'>JSON</option>
                    </select>
                    <button
                      onClick={handleExport}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 4,
                        padding: '5px 10px', fontSize: '12px', fontWeight: 500,
                        background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe',
                        borderRadius: 6, cursor: 'pointer'
                      }}
                    >
                      <FileDown size={13} /> Xuất {selectedCount > 0 ? `(${selectedCount})` : `(${totalRows})`}
                    </button>
                  </div>
                </div>

                {isLoadingKeys ? (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <CircularProgress size={28} />
                    <Typography sx={{ fontSize: '13px', color: '#64748b', mt: 1 }}>Đang tải proxy...</Typography>
                  </Box>
                ) : totalRows > 0 ? (
                  <>
                    <div style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                        <thead>
                          {table.getHeaderGroups().map(hg => (
                            <tr key={hg.id}>
                              {hg.headers.map(h => (
                                <th key={h.id} style={{
                                  width: h.getSize(), padding: '8px 10px', textAlign: 'left',
                                  background: '#f8fafc', borderBottom: '1px solid #e2e8f0',
                                  fontSize: '12px', fontWeight: 600, color: '#64748b'
                                }}>
                                  {flexRender(h.column.columnDef.header, h.getContext())}
                                </th>
                              ))}
                            </tr>
                          ))}
                        </thead>
                        <tbody>
                          {table.getRowModel().rows.map(row => {
                            const item = row.original as any
                            const itemKey = item.key || item.api_key
                            const isRotating = item.type === 'ROTATING'
                            const isViewing = viewItemKey === itemKey

                            return (
                            <tr key={row.id}
                              style={{
                                borderBottom: '1px solid #f1f5f9', cursor: isRotating && canViewRotateLog ? 'pointer' : undefined,
                                background: isViewing ? '#eff6ff' : undefined, transition: 'background 0.15s',
                              }}
                              onClick={() => { if (isRotating && canViewRotateLog && itemKey) setViewItemKey(viewItemKey === itemKey ? null : itemKey) }}
                              onMouseEnter={(e) => { if (isRotating && !isViewing) e.currentTarget.style.background = '#f8fafc' }}
                              onMouseLeave={(e) => { if (isRotating && !isViewing) e.currentTarget.style.background = '' }}
                            >
                              {row.getVisibleCells().map(cell => (
                                <td key={cell.id} style={{ padding: '8px 10px' }}>
                                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                </td>
                              ))}
                            </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                    {table.getPageCount() > 1 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                        <Typography sx={{ fontSize: '12px', color: '#94a3b8' }}>
                          Trang {table.getState().pagination.pageIndex + 1} / {table.getPageCount()} ({totalRows} proxy)
                        </Typography>
                        <Pagination
                          count={table.getPageCount()}
                          page={table.getState().pagination.pageIndex + 1}
                          onChange={(_, p) => table.setPageIndex(p - 1)}
                          size='small'
                          shape='rounded'
                          variant='outlined'
                          color='primary'
                        />
                      </div>
                    )}
                  </>
                ) : (
                  <Box sx={{
                    textAlign: 'center', py: 4, background: '#f8fafc',
                    borderRadius: '8px', border: '1px solid #f1f5f9'
                  }}>
                    <Loader2 size={20} color='#94a3b8' />
                    <Typography sx={{ fontSize: '13px', color: '#94a3b8', mt: 1 }}>
                      Chưa có proxy — đang chờ xử lý
                    </Typography>
                  </Box>
                )}
              </Box>

              {/* Panel phải: log xoay proxy — chỉ admin site mẹ */}
              {canViewRotateLog && viewItemKey && (
                <Box sx={{
                  flex: '0 0 38%', borderLeft: '1px solid #e2e8f0',
                  overflowY: 'auto', maxHeight: '60vh', p: '12px 16px',
                  animation: 'slideInRight 0.2s ease-out',
                  '@keyframes slideInRight': { from: { opacity: 0, transform: 'translateX(20px)' }, to: { opacity: 1, transform: 'translateX(0)' } },
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#374151' }}>Log xoay proxy</div>
                    <button onClick={() => setViewItemKey(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 2 }}>
                      <X size={14} />
                    </button>
                  </div>
                  <div style={{ fontSize: '11px', color: '#6366f1', fontFamily: 'monospace', marginBottom: 8, wordBreak: 'break-all' }}>
                    {viewItemKey}
                  </div>
                  {canViewRotateLog && <UnlockRotateButton itemKey={viewItemKey} />}
                  <ClientItemLogPanel itemKey={viewItemKey} />
                </Box>
              )}
              </Box>}

              {/* Tab: Lịch sử gia hạn */}
              {detailTab === 1 && renewals.length > 0 && (
                <Box sx={{ display: 'flex', gap: 0 }}>
                  <Box sx={{ flex: viewLogId ? '0 0 55%' : '1 1 100%', p: '16px 20px', transition: 'flex 0.2s', minWidth: 0 }}>
                    <RenewalHistory renewals={renewals} viewLogId={viewLogId} onViewLog={id => setViewLogId(viewLogId === id ? null : id)} />
                  </Box>
                  {isAdmin && viewLogId && (
                    <Box sx={{ flex: '0 0 45%', borderLeft: '1px solid #e2e8f0', maxHeight: 400, overflowY: 'auto', p: '12px 16px' }}>
                      <HistoryLogPanel historyId={viewLogId} />
                    </Box>
                  )}
                </Box>
              )}
            </div>

            {/* Right: Renewal panel */}
            {renewOpen && (
              <RenewalInlinePanel
                order={order}
                quantity={selectedCount > 0 ? selectedCount : order.quantity}
                selectedItemKeys={selectedCount > 0 ? table.getSelectedRowModel().rows.map((r: any) => r.original.key) : undefined}
                onClose={() => setRenewOpen(false)}
              />
            )}
            </div>
          ) : (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography sx={{ color: '#94a3b8' }}>Không có dữ liệu đơn hàng</Typography>
            </Box>
          )}
        </DialogContent>
      </Dialog>

      {/* Inline renewal panel — no separate modal */}
    </>
  )
}

const RENEWAL_STATUS: Record<number, { label: string; color: string; bg: string; border: string }> = {
  0: { label: 'Đang chờ', color: '#f59e0b', bg: '#fffbeb', border: '#fde68a' },
  1: { label: 'Đang xử lý', color: '#3b82f6', bg: '#eff6ff', border: '#bfdbfe' },
  2: { label: 'Thành công', color: '#22c55e', bg: '#f0fdf4', border: '#bbf7d0' },
  3: { label: 'Thất bại', color: '#ef4444', bg: '#fef2f2', border: '#fecaca' },
  4: { label: 'Đang sử dụng', color: '#22c55e', bg: '#f0fdf4', border: '#bbf7d0' },
  5: { label: 'Hết hạn', color: '#94a3b8', bg: '#f8fafc', border: '#e2e8f0' },
  6: { label: 'Hoàn thành 1 phần', color: '#f97316', bg: '#fff7ed', border: '#fed7aa' },
  7: { label: 'Đã hoàn tiền', color: '#8b5cf6', bg: '#f5f3ff', border: '#ddd6fe' },
}

function RenewalHistory({ renewals, viewLogId, onViewLog }: {
  renewals: OrderHistoryItem[]
  viewLogId?: number | null
  onViewLog?: (id: number) => void
}) {
  const { isAdmin } = useRole()
  const refundMutation = useRenewalRefund()
  const confirmMutation = useRenewalConfirm()

  if (!renewals.length) return null

  const fmtVND = (v: number) => new Intl.NumberFormat('vi-VN').format(v) + 'đ'

  const canRefund = (status: number) => [3, 6].includes(status) // FAILED, PARTIAL
  const canConfirm = (status: number) => [3, 6].includes(status) // FAILED, PARTIAL — NCC đã xử lý OK

  const handleConfirmRenewal = async (h: OrderHistoryItem) => {
    if (!confirm(`Xác nhận gia hạn lần #${h.id} thành công?\n(NCC đã xử lý OK — sẽ KHÔNG hoàn tiền)`)) return

    try {
      const res = await confirmMutation.mutateAsync({ historyId: h.id })
      toast.info(res?.message || 'Đã xác nhận')
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Lỗi xác nhận')
    }
  }

  const handleRefund = async (h: OrderHistoryItem) => {
    if (!confirm(`Hoàn ${fmtVND(h.amount)} cho lần gia hạn #${h.id}?`)) return

    try {
      const res = await refundMutation.mutateAsync({ historyId: h.id })
      toast.info(res?.message || 'Đã hoàn tiền')
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Lỗi hoàn tiền')
    }
  }

  return (
    <div>

      {/* Table header */}
      <div style={{ display: 'grid', gridTemplateColumns: isAdmin ? '30px 50px 1fr 80px 90px 1fr 100px 70px' : '50px 1fr 100px 100px 1fr 90px', gap: 0, fontSize: '11px', fontWeight: 600, color: '#94a3b8', padding: '0 12px 6px', borderBottom: '1px solid #e2e8f0' }}>
        {isAdmin && <span></span>}
        <span>Lần</span>
        <span>Ngày</span>
        <span>Thời hạn</span>
        <span>Số tiền</span>
        <span>Hết hạn</span>
        <span>Trạng thái</span>
        {isAdmin && <span></span>}
      </div>

      {/* Rows */}
      {renewals.map((h, i) => {
        const st = RENEWAL_STATUS[h.status] ?? { label: '?', color: '#94a3b8', bg: '#f8fafc', border: '#e2e8f0' }
        const isPending = h.status === 0 || h.status === 1
        const isFailed = h.status === 3
        const isRefunded = h.status === 7
        const isSuccess = h.status === 4 || h.status === 5
        const isViewingLog = viewLogId === h.id

        return (
          <div key={h.id}>
            <div style={{
              display: 'grid', gridTemplateColumns: isAdmin ? '30px 50px 1fr 80px 90px 1fr 100px 70px' : '50px 1fr 100px 100px 1fr 90px',
              gap: 0, padding: '10px 12px', alignItems: 'center',
              borderBottom: '1px solid #f1f5f9', fontSize: '12px',
              background: isViewingLog ? '#f0f9ff' : isFailed ? '#fef2f2' : isPending ? '#eff6ff' : isRefunded ? '#f5f3ff' : 'transparent',
            }}
            >
              {/* Log icon (admin) */}
              {isAdmin && (
                <span
                  style={{ color: isViewingLog ? '#2563eb' : '#94a3b8', cursor: 'pointer' }}
                  onClick={() => onViewLog?.(h.id)}
                  title='Xem log chi tiết'
                >
                  {isViewingLog ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </span>
              )}

              {/* Lần */}
              <span style={{ fontWeight: 600, color: '#374151' }}>#{renewals.length - i}</span>

              {/* Ngày */}
              <span style={{ color: '#64748b' }}>
                {h.created_at ? formatDateTimeLocal(h.created_at) : '—'}
              </span>

              {/* Thời hạn */}
              <span style={{ color: '#374151' }}>{h.duration} ngày</span>

              {/* Số tiền */}
              <span style={{ fontWeight: 600, color: isRefunded ? '#8b5cf6' : '#374151', textDecoration: isRefunded ? 'line-through' : 'none' }}>
                {fmtVND(h.amount)}
              </span>

              {/* Hết hạn */}
              <div style={{ color: '#64748b', fontSize: '11px' }}>
                {h.old_expired_at && <div>{formatDateTimeLocal(h.old_expired_at)}</div>}
                {isSuccess && h.new_expired_at && (
                  <div style={{ color: '#16a34a', fontWeight: 500 }}>→ {formatDateTimeLocal(h.new_expired_at)}</div>
                )}
                {!h.old_expired_at && !h.new_expired_at && '—'}
              </div>

              {/* Trạng thái */}
              <span style={{
                fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: 10,
                background: st.color + '18', color: st.color,
                display: 'inline-flex', alignItems: 'center', gap: 4, width: 'fit-content',
              }}>
                {isPending && <Loader size={11} style={{ animation: 'spin 1s linear infinite' }} />}
                {st.label}
              </span>

              {/* Nút admin: xác nhận thành công / hoàn tiền */}
              {isAdmin && (
                <div onClick={e => e.stopPropagation()} style={{ display: 'flex', gap: 4 }}>
                  {canConfirm(h.status) && (
                    <button
                      disabled={confirmMutation.isPending}
                      onClick={() => handleConfirmRenewal(h)}
                      style={{
                        fontSize: '10px', padding: '2px 8px', borderRadius: 6,
                        border: '1px solid #bbf7d0', background: '#f0fdf4', color: '#16a34a',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3,
                      }}
                    >
                      <CheckCircle size={10} /> OK
                    </button>
                  )}
                  {canRefund(h.status) && (
                    <button
                      disabled={refundMutation.isPending}
                      onClick={() => handleRefund(h)}
                      style={{
                        fontSize: '10px', padding: '2px 8px', borderRadius: 6,
                        border: '1px solid #ddd6fe', background: '#f5f3ff', color: '#7c3aed',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3,
                      }}
                    >
                      <Undo2 size={10} /> Hoàn
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Ghi chú dưới row — chỉ khi pending hoặc failed */}
            {isPending && (
              <div style={{ padding: '4px 12px 8px', fontSize: '11px', color: '#1d4ed8' }}>
                Proxy vẫn hoạt động bình thường. Đang chờ xử lý...
              </div>
            )}
            {isFailed && !isAdmin && (
              <div style={{ padding: '4px 12px 8px', fontSize: '11px', color: '#dc2626' }}>
                Gia hạn không thành công. Vui lòng liên hệ admin để được hỗ trợ.
              </div>
            )}

            {/* Log panel giờ hiển thị bên phải — không expand dưới row nữa */}
          </div>
        )
      })}
    </div>
  )
}

/** Admin: log chi tiết per item per history — expandable row */
function HistoryLogPanel({ historyId }: { historyId: number }) {
  const { data: logs, isLoading } = useOrderHistoryLogs(historyId)

  if (isLoading) return <div style={{ padding: '8px 12px', fontSize: '11px', color: '#94a3b8' }}>Loading logs...</div>
  if (!logs?.length) return <div style={{ padding: '8px 12px', fontSize: '11px', color: '#cbd5e1' }}>Chưa có log</div>

  const ACTION_COLORS: Record<string, string> = {
    api_call_success: '#16a34a',
    api_call_error: '#dc2626',
    api_call_timeout: '#f59e0b',
    circuit_break: '#ea580c',
    summary: '#2563eb',
  }

  return (
    <div style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', padding: '6px 12px 8px', maxHeight: 280, overflowY: 'auto' }}>
      <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ color: '#94a3b8', fontWeight: 600, fontSize: '10px', textTransform: 'uppercase' as const }}>
            <th style={{ textAlign: 'left', padding: '3px 6px', width: 70 }}>Time</th>
            <th style={{ textAlign: 'left', padding: '3px 6px', width: 90 }}>Action</th>
            <th style={{ textAlign: 'left', padding: '3px 6px' }}>Message</th>
            <th style={{ textAlign: 'left', padding: '3px 6px', width: 50 }}>HTTP</th>
            <th style={{ textAlign: 'left', padding: '3px 6px', width: 50 }}>ms</th>
            <th style={{ textAlign: 'left', padding: '3px 6px', width: 100 }}>Item</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log, i) => (
            <tr key={i} style={{ borderTop: '1px solid #f1f5f9' }}>
              <td style={{ padding: '3px 6px', color: '#94a3b8', fontFamily: 'monospace' }}>
                {log.created_at ? new Date(log.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : ''}
              </td>
              <td style={{ padding: '3px 6px' }}>
                <span style={{
                  color: ACTION_COLORS[log.action] || '#64748b',
                  fontWeight: 500,
                }}>
                  {log.action === 'api_call_success' ? 'OK' : log.action === 'api_call_error' ? 'ERROR' : log.action === 'circuit_break' ? 'CB STOP' : log.action}
                </span>
              </td>
              <td style={{ padding: '3px 6px', color: log.action.includes('error') ? '#dc2626' : '#475569', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                {log.message}
              </td>
              <td style={{ padding: '3px 6px', color: '#94a3b8' }}>{log.status_code ?? ''}</td>
              <td style={{ padding: '3px 6px', color: '#94a3b8' }}>{log.duration_ms ?? ''}</td>
              <td style={{ padding: '3px 6px', color: '#94a3b8', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {log.item_key ?? ''}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function RenewalInlinePanel({ order, quantity, selectedItemKeys, onClose }: {
  order: any
  quantity: number
  selectedItemKeys?: string[]
  onClose: () => void
}) {
  const { data: renewInfo, isLoading: infoLoading } = useRenewInfo(order.id)
  const dispatch = useDispatch<AppDispatch>()
  const { sodu } = useSelector((state: RootState) => state.user)
  const { mutate, isPending, isSuccess } = useRenewOrder()

  const isOriginal = renewInfo?.renewal_duration_mode === 'original'
  const isPerUnit = renewInfo?.pricing_mode === 'per_unit'
  const originalDays = renewInfo?.original_duration || (order.time ?? 30)
  const prices = renewInfo?.prices ?? {}
  const perUnit = renewInfo?.per_unit

  // Mốc giá từ API (sorted)
  const availableDurations = useMemo(() => {
    const keys = Object.keys(prices).map(Number).filter(n => n > 0).sort((a, b) => a - b)
    return keys.length > 0 ? keys.map(String) : [String(originalDays)]
  }, [prices, originalDays])

  const [duration, setDuration] = useState(() => {
    // Mặc định chọn mốc gần nhất với originalDays
    if (availableDurations.includes(String(originalDays))) return String(originalDays)
    return availableDurations[0] || String(originalDays)
  })
  const [customDuration, setCustomDuration] = useState(originalDays)

  const days = isOriginal ? originalDays : isPerUnit ? customDuration : (parseInt(duration) || 30)

  // Tính giá
  const unitPrice = useMemo(() => {
    if (isPerUnit && perUnit) {
      // Tìm discount tier
      const tier = perUnit.discount_tiers?.find(t => {
        const min = parseInt(t.min) || 0
        const max = parseInt(t.max) || Infinity
        return days >= min && days <= max
      })
      const discPct = parseInt(tier?.discount || '0') || 0
      const effective = discPct > 0
        ? Math.round(perUnit.price_per_unit * (1 - discPct / 100))
        : perUnit.price_per_unit
      return effective * days
    }
    return prices[String(days)] ?? (order.price_per_unit || 0)
  }, [isPerUnit, perUnit, prices, days, order.price_per_unit])

  const total = unitPrice * quantity

  const handleRenew = () => {
    if (isPending || isSuccess) return
    if (sodu < total) { toast.error('Số dư không đủ.'); return }

    mutate(
      { order_id: order.id, duration: days, item_keys: selectedItemKeys },
      {
        onSuccess: (data) => {
          if (data?.success === false) toast.error(data?.message || 'Lỗi gia hạn.')
          else { if (data?.new_balance != null) dispatch(setBalance(data.new_balance)); toast.success(data?.message || 'Đã tạo lệnh gia hạn!') }
        },
        onError: (err: any) => toast.error(err.response?.data?.message || 'Lỗi không xác định.'),
      }
    )
  }

  // Loading renew info
  if (infoLoading) {
    return (
      <div style={{ width: 280, borderLeft: '1px solid #e2e8f0', background: '#f8fafc', padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Loader size={20} className='animate-pulse' style={{ color: '#94a3b8' }} />
      </div>
    )
  }

  // Can't renew
  if (renewInfo && !renewInfo.can_renew) {
    return (
      <div style={{ width: 280, borderLeft: '1px solid #e2e8f0', background: '#f8fafc', padding: 16, flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>Gia hạn</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 18 }}>×</button>
        </div>
        <div style={{ fontSize: 12, color: '#dc2626', padding: '10px 12px', background: '#fef2f2', borderRadius: 8, border: '1px solid #fecaca' }}>
          {renewInfo.reason || 'Không thể gia hạn.'}
        </div>
      </div>
    )
  }

  return (
    <div style={{
      width: 280, borderLeft: '1px solid #e2e8f0', background: '#f8fafc',
      padding: 16, display: 'flex', flexDirection: 'column', gap: 12, flexShrink: 0,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>Gia hạn</span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 18 }}>×</button>
      </div>

      <div style={{ fontSize: 12, color: '#64748b' }}>
        {selectedItemKeys ? `${quantity} proxy đã chọn` : `Tất cả ${quantity} proxy`}
      </div>

      {/* Duration */}
      {isOriginal ? (
        <div style={{ padding: '8px 12px', background: '#eff6ff', borderRadius: 8, border: '1px solid #bfdbfe', fontSize: 12, color: '#1d4ed8' }}>
          Gia hạn {originalDays} ngày (theo lần mua đầu)
        </div>
      ) : isPerUnit && perUnit ? (
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#475569', marginBottom: 6 }}>
            {perUnit.time_unit === 'month' ? 'Chọn số tháng' : 'Chọn số ngày'}
          </div>

          {/* Mốc giảm giá — giống checkout */}
          {perUnit.discount_tiers?.length > 0 && (() => {
            const unitLabel = perUnit.time_unit === 'month' ? 'tháng' : 'ngày'
            const tiers = perUnit.discount_tiers.slice(0, 5)
            return (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                {/* Mốc 1 — không giảm giá */}
                <button
                  onClick={() => setCustomDuration(1)}
                  style={{
                    flex: '1 0 auto', minWidth: 52, padding: '6px 4px', fontSize: 11, fontWeight: 600,
                    borderRadius: 8, cursor: 'pointer', border: '1.5px solid', transition: 'all 0.15s',
                    textAlign: 'center', position: 'relative',
                    background: customDuration === 1 ? '#1e293b' : '#fff',
                    color: customDuration === 1 ? '#fff' : '#475569',
                    borderColor: customDuration === 1 ? '#1e293b' : '#e2e8f0',
                  }}
                >
                  <div style={{ fontSize: 15, fontWeight: 700 }}>1</div>
                  <div style={{ fontSize: 10, opacity: 0.7 }}>{unitLabel}</div>
                  <div style={{ fontSize: 10, marginTop: 2 }}>{perUnit.price_per_unit.toLocaleString('vi-VN')}đ</div>
                </button>
                {/* Mốc theo discount tiers */}
                {tiers.map((tier, i) => {
                  const minDays = parseInt(tier.min) || 1
                  const disc = parseInt(tier.discount) || 0
                  const tierPrice = Math.round(perUnit.price_per_unit * (1 - disc / 100))
                  return (
                    <button
                      key={i}
                      onClick={() => setCustomDuration(minDays)}
                      style={{
                        flex: '1 0 auto', minWidth: 52, padding: '6px 4px', fontSize: 11, fontWeight: 600,
                        borderRadius: 8, cursor: 'pointer', border: '1.5px solid', transition: 'all 0.15s',
                        textAlign: 'center', position: 'relative',
                        background: customDuration === minDays ? '#1e293b' : '#fff',
                        color: customDuration === minDays ? '#fff' : '#475569',
                        borderColor: customDuration === minDays ? '#1e293b' : '#e2e8f0',
                      }}
                    >
                      {disc > 0 && (
                        <div style={{
                          position: 'absolute', top: -6, right: -4, fontSize: 9, fontWeight: 700,
                          background: '#16a34a', color: '#fff', padding: '1px 4px', borderRadius: 4,
                        }}>-{disc}%</div>
                      )}
                      <div style={{ fontSize: 15, fontWeight: 700 }}>{minDays}</div>
                      <div style={{ fontSize: 10, opacity: 0.7 }}>{unitLabel}</div>
                      <div style={{ fontSize: 10, marginTop: 2 }}>{tierPrice.toLocaleString('vi-VN')}đ</div>
                    </button>
                  )
                })}
              </div>
            )
          })()}

          {/* Input tự nhập */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, color: '#64748b', whiteSpace: 'nowrap' }}>Hoặc nhập:</span>
            <input
              type='number'
              min={1}
              max={365}
              value={customDuration}
              onChange={e => setCustomDuration(Math.max(1, parseInt(e.target.value) || 1))}
              style={{
                width: 60, padding: '5px 8px', fontSize: 13, fontWeight: 600,
                borderRadius: 6, border: '1.5px solid #e2e8f0', outline: 'none',
                textAlign: 'center',
              }}
            />
            <span style={{ fontSize: 11, color: '#64748b' }}>{perUnit.time_unit === 'month' ? 'tháng' : 'ngày'}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', marginLeft: 'auto' }}>
              = {unitPrice.toLocaleString('vi-VN')}đ
            </span>
          </div>

          {/* Thông tin giảm giá đang áp dụng */}
          {(() => {
            const tier = perUnit.discount_tiers?.find(t => {
              const min = parseInt(t.min) || 0
              const max = parseInt(t.max) || Infinity
              return customDuration >= min && customDuration <= max
            })
            const discPct = parseInt(tier?.discount || '0') || 0
            if (discPct <= 0) return null
            const fullPrice = perUnit.price_per_unit * customDuration
            return (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6, marginTop: 6,
                fontSize: 11, color: '#16a34a', fontWeight: 600,
                padding: '4px 8px', background: '#f0fdf4', borderRadius: 6, border: '1px solid #bbf7d0',
              }}>
                <span style={{ background: '#16a34a', color: '#fff', padding: '1px 5px', borderRadius: 4, fontSize: 10 }}>-{discPct}%</span>
                <s style={{ color: '#94a3b8', fontWeight: 400 }}>{fullPrice.toLocaleString('vi-VN')}đ</s>
                <span>tiết kiệm {(fullPrice - unitPrice).toLocaleString('vi-VN')}đ</span>
              </div>
            )
          })()}
        </div>
      ) : (
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Thời hạn</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {availableDurations.map(d => (
              <button
                key={d}
                onClick={() => setDuration(d)}
                style={{
                  padding: '5px 12px', fontSize: 12, fontWeight: 600, borderRadius: 6, cursor: 'pointer',
                  border: '1.5px solid', transition: 'all 0.15s',
                  background: duration === d ? '#1e293b' : '#fff',
                  color: duration === d ? '#fff' : '#64748b',
                  borderColor: duration === d ? '#1e293b' : '#e2e8f0',
                }}
              >
                {d} ngày
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Price */}
      <div style={{ background: '#fff', borderRadius: 8, padding: 12, border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#64748b', marginBottom: 4 }}>
          <span>Đơn giá ({days} ngày)</span>
          <span>{unitPrice.toLocaleString('vi-VN')}đ</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#64748b', marginBottom: 4 }}>
          <span>Số lượng</span>
          <span>×{quantity}</span>
        </div>
        <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 6, marginTop: 4, display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 700 }}>
          <span>Tổng</span>
          <span style={{ color: 'var(--primary-color, #3b82f6)' }}>{total.toLocaleString('vi-VN')}đ</span>
        </div>
      </div>

      {sodu < total && (
        <div style={{ fontSize: 11, color: '#dc2626', display: 'flex', alignItems: 'center', gap: 4 }}>
          <AlertTriangle size={13} /> Thiếu {(total - sodu).toLocaleString('vi-VN')}đ
        </div>
      )}

      <button
        onClick={isSuccess ? onClose : handleRenew}
        disabled={isPending || sodu < total}
        style={{
          width: '100%', padding: '10px', fontSize: 13, fontWeight: 700, borderRadius: 8, border: 'none', cursor: 'pointer',
          background: isSuccess ? '#16a34a' : '#3b82f6', color: '#fff',
          opacity: (isPending || sodu < total) ? 0.6 : 1,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}
      >
        {isPending ? <><Loader size={14} className='animate-pulse' /> Đang xử lý...</>
          : isSuccess ? 'Thành công!'
          : <><RefreshCw size={14} /> Gia hạn {days} ngày</>}
      </button>
    </div>
  )
}

function InfoCard({ icon, label, value, highlight }: { icon: React.ReactNode; label: string; value: string; highlight?: boolean }) {
  return (
    <Box sx={{
      p: '10px 12px', borderRadius: '10px',
      background: '#f8fafc', border: '1px solid #f1f5f9'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
        <span style={{ color: '#94a3b8' }}>{icon}</span>
        <Typography sx={{ fontSize: '11px', color: '#94a3b8' }}>{label}</Typography>
      </div>
      <Typography sx={{ fontSize: '13px', fontWeight: highlight ? 700 : 600, color: highlight ? 'var(--primary-color)' : '#1e293b' }}>
        {value}
      </Typography>
    </Box>
  )
}

// ====== Client Item Log Panel ======

const ITEM_LOG_ACTION: Record<string, { label: string; color: string }> = {
  rotate_success: { label: 'OK', color: '#16a34a' },
  rotate_error: { label: 'Lỗi', color: '#dc2626' },
  rotate_timeout: { label: 'Timeout', color: '#f59e0b' },
  no_provider: { label: 'No NCC', color: '#ea580c' },
  paused: { label: 'Tạm dừng', color: '#7c3aed' },
}

function ClientItemLogPanel({ itemKey }: { itemKey: string }) {
  const { data: logs, isLoading } = useOrderItemLogs(itemKey)

  if (isLoading) return <div style={{ fontSize: '11px', color: '#94a3b8' }}>Đang tải...</div>
  if (!logs?.length) return <div style={{ fontSize: '11px', color: '#cbd5e1', textAlign: 'center', padding: '20px 0' }}>Chưa có log xoay (log tự xóa sau 30 phút)</div>

  return (
    <div>
      {logs.map((log: OrderItemLog, i: number) => {
        const action = ITEM_LOG_ACTION[log.action] ?? { label: log.action, color: '#94a3b8' }
        const isError = log.action.includes('error') || log.action === 'rotate_timeout' || log.action === 'no_provider' || log.action === 'paused'

        return (
          <div key={i} style={{ padding: '8px 0', borderBottom: '1px solid #f1f5f9', fontSize: '11px' }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ color: '#94a3b8', fontFamily: 'monospace', width: 55, flexShrink: 0 }}>
                {log.created_at ? new Date(log.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : ''}
              </span>
              <span style={{ color: action.color, fontWeight: 600, flexShrink: 0 }}>{action.label}</span>
              {/* duration_ms + provider_code ẩn khỏi user view */}
            </div>

            <div style={{
              color: isError ? '#dc2626' : '#64748b', marginTop: 2, wordBreak: 'break-all',
              ...(isError ? { background: '#fef2f2', padding: '3px 6px', borderRadius: 3 } : {})
            }}>
              {log.message}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function UnlockRotateButton({ itemKey }: { itemKey: string }) {
  const unlock = useUnlockRotate()

  return (
    <button
      onClick={() => unlock.mutate(itemKey)}
      disabled={unlock.isPending}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: '5px 12px', marginBottom: 8,
        fontSize: '11px', fontWeight: 600, borderRadius: 6,
        border: '1px solid #f59e0b', background: unlock.isSuccess ? '#dcfce7' : '#fffbeb',
        color: unlock.isSuccess ? '#16a34a' : '#b45309',
        cursor: unlock.isPending ? 'wait' : 'pointer',
      }}
    >
      <RefreshCw size={11} />
      {unlock.isPending ? 'Đang gỡ...' : unlock.isSuccess ? 'Đã gỡ lock' : 'Gỡ lock xoay'}
    </button>
  )
}

export default OrderDetail
