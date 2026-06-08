/**
 * Hằng số cấu hình proxy (FE) — đồng bộ với BE app/Constants/ProxyConfig.php.
 * Dùng thay string literal để đổi 1 chỗ không sót.
 */

// ServiceType.proxy_type
export const PROXY_TYPE = {
  RESIDENTIAL: 'residential',
  DATACENTER: 'datacenter',
} as const

// Provider api_config.kind / SP metadata.kind
export const KIND_RESIDENTIAL = 'residential'

// response.proxy_format
export const PROXY_FORMAT = {
  KEY: 'key',
  STRING: 'string',
  FIELDS: 'fields',
  AUTH_STRING: 'auth_string',
} as const

// custom_field.stage (NCC 2-bước: mua / lấy proxy)
export const STAGE = {
  BUY: 'buy',
  FETCH: 'fetch',
} as const

// custom_field.type
export const FIELD_TYPE_COMBO = 'combo'

// ServiceType.metadata.price_quantity_mode
export const PRICE_QUANTITY_MODE = {
  MULTIPLY: 'multiply',
  PACKAGE: 'package',
} as const
