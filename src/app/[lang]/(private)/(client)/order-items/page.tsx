'use client'

import { useState, useCallback, useMemo } from 'react'

import Image from 'next/image'
import { useParams } from 'next/navigation'

import { RefreshCw, Shield, Copy, Check, ExternalLink, Settings2, List, X, Loader2, Download, ClipboardCopy } from 'lucide-react'
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef
} from '@tanstack/react-table'
import {
  Box,
  Typography,
  MenuItem,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Checkbox
} from '@mui/material'
import Pagination from '@mui/material/Pagination'
import { toast } from 'react-toastify'

import CustomTextField from '@core/components/mui/TextField'
import { useOrderItems, useUpdateIpWhitelist, type OrderItemRecord } from '@/hooks/apis/useOrderItems'
import { extractProxyValue, extractProtocol } from '@/utils/protocolProxy'
import ExportModal, { type ExportColumn } from '@/components/UI/ExportModal'

/* ── Constants ── */
const STATUS_MAP: Record<number, { label: string; color: string; bg: string }> = {
  0: { label: 'Hoạt động', color: '#16a34a', bg: '#dcfce7' },
  1: { label: 'Tắt', color: '#94a3b8', bg: '#f1f5f9' },
  2: { label: 'Hết hạn', color: '#dc2626', bg: '#fee2e2' }
}

const inputSx = {
  '& .MuiOutlinedInput-root': { fontSize: '13px', borderRadius: '8px', minHeight: '36px' },
  '& .MuiSelect-select': { paddingBlock: '7px' }
}

/* ── Helpers ── */
const formatProxy = (item: OrderItemRecord) => {
  const raw = extractProxyValue(item.proxy)

  return raw.replace(/:+$/, '') || '—'
}

const EXPORT_COLUMNS: ExportColumn[] = [
  { key: 'key', label: 'Key', accessor: r => r.key || '' },
  { key: 'type', label: 'Loại', accessor: r => (r.type === 'ROTATING' ? 'Xoay' : 'Tĩnh') },
  { key: 'proxy', label: 'Proxy', accessor: r => formatProxy(r) },
  {
    key: 'protocol',
    label: 'Protocol',
    accessor: r => extractProtocol(r.proxy) || (r.protocol || 'http').toUpperCase()
  },
  { key: 'ip_whitelist', label: 'IP Whitelist', accessor: r => (r.ip_whitelist || []).join(', ') },
  { key: 'status', label: 'Trạng thái', accessor: r => STATUS_MAP[r.status]?.label || '' },
  {
    key: 'expired_at',
    label: 'Hết hạn',
    accessor: r => (r.expired_at ? new Date(r.expired_at).toLocaleDateString('vi-VN') : '')
  },
  { key: 'order_code', label: 'Đơn hàng', accessor: r => r.order_code || '' }
]

/* ── Component ── */
export default function ProxyKeysPage() {
  const params = useParams()
  const locale = params.lang || 'vi'

  // Filters
  const [type, setType] = useState('')
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const [limit, setLimit] = useState(100)
  const [appliedFilters, setAppliedFilters] = useState<any>({ limit: 100 })

  // Table state
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 50 })
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({})
  const [copied, setCopied] = useState<string | null>(null)
  const [editItem, setEditItem] = useState<OrderItemRecord | null>(null)
  const [editIp, setEditIp] = useState('')
  const [exportOpen, setExportOpen] = useState(false)

  // Data
  const { data, isLoading, isFetching, refetch } = useOrderItems(appliedFilters, false)
  const updateIps = useUpdateIpWhitelist()
  const items: OrderItemRecord[] = useMemo(() => data?.data ?? [], [data])
  const meta = data?.meta

  const handleSearch = useCallback(() => {
    setAppliedFilters({ limit, type: type || undefined, status: status || undefined, search: search || undefined })
    setPagination(prev => ({ ...prev, pageIndex: 0 }))
    setTimeout(() => refetch(), 50)
  }, [type, status, search, limit, refetch])

  const copyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 1500)
  }

  const handleSaveIp = () => {
    if (!editItem) return
    const ip = editIp.trim()

    if (ip && !/^(\d{1,3}\.){3}\d{1,3}$/.test(ip)) {
      toast.error('IP không hợp lệ')

      return
    }

    updateIps.mutate(
      { key: editItem.key, ip_whitelist: ip ? [ip] : [] },
      {
        onSuccess: () => {
          setEditItem(null)
          refetch()
        },
        onError: () => toast.error('Lỗi cập nhật IP')
      }
    )
  }

  const searching = isLoading || isFetching

  // Columns
  const columns: ColumnDef<OrderItemRecord, any>[] = useMemo(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <Checkbox
            size='small'
            checked={table.getIsAllPageRowsSelected()}
            indeterminate={table.getIsSomePageRowsSelected()}
            onChange={table.getToggleAllPageRowsSelectedHandler()}
            sx={{ p: 0 }}
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            size='small'
            checked={row.getIsSelected()}
            disabled={!row.getCanSelect()}
            onChange={row.getToggleSelectedHandler()}
            sx={{ p: 0 }}
          />
        ),
        size: 40
      },
      {
        accessorKey: 'key',
        header: 'Key',
        size: 160,
        cell: ({ row }) => (
          <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
            <span style={{ fontFamily: 'monospace', fontSize: '11px', color: '#6366f1' }}>
              {row.original.key.slice(0, 12)}...
            </span>
            <CopyBtn
              copied={copied === row.original.key}
              onClick={() => copyText(row.original.key, row.original.key)}
            />
          </Box>
        )
      },
      {
        accessorKey: 'type',
        header: 'Loại',
        size: 80,
        cell: ({ row }) => <TypeBadge type={row.original.type} />
      },
      {
        accessorKey: 'proxy',
        header: 'Proxy',
        size: 200,
        cell: ({ row }) => {
          const proxyText = formatProxy(row.original)

          return (
            <div>
              <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                <span style={{ fontFamily: 'monospace', fontSize: '11px' }}>{proxyText}</span>
                {proxyText !== '—' && (
                  <CopyBtn
                    copied={copied === `p-${row.original._id}`}
                    onClick={() => copyText(proxyText, `p-${row.original._id}`)}
                  />
                )}
              </Box>
              <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: 1 }}>
                {extractProtocol(row.original.proxy) || (row.original.protocol || 'http').toUpperCase()}
              </div>
            </div>
          )
        }
      },
      {
        id: 'ip_whitelist',
        header: 'IP Whitelist',
        size: 120,
        cell: ({ row }) =>
          row.original.ip_whitelist?.length ? (
            <span style={{ fontSize: '11px', color: '#2563eb', fontFamily: 'monospace' }}>
              {row.original.ip_whitelist[0]}
            </span>
          ) : (
            <span style={{ color: '#cbd5e1', fontSize: '11px' }}>—</span>
          )
      },
      {
        accessorKey: 'status',
        header: 'Trạng thái',
        size: 100,
        cell: ({ row }) => {
          const st = STATUS_MAP[row.original.status] ?? STATUS_MAP[2]

          return (
            <span
              style={{
                padding: '2px 10px',
                borderRadius: 99,
                fontSize: '11px',
                fontWeight: 600,
                color: st.color,
                background: st.bg
              }}
            >
              {st.label}
            </span>
          )
        }
      },
      {
        accessorKey: 'expired_at',
        header: 'Hết hạn',
        size: 100,
        cell: ({ row }) => (
          <span style={{ fontSize: '11px', color: '#64748b' }}>
            {row.original.expired_at ? new Date(row.original.expired_at).toLocaleDateString('vi-VN') : '—'}
          </span>
        )
      },
      {
        id: 'order_code',
        header: 'Đơn hàng',
        size: 110,
        cell: ({ row }) =>
          row.original.order_code ? (
            <a
              href={`/${locale}/history-order?search=${row.original.order_code}`}
              style={{
                fontSize: '11px',
                color: '#6366f1',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 3
              }}
              onClick={e => e.stopPropagation()}
            >
              {row.original.order_code.slice(-8)} <ExternalLink size={10} />
            </a>
          ) : (
            <span style={{ color: '#cbd5e1', fontSize: '11px' }}>—</span>
          )
      },
      {
        id: 'actions',
        header: '',
        size: 40,
        cell: ({ row }) =>
          row.original.status === 0 ? (
            <Tooltip title='Cập nhật IP'>
              <IconButton
                size='small'
                onClick={e => {
                  e.stopPropagation()
                  setEditItem(row.original)
                  setEditIp((row.original.ip_whitelist || [])[0] || '')
                }}
              >
                <Settings2 size={14} color='#64748b' />
              </IconButton>
            </Tooltip>
          ) : null
      }
    ],
    [copied, locale]
  )

  const table = useReactTable({
    data: items,
    columns,
    state: { pagination, rowSelection },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getRowId: (row: OrderItemRecord) => row._id
  })

  const selectedRows = table.getSelectedRowModel().rows
  const selectedCount = selectedRows.length

  const handleCopySelected = useCallback(() => {
    const rows = table.getSelectedRowModel().rows

    if (rows.length === 0) {
      toast.warn('Chưa chọn proxy nào')

      return
    }

    const proxyTexts = rows
      .map(row => formatProxy(row.original))
      .filter(v => v && v !== '—')

    if (proxyTexts.length > 0) {
      const text = proxyTexts.join('\n')

      navigator.clipboard.writeText(text).then(
        () => toast.success(`Đã copy ${proxyTexts.length} proxy`),
        () => {
          // Fallback for non-HTTPS
          const ta = document.createElement('textarea')

          ta.value = text
          ta.style.position = 'fixed'
          ta.style.opacity = '0'
          document.body.appendChild(ta)
          ta.select()
          document.execCommand('copy')
          document.body.removeChild(ta)
          toast.success(`Đã copy ${proxyTexts.length} proxy`)
        }
      )
    } else {
      toast.warn('Proxy đã chọn chưa có giá trị')
    }
  }, [table])

  const { pageIndex, pageSize } = table.getState().pagination
  const totalRows = items.length
  const startRow = totalRows ? pageIndex * pageSize + 1 : 0
  const endRow = Math.min(startRow + pageSize - 1, totalRows)

  return (
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
              <div>
                <h5 className='mb-0 font-semibold' style={{ whiteSpace: 'nowrap' }}>
                  Danh sách proxy
                </h5>
                <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>Quản lý tất cả proxy key đang sở hữu</p>
              </div>
            </div>
          </div>

          {/* Row 2: Filters */}
          <div
            style={{
              display: 'flex',
              gap: 8,
              alignItems: 'center',
              flexWrap: 'wrap',
              padding: '0 16px 12px',
              borderBottom: '1px solid #f1f5f9'
            }}
          >
            <CustomTextField
              select
              value={type}
              onChange={e => setType(e.target.value)}
              size='small'
              sx={{ minWidth: 120, ...inputSx }}
              slotProps={{ select: { displayEmpty: true } }}
            >
              <MenuItem value=''>
                <em>Tất cả loại</em>
              </MenuItem>
              <MenuItem value='ROTATING'>Xoay</MenuItem>
              <MenuItem value='STATIC'>Tĩnh</MenuItem>
            </CustomTextField>

            <CustomTextField
              select
              value={status}
              onChange={e => setStatus(e.target.value)}
              size='small'
              sx={{ minWidth: 130, ...inputSx }}
              slotProps={{ select: { displayEmpty: true } }}
            >
              <MenuItem value=''>
                <em>Tất cả trạng thái</em>
              </MenuItem>
              <MenuItem value='0'>Hoạt động</MenuItem>
              <MenuItem value='2'>Hết hạn</MenuItem>
            </CustomTextField>

            <CustomTextField
              select
              value={limit}
              onChange={e => setLimit(Number(e.target.value))}
              size='small'
              sx={{ minWidth: 100, ...inputSx }}
            >
              {[100, 500, 1000, 5000, 10000].map(n => (
                <MenuItem key={n} value={n}>
                  {n.toLocaleString()} dòng
                </MenuItem>
              ))}
            </CustomTextField>

            <CustomTextField
              size='small'
              placeholder='Tìm theo key...'
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              sx={{ flex: '1 1 150px', minWidth: 0, ...inputSx }}
              slotProps={{
                input: {
                  endAdornment: search ? (
                    <IconButton size='small' onClick={() => setSearch('')} sx={{ p: 0.25 }}>
                      <X size={14} />
                    </IconButton>
                  ) : null
                }
              }}
            />

            <Button
              variant='contained'
              size='small'
              onClick={handleSearch}
              disabled={searching}
              startIcon={
                searching ? (
                  <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />
                ) : (
                  <RefreshCw size={15} />
                )
              }
              sx={{
                height: 36,
                borderRadius: '8px',
                fontSize: '13px',
                textTransform: 'none',
                whiteSpace: 'nowrap',
                px: 2,
                flexShrink: 0,
                background: 'var(--primary-gradient, var(--primary-hover))',
                '&:hover': { opacity: 0.9 }
              }}
            >
              Tìm kiếm
            </Button>

            <Button
              variant='outlined'
              size='small'
              disabled={selectedCount === 0}
              onClick={handleCopySelected}
              sx={{
                height: '36px',
                fontSize: '13px',
                fontWeight: 600,
                textTransform: 'none',
                borderRadius: '8px',
                gap: '6px',
                px: 2,
                flexShrink: 0
              }}
            >
              <ClipboardCopy size={15} />
              Copy {selectedCount > 0 ? `(${selectedCount})` : ''}
            </Button>

            <Button
              variant='outlined'
              size='small'
              disabled={!items.length}
              onClick={() => setExportOpen(true)}
              sx={{
                height: '36px',
                fontSize: '13px',
                fontWeight: 600,
                textTransform: 'none',
                borderRadius: '8px',
                gap: '6px',
                px: 2,
                flexShrink: 0
              }}
            >
              <Download size={15} />
              Xuất file
            </Button>
          </div>

          {/* Meta info */}
          {meta && (
            <div
              style={{
                padding: '8px 16px',
                borderBottom: '1px solid #f1f5f9',
                background: '#fafbfc',
                fontSize: '12px',
                color: '#64748b'
              }}
            >
              {meta.total.toLocaleString()} proxy
            </div>
          )}
        </div>

        {/* Table */}
        <div className='table-wrapper' style={{ overflowX: 'auto' }}>
          <table
            className='data-table'
            style={{ minWidth: '900px', ...(isLoading || items.length === 0 ? { height: '100%' } : {}) }}
          >
            <thead className='table-header'>
              {table.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map(header => (
                    <th
                      style={{ minWidth: header.getSize(), width: header.getSize() }}
                      className='table-header th'
                      key={header.id}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {searching ? (
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
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className='py-10 text-center'>
                    <div className='flex flex-col items-center justify-center'>
                      <Image src='/images/no-data.png' alt='No data' width={160} height={160} />
                      <p className='mt-4' style={{ color: '#94a3b8' }}>
                        {meta ? 'Không tìm thấy proxy nào' : 'Nhấn "Tìm kiếm" để bắt đầu'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map(row => {
                  const isExpired = row.original.status === 2

                  return (
                    <tr
                      className='table-row'
                      key={row.id}
                      style={{
                        ...(isExpired ? { opacity: 0.6 } : {})
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
                    value={pageSize}
                    onChange={e => table.setPageSize(Number(e.target.value))}
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
                {totalRows > 0 ? (
                  <span>
                    {startRow} - {endRow} của {totalRows} proxy
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
                page={pageIndex + 1}
                onChange={(_, page) => table.setPageIndex(page - 1)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Edit IP Dialog */}
      <Dialog
        open={!!editItem}
        onClose={() => setEditItem(null)}
        maxWidth='xs'
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ fontSize: 15, fontWeight: 700, pb: 1 }}>Cập nhật IP Whitelist</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: 12, color: '#64748b', mb: 2 }}>
            Chỉ thiết bị có IP này mới kết nối được proxy.
          </Typography>
          <CustomTextField
            fullWidth
            label='Địa chỉ IP'
            placeholder='VD: 123.45.67.89'
            value={editIp}
            onChange={e => setEditIp(e.target.value.replace(/[^0-9.]/g, ''))}
            inputProps={{ maxLength: 15 }}
            helperText='Để trống để xóa IP whitelist'
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setEditItem(null)} color='inherit'>
            Hủy
          </Button>
          <Button onClick={handleSaveIp} variant='contained' disabled={updateIps.isPending}>
            {updateIps.isPending ? 'Đang lưu...' : 'Lưu'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Export Modal */}
      <ExportModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        fileName={`danh-sach-proxy-${new Date().toISOString().slice(0, 10)}`}
        columns={EXPORT_COLUMNS}
        data={items}
      />
    </div>
  )
}

/* ── Sub-components ── */
function CopyBtn({ copied, onClick }: { copied: boolean; onClick: () => void }) {
  return (
    <Tooltip title={copied ? 'Đã copy!' : 'Copy'}>
      <IconButton
        size='small'
        onClick={e => {
          e.stopPropagation()
          onClick()
        }}
        sx={{ p: 0.25, opacity: 0.5, '&:hover': { opacity: 1 } }}
      >
        {copied ? <Check size={11} color='#16a34a' /> : <Copy size={11} color='#94a3b8' />}
      </IconButton>
    </Tooltip>
  )
}

function TypeBadge({ type }: { type: string }) {
  const isRotating = type === 'ROTATING'

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontSize: '11px',
        padding: '2px 8px',
        borderRadius: 99,
        fontWeight: 600,
        background: isRotating ? '#fef3c7' : '#dbeafe',
        color: isRotating ? '#b45309' : '#1d4ed8'
      }}
    >
      {isRotating ? <RefreshCw size={10} /> : <Shield size={10} />}
      {isRotating ? 'Xoay' : 'Tĩnh'}
    </span>
  )
}
