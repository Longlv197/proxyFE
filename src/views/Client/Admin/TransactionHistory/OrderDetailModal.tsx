import { useMemo, useState, useEffect } from 'react'

import {
  X,
  CheckCircle,
  Clock,
  DollarSign,
  User,
  Loader2,
  CircleX,
  RotateCcw,
  BadgeCheck,
  BadgeMinus,
  AlertCircle,
  Copy,
  Clock3,
  Download,
  FileText,
  ArrowRight,
  Zap,
  Globe,
  AlertTriangle,
  RefreshCw,
  ChevronDown,
  Database,
  Eye,
  Pencil,
  Save
} from 'lucide-react'

import { extractProxyValue, extractProtocol } from '@/utils/protocolProxy'
import { useBranding } from '@/app/contexts/BrandingContext'
import { useReactTable, getCoreRowModel, flexRender, getPaginationRowModel } from '@tanstack/react-table'
import Dialog from '@mui/material/Dialog'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import { Chip, Checkbox, CircularProgress } from '@mui/material'

import { formatDateTimeLocal } from '@/utils/formatDate'
import { ORDER_STATUS_LABELS_ADMIN, ORDER_STATUS, ORDER_STATUS_COLORS_ADMIN } from '@/constants'
import { useApiKeys, useUpdateItem, useUpdateOrder } from '@/hooks/apis/useOrders'
import { useOrderLogs, type OrderLog } from '@/hooks/apis/useOrderLogs'
import { useOrderHistories, type OrderHistoryItem } from '@/hooks/apis/useOrderHistories'
import { useOrderHistoryLogs, type HistoryLogItem } from '@/hooks/apis/useRenewal'
import { useOrderItemLogs, type OrderItemLog } from '@/hooks/apis/useOrderItemLogs'
import { useUnlockRotate, useUpdateOrderItem } from '@/hooks/apis/useOrderItems'
import { usePingProxy } from '@/hooks/apis/usePingProxy'
import { ROTATION_MODE, ROTATION_MODE_LABELS } from '@/constants/rotationMode'

interface OrderDetailModalProps {
  isOpen: boolean
  onClose: () => void
  orderData: any
  isLoading?: boolean
}

const formatVND = (v: number) => new Intl.NumberFormat('vi-VN').format(v) + 'đ'

// Log action → icon + color + label
const LOG_ACTION_CONFIG: Record<string, { icon: any; color: string; label: string }> = {
  created: { icon: Zap, color: '#3b82f6', label: 'Tạo đơn' },
  processing: { icon: Loader2, color: '#f59e0b', label: 'Bắt đầu xử lý' },
  in_use: { icon: BadgeCheck, color: '#22c55e', label: 'Hoàn thành' },
  completed: { icon: BadgeCheck, color: '#22c55e', label: 'Hoàn thành' },
  in_use_partial: { icon: AlertCircle, color: '#f97316', label: 'Thiếu proxy' },
  failed: { icon: CircleX, color: '#ef4444', label: 'Thất bại' },
  expired: { icon: Clock, color: '#94a3b8', label: 'Hết hạn' },
  retry: { icon: RefreshCw, color: '#a855f7', label: 'Retry' },
  api_call_start: { icon: Globe, color: '#6366f1', label: 'Gọi API nhà cung cấp' },
  api_call_success: { icon: CheckCircle, color: '#22c55e', label: 'API thành công' },
  api_call_error: { icon: AlertTriangle, color: '#ef4444', label: 'API lỗi' },
  admin_retry_partial: { icon: RefreshCw, color: '#a855f7', label: 'Admin mua bù' },
  admin_refund_partial: { icon: RotateCcw, color: '#ec4899', label: 'Admin hoàn tiền' },
  auto_recovered: { icon: Zap, color: '#14b8a6', label: 'Tự động phục hồi' }
}

export default function OrderDetailModal({ isOpen, onClose, orderData, isLoading = false }: OrderDetailModalProps) {
  const { isChild } = useBranding()
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [rowSelection, setRowSelection] = useState({})
  const [tabIndex, setTabIndex] = useState(0)
  const [viewLogId, setViewLogId] = useState<number | null>(null)
  const [viewItemKey, setViewItemKey] = useState<string | null>(null)

  const updateItemMutation = useUpdateOrderItem()
  const pingProxy = usePingProxy()
  const [pingResults, setPingResults] = useState<Record<string, string>>({})
  const orderId = orderData?.order?.id
  const { data: dataApiKeys, isLoading: loadingApiKeys } = useApiKeys(orderId, isOpen)

  // Auto-ping proxy gốc cho rotate_auto khi data load xong
  useEffect(() => {
    if (!dataApiKeys?.length) return
    const items = (dataApiKeys as any[]).filter((item: any) => {
      if (item.rotation_mode !== ROTATION_MODE.ROTATE_AUTO) return false
      const proxyStr = getProxyText(item)
      const itemKey = item.key || item.api_key
      return proxyStr && proxyStr !== '-' && itemKey && !pingResults[itemKey]
    })
    if (!items.length) return

    const pingSequential = async () => {
      for (const item of items) {
        const proxyStr = getProxyText(item)
        const itemKey = item.key || item.api_key
        setPingResults(prev => ({ ...prev, [itemKey]: 'loading' }))
        try {
          const data = await pingProxy.mutateAsync(proxyStr)
          setPingResults(prev => ({ ...prev, [itemKey]: data?.origin_ip || 'N/A' }))
        } catch {
          setPingResults(prev => ({ ...prev, [itemKey]: 'Lỗi kết nối' }))
        }
      }
    }
    pingSequential()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataApiKeys])
  const dataField = (dataApiKeys as any)?._dataField || 'proxy'
  const { data: orderLogs = [], isLoading: loadingLogs } = useOrderLogs(orderId, isOpen)
  const { data: histories = [], isLoading: loadingHistories } = useOrderHistories(orderId, isOpen)

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  const downloadApiKeys = () => {
    const selectedRows = table.getFilteredSelectedRowModel().rows

    const keys = selectedRows.length > 0
      ? selectedRows.map((r: any) => r.original.key || r.original.api_key || getProxyText(r.original)).join('\n')
      : (dataApiKeys || []).map((item: any) => item.key || item.api_key || getProxyText(item)).join('\n')

    const blob = new Blob([keys], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.download = `keys-${orderData?.order?.order_code || 'export'}.txt`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const getProxyText = (item: any) => {
    const p = item.proxy || item.proxys
    if (p && typeof p === 'object') {
      const raw = extractProxyValue(p)
      return raw.replace(/:+$/, '') || '-'
    }
    return p || '-'
  }

  const getStatusBadge = (status: string) => {
    const label = ORDER_STATUS_LABELS_ADMIN[status]
    const color = ORDER_STATUS_COLORS_ADMIN[status as keyof typeof ORDER_STATUS_COLORS_ADMIN]

    if (!label) return <Chip label='?' size='small' color='default' />

    const isPending = [ORDER_STATUS.PENDING, ORDER_STATUS.PROCESSING, ORDER_STATUS.RETRY_PROCESSING_PARTIAL].includes(status as any)

    return (
      <Chip
        label={label}
        size='small'
        color={color as any}
        icon={isPending ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : undefined}
      />
    )
  }

  const columns = useMemo(
    () => [
      {
        id: 'select',
        header: ({ table }: { table: any }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected()}
            indeterminate={table.getIsSomePageRowsSelected()}
            onChange={table.getToggleAllPageRowsSelectedHandler()}
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
        header: 'Key hệ thống',
        size: 180,
        cell: ({ row }: { row: any }) => {
          const text = row.original.key || row.original.api_key || '-'
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'monospace', fontSize: '11px' }}>
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={text}>{text}</span>
              {text !== '-' && (
                <button onClick={() => copyToClipboard(text, `key-${row.id}`)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: copiedField === `key-${row.id}` ? '#16a34a' : '#94a3b8' }}>
                  {copiedField === `key-${row.id}` ? <CheckCircle size={13} /> : <Copy size={13} />}
                </button>
              )}
            </div>
          )
        }
      },
      {
        header: 'Key đối tác',
        size: 160,
        cell: ({ row }: { row: any }) => {
          const text = row.original.provider_key || row.original.api_key_provider || row.original.parent_api_mapping?.supplier_api_key || '-'
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'monospace', fontSize: '11px', color: '#6366f1' }}>
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={text}>{text}</span>
              {text !== '-' && (
                <button onClick={() => copyToClipboard(text, `pkey-${row.id}`)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: copiedField === `pkey-${row.id}` ? '#16a34a' : '#94a3b8' }}>
                  {copiedField === `pkey-${row.id}` ? <CheckCircle size={13} /> : <Copy size={13} />}
                </button>
              )}
            </div>
          )
        }
      },
      {
        header: 'Proxy',
        size: 220,
        cell: ({ row }: { row: any }) => {
          const proxys = row.original.proxy || row.original.proxys
          const text = getProxyText(row.original)
          const protocol = row.original.protocol || extractProtocol(proxys) || '-'
          const allowIps = row.original.ip_whitelist
          const isRotateAuto = row.original.rotation_mode === ROTATION_MODE.ROTATE_AUTO
          const itemKey = row.original.key || row.original.api_key || row.id
          const pingedIp = pingResults[itemKey]
          return (
            <div style={{ fontSize: '11px' }}>
              <div style={{ fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={text}>
                {text}
              </div>
              <div style={{ color: '#94a3b8', fontSize: '10px', marginTop: 2 }}>
                {protocol?.toUpperCase()}
              </div>
              {allowIps?.length > 0 && (
                <div style={{ fontSize: '10px', color: '#2563eb', marginTop: 2 }} title={allowIps.join(', ')}>
                  IP: {allowIps.join(', ')}
                </div>
              )}
              {isRotateAuto && text && text !== '-' && (
                <div style={{ marginTop: 3, display: 'flex', alignItems: 'center', gap: 5 }}>
                  {pingedIp === 'loading' ? (
                    <span style={{ fontSize: '10px', color: '#94a3b8', fontStyle: 'italic' }}>Đang lấy IP gốc...</span>
                  ) : pingedIp ? (
                    <>
                      <span style={{ fontSize: '10px', color: '#059669', fontWeight: 600 }}>IP gốc: {pingedIp}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setPingResults(prev => ({ ...prev, [itemKey]: 'loading' }))
                          pingProxy.mutate(text, {
                            onSuccess: (data) => setPingResults(prev => ({ ...prev, [itemKey]: data?.origin_ip || 'N/A' })),
                            onError: () => setPingResults(prev => ({ ...prev, [itemKey]: 'Lỗi' })),
                          })
                        }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 0, fontSize: '10px' }}
                        title='Làm mới IP gốc'
                      >↻</button>
                    </>
                  ) : null}
                </div>
              )}
            </div>
          )
        }
      },
      {
        header: 'ID NCC',
        size: 80,
        cell: ({ row }: { row: any }) => {
          const id = row.original.provider_item_id
          return id ? (
            <span style={{ fontFamily: 'monospace', fontSize: '11px', color: '#8b5cf6' }}>{id}</span>
          ) : <span style={{ color: '#cbd5e1', fontSize: '11px' }}>—</span>
        }
      },
      {
        header: 'Dữ liệu lưu ← Đối tác',
        size: 200,
        cell: ({ row }: { row: any }) => {
          const proxy = row.original.proxy || row.original.proxys
          const origins: Record<string, string> = row.original.metadata?._field_origins || {}
          const meta = row.original.metadata || {}
          // Build compact mapping display
          const mappings: { sys: string; val: string; src: string }[] = []

          // Proxy fields
          if (proxy && typeof proxy === 'object') {
            const LABELS: Record<string, string> = { ip: 'IP', port: 'Port', user: 'User', pass: 'Pass', loaiproxy: 'Protocol' }
            for (const k of ['ip', 'port', 'user', 'pass', 'loaiproxy']) {
              if (proxy[k]) mappings.push({ sys: LABELS[k] || k, val: String(proxy[k]).substring(0, 20), src: origins[k] || k })
            }
          }
          // Provider key (rotating)
          if (row.original.provider_key && origins['api_key']) {
            mappings.push({ sys: 'API Key', val: '***', src: origins['api_key'] })
          }
          // Custom metadata fields (skip _field_origins)
          Object.entries(meta).forEach(([k, v]) => {
            if (k === '_field_origins') return
            if (origins[k]) mappings.push({ sys: k, val: String(v).substring(0, 15), src: origins[k] })
          })

          if (mappings.length === 0) {
            return <span style={{ color: '#cbd5e1', fontSize: '10px' }}>Click để xem</span>
          }

          return (
            <div style={{ fontSize: '10px', lineHeight: 1.6 }}>
              {mappings.slice(0, 3).map((m, i) => (
                <div key={i} style={{ display: 'flex', gap: 3, overflow: 'hidden', whiteSpace: 'nowrap' }}>
                  <span style={{ color: '#1e40af', fontWeight: 600 }}>{m.sys}</span>
                  <span style={{ color: '#94a3b8' }}>←</span>
                  <span style={{ color: '#b45309', fontFamily: 'monospace' }}>{m.src}</span>
                </div>
              ))}
              {mappings.length > 3 && <span style={{ color: '#94a3b8' }}>+{mappings.length - 3} field...</span>}
            </div>
          )
        }
      },
      {
        header: 'Trạng thái', size: 100,
        cell: ({ row }: { row: any }) => {
          const s = row.original?.status
          // status: 0=ACTIVE, 1=INACTIVE, 2=EXPIRED (hoặc string 'ACTIVE'/'INACTIVE')
          if (s === 0 || s === 'ACTIVE') return <Chip label='Hoạt động' size='small' icon={<BadgeCheck size={14} />} color='success' />
          if (s === 1 || s === 'INACTIVE') return <Chip label='Đã tắt' size='small' icon={<BadgeMinus size={14} />} color='warning' />
          return <Chip label='Hết hạn' size='small' icon={<CircleX size={14} />} color='error' />
        }
      },
      {
        header: 'Chế độ xoay', size: 120,
        cell: ({ row }: { row: any }) => {
          const mode = row.original.rotation_mode || ''
          return (
            <select
              value={mode}
              onChange={(e) => {
                const newMode = e.target.value
                updateItemMutation.mutate({ key: row.original.key || row.original.api_key, data: { rotation_mode: newMode || null } })
              }}
              style={{
                fontSize: '11px', padding: '3px 6px', borderRadius: 4,
                border: '1px solid #cbd5e1', background: '#f8fafc', cursor: 'pointer',
              }}
            >
              <option value=''>— Mặc định</option>
              {Object.entries(ROTATION_MODE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          )
        }
      },
      {
        header: 'Hết hạn', size: 140,
        cell: ({ row }: { row: any }) => (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#64748b', fontSize: '11px' }}>
            <Clock3 size={12} />
            {formatDateTimeLocal(row.original.expired_at)}
          </div>
        )
      }
    ],
    [copiedField, updateItemMutation]
  )

  const table = useReactTable({
    data: dataApiKeys || [],
    columns,
    state: { rowSelection },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 5 } }
  })

  useEffect(() => {
    if (!isOpen) { setRowSelection({}); setTabIndex(0); setViewLogId(null); setViewItemKey(null) }
  }, [isOpen])

  // Auto-show log panel khi mở modal — chọn item ROTATING đầu tiên
  useEffect(() => {
    if (isOpen && dataApiKeys?.length && !viewItemKey) {
      const firstRotating = dataApiKeys.find((item: any) => item.type === 'ROTATING')
      if (firstRotating?.key) setViewItemKey(firstRotating.key)
    }
  }, [isOpen, dataApiKeys])

  if (!isOpen) return null

  const order = orderData?.order
  const selectedCount = Object.keys(rowSelection).length

  return (
    <Dialog
      onClose={onClose}
      open={isOpen}
      closeAfterTransition={false}
      maxWidth={(viewLogId || viewItemKey) ? 'lg' : 'md'}
      fullWidth
      PaperProps={{ sx: { borderRadius: '12px', maxHeight: '85vh', mt: '5vh', mb: 'auto' } }}
    >
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '14px 20px', borderBottom: '1px solid #f1f5f9'
      }}>
        <div>
          <div style={{ fontSize: '16px', fontWeight: 700, color: '#1e293b' }}>Chi tiết đơn hàng</div>
          <div style={{ fontSize: '13px', color: '#64748b', marginTop: 2 }}>#{order?.order_code || '—'}</div>
        </div>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, color: '#94a3b8' }}
        >
          <X size={20} />
        </button>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
          <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: '#64748b' }} />
          <p style={{ color: '#64748b', marginTop: 12 }}>Đang tải...</p>
        </div>
      ) : (
        <div style={{ overflowY: 'auto', maxHeight: 'calc(85vh - 65px)' }}>
          {/* Order info grid */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: 10, padding: '16px 20px'
          }}>
            <InfoCell label='Khách hàng' value={orderData?.order?.user_name || orderData?.user?.name || '—'} icon={<User size={14} />} />
            <InfoCell label='Dịch vụ' value={order?.service_name || '—'} icon={<Globe size={14} />} />
            <InfoCell label='Số lượng' value={
              order?.delivered_quantity != null && order?.delivered_quantity !== order?.quantity
                ? `${order.delivered_quantity}/${order.quantity}`
                : String(order?.quantity || 0)
            } icon={<FileText size={14} />} />
            <InfoCell label='Doanh thu' value={formatVND(order?.total_amount || 0)} highlight icon={<DollarSign size={14} />} />
            <InfoCell label='Vốn' value={formatVND(order?.total_cost || 0)} icon={<DollarSign size={14} />} />
            <div style={{ padding: '8px 10px', borderRadius: 8, background: '#f8fafc', border: '1px solid #f1f5f9' }}>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: 4 }}>Trạng thái</div>
              {getStatusBadge(String(order?.status))}
            </div>
          </div>

          {/* Order raw data — expandable */}
          <OrderRawDataPanel order={order} />

          {/* Nguồn mua GEM1 — chỉ hiện khi order được mua qua GEM1 tool */}
          <GemSourcePanel order={order} />

          {/* Tabs — sticky */}
          <Tabs
            value={tabIndex}
            onChange={(_, v) => setTabIndex(v)}
            sx={{
              borderBottom: '1px solid #f1f5f9', px: '20px',
              position: 'sticky', top: 0, zIndex: 10, bgcolor: 'background.paper',
              '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, fontSize: '13px', minHeight: 42 }
            }}
          >
            <Tab label={`Proxy (${dataApiKeys?.length || 0})`} />
            <Tab label={`Logs (${orderLogs.length})`} />
            {histories.length > 0 && <Tab label={`Lịch sử gia hạn (${histories.length})`} />}
          </Tabs>

          {/* Tab content */}
          <div style={{ padding: '16px 20px' }}>
            {tabIndex === 0 && (
              <div style={{ display: 'flex', gap: 0 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                {/* Copy/Download buttons */}
                {selectedCount > 0 && (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>Đã chọn: {selectedCount}</span>
                    <button
                      onClick={() => {
                        const rows = table.getFilteredSelectedRowModel().rows
                        const keys = rows.map((r: any) => r.original.key || r.original.api_key || getProxyText(r.original)).join('\n')

                        copyToClipboard(keys, 'bulk')
                      }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 4,
                        padding: '4px 10px', fontSize: '12px', fontWeight: 500,
                        background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0',
                        borderRadius: 6, cursor: 'pointer'
                      }}
                    >
                      <Copy size={13} /> {copiedField === 'bulk' ? 'Đã copy!' : 'Copy'}
                    </button>
                    <button
                      onClick={downloadApiKeys}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 4,
                        padding: '4px 10px', fontSize: '12px', fontWeight: 500,
                        background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe',
                        borderRadius: 6, cursor: 'pointer'
                      }}
                    >
                      <Download size={13} /> Tải
                    </button>
                  </div>
                )}

                {loadingApiKeys ? (
                  <div style={{ textAlign: 'center', padding: '30px 0' }}>
                    <CircularProgress size={24} />
                    <p style={{ color: '#64748b', fontSize: '13px', marginTop: 8 }}>Đang tải proxy...</p>
                  </div>
                ) : dataApiKeys && dataApiKeys.length > 0 ? (
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
                          {table.getRowModel().rows.map(row => (
                            <ExpandableItemRow key={row.id} row={row} activeItemKey={viewItemKey} onViewLogs={(k) => setViewItemKey(viewItemKey === k ? null : k)} />
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                      <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                        Trang {table.getState().pagination.pageIndex + 1} / {table.getPageCount()} ({dataApiKeys.length} keys)
                      </span>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          onClick={() => table.previousPage()}
                          disabled={!table.getCanPreviousPage()}
                          style={navBtnStyle(!table.getCanPreviousPage())}
                        >
                          Trước
                        </button>
                        <button
                          onClick={() => table.nextPage()}
                          disabled={!table.getCanNextPage()}
                          style={navBtnStyle(!table.getCanNextPage())}
                        >
                          Sau
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div style={{ textAlign: 'center', padding: '30px 0', background: '#f8fafc', borderRadius: 8, border: '1px solid #f1f5f9' }}>
                    <p style={{ color: '#94a3b8', fontSize: '13px' }}>Chưa có proxy</p>
                  </div>
                )}
              </div>

              {/* Panel phải: log xoay proxy */}
              {viewItemKey && (() => {
                const activeItem = (dataApiKeys || []).find((item: any) => item.key === viewItemKey)
                const nextRotate = activeItem?.next_rotate_seconds

                return (
                <div style={{
                  flex: '0 0 38%', borderLeft: '1px solid #e2e8f0',
                  overflowY: 'auto', maxHeight: '60vh', padding: '12px 16px',
                  animation: 'slideInRight 0.2s ease-out',
                }}>
                  <style>{`@keyframes slideInRight { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }`}</style>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#374151' }}>Log xoay proxy</div>
                    <button onClick={() => setViewItemKey(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 2 }}>
                      <X size={14} />
                    </button>
                  </div>
                  <div style={{ fontSize: '11px', color: '#6366f1', fontFamily: 'monospace', marginBottom: 4, wordBreak: 'break-all' }}>
                    {viewItemKey}
                  </div>
                  {nextRotate != null && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <span style={{ fontSize: '11px', color: nextRotate > 0 ? '#f59e0b' : '#16a34a' }}>
                        {nextRotate > 0 ? `Xoay tiếp sau ${nextRotate}s` : 'Sẵn sàng xoay'}
                      </span>
                      {nextRotate >= 60 && <UnlockButton itemKey={viewItemKey} />}
                    </div>
                  )}
                  <ItemLogPanel itemKey={viewItemKey} />
                </div>
                )
              })()}
              </div>
            )}

            {tabIndex === 1 && (
              <OrderLogsTimeline logs={orderLogs} isLoading={loadingLogs} />
            )}

            {tabIndex === 2 && histories.length > 0 && (
              <AdminRenewalSection histories={histories} order={order} viewLogId={viewLogId} onViewLog={id => setViewLogId(viewLogId === id ? null : id)} />
            )}
          </div>
        </div>
      )}
    </Dialog>
  )
}

// ====== Sub-components ======

function InfoCell({ label, value, icon, highlight }: { label: string; value: string; icon?: React.ReactNode; highlight?: boolean }) {
  return (
    <div style={{ padding: '8px 10px', borderRadius: 8, background: '#f8fafc', border: '1px solid #f1f5f9' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 3 }}>
        <span style={{ color: '#94a3b8' }}>{icon}</span>
        <span style={{ fontSize: '11px', color: '#94a3b8' }}>{label}</span>
      </div>
      <div style={{ fontSize: '13px', fontWeight: highlight ? 700 : 600, color: highlight ? 'var(--primary-color)' : '#1e293b' }}>
        {value}
      </div>
    </div>
  )
}

/** Code block có copy + resize tự do */
function CodeBlock({ value, color = '#93c5fd', open }: { value: string; color?: string; open?: boolean }) {
  const [copied, setCopied] = useState(false)
  const formatted = (() => {
    if (typeof value === 'string') {
      try { return JSON.stringify(JSON.parse(value), null, 2) } catch { return value }
    }
    return JSON.stringify(value, null, 2)
  })()

  return (
    <div style={{ position: 'relative', marginTop: 4 }}>
      <button
        onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(formatted); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
        style={{
          position: 'absolute', top: 4, right: 4, zIndex: 1,
          background: copied ? '#22c55e' : '#334155', border: 'none', borderRadius: 4,
          color: '#fff', fontSize: '10px', padding: '2px 8px', cursor: 'pointer',
          transition: 'background 0.2s',
        }}
      >
        {copied ? 'Copied!' : 'Copy'}
      </button>
      <pre style={{
        fontSize: '11px', color, background: '#0f172a',
        padding: '8px 10px', borderRadius: 6,
        minHeight: 40, maxHeight: 'none',
        border: '1px solid #1e293b', resize: 'vertical', overflow: 'auto',
        fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-all',
        margin: 0,
      }}>
        {formatted}
      </pre>
    </div>
  )
}

/** Format giá trị — xử lý object/array không bị [object Object] */
const fmtValue = (v: any): string => {
  if (v == null) return '—'
  if (typeof v === 'object') { try { return JSON.stringify(v) } catch { return String(v) } }
  return String(v)
}

/** Panel nguồn mua GEM1 — hiện khi order.metadata có gem_buy_token */
function GemSourcePanel({ order }: { order: any }) {
  const [showToken, setShowToken] = useState(false)
  const [copied, setCopied] = useState(false)

  const meta = useMemo(() => {
    const raw = order?.metadata
    if (!raw) return null
    if (typeof raw === 'string') {
      try { return JSON.parse(raw) } catch { return null }
    }
    return raw
  }, [order?.metadata])

  if (!meta?.gem_buy_token) return null

  const token = String(meta.gem_buy_token)
  const masked = '•'.repeat(8) + token.slice(-6)
  const copyToken = () => {
    navigator.clipboard.writeText(token)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div style={{
      margin: '0 20px 16px', padding: 14, borderRadius: 10,
      background: '#faf5ff', border: '1px solid #e9d5ff',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <Zap size={14} color='#7e22ce' />
        <span style={{ fontWeight: 700, fontSize: 13, color: '#7e22ce' }}>Nguồn mua: GEM1 Tool</span>
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: 10, fontSize: 12,
      }}>
        <div>
          <div style={{ color: '#94a3b8', fontSize: 11, marginBottom: 2 }}>Mã nạp (code CK)</div>
          <div style={{ fontFamily: 'monospace', color: '#111' }}>{meta.gem_deposit_code || '—'}</div>
        </div>
        <div>
          <div style={{ color: '#94a3b8', fontSize: 11, marginBottom: 2 }}>Số tiền nạp</div>
          <div style={{ fontWeight: 600, color: '#111' }}>{formatVND(Number(meta.gem_deposit_amount || 0))}</div>
        </div>
        <div>
          <div style={{ color: '#94a3b8', fontSize: 11, marginBottom: 2 }}>Lệnh nạp</div>
          <div style={{ color: '#111' }}>#{meta.gem_bank_auto_id || '—'}</div>
        </div>
        {meta.external_ref && (
          <div>
            <div style={{ color: '#94a3b8', fontSize: 11, marginBottom: 2 }}>External ref</div>
            <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#64748b' }}>{meta.external_ref}</div>
          </div>
        )}
      </div>

      <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ color: '#94a3b8', fontSize: 11, minWidth: 72 }}>Buy Token:</div>
        <div style={{ fontFamily: 'monospace', fontSize: 11, flex: 1, wordBreak: 'break-all' }}>
          {showToken ? token : masked}
        </div>
        <button
          onClick={() => setShowToken(v => !v)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#7e22ce' }}
          title={showToken ? 'Ẩn' : 'Hiện'}
        >
          <Eye size={14} />
        </button>
        <button
          onClick={copyToken}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#7e22ce' }}
          title='Copy'
        >
          <Copy size={14} />
        </button>
        {copied && <span style={{ fontSize: 11, color: '#16a34a' }}>✓</span>}
      </div>
    </div>
  )
}

/** Panel thông tin nội bộ đơn hàng — expandable, trực quan + admin edit */
function OrderRawDataPanel({ order }: { order: any }) {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<Record<string, any>>({})
  const updateOrder = useUpdateOrder()

  const startEdit = () => {
    setForm({
      status: order.status ?? 0,
      quantity: order.quantity ?? 0,
      delivered_quantity: order.delivered_quantity ?? 0,
      price_per_unit: order.price_per_unit ?? 0,
      total_amount: order.total_amount ?? 0,
      cost_price: order.cost_price ?? 0,
      total_cost: order.total_cost ?? 0,
      refunded_amount: order.refunded_amount ?? 0,
      affiliate_commission: order.affiliate_commission ?? 0,
      time: order.time ?? 0,
      retry: order.retry ?? 0,
      expired_at: order.expired_at ? order.expired_at.replace(' ', 'T').slice(0, 16) : '',
      buy_at: order.buy_at ? order.buy_at.replace(' ', 'T').slice(0, 16) : '',
      note: order.note ?? '',
      proxy_type: order.proxy_type ?? '',
    })
    setEditing(true)
  }

  const saveEdit = () => {
    if (!order?.id) return
    const payload: Record<string, any> = {}
    // Chỉ gửi field thay đổi
    const numFields = ['status', 'quantity', 'delivered_quantity', 'price_per_unit', 'total_amount', 'cost_price', 'total_cost', 'refunded_amount', 'affiliate_commission', 'time', 'retry']
    numFields.forEach(f => {
      const v = Number(form[f])
      if (v !== Number(order[f] ?? 0)) payload[f] = v
    })
    if (form.expired_at && form.expired_at !== (order.expired_at || '').replace(' ', 'T').slice(0, 16)) {
      payload.expired_at = form.expired_at.replace('T', ' ') + ':00'
    }
    if (form.buy_at && form.buy_at !== (order.buy_at || '').replace(' ', 'T').slice(0, 16)) {
      payload.buy_at = form.buy_at.replace('T', ' ') + ':00'
    }
    if (form.note !== (order.note ?? '')) payload.note = form.note
    if (form.proxy_type !== (order.proxy_type ?? '')) payload.proxy_type = form.proxy_type

    if (Object.keys(payload).length === 0) { setEditing(false); return }
    updateOrder.mutate({ orderId: order.id, data: payload }, {
      onSuccess: () => setEditing(false),
    })
  }

  if (!order) return null

  const fmtVND = (v: any) => v != null && v !== 0 && v !== '0' ? new Intl.NumberFormat('vi-VN').format(Number(v)) + 'đ' : null
  const statusLabel = ORDER_STATUS_LABELS_ADMIN[String(order.status)] || `Mã ${order.status}`
  const statusColor = ORDER_STATUS_COLORS_ADMIN[String(order.status) as keyof typeof ORDER_STATUS_COLORS_ADMIN] || 'default'

  const STATUS_OPTIONS = [
    { value: 0, label: 'Chờ xử lý' }, { value: 1, label: 'Đang xử lý' },
    { value: 2, label: 'Đang sử dụng' }, { value: 3, label: 'Thiếu proxy' },
    { value: 4, label: 'Hết hạn' }, { value: 5, label: 'Thất bại' },
    { value: 6, label: 'Hoàn tiền 1 phần' }, { value: 7, label: 'Chờ hoàn tiền' },
    { value: 8, label: 'Hoàn tiền toàn bộ' }, { value: 9, label: 'Đang mua bù' },
    { value: 10, label: 'Chờ nhà cung cấp' },
  ]

  const inputSx: React.CSSProperties = { fontSize: '12px', padding: '4px 8px', border: '1px solid #c7d2fe', borderRadius: 4, fontFamily: 'monospace', width: '100%' }

  // Card data — chỉ hiện field có giá trị
  type CardItem = { label: string; value: string | React.ReactNode; mono?: boolean; highlight?: string }
  const cards: { title: string; bg: string; color: string; items: CardItem[] }[] = [
    {
      title: 'Tài chính', bg: '#f0fdf4', color: '#166534',
      items: [
        { label: 'Giá bán', value: fmtVND(order.price_per_unit), mono: true },
        { label: 'Doanh thu', value: fmtVND(order.total_amount), mono: true, highlight: '#16a34a' },
        { label: 'Giá vốn', value: fmtVND(order.cost_price), mono: true },
        { label: 'Tổng vốn', value: fmtVND(order.total_cost), mono: true },
        ...(order.refunded_amount ? [{ label: 'Đã hoàn', value: fmtVND(order.refunded_amount)!, mono: true, highlight: '#dc2626' }] : []),
        ...(order.affiliate_commission ? [{ label: 'Hoa hồng', value: fmtVND(order.affiliate_commission)!, mono: true }] : []),
      ].filter(i => i.value) as CardItem[],
    },
    {
      title: 'Thông tin đơn', bg: '#eff6ff', color: '#1e40af',
      items: [
        { label: 'Trạng thái', value: (<Chip label={statusLabel} size='small' color={statusColor as any} />) },
        { label: 'Số lượng', value: order.delivered_quantity != null && order.delivered_quantity !== order.quantity
            ? `${order.delivered_quantity}/${order.quantity}` : String(order.quantity || 0) },
        { label: 'Thời hạn', value: order.time ? `${order.time} ngày` : null },
        { label: 'Loại', value: order.proxy_type },
        ...(order.retry ? [{ label: 'Thử lại', value: `${order.retry} lần` }] : []),
        ...(order.source ? [{ label: 'Nguồn', value: String(order.source) }] : []),
        ...(order.parent_order_id ? [{ label: 'Đơn gốc (site mẹ)', value: `#${order.parent_order_id}`, mono: true }] : []),
      ].filter(i => i.value) as CardItem[],
    },
    {
      title: 'Thời gian', bg: '#fefce8', color: '#854d0e',
      items: [
        { label: 'Kích hoạt', value: order.buy_at ? formatDateTimeLocal(order.buy_at) : null },
        { label: 'Hết hạn', value: order.expired_at ? formatDateTimeLocal(order.expired_at) : null },
        { label: 'Tạo lúc', value: order.created_at ? formatDateTimeLocal(order.created_at) : null },
      ].filter(i => i.value) as CardItem[],
    },
    {
      title: 'Mã nội bộ', bg: '#f8fafc', color: '#475569',
      items: [
        { label: 'Order ID', value: String(order.id), mono: true },
        { label: 'Order code', value: order.order_code, mono: true },
        { label: 'User ID', value: String(order.user_id), mono: true },
        ...(order.type_service_id ? [{ label: 'Service ID', value: String(order.type_service_id), mono: true }] : []),
        ...(order.transaction_id ? [{ label: 'Transaction', value: String(order.transaction_id), mono: true }] : []),
      ].filter(i => i.value) as CardItem[],
    },
  ]

  return (
    <div style={{ padding: '0 20px 8px' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6, width: '100%',
          background: open ? '#f8fafc' : 'none', border: '1px solid #e2e8f0', borderRadius: 8,
          padding: '8px 14px', cursor: 'pointer', fontSize: '12px', fontWeight: 600,
          color: '#475569',
        }}
      >
        <Eye size={14} />
        Thông tin chi tiết đơn hàng
        <ChevronDown size={14} style={{ marginLeft: 'auto', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </button>
      {open && !editing && (
        <div style={{ marginTop: 8 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {cards.map(card => (
              <div key={card.title} style={{ border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
                <div style={{ background: card.bg, padding: '5px 12px', fontSize: '11px', fontWeight: 700, color: card.color, borderBottom: '1px solid #e2e8f0' }}>
                  {card.title}
                </div>
                <div style={{ padding: '6px 0' }}>
                  {card.items.map((item, i) => (
                    <div key={i} style={{ padding: '3px 12px', fontSize: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: '#94a3b8', fontSize: '11px' }}>{item.label}</span>
                      <span style={{
                        fontWeight: 600, color: item.highlight || '#1e293b',
                        fontFamily: item.mono ? 'monospace' : 'inherit', fontSize: '12px',
                      }}>
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {order.note && (
              <div style={{ gridColumn: '1 / -1', border: '1px solid #fecaca', borderRadius: 8, padding: '8px 12px', background: '#fef2f2', fontSize: '12px', color: '#991b1b' }}>
                <strong>Ghi chú:</strong> {order.note}
              </div>
            )}
          </div>
          <button onClick={startEdit} style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 4, fontSize: '12px', color: '#6366f1', background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: 6, padding: '5px 14px', cursor: 'pointer', fontWeight: 500 }}>
            <Pencil size={13} /> Chỉnh sửa đơn hàng
          </button>
        </div>
      )}

      {/* Edit mode */}
      {open && editing && (
        <div style={{ marginTop: 8, border: '1px solid #c7d2fe', borderRadius: 8, padding: 12, background: '#faf5ff' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#6366f1', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Pencil size={13} /> Chỉnh sửa đơn hàng #{order.order_code}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {/* Trạng thái */}
            <div>
              <label style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: 2 }}>Trạng thái</label>
              <select value={form.status} onChange={e => setForm(p => ({ ...p, status: Number(e.target.value) }))} style={{ ...inputSx, fontFamily: 'inherit' }}>
                {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            {/* Loại proxy */}
            <div>
              <label style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: 2 }}>Loại proxy</label>
              <select value={form.proxy_type} onChange={e => setForm(p => ({ ...p, proxy_type: e.target.value }))} style={{ ...inputSx, fontFamily: 'inherit' }}>
                <option value='ROTATING'>ROTATING</option>
                <option value='STATIC'>STATIC</option>
              </select>
            </div>

            {/* Số lượng */}
            {[
              { key: 'quantity', label: 'Số lượng' },
              { key: 'delivered_quantity', label: 'Đã giao' },
              { key: 'time', label: 'Thời hạn (ngày)' },
              { key: 'retry', label: 'Retry' },
            ].map(f => (
              <div key={f.key}>
                <label style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: 2 }}>{f.label}</label>
                <input type='number' value={form[f.key] ?? ''} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} style={inputSx} />
              </div>
            ))}

            {/* Tài chính */}
            {[
              { key: 'price_per_unit', label: 'Giá bán/đơn vị' },
              { key: 'total_amount', label: 'Doanh thu' },
              { key: 'cost_price', label: 'Giá vốn/đơn vị' },
              { key: 'total_cost', label: 'Tổng vốn' },
              { key: 'refunded_amount', label: 'Đã hoàn tiền' },
              { key: 'affiliate_commission', label: 'Hoa hồng affiliate' },
            ].map(f => (
              <div key={f.key}>
                <label style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: 2 }}>{f.label}</label>
                <input type='number' value={form[f.key] ?? ''} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} style={inputSx} />
              </div>
            ))}

            {/* Thời gian */}
            <div>
              <label style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: 2 }}>Kích hoạt</label>
              <input type='datetime-local' value={form.buy_at ?? ''} onChange={e => setForm(p => ({ ...p, buy_at: e.target.value }))} style={inputSx} />
            </div>
            <div>
              <label style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: 2 }}>Hết hạn</label>
              <input type='datetime-local' value={form.expired_at ?? ''} onChange={e => setForm(p => ({ ...p, expired_at: e.target.value }))} style={inputSx} />
            </div>

            {/* Ghi chú — full width */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: 2 }}>Ghi chú</label>
              <textarea value={form.note ?? ''} onChange={e => setForm(p => ({ ...p, note: e.target.value }))} rows={2} style={{ ...inputSx, resize: 'vertical' }} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button onClick={saveEdit} disabled={updateOrder.isPending} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '12px', color: '#fff', background: updateOrder.isPending ? '#a5b4fc' : '#6366f1', border: 'none', borderRadius: 6, padding: '6px 16px', cursor: 'pointer', fontWeight: 600 }}>
              {updateOrder.isPending ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={13} />}
              {updateOrder.isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
            <button onClick={() => setEditing(false)} style={{ fontSize: '12px', color: '#64748b', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 6, padding: '6px 14px', cursor: 'pointer' }}>
              Huỷ
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/** Expandable row cho OrderItem — click row xem chi tiết bên dưới */
function ExpandableItemRow({ row, activeItemKey, onViewLogs }: { row: any; activeItemKey?: string | null; onViewLogs?: (key: string) => void }) {
  const [expanded, setExpanded] = useState(false)
  const item = row.original
  const colCount = row.getVisibleCells().length
  const itemKey = item.key || item.api_key
  const isViewing = activeItemKey === itemKey

  return (
    <>
      <tr
        style={{
          borderBottom: expanded ? 'none' : '1px solid #f1f5f9',
          cursor: 'pointer', transition: 'background 0.15s',
          background: isViewing ? '#eff6ff' : expanded ? '#f0f4ff' : undefined,
        }}
        onClick={(e) => {
          if ((e.target as HTMLElement).closest('input[type="checkbox"], button, select')) return
          // Luôn expand panel chi tiết (edit inline). Rotating + trigger view logs song song.
          setExpanded(!expanded)
          if (!expanded && item.type === 'ROTATING' && onViewLogs && itemKey) {
            onViewLogs(itemKey)
          }
        }}
        onMouseEnter={(e) => { if (!expanded && !isViewing) e.currentTarget.style.background = '#f8fafc' }}
        onMouseLeave={(e) => { if (!expanded && !isViewing) e.currentTarget.style.background = '' }}
      >
        {row.getVisibleCells().map((cell: any) => (
          <td key={cell.id} style={{ padding: '8px 10px' }}>
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </td>
        ))}
      </tr>
      {expanded && (
        <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
          <td colSpan={colCount} style={{ padding: 0 }}>
            <div style={{ borderLeft: '3px solid #818cf8', background: '#f8f9ff', padding: '8px 0 4px' }}>
              <div style={{ padding: '0 12px 6px', fontSize: '11px', fontWeight: 600, color: '#6366f1', display: 'flex', alignItems: 'center', gap: 6 }}>
                <ChevronDown size={12} style={{ transform: 'rotate(180deg)' }} />
                Chi tiết proxy — dữ liệu lưu trong hệ thống
              </div>
              <ItemDetailPanel item={item} />
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

/** Panel chi tiết OrderItem — bảng có nhóm, luôn hiện cột đối tác + inline edit per-field */
function ItemDetailPanel({ item }: { item: any }) {
  const [editField, setEditField] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const updateItem = useUpdateItem()

  // Chỉ các field này cho phép admin sửa inline
  const EDITABLE = new Set(['ip', 'port', 'user', 'pass', 'provider_key'])

  const startEdit = (field: string, currentVal: any) => {
    setEditField(field)
    setEditValue(currentVal == null ? '' : String(currentVal))
  }

  const cancelEdit = () => { setEditField(null); setEditValue('') }

  const saveEdit = () => {
    const key = item.key || item.api_key
    if (!key || !editField) return

    const px = item.proxy || item.proxys || {}
    const proxyParts = {
      ip:   px.ip   ?? '',
      port: px.port ?? '',
      user: px.user ?? '',
      pass: px.pass ?? '',
    }
    let providerKey = item.provider_key ?? ''

    if (['ip', 'port', 'user', 'pass'].includes(editField)) {
      (proxyParts as any)[editField] = editValue
    } else if (editField === 'provider_key') {
      providerKey = editValue
    }

    const proxyString = `${proxyParts.ip}:${proxyParts.port}:${proxyParts.user}:${proxyParts.pass}`

    updateItem.mutate(
      { itemKey: key, proxyString, providerKey },
      { onSuccess: cancelEdit }
    )
  }

  const origins: Record<string, string> = item.metadata?._field_origins || {}
  const proxy = item.proxy || item.proxys
  const sts = item.status === 0 ? 'Hoạt động' : item.status === 1 ? 'Đã tắt' : 'Hết hạn'

  const hasOrigins = Object.keys(origins).length > 0

  type R = { db: string; val: any; from?: string }

  const rows: R[] = []

  // Proxy fields
  if (proxy && typeof proxy === 'object') {
    for (const k of ['ip', 'port', 'user', 'pass', 'loaiproxy']) {
      if (proxy[k]) rows.push({ db: k, val: proxy[k], from: origins[k] })
    }
    Object.keys(proxy).filter(k => !['http','socks5','HTTP','SOCK5','ip','port','user','pass','loaiproxy'].includes(k)).forEach(k => {
      if (proxy[k]) rows.push({ db: k, val: proxy[k], from: origins[k] })
    })
  }

  // Metadata (bỏ _field_origins)
  if (item.metadata && typeof item.metadata === 'object') {
    Object.entries(item.metadata).forEach(([k, v]) => {
      if (k !== '_field_origins') rows.push({ db: k, val: v, from: origins[k] })
    })
  }

  // System + provider
  if (item.key) rows.push({ db: 'key', val: item.key })
  if (item.type) rows.push({ db: 'type', val: item.type })
  if (item.protocol) rows.push({ db: 'protocol', val: item.protocol.toUpperCase() })
  if (item.status != null) rows.push({ db: 'status', val: sts })
  if (item.buy_at) rows.push({ db: 'buy_at', val: formatDateTimeLocal(item.buy_at) })
  if (item.expired_at) rows.push({ db: 'expired_at', val: formatDateTimeLocal(item.expired_at) })
  if (item.provider_key) rows.push({ db: 'provider_key', val: item.provider_key, from: origins['api_key'] })
  if (item.provider_order_code) rows.push({ db: 'provider_order_code', val: item.provider_order_code })
  if (item.provider_item_id) rows.push({ db: 'provider_item_id', val: item.provider_item_id, from: origins['provider_item_id'] })

  // Root fields custom (từ response_mapping store=root) — hiện field có trong _field_origins nhưng chưa liệt kê ở trên
  const knownFields = new Set(rows.map(r => r.db))
  knownFields.add('_id').add('order_id').add('created_at').add('updated_at')
  Object.entries(origins).forEach(([sysField, nccField]) => {
    if (!knownFields.has(sysField) && item[sysField] != null) {
      rows.push({ db: sysField, val: item[sysField], from: nccField })
    }
  })

  const th: React.CSSProperties = { padding: '5px 10px', fontSize: '9px', fontWeight: 600, textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid #edf0f4' }

  return (
    <div style={{ borderTop: '1px solid #edf0f4', background: '#fff', overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#f7f9fb' }}>
            <th style={{ ...th, color: '#6b7280', width: '28%' }}>Field hệ thống</th>
            <th style={{ ...th, color: '#6b7280', width: '42%' }}>Giá trị</th>
            <th style={{ ...th, color: '#c9a87c', width: '22%' }}>Field đối tác</th>
            <th style={{ ...th, color: '#6b7280', width: '8%', textAlign: 'center' }}>Sửa</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const isEditing = editField === r.db
            const canEdit = EDITABLE.has(r.db)
            return (
              <tr key={`${r.db}-${i}`} style={{ background: isEditing ? '#eef2ff' : (i % 2 === 0 ? '#fff' : '#fafbfd') }}>
                <td style={{ padding: '5px 10px', fontSize: '12px', fontFamily: 'monospace', color: '#4a5568' }}>{r.db}</td>
                <td style={{ padding: '5px 10px', fontSize: '12px', fontFamily: 'monospace', fontWeight: 600, color: '#1a202c', overflow: 'hidden', maxWidth: 280 }} title={fmtValue(r.val)}>
                  {isEditing ? (
                    <input
                      value={editValue}
                      onChange={e => setEditValue(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') saveEdit()
                        if (e.key === 'Escape') cancelEdit()
                      }}
                      autoFocus
                      style={{ width: '100%', fontSize: '12px', fontFamily: 'monospace', padding: '3px 6px', border: '1px solid #6366f1', borderRadius: 4 }}
                    />
                  ) : (
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{fmtValue(r.val)}</span>
                  )}
                </td>
                <td style={{ padding: '5px 10px', fontSize: '12px', fontFamily: 'monospace', color: '#c9a87c' }}>{r.from || <span style={{ color: '#e2e5ea' }}>—</span>}</td>
                <td style={{ padding: '5px 6px', fontSize: '12px', textAlign: 'center' }}>
                  {isEditing ? (
                    <span style={{ display: 'inline-flex', gap: 4 }}>
                      <button
                        onClick={saveEdit}
                        disabled={updateItem.isPending}
                        style={{ fontSize: '11px', color: '#fff', background: updateItem.isPending ? '#a5b4fc' : '#6366f1', border: 'none', borderRadius: 4, padding: '3px 8px', cursor: 'pointer' }}
                        title='Lưu (Enter)'
                      >
                        <Save size={12} />
                      </button>
                      <button
                        onClick={cancelEdit}
                        style={{ fontSize: '11px', color: '#64748b', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 4, padding: '3px 6px', cursor: 'pointer' }}
                        title='Huỷ (Esc)'
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ) : canEdit ? (
                    <button
                      onClick={() => startEdit(r.db, r.val)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6366f1', padding: 2 }}
                      title={`Sửa ${r.db}`}
                    >
                      <Pencil size={13} />
                    </button>
                  ) : (
                    <span style={{ color: '#e2e5ea' }}>—</span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function OrderLogsTimeline({ logs, isLoading }: { logs: OrderLog[]; isLoading: boolean }) {
  const { isChild } = useBranding()
  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '30px 0' }}>
        <CircularProgress size={24} />
        <p style={{ color: '#64748b', fontSize: '13px', marginTop: 8 }}>Đang tải logs...</p>
      </div>
    )
  }

  if (logs.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '30px 0', background: '#f8fafc', borderRadius: 8, border: '1px solid #f1f5f9' }}>
        <FileText size={20} color='#94a3b8' />
        <p style={{ color: '#94a3b8', fontSize: '13px', marginTop: 8 }}>Chưa có log nào</p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {logs.map((log, i) => {
        const config = LOG_ACTION_CONFIG[log.action] || { icon: FileText, color: '#94a3b8', label: log.action }
        const Icon = config.icon
        const isLast = i === logs.length - 1
        const isError = log.action.includes('error') || log.action === 'failed'
        const isSuccess = log.action.includes('success') || log.action === 'in_use' || log.action === 'completed'

        return (
          <div key={log._id || i} style={{ display: 'flex', gap: 12, minHeight: 50 }}>
            {/* Timeline line + dot */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 28, flexShrink: 0 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: config.color + '18', border: `2px solid ${config.color}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
              }}>
                <Icon size={13} color={config.color} style={log.action.includes('processing') || log.action === 'retry' ? { animation: 'spin 1s linear infinite' } : undefined} />
              </div>
              {!isLast && (
                <div style={{ width: 2, flex: 1, background: '#e2e8f0', margin: '4px 0' }} />
              )}
            </div>

            {/* Content */}
            <div style={{ flex: 1, paddingBottom: isLast ? 0 : 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: config.color }}>
                    {config.label}
                  </span>
                  {log.from_status !== null && log.to_status !== null && (
                    <span style={{ fontSize: '11px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 3 }}>
                      {log.from_status} <ArrowRight size={10} /> {log.to_status}
                    </span>
                  )}
                  {log.duration_ms != null && (
                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                      {log.duration_ms}ms
                    </span>
                  )}
                </div>
                <span style={{ fontSize: '11px', color: '#94a3b8', flexShrink: 0 }}>
                  {log.created_at ? formatDateTimeLocal(log.created_at) : '-'}
                </span>
              </div>

              {log.message && (
                <div style={{
                  fontSize: '12px', color: isError ? '#dc2626' : '#64748b',
                  marginTop: 3, lineHeight: 1.4,
                  ...(isError ? { background: '#fef2f2', padding: '4px 8px', borderRadius: 4, border: '1px solid #fecaca' } : {})
                }}>
                  {log.message}
                </div>
              )}

              {!isChild && log.provider_code && (
                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: 2 }}>
                  NCC: <span style={{ fontWeight: 500, color: '#64748b' }}>{log.provider_code}</span>
                  {log.http_status && ` • HTTP ${log.http_status}`}
                  {log.retry_count != null && log.retry_count > 0 && ` • Retry #${log.retry_count}`}
                </div>
              )}

              {/* Request payload */}
              {(log.request_body || log.context?.request_params) && (
                <details style={{ marginTop: 6 }} open={isError}>
                  <summary style={{ fontSize: '11px', color: '#3b82f6', cursor: 'pointer', fontWeight: 500 }}>Request payload</summary>
                  <CodeBlock value={JSON.stringify(log.request_body || log.context?.request_params, null, 2)} color='#93c5fd' />
                </details>
              )}

              {/* Response body — luôn hiện khi có data */}
              {(log.response_body || log.context?.response) && (
                <details style={{ marginTop: 4 }} open={isError}>
                  <summary style={{ fontSize: '11px', color: isError ? '#ef4444' : '#22c55e', cursor: 'pointer', fontWeight: 500 }}>
                    Response {log.duration_ms ? `(${log.duration_ms}ms)` : ''}
                  </summary>
                  <CodeBlock value={log.response_body || log.context?.response} color={isError ? '#fca5a5' : '#86efac'} />
                </details>
              )}

              {/* Context debug — auth, headers, params, config keys */}
              {log.context && (() => {
                const { service_name, service_code, provider_name, provider_code, quantity, price_per_unit, total_amount, proxy_type, time_days, request_params, response, ...rest } = log.context
                if (Object.keys(rest).length === 0) return null
                return (
                  <details style={{ marginTop: 4 }} open={isError}>
                    <summary style={{ fontSize: '11px', color: isError ? '#f97316' : '#94a3b8', cursor: 'pointer', fontWeight: 500 }}>
                      Debug chi tiết
                    </summary>
                    <CodeBlock value={JSON.stringify(rest, null, 2)} color='#fbbf24' />
                  </details>
                )
              })()}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function AdminRenewalSection({ histories, order, viewLogId, onViewLog }: {
  histories: OrderHistoryItem[]; order: any; viewLogId?: number | null; onViewLog?: (id: number) => void
}) {
  const renewals = histories.filter(h => h.type === 'renewal')
  if (!renewals.length) return null

  const successCount = renewals.filter(h => h.status === 4 || h.status === 5).length
  const fmtVND = (v: number) => new Intl.NumberFormat('vi-VN').format(v) + 'đ'

  return (
    <div style={{ display: 'flex', gap: 0 }}>
      {/* Left: renewal list */}
      <div style={{ flex: viewLogId ? '0 0 55%' : '1 1 100%', padding: '0 20px 12px', transition: 'flex 0.2s', minWidth: 0 }}>
        <div style={{ fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
          <RefreshCw size={14} style={{ color: '#6366f1' }} />
          Lịch sử gia hạn ({renewals.length})
        </div>
        {renewals.map((h, i) => {
          const st = HISTORY_STATUS[h.status] ?? { label: '?', color: '#94a3b8' }
          const isFailed = h.status === 3
          const isPending = h.status === 0 || h.status === 1
          const isSuccess = h.status === 4 || h.status === 5
          const isPartial = h.status === 6
          const isViewing = viewLogId === h.id

          return (
            <div key={h.id} style={{
              padding: '10px 14px', borderRadius: 8, marginBottom: 6, cursor: 'pointer',
              background: isViewing ? '#f0f9ff' : isFailed ? '#fef2f2' : isPending ? '#eff6ff' : isPartial ? '#fff7ed' : '#f0fdf4',
              border: `1px solid ${isViewing ? '#93c5fd' : isFailed ? '#fecaca' : isPending ? '#bfdbfe' : isPartial ? '#fed7aa' : '#bbf7d0'}`,
            }} onClick={() => onViewLog?.(h.id)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {isPending && <Loader2 size={13} style={{ color: st.color, animation: 'spin 1s linear infinite' }} />}
                  <span style={{ fontSize: '12px', fontWeight: 600, color: st.color }}>{st.label}</span>
                  <span style={{ fontSize: '12px', color: '#374151' }}>
                    {h.duration} ngày • {fmtVND(h.amount)}
                  </span>
                  {h.cost_amount != null && (
                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>Vốn: {fmtVND(h.cost_amount)}</span>
                  )}
                </div>
                <div style={{ fontSize: '11px', color: '#94a3b8', textAlign: 'right' }}>
                  <div>{h.created_at ? formatDateTimeLocal(h.created_at) : ''}</div>
                  {h.updated_at && h.updated_at !== h.created_at && (
                    <div>Cập nhật: {formatDateTimeLocal(h.updated_at)}</div>
                  )}
                </div>
              </div>

              {isSuccess && h.new_expired_at && (
                <div style={{ fontSize: '12px', color: '#16a34a', marginTop: 4 }}>
                  HH mới: {formatDateTimeLocal(h.new_expired_at)}
                </div>
              )}

              <RenewalProgress metadata={h.metadata} status={h.status} />

              {isFailed && h.note && (
                <div style={{ fontSize: '12px', color: '#dc2626', marginTop: 4, background: '#fee2e2', padding: '4px 8px', borderRadius: 4 }}>
                  {h.note}
                </div>
              )}
            </div>
          )
        })}

        {successCount > 0 && (
          <div style={{ fontSize: '11px', color: '#64748b', padding: '2px 4px' }}>
            Tổng: {successCount} lần gia hạn thành công
          </div>
        )}
      </div>

      {/* Right: log panel — slide in */}
      {viewLogId && (
        <div style={{
          flex: '0 0 48%', borderLeft: '1px solid #e2e8f0',
          overflowY: 'auto', padding: '12px 16px',
          animation: 'slideInRight 0.2s ease-out',
        }}>
          <style>{`@keyframes slideInRight { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }`}</style>
          <AdminHistoryLogPanel historyId={viewLogId} />
        </div>
      )}
    </div>
  )
}

/** Admin: log chi tiết per history */
function AdminHistoryLogPanel({ historyId }: { historyId: number }) {
  const { isChild } = useBranding()
  const { data: logs, isLoading } = useOrderHistoryLogs(historyId)

  if (isLoading) return <div style={{ fontSize: '11px', color: '#94a3b8' }}>Loading...</div>
  if (!logs?.length) return <div style={{ fontSize: '11px', color: '#cbd5e1' }}>Chưa có log</div>

  const ACTION_LABELS: Record<string, { label: string; color: string }> = {
    api_call_success: { label: 'OK', color: '#16a34a' },
    api_call_error: { label: 'Lỗi', color: '#dc2626' },
    api_call_timeout: { label: 'Timeout', color: '#f59e0b' },
    circuit_break: { label: 'CB', color: '#ea580c' },
    summary: { label: 'Tổng', color: '#2563eb' },
  }

  return (
    <div>
      <div style={{ fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: 8 }}>Log chi tiết</div>
      {logs.map((log: HistoryLogItem, i: number) => {
        const action = ACTION_LABELS[log.action] ?? { label: log.action, color: '#94a3b8' }
        const isError = log.action.includes('error') || log.action === 'api_call_timeout'
        const ctx = log.context || {}

        return (
          <div key={i} style={{ padding: '8px 0', borderBottom: '1px solid #f1f5f9', fontSize: '11px' }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ color: '#94a3b8', fontFamily: 'monospace', width: 55, flexShrink: 0 }}>
                {log.created_at ? new Date(log.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : ''}
              </span>
              <span style={{ color: action.color, fontWeight: 600, flexShrink: 0 }}>{action.label}</span>
              {log.status_code != null && (
                <span style={{ color: log.status_code >= 400 ? '#dc2626' : '#16a34a', fontSize: '10px' }}>HTTP {log.status_code}</span>
              )}
              {log.duration_ms != null && (
                <span style={{ color: '#94a3b8', flexShrink: 0 }}>{log.duration_ms}ms</span>
              )}
              {log.item_key && (
                <span style={{ color: '#6366f1', fontFamily: 'monospace', fontSize: '10px' }}>{log.item_key}</span>
              )}
            </div>

            {/* Method + URL */}
            {ctx.method && (
              <div style={{ color: '#3b82f6', marginTop: 3, fontFamily: 'monospace', fontSize: '10px', wordBreak: 'break-all' }}>
                {ctx.method} {ctx.url}
              </div>
            )}

            {/* Message */}
            <div style={{
              color: isError ? '#dc2626' : '#64748b', marginTop: 2, wordBreak: 'break-all',
              ...(isError ? { background: '#fef2f2', padding: '3px 6px', borderRadius: 3 } : {})
            }}>
              {log.message?.replace(/\[.*?\/renew\]\s*/, '')}
            </div>

            {/* Request payload */}
            {log.request && (
              <details style={{ marginTop: 4 }} open={isError}>
                <summary style={{ fontSize: '11px', color: '#3b82f6', cursor: 'pointer', fontWeight: 500 }}>Request</summary>
                <CodeBlock value={JSON.stringify(log.request, null, 2)} color='#93c5fd' />
              </details>
            )}

            {/* Response */}
            {log.response && (
              <details style={{ marginTop: 3 }} open={isError}>
                <summary style={{ fontSize: '11px', color: isError ? '#ef4444' : '#22c55e', cursor: 'pointer', fontWeight: 500 }}>Response</summary>
                <CodeBlock value={log.response} color={isError ? '#fca5a5' : '#86efac'} />
              </details>
            )}

            {/* Headers */}
            {ctx.headers && (
              <details style={{ marginTop: 3 }}>
                <summary style={{ fontSize: '11px', color: '#94a3b8', cursor: 'pointer', fontWeight: 500 }}>Headers</summary>
                <CodeBlock value={JSON.stringify(ctx.headers, null, 2)} color='#fbbf24' />
              </details>
            )}
          </div>
        )
      })}
    </div>
  )
}

const HISTORY_STATUS: Record<number, { label: string; color: string }> = {
  0: { label: 'Đang chờ', color: '#f59e0b' },
  1: { label: 'Đang xử lý', color: '#3b82f6' },
  3: { label: 'Thất bại', color: '#ef4444' },
  4: { label: 'Đang sử dụng', color: '#22c55e' },
  5: { label: 'Hết hạn', color: '#94a3b8' },
  6: { label: 'Hoàn thành 1 phần', color: '#f97316' },
}

function RenewalProgress({ metadata, status }: { metadata?: any; status: number }) {
  const total = metadata?.total
  const success = metadata?.success ?? 0
  const failed = metadata?.failed ?? 0
  const processed = success + failed

  if (!total || total <= 1) return null

  const isProcessing = status === 0 || status === 1
  const isPartial = status === 6
  if (!isProcessing && !isPartial) return null

  const pct = Math.round((processed / total) * 100)

  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '11px', color: '#64748b' }}>
        <span>{success}/{total} thành công</span>
        {failed > 0 && <span style={{ color: '#ef4444' }}>{failed} lỗi</span>}
        <span>{pct}%</span>
      </div>
      <div style={{ height: 4, background: '#e5e7eb', borderRadius: 2, marginTop: 3, overflow: 'hidden' }}>
        <div style={{
          height: '100%', borderRadius: 2, transition: 'width 0.3s',
          width: `${pct}%`,
          background: failed > 0 ? '#f97316' : '#22c55e',
        }} />
      </div>
    </div>
  )
}

const HISTORY_TYPE_LABEL: Record<string, string> = {
  buy: 'Mua',
  renewal: 'Gia hạn',
  refund_renewal: 'Hoàn tiền GH',
}

function HistoryTimeline({ histories, isLoading, isAdmin = false }: { histories: OrderHistoryItem[]; isLoading: boolean; isAdmin?: boolean }) {
  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '30px 0' }}>
        <CircularProgress size={24} />
        <p style={{ color: '#64748b', fontSize: '13px', marginTop: 8 }}>Đang tải...</p>
      </div>
    )
  }

  if (histories.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '30px 0', background: '#f8fafc', borderRadius: 8, border: '1px solid #f1f5f9' }}>
        <p style={{ color: '#94a3b8', fontSize: '13px' }}>Chưa có lịch sử gia hạn</p>
      </div>
    )
  }

  const formatVND = (v: number) => new Intl.NumberFormat('vi-VN').format(v) + 'đ'
  const isPending = (s: number) => s === 0 || s === 1

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {histories.map((h, i) => {
        const status = HISTORY_STATUS[h.status] ?? { label: '?', color: '#94a3b8' }
        const typeLabel = HISTORY_TYPE_LABEL[h.type] ?? h.type
        const isRetried = isAdmin && h.metadata?.admin_retry

        return (
          <div key={h.id} style={{
            padding: '12px 14px', borderRadius: 8,
            border: `1px solid ${h.status === 3 ? '#fecaca' : isPending(h.status) ? '#bfdbfe' : '#e2e8f0'}`,
            background: h.status === 3 ? '#fef2f2' : isPending(h.status) ? '#eff6ff' : '#fff',
          }}>
            {/* Header: status + type + duration + time */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>
                  Lần {histories.length - i}
                </span>
                <span style={{
                  fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: 12,
                  background: status.color + '18', color: status.color,
                  display: 'flex', alignItems: 'center', gap: 4,
                }}>
                  {isPending(h.status) && <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} />}
                  {status.label}
                </span>
                {isRetried && (
                  <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: 8, background: '#f3e8ff', color: '#7c3aed' }}>
                    Admin retry
                  </span>
                )}
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8', textAlign: 'right' }}>
                <div>{h.created_at ? formatDateTimeLocal(h.created_at) : '—'}</div>
                {h.updated_at && h.updated_at !== h.created_at && (
                  <div>Cập nhật: {formatDateTimeLocal(h.updated_at)}</div>
                )}
              </div>
            </div>

            {/* Info: amount, duration, expired dates */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 8, fontSize: '12px' }}>
              <span style={{ color: '#374151' }}>
                <strong>{formatVND(h.amount)}</strong> • {h.duration} ngày
              </span>
              {isAdmin && h.cost_amount != null && (
                <span style={{ color: '#94a3b8' }}>Vốn: {formatVND(h.cost_amount)}</span>
              )}
              {h.old_expired_at && (
                <span style={{ color: '#94a3b8' }}>
                  HH cũ: {formatDateTimeLocal(h.old_expired_at)}
                </span>
              )}
              {h.new_expired_at && (
                <span style={{ color: '#22c55e', fontWeight: 500 }}>
                  HH mới: {formatDateTimeLocal(h.new_expired_at)}
                </span>
              )}
            </div>

            {/* Progress bar cho by_item */}
            <RenewalProgress metadata={h.metadata} status={h.status} />

            {/* Note — lỗi hoặc ghi chú */}
            {h.note && (
              <div style={{
                marginTop: 6, fontSize: '12px', color: h.status === 3 ? '#dc2626' : '#64748b',
                ...(h.status === 3 ? { background: '#fee2e2', padding: '4px 8px', borderRadius: 4 } : {})
              }}>
                {h.note}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export { HistoryTimeline }

const navBtnStyle = (disabled: boolean): React.CSSProperties => ({
  padding: '4px 12px', fontSize: '12px',
  background: '#fff', border: '1px solid #e2e8f0', borderRadius: 6,
  cursor: disabled ? 'not-allowed' : 'pointer',
  opacity: disabled ? 0.5 : 1, color: '#374151'
})

// ====== Item Rotate Log Panel ======

const ITEM_LOG_ACTION: Record<string, { label: string; color: string }> = {
  rotate_success: { label: 'OK', color: '#16a34a' },
  rotate_error: { label: 'Lỗi', color: '#dc2626' },
  rotate_timeout: { label: 'Timeout', color: '#f59e0b' },
  no_provider: { label: 'No NCC', color: '#ea580c' },
  paused: { label: 'Tạm dừng', color: '#7c3aed' },
}

function ItemLogPanel({ itemKey }: { itemKey: string }) {
  const { isChild } = useBranding()
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
              {log.duration_ms != null && (
                <span style={{ color: '#94a3b8', flexShrink: 0 }}>{log.duration_ms}ms</span>
              )}
              {!isChild && log.provider_code && (
                <span style={{ color: '#8b5cf6', fontSize: '10px' }}>{log.provider_code}</span>
              )}
            </div>

            <div style={{
              color: isError ? '#dc2626' : '#64748b', marginTop: 2, wordBreak: 'break-all',
              ...(isError ? { background: '#fef2f2', padding: '3px 6px', borderRadius: 3 } : {})
            }}>
              {log.message}
            </div>

            {log.request && (
              <details style={{ marginTop: 3 }}>
                <summary style={{ fontSize: '11px', color: '#3b82f6', cursor: 'pointer', fontWeight: 500 }}>Request payload</summary>
                {log.request.url && (
                  <div style={{ fontSize: '10px', color: '#6366f1', fontFamily: 'monospace', padding: '3px 6px', background: '#eef2ff', borderRadius: 3, marginTop: 2, wordBreak: 'break-all' }}>
                    {log.request.method || 'GET'} {log.request.url}
                  </div>
                )}
                {log.request.params && (
                  <CodeBlock value={typeof log.request.params === 'string' ? log.request.params : JSON.stringify(log.request.params, null, 2)} color='#93c5fd' />
                )}
              </details>
            )}

            {log.response && (
              <details style={{ marginTop: 3 }} open={isError}>
                <summary style={{ fontSize: '11px', color: isError ? '#ef4444' : '#22c55e', cursor: 'pointer', fontWeight: 500 }}>Response{log.status_code ? ` (${log.status_code})` : ''}</summary>
                <CodeBlock value={log.response} color={isError ? '#fca5a5' : '#86efac'} />
              </details>
            )}
          </div>
        )
      })}
    </div>
  )
}

function UnlockButton({ itemKey }: { itemKey: string }) {
  const unlock = useUnlockRotate()

  return (
    <button
      onClick={() => unlock.mutate(itemKey)}
      disabled={unlock.isPending}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 3,
        padding: '3px 10px', fontSize: '10px', fontWeight: 600, borderRadius: 5,
        border: '1px solid #f59e0b', background: unlock.isSuccess ? '#dcfce7' : '#fffbeb',
        color: unlock.isSuccess ? '#16a34a' : '#b45309',
        cursor: unlock.isPending ? 'wait' : 'pointer',
      }}
    >
      <RefreshCw size={10} />
      {unlock.isPending ? 'Đang gỡ...' : unlock.isSuccess ? 'Đã gỡ' : 'Gỡ lock'}
    </button>
  )
}
