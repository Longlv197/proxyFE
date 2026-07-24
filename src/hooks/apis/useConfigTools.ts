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
