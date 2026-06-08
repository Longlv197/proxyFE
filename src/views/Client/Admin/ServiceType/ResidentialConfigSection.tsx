'use client'

import { useMemo } from 'react'

import {
  Alert, Autocomplete, Box, Card, CardContent, CardHeader, CircularProgress, FormControl, Grid2 as Grid,
  IconButton, InputLabel, MenuItem, Select, Stack, TextField, Tooltip, Typography
} from '@mui/material'
import { DollarSign, Globe, RefreshCw } from 'lucide-react'

import { useResidentialBalance } from '@/hooks/apis/useResidentialProviderAdmin'

/**
 * Section nhỏ trong ServiceFormModal khi proxy_type=residential.
 *
 * Chỉ chứa các field RIÊNG cho residential mà PurchaseOptionsSection không cover:
 *   - Balance NCC (display)
 *   - proxy_host (snapshot vào order khi user mua)
 *   - shared_proxy_hosts (cho site con)
 *
 * Các field tariff/country/region/city đã chuyển sang PurchaseOptionsSection chung
 * (linh hoạt với source=api_* + dependent dropdown).
 */

export type ResidentialMetadata = {
  kind?: 'residential'
  proxy_host?: string
  shared_proxy_hosts?: string[]
}

function normalizeHosts(raw: any): string[] {
  if (!Array.isArray(raw)) return []
  return raw.map((x: any) => typeof x === 'string' ? x : (x?.host || '')).filter(h => h !== '')
}

type Props = {
  providerCode: string | null
  providerApiConfig: any
  value: ResidentialMetadata
  onChange: (next: ResidentialMetadata) => void
}

export default function ResidentialConfigSection({ providerCode, providerApiConfig, value, onChange }: Props) {
  const { data: balanceData, refetch: refetchBalance, isFetching: fetchingBalance } = useResidentialBalance(providerCode)

  const proxyHostOptions: string[] = useMemo(
    () => normalizeHosts(providerApiConfig?.proxy_host_options),
    [providerApiConfig]
  )

  const proxyHost: string = value.proxy_host ?? ''
  const sharedHosts: string[] = value.shared_proxy_hosts ?? []

  const emit = (patch: Partial<ResidentialMetadata>) => onChange({ ...value, kind: 'residential', ...patch })

  if (!providerCode) return null

  const cardSx = { mb: 1.5, border: '1px solid #e2e8f0', boxShadow: 'none' as const, borderRadius: 2 }
  const headerSx = {
    background: '#f8fafc', borderBottom: '1px solid #e2e8f0',
    '& .MuiCardHeader-title': { fontSize: 13, fontWeight: 600 },
    '& .MuiCardHeader-subheader': { fontSize: 11.5, mt: 0.3 }
  }

  return (
    <Box>
      <Alert severity='info' sx={{ mb: 1.5, fontSize: 12 }}>
        Cấu hình Tariff / Country / Region / City dùng <strong>"Tuỳ chọn mua hàng"</strong> bên trên
        (chọn Nguồn = API tương ứng). Section này chỉ chứa field riêng residential.
      </Alert>

      <Card sx={cardSx}>
        <CardHeader
          sx={headerSx}
          avatar={<DollarSign size={14} color='#10b981' />}
          title='Trạng thái NCC'
          action={
            <Tooltip title='Tải lại số dư'>
              <IconButton size='small' onClick={() => refetchBalance()} disabled={fetchingBalance} sx={{ mr: 1, mt: 1 }}>
                <RefreshCw size={13} />
              </IconButton>
            </Tooltip>
          }
        />
        <CardContent sx={{ py: 1.5 }}>
          <Stack direction='row' alignItems='center' spacing={3}>
            <Box>
              <Typography variant='caption' color='text.secondary' sx={{ display: 'block' }}>Balance NCC</Typography>
              <Typography variant='h6' color='primary' fontWeight={600}>
                {fetchingBalance ? <CircularProgress size={16} /> : (balanceData?.balance_usd != null ? `$${balanceData.balance_usd}` : '—')}
              </Typography>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      <Card sx={cardSx}>
        <CardHeader
          sx={headerSx}
          avatar={<Globe size={14} color='#a855f7' />}
          title='Domain share cho site con'
          subheader='Lọc domain cho site con (optional). Domain thay host (ẩn NCC) cấu hình ở card "Domain thay host" phía trên — dùng chung mọi sản phẩm.'
        />
        <CardContent sx={{ py: 1.5 }}>
          <Autocomplete
            multiple size='small' options={proxyHostOptions} value={sharedHosts}
            onChange={(_, newValue) => emit({ shared_proxy_hosts: newValue })}
            renderInput={(params) => <TextField {...params} label='Domain share cho site con (optional)' />}
          />
        </CardContent>
      </Card>
    </Box>
  )
}
