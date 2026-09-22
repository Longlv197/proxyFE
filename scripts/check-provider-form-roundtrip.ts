/**
 * Gác lỗi "mở form NCC, bấm Lưu, mất sạch cấu hình" — dự án đã vấp 5 lần.
 *
 * Form dựng lại khối `rotate` từ một DANH SÁCH CỐ ĐỊNH (buildApiConfig), còn BE trộn NÔNG
 * (`array_merge` ở ProviderController) → khoá nào form không biết là bị THAY NGUYÊN CỤC.
 * Nên mọi khoá BE đọc mà form không khai = quả bom hẹn giờ: admin mở NCC bấm Lưu là xoay hỏng.
 *
 * Kiểm tra: nạp cấu hình thật -> parse ra form -> build ngược -> phải còn nguyên.
 *
 * Chạy:  npx tsx scripts/check-provider-form-roundtrip.ts
 */
import { parseApiConfig, buildApiConfig } from '../src/views/Client/Admin/Provider/ProviderFormSerializer'
import { defaultValues } from '../src/views/Client/Admin/Provider/ProviderFormTypes'
import type { FormValues } from '../src/views/Client/Admin/Provider/ProviderFormTypes'

/** Cấu hình THẬT của 2proxy sau khi khai xong (spec 2026-09-22). */
const cauHinh2Proxy = {
  rotate: {
    url: 'https://api.proxyxoay.org/api/key_xoay.php',
    method: 'GET',
    auth_type: 'none',
    auth_param: 'key',
    key_source: 'provider_key',
    url_source: 'rotate_url',
    url_by_type: {
      Us_xoay_ten_mien: 'https://api.proxyxoay.org/api/key_xoay_port.php',
      Vn_Xoay_Port: 'https://api.proxyxoay.org/api/key_xoay_port.php',
    },
    url_allow_hosts: ['api.proxyxoay.org'],
    response: {
      proxy_fields: { http: 'proxyhttp', socks5: 'proxysocks5', real_ip: 'ip' },
      seconds_field: 'next_allowed_in_seconds',
    },
    rotate_params: [{ field: 'provider_key', param: 'key', source: 'order_items' }],
  },
}

let hong = 0
const phaiBang = (ten: string, thucTe: unknown, mongDoi: unknown) => {
  const ok = JSON.stringify(thucTe) === JSON.stringify(mongDoi)
  if (!ok) {
    hong++
    console.error(`  ✗ ${ten}\n      mong đợi: ${JSON.stringify(mongDoi)}\n      thực tế : ${JSON.stringify(thucTe)}`)
  } else {
    console.log(`  ✓ ${ten}`)
  }
}

console.log('Mở form NCC 2proxy rồi bấm Lưu mà KHÔNG sửa gì — cấu hình phải y nguyên:')

const form = { ...defaultValues, ...parseApiConfig(cauHinh2Proxy) } as FormValues
const raLai: any = buildApiConfig(form, cauHinh2Proxy)

phaiBang('rotate.url_source giữ nguyên', raLai?.rotate?.url_source, 'rotate_url')
phaiBang('rotate.url_by_type giữ nguyên', raLai?.rotate?.url_by_type, cauHinh2Proxy.rotate.url_by_type)
phaiBang('rotate.url_allow_hosts giữ nguyên', raLai?.rotate?.url_allow_hosts, ['api.proxyxoay.org'])
phaiBang('rotate.response.seconds_field giữ nguyên', raLai?.rotate?.response?.seconds_field, 'next_allowed_in_seconds')
phaiBang('rotate.response.proxy_fields.real_ip giữ nguyên', raLai?.rotate?.response?.proxy_fields?.real_ip, 'ip')
phaiBang('rotate.key_source giữ nguyên (khoá cũ, chống hồi quy)', raLai?.rotate?.key_source, 'provider_key')
phaiBang('rotate.url giữ nguyên', raLai?.rotate?.url, cauHinh2Proxy.rotate.url)

console.log(hong === 0 ? '\nTẤT CẢ ĐẠT — form không ăn mất khoá nào.' : `\n${hong} MỤC HỎNG — bấm Lưu sẽ mất cấu hình.`)
process.exit(hong === 0 ? 0 : 1)
