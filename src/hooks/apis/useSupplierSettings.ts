import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import useAxiosAuth from '@/hocs/useAxiosAuth'

export interface SupplierSettings {
  provider_api_url: string | null
  provider_api_key: string | null
  // backward compat
  supplier_api_url: string | null
  supplier_api_key: string | null
  configured: boolean
}

export const useProviderSettings = () => {
  const axiosAuth = useAxiosAuth()

  return useQuery({
    queryKey: ['supplierSettings'],
    queryFn: async () => {
      const res = await axiosAuth.get('/admin/supplier-settings')

      return (res?.data?.data ?? {}) as SupplierSettings
    },
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false
  })
}

export const useupdateProviderSettings = () => {
  const axiosAuth = useAxiosAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: {
      provider_api_url: string
      provider_api_key: string
    }) => {
      const res = await axiosAuth.post('/admin/update-supplier-settings', data)

      return res?.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplierSettings'] })
    }
  })
}
