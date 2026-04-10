'use client'

import StaticProxyPage from '@views/Client/StaticProxy/StaticProxyPage'
import { useProxyStaticPlans } from '@/hooks/apis/useProxyPlans'

function ProxyPageSkeleton() {
  return (
    <div style={{ padding: '0' }}>
      {/* Tab skeleton */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '12px' }}>
        <div style={{ width: '90px', height: '36px', borderRadius: '8px', background: '#e2e8f0', animation: 'skeletonPulse 1.5s ease-in-out infinite' }} />
        <div style={{ width: '90px', height: '36px', borderRadius: '8px', background: '#f1f5f9', animation: 'skeletonPulse 1.5s ease-in-out infinite', animationDelay: '0.1s' }} />
      </div>

      {/* Filter bar skeleton */}
      <div style={{ padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', background: 'white', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          {[100, 120, 140].map((w, i) => (
            <div key={i}>
              <div style={{ width: '80px', height: '14px', borderRadius: '4px', background: '#f1f5f9', marginBottom: '8px', animation: 'skeletonPulse 1.5s ease-in-out infinite', animationDelay: `${i * 0.1}s` }} />
              <div style={{ display: 'flex', gap: '6px' }}>
                {[60, 70].map((cw, ci) => (
                  <div key={ci} style={{ width: `${cw}px`, height: '34px', borderRadius: '8px', border: '1px solid #e2e8f0', animation: 'skeletonPulse 1.5s ease-in-out infinite', animationDelay: `${(i * 2 + ci) * 0.08}s` }} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cards skeleton */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{ padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', background: 'white' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ width: '120px', height: '18px', borderRadius: '4px', background: '#e2e8f0', animation: 'skeletonPulse 1.5s ease-in-out infinite', animationDelay: `${i * 0.15}s` }} />
              <div style={{ width: '80px', height: '18px', borderRadius: '4px', background: '#e2e8f0', animation: 'skeletonPulse 1.5s ease-in-out infinite', animationDelay: `${i * 0.15 + 0.05}s` }} />
            </div>
            <div style={{ display: 'flex', gap: '6px', marginBottom: '14px' }}>
              {[40, 70, 60].map((w, j) => (
                <div key={j} style={{ width: `${w}px`, height: '24px', borderRadius: '12px', background: '#f1f5f9', animation: 'skeletonPulse 1.5s ease-in-out infinite', animationDelay: `${i * 0.15 + j * 0.05}s` }} />
              ))}
            </div>
            {[0, 1].map(j => (
              <div key={j} style={{ width: '100%', height: '40px', borderRadius: '8px', background: '#f8fafc', marginBottom: '10px', animation: 'skeletonPulse 1.5s ease-in-out infinite', animationDelay: `${i * 0.15 + j * 0.08}s` }} />
            ))}
            <div style={{ width: '100%', height: '40px', borderRadius: '8px', background: 'color-mix(in srgb, var(--primary-hover, #ef4444) 15%, white)', marginTop: '8px', animation: 'skeletonPulse 1.5s ease-in-out infinite', animationDelay: `${i * 0.15 + 0.2}s` }} />
          </div>
        ))}
      </div>

      <style>{`
        @keyframes skeletonPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  )
}

export default function StaticProxy() {
  const { data: proxyPlans, isLoading, refetch, isFetching } = useProxyStaticPlans()

  if (isLoading) {
    return (
      <div key='proxy-tinh' className='main-page'>
        <ProxyPageSkeleton />
      </div>
    )
  }

  return (
    <div key='proxy-tinh' className='main-page'>
      <StaticProxyPage data={proxyPlans ?? []} onRefresh={refetch} isRefreshing={isFetching} />
    </div>
  )
}
