'use client'

import { Wallet, Coins } from 'lucide-react'

import KPICard from '@/components/UI/KPICard'
import type { FinancialReportData } from '@/hooks/apis/useFinancialReport'

interface SystemBalancesRowProps {
  balances?: FinancialReportData['balances']
}

export default function SystemBalancesRow({ balances }: SystemBalancesRowProps) {
  return (
    <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
      <div>
        <KPICard
          label='Tổng số dư người dùng (hiện tại)'
          value={balances?.total_balance ?? 0}
          icon={<Wallet size={24} />}
          color='blue'
        />
        <div className='mt-1 px-2 text-xs text-gray-500'>
          Tổng tiền user đang giữ trong ví chính — không phụ thuộc bộ lọc thời gian.
        </div>
      </div>

      <div>
        <KPICard
          label='Tổng số dư affiliate (hiện tại)'
          value={balances?.total_affiliate_balance ?? 0}
          icon={<Coins size={24} />}
          color='gray'
        />
        <div className='mt-1 px-2 text-xs text-gray-500'>
          Tổng số dư hoa hồng affiliate toàn hệ thống — không phụ thuộc bộ lọc thời gian.
        </div>
      </div>
    </div>
  )
}
