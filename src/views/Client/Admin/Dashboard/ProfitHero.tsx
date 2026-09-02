'use client'

import { TrendingUp, TrendingDown, DollarSign, Receipt, RefreshCw, Users, Clock, Info } from 'lucide-react'
import Tooltip from '@mui/material/Tooltip'

import { formatCurrency } from '@/utils/formatters'
import { formatPercent, HINT_MARGIN, HINT_MARKUP, LABEL_MARGIN, LABEL_MARKUP } from '@/utils/profitMetrics'
import type { FinancialReportData } from '@/hooks/apis/useFinancialReport'

interface ProfitHeroProps {
  revenue: FinancialReportData['revenue']
  periodDays: number
}

/** Tooltip icon nhỏ — hover để xem giải thích */
function Hint({ text }: { text: string }) {
  return (
    <Tooltip title={text} arrow placement='top'>
      <span style={{ cursor: 'help', opacity: 0.5, verticalAlign: 'middle' }}>
        <Info size={11} />
      </span>
    </Tooltip>
  )
}

export default function ProfitHero({ revenue, periodDays }: ProfitHeroProps) {
  const isProfitable = revenue.profit > 0

  const bgClass = isProfitable
    ? 'from-emerald-500 to-emerald-700'
    : 'from-red-500 to-red-700'

  const dailyProfit = Math.round(revenue.profit / periodDays)
  const dailyRevenue = Math.round(revenue.confirmed / periodDays)

  // Lợi nhuận dự kiến từ đơn đang hoạt động
  const expectedCost = revenue.expected_cost ?? 0
  const expectedAffiliate = revenue.expected_affiliate ?? 0
  const expectedProfit = revenue.expected > 0
    ? Math.round(revenue.expected - expectedCost - expectedAffiliate)
    : 0

  return (
    <div className={`bg-gradient-to-br ${bgClass} rounded-2xl p-6 shadow-xl text-white`}>
      {/* Status + Profit */}
      <div className='flex items-start justify-between mb-4'>
        <div>
          <div className='flex items-center gap-2 mb-1'>
            {isProfitable ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
            <span className='text-sm font-medium uppercase tracking-wider opacity-80'>
              {isProfitable ? 'Đang có lãi' : 'Đang lỗ'}
            </span>
            <Hint text='Lợi nhuận = Doanh thu hoàn thành − Hoàn tiền − Chi phí − Hoa hồng giới thiệu. Chỉ tính đơn hàng đã hết hạn (hoàn thành).' />
          </div>
          <div className='text-3xl font-bold'>
            {formatCurrency(Math.abs(revenue.profit))}
          </div>
          {/* Nền gradient màu nên giữ chữ trắng, không tô màu theo ngưỡng như các thẻ khác */}
          <div className='text-sm opacity-70 mt-1'>
            {LABEL_MARKUP}: <span className='font-semibold'>{formatPercent(revenue.markup_percent)}</span>{' '}
            <Hint text={HINT_MARKUP} />
          </div>
          <div className='text-sm opacity-70'>
            {LABEL_MARGIN}: <span className='font-semibold'>{formatPercent(revenue.margin_percent)}</span>{' '}
            <Hint text={HINT_MARGIN} /> · Trung bình: {formatCurrency(Math.abs(dailyProfit))}/ngày
          </div>
          {revenue.expected > 0 && (
            <div className='text-xs opacity-60 mt-1'>
              Đang hoạt động: {formatCurrency(revenue.expected)} → lãi dự kiến +{formatCurrency(expectedProfit)}{' '}
              <Hint text='Lãi dự kiến = Doanh thu đang hoạt động − Chi phí dự kiến − Hoa hồng dự kiến. Đây là đơn chưa hết hạn, khi hết hạn sẽ chuyển thành lợi nhuận thực tế.' />
            </div>
          )}
          {(revenue.confirmed > 0 || revenue.expected > 0) && (
            <div className='text-xs opacity-60 mt-0.5'>
              Tổng dự kiến: Doanh thu {formatCurrency(revenue.confirmed + revenue.expected)} · Chi phí {formatCurrency(revenue.cost_actual + expectedCost)} · Lãi {formatCurrency(revenue.profit + expectedProfit)}
            </div>
          )}
        </div>
        <div className='flex flex-col gap-2'>
          <div className='bg-white/15 rounded-xl px-4 py-3 text-right'>
            <div className='text-xs opacity-70'>
              Doanh thu hoàn thành <Hint text='Tổng tiền thu từ đơn hàng đã hết hạn (mua mới + gia hạn). Đơn đang dùng chưa tính vào đây.' />
            </div>
            <div className='text-xl font-bold'>{formatCurrency(revenue.confirmed)}</div>
            <div className='text-xs opacity-70'>Trung bình: {formatCurrency(dailyRevenue)}/ngày</div>
          </div>
          {expectedProfit > 0 && (
            <div className='bg-white/10 rounded-xl px-4 py-2 text-right'>
              <div className='text-xs opacity-70 flex items-center justify-end gap-1'>
                <Clock size={10} />
                Lợi nhuận dự kiến
              </div>
              <div className='text-lg font-bold text-yellow-200'>+{formatCurrency(expectedProfit)}</div>
            </div>
          )}
        </div>
      </div>

      {/* Breakdown */}
      <div className='grid grid-cols-5 gap-3'>
        <div className='bg-white/10 rounded-lg px-3 py-2'>
          <div className='flex items-center gap-1.5 text-xs opacity-70 mb-1'>
            <DollarSign size={12} />
            Doanh thu <Hint text='Tiền thu từ đơn hàng đã hoàn thành (hết hạn sử dụng)' />
          </div>
          <div className='font-semibold'>{formatCurrency(revenue.confirmed)}</div>
        </div>
        <div className='bg-white/10 rounded-lg px-3 py-2'>
          <div className='flex items-center gap-1.5 text-xs opacity-70 mb-1'>
            <Receipt size={12} />
            Chi phí <Hint text='Tiền trả cho nhà cung cấp proxy (chỉ tính đơn đã hoàn thành)' />
          </div>
          <div className='font-semibold'>{formatCurrency(revenue.cost_actual)}</div>
        </div>
        <div className='bg-white/10 rounded-lg px-3 py-2'>
          <div className='flex items-center gap-1.5 text-xs opacity-70 mb-1'>
            <RefreshCw size={12} />
            Đã hoàn tiền <Hint text='Tiền hoàn lại cho khách hàng khi đơn bị lỗi hoặc huỷ' />
          </div>
          <div className='font-semibold'>{formatCurrency(revenue.refunded)}</div>
        </div>
        <div className='bg-white/10 rounded-lg px-3 py-2'>
          <div className='flex items-center gap-1.5 text-xs opacity-70 mb-1'>
            <Users size={12} />
            Hoa hồng giới thiệu <Hint text={`Tiền thưởng cho người giới thiệu khách hàng mới (${Math.round((revenue.affiliate_cost / (revenue.confirmed || 1)) * 100)}% doanh thu)`} />
          </div>
          <div className='font-semibold'>{formatCurrency(revenue.affiliate_cost)}</div>
        </div>
        <div className='bg-white/10 rounded-lg px-3 py-2'>
          <div className='flex items-center gap-1.5 text-xs opacity-70 mb-1'>
            <Clock size={12} />
            Đang hoạt động <Hint text='Đơn hàng đang sử dụng, chưa hết hạn. Khi hết hạn sẽ chuyển thành doanh thu hoàn thành.' />
          </div>
          <div className='font-semibold text-yellow-200'>{formatCurrency(revenue.expected)}</div>
        </div>
      </div>
    </div>
  )
}
