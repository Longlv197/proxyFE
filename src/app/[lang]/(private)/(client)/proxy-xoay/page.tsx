'use client'

import { useMemo } from 'react'

import ProxyPlansClient from '@/components/ProxyPlansClient'
import { useProxyRotatingPlans } from '@/hooks/apis/useProxyPlans'

function ProxyPageSkeleton() {
  return (
    <div style={{ padding: '0' }}>
      {/* Tab skeleton */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '12px' }}>
        {['90px', '90px', '60px'].map((w, i) => (
          <div key={i} style={{ width: w, height: '36px', borderRadius: '8px', background: i === 0 ? '#e2e8f0' : '#f1f5f9', animation: 'skeletonPulse 1.5s ease-in-out infinite', animationDelay: `${i * 0.1}s` }} />
        ))}
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
            <div style={{ textAlign: 'center', marginBottom: '12px', paddingBottom: '10px', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ width: '140px', height: '18px', borderRadius: '4px', background: '#e2e8f0', margin: '0 auto', animation: 'skeletonPulse 1.5s ease-in-out infinite', animationDelay: `${i * 0.15}s` }} />
            </div>
            {[0, 1, 2, 3].map(j => (
              <div key={j} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
                <div style={{ width: '80px', height: '14px', borderRadius: '4px', background: '#f1f5f9', animation: 'skeletonPulse 1.5s ease-in-out infinite', animationDelay: `${i * 0.15 + j * 0.05}s` }} />
                <div style={{ width: '60px', height: '14px', borderRadius: '4px', background: '#f1f5f9', animation: 'skeletonPulse 1.5s ease-in-out infinite', animationDelay: `${i * 0.15 + j * 0.05 + 0.03}s` }} />
              </div>
            ))}
            <div style={{ width: '100%', height: '40px', borderRadius: '8px', background: 'color-mix(in srgb, var(--primary-hover, #ef4444) 15%, white)', marginTop: '12px', animation: 'skeletonPulse 1.5s ease-in-out infinite', animationDelay: `${i * 0.15 + 0.25}s` }} />
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

export default function RotatingProxy() {
  const { data: proxyPlans, isLoading, refetch, isFetching } = useProxyRotatingPlans()

  const mergedPlans = useMemo(() => {
    if (!proxyPlans?.length) return []

    return proxyPlans.map((plan: any) => {
      const features: any[] = []

      // Icon colors xoay vòng cho multi_inputs
      const featureColors = ['#f97316', '#3b82f6', '#22c55e', '#8b5cf6', '#06b6d4', '#f59e0b', '#ef4444']

      if (plan.multi_inputs && Array.isArray(plan.multi_inputs)) {
        plan.multi_inputs.forEach((input: any, idx: number) => {
          features.push({
            label: input.key,
            value: input.value,
            status: 'success',
            iconColor: featureColors[idx % featureColors.length]
          })
        })
      }

      if (plan.price_by_duration) {
        const priceDurations =
          typeof plan.price_by_duration === 'string' ? JSON.parse(plan.price_by_duration) : plan.price_by_duration

        const timeOptions = priceDurations.map((item: any) => ({
          key: item.duration || item.key,
          label: item.duration || item.key,
          value: item.price || item.value,
          discount: item.discount || '0'
        }))

        features.push({
          label:
            plan.time_type === '1'
              ? 'Ngày sử dụng'
              : plan.time_type === '7'
                ? 'Tuần sử dụng'
                : plan.time_type === '30'
                  ? 'Tháng sử dụng'
                  : 'Thời gian sử dụng',
          status: 'radio',
          field: 'time',
          options: timeOptions
        })
      }

      return {
        id: plan.id,
        title: plan.name,
        price: parseInt(plan.price),
        api_body: plan.api_body,
        partner: plan.partner,
        ip_version: plan.ip_version,
        time_type: plan.time_type,
        protocol: plan.protocol,
        price_by_duration: plan.price_by_duration,
        proxy_type: plan.proxy_type,
        country: plan.country,
        country_code: plan.country,
        protocols: plan.protocols,
        status: plan.status,
        is_purchasable: plan.is_purchasable,
        tag: plan.tag,
        note: plan.note,
        auth_type: plan.auth_type,
        bandwidth: plan.bandwidth,
        rotation_type: plan.rotation_type,
        rotation_interval: plan.rotation_interval,
        request_limit: plan.request_limit,
        concurrent_connections: plan.concurrent_connections,
        pool_size: plan.pool_size,
        metadata: plan.metadata,
        pricing_mode: plan.pricing_mode,
        time_unit: plan.time_unit,
        price_per_unit: plan.price_per_unit,
        min_quantity: plan.min_quantity,
        max_quantity: plan.max_quantity,
        features
      }
    })
  }, [proxyPlans])

  if (isLoading) {
    return (
      <div key='proxy-xoay' className='main-page'>
        <ProxyPageSkeleton />
      </div>
    )
  }

  return (
    <div key='proxy-xoay' className='main-page'>
      <ProxyPlansClient data={mergedPlans} onRefresh={refetch} isRefreshing={isFetching} />
    </div>
  )
}
