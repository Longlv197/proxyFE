import { useQuery } from '@tanstack/react-query'

import useAxiosAuth from '@/hocs/useAxiosAuth'

export type PaymentMethod = {
  code: 'bank_qr' | 'binance_pay' | 'usdt_bep20' | 'manual'
  label: string
  available: boolean
  reason: string | null

  /** Chỉ có ở `manual`: lời nhắn admin viết ở Cài đặt → Thanh toán. */
  note?: string
}

/**
 * Cách nạp tiền khách được dùng. Máy chủ quyết định theo công tắc admin + quốc gia IP,
 * và CHỈ trả cách đang dùng được — FE chỉ vẽ lại.
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

/**
 * Ghi chú khách phải điền khi chuyển tiền crypto, ví dụ `mktproxy 1234`.
 *
 * MÁY CHỦ GHÉP SẴN cả mã khách — FE không tự ghép. Máy chủ biết chắc ai đang gọi, còn
 * FE ghép thì chỉ cần lấy sai mã khách là tiền chạy vào ví người khác.
 */
export const useDepositNote = () => {
  const axiosAuth = useAxiosAuth()

  return useQuery({
    queryKey: ['paymentDepositNote'],
    queryFn: async (): Promise<string> => {
      const res = await axiosAuth.get('/payment-methods')

      return res?.data?.data?.deposit_note ?? ''
    },
    staleTime: 5 * 60 * 1000
  })
}
