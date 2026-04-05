import { BrandingSettings } from '@/hooks/apis/useBrandingSettings'

interface ProductSettingFormProps {
  sectionTitleSx: React.CSSProperties
  sectionDescSx: React.CSSProperties
  show_product_code: string | null
  updateBrandingField: (field: keyof BrandingSettings, value: any) => void
}

export default function ProductSettingForm({
  sectionTitleSx,
  sectionDescSx,
  show_product_code,
  updateBrandingField
}: ProductSettingFormProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h6 style={sectionTitleSx}>Hiển thị sản phẩm</h6>
        <p style={sectionDescSx}>Tuỳ chỉnh cách hiển thị sản phẩm trên trang khách hàng</p>
      </div>

      <label
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: '13px',
          color: '#475569',
          cursor: 'pointer'
        }}
      >
        <input
          type='checkbox'
          checked={show_product_code !== '0'}
          onChange={e => updateBrandingField('show_product_code', e.target.checked ? '1' : '0')}
          style={{ accentColor: 'var(--primary-color, #2092EC)' }}
        />
        Hiện mã sản phẩm (code) dưới tên sản phẩm
      </label>
      <div
        style={{
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: 10,
          padding: '12px 16px',
          fontSize: '12px',
          color: '#475569',
          lineHeight: 1.8
        }}
      >
        <strong>Mã sản phẩm (code)</strong> hiện ở: thẻ sản phẩm trang mua hàng, dưới tên sản phẩm.
        <br />
        Dùng để phân biệt sản phẩm khi có nhiều sản phẩm cùng tên hoặc khi khách liên hệ hỗ trợ.
        <br />
        Tắt nếu không muốn khách thấy mã kỹ thuật.
      </div>
    </div>
  )
}
