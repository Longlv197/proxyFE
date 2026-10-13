'use client'

import { memo, useCallback, useMemo, useState } from 'react'

import { useQueueStatus, useClearCircuitBreaker } from '@/hooks/apis/useQueueStatus'
import { useTabTrenUrl } from '@/hooks/useTabTrenUrl'
import type { LogEntry, WorkerState, CircuitBreaker } from '@/hooks/apis/useQueueStatus'

// ─── Tab config ─────────────────────────────────────────────────────────────

interface TabDef {
  key: string
  label: string
  workerKey?: string        // key trong data.workers — undefined = tab "Tất cả"
  queueKey?: string         // key trong data.queues
  queueLabel?: string
  color: string
  badge: string             // CSS class cho log badge
}

const TABS: TabDef[] = [
  { key: 'all', label: 'Tất cả', color: 'gray', badge: '' },
  { key: 'placeorder', label: 'Mua hàng', workerKey: 'placeorder', queueKey: 'placeorder', queueLabel: 'Queue Mua', color: 'blue', badge: 'bg-blue-100 text-blue-700' },
  { key: 'renewal', label: 'Gia hạn', workerKey: 'renewal', queueKey: 'renewal', queueLabel: 'Queue Gia hạn', color: 'green', badge: 'bg-green-100 text-green-700' },
  { key: 'rotate', label: 'Xoay IP', workerKey: 'rotate', queueKey: 'rotate', queueLabel: 'Queue Xoay', color: 'amber', badge: 'bg-amber-100 text-amber-700' },
  { key: 'fetch', label: 'Lấy Proxy', workerKey: 'fetch', queueLabel: 'Đơn chờ NCC', color: 'purple', badge: 'bg-purple-100 text-purple-700' },
]

// ─── Main ───────────────────────────────────────────────────────────────────

export default function QueueMonitorPage() {
  const [enabled, setEnabled] = useState(true)
  const [activeTab, setActiveTab] = useTabTrenUrl<string>('tab', 'all')
  const { data, isLoading } = useQueueStatus(enabled)
  const clearCB = useClearCircuitBreaker()

  const handleClearCB = useCallback(
    (provider: string) => clearCB.mutate(provider),
    [clearCB]
  )

  const tab = TABS.find(t => t.key === activeTab) || TABS[0]

  // Filter logs theo tab
  const filteredLogs = useMemo(() => {
    const logs = data?.logs ?? []
    if (tab.key === 'all') return logs
    return logs.filter(l => l.w === tab.workerKey)
  }, [data?.logs, tab])

  if (isLoading) return <div className='p-6 text-gray-500'>Loading...</div>

  return (
    <div className='p-6 space-y-5'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <h1 className='text-lg font-bold text-gray-800'>Queue Monitor</h1>
        <button
          onClick={() => setEnabled(e => !e)}
          className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${
            enabled
              ? 'bg-green-50 border-green-300 text-green-700'
              : 'bg-gray-50 border-gray-300 text-gray-500'
          }`}
        >
          {enabled ? '● Live' : '○ Paused'}
        </button>
      </div>

      {/* Tabs */}
      <div className='flex gap-1 bg-gray-100 rounded-lg p-1'>
        {TABS.map(t => {
          const isActive = t.key === activeTab
          const logCount = t.key === 'all'
            ? (data?.logs ?? []).length
            : (data?.logs ?? []).filter(l => l.w === t.workerKey).length

          return (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-medium transition-all ${
                isActive
                  ? 'bg-white text-gray-800 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
              {logCount > 0 && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isActive ? 'bg-gray-200 text-gray-600' : 'bg-gray-200/60 text-gray-400'}`}>
                  {logCount}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Cards — tab "Tất cả" hiện tất cả, tab riêng chỉ hiện worker + queue đó */}
      {tab.key === 'all' ? (
        <div className='grid grid-cols-2 lg:grid-cols-4 gap-3'>
          <StatCard label='Queue Mua' value={data?.queues.placeorder ?? 0} color='blue' />
          <StatCard label='Queue Gia hạn' value={data?.queues.renewal ?? 0} color='green' />
          <StatCard label='Queue Xoay' value={data?.queues?.rotate ?? 0} color='amber' />
          <WorkerCard name='Worker Mua' worker={data?.workers.placeorder} />
          <WorkerCard name='Worker Gia hạn' worker={data?.workers.renewal} />
          <WorkerCard name='Worker Xoay' worker={data?.workers?.rotate} />
          <WorkerCard name='Worker Lấy Proxy' worker={data?.workers?.fetch} />
        </div>
      ) : (
        <div className='grid grid-cols-2 gap-3'>
          {tab.queueKey && <StatCard label={tab.queueLabel || ''} value={data?.queues?.[tab.queueKey] ?? 0} color={tab.color as any} />}
          {tab.workerKey && <WorkerCard name={`Worker ${tab.label}`} worker={data?.workers?.[tab.workerKey]} />}
        </div>
      )}

      {/* Circuit Breakers */}
      <CBSection breakers={data?.circuit_breakers ?? {}} onClear={handleClearCB} clearing={clearCB.isPending} />

      {/* Log — filtered */}
      <LogTable logs={filteredLogs} title={tab.key === 'all' ? 'Activity Log' : `Log — ${tab.label}`} />
    </div>
  )
}

// ─── Sub-components (memo) ───

const StatCard = memo(function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  const accents: Record<string, string> = { blue: 'text-blue-600', green: 'text-green-600', amber: 'text-amber-600', purple: 'text-purple-600', gray: 'text-gray-600' }

  return (
    <div className='bg-white rounded-lg border border-gray-100 px-4 py-3'>
      <p className='text-[11px] text-gray-400 uppercase tracking-wide'>{label}</p>
      <p className={`text-2xl font-bold ${accents[color] || 'text-gray-600'} mt-0.5`}>{value}</p>
    </div>
  )
})

const WorkerCard = memo(function WorkerCard({ name, worker }: { name: string; worker?: WorkerState | null }) {
  const active = !!worker

  return (
    <div className={`rounded-lg border px-4 py-3 ${active ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-100'}`}>
      <div className='flex items-center justify-between'>
        <p className='text-[11px] text-gray-400 uppercase tracking-wide'>{name}</p>
        <span
          className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
            active ? 'bg-amber-200 text-amber-800' : 'bg-gray-100 text-gray-400'
          }`}
        >
          {active ? 'ACTIVE' : 'IDLE'}
        </span>
      </div>
      {active ? (
        <div className='mt-1.5 space-y-0.5'>
          <p className='text-sm font-medium text-gray-800'>
            #{worker.order_id}
            {worker.provider && <span className='text-gray-400 ml-1 font-normal'>[{worker.provider}]</span>}
          </p>
          {worker.progress && <p className='text-xs text-amber-700'>{worker.progress}</p>}
          {worker.item && <p className='text-xs text-gray-400 truncate max-w-[180px]'>{worker.item}</p>}
        </div>
      ) : (
        <p className='text-xs text-gray-300 mt-1'>—</p>
      )}
    </div>
  )
})

const CBSection = memo(function CBSection({
  breakers,
  onClear,
  clearing
}: {
  breakers: Record<string, CircuitBreaker>
  onClear: (p: string) => void
  clearing: boolean
}) {
  const entries = Object.entries(breakers)

  if (entries.length === 0) return null

  return (
    <div className='bg-red-50 border border-red-200 rounded-lg p-3'>
      <p className='text-xs font-semibold text-red-700 mb-2'>
        Circuit Breaker — {entries.length} NCC tạm dừng
      </p>
      {entries.map(([provider, cb]) => (
        <div key={provider} className='flex items-center justify-between bg-white rounded px-3 py-1.5 mb-1 last:mb-0 border border-red-100'>
          <div className='text-sm'>
            <span className='font-medium text-red-700'>{provider}</span>
            <span className='text-gray-400 text-xs ml-2'>{cb.reason}</span>
            <span className='text-red-400 text-xs ml-2'>({cb.ttl}s)</span>
          </div>
          <button
            disabled={clearing}
            onClick={() => onClear(provider)}
            className='text-xs text-red-600 hover:text-red-800 border border-red-200 rounded px-2 py-0.5 hover:bg-red-50 disabled:opacity-50 transition-colors'
          >
            Mở lại
          </button>
        </div>
      ))}
    </div>
  )
})

const LogTable = memo(function LogTable({ logs, title = 'Activity Log' }: { logs: LogEntry[]; title?: string }) {
  return (
    <div className='bg-white rounded-lg border border-gray-100 overflow-hidden'>
      <div className='px-3 py-2 border-b border-gray-100 flex items-center justify-between'>
        <p className='text-xs font-semibold text-gray-600'>{title}</p>
        <span className='text-[10px] text-gray-300'>{logs.length} entries</span>
      </div>
      <div className='max-h-[420px] overflow-y-auto'>
        {logs.length === 0 ? (
          <p className='p-4 text-xs text-gray-300 text-center'>Chưa có log</p>
        ) : (
          <table className='w-full'>
            <thead className='sticky top-0 bg-gray-50/95 backdrop-blur-sm'>
              <tr className='text-[10px] text-gray-400 uppercase tracking-wider'>
                <th className='text-left px-3 py-1.5 w-16'>Time</th>
                <th className='text-left px-2 py-1.5 w-20'>Worker</th>
                <th className='text-left px-2 py-1.5'>Message</th>
                <th className='text-left px-2 py-1.5 w-16'>Order</th>
                <th className='text-left px-2 py-1.5 w-20'>NCC</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log, i) => (
                <LogRow key={`${log.t}-${log.w}-${i}`} log={log} />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
})

const WORKER_BADGE: Record<string, string> = {
  renewal: 'bg-green-100 text-green-700',
  placeorder: 'bg-blue-100 text-blue-700',
  rotate: 'bg-amber-100 text-amber-700',
  fetch: 'bg-purple-100 text-purple-700',
  admin: 'bg-gray-100 text-gray-700',
}

const LogRow = memo(function LogRow({ log }: { log: LogEntry }) {
  const m = log.m || ''
  const isFail = m.includes('FAIL') || m.includes('EXCEPTION') || m.includes('CB triggered')
  const rowBg = isFail ? 'bg-red-50/60' : m.includes('CB ') ? 'bg-orange-50/40' : ''

  return (
    <tr className={rowBg}>
      <td className='px-3 py-1 text-[11px] text-gray-400 font-mono'>{log.t}</td>
      <td className='px-2 py-1'>
        <span className={`text-[10px] px-1.5 py-0.5 rounded ${WORKER_BADGE[log.w] || 'bg-gray-100 text-gray-500'}`}>
          {log.w}
        </span>
      </td>
      <td className={`px-2 py-1 text-[11px] ${isFail ? 'text-red-600' : 'text-gray-600'}`}>{m}</td>
      <td className='px-2 py-1 text-[11px] text-gray-400'>{log.o ?? ''}</td>
      <td className='px-2 py-1 text-[11px] text-gray-400'>{log.p ?? ''}</td>
    </tr>
  )
})
