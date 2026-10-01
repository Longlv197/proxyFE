import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import useAxiosAuth from '@/hocs/useAxiosAuth'

/**
 * Khoản tiền Binance chưa có chủ, cho khách tự nhận.
 *
 * ⚠ Máy chủ CHỈ trả số tiền + giờ — không trả tên người gửi, ghi chú hay mã giao dịch
 * (đó là thông tin của người khác). Đừng thêm field vào đây mà không sửa máy chủ: thêm
 * ở FE cũng không có dữ liệu, mà sửa máy chủ để trả thêm là làm lộ thông tin khách khác.
 */
export type KhoanChuaCoChu = {
  id: number
  amount_usdt: string
  luc: string
}

export type DonXinCuaToi = {
  id: number
  amount_usdt: string
  luc_xin: string | null
  trang_thai: 'dang_cho' | 'da_cong' | 'tu_choi'
}

export const useBinanceClaims = (batDauTai = true) => {
  const axiosAuth = useAxiosAuth()

  return useQuery({
    queryKey: ['binanceClaims'],
    enabled: batDauTai,
    queryFn: async (): Promise<{ khoAnChuaCoChu: KhoanChuaCoChu[]; donXinCuaToi: DonXinCuaToi[] }> => {
      const res = await axiosAuth.get('/binance-claims')

      return {
        khoAnChuaCoChu: res?.data?.data?.kho_an_chua_co_chu ?? [],
        donXinCuaToi: res?.data?.data?.don_xin_cua_toi ?? []
      }
    },
    staleTime: 30 * 1000
  })
}

export const useXinNhanKhoan = () => {
  const axiosAuth = useAxiosAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (bien: { depositId: number; binanceTen: string }) => {
      const res = await axiosAuth.post('/binance-claims', {
        deposit_id: bien.depositId,
        binance_ten: bien.binanceTen
      })

      return res?.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['binanceClaims'] })
    }
  })
}
