import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import useAxiosAuth from '@/hocs/useAxiosAuth'

export interface ConfigVersion {
  id: string
  _id: string // fallback MongoDB
  model_type: string // type_services, providers, settings
  model_id: string | number | null
  model_name: string
  version: number
  action: 'created' | 'updated' | 'deleted' | 'reverted'
  snapshot: Record<string, any> | null
  changes: Record<string, { old: any; new: any }> | null
  description: string
  reverted_from?: number
  reverted_to?: number
  user_id: number
  user_name: string
  created_at: string
}

export interface ConfigVersionModel {
  model_type: string
  model_id: string | number | null
  model_name: string
  last_updated: string
  total_versions: number
}

export interface ConfigVersionMeta {
  current_page: number
  last_page: number
  per_page: number
  total: number
}

export const useConfigVersions = (params: {
  model_type?: string
  model_id?: string | number
  page?: number
  per_page?: number
}) => {
  const axiosAuth = useAxiosAuth()

  return useQuery({
    queryKey: ['config-versions', params],
    queryFn: async () => {
      const searchParams = new URLSearchParams()

      if (params.model_type) searchParams.set('model_type', params.model_type)
      if (params.model_id) searchParams.set('model_id', String(params.model_id))
      if (params.page) searchParams.set('page', String(params.page))
      if (params.per_page) searchParams.set('per_page', String(params.per_page))

      const res = await axiosAuth.get(`/admin/config-versions?${searchParams}`)

      return {
        data: (res?.data?.data ?? []) as ConfigVersion[],
        meta: (res?.data?.meta ?? { current_page: 1, last_page: 1, per_page: 20, total: 0 }) as ConfigVersionMeta
      }
    },
    staleTime: 0
  })
}

export const useConfigVersionDetail = (id: string | null) => {
  const axiosAuth = useAxiosAuth()

  return useQuery({
    queryKey: ['config-version-detail', id],
    queryFn: async () => {
      const res = await axiosAuth.get(`/admin/config-versions/${id}`)

      return {
        data: res?.data?.data as ConfigVersion,
        current: res?.data?.current as Record<string, any> | null
      }
    },
    enabled: !!id,
    staleTime: 0
  })
}

export const useConfigVersionModels = () => {
  const axiosAuth = useAxiosAuth()

  return useQuery({
    queryKey: ['config-version-models'],
    queryFn: async () => {
      const res = await axiosAuth.get('/admin/config-versions/models')

      return (res?.data?.data ?? []) as ConfigVersionModel[]
    },
    staleTime: 60 * 1000
  })
}

export const useRevertConfigVersion = () => {
  const axiosAuth = useAxiosAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await axiosAuth.post(`/admin/config-versions/${id}/revert`)

      return res?.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['config-versions'] })
      queryClient.invalidateQueries({ queryKey: ['config-version-detail'] })
      queryClient.invalidateQueries({ queryKey: ['config-version-models'] })
      // Refresh data bảng ngoài (provider/service type đã bị revert)
      queryClient.invalidateQueries({ queryKey: ['providers'] })
      queryClient.invalidateQueries({ queryKey: ['serviceTypes'] })
    }
  })
}
