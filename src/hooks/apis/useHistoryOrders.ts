import { keepPreviousData, useQuery } from '@tanstack/react-query'

import useAxiosAuth from '@/hocs/useAxiosAuth'
import { useTabVisible } from '@/hooks/useTabVisible'

// Status đang chờ xử lý — cần polling. Khớp `TRANG_THAI_DANG_CHO` bên BE (OrderController).
const PENDING_STATUSES = [0, 1, 9, 10]

export interface HistoryOrdersMeta {
  total: number
  page: number
  limit: number
  last_page: number
  /** Số đơn đang chờ trên TOÀN BỘ danh sách (không chỉ trang hiện tại) — dùng cho banner + polling */
  pending_count: number
}

interface Params {
  search?: string
  /** '' hoặc 'all' = không lọc */
  status?: string
  page: number
  limit: number
}

/**
 * Danh sách đơn — PHÂN TRANG PHÍA SERVER.
 *
 * Trước đây tải HẾT đơn về rồi lọc/phân trang ở trình duyệt: tài khoản 8.538 đơn phải tải
 * **8,92 MB / 3,4 giây mỗi lần mở trang**. Nay server chỉ gửi đúng số dòng đang hiện.
 *
 * Vì đã phân trang phía server nên **lọc trạng thái cũng phải chuyển sang server** — lọc ở trình
 * duyệt sẽ chỉ lọc trong trang hiện tại, ra kết quả sai.
 *
 * `pending_count` do server đếm trên toàn bộ danh sách: banner "N đơn đang chờ" và việc tự làm mới
 * KHÔNG được nhìn mỗi trang hiện tại, không thì đang ở trang 3 sẽ tưởng hết đơn chờ.
 */
export const useHistoryOrders = ({ search, status, page, limit }: Params) => {
  const axiosAuth = useAxiosAuth()
  const isTabVisible = useTabVisible()

  return useQuery({
    queryKey: ['userOrders', search ?? '', status ?? 'all', page, limit],
    queryFn: async () => {
      const res = await axiosAuth.get('/get-order', {
        params: {
          page,
          limit,
          ...(search ? { search } : {}),
          ...(status && status !== 'all' ? { status } : {})
        }
      })

      return {
        rows: (res.data?.data ?? []) as any[],
        meta: (res.data?.meta ?? { total: 0, page, limit, last_page: 1, pending_count: 0 }) as HistoryOrdersMeta
      }
    },
    // Giữ dữ liệu trang cũ khi đổi trang → bảng không nháy trắng rồi vẽ lại
    placeholderData: keepPreviousData,
    staleTime: 5 * 1000,
    refetchOnWindowFocus: true,
    refetchInterval: query => {
      if (!isTabVisible) return false

      return (query.state.data?.meta?.pending_count ?? 0) > 0 ? 5000 : false
    }
  })
}

export { PENDING_STATUSES }
