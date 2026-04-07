'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import Image from 'next/image'

import {
  X,
  Loader2,
  Clock3,
  BadgeCheck,
  CircleAlert,
  ArrowDownUp,
  Landmark,
  CreditCard,
  Eye,
  User as UserIcon,
  CalendarDays,
  Ban,
  Download,
  Search
} from 'lucide-react'
import { useReactTable, getCoreRowModel, flexRender, type ColumnDef } from '@tanstack/react-table'
import Chip from '@mui/material/Chip'
import Tooltip from '@mui/material/Tooltip'
import MenuItem from '@mui/material/MenuItem'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Pagination from '@mui/material/Pagination'

import CustomTextField from '@/@core/components/mui/TextField'
import useMediaQuery from '@/@menu/hooks/useMediaQuery'
import { formatDateTimeLocal } from '@/utils/formatDate'
import { useTransactionBank, useTransactionBankSummary } from '@/hooks/apis/useTransactionBank'
import InvestigationDrawer from '@views/Client/Admin/DepositManagement/InvestigationDrawer'
import AppReactDatepicker from '@/components/AppReactDatepicker'
import ExportModal, { type ExportColumn } from '@/components/UI/ExportModal'

/* ── Helpers ── */
const fmtDate = (d: Date) => {
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()

  return `${dd}-${mm}-${yyyy}`
}

const fmtMoney = (n: number) => new Intl.NumberFormat('vi-VN').format(n)

const fmtCsvDate = (d: string) => {
  if (!d) return ''
  const date = new Date(d)
  const dd = String(date.getDate()).padStart(2, '0')
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const yyyy = date.getFullYear()
  const hh = String(date.getHours()).padStart(2, '0')
  const mi = String(date.getMinutes()).padStart(2, '0')
  const ss = String(date.getSeconds()).padStart(2, '0')

  return `${dd}/${mm}/${yyyy} ${hh}:${mi}:${ss}`
}

const getStatus = (r: any) =>
  r.transfer_type !== 'IN' ? 'Tiền ra' : r.dismissed_at ? 'Đã bỏ qua' : r.is_processed ? 'Đã cộng tiền' : 'Chưa xử lý'

const EXPORT_COLUMNS: ExportColumn[] = [
  { key: 'transaction_date', label: 'Thời gian', accessor: r => fmtCsvDate(r.transaction_date) },
  { key: 'content', label: 'Nội dung', accessor: r => r.content || '' },
  { key: 'transfer_amount', label: 'Số tiền', accessor: r => String(r.transfer_amount ?? '') },
  { key: 'transfer_type', label: 'Loại', accessor: r => r.transfer_type || '' },
  { key: 'gateway', label: 'Ngân hàng', accessor: r => r.gateway || '' },
  {
    key: 'matched_user',
    label: 'Người nhận',
    accessor: r => {
      const u = r.matched_user

      return u ? `${u.name || ''} - ${u.email || ''} (ID: ${u.id})` : ''
    }
  },
  { key: 'user_id', label: 'User ID', accessor: r => String(r.matched_user?.id ?? ''), defaultChecked: false },
  { key: 'user_name', label: 'Tên user', accessor: r => r.matched_user?.name || '', defaultChecked: false },
  { key: 'user_email', label: 'Email user', accessor: r => r.matched_user?.email || '', defaultChecked: false },
  { key: 'status', label: 'Trạng thái', accessor: getStatus }
]

const getDatePreset = (key: string): { start?: string; end?: string } => {
  const now = new Date()
  const end = fmtDate(now)

  switch (key) {
    case 'today':
      return { start: end, end }

    case '7d': {
      const d = new Date()

      d.setDate(d.getDate() - 6)

      return { start: fmtDate(d), end }
    }

    case '30d': {
      const d = new Date()

      d.setDate(d.getDate() - 29)

      return { start: fmtDate(d), end }
    }

    default:
      return {}
  }
}

/* ── Styles ── */
const selectSx = {
  minWidth: '140px',
  '& .MuiOutlinedInput-root': { fontSize: '13px', borderRadius: '8px', minHeight: '38px' },
  '& .MuiSelect-select': { paddingBlock: '8.5px' }
}

const chipSx = { '& .MuiChip-label': { whiteSpace: 'nowrap' as const } }

const presetBtnSx = (active: boolean) => ({
  height: '32px',
  fontSize: '12px',
  fontWeight: active ? 700 : 500,
  textTransform: 'none' as const,
  borderRadius: '16px',
  px: 1.5,
  minWidth: 'auto',
  boxShadow: 'none',
  ...(active
    ? {
        backgroundColor: 'var(--mui-palette-primary-main)',
        color: '#fff',
        '&:hover': { backgroundColor: 'var(--mui-palette-primary-dark)' }
      }
    : {
        backgroundColor: 'var(--mui-palette-action-hover, #f1f5f9)',
        color: 'var(--mui-palette-text-secondary)',
        '&:hover': { backgroundColor: '#e2e8f0' }
      })
})

/* ── Component ── */
export default function TableTransactionBank() {
  const isMobile = useMediaQuery('768px')

  // Date preset
  const [datePreset, setDatePreset] = useState<string>('today')

  // Filters — apply ngay khi thay đổi
  const [gateway, setGateway] = useState('')
  const [processed, setProcessed] = useState('')
  const [type, setType] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [searchDebounced, setSearchDebounced] = useState('')
  const [perPage, setPerPage] = useState(50)
  const [customPerPage, setCustomPerPage] = useState(false)
  const [customPerPageInput, setCustomPerPageInput] = useState('')
  const [startDate, setStartDate] = useState<Date | null>(null)
  const [endDate, setEndDate] = useState<Date | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)

  // Debounce search input
  useEffect(() => {
    debounceRef.current = setTimeout(() => setSearchDebounced(searchInput), 400)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [searchInput])

  // Custom date range
  const applyCustomRange = useCallback((start: Date | null, end: Date | null) => {
    if (start && end) {
      setDatePreset('custom')
    }
  }, [])

  // Build filters from state
  const filters = useMemo(() => {
    const dateRange =
      datePreset === 'custom' && startDate && endDate
        ? { start: fmtDate(startDate), end: fmtDate(endDate) }
        : getDatePreset(datePreset)

    return {
      ...dateRange,
      ...(gateway ? { gateway } : {}),
      ...(processed !== '' ? { is_processed: processed } : {}),
      ...(type ? { transfer_type: type } : {}),
      ...(searchDebounced ? { search: searchDebounced } : {}),
      page: 1,
      per_page: perPage
    }
  }, [datePreset, startDate, endDate, gateway, processed, type, searchDebounced, perPage])

  // Pagination
  const [page, setPage] = useState(1)
  const queryFilters = useMemo(() => ({ ...filters, page }), [filters, page])

  // Reset page khi filter thay đổi
  useEffect(() => {
    setPage(1)
  }, [filters])

  const handleDatePreset = useCallback((key: string) => {
    setDatePreset(key)
  }, [])

  const handleClearAll = useCallback(() => {
    setGateway('')
    setProcessed('')
    setType('')
    setSearchInput('')
    setSearchDebounced('')
    setPerPage(50)
    setStartDate(null)
    setEndDate(null)
    setDatePreset('today')
  }, [])

  const hasFilters = !!(gateway || processed !== '' || type || searchInput || perPage !== 50)

  // Export modal
  const [exportOpen, setExportOpen] = useState(false)

  // Investigation drawer
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerRow, setDrawerRow] = useState<any>(null)

  // Data
  const { data: apiResponse, isLoading, isFetching } = useTransactionBank(queryFilters)
  const summaryParams = useMemo(() =>
    datePreset === 'custom' && startDate && endDate
      ? { start: fmtDate(startDate), end: fmtDate(endDate) }
      : getDatePreset(datePreset),
    [datePreset, startDate, endDate]
  )
  const { data: summary } = useTransactionBankSummary(summaryParams)

  const dataList = useMemo(() => apiResponse?.data ?? [], [apiResponse])
  const meta = apiResponse?.meta

  // Open drawer
  const openDrawer = useCallback((row: any) => {
    setDrawerRow(row)
    setDrawerOpen(true)
  }, [])

  // Columns
  const columns: ColumnDef<any, any>[] = useMemo(
    () => [
      {
        accessorKey: 'transaction_date',
        header: 'Thời gian',
        size: 145,
        cell: ({ row }: { row: any }) => (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              color: 'var(--mui-palette-text-secondary, #64748b)'
            }}
          >
            <Clock3 size={13} />
            <span style={{ fontSize: '12px' }}>{formatDateTimeLocal(row.original.transaction_date)}</span>
          </div>
        )
      },
      {
        accessorKey: 'content',
        header: 'Nội dung chuyển khoản',
        size: isMobile ? 280 : 230,
        cell: ({ row }: { row: any }) => (
          <Tooltip title={row.original.content || ''} placement='top'>
            <span
              style={{
                fontSize: '13px',
                display: 'block',
                maxWidth: '230px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                ...(row.original.dismissed_at ? { textDecoration: 'line-through', color: '#94a3b8' } : {})
              }}
            >
              {row.original.content || '—'}
            </span>
          </Tooltip>
        )
      },
      {
        accessorKey: 'transfer_amount',
        header: 'Số tiền',
        size: 130,
        cell: ({ row }: { row: any }) => (
          <span
            style={{
              fontWeight: 600,
              fontSize: '13px',
              color: row.original.dismissed_at ? '#94a3b8' : row.original.transfer_type === 'IN' ? '#16a34a' : '#dc2626'
            }}
          >
            {row.original.transfer_type === 'IN' ? '+' : '-'}
            {fmtMoney(row.original.transfer_amount)} đ
          </span>
        )
      },
      {
        accessorKey: 'gateway',
        header: 'Ngân hàng',
        size: 90,
        cell: ({ row }: { row: any }) => (
          <Chip label={row.original.gateway || '—'} size='small' variant='outlined' sx={chipSx} />
        )
      },
      {
        id: 'matched_user',
        header: 'Người nhận',
        size: 160,
        cell: ({ row }: { row: any }) => {
          const user = row.original.matched_user

          if (!user) {
            if (row.original.transfer_type !== 'IN')
              return <span style={{ color: '#94a3b8', fontSize: '12px' }}>—</span>
            if (row.original.dismissed_at)
              return <span style={{ color: '#94a3b8', fontSize: '12px', fontStyle: 'italic' }}>Đã bỏ qua</span>

            return <span style={{ color: '#f59e0b', fontSize: '12px', fontStyle: 'italic' }}>Chưa xác định</span>
          }

          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <UserIcon size={13} style={{ color: '#6366f1', flexShrink: 0 }} />
              <span style={{ fontSize: '12px', fontWeight: 500 }}>{user.name || user.email}</span>
            </div>
          )
        }
      },
      {
        accessorKey: 'is_processed',
        header: 'Trạng thái',
        size: 130,
        cell: ({ row }: { row: any }) => {
          if (row.original.transfer_type !== 'IN') {
            return <Chip label='Tiền ra' size='small' variant='outlined' sx={chipSx} />
          }

          if (row.original.dismissed_at) {
            return (
              <Chip
                label='Đã bỏ qua'
                size='small'
                icon={<Ban size={14} />}
                variant='outlined'
                sx={{ ...chipSx, color: '#94a3b8', borderColor: '#d1d5db' }}
              />
            )
          }

          return row.original.is_processed ? (
            <Chip label='Đã cộng tiền' size='small' icon={<BadgeCheck size={14} />} color='success' sx={chipSx} />
          ) : (
            <Chip
              label='Chưa xử lý'
              size='small'
              icon={<CircleAlert size={14} />}
              color='warning'
              sx={{
                ...chipSx,
                '& .MuiChip-label': { color: '#fff', whiteSpace: 'nowrap' },
                '& .MuiChip-icon': { color: '#fff' }
              }}
            />
          )
        }
      },
      {
        id: 'actions',
        header: 'Thao tác',
        size: 50,
        cell: ({ row }: { row: any }) => (
          <Tooltip title='Điều tra'>
            <IconButton
              size='small'
              onClick={() => openDrawer(row.original)}
              sx={{
                color: 'var(--mui-palette-text-disabled)',
                '&:hover': { color: 'var(--mui-palette-primary-main)' }
              }}
            >
              <Eye size={15} />
            </IconButton>
          </Tooltip>
        )
      }
    ],
    [isMobile, openDrawer]
  )

  const table = useReactTable({
    data: dataList,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row: any) => String(row.id),
    manualPagination: true,
    pageCount: meta?.last_page ?? 1
  })

  return (
    <div className='orders-content'>
      <div className='table-container'>
        {/* Header + guidance */}
        <div className='table-toolbar w-full'>
          <div className='header-left'>
            <div className='page-icon'>
              <CreditCard size={17} />
            </div>
            <div>
              <h5 className='mb-0 font-semibold'>Giao dịch ngân hàng</h5>
              <p style={{ fontSize: '12px', color: 'var(--mui-palette-text-disabled, #94a3b8)', margin: 0 }}>
                Tiền chuyển khoản từ ngân hàng — click vào giao dịch để điều tra chi tiết
              </p>
            </div>
          </div>
        </div>

        {/* Summary cards */}
        {summary && (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '12px',
              padding: '12px 16px',
              borderBottom: '1px solid var(--border-color, #e2e8f0)'
            }}
          >
            <SummaryCard
              icon={<ArrowDownUp size={18} />}
              label='Tổng giao dịch'
              value={summary.total}
              color='#6366f1'
            />
            <SummaryCard
              icon={<Landmark size={18} />}
              label='Tổng tiền vào'
              value={`${fmtMoney(summary.total_in)} đ`}
              color='#16a34a'
            />
            <SummaryCard
              icon={<BadgeCheck size={18} />}
              label='Đã cộng tiền'
              value={summary.count_processed}
              color='#0ea5e9'
            />
            <SummaryCard
              icon={<CreditCard size={18} />}
              label='Tổng tiền đã nhận'
              value={`${fmtMoney(summary.total_processed || 0)} đ`}
              color='#059669'
              highlight={summary.total_processed > 0}
            />
            <SummaryCard
              icon={<CircleAlert size={18} />}
              label='Chưa xử lý'
              value={summary.count_unprocessed}
              color={summary.count_unprocessed > 0 ? '#ef4444' : '#22c55e'}
              highlight={summary.count_unprocessed > 0}
            />
            {(summary.count_dismissed || 0) > 0 && (
              <SummaryCard icon={<Ban size={18} />} label='Đã bỏ qua' value={summary.count_dismissed} color='#94a3b8' />
            )}
          </div>
        )}

        {/* Filter bar */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 16px',
            borderBottom: '1px solid var(--border-color, #e2e8f0)',
            background: 'var(--mui-palette-background-default, #f8fafc)'
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 16px',
              borderBottom: '1px solid var(--border-color, #e2e8f0)'
            }}
          >
            <CalendarDays size={14} style={{ color: 'var(--mui-palette-text-disabled)', marginRight: '4px' }} />
            {datePreset === 'custom' ? (
              <>
                <Button
                  size='small'
                  variant='text'
                  onClick={() => handleDatePreset('today')}
                  sx={{ ...presetBtnSx(false), fontSize: '12px', gap: '4px' }}
                >
                  <X size={12} /> Quay lại
                </Button>
                <AppReactDatepicker
                  selected={startDate}
                  onChange={(date: Date | null) => {
                    setStartDate(date)
                    applyCustomRange(date, endDate)
                  }}
                  selectsStart
                  startDate={startDate}
                  endDate={endDate}
                  dateFormat='dd/MM/yyyy'
                  placeholderText='Từ ngày'
                  className='w-28 px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#0B6FFF]'
                  maxDate={new Date()}
                />
                <span className='text-gray-400'>—</span>
                <AppReactDatepicker
                  selected={endDate}
                  onChange={(date: Date | null) => {
                    setEndDate(date)
                    applyCustomRange(startDate, date)
                  }}
                  selectsEnd
                  startDate={startDate}
                  endDate={endDate}
                  minDate={startDate}
                  dateFormat='dd/MM/yyyy'
                  placeholderText='Đến ngày'
                  className='w-28 px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#0B6FFF]'
                  maxDate={new Date()}
                />
              </>
            ) : (
              (
                [
                  ['today', 'Hôm nay'],
                  ['7d', '7 ngày'],
                  ['30d', '30 ngày'],
                  ['all', 'Tất cả'],
                  ['custom', 'Tùy chọn']
                ] as const
              ).map(([key, label]) => (
                <Button
                  key={key}
                  size='small'
                  variant='text'
                  onClick={() => handleDatePreset(key)}
                  sx={presetBtnSx(datePreset === key)}
                >
                  {label}
                </Button>
              ))
            )}
          </div>
          <CustomTextField
            select
            size='small'
            value={gateway}
            onChange={e => setGateway(e.target.value)}
            sx={selectSx}
            slotProps={{ select: { displayEmpty: true } }}
          >
            <MenuItem value=''>
              <em>Tất cả ngân hàng</em>
            </MenuItem>
            {['VCB', 'MB', 'TCB', 'ACB', 'BIDV', 'VPB', 'TPB', 'STB'].map(g => (
              <MenuItem key={g} value={g}>
                {g}
              </MenuItem>
            ))}
          </CustomTextField>

          <CustomTextField
            select
            size='small'
            value={processed}
            onChange={e => setProcessed(e.target.value)}
            sx={selectSx}
            slotProps={{ select: { displayEmpty: true } }}
          >
            <MenuItem value=''>
              <em>Tất cả trạng thái</em>
            </MenuItem>
            <MenuItem value='1'>Đã cộng tiền</MenuItem>
            <MenuItem value='0'>Chưa xử lý</MenuItem>
            <MenuItem value='dismissed'>Đã bỏ qua</MenuItem>
          </CustomTextField>

          <CustomTextField
            select
            size='small'
            value={type}
            onChange={e => setType(e.target.value)}
            sx={{ ...selectSx, minWidth: '120px' }}
            slotProps={{ select: { displayEmpty: true } }}
          >
            <MenuItem value=''>
              <em>Tất cả loại</em>
            </MenuItem>
            <MenuItem value='IN'>Tiền vào</MenuItem>
            <MenuItem value='OUT'>Tiền ra</MenuItem>
          </CustomTextField>

          <CustomTextField
            size='small'
            placeholder='Tìm nội dung / mã GD...'
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            sx={{
              minWidth: '200px',
              '& .MuiOutlinedInput-root': { fontSize: '13px', borderRadius: '8px', minHeight: '38px' }
            }}
            slotProps={{
              input: {
                endAdornment: isFetching ? (
                  <Loader2 size={14} style={{ animation: 'spin 1s linear infinite', color: '#94a3b8' }} />
                ) : searchInput ? (
                  <IconButton
                    size='small'
                    onClick={() => {
                      setSearchInput('')
                      setSearchDebounced('')
                    }}
                    sx={{ p: 0.25 }}
                  >
                    <X size={14} />
                  </IconButton>
                ) : null
              }
            }}
          />

          {customPerPage ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <CustomTextField
                size='small'
                type='number'
                placeholder='Số dòng'
                value={customPerPageInput}
                onChange={e => setCustomPerPageInput(e.target.value)}
                onKeyDown={(e: React.KeyboardEvent) => {
                  if (e.key === 'Enter') {
                    const n = Math.max(1, Math.min(2000, parseInt(customPerPageInput, 10) || 50))

                    setPerPage(n)
                    setCustomPerPage(false)
                  } else if (e.key === 'Escape') {
                    setCustomPerPage(false)
                  }
                }}
                autoFocus
                sx={{
                  width: '90px',
                  '& .MuiOutlinedInput-root': { fontSize: '13px', borderRadius: '8px', minHeight: '38px' },
                  '& input': { textAlign: 'center', MozAppearance: 'textfield' },
                  '& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button': { WebkitAppearance: 'none' }
                }}
                slotProps={{ htmlInput: { min: 1, max: 2000 } }}
              />
              <IconButton
                size='small'
                color='primary'
                onClick={() => {
                  const n = Math.max(1, Math.min(2000, parseInt(customPerPageInput, 10) || 50))

                  setPerPage(n)
                  setCustomPerPage(false)
                }}
                sx={{ p: 0.5 }}
              >
                <Search size={14} />
              </IconButton>
              <IconButton size='small' onClick={() => setCustomPerPage(false)} sx={{ p: 0.5 }}>
                <X size={14} />
              </IconButton>
            </div>
          ) : (
            <CustomTextField
              select
              size='small'
              value={[20, 50, 100, 200].includes(perPage) ? perPage : 'custom'}
              onChange={e => {
                if (e.target.value === 'custom') {
                  setCustomPerPageInput(String(perPage))
                  setCustomPerPage(true)
                } else {
                  setPerPage(Number(e.target.value))
                }
              }}
              sx={{ ...selectSx, minWidth: '110px' }}
            >
              {[20, 50, 100, 200].map(n => (
                <MenuItem key={n} value={n}>
                  {n} / trang
                </MenuItem>
              ))}
              <MenuItem value='custom'>
                <em>{![20, 50, 100, 200].includes(perPage) ? `${perPage} / trang` : 'Tùy chọn...'}</em>
              </MenuItem>
            </CustomTextField>
          )}

          <Button
            variant='outlined'
            size='small'
            disabled={!dataList.length}
            onClick={() => setExportOpen(true)}
            sx={{
              height: '36px',
              fontSize: '13px',
              fontWeight: 600,
              textTransform: 'none',
              borderRadius: '8px',
              gap: '6px',
              px: 2
            }}
          >
            <Download size={15} />
            Xuất file
          </Button>

          {hasFilters && (
            <Tooltip title='Đặt lại bộ lọc'>
              <IconButton
                size='small'
                onClick={handleClearAll}
                sx={{
                  color: 'var(--mui-palette-text-disabled, #94a3b8)',
                  '&:hover': { color: '#ef4444', backgroundColor: 'rgba(239,68,68,0.08)' }
                }}
              >
                <X size={16} />
              </IconButton>
            </Tooltip>
          )}
        </div>

        {/* Table */}
        <div className='table-wrapper' style={{ overflowX: 'auto' }}>
          <table
            className='data-table'
            style={{ minWidth: '1000px', ...(isLoading || dataList.length === 0 ? { height: '100%' } : {}) }}
          >
            <thead className='table-header'>
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
              ) : table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className='py-10 text-center'>
                    <div className='flex flex-col items-center justify-center'>
                      <Image src='/images/no-data.png' alt='No data' width={160} height={160} />
                      <p className='mt-4' style={{ color: 'var(--mui-palette-text-disabled, #94a3b8)' }}>
                        Không có giao dịch nào trong khoảng thời gian này
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map(row => {
                  const isDismissed = !!row.original.dismissed_at
                  const isUnprocessedIn =
                    row.original.transfer_type === 'IN' && !row.original.is_processed && !isDismissed

                  return (
                    <tr
                      className='table-row'
                      key={row.id}
                      style={{
                        cursor: 'pointer',
                        ...(isDismissed
                          ? { opacity: 0.5 }
                          : isUnprocessedIn
                            ? { backgroundColor: 'rgba(245, 158, 11, 0.04)' }
                            : {})
                      }}
                      onClick={() => openDrawer(row.original)}
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
        {!isLoading && meta && meta.last_page > 1 && (
          <div
            style={{
              padding: '10px 16px',
              borderTop: '1px solid var(--border-color, #e2e8f0)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <span style={{ fontSize: '13px', color: 'var(--mui-palette-text-secondary, #64748b)' }}>
              Tổng {fmtMoney(meta.total)} giao dịch
            </span>
            <Pagination
              count={meta.last_page}
              page={meta.current_page}
              onChange={(_, p) => setPage(p)}
              size='small'
              color='primary'
            />
          </div>
        )}
      </div>

      {/* Investigation Drawer */}
      <InvestigationDrawer
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false)
          setDrawerRow(null)
        }}
        source='transaction_bank'
        sourceId={drawerRow?.id || null}
        transactionBankId={drawerRow?.id || null}
        headerInfo={
          drawerRow
            ? {
                amount: drawerRow.transfer_amount,
                userName: drawerRow.matched_user?.name,
                userEmail: drawerRow.matched_user?.email,
                gateway: drawerRow.gateway
              }
            : undefined
        }
      />

      {/* Export Modal */}
      <ExportModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        fileName={`giao-dich-ngan-hang-${fmtDate(new Date())}`}
        columns={EXPORT_COLUMNS}
        data={dataList}
      />
    </div>
  )
}

/* ── Summary Card ── */
function SummaryCard({
  icon,
  label,
  value,
  color,
  highlight
}: {
  icon: React.ReactNode
  label: string
  value: any
  color: string
  highlight?: boolean
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '10px 16px',
        borderRadius: '10px',
        border: highlight ? `2px solid ${color}` : '1px solid var(--border-color, #e2e8f0)',
        background: highlight ? `${color}08` : 'var(--mui-palette-background-paper, #fff)',
        minWidth: '160px'
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: '8px',
          background: `${color}15`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color
        }}
      >
        {icon}
      </div>
      <div>
        <div
          style={{
            fontSize: '11px',
            color: 'var(--mui-palette-text-disabled, #94a3b8)',
            textTransform: 'uppercase',
            fontWeight: 600
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontSize: '16px',
            fontWeight: 700,
            color: highlight ? color : 'var(--mui-palette-text-primary, #1e293b)'
          }}
        >
          {value}
        </div>
      </div>
    </div>
  )
}
