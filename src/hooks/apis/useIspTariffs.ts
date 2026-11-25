import { useState } from 'react'

import { useQuery, useQueryClient } from '@tanstack/react-query'

import useAxiosAuth from '@/hocs/useAxiosAuth'

export type IspTariffLive = {
  tariff_id: number
  plan_id: number | null
  name: string
  ports: number
  period: number
  price_usd: number | null
}

type IspTariffsResult = { data: IspTariffLive[]; source: 'live' | 'cache' | 'snapshot' }

/**
 * Bảng giá gói proxy tĩnh ISP lấy TRỰC TIẾP từ NCC (BE cache 10 phút) — form SP admin.
 * `source`: 'live' | 'cache' (lấy NCC) · 'snapshot' (NCC lỗi → bản chụp api_config.isp_tariffs).
 * `refreshFresh()` bỏ qua cache BE (nút "Làm mới").
 */
export const useIspTariffs = (providerId?: string | number | null, enabled: boolean = true) => {
  const axiosAuth = useAxiosAuth()
  const queryClient = useQueryClient()
  const [refreshing, setRefreshing] = useState(false)
  const queryKey = ['ispTariffs', providerId]

  const fetchTariffs = async (fresh: boolean): Promise<IspTariffsResult> => {
    const res = await axiosAuth.get(`/admin/isp-providers/${providerId}/tariffs`, { params: fresh ? { fresh: 1 } : undefined })

    return { data: res?.data?.data ?? [], source: res?.data?.source ?? 'snapshot' }
  }

  const query = useQuery({
    queryKey,
    queryFn: () => fetchTariffs(false),
    enabled: !!providerId && enabled,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false
  })

  const refreshFresh = async () => {
    if (!providerId) return
    setRefreshing(true)

    try {
      queryClient.setQueryData(queryKey, await fetchTariffs(true))
    } finally {
      setRefreshing(false)
    }
  }

  return { ...query, refreshFresh, refreshing }
}
