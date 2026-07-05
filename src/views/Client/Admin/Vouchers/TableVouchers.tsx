'use client'

import { useState, useMemo, useCallback } from 'react'

import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef
} from '@tanstack/react-table'
import {
  Button,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Chip
} from '@mui/material'
import { TicketPercent, SquarePlus, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'react-toastify'

import { useAdminVouchers, useDeleteVoucher } from '@/hooks/apis/useVouchers'
import type { VoucherCampaign } from '@/hooks/apis/useVouchers'
import ModalAddVoucher from './ModalAddVoucher'

const vnd = (v: number | string | null | undefined) =>
  v == null ? '—' : Number(v).toLocaleString('vi-VN') + 'đ'

const STATUS_META: Record<string, { label: string; color: 'success' | 'default' | 'warning' | 'error' }> = {
  active: { label: 'Đang chạy', color: 'success' },
  inactive: { label: 'Đã tắt', color: 'default' },
  expired: { label: 'Hết hạn', color: 'warning' },
  exhausted: { label: 'Hết lượt', color: 'error' }
}

export default function TableVouchers() {
  const { data: campaigns = [], isLoading } = useAdminVouchers()
  const deleteMutation = useDeleteVoucher()

  const [modalOpen, setModalOpen] = useState(false)
  const [modalType, setModalType] = useState<'create' | 'edit'>('create')
  const [editData, setEditData] = useState<VoucherCampaign | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<VoucherCampaign | null>(null)

  const handleOpenCreate = useCallback(() => {
    setModalType('create')
    setEditData(null)
    setModalOpen(true)
  }, [])

  const handleOpenEdit = useCallback((row: VoucherCampaign) => {
    setModalType('edit')
    setEditData(row)
    setModalOpen(true)
  }, [])

  const handleOpenDelete = useCallback((row: VoucherCampaign) => {
    setDeleteTarget(row)
    setDeleteDialogOpen(true)
  }, [])

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteTarget) return

    try {
      await deleteMutation.mutateAsync(deleteTarget.id)
      toast.info('Đã xoá chiến dịch')
      setDeleteDialogOpen(false)
      setDeleteTarget(null)
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Không xoá được (có thể đã có đơn dùng).')
    }
  }, [deleteTarget, deleteMutation])

  const columns = useMemo<ColumnDef<VoucherCampaign>[]>(
    () => [
      {
        header: 'Tên chiến dịch',
        accessorKey: 'name',
        size: 200,
        cell: ({ row }) => (
          <div>
            <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '13px' }}>{row.original.name}</div>
            <Chip
              label={row.original.code_type === 1 ? 'Mã chung' : 'Mã riêng'}
              size='small'
              variant='outlined'
              color={row.original.code_type === 1 ? 'primary' : 'secondary'}
              sx={{ mt: 0.5, height: 18, fontSize: '11px' }}
            />
          </div>
        )
      },
      {
        header: 'Giảm giá',
        id: 'discount',
        size: 150,
        cell: ({ row }) => {
          const c = row.original
          if (c.discount_type === 1) {
            const cap = c.max_discount_amount ? ` (tối đa ${vnd(c.max_discount_amount)})` : ''

            return (
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#16a34a' }}>
                {Number(c.discount_value)}%{cap}
              </span>
            )
          }

          return (
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#16a34a' }}>{vnd(c.discount_value)}</span>
          )
        }
      },
      {
        header: 'Điều kiện đơn',
        id: 'order_cond',
        size: 150,
        cell: ({ row }) => {
          const c = row.original
          if (!c.min_order_amount && !c.max_order_amount) return <span style={{ color: '#94a3b8' }}>—</span>

          return (
            <span style={{ fontSize: '12px', color: '#64748b' }}>
              {c.min_order_amount ? `từ ${vnd(c.min_order_amount)}` : ''}
              {c.max_order_amount ? ` đến ${vnd(c.max_order_amount)}` : ''}
            </span>
          )
        }
      },
      {
        header: 'Lượt dùng',
        id: 'usage',
        size: 110,
        cell: ({ row }) => {
          const c = row.original

          return (
            <span style={{ fontSize: '13px', color: '#334155' }}>
              {c.used_count ?? 0} / {c.total_capacity ?? c.total_quantity}
            </span>
          )
        }
      },
      {
        header: 'Thời gian',
        id: 'time',
        size: 160,
        cell: ({ row }) => {
          const c = row.original
          const fmt = (s: string | null) =>
            s ? new Date(s).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'

          return (
            <span style={{ fontSize: '12px', color: '#64748b' }}>
              {fmt(c.starts_at)} → {fmt(c.ends_at)}
            </span>
          )
        }
      },
      {
        header: 'Trạng thái',
        accessorKey: 'runtime_status',
        size: 110,
        cell: ({ getValue }) => {
          const meta = STATUS_META[(getValue() as string) || 'active'] ?? STATUS_META.active

          return <Chip label={meta.label} color={meta.color} size='small' />
        }
      },
      {
        header: 'Thao tác',
        id: 'actions',
        size: 90,
        cell: ({ row }) => (
          <div style={{ display: 'flex', gap: 4 }}>
            <Tooltip title='Sửa quy tắc'>
              <IconButton
                size='small'
                onClick={() => handleOpenEdit(row.original)}
                sx={{ color: '#64748b', '&:hover': { color: '#3b82f6', backgroundColor: '#eff6ff' } }}
              >
                <Pencil size={15} />
              </IconButton>
            </Tooltip>
            <Tooltip title='Xoá'>
              <IconButton
                size='small'
                onClick={() => handleOpenDelete(row.original)}
                sx={{ color: '#94a3b8', '&:hover': { color: '#ef4444', backgroundColor: '#fef2f2' } }}
              >
                <Trash2 size={15} />
              </IconButton>
            </Tooltip>
          </div>
        )
      }
    ],
    [handleOpenEdit, handleOpenDelete]
  )

  const table = useReactTable({
    data: campaigns,
    columns,
    getCoreRowModel: getCoreRowModel()
  })

  return (
    <div className='orders-content'>
      <div className='table-container'>
        <div className='table-toolbar'>
          <div className='header-left'>
            <div className='page-icon'>
              <TicketPercent size={17} />
            </div>
            <h5 style={{ margin: 0, fontWeight: 600, fontSize: '15px', color: '#1e293b' }}>Mã giảm giá</h5>
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
                fontSize: '13px',
                textTransform: 'none',
                '&:hover': { opacity: 0.9, boxShadow: '0 6px 16px rgba(0, 0, 0, 0.2)' }
              }}
            >
              Tạo chiến dịch
            </Button>
          </div>
        </div>

        <div className='table-wrapper'>
          <table className='data-table'>
            <thead className='table-header'>
              {table.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map(header => (
                    <th key={header.id} className='table-cell' style={{ width: header.getSize() }}>
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={columns.length} className='table-cell' style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
                    Đang tải...
                  </td>
                </tr>
              ) : campaigns.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className='table-cell' style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
                    Chưa có chiến dịch nào
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map(row => (
                  <tr key={row.id} className='table-row'>
                    {row.getVisibleCells().map(cell => (
                      <td key={cell.id} className='table-cell'>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ModalAddVoucher open={modalOpen} onClose={() => setModalOpen(false)} type={modalType} data={editData} />

      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Xác nhận xoá chiến dịch</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Xoá chiến dịch &quot;{deleteTarget?.name}&quot; và toàn bộ mã của nó? (Không xoá được nếu đã có đơn dùng — hãy tắt thay vì xoá.)
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} variant='outlined'>Hủy</Button>
          <Button onClick={handleConfirmDelete} variant='contained' color='error' disabled={deleteMutation.isPending}>
            {deleteMutation.isPending ? 'Đang xoá...' : 'Xoá'}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  )
}
