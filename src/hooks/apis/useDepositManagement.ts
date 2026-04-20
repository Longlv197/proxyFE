import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

import useAxiosAuth from '@/hocs/useAxiosAuth'
import { useTabVisible } from '@/hooks/useTabVisible'

// ── Types ──

export interface AdminDepositsParams {
  status?: string
  deposit_type?: string
  search?: string
  start?: string
  end?: string
  page?: number
  per_page?: number
}

export interface InvestigateStep {
  step: number
  key: string
  label: string
  status: 'pass' | 'fail' | 'skip' | 'pending'
  detail: string
  timestamp: string | null
  data: Record<string, any> | null
}

export interface GemAuditOrder {
  id: number
  order_code: string
  status: string
  quantity: number
  total_amount: number
  service_type_id: number
  created_at: string | null
}

export interface GemInfo {
  buy_token: string | null
  token_status: 'ready' | 'consumed_or_expired' | 'not_paid_yet' | 'redis_error' | 'unknown'
  token_ttl: number | null
  deposit_code: string
  deposit_amount: number
  purchases_count: number
  orders: GemAuditOrder[]
  activity_log: Array<Record<string, any>>
}

export interface InvestigateResult {
  checklist: InvestigateStep[]
  diagnosis: {
    overall: 'pass' | 'fail'
    failed_at_step: number | null
    suggestion: string | null
  }
  context: {
    bank_auto: any
    transaction_bank: any
    user: any
  }
  gem_info: GemInfo | null
}

// ── Hooks ──

/**
 * Tab 2: Danh sách lệnh nạp tiền (bank_auto) cho admin.
 */
export const useAdminDeposits = (params: AdminDepositsParams = {}, enabled = true) => {
  const axiosAuth = useAxiosAuth()
  const isTabVisible = useTabVisible()

  return useQuery({
    queryKey: ['adminDeposits', params],
    queryFn: async () => {
      const res = await axiosAuth.get('/admin/deposit-management/deposits', {
        params: Object.fromEntries(
          Object.entries(params).filter(([, v]) => v !== '' && v !== undefined)
        )
      })

      return res?.data
    },
    enabled,
    staleTime: 10 * 1000,
    refetchOnWindowFocus: true,
    refetchInterval: (query) => {
      if (!isTabVisible) return false
      const records = query.state.data?.data

      if (!Array.isArray(records)) return false

      const hasPending = records.some((r: any) => r.status === 'pending')

      return hasPending ? 10000 : false
    }
  })
}

/**
 * Chuỗi bằng chứng điều tra nạp tiền — 6 bước.
 */
export const useInvestigateFull = (
  source: 'transaction_bank' | 'bank_auto' | null,
  id: number | null
) => {
  const axiosAuth = useAxiosAuth()

  return useQuery<InvestigateResult>({
    queryKey: ['investigateFull', source, id],
    queryFn: async () => {
      const res = await axiosAuth.get('/admin/deposit-management/investigate', {
        params: { source, id }
      })

      return res?.data?.data
    },
    enabled: !!source && !!id,
    staleTime: 0,
    refetchOnWindowFocus: false
  })
}

/**
 * Bỏ qua GD (spam/không liên quan).
 */
export const useDismissTransaction = () => {
  const axiosAuth = useAxiosAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason?: string }) => {
      const res = await axiosAuth.post(`/admin/transaction-bank/${id}/dismiss`, { reason })

      return res?.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactionBank'] })
      queryClient.invalidateQueries({ queryKey: ['transactionBankSummary'] })
    }
  })
}

/**
 * Admin: Kích hoạt lệnh nạp tiền (expired/pending → success).
 * Cộng tiền cho user + ghi audit.
 */
export const useAdminCreditDeposit = () => {
  const axiosAuth = useAxiosAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, adminNote }: { id: number; adminNote?: string }) => {
      const res = await axiosAuth.post(`/admin/bank-auto/${id}/credit`, {
        admin_note: adminNote,
      })

      return res?.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminDeposits'] })
      queryClient.invalidateQueries({ queryKey: ['transactionBank'] })
    }
  })
}

/**
 * Hủy bỏ qua GD.
 */
export const useUndismissTransaction = () => {
  const axiosAuth = useAxiosAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number) => {
      const res = await axiosAuth.post(`/admin/transaction-bank/${id}/undismiss`)

      return res?.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactionBank'] })
      queryClient.invalidateQueries({ queryKey: ['transactionBankSummary'] })
    }
  })
}
