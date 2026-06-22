import { useQuery } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'

import useAxiosAuth from '@/hocs/useAxiosAuth'

export interface DailyTrendItem {
  date: string
  revenue: number
  cost: number
  refunded: number
  profit: number
  orders: number
  deposits: number
  deposit_count: number
}

export interface OrderStatusItem {
  status: number
  label: string
  count: number
  total_amount: number
}

export interface ProviderBreakdownItem {
  provider_id: number
  provider_name: string
  order_count: number
  total_amount: number
  cost_actual: number
  profit: number
  margin_percent: number
}

export interface ReconciliationData {
  deposits_total: number
  deposit_auto: number
  deposit_manual: number
  deposit_auto_count: number
  deposit_manual_count: number
  affiliate: number
  purchases_total: number
  refunds: number
  refund_count: number
  balance_expected: number
  balance_actual: number
  diff: number
  is_balanced: boolean
  is_all_time: boolean
}

export interface FinancialReportData {
  period_days: number
  revenue: {
    confirmed: number
    expected: number
    refunded: number
    cost_actual: number
    affiliate_cost: number
    profit: number
    margin_percent: number
    expected_cost: number
    expected_affiliate: number
  }
  deposits: {
    deposit_auto: number
    deposit_auto_count: number
    deposit_manual: number
    deposit_manual_count: number
    payment_total: number
    payment_count: number
    refund_total: number
    refund_count: number
    affiliate_withdrawn: number
  }
  orders: {
    total: number
    by_status: OrderStatusItem[]
    buy: number
    renewal: number
  }
  provider_breakdown: ProviderBreakdownItem[]
  daily_trend: DailyTrendItem[]
  balances?: {
    total_balance: number
    total_affiliate_balance: number
  }
}

// ═══════════════════════════════════════════════════════
// Hooks
// ═══════════════════════════════════════════════════════

interface FinancialReportParams {
  start?: string // dd-mm-yyyy
  end?: string // dd-mm-yyyy
}

export const useFinancialReport = (params?: FinancialReportParams) => {
  const { data: session } = useSession() as any
  const axiosAuth = useAxiosAuth()

  return useQuery<FinancialReportData | null>({
    queryKey: ['financialReport', params?.start, params?.end],
    queryFn: async () => {
      const res = await axiosAuth.get('/admin/financial-report', { params })

      return res.data?.data ?? null
    },
    enabled: !!session?.access_token,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false
  })
}

export const useReconciliation = (params?: FinancialReportParams) => {
  const { data: session } = useSession() as any
  const axiosAuth = useAxiosAuth()

  return useQuery<ReconciliationData | null>({
    queryKey: ['reconciliation', params?.start, params?.end],
    queryFn: async () => {
      const res = await axiosAuth.get('/admin/reconciliation', { params })

      return res.data?.data ?? null
    },
    enabled: !!session?.access_token,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false
  })
}
