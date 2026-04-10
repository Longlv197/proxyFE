'use client'
import React from 'react'

import RotatingProxyPage from '@views/Client/RotatingProxy/RotatingProxyPage'

interface ProxyPlansClientProps {
  data: any[]
  onRefresh?: () => void
  isRefreshing?: boolean
}

export default function ProxyPlansClient({ data, onRefresh, isRefreshing }: ProxyPlansClientProps) {
  return <RotatingProxyPage data={data} onRefresh={onRefresh} isRefreshing={isRefreshing} />
}
