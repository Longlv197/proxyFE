'use client'

import { useState } from 'react'

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Tooltip,
  Chip,
  Typography
} from '@mui/material'
import { Copy, Check, Download } from 'lucide-react'
import { toast } from 'react-toastify'

import { useVoucherCodes } from '@/hooks/apis/useVouchers'
import type { VoucherCampaign, VoucherItemRow } from '@/hooks/apis/useVouchers'

interface Props {
  open: boolean
  onClose: () => void
  campaign: VoucherCampaign | null
}

export default function ModalVoucherCodes({ open, onClose, campaign }: Props) {
  // per_page lớn để đa số campaign gọn 1 trang (copy/tải toàn bộ mã đã tải)
  const { data, isLoading } = useVoucherCodes(open ? (campaign?.id ?? null) : null, 1)
  const [copied, setCopied] = useState<string | null>(null)

  const items: VoucherItemRow[] = data?.data ?? []
  const isShared = campaign?.code_type === 1

  const copy = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(text)
    setTimeout(() => setCopied(null), 1500)
  }

  const copyAll = () => {
    if (!items.length) return
    navigator.clipboard.writeText(items.map(i => i.code).join('\n'))
    toast.info(`Đã copy ${items.length} mã`)
  }

  const exportTxt = () => {
    if (!items.length) return
    const blob = new Blob([items.map(i => i.code).join('\n')], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `voucher-${campaign?.name || campaign?.id}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth='sm'>
      <DialogTitle>
        <Typography variant='h6'>Mã của: {campaign?.name}</Typography>
        <Typography variant='caption' sx={{ color: '#94a3b8' }}>
          {isShared ? 'Mã chung — 1 mã dùng nhiều lượt' : `Mã riêng — ${items.length} mã, mỗi mã 1 lần`}
        </Typography>
      </DialogTitle>
      <DialogContent>
        {isLoading ? (
          <Typography sx={{ py: 3, textAlign: 'center', color: '#94a3b8' }}>Đang tải...</Typography>
        ) : items.length === 0 ? (
          <Typography sx={{ py: 3, textAlign: 'center', color: '#94a3b8' }}>Không có mã</Typography>
        ) : isShared ? (
          // Mã chung — hiện to, dễ copy
          <div
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              gap: 12, padding: '16px 18px', marginTop: 8,
              background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: 10
            }}
          >
            <span style={{ fontFamily: 'monospace', fontSize: 20, fontWeight: 700, letterSpacing: 1, color: '#0f172a' }}>
              {items[0].code}
            </span>
            <Button
              variant='contained'
              size='small'
              startIcon={copied === items[0].code ? <Check size={16} /> : <Copy size={16} />}
              onClick={() => copy(items[0].code)}
              sx={{ color: '#fff', textTransform: 'none' }}
            >
              {copied === items[0].code ? 'Đã copy' : 'Copy'}
            </Button>
          </div>
        ) : (
          // Mã riêng — danh sách
          <div style={{ marginTop: 8, maxHeight: 360, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 8 }}>
            {items.map(it => (
              <div
                key={it.id}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '8px 12px', borderBottom: '1px solid #f1f5f9'
                }}
              >
                <span style={{ fontFamily: 'monospace', fontSize: 14, color: it.status === 2 ? '#94a3b8' : '#0f172a', textDecoration: it.status === 2 ? 'line-through' : 'none' }}>
                  {it.code}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {it.status === 2 && <Chip label='đã dùng' size='small' sx={{ height: 18, fontSize: 11 }} />}
                  <Tooltip title='Copy'>
                    <IconButton size='small' onClick={() => copy(it.code)} sx={{ color: copied === it.code ? '#16a34a' : '#64748b' }}>
                      {copied === it.code ? <Check size={15} /> : <Copy size={15} />}
                    </IconButton>
                  </Tooltip>
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
      <DialogActions>
        {!isShared && items.length > 0 && (
          <>
            <Button onClick={copyAll} variant='outlined' size='small' startIcon={<Copy size={15} />} sx={{ textTransform: 'none' }}>
              Copy tất cả
            </Button>
            <Button onClick={exportTxt} variant='outlined' size='small' startIcon={<Download size={15} />} sx={{ textTransform: 'none' }}>
              Tải .txt
            </Button>
          </>
        )}
        <Button onClick={onClose} variant='contained' sx={{ color: '#fff' }}>Đóng</Button>
      </DialogActions>
    </Dialog>
  )
}
