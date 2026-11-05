import { useQuery } from '@tanstack/react-query'

import useAxiosAuth from '@/hocs/useAxiosAuth'
import type { KetLuanLog } from '@/components/LogKetLuan'
import type { ThongTinNhapMaDon } from '@/components/NutNhapMaDonNcc'

export interface OrderLog {
  _id: string
  order_id: number
  order_code: string
  user_id: number
  action: string
  from_status: number | null
  to_status: number | null
  provider_code: string | null
  proxy_type: string | null
  retry_count: number | null
  message: string | null
  http_status: number | null
  request_body: any
  response_body: string | null
  duration_ms: number | null
  context: any
  ket_luan?: KetLuanLog
  nhap_ma_don?: ThongTinNhapMaDon
  created_at: string
}

export const useOrderLogs = (orderId?: number | string, enabled = true) => {
  const axiosAuth = useAxiosAuth()

  return useQuery<OrderLog[]>({
    queryKey: ['orderLogs', orderId],
    queryFn: async () => {
      const res = await axiosAuth.get(`/admin/order-logs/${orderId}`)

      return res?.data?.data ?? []
    },
    enabled: !!orderId && enabled,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false
  })
}
