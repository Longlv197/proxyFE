import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import { Loader2 } from 'lucide-react'

interface RetryDialogProps {
  retryOrder: {
    order_code: string
    missing_count: number
    quantity?: number
    delivered_quantity: number
  } | null
  setRetryOrder: (order: any) => void
  retryMutation: {
    isPending: boolean
  }
  handleRetry: () => void
}
export default function RetryDialog({ retryOrder, setRetryOrder, retryMutation, handleRetry }: RetryDialogProps) {
  return (
    <Dialog open={!!retryOrder} onClose={() => setRetryOrder(null)}>
      <DialogTitle>Mua bù proxy</DialogTitle>
      <DialogContent>
        <DialogContentText>
          Đẩy đơn <strong>#{retryOrder?.order_code}</strong> vào queue để mua bù{' '}
          <strong>{retryOrder?.missing_count ?? retryOrder?.quantity - (retryOrder?.delivered_quantity ?? 0)}</strong>{' '}
          proxy thiếu?
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setRetryOrder(null)} color='inherit'>
          Hủy
        </Button>
        <Button
          onClick={handleRetry}
          color='success'
          variant='contained'
          disabled={retryMutation.isPending}
          sx={{ color: '#fff' }}
        >
          {retryMutation.isPending ? (
            <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
          ) : (
            'Xác nhận mua bù'
          )}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
