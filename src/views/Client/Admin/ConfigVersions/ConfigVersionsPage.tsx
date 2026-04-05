'use client'

import { useState, useMemo, useEffect } from 'react'

import { useSearchParams } from 'next/navigation'

import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef
} from '@tanstack/react-table'
import {
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Pagination,
  Tooltip,
  IconButton
} from '@mui/material'
import { History, RotateCcw, Eye, List } from 'lucide-react'
import { toast } from 'react-toastify'

import {
  useConfigVersions,
  useConfigVersionDetail,
  useConfigVersionModels,
  useRevertConfigVersion
} from '@/hooks/apis/useConfigVersions'
import type { ConfigVersion } from '@/hooks/apis/useConfigVersions'

const MODEL_TYPE_LABELS: Record<string, string> = {
  type_services: 'Sản phẩm',
  providers: 'Nhà cung cấp',
  settings: 'Cài đặt'
}

const ACTION_LABELS: Record<string, { label: string; color: 'success' | 'info' | 'warning' | 'error' }> = {
  created: { label: 'Tạo mới', color: 'success' },
  updated: { label: 'Cập nhật', color: 'info' },
  deleted: { label: 'Xoá', color: 'error' },
  reverted: { label: 'Revert', color: 'warning' }
}

export default function ConfigVersionsPage() {
  const searchParams = useSearchParams()
  const initialType = searchParams.get('type') || ''

  const [page, setPage] = useState(1)
  const [filterType, setFilterType] = useState<string>(initialType)
  const [filterModelId, setFilterModelId] = useState<string>('')

  useEffect(() => {
    const t = searchParams.get('type') || ''

    if (t && t !== filterType) {
      setFilterType(t)
      setFilterModelId('')
      setPage(1)
    }
  }, [searchParams])

  const [detailId, setDetailId] = useState<string | null>(null)
  const [revertDialogOpen, setRevertDialogOpen] = useState(false)
  const [revertTarget, setRevertTarget] = useState<ConfigVersion | null>(null)

  const { data: versionsData, isLoading } = useConfigVersions({
    model_type: filterType || undefined,
    model_id: filterModelId || undefined,
    page,
    per_page: 20
  })
  const { data: modelsData } = useConfigVersionModels()
  const { data: detailData } = useConfigVersionDetail(detailId)
  const revertMutation = useRevertConfigVersion()

  const versions = versionsData?.data ?? []
  const meta = versionsData?.meta ?? { current_page: 1, last_page: 1, total: 0 }
  const models = modelsData ?? []

  const filteredModels = useMemo(() => {
    if (!filterType) return models

    return models.filter(m => m.model_type === filterType)
  }, [models, filterType])

  const handleRevert = async () => {
    if (!revertTarget) return

    try {
      const res = await revertMutation.mutateAsync((revertTarget.id || revertTarget._id))

      if (res?.success) {
        toast.info('Revert thành công')
        setRevertDialogOpen(false)
        setRevertTarget(null)
        setDetailId(null)
      } else {
        toast.error(res?.message || 'Revert thất bại')
      }
    } catch {
      toast.error('Có lỗi xảy ra')
    }
  }

  const columns = useMemo<ColumnDef<ConfigVersion>[]>(
    () => [
      {
        header: '#',
        accessorKey: 'version',
        size: 50,
        cell: ({ row }) => (
          <span style={{ fontWeight: 500, color: '#94a3b8', fontSize: 13, fontFamily: 'monospace' }}>
            v{row.original.version}
          </span>
        )
      },
      {
        header: 'Loại',
        accessorKey: 'model_type',
        size: 110,
        cell: ({ row }) => (
          <Chip
            label={MODEL_TYPE_LABELS[row.original.model_type] || row.original.model_type}
            size='small'
            variant='outlined'
          />
        )
      },
      {
        header: 'Tên',
        accessorKey: 'model_name',
        size: 160,
        cell: ({ row }) => (
          <span style={{ fontWeight: 600, color: '#1e293b', fontSize: 13 }}>
            {row.original.model_name}
          </span>
        )
      },
      {
        header: 'Hành động',
        accessorKey: 'action',
        size: 100,
        cell: ({ row }) => {
          const a = ACTION_LABELS[row.original.action] || { label: row.original.action, color: 'info' as const }

          return <Chip label={a.label} color={a.color} size='small' />
        }
      },
      {
        header: 'Mô tả',
        accessorKey: 'description',
        size: 300,
        cell: ({ row }) => (
          <Tooltip title={row.original.description} placement='top'>
            <span style={{ fontSize: 12, color: '#64748b', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {row.original.description}
            </span>
          </Tooltip>
        )
      },
      {
        header: 'Người sửa',
        accessorKey: 'user_name',
        size: 120,
        cell: ({ row }) => (
          <span style={{ fontSize: 13, color: '#374151' }}>{row.original.user_name}</span>
        )
      },
      {
        header: 'Thời gian',
        accessorKey: 'created_at',
        size: 150,
        cell: ({ row }) => {
          const d = row.original.created_at

          if (!d) return '-'
          const date = new Date(d)

          return (
            <span style={{ fontSize: 12, color: '#94a3b8' }}>
              {date.toLocaleDateString('vi-VN')} {date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )
        }
      },
      {
        header: '',
        id: 'actions',
        size: 80,
        cell: ({ row }) => (
          <div style={{ display: 'flex', gap: 2 }}>
            <Tooltip title='Xem chi tiết'>
              <IconButton
                size='small'
                onClick={() => setDetailId((row.original.id || row.original._id))}
                sx={{ color: '#94a3b8', '&:hover': { color: '#3b82f6', backgroundColor: '#eff6ff' } }}
              >
                <Eye size={15} />
              </IconButton>
            </Tooltip>
            {row.original.snapshot && (
              <Tooltip title='Revert về phiên bản này'>
                <IconButton
                  size='small'
                  onClick={() => {
                    setRevertTarget(row.original)
                    setRevertDialogOpen(true)
                  }}
                  sx={{ color: '#94a3b8', '&:hover': { color: '#f59e0b', backgroundColor: '#fffbeb' } }}
                >
                  <RotateCcw size={15} />
                </IconButton>
              </Tooltip>
            )}
          </div>
        )
      }
    ],
    []
  )

  const table = useReactTable({
    data: versions,
    columns,
    getCoreRowModel: getCoreRowModel()
  })

  return (
    <div className='orders-content'>
      <div className='table-container'>
        {/* Toolbar */}
        <div className='table-toolbar'>
          <div className='header-left'>
            <div className='page-icon'>
              <History size={17} />
            </div>
            <h5 style={{ margin: 0, fontWeight: 600, fontSize: 15, color: '#1e293b' }}>
              Lịch sử cấu hình
            </h5>
            {meta.total > 0 && (
              <Chip label={meta.total} size='small' variant='outlined' sx={{ ml: 1 }} />
            )}
          </div>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid #e2e8f0', flexWrap: 'wrap' }}>
          <FormControl size='small' sx={{ minWidth: 150 }}>
            <InputLabel>Loại</InputLabel>
            <Select
              value={filterType}
              label='Loại'
              onChange={e => {
                setFilterType(e.target.value)
                setFilterModelId('')
                setPage(1)
              }}
            >
              <MenuItem value=''>Tất cả</MenuItem>
              <MenuItem value='type_services'>Sản phẩm</MenuItem>
              <MenuItem value='providers'>Nhà cung cấp</MenuItem>
              <MenuItem value='settings'>Cài đặt</MenuItem>
            </Select>
          </FormControl>

          {filterType && filteredModels.length > 0 && (
            <FormControl size='small' sx={{ minWidth: 200 }}>
              <InputLabel>Đối tượng</InputLabel>
              <Select
                value={filterModelId}
                label='Đối tượng'
                onChange={e => {
                  setFilterModelId(e.target.value)
                  setPage(1)
                }}
              >
                <MenuItem value=''>Tất cả</MenuItem>
                {filteredModels.map(m => (
                  <MenuItem key={`${m.model_type}-${m.model_id}`} value={String(m.model_id)}>
                    {m.model_name} ({m.total_versions} phiên bản)
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {(filterType || filterModelId) && (
            <Button
              size='small'
              variant='text'
              onClick={() => {
                setFilterType('')
                setFilterModelId('')
                setPage(1)
              }}
              sx={{ textTransform: 'none', fontSize: 13 }}
            >
              Xoá bộ lọc
            </Button>
          )}
        </div>

        {/* Table */}
        <div className='table-wrapper'>
          <table className='data-table'>
            <thead className='table-header'>
              {table.getHeaderGroups().map(hg => (
                <tr key={hg.id}>
                  {hg.headers.map(h => (
                    <th key={h.id} className='table-cell' style={{ width: h.getSize() }}>
                      {flexRender(h.column.columnDef.header, h.getContext())}
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
              ) : versions.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className='table-cell' style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
                    Chưa có lịch sử thay đổi
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

        {/* Pagination */}
        {meta.last_page > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0' }}>
            <Pagination
              count={meta.last_page}
              page={meta.current_page}
              onChange={(_, p) => setPage(p)}
              size='small'
            />
          </div>
        )}
      </div>

      {/* Detail Dialog */}
      <VersionDetailDialog
        detailId={detailId}
        detailData={detailData}
        onClose={() => setDetailId(null)}
        onRevert={v => {
          setRevertTarget(v)
          setRevertDialogOpen(true)
        }}
      />

      {/* Revert Confirm Dialog */}
      <Dialog open={revertDialogOpen} onClose={() => setRevertDialogOpen(false)} maxWidth='xs' fullWidth>
        <DialogTitle sx={{ fontSize: 15, fontWeight: 600 }}>Xác nhận revert</DialogTitle>
        <DialogContent>
          {revertTarget && (
            <div style={{ fontSize: 13 }}>
              <p>
                Bạn có chắc muốn revert <strong>{revertTarget.model_name}</strong> về phiên bản{' '}
                <strong>v{revertTarget.version}</strong>?
              </p>
              <p style={{ color: '#94a3b8', fontSize: 12, marginTop: 8 }}>
                Hành động này sẽ tạo phiên bản mới (revert) và cập nhật dữ liệu hiện tại về trạng thái cũ.
              </p>
            </div>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRevertDialogOpen(false)} sx={{ textTransform: 'none' }}>Huỷ</Button>
          <Button
            onClick={handleRevert}
            color='warning'
            variant='contained'
            disabled={revertMutation.isPending}
            startIcon={<RotateCcw size={16} />}
            sx={{ textTransform: 'none' }}
          >
            {revertMutation.isPending ? 'Đang revert...' : 'Revert'}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  )
}

// ─── Detail Dialog ───

function VersionDetailDialog({
  detailId,
  detailData,
  onClose,
  onRevert
}: {
  detailId: string | null
  detailData: { data: ConfigVersion; current: Record<string, any> | null } | undefined
  onClose: () => void
  onRevert: (v: ConfigVersion) => void
}) {
  if (!detailId) return null
  const version = detailData?.data
  const current = detailData?.current

  return (
    <Dialog open={!!detailId} onClose={onClose} maxWidth='md' fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, fontSize: 15, fontWeight: 600 }}>
        <History size={18} />
        {version ? `${version.model_name} — v${version.version}` : 'Đang tải...'}
      </DialogTitle>
      <DialogContent dividers>
        {!version ? (
          <div style={{ padding: '16px 0', textAlign: 'center', color: '#94a3b8' }}>Đang tải...</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Info */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 13 }}>
              <div>
                <span style={{ color: '#94a3b8' }}>Người sửa:</span>{' '}
                <strong>{version.user_name}</strong>
              </div>
              <div>
                <span style={{ color: '#94a3b8' }}>Thời gian:</span>{' '}
                {new Date(version.created_at).toLocaleString('vi-VN')}
              </div>
              <div>
                <span style={{ color: '#94a3b8' }}>Hành động:</span>{' '}
                <Chip
                  label={ACTION_LABELS[version.action]?.label || version.action}
                  color={ACTION_LABELS[version.action]?.color || 'info'}
                  size='small'
                />
              </div>
              <div>
                <span style={{ color: '#94a3b8' }}>Mô tả:</span>{' '}
                <span style={{ fontSize: 12 }}>{version.description}</span>
              </div>
            </div>

            {/* Changes diff */}
            {version.changes && Object.keys(version.changes).length > 0 && (
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>Thay đổi</div>
                <div style={{ borderRadius: 8, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                  <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc' }}>
                        <th style={{ padding: '6px 12px', textAlign: 'left', fontWeight: 600, color: '#64748b' }}>Field</th>
                        <th style={{ padding: '6px 12px', textAlign: 'left', fontWeight: 600, color: '#dc2626' }}>Trước</th>
                        <th style={{ padding: '6px 12px', textAlign: 'left', fontWeight: 600, color: '#16a34a' }}>Sau</th>
                        {current && <th style={{ padding: '6px 12px', textAlign: 'left', fontWeight: 600, color: '#3b82f6' }}>Hiện tại</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(version.changes).map(([field, diff]) => (
                        <tr key={field} style={{ borderTop: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '6px 12px', fontFamily: 'monospace', fontWeight: 600, color: '#475569' }}>{field}</td>
                          <td style={{ padding: '6px 12px', color: '#dc2626', background: 'rgba(254,242,242,0.5)' }}>
                            <ValueDisplay value={diff.old} />
                          </td>
                          <td style={{ padding: '6px 12px', color: '#16a34a', background: 'rgba(240,253,244,0.5)' }}>
                            <ValueDisplay value={diff.new} />
                          </td>
                          {current && (
                            <td style={{ padding: '6px 12px', color: '#3b82f6' }}>
                              <ValueDisplay value={current[field]} />
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Snapshot */}
            {version.snapshot && (
              <details style={{ fontSize: 12 }}>
                <summary style={{ cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>
                  Snapshot trước khi sửa ({Object.keys(version.snapshot).length} fields)
                </summary>
                <pre style={{ background: '#f8fafc', borderRadius: 8, padding: 12, overflow: 'auto', maxHeight: 240, fontSize: 11, border: '1px solid #e2e8f0' }}>
                  {JSON.stringify(version.snapshot, null, 2)}
                </pre>
              </details>
            )}
          </div>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} sx={{ textTransform: 'none' }}>Đóng</Button>
        {version?.snapshot && (
          <Button
            color='warning'
            variant='contained'
            startIcon={<RotateCcw size={16} />}
            onClick={() => onRevert(version)}
            sx={{ textTransform: 'none' }}
          >
            Revert về phiên bản này
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}

// ─── Value Display ───

function ValueDisplay({ value }: { value: any }) {
  if (value === null || value === undefined) return <span style={{ color: '#cbd5e1', fontStyle: 'italic' }}>null</span>
  if (typeof value === 'boolean') return <span>{value ? 'true' : 'false'}</span>

  if (typeof value === 'object') {
    const str = JSON.stringify(value)

    if (str.length > 80) {
      return (
        <Tooltip title={<pre style={{ fontSize: 10, maxWidth: 400, whiteSpace: 'pre-wrap' }}>{JSON.stringify(value, null, 2)}</pre>} placement='top'>
          <span style={{ cursor: 'help' }}>{str.slice(0, 80)}...</span>
        </Tooltip>
      )
    }

    return <span>{str}</span>
  }

  const str = String(value)

  if (str.length > 80) {
    return (
      <Tooltip title={str} placement='top'>
        <span style={{ cursor: 'help' }}>{str.slice(0, 80)}...</span>
      </Tooltip>
    )
  }

  return <span>{str}</span>
}
