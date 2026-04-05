'use client'

import { useEffect, useState, useRef } from 'react'

import { useForm, useWatch } from 'react-hook-form'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import Typography from '@mui/material/Typography'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Grid2 from '@mui/material/Grid2'
import Grid from '@mui/material/Grid'
import Paper from '@mui/material/Paper'
import Box from '@mui/material/Box'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'

import { toast } from 'react-toastify'
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend
} from 'recharts'
import { format, parseISO } from 'date-fns'

import DialogCloseButton from '@/components/modals/DialogCloseButton'

import { useCreateProvider, useUpdateProvider, useProviderStatistics, useProviderInvoiceSummary } from '@/hooks/apis/useProviders'

import type { FormValues, ModalAddProviderProps } from './ProviderFormTypes'
import { defaultValues } from './ProviderFormTypes'
import { parseApiConfig, buildApiConfig } from './ProviderFormSerializer'

import BasicInfoSection from './sections/BasicInfoSection'
import BuyConfigSection from './sections/BuyConfigSection'
import RotateSection from './sections/RotateSection'
import IpWhitelistSection from './sections/IpWhitelistSection'
import RenewSection from './sections/RenewSection'
import ContactInfoSection from './sections/ContactInfoSection'
import JsonPreviewPanel from './components/JsonPreviewPanel'
import ProviderInvoiceTab from './ProviderInvoiceTab'

// ─── Tab config ─────────────────────────────────────

const BASE_TABS = [
  { label: 'Cơ bản', icon: 'tabler-settings' },
  { label: 'Mua proxy', icon: 'tabler-shopping-cart' },
  { label: 'Xoay proxy', icon: 'tabler-refresh' },
  { label: 'IP Whitelist', icon: 'tabler-shield-check' },
  { label: 'Gia hạn', icon: 'tabler-clock' },
  { label: 'Liên hệ', icon: 'tabler-address-book' },
]

const EDIT_TABS = [
  { label: 'Thống kê', icon: 'tabler-chart-bar' },
  { label: 'Hoá đơn', icon: 'tabler-file-invoice' },
]

// ─── Component ──────────────────────────────────────

export default function ModalAddProvider({ open, onClose, type, providerData }: ModalAddProviderProps) {
  const [activeTab, setActiveTab] = useState(0)
  const [renderedTabs, setRenderedTabs] = useState<Set<number>>(new Set([0]))

  const isEditMode = type === 'edit' && !!providerData?.id
  const TABS = isEditMode ? [...BASE_TABS, ...EDIT_TABS] : BASE_TABS

  const createMutation = useCreateProvider()
  const updateMutation = useUpdateProvider(providerData?.id)

  // Thống kê + hoá đơn (chỉ fetch khi edit + tab active)
  const { data: statsData, isLoading: isLoadingStats } = useProviderStatistics(
    providerData?.id, undefined, undefined, isEditMode && activeTab === 6
  )
  const { data: invoiceSumData } = useProviderInvoiceSummary(
    providerData?.id, isEditMode && (activeTab === 6 || activeTab === 7)
  )

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors }
  } = useForm<FormValues>({ defaultValues })

  // Status badges
  const buyRotatingEnabled = useWatch({ control, name: 'buy_rotating.enabled' })
  const buyStaticEnabled = useWatch({ control, name: 'buy_static.enabled' })
  const rotateEnabled = useWatch({ control, name: 'rotate.enabled' })
  const ipEnabled = useWatch({ control, name: 'ip_whitelist.enabled' })
  const renewEnabled = useWatch({ control, name: 'renew.enabled' })

  const tabEnabled = [
    true, // Cơ bản luôn active
    buyRotatingEnabled || buyStaticEnabled,
    rotateEnabled,
    ipEnabled,
    renewEnabled,
    true, // Liên hệ luôn cho phép
    ...(isEditMode ? [true, true] : []), // Thống kê + Hoá đơn
  ]

  // JSON preview
  const [jsonPreview, setJsonPreview] = useState('// Chưa có cấu hình API')
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)

  useEffect(() => {
    const subscription = watch((values) => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        const config = buildApiConfig(values as FormValues)
        setJsonPreview(config ? JSON.stringify(config, null, 2) : '// Chưa có cấu hình API')
      }, 500)
    })

    return () => {
      subscription.unsubscribe()
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [watch])

  // Load data on edit
  useEffect(() => {
    if (!open) return

    if (type === 'edit' && providerData) {
      const parsed = parseApiConfig(providerData.api_config)
      const values = {
        ...defaultValues,
        title: providerData.title || '',
        token_api: providerData.token_api || '',
        provider_code: providerData.provider_code || '',
        order: providerData.order || '',
        status: providerData.status || 'active',
        rotation_interval: providerData.rotation_interval || '',
        contact: {
          name: providerData.contact?.name || '',
          email: providerData.contact?.email || '',
          phone: providerData.contact?.phone || '',
          telegram: providerData.contact?.telegram || '',
          skype: providerData.contact?.skype || '',
          website: providerData.contact?.website || '',
          address: providerData.contact?.address || '',
          note: providerData.contact?.note || ''
        },
        ...parsed,
      }

      reset(values)

      const config = buildApiConfig(values as FormValues)
      setJsonPreview(config ? JSON.stringify(config, null, 2) : '// Chưa có cấu hình API')
    } else {
      reset(defaultValues)
      setJsonPreview('// Chưa có cấu hình API')
    }

    setActiveTab(0)
    setRenderedTabs(new Set([0]))
  }, [open, type, providerData, reset])

  // Track rendered tabs (keep form fields mounted)
  const handleTabChange = (_: any, newValue: number) => {
    setActiveTab(newValue)
    setRenderedTabs(prev => new Set([...prev, newValue]))
  }

  const onSubmit = (data: FormValues) => {
    const apiConfig = buildApiConfig(data)

    const payload: any = {
      title: data.title,
      token_api: data.token_api,
      provider_code: data.provider_code,
      order: Number(data.order) || 0,
      status: data.status,
    }

    if (data.rotation_interval) {
      payload.rotation_interval = Number(data.rotation_interval)
    }

    if (data.contact) {
      payload.contact = data.contact
    }

    if (apiConfig) {
      payload.api_config = apiConfig
    }

    const mutation = type === 'create' ? createMutation : updateMutation

    mutation.mutate(payload, {
      onSuccess: () => {
        toast.info(type === 'create' ? 'Thêm nhà cung cấp thành công!' : 'Cập nhật thành công!')
      },
      onError: (error: any) => {
        toast.error(error?.response?.data?.message || 'Có lỗi xảy ra')
      }
    })
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog
      onClose={onClose}
      open={open}
      closeAfterTransition={false}
      PaperProps={{ sx: { overflow: 'visible', minHeight: 'calc(100vh - 100px)' } }}
      fullWidth
      maxWidth='xl'
    >
      <DialogTitle>
        <Typography variant='h5' component='span'>
          {type === 'create' ? 'Thêm mới nhà cung cấp' : 'Cập nhật nhà cung cấp'}
        </Typography>
        <DialogCloseButton onClick={onClose} disableRipple>
          <i className='tabler-x' />
        </DialogCloseButton>
      </DialogTitle>

      <DialogContent>
        <Grid2 container spacing={0}>
          {/* ═══════ BÊN TRÁI: Vertical Tabs ═══════ */}
          <Grid2 size={{ xs: 12, md: 'auto' }}>
            <Tabs
              orientation='vertical'
              value={activeTab}
              onChange={handleTabChange}
              sx={{
                minWidth: 170,
                borderRight: '1px solid',
                borderColor: 'divider',
                mr: 2,
                '& .MuiTab-root': {
                  alignItems: 'flex-start',
                  textAlign: 'left',
                  textTransform: 'none',
                  minHeight: 44,
                  fontSize: 13,
                  fontWeight: 500,
                  px: 1.5,
                  justifyContent: 'flex-start',
                },
                '& .Mui-selected': {
                  fontWeight: 600,
                },
              }}
            >
              {TABS.map((tab, i) => (
                <Tab
                  key={i}
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                      <i className={tab.icon} style={{ fontSize: 16, opacity: 0.7 }} />
                      <span>{tab.label}</span>
                      {i > 0 && (
                        <Box sx={{
                          ml: 'auto',
                          width: 7, height: 7,
                          borderRadius: '50%',
                          background: tabEnabled[i] ? '#4caf50' : '#e0e0e0',
                          flexShrink: 0,
                        }} />
                      )}
                    </Box>
                  }
                />
              ))}
            </Tabs>
          </Grid2>

          {/* ═══════ GIỮA: Tab Content ═══════ */}
          <Grid2 size={{ xs: 12, md: 'grow' as any }}>
            <form onSubmit={handleSubmit(onSubmit)}>
              <Box sx={{ maxHeight: 'calc(100vh - 240px)', overflow: 'auto', pr: 2 }}>
                {/* Tab 0: Cơ bản */}
                <Box sx={{ display: activeTab === 0 ? 'block' : 'none' }}>
                  <BasicInfoSection control={control} errors={errors} />
                </Box>

                {/* Tab 1: Mua proxy */}
                {renderedTabs.has(1) && (
                  <Box sx={{ display: activeTab === 1 ? 'block' : 'none' }}>
                    <BuyConfigSection control={control} setValue={setValue} />
                  </Box>
                )}

                {/* Tab 2: Xoay proxy */}
                {renderedTabs.has(2) && (
                  <Box sx={{ display: activeTab === 2 ? 'block' : 'none' }}>
                    <RotateSection control={control} />
                  </Box>
                )}

                {/* Tab 3: IP Whitelist */}
                {renderedTabs.has(3) && (
                  <Box sx={{ display: activeTab === 3 ? 'block' : 'none' }}>
                    <IpWhitelistSection control={control} />
                  </Box>
                )}

                {/* Tab 4: Gia hạn */}
                {renderedTabs.has(4) && (
                  <Box sx={{ display: activeTab === 4 ? 'block' : 'none' }}>
                    <RenewSection control={control} />
                  </Box>
                )}

                {/* Tab 5: Liên hệ */}
                {renderedTabs.has(5) && (
                  <Box sx={{ display: activeTab === 5 ? 'block' : 'none' }}>
                    <ContactInfoSection control={control} />
                  </Box>
                )}
              </Box>
            </form>

            {/* Tab 6: Thống kê (ngoài form, chỉ khi edit) */}
            {isEditMode && activeTab === 6 && (
              <Box sx={{ p: 1 }}>
                {isLoadingStats ? (
                  <Typography sx={{ color: '#64748b', fontSize: 13, p: 3, textAlign: 'center' }}>Đang tải thống kê...</Typography>
                ) : (
                  <>
                    {/* Summary cards */}
                    {(() => {
                      const s = statsData?.summary || {}
                      const fmtM = (v: any) => `${Number(v || 0).toLocaleString('vi-VN')}đ`
                      const cards = [
                        { label: 'Tổng đơn mua', value: s.total_orders || 0, color: '#6366f1' },
                        { label: 'Gia hạn', value: s.renewal_orders || 0, color: '#8b5cf6' },
                        { label: 'Doanh thu (mua)', value: fmtM(s.total_revenue), color: '#16a34a' },
                        { label: 'Doanh thu (gia hạn)', value: fmtM(s.renewal_revenue), color: '#059669' },
                        { label: 'Chi phí NCC', value: fmtM(s.total_cost), color: '#f59e0b' },
                        { label: 'Lợi nhuận', value: fmtM(s.combined_profit || s.total_profit), color: '#2563eb' },
                        { label: 'Margin', value: `${s.margin_percent || 0}%`, color: Number(s.margin_percent) > 20 ? '#16a34a' : '#f59e0b' },
                        { label: 'Tỷ lệ OK', value: `${s.avg_success_rate || 0}%`, color: '#0ea5e9' },
                        { label: 'Proxy đang dùng', value: s.active_proxies || 0, color: '#6366f1' },
                        { label: 'Hoàn tiền', value: fmtM(s.total_refunds), color: '#ef4444' },
                      ]

                      return (
                        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 1.5, mb: 3 }}>
                          {cards.map(card => (
                            <Box key={card.label} sx={{ p: 1.5, borderRadius: 2, border: '1px solid #e2e8f0', background: '#f8fafc' }}>
                              <Typography sx={{ fontSize: 10, color: '#94a3b8', mb: 0.5 }}>{card.label}</Typography>
                              <Typography sx={{ fontSize: 15, fontWeight: 700, color: card.color }}>{card.value}</Typography>
                            </Box>
                          ))}
                        </Box>
                      )
                    })()}

                    {/* Charts */}
                    {statsData?.trend && statsData.trend.length > 0 && (() => {
                      const fmtX = (val: string) => { try { return format(parseISO(val), 'dd/MM') } catch { return val } }
                      const fmtLabel = (lbl: any) => { try { return format(parseISO(lbl as string), 'dd/MM/yyyy') } catch { return String(lbl) } }
                      const axisSx = { fontSize: '10px' }
                      const legendSx = { fontSize: '10px', paddingTop: '6px' }

                      return (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                          {/* Chart 1: Doanh thu & Chi phí */}
                          <Paper variant='outlined' sx={{ p: 2, borderRadius: 2 }}>
                            <Typography sx={{ fontSize: 12, fontWeight: 600, mb: 1, color: '#475569' }}>Doanh thu & Chi phí</Typography>
                            <Box sx={{ width: '100%', height: 300 }}>
                              <ResponsiveContainer>
                                <BarChart data={statsData.trend} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                                  <CartesianGrid strokeDasharray='3 3' opacity={0.5} />
                                  <XAxis dataKey='date' tickFormatter={fmtX} style={axisSx} />
                                  <YAxis style={axisSx} />
                                  <RechartsTooltip
                                    labelFormatter={fmtLabel}
                                    formatter={(value: any, name: string) => [`${Number(value || 0).toLocaleString('vi-VN')}đ`, name]}
                                  />
                                  <Legend wrapperStyle={legendSx} />
                                  <Bar name='Doanh thu mua' dataKey='total_revenue' fill='#4caf50' radius={[4, 4, 0, 0]} />
                                  <Bar name='Doanh thu gia hạn' dataKey='renewal_revenue' fill='#059669' radius={[4, 4, 0, 0]} />
                                  <Bar name='Chi phí' dataKey='total_cost' fill='#f44336' radius={[4, 4, 0, 0]} />
                                  <Bar name='Lợi nhuận' dataKey='total_profit' fill='#2196f3' radius={[4, 4, 0, 0]} />
                                </BarChart>
                              </ResponsiveContainer>
                            </Box>
                          </Paper>

                          {/* Chart 2: Đơn hàng & Gia hạn & Proxy */}
                          <Paper variant='outlined' sx={{ p: 2, borderRadius: 2 }}>
                            <Typography sx={{ fontSize: 12, fontWeight: 600, mb: 1, color: '#475569' }}>Đơn hàng & Gia hạn & Proxy</Typography>
                            <Box sx={{ width: '100%', height: 300 }}>
                              <ResponsiveContainer>
                                <LineChart data={statsData.trend} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                                  <CartesianGrid strokeDasharray='3 3' opacity={0.5} />
                                  <XAxis dataKey='date' tickFormatter={fmtX} style={axisSx} />
                                  <YAxis style={axisSx} />
                                  <RechartsTooltip labelFormatter={fmtLabel} />
                                  <Legend wrapperStyle={legendSx} />
                                  <Line name='Đơn mua' type='monotone' dataKey='total_orders' stroke='#ff9800' strokeWidth={2} dot={{ r: 3 }} />
                                  <Line name='Gia hạn' type='monotone' dataKey='renewal_orders' stroke='#8b5cf6' strokeWidth={2} dot={{ r: 3 }} />
                                  <Line name='Proxy hoạt động' type='monotone' dataKey='active_proxies' stroke='#6366f1' strokeWidth={2} dot={{ r: 3 }} />
                                </LineChart>
                              </ResponsiveContainer>
                            </Box>
                          </Paper>

                          {/* Chart 3: Margin % + Tỷ lệ thành công */}
                          <Paper variant='outlined' sx={{ p: 2, borderRadius: 2 }}>
                            <Typography sx={{ fontSize: 12, fontWeight: 600, mb: 1, color: '#475569' }}>Biên lợi nhuận & Tỷ lệ thành công</Typography>
                            <Box sx={{ width: '100%', height: 280 }}>
                              <ResponsiveContainer>
                                <LineChart data={statsData.trend} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                                  <CartesianGrid strokeDasharray='3 3' opacity={0.5} />
                                  <XAxis dataKey='date' tickFormatter={fmtX} style={axisSx} />
                                  <YAxis unit='%' style={axisSx} />
                                  <RechartsTooltip
                                    labelFormatter={fmtLabel}
                                    formatter={(value: any, name: string) => [`${value}%`, name]}
                                  />
                                  <Legend wrapperStyle={legendSx} />
                                  <Line name='Margin' type='monotone' dataKey='margin_percent' stroke='#2563eb' strokeWidth={2} dot={{ r: 3 }} />
                                  <Line name='Tỷ lệ thành công' type='monotone' dataKey='success_rate' stroke='#16a34a' strokeWidth={2} dot={{ r: 3 }} />
                                </LineChart>
                              </ResponsiveContainer>
                            </Box>
                          </Paper>
                        </Box>
                      )
                    })()}
                  </>
                )}
              </Box>
            )}

            {/* Tab 7: Hoá đơn (ngoài form, chỉ khi edit) */}
            {isEditMode && activeTab === 7 && (
              <Box sx={{ p: 1 }}>
                <ProviderInvoiceTab providerId={String(providerData?.id)} />
              </Box>
            )}
          </Grid2>

          {/* ═══════ BÊN PHẢI: JSON Preview (ẩn khi tab Liên hệ/Thống kê/Hoá đơn) ═══════ */}
          {activeTab <= 4 && (
            <Grid2 size={{ xs: 12, md: 4 }}>
              <JsonPreviewPanel jsonPreview={jsonPreview} />
            </Grid2>
          )}
        </Grid2>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} variant='tonal' color='secondary' disabled={isPending}>
          Hủy
        </Button>
        <Button onClick={handleSubmit(onSubmit)} variant='contained' disabled={isPending} sx={{ color: '#fff' }}>
          {isPending ? 'Đang xử lý...' : type === 'create' ? 'Thêm mới' : 'Cập nhật'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
