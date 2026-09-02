'use client'

import { Building2 } from 'lucide-react'

import { formatCurrency, formatNumber } from '@/utils/formatters'
import {
  formatPercent,
  profitBadgeClass,
  HINT_MARGIN,
  HINT_MARKUP,
  LABEL_MARGIN_SHORT,
  LABEL_MARKUP_SHORT
} from '@/utils/profitMetrics'
import type { ProviderBreakdownItem } from '@/hooks/apis/useFinancialReport'

interface ProviderBreakdownProps {
  data: ProviderBreakdownItem[]
}

export default function ProviderBreakdown({ data }: ProviderBreakdownProps) {
  if (!data || data.length === 0) return null

  return (
    <div className='bg-white rounded-xl p-4 shadow-md border border-gray-100'>
      <h3 className='text-sm font-bold text-gray-800 uppercase tracking-wide mb-3 flex items-center gap-2'>
        <Building2 size={16} className='text-indigo-500' />
        Hiệu Suất Theo Nhà Cung Cấp
      </h3>
      <div className='overflow-x-auto'>
        <table className='w-full text-sm'>
          <thead>
            <tr className='border-b border-gray-200'>
              <th className='text-left py-2 px-2 text-xs font-semibold text-gray-500 uppercase'>Nhà cung cấp</th>
              <th className='text-right py-2 px-2 text-xs font-semibold text-gray-500 uppercase'>Đơn hàng</th>
              <th className='text-right py-2 px-2 text-xs font-semibold text-gray-500 uppercase'>Doanh thu</th>
              <th className='text-right py-2 px-2 text-xs font-semibold text-gray-500 uppercase'>Chi phí</th>
              <th className='text-right py-2 px-2 text-xs font-semibold text-gray-500 uppercase'>Lợi nhuận</th>
              <th className='text-right py-2 px-2 text-xs font-semibold text-gray-500 uppercase' title={HINT_MARKUP}>
                {LABEL_MARKUP_SHORT}
              </th>
              <th className='text-right py-2 px-2 text-xs font-semibold text-gray-500 uppercase' title={HINT_MARGIN}>
                {LABEL_MARGIN_SHORT}
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((provider) => (
              <tr key={provider.provider_id} className='border-b border-gray-50 hover:bg-gray-50'>
                <td className='py-2 px-2 font-medium text-gray-800'>{provider.provider_name}</td>
                <td className='py-2 px-2 text-right text-gray-600'>{formatNumber(provider.order_count)}</td>
                <td className='py-2 px-2 text-right text-blue-600 font-medium'>{formatCurrency(provider.total_amount)}</td>
                <td className='py-2 px-2 text-right text-red-600'>{formatCurrency(provider.cost_actual)}</td>
                <td className={`py-2 px-2 text-right font-semibold ${provider.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(provider.profit)}
                </td>
                <td className='py-2 px-2 text-right'>
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${profitBadgeClass(provider.markup_percent)}`}
                  >
                    {formatPercent(provider.markup_percent)}
                  </span>
                </td>
                <td className='py-2 px-2 text-right'>
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${profitBadgeClass(provider.margin_percent)}`}
                  >
                    {formatPercent(provider.margin_percent)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
