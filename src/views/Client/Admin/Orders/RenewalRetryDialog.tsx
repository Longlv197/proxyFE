import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import { Loader2 } from 'lucide-react'

interface RenewalRetryDialogProps {
  renewalRetryOrder: {
    order_code: string
  } | null
  setRenewalRetryOrder: (order: any) => void
  renewalLoading: boolean
  handleConfirmRenewalRetry: () => void
}

export default function RenewalRetryDialog({
  renewalRetryOrder,
  setRenewalRetryOrder,
  renewalLoading,
  handleConfirmRenewalRetry
}: RenewalRetryDialogProps) {
  return (
    <Dialog open={!!renewalRetryOrder} onClose={() => setRenewalRetryOrder(null)}>
      <DialogTitle>Retry gia hạn</DialogTitle>
      <DialogContent>
        <DialogContentText>
          Đẩy lại đơn <strong>#{renewalRetryOrder?.order_code}</strong> vào queue gia hạn?
          <br />
          <br />
          Tiền đã trừ từ lần đầu, không trừ thêm.
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setRenewalRetryOrder(null)} color='inherit'>
          Hủy
        </Button>
        <Button
          onClick={handleConfirmRenewalRetry}
          color='warning'
          variant='contained'
          disabled={renewalLoading}
          sx={{ color: '#fff' }}
        >
          {renewalLoading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : 'Xác nhận retry'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
