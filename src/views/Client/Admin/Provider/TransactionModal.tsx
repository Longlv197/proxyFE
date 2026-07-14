'use client'

import { useMemo, useState, useEffect } from 'react'

import Image from 'next/image'

import { Clock3, List, X, Loader2 } from 'lucide-react'

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
import Dialog from '@mui/material/Dialog'
import { Button } from '@mui/material'

import { useProviderTransactions, useProviderApiTransactions } from '@/hooks/apis/useProviders'
import { formatDateTimeLocal } from '@/utils/formatDate'

interface TransactionModalProps {
  open: boolean
  onClose: () => void
  providerId?: number | string
  providerName?: string
  providerCode?: string
}

export default function TransactionModal({ open, onClose, providerId, providerName, providerCode }: TransactionModalProps) {
  // Tab: 'local' = giao dịch nạp qua hệ thống mình; 'provider' = giao dịch THẬT tại NCC (HomeProxy)
  const [tab, setTab] = useState<'local' | 'provider'>('local')
  const [provPage, setProvPage] = useState(1)
  const provFetch = useProviderApiTransactions(providerCode, provPage, 20, open && tab === 'provider' && !!providerCode)
  const provRows: any[] = provFetch.data?.data || []
  const provHasNext: boolean = provFetch.data?.has_next || false
  const provTotal: number = provFetch.data?.total || 0

  useEffect(() => {
    if (open) { setTab('local'); setProvPage(1) }
  }, [open, providerId])

  const [columnFilters, setColumnFilters] = useState<any[]>([])
  const [rowSelection, setRowSelection] = useState({})
  const [sorting, setSorting] = useState<any[]>([])

  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10
  })

  // Gọi API get-topup-history - chỉ gọi khi modal mở và có providerId
  const shouldFetch = useMemo(() => open && !!providerId, [open, providerId])
  const { data: transactions = [], isLoading, isError, error } = useProviderTransactions(providerId, shouldFetch)

  const columns = useMemo(
    () => [
      {
        header: 'ID Giao dịch',
        cell: ({ row }: { row: any }) => {
          return (
            <div className='text-sm font-medium'>
              {row.original?.system_transaction_id || '-'}
            </div>
          )
        },
        size: 200
      },
      {
        header: 'Số tiền',
        cell: ({ row }: { row: any }) => {
          const formatter = new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
          })

          const amount = row.original?.amount || 0
          const isPositive = amount >= 0


return (
            <div>
              <span className={`text-sm font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                {isPositive ? '+' : ''}{formatter.format(amount)}
              </span>
            </div>
          )
        },
        size: 150
      },
      {
        header: 'Trạng thái',
        cell: ({ row }: { row: any }) => {
          const status = row.original?.status

          if (status === 'completed' || status === 'success' || status === 'SUCCESS') {
            return <Chip label='Thành công' size='small' color='success' />
          } else if (status === 'pending' || status === 'PENDING') {
            return <Chip label='Đang xử lý' size='small' color='warning' />
          } else if (status === 'failed' || status === 'FAILED' || status === 'error') {
            return <Chip label='Thất bại' size='small' color='error' />
          }


return <Chip label={status || 'Không xác định'} size='small' color='default' />
        },
        size: 150
      },
      {
        header: 'Thời gian',
        cell: ({ row }: { row: any }) => {
          const dateStr = row.original?.created_at


return (
            <div className='d-flex align-items-center gap-1'>
              <Clock3 size={14} />
              <div style={{ marginTop: '2px' }}>{dateStr ? formatDateTimeLocal(dateStr) : '-'}</div>
            </div>
          )
        },
        size: 180
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [providerId]
  )

  const table = useReactTable({
    data: transactions,
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

  if (!open) return null

  return (
    <Dialog
      onClose={onClose}
      aria-labelledby='transaction-modal-title'
      open={open}
      closeAfterTransition={false}
      maxWidth='lg'
      fullWidth={true}
      PaperProps={{ sx: { overflow: 'visible' } }}
    >
      <div className='relative bg-white rounded-lg shadow-2xl w-full max-h-[90vh] overflow-hidden animate-slideUp mx-auto'>
        <div className='flex items-center justify-between px-4 py-3 border-b border-gray-200'>
          <div className='flex items-center gap-2'>
            <div className='w-8 h-8 rounded-lg flex items-center justify-center' style={{ background: 'color-mix(in srgb, var(--primary-hover, #6366f1) 12%, white)' }}>
              <List size={16} style={{ color: 'var(--primary-hover, #6366f1)' }} />
            </div>
            <h2 className='text-sm font-semibold text-gray-800'>Lịch sử giao dịch</h2>
          </div>
          <button
            onClick={onClose}
            className='p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors'
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab: giao dịch nạp qua hệ thống mình vs giao dịch THẬT tại NCC */}
        <div className='flex gap-2 px-4 pt-3'>
          <button
            onClick={() => setTab('local')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${tab === 'local' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:bg-gray-100'}`}
          >
            Giao dịch của tôi
          </button>
          <button
            onClick={() => setTab('provider')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${tab === 'provider' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:bg-gray-100'}`}
          >
            Giao dịch tại nhà cung cấp
          </button>
        </div>

        {tab === 'local' && (isLoading ? (
          <div className='p-4 sm:p-6 flex flex-col items-center justify-center min-h-[300px] sm:min-h-[400px]'>
            <Loader2 className='w-10 h-10 sm:w-12 sm:h-12 animate-spin mb-4' style={{ color: 'var(--primary-hover, #f97316)' }} />
            <p className='text-gray-600 font-medium text-sm sm:text-base text-center'>
              Đang tải dữ liệu giao dịch...
            </p>
            <p className='text-xs sm:text-sm text-gray-400 mt-2 text-center'>Vui lòng đợi trong giây lát</p>
          </div>
        ) : isError ? (
          <div className='p-4 sm:p-6 flex flex-col items-center justify-center min-h-[300px] sm:min-h-[400px]'>
            <div className='text-center text-red-500 font-medium text-sm sm:text-base mb-2'>
              Có lỗi xảy ra khi tải dữ liệu
            </div>
            <div className='text-center text-sm text-gray-500'>
              {error instanceof Error ? error.message : 'Vui lòng thử lại sau'}
            </div>
          </div>
        ) : (
          <div className='p-4 sm:p-6 overflow-y-auto max-h-[calc(90vh-80px)]'>
            <div className='table-container'>
              <div className='table-wrapper'>
                <table className='data-table' style={transactions.length === 0 ? { height: '100%' } : {}}>
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
                    {table.getRowModel().rows.length === 0 ? (
                      <tr>
                        <td colSpan={columns.length} className='py-10 text-center'>
                          <div className='flex flex-col items-center justify-center'>
                            <Image src='/images/no-data.png' alt='No data' width={160} height={160} />
                            <p className='mt-4 text-gray-500'>Không có dữ liệu giao dịch</p>
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
              {totalRows > 0 && (
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
              )}
            </div>
          </div>
        ))}

        {tab === 'provider' && (
          <div className='p-4 sm:p-6 overflow-y-auto max-h-[calc(90vh-120px)]'>
            {provFetch.isLoading ? (
              <div className='flex flex-col items-center justify-center min-h-[300px]'>
                <Loader2 className='w-10 h-10 animate-spin mb-4' style={{ color: 'var(--primary-hover, #f97316)' }} />
                <p className='text-gray-600 text-sm'>Đang tải giao dịch tại nhà cung cấp...</p>
              </div>
            ) : provFetch.isError ? (
              <div className='text-center text-gray-500 py-10 text-sm'>
                Nhà cung cấp này chưa hỗ trợ xem lịch sử giao dịch.
              </div>
            ) : provRows.length === 0 ? (
              <div className='flex flex-col items-center justify-center py-10'>
                <Image src='/images/no-data.png' alt='No data' width={160} height={160} />
                <p className='mt-4 text-gray-500'>Không có giao dịch</p>
              </div>
            ) : (
              <>
                <div className='overflow-x-auto'>
                  <table className='data-table w-full'>
                    <thead className='table-header'>
                      <tr>
                        <th className='table-header th'>Thời gian</th>
                        <th className='table-header th'>Loại</th>
                        <th className='table-header th'>Số tiền</th>
                        <th className='table-header th'>Số dư trước</th>
                        <th className='table-header th'>Số dư sau</th>
                        <th className='table-header th'>Trạng thái</th>
                        <th className='table-header th'>Mã đơn</th>
                      </tr>
                    </thead>
                    <tbody>
                      {provRows.map((t: any, i: number) => {
                        const fmt = new Intl.NumberFormat('vi-VN')
                        const done = t.status === 'Completed' || t.status === 'Success'
                        const pending = t.status === 'Pending'

                        return (
                          <tr className='table-row' key={t.code || i}>
                            <td className='table-cell text-sm'>{t.date ? formatDateTimeLocal(t.date) : '-'}</td>
                            <td className='table-cell text-sm'>{t.type_label}</td>
                            <td className='table-cell text-sm font-semibold' style={{ color: t.type === 1 ? '#059669' : '#dc2626' }}>
                              {t.type === 1 ? '+' : '-'}{fmt.format(t.amount)} đ
                            </td>
                            <td className='table-cell text-sm text-gray-500'>{fmt.format(t.balance_before)} đ</td>
                            <td className='table-cell text-sm'>{fmt.format(t.balance_after)} đ</td>
                            <td className='table-cell'>
                              <Chip label={t.status || '-'} size='small' color={done ? 'success' : pending ? 'warning' : 'default'} />
                            </td>
                            <td className='table-cell text-sm text-gray-500'>{t.order_code || '-'}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                <div className='flex items-center justify-between mt-4'>
                  <span className='text-sm text-gray-500'>Trang {provPage} · Tổng {provTotal} giao dịch</span>
                  <div className='flex gap-2'>
                    <Button size='small' variant='outlined' disabled={provPage <= 1 || provFetch.isFetching}
                      onClick={() => setProvPage(p => Math.max(1, p - 1))}>Trước</Button>
                    <Button size='small' variant='outlined' disabled={!provHasNext || provFetch.isFetching}
                      onClick={() => setProvPage(p => p + 1)}>Sau</Button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </Dialog>
  )
}
