'use client'

import { useMemo, useState, useCallback, useDeferredValue, memo, useEffect } from 'react'

import Image from 'next/image'

import {
  List,
  SquarePen,
  Wallet,
  ShieldX,
  ShieldCheck,
  KeyRound,
  Users,
  UserPlus,
  BadgeCheck,
  BadgeMinus,
  Search,
  Loader2,
  History,
  Tags,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Settings2,
  UserCheck
} from 'lucide-react'

import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  flexRender
} from '@tanstack/react-table'
import type { VisibilityState } from '@tanstack/react-table'

import Menu from '@mui/material/Menu'
import FormControlLabel from '@mui/material/FormControlLabel'
import Checkbox from '@mui/material/Checkbox'

import Chip from '@mui/material/Chip'
import Pagination from '@mui/material/Pagination'

import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  Tooltip,
  IconButton,
  TextField,
  InputAdornment,
  Card,
  CardContent,
  Typography
} from '@mui/material'

import Grid2 from '@mui/material/Grid2'

import { toast } from 'react-toastify'

import { useAdminUsers, useAdminUserStats, useToggleBan, useUpdateUserStatus, useResetPassword } from '@/hooks/apis/useAdminUsers'
import type { AdminUser, UserStats } from '@/hooks/apis/useAdminUsers'

interface TableUsersProps {
  onEditUser?: (user: any) => void
  onAdjustBalance?: (user: any) => void
  onViewTransactions?: (user: any) => void
  onProviderPricing?: (user: any) => void
}

const formatVND = (value: number) => {
  return new Intl.NumberFormat('vi-VN').format(value) + 'đ'
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return '-'
  const d = new Date(dateStr)

  
return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function StatCard({ title, value, icon: Icon, color }: { title: string; value: string | number; icon: any; color: string }) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2, '&:last-child': { pb: 2 } }}>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            backgroundColor: color + '20',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}
        >
          <Icon size={24} color={color} />
        </div>
        <div>
          <Typography variant='body2' color='text.secondary' sx={{ mb: 0.5 }}>
            {title}
          </Typography>
          <Typography variant='h6' fontWeight={600}>
            {value}
          </Typography>
        </div>
      </CardContent>
    </Card>
  )
}

export default memo(function TableUsers({ onEditUser, onAdjustBalance, onViewTransactions, onProviderPricing }: TableUsersProps) {
  // API fetch limit (mặc định 100, tối đa 20000)
  const [fetchLimit, setFetchLimit] = useState(100)
  const [fetchLimitInput, setFetchLimitInput] = useState('100')
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')

  // Client-side display pagination
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 })

  // Sort state — gửi lên BE để query sort
  const [sortBy, setSortBy] = useState<string>('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // Column visibility — persist localStorage
  const VISIBILITY_KEY = 'admin_users_column_visibility_v1'
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(() => {
    if (typeof window === 'undefined') return {}

    try { return JSON.parse(localStorage.getItem(VISIBILITY_KEY) || '{}') } catch { return {} }
  })

  // Persist visibility
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try { localStorage.setItem(VISIBILITY_KEY, JSON.stringify(columnVisibility)) } catch { /* ignore */ }
    }
  }, [columnVisibility])

  // Click header → toggle sort
  const handleSort = useCallback((field: string) => {
    if (sortBy === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortBy(field)
      setSortOrder('desc')
    }
  }, [sortBy])

  // Header cell with sort
  const SortHeader = ({ field, label }: { field: string; label: string }) => {
    const isActive = sortBy === field
    const Icon = isActive ? (sortOrder === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown

    return (
      <span
        onClick={() => handleSort(field)}
        style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, userSelect: 'none' }}
      >
        {label}
        <Icon size={12} color={isActive ? '#2563eb' : '#94a3b8'} />
      </span>
    )
  }

  // Column visibility menu
  const [visAnchor, setVisAnchor] = useState<HTMLElement | null>(null)

  const [banDialogOpen, setBanDialogOpen] = useState(false)
  const [userToBan, setUserToBan] = useState<any>(null)

  const [resetPwDialogOpen, setResetPwDialogOpen] = useState(false)
  const [userToResetPw, setUserToResetPw] = useState<any>(null)
  const [newPassword, setNewPassword] = useState('')
  const [generatedPassword, setGeneratedPassword] = useState('')

  const { data: response, isLoading, isFetching } = useAdminUsers({ page: 1, per_page: fetchLimit, search, sort_by: sortBy, sort_order: sortOrder })
  const { data: stats } = useAdminUserStats()
  const toggleBanMutation = useToggleBan()
  const updateStatusMutation = useUpdateUserStatus()
  const [selectedStatus, setSelectedStatus] = useState<number>(1)
  const resetPasswordMutation = useResetPassword()

  const rawUsers: AdminUser[] = response?.data ?? []
  const users = useDeferredValue(rawUsers)
  const meta = response?.meta ?? { current_page: 1, last_page: 1, per_page: 100, total: 0 }
  const userStats: UserStats = stats ?? { total_users: 0, new_users_this_month: 0, total_balance: 0, total_deposited: 0 }

  const handleSearch = useCallback(() => {
    setSearch(searchInput)
    const val = Math.max(1, Math.min(20000, Number(fetchLimitInput) || 100))

    setFetchLimit(val)
    setFetchLimitInput(String(val))
    setPagination(prev => ({ ...prev, pageIndex: 0 }))
  }, [searchInput, fetchLimitInput])

  const handleSearchKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleSearch()
      }
    },
    [handleSearch]
  )

  // Ban/Unban
  const handleOpenBanDialog = useCallback((user: any) => {
    setUserToBan(user)
    setSelectedStatus(user?.status ?? 1)
    setBanDialogOpen(true)
  }, [])

  const handleCloseBanDialog = useCallback(() => {
    setBanDialogOpen(false)
    setUserToBan(null)
  }, [])

  const handleConfirmBan = useCallback(() => {
    if (!userToBan) return
    updateStatusMutation.mutate(
      { userId: userToBan.id, status: selectedStatus },
      {
        onSuccess: () => {
          handleCloseBanDialog()
        },
        onError: (error: any) => {
          toast.error(error?.response?.data?.message || 'Có lỗi xảy ra')
        }
      }
    )
  }, [userToBan, selectedStatus, updateStatusMutation, handleCloseBanDialog])

  // Reset Password
  const handleOpenResetPwDialog = useCallback((user: any) => {
    setUserToResetPw(user)
    setNewPassword('')
    setGeneratedPassword('')
    setResetPwDialogOpen(true)
  }, [])

  const handleCloseResetPwDialog = useCallback(() => {
    setResetPwDialogOpen(false)
    setUserToResetPw(null)
    setNewPassword('')
    setGeneratedPassword('')
  }, [])

  const handleConfirmResetPw = useCallback(() => {
    if (!userToResetPw) return
    resetPasswordMutation.mutate(
      { userId: userToResetPw.id, new_password: newPassword || undefined },
      {
        onSuccess: (data) => {
          const pw = data?.data?.new_password

          setGeneratedPassword(pw)
          toast.success(data?.message || 'Đã reset mật khẩu')
        },
        onError: (error: any) => {
          toast.error(error?.response?.data?.message || 'Có lỗi xảy ra')
        }
      }
    )
  }, [userToResetPw, newPassword, resetPasswordMutation])

  const columns = useMemo(
    () => [
      {
        accessorKey: 'id',
        id: 'id',
        header: () => <SortHeader field='id' label='ID' />,
        size: 60
      },
      {
        id: 'user',
        header: 'User',
        cell: ({ row }: { row: any }) => (
          <div>
            <div className='font-bold'>{row.original?.name || '-'}</div>
            <div className='text-xs text-gray-500'>{row.original?.email || '-'}</div>
          </div>
        ),
        size: 250
      },
      {
        id: 'phone',
        header: 'SĐT',
        cell: ({ row }: { row: any }) => row.original?.phone || '-',
        size: 120
      },
      {
        id: 'sodu',
        header: () => <SortHeader field='sodu' label='Số dư' />,
        cell: ({ row }: { row: any }) => (
          <span className='font-semibold' style={{ color: '#059669' }}>{formatVND(row.original?.sodu ?? 0)}</span>
        ),
        size: 130
      },
      {
        id: 'sotiennap',
        header: () => <SortHeader field='sotiennap' label='Tổng nạp' />,
        cell: ({ row }: { row: any }) => formatVND(row.original?.sotiennap ?? 0),
        size: 130
      },
      {
        id: 'chitieu',
        header: () => <SortHeader field='chitieu' label='Đã tiêu' />,
        cell: ({ row }: { row: any }) => formatVND(row.original?.chitieu ?? 0),
        size: 130
      },
      {
        id: 'affiliate_code',
        header: 'Mã affiliate',
        cell: ({ row }: { row: any }) => (
          row.original?.affiliate_code
            ? <code style={{ fontSize: 11, background: '#f1f5f9', padding: '2px 6px', borderRadius: 4, fontFamily: 'monospace' }}>{row.original.affiliate_code}</code>
            : <span style={{ color: '#cbd5e1' }}>—</span>
        ),
        size: 120
      },
      {
        id: 'affiliate_balance',
        header: () => <SortHeader field='affiliate_balance' label='Số dư AF' />,
        cell: ({ row }: { row: any }) => (
          <span style={{ color: (row.original?.affiliate_balance ?? 0) > 0 ? '#7c3aed' : undefined }}>
            {formatVND(Number(row.original?.affiliate_balance ?? 0))}
          </span>
        ),
        size: 130
      },
      {
        id: 'affiliate_spent',
        header: () => <SortHeader field='affiliate_spent' label='Đã tiêu AF' />,
        cell: ({ row }: { row: any }) => formatVND(Number(row.original?.affiliate_spent ?? 0)),
        size: 130
      },
      {
        id: 'referrals_count',
        header: 'Đã giới thiệu',
        cell: ({ row }: { row: any }) => {
          const n = row.original?.referrals_count ?? 0
          return n > 0
            ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#0284c7' }}><UserCheck size={13} />{n}</span>
            : <span style={{ color: '#cbd5e1' }}>0</span>
        },
        size: 110
      },
      {
        id: 'affiliate_percent',
        header: 'Hoa hồng %',
        cell: ({ row }: { row: any }) => {
          const p = row.original?.affiliate_percent
          return p != null && p > 0 ? `${p}%` : <span style={{ color: '#cbd5e1' }}>mặc định</span>
        },
        size: 110
      },
      {
        id: 'orders_count',
        header: 'Đơn hàng',
        cell: ({ row }: { row: any }) => row.original?.orders_count ?? 0,
        size: 90
      },
      {
        id: 'status',
        header: 'Trạng thái',
        cell: ({ row }: { row: any }) => {
          const status = row.original?.status ?? 1
          const statusConfig: Record<number, { label: string; color: 'success' | 'warning' | 'error'; icon: React.ReactNode }> = {
            1: { label: 'Hoạt động', color: 'success', icon: <BadgeCheck size={14} /> },
            2: { label: 'Khoá mua', color: 'warning', icon: <BadgeMinus size={14} /> },
            3: { label: 'Cấm', color: 'error', icon: <ShieldX size={14} /> },
          }
          const cfg = statusConfig[status] || statusConfig[1]

          return <Chip label={cfg.label} size='small' icon={cfg.icon as any} color={cfg.color} />
        },
        size: 120
      },
      {
        id: 'created_at',
        header: () => <SortHeader field='created_at' label='Ngày tạo' />,
        cell: ({ row }: { row: any }) => formatDate(row.original?.created_at),
        size: 110
      },
      {
        id: 'actions',
        header: 'Thao tác',
        cell: ({ row }: { row: any }) => {
          const user = row.original

          
return (
            <div className='flex gap-1'>
              <Tooltip title='Sửa thông tin'>
                <IconButton size='small' color='info' onClick={() => onEditUser?.(user)}>
                  <SquarePen size={17} />
                </IconButton>
              </Tooltip>

              <Tooltip title='Cộng/trừ tiền'>
                <IconButton size='small' color='success' onClick={() => onAdjustBalance?.(user)}>
                  <Wallet size={17} />
                </IconButton>
              </Tooltip>

              <Tooltip title='Lịch sử giao dịch'>
                <IconButton size='small' color='primary' onClick={() => onViewTransactions?.(user)}>
                  <History size={17} />
                </IconButton>
              </Tooltip>

              <Tooltip title='Giá theo nhà cung cấp'>
                <IconButton size='small' color='warning' onClick={() => onProviderPricing?.(user)}>
                  <Tags size={17} />
                </IconButton>
              </Tooltip>

              <Tooltip title='Đổi trạng thái'>
                <IconButton
                  size='small'
                  color={user?.status === 3 ? 'error' : user?.status === 2 ? 'warning' : 'default'}
                  onClick={() => handleOpenBanDialog(user)}
                >
                  {user?.status === 3 ? <ShieldX size={17} /> : user?.status === 2 ? <BadgeMinus size={17} /> : <ShieldCheck size={17} />}
                </IconButton>
              </Tooltip>

              <Tooltip title='Reset mật khẩu'>
                <IconButton size='small' color='secondary' onClick={() => handleOpenResetPwDialog(user)}>
                  <KeyRound size={17} />
                </IconButton>
              </Tooltip>
            </div>
          )
        },
        size: 260
      }
    ],
    [onEditUser, onAdjustBalance, onViewTransactions, onProviderPricing, handleOpenBanDialog, handleOpenResetPwDialog]
  )

  const table = useReactTable({
    data: users,
    columns,
    state: { pagination, columnVisibility },
    onPaginationChange: setPagination,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel()
  })

  // Label dropdown ẩn/hiện cột
  const COLUMN_LABELS: Record<string, string> = {
    id: 'ID',
    user: 'User',
    phone: 'SĐT',
    sodu: 'Số dư',
    sotiennap: 'Tổng nạp',
    chitieu: 'Đã tiêu',
    affiliate_code: 'Mã affiliate',
    affiliate_balance: 'Số dư affiliate',
    affiliate_spent: 'Đã tiêu affiliate',
    referrals_count: 'Đã giới thiệu',
    affiliate_percent: 'Hoa hồng %',
    orders_count: 'Đơn hàng',
    status: 'Trạng thái',
    created_at: 'Ngày tạo',
    actions: 'Thao tác',
  }

  const totalRows = users.length
  const { pageIndex, pageSize: displaySize } = pagination
  const startRow = totalRows > 0 ? pageIndex * displaySize + 1 : 0
  const endRow = Math.min(startRow + displaySize - 1, totalRows)

  return (
    <>
      {/* Stats Cards */}
      <Grid2 container spacing={2} sx={{ mb: 3 }}>
        <Grid2 size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard title='Tổng users' value={userStats.total_users} icon={Users} color='#7C3AED' />
        </Grid2>
        <Grid2 size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard title='User mới tháng này' value={userStats.new_users_this_month} icon={UserPlus} color='#2563EB' />
        </Grid2>
        <Grid2 size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard title='Tổng số dư' value={formatVND(userStats.total_balance)} icon={Wallet} color='#059669' />
        </Grid2>
        <Grid2 size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard title='Tổng nạp' value={formatVND(userStats.total_deposited)} icon={Wallet} color='#D97706' />
        </Grid2>
      </Grid2>

      {/* Table */}
      <div className='orders-content'>
        <div className='table-container'>
          <div className='table-toolbar'>
            <div className='header-left'>
              <div className='page-icon'>
                <List size={17} />
              </div>
              <h5 className='mb-0 font-semibold'>Danh sách Users</h5>
            </div>

            <div className='header-right' style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <Tooltip title='Ẩn/hiện cột'>
                <IconButton size='small' onClick={e => setVisAnchor(e.currentTarget)}>
                  <Settings2 size={18} />
                </IconButton>
              </Tooltip>
              <Menu
                anchorEl={visAnchor}
                open={!!visAnchor}
                onClose={() => setVisAnchor(null)}
                PaperProps={{ sx: { maxHeight: 400, p: 1 } }}
              >
                <div style={{ padding: '4px 12px 8px', fontSize: 12, fontWeight: 600, color: '#64748b', borderBottom: '1px solid #e2e8f0', marginBottom: 4 }}>
                  Ẩn / hiện cột
                </div>
                {table.getAllLeafColumns().map(col => (
                  <div key={col.id} style={{ padding: '2px 12px' }}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          size='small'
                          checked={col.getIsVisible()}
                          onChange={col.getToggleVisibilityHandler()}
                        />
                      }
                      label={<span style={{ fontSize: 13 }}>{COLUMN_LABELS[col.id] || col.id}</span>}
                    />
                  </div>
                ))}
              </Menu>
              <TextField
                size='small'
                placeholder='Tìm theo tên, email, SĐT...'
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                sx={{ width: 280 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position='start'>
                      <Search size={16} />
                    </InputAdornment>
                  )
                }}
              />
              <TextField
                size='small'
                label='Tối đa'
                type='number'
                value={fetchLimitInput}
                onChange={e => setFetchLimitInput(e.target.value)}
                sx={{ width: 100 }}
                inputProps={{ min: 1, max: 20000 }}
              />
              <Button
                variant='contained'
                size='small'
                onClick={handleSearch}
                disabled={isFetching}
                sx={{ color: '#fff', minWidth: 110 }}
                startIcon={
                  isFetching ? (
                    <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                  ) : (
                    <Search size={16} />
                  )
                }
              >
                {isFetching ? 'Đang tải...' : 'Tìm kiếm'}
              </Button>
            </div>
          </div>

          <div className='table-wrapper'>
            <table
              className='data-table'
              style={isLoading || users.length === 0 ? { height: '100%' } : {}}
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
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length} className='py-10 text-center'>
                      <div className='flex flex-col items-center justify-center'>
                        <Image src='/images/no-data.png' alt='No data' width={160} height={160} />
                        <p className='mt-4 text-gray-500'>Không có dữ liệu</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  table.getRowModel().rows.map(row => (
                    <tr className='table-row' key={row.id}>
                      {row.getVisibleCells().map(cell => (
                        <td className='table-cell' key={cell.id}>
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
          <div className='pagination-container'>
            <div className='pagination-wrapper'>
              <div className='pagination-info'>
                <div className='page-size-select'>
                  <span className='text-sm text-gray'>Hiển thị</span>
                  <div className='page-size-select-wrapper'>
                    <select
                      value={pagination.pageSize}
                      onChange={e => {
                        setPagination({ pageIndex: 0, pageSize: Number(e.target.value) })
                      }}
                      className='page-size-select'
                    >
                      <option value='20'>20</option>
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
                    <span>
                      {startRow} - {endRow} của {totalRows} hàng
                      {meta.total > totalRows && ` (tổng ${meta.total})`}
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
                  page={pagination.pageIndex + 1}
                  onChange={(_, newPage) => {
                    setPagination(prev => ({ ...prev, pageIndex: newPage - 1 }))
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Status Dialog */}
      <Dialog open={banDialogOpen} onClose={handleCloseBanDialog} maxWidth='xs' fullWidth>
        <DialogTitle>Đổi trạng thái tài khoản</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            User: <strong>{userToBan?.name}</strong> ({userToBan?.email})
          </DialogContentText>
          <TextField
            select
            fullWidth
            label='Trạng thái'
            value={selectedStatus}
            onChange={e => setSelectedStatus(Number(e.target.value))}
            SelectProps={{ native: true }}
            size='small'
          >
            <option value={1}>✅ Hoạt động</option>
            <option value={2}>⚠️ Khoá mua hàng</option>
            <option value={3}>🚫 Cấm đăng nhập</option>
          </TextField>
          {selectedStatus === 2 && (
            <Typography sx={{ mt: 1, fontSize: 12, color: '#b45309' }}>
              User vẫn đăng nhập và nạp tiền được, nhưng không mua hàng được.
            </Typography>
          )}
          {selectedStatus === 3 && (
            <Typography sx={{ mt: 1, fontSize: 12, color: '#dc2626' }}>
              User không đăng nhập được. Hiện cảnh báo khi cố đăng nhập.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseBanDialog} variant='outlined' disabled={updateStatusMutation.isPending}>
            Hủy
          </Button>
          <Button
            onClick={handleConfirmBan}
            variant='contained'
            color={selectedStatus === 3 ? 'error' : selectedStatus === 2 ? 'warning' : 'success'}
            disabled={updateStatusMutation.isPending || selectedStatus === (userToBan?.status ?? 1)}
            sx={{ color: '#fff' }}
          >
            {updateStatusMutation.isPending ? 'Đang xử lý...' : 'Xác nhận'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={resetPwDialogOpen} onClose={handleCloseResetPwDialog} maxWidth='sm' fullWidth>
        <DialogTitle>Reset mật khẩu</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            User: <strong>{userToResetPw?.name}</strong> ({userToResetPw?.email})
          </DialogContentText>

          {generatedPassword ? (
            <div
              style={{
                padding: 16,
                backgroundColor: '#f0fdf4',
                borderRadius: 8,
                border: '1px solid #bbf7d0'
              }}
            >
              <Typography variant='body2' color='success.main' fontWeight={600} sx={{ mb: 1 }}>
                Mật khẩu mới:
              </Typography>
              <Typography
                variant='h6'
                fontFamily='monospace'
                sx={{ userSelect: 'all', cursor: 'pointer' }}
                onClick={() => {
                  navigator.clipboard.writeText(generatedPassword)
                  toast.success('Đã copy mật khẩu')
                }}
              >
                {generatedPassword}
              </Typography>
              <Typography variant='caption' color='text.secondary'>
                Click để copy
              </Typography>
            </div>
          ) : (
            <TextField
              fullWidth
              label='Mật khẩu mới (để trống = tự tạo)'
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder='Để trống để tự động tạo mật khẩu'
              size='small'
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseResetPwDialog} variant='outlined'>
            {generatedPassword ? 'Đóng' : 'Hủy'}
          </Button>
          {!generatedPassword && (
            <Button
              onClick={handleConfirmResetPw}
              variant='contained'
              color='warning'
              disabled={resetPasswordMutation.isPending}
              sx={{ color: '#fff' }}
            >
              {resetPasswordMutation.isPending ? 'Đang xử lý...' : 'Reset mật khẩu'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </>
  )
})
