import { useQuery } from '@tanstack/react-query'

import useAxiosAuth from '@/hocs/useAxiosAuth'

export type PaymentMethod = {
  code: 'bank_qr' | 'binance_pay' | 'usdt_bep20'
  label: string
  available: boolean
  reason: string | null
}

/**
 * Cách nạp tiền khách được dùng. Máy chủ quyết định theo quốc gia IP — FE chỉ vẽ lại.
 * Không tự đoán ở FE: ẩn nút không phải là chặn.
 */
export const usePaymentMethods = () => {
  const axiosAuth = useAxiosAuth()

  return useQuery({
    queryKey: ['paymentMethods'],
    queryFn: async (): Promise<PaymentMethod[]> => {
      const res = await axiosAuth.get('/payment-methods')

      return res?.data?.data?.methods ?? []
    },
    staleTime: 5 * 60 * 1000
  })
}
