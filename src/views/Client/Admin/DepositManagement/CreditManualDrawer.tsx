'use client'

import { useState, useEffect } from 'react'

import {
  Drawer,
  Box,
  Typography,
  Button,
  TextField,
  Radio,
  RadioGroup,
  FormControlLabel,
  CircularProgress,
  Chip,
  Alert,
  IconButton,
} from '@mui/material'
import { X, CheckCircle, AlertCircle, Wallet } from 'lucide-react'
import { toast } from 'react-toastify'

import { useMatchDeposits, useManualCredit, type MatchDeposit } from '@/hooks/apis/useTransactionBank'
import { useMatchTransactions, useAdminCreditDeposit, type MatchTransaction } from '@/hooks/apis/useDepositManagement'

const formatVND = (v: number) => new Intl.NumberFormat('vi-VN').format(v) + 'đ'

const formatDate = (s: string | null) => {
  if (!s) return '-'

  return new Date(s).toLocaleString('vi-VN', { hour12: false })
}

interface CommonProps {
  open: boolean
  onClose: () => void
}

// Mode A: từ Tab "Giao dịch ngân hàng" — input là 1 transaction
interface TransactionMode extends CommonProps {
  mode: 'transaction'
  transactionId: number
  transactionAmount: number
  transactionContent?: string | null
}

// Mode B: từ Tab "Lệnh nạp tiền" — input là 1 bankAuto
interface DepositMode extends CommonProps {
  mode: 'deposit'
  bankAutoId: number
  bankAutoAmount: number
  bankAutoUserId?: number
  bankAutoUserName?: string | null
}

type Props = TransactionMode | DepositMode

export default function CreditManualDrawer(props: Props) {
  const { open, onClose, mode } = props
  const [selectedId, setSelectedId] = useState<string>('')
  const [manualUserId, setManualUserId] = useState<string>('')
  const [reason, setReason] = useState<string>('')

  // Mode A — match deposits
  const matchDeposits = useMatchDeposits(mode === 'transaction' && open ? props.transactionId : null)
  const manualCreditMut = useManualCredit()

  // Mode B — match transactions
  const matchTransactions = useMatchTransactions(mode === 'deposit' && open ? props.bankAutoId : null)
  const adminCreditMut = useAdminCreditDeposit()

  useEffect(() => {
    if (open) {
      setSelectedId('')
      setManualUserId('')
      setReason('')
    }
  }, [open])

  if (!open) return null

  const isTxMode = mode === 'transaction'
  const amount = isTxMode ? props.transactionAmount : props.bankAutoAmount
  const matchData: MatchDeposit[] | MatchTransaction[] = isTxMode ? matchDeposits.data ?? [] : matchTransactions.data ?? []
  const isLoadingMatch = isTxMode ? matchDeposits.isLoading : matchTransactions.isLoading
  const isMutating = manualCreditMut.isPending || adminCreditMut.isPending

  const handleSubmit = () => {
    if (reason.trim().length < 5) {
      toast.error('Lý do tối thiểu 5 ký tự')
      return
    }

    if (isTxMode) {
      const txProps = props as TransactionMode

      if (!selectedId && !manualUserId) {
        toast.error('Chọn lệnh nạp hoặc nhập User ID thủ công')
        return
      }
      const payload: any = { id: txProps.transactionId, reason }

      if (selectedId === '__manual__') {
        payload.user_id = Number(manualUserId)
      } else if (selectedId) {
        payload.bank_auto_id = Number(selectedId)
      }
      manualCreditMut.mutate(payload, {
        onSuccess: () => { toast.info('Đã cộng tiền'); onClose() },
        onError: (e: any) => toast.error(e?.response?.data?.message || 'Lỗi cộng tiền'),
      })
    } else {
      const depProps = props as DepositMode

      adminCreditMut.mutate(
        { id: depProps.bankAutoId, reason, transaction_bank_id: selectedId ? Number(selectedId) : undefined },
        {
          onSuccess: () => { toast.info('Đã cộng tiền'); onClose() },
          onError: (e: any) => toast.error(e?.response?.data?.message || 'Lỗi cộng tiền'),
        }
      )
    }
  }

  return (
    <Drawer anchor='right' open={open} onClose={onClose} PaperProps={{ sx: { width: { xs: '100vw', sm: 560 } } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 3, py: 2, borderBottom: '1px solid #e2e8f0' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Wallet size={20} />
          <Typography variant='h6' fontWeight={600}>Cộng tiền thủ công</Typography>
        </Box>
        <IconButton onClick={onClose} size='small'><X size={18} /></IconButton>
      </Box>

      <Box sx={{ p: 3, overflow: 'auto', flex: 1 }}>
        {/* Header info */}
        <Box sx={{ p: 2, background: '#f8fafc', borderRadius: 2, mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant='caption' color='text.secondary'>Nguồn</Typography>
            <Chip label={isTxMode ? `Giao dịch #${(props as TransactionMode).transactionId}` : `Lệnh nạp #${(props as DepositMode).bankAutoId}`} size='small' />
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant='caption' color='text.secondary'>Số tiền</Typography>
            <Typography fontWeight={700} color='success.main'>{formatVND(amount)}</Typography>
          </Box>
          {isTxMode && (props as TransactionMode).transactionContent && (
            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
              <Typography variant='caption' color='text.secondary'>Nội dung</Typography>
              <Typography variant='caption' sx={{ fontFamily: 'monospace', textAlign: 'right', maxWidth: 360 }}>
                {(props as TransactionMode).transactionContent}
              </Typography>
            </Box>
          )}
          {!isTxMode && (props as DepositMode).bankAutoUserName && (
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant='caption' color='text.secondary'>User của lệnh nạp</Typography>
              <Typography variant='caption' fontWeight={600}>{(props as DepositMode).bankAutoUserName}</Typography>
            </Box>
          )}
        </Box>

        {/* Match list */}
        <Typography variant='subtitle2' sx={{ mb: 1.5, fontWeight: 600 }}>
          {isTxMode ? '🔍 Lệnh nạp khớp — chọn 1:' : '🔍 Giao dịch ngân hàng khớp — chọn 1 (hoặc bỏ trống để tạo mới):'}
        </Typography>

        {isLoadingMatch ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}><CircularProgress size={24} /></Box>
        ) : matchData.length === 0 ? (
          <Alert severity='warning' icon={<AlertCircle size={18} />} sx={{ mb: 2 }}>
            {isTxMode
              ? 'Không tìm thấy lệnh nạp khớp. Có thể chọn user thủ công bên dưới (cần lý do rõ).'
              : 'Không tìm thấy giao dịch ngân hàng khớp. Hệ thống sẽ TẠO giao dịch mới với ghi chú rõ ràng.'}
          </Alert>
        ) : (
          <RadioGroup value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
            {(matchData as any[]).map((item: MatchDeposit | MatchTransaction) => (
              <Box
                key={item.id}
                sx={{
                  border: '1px solid #e2e8f0',
                  borderRadius: 2,
                  p: 1.5,
                  mb: 1,
                  cursor: 'pointer',
                  background: selectedId === String(item.id) ? '#f0f9ff' : 'transparent',
                  '&:hover': { background: '#f8fafc' },
                }}
                onClick={() => setSelectedId(String(item.id))}
              >
                <FormControlLabel
                  value={String(item.id)}
                  control={<Radio size='small' />}
                  sx={{ m: 0, alignItems: 'flex-start' }}
                  label={
                    <Box sx={{ ml: 0.5 }}>
                      {isTxMode ? (
                        <>
                          <Typography fontWeight={600} fontSize={14}>
                            Lệnh #{(item as MatchDeposit).id} — {(item as MatchDeposit).user_name}
                          </Typography>
                          <Typography variant='caption' color='text.secondary' sx={{ display: 'block' }}>
                            {(item as MatchDeposit).user_email} · {formatVND((item as MatchDeposit).amount)}
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, flexWrap: 'wrap' }}>
                            <Chip label={`Mã: ${(item as MatchDeposit).transaction_code}`} size='small' variant='outlined' />
                            <Chip label={(item as MatchDeposit).status} size='small' color={(item as MatchDeposit).status === 'pending' ? 'warning' : 'default'} />
                            {(item as MatchDeposit).memo_match
                              ? <Chip label='Memo khớp' size='small' color='success' icon={<CheckCircle size={12} />} />
                              : <Chip label='Memo không khớp' size='small' color='warning' />}
                          </Box>
                          <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mt: 0.5 }}>
                            Tạo: {formatDate((item as MatchDeposit).created_at)}
                          </Typography>
                        </>
                      ) : (
                        <>
                          <Typography fontWeight={600} fontSize={14}>
                            GD #{(item as MatchTransaction).id} — {formatVND((item as MatchTransaction).transfer_amount)}
                          </Typography>
                          <Typography variant='caption' color='text.secondary' sx={{ display: 'block' }}>
                            {(item as MatchTransaction).gateway} · {(item as MatchTransaction).transaction_number}
                          </Typography>
                          <Typography variant='caption' sx={{ display: 'block', fontFamily: 'monospace', wordBreak: 'break-all', mt: 0.5 }}>
                            {(item as MatchTransaction).content}
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
                            <Chip label={formatDate((item as MatchTransaction).transaction_date)} size='small' variant='outlined' />
                            {(item as MatchTransaction).memo_match
                              ? <Chip label='Memo khớp' size='small' color='success' icon={<CheckCircle size={12} />} />
                              : <Chip label='Memo không khớp' size='small' color='warning' />}
                          </Box>
                        </>
                      )}
                    </Box>
                  }
                />
              </Box>
            ))}
            {isTxMode && (
              <Box
                sx={{
                  border: '1px dashed #cbd5e1',
                  borderRadius: 2,
                  p: 1.5,
                  mb: 1,
                  background: selectedId === '__manual__' ? '#fef3c7' : 'transparent',
                }}
              >
                <FormControlLabel
                  value='__manual__'
                  control={<Radio size='small' />}
                  label={
                    <Box>
                      <Typography fontWeight={600} fontSize={14}>Chọn user thủ công</Typography>
                      <Typography variant='caption' color='warning.main'>
                        Cảnh báo: không khớp lệnh nạp nào. Cần lý do rõ ràng.
                      </Typography>
                    </Box>
                  }
                />
                {selectedId === '__manual__' && (
                  <TextField
                    size='small'
                    type='number'
                    label='User ID'
                    fullWidth
                    sx={{ mt: 1 }}
                    value={manualUserId}
                    onChange={(e) => setManualUserId(e.target.value)}
                  />
                )}
              </Box>
            )}
          </RadioGroup>
        )}

        {/* Reason */}
        <Box sx={{ mt: 3 }}>
          <Typography variant='subtitle2' fontWeight={600} sx={{ mb: 1 }}>
            📝 Lý do <span style={{ color: '#dc2626' }}>(bắt buộc, tối thiểu 5 ký tự)</span>
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={3}
            placeholder='VD: Lệnh nạp hết hạn, user chuyển khoản trễ. Số tiền + mã khớp.'
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            error={reason.length > 0 && reason.length < 5}
            helperText={reason.length > 0 && reason.length < 5 ? `Còn ${5 - reason.length} ký tự` : `${reason.length}/500`}
          />
          <Alert severity='info' sx={{ mt: 1.5, fontSize: 12 }}>
            Lý do sẽ hiển thị trong lịch sử giao dịch của user và log admin.
          </Alert>
        </Box>
      </Box>

      {/* Footer */}
      <Box sx={{ p: 2, borderTop: '1px solid #e2e8f0', display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
        <Button onClick={onClose} disabled={isMutating}>Huỷ</Button>
        <Button
          variant='contained'
          onClick={handleSubmit}
          disabled={isMutating || reason.trim().length < 5}
          sx={{ color: '#fff' }}
        >
          {isMutating ? 'Đang xử lý...' : 'Xác nhận cộng tiền'}
        </Button>
      </Box>
    </Drawer>
  )
}
