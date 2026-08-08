'use client'

import { useState, useEffect } from 'react'

import CheckProxyForm from '@views/Client/CheckProxy/CheckProxyForm'
import CheckProxyTable from '@views/Client/CheckProxy/CheckProxyTable'

interface ProxyData {
  id?: number
  proxy: string
  ip: string
  protocol: string
  status: string
  responseTime: number | string
  type: string
  /** Lý do khi proxy không dùng được — bảng hiện ngay dưới nhãn trạng thái. */
  message?: string
}

export default function CheckProxyPage() {
  const [checkResults, setCheckResults] = useState<ProxyData[]>([])
  const [checkedProxy, setCheckedProxy] = useState<ProxyData[]>([])

  // Ghép kết quả của MỘT LÔ vừa kiểm xong vào bảng (khớp theo chuỗi proxy).
  // Nhờ vậy bảng điền dần theo từng lô thay vì đợi chạy hết cả danh sách.
  useEffect(() => {
    if (!checkedProxy) return

    const proxyArr = Array.isArray(checkedProxy) ? checkedProxy : [checkedProxy]

    if (proxyArr.length === 0) return

    setCheckResults(prevResults =>
      prevResults.map(item => {
        const matchedProxy = proxyArr.find(checked => checked.proxy === item.proxy)

        return matchedProxy ? { ...item, ...matchedProxy } : item
      })
    )
  }, [checkedProxy])

  return (
    <div className='main-page'>
      <div className='check-proxy-grid'>
        <CheckProxyForm onItemListChange={setCheckResults} onCheckedProxy={setCheckedProxy} />
        <CheckProxyTable data={checkResults} checkedProxy={checkedProxy} />
      </div>
    </div>
  )
}
