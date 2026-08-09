'use client'

import { useEffect, useMemo, useState } from 'react'

import Image from 'next/image'
import { useSearchParams } from 'next/navigation'

import {
  List,
  Clock3,
  Clock,
  Eye,
  Search,
  Loader2,
  X
} from 'lucide-react'

import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  getPaginationRowModel
} from '@tanstack/react-table'

import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import MenuItem from '@mui/material/MenuItem'
import TextField from '@mui/material/TextField'
import InputAdornment from '@mui/material/InputAdornment'
import IconButton from '@mui/material/IconButton'
import LinearProgress from '@mui/material/LinearProgress'
import Pagination from '@mui/material/Pagination'

import { useQueryClient } from '@tanstack/react-query'

import CustomTextField from '@core/components/mui/TextField'
import CustomIconButton from '@core/components/mui/IconButton'

import { formatDateTimeLocal } from '@/utils/formatDate'
import { useHistoryOrders, PENDING_STATUSES } from '@/hooks/apis/useHistoryOrders'
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from '@/constants/orderStatus'
import PurchaseAttributes from '@/components/PurchaseAttributes'
import OrderDetail from './OrderDetail'

const inputSx = {
  '& .MuiOutlinedInput-root': { fontSize: '13px', borderRadius: '8px', minHeight: '36px' },
  '& .MuiSelect-select': { paddingBlock: '7px' }
}

export default function HistoryOrderPage() {
  const [open, setOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null)
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 })
  const searchParams = useSearchParams()
  const urlSearch = searchParams.get('search') || ''
  const [searchText, setSearchText] = useState(urlSearch)
  const [appliedSearch, setAppliedSearch] = useState(urlSearch)
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const queryClient = useQueryClient()

  const {
    data: dataOrders = [],
    isLoading,
    isFetching,
    refetch,
    dataUpdatedAt
  } = useHistoryOrders(appliedSearch || undefined)

  const handleSearch = () => {
    const text = searchText.trim()
    setAppliedSearch(text)
    setPagination(prev => ({ ...prev, pageIndex: 0 }))
    // Invalidate tất cả userOrders queries → luôn gọi server
    queryClient.invalidateQueries({ queryKey: ['userOrders'] })
  }

  // Client-side filtering (status only — search đã server-side)
  const filteredOrders = useMemo(() => {
    let result = dataOrders

    if (statusFilter !== 'all') {
      result = result.filter((order: any) => String(order.status) === statusFilter)
    }

    return result
  }, [dataOrders, appliedSearch, statusFilter])

  // Đếm đơn đang chờ xử lý
  const pendingOrders = useMemo(() => {
    return dataOrders.filter((o: any) => PENDING_STATUSES.includes(Number(o.status)))
  }, [dataOrders])

  const hasPendingOrders = pendingOrders.length > 0

  // Tính thời gian còn lại
  const getTimeRemaining = (expiredAt: string, status: string) => {
    if (String(status) !== '2' && String(status) !== '3') return null

    const now = new Date()
    const expired = new Date(expiredAt)
    const diff = expired.getTime() - now.getTime()

    if (diff <= 0) return null

    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

    if (days > 0) return `còn ${days}d ${hours}h`

    return `còn ${hours}h`
  }

  const getStatusBadge = (status: string) => {
    const label = ORDER_STATUS_LABELS[status] || 'Không xác định'
    const color = (ORDER_STATUS_COLORS[status] || 'default') as any

    return <Chip label={label} size='small' color={color} />
  }

  const fmtVND = (v: number) => new Intl.NumberFormat('vi-VN').format(v) + 'đ'

  const columns = useMemo(
    () => [
      {
        accessorKey: 'order_code',
        header: 'Sản phẩm',
        minSize: 180,
        cell: ({ row }: { row: any }) => {
          const o = row.original

          return (
            <div style={{ lineHeight: 1.4 }}>
              <div style={{ fontWeight: 600, fontSize: '13px' }}>{o.service_name || '-'}</div>
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>{o.order_code} · {fmtVND(o.total_amount)}</div>
              {/* Thuộc tính khách đã chọn lúc mua (Vị trí, Nhà mạng…). Trước đây KHÔNG hiện ở đâu cả:
                  đơn mua qua web chỉ lưu mã lựa chọn, BE nay dịch sẵn sang nhãn ở purchase_attributes. */}
              <PurchaseAttributes items={o.purchase_attributes} max={3} />
            </div>
          )
        }
      },
      {
        header: 'Thông tin đơn hàng',
        minSize: 200,
        cell: ({ row }: { row: any }) => {
          const o = row.original
          const { quantity: qty, delivered_quantity: delivered } = o
          const isMissing = delivered != null && delivered < qty
          const remaining = getTimeRemaining(o.expired_at, o.status)

          return (
            <div style={{ lineHeight: 1.6, fontSize: '12px', color: '#64748b' }}>
              <div>
                Số lượng: <span style={{ fontWeight: 600, color: isMissing ? '#EF4444' : '#374151' }}>
                  {isMissing ? `${delivered}/${qty}` : qty}
                </span>
              </div>
              {o.buy_at && <div>Ngày mua: {formatDateTimeLocal(o.buy_at)}</div>}
              {o.expired_at && <div>Hết hạn: {formatDateTimeLocal(o.expired_at)}</div>}
              {remaining && (
                <div style={{ color: '#16a34a', fontWeight: 600, fontSize: '12px' }}>Còn lại: {remaining}</div>
              )}
            </div>
          )
        }
      },
      {
        header: 'Trạng thái',
        size: 150,
        cell: ({ row }: { row: any }) => {
          const status = Number(row.original.status)
          const isPending = PENDING_STATUSES.includes(status)

          const hint: Record<number, string> = {
            0: 'Vui lòng chờ...',
            1: 'Vui lòng chờ...',
            4: 'Gia hạn để tiếp tục',
            5: 'Liên hệ hỗ trợ',
            6: 'Đã hoàn vào tài khoản',
            8: 'Đã hoàn vào tài khoản',
            9: 'Vui lòng chờ...',
            10: 'Vui lòng chờ...',
            11: 'Vui lòng chờ...',
            12: 'Liên hệ hỗ trợ',
          }

          return (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {getStatusBadge(String(status))}
                {isPending && <Loader2 size={14} color='#3B82F6' style={{ animation: 'spin 1s linear infinite' }} />}
              </div>
              {hint[status] && (
                <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: 3 }}>{hint[status]}</div>
              )}
            </div>
          )
        }
      },
      {
        header: '',
        id: 'action',
        size: 120,
        cell: ({ row }: { row: any }) => {
          const status = Number(row.original.status)
          const isActive = [2, 3].includes(status)
          const isPending = [0, 1, 10, 11].includes(status)

          if (isPending) return <span style={{ fontSize: '11px', color: '#94a3b8' }}>Đang xử lý...</span>

          return (
            <span style={{
              fontSize: '12px', fontWeight: 600, color: isActive ? '#16a34a' : '#64748b',
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
              {isActive ? 'Xem sản phẩm' : 'Chi tiết'} <Eye size={13} />
            </span>
          )
        }
      },
    ],
    []
  )

  const table = useReactTable({
    data: filteredOrders,
    columns,
    state: { pagination },
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel()
  })

  const { pageIndex, pageSize } = table.getState().pagination
  const totalRows = filteredOrders.length
  const startRow = totalRows ? pageIndex * pageSize + 1 : 0
  const endRow = Math.min(startRow + pageSize - 1, totalRows)


  return (
    <>
      <div className='orders-content'>
        <div className='table-container'>
          {/* Toolbar */}
          <div className='table-toolbar' style={{ flexDirection: 'column', alignItems: 'stretch', gap: 0, padding: 0 }}>
            {/* Row 1: Title */}
            <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px 8px', gap: 8 }}>
              <div className='header-left'>
                <div className='page-icon'>
                  <List size={17} />
                </div>
                <h5 className='mb-0 font-semibold' style={{ whiteSpace: 'nowrap' }}>Đơn hàng của tôi</h5>
              </div>
            </div>
            {/* Row 2: Search + Filter — full width, wrap trên mobile */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', padding: '0 16px 12px', borderBottom: '1px solid #f1f5f9' }}>
              <TextField
                size='small'
                placeholder='Tìm mã đơn, dịch vụ...'
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSearch() }}
                sx={{ flex: '1 1 150px', minWidth: 0, '& .MuiOutlinedInput-root': { fontSize: '13px', borderRadius: '8px' } }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position='start'>
                      <Search size={15} color='#94a3b8' />
                    </InputAdornment>
                  ),
                  endAdornment: searchText ? (
                    <InputAdornment position='end'>
                      <IconButton size='small' onClick={() => { setSearchText(''); setAppliedSearch(''); setPagination(prev => ({ ...prev, pageIndex: 0 })); queryClient.invalidateQueries({ queryKey: ['userOrders'] }) }} sx={{ p: '2px' }}>
                        <X size={14} />
                      </IconButton>
                    </InputAdornment>
                  ) : null
                }}
              />
              <CustomTextField
                select
                size='small'
                value={statusFilter}
                onChange={(e: any) => {
                  setStatusFilter(e.target.value)
                  setPagination(prev => ({ ...prev, pageIndex: 0 }))
                }}
                sx={{ flex: '0 0 auto', minWidth: 140, ...inputSx }}
                slotProps={{ select: { displayEmpty: true } }}
              >
                <MenuItem value='all'>Tất cả trạng thái</MenuItem>
                {Object.entries(ORDER_STATUS_LABELS).map(([value, label]) => (
                  <MenuItem key={value} value={value}>{label}</MenuItem>
                ))}
              </CustomTextField>
              <Button
                variant='contained'
                size='small'
                onClick={handleSearch}
                startIcon={isFetching ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Search size={15} />}
                sx={{ height: 36, borderRadius: '8px', fontSize: '13px', textTransform: 'none', whiteSpace: 'nowrap', px: 2, flexShrink: 0, background: 'var(--primary-gradient, var(--primary-hover))', '&:hover': { opacity: 0.9 } }}
              >
                Tìm kiếm
              </Button>
            </div>

            {/* Pending orders banner */}
            {hasPendingOrders && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 16px',
                background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                borderBottom: '1px solid #bfdbfe'
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: '#3B82F6',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <Loader2 size={16} color='#fff' style={{ animation: 'spin 1s linear infinite' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e40af' }}>
                    {pendingOrders.length} đơn hàng đang chờ xử lý
                  </div>
                </div>
                {isFetching && (
                  <div style={{ width: '100%', maxWidth: 120 }}>
                    <LinearProgress
                      sx={{
                        height: 3, borderRadius: 2,
                        backgroundColor: '#bfdbfe',
                        '& .MuiLinearProgress-bar': { backgroundColor: '#3B82F6' }
                      }}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Table */}
          <div className='table-wrapper' style={{ overflowX: 'auto' }}>
            <table className='data-table' style={{ minWidth: '1225px', ...(isLoading || filteredOrders.length === 0 ? { height: '100%' } : {}) }}>
              <thead className='table-header'>
                {table.getHeaderGroups().map(headerGroup => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map(header => (
                      <th style={{ minWidth: header.getSize(), width: header.getSize() }} className='table-header th' key={header.id}>
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
                          <span></span><span></span><span></span>
                        </div>
                        <p className='loading-text'>Đang tải dữ liệu...</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length} className='py-10 text-center'>
                      <div className='flex flex-col items-center justify-center'>
                        <Image src='/images/no-data.png' alt='No data' width={160} height={160} />
                        <p className='mt-4' style={{ color: '#94a3b8' }}>Không có đơn hàng</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  table.getRowModel().rows.map(row => {
                    const isPending = PENDING_STATUSES.includes(Number(row.original.status))
                    const isSelected = selectedOrder?.id === row.original.id && open
                    const defaultBg = isPending
                      ? 'linear-gradient(135deg, #fefce8 0%, #fef9c3 100%)'
                      : isSelected ? '#f0f7ff' : ''

                    return (
                      <tr
                        className='table-row'
                        key={row.id}
                        onClick={() => { setSelectedOrder(row.original); setOpen(true) }}
                        style={{
                          cursor: 'pointer',
                          transition: 'background 0.15s',
                          background: defaultBg,
                          ...(isPending ? { borderLeft: '3px solid #f59e0b' } : {}),
                          ...(isSelected && !isPending ? { borderLeft: '3px solid #3b82f6' } : {}),
                        }}
                        onMouseEnter={e => { if (!isPending && !isSelected) (e.currentTarget as HTMLElement).style.background = '#f8fafc' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = defaultBg }}
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
                      value={table.getState().pagination.pageSize}
                      onChange={e => table.setPageSize(Number(e.target.value))}
                      className='page-size-select'
                    >
                      <option value='10'>10</option>
                      <option value='50'>50</option>
                      <option value='100'>100</option>
                    </select>
                    <div className='select-arrow'>
                      <svg className='h-4 w-4' xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20'>
                        <path d='M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z' />
                      </svg>
                    </div>
                  </div>
                </div>
                <div>
                  {totalRows > 0 ? (
                    <span>{startRow} - {endRow} của {totalRows} đơn</span>
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
                  onChange={(_, page) => table.setPageIndex(page - 1)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {open && (
        <OrderDetail
          open={open}
          onClose={() => {
            setOpen(false)
            setSelectedOrder(null)
          }}
          order={selectedOrder}
        />
      )}
    </>
  )
}
