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
import Box from '@mui/material/Box'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'

import { toast } from 'react-toastify'

import DialogCloseButton from '@/components/modals/DialogCloseButton'

import { useCreateProvider, useUpdateProvider } from '@/hooks/apis/useProviders'

import type { FormValues, ModalAddProviderProps } from './ProviderFormTypes'
import { defaultValues } from './ProviderFormTypes'
import { parseApiConfig, buildApiConfig } from './ProviderFormSerializer'

import BasicInfoSection from './sections/BasicInfoSection'
import BuyConfigSection from './sections/BuyConfigSection'
import RotateSection from './sections/RotateSection'
import IpWhitelistSection from './sections/IpWhitelistSection'
import RenewSection from './sections/RenewSection'
import JsonPreviewPanel from './components/JsonPreviewPanel'

// ─── Tab config ─────────────────────────────────────

const TABS = [
  { label: 'Cơ bản', icon: 'tabler-settings' },
  { label: 'Mua proxy', icon: 'tabler-shopping-cart' },
  { label: 'Xoay proxy', icon: 'tabler-refresh' },
  { label: 'IP Whitelist', icon: 'tabler-shield-check' },
  { label: 'Gia hạn', icon: 'tabler-clock' },
]

// ─── Component ──────────────────────────────────────

export default function ModalAddProvider({ open, onClose, type, providerData }: ModalAddProviderProps) {
  const [activeTab, setActiveTab] = useState(0)
  const [renderedTabs, setRenderedTabs] = useState<Set<number>>(new Set([0]))

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
              </Box>
            </form>
          </Grid2>

          {/* ═══════ BÊN PHẢI: JSON Preview ═══════ */}
          <Grid2 size={{ xs: 12, md: 4 }}>
            <JsonPreviewPanel jsonPreview={jsonPreview} />
          </Grid2>
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
