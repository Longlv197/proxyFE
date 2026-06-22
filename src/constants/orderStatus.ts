/**
 * Order Status Constants
 * Định nghĩa các trạng thái đơn hàng — đồng bộ với BE Order::STATUS_KEY
 */

export const ORDER_STATUS = {
  PENDING: '0',            // Chờ xử lý
  PROCESSING: '1',         // Đang xử lý
  IN_USE: '2',             // Đang sử dụng (đủ proxy)
  IN_USE_PARTIAL: '3',     // Đang sử dụng (thiếu proxy)
  EXPIRED: '4',            // Hết hạn
  FAILED: '5',             // Thất bại
  PARTIAL_REFUNDED: '6',   // Hoàn tiền 1 phần
  WAITING_REFUND: '7',     // Chờ hoàn tiền
  REFUNDED_ALL: '8',       // Hoàn tiền toàn bộ
  RETRY_PROCESSING_PARTIAL: '9',   // Đang mua bù (retry partial)
  AWAITING_PROVIDER: '10',          // Đã gọi provider, chờ provider trả proxy
  AWAITING_RENEWAL: '11',           // Đang chờ gia hạn
  RENEWAL_FAILED: '12',             // Gia hạn thất bại
} as const

export type OrderStatusType = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS]

/**
 * Order Status Labels — nhãn hiển thị cho user
 */
export const ORDER_STATUS_LABELS: Record<string, string> = {
  [ORDER_STATUS.PENDING]: 'Chờ xử lý',
  [ORDER_STATUS.PROCESSING]: 'Đang tạo proxy',
  [ORDER_STATUS.IN_USE]: 'Có thể sử dụng',
  [ORDER_STATUS.IN_USE_PARTIAL]: 'Thiếu proxy',
  [ORDER_STATUS.EXPIRED]: 'Hết hạn',
  [ORDER_STATUS.FAILED]: 'Đang xử lý',
  [ORDER_STATUS.PARTIAL_REFUNDED]: 'Đã hoàn tiền 1 phần',
  [ORDER_STATUS.WAITING_REFUND]: 'Chờ hoàn tiền',
  [ORDER_STATUS.REFUNDED_ALL]: 'Đã hoàn tiền',
  [ORDER_STATUS.RETRY_PROCESSING_PARTIAL]: 'Đang tạo proxy',
  [ORDER_STATUS.AWAITING_PROVIDER]: 'Chờ tạo proxy',
  [ORDER_STATUS.AWAITING_RENEWAL]: 'Đang gia hạn',
  [ORDER_STATUS.RENEWAL_FAILED]: 'Gia hạn thất bại',
}

/**
 * Order Status Labels cho Admin — phân biệt retry vs processing
 */
export const ORDER_STATUS_LABELS_ADMIN: Record<string, string> = {
  ...ORDER_STATUS_LABELS,
  [ORDER_STATUS.FAILED]: 'Thất bại',
  [ORDER_STATUS.RETRY_PROCESSING_PARTIAL]: 'Đang mua bù',
  [ORDER_STATUS.AWAITING_PROVIDER]: 'Chờ đối tác',
  [ORDER_STATUS.AWAITING_RENEWAL]: 'Đang gia hạn',
  [ORDER_STATUS.RENEWAL_FAILED]: 'Gia hạn thất bại',
}

/**
 * Order Status Colors
 * Màu sắc tương ứng với mỗi trạng thái (dùng cho Chip MUI)
 */
export const ORDER_STATUS_COLORS: Record<string, string> = {
  [ORDER_STATUS.PENDING]: 'info',
  [ORDER_STATUS.PROCESSING]: 'warning',
  [ORDER_STATUS.IN_USE]: 'success',
  [ORDER_STATUS.IN_USE_PARTIAL]: 'error',
  [ORDER_STATUS.EXPIRED]: 'secondary',
  [ORDER_STATUS.FAILED]: 'warning',
  [ORDER_STATUS.PARTIAL_REFUNDED]: 'warning',
  [ORDER_STATUS.WAITING_REFUND]: 'info',
  [ORDER_STATUS.REFUNDED_ALL]: 'secondary',
  [ORDER_STATUS.RETRY_PROCESSING_PARTIAL]: 'warning',
  [ORDER_STATUS.AWAITING_PROVIDER]: 'info',
  [ORDER_STATUS.AWAITING_RENEWAL]: 'info',
  [ORDER_STATUS.RENEWAL_FAILED]: 'error',
}

/**
 * Order Status Colors cho Admin — failed hiện đỏ (khác user)
 */
export const ORDER_STATUS_COLORS_ADMIN: Record<string, string> = {
  ...ORDER_STATUS_COLORS,
  [ORDER_STATUS.FAILED]: 'error',
}

/**
 * Transaction Types
 * Loại giao dịch — đồng bộ với BE Dongtien model
 */
export const TRANSACTION_TYPES = {
  BUY: 'BUY',
  REFUND: 'REFUND',
  REFUND_PARTIAL: 'REFUND_PARTIAL',
  REFUND_FULL: 'REFUND_FULL',
  FAILED: 'FAILED',
  NAPTIEN: 'NAPTIEN',
  NAPTIEN_AUTO: 'NAPTIEN_AUTO',
  NAPTIEN_PAY2S: 'NAPTIEN_PAY2S',
  NAPTIEN_MANUAL: 'NAPTIEN_MANUAL',
  THANHTOAN: 'THANHTOAN',
  GIAHAN: 'GIAHAN',
  THANHTOAN_V4: 'THANHTOAN_V4',
  GIAHAN_V4: 'GIAHAN_V4',
  RENEWAL: 'RENEWAL',
  REFUND_RENEWAL: 'REFUND_RENEWAL',
  RUT_HOA_HONG_AFFILIATE: 'RUT_HOA_HONG_AFFILIATE',
  CONG_HOA_HONG_AFFILIATE: 'CONG_HOA_HONG_AFFILIATE'
} as const

export type TransactionType = (typeof TRANSACTION_TYPES)[keyof typeof TRANSACTION_TYPES]

/**
 * Transaction Type Labels — nhãn tiếng Việt cho mỗi loại giao dịch
 */
export const TRANSACTION_TYPE_LABELS: Record<string, string> = {
  [TRANSACTION_TYPES.BUY]: 'Mua proxy',
  [TRANSACTION_TYPES.REFUND]: 'Hoàn tiền',
  [TRANSACTION_TYPES.REFUND_PARTIAL]: 'Hoàn tiền 1 phần',
  [TRANSACTION_TYPES.REFUND_FULL]: 'Hoàn tiền toàn bộ',
  [TRANSACTION_TYPES.FAILED]: 'Thất bại',
  [TRANSACTION_TYPES.NAPTIEN]: 'Nạp tiền',
  [TRANSACTION_TYPES.NAPTIEN_AUTO]: 'Nạp tiền tự động',
  [TRANSACTION_TYPES.NAPTIEN_PAY2S]: 'Nạp tiền (pay2s)',
  [TRANSACTION_TYPES.NAPTIEN_MANUAL]: 'Nạp tiền thủ công',
  [TRANSACTION_TYPES.THANHTOAN]: 'Thanh toán',
  [TRANSACTION_TYPES.GIAHAN]: 'Gia hạn',
  [TRANSACTION_TYPES.THANHTOAN_V4]: 'Thanh toán',
  [TRANSACTION_TYPES.GIAHAN_V4]: 'Gia hạn',
  [TRANSACTION_TYPES.RENEWAL]: 'Gia hạn proxy',
  [TRANSACTION_TYPES.REFUND_RENEWAL]: 'Hoàn tiền gia hạn',
  [TRANSACTION_TYPES.RUT_HOA_HONG_AFFILIATE]: 'Rút hoa hồng',
  [TRANSACTION_TYPES.CONG_HOA_HONG_AFFILIATE]: 'Cộng hoa hồng (Admin)',

  // Deposit types (BankAuto)
  PLUS: 'Nạp tiền',
  MINUS: 'Hoàn tiền'
}
