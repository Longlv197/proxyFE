import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useDispatch } from 'react-redux'

import useAxiosAuth from '@/hocs/useAxiosAuth'
import { setUser } from '@/store/userSlice'

export type DonXinCuaToi = {
  id: number
  amount_usdt: string
  luc_xin: string | null
  trang_thai: 'dang_cho' | 'da_cong' | 'tu_choi'
}

/**
 * Các lần khách này đã khai mã giao dịch.
 *
 * ⚠ KHÔNG có hook liệt kê "khoản chưa có chủ". Bản đầu có, và nó phải phơi số tiền + giờ
 * của khách khác. Bằng chứng nay là MÃ GIAO DỊCH — chỉ người đã chuyển tiền mới biết — nên
 * danh sách đó vừa thừa vừa là chỗ lộ. Đừng thêm lại.
 */
export const useBinanceClaims = (batDauTai = true) => {
  const axiosAuth = useAxiosAuth()

  return useQuery({
    queryKey: ['binanceClaims'],
    enabled: batDauTai,
    queryFn: async (): Promise<{ donXinCuaToi: DonXinCuaToi[] }> => {
      const res = await axiosAuth.get('/binance-claims')

      return { donXinCuaToi: res?.data?.data?.don_xin_cua_toi ?? [] }
    },
    staleTime: 30 * 1000
  })
}

/**
 * Khai mã giao dịch. Đủ mức nạp tối thiểu thì máy chủ cộng tiền NGAY (`da_cong = true`);
 * dưới mức thì để chờ admin duyệt.
 */
export const useXinNhanKhoan = () => {
  const axiosAuth = useAxiosAuth()
  const queryClient = useQueryClient()
  const dispatch = useDispatch()

  return useMutation({
    mutationFn: async (bien: { transactionId: string }) => {
      const res = await axiosAuth.post('/binance-claims', { transaction_id: bien.transactionId })

      return res?.data
    },
    onSuccess: res => {
      queryClient.invalidateQueries({ queryKey: ['binanceClaims'] })

      // Chỉ làm mới số dư khi THẬT SỰ có tiền vào ví.
      if (!res?.da_cong) return

      // ⚠ Số dư nằm ở REDUX (`state.user.sodu`), KHÔNG phải TanStack Query — nên
      // `invalidateQueries` không chạm tới nó. Phải nạp lại `/me` rồi `setUser`, đúng khuôn
      // luồng nạp bank đang dùng. Thiếu bước này thì tiền đã vào ví mà màn hình vẫn hiện số
      // cũ → khách tưởng chưa nhận được và đi khai lại.
      axiosAuth
        .post('/me')
        .then(r => {
          if (r?.data) dispatch(setUser(r.data))
        })
        .catch(() => {})

      queryClient.invalidateQueries({ queryKey: ['depositHistory'] })
      queryClient.invalidateQueries({ queryKey: ['getTransactionHistory'] })
    }
  })
}
