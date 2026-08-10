'use client'

import { useState, useRef } from 'react'

import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'
import MenuItem from '@mui/material/MenuItem'
import ListItemText from '@mui/material/ListItemText'
import IconButton from '@mui/material/IconButton'
import Chip from '@mui/material/Chip'
import { X, Loader2, Upload, Trash2 } from 'lucide-react'
import { toast } from 'react-toastify'

import CustomTextField from '@/@core/components/mui/TextField'
import { TICKET_TYPES, CREATE_TICKET_TYPES } from '@/constants/ticketStatus'
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from '@/constants/orderStatus'
import { useCreateTicket, useMyDeposits } from '@/hooks/apis/useTickets'
import { useHistoryOrders } from '@/hooks/apis/useHistoryOrders'
import { formatDateTimeLocal } from '@/utils/formatDate'

interface Props {
  open: boolean
  onClose: () => void
}

export default function CreateTicketDialog({ open, onClose }: Props) {
  const [type, setType] = useState<string>(TICKET_TYPES.OTHER)
  const [orderId, setOrderId] = useState<string>('')
  const [depositId, setDepositId] = useState<string>('')
  const [message, setMessage] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const createTicket = useCreateTicket()
  // Ô chọn "Đơn hàng liên quan" — chỉ cần các đơn GẦN ĐÂY, khách khiếu nại thì thường về đơn mới.
  // Trước đây gọi không tham số = tải TOÀN BỘ đơn (tài khoản nhiều đơn phải nuốt ~9 MB chỉ để
  // đổ một dropdown). Nay lấy 200 đơn mới nhất.
  const { data: ordersData } = useHistoryOrders({ page: 1, limit: 200 })
  const orders = ordersData?.rows ?? []
  const { data: deposits = [] } = useMyDeposits()

  const isDeposit = type === TICKET_TYPES.DEPOSIT
  const isProxy = type === TICKET_TYPES.PROXY || type === TICKET_TYPES.PARTIAL_PROXY || type === TICKET_TYPES.PROXY_ISSUE || type === TICKET_TYPES.REFUND_REQUEST

  const handleTypeChange = (newType: string) => {
    setType(newType)
    setOrderId('')
    setDepositId('')
  }

  const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp']

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]

    if (file) {
      if (!allowedTypes.includes(file.type)) {
        toast.error('Chỉ chấp nhận ảnh PNG, JPG, GIF, WebP')
        e.target.value = ''

        return
      }

      if (file.size > 2 * 1024 * 1024) {
        toast.error('Ảnh tối đa 2MB')
        e.target.value = ''

        return
      }

      setImageFile(file)
      setImagePreview(URL.createObjectURL(file))
    }

    e.target.value = ''
  }

  const handleRemoveImage = () => {
    setImageFile(null)
    setImagePreview('')
  }

  const handleSubmit = () => {
    if (!message.trim()) {
      toast.error('Vui lòng nhập nội dung mô tả')

      return
    }

    if (isDeposit && !depositId) {
      toast.error('Vui lòng chọn lệnh nạp tiền liên quan')

      return
    }

    const formData = new FormData()

    formData.append('type', type)
    formData.append('message', message.trim())

    if (orderId) formData.append('order_id', orderId)
    if (depositId) formData.append('deposit_id', depositId)
    if (imageFile) formData.append('image', imageFile)

    createTicket.mutate(formData, {
      onSuccess: () => {
        toast.success('Tạo ticket thành công!')
        resetForm()
        onClose()
      },
      onError: (error: any) => {
        toast.error(error?.response?.data?.message || 'Có lỗi xảy ra')
      }
    })
  }

  const resetForm = () => {
    setType(TICKET_TYPES.OTHER)
    setOrderId('')
    setDepositId('')
    setMessage('')
    setImageFile(null)
    setImagePreview('')
  }

  const handleClose = () => {
    if (!createTicket.isPending) onClose()
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth='sm' fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
        Tạo yêu cầu hỗ trợ
        <IconButton size='small' onClick={handleClose}><X size={18} /></IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
        {/* Loại yêu cầu */}
        <CustomTextField
          select fullWidth size='small'
          label='Loại yêu cầu'
          value={type}
          onChange={e => handleTypeChange(e.target.value)}
        >
          {CREATE_TICKET_TYPES.map(t => (
            <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>
          ))}
        </CustomTextField>

        {/* Chọn lệnh nạp tiền — khi type = deposit */}
        {isDeposit && (
          <>
            <CustomTextField
              select fullWidth size='small'
              label='Chọn lệnh nạp tiền *'
              value={depositId}
              onChange={e => setDepositId(e.target.value)}
              slotProps={{ select: { displayEmpty: true } }}
            >
              <MenuItem value=''><em>— Chọn lệnh nạp —</em></MenuItem>
              {(deposits as any[]).map((d: any) => (
                <MenuItem key={d.id} value={String(d.id)}>
                  <ListItemText
                    primary={`${Number(d.amount).toLocaleString('vi-VN')}đ — ${d.transaction_code || `#${d.id}`}`}
                    secondary={formatDateTimeLocal(d.created_at)}
                    primaryTypographyProps={{ fontSize: '13px', fontWeight: 600 }}
                    secondaryTypographyProps={{ fontSize: '12px' }}
                  />
                  <Chip
                    label={d.status === 'completed' ? 'Thành công' : d.status === 'pending' ? 'Chờ' : d.status}
                    color={d.status === 'completed' ? 'success' : d.status === 'pending' ? 'warning' : 'default'}
                    size='small'
                    sx={{ ml: 1, height: '22px', fontSize: '11px' }}
                  />
                </MenuItem>
              ))}
            </CustomTextField>
            <div style={{ fontSize: '11.5px', color: '#64748b', background: '#eff6ff', padding: '8px 10px', borderRadius: 8, border: '1px solid #bfdbfe' }}>
              Chọn lệnh nạp bị lỗi để admin xác minh nhanh hơn. Mô tả thêm ở nội dung bên dưới.
            </div>
          </>
        )}

        {/* Chọn đơn hàng — khi type = proxy */}
        {isProxy && (
          <CustomTextField
            select fullWidth size='small'
            label='Đơn hàng liên quan (tùy chọn)'
            value={orderId}
            onChange={e => setOrderId(e.target.value)}
            slotProps={{ select: { displayEmpty: true } }}
          >
            <MenuItem value=''><em>— Không chọn —</em></MenuItem>
            {(orders as any[]).map((order: any) => (
              <MenuItem key={order.id} value={String(order.id)}>
                <ListItemText
                  primary={order.order_code}
                  secondary={`SL: ${order.quantity} · ${formatDateTimeLocal(order.buy_at)}`}
                  primaryTypographyProps={{ fontSize: '13px', fontWeight: 600 }}
                  secondaryTypographyProps={{ fontSize: '12px' }}
                />
                <Chip
                  label={ORDER_STATUS_LABELS[order.status] || '?'}
                  color={(ORDER_STATUS_COLORS[order.status] || 'default') as any}
                  size='small'
                  sx={{ ml: 1, height: '22px', fontSize: '11px' }}
                />
              </MenuItem>
            ))}
          </CustomTextField>
        )}

        {/* Nội dung */}
        <CustomTextField
          fullWidth multiline rows={4} size='small'
          label='Mô tả chi tiết *'
          placeholder={isDeposit
            ? 'VD: Tôi đã chuyển khoản 100,000đ lúc 10:30 ngày 21/03 nhưng chưa được cộng tiền...'
            : 'Mô tả chi tiết vấn đề bạn gặp phải...'}
          value={message}
          onChange={e => setMessage(e.target.value)}
          inputProps={{ maxLength: 2000 }}
          helperText={`${message.length}/2000`}
        />

        {/* Upload ảnh */}
        <div>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: 6 }}>Ảnh đính kèm (tùy chọn)</div>
          {imagePreview ? (
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <img src={imagePreview} alt='' style={{ maxHeight: 120, maxWidth: '100%', borderRadius: 8, border: '1px solid #e2e8f0' }} />
              <IconButton
                size='small'
                onClick={handleRemoveImage}
                sx={{ position: 'absolute', top: -8, right: -8, bgcolor: '#fff', border: '1px solid #e2e8f0', '&:hover': { bgcolor: '#fef2f2', color: '#ef4444' } }}
              >
                <Trash2 size={14} />
              </IconButton>
            </div>
          ) : (
            <Button
              variant='outlined' size='small'
              startIcon={<Upload size={14} />}
              onClick={() => fileInputRef.current?.click()}
              sx={{ textTransform: 'none', fontSize: '12px' }}
            >
              Chọn ảnh (tối đa 2MB)
            </Button>
          )}
          <input ref={fileInputRef} type='file' hidden accept='image/png,image/jpeg,image/jpg,image/gif,image/webp' onChange={handleImageSelect} />
        </div>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={handleClose} color='inherit' disabled={createTicket.isPending}>Hủy</Button>
        <Button
          onClick={handleSubmit}
          variant='contained'
          disabled={createTicket.isPending || !message.trim() || (isDeposit && !depositId)}
          startIcon={createTicket.isPending ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : null}
          sx={{ color: '#fff' }}
        >
          {createTicket.isPending ? 'Đang gửi...' : 'Gửi yêu cầu'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
