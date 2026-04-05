'use client'

import { useCallback, useMemo, useState } from 'react'

import Image from 'next/image'
import { useSearchParams } from 'next/navigation'

import { useBranding } from '@/app/contexts/BrandingContext'
import { useQueryClient } from '@tanstack/react-query'

import {
  CheckCircle,
  Clock3,
  DollarSign,
  Eye,
  List,
  Loader2,
  Package,
  PlusCircle,
  RefreshCw,
  RotateCcw,
  Search,
  ShoppingCart,
  TrendingUp,
  X,
  XCircle
} from 'lucide-react'

import { flexRender, getCoreRowModel, getPaginationRowModel, useReactTable } from '@tanstack/react-table'

import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import Grid2 from '@mui/material/Grid2'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import MenuItem from '@mui/material/MenuItem'
import Pagination from '@mui/material/Pagination'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'

import { toast } from 'react-toastify'

import CustomTextField from '@/@core/components/mui/TextField'

import { formatDateTimeLocal } from '@/utils/formatDate'

import useAxiosAuth from '@/hocs/useAxiosAuth'
import { useAdminOrders } from '@/hooks/apis/useOrderReport'
import { useCancelOrder, useResendOrder } from '@/hooks/apis/useOrders'
import { useProviders } from '@/hooks/apis/useProviders'
import { useOrderConfirm } from '@/hooks/apis/useRenewal'
import { useRefundPartial, useRetryOrder, useRetryPartial, useRetryFetch } from '@/hooks/apis/useTickets'
import FillProxiesDialog from '@/views/Client/Admin/Orders/FillProxiesDialog'
import OrderDetailModal from '@/views/Client/Admin/TransactionHistory/OrderDetailModal'
import CancelRefundDialog from './CancelRefundDialog'
import ResendDialog from './ResendDialog'
import RetryDialog from './RetryDialog'
import RetryFailedOrderDialog from './RetryFailedOrderDialog'
import RenewalRetryDialog from './RenewalRetryDialog'

const formatVND = (value: any) => new Intl.NumberFormat('vi-VN').format(Number(value) || 0) + 'đ'

const STATUS_CONFIG: Record<number, { label: string; color: string }> = {
  0: { label: 'Chờ xử lý', color: '#94A3B8' },
  1: { label: 'Đang xử lý', color: '#3B82F6' },
  2: { label: 'Đang dùng', color: '#22C55E' },
  3: { label: 'Thiếu proxy', color: '#F59E0B' },
  4: { label: 'Hết hạn', color: '#6366F1' },
  5: { label: 'Thất bại', color: '#EF4444' },
  6: { label: 'Hoàn 1 phần', color: '#F97316' },
  7: { label: 'Chờ hoàn tiền', color: '#A855F7' },
  8: { label: 'Đã hoàn toàn bộ', color: '#EC4899' },
  9: { label: 'Đang mua bù', color: '#14B8A6' },
  10: { label: 'Chờ nhà cung cấp', color: '#0EA5E9' },
  11: { label: 'Đang gia hạn', color: '#6366F1' },
  12: { label: 'Gia hạn lỗi', color: '#DC2626' }
}

function StatCard({
  title,
  value,
  icon: Icon,
  color
}: {
  title: string
  value: string | number
  icon: any
  color: string
}) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: { xs: 1, sm: 2 },
          py: { xs: 1.5, sm: 2 },
          px: { xs: 1.5, sm: 2 },
          '&:last-child': { pb: { xs: 1.5, sm: 2 } }
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            backgroundColor: color + '20',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}
        >
          <Icon size={18} color={color} />
        </div>
        <div style={{ minWidth: 0 }}>
          <Typography
            sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' }, color: 'text.secondary', whiteSpace: 'nowrap' }}
          >
            {title}
          </Typography>
          <Typography sx={{ fontSize: { xs: '0.85rem', sm: '1.1rem' }, fontWeight: 600, whiteSpace: 'nowrap' }}>
            {value}
          </Typography>
        </div>
      </CardContent>
    </Card>
  )
}

function toInputDate(ddmmyyyy: string) {
  const [d, m, y] = ddmmyyyy.split('-')

  return `${y}-${m}-${d}`
}

function fromInputDate(yyyymmdd: string) {
  const [y, m, d] = yyyymmdd.split('-')

  return `${d}-${m}-${y}`
}

function getDefaults() {
  const now = new Date()
  const start = new Date(now)

  start.setDate(start.getDate() - 30)

  const fmt = (d: Date) =>
    `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`

  return { start: fmt(start), end: fmt(now) }
}

const inputSx = {
  '& .MuiOutlinedInput-root': { fontSize: '13px', borderRadius: '8px', minHeight: '36px' },
  '& .MuiSelect-select': { paddingBlock: '7px' }
}

export default function AdminOrdersPage() {
  const queryClient = useQueryClient()
  const branding = useBranding()
  const isChild = branding.siteMode === 'child'
  const defaults = useMemo(() => getDefaults(), [])

  // Staged filter inputs
  const searchParams = useSearchParams()
  const urlSearch = searchParams.get('search') || ''
  const [searchInput, setSearchInput] = useState(urlSearch)
  const [startInput, setStartInput] = useState(toInputDate(defaults.start))
  const [endInput, setEndInput] = useState(toInputDate(defaults.end))
  const [statusInput, setStatusInput] = useState<string>('')
  const [providerInput, setProviderInput] = useState<string>('')
  const [orderTypeInput, setOrderTypeInput] = useState<string>('')

  // Applied filters
  const [searchQuery, setSearchQuery] = useState(urlSearch)
  const [startDate, setStartDate] = useState(defaults.start)
  const [endDate, setEndDate] = useState(defaults.end)
  const [statusFilter, setStatusFilter] = useState<number | null>(null)
  const [providerFilter, setProviderFilter] = useState<number | null>(null)
  const [orderTypeFilter, setOrderTypeFilter] = useState<number | null>(null)
  const [displayPerPage, setDisplayPerPage] = useState(20)
  const [apiLimit, setApiLimit] = useState(100)
  const [apiLimitInput, setApiLimitInput] = useState('100')
  const [sortBy, setSortBy] = useState<string>('created_at')
  const [sortOrder, setSortOrder] = useState<string>('desc')

  // Modals - dùng chung cho cả 2 tab
  const [orderDetailOpen, setOrderDetailOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<any>(null)
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [orderToCancel, setOrderToCancel] = useState<any>(null)
  const [resendDialogOpen, setResendDialogOpen] = useState(false)
  const [orderToResend, setOrderToResend] = useState<any>(null)

  // Partial orders state
  const [retryOrder, setRetryOrder] = useState<any>(null)
  const [retryFailedOrder, setRetryFailedOrder] = useState<any>(null)
  const [refundOrder, setRefundOrder] = useState<any>(null)
  const [fillProxiesOrder, setFillProxiesOrder] = useState<any>(null)
  const [retryFetchOrder, setRetryFetchOrder] = useState<any>(null)

  // Confirm order state (timeout orders)
  const [confirmOrder, setConfirmOrder] = useState<any>(null)
  const [confirmProviderCode, setConfirmProviderCode] = useState('')
  const orderConfirmMutation = useOrderConfirm()

  // Renewal state
  const [renewalRetryOrder, setRenewalRetryOrder] = useState<any>(null)
  const [renewalDismissOrder, setRenewalDismissOrder] = useState<any>(null)
  const [renewalLoading, setRenewalLoading] = useState(false)

  // Data - Tab 0
  const {
    data: ordersData,
    isLoading,
    isFetching
  } = useAdminOrders(
    {
      start: startDate,
      end: endDate,
      page: 1,
      per_page: apiLimit,
      status: statusFilter,
      provider_id: providerFilter,
      order_type: orderTypeFilter,
      sort_by: sortBy,
      sort_order: sortOrder,
      search: searchQuery || undefined
    },
    true
  )

  const retryMutation = useRetryPartial()
  const retryFailedMutation = useRetryOrder()
  const retryFetchMutation = useRetryFetch()
  const refundMutation = useRefundPartial()

  const { data: providers = [] } = useProviders()
  const cancelMutation = useCancelOrder()
  const resendMutation = useResendOrder()

  const allOrders = useMemo(() => ordersData?.orders ?? [], [ordersData?.orders])

  // Client-side search filter (mã đơn, user)
  const orders = useMemo(() => {
    if (!searchQuery) return allOrders
    const q = searchQuery.toLowerCase()

    return allOrders.filter(
      (o: any) => o.order_code?.toLowerCase().includes(q) || o.user_name?.toLowerCase().includes(q)
    )
  }, [allOrders, searchQuery])

  const serverPagination = ordersData?.pagination ?? { current_page: 1, total: 0, per_page: 100, last_page: 1 }

  // Helper tính summary từ mảng orders (dùng Number() để tránh string concatenation)
  const calcFromOrders = useCallback(
    (arr: any[]) => ({
      total_orders: arr.length,
      total_amount: arr.reduce((s, o) => s + (Number(o.total_amount) || 0), 0),
      total_cost: arr.reduce((s, o) => s + (Number(o.total_cost) || 0), 0),
      profit: arr.reduce((s, o) => s + ((Number(o.total_amount) || 0) - (Number(o.total_cost) || 0)), 0)
    }),
    []
  )

  // Summary: BE aggregate ưu tiên, fallback sang tính từ loaded orders nếu BE thiếu field
  const summary = useMemo(() => {
    if (searchQuery) return calcFromOrders(orders)

    const s = ordersData?.summary

    if (!s) return { ...calcFromOrders(allOrders), total_orders: serverPagination.total || allOrders.length }

    const localFallback = calcFromOrders(allOrders)

    return {
      total_orders: Number(s.total_orders) || serverPagination.total || allOrders.length,
      total_amount: s.total_amount != null ? Number(s.total_amount) : localFallback.total_amount,
      total_cost: s.total_cost != null ? Number(s.total_cost) : localFallback.total_cost,
      profit: s.profit != null ? Number(s.profit) : localFallback.profit
    }
  }, [searchQuery, orders, ordersData?.summary, allOrders, serverPagination.total, calcFromOrders])

  // Handlers
  const handleApplyFilters = useCallback(() => {
    setStartDate(fromInputDate(startInput))
    setEndDate(fromInputDate(endInput))
    setStatusFilter(statusInput !== '' ? Number(statusInput) : null)
    setProviderFilter(providerInput !== '' ? Number(providerInput) : null)
    setOrderTypeFilter(orderTypeInput !== '' ? Number(orderTypeInput) : null)
    setSearchQuery(searchInput.trim())

    // Invalidate cache để luôn fetch data mới nhất khi click Tìm kiếm
    queryClient.invalidateQueries({ queryKey: ['adminOrders'] })
  }, [startInput, endInput, statusInput, providerInput, orderTypeInput, searchInput, queryClient])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') handleApplyFilters()
    },
    [handleApplyFilters]
  )

  const handleOpenDetail = useCallback((order: any) => {
    setSelectedOrder({ order })
    setOrderDetailOpen(true)
  }, [])

  const [cancelRefundType, setCancelRefundType] = useState<'full' | 'partial'>('full')
  const [cancelRefundAmount, setCancelRefundAmount] = useState('')

  const handleOpenCancel = useCallback((order: any) => {
    setOrderToCancel(order)
    setCancelRefundType('full')
    setCancelRefundAmount(String(order?.total_amount ?? 0))
    setCancelDialogOpen(true)
  }, [])

  const handleConfirmCancel = useCallback(() => {
    if (!orderToCancel) return
    const amount = cancelRefundType === 'partial' ? parseInt(cancelRefundAmount) || 0 : undefined
    cancelMutation.mutate({ orderId: orderToCancel.id, refundAmount: amount } as any, {
      onSuccess: (data: any) => {
        setCancelDialogOpen(false)
        setOrderToCancel(null)
        toast.success(data?.message || 'Hủy đơn + hoàn tiền thành công')
      },
      onError: (error: any) => {
        setCancelDialogOpen(false)
        setOrderToCancel(null)
        toast.error(error?.response?.data?.message || 'Có lỗi xảy ra')
      }
    })
  }, [orderToCancel, cancelMutation])

  const handleOpenResend = useCallback((order: any) => {
    setOrderToResend(order)
    setResendDialogOpen(true)
  }, [])

  const handleConfirmResend = useCallback(() => {
    if (!orderToResend) return
    resendMutation.mutate(orderToResend.id, {
      onSuccess: (data: any) => {
        setResendDialogOpen(false)
        setOrderToResend(null)
        toast.success(data?.message || 'Gửi lại đơn thành công')
      },
      onError: (error: any) => {
        setResendDialogOpen(false)
        setOrderToResend(null)
        toast.error(error?.response?.data?.message || 'Có lỗi xảy ra')
      }
    })
  }, [orderToResend, resendMutation])

  const handleToggleSort = useCallback(
    (column: string) => {
      if (sortBy === column) {
        setSortOrder(prev => (prev === 'desc' ? 'asc' : 'desc'))
      } else {
        setSortBy(column)
        setSortOrder('desc')
      }
    },
    [sortBy]
  )

  // Partial orders handlers
  const handleRetry = useCallback(() => {
    if (!retryOrder) return
    retryMutation.mutate(retryOrder.id, {
      onSuccess: (data: any) => {
        setRetryOrder(null)
        toast.success(data?.message || 'Đã đẩy đơn vào queue mua bù!')
      },
      onError: (error: any) => {
        setRetryOrder(null)
        toast.error(error?.response?.data?.message || 'Có lỗi xảy ra')
      }
    })
  }, [retryOrder, retryMutation])

  const axiosAuth = useAxiosAuth()

  const handleConfirmRenewalRetry = useCallback(async () => {
    if (!renewalRetryOrder) return
    setRenewalLoading(true)
    try {
      const res = await axiosAuth.post('/admin/renewal-retry', { order_id: renewalRetryOrder.id })
      setRenewalRetryOrder(null)
      toast.success(res?.data?.message || 'Đã retry gia hạn!')
      queryClient.invalidateQueries({ queryKey: ['adminOrders'] })
    } catch (err: any) {
      setRenewalRetryOrder(null)
      toast.error(err?.response?.data?.message || 'Lỗi retry gia hạn')
    } finally {
      setRenewalLoading(false)
    }
  }, [renewalRetryOrder, axiosAuth, queryClient])

  const handleConfirmRenewalDismiss = useCallback(async () => {
    if (!renewalDismissOrder) return
    setRenewalLoading(true)
    try {
      const res = await axiosAuth.post('/admin/renewal-dismiss', { order_id: renewalDismissOrder.id })
      setRenewalDismissOrder(null)
      toast.success(res?.data?.message || 'Đã bỏ qua gia hạn lỗi.')
      queryClient.invalidateQueries({ queryKey: ['adminOrders'] })
    } catch (err: any) {
      setRenewalDismissOrder(null)
      toast.error(err?.response?.data?.message || 'Lỗi')
    } finally {
      setRenewalLoading(false)
    }
  }, [renewalDismissOrder, axiosAuth, queryClient])

  const handleRefund = useCallback(() => {
    if (!refundOrder) return
    refundMutation.mutate(refundOrder.id, {
      onSuccess: (data: any) => {
        setRefundOrder(null)
        toast.success(data?.message || 'Hoàn tiền thành công!')
      },
      onError: (error: any) => {
        setRefundOrder(null)
        toast.error(error?.response?.data?.message || 'Có lỗi xảy ra')
      }
    })
  }, [refundOrder, refundMutation])

  // Tab 0: Tất cả đơn hàng columns
  const columns = useMemo(
    () => [
      {
        header: 'Thao tác',
        id: 'actions',
        size: 110,
        cell: ({ row }: { row: any }) => {
          const order = row.original
          const status = order.status

          return (
            <div className='flex gap-1' style={{ whiteSpace: 'nowrap' }}>
              <Tooltip title='Chi tiết'>
                <IconButton size='small' color='primary' onClick={() => handleOpenDetail(order)}>
                  <Eye size={16} />
                </IconButton>
              </Tooltip>
              {[0, 1, 5, 10].includes(status) && (status !== 1 || order.retry >= (order.max_retry ?? 3)) && (
                <Tooltip title='Hủy + hoàn tiền'>
                  <IconButton size='small' color='error' onClick={() => handleOpenCancel(order)}>
                    <XCircle size={16} />
                  </IconButton>
                </Tooltip>
              )}
              {status === 5 && (
                <Tooltip title='Thử lại đơn hàng'>
                  <IconButton size='small' color='warning' onClick={() => setRetryFailedOrder(order)}>
                    <RotateCcw size={16} />
                  </IconButton>
                </Tooltip>
              )}
              {status === 1 && order.retry >= (order.max_retry ?? 3) && (
                <>
                  <Tooltip title='Xác nhận NCC đã xử lý OK'>
                    <IconButton
                      size='small'
                      color='success'
                      onClick={() => {
                        setConfirmOrder(order)
                        setConfirmProviderCode('')
                      }}
                    >
                      <CheckCircle size={16} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title='Thêm thủ công'>
                    <IconButton size='small' color='primary' onClick={() => setFillProxiesOrder(order)}>
                      <PlusCircle size={16} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title='Thử lại đơn hàng'>
                    <IconButton size='small' color='warning' onClick={() => setRetryFailedOrder(order)}>
                      <RotateCcw size={16} />
                    </IconButton>
                  </Tooltip>
                </>
              )}
              {status === 3 && (
                <>
                  <Tooltip title='Mua bù (retry)'>
                    <IconButton size='small' color='success' onClick={() => setRetryOrder(order)}>
                      <RefreshCw size={16} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title='Hoàn tiền phần thiếu'>
                    <IconButton size='small' color='warning' onClick={() => setRefundOrder(order)}>
                      <DollarSign size={16} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title='Thêm thủ công'>
                    <IconButton size='small' color='primary' onClick={() => setFillProxiesOrder(order)}>
                      <PlusCircle size={16} />
                    </IconButton>
                  </Tooltip>
                </>
              )}
              {status === 10 && (
                <>
                  <Tooltip title='Retry fetch order-items'>
                    <IconButton size='small' color='warning' onClick={() => setRetryFetchOrder(order)}>
                      <RefreshCw size={16} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title='Thêm thủ công'>
                    <IconButton size='small' color='primary' onClick={() => setFillProxiesOrder(order)}>
                      <PlusCircle size={16} />
                    </IconButton>
                  </Tooltip>
                </>
              )}
              {status === 12 && (
                <>
                  <Tooltip title='Retry gia hạn'>
                    <IconButton size='small' color='warning' onClick={() => setRenewalRetryOrder(order)}>
                      <RotateCcw size={16} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title='Bỏ qua (khôi phục trạng thái cũ)'>
                    <IconButton size='small' color='default' onClick={() => setRenewalDismissOrder(order)}>
                      <XCircle size={16} />
                    </IconButton>
                  </Tooltip>
                </>
              )}
            </div>
          )
        }
      },
      {
        accessorKey: 'id',
        header: () => (
          <span
            onClick={() => handleToggleSort('id')}
            style={{ cursor: 'pointer', userSelect: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}
          >
            Thông tin đơn hàng
            {sortBy === 'id' && <span style={{ fontSize: '11px' }}>{sortOrder === 'desc' ? '▼' : '▲'}</span>}
          </span>
        ),
        minSize: 190,
        cell: ({ row }: { row: any }) => {
          const o = row.original

          return (
            <div style={{ lineHeight: 1.5 }}>
              <div style={{ fontWeight: 600, fontSize: '12px' }}>{o.order_code}</div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>
                <span style={{ fontWeight: 500 }}>KH:</span> {o.user_name || '-'}
              </div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>
                <span style={{ fontWeight: 500 }}>SP:</span> {o.service_name || '-'}
                {o.service_code && (
                  <span style={{ color: '#94a3b8', fontFamily: 'monospace' }}>
                    {' '}
                    #{o.service_id}·{o.service_code}
                  </span>
                )}
              </div>
              {!isChild && o.provider_name && (
                <div style={{ fontSize: '10px', color: '#94a3b8' }}>NCC: {o.provider_name}</div>
              )}
            </div>
          )
        }
      },
      {
        header: 'Tình trạng',
        minSize: 120,
        cell: ({ row }: { row: any }) => {
          const {
            status,
            retry,
            max_retry: maxRetry = 3,
            is_locked,
            delivered_quantity: delivered = 0,
            quantity: total = 0
          } = row.original
          const config = STATUS_CONFIG[status] || { label: `#${status}`, color: '#94A3B8' }
          const isMissing = delivered > 0 && delivered < total

          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Chip
                label={config.label}
                size='small'
                sx={{
                  backgroundColor: config.color + '18',
                  color: config.color,
                  fontWeight: 600,
                  fontSize: '11px',
                  width: 'fit-content'
                }}
              />
              {isMissing && (
                <span style={{ fontSize: '10px', color: '#EF4444', fontWeight: 600 }}>
                  {delivered}/{total}
                </span>
              )}
              {status === 1 && (retry ?? 0) > 0 && (
                <span
                  style={{
                    fontSize: '10px',
                    fontFamily: 'monospace',
                    color: (retry ?? 0) >= maxRetry ? '#dc2626' : '#94a3b8'
                  }}
                >
                  {retry}/{maxRetry} {(retry ?? 0) >= maxRetry ? '⚠️' : ''}
                </span>
              )}
              {is_locked && <span style={{ fontSize: '10px', color: '#f59e0b' }}>🔒</span>}
            </div>
          )
        }
      },
      {
        header: 'Đơn giá',
        minSize: 220,
        cell: ({ row }: { row: any }) => {
          const o = row.original
          const pricing = o.metadata?.pricing
          const duration = o.time ?? 1
          const quantity = o.quantity ?? 1
          const costLabel = isChild ? 'Nhập' : 'Vốn'

          // Per_unit có breakdown
          if (pricing && pricing.mode === 'per_unit') {
            const baseSell = pricing.base_sell_per_day
            const effectiveSell = pricing.effective_sell_per_day
            const effectiveCost = pricing.effective_cost_per_day
            const hasSellDiscount = pricing.sell_discount_percent > 0
            const hasCostDiscount = pricing.cost_discount_percent > 0

            return (
              <div style={{ lineHeight: 1.6, fontSize: '11.5px', whiteSpace: 'normal', minWidth: 200 }}>
                {/* Giá gốc 1 ngày */}
                <div style={{ color: '#94a3b8', whiteSpace: 'nowrap' }}>
                  Gốc:{' '}
                  <span style={{ textDecoration: hasSellDiscount ? 'line-through' : 'none' }}>
                    {formatVND(baseSell)}/ng
                  </span>
                </div>
                {/* Giá thực tính 1 ngày */}
                <div style={{ fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap' }}>
                  Bán: {formatVND(effectiveSell)}/ng
                  {hasSellDiscount && (
                    <span style={{ fontSize: '10px', color: '#f59e0b', marginLeft: 3 }}>
                      (-{pricing.sell_discount_percent}%)
                    </span>
                  )}
                </div>
                {/* Giá vốn/nhập */}
                {hasCostDiscount && (
                  <div style={{ color: '#94a3b8', whiteSpace: 'nowrap' }}>
                    {costLabel} gốc:{' '}
                    <span style={{ textDecoration: 'line-through' }}>{formatVND(pricing.base_cost_per_day)}/ng</span>
                  </div>
                )}
                <div style={{ color: '#64748b', whiteSpace: 'nowrap' }}>
                  {costLabel}: {formatVND(effectiveCost)}/ng
                  {hasCostDiscount && (
                    <span style={{ fontSize: '10px', color: '#f59e0b', marginLeft: 3 }}>
                      (-{pricing.cost_discount_percent}%)
                    </span>
                  )}
                </div>
                {/* Lãi/ngày */}
                {(() => {
                  const profitPerDay = effectiveSell - effectiveCost
                  const profitPctOnCost = effectiveCost > 0 ? ((profitPerDay / effectiveCost) * 100).toFixed(1) : '—'
                  const color = profitPerDay >= 0 ? '#16a34a' : '#dc2626'
                  return (
                    <div
                      style={{
                        fontWeight: 600,
                        color,
                        borderTop: '1px dashed #e2e8f0',
                        marginTop: 3,
                        paddingTop: 3,
                        whiteSpace: 'nowrap'
                      }}
                    >
                      Lãi/ng: {profitPerDay >= 0 ? '+' : ''}
                      {formatVND(profitPerDay)}
                      <span style={{ fontSize: '10px', fontWeight: 400, color: '#94a3b8', marginLeft: 3 }}>
                        ({profitPctOnCost}% trên {costLabel.toLowerCase()})
                      </span>
                    </div>
                  )
                })()}
                {/* Thời gian × SL */}
                <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: 2 }}>
                  {duration} ngày{quantity > 1 ? ` × ${quantity} SL` : ''}
                </div>
              </div>
            )
          }

          // Fallback: đơn cũ hoặc fixed mode
          const sellPerDay = duration > 0 ? Math.round((o.price_per_unit ?? 0) / duration) : (o.price_per_unit ?? 0)
          const costPerDay = duration > 0 ? Math.round((o.cost_price ?? 0) / duration) : (o.cost_price ?? 0)

          return (
            <div style={{ lineHeight: 1.6, fontSize: '11.5px' }}>
              <div style={{ fontWeight: 600, color: '#0f172a' }}>Bán: {formatVND(sellPerDay)}/ng</div>
              <div style={{ color: '#64748b' }}>
                {costLabel}: {formatVND(costPerDay)}/ng
              </div>
              <div style={{ fontSize: '10px', color: '#94a3b8' }}>
                {duration} ngày{quantity > 1 ? ` × ${quantity} SL` : ''}
              </div>
            </div>
          )
        }
      },
      {
        header: 'Tổng',
        minSize: 140,
        cell: ({ row }: { row: any }) => {
          const o = row.original
          const totalSell = o.total_amount ?? 0
          const totalCost = o.total_cost ?? 0
          const profit = totalSell - totalCost
          const profitColor = profit >= 0 ? '#16a34a' : '#dc2626'
          const marginPercent = totalSell > 0 ? ((profit / totalSell) * 100).toFixed(1) : '—'
          const costLabel = isChild ? 'Nhập' : 'Vốn'

          return (
            <div style={{ lineHeight: 1.6, fontSize: '11.5px' }}>
              <div style={{ color: '#0f172a' }}>
                Bán: <strong>{formatVND(totalSell)}</strong>
              </div>
              <div style={{ color: '#64748b' }}>
                {costLabel}: {formatVND(totalCost)}
              </div>
              <div
                style={{
                  fontWeight: 700,
                  color: profitColor,
                  fontSize: '12px',
                  borderTop: '1px solid #e2e8f0',
                  marginTop: 3,
                  paddingTop: 3,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4
                }}
              >
                <span>
                  Lãi: {profit >= 0 ? '+' : ''}
                  {formatVND(profit)}
                </span>
                <span style={{ fontSize: '10px', fontWeight: 400, color: '#94a3b8' }}>({marginPercent}%)</span>
              </div>
            </div>
          )
        }
      },
      {
        id: 'created_at',
        header: () => (
          <span
            onClick={() => handleToggleSort('created_at')}
            style={{ cursor: 'pointer', userSelect: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}
          >
            Ngày
            {sortBy === 'created_at' && <span style={{ fontSize: '11px' }}>{sortOrder === 'desc' ? '▼' : '▲'}</span>}
          </span>
        ),
        size: 180,
        cell: ({ row }: { row: any }) => {
          const r = row.original

          return (
            <div style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Clock3 size={12} />
                <span>Tạo: {r.created_at ? formatDateTimeLocal(r.created_at) : '-'}</span>
              </div>
              {r.buy_at && <div style={{ color: '#16a34a' }}>Mua: {formatDateTimeLocal(r.buy_at)}</div>}
              {r.expired_at && (
                <div style={{ color: r.status >= 5 ? '#dc2626' : '#94a3b8' }}>
                  HH: {formatDateTimeLocal(r.expired_at)}
                </div>
              )}
              {r.time && <div style={{ color: '#94a3b8' }}>{r.time} ngày</div>}
            </div>
          )
        }
      }
    ],
    [handleOpenDetail, handleOpenCancel, handleOpenResend, handleToggleSort, sortBy, sortOrder]
  )

  const table = useReactTable({
    data: orders,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageIndex: 0, pageSize: displayPerPage } }
  })

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - var(--header-height, 64px))',
        overflow: 'hidden'
      }}
    >
      {/* Stats Cards — cố định */}
      <Grid2 container spacing={{ xs: 1, sm: 2 }} sx={{ mb: { xs: 1, sm: 2 }, flexShrink: 0, px: 1 }}>
        <Grid2 size={{ xs: 6, sm: 6, md: 3 }}>
          <StatCard title='Tổng đơn hàng' value={summary.total_orders} icon={ShoppingCart} color='#7C3AED' />
        </Grid2>
        <Grid2 size={{ xs: 6, sm: 6, md: 3 }}>
          <StatCard title='Tổng doanh thu' value={formatVND(summary.total_amount)} icon={DollarSign} color='#059669' />
        </Grid2>
        <Grid2 size={{ xs: 6, sm: 6, md: 3 }}>
          <StatCard title='Tổng vốn' value={formatVND(summary.total_cost)} icon={Package} color='#D97706' />
        </Grid2>
        <Grid2 size={{ xs: 6, sm: 6, md: 3 }}>
          <StatCard title='Lợi nhuận' value={formatVND(summary.profit)} icon={TrendingUp} color='#2563EB' />
        </Grid2>
      </Grid2>

      {/* Table — chiếm phần còn lại, tự scroll */}
      <div className='orders-content' style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <div
          className='table-container'
          style={{
            borderRadius: '12px',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            minHeight: 0
          }}
        >
          {/* Toolbar */}
          <div
            className='table-toolbar'
            style={{ flexDirection: 'column', alignItems: 'stretch', gap: 0, padding: 0, flexShrink: 0 }}
          >
            {/* Row 1: Title + Search */}
            <div style={{ display: 'flex', alignItems: 'center', padding: '10px 16px 6px', gap: 8 }}>
              <div className='header-left' style={{ flexShrink: 0 }}>
                <div className='page-icon'>
                  <List size={17} />
                </div>
                <h5 className='mb-0 font-semibold' style={{ whiteSpace: 'nowrap', fontSize: '15px' }}>
                  Quản lý đơn hàng
                </h5>
              </div>
              <TextField
                size='small'
                placeholder='Tìm mã đơn, user...'
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                onKeyDown={handleKeyDown}
                sx={{
                  flex: 1,
                  minWidth: 0,
                  ml: 'auto',
                  maxWidth: 260,
                  '& .MuiOutlinedInput-root': { fontSize: '13px', borderRadius: '8px', height: 34 }
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position='start'>
                      <Search size={14} color='#94a3b8' />
                    </InputAdornment>
                  ),
                  endAdornment: searchInput ? (
                    <InputAdornment position='end'>
                      <IconButton size='small' onClick={() => setSearchInput('')} sx={{ p: '2px' }}>
                        <X size={14} />
                      </IconButton>
                    </InputAdornment>
                  ) : null
                }}
              />
            </div>

            {/* Row 2: Filters — compact wrap */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', padding: '4px 16px 10px' }}>
              <CustomTextField
                size='small'
                type='date'
                value={startInput}
                onChange={e => setStartInput(e.target.value)}
                sx={{ flex: '0 0 auto', width: 135, ...inputSx }}
              />
              <span style={{ color: '#94a3b8', fontSize: '13px' }}>—</span>
              <CustomTextField
                size='small'
                type='date'
                value={endInput}
                onChange={e => setEndInput(e.target.value)}
                sx={{ flex: '0 0 auto', width: 135, ...inputSx }}
              />

              <CustomTextField
                select
                size='small'
                value={statusInput}
                onChange={e => setStatusInput(e.target.value)}
                sx={{ flex: '0 1 auto', minWidth: 120, ...inputSx }}
                slotProps={{ select: { displayEmpty: true } }}
              >
                <MenuItem value=''>
                  <em>Tất cả trạng thái</em>
                </MenuItem>
                {Object.entries(STATUS_CONFIG).map(([key, val]) => (
                  <MenuItem key={key} value={key}>
                    <span
                      style={{
                        display: 'inline-block',
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        backgroundColor: val.color,
                        marginRight: 8
                      }}
                    />
                    {val.label}
                  </MenuItem>
                ))}
              </CustomTextField>

              <CustomTextField
                select
                size='small'
                value={providerInput}
                onChange={e => setProviderInput(e.target.value)}
                sx={{ flex: '0 1 auto', minWidth: 120, ...inputSx }}
                slotProps={{ select: { displayEmpty: true } }}
              >
                <MenuItem value=''>
                  <em>Tất cả nhà cung cấp</em>
                </MenuItem>
                {providers.map((p: any) => (
                  <MenuItem key={p.id} value={String(p.id)}>
                    {p.title}
                  </MenuItem>
                ))}
              </CustomTextField>

              <CustomTextField
                select
                size='small'
                value={orderTypeInput}
                onChange={e => setOrderTypeInput(e.target.value)}
                sx={{ flex: '0 1 auto', minWidth: 100, ...inputSx }}
                slotProps={{ select: { displayEmpty: true } }}
              >
                <MenuItem value=''>
                  <em>Tất cả loại</em>
                </MenuItem>
                <MenuItem value='0'>Mua mới</MenuItem>
                <MenuItem value='1'>Gia hạn</MenuItem>
              </CustomTextField>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '13px', color: '#64748b' }}>
                <span>Lấy</span>
                <input
                  type='number'
                  min={20}
                  max={10000}
                  value={apiLimitInput}
                  onChange={e => setApiLimitInput(e.target.value)}
                  onBlur={() => {
                    const val = Math.max(20, Math.min(10000, Number(apiLimitInput) || 100))

                    setApiLimitInput(String(val))
                    setApiLimit(val)
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      const val = Math.max(20, Math.min(10000, Number(apiLimitInput) || 100))

                      setApiLimitInput(String(val))
                      setApiLimit(val)
                    }
                  }}
                  style={{
                    width: 80,
                    padding: '5px 6px',
                    fontSize: '13px',
                    border: '1px solid #e2e8f0',
                    borderRadius: 6,
                    textAlign: 'center',
                    outline: 'none'
                  }}
                />
                <span>đơn</span>
              </div>

              <Button
                variant='contained'
                size='small'
                onClick={handleApplyFilters}
                disabled={isFetching}
                sx={{
                  color: '#fff',
                  minWidth: 100,
                  height: 36,
                  fontSize: '13px',
                  background: 'var(--primary-gradient, var(--primary-hover))',
                  '&:hover': { opacity: 0.9 }
                }}
                startIcon={
                  isFetching ? (
                    <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />
                  ) : (
                    <Search size={15} />
                  )
                }
              >
                {isFetching ? 'Đang tải...' : 'Tìm kiếm'}
              </Button>
            </div>
          </div>

          {/* Table */}
          <div className='table-wrapper' style={{ overflow: 'auto', flex: 1, minHeight: 0, padding: '0 12px 12px' }}>
            <table
              className='data-table'
              style={{
                tableLayout: 'auto',
                minWidth: '100%',
                whiteSpace: 'nowrap',
                ...(isLoading || orders.length === 0 ? { height: '100%' } : {})
              }}
            >
              <thead
                className='table-header'
                style={{
                  position: 'sticky',
                  top: -1,
                  zIndex: 10,
                  background: '#f8fafc',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                }}
              >
                {table.getHeaderGroups().map(headerGroup => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map(header => (
                      <th style={{ width: header.getSize() }} className='table-header th' key={header.id}>
                        {flexRender(header.column.columnDef.header, header.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={columns.length} className='py-10 text-center'>
                      <div className='loader-wrapper'>
                        <div className='loader'>
                          <span></span>
                          <span></span>
                          <span></span>
                        </div>
                        <p className='loading-text'>Đang tải dữ liệu...</p>
                      </div>
                    </td>
                  </tr>
                ) : orders.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length} className='py-10 text-center'>
                      <div className='flex flex-col items-center justify-center'>
                        <Image src='/images/no-data.png' alt='No data' width={160} height={160} />
                        <p className='mt-4' style={{ color: '#94a3b8' }}>
                          Không có đơn hàng
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  table.getRowModel().rows.map(row => {
                    const isActive = selectedOrder?.order?.id === row.original.id && orderDetailOpen
                    return (
                      <tr
                        className='table-row'
                        key={row.id}
                        onClick={e => {
                          if ((e.target as HTMLElement).closest('button, a, input, .MuiIconButton-root')) return
                          handleOpenDetail(row.original)
                        }}
                        style={{
                          cursor: 'pointer',
                          background: isActive ? '#eef2ff' : undefined,
                          transition: 'background 0.15s'
                        }}
                        onMouseEnter={e => {
                          if (!isActive) e.currentTarget.style.background = '#f8fafc'
                        }}
                        onMouseLeave={e => {
                          if (!isActive) e.currentTarget.style.background = ''
                        }}
                      >
                        {row.getVisibleCells().map(cell => (
                          <td className='table-cell' key={cell.id}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        ))}
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className='pagination-container'>
            <div className='pagination-wrapper'>
              <div className='pagination-info'>
                <div className='page-size-select'>
                  <span className='text-sm text-gray'>Hiển thị</span>
                  <div className='page-size-select-wrapper'>
                    <select
                      value={displayPerPage}
                      onChange={e => {
                        const val = Number(e.target.value)

                        setDisplayPerPage(val)
                        table.setPageSize(val)
                      }}
                      className='page-size-select'
                    >
                      <option value='20'>20</option>
                      <option value='50'>50</option>
                      <option value='100'>100</option>
                      <option value='200'>200</option>
                    </select>
                    <div className='select-arrow'>
                      <svg className='h-4 w-4' xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20'>
                        <path d='M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z' />
                      </svg>
                    </div>
                  </div>
                </div>

                <div>
                  {orders.length > 0 ? (
                    <span>
                      Trang {table.getState().pagination.pageIndex + 1} / {table.getPageCount()} ({orders.length}
                      {serverPagination.total > orders.length ? ` / ${serverPagination.total}` : ''} đơn)
                    </span>
                  ) : (
                    <span>Không có dữ liệu</span>
                  )}
                </div>
              </div>
              <div className='pagination-buttons'>
                <Pagination
                  count={table.getPageCount()}
                  shape='rounded'
                  variant='outlined'
                  color='primary'
                  page={table.getState().pagination.pageIndex + 1}
                  onChange={(_, newPage) => table.setPageIndex(newPage - 1)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Modals ── */}

      {/* Order Detail Modal */}
      <OrderDetailModal
        isOpen={orderDetailOpen}
        onClose={() => {
          setOrderDetailOpen(false)
          setSelectedOrder(null)
        }}
        orderData={selectedOrder}
      />

      {/* Cancel + Refund Dialog */}
      <CancelRefundDialog
        cancelDialogOpen={cancelDialogOpen}
        setCancelDialogOpen={setCancelDialogOpen}
        orderToCancel={orderToCancel}
        cancelRefundType={cancelRefundType}
        setCancelRefundType={setCancelRefundType}
        cancelRefundAmount={cancelRefundAmount}
        setCancelRefundAmount={setCancelRefundAmount}
        cancelMutation={cancelMutation}
        handleConfirmCancel={handleConfirmCancel}
      />

      {/* Resend Dialog */}
      <ResendDialog
        resendDialogOpen={resendDialogOpen}
        setResendDialogOpen={setResendDialogOpen}
        orderToResend={orderToResend}
        resendMutation={resendMutation}
        handleConfirmResend={handleConfirmResend}
      />

      {/* Retry Dialog */}
      <RetryDialog
        retryOrder={retryOrder}
        setRetryOrder={setRetryOrder}
        retryMutation={retryMutation}
        handleRetry={handleRetry}
      />

      {/* Retry Failed Order Dialog */}
      <RetryFailedOrderDialog
        retryFailedOrder={retryFailedOrder}
        setRetryFailedOrder={setRetryFailedOrder}
        retryFailedMutation={retryFailedMutation}
      />

      {/* Fill Proxies Dialog */}
      {fillProxiesOrder && (
        <FillProxiesDialog
          order={fillProxiesOrder}
          onClose={() => setFillProxiesOrder(null)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['adminOrders'] })
            setFillProxiesOrder(null)
          }}
        />
      )}

      {/* Retry Fetch Dialog */}
      <Dialog open={!!retryFetchOrder} onClose={() => setRetryFetchOrder(null)}>
        <DialogTitle>Retry fetch order-items</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Đơn <strong>#{retryFetchOrder?.order_code}</strong> đã mua thành công trên NCC nhưng chưa lấy được proxy.
            Hệ thống sẽ gọi lại API NCC để lấy danh sách proxy (poll order-items). Retry giảm 1.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRetryFetchOrder(null)} color='inherit'>Hủy</Button>
          <Button
            onClick={() => {
              retryFetchMutation.mutate(retryFetchOrder?.id, {
                onSuccess: (res: any) => {
                  toast.info(res?.message || 'Đã đẩy lại đơn hàng')
                  setRetryFetchOrder(null)
                },
                onError: (err: any) => {
                  toast.error(err?.response?.data?.message || 'Có lỗi xảy ra')
                }
              })
            }}
            color='warning'
            variant='contained'
            disabled={retryFetchMutation.isPending}
          >
            {retryFetchMutation.isPending ? 'Đang xử lý...' : 'Retry fetch'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Renewal Retry Dialog */}
      <RenewalRetryDialog
        renewalLoading={renewalLoading}
        renewalRetryOrder={renewalRetryOrder}
        setRenewalRetryOrder={setRenewalRetryOrder}
        handleConfirmRenewalRetry={handleConfirmRenewalRetry}
      />

      {/* Renewal Dismiss Dialog */}
      <Dialog open={!!renewalDismissOrder} onClose={() => setRenewalDismissOrder(null)}>
        <DialogTitle>Bỏ qua gia hạn lỗi</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Bỏ qua gia hạn lỗi đơn <strong>#{renewalDismissOrder?.order_code}</strong>?
            <br />
            <br />
            Đơn sẽ về trạng thái trước đó. Tiền đã trừ sẽ không được hoàn tự động.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRenewalDismissOrder(null)} color='inherit'>
            Hủy
          </Button>
          <Button
            onClick={handleConfirmRenewalDismiss}
            color='error'
            variant='contained'
            disabled={renewalLoading}
            sx={{ color: '#fff' }}
          >
            {renewalLoading ? (
              <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
            ) : (
              'Xác nhận bỏ qua'
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Order Confirm Dialog (timeout orders) */}
      <Dialog open={!!confirmOrder} onClose={() => setConfirmOrder(null)} maxWidth='sm' fullWidth>
        <DialogTitle>Xác nhận đơn hàng thành công</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Xác nhận NCC đã xử lý đơn <strong>#{confirmOrder?.order_code}</strong>?
          </DialogContentText>
          <TextField
            fullWidth
            size='small'
            label='Mã đơn NCC (nếu có)'
            placeholder='Nhập mã đơn từ NCC để hệ thống tự lấy kết quả'
            value={confirmProviderCode}
            onChange={e => setConfirmProviderCode(e.target.value)}
            helperText='Bỏ trống nếu đơn đã có sản phẩm hoặc muốn import thủ công sau'
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOrder(null)} color='inherit'>
            Hủy
          </Button>
          <Button
            onClick={async () => {
              try {
                const res = await orderConfirmMutation.mutateAsync({
                  orderId: confirmOrder?.id,
                  providerOrderCode: confirmProviderCode || undefined
                })
                toast.info(res?.message || 'Đã xác nhận')
                setConfirmOrder(null)
                queryClient.invalidateQueries({ queryKey: ['adminOrders'] })
              } catch (err: any) {
                toast.error(err?.response?.data?.message || 'Lỗi xác nhận')
              }
            }}
            color='success'
            variant='contained'
            disabled={orderConfirmMutation.isPending}
            sx={{ color: '#fff' }}
          >
            {orderConfirmMutation.isPending ? (
              <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
            ) : (
              'Xác nhận'
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Refund Dialog */}
      <Dialog open={!!refundOrder} onClose={() => setRefundOrder(null)}>
        <DialogTitle>Hoàn tiền phần thiếu</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Hoàn tiền cho{' '}
            <strong>
              {refundOrder?.missing_count ?? refundOrder?.quantity - (refundOrder?.delivered_quantity ?? 0)}
            </strong>{' '}
            proxy thiếu của đơn <strong>#{refundOrder?.order_code}</strong>?
            <br />
            <br />
            Đơn hàng vẫn active — proxy đã nhận vẫn hoạt động bình thường.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRefundOrder(null)} color='inherit'>
            Hủy
          </Button>
          <Button
            onClick={handleRefund}
            color='warning'
            variant='contained'
            disabled={refundMutation.isPending}
            sx={{ color: '#fff' }}
          >
            {refundMutation.isPending ? (
              <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
            ) : (
              'Xác nhận hoàn tiền'
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  )
}
