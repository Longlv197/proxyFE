import React, { useState } from 'react'
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Typography,
  Chip,
  IconButton,
  Tooltip
} from '@mui/material'
import { Plus, Check, Eye, X } from 'lucide-react'
import { useProviderInvoices, useCreateProviderInvoice, usePayProviderInvoice } from '@/hooks/apis/useProviders'
import { format } from 'date-fns'
import { toast } from 'react-toastify'

const TYPES = [
  { value: 'topup', label: 'Nạp tiền (Topup)' },
  { value: 'monthly_fee', label: 'Phí hàng tháng' },
  { value: 'setup_fee', label: 'Phí setup' },
  { value: 'bandwidth', label: 'Phí băng thông' },
  { value: 'other', label: 'Khác' }
]

const PAYMENT_METHODS = [
  { value: 'bank_transfer', label: 'Chuyển khoản' },
  { value: 'crypto', label: 'Crypto' },
  { value: 'balance', label: 'Trừ số dư NSX' },
  { value: 'other', label: 'Khác' }
]

export default function ProviderInvoiceTab({ providerId }: { providerId: string | number }) {
  const { data: invoices, isLoading } = useProviderInvoices(providerId)
  const createMutation = useCreateProviderInvoice()
  const payMutation = usePayProviderInvoice(providerId)

  const [openCreate, setOpenCreate] = useState(false)
  const [openImage, setOpenImage] = useState(false)
  const [currentImage, setCurrentImage] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    type: 'monthly_fee',
    amount: '',
    currency: 'VND',
    payment_method: 'bank_transfer',
    payment_proof: '',
    note: ''
  })

  // Handle image upload & base64 conversion
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, payment_proof: reader.result as string }))
      }
      reader.readAsDataURL(file)
    }
  }

  const handleCreateSubmit = () => {
    if (!formData.amount || isNaN(Number(formData.amount))) {
      toast.error('Vui lòng nhập số tiền hợp lệ.')
      return
    }

    createMutation.mutate(
      {
        provider_id: providerId,
        ...formData,
        amount: Number(formData.amount)
      },
      {
        onSuccess: () => {
          toast.success('Tạo hoá đơn thành công!')
          setOpenCreate(false)
          setFormData({
            type: 'monthly_fee',
            amount: '',
            currency: 'VND',
            payment_method: 'bank_transfer',
            payment_proof: '',
            note: ''
          })
        },
        onError: () => {
          toast.error('Có lỗi xảy ra khi tạo hoá đơn.')
        }
      }
    )
  }



  const viewImage = (base64String: string) => {
    setCurrentImage(base64String)
    setOpenImage(true)
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant='h6'>Danh sách hoá đơn NCC</Typography>
        <Button variant='contained' startIcon={<Plus size={16} />} onClick={() => setOpenCreate(true)}>
          Tạo hoá đơn
        </Button>
      </Box>

      {/* Table */}
      <div className='table-wrapper'>
        <table className='data-table'>
          <thead className='table-header'>
            <tr>
              <th className='table-header th'>Mã HĐ</th>
              <th className='table-header th'>Loại</th>
              <th className='table-header th'>Số Tiền</th>
              <th className='table-header th'>Hoá Đơn (Ảnh)</th>
              <th className='table-header th text-right'>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} className='text-center py-4'>
                  Đang tải...
                </td>
              </tr>
            ) : invoices?.length === 0 ? (
              <tr>
                <td colSpan={7} className='text-center py-4'>
                  Chưa có hoá đơn nào
                </td>
              </tr>
            ) : (
              invoices?.map((inv: any) => (
                <tr className='table-row' key={inv._id}>
                  <td className='table-cell font-bold'>{inv.invoice_code}</td>
                  <td className='table-cell'>
                    <Chip label={TYPES.find(t => t.value === inv.type)?.label || inv.type} size="small" />
                  </td>
                  <td className='table-cell font-bold text-green-600'>
                    {new Intl.NumberFormat().format(inv.amount)} {inv.currency}
                  </td>
                  <td className='table-cell'>
                    {inv.payment_proof && (
                      <Button size="small" onClick={() => viewImage(inv.payment_proof)}>Xem Ảnh</Button>
                    )}
                  </td>
                  <td className='table-cell text-right'>
                    {/* no action needed anymore without status */}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Dialog Tạo Hóa Đơn */}
      <Dialog open={openCreate} onClose={() => setOpenCreate(false)} maxWidth='sm' fullWidth>
        <DialogTitle>Tạo Hoá Đơn Mới</DialogTitle>
        <DialogContent dividers>
          <TextField
            select
            fullWidth
            label='Loại phí'
            value={formData.type}
            onChange={e => setFormData({ ...formData, type: e.target.value })}
            margin='normal'
          >
            {TYPES.map(option => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            fullWidth
            label='Số tiền'
            type='number'
            value={formData.amount}
            onChange={e => setFormData({ ...formData, amount: e.target.value })}
            margin='normal'
          />
          <TextField
            select
            fullWidth
            label='Phương thức'
            value={formData.payment_method}
            onChange={e => setFormData({ ...formData, payment_method: e.target.value })}
            margin='normal'
          >
            {PAYMENT_METHODS.map(option => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            fullWidth
            label='Ghi chú'
            multiline
            rows={2}
            value={formData.note}
            onChange={e => setFormData({ ...formData, note: e.target.value })}
            margin='normal'
          />

          <Box mt={2}>
            <Typography variant='subtitle2' gutterBottom>
              Upload ảnh hoá đơn / UNC (Base64)
            </Typography>
            <input type='file' accept='image/*' onChange={handleImageUpload} />
            {formData.payment_proof && (
              <Box mt={2}>
                <img src={formData.payment_proof} alt='Preview' style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 8 }} />
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCreate(false)}>Hủy</Button>
          <Button variant='contained' onClick={handleCreateSubmit} disabled={createMutation.isPending}>
            Lưu Hoá Đơn
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog View Ảnh */}
      <Dialog open={openImage} onClose={() => setOpenImage(false)} maxWidth='md'>
        <DialogTitle sx={{ m: 0, p: 2 }}>
          Chi tiết Tệp đính kèm
          <IconButton
            aria-label='close'
            onClick={() => setOpenImage(false)}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
              color: theme => theme.palette.grey[500]
            }}
          >
            <X />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {currentImage && (
            <img src={currentImage} alt='Invoice Image' style={{ width: '100%', height: 'auto' }} />
          )}
        </DialogContent>
      </Dialog>
    </Box>
  )
}
