import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import useAxiosAuth from '@/hocs/useAxiosAuth'

interface RenewInfo {
  can_renew: boolean
  reason?: string
  renewal_duration_mode?: 'custom' | 'original'
  original_duration?: number
  item_count?: number
  pricing_mode?: 'fixed' | 'per_unit'
  prices?: Record<string, number> // { "1": 100, "7": 650, "30": 2500 } — giá per unit per duration
  per_unit?: {
    price_per_unit: number
    time_unit: 'day' | 'month'
    discount_tiers: Array<{ min: string; max: string; discount: string }>
  }
}

export const useRenewInfo = (orderId: number | null) => {
  const axiosAuth = useAxiosAuth()

  return useQuery<RenewInfo>({
    queryKey: ['renew-info', orderId],
    queryFn: async () => {
      const res = await axiosAuth.get(`/renew-info/${orderId}`)

      return res?.data?.data ?? { can_renew: false }
    },
    enabled: !!orderId,
    staleTime: 30_000,
  })
}

interface RenewPayload {
  order_id: number
  duration: number
  item_keys?: string[]
}

export const useRenewOrder = () => {
  const axiosAuth = useAxiosAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: RenewPayload) => {
      const res = await axiosAuth.post('/renew', payload)

      return res?.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userOrders'] })
      queryClient.invalidateQueries({ queryKey: ['orderApiKeys'] })
      queryClient.invalidateQueries({ queryKey: ['orderProxyStatic'] })
      queryClient.invalidateQueries({ queryKey: ['profile'] })
    }
  })
}

// Admin: hoàn tiền 1 lần gia hạn
export const useRenewalRefund = () => {
  const axiosAuth = useAxiosAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ historyId, reason }: { historyId: number; reason?: string }) => {
      const res = await axiosAuth.post('/admin/renewal-refund', {
        history_id: historyId,
        reason,
      })

      return res?.data
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['orderHistories'] })
      queryClient.invalidateQueries({ queryKey: ['userOrders'] })
      queryClient.invalidateQueries({ queryKey: ['profile'] })
    }
  })
}

// Admin: xác nhận gia hạn thành công (NCC đã xử lý OK dù hệ thống báo timeout)
export const useRenewalConfirm = () => {
  const axiosAuth = useAxiosAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ historyId, newExpiredAt }: { historyId: number; newExpiredAt?: string }) => {
      const res = await axiosAuth.post('/admin/renewal-confirm', {
        history_id: historyId,
        new_expired_at: newExpiredAt,
      })

      return res?.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orderHistories'] })
      queryClient.invalidateQueries({ queryKey: ['userOrders'] })
    }
  })
}

// Admin: xác nhận mua hàng thành công (timeout/fail nhưng NCC đã xử lý)
export const useOrderConfirm = () => {
  const axiosAuth = useAxiosAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ orderId, providerOrderCode }: { orderId: number; providerOrderCode?: string }) => {
      const res = await axiosAuth.post('/admin/order-confirm', {
        order_id: orderId,
        provider_order_code: providerOrderCode,
      })

      return res?.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userOrders'] })
      queryClient.invalidateQueries({ queryKey: ['orderApiKeys'] })
      queryClient.invalidateQueries({ queryKey: ['orderProxyStatic'] })
    }
  })
}

// Admin: log chi tiết per item per history
export interface HistoryLogItem {
  history_id: number
  order_id: number
  item_key: string | null
  action: string
  message: string
  status_code: number | null
  request: any
  response: string | null
  duration_ms: number | null
  context: any
  created_at: string
}

export const useOrderHistoryLogs = (historyId: number | null) => {
  const axiosAuth = useAxiosAuth()

  return useQuery<HistoryLogItem[]>({
    queryKey: ['orderHistoryLogs', historyId],
    queryFn: async () => {
      const res = await axiosAuth.get(`/admin/order-history-logs/${historyId}`)

      return res?.data?.data ?? []
    },
    enabled: !!historyId,
    staleTime: 30_000,
  })
}
