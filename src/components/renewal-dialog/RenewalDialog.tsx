'use client'

import React, { useState } from 'react'

import { RefreshCw, Loader, CheckCircle, AlertTriangle } from 'lucide-react'
import { toast } from 'react-toastify'
import { useDispatch, useSelector } from 'react-redux'

import { setBalance } from '@/store/userSlice'
import type { AppDispatch, RootState } from '@/store'
import { useRenewOrder } from '@/hooks/apis/useRenewal'
import { useTienTe } from '@/app/contexts/TienTeContext'

import '../checkout-modal/styles.css'

interface RenewalDialogProps {
  open: boolean
  onClose: () => void
  orderId: number
  orderCode: string
  productName: string
  itemCount: number
  selectedItemKeys?: string[]
  currentExpiry?: string
  priceOptions: Array<{ key: string; label: string; price: number }>
  pricingMode?: 'fixed' | 'per_unit'
  pricePerUnit?: number
  timeUnit?: 'day' | 'month'
  renewalDurationMode?: 'custom' | 'original'
  originalDuration?: number
}

const RenewalDialog: React.FC<RenewalDialogProps> = ({
  open,
  onClose,
  orderId,
  orderCode,
  productName,
  itemCount,
  selectedItemKeys,
  currentExpiry,
  priceOptions,
  pricingMode = 'fixed',
  pricePerUnit = 0,
  timeUnit = 'day',
  renewalDurationMode = 'custom',
  originalDuration = 30,
}) => {
  const isOriginalMode = renewalDurationMode === 'original'
  const [selectedDuration, setSelectedDuration] = useState(
    isOriginalMode ? String(originalDuration) : (priceOptions[0]?.key || '30')
  )
  const [customDuration, setCustomDuration] = useState(isOriginalMode ? originalDuration : 30)

  const dispatch = useDispatch<AppDispatch>()
  const { sodu } = useSelector((state: RootState) => state.user)
  const { tienTe, hien } = useTienTe()
  const { mutate, isPending, isSuccess } = useRenewOrder()

  const isPerUnit = pricingMode === 'per_unit'
  const quantity = selectedItemKeys?.length || itemCount

  const activeDuration = isPerUnit ? customDuration : parseInt(selectedDuration) || 30
  const unitPrice = isPerUnit
    ? pricePerUnit * customDuration
    : (priceOptions.find(p => p.key === selectedDuration)?.price || 0)
  const total = unitPrice * quantity

  const handleRenew = () => {
    if (isPending || isSuccess) return

    if (sodu < total) {
      toast.error('Số dư không đủ để gia hạn.')
      return
    }

    mutate(
      {
        order_id: orderId,
        duration: activeDuration,
        item_keys: selectedItemKeys,
      },
      {
        onSuccess: (data) => {
          if (data?.success === false) {
            toast.error(data?.message || 'Lỗi gia hạn.')
          } else {
            if (data?.new_balance != null) dispatch(setBalance(data.new_balance))
            toast.success(data?.message || 'Gia hạn thành công!')
            setTimeout(() => onClose(), 2000)
          }
        },
        onError: (error: any) => {
          toast.error(error.response?.data?.message || 'Lỗi không xác định.')
        },
      }
    )
  }

  if (!open) return null

  return (
    <div className='checkout-overlay' onClick={() => !isPending && onClose()}>
      <div className='checkout-modal' onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className='checkout-header' style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' }}>
          <h2 className='checkout-title'>
            <RefreshCw size={20} />
            Gia Hạn Proxy
          </h2>
          <button type='button' className='checkout-close' onClick={onClose} disabled={isPending}>
            ×
          </button>
        </div>

        <div className='checkout-body'>
          <p className='checkout-product-name'>{productName}</p>

          {/* Info */}
          <div className='checkout-summary' style={{ marginBottom: 12 }}>
            <div className='summary-row'>
              <span className='summary-label'>Đơn hàng:</span>
              <span className='summary-value'>{orderCode}</span>
            </div>
            <div className='summary-row'>
              <span className='summary-label'>Số proxy gia hạn:</span>
              <span className='summary-value'>{quantity}</span>
            </div>
            {currentExpiry && (
              <div className='summary-row'>
                <span className='summary-label'>Hạn hiện tại:</span>
                <span className='summary-value'>{currentExpiry}</span>
              </div>
            )}
          </div>

          {/* Duration selector */}
          {isOriginalMode ? (
            <div className='checkout-section'>
              <label className='checkout-section-label'>THỜI HẠN GIA HẠN</label>
              <div style={{ padding: '10px 14px', background: '#eff6ff', borderRadius: 8, border: '1px solid #bfdbfe', fontSize: '13px', color: '#1d4ed8' }}>
                Gia hạn {originalDuration} {timeUnit === 'month' ? 'tháng' : 'ngày'} (theo lần mua đầu)
              </div>
            </div>
          ) : isPerUnit ? (
            <div className='checkout-section'>
              <label className='checkout-section-label'>
                {timeUnit === 'month' ? 'SỐ THÁNG GIA HẠN' : 'SỐ NGÀY GIA HẠN'}
              </label>
              <div className='perunit-input-row'>
                <div className='perunit-input-wrap'>
                  <input
                    type='number'
                    min={1}
                    max={365}
                    value={customDuration}
                    onChange={(e) => setCustomDuration(Math.max(1, parseInt(e.target.value) || 1))}
                    className='perunit-input'
                  />
                  <span className='perunit-input-unit'>{timeUnit === 'month' ? 'tháng' : 'ngày'}</span>
                </div>
                <span className='perunit-calc'>
                  = <strong>{hien(unitPrice)}</strong>/proxy
                </span>
              </div>
            </div>
          ) : (
            priceOptions.length > 0 && (
              <div className='checkout-section'>
                <label className='checkout-section-label'>THỜI HẠN GIA HẠN</label>
                <div className='checkout-duration-options'>
                  {priceOptions.map((option) => (
                    <label
                      key={option.key}
                      className={`checkout-duration-option ${selectedDuration === option.key ? 'active' : ''}`}
                    >
                      <input
                        type='radio'
                        value={option.key}
                        checked={selectedDuration === option.key}
                        onChange={() => setSelectedDuration(option.key)}
                      />
                      <span>{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )
          )}

          {/* Price table */}
          <div className='checkout-price-table'>
            <div className='price-table-header'>
              <span>Giá/proxy</span>
              <span>Số lượng</span>
              <span>Thành tiền</span>
            </div>
            <div className='price-table-row'>
              <span className='price-cell'>{hien(unitPrice)}</span>
              <span style={{ fontWeight: 600 }}>{quantity}</span>
              <span className='subtotal-cell'>{hien(total)}</span>
            </div>
          </div>

          {/* Balance warning */}
          {sodu < total && (
            <div className='checkout-warning'>
              <AlertTriangle size={16} />
              <span>Số dư không đủ. Cần thêm {hien(total - sodu)}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className='checkout-footer'>
          <div className='checkout-total'>
            <span className='total-text'>Tổng Cộng:</span>
            <span className='total-amount'>
              {hien(total)}
              {tienTe !== 'VND' && (
                <span style={{ display: 'block', fontSize: 12, fontWeight: 400, color: 'var(--mui-palette-text-secondary)' }}>
                  Trừ ví: {total.toLocaleString('vi-VN')}đ
                </span>
              )}
            </span>
          </div>
          <button
            type='button'
            className='checkout-pay-btn'
            onClick={isSuccess ? onClose : handleRenew}
            disabled={isPending || sodu < total}
            style={isSuccess ? { background: '#16a34a' } : { background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' }}
          >
            {isPending ? (
              <><Loader size={18} className='animate-pulse' /> Đang xử lý...</>
            ) : isSuccess ? (
              <><CheckCircle size={18} /> Gia hạn thành công</>
            ) : (
              <><RefreshCw size={18} /> Gia Hạn</>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default RenewalDialog
