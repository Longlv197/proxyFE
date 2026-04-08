'use client'

import React, { useEffect, useMemo, useState, useCallback, useRef, lazy, Suspense } from 'react'

import Image from 'next/image'
import { useParams, useRouter } from 'next/navigation'

import { CircleQuestionMark, BadgeCheck, BadgeMinus, ShoppingCart, ShoppingCartIcon, List, Copy, SquarePen, Trash2, SquarePlus, Search, DollarSign, Loader2, GripVertical, ChevronUp, ChevronDown, RefreshCw, History } from 'lucide-react'

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

import { useQuery, useQueryClient } from '@tanstack/react-query'

import { DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors } from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  Tooltip,
  IconButton
} from '@mui/material'

import { toast } from 'react-toastify'

import useAxiosAuth from '@/hocs/useAxiosAuth'
import { useCopyServiceType, useDeleteServiceType } from '@/hooks/apis/useServiceType'
const ServiceFormModal = lazy(() => import('@/views/Client/Admin/ServiceType/ServiceFormModal'))
const ChildServiceFormModal = lazy(() => import('@/views/Client/Admin/ServiceType/ChildServiceFormModal'))
import CustomPriceModal from '@/views/Client/Admin/ServiceType/CustomPriceModal'
import { getTagStyle } from '@/configs/tagConfig'
import { useBranding } from '@/app/contexts/BrandingContext'
import ConfigVersionDrawer from '@/views/Client/Admin/ConfigVersions/ConfigVersionDrawer'

// ─── EditableOrderCell — isolated component, không rerender bảng ───
const EditableOrderCell = React.memo(function EditableOrderCell({ value, onSave }: { value: number; onSave: (newOrder: number) => void }) {
  const [editing, setEditing] = useState(false)
  const [localValue, setLocalValue] = useState(String(value))
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { setLocalValue(String(value)) }, [value])
  useEffect(() => { if (editing) inputRef.current?.select() }, [editing])

  const handleSave = () => {
    setEditing(false)
    const parsed = parseInt(localValue) || 0
    onSave(parsed)
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type='number'
        value={localValue}
        onChange={event => setLocalValue(event.target.value)}
        onBlur={handleSave}
        onKeyDown={event => { if (event.key === 'Enter') handleSave(); if (event.key === 'Escape') setEditing(false) }}
        style={{ width: 50, textAlign: 'center', fontSize: 13, padding: '2px 4px', border: '1px solid #93c5fd', borderRadius: 4, outline: 'none' }}
      />
    )
  }

  return (
    <span
      onClick={() => setEditing(true)}
      title='Click để sửa thứ tự'
      style={{ cursor: 'pointer', fontSize: 13, fontWeight: 500, color: '#475569', padding: '2px 8px', borderRadius: 4, background: '#f1f5f9', display: 'inline-block', minWidth: 30, textAlign: 'center' }}
    >
      {localValue}
    </span>
  )
})

// ─── SortableRow component ───
interface SortableRowProps {
  rowId: string | number
  disabled?: boolean
  showDragHandle: boolean
  children: React.ReactNode
}

function SortableRow({ rowId, disabled, showDragHandle, children }: SortableRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: rowId, disabled })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: 'relative',
    zIndex: isDragging ? 999 : undefined,
    background: isDragging ? '#f1f5f9' : undefined
  }

  return (
    <tr ref={setNodeRef} style={style} className='table-row' {...attributes}>
      {/* Drag handle column */}
      <td className='table-cell' style={{ width: 40, textAlign: 'center', padding: '0 4px' }}>
        {showDragHandle ? (
          <span
            {...listeners}
            style={{ cursor: isDragging ? 'grabbing' : 'grab', display: 'inline-flex', alignItems: 'center', color: '#94a3b8' }}
          >
            <GripVertical size={16} />
          </span>
        ) : null}
      </td>
      {children}
    </tr>
  )
}

export default function TableServiceType() {
  const { isChild } = useBranding()
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  const [columnFilters, setColumnFilters] = useState<any[]>([])
  const [rowSelection, setRowSelection] = useState({}) // State để lưu các hàng được chọn
  const [sorting, setSorting] = useState<any[]>([])
  const [searchText, setSearchText] = useState('')
  const [filterType, setFilterType] = useState<'' | 'static' | 'rotating'>('')
  const [filterStatus, setFilterStatus] = useState<'' | 'active' | 'inactive'>('')

  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10
  })

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [serviceToDelete, setServiceToDelete] = useState<number | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingData, setEditingData] = useState<any>(null)
  const [customPriceService, setCustomPriceService] = useState<any>(null)
  const [versionDrawerOpen, setVersionDrawerOpen] = useState(false)
  const [versionDrawerService, setVersionDrawerService] = useState<{ id: number; name: string } | null>(null)

  const router = useRouter()
  const params = useParams()
  const axiosAuth = useAxiosAuth()
  const { lang: locale } = params

  const queryClient = useQueryClient()

  const copyMutation = useCopyServiceType()
  const deleteMutation = useDeleteServiceType()

  // ─── Drag-and-drop reorder state (non-data-dependent parts) ───
  const [orderedIds, setOrderedIds] = useState<number[]>([])
  const reorderTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isReorderingRef = useRef(false)

  const isFilterActive = !!(searchText || filterType || filterStatus)

  const pointerSensor = useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  const keyboardSensor = useSensor(KeyboardSensor)
  const dndSensors = useSensors(pointerSensor, keyboardSensor)

  // Call reorder API (debounced)
  const callReorderApi = useCallback(
    (newIds: number[]) => {
      if (reorderTimerRef.current) {
        clearTimeout(reorderTimerRef.current)
      }

      isReorderingRef.current = true
      reorderTimerRef.current = setTimeout(async () => {
        try {
          await axiosAuth.post('/reorder-service-types', { ids: newIds })
          toast.success('Cập nhật thứ tự thành công!')
          queryClient.invalidateQueries({ queryKey: ['orderProxyStatic'] })
        } catch (error: any) {
          toast.error(error?.response?.data?.message || 'Có lỗi khi sắp xếp lại')
          // Revert to server data
          queryClient.invalidateQueries({ queryKey: ['orderProxyStatic'] })
        } finally {
          isReorderingRef.current = false
        }
      }, 500)
    },
    [axiosAuth, queryClient]
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event

      if (!over || active.id === over.id) return

      setOrderedIds(prevIds => {
        const oldIndex = prevIds.indexOf(Number(active.id))
        const newIndex = prevIds.indexOf(Number(over.id))

        if (oldIndex === -1 || newIndex === -1) return prevIds
        const reorderedIds = arrayMove(prevIds, oldIndex, newIndex)

        callReorderApi(reorderedIds)

        return reorderedIds
      })
    },
    [callReorderApi]
  )

  const handleMoveItem = useCallback(
    (itemId: number, direction: 'up' | 'down') => {
      setOrderedIds(prevIds => {
        const currentIndex = prevIds.indexOf(itemId)

        if (currentIndex === -1) return prevIds
        const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1

        if (targetIndex < 0 || targetIndex >= prevIds.length) return prevIds
        const reorderedIds = arrayMove(prevIds, currentIndex, targetIndex)

        callReorderApi(reorderedIds)

        return reorderedIds
      })
    },
    [callReorderApi]
  )

  const handleOpenCreate = useCallback(() => {
    setEditingId(null)
    setEditingData(null)
    // Defer sang frame tiếp — tránh batch với table re-render khi data arrive
    requestAnimationFrame(() => setModalOpen(true))
  }, [])

  const handleOpenEdit = useCallback(
    (row: any) => {
      setEditingId(row.id)
      setEditingData(row)
      requestAnimationFrame(() => setModalOpen(true))
    },
    []
  )

  const handleCopyService = useCallback(
    (serviceId: number) => {
      copyMutation.mutate(serviceId, {
        onSuccess: () => {
          toast.success('Sao chép dịch vụ thành công!')
        },
        onError: (error: any) => {
          toast.error(error?.response?.data?.message || 'Có lỗi xảy ra khi sao chép')
        }
      })
    },
    [copyMutation]
  )

  const handleOpenDeleteDialog = useCallback((serviceId: number) => {
    setServiceToDelete(serviceId)
    setDeleteDialogOpen(true)
  }, [])

  const handleCloseDeleteDialog = useCallback(() => {
    setDeleteDialogOpen(false)
    setServiceToDelete(null)
  }, [])

  const handleConfirmDelete = useCallback(() => {
    if (serviceToDelete) {
      deleteMutation.mutate(serviceToDelete, {
        onSuccess: () => {
          toast.success('Xóa dịch vụ thành công!')
          handleCloseDeleteDialog()
        },
        onError: (error: any) => {
          toast.error(error?.response?.data?.message || 'Có lỗi xảy ra khi xóa')
        }
      })
    }
  }, [serviceToDelete, deleteMutation, handleCloseDeleteDialog])

  const { data: dataServices = [], isLoading } = useQuery({
    queryKey: ['orderProxyStatic'],
    queryFn: async () => {
      const res = await axiosAuth.get('/get-service-types')

      return res.data.data
    },
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    staleTime: 0
  })

  // Keep orderedIds in sync with server data
  useEffect(() => {
    if (!isReorderingRef.current && dataServices.length > 0) {
      setOrderedIds(dataServices.map((item: any) => item.id))
    }
  }, [dataServices])

  // Sorted data based on local order (used for table data)
  const sortedDataServices = useMemo(() => {
    if (orderedIds.length === 0) return dataServices
    const idMap = new Map(dataServices.map((item: any) => [item.id, item]))

    return orderedIds.map(id => idMap.get(id)).filter(Boolean)
  }, [dataServices, orderedIds])

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { bg: string; color: string; dot: string; label: string }> = {
      active: { bg: '#f0fdf4', color: '#15803d', dot: '#22c55e', label: 'Hoạt động' },
      inactive: { bg: '#fef2f2', color: '#991b1b', dot: '#ef4444', label: 'Tắt' }
    }
    const s = styles[status] || { bg: '#f8fafc', color: '#64748b', dot: '#94a3b8', label: 'Không rõ' }
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '12px', fontWeight: 600, color: s.color, background: s.bg, borderRadius: 20, padding: '3px 10px 3px 8px' }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: s.dot, flexShrink: 0 }} />
        {s.label}
      </span>
    )
  }

  const filteredData = useMemo(() => {
    let result = sortedDataServices

    if (searchText) {
      const lower = searchText.toLowerCase()

      result = result.filter((item: any) => item.name?.toLowerCase().includes(lower) || item.code?.toLowerCase().includes(lower))
    }

    if (filterType === 'static') {
      result = result.filter((item: any) => item.type === 0 || item.type === '0')
    } else if (filterType === 'rotating') {
      result = result.filter((item: any) => item.type === 1 || item.type === '1')
    }

    if (filterStatus) {
      result = result.filter((item: any) => item.status === filterStatus)
    }

    
return result
  }, [sortedDataServices, searchText, filterType, filterStatus])

  const handleUpdateOrder = useCallback(async (itemId: number, newOrder: number) => {
    try {
      await axiosAuth.post('/reorder-service-types', { id: itemId, order: newOrder })
      toast.success('Đã lưu thứ tự')
    } catch {
      toast.error('Lỗi cập nhật thứ tự')
    }
  }, [axiosAuth])

  const [refreshing, setRefreshing] = useState(false)

  const handleRefreshList = useCallback(async () => {
    setRefreshing(true)
    await Promise.all([
      queryClient.refetchQueries({ queryKey: ['orderProxyStatic'] }),
      new Promise(resolve => setTimeout(resolve, 1000))
    ])
    setRefreshing(false)
  }, [queryClient])

  const columns = useMemo(
    () => [
      {
        header: 'Thứ tự',
        size: 60,
        cell: ({ row }: { row: any }) => (
          <EditableOrderCell
            value={row.original?.order ?? 0}
            onSave={(newOrder: number) => handleUpdateOrder(row.original.id, newOrder)}
          />
        )
      },
      {
        header: 'Sản phẩm',
        minSize: 240,
        cell: ({ row }: { row: any }) => {
          const o = row.original
          return (
            <div style={{ lineHeight: 1.6 }}>
              <div style={{ fontWeight: 700, fontSize: '14px', color: '#0f172a', marginBottom: 3 }}>{o?.name}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
                <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#64748b', background: '#f1f5f9', borderRadius: 4, padding: '1px 6px' }}>
                  ID: {o?.id}
                </span>
                {o?.code && (
                  <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#6366f1', background: '#eef2ff', borderRadius: 4, padding: '1px 6px' }}>
                    {o.code}
                  </span>
                )}
              </div>
              {!isChild && o?.provider?.title && (
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#a78bfa', flexShrink: 0 }} />
                  {o.provider.title}
                </div>
              )}
            </div>
          )
        }
      },
      {
        header: 'Trạng thái',
        cell: ({ row }: { row: any }) => {
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {getStatusBadge(row.original.status)}
              {row.original.is_purchasable === false && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '11px', fontWeight: 500, color: '#92400e', background: '#fffbeb', borderRadius: 20, padding: '2px 8px 2px 6px' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f59e0b', flexShrink: 0 }} />
                  Ngừng bán
                </span>
              )}
            </div>
          )
        },
        minSize: 110
      },
      {
        header: 'Phân loại',
        minSize: 150,
        cell: ({ row }: { row: any }) => {
          const o = row.original
          const type = o?.type
          const typeText = type === 0 || type === '0' ? 'Tĩnh' : type === 1 || type === '1' ? 'Xoay' : type || '-'
          const proxyType = o?.proxy_type
          const proxyTypeText = proxyType === 'residential' ? 'Dân cư' : proxyType === 'datacenter' ? 'Datacenter' : proxyType || ''
          const ipVersion = o?.ip_version
          const ipText = ipVersion === 'ipv4' ? 'IPv4' : ipVersion === 'ipv6' ? 'IPv6' : ipVersion || ''
          const protocols = o?.protocols

          return (
            <div style={{ lineHeight: 1.6 }}>
              <div style={{ fontWeight: 600, fontSize: '12px' }}>{typeText}{proxyTypeText ? ` · ${proxyTypeText}` : ''}</div>
              {ipText && <div style={{ fontSize: '11px', color: '#64748b' }}>{ipText}</div>}
              {protocols && protocols.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 2 }}>
                  {protocols.map((p: string, i: number) => (
                    <Chip key={i} label={p.toUpperCase()} size='small' variant='outlined' sx={{ height: 20, fontSize: '10px' }} />
                  ))}
                </div>
              )}
            </div>
          )
        }
      },
      {
        header: 'Giá bán',
        cell: ({ row }: { row: any }) => {
          const data = row.original
          const isPerUnit = data?.pricing_mode === 'per_unit'

          // Per_unit: hiện giá/ngày + chiết khấu thời gian + chiết khấu SL
          if (isPerUnit) {
            const unitPrice = parseInt(data?.price_per_unit) || 0
            if (!unitPrice) return <div style={{ color: '#94a3b8' }}>-</div>
            const unitLabel = data?.time_unit === 'month' ? 'tháng' : 'ngày'
            const tiers = data?.metadata?.discount_tiers || []
            const qtyTiers = data?.metadata?.quantity_tiers || []

            return (
              <div style={{ fontSize: '12px', lineHeight: '1.6', whiteSpace: 'normal' }}>
                <div style={{ whiteSpace: 'nowrap' }}>
                  <span style={{ fontWeight: 600, color: '#334155' }}>{unitPrice.toLocaleString('vi-VN')}đ</span>
                  <span style={{ color: '#94a3b8' }}>/{unitLabel}</span>
                </div>
                {tiers.filter((t: any) => t.min && (t.discount || t.price)).map((t: any, i: number) => {
                  const disc = parseFloat(t.discount) || 0
                  const tierPrice = t.price ? parseInt(t.price) : Math.round(unitPrice * (1 - disc / 100))

                  return (
                    <div key={i} style={{ color: '#16a34a', fontSize: '11px', whiteSpace: 'nowrap' }}>
                      {t.min}+{unitLabel}: {tierPrice.toLocaleString('vi-VN')}đ ({disc}%)
                    </div>
                  )
                })}
                {qtyTiers.filter((t: any) => t.min && (t.discount || t.price)).map((t: any, i: number) => {
                  const disc = parseFloat(t.discount) || 0
                  const qtyPrice = t.price ? parseInt(t.price) : null

                  return (
                    <div key={`q${i}`} style={{ color: '#7c3aed', fontSize: '11px', whiteSpace: 'nowrap' }}>
                      {t.min}+ proxy: {qtyPrice ? `${qtyPrice.toLocaleString('vi-VN')}đ` : ''}{disc ? ` -${disc}%` : ''}
                    </div>
                  )
                })}
              </div>
            )
          }

          // Fixed: hiện mốc giá cố định
          const priceData = data?.price_by_duration
          if (!priceData) return <div style={{ color: '#94a3b8' }}>-</div>
          let prices: any[] = []
          try { prices = typeof priceData === 'string' ? JSON.parse(priceData) : priceData } catch { return <div style={{ color: '#94a3b8' }}>-</div> }
          if (!Array.isArray(prices) || prices.length === 0) return <div style={{ color: '#94a3b8' }}>-</div>
          const durationLabels: Record<string, string> = { '1': 'Ngày', '7': 'Tuần', '30': 'Tháng' }

          return (
            <div style={{ fontSize: '12px', lineHeight: '1.6', whiteSpace: 'normal' }}>
              {['1', '7', '30'].map(d => {
                const item = prices.find((p: any) => p.key === d || p.duration === d)
                if (!item) return null
                const price = new Intl.NumberFormat('vi-VN').format(parseInt(item.value || item.price || '0') || 0)
                const itemQtyTiers = item.quantity_tiers || []
                return (
                  <div key={d}>
                    <div style={{ whiteSpace: 'nowrap' }}>
                      <span style={{ color: '#64748b' }}>{durationLabels[d]}: </span>
                      <span style={{ fontWeight: 600, color: '#334155' }}>{price}đ</span>
                    </div>
                    {itemQtyTiers.filter((t: any) => t.min && (t.discount || t.price)).map((t: any, i: number) => {
                      const disc = parseFloat(t.discount) || 0
                      const qtyPrice = t.price ? parseInt(t.price) : null

                      return (
                        <div key={`q${d}-${i}`} style={{ color: '#7c3aed', fontSize: '11px', whiteSpace: 'nowrap', paddingLeft: 8 }}>
                          {t.min}+ proxy: {qtyPrice ? `${qtyPrice.toLocaleString('vi-VN')}đ` : ''}{disc ? ` -${disc}%` : ''}
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          )
        },
        minSize: 140
      },
      {
        header: 'Tag',
        cell: ({ row }: { row: any }) => {
          const tagStr = row.original?.tag

          if (!tagStr) return <div style={{ color: '#94a3b8' }}>-</div>
          const tags = tagStr.split(',').map((t: string) => t.trim()).filter(Boolean)

          if (tags.length === 0) return <div style={{ color: '#94a3b8' }}>-</div>
          
return (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              {tags.map((tag: string, i: number) => {
                const style = getTagStyle(tag)

                
return (
                  <span key={i} style={{ padding: '2px 8px', fontSize: '11px', fontWeight: 600, borderRadius: '4px', backgroundColor: style.bgColor, color: style.textColor, border: `1px solid ${style.borderColor}`, whiteSpace: 'nowrap' }}>
                    {tag}
                  </span>
                )
              })}
            </div>
          )
        },
        minSize: 100
      },
      {
        header: 'Action',
        cell: ({ row }: { row: any }) => {
          const itemId = row.original.id
          const itemIndex = orderedIds.indexOf(itemId)
          const isFirstItem = itemIndex === 0
          const isLastItem = itemIndex === orderedIds.length - 1

          return (
            <div className='flex gap-2 items-center'>
              {/* Up/Down arrow buttons — hidden when filters are active */}
              {!isFilterActive && (
                <div className='flex flex-col' style={{ gap: '1px' }}>
                  <Tooltip title='Di chuyển lên'>
                    <span>
                      <IconButton
                        size='small'
                        disabled={isFirstItem}
                        onClick={() => handleMoveItem(itemId, 'up')}
                        sx={{ padding: '1px', color: '#64748b', '&:hover': { color: '#334155' } }}
                      >
                        <ChevronUp size={15} />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title='Di chuyển xuống'>
                    <span>
                      <IconButton
                        size='small'
                        disabled={isLastItem}
                        onClick={() => handleMoveItem(itemId, 'down')}
                        sx={{ padding: '1px', color: '#64748b', '&:hover': { color: '#334155' } }}
                      >
                        <ChevronDown size={15} />
                      </IconButton>
                    </span>
                  </Tooltip>
                </div>
              )}

              <Tooltip title='Chỉnh sửa dịch vụ'>
                <IconButton size='small' color='info' onClick={() => handleOpenEdit(row.original)}>
                  <SquarePen size={18} />
                </IconButton>
              </Tooltip>

              {!isChild && (
                <Tooltip title='Giá riêng'>
                  <IconButton size='small' color='warning' onClick={() => setCustomPriceService(row.original)}>
                    <DollarSign size={18} />
                  </IconButton>
                </Tooltip>
              )}

              <Tooltip title='Lịch sử cấu hình'>
                <IconButton
                  size='small'
                  sx={{ color: '#7c3aed' }}
                  onClick={() => {
                    setVersionDrawerService({ id: row.original.id, name: row.original.name })
                    setVersionDrawerOpen(true)
                  }}
                >
                  <History size={18} />
                </IconButton>
              </Tooltip>

              <Tooltip title='Sao chép dịch vụ'>
                <span>
                  <IconButton
                    size='small'
                    color='success'
                    onClick={() => handleCopyService(row.original.id)}
                    disabled={copyMutation.isPending}
                  >
                    <Copy size={18} />
                  </IconButton>
                </span>
              </Tooltip>

              <Tooltip title='Xóa dịch vụ'>
                <span>
                  <IconButton
                    size='small'
                    color='error'
                    onClick={() => handleOpenDeleteDialog(row.original.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 size={18} />
                  </IconButton>
                </span>
              </Tooltip>
            </div>
          )
        },
        minSize: 140
      }
    ],
    [handleOpenEdit, handleCopyService, handleOpenDeleteDialog, handleMoveItem, handleUpdateOrder, copyMutation.isPending, deleteMutation.isPending, isFilterActive, orderedIds, isChild]
  )

  const table = useReactTable({
    data: filteredData,
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

  // Row IDs for current page (used by SortableContext)
  const tableRows = table.getRowModel().rows
  const sortableRowIds = useMemo(
    () => tableRows.map(row => (row.original as any).id as number),
    [tableRows]
  )

  const { pageIndex, pageSize } = table.getState().pagination
  const totalRows = table.getFilteredRowModel().rows.length
  const startRow = pageIndex * pageSize + 1
  const endRow = Math.min(startRow + pageSize - 1, totalRows)

  return (
    <>
      <div className='orders-content'>
        {/* Toolbar */}

        {/* Proxy Table */}
        <div className='table-container'>
          <div className='table-toolbar'>
            <div className='header-left'>
              <div className='page-icon'>
                <List size={17} />
              </div>
              <div className='flex justify-between align-middle w-full'>
                <h5 className='mb-0 font-semibold'>Danh sách dịch vụ</h5>
              </div>
            </div>

            <div className='header-right' style={{ display: 'flex', gap: 8 }}>
              <Button
                onClick={handleRefreshList}
                variant='outlined'
                size='small'
                disabled={refreshing}
                startIcon={<RefreshCw size={14} style={{ transition: 'transform 0.5s ease', transform: refreshing ? 'rotate(360deg)' : 'none', animation: refreshing ? 'spin 0.8s linear infinite' : 'none' }} />}
                sx={{ textTransform: 'none', fontSize: 13, '@keyframes spin': { from: { transform: 'rotate(0deg)' }, to: { transform: 'rotate(360deg)' } } }}
              >
                {refreshing ? 'Đang tải...' : 'Làm mới'}
              </Button>
              <Button
                onClick={handleOpenCreate}
                variant='contained'
                size='small'
                disabled={isLoading}
                startIcon={isLoading ? <Loader2 size={16} className='animate-spin' /> : <SquarePlus size={16} />}
                sx={{ background: 'var(--primary-gradient, linear-gradient(45deg, #FC4336, #F88A4B))', color: '#fff', '&:hover': { opacity: 0.9 }, '&.Mui-disabled': { opacity: 0.6, color: '#fff' } }}
              >
                {isLoading ? 'Đang tải...' : 'Thêm dịch vụ'}
              </Button>
            </div>
          </div>

          {/* Search & Filter bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderBottom: '1px solid #e2e8f0', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1', minWidth: '200px', maxWidth: '300px', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0 12px', background: '#f8fafc' }}>
              <Search size={16} style={{ color: '#94a3b8', flexShrink: 0 }} />
              <input
                type='text'
                placeholder='Tìm theo tên...'
                value={searchText}
                onChange={e => { setSearchText(e.target.value); setPagination(p => ({ ...p, pageIndex: 0 })) }}
                style={{ border: 'none', outline: 'none', fontSize: '13px', padding: '8px 0', width: '100%', background: 'transparent' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              {([
                { label: 'Tất cả', value: '' },
                { label: 'Tĩnh', value: 'static' },
                { label: 'Xoay', value: 'rotating' }
              ] as const).map(opt => (
                <button
                  key={opt.value}
                  onClick={() => { setFilterType(opt.value as any); setPagination(p => ({ ...p, pageIndex: 0 })) }}
                  style={{
                    padding: '6px 14px', fontSize: '13px', fontWeight: filterType === opt.value ? 600 : 500,
                    borderRadius: '6px',
                    border: `1px solid ${filterType === opt.value ? 'var(--primary-hover, #e63946)' : '#e2e8f0'}`,
                    background: filterType === opt.value ? 'color-mix(in srgb, var(--primary-hover, #e63946) 10%, white)' : 'white',
                    color: filterType === opt.value ? 'var(--primary-hover, #e63946)' : '#64748b',
                    cursor: 'pointer', transition: 'all 0.2s'
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              {([
                { label: 'Active', value: 'active', activeColor: '#22c55e', activeBg: '#f0fdf4', activeText: '#16a34a' },
                { label: 'Inactive', value: 'inactive', activeColor: '#ef4444', activeBg: '#fef2f2', activeText: '#dc2626' }
              ] as const).map(opt => (
                <button
                  key={opt.value}
                  onClick={() => { setFilterStatus(prev => prev === opt.value ? '' : opt.value as any); setPagination(p => ({ ...p, pageIndex: 0 })) }}
                  style={{
                    padding: '6px 14px', fontSize: '13px', fontWeight: filterStatus === opt.value ? 600 : 500,
                    borderRadius: '6px',
                    border: `1px solid ${filterStatus === opt.value ? opt.activeColor : '#e2e8f0'}`,
                    background: filterStatus === opt.value ? opt.activeBg : 'white',
                    color: filterStatus === opt.value ? opt.activeText : '#64748b',
                    cursor: 'pointer', transition: 'all 0.2s'
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {(searchText || filterType || filterStatus) && (
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                {filteredData.length} / {dataServices.length} dịch vụ
              </span>
            )}
          </div>

          {/* Table — DndContext chỉ render ở client để tránh hydration mismatch */}
          {mounted ? (
          <DndContext
            sensors={dndSensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={sortableRowIds} strategy={verticalListSortingStrategy}>
              <div className='table-wrapper' style={{ overflowX: 'auto' }}>
                <table className='data-table' style={{ ...(isLoading || dataServices.length === 0 ? { height: '100%' } : {}), tableLayout: 'auto', minWidth: '100%', whiteSpace: 'nowrap' }}>
                  <thead className='table-header' style={{ position: 'sticky', top: 0, zIndex: 10, background: '#f8fafc' }}>
                    {table.getHeaderGroups().map(headerGroup => (
                      <tr key={headerGroup.id}>
                        {/* Drag handle header */}
                        <th className='table-header th' style={{ width: 40, textAlign: 'center', padding: '0 4px' }}>
                          {!isFilterActive && <GripVertical size={14} style={{ color: '#94a3b8', margin: '0 auto' }} />}
                        </th>
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
                        <td colSpan={columns.length + 1} className='py-10 text-center'>
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
                        <td colSpan={columns.length + 1} className='py-10 text-center'>
                          <div className='flex flex-col items-center justify-center'>
                            <Image src='/images/no-data.png' alt='No data' width={160} height={160} />
                            <p className='mt-4 text-gray-500'>Không có dữ liệu</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      table.getRowModel().rows.map(row => (
                        <SortableRow
                          key={(row.original as any).id}
                          rowId={(row.original as any).id}
                          disabled={isFilterActive}
                          showDragHandle={!isFilterActive}
                        >
                          {row.getVisibleCells().map(cell => (
                            <td className='table-cell' key={cell.id}>
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </td>
                          ))}
                        </SortableRow>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </SortableContext>
          </DndContext>
          ) : (
            <div className='table-wrapper' style={{ overflowX: 'auto' }}>
              <table className='data-table' style={{ ...(isLoading || dataServices.length === 0 ? { height: '100%' } : {}), tableLayout: 'auto', minWidth: '100%', whiteSpace: 'nowrap' }}>
                <thead className='table-header' style={{ position: 'sticky', top: 0, zIndex: 10, background: '#f8fafc' }}>
                  {table.getHeaderGroups().map(headerGroup => (
                    <tr key={headerGroup.id}>
                      <th className='table-header th' style={{ width: 40, textAlign: 'center', padding: '0 4px' }} />
                      {headerGroup.headers.map(header => (
                        <th style={{ width: header.getSize() }} className='table-header th' key={header.id}>
                          {flexRender(header.column.columnDef.header, header.getContext())}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody>
                  <tr>
                    <td colSpan={columns.length + 1} className='py-10 text-center'>
                      <div className='loader-wrapper'>
                        <div className='loader'><span></span><span></span><span></span></div>
                        <p className='loading-text'>Đang tải...</p>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

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

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleCloseDeleteDialog}
        aria-labelledby='delete-dialog-title'
        aria-describedby='delete-dialog-description'
      >
        <DialogTitle id='delete-dialog-title'>Xác nhận xóa dịch vụ</DialogTitle>
        <DialogContent>
          <DialogContentText id='delete-dialog-description'>
            Bạn có chắc chắn muốn xóa dịch vụ này không? Hành động này không thể hoàn tác.
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
          >
            {deleteMutation.isPending ? 'Đang xóa...' : 'Xóa'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Service Form Modal — lazy load + lazy mount */}
      {modalOpen && (
        <Suspense fallback={
          <Dialog open maxWidth='md' fullWidth>
            <div style={{ padding: 60, textAlign: 'center', color: '#94a3b8' }}>Đang tải form...</div>
          </Dialog>
        }>
          {isChild ? (
            <ChildServiceFormModal
              open={modalOpen}
              onClose={() => setModalOpen(false)}
              serviceId={editingId}
              initialData={editingData}
            />
          ) : (
            <ServiceFormModal
              open={modalOpen}
              onClose={() => setModalOpen(false)}
              serviceId={editingId}
              initialData={editingData}
            />
          )}
        </Suspense>
      )}

      {customPriceService && (
        <CustomPriceModal
          open={!!customPriceService}
          onClose={() => setCustomPriceService(null)}
          serviceType={customPriceService}
        />
      )}

      {versionDrawerService && (
        <ConfigVersionDrawer
          open={versionDrawerOpen}
          onClose={() => {
            setVersionDrawerOpen(false)
            setVersionDrawerService(null)
          }}
          modelType='type_services'
          modelId={versionDrawerService.id}
          modelName={versionDrawerService.name}
        />
      )}
    </>
  )
}
