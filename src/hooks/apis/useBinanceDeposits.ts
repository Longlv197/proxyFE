import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import useAxiosAuth from '@/hocs/useAxiosAuth'

export type KhoanNapBinance = {
  id: number
  transaction_id: string
  amount_usdt: string
  currency: string
  gross_vnd: number
  credited_vnd: number | null
  rate_vnd: number
  note: string | null
  payer_name: string | null
  payer_binance_id: string | null
  status: 'pending' | 'credited' | 'ignored'
  reason: 'no_note' | 'below_min' | null
  source: 'scanner' | 'user_claim' | 'admin'
  chu_he_thong_biet: { id: number; name: string; email: string } | null
  nguoi_xin_nhan: { id: number; name: string; email: string } | null
  /** MÃ GIAO DỊCH khách khai — bằng chứng sở hữu (chỉ người đã chuyển tiền mới biết). */
  bang_chung_khach: string | null
  /**
   * Kết quả đối chiếu. Nay chỉ còn `khop` (khai đúng mã) hoặc `null` (chưa ai khai).
   * `lech`/`khong_ro` là của bản cũ đối chiếu theo TÊN tài khoản — đã bỏ vì Binance che
   * tên nên ai gõ "Tran" cũng "khớp". Giữ trong kiểu để đọc được dữ liệu cũ nếu có.
   */
  ket_qua_so: 'khop' | 'lech' | 'khong_ro' | null
  luc: string
  luc_xin: string | null
  luc_cong: string | null
  lich_su: Array<Record<string, any>>
}

export const useBinanceDeposits = (status: 'pending' | 'credited' | 'ignored' | 'all' = 'pending') => {
  const axiosAuth = useAxiosAuth()

  return useQuery({
    queryKey: ['binanceDeposits', status],
    queryFn: async (): Promise<{ data: KhoanNapBinance[]; dem: { dang_cho: number; khach_dang_xin: number } }> => {
      const res = await axiosAuth.get('/admin/binance-deposits', { params: { status } })

      return {
        data: res?.data?.data ?? [],
        dem: res?.data?.dem ?? { dang_cho: 0, khach_dang_xin: 0 }
      }
    },
    staleTime: 15 * 1000
  })
}

export type KhachTimDuoc = { id: number; name: string; email: string; sodu: number }

/**
 * Tìm khách để admin TỰ GÁN khoản tiền không ai nhận — theo ID, email hoặc tên.
 *
 * Dùng đường riêng chứ không dùng `admin/users`: chỗ đó không tìm được theo ID và trả về
 * cả số đơn/số người giới thiệu — quá nặng cho một ô gợi ý.
 */
export const useTimKhach = (tuKhoa: string) => {
  const axiosAuth = useAxiosAuth()
  const q = tuKhoa.trim()

  return useQuery({
    queryKey: ['timKhachNapBinance', q],
    // Khớp đúng luật máy chủ: tên/email cần >= 2 ký tự, nhưng ID thì 1 chữ số cũng được.
    enabled: q.length >= 2 || /^\d+$/.test(q),
    queryFn: async (): Promise<KhachTimDuoc[]> => {
      const res = await axiosAuth.get('/admin/binance-deposits/tim-khach', { params: { q } })

      return res?.data?.data ?? []
    },
    staleTime: 10 * 1000
  })
}

/** Ba hành động của admin. Mọi hành động đều làm mất hiệu lực cache để số đếm cập nhật. */
export const useHanhDongKhoanNap = () => {
  const axiosAuth = useAxiosAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (bien: {
      id: number
      hanhDong: 'duyet' | 'tu-choi' | 'bo-qua'
      userId?: number
      ghiChu?: string
    }) => {
      const res = await axiosAuth.post(`/admin/binance-deposits/${bien.id}/${bien.hanhDong}`, {
        user_id: bien.userId,
        ghi_chu: bien.ghiChu
      })

      return res?.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['binanceDeposits'] })
    }
  })
}
