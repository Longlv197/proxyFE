import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

import useAxiosAuth from '@/hocs/useAxiosAuth'

export interface TransactionBankParams {
  gateway?: string
  account_number?: string
  transfer_type?: string
  is_processed?: string
  start?: string
  end?: string
  search?: string
  page?: number
  per_page?: number
}

export interface WebhookLogsParams {
  partner?: string
  response_code?: string
  start?: string
  end?: string
  page?: number
  per_page?: number
}

/**
 * Danh sách giao dịch ngân hàng (admin đối soát).
 * GET /admin/transaction-bank
 */
export const useTransactionBank = (params: TransactionBankParams = {}, enabled = true) => {
  const axiosAuth = useAxiosAuth()

  return useQuery({
    queryKey: ['transactionBank', params],
    queryFn: async () => {
      const res = await axiosAuth.get('/admin/transaction-bank', {
        params: Object.fromEntries(
          Object.entries(params).filter(([, v]) => v !== '' && v !== undefined)
        )
      })

      return res?.data
    },
    enabled,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false
  })
}

/**
 * Thống kê tổng hợp giao dịch ngân hàng.
 * GET /admin/transaction-bank/summary
 */
export const useTransactionBankSummary = (params: { start?: string; end?: string } = {}, enabled = true) => {
  const axiosAuth = useAxiosAuth()

  return useQuery({
    queryKey: ['transactionBankSummary', params],
    queryFn: async () => {
      const res = await axiosAuth.get('/admin/transaction-bank/summary', {
        params: Object.fromEntries(
          Object.entries(params).filter(([, v]) => v !== '' && v !== undefined)
        )
      })

      return res?.data?.data
    },
    enabled,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false
  })
}

/**
 * Phân tích tại sao GD chưa xử lý.
 * GET /admin/transaction-bank/{id}/investigate
 */
export const useInvestigate = (id: number | null) => {
  const axiosAuth = useAxiosAuth()

  return useQuery({
    queryKey: ['transactionBankInvestigate', id],
    queryFn: async () => {
      const res = await axiosAuth.get(`/admin/transaction-bank/${id}/investigate`)

      
return res?.data?.data
    },
    enabled: !!id,
    staleTime: 0,
    refetchOnWindowFocus: false
  })
}

export interface MatchDeposit {
  id: number
  user_id: number
  user_name: string | null
  user_email: string | null
  amount: number
  transaction_code: string | null
  status: string
  created_at: string | null
  memo_match: boolean
  match_score: number
}

/**
 * Tìm lệnh nạp (BankAuto) khớp với 1 giao dịch ngân hàng — admin chọn 1.
 * GET /admin/transaction-bank/{id}/match-deposits
 */
export const useMatchDeposits = (transactionId: number | null) => {
  const axiosAuth = useAxiosAuth()

  return useQuery({
    queryKey: ['matchDeposits', transactionId],
    queryFn: async () => {
      const res = await axiosAuth.get(`/admin/transaction-bank/${transactionId}/match-deposits`)

      return (res?.data?.data ?? []) as MatchDeposit[]
    },
    enabled: !!transactionId,
    staleTime: 0
  })
}

/**
 * Cộng tiền thủ công từ giao dịch ngân hàng — luồng chặt chẽ:
 * - reason BẮT BUỘC
 * - chọn bank_auto_id từ list match HOẶC user_id thủ công (cần lý do rõ)
 * POST /admin/transaction-bank/{id}/manual-credit
 */
export const useManualCredit = () => {
  const axiosAuth = useAxiosAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: { id: number; bank_auto_id?: number; user_id?: number; reason: string }) => {
      const { id, ...body } = payload
      const res = await axiosAuth.post(`/admin/transaction-bank/${id}/manual-credit`, body)

      return res?.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactionBank'] })
      queryClient.invalidateQueries({ queryKey: ['transactionBankSummary'] })
      queryClient.invalidateQueries({ queryKey: ['matchDeposits'] })
    }
  })
}

/**
 * Lịch sử webhook từ đối tác.
 * GET /admin/webhook-logs
 */
export const useWebhookLogs = (params: WebhookLogsParams = {}, enabled = true) => {
  const axiosAuth = useAxiosAuth()

  return useQuery({
    queryKey: ['webhookLogs', params],
    queryFn: async () => {
      const res = await axiosAuth.get('/admin/webhook-logs', {
        params: Object.fromEntries(
          Object.entries(params).filter(([, v]) => v !== '' && v !== undefined)
        )
      })

      return res?.data
    },
    enabled,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false
  })
}
