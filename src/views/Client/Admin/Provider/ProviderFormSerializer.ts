import type {
  FormValues, ApiConfigBuy, RenewParamRow, DurationMapRow, InheritParam,
  RenewParamConfig, ParamsMappingEntry, ParamsMappingValueMap,
  ErrorCodeRule, HttpErrorRule, ResponseMappingRule,
} from './ProviderFormTypes'
import { defaultBuy, defaultFetchProxies, defaultValues, SYSTEM_VARS, VALUE_MAP } from './ProviderFormTypes'

// ─── Helpers ────────────────────────────────────────

/** Deserialize renew config → renew_params thống nhất
 *  Ưu tiên: renew_params (format mới) > fallback từ params/duration_param/inherit_params (format cũ)
 */
export function deserializeRenewParams(renew: any): RenewParamConfig[] {
  // Format mới — đã lưu renew_params đầy đủ (có validate config)
  if (Array.isArray(renew.renew_params) && renew.renew_params.length > 0) {
    return renew.renew_params
  }

  // Fallback — deserialize từ format cũ
  const result: RenewParamConfig[] = []

  // 1. params{} → source=default hoặc source=order_items (provider_order_code/provider_item_id)
  if (renew.params && typeof renew.params === 'object') {
    Object.entries(renew.params).forEach(([param, value]) => {
      const strVal = String(value)
      if (strVal === '{provider_order_code}') {
        result.push({ param, source: 'order_items', field: 'provider_order_code', field_label: 'Mã đơn NCC' })
      } else if (strVal === '{provider_item_id}') {
        result.push({ param, source: 'order_items', field: 'provider_item_id', field_label: 'ID item NCC' })
      } else if (strVal === '{duration}') {
        result.push({ param, source: 'user_input', input_type: 'number', input_label: 'Số ngày gia hạn', is_duration: true })
      } else {
        result.push({ param, source: 'default', value: strVal })
      }
    })
  }

  // 2. duration_param → nếu chưa có trong params, thêm vào
  if (renew.duration_param) {
    const hasDuration = result.some(r => r.is_duration || r.param === renew.duration_param)
    if (!hasDuration) {
      result.push({ param: renew.duration_param, source: 'user_input', input_type: 'number', input_label: 'Số ngày gia hạn', is_duration: true })
    }
  }

  // 3. inherit_params[] → source=orders hoặc source=order_items
  if (Array.isArray(renew.inherit_params)) {
    renew.inherit_params.forEach((ip: any) => {
      result.push({
        param: ip.param || ip.field,
        source: ip.source === 'order' ? 'orders' : 'order_items',
        field: ip.field,
        field_label: ip.field,
      })
    })
  }

  return result
}

/** Serialize renew_params thống nhất → format cũ (BE) + format mới (FE config)
 *  - params/duration_param/inherit_params: BE đọc → logic gia hạn
 *  - renew_params: FE đọc khi load edit → giữ validate config (min/max/options)
 */
export function serializeRenewParams(params: RenewParamConfig[]): {
  params: Record<string, string>
  duration_param: string
  inherit_params: InheritParam[]
  renew_params: RenewParamConfig[]
} {
  const resultParams: Record<string, string> = {}
  let durationParam = ''
  const inheritParams: InheritParam[] = []

  params.filter(p => p.param).forEach(p => {
    switch (p.source) {
      case 'order_items':
        if (p.field === 'provider_order_code') {
          resultParams[p.param] = '{provider_order_code}'
        } else if (p.field === 'provider_item_id') {
          resultParams[p.param] = '{provider_item_id}'
        } else {
          // Custom field từ order_items → inherit_params
          inheritParams.push({ source: 'order_item', field: p.field || '', param: p.param })
        }
        break
      case 'orders':
        inheritParams.push({ source: 'order', field: p.field || '', param: p.param })
        break
      case 'user_input':
        if (p.is_duration) {
          durationParam = p.param
        } else {
          // User input khác → tạm lưu như custom (BE chưa hỗ trợ user_input khác duration)
          resultParams[p.param] = `{${p.param}}`
        }
        break
      case 'default':
        resultParams[p.param] = p.value || ''
        break
    }
  })

  return {
    params: resultParams,
    duration_param: durationParam,
    inherit_params: inheritParams,
    renew_params: params.filter(p => p.param),  // Format mới — giữ đầy đủ validate config
  }
}

// Legacy helper — giữ cho code cũ nếu cần
export function deserializeParamsRows(params: Record<string, string>): RenewParamRow[] {
  return Object.entries(params).map(([param_name, value]) => ({
    param_name,
    value_type: SYSTEM_VARS[value] || 'custom',
    custom_value: SYSTEM_VARS[value] ? '' : String(value),
  }))
}

// ─── Parse (DB → Form) ─────────────────────────────

export function parseBuySection(buy: any): ApiConfigBuy {
  if (!buy) return { ...defaultBuy }

  const buyResp = buy.response || {}
  const proxyFields = buyResp.proxy_fields || {}
  const urlByDuration = buy.url_by_duration || {}
  const durationMap = buy.duration_map || {}

  return {
    enabled: true,
    method: buy.method || 'GET',
    url: buy.url || '',
    // Dynamic duration URLs
    duration_urls: Object.keys(urlByDuration).length > 0
      ? Object.entries(urlByDuration).map(([days, url]) => ({ days, url: String(url || '') }))
      : [],
    use_url_by_duration: !!buy.url_by_duration,
    auth_type: buy.auth_type || 'query',
    auth_param: buy.auth_param || 'key',
    params_json: buy.params ? JSON.stringify(buy.params) : '',
    quantity_param: buy.quantity_param || 'soluong',
    double_ampersand: buy.double_ampersand || false,
    duration_param: buy.duration_param || '',
    duration_map_1: durationMap['1'] || '',
    duration_map_7: durationMap['7'] || '',
    duration_map_30: durationMap['30'] || '',
    user_override_enabled: !!buy.user_override,
    user_override_user_param: buy.user_override?.user_param || 'user',
    user_override_pass_param: buy.user_override?.pass_param || 'password',
    protocol_override_enabled: !!buy.protocol_override,
    protocol_override_param: buy.protocol_override?.param || 'type',
    protocol_override_http: buy.protocol_override?.map?.http || 'HTTP',
    protocol_override_socks5: buy.protocol_override?.map?.socks5 || 'SOCKS5',
    params_mapping_enabled: Array.isArray(buy.params_mapping) && buy.params_mapping.length > 0,
    params_mapping: Array.isArray(buy.params_mapping)
      ? buy.params_mapping.map((entry: any) => ({
          variable: entry.variable || '',
          param: entry.param || '',
          value_map: entry.value_map && typeof entry.value_map === 'object' && !Array.isArray(entry.value_map)
            ? Object.entries(entry.value_map).map(([from, to]) => ({ from, to: String(to) }))
            : Array.isArray(entry.value_map) ? entry.value_map : [],
          default_value: entry.default != null ? String(entry.default) : '',
          format: entry.format || 'comma',
        }))
      : [],
    response_mode: buy.response_mode || 'immediate',
    fetch_proxies: (() => {
      const fp = buy.fetch_proxies
      if (!fp) return { ...defaultFetchProxies }
      const fpResp = fp.response || {}
      const fpFields = fpResp.proxy_fields || {}
      const pg = fp.pagination || null
      return {
        url: fp.url || '',
        method: fp.method || 'GET',
        auth_type: fp.auth_type ? fp.auth_type : 'inherit',
        auth_param: fp.auth_param || '',
        order_code_mode: fp.order_code_param ? 'param' : ((fp.url || '').includes('{') ? 'path' : 'param'),
        order_code_param: fp.order_code_param || '',
        default_params: fp.params ? JSON.stringify(fp.params) : '',
        response_type: fpResp.type || 'object',
        success_field: fpResp.success_field || '',
        success_value: fpResp.success_value != null ? String(fpResp.success_value) : '',
        proxies_path: fpResp.proxies_path || 'data.proxies',
        proxy_format: fpResp.proxy_format || 'fields',
        proxy_key_field: fpResp.proxy_key_field || fpResp.proxy_string_field || '',
        proxy_fields_ip: fpFields.ip || 'ip',
        proxy_fields_port: fpFields.port || 'port',
        proxy_fields_user: fpFields.user || 'user',
        proxy_fields_pass: fpFields.pass || 'pass',
        proxy_fields_type: fpFields.type || '',
        item_id_field: fpResp.item_id_field || '',
        pagination_enabled: !!pg,
        page_param: pg?.page_param || 'page',
        per_page_param: pg?.per_page_param || 'per_page',
        per_page: pg?.per_page ? String(pg.per_page) : '50',
        last_page_path: pg?.last_page_path || 'data.last_page',
      }
    })(),
    response: {
      type: buyResp.type || 'array_last_status',
      success_field: buyResp.success_field || 'statusCode',
      success_value: buyResp.success_value ?? 200,
      success_check: buyResp.success_check || 'last',
      error_message_field: buyResp.error_message_field || '',
      error_codes: (buyResp.error_codes || []).map((r: any) => ({
        field: r.field || '',
        value: r.value != null ? String(r.value) : '',
        match: r.match || 'exact',
        message: r.message || '',
      })),
      http_errors: (() => {
        const he = buyResp.http_errors
        if (!he || typeof he !== 'object') return []
        return Object.entries(he).map(([status, message]) => ({ status, message: String(message) }))
      })(),
      fallback_message: buyResp.fallback_message || '',
      proxies_path: (buy.response_mode === 'deferred' ? buyResp.order_id_field : buyResp.proxies_path) || 'data.proxies',
      proxy_format: buyResp.proxy_format || 'key',
      proxy_key_field: buyResp.proxy_key_field || buyResp.proxy_string_field || 'keyxoay',
      proxy_fields_ip: proxyFields.ip || '',
      proxy_fields_port: proxyFields.port || '',
      proxy_fields_user: proxyFields.user || '',
      proxy_fields_pass: proxyFields.pass || '',
      proxy_fields_type: proxyFields.type || '',
      item_id_field: buyResp.item_id_field || '',
      save_provider_key: buyResp.save_provider_key !== false,
      save_proxy: buyResp.save_proxy !== false,
      save_item_id: buyResp.save_item_id !== false,
      response_mapping: Array.isArray(buyResp.response_mapping)
        ? buyResp.response_mapping.map((r: any) => ({ from: r.from || '', to: r.to || '', store: r.store || 'metadata', save_as: r.save_as || 'raw' }))
        : [],
    }
  }
}

export function parseApiConfig(apiConfig: any): Partial<FormValues> {
  if (!apiConfig) return {}

  const rotate = apiConfig.rotate || {}
  const ipCfg = apiConfig.ip_whitelist || {}

  const buyRotating = apiConfig.buy_rotating || apiConfig.buy || null
  const buyStatic = apiConfig.buy_static || null

  return {
    buy_rotating: parseBuySection(buyRotating),
    buy_static: parseBuySection(buyStatic),
    rotate: {
      enabled: !!apiConfig.rotate,
      method: rotate.method || 'GET',
      url: rotate.url || '',
      auth_type: rotate.auth_type || 'query',
      auth_param: rotate.auth_param || 'key',
      key_source: rotate.key_source || 'key',
      params_json: rotate.params ? JSON.stringify(rotate.params) : '',
      response_http: rotate.response?.proxy_fields?.http || 'http',
      response_socks5: rotate.response?.proxy_fields?.socks5 || 'socks5',
      double_ampersand: rotate.double_ampersand || false,
      rotate_params: Array.isArray(rotate.rotate_params)
        ? rotate.rotate_params.map((rp: any) => ({
            param: rp.param || '', source: rp.source || 'order_items',
            field: rp.field || '', value: rp.value || '', send_as: rp.send_as || 'raw',
          }))
        : [],
    },
    ip_whitelist: {
      enabled: !!apiConfig.ip_whitelist,
      mode: ipCfg.mode || 'on_rotate',
      max_ips: ipCfg.max_ips || 1,
      param: ipCfg.param || 'ip',
      param_format: ipCfg.param_format || 'single',
    },
    renew: (() => {
      const r = apiConfig.renew
      if (!r) return { ...defaultValues.renew }
      const resp = r.response || {}
      return {
        enabled: true,
        mode: r.mode || 'by_order',
        url: r.url || '',
        method: r.method || 'POST',
        auth_type: r.auth_type || 'inherit',
        auth_param: r.auth_param || '',
        renew_params: deserializeRenewParams(r),
        duration_map_override: !!r.duration_map && Object.keys(r.duration_map).length > 0,
        duration_map_rows: r.duration_map ? Object.entries(r.duration_map).map(([days, v]) => ({ days, send_value: String(v) })) : [],
        response_mode: r.response_mode || 'immediate',
        success_field: resp.success_field || '',
        success_value: resp.success_value != null ? String(resp.success_value) : '',
        new_expiry_field: resp.new_expiry_field || '',
        batch_delay_ms: r.batch_delay_ms ? String(r.batch_delay_ms) : '0',
      }
    })(),
  }
}

// ─── Build (Form → DB) ─────────────────────────────

export function buildBuySection(buy: ApiConfigBuy): object | null {
  if (!buy.enabled) return null

  const hasDurationUrls = buy.duration_urls?.some((d: any) => d.days && d.url)
  const hasUrl = buy.url || hasDurationUrls
  if (!hasUrl) return null

  const result: any = {
    method: buy.method,
    auth_type: buy.auth_type,
    auth_param: buy.auth_param,
    quantity_param: buy.quantity_param,
  }

  if (buy.use_url_by_duration && buy.duration_urls) {
    result.url_by_duration = {} as any
    buy.duration_urls.forEach((d: any) => {
      if (d.days && d.url) {
        result.url_by_duration[String(d.days)] = d.url
      }
    })
  } else if (buy.url) {
    result.url = buy.url
  }

  if (buy.params_json) {
    try { result.params = JSON.parse(buy.params_json) } catch { /* skip */ }
  }

  if (buy.double_ampersand) result.double_ampersand = true

  if (buy.duration_param) {
    result.duration_param = buy.duration_param
    const hasMap = buy.duration_map_1 || buy.duration_map_7 || buy.duration_map_30
    if (hasMap) {
      result.duration_map = {} as any
      if (buy.duration_map_1) result.duration_map['1'] = buy.duration_map_1
      if (buy.duration_map_7) result.duration_map['7'] = buy.duration_map_7
      if (buy.duration_map_30) result.duration_map['30'] = buy.duration_map_30
    }
  }

  if (buy.user_override_enabled) {
    result.user_override = {
      user_param: buy.user_override_user_param || 'user',
      pass_param: buy.user_override_pass_param || 'password',
    }
  }

  if (buy.protocol_override_enabled) {
    result.protocol_override = {
      param: buy.protocol_override_param || 'type',
      map: {
        http: buy.protocol_override_http || 'HTTP',
        socks5: buy.protocol_override_socks5 || 'SOCKS5',
      }
    }
  }

  // Params mapping — biến chuẩn → param NCC
  if (buy.params_mapping_enabled && buy.params_mapping?.length > 0) {
    const validMapping = buy.params_mapping.filter((e: ParamsMappingEntry) => e.variable && e.param)
    if (validMapping.length > 0) {
      result.params_mapping = validMapping.map((e: ParamsMappingEntry) => {
        const entry: any = { variable: e.variable, param: e.param }

        // value_map: array → object { "http": "1", "socks5": "2" }
        const validVm = (e.value_map || []).filter((vm: ParamsMappingValueMap) => vm.from && vm.to)
        if (validVm.length > 0) {
          entry.value_map = Object.fromEntries(validVm.map((vm: ParamsMappingValueMap) => [vm.from, vm.to]))
        }

        if (e.default_value) entry.default = e.default_value
        if (e.format && e.format !== 'comma') entry.format = e.format

        return entry
      })
    }
  }

  const resp: any = {
    type: buy.response.type,
    proxy_format: buy.response.proxy_format,
  }

  if (buy.response.success_field) resp.success_field = buy.response.success_field
  if (buy.response.success_value !== '') resp.success_value = Number(buy.response.success_value)
  if (buy.response.type === 'array_last_status' && buy.response.success_check) {
    resp.success_check = buy.response.success_check
  }
  if (buy.response.error_message_field) resp.error_message_field = buy.response.error_message_field
  if (buy.response.fallback_message) resp.fallback_message = buy.response.fallback_message

  const validErrorCodes = buy.response.error_codes.filter((r: ErrorCodeRule) => r.field && r.value && r.message)
  if (validErrorCodes.length > 0) {
    resp.error_codes = validErrorCodes.map((r: ErrorCodeRule) => ({
      field: r.field,
      value: r.match === 'contains' ? r.value : (isNaN(Number(r.value)) ? r.value : Number(r.value)),
      match: r.match,
      message: r.message,
    }))
  }

  const validHttpErrors = buy.response.http_errors.filter((r: HttpErrorRule) => r.status && r.message)
  if (validHttpErrors.length > 0) {
    resp.http_errors = {} as any
    validHttpErrors.forEach((r: HttpErrorRule) => { resp.http_errors[r.status] = r.message })
  }

  if (buy.response.type === 'object' && buy.response.proxies_path) resp.proxies_path = buy.response.proxies_path

  if (buy.response.proxy_format === 'key' && buy.response.proxy_key_field) {
    resp.proxy_key_field = buy.response.proxy_key_field
  }

  if (buy.response.proxy_format === 'string' && buy.response.proxy_key_field) {
    resp.proxy_string_field = buy.response.proxy_key_field
  }

  if (buy.response.proxy_format === 'fields') {
    resp.proxy_fields = {} as any
    if (buy.response.proxy_fields_ip) resp.proxy_fields.ip = buy.response.proxy_fields_ip
    if (buy.response.proxy_fields_port) resp.proxy_fields.port = buy.response.proxy_fields_port
    if (buy.response.proxy_fields_user) resp.proxy_fields.user = buy.response.proxy_fields_user
    if (buy.response.proxy_fields_pass) resp.proxy_fields.pass = buy.response.proxy_fields_pass
    if (buy.response.proxy_fields_type) resp.proxy_fields.type = buy.response.proxy_fields_type
  }

  if (buy.response.item_id_field) resp.item_id_field = buy.response.item_id_field

  // Toggle lưu field mặc định — chỉ ghi vào config khi tắt (false), mặc định = true
  if (buy.response.save_provider_key === false) resp.save_provider_key = false
  if (buy.response.save_proxy === false) resp.save_proxy = false
  if (buy.response.save_item_id === false) resp.save_item_id = false

  const validMapping = buy.response.response_mapping.filter((r: ResponseMappingRule) => r.from && r.to)
  if (validMapping.length > 0) {
    resp.response_mapping = validMapping.map((r: ResponseMappingRule) => ({
      from: r.from, to: r.to,
      store: (!r.store || r.store === '_custom_') ? 'metadata' : r.store,
      ...(r.save_as && r.save_as !== 'raw' ? { save_as: r.save_as } : {}),
    }))
  }

  if (buy.response_mode === 'deferred') {
    result.response_mode = 'deferred'
    resp.order_id_field = buy.response.proxies_path || 'data.id'
    delete resp.proxies_path

    const fp = buy.fetch_proxies
    if (fp.url) {
      const fetchResult: any = {
        url: fp.url,
        method: fp.method || 'GET',
      }

      if (fp.order_code_param) fetchResult.order_code_param = fp.order_code_param

      if (fp.default_params) {
        try {
          const parsed = JSON.parse(fp.default_params)

          if (typeof parsed === 'object' && parsed !== null) fetchResult.params = parsed
        } catch { /* ignore invalid JSON */ }
      }

      if (fp.auth_type !== 'inherit') {
        fetchResult.auth_type = fp.auth_type
        if (fp.auth_param) fetchResult.auth_param = fp.auth_param
      }

      const fpResp: any = {}
      if (fp.response_type) fpResp.type = fp.response_type
      if (fp.success_field) fpResp.success_field = fp.success_field
      if (fp.success_value !== '') {
        const numVal = Number(fp.success_value)
        fpResp.success_value = isNaN(numVal) ? fp.success_value : numVal
      }
      if (fp.response_type === 'object' && fp.proxies_path) fpResp.proxies_path = fp.proxies_path
      fpResp.proxy_format = fp.proxy_format || 'fields'

      if (fp.proxy_format === 'key' && fp.proxy_key_field) {
        fpResp.proxy_key_field = fp.proxy_key_field
      }
      if (fp.proxy_format === 'string' && fp.proxy_key_field) {
        fpResp.proxy_string_field = fp.proxy_key_field
      }
      if (fp.proxy_format === 'fields') {
        fpResp.proxy_fields = {} as any
        if (fp.proxy_fields_ip) fpResp.proxy_fields.ip = fp.proxy_fields_ip
        if (fp.proxy_fields_port) fpResp.proxy_fields.port = fp.proxy_fields_port
        if (fp.proxy_fields_user) fpResp.proxy_fields.user = fp.proxy_fields_user
        if (fp.proxy_fields_pass) fpResp.proxy_fields.pass = fp.proxy_fields_pass
        if (fp.proxy_fields_type) fpResp.proxy_fields.type = fp.proxy_fields_type
      }
      if (fp.item_id_field) fpResp.item_id_field = fp.item_id_field

      fetchResult.response = fpResp

      if (fp.pagination_enabled) {
        fetchResult.pagination = {
          page_param: fp.page_param || 'page',
          per_page_param: fp.per_page_param || 'per_page',
          per_page: parseInt(fp.per_page) || 50,
          last_page_path: fp.last_page_path || 'data.last_page',
        }
      }

      result.fetch_proxies = fetchResult
    }
  }

  result.response = resp

  return result
}

export function buildApiConfig(form: FormValues): object | null {
  const config: any = {}

  const buyRotating = buildBuySection(form.buy_rotating)
  const buyStatic = buildBuySection(form.buy_static)

  // Chỉ gửi section có data — section không gửi → BE merge giữ nguyên cũ
  if (buyRotating) config.buy_rotating = buyRotating
  if (buyStatic) config.buy_static = buyStatic

  if (form.rotate.enabled) {
    config.rotate = {
      method: form.rotate.method,
      url: form.rotate.url,
      auth_type: form.rotate.auth_type,
      auth_param: form.rotate.auth_param,
      key_source: form.rotate.key_source,
      ...(form.rotate.params_json ? { params: (() => { try { return JSON.parse(form.rotate.params_json) } catch { return undefined } })() } : {}),
      double_ampersand: form.rotate.double_ampersand || undefined,
      response: {
        proxy_fields: {
          http: form.rotate.response_http || 'http',
          socks5: form.rotate.response_socks5 || 'socks5',
        }
      },
      ...(form.rotate.rotate_params?.length ? {
        rotate_params: form.rotate.rotate_params
          .filter(rp => rp.param && (rp.source === 'default' ? rp.value : rp.field))
          .map(rp => ({
            param: rp.param, source: rp.source,
            ...(rp.source === 'order_items' ? { field: rp.field } : { value: rp.value }),
            ...(rp.send_as !== 'raw' ? { send_as: rp.send_as } : {}),
          }))
      } : {}),
    }
  }

  if (form.ip_whitelist.enabled) {
    config.ip_whitelist = {
      mode: form.ip_whitelist.mode,
      max_ips: Number(form.ip_whitelist.max_ips) || 1,
      param: form.ip_whitelist.param,
      param_format: form.ip_whitelist.param_format,
    }
  }

  if (form.renew.enabled && form.renew.url) {
    const r: any = {
      mode: form.renew.mode,
      url: form.renew.url,
      method: form.renew.method,
    }
    if (form.renew.auth_type !== 'inherit') {
      r.auth_type = form.renew.auth_type
      if (form.renew.auth_param) r.auth_param = form.renew.auth_param
    }

    // Serialize renew_params → format cũ (backward compatible)
    const serialized = serializeRenewParams(form.renew.renew_params || [])
    // Format cũ — BE đọc
    if (Object.keys(serialized.params).length > 0) r.params = serialized.params
    if (serialized.duration_param) r.duration_param = serialized.duration_param
    if (serialized.inherit_params.length > 0) r.inherit_params = serialized.inherit_params

    // Format mới — FE đọc khi load edit (giữ validate config: min/max/options/input_type)
    if (serialized.renew_params.length > 0) r.renew_params = serialized.renew_params

    // Duration map
    if (form.renew.duration_map_override) {
      const validMap = (form.renew.duration_map_rows || []).filter((d: DurationMapRow) => d.days)
      if (validMap.length > 0) {
        r.duration_map = Object.fromEntries(validMap.map((d: DurationMapRow) => [d.days, d.send_value]))
      }
    }

    if (form.renew.response_mode === 'deferred') r.response_mode = 'deferred'
    if (parseInt(form.renew.batch_delay_ms) > 0) r.batch_delay_ms = parseInt(form.renew.batch_delay_ms)

    const resp: any = {}
    if (form.renew.success_field) resp.success_field = form.renew.success_field
    if (form.renew.success_value !== '') {
      const numVal = Number(form.renew.success_value)
      resp.success_value = isNaN(numVal) ? form.renew.success_value : numVal
    }
    if (form.renew.new_expiry_field) resp.new_expiry_field = form.renew.new_expiry_field
    if (Object.keys(resp).length > 0) r.response = resp

    config.renew = r
  }

  return Object.keys(config).length > 0 ? config : null
}
