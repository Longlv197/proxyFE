'use client'

import React from 'react'

import { Alert, Button, IconButton, MenuItem, TextField } from '@mui/material'
import { Loader2, Save, Trash2 } from 'lucide-react'
import { toast } from 'react-toastify'

import type { BankSettings } from '@/hooks/apis/useBankSettings'
import type { BrandingSettings } from '@/hooks/apis/useBrandingSettings'

import { sectionDescSx, sectionTitleSx } from './shared'

const BANK_LIST = [
  { code: '970436', name: 'Vietcombank', shortName: 'VCB' },
  { code: '970415', name: 'VietinBank', shortName: 'CTG' },
  { code: '970418', name: 'BIDV', shortName: 'BIDV' },
  { code: '970422', name: 'MB Bank', shortName: 'MB' },
  { code: '970416', name: 'ACB', shortName: 'ACB' },
  { code: '970407', name: 'Techcombank', shortName: 'TCB' },
  { code: '970423', name: 'TPBank', shortName: 'TPB' },
  { code: '970432', name: 'VPBank', shortName: 'VPB' },
  { code: '970448', name: 'OCB', shortName: 'OCB' },
  { code: '970405', name: 'Agribank', shortName: 'AGR' },
  { code: '970403', name: 'Sacombank', shortName: 'STB' },
  { code: '970406', name: 'DongA Bank', shortName: 'DAB' },
  { code: '970441', name: 'VIB', shortName: 'VIB' },
  { code: '970443', name: 'SHB', shortName: 'SHB' },
  { code: '970431', name: 'Eximbank', shortName: 'EIB' },
  { code: '970426', name: 'MSB', shortName: 'MSB' },
  { code: '970454', name: 'Viet Capital Bank', shortName: 'BVB' },
  { code: '970449', name: 'LienVietPostBank', shortName: 'LPB' },
  { code: '970412', name: 'PVcomBank', shortName: 'PVC' },
  { code: '970429', name: 'SeABank', shortName: 'SSB' },
  { code: '970427', name: 'VietA Bank', shortName: 'VAB' },
  { code: '970433', name: 'VietBank', shortName: 'VBB' },
  { code: '970440', name: 'Nam A Bank', shortName: 'NAB' },
  { code: '970437', name: 'HDBank', shortName: 'HDB' },
  { code: '970424', name: 'Shinhan Bank', shortName: 'SHN' },
  { code: '970425', name: 'ABBANK', shortName: 'ABB' },
  { code: '970452', name: 'KienLong Bank', shortName: 'KLB' }
]

interface TabPaymentProps {
  branding: BrandingSettings
  updateBrandingField: (field: keyof BrandingSettings, value: any) => void
  bank: BankSettings
  setBank: React.Dispatch<React.SetStateAction<BankSettings>>
  updateBankMutation: any
  affiliatePercent: number
  setAffiliatePercent: (v: number) => void
  axiosAuth: any
}

const TabPayment = ({
  branding,
  updateBrandingField,
  bank,
  setBank,
  updateBankMutation
}: TabPaymentProps) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* ── Section 1: Ngân hàng nhận tiền ── */}
      <div>
        <h6 style={sectionTitleSx}>Ngân hàng nhận tiền</h6>
        <p style={sectionDescSx}>Thông tin ngân hàng hiển thị cho khách khi nạp tiền chuyển khoản</p>
      </div>
      <div style={{ display: 'flex', gap: 12 }}>
        <TextField
          size='small'
          select
          label='Ngân hàng'
          value={bank.bank_code || ''}
          onChange={e => {
            const selected = BANK_LIST.find(b => b.code === e.target.value)

            if (selected) {
              setBank(prev => ({ ...prev, bank_name: selected.name, bank_code: selected.code }))
            }
          }}
          required
          sx={{ flex: 1 }}
          helperText='Chọn ngân hàng nhận tiền'
        >
          <MenuItem value=''>
            <em>— Chọn ngân hàng —</em>
          </MenuItem>
          {BANK_LIST.map(b => (
            <MenuItem key={b.code} value={b.code}>
              {b.name} ({b.shortName})
            </MenuItem>
          ))}
        </TextField>
        <TextField
          size='small'
          label='Số tài khoản'
          value={bank.bank_number}
          onChange={e => setBank(prev => ({ ...prev, bank_number: e.target.value }))}
          placeholder='VD: 1234567890'
          required
          sx={{ flex: 1 }}
          helperText='Số tài khoản ngân hàng nhận tiền'
        />
      </div>
      <div style={{ display: 'flex', gap: 12 }}>
        <TextField
          size='small'
          label='Tên chủ tài khoản'
          value={bank.bank_account}
          onChange={e => setBank(prev => ({ ...prev, bank_account: e.target.value }))}
          placeholder='VD: NGUYEN VAN A'
          required
          sx={{ flex: 1 }}
          helperText='Viết IN HOA, không dấu — đúng như trên thẻ ngân hàng'
        />
      </div>
      <Button
        size='small'
        variant='contained'
        onClick={() => {
          if (!bank.bank_name || !bank.bank_number || !bank.bank_account) {
            toast.error('Vui lòng nhập đầy đủ tên ngân hàng, số tài khoản và chủ tài khoản')

            return
          }

          updateBankMutation.mutate(bank, {
            onSuccess: () => toast.success('Cập nhật ngân hàng thành công'),
            onError: (error: any) => toast.error(error?.response?.data?.message || 'Có lỗi xảy ra')
          })
        }}
        disabled={updateBankMutation.isPending}
        startIcon={
          updateBankMutation.isPending ? <Loader2 size={14} className='animate-spin' /> : <Save size={14} />
        }
        sx={{
          alignSelf: 'flex-start',
          textTransform: 'none',
          fontSize: '13px',
          color: '#fff',
          background: 'var(--primary-hover, #e63946)',
          '&:hover': { opacity: 0.9 }
        }}
      >
        {updateBankMutation.isPending ? 'Đang lưu...' : 'Lưu ngân hàng'}
      </Button>

      {/* ── Section 2: Cài đặt nạp tiền ── */}
      <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 20 }}>
        <h6 style={sectionTitleSx}>Cài đặt nạp tiền</h6>
        <p style={sectionDescSx}>
          Số tiền tối thiểu, mệnh giá gợi ý và thông báo khi khách tạo hoá đơn nạp tiền
        </p>
      </div>
      <div style={{ display: 'flex', gap: 12 }}>
        <TextField
          size='small'
          label='Số tiền tối thiểu (đ)'
          value={branding.deposit_min_amount || ''}
          onChange={e => updateBrandingField('deposit_min_amount', e.target.value.replace(/[^0-9]/g, ''))}
          placeholder='VD: 2000'
          sx={{ flex: 1 }}
          helperText='Khách không thể nạp dưới số này. Để trống = 2.000đ'
        />
      </div>
      <label
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: '13px',
          color: '#475569',
          cursor: 'pointer'
        }}
      >
        <input
          type='checkbox'
          checked={branding.deposit_notify_telegram === '1' || branding.deposit_notify_telegram === 'true'}
          onChange={e => updateBrandingField('deposit_notify_telegram', e.target.checked ? '1' : '0')}
          style={{ accentColor: 'var(--primary-color, #2092EC)' }}
        />
        Gửi thông báo Telegram khi khách tạo hoá đơn nạp tiền
      </label>
      <div>
        <div style={{ fontSize: '13px', fontWeight: 500, color: '#475569', marginBottom: 8 }}>
          Mệnh giá gợi ý (khách click nhanh)
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
          {(branding.deposit_preset_amounts || []).map((amt: number, idx: number) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '4px 10px',
                borderRadius: 6,
                border: '1px solid #e2e8f0',
                background: '#f8fafc'
              }}
            >
              <span style={{ fontSize: '13px' }}>{Number(amt).toLocaleString('vi-VN')}đ</span>
              <IconButton
                size='small'
                onClick={() => {
                  const updated = (branding.deposit_preset_amounts || []).filter(
                    (_: number, i: number) => i !== idx
                  )
                  updateBrandingField('deposit_preset_amounts', updated)
                }}
                sx={{ padding: '2px' }}
              >
                <Trash2 size={12} color='#ef4444' />
              </IconButton>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <TextField
            size='small'
            placeholder='Nhập mệnh giá (VD: 50000)'
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault()
                const input = e.target as HTMLInputElement
                const val = parseInt(input.value.replace(/[^0-9]/g, ''))
                if (val > 0) {
                  const current = branding.deposit_preset_amounts || []
                  if (!current.includes(val)) {
                    updateBrandingField(
                      'deposit_preset_amounts',
                      [...current, val].sort((a: number, b: number) => a - b)
                    )
                  }
                  input.value = ''
                }
              }
            }}
            sx={{ width: 200 }}
            helperText='Nhập số rồi Enter để thêm'
          />
        </div>
      </div>

      {/* ── Section 3: Pay2s ── */}
      <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 20 }}>
        <h6 style={sectionTitleSx}>Pay2s (nạp tiền tự động)</h6>
        <p style={sectionDescSx}>
          Token xác thực webhook từ pay2s.vn. Khi có giao dịch ngân hàng, pay2s gửi thông báo &rarr; hệ thống tự
          cộng tiền.
        </p>
      </div>
      <TextField
        size='small'
        label='Pay2s Webhook Token'
        value={branding.pay2s_webhook_token}
        onChange={e => updateBrandingField('pay2s_webhook_token', e.target.value)}
        placeholder='token từ pay2s.vn'
        fullWidth
        helperText='Lấy token từ trang quản trị pay2s.vn > Cài đặt webhook'
      />

      {/* ── Section 3: Telegram thông báo ── */}
      <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 20 }}>
        <h6 style={sectionTitleSx}>Telegram thông báo</h6>
        <p style={sectionDescSx}>Cấu hình bot Telegram để nhận thông báo tự động theo từng kênh</p>
      </div>

      {/* System channel */}
      <div
        style={{
          padding: 16,
          border: '1px solid #e2e8f0',
          borderRadius: 10,
          display: 'flex',
          flexDirection: 'column',
          gap: 12
        }}
      >
        <div>
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>Kênh Hệ thống</div>
          <div style={{ fontSize: '12px', color: '#94a3b8' }}>Thông báo hệ thống: đơn hàng mới, lỗi xử lý</div>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <TextField
            size='small'
            label='Bot Token'
            value={branding.telegram_bot_token_system}
            onChange={e => updateBrandingField('telegram_bot_token_system', e.target.value)}
            placeholder='123456:ABC-DEF...'
            sx={{ flex: 2 }}
          />
          <TextField
            size='small'
            label='Chat ID'
            value={branding.telegram_chat_id_system}
            onChange={e => updateBrandingField('telegram_chat_id_system', e.target.value)}
            placeholder='-1001234567890'
            sx={{ flex: 1 }}
          />
        </div>
      </div>

      {/* Deposit channel */}
      <div
        style={{
          padding: 16,
          border: '1px solid #e2e8f0',
          borderRadius: 10,
          display: 'flex',
          flexDirection: 'column',
          gap: 12
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>Kênh Nạp tiền</div>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                fontSize: '12px',
                color: '#64748b',
                cursor: 'pointer'
              }}
            >
              <input
                type='checkbox'
                checked={
                  branding.deposit_notify_telegram === '1' || branding.deposit_notify_telegram === 'true'
                }
                onChange={e => updateBrandingField('deposit_notify_telegram', e.target.checked ? '1' : '0')}
                style={{ accentColor: 'var(--primary-color, #2092EC)' }}
              />
              Gửi thông báo khi khách tạo bill nạp tiền
            </label>
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8' }}>
            Thông báo nạp tiền: khi khách tạo hoá đơn hoặc chuyển khoản thành công
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <TextField
            size='small'
            label='Bot Token'
            value={branding.telegram_bot_token_deposit}
            onChange={e => updateBrandingField('telegram_bot_token_deposit', e.target.value)}
            placeholder='123456:ABC-DEF...'
            sx={{ flex: 2 }}
          />
          <TextField
            size='small'
            label='Chat ID'
            value={branding.telegram_chat_id_deposit}
            onChange={e => updateBrandingField('telegram_chat_id_deposit', e.target.value)}
            placeholder='-1001234567890'
            sx={{ flex: 1 }}
          />
        </div>
      </div>

      {/* Error channel */}
      <div
        style={{
          padding: 16,
          border: '1px solid #e2e8f0',
          borderRadius: 10,
          display: 'flex',
          flexDirection: 'column',
          gap: 12
        }}
      >
        <div>
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>Kênh Lỗi</div>
          <div style={{ fontSize: '12px', color: '#94a3b8' }}>
            Thông báo lỗi: khi có lỗi API, lỗi xử lý đơn hàng
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <TextField
            size='small'
            label='Bot Token'
            value={branding.telegram_bot_token_error}
            onChange={e => updateBrandingField('telegram_bot_token_error', e.target.value)}
            placeholder='123456:ABC-DEF...'
            sx={{ flex: 2 }}
          />
          <TextField
            size='small'
            label='Chat ID'
            value={branding.telegram_chat_id_error}
            onChange={e => updateBrandingField('telegram_chat_id_error', e.target.value)}
            placeholder='-1001234567890'
            sx={{ flex: 1 }}
          />
        </div>
      </div>

      <Alert severity='info' sx={{ fontSize: '13px', '& .MuiAlert-message': { fontSize: '13px' } }}>
        Pay2s và Telegram lưu cùng nút &quot;Lưu cấu hình&quot; ở trên cùng. Ngân hàng lưu riêng bằng nút
        &quot;Lưu ngân hàng&quot;.
      </Alert>
    </div>
  )
}

export default TabPayment
