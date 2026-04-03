import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import { Loader2 } from 'lucide-react'

interface ResendDialogProps {
  resendDialogOpen: boolean
  setResendDialogOpen: (open: boolean) => void
  orderToResend: {
    order_code: string
  } | null
  resendMutation: {
    isPending: boolean
  }
  handleConfirmResend: () => void
}

export default function ResendDialog({
  resendDialogOpen,
  setResendDialogOpen,
  orderToResend,
  resendMutation,
  handleConfirmResend
}: ResendDialogProps) {
  return (
    <Dialog open={resendDialogOpen} onClose={() => setResendDialogOpen(false)}>
      <DialogTitle>Gửi lại đơn hàng</DialogTitle>
      <DialogContent>
        <DialogContentText>
          Gửi lại đơn <strong>#{orderToResend?.order_code}</strong> vào queue xử lý?
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setResendDialogOpen(false)} color='inherit'>
          Hủy
        </Button>
        <Button
          onClick={handleConfirmResend}
          color='success'
          variant='contained'
          disabled={resendMutation.isPending}
          sx={{ color: '#fff' }}
        >
          {resendMutation.isPending ? (
            <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
          ) : (
            'Xác nhận gửi lại'
          )}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
