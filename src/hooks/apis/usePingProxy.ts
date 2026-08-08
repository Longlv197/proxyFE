import { useMutation } from '@tanstack/react-query'
import useAxiosAuth from '@/hocs/useAxiosAuth'

interface PingResult {
  /** IP thoát THẬT đo được qua proxy. */
  origin_ip: string
  latency_ms: number
  pinged_at: string
}

export const usePingProxy = () => {
  const axiosAuth = useAxiosAuth()

  return useMutation<PingResult, Error, string>({
    mutationFn: async (proxyString: string) => {
      const res = await axiosAuth.post('/proxy/ping', { proxy_string: proxyString })
      return res.data?.data
    },
  })
}
