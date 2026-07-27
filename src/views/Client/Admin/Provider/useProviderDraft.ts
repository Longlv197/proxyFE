'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Lưu nháp NCC đang tạo/đang sửa vào localStorage — chống mất công khi phải đi đâu đó
 * hoặc máy tắt giữa chừng, rồi quay lại quên mất đang sửa dở cái gì.
 *
 * Vì sao localStorage mà không lưu lên server: nháp là thứ CHƯA QUYẾT. Đẩy lên DB là đụng
 * vào cục config đang bán hàng — đúng thứ chặng 1 tránh.
 * ⚠ Đánh đổi phải nói rõ với admin: đổi máy / xoá cache trình duyệt là mất nháp.
 *
 * 🔴 3 luật an toàn:
 *  1. KHÔNG lưu token/mật khẩu vào nháp (localStorage đọc được bằng devtools).
 *  2. KHÔNG tự khôi phục — phải hỏi admin, vì tự đè sẽ nuốt mất thay đổi người khác vừa lưu.
 *  3. Cảnh báo khi NCC đã bị sửa SAU lúc lưu nháp (so updated_at) — nháp có thể đã lỗi thời.
 */

const PREFIX = 'provider_draft:'

const MAX_AGE_DAYS = 7

/** Cùng danh sách với BE (StepDigest / ConfigExampleService). */
const SECRET_KEYS = ['key', 'api_key', 'apikey', 'token', 'token_api', 'password', 'pass', 'secret']

export interface DraftMeta {
  savedAt: string
  values: any
  baseUpdatedAt?: string

  /** NCC đã bị sửa sau lúc lưu nháp → khôi phục có thể đè mất thay đổi đó */
  isStale: boolean
}

/** Bỏ mọi field bí mật ở MỌI TẦNG trước khi ghi xuống localStorage. */
function stripSecrets(value: any): any {
  if (Array.isArray(value)) return value.map(stripSecrets)

  if (value && typeof value === 'object') {
    const out: Record<string, any> = {}

    for (const [k, v] of Object.entries(value)) {
      if (SECRET_KEYS.includes(k.toLowerCase())) continue
      out[k] = stripSecrets(v)
    }

    return out
  }

  return value
}

export function useProviderDraft({ providerCode, updatedAt }: { providerCode?: string; updatedAt?: string }) {
  const storageKey = `${PREFIX}${providerCode || '__new__'}`
  const [draft, setDraft] = useState<DraftMeta | null>(null)

  // Đọc nháp khi mở modal.
  // ⚠ Modal KHÔNG unmount giữa 2 lần mở (chỉ đổi prop open) → nếu không đọc lại theo storageKey
  // thì nháp của NCC trước sẽ hiện nhầm cho NCC sau.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey)

      if (!raw) {
        setDraft(null)

        return
      }

      const parsed = JSON.parse(raw)
      const ageDays = (Date.now() - new Date(parsed.savedAt).getTime()) / 86400000

      if (!parsed.savedAt || isNaN(ageDays) || ageDays > MAX_AGE_DAYS) {
        localStorage.removeItem(storageKey)
        setDraft(null)

        return
      }

      setDraft({
        savedAt: parsed.savedAt,
        values: parsed.values,
        baseUpdatedAt: parsed.baseUpdatedAt,
        isStale: !!(updatedAt && parsed.baseUpdatedAt && updatedAt > parsed.baseUpdatedAt)
      })
    } catch {
      setDraft(null)
    }
  }, [storageKey, updatedAt])

  /** Ghi nháp — bên gọi tự debounce để không ghi mỗi phím gõ. */
  const save = useCallback(
    (values: any) => {
      try {
        localStorage.setItem(
          storageKey,
          JSON.stringify({
            savedAt: new Date().toISOString(),
            baseUpdatedAt: updatedAt,
            values: stripSecrets(values)
          })
        )
      } catch {
        // localStorage đầy hoặc bị chặn → bỏ qua, KHÔNG được làm hỏng việc sửa config
      }
    },
    [storageKey, updatedAt]
  )

  const clear = useCallback(() => {
    try {
      localStorage.removeItem(storageKey)
    } catch {
      // ignore
    }

    setDraft(null)
  }, [storageKey])

  return { draft, save, clear }
}
