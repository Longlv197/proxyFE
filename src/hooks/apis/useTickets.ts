import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

import useAxiosAuth from '@/hocs/useAxiosAuth'

// ─── User hooks ────────────────────────────────────────

export const useMyTickets = () => {
  const axiosAuth = useAxiosAuth()

  return useQuery({
    queryKey: ['myTickets'],
    queryFn: async () => {
      const res = await axiosAuth.get('/support-tickets')

      
return res.data.data
    },
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false
  })
}

export const useCreateTicket = () => {
  const axiosAuth = useAxiosAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: FormData) => {
      const res = await axiosAuth.post('/support-tickets', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myTickets'] })
    }
  })
}

export const useUserReply = () => {
  const axiosAuth = useAxiosAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ ticketId, data }: { ticketId: number; data: FormData }) => {
      const res = await axiosAuth.post(`/support-tickets/${ticketId}/reply`, data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myTickets'] })
      queryClient.invalidateQueries({ queryKey: ['adminTickets'] })
    }
  })
}

export const useAdminReply = () => {
  const axiosAuth = useAxiosAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ ticketId, data }: { ticketId: number; data: FormData }) => {
      const res = await axiosAuth.post(`/admin/support-tickets/${ticketId}/reply`, data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminTickets'] })
      queryClient.invalidateQueries({ queryKey: ['myTickets'] })
    }
  })
}

export const useMyDeposits = () => {
  const axiosAuth = useAxiosAuth()

  return useQuery({
    queryKey: ['myDeposits'],
    queryFn: async () => {
      const res = await axiosAuth.get('/my-deposits')

      return res.data.data
    },
    staleTime: 60 * 1000,
  })
}

// ─── Admin hooks ───────────────────────────────────────

export const useAdminTickets = (params?: { status?: string; type?: string }) => {
  const axiosAuth = useAxiosAuth()

  return useQuery({
    queryKey: ['adminTickets', params],
    queryFn: async () => {
      const res = await axiosAuth.get('/admin/support-tickets', { params })

      
return res.data.data
    },
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false
  })
}

export const usePartialOrders = () => {
  const axiosAuth = useAxiosAuth()

  return useQuery({
    queryKey: ['partialOrders'],
    queryFn: async () => {
      const res = await axiosAuth.get('/admin/partial-orders')

      
return res.data.data
    },
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false
  })
}

export const useRetryPartial = () => {
  const axiosAuth = useAxiosAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (orderId: number) => {
      const res = await axiosAuth.post(`/admin/retry-partial/${orderId}`)

      
return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partialOrders'] })
      queryClient.invalidateQueries({ queryKey: ['adminTickets'] })
    }
  })
}

export const useRetryOrder = () => {
  const axiosAuth = useAxiosAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (orderId: number) => {
      const res = await axiosAuth.post(`/admin/retry-order/${orderId}`)

      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminOrders'] })
      queryClient.invalidateQueries({ queryKey: ['partialOrders'] })
    }
  })
}

export const useRetryFetch = () => {
  const axiosAuth = useAxiosAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (orderId: number) => {
      const res = await axiosAuth.post('/admin/retry-fetch', { order_id: orderId })

      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminOrders'] })
      queryClient.invalidateQueries({ queryKey: ['orderDetail'] })
    }
  })
}

export const useRefundPartial = () => {
  const axiosAuth = useAxiosAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (orderId: number) => {
      const res = await axiosAuth.post(`/admin/refund-partial/${orderId}`)

      
return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partialOrders'] })
      queryClient.invalidateQueries({ queryKey: ['adminTickets'] })
    }
  })
}

export const useResolveTicket = () => {
  const axiosAuth = useAxiosAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, admin_note, status }: { id: number; admin_note: string; status?: number }) => {
      const res = await axiosAuth.post(`/admin/support-tickets/${id}/resolve`, { admin_note, status })

      
return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminTickets'] })
    }
  })
}

export const useUpdateTicketStatus = () => {
  const axiosAuth = useAxiosAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, status }: { id: number; status: number }) => {
      const res = await axiosAuth.post(`/admin/support-tickets/${id}/status`, { status })

      
return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminTickets'] })
    }
  })
}

export const useMarkTicketViewed = () => {
  const axiosAuth = useAxiosAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number) => {
      const res = await axiosAuth.post(`/admin/support-tickets/${id}/view`)

      
return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminTickets'] })
    }
  })
}

// ─── Order Logs (MongoDB) ─────────────────────────────

export const useOrderLogs = (orderId: number | null) => {
  const axiosAuth = useAxiosAuth()

  return useQuery({
    queryKey: ['orderLogs', orderId],
    queryFn: async () => {
      const res = await axiosAuth.get(`/admin/order-logs/${orderId}`)

      
return res.data.data
    },
    enabled: !!orderId,
    staleTime: 30 * 1000,
  })
}

export const useAssignTicket = () => {
  const axiosAuth = useAxiosAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, assigned_to }: { id: number; assigned_to: number }) => {
      const res = await axiosAuth.post(`/admin/support-tickets/${id}/assign`, { assigned_to })

      
return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminTickets'] })
    }
  })
}
