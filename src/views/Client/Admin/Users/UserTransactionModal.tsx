'use client'

import { useMemo, useState } from 'react'

import Image from 'next/image'

import { Clock3, List, X, Loader2 } from 'lucide-react'

import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  getPaginationRowModel
} from '@tanstack/react-table'

import Chip from '@mui/material/Chip'
import Pagination from '@mui/material/Pagination'
import Dialog from '@mui/material/Dialog'
import Tooltip from '@mui/material/Tooltip'

import { useUserTransactions } from '@/hooks/apis/useAdminUsers'

interface UserTransactionModalProps {
  open: boolean
  onClose: () => void
  userId?: number
  userName?: string
}

const formatVND = (value: number) => {
  return new Intl.NumberFormat('vi-VN').format(value) + 'đ'
}

const TYPE_LABELS: Record<string, { label: string; color: 'success' | 'info' | 'warning' | 'error' | 'default' | 'primary' | 'secondary' }> = {
  NAPTIEN_AUTO: { label: 'Nạp tự động', color: 'success' },
  NAPTIEN_MANUAL: { label: 'Nạp tay (Admin)', color: 'info' },
  THANHTOAN: { label: 'Mua proxy', color: 'warning' },
  GIAHAN: { label: 'Gia hạn', color: 'warning' },
  THANHTOAN_V4: { label: 'Mua proxy V4', color: 'warning' },
  GIAHAN_V4: { label: 'Gia hạn V4', color: 'warning' },
  REFUND: { label: 'Hoàn tiền', color: 'secondary' },
  REFUND_PARTIAL: { label: 'Hoàn 1 phần', color: 'secondary' },
  REFUND_FULL: { label: 'Hoàn toàn bộ', color: 'secondary' },
  RENEWAL: { label: 'Gia hạn', color: 'warning' },
  REFUND_RENEWAL: { label: 'Hoàn GH', color: 'secondary' },
  RUT_HOA_HONG_AFFILIATE: { label: 'Rút hoa hồng', color: 'primary' },
  CONG_HOA_HONG_AFFILIATE: { label: 'Cộng hoa hồng (Admin)', color: 'info' }
}

function parseDescription(row: any): string {
  const { type, noidung, datas } = row
  let parsed: any = null

  try {
    parsed = typeof datas === 'string' ? JSON.parse(datas) : datas
  } catch {}

  if (type === 'NAPTIEN_MANUAL' && parsed) {
    const parts: string[] = []

    if (parsed.note) parts.push(parsed.note)
    if (parsed.admin || parsed.admin_name) parts.push('Admin: ' + (parsed.admin_name || parsed.admin))
    if (parts.length) return parts.join(' | ')
  }

  if (type === 'CONG_HOA_HONG_AFFILIATE' && parsed) {
    const admin = parsed.admin_name || parsed.admin

    return [noidung, admin ? 'Admin: ' + admin : ''].filter(Boolean).join(' | ')
  }

  return noidung || '-'
}

export default function UserTransactionModal({ open, onClose, userId, userName }: UserTransactionModalProps) {
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 })

  const { data: transactions = [], isLoading, isError, error } = useUserTransactions(userId, open && !!userId)

  const columns = useMemo(
    () => [
      {
        header: 'Thời gian',
        cell: ({ row }: { row: any }) => {
          const dateStr = row.original?.thoigian || row.original?.created_at

          if (!dateStr) return '-'
          const d = new Date(dateStr)

          
return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
              <Clock3 size={13} />
              <span>{d.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          )
        },
        size: 160
      },
      {
        header: 'Loại',
        cell: ({ row }: { row: any }) => {
          const type = row.original?.type || ''
          const info = TYPE_LABELS[type] || { label: type, color: 'secondary' as const }

          
return <Chip label={info.label} size='small' color={info.color} />
        },
        size: 140
      },
      {
        header: 'Trước GD',
        cell: ({ row }: { row: any }) => (
          <span style={{ whiteSpace: 'nowrap' }}>{formatVND(row.original?.sotientruoc ?? 0)}</span>
        ),
        size: 120
      },
      {
        header: 'Thay đổi',
        cell: ({ row }: { row: any }) => {
          const amount = row.original?.sotienthaydoi ?? 0
          const isPositive = amount >= 0

          
return (
            <span
              style={{
                fontWeight: 600,
                color: isPositive ? '#059669' : '#dc2626',
                whiteSpace: 'nowrap'
              }}
            >
              {isPositive ? '+' : ''}{formatVND(amount)}
            </span>
          )
        },
        size: 120
      },
      {
        header: 'Sau GD',
        cell: ({ row }: { row: any }) => (
          <span style={{ whiteSpace: 'nowrap' }}>{formatVND(row.original?.sotiensau ?? 0)}</span>
        ),
        size: 120
      },
      {
        header: 'Nội dung',
        cell: ({ row }: { row: any }) => {
          const desc = parseDescription(row.original)

          
return (
            <Tooltip title={desc} placement='top-start'>
              <span
                style={{
                  display: 'block',
                  maxWidth: 280,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
              >
                {desc}
              </span>
            </Tooltip>
          )
        },
        size: 280
      }
    ],
    []
  )

  const table = useReactTable({
    data: transactions,
    columns,
    state: { pagination },
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel()
  })

  if (!open) return null

  const totalRows = transactions.length
  const { pageIndex, pageSize } = pagination
  const startRow = totalRows > 0 ? pageIndex * pageSize + 1 : 0
  const endRow = Math.min(startRow + pageSize - 1, totalRows)

  return (
    <Dialog
      onClose={onClose}
      open={open}
      closeAfterTransition={false}
      maxWidth='lg'
      fullWidth
      PaperProps={{ sx: { overflow: 'visible' } }}
    >
      <div className='relative bg-white rounded-lg shadow-2xl w-full max-h-[90vh] overflow-hidden mx-auto'>
        {/* Header */}
        <div className='relative bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-4 flex items-center justify-between'>
          <div className='flex items-center gap-3'>
            <div className='w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center'>
              <List className='text-white' size={20} />
            </div>
            <div>
              <h2 className='text-lg font-bold text-white'>Lịch sử giao dịch</h2>
              <p className='text-blue-100 text-sm'>{userName || 'User'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className='p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors'
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className='p-6 flex flex-col items-center justify-center min-h-[300px]'>
            <Loader2 className='w-10 h-10 text-blue-500 animate-spin mb-4' />
            <p className='text-gray-600 font-medium'>Đang tải dữ liệu giao dịch...</p>
          </div>
        ) : isError ? (
          <div className='p-6 flex flex-col items-center justify-center min-h-[300px]'>
            <p className='text-red-500 font-medium mb-2'>Có lỗi xảy ra khi tải dữ liệu</p>
            <p className='text-sm text-gray-500'>{error instanceof Error ? error.message : 'Vui lòng thử lại sau'}</p>
          </div>
        ) : (
          <div className='p-4 overflow-y-auto max-h-[calc(90vh-80px)]'>
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
                        <span className='text-sm text-gray'>Hiển thị</span>
                        <div className='page-size-select-wrapper'>
                          <select
                            value={pageSize}
                            onChange={e => setPagination({ pageIndex: 0, pageSize: Number(e.target.value) })}
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
                        <span>{startRow} - {endRow} của {totalRows} giao dịch</span>
                      </div>
                    </div>
                    <div className='pagination-buttons'>
                      <Pagination
                        count={table.getPageCount()}
                        shape='rounded'
                        variant='outlined'
                        color='primary'
                        page={pageIndex + 1}
                        onChange={(_, page) => setPagination(prev => ({ ...prev, pageIndex: page - 1 }))}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Dialog>
  )
}
