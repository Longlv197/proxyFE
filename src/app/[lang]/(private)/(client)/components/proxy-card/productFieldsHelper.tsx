import React from 'react'

import { MapPin, Shield, Wifi, Zap, Users, Globe } from 'lucide-react'

import { fixCountryCode, getCountryName as getCountryNameFromCode } from '@/configs/tagConfig'
import { resolveCountryLabel } from '@/utils/countryI18n'

interface ProductField {
  key: string
  label: string
  visible: boolean
}

const DEFAULT_FIELDS: ProductField[] = [
  { key: 'ip_type', label: 'Loại IP', visible: true },
  { key: 'country', label: 'Quốc gia', visible: true },
  { key: 'protocol', label: 'Hỗ trợ', visible: true },
  { key: 'auth_type', label: 'Xác thực', visible: true },
  { key: 'bandwidth', label: 'Băng thông', visible: true },
  { key: 'request_limit', label: 'Giới hạn request', visible: true },
  { key: 'concurrent', label: 'Kết nối đồng thời', visible: true },
  { key: 'custom_fields', label: 'Tuỳ chỉnh', visible: true }
]

/**
 * Thẻ sản phẩm lấy QUỐC GIA từ nguồn nào — admin tự chọn ở từng sản phẩm
 * (`metadata.country_display`). Sản phẩm cũ không khai → `auto`, giữ nguyên hành vi cũ.
 *
 * Vì sao phải có ô này: trước đây luật "có ô chọn thì ô chọn thắng, ẩn hẳn cột Quốc gia" bị
 * CẮM CỨNG. Khi ô chọn hỏng (SP #20 site con mất sạch lựa chọn Vị trí), hệ thống ÂM THẦM rơi
 * về cột `country` = `vn,us` và hiện sai nước, không ai biết vì sao. Cho admin thấy và chọn
 * được nguồn thì lỗi kiểu đó lộ ra ngay thay vì im lặng.
 */
export const NGUON_QUOC_GIA = {
  AUTO: 'auto',       // Có ô chọn → dùng ô chọn; không có → dùng cột Quốc gia (mặc định, như cũ)
  OPTIONS: 'options', // Luôn chỉ dùng ô chọn khi mua
  COLUMN: 'column',   // Luôn chỉ dùng cột Quốc gia cơ bản
  BOTH: 'both',       // Hiện cả hai dòng
  HIDDEN: 'hidden'    // Ẩn hẳn quốc gia khỏi thẻ
} as const

export type NguonQuocGia = (typeof NGUON_QUOC_GIA)[keyof typeof NGUON_QUOC_GIA]

export const NHAN_NGUON_QUOC_GIA: Array<{ value: NguonQuocGia; label: string; mota: string }> = [
  { value: 'auto', label: 'Tự động (khuyên dùng)', mota: 'Có ô chọn khi mua thì lấy theo ô chọn, không có thì lấy cột Quốc gia' },
  { value: 'options', label: 'Chỉ ô chọn khi mua', mota: 'Luôn lấy đúng các nước khách chọn được lúc mua' },
  { value: 'column', label: 'Chỉ ô Quốc gia cơ bản', mota: 'Luôn lấy cột Quốc gia của sản phẩm, bỏ qua ô chọn' },
  { value: 'both', label: 'Hiện cả hai', mota: 'Vẽ cả dòng từ cột Quốc gia lẫn dòng từ ô chọn' },
  { value: 'hidden', label: 'Ẩn quốc gia', mota: 'Không hiện quốc gia trên thẻ sản phẩm' }
]

/** Đọc nguồn quốc gia của 1 sản phẩm — thiếu/khai sai đều rơi về `auto`. */
export const nguonQuocGiaCua = (provider: any): NguonQuocGia => {
  const v = provider?.metadata?.country_display

  return (Object.values(NGUON_QUOC_GIA) as string[]).includes(v) ? v : NGUON_QUOC_GIA.AUTO
}

/**
 * Trường ở "Tuỳ chọn mua hàng" có mang thông tin QUỐC GIA hay không.
 *
 * Trước đây chỉ nhận đúng `display_type === 'country_flag'`. Sản phẩm #42 "Rotate IPv4 Global"
 * đặt `display_type: 'dropdown'` nên KHÔNG được nhận → thẻ rơi về cột `country` (`vn,us`),
 * trong khi ô chọn thật sự bán 8 nước US/GB/TH/KR/JP/ES/TW/PT — không hề có Việt Nam.
 * Khách nhìn thẻ thấy cờ Việt Nam, bấm mua thì không có Việt Nam.
 *
 * 5 dấu hiệu dưới đây bao trọn cả luật của màn thanh toán (CheckoutModal:709-711),
 * nên thẻ sản phẩm và màn thanh toán không còn lệch nhau.
 */
export const truongCoQuocGia = (f: any): boolean =>
  f?.display_type === 'country_flag' ||
  f?.source === 'api_countries' ||
  (f?.key || f?.param) === 'country' ||
  (Array.isArray(f?.components) && f.components.some((c: any) => c?.key === 'country')) ||
  (Array.isArray(f?.options) && f.options.some((o: any) => o?.flag || o?.values?.country))

/** Mã cờ của 1 lựa chọn: ô cờ quốc gia để ở `flag`, combo gói sẵn thì nằm trong `values.country`. */
export const maCoCuaLuaChon = (o: any): string =>
  (o?.flag || o?.values?.country || '').toString().trim().toLowerCase()

/**
 * Gộp các lựa chọn về MỨC QUỐC GIA — mỗi nước đúng 1 lá cờ.
 *
 * Ô chọn có thể chi tiết hơn mức nước: #42 khoá lựa chọn là `united-state-alaska`,
 * `united-kingdom-liverpool`… tức mức thành phố. Vẽ 1 cờ cho MỖI lựa chọn thì hôm nay
 * chưa lộ (8 lựa chọn = 8 nước khác nhau), nhưng thêm 1 vị trí Mỹ nữa là thẻ hiện
 * 2 lá cờ Mỹ giống hệt cạnh nhau.
 *
 * Thẻ là chỗ liếc qua để so sánh nhanh → gộp về nước; chọn đúng vị trí là việc của màn thanh toán.
 * Khi số vị trí nhiều hơn số nước thì `soViTri > soNuoc`, nơi gọi ghi thêm đuôi cho khách biết
 * trong một nước còn chọn sâu được.
 */
export function gomCoTheoNuoc(options: any[]) {
  const dauTien = new Map<string, any>()
  const dem = new Map<string, number>()

  for (const o of options || []) {
    const ma = maCoCuaLuaChon(o)

    if (!ma) continue
    if (!dauTien.has(ma)) dauTien.set(ma, o)
    dem.set(ma, (dem.get(ma) || 0) + 1)
  }

  return {
    danhSach: Array.from(dauTien.entries()).map(([ma, o]) => ({ ma, o, dem: dem.get(ma) || 1 })),
    soNuoc: dauTien.size,
    soViTri: Array.from(dem.values()).reduce((a, b) => a + b, 0),
  }
}

export function getVisibleFields(product_fields: ProductField[] | null | undefined): ProductField[] {
  if (!product_fields || product_fields.length === 0) return DEFAULT_FIELDS.filter(f => f.visible)

  const savedKeys = new Set(product_fields.map(f => f.key))
  const merged = [...product_fields]

  DEFAULT_FIELDS.forEach(df => {
    if (!savedKeys.has(df.key)) merged.push(df)
  })

  return merged.filter(f => f.visible)
}

export function renderFeatureRow(
  key: string,
  provider: any,
  protocolList: string[],
  convertIpVersion: (v: string) => string,
  convertAuthType: (t: string) => string,
  getCountryName: () => string | null,
  locale: string = 'vi'
): React.ReactNode {
  // Giải nhãn của TỪNG LỰA CHỌN theo ngôn ngữ — dùng đúng cách màn thanh toán đang làm
  // (CheckoutModal:202-213). Trước đây thẻ sản phẩm KHÔNG dịch: khách vào /en thấy nhãn tiếng Việt
  // trên thẻ, bấm Mua thì màn thanh toán lại hiện tiếng Anh — cùng một trường mà hai nơi hai kiểu.
  const nhanLuaChon = (o: any): string => {
    const maCo = maCoCuaLuaChon(o)

    if (maCo) return resolveCountryLabel(maCo, locale, o?.label)   // quốc gia: có từ điển sẵn
    if (o?.label_i18n && typeof o.label_i18n === 'object') {
      return o.label_i18n[locale] || o.label_i18n.en || o.label
    }

    return o?.label
  }

  switch (key) {
    case 'ip_type': {
      const rawCountryVal = provider?.country || provider?.country_code || ''
      const rawCountry = Array.isArray(rawCountryVal) ? rawCountryVal.join(',') : String(rawCountryVal)
      const countryCodes = rawCountry.split(',').map((c: string) => c.trim().toLowerCase()).filter(Boolean)

      return (
        <div className='feature-row'>
          <div className='feature-icons'><MapPin size={14} color='#6366f1' /></div>
          <div className='feature-content'>
            <span className='feature-label'>Loại IP:</span>
            <span className='feature-value'>
              {provider.rotation_type ? 'Rotating' : 'Static'} {convertIpVersion(provider.ip_version)}
            </span>
          </div>
        </div>
      )
    }

    case 'protocol':
      return (
        <div className='feature-row'>
          <div className='feature-icons'><Shield size={14} color='#f97316' /></div>
          <div className='feature-content'>
            <span className='feature-label'>Hỗ trợ:</span>
            <span className='feature-value'>{protocolList.map(p => p.toUpperCase()).join('/')}</span>
          </div>
        </div>
      )

    case 'auth_type':
      if (!provider?.auth_type) return null

      return (
        <div className='feature-row'>
          <div className='feature-icons'><Shield size={14} color='#e67e22' /></div>
          <div className='feature-content'>
            <span className='feature-label'>Xác thực:</span>
            <span className='feature-value'>
              {convertAuthType(provider.auth_type)}
              {(provider.auth_type === 'userpass' || provider.auth_type === 'both') && (
                <span style={{ fontSize: '10.5px', fontWeight: 500, color: provider.metadata?.allow_custom_auth ? '#2563eb' : '#16a34a', marginLeft: 4 }}>
                  ({provider.metadata?.allow_custom_auth ? 'Tự nhập' : 'Random'})
                </span>
              )}
            </span>
          </div>
        </div>
      )

    case 'bandwidth':
      if (!provider?.bandwidth) return null

      return (
        <div className='feature-row'>
          <div className='feature-icons'><Wifi size={14} color='#3b82f6' /></div>
          <div className='feature-content'>
            <span className='feature-label'>Băng thông:</span>
            <span className='feature-value'>{provider.bandwidth === 'unlimited' ? 'Không giới hạn' : provider.bandwidth}</span>
          </div>
        </div>
      )

    case 'request_limit':
      if (!provider?.request_limit) return null

      return (
        <div className='feature-row'>
          <div className='feature-icons'><Zap size={14} color='#22c55e' /></div>
          <div className='feature-content'>
            <span className='feature-label'>Giới hạn request:</span>
            <span className='feature-value'>{provider.request_limit}</span>
          </div>
        </div>
      )

    case 'concurrent':
      if (!provider?.concurrent_connections) return null

      return (
        <div className='feature-row'>
          <div className='feature-icons'><Users size={14} color='#ef4444' /></div>
          <div className='feature-content'>
            <span className='feature-label'>Kết nối đồng thời:</span>
            <span className='feature-value'>{provider.concurrent_connections}</span>
          </div>
        </div>
      )

    case 'rotation_type':
      if (!provider?.rotation_type) return null

      return (
        <div className='feature-row'>
          <div className='feature-icons'><Zap size={14} color='#8b5cf6' /></div>
          <div className='feature-content'>
            <span className='feature-label'>Kiểu xoay:</span>
            <span className='feature-value'>{provider.rotation_type === 'time' ? 'Time-based' : provider.rotation_type}</span>
          </div>
        </div>
      )

    case 'rotation_interval':
      if (!provider?.rotation_interval) return null

      return (
        <div className='feature-row'>
          <div className='feature-icons'><Zap size={14} color='#a855f7' /></div>
          <div className='feature-content'>
            <span className='feature-label'>Chu kỳ xoay:</span>
            <span className='feature-value'>
              {provider.rotation_interval >= 60
                ? `${Math.floor(provider.rotation_interval / 60)} phút`
                : `${provider.rotation_interval} giây`}
            </span>
          </div>
        </div>
      )

    case 'pool_size':
      if (!provider?.pool_size) return null

      return (
        <div className='feature-row'>
          <div className='feature-icons'><Users size={14} color='#0ea5e9' /></div>
          <div className='feature-content'>
            <span className='feature-label'>Pool size:</span>
            <span className='feature-value'>{provider.pool_size}</span>
          </div>
        </div>
      )

    case 'custom_fields':
      if (!provider?.metadata?.custom_fields?.length) return null

      return (
        <>
          {provider.metadata.custom_fields.map((field: any) => {
            // Nguồn quốc gia admin chọn cũng chi phối dòng vẽ từ Ô CHỌN, không riêng dòng cột
            // `country` — có vậy 'Chỉ ô Quốc gia cơ bản' và 'Ẩn' mới đúng nghĩa, không bị dòng
            // kia lén hiện lại.
            const nguon = nguonQuocGiaCua(provider)
            const oNayLaQuocGia = truongCoQuocGia(field)
            const choPhepVeTuOChon =
              nguon === NGUON_QUOC_GIA.AUTO ||
              nguon === NGUON_QUOC_GIA.OPTIONS ||
              nguon === NGUON_QUOC_GIA.BOTH

            if (oNayLaQuocGia && !choPhepVeTuOChon) return null

            // Vẽ cờ theo ĐÚNG các nước ô chọn đang bán — không lấy từ cột `country` nữa,
            // và gộp về mức quốc gia để 2 vị trí cùng nước không thành 2 lá cờ giống hệt.
            const { danhSach, soNuoc, soViTri } = oNayLaQuocGia
              ? gomCoTheoNuoc(field.options || [])
              : { danhSach: [], soNuoc: 0, soViTri: 0 }

            if (danhSach.length) {
              return (
                <div className='feature-row' key={field.key || field.param}>
                  <div className='feature-icons'><Globe size={14} color='#059669' /></div>
                  <div className='feature-content'>
                    <span className='feature-label'>{field.label}:</span>
                    <span className='feature-value' style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '3px' }}>
                      {danhSach.map(({ ma, o, dem }) => {
                        const ten = nhanLuaChon(o)
                        const nhan = dem > 1 ? `${ten} (${dem} vị trí)` : ten

                        return (
                          <img
                            key={ma}
                            src={`https://flagcdn.com/w20/${fixCountryCode(ma)}.png`}
                            alt={nhan}
                            title={nhan}
                            style={{ width: 20, height: 14, objectFit: 'cover', borderRadius: 2 }}
                          />
                        )
                      })}
                      {soViTri > soNuoc && (
                        <span style={{ fontSize: '10.5px', color: '#64748b' }}>
                          {soNuoc} nước · {soViTri} vị trí
                        </span>
                      )}
                    </span>
                  </div>
                </div>
              )
            }

            // Display value strategy theo loại field:
            //   - text/number → default hoặc 'Tự nhập'
            //   - select dependent (options_by_parent, vd region/city) → "Theo lựa chọn ở trên"
            //   - select <= 3 options → join all labels
            //   - select > 3 options → "{count} lựa chọn" (gọn, không dồn text dài)
            //   - không có options nào → SKIP cả row (đừng hiện label trống lốc)
            const opts = field.options || []
            const parentOpts = Object.values(field.options_by_parent || {}).flat()
            const isInputField = field.type === 'text' || field.type === 'number'

            let displayValue: string | null = null

            if (isInputField) {
              displayValue = field.default || 'Tự nhập'
            } else if (opts.length === 0 && parentOpts.length > 0) {
              displayValue = `${parentOpts.length} lựa chọn (theo lựa chọn ở trên)`
            } else if (opts.length > 0 && opts.length <= 3) {
              displayValue = opts.map((o: any) => nhanLuaChon(o)).join(', ')
            } else if (opts.length > 3) {
              displayValue = `${opts.length} lựa chọn`
            }

            // Không có gì để hiện → ẩn row (vd region/city chưa có data thật)
            if (!displayValue) return null

            return (
              <div className='feature-row' key={field.key || field.param}>
                <div className='feature-icons'><Zap size={14} color='#8b5cf6' /></div>
                <div className='feature-content'>
                  <span className='feature-label'>{field.label}:</span>
                  <span className='feature-value'>{displayValue}</span>
                </div>
              </div>
            )
          })}
        </>
      )

    case 'country': {
      // Nguồn quốc gia do admin chọn ở từng sản phẩm (mặc định `auto` = hành vi cũ).
      const nguon = nguonQuocGiaCua(provider)

      if (nguon === NGUON_QUOC_GIA.HIDDEN || nguon === NGUON_QUOC_GIA.OPTIONS) return null

      // `auto`: ô chọn ở "Tuỳ chọn mua hàng" là NGUỒN ĐÚNG (đó mới là thứ khách chọn được khi
      // mua), nên hễ có ô chọn mang quốc gia thì ẩn hẳn dòng lấy từ cột `country` — tránh vừa
      // trùng vừa mâu thuẫn (SP #42: cột ghi vn,us nhưng ô chọn bán 8 nước khác, không có VN).
      // `column`/`both`: admin CỐ Ý muốn thấy cột này → không ẩn.
      const daCoOChonQuocGia = provider?.metadata?.custom_fields?.some(truongCoQuocGia)

      if (nguon === NGUON_QUOC_GIA.AUTO && daCoOChonQuocGia) return null

      const rawVal = provider?.country || provider?.country_code || ''
      const raw = Array.isArray(rawVal) ? rawVal.join(',') : String(rawVal)
      const codes = raw.split(',').map((c: string) => c.trim().toLowerCase()).filter((c: string) => c.length >= 2)
      if (!codes.length) return null

      return (
        <div className='feature-row'>
          <div className='feature-icons'><Globe size={14} color='#059669' /></div>
          <div className='feature-content'>
            <span className='feature-label'>Quốc gia:</span>
            <span className='feature-value' style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
              {codes.map((c: string) => (
                <img
                  key={c}
                  src={`https://flagcdn.com/w20/${fixCountryCode(c)}.png`}
                  alt={getCountryNameFromCode(c)}
                  title={getCountryNameFromCode(c)}
                  style={{ width: 20, height: 14, objectFit: 'cover', borderRadius: 2 }}
                />
              ))}
            </span>
          </div>
        </div>
      )
    }

    default:
      return null
  }
}
