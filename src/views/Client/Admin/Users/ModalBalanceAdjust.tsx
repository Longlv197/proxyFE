'use client'

import { useState, useEffect } from 'react'

import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import Typography from '@mui/material/Typography'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import TextField from '@mui/material/TextField'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'

import { toast } from 'react-toastify'

import DialogCloseButton from '@/components/modals/DialogCloseButton'

import { useAdjustBalance } from '@/hooks/apis/useAdminUsers'

interface ModalBalanceAdjustProps {
  open: boolean
  onClose: () => void
  userData?: any
}

const formatVND = (value: number) => {
  return new Intl.NumberFormat('vi-VN').format(value) + 'đ'
}

export default function ModalBalanceAdjust({ open, onClose, userData }: ModalBalanceAdjustProps) {
  const [type, setType] = useState<'add' | 'subtract'>('add')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')

  const adjustMutation = useAdjustBalance()

  useEffect(() => {
    if (open) {
      setType('add')
      setAmount('')
      setDescription('')
    }
  }, [open])

  const handleSubmit = () => {
    if (!userData?.id) return

    const numAmount = Number(amount)

    if (!numAmount || numAmount <= 0) {
      toast.error('Vui lòng nhập số tiền hợp lệ')
      
return
    }

    if (description.trim().length < 5) {
      toast.error('Lý do tối thiểu 5 ký tự')

      return
    }

    const finalAmount = type === 'subtract' ? -numAmount : numAmount

    adjustMutation.mutate(
      { userId: userData.id, amount: finalAmount, description: description.trim() },
      {
        onSuccess: (data) => {
          const newBalance = data?.new_balance

          toast.success(
            `${type === 'add' ? 'Cộng' : 'Trừ'} ${new Intl.NumberFormat('vi-VN').format(numAmount)}đ thành công. Số dư mới: ${new Intl.NumberFormat('vi-VN').format(newBalance ?? 0)}đ`
          )
          onClose()
        },
        onError: (error: any) => {
          toast.error(error?.response?.data?.message || 'Có lỗi xảy ra')
        }
      }
    )
  }

  return (
    <Dialog
      onClose={onClose}
      open={open}
      closeAfterTransition={false}
      PaperProps={{ sx: { overflow: 'visible' } }}
      fullWidth
      maxWidth='sm'
    >
      <DialogTitle>
        <Typography variant='h5' component='span'>
          Điều chỉnh số dư
        </Typography>
        <DialogCloseButton onClick={onClose} disableRipple>
          <i className='tabler-x' />
        </DialogCloseButton>
      </DialogTitle>
      <DialogContent>
        <div style={{ marginBottom: 16, padding: 12, backgroundColor: '#f5f5f5', borderRadius: 8 }}>
          <Typography variant='body2' color='text.secondary'>
            User: <strong>{userData?.name}</strong> ({userData?.email})
          </Typography>
          <Typography variant='body2' color='text.secondary'>
            Số dư hiện tại: <strong style={{ color: '#059669' }}>{formatVND(userData?.sodu ?? 0)}</strong>
          </Typography>
          {amount && Number(amount) > 0 && (
            <Typography variant='body2' color='text.secondary' sx={{ mt: 0.5 }}>
              Số dư sau: <strong style={{ color: type === 'add' ? '#0284c7' : '#dc2626' }}>
                {formatVND(((userData?.sodu ?? 0) as number) + (type === 'subtract' ? -Number(amount) : Number(amount)))}
              </strong>
            </Typography>
          )}
        </div>

        <div style={{ marginBottom: 16 }}>
          <Typography variant='body2' sx={{ mb: 1 }}>
            Loại thao tác
          </Typography>
          <ToggleButtonGroup
            value={type}
            exclusive
            onChange={(_, val) => val && setType(val)}
            size='small'
            fullWidth
          >
            <ToggleButton value='add' color='success'>
              Cộng tiền
            </ToggleButton>
            <ToggleButton value='subtract' color='error'>
              Trừ tiền
            </ToggleButton>
          </ToggleButtonGroup>
        </div>

        <TextField
          fullWidth
          label='Số tiền'
          type='text'
          value={amount}
          onChange={e => {
            const value = e.target.value.replace(/[^0-9]/g, '')

            setAmount(value)
          }}
          InputProps={{
            endAdornment: <span style={{ marginLeft: 8 }}>đ</span>
          }}
          helperText={amount ? `Số tiền: ${new Intl.NumberFormat('vi-VN').format(Number(amount))} đ` : ''}
          sx={{ mb: 2 }}
        />

        {Number(amount) >= 1_000_000 && (
          <div style={{ padding: 10, marginBottom: 12, borderRadius: 8, background: '#fef3c7', border: '1px solid #fde68a' }}>
            <Typography variant='caption' sx={{ color: '#92400e', fontWeight: 600 }}>
              ⚠ Số tiền lớn ({formatVND(Number(amount))}). Vui lòng kiểm tra kỹ trước khi xác nhận.
            </Typography>
          </div>
        )}

        <TextField
          fullWidth
          label='Lý do (≥5 ký tự, bắt buộc)'
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder='VD: Hoàn tiền đơn lỗi #ORD-123, Khuyến mãi sinh nhật, Bồi thường downtime...'
          required
          multiline
          rows={2}
          error={description.length > 0 && description.length < 5}
          helperText={
            description.length === 0
              ? 'Lý do sẽ hiển thị trong lịch sử giao dịch user + audit log admin'
              : description.length < 5
                ? `Còn ${5 - description.length} ký tự`
                : `${description.length}/500`
          }
        />
        {type === 'add' && (
          <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mt: 1, fontStyle: 'italic' }}>
            ℹ Hệ thống sẽ tự tạo bản ghi giao dịch ngân hàng (manual) để audit cross-reference.
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant='tonal' color='secondary' disabled={adjustMutation.isPending}>
          Hủy
        </Button>
        <Button
          onClick={handleSubmit}
          variant='contained'
          color={type === 'add' ? 'success' : 'error'}
          disabled={adjustMutation.isPending || !amount || description.trim().length < 5}
          sx={{ color: '#fff' }}
        >
          {adjustMutation.isPending
            ? 'Đang xử lý...'
            : type === 'add'
              ? 'Cộng tiền'
              : 'Trừ tiền'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
