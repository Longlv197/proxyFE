export interface ApiParam {
  name: string
  type: string
  required: boolean
  description: string
  example: string
}

export interface ApiEndpoint {
  id: string
  title: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  endpoint: string
  description: string
  category: 'proxy' | 'order' | 'account'
  auth: 'x_api_key' | 'none'
  parameters?: ApiParam[]
  requestBody?: string
  responses: {
    [statusCode: string]: string
  }
  statusCodes: string[]
}

export const categoryLabels: Record<string, string> = {
  proxy: 'Proxy',
  order: 'Đơn hàng',
  account: 'Tài khoản'
}

export const authLabels: Record<string, { label: string; description: string }> = {
  x_api_key: {
    label: 'X-API-Key',
    description: 'Gửi header X-API-Key. Lấy API Key tại Profile → API Key.'
  },
  none: {
    label: 'Không cần',
    description: 'Endpoint công khai, không cần xác thực.'
  }
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8002/api'
const PROXY_BASE = API_BASE

export const apiEndpoints: ApiEndpoint[] = [
  // ═══════════════════════════════════════
  // PROXY — Thao tác proxy
  // ═══════════════════════════════════════
  {
    id: 'get-new-proxy',
    title: 'Lấy Proxy Xoay Mới',
    method: 'GET',
    endpoint: `${PROXY_BASE}/proxies/new`,
    description: 'Lấy proxy xoay mới. Mỗi lần gọi sẽ trả proxy IP mới (nếu hết cooldown).',
    category: 'proxy',
    auth: 'x_api_key',
    parameters: [
      { name: 'key', type: 'string', required: true, description: 'API Key của đơn hàng proxy xoay', example: 'G5aTZVGtrHPRL1YUhBUSfPx' }
    ],
    requestBody: undefined,
    responses: {
      '200 OK': `{
  "success": true,
  "code": 200,
  "status": "SUCCESS",
  "data": {
    "realIpAddress": "27.66.201.201",
    "http": "27.66.201.201:20814:khljtiNj3Kd:fdkm3nbjg45d",
    "socks5": "27.66.201.201:30814:khljtiNj3Kd:fdkm3nbjg45d",
    "httpPort": "20814",
    "socks5Port": "30814",
    "host": "27.66.201.201",
    "user": "khljtiNj3Kd",
    "pass": "fdkm3nbjg45d"
  }
}`,
      '404 ERROR': `{
  "success": false,
  "code": 40400006,
  "message": "Key not found",
  "status": "FAIL"
}`,
      '500 ERROR': `{
  "success": false,
  "code": 50000001,
  "message": "Error server",
  "status": "FAIL"
}`
    },
    statusCodes: ['200 OK', '404 ERROR', '500 ERROR']
  },

  {
    id: 'get-current-proxy',
    title: 'Lấy Proxy Hiện Tại',
    method: 'GET',
    endpoint: `${PROXY_BASE}/proxies/current`,
    description: 'Lấy thông tin proxy xoay đang active. Không tạo proxy mới, chỉ trả proxy hiện tại và thời gian còn lại.',
    category: 'proxy',
    auth: 'x_api_key',
    parameters: [
      { name: 'key', type: 'string', required: true, description: 'API Key của đơn hàng proxy xoay', example: 'G5aTZVGtrHPRL1YUhBUSfPx' }
    ],
    responses: {
      '200 OK': `{
  "success": true,
  "code": 200,
  "status": "SUCCESS",
  "data": {
    "realIpAddress": "42.119.124.219",
    "http": "42.119.124.219:16847:kh1jtlNj3Kd:rdkm3hbjq45d",
    "socks5": "42.119.124.219:26847:kh1jtlNj3Kd:rdkm3hbjq45d",
    "httpPort": "16847",
    "socks5Port": "26847",
    "host": "42.119.124.219",
    "user": "kh1jtlNj3Kd",
    "pass": "rdkm3hbjq45d",
    "location": "VN",
    "timeLeft": 1800,
    "nextChange": "2024-01-15T10:30:00Z",
    "status": "active"
  }
}`,
      '404 ERROR': `{
  "success": false,
  "code": 40400006,
  "message": "Key not found",
  "status": "FAIL"
}`,
      '500 ERROR': `{
  "success": false,
  "code": 50000001,
  "message": "Error server",
  "status": "FAIL"
}`
    },
    statusCodes: ['200 OK', '404 ERROR', '500 ERROR']
  },

  {
    id: 'rotate-ip',
    title: 'Xoay IP Proxy',
    method: 'GET',
    endpoint: `${PROXY_BASE}/proxies/rotate-ip`,
    description: 'Xoay IP proxy ngay lập tức. Cooldown 60 giây giữa các lần xoay.',
    category: 'proxy',
    auth: 'x_api_key',
    parameters: [
      { name: 'api_key', type: 'string', required: true, description: 'API Key của đơn hàng proxy', example: 'G5aTZVGtrHPRL1YUhBUSfPx' }
    ],
    responses: {
      '200 OK': `{
  "success": true,
  "code": 200,
  "status": "SUCCESS",
  "data": {
    "realIpAddress": "103.45.67.89",
    "http": "103.45.67.89:20814:khljtiNj3Kd:fdkm3nbjg45d",
    "socks5": "103.45.67.89:30814:khljtiNj3Kd:fdkm3nbjg45d",
    "httpPort": "20814",
    "socks5Port": "30814",
    "host": "103.45.67.89"
  },
  "message": "Xoay IP thành công",
  "seconds": 60
}`,
      '400 ERROR': `{
  "success": false,
  "code": 40000001,
  "message": "Vui lòng chờ 45 giây nữa để xoay IP",
  "status": "FAIL"
}`,
      '404 ERROR': `{
  "success": false,
  "code": 40400006,
  "message": "Key not found",
  "status": "FAIL"
}`
    },
    statusCodes: ['200 OK', '400 ERROR', '404 ERROR']
  },

  {
    id: 'update-ip-whitelist',
    title: 'Cập Nhật IP Whitelist',
    method: 'POST',
    endpoint: `${API_BASE}/update-ip-whitelist`,
    description: 'Cập nhật danh sách IP được phép truy cập proxy. Chấp nhận cả POST và PUT. Key gửi trong body (không lộ trong server log). Dùng cho proxy có auth_type=ip_whitelist. Key nhận từ response /buy-proxy items[].key.',
    category: 'proxy',
    auth: 'x_api_key',
    parameters: [
      { name: 'key', type: 'string', required: true, description: 'Key nội bộ của proxy item (nhận từ /buy-proxy response)', example: 'abc123xyz...' },
      { name: 'ip_whitelist', type: 'array<string>', required: true, description: 'Danh sách IP (tối đa 10, mỗi IP phải hợp lệ IPv4/IPv6)', example: '["42.118.149.138"]' }
    ],
    responses: {
      '200 OK': `{
  "success": true,
  "message": "Cập nhật IP whitelist thành công",
  "data": {
    "key": "abc123xyz...",
    "ip_whitelist": ["42.118.149.138"]
  }
}`,
      '404 ERROR': `{
  "success": false,
  "error": "item_not_found",
  "message": "Không tìm thấy proxy với key này"
}`,
      '422 ERROR': `{
  "success": false,
  "error": "validation_error",
  "message": "Dữ liệu không hợp lệ",
  "errors": {
    "ip_whitelist.0": ["IP không hợp lệ"]
  }
}`
    },
    notes: 'Endpoint cũ PUT /reseller/order-items/{key}/ip-whitelist và PUT /proxies/{key}/ip-whitelist (key trong URL) vẫn hoạt động với cùng format response chuẩn này, nhưng không khuyến nghị — key có thể lộ trong log server.',
    statusCodes: ['200 OK', '404 ERROR', '422 ERROR']
  },

  // ═══════════════════════════════════════
  // ORDER — Mua proxy & quản lý đơn hàng
  // ═══════════════════════════════════════
  {
    id: 'get-products',
    title: 'Danh Sách Sản Phẩm',
    method: 'GET',
    endpoint: `${API_BASE}/products`,
    description: 'Lấy danh sách sản phẩm proxy có thể mua kèm giá. Trong price_by_duration: key = số ngày sử dụng, value = giá bán (VNĐ).',
    category: 'order',
    auth: 'x_api_key',
    responses: {
      '200 OK': `{
  "status": "success",
  "data": [
    {
      "id": 1,
      "code": "proxy-vn-rotate-30d",
      "name": "Proxy Xoay VN",
      "type": 1,
      "price_by_duration": [
        { "key": "1", "value": 5000 },    // 1 ngày = 5,000đ
        { "key": "7", "value": 25000 },   // 7 ngày = 25,000đ
        { "key": "30", "value": 80000 }   // 30 ngày = 80,000đ
      ],
      "country": "VN"
    }
  ]
}`,
      '401 ERROR': `{
  "error": "invalid_credentials",
  "message": "Invalid API key."
}`
    },
    statusCodes: ['200 OK', '401 ERROR']
  },

  // buy-proxy đã chuyển sang product-driven mode trong ApiDocsPage

  {
    id: 'get-orders',
    title: 'Danh Sách Đơn Hàng',
    method: 'GET',
    endpoint: `${API_BASE}/orders`,
    description: 'Lấy danh sách đơn hàng của bạn (phân trang).',
    category: 'order',
    auth: 'x_api_key',
    parameters: [
      { name: 'status', type: 'string', required: false, description: 'Lọc theo trạng thái: pending, processing, in_use, expired, failed', example: 'in_use' },
      { name: 'per_page', type: 'integer', required: false, description: 'Số kết quả mỗi trang (mặc định 20)', example: '20' },
      { name: 'page', type: 'integer', required: false, description: 'Số trang', example: '1' }
    ],
    responses: {
      '200 OK': `{
  "status": "success",
  "data": {
    "current_page": 1,
    "data": [
      {
        "order_code": "ORD-ABC123",
        "status": 4,
        "quantity": 5,
        "total_amount": 400000,
        "created_at": "2026-03-14T10:00:00Z"
      }
    ],
    "last_page": 1,
    "total": 1
  }
}`,
      '401 ERROR': `{
  "error": "invalid_credentials",
  "message": "Invalid API key."
}`
    },
    statusCodes: ['200 OK', '401 ERROR']
  },

  {
    id: 'get-order-detail',
    title: 'Chi Tiết Đơn Hàng',
    method: 'GET',
    endpoint: `${API_BASE}/orders/{order_code}`,
    description: 'Lấy chi tiết đơn hàng. Khi đơn ở trạng thái in_use, response kèm danh sách proxy.',
    category: 'order',
    auth: 'x_api_key',
    parameters: [
      { name: 'order_code', type: 'string', required: true, description: 'Mã đơn hàng (path param, truyền trên URL)', example: 'ORD-ABC123' }
    ],
    responses: {
      '200 OK': `{
  "status": "success",
  "data": {
    "order_code": "ORD-ABC123",
    "status": "in_use",
    "quantity": 5,
    "delivered_quantity": 5,
    "price_per_unit": 80000,
    "total_amount": 400000,
    "created_at": "2026-03-14T10:00:00Z",
    "proxies": [
      {
        "api_key": "G5aTZVGtrHPRL1YUhBUSfPx",
        "proxy": "27.66.201.201:20814:user:pass",
        "expired_at": "2026-04-13T10:00:00Z",
        "status": "active"
      }
    ]
  }
}`,
      '404 ERROR': `{
  "error": "order_not_found",
  "message": "Order not found."
}`
    },
    statusCodes: ['200 OK', '404 ERROR']
  },

  // ═══════════════════════════════════════
  // ACCOUNT — Thông tin tài khoản
  // ═══════════════════════════════════════
  {
    id: 'check-balance',
    title: 'Kiểm Tra Số Dư',
    method: 'GET',
    endpoint: `${API_BASE}/balance`,
    description: 'Lấy số dư tài khoản hiện tại.',
    category: 'account',
    auth: 'x_api_key',
    responses: {
      '200 OK': `{
  "status": "success",
  "balance": 1500000
}`,
      '401 ERROR': `{
  "error": "invalid_credentials",
  "message": "Invalid API key."
}`
    },
    statusCodes: ['200 OK', '401 ERROR']
  },

  {
    id: 'get-transactions',
    title: 'Lịch Sử Giao Dịch',
    method: 'GET',
    endpoint: `${API_BASE}/transactions`,
    description: 'Lấy lịch sử giao dịch (nạp tiền, thanh toán, hoàn tiền...).',
    category: 'account',
    auth: 'x_api_key',
    parameters: [
      { name: 'type', type: 'string', required: false, description: 'Lọc theo loại giao dịch', example: 'THANHTOAN' },
      { name: 'per_page', type: 'integer', required: false, description: 'Số kết quả mỗi trang (mặc định 20)', example: '20' }
    ],
    responses: {
      '200 OK': `{
  "status": "success",
  "data": {
    "current_page": 1,
    "data": [
      {
        "id": 1,
        "type": "THANHTOAN",
        "noidung": "Mua proxy: Proxy Xoay VN x5 (30 ngày)",
        "sotienthaydoi": -400000,
        "sotiensau": 1100000,
        "thoigian": "2026-03-14T10:00:00Z"
      }
    ]
  }
}`,
      '401 ERROR': `{
  "error": "invalid_credentials",
  "message": "Invalid API key."
}`
    },
    statusCodes: ['200 OK', '401 ERROR']
  }
]
