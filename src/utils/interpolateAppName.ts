/**
 * Thay token i18next {{appName}} (và {{{appName}}}) trong chuỗi dictionary
 * bằng tên site thật — dùng cho generateMetadata (SSR đọc JSON thô, không qua i18n).
 * Trả '' nếu text rỗng để caller fallback bằng `|| 'default'`.
 */
export function interpolateAppName(text: string | undefined | null, appName: string): string {
  if (!text) return ''

  return text.replace(/\{\{\{?\s*appName\s*\}?\}\}/g, appName)
}
