import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import TextField from '@mui/material/TextField'
import { Loader2 } from 'lucide-react'

const formatVND = (value: any) => new Intl.NumberFormat('vi-VN').format(Number(value) || 0) + 'đ'

interface CancelRefundDialogProps {
  cancelDialogOpen: boolean
  setCancelDialogOpen: (open: boolean) => void
  orderToCancel: {
    order_code: string
    user_name: string
    total_amount: number
  } | null
  cancelRefundType: 'full' | 'partial'
  setCancelRefundType: (type: 'full' | 'partial') => void
  cancelRefundAmount: string
  setCancelRefundAmount: (amount: string) => void
  cancelMutation: {
    isPending: boolean
  }
  handleConfirmCancel: () => void
}

export default function CancelRefundDialog({
  cancelDialogOpen,
  setCancelDialogOpen,
  orderToCancel,
  cancelRefundType,
  setCancelRefundType,
  cancelRefundAmount,
  setCancelRefundAmount,
  cancelMutation,
  handleConfirmCancel
}: CancelRefundDialogProps) {
  ;<Dialog open={cancelDialogOpen} onClose={() => setCancelDialogOpen(false)} maxWidth='xs' fullWidth>
    <DialogTitle>Hủy đơn + Hoàn tiền</DialogTitle>
    <DialogContent>
      <DialogContentText sx={{ mb: 2 }}>
        Đơn <strong>#{orderToCancel?.order_code}</strong> — user <strong>{orderToCancel?.user_name}</strong>
        <br />
        Tổng: <strong>{formatVND(orderToCancel?.total_amount ?? 0)}</strong>
      </DialogContentText>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: '13px' }}>
          <input type='radio' checked={cancelRefundType === 'full'} onChange={() => setCancelRefundType('full')} />
          Hoàn hết ({formatVND(orderToCancel?.total_amount ?? 0)})
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: '13px' }}>
          <input
            type='radio'
            checked={cancelRefundType === 'partial'}
            onChange={() => setCancelRefundType('partial')}
          />
          Hoàn 1 phần
        </label>
        {cancelRefundType === 'partial' && (
          <TextField
            size='small'
            type='number'
            label='Số tiền hoàn'
            value={cancelRefundAmount}
            onChange={e => setCancelRefundAmount(e.target.value)}
            inputProps={{ min: 0, max: orderToCancel?.total_amount ?? 0 }}
            sx={{ ml: 3 }}
          />
        )}
      </div>
    </DialogContent>
    <DialogActions>
      <Button onClick={() => setCancelDialogOpen(false)} color='inherit'>
        Đóng
      </Button>
      <Button
        onClick={handleConfirmCancel}
        color='error'
        variant='contained'
        disabled={cancelMutation.isPending}
        sx={{ color: '#fff' }}
      >
        {cancelMutation.isPending ? (
          <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
        ) : (
          'Xác nhận hoàn tiền'
        )}
      </Button>
    </DialogActions>
  </Dialog>
}
