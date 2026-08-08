'use client'

import './styles.css'
import { useMemo, useState } from 'react'

import {
  BadgeCheck,
  CheckCircle,
  Copy,
  Download,
  Loader,
  RefreshCw,
  BadgeMinus,
  BadgeAlert,
  AlertTriangle
} from 'lucide-react'

import Chip from '@mui/material/Chip'

import Pagination from '@mui/material/Pagination'

import {
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable
} from '@tanstack/react-table'

import { FormControlLabel } from '@mui/material'
import Checkbox from '@mui/material/Checkbox'

import { useCopy } from '@/app/hooks/useCopy'

interface ProxyData {
  proxy: string
  ip: string
  protocol: string
  status: string
  responseTime: string
  type: string
  /** Lý do khi proxy không dùng được — hiện ngay dưới nhãn trạng thái. */
  message?: string
}

interface CheckProxyTableProps {
  data: ProxyData
  checkedProxy: any
}

export default function CheckProxyTable({ data, checkedProxy }: CheckProxyTableProps) {
  const [rowSelection, setRowSelection] = useState({}) // State để lưu các hàng được chọn
  const [columnFilters, setColumnFilters] = useState([])

  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10
  })

  const [isCopied, copy] = useCopy()

  const columns = useMemo(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={table.getIsAllRowsSelected()}
                  indeterminate={table.getIsSomeRowsSelected()}
                  onChange={table.getToggleAllRowsSelectedHandler()}
                />
              }
              label='' // bỏ label để không chiếm chỗ
            />
          </div>
        ),
        cell: ({ row }) => (
          <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={row.getIsSelected()}
                  disabled={!row.getCanSelect()}
                  onChange={row.getToggleSelectedHandler()}
                />
              }
              label=''
            />
          </div>
        ),
        size: 20
      },
      {
        accessorKey: 'proxy',
        header: 'Proxy',
        cell: ({ row }: any) => {
          return (
            <>
              <div className='proxy-text'>{row.original.proxy}</div>
              <button className='copy-icon-btn' onClick={() => copy(row.original.proxy)}>
                <Copy size={14} />
              </button>
            </>
          )
        }
      },
      {
        accessorKey: 'protocol',
        header: 'Loại',
        cell: ({ row }: any) => (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span>{row.original.protocol === 'socks5' ? 'SOCKS5' : 'HTTP'}</span>
            {/* Máy chủ báo lại đã hiểu chuỗi theo dạng nào — thay cho ô "Định dạng proxy" cũ
                bắt khách tự khai (khai sai cũng không ai biết). */}
            {row.original.type && (
              <span style={{ fontSize: 10.5, color: '#94a3b8', whiteSpace: 'nowrap' }}>{row.original.type}</span>
            )}
          </div>
        ),
        size: 40
      },
      {
        // Cột này TRƯỚC ĐÂY không tồn tại: dữ liệu `ip` có sẵn nhưng chưa bao giờ được vẽ ra,
        // mà giá trị trong đó lại là host khách vừa gõ vào chứ không phải IP thật.
        // Nay là IP THOÁT đo được khi đi qua proxy — đúng thứ khách cần biết.
        accessorKey: 'ip',
        header: 'IP gốc',
        cell: ({ row }: any) => {
          const ip = row.original.ip

          if (!ip) return <span style={{ color: '#cbd5e1' }}>—</span>

          return (
            <span style={{ fontFamily: 'monospace', fontSize: 12.5, fontWeight: 600, color: '#059669' }}>{ip}</span>
          )
        },
        size: 60
      },
      {
        accessorKey: 'responseTime',
        header: 'Ping',
        cell: ({ row }) => {
          const ping = row.original.responseTime

          if (ping === 'checking') {
            return (
              <Chip
                label='Đang chờ'
                color='secondary'
                variant='tonal'
                size='small'
                icon={<Loader size={16} className='spinning-icon' />}
              />
            )
          }

          if (typeof ping !== 'number' || ping <= 0) {
            return <Chip label='Lỗi' color='error' variant='tonal' size='small' icon={<BadgeAlert size={16} />} />
          }

          if (ping < 300) {
            return (
              <Chip label={`${ping} ms`} color='success' variant='tonal' size='small' icon={<BadgeCheck size={16} />} />
            )
          }

          if (ping < 800) {
            return (
              <Chip
                label={`${ping} ms`}
                color='warning'
                variant='tonal'
                size='small'
                icon={<AlertTriangle size={16} />}
              />
            )
          }

          return (
            <Chip label={`${ping} ms`} color='error' variant='tonal' size='small' icon={<BadgeMinus size={16} />} />
          )
        },
        size: 40
      },
      {
        accessorKey: 'status',
        header: 'Trạng thái',
        cell: ({ row }: any) => {
          if (row.original.status === 'checking') {
            return (
              <Chip
                label='Đang chờ xử lý'
                color='secondary'
                variant='tonal'
                size='small'
                icon={<Loader size={16} className='spinning-icon' />}
              />
            )
          } else if (row.original.status === 'success') {
            return (
              <Chip
                label='Đang hoạt động'
                color='success'
                variant='tonal'
                size='small'
                icon={<BadgeCheck size={16} />}
              />
            )
          } else {
            // Hiện LÝ DO ngay dưới nhãn: máy chủ đã trả về ("sai mật khẩu", "quá thời gian chờ",
            // "IP chưa được cho phép"…) nhưng trước đây bảng không có chỗ nào hiển thị, nên khách
            // chỉ thấy chữ đỏ "Ngưng hoạt động" mà không biết vì sao và phải sửa gì.
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <Chip
                  label='Ngưng hoạt động'
                  color='error'
                  variant='tonal'
                  size='small'
                  icon={<BadgeMinus size={16} />}
                />
                {row.original.message && (
                  <span style={{ fontSize: 11, color: '#b91c1c', lineHeight: 1.35 }}>{row.original.message}</span>
                )}
              </div>
            )
          }
        },
        size: 80
      }
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  const table = useReactTable({
    data,
    columns,
    state: {
      rowSelection,
      columnFilters,
      pagination
    },
    enableRowSelection: true, // Bật tính năng chọn hàng
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: setPagination,
    onRowSelectionChange: setRowSelection, // Cập nhật state khi có thay đổi
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(), // Tùy chọn: cần thiết nếu có bộ lọc
    getPaginationRowModel: getPaginationRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues()
  })

  const hanldeExport = () => {
    const selectedRowsModel = table.getSelectedRowModel()

    const selectedData = selectedRowsModel.rows.map(row => row.original)

    if (selectedData.length === 0) {
      alert('Vui lòng chọn ít nhất một hàng để xuất.')

      return
    }

    const formattedArray = selectedData.map(row => row.proxy)

    const content = formattedArray.join('\n')

    // --- Tạo tên file theo định dạng ngày-tháng-năm-3số-proxy ---
    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day = String(today.getDate()).padStart(2, '0')

    // Tạo 3 số ngẫu nhiên
    const randomNumber = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, '0')

    const filename = `${day}_${month}_${year}_${randomNumber}_proxy.txt`

    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')

    a.href = url
    a.download = filename
    document.body.appendChild(a)

    a.click()

    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Tính toán các giá trị để hiển thị
  const { pageIndex, pageSize } = table.getState().pagination
  const totalRows = table.getFilteredRowModel().rows.length
  const startRow = pageIndex * pageSize + 1
  const endRow = Math.min(startRow + pageSize - 1, totalRows)

  // Lấy số lượng hàng đã chọn
  const selectedCount = table.getSelectedRowModel().rows.length

  return (
    <>
      <div className='results-panel'>
        <div className='results-card'>
          <div className='results-header'>
            <div className='results-title'>
              <CheckCircle size={20} className='text-green-500' />
              <span>Kết quả kiểm tra Proxy ({totalRows})</span>
            </div>
            {selectedCount > 0 && (
              <div className='results-actions'>
                <button className='action-btn-check' onClick={hanldeExport}>
                  <Download size={16} />
                  Export
                </button>
                {/*<button className='action-btn-check'>*/}
                {/*  <RefreshCw size={16} />*/}
                {/*  Refresh*/}
                {/*</button>*/}
              </div>
            )}
          </div>

          {/* Results Table */}
          <div className='table-container'>
            <div className='table-container'>
              {/* Table */}
              <div className='table-wrapper'>
                <table className='data-table'>
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
                    {table.getRowModel().rows.map(row => (
                      <tr className='table-row' key={row.id}>
                        {row.getVisibleCells().map(cell => (
                          <td className='table-cell' key={cell.id}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        ))}
                      </tr>
                    ))}
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
      </div>
    </>
  )
}
