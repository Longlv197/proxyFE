'use client'

import { useEffect, useState } from 'react'

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  FormControlLabel,
  Switch,
  Typography,
  Divider
} from '@mui/material'
import Grid2 from '@mui/material/Grid2'
import { toast } from 'react-toastify'

import { useCreateVoucher, useUpdateVoucher } from '@/hooks/apis/useVouchers'
import type { VoucherCampaign } from '@/hooks/apis/useVouchers'

interface Props {
  open: boolean
  onClose: () => void
  type: 'create' | 'edit'
  data?: VoucherCampaign | null
}

const CODE_TYPE_OPTIONS = [
  { value: 1, label: 'Mã chung — 1 mã, nhiều lượt' },
  { value: 2, label: 'Mã riêng — mỗi khách 1 mã, dùng 1 lần' }
]

const DISCOUNT_TYPE_OPTIONS = [
  { value: 1, label: 'Theo phần trăm (%)' },
  { value: 2, label: 'Theo số tiền (VND)' }
]

const defaultForm = {
  name: '',
  description: '',
  is_active: true,
  code_type: 1,
  discount_type: 1,
  discount_value: '' as string,
  min_discount_amount: '' as string,
  max_discount_amount: '' as string,
  min_order_amount: '' as string,
  max_order_amount: '' as string,
  per_user_limit: 1,
  starts_at: '',
  ends_at: '',
  total_quantity: 1,
  code_prefix: '',
  code_length: 6,
  shared_code: ''
}

const toLocalInput = (s: string | null) => (s ? new Date(s).toISOString().slice(0, 16) : '')

export default function ModalAddVoucher({ open, onClose, type, data }: Props) {
  const createMutation = useCreateVoucher()
  const updateMutation = useUpdateVoucher()
  const [formData, setFormData] = useState(defaultForm)

  const isEdit = type === 'edit'

  useEffect(() => {
    if (open && isEdit && data) {
      setFormData({
        name: data.name,
        description: data.description || '',
        is_active: data.is_active,
        code_type: data.code_type,
        discount_type: data.discount_type,
        discount_value: String(Number(data.discount_value)),
        min_discount_amount: data.min_discount_amount != null ? String(Number(data.min_discount_amount)) : '',
        max_discount_amount: data.max_discount_amount != null ? String(Number(data.max_discount_amount)) : '',
        min_order_amount: data.min_order_amount != null ? String(Number(data.min_order_amount)) : '',
        max_order_amount: data.max_order_amount != null ? String(Number(data.max_order_amount)) : '',
        per_user_limit: data.per_user_limit,
        starts_at: toLocalInput(data.starts_at),
        ends_at: toLocalInput(data.ends_at),
        total_quantity: data.total_quantity,
        code_prefix: data.code_prefix || '',
        code_length: data.code_length,
        shared_code: ''
      })
    } else if (open && !isEdit) {
      setFormData(defaultForm)
    }
  }, [open, isEdit, data])

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const isPercent = Number(formData.discount_type) === 1
  const isShared = Number(formData.code_type) === 1

  const buildPayload = () => {
    const p: Record<string, any> = {
      name: formData.name.trim(),
      description: formData.description.trim() || null,
      is_active: formData.is_active,
      discount_type: Number(formData.discount_type),
      discount_value: Number(formData.discount_value),
      per_user_limit: Number(formData.per_user_limit) || 1
    }

    // Kẹp giảm — chỉ gửi khi giảm %
    if (isPercent) {
      if (formData.min_discount_amount !== '') p.min_discount_amount = Number(formData.min_discount_amount)
      if (formData.max_discount_amount !== '') p.max_discount_amount = Number(formData.max_discount_amount)
    }
    if (formData.min_order_amount !== '') p.min_order_amount = Number(formData.min_order_amount)
    if (formData.max_order_amount !== '') p.max_order_amount = Number(formData.max_order_amount)
    if (formData.starts_at) p.starts_at = formData.starts_at
    if (formData.ends_at) p.ends_at = formData.ends_at

    // Field cấu trúc — chỉ gửi khi TẠO (edit không đổi được)
    if (!isEdit) {
      p.code_type = Number(formData.code_type)
      p.total_quantity = Number(formData.total_quantity) || 1
      p.code_length = Number(formData.code_length) || 6
      if (formData.code_prefix.trim()) p.code_prefix = formData.code_prefix.trim()
      if (isShared && formData.shared_code.trim()) p.shared_code = formData.shared_code.trim()
    }

    return p
  }

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error('Vui lòng nhập tên chiến dịch.')

      return
    }
    const dv = Number(formData.discount_value)
    if (!dv || dv <= 0) {
      toast.error('Vui lòng nhập giá trị giảm hợp lệ.')

      return
    }
    if (isPercent && (dv < 1 || dv > 100)) {
      toast.error('Giảm theo % phải trong khoảng 1–100.')

      return
    }

    try {
      if (isEdit && data) {
        await updateMutation.mutateAsync({ id: data.id, ...buildPayload() })
        toast.info('Đã cập nhật chiến dịch')
      } else {
        await createMutation.mutateAsync(buildPayload())
        toast.info('Đã tạo chiến dịch')
      }

      onClose()
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Có lỗi xảy ra, vui lòng kiểm tra lại.')
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth='md' closeAfterTransition={false}>
      <DialogTitle>
        <Typography variant='h6'>{isEdit ? 'Sửa quy tắc chiến dịch' : 'Tạo chiến dịch mã giảm giá'}</Typography>
      </DialogTitle>
      <DialogContent>
        <Grid2 container spacing={2.5} sx={{ mt: 0.5 }}>
          <Grid2 size={{ xs: 12, sm: 8 }}>
            <TextField
              fullWidth
              label='Tên chiến dịch'
              value={formData.name}
              onChange={e => handleChange('name', e.target.value)}
              size='small'
            />
          </Grid2>
          <Grid2 size={{ xs: 12, sm: 4 }}>
            <FormControlLabel
              control={<Switch checked={formData.is_active} onChange={e => handleChange('is_active', e.target.checked)} />}
              label='Kích hoạt'
              sx={{ mt: 0.5 }}
            />
          </Grid2>
          <Grid2 size={{ xs: 12 }}>
            <TextField
              fullWidth
              label='Mô tả'
              value={formData.description}
              onChange={e => handleChange('description', e.target.value)}
              size='small'
              multiline
              minRows={2}
            />
          </Grid2>

          <Grid2 size={{ xs: 12 }}>
            <Divider sx={{ '&::before, &::after': { borderColor: '#e2e8f0' } }}>
              <Typography variant='caption' sx={{ color: '#94a3b8' }}>GIÁ TRỊ GIẢM</Typography>
            </Divider>
          </Grid2>

          <Grid2 size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth
              select
              label='Loại giảm'
              value={formData.discount_type}
              onChange={e => handleChange('discount_type', Number(e.target.value))}
              size='small'
            >
              {DISCOUNT_TYPE_OPTIONS.map(o => (
                <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
              ))}
            </TextField>
          </Grid2>
          <Grid2 size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth
              type='number'
              label={isPercent ? 'Phần trăm giảm (%)' : 'Số tiền giảm (VND)'}
              value={formData.discount_value}
              onChange={e => handleChange('discount_value', e.target.value)}
              size='small'
              helperText={isPercent ? '1 – 100' : 'Số tiền cố định mỗi đơn'}
            />
          </Grid2>

          {isPercent && (
            <>
              <Grid2 size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  type='number'
                  label='Giảm tối thiểu (sàn)'
                  value={formData.min_discount_amount}
                  onChange={e => handleChange('min_discount_amount', e.target.value)}
                  size='small'
                  helperText='Để trống = không có sàn'
                />
              </Grid2>
              <Grid2 size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  type='number'
                  label='Giảm tối đa (trần)'
                  value={formData.max_discount_amount}
                  onChange={e => handleChange('max_discount_amount', e.target.value)}
                  size='small'
                  helperText='VD: giảm 10% nhưng tối đa 20.000đ'
                />
              </Grid2>
            </>
          )}

          <Grid2 size={{ xs: 12 }}>
            <Divider sx={{ '&::before, &::after': { borderColor: '#e2e8f0' } }}>
              <Typography variant='caption' sx={{ color: '#94a3b8' }}>ĐIỀU KIỆN ÁP DỤNG</Typography>
            </Divider>
          </Grid2>

          <Grid2 size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth
              type='number'
              label='Đơn tối thiểu (VND)'
              value={formData.min_order_amount}
              onChange={e => handleChange('min_order_amount', e.target.value)}
              size='small'
              helperText='Đơn phải ≥ mức này mới dùng được mã'
            />
          </Grid2>
          <Grid2 size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth
              type='number'
              label='Đơn tối đa (VND)'
              value={formData.max_order_amount}
              onChange={e => handleChange('max_order_amount', e.target.value)}
              size='small'
              helperText='Để trống = không giới hạn trên'
            />
          </Grid2>
          <Grid2 size={{ xs: 12, sm: 4 }}>
            <TextField
              fullWidth
              type='number'
              label='Giới hạn mỗi user'
              value={formData.per_user_limit}
              onChange={e => handleChange('per_user_limit', e.target.value)}
              size='small'
              helperText='Số lần 1 user được dùng'
            />
          </Grid2>
          <Grid2 size={{ xs: 12, sm: 4 }}>
            <TextField
              fullWidth
              type='datetime-local'
              label='Ngày bắt đầu'
              value={formData.starts_at}
              onChange={e => handleChange('starts_at', e.target.value)}
              size='small'
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Grid2>
          <Grid2 size={{ xs: 12, sm: 4 }}>
            <TextField
              fullWidth
              type='datetime-local'
              label='Ngày kết thúc'
              value={formData.ends_at}
              onChange={e => handleChange('ends_at', e.target.value)}
              size='small'
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Grid2>

          <Grid2 size={{ xs: 12 }}>
            <Divider sx={{ '&::before, &::after': { borderColor: '#e2e8f0' } }}>
              <Typography variant='caption' sx={{ color: '#94a3b8' }}>SỐ LƯỢNG &amp; MÃ</Typography>
            </Divider>
          </Grid2>

          <Grid2 size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth
              select
              label='Loại mã'
              value={formData.code_type}
              onChange={e => handleChange('code_type', Number(e.target.value))}
              size='small'
              disabled={isEdit}
              helperText={isEdit ? 'Không đổi được sau khi tạo' : ' '}
            >
              {CODE_TYPE_OPTIONS.map(o => (
                <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
              ))}
            </TextField>
          </Grid2>
          <Grid2 size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth
              type='number'
              label={isShared ? 'Tổng lượt dùng' : 'Số mã sinh ra'}
              value={formData.total_quantity}
              onChange={e => handleChange('total_quantity', e.target.value)}
              size='small'
              disabled={isEdit}
              helperText={isShared ? 'Mã này được dùng tối đa bao nhiêu lượt' : 'Sinh ra bao nhiêu mã riêng'}
            />
          </Grid2>

          {!isEdit && (
            <>
              <Grid2 size={{ xs: 12, sm: 4 }}>
                <TextField
                  fullWidth
                  label='Ký tự đầu của mã'
                  value={formData.code_prefix}
                  onChange={e => handleChange('code_prefix', e.target.value.toUpperCase())}
                  size='small'
                  helperText='VD: SALE → SALE-XXXXX'
                />
              </Grid2>
              <Grid2 size={{ xs: 12, sm: 4 }}>
                <TextField
                  fullWidth
                  type='number'
                  label='Độ dài phần ngẫu nhiên'
                  value={formData.code_length}
                  onChange={e => handleChange('code_length', e.target.value)}
                  size='small'
                  helperText='4 – 12 ký tự'
                />
              </Grid2>
              {isShared && (
                <Grid2 size={{ xs: 12, sm: 4 }}>
                  <TextField
                    fullWidth
                    label='Mã cố định (tuỳ chọn)'
                    value={formData.shared_code}
                    onChange={e => handleChange('shared_code', e.target.value.toUpperCase())}
                    size='small'
                    helperText='Để trống → tự sinh'
                  />
                </Grid2>
              )}
            </>
          )}
        </Grid2>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant='outlined' disabled={isPending} sx={{ color: '#64748b', borderColor: '#cbd5e1' }}>
          Hủy
        </Button>
        <Button onClick={handleSubmit} variant='contained' disabled={isPending} sx={{ color: '#fff' }}>
          {isPending ? 'Đang xử lý...' : isEdit ? 'Cập nhật' : 'Tạo chiến dịch'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
