import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import { Loader2 } from 'lucide-react'

interface RetryFailedOrderDialogProps {
  retryFailedOrder: {
    id: number
    order_code: string
    delivered_quantity: number
  } | null
  setRetryFailedOrder: (order: any) => void
  retryFailedMutation: {
    isPending: boolean
    mutate: (id: number, options: { onSuccess: (data: any) => void; onError: (err: any) => void }) => void
  }
}

export default function RetryFailedOrderDialog({
  retryFailedOrder,
  setRetryFailedOrder,
  retryFailedMutation
}: RetryFailedOrderDialogProps) {
  return (
    <Dialog open={!!retryFailedOrder} onClose={() => setRetryFailedOrder(null)}>
      <DialogTitle>Thử lại đơn hàng</DialogTitle>
      <DialogContent>
        <DialogContentText>
          {(retryFailedOrder?.delivered_quantity ?? 0) > 0 ? (
            <>
              Đơn <strong>#{retryFailedOrder?.order_code}</strong> đã xử lý nhưng chưa nhận được kết quả. Thử lại?
            </>
          ) : (
            <>
              Đơn <strong>#{retryFailedOrder?.order_code}</strong> chưa xử lý được. Đẩy lại vào queue?
            </>
          )}
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setRetryFailedOrder(null)} color='inherit'>
          Hủy
        </Button>
        <Button
          onClick={() => {
            if (!retryFailedOrder) return

            retryFailedMutation.mutate(retryFailedOrder.id, {
              onSuccess: (data: any) => {
                setRetryFailedOrder(null)
                toast.success(data?.message || 'Đã đẩy lại đơn hàng')
              },
              onError: (err: any) => {
                setRetryFailedOrder(null)
                toast.error(err?.response?.data?.message || 'Lỗi khi retry')
              }
            })
          }}
          color='warning'
          variant='contained'
          disabled={retryFailedMutation.isPending}
          sx={{ color: '#fff' }}
        >
          {retryFailedMutation.isPending ? (
            <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
          ) : (
            'Xác nhận thử lại'
          )}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
