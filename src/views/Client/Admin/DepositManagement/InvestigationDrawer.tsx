'use client'

import { useState } from 'react'

import Box from '@mui/material/Box'
import Drawer from '@mui/material/Drawer'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import CircularProgress from '@mui/material/CircularProgress'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import TextField from '@mui/material/TextField'
import Autocomplete from '@mui/material/Autocomplete'
import Divider from '@mui/material/Divider'
import { X, CheckCircle2, XCircle, Clock, MinusCircle, Lightbulb, HandCoins, Ban, Undo2, Key, Copy, Package, Eye, EyeOff } from 'lucide-react'
import { toast } from 'react-toastify'

import { useInvestigateFull, useDismissTransaction, useUndismissTransaction } from '@/hooks/apis/useDepositManagement'
import { useManualCredit } from '@/hooks/apis/useTransactionBank'
import { useAdminUsers } from '@/hooks/apis/useAdminUsers'

interface Props {
  open: boolean
  onClose: () => void
  source: 'transaction_bank' | 'bank_auto' | null
  sourceId: number | null

  /** Pre-filled info for header */
  headerInfo?: {
    amount?: number
    userName?: string
    userEmail?: string
    gateway?: string
  }

  /** transaction_bank id for manual credit / dismiss (only when source=transaction_bank) */
  transactionBankId?: number | null
}

const stepIcons: Record<string, React.ReactNode> = {
  pass: <CheckCircle2 size={18} color='#16a34a' />,
  fail: <XCircle size={18} color='#dc2626' />,
  skip: <MinusCircle size={18} color='#9ca3af' />,
  pending: <Clock size={18} color='#f59e0b' />
}

const stepBorderColors: Record<string, string> = {
  pass: '#16a34a',
  fail: '#dc2626',
  skip: '#d1d5db',
  pending: '#f59e0b'
}

const stepBgColors: Record<string, string> = {
  pass: '#f0fdf4',
  fail: '#fef2f2',
  skip: '#f9fafb',
  pending: '#fffbeb'
}

export default function InvestigationDrawer({ open, onClose, source, sourceId, headerInfo, transactionBankId }: Props) {
  const { data, isLoading } = useInvestigateFull(open ? source : null, open ? sourceId : null)

  const [showManualCredit, setShowManualCredit] = useState(false)
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [adminNote, setAdminNote] = useState('')
  const [userSearch, setUserSearch] = useState('')
  const [showDismissForm, setShowDismissForm] = useState(false)
  const [dismissReason, setDismissReason] = useState('')
  const [showBuyToken, setShowBuyToken] = useState(false)

  const { data: usersData } = useAdminUsers(
    { search: userSearch, per_page: 10 },
    userSearch.length >= 2
  )

  const manualCredit = useManualCredit()
  const dismiss = useDismissTransaction()
  const undismiss = useUndismissTransaction()

  const txnBankId = transactionBankId || data?.context?.transaction_bank?.id
  const isDismissed = data?.context?.transaction_bank?.dismissed_at
  const isProcessed = data?.context?.transaction_bank?.is_processed
  const canManualCredit = txnBankId && !isProcessed && !isDismissed && data?.diagnosis?.overall === 'fail'
  const canDismiss = txnBankId && !isProcessed && !isDismissed
  const canUndismiss = txnBankId && isDismissed

  // Auto-suggest user from investigation
  const suggestedUser = data?.context?.user

  const handleManualCredit = async () => {
    if (!txnBankId || !selectedUser) return

    try {
      await manualCredit.mutateAsync({
        id: txnBankId,
        user_id: selectedUser.id,
        admin_note: adminNote || undefined
      })

      toast.success('Cộng tiền thành công!')
      setShowManualCredit(false)
      setSelectedUser(null)
      setAdminNote('')
      onClose()
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Lỗi cộng tiền')
    }
  }

  const handleDismiss = async () => {
    if (!txnBankId) return

    try {
      await dismiss.mutateAsync({ id: txnBankId, reason: dismissReason || undefined })
      toast.success('Đã bỏ qua giao dịch')
      setShowDismissForm(false)
      setDismissReason('')
      onClose()
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Lỗi')
    }
  }

  const handleUndismiss = async () => {
    if (!txnBankId) return

    try {
      await undismiss.mutateAsync(txnBankId)
      toast.success('Đã hủy bỏ qua')
      onClose()
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Lỗi')
    }
  }

  const handleClose = () => {
    setShowManualCredit(false)
    setShowDismissForm(false)
    setSelectedUser(null)
    setAdminNote('')
    setDismissReason('')
    onClose()
  }

  return (
    <Drawer anchor='right' open={open} onClose={handleClose} PaperProps={{ sx: { width: { xs: '100%', sm: 520 } } }}>
      {/* Header */}
      <Box sx={{ p: 2.5, borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography fontWeight={700} fontSize={16}>Điều tra nạp tiền</Typography>
          {headerInfo && (
            <Box sx={{ mt: 0.5 }}>
              {headerInfo.userName && (
                <Typography fontSize={13} color='text.secondary'>
                  {headerInfo.userName}{headerInfo.userEmail ? ` — ${headerInfo.userEmail}` : ''}
                </Typography>
              )}
              <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                {headerInfo.amount != null && (
                  <Chip label={`${headerInfo.amount.toLocaleString('vi-VN')}đ`} size='small' color='primary' />
                )}
                {headerInfo.gateway && (
                  <Chip label={headerInfo.gateway} size='small' variant='outlined' />
                )}
              </Box>
            </Box>
          )}
        </Box>
        <IconButton onClick={handleClose} size='small'><X size={18} /></IconButton>
      </Box>

      {/* Content */}
      <Box sx={{ p: 2.5, overflowY: 'auto', flex: 1 }}>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
        ) : !data ? (
          <Typography color='text.secondary' textAlign='center' py={4}>Không có dữ liệu</Typography>
        ) : (
          <>
            {/* Evidence Chain Steps */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {data.checklist.map((step, idx) => {
                const firstFail = data.checklist.findIndex(s => s.status === 'fail')
                const isAfterFail = firstFail >= 0 && idx > firstFail && step.status !== 'pass'
                const effectiveStatus = isAfterFail ? 'skip' : step.status

                return (
                  <Box
                    key={step.step}
                    sx={{
                      borderLeft: `3px solid ${stepBorderColors[effectiveStatus]}`,
                      bgcolor: stepBgColors[effectiveStatus],
                      borderRadius: '0 8px 8px 0',
                      p: 1.5,
                      opacity: isAfterFail ? 0.5 : 1
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      {stepIcons[effectiveStatus]}
                      <Typography fontSize={13} fontWeight={600} sx={{ flex: 1 }}>
                        Bước {step.step}: {step.label}
                      </Typography>
                    </Box>
                    <Typography fontSize={12} color='text.secondary' sx={{ pl: 3.5 }}>
                      {isAfterFail ? '(chưa kiểm tra — bước trước thất bại)' : step.detail}
                    </Typography>

                    {/* Near matches */}
                    {step.key === 'content_matched' && step.status === 'fail' && step.data?.near_matches?.length > 0 && (
                      <Box sx={{ pl: 3.5, mt: 1 }}>
                        <Typography fontSize={11} fontWeight={600} color='text.secondary' mb={0.5}>Gần giống:</Typography>
                        {step.data.near_matches.map((m: any, i: number) => (
                          <Typography key={i} fontSize={11} color='text.secondary'>
                            • &quot;{m.transfer_content}&quot; — {m.user_name} ({m.user_email})
                          </Typography>
                        ))}
                      </Box>
                    )}

                    {/* Expired bank_auto info */}
                    {step.key === 'deposit_request_found' && step.data?.expired_bank_auto && (
                      <Typography fontSize={11} color='warning.main' sx={{ pl: 3.5, mt: 0.5 }}>
                        Lệnh nạp #{step.data.expired_bank_auto.id} đã {step.data.expired_bank_auto.status}
                      </Typography>
                    )}
                  </Box>
                )
              })}
            </Box>

            {/* Diagnosis / Suggestion */}
            {data.diagnosis.suggestion && (
              <Box sx={{ mt: 2, p: 1.5, bgcolor: data.diagnosis.overall === 'pass' ? '#f0fdf4' : '#eff6ff', borderRadius: 2, display: 'flex', gap: 1 }}>
                <Lightbulb size={16} color={data.diagnosis.overall === 'pass' ? '#16a34a' : '#2563eb'} style={{ marginTop: 2, flexShrink: 0 }} />
                <Typography fontSize={12} color={data.diagnosis.overall === 'pass' ? 'success.main' : 'info.main'}>
                  {data.diagnosis.suggestion}
                </Typography>
              </Box>
            )}

            {/* Gem1 Tool Info (chỉ khi bank_auto type=gem1) */}
            {data.gem_info && (
              <Box sx={{ mt: 2, p: 1.5, bgcolor: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                  <Key size={16} color='#7e22ce' />
                  <Typography fontSize={13} fontWeight={700} color='#7e22ce'>GEM1 Tool</Typography>
                  {(() => {
                    const s = data.gem_info.token_status
                    const map: Record<string, { label: string; color: 'success' | 'warning' | 'default' | 'error' }> = {
                      ready:               { label: 'Token sẵn sàng', color: 'warning' },
                      consumed_or_expired: { label: 'Đã mua / hết hạn', color: 'success' },
                      not_paid_yet:       { label: 'Chưa CK',          color: 'default' },
                      redis_error:        { label: 'Lỗi Redis',        color: 'error' },
                      unknown:            { label: 'Không xác định',    color: 'default' },
                    }
                    const m = map[s] || map.unknown
                    return <Chip label={m.label} size='small' color={m.color} />
                  })()}
                </Box>

                {/* Buy token (ẩn/hiện) */}
                {data.gem_info.buy_token && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Typography fontSize={11} color='text.secondary' minWidth={72}>Buy Token:</Typography>
                    <Typography fontSize={11} fontFamily='monospace' sx={{ flex: 1, wordBreak: 'break-all' }}>
                      {showBuyToken ? data.gem_info.buy_token : '•'.repeat(8) + data.gem_info.buy_token.slice(-6)}
                    </Typography>
                    <IconButton size='small' onClick={() => setShowBuyToken(!showBuyToken)}>
                      {showBuyToken ? <EyeOff size={14} /> : <Eye size={14} />}
                    </IconButton>
                    <IconButton
                      size='small'
                      onClick={() => {
                        navigator.clipboard.writeText(data.gem_info.buy_token)
                        toast.info('Đã copy buy_token')
                      }}
                    >
                      <Copy size={14} />
                    </IconButton>
                  </Box>
                )}

                {/* Token TTL */}
                {data.gem_info.token_status === 'ready' && data.gem_info.token_ttl != null && (
                  <Typography fontSize={11} color='warning.main' sx={{ pl: '72px', mb: 1 }}>
                    Còn {Math.floor(data.gem_info.token_ttl / 3600)}h {Math.floor((data.gem_info.token_ttl % 3600) / 60)}m trước khi expire
                  </Typography>
                )}

                {/* Deposit info */}
                <Box sx={{ display: 'flex', gap: 2, mb: 1 }}>
                  <Typography fontSize={11} color='text.secondary'>
                    Mã nạp: <strong style={{ color: '#111' }}>{data.gem_info.deposit_code}</strong>
                  </Typography>
                  <Typography fontSize={11} color='text.secondary'>
                    Số tiền: <strong style={{ color: '#111' }}>{data.gem_info.deposit_amount.toLocaleString('vi-VN')}đ</strong>
                  </Typography>
                </Box>

                {/* Orders list */}
                <Divider sx={{ my: 1 }} />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Package size={14} color='#7e22ce' />
                  <Typography fontSize={12} fontWeight={600}>
                    Đơn đã mua ({data.gem_info.purchases_count})
                  </Typography>
                </Box>

                {data.gem_info.orders.length === 0 ? (
                  <Typography fontSize={11} color='text.secondary' sx={{ pl: 2.5 }}>
                    {data.gem_info.token_status === 'ready'
                      ? 'Khách đã nạp nhưng chưa mua đơn nào'
                      : data.gem_info.token_status === 'not_paid_yet'
                      ? 'Khách chưa CK tiền'
                      : 'Chưa có đơn'}
                  </Typography>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                    {data.gem_info.orders.map((o: any) => (
                      <Box key={o.id} sx={{ p: 1, bgcolor: '#fff', border: '1px solid #e9d5ff', borderRadius: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography fontSize={12} fontWeight={600}>{o.order_code}</Typography>
                          <Chip label={o.status} size='small' variant='outlined' />
                        </Box>
                        <Typography fontSize={11} color='text.secondary'>
                          SL: {o.quantity} · Tổng: {o.total_amount.toLocaleString('vi-VN')}đ
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                )}
              </Box>
            )}

            {/* Manual Credit Form */}
            {showManualCredit && canManualCredit && (
              <>
                <Divider sx={{ my: 2 }} />
                <Typography fontWeight={600} fontSize={14} mb={1.5}>Cộng tiền thủ công</Typography>

                <Autocomplete
                  size='small'
                  options={usersData?.data || []}
                  getOptionLabel={(o: any) => `${o.name} — ${o.email}`}
                  value={selectedUser}
                  onChange={(_, v) => setSelectedUser(v)}
                  onInputChange={(_, v) => setUserSearch(v)}
                  renderOption={(props, o: any) => (
                    <li {...props} key={o.id}>
                      <Box>
                        <Typography fontSize={13} fontWeight={500}>{o.name}</Typography>
                        <Typography fontSize={11} color='text.secondary'>{o.email} — Số dư: {(o.sodu || 0).toLocaleString('vi-VN')}đ</Typography>
                      </Box>
                    </li>
                  )}
                  renderInput={p => <TextField {...p} label='Chọn user' placeholder='Tìm theo tên hoặc email...' />}
                  sx={{ mb: 1.5 }}
                  noOptionsText='Nhập ít nhất 2 ký tự...'
                />

                {suggestedUser && !selectedUser && (
                  <Box
                    onClick={() => setSelectedUser(suggestedUser)}
                    sx={{ p: 1, bgcolor: '#eff6ff', borderRadius: 1, cursor: 'pointer', mb: 1.5, '&:hover': { bgcolor: '#dbeafe' } }}
                  >
                    <Typography fontSize={11} color='info.main'>
                      Gợi ý: {suggestedUser.name} ({suggestedUser.email}) — click để chọn
                    </Typography>
                  </Box>
                )}

                <Box sx={{ p: 1.5, bgcolor: '#f9fafb', borderRadius: 1, mb: 1.5 }}>
                  <Typography fontSize={12} color='text.secondary'>
                    Số tiền: <strong>{(headerInfo?.amount || data.context?.transaction_bank?.transfer_amount || 0).toLocaleString('vi-VN')}đ</strong> (không thể thay đổi)
                  </Typography>
                </Box>

                <TextField
                  size='small'
                  fullWidth
                  multiline
                  rows={2}
                  label='Ghi chú admin (tùy chọn)'
                  value={adminNote}
                  onChange={e => setAdminNote(e.target.value)}
                  sx={{ mb: 1.5 }}
                />

                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant='contained'
                    color='success'
                    size='small'
                    disabled={!selectedUser || manualCredit.isPending}
                    onClick={handleManualCredit}
                    startIcon={manualCredit.isPending ? <CircularProgress size={14} /> : <HandCoins size={14} />}
                  >
                    Xác nhận cộng tiền
                  </Button>
                  <Button variant='outlined' size='small' onClick={() => setShowManualCredit(false)}>Hủy</Button>
                </Box>
              </>
            )}

            {/* Dismiss Form */}
            {showDismissForm && canDismiss && (
              <>
                <Divider sx={{ my: 2 }} />
                <Typography fontWeight={600} fontSize={14} mb={1}>Bỏ qua giao dịch</Typography>
                <Typography fontSize={12} color='text.secondary' mb={1.5}>
                  GD này sẽ không còn hiện trong &quot;Chưa xử lý&quot;. Có thể hủy bỏ qua sau.
                </Typography>
                <TextField
                  size='small'
                  fullWidth
                  label='Lý do (tùy chọn)'
                  placeholder='VD: GD spam, chuyển nhầm...'
                  value={dismissReason}
                  onChange={e => setDismissReason(e.target.value)}
                  sx={{ mb: 1.5 }}
                />
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant='contained'
                    color='warning'
                    size='small'
                    disabled={dismiss.isPending}
                    onClick={handleDismiss}
                    startIcon={dismiss.isPending ? <CircularProgress size={14} /> : <Ban size={14} />}
                  >
                    Xác nhận bỏ qua
                  </Button>
                  <Button variant='outlined' size='small' onClick={() => setShowDismissForm(false)}>Hủy</Button>
                </Box>
              </>
            )}
          </>
        )}
      </Box>

      {/* Footer Actions */}
      {data && !showManualCredit && !showDismissForm && (
        <Box sx={{ p: 2, borderTop: '1px solid #e5e7eb', display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {canManualCredit && (
            <Button
              variant='contained'
              size='small'
              color='success'
              startIcon={<HandCoins size={14} />}
              onClick={() => setShowManualCredit(true)}
            >
              Cộng tiền thủ công
            </Button>
          )}
          {canDismiss && (
            <Button
              variant='outlined'
              size='small'
              color='warning'
              startIcon={<Ban size={14} />}
              onClick={() => setShowDismissForm(true)}
            >
              Bỏ qua
            </Button>
          )}
          {canUndismiss && (
            <Button
              variant='outlined'
              size='small'
              color='info'
              startIcon={<Undo2 size={14} />}
              onClick={handleUndismiss}
              disabled={undismiss.isPending}
            >
              Hủy bỏ qua
            </Button>
          )}
          <Box sx={{ flex: 1 }} />
          <Button variant='text' size='small' onClick={handleClose}>Đóng</Button>
        </Box>
      )}
    </Drawer>
  )
}
