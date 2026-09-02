'use client'

import { DollarSign, TrendingDown, TrendingUp, Wallet, Info } from 'lucide-react'
import Tooltip from '@mui/material/Tooltip'

import KPICard from '@/components/UI/KPICard'
import { formatCurrency, formatNumber } from '@/utils/formatters'
import {
  formatPercent,
  profitColor,
  HINT_MARGIN,
  HINT_MARKUP,
  LABEL_MARGIN,
  LABEL_MARKUP
} from '@/utils/profitMetrics'
import type { FinancialReportData } from '@/hooks/apis/useFinancialReport'

interface RevenueProfitCardsProps {
  revenue: FinancialReportData['revenue']
  deposits: FinancialReportData['deposits']
  periodDays: number
}

function Hint({ text }: { text: string }) {
  return (
    <Tooltip title={text} arrow placement='top'>
      <span style={{ cursor: 'help', opacity: 0.6, verticalAlign: 'middle', marginLeft: 2 }}>
        <Info size={11} />
      </span>
    </Tooltip>
  )
}

export default function RevenueProfitCards({ revenue, deposits, periodDays }: RevenueProfitCardsProps) {
  const fmt = (v: number) => new Intl.NumberFormat('vi-VN').format(Math.round(v))
  const totalDeposit = deposits.deposit_auto + deposits.deposit_manual
  const totalDepositCount = deposits.deposit_auto_count + deposits.deposit_manual_count
  const dailyDeposit = Math.round(totalDeposit / periodDays)
  const dailyDepositCount = Math.round(totalDepositCount / periodDays)

  return (
    <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3'>
      <div>
        <KPICard
          label='Doanh Thu Hoàn Thành'
          value={revenue.confirmed}
          icon={<DollarSign size={24} />}
          color='blue'
        />
        <div className='mt-1 px-2 text-xs text-gray-500'>
          Đang hoạt động: <span className='font-semibold text-blue-600'>{fmt(revenue.expected)} đ</span>
          <Hint text='Đơn hàng đang sử dụng, chưa hết hạn. Khi hết hạn sẽ cộng vào doanh thu hoàn thành.' />
          {revenue.refunded > 0 && (
            <span className='text-red-500 ml-1'>(hoàn: {fmt(revenue.refunded)} đ)</span>
          )}
        </div>
      </div>

      <div>
        <KPICard
          label='Chi Phí Thực Tế'
          value={revenue.cost_actual}
          icon={<TrendingDown size={24} />}
          color='red'
        />
        <div className='mt-1 px-2 text-xs text-gray-500'>
          Hoa hồng giới thiệu: <span className='font-semibold text-purple-600'>{fmt(revenue.affiliate_cost)} đ</span>
          <Hint text='Tiền thưởng cho người giới thiệu khách hàng. Chi phí này được trừ khi tính lợi nhuận.' />
        </div>
      </div>

      <div>
        <KPICard
          label='Lợi Nhuận'
          value={revenue.profit}
          icon={<TrendingUp size={24} />}
          color='green'
        />
        <div className='mt-1 px-2 text-xs text-gray-500'>
          <div>
            {LABEL_MARKUP}:{' '}
            <span className='font-semibold' style={{ color: profitColor(revenue.markup_percent) }}>
              {formatPercent(revenue.markup_percent)}
            </span>
            <Hint text={HINT_MARKUP} />
          </div>
          <div>
            {LABEL_MARGIN}:{' '}
            <span className='font-semibold' style={{ color: profitColor(revenue.margin_percent) }}>
              {formatPercent(revenue.margin_percent)}
            </span>
            <Hint text={HINT_MARGIN} />
            {' · '}Trung bình: {formatCurrency(Math.round(revenue.profit / periodDays))}/ngày
          </div>
        </div>
      </div>

      <div>
        <KPICard
          label='Tổng Nạp Tiền'
          value={totalDeposit}
          icon={<Wallet size={24} />}
          color='blue'
        />
        <div className='mt-1 px-2 text-xs text-gray-500'>
          {formatNumber(totalDepositCount)} giao dịch · Trung bình: {formatCurrency(dailyDeposit)}/ngày ({dailyDepositCount} lần/ngày)
        </div>
      </div>
    </div>
  )
}
