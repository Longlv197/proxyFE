import { useQuery, useMutation } from '@tanstack/react-query'

import useAxiosAuth from '@/hocs/useAxiosAuth'

// ─── Types (khớp BE App\Services\ProviderConfig\*) ───

export interface ValidateIssue {
  path: string
  message: string
}

export interface ValidateResult {
  errors: ValidateIssue[]
  warnings: ValidateIssue[]
  skipped: boolean
}

export interface DiffChange {
  path: string
  severity: 'red' | 'orange'
  label: string
  old: any
  new: any
  message: string
}

export interface HarnessCheck {
  name: string
  status: 'green' | 'red' | 'gray'
  detail: string
}

export interface ConfigCard {
  lines: string[]
  checks: HarnessCheck[]
  changes: DiffChange[]
}

/**
 * "4 câu" của MỘT bước cấu hình (§4.2b spec): gọi đâu · gửi payload gì · nhận response gì ·
 * để lại gì cho bước sau. BE (StepDigest) dựng sẵn — FE chỉ hiển thị, không tự suy diễn.
 *
 * needs_code ≠ null nghĩa là bước đó cần lập trình viên viết thêm, chưa bán được.
 * BE chỉ trả khi trúng 1 trong 3 dấu hiệu chắc chắn — FE KHÔNG được tự sinh cảnh báo.
 */
export interface StepDigestData {
  call: string
  send: string
  receive: string
  produces: string
  needs_code: { reason: string; detail: string } | null
}

/** Map section config (`buy`/`buy_static`/`buy_rotating`, kèm `<section>.fetch_proxies`) → digest. */
export type ConfigSteps = Record<string, StepDigestData>

/** Map đường dẫn field (`buy.auth_type`) → các NCC đang điền gì. BE đã bỏ field bí mật. */
export type ConfigExamples = Record<string, Array<{ provider: string; value: string }>>

/**
 * Mức cảnh báo tổng hợp — dùng vẽ chấm màu trên nhãn tab "Kiểm tra" để admin THẤY NGAY
 * khi mở modal, không phải bấm vào tab mới biết có vấn đề.
 *   red    = có lỗi 🔴 hoặc thay đổi trọng yếu mức đỏ (đổi URL/handler)
 *   yellow = có cảnh báo 🟡 hoặc thay đổi mức cam
 *   green  = sạch · none = chưa có dữ liệu / NCC không chạy theo cấu hình
 */
export type ConfigLevel = 'none' | 'green' | 'yellow' | 'red'

export const configLevel = (validate?: ValidateResult, card?: ConfigCard): ConfigLevel => {
  const changes = card?.changes ?? []

  if ((validate?.errors?.length ?? 0) > 0 || changes.some(c => c.severity === 'red')) return 'red'
  if ((validate?.warnings?.length ?? 0) > 0 || changes.length > 0) return 'yellow'
  if (!validate || validate.skipped) return 'none'

  return 'green'
}

// ─── Hooks ───

/** Kiểm config provider theo schema → 🔴/🟡/🟢. GET, không gọi mạng NCC. */
export const useValidateConfig = (code?: string, enabled = true) => {
  const axiosAuth = useAxiosAuth()

  return useQuery({
    queryKey: ['configValidate', code],
    enabled: !!code && enabled,
    queryFn: async (): Promise<ValidateResult> => {
      const res = await axiosAuth.get(`/admin/config-tool/${code}/validate`)

      return res?.data?.data
    },
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false
  })
}

/** Thẻ tóm tắt tiếng người + cảnh báo thay đổi so version trước. GET. */
export const useConfigCard = (code?: string, enabled = true) => {
  const axiosAuth = useAxiosAuth()

  return useQuery({
    queryKey: ['configCard', code],
    enabled: !!code && enabled,
    queryFn: async (): Promise<ConfigCard> => {
      const res = await axiosAuth.get(`/admin/config-tool/${code}/doc`)

      return res?.data?.data
    },
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false
  })
}

/**
 * Kho ví dụ SỐNG — "NCC khác đang điền field này là gì" (§5 spec).
 * Rút từ config các NCC đang chạy, KHÔNG phải ví dụ gõ tay trong code.
 * Dùng chung mọi provider → không có {code}, cache lâu hơn.
 */
export const useConfigExamples = (enabled = true) => {
  const axiosAuth = useAxiosAuth()

  return useQuery({
    queryKey: ['configExamples'],
    enabled,
    queryFn: async (): Promise<ConfigExamples> => {
      const res = await axiosAuth.get('/admin/config-tool/examples')

      return res?.data?.data ?? {}
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false
  })
}

/** "4 câu" từng bước mua của 1 NCC + cảnh báo cần-code. GET, không gọi mạng NCC. */
export const useConfigSteps = (code?: string, enabled = true) => {
  const axiosAuth = useAxiosAuth()

  return useQuery({
    queryKey: ['configSteps', code],
    enabled: !!code && enabled,
    queryFn: async (): Promise<ConfigSteps> => {
      const res = await axiosAuth.get(`/admin/config-tool/${code}/steps`)

      return res?.data?.data ?? {}
    },
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false
  })
}

/** Kiểm chứng gọi API: dry-run mua + (tuỳ chọn live) gọi endpoint đọc thật. AN TOÀN $0. POST. */
export const useTestConfig = () => {
  const axiosAuth = useAxiosAuth()

  return useMutation({
    mutationFn: async (vars: { code: string; product_id: number; live?: boolean }): Promise<{ checks: HarnessCheck[] }> => {
      const res = await axiosAuth.post(`/admin/config-tool/${vars.code}/test`, {
        product_id: vars.product_id,
        live: !!vars.live
      })

      return res?.data?.data
    }
  })
}
