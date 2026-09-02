/**
 * Hai cách đọc cùng một khoản lãi.
 *
 * Cùng một đơn hàng vốn 100đ bán 115đ, lãi 15đ, nhưng ra hai con số khác nhau:
 *   - Lãi trên giá gốc  = 15 / 100 = 15,0%  ← đúng % markup đặt trong cấu hình giá
 *   - Lãi trên tổng thu = 15 / 115 = 13,0%  ← mỗi 100đ thu về thực lãi bao nhiêu
 *
 * Trước đây báo cáo chỉ hiện con số thứ hai, nên đặt markup 15% mà nhìn báo cáo thấy 13%
 * rất dễ tưởng hệ thống tính sai giá. Hiện đủ cả hai thì không còn nhầm.
 */

/**
 * Lãi ÷ giá vốn × 100. Trả `null` khi không có giá vốn (đơn lỗi, đơn đã hoàn) — chia cho 0 không
 * ra 0% mà là "không tính được", hiện `0,0%` ở đó là nói sai rằng đơn hoà vốn.
 */
export const markupPercent = (profit: number, cost: number): number | null =>
  cost > 0 ? Number(((profit / cost) * 100).toFixed(1)) : null

/** Lãi ÷ doanh thu × 100. Trả `null` khi không có doanh thu — xem lý do ở `markupPercent`. */
export const marginPercent = (profit: number, revenue: number): number | null =>
  revenue > 0 ? Number(((profit / revenue) * 100).toFixed(1)) : null

/** `12.9` → `12,9%` (dấu phẩy thập phân theo chuẩn tiếng Việt); không tính được → `—` */
export const formatPercent = (value: number | string | null | undefined): string => {
  if (value === null || value === undefined || value === '') return '—'

  const n = Number(value)

  if (!Number.isFinite(n)) return '—'

  return `${n.toFixed(1).replace('.', ',')}%`
}

// Ngưỡng màu: bán đúng markup 15% chỉ ra ~13% lãi trên tổng thu, nên mốc "xanh" phải đặt
// quanh mức đó — để ngưỡng 40% như cũ thì mọi NCC đều đỏ dù đang lãi đúng như thiết kế.
/** `null` = không tính được → xám, không tô xanh/đỏ như một kết quả thật */
const level = (percent: number | string | null | undefined): 'none' | 'loss' | 'thin' | 'good' => {
  if (percent === null || percent === undefined || percent === '') return 'none'

  const p = Number(percent)

  if (!Number.isFinite(p)) return 'none'
  if (p < 0) return 'loss'

  return p <= 10 ? 'thin' : 'good'
}

/** Màu hex — dùng cho MUI / style inline */
export const profitColor = (percent: number | string | null | undefined): string =>
  ({ none: '#94a3b8', loss: '#dc2626', thin: '#f59e0b', good: '#16a34a' })[level(percent)]

/** Class Tailwind cho badge — dùng cho các bảng ở Dashboard */
export const profitBadgeClass = (percent: number | string | null | undefined): string =>
  ({
    none: 'bg-gray-100 text-gray-500',
    loss: 'bg-red-100 text-red-700',
    thin: 'bg-yellow-100 text-yellow-700',
    good: 'bg-green-100 text-green-700'
  })[level(percent)]

export const LABEL_MARKUP = 'Lãi trên giá gốc'
export const LABEL_MARGIN = 'Lãi trên tổng thu'

/** Nhãn ngắn cho tiêu đề cột trong bảng */
export const LABEL_MARKUP_SHORT = 'Lãi/gốc'
export const LABEL_MARGIN_SHORT = 'Lãi/thu'

export const HINT_MARKUP =
  'Lãi ÷ giá vốn × 100. Đây chính là % markup đặt trong cấu hình giá: vốn 100đ bán ra 115đ thì lãi trên giá gốc là 15%.'

export const HINT_MARGIN =
  'Lãi ÷ doanh thu × 100. Cho biết mỗi 100đ thu về thực lãi bao nhiêu. Markup 15% tương đương lãi trên tổng thu 13% (15 ÷ 115).'
