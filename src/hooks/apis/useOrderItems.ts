import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import useAxiosAuth from '@/hocs/useAxiosAuth'

export interface OrderItemRecord {
  _id: string
  key: string
  order_id: number
  user_id: number
  service_type_id: number
  type: 'ROTATING' | 'STATIC'
  status: number // 0=active, 1=inactive, 2=expired
  protocol: string
  proxy?: Record<string, any>
  ip_whitelist?: string[]
  expired_at?: string
  created_at?: string
  order_code?: string
  provider_key?: string
  provider_order_code?: string
  next_rotate_seconds?: number
}

interface OrderItemsMeta {
  total: number
  page: number
  limit: number
  last_page: number
}

export interface OrderItemsResponse {
  data: OrderItemRecord[]
  meta: OrderItemsMeta
}

export interface OrderItemsParams {
  page?: number
  limit?: number
  type?: string
  status?: string
  search?: string
  user_id?: number
}

export const useOrderItems = (params: OrderItemsParams, isAdmin = false, enabled = true) => {
  const axiosAuth = useAxiosAuth()
  const endpoint = isAdmin ? '/admin/order-items' : '/order-items'

  return useQuery<OrderItemsResponse>({
    queryKey: ['orderItems', isAdmin, params],
    queryFn: async () => {
      const res = await axiosAuth.get(endpoint, { params })
      return { data: res?.data?.data ?? [], meta: res?.data?.meta ?? { total: 0, page: 1, limit: 100, last_page: 1 } }
    },
    enabled,
    staleTime: 15_000,
  })
}

export const useUnlockRotate = () => {
  const axiosAuth = useAxiosAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (key: string) => {
      const res = await axiosAuth.post(`/admin/order-items/${key}/unlock-rotate`)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orderItems'] })
    },
  })
}

export const useUpdateOrderItem = () => {
  const axiosAuth = useAxiosAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ key, data }: { key: string; data: Record<string, any> }) => {
      const res = await axiosAuth.post(`/admin/update-item/${key}`, data)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orderItems'] })
      queryClient.invalidateQueries({ queryKey: ['apiKeys'] })
    },
  })
}

export const useUpdateIpWhitelist = () => {
  const axiosAuth = useAxiosAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ key, ip_whitelist }: { key: string; ip_whitelist: string[] }) => {
      const res = await axiosAuth.put(`/order-items/${key}/ip-whitelist`, { ip_whitelist })
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orderItems'] })
    },
  })
}
