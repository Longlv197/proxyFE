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
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend
} from 'recharts'
import { format, parseISO } from 'date-fns'

import DialogCloseButton from '@/components/modals/DialogCloseButton'

import {
  useCreateProvider,
  useUpdateProvider,
  useProviderStatistics,
  useProviderInvoiceSummary
} from '@/hooks/apis/useProviders'

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
  { label: 'Liên hệ', icon: 'tabler-address-book' }
]

// ─── Component ──────────────────────────────────────

export default function ModalAddProvider({ open, onClose, type, providerData }: ModalAddProviderProps) {
  const [activeTab, setActiveTab] = useState(0)
  const [renderedTabs, setRenderedTabs] = useState<Set<number>>(new Set([0]))

  const isEditMode = type === 'edit' && !!providerData?.id
  const TABS = isEditMode ? [...BASE_TABS] : BASE_TABS

  const createMutation = useCreateProvider()
  const updateMutation = useUpdateProvider(providerData?.id)

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
    true // Liên hệ luôn cho phép
  ]

  // JSON preview
  const [jsonPreview, setJsonPreview] = useState('// Chưa có cấu hình API')
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)

  useEffect(() => {
    const subscription = watch(values => {
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
        ...parsed
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
    // Validate: nếu use_url_by_duration=true thì phải có ít nhất 1 row có URL
    // Tránh bug ghi đè url_by_duration thành empty khi rows toàn trống
    const validateDurationUrls = (sectionKey: 'buy_rotating' | 'buy_static', label: string): boolean => {
      const section = (data as any)[sectionKey]

      if (!section?.enabled || !section?.use_url_by_duration) return true
      // Ưu tiên duration_units (mới), fallback duration_urls (legacy)
      const rows = (section.duration_units?.length ? section.duration_units : section.duration_urls) || []
      const validRows = rows.filter((r: any) => r.days && r.url)

      if (validRows.length === 0) {
        toast.error(`${label}: Đã chọn "URL theo thời hạn" nhưng chưa có URL/đơn vị nào. Vui lòng nhập hoặc chuyển sang "URL chung".`)
        return false
      }

      // Check duplicate days — JS object key sẽ ghi đè, mất URL
      const daysCount: Record<string, number> = {}

      validRows.forEach((r: any) => {
        const d = String(r.days).trim()

        daysCount[d] = (daysCount[d] || 0) + 1
      })
      const dupDays = Object.entries(daysCount).filter(([, c]) => c > 1).map(([d]) => d)

      if (dupDays.length > 0) {
        toast.error(`${label}: Trùng số ngày (${dupDays.join(', ')}). Mỗi giá trị ngày chỉ map được 1 URL.`)
        return false
      }

      return true
    }

    if (!validateDurationUrls('buy_rotating', 'Mua proxy xoay')) return
    if (!validateDurationUrls('buy_static', 'Mua proxy tĩnh')) return

    const apiConfig = buildApiConfig(data)

    const payload: any = {
      title: data.title,
      token_api: data.token_api,
      provider_code: data.provider_code,
      order: Number(data.order) || 0,
      status: data.status
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
                  justifyContent: 'flex-start'
                },
                '& .Mui-selected': {
                  fontWeight: 600
                }
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
                        <Box
                          sx={{
                            ml: 'auto',
                            width: 7,
                            height: 7,
                            borderRadius: '50%',
                            background: tabEnabled[i] ? '#4caf50' : '#e0e0e0',
                            flexShrink: 0
                          }}
                        />
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
