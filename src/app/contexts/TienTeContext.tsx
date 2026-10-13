'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

import { useBrandingSettings } from '@/hooks/apis/useBrandingSettings'

/**
 * Tiền tệ HIỂN THỊ (anh Long 13/10): khách chọn xem giá/số dư bằng VNĐ, USD hoặc CNY.
 *
 * ⚠ CHỈ ĐỔI CÁCH HIỂN THỊ. Ví, giá bán, việc trừ tiền vẫn là VNĐ ở máy chủ. Vì vậy:
 *  - Ô NHẬP số tiền (nạp tiền ngân hàng, rút hoa hồng) vẫn là VNĐ — đừng đổi qua `hien()`.
 *  - Chỗ chốt thanh toán nên hiện kèm số VNĐ thật (`hien(x, { kemVnd: true })`) để khách biết bị trừ bao nhiêu.
 *
 * Mặc định gợi ý theo ngôn ngữ (vi → VNĐ, en → USD, cn → CNY); khách chọn tay thì nhớ trong localStorage
 * và từ đó không đổi theo ngôn ngữ nữa. Thiếu tỷ giá (admin chưa đặt) → tự rơi về VNĐ.
 */

export type TienTe = 'VND' | 'USD' | 'CNY'

export const DANH_SACH_TIEN_TE: Array<{ ma: TienTe; ten: string; kyHieu: string }> = [
  { ma: 'VND', ten: 'Việt Nam Đồng', kyHieu: '₫' },
  { ma: 'USD', ten: 'US Dollar', kyHieu: '$' },
  { ma: 'CNY', ten: '人民币', kyHieu: '¥' }
]

const KHOA_LUU = 'tien_te'

const theoNgonNgu = (lang?: string): TienTe => (lang === 'en' ? 'USD' : lang === 'cn' ? 'CNY' : 'VND')

type GiaTri = {

  /** Tiền tệ đang dùng để hiển thị (đã rơi về VND nếu thiếu tỷ giá). */
  tienTe: TienTe

  /** Các loại khách được chọn (có tỷ giá). */
  coTheChon: TienTe[]
  datTienTe: (t: TienTe) => void

  /** Định dạng một số tiền VNĐ theo tiền tệ đang chọn. */
  hien: (vnd: number | string | null | undefined, tuyChon?: { kemVnd?: boolean }) => string
}

const vndStr = (n: number) => new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(Math.round(n)) + ' đ'

const TienTeContext = createContext<GiaTri>({
  tienTe: 'VND',
  coTheChon: ['VND'],
  datTienTe: () => {},
  hien: v => vndStr(Number(v) || 0)
})

export const useTienTe = () => useContext(TienTeContext)

export function TienTeProvider({ lang, children }: { lang?: string; children: React.ReactNode }) {
  const { data } = useBrandingSettings()
  const tyGiaApi = data?.ty_gia_hien_thi
  const tyGia = useMemo(() => tyGiaApi ?? { VND: 1 }, [tyGiaApi])

  // Khách tự chọn — đọc sau khi mount (localStorage không có ở máy chủ, đọc sớm là lệch hydrate).
  const [daChon, setDaChon] = useState<TienTe | null>(null)

  useEffect(() => {
    try {
      const v = localStorage.getItem(KHOA_LUU) as TienTe | null

      if (v && DANH_SACH_TIEN_TE.some(t => t.ma === v)) setDaChon(v)
    } catch {}
  }, [])

  const coTheChon = useMemo(
    () => DANH_SACH_TIEN_TE.map(t => t.ma).filter(m => m === 'VND' || (tyGia[m] ?? 0) > 0),
    [tyGia]
  )

  const muon = daChon ?? theoNgonNgu(lang)
  const tienTe: TienTe = coTheChon.includes(muon) ? muon : 'VND'

  const datTienTe = useCallback((t: TienTe) => {
    setDaChon(t)

    try {
      localStorage.setItem(KHOA_LUU, t)
    } catch {}
  }, [])

  const hien = useCallback(
    (vnd: number | string | null | undefined, tuyChon?: { kemVnd?: boolean }) => {
      const so = Number(vnd) || 0

      if (tienTe === 'VND') return vndStr(so)
      const quy = so / (tyGia[tienTe] as number)
      const le = quy !== 0 && Math.abs(quy) < 0.01 ? 4 : 2

      const chu = new Intl.NumberFormat(tienTe === 'USD' ? 'en-US' : 'zh-CN', {
        style: 'currency',
        currency: tienTe,
        minimumFractionDigits: 2,
        maximumFractionDigits: le
      }).format(quy)

      return tuyChon?.kemVnd ? `${chu} (${vndStr(so)})` : chu
    },
    [tienTe, tyGia]
  )

  const giaTri = useMemo(() => ({ tienTe, coTheChon, datTienTe, hien }), [tienTe, coTheChon, datTienTe, hien])

  return <TienTeContext.Provider value={giaTri}>{children}</TienTeContext.Provider>
}
