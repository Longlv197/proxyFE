'use client'

import { useMemo, useState, useCallback } from 'react'

import Image from 'next/image'
import { useParams, useRouter } from 'next/navigation'

import {
  CircleQuestionMark,
  BadgeCheck,
  BadgeMinus,
  List,
  SquarePen,
  Trash2,
  SquarePlus,
  Wallet,
  QrCode,
  History,
  ClipboardList,
  Search,
  Loader2,
  Eye
} from 'lucide-react'

import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  getFilteredRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues
} from '@tanstack/react-table'

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
  TextField
} from '@mui/material'

import { toast } from 'react-toastify'

import { useProviders, useDeleteProvider } from '@/hooks/apis/useProviders'
import QrCodeDialog from '@/views/Client/Admin/Provider/QrCodeDialog'
import TransactionModal from '@/views/Client/Admin/Provider/TransactionModal'
import ConfigVersionDrawer from '@/views/Client/Admin/ConfigVersions/ConfigVersionDrawer'

interface TableProviderProps {
  onOpenModal?: (type: 'create' | 'edit', data?: any) => void
}

export default function TableProvider({ onOpenModal }: TableProviderProps) {
  const [columnFilters, setColumnFilters] = useState<any[]>([])
  const [rowSelection, setRowSelection] = useState({})
  const [sorting, setSorting] = useState<any[]>([])

  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10
  })

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [providerToDelete, setProviderToDelete] = useState<number | null>(null)
  const [providerToDeleteData, setProviderToDeleteData] = useState<any>(null)

  const [rechargeDialogOpen, setRechargeDialogOpen] = useState(false)
  const [providerToRecharge, setProviderToRecharge] = useState<any>(null)
  const [rechargeAmount, setRechargeAmount] = useState('')

  const [qrCodeDialogOpen, setQrCodeDialogOpen] = useState(false)
  const [providerForQrCode, setProviderForQrCode] = useState<any>(null)
  const [qrCodeAmount, setQrCodeAmount] = useState('')

  const [transactionModalOpen, setTransactionModalOpen] = useState(false)
  const [providerForTransaction, setProviderForTransaction] = useState<any>(null)

  const [versionDrawerOpen, setVersionDrawerOpen] = useState(false)
  const [versionDrawerProvider, setVersionDrawerProvider] = useState<{ id: number; title: string } | null>(null)

  const [searchText, setSearchText] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [appliedStatus, setAppliedStatus] = useState<string>('all')

  const router = useRouter()
  const params = useParams()
  const { lang: locale } = params

  const {
    data: dataProviders = [],
    isLoading,
    isFetching,
    forceRefetch
  } = useProviders({
    search: appliedSearch || undefined,
    status: appliedStatus !== 'all' ? appliedStatus : undefined
  })

  const handleSearch = useCallback(() => {
    const newSearch = searchText.trim()
    const newStatus = filterStatus

    if (newSearch === appliedSearch && newStatus === appliedStatus) {
      // Cùng params → force refetch
      forceRefetch()
    } else {
      setAppliedSearch(newSearch)
      setAppliedStatus(newStatus)
    }

    setPagination(prev => ({ ...prev, pageIndex: 0 }))
  }, [searchText, filterStatus, appliedSearch, appliedStatus, forceRefetch])

  const handleClearSearch = useCallback(() => {
    setSearchText('')
    setFilterStatus('all')
    setAppliedSearch('')
    setAppliedStatus('all')
    setPagination(prev => ({ ...prev, pageIndex: 0 }))
  }, [])
  const deleteMutation = useDeleteProvider()

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '3px 10px',
              borderRadius: 20,
              fontSize: 11,
              fontWeight: 600,
              background: '#ecfdf5',
              color: '#059669',
              border: '1px solid #a7f3d0'
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} />
            Hoạt động
          </span>
        )
      case 'inactive':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '3px 10px',
              borderRadius: 20,
              fontSize: 11,
              fontWeight: 600,
              background: '#f8fafc',
              color: '#94a3b8',
              border: '1px solid #e2e8f0'
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#cbd5e1' }} />
            Tắt
          </span>
        )
      default:
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '3px 10px',
              borderRadius: 20,
              fontSize: 11,
              fontWeight: 600,
              background: '#fefce8',
              color: '#ca8a04',
              border: '1px solid #fde68a'
            }}
          >
            Không rõ
          </span>
        )
    }
  }

  const handleOpenCreate = useCallback(() => {
    if (onOpenModal) {
      onOpenModal('create')
    }
  }, [onOpenModal])

  const handleOpenEdit = useCallback(
    (providerId: number) => {
      const provider = dataProviders.find((p: any) => p.id === providerId)

      console.log('Provider data when edit clicked:', provider)

      if (onOpenModal && provider) {
        onOpenModal('edit', provider)
      }
    },
    [onOpenModal, dataProviders]
  )

  const handleOpenDeleteDialog = useCallback(
    (providerId: number) => {
      const provider = dataProviders.find((p: any) => p.id === providerId)

      setProviderToDelete(providerId)
      setProviderToDeleteData(provider)
      setDeleteDialogOpen(true)
    },
    [dataProviders]
  )

  const handleCloseDeleteDialog = useCallback(() => {
    setDeleteDialogOpen(false)
    setProviderToDelete(null)
    setProviderToDeleteData(null)
  }, [])

  const handleOpenRechargeDialog = useCallback(
    (providerId: number) => {
      const provider = dataProviders.find((p: any) => p.id === providerId)

      setProviderToRecharge(provider)
      setRechargeAmount('')
      setRechargeDialogOpen(true)
    },
    [dataProviders]
  )

  const handleCloseRechargeDialog = useCallback(() => {
    setRechargeDialogOpen(false)
    setProviderToRecharge(null)
    setRechargeAmount('')
  }, [])

  const handleConfirmRecharge = useCallback(() => {
    if (providerToRecharge && rechargeAmount && Number(rechargeAmount) > 0) {
      // TODO: Implement API call to recharge provider
      console.log('Recharge provider:', providerToRecharge.id, 'Amount:', rechargeAmount)
      toast.success(
        `Nạp tiền ${new Intl.NumberFormat('vi-VN').format(Number(rechargeAmount))} đ cho nhà cung cấp thành công!`
      )
      handleCloseRechargeDialog()
    } else {
      toast.error('Vui lòng nhập số tiền hợp lệ')
    }
  }, [providerToRecharge, rechargeAmount, handleCloseRechargeDialog])

  const handleCloseQrCodeDialog = useCallback(() => {
    setQrCodeDialogOpen(false)
    setProviderForQrCode(null)
    setQrCodeAmount('')
  }, [])

  const handleGenerateQrCode = useCallback(() => {
    if (providerToRecharge && rechargeAmount && Number(rechargeAmount) > 0) {
      setProviderForQrCode(providerToRecharge)
      setQrCodeAmount(rechargeAmount)
      setQrCodeDialogOpen(true)
    }
  }, [providerToRecharge, rechargeAmount])

  const handleOpenTransactionModal = useCallback(
    (providerId: number | string) => {
      const provider = dataProviders.find((p: any) => p.id === providerId)

      if (provider) {
        setProviderForTransaction(provider)
        setTransactionModalOpen(true)
      }
    },
    [dataProviders]
  )

  const handleCloseTransactionModal = useCallback(() => {
    setTransactionModalOpen(false)
    setProviderForTransaction(null)
  }, [])

  const handleOpenDetail = useCallback(
    (providerId: number) => {
      router.push(`/${locale}/admin/providers/${providerId}`)
    },
    [router, locale]
  )

  const handleConfirmDelete = useCallback(() => {
    if (providerToDelete) {
      deleteMutation.mutate(providerToDelete, {
        onSuccess: () => {
          toast.success('Xóa nhà cung cấp thành công!')
          setDeleteDialogOpen(false)
          setProviderToDelete(null)
          setProviderToDeleteData(null)
        },
        onError: (error: any) => {
          toast.error(error?.response?.data?.message || 'Có lỗi xảy ra khi xóa')
        }
      })
    }
  }, [providerToDelete, deleteMutation])

  const columns = useMemo(
    () => [
      {
        accessorKey: 'id',
        header: 'ID',
        size: 50,
        cell: ({ getValue }: { getValue: () => any }) => (
          <span style={{ fontWeight: 500, color: '#94a3b8', fontSize: 13 }}>#{getValue()}</span>
        )
      },
      {
        header: 'Tên',
        cell: ({ row }: { row: any }) => (
          <span style={{ fontWeight: 600, color: '#1e293b', fontSize: 13 }}>
            {row.original?.title || row.original?.name || '-'}
          </span>
        ),
        size: 180
      },
      {
        header: 'Mã code',
        accessorKey: 'provider_code',
        size: 140,
        cell: ({ row }: { row: any }) => (
          <span
            style={{
              fontSize: 12,
              color: '#6366f1',
              fontFamily: 'monospace',
              background: '#eef2ff',
              padding: '2px 8px',
              borderRadius: 4
            }}
          >
            {row.original?.provider_code || '-'}
          </span>
        )
      },
      {
        header: 'Trạng thái',
        cell: ({ row }: { row: any }) => getStatusBadge(row.original?.status),
        size: 110
      },
      {
        header: 'Thao tác',
        cell: ({ row }: { row: any }) => {
          return (
            <div style={{ display: 'flex', gap: 2 }}>
              <Tooltip title='Chỉnh sửa'>
                <IconButton
                  size='small'
                  onClick={() => handleOpenEdit(row.original.id)}
                  sx={{ color: '#94a3b8', '&:hover': { color: '#3b82f6', background: '#eff6ff' } }}
                >
                  <SquarePen size={16} />
                </IconButton>
              </Tooltip>

              <Tooltip title='Xem chi tiết thống kê & hoá đơn'>
                <IconButton size='small' color='secondary' onClick={() => handleOpenDetail(row.original.id)}>
                  <Eye size={18} />
                </IconButton>
              </Tooltip>

              <Tooltip title='Nạp tiền'>
                <IconButton
                  size='small'
                  onClick={() => handleOpenRechargeDialog(row.original.id)}
                  sx={{ color: '#94a3b8', '&:hover': { color: '#10b981', background: '#ecfdf5' } }}
                >
                  <Wallet size={16} />
                </IconButton>
              </Tooltip>

              <Tooltip title='Lịch sử giao dịch'>
                <IconButton
                  size='small'
                  onClick={() => handleOpenTransactionModal(row.original.id)}
                  sx={{ color: '#94a3b8', '&:hover': { color: '#6366f1', background: '#eef2ff' } }}
                >
                  <History size={16} />
                </IconButton>
              </Tooltip>

              <Tooltip title='Lịch sử cấu hình'>
                <IconButton
                  size='small'
                  onClick={() => {
                    setVersionDrawerProvider({ id: row.original.id, title: row.original.title })
                    setVersionDrawerOpen(true)
                  }}
                  sx={{ color: '#94a3b8', '&:hover': { color: '#7c3aed', background: '#f5f3ff' } }}
                >
                  <ClipboardList size={16} />
                </IconButton>
              </Tooltip>

              <Tooltip title='Xóa'>
                <span>
                  <IconButton
                    size='small'
                    onClick={() => handleOpenDeleteDialog(row.original.id)}
                    disabled={deleteMutation.isPending}
                    sx={{ color: '#94a3b8', '&:hover': { color: '#ef4444', background: '#fef2f2' } }}
                  >
                    <Trash2 size={16} />
                  </IconButton>
                </span>
              </Tooltip>
            </div>
          )
        },
        size: 210
      }
    ],
    [handleOpenEdit, handleOpenDeleteDialog, handleOpenRechargeDialog, handleOpenTransactionModal]
  )

  const table = useReactTable({
    data: Array.isArray(dataProviders) ? dataProviders : [],
    columns,
    state: {
      rowSelection,
      pagination,
      columnFilters,
      sorting
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: setPagination,
    onColumnFiltersChange: setColumnFilters,
    onSortingChange: setSorting,

    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues()
  })

  const { pageIndex, pageSize } = table.getState().pagination
  const totalRows = table.getFilteredRowModel().rows.length
  const startRow = pageIndex * pageSize + 1
  const endRow = Math.min(startRow + pageSize - 1, totalRows)

  return (
    <>
      <div className='orders-content'>
        <div className='table-container'>
          <div className='table-toolbar'>
            <div className='header-left'>
              <div className='page-icon'>
                <List size={17} />
              </div>
              <div className='flex justify-between align-middle w-full'>
                <h5 className='mb-0 font-semibold'>Danh sách nhà cung cấp</h5>
              </div>
            </div>

            <div className='header-right'>
              <Button
                onClick={handleOpenCreate}
                variant='contained'
                size='small'
                startIcon={<SquarePlus size={16} />}
                sx={{
                  background: 'var(--primary-gradient, linear-gradient(45deg, #fc4336, #f88a4b))',
                  color: '#fff',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                  fontWeight: 600,
                  fontSize: 13,
                  textTransform: 'none',
                  '&:hover': { opacity: 0.9, boxShadow: '0 6px 16px rgba(0, 0, 0, 0.2)' }
                }}
              >
                Thêm nhà cung cấp
              </Button>
            </div>
          </div>

          {/* Search & Filter */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '12px 16px',
              borderBottom: '1px solid #e2e8f0',
              flexWrap: 'wrap'
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                flex: 1,
                minWidth: 200,
                maxWidth: 300,
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                padding: '0 12px',
                background: '#f8fafc'
              }}
            >
              <Search size={16} style={{ color: '#94a3b8', flexShrink: 0 }} />
              <input
                type='text'
                placeholder='Tìm theo tên, mã code...'
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                style={{
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                  fontSize: 13,
                  padding: '8px 0',
                  width: '100%',
                  color: '#374151'
                }}
              />
            </div>

            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              style={{
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                padding: '7px 12px',
                fontSize: 13,
                color: '#374151',
                background: '#f8fafc',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value='all'>Tất cả trạng thái</option>
              <option value='active'>Hoạt động</option>
              <option value='inactive'>Tắt</option>
            </select>

            <Button
              size='small'
              variant='contained'
              onClick={handleSearch}
              disabled={isFetching}
              startIcon={
                isFetching ? (
                  <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} />
                ) : (
                  <Search size={14} />
                )
              }
              sx={{
                textTransform: 'none',
                fontSize: 13,
                background: 'var(--primary-gradient, linear-gradient(45deg, #fc4336, #f88a4b))',
                color: '#fff',
                boxShadow: 'none',
                '&:hover': { opacity: 0.9, boxShadow: '0 2px 8px rgba(0,0,0,0.15)' },
                '&.Mui-disabled': { opacity: 0.6, color: '#fff' },
                '@keyframes spin': { from: { transform: 'rotate(0deg)' }, to: { transform: 'rotate(360deg)' } }
              }}
            >
              {isFetching ? 'Đang tìm...' : 'Tìm kiếm'}
            </Button>

            {(appliedSearch || appliedStatus !== 'all') && (
              <Button
                size='small'
                variant='text'
                onClick={handleClearSearch}
                sx={{ textTransform: 'none', fontSize: 12, color: '#94a3b8' }}
              >
                Xoá bộ lọc
              </Button>
            )}

            <span style={{ fontSize: 12, color: '#94a3b8', marginLeft: 'auto' }}>
              {(Array.isArray(dataProviders) ? dataProviders : []).length} kết quả
            </span>
          </div>

          {/* Table */}
          <div className='table-wrapper' style={{ padding: '0 16px 16px' }}>
            <table
              className='data-table'
              style={{
                ...(isLoading || (Array.isArray(dataProviders) && dataProviders.length === 0)
                  ? { height: '100%' }
                  : {}),
                borderRadius: 10,
                overflow: 'hidden',
                border: '1px solid #e2e8f0'
              }}
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
                  <span className='text-sm text-gray'>Kích cỡ trang</span>
                  <div className='page-size-select-wrapper'>
                    <select
                      value={table.getState().pagination.pageSize}
                      onChange={e => {
                        table.setPageSize(Number(e.target.value))
                      }}
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
                    <span>
                      {startRow} - {endRow} của {totalRows} hàng
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
                  onChange={(event, page) => {
                    table.setPageIndex(page - 1)
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleCloseDeleteDialog}
        aria-labelledby='delete-dialog-title'
        aria-describedby='delete-dialog-description'
      >
        <DialogTitle id='delete-dialog-title'>Xác nhận xóa nhà cung cấp</DialogTitle>
        <DialogContent>
          <DialogContentText id='delete-dialog-description'>
            Bạn có chắc chắn muốn xóa nhà cung cấp{' '}
            <strong>&quot;{providerToDeleteData?.title || providerToDeleteData?.name || 'này'}&quot;</strong> không?
            Hành động này không thể hoàn tác.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog} variant='outlined' disabled={deleteMutation.isPending}>
            Hủy
          </Button>
          <Button
            onClick={handleConfirmDelete}
            variant='contained'
            color='error'
            disabled={deleteMutation.isPending}
            autoFocus
            sx={{ color: '#fff' }}
          >
            {deleteMutation.isPending ? 'Đang xóa...' : 'Xóa'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Recharge Dialog */}
      <Dialog
        open={rechargeDialogOpen}
        onClose={handleCloseRechargeDialog}
        aria-labelledby='recharge-dialog-title'
        aria-describedby='recharge-dialog-description'
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle id='recharge-dialog-title'>Nạp tiền cho nhà cung cấp</DialogTitle>
        <DialogContent>
          <DialogContentText id='recharge-dialog-description' sx={{ mb: 2 }}>
            Nhà cung cấp: <strong>{providerToRecharge?.title || providerToRecharge?.name || ''}</strong>
          </DialogContentText>
          <TextField
            autoFocus
            margin='dense'
            label='Số tiền nạp'
            type='text'
            fullWidth
            variant='outlined'
            value={rechargeAmount}
            onChange={e => {
              const value = e.target.value.replace(/[^0-9]/g, '')

              setRechargeAmount(value)
            }}
            InputProps={{
              endAdornment: <span style={{ marginLeft: '8px' }}>đ</span>
            }}
            helperText={
              rechargeAmount
                ? `Số tiền: ${new Intl.NumberFormat('vi-VN').format(Number(rechargeAmount))} đ`
                : 'Nhập số tiền cần nạp'
            }
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseRechargeDialog} variant='outlined'>
            Hủy
          </Button>
          <Button
            onClick={handleGenerateQrCode}
            variant='outlined'
            color='warning'
            disabled={!rechargeAmount || Number(rechargeAmount) <= 0}
            startIcon={<QrCode size={18} />}
          >
            Tạo QR code
          </Button>
          <Button
            onClick={handleConfirmRecharge}
            variant='contained'
            color='success'
            disabled={!rechargeAmount || Number(rechargeAmount) <= 0}
            sx={{ color: '#fff' }}
          >
            Nạp tiền
          </Button>
        </DialogActions>
      </Dialog>

      {/* QR Code Dialog */}
      <QrCodeDialog
        open={qrCodeDialogOpen}
        onClose={handleCloseQrCodeDialog}
        provider={providerForQrCode}
        amount={qrCodeAmount}
      />

      {/* Transaction Modal - Tạm thời comment để test */}
      {transactionModalOpen && (
        <TransactionModal
          open={transactionModalOpen}
          onClose={handleCloseTransactionModal}
          providerId={providerForTransaction?.id}
          providerName={providerForTransaction?.title || providerForTransaction?.name}
        />
      )}

      {/* Config Version Drawer */}
      {versionDrawerProvider && (
        <ConfigVersionDrawer
          open={versionDrawerOpen}
          onClose={() => {
            setVersionDrawerOpen(false)
            setVersionDrawerProvider(null)
          }}
          modelType='providers'
          modelId={versionDrawerProvider.id}
          modelName={versionDrawerProvider.title}
        />
      )}
    </>
  )
}
