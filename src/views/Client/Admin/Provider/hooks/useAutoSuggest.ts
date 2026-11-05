export interface Suggestion {
  id: string
  label: string
  detail: string
  field: string    // form field path (relative to prefix)
  value: any
}

function getByDotPath(obj: any, path: string): any {
  return path.split('.').reduce((curr, key) => curr?.[key], obj)
}

function findArraysInObject(obj: any, parentPath = ''): { path: string; value: any[] }[] {
  const results: { path: string; value: any[] }[] = []
  if (!obj || typeof obj !== 'object') return results

  for (const [key, value] of Object.entries(obj)) {
    const fullPath = parentPath ? `${parentPath}.${key}` : key
    if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object') {
      results.push({ path: fullPath, value })
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      results.push(...findArraysInObject(value, fullPath))
    }
  }

  return results
}

function findSuccessField(obj: any, parentPath = ''): { path: string; value: any } | null {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return null

  // Look for common success indicators
  const successPatterns = ['statuscode', 'status_code', 'status', 'success', 'code', 'error', 'ok', 'result']

  for (const [key, value] of Object.entries(obj)) {
    const fullPath = parentPath ? `${parentPath}.${key}` : key
    if (successPatterns.includes(key.toLowerCase())) {
      return { path: fullPath, value }
    }
  }

  // Recurse into nested objects (max 2 levels)
  if (!parentPath.includes('.')) {
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        const found = findSuccessField(value, parentPath ? `${parentPath}.${key}` : key)
        if (found) return found
      }
    }
  }

  return null
}

function detectProxyFormat(sample: any): {
  format: 'key' | 'string' | 'fields' | null
  fields: Record<string, string>
  confidence: string[]
} {
  if (!sample || typeof sample !== 'object') {
    return { format: null, fields: {}, confidence: [] }
  }

  const keys = Object.keys(sample)
  const confidence: string[] = []
  const fields: Record<string, string> = {}

  // Check for key-style proxy (single field with ip:port pattern or known key names)
  for (const k of keys) {
    const v = String(sample[k] ?? '')
    // ip:port:user:pass pattern
    if (/^\d+\.\d+\.\d+\.\d+:\d+/.test(v)) {
      const parts = v.split(':')
      fields.proxy_key_field = k
      confidence.push(`Chuỗi proxy tại "${k}": ${v.substring(0, 40)}`)
      return { format: 'string', fields, confidence }
    }
  }

  // Check for rotation key (keyxoay, key pattern)
  const keyField = keys.find(k => /^(keyxoay|key_xoay|proxykey|proxy_key)$/i.test(k))
  if (keyField) {
    fields.proxy_key_field = keyField
    confidence.push(`Key proxy: "${keyField}" = ${sample[keyField]}`)
    return { format: 'key', fields, confidence }
  }

  // Check for field-style proxy
  const ipField = keys.find(k => /^(ip|host|addr|address|server|ip_address)$/i.test(k))
  const portField = keys.find(k => /^(port|p|http_port|socks_port)$/i.test(k))

  if (ipField && portField) {
    fields.proxy_fields_ip = ipField
    fields.proxy_fields_port = portField

    const userField = keys.find(k => /^(user|username|login|usr|uname)$/i.test(k))
    const passField = keys.find(k => /^(pass|password|pwd|passwd)$/i.test(k))
    const typeField = keys.find(k => /^(type|protocol|loaiproxy|proxy_type)$/i.test(k))

    if (userField) fields.proxy_fields_user = userField
    if (passField) fields.proxy_fields_pass = passField
    if (typeField) fields.proxy_fields_type = typeField

    confidence.push(`Proxy dạng fields: ip="${ipField}", port="${portField}"${userField ? `, user="${userField}"` : ''}${passField ? `, pass="${passField}"` : ''}`)
    return { format: 'fields', fields, confidence }
  }

  // Fallback: check for generic key field
  const genericKey = keys.find(k => /^(key|id_key)$/i.test(k))
  if (genericKey && typeof sample[genericKey] === 'string' && sample[genericKey].length > 5) {
    fields.proxy_key_field = genericKey
    confidence.push(`Có thể là key proxy: "${genericKey}" = ${String(sample[genericKey]).substring(0, 30)}`)
    return { format: 'key', fields, confidence }
  }

  return { format: null, fields: {}, confidence: [] }
}

export function autoSuggestConfig(jsonStr: string): Suggestion[] {
  const suggestions: Suggestion[] = []

  try {
    const data = JSON.parse(jsonStr)

    // === DETECT RESPONSE TYPE ===
    if (Array.isArray(data)) {
      suggestions.push({
        id: 'response_type',
        label: 'Dạng kết quả: Nhiều cặp {} (array)',
        detail: `Mảng ${data.length} phần tử — phần tử cuối chứa trạng thái`,
        field: 'response.type',
        value: 'array_last_status',
      })

      // Success check from last element
      const last = data[data.length - 1]
      if (last && typeof last === 'object') {
        const statusField = findSuccessField(last)
        if (statusField) {
          suggestions.push({
            id: 'success_field',
            label: `Trường kiểm tra: "${statusField.path}" = ${statusField.value}`,
            detail: `Phần tử cuối có trường "${statusField.path}" với giá trị ${JSON.stringify(statusField.value)}`,
            field: 'response.success_field',
            value: statusField.path,
          })
          suggestions.push({
            id: 'success_value',
            label: `Giá trị thành công: ${statusField.value}`,
            detail: '',
            field: 'response.success_value',
            value: statusField.value,
          })
        }
      }

      // Proxy detection from first element
      if (data.length > 1) {
        const sample = data[0]
        const proxyInfo = detectProxyFormat(sample)
        if (proxyInfo.format) {
          suggestions.push({
            id: 'proxy_format',
            label: `Proxy dạng: ${proxyInfo.format === 'key' ? 'key xoay' : proxyInfo.format === 'string' ? 'chuỗi ip:port' : 'nhiều trường riêng'}`,
            detail: proxyInfo.confidence.join(', '),
            field: 'response.proxy_format',
            value: proxyInfo.format,
          })
          // Add individual field suggestions
          for (const [fieldKey, fieldValue] of Object.entries(proxyInfo.fields)) {
            suggestions.push({
              id: `proxy_${fieldKey}`,
              label: `${fieldKey}: "${fieldValue}"`,
              detail: `Gợi ý từ response`,
              field: `response.${fieldKey}`,
              value: fieldValue,
            })
          }

          // Item ID detection
          const idField = Object.keys(sample).find(k => /^(id|proxy_id|idproxy|item_id|order_id)$/i.test(k))
          if (idField) {
            suggestions.push({
              id: 'item_id',
              label: `ID proxy: "${idField}" = ${sample[idField]}`,
              detail: 'Mã proxy phía NCC, dùng cho gia hạn/xoay',
              field: 'response.item_id_field',
              value: idField,
            })
          }
        }
      }
    } else if (typeof data === 'object' && data !== null) {
      // Object response
      suggestions.push({
        id: 'response_type',
        label: 'Dạng kết quả: 1 object duy nhất',
        detail: '',
        field: 'response.type',
        value: 'object',
      })

      // Success field
      const statusField = findSuccessField(data)
      if (statusField) {
        suggestions.push({
          id: 'success_field',
          label: `Trường kiểm tra: "${statusField.path}" = ${statusField.value}`,
          detail: '',
          field: 'response.success_field',
          value: statusField.path,
        })
        suggestions.push({
          id: 'success_value',
          label: `Giá trị thành công: ${statusField.value}`,
          detail: '',
          field: 'response.success_value',
          value: statusField.value,
        })
      }

      // Find proxy arrays
      const arrays = findArraysInObject(data)
      if (arrays.length === 1) {
        const arr = arrays[0]
        suggestions.push({
          id: 'proxies_path',
          label: `Danh sách proxy tại: "${arr.path}" (${arr.value.length} items)`,
          detail: '',
          field: 'response.proxies_path',
          value: arr.path,
        })

        // Proxy format from first item
        const sample = arr.value[0]

        suggestions.push({
          id: 'proxies_shape',
          label: sample !== null && typeof sample === 'object' ? 'Giá trị là mảng, mỗi phần tử là object' : 'Giá trị là mảng, mỗi phần tử là chuỗi',
          detail: '',
          field: 'response.proxies_shape',
          value: sample !== null && typeof sample === 'object' ? 'list_object' : 'list_string',
        })

        const proxyInfo = detectProxyFormat(sample)
        if (proxyInfo.format) {
          suggestions.push({
            id: 'proxy_format',
            label: `Proxy dạng: ${proxyInfo.format === 'key' ? 'key xoay' : proxyInfo.format === 'string' ? 'chuỗi ip:port' : 'nhiều trường riêng'}`,
            detail: proxyInfo.confidence.join(', '),
            field: 'response.proxy_format',
            value: proxyInfo.format,
          })
          for (const [fieldKey, fieldValue] of Object.entries(proxyInfo.fields)) {
            suggestions.push({
              id: `proxy_${fieldKey}`,
              label: `${fieldKey}: "${fieldValue}"`,
              detail: '',
              field: `response.${fieldKey}`,
              value: fieldValue,
            })
          }

          const idField = Object.keys(sample).find(k => /^(id|proxy_id|idproxy|item_id)$/i.test(k))
          if (idField) {
            suggestions.push({
              id: 'item_id',
              label: `ID proxy: "${idField}"`,
              detail: '',
              field: 'response.item_id_field',
              value: idField,
            })
          }
        }
      } else if (arrays.length > 1) {
        // Multiple arrays — let admin choose
        arrays.forEach((arr, i) => {
          suggestions.push({
            id: `proxies_path_${i}`,
            label: `Mảng tìm thấy: "${arr.path}" (${arr.value.length} items)`,
            detail: 'Chọn nếu đây là danh sách proxy',
            field: 'response.proxies_path',
            value: arr.path,
          })
        })
      }

      // Detect deferred mode (no proxy array but has ID-like field)
      if (arrays.length === 0) {
        const idLikeFields = ['id', 'order_id', 'orderId', 'request_id']
        for (const path of idLikeFields) {
          const found = getByDotPath(data, path) ?? getByDotPath(data, `data.${path}`)
          if (found !== undefined) {
            const fullPath = getByDotPath(data, path) !== undefined ? path : `data.${path}`
            suggestions.push({
              id: 'deferred_hint',
              label: `Có thể là deferred: mã đơn tại "${fullPath}" = ${found}`,
              detail: 'Không tìm thấy mảng proxy — NCC có thể trả mã đơn, cần poll proxy sau',
              field: 'response_mode',
              value: 'deferred',
            })
            break
          }
        }
      }
    }
  } catch {
    // Invalid JSON — no suggestions
  }

  return suggestions
}
