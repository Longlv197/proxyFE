import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useDispatch } from 'react-redux'

import useAxiosAuth from '@/hocs/useAxiosAuth'
import { setUser } from '@/store/userSlice'

export type KhoanTrongBill = {
  transaction_id: string
  coin: string
  so_coin_nhan: string
  usdt_quy_doi: string
  ty_gia: number
  vnd_quy_doi: number
  vnd_da_cong: number | null
  trang_thai: 'pending' | 'credited' | 'ignored'
  ly_do_cho: string | null
  luc: string
  luc_cong: string | null

  /** Đường cộng tiền: tự động / khách dán mã GD / admin duyệt. */
  cach_cong: 'scanner' | 'user_claim' | 'admin' | null

  // Chỉ có ở màn admin
  id?: number
  ghi_chu_khach?: string | null
  nguoi_gui?: string | null
  binance_id_nguoi_gui?: string | null
  nguon?: string
}

/**
 * Bill nạp Binance Pay — đủ 3 con số anh Long yêu cầu:
 * `usdt_muon_nap` (muốn nạp) · `da_cong.so_coin_nhan` (coin thực nhận) · `da_cong.usdt_quy_doi` + `vnd_da_cong` (thực cộng).
 */
export type BillNapBinance = {
  id: number
  code: string
  ghi_chu: string
  trang_thai: 'open' | 'expired' | 'mismatch' | 'completed' | 'cancelled'
  usdt_muon_nap: string
  ty_gia: number
  vnd_du_kien: number
  het_han_luc: string | null
  tao_luc: string
  xong_luc: string | null
  chenh_lech_usdt: number | null
  da_cong: KhoanTrongBill | null
  cac_khoan: KhoanTrongBill[]
  khach?: { id: number; name?: string; email?: string }
}

const lamMoiSoDu = (axiosAuth: ReturnType<typeof useAxiosAuth>, dispatch: ReturnType<typeof useDispatch>) => {
  // Số dư nằm ở REDUX, không phải TanStack Query → phải gọi lại /me (xem useBinanceClaims).
  axiosAuth
    .post('/me')
    .then(r => {
      if (r?.data) dispatch(setUser(r.data))
    })
    .catch(() => {})
}

/** Gọi khi biết chắc tiền vừa vào ví (bill vừa chuyển sang "completed"). */
export const useLamMoiSoDu = () => {
  const axiosAuth = useAxiosAuth()
  const dispatch = useDispatch()

  return () => lamMoiSoDu(axiosAuth, dispatch)
}

/** Bill của chính khách. Còn bill chờ tiền thì tự hỏi lại 10 giây/lần để thấy tiền về. */
export const useBinanceBills = () => {
  const axiosAuth = useAxiosAuth()

  return useQuery({
    queryKey: ['binanceBills'],
    queryFn: async (): Promise<BillNapBinance[]> => {
      const res = await axiosAuth.get('/binance-bills')

      return res?.data?.data ?? []
    },
    refetchInterval: q => {
      const ds = (q.state.data as BillNapBinance[] | undefined) ?? []

      // "expired" = quá hạn giữ tỷ giá nhưng máy vẫn nhận tiền thêm 24h → vẫn phải theo dõi.
      const conNhan = (b: BillNapBinance) =>
        b.trang_thai === 'open' ||
        (b.trang_thai === 'expired' && !!b.het_han_luc && Date.now() - new Date(b.het_han_luc).getTime() < 24 * 3600 * 1000)

      return ds.some(conNhan) ? 10 * 1000 : false
    }
  })
}

export const useTaoBill = () => {
  const axiosAuth = useAxiosAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (amountUsdt: string): Promise<BillNapBinance> => {
      const res = await axiosAuth.post('/binance-bills', { amount_usdt: amountUsdt })

      return res?.data?.data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['binanceBills'] })
  })
}

export const useHuyBill = () => {
  const axiosAuth = useAxiosAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number) => (await axiosAuth.post(`/binance-bills/${id}/huy`))?.data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['binanceBills'] })
  })
}

/** Khách dán mã giao dịch Binance cho bill (lệch số tiền / quên ghi chú). */
export const useXacNhanBill = () => {
  const axiosAuth = useAxiosAuth()
  const queryClient = useQueryClient()
  const dispatch = useDispatch()

  return useMutation({
    mutationFn: async (bien: { id: number; transactionId: string }) =>
      (await axiosAuth.post(`/binance-bills/${bien.id}/xac-nhan`, { transaction_id: bien.transactionId }))?.data,
    onSuccess: res => {
      queryClient.invalidateQueries({ queryKey: ['binanceBills'] })
      if (!res?.da_cong) return
      lamMoiSoDu(axiosAuth, dispatch)
      queryClient.invalidateQueries({ queryKey: ['depositHistory'] })
      queryClient.invalidateQueries({ queryKey: ['getTransactionHistory'] })
    }
  })
}

/** Admin: danh sách bill. */
export const useAdminBinanceBills = (status: string, q: string) => {
  const axiosAuth = useAxiosAuth()

  return useQuery({
    queryKey: ['adminBinanceBills', status, q],
    queryFn: async (): Promise<{ data: BillNapBinance[]; dem: { lech: number } }> => {
      const res = await axiosAuth.get('/admin/binance-bills', { params: { status: status === 'all' ? '' : status, q } })

      return { data: res?.data?.data ?? [], dem: res?.data?.dem ?? { lech: 0 } }
    },
    staleTime: 15 * 1000
  })
}
