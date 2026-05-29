/**
 * Country name i18n — resolve ISO country code (US, VN, KR...) sang label theo locale.
 *
 * Dùng `i18n-iso-countries` lib chính thức ISO 3166-1 → 250 country × 50+ locale.
 * Backed registration on-demand (chỉ load locale FE đang dùng → tránh bundle 50 file).
 *
 * Usage:
 *   import { resolveCountryLabel } from '@/utils/countryI18n'
 *   resolveCountryLabel('US', 'vi')  // → 'Hoa Kỳ'
 *   resolveCountryLabel('US', 'en')  // → 'United States'
 *   resolveCountryLabel('UNKNOWN', 'vi')  // → 'UNKNOWN' (fallback)
 */

import countries from 'i18n-iso-countries'

import enLocale from 'i18n-iso-countries/langs/en.json'
import viLocale from 'i18n-iso-countries/langs/vi.json'
import koLocale from 'i18n-iso-countries/langs/ko.json'
import jaLocale from 'i18n-iso-countries/langs/ja.json'
import zhLocale from 'i18n-iso-countries/langs/zh.json'

// Đăng ký 5 locale FE hỗ trợ — Vietnam/English/Korean/Japanese/Chinese (cn map → zh)
countries.registerLocale(enLocale as any)
countries.registerLocale(viLocale as any)
countries.registerLocale(koLocale as any)
countries.registerLocale(jaLocale as any)
countries.registerLocale(zhLocale as any)

// FE locale code → ISO 639-1 locale name (i18n-iso-countries dùng 'zh' không phải 'cn')
const LOCALE_MAP: Record<string, string> = {
  vi: 'vi',
  en: 'en',
  ko: 'ko',
  ja: 'ja',
  cn: 'zh'
}

/**
 * Resolve country code sang label theo locale, fallback chuỗi gốc nếu không có.
 *
 * @param code  Country code 2-letter ISO ('US', 'us', 'VN') — case insensitive
 * @param locale FE locale ('vi', 'en', 'ko', 'ja', 'cn'); default 'vi'
 * @param fallback chuỗi fallback khi không tìm thấy (vd label admin tự nhập); default = code uppercase
 */
export function resolveCountryLabel(
  code?: string | null,
  locale: string = 'vi',
  fallback?: string
): string {
  if (!code) return fallback || ''
  const isoCode = code.toUpperCase()
  const isoLocale = LOCALE_MAP[locale] || 'en'

  const name = countries.getName(isoCode, isoLocale, { select: 'official' })

  return name || fallback || isoCode
}

/** Helper: list tất cả country code 2-letter ISO (alphabetical). */
export function getAllCountryCodes(): string[] {
  return Object.keys(countries.getNames('en'))
}

/** Helper render trong React: country option có label theo locale. */
export type CountryOption = { code: string; label: string; flag: string }

export function getCountryOptions(locale: string = 'vi'): CountryOption[] {
  const isoLocale = LOCALE_MAP[locale] || 'en'
  const names = countries.getNames(isoLocale, { select: 'official' })

  return Object.entries(names)
    .map(([code, label]) => ({ code, label, flag: code.toLowerCase() }))
    .sort((a, b) => a.label.localeCompare(b.label, locale))
}
