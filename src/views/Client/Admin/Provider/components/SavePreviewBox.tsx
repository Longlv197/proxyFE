import { useWatch } from 'react-hook-form'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Grid2 from '@mui/material/Grid2'

import type { BuySectionProps } from '../ProviderFormTypes'

export default function SavePreviewBox({ prefix, control }: BuySectionProps) {
  const proxyFormat = useWatch({ control, name: `${prefix}.response.proxy_format` as any })
  const proxyKeyField = useWatch({ control, name: `${prefix}.response.proxy_key_field` as any })
  const proxyFieldsIp = useWatch({ control, name: `${prefix}.response.proxy_fields_ip` as any })
  const proxyFieldsPort = useWatch({ control, name: `${prefix}.response.proxy_fields_port` as any })
  const proxyFieldsUser = useWatch({ control, name: `${prefix}.response.proxy_fields_user` as any })
  const proxyFieldsPass = useWatch({ control, name: `${prefix}.response.proxy_fields_pass` as any })
  const proxyFieldsType = useWatch({ control, name: `${prefix}.response.proxy_fields_type` as any })
  const itemIdField = useWatch({ control, name: `${prefix}.response.item_id_field` as any })
  const saveProviderKey = useWatch({ control, name: `${prefix}.response.save_provider_key` as any })
  const saveProxy = useWatch({ control, name: `${prefix}.response.save_proxy` as any })
  const saveItemId = useWatch({ control, name: `${prefix}.response.save_item_id` as any })
  const responseMode = useWatch({ control, name: `${prefix}.response_mode` as any })
  const responseMapping: any[] = useWatch({ control, name: `${prefix}.response.response_mapping` as any }) || []

  const dbPreview: Record<string, any> = {}
  if (proxyFormat === 'key' && saveProviderKey !== false) {
    dbPreview.provider_key = `← ${proxyKeyField || 'keyxoay'}`
  }
  if (proxyFormat !== 'key' || saveProxy !== false) {
    // Hiện proxy object nếu format không phải key, hoặc nếu admin bật save_proxy
    if (proxyFormat === 'string' && saveProxy !== false) {
      const proxyObj: Record<string, string> = {}
      const f = proxyKeyField || 'proxy'
      proxyObj.ip = `← ${f}:phần1`
      proxyObj.port = `← ${f}:phần2`
      responseMapping.filter(r => r?.from && r?.to && r?.store === 'proxy').forEach(r => {
        proxyObj[r.to] = `← ${r.from}`
      })
      dbPreview.proxy = proxyObj
    } else if (proxyFormat === 'fields' && saveProxy !== false) {
      const proxyObj: Record<string, string> = {}
      proxyObj.ip = `← ${proxyFieldsIp || 'ip'}`
      proxyObj.port = `← ${proxyFieldsPort || 'port'}`
      proxyObj.user = `← ${proxyFieldsUser || 'username'}`
      proxyObj.pass = `← ${proxyFieldsPass || 'password'}`
      responseMapping.filter(r => r?.from && r?.to && r?.store === 'proxy').forEach(r => {
        proxyObj[r.to] = `← ${r.from}`
      })
      dbPreview.proxy = proxyObj
    }
  }
  if (itemIdField && saveItemId !== false) dbPreview.provider_item_id = `← ${itemIdField}`

  const rootFields = responseMapping.filter(r => r?.from && r?.to && r?.store === 'root')
  rootFields.forEach(r => { dbPreview[r.to] = `← ${r.from}` })

  const metaFields = responseMapping.filter(r => r?.from && r?.to && (r?.store === 'metadata' || !r?.store))
  if (metaFields.length > 0) {
    const metaObj: Record<string, string> = {}
    metaFields.forEach(r => { metaObj[r.to] = `← ${r.from}` })
    dbPreview.metadata = metaObj
  }

  const customObjs = responseMapping.filter(r => r?.from && r?.to && r?.store && !['proxy', 'metadata', 'root', '_custom'].includes(r.store))
  const grouped: Record<string, Record<string, string>> = {}
  customObjs.forEach(r => { grouped[r.store] = grouped[r.store] || {}; grouped[r.store][r.to] = `← ${r.from}` })
  Object.entries(grouped).forEach(([name, obj]) => { dbPreview[name] = obj })

  dbPreview['// hệ thống tự sinh'] = 'key, type, protocol, status, buy_at, expired_at...'

  return (
    <Box sx={{ mt: 1.5, border: '1px solid #bae6fd', borderRadius: 1.5, overflow: 'hidden' }}>
      <Box sx={{ background: '#f0f9ff', px: 1.5, py: 1, borderBottom: '1px solid #bae6fd' }}>
        <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#0369a1' }}>
          Preview: Cấu trúc dữ liệu order_item trong DB
        </Typography>
        <Typography sx={{ fontSize: 11, color: '#64748b', mt: 0.3 }}>
          Khi mua proxy, mỗi order_item sẽ được lưu trong database với cấu trúc như dưới đây.
        </Typography>
      </Box>
      <pre style={{
        margin: 0, padding: '12px 16px', fontSize: '12px', lineHeight: 1.7,
        fontFamily: 'monospace', color: '#1e293b', background: '#fff',
        whiteSpace: 'pre-wrap', wordBreak: 'break-word',
      }}>
        {JSON.stringify(dbPreview, null, 2)
          .replace(/"← /g, '← "')
          .replace(/"/g, '')
          .replace(/← /g, '← ')
        }
      </pre>
    </Box>
  )
}
