import { useQuery , useMutation, useQueryClient } from '@tanstack/react-query'

import useAxiosAuth from '@/hocs/useAxiosAuth'

export const useOrders = () => {
  const axiosAuth = useAxiosAuth()

  return useQuery({
    queryKey: ['orderProxyStatic'],
    queryFn: async () => {
      const res = await axiosAuth.get('/transaction-history')

      
return res?.data?.data ?? []
    },
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false
  })
}

export const useApiKeys = (order_id?: string | number, enabled: boolean = true) => {
  const axiosAuth = useAxiosAuth()

  return useQuery({
    queryKey: ['orderApiKeys', order_id],
    queryFn: async () => {
      const res = await axiosAuth.get(`/get-key-proxy/${order_id}`)

      // MongoDB order_items trước, fallback MySQL api_keys
      const items = res?.data?.data_mongo ?? res?.data?.data ?? []
      // _data_field: tên field chứa dữ liệu sản phẩm chính (default "proxy")
      // Gắn vào array để backward compat (consumer cũ dùng như array bình thường)
      ;(items as any)._dataField = res?.data?._data_field || 'proxy'
      return items
    },
    enabled: !!order_id && enabled,
    refetchOnWindowFocus: false,
    staleTime: 30 * 1000
  })
}

export const useCancelOrder = () => {
  const axiosAuth = useAxiosAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ orderId, refundAmount }: { orderId: number; refundAmount?: number }) => {
      const res = await axiosAuth.post(`/cancel-order/${orderId}`, {
        refund_amount: refundAmount,
      })

      return res?.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orderProxyStatic'] })
      queryClient.invalidateQueries({ queryKey: ['userOrders'] })
      queryClient.invalidateQueries({ queryKey: ['adminTransactionHistory'] })
    }
  })
}

// Hook để gửi lại đơn hàng
export const useResendOrder = () => {
  const axiosAuth = useAxiosAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (orderId: number) => {
      const res = await axiosAuth.post(`/resend-order/${orderId}`)


return res?.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orderProxyStatic'] })
      queryClient.invalidateQueries({ queryKey: ['userOrders'] })
      queryClient.invalidateQueries({ queryKey: ['adminTransactionHistory'] })
    }
  })
}

// Hook admin thêm proxy thủ công vào đơn thiếu
export const useFillProxies = () => {
  const axiosAuth = useAxiosAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ orderId, lines }: { orderId: number; lines: string[] }) => {
      const res = await axiosAuth.post(`/admin/fill-proxies/${orderId}`, { lines })

      return res?.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminOrders'] })
      queryClient.invalidateQueries({ queryKey: ['partialOrders'] })
    }
  })
}

// Hook admin sửa proxy 1 item
export const useUpdateItem = () => {
  const axiosAuth = useAxiosAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ itemKey, proxyString, providerKey }: { itemKey: string; proxyString?: string; providerKey?: string }) => {
      const res = await axiosAuth.post(`/admin/update-item/${itemKey}`, {
        ...(proxyString !== undefined ? { proxy_string: proxyString } : {}),
        ...(providerKey !== undefined ? { provider_key: providerKey } : {}),
      })

      return res?.data
    },
    onSuccess: (result, variables) => {
      const updated = result?.data
      if (updated) {
        // Patch tại chỗ — không invalidate để giữ pagination TanStack Table
        queryClient.setQueriesData({ queryKey: ['orderApiKeys'] }, (old: any) => {
          if (!Array.isArray(old)) return old
          const idx = old.findIndex((it: any) => (it.key || it.api_key) === variables.itemKey)
          if (idx === -1) return old
          const next = [...old]
          next[idx] = { ...old[idx], ...updated }
          ;(next as any)._dataField = (old as any)._dataField
          return next
        })
      } else {
        queryClient.invalidateQueries({ queryKey: ['orderApiKeys'] })
      }
      queryClient.invalidateQueries({ queryKey: ['adminOrders'] })
    }
  })
}

// Hook admin chỉnh sửa đơn hàng (MySQL Order)
export const useUpdateOrder = () => {
  const axiosAuth = useAxiosAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ orderId, data }: { orderId: number; data: Record<string, any> }) => {
      const res = await axiosAuth.put(`/admin/orders/${orderId}`, data)

      return res?.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orderProxyStatic'] })
      queryClient.invalidateQueries({ queryKey: ['userOrders'] })
      queryClient.invalidateQueries({ queryKey: ['adminTransactionHistory'] })
      queryClient.invalidateQueries({ queryKey: ['adminOrders'] })
    }
  })
}

// Hook để xóa đơn hàng
export const useDeleteOrder = () => {
  const axiosAuth = useAxiosAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (orderId: number) => {
      const res = await axiosAuth.delete(`/orders/${orderId}`)

      
return res?.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orderProxyStatic'] })
      queryClient.invalidateQueries({ queryKey: ['userOrders'] })
    }
  })
}
