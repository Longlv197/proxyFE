import { useQuery } from '@tanstack/react-query'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8002/api'

export interface ProductOption {
  key: string
  label: string
  flag?: string
}

export interface ProductCustomField {
  key: string
  label: string
  type: 'select' | 'text' | 'number'
  required?: boolean
  default?: string
  options?: ProductOption[]
}

export interface PriceDuration {
  key: string
  value: number
  quantity_tiers?: { min: string; max: string; price: string }[]
}

export interface Product {
  id: number
  code: string
  name: string
  price: number
  type: string // "0" = static, "1" = rotating
  country: string
  ip_version: string
  protocols: string[]
  auth_type: string
  bandwidth: string
  proxy_type: string
  note: string | null
  tag: string | null
  min_quantity: number
  max_quantity: number
  price_by_duration: PriceDuration[]
  pricing_mode: string
  price_per_unit: number | null
  custom_fields: ProductCustomField[] | null
  rotation_type: string | null
  rotation_interval: string | null
  concurrent_connections: number | null
  pool_size: string | null
}

/**
 * Hook lấy danh sách sản phẩm từ public API (không cần auth).
 * Dùng cho trang API docs public.
 */
export const usePublicProducts = () => {
  return useQuery<Product[]>({
    queryKey: ['publicProducts'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/products`)
      const data = await res.json()

      return data?.data ?? []
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  })
}
