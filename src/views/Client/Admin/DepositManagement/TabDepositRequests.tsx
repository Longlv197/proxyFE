'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import {
  X,
  Clock3,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Ban,
  Eye,
  CalendarDays,
  CircleDollarSign,
  CreditCard,
  ArrowDownUp,
  Landmark,
  BadgeCheck,
  Download,
  Search,
  Loader2
} from 'lucide-react'
import { useReactTable, getCoreRowModel, flexRender, type ColumnDef } from '@tanstack/react-table'
import Chip from '@mui/material/Chip'
import Tooltip from '@mui/material/Tooltip'
import MenuItem from '@mui/material/MenuItem'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Pagination from '@mui/material/Pagination'

import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import TextField from '@mui/material/TextField'
import { toast } from 'react-toastify'

import CustomTextField from '@/@core/components/mui/TextField'
import useMediaQuery from '@/@menu/hooks/useMediaQuery'
import { formatDateTimeLocal } from '@/utils/formatDate'
import { useAdminDeposits, useAdminCreditDeposit } from '@/hooks/apis/useDepositManagement'
import InvestigationDrawer from './InvestigationDrawer'
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

const statusConfig: Record<
  string,
  { label: string; color: 'warning' | 'success' | 'error' | 'default'; icon: React.ReactNode }
> = {
  pending: { label: 'Đang chờ', color: 'warning', icon: <Clock3 size={12} /> },
  success: { label: 'Thành công', color: 'success', icon: <CheckCircle2 size={12} /> },
  failed: { label: 'Thất bại', color: 'error', icon: <XCircle size={12} /> },
  expired: { label: 'Hết hạn', color: 'default', icon: <AlertTriangle size={12} /> },
  cancelled: { label: 'Đã hủy', color: 'default', icon: <Ban size={12} /> }
}

const depositTypeLabels: Record<string, string> = {
  auto: 'Tự động',
  pay2s: 'Pay2s',
  manual: 'Thủ công'
}

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

const EXPORT_COLUMNS: ExportColumn[] = [
  { key: 'created_at', label: 'Thời gian', accessor: r => fmtCsvDate(r.created_at) },
  { key: 'user_name', label: 'Tên user', accessor: r => r.user?.name || '' },
  { key: 'user_email', label: 'Email user', accessor: r => r.user?.email || '' },
  { key: 'user_id', label: 'User ID', accessor: r => String(r.user?.id ?? ''), defaultChecked: false },
  { key: 'amount', label: 'Số tiền', accessor: r => String(r.amount ?? '') },
  { key: 'deposit_type', label: 'Nguồn', accessor: r => depositTypeLabels[r.deposit_type] || r.deposit_type || '' },
  { key: 'gateway', label: 'Ngân hàng', accessor: r => r.gateway || '', defaultChecked: false },
  { key: 'transaction_code', label: 'Mã GD', accessor: r => r.transaction_code || '' },
  {
    key: 'status',
    label: 'Trạng thái',
    accessor: r => statusConfig[r.status]?.label || r.status || ''
  },
  {
    key: 'processed_by',
    label: 'Xử lý bởi',
    accessor: r => {
      if (r.status !== 'success') return ''
      const pb = r.processed_by_user || r.processed_by_relation

      return r.deposit_type === 'manual' ? pb?.name || 'Admin' : 'Tự động'
    },
    defaultChecked: false
  },
  {
    key: 'admin_note',
    label: 'Ghi chú admin',
    accessor: r => r.admin_note || '',
    defaultChecked: false
  }
]

/* ── Styles ── */
const selectSx = {
  minWidth: '140px',
  '& .MuiOutlinedInput-root': { fontSize: '13px', borderRadius: '8px', minHeight: '38px' },
  '& .MuiSelect-select': { paddingBlock: '8.5px' }
}

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
export default function TabDepositRequests() {
  const isMobile = useMediaQuery('768px')

  // Filters — apply ngay khi thay đổi
  const [datePreset, setDatePreset] = useState<string>('today')
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
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
      ...(statusFilter && { status: statusFilter }),
      ...(typeFilter && { deposit_type: typeFilter }),
      ...(searchDebounced && { search: searchDebounced }),
      page: 1,
      per_page: perPage
    }
  }, [datePreset, startDate, endDate, statusFilter, typeFilter, searchDebounced, perPage])

  // Pagination
  const [page, setPage] = useState(1)
  const queryFilters = useMemo(() => ({ ...filters, page }), [filters, page])

  // Reset page khi filter thay đổi
  useEffect(() => {
    setPage(1)
  }, [filters])

  // Export modal
  const [exportOpen, setExportOpen] = useState(false)

  // Investigation drawer
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerBankAutoId, setDrawerBankAutoId] = useState<number | null>(null)
  const [drawerHeaderInfo, setDrawerHeaderInfo] = useState<any>(null)

  // Credit dialog
  const [creditDialog, setCreditDialog] = useState<{ open: boolean; record: any }>({ open: false, record: null })
  const [creditNote, setCreditNote] = useState('')
  const creditMutation = useAdminCreditDeposit()

  const { data: result, isLoading, isFetching } = useAdminDeposits(queryFilters)
  const deposits = result?.data || []
  const meta = result?.meta || { current_page: 1, last_page: 1, total: 0 }
  const summary = result?.summary || {}

  // Open investigation
  const openInvestigation = useCallback((row: any) => {
    setDrawerBankAutoId(row.id)
    setDrawerHeaderInfo({
      amount: row.amount,
      userName: row.user?.name,
      userEmail: row.user?.email,
      gateway: row.gateway
    })
    setDrawerOpen(true)
  }, [])

  const handleDatePreset = useCallback((key: string) => {
    setDatePreset(key)
  }, [])

  const handleClearAll = useCallback(() => {
    setStatusFilter('')
    setTypeFilter('')
    setSearchInput('')
    setSearchDebounced('')
    setPerPage(50)
    setStartDate(null)
    setEndDate(null)
    setDatePreset('today')
  }, [])

  const hasFilters = !!(statusFilter || typeFilter || searchInput || perPage !== 50)

  // Columns
  const columns = useMemo<ColumnDef<any>[]>(
    () => [
      {
        id: 'created_at',
        header: 'Thời gian',
        size: 140,
        cell: ({ row }) => (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <CalendarDays size={13} color='#94a3b8' />
            <span style={{ fontSize: 12 }}>
              {row.original.created_at ? formatDateTimeLocal(row.original.created_at) : '—'}
            </span>
          </div>
        )
      },
      {
        id: 'user',
        header: 'User',
        size: 180,
        cell: ({ row }) => {
          const u = row.original.user

          return u ? (
            <div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{u.name}</div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>{u.email}</div>
            </div>
          ) : (
            <span style={{ fontSize: 12, color: '#94a3b8' }}>—</span>
          )
        }
      },
      {
        id: 'amount',
        header: 'Số tiền',
        size: 120,
        cell: ({ row }) => (
          <span style={{ fontSize: 13, fontWeight: 600, color: '#16a34a' }}>+{fmtMoney(row.original.amount)}đ</span>
        )
      },
      {
        id: 'deposit_type',
        header: 'Nguồn',
        size: 90,
        cell: ({ row }) => (
          <Chip
            label={depositTypeLabels[row.original.deposit_type] || row.original.deposit_type || '—'}
            size='small'
            variant='outlined'
            sx={{ fontSize: 11 }}
          />
        )
      },
      {
        id: 'status',
        header: 'Trạng thái',
        size: 110,
        cell: ({ row }) => {
          const cfg = statusConfig[row.original.status] || statusConfig.pending

          return (
            <Chip
              icon={cfg.icon as any}
              label={cfg.label}
              size='small'
              color={cfg.color}
              variant={row.original.status === 'pending' ? 'filled' : 'outlined'}
              sx={{ fontSize: 11 }}
            />
          )
        }
      },
      {
        id: 'processed_by',
        header: 'Xử lý bởi',
        size: 120,
        cell: ({ row }) => {
          const r = row.original
          const pb = r.processed_by_user || r.processed_by_relation

          if (r.status !== 'success') return <span style={{ fontSize: 12, color: '#d1d5db' }}>—</span>

          // processed_by có thể là object (relation) hoặc number (ID)
          const adminName =
            pb?.name ||
            (typeof r.processed_by === 'object' ? r.processed_by?.name : null) ||
            (typeof r.processed_by === 'number' ? `Admin #${r.processed_by}` : null)

          return (
            <span style={{ fontSize: 12, color: '#64748b' }}>
              {r.deposit_type === 'manual' ? adminName || 'Admin' : 'Tự động'}
            </span>
          )
        }
      },
      {
        id: 'actions',
        header: '',
        size: 90,
        cell: ({ row }) => {
          const r = row.original
          const canCredit = r.status === 'expired' || r.status === 'pending'

          return (
            <div style={{ display: 'flex', gap: 4 }}>
              <Tooltip title='Điều tra'>
                <IconButton size='small' onClick={() => openInvestigation(r)}>
                  <Eye size={16} />
                </IconButton>
              </Tooltip>
              {canCredit && (
                <Tooltip title='Cộng tiền thủ công'>
                  <IconButton
                    size='small'
                    color='success'
                    onClick={() => {
                      setCreditDialog({ open: true, record: r })
                      setCreditNote(r.status === 'expired' ? 'Admin nạp tiền thủ công do lệnh hết hạn' : '')
                    }}
                  >
                    <CircleDollarSign size={16} />
                  </IconButton>
                </Tooltip>
              )}
            </div>
          )
        }
      }
    ],
    [openInvestigation]
  )

  const table = useReactTable({
    data: deposits,
    columns,
    getCoreRowModel: getCoreRowModel()
  })

  return (
    <div className='orders-content'>
      <div className='table-container'>
        <div>
          {/* Header + guidance */}
          <div className='table-toolbar w-full'>
            <div className='header-left'>
              <div className='page-icon'>
                <CreditCard size={17} />
              </div>
              <div>
                <h5 className='mb-0 font-semibold'>Quản lý lệnh nạp tiền</h5>
                <p style={{ fontSize: '12px', color: 'var(--mui-palette-text-disabled, #94a3b8)', margin: 0 }}>
                  Xem và quản lý các lệnh nạp tiền của khách hàng. Click vào một lệnh để xem chi tiết và điều tra nếu
                  cần.
                </p>
              </div>
            </div>
          </div>
          {/* Summary Cards */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '12px',
              padding: '12px 16px',
              borderBottom: '1px solid var(--border-color, #e2e8f0)'
            }}
          >
            <SummaryCard icon={<ArrowDownUp size={18} />} label='Tổng lệnh' value={summary.total} color='#6366f1' />

            <SummaryCard
              icon={<Landmark size={18} />}
              label='Đang chờ'
              value={summary.count_pending || 0}
              color={(summary.count_pending || 0) > 0 ? '#f59e0b' : '#16a34a'}
            />

            <SummaryCard
              icon={<BadgeCheck size={18} />}
              label='Thành công'
              value={summary.count_success || 0}
              color='#6366f1'
            />

            <SummaryCard
              icon={<CreditCard size={18} />}
              label='Tổng nạp'
              value={`${fmtMoney(summary.total_credited || 0)}đ`}
              color='#ef4444'
            />
          </div>

          {/* Filters */}
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
                paddingTop: 4
              }}
            >
              {/* Date presets */}
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

            {/* Status filter */}
            <CustomTextField
              select
              size='small'
              value={statusFilter}
              onChange={(e: any) => setStatusFilter(e.target.value)}
              sx={selectSx}
              slotProps={{ select: { displayEmpty: true } }}
            >
              <MenuItem value=''>
                <em>Tất cả trạng thái</em>
              </MenuItem>
              <MenuItem value='pending'>Đang chờ</MenuItem>
              <MenuItem value='success'>Thành công</MenuItem>
              <MenuItem value='expired'>Hết hạn</MenuItem>
              <MenuItem value='failed'>Thất bại</MenuItem>
              <MenuItem value='cancelled'>Đã hủy</MenuItem>
            </CustomTextField>

            {/* Deposit type filter */}
            <CustomTextField
              select
              size='small'
              value={typeFilter}
              onChange={(e: any) => setTypeFilter(e.target.value)}
              sx={selectSx}
              slotProps={{ select: { displayEmpty: true } }}
            >
              <MenuItem value=''>
                <em>Tất cả nguồn nạp</em>
              </MenuItem>
              <MenuItem value='auto'>Tự động</MenuItem>
              <MenuItem value='pay2s'>Pay2s</MenuItem>
              <MenuItem value='manual'>Thủ công</MenuItem>
            </CustomTextField>

            {/* Search */}
            <CustomTextField
              size='small'
              placeholder='Tìm user, mã GD...'
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
                <IconButton
                  size='small'
                  onClick={() => setCustomPerPage(false)}
                  sx={{ p: 0.5 }}
                >
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
              disabled={!deposits.length}
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
          <div style={{ overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: 10, background: '#fff' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                {table.getHeaderGroups().map(hg => (
                  <tr key={hg.id} style={{ borderBottom: '1px solid #e5e7eb', background: '#f8fafc' }}>
                    {hg.headers.map(h => (
                      <th
                        key={h.id}
                        style={{
                          padding: '10px 14px',
                          textAlign: 'left',
                          fontSize: 12,
                          fontWeight: 600,
                          color: '#64748b',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {flexRender(h.column.columnDef.header, h.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={columns.length} style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
                      Đang tải...
                    </td>
                  </tr>
                ) : deposits.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length} style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
                      Không có dữ liệu
                    </td>
                  </tr>
                ) : (
                  table.getRowModel().rows.map(row => (
                    <tr
                      key={row.id}
                      onClick={() => openInvestigation(row.original)}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        cursor: 'pointer',
                        background: row.original.status === 'pending' ? '#fffbeb' : undefined
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                      onMouseLeave={e =>
                        (e.currentTarget.style.background = row.original.status === 'pending' ? '#fffbeb' : '')
                      }
                    >
                      {row.getVisibleCells().map(cell => (
                        <td key={cell.id} style={{ padding: '10px 14px' }}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {meta.last_page > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
              <Pagination
                count={meta.last_page}
                page={meta.current_page}
                onChange={(_, p) => setPage(p)}
                size='small'
                color='primary'
              />
            </div>
          )}

          {/* Export Modal */}
          <ExportModal
            open={exportOpen}
            onClose={() => setExportOpen(false)}
            fileName={`lenh-nap-tien-${fmtDate(new Date())}`}
            columns={EXPORT_COLUMNS}
            data={deposits}
          />

          {/* Investigation Drawer */}
          <InvestigationDrawer
            open={drawerOpen}
            onClose={() => {
              setDrawerOpen(false)
              setDrawerBankAutoId(null)
            }}
            source='bank_auto'
            sourceId={drawerBankAutoId}
            headerInfo={drawerHeaderInfo}
          />

          {/* Credit Confirm Dialog */}
          <Dialog
            open={creditDialog.open}
            onClose={() => setCreditDialog({ open: false, record: null })}
            maxWidth='sm'
            fullWidth
          >
            <DialogTitle sx={{ fontWeight: 700, fontSize: '16px' }}>Xác nhận cộng tiền thủ công</DialogTitle>
            <DialogContent>
              {creditDialog.record && (
                <div style={{ marginBottom: 16 }}>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '8px 16px',
                      fontSize: 13,
                      color: '#475569',
                      marginBottom: 16,
                      background: '#f8fafc',
                      padding: 12,
                      borderRadius: 8
                    }}
                  >
                    <div>
                      <strong>Khách hàng:</strong> {creditDialog.record.user?.name || '—'}
                    </div>
                    <div>
                      <strong>Email:</strong> {creditDialog.record.user?.email || '—'}
                    </div>
                    <div>
                      <strong>Số tiền:</strong>{' '}
                      <span style={{ color: '#16a34a', fontWeight: 700 }}>
                        {fmtMoney(creditDialog.record.amount || 0)}đ
                      </span>
                    </div>
                    <div>
                      <strong>Trạng thái hiện tại:</strong>{' '}
                      {statusConfig[creditDialog.record.status]?.label || creditDialog.record.status}
                    </div>
                    <div>
                      <strong>Mã GD:</strong>{' '}
                      <span style={{ fontFamily: 'monospace', fontSize: 12 }}>
                        {creditDialog.record.transaction_code || '—'}
                      </span>
                    </div>
                    <div>
                      <strong>Tạo lúc:</strong>{' '}
                      {creditDialog.record.created_at ? formatDateTimeLocal(creditDialog.record.created_at) : '—'}
                    </div>
                  </div>
                  <TextField
                    fullWidth
                    multiline
                    minRows={2}
                    maxRows={4}
                    label='Ghi chú admin (lý do cộng tiền)'
                    placeholder='VD: Webhook trả muộn, đã xác nhận chuyển khoản qua sao kê ngân hàng'
                    value={creditNote}
                    onChange={e => setCreditNote(e.target.value)}
                    size='small'
                  />
                </div>
              )}
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button variant='outlined' color='inherit' onClick={() => setCreditDialog({ open: false, record: null })}>
                Hủy
              </Button>
              <Button
                variant='contained'
                color='success'
                disabled={creditMutation.isPending}
                onClick={() => {
                  if (!creditDialog.record) return

                  creditMutation.mutate(
                    { id: creditDialog.record.id, adminNote: creditNote || undefined },
                    {
                      onSuccess: data => {
                        if (data?.success) {
                          toast.success(
                            `Đã cộng ${fmtMoney(creditDialog.record.amount)}đ cho ${creditDialog.record.user?.name || 'user'}`
                          )
                          setCreditDialog({ open: false, record: null })
                        } else {
                          toast.error(data?.message || 'Cộng tiền thất bại')
                        }
                      },
                      onError: (err: any) => {
                        toast.error(err?.response?.data?.message || 'Lỗi hệ thống')
                      }
                    }
                  )
                }}
              >
                {creditMutation.isPending ? 'Đang xử lý...' : 'Xác nhận cộng tiền'}
              </Button>
            </DialogActions>
          </Dialog>
        </div>
      </div>
    </div>
  )
}
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
