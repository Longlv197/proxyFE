/**
 * So sánh cấu hình SP: bản CON đang lưu ↔ bản MẸ mới nhất (khi site con đồng bộ/kiểm tra).
 *
 * Trả về danh sách thay đổi để admin XEM trước khi Áp dụng — chặn ghi đè/bỏ khoá lặng lẽ.
 * CHỈ so phần MẸ quyết định (cấu trúc + hành vi), KHÔNG so giá bán (giá là của con tự đặt).
 *
 * Nguồn:
 *  - childMeta  = ServiceType.metadata của con (custom_fields + cờ hành vi).
 *  - parent     = data từ checkByCode (custom_fields top-level + price_quantity_mode/kind/rotation…).
 */

export type ConfigDiffKind = 'added' | 'removed' | 'changed'

export interface ConfigDiffItem {
  kind: ConfigDiffKind
  label: string // câu tiếng Việt cho admin đọc
}

const PRICE_MODE_LABEL: Record<string, string> = {
  package: 'Giá theo gói (không nhân số lượng)',
  multiply: 'Giá theo số lượng (× số proxy)'
}

const norm = (v: any) => (v === undefined || v === null ? '' : String(v))

/** Rút custom_fields về map key→field (nhận cả top-level lẫn trong metadata). */
function fieldsOf(src: any): Record<string, any> {
  const list = Array.isArray(src?.custom_fields)
    ? src.custom_fields
    : Array.isArray(src?.metadata?.custom_fields)
      ? src.metadata.custom_fields
      : []
  const map: Record<string, any> = {}

  for (const f of list) {
    const k = f?.key || f?.param
    if (k) map[k] = f
  }

  return map
}

const optCount = (f: any) => (Array.isArray(f?.options) ? f.options.length : 0)

/** Trần số lượng bản CON đang lưu — là CỘT của bảng, không nằm trong metadata nên phải truyền riêng. */
export interface ChildQuantityBounds {
  min?: number | null
  max?: number | null
}

export function computeChildConfigDiff(
  childMeta: any,
  parent: any,
  childQuantity?: ChildQuantityBounds
): ConfigDiffItem[] {
  const out: ConfigDiffItem[] = []
  const cm = childMeta || {}

  // ─── Trần số lượng ────────────────────────────────────────────
  // Con được bán HẸP hơn mẹ, KHÔNG được rộng hơn: mẹ vẫn chặn ở trần của mẹ lúc con đặt đơn,
  // nên trần con rộng hơn = khách con chọn xong mới ăn lỗi. Áp cho cả sản phẩm gói GB.
  if (childQuantity) {
    const cMin = childQuantity.min ?? null
    const cMax = childQuantity.max ?? null
    const pMin = parent?.min_quantity ?? null
    const pMax = parent?.max_quantity ?? null

    if (pMin !== null && cMin !== null && Number(cMin) !== Number(pMin)) {
      out.push({ kind: 'changed', label: `Số lượng tối thiểu: ${cMin} → ${pMin}` })
    }
    if (pMax !== null && cMax !== null && Number(cMax) !== Number(pMax)) {
      const vuotTran = Number(cMax) > Number(pMax)
      out.push({
        kind: 'changed',
        label: `Số lượng tối đa: ${cMax} → ${pMax}` +
          (vuotTran ? ` (đang cho khách chọn quá trần site mẹ — mẹ sẽ từ chối đơn trên ${pMax})` : '')
      })
    }
  }

  // ─── Cờ hành vi ───────────────────────────────────────────────
  // price_quantity_mode: quan trọng nhất (quyết định tính tiền)
  const childMode = norm(cm.price_quantity_mode) || 'multiply'
  const parentMode = norm(parent?.price_quantity_mode) || 'multiply'
  if (childMode !== parentMode) {
    out.push({
      kind: 'changed',
      label: `Cách tính tiền: ${PRICE_MODE_LABEL[childMode] || childMode} → ${PRICE_MODE_LABEL[parentMode] || parentMode}`
    })
  }

  if (norm(cm.kind) !== norm(parent?.kind) && (norm(cm.kind) || norm(parent?.kind))) {
    out.push({ kind: 'changed', label: `Loại sản phẩm (kind): "${norm(cm.kind) || '—'}" → "${norm(parent?.kind) || '—'}"` })
  }

  if (!!cm.track_package_usage !== !!parent?.track_package_usage) {
    out.push({ kind: 'changed', label: `Theo dõi dung lượng gói: ${cm.track_package_usage ? 'Bật' : 'Tắt'} → ${parent?.track_package_usage ? 'Bật' : 'Tắt'}` })
  }

  // rotation (allow_manual/allow_auto/min_interval)
  const cr = cm.rotation || {}
  const pr = parent?.rotation || {}
  if (JSON.stringify([!!cr.allow_manual, !!cr.allow_auto, cr.min_interval ?? null]) !==
      JSON.stringify([!!pr.allow_manual, !!pr.allow_auto, pr.min_interval ?? null]) &&
      (Object.keys(cr).length || Object.keys(pr).length)) {
    out.push({ kind: 'changed', label: 'Cấu hình xoay IP (cho phép xoay tay / tự động / chu kỳ) đã đổi' })
  }

  // ─── Trường lựa chọn mua (custom_fields) ──────────────────────
  const childF = fieldsOf({ metadata: cm })
  const parentF = fieldsOf(parent)

  for (const k of Object.keys(parentF)) {
    if (!childF[k]) {
      out.push({ kind: 'added', label: `Thêm lựa chọn: "${parentF[k]?.label || k}"` })
    }
  }
  for (const k of Object.keys(childF)) {
    if (!parentF[k]) {
      out.push({ kind: 'removed', label: `Bỏ lựa chọn: "${childF[k]?.label || k}"` })
    }
  }
  for (const k of Object.keys(parentF)) {
    if (!childF[k]) continue
    const c = childF[k]
    const p = parentF[k]
    const reasons: string[] = []
    if (norm(c.label) !== norm(p.label)) reasons.push(`nhãn "${norm(c.label)}"→"${norm(p.label)}"`)
    if (norm(c.display_type) !== norm(p.display_type)) reasons.push(`kiểu hiển thị "${norm(c.display_type) || '—'}"→"${norm(p.display_type) || '—'}"`)
    if (optCount(c) !== optCount(p)) reasons.push(`số lựa chọn ${optCount(c)}→${optCount(p)}`)
    if (reasons.length) {
      out.push({ kind: 'changed', label: `Đổi "${p.label || k}": ${reasons.join(', ')}` })
    }
  }

  return out
}
