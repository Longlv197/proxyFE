'use client'

import { useState, useRef } from 'react'

import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import { X, Clock3, MessageSquare, ShieldCheck, UserCheck, Send, Upload, Trash2, Image as ImageIcon } from 'lucide-react'
import { toast } from 'react-toastify'

import { useSession } from 'next-auth/react'

import { formatDateTimeLocal } from '@/utils/formatDate'
import { TICKET_STATUS, TICKET_STATUS_LABELS, TICKET_STATUS_COLORS, TICKET_TYPE_LABELS } from '@/constants/ticketStatus'
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from '@/constants/orderStatus'
import { useUserReply } from '@/hooks/apis/useTickets'
import { useComposingInput } from '@/hooks/useComposingInput'

// Resolve relative path → full URL
function resolveUrl(path: string | null | undefined): string {
  if (!path) return ''
  if (path.startsWith('http')) return path
  const apiBase = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/api\/?$/, '')

  return apiBase ? `${apiBase}${path}` : path
}

interface Props {
  open: boolean
  onClose: () => void
  ticket: any
}

export default function TicketDetailDialog({ open, onClose, ticket }: Props) {
  const [replyText, setReplyText] = useState('')
  const [replyImage, setReplyImage] = useState<File | null>(null)
  const [replyPreview, setReplyPreview] = useState('')
  const [fullImage, setFullImage] = useState('')
  const [localReplies, setLocalReplies] = useState<any[]>([])
  const fileRef = useRef<HTMLInputElement>(null)
  const reply = useUserReply()
  const session = useSession()
  const currentUserId = Number((session?.data?.user as any)?.id) || 0
  const replyBind = useComposingInput(setReplyText)

  // Reset local replies khi ticket đổi
  const ticketId = ticket?.id
  const [prevTicketId, setPrevTicketId] = useState<number | null>(null)

  if (ticketId && ticketId !== prevTicketId) {
    setPrevTicketId(ticketId)
    setLocalReplies([])
  }

  if (!ticket) return null

  const statusLabel = TICKET_STATUS_LABELS[ticket.status] || 'Không xác định'
  const statusColor = TICKET_STATUS_COLORS[ticket.status] || 'default'
  const isClosed = [TICKET_STATUS.RESOLVED, TICKET_STATUS.CLOSED, TICKET_STATUS.REJECTED].includes(ticket.status)

  const serverReplies = ticket.replies || []
  const serverIds = new Set(serverReplies.map((r: any) => r.id))
  const replies = [...serverReplies, ...localReplies.filter(r => !serverIds.has(r.id))]

  const handleReply = () => {
    if (!replyText.trim()) return
    const formData = new FormData()

    formData.append('message', replyText.trim())

    if (replyImage) formData.append('image', replyImage)

    reply.mutate({ ticketId: ticket.id, data: formData }, {
      onSuccess: (res: any) => {
        const newReply = res?.data

        if (newReply) setLocalReplies(prev => [...prev, { ...newReply, user_id: currentUserId }])
        setReplyText('')
        setReplyImage(null)
        setReplyPreview('')
      },
      onError: (err: any) => toast.error(err?.response?.data?.message || 'Lỗi')
    })
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth='sm' fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
        <span>
          {ticket.ticket_code}
          <Chip label={statusLabel} color={statusColor as any} size='small' sx={{ ml: 1, height: 22, fontSize: '11px' }} />
        </span>
        <IconButton size='small' onClick={onClose}><X size={18} /></IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ p: 0 }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {/* Ticket info */}
          <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10, borderBottom: '1px solid #f1f5f9' }}>
            <div style={{ fontSize: '12px', color: '#94a3b8' }}>
              {TICKET_TYPE_LABELS[ticket.type] || ticket.type} · {formatDateTimeLocal(ticket.created_at)}
            </div>

            {/* Deposit info */}
            {ticket.deposit && (
              <div style={{ padding: '8px 10px', background: '#eff6ff', borderRadius: 8, border: '1px solid #bfdbfe', fontSize: '13px' }}>
                Lệnh nạp: <strong>{Number(ticket.deposit.amount).toLocaleString('vi-VN')}đ</strong>
                {ticket.deposit.transaction_code && ` — ${ticket.deposit.transaction_code}`}
                {' · '}{formatDateTimeLocal(ticket.deposit.created_at)}
              </div>
            )}

            {/* Order info */}
            {ticket.order && (
              <div style={{ padding: '8px 10px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '13px' }}>
                Đơn hàng: <strong>{ticket.order.order_code}</strong>
                <Chip
                  label={ORDER_STATUS_LABELS[ticket.order.status] || '?'}
                  color={(ORDER_STATUS_COLORS[ticket.order.status] || 'default') as any}
                  size='small' sx={{ ml: 1, height: 20, fontSize: '10px' }}
                />
              </div>
            )}

            {/* Original message */}
            <div>
              <p style={{ margin: 0, fontSize: '14px', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{ticket.message}</p>
              {ticket.image_url && (
                <img src={resolveUrl(ticket.image_url)} alt='' style={{ maxHeight: 150, borderRadius: 8, marginTop: 8, border: '1px solid #e2e8f0', cursor: 'pointer' }} onClick={() => setFullImage(resolveUrl(ticket.image_url))} />
              )}
            </div>
          </div>

          {/* Legacy admin_note (old tickets) */}
          {ticket.admin_note && replies.length === 0 && (
            <div style={{ padding: '12px 16px', background: '#f0fdf4', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4, fontSize: '12px', color: '#16a34a', fontWeight: 600 }}>
                <ShieldCheck size={13} /> Admin
                {ticket.resolved_by_user && ` · ${ticket.resolved_by_user.name}`}
                {ticket.resolved_at && ` · ${formatDateTimeLocal(ticket.resolved_at)}`}
              </div>
              <p style={{ margin: 0, fontSize: '13px', whiteSpace: 'pre-wrap' }}>{ticket.admin_note}</p>
            </div>
          )}

          {/* Reply thread — chat bubble */}
          {replies.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', padding: '8px 12px', gap: 8 }}>
              {replies.map((r: any) => {
                const isMe = Number(r.user_id) === currentUserId && currentUserId > 0
                const isAdminReply = !r.user_id
                const displayName = isMe ? 'Bạn' : (isAdminReply ? 'Admin' : (r.user?.name || 'User'))

                return (
                <div key={r.id} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                  <div style={{
                    maxWidth: '85%', padding: '8px 12px',
                    background: isMe ? '#eff6ff' : '#dcfce7',
                    borderRadius: isMe ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3, fontSize: '11px' }}>
                      {isAdminReply ? (
                        <ShieldCheck size={11} style={{ color: '#16a34a' }} />
                      ) : (
                        <UserCheck size={11} style={{ color: '#3b82f6' }} />
                      )}
                      <strong style={{ color: isAdminReply ? '#16a34a' : '#3b82f6' }}>
                        {displayName}
                      </strong>
                      <span style={{ color: '#94a3b8' }}>{formatDateTimeLocal(r.created_at)}</span>
                    </div>
                    <p style={{ margin: 0, fontSize: '13px', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{r.message}</p>
                    {r.image_url && (
                      <img src={resolveUrl(r.image_url)} alt='' style={{ maxHeight: 120, borderRadius: 8, marginTop: 6, border: '1px solid #e2e8f0', cursor: 'pointer' }} onClick={() => setFullImage(resolveUrl(r.image_url))} />
                    )}
                  </div>
                </div>
                )
              })}
            </div>
          )}

          {/* Reply input — chỉ khi chưa đóng */}
          {!isClosed ? (
            <div style={{ padding: '12px 16px', borderTop: '1px solid #e2e8f0', background: '#fafbfc' }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <textarea
                  rows={2}
                  value={replyText}
                  {...replyBind}
                  placeholder='Nhập phản hồi...'
                  maxLength={2000}
                  style={{
                    flex: 1, padding: '8px 10px', borderRadius: 8, border: '1px solid #e2e8f0',
                    fontSize: '13px', resize: 'vertical', fontFamily: 'inherit', outline: 'none',
                  }}
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <IconButton
                    size='small'
                    onClick={() => fileRef.current?.click()}
                    sx={{ border: '1px solid #e2e8f0', borderRadius: 2 }}
                    title='Đính kèm ảnh'
                  >
                    <ImageIcon size={16} />
                  </IconButton>
                  <Button
                    size='small' variant='contained'
                    onClick={handleReply}
                    disabled={reply.isPending || !replyText.trim()}
                    sx={{ minWidth: 36, p: '6px', color: '#fff' }}
                  >
                    <Send size={16} />
                  </Button>
                </div>
              </div>
              {replyPreview && (
                <div style={{ position: 'relative', display: 'inline-block', marginTop: 8 }}>
                  <img src={replyPreview} alt='' style={{ maxHeight: 80, borderRadius: 6, border: '1px solid #e2e8f0' }} />
                  <IconButton
                    size='small'
                    onClick={() => { setReplyImage(null); setReplyPreview('') }}
                    sx={{ position: 'absolute', top: -6, right: -6, bgcolor: '#fff', border: '1px solid #e2e8f0', width: 20, height: 20 }}
                  >
                    <Trash2 size={10} />
                  </IconButton>
                </div>
              )}
              <input ref={fileRef} type='file' hidden accept='image/png,image/jpeg,image/jpg,image/gif,image/webp' onChange={e => {
                const f = e.target.files?.[0]

                if (f) {
                  const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp']

                  if (!allowed.includes(f.type)) { toast.error('Chỉ chấp nhận ảnh PNG, JPG, GIF, WebP'); e.target.value = ''; return }
                  if (f.size > 2 * 1024 * 1024) { toast.error('Ảnh tối đa 2MB'); e.target.value = ''; return }
                  setReplyImage(f); setReplyPreview(URL.createObjectURL(f))
                }

                e.target.value = ''
              }} />
            </div>
          ) : (
            <div style={{ padding: '12px 16px', textAlign: 'center', fontSize: '13px', color: '#94a3b8', background: '#fafbfc', borderTop: '1px solid #e2e8f0' }}>
              Ticket đã {statusLabel.toLowerCase()} — không thể phản hồi thêm.
            </div>
          )}
        </div>

        {/* Image fullscreen overlay — bên trong Dialog để z-index đúng */}
        {fullImage && (
          <div
            onClick={() => setFullImage('')}
            style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            <img src={fullImage} alt='' style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: 8, boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }} onClick={e => e.stopPropagation()} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
