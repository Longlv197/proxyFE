'use client'

import { useEffect, useState } from 'react'
import type { MutableRefObject } from 'react'

import {
  Accordion, AccordionDetails, AccordionSummary, Alert, Box, Button, Card, CardContent, CardHeader,
  Chip, CircularProgress, Grid2 as Grid, IconButton, Stack, Switch, TextField, Tooltip, Typography
} from '@mui/material'
import { toast } from 'react-toastify'

import { AlertCircle, ChevronDown, DollarSign, Globe, Link2, Plus, RefreshCw, Trash2 } from 'lucide-react'

import { useUpdateProvider } from '@/hooks/apis/useProviders'
import {
  useResidentialBalance, useResidentialTariffs, useSyncResidentialTariffs
} from '@/hooks/apis/useResidentialProviderAdmin'

/**
 * Section "Residential" trong modal Sửa NCC.
 *
 * Lưu các field riêng cho NCC residential vào provider.api_config:
 *   - kind === 'residential'         flag bật section UI trên SP modal
 *   - residential_endpoints          5 URL admin gọi: balance, tariffs, countries, regions, cities
 *   - proxy_host_options             mảng string các domain trung gian (ẩn NCC)
 *
 * Lưu độc lập với form chính qua callback handleSave → useUpdateProvider.
 */

type EndpointConfig = {
  balance: string
  tariffs: string
  countries: string
  regions: string
  cities: string
}

const ENDPOINT_FIELDS: Array<{ key: keyof EndpointConfig; label: string; placeholder: string }> = [
  { key: 'balance',   label: 'Balance',   placeholder: 'https://api.proxyma.io/api/reseller/get/balance' },
  { key: 'tariffs',   label: 'Tariffs',   placeholder: 'https://api.proxyma.io/api/reseller/get/tariffs' },
  { key: 'countries', label: 'Countries', placeholder: 'https://api.proxyma.io/api/reseller/get/countries' },
  { key: 'regions',   label: 'Regions',   placeholder: 'https://api.proxyma.io/api/reseller/get/regions' },
  { key: 'cities',    label: 'Cities',    placeholder: 'https://api.proxyma.io/api/reseller/get/cities' }
]

/** Normalize: hỗ trợ cả format cũ [{host}] lẫn format mới [host string]. */
function normalizeHosts(raw: any): string[] {
  if (!Array.isArray(raw)) return []
  return raw.map((x: any) => typeof x === 'string' ? x : (x?.host || '')).filter(h => h !== '')
}

/** Kết quả build 3 key residential — parent (nút "Cập nhật" footer) gọi qua stateRef. */
export type ResidentialBuildResult =
  | { ok: true; config: Record<string, any> }
  | { ok: false; error: string }

export type ResidentialBuildRef = { build: () => ResidentialBuildResult }

type Props = {
  provider: any

  /** Parent truyền ref để nút "Cập nhật" footer cũng lưu được tab này (tránh trap 2 nút lưu) */
  stateRef?: MutableRefObject<ResidentialBuildRef | null>
}

export default function ResidentialProviderSection({ provider, stateRef }: Props) {
  const updateMut = useUpdateProvider(provider?.id)
  const cfg = provider?.api_config ?? {}

  const [isResidential, setIsResidential] = useState<boolean>(cfg.kind === 'residential')
  // Bắt buộc ẩn host: SP của NCC này PHẢI có domain thay host, thiếu → chặn đơn (chống quên lộ NCC).
  const [requireHostOverride, setRequireHostOverride] = useState<boolean>(cfg.require_host_override === true)
  // URL lấy dung lượng/hạn gói còn lại — command sync:package-usage gọi GET {url}/{package_key}.
  const [infoPackageUrl, setInfoPackageUrl] = useState<string>(cfg.info_package_url ?? '')
  const [hostOptions, setHostOptions] = useState<string[]>(normalizeHosts(cfg.proxy_host_options))
  const [endpoints, setEndpoints] = useState<EndpointConfig>({
    balance:   cfg.residential_endpoints?.balance   ?? '',
    tariffs:   cfg.residential_endpoints?.tariffs   ?? '',
    countries: cfg.residential_endpoints?.countries ?? '',
    regions:   cfg.residential_endpoints?.regions   ?? '',
    cities:    cfg.residential_endpoints?.cities    ?? ''
  })

  const providerCode = provider?.provider_code
  const enabledHooks = isResidential && !!providerCode

  const { data: balanceData, refetch: refetchBalance, isFetching: fetchingBalance } =
    useResidentialBalance(enabledHooks ? providerCode : null)
  const { data: tariffsApi = [], isLoading: loadingTariffs, error: tariffsError } =
    useResidentialTariffs(enabledHooks ? providerCode : null)
  const syncMut = useSyncResidentialTariffs(enabledHooks ? providerCode : null)

  useEffect(() => {
    const c = provider?.api_config ?? {}
    setIsResidential((c.kind ?? null) === 'residential')
    setRequireHostOverride(c.require_host_override === true)
    setInfoPackageUrl(c.info_package_url ?? '')
    setHostOptions(normalizeHosts(c.proxy_host_options))
    setEndpoints({
      balance:   c.residential_endpoints?.balance   ?? '',
      tariffs:   c.residential_endpoints?.tariffs   ?? '',
      countries: c.residential_endpoints?.countries ?? '',
      regions:   c.residential_endpoints?.regions   ?? '',
      cities:    c.residential_endpoints?.cities    ?? ''
    })
  }, [provider?.id, provider?.api_config])

  // ─── Handlers ────────────────────────────────────────────
  const addHost = () => setHostOptions(prev => [...prev, ''])
  const updateHost = (idx: number, value: string) =>
    setHostOptions(prev => prev.map((h, i) => (i === idx ? value : h)))
  const removeHost = (idx: number) => setHostOptions(prev => prev.filter((_, i) => i !== idx))

  /** Validate + build 3 key residential để merge vào api_config — dùng chung cho nút trong tab VÀ nút "Cập nhật" footer. */
  const buildConfig = (): ResidentialBuildResult => {
    const cleaned = hostOptions.map(h => h.trim()).filter(h => h !== '')
    const seen = new Set<string>()
    for (const h of cleaned) {
      if (seen.has(h)) return { ok: false, error: `Domain "${h}" trùng — mỗi domain chỉ xuất hiện 1 lần` }
      seen.add(h)
    }

    if (isResidential) {
      for (const f of ENDPOINT_FIELDS) {
        if (!endpoints[f.key]) return { ok: false, error: `URL endpoint "${f.label}" chưa nhập` }
      }
    }

    return {
      ok: true,
      config: {
        // null (KHÔNG dùng undefined): JSON.stringify drop key undefined → BE array_merge giữ giá trị cũ → tắt toggle không lưu được.
        // Nếu chưa từng bật (kind vốn không tồn tại) → undefined để không tạo diff lịch sử thừa.
        kind: isResidential ? 'residential' : (provider?.api_config?.kind != null ? null : undefined),
        require_host_override: requireHostOverride ? true : (provider?.api_config?.require_host_override != null ? false : undefined),
        info_package_url: infoPackageUrl.trim() || undefined,
        proxy_host_options: isResidential ? cleaned : (provider?.api_config?.proxy_host_options ?? []),
        residential_endpoints: isResidential ? endpoints : (provider?.api_config?.residential_endpoints ?? undefined)
      }
    }
  }

  // Đẩy build function lên parent mỗi render (closure mới nhất). Unmount → clear để không dính state cũ.
  useEffect(() => {
    if (stateRef) stateRef.current = provider ? { build: buildConfig } : null
  })
  useEffect(() => {
    return () => { if (stateRef) stateRef.current = null }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSave = async () => {
    if (!provider) return

    const result = buildConfig()
    if (!result.ok) { toast.error(result.error); return }

    const mergedConfig = {
      ...(provider.api_config || {}),
      ...result.config
    }

    try {
      await updateMut.mutateAsync({
        title: provider.title,
        provider_code: provider.provider_code,
        token_api: provider.token_api,
        status: provider.status,
        order: provider.order ?? 0,
        api_config: mergedConfig
      } as any)
      toast.info('Đã lưu cấu hình residential')
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e.message || 'Lưu thất bại')
    }
  }

  const handleSync = async () => {
    try {
      const r = await syncMut.mutateAsync()
      if (r?.success) toast.info(`Đã đồng bộ ${r.count} tariffs từ NCC`)
      else toast.error(r?.message || 'Đồng bộ thất bại')
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e.message)
    }
  }

  if (!provider) {
    return <Alert severity='info'>Lưu NCC trước rồi mở lại để cấu hình residential.</Alert>
  }

  // ─── Card style chung ────────────────────────────────────
  const cardSx = { mb: 2, border: '1px solid #e2e8f0', boxShadow: 'none' as const, borderRadius: 2 }
  const headerSx = { background: '#f8fafc', borderBottom: '1px solid #e2e8f0', '& .MuiCardHeader-title': { fontSize: 14, fontWeight: 600 }, '& .MuiCardHeader-subheader': { fontSize: 12, mt: 0.3 } }

  return (
    <Box>
      {/* ─── Header: Toggle residential ─────────────────────── */}
      <Card sx={{ ...cardSx, background: isResidential ? 'linear-gradient(135deg,#eef2ff 0%,#f5f3ff 100%)' : '#fafafa', borderColor: isResidential ? '#c7d2fe' : '#e2e8f0' }}>
        <CardContent sx={{ py: 2 }}>
          <Stack direction='row' alignItems='center' justifyContent='space-between'>
            <Stack direction='row' alignItems='center' spacing={1.5}>
              <Box sx={{ width: 40, height: 40, borderRadius: 1.5, background: isResidential ? '#6366f1' : '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                <Globe size={20} />
              </Box>
              <Box>
                <Typography fontWeight={600} fontSize={14}>NCC Residential (proxy theo gói GB)</Typography>
                <Typography variant='caption' color='text.secondary'>
                  Bật khi NCC bán proxy theo gói GB + thời hạn, flow 2-stage (mua gói → tạo proxy list)
                </Typography>
              </Box>
            </Stack>
            <Switch checked={isResidential} onChange={e => setIsResidential(e.target.checked)} />
          </Stack>
        </CardContent>
      </Card>

      {isResidential && (
        <>
          {/* ─── Card: Trạng thái NCC ────────────────────────── */}
          <Card sx={cardSx}>
            <CardHeader
              sx={headerSx}
              avatar={<DollarSign size={16} color='#10b981' />}
              title='Trạng thái NCC'
              subheader='Số dư + danh sách gói GB NCC đang bán'
              action={
                <Button size='small' startIcon={syncMut.isPending ? <CircularProgress size={14} /> : <RefreshCw size={14} />}
                  onClick={handleSync} disabled={syncMut.isPending} sx={{ mr: 1, mt: 1 }}>
                  Đồng bộ tariffs
                </Button>
              }
            />
            <CardContent>
              <Stack direction='row' alignItems='center' spacing={3} sx={{ mb: 2 }}>
                <Box>
                  <Typography variant='caption' color='text.secondary'>Số dư</Typography>
                  <Stack direction='row' spacing={1} alignItems='center'>
                    <Typography variant='h5' color='primary' fontWeight={600}>
                      {fetchingBalance ? <CircularProgress size={20} /> : (balanceData?.balance_usd != null ? `$${balanceData.balance_usd}` : '—')}
                    </Typography>
                    <Tooltip title='Tải lại'>
                      <IconButton size='small' onClick={() => refetchBalance()} disabled={fetchingBalance}>
                        <RefreshCw size={14} />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </Box>
              </Stack>

              {tariffsError ? (
                <Alert severity='warning' icon={<AlertCircle size={18} />}>
                  Endpoint <code>{endpoints.balance || `/admin/${providerCode?.split('.')[0]}/balance`}</code> chưa thông.
                  Kiểm tra URL endpoints bên dưới.
                </Alert>
              ) : (
                <>
                  <Typography variant='caption' color='text.secondary' sx={{ mb: 1, display: 'block' }}>
                    Gói GB ({tariffsApi.length} gói)
                  </Typography>
                  {loadingTariffs ? <CircularProgress size={18} /> : tariffsApi.length === 0 ? (
                    <Typography variant='body2' color='text.secondary' sx={{ fontStyle: 'italic' }}>
                      Chưa có. Bấm "Đồng bộ tariffs" để fetch từ NCC.
                    </Typography>
                  ) : (
                    <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap>
                      {tariffsApi.map((t: any) => (
                        <Chip key={t.tariff_id} size='small' variant='outlined' color='primary'
                          label={`${t.name} · ${t.traffic_label} · ${t.price_label}`} />
                      ))}
                    </Stack>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* ─── Accordion: URL endpoints ──────────────────────── */}
          <Accordion
            defaultExpanded={ENDPOINT_FIELDS.some(f => !endpoints[f.key])}
            sx={{
              mb: 2, border: '1px solid #e2e8f0', borderRadius: 2, boxShadow: 'none',
              '&:before': { display: 'none' },
              '&.Mui-expanded': { mt: 0, mb: 2 }
            }}
          >
            <AccordionSummary
              expandIcon={<ChevronDown size={16} />}
              sx={{ background: '#f8fafc', borderRadius: 2, minHeight: 48, '&.Mui-expanded': { minHeight: 48, borderBottom: '1px solid #e2e8f0', borderRadius: '8px 8px 0 0' } }}
            >
              <Stack direction='row' alignItems='center' spacing={1}>
                <Link2 size={14} color='#3b82f6' />
                <Typography fontWeight={600} fontSize={13}>URL API endpoints</Typography>
                <Chip size='small' label={`${ENDPOINT_FIELDS.filter(f => endpoints[f.key]).length}/${ENDPOINT_FIELDS.length}`}
                  color={ENDPOINT_FIELDS.every(f => endpoints[f.key]) ? 'success' : 'warning'}
                  variant='outlined' sx={{ height: 18, fontSize: 10.5 }} />
              </Stack>
            </AccordionSummary>
            <AccordionDetails sx={{ p: 2 }}>
              <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mb: 1.5 }}>
                URL admin gọi NCC để load tariff/country khi tạo sản phẩm. Sửa khi NCC đổi version hoặc dùng cho NCC khác cùng pattern.
              </Typography>
              <Stack spacing={1.5}>
                {ENDPOINT_FIELDS.map(f => (
                  <TextField
                    key={f.key} size='small' label={f.label} fullWidth
                    value={endpoints[f.key]}
                    onChange={e => setEndpoints(prev => ({ ...prev, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                  />
                ))}
                <TextField
                  size='small' fullWidth label='Info package (dung lượng/hạn còn lại)'
                  value={infoPackageUrl}
                  onChange={e => setInfoPackageUrl(e.target.value)}
                  placeholder='https://api.proxyma.io/api/reseller/info/package'
                  helperText='Command sync:package-usage gọi {url}/{package_key} mỗi 30 phút để cập nhật dung lượng còn lại. Bật "Đồng bộ dung lượng" ở sản phẩm để dùng.'
                />
              </Stack>
            </AccordionDetails>
          </Accordion>

          {/* ─── Card: Domain trung gian ──────────────────────── */}
          <Card sx={cardSx}>
            <CardHeader
              sx={headerSx}
              avatar={<Globe size={16} color='#a855f7' />}
              title='Domain trung gian (ẩn NCC khỏi user)'
              subheader='Domain user thấy thay vì hostname NCC gốc. Setup CNAME ở DNS panel — Cloudflare phải tắt proxy cam (DNS only).'
            />
            <CardContent sx={{ py: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, mb: 1.5, p: 1.25, borderRadius: 1.5, background: requireHostOverride ? '#fef2f2' : '#f8fafc', border: `1px solid ${requireHostOverride ? '#fecaca' : '#e2e8f0'}` }}>
                <Box>
                  <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: '#1e293b' }}>Bắt buộc ẩn host đối tác</Typography>
                  <Typography variant='caption' color='text.secondary'>
                    Bật → sản phẩm của NCC này <strong>phải</strong> chọn "Domain thay host", thiếu sẽ <strong>bị chặn đơn</strong> (chống quên lộ NCC).
                  </Typography>
                </Box>
                <Switch checked={requireHostOverride} onChange={e => setRequireHostOverride(e.target.checked)} />
              </Box>
              <Grid container spacing={1.5}>
                {hostOptions.map((h, idx) => (
                  <Grid key={idx} size={{ xs: 12, sm: 6, md: 4 }}>
                    <Box sx={{
                      p: 1.25, border: '1px solid #e2e8f0', borderRadius: 1.5,
                      transition: 'all .15s', '&:hover': { borderColor: '#a855f7', background: '#faf5ff' },
                      display: 'flex', alignItems: 'center', gap: 1
                    }}>
                      <Box sx={{ width: 28, height: 28, borderRadius: 1, background: '#faf5ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Globe size={14} color='#a855f7' />
                      </Box>
                      <TextField
                        variant='standard' fullWidth value={h}
                        onChange={e => updateHost(idx, e.target.value)}
                        placeholder='gw.yourshop.com'
                        InputProps={{ disableUnderline: true, sx: { fontSize: 13, fontFamily: 'monospace' } }}
                      />
                      <IconButton size='small' onClick={() => removeHost(idx)}
                        sx={{ color: '#94a3b8', '&:hover': { color: '#ef4444', background: '#fef2f2' } }}
                      >
                        <Trash2 size={13} />
                      </IconButton>
                    </Box>
                  </Grid>
                ))}

                {/* Add card — dashed */}
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <Box
                    onClick={addHost}
                    sx={{
                      p: 1.25, border: '1.5px dashed #cbd5e1', borderRadius: 1.5,
                      cursor: 'pointer', transition: 'all .15s',
                      '&:hover': { borderColor: '#a855f7', background: '#faf5ff', '& > *': { color: '#a855f7' } },
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1,
                      minHeight: 52, color: '#94a3b8'
                    }}
                  >
                    <Plus size={16} />
                    <Typography fontSize={13} fontWeight={500}>Thêm domain</Typography>
                  </Box>
                </Grid>
              </Grid>

              {hostOptions.length === 0 && (
                <Alert severity='info' sx={{ mt: 1.5, fontSize: 12 }} icon={<AlertCircle size={16} />}>
                  Chưa có domain — bấm ô <strong>"+ Thêm domain"</strong> bên trên để bắt đầu. Mỗi domain phải đã setup CNAME → hostname NCC.
                </Alert>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* ─── Save (sticky bottom) ───────────────────────────── */}
      <Box sx={{ position: 'sticky', bottom: 0, mt: 3, pt: 2, background: 'linear-gradient(180deg, transparent 0%, #fff 30%)', display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant='contained' size='large' onClick={handleSave} disabled={updateMut.isPending}
          sx={{ minWidth: 200, background: '#6366f1', '&:hover': { background: '#4f46e5' } }}
        >
          {updateMut.isPending ? <CircularProgress size={20} sx={{ color: '#fff' }} /> : 'Lưu cấu hình Residential'}
        </Button>
      </Box>
    </Box>
  )
}
