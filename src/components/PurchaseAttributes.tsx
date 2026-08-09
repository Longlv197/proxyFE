'use client'

import { fixCountryCode } from '@/configs/tagConfig'

/**
 * Thuộc tính khách đã chọn khi mua (Vị trí, Nhà mạng, Nhịp xoay…) — hiện ở đơn hàng & danh sách proxy.
 *
 * BE trả sẵn qua `purchase_attributes` (OrderAttributeResolver): đã là nhãn tiếng người, KHÔNG kèm
 * `provider_value`/`param_name`. FE chỉ vẽ, TUYỆT ĐỐI không tự dò lại từ custom_fields — dò ở FE là
 * chép luật ra chỗ thứ hai, mà lệch luật chính là thứ đẻ ra bug (bài học từ dòng Quốc gia trên thẻ SP).
 *
 * Dùng chung cho 3 màn: danh sách đơn, chi tiết đơn, trang danh sách proxy — nên đổi cách hiện thì
 * sửa đúng một chỗ.
 */

export interface PurchaseAttribute {
  label: string
  value: string
  flag?: string | null
}

interface Props {
  items?: PurchaseAttribute[] | null
  /** 'chip' = viên bo tròn (bảng danh sách) · 'row' = từng dòng nhãn — giá trị (chi tiết đơn) */
  variant?: 'chip' | 'row'
  /** Cắt bớt khi quá nhiều, phần dư gộp thành "+N" (chỉ áp cho variant chip) */
  max?: number
}

const PurchaseAttributes = ({ items, variant = 'chip', max }: Props) => {
  if (!items?.length) return null

  if (variant === 'row') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {items.map((a, i) => (
          <div key={`${a.label}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
            <span style={{ color: '#64748b' }}>{a.label}:</span>
            {a.flag && (
              <img
                src={`https://flagcdn.com/w20/${fixCountryCode(a.flag)}.png`}
                alt=''
                style={{ width: 18, height: 13, objectFit: 'cover', borderRadius: 2, flexShrink: 0 }}
              />
            )}
            <span style={{ fontWeight: 600, color: '#334155' }}>{a.value}</span>
          </div>
        ))}
      </div>
    )
  }

  // Tính một lần rồi dùng lại — đừng để chỗ khác gọi slice(max) khi max có thể undefined
  // (slice(undefined) trả về NGUYÊN mảng, tooltip "+N" sẽ liệt kê thừa cả phần đang hiện).
  const catTai = max != null && items.length > max ? max : items.length
  const hienThi = items.slice(0, catTai)
  const phanDu = items.slice(catTai)

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
      {hienThi.map((a, i) => (
        <span
          key={`${a.label}-${i}`}
          title={`${a.label}: ${a.value}`}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '1px 7px', borderRadius: 999,
            background: '#f1f5f9', border: '1px solid #e2e8f0',
            fontSize: 11, color: '#475569', lineHeight: '17px', maxWidth: '100%'
          }}
        >
          {a.flag && (
            <img
              src={`https://flagcdn.com/w20/${fixCountryCode(a.flag)}.png`}
              alt=''
              style={{ width: 15, height: 11, objectFit: 'cover', borderRadius: 1, flexShrink: 0 }}
            />
          )}
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.value}</span>
        </span>
      ))}
      {phanDu.length > 0 && (
        <span
          title={phanDu.map(a => `${a.label}: ${a.value}`).join(' · ')}
          style={{
            padding: '1px 7px', borderRadius: 999, background: '#f8fafc',
            border: '1px dashed #cbd5e1', fontSize: 11, color: '#64748b', lineHeight: '17px'
          }}
        >
          +{phanDu.length}
        </span>
      )}
    </div>
  )
}

export default PurchaseAttributes
