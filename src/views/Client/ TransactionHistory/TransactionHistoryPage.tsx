'use client'

import { useMemo, useState } from 'react'

import Image from 'next/image'

import { TriangleAlert, CircleQuestionMark, BadgeCheck, BadgeMinus, List, Clock3 } from 'lucide-react'

import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  getFilteredRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues // Thêm để lọc hàng đã chọn
} from '@tanstack/react-table'

import Chip from '@mui/material/Chip'

import Pagination from '@mui/material/Pagination'

import { useQuery } from '@tanstack/react-query'

import { formatDateTimeLocal } from '@/utils/formatDate'

import useAxiosAuth from '@/hocs/useAxiosAuth'
import { useTienTe } from '@/app/contexts/TienTeContext'

export default function TransactionHistoryPage() {
  const [columnFilters, setColumnFilters] = useState([])
  const [rowSelection, setRowSelection] = useState({}) // State để lưu các hàng được chọn
  const [sorting, setSorting] = useState([])

  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10
  })

  const axiosAuth = useAxiosAuth()
  const { hien } = useTienTe()

  const { data: dataOrders = [], isLoading } = useQuery({
    queryKey: ['getTransactionHistory'],
    queryFn: async () => {
      const res = await axiosAuth.get('/get-transaction-history')

      return res.data ?? []
    }
  })

  const columns = useMemo(
    () => [
      {
        header: 'Lịch sử giao dịch',
        cell: ({ row }) => {
          const type = row.original?.type || ''
          const noidung = row.original?.noidung || ''

          const typeMap: Record<string, { label: string; color: 'success' | 'primary' | 'info' | 'error' | 'warning' | 'secondary'; text?: string }> = {
            NAPTIEN: { label: 'Nạp', color: 'success', text: 'Nạp tiền thành công!' },
            NAPTIEN_AUTO: { label: 'Nạp', color: 'success', text: 'Nạp tiền tự động' },
            NAPTIEN_PAY2S: { label: 'Nạp', color: 'success', text: 'Nạp tiền tự động' },
            NAPTIEN_MANUAL: { label: 'Nạp', color: 'success', text: 'Nạp tiền thủ công' },
            TRUTIEN: { label: 'Tiêu', color: 'primary', text: 'Trừ tiền thành công!' },
            BUY: { label: 'Mua', color: 'info' },
            THANHTOAN: { label: 'Mua', color: 'info' },
            THANHTOAN_V4: { label: 'Mua', color: 'info' },
            GIAHAN: { label: 'Gia hạn', color: 'warning' },
            GIAHAN_V4: { label: 'Gia hạn', color: 'warning' },
            RENEWAL: { label: 'Gia hạn', color: 'warning' },
            REFUND: { label: 'Hoàn', color: 'error' },
            REFUND_PARTIAL: { label: 'Hoàn 1 phần', color: 'error' },
            REFUND_FULL: { label: 'Hoàn tiền', color: 'error' },
            REFUND_RENEWAL: { label: 'Hoàn GH', color: 'error' },
            FAILED: { label: 'Lỗi', color: 'error' },
            RUT_HOA_HONG_AFFILIATE: { label: 'Rút HH', color: 'secondary' },
          }

          const cfg = typeMap[type] || { label: type || '?', color: 'secondary' as const }

          return (
            <div>
              <Chip label={cfg.label} size='small' color={cfg.color} style={{ color: '#fff' }} />
              <span className='font-sm ms-2'>{cfg.text || noidung || type}</span>
            </div>
          )
        },
        size: 400
      },
      {
        size: 100,
        header: 'Số trước',
        cell: ({ row }) => {
          return (
            <div>
              <span className='text-sm text-gray-500 font-bold'>{hien(row.original.sotientruoc)}</span>
            </div>
          )
        }
      },
      {
        size: 100,
        header: 'Số tiền',
        cell: ({ row }) => {
          return (
            <div>
              <span className='text-sm text-gray-500 font-bold'>{hien(row.original.sotienthaydoi)}</span>
            </div>
          )
        }
      },
      {
        size: 100,
        header: 'Số tiền sau',
        cell: ({ row }) => {
          return (
            <div>
              <span className='text-sm text-gray-500 font-bold'>{hien(row.original.sotiensau)}</span>
            </div>
          )
        }
      },
      {
        header: 'Thời gian',
        size: 100,
        cell: ({ row }) => {
          return (
            <>
              <div className='d-flex align-items-center  gap-1 '>
                <Clock3 size={14} />
                <div style={{ marginTop: '2px' }}>{formatDateTimeLocal(row.original.created_at)}</div>
              </div>
            </>
          )
        }
      }
    ],
    [hien]
  )

  const table = useReactTable({
    data: dataOrders,
    columns,
    state: {
      rowSelection,
      pagination,
      columnFilters,
      sorting
    },
    enableRowSelection: true, // Bật tính năng chọn hàng
    onRowSelectionChange: setRowSelection, // Cập nhật state khi có thay đổi
    onPaginationChange: setPagination,
    onColumnFiltersChange: setColumnFilters,
    onSortingChange: setSorting,

    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(), // Tùy chọn: cần thiết nếu có bộ lọc
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
      <div className='table-container'>
        <div className='orders-content'>
          <div className='table-toolbar'>
            <div className='header-left'>
              <div className='page-icon'>
                <List size={17} />
              </div>
              <div>
                <h5 className='mb-0 font-semibold'>Lịch sử giao dịch</h5>
              </div>
            </div>
          </div>
          <div className='table-container'>
            {/* Table */}
            <div className='table-wrapper'>
              <table className='data-table' style={isLoading || dataOrders.length === 0 ? { height: '100%' } : {}}>
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
                    <span className='text-sm text-gray'>Kích cỡ trang linh</span>
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
                  {/* --- Hiển thị số hàng trên trang hiện tại --- */}
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
      </div>
    </>
  )
}
