'use client'

import { useSelector } from 'react-redux'
import { useSession } from 'next-auth/react'
import { Wallet } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'

import type { RootState } from '@/store'
import { useTienTe } from '@/app/contexts/TienTeContext'

interface BalanceCardClientProps {
  isWalletVisible: boolean
  isInitialLoad: boolean
  initialBalance: number
}

export default function BalanceCardClient({ isWalletVisible, isInitialLoad }: BalanceCardClientProps) {
  const { status } = useSession()
  const { sodu } = useSelector((state: RootState) => state.user)
  const { tienTe, hien } = useTienTe()

  // Ẩn balance card khi chưa đăng nhập
  if (status !== 'authenticated') return null

  // VNĐ: giữ kiểu cũ (số + "đ" nhỏ). USD/CNY: chuỗi đã có ký hiệu ($, ¥).
  const formatted = tienTe === 'VND' ? new Intl.NumberFormat('vi-VN').format(sodu ?? 0) : hien(sodu ?? 0)

  return (
    <>
      <AnimatePresence>
        {isWalletVisible && (
          <motion.div
            initial={isInitialLoad ? { opacity: 1, maxHeight: 200 } : { opacity: 0, maxHeight: 0 }}
            animate={{ opacity: 1, maxHeight: 200 }}
            exit={{ opacity: 0, maxHeight: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            style={{ overflow: 'hidden', padding: '0 1.25rem' }}
          >
            <div className='flex items-center gap-2.5 py-2.5 cursor-default select-none'>
              {/* Icon with brand accent */}
              <div
                className='w-9 h-9 rounded-xl flex items-center justify-center shrink-0'
                style={{ background: 'rgba(252, 67, 54, 0.08)' }}
              >
                <Wallet className='w-[18px] h-[18px]' style={{ color: '#FC4336' }} />
              </div>

              {/* Label + Amount */}
              <div className='min-w-0'>
                <div className='text-[11px] font-medium text-slate-400 leading-none mb-1'>Số dư</div>
                <div className='text-[15px] font-bold text-slate-700 tracking-tight leading-none'>
                  {formatted}
                  {tienTe === 'VND' && <span className='text-[11px] font-semibold text-slate-400 ml-0.5'>đ</span>}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
