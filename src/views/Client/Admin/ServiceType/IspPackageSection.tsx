'use client'

import { Alert, Box, Button, MenuItem, Typography } from '@mui/material'
import { RefreshCw } from 'lucide-react'

import CustomTextField from '@/@core/components/mui/TextField'
import { useIspTariffs } from '@/hooks/apis/useIspTariffs'

/**
 * Section trong ServiceFormModal khi SP gắn NCC có `api_config.kind = 'isp'` (proxy tĩnh Proxyma ISP).
 *
 * Vì sao cần: trước đây form KHÔNG biết SP ISP → admin phải đi đường vòng (đổi Proxy Type sang "Dân cư"
 * để hiện ô "Giá theo số lượng") → form gắn nhầm `kind=residential` (SP #46, 25/11/2026).
 *
 * Danh sách gói lấy TRỰC TIẾP từ NCC lúc mở form (BE `admin/isp-providers/{id}/tariffs`, cache 10 phút,
 * nút "Làm mới" bỏ cache). NCC lỗi → BE trả snapshot `api_config.isp_tariffs`; BE lỗi hẳn → dùng snapshot tại chỗ.
 *
 * Chọn 1 gói NCC là tự điền đúng hết:
 *   - api_body `{"tariff_id": N}`
 *   - SL min = max = 1 = 1 GÓI (anh chốt 25/11: khách đặt 1 là nhận đủ IP của gói). BE tạo `isp_ports`
 *     dòng proxy cho 1 gói + gửi NCC quantity=1; SL khác 1 bị BE từ chối (mỗi lần gọi API chỉ mua 1 gói).
 *   - giá "Cố định theo gói" (không × SL)
 *   - metadata `isp_*` (tham khảo) — `kind='isp'` do ServiceFormModal ghi khi lưu
 */

export type IspTariff = {
  tariff_id: number | string
  plan_id?: number | string | null
  name?: string
  ports: number
  period?: number
  price_usd?: number | string | null
}

export type IspMetadata = {
  isp_ports?: number
  isp_tariff_id?: number
  isp_plan_id?: number
  isp_cost_usd?: number
  isp_country?: string
  isp_purpose_id?: string
}

type Props = {
  providerId: string | number | null
  providerApiConfig: any

  /** tariff_id đang nằm trong api_body (đọc từ form) — null nếu chưa có / không đọc được */
  currentTariffId: number | null
  minQuantity: number | null
  maxQuantity: number | null
  proxyType: string
  country: string[]
  onPickTariff: (tariff: IspTariff, meta: IspMetadata) => void
}

export function readTariffId(bodyApi: string): number | null {
  try {
    const v = JSON.parse(bodyApi || '{}')?.tariff_id

    return v === undefined || v === null || v === '' ? null : Number(v)
  } catch {
    return null
  }
}

const SOURCE_LABEL: Record<string, string> = {
  live: 'Bảng giá lấy trực tiếp từ NCC',
  cache: 'Bảng giá từ NCC (lấy trong 10 phút gần đây)',
  snapshot: 'NCC không trả bảng giá — đang dùng bản chụp cũ, giá có thể đã đổi'
}

const IspPackageSection = ({ providerId, providerApiConfig, currentTariffId, minQuantity, maxQuantity, proxyType, country, onPickTariff }: Props) => {
  const { data: live, isLoading, isError, refreshFresh, refreshing } = useIspTariffs(providerId)
  const snapshot: IspTariff[] = Array.isArray(providerApiConfig?.isp_tariffs) ? providerApiConfig.isp_tariffs : []
  const tariffs: IspTariff[] = live?.data?.length ? live.data : snapshot
  const source = live?.data?.length ? live.source : 'snapshot'
  const buyParams = providerApiConfig?.buy_static?.params || {}
  const current = tariffs.find(t => Number(t.tariff_id) === currentTariffId) || null

  const pick = (tariffId: string) => {
    const t = tariffs.find(x => String(x.tariff_id) === tariffId)

    if (!t) return

    onPickTariff(t, {
      isp_ports: Number(t.ports),
      isp_tariff_id: Number(t.tariff_id),
      isp_plan_id: t.plan_id !== undefined && t.plan_id !== null ? Number(t.plan_id) : undefined,
      isp_cost_usd: t.price_usd !== undefined && t.price_usd !== null ? Number(t.price_usd) : undefined,
      isp_country: buyParams.country ? String(buyParams.country) : undefined,
      isp_purpose_id: buyParams.purpose_id ? String(buyParams.purpose_id) : undefined
    })
  }

  const qtyWrong = Number(minQuantity) !== 1 || Number(maxQuantity) !== 1

  return (
    <Box>
      <CustomTextField
        select
        fullWidth
        size='small'
        label='Gói NCC'
        value={current ? String(current.tariff_id) : ''}
        onChange={e => pick(e.target.value)}
        disabled={isLoading && !snapshot.length}
        helperText={
          isLoading
            ? 'Đang lấy bảng giá từ NCC…'
            : tariffs.length
              ? `Chọn gói → tự điền tariff_id, số lượng = số IP, giá theo gói · ${SOURCE_LABEL[isError ? 'snapshot' : source]}`
              : 'Không lấy được danh sách gói từ NCC'
        }
        slotProps={{ select: { displayEmpty: true } }}
      >
        <MenuItem value=''><em>Chọn gói</em></MenuItem>
        {tariffs.map(t => (
          <MenuItem key={String(t.tariff_id)} value={String(t.tariff_id)}>
            {t.ports} IP · {t.period || 30} ngày · giá NCC ${t.price_usd} (tariff {t.tariff_id})
          </MenuItem>
        ))}
      </CustomTextField>
      <Button size='small' onClick={refreshFresh} disabled={refreshing || !providerId}
        startIcon={<RefreshCw size={13} className={refreshing ? 'animate-spin' : undefined} />}
        sx={{ mt: 0.5, fontSize: 11, textTransform: 'none' }}>
        {refreshing ? 'Đang lấy lại…' : 'Làm mới bảng giá từ NCC'}
      </Button>

      {current && (
        <Typography sx={{ fontSize: 12, color: '#475569', mt: 1 }}>
          Giá theo số lượng: <strong>Cố định theo gói</strong> (khách đặt số lượng 1 = 1 gói, nhận {current.ports} IP).
          Nhập ở &quot;Mốc giá theo thời gian&quot; đúng <strong>1 mốc {current.period || 30} ngày</strong>: giá bán cả gói
          + giá vốn = ${current.price_usd} × tỷ giá.
        </Typography>
      )}

      {currentTariffId !== null && !current && (
        <Alert severity='warning' sx={{ mt: 1, py: 0 }}>
          tariff_id {currentTariffId} trong api_body không có trong danh sách gói của NCC — chọn lại gói.
        </Alert>
      )}
      {qtyWrong && (
        <Alert severity='error' sx={{ mt: 1, py: 0 }}>
          Số lượng phải là 1 – 1 (1 gói, đang {minQuantity} – {maxQuantity}). Khác 1 thì khách không đặt được đơn. Chọn lại gói để tự sửa.
        </Alert>
      )}
      {proxyType === 'residential' && (
        <Alert severity='warning' sx={{ mt: 1, py: 0 }}>
          Proxy Type đang là &quot;Dân cư&quot; — proxy ISP là IP tĩnh, để trống &quot;—&quot;.
        </Alert>
      )}
      {country?.length > 0 && (
        <Alert severity='warning' sx={{ mt: 1, py: 0 }}>
          NCC cấp IP ngẫu nhiên quốc gia (country: {buyParams.country || 'Any'}) — nên để trống Quốc gia để không hứa sai với khách.
        </Alert>
      )}
    </Box>
  )
}

export default IspPackageSection
