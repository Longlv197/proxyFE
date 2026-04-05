import DialogCloseButton from '@/components/modals/DialogCloseButton'
import { Box, Dialog, DialogContent, DialogTitle, Paper, Typography } from '@mui/material'
import ProviderInvoiceTab from './ProviderInvoiceTab'

interface ModalInvoiceProps {
  onClose: () => void
  open: boolean
  providerId: string
}
export default function ModalInvoice({ onClose, open, providerId }: ModalInvoiceProps) {
  return (
    <div>
      <Dialog
        onClose={onClose}
        open={open}
        closeAfterTransition={false}
        PaperProps={{ sx: { overflow: 'visible', minHeight: 'calc(100vh - 100px)' } }}
        fullWidth
        maxWidth='xl'
      >
        <DialogTitle>
          <Typography variant='h5' component='span'>
            Thống kê nhà cung cấp
          </Typography>
          <DialogCloseButton onClick={onClose} disableRipple>
            <i className='tabler-x' />
          </DialogCloseButton>
        </DialogTitle>

        <DialogContent>
          <Box sx={{ p: 1 }}>
            <ProviderInvoiceTab providerId={String(providerId)} />
          </Box>
        </DialogContent>
      </Dialog>
    </div>
  )
}
