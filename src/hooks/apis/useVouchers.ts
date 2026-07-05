import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import useAxiosAuth from '@/hocs/useAxiosAuth'

// code_type: 1 = mã chung (nhiều lượt), 2 = mã riêng (1 lần/mã)
// discount_type: 1 = theo %, 2 = theo số tiền (VND)
export interface VoucherCampaign {
  id: number
  name: string
  description: string | null
  is_active: boolean
  code_type: number
  discount_type: number
  discount_value: string
  min_discount_amount: string | null
  max_discount_amount: string | null
  min_order_amount: string | null
  max_order_amount: string | null
  per_user_limit: number
  starts_at: string | null
  ends_at: string | null
  total_quantity: number
  code_prefix: string | null
  code_length: number
  used_count?: number
  total_capacity?: number
  remaining?: number
  runtime_status?: 'active' | 'inactive' | 'expired' | 'exhausted'
  created_at: string
}

export interface VoucherValidateResult {
  success: boolean
  discount?: number
  subtotal?: number
  total?: number
  message?: string
}

/** Danh sách chiến dịch (admin). */
export const useAdminVouchers = () => {
  const axiosAuth = useAxiosAuth()

  return useQuery({
    queryKey: ['admin-vouchers'],
    queryFn: async () => {
      const res = await axiosAuth.get('/admin/vouchers')

      return (res?.data?.data ?? []) as VoucherCampaign[]
    },
    staleTime: 30 * 1000
  })
}

/** Tạo chiến dịch + sinh mã. */
export const useCreateVoucher = () => {
  const axiosAuth = useAxiosAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: Record<string, any>) => {
      const res = await axiosAuth.post('/admin/vouchers', data)

      return res?.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-vouchers'] })
    }
  })
}

/** Cập nhật quy tắc chiến dịch (không đổi loại mã / số lượng). */
export const useUpdateVoucher = () => {
  const axiosAuth = useAxiosAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...data }: Record<string, any> & { id: number }) => {
      const res = await axiosAuth.put(`/admin/vouchers/${id}`, data)

      return res?.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-vouchers'] })
    }
  })
}

/** Xoá chiến dịch (BE chặn nếu đã có đơn dùng). */
export const useDeleteVoucher = () => {
  const axiosAuth = useAxiosAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number) => {
      const res = await axiosAuth.delete(`/admin/vouchers/${id}`)

      return res?.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-vouchers'] })
    }
  })
}

/** Danh sách mã của 1 chiến dịch (phân trang) — để xuất/tra cứu. */
export const useVoucherCodes = (id: number | null, page: number = 1) => {
  const axiosAuth = useAxiosAuth()

  return useQuery({
    queryKey: ['voucher-codes', id, page],
    enabled: !!id,
    queryFn: async () => {
      const res = await axiosAuth.get(`/admin/vouchers/${id}/codes?page=${page}`)

      return res?.data?.data ?? { data: [], total: 0 }
    }
  })
}

/**
 * Preview mã ở checkout — trả { success, discount, total, message }.
 * KHÔNG tiêu mã; BE tính lại + tiêu khi mua thật.
 */
export const useValidateVoucher = () => {
  const axiosAuth = useAxiosAuth()

  return useMutation({
    mutationFn: async (payload: {
      code: string
      serviceTypeId: number
      quantity: number
      duration: number | string
    }) => {
      const res = await axiosAuth.post('/voucher/validate', payload)

      return (res?.data ?? { success: false }) as VoucherValidateResult
    }
  })
}
