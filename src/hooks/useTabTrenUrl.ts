'use client'

import { useCallback } from 'react'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'

/**
 * Tab đang chọn nằm trên URL (`?tab=...`) → tải lại trang vẫn giữ đúng tab, gửi link cũng mở đúng tab.
 * Dùng `router.replace` (không thêm lịch sử, không cuộn lên đầu).
 *
 * @param khoa    tên tham số URL, mặc định `tab` (trang có 2 nhóm tab thì đặt tên khác nhau)
 * @param macDinh giá trị khi URL chưa có / có giá trị lạ
 * @param hopLe   danh sách giá trị hợp lệ — URL ghi bừa thì về mặc định
 */
export function useTabTrenUrl<T extends string | number>(khoa: string, macDinh: T, hopLe?: readonly T[]) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const tho = searchParams.get(khoa)
  let giaTri: T = macDinh

  if (tho !== null) {
    const doc = (typeof macDinh === 'number' ? Number(tho) : tho) as T

    if ((typeof macDinh !== 'number' || Number.isInteger(doc)) && (!hopLe || hopLe.includes(doc))) giaTri = doc
  }

  const datTab = useCallback(
    (moi: T) => {
      const p = new URLSearchParams(searchParams.toString())

      if (moi === macDinh) p.delete(khoa)
      else p.set(khoa, String(moi))
      const q = p.toString()

      router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false })
    },
    [searchParams, router, pathname, khoa, macDinh]
  )

  return [giaTri, datTab] as const
}
