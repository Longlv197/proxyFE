import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

import useAxiosAuth from '@/hocs/useAxiosAuth'

/**
 * localStorage persistence cho residential admin queries — cache survive page reload
 * + new browser session, đỡ phải fetch lại từ NCC mỗi lần mở LocationTreePickerModal.
 *
 * Convention key: `resi:{slug}:{kind}[:p1[:p2]]`  TTL embed trong value (saved_at).
 *
 *   resi:proxyma:countries
 *   resi:proxyma:regions:US
 *   resi:proxyma:cities:US:California
 */
const STORAGE_PREFIX = 'resi:'
const TTL = {
  countries: 24 * 60 * 60 * 1000,  // 24h
  regions: 60 * 60 * 1000,           // 1h
  cities: 60 * 60 * 1000              // 1h
}

type PersistedEntry<T> = { data: T; saved_at: number; ttl_ms: number }

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function persistGet<T>(key: string): T | undefined {
  if (!isBrowser()) return undefined
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + key)
    if (!raw) return undefined
    const parsed: PersistedEntry<T> = JSON.parse(raw)
    if (Date.now() - parsed.saved_at > parsed.ttl_ms) {
      window.localStorage.removeItem(STORAGE_PREFIX + key)

      return undefined
    }

    return parsed.data
  } catch {
    return undefined
  }
}

function persistSet<T>(key: string, data: T, ttl_ms: number): void {
  if (!isBrowser()) return
  try {
    const entry: PersistedEntry<T> = { data, saved_at: Date.now(), ttl_ms }
    window.localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(entry))
  } catch {
    // localStorage full hoặc privacy mode → silent
  }
}

function persistDelete(key: string): void {
  if (!isBrowser()) return
  try { window.localStorage.removeItem(STORAGE_PREFIX + key) } catch {}
}

/**
 * Helper export — get/set/clear localStorage cho residential admin queries.
 * Dùng cho imperative fetch trong LocationTreePickerModal (không qua hook) + refresh per-row.
 */
export const residentialAdminPersist = {
  // Read
  getCountries: (slug: string) => persistGet<ResidentialCountry[]>(`${slug}:countries`),
  getRegions: (slug: string, countryCode: string) =>
    persistGet<string[]>(`${slug}:regions:${countryCode.toUpperCase()}`),
  getCities: (slug: string, countryCode: string, regionName: string) =>
    persistGet<string[]>(`${slug}:cities:${countryCode.toUpperCase()}:${regionName}`),

  // Write
  setCountries: (slug: string, data: ResidentialCountry[]) =>
    persistSet(`${slug}:countries`, data, TTL.countries),
  setRegions: (slug: string, countryCode: string, data: string[]) =>
    persistSet(`${slug}:regions:${countryCode.toUpperCase()}`, data, TTL.regions),
  setCities: (slug: string, countryCode: string, regionName: string, data: string[]) =>
    persistSet(`${slug}:cities:${countryCode.toUpperCase()}:${regionName}`, data, TTL.cities),

  // Clear (cho "Tải lại từ NCC" button)
  clearCountries: (slug: string) => persistDelete(`${slug}:countries`),
  clearRegions: (slug: string, countryCode: string) =>
    persistDelete(`${slug}:regions:${countryCode.toUpperCase()}`),
  clearCities: (slug: string, countryCode: string, regionName: string) =>
    persistDelete(`${slug}:cities:${countryCode.toUpperCase()}:${regionName}`),
  clearAll: (slug: string) => {
    if (!isBrowser()) return
    const prefix = `${STORAGE_PREFIX}${slug}:`
    Object.keys(window.localStorage)
      .filter(k => k.startsWith(prefix))
      .forEach(k => window.localStorage.removeItem(k))
  }
}

/**
 * Hook generic gọi endpoint admin của NCC residential.
 *
 * Quy ước: BE expose endpoint pattern `/admin/{slug}/{action}` với slug = phần trước
 * dấu chấm của provider_code. Mỗi NCC residential implement 1 controller cùng pattern.
 *
 *   proxyma.io     → /admin/proxyma/balance|tariffs|countries|regions|sync-tariffs
 *   brightdata.com → /admin/brightdata/balance|tariffs|countries|regions|sync-tariffs
 */

export type ResidentialTariff = {
  tariff_id: number
  name: string
  price_usd: number
  price_label: string
  traffic_gb: number
  traffic_label: string
  key_suggest: string | null
}

export type ResidentialCountry = { code: string; name: string }

/** Chuyển provider_code thành admin route slug. */
export const providerCodeToSlug = (code?: string | null): string => {
  if (!code) return ''
  return code.split('.')[0]
}

export const useResidentialBalance = (providerCode?: string | null) => {
  const axiosAuth = useAxiosAuth()
  const slug = providerCodeToSlug(providerCode)

  return useQuery({
    queryKey: ['residential-admin', slug, 'balance'],
    queryFn: async () => {
      const res = await axiosAuth.get(`/admin/${slug}/balance`)
      return res?.data?.data ?? { balance_usd: null }
    },
    enabled: !!slug,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false
  })
}

export const useResidentialTariffs = (providerCode?: string | null) => {
  const axiosAuth = useAxiosAuth()
  const slug = providerCodeToSlug(providerCode)

  return useQuery<ResidentialTariff[]>({
    queryKey: ['residential-admin', slug, 'tariffs'],
    queryFn: async () => {
      const res = await axiosAuth.get(`/admin/${slug}/tariffs`)
      return res?.data?.data ?? []
    },
    enabled: !!slug,
    staleTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false
  })
}

export const useResidentialCountries = (providerCode?: string | null) => {
  const axiosAuth = useAxiosAuth()
  const slug = providerCodeToSlug(providerCode)

  return useQuery<ResidentialCountry[]>({
    queryKey: ['residential-admin', slug, 'countries'],
    queryFn: async () => {
      const res = await axiosAuth.get(`/admin/${slug}/countries`)
      const data = res?.data?.data ?? []
      // Persist sau fetch — survive page reload + browser session
      if (slug) persistSet(`${slug}:countries`, data, TTL.countries)

      return data
    },
    // Hydrate từ localStorage để mở modal lần khác render INSTANT (skip loading state)
    initialData: slug ? persistGet<ResidentialCountry[]>(`${slug}:countries`) : undefined,
    enabled: !!slug,
    staleTime: TTL.countries,
    refetchOnWindowFocus: false
  })
}

/**
 * Lazy fetch regions for a country. Cache 1h.
 *
 * Pattern dùng kèm `useResidentialRegionsFetcher` ở modal picker (imperative khi
 * user expand từng country) — hook này dùng khi component có sẵn countryCode cố định.
 */
export const useResidentialRegions = (providerCode?: string | null, countryCode?: string | null) => {
  const axiosAuth = useAxiosAuth()
  const slug = providerCodeToSlug(providerCode)
  const code = countryCode?.toUpperCase() || ''

  return useQuery<string[]>({
    queryKey: ['residential-admin', slug, 'regions', code],
    queryFn: async () => {
      const res = await axiosAuth.get(`/admin/${slug}/regions`, { params: { country_code: code } })
      const data = res?.data?.data ?? []
      if (slug && code) persistSet(`${slug}:regions:${code}`, data, TTL.regions)

      return data
    },
    initialData: slug && code ? persistGet<string[]>(`${slug}:regions:${code}`) : undefined,
    enabled: !!slug && !!code,
    staleTime: TTL.regions,
    refetchOnWindowFocus: false
  })
}

export const useResidentialCities = (
  providerCode?: string | null,
  countryCode?: string | null,
  regionName?: string | null
) => {
  const axiosAuth = useAxiosAuth()
  const slug = providerCodeToSlug(providerCode)
  const code = countryCode?.toUpperCase() || ''
  const region = regionName || ''

  return useQuery<string[]>({
    queryKey: ['residential-admin', slug, 'cities', code, region],
    queryFn: async () => {
      const res = await axiosAuth.get(`/admin/${slug}/cities`, {
        params: { country_code: code, region_name: region }
      })
      const data = res?.data?.data ?? []
      if (slug && code && region) persistSet(`${slug}:cities:${code}:${region}`, data, TTL.cities)

      return data
    },
    initialData: slug && code && region
      ? persistGet<string[]>(`${slug}:cities:${code}:${region}`)
      : undefined,
    enabled: !!slug && !!code && !!region,
    staleTime: TTL.cities,
    refetchOnWindowFocus: false
  })
}

/**
 * Shared queryKey factory cho residential admin — dùng khi cần imperative
 * `queryClient.fetchQuery` ở modal picker (lazy load theo expand) để KHÔNG bị
 * refetch khi user đóng/mở modal nhiều lần.
 */
export const residentialAdminKeys = {
  countries: (slug: string) => ['residential-admin', slug, 'countries'] as const,
  regions: (slug: string, countryCode: string) =>
    ['residential-admin', slug, 'regions', countryCode.toUpperCase()] as const,
  cities: (slug: string, countryCode: string, regionName: string) =>
    ['residential-admin', slug, 'cities', countryCode.toUpperCase(), regionName] as const
}

export const useSyncResidentialTariffs = (providerCode?: string | null) => {
  const axiosAuth = useAxiosAuth()
  const queryClient = useQueryClient()
  const slug = providerCodeToSlug(providerCode)

  return useMutation({
    mutationFn: async () => {
      const res = await axiosAuth.post(`/admin/${slug}/sync-tariffs`)
      return res?.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['residential-admin', slug, 'tariffs'] })
      queryClient.invalidateQueries({ queryKey: ['providers'] })
    }
  })
}
