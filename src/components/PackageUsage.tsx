'use client'

/**
 * Dung lượng + hạn còn lại của gói GB (proxy tính theo dung lượng, không theo số proxy).
 *
 * Nguồn: lệnh `sync:package-usage` hỏi NCC mỗi 30 phút → `Order.metadata.package_usage`.
 * BE trả ở CẢ danh sách đơn (`get-order`) lẫn chi tiết đơn (`get-key-order`).
 *
 * Dùng chung cho 2 màn để không lệch cách hiện — sửa cách trình bày thì sửa đúng một chỗ.
 * Có THANH TIẾN TRÌNH vì con số trần trụi ("0.04/1.00 GB") bắt khách tự làm tính chia mới biết
 * mình sắp hết hay chưa; nhìn thanh là biết ngay.
 */

export interface PackageUsageData {
  used_mb: number
  limit_mb?: number | null
  days_left?: number | null
  expired_at?: string | null
  synced_at?: string | null
}

interface Props {
  data?: PackageUsageData | null
  /** 'inline' = một dòng gọn cho bảng danh sách · 'box' = khối có nền cho modal chi tiết */
  variant?: 'inline' | 'box'
}

const gb = (mb: number) => (mb / 1024).toFixed(2)

/** Sắp hết = đã dùng từ 90% dung lượng, hoặc còn ≤ 3 ngày. */
const sapHet = (d: PackageUsageData) => {
  const hetDungLuong = d.limit_mb != null && d.limit_mb > 0 && d.used_mb / d.limit_mb >= 0.9
  const hetHan = d.days_left != null && d.days_left <= 3

  return hetDungLuong || hetHan
}

const PackageUsage = ({ data, variant = 'inline' }: Props) => {
  if (!data) return null

  const coTran = data.limit_mb != null && data.limit_mb > 0
  // Vượt trần (NCC tính dôi) vẫn kẹp 100% — thanh tràn ra ngoài khung trông như lỗi giao diện
  const phanTram = coTran ? Math.min(100, Math.round((data.used_mb / (data.limit_mb as number)) * 100)) : 0
  const canh = sapHet(data)
  const mauChinh = canh ? '#dc2626' : '#0ea5e9'

  const dongSo = (
    <>
      <span style={{ color: '#64748b' }}>Dung lượng: </span>
      <strong style={{ color: canh ? '#dc2626' : '#334155' }}>
        {gb(data.used_mb)}
        {coTran ? `/${gb(data.limit_mb as number)}` : ''} GB
      </strong>
      {coTran && <span style={{ color: '#94a3b8' }}> ({phanTram}%)</span>}
      {data.days_left != null && (
        <span style={{ color: data.days_left <= 3 ? '#dc2626' : '#64748b' }}>
          {' · còn '}<strong>{data.days_left}</strong> ngày
        </span>
      )}
    </>
  )

  const thanh = coTran && (
    <div style={{ height: 4, borderRadius: 999, background: '#e2e8f0', overflow: 'hidden', marginTop: 3 }}>
      <div style={{ width: `${phanTram}%`, height: '100%', background: mauChinh, transition: 'width .2s' }} />
    </div>
  )

  if (variant === 'box') {
    return (
      <div style={{
        padding: '8px 10px', marginBottom: 12, borderRadius: 6,
        background: canh ? '#fef2f2' : '#f0f9ff',
        border: `1px solid ${canh ? '#fecaca' : '#bae6fd'}`
      }}>
        <div style={{ fontSize: 12 }}>
          <span style={{ fontWeight: 600, color: canh ? '#991b1b' : '#0c4a6e' }}>Gói GB: </span>
          {dongSo}
        </div>
        {thanh}
        {data.synced_at && (
          <div style={{ fontSize: 10.5, color: '#94a3b8', marginTop: 4 }}>
            Số liệu lấy từ nhà cung cấp lúc {data.synced_at}, cập nhật mỗi 30 phút
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{ fontSize: 12, marginTop: 2 }}>
      <div>{dongSo}</div>
      {thanh}
    </div>
  )
}

export default PackageUsage
