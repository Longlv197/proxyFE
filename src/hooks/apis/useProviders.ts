import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'

import axios from 'axios'

import useAxiosAuth from '@/hocs/useAxiosAuth'

export const useProviders = (params?: { search?: string; status?: string }) => {
  const axiosAuth = useAxiosAuth()
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['providers', params?.search ?? '', params?.status ?? ''],
    queryFn: async () => {
      const searchParams = new URLSearchParams()

      if (params?.search) searchParams.set('search', params.search)
      if (params?.status) searchParams.set('status', params.status)

      const qs = searchParams.toString()
      const res = await axiosAuth.get(`/get-provider${qs ? `?${qs}` : ''}`)

      return res?.data?.data ?? res?.data ?? []
    },
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false
  })

  return {
    ...query,
    forceRefetch: () => queryClient.invalidateQueries({ queryKey: ['providers'] })
  }
}

// Hook để tạo mới nhà cung cấp
export const useCreateProvider = () => {
  const axiosAuth = useAxiosAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: any) => {
      const res = await axiosAuth.post('/add-provider', data)


return res?.data
    },
    onSuccess: () => {
      // Refresh lại danh sách providers sau khi tạo thành công
      queryClient.invalidateQueries({ queryKey: ['providers'] })
    }
  })
}

// Hook để cập nhật nhà cung cấp
export const useUpdateProvider = (providerId?: number) => {
  const axiosAuth = useAxiosAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: any) => {
      const res = await axiosAuth.post(`/edit-provider/${providerId}`, data)


return res?.data
    },
    onSuccess: () => {
      // Refresh lại danh sách providers sau khi cập nhật thành công
      queryClient.invalidateQueries({ queryKey: ['providers'] })
    }
  })
}

// Hook để xóa nhà cung cấp
export const useDeleteProvider = () => {
  const axiosAuth = useAxiosAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (providerId: number) => {
      const res = await axiosAuth.post(`/delete-provider/${providerId}`)


return res?.data
    },
    onSuccess: () => {
      // Refresh lại danh sách providers sau khi xóa thành công
      queryClient.invalidateQueries({ queryKey: ['providers'] })
    }
  })
}

// Hook để tạo QR code nạp tiền
export const useGenerateQrCode = () => {
  const axiosAuth = useAxiosAuth()

  return useMutation({
    mutationFn: async (data: { provider_code: string; amount: string | number }) => {
      const res = await axiosAuth.post('/create-topup-transaction', data)


return res?.data
    }
  })
}

// Hook để lấy lịch sử giao dịch nạp tiền của provider
export const useProviderTransactions = (providerId?: number | string, enabled: boolean = true) => {
  const axiosAuth = useAxiosAuth()

  return useQuery({
    queryKey: ['topupHistory', providerId],
    queryFn: async () => {
      if (!providerId) return []

      try {
        // Gọi API get-topup-history/{id} với path parameter
        const res = await axiosAuth.get(`/get-topup-history/${providerId}`, {
          timeout: 10000 // Timeout 10 giây
        })

        return res?.data?.data ?? res?.data ?? []
      } catch (error: any) {
        console.error('Error fetching topup history:', error)

        // Throw error để React Query có thể xử lý
        throw error
      }
    },
    enabled: enabled && !!providerId, // Chỉ gọi khi enabled và có providerId
    refetchOnMount: false, // Không refetch khi mount lại
    refetchOnWindowFocus: false, // Không refetch khi focus window
    staleTime: 5 * 60 * 1000, // Cache 5 phút
    retry: 1, // Chỉ retry 1 lần
    retryDelay: 1000
  })
}

// ─── HOOKS FOR PROVIDER STATISTICS & INVOICES (ADDED LATER) ───

// Hook lấy thống kê tổng hợp và trend của 1 provider
export const useProviderStatistics = (providerId?: number | string, dateFrom?: string, dateTo?: string, enabled: boolean = true) => {
  const axiosAuth = useAxiosAuth()

  return useQuery({
    queryKey: ['providerStatistics', providerId, dateFrom, dateTo],
    queryFn: async () => {
      if (!providerId) return null

      try {
        const params: any = {}
        if (dateFrom) params.date_from = dateFrom
        if (dateTo) params.date_to = dateTo

        const res = await axiosAuth.get(`/admin/provider-statistics/${providerId}`, { params })
        return res?.data?.data ?? null
      } catch (error) {
        console.error('Error fetching provider statistics:', error)
        throw error
      }
    },
    enabled: enabled && !!providerId,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000
  })
}

// Hook lấy danh sách hoá đơn của 1 provider
export const useProviderInvoices = (providerId?: number | string, params?: any, enabled: boolean = true) => {
  const axiosAuth = useAxiosAuth()

  return useQuery({
    queryKey: ['providerInvoices', providerId, params],
    queryFn: async () => {
      if (!providerId) return []

      try {
        const res = await axiosAuth.get(`/admin/provider-invoices`, { 
          params: { provider_id: providerId, ...params } 
        })
        // Phân trang hoặc array
        return res?.data?.data ?? []
      } catch (error) {
        console.error('Error fetching provider invoices:', error)
        throw error
      }
    },
    enabled: enabled && !!providerId,
    refetchOnWindowFocus: false,
    staleTime: 2 * 60 * 1000
  })
}

// Hook lấy summary hoá đơn của provider
export const useProviderInvoiceSummary = (providerId?: number | string, enabled: boolean = true) => {
  const axiosAuth = useAxiosAuth()

  return useQuery({
    queryKey: ['providerInvoiceSummary', providerId],
    queryFn: async () => {
      if (!providerId) return null

      try {
        const res = await axiosAuth.get(`/admin/provider-invoices/summary`, { 
          params: { provider_id: providerId } 
        })
        return res?.data?.data ?? null
      } catch (error) {
        console.error('Error fetching provider invoice summary:', error)
        throw error
      }
    },
    enabled: enabled && !!providerId,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000
  })
}

// Hook tạo hoá đơn
export const useCreateProviderInvoice = () => {
  const axiosAuth = useAxiosAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: any) => {
      const res = await axiosAuth.post('/admin/provider-invoices', data)
      return res?.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['providerInvoices', variables.provider_id] })
      queryClient.invalidateQueries({ queryKey: ['providerInvoiceSummary', variables.provider_id] })
    }
  })
}

// Hook thanh toán hoá đơn
export const usePayProviderInvoice = (providerId?: number | string) => {
  const axiosAuth = useAxiosAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string | number, data: any }) => {
      const res = await axiosAuth.put(`/admin/provider-invoices/${id}/pay`, data)
      return res?.data
    },
    onSuccess: () => {
      if (providerId) {
        queryClient.invalidateQueries({ queryKey: ['providerInvoices', providerId] })
        queryClient.invalidateQueries({ queryKey: ['providerInvoiceSummary', providerId] })
      } else {
        queryClient.invalidateQueries({ queryKey: ['providerInvoices'] })
      }
    }
  })
}
