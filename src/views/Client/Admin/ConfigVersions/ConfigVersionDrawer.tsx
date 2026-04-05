'use client'

import { useState } from 'react'

import { Dialog, DialogTitle, DialogContent, IconButton, Button, Tooltip } from '@mui/material'
import { X, RotateCcw, History, Pencil, Plus, Trash2, Undo2 } from 'lucide-react'
import { toast } from 'react-toastify'

import {
  useConfigVersions,
  useConfigVersionDetail,
  useRevertConfigVersion
} from '@/hooks/apis/useConfigVersions'
import type { ConfigVersion } from '@/hooks/apis/useConfigVersions'

const vid = (v: ConfigVersion) => v.id || v._id

const ACTION_CFG: Record<string, { label: string; icon: any; color: string; bg: string; desc: string }> = {
  created: { label: 'Tạo mới', icon: Plus, color: '#059669', bg: '#ecfdf5', desc: 'Tạo mới' },
  updated: { label: 'Cập nhật', icon: Pencil, color: '#3b82f6', bg: '#eff6ff', desc: 'Cập nhật' },
  deleted: { label: 'Xoá', icon: Trash2, color: '#dc2626', bg: '#fef2f2', desc: 'Xoá' },
  reverted: { label: 'Khôi phục', icon: Undo2, color: '#f59e0b', bg: '#fffbeb', desc: 'Khôi phục' }
}

const FIELD_LABELS: Record<string, string> = {
  title: 'Tên', name: 'Tên', provider_code: 'Mã code', token_api: 'Token API',
  status: 'Trạng thái', api_config: 'Cấu hình API', rotation_interval: 'Chu kỳ xoay (s)',
  order: 'Thứ tự', note: 'Ghi chú', logo: 'Logo',
  price: 'Giá bán', cost_price: 'Giá vốn', pricing_mode: 'Chế độ giá',
  price_per_unit: 'Giá/đơn vị', cost_per_unit: 'Giá vốn/đơn vị',
  auth_type: 'Xác thực', metadata: 'Metadata', price_by_duration: 'Giá theo thời hạn',
  api_provider: 'API Provider', api_body: 'API Body', api_type: 'API Type',
  ip_version: 'IP Version', protocols: 'Giao thức', proxy_type: 'Loại proxy',
  country: 'Quốc gia', time_unit: 'Đơn vị thời gian', bandwidth: 'Băng thông',
  max_quantity: 'SL tối đa', min_quantity: 'SL tối thiểu',
  discount_price: 'Giá KM', code: 'Mã SP', tag: 'Tag', type: 'Loại',
}

const HIDDEN_FIELDS = new Set(['id', 'created_at', 'updated_at', 'logo_url', 'provider', 'custom_prices'])

interface Props {
  open: boolean
  onClose: () => void
  modelType: string
  modelId: number | string
  modelName: string
}

export default function ConfigVersionDrawer({ open, onClose, modelType, modelId, modelName }: Props) {
  const [detailId, setDetailId] = useState<string | null>(null)
  const [revertingId, setRevertingId] = useState<string | null>(null)

  const { data: versionsData, isLoading } = useConfigVersions({
    model_type: open ? modelType : undefined,
    model_id: open ? modelId : undefined,
    per_page: 50
  })
  const { data: detailData } = useConfigVersionDetail(detailId)
  const revertMutation = useRevertConfigVersion()

  const versions = versionsData?.data ?? []
  const detail = detailData?.data
  const latestVersion = versions.length > 0 ? versions[0] : null
  const isLatest = detail && latestVersion && vid(detail) === vid(latestVersion)

  const handleRevert = async (version: ConfigVersion) => {
    setRevertingId(vid(version))

    try {
      const res = await revertMutation.mutateAsync(vid(version))

      if (res?.success) {
        toast.info(res.message || `Khôi phục thành công`)
        const newVersion = res.version

        if (newVersion) {
          setDetailId(newVersion.id || newVersion._id)
        } else {
          setDetailId(null)
        }
      } else {
        toast.error(res?.message || 'Khôi phục thất bại')
      }
    } catch {
      toast.error('Có lỗi xảy ra')
    } finally {
      setRevertingId(null)
    }
  }

  const handleClose = () => { setDetailId(null); onClose() }

  return (
    <Dialog
      open={open} onClose={handleClose}
      maxWidth={detailId ? 'lg' : 'md'} fullWidth
      PaperProps={{ sx: { maxHeight: '85vh', minHeight: 500, transition: 'max-width 0.2s ease' } }}
    >
      <DialogTitle sx={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        py: 1.5, px: 2.5, borderBottom: '1px solid #e2e8f0'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <History size={18} style={{ color: '#6366f1' }} />
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#1e293b' }}>Lịch sử sửa đổi</div>
            <div style={{ fontSize: 12, color: '#64748b', fontWeight: 400 }}>{modelName}</div>
          </div>
        </div>
        <IconButton size='small' onClick={handleClose}><X size={18} /></IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 0, display: 'flex', gap: 0, minHeight: 400 }}>
        {/* ═══ Left: Danh sách ═══ */}
        <div style={{
          flex: detailId ? '0 0 30%' : '1 1 100%',
          transition: 'flex 0.2s', overflowY: 'auto', minWidth: 0
        }}>
          {isLoading ? (
            <div style={{ padding: '40px 0', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>Đang tải...</div>
          ) : versions.length === 0 ? (
            <div style={{ padding: '40px 0', textAlign: 'center', color: '#cbd5e1', fontSize: 13 }}>Chưa có lịch sử</div>
          ) : (
            versions.map((v, i) => {
              const cfg = ACTION_CFG[v.action] ?? ACTION_CFG.updated
              const Icon = cfg.icon
              const isActive = detailId === vid(v)
              const changeKeys = v.changes ? Object.keys(v.changes) : []
              const isFirst = i === 0

              return (
                <div
                  key={vid(v)}
                  onClick={() => setDetailId(isActive ? null : vid(v))}
                  style={{
                    padding: '10px 14px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer',
                    background: isActive ? '#f8fafc' : 'transparent',
                    borderLeft: isActive ? '3px solid #6366f1' : '3px solid transparent',
                    transition: 'all 0.15s'
                  }}
                >
                  {/* Row 1: version + action + time */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <span style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: '#6366f1', background: '#eef2ff', padding: '1px 6px', borderRadius: 4 }}>
                      v{v.version}
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 600, color: cfg.color, background: cfg.bg, padding: '2px 8px', borderRadius: 10 }}>
                      <Icon size={10} /> {cfg.label}
                    </span>
                    {isFirst && (
                      <span style={{ fontSize: 9, fontWeight: 700, color: '#fff', background: '#6366f1', padding: '1px 6px', borderRadius: 8 }}>
                        MỚI NHẤT
                      </span>
                    )}
                    <span style={{ fontSize: 10, color: '#94a3b8', marginLeft: 'auto' }}>
                      {v.created_at ? new Date(v.created_at).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                  </div>

                  {/* Row 2: mô tả hành động */}
                  <div style={{ fontSize: 11, color: '#475569' }}>
                    {v.action === 'reverted' && (
                      <span>
                        Khôi phục{' '}
                        {v.reverted_from && v.reverted_to ? (
                          <>
                            từ <strong style={{ color: '#dc2626' }}>v{v.reverted_from}</strong>
                            {' → '}
                            <strong style={{ color: '#16a34a' }}>v{v.reverted_to}</strong>
                          </>
                        ) : (
                          <span>{v.description}</span>
                        )}
                      </span>
                    )}
                    {v.action === 'updated' && changeKeys.length > 0 && (
                      <span>Sửa: {changeKeys.map(f => FIELD_LABELS[f] || f).join(', ')}</span>
                    )}
                    {v.action === 'created' && <span>Khởi tạo cấu hình</span>}
                    {v.action === 'deleted' && <span>Xoá cấu hình</span>}
                  </div>

                  {/* Row 3: user */}
                  <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>
                    bởi <strong style={{ color: '#64748b' }}>{v.user_name}</strong>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* ═══ Right: Chi tiết ═══ */}
        {detailId && (
          <div style={{
            flex: '0 0 70%', borderLeft: '1px solid #e2e8f0',
            overflowY: 'auto', animation: 'slideInRight 0.2s ease-out'
          }}>
            {!detail ? (
              <div style={{ fontSize: 12, color: '#94a3b8', padding: '40px 20px' }}>Đang tải...</div>
            ) : (
              <DetailPanel
                detail={detail}
                current={detailData?.current ?? null}
                isLatest={!!isLatest}
                latestVersion={latestVersion?.version}
                onClose={() => setDetailId(null)}
                onRevert={() => handleRevert(detail)}
                isReverting={revertingId === vid(detail)}
              />
            )}
          </div>
        )}
      </DialogContent>

      <style>{`
        @keyframes slideInRight { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
      `}</style>
    </Dialog>
  )
}

// ═══════════════════════════════════════════
// Detail Panel
// ═══════════════════════════════════════════

function DetailPanel({ detail, current, isLatest, latestVersion, onClose, onRevert, isReverting }: {
  detail: ConfigVersion
  current: Record<string, any> | null
  isLatest: boolean
  latestVersion?: number
  onClose: () => void
  onRevert: () => void
  isReverting: boolean
}) {
  const cfg = ACTION_CFG[detail.action] ?? ACTION_CFG.updated
  const Icon = cfg.icon
  const changedKeys = new Set(Object.keys(detail.changes || {}))

  // Build before/after states
  const beforeState = detail.snapshot || {}
  let afterState: Record<string, any>

  if (isLatest && current) {
    // Phiên bản hiện tại → lấy data thực từ DB
    afterState = current
  } else {
    // Phiên bản cũ → build từ snapshot + changes
    afterState = { ...beforeState }

    if (detail.changes) {
      for (const [field, diff] of Object.entries(detail.changes)) {
        afterState[field] = diff.new
      }
    }
  }

  const allFields = Array.from(new Set([
    ...Object.keys(beforeState), ...Object.keys(afterState)
  ])).filter(f => !HIDDEN_FIELDS.has(f))

  // Giữ thứ tự tự nhiên — không sort

  return (
    <div>
      {/* ── Header ── */}
      <div style={{
        padding: '12px 16px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc',
        position: 'sticky', top: 0, zIndex: 1
      }}>
        {/* Action summary */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: '#6366f1', background: '#eef2ff', padding: '2px 8px', borderRadius: 4 }}>
              v{detail.version}
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, color: cfg.color }}>
              <Icon size={14} /> {cfg.desc}
            </span>
            {isLatest && (
              <span style={{ fontSize: 10, color: '#fff', background: '#6366f1', padding: '1px 8px', borderRadius: 8, fontWeight: 600 }}>
                PHIÊN BẢN HIỆN TẠI
              </span>
            )}
          </div>
          <IconButton size='small' onClick={onClose} sx={{ color: '#94a3b8' }}><X size={16} /></IconButton>
        </div>

        {/* What happened */}
        <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.6 }}>
          {detail.action === 'updated' && changedKeys.size > 0 && (
            <div>
              <strong>{detail.user_name}</strong> đã sửa {changedKeys.size} thuộc tính:{' '}
              <span style={{ color: '#3b82f6' }}>
                {Array.from(changedKeys).map(f => FIELD_LABELS[f] || f).join(', ')}
              </span>
            </div>
          )}
          {detail.action === 'reverted' && (
            <div>
              <strong>{detail.user_name}</strong> đã khôi phục{' '}
              {detail.reverted_from && detail.reverted_to ? (
                <>
                  từ <span style={{ color: '#dc2626', fontWeight: 600 }}>v{detail.reverted_from}</span>
                  {' → '}
                  <span style={{ color: '#16a34a', fontWeight: 600 }}>v{detail.reverted_to}</span>
                </>
              ) : (
                <span>{detail.description}</span>
              )}
            </div>
          )}
          {detail.action === 'created' && (
            <div><strong>{detail.user_name}</strong> đã tạo mới cấu hình</div>
          )}
          {detail.action === 'deleted' && (
            <div><strong>{detail.user_name}</strong> đã xoá cấu hình</div>
          )}
          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
            {new Date(detail.created_at).toLocaleString('vi-VN')}
          </div>
        </div>

        {/* Revert button */}
        {!isLatest && detail.snapshot && (
          <div style={{ marginTop: 8, padding: '8px 0 0', borderTop: '1px solid #e2e8f0' }}>
            <Button
              size='small' color='warning' variant='contained' fullWidth
              startIcon={<RotateCcw size={14} />}
              disabled={isReverting}
              onClick={onRevert}
              sx={{ textTransform: 'none', fontSize: 12, fontWeight: 600 }}
            >
              {isReverting ? 'Đang khôi phục...' : `Khôi phục từ v${latestVersion || '?'} → v${detail.version}`}
            </Button>
            <div style={{ fontSize: 10, color: '#94a3b8', textAlign: 'center', marginTop: 4 }}>
              Dữ liệu hiện tại sẽ được thay bằng trạng thái sau v{detail.version}
            </div>
          </div>
        )}
      </div>

      {/* ── Column headers ── */}
      <div style={{ display: 'flex', borderBottom: '2px solid #e2e8f0', position: 'sticky', top: isLatest ? 90 : 150, zIndex: 1, background: '#fff' }}>
        <div style={{ width: 130, flexShrink: 0, padding: '6px 12px', fontSize: 10, fontWeight: 700, color: '#64748b' }}>
          THUỘC TÍNH
        </div>
        <div style={{ flex: 1, padding: '6px 12px', fontSize: 10, fontWeight: 700, color: '#dc2626', background: 'rgba(254,242,242,0.3)' }}>
          TRƯỚC
        </div>
        <div style={{ flex: 1, padding: '6px 12px', fontSize: 10, fontWeight: 700, color: '#16a34a', background: 'rgba(240,253,244,0.3)' }}>
          {isLatest ? 'HIỆN TẠI (DB)' : 'SAU'}
        </div>
      </div>

      {/* ── Diff per field ── */}
      {allFields.map(field => {
        const isChanged = changedKeys.has(field)
        const label = FIELD_LABELS[field] || field
        const bVal = parseJsonStr(beforeState[field])
        const aVal = parseJsonStr(afterState[field])

        if (!isChanged) {
          // Không đổi — hiện 1 dòng gọn
          return (
            <div key={field} style={{ display: 'flex', borderBottom: '1px solid #f8fafc' }}>
              <div style={{ width: 130, flexShrink: 0, padding: '5px 12px', borderRight: '1px solid #f1f5f9', fontSize: 11, color: '#c0c7d0' }}>{label}</div>
              <div style={{ flex: 1, padding: '5px 10px', borderRight: '1px solid #f1f5f9', minWidth: 0 }}>
                <ScalarDisplay value={bVal} color='#c0c7d0' />
              </div>
              <div style={{ flex: 1, padding: '5px 10px', minWidth: 0 }}>
                <ScalarDisplay value={aVal} color='#c0c7d0' />
              </div>
            </div>
          )
        }

        // Changed — hiện toàn bộ value, highlight chỗ khác
        const isBothObj = typeof bVal === 'object' && bVal !== null && typeof aVal === 'object' && aVal !== null
        const isNewObj = bVal === null && typeof aVal === 'object' && aVal !== null
        const isDelObj = typeof bVal === 'object' && bVal !== null && aVal === null

        return (
          <div key={field} style={{ borderBottom: '1px solid #e2e8f0' }}>
            {/* Field header */}
            <div style={{
              padding: '6px 12px', background: 'rgba(99,102,241,0.04)',
              display: 'flex', alignItems: 'center', gap: 6,
              borderBottom: '1px solid #f1f5f9'
            }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#4f46e5' }}>{label}</span>
              <span style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'monospace' }}>{field}</span>
              {bVal === null && <span style={{ fontSize: 9, color: '#16a34a', fontWeight: 700, background: '#ecfdf5', padding: '1px 6px', borderRadius: 8 }}>+ MỚI</span>}
              {aVal === null && <span style={{ fontSize: 9, color: '#dc2626', fontWeight: 700, background: '#fef2f2', padding: '1px 6px', borderRadius: 8 }}>- XOÁ</span>}
              {bVal !== null && aVal !== null && <span style={{ fontSize: 9, color: '#f59e0b', fontWeight: 700, background: '#fffbeb', padding: '1px 6px', borderRadius: 8 }}>~ SỬA</span>}
            </div>

            {/* Content: 2 cột side-by-side */}
            <div style={{ display: 'flex' }}>
              <div style={{ flex: 1, padding: '6px 10px', borderRight: '1px solid #f1f5f9', minWidth: 0, background: 'rgba(254,242,242,0.15)' }}>
                {isBothObj ? (
                  <DiffJsonTree before={bVal} after={aVal} side='before' />
                ) : (
                  <ScalarDisplay value={bVal} color={bVal === null ? '#d1d5db' : '#991b1b'} highlight={true} />
                )}
              </div>
              <div style={{ flex: 1, padding: '6px 10px', minWidth: 0, background: 'rgba(240,253,244,0.15)' }}>
                {isBothObj ? (
                  <DiffJsonTree before={bVal} after={aVal} side='after' />
                ) : (
                  <ScalarDisplay value={aVal} color={aVal === null ? '#d1d5db' : '#166534'} highlight={true} />
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ═══════════════════════════════════════════
// Utils
// ═══════════════════════════════════════════

function parseJsonStr(v: any): any {
  if (typeof v === 'string' && v.startsWith('{')) {
    try { return JSON.parse(v) } catch { /* */ }
  }

  return v
}

function ScalarDisplay({ value, color, highlight }: { value: any; color: string; highlight?: boolean }) {
  if (value === null || value === undefined) return <span style={{ color: '#d1d5db', fontStyle: 'italic', fontSize: 11 }}>—</span>
  if (typeof value === 'boolean') return <span style={{ fontSize: 11, color }}>{value ? 'Bật' : 'Tắt'}</span>
  if (typeof value === 'string' && (value === 'active' || value === 'inactive')) return <span style={{ fontSize: 11, color }}>{value === 'active' ? '🟢 Hoạt động' : '⚪ Tắt'}</span>
  if (typeof value === 'number') return <span style={{ fontSize: 11, color, fontFamily: 'monospace' }}>{value.toLocaleString('vi-VN')}</span>

  if (typeof value === 'object') {
    // Render full object inline
    return <SimpleJsonTree data={value} color={color} highlight={!!highlight} />
  }

  const str = String(value)

  if (highlight) {
    return <span style={{ fontSize: 11, color, fontWeight: 600, wordBreak: 'break-word' }}>{str}</span>
  }

  return <span style={{ fontSize: 11, color, wordBreak: 'break-word' }}>{str.length > 80 ? str.slice(0, 80) + '...' : str}</span>
}

// ═══════════════════════════════════════════
// JSON tree đơn giản (không diff)
// ═══════════════════════════════════════════

function SimpleJsonTree({ data, color, highlight, depth = 0 }: { data: any; color: string; highlight: boolean; depth?: number }) {
  if (data === null) return <span style={{ color: '#d1d5db', fontStyle: 'italic', fontSize: 11 }}>null</span>
  if (typeof data !== 'object') return <span style={{ fontSize: 11, color, wordBreak: 'break-word' }}>{String(data)}</span>

  const entries = Array.isArray(data) ? data.map((v, i) => [String(i), v] as [string, any]) : Object.entries(data)

  if (entries.length === 0) return <span style={{ fontSize: 11, color: '#94a3b8' }}>{Array.isArray(data) ? '[]' : '{}'}</span>

  return (
    <div style={{ paddingLeft: depth > 0 ? 12 : 0, borderLeft: depth > 0 ? '2px solid #e2e8f0' : 'none' }}>
      {entries.map(([key, val]) => (
        <div key={key} style={{ padding: '1px 0', fontSize: 11 }}>
          <span style={{ color: '#6366f1', fontWeight: 600 }}>{key}</span>
          <span style={{ color: '#94a3b8', margin: '0 3px' }}>:</span>
          {typeof val === 'object' && val !== null
            ? <SimpleJsonTree data={val} color={color} highlight={highlight} depth={depth + 1} />
            : <span style={{ color }}>{val === null ? <span style={{ fontStyle: 'italic', color: '#d1d5db' }}>null</span> : String(val)}</span>
          }
        </div>
      ))}
    </div>
  )
}

// ═══════════════════════════════════════════
// Diff JSON Tree — hiện toàn bộ, highlight chỗ khác
// ═══════════════════════════════════════════

function DiffJsonTree({ before, after, side, depth = 0 }: { before: any; after: any; side: 'before' | 'after'; depth?: number }) {
  const data = side === 'before' ? before : after
  const other = side === 'before' ? after : before

  if (data === null || data === undefined) return <span style={{ color: '#d1d5db', fontStyle: 'italic', fontSize: 11 }}>—</span>
  if (typeof data !== 'object') {
    const changed = JSON.stringify(data) !== JSON.stringify(other)

    return (
      <span style={{
        fontSize: 11, wordBreak: 'break-word',
        color: changed ? (side === 'before' ? '#991b1b' : '#166534') : '#94a3b8',
        fontWeight: changed ? 700 : 400,
        background: changed ? (side === 'before' ? 'rgba(220,38,38,0.1)' : 'rgba(22,163,74,0.1)') : 'transparent',
        padding: changed ? '0 3px' : 0, borderRadius: 2
      }}>
        {String(data)}
      </span>
    )
  }

  const entries = Array.isArray(data) ? data.map((v, i) => [String(i), v] as [string, any]) : Object.entries(data)
  const otherObj = typeof other === 'object' && other !== null ? other : {}

  return (
    <div style={{ paddingLeft: depth > 0 ? 12 : 0, borderLeft: depth > 0 ? '2px solid #e2e8f0' : 'none' }}>
      {entries.map(([key, val]) => {
        const otherVal = otherObj[key]
        const isLeaf = typeof val !== 'object' || val === null
        const otherIsLeaf = typeof otherVal !== 'object' || otherVal === null
        const leafChanged = isLeaf && JSON.stringify(val) !== JSON.stringify(otherVal)
        const keyColor = leafChanged ? '#ef4444' : '#6366f1'

        return (
          <div key={key} style={{
            padding: '1px 0', fontSize: 11,
            background: leafChanged ? (side === 'before' ? 'rgba(220,38,38,0.06)' : 'rgba(22,163,74,0.06)') : 'transparent',
            borderRadius: 2, marginBottom: 1
          }}>
            <span style={{ color: leafChanged ? (side === 'before' ? '#dc2626' : '#16a34a') : '#6366f1', fontWeight: 600 }}>{key}</span>
            <span style={{ color: '#94a3b8', margin: '0 3px' }}>:</span>
            {isLeaf ? (
              <span style={{
                color: leafChanged ? (side === 'before' ? '#991b1b' : '#166534') : '#94a3b8',
                fontWeight: leafChanged ? 700 : 400,
                background: leafChanged ? (side === 'before' ? 'rgba(220,38,38,0.1)' : 'rgba(22,163,74,0.1)') : 'transparent',
                padding: leafChanged ? '0 3px' : 0, borderRadius: 2
              }}>
                {val === null ? <span style={{ fontStyle: 'italic', color: '#d1d5db' }}>null</span> : String(val)}
              </span>
            ) : (
              <DiffJsonTree
                before={side === 'before' ? val : (otherObj[key] ?? null)}
                after={side === 'after' ? val : (otherObj[key] ?? null)}
                side={side}
                depth={depth + 1}
              />
            )}
          </div>
        )
      })}

      {/* Keys chỉ có trong other (bị xoá/thêm) */}
      {Object.keys(otherObj).filter(k => !(k in (typeof data === 'object' && data ? data : {}))).map(key => {
        const val = otherObj[key]

        return (
          <div key={key} style={{
            padding: '1px 0', fontSize: 11, opacity: 0.4, fontStyle: 'italic'
          }}>
            <span style={{ color: '#94a3b8' }}>{key}: {typeof val === 'object' ? '{...}' : String(val)}</span>
          </div>
        )
      })}
    </div>
  )
}
