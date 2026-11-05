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

console.log('\nÔ "Giá trị tại đường dẫn là gì" (proxies_shape):')

/** Cấu hình lấy proxy thật của 2proxy (05/11/2026), thêm khoá mới. */
const cauHinhLaySau = (dang?: string) => ({
  buy_rotating: {
    url: 'https://app.2proxy.vn/api/proxyv3.php',
    method: 'GET',
    response_mode: 'deferred',
    response: { type: 'object', success_field: 'maloi', success_value: 0, order_id_field: 'ma_don' },
    fetch_proxies: {
      url: 'https://app.2proxy.vn/api/proxyv3.php',
      method: 'GET',
      order_code_param: 'ma_don',
      response: {
        type: 'object', proxies_path: 'proxy', proxy_format: 'string', proxy_string_field: 'proxy',
        item_id_field: 'idproxy', success_field: 'maloi', success_value: 0,
        ...(dang ? { proxies_shape: dang } : {}),
      },
    },
  },
})

const khuHoi = (cfg: any) => buildApiConfig({ ...defaultValues, ...parseApiConfig(cfg) } as FormValues, cfg) as any
const dangLaySau = (cfg: any) => cfg?.buy_rotating?.fetch_proxies?.response?.proxies_shape

phaiBang('đã khai list_object thì giữ nguyên', dangLaySau(khuHoi(cauHinhLaySau('list_object'))), 'list_object')
phaiBang('đã khai object thì giữ nguyên', dangLaySau(khuHoi(cauHinhLaySau('object'))), 'object')
phaiBang('NCC cũ chưa khai thì KHÔNG tự thêm', dangLaySau(khuHoi(cauHinhLaySau())), undefined)

const cauHinhGiaoNgay = (dang?: string) => ({
  buy_static: {
    url: 'https://ncc.test/mua', method: 'GET',
    response: { type: 'object', success_field: 'status', success_value: 200, proxies_path: 'data.list', proxy_format: 'string', proxy_string_field: 'p', ...(dang ? { proxies_shape: dang } : {}) },
  },
})
const dangGiaoNgay = (cfg: any) => cfg?.buy_static?.response?.proxies_shape

phaiBang('bước mua giao ngay đã khai thì giữ nguyên', dangGiaoNgay(khuHoi(cauHinhGiaoNgay('list_string'))), 'list_string')
phaiBang('bước mua giao ngay chưa khai thì không tự thêm', dangGiaoNgay(khuHoi(cauHinhGiaoNgay())), undefined)

console.log(hong === 0 ? '\nTẤT CẢ ĐẠT — form không ăn mất khoá nào.' : `\n${hong} MỤC HỎNG — bấm Lưu sẽ mất cấu hình.`)
process.exit(hong === 0 ? 0 : 1)
