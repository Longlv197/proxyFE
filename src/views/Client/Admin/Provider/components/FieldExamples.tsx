'use client'

import Typography from '@mui/material/Typography'

import { useConfigExamples } from '@/hooks/apis/useConfigTools'

/**
 * Dòng nhỏ dưới ô nhập: "NCC khác đang điền field này là gì" (§5.3 spec chặng 1).
 *
 * Đây là phần trả lời câu "học được gì từ những thứ đã thêm": ví dụ rút THẲNG từ config
 * các NCC đang chạy trong DB, nên thêm NCC mới là kho tự đầy lên — khác hẳn `example_from`
 * gõ tay trong code (đo được chỉ phủ 4/83 field và không bao giờ tự cập nhật).
 *
 * Nằm trong khối class 'provider-guide' → ẩn/hiện theo công tắc "Hướng dẫn" ở tiêu đề modal
 * (mặc định ẩn) nên KHÔNG làm rối thêm màn hình.
 *
 * BE đã bỏ field bí mật trước khi trả → FE không cần lọc lại.
 */
export default function FieldExamples({ path, exclude }: { path: string; exclude?: string }) {
  const { data } = useConfigExamples()

  const rows = (data?.[path] ?? []).filter(row => row.provider !== exclude).slice(0, 3)

  if (!rows.length) return null

  return (
    <Typography
      className='provider-guide'
      variant='caption'
      sx={{ display: 'block', mt: 0.5, color: 'text.disabled', wordBreak: 'break-word' }}
    >
      NCC khác đang điền: {rows.map(row => `${row.provider}=${row.value}`).join(' · ')}
    </Typography>
  )
}
