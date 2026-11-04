'use client'

import type { ReactNode } from 'react'

import Box from '@mui/material/Box'

/**
 * Log admin: dòng "Do: ..." và phần tô đúng trường sai trong nội dung đối tác trả về.
 * Nội dung do BE viết (`context.ket_luan`), FE chỉ hiển thị. Log cũ và lần xoay bình thường không có
 * khoá này nên không hiện gì. CHỈ dùng ở màn admin, không đưa vào màn của khách.
 */

export type DanhDauTruong = { truong: string; ghi_chu?: string }

export type KetLuanLog = { nhom?: string; cau?: string; danh_dau?: DanhDauTruong[]; can?: string; doc_duoc?: string }

const NHOM: Record<string, { nhan: string; mau: string }> = {
  doi_tac: { nhan: 'Đối tác', mau: 'error.main' },
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

/**
 * Nội dung đối tác trả về, dàn dòng và tô các trường bị sai.
 * Không có gì để tô hoặc nội dung không phải JSON thì hiện `children`, tức cách hiển thị cũ của nơi gọi.
 */
export function NoiDungDanhDau({ noiDung, danhDau, children }: { noiDung?: string | null; danhDau?: DanhDauTruong[]; children: ReactNode }) {
  if (!noiDung || !danhDau?.length) return <>{children}</>

  let data: unknown

  try {
    data = JSON.parse(noiDung)
  } catch {
    return <>{children}</>
  }

  if (!data || typeof data !== 'object' || Array.isArray(data)) return <>{children}</>

  const dong = JSON.stringify(data, null, 2).split('\n')
  const ghiChuCuaDong = (text: string) => danhDau.find(d => text.startsWith(`  ${JSON.stringify(d.truong)}:`))

  return (
    <Box component='pre' sx={{ fontSize: 10, m: 0, mt: 0.5, py: 0.75, bgcolor: 'grey.900', color: 'grey.300', borderRadius: 1, overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
      {dong.map((text, i) => {
        const sai = ghiChuCuaDong(text)

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
