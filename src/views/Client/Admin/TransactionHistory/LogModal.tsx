import {
  X, Loader2, FileText, Clock, AlertCircle, CheckCircle2, XCircle,
  Play, Globe, ArrowRight, RotateCcw, RefreshCw, DollarSign, Zap, Bug
} from 'lucide-react'
import Dialog from '@mui/material/Dialog'

import { formatDateTimeLocal } from '@/utils/formatDate'
import { ORDER_STATUS_LABELS_ADMIN } from '@/constants'
import { useOrderLogs } from '@/hooks/apis/useTickets'
import { useBranding } from '@/app/contexts/BrandingContext'
import LogKetLuan, { NoiDungDanhDau } from '@/components/LogKetLuan'

const ACTION_LABELS: Record<string, string> = {
  created: 'Tạo đơn hàng',
  order_created: 'Tạo đơn + trừ tiền',
  queue_pushed: 'Đẩy vào queue xử lý',
  processing: 'Bắt đầu xử lý',
  in_use: 'Hoàn thành',
  in_use_partial: 'Mua thiếu proxy',
  proxy_assigned: 'Gán proxy cho key',
  failed: 'Thất bại',
  expired: 'Hết hạn',
  retry: 'Retry xử lý',
  api_call_start: 'Gọi API nhà cung cấp',
  api_call_success: 'API thành công',
  api_call_error: 'API thất bại',
  rotate_start: 'Xoay proxy',
  rotate_success: 'Xoay thành công',
  rotate_error: 'Xoay thất bại',
  exception: 'Lỗi hệ thống',
  admin_retry_partial: 'Admin mua bù',
  admin_refund_partial: 'Admin hoàn tiền',
  auto_recovered: 'Tự phục hồi (stuck)',
}

const ACTION_STYLES: Record<string, { icon: React.ReactNode; bg: string; text: string }> = {
  created:              { icon: <Play size={14} />,          bg: 'bg-blue-100',   text: 'text-blue-600' },
  order_created:        { icon: <DollarSign size={14} />,    bg: 'bg-blue-100',   text: 'text-blue-600' },
  queue_pushed:         { icon: <ArrowRight size={14} />,    bg: 'bg-blue-100',   text: 'text-blue-500' },
  processing:           { icon: <RefreshCw size={14} />,     bg: 'bg-yellow-100', text: 'text-yellow-600' },
  in_use:               { icon: <CheckCircle2 size={14} />,  bg: 'bg-green-100',  text: 'text-green-600' },
  in_use_partial:       { icon: <AlertCircle size={14} />,   bg: 'bg-orange-100', text: 'text-orange-600' },
  proxy_assigned:       { icon: <CheckCircle2 size={14} />,  bg: 'bg-green-100',  text: 'text-green-500' },
  failed:               { icon: <XCircle size={14} />,       bg: 'bg-red-100',    text: 'text-red-600' },
  expired:              { icon: <Clock size={14} />,         bg: 'bg-gray-100',   text: 'text-gray-600' },
  retry:                { icon: <RotateCcw size={14} />,     bg: 'bg-yellow-100', text: 'text-yellow-600' },
  api_call_start:       { icon: <Globe size={14} />,         bg: 'bg-indigo-100', text: 'text-indigo-600' },
  api_call_success:     { icon: <CheckCircle2 size={14} />,  bg: 'bg-green-100',  text: 'text-green-600' },
  api_call_error:       { icon: <XCircle size={14} />,       bg: 'bg-red-100',    text: 'text-red-600' },
  rotate_start:         { icon: <RefreshCw size={14} />,     bg: 'bg-indigo-100', text: 'text-indigo-600' },
  rotate_success:       { icon: <CheckCircle2 size={14} />,  bg: 'bg-green-100',  text: 'text-green-600' },
  rotate_error:         { icon: <XCircle size={14} />,       bg: 'bg-red-100',    text: 'text-red-600' },
  exception:            { icon: <Bug size={14} />,            bg: 'bg-red-100',    text: 'text-red-700' },
  admin_retry_partial:  { icon: <Zap size={14} />,           bg: 'bg-purple-100', text: 'text-purple-600' },
  admin_refund_partial: { icon: <DollarSign size={14} />,    bg: 'bg-purple-100', text: 'text-purple-600' },
  auto_recovered:       { icon: <RefreshCw size={14} />,     bg: 'bg-amber-100',  text: 'text-amber-600' },
}

const DEFAULT_STYLE = { icon: <Clock size={14} />, bg: 'bg-gray-100', text: 'text-gray-600' }

export default function LogModal({
  isOpen,
  onClose,
  orderId,
}: {
  isOpen: boolean
  onClose: () => void
  orderId: number | null
}) {
  const { isChild } = useBranding()
  const { data: logs, isLoading } = useOrderLogs(isOpen ? orderId : null)

  if (!isOpen) return null

  return (
    <Dialog
      onClose={onClose}
      aria-labelledby='log-dialog-title'
      open={isOpen}
      closeAfterTransition={false}
      maxWidth='md'
      fullWidth={true}
      PaperProps={{ sx: { overflow: 'visible' } }}
    >
      <div className='relative bg-white rounded-lg shadow-2xl w-full max-h-[90vh] overflow-hidden animate-slideUp mx-auto'>
        <div className='flex items-center justify-between px-4 py-3 border-b border-gray-200'>
          <div className='flex items-center gap-2'>
            <div className='w-8 h-8 rounded-lg flex items-center justify-center' style={{ background: 'color-mix(in srgb, var(--primary-hover, #6366f1) 12%, white)' }}>
              <FileText size={16} style={{ color: 'var(--primary-hover, #6366f1)' }} />
            </div>
            <h2 className='text-sm font-semibold text-gray-800'>Log đơn hàng</h2>
          </div>
          <button onClick={onClose} className='p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors'>
            <X size={18} />
          </button>
        </div>

        {isLoading ? (
          <div className='p-4 sm:p-6 flex flex-col items-center justify-center min-h-[300px]'>
            <Loader2 className='w-10 h-10 animate-spin mb-4' style={{ color: 'var(--primary-hover, #f97316)' }} />
            <p className='text-gray-600 font-medium text-sm'>Đang tải log...</p>
          </div>
        ) : (
          <div className='p-4 sm:p-6 overflow-y-auto max-h-[calc(90vh-80px)]'>
            {logs && logs.length > 0 ? (
              <div className='space-y-2'>
                {logs.map((log: any, index: number) => {
                  const style = ACTION_STYLES[log.action] ?? DEFAULT_STYLE
                  const label = ACTION_LABELS[log.action] ?? log.action

                  return (
                    <div key={log._id ?? index} className='flex gap-3 p-3 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors'>
                      <div className='flex-shrink-0 pt-0.5'>
                        <div className={`w-8 h-8 rounded-full ${style.bg} flex items-center justify-center ${style.text}`}>
                          {style.icon}
                        </div>
                      </div>
                      <div className='flex-1 min-w-0'>
                        <div className='flex items-center gap-2 flex-wrap'>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${style.bg} ${style.text}`}>
                            {label}
                          </span>
                          {log.from_status != null && log.to_status != null && (
                            <span className='text-xs text-gray-400 flex items-center gap-1'>
                              {ORDER_STATUS_LABELS_ADMIN[String(log.from_status)] ?? `status ${log.from_status}`}
                              <ArrowRight size={10} />
                              {ORDER_STATUS_LABELS_ADMIN[String(log.to_status)] ?? `status ${log.to_status}`}
                            </span>
                          )}
                          {log.duration_ms != null && (
                            <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${log.duration_ms > 3000 ? 'bg-red-50 text-red-500' : log.duration_ms > 1000 ? 'bg-yellow-50 text-yellow-600' : 'bg-gray-50 text-gray-500'}`}>
                              {log.duration_ms}ms
                            </span>
                          )}
                          {log.http_status != null && (
                            <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${log.http_status >= 200 && log.http_status < 300 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
                              HTTP {log.http_status}
                            </span>
                          )}
                        </div>

                        {log.message && (
                          <p className='text-sm text-gray-700 mt-1'>{log.message}</p>
                        )}

                        <LogKetLuan ketLuan={log.ket_luan} />

                        {/* Order meta — service, provider, giá, số lượng */}
                        {log.context?.service_name && (
                          <div className='flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-xs text-gray-500'>
                            <span>{log.context.service_name}</span>
                            {!isChild && log.context.provider_name && <span>NCC: {log.context.provider_name}</span>}
                            {log.context.quantity && <span>SL: {log.context.quantity}</span>}
                            {log.context.total_amount != null && <span>{Number(log.context.total_amount).toLocaleString()}đ</span>}
                            {log.context.time_days && <span>{log.context.time_days} ngày</span>}
                          </div>
                        )}

                        <p className='text-xs text-gray-400 mt-1'>
                          {log.created_at ? formatDateTimeLocal(log.created_at) : '—'}
                          {!isChild && log.provider_code && <span className='ml-2'>NCC: {log.provider_code}</span>}
                          {log.retry_count != null && log.retry_count > 0 && <span className='ml-2'>Retry: {log.retry_count}</span>}
                        </p>

                        {/* Request payload */}
                        {(log.request_body || log.context?.request_params) && (
                          <div className='mt-2 border border-blue-200 rounded-lg overflow-hidden'>
                            <div className='px-3 py-1.5 bg-blue-50 text-xs font-semibold text-blue-600'>Request payload</div>
                            <pre className='p-3 bg-slate-900 text-xs text-blue-300 font-mono whitespace-pre-wrap max-h-40 overflow-y-auto m-0'>
                              {JSON.stringify(log.request_body || log.context?.request_params, null, 2)}
                            </pre>
                          </div>
                        )}

                        {/* Response body */}
                        {(log.response_body || log.context?.response) && (
                          <div className='mt-2 border border-green-200 rounded-lg overflow-hidden'>
                            <div className={`px-3 py-1.5 text-xs font-semibold ${
                              ['api_call_error', 'failed', 'exception', 'retry'].includes(log.action)
                                ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'
                            }`}>
                              Response {log.duration_ms ? `(${log.duration_ms}ms)` : ''}
                            </div>
                            <NoiDungDanhDau noiDung={log.response_body} danhDau={log.ket_luan?.danh_dau}>
                              <pre className={`p-3 bg-slate-900 text-xs font-mono whitespace-pre-wrap max-h-40 overflow-y-auto m-0 ${
                                ['api_call_error', 'failed', 'exception', 'retry'].includes(log.action) ? 'text-red-300' : 'text-green-300'
                              }`}>
                                {(() => {
                                  const raw = log.response_body || log.context?.response
                                  if (typeof raw === 'string') {
                                    try { return JSON.stringify(JSON.parse(raw), null, 2) } catch { return raw }
                                  }
                                  return JSON.stringify(raw, null, 2)
                                })()}
                              </pre>
                            </NoiDungDanhDau>
                          </div>
                        )}

                        {/* Context */}
                        {log.context && typeof log.context === 'object' && (() => {
                          const { request_params, response, duration_ms, service_name, service_code, provider_name, provider_code, quantity, price_per_unit, total_amount, proxy_type, time_days, ...rest } = log.context
                          if (Object.keys(rest).length === 0) return null
                          const isError = ['api_call_error', 'failed', 'exception'].includes(log.action)
                          return (
                            <details className='mt-2' open={isError}>
                              <summary className={`text-xs cursor-pointer font-medium ${isError ? 'text-red-500 hover:text-red-700' : 'text-gray-400 hover:text-gray-600'}`}>
                                {isError ? 'Debug chi tiết (click để xem)' : 'Context'}
                              </summary>
                              <div className={`mt-1 p-2 rounded text-xs font-mono whitespace-pre-wrap max-h-80 overflow-y-auto ${isError ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-gray-50 text-gray-600'}`}>
                                {JSON.stringify(rest, null, 2)}
                              </div>
                            </details>
                          )
                        })()}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className='flex flex-col items-center justify-center py-12 text-gray-400'>
                <AlertCircle size={48} className='mb-3' />
                <p className='text-sm'>Không có log nào được ghi nhận</p>
                <p className='text-xs mt-1'>Order có thể chưa được xử lý hoặc log chưa được ghi</p>
              </div>
            )}
          </div>
        )}
      </div>
    </Dialog>
  )
}
