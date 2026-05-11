'use client'

import { useState } from 'react'

import Box from '@mui/material/Box'
import Drawer from '@mui/material/Drawer'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import CircularProgress from '@mui/material/CircularProgress'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import { X, CheckCircle2, XCircle, Clock, MinusCircle, Lightbulb, HandCoins, Key, Copy, Package, Eye, EyeOff } from 'lucide-react'
import { toast } from 'react-toastify'

import { useInvestigateFull } from '@/hooks/apis/useDepositManagement'

import CreditManualDrawer from './CreditManualDrawer'

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

  const [showBuyToken, setShowBuyToken] = useState(false)
  const [creditDrawerOpen, setCreditDrawerOpen] = useState(false)

  const txnBankId = transactionBankId || data?.context?.transaction_bank?.id
  const isProcessed = data?.context?.transaction_bank?.is_processed
  const canCredit = txnBankId && !isProcessed
  const txAmount = headerInfo?.amount || data?.context?.transaction_bank?.transfer_amount || 0
  const txContent = data?.context?.transaction_bank?.content

  const handleClose = () => {
    setCreditDrawerOpen(false)
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
                    {step.key === 'content_matched' && step.status === 'fail' && (step.data?.near_matches?.length ?? 0) > 0 && (
                      <Box sx={{ pl: 3.5, mt: 1 }}>
                        <Typography fontSize={11} fontWeight={600} color='text.secondary' mb={0.5}>Gần giống:</Typography>
                        {step.data!.near_matches.map((m: any, i: number) => (
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
                        if (data?.gem_info?.buy_token) {
                          navigator.clipboard.writeText(data.gem_info.buy_token)
                          toast.info('Đã copy buy_token')
                        }
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

          </>
        )}
      </Box>

      {/* Footer Actions */}
      {data && (
        <Box sx={{ p: 2, borderTop: '1px solid #e5e7eb', display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
          {canCredit && (
            <Button
              variant='contained'
              size='small'
              color='success'
              startIcon={<HandCoins size={14} />}
              onClick={() => setCreditDrawerOpen(true)}
            >
              Cộng tiền
            </Button>
          )}
          <Button variant='text' size='small' onClick={handleClose}>Đóng</Button>
        </Box>
      )}

      {/* Credit Manual Drawer — luồng chặt chẽ (match + reason) */}
      {canCredit && (
        <CreditManualDrawer
          mode='transaction'
          open={creditDrawerOpen}
          onClose={() => { setCreditDrawerOpen(false); handleClose() }}
          transactionId={Number(txnBankId)}
          transactionAmount={Number(txAmount)}
          transactionContent={txContent}
        />
      )}
    </Drawer>
  )
}
