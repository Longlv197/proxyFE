/**
 * Suy ra NCC này BÁN GÌ + MUA XONG NHẬN PROXY KIỂU NÀO — từ cấu hình đang có (§3, §4.1 spec chặng 1).
 *
 * Thuần logic, không JSX, để dùng lại và kiểm được bằng dữ liệu thật.
 *
 * Vì sao cần: màn hiện tại luôn bày cả "Proxy xoay" lẫn "Proxy tĩnh" cho MỌI NCC, trong khi
 * 3/4 NCC thật chỉ dùng một loại — nửa màn hình là đồ thừa nhưng phải bấm vào mới biết rỗng.
 *
 * ⚠ 'package_then_create' KHÔNG có trường nào đánh dấu — nhận ra theo DẤU HIỆU
 * (có cả stage1_buy_package_url + stage2_create_proxy_url ở GỐC api_config).
 * Chỉ dùng để HIỂN THỊ, TUYỆT ĐỐI không dùng để ghi đè config.
 */

export type SellKind = 'rotating' | 'static'

export type BuyFlow = 'immediate' | 'deferred' | 'package_then_create' | 'unknown'

export const FLOW_LABEL: Record<BuyFlow, string> = {
  immediate: 'Trả ngay — gọi 1 API là nhận proxy',
  deferred: 'Lấy sau — mua xong chờ rồi gọi API khác lấy proxy',
  package_then_create: 'Mua gói rồi tạo — mua gói dung lượng, sau đó tạo từng proxy',
  unknown: 'Chưa xác định — điền cấu hình mua để biết'
}

/** Kiểu nhận ra theo dấu hiệu chứ không có trường đánh dấu → phải nói rõ trên màn hình. */
export const FLOW_IS_GUESSED: Record<BuyFlow, boolean> = {
  immediate: false,
  deferred: false,
  package_then_create: true,
  unknown: false
}

interface SellKindInput {
  rotatingEnabled?: boolean
  staticEnabled?: boolean
}

/**
 * NCC bán gì — đọc từ cờ `enabled` của 2 khối mua trong form.
 *
 * Cờ này khớp đúng "có cấu hình hay không": ProviderFormSerializer.parseBuySection trả
 * enabled=true khi DB có khối đó, và buildBuySection trả null khi enabled=false.
 *
 * Không khối nào bật (NCC mới tinh) → mặc định proxy xoay, khớp thói quen cũ của màn hình.
 */
export function detectSellKinds({ rotatingEnabled, staticEnabled }: SellKindInput): SellKind[] {
  const kinds: SellKind[] = []

  if (rotatingEnabled) kinds.push('rotating')
  if (staticEnabled) kinds.push('static')

  return kinds.length ? kinds : ['rotating']
}

/**
 * Mua xong nhận proxy kiểu nào.
 *
 * @param cfg     GỐC api_config đã lưu (dấu hiệu stage1/stage2 nằm ở gốc, không trong section)
 * @param section khối mua đang xem
 */
export function detectBuyFlow(cfg: any, section: 'buy_static' | 'buy_rotating' | 'buy'): BuyFlow {
  // Dấu hiệu 2 giai đoạn (proxyma.io residential) — nằm ở GỐC api_config
  if (cfg?.stage1_buy_package_url && cfg?.stage2_create_proxy_url) return 'package_then_create'

  const body = cfg?.[section] ?? (section === 'buy_rotating' ? cfg?.buy : undefined)
  const mode = body?.response_mode

  if (mode === 'deferred') return 'deferred'
  if (mode === 'immediate') return 'immediate'

  // Chưa khai response_mode nhưng đã cấu hình lấy proxy sau → thực chất là deferred
  if (body?.fetch_proxies?.url) return 'deferred'

  // Đã có cấu hình mua mà không khai gì → code thật chạy 'immediate'
  // (GenericOrderProcessor: $buyConfig['response_mode'] ?? 'immediate')
  if (body && (body.url || body.duration_units?.length || body.url_by_duration)) return 'immediate'

  return 'unknown'
}

/**
 * Cấu hình mua nằm NGOÀI khối buy_* — hiện chỉ có 1 ca thật: proxyma.io (residential)
 * để `stage1_buy_package_url` + `stage2_create_proxy_url` ở GỐC api_config, không có
 * bất kỳ khối buy/buy_static/buy_rotating nào.
 *
 * Kiểm trên DB thật 27/07: proxyma.io → "khoi mua: KHONG CO KHOI NAO".
 *
 * Nếu không nhận ra ca này, màn hình sẽ vẽ 6 bước RỖNG và admin tưởng NCC chưa cấu hình gì
 * — trong khi nó đang chạy bình thường. Phải nói thẳng "cấu hình nằm ở chỗ khác".
 */
export function hasBuySectionConfig(cfg: any, section: 'buy_static' | 'buy_rotating' | 'buy'): boolean {
  const body = cfg?.[section] ?? (section === 'buy_rotating' ? cfg?.buy : undefined)

  return !!body && Object.keys(body).length > 0
}

/** Các URL cấu hình mua nằm ở gốc api_config (ca proxyma.io) — để hiển thị cho admin biết. */
export function rootLevelBuyUrls(cfg: any): Array<{ label: string; url: string }> {
  const out: Array<{ label: string; url: string }> = []

  if (cfg?.stage1_buy_package_url) out.push({ label: 'Bước 1 — Mua gói', url: cfg.stage1_buy_package_url })
  if (cfg?.stage2_create_proxy_url) out.push({ label: 'Bước 2 — Tạo proxy', url: cfg.stage2_create_proxy_url })

  return out
}

/**
 * Id các bước cần hiện với từng kiểu (§4.2 spec).
 *
 * Điểm quan trọng: 'fetch_later' (lấy proxy sau) hiện đang bị CHÔN bên trong bước
 * 'proxy_extract' — chặng 1 nâng nó thành bước ngang hàng, vì với NCC "lấy sau"
 * thì đó mới là chỗ proxy thật sự về.
 */
export function stepsForFlow(flow: BuyFlow): string[] {
  switch (flow) {
    case 'immediate':
      return ['api_call', 'success_check', 'proxy_extract', 'data_storage', 'error_handling', 'params_mapping']
    case 'deferred':
    case 'package_then_create':
      return ['api_call', 'success_check', 'fetch_later', 'data_storage', 'error_handling', 'params_mapping']
    default:
      // Chưa biết kiểu → hiện đủ để admin điền, không giấu gì
      return [
        'api_call',
        'success_check',
        'proxy_extract',
        'fetch_later',
        'data_storage',
        'error_handling',
        'params_mapping'
      ]
  }
}
