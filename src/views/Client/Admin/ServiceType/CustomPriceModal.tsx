'use client'

import { useState, useEffect, useMemo } from 'react'

import {
  Dialog,
  DialogTitle,
  DialogContent,
  Button,
  IconButton,
  Tooltip,
  Box,
  Typography,
  MenuItem,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  CircularProgress,
  Chip,
  Collapse,
  Alert,
  Autocomplete,
  TextField
} from '@mui/material'

import { X, Plus, Pencil, Trash2, DollarSign, Eye, Save, ChevronDown, ChevronUp } from 'lucide-react'
import { toast } from 'react-toastify'

import CustomTextField from '@/@core/components/mui/TextField'
import { useCustomPrices, useCreateCustomPrice, useUpdateCustomPrice, useDeleteCustomPrice, usePreviewCustomPrice } from '@/hooks/apis/useCustomPrices'
import { useAdminUsers } from '@/hooks/apis/useAdminUsers'

interface CustomPriceModalProps {
  open: boolean
  onClose: () => void
  serviceType: any
}

interface EditingPrice {
  id?: number
  user_id: number | ''
  price_type: 'fixed' | 'cost_plus'
  markup_percent: string
  fixed_prices: Record<string, string>
  fixed_per_unit: string
  is_enabled: boolean
}

const emptyEditing: EditingPrice = {
  user_id: '',
  price_type: 'fixed',
  markup_percent: '',
  fixed_prices: {},
  fixed_per_unit: '',
  is_enabled: true,
}

export default function CustomPriceModal({ open, onClose, serviceType }: CustomPriceModalProps) {
  const serviceTypeId = serviceType?.id
  const pricingMode = serviceType?.pricing_mode ?? 'fixed'

  const { data: cpData, isLoading } = useCustomPrices(open ? serviceTypeId : undefined)
  const { data: usersData } = useAdminUsers({ per_page: 999 })
  const createMutation = useCreateCustomPrice()
  const updateMutation = useUpdateCustomPrice()
  const deleteMutation = useDeleteCustomPrice()
  const previewMutation = usePreviewCustomPrice()

  const [editing, setEditing] = useState<EditingPrice | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [previewPrices, setPreviewPrices] = useState<Record<string, number>>({})
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)

  const customPrices = cpData?.data ?? []
  const defaultPrices = cpData?.default_prices ?? {}

  // Lấy durations từ price_by_duration hoặc default_prices
  const durations = useMemo(() => {
    if (serviceType?.price_by_duration && Array.isArray(serviceType.price_by_duration)) {
      return serviceType.price_by_duration.map((item: any) => String(item.key))
    }

    return Object.keys(defaultPrices)
  }, [serviceType, defaultPrices])

  // User list trừ những user đã có custom price
  const availableUsers = useMemo(() => {
    const existingUserIds = customPrices.map((cp: any) => cp.user?.id).filter(Boolean)
    const allUsers = usersData?.data ?? []

    return allUsers.filter((u: any) => !existingUserIds.includes(u.id))
  }, [usersData, customPrices])

  const formatPrice = (price: number | string) => {
    const num = typeof price === 'string' ? parseInt(price) : price

    return isNaN(num) ? '—' : num.toLocaleString('vi-VN')
  }

  // Preview giá khi admin đang nhập
  const handlePreview = () => {
    if (!editing) return

    const data: any = {
      service_type_id: serviceTypeId,
      price_type: editing.price_type,
    }

    if (editing.price_type === 'cost_plus') {
      data.markup_percent = parseFloat(editing.markup_percent) || 0
    } else if (pricingMode === 'per_unit') {
      data.fixed_per_unit = parseInt(editing.fixed_per_unit) || 0
    } else {
      data.fixed_prices = Object.fromEntries(
        Object.entries(editing.fixed_prices).map(([k, v]) => [k, parseInt(v as string) || 0])
      )
    }

    previewMutation.mutate(data, {
      onSuccess: (res) => setPreviewPrices(res?.preview_prices ?? {})
    })
  }

  // Auto preview khi thay đổi markup
  useEffect(() => {
    if (!editing || editing.price_type !== 'cost_plus') return

    const timeout = setTimeout(handlePreview, 500)

    return () => clearTimeout(timeout)
  }, [editing?.markup_percent])

  const handleStartAdd = () => {
    const initialFixed: Record<string, string> = {}

    durations.forEach((d: string) => { initialFixed[d] = '' })
    setEditing({ ...emptyEditing, fixed_prices: initialFixed })
    setIsAdding(true)
    setPreviewPrices({})
  }

  const handleStartEdit = (cp: any) => {
    const fixedPrices: Record<string, string> = {}

    durations.forEach((d: string) => {
      fixedPrices[d] = cp.fixed_prices?.[d]?.toString() ?? ''
    })

    setEditing({
      id: cp.id,
      user_id: cp.user?.id ?? '',
      price_type: cp.price_type,
      markup_percent: cp.markup_percent?.toString() ?? '',
      fixed_prices: fixedPrices,
      fixed_per_unit: cp.fixed_per_unit?.toString() ?? '',
      is_enabled: cp.is_enabled,
    })
    setIsAdding(false)
    setPreviewPrices(cp.preview_prices ?? {})
  }

  const handleCancel = () => {
    setEditing(null)
    setIsAdding(false)
    setPreviewPrices({})
  }

  const handleSave = () => {
    if (!editing) return
    if (!editing.user_id && isAdding) {
      toast.error('Vui lòng chọn user')

      return
    }

    const data: any = {
      service_type_id: serviceTypeId,
      user_id: editing.user_id,
      price_type: editing.price_type,
      is_enabled: editing.is_enabled,
    }

    if (editing.price_type === 'cost_plus') {
      data.markup_percent = parseFloat(editing.markup_percent) || 0
    } else if (pricingMode === 'per_unit') {
      data.fixed_per_unit = parseInt(editing.fixed_per_unit) || 0
    } else {
      data.fixed_prices = Object.fromEntries(
        Object.entries(editing.fixed_prices).map(([k, v]) => [k, parseInt(v as string) || 0])
      )
    }

    const mutation = isAdding ? createMutation : updateMutation
    const submitData = isAdding ? data : { id: editing.id, ...data }

    mutation.mutate(submitData, {
      onSuccess: () => {
        toast.success(isAdding ? 'Đã thêm giá riêng' : 'Đã cập nhật giá riêng')
        handleCancel()
      },
      onError: (err: any) => {
        toast.error(err?.response?.data?.message || 'Có lỗi xảy ra')
      }
    })
  }

  const handleDelete = (id: number) => {
    deleteMutation.mutate(id, {
      onSuccess: () => {
        toast.success('Đã xóa giá riêng')
        setDeleteConfirm(null)
      }
    })
  }

  const isSaving = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={open} onClose={onClose} maxWidth='md' fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1.5, px: 2, borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'color-mix(in srgb, var(--primary-hover, #6366f1) 12%, white)' }}>
            <DollarSign size={16} style={{ color: 'var(--primary-hover, #6366f1)' }} />
          </div>
          <span style={{ fontSize: '14px', fontWeight: 600, color: '#1f2937' }}>
            Giá riêng: {serviceType?.name}
          </span>
          {pricingMode === 'per_unit' && (
            <Chip label='Per unit' size='small' color='info' variant='outlined' />
          )}
        </div>
        <IconButton onClick={onClose} size='small' sx={{ color: '#9ca3af' }}>
          <X size={18} />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 2, pt: '16px !important' }}>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={28} />
          </Box>
        ) : (
          <>
            {/* Bảng giá mặc định */}
            <Box sx={{ mb: 2, p: 1.5, borderRadius: 1, bgcolor: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <Typography variant='caption' fontWeight={600} color='text.secondary' sx={{ mb: 0.5, display: 'block' }}>
                Giá chung (mặc định)
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                {durations.map((d: string) => (
                  <Typography key={d} variant='body2' color='text.secondary'>
                    {d} ngày: <strong>{formatPrice(defaultPrices[d] ?? 0)}đ</strong>
                  </Typography>
                ))}
              </Box>
            </Box>

            {/* Bảng danh sách user có giá riêng */}
            {customPrices.length > 0 && (
              <Table size='small' sx={{ mb: 2, '& td, & th': { py: 0.75, px: 1, fontSize: '13px' } }}>
                <TableHead>
                  <TableRow>
                    <TableCell>User</TableCell>
                    <TableCell>Loại</TableCell>
                    {durations.map((d: string) => (
                      <TableCell key={d} align='right'>{d}d</TableCell>
                    ))}
                    <TableCell align='center' width={80}></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {customPrices.map((cp: any) => (
                    <TableRow key={cp.id} sx={{ opacity: cp.is_enabled ? 1 : 0.5 }}>
                      <TableCell>
                        <Typography variant='body2' fontWeight={500}>
                          {cp.user?.name ?? '—'}
                        </Typography>
                        <Typography variant='caption' color='text.secondary'>
                          {cp.user?.email}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={cp.price_type === 'cost_plus' ? `vốn${cp.markup_percent >= 0 ? '+' : ''}${cp.markup_percent}%` : 'cố định'}
                          size='small'
                          color={cp.price_type === 'cost_plus' ? 'warning' : 'primary'}
                          variant='outlined'
                          sx={{ fontSize: '11px', height: 22 }}
                        />
                        {!cp.is_enabled && (
                          <Chip label='tắt' size='small' color='error' sx={{ ml: 0.5, fontSize: '10px', height: 18 }} />
                        )}
                      </TableCell>
                      {durations.map((d: string) => (
                        <TableCell key={d} align='right'>
                          {formatPrice(cp.preview_prices?.[d] ?? 0)}
                        </TableCell>
                      ))}
                      <TableCell align='center'>
                        <Tooltip title='Sửa'>
                          <IconButton size='small' onClick={() => handleStartEdit(cp)}>
                            <Pencil size={14} />
                          </IconButton>
                        </Tooltip>
                        {deleteConfirm === cp.id ? (
                          <Tooltip title='Xác nhận xóa'>
                            <IconButton size='small' color='error' onClick={() => handleDelete(cp.id)} disabled={deleteMutation.isPending}>
                              <Trash2 size={14} />
                            </IconButton>
                          </Tooltip>
                        ) : (
                          <Tooltip title='Xóa'>
                            <IconButton size='small' onClick={() => setDeleteConfirm(cp.id)}>
                              <Trash2 size={14} />
                            </IconButton>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {customPrices.length === 0 && !isAdding && (
              <Typography variant='body2' color='text.secondary' sx={{ textAlign: 'center', py: 2 }}>
                Chưa có giá riêng. Nhấn "Thêm user" để tạo.
              </Typography>
            )}

            {/* Form thêm/sửa */}
            <Collapse in={!!editing}>
              {editing && (
                <Box sx={{ p: 2, borderRadius: 1, border: '1px solid #e2e8f0', bgcolor: '#fefce8' }}>
                  <Typography variant='subtitle2' sx={{ mb: 1.5 }}>
                    {isAdding ? 'Thêm giá riêng' : 'Sửa giá riêng'}
                  </Typography>

                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 1.5 }}>
                    {/* User search — chỉ khi thêm mới */}
                    {isAdding && (
                      <Autocomplete
                        size='small'
                        options={availableUsers}
                        getOptionLabel={(u: any) => `${u.name} (${u.email})`}
                        filterOptions={(options, { inputValue }) => {
                          const q = inputValue.toLowerCase()
                          return options.filter((u: any) =>
                            u.email?.toLowerCase().includes(q) || u.name?.toLowerCase().includes(q)
                          ).slice(0, 20)
                        }}
                        onChange={(_e, user) => setEditing({ ...editing, user_id: user?.id || '' })}
                        renderInput={(params) => <TextField {...params} label='Tìm user (email hoặc tên)' />}
                        sx={{ minWidth: 280 }}
                        noOptionsText='Không tìm thấy user'
                      />
                    )}

                    {/* Loại giá */}
                    <CustomTextField
                      select
                      size='small'
                      label='Loại giá'
                      value={editing.price_type}
                      onChange={(e) => {
                        setEditing({ ...editing, price_type: e.target.value as 'fixed' | 'cost_plus' })
                        setPreviewPrices({})
                      }}
                      sx={{ minWidth: 150 }}
                    >
                      <MenuItem value='fixed'>Giá cố định</MenuItem>
                      <MenuItem value='cost_plus'>Giá vốn + % lợi nhuận</MenuItem>
                    </CustomTextField>

                    {/* Cost plus: markup % */}
                    {editing.price_type === 'cost_plus' && (
                      <CustomTextField
                        size='small'
                        label='% lợi nhuận'
                        type='number'
                        value={editing.markup_percent}
                        onChange={(e) => setEditing({ ...editing, markup_percent: e.target.value })}
                        helperText='VD: 20 = giá vốn + 20%'
                        sx={{ width: 130 }}
                      />
                    )}

                    {/* Fixed + per_unit: giá/đơn vị */}
                    {editing.price_type === 'fixed' && pricingMode === 'per_unit' && (
                      <CustomTextField
                        size='small'
                        label={`Giá/${serviceType?.time_unit === 'month' ? 'tháng' : 'ngày'}`}
                        type='number'
                        value={editing.fixed_per_unit}
                        onChange={(e) => setEditing({ ...editing, fixed_per_unit: e.target.value })}
                        sx={{ width: 140 }}
                      />
                    )}
                  </Box>

                  {/* Fixed mode: nhập giá từng mốc */}
                  {editing.price_type === 'fixed' && pricingMode !== 'per_unit' && (
                    <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mb: 1.5 }}>
                      {durations.map((d: string) => (
                        <CustomTextField
                          key={d}
                          size='small'
                          label={`${d} ${serviceType?.time_unit === 'month' ? 'tháng' : 'ngày'}`}
                          type='number'
                          value={editing.fixed_prices[d] ?? ''}
                          onChange={(e) => setEditing({
                            ...editing,
                            fixed_prices: { ...editing.fixed_prices, [d]: e.target.value }
                          })}
                          sx={{ width: 120 }}
                        />
                      ))}
                    </Box>
                  )}

                  {/* Preview giá */}
                  {Object.keys(previewPrices).length > 0 && (
                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 1.5, p: 1, borderRadius: 1, bgcolor: '#ecfdf5', border: '1px solid #a7f3d0' }}>
                      <Eye size={14} style={{ color: '#059669', marginTop: 2 }} />
                      {durations.map((d: string) => (
                        <Typography key={d} variant='body2' color='success.dark'>
                          {d}d: <strong>{formatPrice(previewPrices[d] ?? 0)}đ</strong>
                        </Typography>
                      ))}
                    </Box>
                  )}

                  {/* Actions */}
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    {editing.price_type === 'fixed' && (
                      <Button
                        size='small'
                        variant='outlined'
                        onClick={handlePreview}
                        disabled={previewMutation.isPending}
                        startIcon={<Eye size={14} />}
                      >
                        Preview
                      </Button>
                    )}
                    <Button
                      size='small'
                      variant='contained'
                      onClick={handleSave}
                      disabled={isSaving}
                      startIcon={isSaving ? <CircularProgress size={14} /> : <Save size={14} />}
                      className='text-white'
                    >
                      {isAdding ? 'Thêm' : 'Cập nhật'}
                    </Button>
                    <Button size='small' variant='outlined' color='inherit' onClick={handleCancel}>
                      Hủy
                    </Button>
                  </Box>
                </Box>
              )}
            </Collapse>

            {/* Nút thêm user */}
            {!editing && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1 }}>
                <Button
                  size='small'
                  variant='outlined'
                  startIcon={<Plus size={14} />}
                  onClick={handleStartAdd}
                >
                  Thêm user
                </Button>
              </Box>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
