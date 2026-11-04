'use client'

import type { ReactNode } from 'react'

import Box from '@mui/material/Box'

/**
 * Log admin: dòng "Do: ..." và phần tô đúng trường sai trong nội dung đối tác trả về.
 * Nội dung do BE viết (`context.ket_luan`), FE chỉ hiển thị. Log cũ và lần xoay bình thường không có
 * khoá này nên không hiện gì. CHỈ dùng ở màn admin, không đưa vào màn của khách.
 */

export type DanhDauTruong = { truong: string; ghi_chu?: string; gia_tri?: unknown }

export type KetLuanLog = { nhom?: string; cau?: string; danh_dau?: DanhDauTruong[]; can?: string; doc_duoc?: string }

const NHOM: Record<string, { nhan: string; mau: string }> = {
  doi_tac: { nhan: 'Đối tác', mau: 'error.main' },
  tu_choi: { nhan: 'Đối tác từ chối', mau: 'error.main' },
  cau_hinh: { nhan: 'Cấu hình bên mình', mau: 'warning.dark' },
  he_thong: { nhan: 'Hệ thống bên mình', mau: 'warning.dark' },
  ket_noi: { nhan: 'Kết nối', mau: 'info.dark' },
  chua_ro: { nhan: 'Chưa rõ', mau: 'text.secondary' }
}

export default function LogKetLuan({ ketLuan }: { ketLuan?: KetLuanLog | null }) {
  if (!ketLuan?.cau) return null

  const nhom = NHOM[ketLuan.nhom ?? ''] ?? NHOM.chua_ro

  return (
    <Box sx={{ mt: 0.5, px: 1, py: 0.5, fontSize: 11, lineHeight: 1.5, bgcolor: 'action.hover', borderRadius: 1, borderLeft: '3px solid', borderColor: nhom.mau, wordBreak: 'break-word' }}>
      <Box component='strong' sx={{ color: nhom.mau }}>Do: {nhom.nhan}.</Box> {ketLuan.cau}
      {ketLuan.can && <Box><strong>Hệ thống cần:</strong> {ketLuan.can}</Box>}
      {ketLuan.doc_duoc && <Box><strong>Đọc được:</strong> {ketLuan.doc_duoc}</Box>}
    </Box>
  )
}

/** Một số đối tác trả nhiều object liền nhau `{..}{..}`, BE đọc được thì ở đây cũng phải đọc được. */
function docJson(noiDung: string): object | null {
  for (const chuoi of [noiDung, `[${noiDung.replace(/}\s*{/g, '},{')}]`]) {
    try {
      const data = JSON.parse(chuoi)

      if (data && typeof data === 'object') return data
    } catch {
      // Thử cách đọc tiếp theo
    }
  }

  return null
}

/**
 * Nội dung đối tác trả về, dàn dòng và tô các trường bị sai.
 * Không có gì để tô hoặc nội dung không phải JSON thì hiện `children`, tức cách hiển thị cũ của nơi gọi.
 */
export function NoiDungDanhDau({ noiDung, danhDau, children }: { noiDung?: string | null; danhDau?: DanhDauTruong[]; children: ReactNode }) {
  const data = typeof noiDung === 'string' ? docJson(noiDung) : null

  if (!data || !danhDau?.length) return <>{children}</>

  const dong = JSON.stringify(data, null, 2).split('\n')
  const danhDauTheoDong = new Map<number, DanhDauTruong>()

  // Mỗi đánh dấu tô 1 dòng đầu tiên khớp. Có `gia_tri` thì phải khớp cả giá trị: dạng mảng có thể
  // lặp lại cùng tên trường ở nhiều phần tử, tô nhầm dòng đúng còn tệ hơn không tô.
  danhDau.forEach(d => {
    const ten = JSON.stringify(d.truong.split('.').pop())
    const giaTri = d.gia_tri === undefined ? null : JSON.stringify(d.gia_tri)

    const viTri = dong.findIndex(text => {
      const t = text.trim()

      if (!t.startsWith(`${ten}:`)) return false

      return giaTri === null || t.replace(/,$/, '') === `${ten}: ${giaTri}`
    })

    if (viTri >= 0) danhDauTheoDong.set(viTri, d)
  })

  if (danhDauTheoDong.size === 0) return <>{children}</>

  return (
    <Box component='pre' sx={{ fontSize: 10, m: 0, mt: 0.5, py: 0.75, bgcolor: 'grey.900', color: 'grey.300', borderRadius: 1, overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
      {dong.map((text, i) => {
        const sai = danhDauTheoDong.get(i)

        return (
          <Box key={i} sx={{ px: 1, ...(sai ? { bgcolor: 'warning.main', color: 'common.black', fontWeight: 700 } : {}) }}>
            {text}
            {sai?.ghi_chu ? `   ← ${sai.ghi_chu}` : ''}
          </Box>
        )
      })}
    </Box>
  )
}
