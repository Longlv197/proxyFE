import { useCallback } from 'react'

import useAxiosAuth from '@/hocs/useAxiosAuth'

/**
 * Kiểm tra proxy theo LÔ — dùng chung cho trang "Kiểm tra proxy" và nút lấy IP gốc ở chi tiết đơn.
 *
 * Trước đây hai màn hình này đều chạy TUẦN TỰ từng proxy một (trang kiểm tra xếp hàng 1 luồng,
 * chi tiết đơn lặp for + await) → 100 proxy mất 16–25 phút.
 *
 * Nay: mỗi lượt gửi một lô nhỏ, máy chủ chạy CẢ LÔ CÙNG LÚC nên một lượt tốn thời gian bằng
 * đúng con chậm nhất (trần 6 giây) chứ không phải tổng. Giao diện lặp cho hết danh sách và
 * nhận kết quả sau MỖI lô → thanh tiến trình nhúc nhích liên tục thay vì đứng im.
 */

/**
 * Số proxy mỗi lượt gọi. PHẢI khớp `ProxyCheckService::MAX_PER_BATCH` phía máy chủ —
 * gửi nhiều hơn sẽ bị trả 422. Sửa một bên thì sửa cả bên kia.
 */
export const PROXY_CHECK_BATCH_SIZE = 10

/** Các định dạng chuỗi proxy server hiểu được — phải KHỚP ProxyFormat::FLEXIBLE_FORMATS phía BE. */
export const PROXY_FORMATS = [
  { value: 'auto', label: 'Tự nhận (dán kiểu nào cũng thử)' },
  { value: 'host:port', label: 'host:port' },
  { value: 'host:port:user:pass', label: 'host:port:user:pass' },
  { value: 'user:pass@host:port', label: 'user:pass@host:port' },
  { value: 'host:port@user:pass', label: 'host:port@user:pass' },
  { value: 'user:pass:host:port', label: 'user:pass:host:port' }
] as const

export type ProxyFormatValue = (typeof PROXY_FORMATS)[number]['value']

export interface ProxyCheckItem {
  id: string | number
  proxy: string
  protocol?: 'http' | 'socks5'
}

export interface ProxyCheckResult {
  id: string | number
  status: 'success' | 'error'
  /** IP thoát THẬT đo được qua proxy (không phải host khách nhập). */
  exit_ip: string | null
  latency_ms: number
  message: string | null
  /** Máy chủ báo lại đã hiểu chuỗi theo dạng nào — để khách tự đối chiếu. */
  format?: string | null
}

/** Cờ huỷ — component tháo khỏi màn hình thì bật lên để vòng lặp dừng, khỏi setState vào chỗ đã chết. */
export interface CancelToken {
  cancelled: boolean
}

export const useProxyCheck = () => {
  const axiosAuth = useAxiosAuth()

  /**
   * Chia lô, gọi lần lượt từng lô, trả kết quả về ngay sau mỗi lô qua `onBatch`.
   * Một lô lỗi mạng KHÔNG làm hỏng cả danh sách — chỉ lô đó bị đánh dấu lỗi rồi chạy tiếp.
   */
  const checkAll = useCallback(
    async (
      items: ProxyCheckItem[],
      onBatch?: (results: ProxyCheckResult[]) => void,
      cancel?: CancelToken,
      format: ProxyFormatValue = 'auto'
    ): Promise<ProxyCheckResult[]> => {
      const all: ProxyCheckResult[] = []

      for (let i = 0; i < items.length; i += PROXY_CHECK_BATCH_SIZE) {
        if (cancel?.cancelled) break

        const chunk = items.slice(i, i + PROXY_CHECK_BATCH_SIZE)

        let out: ProxyCheckResult[]

        try {
          const res = await axiosAuth.post('/proxy/check-batch', { items: chunk, format })

          out = Array.isArray(res.data?.results) ? res.data.results : []
        } catch {
          out = chunk.map(c => ({
            id: c.id,
            status: 'error' as const,
            exit_ip: null,
            latency_ms: -1,
            message: 'Không gọi được máy chủ kiểm tra'
          }))
        }

        if (cancel?.cancelled) break

        all.push(...out)
        onBatch?.(out)
      }

      return all
    },
    [axiosAuth]
  )

  return { checkAll, batchSize: PROXY_CHECK_BATCH_SIZE }
}
