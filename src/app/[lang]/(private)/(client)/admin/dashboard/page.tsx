'use client'

import { useState } from 'react'

import DateRangeFilter from '@/views/Client/Admin/Dashboard/DateRangeFilter'
import ProfitHero from '@/views/Client/Admin/Dashboard/ProfitHero'
import SystemBalancesRow from '@/views/Client/Admin/Dashboard/SystemBalancesRow'
import TrendCharts from '@/views/Client/Admin/Dashboard/TrendCharts'
import OrdersDepositsRow from '@/views/Client/Admin/Dashboard/OrdersDepositsRow'
import ProviderBreakdown from '@/views/Client/Admin/Dashboard/PartnerBreakdown'
import ReconciliationCard from '@/views/Client/Admin/Dashboard/ReconciliationHero'
import OrderStatusReport from '@/views/Client/Admin/Dashboard/OrderStatusReport'
import { useFinancialReport, type FinancialReportData } from '@/hooks/apis/useFinancialReport'
import { useBranding } from '@/app/contexts/BrandingContext'

export default function DashboardPage() {
  const { isChild } = useBranding()
  const [filterParams, setFilterParams] = useState<{ start?: string; end?: string }>({})
  const { data: apiData, isFetching, isLoading } = useFinancialReport(filterParams)

  const data = apiData as FinancialReportData | null

  if (isLoading) {
    return (
      <div className='space-y-4'>
        <DateRangeFilter onFilterChange={setFilterParams} />
        <div className='flex items-center justify-center py-20 text-gray-500'>Đang tải dữ liệu...</div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className='space-y-4'>
        <DateRangeFilter onFilterChange={setFilterParams} />
        <div className='flex items-center justify-center py-20 text-gray-500'>Chưa có dữ liệu báo cáo.</div>
      </div>
    )
  }

  return (
    <div className='space-y-4 relative'>
      {/* 1. Bộ lọc thời gian — luôn visible, không bị dim */}
      <DateRangeFilter onFilterChange={setFilterParams} />

      {/* Nội dung dashboard — dim khi đang fetch để user thấy đang cập nhật */}
      <div className={`space-y-4 transition-opacity duration-300 ${isFetching ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
        {/* 2. Tổng quan: Lãi/lỗ + breakdown + dự kiến */}
        <ProfitHero revenue={data.revenue} periodDays={data.period_days} />

        {/* 2b. Số dư hệ thống hiện tại (snapshot, không theo bộ lọc) */}
        <SystemBalancesRow balances={data.balances} />

        {/* 3. Biểu đồ xu hướng: Doanh thu + Nạp tiền theo ngày */}
        <TrendCharts data={data.daily_trend} />

        {/* 4. Chi tiết: Đơn hàng + Dòng tiền + Chỉ số */}
        <OrdersDepositsRow
          orders={data.orders}
          deposits={data.deposits}
          revenue={data.revenue}
          periodDays={data.period_days}
        />

        {/* 5. Hiệu suất theo nhà cung cấp — chỉ site mẹ */}
        {!isChild && <ProviderBreakdown data={data.provider_breakdown} />}

        {/* 6. Đối soát tài chính */}
        <ReconciliationCard filterStart={filterParams.start} filterEnd={filterParams.end} />

        {/* 7. Bảng chi tiết đơn hàng */}
        <OrderStatusReport filterStart={filterParams.start} filterEnd={filterParams.end} />
      </div>
    </div>
  )
}
